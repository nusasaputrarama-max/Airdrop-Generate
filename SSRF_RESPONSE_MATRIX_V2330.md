# SSRF Response Matrix v2.3.30 — Jawaban atas Audit Independen V24

**Tanggal:** 2026-11-09 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA
**Menjawab:** `SSRF_INDEPENDENT_AUDIT_V24.md` (commit `7fb26a5`, 9 November 2026) — U-120 (baru), U-118 reassessment, F-069/F-070 scoping + 7 butir handoff §6.
**Perubahan di branch `development`:** commit `29b1e6e` (tool migrasi v2330-1 + bukti; ls-remote terverifikasi) + merge `af8d2b9` (sync main `7fb26a5`).
**Semua bukti di sini adalah VM — BUKAN staging, BUKAN produksi.**

## §1. Status temuan (ringkas)

| ID | Status v2.3.30 | Keterangan |
| --- | --- | --- |
| F-001..F-005 | Tetap (staging BLOCKED) | Implementasi di `development` (v2.3.23–v2.3.26); bukti staging belum ada |
| F-006a/F-006c | Tetap | Di luar scope revisi ini |
| F-006b | Addressed (dev + VM) | v2.3.29; tidak berubah |
| F-007..F-048 | Tetap | Sesuai matriks v2.3.28 §1 |
| F-049..F-060 | Tetap (dev + VM) | Implementasi di `development`; staging BLOCKED |
| F-061..F-064 | Addressed (dev + VM) | v2.3.27; diulang 18/18 v2.3.30 |
| F-065..F-068 | Addressed (dev + VM) | v2.3.28; diulang 15/15 v2.3.30 |
| F-069 | **Addressed (dev + VM)** | v2.3.29; klaim tetap dibatasi ke skenario VM yang diuji (tidak ada klaim power-loss nyata) |
| F-070 | **Addressed (dev + VM)** | v2.3.29; klaim tetap dibatasi ke urutan syscall di VM (bukan tes crash/power-loss nyata) |
| U-113 | BLOCKED | Kontrak provider tetap nihil |
| U-114 | OPEN (menyempit) | Tool diperkeras (H-MIGR 47/47); mapping terverifikasi tetap BELUM ADA |
| U-116 | OPEN | CI/governance: tidak ada perubahan sejak konfirmasi `gh api` v2.3.29 (0 runs, 0 workflows, `main` tidak protected, 0 rulesets); tidak dicek ulang putaran ini — tidak ada perubahan material (protokol butir 6) |
| U-117 | PARTIALLY ADDRESSED | Tidak ada perubahan sejak v2.3.29 (snapshot raw tersimpan; artifact-to-source NOT VERIFIED; `list_actions` 405) |
| U-118 | **OPEN (residual TERBUKTI di set disposable — race didemonstrasikan)** | H-MIGR-46: tool membuka DB pengganti dalam 58/120 run saat writer bersamaan mengganti path; probe Bun API v2.3.29 + probe realpath v2.3.30; U-120 mempersempit jendela, tidak menutupnya |
| U-119 | OPEN | Harness basi H-AN (v2325); tidak berubah |
| U-120 | **BARU (v2.3.30) — Addressed (dev + VM)** | Allowlist kini prasyarat WAJIB untuk semua mode + direktori divalidasi (owner/mode/ancestor); H-MIGR-42..47 PASS |
| U-121 | **BARU (v2.3.30) — OPEN (rendah; fail-closed)** | realpath(3) dapat gagal ENOENT sesaat saat path diganti cepat (probe 87/5000); tool menolak exit 2 — arah aman, bukan risiko data |
| T-01 | BLOCKED / NOT VERIFIED | Tidak ada jawaban baru sejak `f1bfea3` |

## §2. Respons per butir handoff V24 §6

### Butir 1 — U-120: enforce the private-directory precondition (implementasi di `development` saja)

**Keputusan desain (DL-30-02): fail-closed untuk SEMUA mode, termasuk `inventory`.**
Audit V24 §3 mitigasi 1 meminta minimal mode mutating menolak tanpa
allowlist, dengan default yang lebih aman mewajibkan untuk semua mode
karena `inventory` pun membaca data principal sensitif. Revisi ini
mengambil default yang lebih aman itu: `PRINCIPAL_MIGRATION_ALLOWED_DIR`
kini WAJIB untuk kelima mode (`inventory`, `archive`,
`archive-special`, `rename`, `rollback`). Alasan: (a) `inventory`
mencetak kunci principal ke STDOUT — data sensitif yang sama
persis dengan yang dibaca mode lain; membiarkannya jalan tanpa
allowlist akan mempertahankan satu jalur baca tanpa prasyarat
privasi; (b) satu aturan untuk semua mode lebih sederhana dan lebih
kecil kemungkinannya salah dipakai operator daripada daftar mode
yang berbeda-beda; (c) tidak ada alur kerja sah yang membutuhkan
`inventory` tanpa allowlist — operator selalu menjalankan tool di
direktori privat yang ia kendalikan, jadi variabel itu selalu dapat
di-set. Konsekuensi yang disengaja: jalur warn-and-continue v2.3.29
HILANG (H-MIGR-41 ditulis ulang — DL-30-01).

**Perubahan source** (`evidence/v2326/principal-key-migration.ts`,
`TOOL_VERSION` v2330-1, commit `29b1e6e` di `development`):

- `validateAllowedDir()` (baru): tiap entri allowlist di-resolve ke
  real path (`realpathSync`); harus berupa direktori; harus dimiliki
  oleh uid proses operator (`process.getuid()` — bila API tidak
  tersedia, fail closed); TIDAK BOLEH group/world-writable
  (bit mode `0o022`), terlepas dari sticky bit; tiap ancestor
  sampai `/` harus dimiliki operator atau uid 0 (root) dan tidak
  boleh group/world-writable KECUALI sticky bit diset (ancestor
  sticky — mis. `/tmp` mode 1777 — tidak memungkinkan non-owner
  meng-unlink/me-rename entri milik orang lain, sehingga direktori
  allowlist tidak dapat diganti lewat ancestor itu; ancestor
  writable non-sticky DITOLAK karena pemiliknya dapat mengganti
  direktori allowlist).
- **Tidak ada trusted-group escape hatch.** Audit mengizinkan
  penolakan "kecuali ada kebijakan trusted-group yang
  didokumentasikan sempit dan diuji" — kebijakan seperti itu TIDAK
  ADA di proyek ini, jadi penolakan bersifat tanpa syarat.
  Menambahkan kebijakan itu butuh keputusan owner eksplisit +
  pengujian, dan dicatat sebagai aksi berikut (§5, U-120).
- `guardDbPath()`: bila variabel unset/kosong → tolak exit 2
  SEBELUM database dibuka (pesan menyebut `U-120` + variabel);
  semua entri allowlist divalidasi lewat `validateAllowedDir()`;
  pemeriksaan containment memakai REAL PATH tiap entri allowlist
  (sebelumnya `resolve()` saja — kini entri allowlist berupa
  symlink me-resolve ke targetnya, bukan gagal containment secara
  diam-diam).
- `main()`: cabang warning "unset → lanjut" DIHAPUS; guard di atas
  yang fail closed. Komentar mencatat residual U-118 tetap OPEN.
- `SUPPORTED_BACKUP_VERSIONS` kini `["v2327-1", "v2328-1",
  "v2329-1", "v2330-1"]`.

**Bukti (VM, 2026-11-09 ~02:00–02:10 WIB; log §8):**

- H-MIGR-42: tanpa allowlist → `inventory`, `archive-special`,
  dan `rename` semuanya exit 2, stderr menyebut variabel + `U-120`,
  tanpa `WARNING`, tanpa data principal di stdout, tanpa backup
  tertulis, byte DB tidak berubah.
- H-MIGR-43: direktori allowlist mode 0777, 0775, dan 1777
  (sticky — direktori itu sendiri ditolak terlepas dari sticky)
  semuanya exit 2 dengan mode permission-bit disebut di pesan;
  DB tidak berubah.
- H-MIGR-44: direktori privat mode 0700 milik operator → inventory
  exit 0 + rename normal sukses + backup mode 0600.
- H-MIGR-45: ancestor world-writable non-sticky (0777) ditolak;
  ancestor group-writable non-sticky (0775) ditolak; ancestor
  sticky world-writable (1777) diterima; allowlist via symlink ke
  direktori privat diterima; via symlink ke direktori shared
  ditolak; ancestor milik uid lain (65534/nobody) ditolak.
- H-MIGR-47: direktori allowlist milik uid lain (65534) ditolak;
  setelah kepemilikan dikembalikan ke operator, diterima lagi.

**Risiko tersisa:** tidak ada — untuk prasyarat direktori yang
diuji. Validasi direktori mempersempit jendela TOCTOU ke direktori
yang tidak dapat dimodifikasi writer lokal tak tepercaya; ia TIDAK
menutup jendela itu (lihat butir 3).

### Butir 2 — Regression tests (perintah persis, exit code, versi runtime, raw stdout/stderr, sidecar SHA-256)

**Bukti (VM, log §8):** H-MIGR-42..47 baru, 6/6 PASS, di
`evidence/v2330/` (commit `29b1e6e`):

- Harness baru `evidence/v2330/test-principal-migration-v2330.ts`
  + worker race `evidence/v2330/swap-race-worker.ts` + probe
  `evidence/v2330/u120-realpath-race-probe.ts`.
- Setiap log punya sidecar `.sha256`; verifikasi koordinator:
  `sha256sum -c` **6/6 COCOK** (5 log migrasi + 1 log probe).
- Log H-MIGR baru:
  `test-principal-migration-v2330.txt` — SHA-256
  `c349f418cadb3624c71fd21de988c46d16cb3cf0d677a30a118a83d3e01aa95d`.
- Regresi lama diulang karena tool berubah material (v2329-1 →
  v2330-1): H-MIGR-01..08 (8/8), 09..18 (10/10), 19..33 (15/15),
  34..41 (8/8) — total H-MIGR **47/47 PASS**.
- Yang TIDAK diulang: H-NAR, H-KILL, H-CACHE, H-LEG, H-MIG, H-RD,
  H-AUTH, H-CB, H-DL, H-PRIN, H-SO, H-TO, H-PL, H-AN2 (313 tes)
  dan H-SSRF/H-RES/H-LEASE/H-IP/H-B58 (68 tes) — `site/**` tidak
  berubah sama sekali pada revisi ini, jadi tidak ada perubahan
  implementasi/harness/risiko yang membenarkan pengulangan
  (protokol butir 6; pola DL-29-03). Bukti v2.3.29 atas 381 tes itu
  tetap valid.

**Pengulangan yang dijelaskan:** H-MIGR-01..41 diulang karena tool
berubah material. H-MIGR-41 berubah isinya secara sengaja
(DL-30-01) — log re-run v2329 berbeda hash dari v2.3.29
(`cead8703…` vs `b82550f6…`); ketiga log re-run lainnya
byte-identik dengan v2.3.26/v2.3.27/v2.3.28/v2.3.29 (DL-30-06).

### Butir 3 — Reassess U-118: TIDAK ditutup; residual TERBUKTI di set disposable

**Hasil reassessment: U-118 tetap OPEN — dan kini terbukti dapat
terjadi, bukan hanya teoretis.**

- H-MIGR-46 (disposable path-swap race): worker mengganti path
  target antara dua master (A/B) dengan `rename(2)` atomik secepat
  mungkin sementara harness menjalankan `inventory` 120 kali.
  Hasil: **62 run mengamati A, 58 run mengamati B** — tool membuka
  DB pengganti dalam 58/120 run. Setiap run exit 0 dan melaporkan
  tepat satu state konsisten (A atau B), tidak pernah campuran;
  file target berakhir byte-identik dengan master A atau B.
  Ini MEMBUKTIKAN jendela guard→open itu nyata dalam set
  disposable: writer bersamaan yang dapat memodifikasi direktori
  allowlist DAPAT mengubah file mana yang dibuka tool setelah
  guard. Log mencatat ini eksplisit ("RACE DEMONSTRATED … NOT
  closed by this revision").
- Probe realpath (U-121): `realpathSync` gagal 87/5000 sementara
  `statSync` 0/5000 dalam loop yang sama — artefak harness/
  filesystem, bukan bukti tool membuka DB yang salah; H-MIGR-46
  me-retry run yang gagal HANYA dengan ENOENT realpath itu dan
  menghitung retry-nya (21 retry) — lihat DL-30-04.
- **Yang TIDAK diklaim:** U-118 tidak ditandai closed hanya karena
  env var ada dan direktori tervalidasi. Validasi U-120 hanya
  mempersempit jendela ke direktori yang tidak dapat dimodifikasi
  writer tak tepercaya. Bila writer seperti itu ADA, tool tidak
  dapat menjamin DB mana yang dibukanya — keterbatasan OS-level
  yang tersisa didokumentasikan di header tool + matriks ini +
  readiness v2.3.30 baris 32/38.

**Risiko tersisa (U-118 tetap OPEN):** TOCTOU guard→open tetap
ada; mitigasi adalah prasyarat direktori privat U-120 + workflow
operator (salinan segar per-run, verifikasi salinan + nlink == 1,
larang concurrent untrusted writer) + prosedur staging yang
menegakkan direktori kerja allowlist staging yang tidak dapat
dimodifikasi writer bersamaan (STAGE-P01..P03 diperbarui —
readiness v2.3.30 baris 32/38). Penutupan penuh butuh runtime
yang dapat mengikat guard ke inode yang dibuka (di luar API Bun)
ATAU jaminan OS-level dari operator staging — keduanya belum ada.

### Butir 4 — Update response matrix + backlog (U-120, owner, status, evidence, next action)

- Matriks ini (file ini) + `STAGING_READINESS_V2330.md` +
  `SSRF_REMEDIATION_DESIGN.md` §D.4.41 baru (commit revisi ini,
  `main`).
- U-120: owner = Muse (implementasi + bukti, `development`
  `29b1e6e`); status = addressed (dev + VM); evidence = H-MIGR-
  42..47 + log §8; aksi berikut = ulangan di staging (readiness
  baris 37) + keputusan owner bila kebijakan trusted-group
  diinginkan (§5).
- U-118: owner = staging operator + Muse; status = OPEN (race
  didemonstrasikan); aksi berikut = prosedur staging baris 32/38
  + runtime yang mendukung pemeriksaan inode pasca-open.

### Butir 5 — F-069/F-070 claims tetap scoped ke skenario VM yang diuji

- F-069: klaim tetap "error validasi backup tidak mencetak isi
  baris — untuk jalur yang diuji di VM". Tidak ada klaim baru.
- F-070: klaim tetap "urutan syscall fsync direktori parent
  sebelum transaksi — di Linux VM". Label eksplisit di matriks
  v2.3.29 §2 butir 2 dipertahankan: ini bukti URUTAN SYSCALL,
  BUKAN tes crash/power-loss nyata. Tidak ada tes power-loss yang
  dijalankan atau diklaim pada revisi ini.
- Semua bukti baru revisi ini berlabel VM secara eksplisit (§8).

### Butir 6 — Batasan: tidak ada perubahan di luar scope

- Revisi ini mengubah HANYA (di `main`): matriks ini,
  `STAGING_READINESS_V2330.md`, `SSRF_REMEDIATION_DESIGN.md`
  (header + §D.4.41). Semua perubahan kode + bukti mentah ada
  HANYA di branch `development` (commit `af8d2b9`..`29b1e6e`,
  ls-remote terverifikasi).
- Verifikasi `git status` sebelum commit menunjukkan TIDAK ADA
  perubahan pada `site/**`, `package.json`, `bun.lock`, migration
  aktual di `site/drizzle/`, workflow CI, deployment,
  database/katalog, atau live artifact di `main`. `checkLink`
  TIDAK di-invoke. Link Scanner TIDAK diaktifkan. Tidak ada tes
  produksi/destruktif. Tidak ada deployment. Tidak ada merge
  development→main. Status tetap **DESIGN REVIEW ONLY —
  IMPLEMENTATION NOT APPROVED — NOT READY FOR COMMUNITY BETA.**

### Butir 7 — Implementation-first di `development` + gates tetap tertutup

- Satu-satunya pekerjaan implementation-first yang tidak terblokir
  pada putaran ini adalah U-120 (tool migrasi, VM-only) — sudah
  dikerjakan (butir 1–3 di atas).
- Tidak ada finding aplikasi lain yang tidak terblokir dan belum
  dikerjakan yang ditemukan pada putaran ini; `site/**` tidak
  disentuh. Staging, owner-only trial, community beta, dan release
  gates tetap TERTUTUP (lihat §7).

## §3. Response to Previous Handoff (V23) — carry-forward

Audit V24 §2 menilai respons v2.3.29 atas handoff V23 sebagai
berikut (diringkas; detail lengkap di
`SSRF_INDEPENDENT_AUDIT_V24.md` §2):

| Permintaan V23 | Hasil independen V24 | Tindak lanjut v2.3.30 |
| --- | --- | --- |
| F-069: hapus log disclosure | Addressed untuk jalur yang diuji di development + VM | Tidak berubah; klaim tetap scoped (butir 5) |
| F-070: fsync direktori parent | Addressed untuk urutan syscall yang diuji di development + Linux VM; bukan tes power-loss | Tidak berubah; klaim tetap scoped (butir 5) |
| U-118: guard→open TOCTOU | OPEN — probe Bun mendukung kesimpulan; allowlist adalah mitigasi, bukan bukti direktori privat | Reassessment butir 3: race DIDEMONSTRASIKAN (H-MIGR-46, 58/120 run membuka DB pengganti); U-120 mempersempit, tidak menutup |
| F-006b: narasi insiden | Addressed untuk string yang diperiksa di development + VM | Tidak berubah |
| Sinkronisasi development | Addressed (merge `3b3d126`) | Merge `af8d2b9` (main `7fb26a5`), behind=0 (§2 butir 4 v2.3.29 → diperbarui di sini: sync V24) |
| Project-link provenance + T-01 | Still partial / blocked | Tidak ada perubahan; snapshot v2.3.29 tetap yang terbaru |
| CI dan staging | Still blocked; 2 detail tidak terverifikasi independen di V24 (branch-protection 403, workflows endpoint) | Tidak ada perubahan; tidak dicek ulang tanpa perubahan material (protokol butir 6) |

## Decision Log v2.3.30

- **DL-30-01 (H-MIGR-41 berubah sengaja — bukan regresi):** tool
  v2330-1 menolak tanpa allowlist untuk SEMUA mode (keputusan
  DL-30-02), sehingga asersi lama H-MIGR-41 (exit 0 + warning)
  tidak lagi benar. Harness `evidence/v2329/
  test-principal-migration-v2329.ts` diperbarui: H-MIGR-41 kini
  mengassert exit 2 + pesan U-120 + tanpa data principal +
  DB tidak berubah. Perubahan harness yang DIPAKSA oleh perubahan
  perilaku yang disengaja, bukan pelonggaran tes (pola DL-29-08).
- **DL-30-02 (keputusan fail-closed semua mode):** audit
  mengizinkan minimal mode mutating; revisi ini mengambil default
  yang lebih aman (semua mode termasuk `inventory`) — alasan di
  §2 butir 1. Bila owner menginginkan `inventory` tanpa allowlist
  kembali, itu keputusan eksplisit owner + revisi harness.
- **DL-30-03 (tidak ada trusted-group escape hatch):** audit
  mengizinkan penolakan "kecuali kebijakan trusted-group yang
  didokumentasikan sempit dan diuji" — kebijakan itu tidak ada di
  proyek ini, jadi `validateAllowedDir()` menolak
  group/world-writable tanpa syarat. Menambahkannya butuh
  keputusan owner + pengujian (§5, U-120).
- **DL-30-04 (H-MIGR-46: dua bug harness, diperbaiki, bukan
  disembunyikan):** (a) run pertama H-MIGR-43 gagal — BUG ASERSI
  harness (mengharapkan string mode `01777` padahal tool
  melaporkan permission bits `0777` untuk direktori sticky);
  diperbaiki ke permission bits, 6/6 PASS. (b) run pertama
  H-MIGR-46 gagal — BUG HARNESS: master B hanya mengubah
  `checks`, sehingga output B masih memuat marker `local:owner-1`
  di `saved_projects` dan klasifikasi A/B salah; diperbaiki dengan
  mengubah SEMUA marker di master B, 6/6 PASS. (c) run kedua
  H-MIGR-46 gagal pada run #0 — BUKAN bug tool: `realpathSync`
  gagal ENOENT sesaat saat worker mengganti path secepat mungkin
  (probe: realpath 87/5000 gagal, stat 0/5000 — U-121);
  harness me-retry run yang gagal HANYA dengan ENOENT realpath
  itu (maks 5x, 21 retry tercatat) dan gagal bila ENOENT menetap
  atau gagal lain — lihat probe
  `evidence/v2330/u120-realpath-race-probe.txt`.
- **DL-30-05 (wiring runTool harness lama — plumbing, bukan tes):**
  `runTool()` di harness v2326/v2327/v2328/v2329 kini menyetel
  `PRINCIPAL_MIGRATION_ALLOWED_DIR` ke direktori DB-nya sendiri
  (bila belum di-set di environment) — kalau tidak, SEMUA tes lama
  akan gagal di guard baru padahal yang mereka uji adalah logika
  rename/rollback, bukan prasyarat allowlist. Prasyarat itu
  sendiri diuji H-MIGR-42..47. `runToolEnv()` v2329 mendapat
  default yang sama; entri eksplisit (termasuk `undefined` yang
  menghapus variabel — dipakai H-MIGR-41) tetap menang.
- **DL-30-06 (hash log re-run lama):** log re-run H-MIGR-01..08
  v2.3.30 SHA-256-nya SAMA dengan log v2.3.26/v2.3.27/v2.3.28/
  v2.3.29 (`fcb8128c…`), H-MIGR-09..18 SAMA (`e2c26781…`), dan
  H-MIGR-19..33 SAMA (`ec66e644…`). Ini WAJAR: output harness
  deterministik dan tool tetap lolos semua tes lama. Log re-run
  H-MIGR-34..41 BERBEDA (`cead8703…` vs `b82550f6…` di v2.3.29)
  karena H-MIGR-41 berubah sengaja (DL-30-01) — satu-satunya
  perbedaan isi adalah baris PASS H-MIGR-41 yang baru.
- **DL-30-07 (asersi versi diperbarui — harness change):** asersi
  `backup.version` di `evidence/v2327/
  test-principal-migration-v2327.ts` dan `evidence/v2328/
  test-principal-migration-v2328.ts` diubah dari `"v2329-1"`
  menjadi `"v2330-1"` — perubahan yang DIPAKSA oleh bump versi
  tool, bukan pelonggaran tes. Semua asersi lain di kedua file itu
  tidak berubah.
- **DL-30-08 (`.tsbuildinfo` tidak ter-commit):** commit `29b1e6e`
  memakai staging eksplisit per file (tanpa `git add -A`); kedua
  file `.tsbuildinfo` tetap untracked. Pelajaran
  DL-26-05/DL-27-05/DL-28-06/DL-29-07 diterapkan lagi.
- **DL-30-09 (sinkronisasi V24 sudah dilakukan watch loop):**
  merge `af8d2b9` (main `7fb26a5` → development) sudah ada di
  `origin/development` sebelum revisi ini dimulai (dibuat watch
  run 01:44 WIB); revisi ini hanya mem-fast-forward
  `development` lokal ke merge itu lalu melanjutkan dengan commit
  fix `29b1e6e`. Tidak ada merge baru yang dibuat untuk sinkronisasi.
- **DL-30-10 (MEMORY.md berubah di luar revisi ini):** selama
  revisi berjalan, `MEMORY.md` diperbarui dua kali oleh konteks
  lain (repo kanonik POLITIK RIUH + penegasan AG vs POLITIK RIUH
  sebagai proyek terpisah). Perubahan itu TIDAK terkait revisi ini
  dan TIDAK memengaruhi scope-nya; dicatat di sini supaya tidak
  membingungkan audit berikutnya.

## §4. Respons atas 7 butir handoff V24 §6

| Butir | Respons | Bukti |
| --- | --- | --- |
| 1. U-120 enforce private-directory precondition | Addressed — fail-closed unset untuk semua mode; validasi owner/mode/ancestor; tanpa trusted-group escape hatch; containment pakai real path | §2 butir 1; `evidence/v2326/principal-key-migration.ts` (commit `29b1e6e`, `TOOL_VERSION` v2330-1); `evidence/v2330/test-principal-migration-v2330.ts` |
| 2. Regression tests + sidecar | Addressed — H-MIGR-42..47 6/6 PASS; perintah/exit code/runtime/log mentah + sidecar SHA-256; re-run H-MIGR-01..41 41/41 PASS | §2 butir 2; §8; `evidence/v2330/` (6 sidecar cocok) |
| 3. Reassess U-118 | Diselidiki + TERBUKTI — race didemonstrasikan 58/120 run membuka DB pengganti; U-118 tetap OPEN; residual didokumentasikan, tidak diklaim tertutup | §2 butir 3; H-MIGR-46; `evidence/v2330/u120-realpath-race-probe.txt` |
| 4. Update response matrix + backlog | Addressed — matriks ini + readiness v2.3.30 + desain §D.4.41 | §9; `STAGING_READINESS_V2330.md`; `SSRF_REMEDIATION_DESIGN.md` §D.4.41 |
| 5. F-069/F-070 claims scoped ke VM | Addressed — klaim tetap dibatasi ke skenario VM yang diuji; tidak ada klaim power-loss | §2 butir 5 |
| 6. Batasan (jangan ubah main/produksi/scanner) | Addressed — `main` hanya dokumen revisi; tidak ada perubahan `site/**`, DB/katalog, deployment, scanner; tidak ada deploy | §2 butir 6; §9 |
| 7. Implementation-first di `development`; gates tetap tertutup | Addressed — U-120 adalah satu-satunya batch yang dapat dieksekusi penuh di VM tanpa staging; staging/trial/beta/rilis tetap BLOCKED | §2 butir 7; §7 |

## §5. Risiko baru v2.3.30 (U-120, U-121) + pembaruan risiko

| ID | Risiko | Penjelasan | Status | Aksi berikut |
| --- | --- | --- | --- | --- |
| U-120 | Allowlist tidak menegakkan kondisi private-directory | Audit V24: guard hanya containment; unset hanya warning | **Addressed (dev + VM)** | Ulangan di staging (readiness baris 37); keputusan owner bila kebijakan trusted-group diinginkan — sampai diputuskan, penolakan group/world-writable tetap tanpa syarat |
| U-118 | Residual TOCTOU guard DB | Race DIDEMONSTRASIKAN disposable (H-MIGR-46: 58/120 run membuka DB pengganti); validasi U-120 hanya mempersempit jendela | **OPEN** | Prosedur staging: direktori kerja allowlist staging yang tidak dapat dimodifikasi concurrent writer (readiness baris 32/38); runtime yang mendukung pemeriksaan inode pasca-open, bila tersedia |
| U-121 | realpath(3) gagal ENOENT sesaat saat path diganti cepat | Probe: realpath 87/5000 gagal vs stat 0/5000 (tmpfs); tool menolak exit 2 — arah aman (fail-closed), bukan risiko data | **OPEN (rendah)** | Tidak ada aksi keselamatan yang dibutuhkan (penolakan adalah perilaku benar); harness me-retry hanya di tes race (DL-30-04c). Bila diinginkan, operator dapat mencatat ENOENT guard sebagai sinyal writer bersamaan aktif |
| U-119 | Harness basi H-AN (v2325) gagal import | Tidak berubah sejak v2.3.29 | OPEN | Owner/operator memutuskan: hapus atau arsipkan harness basi |
| U-117 | Bukti artifact-to-source project link (sisa) | Tidak berubah sejak v2.3.29 | PARTIALLY ADDRESSED | Provider/tooling menyediakan jalur provenance artifact; catat eksplisit sumber konten artifact bila bukan dari `landing/` |
| U-116 | CI / branch governance gap | Tidak berubah sejak konfirmasi `gh api` v2.3.29 (0 runs, 0 workflows, `main` tidak protected, 0 rulesets); tidak dicek ulang tanpa perubahan material | OPEN | Proteksi branch + workflow CI minimal setelah staging tersedia |

## §6. Hard gates — No Implementation Confirmation

Revisi v2.3.30 mengubah HANYA (di `main`): `SSRF_RESPONSE_MATRIX_V2330.md`
(BARU, file ini), `STAGING_READINESS_V2330.md` (BARU),
`SSRF_REMEDIATION_DESIGN.md` (header + §D.4.41 baru).
Semua perubahan kode aplikasi + bukti mentah ada HANYA di branch
`development` (commit `af8d2b9`..`29b1e6e`, ls-remote terverifikasi).
Verifikasi `git status` sebelum commit menunjukkan TIDAK ADA perubahan
pada `site/**`, `package.json`, `bun.lock`, migration aktual di
`site/drizzle/`, workflow CI, deployment, database/katalog, atau live
artifact di `main`. `checkLink` TIDAK di-invoke. Link Scanner TIDAK
diaktifkan. Tidak ada tes produksi/destruktif. Tidak ada deployment.
Tidak ada merge development→main. Status tetap **DESIGN REVIEW ONLY —
IMPLEMENTATION NOT APPROVED — NOT READY FOR COMMUNITY BETA.**

## §7. Gate G-M (diperbarui)

Gate **G-M** kini: audit independen V25 atas diff v2.3.30 + keputusan
K-1/K-4/K-10 + jawaban T-01 (M-6) + pernyataan provider SDK (M-1/M-2)
+ kontrak provider F-058 (U-113) + mapping terverifikasi kunci
principal lama (U-114; tool migrasi sudah diperkeras, H-MIGR 47/47)
+ registry-diff test berkala (U-108) + definisi service identity terjadwal bila
diinginkan (U-109) + pre-check migrasi 0008 (U-110) + CI/branch
governance (U-116) + staging tersedia (G-E) + bukti artifact-to-source
project link (U-117, sisa) + penutupan/resolusi residual TOCTOU guard
DB (U-118 — race kini TERBUKTI disposable; penutupan butuh runtime
yang mendukung pemeriksaan inode pasca-open ATAU jaminan OS-level
staging) + keputusan arsip harness basi H-AN (U-119) + ulangan
U-120 di staging (readiness baris 37). Pemicu revisi v2.3.31
adalah audit independen V25, ATAU keputusan owner atas K-1/K-4/K-10/
T-01, ATAU bukti runtime G-B (termasuk versi SQLite produksi, U-90),
ATAU jawaban provider atas U-113, ATAU mapping terverifikasi U-114,
ATAU staging tersedia (G-E). Gate G-A..G-L dipertahankan. U-115
tetap CLOSED (mode single-owner dihapus). F-069/F-070 tetap addressed
di dev+VM dengan klaim scoped. U-120 kini addressed di dev+VM
(keluar dari daftar blocker v2.3.30 sebagai temuan terbuka).

## §8. Test Evidence (ringkas — detail di branch development)

**Lingkungan run:** VM lokal, Bun 1.4.4, bun:sqlite 3.53.4, 2026-11-09
~02:00–02:10 WIB. Semua log di branch `development`, folder
`evidence/v2330/` (commit `29b1e6e`).
**Semua bukti di sini adalah VM — BUKAN staging, BUKAN
produksi.**

**Verifikasi sidecar oleh koordinator revisi (2026-11-09 ~02:10 WIB):**
ke-6 file `.txt.sha256` baru dicocokkan dengan
`sha256sum -c` — **6/6 COCOK** (5 log migrasi + 1 log probe);
ekor tiap log dibaca — semua menunjukkan PASS sesuai tabel.
Klaim ini adalah verifikasi pelaksana, BUKAN verifikasi audit
independen.

| Harness | Perintah (ringkas) | Hasil | Log (SHA-256 lengkap) |
| --- | --- | --- | --- |
| H-MIGR baru (U-120/U-118) | `bun evidence/v2330/test-principal-migration-v2330.ts` | 6/0 | `test-principal-migration-v2330.txt` — `c349f418cadb3624c71fd21de988c46d16cb3cf0d677a30a118a83d3e01aa95d` |
| H-MIGR lama v2326 (re-run; tool berubah material) | `bun evidence/v2326/test-principal-migration-v2326.ts` | 8/0 | `test-principal-migration-v2326-v2330.txt` — `fcb8128cc7cae869a2a9f1c38af99ede4ebe624ef88e1540de2a8979281efade` (identik dengan log v2.3.26/v2.3.27/v2.3.28/v2.3.29 — lihat DL-30-06) |
| H-MIGR lama v2327 (re-run; tool berubah material) | `bun evidence/v2327/test-principal-migration-v2327.ts` | 10/0 | `test-principal-migration-v2327-v2330.txt` — `e2c267810a59ba7fc237aa7bf8df0e48e271bf0a849ed3f3c1a640c57eedde57` (identik — lihat DL-30-06) |
| H-MIGR lama v2328 (re-run; tool berubah material) | `bun evidence/v2328/test-principal-migration-v2328.ts` | 15/0 | `test-principal-migration-v2328-v2330.txt` — `ec66e64435b486cd772dd7b35a182449b14730f2b8639d95c3be57aa4fcedbd1` (identik — lihat DL-30-06) |
| H-MIGR lama v2329 (re-run; tool berubah material) | `bun evidence/v2329/test-principal-migration-v2329.ts` | 8/0 | `test-principal-migration-v2329-v2330.txt` — `cead8703b6c3f8612ef2ad62bf38d0450a706a10accf9e99186bbc85801057ed` (BERBEDA dari `b82550f6…` v2.3.29 — H-MIGR-41 berubah sengaja, DL-30-01/DL-30-06) |
| U-121 probe (realpath vs stat) | `bun evidence/v2330/u120-realpath-race-probe.ts` | 1 probe | `u120-realpath-race-probe.txt` — `896888a4959f270a46ac208422b03110747a4d5597f9e5b5d8e4f65ce7f5eeaa` (realpath 87/5000 gagal, stat 0/5000) |

**TOTAL BARU: 6/6 H-MIGR-42..47. TOTAL DIEKSEKUSI v2.3.30:
47/47 PASS** (H-MIGR 47/47). **TOTAL REGRESI:
428/428 PASS** (422 v2.3.29 dipertahankan — 47 dieksekusi ulang
v2.3.30 + 313 dipertahankan tanpa re-run: H-NAR 5, H-KILL 5,
H-CACHE 12, H-LEG 8, H-MIG 232, H-RD 10, H-AUTH 6, H-CB 4, H-DL 6,
H-PRIN 6, H-SO 5, H-TO 1, H-PL 7, H-AN2 6 — + 68 dipertahankan
tanpa re-run: H-SSRF 32, H-RES 15, H-LEASE 8, H-IP 8, H-B58 5 —
+ 6 baru). H-AN v2325 TIDAK dihitung (basi, DL-29-05).

**Yang gagal selama putaran ini (diperbaiki, bukan
disembunyikan):** H-MIGR-43 gagal run pertama (bug asersi harness
— DL-30-04a); H-MIGR-46 gagal run pertama (bug harness: master B
tidak sepenuhnya berbeda — DL-30-04b) dan run kedua (ENOENT
realpath sesaat — DL-30-04c). Merge `af8d2b9` bersih tanpa konflik
(dibuat watch loop sebelum revisi — DL-30-09). Tidak ada file
`.tsbuildinfo` yang ter-commit (DL-30-08).

**Pengulangan yang dijelaskan (protokol butir 6):** H-MIGR-01..41
diulang karena tool berubah material (v2329-1 → v2330-1).
13 harness `actions.ts` + 68 tes (H-SSRF/H-RES/H-LEASE/H-IP/
H-B58) TIDAK diulang karena `site/**` tidak berubah sama sekali
pada revisi ini. U-113/U-116/U-117/T-01 tidak dicek ulang
(tidak ada perubahan material sejak v2.3.29/V24).

## §9. Changed Files

| File | Tujuan |
| --- | --- |
| `SSRF_RESPONSE_MATRIX_V2330.md` (BARU, file ini — `main`) | Matriks respons atas V24: §1 status F-001..F-070 + U-118/U-120/U-121, §2 handoff 7 butir, §3 carry-forward V23, Decision Log DL-30-01..10, §4 tabel handoff, §5 risiko U-120/U-121, §6 hard gates, §7 gate G-M, §8 bukti, §10 blocker |
| `STAGING_READINESS_V2330.md` (BARU — `main`) | Readiness diperbarui: baris 25/27/29/32/34 diperbarui (H-MIGR 47/47, U-120 addressed di dev+VM, U-118 race didemonstrasikan), baris 37–38 baru (ulangan U-120 di staging, prosedur staging anti-race); peran tetap UNASSIGNED |
| `SSRF_REMEDIATION_DESIGN.md` (diubah: header + §D.4.41 baru — `main`) | Desain diperbarui secukupnya tanpa menghapus riwayat; §D.4.40 dipertahankan |
| Branch `development` (BUKAN `main`) — merge `af8d2b9` | Sync V24 dari main (`7fb26a5`); dibuat watch loop 01:44 WIB, tanpa konflik; di-fast-forward lokal oleh revisi ini (DL-30-09) |
| Branch `development` — `29b1e6e` | U-120 tool v2330-1 + harness H-MIGR-42..47 + probe realpath + update harness lama (runTool allowlist, asersi versi v2330-1, H-MIGR-41 ditulis ulang) + evidence (log + sidecar SHA-256) (`evidence/v2326/principal-key-migration.ts`, `evidence/v2326/test-principal-migration-v2326.ts`, `evidence/v2327/test-principal-migration-v2327.ts`, `evidence/v2328/test-principal-migration-v2328.ts`, `evidence/v2329/test-principal-migration-v2329.ts`, `evidence/v2330/*`) |

Verifikasi `git ls-remote origin development` = `29b1e6ee4d02d37921689f49417a25f083d0bb57`
(cocok HEAD lokal development); `origin/main` sebelum commit revisi
ini = `7fb26a5c40c02f731c3ecacbd1ff984acd6a2aff`; HEAD `main` setelah
commit revisi ini = `077b6ece88fa04f020422a98347ec76aef0d816a`; HEAD `main` setelah
commit revisi ini = `077b6ece88fa04f020422a98347ec76aef0d816a`
(terverifikasi via `git ls-remote origin main`).

**Catatan pola §9 (seperti v2.3.25/v2.3.26/v2.3.27/v2.3.28/v2.3.29):**
matriks ini di-commit dulu (commit pertama), lalu commit kedua
mencatat SHA main hasil commit pertama ke dalam baris di atas —
supaya SHA yang tertulis adalah SHA yang benar-benar ter-push,
bukan tebakan.

## §10. Unresolved Blockers

| Blocker | Owner yang dibutuhkan | Percobaan/bukti | Hasil | Langkah berikutnya |
| --- | --- | --- | --- | --- |
| F-047 SDK redistributable / kontrak build (M-1/M-2, U-97) | Provider Hatch via owner | npm 404 dikonfirmasi ulang v2.3.29 (~01:01 WIB); clean-clone install FAIL; build:client ditolak SDK (v2.3.22); stub tidak disentuh v2.3.29/v2.3.30 | BLOCKED | Owner minta pernyataan/distribusi SDK + kontrak build client |
| F-047/F-030 build reproducibility | Runtime/build provider | Bun/lockfile mismatch historis + SDK path absolut + penolakan build tangan | CONFIRMED BLOCKER | Clean external builder + provenance SDK + frozen install/typecheck/build |
| T-01 second Hatch space (M-6) | Platform Hatch via owner | `evidence/v2323/t-01-verification.txt` (v2.3.23, branch development); tidak ada commit/jawaban baru v2.3.30 | BLOCKED / NOT VERIFIED | Owner menanyakan T-01 ke platform; catat jawaban tertulis |
| F-019 Link Scanner disabled | Runtime/artifact operator | Tidak ada bukti kontrol (a)–(e); kill-switch default-off hanya terbukti di VM (H-KILL 5/5) | BLOCKED / NOT VERIFIED | Bukti read-only semua invocation paths; jangan invoke action |
| F-028 deployment provenance | Artifact operator/provider | Manifest belum terisi | NOT VERIFIED | Manifest artifact digest/source commit/release/approval/rollback |
| Staging roles + environment | Rama/provider/ops sesuai peran | Readiness v2.3.30 (baris 1–6 UNASSIGNED) | Keenam role UNASSIGNED | Tetapkan owner dan staging sebelum STAGE-P01..P12 |
| F-001..F-005/F-049..F-070 staging | Staging operator + runtime/egress/DB owner | Semua bukti baru adalah VM; STAGE-P01/P02/P03 belum dapat jalan | BLOCKED | Staging tersedia → ulang H-SSRF/H-DL/H-TO/H-PRIN/H-AN2/H-MIGR/H-NAR di runtime staging (bukan Node/Bun VM) |
| F-058 kontrak provider (U-113) | Runtime provider via owner | Pencarian ulang v2.3.29 (§2 butir 7): hanya deklarasi tipe SDK 0.14.0 + komentar doc; tidak ada pernyataan tertulis provider | BLOCKED / NOT VERIFIED | Pernyataan tertulis provider tentang populasi `userId`/`ownerUserId`/`isOwner`/`delegate` ATAU staging trace yang aman |
| U-114 migrasi data kunci principal lama | DB operator + owner | Tool migrasi diperkeras + teruji (H-MIGR 47/47); mapping `userId`↔`ownerUserId` nyata BELUM ADA — `rename` menolak jalan tanpa mapping | OPEN (menyempit) | Dapatkan mapping terverifikasi dari runtime/ekspor owner, lalu jalankan `rename` di SALINAN DB + verifikasi pre/post; atau putuskan arsip eksplisit. JANGAN deploy perubahan principal ke DB berisi baris lama sebelum ini selesai |
| U-116 CI / branch governance | Owner proyek + platform | 0 workflow runs, 0 workflows, branch tidak protected (404), 0 rulesets — dikonfirmasi v2.3.29 via `gh api` langsung; tidak dicek ulang v2.3.30 (tidak ada perubahan material) | OPEN | Proteksi branch + workflow CI minimal (install/typecheck/test) setelah staging tersedia |
| U-117 project link evidence (sisa) | Artifact operator (raw status) | Snapshot raw `artifact.status` TERSIMPAN di repo v2.3.29; artifact-to-source NOT VERIFIED; `list_actions` gagal dibaca (405); HTTP status tidak diklaim | PARTIALLY ADDRESSED | Provider/tooling menyediakan jalur provenance artifact (source commit/digest/build log); catat eksplisit sumber konten artifact bila bukan dari `landing/` |
| U-118 residual TOCTOU guard DB | Staging operator + Muse | **Race DIDEMONSTRASIKAN disposable v2.3.30 (H-MIGR-46: 58/120 run membuka DB pengganti)**; probe Bun API: tidak dapat ditutup dari dalam proses; U-120 mempersempit jendela, tidak menutupnya | OPEN | Direktori kerja allowlist staging yang tidak dapat dimodifikasi concurrent writer + pemeriksaan inode pasca-open sebagai pengerasan berikutnya (bila runtime mendukung); workflow salinan terverifikasi sebagai prosedur staging (readiness baris 32/38) |
| U-119 harness basi H-AN (v2325) | Muse + owner | Gagal import: `isLocalSingleOwnerMode` dihapus v2.3.26; digantikan H-AN2 (6/6 PASS v2.3.29) | OPEN | Owner/operator memutuskan: hapus atau arsipkan harness basi |
| U-120 private-directory precondition | Muse + staging operator | **Addressed di dev+VM v2.3.30** (H-MIGR-42..47 6/6 PASS; fail-closed semua mode; validasi owner/mode/ancestor) | ADDRESSED (dev + VM) | Ulangan di staging (readiness baris 37); keputusan owner bila kebijakan trusted-group diinginkan |
| U-121 realpath ENOENT sesaat saat path diganti cepat | Muse | Probe v2.3.30: realpath 87/5000 gagal vs stat 0/5000 (tmpfs); tool menolak exit 2 (fail-closed) | OPEN (rendah) | Tidak ada aksi keselamatan dibutuhkan; catat sebagai sinyal writer bersamaan aktif bila muncul di log operator |
| F-006b narasi insiden di string kode | — | **ADDRESSED di dev+VM v2.3.29** (H-NAR 5/5; H-KILL 5/5 diulang; tsc exit 0) | CLOSED (dev+VM) | Ulang H-NAR di staging bila staging tersedia |
| K-1 (cabang cache), K-4 (provenance verifier), K-10 (legacy) | Owner proyek | Belum diputuskan | OPEN | Keputusan tertulis owner; K-4 kini terkait F-050 (service identity U-109) |
| U-90 versi SQLite produksi | Runtime provider / staging operator | Hanya terukur di VM (3.53.4) + CLI (3.45.1) | NOT VERIFIED | STAGE-P01 mencatat versi SQLite runtime produksi sebelum migrate 0008 |
| U-108 registry-diff berkala | Muse | Korpus IANA lengkap per 2025-10-09; belum ada tes diff otomatis | OPEN | Buat harness registry-diff + jadwal pengecekan berkala |
| U-109 service identity terjadwal | Owner + runtime provider | Tidak ada principal terjadwal di codebase/runtime | OPEN | Owner memutuskan apakah job terjadwal perlu menambah katalog; bila ya, definisikan identitas + staging proof |
| U-110 pre-check migrasi 0008 | DB operator / staging | Prosedur dicatat §2 butir 7 v2.3.24 | OPEN | Jalankan pre-check (0 baris pelanggar) sebelum migrate di DB berisi data |
| Diskusi link-jadi (U-100) | ChatGPT + owner | Dijawab GPT 13:47 WIB 2026-11-08 (rangking C/A/D/B) | ANSWERED — tindak lanjut OPEN (T-01, landing page, implementation-first) | T-01 diverifikasi Muse + ditinjau GPT; landing page terpisah bila owner memutuskan; URL landing yang sudah ada terverifikasi merespons v2.3.29 (§2 butir 6) |
| Klasifikasi Vercel Hobby (U-101) | Owner proyek | Terms resmi dibaca 2026-11-08 | NOT VERIFIED | Owner memutuskan non-komersial vs komersial sebelum deploy Hobby |
| CPU checkLink vs 10 ms Cloudflare (U-102, M-10) | Muse + staging | Belum pernah diukur | NOT VERIFIED | Ukur setelah port/adapter tersedia |

