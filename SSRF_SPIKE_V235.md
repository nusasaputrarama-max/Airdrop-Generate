# BUKTI UJI v2.3.5 — FLOCK STARTUP LOCK SECURITY REVIEW (AG-001)

- **Tanggal:** 7 November 2026 — **Revisi desain v2.3.5**
- **Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED. File ini berisi
  bukti eksperimen untuk evaluasi, BUKAN persetujuan implementasi.
- **Ruang lingkup bukti:** implementasi referensi v2.3.5 di
  `spike-harness-v235/` (Bun + Node + Python, proses/kernel nyata di VM ini,
  BUKAN runtime artifact produksi). Tidak ada kode aplikasi artifact
  (`cek-link-airdrop`), database, katalog, atau data produksi yang diubah.
- **Hasil ringkas:** suite adversarial AUTH **18/18 PASS × 2 run**
  (RUN=1 dan RUN=2, hasil identik kecuali pemenang simetris AUTH-T1);
  regresi v2.3.4 **ADV fixed-code 4/4 × 2, FLK-T1..T8 9/9 tmpfs + 9/9 overlay,
  bun-flock-sanity OK**; **AUTH-T9c NOT RUN** (tidak ada NFS di VM ini);
  suite startup v2.3.2 (SU-T1..SU-T9) **NOT RUN** (dependensi `/tmp` hilang —
  lihat §0.4).

## §0. Catatan kejujuran sebelum membaca angka

### §0.1 Klaim "aman" tidak didasarkan pada tes lokal saja

Angka PASS di file ini membuktikan perilaku implementasi referensi di VM
ini terhadap interleaving yang diuji — BUKAN membuktikan startup lock
aman di runtime produksi. Argumen keamanan (mengapa protokol mencegah
dua pemilik lock, termasuk saat crash, restart, mixed-version, dan
penggantian inode) ada di `SSRF_REMEDIATION_DESIGN.md` §A.5.5.4e–§A.5.5.4f.
Yang belum dapat dibuktikan dicatat eksplisit di §7 (NOT VERIFIED),
bukan disembunyikan di balik angka PASS.

### §0.2 Perjalanan diagnosis AUTH-T3 — tiga kegagalan awal, tiga perbaikan

Suite AUTH pertama yang dijalankan dalam revisi ini menghasilkan
**13/17 PASS** (RUN=1, 7 Nov 2026 ~19:54 WIB). Empat kegagalan itu
bukan ditutupi — masing-masing didiagnosis sampai ke akar penyebab,
diperbaiki, dan dijalankan ulang sampai 18/18 × 2. Rinciannya ada di §4
(zombie) dan §3 (T5c, Python):

1. **AUTH-T3 FAIL (2× berturut-turut):** parent #2 tidak pernah READY
   setelah parent #1 di-SIGKILL; pidfile tidak pernah ditulis ulang;
   worker lama tetap hidup. Diagnosis bertahap membuktikan akar
   penyebabnya adalah **zombie**: orkestrator membunuh P1 tetapi event
   loop-nya terblokir `Atomics.wait` sehingga P1 tidak pernah di-reap
   (state `Z` di `/proc`, `kill(pid,0)` tetap SUCCEEDS); `pidAlive()`
   v2.3.4 yang hanya memakai `kill(pid,0)` mengklasifikasi holder
   zombie sebagai hidup → `lock-record-contradiction` → P2 keluar.
   Bukti langsung di §4.1 (output verbatim `zombiecheck2.cjs`).
   Perbaikan desain: `pidAlive()` menjadi **zombie-aware** (baca state
   `/proc/<pid>/stat`; `Z`/`X` = tidak hidup). Tes baru AUTH-T11
   membuktikan perbaikan (lihat §4.3).
2. **AUTH-T4 FAIL + AUTH-T9b tidak dilaporkan + AUTH-T7 FAIL:** ketiga
   tes Python tidak pernah berjalan — `flock-compat.py` dan
   `supervisor-stub.py` ditulis dengan komentar gaya JS (`//`) di baris
   pertama, yang bukan komentar Python (`SyntaxError: invalid character
   '—'`). Perbaikan: komentar diganti `#`. Bukan cacat desain — cacat
   harness, diperbaiki sebelum run ulang. (Catatan: kegagalan T9b kedua
   adalah bug harness lain — contender memakai `try:` setelah `;` pada
   baris logis yang sama, `SyntaxError`; diperbaiki dengan baris
   terpisah. Kegagalan T4 pertama juga disebabkan child mewarisi pipe
   stdout orkestrator sehingga `subprocess.run` menunggu 30 detik —
   diperbaiki dengan `DEVNULL` untuk stdio child.)
3. **AUTH-T5c FAIL:** interleaving yang dimaksud tidak terjadi — B
   (old-code) di-spawn bersamaan dengan A dan membaca record hidup
   milik A sebelum sempat unlink, sehingga keluar
   `held-by-live-holder`. Perbaikan koreografi: B di-spawn DULU,
   tunggu sinyal `probed.B`, baru spawn A. Setelah perbaikan, hazard
   direproduksi sesuai rancangan (B memperoleh lock, A mendeteksi).
4. **AUTH-T3 — false positive scan (ditemukan saat diagnosis manual):**
   pemindaian `/proc` versi awal mencocokkan marker sebagai SUBSTRING
   — shell `bash -c` yang menjalankan parent mengandung string
   `v235-parent` di cmdline-nya dan terdeteksi sebagai "parent lain".
   Perbaikan: marker harus cocok sebagai TOKEN argv yang persis
   (cmdline dipecah `\0`). Temuan ini dicatat sebagai risiko U-40
   (sudah ditutup di v2.3.5) dan aturannya masuk §A.5.5.4f.

Tidak ada satu pun angka PASS di file ini yang diambil dari run sebelum
perbaikan di atas tanpa menjalankan ulang. Seluruh suite dijalankan ulang
penuh (RUN=1 dan RUN=2) SETELAH semua perbaikan.

### §0.3 Harness direkonstruksi — /tmp di-wipe di tengah revisi

Selama revisi ini layanan di-restart dan seluruh `/tmp` di-wipe. Harness
v2.3.5 dibangun ulang di lokasi persisten
`~/workspace/airdrop-generate-foundation/spike-harness-v235/` dan
SELURUH suite dijalankan ulang dari nol setelah rekonstruksi; tidak ada
angka yang diambil dari run pra-restart tanpa menjalankan ulang.
Skrip diagnostik `zombiecheck2.cjs` disalin ke harness sebagai
`zombie-diagnosis.cjs` agar dapat dijalankan ulang. Log run disimpan di
harness (`auth-run1.log`, `auth-run2.log`, `flkadv-run1.log`,
`flkadv-run2.log`, `flk-tmpfs-run1.log`, `bun-flock-sanity.log`).

### §0.4 Suite startup v2.3.2 (SU-T1..SU-T9) NOT RUN — bukan regresi

Regresi SU-T1..SU-T9 (harness `spike-harness-v232/`) TIDAK dapat
dijalankan dalam revisi ini: runner-nya meng-hardcode
`DIR = '/tmp/ssrf-v232'` dan file worker di sana hilang saat `/tmp`
di-wipe (`ls: cannot access '/tmp/ssrf-v232/'`). Runner gagal di
`spawnWorker()` dengan `Error: worker tidak ready dalam 5 dtk`.
Worker itu sendiri TIDAK rusak — dijalankan langsung dari salinan
harness ia mencetak `{"ready":true,"pid":7188}`. Perubahan v2.3.5
tidak menyentuh satu pun file harness v232 (implementasi referensi
yang terpisah), sehingga tidak ada alasan teknis mengharapkan regresi
di sana — tetapi karena suite tidak berjalan, statusnya adalah
**NOT RUN, bukan PASS**. Menjalankan ulang SU-T1..SU-T9 (setelah
memperbaiki path harness v232 ke lokasi persisten) adalah prasyarat
staging, dicatat di §7.

### §0.5 Satu koreksi dokumentasi v2.3.4

Pernyataan penutup `SSRF_REMEDIATION_DESIGN.md` v2.3.4 mengatribusikan
empat klarifikasi v2.3.3 (koreksi jumlah run, reklamasi lock yang
diperkeras, STARTUP-10, durabilitas pidfile) kepada v2.3.4; v2.3.4
sebenarnya menjawab SATU keberatan (race condition pada reklamasi
startup lock). Kesalahan atribusi ini dikoreksi di revisi v2.3.5
(lihat changelog desain).

## §1. Fakta environment (yang terverifikasi dari VM ini)

| Fakta | Nilai terukur | Perintah / cara |
| --- | --- | --- |
| Bun | 1.4.4 | `bun --version` |
| Node | v24.22.1 | `node --version` |
| Python | 3.12.3 | `python3 --version` |
| `/tmp` | tmpfs, `size=524288k`, `inode64` | `/proc/mounts` |
| `/` | overlay, `fsync=volatile`, `redirect_dir=on`, `metacopy=on`, `xino=on` | `/proc/mounts` |
| `/home/hatch` | overlay di atas btrfs `/dev/mapper/rv` (`compress-force=zstd:3,ssd,discard=async,space_cache=v2,subvolid=256`) | `/proc/mounts` |
| NFS | TIDAK ADA di VM ini (`grep -i nfs /proc/mounts` kosong) | — |
| `/proc` | tersedia | `ls /proc/1/stat` |
| PID 1 | `systemd` (state `Ss`) — init yang me-reap orphan | `ps -p 1`; uji orphan: grandchild `/proc` hilang setelah 2 dtk |
| `bun:ffi` → libc `flock` | TERBUKTI (acquire / EWOULDBLOCK errno 11 / release on close) | `bun-flock-sanity.js` → `BUN FFI FLOCK OK` |
| `fs-ext` untuk Node | GAGAL dibangun (ketiga kalinya — v2.3.4, v2.3.5 awal, v2.3.5 akhir): `npm install fs-ext` → `node-gyp EPERM fchown` (pembatasan sandbox, bukan cacat fs-ext) | `npm install fs-ext` di `/tmp/fsext-retest2` |
| Runtime artifact produksi (versi Bun/Node, ketersediaan `bun:ffi` di dalam sandbox artifact) | **TIDAK DAPAT DIVERIFIKASI dari VM ini** — hanya Bun CLI VM yang terverifikasi | lihat §7 (U-34) |
| Filesystem direktori lock produksi | **TIDAK DAPAT DIVERIFIKASI dari VM ini** | lihat §7 (U-35) |

## §2. Keputusan desain v2.3.5 (yang diuji suite AUTH)

Keputusan-keputusan ini dibuat selama revisi dan diimplementasikan pada
implementasi referensi `spike-harness-v235/startup-flock-v235.js`,
`parent-stub.js`, dan `worker-stub.js`. Detail argumen ada di desain
§A.5.5.4e–§A.5.5.4f; di sini hanya ringkasan yang terikat pada bukti:

1. **Otoritas = flock kernel pada fd yang dipegang, bukan pemeriksaan
   identitas.** `(dev,ino)` + token adalah DETEKTOR penggantian path
   (authority fork), bukan otoritas. Setiap tindakan sensitif (SIGKILL
   worker lama, tulis pidfile, spawn worker, transisi READY) didahului
   `assertOwnership()` segar dalam tick sinkron yang sama tanpa `await`
   di antaranya (`guardedAction`). Jendela mikro tidak dapat dibuat nol
   dengan syscall file biasa, tetapi tiap tindakan destruktif itu sendiri
   di-gating identitas: SIGKILL → validasi per-sinyal (§A.5.5.2);
   pidfile membawa token lock dan worker MENOLAK melayani bila token
   tidak cocok SEBELUM lookup pertamanya — sehingga konsekuensi otoritas
   basi adalah fail-closed.
2. **CLOEXEC DIVERIFIKASI, bukan diasumsikan.** Setelah open, flag
   O_CLOEXEC diperiksa via `/proc/self/fdinfo`; bila tidak set, startup
   gagal. Fd lock tidak pernah diwariskan ke child (tidak ada `pass_fds`
   atas fd lock; worker menerima token lewat file, bukan fd).
3. **Mixed-version fail-closed (dua lapis).** Record lock membawa
   `protocol: "flock-v2"`. Setelah flock berhasil, record yang ada
   DIKLASIFIKASI sebelum ditimpa: protokol lama + holder hidup →
   lepas flock, keluar `held-by-old-version`, tulis sentinel
   `startup.lock.mixed`; record tak terbaca → lepas flock, keluar
   `lock-record-unreadable` (MEMPERKETAT aturan v2.3.4 yang mengizinkan
   record tak terbaca sebagai observabilitas-only — aturan itu berasumsi
   operasi versi tunggal dan tidak aman bila holder lama yang hidup
   dapat bersembunyi di balik record korup). Pre-start guard: sebelum
   acquire, parent baru memindai `/proc` untuk proses parent lain
   (marker cmdline); bila parent lain hidup → keluar
   `other-parent-alive` tanpa acquire.
4. **Pidfile flock (domain flock kedua).** Parent memegang flock kedua
   pada pidfile. Sebelum melayani lookup pertamanya, worker mem-probe
   pidfile (LOCK_EX\|LOCK_NB): probe BERHASIL → tidak ada parent hidup
   yang memegangnya → worker MENOLAK melayani; probe gagal EWOULDBLOCK
   DAN `pidfile.lockToken == lockRecord.token` → worker melayani. Probe
   diulang saat IPC parent terputus dan berkala. Worker membedakan fase
   startup (alasan transient di-retry s.d. 3 dtk: pidfile belum ditulis
   parent-nya, flock pidfile belum dipegang saat ppid hidup) dari fase
   serve (semua kegagalan final).
5. **Liveness zombie-aware (perbaikan dari diagnosis AUTH-T3).**
   `pidAlive()` membaca state `/proc/<pid>/stat` dulu: `Z` (zombie)
   atau `X`/`x` (dead) → TIDAK hidup; hanya `R`/`S`/`D`/`T` yang
   dihitung hidup. Fallback `kill(pid,0)` hanya bila `/proc` tidak
   dapat dibaca (error non-ESRCH → `"uncertain"`). Perbaikan ini
   menutup kasus holder zombie yang memblokir startup (AUTH-T11).
6. **Scan parent: token argv persis, bukan substring.** Marker harus
   cocok sebagai token argv yang persis (cmdline dipecah `\0`) —
   pencocokan substring menemukan shell peluncur sebagai "parent lain"
   (false positive yang tertangkap saat diagnosis AUTH-T3).

## §3. Suite adversarial AUTH — hasil dan detail per tes

Orkestrator: `spike-harness-v235/run-auth-tests.cjs`. Semua tes memakai
proses/kernel nyata (Bun/Node/Python), barrier deterministik untuk
interleaving, BUKAN mock. Setiap tes dijalankan 2× (RUN=1, RUN=2).
Log verbatim: `spike-harness-v235/auth-run1.log` dan `auth-run2.log`.

### §3.1 Output verbatim RUN=1 (18/18 PASS)

```
=== SUITE v2.3.5-AUTH (RUN=1) Bun 1.4.4 + Node v24.22.1 + Python 3.12.3 ===
AUTH-T1 :: PASS | owners=1 (A acq=true, B acq=false, reasons: A=null, B=held-by-live-holder)
AUTH-T2 :: PASS | A verifiedAfterInterference=false cleanupCalls=0 ino 1268->1271 | B (opener baru) acq=true
AUTH-T3 :: PASS | p1Ready w1AliveBefore=true w1AliveAfterCrash=true | p2Ready=true w1Dead=true w2Alive=true dnsWorkerCount=1 w1=6129 w2=6187
AUTH-T4 :: PASS | blockedWhileChildAlive=true acquiredAfterChildDeath=true childPid=6199
AUTH-T5a :: PASS | old acq=true oldAlive=true | new acq=false reason=other-parent-alive others=6202
AUTH-T5b :: PASS | old acq=true | new acq=false reason=held-by-old-version holderPid=6224 sentinelWritten=true
AUTH-T5c :: PASS | B(old) acq=true | A(flock) verifiedAfter=false cleanupCalls=0 (hazard direproduksi, jaring pengaman menangkap)
AUTH-T6 :: PASS | guarded: actionRan=false ownershipLost=true | KONTROL tanpa revalidasi: actionRan=true (jendela nyata, revalidasi kedua yang menutupnya)
AUTH-T7 :: PASS | p2Ready=true w1AliveAfterCrash=true w1Dead=true w2Alive=true dnsWorkerCount=1
AUTH-T8a :: PASS | corrupt record -> reason=lock-record-unreadable | setelah operator menghapus file -> acq=true
AUTH-T8b :: PASS | old acq=true oldAlive=true | new reason=lock-record-unreadable (lapis scan akan menangkapnya lebih dulu bila aktif)
AUTH-T9a :: PASS | open di /sys (read-only): openSucceeded=false errno=EROFS failClosed=true
AUTH-T9c :: NOT RUN | tidak ada NFS di VM ini (mount/proc/mounts kosong); flock di NFS wajib diuji di staging (FLK-07)
AUTH-T10a :: PASS | parentReady=true workerCheck.serve=true reason=ok
AUTH-T10b :: PASS | worker exit setelah token diganti in-place: dead=true recheckReason=token-mismatch
AUTH-T10c :: PASS | parent SIGKILL -> worker exit sendiri: dead=true recheckReason=pidfile-lock-not-held-no-live-parent
AUTH-T10d :: PASS | pidfile di-rename (inode baru) -> worker exit: dead=true recheckReason=pidfile-lock-not-held-no-live-parent
AUTH-C1 :: PASS | bun cloexecDefault=true node cloexecDefault=true python F_SETFD round-trip: CLEARED=True SET_AGAIN=True BEFORE=True
AUTH-T11 :: PASS | zombieSetup=true (P1 state=Z, kill0=SUCCEEDS) | p2Ready=true w1Dead=true w2Alive=true dnsWorkerCount=1 w1=6453 w2=6465
=== HASIL RUN=1: 18/18 expectations matched ===
```

### §3.2 Output verbatim RUN=2 (18/18 PASS)

```
=== SUITE v2.3.5-AUTH (RUN=2) Bun 1.4.4 + Node v24.22.1 + Python 3.12.3 ===
AUTH-T1 :: PASS | owners=1 (A acq=false, B acq=true, reasons: A=held-by-live-holder, B=null)
AUTH-T2 :: PASS | A verifiedAfterInterference=false cleanupCalls=0 ino 1410->1413 | B (opener baru) acq=true
AUTH-T3 :: PASS | p1Ready w1AliveBefore=true w1AliveAfterCrash=true | p2Ready=true w1Dead=true w2Alive=true dnsWorkerCount=1 w1=6547 w2=6574
AUTH-T4 :: PASS | blockedWhileChildAlive=true acquiredAfterChildDeath=true childPid=6591
AUTH-T5a :: PASS | old acq=true oldAlive=true | new acq=false reason=other-parent-alive others=6599
AUTH-T5b :: PASS | old acq=true | new acq=false reason=held-by-old-version holderPid=6613 sentinelWritten=true
AUTH-T5c :: PASS | B(old) acq=true | A(flock) verifiedAfter=false cleanupCalls=0 (hazard direproduksi, jaring pengaman menangkap)
AUTH-T6 :: PASS | guarded: actionRan=false ownershipLost=true | KONTROL tanpa revalidasi: actionRan=true (jendela nyata, revalidasi kedua yang menutupnya)
AUTH-T7 :: PASS | p2Ready=true w1AliveAfterCrash=true w1Dead=true w2Alive=true dnsWorkerCount=1
AUTH-T8a :: PASS | corrupt record -> reason=lock-record-unreadable | setelah operator menghapus file -> acq=true
AUTH-T8b :: PASS | old acq=true oldAlive=true | new reason=lock-record-unreadable (lapis scan akan menangkapnya lebih dulu bila aktif)
AUTH-T9a :: PASS | open di /sys (read-only): openSucceeded=false errno=EROFS failClosed=true
AUTH-T9c :: NOT RUN | tidak ada NFS di VM ini (mount/proc/mounts kosong); flock di NFS wajib diuji di staging (FLK-07)
AUTH-T10a :: PASS | parentReady=true workerCheck.serve=true | reason=ok
AUTH-T10b :: PASS | worker exit setelah token diganti in-place: dead=true recheckReason=token-mismatch
AUTH-T10c :: PASS | parent SIGKILL -> worker exit sendiri: dead=true recheckReason=pidfile-lock-not-held-no-live-parent
AUTH-T10d :: PASS | pidfile di-rename (inode baru) -> worker exit: dead=true recheckReason=pidfile-lock-not-held-no-live-parent
AUTH-C1 :: PASS | bun cloexecDefault=true node cloexecDefault=true python F_SETFD round-trip: CLEARED=True SET_AGAIN=True BEFORE=True
AUTH-T11 :: PASS | zombieSetup=true (P1 state=Z, kill0=SUCCEEDS) | p2Ready=true w1Dead=true w2Alive=true dnsWorkerCount=1 w1=6842 w2=6854
=== HASIL RUN=2: 18/18 expectations matched ===
```

Satu-satunya perbedaan antar run: pemenang AUTH-T1 bertukar (A di RUN=1,
B di RUN=2) — balapan simetris, yang diuji adalah "tepat satu pemilik",
bukan siapa yang menang. Semua baris lain identik.

### §3.3 Detail per tes

Format tiap tes: (1) setup & urutan interleaving, (2) expected, (3) actual,
(4) pengulangan, (5) kernel/runtime nyata vs mock, (6) batasan.

**AUTH-T1 — dua parent berebut lock pada inode yang sama.**
(1) Dua proses `parent-stub.js` mode `acquire-only` di-spawn bersamaan
pada path lock yang sama. (2) Tepat satu pemilik (`acquired=true`),
yang kalah `held-by-live-holder`, 0 cleanup. (3) RUN=1: A menang, B
`held-by-live-holder`; RUN=2: B menang, A `held-by-live-holder`.
(4) 2×. (5) Kernel nyata (flock via `bun:ffi`), proses Bun nyata.
(6) Hanya menguji kontensi pada inode yang sama; tidak menguji
unlink/penggantian path (itu AUTH-T2/T5).

**AUTH-T2 — path lock di-unlink + dibuat ulang saat fd lama memegang flock.**
(1) A acquire (`verify-after-interference`), orkestrator meng-unlink path
dan membuat file baru (inode berubah 1268→1271 RUN=1, 1410→1413 RUN=2),
lalu memberi sinyal `interfered`; A verifikasi ulang; B (opener baru)
mencoba acquire pada inode baru. (2) A: `verifiedAfterInterference=false`,
`cleanupCalls=0`; B: `acq=true` (membuktikan dua inode = dua domain
flock). (3) Sesuai expected, 2×. (5) Kernel nyata. (6) Membuktikan
deteksi, bukan pencegahan — pencegahan adalah never-unlink (§A.5.5.4c).

**AUTH-T3 — parent crash (SIGKILL) saat worker stubborn masih hidup.**
(1) P1 mode `full` (worker `serve-nocheck`, stubborn) → READY; P1
di-SIGKILL; P2 mode `full` (worker `serve`) → harus cleanup W1 dan
READY. (2) `p2Ready=true`, `w1Dead=true`, `w2Alive=true`,
`dnsWorkerCount=1`, `w2 != w1`. (3) RUN=1: `w1=6129 w2=6187`;
RUN=2: `w1=6547 w2=6574` — sesuai expected. (4) 2× (plus 2× FAIL
sebelum perbaikan zombie-aware — lihat §4). (5) Proses/kernel nyata.
(6) Crash yang diuji adalah SIGKILL pada parent; crash pada worker
diuji di AUTH-T10c. Supervisor yang me-restart parent adalah
AUTH-T7, bukan tes ini.

**AUTH-T4 — descriptor diwariskan ke child.**
(1) Python `flock-compat.py`: proses induk memegang flock pada fd,
lalu mem-fork child dengan `pass_fds=[fd]` (fd diwariskan); induk mati;
contender mencoba flock. (2) Contender BLOCKED selama child hidup,
ACQUIRED setelah child mati. (3) `blockedWhileChildAlive=true`,
`acquiredAfterChildDeath=true` (childPid 6199 RUN=1, 6591 RUN=2).
(4) 2×. (5) Kernel nyata, Python `fcntl.flock` (bukan mock).
(6) Membuktikan bahaya pewarisan fd — mitigasinya adalah CLOEXEC
(AUTH-C1 + verifikasi fdinfo). Tes ini memakai Python sebagai
pembanding independen terhadap implementasi Bun.

**AUTH-T5a — mixed-version: old parent hidup, new parent dengan scan aktif.**
(1) Old parent (`old-parent-stub.cjs`, kode v2.3.3 beku) acquire dulu
dan hidup; new parent di-spawn dengan pre-start scan AKTIF.
(2) New keluar `other-parent-alive` tanpa acquire, tanpa cleanup.
(3) `others=[6202]` RUN=1, `[6599]` RUN=2. (4) 2×. (5) Proses nyata
(Node + Bun). (6) Scan bergantung pada `/proc` dan marker cmdline
yang unik — lihat U-32/U-40.

**AUTH-T5b — mixed-version: klasifikasi record, scan DINONAKTIFKAN.**
(1) Seperti T5a tetapi new parent dijalankan dengan `V235_NO_SCAN=1`
(test-only) sehingga lapis klasifikasi diuji sendiri. (2) New keluar
`held-by-old-version`, `holderPid` = old parent, sentinel
`startup.lock.mixed` tertulis. (3) Sesuai expected 2×
(`holderPid=6224` RUN=1, `6613` RUN=2, `sentinelWritten=true`).
(5) Proses nyata. (6) `V235_NO_SCAN=1` adalah flag TEST-ONLY —
produksi TIDAK BOLEH menonaktifkan scan; flag ini tidak ada di
rancangan implementasi.

**AUTH-T5c — mixed-version: new-first, old unlink (regresi ADV-T6).**
(1) Koreografi mengikat: B (old-code) di-spawn DULU, tunggu sinyal
`probed.B`, baru spawn A (flock); A acquire; orkestrator menulis
`acquired.A`; B meng-unlink path lock A lalu acquire sendiri; sinyal
`interfered`; A verifikasi ulang. (2) KEDUA pihak memperoleh lock
(bahaya direproduksi), tetapi A: `verifiedAfterInterference=false`,
`cleanupCalls=0`. (3) Sesuai expected 2×. (5) Proses nyata.
(6) Membuktikan jaring pengaman, BUKAN pencegahan — pencegahan
struktural adalah flag-day (§A.5.5.4d, U-28). Tanpa koreografi
probed-first, tes berdegenerasi (B membaca record hidup A dan
menyerah sebelum unlink — kegagalan run pertama, §0.2 butir 3).

**AUTH-T6 — jendela mikro: guarded vs unguarded (kontrol).**
(1) Parent acquire, verifikasi OK, tunggu `interfered` (orkestrator
meng-unlink + recreate path), lalu jalankan tindakan: mode
`guarded-action` (revalidasi kedua dulu) vs mode `unguarded-action`
(kontrol, tanpa revalidasi). (2) Guarded: `actionRan=false`,
`ownershipLost=true`; kontrol: `actionRan=true`. (3) Sesuai expected
2×. (5) Proses/kernel nyata. (6) Membuktikan jendela mikro itu NYATA
(kontrol menjalankannya) DAN revalidasi kedua menutupnya — tetapi
jendela antara revalidasi kedua dan tindakan tetap tidak nol
(residual U-38).

**AUTH-T7 — supervisor restart + cleanup.**
(1) `supervisor-stub.py`: spawn parent #1 (`full`, worker
`serve-nocheck`) → tunggu READY → SIGKILL parent #1 → spawn parent #2
(`full`, worker `serve`) → verifikasi worker lama mati, worker baru
hidup, tepat 1 dns-worker. (2) `p2Ready=true`, `w1Dead=true`,
`w2Alive=true`, `dnsWorkerCount=1`. (3) Sesuai expected 2×.
(5) Proses nyata (Python supervisor + Bun parents). (6) Supervisor
di sini adalah stub Python — supervisor platform produksi TETAP
NOT VERIFIED (U-22, SUP-01). Stub membuktikan alur parent-baru
membersihkan worker lama, bukan perilaku supervisor platform.

**AUTH-T8a — lock file corrupt / tidak dapat dibaca (tanpa holder).**
(1) Tulis record korup ke path lock (bukan JSON valid), lalu parent
baru mencoba acquire. (2) Keluar `lock-record-unreadable` (fail-closed);
setelah operator menghapus file, acquire berhasil. (3) Sesuai
expected 2×. (5) Proses nyata. (6) Aturan ini MEMPERKETAT v2.3.4
(yang mengizinkan record tak terbaca sebagai observabilitas-only) —
alasannya di §A.5.5.4f: holder lama yang hidup dapat bersembunyi di
balik record korup.

**AUTH-T8b — lock file corrupt + holder lama HIDUP.**
(1) Old parent hidup memegang lock; record di path dirusak; new parent
(mit scan aktif) mencoba acquire. (2) New keluar
`lock-record-unreadable`. (3) Sesuai expected 2× (catatan log:
lapis scan akan menangkapnya lebih dulu bila aktif — dalam tes ini
scan aktif dan old parent terdeteksi, tetapi alasan yang dilaporkan
adalah klasifikasi record; kedua lapis fail-closed ke arah yang sama).
(5) Proses nyata. (6) Tes ini tidak membedakan lapis mana yang
menolak lebih dulu — keduanya menolak; pemisahan lapis diuji
di T5a (scan) vs T5b (klasifikasi).

**AUTH-T9a — filesystem read-only.**
(1) `rofs-test.js`: buka `O_RDWR|O_CREAT` di bawah `/sys` (mount
read-only). (2) Open gagal `EROFS`, fail-closed, tidak ada lock
yang diklaim. (3) `openSucceeded=false errno=EROFS failClosed=true`,
2×. (5) Kernel + mount nyata. (6) Hanya membuktikan open gagal
fail-closed pada fs read-only; tidak membuktikan perilaku flock pada
fs tersebut (tidak ada file yang dapat di-lock).

**AUTH-T9b — POSIX lockf vs flock (gotcha).**
(1) Python `flock-compat.py`: pegang POSIX lock (`fcntl.lockf`) pada
fd1, tutup fd2 (fd lain pada file yang sama), contender mencoba
`lockf` — lalu ulangi dengan `fcntl.flock`. (2) POSIX: contender
ACQUIRED (close fd mana pun melepas semua POSIX lock proses itu);
flock: contender tetap BLOCKED (flock terikat open file description,
bukan proses). (3) `posixReleasedByClosingOtherFd=true`,
`flockSurvivesClosingOtherFd=true`, 2×. (5) Kernel nyata (Python
`fcntl`). (6) Hasil ini MELARANG penggunaan `lockf`/POSIX lock
sebagai pengganti flock — perilaku pelepasannya berbeda secara
fundamental. Bukan tes perilaku produksi, melainkan tes pembuktian
pemilihan primitif.

**AUTH-T9c — flock di NFS. NOT RUN.** Tidak ada NFS di VM ini
(`/proc/mounts` kosong untuk nfs). Wajib diuji di staging (FLK-07,
U-30). Bukan kegagalan — tidak ada bukti yang diklaim.

**AUTH-T10a — worker token self-check, kasus normal.**
(1) Parent `full` (worker `serve`) → READY. (2) `workerCheck.serve=true`,
`reason=ok`. (3) Sesuai expected 2×. (5) Proses nyata.
(6) Kasus kontrol untuk T10b–T10d.

**AUTH-T10b — token diganti in-place (tanpa ganti inode).**
(1) Setelah parent READY, orkestrator menimpa isi pidfile dengan
token berbeda (inode sama, konten berbeda). (2) Worker exit sendiri,
`recheckReason=token-mismatch`. (3) Sesuai expected 2×.
(5) Proses nyata. (6) Membuktikan worker TIDAK mengandalkan inode
pidfile saja — token diperiksa pada tiap recheck.

**AUTH-T10c — parent mati (SIGKILL).**
(1) Parent `full` READY, lalu di-SIGKILL; worker `serve` mendeteksi
lewat probe berkala. (2) Worker exit sendiri,
`recheckReason=pidfile-lock-not-held-no-live-parent`. (3) Sesuai
expected 2×. (5) Proses nyata. (6) Probe berkala worker adalah
pertahanan lapis kedua setelah self-exit via `disconnect`/ppid
watchdog (PARENT-T1a/T1b v2.3.1) — tes ini membuktikan lapis probe
berdiri sendiri.

**AUTH-T10d — pidfile di-rename (inode baru, konten identik).**
(1) Setelah READY, orkestrator me-rename pidfile ke nama baru lalu
membuat pidfile baru dengan konten IDENTIK (inode baru, token sama).
(2) Worker exit sendiri,
`recheckReason=pidfile-lock-not-held-no-live-parent` — karena flock
pidfile terikat inode lama yang sudah tidak dipegang siapa pun di
path baru. (3) Sesuai expected 2×. (5) Proses nyata.
(6) Membuktikan probe pidfile flock mendeteksi penggantian path
bahkan bila konten tidak berubah — (dev,ino) saja tidak cukup,
flock pada path-lah yang berbicara.

**AUTH-C1 — verifikasi O_CLOEXEC default + F_SETFD.**
(1) Bun `cloexec-check.js`, Node `cloexec-check.cjs`: buka fd baru,
baca `/proc/self/fdinfo` — flag harus mengandung O_CLOEXEC
(`02100001` oktal). Python: `F_SETFD` round-trip (clear → set →
verifikasi). (2) `cloexecDefault=true` untuk Bun dan Node;
Python `CLEARED=True SET_AGAIN=True BEFORE=True`. (3) Sesuai
expected 2×. (5) Runtime nyata + `/proc` nyata. (6) Membuktikan
DEFAULT runtime — implementasi TETAP wajib memverifikasi fdinfo
setelah open (§A.5.5.4e), karena default dapat berubah antar
versi/API open.

**AUTH-T11 — zombie liveness (BARU v2.3.5).**
(1) P1 `full` → READY; P1 di-SIGKILL TANPA di-reap (event loop
orkestrator sengaja diblokir `sleepSync`, menirukan supervisor yang
tidak me-reap); verifikasi setup: P1 state `Z` DAN `kill(pid,0)`
SUCCEEDS; P2 `full` di-spawn dalam kondisi itu. (2) `p2Ready=true`,
`w1Dead=true`, `w2Alive=true`, `dnsWorkerCount=1`. (3) RUN=1:
`zombieSetup=true (P1 state=Z, kill0=SUCCEEDS)`, `w1=6453 w2=6465`;
RUN=2: `zombieSetup=true`, `w1=6842 w2=6854`. (4) 2×.
(5) Proses/kernel nyata. (6) Tes ini SENGAJA tidak me-reap P1
sebelum spawn P2 — ia menguji perbaikan desain, bukan harness.
Tanpa perbaikan zombie-aware, P2 keluar `lock-record-contradiction`
(dibuktikan §4.1). Residual: perbaikan bergantung pada `/proc`;
runtime tanpa `/proc` kembali ke fallback `kill(pid,0)` (U-37).

## §4. Diagnosis AUTH-T3 — zombie (bukti langsung)

### §4.1 Bukti langsung: zombie memblokir parent baru (sebelum perbaikan)

Skrip diagnostik: `spike-harness-v235/zombie-diagnosis.cjs` (disalin dari
`/tmp/zombiecheck2.cjs`). Alur: P1 `full` → READY → SIGKILL TANPA reap
(event loop diblokir `sleepSync`) → periksa state `/proc` P1 → spawn P2
→ blokir event loop 8 dtk selama P2 berjalan → yield → baca output P2.

Output verbatim:

```
P1 pid: 5903 ready: true
P1 state (no reap): {"state":"Z","starttime":"216551"} | kill(pid,0): SUCCEEDS | p1.exitCode: null
W1 alive: true
P1 state during P2 run (still blocked): {"state":"Z","starttime":"216551"} | p2.exitCode (before yield): null
P2 exit code: 0 | P2 stdout: "{\"id\":\"parent\",\"pid\":5915,\"mode\":\"full\",\"acquired\":false,\"reason\":\"lock-record-contradiction\",\"others\":null,\"holderPid\":null,\"cleanupCalls\":0}" | P2 stderr: ""
pidfile after P2: {"parentPid":5903,"workerPid":5909,"workerStarttime":"216554","workerToken":"955697ab665111e8d642488b7c605fc8","lockToken":"3535239a5ccd3f66922a1b9912c1bfcc","writtenAt":1794057376331,"version":2}
parent-ready exists: false
W1 alive after: true
P1 state after yield+reap: {"state":"(gone:ENOENT)","starttime":null} | p1.exitCode: null
```

Pembacaan bukti:

1. P1 setelah SIGKILL tanpa reap: state `/proc` = **`Z` (zombie)**,
   `kill(pid,0)` = **SUCCEEDS**, `exitCode` masih `null` (belum di-reap).
   Zombie ada di tabel proses sampai di-reap — `kill(pid,0)` tidak dapat
   membedakan zombie dari proses hidup.
2. P2 keluar dengan `reason: "lock-record-contradiction"` — ia TIDAK
   pernah sampai ke cleanup; pidfile tidak berubah (masih record P1);
   W1 tetap hidup; `parent-ready` tidak ada.
3. Rantai penyebab lengkap: `classifyLockRecord` membaca record lama
   (protokol `flock-v2`, pid P1) → `pidAlive(P1)` memakai `kill(pid,0)`
   → zombie → `true` → `readProcStat(P1)` masih mengembalikan starttime
   asli (zombie mempertahankan `/proc/<pid>/stat`) → starttime cocok →
   `flock-v2-contradiction` → acquire ditolak.
4. Setelah yield, P1 ter-reap (hilang dari `/proc`) — membuktikan
   zombie itu artefak tidak-me-reap, bukan proses yang masih hidup.

Arah kegagalan ini **fail-closed** (tidak ada dua pemilik), tetapi
memblokir startup tanpa batas bila supervisor tidak segera me-reap.
Dua lapis penyebab: (a) cacat harness — orkestrator sinkron
(`Atomics.wait`) memblokir event loop sehingga anak yang mati tidak
di-reap; (b) cacat desain v2.3.4 — `pidAlive()` buta-zombie.
Keduanya diperbaiki: (a) bukan cacat desain — tetapi orkestrator
tetap memakai pola sinkron, sehingga perbaikan desain harus tahan
terhadap supervisor yang tidak me-reap; (b) `pidAlive()` menjadi
zombie-aware (lihat §2 butir 5).

### §4.2 Hipotesis yang SALAH dan dibuang (dicatat agar tidak diulang)

Selama diagnosis, dua hipotesis sempat dipertimbangkan lalu DIBUKTIKAN
SALAH — dicatat di sini agar tidak diangkat lagi:

1. **"Bun mem-fork sehingga PID spawn ≠ PID proses asli."**
   Observasi awal: di debug shell manual, `$!` = 3859 sedangkan PID
   parent di dalam proses = 3863. Verifikasi langsung
   (`/tmp/pidcheck2.cjs`, spawn via Node, cwd benar): spawn pid =
   real pid = **4506 == 4506**. Bun TIDAK mem-fork. Selisih 3859 vs
   3863 adalah artefak shell (`$!` pada background job `bash -c`),
   bukan perilaku Bun. Mekanisme selisih shell itu TIDAK ditentukan —
   dicatat sebagai U-39 (supervisor harus membunuh berdasarkan PID
   yang tercatat di pidfile/record, bukan PID yang di-spawn, dan
   memverifikasi kematian via `/proc`).
2. **"P2 macet (hang) sebelum mencetak apa pun."** Observasi awal:
   stdout DAN stderr P2 kosong di orkestrator. Ternyata P2 TIDAK macet
   — ia keluar cepat dengan `lock-record-contradiction`, tetapi
   orkestrator tidak pernah membaca pipenya karena event loop terblokir
   `Atomics.wait` selama `waitForFile`. Output P2 baru terlihat setelah
   yield. Pelajaran harness: `spawnProc._out()` hanya terisi bila event
   loop berjalan; diagnosis kegagalan child HARUS yield dulu sebelum
   membaca output yang ditangkap.

### §4.3 Perbaikan dan bukti pasca-perbaikan

Perbaikan desain (satu fungsi, `startup-flock-v235.js`):

```js
function pidAlive(pid) {
  const st = readProcStat(pid);
  if (st) {
    if (st.state === "Z" || st.state === "X" || st.state === "x") return false;
    return true;
  }
  try { process.kill(pid, 0); return true; } catch (e) { return e && e.code !== "ESRCH" ? "uncertain" : false; }
}
```

`readProcStat` sudah mengembalikan `state` (field pertama setelah
`)` di `/proc/<pid>/stat`) — tidak ada syscall baru, hanya pembacaan
yang sudah dilakukan. Setelah perbaikan: AUTH-T3 PASS 2/2 dan AUTH-T11
PASS 2/2 (lihat §3.1–§3.2). Perbaikan yang sama juga menutup jalur
kedua yang rentan zombie: konfirmasi exit worker di mode `full`
(`pidAlive(workerPid)` setelah SIGKILL — zombie worker kini dinilai
mati, bukan "exit tidak terkonfirmasi").

## §5. Regresi v2.3.4 (diulang dalam revisi ini)

### §5.1 ADV fixed-code (harness v2.3.4) — 4/4 × 2

`spike-harness-v234/run-flock-adv-tests.cjs`, log:
`spike-harness-v235/flkadv-run1.log`, `flkadv-run2.log`.

RUN=1:
```
=== SUITE v2.3.4-ADV FIXED-CODE (RUN=1) Bun 1.4.4 + Node v24.22.1 ===
ADV-T2 :: PROPERTY HOLDS | owners=A | A(acq=true,reason=ok) B(acq=false,reason=held-by-live-holder) | finalLockPid=6933
ADV-T2sim :: PROPERTY HOLDS | owners=A | A(acq=true,reason=ok) B(acq=false,reason=held-by-live-holder) | finalLockPid=6954
ADV-T5 :: DETECTED | A(acq=true,verifiedAfterInterference=false,cleanupCalls=0) | aIno=1557 newIno=1559 inodeChanged=true
ADV-T6 :: mixed-version hazard=REPRODUCED (both acquired) | A(flock,acq=true,verifiedAfter=false,cleanupCalls=0,myIno=1562) B(old-code,acq=true,reason=ok,myIno=1566) | safetyNet=A DETECTED invalid ownership, no cleanup | finalLockPid=6980 finalIno=1566 inodeReused=false
=== HASIL RUN=1: 4/4 expectations matched ===
```

RUN=2: `4/4 expectations matched` (pemenang T2sim bertukar ke B —
simetris; T2/T5/T6 identik). ADV-T6 tetap mereproduksi hazard
transisi (kedua pihak memperoleh lock) dengan jaring pengaman yang
menangkapnya — hasil ini TIDAK berubah oleh v2.3.5 dan tetap menjadi
dasar flag-day (§A.5.5.4d) + lapis baru §A.5.5.4f.

### §5.2 Semantik flock kernel FLK-T1..T8 — 9/9 tmpfs + 9/9 overlay

`spike-harness-v234/flock-semantics.py` (Python `fcntl`, kernel nyata).
Log: `spike-harness-v235/flk-tmpfs-run1.log`; run overlay di
`spike-harness-v235/flk-overlay-v235/`.

tmpfs (`/tmp/flk-tmpfs-v235b`):
```
PASS FLK-T1 :: contender flock NB while held -> acquired=False errno=11 (11=EWOULDBLOCK expected)
PASS FLK-T2 :: contender flock NB after holder SIGKILL -> acquired=True errno=None
PASS FLK-T3 :: contender flock NB after holder close -> acquired=True errno=None
PASS FLK-T4 :: second open+close in holder process, contender says BLOCKED (BLOCKED expected)
PASS FLK-T5 :: after unlink+recreate, new opener flock NB -> acquired=True (True proves TWO holders can coexist -> never-unlink is load-bearing)
PASS FLK-T6 :: fstype=tmpfs dir=/tmp/flk-tmpfs-v235b contender flock NB while held -> acquired=False errno=11
PASS FLK-T7 :: contender flock NB after LOCK_UN -> acquired=True errno=None
PASS FLK-T8a :: CLOEXEC holder died, orphan child alive (no fd), contender flock NB -> acquired=True (True expected)
PASS FLK-T8b :: INHERITABLE fd holder died, orphan child holds fd, contender flock NB -> acquired=False errno=11 (False/11 expected: hazard is REAL if CLOEXEC is forgotten)
=== HASIL RUN=1 (/tmp/flk-tmpfs-v235b): 9/9 PASS ===
```

overlay (`/home/hatch/.../flk-overlay-v235`): 9/9 PASS dengan baris yang
sama kecuali `FLK-T6 :: fstype=overlay`. Perilaku identik di kedua
filesystem.

### §5.3 bun-flock-sanity — OK

`spike-harness-v234/bun-flock-sanity.js`, log
`spike-harness-v235/bun-flock-sanity.log`:
```
flock fd1 EX|NB -> 0 errno 0
flock fd2 EX|NB -> -1 errno 11 (11=EWOULDBLOCK expected)
flock fd3 EX|NB after close -> 0 (0 expected: released on close)
BUN FFI FLOCK OK
```

## §6. Matriks tes

| ID | Tes | RUN=1 | RUN=2 | Status akhir |
| --- | --- | --- | --- | --- |
| AUTH-T1 | Dua parent berebut lock, inode sama | PASS | PASS | PASS × 2 |
| AUTH-T2 | Unlink + recreate saat fd lama memegang flock | PASS | PASS | PASS × 2 |
| AUTH-T3 | Parent crash, worker stubborn hidup | PASS | PASS | PASS × 2 (FAIL 2× sebelum perbaikan zombie-aware) |
| AUTH-T4 | Fd diwariskan ke child | PASS | PASS | PASS × 2 |
| AUTH-T5a | Mixed-version, scan aktif | PASS | PASS | PASS × 2 |
| AUTH-T5b | Mixed-version, klasifikasi record (scan off) | PASS | PASS | PASS × 2 |
| AUTH-T5c | Mixed-version new-first, old unlink (regresi ADV-T6) | PASS | PASS | PASS × 2 |
| AUTH-T6 | Jendela mikro guarded vs unguarded | PASS | PASS | PASS × 2 |
| AUTH-T7 | Supervisor restart + cleanup | PASS | PASS | PASS × 2 |
| AUTH-T8a | Record korup, tanpa holder | PASS | PASS | PASS × 2 |
| AUTH-T8b | Record korup + holder lama hidup | PASS | PASS | PASS × 2 |
| AUTH-T9a | Filesystem read-only | PASS | PASS | PASS × 2 |
| AUTH-T9b | POSIX lockf vs flock | PASS | PASS | PASS × 2 |
| AUTH-T9c | flock di NFS | NOT RUN | NOT RUN | **NOT RUN** (tidak ada NFS di VM) |
| AUTH-T10a | Worker self-check normal | PASS | PASS | PASS × 2 |
| AUTH-T10b | Token diganti in-place | PASS | PASS | PASS × 2 |
| AUTH-T10c | Parent mati | PASS | PASS | PASS × 2 |
| AUTH-T10d | Pidfile di-rename | PASS | PASS | PASS × 2 |
| AUTH-C1 | O_CLOEXEC default + F_SETFD | PASS | PASS | PASS × 2 |
| AUTH-T11 | Zombie liveness (BARU) | PASS | PASS | PASS × 2 |
| ADV-T2/T2sim/T5/T6 | Regresi v2.3.4 fixed-code | 4/4 | 4/4 | PASS × 2 |
| FLK-T1..T8 tmpfs | Regresi semantik flock | 9/9 | — (1× di revisi ini; 9/9 × 2 di v2.3.4) | PASS |
| FLK-T1..T8 overlay | Regresi semantik flock | 9/9 | — (1× di revisi ini; 9/9 × 2 di v2.3.4) | PASS |
| bun-flock-sanity | `bun:ffi` flock | OK | — | PASS |
| SU-T1..SU-T9 (v2.3.2) | Startup NOT_READY/identitas/pidfile/lock | NOT RUN | NOT RUN | **NOT RUN** (dependensi `/tmp/ssrf-v232` hilang) |

Catatan matriks: FLK tmpfs/overlay dijalankan 1× dalam revisi ini
(sebelumnya 9/9 × 2 di v2.3.4 — tidak ada perubahan pada kode yang
diuji FLK sejak itu, kecuali `pidAlive` yang tidak dipakai jalur
flock-semantics Python). SU-T1..SU-T9 tidak dijalankan karena
alasan lingkungan (§0.4), bukan karena kegagalan.

## §7. Yang belum dapat dibuktikan (NOT VERIFIED — baca sebelum menyimpulkan)

1. **Runtime artifact produksi (U-34).** Versi Bun/Node di dalam
   sandbox artifact, dan apakah `bun:ffi` tersedia di sana, TIDAK
   dapat diverifikasi dari VM ini. Yang terbukti hanya Bun CLI 1.4.4
   di VM. Bila runtime produksi memakai Node, tidak ada binding flock
   yang terbukti (`fs-ext` gagal dibangun 3× karena pembatasan sandbox
   node-gyp, U-29). Konsekuensi: implementasi flock TIDAK BOLEH
   diasumsikan bekerja di produksi tanpa probe staging (FLK-06).
2. **Filesystem direktori lock produksi (U-35).** Jenis filesystem,
   dukungan semantik flock, dan apakah mount/inode dapat diganti oleh
   container/deployment/supervisor TIDAK dapat diverifikasi dari VM
   ini. Yang teruji hanya tmpfs dan overlay di VM ini (FLK-T1..T8
   identik di keduanya). Konsekuensi: lokasi lock WAJIB di filesystem
   lokal dengan `df`/`mount` yang didokumentasikan saat implementasi;
   NFS dilarang tanpa bukti staging (U-30, FLK-07).
3. **Supervisor platform (U-22/U-36).** Apakah platform me-restart
   proses saat crash dan apakah ia membunuh seluruh process group
   TIDAK terdokumentasi dan tidak dapat diperiksa dari VM ini.
   AUTH-T7 membuktikan alur cleanup oleh parent baru, BUKAN perilaku
   supervisor platform. Konsekuensi: klaim "tidak ada yatim" hanya
   berlaku sejauh dua lapis teruji (self-exit + pidfile cleanup);
   SUP-01 tetap wajib di staging.
4. **Perilaku flock/binding/`/proc`/signal di runtime produksi
   (U-1/U-12/U-15/U-16).** Seluruh bukti AUTH/ADV/FLK berasal dari
   VM ini. Staging re-test tetap wajib (gerbang G6) sebelum cutover.
5. **flock di NFS (U-30, AUTH-T9c).** Tidak ada NFS di VM ini; tidak
   ada bukti apa pun. Bila direktori lock produksi ternyata di NFS,
   seluruh argumen flock dalam dokumen ini tidak berlaku sampai
   dibuktikan di staging.
6. **Prefix NSP di luar dua prefix NAT64 yang dikenal (U-11).**
   Tetap TERBUKA — tidak disentuh revisi ini; kriteria penurunan
   status tidak berubah (dokumentasi egress + uji staging S-49/S-50).
7. **Batas lintas instance 8N (U-18/U-23).** Batas orphaned tetap PER
   PROSES; tidak ada batas global. Tidak disentuh revisi ini.
8. **PostgreSQL lease (LSE-06).** Mekanisme lease PostgreSQL tetap
   BELUM TERUJI (tidak ada PostgreSQL di VM ini). Tidak disentuh
   revisi ini.
9. **SU-T1..SU-T9 (v2.3.2).** NOT RUN dalam revisi ini karena
   dependensi `/tmp` hilang (§0.4). Bukan bukti regresi, bukan bukti
   lolos — wajib dijalankan ulang (setelah memperbaiki path harness)
   sebelum cutover.
10. **Jendela mikro residual (U-38).** Revalidasi dan tindakan adalah
    dua syscall terpisah; jendela di antaranya tidak dapat dibuat nol
    dengan syscall file biasa. Yang dibuktikan AUTH-T6 adalah
    konsekuensi jendela itu fail-closed (tindakan tidak berjalan bila
    otoritas hilang; SIGKILL di-gating identitas per-sinyal; worker
    menolak token yang tidak cocok) — BUKAN bahwa jendela itu tidak
    ada. Pihak ketiga yang mengganti file TEPAT di antara revalidasi
    dan tindakan tetap mungkin secara teori; dampaknya dibatasi, bukan
    dihilangkan.
11. **PID spawn vs PID pelayan (U-39).** Selisih PID yang teramati pada
    peluncuran via shell (3859 vs 3863) mekanismenya TIDAK ditentukan;
    pada spawn Node langsung, PID spawn == PID proses (4506 == 4506).
    Sampai mekanisme dipahami, supervisor WAJIB membunuh berdasarkan
    PID yang tercatat di pidfile/record dan memverifikasi kematian via
    state `/proc`, bukan mengandalkan PID yang di-spawn.
12. **Liveness tanpa `/proc` (bagian dari U-37).** Perbaikan
    zombie-aware bergantung pada `/proc/<pid>/stat`. Pada runtime
    tanpa `/proc`, `pidAlive()` kembali ke `kill(pid,0)` dan zombie
    kembali diklasifikasi hidup. Bila runtime produksi tidak
    menyediakan `/proc`, risiko zombie kembali — staging wajib
    memverifikasi ketersediaan `/proc` di runtime produksi.
13. **Advisory flock (U-33).** flock tidak menghentikan proses yang
    tidak memanggilnya (kode lama, operator `rm`, tooling pihak
    ketiga). Never-unlink adalah aturan + runbook, bukan penegakan
    kernel. Satu-satunya penutup struktural terhadap dua pemilik di
    luar masa transisi adalah flag-day + verifikasi ulang — dan
    verifikasi ulang adalah detektor, bukan pencegah.

## §8. Inventaris file (revisi v2.3.5)

- `SSRF_SPIKE_V235.md` — file ini.
- `SSRF_REMEDIATION_DESIGN.md` — diperbarui ke v2.3.5 (changelog,
  §A.5.5.4e, §A.5.5.4f, §D.4.13, §G U-31 diperbarui + U-32..U-40,
  §H G6/G7, koreksi atribusi v2.3.4 di pernyataan penutup).
- `spike-harness-v235/` — implementasi referensi + orkestrator + log:
  - `startup-flock-v235.js` — referensi v2.3.5 (acquire, klasifikasi,
    `verifyFlockOwnership`/`assertOwnership`/`guardedAction`, pidfile
    flock, `pidAlive` zombie-aware, scan token-persis, heartbeat).
  - `parent-stub.js` — siklus parent lengkap (acquire-only,
    verify-after-interference, guarded/unguarded-action, full).
  - `worker-stub.js` — self-check worker (fase startup/serve,
    probe pidfile flock, token).
  - `old-parent-stub.cjs` — simulator parent versi lama (kode v2.3.3
    beku, `startup-v233.cjs`).
  - `supervisor-stub.py`, `flock-compat.py`, `rofs-test.js`,
    `cloexec-check.js`, `cloexec-check.cjs` — stub pendukung.
  - `run-auth-tests.cjs` — orkestrator AUTH-T1..T11 + AUTH-C1.
  - `zombie-diagnosis.cjs` — diagnostik zombie §4.1 (dapat dijalankan
    ulang: `node zombie-diagnosis.cjs`).
  - `auth-run1.log`, `auth-run2.log` — output verbatim suite AUTH.
  - `flkadv-run1.log`, `flkadv-run2.log` — regresi ADV fixed-code.
  - `flk-tmpfs-run1.log`, `bun-flock-sanity.log` — regresi FLK/sanity.
  - `flk-overlay-v235/` — artefak run FLK overlay (file lock uji).

---

*Status akhir file ini: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.
Tidak ada kode aplikasi, database, katalog, atau build produksi yang
diubah dalam penyusunan revisi ini.*
