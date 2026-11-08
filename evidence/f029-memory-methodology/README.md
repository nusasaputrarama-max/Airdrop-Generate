# Bukti F-029 — Metodologi perbandingan memori pola incremental yang dikoreksi

**Revisi:** v2.3.16 — jawaban atas audit independen V9 (F-031, F-032)
**Tanggal:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Tidak ada jaringan, tidak ada artifact live, `checkLink` TIDAK
di-invoke. Eksperimen ini mensimulasikan pola kode dari
`site/server/src/actions.ts:520-533` (dikutip read-only, bukan
dieksekusi dari artifact) pada string yang dibangun lokal.

## Perubahan v2.3.16 (F-031 — fixture exact-byte, F-032 — validasi harness)

Audit V9 benar pada dua hal, dan keduanya diperbaiki di revisi
ini — harness BERUBAH, sehingga rerun dibenarkan (protokol
butir 6) dan dijelaskan di sini:

**F-031 — fixture v2.3.15 tidak tepat 1.000.000 byte.** Skrip
lama mengurangi filler 40 karakter (halaman) dan 20 karakter
(tiap script), padahal marker ASCII sebenarnya 33 / 15 / 13
byte — ASCII terukur 999.981 byte, non-ASCII byte-matched
999.901 byte. Versi ini mengukur SETIAP segmen dengan
`TextEncoder().encode(segment).byteLength`, membangun filler
dari panjang marker yang TERUKUR, dan melakukan assert total
byte SEBELUM scan. Tidak ada lagi perkiraan jumlah karakter
yang diklaim sebagai byte.

Perubahan konkret pada `exp-pattern.ts`:

- Marker diukur: `"window.solana connect your wallet"` = 33 byte,
  `"window.ethereum"` = 15 byte, `"walletconnect"` = 13 byte
  (total 61 byte).
- Fixture byte-driven (`ascii`, `nonascii-bytes`) dibangun dari
  target byte per segmen (halaman = target − 600.000, tiap
  script = 300.000) dan tiap segmen di-assert tepat sama dengan
  targetnya; total di-assert tepat sama dengan `--bytes`
  (default 1.000.000).
- Karena filler U+00E9 = 2 byte dan target filler per segmen
  bisa ganjil, kekurangan 0–1 byte per segmen ditutup dengan
  SATU karakter pad ASCII `'A'` (1 byte, filler inert).
  Pada target default, `nonascii-bytes` = 499.968 karakter
  U+00E9 + 3 karakter pad ASCII + 61 karakter marker =
  **500.032 karakter, tepat 1.000.000 byte** (bukan lagi
  "500.000 karakter = 1.000.000 byte" — klaim v2.3.15 itu
  tidak tepat 99 byte dan dikoreksi di sini).
- Fixture char-matched (`nonascii`, 1.000.000 karakter) total
  byte terukurnya **1.999.939** (bukan ~2.000.000): filler
  999.939 karakter U+00E9 = 1.999.878 byte + 61 byte marker.
  Nilai 1.999.939 di-assert, bukan dibulatkan.
- Argumen baru `--bytes N` (1..2.000.000) untuk varian
  cap−1 (999.999) dan cap+1 (1.000.001); tidak berlaku untuk
  fixture `nonascii` (didefinisikan oleh jumlah karakter).
- Segmen dibangun LAZILY per pola (metodologi v2.3.15
  dipertahankan): pola A membangun ketiganya (dipegang
  bersamaan sesuai desain); pola B membangun SATU segmen per
  iterasi, memindai, lalu melepas sebelum segmen berikutnya.
  Baseline bersih tetap diambil SEBELUM segmen dibangun.
- Overhead pengukuran (dicatat jujur): tiap segmen di-encode
  satu kali dengan TextEncoder untuk mengukurnya; salinan
  Uint8Array transien (maks. satu segmen, ≤ 400.000 byte)
  ikut terhitung dalam VmHWM seperti alokasi transien lainnya,
  dan berlaku sama untuk kedua pola. Akibatnya delta absolut
  v2.3.16 sedikit lebih besar dari v2.3.15 (mis. A ascii forced
  1.4.4: 4.091.904 → 5.300.224); rasio yang dibandingkan
  tetap dalam pita yang sama (lihat hasil di bawah).
- Field RESULT `utf8BytesApprox` (perkiraan) DIGANTI
  `utf8Bytes` (terukur) + `segmentBytes` per segmen +
  `byteTarget`.

**F-032 — validasi harness** diperbaiki di `run-f029.ts`
(detail penuh + log tes regresi di
`evidence/f032-harness-validation/README.md`): `--runs`
wajib, integer 1..10; assertion `records.length ===
EXPECTED_RUNS` + tiap kombinasi tepat RUNS record; validasi
setiap RESULT terhadap pattern/fixture/GC/bun yang diminta
dan terhadap total byte terukur yang diharapkan; timeout
child 120 detik + FAIL bila timeout/signal; baris sukses
hanya bila semua pemeriksaan lolos.

**Koreksi dokumentasi (handoff V9 butir 3):** README ini
sebelumnya menyebut `Bun.spawnSync`; yang benar adalah
**`node:child_process.spawnSync`** dengan `process.execPath`
(binary Bun yang sama dengan parent) — lihat bagian Metode
di bawah. Command yang benar:
`bun run-f029.ts --runs 5` dari direktori
`evidence/f029-memory-methodology/` (cwd). Skrip ini hanya
simulasi pola string — BUKAN implementasi, BUKAN staging,
BUKAN produksi.

## Hasil v2.3.16 (harness yang sudah diperbaiki, fixture exact-byte)

Rerun penuh 60 run anak per versi Bun, 0 gagal, 60 PID berbeda
terverifikasi per versi, `asksConnect = true` pada SEMUA 120
run anak. Log mentah baru: `run-1310-f031-f032.txt`,
`run-144-f031-f032.txt` (839 baris masing-masing). Log v2.3.15
(`run-1310-f029.txt`, `run-144-f029.txt`) DIPERTAHANKAN sebagai
bukti historis — tetapi klaim batas-byte-nya TIDAK dibawa
ulang: log lama mengukur fixture 999.981 / 999.901 byte,
bukan batas eksak.

### Rasio A/B yang terukur ulang (median VmHWM delta)

| Bun | Fixture | GC | A median | B median | Rasio A/B |
| --- | --- | --- | --- | --- | --- |
| 1.3.10 | ascii | forced | 6.336.512 | 3.899.392 | **1,63×** |
| 1.3.10 | ascii | natural | 5.865.472 | 4.739.072 | **1,24×** |
| 1.3.10 | nonascii | forced | 8.073.216 | 4.849.664 | **1,66×** |
| 1.3.10 | nonascii | natural | 8.138.752 | 6.615.040 | **1,23×** |
| 1.3.10 | nonascii-bytes | forced | 4.685.824 | 2.543.616 | **1,84×** |
| 1.3.10 | nonascii-bytes | natural | 4.575.232 | 3.837.952 | **1,19×** |
| 1.4.4 | ascii | forced | 5.300.224 | 3.379.200 | **1,57×** |
| 1.4.4 | ascii | natural | 5.804.032 | 5.140.480 | **1,13×** |
| 1.4.4 | nonascii | forced | 5.349.376 | 3.149.824 | **1,70×** |
| 1.4.4 | nonascii | natural | 7.897.088 | 6.176.768 | **1,28×** |
| 1.4.4 | nonascii-bytes | forced | 3.063.808 | 2.031.616 | **1,51×** |
| 1.4.4 | nonascii-bytes | natural | 4.603.904 | 3.739.648 | **1,23×** |

**Rasio terukur ulang keseluruhan: 1,13–1,84× (median VmHWM).**
Rentang v2.3.15 (1,18–1,88×) TIDAK direproduksi secara eksak —
ujung bawah kini 1,13× (1.4.4 ascii natural) dan ujung atas
1,84× (1.3.10 nonascii-bytes forced). Perbedaan ini kecil dan
dalam sebaran antar-run, tetapi dicatat apa adanya: **rentang
1,18–1,88× dinyatakan SUPERSEDED oleh pengukuran v2.3.16
(1,13–1,84×) pada fixture exact-byte**. Yang TIDAK berubah:
pola B lebih rendah dari pola A pada SEMUA 12 kombinasi di
kedua versi Bun; forced-GC 1,51–1,84× vs natural-GC 1,13–1,28×
(manfaat incremental tetap bergantung GC — angka forced-GC
BUKAN perilaku runtime natural). Rasio ini tetap HANYA bukti
VM atas pola simulasi — BUKAN sizing/cgroup acceptance, BUKAN
acceptance staging (H-RES-05 tetap harus dijalankan di
staging, gate G-I).

### Varian cap−1 / cap / cap+1 (log `run-144-f031-byte-variants.txt`)

14 run langsung `exp-pattern.ts` (Bun 1.4.4, gc natural,
2026-11-08T01:56:35Z): pola A dan B × fixture `ascii` dan
`nonascii-bytes` × `--bytes` 999.999 / 1.000.000 /
1.000.001, plus pola A dan B × `nonascii` default. Semua
exit 0; total byte terukur TEPAT sama dengan target pada
setiap run (999.999, 1.000.000, 1.000.001; nonascii tetap
1.999.939). Karakter hidup pola A tetap 3,60× input pada
semua varian (mis. cap−1 ascii: 3.600.002 / 999.999).

### Temuan yang dipertahankan dari v2.3.15

- **`heapUsed` tetap bukan oracle di Bun 1.3.10:** delta
  heapUsed = 0 pada SEMUA 60 run anak 1.3.10 (kedua pola,
  semua fixture, kedua mode GC) — direproduksi v2.3.16.
- **Karakter hidup 3,60× DIPERTAHANKAN sebagai character
  accounting** (ascii: 3.600.005 karakter hidup pada titik
  analisis pola A; nonascii-bytes: 1.800.116 / 500.032 =
  3,60×), BUKAN klaim peak-memory.
- **Deteksi tidak hilang:** `asksConnect = true` pada SEMUA
  120 run anak.
- **Konkurensi TIDAK disimulasikan di VM** — oracle
  konkurensi tetap staging H-RES-05.

## Hambatan (dicatat agar tidak diulang)

| # | Hambatan / percobaan | Hasil | Tindak lanjut |
| --- | --- | --- | --- |
| 1 | Draf pertama v2.3.16 membangun fixture SEBELUM baseline | Delta VmHWM menyusut ke 0 pada beberapa kombinasi 1.4.4 (baseline VmHWM sudah memuat input) dan rasio menjadi "Infinityx" pada 2 kombinasi | Urutan diperbaiki (baseline dulu, lalu bangun fixture); log trial draf ini DIBUANG (tidak di-commit) dan dicatat di sini, bukan disembunyikan |
| 2 | Draf kedua membangun SEMUA segmen di muka untuk pola B | Pola B tidak lagi incremental (input dipegang bersamaan); B melebihi A pada 1 kombinasi 1.4.4 nonascii-bytes forced (rasio 0,93×) | Segmen dibangun lazy per pola (pola B satu per satu, dilepas sebelum berikutnya); log trial DIBUANG (tidak di-commit) dan dicatat di sini |
| 3 | Rentang rasio v2.3.15 (1,18–1,88×) tidak direproduksi eksak | Rerun exact-byte memberi 1,13–1,84× | Rentang lama dinyatakan SUPERSEDED; rentang baru dilaporkan apa adanya; bukan acceptance staging |

## Hasil v2.3.15 (dipertahankan sebagai catatan sejarah)

Bagian "Hasil" v2.3.15 di bawah ini TIDAK diubah — ia
mendokumentasikan pengukuran dengan fixture LAMA (999.981 /
1.999.901 / 999.901 byte). Angka-angka itu tetap terlihat
tetapi TIDAK BOLEH dikutip sebagai pengukuran pada batas
byte eksak; pengukuran batas eksak adalah tabel v2.3.16
di atas.

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
  sebagai **proses anak terpisah** (`node:child_process.spawnSync`
  dengan `process.execPath` — binary Bun yang sama, flags/environment
  identik, input identik). **[KOREKSI v2.3.16 (handoff V9 butir 3):
  README v2.3.15 salah menyebut `Bun.spawnSync`; source memakai
  `node:child_process.spawnSync`.]** Setiap anak punya PID baru dan baseline
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
  1.999.939 byte UTF-8 terukur **[KOREKSI v2.3.16: README v2.3.15
  menyebut "~2.000.000 byte"; total terukur sebenarnya 1.999.939
  — 61 byte marker ASCII dihitung 1 byte, bukan 2]** — menguji biaya penyimpanan string UTF-16
  pada batas jumlah karakter); `nonascii-bytes` memakai filler
  U+00E9 dengan SETENGAH jumlah karakter (500.000 karakter =
  1.000.000 byte UTF-8 — batas byte L2 yang sebenarnya untuk konten
  non-ASCII) **[KOREKSI v2.3.16 (F-031): klaim v2.3.15 itu tidak
  tepat — fixture lama terukur 999.901 byte; fixture v2.3.16
  adalah 500.032 karakter (499.968 U+00E9 + 3 pad ASCII + 61
  marker) = tepat 1.000.000 byte terukur. Lihat bagian
  "Perubahan v2.3.16" di atas.]**. Substring sinyal tetap ASCII agar perilaku deteksi
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
   **[PEMBARUAN v2.3.16: rerun dengan fixture exact-byte memberi
   rasio 1,13–1,84× (median VmHWM) — rentang 1,18–1,88×
   dinyatakan SUPERSEDED; forced-GC 1,51–1,84×, natural-GC
   1,13–1,28×. Lihat "Hasil v2.3.16" di atas.]**
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

File v2.3.15 (dipertahankan sebagai bukti historis — fixture
lama, BUKAN batas byte eksak):

| File | SHA-256 |
| --- | --- |
| `exp-pattern.ts` (v2.3.15) | `4419100ed891f17f51ff969848d08ea2ac61d0f7aee663749e2867c3e8879f73` |
| `run-f029.ts` (v2.3.15) | `f4e1bbe6ad21dcb95fa91b38ef186e77e9853c096f372e58ca357b68df1be3c1` |
| `run-1310-f029.txt` | `25abea8cee91999fe233c65c541181eb5481635d70cfd08784057c73e3693513` |
| `run-144-f029.txt` | `44943f572835ced5347fd9db8ddbf15e25ed1e9902f077b7cae406932fa4df82` |

File v2.3.16 (harness yang sudah diperbaiki — F-031/F-032):

| File | SHA-256 |
| --- | --- |
| `exp-pattern.ts` | `234bb15aa0bb13c09f81cff1182ddbc04394d39d1b7366e3ef48273112f585f1` |
| `run-f029.ts` | `03ac14e348431029922600160d3e07223799a05514dcd6c078e6471cac92841f` |
| `run-1310-f031-f032.txt` | `0cfe0dd22ad110e84d52c699e16e9f3ae36de370f5fad66c6df17b72c7d223f5` |
| `run-144-f031-f032.txt` | `a01b7d83548eb5bf0c6f3911d26f5031274bd9a1d9c68c4bac8fce46df266bb2` |
| `run-144-f031-byte-variants.txt` | `605aecee143885e283ad95f2add3ab469a2ea0986d879cd9f8e468c75e18c22c` |

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
