# SSRF Response Matrix v2.3.29 — Jawaban atas Audit Independen V23

**Tanggal:** 2026-11-09 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA
**Menjawab:** `SSRF_INDEPENDENT_AUDIT_V23.md` (commit `56c6c27`, 9 November 2026) — F-069, F-070, U-118 + 7 butir handoff §8.
**Perubahan di branch `development`:** commit `291e25d` (tool migrasi v2329-1 + F-006b + bukti; ls-remote terverifikasi) + merge `67708f4` (sync main `56c6c27`).
**Semua bukti di sini adalah VM — BUKAN staging, BUKAN produksi.**

## §1. Status temuan (ringkas)

| ID | Status v2.3.29 | Keterangan |
| --- | --- | --- |
| F-001..F-005 | Tetap (staging BLOCKED) | Implementasi di `development` (v2.3.23–v2.3.26); bukti staging belum ada |
| F-006a/F-006c | Tetap | Di luar scope revisi ini |
| F-006b | **Addressed (dev + VM)** | Narasi insiden dihapus dari `actions.ts` (9 situs) + `App.tsx` (3 situs); H-NAR 5/5; H-KILL 5/5 diulang; tsc exit 0 |
| F-007..F-048 | Tetap | Sesuai matriks v2.3.28 §1 |
| F-049..F-060 | Tetap (dev + VM) | Implementasi di `development`; staging BLOCKED |
| F-061..F-064 | Addressed (dev + VM) | v2.3.27; diulang 18/18 v2.3.29 |
| F-065..F-068 | Addressed (dev + VM) | v2.3.28; diulang 15/15 v2.3.29 |
| F-069 | **Addressed (dev + VM)** | Error validasi backup tidak lagi mencetak isi baris; H-MIGR-34..38 PASS |
| F-070 | **Addressed (dev + VM)** | Fsync direktori parent sebelum transaksi DB; H-MIGR-39 PASS + koroborasi strace |
| U-113 | BLOCKED | Kontrak provider tetap nihil |
| U-114 | OPEN (menyempit) | Tool diperkeras (H-MIGR 41/41); mapping terverifikasi tetap BELUM ADA |
| U-116 | OPEN | CI/governance dikonfirmasi ulang via `gh api` v2.3.29: 0 runs, 0 workflows, `main` tidak protected, 0 rulesets |
| U-117 | PARTIALLY ADDRESSED | Snapshot raw `artifact.status` bertanggal kini TERSIMPAN di repo; artifact-to-source tetap NOT VERIFIED; `list_actions` artifact gagal dibaca (HTTP 405) |
| U-118 | **OPEN (diselidiki; tidak dapat ditutup dari Bun API)** | Probe membuktikan Bun SQLite tidak mengekspos identitas file; allowlist direktori kerja ditegakkan + warning; H-MIGR-40/41 PASS; residual TOCTOU tetap OPEN eksplisit |
| T-01 | BLOCKED / NOT VERIFIED | Tidak ada jawaban baru sejak `f1bfea3` |
| U-119 | **BARU (v2.3.29)** | Harness lama H-AN (v2325) basi: mengimpor `isLocalSingleOwnerMode` yang dihapus v2.3.26 (F-059); gagal import, digantikan H-AN2 — bukan regresi |

## §2. Respons per butir handoff V23 §8

### Butir 1 — F-069: addressed (error validasi backup tidak mencetak nilai baris)

**Perubahan source** (`evidence/v2326/principal-key-migration.ts`,
`TOOL_VERSION` v2329-1, commit `291e25d` di `development`):

- `validateBackupRow(table, row, index)` — kini menerima indeks baris;
  setiap kegagalan melaporkan HANYA nama tabel, indeks baris, field
  yang gagal, dan tipe yang diharapkan. Keenam pemakaian
  `JSON.stringify(row)` dihapus.
- `validateBackupStructure()` — nilai tidak lagi di-echo: tool harus
  `"principal-key-migration"` (tanpa mencetak nilai yang diterima),
  versi tidak didukung (hanya daftar versi yang didukung),
  mode harus `"rename-backup"`, `countsBefore` harus integer
  non-negatif, `totalRows` harus cocok (tanpa angka), hash integritas
  mismatch (tanpa hash tersimpan/dihitung-ulang). Kondisi integritas
  digeneralisasi dari `version === "v2328-1"` menjadi
  `version !== "v2327-1"` — backup v2329-1 wajib ber-hash.
- `validateMapping()` — pesan memakai indeks entri (`mapping entry #i`);
  kunci principal tidak pernah dicetak, termasuk penolakan chain/cycle
  yang kini hanya menyebut JUMLAH overlap. Aturan yang sama untuk
  `archive()` (indeks entri key list), pemeriksaan tabrakan `rename()`
  (hanya jumlah project yang bertabrakan), dan seluruh error
  pre/post-validasi `rollback()` (indeks baris + tabel + field).
- `SUPPORTED_BACKUP_VERSIONS` kini `["v2327-1", "v2328-1", "v2329-1"]`.
- `inventory` tetap mencetak kunci principal ke STDOUT — itu laporan
  operator yang dimaksud, bukan jalur error; dicatat eksplisit di
  header tool sebagai di luar scope F-069.

**Bukti (VM, 2026-11-09 ~00:50 WIB; log §8):**

- H-MIGR-34: checks row malformed (sentinel URL/metadata/owner,
  `id` hilang) → rollback exit nonzero; stderr menyebut `checks` +
  field `"id"` + `integer`; TIDAK SATU PUN dari 4 sentinel muncul di
  stdout/stderr; DB tidak berubah.
- H-MIGR-35: saved_projects row malformed (sentinel principal,
  `project_id` hilang) → sama; stderr menyebut `saved_projects` +
  `"project_id"` + `integer`; 2 sentinel tidak muncul.
- H-MIGR-36: projects row malformed (sentinel provenance, `id`
  hilang) → sama; stderr menyebut `projects` + `"id"` + `integer`;
  2 sentinel tidak muncul.
- H-MIGR-37: (a) chained mapping dengan 3 sentinel principal →
  rename exit 2, stderr menyebut `chained/cyclic`, TIDAK SATU PUN
  sentinel muncul; (b) backup dengan `tool` sentinel → rollback
  gagal, sentinel tidak muncul; (c) backup dengan `version`
  sentinel → sama.
- H-MIGR-38: rollback pre-validasi dengan current key sentinel
  (`local:SENTINEL-F069-CURRENT-…`) → gagal; stderr menyebut
  `checks row #0` + field `owner_user_id`; sentinel tidak muncul.
- Semua rollback gagal di atas: DB tidak berubah (snapshot + SHA-256
  byte file diverifikasi).

**Risiko tersisa:** tidak ada — untuk jalur error validasi backup
yang diuji. `inventory` stdout tetap memuat kunci principal sesuai
desain (laporan operator, bukan log error).

### Butir 2 — F-070: addressed (fsync direktori parent sebelum transaksi DB)

**Perubahan source** (file dan commit yang sama):

- `writePrivateJsonAtomic()` kini, setelah `link(2)` + unlink temp,
  membuka direktori parent (`openSync(dir, "r")`) dan mem-`fsync`
  deskriptornya SEBELUM return — sehingga entri direktori yang
  dibuat `link(2)` durable sebelum caller mana pun memulai transaksi
  SQLite. Bila direktori tidak dapat dibuka atau di-fsync, output
  yang sudah ter-publish DIHAPUS dan tool fail closed (exit 1).
- Hook trace `PRINCIPAL_MIGRATION_FS_TRACE=<file>`: tiap langkah
  filesystem menambahkan satu baris (`op target`) — tidak mengubah
  perilaku bila variabel tidak di-set; kegagalan trace tidak pernah
  menggagalkan tool.
- Catatan platform di header: directory fsync terverifikasi di Linux
  VM ini; di platform yang tidak mendukungnya tool fail closed —
  tidak pernah diam-diam mengklaim durabilitas crash.

**Bukti (VM, 2026-11-09 ~00:50–00:58 WIB; log §8):**

- H-MIGR-39: rename dengan trace env → urutan tercatat
  `open-tmp → write → fsync-file → close-file → link → unlink-tmp →
  open-dir → fsync-dir → close-dir → stat → read-back`; `fsync-dir`
  menarget direktori parent backup; rename exit 0; backup mode 0600.
  Label eksplisit di tes + matriks: ini bukti URUTAN SYSCALL,
  BUKAN tes crash/power-loss nyata.
- Koroborasi independen dengan `strace -f` atas satu rename nyata
  (`evidence/v2329/strace-f070-rename.txt`, SHA-256
  `46ba0e63c9a4e54f58697ae702c3beafc6d9cc440a18b5c5e630a3b13342693f`):
  `fsync(6)` file → `link(tmp, backup)` → `unlink(tmp)` →
  `openat("/tmp", O_RDONLY)` → `fsync(6)` direktori → read-back →
  fsync SQLite transaksi. Urutan syscall nyata cocok dengan klaim.
- Cabang fail-closed "fsync direktori gagal" ADA di kode tetapi
  TIDAK dapat dipicu langsung di VM ini (Linux: fsync direktori
  praktis selalu berhasil) — dicatat sebagai pertahanan konstruksi
  yang di-review, BUKAN perilaku teruji (pola DL-28-05).

**Risiko tersisa:** tidak ada — untuk urutan publikasi backup yang
diuji. Tes crash/power-loss nyata tetap TIDAK diklaim.

### Butir 3 — U-118: diselidiki (tidak dapat ditutup dari Bun API); allowlist ditegakkan; residual tetap OPEN

**Penyelidikan** (VM, 2026-11-09 ~00:55 WIB, Bun 1.4.4, bun:sqlite
3.53.4; `evidence/v2329/u118-bun-sqlite-probe.txt`, SHA-256
`81401bb7293627110998b9b3b0bb0d3b110f42afa7466838ec01aea775ed345c`):

- Instance `Database` hanya mengekspos `filename` (string path yang
  diberikan); `PRAGMA database_list` hanya mengembalikan string path.
- Tidak ada properti fd (`$handle`/`fd`/`_fd` tidak ada); `db.handle`
  adalah angka polos (0 pada DB baru) tanpa makna identitas;
  `fileControl()` (opcode 30/31/32) tidak mengembalikan identitas file.
- `statSync(path)` pasca-open hanya membaca ulang PATH, bukan file
  yang dibuka — tidak dapat membuktikan inode yang dibuka sama dengan
  inode yang di-guard.
- **KESIMPULAN: TOCTOU guard→open TIDAK DAPAT ditutup dari dalam
  proses dengan API Bun.** Ini jawaban atas pertanyaan audit
  (butir 3), bukan penutupan diam-diam.

**Perubahan source** (file dan commit yang sama):

- `guardDbPath()` menegakkan allowlist direktori kerja: env
  `PRINCIPAL_MIGRATION_ALLOWED_DIR` (dipisah titik dua); bila di-set,
  resolved DB path harus berada di bawah salah satu direktori itu
  atau tool menolak (exit 2).
- Bila env tidak di-set, `main()` mencetak WARNING U-118 eksplisit
  di setiap run ("run this tool only on a copy in a private directory
  with no concurrent writers") — operator selalu diingatkan residual
  ini aktif.

**Bukti (VM, log §8):**

- H-MIGR-40: inventory dengan allowlist ke direktori lain → exit 2
  (menyebut `PRINCIPAL_MIGRATION_ALLOWED_DIR`); dengan allowlist ke
  direktori DB → exit 0 + laporan inventory benar; tanpa warning
  unset saat allowlist di-set.
- H-MIGR-41: tanpa allowlist → exit 0 + stderr memuat `WARNING` dan
  `U-118`.

**Risiko tersisa (U-118 tetap OPEN):** TOCTOU antara `guardDbPath()`
dan `new Database()` tetap ada; mitigasi adalah allowlist +
direktori privat + tanpa concurrent writer (workflow operator),
bukan klaim dari tool. Prosedur staging (STAGE-P01..P03) harus
menetapkan direktori kerja allowlist staging — lihat readiness
v2.3.29 baris 32/34.

### Butir 4 — Sinkronisasi development dengan main terbaru: addressed

- main HEAD saat re-read: `56c6c27` (audit V23).
- Merge commit `67708f4` — merge origin/main (V23) ke `development`,
  **tanpa konflik** (4 file masuk: audit V23, matriks v2.3.28,
  readiness v2.3.28, §D.4.39 desain), push langsung terverifikasi
  via ls-remote.
- Setelah merge: `git rev-list --count development..origin/main`
  = 0 (tidak ada behind); merge base `56c6c27`.
  Tidak ada merge balik development→main. Semua commit pengembangan
  dipertahankan (HEAD akhir `291e25d`).
- Catatan kebersihan (DL-29-07): file `.tsbuildinfo`
  (`site/client/.tsbuildinfo.client`,
  `site/server/.tsbuildinfo.server`) tetap **untracked dan tidak
  ikut ter-commit** — staging dilakukan eksplisit per file, tanpa
  `git add -A` (pelajaran dari DL-26-05/DL-27-05/DL-28-06).

### Butir 5 — Lanjutan implementation-first pada finding aplikasi yang tidak terblokir: addressed (F-006b)

**Perubahan source aplikasi** (`site/server/src/actions.ts`,
`site/client/src/App.tsx`, commit `291e25d` di `development`):

- **F-006b — narasi insiden dibersihkan dari string kode aplikasi.**
  `actions.ts` 9 situs + `App.tsx` 3 situs: referensi ke insiden
  7 Nov 2026, `$SCAMSEM`, dan "pengurasan wallet Solana" dihapus
  dari komentar dan string user-facing (detail sinyal known-bad,
  redirect, signing; panduan Gibran; panduan 60 detik; contoh link;
  explainer). **Perilaku TIDAK berubah:** `KNOWN_BAD_DOMAINS`
  (`solbarn.cc`, `sharkmoon.tech`), scoring +100 known-bad, dan
  sinyal `known_bad`/`known_bad_redirect` utuh — hanya kata-kata
  yang diubah, bukan vonis. Diff diverifikasi: tidak ada baris
  `score`/`signals.push`/logika yang berubah.
- Keputusan scope (DL-29-04): baris data undian Ptah di `actions.ts`
  ("…dibaca dari API resmi Ptah pada 7 Nov 2026.") adalah data
  katalog/undian, BUKAN narasi insiden, dan sengaja dipertahankan.
  H-NAR-05 mengunci keputusan ini (tes gagal bila baris itu hilang).

**Bukti (VM, 2026-11-09 ~01:00 WIB; log §8):**

- H-NAR-01..05 PASS (5/5): tidak ada frasa narasi insiden di kedua
  file (`kejadian 7 Nov`, `pengurasan wallet`, `SCAMSEM`,
  `2026-11-07 incident`, `persis mekanisme drainer`,
  `Pola persis kejadian`, `yang terdokumentasi di platform ini`);
  proteksi fungsional utuh (denylist, +100, kedua sinyal,
  contoh URL, explainer BAHAYA); baris Ptah dipertahankan.
- Regresi perilaku: H-KILL 5/5 diulang atas `actions.ts` yang sudah
  dibersihkan (kill-switch tetap bekerja — `checkLink` tetap
  nonaktif); H-CACHE 12/12, H-LEG 8/8, H-MIG 232/232, H-RD 10/10,
  H-AUTH 6/6, H-CB 4/4, H-DL 6/6, H-PRIN 6/6, H-SO 5/5, H-TO 1/1,
  H-PL 7/7, H-AN2 6/6 — semuanya PASS atas `actions.ts` baru.
- `tsc --noEmit` server + client: **exit 0** (keduanya, tanpa output).
- Yang TIDAK diulang: H-SSRF 32, H-RES 15, H-LEASE 8, H-IP 8,
  H-B58 5 (68 tes) — kode yang mereka uji (`ssrf-guard.ts`,
  `scan-limits.ts`, registry, Solana CHECK) tidak berubah pada
  revisi ini; bukti v2.3.28 atas mereka tetap valid (protokol
  butir 6).
- **Yang gagal selama putaran ini (dicatat jujur, bukan
  disembunyikan):** (a) H-MIGR-37 gagal pada run pertama — BUG
  HARNESS (snapshot diambil sebelum rename yang sah, bukan bug
  tool); diperbaiki, 8/8 PASS. (b) H-NAR-03 gagal pada run pertama
  — BUG ASERSI harness (string yang diharapkan salah satu kata);
  diperbaiki, 5/5 PASS. (c) Harness lama H-AN (v2325) gagal import
  — `isLocalSingleOwnerMode` sudah DIHAPUS v2.3.26 (F-059) dan
  digantikan H-AN2; ini harness basi, BUKAN regresi (U-119,
  DL-29-05); log kegagalannya ikut ter-commit sebagai bukti
  (`evidence/v2329/test-anon-saved-v2325-v2329.txt`).

**Yang tetap terblokir (dicatat eksplisit, tidak dipalsukan):**
SSRF fetch path / resource controls / tenancy / cache / reproducible
build di luar F-006b tidak disentuh putaran ini — batch aplikasi
berikutnya tetap membutuhkan staging/runtime (F-001..F-005 staging
BLOCKED, F-047 build reproducibility BLOCKED, U-113/U-114 BLOCKED).
Tidak ada finding aplikasi lain yang tidak terblokir dan belum
dikerjakan yang ditemukan pada putaran ini; F-006b adalah satu-satunya
batch aplikasi yang dapat dieksekusi penuh di VM tanpa staging.

### Butir 6 — Project link + T-01: partially addressed (snapshot raw kini tersimpan di repo)

**Yang diverifikasi v2.3.29 (read-only, tanpa perubahan live
artifact atau workflow/deployment config repo):**

- Raw `artifact.status` slug `airdrop-generate` kini **TERSIMPAN DI
  REPO**: `evidence/v2329/artifact-status-airdrop-generate-20261109/`
  (`status.json` SHA-256
  `4ba8624532696fbe79eec7556b3dd7284382e5b34021308aab0e2dc7f06ebbe0`,
  `browser-open.txt` SHA-256
  `03ee844f0093077e72440f056a179cb7ef2fad2cfa523f226ad6fc718434973b`),
  capture 2026-11-09 ~01:00–01:01 WIB: **tidak ada build berjalan;
  `share.shared=true`**, URL
  `https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`
  (sama persis dengan snapshot v2.3.27/v2.3.28 — tidak ada perubahan).
- URL itu diverifikasi merespons dari sesi eksternal
  (`browser.open`, crawl 2026-11-08 18:00 UTC (<1 menit sebelum
  pengecekan), judul "Airdrop Generate" tampil; isi minimal:
  `# Airdrop Generate` + "Content is user generated and unverified").
- Katalog artifact memuat entri `airdrop-generate` (nama "AIRDROP
  GENERATE", `space_id: 226c5f46-cedd-4948-a93b-6d330a888eeb`).
- Tidak ada backend/scanner yang terlihat di teks hasil fetch
  (tidak ada UI scanner, form, atau kontrol wallet).

**Yang belum terpenuhi (jujur — sama seperti v2.3.28, ditambah satu
kegagalan baca baru):**

- **HTTP status TIDAK diklaim** — tool `browser.open` tidak
  menampilkan status HTTP, jadi "status 200" tetap bukan bukti
  yang teramati.
- **Artifact-to-source NOT VERIFIED** — tidak ada catatan
  build/publish, source commit, digest di repo yang menghubungkan
  slug `airdrop-generate` ke `landing/` (branch `project-landing`)
  atau ke konten lain. `artifact.status` TIDAK mengekspos source
  commit/digest/build log. Judul `landing/index.html` ("AIRDROP
  GENERATE — Web3 Security Intelligence") vs judul URL publik
  ("Airdrop Generate") tetap melemahkan dugaan artifact itu adalah
  publish langsung dari `landing/`, tetapi bukan bukti final karena
  fetch hanya mengembalikan teks minimal.
- **Daftar action artifact TIDAK dapat dibaca pada run ini:**
  `artifact.list_actions` untuk slug `airdrop-generate` gagal
  dengan HTTP 405 Method Not Allowed (respons tool apa adanya;
  tidak ada retry, tidak ada workaround). Maka inventaris action
  (ada/tidak ada backend yang terekspos) untuk artifact ini tetap
  NOT VERIFIED lewat jalur ini. Kegagalan baca ini BUKAN bukti ada
  backend/scanner yang terekspos, dan BUKAN bukti tidak ada —
  hanya bukti baca gagal.
- **Kemampuan platform yang hilang (dicatat eksplisit):** tooling
  yang tersedia TIDAK menyediakan cara mem-publish folder
  `landing/` secara terpisah sebagai artifact static dengan
  provenance (source commit/digest/build log) yang tercatat, dan
  TIDAK menyediakan jalur read-only untuk membaca source/build
  provenance sebuah artifact yang sudah ter-publish.
- **T-01 tetap BLOCKED / NOT VERIFIED:** `git log main
  --grep="T-01"` — tidak ada jawaban platform baru sejak `f1bfea3`
  (v2.3.25).
- Maka butir 6 = partially addressed: snapshot raw bertanggal kini
  tersimpan di repo + share flag + URL terverifikasi ulang;
  artifact-to-source + inventaris action tetap terbuka. Artifact
  ini tetap **bukan** application trial — informasional saja.

### Butir 7 — CI dan staging: blocked (tetap, dengan bukti baru yang diverifikasi langsung)

- **U-116 CI/branch governance — dikonfirmasi ulang dengan
  `gh api` langsung (2026-11-09 ~01:01 WIB), bukan mengulang
  klaim audit:**
  - `GET /repos/nusasaputrarama-max/Airdrop-Generate/actions/runs`
    → `{"total_count": 0, "workflow_runs": []}`.
  - `GET .../actions/workflows` → `{"total_count": 0,
    "workflows": []}` — tidak ada SATU PUN workflow file di repo,
    jadi 0 runs bukan "CI gagal" melainkan "CI tidak ada".
  - `GET .../branches/main/protection` → HTTP 404
    `{"message": "Branch not protected"}`. `GET .../rulesets` → `0`.
  - **Kenapa 0 workflow runs:** tidak ada file workflow
    (`.github/workflows/` kosong/tidak ada) dan tidak ada
    proteksi branch yang mewajibkan checks — tidak ada yang
    pernah memicu CI, dan tidak ada yang memaksa CI berjalan.
    Ini governance gap, bukan kegagalan infra sesaat.
  - Usulan CI reproducible (tanpa mengubah production/
    deployment): workflow minimal di `development` dulu
    (bukan `main`): `bun install --frozen-lockfile` +
    `bunx tsc --noEmit` (server+client) + `bun
    evidence/v2329/test-principal-migration-v2329.ts` +
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
    2026-11-09 ~01:01 WIB: **404 Not Found** —
    `@hatch/space-sdk@* is not in this registry` (exit 1).
    Tidak ada jalur redistributable SDK yang sah; stub SDK
    0.14.0-stub.1 tidak disentuh; clean-clone TIDAK diulang
    (tidak ada perubahan material — protokol butir 6).
- **U-113:** SDK asli `server-contract.d.ts` 0.14.0 sudah dibaca
  v2.3.27 (8.860 byte, baris 24–33): hanya deklarasi tipe —
  tidak ada pernyataan provider baru di repo sejak itu
  (`git log main` — tidak ada commit terkait U-113). U-113
  tetap **BLOCKED**.
- **U-114:** tool migrasi diperkeras lagi (H-MIGR 41/41), tetapi
  mapping `userId`↔`ownerUserId` nyata BELUM ADA — deployment ke
  DB berisi baris lama tetap BLOCKED. Tool hanya aman dipakai
  pada salinan disposable dengan mapping eksplisit operator.
- **T-01:** `git log main` — tidak ada commit baru terkait T-01
  (terakhir `f1bfea3`, v2.3.25); tidak ada jawaban platform baru
  di repo. Tetap **BLOCKED / NOT VERIFIED**.
- **Staging roles:** keenam peran masih **UNASSIGNED / BLOCKED**
  (dibaca langsung dari `STAGING_READINESS_V2328.md`; tidak ada
  perubahan sejak itu).
- **F-006b:** string narasi insiden di `actions.ts`/`App.tsx`
  **SUDAH DIBERSIHKAN** v2.3.29 (H-NAR 5/5) — baris readiness
  31 diperbarui dari OPEN menjadi addressed di dev+VM.

## §3. Response to Previous Handoff (V22) — carry-forward

Audit V23 §4 menilai respons v2.3.28 atas handoff V22 sebagai
berikut (diringkas; detail lengkap di
`SSRF_INDEPENDENT_AUDIT_V23.md` §4 dan V23 §4):

| Permintaan V22 | Hasil independen V23 | Tindak lanjut v2.3.29 |
| --- | --- | --- |
| F-065: amankan output path | Addressed pada development + VM evidence yang dilaporkan | Tidak berubah; H-MIGR-19..23 diulang 5/5 PASS v2.3.29 (§8) |
| F-066: validasi backup ketat | Addressed untuk kasus schema yang diuji | Diperkuat: F-069 menutup celah log pada jalur validasi yang sama (H-MIGR-34..38 PASS, §2 butir 1); backup legacy v2327-1 tetap diterima dengan peringatan UNVERIFIED (H-MIGR-33 diulang PASS) |
| F-067: output privat 0600 | Addressed untuk kasus positif | Tidak berubah; H-MIGR-30 diulang PASS; cabang fail-closed mode tetap tidak terpicu di VM (DL-28-05) |
| F-068: hard-link guard | Addressed untuk cek nlink statis | Diperkuat: U-118 diselidiki (probe Bun API) + allowlist ditegakkan (H-MIGR-40/41 PASS, §2 butir 3); residual TOCTOU tetap OPEN eksplisit |
| Sinkronisasi development | Partially addressed, stale lagi | Merge `67708f4` (main `56c6c27`), behind=0 (§2 butir 4) |
| Project-link provenance | Partially addressed oleh bukti Muse; NOT VERIFIED oleh auditor independen | Snapshot raw `artifact.status` kini TERSIMPAN di repo (§2 butir 6); artifact-to-source tetap NOT VERIFIED; `list_actions` gagal dibaca (405) |
| CI dan staging | Still blocked | Tetap BLOCKED; U-116 dikonfirmasi ulang via `gh api` v2.3.29 (§2 butir 7) |

## Decision Log v2.3.29

- **DL-29-01 (H-MIGR-37 gagal run pertama — bug harness, bukan bug
  tool):** snapshot `before` diambil SEBELUM rename yang sah di
  bagian (a), lalu dibandingkan setelah rename berhasil di bagian
  (b) — perbandingan yang salah. Diperbaiki dengan snapshot
  `afterRename` setelah rename; 8/8 PASS. Kegagalan run pertama
  dicatat di sini, bukan disembunyikan.
- **DL-29-02 (hash log H-MIGR lama identik lagi):** log re-run
  H-MIGR-01..08 v2.3.29 memiliki SHA-256 yang SAMA dengan log
  v2.3.26/v2.3.27/v2.3.28 (`fcb8128c…`), H-MIGR-09..18 SAMA dengan
  v2.3.27/v2.3.28 (`e2c26781…`), dan H-MIGR-19..33 SAMA dengan
  v2.3.28 (`ec66e644…`). Ini WAJAR: output harness deterministik
  (baris PASS/FAIL + ringkasan) dan tool tetap lolos semua tes lama
  — stderr child (termasuk warning U-118 baru) hanya muncul di
  pesan kegagalan, bukan di log sukses. Bukti tool baru TETAP
  dieksekusi di re-run ini — H-MIGR-03 (rename + isolasi handler)
  dan H-MIGR-07 (rollback) LULUS atas tool v2329-1 dan akan GAGAL
  pada tool yang regresi. Sidecar baru dicocokkan dengan
  `sha256sum -c`.
- **DL-29-03 (harness yang TIDAK diulang):** H-SSRF 32, H-RES 15,
  H-LEASE 8, H-IP 8, H-B58 5 (68 tes) TIDAK diulang v2.3.29 karena
  file yang mereka uji (`ssrf-guard.ts`, `scan-limits.ts`,
  registry, Solana CHECK) tidak berubah sama sekali dalam revisi
  ini — satu-satunya source aplikasi yang berubah adalah string
  komentar/detail di `actions.ts`/`App.tsx`, dan SEMUA harness yang
  mengimpor/mengeksekusi `actions.ts` DIULANG (H-KILL, H-CACHE,
  H-LEG, H-MIG, H-RD, H-AUTH, H-CB, H-DL, H-PRIN, H-SO, H-TO,
  H-PL, H-AN2 — 13 harness, 313 tes, semua PASS). Bukti v2.3.28
  atas 68 tes itu tetap valid. Pengulangan tanpa perubahan
  implementasi/harness/risiko tidak menambah bukti (protokol
  butir 6).
- **DL-29-04 (scope F-006b: baris Ptah dipertahankan):** baris data
  undian Ptah di `actions.ts` ("…dibaca dari API resmi Ptah pada
  7 Nov 2026.") adalah data katalog/undian, bukan narasi insiden
  drain — dipertahankan sengaja. H-NAR-05 mengunci keputusan ini:
  tes GAGAL bila baris itu dihapus. Sentinel H-NAR-01 menargetkan
  frasa insiden, bukan semua kemunculan tanggal.
- **DL-29-05 (H-AN v2325 basi — bukan regresi):** harness
  `evidence/v2325/test-anon-saved-v2325.ts` mengimpor
  `isLocalSingleOwnerMode`, yang DIHAPUS dari `actions.ts` pada
  v2.3.26 (F-059, commit `2066f4a`) dan digantikan H-AN2
  (`evidence/v2326/test-anon-saved-v2326.ts`). Harness ini gagal
  import di VM ini — dan akan gagal di HEAD mana pun sejak v2.3.26,
  terlepas dari revisi ini (dibuktikan: `git show HEAD:actions.ts`
  tidak memuat simbol itu). File dipertahankan sebagai catatan
  sejarah (tidak dihapus tanpa konfirmasi); log kegagalannya ikut
  ter-commit sebagai bukti. Risiko baru U-119 dicatat untuk
  keputusan penghapusan/arsip harness basi ini.
- **DL-29-06 (cabang fail-closed fsync direktori tidak terpicu di
  VM):** verifikasi fsync parent dir + hapus + exit 1 ADA di kode
  (`writePrivateJsonAtomic`) tetapi tidak ada pemicu langsung di VM
  ini (Linux: `fsync` direktori praktis selalu berhasil). Dicatat
  sebagai pertahanan konstruksi yang di-review, BUKAN sebagai
  perilaku teruji — pola yang sama dengan DL-28-05.
- **DL-29-07 (`.tsbuildinfo` tidak ter-commit):** commit `291e25d`
  memakai staging eksplisit per file (tanpa `git add -A`); kedua
  file `.tsbuildinfo` tetap untracked. Pelajaran
  DL-26-05/DL-27-05/DL-28-06 diterapkan lagi.
- **DL-29-08 (asersi versi H-MIGR-18/H-MIGR-32 diperbarui —
  harness change):** asersi `backup.version` di
  `evidence/v2327/test-principal-migration-v2327.ts` dan
  `evidence/v2328/test-principal-migration-v2328.ts` diubah dari
  `"v2328-1"` menjadi `"v2329-1"` — perubahan yang DIPAKSA oleh bump
  versi tool, bukan pelonggaran tes. Semua asersi lain di kedua file
  itu tidak berubah; H-MIGR-09..33 tetap PASS atas tool v2329-1.

## §4. Respons atas 7 butir handoff V23 §8

| Butir | Respons | Bukti |
| --- | --- | --- |
| 1. F-069 hapus log disclosure | Addressed — error validasi backup hanya tabel/indeks baris/field/tipe; H-MIGR-34..38 PASS | §2 butir 1; `evidence/v2326/principal-key-migration.ts` (commit `291e25d`, `TOOL_VERSION` v2329-1); `evidence/v2329/test-principal-migration-v2329.ts` |
| 2. F-070 fsync direktori parent | Addressed — fsync dir setelah link+unlink, sebelum transaksi; H-MIGR-39 PASS + koroborasi strace | §2 butir 2; tool + harness yang sama; `evidence/v2329/strace-f070-rename.txt` |
| 3. U-118 tanpa pelebaran otoritas | Diselidiki — Bun SQLite tidak mengekspos identitas file (probe); allowlist ditegakkan + warning; residual tetap OPEN; H-MIGR-40/41 PASS | §2 butir 3; `evidence/v2329/u118-bun-sqlite-probe.txt`; tool + harness yang sama |
| 4. Sinkronisasi branch | Addressed — merge `67708f4`, behind=0, tanpa konflik; merge base + SHA dicatat | §2 butir 4 |
| 5. Implementation-first aplikasi | Addressed (F-006b) — narasi insiden dibersihkan dari `actions.ts`/`App.tsx`; H-NAR 5/5; H-KILL 5/5 + 12 harness actions.ts lain diulang PASS; tsc exit 0 | §2 butir 5; `site/server/src/actions.ts`, `site/client/src/App.tsx`; `evidence/v2329/test-f006b-narrative-v2329.ts` |
| 6. Project link + T-01 | Partially addressed — snapshot raw `artifact.status` TERSIMPAN di repo + URL merespons terverifikasi ulang (~01:00 WIB); artifact-to-source + inventaris action NOT VERIFIED; T-01 tetap BLOCKED | §2 butir 6; `evidence/v2329/artifact-status-airdrop-generate-20261109/` |
| 7. CI dan staging | Blocked — 0 workflow runs/0 workflows/branch tidak protected/0 rulesets dikonfirmasi ulang via `gh api`; npm 404 dikonfirmasi ulang; U-113/U-114/T-01 tetap BLOCKED; 6 staging roles UNASSIGNED; F-006b addressed di dev+VM | §2 butir 7 |

## §5. Risiko baru v2.3.29 (U-119) + pembaruan risiko

| ID | Risiko | Penjelasan | Status | Aksi berikut |
| --- | --- | --- | --- | --- |
| U-119 | Harness basi H-AN (v2325) gagal import | `evidence/v2325/test-anon-saved-v2325.ts` mengimpor `isLocalSingleOwnerMode` yang dihapus v2.3.26 (F-059); digantikan H-AN2. Bukan regresi; file dipertahankan sebagai sejarah | OPEN | Owner/operator memutuskan: hapus atau arsipkan harness basi; sampai diputuskan, H-AN tidak dihitung dalam total regresi |
| U-118 | Residual TOCTOU guard DB + ketergantungan workflow salinan | Probe Bun API membuktikan TOCTOU tidak dapat ditutup dari dalam proses; allowlist + warning kini ditegakkan (H-MIGR-40/41) | OPEN | Direktori kerja allowlist staging + workflow salinan terverifikasi (`cp` → `stat` nlink==1 → jalankan segera) sebagai prosedur staging (STAGE-P01..P03) |
| U-117 | Bukti artifact-to-source project link (sisa) | Snapshot raw tersimpan di repo v2.3.29; artifact-to-source NOT VERIFIED; `list_actions` gagal dibaca (405); HTTP status tidak diklaim; kemampuan publish landing terpisah tidak ada | PARTIALLY ADDRESSED | Provider/tooling menyediakan jalur provenance artifact (source commit/digest/build log) ATAU jawaban tertulis platform atas publish landing terpisah |
| U-116 | CI / branch governance gap | 0 workflow runs, 0 workflows, `main` tidak protected, 0 rulesets — dikonfirmasi ulang via `gh api` v2.3.29 | OPEN | Owner/operator memutuskan: proteksi branch (required review + required checks) + workflow CI minimal (install/typecheck/test) setelah staging tersedia; sampai saat itu, disiplin manual (commit + push terverifikasi via ls-remote, matriks + sidecar hash) tetap berlaku |

## §6. Hard gates — No Implementation Confirmation

Revisi v2.3.29 mengubah HANYA (di `main`): `SSRF_RESPONSE_MATRIX_V2329.md`
(BARU, file ini), `STAGING_READINESS_V2329.md` (BARU),
`SSRF_REMEDIATION_DESIGN.md` (header + §D.4.40 baru).
Semua perubahan kode aplikasi + bukti mentah ada HANYA di branch
`development` (commit `67708f4`..`291e25d`, ls-remote terverifikasi).
Verifikasi `git status` sebelum commit menunjukkan TIDAK ADA perubahan
pada `site/**`, `package.json`, `bun.lock`, migration aktual di
`site/drizzle/`, workflow CI, deployment, database/katalog, atau live
artifact di `main`. `checkLink` TIDAK di-invoke. Link Scanner TIDAK
diaktifkan. Tidak ada tes produksi/destruktif. Tidak ada deployment.
Tidak ada merge development→main. Status tetap **DESIGN REVIEW ONLY —
IMPLEMENTATION NOT APPROVED — NOT READY FOR COMMUNITY BETA.**

## §7. Gate G-M (diperbarui)

Gate **G-M** kini: audit independen V24 atas diff v2.3.29 + keputusan
K-1/K-4/K-10 + jawaban T-01 (M-6) + pernyataan provider SDK (M-1/M-2)
+ kontrak provider F-058 (U-113) + mapping terverifikasi kunci
principal lama (U-114; tool migrasi sudah diperkeras, H-MIGR 41/41)
+ registry-diff test berkala (U-108) + definisi service identity terjadwal bila
diinginkan (U-109) + pre-check migrasi 0008 (U-110) + CI/branch
governance (U-116) + staging tersedia (G-E) + bukti artifact-to-source
project link (U-117, sisa) + penutupan/resolusi residual TOCTOU guard
DB (U-118) + keputusan arsip harness basi H-AN (U-119). Pemicu revisi v2.3.30
adalah audit independen V24, ATAU keputusan owner atas K-1/K-4/K-10/
T-01, ATAU bukti runtime G-B (termasuk versi SQLite produksi, U-90),
ATAU jawaban provider atas U-113, ATAU mapping terverifikasi U-114,
ATAU staging tersedia (G-E). Gate G-A..G-L dipertahankan. U-115
tetap CLOSED (mode single-owner dihapus). F-006b kini addressed di
dev+VM (keluar dari daftar blocker v2.3.29).

## §8. Test Evidence (ringkas — detail di branch development)

**Lingkungan run:** VM lokal, Bun 1.4.4, bun:sqlite 3.53.4 / sqlite3 CLI
3.45.1, 2026-11-09 ~00:50–01:01 WIB. Semua log di branch
`development`, folder `evidence/v2329/` (commit `291e25d`).
**Semua bukti di sini adalah VM — BUKAN staging, BUKAN
produksi.**

**Verifikasi sidecar oleh koordinator revisi (2026-11-09 ~01:02 WIB):**
ke-23 file `.txt.sha256`/`.json.sha256` baru dicocokkan dengan
`sha256sum -c` — **23/23 COCOK** (21 di `evidence/v2329/` + 2 di
`evidence/v2329/artifact-status-airdrop-generate-20261109/`);
ekor tiap log dibaca — semua menunjukkan PASS sesuai tabel kecuali
log H-AN v2325 yang memang mendokumentasikan kegagalan import
harness basi (DL-29-05); `tsc --noEmit` server + client exit 0.
Klaim ini adalah verifikasi pelaksana, BUKAN verifikasi audit
independen (V23 §9 menyatakan audit tidak menjalankan ulang suite
dan tidak menghitung ulang hash — hal yang sama berlaku di sini).

| Harness | Perintah (ringkas) | Hasil | Log (SHA-256 lengkap) |
| --- | --- | --- | --- |
| H-MIGR baru (F-069/F-070/U-118) | `bun evidence/v2329/test-principal-migration-v2329.ts` | 8/0 | `test-principal-migration-v2329-v2329.txt` — `b82550f6f0b1099f297bf000466708981e7eaa63274dd30b7eb9f2eb39ca707c` |
| H-MIGR lama v2326 (re-run; tool berubah material) | `bun evidence/v2326/test-principal-migration-v2326.ts` | 8/0 | `test-principal-migration-v2326-v2329.txt` — `fcb8128cc7cae869a2a9f1c38af99ede4ebe624ef88e1540de2a8979281efade` (identik dengan log v2.3.26/v2.3.27/v2.3.28 — lihat DL-29-02) |
| H-MIGR lama v2327 (re-run; tool berubah material) | `bun evidence/v2327/test-principal-migration-v2327.ts` | 10/0 | `test-principal-migration-v2327-v2329.txt` — `e2c267810a59ba7fc237aa7bf8df0e48e271bf0a849ed3f3c1a640c57eedde57` (identik dengan log v2.3.27/v2.3.28 — lihat DL-29-02) |
| H-MIGR lama v2328 (re-run; tool berubah material) | `bun evidence/v2328/test-principal-migration-v2328.ts` | 15/0 | `test-principal-migration-v2328-v2329.txt` — `ec66e64435b486cd772dd7b35a182449b14730f2b8639d95c3be57aa4fcedbd1` (identik dengan log v2.3.28 — lihat DL-29-02) |
| H-NAR baru (F-006b) | `bun evidence/v2329/test-f006b-narrative-v2329.ts` | 5/0 | `test-f006b-narrative-v2329.txt` — `5f141d9ee61bc39546b95624696183146df478cbd599b4c7744901cb7c89b057` |
| H-KILL (re-run; actions.ts berubah) | `bun evidence/v2323/test-checklink-killswitch-v2323.ts` | 5/0 | `test-checklink-killswitch-v2329.txt` — `90cf620bdbe236b4eb9a5c4920914e7f78e1925379af829658ee221bb35b02af` |
| H-CACHE (re-run; actions.ts berubah) | `bun evidence/v2323/test-cache-v2323.ts` | 12/0 | `test-cache-v2323-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-LEG (re-run; actions.ts berubah) | `bun evidence/v2323/test-legacy-export-v2323.ts` | 8/0 | `test-legacy-export-v2323-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-MIG (re-run; actions.ts berubah) | `bun evidence/v2323/test-migration-v2323.ts` | 232/0 | `test-migration-v2323-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-RD (re-run; actions.ts berubah) | `bun evidence/v2323/test-registrable-domain-v2323.ts` | 10/0 | `test-registrable-domain-v2323-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-AUTH (re-run; actions.ts berubah) | `bun evidence/v2324/test-auth-addproject-v2324.ts` | 6/0 | `test-auth-addproject-v2324-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-CB (re-run; actions.ts berubah) | `bun evidence/v2324/test-cache-budget-v2324.ts` | 4/0 | `test-cache-budget-v2324-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-DL (re-run; actions.ts berubah) | `bun evidence/v2324/test-deadline-v2324.ts` | 6/0 | `test-deadline-v2324-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-PRIN (re-run; actions.ts berubah) | `bun evidence/v2324/test-principal-share-v2324.ts` | 6/0 | `test-principal-share-v2324-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-SO (re-run; actions.ts berubah) | `bun evidence/v2324/test-same-origin-redirect-v2324.ts` | 5/0 | `test-same-origin-redirect-v2324-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-TO (re-run; actions.ts berubah) | `bun evidence/v2324/test-timeout-persist-v2324.ts` | 1/0 | `test-timeout-persist-v2324-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-PL (re-run; actions.ts berubah) | `bun evidence/v2325/test-principal-local-v2325.ts` | 7/0 | `test-principal-local-v2325-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-AN2 (re-run; actions.ts berubah) | `bun evidence/v2326/test-anon-saved-v2326.ts` | 6/0 | `test-anon-saved-v2326-v2329.txt` — (lihat sidecar di `evidence/v2329/`) |
| H-AN v2325 (basi — BUKAN regresi) | `bun evidence/v2325/test-anon-saved-v2325.ts` | IMPORT FAIL | `test-anon-saved-v2325-v2329.txt` — `SyntaxError: Export named 'isLocalSingleOwnerMode' not found` (simbol dihapus v2.3.26; digantikan H-AN2; lihat DL-29-05, U-119) |
| strace F-070 (koroborasi) | `strace -f -e trace=fsync,link,unlink,openat bun … rename …` | order cocok | `strace-f070-rename.txt` — `46ba0e63c9a4e54f58697ae702c3beafc6d9cc440a18b5c5e630a3b13342693f` |
| U-118 probe (Bun API) | probe `Database` identity surface | 2 probe | `u118-bun-sqlite-probe.txt` — `81401bb7293627110998b9b3b0bb0d3b110f42afa7466838ec01aea775ed345c` |
| tsc server + client | `bun x tsc --noEmit -p client/tsconfig.json && bun x tsc --noEmit -p server/tsconfig.json` | exit 0 / exit 0 | tanpa output (tidak ada error) |

**TOTAL BARU: 8/8 H-MIGR + 5/5 H-NAR. TOTAL DIEKSEKUSI v2.3.29:
354/354 PASS** (H-MIGR 41 + H-NAR 5 + H-KILL 5 + H-CACHE 12 +
H-LEG 8 + H-MIG 232 + H-RD 10 + H-AUTH 6 + H-CB 4 + H-DL 6 +
H-PRIN 6 + H-SO 5 + H-TO 1 + H-PL 7 + H-AN2 6). **TOTAL REGRESI:
422/422 PASS** (409 v2.3.28 dipertahankan — 354 dieksekusi ulang
v2.3.29 + 68 dipertahankan tanpa re-run: H-SSRF 32, H-RES 15,
H-LEASE 8, H-IP 8, H-B58 5 — + 13 baru). H-AN v2325 TIDAK
dihitung (basi, DL-29-05).

**Yang gagal selama putaran ini (diperbaiki, bukan
disembunyikan):** H-MIGR-37 gagal run pertama (bug harness,
snapshot — DL-29-01); H-NAR-03 gagal run pertama (bug asersi
harness — DL-29-01); H-AN v2325 gagal import (harness basi —
DL-29-05). Merge `67708f4` bersih tanpa konflik. Tidak ada file
`.tsbuildinfo` yang ter-commit (DL-29-07).

**Pengulangan yang dijelaskan (protokol butir 6):** H-MIGR-01..33
diulang karena tool berubah material (v2328-1 → v2329-1).
13 harness `actions.ts` diulang karena `actions.ts` berubah
(string komentar/detail — DL-29-03). 68 tes (H-SSRF/H-RES/
H-LEASE/H-IP/H-B58) TIDAK diulang karena file yang mereka uji
tidak berubah. D-06 clean-clone TIDAK diulang (tidak ada
perubahan material). U-113/U-116/U-117/F-006b adalah pencarian/cek
read-only baru, bukan pengulangan pengujian.

## §9. Changed Files

| File | Tujuan |
| --- | --- |
| `SSRF_RESPONSE_MATRIX_V2329.md` (BARU, file ini — `main`) | Matriks respons atas V23: §1 status F-001..F-070 + U-118/U-119, §2 handoff 7 butir, §3 carry-forward V22, Decision Log DL-29-01..08, §4 tabel handoff, §5 risiko U-119, §6 hard gates, §7 gate G-M, §8 bukti, §10 blocker |
| `STAGING_READINESS_V2329.md` (BARU — `main`) | Readiness diperbarui: baris 20 diperbarui (U-117: snapshot raw tersimpan di repo ~01:00 WIB 2026-11-09 + `list_actions` 405), baris 25/27 diperbarui (H-MIGR 41/41, F-069/F-070, U-118 allowlist), baris 29 diperbarui (H-MIGR-34..41), baris 30 diperbarui (sisa U-117 + kemampuan platform hilang), baris 31 diperbarui (F-006b addressed di dev+VM), baris 32 diperbarui (U-118: probe + allowlist), baris 34–36 baru (F-069/F-070 di staging, H-AN basi U-119, daftar action artifact); peran tetap UNASSIGNED |
| `SSRF_REMEDIATION_DESIGN.md` (diubah: header + §D.4.40 baru — `main`) | Desain diperbarui secukupnya tanpa menghapus riwayat; §D.4.39 dipertahankan |
| Branch `development` (BUKAN `main`) — merge `67708f4` | Sync V23 dari main (`56c6c27`); tanpa konflik |
| Branch `development` — `291e25d` | F-069/F-070/U-118 tool v2329-1 + F-006b app strings + harness H-MIGR-34..41 + H-NAR-01..05 + evidence (log + sidecar SHA-256 + strace + probe U-118 + snapshot artifact) + update asersi versi H-MIGR-18/32 (`evidence/v2326/principal-key-migration.ts`, `evidence/v2327/test-principal-migration-v2327.ts`, `evidence/v2328/test-principal-migration-v2328.ts`, `evidence/v2329/*`, `site/server/src/actions.ts`, `site/client/src/App.tsx`) |

Verifikasi `git ls-remote origin development` = `291e25d5ca20190095525830417e3a2757b7596e`
(cocok HEAD lokal development); `origin/main` sebelum commit revisi
ini = `56c6c274c672b7945b3d39f270af1458fb771a6a`; HEAD `main` setelah
commit revisi ini = `760b6be6bf7793bf6647d5115ebe94852052e3ee`
(terverifikasi via `git ls-remote origin main`).

**Catatan pola §9 (seperti v2.3.25/v2.3.26/v2.3.27/v2.3.28):** matriks ini di-commit dulu
(commit pertama), lalu commit kedua mencatat SHA main hasil commit
pertama ke dalam baris di atas — supaya SHA yang tertulis adalah SHA
yang benar-benar ter-push, bukan tebakan.

## §10. Unresolved Blockers

| Blocker | Owner yang dibutuhkan | Percobaan/bukti | Hasil | Langkah berikutnya |
| --- | --- | --- | --- | --- |
| F-047 SDK redistributable / kontrak build (M-1/M-2, U-97) | Provider Hatch via owner | npm 404 dikonfirmasi ulang v2.3.29 (~01:01 WIB); clean-clone install FAIL; build:client ditolak SDK (v2.3.22); stub tidak disentuh v2.3.29 | BLOCKED | Owner minta pernyataan/distribusi SDK + kontrak build client |
| F-047/F-030 build reproducibility | Runtime/build provider | Bun/lockfile mismatch historis + SDK path absolut + penolakan build tangan | CONFIRMED BLOCKER | Clean external builder + provenance SDK + frozen install/typecheck/build |
| T-01 second Hatch space (M-6) | Platform Hatch via owner | `evidence/v2323/t-01-verification.txt` (v2.3.23, branch development); tidak ada commit/jawaban baru v2.3.29 | BLOCKED / NOT VERIFIED | Owner menanyakan T-01 ke platform; catat jawaban tertulis |
| F-019 Link Scanner disabled | Runtime/artifact operator | Tidak ada bukti kontrol (a)–(e); kill-switch default-off hanya terbukti di VM (H-KILL 5/5) | BLOCKED / NOT VERIFIED | Bukti read-only semua invocation paths; jangan invoke action |
| F-028 deployment provenance | Artifact operator/provider | Manifest belum terisi | NOT VERIFIED | Manifest artifact digest/source commit/release/approval/rollback |
| Staging roles + environment | Rama/provider/ops sesuai peran | Readiness v2.3.29 (baris 1–6 UNASSIGNED) | Keenam role UNASSIGNED | Tetapkan owner dan staging sebelum STAGE-P01..P12 |
| F-001..F-005/F-049..F-070 staging | Staging operator + runtime/egress/DB owner | Semua bukti baru adalah VM; STAGE-P01/P02/P03 belum dapat jalan | BLOCKED | Staging tersedia → ulang H-SSRF/H-DL/H-TO/H-PRIN/H-AN2/H-MIGR/H-NAR di runtime staging (bukan Node/Bun VM) |
| F-058 kontrak provider (U-113) | Runtime provider via owner | Pencarian ulang v2.3.29 (§2 butir 7): hanya deklarasi tipe SDK 0.14.0 + komentar doc; tidak ada pernyataan tertulis provider | BLOCKED / NOT VERIFIED | Pernyataan tertulis provider tentang populasi `userId`/`ownerUserId`/`isOwner`/`delegate` ATAU staging trace yang aman |
| U-114 migrasi data kunci principal lama | DB operator + owner | Tool migrasi diperkeras + teruji (H-MIGR 41/41); mapping `userId`↔`ownerUserId` nyata BELUM ADA — `rename` menolak jalan tanpa mapping | OPEN (menyempit) | Dapatkan mapping terverifikasi dari runtime/ekspor owner, lalu jalankan `rename` di SALINAN DB + verifikasi pre/post; atau putuskan arsip eksplisit. JANGAN deploy perubahan principal ke DB berisi baris lama sebelum ini selesai |
| U-116 CI / branch governance | Owner proyek + platform | 0 workflow runs, 0 workflows, branch tidak protected (404), 0 rulesets — dikonfirmasi ulang v2.3.29 via `gh api` langsung | OPEN | Proteksi branch + workflow CI minimal (install/typecheck/test) setelah staging tersedia |
| U-117 project link evidence (sisa) | Artifact operator (raw status) | Snapshot raw `artifact.status` TERSIMPAN di repo v2.3.29; artifact-to-source NOT VERIFIED; `list_actions` gagal dibaca (405); HTTP status tidak diklaim | PARTIALLY ADDRESSED | Provider/tooling menyediakan jalur provenance artifact (source commit/digest/build log); catat eksplisit sumber konten artifact bila bukan dari `landing/` |
| U-118 residual TOCTOU guard DB | Staging operator + Muse | Probe Bun API: tidak dapat ditutup dari dalam proses; allowlist + warning ditegakkan (H-MIGR-40/41) | OPEN | Direktori kerja allowlist staging + pemeriksaan inode pasca-open sebagai pengerasan berikutnya (bila runtime mendukung); workflow salinan terverifikasi sebagai prosedur staging |
| U-119 harness basi H-AN (v2325) | Muse + owner | Gagal import: `isLocalSingleOwnerMode` dihapus v2.3.26; digantikan H-AN2 (6/6 PASS v2.3.29) | OPEN | Owner/operator memutuskan: hapus atau arsipkan harness basi |
| F-006b narasi insiden di string kode | — | **ADDRESSED di dev+VM v2.3.29** (H-NAR 5/5; H-KILL 5/5 diulang; tsc exit 0) | CLOSED (dev+VM) | Ulang H-NAR di staging bila staging tersedia |
| K-1 (cabang cache), K-4 (provenance verifier), K-10 (legacy) | Owner proyek | Belum diputuskan | OPEN | Keputusan tertulis owner; K-4 kini terkait F-050 (service identity U-109) |
| U-90 versi SQLite produksi | Runtime provider / staging operator | Hanya terukur di VM (3.53.4) + CLI (3.45.1) | NOT VERIFIED | STAGE-P01 mencatat versi SQLite runtime produksi sebelum migrate 0008 |
| U-108 registry-diff berkala | Muse | Korpus IANA lengkap per 2025-10-09; belum ada tes diff otomatis | OPEN | Buat harness registry-diff + jadwal pengecekan berkala |
| U-109 service identity terjadwal | Owner + runtime provider | Tidak ada principal terjadwal di codebase/runtime | OPEN | Owner memutuskan apakah job terjadwal perlu menambah katalog; bila ya, definisikan identitas + staging proof |
| U-110 pre-check migrasi 0008 | DB operator / staging | Prosedur dicatat §2 butir 7 v2.3.24 | OPEN | Jalankan pre-check (0 baris pelanggar) sebelum migrate di DB berisi data |
| Diskusi link-jadi (U-100) | ChatGPT + owner | Dijawab GPT 13:47 WIB 2026-11-08 (rangking C/A/D/B) | ANSWERED — tindak lanjut OPEN (T-01, landing page, implementation-first) | T-01 diverifikasi Muse + ditinjau GPT; landing page terpisah bila owner memutuskan; URL landing yang sudah ada terverifikasi merespons v2.3.29 (§2 butir 6) |
| Klasifikasi Vercel Hobby (U-101) | Owner proyek | Terms resmi dibaca 2026-11-08 | NOT VERIFIED | Owner memutuskan non-komersial vs komersial sebelum deploy Hobby |
| CPU checkLink vs 10 ms Cloudflare (U-102, M-10) | Muse + staging | Belum pernah diukur | NOT VERIFIED | Ukur setelah port/adapter tersedia |
