# Bukti F-026 — Chunk accounting, in-flight behaviour, peak memory (Bun 1.3.10 + 1.4.4)

**Revisi:** v2.3.14 — jawaban atas audit independen V7 (F-026)
**Tanggal:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Server dan klien keduanya di `127.0.0.1`; tidak ada jaringan eksternal,
tidak ada artifact live, `checkLink` TIDAK di-invoke, tidak ada state
runtime yang diubah.

## Pertanyaan (F-026)

Pre-append accounting mencegah chunk yang melewati cap ditambahkan ke
buffer akumulasi aplikasi — tetapi apakah itu juga membatasi memori
transient? Chunk sudah dialokasikan saat `reader.read()` mengembalikannya,
SEBELUM aplikasi dapat memeriksa `value.length`. Audit V7 mencatat chunk
pertama 393.110 byte pada kontrol plain v2.3.13 — lebih besar dari cap
script 300.000 byte. Eksperimen ini mengukur ukuran chunk maksimum,
perilaku in-flight pada 3 fetch paralel, dan peak RSS/heap pada **Bun
1.3.10 (kanonik, yang dideklarasikan `packageManager`)** dan Bun 1.4.4.

## Metode

- `exp-chunk.ts`: server lokal `127.0.0.1` menyajikan `/plain500k`
  (500.000 byte), `/plain1m` (1.000.000 byte), dan `/stream64k`
  (500.000 byte, server me-enqueue potongan 64 KiB lewat `ReadableStream`
  — untuk menguji apakah chunking sisi server membatasi ukuran chunk
  sisi klien).
- Klien memakai aturan desain v2.3.13: pre-append accounting, cap
  per-request (halaman 400.000, script 300.000), satu shared budget L2
  1.000.000 dengan satu `AbortController` bersama.
- Probe: **P1** satu fetch `/plain500k` cap 300.000; **P2** tiga fetch
  paralel `/plain500k` cap 300.000 + L2 bersama; **P2b** tiga fetch
  paralel `/stream64k` cap 300.000 + L2 bersama; **P3** satu fetch
  `/plain1m` cap 400.000; **P4** satu fetch `/stream64k` cap 300.000.
- Memori: `process.memoryUsage()` di-sampling setiap chunk; peak RSS /
  heapUsed / external dicatat. `Bun.gc(true)` sebelum tiap probe.
- Dijalankan dua kali: Bun 1.3.10 (`/tmp/bun1310/bun-linux-x64/bun`,
  diunduh dari rilis resmi oven-sh/bun `bun-v1.3.10`, revisi
  `1.3.10+30e609e08`) dan Bun 1.4.4 (`/opt/hatch-image/bin/bun`).
- Log mentah: `run-1310-chunk.txt`, `run-144-chunk.txt`.
- Bonus di paket ini (lingkungan berubah = versi Bun, jadi pengulangan
  ini dibenarkan protokol — bukan pengulangan tanpa alasan): skrip
  F-024 v2.3.13 (`exp-gzip.ts`, `exp-br.ts`) dijalankan ulang TANPA
  perubahan di bawah Bun 1.3.10 — log `run-1310-gzip-rerun.txt`,
  `run-1310-br-rerun.txt`. Ini menjawab bagian VM dari risiko U-62
  (perilaku dekompresi pada kanonik 1.3.10).

## Hasil

### Chunk maksimum dan accepted bytes

| Probe | Bun 1.3.10 — chunk yang diamati | Accepted | Bun 1.4.4 — chunk yang diamati | Accepted |
| --- | --- | --- | --- | --- |
| P1 `/plain500k` cap 300.000 | `[16384, 483616]` — max **483.616** | 16.384 | `[65430, 95232, 131072, 131072]` — max 131.072 | 291.734 |
| P2 3× paralel `/plain500k` cap 300.000 + L2 | r0 `[16384, 483616]`; r1/r2 fetch ter-abort sebelum chunk pertama | total 16.384 | r0 `[65377, 130966, 131072]`; r1/r2 ter-abort sebelum chunk pertama | total 196.343 |
| P2b 3× paralel `/stream64k` cap 300.000 + L2 | r0 `[262144, 237856]`; r1/r2 0 chunk (body kosong setelah abort bersama) | total 262.144 | r0 `[262144]`; r1 `[327680]`; r2 ter-abort sebelum chunk pertama | total 262.144 |
| P3 `/plain1m` cap 400.000 | `[528384]` — **satu chunk 528.384 > cap 400.000** | 0 | `[392791, 262144]` | 392.791 |
| P4 `/stream64k` cap 300.000 | `[500000]` — **seluruh body dalam satu chunk** | 0 | `[262144, 237856]` | 262.144 |

### Temuan

1. **Chunk dapat melebihi cap berapa pun.** Max chunk teramati: 528.384
   byte (1.3.10, P3) dan 500.000 byte — seluruh body dalam satu chunk
   (1.3.10, P4). Pre-append accounting bekerja (accepted selalu ≤ cap),
   tetapi TIDAK mencegah alokasi transient chunk itu sendiri.
2. **Ukuran chunk tidak deterministik dan bergantung versi.** Pada
   1.3.10 max chunk 483.616–528.384; pada 1.4.4 max 131.072–392.791
   untuk body yang sama. Run pendahuluan 1.3.10 (sebelum perbaikan
   penanganan AbortError — log tidak dipertahankan, hanya rerun yang
   disimpan) menunjukkan split berbeda lagi (satu chunk 500.000 untuk
   `/plain500k`). **Tidak ada batas ukuran chunk tetap yang aman
   diasumsikan** — batas harus dinyatakan sebagai "hingga seluruh body"
   kecuali runtime membuktikan sebaliknya.
3. **Chunking sisi server TIDAK membatasi chunk sisi klien.** Server
   me-enqueue 64 KiB, klien 1.3.10 tetap menerima satu chunk 500.000
   byte (P4). BYOB/fixed-size reads belum dibuktikan pada Bun mana
   pun — tetap NOT VERIFIED.
4. **Shared abort membatalkan sibling dengan cepat di loopback, tetapi
   itu balapan, bukan jaminan.** Pada P2/P2b, reader yang lain
   ter-abort sebelum chunk pertama (atau menerima body kosong). Pada
   loopback abort menang atas chunk berikutnya; pada jaringan lambat /
   runtime staging, beberapa chunk besar dapat mendarat sebelum abort
   diproses — tidak ada angka in-flight maksimum yang dapat diklaim
   dari eksperimen loopback ini. Batas in-flight karena itu dinyatakan
   sebagai worst-case (lihat kesimpulan desain), bukan sebagai angka
   terukur loopback.
5. **RSS adalah metrik yang benar; `heapUsed` saja menyesatkan.**
   Body bytes hidup sebagai `Uint8Array`/external, bukan JS heap:
   pada 1.3.10 peak RSS mencapai 65.044.480 (P4) dari baseline ~50 MB,
   sementara `heapUsed` tetap ~1,8–2,3 MB. Pada 1.4.4 peak RSS
   26–33 MB dari baseline ~26 MB. **Pengukuran memori wajib memakai
   RSS + external, bukan `heapUsed` saja.**
6. **Accepted/retained bound TERBUKTI di kedua versi** (accepted
   selalu ≤ cap per-request dan ≤ L2). Yang TIDAK terbukti adalah
   batas peak-memory proses — lihat kesimpulan desain.

### Re-run F-024 di bawah Bun 1.3.10 (U-62, bagian VM)

| Pengamatan | gzip (1.3.10) | br (1.3.10) |
| --- | --- | --- |
| Wire byte | 551 | 51 |
| Decoded byte dari `Response.body` | **500.000** | **500.000** |
| Marker pada offset 400.000 | ya | ya |
| `Content-Length` header | 551 | 51 |
| Chunk terbesar | 16.384 (run ini; bervariasi antar run) | **483.616** |

Perilaku dekompresi transparan Bun **TERKONFIRMASI pada kanonik
1.3.10** (gzip DAN br) — bagian VM dari U-62 kini terjawab. Yang
tetap NOT VERIFIED: perilaku di runtime artifact staging/produksi,
dan `deflate`/`zstd`.

## Kesimpulan desain (mengikat v2.3.14)

1. **Klaim "overhead 0 byte" v2.3.13 DICABUT sebagai pernyataan umum**
   dan DIBATASI hanya pada **accepted/retained bytes di accumulator
   yang dikendalikan aplikasi** (terbukti ≤ cap pada kedua versi Bun).
   Klaim itu TIDAK BOLEH dibaca sebagai "peak-memory overhead nol".
2. **Dua anggaran dipisah secara eksplisit:**
   - **A1 — accepted/retained decoded bytes** (accumulator aplikasi):
     halaman ≤ 400.000, tiap script ≤ 300.000, aggregate L2 ≤ 1.000.000
     — ditegakkan pre-append, terbukti VM.
   - **A2 — transient chunk / in-flight memory** (alokasi runtime
     sebelum pemeriksaan aplikasi): worst-case per chunk = **seluruh
     body** (teramati 528.384 byte untuk body 1.000.000); worst-case
     simultan = jumlah max-chunk semua reader yang masih berjalan
     sebelum abort bersama diproses. **Tidak ada angka A2 yang
     dijamin** tanpa batas chunk runtime / BYOB / limit proses.
3. **Batas yang ditetapkan v2.3.14 (desain, menunggu staging):**
   max chunk yang diasumsikan = ukuran body penuh; concurrency
   reader = max 3 script + 1 halaman (4 reader); bila peak memory
   adalah requirement, wajib ada limit proses/cgroup + pengukuran
   high-water RSS pada concurrency maksimum di staging Bun 1.3.10
   (tes H-RES-03/H-RES-05 yang diperbarui — lihat §D.4.25 desain).
4. **BYOB / fixed-size reads:** dukungan pada Bun 1.3.10 dan runtime
   staging NOT VERIFIED — jangan diasumsikan tersedia.

## SHA-256

| File | SHA-256 |
| --- | --- |
| `exp-chunk.ts` | `cafc3cb3fb1d904ee83707fd514566e9668665e3063f871bf8f0a64f7d5e95c4` |
| `run-1310-chunk.txt` | `879de437ceb7cd0e5ab4db8f2bbae8b6822912e0f53791cd09d3319b172997e5` |
| `run-144-chunk.txt` | `239a692acdf248aa72c6b880dc61f902ccf6523d873b388cb250ac0ab2dae344` |
| `run-1310-gzip-rerun.txt` | `9c729f4e4fe7528df8e7dfbdc769d2eb24296ca3a0133a784b43452ac861eeb1` |
| `run-1310-br-rerun.txt` | `aeb6b1379bc57eb444bb9c2758b6ede793e120a4bd31ef8e54420ee39d8430fb` |

## Batasan (dicatat jujur)

- Chunking loopback tidak mewakili jaringan nyata; angka in-flight
  simultan maksimum TIDAK dapat diklaim dari eksperimen ini — hanya
  worst-case analitis (seluruh body per reader) yang dinyatakan.
- `Bun.gc(true)` dipakai sebelum tiap probe; angka RSS mencakup
  overhead runtime (baseline 1.3.10 ~50 MB vs 1.4.4 ~26 MB — selisih
  baseline antar versi, bukan efek eksperimen).
- Sibling reader yang menerima 0 chunk setelah shared abort (P2b
  1.3.10) adalah perilaku runtime yang teramati, bukan perilaku yang
  dijanjikan desain — staging harus mencatat perilaku ini bila
  relevan, bukan mengandalkannya.
- Tidak ada `deflate`/`zstd` yang diuji; H-RES-03 staging harus
  mencakup gzip DAN br (minimal).
