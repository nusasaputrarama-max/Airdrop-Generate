# Matriks Respons v2.3.27 atas Audit Independen V21

**Revisi:** v2.3.27 — jawaban atas audit independen V21
(`SSRF_INDEPENDENT_AUDIT_V21.md`, commit `2bc34e1`, audit 2026-11-08
atas `main` sampai `0832bed` dan `development` sampai `e11e8d1`) dan
butir handoff V21 §8 (7 butir). Revisi ini JUGA adalah implementasi
development-branch kelima: F-061, F-062, F-063, dan F-064 diperbaiki
di branch `development` atas otorisasi V21 §8 ("Muse boleh
melanjutkan implementasi di branch development terisolasi sesuai
otorisasi owner" — lihat §0 dan Decision Log DL-27-01..DL-27-05).
**Tanggal revisi:** 2026-11-08 (WIB)
**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA**
**Dokumen desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.38 (baru)
**Staging readiness:** `STAGING_READINESS_V2327.md`
**Matriks sebelumnya:** `SSRF_RESPONSE_MATRIX_V2326.md` (main,
384/384 PASS)
**Branch kerja:** `development` — merge `main` @ `2bc34e1` (merge
`9776a18`); HEAD revisi ini `b6f2138` (lihat §9). `main` TIDAK diubah
source aplikasinya oleh revisi ini.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.27

(a) desain remediasi — boleh dilanjutkan dan ditinjau (inilah
v2.3.27, §D.4.38); (b) implementasi pada source code — untuk
**branch pengembangan terisolasi `development`, OTORISASI DIBERIKAN
dan DIEKSEKUSI dalam revisi ini** (V21 §8 + direktif owner `c53fd73`
+ instruksi owner 2026-11-08 ~15:31 WIB ("perbaiki semua"));
implementasi di `development` TIDAK berarti persetujuan
rilis/produksi — tahap (b) untuk produksi dan tahap (c) penerapan ke
situs live tetap butuh persetujuan dan prosedur tersendiri.
**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs
live berubah** — live artifact `cek-link-airdrop` TIDAK disentuh,
`app.db` live TIDAK disentuh, Link Scanner TIDAK diaktifkan kembali,
tidak ada destructive testing produksi. F-061..F-064 kini
**diimplementasikan di `development` + teruji di VM** — tetapi
keempatnya tetap **OPEN/BLOCKED untuk rilis** sampai bukti harness
staging (STAGE-P01..P03) tersedia dan, untuk tool migrasi secara
keseluruhan, sampai mapping `userId`↔`ownerUserId` yang sah diperoleh
(U-114).

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

**Catatan penting tentang "addressed" di revisi ini:** "addressed"
di sini berarti **diimplementasikan di branch `development` dan
teruji di VM** (Bun 1.4.4 / bun:sqlite 3.53.4 + sqlite3 CLI 3.45.1) —
BUKAN "lolos staging" dan BUKAN "siap rilis". Setiap klaim addressed
membawa test ID + log mentah + SHA-256 + commit SHA di §2/§8. Yang
belum terbukti di staging tetap dinyatakan BLOCKED atau NOT VERIFIED
di §10. Tidak ada penutupan hanya karena dokumen diedit.

**TOTAL REGRESI v2.3.27: 394/394 PASS** = 384 (v2.3.26) + 10 tes baru
(H-MIGR-09..18). H-MIGR lama 01..08 diulang (8/8 PASS) karena tool
berubah material; harness lain TIDAK diulang karena `actions.ts`
tidak berubah sama sekali dalam revisi ini (DL-27-03).

## §1. Ringkasan status F-001..F-064

| ID | Temuan | Status v2.3.27 | Ringkasan |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **addressed (dev + VM evidence; staging pending)** | Tidak berubah dari v2.3.26 (H-SSRF 32/32 PASS, bukti v2.3.26 dipertahankan — harness tidak diulang, DL-27-03). Egress staging NOT VERIFIED (STAGE-P01/P03). |
| F-002 | High — cap setelah buffering | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-RES 15/15 + H-CB 4/4 PASS, bukti v2.3.26). |
| F-003 | High — tanpa total deadline | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-DL 6/6 + H-TO 1/1 PASS, bukti v2.3.26). |
| F-004 | Medium — addProject duplicate race | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-MIG 232/232 PASS, bukti v2.3.26). |
| F-005 | Medium — otorisasi addProject tidak jelas | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-AUTH 6/6 PASS, bukti v2.3.26). Runtime population `ctx.viewer` NOT VERIFIED (STAGE-P02). |
| F-006b | Narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah; string di `actions.ts` masih ada (baris 51–52, 99, 390, 469–471, 482 — dicek ulang v2.3.27, §2 butir 7). |
| F-006c | DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah. |
| F-016 | Cache fetch | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-CACHE 12/12 PASS, bukti v2.3.26). |
| F-017 | Cache key tidak memperhitungkan cap | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-CACHE 12/12 PASS, bukti v2.3.26). |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **addressed (dev + VM evidence; scope `ctx.db` NOT VERIFIED)** | Tidak berubah (H-PRIN 6/6 + H-PL 7/7 PASS, bukti v2.3.26). |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checkLink` MASIH TERDAFTAR; tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. `checkLink` TIDAK di-invoke. |
| F-022 | (resource) parser limits | **addressed (dev + VM evidence)** | Tidak berubah (H-RES 15/15 PASS, bukti v2.3.26). |
| F-025 | (resource) concurrency limits | **addressed (dev + VM evidence)** | Tidak berubah (H-LEASE 8/8 PASS, bukti v2.3.26). |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED. |
| F-030 | Bun/lockfile + SDK path | **blocked (CONFIRMED BLOCKER)** | Tidak berubah (D-06/F-047 tetap IN PROGRESS/BLOCKED; npm 404 dikonfirmasi ulang v2.3.27 — §2 butir 7). |
| F-033..F-043 | Risiko/temuan v2.3.20 | **addressed** (dipertahankan) | Tidak berubah; lihat matriks v2.3.21 §1. |
| F-044 | High — migrasi SQLite generated column STORED via ALTER TABLE | **addressed (dev + VM evidence)** | Tidak berubah; H-MIG 232/232 PASS, bukti v2.3.26. |
| F-045 | Medium — CHECK chain bukan constraint SQL nyata | **addressed (dev + VM evidence)** | Tidak berubah; H-CAT dalam 232/232 PASS, bukti v2.3.26. |
| F-046 | Medium — legacy checks owner NULL terbaca semua principal | **addressed (dev + VM evidence)** | Tidak berubah; H-TEN dalam 232/232 PASS, bukti v2.3.26. |
| F-047 | High — portabilitas deployment free-tier tidak established | **partially addressed (bukti lengkap; resolusi BLOCKED)** | Tidak berubah (D-06/F-047 IN PROGRESS/BLOCKED; npm 404 dikonfirmasi ulang v2.3.27 — §2 butir 7; stub SDK 0.14.0-stub.1 tidak disentuh). |
| F-048 | Medium — README bertentangan dengan kondisi repo/deployment | **addressed** | Tidak berubah. |
| F-049 | High — klasifikasi IP special-purpose tidak lengkap + false positive 2001:20::/28 | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-IP 8/8 PASS, bukti v2.3.26). |
| F-050 | High — addProject tanpa otorisasi handler | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-AUTH 6/6 PASS, bukti v2.3.26). |
| F-051 | High — shareId Cloudflare dipakai sebagai principal → cross-viewer | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-PRIN 6/6 PASS, bukti v2.3.26). `ctx.viewer` runtime NOT VERIFIED (STAGE-P02). |
| F-052 | High — deadline 20 dtk tidak mengikat DNS/preflight | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-DL 6/6 PASS, bukti v2.3.26). |
| F-053 | Medium — timeout tersimpan sebagai hasil biasa | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-TO-01 PASS, bukti v2.3.26). |
| F-054 | Medium — cache hit bypass budget byte agregat 1 MB | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-CB 4/4 PASS, bukti v2.3.26). |
| F-055 | Medium — CHECK Solana di DB lebih lemah dari validator app | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-B58 5/5 PASS, bukti v2.3.26). |
| F-056 | Medium — script same-origin lolos lewat redirect | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-SO 5/5 PASS, bukti v2.3.26). |
| F-057 | Medium — fallback tanpa viewer membagikan saved state `<LEGACY>` | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-AN2 6/6 PASS, bukti v2.3.26). |
| F-058 | Medium — local principal memakai `ownerUserId`, bukan `userId` | **partially addressed (dev + VM evidence; kontrak provider BLOCKED)** | Tidak berubah (H-PL 7/7 PASS, bukti v2.3.26). Bukti kontrak provider TIDAK ADA — pencarian ulang v2.3.27 tetap nihil (U-113, §2 butir 7). |
| F-059 | Medium — mode `LOCAL_SINGLE_OWNER_MODE` aktif membuat context tanpa viewer kembali memakai principal `<LEGACY>` | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-AN2 6/6 PASS, bukti v2.3.26). Mode tetap DIHAPUS dari handler. |
| F-060 | Medium — perubahan principal tanpa migrasi kompatibilitas untuk baris lama | **partially addressed (dev + VM evidence; mapping terverifikasi BLOCKED)** | Diperkuat v2.3.27: tool migrasi diperkeras (F-061..F-064, H-MIGR kini 18/18). Mapping `userId`↔`ownerUserId` yang sah TETAP TIDAK ADA — deployment ke DB berisi baris lama tetap BLOCKED (U-114). |
| F-061 | High — mapping berantai dapat mengalihkan data ke principal yang salah | **addressed (dev + VM evidence; staging pending)** | §2 butir 1. `validateMapping()` menolak seluruh mapping bila `currentKey` beririsan dengan `legacyKey` (chain/cycle, exit 2, tanpa write/backup). H-MIGR-09/10/11 PASS. |
| F-062 | Medium — sentinel `<LEGACY>` dan owner NULL tidak dapat diarsipkan | **addressed (dev + VM evidence; staging pending)** | §2 butir 2. Mode baru `archive-special`: ekspor JSON terpisah untuk sentinel + NULL-owner, DB tidak berubah. H-MIGR-12/13 PASS. |
| F-063 | Medium — rollback dapat melaporkan sukses meski pemulihan parsial | **addressed (dev + VM evidence; staging pending)** | §2 butir 3. Rollback kini pre-validasi tiap baris backup pada currentKey yang diharapkan, memeriksa `changes` tiap UPDATE (tepat 1), dan memverifikasi postcondition sebelum COMMIT; mismatch → ROLLBACK + exit nonzero. H-MIGR-14/15/16 PASS. |
| F-064 | Medium — guard path DB dapat dilewati melalui symlink | **addressed (dev + VM evidence; staging pending)** | §2 butir 4. `guardDbPath()` kini menolak symlink (`lstatSync`), resolve `realpathSync` (tolak bila target `app.db` / di bawah `ts-spaces`), dan memisahkan mode read-only vs write. H-MIGR-17 PASS. Guard path tetap BUKAN bukti kriptografis bahwa DB adalah salinan — dicatat eksplisit. |
| U-97..U-102 | Risiko/temuan baru v2.3.22 | **Tercatat; U-98/U-99 CLOSED, sisanya OPEN** | Tidak berubah — lihat §10. |
| U-103..U-107 | Risiko baru v2.3.23 | **Tercatat; U-103 addressed, sisanya OPEN** | Tidak berubah — lihat matriks v2.3.23 §5 + §10 di sini. |
| U-108..U-112 | Risiko/temuan baru v2.3.24 | **Tercatat; U-111 DIKOREKSI (total 363), sisanya OPEN** | Tidak berubah — lihat §10. |
| U-113..U-115 | Risiko/temuan baru v2.3.25 | **Tercatat; U-113 BLOCKED, U-114 OPEN (menyempit), U-115 CLOSED** | U-113: pencarian ulang v2.3.27 nihil (§2 butir 7). U-114: tool diperkeras (H-MIGR 18/18), mapping belum ada. U-115: tetap CLOSED. |
| U-116 | Risiko baru v2.3.26 — CI / branch governance gap | **OPEN** | Tidak berubah: 0 workflow runs; `main`/`development` tidak protected, tanpa required checks (V20 §2, ditegaskan V21 §2). |
| U-117 | Risiko baru v2.3.27 — bukti status project link tidak konsisten | **BARU — partially addressed; lihat §2 butir 5** | `share.shared=true` terverifikasi ulang via `artifact.status` (~21:20 WIB 2026-11-08); URL merespons via `browser.open` (~21:18 WIB, judul "Airdrop Generate"). HTTP status TIDAK diklaim; artifact-to-source tetap NOT VERIFIED. |

## §2. Respons per butir handoff V21 §8

### Butir 1 — F-061: addressed (mapping berantai/cycle ditolak; tidak bergantung urutan)

**Yang dilakukan** (`evidence/v2326/principal-key-migration.ts`,
`TOOL_VERSION` kini `v2327-1`, commit `6ac587b` di branch
`development`):

- `validateMapping()` kini menolak **seluruh mapping (exit 2,
  tanpa write, tanpa backup)** bila himpunan `currentKey`
  beririsan dengan himpunan `legacyKey` — chain A→B + B→C dan
  cycle A↔B sama-sama ditolak, apa pun urutan entrinya.
- Keputusan desain (DL-27-01): dipilih **REJECT**, bukan
  transformasi dua fase via temporary namespace/CTE. Alasan:
  reject lebih sederhana, deterministik, dan fail-closed — tidak
  ada intermediate state yang bisa disangka principal asli, tidak
  ada permukaan tabrakan temp-key, dan tidak ada ketergantungan
  urutan. Operator yang benar-benar butuh pemindahan berantai
  harus memecahnya menjadi mapping terpisah yang non-overlapping
  dengan backup baru per langkah. Opsi dua fase audit tetap
  tercatat sebagai alternatif yang dipertimbangkan dan ditolak
  dengan alasan teknis ini — bukan dihilangkan diam-diam.
- Verifikasi per-key counts sebelum COMMIT dipertahankan dan
  diperkuat: di `rename()`, jumlah akhir tiap `currentKey` per
  tabel harus tepat = baris current yang sudah ada + baris legacy
  yang di-rename.

**Bukti:** harness baru
`evidence/v2327/test-principal-migration-v2327.ts`, H-MIGR-09..11
**3/3 PASS** (log
`evidence/v2327/test-principal-migration-v2327-v2327.txt`,
SHA-256
`e2c267810a59ba7fc237aa7bf8df0e48e271bf0a849ed3f3c1a640c57eedde57`):
chain A→B + B→C ditolak exit 2 tanpa backup dan tanpa perubahan
DB; cycle A↔B ditolak exit 2 tanpa perubahan DB; chain yang sama
dalam urutan terbalik juga ditolak exit 2 (penolakan tidak
bergantung urutan). Collision di masing-masing tabel tetap
dicegah oleh pre-check tabrakan PK komposit `saved_projects`
yang sudah ada (H-MIGR-04, diulang 8/8 PASS — §8).

**Sisa risiko:** penolakan adalah fail-closed, bukan
transformasi — operator dengan kebutuhan chain yang sah harus
melakukan langkah manual tambahan (terdokumentasi di komentar
tool). Tidak ada jalur rename yang bergantung urutan tersisa di
tool.

### Butir 2 — F-062: addressed (mode archive khusus sentinel + NULL-owner)

**Yang dilakukan** (commit `6ac587b`):

- Mode CLI baru `archive-special`:
  `bun … <db> archive-special --out archive-special.json`
  menulis JSON **terpisah** dengan section eksplisit
  `sentinelRows` (`saved_projects` dengan
  `principal_id='<LEGACY>'`) dan `nullOwnerChecks` (`checks`
  dengan `owner_user_id IS NULL`), lengkap dengan `counts`
  (`sentinelSavedProjects`, `nullOwnerChecks`) dan `totalRows`.
- Mode dibuka **read-only** (seperti `inventory`); DB **tidak
  berubah**. Pemilik tidak pernah ditebak; keduanya tidak pernah
  di-rename (larangan lama dipertahankan — `archive` biasa tetap
  menolak `'<LEGACY>'` di daftar kunci, dan `rename` tetap
  menolak mapping berisi sentinel).
- Dokumentasi tool diperbarui: komentar header kini mengarahkan
  sentinel/NULL ke `archive-special`, bukan sekadar
  "archive-only" tanpa jalur.

**Bukti:** H-MIGR-12/13 **2/2 PASS** (log yang sama dengan butir
1): archive-special sentinel — row counts + isi ekspor benar,
DB tidak berubah; archive-special NULL-owner checks — row counts
+ isi ekspor benar, DB tidak berubah.

**Sisa risiko:** tidak ada — kategori yang dulu tidak dapat
diekspor kini punya jalur ekspor yang aman dan teruji. Arsip
hasil `archive-special` tetap harus ditangani operator sebagai
data tanpa pemilik yang diketahui (bukan untuk di-rename).

### Butir 3 — F-063: addressed (rollback terverifikasi, fail-closed)

**Yang dilakukan** (commit `6ac587b`): `rollback()` kini

1. **Pre-validasi sebelum write** — setiap baris backup harus
   masih ada pada `currentKey` yang diharapkan (checks/projects
   by id + principal saat ini; saved_projects by principal saat
   ini + project_id); bila tidak, tolak exit 2 tanpa write.
2. UPDATE mencocokkan **id + principal saat ini** (checks/
   projects sebelumnya hanya mencocokkan id — kini tidak bisa
   menimpa principal yang berubah pasca-rename) dan memeriksa
   `changes` tiap UPDATE (**harus tepat 1 per row**).
3. **Postcondition sebelum COMMIT** — semua baris backup kembali
   ke `legacyKey` dan counts per tabel tidak berubah; bila ada
   mismatch → ROLLBACK + exit nonzero.

**Bukti:** H-MIGR-14/15/16 **3/3 PASS** (log yang sama dengan
butir 1): rollback dengan baris hilang pasca-rename → exit
nonzero, DB tidak berubah; rollback dengan principal berubah
pasca-rename → exit nonzero, DB tidak berubah; rollback dengan
konflik saved_projects → exit nonzero, DB tidak berubah.
H-MIGR-18 (sanity) membuktikan rollback **normal** tetap sukses
— perbaikan tidak merusak jalur yang sudah benar.

**Sisa risiko:** rollback tetap bergantung pada backup JSON
yang ditulis `rename` — bila file backup hilang/rusak, rollback
menolak (fail-closed, bukan menebak). Itu perilaku yang
diinginkan.

### Butir 4 — F-064: addressed (guard symlink + pemisahan mode)

**Yang dilakukan** (commit `6ac587b`): `guardDbPath()` kini

- memakai `lstatSync` — **menolak bila dbPath adalah symlink**;
- memakai `realpathSync` — menolak bila basename realpath =
  `app.db` atau path mengandung `ts-spaces`, sehingga symlink
  lewat direktori runtime ikut tertangkap;
- pesan error jelas untuk setiap penolakan.
- Pemisahan mode: `inventory` dan `archive-special` dibuka
  **read-only**; `archive`/`rename`/`rollback` write-only dan
  hanya pada salinan.

**Bukti:** H-MIGR-17 **PASS** (log yang sama dengan butir 1):
symlink bernama lain menuju `app.db` ditolak exit 2; symlink ke
direktori runtime ditolak; salinan disposable yang sah tetap bisa
dipakai (inventory + rename sukses). Semua uji memakai DB
disposable — tool **tidak pernah** dijalankan pada live DB.

**Sisa risiko (dicatat jujur):** guard path adalah pemeriksaan
path, **bukan bukti kriptografis bahwa DB adalah salinan** — hal
ini didokumentasikan di komentar tool. Workflow copy-and-verify
tetap menjadi tanggung jawab operator. Tidak ada bukti kejadian
symlink terhadap DB live pernah terjadi (V21 §5 F-064).

### Butir 5 — U-117: partially addressed (share flag terverifikasi; artifact-to-source tetap NOT VERIFIED)

**Inkonsistensi yang dilaporkan V21 §6:** matriks v2.3.26 §2 butir
5 menyebut `share.shared=true` + URL publik, sementara
`STAGING_READINESS_V2326.md` baris 20 menyebut
`share.shared=false` ("user belum meminta share").

**Yang diverifikasi v2.3.27 (read-only, tanpa perubahan live
artifact atau workflow/deployment config repo):**

- `artifact.status` slug `airdrop-generate`, 2026-11-08
  ~21:20 WIB: **tidak ada build berjalan;
  `share.shared=true`**, URL
  `https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`
  (sama persis dengan yang diklaim matriks v2.3.26).
- URL itu diverifikasi merespons dari sesi eksternal
  (`browser.open`, 2026-11-08 ~21:18 WIB, crawl <1 menit
  sebelum pengecekan, judul "Airdrop Generate" tampil; isi
  terambil minimal: `# Airdrop Generate` + disclaimer "Content
  is user generated and unverified").
- **Kesimpulan rekonsiliasi:** klaim matriks v2.3.26 BENAR dan
  klaim readiness baris 20 adalah **carry-forward yang
  kedaluwarsa** (berasal dari V2324/V2325, sebelum share
  diverifikasi). Baris 20 diperbaiki di
  `STAGING_READINESS_V2327.md`. Tidak ada publish baru, tidak ada
  perubahan live artifact, tidak ada URL baru yang dikarang.

**Yang belum terpenuhi (jujur):**

- **HTTP status TIDAK diklaim** — tool `browser.open` tidak
  menampilkan status HTTP, jadi "status 200" tetap bukan bukti
  yang teramati (berbeda dengan auditor V21 yang gagal mengambil
  URL dengan `DisabledError` — keterbatasan alat pemeriksa, bukan
  bukti URL mati).
- **Artifact-to-source NOT VERIFIED** — tidak ada catatan
  build/publish, source commit, version, atau digest di repo yang
  menghubungkan slug `airdrop-generate` ke `landing/` (branch
  `project-landing`) atau ke konten lain. `landing/index.html`
  bertajuk "AIRDROP GENERATE — Web3 Security Intelligence"
  dengan h1 "Kenali risiko. / Jelajahi Web3 dengan lebih sadar."
  — berbeda dari judul "Airdrop Generate" yang terambil dari
  URL publik; perbedaan ini **melemahkan** dugaan artifact itu
  adalah publish langsung dari `landing/`, tetapi bukan bukti
  final karena fetch hanya mengembalikan teks minimal.
  `landing/README.md` menyatakan NOT DEPLOYED / NO PUBLIC URL
  VERIFIED. Publish fresh dari `landing/` tetap NOT VERIFIED.
- Maka butir 5 = partially addressed: share flag + akses URL
  kini terverifikasi ulang dengan snapshot bertanggal di bawah;
  artifact-to-source tetap terbuka. Artifact ini tetap **bukan**
  application trial — informasional saja.

**Snapshot U-117 bertanggal (2026-11-08 ~21:18–21:20 WIB):**
slug `airdrop-generate`; `share.shared=true` (via
`artifact.status`); URL
`https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`;
health check eksternal `browser.open` 21:18 WIB — BERHASIL
diambil, judul "Airdrop Generate", crawl 14:18 UTC (<1 menit);
HTTP status tidak ditampilkan tool; source artifact/revision
NOT VERIFIED (tidak ada catatan build/publish di repo);
klasifikasi: URL merespons (terverifikasi ulang); share flag
terverifikasi `true`; artifact-to-source tetap NOT VERIFIED.

### Butir 6 — Sinkronisasi development dengan main terbaru: addressed

- main HEAD saat re-read: `2bc34e1` (audit V21).
- Merge commit `9776a18` — merge origin/main (V21) ke
  `development`, **tanpa konflik**, push langsung terverifikasi
  via ls-remote.
- Setelah merge: `git log origin/main --not HEAD` = 0 (tidak ada
  behind). Tidak ada merge balik development→main. Semua commit
  pengembangan dipertahankan (HEAD akhir `b6f2138`).
- Catatan kebersihan (DL-27-05): file `.tsbuildinfo`
  (`site/client/.tsbuildinfo.client`,
  `site/server/.tsbuildinfo.server`) tetap **untracked dan tidak
  ikut ter-commit** — staging dilakukan eksplisit per file, tanpa
  `git add -A` (pelajaran dari DL-26-05).

### Butir 7 — Staging/build: F-047, U-113, U-114, T-01, staging roles — blocked (tetap, dengan bukti baru)

- **F-047/D-06:** `npm view @hatch/space-sdk version`
  dikonfirmasi ulang 2026-11-08 ~21:19 WIB: **404 Not Found** —
  `@hatch/space-sdk@* is not in this registry` (exit 1).
  Tidak ada jalur redistributable SDK yang sah; stub SDK
  0.14.0-stub.1 tidak disentuh; clean-clone TIDAK diulang
  (tidak ada perubahan material — protokol butir 6).
- **U-113:** SDK asli `server-contract.d.ts` 0.14.0 dibaca ulang
  (8.860 byte, baris 24–33): masih hanya deklarasi tipe —
  `LocalViewer` dengan `userId`/`ownerUserId`/`isOwner`/
  `delegate?` + komentar "User identity verified by the local
  daemon, without a share token" — komentar tipe, **bukan**
  pernyataan semantik populasi runtime. Tidak ada pernyataan
  provider baru. U-113 tetap **BLOCKED**.
- **U-114:** tool migrasi diperkeras (H-MIGR 18/18), tetapi
  mapping `userId`↔`ownerUserId` nyata BELUM ADA — deployment ke
  DB berisi baris lama tetap BLOCKED. Tool hanya aman dipakai
  pada salinan disposable dengan mapping eksplisit operator.
- **T-01:** `git log main` — tidak ada commit baru terkait T-01
  (terakhir `f1bfea3`, v2.3.25); tidak ada jawaban platform baru
  di repo. Tetap **BLOCKED / NOT VERIFIED**.
- **Staging roles:** keenam peran masih **UNASSIGNED / BLOCKED**
  (dibaca langsung dari `STAGING_READINESS_V2326.md`).
- **F-006b:** string narasi insiden di `actions.ts` **masih
  ada** (baris 51–52, 99, 390, 469–471, 482) — tetap OPEN,
  di luar scope revisi ini (perubahan `actions.ts` akan
  menjadi stage-(b) code change).

## §3. Response to Previous Handoff (V20) — carry-forward

Audit V21 §4 menilai respons v2.3.26 atas handoff V20 sebagai
berikut (diringkas; detail lengkap di
`SSRF_INDEPENDENT_AUDIT_V20.md` §4 dan V21 §4):

| Temuan V20 | Hasil review V21 | Tindak lanjut v2.3.27 |
| --- | --- | --- |
| 1. F-059: hapus jalur legacy saved-state | Addressed pada source development; VM evidence dilaporkan | Tidak berubah; H-AN2 6/6 bukti v2.3.26 dipertahankan (harness tidak diulang — DL-27-03) |
| 2. F-060/U-114: kompatibilitas principal lama | Partially addressed; deployment tetap BLOCKED | Diperkeras: F-061..F-064 addressed (H-MIGR 18/18); mapping tetap TIDAK ADA, deployment tetap BLOCKED (§2 butir 1–4, 7) |
| 3. U-113: kontrak provider `userId`/identity | BLOCKED | Pencarian ulang v2.3.27 nihil (§2 butir 7) |
| 4. Sinkronisasi development | Addressed pada baseline V20, stale lagi (2 behind) | Merge `9776a18` (main `2bc34e1`), behind=0 (§2 butir 6) |
| 5. Project link terpisah | Partially addressed; bukti status bertentangan | Share flag terverifikasi `true` via `artifact.status` + URL merespons; artifact-to-source tetap NOT VERIFIED (§2 butir 5) |
| 6. D-06/F-047 build portability | Tetap BLOCKED menurut bukti Muse | npm 404 dikonfirmasi ulang v2.3.27 (§2 butir 7) |

## Decision Log v2.3.27

- **DL-27-01 (F-061: reject, bukan two-phase):** mapping
  berantai/cycle DITOLAK seluruhnya, bukan ditransformasi via
  temporary namespace/CTE. Alasan: (a) reject deterministik dan
  fail-closed — tidak ada intermediate state yang bisa disangka
  principal asli; (b) tidak ada permukaan tabrakan temp-key;
  (c) tidak ada ketergantungan urutan. Opsi dua fase yang
  disarankan audit dicatat sebagai alternatif yang
  dipertimbangkan dan ditolak dengan alasan teknis ini. Operator
  dengan kebutuhan chain yang sah memecahnya menjadi mapping
  terpisah non-overlapping dengan backup baru per langkah.
- **DL-27-02 (hash log H-MIGR lama identik):** log re-run
  H-MIGR-01..08 v2.3.27 memiliki SHA-256 yang SAMA dengan log
  v2.3.26 (`fcb8128c…`). Ini WAJAR: output harness deterministik
  (baris PASS/FAIL + ringkasan; string principal tidak tercetak)
  dan tool tetap lolos semua tes lama. Bukti tool baru TETAP
  dieksekusi di re-run ini — H-MIGR-03 (rename + isolasi handler)
  dan H-MIGR-07 (rollback) LULUS atas tool v2327-1 dan akan
  GAGAL pada tool yang regresi.
- **DL-27-03 (harness lain tidak diulang):** H-AN2, H-SSRF,
  H-RES, H-LEASE, H-CACHE, H-LEG, H-KILL, H-RD, H-IP, H-AUTH,
  H-PRIN, H-DL, H-TO, H-CB, H-B58, H-SO, H-PL, H-MIG (232)
  TIDAK diulang v2.3.27 karena `site/server/src/actions.ts`
  (dan seluruh `site/**`) tidak berubah sama sekali dalam revisi
  ini — satu-satunya source yang berubah adalah tool offline
  `evidence/v2326/principal-key-migration.ts` + harness baru.
  Bukti v2.3.26 atas harness-harness itu tetap valid; total
  394/394 = 384 (v2.3.26, dipertahankan) + 10 (H-MIGR baru).
  Pengulangan tanpa perubahan implementasi/harness/risiko tidak
  menambah bukti (protokol butir 6).
- **DL-27-04 (U-117: readiness baris 20 kedaluwarsa):**
  `artifact.status` ~21:20 WIB membuktikan `share.shared=true`,
  sehingga baris 20 readiness v2.3.26 (`shared=false`) adalah
  carry-forward basi dari V2324/V2325 — diperbaiki di readiness
  v2.3.27 dengan snapshot bertanggal. HTTP status tetap TIDAK
  diklaim (tool tidak menampilkannya); artifact-to-source tetap
  NOT VERIFIED (tidak ada catatan build/publish di repo; judul
  `landing/index.html` berbeda dari judul URL — dicatat sebagai
  indikasi, bukan bukti final).
- **DL-27-05 (`.tsbuildinfo` tidak ter-commit):** merge
  `9776a18` + commit `6ac587b`/`b6f2138` memakai staging eksplisit
  per file (tanpa `git add -A`); kedua file `.tsbuildinfo` tetap
  untracked. Pelajaran DL-26-05 diterapkan.

## §4. Respons atas 7 butir handoff V21 §8

| Butir | Respons | Bukti |
| --- | --- | --- |
| 1. F-061 mapping order/cascade | Addressed — mapping berantai/cycle DITOLAK seluruhnya (exit 2, tanpa write/backup); H-MIGR-09/10/11 PASS | §2 butir 1; `evidence/v2326/principal-key-migration.ts` (commit `6ac587b`, `TOOL_VERSION` v2327-1); `evidence/v2327/test-principal-migration-v2327.ts` |
| 2. F-062 archive sentinel/NULL | Addressed — mode `archive-special` baru (JSON terpisah, DB tidak berubah); H-MIGR-12/13 PASS | §2 butir 2; tool + harness yang sama |
| 3. F-063 rollback integrity | Addressed — pre-validasi + `changes` per UPDATE + postcondition sebelum COMMIT; H-MIGR-14/15/16 PASS | §2 butir 3; tool + harness yang sama |
| 4. F-064 DB path safety | Addressed — tolak symlink (`lstatSync`/`realpathSync`), pisah mode read-only/write; H-MIGR-17 PASS | §2 butir 4; tool + harness yang sama |
| 5. U-117 project link evidence | Partially addressed — `share.shared=true` terverifikasi via `artifact.status` + URL merespons (`browser.open`); HTTP status + artifact-to-source NOT VERIFIED | §2 butir 5; snapshot bertanggal 2026-11-08 ~21:18–21:20 WIB |
| 6. Branch sync | Addressed — merge `9776a18`, behind=0, tanpa konflik | §2 butir 6 |
| 7. Staging/build | Blocked — F-047 npm 404 dikonfirmasi ulang; U-113 nihil; U-114 mapping belum ada; T-01 tanpa jawaban; 6 staging roles UNASSIGNED; F-006b masih ada | §2 butir 7 |

## §5. Risiko baru v2.3.27 (U-117)

| ID | Risiko | Penjelasan | Status | Aksi berikut |
| --- | --- | --- | --- | --- |
| U-117 | Bukti status project link tidak konsisten | Matriks v2.3.26 mengklaim `share.shared=true` + URL aktif; readiness v2.3.26 baris 20 mengklaim `share.shared=false`. v2.3.27: share flag terverifikasi `true` via `artifact.status` (~21:20 WIB) dan URL merespons via `browser.open` (~21:18 WIB, judul "Airdrop Generate"); HTTP status tidak diklaim; artifact-to-source tetap NOT VERIFIED (tidak ada catatan build/publish di repo; judul `landing/index.html` berbeda — indikasi, bukan bukti final) | PARTIALLY ADDRESSED | Seseorang dengan akses artifact menyimpan raw `artifact.status` bertanggal untuk slug `airdrop-generate` sebagai bukti repo (pola `evidence/f021-*`); bila artifact bukan dari `landing/`, catat eksplisit sumber kontennya; sampai itu ada, readiness baris 20 v2.3.27 memakai snapshot bertanggal ini dan TIDAK mengklaim artifact-to-source |
| U-116 | CI / branch governance gap | 0 workflow runs; `main`/`development` tidak protected, tanpa required checks (V20 §2, ditegaskan V21 §2) | OPEN | Owner/operator memutuskan: proteksi branch (required review + required checks) + workflow CI minimal (install/typecheck/test) setelah staging tersedia; sampai saat itu, disiplin manual (commit + push terverifikasi via ls-remote, matriks + sidecar hash) tetap berlaku |

## §6. Hard gates — No Implementation Confirmation

Revisi v2.3.27 mengubah HANYA (di `main`): `SSRF_RESPONSE_MATRIX_V2327.md`
(BARU, file ini), `STAGING_READINESS_V2327.md` (BARU),
`SSRF_REMEDIATION_DESIGN.md` (header + changelog + §D.4.38 baru).
Semua perubahan kode aplikasi + bukti mentah ada HANYA di branch
`development` (commit `9776a18`..`b6f2138`, ls-remote terverifikasi).
Verifikasi `git status` sebelum commit menunjukkan TIDAK ADA perubahan
pada `site/**`, `package.json`, `bun.lock`, migration aktual di
`site/drizzle/`, workflow CI, deployment, database/katalog, atau live
artifact di `main`. `checkLink` TIDAK di-invoke. Link Scanner TIDAK
diaktifkan. Tidak ada tes produksi/destruktif. Tidak ada deployment.
Tidak ada merge development→main. Status tetap **DESIGN REVIEW ONLY —
IMPLEMENTATION NOT APPROVED — NOT READY FOR COMMUNITY BETA.**

## §7. Gate G-M (diperbarui)

Gate **G-M** kini: audit independen V22 atas diff v2.3.27 + keputusan
K-1/K-4/K-10 + jawaban T-01 (M-6) + pernyataan provider SDK (M-1/M-2)
+ kontrak provider F-058 (U-113) + mapping terverifikasi kunci
principal lama (U-114; tool migrasi sudah diperkeras, H-MIGR 18/18)
+ registry-diff test berkala (U-108) + definisi service identity terjadwal bila
diinginkan (U-109) + pre-check migrasi 0008 (U-110) + CI/branch
governance (U-116) + staging tersedia (G-E) + bukti artifact-to-source
project link (U-117, sisa). Pemicu revisi v2.3.28
adalah audit independen V22, ATAU keputusan owner atas K-1/K-4/K-10/
T-01, ATAU bukti runtime G-B (termasuk versi SQLite produksi, U-90),
ATAU jawaban provider atas U-113, ATAU mapping terverifikasi U-114,
ATAU staging tersedia (G-E). Gate G-A..G-L dipertahankan. U-115
tetap CLOSED (mode single-owner dihapus).

## §8. Test Evidence (ringkas — detail di branch development)

**Lingkungan run:** VM lokal, Bun 1.4.4, bun:sqlite 3.53.4 / sqlite3 CLI
3.45.1, 2026-11-08 ~21:22 WIB. Semua log di branch
`development`, folder `evidence/v2327/` (commit `b6f2138`).
**Semua bukti di sini adalah VM — BUKAN staging, BUKAN
produksi.**

**Verifikasi sidecar oleh koordinator revisi (2026-11-08 ~21:24 WIB):**
ke-2 file `.txt.sha256` baru dicocokkan dengan `sha256sum -c` —
**2/2 COCOK**; ekor tiap log dibaca — semua menunjukkan PASS sesuai
tabel; `site/**` tidak berubah dalam revisi ini sehingga `tsc` tidak
dijalankan ulang (DL-27-03). Klaim ini adalah verifikasi pelaksana,
BUKAN verifikasi audit independen (V21 §3 menyatakan audit tidak
menjalankan ulang suite dan tidak menghitung ulang hash — hal yang
sama berlaku di sini).

| Harness | Perintah (ringkas) | Hasil | Log (SHA-256 lengkap) |
| --- | --- | --- | --- |
| H-MIGR baru (F-061..F-064) | `bun evidence/v2327/test-principal-migration-v2327.ts` | 10/0 | `test-principal-migration-v2327-v2327.txt` — `e2c267810a59ba7fc237aa7bf8df0e48e271bf0a849ed3f3c1a640c57eedde57` |
| H-MIGR lama (re-run; tool berubah material) | `bun evidence/v2326/test-principal-migration-v2326.ts` | 8/0 | `test-principal-migration-v2326-v2327.txt` — `fcb8128cc7cae869a2a9f1c38af99ede4ebe624ef88e1540de2a8979281efade` (identik dengan log v2.3.26 — lihat DL-27-02) |

**TOTAL BARU: 10/10 + 8/8 = 18/18 H-MIGR PASS. TOTAL REGRESI: 394/394 PASS**
(384 v2.3.26 dipertahankan + 10 baru; rincian 384 ada di matriks
v2.3.26 §8).

**Yang gagal selama putaran ini (diperbaiki, bukan
disembunyikan):** tidak ada kegagalan harness dalam putaran ini.
Merge `9776a18` bersih tanpa konflik. Tidak ada file
`.tsbuildinfo` yang ter-commit (DL-27-05).

**Pengulangan yang dijelaskan (protokol butir 6):** H-MIGR-01..08
diulang karena tool berubah material (v2326 → v2327-1). Harness
lain TIDAK diulang karena `actions.ts`/`site/**` tidak berubah —
dijelaskan di DL-27-03. D-06 clean-clone TIDAK diulang (tidak ada
perubahan material). U-113/U-117/F-006b adalah pencarian/cek
read-only baru, bukan pengulangan pengujian.

## §9. Changed Files

| File | Tujuan |
| --- | --- |
| `SSRF_RESPONSE_MATRIX_V2327.md` (BARU, file ini — `main`) | Matriks respons atas V21: §1 status F-001..F-064 + U-117, §2 handoff 7 butir, §3 carry-forward V20, Decision Log DL-27-01..05, §4 tabel handoff, §5 risiko U-117, §6 hard gates, §7 gate G-M, §8 bukti, §10 blocker |
| `STAGING_READINESS_V2327.md` (BARU — `main`) | Readiness diperbarui: baris 20 diperbaiki (U-117: `share.shared=true` terverifikasi + snapshot bertanggal; artifact-to-source NOT VERIFIED), baris 25/27 diperbarui (H-MIGR 18/18), baris 29–31 baru (tool migrasi diperkeras, sisa U-117, F-006b); peran tetap UNASSIGNED |
| `SSRF_REMEDIATION_DESIGN.md` (diubah: header + changelog + §D.4.38 baru — `main`) | Desain diperbarui secukupnya tanpa menghapus riwayat; §D.4.37 dipertahankan |
| Branch `development` (BUKAN `main`) — merge `9776a18` | Sync V21 dari main (`2bc34e1`); tanpa konflik |
| Branch `development` — `6ac587b` | F-061..F-064 tool v2327-1 + harness H-MIGR-09..18 (`principal-key-migration.ts`, `evidence/v2327/test-principal-migration-v2327.ts`) |
| Branch `development` — `b6f2138` | Evidence v2.3.27 (2 log + sidecar SHA-256) |

Verifikasi `git ls-remote origin development` = `b6f21384f4ab2bc378955b2b1e65cd083b1197f1`
(cocok HEAD lokal development); `origin/main` sebelum commit revisi
ini = `2bc34e1065efb99277f97700a2f12d241b04be56`; HEAD `main` setelah
commit revisi ini = `54811393eb6a1592818a25fd1721e2fd5d8e849c`
(terverifikasi via `git ls-remote origin main`).

**Catatan pola §9 (seperti v2.3.25/v2.3.26):** matriks ini di-commit dulu
(commit pertama), lalu commit kedua mencatat SHA main hasil commit
pertama ke dalam baris di atas — supaya SHA yang tertulis adalah SHA
yang benar-benar ter-push, bukan tebakan.

## §10. Unresolved Blockers

| Blocker | Owner yang dibutuhkan | Percobaan/bukti | Hasil | Langkah berikutnya |
| --- | --- | --- | --- | --- |
| F-047 SDK redistributable / kontrak build (M-1/M-2, U-97) | Provider Hatch via owner | npm 404 dikonfirmasi ulang v2.3.27 (~21:19 WIB); clean-clone install FAIL; build:client ditolak SDK (v2.3.22); stub tidak disentuh v2.3.27 | BLOCKED | Owner minta pernyataan/distribusi SDK + kontrak build client |
| F-047/F-030 build reproducibility | Runtime/build provider | Bun/lockfile mismatch historis + SDK path absolut + penolakan build tangan | CONFIRMED BLOCKER | Clean external builder + provenance SDK + frozen install/typecheck/build |
| T-01 second Hatch space (M-6) | Platform Hatch via owner | `evidence/v2323/t-01-verification.txt` (v2.3.23, branch development); tidak ada commit/jawaban baru v2.3.27 | BLOCKED / NOT VERIFIED | Owner menanyakan T-01 ke platform; catat jawaban tertulis |
| F-019 Link Scanner disabled | Runtime/artifact operator | Tidak ada bukti kontrol (a)–(e); kill-switch default-off hanya terbukti di VM (H-KILL 5/5) | BLOCKED / NOT VERIFIED | Bukti read-only semua invocation paths; jangan invoke action |
| F-028 deployment provenance | Artifact operator/provider | Manifest belum terisi | NOT VERIFIED | Manifest artifact digest/source commit/release/approval/rollback |
| Staging roles + environment | Rama/provider/ops sesuai peran | Readiness v2.3.27 (baris 1–6 UNASSIGNED) | Keenam role UNASSIGNED | Tetapkan owner dan staging sebelum STAGE-P01..P12 |
| F-001..F-005/F-049..F-064 staging | Staging operator + runtime/egress/DB owner | Semua bukti baru adalah VM; STAGE-P01/P02/P03 belum dapat jalan | BLOCKED | Staging tersedia → ulang H-SSRF/H-DL/H-TO/H-PRIN/H-AN2/H-MIGR di runtime staging (bukan Node/Bun VM) |
| F-058 kontrak provider (U-113) | Runtime provider via owner | Pencarian ulang v2.3.27 (DL-27-04/§2 butir 7): hanya deklarasi tipe SDK 0.14.0 + komentar doc; tidak ada pernyataan tertulis provider | BLOCKED / NOT VERIFIED | Pernyataan tertulis provider tentang populasi `userId`/`ownerUserId`/`isOwner`/`delegate` ATAU staging trace yang aman |
| U-114 migrasi data kunci principal lama | DB operator + owner | Tool migrasi diperkeras + teruji (H-MIGR 18/18); mapping `userId`↔`ownerUserId` nyata BELUM ADA — `rename` menolak jalan tanpa mapping | OPEN (menyempit) | Dapatkan mapping terverifikasi dari runtime/ekspor owner, lalu jalankan `rename` di SALINAN DB + verifikasi pre/post; atau putuskan arsip eksplisit. JANGAN deploy perubahan principal ke DB berisi baris lama sebelum ini selesai |
| U-116 CI / branch governance | Owner proyek + platform | 0 workflow runs; `main`/`development` tidak protected, tanpa required checks (V20 §2, ditegaskan V21 §2) | OPEN | Proteksi branch + workflow CI minimal (install/typecheck/test) setelah staging tersedia |
| U-117 project link evidence (sisa) | Artifact operator (raw status) | Share flag + URL terverifikasi ulang v2.3.27; artifact-to-source NOT VERIFIED; HTTP status tidak diklaim | PARTIALLY ADDRESSED | Simpan raw `artifact.status` bertanggal untuk slug `airdrop-generate` di repo (pola `evidence/f021-*`); catat eksplisit sumber konten artifact bila bukan dari `landing/` |
| F-006b narasi insiden di string kode | Muse (stage-(b) code change) | String di `actions.ts` masih ada (baris 51–52, 99, 390, 469–471, 482; dicek ulang v2.3.27) | OPEN | Bersihkan string insiden di putaran development berikutnya |
| K-1 (cabang cache), K-4 (provenance verifier), K-10 (legacy) | Owner proyek | Belum diputuskan | OPEN | Keputusan tertulis owner; K-4 kini terkait F-050 (service identity U-109) |
| U-90 versi SQLite produksi | Runtime provider / staging operator | Hanya terukur di VM (3.53.4) + CLI (3.45.1) | NOT VERIFIED | STAGE-P01 mencatat versi SQLite runtime produksi sebelum migrate 0008 |
| U-108 registry-diff berkala | Muse | Korpus IANA lengkap per 2025-10-09; belum ada tes diff otomatis | OPEN | Buat harness registry-diff + jadwal pengecekan berkala |
| U-109 service identity terjadwal | Owner + runtime provider | Tidak ada principal terjadwal di codebase/runtime | OPEN | Owner memutuskan apakah job terjadwal perlu menambah katalog; bila ya, definisikan identitas + staging proof |
| U-110 pre-check migrasi 0008 | DB operator / staging | Prosedur dicatat §2 butir 7 v2.3.24 | OPEN | Jalankan pre-check (0 baris pelanggar) sebelum migrate di DB berisi data |
| Diskusi link-jadi (U-100) | ChatGPT + owner | Dijawab GPT 13:47 WIB 2026-11-08 (rangking C/A/D/B) | ANSWERED — tindak lanjut OPEN (T-01, landing page, implementation-first) | T-01 diverifikasi Muse + ditinjau GPT; landing page terpisah bila owner memutuskan; URL landing yang sudah ada terverifikasi merespons v2.3.27 (§2 butir 5) |
| Klasifikasi Vercel Hobby (U-101) | Owner proyek | Terms resmi dibaca 2026-11-08 | NOT VERIFIED | Owner memutuskan non-komersial vs komersial sebelum deploy Hobby |
| CPU checkLink vs 10 ms Cloudflare (U-102, M-10) | Muse + staging | Belum pernah diukur | NOT VERIFIED | Ukur setelah port/adapter tersedia |
