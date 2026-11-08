
## §2. Respons per butir handoff V22 §8

### Butir 1 — F-065: addressed (output path diamankan; tidak ada overwrite, symlink, atau alias ke DB)

**Perubahan source** (`evidence/v2326/principal-key-migration.ts`,
`TOOL_VERSION` v2328-1, commit `a4bc568` di `development`):

- Fungsi baru `guardOutputPath(outPath, dbPath)` dipakai oleh
  SEMUA jalur tulis output (`archive()`, `archiveSpecial()`,
  `rename()` — `--out` dan `--backup`): tolak output symlink
  (`lstatSync`); tolak output yang sudah ada dalam bentuk apa pun
  (tidak pernah overwrite — termasuk hard link ke DB, yang
  dideteksi eksplisit lewat perbandingan device/inode SEBELUM
  penolakan generik "sudah ada"); tolak output yang resolve-nya
  sama dengan DB input (`realpathSync`); tolak basename `app.db`;
  tolak output di bawah path `ts-spaces`; tolak bila direktori
  parent tidak ada (tidak membuat direktori diam-diam).
- Fungsi baru `writePrivateJsonAtomic(outPath, doc, dbPath)`:
  tulis ke temp file di direktori yang sama dengan
  `openSync(tmp, "wx", 0o600)` + `fsyncSync`; publikasikan dengan
  `linkSync(tmp, outPath)` — `link(2)` GAGAL dengan EEXIST bila
  destinasi muncul di antara pemeriksaan dan publikasi, sehingga
  publikasi bersifat atomik DAN eksklusif (`rename(2)` sengaja
  TIDAK dipakai karena ia menimpa destinasi yang sudah ada);
  lalu `unlink` nama temp (nlink akhir harus 1); verifikasi mode
  tepat 0600 (coba `chmod` sekali bila perlu; bila tetap bukan
  privat, hapus file dan FAIL CLOSED), verifikasi nlink == 1, dan
  verifikasi read-back byte-per-byte sebelum caller melanjutkan.
- `rename()` kini menulis backup lewat helper ini DAN memanggil
  `verifyBackupFile()` (baca ulang + parse + cocokkan hash
  integritas + cocokkan mapping/rows dengan yang ditulis)
  SEBELUM `BEGIN IMMEDIATE` — backup yang tidak dapat
  diverifikasi adalah penolakan, bukan rename.

**Bukti (VM, 2026-11-08 ~22:52 WIB; log §8):**

- H-MIGR-19: `archive --out` == path DB → exit 2, pesan
  "SAME file (device/inode)", byte file DB tidak berubah (SHA-256
  sebelum/sesudah sama).
- H-MIGR-20: `--out` symlink ke DB → exit 2, DB tidak berubah,
  symlink tetap symlink (tidak diganti file).
- H-MIGR-21: `--out` hard link ke DB → exit 2, DB tidak berubah.
  Preseden guard (DL-28-01): membuat hard link menaikkan nlink
  DB input menjadi 2, sehingga guard input F-068 menyala LEBIH
  DULU dari pemeriksaan identitas output F-065 — hasil
  observabelnya sama (ditolak, tanpa tulis), dan cabang
  device/inode F-065 tetap dipertahankan sebagai defense-in-depth
  (mis. link dibuat setelah guard).
- H-MIGR-22: `--out` file yang sudah ada → exit 2; byte + mode
  0644 file lama tidak berubah.
- H-MIGR-23: `rename --backup` == path DB, `archive-special
  --out` == path DB, `--out` bernama `app.db`, `--out` di bawah
  direktori `ts-spaces` — keempatnya exit 2, DB tidak berubah,
  tidak ada file yang tercipta.
- Jalur valid tetap bekerja: H-MIGR-32 (archive + rename +
  rollback sukses dengan output baru).

**Risiko tersisa:** tidak ada — untuk jalur output yang diuji.
TOCTOU antara pemeriksaan output dan publikasi ditutup oleh
`link(2)` eksklusif; satu-satunya jendela tersisa adalah
pemeriksaan path DB input (U-118, §5).

### Butir 2 — F-066: addressed (validasi backup schema/integritas ketat; backup tidak lengkap ditolak tanpa write)

**Perubahan source** (file dan commit yang sama):

- Fungsi baru `validateBackupStructure(backup, backupPath)` —
  dipanggil dari `main()` SEBELUM database dibuka, sehingga
  backup yang tidak lengkap/malformed ditolak dengan exit 2 dan
  database TIDAK PERNAH disentuh (bukan hanya "tidak ditulis"):
  `tool` harus `principal-key-migration`; `version` harus ada di
  `SUPPORTED_BACKUP_VERSIONS` (`v2327-1`, `v2328-1`); `mode`
  harus `rename-backup`; mapping harus non-empty dan valid dengan
  aturan yang sama seperti `rename()` (duplikat, entri malformed,
  chain/cycle — semuanya ditolak via `validateMapping()` yang
  dipakai ulang); `rows` harus objek dengan KETIGA section
  `checks`/`saved_projects`/`projects` hadir DAN bertipe array —
  TIDAK ADA lagi default `?? []` (ketiga pemakaian dihapus dari
  `rollback()`); tiap baris divalidasi shape/PK-nya (checks:
  `id` integer + `owner_user_id` string; saved_projects:
  `principal_id` string + `project_id` integer; projects: `id`
  integer + `provenance_submitted_by` string); `countsBefore`
  harus objek dengan ketiga tabel integer non-negatif; total baris
  di semua section harus ≥ 1 (backup dari rename yang tidak
  me-rename apa pun adalah rollback vakum — ditolak, bukan
  dilaporkan sukses); untuk backup v2328-1, `totalRows` wajib
  cocok dengan jumlah baris dan field `integrity`
  `{ algorithm: "sha-256", hash }` wajib ada dan cocok dengan
  hash yang dihitung ulang atas konten kanonis
  (`stableStringify` — kunci diurutkan — atas mapping + rows +
  countsBefore + totalRows).
- `rename()` kini menulis `totalRows` + `integrity` ke setiap
  backup (hash dihitung dengan `node:crypto` `createHash`).
- `rollback()` kini JUGA memeriksa konsistensi counts SETELAH DB
  dibuka tetapi SEBELUM write apa pun: `countsBefore` tiap tabel
  harus sama dengan count saat ini — `rename()` tidak pernah
  mengubah count, jadi perbedaan berarti baris ditambah/dihapus
  setelah rename → tolak exit 2. Pre-validasi F-063 (tiap baris
  masih ada pada currentKey yang diharapkan) + `changes` tepat 1
  + postcondition tetap berjalan setelahnya.
- Keputusan legacy (DL-28-04): backup v2327-1 (tanpa field
  integritas, karena format itu mendahului hash) DITERIMA hanya
  setelah SEMUA cek struktural lain lolos, dengan peringatan
  eksplisit ke stderr ("WARNING … integrity is UNVERIFIED").
  Menolaknya akan mengandaskan operator yang memegang backup sah
  v2327-1; menerimanya diam-diam akan menyembunyikan hilangnya
  jaminan integritas. Peringatan + pencatatan di sini adalah
  jalan tengah yang jujur — bukan penutupan diam-diam.

**Bukti (VM, log §8):**

- H-MIGR-24: `rows={}` → exit nonzero, DB tidak berubah.
- H-MIGR-25: tiap section hilang satu per satu (checks /
  saved_projects / projects) → ketiganya exit nonzero.
- H-MIGR-26: section bukan array (checks objek, saved_projects
  string) → exit nonzero.
- H-MIGR-27: mapping kosong, mapping duplikat, entri tanpa
  `basis`, kunci non-`local:` → keempatnya exit nonzero.
- H-MIGR-28: versi `v9999-9`, tool `other-tool`, mode `archive`
  → ketiganya exit nonzero.
- H-MIGR-29: (a) `countsBefore` diubah + hash dihitung ulang
  (supaya HANYA cek konsistensi count yang bisa menyala) →
  ditolak dengan pesan "count changed"; (b) hash integritas
  diubah menjadi nol → ditolak "integrity hash mismatch";
  (c) semua rows dikosongkan + `totalRows` 0 + hash dihitung
  ulang → ditolak "zero rows". Ketiganya DB tidak berubah.
- H-MIGR-33: backup format v2327-1 (integrity + totalRows
  dihapus, versi diubah) tetap rollback exit 0 DENGAN peringatan
  UNVERIFIED di stderr — perilaku legacy yang didokumentasikan,
  bukan kecelakaan.
- Backup valid tetap rollback normal: H-MIGR-18 diulang + H-MIGR-32
  (rollback exit 0, count tidak berubah).

**Risiko tersisa:** backup v2327-1 yang lolos cek struktural
tetap tidak punya jaminan integritas kriptografis (peringatan
UNVERIFIED dicatat, bukan disembunyikan). Backup yang ditulis
tool versi lain (bukan v2327-1/v2328-1) ditolak — operator harus
memakai tool ini untuk menulis backup.

### Butir 3 — F-067: addressed (output privat 0600 + exclusive-create + retensi terdokumentasi)

**Perubahan source** (file dan commit yang sama):

- Semua output (`archive`, `archive-special`, `rename --backup`)
  kini dibuat lewat `writePrivateJsonAtomic()`: mode 0600 sejak
  lahir (`openSync(..., "wx", 0o600)`), exclusive-create via
  `link(2)`, tidak pernah overwrite (H-MIGR-22), verifikasi mode
  setelah tulis (bila `(mode & 0o777) !== 0o600`, coba `chmod`
  0600 sekali; bila tetap bukan privat, HAPUS file dan fail
  closed exit 1 — bukan dibiarkan dengan mode longgar).
- Tiap dokumen JSON output kini membawa field `retention`:
  file milik operator, mode 0600, simpan sampai rename
  terverifikasi atau di-rollback, lalu hapus secara aman
  (shred/rm); jangan pernah salin ke penyimpanan bersama tanpa
  enkripsi; bila transfer bersama memang diperlukan, enkripsi
  dulu dan hapus salinan plaintext. Aturan yang sama
  didokumentasikan di komentar header tool.

**Bukti (VM, log §8):**

- H-MIGR-30: file archive, archive-special, dan backup rename
  ketiganya `stat` mode tepat 0600, `(mode & 0o077) === 0`;
  backup membawa field `retention` non-empty + hash integritas
  64-hex.
- H-MIGR-22: file existing mode 0644 tidak ditimpa dan modenya
  tidak berubah.
- H-MIGR-32: output jalur valid mode 0600.

**Yang TIDAK diklaim (jujur, DL-28-05):** cabang fail-closed
"bila mode privat tidak dapat diterapkan" ADA di kode
(verifikasi + hapus + exit 1) tetapi TIDAK dapat dipicu langsung
di VM ini — sebagai non-root di filesystem POSIX, `chmod` 0600
pada file milik sendiri praktis selalu berhasil, dan tidak ada
cara sah untuk memaksa kegagalan `chmod` tanpa root atau
filesystem khusus. Cabang ini adalah pertahanan konstruksi
(code-reviewed), bukan perilaku yang teruji. Tidak ada tes yang
mengaku mengujinya.

### Butir 4 — F-068: addressed (hard-link guard; salinan byte diterima; residual TOCTOU dicatat)

**Perubahan source** (file dan commit yang sama):

- `guardDbPath()` kini, setelah cek symlink/`realpath` yang
  sudah ada (F-064): (a) menolak file DB dengan `nlink > 1` —
  file dengan lebih dari satu hard link berbagi inode dengan
  nama lain, dan nama lain itu bisa jadi DB runtime; salinan
  byte hasil `cp` selalu `nlink == 1`, sehingga penolakan ini
  fail-closed tanpa memblokir workflow salinan yang
  terverifikasi; (b) membandingkan device/inode DB terhadap
  setiap path runtime yang didaftar operator di env var
  `PRINCIPAL_MIGRATION_RUNTIME_DBS` (dipisah titik dua) —
  di VM ini tidak ada path runtime yang diketahui/dapat
  dijangkau, sehingga daftar itu normalnya kosong dan (a)
  adalah cek yang operatif; fakta ini dicatat di kode, bukan
  disembunyikan.
- Komentar header tool kini menyatakan eksplisit: `realpath`
  TIDAK membuktikan file adalah salinan (ia mengembalikan nama
  alias, bukan identitas kanonis inode) — klaim lama yang
  menyiratkan sebaliknya diperbaiki, bukan dipertahankan.

**Bukti (VM, log §8):**

- H-MIGR-31: hard link dari DB disposable "runtime-like"
  (nama polos, bukan `app.db`, bukan di bawah `ts-spaces` —
  sehingga HANYA guard hard-link yang bisa menolaknya) ke alias
  bernama polos → `inventory` exit 2 ("hard link") DAN `rename`
  exit 2; salinan byte (`cp`) dari byte yang SAMA → `inventory`
  exit 0 + `rename` exit 0.
- H-MIGR-17 (symlink) diulang 10/10 PASS — guard lama tetap
  bekerja.

**Risiko tersisa (U-118, §5):** TOCTOU antara `guardDbPath()`
dan `new Database()` — hard link yang dibuat proses lain di
antara keduanya tidak terlihat; dan runtime DB yang path-nya
tidak pernah didaftar operator tidak dapat dibandingkan
device/inode-nya. Mitigasi adalah workflow operator
(`cp` ke direktori privat → `stat` nlink==1 → jalankan segera),
bukan klaim dari tool. Ini didokumentasikan, bukan ditutup.

### Butir 5 — Sinkronisasi development dengan main terbaru: addressed

- main HEAD saat re-read: `44a823f` (audit V22 + update handoff).
- Merge commit `2f45148` — merge origin/main (V22) ke
  `development`, **tanpa konflik** (4 file masuk: audit V22,
  matriks v2.3.27, readiness v2.3.27, §D.4.38 desain), push
  langsung terverifikasi via ls-remote.
- Setelah merge: `git rev-list --count development..origin/main`
  = 0 (tidak ada behind); merge base `44a823f220d68f7f49ba5a278dbcda5866dbdca6`.
  Tidak ada merge balik development→main. Semua commit
  pengembangan dipertahankan (HEAD akhir `a4bc568`).
- Catatan kebersihan (DL-28-06): file `.tsbuildinfo`
  (`site/client/.tsbuildinfo.client`,
  `site/server/.tsbuildinfo.server`) tetap **untracked dan tidak
  ikut ter-commit** — staging dilakukan eksplisit per file, tanpa
  `git add -A` (pelajaran dari DL-26-05/DL-27-05).
- Perbedaan dengan klaim tugas: tugas menyebut development "3
  behind main"; hitungan aktual saat merge adalah **4 behind**
  (`5481139`, `1b532e9`, `fb38b65`, `44a823f`) dari merge base
  `2bc34e1` — angka 3 di audit V22 dihitung dari snapshot yang
  lebih lama (sebelum `44a823f` di-commit). Setelah merge ini,
  behind=0 dalam kedua hitungan.

### Butir 6 — Project link provenance: partially addressed (share flag + URL terverifikasi ulang; artifact-to-source tetap NOT VERIFIED)

**Yang diverifikasi v2.3.28 (read-only, tanpa perubahan live
artifact atau workflow/deployment config repo):**

- `artifact.status` slug `airdrop-generate`, 2026-11-08
  ~22:48 WIB: **tidak ada build berjalan;
  `share.shared=true`**, URL
  `https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`
  (sama persis dengan yang diklaim matriks v2.3.26/v2.3.27).
- URL itu diverifikasi merespons dari sesi eksternal
  (`browser.open`, 2026-11-08 ~22:51 WIB, crawl 15:51 UTC
  (<1 menit sebelum pengecekan), judul "Airdrop Generate"
  tampil; isi terambil minimal: `# Airdrop Generate` +
  disclaimer "Content is user generated and unverified").
- **Tidak ada perubahan** sejak snapshot v2.3.27 (~21:18–21:20
  WIB): slug, flag share, dan URL yang sama.

**Yang belum terpenuhi (jujur — sama seperti v2.3.27, dan
tetap dicatat sebagai kekurangan tooling, bukan sebagai
kegagalan sekali cek):**

- **HTTP status TIDAK diklaim** — tool `browser.open` tidak
  menampilkan status HTTP, jadi "status 200" tetap bukan bukti
  yang teramati.
- **Artifact-to-source NOT VERIFIED** — tidak ada catatan
  build/publish, source commit, version, atau digest di repo yang
  menghubungkan slug `airdrop-generate` ke `landing/` (branch
  `project-landing`) atau ke konten lain. `artifact.status`
  TIDAK mengekspos source commit/digest/build log — tooling
  tidak menyediakan jalur static publish terpisah yang dapat
  dicatat; keterbatasan spesifik ini dicatat, dan TIDAK ada URL
  baru yang dikarang. `landing/README.md` masih menyatakan
  NOT DEPLOYED / NO PUBLIC URL VERIFIED. Perbedaan judul
  `landing/index.html` ("AIRDROP GENERATE — Web3 Security
  Intelligence") vs judul URL publik ("Airdrop Generate") tetap
  melemahkan dugaan artifact itu adalah publish langsung dari
  `landing/`, tetapi bukan bukti final karena fetch hanya
  mengembalikan teks minimal.
- Maka butir 6 = partially addressed: share flag + akses URL
  kini terverifikasi ulang dengan snapshot bertanggal di bawah;
  artifact-to-source tetap terbuka. Artifact ini tetap **bukan**
  application trial — informasional saja.

**Snapshot U-117 bertanggal (2026-11-08 ~22:48–22:51 WIB):**
slug `airdrop-generate`; `share.shared=true` (via
`artifact.status`); tidak ada build berjalan; URL
`https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`;
health check eksternal `browser.open` 22:51 WIB — BERHASIL
diambil, judul "Airdrop Generate", crawl 15:51 UTC (<1 menit);
HTTP status tidak ditampilkan tool; source artifact/revision
NOT VERIFIED (tidak ada catatan build/publish di repo, tooling
tidak mengeksposnya); klasifikasi: URL merespons (terverifikasi
ulang); share flag terverifikasi `true`; artifact-to-source
tetap NOT VERIFIED.

### Butir 7 — CI dan staging: blocked (tetap, dengan bukti baru yang diverifikasi langsung)

- **U-116 CI/branch governance — dikonfirmasi ulang dengan
  `gh api` langsung (2026-11-08 ~22:48 WIB), bukan mengulang
  klaim audit:**
  - `GET /repos/nusasaputrarama-max/Airdrop-Generate/actions/runs`
    → `{"total_count": 0, "runs": []}`.
  - `GET .../actions/workflows` → `{"total_count": 0,
    "workflows": []}` — tidak ada SATU PUN workflow file di repo,
    jadi 0 runs bukan "CI gagal" melainkan "CI tidak ada".
  - `GET .../branches/main/protection` → HTTP 404
    `{"message": "Branch not protected"}`; sama untuk
    `development` → 404. `GET .../rulesets` → `0`.
  - **Kenapa 0 workflow runs:** tidak ada file workflow
    (`.github/workflows/` kosong/tidak ada) dan tidak ada
    proteksi branch yang mewajibkan checks — tidak ada yang
    pernah memicu CI, dan tidak ada yang memaksa CI berjalan.
    Ini governance gap, bukan kegagalan infra sesaat.
  - **Usulan CI reproducible (tanpa mengubah production/
    deployment):** workflow minimal di `development` dulu
    (bukan `main`): `bun install --frozen-lockfile` +
    `bunx tsc --noEmit` (server+client) + `bun
    evidence/v2328/test-principal-migration-v2328.ts` +
    re-run H-MIGR lama — semuanya sudah berjalan di VM ini
    tanpa akses produksi. Proteksi branch (`main` +
    `development`: required review + required status checks)
    adalah keputusan owner/operator — belum diputuskan, dan
    revisi ini TIDAK mengubah proteksi (di luar otorisasi
    revisi desain; mengubahnya tanpa keputusan owner akan
    menjadi perubahan governance yang tidak diminta).
    Sampai CI ada, disiplin manual tetap berlaku: commit +
    push terverifikasi via `git ls-remote`, matriks + sidecar
    SHA-256.
  - **Clean build/test dari environment non-Hatch:** TIDAK
    dapat direproduksi — blocker D-06/F-047 tidak berubah:
    `npm view @hatch/space-sdk version` dikonfirmasi ulang
    2026-11-08 ~22:48 WIB: **404 Not Found** —
    `@hatch/space-sdk@* is not in this registry` (exit 1).
    Tidak ada jalur redistributable SDK yang sah; stub SDK
    0.14.0-stub.1 tidak disentuh; clean-clone TIDAK diulang
    (tidak ada perubahan material — protokol butir 6).
- **U-113:** SDK asli `server-contract.d.ts` 0.14.0 sudah dibaca
  v2.3.27 (8.860 byte, baris 24–33): hanya deklarasi tipe —
  tidak ada pernyataan provider baru di repo sejak itu
  (`git log main` — tidak ada commit terkait U-113). U-113
  tetap **BLOCKED**.
- **U-114:** tool migrasi diperkeras lagi (H-MIGR 33/33), tetapi
  mapping `userId`↔`ownerUserId` nyata BELUM ADA — deployment ke
  DB berisi baris lama tetap BLOCKED. Tool hanya aman dipakai
  pada salinan disposable dengan mapping eksplisit operator.
- **T-01:** `git log main` — tidak ada commit baru terkait T-01
  (terakhir `f1bfea3`, v2.3.25); tidak ada jawaban platform baru
  di repo. Tetap **BLOCKED / NOT VERIFIED**.
- **Staging roles:** keenam peran masih **UNASSIGNED / BLOCKED**
  (dibaca langsung dari `STAGING_READINESS_V2327.md`; tidak ada
  perubahan sejak itu).
- **F-006b:** string narasi insiden di `actions.ts` **masih
  ada** (baris 75–76, 299, 874–876, 887, 992 — dicek ulang
  v2.3.28) — tetap OPEN, di luar scope revisi ini (perubahan
  `actions.ts` akan menjadi stage-(b) code change).

## §3. Response to Previous Handoff (V21) — carry-forward

Audit V22 §4 menilai respons v2.3.26 atas handoff V21 sebagai
berikut (diringkas; detail lengkap di
`SSRF_INDEPENDENT_AUDIT_V21.md` §4 dan V22 §4):

| Permintaan V21 | Hasil independen V22 | Tindak lanjut v2.3.28 |
| --- | --- | --- |
| F-061: tolak mapping chain/cycle | Addressed pada development + VM evidence yang dilaporkan | Tidak berubah; H-MIGR-09/10/11 diulang 3/3 PASS v2.3.28 (§8) |
| F-062: ekspor sentinel dan NULL-owner | Addressed pada development + VM evidence yang dilaporkan | Tidak berubah; H-MIGR-12/13 diulang 2/2 PASS v2.3.28 (§8) |
| F-063: rollback precondition/affected rows/postcondition | Addressed untuk backup valid; residual F-066 | Diperkuat: validasi backup ketat F-066 menutup residual (H-MIGR-24..29 + 33 PASS, §2 butir 2) |
| F-064: tolak symlink DB path | Partially addressed (hard-link residual F-068) | Ditutup: F-068 addressed (H-MIGR-31 PASS, §2 butir 4); F-064 kini addressed penuh di dev+VM |
| U-117: bukti project link | Partially addressed oleh bukti Muse; NOT VERIFIED oleh auditor independen | Share flag + URL terverifikasi ulang v2.3.28 (~22:48–22:51 WIB); artifact-to-source tetap NOT VERIFIED (§2 butir 6) |
| Sinkronisasi development | Addressed pada baseline V21; stale lagi setelah commit dokumentasi main | Merge `2f45148` (main `44a823f`), behind=0 (§2 butir 5) |
| T-01, U-113/U-114, staging | Tetap BLOCKED | Tetap BLOCKED (§2 butir 7); U-116 dikonfirmasi ulang via `gh api` |

## Decision Log v2.3.28

- **DL-28-01 (F-065 vs F-068: preseden guard pada output hard-link
  ke DB):** membuat hard link ke DB menaikkan nlink DB input
  menjadi 2, sehingga guard input F-068 menyala SEBELUM
  pemeriksaan identitas output F-065 pada kasus "output hard link
  menuju DB" (H-MIGR-21). Hasil observabel memenuhi kriteria audit
  (ditolak exit 2, target tidak berubah); cabang device/inode
  F-065 dipertahankan sebagai defense-in-depth untuk kasus link
  dibuat setelah guard (TOCTOU). Ini bukan kegagalan tes — ini
  preseden guard yang didokumentasikan di tes + matriks.
- **DL-28-02 (hash log H-MIGR lama identik lagi):** log re-run
  H-MIGR-01..08 v2.3.28 memiliki SHA-256 yang SAMA dengan log
  v2.3.26/v2.3.27 (`fcb8128c…`), dan log H-MIGR-09..18 SAMA dengan
  v2.3.27 (`e2c26781…`). Ini WAJAR: output harness deterministik
  (baris PASS/FAIL + ringkasan) dan tool tetap lolos semua tes
  lama. Bukti tool baru TETAP dieksekusi di re-run ini —
  H-MIGR-03 (rename + isolasi handler) dan H-MIGR-07 (rollback)
  LULUS atas tool v2328-1 dan akan GAGAL pada tool yang regresi.
  Sidecar baru (3/3) dicocokkan dengan `sha256sum -c`.
- **DL-28-03 (harness lain tidak diulang):** H-AN2, H-SSRF,
  H-RES, H-LEASE, H-CACHE, H-LEG, H-KILL, H-RD, H-IP, H-AUTH,
  H-PRIN, H-DL, H-TO, H-CB, H-B58, H-SO, H-PL, H-MIG (232)
  TIDAK diulang v2.3.28 karena `site/server/src/actions.ts`
  (dan seluruh `site/**`) tidak berubah sama sekali dalam revisi
  ini — satu-satunya source yang berubah adalah tool offline
  `evidence/v2326/principal-key-migration.ts` + harness baru.
  Bukti v2.3.26 atas harness-harness itu tetap valid; total
  409/409 = 394 (v2.3.27, dipertahankan) + 15 (H-MIGR baru).
  Pengulangan tanpa perubahan implementasi/harness/risiko tidak
  menambah bukti (protokol butir 6).
- **DL-28-04 (backup legacy v2327-1 diterima dengan peringatan):**
  backup tanpa field integritas (format v2327-1) diterima hanya
  setelah semua cek struktural lain lolos, dengan peringatan
  UNVERIFIED ke stderr (H-MIGR-33 mengunci perilaku ini).
  Alasan: menolaknya mengandaskan operator pemegang backup sah
  v2327-1; menerimanya diam-diam menyembunyikan hilangnya
  jaminan integritas. Jalan tengah ini dicatat di matriks, di
  kode, dan diuji — bukan penutupan diam-diam.
- **DL-28-05 (cabang fail-closed mode 0600 tidak terpicu di VM):**
  verifikasi mode pasca-tulis + hapus + exit 1 ADA di kode
  (`writePrivateJsonAtomic`) tetapi tidak ada pemicu langsung di
  VM ini (non-root, filesystem POSIX: `chmod` 0600 pada file
  sendiri praktis selalu berhasil). Dicatat sebagai pertahanan
  konstruksi yang di-review, BUKAN sebagai perilaku teruji.
  Tidak ada tes yang mengklaim mengujinya; H-MIGR-30 menguji
  hasil positifnya (mode 0600 teramati).
- **DL-28-06 (`.tsbuildinfo` tidak ter-commit):** merge
  `2f45148` + commit `a4bc568` memakai staging eksplisit per
  file (tanpa `git add -A`); kedua file `.tsbuildinfo` tetap
  untracked. Pelajaran DL-26-05/DL-27-05 diterapkan lagi.
- **DL-28-07 (asersi versi H-MIGR-18 diperbarui — harness change):**
  satu baris di `evidence/v2327/test-principal-migration-v2327.ts`
  diubah: asersi `backup.version` dari `"v2327-1"` menjadi
  `"v2328-1"` — perubahan yang DIPAKSA oleh bump versi tool,
  bukan pelonggaran tes. Semua asersi lain di file itu tidak
  berubah; H-MIGR-09..18 tetap 10/10 PASS atas tool v2328-1.

## §4. Respons atas 7 butir handoff V22 §8

| Butir | Respons | Bukti |
| --- | --- | --- |
| 1. F-065 amankan output path | Addressed — `guardOutputPath()` + `writePrivateJsonAtomic()` (exclusive `link(2)`, 0600, atomik + read-back, verifikasi backup sebelum transaksi); H-MIGR-19..23 PASS | §2 butir 1; `evidence/v2326/principal-key-migration.ts` (commit `a4bc568`, `TOOL_VERSION` v2328-1); `evidence/v2328/test-principal-migration-v2328.ts` |
| 2. F-066 validasi backup schema/integrity | Addressed — `validateBackupStructure()` sebelum DB dibuka (tanpa default `?? []`) + hash SHA-256 + konsistensi countsBefore; H-MIGR-24..29 + 33 PASS | §2 butir 2; tool + harness yang sama |
| 3. F-067 proteksi data ekspor | Addressed — output 0600 + exclusive-create + retensi terdokumentasi; H-MIGR-30 PASS; cabang fail-closed mode dicatat tidak terpicu di VM (DL-28-05) | §2 butir 3; tool + harness yang sama |
| 4. F-068 tutup hard-link guard gap | Addressed — tolak `nlink > 1` + bandingkan device/inode vs path runtime terdaftar; salinan byte diterima; residual TOCTOU dicatat (U-118) | §2 butir 4; tool + harness yang sama |
| 5. Sinkronisasi branch | Addressed — merge `2f45148`, behind=0, tanpa konflik; merge base + SHA dicatat | §2 butir 5 |
| 6. Project link provenance | Partially addressed — `share.shared=true` + URL merespons terverifikasi ulang (~22:48–22:51 WIB); HTTP status + artifact-to-source NOT VERIFIED; keterbatasan tooling dicatat | §2 butir 6; snapshot bertanggal 2026-11-08 ~22:48–22:51 WIB |
| 7. CI dan staging | Blocked — 0 workflow runs/0 workflows/branch tidak protected/0 rulesets dikonfirmasi ulang via `gh api`; npm 404 dikonfirmasi ulang; U-113/U-114/T-01 tetap BLOCKED; 6 staging roles UNASSIGNED; F-006b masih ada | §2 butir 7 |

## §5. Risiko baru v2.3.28 (U-118)

| ID | Risiko | Penjelasan | Status | Aksi berikut |
| --- | --- | --- | --- | --- |
| U-118 | Residual TOCTOU guard DB + ketergantungan workflow salinan | `guardDbPath()` memeriksa nlink/device/inode pada satu titik waktu; hard link yang dibuat proses lain antara guard dan `new Database()` tidak terlihat, dan runtime DB yang path-nya tidak didaftar operator di `PRINCIPAL_MIGRATION_RUNTIME_DBS` tidak dapat dibandingkan device/inode-nya. Tool tidak dapat membuktikan copy dari dalam satu proses — `realpath` secara eksplisit TIDAK diklaim sebagai bukti copy. Mitigasi adalah workflow operator (`cp` ke direktori privat → `stat` nlink==1 → jalankan segera), yang kini terdokumentasi di header tool | OPEN | Bila staging tersedia: jalankan tool hanya di direktori kerja allowlist staging yang tidak dapat mengakses DB runtime; catat prosedur itu sebagai bagian STAGE-P01..P03; pertimbangkan pemeriksaan inode pasca-open (bandingkan inode file yang dibuka dengan inode yang di-guard) sebagai pengerasan berikutnya — dicatat sebagai ide, belum diimplementasikan |
| U-117 | Bukti artifact-to-source project link (sisa) | Share flag + URL terverifikasi ulang v2.3.28; artifact-to-source NOT VERIFIED; HTTP status tidak diklaim | PARTIALLY ADDRESSED | Simpan raw `artifact.status` bertanggal untuk slug `airdrop-generate` di repo (pola `evidence/f021-*`); catat eksplisit sumber konten artifact bila bukan dari `landing/` |
| U-116 | CI / branch governance gap | 0 workflow runs, 0 workflows, `main`/`development` tidak protected, 0 rulesets — dikonfirmasi ulang via `gh api` v2.3.28 | OPEN | Owner/operator memutuskan: proteksi branch (required review + required checks) + workflow CI minimal (install/typecheck/test) setelah staging tersedia; sampai saat itu, disiplin manual (commit + push terverifikasi via ls-remote, matriks + sidecar hash) tetap berlaku |

## §6. Hard gates — No Implementation Confirmation

Revisi v2.3.28 mengubah HANYA (di `main`): `SSRF_RESPONSE_MATRIX_V2328.md`
(BARU, file ini), `STAGING_READINESS_V2328.md` (BARU),
`SSRF_REMEDIATION_DESIGN.md` (header + §D.4.39 baru).
Semua perubahan kode aplikasi + bukti mentah ada HANYA di branch
`development` (commit `2f45148`..`a4bc568`, ls-remote terverifikasi).
Verifikasi `git status` sebelum commit menunjukkan TIDAK ADA perubahan
pada `site/**`, `package.json`, `bun.lock`, migration aktual di
`site/drizzle/`, workflow CI, deployment, database/katalog, atau live
artifact di `main`. `checkLink` TIDAK di-invoke. Link Scanner TIDAK
diaktifkan. Tidak ada tes produksi/destruktif. Tidak ada deployment.
Tidak ada merge development→main. Status tetap **DESIGN REVIEW ONLY —
IMPLEMENTATION NOT APPROVED — NOT READY FOR COMMUNITY BETA.**

## §7. Gate G-M (diperbarui)

Gate **G-M** kini: audit independen V23 atas diff v2.3.28 + keputusan
K-1/K-4/K-10 + jawaban T-01 (M-6) + pernyataan provider SDK (M-1/M-2)
+ kontrak provider F-058 (U-113) + mapping terverifikasi kunci
principal lama (U-114; tool migrasi sudah diperkeras, H-MIGR 33/33)
+ registry-diff test berkala (U-108) + definisi service identity terjadwal bila
diinginkan (U-109) + pre-check migrasi 0008 (U-110) + CI/branch
governance (U-116) + staging tersedia (G-E) + bukti artifact-to-source
project link (U-117, sisa) + penutupan/resolusi residual TOCTOU guard
DB (U-118). Pemicu revisi v2.3.29
adalah audit independen V23, ATAU keputusan owner atas K-1/K-4/K-10/
T-01, ATAU bukti runtime G-B (termasuk versi SQLite produksi, U-90),
ATAU jawaban provider atas U-113, ATAU mapping terverifikasi U-114,
ATAU staging tersedia (G-E). Gate G-A..G-L dipertahankan. U-115
tetap CLOSED (mode single-owner dihapus).

## §8. Test Evidence (ringkas — detail di branch development)

**Lingkungan run:** VM lokal, Bun 1.4.4, bun:sqlite 3.53.4 / sqlite3 CLI
3.45.1, 2026-11-08 ~22:52–22:56 WIB. Semua log di branch
`development`, folder `evidence/v2328/` (commit `a4bc568`).
**Semua bukti di sini adalah VM — BUKAN staging, BUKAN
produksi.**

**Verifikasi sidecar oleh koordinator revisi (2026-11-08 ~22:56 WIB):**
ke-3 file `.txt.sha256` baru dicocokkan dengan `sha256sum -c` —
**3/3 COCOK**; ekor tiap log dibaca — semua menunjukkan PASS sesuai
tabel; `site/**` tidak berubah dalam revisi ini sehingga `tsc` tidak
dijalankan ulang (DL-28-03). Klaim ini adalah verifikasi pelaksana,
BUKAN verifikasi audit independen (V22 §3 menyatakan audit tidak
menjalankan ulang suite dan tidak menghitung ulang hash — hal yang
sama berlaku di sini).

| Harness | Perintah (ringkas) | Hasil | Log (SHA-256 lengkap) |
| --- | --- | --- | --- |
| H-MIGR baru (F-065..F-068) | `bun evidence/v2328/test-principal-migration-v2328.ts` | 15/0 | `test-principal-migration-v2328-v2328.txt` — `ec66e64435b486cd772dd7b35a182449b14730f2b8639d95c3be57aa4fcedbd1` |
| H-MIGR lama v2326 (re-run; tool berubah material) | `bun evidence/v2326/test-principal-migration-v2326.ts` | 8/0 | `test-principal-migration-v2326-v2328.txt` — `fcb8128cc7cae869a2a9f1c38af99ede4ebe624ef88e1540de2a8979281efade` (identik dengan log v2.3.26/v2.3.27 — lihat DL-28-02) |
| H-MIGR lama v2327 (re-run; tool berubah material) | `bun evidence/v2327/test-principal-migration-v2327.ts` | 10/0 | `test-principal-migration-v2327-v2328.txt` — `e2c267810a59ba7fc237aa7bf8df0e48e271bf0a849ed3f3c1a640c57eedde57` (identik dengan log v2.3.27 — lihat DL-28-02) |

**TOTAL BARU: 15/15 + 8/8 + 10/10 = 33/33 H-MIGR PASS. TOTAL REGRESI: 409/409 PASS**
(394 v2.3.27 dipertahankan + 15 baru; rincian 394 ada di matriks
v2.3.27 §8).

**Yang gagal selama putaran ini (diperbaiki, bukan
disembunyikan):** putaran pertama harness baru: 13/15 PASS —
H-MIGR-21 gagal pada asersi pesan (guard F-068 menyala sebelum
F-065; preseden guard didokumentasikan DL-28-01, asersi
disesuaikan ke pesan yang benar) dan H-MIGR-22 gagal pada
precondition mode file (mode `writeFileSync` terpotong umask;
diperbaiki dengan `chmodSync` eksplisit). Putaran kedua: 15/15
PASS. Merge `2f45148` bersih tanpa konflik. Tidak ada file
`.tsbuildinfo` yang ter-commit (DL-28-06).

**Pengulangan yang dijelaskan (protokol butir 6):** H-MIGR-01..18
diulang karena tool berubah material (v2327-1 → v2328-1). Harness
lain TIDAK diulang karena `actions.ts`/`site/**` tidak berubah —
dijelaskan di DL-28-03. D-06 clean-clone TIDAK diulang (tidak ada
perubahan material). U-113/U-116/U-117/F-006b adalah pencarian/cek
read-only baru, bukan pengulangan pengujian.

## §9. Changed Files

| File | Tujuan |
| --- | --- |
| `SSRF_RESPONSE_MATRIX_V2328.md` (BARU, file ini — `main`) | Matriks respons atas V22: §1 status F-001..F-068 + U-118, §2 handoff 7 butir, §3 carry-forward V21, Decision Log DL-28-01..07, §4 tabel handoff, §5 risiko U-118, §6 hard gates, §7 gate G-M, §8 bukti, §10 blocker |
| `STAGING_READINESS_V2328.md` (BARU — `main`) | Readiness diperbarui: baris 20 diperbarui (U-117: snapshot baru ~22:48–22:51 WIB), baris 25/27 diperbarui (H-MIGR 33/33, F-065..F-068), baris 29 diperbarui (H-MIGR-19..33), baris 30 diperbarui (sisa U-117), baris 32–33 baru (residual TOCTOU U-118, CI terkonfirmasi 0 via `gh api`); peran tetap UNASSIGNED |
| `SSRF_REMEDIATION_DESIGN.md` (diubah: header + §D.4.39 baru — `main`) | Desain diperbarui secukupnya tanpa menghapus riwayat; §D.4.38 dipertahankan |
| Branch `development` (BUKAN `main`) — merge `2f45148` | Sync V22 dari main (`44a823f`); tanpa konflik |
| Branch `development` — `a4bc568` | F-065..F-068 tool v2328-1 + harness H-MIGR-19..33 + evidence (3 log + sidecar SHA-256) + update asersi versi H-MIGR-18 (`evidence/v2326/principal-key-migration.ts`, `evidence/v2327/test-principal-migration-v2327.ts`, `evidence/v2328/*`) |

Verifikasi `git ls-remote origin development` = `a4bc5682fb35166069326c94f298ca64c3758e4d`
(cocok HEAD lokal development); `origin/main` sebelum commit revisi
ini = `44a823f220d68f7f49ba5a278dbcda5866dbdca6`; HEAD `main` setelah
commit revisi ini = `29be22cd7ef87bccbcb4498fac0f5e498ee96612`
(terverifikasi via `git ls-remote origin main`).

**Catatan pola §9 (seperti v2.3.25/v2.3.26/v2.3.27):** matriks ini di-commit dulu
(commit pertama), lalu commit kedua mencatat SHA main hasil commit
pertama ke dalam baris di atas — supaya SHA yang tertulis adalah SHA
yang benar-benar ter-push, bukan tebakan.

## §10. Unresolved Blockers

| Blocker | Owner yang dibutuhkan | Percobaan/bukti | Hasil | Langkah berikutnya |
| --- | --- | --- | --- | --- |
| F-047 SDK redistributable / kontrak build (M-1/M-2, U-97) | Provider Hatch via owner | npm 404 dikonfirmasi ulang v2.3.28 (~22:48 WIB); clean-clone install FAIL; build:client ditolak SDK (v2.3.22); stub tidak disentuh v2.3.28 | BLOCKED | Owner minta pernyataan/distribusi SDK + kontrak build client |
| F-047/F-030 build reproducibility | Runtime/build provider | Bun/lockfile mismatch historis + SDK path absolut + penolakan build tangan | CONFIRMED BLOCKER | Clean external builder + provenance SDK + frozen install/typecheck/build |
| T-01 second Hatch space (M-6) | Platform Hatch via owner | `evidence/v2323/t-01-verification.txt` (v2.3.23, branch development); tidak ada commit/jawaban baru v2.3.28 | BLOCKED / NOT VERIFIED | Owner menanyakan T-01 ke platform; catat jawaban tertulis |
| F-019 Link Scanner disabled | Runtime/artifact operator | Tidak ada bukti kontrol (a)–(e); kill-switch default-off hanya terbukti di VM (H-KILL 5/5) | BLOCKED / NOT VERIFIED | Bukti read-only semua invocation paths; jangan invoke action |
| F-028 deployment provenance | Artifact operator/provider | Manifest belum terisi | NOT VERIFIED | Manifest artifact digest/source commit/release/approval/rollback |
| Staging roles + environment | Rama/provider/ops sesuai peran | Readiness v2.3.28 (baris 1–6 UNASSIGNED) | Keenam role UNASSIGNED | Tetapkan owner dan staging sebelum STAGE-P01..P12 |
| F-001..F-005/F-049..F-068 staging | Staging operator + runtime/egress/DB owner | Semua bukti baru adalah VM; STAGE-P01/P02/P03 belum dapat jalan | BLOCKED | Staging tersedia → ulang H-SSRF/H-DL/H-TO/H-PRIN/H-AN2/H-MIGR di runtime staging (bukan Node/Bun VM) |
| F-058 kontrak provider (U-113) | Runtime provider via owner | Pencarian ulang v2.3.28 (§2 butir 7): hanya deklarasi tipe SDK 0.14.0 + komentar doc; tidak ada pernyataan tertulis provider | BLOCKED / NOT VERIFIED | Pernyataan tertulis provider tentang populasi `userId`/`ownerUserId`/`isOwner`/`delegate` ATAU staging trace yang aman |
| U-114 migrasi data kunci principal lama | DB operator + owner | Tool migrasi diperkeras + teruji (H-MIGR 33/33); mapping `userId`↔`ownerUserId` nyata BELUM ADA — `rename` menolak jalan tanpa mapping | OPEN (menyempit) | Dapatkan mapping terverifikasi dari runtime/ekspor owner, lalu jalankan `rename` di SALINAN DB + verifikasi pre/post; atau putuskan arsip eksplisit. JANGAN deploy perubahan principal ke DB berisi baris lama sebelum ini selesai |
| U-116 CI / branch governance | Owner proyek + platform | 0 workflow runs, 0 workflows, branch tidak protected (404), 0 rulesets — dikonfirmasi ulang v2.3.28 via `gh api` langsung | OPEN | Proteksi branch + workflow CI minimal (install/typecheck/test) setelah staging tersedia |
| U-117 project link evidence (sisa) | Artifact operator (raw status) | Share flag + URL terverifikasi ulang v2.3.28; artifact-to-source NOT VERIFIED; HTTP status tidak diklaim | PARTIALLY ADDRESSED | Simpan raw `artifact.status` bertanggal untuk slug `airdrop-generate` di repo (pola `evidence/f021-*`); catat eksplisit sumber konten artifact bila bukan dari `landing/` |
| U-118 residual TOCTOU guard DB | Staging operator + Muse | Guard nlink/device/inode + workflow salinan terdokumentasi; TOCTOU antar guard dan open tidak dapat ditutup dari dalam proses | OPEN | Direktori kerja allowlist staging + pemeriksaan inode pasca-open sebagai pengerasan berikutnya |
| F-006b narasi insiden di string kode | Muse (stage-(b) code change) | String di `actions.ts` masih ada (baris 75–76, 299, 874–876, 887, 992; dicek ulang v2.3.28) | OPEN | Bersihkan string insiden di putaran development berikutnya |
| K-1 (cabang cache), K-4 (provenance verifier), K-10 (legacy) | Owner proyek | Belum diputuskan | OPEN | Keputusan tertulis owner; K-4 kini terkait F-050 (service identity U-109) |
| U-90 versi SQLite produksi | Runtime provider / staging operator | Hanya terukur di VM (3.53.4) + CLI (3.45.1) | NOT VERIFIED | STAGE-P01 mencatat versi SQLite runtime produksi sebelum migrate 0008 |
| U-108 registry-diff berkala | Muse | Korpus IANA lengkap per 2025-10-09; belum ada tes diff otomatis | OPEN | Buat harness registry-diff + jadwal pengecekan berkala |
| U-109 service identity terjadwal | Owner + runtime provider | Tidak ada principal terjadwal di codebase/runtime | OPEN | Owner memutuskan apakah job terjadwal perlu menambah katalog; bila ya, definisikan identitas + staging proof |
| U-110 pre-check migrasi 0008 | DB operator / staging | Prosedur dicatat §2 butir 7 v2.3.24 | OPEN | Jalankan pre-check (0 baris pelanggar) sebelum migrate di DB berisi data |
| Diskusi link-jadi (U-100) | ChatGPT + owner | Dijawab GPT 13:47 WIB 2026-11-08 (rangking C/A/D/B) | ANSWERED — tindak lanjut OPEN (T-01, landing page, implementation-first) | T-01 diverifikasi Muse + ditinjau GPT; landing page terpisah bila owner memutuskan; URL landing yang sudah ada terverifikasi merespons v2.3.28 (§2 butir 6) |
| Klasifikasi Vercel Hobby (U-101) | Owner proyek | Terms resmi dibaca 2026-11-08 | NOT VERIFIED | Owner memutuskan non-komersial vs komersial sebelum deploy Hobby |
| CPU checkLink vs 10 ms Cloudflare (U-102, M-10) | Muse + staging | Belum pernah diukur | NOT VERIFIED | Ukur setelah port/adapter tersedia |
