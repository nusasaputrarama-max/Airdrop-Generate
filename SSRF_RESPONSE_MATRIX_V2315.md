# SSRF RESPONSE MATRIX v2.3.15 — Jawaban atas Audit Independen ChatGPT V8

**Dokumen:** matriks respons revisi desain v2.3.15
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_INDEPENDENT_AUDIT_V8.md` (commit `bed14bd`, 2026-11-08)
  — temuan baru F-029, F-030 + Muse Handoff §9 (8 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.15:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.15 — §D.4.26 ringkasan revisi, risiko baru U-67/U-68 di §G,
U-64/U-66 diperbarui, gerbang G-J baru, koreksi rasio 4,5–5,4× pada
§D.4.25 + tabel perubahan v2.3.14 + paragraf penutup) +
`evidence/f029-memory-methodology/` (baru — harness proses-terpisah +
VmHWM + 2 log mentah) + `evidence/f030-bun-compatibility/` (baru —
matriks kompatibilitas + log frozen install/typecheck 1.4.4).
Matriks v2.3.14 (`SSRF_RESPONSE_MATRIX_V2314.md`) dipertahankan utuh
sebagai catatan sejarah revisi itu. Temuan F-001..F-028 dibawa ke sini
dengan status terbarunya; yang baru di v2.3.15 hanyalah F-029, F-030,
koreksi rasio F-027, matriks kompatibilitas Bun/lockfile/SDK path,
dan pelengkapan STAGE-P01..P12.

**Yang TIDAK dilakukan v2.3.15:** tidak ada kode aplikasi yang diubah
(tidak ada file `.ts`/`.tsx` yang disentuh — termasuk tidak ada
perubahan `site/package.json` / `site/bun.lock` di repo), tidak ada
perubahan database/katalog, tidak ada production build, tidak ada
pemanggilan action produksi apa pun (termasuk `checkLink` — tidak
di-invoke), Link Scanner tidak diaktifkan, public tester tidak
disentuh, live artifact tidak diubah. Bukti yang dipakai adalah:
eksperimen VM lokal read-only atas pola string turunan (proses anak
terpisah, tanpa jaringan eksternal, tanpa artifact live) plus frozen
install + typecheck pada salinan sementara `site/` di `/tmp` (bukan
`site/` di repo). Bukti 1.3.10 untuk F-030 dikutip dari paket F-009
v2.3.14 dan TIDAK diulang (tidak ada perubahan material yang
membenarkan pengulangan — protokol butir 6).

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.15

Sesuai keputusan pemilik proyek (2026-11-07 ~23:56 WIB, dikonfirmasi
~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan tidak boleh
dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.15.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.15 TIDAK mengimplementasikan apa pun. **HOLD perubahan source tetap berlaku (F-020, §2, §6).** |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.15. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.**

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Tidak ada butir yang berstatus ini di v2.3.15 — semua temuan V8 diterima sebagai sah. |

## §1. Ringkasan status F-001..F-030

| ID | Severity | Status v2.3.15 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah: desain + harness H-SSRF-01..20 selesai; implementasi menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Implementasi tetap menunggu tahap (b); **spesifikasi H-RES-05 DIPERBARUI v2.3.15** (F-029 §2): high-water RSS/VmHWM pada kedua mode GC (forced dan natural, dilaporkan terpisah) + fixture non-ASCII byte-matched. |
| F-003 | High — tanpa total deadline | **blocked** | Tidak berubah: deadline total 30 detik PARTIALLY MITIGATED di kode mirror (d85a1e2) — tanpa tes regresi, status penutupan TIDAK berubah: tetap OPEN sampai H-RES-06 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Tidak berubah: desain unique constraint selesai; implementasi (termasuk migrasi DB) menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Tidak berubah: auth di dalam kode TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED; mekanisme otorisasi butuh keputusan pemilik. |
| F-006a | Medium — redaksi dokumen mirror `site/DATA-PLAN.md` | **addressed** | Tidak berubah. |
| F-006b | Medium — narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`; cleanup tetap butuh edit source + otorisasi terpisah. |
| F-006c | Medium — DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah: status tetap "reported by Muse, not independently verified"; bukti versi/diff live (a)–(c) tetap belum tersedia. |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Tidak berubah (lihat §3 V8 §7.1). |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Tidak berubah. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | **BARU v2.3.15 (F-030 §2):** matriks kompatibilitas terverifikasi — 1.3.10 menolak lockfile v2 (log F-009), 1.4.4 menerima (frozen install + typecheck exit 0, log baru); clean external builder tetap TIDAK DAPAT install pada versi Bun mana pun karena SDK path absolut. Status keseluruhan tetap NOT REPRODUCIBLE untuk clean external builder. |
| F-010 | Medium — bundle SU asli mengulang RUN=1 di tiga file | **addressed** (sebagai koreksi bukti) | Tidak berubah; koreksi V5 §6.1 / V6 §8.1 / V7 §7.1 / V8 §7.1 diterima dan dipertahankan terlihat. |
| F-011 | Medium — matriks fitur tester statis tidak cocok dengan client | **addressed** (sebagai koreksi dokumen) | Tidak berubah; tester tetap ON HOLD. |
| F-012 | Medium — F-006 dinyatakan addressed padahal residu masih ada | **addressed** (sebagai pemisahan status) | Tidak berubah. |
| F-013 | Medium — owner gate staging tidak lengkap | **partially addressed** | **BARU v2.3.15:** STAGE-P01..P12 dilengkapi prasyarat, prosedur aman, PASS/FAIL oracle, dan bukti yang harus dihasilkan (§D.4.26 + §2 di bawah); operator/kanal alert/egress/DB tetap UNASSIGNED/BLOCKED — tidak ada nama owner yang dikarang; tidak ada gate READY. Kriteria ST-12-LAT-01..03 dipertahankan. |
| F-014 | Medium — catatan reproduksibilitas basi | **partially addressed** | **BARU v2.3.15:** reproduksibilitas pada 1.4.4 diuji ulang (frozen install + typecheck exit 0, log baru); 1.3.10 tetap gagal (log F-009). Lihat F-009/F-030. |
| F-015 | Low/Medium — DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode | **addressed** (mirror) / **blocked** (live) | Tidak berubah; teks koreksi live sudah disiapkan, belum diterapkan. |
| F-016 | Medium — cache hasil scan basi (false-negative) | **partially addressed** | Tidak berubah: cabang pilihan dinyatakan (hapus cache dari semua jalur security-scan); implementasi + tes menunggu tahap (b) + HOLD F-020. |
| F-017 | Medium — cache key mengabaikan cap | **partially addressed** | Tidak berubah: semantik kepemilikan G-F diklarifikasi v2.3.13 — cabang pilihan adalah rekomendasi yang menunggu penerimaan owner, BUKAN otorisasi implementasi; F-017 + H-CACHE-05/06 menjadi NOT APPLICABLE HANYA SETELAH cabang penghapusan cache diimplementasikan. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | Tidak berubah: kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checklink` MASIH TERDAFTAR (paket F-021); tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. Deployment tetap BLOCKED. |
| F-020 | Medium — scope refactoring source mirror perlu klarifikasi otorisasi | **partially addressed** | Tidak berubah: HOLD dipertahankan; tidak ada perubahan source di v2.3.15; tidak ada revert d85a1e2; tidak ada artefak approval terpisah di repo. |
| F-021 | Medium — bukti artifact-state tidak auditable | **partially addressed** | Tidak berubah: paket bukti + digest dipublikasikan v2.3.12; version/digest artifact tetap NOT PROVIDED (tidak diekspos tool). |
| F-022 | Medium — keputusan cache + oracle tes cap tidak koheren | **partially addressed** | Tidak berubah: oracle tes cap dikoreksi v2.3.12/v2.3.13/v2.3.14; **H-RES-05 DIPERBARUI v2.3.15** (F-029 §2 — kedua mode GC + fixture non-ASCII byte-matched); implementasi + tes tetap menunggu tahap (b) + staging. |
| F-023 | Medium — H-RES-02 berisi kondisi fixture UTF-8 yang mustahil | **addressed** (desain) | Tidak berubah: arah mustahil dihapus v2.3.13; tiga fixture feasible + angka terverifikasi dipublikasikan. Harness staging belum dijalankan. |
| F-024 | Medium — H-RES-03 tidak mendefinisikan lapisan byte yang di-cap | **addressed** (desain) | Tidak berubah: perilaku dekompresi transparan TERKONFIRMASI pada Bun kanonik 1.3.10 (re-run v2.3.14). Staging + `deflate`/`zstd` tetap NOT VERIFIED. |
| F-025 | Medium — H-RES-05 tanpa angka aggregate budget | **addressed** (desain) | **BARU v2.3.15:** angka 1.000.000 byte tetap sebagai input-body budget; spesifikasi H-RES-05 diperluas (F-029 §2 — kedua mode GC + fixture byte-matched). Tes staging belum dijalankan. |
| F-026 | Medium — batas decoded-byte tidak membatasi transient chunk allocation | **addressed** (desain) | Tidak berubah: anggaran A1 vs A2 dipisah v2.3.14; chunk maksimum terukur 528.384 byte (1.3.10); BYOB NOT VERIFIED. Tes staging belum dijalankan. |
| F-027 | Medium — L2 tidak mencakup representasi string turunan | **addressed** (desain) / **koreksi kuantitatif v2.3.15** | **BARU v2.3.15 (F-029 §2):** karakter hidup 3,60× DIPERTAHANKAN sebagai character accounting; **rasio penghematan incremental 4,5–5,4× v2.3.14 DICABUT — TIDAK TERKONFIRMASI**; rasio terkoreksi **1,18–1,88×** (median VmHWM). Larangan materialisasi bersamaan + pemindaian incremental TETAP berlaku. Tes staging belum dijalankan. |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan); template manifest dipublikasikan (`DEPLOYMENT_MANIFEST_TEMPLATE.md`) — manifest itu sendiri tetap KOSONG sampai operator menyediakannya. Tidak ada tebakan versi live. |
| F-029 | Medium — perbandingan peak memory F-027 tidak valid secara metodologis | **addressed** (metodologi + koreksi klaim) | **BARU v2.3.15:** harness proses-terpisah + VmHWM + median 5 run + fixture non-ASCII (char-matched dan byte-matched); 120 run anak, 0 gagal, 120 PID berbeda; rasio terkoreksi 1,18–1,88×; rasio lama 4,5–5,4× dinyatakan NOT VERIFIED dan dicabut sebagai klaim kuantitatif. Manfaat staging (bukan angka VM) tetap harus dibuktikan di H-RES-05. |
| F-030 | Medium — lockfile ter-commit tidak kompatibel dengan Bun kanonik | **partially addressed** (matriks + proposal; blocker CONFIRMED) | **BARU v2.3.15:** matriks kompatibilitas terverifikasi (1.3.10 menolak v2; 1.4.4 menerima — frozen install + typecheck exit 0, log baru); trade-off Opsi A vs Opsi B + penggantian SDK path dirumuskan sebagai PROPOSAL — HOLD sampai persetujuan implementasi terpisah. F-030 tetap CONFIRMED BLOCKER; F-009 tetap NOT REPRODUCIBLE. |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif. Tidak ada public deployment yang
diotorisasi.**

## §2. Respons per temuan baru V8

### F-029 — Medium: perbandingan peak memory F-027 tidak valid secara metodologis — **addressed** (metodologi diperbaiki + klaim kuantitatif dikoreksi; bukti VM baru pada Bun 1.3.10 dan 1.4.4, tes staging belum dijalankan)

**Temuan (diterima sepenuhnya):** Audit V8 benar di semua lima
poin bukti (§5 F-029): (1) Bagian A membuat `scriptText`,
`haystack`, `lower`; (2) hanya `html` dan `scriptTexts` yang
dilepas, komentar A8 menyatakan tiga string turunan tetap hidup
sampai proses berakhir; (3) Bagian B dimulai dalam proses yang sama
dan mengambil `baseB` setelah A — baseline B sudah memuat string
turunan A; (4) README membandingkan delta A dari baseline A dengan
delta B dari baseline B dan menyimpulkan 4,5–5,4× — kedua baseline
tidak merepresentasikan proses bersih yang sebanding; (5) pengukuran
adalah checkpoint `process.memoryUsage()` setelah operasi/GC, bukan
OS high-water mark.

**Eksperimen VM baru v2.3.15
(`evidence/f029-memory-methodology/`):** parent harness
`run-f029.ts` + child `exp-pattern.ts`, tanggal 2026-11-08, Bun
1.3.10 (`1.3.10+30e609e08`, diunduh dari rilis resmi oven-sh/bun
`bun-v1.3.10`) DAN Bun 1.4.4 (`1.4.4+38afee6c8`). Skrip
`exp-pattern.ts` (SHA-256
`4419100ed891f17f51ff969848d08ea2ac61d0f7aee663749e2867c3e8879f73`)
menjalankan SATU pola per proses anak; `run-f029.ts` (SHA-256
`f4e1bbe6ad21dcb95fa91b38ef186e77e9853c096f372e58ca357b68df1be3c1`)
men-spawn anak dengan binary Bun yang sama (`process.execPath`),
flags/environment identik, input identik. Log mentah:
`run-1310-f029.txt` (SHA-256
`25abea8cee91999fe233c65c541181eb5481635d70cfd08784057c73e3693513`,
689 baris) dan `run-144-f029.txt` (SHA-256
`44943f572835ced5347fd9db8ddbf15e25ed1e9902f077b7cae406932fa4df82`,
689 baris).

Penerimaan mitigasi V8, butir demi butir:

| Mitigasi V8 | Bukti v2.3.15 |
| --- | --- |
| Pola A dan B sebagai dua proses terpisah dari parent harness | 120 run anak (60 per versi Bun), masing-masing proses baru; parent memverifikasi 60 PID berbeda dari 60 run per versi, 0 gagal, 0 PID duplikat |
| Binary Bun yang sama, input identik, flags/environment identik, baseline bersih per proses | Anak di-spawn dengan `process.execPath` (binary yang sama dengan parent); tidak ada flag tambahan; environment diwarisi identik; input: halaman 400.000 + 2 script 300.000 karakter (fixture nonascii-bytes: 200.000 + 2×150.000 karakter = 500.000 karakter) |
| Catat RSS high-water OS (VmHWM), RSS saat ini, external, heapUsed; jangan memakai heapUsed saja | Setiap anak mencatat baseline + final: VmHWM (`/proc/self/status`), RSS, heapUsed, heapTotal, external; metrik utama = VmHWM delta |
| Pisahkan pengujian forced-GC dan natural-GC; jangan mencampur hasilnya | 2 mode GC × dilaporkan terpisah di semua tabel; forced: `Bun.gc(true)` di tiap titik ukur; natural: tanpa GC eksplisit |
| Ulangi beberapa run dan laporkan median serta rentang, bukan satu sampel | 5 run per kombinasi (12 kombinasi × 5 = 60 run per versi); semua tabel memakai median + [min..max] |
| Uji fixture non-ASCII | `nonascii` (U+00E9, 1.000.000 karakter) DAN `nonascii-bytes` (U+00E9, 500.000 karakter = 1.000.000 byte UTF-8, batas byte L2) |
| Jangan menyebut simulasi sebagai implementasi | README + desain menyatakan eksplisit: eksperimen VM atas pola simulasi, BUKAN implementasi; bukan staging/produksi |

**Hasil apa adanya (median VmHWM delta vs baseline bersih tiap
proses, byte):**

| Bun | Fixture | GC | A median [rentang] | B median [rentang] | Rasio A/B |
| --- | --- | --- | --- | --- | --- |
| 1.3.10 | ascii | forced | 5.009.408 [4.947.968..5.468.160] | 3.194.880 [3.141.632..3.248.128] | 1,57× |
| 1.3.10 | ascii | natural | 4.911.104 [4.911.104..4.915.200] | 3.723.264 [3.719.168..3.727.360] | 1,32× |
| 1.3.10 | nonascii | forced | 5.443.584 [5.144.576..5.459.968] | 3.325.952 [3.309.568..3.690.496] | 1,64× |
| 1.3.10 | nonascii | natural | 5.042.176 [5.042.176..5.050.368] | 3.854.336 [3.850.240..3.858.432] | 1,31× |
| 1.3.10 | nonascii-bytes | forced | 3.137.536 [3.031.040..3.457.024] | 1.667.072 [1.585.152..2.105.344] | 1,88× |
| 1.3.10 | nonascii-bytes | natural | 2.936.832 [2.936.832..2.945.024] | 2.338.816 [2.334.720..2.347.008] | 1,26× |
| 1.4.4 | ascii | forced | 4.091.904 [3.903.488..4.239.360] | 2.355.200 [2.101.248..2.445.312] | 1,74× |
| 1.4.4 | ascii | natural | 4.583.424 [4.583.424..4.648.960] | 3.854.336 [3.850.240..3.915.776] | 1,19× |
| 1.4.4 | nonascii | forced | 4.038.656 [3.944.448..4.116.480] | 2.412.544 [2.301.952..2.428.928] | 1,67× |
| 1.4.4 | nonascii | natural | 4.669.440 [4.669.440..4.673.536] | 3.936.256 [3.936.256..3.940.352] | 1,19× |
| 1.4.4 | nonascii-bytes | forced | 2.207.744 [2.170.880..2.412.544] | 1.368.064 [1.339.392..1.470.464] | 1,61× |
| 1.4.4 | nonascii-bytes | natural | 2.854.912 [2.854.912..2.920.448] | 2.420.736 [2.420.736..2.486.272] | 1,18× |

**Rasio terkoreksi keseluruhan: 1,18–1,88× (median VmHWM).**
Rasio 4,5–5,4× v2.3.14 **TIDAK TERKONFIRMASI** — angka itu adalah
artefak baseline B yang tercemar (string A yang masih hidup membuat
delta B tampak kecil), bukan efek pola incremental itu sendiri.
Angka lama dinyatakan **NOT VERIFIED** dan **TIDAK BOLEH** dipakai
sebagai sizing/cgroup acceptance atau kapasitas operasional.
Koreksi dicatat pada §D.4.25 (F-027), tabel perubahan v2.3.14
butir 2, dan paragraf penutup desain — bukan dihapus diam-diam.

**Temuan lanjutan yang dilaporkan apa adanya:**

- Manfaat incremental **nyata tetapi lebih kecil**: pola B selalu
  lebih rendah dari pola A pada fixture+GC yang sama.
- **Manfaat bergantung pada GC:** forced-GC 1,57–1,88×;
  natural-GC (perilaku runtime realistis) hanya 1,18–1,32×,
  karena segmen yang dilepas pola B tetap menahan halaman
  allocator sampai GC berjalan. Desain TIDAK BOLEH mengasumsikan
  angka forced-GC sebagai perilaku runtime nyata.
- **Karakter hidup 3,60× DIPERTAHANKAN sebagai character
  accounting** (3.599.936 karakter hidup pada titik analisis pola
  A — deterministik, sama di kedua versi), BUKAN klaim peak-memory.
- **`heapUsed` tetap bukan oracle di Bun 1.3.10:** delta heapUsed
  = 0 pada SEMUA 60 run anak 1.3.10, sementara VmHWM naik
  1,7–5,4 MB. Pada 1.4.4 heapUsed bergerak (A forced ~1.005.336;
  B forced ~8.716). Ambang acceptance WAJIB memakai VmHWM/RSS
  (+ external), per versi runtime.
- **Fixture non-ASCII:** pada jumlah karakter yang sama, peak
  VmHWM non-ASCII ≈ ASCII (penyimpanan string UTF-16 per code
  unit); pada batas byte L2 yang sama, konten non-ASCII hanya
  500.000 karakter sehingga peak absolutnya lebih rendah
  (A: 2,2–3,1 MB vs 4,0–5,4 MB ASCII).
- **Deteksi tidak hilang:** `asksConnect = true` pada SEMUA 120
  run anak.
- **Konkurensi TIDAK disimulasikan di VM** (satu scan per proses
  adalah inti koreksi metodologi) — oracle konkurensi tetap
  staging H-RES-05.

**Keputusan desain yang mengikat:** (1) rasio 4,5–5,4× DICABUT
sebagai klaim kuantitatif; (2) aturan desain v2.3.14 TETAP BERLAKU
(L2 = input-body budget; larangan materialisasi bersamaan;
pemindaian incremental) — karena manfaatnya nyata DAN karena
larangan itu membatasi worst-case (3,60× karakter hidup), bukan
karena rasio lama; (3) H-RES-05 diperbarui (staging): acceptance =
high-water RSS/VmHWM ≤ ambang pra-tes, kedua mode GC dilaporkan
terpisah, fixture batas ASCII + non-ASCII byte-matched,
concurrency yang disepakati.

**Risiko tersisa:** U-67 (rasio terkoreksi bergantung GC; angka
forced-GC bukan perilaku runtime natural; rasio VM BUKAN acceptance
staging). **Aksi berikutnya:** H-RES-05 di staging (gate G-I) +
audit V9 atas paket ini.

### F-030 — Medium: lockfile ter-commit tidak kompatibel dengan Bun kanonik — **partially addressed** (matriks kompatibilitas + trade-off proposal; blocker CONFIRMED, tidak ada perubahan source)

**Temuan (diterima sepenuhnya):** `packageManager` menyatakan Bun
1.3.10 (`site/package.json:4`), sementara lockfile memakai version
2 (`site/bun.lock:2`); log frozen install 1.3.10 menampilkan
`Unknown lockfile version` dan gagal. Non-frozen install berhasil
hanya setelah lockfile di scratch ditulis ulang ke version 1.
Typecheck setelahnya tidak membuktikan install dari lockfile
ter-commit. Absolute local SDK path
(`file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`)
adalah blocker clean-builder terpisah.

**Matriks kompatibilitas baru v2.3.15
(`evidence/f030-bun-compatibility/`):**

| Dimensi | Bun 1.3.10 (kanonik) | Bun 1.4.4 (`1.4.4+38afee6c8`) |
| --- | --- | --- |
| Membaca lockfile v2 ter-commit | **TIDAK** — `Unknown lockfile version` | **YA** |
| Frozen install | **GAGAL exit 1** (log F-009 `run-1310-install.txt`, SHA-256 `75641b138c5e293b6c14d125c4eb0054d807e5ce640ecb30792b598e06f4b33b`) — TIDAK diulang v2.3.15 (bukti valid sudah ada) | **BERHASIL exit 0**, 79 paket, lockfile TIDAK berubah (hash tetap `a7e1457e…`) — log baru `run-144-frozen-install-typecheck.txt` (SHA-256 `549c0c1a4614c9818f55a4bcf7c56562e99b43200188d1d345dcec59ecd3e160`, 26 baris) |
| Typecheck (client + server) | **NOT VERIFIED** terhadap lockfile v2 | **BERHASIL exit 0** terhadap lockfile ter-commit v2 (log baru yang sama) |
| Build penuh | NOT RUN (house rules) | NOT RUN (house rules) |
| SDK path `file:/opt/hatch/...` | Install berhasil HANYA karena path ada di VM ini | Sama |
| Clean external builder (tanpa `/opt/hatch`) | **TIDAK DAPAT install** — gagal di lockfile v2 sebelum SDK path | **TIDAK DAPAT install** — lockfile lolos, SDK path absolut tidak ada |
| Dependency digest / provenance | NOT VERIFIED | NOT VERIFIED |

Tarball SDK diverifikasi ulang 2026-11-08: ada (2.051.070 byte,
SHA-256 `f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`
— SAMA dengan v2.3.9); provenance tetap NOT VERIFIED.
**Versi Bun minimum yang menerima lockfile v2: NOT VERIFIED**
(hanya 1.3.10 dan 1.4.4 yang terverifikasi; sweep versi di
antaranya tidak dilakukan — keputusan G-G hanya membutuhkan satu
versi kompatibel yang terverifikasi).

**Trade-off Opsi A vs Opsi B (keduanya PROPOSAL — HOLD sampai
persetujuan implementasi terpisah; TIDAK ADA perubahan source/
lockfile di revisi ini):**

- **Opsi A — naikkan Bun kanonik ke versi yang kompatibel lockfile
  v2 (mis. 1.4.4):** ubah `packageManager`; `bun.lock` tetap v2;
  resolusi dependensi tidak berubah; frozen install + typecheck
  1.4.4 sudah dua kali terkonfirmasi. Kerugian: SEMUA bukti VM
  1.3.10 harus dibaca ulang sebagai bukti versi lama (perilaku
  chunk/dekompresi/GC 1.4.4 terbukti berbeda dari 1.3.10 di
  F-026/F-029); runtime staging harus memakai versi baru itu.
- **Opsi B — regenerasi lockfile dengan Bun 1.3.10 (v1), kunci
  kanonik tetap 1.3.10:** ubah `bun.lock` ke v1; `packageManager`
  tetap; bukti VM 1.3.10 tetap berlaku. Kerugian: resolusi
  dependensi HARUS diverifikasi ulang paket-per-paket (perbedaan
  versi transitif vs lockfile v2 belum diperiksa); frozen install
  + typecheck terhadap lockfile hasil regenerasi belum dibuktikan
  sebagai satu alur bersih.
- **Penggantian absolute local SDK path (wajib di KEDUA opsi):**
  (1) paket ter-publish berversi (registry/URL bertanda digest);
  (2) vendorkan artefak SDK berversi ke repo dengan digest SHA-256
  tercatat; (3) artefak SDK dari sumber resmi runtime provider
  dengan provenance yang dapat diverifikasi. Opsi dipilih owner +
  runtime provider.

**Acceptance F-030 (untuk audit V9):** clean external builder
tanpa `/opt/hatch`; versi Bun tepat sama dengan `packageManager`;
frozen install exit 0 dan tidak mengubah lockfile; typecheck dan
build exit 0 dari pohon yang sama; dependency digest dan artifact
digest dicatat; raw log serta environment manifest disimpan.
**Tidak ada satu pun kriteria ini yang terpenuhi hari ini** —
F-030 tetap **CONFIRMED BLOCKER** dan F-009 tetap
**NOT REPRODUCIBLE**.

**Risiko tersisa:** U-68 (keputusan reproduksibilitas belum ada;
clean builder/CI tidak dapat mereproduksi install). **Aksi
berikutnya:** keputusan owner G-G (gate G-J) + penggantian SDK path
+ bukti clean-builder.

### F-027 — koreksi kuantitatif (dampak F-029) — **addressed** (sebagai koreksi bukti)

Rasio penghematan incremental 4,5–5,4× v2.3.14 **DICABUT** sebagai
klaim kuantitatif (lihat F-029 §2 di atas). Yang dipertahankan:
karakter hidup 3.599.936 = 3,60× input sebagai character
accounting; peak RSS v2.3.14 (+4,98× input pada 1.3.10 /
+4,33× pada 1.4.4) sebagai pengukuran checkpoint satu-proses yang
kini digantikan metrik VmHWM yang benar — angka RSS lama TIDAK
dihapus dari catatan (tetap terlihat di §D.4.25 + matriks v2.3.14)
tetapi TIDAK BOLEH dikutip sebagai perbandingan A/B atau sebagai
acceptance. Aturan desain (larangan materialisasi bersamaan +
pemindaian incremental) tidak berubah.

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

Tidak ada perubahan source di v2.3.15; tidak ada revert d85a1e2;
tidak ada artefak approval terpisah di repo. HOLD perubahan source
lanjutan tetap berlaku sampai owner mengklarifikasi scope.

### F-018 — isolasi data antar-pengguna — **partially addressed** (tidak ada fakta baru)

Kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime
tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada.
Tidak ada kesimpulan dari nama tipe saja.

### F-001..F-005 — spesifikasi implementasi dipertahankan — **blocked** (desain selesai; implementasi + bukti staging menunggu tahap b)

Tidak ada perubahan status. Satu pembaruan spesifikasi (F-029 §2):
H-RES-05 kini mensyaratkan pengukuran high-water RSS/VmHWM pada
kedua mode GC (forced dan natural, dilaporkan terpisah) + fixture
non-ASCII byte-matched. Handoff V8 BUKAN izin mengubah source.

### Reproducibility + ownership staging (handoff V8 butir 3 dan 6) — **blocked**

Reproducibility: lihat F-030 §2 di atas (matriks + proposal HOLD).
Ownership staging: STAGE-P01..P12 dilengkapi prasyarat, prosedur
aman, PASS/FAIL oracle, dan bukti yang harus dihasilkan
(§D.4.26 desain — tabel 12 baris; ringkasan di §4 butir 6 di
bawah). Semua peran tetap **UNASSIGNED**; tidak ada nama owner
yang dikarang. ST-12 tetap tidak PASS tanpa alert yang benar-benar
diterima operator (kriteria ST-12-LAT-01..03 dipertahankan).

### F-006b — narasi insiden di string kode — **blocked (OPEN)**

Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`;
cleanup tetap butuh edit source + otorisasi terpisah. Tidak ada
detail narasi insiden atau data wallet apa pun di dokumen revisi
ini.

### F-006c — DATA-PLAN.md di live artifact — **partially addressed**

Tidak berubah: status tetap "reported by Muse, not independently
verified"; bukti versi/diff live (a)–(c) tetap belum tersedia.

## §3. Response to Previous Handoff — status temuan V7 menurut audit V8 §3 (dicatat, bukan diklaim ulang)

Audit V8 §3 menilai sembilan permintaan Handoff V7. Status
independen itu dicatat di sini apa adanya; respons v2.3.15 atas
kekurangan yang dicatat V8 ada di §2 dan §4.

| # | Permintaan V7 | Respons v2.3.14 | Status audit V8 |
|---|---|---|---|
| 1 | Pisahkan accepted bytes dari transient/in-flight memory; jangan klaim overhead nol; staging raw output | A1/A2 dipisahkan. Log VM Bun 1.3.10 dan 1.4.4 diterbitkan. Staging belum tersedia. | **PARTIALLY ADDRESSED** — desain dan bukti VM membaik; acceptance staging belum terpenuhi. |
| 2 | Tegaskan L2 sebagai input-body atau peak-memory budget; hindari salinan string simultan | L2 ditetapkan sebagai input-body budget; desain incremental ditambahkan. Rasio penghematan incremental bermasalah karena baseline eksperimen tercemar (F-029). | **PARTIALLY ADDRESSED** — semantik L2 benar-benar diperjelas; klaim kuantitatif incremental harus ditarik sampai eksperimen diperbaiki. → **DITARIK v2.3.15 (F-029 §2): rasio 4,5–5,4× dicabut; rasio terkoreksi 1,18–1,88×.** |
| 3 | Buktikan live v15 atau pertahankan NOT VERIFIED dengan manifest | Template manifest non-secret dibuat; semua field tetap NOT PROVIDED. | **CORRECTLY NOT VERIFIED** — tidak ada provenance deployment baru. → **Dipertahankan v2.3.15 (F-028 §2).** |
| 4 | Pertahankan F-019 BLOCKED; jangan invoke checkLink atau mengubah runtime | Matriks menyatakan checkLink tidak di-invoke, tidak ada public share atau perubahan runtime. Bukti status nonaktif lengkap belum tersedia. | **BLOCKED / NOT VERIFIED** — tidak ada perubahan status. → **Dipertahankan v2.3.15 (F-019 §2).** |
| 5 | Pertahankan F-001..F-005 sebagai blocker sampai implementasi dan staging diotorisasi | Semua blocker dipertahankan; tidak ada source implementation. | **CARRIED FORWARD / BLOCKED**. → **Dipertahankan v2.3.15.** |
| 6 | Buktikan clean build Bun 1.3.10 tanpa absolute local SDK path | Frozen install Bun 1.3.10 gagal karena lockfile v2; non-frozen install menulis ulang lockfile di scratch. Absolute SDK path masih ada. | **NOT SATISFIED** — F-009 makin terkonfirmasi sebagai blocker. → **F-030 v2.3.15: matriks kompatibilitas + trade-off Opsi A/B (PROPOSAL — HOLD); blocker tetap CONFIRMED.** |
| 7 | Tetapkan owner dan prasyarat staging | Staging operator, provider, egress, DB/runtime, alert recipient, dan rollback owner tetap UNASSIGNED. | **BLOCKED**. → **v2.3.15: STAGE-P01..P12 dilengkapi prasyarat/prosedur/oracle/bukti; peran tetap UNASSIGNED (§4 butir 6).** |
| 8 | Pertahankan provenance suite lama dan jangan merekonstruksi SU-T5 | Koreksi bundle asli dan bundle suplemen dipertahankan; log gagal SU-T5 tidak direkonstruksi. | **ADDRESSED AS EVIDENCE CORRECTION** — bukan bukti bahwa suite lulus di staging. → **Dipertahankan v2.3.15.** |
| 9 | Carry-forward tenancy, privacy, U-38/U-33 dan risiko operasional | F-018, F-006b/F-006c, U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa klaim penutupan. | **CARRIED FORWARD**. → **Dipertahankan v2.3.15 (§5).** |

## §4. Jawaban atas Handoff V8 §9 (8 butir)

### Butir 1 — Perbaiki metodologi F-027 — **addressed**

Pola A dan B dipisah ke proses/PID berbeda (parent harness
`run-f029.ts`; 60 run anak per versi Bun, 60 PID berbeda
terverifikasi, 0 gagal). Log mentah
(`run-1310-f029.txt`, `run-144-f029.txt`) mencatat versi Bun,
input identik, flags, baseline bersih per proses, RSS high-water
OS (VmHWM), RSS saat ini, external, heapUsed, dan hasil deteksi
(`asksConnect = true` pada semua 120 run). Skrip + raw log baru
untuk Bun 1.3.10 dan 1.4.4 diterbitkan di
`evidence/f029-memory-methodology/`. Kriteria penerimaan V8
terpenuhi pada level VM — acceptance staging tetap menunggu
H-RES-05 (gate G-I).

### Butir 2 — Koreksi klaim kuantitatif F-027 — **addressed**

Rasio 4,5–5,4× dinyatakan **NOT VERIFIED** dan **DICABUT** sebagai
klaim kuantitatif (desain §D.4.26 + §D.4.25 + tabel perubahan
v2.3.14 + paragraf penutup — koreksi terlihat, bukan dihapus
diam-diam). Rasio tidak dipakai sebagai sizing/cgroup acceptance.
Fakta aritmetika 3,60× karakter hidup dipertahankan hanya sebagai
character accounting, bukan klaim peak-memory. Rasio yang
didukung eksperimen terkoreksi: **1,18–1,88×** (median VmHWM),
dengan catatan angka forced-GC (1,57–1,88×) BUKAN perilaku runtime
natural (1,18–1,32×).

### Butir 3 — Selesaikan keputusan reproduksibilitas F-009/F-030 tanpa melakukan perubahan source — **partially addressed** (matriks + proposal; keputusan + eksekusi tetap HOLD)

Matriks kompatibilitas versi Bun, lockfile, SDK path, frozen
install, typecheck, dan build disajikan di §2 F-030 +
`evidence/f030-bun-compatibility/README.md` (Bun 1.3.10 vs 1.4.4;
build penuh NOT RUN pada kedua versi — house rules; dependency
digest NOT VERIFIED pada kedua versi). Trade-off Opsi A (naikkan
Bun kanonik) vs Opsi B (regenerasi lockfile) + penggantian absolute
SDK path dijelaskan; semua opsi tetap **PROPOSAL — HOLD** sampai
persetujuan implementasi terpisah. Acceptance clean builder
(tanpa `/opt/hatch`, frozen install tidak mengubah lockfile,
seluruh dependency memiliki provenance/digest) **belum satu pun
terpenuhi**. Tidak ada perubahan source/lockfile di revisi ini.

### Butir 4 — Pertahankan F-028 NOT VERIFIED — **addressed** (dipertahankan dengan benar)

Tidak ada manifest deployment yang diisi; semua field tetap
NOT PROVIDED; tidak ada nilai yang ditebak dari commit message,
ingatan, atau percakapan. LIVE VERSION / DEPLOYMENT APPROVAL
tetap NOT VERIFIED (F-028 §2).

### Butir 5 — Pertahankan F-019 BLOCKED — **addressed** (dipertahankan dengan benar)

`checkLink` TIDAK di-invoke; tidak ada public share yang dibuat;
tidak ada perubahan runtime state. Hanya bukti read-only yang
dipakai (paket F-021 v2.3.12, tidak ada capture baru — tidak ada
perubahan status yang membenarkan capture ulang). Kontrol (a)–(e)
tetap belum satu pun terpenuhi — masing-masing dinyatakan
NOT PROVIDED / NOT VERIFIED, bukan ditebak.

### Butir 6 — Lengkapi ownership staging — **partially addressed** (prasyarat/prosedur/oracle/bukti lengkap; owner tetap UNASSIGNED)

STAGE-P01..P12 dilengkapi prasyarat, prosedur aman, PASS/FAIL
oracle, dan bukti yang harus dihasilkan (desain §D.4.26 — tabel 12
baris):

- **P01** runtime artifact (versi + `bun:ffi`): probe read-only di sandbox artifact; FAIL = implementasi flock/pidfd DIBLOKIR.
- **P02** filesystem direktori lock: uji FLK-T1..T8 diulang di staging; `df`/`mount` didokumentasikan.
- **P03** isolasi user layanan: direktori 0700 + uji OPS-T1/T6.
- **P04** supervisor/deployment: dokumen menyatakan restart otomatis + kill process group + mount dapat diganti saat deploy (SUP-01).
- **P05** egress policy: topologi egress + prefix NAT64/DNS64 didokumentasikan; uji S-49/S-50.
- **P06** filesystem (NFS): identifikasi dulu; bila NFS, uji FLK-07; bila bukan NFS, NOT APPLICABLE dengan bukti identifikasi.
- **P07** worker-signaling fallback: keputusan U-46 tertulis + pid_max tercatat.
- **P08** pid_max + kuantifikasi U-41: PASS ≤ 1e-6, kondisional ≤ 1e-5, BLOCK > 1e-5.
- **P09** staging DB + runtime: uji H-CAT-01..03 + H-TEN-01..05 di bawah konkurensi.
- **P10** rate limit + konkurensi: uji H-RES-01..06 (H-RES-05 diperbarui v2.3.15).
- **P11** alert channel + operator penerima: uji ST-12 — alert diterima operator ≤ 5 menit dengan isi lengkap (ST-12-LAT-01..03); tanpa kanal = NOT RUN, bukan PASS.
- **P12** audit trail: uji OPS-T5 — jejak audit tercatat atas penghapusan/penggantian file lock oleh root.

Staging operator, runtime provider, egress owner, DB/runtime
owner, alert channel/operator penerima, dan rollback owner tetap
**UNASSIGNED** — tidak ada nama yang dikarang. STAGE-P01..P12
tetap **BLOCKED**; tidak ada gate READY.

### Butir 7 — Pertahankan baseline keamanan dan provenance — **addressed** (dipertahankan)

F-001..F-005, F-006b/F-006c, F-016..F-019, U-38/U-33 tidak berubah
status tanpa artefak yang memenuhi kriteria (§1, §5). Log gagal
SU-T5 TIDAK direkonstruksi. Bukti VM, staging, dan produksi
dipisah ketat — semua paket bukti baru v2.3.15 dilabeli VM.
Tidak ada pengulangan SU-T1..SU-T9 (tidak ada perubahan
implementasi/harness suite lama yang membenarkan rerun).

### Butir 8 — Tidak ada source implementation pada respons berikutnya tanpa otorisasi terpisah — **addressed** (dipatuhi)

v2.3.15 TIDAK mengubah satu pun file source aplikasi, lockfile,
database, deployment, atau runtime. Kebutuhan teknis yang hanya
bisa dibuktikan melalui source change diajukan sebagai proposal
perubahan terpisah di bawah ini (bukan sebagai implementasi):

| Proposal | File list | Rencana diff | Rollback | Test IDs | Dampak DB/runtime |
| --- | --- | --- | --- | --- | --- |
| P-1 (Opsi A, F-030) | `site/package.json` (`packageManager` → versi Bun kompatibel lockfile v2, mis. 1.4.4) | Satu baris + dokumentasi versi kanonik | Kembalikan `packageManager` ke `bun@1.3.10` | Frozen install + typecheck + build pada versi baru; H-RES-03/05 diulang pada versi baru | Tidak ada dampak DB; runtime staging harus memakai versi baru |
| P-2 (Opsi B, F-030) | `site/bun.lock` (regenerasi v1 di bawah 1.3.10) | Lockfile ditulis ulang v1; diff resolusi diperiksa paket-per-paket | Kembalikan `bun.lock` v2 ter-commit | Frozen install + typecheck + build dari lockfile hasil regenerasi; diff resolusi v1 vs v2 | Tidak ada dampak DB; tidak ada perubahan runtime |
| P-3 (SDK path, F-030) | `site/package.json` + `site/bun.lock` (dependensi `@hatch/space-sdk`) | Ganti `file:/opt/hatch/...` dengan paket ter-publish berversi / artefak vendorkan berdigest / sumber resmi | Kembalikan ke path lama (hanya di VM ini) | Frozen install + typecheck dari clean builder tanpa `/opt/hatch` | Tidak ada dampak DB; builder harus dapat mengambil SDK tanpa `/opt/hatch` |

Ketiga proposal tetap **HOLD** — masing-masing butuh keputusan
owner (G-G untuk P-1/P-2; owner + runtime provider untuk P-3)
dan otorisasi tahap (b) terpisah sebelum dieksekusi.

## §5. Risk register — U-38/U-33/U-45/U-46 + risiko baru (v2.3.15)

| ID | Status v2.3.15 | Inti |
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
| U-64 | **DIPERBARUI v2.3.15** (F-027/F-029) | Rasio 4,5–5,4× DICABUT; rasio terkoreksi 1,18–1,88×; aturan desain (larangan materialisasi + incremental) tetap; H-RES-05 diperbarui (kedua mode GC + fixture byte-matched). |
| U-65 | Terbuka (F-028 — provenance deployment) | Tidak berubah. |
| U-66 | **DIPERBARUI v2.3.15** (F-009/F-030) | Matriks kompatibilitas + trade-off Opsi A/B + penggantian SDK path dirumuskan (PROPOSAL — HOLD); F-009 tetap NOT REPRODUCIBLE. |
| U-67 | **BARU v2.3.15** (F-029) | Rasio incremental v2.3.14 tidak valid; manfaat terkoreksi 1,18–1,88× dan bergantung GC (forced 1,57–1,88× vs natural 1,18–1,32×); angka forced-GC bukan perilaku runtime natural; rasio VM bukan acceptance staging. Penanganan: H-RES-05 staging (gate G-I) dengan ambang pra-tes + kedua mode GC. |
| U-68 | **BARU v2.3.15** (F-030) | Lockfile v2 vs Bun kanonik + SDK path absolut; keputusan G-G + penggantian SDK path dibutuhkan; versi Bun minimum yang menerima lockfile v2 NOT VERIFIED; build penuh NOT RUN; dependency digest NOT VERIFIED. Penanganan: keputusan owner G-G + bukti clean-builder (gate G-J). |

## §6. Hard gates — ditegaskan kembali (v2.3.15)

- No Link Scanner activation.
- No public deployment.
- No production build (house rules: tidak ada `bun run build` dari `site/`).
- No DB/catalog change.
- No source implementation tanpa owner approval terpisah (HOLD perubahan source mirror sampai klarifikasi F-020 tetap berlaku).
- No production testing (termasuk tidak memanggil `checkLink`).
- F-001..F-005, F-016/F-017/F-022, F-018 tetap OPEN/BLOCKED.
- Penutupan F-001 butuh H-SSRF-01..20 terhadap implementasi aktual di staging terisolasi + log mentah + review independen — hasil VM saja tidak cukup.
- Penutupan F-029 sebagai klaim kuantitatif butuh H-RES-05 PASS di staging (ambang pra-tes + kedua mode GC + fixture byte-matched) — hasil VM v2.3.15 hanya memperbaiki metodologi, bukan membuktikan kapasitas staging.
- Penutupan F-030 butuh keputusan owner G-G + penggantian SDK path + bukti clean-builder (gate G-J).

## §7. Yang butuh keputusan Rama (pemilik proyek)

| # | Keputusan | Konteks | Dampak bila belum diputuskan |
| --- | --- | --- | --- |
| 1 | Scope perubahan source (F-020, G-A) | 3 pertanyaan scope matriks v2.3.11 §6 | HOLD perubahan source tetap berlaku; tidak ada pekerjaan tahap (b) |
| 2 | Tenancy F-018 (G-C) | Pernyataan resmi provider tentang scope `ctx.db` (per-user vs shared) | Desain ownership + H-TEN-01..05 tidak dapat dieksekusi |
| 3 | U-46 (G-D) | Opsi (a) terima fallback numeric-kill terkuantifikasi vs opsi (b) larangan mutlak | Implementasi pensinyalan worker tetap DIBLOKIR |
| 4 | Cache F-022 (G-F) | Cabang pilihan (hapus cache dari semua jalur security-scan, rekomendasi) vs alternatif (6 syarat) | Implementasi cache tidak dapat dimulai |
| 5 | Bun kanonik F-009/F-030 (G-G) | Opsi A (naikkan kanonik ke 1.4.4) vs Opsi B (regenerasi lockfile v1 di bawah 1.3.10) + penggantian SDK path | Reproducible build tetap NOT VERIFIED; clean builder tetap gagal (gate G-J) |
| 6 | Staging (G-E) | Environment + penunjukan staging operator, runtime provider, egress owner, DB/runtime owner, alert channel/operator penerima, rollback owner | STAGE-P01..P12 tetap BLOCKED; tidak ada validasi staging |
| 7 | Otorisasi implementasi tahap (b) | Persetujuan eksplisit terpisah untuk setiap perubahan source (termasuk proposal P-1/P-2/P-3 di §4 butir 8) | Semua remediasi source tetap desain saja |

## §8. Yang TIDAK diklaim v2.3.15

- v2.3.15 TIDAK mengklaim rasio penghematan incremental apa pun sebagai acceptance staging — rasio 1,18–1,88× adalah bukti VM atas pola simulasi, bukan kapasitas operasional.
- v2.3.15 TIDAK mengklaim F-029 tertutup sebagai bukti staging — yang tertutup adalah metodologi VM dan koreksi klaim; H-RES-05 staging tetap harus dijalankan dan lolos.
- v2.3.15 TIDAK mengklaim F-030 selesai — matriks dan proposal TIDAK mengubah status blocker; F-030 tetap CONFIRMED BLOCKER dan F-009 tetap NOT REPRODUCIBLE.
- v2.3.15 TIDAK mengklaim versi live, approval deployment, atau status runtime apa pun — F-028 tetap NOT VERIFIED, F-019 tetap BLOCKED.
- v2.3.15 TIDAK mengklaim staging tersedia atau owner staging terisi — semua peran tetap UNASSIGNED.
- v2.3.15 TIDAK mengubah satu pun file source aplikasi, lockfile, database/katalog, atau live artifact.

## §9. Gate konkret berikutnya (v2.3.15 → v2.3.16)

- **(G-A)** keputusan owner atas scope perubahan source (F-020).
- **(G-B)** bukti runtime F-019 (versi/digest + kontrol disabled (a)–(e)).
- **(G-C)** keputusan tenancy F-018 (pernyataan resmi provider tentang scope `ctx.db`).
- **(G-D)** keputusan U-46.
- **(G-E)** staging tersedia + peran UNASSIGNED terisi.
- **(G-F)** keputusan cache F-022 — owner menerima cabang pilihan (rekomendasi) vs alternatif.
- **(G-G)** keputusan Bun F-009 — kanonik 1.3.10 vs 1.4.4 (kini dengan matriks kompatibilitas + trade-off Opsi A/B).
- **(G-H)** eksekusi harness H-RES-02/03/05 yang sudah dikoreksi — prasyarat: otorisasi implementasi tahap (b) (G-A) + staging tersedia (G-E) + verifikasi ulang perilaku Bun pada versi kanonik (U-62, bagian staging).
- **(G-I)** stress test memori H-RES-03/05 pada staging Bun 1.3.10 (chunk > cap, 3 script paralel, fixture batas 1.000.000 + varian non-ASCII byte-matched, high-water RSS/VmHWM ≤ ambang pra-tes, kedua mode GC) + proses deployment manifest terisi untuk setiap deployment (F-028).
- **(G-J) BARU** keputusan reproduksibilitas F-030 — prasyarat: keputusan owner G-G (Opsi A vs Opsi B) + penggantian SDK path (paket ter-publish/vendorkan/sumber resmi) + bukti clean-builder (frozen install + typecheck exit 0, lockfile tidak berubah, dependency digest tercatat, tanpa `/opt/hatch`).

Pemicu revisi v2.3.16: keputusan owner atas G-A/G-C/G-D/G-F/G-G,
ATAU bukti runtime G-B, ATAU staging tersedia (G-E), ATAU audit
independen V9 — mana pun yang datang dulu. Tidak ada revisi baru
yang hanya mengulang status v2.3.15.

## §10. Hambatan, percobaan, dan hasil (dicatat agar tidak diulang)

| # | Hambatan / percobaan | Hasil | Tindak lanjut |
| --- | --- | --- | --- |
| 1 | Binary Bun 1.3.10 tidak ada lagi di VM ini (`/tmp/bun1310` dibersihkan antar sesi; `~/.bun` tidak ada) | Diunduh ulang dari rilis resmi oven-sh/bun `bun-v1.3.10` (zip 39.283.732 byte) ke `/tmp/bun1310`; verifikasi `bun --revision` = `1.3.10+30e609e08` (SAMA dengan revisi v2.3.14) | Binary di `/tmp` bersifat ephemeral — revisi berikutnya kemungkinan harus mengunduh ulang; log mentah di repo adalah bukti yang dipertahankan, bukan binary-nya |
| 2 | Bukti 1.3.10 untuk F-030 (frozen install gagal) — diulang atau dikutip? | **Dikutip, tidak diulang** (log F-009 v2.3.14: `run-1310-install.txt`, SHA-256 `75641b13…`); tidak ada perubahan material pada implementasi/lingkungan/harness/risiko yang membenarkan pengulangan (protokol butir 6) | Bila lockfile atau `packageManager` berubah, bukti ini kedaluwarsa dan wajib diulang |
| 3 | Apakah sweep versi Bun (1.3.x akhir / 1.4.0–1.4.3) diperlukan untuk matriks F-030? | **Tidak dilakukan** — keputusan G-G hanya membutuhkan satu versi kompatibel yang terverifikasi (1.4.4) versus kanonik yang dinyatakan (1.3.10); versi minimum yang menerima lockfile v2 dicatat NOT VERIFIED | Sweep versi adalah pekerjaan lanjutan bila owner memilih opsi yang membutuhkannya |
| 4 | Build penuh untuk matriks F-030? | **NOT RUN** — house rules v2.3.9 + `site/AGENTS.md` (jangan `bun run build` dari `site/`); build penuh tetap NOT VERIFIED pada kedua versi Bun | Build penuh adalah bagian dari acceptance G-J setelah keputusan owner |
| 5 | Konkurensi multi-scan untuk eksperimen F-029? | **Tidak disimulasikan di VM** — satu scan per proses adalah inti koreksi metodologi; oracle konkurensi tetap staging H-RES-05 | Uji konkurensi di staging dengan ambang pra-tes (gate G-I) |
| 6 | Fixture supplementary-plane (U+1F600, surrogate pair) untuk F-029? | **Tidak diuji di VM ini** — fixture memakai U+00E9 saja; varian supplementary-plane tetap menjadi varian staging (fixture H-RES-02 B) | Sertakan H-RES-02 B pada H-RES-05 staging |
| 7 | Staging owners (handoff V8 butir 6) — dapatkah dilengkapi? | **Tidak dapat diisi** — tidak ada penunjukan owner dari Rama atau provider; STAGE-P01..P12 dilengkapi prasyarat/prosedur/oracle/bukti TANPA mengarang nama; peran tetap UNASSIGNED | Menunggu keputusan Rama (G-E, §7 butir 6) |
