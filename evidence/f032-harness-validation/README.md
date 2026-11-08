# Bukti F-032 — Validasi argumen harness F-029 (tidak ada lagi false green)

**Revisi:** v2.3.19 — jawaban atas audit independen V12 (F-036, F-037, trust boundary F-035, proposal F-001..F-005)
**Tanggal:** 2026-11-08 (WIB)
**Revisi sebelumnya:** v2.3.18 — jawaban atas audit independen V11 (F-034, F-035, U-72)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Tidak ada jaringan, tidak ada artifact live, `checkLink` TIDAK
di-invoke. Paket ini hanya menguji parent harness
`evidence/f029-memory-methodology/run-f029.ts` — tidak ada
eksperimen memori baru di sini.

## Pertanyaan (F-032)

Audit V9 benar: `run-f029.ts` v2.3.15 mem-parsing `--runs` dengan
`Number(...)` tanpa validasi integer positif. Pemanggilan
`--runs 0` atau nilai non-numerik membuat loop child tidak
berjalan sama sekali, `failures` tetap 0, parent mencetak
"parent done: all child runs ok" dan keluar 0 — false green dari
artefak kosong. Tidak ada assertion bahwa jumlah record sama
dengan jumlah run yang diharapkan, tidak ada validasi RESULT
terhadap parameter yang diminta, dan tidak ada timeout child.

**Batas dampak:** raw log v2.3.15 yang diperiksa audit V9
benar-benar berisi 60 RESULT records per versi Bun, 60 PID unik,
dan 0 kegagalan — F-032 TIDAK membatalkan kedua log tersebut.
Yang diperbaiki adalah harnessnya, supaya pemakaian ulang
sebagai oracle penerimaan tidak dapat menghasilkan false green.

## Perbaikan (v2.3.16, `run-f029.ts`)

1. **`--runs` wajib dan divalidasi ketat:** flag harus ada
   (tidak ada default diam-diam); bentuk `--runs N` atau
   `--runs=N`; nilai harus cocok `/^\d+$/` dan integer dalam
   rentang yang disetujui **1..10** (`MAX_RUNS = 10`). Nilai 0,
   negatif, NaN, non-numerik, desimal, terlalu besar (> 10),
   nilai hilang, atau flag hilang → `console.error` + usage +
   **exit 2**, tanpa satu pun child dijalankan dan tanpa
   mencetak "all child runs ok".
2. **Assertion jumlah record:** setelah loop, parent menegaskan
   `records.length === EXPECTED_RUNS` (12 kombinasi × RUNS) dan
   tiap kombinasi tepat RUNS record; ketidakcocokan dicetak
   sebagai `COUNT MISMATCH` dan menggagalkan run.
3. **Validasi setiap RESULT terhadap parameter yang diminta:**
   `pattern`, `fixture`, `gc` harus sama dengan yang diminta;
   `bun` harus sama dengan versi parent (child di-spawn dengan
   `process.execPath` yang sama); `asksConnect` harus `true`;
   `utf8Bytes` yang TERUKUR harus sama dengan yang diharapkan
   per fixture (ascii dan nonascii-bytes: tepat 1.000.000;
   nonascii: tepat 1.999.939 — lihat F-031);
   `segmentBytes` harus berjumlah sama dengan `utf8Bytes`;
   `vmHwmDelta` harus bilangan non-negatif. Satu pun
   ketidakcocokan → record itu dihitung sebagai failure.
4. **Timeout child + status gagal bila timeout/signal:**
   `spawnSync(..., { timeout: 120_000 })`; `error` (termasuk
   `ETIMEDOUT`), `status === null`, atau `signal` → FAIL
   dengan alasan yang dicetak (`timeout after 120000 ms` /
   `killed by signal ...`). Mekanisme timeout `spawnSync`
   diverifikasi terpisah (Bun 1.4.4, `sleep 30` dengan timeout
   200 ms → `{ errorCode: "ETIMEDOUT", status: null, signal:
   "SIGTERM" }`) — jalur timeout end-to-end di harness TIDAK
   diuji dengan child yang sengaja menggantung (tidak ada
   skenario gantung yang dibuat); yang diuji adalah
   penanganannya bila kondisi itu terjadi.
5. **Baris sukses hanya bila semua pemeriksaan lolos:**
   "parent done: all child runs ok" dicetak HANYA bila
   `failures === 0` DAN jumlah record tepat DAN semua kombinasi
   lengkap; bila tidak, parent mencetak
   "parent done: FAILED — …" dan **exit 1**.

## Perubahan v2.3.19 (F-036, F-037, trust boundary F-035 — jawaban atas audit V12)

Audit V12 menerima perbaikan v2.3.18 tetapi menemukan satu celah
parser (F-036), satu pola tidak aman pada KODE TES itu sendiri
(F-037), dan meminta klarifikasi trust boundary child writer
serta proposal implementation-ready F-001..F-005. Revisi ini
menjawab semuanya; F-029 TIDAK diulang (metodologi tidak berubah).

**F-036 — parser menolak starttime 0 (`pid-oracle.ts`).**
Parser v2.3.18 memeriksa `starttime < 0`, bukan `<= 0` — record
`"<pid> 0"` diterima dan dapat membuat child yang masih hidup
dinilai "dead". Kini: `parsePidFile()` DAN `parseProcStat()`
menolak starttime `<= 0`; `classifyLiveness()` memvalidasi input
pid/recordedStarttime-nya sendiri (invalid → "inconclusive",
tidak pernah "dead", `kill()` tidak pernah dipanggil); dan helper
baru `verifyPidFile()` gagal-cepat untuk SELURUH file bila ada
satu parse error — tidak ada assertion liveness atas record
parsial. Driver E2E memakai `verifyPidFile()` (bukan loop inline).
**Tes regresi — `test-pid-oracle.ts` (log
`test-pid-oracle-v2319.txt`, 59 baris, Bun 1.4.4, uid 65534,
50 assert PASS):** 7 kasus parsing baru (starttime 0 — kasus
penerimaan audit `parsePidFile("1234 0\n")` harus error; negatif;
non-integer; unsafe integer 2^53+1; sangat besar; valid+invalid
campur; `parseProcStat` starttime 0 → null) + 8 kasus validasi
input `classifyLiveness()` (pid 0/negatif/non-integer/unsafe dan
recordedStarttime 0/negatif/non-integer/unsafe — semuanya
inconclusive, `kill()` tidak pernah dipanggil) + 4 kasus
`verifyPidFile()` (campur → ok=false, 0 verdict, `kill()` tidak
pernah dipanggil; count mismatch → sama; semua dead → ok=true;
satu alive → ok=false).

**F-037 — keselamatan filesystem pada tes F-035 dan U-72.**
Tes v2.3.18 memakai path tetap `/tmp/u72-*` dan
`/tmp/f032-hang-child.pid` dengan `writeFileSync` (truncate/
follow) + `rmSync` — dapat menimpa/menghapus file asing dan
mengikuti symlink. Kini: semua fixture di dalam SATU direktori
privat per-run (`mkdtemp`, 0700); file dibuat EKSKLUSIF
(`openSync "wx"`, 0600); symlink dibuat hanya setelah memastikan
path tidak ada; bila path legacy SUDAH ADA saat tes mulai, tes
GAGAL AMAN tanpa menyentuhnya (bukan menghapusnya); teardown
hanya menghapus objek yang (dev,ino)-nya masih cocok dengan yang
dicatat saat pembuatan. **Tes regresi F-035 —
`test-f035-pidfile.ts` (log `test-f035-pidfile-v2319.txt`,
75 baris, Bun 1.4.4, uid 65534, 59 assert PASS):** DUA skenario
(path legacy berupa symlink DAN berupa regular file, masing-masing
dua driver paralel) — file/symlink lama tidak pernah berubah
atau terhapus, set PID disjoint, direktori privat terhapus, tidak
ada leftover di `/tmp`. **Tes regresi U-72 —
`test-u72-seam.ts` (log `test-u72-seam-v2319.txt`, 36 baris,
Bun 1.4.4, uid 65534, 25 assert PASS):** 7 penolakan + 1
penerimaan seperti v2.3.18, kini dengan semua fixture di direktori
privat + exclusive create + cleanup terverifikasi (dev,ino).
**Non-root:** kedua tes MENOLAK berjalan sebagai root (uid 0) —
bukti kanonik direkam sebagai uid 65534. Alasan root tidak dapat
membaca repo dari tempatnya (mode 2770 pada mount yang
menegakkan akses host-side) didokumentasikan di matriks v2.3.19:
tes dijalankan dari salinan stage byte-identik (sha256
terverifikasi) di `/tmp/f036-stage`.

**Trust boundary F-035 — child writer (`hang-child.ts`).**
Pola `lstat` lalu `appendFileSync` DIGANTI: child membuka file
dengan `O_WRONLY|O_APPEND|O_NOFOLLOW` (numerik; symlink saat open
→ ELOOP), memverifikasi DESCRIPTOR via `fstat` (regular, uid
sama, mode 0600, (dev,ino) sama dengan yang dicatat driver dan
diteruskan via `F032_PID_FILE_DEV`/`F032_PID_FILE_INO`), lalu
satu `writeSync`. Keputusan trust boundary yang dinyatakan
eksplisit: proses tidak tepercaya dengan UID YANG SAMA secara
eksplisit DI LUAR threat model harness (alasan: same-UID dapat
ptrace/signal/mem-baca driver — tidak ada cek file yang dapat
mengisolasi terhadap same-UID; direktori 0700 sudah mengecualikan
UID lain; child adalah kode tepercaya via seam U-72). Penjepitan
fd adalah defense-in-depth terhadap swap path yang tidak
disengaja / stale — dan tetap menutup jendela TOCTOU sepenuhnya
untuk kasus itu. Bila harness kelak jalan di host bersama dengan
same-UID tak tepercaya, asumsi ini harus ditinjau ulang (risiko
U-77). **Tes end-to-end diulang pada driver baru (log
`run-f032-timeout-e2e-v2319.txt`, 191 baris, Bun 1.4.4, uid 65534):**
12 FAIL timeout, ke-12 PID `dead` via ESRCH, 12 == 12, direktori
privat terhapus, driver PASS. Tes regresi negatif TIDAK diulang
(driver negatif tidak berubah — tanpa perubahan metodologi/
runtime, pengulangan dilarang protokol).

**Proposal F-001..F-005** ada di `SSRF_PROPOSAL_F001_F005_V2319.md`
(bukan di paket ini): file/fungsi/baris terverifikasi pada main
`cd96768`, pseudodiff, threat model, matriks tes H-SSRF-21..26 /
H-RES-07..12 / H-CAT-04..06 / H-TEN-06..07 / H-AUTH-04..06,
migrasi 0006 gabungan F-004+F-018, tiga opsi otorisasi F-005.
Status F-001..F-005 tetap OPEN/BLOCKED — proposal bukan
implementasi dan bukan otorisasi.

## Perubahan v2.3.18 (F-034, F-035, U-72 — jawaban atas audit V11)

Audit V11 menerima angka dan log v2.3.17 tetapi menemukan dua
kelemahan pada oracle/bukti terminasi child serta satu celah pada
test seam. Revisi ini memperbaikinya tanpa mengubah metodologi
pengukuran memori (F-029 tidak diulang — lihat batasan di bawah):

**F-034 — oracle terminasi PID diperketat (`pid-oracle.ts` BARU).**
Driver v2.3.17 menganggap SEMUA exception dari `process.kill(pid,
0)` sebagai "proses mati" dan mem-parsing baris PID dengan
`Number(...)` tanpa validasi. Kini: hanya `error.code ===
"ESRCH"` yang berarti proses tidak ada; EPERM berarti proses
ADA tetapi tidak bisa di-signal (verdict "alive" → FAIL);
EINVAL / `ERR_INVALID_ARG_TYPE` / exception lain berarti oracle
tidak dapat memutuskan (verdict "inconclusive" → FAIL). File
PID di-parse ketat (`parsePidFile`): tiap baris harus tepat
`"<pid> <starttime>"`, keduanya positive safe integer, pid
1..2^31−1; baris kosong/malformed/duplikat/di luar rentang adalah
error dan file ditolak SEBELUM assertion liveness. Identitas PID
diverifikasi terhadap starttime yang dicatat child saat spawn
(field 22 `/proc/<pid>/stat`): starttime cocok = child yang sama
masih hidup; berbeda = PID dipakai ulang proses lain (child asli
mati); state Z/X = zombie/mati; `/proc` tak terbaca/tak ter-parse
= inconclusive (FAIL). Satu-satunya pengecualian: proses yang
keluar di antara probe signal dan pembacaan `/proc` (ENOENT) =
mati. Modul oracle sengaja injectable (`kill`/`readStat`) supaya
tes regresi dapat membuktikan EPERM/EINVAL tidak bisa PASS tanpa
bergantung pada layout permission host.

**Tes regresi oracle — `test-pid-oracle.ts` (log
`test-pid-oracle-v2318.txt`, 36 baris, Bun 1.4.4, 30 assert
PASS):** 15 kasus parsing (valid, tanpa trailing newline, file
kosong, baris kosong, tanpa starttime, non-numerik, field
tambahan, pid 0, pid > 2^31−1, float, negatif, duplikat, starttime
sama di dua pid diizinkan, spasi di depan); 11 kasus klasifikasi
dengan stub injeksi (ESRCH→dead, EPERM→alive, EINVAL→
inconclusive, ERR_INVALID_ARG_TYPE→inconclusive, `parseProcStat`
mem-parse `/proc/self/stat`, hidup + starttime cocok→alive, hidup
+ starttime berbeda→dead, state Z→dead, kill ok + `/proc`
ENOENT→dead, kill ok + `/proc` EPERM→inconclusive, kill ok + stat
tak ter-parse→inconclusive);
4 kasus proses hidup nyata (child yang sudah exit→dead via
ESRCH sungguhan; `sleep 30` stat ter-parse + alive, lalu SIGKILL
terkontrol→dead).
**Catatan jujur:** VM ini berjalan sebagai root (uid 0),
sehingga `kill(1,0)` berhasil dan EPERM HIDUP tidak dapat
diproduksi di sini — aturan EPERM→FAIL dibuktikan oleh kasus
stub injeksi, bukan oleh proses hidup. Itu dicatat di log, bukan
dipalsukan.

**F-035 — file PID pindah ke direktori privat per-run
(`run-f032-timeout-e2e.ts` + `hang-child.ts` diperbarui).**
Path tetap `/tmp/f032-hang-child.pid` DIHAPUS dari driver.
Kini driver membuat direktori privat per-run via `mkdtemp`
(mode 0700 — realpath + kepemilikan uid divalidasi sebelum child
dijalankan) dan membuat file PID di dalamnya secara EKSKLUSIF
(`openSync "wx"`, mode 0600, fstat-validated; `O_EXCL` gagal
bila path adalah symlink, bahkan yang menggantung). `hang-child.ts`
kini mencatat `"<pid> <starttime>"` (starttime dari
`/proc/self/stat` saat spawn) dan, sebelum append, memvalidasi
file PID dengan `lstat`: harus file regular (bukan symlink),
milik uid yang sama, mode 0600 — bila gagal, child exit 1 tanpa
menggantung sehingga parent mencatat FAIL non-timeout dan E2E
gagal dengan keras. Direktori dihapus di blok `finally` setelah
semua child selesai. Dua invocation paralel mendapat direktori
terpisah dan tidak pernah mencampur PID.

**Tes regresi F-035 — `test-f035-pidfile.ts` (log
`test-f035-pidfile-v2318.txt`, 31 baris, Bun 1.4.4, 25 assert
PASS):** symlink ditanam di path lama menunjuk file sentinel;
dua driver dijalankan PARALEL — keduanya exit 0 dan PASS,
direktori privat berbeda (`/tmp/f032-e2e-48auan` vs
`/tmp/f032-e2e-YyTPEK`), masing-masing mencatat 12 PID, kedua
set PID disjoint (tidak ada yang tercampur), tak satu pun log
menyebut path lama, mode direktori 700 + mode file 600
tervalidasi di kedua log, kedua direktori terhapus setelah run,
dan file sentinel byte-identik sebelum/sesudah (sha256 sama) +
symlink tetap menunjuk target (tidak pernah diganti).

**Tes end-to-end diulang pada driver baru (log
`run-f032-timeout-e2e-v2318.txt`, 189 baris, Bun 1.4.4,
2026-11-08T03:58:01Z, durasi ~36 detik):** 12 FAIL timeout,
ke-12 PID tercatat sebagai `"<pid> <starttime>"` (3116, 3126,
3135, 3147, 3155, 3165, 3178, 3188, 3198, 3206, 3219, 3232),
jumlah PID yang diuji (12) == jumlah child yang diluncurkan
(12), ke-12 verdict liveness `dead` via ESRCH sungguhan
(starttime tercatat di tiap baris log), 0 record, `COUNT
MISMATCH`, `parent done: FAILED`, exit 1, tanpa success line,
direktori privat terhapus (`removed: true`). Verdict driver:
**E2E TIMEOUT TEST: PASS**.

**U-72 — seam diperketat (`run-f029.ts` diperbarui).**
`F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` kini hanya
dihormati bila `F029_TEST_MODE=1` eksplisit; script child harus
realpath ke fixture yang disetujui (`exp-pattern.ts` atau
`hang-child.ts` di dalam evidence tree) dan path yang diberikan
tidak boleh berupa symlink; selain itu → exit 2 sebelum child
mana pun di-spawn. Driver E2E kini menyetel `F029_TEST_MODE=1`.
**Tes regresi seam — `test-u72-seam.ts` (log
`test-u72-seam-v2318.txt`, 20 baris, Bun 1.4.4, 15 assert PASS):**
override tanpa test mode → exit 2; `F029_TEST_MODE=true` (bukan
"1") → exit 2; timeout override tanpa test mode → exit 2; path
arbitrer di luar evidence dalam test mode → exit 2; symlink ke
fixture yang disetujui dalam test mode → exit 2; path tak ada /
file non-script → exit 2; fixture yang disetujui dalam test mode
DITERIMA (hang-child + timeout 100 ms → 12 FAIL timeout, exit 1,
baris `test-seam:` tercatat). TIDAK ADA workflow CI yang
ditambahkan — sesuai audit, tanpa threat model tidak ada workflow
yang mengeksekusi input PR tak tepercaya.

**Tes regresi negatif diulang pada harness baru (log
`run-f032-negative-v2318.txt`, 307 baris, Bun 1.4.4,
2026-11-08T03:59:29Z):** `--runs 0`, `--runs abc`, `--runs -1`,
nilai hilang, flag hilang, `--runs 11`, `--runs 1.5` — ketujuh
kasus tetap exit 2 tanpa mencetak sukses; kontrol positif
`--runs 1` exit 0 dengan 12 RESULT + `parent done: all child
runs ok` (perilaku default tidak berubah oleh pengetatan seam).
Log v2.3.17 (`run-f032-negative-v2317.txt`) dipertahankan sebagai
bukti historis.

## Perubahan v2.3.17 (F-032 — timeout end-to-end dengan child yang sengaja menggantung)

Audit V10 memberi caveat pada F-032: mekanisme timeout `spawnSync`
hanya diverifikasi terpisah (Bun 1.4.4, `sleep 30`, timeout 200 ms
→ `ETIMEDOUT`), tanpa uji end-to-end melalui parent harness dengan
child yang sengaja menggantung. Revisi ini menutup caveat itu:

**Child dummy yang menggantung — `hang-child.ts`.** Menerima argumen
yang sama dengan `exp-pattern.ts` (`--pattern/--fixture/--gc`) dan
mengabaikannya; menulis PID-nya (append, satu baris per child) ke
`$F032_PID_FILE`; mencetak satu baris lalu menggantung selamanya
(`await new Promise(() => {})`). TIDAK PERNAH mencetak RESULT dan
tidak pernah keluar sendiri. File ini hanya ada di sandbox
eksperimen ini — tidak ada target produksi, tidak ada artifact,
tidak ada `checkLink`.

**Test seam di parent harness — `run-f029.ts`.** Dua env var
test-only (tervalidasi; nilai buruk → exit 2; bila aktif, parent
mencetak baris `test-seam:` eksplisit di log): `F029_CHILD_SCRIPT`
(ganti script child yang di-spawn) dan `F029_CHILD_TIMEOUT_MS`
(integer 100..120000, default 120000). Production run TIDAK PERNAH
mengeset keduanya; log run produksi dapat dibedakan dari log uji
dari ada/tidaknya baris `test-seam:`.

**Driver uji — `run-f032-timeout-e2e.ts`.** Menjalankan
`bun run-f029.ts --runs 1` (cwd `evidence/f029-memory-methodology/`)
dengan seam `F029_CHILD_SCRIPT=<abs path hang-child.ts>` dan
`F029_CHILD_TIMEOUT_MS=3000`, lalu meng-assert: exit 1; tepat 12
baris FAIL (satu per child gantung) dan semuanya beralasan
`timeout after 3000 ms`; parent mencetak `parent done: FAILED`
+ `COUNT MISMATCH` (0 dari 12 record); TIDAK ADA baris RESULT;
TIDAK ADA baris `all child runs ok`; baris `test-seam:` tercatat;
preflight tetap berjalan dan lolos sebelum child gantung; dan
**ke-12 PID child yang tercatat sudah mati** (`process.kill(pid, 0)`
melempar ESRCH untuk semuanya — tidak ada child yang bocor).
Driver exit 0 hanya bila SEMUA assert lolos.

## Tes end-to-end (log mentah: `run-f032-timeout-e2e.txt`)

Jalankan dari `evidence/f032-harness-validation/`, Bun 1.4.4,
2026-11-08T02:53:24Z (durasi ~36 detik = 12 child × timeout 3 detik):

| # | Assert | Hasil |
| --- | --- | --- |
| 1 | Driven run exit 1 | PASS |
| 2 | 12 baris FAIL | PASS (12) |
| 3 | Semua FAIL beralasan `timeout after 3000 ms` | PASS (12/12) |
| 4 | Parent mencetak `parent done: FAILED` | PASS |
| 5 | Parent TIDAK mencetak `all child runs ok` | PASS |
| 6 | Parent mencetak `COUNT MISMATCH` (0 dari 12) | PASS |
| 7 | Tidak ada baris RESULT | PASS (0) |
| 8 | Parent mencatat baris `test-seam:` | PASS |
| 9 | Preflight berjalan + lolos sebelum child gantung | PASS |
| 10 | Ke-12 PID child tercatat | PASS (12 PID: 3776, 3782, 3790, 3802, 3808, 3821, 3827, 3835, 3846, 3849, 3863, 3866) |
| 11 | Ke-12 child sudah mati setelah parent keluar | PASS (kill(pid,0) → ESRCH untuk semua; bocor: none) |

Verdict driver: **E2E TIMEOUT TEST: PASS**. Dengan ini jalur
timeout child TERBUKTI end-to-end melalui parent harness yang
sebenarnya — bukan hanya mekanismenya yang diverifikasi terpisah.

**Catatan pengembangan (dicatat agar tidak diulang):** draf pertama
driver hanya memeriksa PID child TERAKHIR karena hang-child
menimpa pidfile (`writeFileSync`); driver + hang-child diperbaiki
(append satu PID per baris; driver memeriksa ke-12 PID) dan uji
di-rerun penuh; log draf pertama ditimpa oleh rerun yang lebih
kuat, bukan disembunyikan.

## Tes regresi negatif — diulang pada harness v2.3.17 (log `run-f032-negative-v2317.txt`)

`run-f029.ts` berubah di v2.3.17 (preflight gate + test seam +
validasi `encoderInMeasuredPhase`), sehingga 7 kasus negatif
diulang pada harness baru (Bun 1.4.4, 2026-11-08T02:54:57Z,
log 307 baris): `--runs 0`, `--runs abc`, `--runs -1`, nilai
hilang, flag hilang, `--runs 11`, `--runs 1.5` — ketujuh kasus
tetap exit 2 tanpa mencetak sukses; kontrol positif `--runs 1`
exit 0 dengan 12 RESULT + `parent done: all child runs ok`
(output penuh kontrol ada di log). Log v2.3.16
(`run-f032-negative.txt`) dipertahankan sebagai bukti historis.

## Tes regresi (log mentah: `run-f032-negative.txt`)

Jalankan dari `evidence/f029-memory-methodology/` (cwd harness),
Bun 1.4.4, 2026-11-08T01:56:59Z:

| # | Pemanggilan | Hasil |
| --- | --- | --- |
| 1 | `bun run-f029.ts --runs 0` | exit 2, "out of approved range 1..10", tanpa "all child runs ok" |
| 2 | `bun run-f029.ts --runs abc` | exit 2, "must be a positive integer", tanpa "all child runs ok" |
| 3 | `bun run-f029.ts --runs -1` | exit 2, "must be a positive integer", tanpa "all child runs ok" |
| 4 | `bun run-f029.ts --runs` (nilai hilang) | exit 2, "--runs requires a value", tanpa "all child runs ok" |
| 5 | `bun run-f029.ts` (flag hilang) | exit 2, "--runs is required", tanpa "all child runs ok" |
| 6 | `bun run-f029.ts --runs 11` (terlalu besar) | exit 2, "out of approved range 1..10", tanpa "all child runs ok" |
| 7 | `bun run-f029.ts --runs 1.5` (desimal) | exit 2, "must be a positive integer", tanpa "all child runs ok" |
| + | Kontrol positif `bun run-f029.ts --runs 1` | exit 0, 12 RESULT, "parent done: all child runs ok" |

Kasus 1–5 adalah tes regresi yang diminta audit V9 §5 F-032;
kasus 6–7 adalah tambahan (batas atas rentang + desimal).
Semua 7 kasus negatif lolos kriteria: exit non-zero DAN tidak
mencetak "all child runs ok".

## SHA-256

| File | SHA-256 |
| --- | --- |
| `run-f032-negative.txt` | `13db12c6d56563b5e8cfbaca0e33f6f82e3a6675316fa3f7cf30b1cd177f62ee` |
| `hang-child.ts` (v2.3.17) | `0d747fa7fec2b1b8c141735e21c3de8349064fde313164c9df5dbdb44d92613a` |
| `run-f032-timeout-e2e.ts` (v2.3.17) | `169e1d6908806659298cc5f1e862d094eaf0fe7d59029a2e35b306f4820256ab` |
| `run-f032-timeout-e2e.txt` (v2.3.17) | `6148cb8924fdfd3c0195994f3146ae275064e124e139bcec1558a5fa37c87fd4` |
| `run-f032-negative-v2317.txt` (v2.3.17) | `4c97e1d079a21f94a8f4e0aec1b7eda961843bc7f5adc36c324123331b8a7a91` |
| `pid-oracle.ts` (v2.3.18) | `4d36b47ea6bced479944cd6d959a305e9209cf406445c595e306306f69a8166c` |
| `hang-child.ts` (v2.3.18) | `da44592561e181ff196b607cc94b0f37c71174eb57543f08b17765541ea7b25a` |
| `run-f032-timeout-e2e.ts` (v2.3.18) | `55be54784500953aed13ac2daa27551ee19a2f2f7cddd0f7e50df2bdce51063f` |
| `test-pid-oracle.ts` (v2.3.18) | `56e0e0cb2a2b727fa8f12bd30e6e835638e75b1fe10b44447266eb55f42068f9` |
| `test-f035-pidfile.ts` (v2.3.18) | `7f060400fb07555171334aa976a0178e51293272b65102682f0811ac8efe6975` |
| `run-f032-timeout-e2e-v2318.txt` | `00d23aa532548242bc19f0399f298f485e25f91a823112798b046b56c594de33` |
| `test-pid-oracle-v2318.txt` | `4cc0d407c90dbb2900ca35be46afc6c0c68413f849de6dd123f2d749f529b300` |
| `test-f035-pidfile-v2318.txt` | `937ed44521d09a8c218130ac97f3faf9344e982c15b730c97bc733cd86e539df` |
| `run-f032-negative-v2318.txt` | `0028237b23af9e93a160ed8c2883e08242775c1d2c969ad7107b90e6889e68dc` |
| `pid-oracle.ts` (v2.3.19) | `fe6dd20672d5b16f72e51e63429d50ff176e65c3f855210d2463599f39069f10` |
| `hang-child.ts` (v2.3.19) | `f66ea8ee632d727f6ad4fb5cd4188fbcc4a6db288a0a9a18c87cad261b9aa3c8` |
| `run-f032-timeout-e2e.ts` (v2.3.19) | `1039cf1352b4d0bba7eebc94e92890682576114f6110eb68444c16046b266b2f` |
| `test-pid-oracle.ts` (v2.3.19) | `71925f3a57204394348e7e7d9fa7ff19e60dcb06567428259acea89d410dc2d8` |
| `test-f035-pidfile.ts` (v2.3.19) | `1fcf20a9a8cf284b515533837817de2777f31b383cb11aba366a7a77c10fd158` |
| `run-f032-timeout-e2e-v2319.txt` | `eed1b660a57caf7c6f2dbaf3b4cd4f30c306c114a1a54b51457aab249efe1aab` |
| `test-pid-oracle-v2319.txt` | `338838506803b0f758a9d4ca21ddb2972739b21de60a657e135c81acdffb0c66` |
| `test-f035-pidfile-v2319.txt` | `b95e1a3d893361f47734b7d93f6e20cea98f54d962039c3a4f7621c7ccc536fa` |

## Batasan (dicatat jujur)

- Validasi ini menutup jalur false green pada ARGUMEN dan
  PENGHITUNGAN record; ia tidak membuktikan kebenaran
  pengukuran memori itu sendiri — itu urusan F-031 dan
  metodologi proses-terpisah (lihat README F-029 v2.3.16).
- **[PEMBARUAN v2.3.17: batasan ini TERTUTUP untuk jalur timeout —
  uji end-to-end dengan child yang sengaja menggantung kini ADA
  dan PASS (lihat "Tes end-to-end" di atas). Mekanisme timeout
  `spawnSync` (`ETIMEDOUT` + `status: null`) sebelumnya
  diverifikasi terpisah; kini terbukti melalui parent harness
  yang sebenarnya, termasuk terminasi ke-12 child.]**
- Rentang yang disetujui 1..10 adalah keputusan harness
  v2.3.16 (5 run per kombinasi adalah yang dipakai; 10 adalah
  batas atas untuk pengulangan yang lebih besar tanpa mengubah
  kode). Bukan batas yang ditetapkan owner.
- Test seam `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` adalah
  jalur override yang sengaja ada di harness. **[DIPERKETAT
  v2.3.18 (U-72):]** override kini hanya dihormati bila
  `F029_TEST_MODE=1` eksplisit, script child harus realpath ke
  fixture yang disetujui (`exp-pattern.ts` atau `hang-child.ts`),
  dan path yang diberikan tidak boleh berupa symlink — selain itu
  exit 2 sebelum child mana pun di-spawn (tes regresi
  `test-u72-seam.ts`, log `test-u72-seam-v2318.txt`, 15 assert
  PASS). Perilaku default tidak berubah (tanpa env var, script =
  `exp-pattern.ts`, timeout = 120.000 ms); bila seam aktif, parent
  mencetak baris `test-seam:` eksplisit; reviewer WAJIB memeriksa
  ada/tidaknya baris itu sebelum menerima log sebagai bukti
  produksi; seam hanya dipakai oleh driver E2E yang terdokumentasi.
- **[BARU v2.3.18 (F-034):]** klaim "semua child mati" v2.3.17
  memakai oracle yang menerima semua exception sebagai "mati".
  Oracle itu diganti modul ketat `pid-oracle.ts` (hanya ESRCH =
  mati; EPERM = hidup; lainnya = inconclusive; identitas PID
  diverifikasi via starttime `/proc`); log E2E v2.3.17 tetap
  dipertahankan sebagai bukti historis, tetapi klaim terminasi
  yang mengikat kini bersandar pada log v2.3.18
  (`run-f032-timeout-e2e-v2318.txt`, 12 verdict `dead` via ESRCH
  + starttime tercatat).
- **[BARU v2.3.18 (F-035):]** path PID tetap
  `/tmp/f032-hang-child.pid` tidak lagi dipakai driver mana pun.
  Direktori privat per-run (`mkdtemp`, 0700) + file PID eksklusif
  (0600) + cleanup `finally` adalah mekanismenya sekarang; tes
  paralel + symlink membuktikannya (log
  `test-f035-pidfile-v2318.txt`). Jendela mikro antara `lstat`
  dan `append` di `hang-child.ts` ditutup oleh direktori privat
  itu sendiri (hanya pemilik yang bisa menulis di dalamnya);
  pemeriksaan `lstat` adalah lapis pertahanan tambahan, bukan
  satu-satunya kontrol.
- **[PEMBARUAN v2.3.19 (F-035 trust boundary + F-037):]** pola
  `lstat` lalu `appendFileSync` di `hang-child.ts` DIGANTI
  open fd `O_NOFOLLOW` + verifikasi `fstat` pada descriptor +
  penjepitan (dev,ino) ke file yang dibuat driver; proses tidak
  tepercaya UID-sama dinyatakan eksplisit DI LUAR threat model
  harness (alasan di header `hang-child.ts` + matriks v2.3.19) —
  penjepitan fd adalah defense-in-depth terhadap swap path yang
  tidak disengaja. Tes F-035/U-72 sendiri ditulis ulang agar
  tidak memakai path tetap `/tmp` (F-037): semua fixture di
  direktori privat, exclusive create, fail-safe bila path legacy
  sudah ada, cleanup terverifikasi (dev,ino). Kedua tes MENOLAK
  berjalan sebagai root; bukti kanonik uid 65534 dari salinan
  stage byte-identik (sha256 terverifikasi).
