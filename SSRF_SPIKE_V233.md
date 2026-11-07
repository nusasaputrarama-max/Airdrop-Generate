# Bukti Pengujian v2.3.3 — Rekonsiliasi Run, Reklamasi Lock yang Diperkeras, STARTUP-10, Durabilitas Pidfile

- **Tanggal:** 7 November 2026 — **Revisi v2.3.3** (klarifikasi atas §A.5.5.4 dan §A.5.5.3)
- **Status:** bukti implementasi referensi lokal di VM ini, **BUKAN** bukti keamanan runtime artifact produksi.
- **Hasil: 9/9 PASS (RUN=3 atas suite v2.3.2, asli) + 9/9 PASS × 2 (regresi SU-T1..SU-T9 terhadap kode yang diperkeras) + 8/8 PASS × 2 (tes baru RCL-T1..T6 + SU10-T1/T2).**
- **Lingkungan:** Node v24.22.1, Linux, root (uid 0), proses/komponen lokal di `/tmp/ssrf-v232` (RUN=3) dan `/tmp/ssrf-v233` (regresi + tes baru) yang dikontrol sendiri. Tidak ada pengujian ke metadata cloud atau jaringan internal produksi. Tidak ada kode artifact, database, atau production build yang diubah.
- **Harness:** disalin ke `spike-harness-v233/` di paket fondasi agar dapat dijalankan ulang (`startup.cjs` yang diperkeras, `run-tests.cjs` regresi, `run-reclaim-tests.cjs`, `lock-racer-v233.cjs`, `dns-worker.cjs`, `lock-racer.cjs`).

## §0. Rekonsiliasi jumlah pengujian — koreksi klaim "3×"

**Temuan:** pesan laporan pengiriman v2.3.2 menyebut "9/9 PASS dijalankan 3×".
Pemeriksaan berkas bukti menunjukkan klaim itu **tidak didukung** pada saat
disampaikan: `SSRF_SPIKE_V232.md` hanya mendokumentasikan RUN=1 dan RUN=2
(header dan §2-nya sendiri menulis "dijalankan ulang 2×"), dan di
`/tmp/ssrf-v232` hanya ada `run1.log` dan `run2.log` (diff keduanya
identik modulo header). Dokumen desain v2.3.2 juga menulis 2× (baris
header dan tabel changelog) — jadi yang salah adalah **pesan laporan**,
bukan dokumen atau berkas bukti.

**Perbaikan:** RUN=3 yang sesungguhnya dijalankan selama revisi v2.3.3
(7 Nov 2026, perintah `cd /tmp/ssrf-v232 && node run-tests.cjs 3`,
output tersimpan di `/tmp/ssrf-v232/run3.log` dan dikutip verbatim di
bawah). Setelah RUN=3 ini, klaim "3×" menjadi benar dengan 3 output
terdokumentasi (RUN=1, RUN=2, RUN=3). Seluruh klaim jumlah run di
dokumen desain diperbarui dari 2× menjadi 3× untuk suite SU-T1..SU-T9,
dengan rujukan ke bagian ini.

### Output aktual RUN=3 (verbatim, dari `/tmp/ssrf-v232/run3.log`)

```text
=== SUITE v2.3.2 (RUN=3) Node v24.22.1 ===
PASS SU-T1 :: state=NOT_READY path=attempts-exhausted-unconfirmed sigsSent=3 rejections=2 workerMasihHidup=true
PASS SU-T2 :: state=NOT_READY path=identity-failed reason=starttime-mismatch sigsSent=0 page=1 decoyHidup=true
PASS SU-T3 :: state=READY path=exit-confirmed attemptsUsed=1 lookupOk=true workerHidup=false
PASS SU-T4 :: setelahRace ok=true token=tok-19 setelahCrash ok=true tokenSama=true
PASS SU-T5 :: pemenang=1 kalah=4 alasanKalah=held-by-live-holder
PASS SU-T6 :: pertama=true kedua=true direklamasi=true
PASS SU-T7 :: state=READY path=worker-already-dead sigsSent=0
PASS SU-T8 :: matiSebelumCleanup=true state=READY path=worker-already-dead sigsSent=0
PASS SU-T9 :: rusak: state=NOT_READY path=pidfile-corrupt | parsial: state=NOT_READY path=pidfile-corrupt | hilang: state=READY path=no-pidfile | sigsSent=0 page=2
=== HASIL RUN=3: 9/9 PASS ===
```

Diff RUN=3 terhadap RUN=1: identik modulo header (`RUN=1` vs `RUN=3`);
token SU-T4 (`tok-19`) sama pada ketiga run — token bersifat arbitrer
(penulis terakhir yang memenangkan balapan rename); yang diuji adalah
file selalu berisi SATU record lengkap yang valid.

## 1. Ringkasan hasil

| Suite | Tes | Hasil RUN=1 | Hasil RUN=2 | Hasil RUN=3 |
| --- | --- | --- | --- | --- |
| v2.3.2 asli (`/tmp/ssrf-v232`) | SU-T1..SU-T9 | 9/9 PASS (sudah ada) | 9/9 PASS (sudah ada) | **9/9 PASS (baru, §0)** |
| v2.3.3 regresi (`/tmp/ssrf-v233`, kode diperkeras) | SU-T1..SU-T9 | 9/9 PASS | 9/9 PASS | — |
| v2.3.3 baru (`/tmp/ssrf-v233`) | RCL-T1..T6 + SU10-T1/T2 | 8/8 PASS | 8/8 PASS | — |

Perintah:

```bash
cd /tmp/ssrf-v232 && node run-tests.cjs 3
cd /tmp/ssrf-v233 && node run-tests.cjs 1
cd /tmp/ssrf-v233 && node run-tests.cjs 2
cd /tmp/ssrf-v233 && node run-reclaim-tests.cjs 1
cd /tmp/ssrf-v233 && node run-reclaim-tests.cjs 2
```

## 2. Output aktual

### 2a. Regresi SU-T1..SU-T9 terhadap `startup.cjs` yang diperkeras (RUN=1)

```text
=== SUITE v2.3.3-REGRESI (RUN=1) Node v24.22.1 ===
PASS SU-T1 :: state=NOT_READY path=attempts-exhausted-unconfirmed sigsSent=3 rejections=2 workerMasihHidup=true
PASS SU-T2 :: state=NOT_READY path=identity-failed reason=starttime-mismatch sigsSent=0 page=1 decoyHidup=true
PASS SU-T3 :: state=READY path=exit-confirmed attemptsUsed=1 lookupOk=true workerHidup=false
PASS SU-T4 :: setelahRace ok=true token=tok-19 setelahCrash ok=true tokenSama=true
PASS SU-T5 :: pemenang=1 kalah=4 alasanKalah=held-by-live-holder
PASS SU-T6 :: pertama=true kedua=true direklamasi=true
PASS SU-T7 :: state=READY path=worker-already-dead sigsSent=0
PASS SU-T8 :: matiSebelumCleanup=true state=READY path=worker-already-dead sigsSent=0
PASS SU-T9 :: rusak: state=NOT_READY path=pidfile-corrupt | parsial: state=NOT_READY path=pidfile-corrupt | hilang: state=READY path=no-pidfile | sigsSent=0 page=2
=== HASIL RUN=1: 9/9 PASS ===
```

RUN=2 regresi: identik modulo header (diff diverifikasi: hanya nomor run
yang berbeda). Membuktikan pengetatan reklamasi tidak merusak perilaku
startup yang sudah teruji — SU-T6 (pemegang lock mati → reklamasi) tetap
lolos karena jalurnya adalah ESRCH, bukan heartbeat basi.

### 2b. Tes baru reklamasi + STARTUP-10 (RUN=1)

```text
=== SUITE v2.3.3-RECLAIM (RUN=1) Node v24.22.1 ===
PASS RCL-T1 :: reason=held-by-live-holder lockUtuh=true holderHidup=true heartbeatBasi=60dtk
PASS RCL-T2 :: reason=holder-unverifiable detail=probe-threw:EPERM page=true lockUtuh=true
PASS RCL-T3 :: reason=holder-unverifiable detail=stat-unreadable page=true lockUtuh=true
PASS RCL-T4 :: acquired=true reclaimed=true ownershipVerified=true
PASS RCL-T5 :: reason=lock-unreadable page=true lockUtuh=true
PASS RCL-T6 :: reason=holder-identity-mismatch page=true lockUtuh=true decoyHidup=true
PASS SU10-T1 :: pemenang=1 reclaimed=true ownershipVerified=true alasanKalah=held-by-live-holder cleanupCalls=0 lockOwnerOk=true
PASS SU10-T2 :: pemenang=0 semuaHeld=true cleanupCalls=0 holderHidup=true
=== HASIL RUN=1: 8/8 PASS ===
```

RUN=2 tes baru: identik modulo header (diff diverifikasi: hanya nomor run
yang berbeda).

## 3. Apa yang dibuktikan tiap uji baru (dan apa yang TIDAK)

**RCL-T1 — heartbeat basi BUKAN bukti kematian (perubahan perilaku inti
v2.3.3).** Holder hidup (`sleep`, PID nyata) dengan `heartbeatAt` 60 dtk
yang lalu: `acquireStartupLock` mengembalikan `held-by-live-holder`,
file lock **utuh byte-demi-byte** (dibandingkan sebelum/sesudah), holder
tetap hidup. Di bawah aturan v2.3.2 (`!alive || heartbeatStale` → hapus),
lock ini AKAN dihapus. Membuktikan pengetatan diterapkan pada jalur
keputusan, bukan hanya di dokumen.

**RCL-T2 — EPERM.** Probe disuntikkan untuk melempar error `EPERM`
(mensimulasikan `kill(pid, 0)` terhadap proses milik pengguna lain —
tidak dapat diproduksi langsung karena tes berjalan sebagai root, uid 0,
sehingga EPERM nyata tidak pernah terjadi di sini; hal ini dinyatakan,
bukan disembunyikan). Hasil: `holder-unverifiable`, `page=true`, lock
utuh. Membuktikan pemetaan error EPERM → fail-closed, bukan
penghapusan.

**RCL-T3 — error probe lain.** Probe mengembalikan
`{ status: 'uncertain', reason: 'stat-unreadable' }` (mensimulasikan
`/proc` tidak terbaca): hasil sama — `holder-unverifiable`, `page=true`,
lock utuh.

**RCL-T4 — ESRCH.** Probe mengembalikan `{ status: 'dead', proof:
'esrch' }`: reklamasi berjalan (`acquired=true`, `reclaimed=true`,
`ownershipVerified=true`). Membuktikan jalur hapus yang sah (satu-satunya
jalur hapus yang tersisa) masih bekerja.

**RCL-T5 — lock tidak terbaca.** Isi lock berupa JSON terpotong dengan
mtime segar: `lock-unreadable`, `page=true`, file **tetap ada dengan isi
yang sama**. Di bawah aturan v2.3.2, lock ini baru dihapus bila mtime
> 30 dtk — aturan itu DIHAPUS v2.3.3: tidak ada penghapusan otomatis
untuk lock yang identitas pemegangnya tidak diketahui, berapa pun usianya.

**RCL-T6 — PID reuse (aturan ketat).** PID hidup dengan starttime yang
diklaim digeser +12345: `holder-identity-mismatch`, `page=true`, lock
utuh, decoy tetap hidup. Membuktikan aturan ketat v2.3.3: angka PID yang
hidup berarti JANGAN hapus, meskipun starttime membuktikan instans
pemegang sudah mati — biaya aturan ini (startup macet sampai intervensi
operator pada kasus PID reuse yang jarang) dicatat sebagai risiko baru
U-26 di dokumen desain.

**SU10-T1 — STARTUP-10 (reklamasi lock basi bersamaan).** Lock basi
(holder PID 999999 mati + heartbeat basi), 5 proses nyata berlomba
mereklamasi bersamaan: **tepat 1 pemenang** (`reclaimed=true`,
`ownershipVerified=true`), 4 kalah dengan alasan
`held-by-live-holder`, **0 cleanup** dari pihak mana pun
(`cleanupCalls=0` — racer hanya acquire + verifikasi, tidak pernah
memanggil killer), file lock di akhir berisi identitas pemenang
(`lockOwnerOk=true`). Membuktikan: balapan hapus+create diselesaikan
oleh O_EXCL (tepat satu pemegang), yang kalah memvalidasi ulang
kepemilikan dan keluar tanpa cleanup. **Status STARTUP-10 berubah:
TERUJI di VM ini** (sebelumnya "belum teruji di VM ini — wajib di
staging"); uji ulang di staging produksi tetap wajib (U-1, U-16).

**SU10-T2 — balapan acquire dengan holder HIDUP.** 5 proses berlomba
sementara holder hidup: 0 pemenang, semua `held-by-live-holder`, 0
cleanup, holder tetap hidup. Membuktikan pihak yang kalah tidak
menyentuh lock maupun holder.

## 4. Perubahan implementasi referensi (harness saja, BUKAN kode produksi)

`spike-harness-v233/startup.cjs` (disalin dari v2.3.2, lalu diubah):

- `acquireStartupLock` ditulis ulang: probe kematian PID yang dapat
  disuntikkan (`opts.probe`, default `defaultProbe` berbasis
  `kill(pid, 0)` + `/proc`); keputusan hapus hanya pada
  `{ status: 'dead' }` (ESRCH); heartbeat tidak lagi dibaca dalam
  keputusan hapus; lock tak terbaca tidak pernah dihapus otomatis;
  validasi ulang kepemilikan setelah acquire berhasil
  (`verifyLockOwnership` — baca kembali file, pastikan PID sendiri;
  bila gagal → `ownership-revalidation-failed`, fd ditutup, tidak ada
  cleanup).
- `defaultProbe` dan `verifyLockOwnership` diekspor untuk pengujian.
- Selain `acquireStartupLock`, tidak ada fungsi lain yang diubah
  (`ParentStartup`, `validateIdentity`, `atomicWritePidfile`,
  `realKiller`, `fakeUnconfirmableKiller` identik dengan v2.3.2).
- Regresi SU-T1..SU-T9 (9/9 × 2) membuktikan perubahan ini tidak
  merusak perilaku startup yang sudah teruji.

## 5. Batas bukti (yang TIDAK dibuktikan di sini)

- Semua bukti dari VM ini (Node v24.22.1, Linux, `/proc` tersedia,
  berjalan sebagai root) — BUKAN dari runtime artifact produksi.
  Perilaku `/proc`, O_EXCL, dan supervisor di runtime produksi belum
  terbukti (U-16, U-22); uji ulang staging tetap wajib.
- EPERM nyata tidak dapat diproduksi di sini (root tidak pernah
  menerima EPERM dari `kill(pid, 0)`); yang diuji adalah pemetaan
  error-nya melalui probe yang disuntikkan (RCL-T2). Di staging,
  EPERM harus diuji dengan proses milik pengguna lain.
- **Durabilitas pidfile TIDAK dibuktikan di sini.** SU-T4 membuktikan
  *atomic visibility* (rename atomik → pembaca melihat record lama
  atau baru yang lengkap, tidak pernah parsial). Durabilitas (data
  bertahan setelah crash daya/OS) membutuhkan fsync yang benar-benar
  dihormati filesystem — dan seluruh pengujian di sini berjalan di
  `/tmp` yang bertipe **tmpfs** (fsync di tmpfs tidak menguji
  durabilitas disk sama sekali), sementara `/home` berada di overlay
  btrfs dengan opsi `fsync=volatile`. Lihat §A.5.5.3 v2.3.3 untuk
  rencana uji crash/durabilitas staging (D-01..D-03) dan persyaratan
  bahwa pidfile HARUS berada di penyimpanan persisten, bukan tmpfs.
- PostgreSQL tidak tersedia di environment ini; mekanisme lease global
  tetap mengacu pada bukti v2.2 (SQLite teruji; PostgreSQL wajib diuji
  di staging).
- STARTUP-10 teruji di VM ini, tetapi balapan reklamasi di bawah beban
  dan latensi runtime produksi belum teruji; uji ulang staging tetap
  wajib sebelum cutover.
