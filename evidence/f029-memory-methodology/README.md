# Bukti F-029 — Metodologi perbandingan memori pola incremental yang dikoreksi

**Revisi:** v2.3.15 — jawaban atas audit independen V8 (F-029)
**Tanggal:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Tidak ada jaringan, tidak ada artifact live, `checkLink` TIDAK
di-invoke. Eksperimen ini mensimulasikan pola kode dari
`site/server/src/actions.ts:520-533` (dikutip read-only, bukan
dieksekusi dari artifact) pada string yang dibangun lokal.

## Pertanyaan (F-029)

Audit V8 benar: perbandingan memori pola incremental v2.3.14
(`evidence/f027-derived-strings/`) tidak valid secara komparatif —
pola A dan B dijalankan berurutan dalam SATU proses, string turunan
A tetap hidup saat baseline B diambil, dan pengukuran hanya
checkpoint `process.memoryUsage()` setelah GC — bukan OS high-water
mark. Rasio penghematan 4,5–5,4× yang disimpulkan dari eksperimen
itu **belum didukung** dan dinyatakan **NOT VERIFIED** di revisi ini
(lihat koreksi pada desain v2.3.15 §D.4.26).

## Metode (memenuhi mitigasi V8 butir demi butir)

- `run-f029.ts` (parent harness) menjalankan setiap kombinasi
  sebagai **proses anak terpisah** (`Bun.spawnSync` dengan
  `process.execPath` — binary Bun yang sama, flags/environment
  identik, input identik). Setiap anak punya PID baru dan baseline
  bersih; tidak ada objek atau allocator state pola A pada baseline
  pola B. Parent memverifikasi semua PID anak berbeda (60 PID
  berbeda dari 60 run per versi Bun) dan gagal bila ada duplikat.
- `exp-pattern.ts` (satu pola per proses): `--pattern A|B`,
  `--fixture ascii|nonascii|nonascii-bytes`, `--gc forced|natural`.
- **Metrik utama = VmHWM** (OS high-water RSS dari
  `/proc/self/status`, dibaca di awal proses sebagai baseline dan
  di akhir proses) — menangkap setiap transient peak, bukan
  checkpoint setelah GC. RSS saat ini, external, dan heapUsed
  dicatat sebagai metrik pendamping; `heapUsed` saja TIDAK dipakai
  sebagai oracle (lihat temuan 4).
- **Forced-GC dan natural-GC dipisah dan tidak pernah dicampur:**
  `forced` memanggil `Bun.gc(true)` di tiap titik ukur; `natural`
  tidak memanggil GC sama sekali.
- **Pengulangan:** 5 run per kombinasi (2 pola × 3 fixture × 2 mode
  GC = 12 kombinasi × 5 = 60 run anak per versi Bun). Dilaporkan
  **median + rentang [min..max]**, bukan satu sampel.
- **Fixture non-ASCII:** `nonascii` memakai filler U+00E9 dengan
  jumlah karakter SAMA dengan ASCII (1.000.000 karakter,
  ~2.000.000 byte UTF-8 — menguji biaya penyimpanan string UTF-16
  pada batas jumlah karakter); `nonascii-bytes` memakai filler
  U+00E9 dengan SETENGAH jumlah karakter (500.000 karakter =
  1.000.000 byte UTF-8 — batas byte L2 yang sebenarnya untuk konten
  non-ASCII). Substring sinyal tetap ASCII agar perilaku deteksi
  identik.
- Dijalankan di bawah Bun 1.3.10 (kanonik, `1.3.10+30e609e08`,
  diunduh dari rilis resmi oven-sh/bun `bun-v1.3.10`) DAN Bun 1.4.4
  (`1.4.4+38afee6c8`). Log mentah: `run-1310-f029.txt`,
  `run-144-f029.txt` (689 baris masing-masing, memuat SEMUA output
  anak + tabel ringkasan parent).

## Hasil

### Rasio A/B yang dikoreksi (median VmHWM delta, fixture+GC sama)

| Bun | Fixture | GC | A median VmHWM | B median VmHWM | Rasio A/B |
| --- | --- | --- | --- | --- | --- |
| 1.3.10 | ascii | forced | 5.009.408 | 3.194.880 | **1,57×** |
| 1.3.10 | ascii | natural | 4.911.104 | 3.723.264 | **1,32×** |
| 1.3.10 | nonascii | forced | 5.443.584 | 3.325.952 | **1,64×** |
| 1.3.10 | nonascii | natural | 5.042.176 | 3.854.336 | **1,31×** |
| 1.3.10 | nonascii-bytes | forced | 3.137.536 | 1.667.072 | **1,88×** |
| 1.3.10 | nonascii-bytes | natural | 2.936.832 | 2.338.816 | **1,26×** |
| 1.4.4 | ascii | forced | 4.091.904 | 2.355.200 | **1,74×** |
| 1.4.4 | ascii | natural | 4.583.424 | 3.854.336 | **1,19×** |
| 1.4.4 | nonascii | forced | 4.038.656 | 2.412.544 | **1,67×** |
| 1.4.4 | nonascii | natural | 4.669.440 | 3.936.256 | **1,19×** |
| 1.4.4 | nonascii-bytes | forced | 2.207.744 | 1.368.064 | **1,61×** |
| 1.4.4 | nonascii-bytes | natural | 2.854.912 | 2.420.736 | **1,18×** |

**Rasio terkoreksi keseluruhan: 1,18–1,88× (median VmHWM).**
Rasio v2.3.14 sebesar 4,5–5,4× **TIDAK TERKONFIRMASI** — angka itu
adalah artefak baseline B yang tercemar (string A yang masih hidup
membuat delta B tampak kecil), bukan efek pola incremental itu
sendiri. Rasio 4,5–5,4× dinyatakan **NOT VERIFIED** dan **TIDAK
BOLEH** dipakai sebagai sizing/cgroup acceptance atau kapasitas
operasional.

### Tabel lengkap median VmHWM delta (byte vs baseline bersih tiap proses)

| Pola | Fixture | GC | Bun 1.3.10 median [min..max] | Bun 1.4.4 median [min..max] |
| --- | --- | --- | --- | --- |
| A | ascii | forced | 5.009.408 [4.947.968..5.468.160] | 4.091.904 [3.903.488..4.239.360] |
| A | ascii | natural | 4.911.104 [4.911.104..4.915.200] | 4.583.424 [4.583.424..4.648.960] |
| A | nonascii | forced | 5.443.584 [5.144.576..5.459.968] | 4.038.656 [3.944.448..4.116.480] |
| A | nonascii | natural | 5.042.176 [5.042.176..5.050.368] | 4.669.440 [4.669.440..4.673.536] |
| A | nonascii-bytes | forced | 3.137.536 [3.031.040..3.457.024] | 2.207.744 [2.170.880..2.412.544] |
| A | nonascii-bytes | natural | 2.936.832 [2.936.832..2.945.024] | 2.854.912 [2.854.912..2.920.448] |
| B | ascii | forced | 3.194.880 [3.141.632..3.248.128] | 2.355.200 [2.101.248..2.445.312] |
| B | ascii | natural | 3.723.264 [3.719.168..3.727.360] | 3.854.336 [3.850.240..3.915.776] |
| B | nonascii | forced | 3.325.952 [3.309.568..3.690.496] | 2.412.544 [2.301.952..2.428.928] |
| B | nonascii | natural | 3.854.336 [3.850.240..3.858.432] | 3.936.256 [3.936.256..3.940.352] |
| B | nonascii-bytes | forced | 1.667.072 [1.585.152..2.105.344] | 1.368.064 [1.339.392..1.470.464] |
| B | nonascii-bytes | natural | 2.338.816 [2.334.720..2.347.008] | 2.420.736 [2.420.736..2.486.272] |

Rentang antar-run sempit (umumnya < 10% dari median; satu outlier
1.3.10 A-ascii-forced 5.468.160 vs median 5.009.408 — tetap
tercatat dalam rentang, bukan disembunyikan).

### Deteksi

`asksConnect = true` pada SEMUA 120 run anak (kedua pola, semua
fixture, kedua mode GC, kedua versi Bun) — alternatif incremental
tidak kehilangan deteksi pada kasus uji ini.

## Temuan

1. **Rasio 4,5–5,4× v2.3.14 TIDAK TERKONFIRMASI.** Dengan metodologi
   yang benar (proses terpisah + VmHWM), rasio A/B adalah
   1,18–1,88×. Manfaat incremental NYATA (pola B selalu lebih
   rendah dari pola A pada fixture+GC yang sama) tetapi jauh lebih
   kecil dari klaim v2.3.14.
2. **Manfaat incremental bergantung pada GC.** Pada forced-GC
   rasio 1,57–1,88×; pada natural-GC (perilaku runtime yang
   realistis — GC tidak dipaksa) rasio menyusut ke 1,18–1,32×,
   karena segmen yang dilepas pola B tetap menahan halaman
   allocator sampai GC berjalan. Desain TIDAK BOLEH mengasumsikan
   angka forced-GC sebagai perilaku runtime nyata.
3. **Karakter hidup 3,60× DIPERTAHANKAN sebagai character
   accounting (bukan klaim peak-memory):** pada pola A, karakter
   hidup pada titik analisis tetap 3.599.936 = 3,60× input
   (deterministik, sama di kedua versi Bun). Angka ini adalah
   aritmetika jumlah string yang hidup bersamaan, bukan pengukuran
   memori puncak.
4. **`heapUsed` tetap bukan oracle di Bun 1.3.10:** delta heapUsed
   = 0 pada SEMUA 60 run anak 1.3.10 (kedua pola, semua fixture,
   kedua mode GC), sementara VmHWM naik 1,7–5,4 MB. Pada 1.4.4
   heapUsed bergerak (A forced ~1.005.336; B forced ~8.716).
   Ambang acceptance WAJIB memakai VmHWM/RSS (+ external), per
   versi runtime.
5. **Fixture non-ASCII:** pada jumlah karakter yang sama, peak
   VmHWM non-ASCII ≈ ASCII (penyimpanan string adalah UTF-16 per
   code unit — U+00E9 = 1 code unit seperti 'A'). Pada batas byte
   L2 yang sama (1.000.000 byte UTF-8), konten non-ASCII hanya
   500.000 karakter sehingga peak absolutnya LEBIH RENDAH
   (A: 2,2–3,1 MB vs 4,0–5,4 MB ASCII). Worst-case memori string
   ditentukan oleh jumlah code unit, bukan jumlah byte UTF-8 —
   tetapi L2 menghitung byte, jadi fixture batas byte non-ASCII
   adalah kasus yang benar untuk H-RES-05 staging.
6. **Peak absolut (median VmHWM delta):** pola A 2,2–5,4 MB;
   pola B 1,4–3,9 MB pada input batas L2. Angka-angka ini adalah
   delta proses-VM terhadap baseline Bun (~40 MB); angka ini
   BUKAN batas kapasitas operasional dan BUKAN acceptance staging
   — ambang operasional tetap harus ditetapkan SEBELUM tes oleh
   staging operator.

## Kesimpulan desain (mengikat v2.3.15)

1. **Rasio 4,5–5,4× v2.3.14 DICABUT sebagai klaim kuantitatif.**
   Rasio yang didukung eksperimen terkoreksi: **1,18–1,88×**
   (median VmHWM), dengan catatan angka forced-GC (1,57–1,88×)
   BUKAN perilaku runtime natural (1,18–1,32×). Sampai ada bukti
   staging, TIDAK ADA angka penghematan yang boleh dipakai sebagai
   sizing/cgroup acceptance.
2. **Aturan desain v2.3.14 TETAP BERLAKU dan tidak dilemahkan
   oleh koreksi rasio:** L2 tetap input-body budget (bukan
   peak-memory budget); LARANGAN materialisasi bersamaan tetap
   mengikat; pemindaian incremental tetap menjadi desain yang
   disyaratkan — karena manfaatnya nyata (pola B selalu lebih
   rendah) DAN karena larangan itu membatasi worst-case
   (3,60× karakter hidup), bukan karena rasio lama.
3. **Stress test H-RES-05 diperbarui (staging):** acceptance =
   high-water RSS/VmHWM ≤ ambang pra-tes, diukur per proses scan
   pada Bun kanonik, pada KEDUA mode GC (forced dan natural
   dilaporkan terpisah), fixture batas ASCII + non-ASCII
   byte-matched (500.000 karakter U+00E9 = 1.000.000 byte UTF-8),
   dan concurrency scan yang disepakati. Konkurensi TIDAK
   disimulasikan dalam eksperimen VM ini (satu scan per proses
   adalah inti koreksi metodologi) — oracle konkurensi tetap
   staging.
4. **Kriteria penerimaan F-029 (untuk audit V9):** setiap pola
   pada PID baru (terbukti 60 PID berbeda per versi); tidak ada
   objek/allocator state pola A pada baseline B (dijamin oleh
   proses terpisah); log mentah memuat versi Bun, input, flags,
   baseline, high-water RSS, external, dan hasil deteksi
   (terpenuhi — lihat log mentah).

## SHA-256

| File | SHA-256 |
| --- | --- |
| `exp-pattern.ts` | `4419100ed891f17f51ff969848d08ea2ac61d0f7aee663749e2867c3e8879f73` |
| `run-f029.ts` | `f4e1bbe6ad21dcb95fa91b38ef186e77e9853c096f372e58ca357b68df1be3c1` |
| `run-1310-f029.txt` | `25abea8cee91999fe233c65c541181eb5481635d70cfd08784057c73e3693513` |
| `run-144-f029.txt` | `44943f572835ced5347fd9db8ddbf15e25ed1e9902f077b7cae406932fa4df82` |

## Batasan (dicatat jujur)

- Eksperimen VM atas pola simulasi, BUKAN implementasi; bukan
  staging, bukan produksi.
- Satu scan per proses; konkurensi multi-scan tidak diukur di sini
  (oracle staging H-RES-05).
- VmHWM adalah high-water mark sejak proses dimulai — termasuk
  startup runtime Bun (~40 MB baseline). Yang dibandingkan adalah
  DELTA terhadap baseline tiap proses, bukan nilai absolut.
- `Bun.gc(true)` adalah GC eksplisit Bun; perilaku GC natural
  bergantung pada tekanan alokasi runtime dan dapat berbeda di
  runtime artifact staging.
- Fixture non-ASCII memakai satu code point (U+00E9); plane
  supplementary (surrogate pair, 2 code unit/karakter) tidak diuji
  di sini — fixture H-RES-02 B (U+1F600) tetap menjadi varian
  staging.
- Pengulangan 5 run per kombinasi: cukup untuk median + rentang
  pada sebaran sempit ini, tetapi bukan uji statistik formal;
  staging harus memakai run yang cukup untuk ambang yang
  ditetapkan operator.
