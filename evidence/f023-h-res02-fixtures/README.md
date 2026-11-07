# Bukti H-RES-02 — Fixture UTF-8 yang feasible (F-023)

**Revisi:** v2.3.13 — jawaban atas audit independen V6 (F-023)
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN EVIDENCE (fixture + hitungan terverifikasi) — BUKAN hasil tes staging.
Harness H-RES-02 sendiri BELUM dijalankan (butuh implementasi tahap (b) + staging).

## Yang diperbaiki

H-RES-02 v2.3.12 meminta fixture dua arah, salah satunya MUSTAHIL:
konten berbahaya "setelah 300.000 UTF-16 code unit tetapi sebelum
300.000 raw byte UTF-8". Untuk setiap urutan skalar Unicode yang valid,
panjang byte UTF-8 SELALU ≥ jumlah UTF-16 code unit (ASCII 1 byte = 1 CU;
BMP non-ASCII 2–3 byte = 1 CU; supplementary 4 byte = 2 CU). String dengan
>300.000 CU tetapi <300.000 byte tidak dapat dibuat. Arah itu DIHAPUS
di v2.3.13. Yang tersisa hanya arah yang feasible: marker SETELAH batas
300.000 byte tetapi SEBELUM batas 300.000 code unit — arah inilah yang
membedakan oracle byte dari oracle `string.length`.

## Fixture (marker: `XSS-MARKER-RES02`, 16 karakter ASCII = 16 byte = 16 CU)

Setiap fixture = PREFIX × karakter uji + MARKER + 1 × karakter uji.
Marker diletakkan tepat pada offset byte 300.000 (batas cap).
Cap H-RES-02: **300.000 decoded-body byte**.

| Fixture | Karakter | Prefix | Total char | Code point | UTF-16 CU | UTF-8 byte | Marker offset byte | Marker offset CU |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `h-res-02-a-e9.txt` | U+00E9 (é, 2 byte / 1 CU) | 150.000 | 150.001 | 150.017 | 150.017 | **300.018** | **300.000** | 150.000 |
| `h-res-02-b-grinning-face.txt` | U+1F600 (😀, 4 byte / 2 CU, supplementary plane) | 75.000 | 75.001 | 75.017 | 150.018 | **300.020** | **300.000** | 150.000 |
| `h-res-02-c-euro.txt` | U+20AC (€, 3 byte / 1 CU) | 100.000 | 100.001 | 100.017 | 100.017 | **300.019** | **300.000** | 100.000 |

## Verifikasi hitungan (dua alat independen, hasil cocok persis)

- Python 3.12.3: `len(payload.encode("utf-8"))` untuk byte,
  `len(payload.encode("utf-16-le")) // 2` untuk code unit.
- Node.js v24.22.1: `Buffer.byteLength(s, "utf8")` untuk byte,
  `s.length` (JS string = UTF-16 code unit) untuk CU,
  `Buffer.byteLength(s.slice(0, s.indexOf(marker)), "utf8")` untuk
  offset byte marker.
- `wc -c`: 300018 / 300020 / 300019 — cocok dengan Python dan Node.

## SHA-256 fixture

| File | SHA-256 |
| --- | --- |
| `h-res-02-a-e9.txt` | `dda664cba78a3fa77acca69b9082df7928c4a9851df525c7906948a1f935b496` |
| `h-res-02-b-grinning-face.txt` | `4e78301a403aeb506efc7f6b47b97eccadd7bbe467404d54774c9ce0647c58f2` |
| `h-res-02-c-euro.txt` | `68f5b7189a8541327df539f5253b6cea992e1786914ad4222134b203463c3a91` |

## Verdict yang diharapkan (H-RES-02)

- Implementasi byte-cap yang benar (cap 300.000 decoded-body byte,
  pre-append accounting): marker TIDAK ADA dalam konten yang dianalisis
  — marker mulai tepat pada byte ke-300.000, yaitu pada/di luar batas.
- Implementasi berbasis `string.length` (cap 300.000 code unit):
  SEMUA fixture lolos utuh (total CU 100.017–150.018 < 300.000) sehingga
  marker HADIR — implementasi itu FAIL pada H-RES-02.
- Ketiga fixture mencakup ketiga kelas multibyte UTF-8 (2, 3, dan
  4 byte); fixture B secara khusus menguji supplementary plane
  (surrogate pair = 2 CU, 4 byte).

## Batasan

- Fixture ini adalah INPUT tes, bukan hasil tes. H-RES-02 baru PASS bila
  harness staging menjalankannya terhadap implementasi tahap (b) dan
  mencatat raw output.
- Marker `XSS-MARKER-RES02` adalah string deteksi sintetis, bukan
  payload eksploitasi nyata.
