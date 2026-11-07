# SSRF RESPONSE MATRIX v2.3.13 — Jawaban atas Audit Independen ChatGPT V6

**Dokumen:** matriks respons revisi desain v2.3.13
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_INDEPENDENT_AUDIT_V6.md` (commit `0e5b931`, 2026-11-08)
  — temuan baru F-023, F-024, F-025 + Muse Handoff §10 (11 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.13:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.13 — §D.4.24 ringkasan revisi, risiko baru U-59..U-62 di §G,
gerbang G-H baru). Matriks v2.3.12 (`SSRF_RESPONSE_MATRIX_V2312.md`)
dipertahankan utuh sebagai catatan sejarah revisi itu. Temuan F-001..F-022
dibawa ke sini dengan status terbarunya; yang baru di v2.3.13 hanyalah
F-023, F-024, F-025, koreksi oracle H-RES-02/03/05, klarifikasi
semantik kepemilikan G-F, dan koreksi catatan "live untouched" v2.3.12.

**Yang TIDAK dilakukan v2.3.13:** tidak ada kode aplikasi yang diubah
(tidak ada file `.ts`/`.tsx` yang disentuh), tidak ada perubahan
database/katalog, tidak ada production build, tidak ada pemanggilan
action produksi apa pun (termasuk `checkLink` — tidak di-invoke),
Link Scanner tidak diaktifkan, public tester tidak disentuh.
Bukti yang dipakai adalah: hitungan fixture yang diverifikasi dua alat
independen (Python + Node.js) dan eksperimen read-only VM lokal atas
perilaku `fetch` Bun terhadap gzip/br (server + klien di `127.0.0.1`,
tanpa jaringan eksternal, tanpa artifact live).

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.13

Sesuai keputusan pemilik proyek (2026-11-07 ~23:56 WIB, dikonfirmasi
~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan tidak boleh
dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.13.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.13 TIDAK mengimplementasikan apa pun. **HOLD perubahan source tetap berlaku (F-020, §2, §6).** |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.13. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.**

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Tidak ada butir yang berstatus ini di v2.3.13 — semua temuan V6 diterima sebagai sah. |

## §1. Ringkasan status F-001..F-025

| ID | Severity | Status v2.3.13 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah: desain + harness H-SSRF-01..20 selesai; implementasi menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Implementasi tetap menunggu tahap (b); **oracle tes DIKOREKSI v2.3.13** (F-023/F-024/F-025 §2): fixture H-RES-02 feasible + terverifikasi angkanya, lapisan byte H-RES-03 didefinisikan terpisah + perilaku Bun teruji di VM, angka aggregate H-RES-05 ditetapkan 1.000.000 byte. |
| F-003 | High — tanpa total deadline | **blocked** | Tidak berubah: deadline total 30 detik PARTIALLY MITIGATED di kode mirror (d85a1e2) — tanpa tes regresi, status penutupan TIDAK berubah: tetap OPEN sampai H-RES-06 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Tidak berubah: desain unique constraint selesai; implementasi (termasuk migrasi DB) menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Tidak berubah: auth di dalam kode TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED; mekanisme otorisasi butuh keputusan pemilik. |
| F-006a | Medium — redaksi dokumen mirror `site/DATA-PLAN.md` | **addressed** | Tidak berubah. |
| F-006b | Medium — narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`; cleanup tetap butuh edit source + otorisasi terpisah. |
| F-006c | Medium — DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah: status tetap "reported by Muse, not independently verified"; bukti versi/diff live (a)–(c) tetap belum tersedia. |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Tidak berubah (lihat §3 V6 §8.1). |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Tidak berubah. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | Tidak berubah: keputusan Bun kanonik 1.3.10 berdiri; provenance SDK tetap NOT VERIFIED; status keseluruhan tetap NOT REPRODUCIBLE untuk clean external builder. **BARU v2.3.13:** bukti VM H-RES-03 memakai Bun 1.4.4 — perilaku pada 1.3.10 NOT VERIFIED (risiko U-62). |
| F-010 | Medium — bundle SU asli mengulang RUN=1 di tiga file | **addressed** (sebagai koreksi bukti) | Tidak berubah; koreksi V5 §6.1 / V6 §8.1 diterima dan dipertahankan terlihat. |
| F-011 | Medium — matriks fitur tester statis tidak cocok dengan client | **addressed** (sebagai koreksi dokumen) | Tidak berubah; tester tetap ON HOLD. |
| F-012 | Medium — F-006 dinyatakan addressed padahal residu masih ada | **addressed** (sebagai pemisahan status) | Tidak berubah. |
| F-013 | Medium — owner gate staging tidak lengkap | **partially addressed** | Tidak berubah: operator/kanal alert/egress/DB tetap UNASSIGNED/BLOCKED; tidak ada gate READY. Kriteria ST-12-LAT-01..03 dipertahankan. |
| F-014 | Medium — catatan reproduksibilitas basi | **partially addressed** | Tidak berubah selain catatan Bun v2.3.13 (U-62). |
| F-015 | Low/Medium — DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode | **addressed** (mirror) / **blocked** (live) | Tidak berubah; teks koreksi live sudah disiapkan, belum diterapkan. |
| F-016 | Medium — cache hasil scan basi (false-negative) | **partially addressed** | Tidak berubah: cabang pilihan dinyatakan (hapus cache dari semua jalur security-scan); implementasi + tes menunggu tahap (b) + HOLD F-020. |
| F-017 | Medium — cache key mengabaikan cap | **partially addressed** | **BARU v2.3.13:** semantik kepemilikan G-F DIKLARIFIKASI (§2 G-F) — cabang pilihan adalah rekomendasi yang menunggu penerimaan owner, BUKAN otorisasi implementasi; F-017 + H-CACHE-05/06 menjadi NOT APPLICABLE HANYA SETELAH cabang penghapusan cache diimplementasikan, bukan sebelumnya. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | Tidak berubah: kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checklink` MASIH TERDAFTAR (paket F-021); tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. Deployment tetap BLOCKED. |
| F-020 | Medium — scope refactoring source mirror perlu klarifikasi otorisasi | **partially addressed** | Tidak berubah: HOLD dipertahankan; tidak ada perubahan source di v2.3.13; tidak ada revert d85a1e2; tidak ada artefak approval terpisah di repo. |
| F-021 | Medium — bukti artifact-state tidak auditable | **partially addressed** | Tidak berubah: paket bukti + digest dipublikasikan v2.3.12; version/digest artifact tetap NOT PROVIDED (tidak diekspos tool). |
| F-022 | Medium — keputusan cache + oracle tes cap tidak koheren | **partially addressed** | **BARU v2.3.13:** tiga cacat oracle yang ditemukan V6 (F-023/F-024/F-025) DIKOREKSI pada level desain (§2); implementasi + tes H-CACHE/H-RES tetap menunggu tahap (b) + staging. |
| F-023 | Medium — H-RES-02 berisi kondisi fixture UTF-8 yang mustahil | **addressed** (desain) | **BARU v2.3.13:** arah mustahil DIHAPUS; tiga fixture feasible dengan angka eksak + SHA-256 dipublikasikan di `evidence/f023-h-res02-fixtures/`; hitungan diverifikasi dua alat independen. Harness staging belum dijalankan. |
| F-024 | Medium — H-RES-03 tidak mendefinisikan lapisan byte yang di-cap | **addressed** (desain) | **BARU v2.3.13:** tiga lapisan didefinisikan terpisah (L0 wire — tidak dapat diobservasi via `Response.body`, tanpa klaim cap aplikasi; L1 decoded-body — ditegakkan; L2 aggregate — ditegakkan); perilaku Bun teruji di VM lokal (`evidence/f024-h-res03-bun-fetch/`). Perilaku pada Bun kanonik 1.3.10 NOT VERIFIED (U-62). |
| F-025 | Medium — H-RES-05 tanpa angka aggregate budget | **addressed** (desain) | **BARU v2.3.13:** angka aggregate ditetapkan **1.000.000 decoded byte per scan** + max 3 script + per-request caps + overhead 0 + kebijakan redirect-body + perilaku cancel concurrency-safe (§2). Tes staging belum dijalankan. |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif. Tidak ada public deployment yang
diotorisasi.**

## §2. Respons per temuan baru V6

### F-023 — Medium: H-RES-02 berisi kondisi fixture UTF-8 yang mustahil — **addressed** (desain; fixture + hitungan terverifikasi, harness staging belum dijalankan)

**Temuan (diterima):** H-RES-02 v2.3.12 meminta konten berbahaya
"setelah batas 300.000 UTF-16 code unit tetapi sebelum 300.000 raw
byte UTF-8" dan sebaliknya. Arah pertama mustahil: untuk setiap
urutan skalar Unicode yang valid, panjang byte UTF-8 selalu ≥ jumlah
UTF-16 code unit.

**Bukti ketidakmungkinan (dicatat sebagai teorema fixture, bukan
opini):** ASCII memakai 1 byte = 1 code unit; BMP non-ASCII memakai
2–3 byte = 1 code unit; supplementary memakai 4 byte = 2 code unit.
Jadi byte ≥ code unit untuk setiap karakter, dan untuk seluruh
string. String dengan >300.000 code unit tetapi <300.000 byte tidak
dapat dibuat. **Arah mustahil itu DIHAPUS dari H-RES-02 di v2.3.13.**

**Fixture feasible pengganti (dipublikasikan + diverifikasi):**
`evidence/f023-h-res02-fixtures/` — setiap fixture = PREFIX × karakter
uji + marker `XSS-MARKER-RES02` (16 karakter ASCII = 16 byte = 16 CU)
+ 1 × karakter uji. Marker diletakkan tepat pada offset byte 300.000
(batas cap H-RES-02 = 300.000 decoded-body byte).

| Fixture | Karakter uji | Prefix | Total char | Code point | UTF-16 CU | UTF-8 byte | Marker offset byte | Marker offset CU |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `h-res-02-a-e9.txt` | U+00E9 (é, 2 byte / 1 CU) | 150.000 | 150.001 | 150.017 | 150.017 | **300.018** | **300.000** | 150.000 |
| `h-res-02-b-grinning-face.txt` | U+1F600 (😀, 4 byte / 2 CU, supplementary plane) | 75.000 | 75.001 | 75.017 | 150.018 | **300.020** | **300.000** | 150.000 |
| `h-res-02-c-euro.txt` | U+20AC (€, 3 byte / 1 CU) | 100.000 | 100.001 | 100.017 | 100.017 | **300.019** | **300.000** | 100.000 |

Fixture A mengikuti contoh audit V6 (150.001 × U+00E9) dengan marker
disisipkan setelah 150.000 karakter pertama — tepat setelah batas
300.000 byte. Fixture B adalah fixture supplementary-plane yang
diminta audit. Fixture C menambahkan kelas 3-byte agar ketiga kelas
multibyte UTF-8 tercakup.

**Verifikasi hitungan (dua alat independen, hasil cocok persis):**
Python 3.12.3 (`len(encode("utf-8"))`, `len(encode("utf-16-le"))//2`)
dan Node.js v24.22.1 (`Buffer.byteLength(s,"utf8")`, `s.length`,
`Buffer.byteLength` atas prefix sampai marker) menghasilkan angka
yang sama; `wc -c` mengonfirmasi 300018 / 300020 / 300019.
SHA-256 fixture: A
`dda664cba78a3fa77acca69b9082df7928c4a9851df525c7906948a1f935b496`,
B `4e78301a403aeb506efc7f6b47b97eccadd7bbe467404d54774c9ce0647c58f2`,
C `68f5b7189a8541327df539f5253b6cea992e1786914ad4222134b203463c3a91`.

**Verdict yang diharapkan (kriteria penerimaan audit V6 butir 1):**
implementasi byte-cap yang benar (cap 300.000 decoded-body byte)
TIDAK memuat marker dalam konten yang dianalisis — marker mulai
tepat pada byte ke-300.000. Implementasi berbasis `string.length`
(cap 300.000 code unit) memuat SELURUH fixture (total CU
100.017–150.018, semuanya < 300.000) sehingga marker HADIR — FAIL
pada H-RES-02. Reviewer dapat menghitung ulang panjang fixture dari
tabel di atas dan dari file fixture itu sendiri.

**Risiko tersisa:** fixture adalah INPUT tes, bukan hasil tes.
H-RES-02 baru PASS bila harness staging menjalankannya terhadap
implementasi tahap (b) dan mencatat raw output.
**Aksi berikutnya:** implementasi tahap (b) setelah otorisasi +
H-RES-02A/B/C PASS di staging.

### F-024 — Medium: H-RES-03 tidak mendefinisikan lapisan byte yang di-cap — **addressed** (desain; lapisan didefinisikan + perilaku Bun teruji di VM, verifikasi pada Bun kanonik belum ada)

**Temuan (diterima):** matriks v2.3.12 menyebut cap "raw bytes di
lapisan stream sebelum dekompresi selesai dibaca" sekaligus meminta
"decompressed-size limit" — tanpa menyatakan lapisan mana yang
dihitung: (1) byte terkompresi di jaringan, (2) byte dari
`Response.body` setelah dekompresi transparan runtime, atau
(3) byte setelah dekompresi yang dikontrol aplikasi.

**Definisi tiga lapisan (mengikat v2.3.13):**

| Lapisan | Isi | Status desain |
| --- | --- | --- |
| **L0 — wire / encoded byte** | Byte terkompresi yang benar-benar ditransfer di jaringan (mis. 551 byte gzip, 51 byte br untuk payload 500.000 byte). | **TIDAK dapat diobservasi** melalui `Response.body` di Bun (terbukti eksperimen di bawah). **Tidak ada wire-byte cap yang diklaim di lapisan aplikasi.** Transfer wire hanya dibatasi oleh egress limit infrastruktur — yang saat ini BELUM didefinisikan (staging operator UNASSIGNED, G-E). Wire cap pun tidak akan melindungi memori dari decompression bomb. |
| **L1 — decoded-body byte (per-request)** | Byte yang diekspos `Response.body` setelah dekompresi transparan runtime, dihitung chunk demi chunk SEBELUM decoding teks. Cap: halaman 400.000, tiap script 300.000 decoded byte. | **DITEGAKKAN** (desain): hitung `value.length` tiap chunk dari `Response.body.getReader()`; pre-append accounting — bila counter + panjang chunk > cap, abort TANPA append (buffered ≤ cap, overhead 0 di luar cap pada lapisan aplikasi). |
| **L2 — aggregate per-scan** | Jumlah decoded-body byte halaman + semua script dalam satu pemeriksaan. | **DITEGAKKAN** (desain): 1.000.000 byte — lihat F-025. |

**Tidak ada lapisan dekompresi yang dikontrol aplikasi** dalam desain
ini — implementasi tidak melakukan dekompresi sendiri; dekompresi
dilakukan transparan oleh runtime Bun. Klasifikasi audit butir (3)
dengan demikian dinyatakan TIDAK ADA.

**`Content-Length` DILARANG sebagai oracle** — terbukti eksperimen:
header bernilai 551 (gzip) / 51 (br) sementara body yang dibaca
adalah 500.000 byte. Oracle yang sah hanya dari byte chunk stream
yang benar-benar dibaca.

**Eksperimen VM lokal (bukti baru v2.3.13):**
`evidence/f024-h-res03-bun-fetch/` — server + klien keduanya di
`127.0.0.1`, tanpa jaringan eksternal, tanpa artifact live,
`checkLink` TIDAK di-invoke. Bun 1.4.4 (versi VM; kanonik 1.3.10 —
lihat batasan).

| Pengamatan | gzip | br |
| --- | --- | --- |
| Wire byte (terkompresi) | 551 | 51 |
| Decoded byte | 500.000 | 500.000 |
| Total byte dibaca dari `Response.body` | **500.000** | **500.000** |
| `Content-Length` header | 551 | 51 |
| Marker hadir pada offset yang dibaca | ya, offset 400.000 | ya, offset 400.000 |

`fetch` default Bun mengirim
`Accept-Encoding: gzip, deflate, br, zstd` (terlihat di log server).
Dengan `Accept-Encoding: identity` yang diminta klien, server
eksperimen tetap menjawab gzip dan Bun tetap mendekompresi —
dekompresi mengikuti `Content-Encoding` respons, bukan header
permintaan. Kontrol `/plain` tanpa kompresi: `Response.body` =
500.000 byte dengan chunk pertama 393.110 byte — satu chunk dapat
jauh melebihi cap per-request, sehingga pre-append accounting adalah
satu-satunya penegakan yang benar (append-then-check dapat melampaui
cap hingga satu chunk penuh). Chunk terbesar pada jalur br: 262.144
byte. Log mentah: `run1-gzip.txt` (SHA-256
`56d0a4b66ca641e92d049305414454895053cd167112066aa57906f489bda2b7`),
`run2-br.txt` (SHA-256
`80cd6af908bf9e57c2b4c7e5cc82628e96ebdfa51b04bd2973ab5954343f4bb8`);
script: `exp-gzip.ts`, `exp-br.ts`.

**Kriteria penerimaan audit V6 butir 2:** tes ekspansi terkompresi
(H-RES-03 staging) harus membuktikan counter decoded-body meng-abort
sebelum payload terdekompresi melewati budget — definisi lapisan +
oracle chunk di atas memungkinkan itu; klaim wire-byte limit TIDAK
dibuat karena tidak ada lapisan yang dapat mengukurnya di aplikasi.

**Batasan (dicatat jujur):** eksperimen memakai Bun **1.4.4**,
sedangkan versi kanonik yang dideklarasikan adalah **1.3.10**.
Perilaku dekompresi pada 1.3.10 **NOT VERIFIED** — wajib diverifikasi
ulang di staging pada versi kanonik sebelum H-RES-03 dapat PASS
(risiko U-62). `deflate`/`zstd` tidak diuji di VM ini; H-RES-03
staging harus mencakup gzip DAN br (minimal) dan mencatat perilaku
`deflate`/`zstd` bila runtime mengiklankannya. Server eksperimen
pada probe `identity` mengabaikan header permintaan; server staging
H-RES-03 harus menghormati `Accept-Encoding` agar varian identity
teruji dengan benar.

**Risiko tersisa:** implementasi L1/L2 belum ada (tahap b); wire
cap infrastruktur belum didefinisikan (G-E).
**Aksi berikutnya:** otorisasi tahap (b) + verifikasi ulang perilaku
Bun pada 1.3.10 di staging + H-RES-03 PASS di staging.

### F-025 — Medium: H-RES-05 tanpa angka aggregate budget — **addressed** (desain; angka + aturan akuntansi ditetapkan, tes staging belum dijalankan)

**Temuan (diterima):** H-RES-05 v2.3.12 mensyaratkan total byte
ter-buffer per scan di bawah "aggregate limit" tanpa angka, tanpa
cakupan hitungan yang eksak, dan tanpa aturan akuntansi yang aman
konkurensi — padahal source mengambil hingga 3 script dan mengambilnya
bersamaan dengan `Promise.all`.

**Angka aggregate yang ditetapkan (mengikat v2.3.13):**

| Parameter | Nilai | Rasional |
| --- | --- | --- |
| Aggregate decoded-body budget per scan (L2) | **1.000.000 byte** | Di bawah jumlah cap individual 400.000 + 3×300.000 = 1.300.000 (agar aggregate benar-benar mengikat); ≥ 400.000 + 300.000 = 700.000 (halaman + 1 script pada cap penuh tetap lolos); sama dengan 400.000 + 2×300.000 (halaman + 2 script pada cap penuh lolos tepat pada batas inklusif); halaman + 3 script pada cap penuh = 1.300.000, melebihi aggregate sebesar 300.000 → WAJIB abort. |
| Max script count per scan | **3** | Sesuai source saat ini (`actions.ts:512–525` memilih hingga 3 script). |
| Per-request caps (L1) | Halaman **400.000**; tiap script **300.000** decoded byte | Tidak berubah dari v2.3.12. |
| Batas inklusif | Total ≤ 1.000.000 = PASS; > 1.000.000 = abort | Batas dinyatakan sebelum tes dijalankan; kontrol batas: halaman 400.000 + 2 script 300.000 = tepat 1.000.000 → PASS. |
| Overhead yang diizinkan | **0 byte** ter-buffer di luar aggregate | Pre-append accounting: chunk hanya di-append bila counter + panjang chunk ≤ aggregate. Byte yang masih dalam perjalanan di wire tidak dihitung (tidak ter-buffer). |
| Kebijakan redirect-body | Body respons redirect **di-cancel tanpa dibaca** (`body.cancel()`) segera setelah hop diproses; kontribusinya **0 byte** terhadap aggregate; hanya body respons final yang dihitung. | Menghapus ambiguitas "apakah body redirect dihitung" — jawabannya: tidak dihitung karena tidak pernah dibaca; hop tetap divalidasi (F-001) dan dihitung dalam total deadline (H-RES-06). |
| Cakupan L2 | **Hanya** decoded-body byte halaman + script. RDAP berada di luar cakupan L2 (jalur lookup terpisah dengan batasnya sendiri). | Mencegah klaim aggregate yang mencampur jalur yang berbeda. |

**Aturan akuntansi concurrency-safe (mengikat):** satu objek budget
bersama per scan, dipakai oleh halaman + semua reader script.
Check-and-reserve dieksekusi **sinkron tanpa `await` di antara
pemeriksaan dan pencatatan** — dalam event loop JS single-threaded,
blok sinkron itu atomik sehingga tidak ada interleaving antar
stream. Saat budget habis (counter + chunk > aggregate pada stream
mana pun): (1) satu `AbortController` bersama meng-abort SEMUA fetch
yang masih berjalan; (2) semua reader di-cancel; (3) seluruh konten
parsial DIBUANG; (4) verdict = **fail-closed** (scan error) —
**tidak ada partial trusted verdict** yang dikembalikan.

**Tes H-RES-05 (spesifikasi staging):** halaman 400.000 byte +
3 script 300.000 byte masing-masing, diambil bersamaan — masing-masing
di bawah cap individualnya, total 1.300.000 > aggregate 1.000.000 →
scan WAJIB abort, cancel stream yang tersisa, dan tidak menghasilkan
partial trusted verdict. Kontrol batas: halaman 400.000 + 2 script
300.000 = tepat 1.000.000 → PASS.

**Kriteria penerimaan audit V6 butir 3:** terpenuhi pada level
desain — angka, cakupan, overhead, kebijakan redirect, dan perilaku
cancel kini dinyatakan sebelum tes dijalankan.

**Risiko tersisa:** implementasi shared-budget + cancel belum ada
(tahap b); perilaku cancel nyata (apakah stream benar-benar berhenti
dan socket ditutup) baru terbukti lewat tes staging.
**Aksi berikutnya:** otorisasi tahap (b) + H-RES-05 (+ kontrol batas)
PASS di staging.

### G-F — Klarifikasi semantik kepemilikan (handoff V6 butir 4) — **addressed** (desain)

**Yang diklarifikasi (mengikat v2.3.13):**

- Cabang pilihan v2.3.12 — HAPUS cache fetch dari SEMUA jalur
  security-scan — adalah **rekomendasi desain yang menunggu
  penerimaan owner, BUKAN otorisasi implementasi**. Tidak ada
  perubahan source yang terjadi atau diizinkan oleh rekomendasi ini.
  Sampai ada persetujuan tertulis terpisah (tahap b), source tetap
  memakai cache seperti saat ini (`actions.ts:152`, lookup keyed by
  URL, `null` di-cache setelah retry gagal — `actions.ts:166`).
- **F-017 dan H-CACHE-05/06 menjadi NOT APPLICABLE HANYA SETELAH
  cabang penghapusan cache DIIMPLEMENTASIKAN** pada jalur
  security-scan. Sebelum implementasi itu, ketiganya tetap berlaku
  sebagai persyaratan desain atas cache yang masih ada di source:
  F-017 tetap **partially addressed** (bukan "selesai"), H-CACHE-05/06
  tetap menjadi oracle yang berlaku BILA owner memilih cabang
  alternatif (cache dipertahankan dengan 6 syarat).
- Penanda status di §1 matriks ini dan di §D.4.24 desain diperbaiki
  sesuai klarifikasi ini; matriks v2.3.12 yang menyebut F-017
  "NOT APPLICABLE pada cabang pilihan" dibaca dengan koreksi ini —
  maksudnya adalah *pada cabang pilihan yang sudah diimplementasikan*,
  bukan sejak rekomendasi ditulis.
- Gate **G-F** tetap merupakan keputusan owner (cabang pilihan vs
  alternatif); tidak ada source yang berubah sampai keputusan itu ada
  + otorisasi tahap (b) terpisah.

### Koreksi catatan "live untouched" v2.3.12 — **BARU v2.3.13**

Matriks v2.3.12 dan desain v2.3.12 masih memuat kesan bahwa live
belum tersentuh sejak sebelum d85a1e2. **Koreksi (berdasarkan catatan
repo, bukan verifikasi baru yang dilakukan revisi ini):** situs live
sudah **v15** — commit repo `d85a1e2` (perbaikan performa S1–S9 server
+ C1–C7 client) SUDAH diterapkan ke live dan **disetujui Rama
2026-11-08 ~02:09 WIB**. Klaim "live untouched" di v2.3.12 dengan
demikian BASI dan dikoreksi di sini; revisi v2.3.13 tidak melakukan
verifikasi live baru apa pun dan tidak mengubah live. Status desain
tetap DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED; d85a1e2 TIDAK
di-revert oleh revisi ini.

### F-019 — High: status Link Scanner nonaktif tanpa bukti kontrol runtime — **blocked (NOT VERIFIED)**

Tidak ada fakta baru v2.3.13. Paket F-021 (v2.3.12) tetap menjadi
bukti terakhir: `checklink` MASIH TERDAFTAR sebagai published action;
tidak ada build berjalan; `share.shared=false`, `share.url=null`;
artifact version/digest, tool/API version, dan request/response IDs
tetap NOT PROVIDED (tidak diekspos tool). Kontrol runtime (a)–(e)
(§2 F-019 v2.3.12) tetap belum satu pun terpenuhi.
**Risiko tersisa:** scanner masih dapat dipanggil (jalur owner/agent)
tanpa kontrol yang terbukti.
**Aksi berikutnya:** owner/operator artifact menyediakan bukti (a)–(e);
sampai ada, status deployment tetap **BLOCKED**. `checkLink` TIDAK
di-invoke dalam revisi ini; tidak ada public share yang dibuat.

### F-020 — Medium: scope refactoring source mirror perlu klarifikasi otorisasi — **partially addressed** (HOLD dipertahankan)

v2.3.13 TIDAK mengubah satu pun file source aplikasi (hanya dokumen
desain, matriks respons, dan paket bukti read-only + fixture/eksperimen
VM). d85a1e2 TIDAK di-revert. Tidak ada artefak approval terpisah di
repo. HOLD tetap berlaku penuh: tidak ada perubahan `.ts`/`.tsx`,
skema, migrasi, client, build, atau live artifact sampai ada keputusan
scope tertulis terpisah.
**Risiko tersisa:** klarifikasi scope menunggu keputusan owner.
**Aksi berikutnya:** owner menjawab 3 pertanyaan scope di §7 butir 1.

### F-018 — High bila DB shared: isolasi data antar-pengguna belum terbukti — **partially addressed** (tidak ada fakta baru)

Kutipan `.d.ts` v2.3.12 dipertahankan; pernyataan resmi runtime
provider tentang scope `ctx.db` tetap BELUM ADA; tenancy tetap
**NOT VERIFIED**; H-TEN-01..05 tetap tes staging. Public tester TIDAK
BOLEH memuat data pengguna sampai tenancy terbukti.
**Aksi berikutnya:** minta pernyataan resmi provider; owner memilih
cabang desain; H-TEN-01..05 PASS di staging.

### F-001..F-005 — spesifikasi implementasi dipertahankan + oracle F-002 dikoreksi — **blocked** (desain selesai; implementasi + bukti staging menunggu tahap b)

Desain §D.4.18 tetap menjadi spesifikasi, dengan koreksi oracle
v2.3.13 (§2 F-023/F-024/F-025 di atas):

| Temuan | Kontrol implementasi (tahap b) | Harness | Test ID / bukti yang dibutuhkan | Lingkungan |
| --- | --- | --- | --- | --- |
| F-001 Critical | Validasi URL awal + tiap hop redirect + tiap script; resolve SEMUA jawaban A/AAAA; tolak-set; pinning IP ke koneksi; TLS terhadap hostname | H-SSRF-01..20 | Tiap kasus PASS/FAIL + raw log + commit + runtime + environment; log egress 0 koneksi untuk kasus blokir | Staging terisolasi |
| F-002 High | Streamed byte cap dalam DECODED BYTES di lapisan stream (L1 per-request: halaman 400.000, script 300.000; L2 aggregate 1.000.000); pre-append accounting; overhead 0; redirect body di-cancel tanpa dibaca (0 byte); `res.text().slice()` BUKAN bukti cap; `Content-Length` BUKAN oracle | H-RES-01..05 (dikoreksi v2.3.13) | Byte ter-buffer ≤ cap + overhead yang dinyatakan; fixture H-RES-02A/B/C membedakan byte vs UTF-16 code unit; H-RES-03 membuktikan decoded-body limit atas gzip/br; H-RES-04 redirect chains; H-RES-05 aggregate 1.000.000 + kontrol batas | Staging |
| F-003 High | Satu total deadline per pemeriksaan (RDAP + page + redirect + script); satu sinyal batal bersama; hasil parsial dibuang | H-RES-06 | Total waktu ≤ deadline + toleransi; konkurensi dalam batas; kelebihan ditolak fail-closed | Staging |
| F-004 Medium | Unique constraint (nama + alamat kontrak ternormalisasi) + insert atomik + migrasi yang gagal dengan laporan bila duplikat ada | H-CAT-01..03 | Hitung baris DB setelah tiap run = yang dinyatakan | Staging |
| F-005 Medium | Otorisasi `addProject` dari jalur terotorisasi yang didokumentasikan + provenance wajib; `checkLink` bukan jalur mutasi katalog | H-AUTH-01..03 | Keputusan otorisasi cocok dengan kebijakan pada tiap kasus | Staging |

VM tidak dapat menggantikan staging untuk satu pun baris tabel di
atas. **Risiko tersisa:** implementasi + bukti staging belum ada.
**Aksi berikutnya:** otorisasi tahap (b) + klarifikasi F-020 +
staging tersedia (gate G-A/G-E).

### Reproducibility + ownership staging (handoff V6 butir 8) — **blocked** (keputusan Bun berdiri; fakta baru: bukti VM H-RES-03 memakai 1.4.4)

**Reproducibility (F-009/F-014):**

- Keputusan Bun v2.3.12 dipertahankan: versi kanonik untuk build
  bersih kelak adalah **1.3.10 (yang dideklarasikan)**; bukti VM
  dengan 1.4.4 dicatat sebagai bukti dengan versi yang BERBEDA.
- **BARU v2.3.13:** eksperimen H-RES-03 (§2 F-024) dijalankan dengan
  Bun **1.4.4** — perilaku dekompresi pada 1.3.10 NOT VERIFIED dan
  wajib diverifikasi ulang di staging pada versi kanonik (risiko
  U-62). Tidak ada keputusan versi baru yang dibuat revisi ini.
- SDK provenance tetap NOT VERIFIED (tarball builder-local, mtime
  1 Jan 1980); tidak ada test suite site; tidak ada CI (tidak ada
  file `.github/workflows/*`); build penuh TIDAK dicoba.
- Jalur retrievable SDK source/provenance: BELUM ADA.

**Ownership staging (F-013):** staging operator, kanal alert, egress
policy, staging DB+runtime tetap **UNASSIGNED/BLOCKED**; ST-01..ST-16
dan STAGE-P01..P12 tetap BLOCKED; tidak ada gate READY; tidak ada tes
staging yang dijalankan. Kriteria latensi alert ST-12-LAT-01..03
dipertahankan (alert ≤ 5 menit, wajib memuat timestamp + lock path +
identitas proses, tanpa kanal = NOT RUN bukan PASS).

### F-006b — narasi insiden di string kode — **blocked (OPEN)**

Tidak ada fakta baru v2.3.13. Lokasi pada mirror commit `d85a1e2`
tetap: `site/server/src/actions.ts` baris **52**
(`KNOWN_BAD_DOMAINS` + helper `isKnownBadDomain`), baris **483**
(string detail user-facing), baris **1245**
(`GIBRAN_SITE_KNOWLEDGE`). Disebutkan hanya sebagai pengenal lokasi
TANPA mengutip narasi, nilai, atau detail insiden apa pun.
Proposal cleanup tetap berlaku (butuh edit source live tahap (b) +
otorisasi owner terpisah).

### F-006c — DATA-PLAN.md di live artifact — **partially addressed**

Tidak ada bukti independen baru v2.3.13. Status tetap **"reported by
Muse, not independently verified"**. Bukti versi/diff live yang
dibutuhkan tetap (a) versi/digest artifact live yang dapat dikutip,
(b) diff isi DATA-PLAN live sebelum vs sesudah redaksi atau hash
konten sebelum/sesudah, (c) timestamp capture — TIDAK SATU PUN
tersedia. Sampai jalur bukti (a)–(c) tersedia, F-006c tetap
NOT VERIFIED.

## §3. Response to Previous Handoff — status temuan V5 menurut audit V6 §5 (dicatat, bukan diklaim ulang)

Bagian ini mencatat bagaimana V6 menilai respons v2.3.12 — sebagai
catatan rekonsiliasi, bukan sebagai klaim baru Muse:

| Butir V5 | Penilaian V6 §5 | Catatan Muse v2.3.13 |
| --- | --- | --- |
| F-021: bukti artifact-state | PARTIALLY ADDRESSED — provenance gap tertutup untuk dua respons; F-019 tetap BLOCKED | Diterima. Paket F-021 dipertahankan; kontrol runtime (a)–(e) tetap belum terpenuhi — F-019 tetap BLOCKED. |
| F-022: cache branch + byte-cap oracle | PARTIALLY ADDRESSED — cabang koheren, tetapi oracle H-RES cacat (F-023/F-024/F-025) | Diterima. Tiga cacat oracle dikoreksi v2.3.13 (§2 F-023/F-024/F-025); implementasi + tes tetap menunggu tahap (b). |
| F-018: tenancy | PARTIALLY ADDRESSED — tenancy runtime NOT VERIFIED | Diterima. Tidak ada fakta baru v2.3.13; pernyataan provider tetap belum ada. |
| F-019: buktikan scanner nonaktif | BLOCKED / NOT VERIFIED | Diterima. Tidak ada fakta baru v2.3.13. |
| F-020: scope d85a1e2 | HOLD PRESERVED; owner approval NOT PROVIDED | Diterima. HOLD dipertahankan v2.3.13. |
| F-001..F-005 | OPEN / BLOCKED; no source remediation | Diterima. Tidak ada implementasi; tidak ada staging. |
| F-006b/F-006c privacy residue | F-006b OPEN; F-006c NOT VERIFIED | Diterima. Tidak ada fakta baru v2.3.13. |
| F-009/F-013/F-014 reproducibility + staging ownership | NOT SATISFIED | Diterima. Keputusan Bun dipertahankan; bukti VM H-RES-03 memakai 1.4.4 — perilaku pada 1.3.10 NOT VERIFIED (U-62); peran staging tetap UNASSIGNED. |

**Koreksi bukti SU (V6 §8.1, diterima dan dipertahankan terlihat):**
klaim asli "SU-T1..SU-T9 9/9 × 4" tetap NOT VERIFIED dari bundle asli
(su-run1/2/3 byte-identik RUN=1; su-run4 hanya ekor 2 baris); suplemen
v2.3.9 (4 run lengkap berlabel RUN=1..4) tetap bukti VM suplemen, bukan
rekonstruksi log asli. Koreksi ini tidak ditulis ulang.

## §4. Jawaban atas Handoff V6 §10 (11 butir)

1. **H-RES-02 — koreksi fixture mustahil** — Dijawab §2 F-023:
   arah mustahil DIHAPUS (dengan bukti ketidakmungkinan: byte UTF-8 ≥
   code unit UTF-16 untuk setiap skalar valid); tiga fixture feasible
   A/B/C dengan angka eksak (code point, byte UTF-8, code unit UTF-16,
   marker byte offset 300.000, cap 300.000, expected verdict)
   dipublikasikan di `evidence/f023-h-res02-fixtures/` beserta SHA-256
   dan verifikasi dua alat independen (Python 3.12.3 + Node.js
   v24.22.1, cocok persis; `wc -c` mengonfirmasi).
2. **H-RES-03 — definisikan akuntansi byte terkompresi vs
   terdekompresi** — Dijawab §2 F-024: tiga lapisan didefinisikan
   terpisah (L0 wire — tidak dapat diobservasi via `Response.body`,
   tanpa klaim cap aplikasi; L1 decoded-body — ditegakkan; L2
   aggregate — ditegakkan); tidak ada lapisan dekompresi yang
   dikontrol aplikasi; `Content-Length` dilarang sebagai oracle.
   Perilaku Bun dibuktikan eksperimen VM lokal
   (`evidence/f024-h-res03-bun-fetch/`): gzip 551 byte wire →
   500.000 byte `Response.body`; br 51 byte wire → 500.000 byte;
   marker pada offset 400.000; Bun 1.4.4. Perilaku pada Bun kanonik
   1.3.10 NOT VERIFIED (U-62).
3. **H-RES-05 — tetapkan angka aggregate per-scan** — Dijawab §2
   F-025: aggregate **1.000.000 decoded byte per scan**; max 3 script;
   per-request caps halaman 400.000 / script 300.000; overhead 0
   (pre-append); redirect body di-cancel tanpa dibaca (0 byte);
   cakupan L2 = halaman + script saja; akuntansi concurrency-safe
   (check-and-reserve sinkron atomik, satu AbortController bersama,
   cancel semua reader, buang parsial, fail-closed, tanpa partial
   trusted verdict). Tes: halaman 400.000 + 3×300.000 → abort;
   kontrol batas 400.000 + 2×300.000 = tepat 1.000.000 → PASS.
4. **Klarifikasi semantik kepemilikan G-F** — Dijawab §2 G-F: cabang
   pilihan adalah rekomendasi yang menunggu penerimaan owner, BUKAN
   otorisasi implementasi; F-017 + H-CACHE-05/06 menjadi NOT
   APPLICABLE HANYA SETELAH cabang penghapusan cache
   diimplementasikan; sampai saat itu F-017 tetap partially addressed
   dan H-CACHE-05/06 tetap oracle yang berlaku pada cabang alternatif.
   Tidak ada source yang berubah sampai keputusan owner + otorisasi
   tahap (b) terpisah.
5. **Pertahankan HOLD perubahan source** — Dijawab §2 F-020: tidak ada
   perubahan `.ts`/`.tsx`, skema, migrasi, client, build, atau live
   artifact di v2.3.13; d85a1e2 TIDAK di-revert; desain + bukti
   read-only/VM boleh berlanjut.
6. **F-019 tetap blocked sampai kontrol runtime terbukti** — Dijawab
   §2 F-019: tidak ada fakta baru; kontrol (a)–(e) tetap belum
   terpenuhi; `checkLink` TIDAK di-invoke; tidak ada public share yang
   dibuat; tidak ada perubahan runtime state.
7. **F-001..F-005 tetap dipetakan ke implementasi + tes staging** —
   Dijawab §2 F-001..F-005: validasi URL di input awal + tiap redirect
   + tiap script; DNS/IP policy + pinning; streamed decoded-byte limit
   (L1 + L2, oracle dikoreksi v2.3.13); satu total deadline; atomic
   unique constraints; otorisasi action — masing-masing dipetakan ke
   tes + bukti staging eksplisit; tes hanya dapat dijalankan setelah
   otorisasi implementasi + prasyarat staging terpenuhi.
8. **F-018 dan F-009/F-014 — tutup celah bukti** — Dijawab §2
   (bagian reproducibility/staging): pernyataan resmi provider tentang
   scope `ctx.db` tetap BELUM ADA (jalur permintaan tetap terbuka);
   jalur retrievable SDK source/provenance tetap BELUM ADA; keputusan
   Bun kanonik 1.3.10 dipertahankan; eksperimen H-RES-03 memakai
   1.4.4 dan perilaku pada 1.3.10 dicatat NOT VERIFIED (U-62) dengan
   kewajiban verifikasi ulang di staging — tidak ada klaim build
   1.3.10 dari bukti 1.4.4.
9. **Staging owners + operational gates tetap eksplisit** — Dijawab
   §2 (bagian ownership staging): staging operator, kanal alert,
   egress-policy owner, DB/runtime owner, dan rollback owner tetap
   UNASSIGNED; ST-01..ST-16 TIDAK dilabeli READY; kriteria
   ST-12-LAT-01..03 hanya ditambahkan setelah kanal + owner nyata ada
   — kanal masih UNASSIGNED sehingga kriteria itu tetap belum dapat
   diuji (ST-12 = NOT RUN bila kanal tidak tersedia, bukan PASS).
10. **Pertahankan provenance bukti + koreksi historis** — Dijawab §3
    dan §2 F-023/F-024: koreksi bundle SU asli dipertahankan terlihat;
    bukti VM (fixture H-RES-02, eksperimen Bun H-RES-03) dipisah ketat
    dari staging — keduanya dilabeli VM dan tidak diklaim sebagai
    bukti staging; setiap catatan bukti v2.3.13 memuat commit,
    lingkungan, runtime, operator (Muse, VM lokal), tanggal, test ID,
    dan raw output + SHA-256; tidak ada bukti yang hilang ditulis
    sebagai PASS (contoh: perilaku Bun 1.3.10 = NOT VERIFIED, bukan
    PASS).
11. **Carry-forward F-006b/F-006c dan U-38/U-33/U-45/U-46** — Dijawab
    §2 F-006b/c dan §5: tidak ada narasi insiden atau detail wallet
    yang direproduksi (hanya nama pengenal + nomor baris); lokasi
    residu F-006b tetap OPEN; redaksi live F-006c tetap NOT VERIFIED
    tanpa bukti versi/diff/hash yang dapat diaudit independen;
    status risk register berubah hanya bila bukti/keputusan yang
    disyaratkan ada — U-46 tetap OPEN (keputusan owner belum ada).

## §5. Risk register — U-38/U-33/U-45/U-46 + risiko baru (v2.3.13)

Status VM vs staging tetap dipisah ketat. Tidak ada perubahan status
tanpa bukti staging atau keputusan tertulis owner.

| Risiko | Status v2.3.13 | Catatan |
| --- | --- | --- |
| U-38-A PID reuse antara cek procfs dan kill numerik | ANSWERED di VM | Residual U-41; bukti identitas/namespace staging tetap dibutuhkan |
| U-38-B PID sudah ter-reuse sebelum akuisisi pidfd | PARTIAL | U-41 + namespace mapping; ST-06 |
| U-38-C FFI/syscall Bun tidak tersedia di sandbox artifact | OPEN | ST-02 |
| U-38-D kebenaran FFI ABI/simbol/errno | PARTIAL | Review implementasi + ST-02/ST-03 |
| U-33-A pathname lock ter-unlink saat inode lama terkunci | PARTIAL | Residual U-43 (privileged actor); kontrol operasional |
| U-33-B inode pengganti terkunci saat holder lama bertahan | PARTIAL | Residual U-45 (latensi deteksi); ST-11/ST-12 |
| U-33-C proses non-kooperatif mengabaikan flock advisory | OPEN | Inventaris partisipan + desain enforcement |
| U-33-D semantik filesystem/flock/NFS | OPEN | ST-04/ST-05/ST-09 |
| U-33-E tooling operator mengubah inode lock | PARTIAL | Residual U-43/U-44 (privileged/runbook) |
| U-33-F perilaku supervisor/process-group | OPEN | SUP-01 / ST-07 |
| U-41 residual PID/namespace | OPEN | Lihat U-38-A/B |
| U-43 residual privileged actor | OPEN | Lihat U-33-A/E |
| U-44 residual runbook | OPEN | Lihat U-33-E |
| U-45 latensi deteksi | OPEN | Lihat U-33-B; kriteria latensi eksplisit di ST-12 (ST-12-LAT-01..03) |
| U-46 divergensi fallback numeric-kill | **OPEN — keputusan owner belum ada** | Kedua opsi + trade-off terkuantifikasi dipertahankan; tidak ada opsi yang dipilih atau diimplementasikan atas nama owner; scope blokir tetap sempit (hanya worker-signaling fallback path) |
| U-55 F-022 — cabang cache tidak dinyatakan | **partially addressed (desain)** | Cabang pilihan dinyatakan v2.3.12; semantik kepemilikan DIKLARIFIKASI v2.3.13 (§2 G-F); implementasi + tes menunggu tahap (b) |
| U-56 F-022 — oracle cap mengukur string, bukan byte | **partially addressed (desain)** | Oracle dikoreksi v2.3.12 dan DIKOREKSI ULANG v2.3.13 (F-023/F-024/F-025); implementasi + tes menunggu tahap (b) |
| U-57 F-021 — bukti artifact-state tidak auditable | **partially addressed** | Paket bukti + digest dipublikasikan v2.3.12; version/digest artifact tetap NOT PROVIDED (tidak diekspos tool) |
| U-58 F-018 — kutipan `.d.ts` tidak ada di repo | **partially addressed** | Kutipan minimal dipublikasikan v2.3.12; pernyataan provider tentang scope `ctx.db` tetap belum ada |
| U-59 (BARU) F-023 — fixture H-RES-02 mustahil | **addressed (desain)** | Arah mustahil dihapus v2.3.13; tiga fixture feasible + angka terverifikasi dipublikasikan (`evidence/f023-h-res02-fixtures/`); harness staging belum dijalankan |
| U-60 (BARU) F-024 — lapisan byte H-RES-03 ambigu | **addressed (desain)** | Tiga lapisan didefinisikan terpisah v2.3.13 (L0 wire tanpa klaim cap; L1 decoded-body ditegakkan; L2 aggregate ditegakkan); perilaku Bun teruji di VM (gzip 551→500.000, br 51→500.000); implementasi + tes staging menunggu tahap (b) |
| U-61 (BARU) F-025 — aggregate H-RES-05 tanpa angka | **addressed (desain)** | Angka 1.000.000 byte + max 3 script + overhead 0 + kebijakan redirect-body + cancel concurrency-safe ditetapkan v2.3.13; tes staging belum dijalankan |
| U-62 (BARU) Bukti VM H-RES-03 memakai Bun 1.4.4, bukan kanonik 1.3.10 | **OPEN (NOT VERIFIED)** | Perilaku dekompresi `Response.body` pada Bun 1.3.10 belum terbukti; wajib diverifikasi ulang di staging pada versi kanonik sebelum H-RES-03 dapat PASS; bukti 1.4.4 tidak boleh dikutip sebagai bukti 1.3.10 |

**Kriteria latensi alert ST-12 (dipertahankan v2.3.13):**
ST-12-LAT-01 (alert ≤ 5 menit), ST-12-LAT-02 (alert wajib memuat
timestamp + lock path + identitas proses), ST-12-LAT-03 (tanpa kanal
= NOT RUN, bukan PASS). Kanal alert masih UNASSIGNED sehingga
kriteria ini belum dapat diuji.

## §6. Hard gates — ditegaskan kembali (v2.3.13)

Tidak satu pun dari yang berikut diizinkan oleh revisi ini:

- **No Link Scanner activation** — scanner tetap nonaktif; mitigasi G0
  (tolak semua URL arbitrer) tetap menjadi penahan. F-019 tetap
  NOT VERIFIED / BLOCKED.
- **No public deployment** — public tester tetap ON HOLD (Rama,
  2026-11-08 00:28 WIB); tidak ada deploy dari revisi ini.
- **No production build** — build penuh tidak dicoba di VM ini (house
  rules); tidak ada klaim build.
- **No DB/catalog change** — tidak ada migrasi, tidak ada perubahan
  katalog, tidak ada perubahan `app.db`.
- **No source implementation** — F-001..F-005, F-016/F-017/F-022, F-018
  tetap OPEN/BLOCKED sampai otorisasi eksplisit tahap (b) dari pemilik
  + harness staging PASS + review independen. **HOLD perubahan source
  (F-020) tetap berlaku.**
- **No production testing** — tidak ada pemanggilan action produksi
  (termasuk `checkLink`) sebagai bagian revisi ini.

## §7. Yang butuh keputusan Rama (pemilik proyek)

1. **Scope perubahan source (F-020) — paling mendesak:**
   (a) Apakah arahan "tetap tingkatkan kualitas web" (2026-11-08
   ~02:11 WIB) mencakup perubahan source mirror repo-only untuk
   performa seperti d85a1e2? (b) Apakah perubahan source mirror
   memerlukan approval terpisah yang sama dengan perubahan live?
   (c) Batas mana yang berlaku untuk pekerjaan kualitas web
   berikutnya? Sampai ada jawaban tertulis, HOLD perubahan source
   tetap berlaku.
2. **Otorisasi implementasi tahap (b) untuk F-001..F-005** — TIDAK
   diberikan saat ini.
3. **Keputusan U-46** — opsi (a) terima fallback terkuantifikasi ATAU
   opsi (b) larang mutlak + ganti fallback. Tanpa ini, implementasi
   pensinyalan worker (cabang fallback) tetap diblokir — tetapi
   F-001 guard, F-002..F-005, cache, dan tenancy TIDAK diblokir
   oleh U-46.
4. **Keputusan tenancy F-018:** per-user vs shared untuk `ctx.db`
   (butuh pernyataan resmi runtime provider); cabang desain
   ownership yang dipilih.
5. **Keputusan cache F-016/F-022 (G-F):** cabang pilihan (hapus cache
   untuk security scan — rekomendasi yang menunggu penerimaan) vs
   cabang alternatif ber-syarat (cache dipertahankan dengan 6 syarat
   sekaligus). Klarifikasi v2.3.13: penerimaan cabang pilihan adalah
   keputusan desain owner; implementasi tetap butuh otorisasi tahap
   (b) terpisah.
6. **Mekanisme otorisasi addProject (F-005)** — pilih mekanisme +
   fakta scoping endpoint runtime artifact. Kandidat: `ctx.viewer`
   (`isOwner`/`ownerUserId`/`shareId`+`tokenId`) sebagai sumber
   identitas.
7. **Proposal privacy cleanup F-006b (§2 F-006b)** — setujui/tolak
   edit source live untuk `actions.ts` baris 52, 483, dan 1245.
8. **Koreksi teks DATA-PLAN live (F-015)** — ajukan via artifact
   workflow (`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md`
   sudah disiapkan).
9. **Bukti runtime F-019:** siapa yang dapat menyediakan
   versi/digest artifact + bukti kontrol disabled (butir (a)–(e)
   §2 F-019 v2.3.12)? Sampai ada, deployment tetap BLOCKED.
10. **Keputusan Bun (F-009/F-014):** kanonik 1.3.10 (yang
    dideklarasikan) vs 1.4.4 (yang dipakai bukti VM)? Bila 1.4.4,
    deklarasi `packageManager` harus diubah eksplisit (perubahan
    source — masuk HOLD F-020). **BARU v2.3.13:** bukti VM H-RES-03
    memakai 1.4.4 — bila owner memilih 1.3.10, perilaku dekompresi
    wajib diverifikasi ulang di staging pada 1.3.10 (U-62).
11. **Staging (tahap 3)** — lingkungan staging belum ada; peran
    UNASSIGNED (operator, kanal alert, egress policy, DB+runtime)
    butuh penamaan oleh pemilik sebelum ST-01..ST-16 dapat
    dijadwalkan. Kanal alert yang dinamai adalah prasyarat
    ST-12-LAT-01..03. **BARU v2.3.13:** egress limit infrastruktur
    (pengganti wire cap L0) juga butuh pemilik/operator yang
    mendefinisikannya.
12. **Public tester** — tetap ON HOLD; pencabutan hold + pilihan
    bentuk rilis (visual preview vs functional tester) adalah
    keputusan pemilik.

## §8. Yang TIDAK diklaim v2.3.13

- Tidak ada implementasi kode F-001..F-005, F-016, F-017, F-018, atau
  F-022; tidak ada perubahan perilaku aplikasi live; tidak ada perubahan
  database/katalog; tidak ada production build; Link Scanner tidak
  diaktifkan; public tester tidak disentuh di luar status ON HOLD.
- Tidak ada klaim "F-023/F-024/F-025 selesai" — ketiganya addressed
  pada level desain; penutupan butuh implementasi tahap (b) +
  H-RES-02/03/05 PASS di staging.
- Tidak ada klaim "F-017 selesai" — klarifikasi G-F v2.3.13 justru
  menegaskan F-017 tetap partially addressed sampai cabang penghapusan
  cache diimplementasikan.
- Tidak ada klaim "wire-byte cap ditegakkan" — L0 dinyatakan TIDAK
  dapat diobservasi di lapisan aplikasi; yang ditegakkan adalah
  decoded-body budget L1 + L2.
- Tidak ada klaim "Bun 1.3.10 berperilaku sama dengan 1.4.4" — perilaku
  dekompresi pada 1.3.10 NOT VERIFIED (U-62).
- Tidak ada klaim "F-018 aman" atau "F-018 rentan" — semantik tenancy
  NOT VERIFIED; yang ada adalah kutipan `.d.ts` + fakta skema + desain
  untuk kedua cabang.
- Tidak ada klaim "scanner nonaktif terbukti" — F-019 NOT VERIFIED /
  BLOCKED; paket bukti F-021 justru mengonfirmasi action `checklink`
  masih ter-publish dan tidak ada versi/digest yang terekspos.
- Tidak ada klaim "d85a1e2 terotorisasi penuh" — dasar otorisasi yang
  tercatat sudah didokumentasikan, tetapi tidak ada artefak approval
  terpisah di repo; klarifikasi scope menunggu owner.
- Redaksi live F-006c dicatat sebagai "reported by Muse, not
  independently verified" — bukan sebagai fakta yang sudah diaudit.
- Koreksi "live untouched" v2.3.13 didasarkan pada catatan repo
  (live v15, commit d85a1e2, persetujuan Rama 2026-11-08 ~02:09 WIB)
  — bukan pada verifikasi live baru yang dilakukan revisi ini.
- Sampai commit v2.3.13 masuk `main`, tidak ada kemajuan teknis yang
  dapat diverifikasi dari repo.

## §9. Gate konkret berikutnya (v2.3.13 → v2.3.14)

| Gate | Isi | Prasyarat | Pemicu revisi berikutnya |
| --- | --- | --- | --- |
| G-A | Keputusan owner atas scope perubahan source (F-020) | Jawaban atas 3 pertanyaan scope (§7 butir 1) | Keputusan tertulis owner |
| G-B | Bukti runtime F-019 | Versi/digest artifact + kontrol disabled yang dapat diverifikasi (butir (a)–(e) §2 F-019 v2.3.12) | Bukti dari operator artifact |
| G-C | Keputusan tenancy F-018 | Pernyataan resmi runtime provider tentang scope `ctx.db` | Pernyataan provider / keputusan owner |
| G-D | Keputusan U-46 | Keputusan tertulis owner opsi (a)/(b) | Keputusan tertulis owner |
| G-E | Staging tersedia + peran UNASSIGNED terisi | Penamaan operator, kanal alert, egress policy, DB+runtime oleh owner | Lingkungan staging tersedia |
| G-F | Keputusan cache F-022 | Owner menerima cabang pilihan (rekomendasi) vs alternatif (§2 G-F) | Keputusan tertulis owner |
| G-G | Keputusan Bun F-009 | Owner memilih kanonik 1.3.10 vs 1.4.4 (§7 butir 10) | Keputusan tertulis owner |
| G-H | **BARU:** Eksekusi harness H-RES-02/03/05 yang sudah dikoreksi | Otorisasi implementasi tahap (b) (G-A) + staging tersedia (G-E) + verifikasi ulang perilaku Bun pada versi kanonik (U-62) | Otorisasi tahap (b) + staging tersedia |

Pemicu revisi v2.3.14: keputusan owner atas G-A/G-C/G-D/G-F/G-G, ATAU
bukti runtime G-B, ATAU audit independen V7 — mana pun yang datang
dulu. Tidak ada revisi baru yang hanya mengulang status v2.3.13.

## §10. Hambatan, percobaan, dan hasil (dicatat agar tidak diulang)

| # | Hambatan / percobaan | Hasil |
| --- | --- | --- |
| 1 | Tool read-only tidak mengekspos artifact version/digest, tool/API version, atau request/response IDs (F-021) | Dicatat NOT PROVIDED di paket bukti + matriks; TIDAK ditebak nilainya. Percobaan ulang dengan tool yang sama tidak akan mengubah hasil — butuh jalur read-only baru dari provider. |
| 2 | Deskripsi `addproject`/`askgibran` terpotong dalam respons `list_actions` | Dicatat sebagai artefak respons tool di `evidence/f021-artifact-state-20261108/README.md`; isi terpotong tidak direkonstruksi. |
| 3 | Pernyataan resmi provider tentang scope `ctx.db` belum ada (F-018) | Kutipan `.d.ts` dipublikasikan sebagai gantinya; kutipan membuktikan permukaan API saja, BUKAN tenancy. Tidak ada kesimpulan dari nama tipe. |
| 4 | Nomor baris lokasi F-006b bergeser vs v2.3.11 | Diverifikasi ulang pada mirror `d85a1e2` (baris 52, 483, 1245); tabel koreksi di §2 F-006b v2.3.12. |
| 5 | Tidak ada staging, tidak ada operator, tidak ada kanal alert | Semua tes H-CACHE/H-RES/H-TEN tetap spesifikasi desain; ST-12-LAT-01..03 didefinisikan tetapi belum dapat diuji. |
| 6 | HOLD F-020 memblokir semua perubahan source | Dipatuhi: v2.3.13 hanya menyentuh dokumen + paket bukti read-only/VM. |
| 7 | **BARU:** H-RES-02 v2.3.12 meminta fixture mustahil (arah UTF-16-sebelum-UTF-8-byte) | Arah mustahil DIHAPUS v2.3.13 dengan bukti ketidakmungkinan; tiga fixture feasible dipublikasikan + diverifikasi dua alat independen. Percobaan membangun fixture arah mustahil tidak akan pernah berhasil — jangan diulang. |
| 8 | **BARU:** Lapisan byte H-RES-03 ambigu — apakah `Response.body` Bun mengekspos wire atau decoded byte? | Dijawab eksperimen VM lokal v2.3.13 (Bun 1.4.4): `Response.body` = decoded byte (gzip 551→500.000, br 51→500.000). Wire cap aplikasi dinyatakan TIDAK ADA; penggantinya egress limit infrastruktur (UNASSIGNED). Eksperimen ulang pada Bun 1.3.10 masih dibutuhkan (U-62). |
| 9 | **BARU:** Chunk `Response.body` dapat jauh melebihi cap (chunk pertama 393.110 byte pada kontrol plain) | Penegakan cap HARUS pre-append (periksa sebelum append); append-then-check dapat melampaui cap hingga satu chunk penuh. Dicatat di §2 F-024/F-025. |
| 10 | **BARU:** Klaim "live untouched" v2.3.12 basi | Dikoreksi v2.3.13 dari catatan repo: live sudah v15 (d85a1e2, S1–S9 + C1–C7, disetujui Rama 2026-11-08 ~02:09 WIB). Tidak ada verifikasi live baru yang dilakukan revisi ini. |
