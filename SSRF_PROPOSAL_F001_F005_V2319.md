# Proposal Remediasi Implementation-Ready F-001..F-005 — v2.3.19

**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**
**Tanggal:** 2026-11-08 (WIB)
**Menjawab:** audit independen V12 (`SSRF_INDEPENDENT_AUDIT_V12.md`,
commit `cd96768`) §10 butir 4 — prioritas utama setelah harness —
dan butir 2 `MUSE_EXECUTION_BRIEF_2026-11-08.md` (commit `8441aec`)
yang ditunda di v2.3.18.
**Dasar desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.18 (spesifikasi
remediasi) + §A (arsitektur) + §B (file/fungsi) + §D.4.25 (akuntansi
byte) — dokumen ini BUKAN pengganti §D.4.18, melainkan paket yang
membuat §D.4.18 dapat diimplementasikan tanpa menebak: nomor baris
terverifikasi pada `main` saat ini, pseudodiff per fungsi, threat
model, matriks tes dengan kasus negatif + hasil yang diharapkan,
dependensi staging, migrasi/rollback, dan risiko tersisa.

**Verifikasi basis (read-only, 2026-11-08):** seluruh nomor file /
fungsi / baris di bawah ini diverifikasi langsung pada `main`
commit `cd96768` (audit V12) dengan membaca
`site/server/src/actions.ts` (1.520 baris),
`site/server/src/schema.ts` (67 baris), dan
`site/drizzle/0001..0005*.sql`. Tidak ada satu baris pun source
aplikasi yang diubah untuk proposal ini. Bila `main` bergerak
sebelum implementasi, implementor WAJIB memverifikasi ulang nomor
baris dan mencatat delta-nya di log implementasi — pseudodiff di
sini mengikat pada perilaku, bukan pada nomor baris semata.

**Yang TIDAK dilakukan dokumen ini:** tidak mengimplementasikan
apa pun; tidak menutup F-001..F-005 (status tetap OPEN/BLOCKED,
lihat §8); tidak mengasumsikan perilaku SDK/runtime yang belum
dibuktikan; tidak mengarang owner, staging, atau bukti runtime.

---

## §0. Cara membaca + keputusan owner yang harus ada sebelum implementasi

Setiap finding (§1–§5) mengikuti pola yang sama:

1. **Verifikasi current main** — file, fungsi, baris, dan perilaku
   yang terbukti ada hari ini (dengan kutipan perilaku, bukan klaim).
2. **File list** — file yang disentuh implementasi, dan file yang
   secara eksplisit TIDAK disentuh.
3. **Pseudodiff** — perubahan perilaku per fungsi, cukup presisi
   untuk ditulis menjadi diff tanpa menebak.
4. **Threat model** — penyerang, kemampuan, dan apa yang harus
   tetap tidak mungkin setelah perbaikan.
5. **Matriks tes** — test ID (lanjutan H-SSRF/H-RES/H-CAT/H-AUTH
   yang sudah ada), kasus negatif, hasil PASS/FAIL yang diharapkan,
   dan lingkungan (staging — bukan VM saja).
6. **Dependensi staging, migrasi/rollback, risiko tersisa.**

**Keputusan owner yang masih terbuka sebelum tahap (b)** (lihat
juga §7 — daftar keputusan):

| # | Keputusan | Opsi default bila owner diam | Dampak bila tidak diputuskan |
| --- | --- | --- | --- |
| K-1 | Cabang cache F-022 (G-F) | Hapus cache dari semua jalur security-scan (§D.4.23) | Guard F-001/F-002 harus tetap jalan SEBELUM cache read; bila cache dipertahankan tanpa key `url + cap + policy-version`, entri lama dapat mem-bypass kebijakan baru |
| K-2 | Nilai cap F-002 | Compressed cap = cap lama (400.000 page / 300.000 script); decompressed cap = nilai yang sama per request; aggregate = 1.000.000 decoded byte per scan (§D.4.26) | Implementasi tidak dapat ditulis tanpa angka; angka adalah keputusan desain, bukan konstanta yang ditebak implementor |
| K-3 | Total deadline F-003 | 30 detik (sudah ada di kode, baris 378) + toleransi staging +2 detik | Tanpa angka toleransi, H-RES-04/05 tidak dapat dinilai PASS/FAIL |
| K-4 | Mekanisme otorisasi F-005 | Opsi C — nonaktifkan `addProject` sampai mekanisme terbukti (§5) | Tanpa keputusan, `addProject` tetap tanpa auth (status quo = BLOCKED) |
| K-5 | Tenancy F-018 (G-C) | DB diperlakukan sebagai SHARED sampai provider menyatakan tertulis bahwa `ctx.db` per-user | Asumsi per-user tanpa bukti = celah isolasi; migrasi §4 ditulis untuk cabang shared |
| K-6 | Owner backfill migrasi §4 | `OWNER_USER_ID` wajib dipasok sebagai parameter migrasi; migrasi GAGAL bila tidak dipasok | Tanpa owner, 15 baris katalog tidak dapat diberi pemilik — migrasi tidak jalan |

**Aturan pengikat untuk semua implementasi:** satu change set =
satu finding (atau pasangan F-004+F-018 yang koheren, §4);
setiap change set membawa tes regresinya dan lolos di staging
sebelum change set berikutnya dimulai; bila satu kasus negatif
FAIL, finding itu tetap OPEN — tidak ada penutupan parsial.

---

## §1. F-001 — SSRF di checkLink (Critical)

### 1.1 Verifikasi current main (commit `cd96768`)

| Lokasi | Fakta terverifikasi |
| --- | --- |
| `site/server/src/actions.ts:147-168` `fetchText()` | Mengikuti cache dulu (`cacheGet(FETCH_CACHE, url)`, baris 152), lalu 2 attempt `fetchTextOnce` + retry 500 ms. **Tidak ada validasi URL/IP di mana pun.** |
| `site/server/src/actions.ts:170-210` `fetchTextOnce()` | Loop `hop <= 6` (7 request), `redirect: "manual"`, `fetch(current, …)` langsung tanpa resolve/validasi/pinning. Redirect `Location` di-resolve relatif (`new URL(loc, current)`) dan diikuti apa adanya — scheme apa pun yang lolos `new URL` (termasuk `http:` ke host internal) akan di-fetch. Body dibaca penuh (`res.text()`, baris ~201) lalu di-slice. |
| `site/server/src/actions.ts:220-268` `lookupRdapOnce()` | `fetch("https://rdap.org/domain/…", { redirect: "follow" })` (baris 235) — redirect diikuti OTOMATIS oleh runtime tanpa validasi hop. URL dasar tetap (`rdap.org`), tetapi hop redirect-nya tidak divalidasi. |
| `site/server/src/actions.ts:369` `analyze()` + `:378` | `deadline = AbortSignal.timeout(30_000)` — deadline total ada, tetapi BUKAN validasi SSRF. |
| `site/server/src/actions.ts:396` | Page fetch `fetchText(input.toString(), 400_000, deadline)` — URL paste-an pengguna langsung menjadi target fetch. |
| `site/server/src/actions.ts:511-538` (script fetch) | Hingga 3 `src` script dari HTML yang dikontrol penyerang di-fetch via `fetchText(abs, 300_000, deadline)` — **tanpa same-origin check** (klaim DATA-PLAN "up to 3 same-origin script files" SALAH terhadap kode; sudah dikoreksi di §D.4.18 F-001d). |
| `site/server/src/actions.ts:62` `registrableDomain()` + `:70` `normalizeUrl()` | Ada — dipakai untuk scoring/redirect-evidence, BUKAN untuk validasi keamanan fetch. |
| `site/server/src/actions.ts` (grep `lookup\|dns\|resolve\|isPrivate\|isLoopback`) | **Nol** — tidak ada pemanggilan DNS, tidak ada klasifikasi IP, tidak ada allowlist/blocklist di jalur fetch. |

**Kesimpulan verifikasi:** F-001 terkonfirmasi pada current main
tepat seperti yang dideskripsikan audit V1: URL apa pun yang
dipaste pengguna (dan URL script apa pun di halaman itu, dan hop
redirect RDAP apa pun) di-fetch server-side tanpa satu pun
pemeriksaan alamat tujuan.

### 1.2 File list

| File | Perubahan |
| --- | --- |
| `site/server/src/ssrf-guard.ts` (BARU) | Modul guard murni: `canonicalizeHost()`, `classifyIp()`, `resolveAll()`, `validateDestination()`, `fetchGuarded()` (lihat §1.3). Tanpa state global, tanpa cache jawaban antar hop. |
| `site/server/src/actions.ts` | `fetchTextOnce()` ditulis ulang di atas `fetchGuarded()`; `fetchText()` memanggil guard SEBELUM `cacheGet` (atau cache dihapus dari jalur ini, K-1); `lookupRdapOnce()` memakai `fetchGuarded()`; script fetch di `analyze()` memakai `fetchGuarded()` + same-origin check. Tidak ada perubahan signature `analyze()` / `runCheck()` / `checkLink`. |
| `site/server/src/schema.ts` | TIDAK disentuh (F-001 tidak menyentuh DB). |
| `site/drizzle/*` | TIDAK disentuh. |
| Tes (staging harness, di luar repo ini bila harness staging terpisah) | `H-SSRF-01..20` (sudah ada, §D.4.18) + `H-SSRF-21..26` (baru, §1.5). |

### 1.3 Pseudodiff

**F-001a — Resolve + validasi SEMUA jawaban (awal + tiap hop).**
```ts
// ssrf-guard.ts (BARU)
export type IpVerdict = { ok: true; ip: string } | { ok: false; reason: string };

export async function resolveAll(hostname: string, signal: AbortSignal): Promise<string[]> {
  // Resolve hostname ke SEMUA jawaban A dan AAAA, mengikuti rantai
  // CNAME sampai jawaban akhir. TIDAK memakai cache antar hop.
  // Implementasi memakai resolver yang hasilnya dapat di-pin
  // (lihat F-001c): bila runtime tidak menyediakan resolver
  // ter-pin, fungsi ini GAGAL fail-closed (throw) — bukan fallback
  // ke resolve tanpa pin.
}

export function validateDestination(hostname: string, ips: string[]): IpVerdict {
  // Kebijakan tolak-set (§D.4.18 F-001a): bila SATU jawaban
  // terlarang, SELURUH set ditolak. Alasan penolakan dicatat
  // (untuk log, bukan untuk respons pengguna — lihat §A.6:
  // respons penolakan tidak membocorkan alamat internal).
  for (const ip of ips) {
    const v = classifyIp(ip);           // F-001b
    if (!v.ok) return { ok: false, reason: v.reason };
  }
  return { ok: true, ip: ips[0] };
}
```

**F-001b — Tolak non-global-unicast (IPv4 + IPv6).**
```ts
// ssrf-guard.ts — classifyIp(ip): menolak (daftar = §A.4):
//   IPv4: 127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254/16
//     (termasuk 169.254.169.254 metadata — disebut eksplisit),
//     0.0.0.0, 100.64.0.0/10 (CGNAT, keputusan D-1..D-8).
//   IPv6: ::1, ::, fe80::/10, fc00::/7, ::ffff:0:0/96 (ekstrak
//     IPv4 tertanam lalu klasifikasikan sebagai IPv4), prefix
//     NAT64 yang DIKETAHUI (daftar prefix staging; prefix yang
//     tidak dikenal = risiko terbuka, dicatat U-11).
//   Zone-scoped (fe80::1%eth0, ::1%lo): tolak bila alamat dasarnya
//     terlarang; JANGAN PERNAH strip zone lalu memakai alamatnya.
//   Bentuk host non-kanonik DITOLAK fail-closed SEBELUM klasifikasi
//     (lihat canonicalizeHost di bawah).
```

**F-001c — Pin destination ke koneksi (anti DNS rebinding).**
```ts
// fetchGuarded(url, opts): untuk SETIAP request (awal + tiap hop):
//   1. host = canonicalizeHost(url) — WHATWG URL + penolakan bentuk
//      non-kanonik (desimal 2130706433, oktal 0177.0.0.1, heks
//      0x7f.0.0.1, pendek 127.1, userinfo http://publik@127.0.0.1/:
//      host yang gagal diparse kanonik DITOLAK, bukan di-fetch).
//   2. ips = await resolveAll(host); v = validateDestination(host, ips);
//      bila tidak ok → return null (fetch DITOLAK; tidak ada koneksi).
//   3. Koneksi DIBUKA ke alamat yang sudah divalidasi (pinning):
//      - Pendekatan 1 (UTAMA, terbukti di spike v2): Node `https`
//        Agent dengan `lookup` kustom yang mengembalikan alamat
//        ter-pin; sertifikat TLS diverifikasi terhadap HOSTNAME,
//        bukan terhadap IP pin.
//      - Pendekatan 2 (FALLBACK, terbukti di spike v2): koneksi
//        literal ke IP + header `Host` + `tls.serverName` = hostname.
//      - Bila runtime produksi TIDAK mendukung keduanya (U-1 /
//        STAGE-P01): implementasi DIBLOKIR, kembali ke meja desain.
//      Resolve ulang di antara validasi dan connect TIDAK BOLEH
//      mengubah destination: koneksi memakai alamat hasil langkah 2,
//      bukan hasil resolve kedua.
//   4. Respons redirect (301/302/303/307/308): Location di-resolve
//      relatif; hop BERIKUTNYA mengulang langkah 1–3 PENUH sebagai
//      URL baru. Scheme selain http/https DITOLAK. Hop yang
//      melanggar menghentikan rantai (return null, tanpa koneksi
//      ke hop itu). Batas hop tetap 6 (+ initial = 7 request).
```

**F-001d — `fetchTextOnce()` ditulis ulang (pseudodiff perilaku).**
```diff
 async function fetchTextOnce(url, cap, deadline):
-  for hop 0..6: res = await fetch(current, { redirect: "manual", ... })
-    if redirect: current = new URL(loc, current); continue
-    text = (await res.text()).slice(0, cap); return { text, finalUrl, status, chain }
+  for hop 0..6:
+    guarded = await fetchGuarded(current, { deadline, budget: <aggregate, §2> })
+    if guarded === null: return null            // ditolak guard / abort / error
+    res = guarded.response
+    if redirect: current = guarded.location; continue   // hop berikut divalidasi penuh
+    text = await readCappedStream(res.body, ...)        // §2, bukan res.text()
+    return { text, finalUrl: current, status, chain }
   return null
```

**F-001e — Script same-origin saja.**
```diff
 // analyze(): script fetch (baris ~511-538)
   scriptSrcs = [...(3 src pertama dari HTML)]
-  fetchText(abs, 300_000, deadline) untuk tiap src apa pun
+  for tiap src:
+    abs = new URL(src, page.finalUrl)
+    if abs.origin !== new URL(page.finalUrl).origin: SKIP (tidak di-fetch)
+    fetchText(abs, 300_000, deadline)   // tetap lewat guard F-001a..d + redirect
```

**F-001f — RDAP fetch lewat guard (BARU v2.3.19; tidak ada di §D.4.18).**
```diff
 // lookupRdapOnce(): baris ~235
-  fetch(`https://rdap.org/domain/${...}`, { redirect: "follow", ... })
+  fetchGuarded(`https://rdap.org/domain/${...}`, { deadline, budget: <RDAP budget> })
+  // redirect RDAP divalidasi hop-per-hop seperti fetch halaman;
+  // respons non-2xx / guard-reject → { registeredAt: null, registrar: null }
```
Alasan: URL dasar RDAP tetap, tetapi `redirect: "follow"` hari
ini mengikuti redirect ke host mana pun tanpa validasi. RDAP
bukan jalur eksekusi pengguna, tetapi tetap jalur fetch
server-side — guard yang sama, tanpa pengecualian.

### 1.4 Threat model

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Pengguna anonim mempaste URL | Mengontrol penuh URL awal (host, path, userinfo, port, bentuk IP non-kanonik) | Mencapai alamat internal apa pun (loopback/RFC1918/link-local/metadata/ULA/CGNAT/mapped) via URL awal |
| Pemilik situs target | Mengontrol redirect chain (6 hop), header `Location`, DNS zone target (TTL 0, jawaban campuran, CNAME ke internal) | Mencapai alamat internal via hop ke-2..ke-7; rebinding antara validasi dan connect (jawaban DNS berubah setelah validasi); lolos via satu jawaban publik di antara jawaban internal (tolak-set) |
| Pemilik situs target | Menyajikan IP dalam bentuk non-kanonik atau userinfo | Lolos klasifikasi via `2130706433`, `0x7f.0.0.1`, `127.1`, `http://publik@127.0.0.1/` |
| Pemilik situs target | Menyisipkan `<script src>` ke host internal / lintas origin | Memaksa server mem-fetch script internal atau lintas origin |
| Operator RDAP / perantara | Redirect dari `rdap.org` | Mengalihkan fetch RDAP ke host internal |

**Asumsi yang dinyatakan eksplisit (bukan disembunyikan):**
egress runtime diasumsikan TIDAK menambahkan proxy yang
mengubah destination setelah guard (bila ada egress proxy, ia
harus dinyatakan di STAGE-P03 dan diuji S-49/S-50); prefix NAT64
yang tidak dikenal tetap risiko terbuka (U-11); DNS resolver yang
dipakai guard diasumsikan mengembalikan jawaban yang sama dengan
yang dipakai koneksi (itulah yang dibuktikan pinning — bila
runtime tidak mendukung pinning, implementasi DIBLOKIR, bukan
dilanjutkan dengan asumsi).

### 1.5 Matriks tes — H-SSRF-01..20 (ada) + H-SSRF-21..26 (baru)

H-SSRF-01..20 tetap berlaku penuh (§D.4.18: privat IPv4,
loopback, link-local/metadata, RFC1918, loopback/link-local/
unique-local IPv6, IPv4-mapped 3 varian, zone-scoped, redirect
berantai 2 varian, DNS rebinding, jawaban campuran, script ke
internal, script lintas origin, redirect loop/hop berlebih,
rebinding via redirect, CNAME ke internal, IP non-kanonik,
userinfo, redirect ke userinfo/internal). Aturan ukur yang sama:
server uji lokal saja, listener `127.0.0.1` sebagai target
internal, "zero connections" dibuktikan listener + log egress,
tidak ada byte internal yang sampai ke output.

| ID | Kasus (BARU) | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-SSRF-21 | Redirect-by-redirect: hop 1 publik → hop 2 internal → hop 3 publik | Stub DNS + server uji; hop 2 = `127.0.0.1` | Rantai BERHENTI di hop 2: tidak ada koneksi ke hop 2; hasil = unreachable (bukan isi hop 3); listener hop 2 mencatat 0 koneksi | Koneksi apa pun ke hop 2, atau isi hop 3 sampai ke output |
| H-SSRF-22 | Redirect-by-redirect: hop 1 internal (langsung) | URL awal redirect 302 ke `http://127.0.0.1/` | Ditolak sebelum koneksi pertama ke target internal | Koneksi ke `127.0.0.1` |
| H-SSRF-23 | DNS rebinding terikat destination aktual | DNS stub: jawaban pertama publik, jawaban kedua (saat connect) internal; guard memakai pinning | Koneksi HANYA ke alamat publik hasil validasi; jawaban kedua tidak pernah dipakai sebagai destination | Koneksi ke alamat internal jawaban kedua |
| H-SSRF-24 | IPv6 mapped + NAT64 | `::ffff:127.0.0.1` dan prefix NAT64 yang diketahui menerjemahkan ke `127.0.0.1` | Keduanya DITOLAK (mapped diekstrak lalu diklasifikasi sebagai IPv4; NAT64 dikenal diterjemahkan lalu ditolak) | Salah satu lolos |
| H-SSRF-25 | RDAP redirect ke internal | Stub `rdap.org` mengembalikan 302 ke `http://169.254.169.254/` | Fetch RDAP DITOLAK di hop redirect; hasil RDAP = null/null (bukan error 500, bukan isi metadata) | Koneksi ke `169.254.169.254` |
| H-SSRF-26 | Script redirect ke internal | Halaman publik berisi `<script src>` same-origin yang 302 ke `http://10.0.0.5/x.js` | Script TIDAK di-fetch; sinyal script = kosong; halaman tetap dinilai dari HTML-nya | Isi `10.0.0.5` masuk ke haystack / sinyal |

**Kriteria penerimaan F-001:** H-SSRF-01..26 SEMUA PASS pada
implementasi tahap (b), dijalankan di staging (bukan hanya VM),
dengan log mentah + manifest seperti `evidence/v236/`. Satu kasus
FAIL = F-001 tetap OPEN. Harness yang lulus TIDAK membuktikan
implementasi aman bila tidak menguji jalur eksploitasi nyata di
atas — daftar ini syarat minimum.

### 1.6 Dependensi staging, rollback, risiko tersisa

- **Dependensi staging:** STAGE-P01 (runtime mendukung pinning —
  Pendekatan 1 atau 2; bila tidak, BLOCKED), STAGE-P03 (topologi
  egress + prefix NAT64/DNS64 dinyatakan), ST-14 (H-SSRF-10..12,
  16, 17, 21..26 di staging). Tanpa ketiganya, H-SSRF tidak dapat
  dijalankan secara bermakna.
- **Rollback:** bila guard menyebabkan false positive pada URL
  legit di staging (E-1), rollback = kembalikan `fetchTextOnce()`
  lama (satu commit revert) + nonaktifkan `checkLink` sampai guard
  diperbaiki; tidak ada migrasi DB yang perlu di-rollback (F-001
  tidak menyentuh DB).
- **Risiko tersisa:** U-1 (runtime tidak mendukung pinning),
  U-11 (prefix translasi tak dikenal), egress proxy tak
  terdokumentasi, DNS resolver guard vs resolver koneksi berbeda
  bila Pendekatan 1 tidak tersedia. Semua dicatat sebagai
  BLOCKED/OPEN sampai STAGE-P01/P03 terpenuhi.

---

## §2. F-002 — Cap setelah buffering (High)

### 2.1 Verifikasi current main (commit `cd96768`)

| Lokasi | Fakta terverifikasi |
| --- | --- |
| `site/server/src/actions.ts:170-210` `fetchTextOnce()` | `const text = (await res.text()).slice(0, cap)` — **seluruh body dibaca ke memori dulu, baru dipotong**. Cap 400.000 (page, baris 396) / 300.000 (script, baris 524) adalah cap SETELAH buffering penuh. |
| `site/server/src/actions.ts:147-168` `fetchText()` | Retry 2 attempt dengan `sleep 500 ms` — body besar dapat dibaca 2× (retry setelah gagal) tanpa anggaran aggregate. |
| Dekompresi | Tidak ada penghitung byte hasil dekompresi di mana pun (grep `decompress\|gzip\|brotli\|inflate`: nol di `actions.ts`). Bun melakukan dekompresi transparan (terbukti eksperimen v2.3.13: gzip 551 byte → 500.000 byte), sehingga `res.text()` menerima byte HASIL dekompresi — gzip bomb dibaca penuh sebelum slice. |
| Aggregate | Tidak ada anggaran total per pemeriksaan: page (400k) + 3 script (3×300k) + redirect chain dapat mengakali cap per-request dengan memecah body. |
| Keputusan yang sudah ada | §D.4.26: aggregate 1.000.000 decoded byte per scan + overhead 0 pada accepted/retained bytes; §D.4.25: anggaran transient/in-flight (A2) dipisah; L2 = input-body budget, BUKAN peak-memory budget. |

### 2.2 File list

| File | Perubahan |
| --- | --- |
| `site/server/src/ssrf-guard.ts` (BARU, sama dengan §1) | `readCappedStream()` — pembaca stream dengan 3 penghitung (lihat §2.3). |
| `site/server/src/actions.ts` | `fetchTextOnce()` memakai `readCappedStream()`; `analyze()` membuat + membagikan satu `ScanBudget` per pemeriksaan; redirect response body TIDAK dibaca (discard tanpa `res.text()`). |
| `site/server/src/schema.ts`, `site/drizzle/*` | TIDAK disentuh. |

### 2.3 Pseudodiff

```ts
// ssrf-guard.ts (BARU) — dibagikan dengan §1
export type ScanBudget = {
  aggregateDecodedCap: number;   // 1.000.000 (keputusan §D.4.26, K-2)
  aggregateDecodedUsed: number;  // berjalan per pemeriksaan
  abort: AbortController;        // dibagikan semua fetch dalam satu pemeriksaan
};

export async function readCappedStream(
  body: ReadableStream<Uint8Array> | null,
  opts: {
    compressedCap: number;     // 400.000 page / 300.000 script (K-2)
    decompressedCap: number;   // nilai yang sama per request (K-2)
    budget: ScanBudget;        // aggregate per pemeriksaan
  },
): Promise<{ text: string; truncated: boolean }> {
  // Baca via reader (BUKAN res.text()):
  //   - tiap chunk: compressedBytes += chunk.length (raw off the wire);
  //   - decodedBytes += chunk.length SETELAH dekompresi transparan
  //     runtime (chunk yang dibaca dari body SUDAH ter-dekompresi
  //     bila runtime mendekompresi — penghitung duduk DI SINI,
  //     pada byte yang diterima aplikasi);
  //   - budget.aggregateDecodedUsed += chunk.length;
  //   - bila SALAH SATU penghitung melewati cap-nya: cancel reader,
  //     abort controller, return { text: <yang sudah terbaca>,
  //     truncated: true } — TIDAK PERNAH buffer melebihi cap +
  //     overhead stream yang dinyatakan (satu chunk, §D.4.25 A2).
  //   - bila runtime TIDAK menyediakan decoded stream yang dapat
  //     dihitung (dekompresi terjadi di luar jangkauan penghitung):
  //     implementasi DIBLOKIR — jangan klaim cap berlaku.
}
```

```diff
 // fetchTextOnce(): baris ~201
-  const text = (await res.text()).slice(0, cap);
+  const { text } = await readCappedStream(res.body, {
+    compressedCap: cap, decompressedCap: cap, budget: <ScanBudget pemeriksaan> });
+  // redirect response: JANGAN panggil res.text()/readCappedStream —
+  // body redirect di-discard tanpa dibaca (cancel stream).

 // analyze(): satu ScanBudget per pemeriksaan, dibagikan ke page +
 // semua redirect + semua script; sinyal batal yang sama dipakai
 // fetchGuarded (§1) dan readCappedStream (§2).
```

**Tiga lapisan byte (mengikat, §D.4.25/§D.4.26):**
- L1 — compressed cap per request (raw bytes off the wire).
- L2 — decompressed cap per request = input-body budget (bukan
  peak-memory budget; larangan materialisasi bersamaan + pemindaian
  incremental tetap berlaku).
- L3 — aggregate 1.000.000 decoded byte per scan (page + redirect
  + script). Anggaran transient/in-flight (A2) dipisah eksplisit
  dari accepted/retained bytes; klaim "overhead 0" hanya berlaku
  untuk accepted/retained bytes di accumulator aplikasi.

### 2.4 Threat model

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Pemilik situs target | Body 50 MB; gzip bomb rasio >100×; body tepat di cap | Memori proses melewati anggaran yang dinyatakan; satu pemeriksaan mem-buffer melebihi cap + satu chunk |
| Pemilik situs target | Memecah body ke 7 hop redirect / 3 script | Mengakali cap per-request: aggregate L3 menghentikan rantai saat total decoded melewati 1.000.000 |
| Pemilik situs target | Satu chunk 500.000 byte (= seluruh body) | Chunk tunggal tidak dibatasi oleh chunking server 64 KiB — penghitung duduk pada byte diterima, bukan pada jumlah chunk |

### 2.5 Matriks tes — H-RES-01..03 (ada) + H-RES-07..10 (baru)

H-RES-01..03 tetap berlaku (body 50 MB → abort sebelum 50 MB
ter-buffer; gzip bomb >100× → abort pada decompressed cap; body
tepat di bawah cap → lolos utuh). H-RES-04..06 milik F-003 (§3).

| ID | Kasus (BARU) | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-RES-07 | Aggregate: page 400k + 3 script 300k (total decoded 1.300k) | Server uji menyajikan body tepat di cap per-request | Pemeriksaan BERHENTI saat aggregate melewati 1.000.000 decoded byte; script ke-3 (atau ke-2, tergantung urutan) tidak dibaca penuh; hasil tetap keluar (bukan crash) | Total decoded yang di-buffer > 1.000.000 + satu chunk |
| H-RES-08 | Gzip bomb via redirect | Hop 1 = gzip bomb (551 byte → 500.000 byte) | Abort pada decompressed cap; byte ter-buffer ≤ cap + satu chunk | Body ter-dekompresi penuh ter-buffer |
| H-RES-09 | Chunk tunggal > cap | Server mengirim satu chunk 500.000 byte (body = cap+100k) | Abort setelah chunk itu; byte ter-buffer ≤ cap + chunk itu (A2 tercatat) | Seluruh chunk + chunk berikutnya ter-buffer |
| H-RES-10 | Redirect dengan body besar | Respons 302 membawa body 50 MB | Body redirect TIDAK dibaca sama sekali (0 byte dihitung ke anggaran); rantai lanjut ke hop berikut | `res.text()` / stream read dipanggil pada respons redirect |

**Kriteria penerimaan F-002:** byte yang di-buffer tidak pernah
melebihi cap + overhead stream yang dinyatakan (satu chunk, A2),
pada H-RES-01..03 + H-RES-07..10, di staging.

### 2.6 Dependensi staging, rollback, risiko tersisa

- **Dependensi staging:** STAGE-P01 (perilaku dekompresi Bun
  pada versi kanonik 1.3.10 — U-62 bagian staging; VM 1.4.4 sudah
  terbukti, 1.3.10 NOT VERIFIED), G-H (harness H-RES-02/03/05
  yang sudah dikoreksi), ambang pra-tes H-RES-05 dari operator
  staging (bukan rasio VM).
- **Rollback:** revert `readCappedStream` → `res.text().slice()`
  (satu commit) + nonaktifkan `checkLink` bila cap gagal; tidak
  ada migrasi DB.
- **Risiko tersisa:** runtime yang mendekompresi di luar jangkauan
  penghitung (implementasi BLOCKED bila terbukti); chunk tunggal
  raksasa (A2 harus dinyatakan eksplisit per deployment);
  perbedaan perilaku Bun 1.3.10 vs 1.4.4 pada dekompresi (U-62).

---

## §3. F-003 — Tanpa total deadline (High; PARTIALLY MITIGATED di kode)

### 3.1 Verifikasi current main (commit `cd96768`)

| Lokasi | Fakta terverifikasi |
| --- | --- |
| `site/server/src/actions.ts:378` `analyze()` | `const deadline = AbortSignal.timeout(30_000)` — **satu sinyal deadline total per pemeriksaan SUDAH ADA** di kode mirror (commit d85a1e2). Sinyal ini dibagikan ke RDAP + page (`Promise.all`, baris ~385) dan ke script fetch (baris ~524). |
| `site/server/src/actions.ts:170-210` `fetchTextOnce()` | Tiap fetch juga punya `AbortSignal.timeout(12000)` per-fetch — batas per-fetch DI DALAM anggaran total, bukan penggantinya (sesuai desain). |
| `site/server/src/actions.ts:147-168` `fetchText()` | Retry 2 attempt + `sleep 500 ms` antar attempt — masih di dalam sinyal deadline yang sama (bila deadline abort, retry berhenti, baris ~160). |
| Concurrency / rate limit | **TIDAK ADA** — grep `lease|rate.?limit|429|503|semaphore|concurrent` di `actions.ts` menghasilkan NOL (satu-satunya "lease" adalah substring alamat kontrak). Tidak ada batas pemeriksaan bersamaan, tidak ada rate limit per IP (10/menit, 100/jam yang diputuskan D-1..D-8 belum diimplementasikan), tidak ada penolakan fail-closed 429/503. |
| Tes regresi | **TIDAK ADA** — deadline 30 detik tidak punya satu pun tes regresi; status penutupan TIDAK berubah (tetap OPEN sampai H-RES-04..06 PASS di staging). |

**Kesimpulan verifikasi:** F-003a (satu total deadline) PARTIALLY
MITIGATED di kode; F-003b (cancellation budget) sebagian ada
(sinyal dibagikan, tetapi tidak ada bukti pembatalan semua fetch
yang berjalan diuji); F-003c (concurrency/rate bounds) BELUM ADA
sama sekali.

### 3.2 File list

| File | Perubahan |
| --- | --- |
| `site/server/src/actions.ts` | `analyze()`/`runCheck()`: `ScanBudget` (§2) + sinyal batal bersama; batas konkurensi + rate limit di `checkLink` handler (lihat §3.3); TIDAK mengubah signature action. |
| `site/server/src/ssrf-guard.ts` (BARU) | `acquireScanSlot()` / `releaseScanSlot()` — lease pemeriksaan (bila DB lease dipakai, lihat §A.5.6/A.7.3; bila in-memory, dinyatakan eksplisit sebagai batas per-instance, bukan global). |
| `site/server/src/schema.ts`, `site/drizzle/*` | TIDAK disentuh — KECUALI bila lease global dipilih memakai tabel `scan_leases` (§A.7.3): maka migrasi `0006` (atau `0007`, sesudah §4) menambah tabel itu; keputusan ini dicatat sebagai varian, bukan default (lihat §3.3). |

### 3.3 Pseudodiff

**F-003a — Satu total deadline (mempertahankan yang sudah ada + mengujinya).**
```ts
// analyze(): baris 378 — PERTAHANKAN, beri nama + dokumentasi:
//   const deadline = AbortSignal.timeout(30_000); // TOTAL budget
//   per pemeriksaan: RDAP + page + semua redirect + semua script.
//   Nilai 30 detik = keputusan yang sudah ada (bukan angka baru);
//   toleransi staging +2 detik (K-3).
//   Per-fetch 12 detik tetap sebagai batas DI DALAM anggaran total.
```

**F-003b — Cancellation budget (satu sinyal, semua fetch).**
```ts
// analyze(): satu AbortController per pemeriksaan (ScanBudget.abort,
// §2) yang dibagikan ke fetchGuarded (§1) + readCappedStream (§2)
// + lookupRdapOnce. Saat anggaran habis:
//   - SEMUA fetch yang berjalan dibatalkan (bukan hanya yang terakhir);
//   - hasil parsial DIBUANG (tidak ada sinyal dari body setengah terbaca);
//   - handler mengembalikan hasil "tidak bisa dinilai" (bukan error 500
//     yang tidak tertangani, bukan skor dari data parsial).
```

**F-003c — Concurrency/rate bounds (BARU — belum ada di kode).**
```ts
// checkLink handler (runCheck): SEBELUM fetch apa pun:
//   slot = acquireScanSlot();            // batas pemeriksaan bersamaan
//   if (!slot) return <429/503 fail-closed, "coba lagi">;
//   try { ...analyze()... } finally { releaseScanSlot(); }
// Batas: maks 5 pemeriksaan bersamaan (lease global §A.5.6).
// Rate limit per IP pemanggil: 10/menit, 100/jam (keputusan D-1..D-8);
// kelebihan DITOLAK fail-closed (429), bukan antre tanpa batas.
// VARIAN lease (diputuskan saat implementasi, dicatat di log):
//   (i) in-memory semaphore per instance — dinyatakan sebagai batas
//       PER-INSTANCE (bukan global); DOKUMENTASIKAN bahwa multi-instance
//       dapat melampaui 5 secara agregat; ATAU
//   (ii) tabel `scan_leases` di DB (§A.7.3) — atomicity global,
//       membutuhkan migrasi + tes SEM-01..SEM-06 / LSE-01..LSE-06.
//   Pilihan default: (i) bila deployment single-instance TERBUKTI;
//   (ii) bila multi-instance. JANGAN klaim global bila memakai (i).
```

### 3.4 Threat model

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Pemilik situs target | Slow drip (1 byte/10 detik); rantai 7 fetch lambat; server yang tidak pernah merespons | Satu pemeriksaan menggantung melewati total deadline; hasil parsial dipakai sebagai vonis |
| Banyak pemanggil anonim | 20+ pemeriksaan bersamaan; banjir request | Melebihi batas konkurensi; antrean tanpa batas menghabiskan memori/file descriptor; satu IP membanjiri tanpa rate limit |

### 3.5 Matriks tes — H-RES-04..06 (ada) + H-RES-11..12 (baru)

H-RES-04..06 tetap berlaku (slow drip → berakhir pada total
deadline; rantai 7 fetch lambat → total ≤ deadline + toleransi;
20 pemeriksaan bersamaan → tidak melebihi batas, kelebihan
ditolak fail-closed).

| ID | Kasus (BARU) | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-RES-11 | Slow-drip SCRIPT (bukan page) | Page cepat, satu script menetes 1 byte/10 detik | Pemeriksaan berakhir pada total deadline 30 detik (+2 toleransi); tidak ada sinyal dari script setengah terbaca | Pemeriksaan menggantung > 32 detik, atau sinyal dari script parsial muncul |
| H-RES-12 | Pembatalan grup: 3 fetch paralel saat deadline habis | Page + 2 script lambat bersamaan; deadline 30 detik | KETIGA fetch dibatalkan saat deadline (log/jejak: tidak ada fetch yang berlanjut melewati deadline + toleransi); hasil = tidak bisa dinilai | Satu fetch berlanjut setelah deadline; hasil parsial dipakai |

**Kriteria penerimaan F-003:** waktu total dan jumlah fetch
bersamaan selalu dalam anggaran yang dinyatakan (30 detik +2
toleransi; maks 5 bersamaan; rate limit 10/menit, 100/jam),
pada H-RES-04..06 + H-RES-11..12, di staging.

### 3.6 Dependensi staging, rollback, risiko tersisa

- **Dependensi staging:** G-I (stress test memori H-RES-03/05 +
  proses deployment manifest), STAGE-P01 (perilaku timeout Bun
  kanonik), operator staging menetapkan ambang pra-tes H-RES-05.
- **Rollback:** revert batas konkurensi/rate limit (satu commit);
  deadline 30 detik DIPERTAHANKAN (sudah ada sebelum proposal).
- **Risiko tersisa:** batas per-instance vs global (varian §3.3 —
  salah klaim = celah DoS multi-instance); retry 500 ms dapat
  memperpanjang pemeriksaan hingga deadline (bukan melewatinya —
  dibuktikan H-RES-05).

---

## §4. F-004 + F-018 — SATU migrasi koheren (Medium + High bila DB shared)

### 4.1 Verifikasi current main (commit `cd96768`)

| Lokasi | Fakta terverifikasi |
| --- | --- |
| `site/server/src/actions.ts:1103-1262` `addProject()` | Duplikasi dicek dengan DUA SELECT lalu INSERT (baris ~1197-1218 SELECT nama, ~1219-1230 SELECT alamat, ~1235 INSERT). **Jendela race terbuka** di antara SELECT terakhir dan INSERT: dua request bersamaan yang sama-sama lolos SELECT akan sama-sama INSERT. Komentar kode sendiri menyatakan: "Ini BUKAN unique constraint — itu bagian F-004 yang tetap terbuka." |
| `site/server/src/actions.ts:1189-1196` | Normalisasi yang dipakai SELECT: nama `lower(trim(name))`, alamat `lower(contract_address)` — tetapi TIDAK ada constraint DB yang menegakkannya. |
| `site/server/src/schema.ts:24-44` `projects` | **Tidak ada** unique constraint, index, atau kolom owner/principal. Kolom: `id, name, ticker, chain, category, segment, status_label, description, difficulty, reward_note, contract_address, explorer_url, official_url, x_handle, verified_at, verified_note, sort`. |
| `site/server/src/schema.ts:1-22` `checks` | Tidak ada kolom owner/principal. |
| `site/server/src/schema.ts:46-67` `savedProjects` | PK `projectId` saja; tidak ada kolom owner. Kepemilikan bookmark/task-status diturunkan dari baris `projects` (tidak ada identitas pengguna di mana pun). |
| `site/drizzle/0001..0005*.sql` | 5 migrasi ada; migrasi berikutnya = `0006`. Tabel `projects` dibuat di `0003`, seed permanen di `0004` (15 proyek — jumlah saat ini 15, diverifikasi katalog). |
| F-018 (v2.3.11/12) | `.d.ts` SDK: `PortableCtx.db: SpaceDbAccessor` (accessor per-invocation) + `viewer?` opsional — tetapi TIDAK ADA pernyataan apakah DB di balik accessor itu per-user atau per-artifact/shared; README SDK nol tentang tenancy; `actions.ts` TIDAK PERNAH merujuk `ctx.viewer` (grep: nol). Semantik tenancy runtime tetap **NOT VERIFIED**. |

**Kesimpulan verifikasi:** F-004 dan F-018 adalah SATU pekerjaan
migrasi yang sama (sudah dicatat v2.3.11): constraint unik +
kolom ownership harus tiba bersamaan dalam satu migrasi, bukan
dua migrasi yang dapat bertentangan (mis. migrasi ownership tanpa
unique constraint masih membiarkan duplikat lintas tenant; migrasi
unique tanpa ownership masih membiarkan satu tenant menimpa baris
tenant lain).

### 4.2 File list

| File | Perubahan |
| --- | --- |
| `site/drizzle/0006_unified_ownership_and_uniqueness.sql` (BARU) | Satu migrasi: kolom `owner_user_id` + 2 unique index + backfill + pre-check duplikat (lihat §4.3). |
| `site/server/src/schema.ts` | `projects` + `checks`: tambah `ownerUserId` (TEXT, NOT NULL setelah backfill); tambah unique index definisi (Drizzle `uniqueIndex`); `savedProjects`: TIDAK tambah kolom owner (kepemilikan diturunkan dari `projects` — lihat §4.3). |
| `site/server/src/actions.ts` | `addProject()`: hapus pola SELECT-lalu-INSERT; INSERT atomik + penanganan konflik DB; semua baca katalog (`listProjects`, `deleteCheck`, `askGibran`, `setProjectState`) difilter `owner_user_id = principal` (lihat §4.3 + §5). |
| `site/server/src/ssrf-guard.ts` | TIDAK disentuh. |

### 4.3 Pseudodiff — migrasi `0006` (SATU migrasi koheren)

```sql
-- 0006_unified_ownership_and_uniqueness.sql
-- PRASYARAT (gagal bila tidak terpenuhi — migrasi TIDAK menghapus data):
--   1. Parameter OWNER_USER_ID dipasok oleh operator saat menjalankan
--      migrasi (K-6). Tanpa parameter ini, migrasi GAGAL sebelum
--      menyentuh satu baris pun. Nilai ini TIDAK ditebak dari kode.
--   2. PRE-CHECK duplikat (dijalankan SEBELUM ALTER apa pun):
--        SELECT lower(trim(name)), count(*) FROM projects
--          GROUP BY 1 HAVING count(*) > 1;
--        SELECT lower(contract_address), count(*) FROM projects
--          WHERE contract_address IS NOT NULL
--          GROUP BY 1 HAVING count(*) > 1;
--      Bila salah satu mengembalikan baris: migrasi GAGAL dengan
--      LAPORAN (daftar duplikat) — duplikat diselesaikan MANUAL
--      dulu, bukan dihapus diam-diam oleh migrasi.
--   3. Snapshot/backup katalog sebelum migrasi (prosedur operator;
--      15 baris saat ini — jumlah diverifikasi sebelum dan sesudah).

-- Langkah 1: tambah kolom ownership (nullable dulu, agar backfill bisa jalan).
ALTER TABLE `projects` ADD COLUMN `owner_user_id` text;
ALTER TABLE `checks` ADD COLUMN `owner_user_id` text;

-- Langkah 2: backfill pemilik katalog yang ada.
--   Semua 15 baris katalog yang ada diberi OWNER_USER_ID (parameter).
--   Baris `checks` yang ada: diberi OWNER_USER_ID yang sama (riwayat
--   pemeriksaan yang sudah ada dianggap milik pemilik katalog; bila
--   owner memutuskan riwayat lama harus dihapus, itu keputusan
--   terpisah — BUKAN bagian migrasi ini).
UPDATE `projects` SET `owner_user_id` = '<OWNER_USER_ID>';
UPDATE `checks` SET `owner_user_id` = '<OWNER_USER_ID>';

-- Langkah 3: jadikan kolom NOT NULL (setelah backfill terbukti penuh).
--   SQLite/Drizzle: NOT NULL ditegakkan via definisi skema baru
--   (tabel di-rebuild oleh Drizzle bila diperlukan) — skrip migrasi
--   WAJIB memverifikasi `SELECT count(*) FROM projects WHERE
--   owner_user_id IS NULL` = 0 sebelum lanjut; bila > 0, GAGAL.

-- Langkah 4: unique constraint — DUA index terpisah (bukan composite):
--   (a) nama ternormalisasi: UNIQUE INDEX pada lower(trim(name));
--   (b) alamat kontrak ternormalisasi: UNIQUE INDEX pada
--       lower(contract_address) WHERE contract_address IS NOT NULL
--       (NULL tidak pernah cocok — dua proyek tanpa kontrak boleh ada).
--   Normalisasi: trim + lowercase; alamat dibandingkan tanpa prefix
--   `0x` (nilai tersimpan tetap bentuk kanonik hex asli).
--   Duplikat nama DITOLAK walau alamat berbeda; duplikat alamat
--   DITOLAK walau nama berbeda.
CREATE UNIQUE INDEX `projects_name_normalized_unique`
  ON `projects` (lower(trim(`name`)));
CREATE UNIQUE INDEX `projects_contract_normalized_unique`
  ON `projects` (lower(`contract_address`))
  WHERE `contract_address` IS NOT NULL;

-- Langkah 5: index baca per pemilik (agar filter tenancy tidak full-scan).
CREATE INDEX `projects_owner_idx` ON `projects` (`owner_user_id`);
CREATE INDEX `checks_owner_idx` ON `checks` (`owner_user_id`);

-- DOWN migration (rollback): DROP kedua unique index + kedua index
-- owner + kolom owner_user_id (kolom dihapus via rebuild tabel).
-- Data katalog TIDAK dihapus oleh down migration. Down migration
-- HANYA boleh dijalankan bila tidak ada baris yang bergantung pada
-- constraint (yakni, segera setelah up migration, sebelum insert
-- baru) — bila sudah ada insert baru yang mengandalkan constraint,
-- rollback = restore dari backup langkah 0, bukan down migration.
```

```diff
 // addProject(): baris ~1197-1262 — HAPUS pola baca-semua-lalu-insert
-  nameDup = SELECT ... WHERE lower(trim(name)) = nameKey; if found → reject
-  addrDup = SELECT ... WHERE lower(contract_address) = addrKey; if found → reject
-  maxSort = SELECT max(sort); nextSort = maxSort + 1
-  inserted = INSERT ... VALUES (...) RETURNING
+  // Satu INSERT atomik; konflik ditangani DB, bukan SELECT:
+  try {
+    inserted = INSERT ... VALUES (..., owner_user_id = principal, sort = <lihat bawah>)
+      ON CONFLICT (nama ternormalisasi) DO NOTHING
+      ON CONFLICT (alamat ternormalisasi) DO NOTHING
+      RETURNING
+  } catch (e) { if (e adalah unique-violation) → reject "duplikat"; else throw }
+  if (inserted kosong) → reject "duplikat (nama/alamat sudah ada)"
+  // sort: max(sort)+1 dihitung DALAM transaksi yang sama (atau
+  // diganti urutan stabil lain — JANGAN baca max(sort) di luar
+  // transaksi: dua insert bersamaan dapat mendapat sort yang sama;
+  // sort duplikat bukan korupsi, tetapi harus dinyatakan: sort
+  // BUKAN unique — bila dua baris berbagi sort, urutan tampilan
+  // memakai (sort, id) sebagai tiebreak deterministik).
```

```diff
 // Semua baca katalog — filter tenancy (F-018, cabang shared):
-  listProjects / listChecks / deleteCheck / askGibran / setProjectState:
-    ... tanpa filter kepemilikan ...
+  ... WHERE owner_user_id = <principal dari mekanisme §5> ...
+  // delete/update: baris yang owner-nya bukan principal → TIDAK
+  // DITEMUKAN (bukan "dilarang" — tidak membocorkan keberadaan baris
+  // tenant lain). Gibran hanya membaca riwayat milik principal.
+  // savedProjects: kepemilikan diturunkan via JOIN projects
+  // (WHERE projects.owner_user_id = principal).
```

### 4.4 Threat model

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Dua pemanggil bersamaan | 10 request duplikat (nama sama / alamat sama) dalam satu detik | Dua baris duplikat tercipta (tepat 1 baris menang; 9 lainnya menerima respons konflik, bukan error 500) |
| Pemanggil lintas tenant | Mengetahui `projectId` / nama proyek tenant lain | Membaca, mengubah, menghapus, atau menimpa baris tenant lain; Gibran tenant A menjawab dari riwayat tenant B |
| Pemanggil | Nama sama dengan beda case/spasi (`"Paw Gang"` vs `" paw gang "`) / alamat sama beda case (`0xAB…` vs `0xab…`) | Lolos sebagai "proyek berbeda" |
| Operator migrasi | Menjalankan migrasi tanpa parameter owner / dengan katalog berduplikat | Migrasi diam-diam menghapus atau menggabung data; migrasi sukses dengan owner yang ditebak |

### 4.5 Matriks tes — H-CAT-01..03 (ada) + H-TEN-01..05 (ada, diperluas)

H-CAT-01..03 tetap berlaku (10 duplikat bersamaan → tepat 1
baris; alamat sama beda case/spasi → tepat 1 baris; dua nama
berbeda alamat sama → tepat 1 baris). H-TEN-01..05 (v2.3.11):
dua principal, baca lintas tenant, hapus lintas tenant, Gibran
isolasi, `viewer` hilang → fail-closed.

| ID | Kasus (BARU / diperluas) | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-CAT-04 | Duplikat nama beda case + spasi, bersamaan | 10 request `"Paw Gang"` / `" paw gang "` / `"PAW GANG"` paralel | Tepat 1 baris; 9 konflik (bukan 500) | >1 baris, atau satu pun 500 |
| H-CAT-05 | Migrasi dengan katalog berduplikat | Seed 2 baris duplikat (normalisasi sama), jalankan migrasi 0006 | Migrasi GAGAL dengan laporan duplikat; TIDAK ADA baris yang berubah/hilang | Migrasi sukses, atau baris hilang/digabung diam-diam |
| H-CAT-06 | Migrasi tanpa OWNER_USER_ID | Jalankan migrasi tanpa parameter | Migrasi GAGAL sebelum ALTER; katalog byte-identik sebelum/sesudah | Migrasi sukses dengan owner tebakan |
| H-TEN-06 | Backfill: 15 baris katalog | Migrasi 0006 dengan OWNER_USER_ID dipasok | 15/15 baris punya `owner_user_id` = parameter; jumlah baris tetap 15; tidak ada baris baru/hilang | Baris < 15, atau satu baris owner NULL |
| H-TEN-07 | Down migration segera | Up 0006 lalu down 0006 sebelum insert baru | Skema kembali (tanpa kolom/index baru); 15 baris utuh | Baris hilang/berubah |

**Kriteria penerimaan F-004 + F-018:** hitung baris di DB setelah
tiap run cocok dengan yang dinyatakan (H-CAT-01..06), isolasi
tenant terbukti dua arah (H-TEN-01..07), migrasi gagal aman pada
H-CAT-05/06, di staging.

### 4.6 Dependensi staging, rollback, risiko tersisa

- **Dependensi staging:** STAGE-P01..P12 (DB staging + runtime
  staging), keputusan G-C (tenancy — cabang shared adalah default
  sampai provider menyatakan tertulis), OWNER_USER_ID dari owner
  (K-6), backup katalog sebelum migrasi.
- **Rollback:** down migration (§4.3) bila belum ada insert baru;
  bila sudah ada insert baru → restore dari backup langkah 0.
  Rollback TIDAK menghapus data katalog.
- **Risiko tersisa:** bila provider kemudian menyatakan `ctx.db`
  per-user (bukan shared), kolom `owner_user_id` menjadi redundan
  tetapi TIDAK berbahaya (filter tetap benar — principal yang sama
  hanya melihat barisnya); bila `ctx.viewer` ternyata tidak dapat
  dipercaya sebagai principal, mekanisme §5 Opsi A gugur dan Opsi
  B/C berlaku; sort `max+1` di luar transaksi masih dapat
  menghasilkan sort duplikat (dinyatakan bukan korupsi —
  tiebreak `(sort, id)`).

---

## §5. F-005 — Otorisasi addProject + tenancy scoping (Medium)

### 5.1 Verifikasi current main (commit `cd96768`)

| Lokasi | Fakta terverifikasi |
| --- | --- |
| `site/server/src/actions.ts` (grep `auth\|authorize\|role\|token\|session\|ADMIN`) | **Nol** pemeriksaan otorisasi (satu-satunya "registrar" adalah peran RDAP; "Gibran" adalah nama asisten). |
| `site/server/src/actions.ts:1365-1372` `checkLink` | `defineAction` biasa tanpa wrapper auth. (Fungsi `checkLink` BOLEH publik — itu fungsinya; tetapi ia TIDAK BOLEH menjadi jalur mutasi katalog, §5.3.) |
| `site/server/src/actions.ts:1486-1508` `addProject` | `defineAction` biasa, handler langsung `addProject(ctx, args)` — tanpa pemeriksaan pemanggil apa pun. |
| `site/server/src/actions.ts:1103-1262` `addProject()` | Tidak ada parameter identitas pemanggil; `verified_at` / `verified_note` (baris ~1062-1063 pada versi lama; saat ini diteruskan dari `args`) disimpan VERBATIM dari argumen caller — provenance yang diklaim caller, bukan yang diverifikasi server. |
| `site/server/src/schema.ts:48-49` (versi lama) / saat ini | Skema `projects` tidak punya kolom provenance (`verified_at`/`verified_note` ada sebagai TEXT, tetapi tidak ada kolom sumber/pengaju/verifikator terpisah). |
| F-018 (v2.3.11/12) | `ctx.viewer` ADA di tipe SDK (`LocalViewer`/`CloudflareViewer`) tetapi: (a) `actions.ts` TIDAK PERNAH merujuknya; (b) tidak ada pernyataan provider apakah `viewer` terotentikasi / apakah `db` per-user atau shared; (c) README SDK nol tentang tenancy. **Semantik `ctx.viewer` dan `ctx.db` tetap NOT VERIFIED.** |

**Kesimpulan verifikasi:** di dalam kode, otorisasi addProject
TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED.
Dokumen ini TIDAK mengarang mekanisme yang tidak dapat
diverifikasi — ia memberi tiga opsi dengan prasyarat bukti
masing-masing (§5.3), dan default-nya adalah menonaktifkan
jalur mutasi sampai satu opsi terbukti.

### 5.2 File list

| File | Perubahan |
| --- | --- |
| `site/server/src/actions.ts` | `addProject` handler: gerbang otorisasi + provenance wajib (lihat §5.3); `checkLink`: penegasan eksplisit bukan jalur mutasi (dokumentasi + pemisahan handler). |
| `site/server/src/schema.ts` + `site/drizzle/0006*` | Kolom provenance (`provenance_source_url`, `provenance_submitted_by`, `provenance_verified_by`) — bagian dari migrasi §4 (SATU migrasi; kolom provenance ditambahkan di 0006 yang sama, bukan migrasi terpisah). |
| `site/server/src/ssrf-guard.ts` | TIDAK disentuh. |

### 5.3 Pseudodiff — tiga opsi mekanisme (pilih SATU; default Opsi C)

**Prinsip yang mengikat semua opsi:** principal TIDAK BOLEH
diambil dari `ctx.viewer` kecuali Opsi A terbukti; principal
TIDAK BOLEH diambil dari argumen caller (argumen adalah data
yang tidak tepercaya); provenance TIDAK BOLEH disimpan verbatim
dari caller — setiap field provenance harus diisi server dari
sumber yang diverifikasi.

**Opsi A — Artifact-runtime allowlist (HANYA bila provider menyatakan tertulis).**
```ts
// Prasyarat bukti (WAJIB ada SEBELUM implementasi Opsi A):
//   (a) pernyataan tertulis provider: `ctx.viewer` HANYA terisi
//       untuk pemanggil terotentikasi, dan field-nya
//       (userId/ownerUserId/shareId/tokenId) tidak dapat dipalsukan
//       oleh pemanggil;
//   (b) pernyataan tertulis provider: scope `ctx.db` (per-user vs
//       shared) — jawaban atas F-018 (G-C).
// Bila (a) atau (b) tidak ada: Opsi A GUGUR — jangan implementasikan
// dengan asumsi.
// Pseudodiff:
//   const principal = requireAuthenticatedViewer(ctx); // throw bila viewer hilang
//   if (!isCatalogAdmin(principal)) → reject + log (bukan "tidak ditemukan"
//     — penolakan otorisasi BOLEH dicatat eksplisit di log server;
//     respons ke pemanggil tetap generik, §A.6).
//   Daftar admin = daftar eksplisit di konfigurasi (bukan "semua viewer").
```

**Opsi B — Service token (tanpa asumsi SDK apa pun).**
```ts
// Prasyarat bukti: TIDAK ADA — opsi ini tidak memakai `ctx.viewer`
// atau perilaku SDK yang belum dibuktikan.
// Pseudodiff:
//   const token = <service token dari secret environment — BUKAN dari
//     argumen, BUKAN dari kode, BUKAN dari repo>;
//   const presented = <token yang dipasok pemanggil via channel
//     terpisah yang didokumentasikan (mis. header/action arg khusus)>;
//   if (!timingSafeEqual(presented, token)) → reject + log.
//   Token dapat di-rotasi tanpa deploy ulang (secret environment);
//   token yang bocor dicabut dengan mengganti secret.
//   Kelemahan yang dinyatakan: token adalah bearer secret — bila
//   bocor, siapa pun yang memegangnya dapat menambah katalog;
//   mitigasi: rotasi berkala + daftar pemanggil yang didokumentasikan
//   (hanya "scheduled auto-discovery job" yang didokumentasikan
//   sebagai pemanggil yang dimaksud, v2.3.9) + log setiap pemakaian.
```

**Opsi C — Nonaktifkan `addProject` (DEFAULT bila tidak ada keputusan).**
```ts
// Pseudodiff:
//   addProject: defineAction({ ..., handler: async () => {
//     throw new Error("addProject disabled — no authorized mechanism proven (F-005)");
//   }})
//   // ATAU: hapus action dari daftar export sampai Opsi A/B terbukti.
//   Katalog hanya berubah via migrasi seed yang ditinjau (seperti
//   0004) — bukan via action runtime.
// Kelemahan yang dinyatakan: penambahan katalog menjadi manual
// (via migrasi + review); itu HARGA yang diterima sampai mekanisme
// otorisasi terbukti — lebih aman daripada action tanpa auth.
```

**Provenance (berlaku untuk Opsi A/B; Opsi C tidak memerlukan).**
```ts
// addProject(): SEBELUM insert, tolak bila salah satu kosong:
//   - provenance_source_url: URL resmi — HARUS lolos fetchGuarded
//     (§1) sebagai URL yang dapat dijangkau (bukan sekadar string);
//   - provenance_submitted_by: identitas principal (dari mekanisme,
//     BUKAN dari args);
//   - provenance_verified_by: identitas verifikator (principal yang
//     sama atau principal kedua — diputuskan owner; bila verifikator
//     = pengaju, dicatat eksplisit, bukan disembunyikan);
//   - verified_at: tanggal verifikasi (format YYYY-MM-DD, sudah ada).
// Nilai-nilai ini diisi SERVER, bukan disalin dari args.
```

**checkLink — pemisahan jalur mutasi (semua opsi).**
```ts
// checkLink handler TETAP publik untuk pemeriksaan, tetapi:
//   - handler checkLink TIDAK BOLEH memanggil addProject / INSERT
//     katalog (pemisahan dinyatakan di dokumentasi action +
//     ditegakkan oleh tidak adanya import/panggilan);
//   - hasil checkLink (tabel `checks`) memakai owner_user_id =
//     principal pemanggil BILA mekanisme Opsi A/B aktif; bila Opsi C
//     (tanpa auth), riwayat check adalah publik-baca seperti sekarang
//     dan TIDAK BOLEH dipakai sebagai bukti kepemilikan katalog.
```

### 5.4 Threat model

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Pemanggil anonim | Memanggil `addProject` langsung (action ter-publish) | Menambah / mengubah katalog tanpa otorisasi; memalsukan provenance (`verified_at`/`verified_note` karangan) |
| Pemanggil anonim | Memanggil `checkLink` | Memakai `checkLink` sebagai jalur mutasi katalog (tambah proyek via hasil check) |
| Pemanggil lintas tenant | Token/principal tenant lain (bila Opsi A/B) | Menambah katalog atas nama tenant lain; membaca riwayat tenant lain |
| Pemegang token bocor (Opsi B) | Token service yang bocor | Memakai token selamanya (rotasi + pencabutan harus ada); memakai token tanpa jejak log |

### 5.5 Matriks tes — H-AUTH-01..03 (ada) + H-AUTH-04..06 (baru)

H-AUTH-01..03 tetap berlaku (tanpa otorisasi → ditolak + tercatat;
terotorisasi → diterima + provenance lengkap; terotorisasi tanpa
provenance → ditolak).

| ID | Kasus (BARU) | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-AUTH-04 | Lintas tenant: principal A menambah, principal B membaca | Dua principal (Opsi A/B); A menambah proyek, B memanggil `listProjects` | B TIDAK melihat baris A (bukan "dilarang" — tidak ditemukan); A melihat barisnya | B melihat / mengubah / menghapus baris A |
| H-AUTH-05 | Provenance palsu: caller memasok `verified_note` karangan | Panggilan terotorisasi dengan `verified_note` = "diverifikasi tim resmi" di args | Server MENOLAK atau MENIMPA dengan provenance yang diisi server (nilai args tidak pernah tersimpan verbatim) | Nilai karangan tersimpan di DB |
| H-AUTH-06 | Rotasi token (Opsi B) / pencabutan | Token lama di-rotasi; panggilan dengan token lama | Token lama DITOLAK + tercatat; token baru diterima | Token lama masih diterima setelah rotasi |

**Kriteria penerimaan F-005:** keputusan otorisasi cocok dengan
kebijakan yang didokumentasikan pada tiap kasus (H-AUTH-01..06),
di staging; mekanisme yang dipilih (A/B/C) dinyatakan eksplisit
di log implementasi beserta bukti prasyaratnya (untuk Opsi A:
pernyataan tertulis provider; untuk Opsi B: prosedur rotasi;
untuk Opsi C: tidak ada prasyarat bukti).

### 5.6 Dependensi staging, rollback, risiko tersisa

- **Dependensi staging:** G-C (pernyataan provider — prasyarat
  Opsi A), K-4 (pilihan mekanisme), STAGE-P01..P12, prosedur
  rotasi token (Opsi B) atau daftar admin (Opsi A).
- **Rollback:** Opsi A/B → kembali ke Opsi C (nonaktifkan action,
  satu commit); Opsi C → tidak ada yang di-rollback (sudah
  nonaktif). Migrasi kolom provenance di-rollback bersama migrasi
  §4 (down migration 0006).
- **Risiko tersisa:** Opsi A gugur tanpa pernyataan provider
  (risiko utama — jangan implementasikan dengan asumsi); Opsi B
  bearer-secret (bocor = akses penuh sampai rotasi); Opsi C
  katalog manual (biaya operasional); `ctx.viewer` TIDAK PERNAH
  dipakai sebagai principal tanpa bukti (a)+(b).

---

## §6. Urutan implementasi + dependensi staging + kriteria penerimaan keseluruhan

**Urutan (satu change set per langkah; tiap langkah membawa tesnya;
langkah berikutnya dimulai hanya bila langkah ini PASS di staging):**

| Langkah | Change set | Prasyarat | Tes |
| --- | --- | --- | --- |
| 1 | F-001 guard (`ssrf-guard.ts` + `fetchTextOnce` + RDAP + script same-origin) | K-1 (cache), K-2 (cap untuk §2 bila digabung — bila tidak, §2 terpisah), STAGE-P01 (pinning terbukti), STAGE-P03 (egress) | H-SSRF-01..26 |
| 2 | F-002 streamed caps + aggregate (di atas langkah 1) | K-2 (angka cap), G-H (harness terkoreksi), STAGE-P01 (perilaku dekompresi kanonik) | H-RES-01..03 + 07..10 |
| 3 | F-003 deadline/cancellation/concurrency (di atas langkah 1–2) | K-3 (toleransi), varian lease diputuskan (§3.3) | H-RES-04..06 + 11..12 |
| 4 | F-004 + F-018 migrasi 0006 (independen dari langkah 1–3 — dapat jalan paralel bila staging DB tersedia) | K-5 (cabang shared), K-6 (OWNER_USER_ID), G-C, backup katalog | H-CAT-01..06 + H-TEN-01..07 |
| 5 | F-005 mekanisme auth + provenance (di atas langkah 4) | K-4 (opsi A/B/C), G-C bila Opsi A, prosedur rotasi bila Opsi B | H-AUTH-01..06 |

**Kriteria penerimaan keseluruhan (reviewer dapat menilai tanpa
menebak):** setiap finding dinyatakan CLOSED hanya bila (a) semua
kasus tes pada matriksnya PASS di staging dengan log mentah +
manifest; (b) migrasi/rollback (bila ada) dieksekusi di staging
dan di-rollback sekali sebagai bukti; (c) keputusan K-1..K-6 yang
relevan tercatat dengan nama pengambil keputusan + tanggal; (d)
review independen (ChatGPT) atas implementasi — bukan hanya atas
desain — menyatakan temuan itu addressed. Bila satu syarat tidak
terpenuhi, finding tetap OPEN/BLOCKED.

---

## §7. Daftar keputusan owner (checklist — belum ada yang diputuskan)

- [ ] K-1 — Cabang cache F-022 (G-F): hapus cache dari jalur security-scan (rekomendasi) vs pertahankan dengan key `url + cap + policy-version`.
- [ ] K-2 — Nilai cap F-002: terima 400.000/300.000 compressed + decompressed yang sama + aggregate 1.000.000 decoded, atau tetapkan angka lain.
- [ ] K-3 — Toleransi deadline F-003: terima 30 detik +2 detik toleransi staging.
- [ ] K-4 — Mekanisme otorisasi F-005: Opsi A (butuh pernyataan provider) / Opsi B (service token + rotasi) / Opsi C (nonaktifkan — default).
- [ ] K-5 — Tenancy F-018 (G-C): DB diperlakukan shared (default) vs provider menyatakan per-user tertulis.
- [ ] K-6 — OWNER_USER_ID untuk backfill migrasi 0006 (nilai + siapa yang memasoknya).
- [ ] G-A — Scope perubahan source (F-020): otorisasi tahap (b) untuk change set §6 — BELUM diberikan; proposal ini BUKAN otorisasi itu.

---

## §8. Status akhir — F-001..F-005 TETAP OPEN/BLOCKED

Proposal ini **implementation-ready** dalam arti V12 §10 butir 4:
reviewer dapat menilai setiap finding tanpa menebak perilaku atau
tes yang belum didefinisikan (file/fungsi/baris terverifikasi,
pseudodiff, threat model, matriks tes dengan hasil yang
diharapkan, migrasi/rollback, dependensi staging, risiko tersisa —
semuanya ada di atas). Namun:

- **F-001, F-002, F-003, F-004, F-005 tetap OPEN/BLOCKED.**
  Tidak satu pun dinyatakan closed, partially addressed sebagai
  penutupan, atau "siap deploy". Yang berubah: dari "desain
  selesai, proposal belum ditulis" (v2.3.18) menjadi "proposal
  implementation-ready tersedia untuk ditinjau" (v2.3.19).
- Implementasi (tahap b) tetap membutuhkan otorisasi eksplisit
  terpisah dari owner (G-A) DAN bukti staging yang dipersyaratkan
  (STAGE-P01..P12) DAN review independen atas implementasi itu
  sendiri. Proposal ini bukan otorisasi itu.
- `checkLink` TIDAK di-invoke untuk proposal ini. Link Scanner
  tetap nonaktif. Tidak ada perubahan source aplikasi, DB,
  package/lockfile, workflow CI, deployment, atau live artifact.
