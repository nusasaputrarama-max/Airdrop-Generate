# Bukti F-032 — Validasi argumen harness F-029 (tidak ada lagi false green)

**Revisi:** v2.3.16 — jawaban atas audit independen V9 (F-032)
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

## Batasan (dicatat jujur)

- Validasi ini menutup jalur false green pada ARGUMEN dan
  PENGHITUNGAN record; ia tidak membuktikan kebenaran
  pengukuran memori itu sendiri — itu urusan F-031 dan
  metodologi proses-terpisah (lihat README F-029 v2.3.16).
- Jalur timeout child diimplementasikan dan mekanismenya
  (`spawnSync` `ETIMEDOUT` + `status: null`) diverifikasi
  terpisah, tetapi TIDAK ada uji end-to-end dengan child yang
  sengaja menggantung — skenario itu tidak dibuat di revisi
  ini.
- Rentang yang disetujui 1..10 adalah keputusan harness
  v2.3.16 (5 run per kombinasi adalah yang dipakai; 10 adalah
  batas atas untuk pengulangan yang lebih besar tanpa mengubah
  kode). Bukan batas yang ditetapkan owner.
