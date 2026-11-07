# Bukti Pengujian v2.3.2 — Aturan Startup Parent NOT_READY, Validasi Identitas PID, Pidfile Atomik, Startup Lock

- **Tanggal:** 7 November 2026 — **Revisi v2.3.2** (klarifikasi wajib atas §A.5.5)
- **Status:** bukti implementasi referensi lokal di VM ini, **BUKAN** bukti keamanan runtime artifact produksi.
- **Hasil: 9/9 PASS, dijalankan ulang 2× dengan hasil identik** (RUN=1 dan RUN=2).
- **Lingkungan:** Node v24.22.1, Linux, proses/komponen lokal di `/tmp/ssrf-v232` yang dikontrol sendiri. Tidak ada pengujian ke metadata cloud atau jaringan internal produksi. Tidak ada kode artifact, database, atau production build yang diubah.
- **Harness:** disalin ke `spike-harness-v232/` di paket fondasi agar dapat dijalankan ulang (harness `/tmp` pada revisi sebelumnya hilang karena `/tmp` dibersihkan antar sesi — lihat catatan di `SSRF_REMEDIATION_DESIGN.md`).
  - `startup.cjs` — implementasi referensi: state machine `ParentStartup`, `validateIdentity()` (baca `/proc/<pid>/stat` + `/proc/<pid>/cmdline`), `atomicWritePidfile()` (tmp + fsync + rename + fsync direktori), `acquireStartupLock()` (O_EXCL + heartbeat + reklamasi basi), adapter killer nyata dan palsu.
  - `dns-worker.cjs` — worker tiruan (interval ref'd sebagai simulasi handle c-ares; mengabaikan SIGTERM).
  - `lock-racer.cjs` — satu proses yang mencoba acquire lock.
  - `run-tests.cjs` — runner SU-T1..SU-T9 (skala tes: `exitWaitMs=300`, `attempts=3`; nilai produksi: 5 dtk × 3 = anggaran 15 dtk).

## 1. Ringkasan hasil

| Uji | Skenario | Hasil RUN=1 | Hasil RUN=2 |
| --- | --- | --- | --- |
| SU-T1 | Worker tidak bisa dimatikan (exit tak terkonfirmasi) → tetap NOT_READY | PASS | PASS |
| SU-T2 | PID reuse (starttime tidak cocok) → tanpa SIGKILL, NOT_READY | PASS | PASS |
| SU-T3 | Worker nyata, identitas valid → SIGKILL + exit terkonfirmasi → READY | PASS | PASS |
| SU-T4 | Pidfile atomik — 20 penulis bersamaan + crash saat tulis | PASS | PASS |
| SU-T5 | Startup lock — 5 parent (proses nyata) bersamaan, tepat 1 menang | PASS | PASS |
| SU-T6 | Pemegang lock mati → lock dapat direklamasi parent baru | PASS | PASS |
| SU-T7 | Pidfile basi (parent+worker mati) → READY tanpa SIGKILL | PASS | PASS |
| SU-T8 | Worker mati sendiri sebelum cleanup → READY tanpa SIGKILL | PASS | PASS |
| SU-T9 | Pidfile rusak/parsial → NOT_READY + page; pidfile hilang → READY | PASS | PASS |

Perintah:

```bash
cd /tmp/ssrf-v232 && node run-tests.cjs 1
cd /tmp/ssrf-v232 && node run-tests.cjs 2
```

## 2. Output aktual

### RUN=1

```text
=== SUITE v2.3.2 (RUN=1) Node v24.22.1 ===
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

### RUN=2

```text
=== SUITE v2.3.2 (RUN=2) Node v24.22.1 ===
PASS SU-T1 :: state=NOT_READY path=attempts-exhausted-unconfirmed sigsSent=3 rejections=2 workerMasihHidup=true
PASS SU-T2 :: state=NOT_READY path=identity-failed reason=starttime-mismatch sigsSent=0 page=1 decoyHidup=true
PASS SU-T3 :: state=READY path=exit-confirmed attemptsUsed=1 lookupOk=true workerHidup=false
PASS SU-T4 :: setelahRace ok=true token=tok-19 setelahCrash ok=true tokenSama=true
PASS SU-T5 :: pemenang=1 kalah=4 alasanKalah=held-by-live-holder
PASS SU-T6 :: pertama=true kedua=true direklamasi=true
PASS SU-T7 :: state=READY path=worker-already-dead sigsSent=0
PASS SU-T8 :: matiSebelumCleanup=true state=READY path=worker-already-dead sigsSent=0
PASS SU-T9 :: rusak: state=NOT_READY path=pidfile-corrupt | parsial: state=NOT_READY path=pidfile-corrupt | hilang: state=READY path=no-pidfile | sigsSent=0 page=2
=== HASIL RUN=2: 9/9 PASS ===
```

Diff kedua run: hanya nomor run di header (`RUN=1` vs `RUN=2`); semua baris
hasil identik, termasuk token SU-T4 (`tok-19` — penulis terakhir yang
memenangkan balapan rename pada kedua run; token bersifat arbitrer, yang
diuji adalah file selalu berisi SATU record lengkap yang valid).

## 3. Apa yang dibuktikan tiap uji (dan apa yang TIDAK)

**SU-T1 — aturan keras NOT_READY.** Killer palsu mencatat SIGKILL tetapi
TIDAK PERNAH membunuh worker (simulasi D-state / exit tidak terkonfirmasi —
keadaan ini tidak dapat diproduksi dengan proses nyata karena SIGKILL
selalu membunuh; karena itu dipakai adapter palsu, dan hal ini dinyatakan
di sini, bukan disembunyikan). Setelah 3 percobaan × 300 ms: state tetap
`NOT_READY`, `sigsSent=3`, 2 lookup ditolak `DNS_PARENT_NOT_READY`, worker
masih hidup. Membuktikan: **batas percobaan habis BUKAN izin melanjutkan.**

**SU-T2 — PID reuse.** Pidfile menunjuk proses `sleep` (decoy) dengan
starttime yang diklaim digeser +12345 dari starttime sebenarnya.
Validasi gagal pada `starttime-mismatch` → **0 SIGKILL dikirim**,
`page=1`, decoy tetap hidup, parent tetap `NOT_READY`. Membuktikan: PID
saja tidak cukup; identitas diverifikasi sebelum sinyal apa pun.

**SU-T3 — jalur normal.** Worker nyata dengan identitas valid: 1 SIGKILL,
exit terkonfirmasi pada percobaan pertama, state `READY`, lookup diterima,
worker tidak lagi hidup.

**SU-T4 — pidfile atomik.** 20 penulis bersamaan → file selalu berisi satu
record JSON lengkap yang valid (`workerPid` number, `workerStarttime`
string, `workerToken` string). File tmp setengah tertulis yang tidak pernah
di-rename tidak merusak pidfile: record sesudah "crash" identik dengan
record sebelum crash (`tokenSama=true`).

**SU-T5 — startup lock.** 5 proses nyata berlomba acquire lock yang sama:
tepat 1 pemenang, 4 kalah dengan alasan `held-by-live-holder`. Yang kalah
tidak melakukan cleanup apa pun (tidak ada pemanggilan killer dari pihak
yang kalah — racer hanya mencoba acquire lalu keluar).

**SU-T6 — pelepasan lock setelah pemegang mati.** Lock dipegang atas nama
proses `sleep` yang kemudian dimatikan; setelah 300 ms (heartbeat basi),
parent baru berhasil acquire dengan `reclaimed=true`.

**SU-T7 — pidfile basi.** Pidfile menunjuk PID 999998/999999 yang tidak
hidup → jalur "worker tidak pernah ada" → `READY`, 0 SIGKILL.

**SU-T8 — worker mati sendiri sebelum cleanup.** Worker dimatikan sebelum
`runCleanup` dipanggil → `pidAlive` false → `READY` via
`worker-already-dead`, 0 SIGKILL.

**SU-T9 — pidfile rusak/parsial/hilang.** (a) JSON terpotong dan (b) JSON
valid tetapi field hilang → keduanya `NOT_READY` + `pidfile-corrupt` +
page, 0 SIGKILL (fail-closed: worker lama tidak dapat dibuktikan mati dan
tidak dapat dibuktikan tidak ada). (c) File tidak ada → `READY`
(`no-pidfile`) — tidak adanya klaim worker adalah bukti yang cukup untuk
jalur (b) karena tidak ada proses yang dapat dirujuk. Perbedaan (a)/(b)
vs (c) ini disengaja dan didokumentasikan di §A.5.5.1 v2.3.2.

## 4. Koreksi atas implementasi referensi selama pengujian

Satu koreksi dibuat SEBELUM pengujian dijalankan (bukan setelah hasil
dilihat): versi awal `runCleanup()` memperlakukan pidfile yang tidak
terbaca sebagai "tidak ada worker" (`READY`). Itu bertentangan dengan
kriteria penerimaan 1 (worker lama tidak dapat dibuktikan mati dan tidak
dapat dibuktikan tidak ada → harus NOT_READY). Logika diperbaiki menjadi:
file TIDAK ADA → `READY` (`no-pidfile`); file ADA tetapi rusak/parsial →
`NOT_READY` + page (`pidfile-corrupt`). Perbaikan ini dibuat sebelum
SU-T9 ditulis, dan SU-T9 menguji perilaku yang diperbaiki.

Dua perbaikan harness (bukan perbaikan implementasi) selama penulisan tes:
(a) SU-T5 awal memakai PID palsu yang tidak hidup sebagai identitas
pemegang lock — logika reklamasi akan mencuri lock dari pemenang karena
PID pemegang "mati". Diperbaiki menjadi 5 proses nyata (`lock-racer.cjs`).
(b) SU-T8 awal mengirim SIGTERM ke worker yang sengaja mengabaikan
SIGTERM — diganti menjadi worker yang mati sendiri sebelum cleanup
dimulai, sesuai maksud uji yang sebenarnya.

## 5. Batas bukti (yang TIDAK dibuktikan di sini)

- Semua bukti dari VM ini (Node v24.22.1, Linux, `/proc` tersedia) —
  BUKAN dari runtime artifact produksi. Perilaku `/proc`, `flock`/O_EXCL,
  dan supervisor di runtime produksi belum terbukti (U-16, U-22).
- Adapter killer palsu pada SU-T1 mensimulasikan exit yang tidak
  terkonfirmasi; tidak ada proses nyata yang diuji dalam keadaan D-state.
- Reklamasi lock basi memakai validasi PID + heartbeat; jendela TOCTOU
  kecil antara validasi pemegang dan penghapusan lock tetap ada (risiko
  baru U-25) — pemegang yang hidup kembali setelah lock dihapus akan gagal
  heartbeat, tetapi jendela itu tidak diuji secara eksplisit di sini.
- PostgreSQL tidak tersedia di environment ini; mekanisme lease global
  tetap mengacu pada bukti v2.2 (SQLite teruji; PostgreSQL wajib diuji di
  staging).
