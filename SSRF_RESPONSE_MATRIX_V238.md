# SSRF RESPONSE MATRIX v2.3.9 — Jawaban atas Audit ChatGPT V1 & V2 (revisi v2.3.9)

**Dokumen:** matriks respons revisi desain v2.3.9
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_CODE_SECURITY_AUDIT_V1.md` (175 baris, commit `52724d6`,
  2026-11-07 23:52 WIB) — F-001..F-006 + Muse Handoff 6 butir
- `SSRF_INDEPENDENT_AUDIT_V2.md` (257 baris, commit `789797e`,
  2026-11-07 23:56 WIB) — F-007..F-009, matriks ST-01..ST-16, register
  blocker B-01..B-12, Muse Handoff §8 (9 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.8:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.8 — §D.4.17 ringkasan matriks, §D.4.18 desain remediasi
F-001..F-005, §D.4.19 inventaris staging), `SSRF_REPRODUCIBILITY_V238.md`,
`evidence/v236/MANIFEST.md` + 21 file bukti mentah, `site/DATA-PLAN.md`
(mirror, sudah di-redact), `site/bun.lock` (baru di-mirror).

**Revisi v2.3.9 (8 November 2026, dokumen ini):** penyempitan celah bukti
tanpa otorisasi implementasi, atas perintah pemilik proyek ("kerjakan
dengan benar jobdeskmu dan persempit celah dulu", public tester DITAHAN).
Yang baru di v2.3.9: (1) bundle bukti suplemen `evidence/v236-supplement-20261108/`
(4 run SU lengkap 9/9 + run ketiga OPS-T7 PASS + `MANIFEST.md` sendiri)
— menutup caveat F-007 yang dicatat v2.3.8; (2) verifikasi F-005 dari kode
(read-only): tidak ada auth di `actions.ts`, tidak ada pemanggil di
`client/src/`, provenance disimpan verbatim dari argumen caller, tidak ada
kolom provenance di schema; (3) verifikasi F-009: SDK tarball terverifikasi
ada (0.14.0, SHA-256), `bun install --frozen-lockfile` di salinan scratch
exit 0 tanpa mengubah `bun.lock`, typecheck client+server exit 0
(Bun 1.4.4). F-001..F-005 TETAP blocked — tidak ada implementasi di
v2.3.9. Public tester TIDAK disentuh.

## Catatan kejujuran tentang waktu

V1 (23:52 WIB) dan V2 (23:56 WIB) hanya berselang **4 menit**. Observasi
V2 bahwa "belum ada respons Muse" **benar secara repo pada saat itu** —
tidak ada commit respons di antara keduanya. Dokumen ini (v2.3.8) adalah
respons itu. Sampai v2.3.8 di-commit ke `main`, tidak ada klaim kemajuan
teknis yang dapat diverifikasi dari repo — ChatGPT tidak akan membuat
audit lanjutan berdasarkan pesan Muse saja, dan dokumen ini tidak meminta
hal itu.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.8

Sesuai keputusan pemilik proyek (disampaikan 2026-11-07 ~23:56 WIB,
dikonfirmasi ~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan
tidak boleh dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.8.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.8 TIDAK mengimplementasikan apa pun. |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.8. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.** Mirror (`site/`) adalah permukaan review; situs live hanya
berubah lewat artifact workflow yang sah, setelah tahap (b) dan (c)
disetujui secara terpisah. Satu-satunya perubahan "kode" di v2.3.8 adalah
redaksi dokumentasi `site/DATA-PLAN.md` (dokumen, bukan kode aplikasi)
dan penambahan `site/bun.lock` (file lock yang sebelumnya tidak
di-mirror) — keduanya bukan perubahan perilaku aplikasi dan bukan
implementasi remediasi F-001..F-005.

**Konsekuensi untuk status di matriks ini:** temuan kode F-001..F-005
**tetap OPEN / BLOCKED** sampai implementasi + bukti harness ada.
Dokumen ini tidak mengklaim satu pun dari kelimanya "selesai". Yang
v2.3.8 berikan adalah: spesifikasi perubahan kode yang eksak, spesifikasi
harness deterministik dengan kriteria PASS/FAIL, dan kriteria penerimaan
per temuan — agar tahap (b) dapat dimulai segera setelah pemilik memberi
persetujuan eksplisit.

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Tidak ada butir yang berstatus ini di v2.3.8 — semua temuan diterima sebagai sah. |

## §1. Ringkasan status F-001..F-009

| ID | Severity | Status v2.3.8 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Desain remediasi + harness diperketat selesai (§2.1, §D.4.18). Implementasi menunggu otorisasi pemilik. Link Scanner tetap nonaktif. |
| F-002 | High — cap setelah buffering | **blocked** | Desain streamed cap + decompressed cap selesai. Implementasi menunggu otorisasi. |
| F-003 | High — tanpa total deadline | **blocked** | Desain total deadline + cancellation budget selesai. Implementasi menunggu otorisasi. |
| F-004 | Medium — addProject duplicate race | **blocked** | Desain unique constraint + harness konkurensi selesai. Implementasi menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | **v2.3.9: DIVERIFIKASI dari kode** — tidak ada auth di `actions.ts` (grep `auth\|token\|session\|ADMIN` di luar string konten: nol); tidak ada pemanggil di `client/src/` maupun file server lain; provenance (`verified_at`/`verified_note`) disimpan verbatim dari argumen caller; schema tidak punya kolom provenance. Satu-satunya pembatas yang mungkin adalah scoping endpoint runtime artifact — **NOT VERIFIED dari mirror**. Desain otorisasi + provenance selesai. Keputusan mekanisme otorisasi butuh pemilik + fakta runtime. |
| F-006 | Medium — DATA-PLAN.md berisi narasi pribadi | **addressed** | Mirror `site/DATA-PLAN.md` di-redact + rescan selesai. **v2.3.9 residual:** narasi insiden juga ada di string kode `site/server/src/actions.ts` — komentar baris 51 (`KNOWN_BAD_DOMAINS`) dan `GIBRAN_SITE_KNOWLEDGE` baris 1089 — keduanya copy/kode live, perbaikannya follow-up tahap (b), bukan edit diam-diam di mirror. Follow-up terpisah: DATA-PLAN.md di live artifact masih berisi narasi asli. |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Bundle `evidence/v236/` (21 file, byte-identik, manifest + SHA-256) diterbitkan. **v2.3.9: bundle suplemen `evidence/v236-supplement-20261108/` diterbitkan** — 4 run SU lengkap 9/9 + run ketiga OPS-T7 PASS (manifest + SHA-256 sendiri); `su-supp-run1.txt` byte-identik dengan `su-run1.txt` lama. Caveat tersisa: run gagal awal SU-T5 tetap NOT PRESERVED (tidak direkonstruksi); klaim v2.3.6 tetap bersandar pada bukti lama. |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Koreksi transparan di `SSRF_RECONCILIATION_V237.md` + §D.4.16 desain, dengan verifikasi kode committed. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | `site/bun.lock` di-mirror (SHA terverifikasi); manifest reproduksibilitas ditulis. **v2.3.9: SDK tarball terverifikasi ada** (`@hatch/space-sdk` 0.14.0, 2.051.070 byte, SHA-256 `f2cb7b25…`); **`bun install --frozen-lockfile` di salinan scratch exit 0** (79 paket, `bun.lock` tidak berubah, hash `a7e1457e…`); **typecheck client+server exit 0** (Bun 1.4.4, TS 5.6.3). Tetap NOT VERIFIED: provenance SDK, konsistensi di bawah Bun 1.3.10 yang dideklarasikan, CI, dan build penuh (`bun run build` tidak dicoba — build dicadangkan untuk artifact tools). |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif.**

## §2. Respons per temuan

### F-001 — Critical: SSRF di checkLink (V1) — **blocked**

**Temuan (diterima):** `site/server/src/actions.ts` — `normalizeUrl()`
(baris 69–89) hanya memeriksa scheme; `fetchText()` (baris 101–125)
melakukan fetch langsung dan mengikuti redirect manual (maks 6 hop +
initial = sampai 7 request) tanpa kebijakan IP; `analyze()` (baris 236+)
menjalankan RDAP + `fetchText` paralel tanpa total deadline; fetch
script (~baris 373–386) mengambil sampai 3 URL script dari HTML yang
dikontrol penyerang tanpa pembatasan same-origin. Verifikasi ulang
2026-11-08: semua klaim ini cocok dengan kode mirror commit `c68c727`.

**Inkonsistensi dokumen/kode yang ditemukan saat verifikasi (baru,
dicatat di sini, bukan diperbaiki diam-diam):** `site/DATA-PLAN.md`
baris 19 (versi sebelum redaksi v2.3.8) mengklaim checker mengambil
"up to 3 same-origin script files" — kode tidak memberlakukan
pembatasan same-origin apa pun. Klaim dokumen itu SALAH terhadap kode.
Perbaikan klaim dokumen adalah bagian dari desain remediasi (§D.4.18,
butir F-001d); perbaikan kode adalah tahap (b).

**Respons teknis (tahap a — desain):** spesifikasi perubahan kode yang
eksak ada di `SSRF_REMEDIATION_DESIGN.md` §D.4.18 butir F-001a..F-001e:
resolve + validasi SEMUA jawaban A/AAAA; tolak non-global-unicast
(termasuk loopback, RFC1918, link-local, metadata, IPv4-mapped IPv6,
zone-scoped); pin alamat tervalidasi ke koneksi aktual; validasi ulang
tiap hop redirect; script same-origin saja. **Implementasi: BLOCKED —
menunggu persetujuan eksplisit pemilik (tahap b).**

**Spesifikasi harness F-001 — diperketat (wajib):** harness yang lulus
TIDAK membuktikan implementasi aman bila tidak menguji jalur eksploitasi
yang sebenarnya. Harness `H-SSRF-*` di bawah WAJIB dijalankan terhadap
implementasi tahap (b) sebelum F-001 dapat ditutup. Semua kasus memakai
**server uji lokal saja** (listener `127.0.0.1` sebagai target "internal",
stub DNS terkontrol) — TIDAK PERNAH terhadap layanan metadata nyata
(`169.254.169.254` sungguhan) atau infrastruktur produksi.

Aturan pengukuran yang mengikat semua kasus: **"zero connections"**
dibuktikan dengan listener lokal yang mencatat tiap koneksi TCP masuk +
log egress fetcher; verdict checker harus BAHAYA/ditolak; tidak ada byte
pun dari target internal yang boleh sampai ke output checker.

| ID | Kasus uji | Setup | Kriteria PASS (eksplisit) | FAIL bila |
| --- | --- | --- | --- | --- |
| H-SSRF-01 | Literal IPv4 privat | URL `http://192.168.1.1/` | 0 koneksi ke 192.168.1.1; verdict tolak sebelum connect | Ada 1+ koneksi TCP ke 192.168.1.1 |
| H-SSRF-02 | Loopback IPv4 | URL `http://127.0.0.1:9/` dan `http://127.0.0.1:<port listener>/` | 0 koneksi ke 127.0.0.1; verdict tolak | Listener mencatat koneksi, atau body internal terbaca |
| H-SSRF-03 | Link-local + metadata | URL `http://169.254.169.254/` | 0 koneksi; verdict tolak | Koneksi apa pun ke 169.254.169.254 |
| H-SSRF-04 | RFC1918 (10/8, 172.16/12, 192.168/16) | Satu URL per rentang | 0 koneksi ke tiap alamat; verdict tolak | Koneksi ke alamat mana pun dari ketiga rentang |
| H-SSRF-05 | Loopback IPv6 | URL `http://[::1]/` | 0 koneksi ke ::1; verdict tolak | Koneksi ke ::1 |
| H-SSRF-06 | Link-local IPv6 | URL `http://[fe80::1]/` | 0 koneksi; verdict tolak | Koneksi ke fe80::/10 |
| H-SSRF-07 | Unique-local IPv6 | URL `http://[fc00::1]/` dan `http://[fd00::1]/` | 0 koneksi; verdict tolak | Koneksi ke fc00::/7 |
| H-SSRF-08 | IPv4-mapped IPv6 | URL `http://[::ffff:127.0.0.1]/`, `http://[::ffff:169.254.169.254]/`, `http://[::ffff:10.0.0.1]/` | 0 koneksi; ketiganya ditolak sebagai alamat IPv4 tertanamnya | Koneksi ke alamat mana pun; atau mapped lolos sebagai "IPv6 publik" |
| H-SSRF-09 | Zone-scoped IPv6 | URL `http://[fe80::1%25eth0]/`, `http://[::1%25lo]/` | 0 koneksi; ditolak (zone ID tidak membuat alamat aman) | Koneksi, atau zone ID di-strip lalu alamat dipakai |
| H-SSRF-10 | Redirect berantai multi-hop ke internal | Hop 1–2: host publik stub; hop 3: `Location: http://127.0.0.1:<port>/`; varian kedua hop akhir `http://169.254.169.254/` | 0 koneksi ke hop internal; rantai dihentikan di hop yang melanggar; verdict tolak | Koneksi ke hop internal; atau body hop internal terbaca |
| H-SSRF-11 | DNS rebinding | Stub DNS: lookup pertama hostname → IP publik; lookup kedua (TTL 0) → 127.0.0.1; checker fetch hostname itu | Koneksi HANYA ke alamat publik yang di-pin pada validasi pertama; 0 koneksi ke 127.0.0.1 | Koneksi ke 127.0.0.1 pada resolve ulang, atau destination berubah antar hop |
| H-SSRF-12 | Jawaban DNS campuran | Stub DNS: satu hostname → A `[203.0.113.10, 10.0.0.5]` dan AAAA `[2001:db8::1, ::1]` | Seluruh jawaban DITOLAK bila ada satu jawaban terlarang (kebijakan desain: tolak set jawaban); 0 koneksi ke alamat terlarang | Koneksi ke 10.0.0.5 atau ::1; atau jawaban campuran diterima sebagian tanpa penolakan set |
| H-SSRF-13 | Script src ke internal | Halaman dari host publik stub berisi `<script src="http://169.254.169.254/x.js">` dan `<script src="http://127.0.0.1:<port>/x.js">` | 0 fetch script ke alamat internal; script tidak dieksekusi/diambil | Fetch script ke alamat internal tercatat |
| H-SSRF-14 | Script same-origin saja | Halaman host publik A berisi `<script src="http://<host-publik-B>/x.js">` | Script lintas origin TIDAK di-fetch (kebijakan: same-origin saja) | Script lintas origin di-fetch |
| H-SSRF-15 | Redirect loop / hop berlebih | Rantai redirect 8 hop antar host publik stub | Fetch dibatalkan setelah batas hop; tidak ada koneksi di luar batas | Hop ke-7+ tetap di-fetch |
| H-SSRF-16 | Rebinding via redirect | Hop 1 host publik; hop 2 hostname yang resolve-nya berubah publik → privat antar validasi dan connect | Koneksi hop 2 hanya ke alamat yang di-pin saat validasi; 0 koneksi ke alamat privat hasil resolve ulang | Destination hop 2 mengikuti resolve ulang |
| H-SSRF-17 | CNAME ke internal | Stub DNS: hostname → CNAME → hostname yang resolve ke 10.0.0.9 | CNAME diikuti sampai jawaban akhir dan jawaban akhir divalidasi; 0 koneksi ke 10.0.0.9 | CNAME tidak divalidasi sampai akhir dan koneksi terjadi |
| H-SSRF-18 | Bentuk IP non-kanonik | URL `http://0x7f.0.0.1/`, `http://2130706433/`, `http://0177.0.0.1/`, `http://127.1/` | Semua diparse ke 127.0.0.1 lalu ditolak; 0 koneksi | Satu pun bentuk lolos sebagai "hostname" dan di-fetch |
| H-SSRF-19 | Userinfo menutupi host | URL `http://publik.example@127.0.0.1/` | Host dikenali sebagai 127.0.0.1 dan ditolak; 0 koneksi | Host salah diparse sebagai publik.example |
| H-SSRF-20 | Redirect ke URL dengan userinfo/internal | Hop redirect `Location: http://publik.example@169.254.169.254/` | Ditolak pada validasi hop; 0 koneksi | Koneksi ke 169.254.169.254 |

**Kriteria penerimaan F-001 (penutup):** H-SSRF-01..H-SSRF-20 SEMUA
PASS pada implementasi tahap (b), dijalankan di staging (bukan hanya
VM), dengan log mentah + manifest seperti `evidence/v236/MANIFEST.md`.
Satu kasus FAIL = F-001 tetap OPEN. Tes terhadap layanan metadata nyata
atau infrastruktur produksi DILARANG.

**Risiko tersisa:** SSRF masih mungkin dieksploitasi di kode saat ini
sampai tahap (b) selesai — itulah alasan Link Scanner tetap nonaktif dan
mitigasi G0 (tolak semua URL arbitrer) tetap menjadi penahan. Risiko
NAT64/NSP (U-11) tetap terbuka dan di luar harness ini (butuh dokumen
egress + uji S-49/S-50 di staging).
**Aksi berikutnya:** pemilik memberi/menolak persetujuan eksplisit tahap
(b) untuk F-001; bila disetujui, implementasi sesuai §D.4.18 lalu
harness H-SSRF-01..20 di staging.

### F-002 — High: response cap diterapkan setelah buffering penuh — **blocked**

**Temuan (diterima):** `fetchText()` (`actions.ts` baris 101–125)
melakukan `await res.text()` lalu `.slice(0, cap)` — seluruh body
di-buffer dulu; penyerang dapat memaksa alokasi besar sebelum cap
diterapkan. Verifikasi ulang 2026-11-08: cocok dengan kode.
**Respons (tahap a):** desain streamed byte cap + decompressed cap di
§D.4.18 butir F-002a..F-002c: baca via stream dengan batas byte
terkompresi DAN hasil dekompresi; batalkan koneksi saat cap terlampaui;
cap berlaku per request dan total per pemeriksaan. **Implementasi:
BLOCKED — tahap (b).**
**Harness:** H-RES-01 body 50 MB → koneksi dibatalkan sebelum 50 MB
ter-buffer, memori proses di bawah anggaran; H-RES-02 gzip bomb (rasio
dekompresi > 100×) → dibatalkan pada decompressed cap, bukan pada
compressed cap; H-RES-03 body tepat di bawah cap → lolos utuh.
PASS/FAIL: byte yang di-buffer tidak pernah melebihi cap + overhead
stream yang dinyatakan; FAIL bila alokasi melewati anggaran.
**Risiko tersisa:** sampai tahap (b), satu URL dapat memaksa buffer
besar di server (DoS memori). Mitigasi sementara: G0 menolak semua URL
arbitrer, sehingga jalur ini tidak terekspos.
**Aksi berikutnya:** persetujuan tahap (b); implementasi + harness
H-RES-01..03 di staging.

### F-003 — High: tidak ada total deadline — **blocked**

**Temuan (diterima):** `fetchText()` memakai `AbortSignal.timeout`
12 detik PER FETCH; `analyze()` menjalankan RDAP + fetchText paralel
tanpa deadline total — rantai redirect + script dapat menjumlahkan
waktu jauh di atas 12 detik. Verifikasi ulang 2026-11-08: cocok.
**Respons (tahap a):** desain satu total deadline + cancellation
budget di §D.4.18 butir F-003a..F-003c: satu anggaran waktu per
pemeriksaan yang mencakup RDAP + page + semua redirect + semua script;
sinyal batal dibagikan ke semua fetch; batas konkurensi/rate (lihat
F-003d). **Implementasi: BLOCKED — tahap (b).**
**Harness:** H-RES-04 slow drip (1 byte/10 detik) → pemeriksaan
berakhir pada total deadline, bukan pada timeout per-fetch; H-RES-05
rantai 7 fetch lambat → total waktu ≤ deadline + toleransi yang
dinyatakan; H-RES-06 20 pemeriksaan bersamaan → tidak melebihi batas
konkurensi, kelebihan ditolak fail-closed (429/503), bukan antre tanpa
batas. PASS/FAIL: waktu total dan jumlah fetch bersamaan selalu dalam
anggaran yang dinyatakan.
**Risiko tersisa:** sampai tahap (b), pemeriksaan lambat dapat menahan
pekerja server. Mitigasi sementara: G0.
**Aksi berikutnya:** persetujuan tahap (b); implementasi + harness
H-RES-04..06 di staging.

### F-004 — Medium: addProject duplicate race, tanpa unique constraint — **blocked**

**Temuan (diterima):** `addProject()` (`actions.ts` ~baris 987–1046)
membaca semua proyek lalu insert — dua request bersamaan dapat
membuat duplikat; `schema.ts` tabel `projects` TIDAK memiliki unique
constraint pada nama maupun `contract_address`. Verifikasi ulang
2026-11-08: cocok (grep `unique` di `schema.ts`: tidak ada).
**Respons (tahap a):** desain di §D.4.18 butir F-004a..F-004c: unique
constraint DB pada nama ternormalisasi DAN alamat kontrak
ternormalisasi (normalisasi: trim, lowercase, hapus prefix `0x` untuk
perbandingan — nilai tersimpan tetap bentuk kanonik checksum/hex
asli); insert atomik dengan penanganan konflik (satu baris menang,
yang lain menerima konflik, bukan duplikat); migrasi drizzle baru.
**Implementasi: BLOCKED — tahap (b).** Catatan: migrasi DB adalah
perubahan database; tidak dilakukan di v2.3.8.
**Harness:** H-CAT-01 10 request duplikat bersamaan (nama sama) → tepat
1 baris; H-CAT-02 alamat kontrak sama dengan perbedaan case/spasi →
tepat 1 baris; H-CAT-03 dua nama berbeda, alamat kontrak sama → tepat
1 baris (konflik alamat). PASS/FAIL: hitung baris di DB setelah run.
**Risiko tersisa:** sampai tahap (b), duplikat katalog masih mungkin
masuk lewat race; dampak terbatas pada katalog (bukan keamanan
eksekusi), dan penambahan katalog saat ini lewat jalur cron yang
terkontrol.
**Aksi berikutnya:** persetujuan tahap (b); migrasi + harness H-CAT-01..03.

### F-005 — Medium: validasi URL addProject hanya sintaksis; otorisasi tidak jelas — **blocked**

**Temuan (diterima):** `addProject()` hanya memvalidasi sintaksis URL;
tidak ada pemeriksaan otorisasi di mana pun di file (grep
`auth|authorize|role` di `actions.ts`: tidak ada, kecuali kata
"registrar" dari RDAP dan peran Gibran); `checkLink` (~baris 1204–1210)
adalah `defineAction` biasa tanpa wrapper auth. Verifikasi ulang
2026-11-08: cocok.
**Verifikasi v2.3.9 (dari kode, read-only, 2026-11-08 — mirror
`site/`, sinkron commit `c68c727`):**

- **Tidak ada mekanisme auth di dalam kode.** Grep
  `auth|token|session|ADMIN|secret|password|verify` di
  `site/server/src/actions.ts`: nol mekanisme — hanya string konten
  (regex `TOKEN_ADDRESS`, narasi verifikasi). Handler `addProject`
  (baris 1342) memanggil fungsi internal (baris 959) tanpa memeriksa
  identitas pemanggil apa pun dari `ctx`.
- **Tidak ada pemanggil di kode yang di-mirror.** Grep `addProject` di
  seluruh `site/client/src/` dan `site/server/src/`: hanya
  `actions.ts` sendiri (definisi internal baris 959 + `defineAction`
  baris 1321–1342). Deskripsi action (baris 1322–1324) menyebut
  pemanggil yang dimaksud adalah "scheduled auto-discovery job" (cron
  agen) — bukan UI. Tidak ada pemanggil lain yang dapat diverifikasi
  dari repo.
- **Provenance disimpan verbatim dari argumen caller.** Insert
  (baris 1062–1063): `verified_at: args.verifiedAt`,
  `verified_note: args.verifiedNote.trim()` — server tidak memverifikasi
  secara independen klaim verifikasi yang diajukan caller. Schema
  (`site/server/src/schema.ts` baris 48–49) menyimpan `verified_at` /
  `verified_note` sebagai teks biasa; **tidak ada kolom provenance**
  (`added_by`, `source`, dsb.) — hanya `created_at` (baris 21).
- **Satu-satunya pembatas yang mungkin adalah scoping endpoint
  runtime artifact** (bagaimana runtime Hatch membatasi siapa yang
  dapat memanggil action) — **NOT VERIFIED dari mirror**: tidak ada
  bukti di repo tentang pembatasan itu. Jadi: auth di dalam kode
  **TERBUKTI TIDAK ADA**; lapisan di luar kode **TIDAK DAPAT
  DIVERIFIKASI**.
**Respons (tahap a):** (1) Trust boundary didokumentasikan apa adanya
di §D.4.18 butir F-005a — diperbarui v2.3.9 dengan temuan di atas:
auth di dalam kode TERBUKTI TIDAK ADA; lapisan runtime NOT VERIFIED,
bukan "tidak ada".
(2) Desain otorisasi + provenance di §D.4.18 butir F-005b..F-005d:
`addProject` hanya boleh dipanggil dari jalur terotorisasi yang
didokumentasikan; setiap penambahan mencatat provenance (sumber resmi,
yang mengajukan, yang memverifikasi, tanggal); panggilan tanpa otorisasi
ditolak dan di-log. Mekanisme otorisasi eksak (sesi admin / token
layanan / daftar pemanggil) adalah **keputusan desain yang butuh
pemilik + fakta runtime artifact** — v2.3.8 tidak mengarang mekanisme
yang tidak dapat diverifikasi. **Implementasi: BLOCKED — tahap (b).**
**Harness:** H-AUTH-01 panggilan tanpa otorisasi → ditolak + tercatat;
H-AUTH-02 panggilan terotorisasi → diterima + provenance lengkap;
H-AUTH-03 panggilan terotorisasi tanpa provenance → ditolak.
PASS/FAIL: keputusan otorisasi cocok dengan kebijakan yang
didokumentasikan pada tiap kasus.
**Risiko tersisa:** sampai tahap (b) + keputusan mekanisme, batas
otorisasi addProject tidak terbukti dari kode mirror.
**Aksi berikutnya:** pemilik memutuskan mekanisme otorisasi (dengan
fakta runtime); persetujuan tahap (b); implementasi + harness H-AUTH-01..03.

### F-006 — Medium: DATA-PLAN.md di mirror publik berisi narasi insiden pribadi + fragmen wallet — **addressed**

**Temuan (diterima):** `site/DATA-PLAN.md` (106 baris, commit `c68c727`)
berisi narasi insiden pribadi + identifier di baris 4, 5, 6, 12, 18, 29,
37, 41, 82, 86, 88 (verifikasi ulang 2026-11-08 terhadap mirror).
**Respons (tahap a — dokumen, bukan kode perilaku):**
`site/DATA-PLAN.md` di mirror sudah di-redact — narasi insiden pribadi
dan fragmen wallet dihapus; rationale threat-model generik dipertahankan
(domain drainer tetap disebut karena ada di `KNOWN_BAD_DOMAINS` kode dan
merupakan bukti threat-model yang esensial; tanggal insiden generik
"7 Nov 2026" dipertahankan sebagai fakta threat-model, tanpa narasi
pribadi). Catatan redaksi ditambahkan di kepala file. Tidak ada nilai
sensitif yang diungkap di dokumen ini maupun di laporan rescan di bawah.

**Rescan mirror (2026-11-08, setelah redaksi):** pencarian menyeluruh
di `site/` untuk fragmen wallet, alamat Solana, email, dan frasa narasi
insiden pribadi — **nol temuan di `site/DATA-PLAN.md`** dan di seluruh
mirror, KECUALI satu sisa:

- `site/server/src/actions.ts` baris 51: komentar kode yang merujuk
  insiden pribadi (tanpa nilai wallet, tanpa secret). Ini adalah
  komentar di dalam KODE yang di-mirror — mengubahnya di mirror akan
  membuat mirror menyimpang dari source live dan menggeser nomor baris
  yang dirujuk kedua audit. Perbaikan komentar ini adalah edit source
  live (tahap b) dan dicatat sebagai **follow-up tahap (b)**, bukan
  diperbaiki diam-diam di sini.
- `@samtekis` muncul hanya sebagai aturan build "jangan sajikan sebagai
  Instagram" — handle X publik, dipertahankan.
- `site/client/src/App.tsx` dan `GIBRAN_SITE_KNOWLEDGE` menyebut insiden
  7 Nov 2026 hanya secara generik (tanpa fragmen wallet) — itu copy
  produk live; bila pemilik ingin mengubahnya, itu follow-up terpisah.
- **Presisi v2.3.9:** narasi insiden di string kode terdapat di
  `site/server/src/actions.ts` baris 1089 (`GIBRAN_SITE_KNOWLEDGE` —
  "mendirikan platform ini setelah mengalami sendiri kehilangan aset
  karena link klaim airdrop palsu (kejadian pengurasan wallet pada
  7 Nov 2026)") dan komentar baris 51 (`KNOWN_BAD_DOMAINS` —
  "Domains confirmed as drainers in the user's own 2026-11-07
  incident"). Keduanya adalah kode/copy live yang di-mirror — bukan
  fragmen wallet dan bukan secret — perbaikannya adalah edit source
  live tahap (b), dicatat sebagai follow-up, bukan diedit diam-diam
  di mirror.

**Yang TIDAK diperbaiki di v2.3.8 (dicatat eksplisit):**
`DATA-PLAN.md` di live artifact (`~/workspace/ts-spaces/cek-link-airdrop/`)
MASIH berisi narasi asli. Perbaikannya adalah follow-up terpisah lewat
artifact workflow — file live artifact TIDAK PERNAH diedit langsung.
**Risiko tersisa:** rendah — narasi di live artifact tidak terekspos
publik lewat repo; sisa komentar kode di mirror tidak mengandung nilai
sensitif.
**Aksi berikutnya:** follow-up artifact untuk DATA-PLAN.md live +
komentar `actions.ts:51` saat tahap (b) disetujui.

### F-007 — Medium: log mentah v2.3.6 yang dikutip tidak ada di repo — **partially addressed**

**Temuan (diterima):** log mentah v2.3.6 dikutip di `SSRF_SPIKE_V236.md`
dan `SSRF_RECONCILIATION_V237.md` tetapi tidak ada di repo; root
`.gitignore` baris 8 (`*.log`) mengecualikannya. V2 menurunkan ST-08
menjadi "reported PASS in VM documentation; complete run logs NOT
PROVIDED". Penilaian itu **benar pada saat audit** dan diterima.
**Respons (tahap a — bukti):** bundle `evidence/v236/` diterbitkan —
21 file `.txt` salinan byte-identik dari `spike-harness-v236/*.log`
(verifikasi `cmp`: 21/21 OK) + `evidence/v236/MANIFEST.md` dengan
test ID, nomor run, timestamp UTC, harness commit `fc798ce`, host/VM
`htch-runtime`, kernel Linux 7.0.0-43-generic x86_64, Bun 1.4.4, Node
v24.22.1, Python 3.12.3, dan SHA-256 tiap file. File `.txt` dipilih agar
tidak dikecualikan `.gitignore`; verifikasi `git status` 2026-11-08:
`evidence/` ter-track (untracked, bukan ignored).

**Caveat material (dicatat jujur, bukan disembunyikan):**

1. `su-run4.txt` hanya 194 byte / 2 baris (baris PASS SU-T9 +
   ringkasan `9/9 PASS`), mtime 14:10:42 UTC — LEBIH AWAL dari
   su-run1..3. Ini ekor run, bukan log lengkap. Output lengkap run
   ke-4 TIDAK tersimpan dan tidak ada salinan lain di mesin ini.
   Klaim "9/9 × 4" bersandar pada **3 log lengkap + 1 ekor**.
   Status yang benar: **"reported PASS in VM documentation" dengan 3
   log lengkap** — bukan "4 log lengkap".
2. Percobaan gagal awal SU-T5 (8/9 × 3 run): **tidak ada log mentah**
   yang tersimpan — hanya diagnosis prose di `SSRF_SPIKE_V236.md`
   §0.1. Dicatat NOT PRESERVED (tidak dapat dipulihkan), tidak
   direkonstruksi.
3. OPS-T7 didokumentasikan "PASS × 3 run" (`SSRF_SPIKE_V236.md` §2.3)
   tetapi hanya 2 log (`opsrec-run1/2`) yang ada. Run ketiga NOT
   PRESERVED.
4. Perintah shell eksak tiap run tidak tercatat di dokumen spike —
   NOT VERIFIED (file harness tercatat dan dapat dijalankan ulang).
   Exit status per run tidak tercatat terpisah — NOT VERIFIED sebagai
   angka (baris ringkasan PASS ada di dalam log).
5. Log v2.3.2/v2.3.3/v2.3.4/v2.3.5 hanya ada sebagai kutipan verbatim di
   dokumen spike — kutipan dokumen, bukan log mentah terverifikasi hash.

**Suplemen v2.3.9 (menutup caveat 1 dan 3 — 2026-11-08):** bundle baru
`evidence/v236-supplement-20261108/` + `MANIFEST.md` sendiri. Dijalankan
ulang dari `spike-harness-v236/` (harness commit `fc798ce`, tidak berubah
sejak v2.3.6):

- SU-T1..SU-T9, 4 run lengkap (supp-1..4, 2026-11-07T17:29:40Z /
  17:29:49Z / 17:29:57Z / 17:30:06Z, exit 0, **9/9 PASS tiap run**,
  masing-masing 11 baris lengkap) — perintah
  `node su-v232/run-tests.cjs 1..4`.
- OPS-T7 run ketiga (supp-3, 2026-11-07T17:30:15Z, exit 0, **PASS**,
  5 baris lengkap) — perintah `node ops-recovery.cjs`.
- **Verifikasi silang:** `su-supp-run1.txt` byte-identik dengan
  `evidence/v236/su-run1.txt` (`diff` exit 0); `ops-t7-supp-run3.txt`
  berbeda dari `opsrec-run1.txt` hanya pada nomor inode/PID (nilai
  spesifik-per-proses), semua boolean identik.
- **Bukan pengganti, bukan rekonstruksi:** file `evidence/v236/` TIDAK
  diubah; klaim v2.3.6 tetap bersandar pada bukti lama. Justifikasi
  re-run (protokol melarang re-run tes berbukti valid): log run ke-4
  yang tersimpan tidak lengkap (ekor) dan log run ketiga OPS-T7 tidak
  ada — celah bukti nyata, bukan pengulangan. Bila hasil berbeda dari
  klaim lama, perbedaan akan dilaporkan apa adanya (tidak terjadi:
  semua PASS).
- **Tetap NOT PRESERVED:** run gagal awal SU-T5 (caveat 2) — tidak
  direkonstruksi; log mentah v2.3.2–v2.3.5 (caveat 5); perintah shell
  eksak tiap run v2.3.6 asli (caveat 4 — untuk run suplemen, perintah
  dan exit status TERCATAT di manifest suplemen).

**Risiko tersisa:** seorang reviewer independen tetap tidak dapat
memverifikasi run ke-4 SU dan run ketiga OPS-T7 dari bukti mentah.
**Aksi berikutnya:** tidak ada — bukti yang hilang tidak dapat
dipulihkan; bila ChatGPT meminta pengulangan, pengulangan SU-T1..SU-T9
di staging (STAGE-P05/ST-08 aspek staging) adalah jalurnya, BUKAN
rekonstruksi log lama. Protokol melarang pengulangan tes berbukti valid
tanpa alasan teknis — tetapi run yang log-nya tidak tersimpan memang
termasuk pengecualian itu bila reviewer memintanya.

### F-008 — Medium: penjelasan SU-T5 di v2.3.7 TIDAK AKURAT — **addressed**

**Temuan (diterima):** `SSRF_RECONCILIATION_V237.md` §1 (baris ST-08)
dan §2 ("Koreksi bug harness SU-T5") menjelaskan kegagalan SU-T5 awal
sebagai "fd lock lalu `process.exit()` tanpa `flock.unlock()`" —
padahal kode committed tidak pernah memakai flock di jalur itu.
**Verifikasi terhadap kode committed (2026-11-08):**

- `spike-harness-v236/su-v232/lock-racer.cjs` memanggil
  `fs.closeSync(r.fd)` sebelum `process.exit(0)` — dan tidak pernah
  memakai flock.
- `spike-harness-v236/su-v232/startup.cjs` `acquireStartupLock()`
  memakai `fs.openSync(lockPath, 'wx')` (exclusive-create) — BUKAN
  flock.
- Blob SHA `lock-racer.cjs` identik antara salinan v2.3.2 dan v2.3.6:
  git blob `8c7a33ac88c3514f7841245eb45c5a1639b0fbc0`, SHA-256
  `d0d816f132850de330afa29fc8cafc104f6ac7937e3eaab2103151cfc52a9aed`.
- Diagnosis yang benar sudah ada di `SSRF_SPIKE_V236.md` §0.1:
  salinan harness v2.3.6 awalnya **tidak menyertakan `lock-racer.cjs`**
  — child mati module-not-found tanpa stdout → `no-output`; menyalin
  helper dari v2.3.2 menyelesaikan setup failure.

**Koreksi yang dilakukan:** `SSRF_RECONCILIATION_V237.md` diperbaiki
secara transparan — teks yang salah TIDAK dihapus diam-diam, melainkan
ditandai dengan catatan koreksi v2.3.8 (tanggal, apa yang salah, apa
yang benar, referensi bukti) dan §D.4.16 desain v2.3.8 dikoreksi sama.
Jalur SU-T5 TIDAK PERNAH disebut sebagai tes flock() — ia adalah tes
startup-lock exclusive-create.
**Risiko tersisa:** nol untuk butir ini — koreksi dapat diverifikasi
langsung dari kode committed.
**Aksi berikutnya:** tidak ada; ChatGPT diminta memverifikasi koreksi
ini terhadap kode pada audit berikutnya.

### F-009 — Medium: mirror tidak dapat mereproduksi dependency graph/build — **partially addressed**

**Temuan (diterima):** tanpa lockfile, tanpa test suite/CI, SDK tarball
via path lokal absolut, Bun site 1.3.10 vs spike 1.4.4.
**Respons (tahap a — bukti, sejauh yang dapat diverifikasi):**

- `site/bun.lock` (19.190 byte, lockfileVersion 2) **kini di-mirror**
  — disalin dari live artifact dan diverifikasi byte-identik
  (SHA-256 `a7e1457ee5cb6423d6e2a08c4058fd63c1c05f5a17b01f5bd8d1aebe1d89405f`).
  Ini perbaikan reproduksibilitas, bukan perubahan kode. Lockfile
  mencatat SDK dengan sha512
  `Q/jCTu/HlF3TRgWVdYvs8wSqu4J5eZ2nxtLxIbpOaGJ1j0oKkCLHT4r1DZkkMTDbdvr12YZUGL4KX9pzyNB+Xw==`.
- `SSRF_REPRODUCIBILITY_V238.md` ditulis: versi Bun site (1.3.10,
  dari `packageManager`) vs spike (1.4.4) dicatat **apa adanya tanpa
  diselaraskan secara palsu**; daftar dependensi `package.json`
  lengkap; identitas/path SDK tarball + catatan builder-local.
- **Yang tetap NOT VERIFIED (dicatat, bukan ditutup-tutupi):**
  tarball SDK sendiri tidak dapat diambil independen di luar builder —
  provenance-nya tetap NOT VERIFIED; **tidak ada test suite site**
  (tidak ada file `*.test.*`/`*.spec.*`, tidak ada script `test` di
  `package.json` — verifikasi 2026-11-08); **tidak ada CI**
  (tidak ada `.github/workflows` di repo); **tidak ada hasil
  typecheck/build** — `package.json` punya script `typecheck` dan
  `build`, tetapi menjalankannya butuh `node_modules` yang tidak ada
  di mirror, dan build dilarang oleh house rules mirror
  (build/ship hanya via artifact tools, tidak pernah `bun build`).
  Hasil build/typecheck hanya dapat diperoleh lewat artifact workflow
  yang sah, bukan dari VM ini.
- **Bun yang dicatat:** site `1.3.10` (deklarasi `packageManager`),
  spike/VM ini `1.4.4`, Node `v24.22.1`, Python `3.12.3`, kernel
  Linux 7.0.0-43-generic x86_64. Perbedaan versi dicatat sebagai fakta;
  tidak ada klaim "konsisten".

**Verifikasi v2.3.9 (2026-11-08, di salinan scratch — BUKAN di live
artifact, TIDAK mengubah file live):**

- **SDK tarball TERBUKTI ADA:** `/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`,
  2.051.070 byte, SHA-256
  `f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`,
  `@hatch/space-sdk` versi **0.14.0** (dari `package.json` di dalam
  tarball). Yang terverifikasi: keberadaan + versi + hash. Yang tetap
  NOT VERIFIED: provenance (file builder-local, mtime 1 Jan 1980 —
  tidak ada rantai sumber/commit/signature yang dapat diperiksa dari
  repo).
- **`bun install --frozen-lockfile` di salinan scratch
  (`/tmp/scratch-site`, salinan `site/`): exit 0** — 79 paket
  terinstal (4,73 dtk), `bun.lock` TIDAK berubah (SHA-256
  `a7e1457e…` sebelum dan sesudah install — sama dengan yang dicatat
  v2.3.8). Lockfile KONSISTEN dengan `package.json`. Catatan: install
  berjalan di bawah Bun 1.4.4 (VM ini), BUKAN Bun 1.3.10 yang
  dideklarasikan `packageManager` — konsistensi di bawah 1.3.10 tetap
  NOT VERIFIED.
- **Typecheck di salinan scratch: client exit 0, server exit 0**
  (script `typecheck` dari `package.json`: `bun x tsc --noEmit -p
  client/tsconfig.json && bun x tsc --noEmit -p server/tsconfig.json`,
  TypeScript 5.6.3 dari lockfile, Bun 1.4.4). Ini typecheck, BUKAN
  build.
- **Build penuh (`bun run build`) TIDAK dicoba** — house rules mirror
  mencadangkan build/ship hanya untuk artifact tools; build yang sah
  adalah yang dilakukan pipeline artifact (v11 perbaikan outage,
  v12 revisi narasi — keduanya sukses). Tidak ada klaim build dari
  VM ini.
- **Tidak ada test suite site** (tetap — verifikasi v2.3.8 berdiri)
  dan **tidak ada CI** (tetap — tidak ada `.github/workflows`).

**Risiko tersisa:** reviewer independen tetap tidak dapat membangun
mirror dari nol tanpa builder Hatch (SDK tarball) dan tanpa CI.
**Aksi berikutnya:** bila pemilik menginginkan reproduksibilitas penuh,
keputusannya ada di luar v2.3.8 (vendoring SDK / registry internal /
CI) — bukan pekerjaan desain.

## §3. U-46 — definisi lengkap (tanpa keputusan)

U-46 adalah divergensi kebijakan, bukan perbedaan penamaan. Definisi
lengkap ini menjawab V2 §8 butir 9 dan keputusan pemilik 2026-11-07
~23:56 WIB yang meminta U-46 didefinisikan lengkap. **Dokumen ini TIDAK
memutuskan** — keputusan tertulis tetap di tangan pemilik proyek (Rama).

**Definisi masalah:** evaluasi ChatGPT §2.2 melarang fallback ke numeric
`kill(pid)` ("Never fall back to numeric kill(pid)"). Desain v2.3.6
STAGE-P07 mengizinkan fallback numeric-kill terkuantifikasi HANYA
dengan persetujuan eksplisit owner dan BUKAN sebagai default. Kedua
posisi tidak dapat dipenuhi bersamaan — salah satu harus dipilih sebelum
implementasi pensinyalan worker.

**Status:** TERBUKA — belum diputuskan. Blokir B-11 di register V2.
Status desain tetap DESIGN REVIEW ONLY; U-46 tidak memblokir pekerjaan
desain tahap (a), tetapi MEMBLOKIR implementasi pensinyalan (tahap b)
sampai diputuskan.

**Owner keputusan:** Rama (pemilik proyek). Bukan Muse, bukan ChatGPT.
Keputusan harus tertulis (di repo atau pesan yang tercatat) dan menyebut
opsi yang dipilih + tanggal.

**Fakta teknis yang menjadi dasar (terbukti di VM, bukan opini):**

- Jalur utama pidfd menutup kill-salah-sasaran: `pidfd_send_signal`
  terikat struct pid, dibuktikan PIDFD-T2/T12d (`evidence/v236/`
  `pidfd-run1/2.txt`, `pidfd-t12-run1/2.txt`).
- Residual pidfd adalah tabrakan starttime (U-41): P ≈ 7e-9/cleanup
  pada pid_max default 4.194.304; ≈ 8,8e-7 pada pid_max=32768;
  ≈ 7,1e-6 pada pid_max=4096; ≈ 2,8e-5 pada pid_max=1024
  (PIDFD-T9, `window-run1/2.txt`). Estimasi orde-besaran, bukan
  probabilitas eksak.
- Fallback numeric-kill memakai mitigasi v2.3.2 (validasi sesaat
  sebelum sinyal + baca ulang starttime) dengan jendela ~46 µs
  (p99 terukur 41,7–46,0 µs) — jendela inilah yang dievaluasi.

**Opsi yang tersedia (trade-off):**

| Opsi | Isi | Risiko residual | Biaya |
| --- | --- | --- | --- |
| (a) Terima fallback terkuantifikasi v2.3.6 | Numeric-kill diizinkan HANYA bila pidfd tidak tersedia, HANYA dengan persetujuan owner tertulis per deployment, BUKAN default; mitigasi v2.3.2 + jendela ~46 µs berlaku | Kill-salah-sasaran terkuantifikasi tetap ada (U-41: P ≈ 7e-9/cleanup pada pid_max default; naik bila pid_max kecil — STAGE-P08 wajib mencatat pid_max produksi; PASS ≤ 1e-6, kondisional ≤ 1e-5 dengan persetujuan tertulis, BLOCK > 1e-5) | Nol perubahan desain; satu baris kebijakan |
| (b) Adopsi larangan evaluasi | Fallback numeric-kill DILARANG mutlak; bila pidfd tidak tersedia, pensinyalan worker harus memakai salah satu alternatif evaluasi §2.4: retained child-process handle, supervisor, atau Bun documented termination API | Risiko kill-salah-sasaran via numeric-kill hilang; risiko baru: ketiga alternatif itu BELUM ADA di desain dan BELUM TERBUKTI di VM/staging — masing-masing butuh desain + bukti sendiri sebelum implementasi | Desain fallback ditulis ulang; bukti baru wajib sebelum tahap (b) |

**Prasyarat sebelum keputusan dapat dieksekusi (mana pun opsinya):**

1. pid_max produksi tercatat (STAGE-P08) — memengaruhi angka risiko
   opsi (a) dan urgensi opsi (b).
2. Ketersediaan `bun:ffi` → pidfd di runtime produksi terbukti atau
   tidak (STAGE-P01) — bila pidfd TERBUKTI tersedia, fallback hampir
   tidak pernah terpakai dan urgensi U-46 turun; bila TIDAK tersedia,
   U-46 menjadi keputusan yang menentukan arsitektur pensinyalan.
3. Bila opsi (b) dipilih: desain + bukti untuk alternatif yang dipilih
   (retained handle / supervisor / API Bun) harus selesai DULU —
   tidak boleh memutuskan (b) lalu mengimplementasikan tanpa pengganti.

**Kriteria penerimaan (agar U-46 dinyatakan TERTUTUP):**

- Keputusan tertulis pemilik menyebut opsi (a) ATAU (b) + tanggal.
- Bila (a): persetujuan tertulis per deployment tercatat; STAGE-P08
  (pid_max produksi) PASS ≤ 1e-6 atau kondisional ≤ 1e-5 dengan
  persetujuan; fallback TIDAK menjadi default di kode (gating
  eksplisit).
- Bila (b): desain alternatif pengganti selesai + bukti VM-nya ada +
  fallback numeric-kill dihapus dari desain (tidak ada jalur kode yang
  memanggilnya).
- Sampai semua itu terpenuhi, U-46 tetap TERBUKA dan implementasi
  pensinyalan tetap DIBLOKIR.

## §4. DG-1..DG-3 — persyaratan desain (V2 §8 butir 9, B-12)

Persyaratan berikut dimasukkan ke desain v2.3.8 (§D.4.18, §G) dengan
kriteria tes — bukan diklaim sudah ada (v2.3.7 sudah mencatat pencarian
teks di desain v2.3.6: nol kemunculan "0600", "NOFOLLOW", "symlink"):

- **DG-1 — mode file lock 0600:** file lock dibuat dengan mode `0600`
  (owner read/write saja) dan direktori lock `0700`; verifikasi mode
  saat startup, gagal → NOT_READY. Kriteria tes: `stat` mode file
  `0600`; proses dengan UID lain tidak dapat membaca/menulis file.
- **DG-2 — open O_NOFOLLOW + validasi fstat:** pembukaan file lock
  memakai `O_NOFOLLOW` (atau padanan Bun/Node); setelah open, `fstat`
  memvalidasi fd adalah file regular milik UID layanan dengan
  (dev,ino) yang dicatat; mismatch → tolak + page. Kriteria tes:
  symlink di path lock → open gagal ELOOP; file diganti antar
  open dan fstat → terdeteksi.
- **DG-3 — penolakan symlink/non-regular:** path lock yang berupa
  symlink, FIFO, socket, atau direktori DITOLAK saat startup
  (bukan diikuti). Kriteria tes: tiap jenis non-regular di path lock →
  startup NOT_READY dengan alasan yang tercatat.

## §5. Jawaban atas Handoff V1 (6 butir) dan V2 §8 (9 butir)

### V1 — Muse Handoff / Required Response

1. **Remediate F-001 sebelum scanner aktif** — Dijawab sebagai DESAIN
   (§2.1 di atas + §D.4.18); implementasi BLOCKED tahap (b). Threat
   model mencakup initial URL, DNS/pinning, tiap redirect, script
   fetch. Link Scanner tetap nonaktif.
2. **Deterministic SSRF harness** — Spesifikasi H-SSRF-01..20 di §2.1
   (IPv4/IPv6, private/loopback/link-local/metadata, mapped,
   zone-scoped, mixed DNS, rebinding, redirect-to-private,
   script-src-to-private, bentuk IP non-kanonik, userinfo). Harness
   BELUM dijalankan — ia menguji implementasi tahap (b) yang belum ada.
   Log mentah + manifest akan mengikuti format `evidence/v236/`.
3. **Fix F-002/F-003** — Desain di §2.2/§2.3 + §D.4.18; implementasi
   BLOCKED tahap (b). Harness H-RES-01..06 disiapkan.
4. **Fix F-004 + verifikasi F-005** — Desain di §2.4/§2.5 + §D.4.18;
   implementasi BLOCKED tahap (b). Harness H-CAT-01..03, H-AUTH-01..03.
5. **Clean F-006** — Selesai di mirror (§2.6); rescan dilaporkan
   tanpa mengungkapkan nilai sensitif. Follow-up live artifact tercatat.
6. **Response matrix** — Dokumen ini.

### V2 — §8 Muse Handoff / Required Response

1. **Response matrix F-001..F-006** — Dokumen ini (§1–§2); status
   eksplisit per butir; edit dokumen saja tidak menutup temuan kode
   (F-001..F-005 tetap blocked).
2. **Resolve F-001** — Desain + harness selesai (§2.1); implementasi
   BLOCKED tahap (b) — "resolve" penuh tidak dapat diklaim sebelum
   otorisasi + bukti staging.
3. **Resolve F-002/F-003** — Sama: desain + harness selesai;
   implementasi BLOCKED tahap (b).
4. **Resolve F-004/F-005** — Sama: desain + harness selesai;
   implementasi BLOCKED tahap (b); mekanisme otorisasi butuh keputusan
   pemilik.
5. **Resolve F-006** — Selesai di mirror; rescan terdokumentasi (§2.6).
6. **Correct F-007/F-008** — Bundle bukti + koreksi SU-T5 selesai
   (§2.7, §2.8); kegagalan awal, helper, dan tiap clean run dapat
   dilacak terpisah (dengan caveat yang dinyatakan).
7. **Resolve F-009** — Sebagian: lockfile di-mirror + manifest
   reproduksibilitas (§2.9). SDK provenance, test suite/CI, dan hasil
   build/typecheck tetap NOT VERIFIED — dinyatakan, bukan ditutup.
8. **Prepare staging tanpa menjalankan tes** — Inventaris staging
   template di `SSRF_REMEDIATION_DESIGN.md` §D.4.19: tiap gate
   ST-01..ST-16 mendapat owner, precondition, prosedur aman, aturan
   PASS/FAIL, dan destinasi bukti. Belum ada staging yang
   diinventarisasi (lingkungan staging belum ada — blocker yang sudah
   diketahui).
9. **Resolve U-46 dan DG-1..DG-3** — U-46 didefinisikan lengkap di §3
   (tanpa keputusan); DG-1..DG-3 masuk desain dengan kriteria tes
   (§4). Tidak ada fallback ambigu yang tersisa di desain — fallback
   numeric-kill dinyatakan bersyarat eksplisit pada keputusan owner.

## §6. Yang TIDAK diklaim v2.3.9

- Tidak ada implementasi kode F-001..F-005.
- Tidak ada perubahan perilaku aplikasi live; tidak ada perubahan
  database/katalog; tidak ada production build; Link Scanner tidak
  diaktifkan. Public tester TIDAK disentuh.
- **Tes harness baru YANG dijalankan di v2.3.9 (berbeda dari v2.3.8):**
  5 run suplemen bukti v2.3.6 — SU-T1..SU-T9 4× lengkap 9/9 +
  OPS-T7 run ke-3 PASS (`evidence/v236-supplement-20261108/` +
  `MANIFEST.md`). Ini run SUPLEMEN BARU, bukan pengulangan klaim lama
  dan bukan bukti staging — bukti VM, seperti semua bukti spike.
- Tidak ada klaim "F-001..F-005 selesai" — kelimanya BLOCKED sampai
  tahap (b) + harness staging PASS.
- Sampai commit v2.3.9 masuk `main`, tidak ada kemajuan teknis yang
  dapat diverifikasi dari repo.

## §7. Yang butuh keputusan Rama (pemilik proyek)

1. **Otorisasi implementasi tahap (b) untuk F-001..F-005** — TIDAK
   diberikan saat ini. Tanpa ini, kelima temuan tetap OPEN dan Link
   Scanner tetap nonaktif. Bila diberikan, sebutkan ruang lingkupnya
   (semua lima temuan, atau per temuan) + tanggal.
2. **Keputusan U-46** — opsi (a) terima fallback terkuantifikasi ATAU
   opsi (b) larang mutlak + ganti fallback (§3). Tanpa ini,
   implementasi pensinyalan tetap diblokir.
3. **Mekanisme otorisasi addProject (F-005)** — v2.3.9 memverifikasi
   fakta dari kode: auth di dalam kode TERBUKTI TIDAK ADA, tidak ada
   pemanggil di `client/src/`, provenance disimpan verbatim dari
   caller. Yang masih butuh pemilik: pilih mekanisme otorisasi (sesi
   admin / token layanan / daftar pemanggil) + fakta scoping endpoint
   runtime artifact.
4. **Follow-up DATA-PLAN.md live artifact** — perbaikan narasi di
   situs live lewat artifact workflow (bukan edit langsung).
5. **Staging (tahap 3)** — lingkungan staging produksi yang sampai
   hari ini belum ada; tanpa itu ST-01..ST-16 tidak dapat diuji.
