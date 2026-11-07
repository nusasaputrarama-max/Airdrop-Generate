# MANIFEST — Bukti Suplemen v2.3.6 (v2.3.9)

**Direktori:** `evidence/v236-supplement-20261108/`
**Tanggal run:** 2026-11-08 WIB (2026-11-07 17:29–17:30 UTC)
**Harness commit:** `fc798ce` (v2.3.6 — file harness tidak berubah sejak commit itu;
`git log -- spike-harness-v236/` berhenti di `fc798ce`)
**Host/VM:** `htch-runtime`
**Kernel:** Linux 7.0.0-43-generic x86_64
**Arsitektur:** x86_64
**Runtime:** Node v24.22.1; Bun 1.4.4 (dipakai `ops-recovery.cjs` untuk holder flock via `bun`)
**Python:** 3.12.3 (tidak dipakai run ini)

## Status dokumen ini

Bundle ini adalah **bukti SUPLEMEN BARU** — BUKAN pengganti `evidence/v236/`
dan BUKAN rekonstruksi log lama. File-file di `evidence/v236/` TIDAK diubah
dan TIDAK diganti. Klaim v2.3.6 ("SU-T1..T9 9/9 × 4", "OPS-T7 PASS × 3")
tetap bersandar pada bukti aslinya; klaim itu TIDAK diubah oleh bundle ini.

Yang bundle ini tutup (celah F-007 yang dicatat di v2.3.8):

1. `evidence/v236/su-run4.txt` hanya ekor 2 baris (194 byte) — log lengkap
   run ke-4 SU tidak tersimpan. Bundle ini berisi **4 run SU yang lengkap**
   (masing-masing 11 baris: header + 9 PASS + ringkasan 9/9).
2. OPS-T7 didokumentasikan "PASS × 3 run" tetapi hanya 2 log yang ada.
   Bundle ini berisi **run ketiga OPS-T7 yang lengkap** (5 baris, PASS).

## Justifikasi re-run (protokol handoff)

Protokol melarang re-run tes berbukti valid tanpa alasan teknis. Alasan di
sini adalah celah bukti nyata, bukan pengulangan: log run ke-4 SU yang
tersimpan tidak lengkap (ekor) dan log run ketiga OPS-T7 tidak ada sama
sekali. Run ini adalah run SUPLEMEN BARU dengan nomor run dan tanggal baru
— bukan klaim bahwa run lama "sebenarnya lengkap". Bila hasilnya berbeda
dari klaim lama, perbedaan itu akan dilaporkan apa adanya (tidak terjadi
di sini: semua run PASS dan `su-supp-run1.txt` byte-identik dengan
`evidence/v236/su-run1.txt`).

## Daftar run

| Test ID | Run | Timestamp UTC (mulai) | Command | Exit | Hasil | SHA-256 |
|---|---|---|---|---|---|---|
| SU-T1..SU-T9 | supp-1 | 2026-11-07T17:29:40Z | `node su-v232/run-tests.cjs 1` | 0 | 9/9 PASS | `a8bbf1bbc724cfe248712717888b6e6957b7c23dae591aabe29ef24cb15ca036` |
| SU-T1..SU-T9 | supp-2 | 2026-11-07T17:29:49Z | `node su-v232/run-tests.cjs 2` | 0 | 9/9 PASS | `b1249e85c8c9bf338be536641ad686b49db32999646a93bde66a13a9449756e3` |
| SU-T1..SU-T9 | supp-3 | 2026-11-07T17:29:57Z | `node su-v232/run-tests.cjs 3` | 0 | 9/9 PASS | `11a77ea6a1a3d04a486414f87839d81493e3aaac528b30e83a84b63f11613309` |
| SU-T1..SU-T9 | supp-4 | 2026-11-07T17:30:06Z | `node su-v232/run-tests.cjs 4` | 0 | 9/9 PASS | `c87f538268dcfc030b428eb585b0cd6cfeccda23028f859e4375889a9f45cf07` |
| OPS-T7 | supp-3 | 2026-11-07T17:30:15Z | `node ops-recovery.cjs` | 0 | PASS | `59b48de0b1d32d35e612f7a62b75b87adb4e59826d5d156f063d5cd5aa0dfe04` |

Perintah dijalankan dari `spike-harness-v236/`; output diarahkan langsung
ke file `.txt` di direktori ini (tanpa penyuntingan). Semua file `.txt`
dipilih agar tidak dikecualikan root `.gitignore` (`*.log`); verifikasi
`git check-ignore` 2026-11-08: direktori ini ter-track (bukan ignored).

## Verifikasi silang

- `su-supp-run1.txt` **byte-identik** dengan `evidence/v236/su-run1.txt`
  (`diff` exit 0) — run suplemen mereproduksi run lama secara persis.
- `ops-t7-supp-run3.txt` berbeda dari `evidence/v236/opsrec-run1.txt`
  HANYA pada nomor inode dan PID (`A.ino`/`B.ino`, `A.pid`/`B.pid`,
  `scan` fd) — nilai yang memang spesifik-per-proses; semua boolean
  (`twoOwners`, `detected`, `aStoodDown`, `bStillOwner`) identik.
- Tiap file SU berisi 11 baris lengkap (header `=== SUITE v2.3.2
  (RUN=n) ===` + 9 baris PASS + ringkasan `=== HASIL RUN=n: 9/9 PASS ===`);
  file OPS-T7 berisi 5 baris lengkap (T7a–T7d + ringkasan PASS).

## Yang tetap TIDAK dipulihkan (dicatat jujur)

- Percobaan gagal awal SU-T5 (8/9 × 3 run): tidak ada log mentah yang
  tersimpan — hanya diagnosis prose di `SSRF_SPIKE_V236.md` §0.1.
  NOT PRESERVED, tidak direkonstruksi.
- Log mentah v2.3.2/v2.3.3/v2.3.4/v2.3.5: hanya kutipan verbatim di
  dokumen spike — kutipan dokumen, bukan log mentah terverifikasi hash.
- Perintah shell eksak tiap run v2.3.6 asli: tidak tercatat di dokumen
  spike — NOT VERIFIED (file harness tercatat dan dapat dijalankan ulang,
  seperti yang dilakukan bundle ini).
