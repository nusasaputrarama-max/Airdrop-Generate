# SSRF RESPONSE MATRIX v2.3.16 — Jawaban atas Audit Independen ChatGPT V9

**Dokumen:** matriks respons revisi desain v2.3.16
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_INDEPENDENT_AUDIT_V9.md` (commit `619f320`, 2026-11-08)
  — temuan baru F-031, F-032 + Muse Handoff §9 (8 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.16:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.16 — §D.4.27 ringkasan revisi, risiko baru U-69/U-70 di §G,
U-67/U-68 diperbarui, koreksi rasio 1,18–1,88× pada §D.4.25/§D.4.26 +
tabel perubahan v2.3.14/v2.3.15 + paragraf penutup) +
`evidence/f029-memory-methodology/` (diperbarui — harness exact-byte +
2 log mentah baru + log varian byte) +
`evidence/f032-harness-validation/` (baru — validasi harness + log tes
regresi negatif). Matriks v2.3.15 (`SSRF_RESPONSE_MATRIX_V2315.md`)
dipertahankan utuh sebagai catatan sejarah revisi itu. Temuan
F-001..F-030 dibawa ke sini dengan status terbarunya; yang baru di
v2.3.16 hanyalah F-031, F-032, rasio terukur ulang 1,13–1,84×,
penutupan false green harness, dan penyelesaian proposal keputusan
F-030 sebagai paket yang dapat diputuskan.

**Yang TIDAK dilakukan v2.3.16:** tidak ada kode aplikasi yang diubah
(tidak ada file `.ts`/`.tsx` yang disentuh — termasuk tidak ada
perubahan `site/package.json` / `site/bun.lock` di repo), tidak ada
perubahan database/katalog, tidak ada production build, tidak ada
pemanggilan action produksi apa pun (termasuk `checkLink` — tidak
di-invoke), Link Scanner tidak diaktifkan, public tester tidak
disentuh, live artifact tidak diubah. Bukti yang dipakai adalah:
eksperimen VM lokal read-only atas pola string turunan (proses anak
terpisah, tanpa jaringan eksternal, tanpa artifact live) plus
pengujian argumen harness di VM yang sama. Rerun harness F-029
dibenarkan karena harness berubah (F-031/F-032) — protokol butir 6 —
dan dijelaskan di §2.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.16

Sesuai keputusan pemilik proyek (2026-11-07 ~23:56 WIB, dikonfirmasi
~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan tidak boleh
dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.16.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.16 TIDAK mengimplementasikan apa pun. **HOLD perubahan source tetap berlaku (F-020, §2, §6).** |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.16. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.**

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Tidak ada butir yang berstatus ini di v2.3.16 — semua temuan V9 diterima sebagai sah. |

## §1. Ringkasan status F-001..F-032

| ID | Severity | Status v2.3.16 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah: desain + harness H-SSRF-01..20 selesai; implementasi menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Implementasi tetap menunggu tahap (b); **spesifikasi H-RES-05 DIPERBARUI v2.3.16** (F-031 §2): fixture batas byte yang TERUKUR eksak (cap / cap−1 / cap+1) pada kedua mode GC. |
| F-003 | High — tanpa total deadline | **blocked** | Tidak berubah: deadline total 30 detik PARTIALLY MITIGATED di kode mirror (d85a1e2) — tanpa tes regresi, status penutupan TIDAK berubah: tetap OPEN sampai H-RES-06 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Tidak berubah: desain unique constraint selesai; implementasi (termasuk migrasi DB) menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Tidak berubah: auth di dalam kode TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED; mekanisme otorisasi butuh keputusan pemilik. |
| F-006a | Medium — redaksi dokumen mirror `site/DATA-PLAN.md` | **addressed** | Tidak berubah. |
| F-006b | Medium — narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`; cleanup tetap butuh edit source + otorisasi terpisah. |
| F-006c | Medium — DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah: status tetap "reported by Muse, not independently verified"; bukti versi/diff live (a)–(c) tetap belum tersedia. |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Tidak berubah (lihat §3 V9 §7.1). |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Tidak berubah. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | **BARU v2.3.16 (F-030 §2):** proposal keputusan diselesaikan sebagai paket yang dapat diputuskan (rekomendasi Opsi A + SDK vendorkan, fallback Opsi B); digest rilis Bun 1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED. Status keseluruhan tetap NOT REPRODUCIBLE untuk clean external builder. |
| F-010 | Medium — bundle SU asli mengulang RUN=1 di tiga file | **addressed** (sebagai koreksi bukti) | Tidak berubah; koreksi V5 §6.1 / V6 §8.1 / V7 §7.1 / V8 §7.1 / V9 §7.1 diterima dan dipertahankan terlihat. |
| F-011 | Medium — matriks fitur tester statis tidak cocok dengan client | **addressed** (sebagai koreksi dokumen) | Tidak berubah; tester tetap ON HOLD. |
| F-012 | Medium — F-006 dinyatakan addressed padahal residu masih ada | **addressed** (sebagai pemisahan status) | Tidak berubah. |
| F-013 | Medium — owner gate staging tidak lengkap | **partially addressed** | Tidak berubah: STAGE-P01..P12 dilengkapi prasyarat/prosedur/oracle/bukti v2.3.15; operator/kanal alert/egress/DB tetap UNASSIGNED/BLOCKED — tidak ada nama owner yang dikarang; tidak ada gate READY. Kriteria ST-12-LAT-01..03 dipertahankan. |
| F-014 | Medium — catatan reproduksibilitas basi | **partially addressed** | Tidak berubah; lihat F-009/F-030. |
| F-015 | Low/Medium — DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode | **addressed** (mirror) / **blocked** (live) | Tidak berubah; teks koreksi live sudah disiapkan, belum diterapkan. |
| F-016 | Medium — cache hasil scan basi (false-negative) | **partially addressed** | Tidak berubah: cabang pilihan dinyatakan (hapus cache dari semua jalur security-scan); implementasi + tes menunggu tahap (b) + HOLD F-020. |
| F-017 | Medium — cache key mengabaikan cap | **partially addressed** | Tidak berubah: semantik kepemilikan G-F diklarifikasi v2.3.13 — cabang pilihan adalah rekomendasi yang menunggu penerimaan owner, BUKAN otorisasi implementasi; F-017 + H-CACHE-05/06 menjadi NOT APPLICABLE HANYA SETELAH cabang penghapusan cache diimplementasikan. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | Tidak berubah: kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checklink` MASIH TERDAFTAR (paket F-021); tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. Deployment tetap BLOCKED. |
| F-020 | Medium — scope refactoring source mirror perlu klarifikasi otorisasi | **partially addressed** | Tidak berubah: HOLD dipertahankan; tidak ada perubahan source di v2.3.16; tidak ada revert d85a1e2; tidak ada artefak approval terpisah di repo. |
| F-021 | Medium — bukti artifact-state tidak auditable | **partially addressed** | Tidak berubah: paket bukti + digest dipublikasikan v2.3.12; version/digest artifact tetap NOT PROVIDED (tidak diekspos tool). |
| F-022 | Medium — keputusan cache + oracle tes cap tidak koheren | **partially addressed** | Tidak berubah: oracle tes cap dikoreksi v2.3.12/v2.3.13/v2.3.14; **H-RES-05 DIPERBARUI v2.3.16** (F-031 §2 — fixture batas byte terukur eksak cap/cap−1/cap+1); implementasi + tes tetap menunggu tahap (b) + staging. |
| F-023 | Medium — H-RES-02 berisi kondisi fixture UTF-8 yang mustahil | **addressed** (desain) | Tidak berubah: arah mustahil dihapus v2.3.13; tiga fixture feasible + angka terverifikasi dipublikasikan. Harness staging belum dijalankan. |
| F-024 | Medium — H-RES-03 tidak mendefinisikan lapisan byte yang di-cap | **addressed** (desain) | Tidak berubah: perilaku dekompresi transparan TERKONFIRMASI pada Bun kanonik 1.3.10 (re-run v2.3.14). Staging + `deflate`/`zstd` tetap NOT VERIFIED. |
| F-025 | Medium — H-RES-05 tanpa angka aggregate budget | **addressed** (desain) | Tidak berubah: angka 1.000.000 byte tetap sebagai input-body budget. Tes staging belum dijalankan. |
| F-026 | Medium — batas decoded-byte tidak membatasi transient chunk allocation | **addressed** (desain) | Tidak berubah: anggaran A1 vs A2 dipisah v2.3.14; chunk maksimum terukur 528.384 byte (1.3.10); BYOB NOT VERIFIED. Tes staging belum dijalankan. |
| F-027 | Medium — L2 tidak mencakup representasi string turunan | **addressed** (desain) / **koreksi kuantitatif v2.3.16** | **BARU v2.3.16 (F-031 §2):** karakter hidup 3,60× DIPERTAHANKAN sebagai character accounting; **rasio penghematan incremental v2.3.15 (1,18–1,88×) dinyatakan SUPERSEDED — rasio terukur ulang exact-byte 1,13–1,84×** (median VmHWM). Larangan materialisasi bersamaan + pemindaian incremental TETAP berlaku. Tes staging belum dijalankan. |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan); template manifest dipublikasikan (`DEPLOYMENT_MANIFEST_TEMPLATE.md`) — manifest itu sendiri tetap KOSONG sampai operator menyediakannya. Tidak ada tebakan versi live. |
| F-029 | Medium — perbandingan peak memory F-027 tidak valid secara metodologis | **addressed** (metodologi + koreksi klaim) | **BARU v2.3.16 (F-031 §2):** fixture exact-byte + rerun penuh 120 run anak (0 gagal, 120 PID berbeda); rasio terukur ulang 1,13–1,84×; rentang 1,18–1,88× v2.3.15 SUPERSEDED. Manfaat staging (bukan angka VM) tetap harus dibuktikan di H-RES-05. |
| F-030 | Medium — lockfile ter-commit tidak kompatibel dengan Bun kanonik | **partially addressed** (proposal keputusan selesai; blocker CONFIRMED) | **BARU v2.3.16:** proposal keputusan diselesaikan sebagai paket yang dapat diputuskan tanpa mengubah file (rekomendasi Opsi A + SDK vendorkan, fallback Opsi B, provenance/digest/prasyarat/rollback/dampak bukti dirumuskan). F-030 tetap CONFIRMED BLOCKER; F-009 tetap NOT REPRODUCIBLE. |
| F-031 | Low — fixture F-029 tidak tepat pada batas byte yang dinyatakan | **addressed** (fixture diperbaiki + rerun + varian cap−1/cap+1) | **BARU v2.3.16:** TextEncoder per segmen + assert sebelum scan; ASCII dan non-ASCII byte-matched tepat 1.000.000 byte; varian 999.999/1.000.001 terukur; log mentah baru 2 versi Bun. |
| F-032 | Low — harness dapat melaporkan sukses dengan nol run | **addressed** (validasi + tes regresi negatif) | **BARU v2.3.16:** `--runs` wajib integer 1..10; assertion jumlah record; validasi RESULT; timeout child 120 detik; 7 kasus negatif exit 2 tanpa "all child runs ok"; kontrol positif exit 0. Jalur timeout end-to-end dengan child yang sengaja menggantung TIDAK diuji (mekanisme diverifikasi terpisah). |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif. Tidak ada public deployment yang
diotorisasi.**

## §2. Respons per temuan baru V9

### F-031 — Low: fixture F-029 tidak tepat pada batas byte yang dinyatakan — **addressed** (fixture diperbaiki, rerun penuh, varian cap−1/cap+1 terukur)

**Temuan (diterima sepenuhnya):** Audit V9 benar di semua poin
bukti (§5 F-031): marker ASCII sebenarnya 33 / 15 / 13 byte
(total 61), bukan 40/20/20 yang dikurangi skrip v2.3.15;
fixture ASCII terukur 999.981 byte (19 di bawah target),
non-ASCII char-matched 1.999.901 byte, non-ASCII byte-matched
999.901 byte (99 di bawah L2); field `utf8BytesApprox` memakai
perkiraan karakter, bukan byte aktual marker. Log v2.3.15
TIDAK dibatalkan (secara nyata berisi 5 run per kombinasi),
tetapi fixture itu tidak menguji kondisi tepat cap maupun
cap+1 dan tidak boleh dipakai sebagai bukti byte-boundary
H-RES-05.

**Perbaikan v2.3.16 (`evidence/f029-memory-methodology/`):**

- `exp-pattern.ts` ditulis ulang (SHA-256
  `234bb15aa0bb13c09f81cff1182ddbc04394d39d1b7366e3ef48273112f585f1`):
  marker diukur dengan TextEncoder (33/15/13 byte); filler
  dibangun dari panjang marker TERUKUR; tiap segmen diukur
  dengan `TextEncoder().encode(segment).byteLength` dan
  di-assert tepat sama dengan target per segmen (halaman =
  target − 600.000, tiap script = 300.000); total di-assert
  tepat sama dengan `--bytes` (default 1.000.000) SEBELUM
  scan; kekurangan 0–1 byte per segmen (filler U+00E9 = 2
  byte, target filler bisa ganjil) ditutup satu karakter pad
  ASCII `'A'`; argumen baru `--bytes N` (1..2.000.000) untuk
  varian cap−1/cap+1; segmen dibangun LAZILY per pola
  (pola A ketiganya sekaligus; pola B satu per satu, dilepas
  sebelum berikutnya); baseline bersih tetap diambil SEBELUM
  segmen dibangun. Field RESULT `utf8BytesApprox` (perkiraan)
  DIGANTI `utf8Bytes` (terukur) + `segmentBytes` per segmen +
  `byteTarget`.
- `run-f029.ts` diperbarui (SHA-256
  `03ac14e348431029922600160d3e07223799a05514dcd6c078e6471cac92841f`)
  — lihat F-032 §2 di bawah.
- README paket diperbarui: menyebut API yang benar
  (`node:child_process.spawnSync`, BUKAN `Bun.spawnSync`),
  command yang benar (`bun run-f029.ts --runs 5` dari
  `evidence/f029-memory-methodology/`), versi Bun yang
  dipakai, dan batasan bahwa skrip hanya simulasi pola
  string.

**Bukti baru v2.3.16 — rerun DIBENARKAN karena harness
berubah (protokol butir 6):** log mentah
`run-1310-f031-f032.txt` (SHA-256
`0cfe0dd22ad110e84d52c699e16e9f3ae36de370f5fad66c6df17b72c7d223f5`,
839 baris) dan `run-144-f031-f032.txt` (SHA-256
`a01b7d83548eb5bf0c6f3911d26f5031274bd9a1d9c68c4bac8fce46df266bb2`,
839 baris) — Bun 1.3.10 (`1.3.10+30e609e08`, diunduh ulang
dari rilis resmi oven-sh/bun `bun-v1.3.10`, zip 39.328.732
byte, 2026-11-08) DAN Bun 1.4.4 (`1.4.4+38afee6c8`); 60 run
anak per versi, 60 PID berbeda terverifikasi per versi, 0
gagal, `asksConnect = true` pada SEMUA 120 run anak;
`utf8Bytes` terukur 1.000.000 pada 40 RESULT dan 1.999.939
pada 20 RESULT per log (diverifikasi dari teks log, bukan
hanya dari ringkasan parent).

**Varian cap−1 / cap / cap+1** (log
`run-144-f031-byte-variants.txt`, SHA-256
`605aecee143885e283ad95f2add3ab469a2ea0986d879cd9f8e468c75e18c22c`,
108 baris): 14 run langsung `exp-pattern.ts` (Bun 1.4.4, gc
natural, 2026-11-08T01:56:35Z) — pola A dan B × fixture
`ascii` dan `nonascii-bytes` × `--bytes` 999.999 / 1.000.000 /
1.000.001, plus pola A dan B × `nonascii` default. Semua
exit 0; total byte terukur TEPAT sama dengan target pada
setiap run (999.999, 1.000.000, 1.000.001; nonascii tetap
1.999.939).

**Hasil terukur ulang (median VmHWM delta, 5 run per
kombinasi):**

| Bun | Fixture | GC | A median | B median | Rasio A/B |
| --- | --- | --- | --- | --- | --- |
| 1.3.10 | ascii | forced | 6.336.512 | 3.899.392 | 1,63× |
| 1.3.10 | ascii | natural | 5.865.472 | 4.739.072 | 1,24× |
| 1.3.10 | nonascii | forced | 8.073.216 | 4.849.664 | 1,66× |
| 1.3.10 | nonascii | natural | 8.138.752 | 6.615.040 | 1,23× |
| 1.3.10 | nonascii-bytes | forced | 4.685.824 | 2.543.616 | 1,84× |
| 1.3.10 | nonascii-bytes | natural | 4.575.232 | 3.837.952 | 1,19× |
| 1.4.4 | ascii | forced | 5.300.224 | 3.379.200 | 1,57× |
| 1.4.4 | ascii | natural | 5.804.032 | 5.140.480 | 1,13× |
| 1.4.4 | nonascii | forced | 5.349.376 | 3.149.824 | 1,70× |
| 1.4.4 | nonascii | natural | 7.897.088 | 6.176.768 | 1,28× |
| 1.4.4 | nonascii-bytes | forced | 3.063.808 | 2.031.616 | 1,51× |
| 1.4.4 | nonascii-bytes | natural | 4.603.904 | 3.739.648 | 1,23× |

**Rasio terukur ulang keseluruhan: 1,13–1,84× (median VmHWM).**
Rentang v2.3.15 (1,18–1,88×) TIDAK direproduksi secara eksak
dan dinyatakan **SUPERSEDED** — ujung bawah kini 1,13×
(1.4.4 ascii natural), ujung atas 1,84× (1.3.10
nonascii-bytes forced). Perbedaan ini kecil dan dalam
sebaran antar-run, tetapi dilaporkan apa adanya. Yang TIDAK
berubah: pola B lebih rendah dari pola A pada SEMUA 12
kombinasi di kedua versi; forced-GC 1,51–1,84× vs
natural-GC 1,13–1,28×. Karakter hidup 3,60× dipertahankan
sebagai character accounting (ascii: 3.600.005; cap−1 ascii:
3.600.002 / 999.999; nonascii-bytes: 1.800.116 / 500.032).
`heapUsed` tetap bukan oracle di Bun 1.3.10 (delta = 0 pada
SEMUA 60 run anak 1.3.10 — direproduksi v2.3.16). Delta
absolut v2.3.16 sedikit lebih besar dari v2.3.15 (overhead
pengukuran: salinan Uint8Array transien TextEncoder, maks.
satu segmen, ikut terhitung dalam VmHWM dan berlaku sama
untuk kedua pola — dicatat di header skrip dan README).

**Kriteria penerimaan F-031 (V9 §9 butir 1) — terpenuhi:**
fixture ASCII dan non-ASCII byte-matched tepat 1.000.000
byte (terukur, di-assert); varian cap−1 dan cap+1 terukur;
marker ASCII diperhitungkan; raw output mencatat byte aktual
per segmen dan total (baris `bytes:` di setiap child +
`segmentBytes` di RESULT). Log v2.3.15 dipertahankan sebagai
bukti historis — klaim batas-byte-nya TIDAK dibawa ulang.

**Risiko tersisa:** U-69 (klaim batas byte v2.3.15 tidak
tepat; rasio superseded). **Aksi berikutnya:** H-RES-05 di
staging memakai fixture v2.3.16 (gate G-I) + audit V10 atas
paket ini.

### F-032 — Low: harness dapat melaporkan sukses dengan nol run — **addressed** (validasi + tes regresi negatif)

**Temuan (diterima sepenuhnya):** `RUNS` v2.3.15 diparsing
`Number(...)` tanpa validasi integer positif. `--runs 0`
atau nilai non-numerik membuat loop child tidak berjalan;
`failures` tetap 0; parent mencetak "parent done: all child
runs ok" dan keluar 0. Tidak ada assertion jumlah record
sama dengan jumlah run yang diharapkan. Batas dampak: raw
log v2.3.15 yang diperiksa audit V9 benar-benar berisi 60
RESULT per versi, 60 PID unik, 0 kegagalan — F-032 TIDAK
membatalkan kedua log tersebut.

**Perbaikan v2.3.16 (`run-f029.ts`, SHA-256
`03ac14e348431029922600160d3e07223799a05514dcd6c078e6471cac92841f`):**

| Mitigasi V9 | Bukti v2.3.16 |
| --- | --- |
| Validasi `--runs` sebagai integer positif dalam rentang yang disetujui; tolak 0, negatif, NaN, non-numerik, terlalu besar | `--runs` WAJIB (tanpa default); bentuk `--runs N` / `--runs=N`; harus cocok `/^\d+$/` dan integer 1..10 (`MAX_RUNS = 10`); pelanggaran → error + usage + exit 2, tanpa child dijalankan |
| Assertion jumlah hasil sama dengan expected count | `records.length === EXPECTED_RUNS` (12 kombinasi × RUNS) + tiap kombinasi tepat RUNS record; ketidakcocokan → `COUNT MISMATCH` + gagal |
| Validasi setiap RESULT cocok dengan pattern/fixture/GC yang diminta | `pattern`/`fixture`/`gc`/`bun` (sama dengan parent), `asksConnect === true`, `utf8Bytes` terukur sama dengan yang diharapkan (1.000.000 / 1.999.939), `segmentBytes` berjumlah sama dengan `utf8Bytes`, `vmHwmDelta` non-negatif — satu pun mismatch → failure |
| Timeout child dan status gagal bila child timeout/signal | `spawnSync(..., { timeout: 120_000 })`; `error` (termasuk `ETIMEDOUT`), `status === null`, atau `signal` → FAIL dengan alasan yang dicetak |
| Tidak ada jalur nol-run yang mencetak sukses | "parent done: all child runs ok" HANYA bila `failures === 0` DAN jumlah record tepat DAN semua kombinasi lengkap; bila tidak, "parent done: FAILED — …" + exit 1 |

**Tes regresi (log `evidence/f032-harness-validation/
run-f032-negative.txt`, SHA-256
`13db12c6d56563b5e8cfbaca0e33f6f82e3a6675316fa3f7cf30b1cd177f62ee`,
57 baris; Bun 1.4.4, 2026-11-08T01:56:59Z):**

| # | Pemanggilan | Hasil |
| --- | --- | --- |
| 1 | `--runs 0` | exit 2, tanpa "all child runs ok" |
| 2 | `--runs abc` | exit 2, tanpa "all child runs ok" |
| 3 | `--runs -1` | exit 2, tanpa "all child runs ok" |
| 4 | `--runs` (nilai hilang) | exit 2, tanpa "all child runs ok" |
| 5 | (flag hilang) | exit 2, tanpa "all child runs ok" |
| 6 | `--runs 11` (terlalu besar) | exit 2, tanpa "all child runs ok" |
| 7 | `--runs 1.5` (desimal) | exit 2, tanpa "all child runs ok" |
| + | Kontrol positif `--runs 1` | exit 0, 12 RESULT, "parent done: all child runs ok" |

Kasus 1–5 adalah tes regresi yang diminta audit V9 §5 F-032;
kasus 6–7 tambahan (batas atas + desimal). Mekanisme timeout
`spawnSync` diverifikasi terpisah (`sleep 30`, timeout 200
ms → `{ errorCode: "ETIMEDOUT", status: null, signal:
"SIGTERM" }`); uji end-to-end dengan child yang sengaja
menggantung TIDAK dibuat di revisi ini — dicatat sebagai
batasan di README F-032.

**Kriteria penerimaan F-032 (V9 §9 butir 2) — terpenuhi
pada level harness.** Log v2.3.15 tetap tidak dibatalkan.

**Risiko tersisa:** U-70 (jalur timeout belum diuji
end-to-end). **Aksi berikutnya:** tidak ada — harness
v2.3.16 adalah oracle yang dipakai untuk rerun apa pun;
rerun lama v2.3.15 tidak perlu diulang.

### F-027 — koreksi kuantitatif (dampak F-031) — **addressed** (sebagai koreksi bukti)

Rasio penghematan incremental v2.3.15 (1,18–1,88×)
**dinyatakan SUPERSEDED** oleh pengukuran ulang exact-byte
v2.3.16 (**1,13–1,84×**, median VmHWM — lihat F-031 §2 di
atas). Yang dipertahankan: karakter hidup 3,60× sebagai
character accounting (ascii 3.600.005; nonascii-bytes
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

Tidak ada perubahan source di v2.3.16; tidak ada revert d85a1e2;
tidak ada artefak approval terpisah di repo. HOLD perubahan source
lanjutan tetap berlaku sampai owner mengklarifikasi scope.

### F-018 — isolasi data antar-pengguna — **partially addressed** (tidak ada fakta baru)

Kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime
tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada.
Tidak ada kesimpulan dari nama tipe saja.

### F-001..F-005 — spesifikasi implementasi dipertahankan — **blocked** (desain selesai; implementasi + bukti staging menunggu tahap b)

Tidak ada perubahan status. Satu pembaruan spesifikasi (F-031 §2):
H-RES-05 kini mensyaratkan fixture batas byte yang TERUKUR eksak
(cap / cap−1 / cap+1) pada kedua mode GC (forced dan natural,
dilaporkan terpisah) + fixture non-ASCII byte-matched. Handoff V9
BUKAN izin mengubah source.

### F-030 — proposal keputusan diselesaikan tanpa implementasi — **partially addressed** (paket keputusan selesai; blocker CONFIRMED)

**Rekomendasi utama — Opsi A + SDK vendorkan (P-1 + P-3b):**
Bun kanonik **1.4.4** (`1.4.4+38afee6c8`, rilis resmi oven-sh/bun
`bun-v1.4.4`) — terverifikasi menerima lockfile v2 (frozen
install + typecheck exit 0, log F-030); `packageManager` diubah
satu baris; `bun.lock` tetap v2 (resolusi tidak berubah).
SDK diganti dengan **artefak SDK berversi yang di-vendor ke
repo dengan digest SHA-256 tercatat**; tarball yang ada di VM
ini (`@hatch/space-sdk` 0.14.0, 2.051.070 byte, SHA-256
`f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`
— diukur di VM, SAMA dengan v2.3.9) adalah kandidat artefaknya;
provenance tarball itu tetap NOT VERIFIED sampai runtime
provider menyatakan sumber resminya secara tertulis.

**Provenance/digest yang DIBUTUHKAN pada saat keputusan
(saat ini NOT PROVIDED — tidak dikarang):** (a) digest resmi
rilis Bun 1.4.4 dari oven-sh/bun (SHA-256 rilis + rujukan URL
rilis); (b) atestasi tertulis runtime provider atas asal
tarball SDK (URL/sumber resmi + digest yang dinyatakan
provider, dicocokkan dengan `f2cb7b25…` hasil ukur VM);
(c) dependency digest dari lockfile v2 ter-commit (dicatat
dari hasil frozen install clean-builder).

**Prasyarat clean-builder:** builder eksternal bersih TANPA
`/opt/hatch`; Bun 1.4.4 dari rilis resmi (digest terverifikasi);
repo berisi `package.json` (kanonik 1.4.4) + `bun.lock` v2 +
artefak SDK vendorkan berdigest; registry publik dapat
dijangkau untuk 79 paket.

**Prosedur pembuktian (setelah keputusan + otorisasi tahap b):**
salinan bersih repo → `bun install --frozen-lockfile` (exit 0,
lockfile tidak berubah, hash tercatat) → `bun run typecheck`
(exit 0, client + server) → `bun run build` (exit 0 — house
rules saat ini melarang build dari `site/`; build adalah
bagian acceptance G-J setelah keputusan owner) → raw log +
environment manifest disimpan sebagai bukti clean-builder.

**Rollback:** kembalikan `packageManager` ke `bun@1.3.10`
dan hapus artefak SDK vendorkan (kembali ke lockfile v2
ter-commit + path `file:/opt/hatch/...` yang hanya berlaku
di VM ini); rollback mengembalikan status ke NOT
REPRODUCIBLE — dicatat sebagai rollback ke keadaan blocked,
bukan ke keadaan baik.

**Dampak terhadap bukti runtime:** SEMUA bukti VM yang memakai
1.3.10 sebagai "kanonik" harus dibaca ulang sebagai bukti versi
LAMA (perilaku chunk/dekompresi/GC 1.4.4 terbukti berbeda dari
1.3.10 di F-026/F-029); H-RES-03/05 staging harus dijalankan
pada 1.4.4; runtime artifact staging harus memakai versi 1.4.4
itu. Keputusan ini TIDAK mengubah satu pun angka VM yang sudah
diterbitkan — hanya cara membacanya.

**Fallback — Opsi B (P-2, regenerasi lockfile v1):** kanonik
tetap 1.3.10, `bun.lock` diregenerasi ke v1; prasyarat
tambahan: diff resolusi dependensi v1 vs v2 diperiksa
paket-per-paket; frozen install + typecheck + build dari
lockfile hasil regenerasi dibuktikan sebagai satu alur bersih
pada clean builder. Penggantian SDK path tetap wajib.

**Yang TIDAK diputuskan di sini:** pilihan Opsi A vs B tetap
keputusan owner (G-G); penggantian SDK path tetap butuh
persetujuan owner + runtime provider; TIDAK ADA perubahan
`site/package.json`, `site/bun.lock`, atau file apa pun di
revisi ini. **Acceptance F-030 tetap belum satu pun
terpenuhi** — F-030 tetap **CONFIRMED BLOCKER** dan F-009
tetap **NOT REPRODUCIBLE**. Tidak ada klaim reproducible
sebelum frozen install + typecheck + build pada clean
external builder berhasil dengan SDK yang dapat diverifikasi.

**Risiko tersisa:** U-68 (keputusan reproduksibilitas belum
ada). **Aksi berikutnya:** keputusan owner G-G (gate G-J).

### Reproducibility + ownership staging (handoff V9 butir 5 dan 7) — **blocked**

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

## §3. Response to Previous Handoff — status temuan V8 menurut audit V9 §3 (dicatat, bukan diklaim ulang)

Audit V9 §3 menilai delapan permintaan Handoff V8. Status
independen itu dicatat di sini apa adanya; respons v2.3.16 atas
kekurangan yang dicatat V9 ada di §2 dan §4.

| # | Permintaan V8 | Respons v2.3.15 | Status audit V9 |
|---|---|---|---|
| 1 | Pisahkan eksperimen pola A/B ke proses berbeda; ukur VmHWM | `run-f029.ts`, `exp-pattern.ts`, dua raw log. Masing-masing log berisi 60 RESULT, 60 PID unik, nol kegagalan. | **ADDRESSED AT VM-METHODOLOGY LEVEL**; fixture boundary F-031 masih perlu koreksi. → **DIPERBAIKI v2.3.16 (F-031 §2): fixture exact-byte + rerun + varian cap−1/cap+1.** |
| 2 | Tarik klaim penghematan 4,5–5,4× | Desain dan matriks v2.3.15 secara eksplisit mencabut klaim lama dan menyatakan NOT VERIFIED. | **ADDRESSED**. Rasio 1,18–1,88× hanya hasil simulasi VM, bukan acceptance staging. → **DIPERBARUI v2.3.16: rentang 1,18–1,88× SUPERSEDED oleh 1,13–1,84× (F-031 §2).** |
| 3 | Petakan Bun/lockfile/SDK tanpa mengubah source | Matriks 1.3.10 vs 1.4.4; raw frozen install/typecheck 1.4.4; opsi A/B dan penggantian SDK tetap proposal. | **PARTIALLY ADDRESSED**; clean external builder tetap gagal/NOT VERIFIED karena SDK path absolut dan provenance. → **v2.3.16: proposal keputusan diselesaikan sebagai paket yang dapat diputuskan (F-030 §2); blocker tetap CONFIRMED.** |
| 4 | Pertahankan F-028 NOT VERIFIED | Deployment manifest tetap kosong; tidak ada artifact digest/release record/approval yang dikarang. | **CORRECTLY NOT VERIFIED**. → **Dipertahankan v2.3.16 (F-028 §2).** |
| 5 | Pertahankan F-019 BLOCKED dan jangan invoke checkLink | Matriks menyatakan checkLink tidak di-invoke; kontrol runtime (a)–(e) tetap NOT PROVIDED/NOT VERIFIED. | **BLOCKED / NOT VERIFIED**, benar dipertahankan. → **Dipertahankan v2.3.16 (F-019 §2).** |
| 6 | Lengkapi gap staging dengan prasyarat, prosedur, oracle, bukti | STAGE-P01..P12 kini memiliki deskripsi prasyarat/prosedur/PASS-FAIL/evidence. Operator, provider, egress, DB/runtime, alert recipient, rollback owner tetap UNASSIGNED. | **PARTIALLY ADDRESSED**; definisi teknis lebih lengkap, tetapi tidak ada gate READY. → **Dipertahankan v2.3.16 (tidak ada penunjukan baru).** |
| 7 | Pertahankan baseline keamanan dan provenance historis | F-001..F-005, F-006b/F-006c, F-016..F-019, U-38/U-33 dan suite lama tetap dibawa; SU-T5 tidak direkonstruksi. | **ADDRESSED AS CARRY-FORWARD**; bukan bukti staging. → **Dipertahankan v2.3.16 (§5).** |
| 8 | Tidak ada source implementation tanpa otorisasi terpisah | Diff hanya dokumen, harness, dan bukti. Source/package/lockfile tidak berubah. | **ADDRESSED**. → **Dipertahankan v2.3.16 (diff hanya dokumen + harness + bukti; lihat §4 butir 8).** |

## §4. Jawaban atas Handoff V9 §9 (8 butir)

### Butir 1 — Perbaiki F-031 — fixture exact-byte — **addressed**

Perkiraan karakter diganti pengukuran `TextEncoder` atas
setiap segmen (`exp-pattern.ts` ditulis ulang; SHA-256
`234bb15a…`). Acceptance V9 terpenuhi: fixture ASCII dan
non-ASCII byte-matched tepat 1.000.000 byte (terukur,
di-assert sebelum scan); varian cap−1 (999.999) dan cap+1
(1.000.001) terukur (log `run-144-f031-byte-variants.txt`,
14 run, semua tepat); marker ASCII diperhitungkan
(33/15/13 byte); raw output mencatat byte aktual per segmen
dan total (baris `bytes:` + `segmentBytes` di RESULT).
Rerun penuh: 60 run anak per versi Bun, 0 gagal, 60 PID
berbeda, `asksConnect = true` pada semua 120 run (log
`run-1310-f031-f032.txt`, `run-144-f031-f032.txt`).
Detail penuh + tabel rasio: F-031 §2 di atas.

### Butir 2 — Perbaiki F-032 — validasi harness — **addressed**

`--runs` divalidasi sebagai integer positif dalam rentang
yang disetujui (1..10); assertion jumlah hasil sama dengan
expected count; validasi field RESULT terhadap parameter
yang diminta; timeout child 120 detik + FAIL bila timeout/
signal. Acceptance V9 terpenuhi: input 0, negatif, NaN,
dan terlalu besar exit non-zero; tidak ada jalur nol-run
yang mencetak sukses; valid run menghasilkan semua kombinasi
dan jumlah yang diharapkan. Tes regresi: 7 kasus negatif
exit 2 tanpa "all child runs ok"; kontrol positif `--runs 1`
exit 0 dengan 12 RESULT (log `run-f032-negative.txt`).
Detail penuh: F-032 §2 di atas. Batasan: jalur timeout
end-to-end dengan child yang sengaja menggantung TIDAK
diuji (mekanisme `spawnSync` `ETIMEDOUT` diverifikasi
terpisah).

### Butir 3 — Selaraskan dokumentasi harness — **addressed**

README F-029 menyebut API yang benar
(**`node:child_process.spawnSync`**, BUKAN `Bun.spawnSync`),
command yang benar (`bun run-f029.ts --runs 5` dari
`evidence/f029-memory-methodology/`), cwd, versi Bun yang
dipakai (1.3.10 `1.3.10+30e609e08`; 1.4.4 `1.4.4+38afee6c8`),
serta batasan bahwa skrip hanya simulasi pola string (bukan
implementasi, bukan staging, bukan produksi). Koreksi
dicatat terlihat di README (bagian "Perubahan v2.3.16" +
anotasi pada bagian Metode), bukan dihapus diam-diam.

### Butir 4 — Pertahankan koreksi rasio F-027 — **addressed** (dipertahankan dengan benar)

Klaim 4,5–5,4× TIDAK dikembalikan. Semua dokumen aktif dan
ringkasan versi ini konsisten: rasio yang dipakai adalah
**1,13–1,84×** (pengukuran ulang v2.3.16, median VmHWM,
fixture exact-byte) — hanya hasil eksperimen VM; TIDAK
dipakai sebagai cgroup sizing atau acceptance staging.
Rentang v2.3.15 (1,18–1,88×) dinyatakan SUPERSEDED secara
eksplisit di desain (§D.4.25/§D.4.26/§D.4.27, tabel perubahan
v2.3.14/v2.3.15, paragraf penutup), matriks ini (§1 F-027,
§2 F-031, §3 butir 2), dan README F-029 — bukan dihapus
diam-diam.

### Butir 5 — Selesaikan proposal F-030 tanpa implementasi — **addressed** (paket keputusan selesai; keputusan + eksekusi tetap HOLD)

Keputusan teknis yang direkomendasikan disajikan di §2 F-030
di atas + desain §D.4.27: **Opsi A (Bun kanonik 1.4.4) +
SDK vendorkan berdigest** sebagai rekomendasi utama,
**Opsi B (regenerasi lockfile v1)** sebagai fallback;
masing-masing dengan provenance/digest yang dibutuhkan
(digest rilis Bun 1.4.4 + atestasi provider atas SDK: NOT
PROVIDED, tidak dikarang), prasyarat clean-builder,
rollback, dan dampak bukti runtime (semua bukti VM 1.3.10
dibaca ulang sebagai bukti versi lama). Proposal dapat
diputuskan tanpa mengubah file apa pun — TIDAK ADA perubahan
`site/package.json`, `site/bun.lock`, atau file apa pun di
revisi ini. Tidak ada klaim reproducible sebelum frozen
install + typecheck + build pada clean external builder
berhasil dengan SDK yang dapat diverifikasi. F-030 tetap
CONFIRMED BLOCKER; F-009 tetap NOT REPRODUCIBLE.

### Butir 6 — Pertahankan F-019 BLOCKED — **addressed** (dipertahankan dengan benar)

`checkLink` TIDAK di-invoke; tidak ada public share yang dibuat;
tidak ada perubahan runtime state. Hanya bukti read-only yang
dipakai (paket F-021 v2.3.12, tidak ada capture baru — tidak ada
perubahan status yang membenarkan capture ulang). Kontrol (a)–(e)
tetap belum satu pun terpenuhi — masing-masing dinyatakan
NOT PROVIDED / NOT VERIFIED, bukan ditebak.

### Butir 7 — Lengkapi staging ownership tanpa mengarang nama — **partially addressed** (tabel lengkap; owner tetap UNASSIGNED)

Tabel STAGE-P01..P12 dipertahankan lengkap dengan peran yang
dibutuhkan, prasyarat, prosedur aman, PASS/FAIL oracle, dan
bukti yang harus dihasilkan (desain §D.4.26 — tabel 12 baris;
ringkasan di bawah). Tidak ada nama owner yang dikarang.

- **P01** runtime artifact (versi + `bun:ffi`): probe read-only di sandbox artifact; FAIL = implementasi flock/pidfd DIBLOKIR.
- **P02** filesystem direktori lock: uji FLK-T1..T8 diulang di staging; `df`/`mount` didokumentasikan.
- **P03** isolasi user layanan: direktori 0700 + uji OPS-T1/T6.
- **P04** supervisor/deployment: dokumen menyatakan restart otomatis + kill process group + mount dapat diganti saat deploy (SUP-01).
- **P05** egress policy: topologi egress + prefix NAT64/DNS64 didokumentasikan; uji S-49/S-50.
- **P06** filesystem (NFS): identifikasi dulu; bila NFS, uji FLK-07; bila bukan NFS, NOT APPLICABLE dengan bukti identifikasi.
- **P07** worker-signaling fallback: keputusan U-46 tertulis + pid_max tercatat.
- **P08** pid_max + kuantifikasi U-41: PASS ≤ 1e-6, kondisional ≤ 1e-5, BLOCK > 1e-5.
- **P09** staging DB + runtime: uji H-CAT-01..03 + H-TEN-01..05 di bawah konkurensi.
- **P10** rate limit + konkurensi: uji H-RES-01..06 (H-RES-05 diperbarui v2.3.16 — fixture batas byte terukur eksak cap/cap−1/cap+1).
- **P11** alert channel + operator penerima: uji ST-12 — alert diterima operator ≤ 5 menit dengan isi lengkap (ST-12-LAT-01..03); tanpa kanal = NOT RUN, bukan PASS.
- **P12** audit trail: uji OPS-T5 — jejak audit tercatat atas penghapusan/penggantian file lock oleh root.

Staging operator, runtime provider, egress owner, DB/runtime
owner, alert channel/operator penerima, dan rollback owner tetap
**UNASSIGNED** — tidak ada nama yang dikarang. STAGE-P01..P12
tetap **BLOCKED**; tidak ada gate READY. ST-12 tidak PASS tanpa
penerimaan alert oleh operator.

### Butir 8 — Pertahankan HOLD source dan baseline security — **addressed** (dipatuhi)

v2.3.16 TIDAK mengubah satu pun file source aplikasi, lockfile,
database, deployment, atau live artifact. Carry-forward
dipertahankan: F-001..F-005, F-006b/F-006c, F-016..F-019, F-028,
U-38/U-33 dan seluruh residual (§1, §5). Kebutuhan teknis yang
hanya bisa dibuktikan melalui source change diajukan sebagai
proposal perubahan terpisah di bawah ini (bukan sebagai
implementasi):

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

## §5. Risk register — U-38/U-33/U-45/U-46 + risiko baru (v2.3.16)

| ID | Status v2.3.16 | Inti |
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
| U-64 | **DIPERBARUI v2.3.16** (F-027/F-029/F-031) | Rasio 4,5–5,4× DICABUT; rasio terukur ulang 1,13–1,84× (v2.3.16, exact-byte); aturan desain (larangan materialisasi + incremental) tetap; H-RES-05 diperbarui (kedua mode GC + fixture byte-matched terukur eksak cap/cap−1/cap+1). |
| U-65 | Terbuka (F-028 — provenance deployment) | Tidak berubah. |
| U-66 | **DIPERBARUI v2.3.15** (F-009/F-030) | Matriks kompatibilitas + trade-off Opsi A/B + penggantian SDK path dirumuskan (PROPOSAL — HOLD); F-009 tetap NOT REPRODUCIBLE. |
| U-67 | **DIPERBARUI v2.3.16** (F-029/F-031) | Rasio incremental v2.3.14 tidak valid; manfaat terukur ulang 1,13–1,84× dan bergantung GC (forced 1,51–1,84× vs natural 1,13–1,28×); angka forced-GC bukan perilaku runtime natural; rasio VM bukan acceptance staging. Penanganan: H-RES-05 staging (gate G-I) dengan ambang pra-tes + kedua mode GC + fixture exact-byte. |
| U-68 | **DIPERBARUI v2.3.16** (F-009/F-030) | Lockfile v2 vs Bun kanonik + SDK path absolut; proposal keputusan selesai sebagai paket yang dapat diputuskan (§D.4.27 — rekomendasi Opsi A + SDK vendorkan, fallback Opsi B); digest rilis Bun 1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED; build penuh NOT RUN; dependency digest NOT VERIFIED. Penanganan: keputusan owner G-G + bukti clean-builder (gate G-J). |
| U-69 | **BARU v2.3.16** (F-031) | Klaim batas byte fixture v2.3.15 tidak tepat (ASCII 999.981, non-ASCII byte-matched 999.901); rasio v2.3.15 (1,18–1,88×) superseded oleh 1,13–1,84×. Penanganan: fixture v2.3.16 (exact-byte, cap/cap−1/cap+1) untuk H-RES-05 staging; jangan kutip angka v2.3.15 sebagai pengukuran batas eksak. |
| U-70 | **BARU v2.3.16** (F-032) | Parent harness dapat melaporkan sukses dengan nol run (false green); jalur timeout child belum diuji end-to-end dengan child yang sengaja menggantung. Penanganan: harness v2.3.16 (validasi + assertion + timeout) adalah oracle untuk rerun apa pun; mekanisme timeout `spawnSync` diverifikasi terpisah. |

## §6. Hard gates — ditegaskan kembali (v2.3.16)

- No Link Scanner activation.
- No public deployment.
- No production build (house rules: tidak ada `bun run build` dari `site/`).
- No DB/catalog change.
- No source implementation tanpa owner approval terpisah (HOLD perubahan source mirror sampai klarifikasi F-020 tetap berlaku).
- No production testing (termasuk tidak memanggil `checkLink`).
- F-001..F-005, F-016/F-017/F-022, F-018 tetap OPEN/BLOCKED.
- Penutupan F-001 butuh H-SSRF-01..20 terhadap implementasi aktual di staging terisolasi + log mentah + review independen — hasil VM saja tidak cukup.
- Penutupan F-029 sebagai klaim kuantitatif butuh H-RES-05 PASS di staging (ambang pra-tes + kedua mode GC + fixture byte-matched terukur eksak cap/cap−1/cap+1) — hasil VM v2.3.16 hanya memperbaiki fixture dan metodologi, bukan membuktikan kapasitas staging.
- Penutupan F-030 butuh keputusan owner G-G + penggantian SDK path + bukti clean-builder (gate G-J).

## §7. Yang butuh keputusan Rama (pemilik proyek)

| # | Keputusan | Konteks | Dampak bila belum diputuskan |
| --- | --- | --- | --- |
| 1 | Scope perubahan source (F-020, G-A) | 3 pertanyaan scope matriks v2.3.11 §6 | HOLD perubahan source tetap berlaku; tidak ada pekerjaan tahap (b) |
| 2 | Tenancy F-018 (G-C) | Pernyataan resmi provider tentang scope `ctx.db` (per-user vs shared) | Desain ownership + H-TEN-01..05 tidak dapat dieksekusi |
| 3 | U-46 (G-D) | Opsi (a) terima fallback numeric-kill terkuantifikasi vs opsi (b) larangan mutlak | Implementasi pensinyalan worker tetap DIBLOKIR |
| 4 | Cache F-022 (G-F) | Cabang pilihan (hapus cache dari semua jalur security-scan, rekomendasi) vs alternatif (6 syarat) | Implementasi cache tidak dapat dimulai |
| 5 | Bun kanonik F-009/F-030 (G-G) | **BARU v2.3.16:** rekomendasi Opsi A (naikkan kanonik ke 1.4.4) + SDK vendorkan berdigest vs fallback Opsi B (regenerasi lockfile v1) — paket keputusan lengkap di §2 F-030; digest rilis Bun 1.4.4 + atestasi provider atas SDK harus diisi pada saat keputusan | Reproducible build tetap NOT VERIFIED; clean builder tetap gagal (gate G-J) |
| 6 | Staging (G-E) | Environment + penunjukan staging operator, runtime provider, egress owner, DB/runtime owner, alert channel/operator penerima, rollback owner | STAGE-P01..P12 tetap BLOCKED; tidak ada validasi staging |
| 7 | Otorisasi implementasi tahap (b) | Persetujuan eksplisit terpisah untuk setiap perubahan source (termasuk proposal P-1/P-2/P-3 di §4 butir 8) | Semua remediasi source tetap desain saja |

## §8. Yang TIDAK diklaim v2.3.16

- v2.3.16 TIDAK mengklaim rasio penghematan incremental apa pun sebagai acceptance staging — rasio 1,13–1,84× adalah bukti VM atas pola simulasi dengan fixture exact-byte, bukan kapasitas operasional.
- v2.3.16 TIDAK mengklaim rentang rasio v2.3.15 (1,18–1,88×) direproduksi — rentang itu dinyatakan SUPERSEDED oleh pengukuran ulang 1,13–1,84×.
- v2.3.16 TIDAK mengklaim F-029 tertutup sebagai bukti staging — yang tertutup adalah fixture exact-byte, metodologi VM, dan validasi harness; H-RES-05 staging tetap harus dijalankan dan lolos.
- v2.3.16 TIDAK mengklaim F-030 selesai — proposal keputusan TIDAK mengubah status blocker; F-030 tetap CONFIRMED BLOCKER dan F-009 tetap NOT REPRODUCIBLE.
- v2.3.16 TIDAK mengklaim versi live, approval deployment, atau status runtime apa pun — F-028 tetap NOT VERIFIED, F-019 tetap BLOCKED.
- v2.3.16 TIDAK mengklaim staging tersedia atau owner staging terisi — semua peran tetap UNASSIGNED.
- v2.3.16 TIDAK mengklaim jalur timeout child teruji end-to-end — hanya mekanismenya yang diverifikasi terpisah.
- v2.3.16 TIDAK mengubah satu pun file source aplikasi, lockfile, database/katalog, atau live artifact.

## §9. Gate konkret berikutnya (v2.3.16 → v2.3.17)

- **(G-A)** keputusan owner atas scope perubahan source (F-020).
- **(G-B)** bukti runtime F-019 (versi/digest + kontrol disabled (a)–(e)).
- **(G-C)** keputusan tenancy F-018 (pernyataan resmi provider tentang scope `ctx.db`).
- **(G-D)** keputusan U-46.
- **(G-E)** staging tersedia + peran UNASSIGNED terisi.
- **(G-F)** keputusan cache F-022 — owner menerima cabang pilihan (rekomendasi) vs alternatif.
- **(G-G)** keputusan Bun F-009 — kanonik 1.3.10 vs 1.4.4 (kini dengan rekomendasi Opsi A + SDK vendorkan vs fallback Opsi B, §2 F-030).
- **(G-H)** eksekusi harness H-RES-02/03/05 yang sudah dikoreksi — prasyarat: otorisasi implementasi tahap (b) (G-A) + staging tersedia (G-E) + verifikasi ulang perilaku Bun pada versi kanonik (U-62, bagian staging).
- **(G-I)** stress test memori H-RES-03/05 pada staging (chunk > cap, 3 script paralel, fixture batas 1.000.000 + varian cap−1/cap+1 + non-ASCII byte-matched terukur eksak, high-water RSS/VmHWM ≤ ambang pra-tes, kedua mode GC) + proses deployment manifest terisi untuk setiap deployment (F-028).
- **(G-J)** keputusan reproduksibilitas F-030 — prasyarat: keputusan owner G-G (Opsi A vs Opsi B) + penggantian SDK path (paket ter-publish/vendorkan/sumber resmi) + bukti clean-builder (frozen install + typecheck + build exit 0, lockfile tidak berubah, dependency digest tercatat, tanpa `/opt/hatch`).

Pemicu revisi v2.3.17: keputusan owner atas G-A/G-C/G-D/G-F/G-G,
ATAU bukti runtime G-B, ATAU staging tersedia (G-E), ATAU audit
independen V10 — mana pun yang datang dulu. Tidak ada revisi baru
yang hanya mengulang status v2.3.16.

## §10. Hambatan, percobaan, dan hasil (dicatat agar tidak diulang)

| # | Hambatan / percobaan | Hasil | Tindak lanjut |
| --- | --- | --- | --- |
| 1 | Binary Bun 1.3.10 tidak ada di VM ini (`/tmp/bun1310` dibersihkan antar sesi; `~/.bun` tidak ada) | Diunduh ulang dari rilis resmi oven-sh/bun `bun-v1.3.10` (zip 39.328.732 byte) ke `/tmp/bun1310`; verifikasi `bun --revision` = `1.3.10+30e609e08` (SAMA dengan revisi v2.3.14/v2.3.15) | Binary di `/tmp` bersifat ephemeral — revisi berikutnya kemungkinan harus mengunduh ulang; log mentah di repo adalah bukti yang dipertahankan, bukan binary-nya |
| 2 | Draf pertama `exp-pattern.ts` v2.3.16 membangun fixture SEBELUM baseline | Delta VmHWM menyusut ke 0 pada beberapa kombinasi 1.4.4 (baseline VmHWM sudah memuat input) dan rasio menjadi "Infinityx" pada 2 kombinasi | Urutan diperbaiki (baseline dulu, lalu bangun fixture); log trial DIBUANG (tidak di-commit) dan dicatat di README F-029 + di sini, bukan disembunyikan |
| 3 | Draf kedua membangun SEMUA segmen di muka untuk pola B | Pola B tidak lagi incremental (input dipegang bersamaan); B melebihi A pada 1 kombinasi 1.4.4 nonascii-bytes forced (rasio 0,93×) | Segmen dibangun lazy per pola (pola B satu per satu, dilepas sebelum berikutnya); log trial DIBUANG (tidak di-commit) dan dicatat di README F-029 + di sini |
| 4 | Rentang rasio v2.3.15 (1,18–1,88×) tidak direproduksi eksak oleh rerun exact-byte | Rerun memberi 1,13–1,84× (perbedaan kecil, dalam sebaran antar-run) | Rentang lama dinyatakan SUPERSEDED di desain, matriks ini, dan README F-029; rentang baru dilaporkan apa adanya |
| 5 | Bukti 1.3.10 untuk F-030 (frozen install gagal) — diulang atau dikutip? | **Dikutip, tidak diulang** (log F-009 v2.3.14: `run-1310-install.txt`, SHA-256 `75641b13…`); tidak ada perubahan material pada implementasi/lingkungan/harness/risiko yang membenarkan pengulangan (protokol butir 6) | Bila lockfile atau `packageManager` berubah, bukti ini kedaluwarsa dan wajib diulang |
| 6 | Apakah sweep versi Bun (1.3.x akhir / 1.4.0–1.4.3) diperlukan untuk matriks F-030? | **Tidak dilakukan** — keputusan G-G hanya membutuhkan satu versi kompatibel yang terverifikasi (1.4.4) versus kanonik yang dinyatakan (1.3.10); versi minimum yang menerima lockfile v2 dicatat NOT VERIFIED | Sweep versi adalah pekerjaan lanjutan bila owner memilih opsi yang membutuhkannya |
| 7 | Build penuh untuk matriks F-030? | **NOT RUN** — house rules v2.3.9 + `site/AGENTS.md` (jangan `bun run build` dari `site/`); build penuh tetap NOT VERIFIED pada kedua versi Bun | Build penuh adalah bagian dari acceptance G-J setelah keputusan owner |
| 8 | Jalur timeout child end-to-end — diuji dengan child yang sengaja menggantung? | **Tidak dibuat** — mekanisme `spawnSync` `ETIMEDOUT` + `status: null` diverifikasi terpisah (Bun 1.4.4, `sleep 30`, timeout 200 ms); penanganan di harness diimplementasikan tetapi tidak ada uji end-to-end skenario gantung | Uji end-to-end timeout adalah pekerjaan lanjutan bila harness dipakai sebagai oracle penerimaan yang lebih luas |
| 9 | Konkurensi multi-scan untuk eksperimen F-029? | **Tidak disimulasikan di VM** — satu scan per proses adalah inti koreksi metodologi; oracle konkurensi tetap staging H-RES-05 | Uji konkurensi di staging dengan ambang pra-tes (gate G-I) |
| 10 | Fixture supplementary-plane (U+1F600, surrogate pair) untuk F-029? | **Tidak diuji di VM ini** — fixture memakai U+00E9 saja; varian supplementary-plane tetap menjadi varian staging (fixture H-RES-02 B) | Sertakan H-RES-02 B pada H-RES-05 staging |
| 11 | Staging owners (handoff V9 butir 7) — dapatkah dilengkapi? | **Tidak dapat diisi** — tidak ada penunjukan owner dari Rama atau provider; STAGE-P01..P12 dilengkapi prasyarat/prosedur/oracle/bukti TANPA mengarang nama; peran tetap UNASSIGNED | Menunggu keputusan Rama (G-E, §7 butir 6) |
