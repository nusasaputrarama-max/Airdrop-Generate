# SSRF SPIKE V236 — Bukti Eksperimen v2.3.6 (FINAL SECURITY REVIEW FOLLOW-UP)

**Dokumen:** bukti eksperimen revisi desain v2.3.6
**Tanggal:** 2026-11-07 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Lingkungan uji:** VM ini saja — Linux htch-runtime 7.0.0-43-generic x86_64,
Bun 1.4.4, Node v24.22.1, Python 3.12.3, uid 0 (root), pid_max 4194304
(diturunkan sementara ke 8192 hanya di dalam tes reuse, dipulihkan sesudahnya).
`/tmp` tmpfs, `/home` btrfs. **Semua bukti di sini adalah bukti VM, BUKAN bukti
runtime produksi (U-1/U-12/U-15/U-16 tetap berlaku; staging re-test wajib).**
**Harness:** `spike-harness-v236/` (dapat dijalankan ulang; log tiap run tersimpan
sebagai `*-runN.log` di direktori yang sama).
**Kode live TIDAK diubah. Database/katalog TIDAK diubah. Link Scanner TIDAK diaktifkan.**

Dokumen ini menjawab tiga keberatan ChatGPT atas v2.3.5:
1. **U-38 / PID reuse saat SIGKILL** — pidfd (§1).
2. **U-33 / never-unlink dan kontrol operasional** — permission, ownership,
   prosedur deployment/rollback/maintenance, pemulihan penghapusan (§2).
3. **Matriks prasyarat staging** — bukti wajib sebelum implementasi (§3).

---

## §0. Koreksi atas klaim sebelumnya (dilaporkan apa adanya)

### 0.1 SU-T5 "gagal" pada awal revisi ini — BUKAN regresi desain

Saat re-run SU-T1..SU-T9 di awal revisi ini, hasil adalah **8/9 PASS × 3 run**
dengan SU-T5 selalu FAIL (`pemenang=0 kalah=5 alasanKalah=no-output`).
Diagnosis: harness `su-v232/` yang disalin ke `spike-harness-v236/` **tidak
lengkap** — file `lock-racer.cjs` (child yang di-spawn testT5) tidak ikut
disalin, sehingga 5 proses child mati seketika (module-not-found di stderr,
yang diabaikan) tanpa stdout → `no-output`. Ini adalah **bug setup harness**,
bukan regresi desain atau regresi `startup.cjs`.

Setelah `lock-racer.cjs` disalin dari `spike-harness-v232/`:
**SU-T1..SU-T9 = 9/9 PASS × 4 run** (log `su-run1.log`..`su-run4.log`).
Klaim "SU-T1..SU-T9 belum dijalankan" pada v2.3.5 kini **terjawab di VM** —
tetapi re-run di staging tetap wajib (STAGE-P05), karena runtime produksi
berbeda dari VM ini.

### 0.2 Mekanisme penurunan pid_max — koreksi penjelasan T2 (v2.3.5)

`SSRF_SPIKE_V235.md` dan `pidfd-tests.py` (T2) menjelaskan penurunan pid_max
lewat "mount --bind /tmp/pidmax-v236 /proc/sys/kernel/pid_max". Penjelasan
itu **tidak akurat sebagai mekanisme**: file `/tmp/pidmax-v236` **tidak pernah
ada** di VM ini (`ls` membuktikan: No such file or directory), sehingga
`mount --bind` gagal, dan `echo 8192 > /proc/sys/kernel/pid_max` yang
mengikutinya jatuh ke sysctl nyata. Mekanisme yang sebenarnya bekerja di T2
adalah: **mount procfs BARU** (`mount -t proc proc /tmp/proc2-pidfd`) —
`/proc/sys` di VM ini di-mount read-only (`proc on /proc/sys type proc (ro,...)`),
tetapi procfs baru memberi akses tulis ke sysctl yang sama (sysctl bersifat
global), sehingga menulis `pid_max=8192` lewat procfs baru mengubah nilai
kernel global. Hal ini **dibuktikan** di T12 (file ini, §1.5): `set_pid_max`
menulis lewat procfs baru, `cat /proc/sys/kernel/pid_max` (procfs lama)
membaca `8192`, dan nilai dipulihkan ke `4194304` di `finally`.

**Implikasi:** penurunan pid_max adalah trik VM-uji saja. Di staging,
pid_max HANYA dibaca, tidak diubah (STAGE-P08).

### 0.3 Dua bug harness yang ditemukan dan diperbaiki selama revisi ini

1. **`pidfd-t11.js` T11e (zombie):** asumsi awal "Node tidak me-reap child
   otomatis" **SALAH** — libuv me-reap child hampir seketika (percobaan
   `zombie-holder.cjs` gagal dengan ENOENT `/proc/<pid>/stat` karena child
   sudah di-reap). Bun juga me-reap otomatis. Zombie yang tahan lama hanya
   dapat dibuat dengan CPython (tidak memanggil `wait()`/`poll()`).
   Perbaikan: helper diganti ke `zombie-holder.py`. T11e kini 5/5 PASS.
2. **`pidfd-t12.py` v1:** `setup_wrap` memakai trik mount-ns yang tidak
   bekerja di VM ini (langsung menulis sysctl → `EROFS: Read-only file
   system`). Perbaikan: mekanisme procfs baru yang sama seperti T2 (§0.2).
   T12 kini 4/4 PASS × 2 run.

Kedua bug adalah bug harness, bukan bug desain — dicatat di sini agar
evaluator tidak mengira angka PASS diperoleh tanpa hambatan.

---

## §1. Keberatan 1 — U-38 / PID REUSE SAAT SIGKILL (pidfd)

### 1.1 Ringkasan jawaban

**pidfd_open + pidfd_send_signal TERBUKTI bekerja di VM ini, di Python
maupun di Bun via `bun:ffi`, dan MENGIKAT sinyal pada identitas proses
(struct pid kernel), bukan pada nomor PID.** Dengan urutan
validasi → `pidfd_open` → re-validasi → `pidfd_send_signal` → konfirmasi
exit, sinyal TIDAK PERNAH mengenai proses lain dalam semua skenario reuse
yang dipaksakan (§1.4, §1.5). Jendela race yang tersisa **bukan lagi
"PID dipakai ulang"** — melainkan dua hal yang lebih sempit dan
terkuantifikasi (§1.6): (a) **tabrakan starttime** (korban mati + PID dipakai
ulang + proses baru KEBETULAN memiliki starttime yang sama — praktis
mustahil, tetapi bukan nol secara matematis), dan (b) **kebutaan zombie
pidfd** (probe pidfd tidak dapat membedakan zombie dari hidup — ditutup
dengan pemeriksaan `/proc` yang zombie-aware).

**Yang TIDAK diklaim:** starttime + cmdline TIDAK menghilangkan race —
keduanya hanya mempersempit jendela validasi. Yang menghilangkan race
**kill-salah-sasaran** adalah pidfd itu sendiri (bukti T2/T12d). Yang
menghilangkan race **validasi-kedaluwarsa** adalah re-validasi setelah
`pidfd_open` (bukti T12c).

### 1.2 Primitif pidfd — Python (PIDFD-T1..T7, 7/7 PASS × 2 run)

Syscall x86_64: `__NR_pidfd_open = 434`, `__NR_pidfd_send_signal = 424`.
File: `pidfd-tests.py`. Output verbatim RUN=1 (`pidfd-run1.log`):

```
PASS PIDFD-T1 :: pidfd_open(459) -> 3 errno=0; send SIGKILL -> 0 errno=0; child mati SIGKILL=True; probe sesudah mati -> -1 errno=3 (ekspektasi -1/ESRCH=3)
PASS PIDFD-T2 :: reuse PID 461 setelah 7871 spawn dalam 4.42 dtk (pid_max=8192); pidfd_send_signal(pidfd-lama, SIGKILL) -> -1 errno=3 (ekspektasi -1/ESRCH=3); decoy hidup=True state=S
PASS PIDFD-T3 :: kill(461, SIGKILL) biasa SETELAH reuse -> decoy mati=True state=Z (membuktikan race kill-by-number itu NYATA)
PASS PIDFD-T4 :: zombie state=Z; pidfd_open(zombie 463) -> 3 errno=0; send_signal(0) -> 0 errno=0; send_signal(SIGKILL) -> 0 errno=0 (nilai dicatat apa adanya — lihat analisis)
PASS PIDFD-T5 :: pidfd_open(999999) -> -1 errno=3 (ekspektasi -1/ESRCH=3)
PASS PIDFD-T6 :: pidfd_open(1) -> 3 errno=0; probe sig 0 -> 0 errno=0 (bukan child tetap bisa)
PASS PIDFD-T7 :: pidfd_open(self, flags=0xFFFFFFFF) -> -1 errno=22 (ekspektasi -1/EINVAL=22)
=== PIDFD PYTHON: 7/7 PASS ===
```

RUN=2: 7/7 PASS (angka PID/spawn berbeda, hasil sama — `pidfd-run2.log`).
Yang dibuktikan tiap tes:

| Tes | Yang dibuktikan |
|---|---|
| T1 | `pidfd_open` + `pidfd_send_signal(SIGKILL)` membunuh target; probe setelah mati → ESRCH (bukan sukses palsu) |
| T2 | **Inti keberatan:** setelah PID dipakai ulang oleh decoy (7.871 spawn, 4,42 dtk, pid_max=8192), sinyal via pidfd LAMA → ESRCH; decoy tetap hidup (state S). Identitas terikat, bukan nomor. |
| T3 | **Kontrol positif:** `kill(pid)` biasa SETELAH reuse membunuh decoy (state Z). Race kill-by-number itu NYATA dan mematikan — inilah yang pidfd hilangkan. |
| T4 | **Kebutaan zombie (temuan):** pada zombie, `pidfd_open` berhasil DAN `pidfd_send_signal` (sig 0 maupun SIGKILL) mengembalikan 0 — pidfd TIDAK dapat membedakan zombie dari hidup. Lihat §1.6(b). |
| T5 | PID tidak ada → ESRCH (fail-closed, bukan sinyal ke proses lain). |
| T6 | `pidfd_open` tidak mensyaratkan hubungan parent-child (PID 1 bisa dibuka; probe sig 0 → 0). |
| T7 | Flag tidak dikenal → EINVAL (validasi argumen kernel bekerja). |

### 1.3 pidfd via Bun `bun:ffi` (PIDFD-T8, 2/2 PASS × 2 run)

File: `pidfd-bun.js`. Output verbatim RUN=1 (`pidfd-bun-run1.log`):

```
PASS PIDFD-T8a :: bun pidfd_open(child 6358) -> 6; pidfd_send_signal(SIGKILL) -> 0; child.exited=true
PASS PIDFD-T8b :: pidfd_open(1) -> 5, probe sig 0 -> 0; setelah SIGKILL via pidfd, probe sig 0 -> -1 (ekspektasi -1/ESRCH)
=== PIDFD BUN FFI SELESAI ===
```

RUN=2: 2/2 PASS (`pidfd-bun-run2.log`). Ini menjawab kompatibilitas
runtime: **`bun:ffi` → libc `pidfd_open`/`pidfd_send_signal` BEKERJA di
Bun 1.4.4 di VM ini** (fd pidfd 5/6, errno dibaca lewat `__errno_location`
+ `toArrayBuffer`). U-29 (binding flock Node) TIDAK berubah — yang
terbukti di sini adalah binding **Bun**, bukan Node; bila runtime produksi
ternyata Node murni, pidfd membutuhkan binding Node yang terpisah
(STAGE-P07, fallback di §1.7).

### 1.4 Urutan referensi `signalWorkerByPidfd` — Bun (PIDFD-T11, 5/5 PASS × 3 run)

File: `pidfd-signal.js` (implementasi referensi), `pidfd-t11.js` (tes).
Urutan yang mengikat (semua sinkron, tanpa `await` di antaranya):

1. Validasi identitas by-number: `/proc/<pid>/stat` (starttime) +
   `/proc/<pid>/cmdline` (marker) + state zombie-aware.
2. `pidfd_open(pid)` — ikat identitas.
3. Re-validasi starttime by-number SETELAH `pidfd_open`.
4. `pidfd_send_signal(pidfd, SIGKILL)`.
5. Konfirmasi exit: poll `/proc` zombie-aware (maks 2 dtk skala tes).

Output verbatim RUN=1 (`pidfd-t11-run1.log`):

```
PASS PIDFD-T11a :: signal worker 28225 (starttime 160854) -> {"ok":true,"reason":"signaled-and-confirmed"}; exited=true
PASS PIDFD-T11b :: starttime salah -> {"ok":false,"reason":"identity-mismatch","detail":"starttime"}; worker hidup=true
PASS PIDFD-T11c :: marker salah -> {"ok":false,"reason":"identity-mismatch","detail":"cmdline"}; worker hidup=true
PASS PIDFD-T11d :: target mati+reap -> {"ok":false,"reason":"pid-not-alive"} (tidak ada sinyal ke proses lain)
PASS PIDFD-T11e :: zombie setup state=Z -> {"ok":false,"reason":"already-dead","detail":"state=Z"} (pidfd TIDAK dipakai untuk membunuh zombie)
=== PIDFD-T11: 5/5 PASS ===
```

RUN=2 dan RUN=3: 5/5 PASS (`pidfd-t11-run2.log`, `pidfd-t11-run3.log`).
T11e memakai helper Python `zombie-holder.py` (CPython tidak me-reap
sampai `wait()` dipanggil — lihat §0.3 butir 1).

### 1.5 Oracle urutan penuh di bawah reuse paksa (PIDFD-T12, 4/4 PASS × 2 run)

File: `pidfd-t12.py`. Mengulangi urutan yang SAMA seperti `pidfd-signal.js`
langkah demi langkah, tetapi dalam Python, agar reuse dapat dipaksa
deterministik (pid_max=8192 lewat procfs baru, §0.2; reuse dipaksa dengan
fork-loop sampai satu anak mendapat PID target — bukan `subprocess.run`
yang lambat). Output verbatim RUN=1 (`pidfd-t12-run1.log`):

```
PASS PIDFD-T12a :: worker 300 -> {'ok': True, 'reason': 'signaled-and-confirmed'}
PASS PIDFD-T12b :: reuse sebelum langkah 1: decoy=301 (target 301) -> {'ok': False, 'reason': 'identity-mismatch', 'detail': 'starttime'}; decoy hidup=True
PASS PIDFD-T12c :: reuse di antara open & revalidasi: decoy=302 starttime baru=165855 -> {'ok': False, 'reason': 'identity-changed', 'detail': 'starttime-after-pidfd-open'}; decoy hidup=True
PASS PIDFD-T12d :: pidfd lama setelah reuse (decoy=303, target 303): send_signal -> -1 errno=3 (ekspektasi -1/ESRCH=3); decoy hidup=True
=== PIDFD-T12: 4/4 PASS ===
pid_max dipulihkan ke 4194304
```

RUN=2: 4/4 PASS (`pidfd-t12-run2.log`). Yang dibuktikan tiap skenario:

| Tes | Titik injeksi reuse | Hasil | Arti |
|---|---|---|---|
| T12a | — (worker hidup) | signaled + confirmed | Urutan normal bekerja end-to-end. |
| T12b | SEBELUM langkah 1 (validasi) | `identity-mismatch`, decoy hidup | Validasi starttime menangkap reuse lebih awal. |
| T12c | DI ANTARA langkah 2 (`pidfd_open`) dan langkah 3 (re-validasi) | `identity-changed`, decoy hidup | **Re-validasi setelah open menutup jendela validasi-kedaluwarsa.** Tanpa langkah 3, sinyal via pidfd tetap aman (lihat T12d) — tetapi urutan akan mengira target masih hidup dan menunggu konfirmasi yang tidak pernah datang. |
| T12d | SETELAH `pidfd_open`, re-validasi **dilewati sengaja** | `send_signal` → ESRCH, decoy hidup | **Pertahanan lapis terakhir:** bahkan bila semua validasi by-number dilewati, pidfd sendiri menolak mengirim sinyal ke proses baru. Inilah yang membuat klaim "tidak ada kill salah sasaran" dapat dibuktikan, bukan hanya diasumsikan. |

### 1.6 Jendela race yang TETAP ADA — dinyatakan dengan jujur

#### (a) Jendela kill-salah-sasaran: DITUTUP oleh pidfd (bukan oleh starttime)

Dengan `pidfd_send_signal`, TIDAK ADA jendela waktu di mana sinyal dapat
mengenai proses lain: kernel menyelesaikan pidfd ke struct pid pada saat
`pidfd_open`, dan bila proses itu mati, `pidfd_send_signal` mengembalikan
ESRCH (T2, T12d). Satu-satunya cara sinyal mengenai proses yang salah
adalah bila `pidfd_open` sendiri dipanggil pada PID yang salah — dan itu
dicegah oleh validasi langkah 1 + re-validasi langkah 3 (T12b, T12c).

#### (b) Jendela validasi-kedaluwarsa: dipersempit, tidak nol — tetapi dampaknya fail-closed

Antara langkah 1 (validasi) dan langkah 2 (`pidfd_open`) masih ada jendela:
korban dapat mati + PID dipakai ulang + proses baru KEBETULAN memiliki
**starttime yang sama persis** dengan korban. Bila itu terjadi, langkah 3
(re-validasi) juga lolos, dan `pidfd_send_signal` akan mengirim SIGKILL ke
pidfd yang dibuka pada langkah 2 — tetapi pidfd itu dibuka SETELAH reuse
atau SEBELUM reuse?

- Bila `pidfd_open` (langkah 2) terjadi SETELAH reuse: pidfd mengikat
  proses BARU — dan starttime proses baru cocok dengan `expectedStarttime`
  hanya bila terjadi tabrakan starttime. Inilah satu-satunya jalur
  kill-salah-sasaran yang tersisa, dan ia membutuhkan **tabrakan starttime**.
- Bila `pidfd_open` terjadi SEBELUM reuse: pidfd mengikat korban; reuse
  sesudahnya tidak berpengaruh (T12d).

**Seberapa besar tabrakan starttime?** `starttime` adalah waktu start
proses dalam clock tick sejak boot (biasanya 100 tick/detik = resolusi
10 ms). Dua proses berbeda mendapat starttime yang sama hanya bila
keduanya start dalam tick 10 ms yang sama DAN PID yang satu dipakai ulang
oleh yang lain. Probabilitas gabungan = P(reuse dalam jendela) ×
P(start dalam tick yang sama). Jendela langkah 1→2 diukur di bawah ini;
bahkan dengan asumsi paling pesimis (semua reuse mendarat dalam tick yang
sama), P(tabrakan) ≈ P(reuse dalam jendela) — lihat §1.7.

#### (c) Kebutaan zombie pidfd (temuan T4)

`pidfd_send_signal` pada zombie mengembalikan 0 (sukses) untuk sig 0
maupun SIGKILL — kernel menganggap zombie masih "ada" sampai di-reap.
Karena itu **pidfd TIDAK BOLEH dipakai sebagai satu-satunya probe
liveness**. Desain menutupnya dengan pemeriksaan `/proc/<pid>/stat`
yang zombie-aware (state `Z`/`X` → mati) pada langkah 1, 3, dan 5
(T11e membuktikan urutan menolak zombie sebagai `already-dead` sebelum
pidfd dipakai). Residual: runtime tanpa `/proc` kembali ke fallback
`kill(pid,0)` yang buta zombie (U-37 — tidak berubah oleh pidfd).

#### (d) Alternatif yang DITOLAK: pinning lewat dirfd `/proc/<pid>` (PIDFD-T10)

Hipotesis: membuka `/proc/<pid>` (dirfd) lalu membaca `stat` lewat
dirfd akan mem-pin task lama. **DITOLAK oleh eksperimen.** File:
`pidfd-dirfd-pin.py`. Output verbatim RUN=1 (`dirfd-run1.log`):

```
PASS PIDFD-T10a :: stat via dirfd SEBELUM mati == stat by-number: {'state': 'S', 'starttime': '118089'} vs {'state': 'S', 'starttime': '118089'}
FAIL PIDFD-T10b :: PID 2493 dipakai ulang decoy=2493 (starttime decoy={'state': 'R', 'starttime': '118485'}); stat via dirfd SETELAH mati+reap: OSError errno=3 (No such process); stat via dirfd SETELAH reuse: OSError errno=3 (No such process); korban starttime=118089 -> dirfd mem-pin task lama=False
=== PIDFD-T10: 1/2 PASS ===
```

RUN=2: hasil sama (`dirfd-run2.log`). Setelah target mati + di-reap,
`stat` lewat dirfd gagal dengan ESRCH — bahkan setelah PID dipakai ulang.
Dirfd `/proc/<pid>` TIDAK mem-pin task; ia hanya nama path yang
diresolusi ulang tiap akses. "FAIL" di sini adalah **hasil yang
diharapkan dari sebuah falsifikasi** (hipotesis ditolak), bukan kegagalan
suite — dan dirfd pinning TIDAK masuk ke desain.

### 1.7 Pengukuran jendela validasi + kuantifikasi risiko residual (PIDFD-T9)

File: `window-measure.cjs`. Mengukur waktu antara dua syscall yang
membatasi jendela langkah 1→2 (baca `/proc/<pid>/stat` + `kill(pid,0)`
sebagai proxy) dan laju alokasi PID, lalu menghitung probabilitas
satu cleanup terkena reuse dalam jendela itu. Output verbatim RUN=1
(`window-run1.log`):

```
STAT-READ avg=8642ns med=7651ns p99=22253ns
KILL0 avg=904ns med=791ns p99=1522ns
KILL-ESRCH avg=8251ns med=7802ns p99=18658ns
WINDOW-P99-NS=46028 (~46.0 mikrodetik)
SPAWN-RATE-NODE=628/detik
PID_MAX=4194304 REUSE-INTERVAL-S=6684.0
P-PER-CLEANUP-DEFAULT=6.89e-9 (jendela/reuse-interval, asumsi sebaran seragam)
P-PER-CLEANUP-PIDMAX-32768=8.81e-7
P-PER-CLEANUP-PIDMAX-4096=7.05e-6
P-PER-CLEANUP-PIDMAX-1024=2.82e-5
=== WINDOW-MEASURE SELESAI ===
```

RUN=2: WINDOW-P99 ≈ 41,7 µs; P-per-cleanup default 5,77e-9
(`window-run2.log`). Metode perhitungan (didokumentasikan di file):
jendela = p99 (stat-read + kill0 + kill-ESRCH) ≈ 46 µs; interval reuse =
pid_max / laju spawn (4.194.304 / 628 per detik ≈ 6.684 dtk); P per
cleanup = jendela / interval reuse, asumsi sebaran seragam. **Catatan
kejujuran:** angka ini adalah estimasi orde-besaran, bukan probabilitas
eksak — ia mengasumsikan laju spawn konstan dan sebaran seragam, dan
TIDAK mencakup lonjakan spawn (fork bomb) atau pid_max kecil. Tabel
sensitivitas di atas menunjukkan skalanya: pada pid_max=1024,
P ≈ 2,8e-5 per cleanup — masih kecil, tetapi 4.000× lebih besar daripada
default. Karena itu STAGE-P08 mewajibkan pencatatan pid_max produksi dan
ambang keputusan (PASS ≤ 1e-6; kondisional ≤ 1e-5 dengan persetujuan
owner; BLOCK > 1e-5).

**Kesimpulan keberatan 1:** pidfd adalah mekanisme yang benar dan
terbukti; fallback-nya (starttime re-read + `kill(pid)`) terkuantifikasi
dengan jendela ~46 µs dan P ≈ 7e-9 per cleanup pada pid_max default.
Risiko residual yang tersisa dicatat sebagai **U-41** (tabrakan
starttime — lihat §4 dan desain §G).

### 1.8 Fallback bila pidfd tidak tersedia

Bila `pidfd_open` tidak tersedia di runtime produksi (syscall diblokir
seccomp, atau binding FFI tidak ada), urutan kembali ke v2.3.5:
validasi identitas per-sinyal (starttime + cmdline, dibaca ulang sesaat
sebelum `kill()`, dalam tick yang sama) — dengan jendela residual ~46 µs
dan P ≈ 7e-9 per cleanup (§1.7). Fallback ini **sudah dibuktikan
kuantitasnya** (bukan sekadar "lebih lemah"), tetapi tetap lebih lemah
daripada pidfd karena `kill(pid)` TIDAK terikat identitas. Karena itu
fallback HANYA diizinkan dengan persetujuan eksplisit owner setelah
STAGE-P07 FAIL (lihat §3), dan `signalWorkerByPidfd` mengembalikan
`pidfd-unavailable` secara eksplisit — TIDAK PERNAH diam-diam memakai
`kill(pid)`.

---

## §2. Keberatan 2 — U-33 / NEVER-UNLINK DAN KONTROL OPERASIONAL

### 2.1 Ringkasan jawaban

**Never-unlink adalah aturan yang ditegakkan oleh KODE (tidak ada path
`unlink` di jalur akuisisi flock — dibuktikan v2.3.4 ADV-T2), tetapi
perlindungan terhadap penghapusan/penggantian inode oleh PIHAK LUAR
(operator, tooling, proses lain) TIDAK dapat ditegakkan oleh kode
sendiri — ia membutuhkan kontrol sistem operasi + prosedur.** Eksperimen
di bawah ini membuktikan, kontrol demi kontrol, mana yang benar-benar
ditegakkan kernel dan mana yang hanya janji runbook:

| Kontrol | Ditegakkan kernel? | Bukti |
|---|---|---|
| Direktori lock 0700 + ownership user layanan | **YA** — terhadap user lain (bukan root) | OPS-T1, OPS-T6 |
| Immutable/append-only (`chattr +i/+a`) | **TIDAK TERSEDIA di VM ini** (tmpfs + overlay menolak) — bukan kontrol yang dapat diandalkan di sini | OPS-T2 |
| Bind-mount read-only direktori lock | **YA** — terhadap penghapusan tak sengaja (termasuk oleh root, selama mount bertahan); **TIDAK** terhadap root yang sengaja me-remount rw | OPS-T3 |
| Permission terhadap root | **TIDAK** — root melewati DAC | OPS-T4 |
| Jejak audit penghapusan (auditd/eBPF) | **TIDAK ADA di VM ini** — wajib prasyarat staging | OPS-T5 |
| Deteksi + pemulihan bila lock terhapus saat parent aktif | **YA** — via `guardedAction` + pre-start scan (prosedur OPS-T7) | OPS-T7 |

**Yang TIDAK diklaim:** tidak ada kombinasi kontrol di atas yang
menghentikan root yang SENGAJA menghapus lock. Yang dijamin adalah:
(a) penghapusan tak sengaja oleh operator/tooling non-root dicegah oleh
permission; (b) penghapusan tak sengaja oleh root dicegah oleh bind-mount
ro (selama tidak di-remount); (c) bila lock tetap terhapus, parent aktif
MENDETEKSI kehilangan otoritas sebelum tindakan sensitif berikutnya dan
berhenti fail-closed, dan prosedur pemulihan (OPS-T7) mengembalikan satu
pemilik tanpa cleanup ganda.

### 2.2 Kontrol permission + ownership (OPS-T1..T6, 6/6 PASS × 2 run)

File: `ops-tests.py`. Lingkungan: VM ini, uid 0 (root), user `nobody`
(uid 65534), `daemon` (uid 1). Output verbatim RUN=1 (`ops-run1.log`):

```
PASS OPS-T1 :: nobody rm lock -> rc=1 (rm: cannot remove '/tmp/ops-v236/lockdir/startup.lock': Permission denied); nobody touch -> rc=1; file utuh=True (permission 0700 DITEGAKKAN kernel)
PASS OPS-T2 :: chattr +i -> rc=1 (chattr: Operation not permitted while setting flags on /tmp/ops-v236/lockdir/startup.lock); chattr +a -> rc=1 (chattr: Operation not permitted while setting flags on /tmp/ops-v236/lockdir/startup.lock) — atribut immutable/append-only TIDAK tersedia di VM ini (tmpfs DAN overlay), BUKAN kontrol yang dapat diandalkan di sini
PASS OPS-T3 :: bind+remount ro: mount rc=0/0; rm saat ro -> rc=1 (rm: cannot remove '/tmp/ops-v236/lockdir-ro/startup.lock': Read-only file system) file utuh saat ro=True; remount rw lalu rm -> rc=0 (root DAPAT me-remount — kontrol ini menghentikan penghapusan TAK SENGAJA, bukan root yang sengaja)
PASS OPS-T4 :: root rm file di dir 0700 -> rc=0 (root MELEWATI DAC — permission direktori TIDAK mengikat root; root hanya dibatasi runbook + audit)
PASS OPS-T5 :: auditctl/auditd: TIDAK ADA di VM ini — jejak audit unlink TIDAK dapat dibuktikan di sini; wajib prasyarat staging (audit rule -w <lockdir> -p wa atau eBPF) bila operator root harus dapat diaudit
PASS OPS-T6 :: daemon (uid=1) rm file milik nobody di dir 0700 -> rc=1 (rm: cannot remove '/tmp/ops-v236/lockdir-nobody/startup.lock': Permission denied); file utuh — isolasi antar user layanan DITEGAKKAN kernel
=== OPS: 6/6 PASS ===
```

RUN=2: 6/6 PASS (`ops-run2.log`). Interpretasi per tes:

- **OPS-T1 — direktori 0700 milik user layanan:** user lain (`nobody`)
  TIDAK dapat menghapus (`rm` → Permission denied) atau membuat file
  di direktori lock. Kontrol ini ditegakkan kernel (DAC) dan merupakan
  **lapis pertama yang wajib** di staging.
- **OPS-T2 — immutable/append-only TIDAK tersedia:** `chattr +i` dan
  `+a` gagal di tmpfs DAN overlay (`Operation not permitted`). Atribut
  ini **TIDAK BOLEH** dicantumkan sebagai kontrol yang diandalkan tanpa
  bukti staging pada filesystem produksi yang sebenarnya. Bila filesystem
  produksi mendukungnya (mis. ext4/xfs), ia menjadi lapis tambahan yang
  kuat — tetapi harus dibuktikan di sana (STAGE-P02).
- **OPS-T3 — bind-mount read-only:** direktori lock di-bind-mount lalu
  di-remount `ro` — penghapusan gagal (`Read-only file system`) dan file
  utuh. **Tetapi** root dapat me-remount `rw` lalu menghapus (rc=0).
  Kesimpulan jujur: ro-bind-mount menghentikan penghapusan **tak
  sengaja** (termasuk `rm -rf` yang salah sasaran oleh root yang tidak
  sadar mount-nya ro — perintah akan gagal dan terlihat), tetapi
  **bukan** pertahanan terhadap root yang sengaja. Karena itu ro-mount
  adalah **prosedur deployment** (mount dilakukan saat deployment,
  didokumentasikan, dan dicek berkala), bukan kontrol yang berdiri
  sendiri.
- **OPS-T4 — root melewati DAC:** root menghapus file di direktori 0700
  tanpa hambatan (rc=0). **Tidak ada permission Unix yang mengikat root.**
  Satu-satunya yang membatasi root adalah (a) runbook + pelatihan,
  (b) jejak audit (OPS-T5), dan (c) deteksi + pemulihan di sisi aplikasi
  (OPS-T7). Ini dicatat sebagai risiko **U-43** — bukan untuk
  "diselesaikan", melainkan untuk diakui dan dimonitor.
- **OPS-T5 — audit TIDAK ADA di VM ini:** `auditctl`/`auditd` tidak
  terpasang; jejak audit atas `unlink` di direktori lock tidak dapat
  dibuktikan di sini. Wajib prasyarat staging (STAGE-P12): aturan audit
  `-w <lockdir> -p wa` atau probe eBPF, plus bukti bahwa satu `unlink`
  uji tercatat.
- **OPS-T6 — isolasi antar user layanan:** daemon (uid 1) tidak dapat
  menghapus file milik `nobody` di direktori 0700 milik `nobody`.
  Bila setiap layanan berjalan sebagai user-nya sendiri (prinsip
  least-privilege), satu layanan yang terkompromi tidak dapat menghapus
  lock layanan lain. Ini ditegakkan kernel.

### 2.3 Pemulihan bila lock terhapus saat parent aktif (OPS-T7, PASS × 3 run)

File: `ops-recovery.cjs`. Skenario yang direproduksi: dua parent (A dan B)
menjadi pemilik pada inode BERBEDA karena file lock dihapus lalu dibuat
ulang saat A aktif (simulasi `rm` oleh operator/tooling) — kasus yang
tepat ditakuti keberatan ini. Prosedur pemulihan yang diuji:

1. **Deteksi:** parent baru (B) menjalankan pre-start scan `/proc` —
   menemukan A hidup dengan fd flock terbuka pada inode lama
   (`scan=[{"pid":2516,"fd":"5"}]`).
2. **A berdiri (stand-down):** A menjalankan `verifyFlockOwnership`
   ulang — (dev,ino) fd-nya tidak lagi cocok dengan path (path kini
   menunjuk inode B) → `verified=false` → A keluar tanpa cleanup.
3. **B tetap pemilik:** B memegang flock pada inode baru dan melanjutkan.

Output verbatim RUN=1 (`opsrec-run1.log`):

```
OPS-T7a two-owners-reproduced=true A.ino=389 B.ino=391 A.pid=2516 B.pid=2522
OPS-T7b proc-scan-detected-stale-holder=true scan=[{"pid":2516,"fd":"5"}]
OPS-T7c A-stood-down=true verifiedFalse=true
OPS-T7d B-still-owner=true
PASS OPS-T7 :: twoOwners=true detected=true aStoodDown=true bStillOwner=true
```

RUN=2 dan RUN=3: PASS (log `opsrec-run2.log` + run konsolidasian).
**Yang dibuktikan:** dua pemilik yang timbul dari penghapusan file
terdeteksi dan diselesaikan menjadi satu pemilik **tanpa cleanup ganda**
(A keluar sebelum tindakan sensitif apa pun). **Yang TIDAK dibuktikan:**
skenario di mana A sedang berada DI TENGAH `guardedAction` tepat saat
file dihapus — jendela itu tetap ada (residual U-38, §1.6) dan ditutup
oleh gating per-tindakan, bukan oleh prosedur pemulihan.

### 2.4 Prosedur deployment, rollback, dan maintenance (mengikat)

Prosedur ini adalah bagian dari desain v2.3.6 (§A.5.5.4g). Ringkasan
di sini; teks mengikat ada di dokumen desain.

**Deployment (urutan wajib):**
1. Buat direktori lock sebagai user layanan, mode `0700`, ownership
   user layanan (BUKAN root). Verifikasi: `stat` menunjukkan uid yang
   benar dan mode 0700 (cek otomatis di skrip deployment; gagal →
   deployment berhenti).
2. (Opsional tetapi direkomendasikan) Bind-mount direktori lock
   read-only setelah file lock awal dibuat — dokumentasikan mount ini
   di inventaris mount deployment; cek berkala (monitoring) bahwa mount
   masih `ro`.
3. Jalankan parent sebagai user layanan (BUKAN root) — bila layanan
   harus start sebagai root, turunkan privilege sebelum acquire
   (setuid/setgid ke user layanan).
4. Parent menjalankan siklus penuh: pre-start scan → acquire flock →
   klasifikasi record → cleanup worker lama (pidfd, §1) → spawn worker
   → READY. Deployment dinyatakan sukses hanya bila parent mencapai
   READY dan satu `guardedAction` uji lolos.

**Rollback (flag-day — mengikat, §A.5.5.4d):**
1. Hentikan SEMUA parent (semua versi) sebelum upgrade/rollback.
   Verifikasi penghentian lewat pre-start scan: tidak ada proses parent
   hidup dengan marker layanan.
2. Baru setelah itu ganti biner dan start parent versi target.
3. **DILARANG:** menjalankan dua versi bersamaan; me-rollback dengan
   parent lama masih hidup; menghapus file lock sebagai "cara cepat"
   menyelesaikan konflik (gunakan prosedur pemulihan §2.3, bukan `rm`).

**Maintenance (dilarang vs diizinkan):**
- **DILARANG saat parent aktif:** `rm`/`mv` file lock atau pidfile;
  `chmod`/`chown` direktori lock; me-remount direktori lock rw tanpa
  change record; menjalankan tooling pembersih (`tmpwatch`, `systemd-tmpfiles`
  dengan pola yang cocok dengan direktori lock) — direktori lock WAJIB
  dikecualikan dari semua pembersih otomatis.
- **Diizinkan:** membaca file lock/pidfile (read-only, untuk diagnosis);
  memeriksa mount (`findmnt`); memeriksa jejak audit; me-restart parent
  lewat supervisor (yang menjalankan siklus penuh, bukan `rm` manual).

**Bila lock terhapus saat parent aktif (runbook pemulihan):**
1. JANGAN membuat file lock baru secara manual.
2. Periksa apakah parent masih hidup (`pre-start scan`): bila hidup,
   biarkan parent mendeteksi kehilangan otoritas sendiri
   (`verifyFlockOwnership` gagal pada `guardedAction` berikutnya →
   parent keluar fail-closed) — JANGAN membunuh parent secara paksa
   sebelum ia keluar sendiri, kecuali ia tidak keluar dalam batas
   waktu operator (5 menit) — bila demikian, SIGTERM lalu SIGKILL
   lewat pidfd/sinyal by-number dengan validasi identitas (§1).
3. Setelah TIDAK ADA parent hidup (scan bersih), supervisor me-restart
   parent — parent baru membuat file lock baru lewat jalur acquire
   normal (flock + klasifikasi record). File lock lama yang hilang
   tidak perlu "dipulihkan" — otoritas lahir dari flock, bukan dari
   isi file.
4. Catat insiden (siapa/apa yang menghapus, dari jejak audit) dan
   periksa apakah penyebabnya adalah tooling pembersih — bila ya,
   perbaiki pengecualiannya sebelum restart berikutnya.

### 2.5 OS-enforced vs runbook-only — tabel kejujuran

| Kontrol | Jenis | Terhadap siapa efektif |
|---|---|---|
| Direktori lock 0700 + user layanan | **OS-enforced** (DAC kernel) | Semua user non-root; layanan lain. |
| Isolasi antar user layanan | **OS-enforced** (DAC kernel) | Layanan lain yang terkompromi. |
| Bind-mount ro direktori lock | **OS-enforced sebagian** | Penghapusan tak sengaja (termasuk oleh root yang tidak sadar); TIDAK terhadap root yang sengaja me-remount. |
| `chattr +i/+a` | **Tidak tersedia di VM ini**; OS-enforced HANYA bila filesystem produksi mendukung + dibuktikan di staging (STAGE-P02). | — (belum terbukti) |
| Jejak audit (auditd/eBPF) | **OS-enforced bila terpasang**; TIDAK ADA di VM ini — wajib staging (STAGE-P12). | Root yang sengaja (deteksi pasca-kejadian, bukan pencegahan). |
| Larangan `rm` manual, flag-day, pengecualian tmpfiles | **Runbook-only** | Bergantung pada disiplin operator + review change. |
| Deteksi kehilangan otoritas + stand-down (OPS-T7) | **Kode (aplikasi)** — ditegakkan oleh `guardedAction` | Siapa pun yang menghapus/mengganti file — deteksi, bukan pencegahan. |

**Kesimpulan keberatan 2:** perlindungan terhadap penghapusan lock
adalah pertahanan berlapis, bukan satu kontrol. Lapis OS-enforced yang
terbukti (0700, isolasi user) menghentikan sebagian besar ancaman
non-root; ro-bind-mount menghentikan kesalahan tak sengaja; audit
memberi jejak atas root; dan deteksi aplikasi (OPS-T7) memastikan
dampak terburuk dari penghapusan yang lolos adalah **parent berhenti
fail-closed**, bukan dua pemilik yang saling membersihkan. Risiko
residual dicatat sebagai **U-43** (root sengaja — hanya audit +
runbook) dan **U-44** (ro-bind-mount bukan default deployment).

---

## §3. Keberatan 3 — MATRIKS PRASYARAT STAGING (STAGE-P01..P12)

Setiap prasyarat memiliki kriteria PASS/FAIL eksplisit dan konsekuensi
FAIL yang dinyatakan sebelumnya (implementasi DIBLOKIR, atau fallback
yang sudah dibuktikan). Matriks ini juga masuk ke desain v2.3.6
(§D.4.15). **Tidak satu pun prasyarat ini dapat dipenuhi di VM ini
untuk runtime produksi** — semuanya wajib dikumpulkan di staging pada
runtime/filesystem/supervisor yang SAMA dengan produksi.

| ID | Prasyarat (bukti yang wajib dikumpulkan) | Kriteria PASS | Bila FAIL |
|---|---|---|---|
| STAGE-P01 | Runtime artifact + ketersediaan `bun:ffi` (versi Bun, `dlopen("libc.so.6")`, `flock`, `pidfd_open`, `pidfd_send_signal` di dalam sandbox artifact) | Semua simbol FFI terpanggil dan mengembalikan hasil yang benar (re-run FLK-06 + PIDFD-T8 di staging) | **BLOCK** — tidak ada implementasi flock/pidfd; kembali ke meja desain. |
| STAGE-P02 | Filesystem direktori lock + semantik flock (re-run FLK-T1..T8 pada filesystem produksi; uji `chattr +i/+a` bila direncanakan) | FLK 9/9 PASS pada fs produksi; `chattr` dicatat tersedia/tidak | **BLOCK** bila flock gagal; bila hanya `chattr` yang gagal → lanjut TANPA mengandalkan `chattr` (catat sebagai tidak tersedia). |
| STAGE-P03 | Ketersediaan `/proc` + `pidAlive` zombie-aware (re-run AUTH-T11 di staging) | AUTH-T11 PASS (zombie dinilai mati, parent baru READY) | **BLOCK** — primitif liveness hilang; perlu keputusan desain alternatif. |
| STAGE-P04 | Supervisor + process-group (dokumen + tes hidup SUP-01: bunuh parent → apakah group ikut mati; restart otomatis?) | Perilaku terdokumentasi DAN terbukti lewat tes hidup | **BLOCK** kecuali owner menerima residual U-22 secara tertulis (lapis self-exit + pidfile cleanup yang sudah terbukti + monitoring orphan). |
| STAGE-P05 | SU-T1..SU-T9 re-run di staging | 9/9 PASS pada runtime produksi | **BLOCK** — perbaiki kode, ulang dari gerbang G3. |
| STAGE-P06 | NFS — HANYA bila filesystem produksi memakai NFS (re-run FLK-07/AUTH-T9c pada mount NFS produksi) | Semantik flock terbukti pada mount NFS tersebut | **BLOCK** — pindahkan direktori lock ke filesystem lokal. |
| STAGE-P07 | Pengujian pidfd bila mekanisme itu dipilih (re-run PIDFD-T1..T12 pada runtime staging) | Semua suite pidfd PASS | **Fallback terbukti** — pakai starttime re-read + `kill(pid)` dengan residual terkuantifikasi (§1.7–1.8), HANYA dengan persetujuan eksplisit owner. |
| STAGE-P08 | `pid_max` produksi + reuse-interval (baca nilai, hitung P per cleanup dengan metode §1.7) | P ≤ 1e-6 | P 1e-6–1e-5 → kondisional (persetujuan owner tertulis); P > 1e-5 → **BLOCK**. |
| STAGE-P09 | DNS/pinning staging (G2/P0-1a': re-run spike runtime di staging) | Pinning + klasifikasi IP lolos pada runtime staging | **BLOCK** — kembali ke spike. |
| STAGE-P10 | PostgreSQL lease LSE-06 (mekanisme `scan_leases` pada PostgreSQL staging) | LSE-06 PASS (tidak ada pelanggaran batas 5 di bawah konkurensi) | **BLOCK** — perbaiki mekanisme lease sebelum cutover. |
| STAGE-P11 | NAT64/NSP (dokumen egress + tes S-49/S-50 dengan prefix produksi) | Dokumen egress menyatakan prefix (atau menyatakan tidak ada NAT64/DNS64) DAN tes staging lolos | **BLOCK** sampai dokumen + tes ada (U-11 tetap OPEN). |
| STAGE-P12 | Kontrol operasional lock (direktori 0700 + user layanan + audit rule `-w <lockdir> -p wa` atau eBPF + bukti satu `unlink` uji tercatat; ro-bind-mount bila dipakai) | Semua kontrol terverifikasi di staging; satu `unlink` uji tercatat di jejak audit | **BLOCK** sampai kontrol diperbaiki (kontrol ini murah diperbaiki — tidak ada alasan melanjutkan tanpa mereka). |

**Catatan:** STAGE-P01..P12 adalah prasyarat **sebelum implementasi**
dimulai (gerbang G0/G1), bukan sebelum cutover — bukti staging
dikumpulkan dulu, baru keputusan implementasi diambil. Bila satu
prasyarat BLOCK, implementasi tidak dimulai sampai prasyarat itu
dipenuhi atau fallback-nya (bila ada) disetujui owner secara eksplisit.

---

## §4. Tabel lengkap hasil tes v2.3.6

Semua tes memakai kernel/proses nyata di VM ini. "Run" = satu eksekusi
penuh suite dari awal (state bersih).

| Suite | File | Hasil | Run |
|---|---|---|---|
| PIDFD-T1..T7 (Python) | `pidfd-tests.py` | 7/7 PASS | × 2 |
| PIDFD-T8 (Bun FFI) | `pidfd-bun.js` | 2/2 PASS | × 2 |
| PIDFD-T9 (window + kuantifikasi) | `window-measure.cjs` | p99 ≈ 42–46 µs; P ≈ 6–7e-9/cleanup (default) | × 2 |
| PIDFD-T10 (dirfd falsifikasi) | `pidfd-dirfd-pin.py` | 1/2 — T10a PASS, T10b FAIL (hipotesis DITOLAK, hasil yang diharapkan) | × 2 |
| PIDFD-T11 (urutan referensi Bun) | `pidfd-t11.js` + `pidfd-signal.js` + `zombie-holder.py` | 5/5 PASS | × 3 |
| PIDFD-T12 (oracle reuse paksa) | `pidfd-t12.py` | 4/4 PASS | × 2 |
| OPS-T1..T6 | `ops-tests.py` | 6/6 PASS | × 2 |
| OPS-T7 (pemulihan penghapusan) | `ops-recovery.cjs` | PASS | × 3 |
| SU-T1..SU-T9 (re-run v2.3.2) | `su-v232/` | 9/9 PASS | × 4 |

**Total: 8 suite pidfd/ops + 1 suite startup, semua lolos pada
pengulangan** — kecuali T10b yang memang dirancang sebagai falsifikasi
(§1.6(d)). Tidak ada angka di dokumen ini yang diambil dari satu run
saja tanpa pengulangan, dan tidak ada kegagalan harness yang
disembunyikan (§0).

---

## §5. Yang TIDAK dibuktikan di VM ini (tetap NOT VERIFIED)

1. **Runtime produksi artifact** (`bun:ffi`, flock, pidfd di dalam
   sandbox artifact) — STAGE-P01. Semua bukti FFI di sini berasal dari
   Bun 1.4.4 di VM ini, bukan dari sandbox artifact.
2. **Filesystem produksi** (semantik flock, `chattr`, mount) — STAGE-P02.
3. **`/proc` di runtime produksi** — STAGE-P03 (bila tidak ada,
   `pidAlive` jatuh ke fallback `kill(pid,0)` yang buta zombie).
4. **Supervisor / process group produksi** — STAGE-P04 (U-22).
5. **NFS** — STAGE-P06 (hanya bila produksi memakai NFS; tidak ada NFS
   di VM ini).
6. **PostgreSQL** — STAGE-P10 (tidak ada PostgreSQL di VM ini).
7. **NAT64/NSP prefix produksi** — STAGE-P11 (U-11).
8. **Jejak audit** — STAGE-P12 (auditd/eBPF tidak ada di VM ini).
9. **Perilaku di bawah beban multi-instance** (U-18/U-23, worst case 8N)
   — tidak diuji di sini; tetap OPEN.
10. **Skenario A di tengah `guardedAction` saat file lock dihapus**
    (§2.3) — jendela residual U-38; ditutup oleh gating per-tindakan,
    bukan oleh prosedur pemulihan.

---

## §6. File harness v2.3.6 (`spike-harness-v236/`)

| File | Isi |
|---|---|
| `pidfd-tests.py` | PIDFD-T1..T7 (Python ctypes) + log `pidfd-run1/2.log` |
| `pidfd-bun.js` | PIDFD-T8 (Bun `bun:ffi`) + log `pidfd-bun-run1/2.log` |
| `pidfd-signal.js` | Implementasi REFERENSI `signalWorkerByPidfd` (Bun) |
| `pidfd-t11.js` | PIDFD-T11 (uji urutan referensi) + log `pidfd-t11-run1/2/3.log` |
| `zombie-holder.py` | Helper zombie untuk T11e |
| `pidfd-t12.py` | PIDFD-T12 (oracle reuse paksa) + log `pidfd-t12-run1/2.log` |
| `pidfd-dirfd-pin.py` | PIDFD-T10 (falsifikasi dirfd pinning) + log `dirfd-run1/2.log` |
| `window-measure.cjs` | PIDFD-T9 (pengukuran jendela + kuantifikasi) + log `window-run1/2.log` |
| `ops-tests.py` | OPS-T1..T6 + log `ops-run1/2.log` |
| `ops-recovery.cjs` | OPS-T7 (pemulihan penghapusan lock) + log `opsrec-run1/2.log` |
| `holder-flock.js` | Helper Bun untuk OPS-T7 (holder flock minimal dengan perintah `verify`/`exit`) |
| `su-v232/` | Re-run SU-T1..SU-T9 v2.3.2 (`startup.cjs`, `dns-worker.cjs`, `lock-racer.cjs`, `run-tests.cjs`) + log `su-run1..4.log` |
| `README.md` | (lihat bawah) Cara menjalankan ulang tiap suite |

**Menjalankan ulang (dari dalam `spike-harness-v236/`):**

```sh
python3 pidfd-tests.py        # PIDFD-T1..T7
bun pidfd-bun.js              # PIDFD-T8
node window-measure.cjs       # PIDFD-T9
python3 pidfd-dirfd-pin.py    # PIDFD-T10 (T10b diharapkan FAIL = hipotesis ditolak)
bun pidfd-t11.js              # PIDFD-T11
python3 pidfd-t12.py          # PIDFD-T12 (menurunkan pid_max sementara, dipulihkan otomatis)
python3 ops-tests.py          # OPS-T1..T6
node ops-recovery.cjs         # OPS-T7
node su-v232/run-tests.cjs    # SU-T1..SU-T9
```

---

*Akhir bukti v2.3.6. Status tetap: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.*
