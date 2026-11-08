# Bukti F-032 — Validasi argumen harness F-029 (tidak ada lagi false green)

**Revisi:** v2.3.17 — jawaban atas audit independen V10 (F-032 timeout E2E)
**Tanggal:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Tidak ada jaringan, tidak ada artifact live, `checkLink` TIDAK
di-invoke. Paket ini hanya menguji parent harness
`evidence/f029-memory-methodology/run-f029.ts` — tidak ada
eksperimen memori baru di sini.

## Pertanyaan (F-032)

Audit V9 benar: `run-f029.ts` v2.3.15 mem-parsing `--runs` dengan
`Number(...)` tanpa validasi integer positif. Pemanggilan
`--runs 0` atau nilai non-numerik membuat loop child tidak
berjalan sama sekali, `failures` tetap 0, parent mencetak
"parent done: all child runs ok" dan keluar 0 — false green dari
artefak kosong. Tidak ada assertion bahwa jumlah record sama
dengan jumlah run yang diharapkan, tidak ada validasi RESULT
terhadap parameter yang diminta, dan tidak ada timeout child.

**Batas dampak:** raw log v2.3.15 yang diperiksa audit V9
benar-benar berisi 60 RESULT records per versi Bun, 60 PID unik,
dan 0 kegagalan — F-032 TIDAK membatalkan kedua log tersebut.
Yang diperbaiki adalah harnessnya, supaya pemakaian ulang
sebagai oracle penerimaan tidak dapat menghasilkan false green.

## Perbaikan (v2.3.16, `run-f029.ts`)

1. **`--runs` wajib dan divalidasi ketat:** flag harus ada
   (tidak ada default diam-diam); bentuk `--runs N` atau
   `--runs=N`; nilai harus cocok `/^\d+$/` dan integer dalam
   rentang yang disetujui **1..10** (`MAX_RUNS = 10`). Nilai 0,
   negatif, NaN, non-numerik, desimal, terlalu besar (> 10),
   nilai hilang, atau flag hilang → `console.error` + usage +
   **exit 2**, tanpa satu pun child dijalankan dan tanpa
   mencetak "all child runs ok".
2. **Assertion jumlah record:** setelah loop, parent menegaskan
   `records.length === EXPECTED_RUNS` (12 kombinasi × RUNS) dan
   tiap kombinasi tepat RUNS record; ketidakcocokan dicetak
   sebagai `COUNT MISMATCH` dan menggagalkan run.
3. **Validasi setiap RESULT terhadap parameter yang diminta:**
   `pattern`, `fixture`, `gc` harus sama dengan yang diminta;
   `bun` harus sama dengan versi parent (child di-spawn dengan
   `process.execPath` yang sama); `asksConnect` harus `true`;
   `utf8Bytes` yang TERUKUR harus sama dengan yang diharapkan
   per fixture (ascii dan nonascii-bytes: tepat 1.000.000;
   nonascii: tepat 1.999.939 — lihat F-031);
   `segmentBytes` harus berjumlah sama dengan `utf8Bytes`;
   `vmHwmDelta` harus bilangan non-negatif. Satu pun
   ketidakcocokan → record itu dihitung sebagai failure.
4. **Timeout child + status gagal bila timeout/signal:**
   `spawnSync(..., { timeout: 120_000 })`; `error` (termasuk
   `ETIMEDOUT`), `status === null`, atau `signal` → FAIL
   dengan alasan yang dicetak (`timeout after 120000 ms` /
   `killed by signal ...`). Mekanisme timeout `spawnSync`
   diverifikasi terpisah (Bun 1.4.4, `sleep 30` dengan timeout
   200 ms → `{ errorCode: "ETIMEDOUT", status: null, signal:
   "SIGTERM" }`) — jalur timeout end-to-end di harness TIDAK
   diuji dengan child yang sengaja menggantung (tidak ada
   skenario gantung yang dibuat); yang diuji adalah
   penanganannya bila kondisi itu terjadi.
5. **Baris sukses hanya bila semua pemeriksaan lolos:**
   "parent done: all child runs ok" dicetak HANYA bila
   `failures === 0` DAN jumlah record tepat DAN semua kombinasi
   lengkap; bila tidak, parent mencetak
   "parent done: FAILED — …" dan **exit 1**.

## Perubahan v2.3.17 (F-032 — timeout end-to-end dengan child yang sengaja menggantung)

Audit V10 memberi caveat pada F-032: mekanisme timeout `spawnSync`
hanya diverifikasi terpisah (Bun 1.4.4, `sleep 30`, timeout 200 ms
→ `ETIMEDOUT`), tanpa uji end-to-end melalui parent harness dengan
child yang sengaja menggantung. Revisi ini menutup caveat itu:

**Child dummy yang menggantung — `hang-child.ts`.** Menerima argumen
yang sama dengan `exp-pattern.ts` (`--pattern/--fixture/--gc`) dan
mengabaikannya; menulis PID-nya (append, satu baris per child) ke
`$F032_PID_FILE`; mencetak satu baris lalu menggantung selamanya
(`await new Promise(() => {})`). TIDAK PERNAH mencetak RESULT dan
tidak pernah keluar sendiri. File ini hanya ada di sandbox
eksperimen ini — tidak ada target produksi, tidak ada artifact,
tidak ada `checkLink`.

**Test seam di parent harness — `run-f029.ts`.** Dua env var
test-only (tervalidasi; nilai buruk → exit 2; bila aktif, parent
mencetak baris `test-seam:` eksplisit di log): `F029_CHILD_SCRIPT`
(ganti script child yang di-spawn) dan `F029_CHILD_TIMEOUT_MS`
(integer 100..120000, default 120000). Production run TIDAK PERNAH
mengeset keduanya; log run produksi dapat dibedakan dari log uji
dari ada/tidaknya baris `test-seam:`.

**Driver uji — `run-f032-timeout-e2e.ts`.** Menjalankan
`bun run-f029.ts --runs 1` (cwd `evidence/f029-memory-methodology/`)
dengan seam `F029_CHILD_SCRIPT=<abs path hang-child.ts>` dan
`F029_CHILD_TIMEOUT_MS=3000`, lalu meng-assert: exit 1; tepat 12
baris FAIL (satu per child gantung) dan semuanya beralasan
`timeout after 3000 ms`; parent mencetak `parent done: FAILED`
+ `COUNT MISMATCH` (0 dari 12 record); TIDAK ADA baris RESULT;
TIDAK ADA baris `all child runs ok`; baris `test-seam:` tercatat;
preflight tetap berjalan dan lolos sebelum child gantung; dan
**ke-12 PID child yang tercatat sudah mati** (`process.kill(pid, 0)`
melempar ESRCH untuk semuanya — tidak ada child yang bocor).
Driver exit 0 hanya bila SEMUA assert lolos.

## Tes end-to-end (log mentah: `run-f032-timeout-e2e.txt`)

Jalankan dari `evidence/f032-harness-validation/`, Bun 1.4.4,
2026-11-08T02:53:24Z (durasi ~36 detik = 12 child × timeout 3 detik):

| # | Assert | Hasil |
| --- | --- | --- |
| 1 | Driven run exit 1 | PASS |
| 2 | 12 baris FAIL | PASS (12) |
| 3 | Semua FAIL beralasan `timeout after 3000 ms` | PASS (12/12) |
| 4 | Parent mencetak `parent done: FAILED` | PASS |
| 5 | Parent TIDAK mencetak `all child runs ok` | PASS |
| 6 | Parent mencetak `COUNT MISMATCH` (0 dari 12) | PASS |
| 7 | Tidak ada baris RESULT | PASS (0) |
| 8 | Parent mencatat baris `test-seam:` | PASS |
| 9 | Preflight berjalan + lolos sebelum child gantung | PASS |
| 10 | Ke-12 PID child tercatat | PASS (12 PID: 3776, 3782, 3790, 3802, 3808, 3821, 3827, 3835, 3846, 3849, 3863, 3866) |
| 11 | Ke-12 child sudah mati setelah parent keluar | PASS (kill(pid,0) → ESRCH untuk semua; bocor: none) |

Verdict driver: **E2E TIMEOUT TEST: PASS**. Dengan ini jalur
timeout child TERBUKTI end-to-end melalui parent harness yang
sebenarnya — bukan hanya mekanismenya yang diverifikasi terpisah.

**Catatan pengembangan (dicatat agar tidak diulang):** draf pertama
driver hanya memeriksa PID child TERAKHIR karena hang-child
menimpa pidfile (`writeFileSync`); driver + hang-child diperbaiki
(append satu PID per baris; driver memeriksa ke-12 PID) dan uji
di-rerun penuh; log draf pertama ditimpa oleh rerun yang lebih
kuat, bukan disembunyikan.

## Tes regresi negatif — diulang pada harness v2.3.17 (log `run-f032-negative-v2317.txt`)

`run-f029.ts` berubah di v2.3.17 (preflight gate + test seam +
validasi `encoderInMeasuredPhase`), sehingga 7 kasus negatif
diulang pada harness baru (Bun 1.4.4, 2026-11-08T02:54:57Z,
log 307 baris): `--runs 0`, `--runs abc`, `--runs -1`, nilai
hilang, flag hilang, `--runs 11`, `--runs 1.5` — ketujuh kasus
tetap exit 2 tanpa mencetak sukses; kontrol positif `--runs 1`
exit 0 dengan 12 RESULT + `parent done: all child runs ok`
(output penuh kontrol ada di log). Log v2.3.16
(`run-f032-negative.txt`) dipertahankan sebagai bukti historis.

## Tes regresi (log mentah: `run-f032-negative.txt`)

Jalankan dari `evidence/f029-memory-methodology/` (cwd harness),
Bun 1.4.4, 2026-11-08T01:56:59Z:

| # | Pemanggilan | Hasil |
| --- | --- | --- |
| 1 | `bun run-f029.ts --runs 0` | exit 2, "out of approved range 1..10", tanpa "all child runs ok" |
| 2 | `bun run-f029.ts --runs abc` | exit 2, "must be a positive integer", tanpa "all child runs ok" |
| 3 | `bun run-f029.ts --runs -1` | exit 2, "must be a positive integer", tanpa "all child runs ok" |
| 4 | `bun run-f029.ts --runs` (nilai hilang) | exit 2, "--runs requires a value", tanpa "all child runs ok" |
| 5 | `bun run-f029.ts` (flag hilang) | exit 2, "--runs is required", tanpa "all child runs ok" |
| 6 | `bun run-f029.ts --runs 11` (terlalu besar) | exit 2, "out of approved range 1..10", tanpa "all child runs ok" |
| 7 | `bun run-f029.ts --runs 1.5` (desimal) | exit 2, "must be a positive integer", tanpa "all child runs ok" |
| + | Kontrol positif `bun run-f029.ts --runs 1` | exit 0, 12 RESULT, "parent done: all child runs ok" |

Kasus 1–5 adalah tes regresi yang diminta audit V9 §5 F-032;
kasus 6–7 adalah tambahan (batas atas rentang + desimal).
Semua 7 kasus negatif lolos kriteria: exit non-zero DAN tidak
mencetak "all child runs ok".

## SHA-256

| File | SHA-256 |
| --- | --- |
| `run-f032-negative.txt` | `13db12c6d56563b5e8cfbaca0e33f6f82e3a6675316fa3f7cf30b1cd177f62ee` |
| `hang-child.ts` (v2.3.17) | `0d747fa7fec2b1b8c141735e21c3de8349064fde313164c9df5dbdb44d92613a` |
| `run-f032-timeout-e2e.ts` (v2.3.17) | `169e1d6908806659298cc5f1e862d094eaf0fe7d59029a2e35b306f4820256ab` |
| `run-f032-timeout-e2e.txt` (v2.3.17) | `6148cb8924fdfd3c0195994f3146ae275064e124e139bcec1558a5fa37c87fd4` |
| `run-f032-negative-v2317.txt` (v2.3.17) | `4c97e1d079a21f94a8f4e0aec1b7eda961843bc7f5adc36c324123331b8a7a91` |

## Batasan (dicatat jujur)

- Validasi ini menutup jalur false green pada ARGUMEN dan
  PENGHITUNGAN record; ia tidak membuktikan kebenaran
  pengukuran memori itu sendiri — itu urusan F-031 dan
  metodologi proses-terpisah (lihat README F-029 v2.3.16).
- **[PEMBARUAN v2.3.17: batasan ini TERTUTUP untuk jalur timeout —
  uji end-to-end dengan child yang sengaja menggantung kini ADA
  dan PASS (lihat "Tes end-to-end" di atas). Mekanisme timeout
  `spawnSync` (`ETIMEDOUT` + `status: null`) sebelumnya
  diverifikasi terpisah; kini terbukti melalui parent harness
  yang sebenarnya, termasuk terminasi ke-12 child.]**
- Rentang yang disetujui 1..10 adalah keputusan harness
  v2.3.16 (5 run per kombinasi adalah yang dipakai; 10 adalah
  batas atas untuk pengulangan yang lebih besar tanpa mengubah
  kode). Bukan batas yang ditetapkan owner.
- Test seam `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` adalah
  jalur override yang sengaja ada di harness. Risikonya
  (seseorang menjalankan harness dengan seam aktif lalu mengira
  itu run produksi) dimitigasi oleh baris log `test-seam:`
  eksplisit + dokumentasi ini; seam TIDAK mengubah perilaku
  default (tanpa env var, script = `exp-pattern.ts`, timeout =
  120.000 ms — sama seperti v2.3.16).
