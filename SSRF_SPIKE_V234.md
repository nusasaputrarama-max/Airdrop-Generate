# Bukti Pengujian v2.3.4 — Race Condition pada Stale Lock Reclamation (§A.5.5.4)

- **Tanggal:** 7 November 2026 — **Revisi v2.3.4** (klarifikasi atas SATU keberatan
  teknis evaluasi ChatGPT terhadap v2.3.3: race condition pada reklamasi
  startup lock)
- **Status:** bukti implementasi referensi lokal di VM ini, **BUKAN** bukti
  keamanan runtime artifact produksi. Status persetujuan implementasi TIDAK
  berubah: **DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED**.
- **Hasil: race TERBUKTI pada kode v2.3.3 (ADV-T1: 2 pemilik, 3/3 × 2) +
  perbaikan flock TERUJI (ADV-T2/T2sim/T5/T6: 4/4 × 2) + semantik flock
  kernel TERUJI (FLK-T1..T8: 9/9 × 2 tmpfs, 9/9 × 2 overlay).**
- **Lingkungan:** Node v24.22.1, Bun 1.4.4, Python 3.12.3, Linux, root (uid 0),
  proses/komponen lokal yang dikontrol sendiri. Tidak ada pengujian ke metadata
  cloud atau jaringan internal produksi. Tidak ada kode artifact, database,
  atau production build yang diubah.
- **Harness:** disalin ke `spike-harness-v234/` di paket fondasi agar dapat
  dijalankan ulang (`startup-v233.cjs` + hooks, `stepped-racer.cjs`,
  `run-adv-tests.cjs`, `startup-flock.js`, `stepped-racer-flock.js`,
  `run-flock-adv-tests.cjs`, `flock-semantics.py`, `run-t6-inodeonly.cjs`,
  `bun-flock-sanity.js`, beserta log output tiap run).

## §0. Insiden /tmp dan rekonstruksi harness — kejujuran proses

Di tengah revisi ini layanan di-restart dan **seluruh `/tmp` dibersihkan** —
`/tmp/ssrf-v234` beserta semua harness dan log yang sudah dibuat hilang.
(Sudah diperingatkan di revisi sebelumnya: `/tmp` tidak persisten antar sesi.)
Dampak dan perbaikan:

- Harness dibangun ulang dari nol di `spike-harness-v234/` (lokasi persisten di
  `~/workspace/`, bukan `/tmp`) dan SEMUA suite dijalankan ulang dari awal
  setelah rekonstruksi — tidak ada satu pun angka di dokumen ini yang diambil
  dari run sebelum restart tanpa diulang.
- Satu-satunya pengecualian yang dicatat: klaim `fs-ext` gagal dibangun dan
  sanity `Bun FFI flock` sudah dibuktikan sebelum restart; keduanya diulang
  setelah restart (fs-ext: gagal lagi dengan error yang sama; Bun FFI:
  `bun-flock-sanity.js` ditulis ulang dan dijalankan ulang — output di §5).
- Sebagai bukti hooks tidak mengubah perilaku, regresi SU-T1..SU-T9 (9/9) dan
  RCL-T1..T6 + SU10-T1/T2 (8/8) dijalankan ulang terhadap salinan
  `startup-v233.cjs` yang sudah diberi hooks — hasil identik dengan v2.3.3:

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

## 1. Ringkasan hasil

| Suite | Tes | Hasil RUN=1 | Hasil RUN=2 |
| --- | --- | --- | --- |
| ADV old-code v2.3.3 (`run-adv-tests.cjs`) | ADV-T1, ADV-T3a, ADV-T3c | 3/3 ekspektasi cocok | 3/3 ekspektasi cocok |
| ADV fixed-code flock (`run-flock-adv-tests.cjs`) | ADV-T2, ADV-T2sim, ADV-T5, ADV-T6 | 4/4 ekspektasi cocok | 4/4 ekspektasi cocok |
| Diagnostik T6 inode-only (`run-t6-inodeonly.cjs`) | T6-INODEONLY | DETECTED | DETECTED |
| Semantik flock kernel (`flock-semantics.py`, tmpfs) | FLK-T1..T8 (9 pemeriksaan) | 9/9 PASS | 9/9 PASS |
| Semantik flock kernel (`flock-semantics.py`, overlay) | FLK-T1..T8 (9 pemeriksaan) | 9/9 PASS | 9/9 PASS |
| Sanity Bun FFI flock (`bun-flock-sanity.js`) | acquire / EWOULDBLOCK / release | OK | (diulang 1× setelah restart) |
| Probe daur ulang inode (tmpfs + overlay) | unlink+recreate 30× per fs | 0/30 reuse | — |

Perintah:

```bash
cd spike-harness-v234
node run-adv-tests.cjs 1 && node run-adv-tests.cjs 2
node run-flock-adv-tests.cjs 1 && node run-flock-adv-tests.cjs 2
node run-t6-inodeonly.cjs 1 && node run-t6-inodeonly.cjs 2
python3 flock-semantics.py /tmp/ssrf-v234/flk-tmpfs 1
python3 flock-semantics.py /tmp/ssrf-v234/flk-tmpfs 2
python3 flock-semantics.py /home/hatch/.ssrf-v234-overlay 1
python3 flock-semantics.py /home/hatch/.ssrf-v234-overlay 2
bun bun-flock-sanity.js
```

## 2. Urutan operasi aktual `acquireStartupLock` v2.3.3 — jawaban klarifikasi 1

Pseudocode di bawah adalah transkripsi PERSIS dari
`spike-harness-v233/startup.cjs` (fungsi `acquireStartupLock`, jalur yang
ditempuh saat lock sudah ada) — bukan versi ideal. Jendela race ditandai
`[RACE]`. Hooks `afterProbe/beforeUnlink/afterUnlink/afterCreate/beforeVerify`
adalah instrumentasi uji v2.3.4 (tidak mengubah keputusan; kesetaraan perilaku
dibuktikan regresi §0).

```text
acquireStartupLock(lockPath, identity):
  for attempt in 0..maxReclaim (3):
    try:
      fd = open(lockPath, 'wx')            # O_EXCL create — atomik
      write(fd, record{pid, starttime, heartbeatAt}) ; fsync(fd)
      if !verifyLockOwnership(lockPath, identity):   # baca path, bandingkan pid+starttime
        close(fd); return {acquired:false, reason:'ownership-revalidation-failed'}
      return {acquired:true, fd, record, reclaimed: attempt>0}
    catch EEXIST:
      holder = parse(read(lockPath))       # baca record pemegang lama
      if !parseable OR holder.pid bukan number:
        return {acquired:false, reason:'lock-unreadable', page:true}
      probeRes = probe(holder.pid)         # kill(pid,0) + /proc
      if probeRes == dead (ESRCH):
        unlink(lockPath)                   # [RACE-1] unlink TAK BERSYARAT:
                                           # menghapus APA PUN yang ada di path
                                           # saat ini — termasuk file lock
                                           # BARU milik parent lain yang
                                           # dibuat setelah probe.
        continue                           # -> ulang loop, coba create lagi
      if probeRes == uncertain:            # EPERM / stat tak terbaca
        return {acquired:false, reason:'holder-unverifiable', page:true}
      if probeRes == alive:
        return {acquired:false, reason:'held-by-live-holder' / 'holder-identity-mismatch'}
  return {acquired:false, reason:'reclaim-exhausted'}
```

**Jendela race yang ditandai:**

- **[RACE-1] — unlink tak bersyarat setelah probe basi (INTI KEBERATAN).**
  Keputusan unlink didasarkan pada hasil probe yang dibaca SEBELUM unlink;
  tidak ada pemeriksaan ulang bahwa file di path masih file yang sama dengan
  yang diprobe. B dapat meng-unlink file lock baru milik A (dibuat setelah
  probe B) dan kemudian membuat lock sendiri. O_EXCL TIDAK melindungi dari
  ini: O_EXCL hanya men-serialisasi pembuatan file ketika path belum ada —
  ia tidak mencegah penghapusan.
- **[RACE-2] — verify adalah pemeriksaan sesaat (point-in-time).** Setelah
  `verifyLockOwnership` mengembalikan true, TIDAK ADA mekanisme yang
  mempertahankan kepemilikan: proses lain dapat meng-unlink file lock kapan
  saja selama masa hidup parent. Otoritas lock "menguap" begitu path
  dihapus — fd yang dipegang A tetap terbuka pada inode yang sudah
  di-unlink, dan heartbeat A menulis ke inode yang tidak terlihat siapa pun.
- **Bukan jendela:** probe ESRCH -> PID reuse (proses baru memakai ulang angka
  PID antara probe dan unlink) — penghapusan file klaim basi tetap aman dalam
  jendela ini karena proses baru itu tidak memegang lock (U-25 v2.3.3 sudah
  benar pada poin ini).

## 3. Output aktual — ADV-T1 / ADV-T3a / ADV-T3c (kode v2.3.3)

Metode: dua proses nyata (A dan B) menjalankan urutan operasi yang PERSIS
sama dengan hooks barrier — A dan B sama-sama mem-probe ESRCH pada record
basi yang sama, lalu barrier menahan B pada titik kritis yang ditentukan
skenario. Bukan balapan acak.

### 3a. ADV-T1 — skenario ChatGPT, RUN=1 dan RUN=2

```text
=== SUITE v2.3.4-ADV OLD-CODE (RUN=1) Node v24.22.1 ===
ADV-T1 :: PROPERTY VIOLATED — 2 OWNERS | owners=A,B | A(acq=true,reason=ok,ino=103) B(acq=true,reason=ok,ino=107) | finalLockPid=2225 finalIno=107 aFileDeleted=true | expectation(violated)=MATCHED
ADV-T3a :: PROPERTY HOLDS | owners=B | A(acq=false,reason=ownership-revalidation-failed,ino=null) B(acq=true,reason=ok,ino=118) | finalLockPid=2246 finalIno=118 aFileDeleted=false | expectation(holds)=MATCHED
ADV-T3c :: PROPERTY HOLDS | owners=A | A(acq=true,reason=ok,ino=127) B(acq=false,reason=held-by-live-holder,ino=null) | finalLockPid=2266 finalIno=127 aFileDeleted=false | expectation(holds)=MATCHED
=== HASIL RUN=1: 3/3 expectations matched ===
=== SUITE v2.3.4-ADV OLD-CODE (RUN=2) Node v24.22.1 ===
ADV-T1 :: PROPERTY VIOLATED — 2 OWNERS | owners=A,B | A(acq=true,reason=ok,ino=136) B(acq=true,reason=ok,ino=140) | finalLockPid=2295 finalIno=140 aFileDeleted=true | expectation(violated)=MATCHED
ADV-T3a :: PROPERTY HOLDS | owners=B | A(acq=false,reason=ownership-revalidation-failed,ino=null) B(acq=true,reason=ok,ino=151) | finalLockPid=2316 finalIno=151 aFileDeleted=false | expectation(holds)=MATCHED
ADV-T3c :: PROPERTY HOLDS | owners=A | A(acq=true,reason=ok,ino=160) B(acq=false,reason=held-by-live-holder,ino=null) | finalLockPid=2331 finalIno=160 aFileDeleted=false | expectation(holds)=MATCHED
=== HASIL RUN=2: 3/3 expectations matched ===
```

**ADV-T1 — race TERBUKTI, deterministik, 2/2 run.** A memperoleh lock
(ino 103), memverifikasi kepemilikan (lolos), dan mengembalikan
`acquired=true`. B — yang masih bertindak atas hasil probe ESRCH lamanya —
kemudian meng-unlink path (menghapus file A: `aFileDeleted=true`), membuat
lock sendiri (ino 107), memverifikasi, dan juga mengembalikan
`acquired=true`. File akhir di path adalah milik B (finalIno=107), tetapi A
tidak pernah tahu: A memegang fd pada inode 103 yang sudah di-unlink dan
tetap menganggap dirinya pemilik. **Dua parent sama-sama berstatus pemilik
dan sama-sama berhak melanjutkan cleanup — tepat skenario keberatan.**

**ADV-T3a — verify MENANGKAP interleaving ini.** B meng-unlink SETELAH A
membuat file tetapi SEBELUM A memverifikasi: A membaca path, menemukan
record B (atau path hilang), dan gagal dengan
`ownership-revalidation-failed`. Tepat satu pemilik (B). Ini membuktikan
verify berguna — tetapi hanya untuk jendela SEBELUM verify, bukan sesudahnya.

**ADV-T3c — O_EXCL men-serialisasi pembuatan BILA kedua unlink mendahului
kedua create.** Dengan barrier "kedua pihak unlink dulu, baru keduanya
create", tepat satu pemenang (RUN=1: A; RUN=2: A; pemenang bervariasi antar
run pada run awal sebelum perbaikan harness). Ini membuktikan O_EXCL bekerja
pada bagiannya — dan sekaligus membuktikan O_EXCL TIDAK menjawab keberatan:
keberatan bukan tentang create, melainkan tentang unlink atas file baru.

**Catatan harness (kejujuran):** versi pertama ADV-T3c TANPA barrier
afterUnlink justru menghasilkan 2 pemilik — karena tanpa barrier,
"unlink bersamaan" tidak dapat dibedakan dari skenario T1 (racer yang
lambat meng-unlink setelah racer cepat membuat file). Barrier ditambahkan
agar T3c benar-benar menguji yang diklaimnya. Demikian pula, run pertama
setelah rekonstruksi harness sempat memberi hasil T1/T3a yang terbalik —
penyebabnya file sinyal barrier basi dari run sebelumnya (tidak ada
pembersihan direktori); orchestrator diperbaiki (rm -rf direktori run di
awal) dan hasil di atas adalah hasil SETELAH perbaikan, direproduksi 2/2.

### 3b. Mengapa SU10-T1 lolos padahal bug ini ada — jawaban klarifikasi 4 (bagian 1)

SU10-T1 (v2.3.3: 5 parent mereklamasi lock basi bersamaan, tepat 1 pemenang)
**TIDAK membuktikan tidak adanya race ini**, dan klaim v2.3.3 bahwa
"balapan hapus+create diselesaikan oleh O_EXCL" **ditarik** pada revisi ini.
Alasannya:

1. Dalam balapan acak, kelima racer mem-probe + meng-unlink dalam ledakan
   yang rapat; unlink pihak yang kalah hampir selalu mendarat SEBELUM
   pemenang membuat file (jendela T1 hanya terbuka setelah pemenang
   create+verify — rentang waktu yang sempit dan jarang tertembak secara
   acak). Yang kalah kemudian membaca ulang file pemenang yang HIDUP dan
   keluar via `held-by-live-holder`.
2. SU10-T1 hanya menguji SATU titik dalam ruang interleaving (semua pihak
   mulai bersamaan, tanpa penahanan). Ia tidak pernah menahan satu pihak
   pada titik kritis (setelah probe, sebelum unlink) sementara pihak lain
   menyelesaikan akuisisi — persis interleaving yang ditanyakan keberatan.
3. Bukti "tepat satu pemenang" dalam balapan acak adalah bukti probabilistik
   (tidak terjadi pada N percobaan), bukan bukti ketidakmungkinan. Tes
   adversarial dengan barrier mengubahnya menjadi bukti deterministik:
   ADV-T1 mereproduksi 2 pemilik pada 2/2 run.

Yang ditambahkan tes adversarial baru (ADV-T1/T3a/T3c): penahanan deterministik
pada SETIAP titik kritis (setelah probe, sebelum unlink, setelah unlink,
setelah create, sebelum verify), sehingga masing-masing interleaving diuji
sendiri-sendiri — bukan "mudah-mudahan terjadi".

## 4. Perbaikan v2.3.4 — flock sebagai primitif kepemilikan (jawaban klarifikasi 2 dan 5)

**Pengakuan jujur:** implementasi referensi v2.3.3 **TIDAK** mencegah B
menghapus lock baru milik A. Tidak ada perbaikan kecil pada urutan
probe->unlink->create yang dapat menutupnya: `stat` ulang sebelum unlink
hanya MEMPERSempit jendela (stat->unlink sendiri tidak atomik), dan
verifikasi ulang setelah acquire hanya menangkap interleaving SEBELUM
verify (ADV-T3a), bukan sesudahnya (ADV-T1). Satu-satunya penutup yang
benar adalah primitif atomik dari kernel — maka desain diubah:

**Desain perbaikan (detail lengkap di §A.5.5.4 v2.3.4):**

1. **flock(LOCK_EX|LOCK_NB) pada fd adalah klaim kepemilikan.** File dibuka
   `O_RDWR|O_CREAT` (tanpa O_EXCL, tanpa truncate) — file hanya rendezvous
   point; kernel men-serialisasi akuisisi. EWOULDBLOCK = pemegang hidup ->
   keluar segera (exit 78), tanpa cleanup.
2. **Aturan never-unlink:** file lock TIDAK PERNAH di-unlink oleh siapa pun.
   Holder mati melepaskan flock OTOMATIS saat proses berakhir (kernel
   menutup fd) — tidak ada lagi "lock basi" yang harus direklamasi, tidak
   ada lagi probe ESRCH atau unlink dalam jalur akuisisi.
3. **Verifikasi ulang kepemilikan** (sebelum cleanup apa pun) memakai DUA
   pemeriksaan: (dev,ino) fstat(fd) vs stat(path) DAN record dibaca via
   PATH (open segar O_RDONLY) yang harus berisi pid + starttime + token
   acak 128-bit per-akuisisi. Baca-via-fd TIDAK dipakai (fd dapat menunjuk
   ke inode yang sudah di-unlink tetapi isinya masih record kita).
4. **fd lock WAJIB close-on-exec** (Node/Bun `fs.openSync` sudah O_CLOEXEC
   secara default — dibuktikan FLK-T8a/T8b).
5. **Flag-day:** versi lama (unlink-reclaim) TIDAK BOLEH berjalan bersamaan
   dengan versi baru — ADV-T6 membuktikan bahaya masa transisi (di bawah).
6. Heartbeat tetap ditulis via fd yang dipegang, hanya observabilitas.

### 4a. Output aktual — ADV-T2 / ADV-T2sim / ADV-T5 / ADV-T6 (kode flock)

```text
=== SUITE v2.3.4-ADV FIXED-CODE (RUN=1) Bun 1.4.4 + Node v24.22.1 ===
ADV-T2 :: PROPERTY HOLDS | owners=A | A(acq=true,reason=ok) B(acq=false,reason=held-by-live-holder) | finalLockPid=2617
ADV-T2sim :: PROPERTY HOLDS | owners=B | A(acq=false,reason=held-by-live-holder) B(acq=true,reason=ok) | finalLockPid=2634
ADV-T5 :: DETECTED | A(acq=true,verifiedAfterInterference=false,cleanupCalls=0) | aIno=223 newIno=225 inodeChanged=true
ADV-T6 :: mixed-version hazard=REPRODUCED (both acquired) | A(flock,acq=true,verifiedAfter=false,cleanupCalls=0,myIno=228) B(old-code,acq=true,reason=ok,myIno=232) | safetyNet=A DETECTED invalid ownership, no cleanup | finalLockPid=2661 finalIno=232 inodeReused=false
=== HASIL RUN=1: 4/4 expectations matched ===
=== SUITE v2.3.4-ADV FIXED-CODE (RUN=2) Bun 1.4.4 + Node v24.22.1 ===
ADV-T2 :: PROPERTY HOLDS | owners=A | A(acq=true,reason=ok) B(acq=false,reason=held-by-live-holder) | finalLockPid=2688
ADV-T2sim :: PROPERTY HOLDS | owners=B | A(acq=false,reason=held-by-live-holder) B(acq=true,reason=ok) | finalLockPid=2710
ADV-T5 :: DETECTED | A(acq=true,verifiedAfterInterference=false,cleanupCalls=0) | aIno=247 newIno=249 inodeChanged=true
ADV-T6 :: mixed-version hazard=REPRODUCED (both acquired) | A(flock,acq=true,verifiedAfter=false,cleanupCalls=0,myIno=252) B(old-code,acq=true,reason=ok,myIno=256) | safetyNet=A DETECTED invalid ownership, no cleanup | finalLockPid=2737 finalIno=256 inodeReused=false
=== HASIL RUN=2: 4/4 expectations matched ===
```

**ADV-T2 — interleaving yang sama dengan ADV-T1, pada kode flock: tepat satu
pemilik (2/2).** B mencoba flock SETELAH A memperolehnya -> EWOULDBLOCK ->
`held-by-live-holder`, tanpa menyentuh file. Tidak ada unlink, tidak ada
yang dapat dihapus.

**ADV-T2sim — kedua pihak mencoba flock bersamaan: tepat satu pemenang
(2/2; pemenang bervariasi A/B antar run — balapan nyata).** Kernel yang
men-serialisasi.

**ADV-T5 — unlink oleh pihak ketiga SETELAH acquire terdeteksi (2/2).**
Orkestrator meng-unlink file A dan membuat file baru di path (ino berubah
223->225); A menjalankan `verifyFlockOwnership` -> false, 0 cleanup.

**ADV-T6 — bahaya versi campuran TERBUKTI, dan jaring pengaman TERBUKTI
(2/2).** Racer B berkode lama membaca lock basi, mem-probe ESRCH, lalu —
setelah A (flock) memperoleh lock — B meng-unlink file A dan memperoleh
lock sendiri: KEDUA pihak berstatus pemilik (`bothAcquired=true`). Ini
adalah bukti bahwa selama masa transisi (versi lama + versi baru berjalan
bersamaan), invariant tetap dapat dilanggar — oleh karena itu migrasi
WAJIB flag-day (hentikan semua parent, upgrade, baru start). Namun A
mendeteksi kepemilikan yang tidak valid (`verifiedAfter=false`,
`cleanupCalls=0`): verifikasi ulang inode+token menangkap penggantian
file SEBELUM cleanup apa pun — jaring pengaman bekerja pada kedua run.

### 4b. Koreksi jujur: kegagalan ADV-T6 pertama adalah cacat harness, BUKAN cacat implementasi

Pada eksekusi pertama suite fixed-code (sebelum restart /tmp), ADV-T6 RUN=2
melaporkan `A FAILED to detect` (`verifiedAfter=true`) padahal inode
berbeda (myIno=204, finalIno=208). Penyelidikan menunjukkan penyebabnya
adalah cacat harness, bukan implementasi: racer B kode-lama menunggu sinyal
`probed.A` di hook afterProbe — tetapi racer flock (Bun) tidak pernah
mem-probe, sehingga tidak ada sinyal `probed.A`; B terjebak 15 detik penuh
pada timeout barrier, dan A — yang menunggu `acquired.B` dengan timeout
15 detik yang sama — memverifikasi SEBELUM B sempat meng-unlink (saat path
masih berisi file A sendiri), sehingga verifikasi "lolos" dengan benar
pada saat itu. Perbaikan harness: varian T6B tidak lagi menunggu
`probed.A`. Setelah perbaikan, suite berjalan ~6 detik/run (sebelumnya
~21 detik) dan ADV-T6 lolos 4/4 (2 run pasca-perbaikan + 2 run diagnostik
di bawah). Kegagalan pertama ini didokumentasikan — bukan dihapus — karena
ia membuktikan satu hal penting: **verifikasi ulang adalah pemeriksaan
sesaat; nilainya bergantung pada KAPAN ia dijalankan** (residual ini
dicatat sebagai U-31).

### 4c. Diagnostik T6 inode-only — apakah token benar-benar menahan beban?

Setelah perbaikan harness, verifikasi versi inode-only + baca-via-fd
(pra-token) diuji ulang terhadap skenario T6 yang sama, untuk memutuskan
apakah kegagalan T6 pertama disebabkan daur ulang inode atau cacat harness:

```text
T6-INODEONLY RUN=1 :: bothAcquired=true | A(verifiedAfter=false,myIno=398) B(acq=true,myIno=402) | finalIno=402 inodeReused=false | conclusion=inode-only DETECTED (timing flaw was the cause)
T6-INODEONLY RUN=2 :: bothAcquired=true | A(verifiedAfter=false,myIno=407) B(acq=true,myIno=411) | finalIno=411 inodeReused=false | conclusion=inode-only DETECTED (timing flaw was the cause)
```

**Kesimpulan diagnostik: cacat harness adalah penyebabnya; daur ulang inode
TIDAK teramati.** Pemeriksaan inode-only mendeteksi penggantian pada 2/2
run setelah harness diperbaiki. Probe daur ulang inode (unlink + recreate
file yang sama 30× berturut-turut) memberi 0/30 pada tmpfs DAN overlay —
alokator di VM ini memberi nomor inode berurutan, bukan mendaur ulang yang
baru dibebaskan dalam jangka pendek.

**Maka status token yang jujur:** token acak per-akuisisi adalah
**defense-in-depth, bukan terbukti menahan beban di VM ini.** Yang terbukti
menahan beban di sini adalah pemeriksaan inode + baca-via-path. Token
dipertahankan karena (a) baca-via-fd terbukti buta terhadap penggantian
(secara konstruksi: fd membaca inode yang sudah di-unlink), sehingga
baca-via-path wajib; (b) nomor inode BUKAN identitas yang stabil —
filesystem mendaur ulangnya secara umum (perilaku yang terdokumentasi,
meskipun tidak teramati dalam 30 percobaan di VM ini) — dan token membuat
pemeriksaan tetap benar bahkan bila inode terdaur ulang dan isi disalin;
(c) biayanya ~nol (satu field acak). Token TIDAK diklaim sebagai
satu-satunya penahan — bila peninjau menganggapnya berlebihan, menghapusnya
tidak merusak bukti T6 (inode + path-read sudah cukup di VM ini), tetapi
menghapusnya menghilangkan perlindungan terhadap daur ulang inode.

## 5. Semantik flock kernel — jawaban klarifikasi 5

### 5a. Sanity binding Bun FFI (Bun 1.4.4 — runtime artifact)

`bun:ffi` -> libc `flock` TERBUKTI dapat dipakai (file
`spike-harness-v234/bun-flock-sanity.js`):

```text
flock fd1 EX|NB -> 0 errno 0
flock fd2 EX|NB -> -1 errno 11 (11=EWOULDBLOCK expected)
flock fd3 EX|NB after close -> 0 (0 expected: released on close)
BUN FFI FLOCK OK
```

### 5b. `fs-ext` TIDAK dapat dibangun di VM ini — celah binding Node

Percobaan `npm install fs-ext` (binding flock native untuk Node) GAGAL di VM
ini: `node-gyp` tidak dapat mengekstrak header Node
(`TAR_ENTRY_ERROR EPERM: operation not permitted, fchown` — pembatasan
sandbox, bukan cacat fs-ext). Artinya: **untuk runtime Node murni, jalur
binding flock belum terbukti di sini.** Untuk runtime artifact (Bun 1.4.4),
jalur `bun:ffi` sudah terbukti di atas. Bila implementasi produksi berjalan
di Node (bukan Bun), binding harus dibuktikan di staging (U-29) — opsi:
`bun:ffi` (bila runtime Bun), `flock(1)` CLI via guard process (TIDAK
direkomendasikan — lock dipegang proses lain, failure mode baru), atau
binding native yang berhasil dibangun di environment staging.

### 5c. Output aktual FLK-T1..T8 (Python fcntl — semantik kernel, independen bahasa)

tmpfs RUN=1 dan RUN=2 (identik; log `flk-tmpfs-run1.log` / `flk-tmpfs-run2.log`):

```text
PASS FLK-T1 :: contender flock NB while held -> acquired=False errno=11 (11=EWOULDBLOCK expected)
PASS FLK-T2 :: contender flock NB after holder SIGKILL -> acquired=True errno=None
PASS FLK-T3 :: contender flock NB after holder close -> acquired=True errno=None
PASS FLK-T4 :: second open+close in holder process, contender says BLOCKED (BLOCKED expected)
PASS FLK-T5 :: after unlink+recreate, new opener flock NB -> acquired=True (True proves TWO holders can coexist -> never-unlink is load-bearing)
PASS FLK-T6 :: fstype=tmpfs dir=/tmp/ssrf-v234/flk-tmpfs contender flock NB while held -> acquired=False errno=11
PASS FLK-T7 :: contender flock NB after LOCK_UN -> acquired=True errno=None
PASS FLK-T8a :: CLOEXEC holder died, orphan child alive (no fd), contender flock NB -> acquired=True (True expected)
PASS FLK-T8b :: INHERITABLE fd holder died, orphan child holds fd, contender flock NB -> acquired=False errno=11 (False/11 expected: hazard is REAL if CLOEXEC is forgotten)
=== HASIL RUN=1 (/tmp/ssrf-v234/flk-tmpfs): 9/9 PASS ===
=== HASIL RUN=2 (/tmp/ssrf-v234/flk-tmpfs): 9/9 PASS ===
```

overlay RUN=1 dan RUN=2 (identik kecuali fstype; log `flk-overlay-run1.log` /
`flk-overlay-run2.log`):

```text
PASS FLK-T1 :: contender flock NB while held -> acquired=False errno=11 (11=EWOULDBLOCK expected)
PASS FLK-T2 :: contender flock NB after holder SIGKILL -> acquired=True errno=None
PASS FLK-T3 :: contender flock NB after holder close -> acquired=True errno=None
PASS FLK-T4 :: second open+close in holder process, contender says BLOCKED (BLOCKED expected)
PASS FLK-T5 :: after unlink+recreate, new opener flock NB -> acquired=True (True proves TWO holders can coexist -> never-unlink is load-bearing)
PASS FLK-T6 :: fstype=overlay dir=/home/hatch/.ssrf-v234-overlay contender flock NB while held -> acquired=False errno=11
PASS FLK-T7 :: contender flock NB after LOCK_UN -> acquired=True errno=None
PASS FLK-T8a :: CLOEXEC holder died, orphan child alive (no fd), contender flock NB -> acquired=True (True expected)
PASS FLK-T8b :: INHERITABLE fd holder died, orphan child holds fd, contender flock NB -> acquired=False errno=11 (False/11 expected: hazard is REAL if CLOEXEC is forgotten)
=== HASIL RUN=1 (/home/hatch/.ssrf-v234-overlay): 9/9 PASS ===
=== HASIL RUN=2 (/home/hatch/.ssrf-v234-overlay): 9/9 PASS ===
```

**Apa yang dibuktikan tiap uji (dan apa yang TIDAK):**

- **FLK-T1 — eksklusi.** flock EX|NB kedua gagal EWOULDBLOCK saat holder
  hidup. Primitif ini yang men-serialisasi akuisisi — tanpa jendela.
- **FLK-T2 — pelepasan saat mati.** Holder di-SIGKILL -> contender langsung
  memperoleh lock. Kernel melepaskan flock saat proses berakhir — inilah
  yang menghapus kebutuhan reklamasi (dan seluruh jalur probe+unlink).
- **FLK-T3 — pelepasan saat close.** Menutup fd melepaskan lock.
- **FLK-T4 — open kedua + close TIDAK melepas.** Holder membuka file yang
  sama kedua kalinya (deskripsi open terpisah), membaca, menutupnya —
  contender tetap BLOCKED. Ini yang membuat verifikasi ulang via open
  O_RDONLY aman (tidak mengganggu flock yang dipegang).
- **FLK-T5 — bahaya unlink (never-unlink adalah load-bearing).** Setelah
  path di-unlink dan file baru dibuat, opener baru memperoleh flock pada
  inode BARU sementara holder lama masih memegang flock pada inode lama —
  dua "pemegang" hidup berdampingan. Inilah bukti eksperimental mengapa
  flock saja tidak cukup bila file boleh di-unlink: aturan never-unlink
  adalah bagian dari desain, bukan etiket.
- **FLK-T6 — perilaku sama di tmpfs dan overlay.** Kedua filesystem memberi
  hasil identik pada semua uji. **NFS TIDAK diuji** — tidak ada NFS di VM
  ini; flock di NFS (lockd, NFSv3 vs v4) adalah perilaku yang berbeda dan
  wajib diverifikasi di staging bila direktori lock berada di NFS (U-30).
- **FLK-T7 — LOCK_UN eksplisit.** Pelepasan eksplisit bekerja.
- **FLK-T8a — CLOEXEC aman.** Holder (fd O_CLOEXEC, default Python/Node)
  mati sementara anak yang di-spawn tetap hidup (tanpa fd) -> contender
  langsung memperoleh lock. Kematian parent melepaskan flock meskipun
  worker yatim masih hidup.
- **FLK-T8b — fd inheritable adalah BAHAYA NYATA.** Holder yang sama
  tetapi fd dibuat inheritable dan diwariskan ke anak (pass_fds) -> setelah
  holder mati, contender TETAP terblokir selama anak hidup. Ini membuktikan
  persyaratan CLOEXEC bukan teori: bila runtime membuka fd lock tanpa
  CLOEXEC dan worker mewarisinya, flock tidak pernah lepas sampai worker
  mati — startup parent baru macet. Persyaratan ini wajib diverifikasi di
  staging untuk API open yang dipakai runtime produksi (U-29).

## 6. Batas bukti (yang TIDAK dibuktikan di sini)

- Semua bukti dari VM ini (Node v24.22.1, Bun 1.4.4, Linux, `/proc`
  tersedia, berjalan sebagai root) — BUKAN dari runtime artifact produksi.
  Perilaku flock, `/proc`, dan supervisor di runtime produksi belum terbukti
  (U-1, U-12, U-15, U-16, U-22); uji ulang staging tetap wajib.
- **NFS tidak diuji.** flock di atas NFS tidak tercakup oleh FLK-T1..T8;
  bila direktori lock produksi berada di NFS, flock TIDAK BOLEH diandalkan
  tanpa bukti staging (U-30).
- **Binding flock untuk runtime Node murni belum terbukti** (fs-ext gagal
  dibangun di VM ini karena pembatasan sandbox). Yang terbukti adalah
  `bun:ffi` pada Bun 1.4.4. Bila produksi memakai Node, binding wajib
  dibuktikan di staging (U-29).
- **Daur ulang inode tidak teramati di VM ini** (0/30 tmpfs, 0/30 overlay).
  Token dipertahankan sebagai defense-in-depth (lihat §4c) — bukan sebagai
  klaim yang terbukti menahan beban di sini.
- **Verifikasi ulang adalah pemeriksaan sesaat.** Antara verifikasi ulang
  terakhir dan tindakan destruktif pertama tetap ada jendela mikro;
  kerusakannya dibatasi oleh validasi identitas per-sinyal (§A.5.5.2 —
  starttime + cmdline diperiksa sesaat sebelum tiap SIGKILL). Jendela ini
  dicatat sebagai U-31.
- **Masa transisi versi campuran tetap berbahaya.** ADV-T6 membuktikan dua
  pemilik dapat terjadi bila versi lama dan baru berjalan bersamaan; jaring
  pengaman (verifikasi ulang) menangkapnya sebelum cleanup, tetapi
  satu-satunya penutup struktural adalah flag-day (U-28).
- **flock adalah advisory (kooperatif).** Proses yang tidak memanggil flock
  (operator `rm`, tooling lain, versi lama) tidak terhalang olehnya.
  Perlindungan terhadap pihak ketiga yang ceroboh hanyalah verifikasi ulang
  + runbook (jangan pernah `rm` file lock saat parent berjalan) — bukan
  penegakan kernel.
- PostgreSQL tidak tersedia di environment ini; mekanisme lease global tetap
  mengacu pada bukti v2.2 (SQLite teruji; PostgreSQL wajib diuji di staging).
- STARTUP-10 tetap teruji di VM ini, tetapi balapan reklamasi di bawah beban
  dan latensi runtime produksi belum teruji; uji ulang staging tetap wajib
  sebelum cutover.
