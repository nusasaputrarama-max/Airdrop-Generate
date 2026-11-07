# Bukti F-027 — Salinan string turunan vs budget L2 1.000.000 byte

**Revisi:** v2.3.14 — jawaban atas audit independen V7 (F-027)
**Tanggal:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Tidak ada jaringan, tidak ada artifact live, `checkLink` TIDAK
di-invoke. Eksperimen ini mensimulasikan pola kode dari
`site/server/src/actions.ts:520-533` (dikutip read-only, bukan
dieksekusi dari artifact) pada string yang dibangun lokal.

## Pertanyaan (F-027)

L2 v2.3.13 menghitung decoded-body bytes halaman + script (1.000.000
byte). Tetapi source membentuk representasi string turunan dari konten
yang sama: `scriptTexts.join("\n")`, `haystack` (template HTML +
script), `lower = haystack.toLowerCase()`. Apakah 1.000.000 byte adalah
batas input-body atau batas peak memory? Eksperimen ini mengukur
high-water memory aktual pada kasus batas L2.

## Metode

- `exp-derived.ts`: kasus batas L2 — halaman 400.000 karakter + 2
  script × 300.000 karakter = **1.000.000 karakter input yang diterima**
  (maksimum yang mencapai jalur analisis di bawah aturan L2; script
  ketiga pada cap penuh akan meng-abort scan dan konten parsialnya
  dibuang, tidak pernah dianalisis).
- **Bagian A (pola saat ini):** bangun `html` + `scriptTexts`, lalu
  `join`, lalu template `haystack`, lalu `toLowerCase()`, lalu jalankan
  pemeriksaan yang sama dengan source (`/connect\s*(your\s*)?wallet/i`,
  `window.solana`, `window.ethereum`, `walletconnect`,
  `eth_requestaccounts`). Ukur `heapUsed`/RSS setelah `Bun.gc(true)`
  pada tiap langkah.
- **Bagian B (alternatif desain — incremental/streaming):** tiap segmen
  dibuat, diperiksa (lowercase per segmen saja), lalu dilepas sebelum
  segmen berikutnya dibuat; tidak ada `join`, tidak ada `haystack`
  gabungan, tidak ada `lower` gabungan. Ukur peak heapUsed/RSS selama
  pemindaian.
- Dijalankan di bawah Bun 1.3.10 (kanonik) dan Bun 1.4.4. Log mentah:
  `run-1310-derived.txt`, `run-144-derived.txt`.

## Hasil

### Jumlah karakter hidup pada titik analisis (deterministik, kedua versi sama)

| String hidup | Karakter |
| --- | --- |
| `html` | 399.993 |
| `scriptTexts` (2 script) | 599.988 |
| `scriptText` (join) | 599.989 |
| `haystack` | 999.983 |
| `lower` | 999.983 |
| **Total karakter hidup** | **3.599.936** |
| Input yang diterima | 1.000.000 |
| **Rasio karakter hidup / input** | **3,60×** |

### High-water memory terukur (delta vs baseline post-GC)

| Metrik | Bun 1.3.10 | Bun 1.4.4 |
| --- | --- | --- |
| Pola saat ini — RSS setelah analisis (A5) | **+4.980.736 byte (~4,98× input)** | **+4.325.376 byte (~4,33× input)** |
| Pola saat ini — heapUsed setelah analisis (A5) | +0 (lihat batasan) | **+3.609.196 byte (~3,61× input)** |
| Alternatif incremental — peak RSS (B3) | **+917.504 byte** | +2.228.224 byte |
| Alternatif incremental — peak heapUsed (B3) | +0 (lihat batasan) | +802.465 byte |
| **Rasio pola-saat-ini / incremental** | **~5,4× (RSS)** | **~4,5× (heapUsed)** |

Pemeriksaan menemukan sinyal pada kedua pola (`asksConnect = true`
di A dan B) — alternatif incremental tidak kehilangan deteksi pada
kasus uji ini.

## Temuan

1. **L2 BUKAN batas peak memory.** Pada input batas 1.000.000 byte,
   pola saat ini menahan 3,60× karakter hidup dan peak RSS ~4,3–5,0×
   input byte. Angka 1.000.000 byte hanya membatasi **input-body
   yang diterima**, bukan memori proses.
2. **`heapUsed` bukan oracle yang dapat diandalkan di semua versi.**
   Pada Bun 1.3.10 `heapUsed` tetap 211.394 pada semua langkah
   sementara RSS naik ~5 MB dan `external` naik ~2,6 MB — string
   dicatat di luar `heapUsed` pada versi itu. Pada 1.4.4 `heapUsed`
   bergerak sesuai harapan (+3,6 MB). **Pengukuran memori wajib
   memakai RSS (+ external), bukan `heapUsed` saja** — dan ambang
   acceptance harus dinyatakan per metrik + per versi runtime.
3. **Angka teoretis UTF-16 (2 byte/karakter) adalah batas atas, bukan
   angka terukur.** Engine menyimpan string ASCII sebagai 1 byte/
   karakter; angka terukur untuk input ASCII adalah ~3,6–5,0 byte
   RSS per byte input. Untuk konten non-ASCII, biaya per karakter
   naik menuju 2 byte/karakter — stress test staging harus memakai
   fixture non-ASCII (fixture H-RES-02 A/B/C) untuk mengukur
   worst-case, bukan hanya ASCII.
4. **Alternatif incremental menurunkan peak secara material** (~4,5–
   5,4× lebih rendah pada kasus batas ini) dan tetap mendeteksi sinyal
   yang sama — tetapi ini BUKTI VM atas pola simulasi, BUKAN bukti
   implementasi; implementasi tetap menunggu tahap (b) + otorisasi.

## Kesimpulan desain (mengikat v2.3.14)

1. **L2 DINYATAKAN sebagai input-body budget, BUKAN peak-memory
   budget.** Pernyataan "aggregate 1.000.000 byte" di v2.3.13 kini
   dibaca: jumlah decoded-body byte halaman + script yang diterima
   per scan ≤ 1.000.000. Peak memory per scan TIDAK dibatasi oleh
   L2 dan harus diukur/diuji terpisah.
2. **Aturan desain baru (menunggu implementasi tahap b):**
   - **LARANGAN materialisasi bersamaan:** implementasi TIDAK BOLEH
     menahan `html` + `scriptTexts` + `scriptText` (join) +
     `haystack` + `lower` secara bersamaan pada jalur analisis.
   - **Pemindaian incremental:** tiap segmen (halaman, tiap script)
     diperiksa sendiri-sendiri; lowercase hanya per segmen dan
     dilepas sebelum segmen berikutnya; sinyal dikumpulkan sebagai
     boolean/ringkasan, bukan sebagai string gabungan.
   - **Pengecualian yang diizinkan:** tidak ada — bila suatu sinyal
     membutuhkan konteks lintas segmen, desain sinyal itu harus
     ditulis ulang sebagai pemeriksaan per segmen + agregasi
     boolean, bukan sebagai penggabungan string.
3. **Stress test H-RES-05 diperbarui (staging):** fixture halaman
   400.000 + 2 script 300.000 (tepat 1.000.000 byte) DAN varian
   non-ASCII (fixture H-RES-02 A/B/C sebagai konten script), pada
   concurrency scan yang disepakati; acceptance = high-water **RSS**
   (bukan `heapUsed` saja) ≤ ambang operasional yang ditetapkan
   SEBELUM tes oleh staging operator — ambang itu sendiri adalah
   prasyarat tes, bukan hasil tes. Sampai ambang ditetapkan dan tes
   lolos, peak-memory per scan tetap NOT VERIFIED.
4. **Batas memori proses (cgroup/limit) tetap menjadi lapisan
   pertahanan yang disyaratkan** bila peak memory adalah requirement
   (lihat F-026) — L2 saja tidak cukup.

## SHA-256

| File | SHA-256 |
| --- | --- |
| `exp-derived.ts` | `6b8a63530e5409bd200db592f7d568600a095b4a3d321de66bad2149408c43b4` |
| `run-1310-derived.txt` | `d37b36306ea4d42991a06f8d8ff32b25f340dc9a04bf2409bd8ddc481aa48fa1` |
| `run-144-derived.txt` | `341b41a76a8b2829d79768fcc6ae9132c8e46f47613fb41b9f6d1a992080548e` |

## Batasan (dicatat jujur)

- Input uji ASCII; worst-case non-ASCII (2 byte/karakter UTF-16)
  tidak diukur di sini — staging harus memakai fixture H-RES-02.
- Pengukuran satu run per versi; angka RSS mencakup overhead
  allocator dan dapat bervariasi antar run (pada 1.4.4, A5 RSS
  +4.325.376 pada run kedua vs +4.063.232 pada run pertama).
- `Bun.gc(true)` dipakai antar langkah; tanpa GC eksplisit, angka
  peak dapat lebih tinggi — staging harus mencatat apakah GC
  dipaksa atau tidak.
- Bagian B membangun segmen secara lazy (streaming model); bila
  implementasi nyata tetap menahan semua segmen sebelum memindai,
  keuntungan incremental hilang — karena itu larangan
  materialisasi bersamaan adalah aturan desain, bukan optimasi
  opsional.
