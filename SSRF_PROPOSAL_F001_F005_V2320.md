# Proposal Remediasi Implementation-Ready F-001..F-005 — v2.3.20

**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**
**Tanggal:** 2026-11-08 (WIB)
**Menjawab:** audit independen V13 (`SSRF_INDEPENDENT_AUDIT_V13.md`,
commit `fe84a4b`, audit 2026-11-08 12:16–12:20 WIB atas v2.3.19
commit `f2f928f`) §8 butir 1–8 — F-038, F-039, F-040, F-041, F-042,
F-043, traceability, dan hard gates.
**Dokumen sebelumnya:** `SSRF_PROPOSAL_F001_F005_V2319.md`
(SHA-256 `7f5a0f57…`, ~58 KB) — dokumen ini adalah REVISI, bukan
pengganti penuh: bagian v2.3.19 yang TIDAK disebut di bawah tetap
berlaku penuh dan dirujuk dengan nomor bagiannya; bagian yang diubah
ditulis ulang lengkap di sini, dengan log perubahan di Lampiran A.
**Dasar desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.18 + §A + §B +
§D.4.25/§D.4.26 + §D.4.31 (baru, v2.3.20).

**Verifikasi basis (read-only, 2026-11-08):** `git diff --stat
cd96768 fe84a4b` menunjukkan TIDAK ADA perubahan pada
`site/server/src/actions.ts`, `site/server/src/schema.ts`, atau
`site/drizzle/*` antara basis v2.3.19 (`cd96768`) dan audit V13
(`fe84a4b`) — hanya dokumen audit/proposal/matriks/readiness dan
harness evidence yang berubah. Karena itu seluruh verifikasi
file/fungsi/baris v2.3.19 (§1.1, §2.1, §3.1, §4.1, §5.1) tetap
berlaku tanpa verifikasi ulang, KECUALI bila bagian di bawah
menyatakan sebaliknya. Fakta baru yang diverifikasi v2.3.20:
nilai `chain` di seed `0004` — 11 baris `'BNB Chain'`, 1+ baris
`'Robinhood Chain'`, 0 baris Solana; semua `contract_address`
non-NULL berbentuk hex EVM `0x` + 40 karakter (dengan case
campuran, mis. `0xcBe2DBBF…` vs `0xd87adb2e…`) — lihat §4.3.

**Yang TIDAK dilakukan dokumen ini:** tidak mengimplementasikan
apa pun; tidak menutup F-001..F-005 (status tetap OPEN/BLOCKED,
lihat §8); tidak mengasumsikan perilaku SDK/runtime yang belum
dibuktikan; tidak mengarang owner, staging, atau bukti runtime.

---

## §0. Cara membaca + keputusan owner yang harus ada sebelum implementasi

Pola per finding sama dengan v2.3.19 §0. Yang berubah di v2.3.20
adalah tabel keputusan — tiga keputusan v2.3.19 DIREVISI atau
DIHAPUS karena audit V13 membuktikan keduanya salah/tidak konsisten,
dan tiga keputusan baru ditambahkan:

| # | Keputusan | Status v2.3.20 | Dampak bila tidak diputuskan |
| --- | --- | --- | --- |
| K-1 | Cabang cache F-022 (G-F) | TIDAK BERUBAH (v2.3.19) | lihat v2.3.19 §0 |
| K-2 | Nilai cap F-002 | DIREVISI — angka tetap (400.000/300.000 per request, aggregate 1.000.000 decoded), tetapi yang dihitung kini L1 decoded SAJA; L0 wire TIDAK dihitung aplikasi (lihat §2.3) | Implementasi tidak dapat ditulis tanpa angka + tanpa definisi layer |
| K-3 | Total deadline F-003 | **DIREVISI: 20 detik (bukan 30 detik).** 20 detik adalah keputusan desain tercatat (§A.5, `TOTAL_TIMEOUT_MS = 20_000`, syarat cutover); 30 detik di kode mirror adalah nilai yang HARUS diubah saat implementasi, bukan keputusan. Toleransi staging +2 detik tetap | Tanpa angka tunggal, H-RES-04..06/11..12/15 tidak dapat dinilai PASS/FAIL |
| K-4 | Mekanisme otorisasi F-005 | TIDAK BERUBAH (Opsi A/B/C, default C) — diperluas: mekanisme yang dipilih sekaligus menjadi gerbang MUTASI katalog global (§4, §5) | lihat v2.3.19 §0 |
| K-5 | Tenancy F-018 (G-C) | **DIPUTUSKAN DI REVISI INI (desain): `projects` = katalog GLOBAL.** Sisa yang butuh owner/provider: ratifikasi model ini (G-C) + penyediaan service principal untuk job auto-discovery (K-9) | Bila owner menolak model global, §4 harus ditulis ulang (cabang per-tenant — lihat §4.7) |
| K-6 | OWNER_USER_ID backfill migrasi §4 | **DIHAPUS — SUPERSEDED.** Tidak ada backfill katalog ke satu owner (F-040 membuktikan itu merusak katalog global). Diganti K-9 | — |
| K-7 | Model L0 wire bytes (BARU, F-038) | Model B — transport mentah + dekompresi di aplikasi (L0 terukur); Model A — egress/infrastruktur menegakkan L0, aplikasi TIDAK mengklaim L0 (fallback bila runtime produksi tidak mendukung transport mentah). Pilih SATU sebelum implementasi; default bila owner diam: Model A (aplikasi hanya menjamin L1/L3) + egress limit tetap dipersyaratkan sebagai prasyarat staging | Tanpa pilihan, implementor dapat mengklaim L0 dari `Response.body` lagi |
| K-8 | Peta chain → tipe alamat (BARU, F-043) | Peta awal = §4.3 (EVM: BNB Chain, Ethereum, Base, Arbitrum, Polygon, opBNB, Robinhood Chain; Solana: Solana). Memperluas peta = keputusan owner + migrasi, BUKAN tebakan implementor | Tanpa peta, chain baru tidak dapat di-insert (fail-closed) atau salah dinormalisasi |
| K-9 | Service principal + trusted proxy/IP (BARU, F-040/F-041) | Identitas service principal untuk job auto-discovery + daftar trusted proxy hop + sumber IP pemanggil (lihat §3.3, §5.3). Default bila owner diam: TIDAK ADA service principal (job auto-discovery tidak jalan; katalog hanya berubah via migrasi seed yang ditinjau) | Tanpa ini, H-TEN-10/H-AUTH-07 tidak dapat diuji |

**Aturan pengikat v2.3.19 tetap berlaku** (satu change set = satu
finding; tiap change set membawa tes regresinya; satu kasus negatif
FAIL = finding tetap OPEN) **ditambah aturan baru v2.3.20:**
aturan raw log (§9) — setiap run gagal dan run ulang disimpan
sebagai file terpisah, tidak pernah ditimpa.

**Alokasi test ID baru v2.3.20** (tidak menimpa ID lama):

| Kelompok | ID baru | Untuk |
| --- | --- | --- |
| H-SSRF-27..30 | 27 empty/NODATA/NXDOMAIN/timeout; 28 jawaban campuran + malformed; 29 port non-standar; 30 late DNS result | F-042 |
| H-RES-13 | L0/L1 layer test (wire vs decoded terpisah) | F-038 |
| H-RES-14 | tryReserve aggregate, 3 reader paralel + A1/A2 | F-039 (H-RES-07 DIREVISI — lihat §2.5) |
| H-RES-15..17 | 15 deadline 20 detik; 16 global lease lintas instance; 17 spoofed X-Forwarded-For | F-041 |
| H-CAT-07..10 | 07 EVM case variants; 08 Solana case variants; 09 alamat sama lintas chain; 10 NULL/whitespace/paralel | F-043 |
| H-TEN-08..10 | 08 dua principal baca katalog global; 09 isolasi bookmark; 10 service principal job | F-040 (H-TEN-06/07 v2.3.19 SUPERSEDED) |
| H-AUTH-07 | Service principal menulis katalog; user biasa ditolak | F-040/F-005 |

---

## §1. F-001 — SSRF di checkLink (Critical) — DIREVISI F-042

### 1.1 Verifikasi current main

Tetap berlaku v2.3.19 §1.1 (tidak ada perubahan source sejak
`cd96768` — diverifikasi §0 di atas). Ditambah verifikasi baru
v2.3.20: `site/server/src/actions.ts:378` masih
`AbortSignal.timeout(30_000)` — nilai ini DIREVISI menjadi 20.000
pada implementasi (§3.3), bukan dipertahankan.

### 1.2 File list

Tetap berlaku v2.3.19 §1.2.

### 1.3 Pseudodiff — DIREVISI (F-042)

**F-001a — Resolve + validasi SEMUA jawaban (awal + tiap hop) —
DIPERBAIKI: guard empty set eksplisit.**
```ts
// ssrf-guard.ts (BARU)
export type IpVerdict = { ok: true; ip: string } | { ok: false; reason: string };

export async function resolveAll(hostname: string, signal: AbortSignal): Promise<string[]> {
  // Resolve hostname ke SEMUA jawaban A dan AAAA, mengikuti rantai
  // CNAME sampai jawaban akhir. TIDAK memakai cache antar hop.
  // TIMEOUT DNS 5 detik (§A.5, F-042): race resolver vs timer 5.000 ms.
  // Bila timer menang: resolveAll THROW { code: "dns-timeout" } —
  // hasil resolver yang datang TERLAMBAT (late result) DIABAIKAN:
  // hasilnya tidak pernah dipakai sebagai destination (generation flag;
  // dibuktikan H-SSRF-30). Resolver TIDAK BOLEH dianggap dibatalkan
  // hanya dengan AbortSignal bila API-nya tidak mendukung pembatalan
  // (SSRF_SPIKE_V21 TEST 3) — yang dibatalkan adalah PENGGUNAAN
  // hasilnya, bukan operasi resolvernya.
  // Bila runtime tidak menyediakan resolver ter-pin: GAGAL fail-closed
  // (throw) — bukan fallback ke resolve tanpa pin.
  // Resolver error (NXDOMAIN, SERVFAIL, NODATA, timeout) -> throw;
  // pemanggil (fetchGuarded) memperlakukannya sebagai DENY, bukan
  // sebagai "coba lagi tanpa guard".
}

export function validateDestination(hostname: string, ips: string[] | null | undefined): IpVerdict {
  // PERBAIKAN F-042 (v2.3.19 mengembalikan ok=true, ip=undefined
  // untuk array kosong — celah confirmed):
  if (!Array.isArray(ips)) return { ok: false, reason: "resolver-no-answer" };
  if (ips.length === 0) return { ok: false, reason: "empty-dns-result" }; // NODATA / NXDOMAIN / jawaban kosong
  for (const ip of ips) {
    if (typeof ip !== "string" || ip.length === 0)
      return { ok: false, reason: "malformed-empty-entry" };
    const v = classifyIp(ip);           // F-001b
    if (!v.ok) return { ok: false, reason: v.reason };
  }
  // ips[0] dijamin ada (guard di atas) dan sudah lolos classifyIp
  // (loop di atas). Kembalikan bentuk KANONIK hasil classifyIp,
  // bukan string mentah — untuk IPv4-mapped, ip = IPv4 hasil
  // ekstraksi (mis. ::ffff:93.184.216.34 -> 93.184.216.34).
  const first = classifyIp(ips[0]) as { ok: true; ip: string };
  return { ok: true, ip: first.ip };
}
```

**F-001b — Tolak non-global-unicast (IPv4 + IPv6).** Tetap berlaku
v2.3.19 §1.3, ditambah penegasan: `classifyIp` menerima BENTUK
KANONIK saja; bentuk non-kanonik (desimal `2130706433`, oktal,
heks, pendek `127.1`, userinfo, zone identifier `%...`) DITOLAK
sebelum klasifikasi — tidak pernah di-normalisasi diam-diam lalu
dipakai. IPv4-mapped diekstrak lalu diklasifikasi sebagai IPv4
(mapped publik → ok dengan IP hasil ekstraksi; mapped loopback →
deny). Daftar registry lengkap tetap §A.4.

**F-001c — Pin destination ke koneksi (anti DNS rebinding) —
DITAMBAH: port policy + tanpa fallback.**
```ts
// fetchGuarded(url, opts): untuk SETIAP request (awal + tiap hop):
//   0. checkPort(url) — BARU dipetakan eksplisit (F-042):
//        scheme http  -> port kosong atau 80; selain itu DENY.
//        scheme https -> port kosong atau 443; selain itu DENY.
//        scheme lain  -> DENY. userinfo -> DENY.
//        Port 80/443 saja adalah keputusan pemilik v2 (§A.5) —
//        revisi kebijakan port HANYA dengan keputusan owner.
//   1. host = canonicalizeHost(url) — seperti v2.3.19.
//   2. ips = await resolveAll(host) — timeout DNS 5 detik, late
//      result diabaikan (lihat F-001a); v = validateDestination(host, ips);
//      bila tidak ok -> return null (fetch DITOLAK; tidak ada koneksi).
//   3. Koneksi DIBUKA ke alamat yang sudah divalidasi (pinning) —
//      seperti v2.3.19 (Pendekatan 1 / 2; bila runtime tidak
//      mendukung keduanya: implementasi DIBLOKIR).
//   4. Redirect: seperti v2.3.19; hop BERIKUTNYA mengulang langkah
//      0–3 PENUH (termasuk checkPort + resolveAll + validateDestination).
//   LARANGAN KERAS (F-042): bila destination pin TIDAK tersedia
//   (guard deny / resolve gagal / timeout / empty set), TIDAK ADA
//   fallback ke fetch biasa. Jalur fallback apa pun (fetch tanpa
//   guard, resolve ulang tanpa validasi, "coba IP pertama saja")
//   adalah pelanggaran desain — H-SSRF-27..30 menguji ketiadaannya
//   (stub koneksi mencatat 0 panggilan saat guard deny).
```

**F-001d — `fetchTextOnce()` ditulis ulang.** Tetap berlaku
v2.3.19 §1.3, dengan `readCappedStream` yang direvisi (§2.3)
dan catatan baru: `await fetch(...)` dan `await reader.cancel()`
HARUS berada di dalam try/catch dengan AbortError ditangkap
sebagai "aborted" (temuan evidence v2.3.20 — lihat §2.3 catatan
implementasi; `reader.cancel()` tanpa await pada stream yang
sudah di-abort me-reject AbortError menjadi unhandled rejection).

**F-001e — Script same-origin saja.** Tetap berlaku v2.3.19 §1.3.

**F-001f — RDAP fetch lewat guard.** Tetap berlaku v2.3.19 §1.3.

### 1.4 Threat model

Tetap berlaku v2.3.19 §1.4, ditambah dua baris:

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Pemilik situs target / operator DNS | Menjawab NODATA / NXDOMAIN / timeout / jawaban kosong; menjawab lambat (setelah deadline) | Guard menghasilkan `ok=true` dengan IP undefined/kosong; hasil DNS telat dipakai sebagai destination setelah timeout |
| Pemilik situs target | Menyajikan URL di port non-standar (81/8080/8443) pada host publik | Fetch ke layanan publik di port non-standar yang sebelumnya dilarang desain |

### 1.5 Matriks tes — H-SSRF-01..26 (ada) + H-SSRF-27..30 (BARU)

H-SSRF-01..26 tetap berlaku penuh (v2.3.19 §1.5). Bukti VM untuk
logika guard yang diperbaiki sudah ada: `evidence/v2320/
test-f042-guard-v2320.ts` (log `test-f042-guard-v2320.txt`, 47
assert PASS, Bun 1.4.4, 2026-11-08 12:54:41 WIB) — bukti VM atas
CERMIN pseudodiff, BUKAN atas implementasi aplikasi (implementasi
belum ada; tes staging H-SSRF-27..30 di bawah tetap wajib).

| ID | Kasus (BARU) | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-SSRF-27 | DNS empty / NODATA / NXDOMAIN / timeout | Stub resolver: (a) jawaban kosong, (b) NODATA, (c) NXDOMAIN, (d) tidak menjawab 5 detik | Keempatnya DENY fail-closed; stub koneksi mencatat 0 koneksi; tidak ada fallback ke fetch biasa | Satu pun menghasilkan fetch / koneksi / `ip=undefined` |
| H-SSRF-28 | Jawaban campuran + malformed | (a) A publik + AAAA internal; (b) jawaban berisi string malformed; (c) jawaban berisi entri kosong | Ketiganya DENY (tolak-set + malformed); 0 koneksi | Satu pun lolos karena satu jawaban publik |
| H-SSRF-29 | Port non-standar | URL publik di port 81, 8080, 8443, 22; plus 443-di-http dan 80-di-https | Semua DENY sebelum resolve/koneksi; port 80/443 pada skema yang benar tetap lolos | Satu pun port non-standar di-fetch |
| H-SSRF-30 | Late DNS result | Resolver menjawab VALID setelah 6 detik (melewati timeout 5 detik); server target mencatat koneksi | DENY timeout; jawaban telat diabaikan — 0 koneksi ke IP jawaban telat, walau IP-nya publik | Koneksi ke IP dari jawaban telat |

**Kriteria penerimaan F-001 (diperbarui):** H-SSRF-01..30 SEMUA
PASS pada implementasi tahap (b), di staging, dengan log mentah +
manifest. Satu kasus FAIL = F-001 tetap OPEN.

### 1.6 Dependensi staging, rollback, risiko tersisa

Tetap berlaku v2.3.19 §1.6, ditambah: dependensi baru STAGE-P03
(topologi egress — prefix NAT64/DNS64 dinyatakan) tetap; risiko
baru **U-84** (F-042 — resolver runtime produksi mungkin tidak
mendukung timeout/late-result semantics yang dirancang; bila
terbukti, guard harus memakai resolver dengan timeout eksplisit
di lapisan aplikasi, bukan mengandalkan AbortSignal).

---

## §2. F-002 — Cap setelah buffering (High) — DIREVISI F-038 + F-039

### 2.1 Verifikasi current main

Tetap berlaku v2.3.19 §2.1, ditambah bukti baru v2.3.20:
eksperimen VM `evidence/v2320/test-f038-layers-v2320.ts` (Bun
1.4.4, 2026-11-08 12:54:41 WIB) membuktikan pada runtime yang
sama dengan yang dirujuk desain (Bun 1.4.4) bahwa chunk
`Response.body` berjumlah 500.000 byte untuk fixture gzip 520
byte wire → 500.000 byte decoded, dan `fetch()` dengan header
`Accept-Encoding: identity` TETAP mendekompresi (500.000 byte,
bukan gzip magic). Artinya klaim v2.3.19 §2.3 bahwa satu chunk
dapat dihitung sebagai compressed DAN decoded sekaligus adalah
SALAH secara empiris, bukan hanya secara teori.

### 2.2 File list

Tetap berlaku v2.3.19 §2.2, ditambah:

| File | Perubahan |
| --- | --- |
| `site/server/src/ssrf-guard.ts` (BARU, sama dengan §1) | `readCappedStream()` ditulis ulang (§2.3): pembaca RAW + dekompresi aplikasi; `tryReserve()` + `ScanBudget` dengan A1/A2 terpisah |
| `site/server/src/actions.ts` | `analyze()`: script dibaca SERIAL (satu reader aktif) — lihat §2.3 keputusan serialisasi |

### 2.3 Pseudodiff — DITULIS ULANG (F-038 + F-039)

**Tiga lapisan byte — DEFINISI BARU yang mengikat (menggantikan
v2.3.19 §2.3 yang salah):**

| Lapisan | Arti | Diukur di mana | Dijamin oleh |
| --- | --- | --- | --- |
| L0 | Wire/encoded bytes — byte mentah off the wire, SEBELUM dekompresi | Transport mentah (Model B) ATAU egress/infrastruktur (Model A) | Model B: aplikasi (transport mentah + dekompresi aplikasi). Model A: provider/egress — aplikasi TIDAK mengklaim L0 |
| L1 | Decoded-body bytes per request — byte HASIL dekompresi yang diterima aplikasi | `readCappedStream`, pada byte hasil dekompresi | Aplikasi — SELALU (kedua model) |
| L3 | Aggregate decoded bytes per scan (page + redirect + script) | `ScanBudget` bersama (§2.3, tryReserve) | Aplikasi — SELALU (kedua model) |

**Aturan yang mengikat:**
1. SATU chunk TIDAK PERNAH dihitung sebagai L0 dan L1 sekaligus.
2. `Response.body` Bun HANYA menghasilkan L1. Siapa pun yang
   menghitung `chunk.length` dari `Response.body` sebagai L0
   mengklaim wire = decoded — SALAH ~962x pada fixture uji
   (520 byte wire → 500.000 byte decoded).
3. `Content-Length` DILARANG sebagai oracle (tetap, v2.3.19);
   hanya boleh menjadi sinyal awal yang tidak dipercaya.
4. Bila Model B dipilih dan runtime produksi ternyata TIDAK
   mendukung transport mentah (STAGE-P01 FAIL): implementasi
   DIBLOKIR sampai Model A terbukti (egress limit + bukti
   konfigurasi/metrik staging) — jangan lanjut dengan klaim L0
   dari `Response.body`.

**Model B — transport mentah + dekompresi di aplikasi (REKOMENDASI
v2.3.20; butuh keputusan K-7):**
```ts
// fetchGuarded() — jalur fetch halaman/script/RDAP:
//   1. Buka koneksi via transport MENTAH (Node `http`/`https` Agent
//      dengan `lookup` ter-pin seperti Pendekatan 1 §1.3, atau
//      `Bun.connect` literal — yang TERBUKTI di spike v2):
//      - Minta `Accept-Encoding: identity` DAN jangan biarkan
//        runtime mendekompresi: transport mentah menyerahkan byte
//        persis seperti di wire (bila server tetap mengirim
//        Content-Encoding: gzip, byte itu TETAP gzip — tidak
//        didekompresi transport).
//      - Bila transport ternyata mendekompresi (perilaku runtime
//        tidak sesuai asumsi): implementasi DIBLOKIR — jangan klaim
//        L0 (lihat H-RES-13).
//   2. readCappedStream(rawStream, decompressor, opts):
//        wireBytes += rawChunk.length;            // L0 — RAW chunk
//        if (wireBytes > compressedCap) -> abort (L0 terlampaui)
//        decodedChunk = decompressor.push(rawChunk);
//        decodedBytes += decodedChunk.length;     // L1 — HASIL dekompresi
//        if (!budget.tryReserve(decodedChunk.length)) -> abort semua
//        if (decodedBytes > decompressedCap) -> abort (L1 terlampaui)
//      Dekompresi dilakukan aplikasi via streaming decompressor
//      (mis. DecompressionStream / zlib — pilihan runtime diputuskan
//      saat implementasi dan diuji H-RES-08); decompressor TIDAK BOLEH
//      mem-buffer seluruh output sebelum penghitung berjalan.
//   3. Bila server mengirim identitas tanpa kompresi:
//      wireBytes == decodedBytes per chunk — kedua penghitung tetap
//      berjalan terpisah (nilainya boleh sama; layer-nya tetap beda).
```

**Model A — egress/infrastruktur menegakkan L0 (FALLBACK bila
Model B tidak didukung runtime produksi):**
```ts
//   - Aplikasi HANYA mengukur + menegakkan L1 (per request) dan
//     L3 (aggregate) dari Response.body — dan MENYATAKAN eksplisit
//     di dokumentasi + log bahwa L0 TIDAK dijamin aplikasi.
//   - L0 ditegakkan oleh egress policy/infrastruktur (mis. batas
//     bandwidth per egress / per pemeriksaan) — prasyarat staging:
//     konfigurasi egress + metriknya HARUS tersedia sebagai bukti
//     (STAGE-P03; owner egress UNASSIGNED — lihat STAGING_READINESS_V2320).
//   - Tanpa bukti egress tersebut, Model A TIDAK memenuhi F-002:
//     gzip bomb tetap dapat membanjiri transport/dekompresi sebelum
//     L1 abort — risiko ini dicatat sebagai U-78 (bukan disembunyikan).
```

**tryReserve + A1/A2 — PERBAIKAN F-039 (menggantikan pseudodiff
v2.3.19 §2.3):**
```ts
// ssrf-guard.ts — ScanBudget (SATU per pemeriksaan, dibagikan page +
// semua redirect + semua script; satu AbortController bersama):
export type ScanBudget = {
  aggregateDecodedCap: number;   // 1.000.000 (K-2)
  aggregateDecodedUsed: number;  // A1 — accepted/retained bytes SAJA
  abort: AbortController;        // dibagikan semua fetch + reader
  // A2 (transient/in-flight) TIDAK disimpan di sini sebagai counter
  // yang dijumlahkan — A2 dihitung sebagai BATAS RUMUS (di bawah),
  // bukan sebagai angka yang diakumulasi.
};

// tryReserve — SYNCHRONOUS check-and-reserve, dipanggil SEBELUM
// chunk di-append ke accumulator aplikasi. TIDAK PERNAH async
// (bila async, dua reader dapat lolos cek yang sama sebelum satu
// pun meng-update counter — itulah race yang dibuktikan F-039).
export function tryReserve(budget: ScanBudget, n: number): boolean {
  if (budget.abort.signal.aborted) return false;
  if (budget.aggregateDecodedUsed + n > budget.aggregateDecodedCap) {
    budget.abort.abort(); // batalkan SEMUA reader + fetch
    return false;
  }
  budget.aggregateDecodedUsed += n;
  return true;
}

// readCappedStream — loop per chunk (DIREVISI):
//   for tiap decodedChunk dari decompressor:
//     if (budget.abort.signal.aborted) break;   // cek SEBELUM append
//     if (!tryReserve(budget, decodedChunk.length)) break; // tolak: buang chunk
//     accumulator.append(decodedChunk);          // HANYA sesudah reserve lolos
//   saat keluar karena abort/cap: BUANG seluruh hasil parsial;
//   JANGAN kembalikan { text: <parsial>, truncated: true } sebagai
//   hasil yang dapat dipakai scoring — kembalikan "tidak bisa dinilai"
//   (v2.3.19 §3.3 F-003b; hasil parsial bukan verdict tepercaya).
```

**Definisi A1 vs A2 (mengikat, F-039):**
- **A1 — accepted/retained bytes:** byte yang lolos `tryReserve`
  dan di-append ke accumulator aplikasi. **Dijamin keras:
  A1 ≤ aggregateDecodedCap (1.000.000) pada setiap saat, berapa
  pun jumlah reader** — dibuktikan simulasi lockstep
  `evidence/v2320/test-f039-tryreserve-v2320.ts` bagian 1:
  A1 = 989.824 (paralel) / tepat 1.000.000 (serial), tidak pernah
  melewati cap.
- **A2 — transient/in-flight bytes:** byte yang sudah diserahkan
  runtime ke callback reader tetapi belum diputuskan
  (reserve/append/discard). **Batas rumus: A2 ≤ R × C_max**,
  dengan R = jumlah reader aktif dan C_max = ukuran chunk terbesar
  yang diserahkan runtime dalam satu read. C_max TIDAK dijamin
  kecil oleh runtime: bukti f024 mencatat chunk pertama hingga
  393.110 byte; probe v2.3.20 mencatat 483.616 byte dalam satu run
  dan 16.384 byte pada run lain. Karena itu batas A2 dinyatakan
  sebagai rumus + C_max TERUKUR per deployment — BUKAN angka
  mutlak, dan TIDAK PERNAH diklaim sebagai "cap + satu chunk"
  untuk multi-reader (klaim v2.3.19 itu SALAH: simulasi lockstep
  membuktikan logika lama overshoot 186.432 byte = 3 chunk).
- **Keputusan serialisasi (F-039): script dibaca SERIAL, satu
  reader aktif (R = 1).** Alasan terukur: dengan R = 1, batas A2
  menjadi **A2 ≤ 1 × C_max** — satu chunk saja, berapa pun C_max.
  Trade-off latensi TERUKUR pada jaringan lokal
  (`test-f039-tryreserve-v2320.txt`): paralel 19–22 ms vs serial
  25–28 ms pada fixture 400k + 3×300k — selisih ~6 ms, keduanya
  jauh di bawah deadline total 20 detik (§3.3). Page tetap dibaca
  dulu sendiri; ketiga script menyusul satu per satu; deadline
  total tetap membatasi keseluruhan. Alternatif paralel (R = 3,
  A2 ≤ 3 × C_max) DITOLAK untuk desain ini — bukan karena tidak
  bisa jalan, melainkan karena batasnya bergantung pada C_max
  runtime yang tidak dijamin, sementara serialisasi menghilangkan
  ketergantungan itu dengan biaya latensi ~6 ms yang terukur.
  Bila staging membuktikan C_max kecil + stabil pada runtime
  kanonik, paralel dapat diusulkan kembali — dengan bukti, bukan
  dengan asumsi.

**Catatan implementasi — AbortError wajib ditangkap (temuan
evidence v2.3.20):** `await fetch(...)` dan
`await reader.cancel()` HARUS berada di dalam try/catch dan
AbortError diperlakukan sebagai "aborted" (bukan error).
`reader.cancel()` pada stream yang sudah di-abort me-reject
AbortError; bila dipanggil tanpa await di `finally`, rejection
itu menjadi UNHANDLED — Bun mencetak stack trace tetapi tetap
exit 0 (false green pada log bukti; run pertama
`test-f039-tryreserve-v2320-run1-noisy.txt` menunjukkan tepat 3
unhandled AbortError, satu per reader paralel). Tes regresi
v2.3.20 kini menggagalkan diri sendiri bila ada satu pun
unhandled rejection.

```diff
 // fetchTextOnce(): baris ~201 — DIREVISI
-  const text = (await res.text()).slice(0, cap);
+  // Model B: body mentah + dekompresi aplikasi (lihat atas).
+  // Model A: Response.body + hanya penghitung L1/L3 (L0 dinyatakan TIDAK dijamin).
+  const { text } = await readCappedStream(guarded.rawBody ?? res.body, {
+    compressedCap: cap, decompressedCap: cap, budget: <ScanBudget pemeriksaan> });
+  // redirect response: JANGAN panggil res.text()/readCappedStream —
+  // body redirect di-discard tanpa dibaca (cancel stream; await cancel
+  // di dalam try/catch — lihat catatan AbortError di atas).

 // analyze(): satu ScanBudget per pemeriksaan, dibagikan ke page +
 // semua redirect + semua script (SERIAL untuk script); sinyal batal
 // yang sama dipakai fetchGuarded (§1) dan readCappedStream (§2).
```

### 2.4 Threat model

Tetap berlaku v2.3.19 §2.4, ditambah:

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Pemilik situs target | Gzip bomb + 3 script paralel dengan chunk besar yang tiba berdekatan | A1 melewati aggregate cap; overshoot transient lebih dari 1 × C_max (desain serial) |
| Pemilik situs target | Content-Encoding menipu / `Content-Length` kecil palsu | L0 diklaim dari `Response.body`; `Content-Length` dipakai sebagai oracle |
| Runtime | Mende-kompresi di luar jangkauan penghitung (Model B gagal) | Implementasi lanjut dengan klaim L0 palsu — harus BLOCKED atau jatuh ke Model A dengan pernyataan eksplisit |

### 2.5 Matriks tes — H-RES-01..03 (ada) + H-RES-07 DIREVISI + H-RES-13/14 (BARU)

H-RES-01..03 tetap berlaku (v2.3.19 §2.5). **H-RES-07 DIREVISI
(v2.3.19 SALAH — diganti, bukan dipertahankan):**

| ID | Kasus | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-RES-07 (REVISI) | Aggregate SERIAL: page 400k + 3 script 300k (total decoded 1.300k) | Server uji menyajikan body tepat di cap per-request; script dibaca SERIAL | Pemeriksaan BERHENTI saat aggregate mencapai 1.000.000 decoded byte; A1 ≤ 1.000.000 setiap saat; script ke-3 tidak dibaca penuh; hasil parsial dibuang (tidak bisa dinilai, bukan crash) | A1 > 1.000.000 pada satu pun titik; hasil parsial dipakai sebagai verdict |
| H-RES-08..10 | Tetap berlaku (v2.3.19 §2.5) — dengan catatan: H-RES-08 (gzip bomb via redirect) kini menguji L1 abort pada decompressed cap DAN L0 abort pada wire cap (Model B) atau pernyataan L0-tidak-dijamin (Model A) | — | — | — |
| H-RES-13 (BARU) | L0/L1 layer test | Fixture dengan wire length dan decoded length DIKETAHUI (mis. gzip 520 byte → 500.000 byte) | Counter L0 = 520 (Model B) ATAU dokumen + bukti egress menyatakan L0 tidak dijamin aplikasi (Model A); counter L1 = 500.000; keduanya berasal dari layer berbeda (bukti konfigurasi/metrik, bukan klaim) | Satu chunk dihitung sebagai L0 dan L1; L0 diklaim dari `Response.body`; Model A tanpa bukti egress |
| H-RES-14 (BARU) | tryReserve aggregate, 3 reader paralel + A1/A2 | Tiga script lambat/paralel dengan chunk besar yang tiba berdekatan (atau simulasi lockstep seperti evidence v2320) | A1 ≤ aggregate cap pada setiap titik ukur; A2 terukur dan dilaporkan sebagai R × C_max (serial: 1 × C_max); waktu pembatalan tiap reader tercatat; tidak ada append setelah abort | A1 > cap; A2 diklaim "satu chunk" untuk multi-reader; append setelah abort |

Bukti VM untuk H-RES-13/14 sudah ada: `evidence/v2320/
test-f038-layers-v2320.txt` (8 assert PASS) dan
`test-f039-tryreserve-v2320.txt` (23 assert PASS) — bukti VM atas
MEKANISME, bukan atas implementasi aplikasi; tes staging
H-RES-13/14 di atas tetap wajib.

**Kriteria penerimaan F-002 (diperbarui):** byte yang di-buffer
(A1) tidak pernah melebihi cap pada H-RES-01..03 + H-RES-07
(revisi) + H-RES-08..10 + H-RES-13/14, di staging; A2 dilaporkan
sebagai rumus R × C_max dengan C_max terukur staging.

### 2.6 Dependensi staging, rollback, risiko tersisa

Tetap berlaku v2.3.19 §2.6, ditambah:
- **Dependensi staging:** STAGE-P01 (transport mentah didukung
  runtime produksi — Model B; bila FAIL, Model A + bukti egress
  STAGE-P03), STAGE-P03 (egress limit + metrik — Model A).
- **Risiko tersisa:** **U-78** (F-038 — egress limit L0 masih
  UNASSIGNED; Model A tidak memenuhi F-002 tanpa buktinya);
  **U-79** (F-039 — C_max deployment-dependent; batas A2
  paralel bergantung pada runtime kanonik 1.3.10 yang NOT
  VERIFIED); perbedaan perilaku Bun 1.3.10 vs 1.4.4 pada
  dekompresi (U-62, tetap).
- **Rollback:** seperti v2.3.19 §2.6 (revert `readCappedStream` +
  nonaktifkan `checkLink` bila cap gagal).

---

## §3. F-003 — Tanpa total deadline (High) — DIREVISI F-041

### 3.1 Verifikasi current main

Tetap berlaku v2.3.19 §3.1, dengan KOREKSI yang diikat v2.3.20:
`site/server/src/actions.ts:378` memakai
`AbortSignal.timeout(30_000)`. Nilai 30 detik itu BUKAN keputusan
owner — keputusan desain tercatat adalah **20 detik total**
(`SSRF_REMEDIATION_DESIGN.md` §A.5: "20 detik total (semua hop +
script + RDAP) — disetujui pemilik v2", syarat cutover; §B.4:
`TOTAL_TIMEOUT_MS = 20_000`, "menggantikan 30_000 di fondasi —
selaras dengan §A.5"). Proposal v2.3.19 §3.3 yang mempertahankan
30 detik dengan alasan "sudah ada di kode" adalah KESALAHAN
rekonsiliasi (audit V13 F-041) — nilai yang kebetulan ada di kode
mirror tidak menggantikan keputusan pemilik. Implementasi tahap (b)
WAJIB mengubah `30_000` → `20_000` dan menguji H-RES-15.

### 3.2 File list

Tetap berlaku v2.3.19 §3.2, dengan perubahan: varian lease
in-memory (§3.3) kini menjadi varian TERKUNCI (gated) — bukan
pilihan bebas; tabel `scan_leases` adalah default.

### 3.3 Pseudodiff — DIREVISI (F-041)

**F-003a — Satu total deadline 20 detik (DIREVISI dari 30 detik).**
```ts
// analyze(): baris 378 — UBAH nilai, beri nama + dokumentasi:
//   const deadline = AbortSignal.timeout(20_000); // TOTAL budget
//   per pemeriksaan: RDAP + page + semua redirect + semua script.
//   Nilai 20 detik = keputusan pemilik v2 (§A.5, syarat cutover) —
//   BUKAN angka baru dan BUKAN nilai 30 detik di kode mirror.
//   Perubahan 30.000 -> 20.000 adalah BAGIAN dari change set ini
//   (satu commit, satu review) — bukan "perbaikan terpisah".
//   Toleransi staging +2 detik (K-3, tetap).
//   Per-fetch 12 detik tetap sebagai batas DI DALAM anggaran total.
//   Bila owner kelak memutuskan 30 detik: keputusan itu harus
//   EKSPLISIT, tercatat dengan nama + tanggal, dan seluruh dokumen
//   (desain §A.5/§B.4, proposal §3, matriks tes H-RES-04..06/11..12/15)
//   diperbarui KONSISTEN pada revisi yang sama — tidak boleh ada
//   satu dokumen yang masih menyebut angka lain.
```

**F-003b — Cancellation budget (satu sinyal, semua fetch).**
Tetap berlaku v2.3.19 §3.3, ditambah: `await fetch(...)` dan
`await reader.cancel()` di dalam try/catch dengan AbortError
ditangkap (lihat §2.3 catatan implementasi).

**F-003c — Concurrency/rate bounds — DIREVISI: global DB lease
adalah DEFAULT; in-memory semaphore TERKUNCI.**
```ts
// checkLink handler (runCheck): SEBELUM fetch apa pun:
//   slot = acquireScanSlot();            // batas pemeriksaan bersamaan
//   if (!slot) return <429/503 fail-closed, "coba lagi">;
//   try { ...analyze()... } finally { releaseScanSlot(); }
// Batas: maks 5 pemeriksaan bersamaan (lease global §A.5.6).
// Rate limit per IP pemanggil: 10/menit, 100/jam (keputusan D-1..D-8);
// kelebihan DITOLAK fail-closed (429), bukan antre tanpa batas.
//
// MEKANISME LEASE (default — TIDAK BOLEH diganti tanpa gate):
//   Tabel `scan_leases` di DB (§A.7.3) — acquire atomik (hitung lease
//   hidup < 5 -> INSERT, bila >= 5 -> tolak 429), TTL lease 25 detik,
//   release eksplisit di `finally`. Migrasi tabel ini bagian dari
//   migrasi 0006 (atau 0007, sesudah §4) — lihat §4.3.
// VARIAN TERKUNCI (in-memory semaphore per instance): HANYA boleh
//   dipakai bila DUA syarat terpenuhi sekaligus — (a) provider
//   MEMBUKTIKAN tertulis bahwa deployment adalah single-instance
//   (topologi dinyatakan di STAGE-P03), DAN (b) owner MENERIMA
//   tertulis batas per-instance (keputusan tercatat, bukan diam).
//   Bila satu syarat tidak ada: varian ini DILARANG; klaim "global"
//   atas semaphore in-memory adalah pelanggaran desain.
//   (v2.3.19 membiarkan varian ini dipilih bebas saat implementasi —
//   itu yang diperbaiki F-041.)
//
// SUMBER IP PEMANGGIL + PENOLAKAN SPOOF (BARU, F-041):
//   - Identitas pemanggil = alamat IP PEER TCP LANGSUNG yang
//     terhubung ke runtime (peer address socket), BUKAN header.
//   - Header X-Forwarded-For / X-Real-IP / Forwarded HANYA dipakai
//     bila SELURUH rantai berikut terpenuhi: (a) peer langsung ada
//     di daftar TRUSTED PROXY yang dinyatakan tertulis oleh
//     operator (STAGE-P03; daftar kosong = tidak ada proxy tepercaya);
//     (b) header divalidasi hop-per-hop dari peer tepercaya ke
//     belakang (setiap hop harus tercatat; hop yang tidak dikenal
//     -> seluruh header DIABAIKAN, bukan dipakai sebagian);
//     (c) IP hasil ekstraksi adalah IP publik yang valid (bukan
//     privat/loopback — bila privat, header DIABAIKAN).
//   - Bila peer BUKAN proxy tepercaya: SEMUA forwarding header
//     DIABAIKAN (identitas = peer address). Spoofed XFF dari
//     pemanggil langsung TIDAK PERNAH dapat menjadi identitas —
//     diuji H-RES-17.
//   - STORAGE rate limit: tabel DB (mis. `rate_limits`, key =
//     hash IP pemanggil + window) — BUKAN in-memory (multi-instance
//     harus melihat kuota yang sama). Tanpa DB, rate limit tidak
//     dapat ditegakkan global — dicatat sebagai prasyarat staging.
//   - Nilai 10/menit + 100/jam TIDAK BOLEH ditetapkan sebagai angka
//     final sebelum sumber IP + storage di atas diputuskan —
//     keduanya adalah prasyarat angka itu, bukan detail belakangan.
```

### 3.4 Threat model

Tetap berlaku v2.3.19 §3.4, ditambah:

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Pemanggil anonim | Memalsukan `X-Forwarded-For: 1.2.3.4` (atau rantai palsu) | Melewati rate limit dengan identitas palsu; memakai kuota IP lain |
| Operator multi-instance | Menjalankan 3 instance tanpa lease global | Total pemeriksaan bersamaan > 5 karena tiap instance memakai semaphore sendiri |

### 3.5 Matriks tes — H-RES-04..06 (ada) + H-RES-11..12 (ada) + H-RES-15..17 (BARU)

H-RES-04..06 + H-RES-11..12 tetap berlaku (v2.3.19 §3.5) dengan
SATU koreksi mengikat: semua penyebutan "30 detik (+2 toleransi)"
di kasus-kasus itu dibaca **20 detik (+2 toleransi)** mulai
v2.3.20. H-RES-11/12 yang sudah ditulis dengan 30 detik harus
diperbarui saat implementasi — ketidakkonsistenan angka di antara
dokumen adalah persis cacat F-041.

| ID | Kasus (BARU) | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-RES-15 | Deadline end-to-end 20 detik | Slow-drip page + script; ukur waktu total pemeriksaan | Berakhir ≤ 22 detik (20 + 2 toleransi); hasil = tidak bisa dinilai; tidak ada fetch berlanjut setelah deadline + toleransi | Berakhir > 22 detik, atau hasil parsial dipakai |
| H-RES-16 | Global lease lintas instance | 2 instance (atau 2 proses) × 10 pemeriksaan bersamaan; DB lease bersama | Total pemeriksaan berjalan di SEMUA instance ≤ 5 pada satu pun titik; kelebihan ditolak 429/503 | Total > 5; satu instance "tidak tahu" lease instance lain |
| H-RES-17 | Spoofed X-Forwarded-For | Pemanggil langsung mengirim `X-Forwarded-For` berisi IP lain (10 IP berbeda) + banjir melewati 10/menit | Rate limit dihitung dari peer address (bukan header): pemanggil diblokir setelah 10/menit walau header berganti-ganti | Satu pun request lolos karena header palsu; kuota IP lain terpakai |

**Kriteria penerimaan F-003 (diperbarui):** waktu total dan jumlah
fetch bersamaan selalu dalam anggaran yang dinyatakan (20 detik
+2 toleransi; maks 5 bersamaan GLOBAL; rate limit 10/menit,
100/jam dari peer address tepercaya), pada H-RES-04..06 +
H-RES-11..12 + H-RES-15..17, di staging.

### 3.6 Dependensi staging, rollback, risiko tersisa

Tetap berlaku v2.3.19 §3.6, ditambah:
- **Dependensi staging:** STAGE-P03 (topologi deployment +
  daftar trusted proxy + bukti single/multi-instance), tabel
  `scan_leases` + `rate_limits` di DB staging.
- **Risiko tersisa:** **U-81** (F-041 — kode mirror masih 30 detik;
  bila change set ini tidak mengubah nilainya, implementasi akan
  menguji angka yang salah); **U-85** (F-041 — daftar trusted
  proxy + storage rate limit belum ada; tanpa keduanya angka
  10/menit + 100/jam tidak dapat ditegakkan).
- **Rollback:** seperti v2.3.19 §3.6; deadline 20 detik
  DIPERTAHANKAN saat rollback (bukan kembali ke 30 detik —
  30 detik adalah nilai yang diperbaiki, bukan nilai aman).

---

## §4. F-004 + F-018 — SATU migrasi koheren — DITULIS ULANG (F-040 + F-043)

### 4.1 Verifikasi current main

Tetap berlaku v2.3.19 §4.1, ditambah verifikasi baru v2.3.20
(lihat §0): seed `0004` berisi 15 baris; `chain` hanya
`'BNB Chain'` (11 baris) dan `'Robinhood Chain'` (1 baris
terverifikasi + sisanya); TIDAK ADA baris Solana; semua
`contract_address` non-NULL berbentuk hex EVM dengan case
campuran (mis. `0xcBe2DBBF…` — mixed-case, dan
`0xd87adb2e…` — lowercase). Fakta ini yang membuat F-043
material: `lower(contract_address)` saja akan memperlakukan
dua alamat Solana berbeda huruf sebagai satu alamat — dan
katalog hari ini belum punya baris Solana, sehingga aturan
Solana harus didefinisikan SEKARANG sebelum baris pertama
tiba, bukan setelah duplikat terjadi.

**Koreksi atas v2.3.19 §4 (F-040):** migrasi 0006 v2.3.19
menambah `owner_user_id` ke `projects` + mem-backfill 15 baris
ke satu OWNER_USER_ID + memfilter SEMUA baca katalog dengan
principal — itu SALAH untuk katalog global: pada DB shared,
hanya principal yang sama dengan OWNER_USER_ID yang melihat
katalog; pengguna lain melihat katalog kosong. v2.3.19 juga
membiarkan `savedProjects` tanpa principal key (PK `projectId`
saja) — dua pengguna tidak dapat memiliki bookmark/task status
independen. Kedua cacat diperbaiki di bawah. **Keputusan model
(v2.3.20, F-040): `projects` adalah katalog GLOBAL.**

### 4.2 File list

| File | Perubahan (menggantikan v2.3.19 §4.2) |
| --- | --- |
| `site/drizzle/0006_unified_ownership_and_uniqueness.sql` (BARU — teks v2, menggantikan teks v2.3.19) | Satu migrasi: kolom `owner_user_id` HANYA di `checks`; `savedProjects` di-rework ke composite key; kolom kanonik alamat + 2 unique index (nama + alamat per chain); TIDAK ADA backfill katalog; TIDAK ADA kolom owner di `projects` (lihat §4.3) |
| `site/server/src/schema.ts` | `projects`: TIDAK tambah kolom owner; tambah definisi unique index + kolom kanonik (lihat §4.3). `checks`: tambah `ownerUserId` (nullable — NULL = pemeriksaan anonim/legacy). `savedProjects`: PK menjadi `(principalId, projectId)` + kolom `principalId` |
| `site/server/src/actions.ts` | `addProject()`: INSERT atomik + penanganan konflik DB (seperti v2.3.19, tanpa owner filter); `listProjects`: baca GLOBAL tanpa filter owner (semua principal melihat 15 baris yang sama); `deleteCheck`/`askGibran`/`setProjectState`: filter `owner_user_id = principal` (checks) / `(principal_id, project_id)` (savedProjects); `addProject` handler: gerbang otorisasi §5 (mutasi katalog hanya admin/service principal) |
| `site/server/src/ssrf-guard.ts` | TIDAK disentuh |
| Modul baru `site/server/src/catalog.ts` (BARU) | `CHAIN_ADDRESS_TYPE`, `canonicalizeContractAddress()` — SATU fungsi yang dipakai pre-check aplikasi DAN dirujuk definisi kolom kanonik DB (§4.3). Bila fungsi ini dan expression index DB berbeda hasil untuk satu pun input, migrasi GAGAL (diuji H-CAT-10) |

### 4.3 Pseudodiff — migrasi `0006` v2 (SATU migrasi koheren, menggantikan teks v2.3.19)

```sql
-- 0006_unified_ownership_and_uniqueness.sql — TEKS v2 (v2.3.20)
-- PRASYARAT (gagal bila tidak terpenuhi — migrasi TIDAK menghapus data):
--   1. PRE-CHECK duplikat (dijalankan SEBELUM ALTER apa pun) — dengan
--      ATURAN KANONIK v2 (bukan lower() mentah):
--        SELECT lower(trim(name)), count(*) FROM projects
--          GROUP BY 1 HAVING count(*) > 1;
--        SELECT chain, <canonical(contract_address)>, count(*) FROM projects
--          WHERE contract_address IS NOT NULL
--          GROUP BY 1, 2 HAVING count(*) > 1;
--      <canonical> = aturan §4.3b di bawah (EVM lower+strip-0x;
--      Solana trim saja). Bila salah satu mengembalikan baris:
--      migrasi GAGAL dengan LAPORAN (daftar duplikat) — duplikat
--      diselesaikan MANUAL dulu, bukan dihapus diam-diam.
--      CATATAN: pre-check ini DILARANG memakai lower(contract_address)
--      mentah — itu akan melaporkan "duplikat" palsu untuk dua alamat
--      Solana berbeda huruf (F-043).
--   2. TIDAK ADA parameter OWNER_USER_ID. TIDAK ADA backfill katalog.
--      K-6 v2.3.19 DIHAPUS (lihat §0).
--   3. Snapshot/backup katalog sebelum migrasi (prosedur operator;
--      15 baris saat ini — jumlah diverifikasi sebelum dan sesudah).
--      Jumlah baris HARUS tetap 15 sesudah migrasi; satu baris
--      berubah/hilang = migrasi GAGAL.

-- Langkah 1: ownership HANYA untuk checks (riwayat pemeriksaan).
--   projects TIDAK mendapat kolom owner — katalog GLOBAL (F-040).
ALTER TABLE `checks` ADD COLUMN `owner_user_id` text;
--   Baris checks yang ada: owner_user_id tetap NULL (riwayat anonim /
--   legacy — dibaca sebagai publik seperti sekarang; BUKAN diberi
--   pemilik tebakan). NULL di sini berarti "tanpa pemilik tercatat",
--   bukan "milik admin".
CREATE INDEX `checks_owner_idx` ON `checks` (`owner_user_id`);

-- Langkah 2: savedProjects — composite key per pengguna (F-040).
--   SQLite/Drizzle: PK diubah via rebuild tabel (Drizzle). Skrip
--   migrasi WAJIB memverifikasi SETELAH rebuild: jumlah baris sama
--   dengan sebelum rebuild; bila tidak sama, GAGAL.
--   Tabel baru:
--     saved_projects (
--       principal_id  text NOT NULL,
--       project_id    integer NOT NULL REFERENCES projects(id),
--       bookmarked    integer NOT NULL DEFAULT 1,
--       task_status   text NOT NULL DEFAULT 'not_started',
--       updated_at    integer NOT NULL,
--       PRIMARY KEY (principal_id, project_id)
--     )
--   Data lama dimigrasi dengan principal_id = '<LEGACY>' — SATU nilai
--   sentinel eksplisit untuk state lama yang pemiliknya tidak tercatat
--   (bukan ditebak sebagai user tertentu; sentinel ini TERDOKUMENTASI
--   dan tidak boleh dipakai sebagai principal baru — bila mekanisme
--   §5 Opsi A/B aktif, principal baru TIDAK BOLEH memakai sentinel).
--   Alasan sentinel (bukan NULL): PK composite tidak boleh NULL.
--   Bila owner memutuskan state lama harus dihapus, itu keputusan
--   terpisah — BUKAN bagian migrasi ini.

-- Langkah 3: kolom kanonik alamat + unique index (F-043).
--   3a. Peta chain -> tipe alamat (K-8; TABEL MENGIKAT):
--       EVM family (hex, case-insensitive): 'BNB Chain', 'Ethereum',
--         'Base', 'Arbitrum', 'Polygon', 'opBNB', 'Robinhood Chain'
--       Solana family (base58, case-sensitive): 'Solana'
--       Chain di luar peta -> INSERT DITOLAK (CHECK constraint di
--       bawah + pre-check aplikasi). Memperluas peta = keputusan
--       owner + migrasi, bukan tebakan implementor.
--   3b. Kanonikalisasi (SATU aturan, dipakai aplikasi DAN DB):
--       EVM: trim -> strip prefix 0x (bila ada) -> lowercase ->
--            simpan dengan prefix '0x' ('0x' + hex lowercase 40 char).
--            Validasi: tepat 40 char hex; selain itu REJECT.
--       Solana: trim SAJA (huruf TIDAK diubah). Validasi: 32..44 char
--            base58 (tanpa 0/O/I/l); selain itu REJECT.
--       NULL -> NULL (tidak masuk unique index).
--   3c. Kolom kanonik (generated, STORED — nilainya dihitung DB dari
--       aturan yang sama; aplikasi TIDAK menulis kolom ini langsung):
ALTER TABLE `projects` ADD COLUMN `contract_address_canonical` text
  GENERATED ALWAYS AS (
    CASE
      WHEN `contract_address` IS NULL THEN NULL
      WHEN `chain` = 'Solana' THEN trim(`contract_address`)
      WHEN `chain` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain') THEN
        CASE WHEN substr(trim(`contract_address`),1,2) = '0x'
             THEN '0x' || lower(substr(trim(`contract_address`),3))
             ELSE '0x' || lower(trim(`contract_address')) END
      ELSE NULL
    END
  ) STORED;
--   3d. CHECK constraint chain (fail-closed untuk chain tak dikenal):
--       (Drizzle: via definisi skema baru; skrip migrasi memverifikasi
--       `SELECT count(*) FROM projects WHERE chain NOT IN (...)` = 0
--       sebelum lanjut; bila > 0, GAGAL.)
--   3e. Unique index — DUA index terpisah (bukan composite nama+alamat):
--       (a) nama ternormalisasi: UNIQUE INDEX pada lower(trim(name))
--           (TETAP seperti v2.3.19 — nama tidak bergantung chain).
--       (b) alamat kontrak ternormalisasi PER CHAIN:
CREATE UNIQUE INDEX `projects_contract_normalized_unique`
  ON `projects` (`chain`, `contract_address_canonical`)
  WHERE `contract_address` IS NOT NULL;
--       SCOPE: global lintas tenant (konsisten F-040: katalog global;
--       dua tenant tidak dapat memiliki "proyek yang sama" sebagai
--       dua baris — katalog adalah SATU kebenaran bersama).
--       Alamat SAMA di chain BERBEDA = baris BERBEDA (diizinkan).
--       Alamat Solana beda huruf = alamat BERBEDA (diizinkan).
--       Alamat EVM beda case/prefix/whitespace = alamat SAMA (ditolak).
--       NULL tidak pernah cocok — dua proyek tanpa kontrak boleh ada.
CREATE UNIQUE INDEX `projects_name_normalized_unique`
  ON `projects` (lower(trim(`name`)));

-- Langkah 4: kolom provenance (TETAP dari v2.3.19 §5.2 — bagian dari
--   migrasi 0006 yang sama, bukan migrasi terpisah):
--   provenance_source_url, provenance_submitted_by,
--   provenance_verified_by — diisi SERVER (bukan dari args caller).

-- DOWN migration (rollback): DROP kedua unique index + kolom kanonik
--   + kolom provenance + kolom checks.owner_user_id + rebuild
--   savedProjects ke PK projectId saja (data dikembalikan ke bentuk
--   lama; principal_id sentinel dibuang BERSAMA rebuild — down
--   migration HANYA boleh dijalankan bila belum ada state per-principal
--   baru; bila sudah ada, rollback = restore dari backup langkah 0).
--   Data katalog TIDAK dihapus oleh down migration. Jumlah baris
--   katalog HARUS tetap 15 sesudah down migration.
```

```diff
 // addProject(): baris ~1197-1262 — HAPUS pola baca-semua-lalu-insert
 // (TETAP seperti v2.3.19, DITAMBAH kanonikalisasi + gerbang §5):
+  // 0. Gerbang otorisasi (§5): principal HARUS admin/service principal.
+  //    Bila bukan: reject (bukan "tidak ditemukan" — penolakan
+  //    otorisasi BOLEH eksplisit di log server; respons generik, §A.6).
+  // 1. Kanonikalisasi (SATU fungsi — catalog.ts):
+  //    addrKey = canonicalizeContractAddress(chain, contract_address)
+  //    — throw bila chain tak dikenal / alamat tidak valid (fail-closed).
+  //    nameKey = lower(trim(name)).
+  // 2. Satu INSERT atomik; konflik ditangani DB (ON CONFLICT pada
+  //    index (a)/(b) -> DO NOTHING + RETURNING kosong -> reject
+  //    "duplikat"); sort: seperti v2.3.19 (max(sort)+1 DALAM transaksi
+  //    yang sama; tiebreak (sort, id)).
+  //    INSERT TIDAK PERNAH menulis contract_address_canonical
+  //    langsung (kolom generated) dan TIDAK PERNAH menulis
+  //    owner_user_id ke projects (kolom itu TIDAK ADA).
```

```diff
 // Semua baca katalog — model GLOBAL (F-040; MENGGANTIKAN v2.3.19 §4.3):
-  listProjects / listChecks / deleteCheck / askGibran / setProjectState:
-    ... WHERE owner_user_id = <principal> ...
+  listProjects: TANPA filter owner — SEMUA principal melihat katalog
+    global yang sama (15 baris). Mutasi katalog (addProject) BUKAN
+    lewat filter baca — lewat gerbang otorisasi §5 (admin/service
+    principal saja).
+  listChecks / deleteCheck: WHERE owner_user_id = <principal>
+    OR owner_user_id IS NULL (riwayat anonim/legacy tetap terbaca
+    publik seperti sekarang; riwayat milik principal lain TIDAK
+    terlihat — bukan "dilarang", tidak ditemukan).
+  askGibran: hanya membaca checks milik principal (+ NULL legacy).
+  setProjectState / savedProjects: WHERE principal_id = <principal>
+    AND project_id = ... — state milik principal lain TIDAK PERNAH
+    terlihat/diubah (composite key menjaminnya di DB, bukan hanya
+    di filter aplikasi).
+  // Scheduled auto-discovery job: memakai SERVICE PRINCIPAL (§5,
+  //  Opsi B atau Opsi A allowlist) — BUKAN principal pengguna biasa.
+  // Job itu satu-satunya "pengguna" yang dapat menulis katalog via
+  // action; pengguna biasa membaca global, menulis HANYA state-nya
+  // sendiri (savedProjects).
```

### 4.4 Threat model

Tetap berlaku v2.3.19 §4.4, DITAMBAH + DIREVISI satu baris:

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Pemanggil lintas tenant | Mengetahui `projectId` / nama proyek tenant lain | Membaca/mengubah riwayat checks tenant lain; mengubah bookmark/task status tenant lain (composite key); MENAMBAH katalog tanpa gerbang §5 |
| Pemanggil | Alamat Solana sama beda huruf (`…LKE…` vs `…lke…`) / alamat EVM sama beda case | Lolos sebagai "proyek berbeda" (EVM) — atau sebaliknya: dua alamat Solana BERBEDA ditolak sebagai duplikat (F-043) |
| Pemanggil | Alamat sama di chain berbeda (mis. `0xAB…` di BNB Chain dan di Ethereum) | Ditolak sebagai duplikat — deployment lintas chain adalah baris berbeda yang sah |
| Operator migrasi (lama) | Menjalankan migrasi v2.3.19 (backfill satu owner) | — TIDAK BOLEH: teks migrasi v2.3.19 SUPERSEDED dan TIDAK BOLEH dijalankan; bila sudah terlanjur dijalankan di staging, rollback = restore backup (bukan down migration biasa) |

### 4.5 Matriks tes — H-CAT-01..06 (ada, diperluas) + H-TEN-01..05 (ada) + H-CAT-07..10 + H-TEN-08..10 (BARU)

H-CAT-01..03 tetap berlaku (v2.3.19 §4.5) dengan SATU koreksi:
kasus-kasusnya kini memakai aturan kanonik v2.3.20 §4.3b (EVM
strip-0x + lowercase; bukan `lower()` mentah). H-CAT-04 tetap
berlaku. H-CAT-05/06 tetap berlaku (migrasi dengan katalog
berduplikat → gagal; migrasi tanpa parameter → gagal — dengan
catatan: "tanpa OWNER_USER_ID" kini TIDAK RELEVAN karena
parameter itu tidak ada lagi; H-CAT-06 dibaca sebagai "migrasi
dengan pre-check duplikat yang gagal → gagal sebelum ALTER").
**H-TEN-06/07 v2.3.19 SUPERSEDED** — keduanya mengasumsikan
backfill OWNER_USER_ID (15 baris punya owner = parameter; down
migration mengembalikan kolom owner). Keduanya DIGANTI H-TEN-08/
H-TEN-09 di bawah. Alasan supersede dicatat di sini, bukan
dihapus diam-diam.

| ID | Kasus (BARU) | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-CAT-07 | Duplikat EVM beda case/prefix/spasi, bersamaan | 10 request alamat `0xcBe2…` / `0xCBE2…` / `cbe2…` / `" 0xcBe2… "` paralel, chain sama | Tepat 1 baris; 9 konflik (bukan 500) | >1 baris, atau satu pun 500 |
| H-CAT-08 | Solana case variants, bersamaan | 10 request alamat Solana `41Wp…LKE…` / `41wp…LKE…` (satu huruf beda) / `41Wp…PUMP` paralel | SEMUA diterima sebagai baris BERBEDA (tepat 10 baris, bila nama berbeda); tidak satu pun konflik palsu | Satu pun ditolak sebagai "duplikat" |
| H-CAT-09 | Alamat sama lintas chain | Alamat EVM yang sama di `'BNB Chain'` lalu di `'Ethereum'` | Dua baris (keduanya diterima) | Satu ditolak sebagai duplikat |
| H-CAT-10 | NULL/whitespace/paralel + kesamaan app-vs-DB | (a) 2 proyek tanpa kontrak; (b) alamat dengan spasi; (c) 10 insert paralel alamat sama; (d) bandingkan `canonicalizeContractAddress()` vs kolom generated DB untuk 50+ alamat uji | (a) 2 baris; (b) 1 baris + kanonik sama; (c) tepat 1 pemenang; (d) 100% cocok | Satu pun ketidakcocokan app-vs-DB |
| H-TEN-08 | Dua principal baca katalog global | Principal A dan B memanggil `listProjects` | KEDUANYA melihat 15 baris yang sama (katalog global); tidak ada yang melihat katalog kosong | Satu principal melihat katalog kosong / berbeda |
| H-TEN-09 | Isolasi bookmark/task status | A bookmark + tandai completed proyek X; B membaca state-nya untuk X | State B TIDAK berubah (not_started, tidak bookmark); state A tetap milik A; tidak ada baris `savedProjects` yang tertimpa | State B berubah mengikuti A |
| H-TEN-10 | Service principal job vs user biasa | Job auto-discovery (service principal) menambah proyek; user biasa mencoba menambah proyek | Job diterima (provenance terisi server); user biasa DITOLAK (bukan "tidak ditemukan" — gerbang §5) | User biasa berhasil menambah; job ditolak |

Bukti VM untuk H-CAT-07..10 sudah ada: `evidence/v2320/
test-f043-canonical-v2320.txt` (27 assert PASS — fungsi JS ==
generated column DB untuk semua baris; EVM collision; Solana
case-sensitive; lintas chain OK; NULL OK; chain tak dikenal
reject). Bukti VM atas MEKANISME, bukan atas migrasi staging —
H-CAT-07..10 di staging tetap wajib.

**Kriteria penerimaan F-004 + F-018 (diperbarui):** hitung baris di
DB setelah tiap run cocok dengan yang dinyatakan (H-CAT-01..10),
isolasi tenant terbukti dua arah (H-TEN-01..05 + H-TEN-08..10),
migrasi gagal aman pada H-CAT-05/06, katalog tetap 15 baris dan
GLOBAL (tidak ter-backfill ke satu owner), di staging.

### 4.6 Dependensi staging, rollback, risiko tersisa

Tetap berlaku v2.3.19 §4.6, DITAMBAH:
- **Dependensi staging:** STAGE-P01..P12 (DB staging + runtime
  staging), keputusan G-C (ratifikasi model global), K-9 (service
  principal), backup katalog sebelum migrasi.
- **Rollback:** down migration (§4.3) bila belum ada insert/state
  baru; bila sudah ada → restore dari backup langkah 0. Rollback
  TIDAK menghapus data katalog. **Peringatan:** teks migrasi
  v2.3.19 (backfill) TIDAK BOLEH dipakai sebagai rollback —
  rollback v2.3.20 adalah down migration teks v2, bukan migrasi v1.
- **Risiko tersisa:** **U-80** (F-040 — gerbang mutasi katalog
  global bergantung pada mekanisme F-005; bila Opsi C default
  yang dipakai, katalog hanya berubah via migrasi — itu harga
  yang diterima); **U-82** (F-043 — peta chain harus diperluas
  dengan keputusan owner tiap kali chain baru tiba; chain baru
  yang belum dipetakan DITOLAK sampai saat itu — fail-closed,
  tetapi dapat menghambat penambahan katalog yang sah);
  **U-86** (F-040 — sentinel `<LEGACY>` pada savedProjects:
  bila suatu hari ada principal yang memakai string itu,
  collision — mitigasi: sentinel didokumentasikan + principal
  baru dilarang memakai nilai itu di §5).

### 4.7 Cabang alternatif — bila owner MENOLAK model global (dicatat, bukan dikerjakan)

Bila owner memutuskan `projects` adalah katalog PER-TENANT (bukan
global), §4 harus ditulis ulang pada revisi berikutnya:
`projects` mendapat `owner_user_id` + filter baca per principal
(seperti v2.3.19 §4.3) TETAPI `savedProjects` tetap memakai
composite key `(principal_id, project_id)` (bukan diturunkan via
JOIN), unique index alamat menjadi per `(owner_user_id, chain,
canonical)` — BUKAN global, dan H-TEN-08 dibalik (A tidak boleh
melihat katalog B; tes katalog kosong menjadi perilaku yang
disetujui). Cabang ini TIDAK dikerjakan v2.3.20 karena keputusan
desain v2.3.20 adalah global (F-040) — dicatat di sini supaya
keputusan itu dapat dibalik secara terlacak, bukan diam-diam.

---

## §5. F-005 — Otorisasi addProject + tenancy scoping (Medium) — DIPERBARUI F-040

### 5.1 Verifikasi current main

Tetap berlaku v2.3.19 §5.1.

### 5.2 File list

Tetap berlaku v2.3.19 §5.2, ditambah modul baru
`site/server/src/catalog.ts` (§4.2) — gerbang otorisasi memakai
principal dari mekanisme di bawah, BUKAN dari `ctx.viewer` tanpa
bukti (tetap).

### 5.3 Pseudodiff — tiga opsi mekanisme (pilih SATU; default Opsi C) — DIPERBARUI

Prinsip yang mengikat semua opsi tetap berlaku (v2.3.19 §5.3).
Yang berubah: opsi yang dipilih sekaligus menjadi **gerbang
MUTASI katalog global** (§4.3) dan **identitas service principal**
untuk job auto-discovery (K-9). Perbedaan peran yang kini
ditegaskan eksplisit:

| Peran | Dapat membaca katalog | Dapat menambah katalog | Dapat menulis savedProjects |
| --- | --- | --- | --- |
| Pengguna biasa (principal terotentikasi) | Ya (global) | TIDAK | Ya — HANYA state miliknya sendiri |
| Admin (Opsi A allowlist) | Ya | Ya | Ya — miliknya sendiri |
| Service principal — job auto-discovery (Opsi A allowlist / Opsi B token) | Ya | Ya (satu-satunya penulis otomatis) | TIDAK (job tidak punya bookmark) |
| Anonim (tanpa principal) | Ya (baca publik) | TIDAK | TIDAK |

**Opsi A — Artifact-runtime allowlist (HANYA bila provider
menyatakan tertulis).** Tetap berlaku v2.3.19 §5.3, ditambah:
daftar admin adalah daftar eksplisit principal; service
principal job adalah entri TERPISAH di allowlist yang sama
(dengan label `service:auto-discovery` — bukan dicampur dengan
admin manusia). Prasyarat bukti (a)+(b) tetap wajib; bila tidak
ada: Opsi A GUGUR.

**Opsi B — Service token (tanpa asumsi SDK apa pun).** Tetap
berlaku v2.3.19 §5.3, ditambah: token yang dipakai job
auto-discovery adalah token SERVICE yang terpisah dari token
admin manusia bila ada (rotasi independen; pencabutan token job
tidak mematikan akses admin, dan sebaliknya). Log setiap
pemakaian token mencatat `principal_id` service + aksi
(`addProject` + nama proyek) — bukan hanya "token dipakai".

**Opsi C — Nonaktifkan `addProject` (DEFAULT bila tidak ada
keputusan).** Tetap berlaku v2.3.19 §5.3. Konsekuensi yang kini
dinyatakan eksplisit untuk model global: katalog HANYA berubah
via migrasi seed yang ditinjau (seperti 0004); job auto-discovery
TIDAK JALAN (tidak ada service principal); pengguna biasa tetap
dapat membaca katalog global dan menulis state-nya sendiri.

**Provenance (berlaku untuk Opsi A/B; Opsi C tidak memerlukan).**
Tetap berlaku v2.3.19 §5.3.

**checkLink — pemisahan jalur mutasi (semua opsi).** Tetap berlaku
v2.3.19 §5.3, dengan koreksi: riwayat check memakai
`owner_user_id` = principal pemanggil BILA mekanisme Opsi A/B
aktif; bila Opsi C (tanpa auth), riwayat check adalah publik-baca
seperti sekarang (`owner_user_id` NULL) dan TIDAK BOLEH dipakai
sebagai bukti kepemilikan katalog.

### 5.4 Threat model

Tetap berlaku v2.3.19 §5.4, ditambah:

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Pengguna biasa | Memanggil `addProject` langsung dengan principal valid | Menambah katalog (gerbang §5 menolak — bukan filter baca) |
| Pemegang token job bocor (Opsi B) | Token service auto-discovery | Menulis savedProjects pengguna lain / memakai token sebagai admin manusia (token job ≠ token admin) |

### 5.5 Matriks tes — H-AUTH-01..06 (ada) + H-AUTH-07 (BARU)

H-AUTH-01..03 tetap berlaku (v2.3.19 §5.5). **H-AUTH-04
DIREVISI:** v2.3.19 menguji "B TIDAK melihat baris A" (model
per-tenant) — itu SALAH untuk model global. H-AUTH-04 yang
berlaku mulai v2.3.20:

| ID | Kasus | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-AUTH-04 (REVISI) | Lintas principal: A menambah (admin), B membaca | A admin menambah proyek; B pengguna biasa memanggil `listProjects` + mencoba menambah | B MELIHAT baris A (katalog global); B DITOLAK saat mencoba menambah (gerbang §5); bookmark A tidak terlihat B | B tidak melihat baris A; ATAU B berhasil menambah |
| H-AUTH-05..06 | Tetap berlaku (v2.3.19 §5.5) | — | — | — |
| H-AUTH-07 (BARU) | Service principal job | Job auto-discovery (service principal) menambah proyek; user biasa mencoba hal yang sama; token job di-rotasi | Job diterima + provenance terisi server; user biasa ditolak; token lama ditolak setelah rotasi; token job tidak dapat dipakai sebagai admin manusia | Satu pun perilaku sebaliknya |

**Kriteria penerimaan F-005 (diperbarui):** keputusan otorisasi
cocok dengan kebijakan yang didokumentasikan pada tiap kasus
(H-AUTH-01..07), di staging; mekanisme yang dipilih (A/B/C)
dinyatakan eksplisit di log implementasi beserta bukti
prasyaratnya.

### 5.6 Dependensi staging, rollback, risiko tersisa

Tetap berlaku v2.3.19 §5.6, ditambah dependensi K-9 (service
principal) dan risiko **U-80** (lihat §4.6 — gerbang mutasi
bergantung pada mekanisme ini).

---

## §6. Urutan implementasi + dependensi staging + kriteria penerimaan keseluruhan — DIPERBARUI

**Urutan (satu change set per langkah; tiap langkah membawa tesnya;
langkah berikutnya dimulai hanya bila langkah ini PASS di staging):**

| Langkah | Change set | Prasyarat | Tes |
| --- | --- | --- | --- |
| 1 | F-001 guard (`ssrf-guard.ts` + `fetchTextOnce` + RDAP + script same-origin) — DIREVISI F-042 | K-1 (cache), K-2 (cap untuk §2 bila digabung — bila tidak, §2 terpisah), STAGE-P01 (pinning terbukti), STAGE-P03 (egress) | H-SSRF-01..30 |
| 2 | F-002 streamed caps + aggregate (di atas langkah 1) — DIREVISI F-038/F-039 | K-2 (angka cap + definisi layer), K-7 (model L0), G-H (harness terkoreksi), STAGE-P01 (perilaku dekompresi + transport mentah kanonik) | H-RES-01..03 + 07 (revisi) + 08..10 + 13..14 |
| 3 | F-003 deadline/cancellation/concurrency (di atas langkah 1–2) — DIREVISI F-041 | K-3 (20 detik +2 toleransi), K-9 (trusted proxy + storage rate limit), varian lease = DB lease default | H-RES-04..06 + 11..12 (angka 20 detik) + 15..17 |
| 4 | F-004 + F-018 migrasi 0006 v2 (independen dari langkah 1–3 — dapat jalan paralel bila staging DB tersedia) — DITULIS ULANG F-040/F-043 | K-5 (model global — diputuskan revisi ini; ratifikasi G-C), K-8 (peta chain), K-9 (service principal), G-C, backup katalog | H-CAT-01..10 + H-TEN-01..05 + 08..10 |
| 5 | F-005 mekanisme auth + provenance (di atas langkah 4) — DIPERBARUI F-040 | K-4 (opsi A/B/C), K-9 (service principal), G-C bila Opsi A, prosedur rotasi bila Opsi B | H-AUTH-01..07 |

**Kriteria penerimaan keseluruhan:** tetap berlaku v2.3.19 §6
(a)–(d), ditambah: (e) tidak ada satu pun dokumen (desain,
proposal, matriks, tes) yang menyebut angka deadline, model
lease, atau model katalog yang berbeda dari yang diputuskan di
revisi ini — konsistensi lintas dokumen adalah syarat
penerimaan, bukan kerapian.

---

## §7. Daftar keputusan owner (checklist — belum ada yang diputuskan)

- [ ] K-1 — Cabang cache F-022 (G-F): hapus cache dari jalur security-scan (rekomendasi) vs pertahankan dengan key `url + cap + policy-version`.
- [ ] K-2 — Nilai cap F-002: terima 400.000/300.000 per request (L1 decoded) + aggregate 1.000.000 decoded, atau tetapkan angka lain. L0 BUKAN bagian dari angka ini.
- [ ] K-3 — **DIREVISI:** terima total deadline **20 detik** +2 detik toleransi staging (menggantikan 30 detik v2.3.19 yang salah).
- [ ] K-4 — Mekanisme otorisasi F-005: Opsi A (butuh pernyataan provider) / Opsi B (service token + rotasi) / Opsi C (nonaktifkan — default).
- [ ] K-5 — **DIPUTUSKAN (desain):** `projects` = katalog GLOBAL. Butuh ratifikasi owner (G-C) + penyediaan service principal (K-9). Bila ditolak, §4 ditulis ulang (cabang per-tenant §4.7).
- [ ] K-6 — **DIHAPUS (superseded F-040).** Tidak ada OWNER_USER_ID backfill.
- [ ] K-7 — **BARU:** Model L0 — Model B (transport mentah + dekompresi aplikasi) vs Model A (egress/infrastruktur; aplikasi tidak mengklaim L0). Default bila diam: Model A + egress limit dipersyaratkan.
- [ ] K-8 — **BARU:** Peta chain → tipe alamat (§4.3) diterima; perluasan peta berikutnya = keputusan owner + migrasi.
- [ ] K-9 — **BARU:** Service principal untuk job auto-discovery + daftar trusted proxy hop + sumber IP pemanggil + storage rate limit. Default bila diam: tidak ada service principal (job tidak jalan).
- [ ] G-A — Scope perubahan source (F-020): otorisasi tahap (b) untuk change set §6 — BELUM diberikan; proposal ini BUKAN otorisasi itu.

---

## §8. Status akhir — F-001..F-005 TETAP OPEN/BLOCKED

Proposal v2.3.20 **memperbaiki** proposal v2.3.19 (bukan
menutup finding apa pun):

- **F-001, F-002, F-003, F-004, F-005 tetap OPEN/BLOCKED.**
  Yang berubah: dari "proposal tersedia tetapi mengandung 6
  inkonsistensi desain (F-038..F-043)" (v2.3.19, menurut audit
  V13) menjadi "proposal diperbaiki atas keenamnya, dengan
  bukti VM atas mekanisme yang diperbaiki" (v2.3.20). Status
  temuan TIDAK berubah — penutupan tetap butuh implementasi
  tahap (b) + semua kasus tes PASS di staging + migrasi/rollback
  dieksekusi di staging + keputusan K-1..K-9 tercatat + review
  independen atas implementasi itu sendiri.
- Implementasi (tahap b) tetap membutuhkan otorisasi eksplisit
  terpisah dari owner (G-A) DAN bukti staging yang dipersyaratkan
  (STAGE-P01..P12) DAN review independen atas implementasi itu
  sendiri. Proposal ini bukan otorisasi itu.
- `checkLink` TIDAK di-invoke untuk proposal ini. Link Scanner
  tetap nonaktif. Tidak ada perubahan source aplikasi, DB,
  package/lockfile, workflow CI, deployment, atau live artifact.

---

## §9. Aturan traceability — raw log (BARU, jawaban V13 §8 butir 7)

Aturan ini mengikat SEMUA revisi mulai v2.3.20 (dan berlaku
surut sebagai pelajaran dari v2.3.19 — lihat matriks v2.3.20
§10 butir 2):

1. **Setiap run (berhasil atau gagal) disimpan sebagai file
   terpisah dengan nama berversi.** Nama kanonik
   (`*-v2320.txt`) hanya untuk run yang dijadikan bukti final.
   Run gagal / run ulang memakai sufiks
   (`*-run1-fail.txt`, `*-run1-noisy.txt`, `*-run2-fail.txt`,
   …) dan TIDAK PERNAH ditimpa oleh run berikutnya.
2. **Setiap log mentah memuat:** tanggal WIB, versi Bun,
   UID, label lingkungan (VM/staging/produksi), jumlah
   assertion PASS/FAIL, dan exit code. Log tanpa header ini
   bukan bukti.
3. **Setiap status dalam response matrix harus dapat ditelusuri
   ke:** file, test ID, raw log (+ SHA-256), commit SHA, tanggal
   run, dan exit code. Status tanpa rujukan itu bukan
   "addressed" — paling tinggi "partially addressed" dengan
   alasan yang dinyatakan.
4. **Kalimat stale dilarang:** setiap revisi memeriksa header
   `SSRF_REMEDIATION_DESIGN.md` dan matriks sebelumnya; kalimat
   yang bertentangan dengan status saat ini diperbaiki pada
   revisi yang sama (v2.3.20 memperbaiki kalimat stale v2.3.19
   — lihat matriks §2 butir 7).
5. **Tidak ada rekonstruksi log dari ingatan.** Log yang hilang
   (mis. SU-T5, run pertama F-035 v2.3.19) tetap dicatat
   NOT PRESERVED — tidak pernah ditulis ulang seolah-olah ada.

---

## Lampiran A — Log perubahan v2.3.19 → v2.3.20 (yang berubah dan mengapa)

| # | Lokasi | Perubahan v2.3.20 | Alasan (audit V13) |
| --- | --- | --- | --- |
| 1 | §0 K-3 | Deadline 30 detik → **20 detik** | F-041: 20 detik adalah keputusan pemilik tercatat; 30 detik hanya nilai di kode mirror |
| 2 | §0 K-6 | **DIHAPUS** (OWNER_USER_ID backfill) | F-040: backfill satu owner merusak katalog global |
| 3 | §0 K-5 | Tenancy "diputuskan desain: global" (ratifikasi tersisa) | F-040: model harus diputuskan eksplisit, bukan disimpulkan dari `ctx.db` |
| 4 | §0 K-7/K-8/K-9 | Keputusan BARU (model L0, peta chain, service principal + trusted proxy) | F-038/F-043/F-040/F-041: ketiganya butuh keputusan sebelum implementasi |
| 5 | §1.3 F-001a | Guard `ips.length === 0` + null/undefined eksplisit; kembalikan IP kanonik | F-042: empty set menghasilkan ok=true, ip=undefined |
| 6 | §1.3 F-001c | checkPort 80/443 eksplisit; DNS timeout 5 detik + late-result diabaikan; larangan fallback ke fetch biasa | F-042: port policy + timeout tidak dipetakan; fallback tidak dilarang |
| 7 | §1.5 | H-SSRF-27..30 baru | F-042: acceptance tests untuk empty/NODATA/NXDOMAIN/timeout/port/late-result |
| 8 | §2.3 | Definisi L0/L1/L3 ditulis ulang; SATU chunk tidak pernah dihitung ganda; Model A/B; `Response.body` hanya L1 | F-038: chunk Response.body bukan wire bytes (dibuktikan empiris 520 vs 500.000) |
| 9 | §2.3 | tryReserve sinkron sebelum append; A1 vs A2 terpisah; batas A2 = R × C_max; script SERIAL (R = 1) | F-039: append-dulu overshoot 186.432 byte (3 chunk); klaim "cap + satu chunk" salah |
| 10 | §2.3/§3.3 | Catatan AbortError: `await fetch` + `await reader.cancel()` di try/catch | Temuan evidence v2.3.20: unhandled rejection dari cancel() tanpa await |
| 11 | §2.5 | H-RES-07 DIREVISI (serial); H-RES-13/14 baru; H-RES-08 diperluas (L0) | F-038/F-039: acceptance tests untuk layer + aggregate concurrency-safe |
| 12 | §3.3 F-003a | 30 detik → 20 detik + aturan perubahan angka | F-041: rekonsiliasi deadline |
| 13 | §3.3 F-003c | DB lease = DEFAULT; in-memory semaphore TERKUNCI (butuh bukti single-instance + persetujuan owner) | F-041: varian bebas berisiko DoS multi-instance |
| 14 | §3.3 F-003c | Sumber IP = peer TCP langsung; XFF hanya dari trusted proxy, validasi hop-per-hop; storage rate limit = tabel DB | F-041: sumber IP tepercaya + penolakan spoof belum didefinisikan |
| 15 | §3.5 | H-RES-15..17 baru; H-RES-04..06/11..12 dibaca 20 detik | F-041: acceptance tests deadline/lease/spoof |
| 16 | §4 | Migrasi 0006 DITULIS ULANG: tanpa owner di projects, tanpa backfill; checks.owner_user_id (nullable); savedProjects composite key + sentinel `<LEGACY>`; kolom kanonik + unique index per (chain, canonical); CHECK chain | F-040 + F-043: model global + kanonikalisasi per tipe + scope uniqueness |
| 17 | §4.5 | H-TEN-06/07 SUPERSEDED → H-TEN-08..10; H-CAT-07..10 baru | F-040/F-043: tes model global + kanonikalisasi |
| 18 | §4.7 | Cabang per-tenant dicatat sebagai alternatif yang DITOLAK untuk revisi ini | F-040: keputusan dapat dibalik secara terlacak |
| 19 | §5.3/§5.5 | Tabel peran (baca global / mutasi gerbang / state sendiri); H-AUTH-04 DIREVISI (B MELIHAT baris A); H-AUTH-07 baru | F-040: otorisasi harus cocok dengan model global |
| 20 | §6 | Urutan diperbarui (tes baru + prasyarat baru); kriteria (e) konsistensi lintas dokumen | F-041 + butir 7: satu angka/satu model di semua dokumen |
| 21 | §9 | Aturan raw log BARU | V13 §8 butir 7: log gagal v2.3.19 tertimpa |

## Lampiran B — Risiko baru v2.3.20 (U-78..U-86)

| ID | Risiko | Penanganan / status |
| --- | --- | --- |
| U-78 | F-038 — egress limit L0 masih UNASSIGNED; Model A tidak memenuhi F-002 tanpa bukti egress | Prasyarat staging STAGE-P03; pemilik egress UNASSIGNED |
| U-79 | F-039 — C_max deployment-dependent; batas A2 paralel bergantung runtime kanonik 1.3.10 (NOT VERIFIED) | Serialisasi (R = 1) menghilangkan ketergantungan; staging harus mengukur C_max |
| U-80 | F-040 — gerbang mutasi katalog global bergantung mekanisme F-005; default Opsi C = katalog manual via migrasi | Dinyatakan sebagai harga yang diterima; bukan disembunyikan |
| U-81 | F-041 — kode mirror masih 30 detik; change set harus mengubahnya ke 20 detik | Diikat di §3.3 + H-RES-15; rollback mempertahankan 20 detik |
| U-82 | F-043 — peta chain harus diperluas tiap chain baru tiba; chain baru DITOLAK sampai dipetakan | Fail-closed by design; perluasan = keputusan owner + migrasi (K-8) |
| U-83 | F-038 — transport mentah (Model B) mungkin tidak didukung runtime produksi | STAGE-P01 harus membuktikan; bila FAIL, jatuh ke Model A + bukti egress |
| U-84 | F-042 — resolver runtime produksi mungkin tidak mendukung timeout/late-result semantics | Guard memakai timeout eksplisit di lapisan aplikasi; bukan andalkan AbortSignal |
| U-85 | F-041 — daftar trusted proxy + storage rate limit belum ada; angka 10/menit + 100/jam belum dapat ditegakkan | Prasyarat staging (K-9); angka tidak final sebelum prasyarat ada |
| U-86 | F-040 — sentinel `<LEGACY>` pada savedProjects: collision bila principal baru memakai string itu | Sentinel didokumentasikan; principal baru dilarang memakai nilai itu (§5) |

U-38/U-33/U-41/U-43/U-44/U-45/U-46, U-47..U-77 dipertahankan
tanpa perubahan status (lihat matriks v2.3.20 §5).
