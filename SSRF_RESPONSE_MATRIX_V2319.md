# Matriks Respons v2.3.19 atas Audit Independen V12

**Revisi:** v2.3.19 — jawaban atas audit independen V12
(`SSRF_INDEPENDENT_AUDIT_V12.md`, commit `cd96768`, audit
2026-11-08 11:36 WIB atas v2.3.18 commit `3f129fc`)
**Tanggal revisi:** 2026-11-08 (WIB)
**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**
**Dokumen desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.30
**Proposal F-001..F-005:** `SSRF_PROPOSAL_F001_F005_V2319.md`
**Staging readiness:** `STAGING_READINESS_V2319.md`
**Matriks sebelumnya:** `SSRF_RESPONSE_MATRIX_V2318.md`
(diperbarui status F-034/F-035/U-72 di bawah; isinya
dipertahankan utuh sebagai catatan sejarah)

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.19

(a) desain remediasi — boleh dilanjutkan dan ditinjau (inilah
v2.3.19); (b) implementasi pada source code — butuh persetujuan
eksplisit terpisah dari pemilik proyek, **TIDAK diberikan saat
ini**; (c) penerapan ke situs live — butuh persetujuan dan
prosedur deployment tersendiri. **Perubahan pada source mirror
GitHub TIDAK otomatis berarti situs live berubah.** v2.3.19
TIDAK mengimplementasikan apa pun; F-001..F-005 tetap
OPEN/BLOCKED sampai tahap (b) + bukti harness staging.

## Cara membaca status

- **addressed** — perbaikan selesai dengan bukti yang dapat
  dilacak (file, test ID, log mentah, commit SHA, tanggal run)
  dan kriteria yang benar-benar lolos.
- **partially addressed** — sebagian dikerjakan; sisanya
  dinyatakan eksplisit sebagai pekerjaan berikutnya, bukan
  disembunyikan.
- **blocked** — tidak dapat dikerjakan tanpa keputusan owner /
  bukti runtime / staging; hambatan + yang sudah dicoba +
  hasilnya dicatat di §10.
- **rejected** — tidak dikerjakan karena alasan teknis yang
  dijelaskan + bukti yang dapat direproduksi (bukan diam-diam
  dihilangkan).
- **NOT VERIFIED** — belum ada bukti; bukan klaim benar/salah.

## §1. Ringkasan status F-001..F-037

| ID | Temuan | Status v2.3.19 | Ringkasan |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Proposal implementation-ready SELESAI (`SSRF_PROPOSAL_F001_F005_V2319.md` §1: file/fungsi/baris terverifikasi pada main `cd96768`, pseudodiff, threat model, H-SSRF-01..26, dependensi staging, rollback). Implementasi tetap menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Proposal SELESAI (proposal §2: streamed cap L1/L2/L3, H-RES-01..03 + 07..10, aggregate 1.000.000 decoded byte). Implementasi menunggu tahap (b). |
| F-003 | High — tanpa total deadline | **blocked** | Proposal SELESAI (proposal §3: deadline 30 detik dipertahankan + diuji, cancellation grup, concurrency/rate bounds — yang terakhir ini TERBUKTI BELUM ADA di kode). Tetap OPEN sampai H-RES-04..06 + 11..12 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Proposal SELESAI sebagai SATU migrasi koheren dengan F-018 (proposal §4: migrasi `0006`, pre-check duplikat fail-closed, backfill OWNER_USER_ID, H-CAT-01..06). Migrasi menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Proposal SELESAI (proposal §5: tiga opsi mekanisme A/B/C tanpa asumsi SDK yang belum dibuktikan; default Opsi C — nonaktifkan sampai mekanisme terbukti; H-AUTH-01..06). Mekanisme butuh keputusan pemilik (K-4). |
| F-006b | Narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah. |
| F-006c | DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah. |
| F-016 | Cache fetch | **blocked** | Tidak berubah; cabang pilihan G-F kini menjadi keputusan K-1 di proposal. |
| F-017 | Cache key tidak memperhitungkan cap | **blocked** | Tidak berubah. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | Proposal migrasi gabungan SELESAI (§4 proposal); semantik tenancy runtime tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checklink` MASIH TERDAFTAR; tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. `checkLink` TIDAK di-invoke. Deployment tetap BLOCKED. |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan); template manifest tetap kosong. |
| F-030 | Bun/lockfile + SDK path | **blocked (CONFIRMED BLOCKER)** | Tidak berubah. |
| F-033 | Rasio memori A/B terkonfounded | **addressed** (dipertahankan sebagai VM evidence saja) | Tidak berubah: rasio 1,12–2,62× tetap HANYA bukti VM; F-029 TIDAK diulang. |
| F-034 | Low — oracle terminasi child menerima semua exception sebagai proses mati | **addressed** | **DIPERBAIKI CELAH SISA (F-036):** parser kini menolak starttime 0; `classifyLiveness()` memvalidasi input sendiri; `verifyPidFile()` gagal-cepat seluruh file. Tes regresi 50 assert PASS (log `test-pid-oracle-v2319.txt`). |
| F-035 | Low — PID file E2E memakai path tetap di /tmp dan rentan symlink/TOCTOU | **addressed** (harness VM) | **DIPERKUAT v2.3.19:** child writer kini fd-based O_NOFOLLOW + penjepitan (dev,ino); trust boundary UID-sama dinyatakan eksplisit DI LUAR threat model (U-77). Tes regresi ditulis ulang (F-037): 59 assert PASS (log `test-f035-pidfile-v2319.txt`). |
| F-036 | Low — parser menerima starttime nol dan dapat salah menyatakan PID hidup sebagai mati | **addressed** | **BARU v2.3.19:** `starttime <= 0` ditolak di `parsePidFile()` + `parseProcStat()`; validasi input di `classifyLiveness()`; fail-fast `verifyPidFile()`; tes regresi 50 assert PASS (log `test-pid-oracle-v2319.txt`, uid 65534). |
| F-037 | Medium — tes regresi memakai path tetap di /tmp dan dapat menghapus/menimpa file yang bukan miliknya | **addressed** | **BARU v2.3.19:** `test-f035-pidfile.ts` + `test-u72-seam.ts` ditulis ulang — direktori privat mkdtemp 0700, exclusive create, fail-safe bila path legacy sudah ada, cleanup terverifikasi (dev,ino); kedua tes menolak berjalan sebagai root. Log `test-f035-pidfile-v2319.txt` (59 assert PASS) + `test-u72-seam-v2319.txt` (25 assert PASS), uid 65534. |
| U-72 | Test seam F029_CHILD_SCRIPT | **addressed** (harness lokal) | Dipertahankan + tes ditulis ulang untuk F-037 (lihat F-037). |
| U-73 | Oracle terminasi (F-034) | **addressed** | Dipertahankan; celah sisa F-036 ditutup v2.3.19 (lihat F-036). |
| U-74 | File PID path tetap (F-035) | **addressed** | Dipertahankan; pola child writer diperkeras + trust boundary diklarifikasi v2.3.19. |
| U-75 | Parser starttime 0 (F-036) | **addressed** | **BARU v2.3.19** — lihat F-036. |
| U-76 | Tes regresi path tetap (F-037) | **addressed** | **BARU v2.3.19** — lihat F-037. |
| U-77 | Trust boundary UID-sama (F-035) | **accepted assumption** (risiko tersisa tercatat) | **BARU v2.3.19** — same-UID tak tepercaya dinyatakan eksplisit DI LUAR threat model harness; fd pinning sebagai defense-in-depth; tinjau ulang bila harness jalan di host bersama. |

## §2. Respons per temuan baru V12

### F-036 — Low: parser menerima starttime nol — **addressed** (oracle + parser diperketat, tes regresi, E2E diulang)

**Yang diubah:**
- `evidence/f032-harness-validation/pid-oracle.ts`:
  - `parsePidFile()`: `starttime <= 0` → error ("must be a positive safe integer") — sebelumnya `< 0`.
  - `parseProcStat()`: `starttime <= 0` → `null` (konsisten: starttime 0 bukan nilai proses hidup yang valid).
  - `classifyLiveness()`: validasi input sendiri di awal — pid harus safe integer 1..2^31−1, recordedStarttime harus positive safe integer; invalid → verdict `"inconclusive"` (tidak pernah `"dead"`), dan `kill()` tidak pernah dipanggil.
  - `verifyPidFile(text, expectedCount, deps)` (BARU): parse ketat → bila ADA error, return `{ ok: false, errors, verdicts: [] }` TANPA memanggil `classifyLiveness()` pada record mana pun; lalu wajib `records.length === expectedCount`; lalu klasifikasikan semua; `ok` hanya bila SEMUA verdict `"dead"`. Fail-fast ditegakkan di SATU tempat dan diuji unit.
- `evidence/f032-harness-validation/run-f032-timeout-e2e.ts`: memakai `verifyPidFile()` (bukan loop inline) — parse error kini berarti driver exit non-zero TANPA satu pun assertion liveness.
- `evidence/f032-harness-validation/test-pid-oracle.ts`: +19 assert (total 50).

**Bukti:**
- Log `evidence/f032-harness-validation/test-pid-oracle-v2319.txt`
  (59 baris, Bun 1.4.4, uid 65534, 2026-11-08 12:00:27 WIB,
  SHA-256 `338838506803b0f758a9d4ca21ddb2972739b21de60a657e135c81acdffb0c66`,
  exit 0): 50 assert PASS — termasuk kasus penerimaan audit
  `parsePidFile("1234 0\n")` → error; starttime negatif,
  non-integer, unsafe integer (2^53+1), sangat besar; record
  valid+invalid campur; `parseProcStat` starttime 0 → null;
  8 kasus validasi input `classifyLiveness()` (kill() tidak pernah
  dipanggil); 4 kasus `verifyPidFile()` (campur → ok=false,
  0 verdict, kill() tidak pernah dipanggil; count mismatch → sama;
  semua dead → ok=true; satu alive → ok=false).
- Log E2E `run-f032-timeout-e2e-v2319.txt` (191 baris, Bun 1.4.4,
  uid 65534, exit 0): driver baru PASS end-to-end (12 FAIL timeout,
  12 verdict `dead` via ESRCH, 12 == 12).
- **Catatan jujur tentang eksekusi non-root:** repo tidak dapat
  dibaca oleh `nobody` (mode 2770 `root:nogroup` pada mount yang
  menegakkan akses host-side — diverifikasi: `setpriv … id`
  menunjukkan uid/gid 65534 tanpa capability, tetapi `ls` repo
  tetap Permission denied). Tes dijalankan dari salinan stage
  byte-identik di `/tmp/f036-stage` (sha256 tiap file `.ts`
  diverifikasi IDENTIK dengan repo sebelum run). Salinan stage
  masih ada di `/tmp/f036-stage` untuk pemeriksaan ulang; `/tmp`
  bersifat ephemeral dan bukan bagian dari repo. Bukti kanonik
  adalah uid 65534 — BUKAN root.

**Sisa risiko:** tidak ada untuk F-036 pada level harness VM —
parser + oracle + driver kini fail-closed pada starttime 0.
Aturan EPERM→alive tetap dibuktikan stub injeksi deterministik
(seperti v2.3.18), bukan oleh proses hidup — VM ini tidak
menyediakan EPERM hidup yang dapat diproduksi sebagai bukti.

### F-037 — Medium: tes regresi memakai path tetap di /tmp — **addressed** (kedua file tes ditulis ulang)

**Yang diubah:**
- `evidence/f032-harness-validation/test-f035-pidfile.ts`
  (ditulis ulang):
  - Semua fixture kecuali simulasi legacy berada di SATU direktori
    privat per-run (`mkdtemp`, chmod 0700, realpath + kepemilikan
    divalidasi).
  - Fixture legacy (symlink + regular file di path lama) dibuat
    EKSKLUSIF (`openSync "wx"`, 0600); bila salah satu path legacy
    SUDAH ADA saat tes mulai, tes GAGAL AMAN (throw → `finally`
    membersihkan direktori privat → exit 1) tanpa menyentuh path
    itu — tidak pernah `rmSync`/`writeFileSync` pada path yang
    mungkin sudah ada.
  - Teardown hanya menghapus objek yang (dev,ino)-nya masih cocok
    dengan yang dicatat saat pembuatan; objek yang diganti
    dibiarkan dan dilaporkan FAIL.
  - DUA skenario (legacy = symlink DAN legacy = regular file),
    masing-masing dua driver paralel.
  - Snapshot leftover `/tmp` (prefix `f032-e2e-` / `f035-test-`)
    di awal (sebelum mkdtemp — perbaikan atas bug run pertama,
    lihat §10) dan akhir.
  - Tes MENOLAK berjalan sebagai root (uid 0) dengan pesan yang
    menjelaskan cara run non-root.
- `evidence/f029-memory-methodology/test-u72-seam.ts`
  (ditulis ulang): semua fixture (`u72-evil-child.ts`, symlink,
  pidfile, non-script, nonexistent) di dalam direktori privat
  `mkdtemp` 0700; exclusive create; fail-safe bila ada entri
  `/tmp/u72-*` sisa run lama; cleanup terverifikasi (dev,ino);
  kasus penerimaan kini meneruskan (dev,ino) file PID ke
  `hang-child.ts` v2.3.19; menolak berjalan sebagai root.

**Bukti:**
- Log `evidence/f032-harness-validation/test-f035-pidfile-v2319.txt`
  (75 baris, Bun 1.4.4, uid 65534, 2026-11-08 12:05:23 WIB,
  SHA-256 `b95e1a3d893361f47734b7d93f6e20cea98f54d962039c3a4f7621c7ccc536fa`,
  exit 0): **59 assert PASS, 0 FAIL** — kedua skenario: symlink
  lama tidak berubah (sha256 sentinel sama sebelum/sesudah,
  symlink tetap menunjuk target), regular file lama tidak berubah
  (tetap regular, isi sama), dua driver paralel per skenario
  (direktori berbeda, set PID disjoint 12+12), cleanup
  terverifikasi, tidak ada leftover `/tmp`.
  - Run pertama (12:02 WIB) GAGAL dengan 58 PASS + 1 FAIL karena
    bug urutan self-check di tes itu sendiri (cek leftover
    berjalan SETELAH mkdtemp sehingga menghitung direktorinya
    sendiri) — BUKAN cacat harness/driver; semua 58 assert
    fungsional lolos. Diperbaiki (cek dipindah sebelum mkdtemp),
    re-run 12:05 WIB → 59 PASS. Detail di §10; log run pertama
    tertimpa oleh re-run (path sama) — kegagalannya dicatat di
    sini, tidak disembunyikan.
- Log `evidence/f029-memory-methodology/test-u72-seam-v2319.txt`
  (36 baris, Bun 1.4.4, uid 65534, 2026-11-08 12:00:27 WIB,
  SHA-256 `f01b78093d33b3cc839261319f4bd5fba3f82d989100e243a5629fcb423ef866`,
  exit 0): **25 assert PASS, 0 FAIL** — 7 penolakan + 1 penerimaan
  seperti v2.3.18, ditambah pemeriksaan direktori privat + cleanup
  terverifikasi (dev,ino) + tidak ada leftover `/tmp/u72-*`.

**Sisa risiko:** tidak ada pada level harness VM — `writeFileSync`
tidak lagi dipakai di kedua file tes; `/tmp/u72-*` tidak lagi
ditulis di mana pun (hanya dibaca via `readdir` untuk fail-safe);
satu-satunya penulisan ke path legacy adalah pembuatan EKSKLUSIF
fixture simulasi di `test-f035-pidfile.ts` (gagal aman bila path
sudah ada); semua `rmSync` hanya menghapus objek yang (dev,ino)-nya
terverifikasi milik invocation ini. Bila suatu hari
tes dijalankan sebagai root, tes menolak berjalan — bukti
privileged, bila diperlukan, harus dicatat terpisah (belum ada).

### Trust boundary F-035 child writer — **addressed** (keputusan eksplisit + pola fd-based)

**Keputusan (dicatat di header `hang-child.ts` + desain §D.4.30):**
proses tidak tepercaya dengan UID YANG SAMA secara eksplisit
**DI LUAR** threat model harness — asumsi yang diterima, bukan
celah yang disembunyikan. Alasan teknis:
1. Harness berjalan di VM single-user sebagai satu UID oleh
   desain: driver, parent harness, dan child semuanya UID sama.
2. Proses same-UID sudah dapat ptrace driver (child adalah
   descendant, yang diizinkan ptrace_scope), membaca
   `/proc/<driver-pid>/mem`, memberi signal/membunuh driver, dan
   menulis file apa pun yang dapat ditulis driver. Tidak ada cek
   level-file — berbasis fd atau bukan — yang dapat mengisolasi
   terhadap same-UID.
3. Direktori run 0700 sudah mengecualikan setiap UID LAIN; hanya
   proses same-UID yang dapat mencapai path file PID.
4. Child itu sendiri adalah kode TEPERCAYA: di-spawn driver
   melalui seam U-72 dari path yang di-allowlist, bukan writer
   yang tidak tepercaya.

**Perbaikan yang tetap diterapkan (defense-in-depth):** pola
`lstat` lalu `appendFileSync` DIGANTI dengan open fd
`O_WRONLY|O_APPEND|O_NOFOLLOW` (numerik — diverifikasi dengan
probe sebagai nobody: symlink → ELOOP, regular file → terbuka
dan ter-append) + verifikasi `fstat` pada DESCRIPTOR (regular,
uid sama, mode 0600, (dev,ino) sama dengan yang dicatat driver
dan diteruskan via `F032_PID_FILE_DEV`/`F032_PID_FILE_INO`) +
satu `writeSync`. Bila env pin tidak ada → child exit 1 (fail
loud). Ini menutup jendela TOCTOU sepenuhnya untuk swap path
yang tidak disengaja / stale — skenario penggantian path di
antara validasi dan write TIDAK DAPAT mengalihkan write ke target
lain (fd ter-pin ke inode sejak open; symlink saat open → ELOOP).

**Bukti:** log E2E `run-f032-timeout-e2e-v2319.txt` (12 child
menulis via fd ter-pin, dev/ino tercatat di log driver:
`dev=85 ino=108` pada run ini; 12/12 `dead` via ESRCH).
**Sisa risiko (U-77):** bila harness kelak dijalankan di host
bersama di mana proses same-UID tidak tepercaya, asumsi ini harus
ditinjau ulang (pemisahan UID per proses, atau supervisor yang
memiliki file PID). Sampai saat itu, U-77 adalah asumsi yang
diterima dan tercatat, bukan temuan yang ditutup diam-diam.

### F-001..F-005 — proposal implementation-ready — **blocked** (proposal SELESAI; implementasi tetap menunggu tahap b)

**Yang dikerjakan (menjawab V12 §10 butir 4 + brief butir 2):**
dokumen baru `SSRF_PROPOSAL_F001_F005_V2319.md` (SHA-256
`7f5a0f570b1fe3e69759cfa193647b78fbdc583cd5d7dc0ac8d711d23bc5a77e`,
~58 KB). Untuk SETIAP finding:
- **Verifikasi current main** — file/fungsi/baris dibaca langsung
  pada main commit `cd96768` (bukan dari ingatan): `fetchText`
  :147-168, `fetchTextOnce` :170-210, `lookupRdapOnce` :220-268
  (termasuk `redirect: "follow"` baris 235 — temuan baru F-001f),
  `analyze` :369 + deadline :378 + page cap :396 + script fetch
  :511-538, `addProject` :1103-1262, `checkLink` defineAction
  :1365, `addProject` defineAction :1486, `schema.ts` (67 baris,
  tanpa unique/index/owner), migrasi drizzle `0001..0005`.
  Fakta yang menguatkan proposal: tidak ada `lookup`/DNS/
  klasifikasi IP di jalur fetch (grep nol); tidak ada lease/rate
  limit/429/503 di `actions.ts` (grep nol); `addProject` memakai
  dua SELECT lalu INSERT (race terbuka) dan komentar kode sendiri
  menyatakan "Ini BUKAN unique constraint".
- **File list + pseudodiff** per fungsi (modul baru
  `ssrf-guard.ts`: `canonicalizeHost`, `classifyIp`,
  `resolveAll`, `validateDestination`, `fetchGuarded`,
  `readCappedStream`, `ScanBudget`, `acquireScanSlot`).
- **Threat model** per finding (penyerang, kemampuan, yang harus
  tetap mustahil) + asumsi yang dinyatakan eksplisit.
- **Matriks tes:** H-SSRF-01..20 (ada) + H-SSRF-21..26 (baru:
  redirect-by-redirect, rebinding terikat destination aktual,
  IPv6 mapped + NAT64, RDAP redirect, script redirect);
  H-RES-01..03 + H-RES-07..10 (baru: aggregate, gzip bomb via
  redirect, chunk tunggal > cap, body redirect tidak dibaca);
  H-RES-04..06 + H-RES-11..12 (baru: slow-drip script,
  pembatalan grup); H-CAT-01..03 + H-CAT-04..06 (baru: duplikat
  case/spasi bersamaan, migrasi dengan katalog berduplikat,
  migrasi tanpa OWNER_USER_ID); H-TEN-01..05 + H-TEN-06..07
  (baru: backfill 15 baris, down migration); H-AUTH-01..03 +
  H-AUTH-04..06 (baru: lintas tenant, provenance palsu, rotasi
  token). Tiap kasus: setup, PASS yang diharapkan, FAIL yang
  diharapkan, lingkungan staging.
- **SSRF mencakup yang diminta audit:** validasi redirect
  per-hop, DNS rebinding terikat destination koneksi aktual
  (pinning Pendekatan 1/2; bila runtime tidak mendukung →
  BLOCKED), IPv4/IPv6/mapped/private/link-local/metadata,
  bounded streaming, dekompresi, aggregate byte budget
  (1.000.000 decoded byte/scan), total deadline + cancellation.
- **F-004 + F-018 sebagai SATU migrasi koheren** (migrasi `0006`:
  kolom `owner_user_id` + 2 unique index terpisah + backfill
  berparameter + pre-check duplikat fail-closed + down
  migration; `savedProjects` tanpa kolom owner — kepemilikan
  diturunkan via JOIN).
- **F-005 tanpa asumsi SDK:** tiga opsi (A: allowlist runtime —
  HANYA bila provider menyatakan tertulis; B: service token —
  tanpa asumsi SDK; C: nonaktifkan `addProject` — DEFAULT);
  provenance diisi server, bukan verbatim dari caller.
- **Urutan implementasi 5 langkah + kriteria penerimaan
  keseluruhan** (§6 proposal) + **daftar keputusan owner K-1..K-6
  + G-A** (§7 proposal).

**Status tetap:** F-001..F-005 **OPEN/BLOCKED**. Proposal ini
implementation-ready dalam arti V12 §10 butir 4 (reviewer dapat
menilai tanpa menebak), tetapi BUKAN implementasi dan BUKAN
otorisasi tahap (b). Penutupan tiap finding butuh: semua kasus
tesnya PASS di staging + migrasi/rollback dieksekusi di staging
+ keputusan K-1..K-6 tercatat + review independen atas
implementasi itu sendiri.

### F-019 / F-028 — **blocked (NOT VERIFIED)** (dipertahankan)

Tidak ada bukti baru. `checkLink` TIDAK di-invoke di v2.3.19.
Kontrol F-019 (a)–(e) tetap belum satu pun terpenuhi; LIVE
VERSION / DEPLOYMENT APPROVAL tetap NOT VERIFIED (semua field
manifest NOT PROVIDED); template manifest tetap kosong.
`STAGING_READINESS_V2319.md` membawa tabel v2.3.18 ke depan
tanpa perubahan status.

### F-030 / F-009 — **blocked (CONFIRMED BLOCKER)** (dipertahankan)

Tidak ada digest/provenance baru yang dikarang; tidak ada clean
external builder baru. Opsi A/B tetap proposal (HOLD).

### F-033 — **addressed** (dipertahankan sebagai VM evidence saja)

F-029 TIDAK diulang (tidak ada perubahan metodologi/runtime yang
relevan). Rasio 1,12–2,62× tetap HANYA bukti VM. SU-T5 TIDAK
direkonstruksi. Bukti VM dipisah ketat dari staging.

## §3. Response to Previous Handoff — status temuan V11 menurut audit V12 §3 (dicatat, bukan diklaim ulang)

| Butir V11 | Status menurut V12 §3.1 | Status v2.3.19 |
| --- | --- | --- |
| 1. F-034 oracle PID | PARTIALLY ADDRESSED — parser mengizinkan starttime 0 (F-036) | **ADDRESSED** — F-036 ditutup dengan bukti (§2 F-036) |
| 2. F-035 file PID | ADDRESSED — harness VM (dengan F-037 pada kode tes) | **ADDRESSED** — F-037 ditutup; trust boundary diklarifikasi (§2 F-037 + trust boundary) |
| 3. U-72 child-script seam | ADDRESSED — harness lokal | **ADDRESSED** — dipertahankan; tes ditulis ulang untuk F-037 |
| 4. F-033 tetap VM-only | ADDRESSED AS CARRY-FORWARD | **ADDRESSED AS CARRY-FORWARD** — tidak berubah |
| 5. F-030/F-009 | ADDRESSED AS CARRY-FORWARD | **ADDRESSED AS CARRY-FORWARD** — tetap blocker |
| 6. F-019/F-028 | ADDRESSED AS CARRY-FORWARD — NOT VERIFIED | **ADDRESSED AS CARRY-FORWARD — NOT VERIFIED** — tidak berubah |
| 7. Owner staging | ADDRESSED AS GAP DOCUMENTATION, staging tetap BLOCKED | **ADDRESSED AS GAP DOCUMENTATION** — `STAGING_READINESS_V2319.md`, keenam peran tetap UNASSIGNED |
| 8. Baseline security/provenance | ADDRESSED AS CARRY-FORWARD | **ADDRESSED AS CARRY-FORWARD** — proposal F-001..F-005 kini ada (§2), status temuan tetap OPEN/BLOCKED |
| 9. Tidak ada implementasi tanpa otorisasi | ADDRESSED | **ADDRESSED** — dipatuhi (tidak ada perubahan source aplikasi, DB, package/lockfile, deployment, runtime) |

**Execution brief 8 Nov (V12 §3.2):** butir 1 (F-034/F-035/U-72)
dikerjakan secara material di v2.3.18 + celah sisanya ditutup
v2.3.19; **butir 2 (proposal F-001..F-005) SELESAI v2.3.19** —
tidak lagi tertunda; butir 3 (staging readiness) tabel tersedia,
readiness operasional tetap tidak ada (keenam peran UNASSIGNED,
dua bukti minimum belum tersedia).

## §4. Jawaban atas Handoff V12 §10 (6 butir)

### Butir 1 — Tutup gap F-036 pada parser PID — **addressed**

- Validasi starttime `<= 0` di `parsePidFile()` + `parseProcStat()`
  (`pid-oracle.ts`); validasi input langsung di `classifyLiveness()`
  (invalid → inconclusive, tidak pernah dead, `kill()` tidak
  dipanggil); `verifyPidFile()` menghentikan pemeriksaan liveness
  seluruh file bila ada parse error (tidak ada record parsial).
- Acceptance audit terpenuhi: `parsePidFile("1234 0\n")` error;
  driver exit non-zero tanpa assertion liveness bila ada parse
  error (dibuktikan `verifyPidFile` + tes: kill() tidak pernah
  dipanggil pada file campur); kontrol positif starttime valid
  tetap lolos (50 assert PASS, termasuk file valid 3 record +
  E2E 12/12).
- Bukti: `pid-oracle.ts` `fe6dd206…`; `test-pid-oracle.ts`
  `71925f3a…`; log `test-pid-oracle-v2319.txt` `33883850…`
  (50 assert PASS, Bun 1.4.4, uid 65534, 2026-11-08 12:00:27 WIB,
  exit 0); log E2E `run-f032-timeout-e2e-v2319.txt` `eed1b660…`.

### Butir 2 — Perbaiki keselamatan filesystem pada tes F-035 dan U-72 — **addressed**

- Semua path fixture tetap `/tmp/u72-*` dan sentinel tetap
  diganti direktori privat per-run (`mkdtemp` 0700); exclusive
  create (`openSync "wx"`, 0600), no-follow; tidak ada lagi
  `writeFileSync` pada path yang mungkin sudah ada.
- Tes F-035 gagal aman bila legacy path sudah ada (throw →
  exit 1, tanpa menyentuh path itu) — dibuktikan oleh desain
  (cek `lstat` sebelum create) dan oleh dua skenario (symlink +
  regular file) yang memverifikasi file lama tidak berubah.
- Cleanup hanya inode/file yang dibuat invocation itu
  ((dev,ino) dicatat saat pembuatan, diverifikasi ulang saat
  teardown).
- Acceptance audit terpenuhi: symlink dan regular file
  pre-existing tidak pernah ditimpa/dihapus (59 assert PASS,
  sha256 sentinel sama sebelum/sesudah di kedua skenario); tes
  berjalan paralel tanpa benturan (2 driver per skenario,
  direktori berbeda, PID disjoint); hasil non-root tercatat
  (uid 65534 di semua log); TIDAK ADA run sebagai root — kedua
  file tes menolak uid 0 di kode, dan bukti privileged terpisah
  belum diperlukan/dibuat.
- Bukti: `test-f035-pidfile.ts` `1fcf20a9…`; `test-u72-seam.ts`
  `8fc4aa6e…`; log `test-f035-pidfile-v2319.txt` `b95e1a3d…`
  (59 assert PASS, exit 0); log `test-u72-seam-v2319.txt`
  `f01b7809…` (25 assert PASS, exit 0).

### Butir 3 — Klarifikasi trust boundary F-035 child writer — **addressed**

- Keputusan: proses tidak tepercaya dengan UID YANG SAMA
  dinyatakan eksplisit DI LUAR threat model harness (asumsi yang
  diterima, §2 + header `hang-child.ts` + desain §D.4.30),
  dengan 4 alasan teknis.
- Pola `lstat(path)` lalu `appendFileSync(path)` DIGANTI dengan
  file descriptor no-follow/exclusive + verifikasi inode/owner/
  mode pada descriptor sebelum append (O_NOFOLLOW + fstat +
  penjepitan (dev,ino) via env) — skenario penggantian path di
  antara validasi dan write TIDAK DAPAT mengalihkan write ke
  target lain (fd ter-pin sejak open; symlink saat open → ELOOP).
- Bukti: `hang-child.ts` `f66ea8ee…`; `run-f032-timeout-e2e.ts`
  `1039cf13…`; log E2E `run-f032-timeout-e2e-v2319.txt`
  `eed1b660…` (dev/ino tercatat; 12/12 dead via ESRCH).
- Sisa risiko dicatat sebagai U-77 (tinjau ulang bila harness
  jalan di host bersama dengan same-UID tak tepercaya).

### Butir 4 — Selesaikan proposal implementation-ready F-001..F-005 — **addressed** (proposal SELESAI; temuan tetap OPEN/BLOCKED)

- Untuk setiap finding: file/fungsi/baris diverifikasi pada
  current main (`cd96768`) — lihat proposal §1.1/§2.1/§3.1/§4.1/
  §5.1 (termasuk temuan baru F-001f: RDAP `redirect: "follow"`
  baris 235, dan fakta tidak ada lease/rate limit di `actions.ts`).
- Diberikan: file list, pseudodiff, threat model, mitigasi, test
  IDs (H-SSRF-21..26, H-RES-07..12, H-CAT-04..06, H-TEN-06..07,
  H-AUTH-04..06 — baru), negative cases + expected PASS/FAIL,
  staging dependencies, migration/rollback, residual risk.
- SSRF mencakup: redirect-by-redirect validation, DNS rebinding
  terikat destination koneksi aktual, IPv4/IPv6/mapped/private/
  link-local/metadata, bounded streaming, decompression,
  aggregate byte budget, total deadline/cancellation.
- F-004 + tenancy/ownership F-018 dirancang sebagai SATU migrasi
  koheren (migrasi `0006`); F-005 menjelaskan auth + tenant
  scoping tanpa mengasumsikan SDK behavior yang belum dibuktikan
  (tiga opsi A/B/C; default C).
- Reviewer dapat menilai proposal tanpa menebak perilaku/test
  yang belum didefinisikan (kriteria penerimaan keseluruhan di
  proposal §6).
- **TIDAK diimplementasikan; F-001..F-005 TIDAK ditandai closed**
  — status tetap OPEN/BLOCKED (lihat §1).
- Bukti: `SSRF_PROPOSAL_F001_F005_V2319.md` `7f5a0f57…`.

### Butir 5 — Pertahankan staging readiness dan blocker dengan jujur — **addressed**

- Tidak ada owner yang dikarang; keenam peran tetap UNASSIGNED/
  BLOCKED; staging tetap tidak tersedia (`STAGING_READINESS_V2319.md`
  membawa tabel v2.3.18 ke depan tanpa perubahan status).
- Hanya bukti read-only yang disediakan (tidak ada — tidak ada
  bukti baru); `checkLink` TIDAK di-invoke.
- Bukti: `STAGING_READINESS_V2319.md` (baru, carry-forward).

### Butir 6 — Pertahankan rekonsiliasi historis dan batas bukti — **addressed**

- F-029 TIDAK diulang (tidak ada perubahan metodologi/runtime
  yang relevan). SU-T5 TIDAK direkonstruksi. Bukti VM tidak
  diubah menjadi staging/production PASS (semua log baru
  berlabel VM lokal, Bun 1.4.4, uid 65534).
- Matriks ini menyebut status F-036/F-037, F-001..F-005,
  F-019/F-028, dan staging owners (§1, §2, §4, §11).

## §5. Risk register — U-38/U-33/U-45/U-46 + risiko baru (v2.3.19)

| ID | Risiko | Status v2.3.19 |
| --- | --- | --- |
| U-38-A..D, U-33-A..F | Pemetaan artefak / runtime | Carry-forward; tidak ada bukti baru yang menutupnya. |
| U-41, U-43, U-44, U-45, U-46 | Keputusan owner / pensinyalan | Carry-forward; U-46 tetap keputusan owner yang belum ada (implementasi pensinyalan tetap DIBLOKIR). |
| U-47, U-48, U-49 | DG-1..DG-3 (file lock) | Carry-forward (persyaratan desain, belum diimplementasikan). |
| U-50..U-54 | F-016..F-020 | Carry-forward. |
| U-55..U-58 | F-021/F-022, artifact-state | Carry-forward. |
| U-59..U-62 | H-RES-02/03/05, dekompresi Bun | Carry-forward; U-62 dipersempit (bagian VM terjawab, staging tetap NOT VERIFIED). |
| U-63..U-66 | F-026/F-027/F-028, lockfile | Carry-forward. |
| U-67, U-68 | F-029/F-030 | Carry-forward. |
| U-69, U-70 | F-031/F-032 | Carry-forward; U-70 DIPERBARUI (jalur timeout kini memakai `verifyPidFile()` fail-fast + child writer fd-based; sisa risiko: seam yang diperketat). |
| U-71 | F-033 (instrumen A/B terkonfounded) | Carry-forward (VM-only). |
| U-72 | F-032 test seam | DIPERBARUI (tes seam ditulis ulang untuk F-037: fixture privat, exclusive create, fail-safe, cleanup terverifikasi; sisa risiko: operator yang sengaja menyetel `F029_TEST_MODE=1` dengan fixture yang disetujui lalu mengklaim run itu sebagai run produksi — dimitigasi baris log `test-seam:` eksplisit). |
| U-73 | F-034 oracle terminasi | DIPERBARUI (celah starttime 0 ditutup v2.3.19 — F-036; sisa risiko: EPERM hidup tidak dapat diproduksi di VM — dibuktikan stub). |
| U-74 | F-035 file PID path tetap | DIPERBARUI (child writer kini fd-based O_NOFOLLOW + pin (dev,ino); trust boundary UID-sama diklarifikasi — lihat U-77; sisa risiko: asumsi UID-sama). |
| U-75 | **BARU v2.3.19** (F-036) | Parser PID menerima starttime 0 → child hidup dapat dinilai mati (false-pass terminasi). Penanganan: tolak `<= 0` di kedua parser + validasi input oracle + fail-fast `verifyPidFile()`; tes regresi 50 assert PASS (log `test-pid-oracle-v2319.txt`). |
| U-76 | **BARU v2.3.19** (F-037) | Kode TES regresi memakai path tetap `/tmp` dengan write/truncate + delete tanpa verifikasi kepemilikan — pada host bersama dapat menimpa target symlink / menghapus file asing; run sebagai root memperbesar dampak. Penanganan: direktori privat + exclusive create + fail-safe + cleanup (dev,ino); kedua tes menolak root; log `test-f035-pidfile-v2319.txt` (59 assert) + `test-u72-seam-v2319.txt` (25 assert), uid 65534. Pola path tetap tidak boleh dipakai lagi untuk pengujian harness. |
| U-77 | **BARU v2.3.19** (F-035 trust boundary) | Asumsi yang diterima: proses tidak tepercaya UID-sama DI LUAR threat model harness (alasan: same-UID dapat ptrace/signal/mem-baca driver; direktori 0700 sudah mengecualikan UID lain; child adalah kode tepercaya). Penjepitan fd adalah defense-in-depth terhadap swap path yang tidak disengaja. Bila harness kelak jalan di host bersama dengan same-UID tak tepercaya, asumsi ini harus ditinjau ulang (pemisahan UID / supervisor pemilik file PID). |

## §6. Hard gates — ditegaskan kembali (v2.3.19)

No Link Scanner activation, no public deployment, no production
build, no DB/catalog change, no source implementation tanpa owner
approval terpisah (HOLD perubahan source mirror sampai klarifikasi
F-020 tetap berlaku), no production testing (termasuk tidak
memanggil `checkLink`). F-001..F-005, F-016/F-017/F-022, F-018
tetap OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..26 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup. Proposal v2.3.19 BUKAN
otorisasi implementasi.

## §7. Yang butuh keputusan Rama (pemilik proyek)

- K-1..K-6 + G-A (proposal §7) — keputusan atas cabang cache,
  nilai cap, toleransi deadline, mekanisme otorisasi F-005,
  tenancy F-018, OWNER_USER_ID backfill, dan otorisasi tahap (b).
- G-B — bukti runtime F-019 (versi/digest + kontrol disabled (a)–(e)).
- G-C — keputusan tenancy F-018 (pernyataan resmi provider tentang
  scope `ctx.db`).
- G-D — keputusan U-46.
- G-E — staging tersedia + keenam peran UNASSIGNED terisi.
- G-F — keputusan cache F-022 (sama dengan K-1).
- G-G — keputusan Bun F-009 (kanonik 1.3.10 vs 1.4.4).
- G-H — eksekusi harness H-RES-02/03/05 yang sudah dikoreksi.
- G-I — stress test memori H-RES-03/05 pada staging + proses
  deployment manifest.
- G-J — keputusan reproduksibilitas F-030.
- **G-K (BARU v2.3.19)** — review + keputusan atas proposal
  F-001..F-005: ChatGPT meninjau proposal (`SSRF_PROPOSAL_F001_F005_V2319.md`)
  dan Rama memutuskan K-1..K-6 + G-A. Prasyarat: tidak ada (proposal
  sudah tersedia untuk ditinjau); hasil: keputusan per K-item +
  otorisasi tahap (b) per change set, atau penolakan dengan alasan.

## §8. Yang TIDAK diklaim v2.3.19

- Tidak ada perubahan source aplikasi, database/katalog,
  package/lockfile, workflow CI, deployment, atau live artifact.
- Tidak ada staging, production, CI release, atau live artifact
  yang diuji. Semua log baru adalah tes harness VM lokal
  (Bun 1.4.4, uid 65534).
- F-001..F-005 TIDAK closed. Proposal bukan implementasi.
- F-019/F-028 tetap NOT VERIFIED/BLOCKED. F-030 tetap CONFIRMED
  BLOCKER. Keenam peran staging tetap UNASSIGNED.
- `checkLink` TIDAK di-invoke. Link Scanner TIDAK diaktifkan.
- Rasio memori F-029 (1,12–2,62×) tetap HANYA bukti VM.

## §9. Gate konkret berikutnya (v2.3.19 → v2.3.20)

Pemicu revisi v2.3.20: audit independen V13 atas v2.3.19, ATAU
keputusan owner atas K-1..K-6 / G-A / G-C / G-D / G-F / G-G
(G-K), ATAU bukti runtime G-B, ATAU staging tersedia (G-E) —
mana pun yang datang dulu. Tidak ada revisi baru yang hanya
mengulang status v2.3.19.

## §10. Hambatan, percobaan, dan hasil (dicatat agar tidak diulang)

| # | Hambatan | Percobaan / hasil | Pelajaran |
| --- | --- | --- | --- |
| 1 | Repo tidak dapat dibaca oleh `nobody` (mode 2770 `root:nogroup` pada mount yang menegakkan akses host-side) — padahal tes F-035/U-72 harus berjalan non-root | Dicoba: `setpriv --reuid=nobody … ls` repo → Permission denied; `stat` menunjukkan uid/gid 65534 tanpa capability tetapi akses tetap ditolak (penegakan di luar container). Solusi: stage salinan byte-identik kedua direktori evidence ke `/tmp/f036-stage`, sha256 tiap file `.ts` diverifikasi IDENTIK dengan repo sebelum run, jalankan tes dari stage sebagai nobody, salin log mentah ke repo. Alternatif yang TIDAK dipakai: mengubah permission repo (mengubah state workspace pengguna tanpa diminta — ditolak). | Bila tes non-root dibutuhkan lagi, pakai pola stage + verifikasi sha256; jangan ubah permission repo. |
| 2 | Run pertama `test-f035-pidfile.ts` v2.3.19 GAGAL (58 PASS + 1 FAIL, 2026-11-08 ~12:02 WIB) | Penyebab: bug urutan self-check di tes itu sendiri — cek "tidak ada leftover `/tmp`" berjalan SETELAH `mkdtemp`, sehingga menghitung direktori tesnya sendiri (`f035-test-PPDvjU`) sebagai leftover. BUKAN cacat harness/driver: semua 58 assert fungsional (kedua skenario, driver paralel, symlink/regular file tak tersentuh) lolos. Perbaikan: cek dipindah SEBELUM `mkdtemp`. Re-run 12:05 WIB → 59 PASS, 0 FAIL. Log run pertama tertimpa oleh re-run (path log sama) — kegagalan dicatat di sini + di header log re-run, tidak disembunyikan. | Self-check harus berjalan sebelum artefak yang diperiksanya dibuat; bila tes gagal, simpan log run gagal dengan nama berbeda sebelum re-run. |
| 3 | Probe O_NOFOLLOW sebagai nobody awalnya gagal EACCES | Penyebab: direktori probe dibuat root (mode 755) sehingga nobody tidak bisa menulis. Perbaikan: `chown` direktori probe ke nobody, ulangi probe → symlink ELOOP, regular file terbuka + ter-append. | Buat direktori probe sebagai pengguna yang akan menjalankan probe. |
| 4 | F-001..F-005 belum punya proposal (V12 §3.2 butir 2) | Dikerjakan v2.3.19: verifikasi ulang file/fungsi/baris pada main `cd96768` (read-only) + dokumen proposal lengkap. | — |
| 5 | Staging owners tetap UNASSIGNED; tidak ada keputusan Rama/provider | Tidak ada yang dikarang; `STAGING_READINESS_V2319.md` carry-forward; gate G-K baru mencatat bahwa proposal kini menunggu review ChatGPT + keputusan owner. | — |

## §11. What materially changed (v2.3.18 → v2.3.19) + peta kepatuhan handoff V12

Revisi ini BUKAN pengulangan status: ia menutup celah parser
F-036, menulis ulang keselamatan filesystem tes F-037, mengklarifikasi
+ memperkeras trust boundary child writer F-035, dan menyelesaikan
proposal implementation-ready F-001..F-005 yang ditunda di v2.3.18
— sambil mempertahankan F-030 sebagai CONFIRMED BLOCKER, LIVE
VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (F-028), F-019 BLOCKED,
dan keenam peran staging UNASSIGNED.

| ID | Respons | Rujukan desain/matriks | Bukti (file, test ID, log, SHA, tanggal run) | Kriteria lolos / belum | Risiko tersisa / aksi berikutnya |
| --- | --- | --- | --- | --- | --- |
| F-036 | ADDRESSED | Matriks §2 F-036; desain §D.4.30 | `pid-oracle.ts` `fe6dd206…`; `test-pid-oracle-v2319.txt` `33883850…` (50 assert PASS, Bun 1.4.4, uid 65534, 2026-11-08 12:00:27 WIB, exit 0); `run-f032-timeout-e2e-v2319.txt` `eed1b660…` | Lolos: starttime 0/negatif/non-integer/unsafe ditolak; fail-fast tanpa liveness atas record parsial; driver exit non-zero tanpa assertion liveness bila parse error. Belum: review independen V13 atas paket ini | U-75; audit V13 |
| F-037 | ADDRESSED | Matriks §2 F-037; desain §D.4.30 | `test-f035-pidfile.ts` `1fcf20a9…`; `test-u72-seam.ts` `8fc4aa6e…`; `test-f035-pidfile-v2319.txt` `b95e1a3d…` (59 assert PASS, uid 65534, 2026-11-08 12:05:23 WIB, exit 0); `test-u72-seam-v2319.txt` `f01b7809…` (25 assert PASS, uid 65534, 2026-11-08 12:00:27 WIB, exit 0) | Lolos: symlink + regular file pre-existing tak tersentuh; paralel tanpa benturan; cleanup terverifikasi; tidak ada run root. Belum: review independen V13 | U-76; audit V13 |
| Trust boundary F-035 | ADDRESSED | Matriks §2 trust boundary; desain §D.4.30 | `hang-child.ts` `f66ea8ee…`; `run-f032-timeout-e2e.ts` `1039cf13…`; `run-f032-timeout-e2e-v2319.txt` `eed1b660…` (dev/ino tercatat; 12/12 dead via ESRCH) | Lolos: fd O_NOFOLLOW + fstat pin; asumsi UID-sama dinyatakan eksplisit. Belum: review independen V13 | U-77; tinjau ulang bila harness jalan di host bersama |
| F-034 | ADDRESSED | Matriks §2 F-036; desain §D.4.30 | Bukti sama dengan F-036 | Lolos: celah sisa V12 (F-036) ditutup. Belum: review independen V13 | U-73; audit V13 |
| F-035 | ADDRESSED (harness VM) | Matriks §2 F-037 + trust boundary; desain §D.4.30 | Bukti sama dengan F-037 + trust boundary | Lolos: driver privat + child fd-based + tes aman. Belum: review independen V13 | U-74/U-77; audit V13 |
| U-72 | ADDRESSED | Matriks §2 F-037; desain §D.4.30 | `test-u72-seam-v2319.txt` `f01b7809…` (25 assert PASS) | Lolos: 7 penolakan + 1 penerimaan + fixture privat. Belum: review independen V13 | U-72; audit V13 |
| F-001 | BLOCKED (proposal SELESAI) | Proposal §1; matriks §2 F-001..F-005 | `SSRF_PROPOSAL_F001_F005_V2319.md` `7f5a0f57…` (file/fungsi/baris terverifikasi main `cd96768`; H-SSRF-21..26 baru) | Belum: implementasi menunggu otorisasi tahap (b) G-A + staging STAGE-P01/P03 + review independen atas implementasi | G-K; keputusan K-1/K-2; gate G-A/G-E |
| F-002 | BLOCKED (proposal SELESAI) | Proposal §2; matriks §2 F-001..F-005 | Proposal `7f5a0f57…` (H-RES-07..10 baru; aggregate 1.000.000) | Belum: implementasi + H-RES staging | G-K; keputusan K-2; gate G-H/G-I |
| F-003 | BLOCKED (proposal SELESAI) | Proposal §3; matriks §2 F-001..F-005 | Proposal `7f5a0f57…` (H-RES-11..12 baru; concurrency/rate TERBUKTI belum ada) | Belum: implementasi + H-RES-04..06/11..12 staging | G-K; keputusan K-3; gate G-I |
| F-004 | BLOCKED (proposal SELESAI) | Proposal §4; matriks §2 F-001..F-005 | Proposal `7f5a0f57…` (migrasi 0006 gabungan F-004+F-018; H-CAT-04..06) | Belum: migrasi menunggu otorisasi + staging DB | G-K; keputusan K-5/K-6; gate G-A |
| F-005 | BLOCKED (proposal SELESAI) | Proposal §5; matriks §2 F-001..F-005 | Proposal `7f5a0f57…` (opsi A/B/C; default C; H-AUTH-04..06) | Belum: keputusan mekanisme K-4 + bukti prasyarat Opsi A | G-K; keputusan K-4; gate G-C |
| F-018 | PARTIALLY ADDRESSED | Proposal §4; matriks §2 F-001..F-005 | Proposal `7f5a0f57…` (migrasi gabungan; tenancy runtime tetap NOT VERIFIED) | Belum: pernyataan provider + migrasi staging | G-K; gate G-C |
| F-019 | BLOCKED (NOT VERIFIED) | Matriks §2 F-019/F-028; desain §D.4.30 | Tidak ada test/log baru; `checkLink` TIDAK di-invoke | Belum: kontrol (a)–(e) belum satu pun terpenuhi | Bukti runtime G-B; deployment tetap BLOCKED |
| F-028 | PARTIALLY ADDRESSED (NOT VERIFIED) | Matriks §2 F-019/F-028; desain §D.4.30 | Tidak ada test/log baru; template manifest tetap kosong | Belum: manifest terisi dari provider belum ada | Manifest per deployment; gate G-I |
| F-030 | BLOCKED (CONFIRMED BLOCKER) | Matriks §1; desain §D.4.30 | Tidak ada test/log baru | Belum: clean builder + SDK provenance | Gate G-G/G-J |
| F-033 | ADDRESSED (VM-only) | Matriks §2 F-033; desain §D.4.30 | Tidak ada test/log baru; F-029 TIDAK diulang | Dipertahankan dengan benar | — |
| Staging owners | ADDRESSED AS GAP DOCUMENTATION | `STAGING_READINESS_V2319.md`; matriks §4 butir 5 | Tidak ada test/log baru; keenam peran tetap UNASSIGNED/BLOCKED | Belum: penunjukan peran + bukti baris 7–8 | Gate G-E; G-K |

**File yang diubah/dibuat v2.3.19 (untuk commit):**
- Diubah: `evidence/f032-harness-validation/pid-oracle.ts`,
  `test-pid-oracle.ts`, `test-f035-pidfile.ts`,
  `run-f032-timeout-e2e.ts`, `hang-child.ts`,
  `evidence/f032-harness-validation/README.md`,
  `evidence/f029-memory-methodology/test-u72-seam.ts`,
  `evidence/f029-memory-methodology/README.md`,
  `SSRF_REMEDIATION_DESIGN.md`.
  (`STAGING_READINESS_V2318.md` TIDAK diubah — dipertahankan
  sebagai catatan sejarah; versi baru adalah file terpisah.)
- Baru: `SSRF_PROPOSAL_F001_F005_V2319.md`,
  `SSRF_RESPONSE_MATRIX_V2319.md`, `STAGING_READINESS_V2319.md`,
  `evidence/f032-harness-validation/test-pid-oracle-v2319.txt`,
  `test-f035-pidfile-v2319.txt`, `run-f032-timeout-e2e-v2319.txt`,
  `evidence/f029-memory-methodology/test-u72-seam-v2319.txt`.
- TIDAK diubah: `site/**`, `src/**`, `package.json`, lockfile,
  workflow CI, deployment, database/katalog, live artifact.
