# Bukti H-RES-03 — Perilaku Bun `Response.body` untuk gzip/br (F-024)

**Revisi:** v2.3.13 — jawaban atas audit independen V6 (F-024)
**Tanggal:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Server dan klien keduanya di `127.0.0.1`; tidak ada jaringan eksternal,
tidak ada artifact live, `checkLink` TIDAK di-invoke, tidak ada state
runtime yang diubah.

## Pertanyaan

Apakah `Response.body` pada Bun `fetch` mengekspos byte terkompresi
(wire) atau byte yang sudah didekompresi secara transparan? Jawabannya
menentukan lapisan mana yang dapat di-cap oleh implementasi — dan
apakah klaim "wire-byte cap" dapat ditegakkan di lapisan aplikasi.

## Metode

- `exp-gzip.ts`: server lokal menyajikan payload 500.000 byte
  (`'A'` × 500.000, marker `DECOMPRESSED-MARKER-HRES03` pada offset
  400.000) sebagai gzip (551 byte wire, `Content-Encoding: gzip`,
  `Content-Length: 551`). Klien Bun `fetch` default, lalu membaca
  `Response.body` lewat `getReader()` chunk demi chunk dan menghitung
  byte. Diulang dengan header eksplisit `Accept-Encoding: identity`
  (server eksperimen ini tetap menjawab gzip — lihat batasan) dan
  kontrol `/plain` tanpa kompresi.
- `exp-br.ts`: hal yang sama dengan Brotli (51 byte wire,
  marker `DECOMPRESSED-MARKER-HRES03-BR` pada offset 400.000).
- Log mentah: `run1-gzip.txt`, `run2-br.txt`.

## Hasil (Bun 1.4.4, VM lokal, 2026-11-08)

| Pengamatan | gzip | br |
| --- | --- | --- |
| Wire byte (terkompresi) | 551 | 51 |
| Decoded byte | 500.000 | 500.000 |
| Total byte dibaca dari `Response.body` | **500.000** | **500.000** |
| `Content-Length` header | 551 | 51 |
| Marker hadir pada offset yang dibaca | ya, offset 400.000 | ya, offset 400.000 |
| Chunk pertama / chunk terbesar yang diamati | 16.384 byte | 262.144 byte |
| Jumlah chunk | 2 | 2 |

Temuan tambahan:

- `fetch` default Bun mengirim
  `Accept-Encoding: gzip, deflate, br, zstd` (terlihat di log server).
- Dengan `Accept-Encoding: identity` yang diminta klien, server
  eksperimen tetap menjawab gzip dan Bun tetap mendekompresi
  (`Response.body` = 500.000 byte). Dekompresi mengikuti
  `Content-Encoding` respons, bukan header permintaan.
- Kontrol `/plain`: `Response.body` = 500.000 byte, chunk pertama
  393.110 byte — satu chunk dapat jauh melebihi cap per-request.
  Karena itu penegakan cap HARUS pre-append (periksa
  counter + panjang chunk SEBELUM append); append-then-check dapat
  melampaui cap hingga satu chunk penuh (±393 KB pada pengamatan ini).

## Kesimpulan desain (mengikat v2.3.13)

1. **Lapisan wire/encoded (L0): TIDAK dapat diobservasi** melalui
   `Response.body` di Bun — body hanya mengekspos byte yang sudah
   didekompresi. Tidak ada wire-byte cap yang diklaim di lapisan
   aplikasi. Transfer wire hanya dibatasi oleh egress limit
   infrastruktur (belum didefinisikan — staging operator UNASSIGNED).
   Wire cap pun tidak akan melindungi memori dari decompression bomb
   (51 byte wire → 500.000 byte decoded).
2. **Lapisan decoded-body (L1, ditegakkan):** cap per-request
   (halaman 400.000, tiap script 300.000 decoded byte) dihitung dari
   `value.length` tiap chunk `Response.body`, SEBELUM decoding teks,
   dengan pre-append accounting (buffered ≤ cap, overhead 0 di luar
   cap pada lapisan aplikasi).
3. **Lapisan aggregate per-scan (L2, ditegakkan):** 1.000.000 decoded
   byte bersama untuk halaman + semua script — lihat H-RES-05
   (v2.3.13).
4. **`Content-Length` TIDAK BOLEH dipakai sebagai oracle** — nilainya
   adalah ukuran terkompresi (551 / 51) sementara body yang dibaca
   adalah 500.000 byte.
5. **Lapisan dekompresi yang dikontrol aplikasi** (lapis 3 pada
   klasifikasi audit) TIDAK ADA dalam desain ini — implementasi tidak
   melakukan dekompresi sendiri; dekompresi dilakukan transparan oleh
   runtime Bun.

## SHA-256

| File | SHA-256 |
| --- | --- |
| `exp-gzip.ts` | `2ced6a7decab849d12a1f87b84ded0b159328accfdc6d9c42e4e8e079f8c2017` |
| `exp-br.ts` | `4576710d67bf50c605f8aa3a3902eff3efc0da64386f99f638268d4e7ee71be1` |
| `run1-gzip.txt` | `56d0a4b66ca641e92d049305414454895053cd167112066aa57906f489bda2b7` |
| `run2-br.txt` | `80cd6af908bf9e57c2b4c7e5cc82628e96ebdfa51b04bd2973ab5954343f4bb8` |

## Batasan (dicatat jujur)

- Bun yang dipakai eksperimen adalah **1.4.4** (yang tersedia di VM
  ini). Versi kanonik yang dideklarasikan adalah **1.3.10**
  (`packageManager` di `site/package.json`). Perilaku dekompresi
  pada 1.3.10 **NOT VERIFIED** — wajib diverifikasi ulang di staging
  pada versi kanonik sebelum H-RES-03 dapat PASS (risiko U-62).
- Eksperimen ini membuktikan lapisan byte yang diekspos `Response.body`,
  BUKAN bahwa implementasi cap sudah ada — implementasi masih menunggu
  tahap (b) + otorisasi owner.
- Server eksperimen pada probe `identity` mengabaikan header permintaan
  dan tetap menjawab gzip; yang terbukti adalah Bun mendekompresi
  berdasarkan `Content-Encoding` respons. Server staging H-RES-03
  harus menghormati `Accept-Encoding` agar varian identity teruji
  dengan benar.
- Tidak ada `deflate`/`zstd` yang diuji di VM ini; H-RES-03 staging
  harus mencakup gzip DAN br (minimal), dan mencatat perilaku
  `deflate`/`zstd` bila runtime mengiklankannya.
