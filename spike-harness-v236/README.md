# spike-harness-v236 — Harness Uji v2.3.6

Harness eksperimen untuk revisi desain v2.3.6 (FINAL SECURITY REVIEW
FOLLOW-UP). Semua tes memakai kernel/proses nyata di VM ini, BUKAN mock.
Bukti lengkap: `../SSRF_SPIKE_V236.md`.

## Menjalankan ulang

```sh
python3 pidfd-tests.py        # PIDFD-T1..T7  — pidfd primitif (Python)
bun pidfd-bun.js              # PIDFD-T8      — pidfd via bun:ffi
node window-measure.cjs       # PIDFD-T9      — pengukuran jendela + kuantifikasi
python3 pidfd-dirfd-pin.py    # PIDFD-T10     — falsifikasi dirfd pinning (T10b diharapkan FAIL)
bun pidfd-t11.js              # PIDFD-T11     — urutan referensi signalWorkerByPidfd (Bun)
python3 pidfd-t12.py          # PIDFD-T12     — oracle urutan penuh di bawah reuse paksa
python3 ops-tests.py          # OPS-T1..T6    — kontrol permission/ownership/mount/audit
node ops-recovery.cjs         # OPS-T7        — pemulihan bila lock terhapus saat parent aktif
node su-v232/run-tests.cjs    # SU-T1..SU-T9  — re-run suite startup v2.3.2
```

## Catatan penting

- `pidfd-t12.py` menurunkan `pid_max` kernel sementara ke 8192 (lewat
  procfs baru — `/proc/sys` di VM ini read-only) dan **memulihkannya ke
  nilai semula di `finally`**. Jangan jalankan bersamaan dengan pekerjaan
  yang sensitif terhadap alokasi PID.
- `pidfd-dirfd-pin.py` T10b **diharapkan FAIL**: itu adalah falsifikasi
  (hipotesis dirfd pinning ditolak), bukan kegagalan suite.
- `su-v232/` adalah salinan LENGKAP runner v2.3.2 (termasuk
  `lock-racer.cjs` — tanpanya SU-T5 gagal `no-output`, lihat
  `SSRF_SPIKE_V236.md` §0.1).
- Semua file di sini adalah harness/implementasi referensi — BUKAN kode
  produksi. Kode live artifact TIDAK disentuh oleh revisi ini.
