# SSRF RESPONSE MATRIX v2.3.17 — Jawaban atas Audit Independen ChatGPT V10

**Dokumen:** matriks respons revisi desain v2.3.17
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_INDEPENDENT_AUDIT_V10.md` (commit `237d491`, 2026-11-08)
  — temuan baru F-033 + caveat F-032 + Muse Handoff §9 (9 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.17:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.17 — §D.4.28 ringkasan revisi, risiko baru U-71/U-72 di §G,
U-67/U-70 diperbarui, koreksi rasio 1,13–1,84× dinyatakan SUPERSEDED) +
`evidence/f029-memory-methodology/` (diperbarui — harness de-confounded +
preflight terpisah + 2 log mentah baru + log varian byte) +
`evidence/f032-harness-validation/` (diperbarui — uji timeout E2E +
tes regresi negatif diulang). Matriks v2.3.16 (`SSRF_RESPONSE_MATRIX_V2316.md`)
dipertahankan utuh sebagai catatan sejarah revisi itu. Temuan
F-001..F-032 dibawa ke sini dengan status terbarunya; yang baru di
v2.3.17 hanyalah F-033, rasio terukur ulang 1,12–2,62×,
penutupan caveat timeout E2E F-032, dan risiko baru U-71/U-72.

**Yang TIDAK dilakukan v2.3.17:** tidak ada kode aplikasi yang diubah
(tidak ada file `.ts`/`.tsx` yang disentuh — termasuk tidak ada
perubahan `site/package.json` / `site/bun.lock` di repo), tidak ada
perubahan database/katalog, tidak ada production build, tidak ada
pemanggilan action produksi apa pun (termasuk `checkLink` — tidak
di-invoke), Link Scanner tidak diaktifkan, public tester tidak
disentuh, live artifact tidak diubah. Bukti yang dipakai adalah:
eksperimen VM lokal read-only atas pola string turunan (proses anak
terpisah, tanpa jaringan eksternal, tanpa artifact live) plus
pengujian harness di VM yang sama. Rerun harness F-029
dibenarkan karena harness berubah (F-033) — protokol butir 6 —
dan dijelaskan di §2.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.17

Sesuai keputusan pemilik proyek (2026-11-07 ~23:56 WIB, dikonfirmasi
~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan tidak boleh
dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.17.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.17 TIDAK mengimplementasikan apa pun. **HOLD perubahan source tetap berlaku (F-020, §2, §6).** |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.17. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.**

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Satu butir berstatus ini di v2.3.17: hipotesis ARAH bias V10 atas F-033 (§2 F-033) — ditolak sebagai prediksi arah, dengan bukti rerun; temuan F-033-nya sendiri DITERIMA sepenuhnya. |

## §1. Ringkasan status F-001..F-033

| ID | Severity | Status v2.3.17 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah: desain + harness H-SSRF-01..20 selesai; implementasi menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Tidak berubah: H-RES-05 kini memakai fixture v2.3.17 (preflight terpisah + lifecycle eksplisit) untuk staging; implementasi tetap menunggu tahap (b). |
| F-003 | High — tanpa total deadline | **blocked** | Tidak berubah: deadline total 30 detik PARTIALLY MITIGATED di kode mirror (d85a1e2) — tanpa tes regresi, status penutupan TIDAK berubah: tetap OPEN sampai H-RES-06 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Tidak berubah: desain unique constraint selesai; implementasi (termasuk migrasi DB) menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Tidak berubah: auth di dalam kode TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED; mekanisme otorisasi butuh keputusan pemilik. |
| F-006a | Medium — redaksi dokumen mirror `site/DATA-PLAN.md` | **addressed** | Tidak berubah. |
| F-006b | Medium — narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`; cleanup tetap butuh edit source + otorisasi terpisah. |
| F-006c | Medium — DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah: status tetap "reported by Muse, not independently verified"; bukti versi/diff live (a)–(c) tetap belum tersedia. |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Tidak berubah (lihat §3 V10 §7.1). |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Tidak berubah. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | Tidak berubah: proposal keputusan F-030 selesai sebagai paket yang dapat diputuskan (v2.3.16); digest rilis Bun 1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED. Status keseluruhan tetap NOT REPRODUCIBLE untuk clean external builder. |
| F-010 | Medium — bundle SU asli mengulang RUN=1 di tiga file | **addressed** (sebagai koreksi bukti) | Tidak berubah; koreksi V5 §6.1 / V6 §8.1 / V7 §7.1 / V8 §7.1 / V9 §7.1 / V10 §7.1 diterima dan dipertahankan terlihat. |
| F-011 | Medium — matriks fitur tester statis tidak cocok dengan client | **addressed** (sebagai koreksi dokumen) | Tidak berubah; tester tetap ON HOLD. |
| F-012 | Medium — F-006 dinyatakan addressed padahal residu masih ada | **addressed** (sebagai pemisahan status) | Tidak berubah. |
| F-013 | Medium — owner gate staging tidak lengkap | **partially addressed** | Tidak berubah: STAGE-P01..P12 dilengkapi prasyarat/prosedur/oracle/bukti; operator/kanal alert/egress/DB tetap UNASSIGNED/BLOCKED — tidak ada nama owner yang dikarang; tidak ada gate READY. Kriteria ST-12-LAT-01..03 dipertahankan. |
| F-014 | Medium — catatan reproduksibilitas basi | **partially addressed** | Tidak berubah; lihat F-009/F-030. |
| F-015 | Low/Medium — DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode | **addressed** (mirror) / **blocked** (live) | Tidak berubah; teks koreksi live sudah disiapkan, belum diterapkan. |
| F-016 | Medium — cache hasil scan basi (false-negative) | **partially addressed** | Tidak berubah: cabang pilihan dinyatakan (hapus cache dari semua jalur security-scan); implementasi + tes menunggu tahap (b) + HOLD F-020. |
| F-017 | Medium — cache key mengabaikan cap | **partially addressed** | Tidak berubah: semantik kepemilikan G-F diklarifikasi v2.3.13 — cabang pilihan adalah rekomendasi yang menunggu penerimaan owner, BUKAN otorisasi implementasi; F-017 + H-CACHE-05/06 menjadi NOT APPLICABLE HANYA SETELAH cabang penghapusan cache diimplementasikan. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | Tidak berubah: kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checklink` MASIH TERDAFTAR (paket F-021); tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. Deployment tetap BLOCKED. |
| F-020 | Medium — scope refactoring source mirror perlu klarifikasi otorisasi | **partially addressed** | Tidak berubah: HOLD dipertahankan; tidak ada perubahan source di v2.3.17; tidak ada revert d85a1e2; tidak ada artefak approval terpisah di repo. |
| F-021 | Medium — bukti artifact-state tidak auditable | **partially addressed** | Tidak berubah: paket bukti + digest dipublikasikan v2.3.12; version/digest artifact tetap NOT PROVIDED (tidak diekspos tool). |
| F-022 | Medium — keputusan cache + oracle tes cap tidak koheren | **partially addressed** | Tidak berubah: oracle tes cap dikoreksi v2.3.12/v2.3.13/v2.3.14; H-RES-05 kini memakai fixture v2.3.17 (preflight terpisah + lifecycle eksplisit); implementasi + tes tetap menunggu tahap (b) + staging. |
| F-023 | Medium — H-RES-02 berisi kondisi fixture UTF-8 yang mustahil | **addressed** (desain) | Tidak berubah: arah mustahil dihapus v2.3.13; tiga fixture feasible + angka terverifikasi dipublikasikan. Harness staging belum dijalankan. |
| F-024 | Medium — H-RES-03 tidak mendefinisikan lapisan byte yang di-cap | **addressed** (desain) | Tidak berubah: perilaku dekompresi transparan TERKONFIRMASI pada Bun kanonik 1.3.10 (re-run v2.3.14). Staging + `deflate`/`zstd` tetap NOT VERIFIED. |
| F-025 | Medium — H-RES-05 tanpa angka aggregate budget | **addressed** (desain) | Tidak berubah: angka 1.000.000 byte tetap sebagai input-body budget. Tes staging belum dijalankan. |
| F-026 | Medium — batas decoded-byte tidak membatasi transient chunk allocation | **addressed** (desain) | Tidak berubah: anggaran A1 vs A2 dipisah v2.3.14; chunk maksimum terukur 528.384 byte (1.3.10); BYOB NOT VERIFIED. Tes staging belum dijalankan. |
| F-027 | Medium — L2 tidak mencakup representasi string turunan | **addressed** (desain) / **koreksi kuantitatif v2.3.17** | **BARU v2.3.17 (F-033 §2):** karakter hidup 3,60× DIPERTAHANKAN sebagai character accounting; **rasio penghematan incremental v2.3.16 (1,13–1,84×) dinyatakan SUPERSEDED — rasio terukur ulang de-confounded 1,12–2,62×** (median VmHWM). Larangan materialisasi bersamaan + pemindaian incremental TETAP berlaku. Tes staging belum dijalankan. |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan); template manifest dipublikasikan (`DEPLOYMENT_MANIFEST_TEMPLATE.md`) — manifest itu sendiri tetap KOSONG sampai operator menyediakannya. Tidak ada tebakan versi live. |
| F-029 | Medium — perbandingan peak memory F-027 tidak valid secara metodologis | **addressed** (metodologi + koreksi klaim) | **BARU v2.3.17 (F-033 §2):** TextEncoder dikeluarkan dari measured process (byte aritmetik + preflight terpisah 61 checks); lifecycle pola B eksplisit via helper scope tertutup; rerun penuh 120 run anak (0 gagal, 120 PID berbeda); rasio terukur ulang 1,12–2,62×; rentang 1,13–1,84× v2.3.16 SUPERSEDED. Manfaat staging (bukan angka VM) tetap harus dibuktikan di H-RES-05. |
| F-030 | Medium — lockfile ter-commit tidak kompatibel dengan Bun kanonik | **partially addressed** (proposal keputusan selesai; blocker CONFIRMED) | Tidak berubah: proposal keputusan selesai sebagai paket yang dapat diputuskan (v2.3.16 — rekomendasi Opsi A + SDK vendorkan, fallback Opsi B); digest rilis Bun 1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED. F-030 tetap CONFIRMED BLOCKER; F-009 tetap NOT REPRODUCIBLE. |
| F-031 | Low — fixture F-029 tidak tepat pada batas byte yang dinyatakan | **addressed** (fixture diperbaiki + rerun + varian cap−1/cap+1) | Tidak berubah; bukti byte kini diperkuat v2.3.17: preflight terpisah membuktikan byte eksak secara independen dari measured process (61 checks, 0 gagal, kedua versi Bun). |
| F-032 | Low — harness dapat melaporkan sukses dengan nol run | **addressed** (validasi + tes regresi negatif + timeout E2E) | **BARU v2.3.17:** jalur timeout child TERBUKTI end-to-end melalui parent harness dengan child dummy yang sengaja menggantung (12 child timeout, ke-12 PID terverifikasi mati, 0 record, exit 1, tanpa success line — 11 assert PASS, log `run-f032-timeout-e2e.txt`); tes regresi negatif diulang pada harness baru (7 kasus exit 2, kontrol positif 12 RESULT). Caveat V10 atas F-032 TERTUTUP. |
| F-033 | Medium — alokasi instrumen TextEncoder dan lifecycle GC tidak simetris pada eksperimen A/B | **addressed** (harness diperbaiki + rerun + rasio terukur ulang) | **BARU v2.3.17:** TextEncoder dikeluarkan dari measured process; preflight terpisah sebagai bukti byte independen; lifecycle pola B eksplisit (helper scope tertutup + log forced-GC); rerun penuh 120 run anak; rasio terukur ulang 1,12–2,62×. Status rasio sebagai angka operasional tetap NOT VERIFIED sampai review independen (V10 §5 butir 6). Hipotesis ARAH bias V10 tidak terkonfirmasi pada sel forced-GC — lihat §2 F-033. |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif. Tidak ada public deployment yang
diotorisasi.**

## §2. Respons per temuan baru V10

### F-033 — Medium: alokasi instrumen TextEncoder dan lifecycle GC tidak simetris pada eksperimen A/B — **addressed** (harness diperbaiki, preflight terpisah, lifecycle eksplisit, rerun penuh)

**Temuan (diterima sepenuhnya):** Audit V10 benar di semua poin
bukti (§5 F-033): `makeSegment()` v2.3.16 memanggil
`enc.encode(seg)` untuk setiap segmen pada baris 171 guna
memperoleh byte length — mengalokasikan Uint8Array sementara
sebesar segmen yang sedang diukur; pola A memanggil
`makeSegment(0..2)` berturut-turut (baris 228–230) dengan GC
eksplisit pertama setelah konstruksi tiga segmen (baris 241);
pola B memanggil `makeSegment(i)` di dalam loop (baris 279) dan
`doGc()` setelah setiap segmen (baris 295); VmHWM monotonik
sehingga alokasi sementara validasi fixture dapat ikut
menaikkan VmHWM; pada pola B, `segLower` adalah `const` yang
masih berada dalam lexical block ketika `doGc()` dipanggil —
hanya `seg` yang diset null — sehingga kode tidak membuktikan
string lowercase sudah tidak terjangkau pada checkpoint
forced-GC. Besarnya bias belum terukur pada saat audit.

**Perbaikan v2.3.17 (`evidence/f029-memory-methodology/`):**

- Modul bersama baru `fixture.ts` (SHA-256
  `e60c30cd398a0aafa2504758027013fa7b9f372d0d965462c05c6b9aa7a5bf15`):
  satu sumber logika konstruksi untuk measured child DAN
  preflight. TIDAK mengandung TextEncoder; byte dihitung
  aritmetik deterministik (filler ASCII 1 byte, U+00E9 2 byte,
  marker ASCII 33/15/13 byte — konstanta hardcode yang
  diverifikasi preflight).
- `exp-pattern.ts` ditulis ulang (SHA-256
  `91e593ccb7d81e7e816f4963b7879b23b2062e15982a222e4e7efcfb393386ae`):
  TIDAK ADA pemanggilan TextEncoder di file ini (dapat
  diperiksa dengan grep); byte total aritmetik; RESULT membawa
  `encoderInMeasuredPhase: false` +
  `byteProof: "preflight+arithmetic"`.
- Preflight baru `preflight-fixture.ts` (SHA-256
  `8ca260989a1979ac9932fe7155e251bed8fcc3b1619e1ba2a3e63b4864dcf2f2`):
  proses TERPISAH yang mengukur segmen yang sama dengan
  TextEncoder — 61 checks (marker 33/15/13, lebar filler,
  ascii + nonascii-bytes pada 999.999/1.000.000/1.000.001 per
  segmen + total, nonascii total 1.999.939). Alokasinya tidak
  pernah menyentuh VmHWM child terukur karena prosesnya
  berbeda dan berjalan SEBELUM child mana pun di-spawn.
- `run-f029.ts` diperbarui (SHA-256
  `03a73f88ce33304ba0809c9a3ec91f7a407b1d24a9e01fdcd7337a5b6595b6d5`):
  menjalankan preflight dulu dan abort (exit 1, tanpa child)
  bila preflight gagal; meng-assert tiap RESULT
  `encoderInMeasuredPhase === false` dan
  `byteProof === "preflight+arithmetic"`.
- **Lifecycle pola B eksplisit:** scan satu segmen pindah ke
  helper `scanSegment(i)` dengan scope tertutup — mengembalikan
  hanya `{ found, bytes, chars }`; `seg` dan `segLower` keluar
  dari scope saat helper return; caller menjalankan `doGc()`
  HANYA setelah return. Tiap forced GC pola B dicatat di log
  (`B gc after segment i: seg refs out of scope ...` — 90
  baris per log = 30 run B × 3 segmen).

**Bukti baru v2.3.17 — rerun DIBENARKAN karena harness
berubah (protokol butir 6):** log mentah
`run-1310-f033.txt` (SHA-256
`bd6860baaad15fd1aef5572ba8a0db77a73ac4ffa407143b6bf2f6f2a2b171fd`,
995 baris) dan `run-144-f033.txt` (SHA-256
`44d76ae0b566c13eea49571bce80cefcb84bd4cce884f5d86859ee470ec445f8`,
995 baris) — Bun 1.3.10 (`1.3.10+30e609e08`, diunduh ulang
dari rilis resmi oven-sh/bun `bun-v1.3.10`, zip 39.328.732
byte, 2026-11-08) DAN Bun 1.4.4 (`1.4.4+38afee6c8`); 60 run
anak per versi, 60 PID berbeda terverifikasi per versi, 0
gagal, `asksConnect = true` pada SEMUA 120 run anak,
`encoderInMeasuredPhase = false` pada SEMUA 120 RESULT,
preflight 61 PASS di kedua log, 90 baris `B gc after
segment` per log, 0 baris FAIL.

**Varian cap−1 / cap / cap+1** (log
`run-144-f033-byte-variants.txt`, SHA-256
`bb3acc16807c627ee35f08cd5a2c859884c52f68caf886fa0c113dc372f57a36`,
107 baris): 14 run langsung `exp-pattern.ts` (Bun 1.4.4, gc
natural, 2026-11-08T02:52:52Z) — pola A dan B × fixture
`ascii` dan `nonascii-bytes` × `--bytes` 999.999 / 1.000.000 /
1.000.001, plus pola A dan B × `nonascii` default. Semua
exit 0; total byte TEPAT sama dengan target pada setiap run
(999.999, 1.000.000, 1.000.001; nonascii tetap 1.999.939);
bukti byte independennya adalah preflight (61 checks,
termasuk ketiga target itu).

**Hasil terukur ulang (median VmHWM delta, 5 run per
kombinasi):**

| Bun | Fixture | GC | A median | B median | Rasio A/B |
| --- | --- | --- | --- | --- | --- |
| 1.3.10 | ascii | forced | 4.861.952 | 2.871.296 | 1,69× |
| 1.3.10 | ascii | natural | 4.784.128 | 3.670.016 | 1,30× |
| 1.3.10 | nonascii | forced | 5.337.088 | 2.965.504 | 1,80× |
| 1.3.10 | nonascii | natural | 4.915.200 | 3.796.992 | 1,29× |
| 1.3.10 | nonascii-bytes | forced | 2.912.256 | 1.490.944 | 1,95× |
| 1.3.10 | nonascii-bytes | natural | 2.809.856 | 2.281.472 | 1,23× |
| 1.4.4 | ascii | forced | 4.104.192 | 1.654.784 | 2,48× |
| 1.4.4 | ascii | natural | 4.542.464 | 3.964.928 | 1,15× |
| 1.4.4 | nonascii | forced | 4.177.920 | 1.597.440 | 2,62× |
| 1.4.4 | nonascii | natural | 4.624.384 | 3.977.216 | 1,16× |
| 1.4.4 | nonascii-bytes | forced | 2.453.504 | 1.335.296 | 1,84× |
| 1.4.4 | nonascii-bytes | natural | 2.818.048 | 2.527.232 | 1,12× |

**Rasio terukur ulang keseluruhan: 1,12–2,62× (median VmHWM).**
Rentang v2.3.16 (1,13–1,84×) dinyatakan **SUPERSEDED**
(instrumen terkonfounded F-033). Yang TIDAK berubah: pola B
lebih rendah dari pola A pada SEMUA 12 kombinasi di kedua
versi; forced-GC 1,69–2,62× vs natural-GC 1,12–1,30×.
Karakter hidup 3,60× dipertahankan sebagai character
accounting (ascii: 3.600.005; nonascii-bytes: 1.800.116 /
500.032). `heapUsed` tetap bukan oracle di Bun 1.3.10
(delta = 0 pada SEMUA 60 run anak 1.3.10 — direproduksi
v2.3.17).

**Hipotesis ARAH bias V10 — DITOLAK sebagai prediksi arah
(dengan bukti rerun); temuan F-033-nya sendiri DITERIMA.**
Audit V10 §5 memprediksi rasio 1,13–1,84× "dapat
melebih-lebihkan manfaat pola incremental" (bias menguntungkan
B). Rerun de-confounded menunjukkan sebaliknya pada sel
forced-GC: rasio NAIK (1,4.4 ascii forced 1,57× → 2,48×;
nonascii forced 1,70× → 2,62×). Penjelasannya: dua confound
v2.3.16 mendorong ke arah berlawanan — (a) transient encoder
menghukum pola A (cenderung MEMBESARKAN rasio), (b)
`segLower` yang hidup melewati forced GC menghukum pola B
(cenderung MENGECILKAN rasio) — dan (b) adalah confound yang
LEBIH BESAR: median B forced-GC 1.4.4 jatuh jauh (ascii
3.379.200 → 1.654.784; nonascii 3.149.824 → 1.597.440)
setelah `segLower` dilepas sebelum GC, sementara median A
turun lebih sedikit (ascii 5.300.224 → 4.104.192). Pada sel
natural-GC rasio hampir tidak bergerak (1,13–1,28× →
1,12–1,30×), sesuai harapan: tanpa checkpoint forced-GC,
lifetime `segLower` tidak berpengaruh pada puncak. Audit V10
benar bahwa instrumennya terkonfounded dan besarnya bias
belum terukur — rerun ini MENGUKUR besarnya dan menunjukkan
arah netonya berlawanan dengan hipotesis pada sel forced-GC.
Dasar teknis + bukti yang dapat direproduksi: log mentah di
atas + perbandingan median per kombinasi (tabel di atas vs
tabel v2.3.16 di matriks V2316 §2 F-031).

**Kriteria penerimaan F-033 (V10 §5, butir 1–6):**

1. Preflight fixture terpisah membuktikan ukuran per segmen
   dan total exact-byte untuk ASCII, non-ASCII byte-matched,
   serta cap−1/cap/cap+1 — TERPENUHI (61 checks, 0 gagal,
   kedua versi Bun; output di kepala tiap log run).
2. Measured child tidak membuat full-segment Uint8Array untuk
   validasi byte setelah baseline diambil — TERPENUHI
   (`exp-pattern.ts` tidak memanggil TextEncoder sama sekali;
   tiap RESULT meng-assert `encoderInMeasuredPhase: false`).
3. A/B menggunakan instrumen, versi Bun, flags, input, dan
   titik snapshot yang setara; perbedaan lifecycle yang memang
   menjadi variabel eksperimen dijelaskan eksplisit —
   TERPENUHI (satu-satunya perbedaan lifecycle yang tersisa
   adalah yang memang diukur: A memegang ketiganya bersamaan,
   B satu per satu; didokumentasikan di header skrip + README).
4. Pada pola B, referensi segmen dan lowercase tidak hidup
   melewati batas helper/iteration sebelum GC berikutnya —
   TERPENUHI (`scanSegment()` scope tertutup + 90 baris log
   `B gc after segment` per log).
5. Ulangi lima run per kombinasi di Bun 1.3.10 dan 1.4.4;
   sertakan raw log, PID, baseline, VmHWM, external, heap,
   dan rasio median/rentang — TERPENUHI (60 RESULT + 60 PID
   unik per versi; tabel di atas).
6. Sampai butir di atas lolos review independen, rasio A/B
   tetap NOT VERIFIED FOR CAPACITY/SIZING — **DIPERTAHANKAN
   sebagai status**: keenam butir di atas adalah bukti yang
   diajukan untuk review independen; rasio 1,12–2,62× TIDAK
   diklaim sebagai angka operasional sampai audit V11
   menilainya.

**Risiko tersisa:** U-71 (instrumen lama terkonfounded; rasio
v2.3.16 superseded; hipotesis arah V10 tidak terkonfirmasi
pada sel forced-GC). **Aksi berikutnya:** H-RES-05 di
staging memakai fixture v2.3.17 (gate G-I) + audit V11 atas
paket ini.

### F-032 — Low: timeout E2E dengan child yang sengaja menggantung — **addressed** (caveat V10 ditutup)

**Caveat (diterima sepenuhnya):** Audit V10 §4.2 menilai F-032
"ADDRESSED FOR ARGUMENT/COUNT FALSE-GREEN PATH; TIMEOUT E2E
NOT VERIFIED" — mekanisme timeout `spawnSync` diverifikasi
terpisah, tetapi tidak ada uji end-to-end harness dengan child
yang sengaja menggantung.

**Perbaikan v2.3.17 (`evidence/f032-harness-validation/`):**

- `hang-child.ts` (SHA-256
  `0d747fa7fec2b1b8c141735e21c3de8349064fde313164c9df5dbdb44d92613a`):
  child dummy yang menerima argumen yang sama dengan
  `exp-pattern.ts`, mencatat PID-nya (append, satu baris per
  child) ke `$F032_PID_FILE`, mencetak satu baris, lalu
  menggantung selamanya (`await new Promise(() => {})`).
  Tidak pernah mencetak RESULT, tidak pernah keluar sendiri.
  Hanya ada di sandbox eksperimen — tidak ada target
  produksi, tidak ada artifact, tidak ada `checkLink`.
- `run-f032-timeout-e2e.ts` (SHA-256
  `169e1d6908806659298cc5f1e862d094eaf0fe7d59029a2e35b306f4820256ab`):
  driver yang menjalankan `bun run-f029.ts --runs 1` dengan
  seam `F029_CHILD_SCRIPT=<hang-child>` +
  `F029_CHILD_TIMEOUT_MS=3000`, lalu meng-assert 11 hal
  (lihat tabel di bawah). Driver exit 0 hanya bila SEMUA
  assert lolos.
- Test seam di `run-f029.ts` (SHA-256 `03a73f88…`):
  `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` (integer
  100..120000, default 120000; nilai buruk → exit 2; bila
  aktif, parent mencetak baris `test-seam:` eksplisit).
  Production run TIDAK PERNAH mengeset keduanya.

**Tes end-to-end (log `run-f032-timeout-e2e.txt`, SHA-256
`6148cb8924fdfd3c0195994f3146ae275064e124e139bcec1558a5fa37c87fd4`,
165 baris; Bun 1.4.4, 2026-11-08T02:53:24Z, durasi ~36 detik
= 12 child × timeout 3 detik):**

| # | Assert | Hasil |
| --- | --- | --- |
| 1 | Driven run exit 1 | PASS |
| 2 | 12 baris FAIL (satu per child gantung) | PASS (12) |
| 3 | Semua FAIL beralasan `timeout after 3000 ms` | PASS (12/12) |
| 4 | Parent mencetak `parent done: FAILED` | PASS |
| 5 | Parent TIDAK mencetak `all child runs ok` | PASS |
| 6 | Parent mencetak `COUNT MISMATCH` (0 dari 12 record) | PASS |
| 7 | Tidak ada baris RESULT | PASS (0) |
| 8 | Parent mencatat baris `test-seam:` | PASS |
| 9 | Preflight berjalan + lolos sebelum child gantung | PASS |
| 10 | Ke-12 PID child tercatat | PASS (12 PID: 3776, 3782, 3790, 3802, 3808, 3821, 3827, 3835, 3846, 3849, 3863, 3866) |
| 11 | Ke-12 child sudah mati setelah parent keluar | PASS (kill(pid,0) → ESRCH untuk semua; bocor: none) |

Verdict driver: **E2E TIMEOUT TEST: PASS**. Jalur timeout
child kini TERBUKTI end-to-end melalui parent harness yang
sebenarnya — bukan hanya mekanismenya yang diverifikasi
terpisah. Caveat V10 atas F-032 TERTUTUP.

**Tes regresi negatif diulang pada harness baru** (log
`run-f032-negative-v2317.txt`, SHA-256
`4c97e1d079a21f94a8f4e0aec1b7eda961843bc7f5adc36c324123331b8a7a91`,
307 baris; Bun 1.4.4, 2026-11-08T02:54:57Z): `--runs 0`,
`--runs abc`, `--runs -1`, nilai hilang, flag hilang,
`--runs 11`, `--runs 1.5` — ketujuh kasus tetap exit 2 tanpa
mencetak sukses; kontrol positif `--runs 1` exit 0 dengan 12
RESULT + `parent done: all child runs ok` (output penuh
kontrol ada di log). Log v2.3.16 (`run-f032-negative.txt`)
dipertahankan sebagai bukti historis.

**Risiko tersisa:** U-72 (test seam sebagai permukaan override
baru — dimitigasi baris log `test-seam:` eksplisit + reviewer
wajib memeriksanya). **Aksi berikutnya:** tidak ada — harness
v2.3.17 adalah oracle yang dipakai untuk rerun apa pun.

### F-027 — koreksi kuantitatif (dampak F-033) — **addressed** (sebagai koreksi bukti)

Rasio penghematan incremental v2.3.16 (1,13–1,84×)
**dinyatakan SUPERSEDED** oleh pengukuran ulang de-confounded
v2.3.17 (**1,12–2,62×**, median VmHWM — lihat F-033 §2 di
atas). Yang dipertahankan: karakter hidup 3,60× sebagai
character accounting (ascii 3.600.005; nonascii-bytes:
1.800.116 / 500.032); peak RSS v2.3.14 sebagai pengukuran
checkpoint satu-proses yang kini digantikan metrik VmHWM
yang benar — angka RSS lama TIDAK dihapus dari catatan
tetapi TIDAK BOLEH dikutip sebagai perbandingan A/B atau
sebagai acceptance. Aturan desain (larangan materialisasi
bersamaan + pemindaian incremental) tidak berubah. Rasio
4,5–5,4× v2.3.14 tetap DICABUT dan TIDAK dikembalikan.

### F-028 — klaim live v15 tanpa provenance — **partially addressed** (dipertahankan NOT VERIFIED)

Tidak ada fakta baru. LIVE VERSION / DEPLOYMENT APPROVAL tetap
**NOT VERIFIED**; semua 15 field template manifest tetap
NOT PROVIDED; tidak ada tebakan versi live, tidak ada perubahan
live, tidak ada klaim approval baru. Template manifest
(`DEPLOYMENT_MANIFEST_TEMPLATE.md`) tetap kosong sampai operator
menyediakannya. Satu manifest per deployment; nilai ditebak =
manifest tidak sah.

### F-019 — status Link Scanner nonaktif tanpa bukti kontrol runtime — **blocked (NOT VERIFIED)**

Tidak ada fakta baru. Hanya bukti read-only; `checkLink` TIDAK
di-invoke, tidak ada public share yang dibuat, tidak ada perubahan
runtime state. Kontrol (a)–(e) (§D.4.22) tetap belum satu pun
terpenuhi: versi/digest artifact, action dispatch denial /
pre-handler rejection, UI gate, public invocation denial, dan
egress observation. Deployment tetap BLOCKED.

### F-020 — scope refactoring source mirror — **partially addressed** (HOLD dipertahankan)

Tidak ada perubahan source di v2.3.17; tidak ada revert d85a1e2;
tidak ada artefak approval terpisah di repo. HOLD perubahan source
lanjutan tetap berlaku sampai owner mengklarifikasi scope.

### F-018 — isolasi data antar-pengguna — **partially addressed** (tidak ada fakta baru)

Kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime
tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada.
Tidak ada kesimpulan dari nama tipe saja.

### F-001..F-005 — spesifikasi implementasi dipertahankan — **blocked** (desain selesai; implementasi + bukti staging menunggu tahap b)

Tidak ada perubahan status. Satu pembaruan spesifikasi (F-033 §2):
H-RES-05 kini memakai fixture v2.3.17 (preflight terpisah +
lifecycle pola B eksplisit) untuk staging. Handoff V10 BUKAN
izin mengubah source.

### F-030 — proposal keputusan dipertahankan tanpa implementasi — **partially addressed** (paket keputusan selesai; blocker CONFIRMED)

Tidak ada fakta baru di v2.3.17. Proposal keputusan v2.3.16
(rekomendasi Opsi A + SDK vendorkan, fallback Opsi B,
provenance/digest yang dibutuhkan, prasyarat clean-builder,
rollback, dampak bukti runtime) dibawa utuh; digest rilis Bun
1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED (tidak
dikarang). **Acceptance F-030 tetap belum satu pun
terpenuhi** — F-030 tetap **CONFIRMED BLOCKER** dan F-009
tetap **NOT REPRODUCIBLE**. Tidak ada klaim reproducible
sebelum frozen install + typecheck + build pada clean
external builder berhasil dengan SDK yang dapat diverifikasi.

**Risiko tersisa:** U-68 (keputusan reproduksibilitas belum
ada). **Aksi berikutnya:** keputusan owner G-G (gate G-J).

### Reproducibility + ownership staging (handoff V10 butir 5 dan 7) — **blocked**

Reproducibility: lihat F-030 §2 di atas (proposal keputusan
selesai sebagai paket yang dapat diputuskan; HOLD).
Ownership staging: STAGE-P01..P12 dipertahankan lengkap
dengan prasyarat, prosedur aman, PASS/FAIL oracle, dan bukti
yang harus dihasilkan (desain §D.4.26 — tabel 12 baris).
Semua peran tetap **UNASSIGNED**; tidak ada nama owner yang
dikarang. ST-12 tetap tidak PASS tanpa alert yang benar-benar
diterima operator (kriteria ST-12-LAT-01..03 dipertahankan).

### F-006b — narasi insiden di string kode — **blocked (OPEN)**

Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`;
cleanup tetap butuh edit source + otorisasi terpisah. Tidak ada
detail narasi insiden atau data wallet apa pun di dokumen revisi
ini.

### F-006c — DATA-PLAN.md di live artifact — **partially addressed**

Tidak berubah: status tetap "reported by Muse, not independently
verified"; bukti versi/diff live (a)–(c) tetap belum tersedia.

## §3. Response to Previous Handoff — status temuan V9 menurut audit V10 §3 (dicatat, bukan diklaim ulang)

Audit V10 §3 menilai delapan permintaan Handoff V9. Status
independen itu dicatat di sini apa adanya; respons v2.3.17 atas
kekurangan yang dicatat V10 ada di §2 dan §4.

| # | Permintaan V9 | Respons v2.3.16 | Status audit V10 |
|---|---|---|---|
| 1 | Perbaiki fixture exact-byte dan verifikasi cap−1/cap/cap+1 | `exp-pattern.ts`, dua log 60-run, dan `run-144-f031-byte-variants.txt`; total byte di-assert per segmen dan agregat | **ADDRESSED AT VM-FIXTURE LEVEL**; muncul F-033 pada metodologi pengukuran memori. → **DIPERBAIKI v2.3.17 (F-033 §2): TextEncoder dikeluarkan dari measured process; preflight terpisah 61 checks; rerun penuh + rasio terukur ulang 1,12–2,62×.** |
| 2 | Perbaiki false-green harness | `run-f029.ts`, README F-032, dan `run-f032-negative.txt`; tujuh input negatif exit 2, kontrol positif mencatat 12 RESULT | **ADDRESSED WITH CAVEAT**; timeout end-to-end dengan child yang sengaja menggantung belum diuji. → **DITUTUP v2.3.17 (F-032 §2): uji E2E 11 assert PASS — 12 child timeout, ke-12 PID terverifikasi mati, tanpa success line.** |
| 3 | Selesaikan paket keputusan F-030 tanpa mengubah source | Matriks v2.3.16 memberi rekomendasi Opsi A dan fallback Opsi B, tetapi digest rilis Bun dan atestasi SDK belum tersedia | **PARTIALLY ADDRESSED**; clean external builder tetap NOT REPRODUCIBLE. → **Dipertahankan v2.3.17 (F-030 §2): tidak ada fakta baru; blocker tetap CONFIRMED.** |
| 4 | Pertahankan F-028 NOT VERIFIED | Template deployment tetap kosong; field artifact/release/approval tidak diisi | **CORRECTLY NOT VERIFIED**. → **Dipertahankan v2.3.17 (F-028 §2).** |
| 5 | Pertahankan F-019 BLOCKED; jangan invoke checkLink | Matriks menyatakan action tidak di-invoke; bukti kontrol disabled runtime tetap tidak tersedia | **BLOCKED / NOT VERIFIED**, benar dipertahankan. → **Dipertahankan v2.3.17 (F-019 §2).** |
| 6 | Lengkapi ownership staging | STAGE-P01..P12 tetap memiliki prasyarat/prosedur/oracle/evidence, tetapi operator/provider/egress/DB/alert/rollback owner UNASSIGNED | **PARTIALLY ADDRESSED**; belum ada gate READY. → **Dipertahankan v2.3.17 (§4 butir 7): tetap UNASSIGNED, dicatat sebagai BLOCKED dengan prasyarat eksplisit.** |
| 7 | Pertahankan baseline keamanan dan provenance historis | F-001..F-005, F-006b/F-006c, F-016..F-019, U-38/U-33, dan koreksi SU historis dibawa tanpa klaim penutupan | **ADDRESSED AS CARRY-FORWARD**; bukan bukti staging. → **Dipertahankan v2.3.17 (§5).** |
| 8 | Tidak ada source implementation tanpa otorisasi terpisah | Diff hanya dokumen, harness, dan bukti; tiga blob source/manifest/lockfile tetap identik dengan baseline | **ADDRESSED**. → **Dipertahankan v2.3.17 (diff hanya dokumen + harness + bukti; lihat §4 butir 9).** |

## §4. Jawaban atas Handoff V10 §9 (9 butir)

### Butir 1 — Perbaiki F-033 pada harness eksperimen — **addressed**

Validasi exact-byte dipisah dari measured process (preflight
`preflight-fixture.ts`, proses sendiri, 61 checks TextEncoder)
DAN byte dihitung deterministik tanpa Uint8Array sebesar segmen
penuh di measured phase (aritmetik via `fixture.ts` — tidak ada
TextEncoder di `exp-pattern.ts` sama sekali). Bila encoding
tetap diperlukan, ia hanya ada di preflight (proses lain), bukan
di fase ukur — tidak ada buffer yang "dialokasi sebelum baseline
dan dipakai identik di A/B" karena tidak ada buffer encoder sama
sekali di measured phase; overhead tetap yang didokumentasikan
hanya import modul (sebelum baseline, identik A/B). Tidak ada
klaim overhead "berlaku sama" hanya karena tiap pola memanggil
encoder sekali per segmen — encodernya dihilangkan. Acceptance
V10 terpenuhi: A/B tidak menerima overhead encoder dengan
lifecycle/GC berbeda; raw log dan skrip preflight disertakan
(`run-1310-f033.txt`, `run-144-f033.txt`, `preflight-fixture.ts`).
Detail penuh: F-033 §2 di atas.

### Butir 2 — Buktikan lifecycle pola B — **addressed**

Pemindaian satu segmen pindah ke helper `scanSegment()` dengan
scope tertutup; helper mengembalikan hanya `{ found, bytes,
chars }`; referensi `seg` dan `segLower` keluar dari scope
sebelum forced GC dan sebelum segmen berikutnya dibangun.
Acceptance V10 terpenuhi: source menunjukkan lifetime eksplisit
(`exp-pattern.ts`, fungsi `scanSegment` + komentar lifetime)
dan log forced-GC baru disertakan (90 baris `B gc after
segment i` per log run).

### Butir 3 — Ulangi eksperimen F-029 setelah F-033 diperbaiki — **addressed**

Lima run per kombinasi, Bun 1.3.10 DAN 1.4.4, fixture
ASCII/non-ASCII/byte-matched, forced/natural GC. Acceptance
V10 terpenuhi: 60 RESULT per versi, 60 PID unik per versi,
byte exact (1.000.000 / 1.999.939), baseline bersih, metrik
VmHWM + memory breakdown (rss/heapUsed/heapTotal/external di
tiap RESULT + tabel SUMMARY per log). Hasil dinyatakan VM,
bukan staging, di semua dokumen (README F-029, desain
§D.4.28, matriks ini §2). Rerun dibenarkan karena harness
berubah (F-033) — protokol butir 6. Detail penuh + tabel
rasio: F-033 §2 di atas.

### Butir 4 — Lengkapi timeout E2E F-032 — **addressed**

Child dummy lokal `hang-child.ts` yang sengaja menggantung
dibuat DALAM sandbox eksperimen (`evidence/f032-harness-validation/`);
driver `run-f032-timeout-e2e.ts` membuktikan parent timeout,
menghentikan child (ke-12 PID terverifikasi mati), mencatat
failure (12 FAIL + `COUNT MISMATCH` + `parent done: FAILED`),
dan TIDAK mencetak success line. Tidak ada target produksi
atau action scanner yang dipakai. Detail penuh + 11 assert:
F-032 §2 di atas.

### Butir 5 — Pertahankan F-030/F-009 sebagai blocker sampai clean builder tersedia — **addressed** (dipertahankan dengan benar)

Opsi A/B tetap proposal; tidak ada klaim reproducible.
Digest resmi Bun, provenance SDK, frozen install, typecheck,
dan build clean external tetap belum tersedia — tidak ada yang
dikarang. F-030 tetap CONFIRMED BLOCKER; F-009 tetap NOT
REPRODUCIBLE. Detail: F-030 §2 di atas.

### Butir 6 — Pertahankan F-019 dan F-028 NOT VERIFIED — **addressed** (dipertahankan dengan benar)

`checkLink` TIDAK di-invoke; tidak ada public share yang dibuat;
tidak ada perubahan runtime. Manifest deployment hanya berisi
template kosong — tidak ada field yang diisi tanpa bukti
artifact provider yang dapat ditelusuri (tidak ada — jadi
tetap kosong). Detail: F-019 §2 dan F-028 §2 di atas.

### Butir 7 — Lengkapi owner staging — **partially addressed** (tabel lengkap + prasyarat eksplisit; owner tetap UNASSIGNED karena tidak ada keputusan)

Tidak ada keputusan Rama/provider sejak v2.3.16, maka owner
tetap UNASSIGNED — dicatat sebagai BLOCKED, bukan diisi dengan
nama karangan. Prasyarat tiap peran dirumuskan eksplisit di
bawah; oracle PASS/FAIL STAGE-P01..P12 dipertahankan; ST-12
tidak PASS tanpa alert yang diterima operator.

| Peran | Status | Prasyarat penunjukan |
| --- | --- | --- |
| Staging operator | **UNASSIGNED — BLOCKED** | Rama menunjuk operator (nama + kanal kontak) yang dapat menjalankan ST-01..ST-12 dan menerima alert; tanpa operator, tidak ada run staging |
| Runtime provider | **UNASSIGNED — BLOCKED** | Provider menyatakan tertulis: versi/digest runtime artifact, scope `ctx.db` (F-018), dan asal tarball SDK (F-030) |
| Egress owner | **UNASSIGNED — BLOCKED** | Pemilik topologi egress (NAT64/DNS64, prefix, allowlist) ditetapkan; uji S-49/S-50 tidak dapat jalan tanpa ini |
| DB/runtime owner | **UNASSIGNED — BLOCKED** | Pemilik staging DB + runtime ditetapkan; uji H-CAT-01..03 + H-TEN-01..05 tidak dapat jalan tanpa ini |
| Alert channel / operator penerima | **UNASSIGNED — BLOCKED** | Kanal alert + operator penerima ditetapkan; ST-12 hanya PASS bila alert diterima operator ≤ 5 menit dengan isi lengkap (ST-12-LAT-01..03) |
| Rollback owner | **UNASSIGNED — BLOCKED** | Pemilik prosedur rollback ditetapkan; tanpa ini, tidak ada cutover yang dapat di-rollback |

STAGE-P01..P12 dipertahankan lengkap dengan prasyarat,
prosedur aman, PASS/FAIL oracle, dan bukti yang harus
dihasilkan (desain §D.4.26 — tabel 12 baris). Tidak ada gate
READY.

### Butir 8 — Pertahankan baseline keamanan/provenance — **addressed** (dipertahankan dengan benar)

F-001..F-005, F-006b/F-006c, F-016..F-019, U-38/U-33, dan
koreksi SU historis dibawa tanpa klaim penutupan dan tanpa
kenaikan ke PASS. SU-T5 TIDAK direkonstruksi. Detail: §1 dan
§5 di bawah.

### Butir 9 — Tidak ada source implementation tanpa otorisasi terpisah — **addressed** (dipatuhi)

v2.3.17 TIDAK mengubah satu pun file source aplikasi, lockfile,
database, deployment, atau live artifact. Diff revisi ini hanya:
dokumen desain + matriks ini + harness eksperimen
(`evidence/f029-memory-methodology/`, `evidence/f032-harness-validation/`)
+ log mentah. Kebutuhan teknis yang hanya bisa dibuktikan
melalui source change diajukan sebagai proposal perubahan
terpisah di bawah ini (bukan sebagai implementasi) — dibawa
utuh dari matriks v2.3.16 §4 butir 8, tanpa proposal baru:

| Proposal | File list | Rencana diff | Rollback | Test IDs | Dampak DB/runtime |
| --- | --- | --- | --- | --- | --- |
| P-1 (Opsi A, F-030) | `site/package.json` (`packageManager` → `bun@1.4.4`) | Satu baris + dokumentasi versi kanonik | Kembalikan `packageManager` ke `bun@1.3.10` | Frozen install + typecheck + build pada 1.4.4; H-RES-03/05 diulang pada 1.4.4 | Tidak ada dampak DB; runtime staging harus memakai 1.4.4; semua bukti VM 1.3.10 dibaca ulang sebagai bukti versi lama |
| P-2 (Opsi B, F-030) | `site/bun.lock` (regenerasi v1 di bawah 1.3.10) | Lockfile ditulis ulang v1; diff resolusi diperiksa paket-per-paket | Kembalikan `bun.lock` v2 ter-commit | Frozen install + typecheck + build dari lockfile hasil regenerasi; diff resolusi v1 vs v2 | Tidak ada dampak DB; tidak ada perubahan runtime |
| P-3 (SDK path, F-030) | `site/package.json` + `site/bun.lock` (dependensi `@hatch/space-sdk`) | Ganti `file:/opt/hatch/...` dengan artefak SDK vendorkan berdigest (rekomendasi) / paket ter-publish berversi / sumber resmi | Kembalikan ke path lama (hanya di VM ini) | Frozen install + typecheck dari clean builder tanpa `/opt/hatch` | Tidak ada dampak DB; builder harus dapat mengambil SDK tanpa `/opt/hatch` |

Ketiga proposal tetap **HOLD** — masing-masing butuh keputusan
owner (G-G untuk P-1/P-2; owner + runtime provider untuk P-3)
dan otorisasi tahap (b) terpisah sebelum dieksekusi. Digest
rilis Bun 1.4.4 dan atestasi provider atas SDK harus tersedia
pada saat keputusan (saat ini NOT PROVIDED).

## §5. Risk register — U-38/U-33/U-45/U-46 + risiko baru (v2.3.17)

| ID | Status v2.3.17 | Inti |
| --- | --- | --- |
| U-38 | Dijawab v2.3.6 (pidfd), residual U-41 | Tidak berubah. |
| U-33 | Dijawab v2.3.6 (katalog kontrol), residual U-43/U-44 | Tidak berubah. |
| U-41 | Terbuka (terkuantifikasi) | Tidak berubah; STAGE-P08 memberi oracle PASS ≤ 1e-6. |
| U-43 | Terbuka (root sengaja menghapus lock — hanya audit + runbook) | Tidak berubah; STAGE-P12 memberi oracle bukti audit. |
| U-44 | Terbuka (ro-bind-mount bukan default deployment) | Tidak berubah. |
| U-45 | Terbuka (latensi deteksi) | Tidak berubah; STAGE-P11 + ST-12-LAT-01..03 memberi oracle latensi. |
| U-46 | Terbuka — keputusan owner belum ada | Tidak berubah; opsi (a)/(b) tetap terbuka; implementasi pensinyalan tetap DIBLOKIR; STAGE-P07 memberi prasyarat keputusan. |
| U-59..U-62 | Dipertahankan (U-62 dipersempit v2.3.14) | Tidak berubah. |
| U-63 | Terbuka (F-026 — transient chunk) | Tidak berubah. |
| U-64 | **DIPERBARUI v2.3.17** (F-027/F-029/F-033) | Rasio 4,5–5,4× DICABUT; rasio terukur ulang de-confounded 1,12–2,62× (v2.3.17, preflight terpisah + lifecycle eksplisit); rentang 1,13–1,84× v2.3.16 SUPERSEDED; aturan desain (larangan materialisasi + incremental) tetap; H-RES-05 diperbarui (kedua mode GC + fixture v2.3.17). |
| U-65 | Terbuka (F-028 — provenance deployment) | Tidak berubah. |
| U-66 | **DIPERBARUI v2.3.15** (F-009/F-030) | Matriks kompatibilitas + trade-off Opsi A/B + penggantian SDK path dirumuskan (PROPOSAL — HOLD); F-009 tetap NOT REPRODUCIBLE. |
| U-67 | **DIPERBARUI v2.3.17** (F-029/F-033) | Rasio incremental v2.3.14 tidak valid; manfaat terukur ulang 1,12–2,62× dan bergantung GC (forced 1,69–2,62× vs natural 1,12–1,30×); angka forced-GC bukan perilaku runtime natural; rasio VM bukan acceptance staging. Penanganan: H-RES-05 staging (gate G-I) dengan ambang pra-tes + kedua mode GC + fixture v2.3.17. |
| U-68 | **DIPERBARUI v2.3.16** (F-009/F-030) | Lockfile v2 vs Bun kanonik + SDK path absolut; proposal keputusan selesai sebagai paket yang dapat diputuskan (§D.4.27 — rekomendasi Opsi A + SDK vendorkan, fallback Opsi B); digest rilis Bun 1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED; build penuh NOT RUN; dependency digest NOT VERIFIED. Penanganan: keputusan owner G-G + bukti clean-builder (gate G-J). |
| U-69 | **DIPERBARUI v2.3.16** (F-031) | Klaim batas byte fixture v2.3.15 tidak tepat (ASCII 999.981, non-ASCII byte-matched 999.901); rasio v2.3.15 (1,18–1,88×) superseded oleh 1,13–1,84×. **DIPERBARUI v2.3.17:** bukti byte kini diperkuat preflight terpisah (61 checks, independen dari measured process); rasio 1,13–1,84× sendiri dinyatakan SUPERSEDED oleh 1,12–2,62× (F-033). Penanganan: fixture v2.3.17 (preflight + lifecycle eksplisit) untuk H-RES-05 staging (gate G-I); jangan kutip angka v2.3.15/v2.3.16 sebagai pengukuran batas eksak. |
| U-70 | **DIPERBARUI v2.3.17** (F-032) | Parent harness dapat melaporkan sukses dengan nol run (false green); jalur timeout child belum diuji end-to-end. **DIPERBAIKI v2.3.17:** timeout TERBUKTI end-to-end (12 child gantung, ke-12 PID mati, exit 1, tanpa success line — log `run-f032-timeout-e2e.txt`); tes regresi negatif diulang pada harness baru. Sisa risiko: test seam (U-72). Penanganan: harness v2.3.17 adalah oracle untuk rerun apa pun. |
| U-71 | **BARU v2.3.17** (F-033) | Instrumen pengukuran A/B v2.3.16 terkonfounded (encoder sementara + `segLower` hidup melewati GC pola B); rasio 1,13–1,84× superseded; hipotesis arah V10 (rasio lama melebih-lebihkan manfaat) TIDAK terkonfirmasi pada sel forced-GC — confound `segLower` lebih besar daripada transient encoder. Penanganan: harness v2.3.17 (preflight terpisah + lifecycle eksplisit) untuk H-RES-05 staging; rasio 1,12–2,62× tetap HANYA bukti VM, status operasional NOT VERIFIED sampai review independen. |
| U-72 | **BARU v2.3.17** (F-032) | Test seam `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` adalah permukaan override baru di harness: run dengan seam aktif dapat disalahartikan sebagai run produksi. Penanganan: perilaku default tidak berubah; baris log `test-seam:` eksplisit; reviewer WAJIB memeriksa ada/tidaknya baris itu sebelum menerima log sebagai bukti produksi; seam hanya dipakai driver E2E yang terdokumentasi. |

## §6. Hard gates — ditegaskan kembali (v2.3.17)

- No Link Scanner activation.
- No public deployment.
- No production build (house rules: tidak ada `bun run build` dari `site/`).
- No DB/catalog change.
- No source implementation tanpa owner approval terpisah (HOLD perubahan source mirror sampai klarifikasi F-020 tetap berlaku).
- No production testing (termasuk tidak memanggil `checkLink`).
- F-001..F-005, F-016/F-017/F-022, F-018 tetap OPEN/BLOCKED.
- Penutupan F-001 butuh H-SSRF-01..20 terhadap implementasi aktual di staging terisolasi + log mentah + review independen — hasil VM saja tidak cukup.
- Penutupan F-029 sebagai klaim kuantitatif butuh H-RES-05 PASS di staging (ambang pra-tes + kedua mode GC + fixture v2.3.17) — hasil VM v2.3.17 hanya memperbaiki instrumen dan metodologi, bukan membuktikan kapasitas staging.
- Penutupan F-030 butuh keputusan owner G-G + penggantian SDK path + bukti clean-builder (gate G-J).
- Penutupan F-033 sebagai angka operasional butuh review independen atas paket v2.3.17 (audit V11) — rasio 1,12–2,62× sampai saat itu tetap NOT VERIFIED FOR CAPACITY/SIZING.

## §7. Yang butuh keputusan Rama (pemilik proyek)

| # | Keputusan | Konteks | Dampak bila belum diputuskan |
| --- | --- | --- | --- |
| 1 | Scope perubahan source (F-020, G-A) | 3 pertanyaan scope matriks v2.3.11 §6 | HOLD perubahan source tetap berlaku; tidak ada pekerjaan tahap (b) |
| 2 | Tenancy F-018 (G-C) | Pernyataan resmi provider tentang scope `ctx.db` (per-user vs shared) | Desain ownership + H-TEN-01..05 tidak dapat dieksekusi |
| 3 | U-46 (G-D) | Opsi (a) terima fallback numeric-kill terkuantifikasi vs opsi (b) larangan mutlak | Implementasi pensinyalan worker tetap DIBLOKIR |
| 4 | Cache F-022 (G-F) | Cabang pilihan (hapus cache dari semua jalur security-scan, rekomendasi) vs alternatif (6 syarat) | Implementasi cache tidak dapat dimulai |
| 5 | Bun kanonik F-009/F-030 (G-G) | Rekomendasi Opsi A (naikkan kanonik ke 1.4.4) + SDK vendorkan berdigest vs fallback Opsi B (regenerasi lockfile v1) — paket keputusan lengkap di §2 F-030 (v2.3.16); digest rilis Bun 1.4.4 + atestasi provider atas SDK harus diisi pada saat keputusan | Reproducible build tetap NOT VERIFIED; clean builder tetap gagal (gate G-J) |
| 6 | Staging (G-E) | Environment + penunjukan staging operator, runtime provider, egress owner, DB/runtime owner, alert channel/operator penerima, rollback owner | STAGE-P01..P12 tetap BLOCKED; tidak ada validasi staging |
| 7 | Otorisasi implementasi tahap (b) | Persetujuan eksplisit terpisah untuk setiap perubahan source (termasuk proposal P-1/P-2/P-3 di §4 butir 9) | Semua remediasi source tetap desain saja |

## §8. Yang TIDAK diklaim v2.3.17

- v2.3.17 TIDAK mengklaim rasio penghematan incremental apa pun sebagai acceptance staging — rasio 1,12–2,62× adalah bukti VM atas pola simulasi dengan instrumen de-confounded, bukan kapasitas operasional.
- v2.3.17 TIDAK mengklaim rentang rasio v2.3.16 (1,13–1,84×) direproduksi — rentang itu dinyatakan SUPERSEDED oleh pengukuran ulang 1,12–2,62×.
- v2.3.17 TIDAK mengklaim hipotesis arah V10 terkonfirmasi — justru sebaliknya pada sel forced-GC: bias neto berjalan berlawanan arah dengan hipotesis; yang diklaim hanyalah bahwa instrumen lama terkonfounded dan instrumen baru mengukur tanpa kedua confound itu.
- v2.3.17 TIDAK mengklaim F-029 tertutup sebagai bukti staging — yang tertutup adalah instrumen, metodologi VM, lifecycle pola B, dan validasi harness; H-RES-05 staging tetap harus dijalankan dan lolos.
- v2.3.17 TIDAK mengklaim F-030 selesai — proposal keputusan TIDAK mengubah status blocker; F-030 tetap CONFIRMED BLOCKER dan F-009 tetap NOT REPRODUCIBLE.
- v2.3.17 TIDAK mengklaim versi live, approval deployment, atau status runtime apa pun — F-028 tetap NOT VERIFIED, F-019 tetap BLOCKED.
- v2.3.17 TIDAK mengklaim staging tersedia atau owner staging terisi — semua peran tetap UNASSIGNED.
- v2.3.17 TIDAK mengubah satu pun file source aplikasi, lockfile, database/katalog, atau live artifact.

## §9. Gate konkret berikutnya (v2.3.17 → v2.3.18)

- **(G-A)** keputusan owner atas scope perubahan source (F-020).
- **(G-B)** bukti runtime F-019 (versi/digest + kontrol disabled (a)–(e)).
- **(G-C)** keputusan tenancy F-018 (pernyataan resmi provider tentang scope `ctx.db`).
- **(G-D)** keputusan U-46.
- **(G-E)** staging tersedia + peran UNASSIGNED terisi.
- **(G-F)** keputusan cache F-022 — owner menerima cabang pilihan (rekomendasi) vs alternatif.
- **(G-G)** keputusan Bun F-009 — kanonik 1.3.10 vs 1.4.4 (dengan rekomendasi Opsi A + SDK vendorkan vs fallback Opsi B, §2 F-030 v2.3.16).
- **(G-H)** eksekusi harness H-RES-02/03/05 yang sudah dikoreksi — prasyarat: otorisasi implementasi tahap (b) (G-A) + staging tersedia (G-E) + verifikasi ulang perilaku Bun pada versi kanonik (U-62, bagian staging).
- **(G-I)** stress test memori H-RES-03/05 pada staging (chunk > cap, 3 script paralel, fixture batas 1.000.000 + varian cap−1/cap+1 + non-ASCII byte-matched terukur eksak, high-water RSS/VmHWM ≤ ambang pra-tes, kedua mode GC) + proses deployment manifest terisi untuk setiap deployment (F-028).
- **(G-J)** keputusan reproduksibilitas F-030 — prasyarat: keputusan owner G-G (Opsi A vs Opsi B) + penggantian SDK path (paket ter-publish/vendorkan/sumber resmi) + bukti clean-builder (frozen install + typecheck + build exit 0, lockfile tidak berubah, dependency digest tercatat, tanpa `/opt/hatch`).

Pemicu revisi v2.3.18: keputusan owner atas G-A/G-C/G-D/G-F/G-G,
ATAU bukti runtime G-B, ATAU staging tersedia (G-E), ATAU audit
independen V11 — mana pun yang datang dulu. Tidak ada revisi baru
yang hanya mengulang status v2.3.17.

## §10. Hambatan, percobaan, dan hasil (dicatat agar tidak diulang)

| # | Hambatan / percobaan | Hasil | Tindak lanjut |
| --- | --- | --- | --- |
| 1 | Binary Bun 1.3.10 tidak ada di VM ini (`/tmp/bun1310` dibersihkan antar sesi; `~/.bun` tidak ada) | Diunduh ulang dari rilis resmi oven-sh/bun `bun-v1.3.10` (zip 39.328.732 byte) ke `/tmp/bun1310`; verifikasi `bun --revision` = `1.3.10+30e609e08` (SAMA dengan revisi v2.3.14/v2.3.15/v2.3.16) | Binary di `/tmp` bersifat ephemeral — revisi berikutnya kemungkinan harus mengunduh ulang; log mentah di repo adalah bukti yang dipertahankan, bukan binary-nya |
| 2 | Draf pertama v2.3.16 membangun fixture SEBELUM baseline | Delta VmHWM menyusut ke 0 pada beberapa kombinasi 1.4.4 (baseline VmHWM sudah memuat input) dan rasio menjadi "Infinityx" pada 2 kombinasi | Urutan diperbaiki (baseline dulu, lalu bangun fixture); log trial DIBUANG (tidak di-commit) dan dicatat di README F-029 + di sini, bukan disembunyikan |
| 3 | Draf kedua membangun SEMUA segmen di muka untuk pola B | Pola B tidak lagi incremental (input dipegang bersamaan); B melebihi A pada 1 kombinasi 1.4.4 nonascii-bytes forced (rasio 0,93×) | Segmen dibangun lazy per pola (pola B satu per satu, dilepas sebelum berikutnya); log trial DIBUANG (tidak di-commit) dan dicatat di README F-029 + di sini |
| 4 | Rentang rasio v2.3.15 (1,18–1,88×) tidak direproduksi eksak | Rerun exact-byte memberi 1,13–1,84× (perbedaan kecil, dalam sebaran antar-run) | Rentang lama dinyatakan SUPERSEDED di desain, matriks ini, dan README F-029; rentang baru dilaporkan apa adanya |
| 5 | Draf pertama driver E2E F-032 hanya memeriksa PID child gantung TERAKHIR (hang-child menimpa pidfile dengan `writeFileSync`) | Driver + hang-child diperbaiki (append satu PID per baris; driver memeriksa ke-12 PID mati via kill(pid,0) → ESRCH) dan uji di-rerun penuh (36 detik); log draf pertama DITIMPA oleh rerun yang lebih kuat | Kelemahan ini dicatat di README F-032 + di sini, bukan disembunyikan; log final adalah rerun yang lebih kuat |
| 6 | Hipotesis arah audit V10 atas F-033 (rasio lama melebih-lebihkan manfaat incremental) tidak terkonfirmasi pada sel forced-GC | Rerun de-confounded memberi rasio LEBIH TINGGI pada sel forced-GC (1.4.4 ascii 1,57× → 2,48×; nonascii 1,70× → 2,62×) karena confound `segLower` lebih besar daripada transient encoder; sel natural-GC hampir tidak bergerak | Hipotesis arah DITOLAK dengan dasar teknis + bukti (F-033 §2); temuan F-033-nya sendiri DITERIMA; rasio baru dilaporkan apa adanya dan tetap BUKAN acceptance staging |
