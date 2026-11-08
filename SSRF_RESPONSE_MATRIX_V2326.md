# Matriks Respons v2.3.26 atas Audit Independen V20

**Revisi:** v2.3.26 — jawaban atas audit independen V20
(`SSRF_INDEPENDENT_AUDIT_V20.md`, commit `77317c3`, audit 2026-11-08
atas `main` sampai `cb2ab9b` dan `development` sampai `b884c3d`) dan
butir handoff V20 §7 (6 butir). Revisi ini JUGA adalah implementasi
development-branch keempat: F-059 ditutup dan F-060 ditutup sebagian
di branch `development` atas otorisasi V20 §7 ("Otorisasi
implementasi development branch tetap berlaku. Jangan meminta owner
mengulang izin.") — lihat §0 dan Decision Log DL-26-01..DL-26-06.
**Tanggal revisi:** 2026-11-08 (WIB)
**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA**
**Dokumen desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.37 (baru)
**Staging readiness:** `STAGING_READINESS_V2326.md`
**Matriks sebelumnya:** `SSRF_RESPONSE_MATRIX_V2325.md` (main,
375/375 PASS, koreksi total 363/363)
**Branch kerja:** `development` — merge `main` @ `77317c3` (merge
`f93aa72`); HEAD revisi ini `e11e8d1` (lihat §9). `main` TIDAK diubah
source aplikasinya oleh revisi ini.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.26

(a) desain remediasi — boleh dilanjutkan dan ditinjau (inilah
v2.3.26, §D.4.37); (b) implementasi pada source code — untuk
**branch pengembangan terisolasi `development`, OTORISASI DIBERIKAN
dan DIEKSEKUSI dalam revisi ini** (V20 §7 + direktif owner `c53fd73`
+ instruksi owner 2026-11-08 ~15:31 WIB ("perbaiki semua"));
implementasi di `development` TIDAK berarti persetujuan
rilis/produksi — tahap (b) untuk produksi dan tahap (c) penerapan ke
situs live tetap butuh persetujuan dan prosedur tersendiri.
**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs
live berubah** — live artifact `cek-link-airdrop` TIDAK disentuh,
`app.db` live TIDAK disentuh, Link Scanner TIDAK diaktifkan kembali,
tidak ada destructive testing produksi. F-059 kini
**diimplementasikan di `development` + teruji di VM** dan F-060
**diimplementasikan sebagian di `development` + teruji di VM
(tool migrasi siap; mapping terverifikasi belum ada)** — tetapi
keduanya tetap **OPEN/BLOCKED untuk rilis** sampai bukti harness
staging (STAGE-P01..P03) tersedia dan, untuk F-060, sampai mapping
`userId`↔`ownerUserId` yang sah diperoleh.

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

**KOREKSI TOTAL REGRESI (DL-26-03):** total v2.3.26 adalah
**384/384 PASS** = 370 baseline + 14 tes baru (H-AN2 6 + H-MIGR 8).
Baseline 370 = 375 (v2.3.25) − 5 (H-AN v2325 DISUPERSEDE — lihat
§2 butir 1: H-AN-03 menegaskan akses legacy saat mode ON, perilaku
yang F-059 hapus; harness itu TIDAK diulang dan TIDAK dihitung).
Harness penggantinya H-AN2 (6 tes) menguji perilaku baru. Matriks
development v2.3.24 yang salah hitung (353/353) tetap dipertahankan
apa adanya sebagai catatan sejarah dan TIDAK ditulis ulang.

## §1. Ringkasan status F-001..F-060

| ID | Temuan | Status v2.3.26 | Ringkasan |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **addressed (dev + VM evidence; staging pending)** | Tidak berubah dari v2.3.25 (H-SSRF 32/32 PASS di re-run v2.3.26). Egress staging NOT VERIFIED (STAGE-P01/P03). |
| F-002 | High — cap setelah buffering | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-RES 15/15 + H-CB 4/4 PASS di re-run). Memori bounded TIDAK diklaim dari model VM. |
| F-003 | High — tanpa total deadline | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-DL 6/6 + H-TO 1/1 PASS di re-run). Timing runtime NOT VERIFIED. |
| F-004 | Medium — addProject duplicate race | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-MIG 232/232 PASS di re-run, kini atas 8 migrasi). |
| F-005 | Medium — otorisasi addProject tidak jelas | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-AUTH 6/6 PASS di re-run). Runtime population `ctx.viewer` NOT VERIFIED (STAGE-P02). |
| F-006b | Narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah; string di `actions.ts` belum dibersihkan (di luar scope revisi ini). |
| F-006c | DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah. |
| F-016 | Cache fetch | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-CACHE 12/12 PASS di re-run). |
| F-017 | Cache key tidak memperhitungkan cap | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-CACHE 12/12 PASS di re-run). |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **addressed (dev + VM evidence; scope `ctx.db` NOT VERIFIED)** | Diperkuat v2.3.26: anon/unknown viewer kini fail-closed tanpa celah opt-in (F-059, H-AN2 6/6). H-PRIN 6/6 + H-PL 7/7 PASS. Scope `ctx.db` runtime NOT VERIFIED. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checkLink` MASIH TERDAFTAR; tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. `checkLink` TIDAK di-invoke. Kill-switch default-off TERBUKTI di VM (H-KILL 5/5 re-run), bukan bukti runtime. |
| F-022 | (resource) parser limits | **addressed (dev + VM evidence)** | Tidak berubah (H-RES 15/15 PASS di re-run v2.3.26). |
| F-025 | (resource) concurrency limits | **addressed (dev + VM evidence)** | Tidak berubah (H-LEASE 8/8 PASS di re-run). |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED. |
| F-030 | Bun/lockfile + SDK path | **blocked (CONFIRMED BLOCKER)** | Tidak berubah (D-06/F-047 tetap IN PROGRESS/BLOCKED; npm 404 dikonfirmasi ulang v2.3.26 — §2 butir 6; stub tidak disentuh). |
| F-033..F-043 | Risiko/temuan v2.3.20 | **addressed** (dipertahankan) | Tidak berubah; lihat matriks v2.3.21 §1. |
| F-044 | High — migrasi SQLite generated column STORED via ALTER TABLE | **addressed (dev + VM evidence)** | Tidak berubah; H-MIG 232/232 PASS di re-run v2.3.26 (8 migrasi). |
| F-045 | Medium — CHECK chain bukan constraint SQL nyata | **addressed (dev + VM evidence)** | Tidak berubah; H-CAT dalam 232/232 PASS di re-run. |
| F-046 | Medium — legacy checks owner NULL terbaca semua principal | **addressed (dev + VM evidence)** | Tidak berubah; H-TEN dalam 232/232 PASS di re-run v2.3.26. K-10 tersisa; scope NOT VERIFIED. |
| F-047 | High — portabilitas deployment free-tier tidak established | **partially addressed (bukti lengkap; resolusi BLOCKED)** | Tidak berubah (D-06/F-047 IN PROGRESS/BLOCKED; stub SDK 0.14.0-stub.1 tidak disentuh; clean-clone TIDAK diulang — tidak ada perubahan material). |
| F-048 | Medium — README bertentangan dengan kondisi repo/deployment | **addressed** | Tidak berubah (README v2.3.22 dipertahankan; tidak ada klaim baru yang perlu direkonsiliasi v2.3.26). |
| F-049 | High — klasifikasi IP special-purpose tidak lengkap + false positive 2001:20::/28 | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-IP 8/8 PASS di re-run; korpus IANA v2.3.24 dipertahankan). |
| F-050 | High — addProject tanpa otorisasi handler | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-AUTH 6/6 PASS di re-run). |
| F-051 | High — shareId Cloudflare dipakai sebagai principal → cross-viewer | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-PRIN 6/6 PASS di re-run). `ctx.viewer` runtime NOT VERIFIED (STAGE-P02). |
| F-052 | High — deadline 20 dtk tidak mengikat DNS/preflight | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-DL 6/6 PASS di re-run). Timing runtime NOT VERIFIED. |
| F-053 | Medium — timeout tersimpan sebagai hasil biasa | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-TO-01 PASS di re-run, 0 baris, lease 0). |
| F-054 | Medium — cache hit bypass budget byte agregat 1 MB | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-CB 4/4 PASS di re-run). |
| F-055 | Medium — CHECK Solana di DB lebih lemah dari validator app | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-B58 5/5 PASS di re-run; H-MIG 232/232). Versi SQLite produksi NOT VERIFIED (U-90). |
| F-056 | Medium — script same-origin lolos lewat redirect | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-SO 5/5 PASS di re-run). |
| F-057 | Medium — fallback tanpa viewer membagikan saved state `<LEGACY>` | **addressed (dev + VM evidence; staging pending)** | Diperkuat v2.3.26: opt-in yang dulu mengizinkan pengecualian kini DIHAPUS (F-059) — tidak ada lagi jalur handler ke `'<LEGACY>'`. H-AN2 6/6 PASS menggantikan H-AN 5/5. Runtime population `ctx.viewer` NOT VERIFIED (STAGE-P02). |
| F-058 | Medium — local principal memakai `ownerUserId`, bukan `userId` | **partially addressed (dev + VM evidence; kontrak provider BLOCKED)** | Tidak berubah (H-PL 7/7 PASS di re-run). Bukti kontrak provider TIDAK ADA — pencarian ulang v2.3.26 tetap nihil (U-113). Baris lama kini ditangani tool migrasi — F-060. |
| F-059 | Medium — mode `LOCAL_SINGLE_OWNER_MODE` aktif membuat context tanpa viewer kembali memakai principal `<LEGACY>` | **addressed (dev + VM evidence; staging pending)** | §2 butir 1. Mode DIHAPUS dari handler (bukan sekadar default OFF): tidak ada setter/getter/flag/konstanta `LEGACY_PRINCIPAL` di `actions.ts`; `savedPrincipal()` selalu null bila `resolvePrincipal()` null. H-AN2 6/6 PASS. U-115 DITUTUP sebagai "mode dihapus, attestation tak lagi diperlukan". |
| F-060 | Medium — perubahan principal tanpa migrasi kompatibilitas untuk baris lama | **partially addressed (dev + VM evidence; mapping terverifikasi BLOCKED)** | §2 butir 2. Tool offline `principal-key-migration.ts` siap: inventory/archive/rename transaksional + backup/rollback + refusal fail-closed; H-MIGR 8/8 PASS. Rename butuh mapping eksplisit terverifikasi operator — mapping itu TIDAK ADA, jadi deployment ke DB berisi baris lama tetap BLOCKED (U-114 menyempit, bukan tertutup). |
| U-97..U-102 | Risiko/temuan baru v2.3.22 | **Tercatat; U-98/U-99 CLOSED, sisanya OPEN** | Tidak berubah — lihat §10. |
| U-103..U-107 | Risiko baru v2.3.23 | **Tercatat; U-103 addressed, sisanya OPEN** | Tidak berubah — lihat matriks v2.3.23 §5 + §10 di sini. |
| U-108..U-112 | Risiko/temuan baru v2.3.24 | **Tercatat; U-111 DIKOREKSI (total 363), sisanya OPEN** | Tidak berubah — lihat §10. |
| U-113..U-115 | Risiko/temuan baru v2.3.25 | **Tercatat; U-113 BLOCKED, U-114 OPEN (menyempit), U-115 CLOSED** | U-113: pencarian ulang v2.3.26 nihil (DL-26-06). U-114: tool migrasi siap, mapping belum ada. U-115: DITUTUP — mode single-owner dihapus (DL-26-01). |
| U-116 | Risiko baru v2.3.26 — CI / branch governance gap | **BARU — tercatat; lihat §5** | 0 workflow runs; `main`/`development` tidak protected, tanpa required checks (V20 §2). |

## §2. Respons per butir handoff V20 §7

### Butir 1 — F-059: addressed (legacy mode fail-closed dengan menghapus mode)

**Yang dilakukan** (`site/server/src/actions.ts`, commit
`2066f4a` di branch `development`):

- `LOCAL_SINGLE_OWNER_MODE`, `setLocalSingleOwnerMode`,
  `isLocalSingleOwnerMode`, dan konstanta `LEGACY_PRINCIPAL`
  **dihapus dari handler**. Tidak ada lagi flag module, setter
  test-only, atau jalur kode apa pun yang dapat mengembalikan
  `'<LEGACY>'` dari `savedPrincipal()`: fungsi itu kini
  `return resolvePrincipal(ctx)` setelah menolak viewer share
  Cloudflare non-owner — null bila tidak ada viewer, null bila
  viewer tidak dikenal, null bila `userId` kosong.
- Keputusan desain (DL-26-01): mode tidak dipertahankan dengan
  default OFF dan tidak diganti "attestation local-only", karena
  tidak ada mekanisme attestation runtime di runtime ini (U-115)
  dan flag module tidak dapat membuktikan deployment local-only.
  Menghapus mode menutup celah secara struktural; baris
  `'<LEGACY>'` pra-migrasi hanya terjangkau lewat tool offline
  (§2 butir 2), tidak pernah lewat handler.
- Komentar `listProjects`/`setProjectState` dan blok komentar
  principal diperbarui; komentar penghapusan di `actions.ts`
  mencatat `git log -S LOCAL_SINGLE_OWNER_MODE` sebagai jejak
  audit dan menyatakan H-AN v2325 DISUPERSEDE.

**Bukti:** harness baru
`evidence/v2326/test-anon-saved-v2326.ts`, H-AN2-01..06 **6/6
PASS** (log `evidence/v2326/test-anon-saved-v2326-v2326.txt`,
SHA-256
`7393e31ce8e3cc28a83818d8c83f3ebde2106f5235a76fef35b4c4c9516e8430`):
dua anon tidak saling membaca/menulis (0 baris); baris
`'<LEGACY>'` yang di-seed TIDAK PERNAH terbaca anon dan tidak
tertimpa write anon; export setter/getter TIDAK ADA dan pola kode
opt-in (`let LOCAL_SINGLE_OWNER_MODE`,
`setLocalSingleOwnerMode(enabled`, `const LEGACY_PRINCIPAL`,
`LOCAL_SINGLE_OWNER_MODE ?`) TIDAK ADA di source; viewer share
Cloudflare non-owner tetap disabled; viewer source TIDAK DIKENAL
(`source: "unknown"`) fail-closed (read default, write no-op);
local viewer `userId` kosong fail-closed; kontrol positif owner
tetap bekerja dan anon tidak melihat bookmark owner. H-AN2-03
adalah regression guard source-level: bila seseorang mengembalikan
mode itu, tes gagal.

**Sisa risiko:** `ctx.viewer` terisi di runtime NOT VERIFIED
(STAGE-P02) — bila runtime ternyata selalu mengisi viewer, celah
F-059 tidak terekspos di jalur itu; bila tidak, fail-closed kini
berlaku tanpa pengecualian. U-115 DITUTUP (mode dihapus).

### Butir 2 — F-060 / U-114: partially addressed (tool kompatibilitas siap; mapping belum ada)

**Inventarisasi field** (F-060, diverifikasi dari
`site/server/src/schema.ts` + `actions.ts`):

| Tabel.kolom | Ditulis di | Kunci lama |
| --- | --- | --- |
| `checks.owner_user_id` | `actions.ts:1285` (`runCheck`) | `local:{ownerUserId}` |
| `saved_projects.principal_id` | `setProjectState` via `savedPrincipal()` | `local:{ownerUserId}` |
| `projects.provenance_submitted_by` | `actions.ts:1788` (`addProject`) | `local:{ownerUserId}` |

Kunci lama dan kunci baru berbagi format `local:<id>`, sehingga
tidak ada kode yang dapat membedakan baris legacy dari baris baru
hanya dari kuncinya — menebak `userId == ownerUserId` dilarang
keras dan tidak dilakukan.

**Yang dilakukan** (branch `development`, commit `0e4e06e`):
tool offline mandiri
`evidence/v2326/principal-key-migration.ts` (CLI Bun; BUKAN server
action; TIDAK diimpor `actions.ts`; TIDAK PERNAH jalan terhadap
live `app.db` — menolak file bernama `app.db` dan path di bawah
`ts-spaces`, exit 2):

- `inventory` — hitung baris per kunci principal per tabel +
  laporkan baris sentinel `'<LEGACY>'` dan checks NULL-owner.
- `archive` — salin baris untuk daftar kunci legacy EKSPLISIT
  operator ke JSON arsip; DB TIDAK diubah; sentinel tidak masuk
  daftar (archive-only terpisah).
- `rename` — terapkan mapping EKSPLISIT
  `[{ legacyKey, currentKey, basis }]` dalam SATU transaksi
  SQLite ke tiga tabel, dengan backup JSON lengkap ditulis SEBELUM
  write, pre-check tabrakan PK komposit
  (`principal_id`, `project_id`) di `saved_projects`, dan
  post-check (jumlah baris per tabel tidak berubah; tidak ada
  kunci legacy tersisa); gagal → rollback otomatis.
  Menolak tanpa mapping (exit 2), menolak mapping berisi
  `'<LEGACY>'` (exit 2), menolak kunci duplikat/ambigu (exit 2),
  menolak basis kosong (setiap entri wajib mencatat BAGAIMANA
  mapping diverifikasi).
- `rollback` — kembalikan kunci asli dari backup JSON dalam satu
  transaksi.

**Bukti:** harness baru
`evidence/v2326/test-principal-migration-v2326.ts`, H-MIGR-01..08
**8/8 PASS** (log
`evidence/v2326/test-principal-migration-v2326-v2326.txt`, SHA-256
`fcb8128cc7cae869a2a9f1c38af99ede4ebe624ef88e1540de2a8979281efade`),
menggerakkan CLI ASLI sebagai child process (exit code adalah
exit code tool itu sendiri) pada DB disposable bermigrasi penuh:
inventory melaporkan hitungan per kunci yang tepat (5 checks: 2
legacy owner-1 + 1 current + 1 legacy owner-2 + 1 NULL);
archive menyalin 6 baris (3 checks + 2 saved + 1 provenance)
tanpa mengubah DB; rename mapping terverifikasi mengubah kunci
(2 checks + 2 saved + 1 provenance) dengan jumlah baris tetap,
owner (`local:u-owner-1`) membaca 3 checks via `listChecks`
sedang user kedua tetap 0 (isolasi); rename bertabrakan PK
DITOLAK exit 2 tanpa backup dan tanpa perubahan; rename tanpa
mapping DITOLAK exit 2; rename `'<LEGACY>'` DITOLAK exit 2;
rollback mengembalikan kunci asli (jumlah tetap; owner kembali
melihat 1 check); tool menolak `app.db` (exit 2).

**Yang gagal selama putaran ini (diperbaiki, bukan
disembunyikan):** H-MIGR-07 gagal pada run pertama — `rollback`
membaca `r.row.owner_user_id` padahal `rename` menyimpan baris
backup MENTAH (bukan wrapper `{ legacyKey, row }` seperti
`archive`). Diperbaiki di tool (commit `0e4e06e`): rollback memakai
bentuk baris mentah + `currentKeyFor()` untuk PK komposit;
H-MIGR-07 lulus setelah perbaikan (DL-26-04).

**Status jujur — partially addressed, BUKAN addressed:** tool
siap dan teruji, tetapi mapping `userId`↔`ownerUserId` yang sah
TIDAK ADA (bergantung pada U-113). Tanpa mapping terverifikasi,
`rename` menolak jalan — dan itu disengaja (fail-closed). Maka
U-114 MENYEMPIT (dari "tidak ada rencana" menjadi "tool siap,
menunggu mapping") tetapi tetap OPEN: deployment apa pun yang
membawa perubahan principal v2.3.25 ke DB berisi baris lama tetap
BLOCKED sampai operator memegang mapping terverifikasi atau
memutuskan arsip eksplisit. Baris `'<LEGACY>'` dan checks NULL
tidak pernah di-rename (arsip saja).

### Butir 3 — U-113: blocked (pencarian pernyataan provider diulang, tetap nihil)

**Yang dicari** (2026-11-08, DL-26-06):

- Seluruh `*.md` repo untuk `ownerUserId` di luar
  audit/matriks/desain: hanya `SSRF_PROPOSAL_F001_F005_V2319.md`,
  `SSRF_PROPOSAL_F001_F005_V2320.md` (keduanya mengutip deklarasi
  tipe yang sama), dan `STAGING_READINESS_V2325.md` (baris 25,
  mencatat ketiadaan yang sama). Tidak ada pernyataan provider
  baru.
- SDK asli
  `/opt/hatch/skills/spaces/ts-runtime/dist/space-ts-deps/node_modules/@hatch/space-sdk/dist/server-contract.d.ts`
  (0.14.0): masih hanya deklarasi tipe — `userId: string;`
  `ownerUserId: string;` (baris 28–29) + komentar doc yang sudah
  dikutip di matriks v2.3.25 §2 butir 2. Tidak ada pernyataan
  tentang semantik populasi runtime.
- Tidak ada staging trace (tidak ada staging).

**Hasil:** TIDAK ADA bukti baru. F-058 tetap partially
addressed; U-113 tetap **BLOCKED**. Tidak ada klaim PASS yang
dibuat; pemetaan `local:{userId}` tetap pembacaan defensif atas
deklarasi tipe (DL-25-05 dipertahankan).

### Butir 4 — Sinkronisasi development dengan main terbaru: addressed

- main HEAD saat re-read: `77317c3` (audit V20; mencakup
  `cb2ab9b` dan `f1bfea3` yang disebut handoff V20 §7 butir 4).
- Merge commit `f93aa72` — merge origin/main (V20) ke
  `development`, push langsung terverifikasi via ls-remote.
- Merge berkonflik pada 1 file dokumen dan diselesaikan tanpa
  membuang konten: `SSRF_RESPONSE_MATRIX_V2325.md` (add/add)
  memakai versi **main** (koreksi total 363/363 + §9 SHA,
  DL-24-01). `SSRF_REMEDIATION_DESIGN.md` auto-merge (header +
  §D.4.36 dari main). Verifikasi: 0 conflict marker tersisa.
- Setelah merge: `git log origin/main --not HEAD` = 0 (tidak ada
  behind). Tidak ada merge balik development→main. Semua commit
  pengembangan dipertahankan (HEAD akhir `e11e8d1`).
- Catatan kebersihan (DL-26-05): merge `f93aa72` sempat
  memasukkan dua file build artifact lokal
  (`site/client/.tsbuildinfo.client`,
  `site/server/.tsbuildinfo.server`) karena `git add -A`.
  Keduanya dihapus dari index pada commit `794f918` dan
  `*.tsbuildinfo` ditambahkan ke `.gitignore`. Tidak ada source
  aplikasi yang berubah akibat kejadian ini.

### Butir 5 — Jalur project link terpisah dari aplikasi: partially addressed (kemampuan tooling terverifikasi; publish baru TIDAK dilakukan)

**Yang diverifikasi (read-only, tanpa deployment baru):**

- Tooling platform untuk memublikasikan halaman statis terpisah
  ADA di lingkungan ini: `artifact.create_web_static`
  (membangun hosted page dengan public share link; fullstack
  tidak punya public link). Kemampuan ini TERBUKTI pernah dipakai:
  artifact landing `airdrop-generate` sudah terbit sebagai static
  artifact terpisah dari aplikasi live `cek-link-airdrop`.
- Status artifact itu (read-only, `artifact.status`,
  2026-11-08 ~19:54 WIB): tidak ada build berjalan;
  `share.shared=true`, URL
  `https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`.
- URL itu diverifikasi merespons dari sesi eksternal
  (`browser.open`, crawl <1 menit sebelum pengecekan, judul
  "Airdrop Generate" tampil). Kontennya informasional (landing
  page); tidak ada klaim backend/scanner dari artifact ini.
- TIDAK ADA publish baru yang dilakukan dalam revisi ini, TIDAK
  ADA perubahan workflow/deployment config repo atau live
  artifact, TIDAK ADA URL baru yang dikarang.

**Yang belum terpenuhi:** acceptance V20 butir 5 meminta bukti
publish FRESH atas `landing/` dari repo sebagai static artifact
terpisah (URL HTTPS + health check tercatat). Publish fresh
adalah tindakan deployment, bukan investigasi — tidak dieksekusi
dalam revisi desain ini. Maka butir 5 = partially addressed:
kemampuan tooling + URL landing yang sudah ada terverifikasi;
publish fresh dari `landing/` tetap NOT VERIFIED sebagai
deployment baru. T-01 (second Hatch space untuk APLIKASI — hal
yang berbeda dari artifact statis) tetap BLOCKED; tidak ada
scanner yang disalin ke space kedua.

### Butir 6 — D-06 / build portability paralel: blocked (tetap)

- `npm view @hatch/space-sdk version` dan `versions`
  dikonfirmasi ulang 2026-11-08: **404 Not Found** —
  `@hatch/space-sdk@* is not in this registry` (registry
  npmjs.org). Tidak ada jalur redistributable SDK yang sah yang
  ditemukan; stub SDK 0.14.0-stub.1 tidak disentuh.
- Tidak ada pernyataan provider baru tentang build client lewat
  artifact tooling yang ditemukan di repo (pencarian yang sama
  dengan butir 3).
- Tidak ada penggantian runtime integration dengan stub sebagai
  klaim build produksi. D-06/F-030 tetap **BLOCKED**; clean-clone
  TIDAK diulang (tidak ada perubahan material — protokol butir 6).

## §3. Response to Previous Handoff (V19) — carry-forward

Audit V20 §4 menilai respons v2.3.25 atas handoff V19 sebagai
berikut (diringkas; detail lengkap di `SSRF_INDEPENDENT_AUDIT_V20.md`
§4):

| Temuan V19 | Hasil review V20 | Tindak lanjut v2.3.26 |
| --- | --- | --- |
| 1. F-057 missing viewer fail-closed | Addressed pada source development, VM test (H-AN 5/5) | Diperkuat: opt-in yang tersisa dihapus (F-059); H-AN2 6/6 menggantikan H-AN (§2 butir 1) |
| 2. F-058 local principal | Partially addressed (H-PL 7/7); kontrak runtime provider U-113 tetap BLOCKED | U-113 dicari ulang, tetap BLOCKED (§2 butir 3); U-114 ditangani tool migrasi, partially addressed (§2 butir 2) |
| 3. Sinkronisasi development | Addressed pada saat merge V19; stale lagi (2 behind) | Merge `f93aa72` (main `77317c3`), behind=0 (§2 butir 4) |
| 4. Rekonsiliasi bukti | Partially verified (audit hanya memverifikasi independen 2 log baru; tidak menjalankan ulang 375 tes, tidak menghitung ulang 18 hash) | Total baru 384/384; 19/19 sidecar cocok (verifikasi pelaksana, BUKAN audit independen — §2 butir 4 v2.3.25 berlaku sama di sini); H-AN disupersede dijelaskan (DL-26-03) |
| 5. T-01 dan landing | Belum addressed (tidak ada URL publik/health check; T-01 BLOCKED; landing README NOT DEPLOYED) | Kemampuan tooling + URL landing yang sudah ada diverifikasi read-only; publish fresh TIDAK dilakukan; T-01 tetap BLOCKED (§2 butir 5) |

## Decision Log v2.3.26

- **DL-26-01 (F-059: hapus, bukan nonaktifkan):** mode legacy
  dihapus seluruhnya dari handler, bukan dipertahankan default
  OFF, karena (a) flag module tidak membuktikan deployment
  local-only (inti F-059); (b) tidak ada mekanisme attestation
  runtime di runtime ini (U-115) — "attestation bila memungkinkan"
  tidak dapat dipenuhi, jadi satu-satunya penutupan struktural
  adalah penghapusan; (c) kebutuhan legacy yang sah (pemulihan
  baris lama) dipindah ke tool offline dengan mapping eksplisit,
  bukan ke handler. Konsekuensi: U-115 DITUTUP dengan alasan
  "mode dihapus, attestation tak lagi diperlukan"; risiko pindah
  ke tool offline yang fail-closed tanpa mapping.
- **DL-26-02 (log byte-identik):** 9 log re-run byte-identik
  dengan v2.3.25 (H-AUTH `ff3fda64…`, H-CB `2b30e455…`, H-DL
  `3ce18117…`, H-IP `3bda3f83…`, H-PRIN `f0a46719…`, H-RD
  `ca020129…`, H-SO `9dc6878e…`, H-B58 `d7704e8f…`, H-PL
  `ccf0b0f4…`). Ini WAJAR: output harness hanya berisi baris
  PASS/FAIL + ringkasan, dan string principal tidak pernah
  tercetak di log. Jalur kode baru TETAP dieksekusi di setiap
  re-run; buktinya tes dengan ekspektasi perilaku baru — H-AN2-03
  (assert API mode hilang) dan H-MIGR-03 (assert rename + isolasi
  handler) — LULUS dan akan GAGAL pada kode lama.
- **DL-26-03 (H-AN disupersede; total 384):** H-AN v2325 (5 tes)
  TIDAK diulang: H-AN-03 menegaskan perilaku yang F-059 hapus,
  sehingga harness itu gagal secara desain pada kode baru.
  Baseline = 375 − 5 = 370; total baru = 370 + 6 (H-AN2) + 8
  (H-MIGR) = **384/384 PASS**. File harness lama dipertahankan
  apa adanya sebagai catatan sejarah (tidak ditulis ulang).
- **DL-26-04 (bug rollback, diperbaiki):** H-MIGR-07 gagal run
  pertama — `rollback` membaca `r.row.*` sementara `rename`
  menyimpan baris backup mentah. Akar: dua bentuk penyimpanan
  backup (mentah di `rename`, wrapper di `archive`). Perbaikan:
  rollback memakai bentuk mentah + `currentKeyFor()`; bentuk
  wrapper dipertahankan hanya di `archive` (yang tidak dipakai
  rollback). H-MIGR-07 lulus setelah perbaikan; tidak ada
  kegagalan harness lain.
- **DL-26-05 (`.tsbuildinfo` ter-commit):** merge `f93aa72`
  memasukkan `site/client/.tsbuildinfo.client` dan
  `site/server/.tsbuildinfo.server` (build artifact lokal dari
  `tsc`, berubah tiap run) karena `git add -A`. Diperbaiki pada
  commit `794f918`: kedua file dihapus dari index (`git rm
  --cached`, file tetap ada di disk) + `*.tsbuildinfo` masuk
  `.gitignore`. Tidak ada source aplikasi yang berubah.
- **DL-26-06 (pencarian U-113 v2.3.26):** yang dicari — seluruh
  `*.md` repo untuk `ownerUserId` (di luar audit/matriks/desain),
  SDK asli `server-contract.d.ts` 0.14.0 (baris 28–29),
  `npm view @hatch/space-sdk` (404, juga untuk D-06). Hasil:
  hanya deklarasi tipe + komentar doc + dua proposal lama yang
  mengutipnya. TIDAK ADA pernyataan tertulis provider tentang
  semantik populasi runtime. Karena itu F-058 tetap partially
  addressed dan U-113 tetap BLOCKED.

## §4. Respons atas 6 butir handoff V20 §7

| Butir | Respons | Bukti |
| --- | --- | --- |
| 1. F-059 legacy mode fail-closed | Addressed — mode DIHAPUS dari handler; missing/unknown viewer tidak pernah mendapat `<LEGACY>`; H-AN2 6/6; U-115 CLOSED | §2 butir 1; `site/server/src/actions.ts` (commit `2066f4a`); `evidence/v2326/test-anon-saved-v2326.ts` |
| 2. F-060/U-114 principal-key compatibility | Partially addressed — tool offline inventory/archive/rename/rollback siap, H-MIGR 8/8; mapping terverifikasi TIDAK ADA, deployment ke DB berisi data tetap BLOCKED | §2 butir 2; `evidence/v2326/principal-key-migration.ts` (commit `0e4e06e`); `evidence/v2326/test-principal-migration-v2326.ts` |
| 3. U-113 provider identity semantics | Blocked — pencarian ulang nihil; tidak ada klaim PASS | §2 butir 3; SDK 0.14.0 `server-contract.d.ts` (tarball SHA `f2cb7b25…ad49e`); DL-26-06 |
| 4. Sinkronisasi development | Addressed — merge `f93aa72`, behind=0, konflik 1 dokumen diselesaikan pakai versi main | §2 butir 4 |
| 5. Jalur project link terpisah | Partially addressed — tooling `artifact.create_web_static` ada + URL landing yang sudah ada terverifikasi merespons; publish fresh TIDAK dilakukan; T-01 tetap BLOCKED | §2 butir 5; `artifact.status` slug `airdrop-generate` (share.shared=true); `browser.open` URL (judul tampil, crawl <1 menit) |
| 6. D-06/build portability paralel | Blocked — npm 404 dikonfirmasi ulang; stub tidak disentuh; tidak ada klaim build produksi via stub | §2 butir 6 |

## §5. Risiko baru v2.3.26 (U-116)

| ID | Risiko | Penjelasan | Status | Aksi berikut |
| --- | --- | --- | --- | --- |
| U-116 | CI / branch governance gap | GitHub Actions API mengembalikan 0 workflow runs; branch API menunjukkan `protected=false` untuk `main` dan `development`; tidak ada required status checks (V20 §2). Ini gap otomasi/release governance, bukan bukti eksploitasi — tetapi berarti tidak ada gerbang otomatis yang mencegah push langsung atau merge tanpa review | OPEN | Owner/operator memutuskan: proteksi branch (required review + required checks) + workflow CI minimal (install/typecheck/test) setelah staging tersedia; sampai saat itu, disiplin manual (commit + push terverifikasi via ls-remote, matriks + sidecar hash) tetap berlaku |

## §6. Hard gates — No Implementation Confirmation

Revisi v2.3.26 mengubah HANYA (di `main`): `SSRF_RESPONSE_MATRIX_V2326.md`
(BARU, file ini), `STAGING_READINESS_V2326.md` (BARU),
`SSRF_REMEDIATION_DESIGN.md` (header + changelog + §D.4.37 baru).
Semua perubahan kode aplikasi + bukti mentah ada HANYA di branch
`development` (commit `f93aa72`..`e11e8d1`, ls-remote terverifikasi).
Verifikasi `git status` sebelum commit menunjukkan TIDAK ADA perubahan
pada `site/**`, `package.json`, `bun.lock`, migration aktual di
`site/drizzle/`, workflow CI, deployment, database/katalog, atau live
artifact di `main`. `checkLink` TIDAK di-invoke. Link Scanner TIDAK
diaktifkan. Tidak ada tes produksi/destruktif. Tidak ada deployment.
Tidak ada merge development→main. Status tetap **DESIGN REVIEW ONLY —
IMPLEMENTATION NOT APPROVED — NOT READY FOR COMMUNITY BETA.**

## §7. Gate G-M (diperbarui)

Gate **G-M** kini: audit independen V21 atas diff v2.3.26 + keputusan
K-1/K-4/K-10 + jawaban T-01 (M-6) + pernyataan provider SDK (M-1/M-2)
+ kontrak provider F-058 (U-113) + mapping terverifikasi kunci
principal lama (U-114; tool migrasi sudah siap) + registry-diff test
berkala (U-108) + definisi service identity terjadwal bila
diinginkan (U-109) + pre-check migrasi 0008 (U-110) + CI/branch
governance (U-116) + staging tersedia (G-E). Pemicu revisi v2.3.27
adalah audit independen V21, ATAU keputusan owner atas K-1/K-4/K-10/
T-01, ATAU bukti runtime G-B (termasuk versi SQLite produksi, U-90),
ATAU jawaban provider atas U-113, ATAU mapping terverifikasi U-114,
ATAU staging tersedia (G-E). Gate G-A..G-L dipertahankan. U-115
DITUTUP revisi ini (mode single-owner dihapus) dan keluar dari gate.

## §8. Test Evidence (ringkas — detail di branch development)

**Lingkungan run:** VM lokal, Bun 1.4.4, bun:sqlite 3.53.4 / sqlite3 CLI
3.45.1, 2026-11-08 ~19:52–19:54 WIB. Semua log di branch
`development`, folder `evidence/v2326/` (commit `794f918`,
`e11e8d1`). **Semua bukti di sini adalah VM — BUKAN staging, BUKAN
produksi.**

**Verifikasi sidecar oleh pelaksana revisi (2026-11-08 ~19:54 WIB):**
ke-19 file `.txt.sha256` dicocokkan dengan `sha256sum -c` — **19/19
COCOK**; ekor tiap log dibaca — semua menunjukkan PASS sesuai tabel;
`bun run typecheck` di `site/` (worktree development) — **exit 0**.
Total **384/384 PASS** (370 baseline + 14 baru). Klaim ini adalah
verifikasi pelaksana, BUKAN verifikasi audit independen (V20 §3
menyatakan audit tidak menjalankan ulang 375 tes dan tidak
menghitung ulang seluruh hash dari byte mentah — hal yang sama
berlaku di sini).

| Harness | Perintah (ringkas) | Hasil | Log (SHA-256 lengkap) |
| --- | --- | --- | --- |
| H-MIG/H-CAT/H-TEN/DK | `bun test-migration-v2323.ts` (re-run; 8 migrasi) | 232/0 | `test-migration-v2323-v2326.txt` — `d767d7095fe7b4a2eaba42069e7e4929939c8807a4687db86954140bcca57d9e` |
| H-SSRF | `bun test-ssrf-guard-v2323.ts` (re-run) | 32/0 | `test-ssrf-guard-v2323-v2326.txt` — `c1ca8025f049ae32c566cdb05c0b880485ba88cafec65a3e4acf899206f96fdc` |
| H-RES | `bun test-resource-v2323.ts` (re-run) | 15/0 | `test-resource-v2323-v2326.txt` — `9c4d7d7631b9e4509825280e1d816ccd02178ff6242388c69fb88c0fa9922ca8` |
| H-LEASE | `bun test-lease-v2323.ts` (re-run) | 8/0 | `test-lease-v2323-v2326.txt` — `695f08a2357b912f0fdd6fa976241aafa92f03ba012d985389a42ceb93bdd0c5` |
| H-CACHE | `bun test-cache-v2323.ts` (re-run) | 12/0 | `test-cache-v2323-v2326.txt` — `875db9a8238e389c06c73d6d6ef9cb2e6480b1a18912cd2561bad7fd87e00a5a` |
| H-LEG | `bun test-legacy-export-v2323.ts` (re-run) | 8/0 | `test-legacy-export-v2323-v2326.txt` — `ee926af9f2b5456534ace05913d188210eeeb2ddfe3eed277cfee4d52ed7b6f8` |
| H-KILL | `bun test-checklink-killswitch-v2323.ts` (re-run) | 5/0 | `test-checklink-killswitch-v2323-v2326.txt` — `ba5a174a771e1f3ddbc2386433306effa7ce7e671f6b2b696e811447eab8b57d` |
| H-RD | `bun test-registrable-domain-v2323.ts` (re-run) | 10/0 | `test-registrable-domain-v2323-v2326.txt` — `ca020129d2827b6e09605ba2b804e1f6b9cfac3fba1db8ea9fc2cd85a2305aa6` |
| H-IP (F-049) | `bun test-ip-registry-v2324.ts` (re-run) | 8/0 | `test-ip-registry-v2324-v2326.txt` — `3bda3f83ec0430630821e3c96aca1d50c1a86d831c2e4d668db53e4658712c54` |
| H-AUTH (F-050) | `bun test-auth-addproject-v2324.ts` (re-run) | 6/0 | `test-auth-addproject-v2324-v2326.txt` — `ff3fda64d83528a26060ae9804294b6de6006c706b967571a5b9f91654fc5365` |
| H-PRIN (F-051) | `bun test-principal-share-v2324.ts` (re-run) | 6/0 | `test-principal-share-v2324-v2326.txt` — `f0a4671942aaeeee7c401e5eab52a31eefa1412dc62474bda9d71d12dff045a5` |
| H-DL (F-052) | `bun test-deadline-v2324.ts` (re-run) | 6/0 | `test-deadline-v2324-v2326.txt` — `3ce18117d8ca242e58a16aedc5cb93b90be70ecc96e09461bf604b70e523a992` |
| H-TO (F-053) | `bun test-timeout-persist-v2324.ts` (re-run) | 1/0 | `test-timeout-persist-v2324-v2326.txt` — `c13a5a85b458aa4001e57e4fb8ae76a41679d218f336017fbd1135499239257a` |
| H-CB (F-054) | `bun test-cache-budget-v2324.ts` (re-run) | 4/0 | `test-cache-budget-v2324-v2326.txt` — `2b30e455ce4a703c4e4253f17bad76cc6bd2acbc2507e0b2567e85bbe77f1356` |
| H-B58 (F-055) | `bun test-solana-check-v2324.ts` (re-run) | 5/0 | `test-solana-check-v2324-v2326.txt` — `d7704e8fdd6472567b0a632e6349f8f6280079e582626407a78780afdabdad6f` |
| H-SO (F-056) | `bun test-same-origin-redirect-v2324.ts` (re-run) | 5/0 | `test-same-origin-redirect-v2324-v2326.txt` — `9dc6878e51dd203e1b2ab4d201ae3fe7137cc556f6d7f5ed4cca912d27f5a54d` |
| H-PL (F-058) | `bun test-principal-local-v2325.ts` (re-run) | 7/0 | `test-principal-local-v2325-v2326.txt` — `ccf0b0f47b9eaf6f3ac79aeb4ff303c6317b4e7bbec62c0bf425a783e89133ce` |
| H-AN2 (F-059, baru) | `bun test-anon-saved-v2326.ts` | 6/0 | `test-anon-saved-v2326-v2326.txt` — `7393e31ce8e3cc28a83818d8c83f3ebde2106f5235a76fef35b4c4c9516e8430` |
| H-MIGR (F-060, baru) | `bun test-principal-migration-v2326.ts` | 8/0 | `test-principal-migration-v2326-v2326.txt` — `fcb8128cc7cae869a2a9f1c38af99ede4ebe624ef88e1540de2a8979281efade` |

**TOTAL: 384/384 PASS, 0 FAIL.** `tsc` server + client: exit 0.

**Yang gagal selama putaran ini (diperbaiki, bukan disembunyikan):**
1. **Merge `origin/main` berkonflik** pada 1 file dokumen — lihat
   §2 butir 4. Diselesaikan pakai versi main; 0 conflict marker
   tersisa.
2. **H-MIGR-07 gagal pada run pertama** — bug rollback tool
   (backup mentah vs `r.row.*`); diperbaiki, H-MIGR 8/8 lulus
   setelah perbaikan (DL-26-04).
3. **`.tsbuildinfo` sempat ter-commit** di merge `f93aa72` —
   dihapus dari index + masuk `.gitignore` (DL-26-05).

**Pengulangan yang dijelaskan (protokol butir 6):** H-MIG/H-SSRF/
H-RES/H-LEASE/H-CACHE/H-LEG/H-KILL/H-RD/H-IP/H-AUTH/H-PRIN/H-DL/
H-TO/H-CB/H-B58/H-SO/H-PL diulang karena implementasi berubah
material (`actions.ts` — `savedPrincipal()` dipakai handler
`listProjects`/`setProjectState`, dan H-AN lama disupersede).
9 log re-run byte-identik dengan v2.3.25 — dijelaskan di DL-26-02.
H-AN v2325 TIDAK diulang (disupersede — DL-26-03). D-06
clean-clone TIDAK diulang (tidak ada perubahan material).

## §9. Changed Files

| File | Tujuan |
| --- | --- |
| `SSRF_RESPONSE_MATRIX_V2326.md` (BARU, file ini — `main`) | Matriks respons atas V20: §1 status F-001..F-060 + U-116, §2 handoff 6 butir, §3 carry-forward V19, Decision Log DL-26-01..06, §4 tabel handoff, §5 risiko U-116, §6 hard gates, §7 gate G-M, §8 bukti, §10 blocker |
| `STAGING_READINESS_V2326.md` (BARU — `main`) | Readiness diperbarui: baris 24–25 diperbarui (U-115 CLOSED, U-114 menyempit), baris 26–28 baru (H-AN2 staging, tool migrasi + mapping, CI governance U-116); peran tetap UNASSIGNED |
| `SSRF_REMEDIATION_DESIGN.md` (diubah: header + changelog + §D.4.37 baru — `main`) | Desain diperbarui secukupnya tanpa menghapus riwayat; §D.4.36 dipertahankan |
| Branch `development` (BUKAN `main`) — merge `f93aa72` | Sync V20 dari main (`77317c3`); konflik 1 dokumen diselesaikan pakai versi main |
| Branch `development` — `2066f4a` | F-059 hapus mode legacy (`actions.ts`; H-AN2 6/6) |
| Branch `development` — `0e4e06e` | Harness baru H-AN2 + H-MIGR + tool migrasi `principal-key-migration.ts` |
| Branch `development` — `794f918` + `e11e8d1` | Regresi penuh v2.3.26 (evidence/v2326/ 19 log + BACKLOG D-14 + `.tsbuildinfo` dihapus dari index) |

Verifikasi `git ls-remote origin development` = `e11e8d13172d75e8ea8412754e5787b89d189465`
(cocok HEAD lokal development); `origin/main` sebelum commit revisi
ini = `77317c3a6715ef42f1e0fca23e99c64a735f4e50`; HEAD `main` setelah
commit revisi ini = `d84110c2c7e47fdf2a296dbafaab7c66f0bcca15`
(terverifikasi via `git ls-remote origin main`).

**Catatan pola §9 (seperti v2.3.25):** matriks ini di-commit dulu
(commit `d84110c`), lalu commit kedua ini (`docs(ssrf): record
v2.3.26 main HEAD SHA in response matrix §9`) mencatat SHA main
hasil commit pertama ke dalam baris di atas — supaya SHA yang
tertulis adalah SHA yang benar-benar ter-push, bukan tebakan.

## §10. Unresolved Blockers

| Blocker | Owner yang dibutuhkan | Percobaan/bukti | Hasil | Langkah berikutnya |
| --- | --- | --- | --- | --- |
| F-047 SDK redistributable / kontrak build (M-1/M-2, U-97) | Provider Hatch via owner | npm 404 dikonfirmasi ulang v2.3.26; clean-clone install FAIL; build:client ditolak SDK (v2.3.22); stub tidak disentuh v2.3.26 | BLOCKED | Owner minta pernyataan/distribusi SDK + kontrak build client |
| F-047/F-030 build reproducibility | Runtime/build provider | Bun/lockfile mismatch historis + SDK path absolut + penolakan build tangan | CONFIRMED BLOCKER | Clean external builder + provenance SDK + frozen install/typecheck/build |
| T-01 second Hatch space (M-6) | Platform Hatch via owner | `evidence/v2323/t-01-verification.txt` (v2.3.23, branch development); tidak dicoba ulang v2.3.24/v2.3.25/v2.3.26 | BLOCKED / NOT VERIFIED | Owner menanyakan T-01 ke platform; catat jawaban tertulis |
| F-019 Link Scanner disabled | Runtime/artifact operator | Tidak ada bukti kontrol (a)–(e); kill-switch default-off hanya terbukti di VM (H-KILL 5/5) | BLOCKED / NOT VERIFIED | Bukti read-only semua invocation paths; jangan invoke action |
| F-028 deployment provenance | Artifact operator/provider | Manifest belum terisi | NOT VERIFIED | Manifest artifact digest/source commit/release/approval/rollback |
| Staging roles + environment | Rama/provider/ops sesuai peran | Readiness v2.3.26 (baris 1–6 UNASSIGNED) | Keenam role UNASSIGNED | Tetapkan owner dan staging sebelum STAGE-P01..P12 |
| F-001..F-005/F-049..F-060 staging | Staging operator + runtime/egress/DB owner | Semua bukti baru adalah VM; STAGE-P01/P02/P03 belum dapat jalan | BLOCKED | Staging tersedia → ulang H-SSRF/H-DL/H-TO/H-PRIN/H-AN2/H-MIGR di runtime staging (bukan Node/Bun VM) |
| F-058 kontrak provider (U-113) | Runtime provider via owner | Pencarian ulang v2.3.26 (DL-26-06): hanya deklarasi tipe SDK 0.14.0 + komentar doc; tidak ada pernyataan tertulis provider | BLOCKED / NOT VERIFIED | Pernyataan tertulis provider tentang populasi `userId`/`ownerUserId`/`isOwner`/`delegate` ATAU staging trace yang aman |
| U-114 migrasi data kunci principal lama | DB operator + owner | Tool migrasi siap + teruji (H-MIGR 8/8); mapping `userId`↔`ownerUserId` nyata BELUM ADA — `rename` menolak jalan tanpa mapping | OPEN (menyempit) | Dapatkan mapping terverifikasi dari runtime/ekspor owner, lalu jalankan `rename` di SALINAN DB + verifikasi pre/post; atau putuskan arsip eksplisit. JANGAN deploy perubahan principal ke DB berisi baris lama sebelum ini selesai |
| U-116 CI / branch governance | Owner proyek + platform | 0 workflow runs; `main`/`development` tidak protected, tanpa required checks (V20 §2) | OPEN | Proteksi branch + workflow CI minimal (install/typecheck/test) setelah staging tersedia |
| F-006b narasi insiden di string kode | Muse (stage-(b) code change) | String di `actions.ts` belum dibersihkan | OPEN | Bersihkan string insiden di putaran development berikutnya |
| K-1 (cabang cache), K-4 (provenance verifier), K-10 (legacy) | Owner proyek | Belum diputuskan | OPEN | Keputusan tertulis owner; K-4 kini terkait F-050 (service identity U-109) |
| U-90 versi SQLite produksi | Runtime provider / staging operator | Hanya terukur di VM (3.53.4) + CLI (3.45.1) | NOT VERIFIED | STAGE-P01 mencatat versi SQLite runtime produksi sebelum migrate 0008 |
| U-108 registry-diff berkala | Muse | Korpus IANA lengkap per 2025-10-09; belum ada tes diff otomatis | OPEN | Buat harness registry-diff + jadwal pengecekan berkala |
| U-109 service identity terjadwal | Owner + runtime provider | Tidak ada principal terjadwal di codebase/runtime | OPEN | Owner memutuskan apakah job terjadwal perlu menambah katalog; bila ya, definisikan identitas + staging proof |
| U-110 pre-check migrasi 0008 | DB operator / staging | Prosedur dicatat §2 butir 7 v2.3.24 | OPEN | Jalankan pre-check (0 baris pelanggar) sebelum migrate di DB berisi data |
| Diskusi link-jadi (U-100) | ChatGPT + owner | Dijawab GPT 13:47 WIB 2026-11-08 (rangking C/A/D/B) | ANSWERED — tindak lanjut OPEN (T-01, landing page, implementation-first) | T-01 diverifikasi Muse + ditinjau GPT; landing page terpisah bila owner memutuskan; URL landing yang sudah ada terverifikasi merespons v2.3.26 (§2 butir 5) |
| Klasifikasi Vercel Hobby (U-101) | Owner proyek | Terms resmi dibaca 2026-11-08 | NOT VERIFIED | Owner memutuskan non-komersial vs komersial sebelum deploy Hobby |
| CPU checkLink vs 10 ms Cloudflare (U-102, M-10) | Muse + staging | Belum pernah diukur | NOT VERIFIED | Ukur setelah port/adapter tersedia |
