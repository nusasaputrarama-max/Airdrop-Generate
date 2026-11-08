# Matriks Respons v2.3.25 atas Audit Independen V19

**Revisi:** v2.3.25 — jawaban atas audit independen V19
(`SSRF_INDEPENDENT_AUDIT_V19.md`, commit `cfb55a6`, audit 2026-11-08
atas `main` sampai `6167749` dan `development` sampai `ecd6f06`) dan
butir handoff V19 §6 (5 butir). Revisi ini JUGA adalah implementasi
development-branch ketiga: F-057 ditutup dan F-058 ditutup sebagian di
branch `development` atas otorisasi V19 §6 ("Otorisasi owner untuk
implementasi di branch development tetap berlaku. Jangan meminta owner
mengulang izin.") — lihat §0 dan Decision Log DL-25-01..DL-25-06.
**Tanggal revisi:** 2026-11-08 (WIB)
**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA**
**Dokumen desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.36 (baru)
**Staging readiness:** `STAGING_READINESS_V2325.md`
**Matriks sebelumnya:** `SSRF_RESPONSE_MATRIX_V2324.md` (main,
koreksi total 363/363)
**Branch kerja:** `development` — merge `main` @ `cfb55a6` (merge
`37a23a2`); HEAD revisi ini `b884c3d` (lihat §9). `main` TIDAK diubah
source aplikasinya oleh revisi ini.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.25

(a) desain remediasi — boleh dilanjutkan dan ditinjau (inilah
v2.3.25, §D.4.36); (b) implementasi pada source code — untuk
**branch pengembangan terisolasi `development`, OTORISASI DIBERIKAN
dan DIEKSEKUSI dalam revisi ini** (V19 §6 + direktif owner `c53fd73`
+ instruksi owner 2026-11-08 ~15:31 WIB ("perbaiki semua"));
implementasi di `development` TIDAK berarti persetujuan
rilis/produksi — tahap (b) untuk produksi dan tahap (c) penerapan ke
situs live tetap butuh persetujuan dan prosedur tersendiri.
**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs
live berubah** — live artifact `cek-link-airdrop` TIDAK disentuh,
`app.db` live TIDAK disentuh, Link Scanner TIDAK diaktifkan kembali,
tidak ada destructive testing produksi. F-057 kini
**diimplementasikan di `development` + teruji di VM** dan F-058
**diimplementasikan di `development` + teruji di VM dengan catatan
kontrak provider yang belum terbukti (partially addressed)** — tetapi
keduanya tetap **OPEN/BLOCKED untuk rilis** sampai bukti harness
staging (STAGE-P01..P03) tersedia.

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

**PERTAHANKAN KOREKSI ANGKA TOTAL (DL-24-01):** matriks development
v2.3.24 dan pesan commitnya menulis total regresi **353/353**. Angka
itu SALAH HITUNG (H-RD 10/10 tidak dijumlahkan); total yang benar
adalah **363/363 PASS**. Koreksi ini BERLAKU untuk dokumen ini dan
untuk total baru v2.3.25: **375/375 PASS** = 363 (baseline terkoreksi)
+ 12 tes baru (H-AN 5 + H-PL 7). Matriks development yang salah
hitung dipertahankan apa adanya sebagai catatan sejarah dan TIDAK
ditulis ulang (history branch development tidak di-rewrite).

## §1. Ringkasan status F-001..F-058

| ID | Temuan | Status v2.3.25 | Ringkasan |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **addressed (dev + VM evidence; staging pending)** | Tidak berubah dari v2.3.24 (H-SSRF 32/32 + H-IP 8/8 + H-SO 5/5 PASS di re-run v2.3.25). Egress staging NOT VERIFIED (STAGE-P01/P03). |
| F-002 | High — cap setelah buffering | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-RES 15/15 + H-CB 4/4 PASS di re-run). Memori bounded TIDAK diklaim dari model VM. |
| F-003 | High — tanpa total deadline | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-DL 6/6 + H-TO 1/1 PASS di re-run, elapsed H-TO 20018 ms). Timing runtime NOT VERIFIED. |
| F-004 | Medium — addProject duplicate race | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-MIG 232/232 PASS di re-run, kini atas 8 migrasi). |
| F-005 | Medium — otorisasi addProject tidak jelas | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-AUTH 6/6 PASS di re-run). Runtime population `ctx.viewer` NOT VERIFIED (STAGE-P02). |
| F-006b | Narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah; string di `actions.ts` belum dibersihkan (di luar scope revisi ini). |
| F-006c | DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah. |
| F-016 | Cache fetch | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-CACHE 12/12 PASS di re-run). |
| F-017 | Cache key tidak memperhitungkan cap | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-CACHE 12/12 PASS di re-run). |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **addressed (dev + VM evidence; scope `ctx.db` NOT VERIFIED)** | Diperkuat v2.3.25: principal local kini per-user (`userId`) dan anon fail-closed (F-057/F-058). H-PRIN 6/6 + H-AN 5/5 + H-PL 7/7 PASS. Scope `ctx.db` runtime NOT VERIFIED. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checkLink` MASIH TERDAFTAR; tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. `checkLink` TIDAK di-invoke. Kill-switch default-off TERBUKTI di VM (H-KILL 5/5 re-run), bukan bukti runtime. |
| F-022 | (resource) parser limits | **addressed (dev + VM evidence)** | Tidak berubah (H-RES 15/15 PASS di re-run v2.3.25). |
| F-025 | (resource) concurrency limits | **addressed (dev + VM evidence)** | Tidak berubah (H-LEASE 8/8 PASS di re-run). |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED. |
| F-030 | Bun/lockfile + SDK path | **blocked (CONFIRMED BLOCKER)** | Tidak berubah (D-06/F-047 tetap IN PROGRESS/BLOCKED; stub tidak disentuh v2.3.25). |
| F-033..F-043 | Risiko/temuan v2.3.20 | **addressed** (dipertahankan) | Tidak berubah; lihat matriks v2.3.21 §1. |
| F-044 | High — migrasi SQLite generated column STORED via ALTER TABLE | **addressed (dev + VM evidence)** | Tidak berubah; H-MIG 232/232 PASS di re-run v2.3.25 (8 migrasi). |
| F-045 | Medium — CHECK chain bukan constraint SQL nyata | **addressed (dev + VM evidence)** | Tidak berubah; H-CAT dalam 232/232 PASS di re-run. |
| F-046 | Medium — legacy checks owner NULL terbaca semua principal | **addressed (dev + VM evidence)** | Tidak berubah; H-TEN dalam 232/232 PASS di re-run v2.3.25. K-10 tersisa; scope NOT VERIFIED. |
| F-047 | High — portabilitas deployment free-tier tidak established | **partially addressed (bukti lengkap; resolusi BLOCKED)** | Tidak berubah (D-06/F-047 IN PROGRESS/BLOCKED; stub SDK 0.14.0-stub.1 tidak disentuh; clean-clone TIDAK diulang — tidak ada perubahan material). |
| F-048 | Medium — README bertentangan dengan kondisi repo/deployment | **addressed** | Tidak berubah (README v2.3.22 dipertahankan; tidak ada klaim baru yang perlu direkonsiliasi v2.3.25). |
| F-049 | High — klasifikasi IP special-purpose tidak lengkap + false positive 2001:20::/28 | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-IP 8/8 PASS di re-run; korpus IANA v2.3.24 dipertahankan). |
| F-050 | High — addProject tanpa otorisasi handler | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-AUTH 6/6 PASS di re-run; ekspektasi provenance diperbarui ke principal baru `local:u-owner-1` — lihat §2 butir 2). |
| F-051 | High — shareId Cloudflare dipakai sebagai principal → cross-viewer | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-PRIN 6/6 PASS di re-run). `ctx.viewer` runtime NOT VERIFIED (STAGE-P02). |
| F-052 | High — deadline 20 dtk tidak mengikat DNS/preflight | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-DL 6/6 PASS di re-run). Timing runtime NOT VERIFIED. |
| F-053 | Medium — timeout tersimpan sebagai hasil biasa | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-TO-01 PASS di re-run, elapsed 20018 ms, 0 baris, lease 0). |
| F-054 | Medium — cache hit bypass budget byte agregat 1 MB | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-CB 4/4 PASS di re-run). |
| F-055 | Medium — CHECK Solana di DB lebih lemah dari validator app | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-B58 5/5 PASS di re-run; H-MIG 232/232). Versi SQLite produksi NOT VERIFIED (U-90). |
| F-056 | Medium — script same-origin lolos lewat redirect | **addressed (dev + VM evidence; staging pending)** | Tidak berubah (H-SO 5/5 PASS di re-run). |
| F-057 | Medium — fallback tanpa viewer membagikan saved state `<LEGACY>` | **addressed (dev + VM evidence; staging pending)** | §2 butir 1. Tanpa viewer kini fail-closed (read default, write no-op); `'<LEGACY>'` hanya di balik mode local single-owner eksplisit (default OFF). H-AN 5/5 PASS. Runtime population `ctx.viewer` NOT VERIFIED (STAGE-P02). |
| F-058 | Medium — local principal memakai `ownerUserId`, bukan `userId` | **partially addressed (dev + VM evidence; kontrak provider BLOCKED)** | §2 butir 2. Principal local kini `local:{userId}`; delegate namespace terpisah; H-PL 7/7 PASS. Bukti kontrak provider TIDAK ADA (hanya deklarasi tipe SDK 0.14.0) — U-113. Baris lama berkunci `local:{ownerUserId}` menjadi orphan — U-114. |
| U-97..U-102 | Risiko/temuan baru v2.3.22 | **Tercatat; U-98/U-99 CLOSED, sisanya OPEN** | Tidak berubah — lihat §10. |
| U-103..U-107 | Risiko baru v2.3.23 | **Tercatat; U-103 addressed, sisanya OPEN** | Tidak berubah — lihat matriks v2.3.23 §5 + §10 di sini. |
| U-108..U-112 | Risiko/temuan baru v2.3.24 | **Tercatat; U-111 DIKOREKSI (total 363), sisanya OPEN** | Tidak berubah — lihat §10. |
| U-113..U-115 | Risiko/temuan baru v2.3.25 | **BARU — tercatat; lihat §5** | U-113 (kontrak provider F-058), U-114 (orphan kunci principal lama), U-115 (bukti mode single-owner eksplisit). |

## §2. Respons per butir handoff V19 §6

### Butir 1 — F-057: addressed (missing viewer fail-closed)

**Yang dilakukan** (`site/server/src/actions.ts`, commit
`2eb5a2a` di branch `development`):

- `savedPrincipal()` tidak lagi mengembalikan `'<LEGACY>'` untuk
  context tanpa viewer. Tanpa viewer → null → `listProjects`
  memakai `DISABLED_SAVED_PRINCIPAL` (join tidak pernah cocok,
  semua proyek kembali dengan state default) dan `setProjectState`
  no-op (ok generik, tanpa write) — perlakuan yang sama dengan
  viewer share Cloudflare non-owner (F-051).
- `'<LEGACY>'` hanya dikembalikan bila `LOCAL_SINGLE_OWNER_MODE`
  aktif: module flag default OFF dengan pola yang sama seperti
  `CHECKLINK_ENABLED` (tidak ada env var di runtime ini; mengaktifkan
  butuh perubahan kode + review, bukan toggle diam-diam).
  `setLocalSingleOwnerMode` test-only; production code tidak pernah
  memanggilnya. Deployment boleh mengaktifkannya HANYA bila dapat
  membuktikan di runtime bahwa ia adalah deployment local
  single-owner (perluasan STAGE-P02, baris readiness 24 baru).
- Komentar `listProjects`/`setProjectState` yang menyatakan anonymous
  memakai `'<LEGACY>'` diperbarui; blok komentar principal (§F-051)
  diperluas dengan §F-057/F-058.

**Bukti:** harness baru
`evidence/v2325/test-anon-saved-v2325.ts`, H-AN-01..05 **5/5 PASS**
(log `evidence/v2325/test-anon-saved-v2325-v2325.txt`, SHA-256
`764c1f88900344805644d4be52784038b7c79ba455e0dc53d145d7176ef94eb2`):
dua anon tidak saling membaca/menulis saved state (0 baris);
baris `'<LEGACY>'` yang di-seed tidak terbaca saat mode OFF,
terbaca + tertulis (update baris yang sama, tetap 1 baris) saat mode
ON, dan kembali default saat mode OFF; viewer share tetap disabled
bahkan saat mode ON; kontrol positif owner tetap bekerja dan anon
tidak melihat bookmark owner. Tes migrasi legacy tetap lulus:
H-MIG re-run 232/232 (termasuk H-MIG-01b-8: baris saved
`'<LEGACY>'` utuh) dan H-LEG 8/8.

**Sisa risiko:** mode single-owner eksplisit belum punya bukti
runtime (U-115). `ctx.viewer` terisi di runtime NOT VERIFIED
(STAGE-P02) — bila runtime ternyata selalu mengisi viewer, celah
F-057 tidak terekspos di jalur itu; bila tidak, fail-closed kini
berlaku.

### Butir 2 — F-058: partially addressed (definisi principal local)

**Yang dilakukan** (`site/server/src/actions.ts`, commit
`2eb5a2a`):

- `resolvePrincipal()` untuk viewer local kini mengembalikan
  `local:{userId}` — `userId` adalah identitas pemanggil, bukan
  `ownerUserId`.
- Invokasi delegate (`delegate: "agent" | "schedule"`) mendapat
  namespace terpisah `local:delegate:{delegate}:{userId}` — tidak
  pernah berbagi principal dengan pemanggil langsung, dan
  `"agent"` berbeda dari `"schedule"`.
- `userId` kosong → null (fail-closed).
- `isOwner` TIDAK menjadi bagian principal: dua viewer dengan
  `userId` sama berbagi satu principal dan dibedakan hanya oleh
  gate `isOwner` per-invocation (`addProject`,
  `exportLegacyChecks`). Keputusan ini diuji eksplisit (H-PL-05) dan
  dicatat sebagai DL-25-04.
- Cloudflare owner (`cloudflare-owner:{shareId}`) tidak berubah.

**Bukti kontrak provider — apa yang dibaca, apa yang tidak ada:**
dibaca file SDK ASLI
`/opt/hatch/skills/spaces/ts-runtime/dist/space-ts-deps/node_modules/@hatch/space-sdk/dist/server-contract.d.ts`
(paket `@hatch/space-sdk` 0.14.0, tarball SHA-256
`f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`):

```ts
/** User identity verified by the local daemon, without a share token. */
export type LocalViewer = {
    source: "local";
    authenticated: true;
    spaceSlug: string;
    userId: string;
    ownerUserId: string;
    isOwner: boolean;
    /** Native Muse delegation, distinct from the owner's browser. */
    delegate?: "agent" | "schedule";
};
```

Yang terbukti dari sumber ini: ada DUA field identitas terpisah;
komentar doc menyebut `userId` sebagai bagian dari "user identity";
`delegate` didokumentasikan sebagai delegasi yang "distinct from the
owner's browser". Yang TIDAK dibuktikan sumber ini — dan tidak
ditemukan pernyataan provider lain di repo (pencarian:
`userId`/`ownerUserId`/`delegate` di seluruh `*.md` repo hanya
menemukan stub yang diturunkan dari `.d.ts` ini, audit V5/V6 yang
mengutipnya, dan desain §D.4.34; tidak ada pernyataan tertulis
provider tentang semantik populasi): apakah runtime dapat memberikan
dua viewer dengan `ownerUserId` sama dan `userId` berbeda; userId apa
yang dibawa invokasi delegate; apakah `isOwner` dapat berbeda untuk
`userId` yang sama. Pencarian ini dicatat sebagai DL-25-06.

**Karena itu respons F-058 adalah partially addressed, bukan
addressed:** kriteria penerimaan V19 (dua local viewer dengan
`ownerUserId` sama dan `userId` berbeda tidak berbagi history/saved
state; owner/non-owner dan delegate behavior diuji) LOLOS di VM —
harness baru `evidence/v2325/test-principal-local-v2325.ts`,
H-PL-01..07 **7/7 PASS** (log SHA-256
`ccf0b0f47b9eaf6f3ac79aeb4ff303c6317b4e7bbec62c0bf425a783e89133ce`) —
tetapi bukti "provider contract atau staging trace yang aman" yang
diminta audit TIDAK ADA. Tidak ada bukti provider yang dipalsukan;
item ini tetap OPEN sebagai U-113.

**Dampak pembaruan harness lama (perubahan implementasi material,
preseden H-SSRF-04 v2.3.24):** empat harness yang meng-hardcode
principal lama diperbarui mengikuti format baru —
`test-migration-v2323.ts` (`local:principal-A/B` →
`local:u-principal-A/B`, H-TEN-11/15),
`test-legacy-export-v2323.ts` (seed `local:u-principal-A`),
`test-auth-addproject-v2324.ts` (provenance H-AUTH-04 →
`local:u-owner-1`), `test-principal-share-v2324.ts` (seed H-PRIN-03
→ `local:u-owner-1`). Tes-tes ini LULUS dengan ekspektasi baru dan
akan GAGAL pada kode lama — bukti jalur baru benar-benar
dieksekusi, bukan sekadar lolos karena output tidak berubah
(DL-25-02).

**Konsekuensi migrasi data (U-114):** baris yang sudah ada dengan
kunci `local:{ownerUserId}` (`checks.owner_user_id`,
`saved_projects.principal_id`, `projects.provenance_submitted_by`
dari v2.3.23/v2.3.24) TIDAK LAGI cocok dengan principal mana pun —
menjadi orphan (tidak terlihat, tidak dihapus). Tidak ada DB produksi
yang disentuh putaran ini, tetapi SEBELUM deployment apa pun yang
membawa perubahan ini menyentuh DB berisi baris lama, operator harus
memutuskan: rename kunci lama ke `local:{userId}` yang sesuai, atau
terima kehilangan visibilitas history/bookmark lama. Keputusan itu
butuh data runtime (pemetaan `userId`↔`ownerUserId` nyata).

**Sisa risiko:** semantik populasi runtime NOT VERIFIED (U-113);
keputusan migrasi data U-114 belum dibuat; bila provider kelak
membuktikan delegate membawa userId pemilik, pemetaan delegate
(DL-25-05) harus direvisi.

### Butir 3 — Sinkronisasi development dengan main terbaru: addressed

- main HEAD saat re-read: `cfb55a6` (audit V19; mencakup `6167749`
  yang disebut handoff V19 §6 butir 3).
- Merge commit `37a23a2` — merge origin/main (V19) ke
  `development`, push langsung terverifikasi via ls-remote.
- Merge berkonflik pada 2 file dokumen dan diselesaikan tanpa
  membuang konten: `SSRF_RESPONSE_MATRIX_V2324.md` (add/add) memakai
  versi **main** (koreksi total 363/363, DL-24-01);
  `SSRF_REMEDIATION_DESIGN.md` mempertahankan **kedua** seksi —
  §D.4.34 (dev, v2.3.23) + §D.4.35 (main, v2.3.24) — dan kedua seksi
  changelog v2.3.23/v2.3.24, dalam urutan kronologis. Verifikasi: 0
  conflict marker tersisa.
- Setelah merge: `git log origin/main --not HEAD` = 0 (tidak ada
  behind). Tidak ada merge balik development→main. Semua commit
  pengembangan dipertahankan (HEAD akhir `b884c3d`).

### Butir 4 — Rekonsiliasi bukti v2.3.24: addressed

- Koreksi total **363/363** pada matriks main dipertahankan
  (DL-24-01); matriks development 353/353 adalah angka historis
  salah hitung (H-RD 10/10 tidak dijumlahkan) dan tidak ditulis
  ulang.
- Total baru v2.3.25: **375/375 PASS** = 363 baseline terkoreksi +
  12 tes baru (H-AN 5 + H-PL 7). Semua 18 log punya sidecar hash
  yang cocok dengan byte mentah (18/18 terverifikasi via
  `sha256sum -c`); regression baseline + tes baru berjalan pada
  worktree development setelah commit fix; `tsc` server+client
  exit 0; command/runtime/SQLite/exit code dicatat (§8).
- F-057/F-058 ditambahkan ke backlog (BACKLOG.md baris D-13 di
  branch `development`, commit `7b77a91`).
- Hash TIDAK disebut "diverifikasi audit independen": V19 §3
  menyatakan audit tidak menjalankan ulang Bun/tsc dan tidak
  menghitung ulang seluruh 16 hash dari byte mentah — klaim hash di
  sini adalah verifikasi sidecar oleh pelaksana revisi (DL-25-02
  menjelaskan 8 log re-run yang byte-identik dengan v2.3.24).
- Pengulangan dijelaskan (protokol butir 6): seluruh 16 harness lama
  diulang karena implementasi berubah material (`actions.ts` —
  pemetaan principal dipakai SEMUA handler ber-principal). D-06
  clean-clone TIDAK diulang (tidak ada perubahan material).

### Butir 5 — Jalur menuju URL tetap jujur dan paralel: dipatuhi

- T-01 tetap feasibility-only: tidak dicoba ulang; tidak ada
  perintah/tooling create-publish yang terbukti; tetap BLOCKED.
- Landing page / project link BUKAN bagian tugas ini: tidak
  disentuh; tidak ada URL publik baru yang diklaim; acceptance
  project link (HTTPS 200/health check, $0, artifact/commit
  identity, tanpa backend/scanner terekspos) TIDAK diuji putaran
  ini dan tetap NOT VERIFIED.
- Tidak ada perubahan workflow/deployment config, live artifact,
  DB, atau scanner. Link Scanner tetap DISABLED
  (`CHECKLINK_ENABLED=false` default; H-KILL 5/5 PASS di regresi).
- Acceptance owner-only trial / community beta TIDAK terpenuhi:
  semua isolasi, auth, DB, secret, scanner-denial, SSRF, resource,
  build, staging, dan operational gates belum lulus (lihat
  `STAGING_READINESS_V2325.md`).

## §3. Response to Previous Handoff (V18) — carry-forward

Audit V19 §3 menilai respons v2.3.24 atas handoff V18 sebagai
berikut (diringkas; detail lengkap di `SSRF_INDEPENDENT_AUDIT_V19.md`
§3):

| Temuan V18 | Hasil review V19 | Tindak lanjut v2.3.25 |
| --- | --- | --- |
| F-049 — IP special-purpose | Implemented in development; VM evidence reported | Tidak berubah; H-IP 8/8 re-run PASS |
| F-050 — `addProject` authorization | Implemented in development; handler gate reviewed | Tidak berubah; H-AUTH 6/6 re-run PASS |
| F-051 — Cloudflare share principal | **Partially accepted; new residual findings F-057/F-058** | F-057 addressed, F-058 partially addressed (§2 butir 1–2) |
| F-052 — total deadline | Implemented in development; VM evidence reported | Tidak berubah; H-DL 6/6 re-run PASS |
| F-053 — timeout persistence | Implemented in development; VM evidence reported | Tidak berubah; H-TO 1/1 re-run PASS (20018 ms) |
| F-054 — cache aggregate budget | Implemented in development; code path reviewed | Tidak berubah; H-CB 4/4 re-run PASS |
| F-055 — Solana DB CHECK | Implemented in development; schema/migration reviewed | Tidak berubah; H-B58 5/5 re-run PASS |
| F-056 — same-origin redirect | Implemented in development; code path reviewed | Tidak berubah; H-SO 5/5 re-run PASS |
| Rekonsiliasi angka | Matriks main 363/363 dikoreksi; matriks dev 353/353 historis salah hitung; audit V19 TIDAK menjalankan ulang Bun/tsc dan TIDAK menghitung ulang seluruh 16 hash dari byte mentah | Koreksi 363/363 dipertahankan (§0); hash disebut verifikasi sidecar pelaksana, bukan verifikasi audit independen (§2 butir 4) |

## Decision Log v2.3.25

- **DL-25-01 (total):** regresi penuh v2.3.25 = **375/375 PASS**
  (363 baseline terkoreksi v2.3.24 + 12 baru: H-AN 5 + H-PL 7).
- **DL-25-02 (log byte-identik):** 8 log re-run byte-identik dengan
  v2.3.24 (H-AUTH `ff3fda64…`, H-CB `2b30e455…`, H-DL `3ce18117…`,
  H-IP `3bda3f83…`, H-PRIN `f0a46719…`, H-RD `ca020129…`, H-SO
  `9dc6878e…`, H-B58 `d7704e8f…`). Ini WAJAR: output harness hanya
  berisi baris PASS/FAIL + ringkasan, dan string principal tidak
  pernah tercetak di log. Jalur kode baru TETAP dieksekusi di setiap
  re-run; buktinya tes dengan ekspektasi principal yang diperbarui —
  H-AUTH-04, H-PRIN-03, H-TEN-11/15 — LULUS dan akan GAGAL pada kode
  lama.
- **DL-25-03 (konflik merge):** lihat §2 butir 3. Tidak ada konten
  yang dibuang diam-diam.
- **DL-25-04 (`isOwner` bukan identitas):** dua viewer dengan userId
  sama berbagi principal `local:{userId}` meskipun `isOwner` berbeda
  (H-PL-05). Disengaja: `isOwner` adalah atribut otorisasi
  per-invocation; semua operasi sensitif meng-gate `isOwner`
  langsung, bukan lewat principal.
- **DL-25-05 (delegate namespace):** delegate mendapat principal
  sendiri karena komentar doc SDK menyebut delegasi "distinct from
  the owner's browser" dan tidak ada bukti bahwa invokasi delegate
  membawa identitas pemanggil langsung. Bila provider kelak
  membuktikan sebaliknya, pemetaan ini harus direvisi (U-113).
- **DL-25-06 (pencarian pernyataan provider):** yang dicari —
  `server-contract.d.ts` SDK 0.14.0 asli, stub README +
  `tools/space-sdk-stub/dist/index.d.ts`, seluruh `*.md` repo untuk
  `userId`/`ownerUserId`/`delegate`, audit V5/V6, desain §D.4.34.
  Hasil: hanya deklarasi tipe + komentar doc (dikutip di §2 butir 2).
  TIDAK ADA pernyataan tertulis provider tentang semantik populasi
  runtime. Karena itu F-058 partially addressed, bukan addressed.

## §4. Respons atas 5 butir handoff V19 §6

| Butir | Respons | Bukti |
| --- | --- | --- |
| 1. F-057 missing viewer fail-closed | Addressed — saved state anon fail-closed; legacy hanya di balik mode single-owner eksplisit (default OFF), H-AN 5/5 | §2 butir 1; `site/server/src/actions.ts` (commit `2eb5a2a`); `evidence/v2325/test-anon-saved-v2325.ts` |
| 2. F-058 definisi principal local | Partially addressed — principal `local:{userId}` + delegate namespace, H-PL 7/7; kontrak provider TIDAK terbukti (U-113); orphan kunci lama (U-114) | §2 butir 2; `site/server/src/actions.ts` (commit `2eb5a2a`); `evidence/v2325/test-principal-local-v2325.ts`; SDK 0.14.0 `server-contract.d.ts` (tarball SHA `f2cb7b25…ad49e`) |
| 3. Sinkronisasi development | Addressed — merge `37a23a2`, 0 behind, konflik 2 dokumen diselesaikan | §2 butir 3 |
| 4. Rekonsiliasi bukti v2.3.24 | Addressed — total 375/375; koreksi 363 dipertahankan; 18/18 sidecar cocok; F-057/F-058 di backlog (D-13) | §2 butir 4; §8 |
| 5. Jalur menuju URL jujur/paralel | Dipatuhi — T-01 tetap BLOCKED; landing tidak disentuh; tidak ada perubahan workflow/deployment config/live artifact/DB/scanner | §2 butir 5 |

## §5. Risiko baru v2.3.25 (U-113..U-115)

| ID | Risiko | Penjelasan | Status | Aksi berikut |
| --- | --- | --- | --- | --- |
| U-113 | Kontrak provider untuk semantik `userId`/`ownerUserId`/`isOwner`/`delegate` tidak terbukti | Hanya deklarasi tipe SDK 0.14.0 + komentar doc yang dikutip di §2 butir 2; tidak ada pernyataan tertulis provider tentang populasi runtime. Pemetaan principal F-058 adalah pembacaan defensif yang bisa salah bila runtime mengisi field berbeda dari asumsi | OPEN | Minta pernyataan tertulis provider (STAGE-P02 extension, baris readiness 25) ATAU staging trace yang aman; bila bukti datang, revisi pemetaan + DL-25-05 bila perlu |
| U-114 | Baris lama berkunci `local:{ownerUserId}` menjadi orphan | `checks.owner_user_id`, `saved_projects.principal_id`, `projects.provenance_submitted_by` dari v2.3.23/v2.3.24 tidak lagi cocok dengan principal mana pun — tidak terlihat, tidak dihapus | OPEN | Sebelum deployment apa pun yang membawa perubahan ini menyentuh DB berisi baris lama: putuskan rename kunci vs terima kehilangan visibilitas; butuh pemetaan `userId`↔`ownerUserId` nyata dari runtime |
| U-115 | Mode local single-owner eksplisit belum punya bukti runtime | `LOCAL_SINGLE_OWNER_MODE` default OFF dan tidak pernah dipanggil production code; tidak ada deployment yang membuktikan dirinya local single-owner | OPEN | Buktikan di staging (STAGE-P02 extension, baris readiness 24) sebelum deployment apa pun mengaktifkan mode ini; sampai saat itu legacy saved state tidak terjangkau lewat handler |

## §6. Hard gates — No Implementation Confirmation

Revisi v2.3.25 mengubah HANYA (di `main`): `SSRF_RESPONSE_MATRIX_V2325.md`
(BARU, file ini), `STAGING_READINESS_V2325.md` (BARU),
`SSRF_REMEDIATION_DESIGN.md` (header + changelog + §D.4.36 baru).
Semua perubahan kode aplikasi + bukti mentah ada HANYA di branch
`development` (commit `37a23a2`..`b884c3d`, ls-remote terverifikasi).
Verifikasi `git status` sebelum commit menunjukkan TIDAK ADA perubahan
pada `site/**`, `package.json`, `bun.lock`, migration aktual di
`site/drizzle/`, workflow CI, deployment, database/katalog, atau live
artifact di `main`. `checkLink` TIDAK di-invoke. Link Scanner TIDAK
diaktifkan. Tidak ada tes produksi/destruktif. Tidak ada deployment.
Tidak ada merge development→main. Status tetap **DESIGN REVIEW ONLY —
IMPLEMENTATION NOT APPROVED — NOT READY FOR COMMUNITY BETA.**

## §7. Gate G-M (diperbarui)

Gate **G-M** kini: audit independen V20 atas diff v2.3.25 + keputusan
K-1/K-4/K-10 + jawaban T-01 (M-6) + pernyataan provider SDK (M-1/M-2)
+ kontrak provider F-058 (U-113) + keputusan migrasi data kunci
principal lama (U-114) + bukti mode single-owner eksplisit (U-115) +
registry-diff test berkala (U-108) + definisi service identity
terjadwal bila diinginkan (U-109) + pre-check migrasi 0008 (U-110) +
staging tersedia (G-E). Pemicu revisi v2.3.26 adalah audit independen
V20, ATAU keputusan owner atas K-1/K-4/K-10/T-01, ATAU bukti runtime
G-B (termasuk versi SQLite produksi, U-90), ATAU jawaban provider
atas U-113, ATAU staging tersedia (G-E). Gate G-A..G-L dipertahankan.

## §8. Test Evidence (ringkas — detail di branch development)

**Lingkungan run:** VM lokal, Bun 1.4.4, bun:sqlite 3.53.4 / sqlite3 CLI
3.45.1, 2026-11-08 ~17:47–17:54 WIB. Semua log di branch
`development`, folder `evidence/v2325/` (commit `7b77a91`,
`b884c3d`). **Semua bukti di sini adalah VM — BUKAN staging, BUKAN
produksi.**

**Verifikasi sidecar oleh pelaksana revisi (2026-11-08 ~17:54 WIB):**
ke-18 file `.txt.sha256` dicocokkan dengan `sha256sum -c` — **18/18
COCOK**; ekor tiap log dibaca — semua menunjukkan PASS sesuai tabel;
`bun run typecheck` di `site/` (worktree development) — **exit 0**.
Total **375/375 PASS** (363 baseline terkoreksi + 12 baru). Klaim
ini adalah verifikasi pelaksana, BUKAN verifikasi audit independen
(V19 §3 menyatakan audit tidak menjalankan ulang Bun/tsc dan tidak
menghitung ulang hash dari byte mentah).

| Harness | Perintah (ringkas) | Hasil | Log (SHA-256 lengkap) |
| --- | --- | --- | --- |
| H-MIG/H-CAT/H-TEN/DK | `bun test-migration-v2323.ts` (re-run; 8 migrasi; ekspektasi principal diperbarui ke `local:u-…`) | 232/0 | `test-migration-v2323-v2325.txt` — `9a7e8f8bcaf36b49faa372700ba44a6dd85404aea3502400d034f011fd54dd19` |
| H-SSRF | `bun test-ssrf-guard-v2323.ts` (re-run) | 32/0 | `test-ssrf-guard-v2323-v2325.txt` — `5e1901d7799a8be9cd57745dbc34bc7e736511ee85c04201f9b6db17d4fff38e` |
| H-RES | `bun test-resource-v2323.ts` (re-run) | 15/0 | `test-resource-v2323-v2325.txt` — `b060f5b30c26ddd8ce00563b45d62f3392ea7172a7b403051e15dfa45a3e8d22` |
| H-LEASE | `bun test-lease-v2323.ts` (re-run) | 8/0 | `test-lease-v2323-v2325.txt` — `779e09bee927dd6acd00b3c6836dc275c28ced06c126a3ea68056e4ae51d11e6` |
| H-CACHE | `bun test-cache-v2323.ts` (re-run) | 12/0 | `test-cache-v2323-v2325.txt` — `cc55c09fd3758fd0df62a9da82c9e766219154469e521b73741bdd708041c7bb` |
| H-LEG | `bun test-legacy-export-v2323.ts` (re-run) | 8/0 | `test-legacy-export-v2323-v2325.txt` — `49995d5cf57385ac4f725bd3cd36f135140e3e882b91f9ddf4582b5977d0a848` |
| H-KILL | `bun test-checklink-killswitch-v2323.ts` (re-run) | 5/0 | `test-checklink-killswitch-v2323-v2325.txt` — `ffc6690eff6c8b9db4e119d40d3db0c8cca1617ba994a74d3c68f16e0c79d7ea` |
| H-RD | `bun test-registrable-domain-v2323.ts` (re-run) | 10/0 | `test-registrable-domain-v2323-v2325.txt` — `ca020129d2827b6e09605ba2b804e1f6b9cfac3fba1db8ea9fc2cd85a2305aa6` |
| H-IP (F-049) | `bun test-ip-registry-v2324.ts` (re-run) | 8/0 | `test-ip-registry-v2324-v2325.txt` — `3bda3f83ec0430630821e3c96aca1d50c1a86d831c2e4d668db53e4658712c54` |
| H-AUTH (F-050) | `bun test-auth-addproject-v2324.ts` (re-run; provenance `local:u-owner-1`) | 6/0 | `test-auth-addproject-v2324-v2325.txt` — `ff3fda64d83528a26060ae9804294b6de6006c706b967571a5b9f91654fc5365` |
| H-PRIN (F-051) | `bun test-principal-share-v2324.ts` (re-run; seed `local:u-owner-1`) | 6/0 | `test-principal-share-v2324-v2325.txt` — `f0a4671942aaeeee7c401e5eab52a31eefa1412dc62474bda9d71d12dff045a5` |
| H-DL (F-052) | `bun test-deadline-v2324.ts` (re-run) | 6/0 | `test-deadline-v2324-v2325.txt` — `3ce18117d8ca242e58a16aedc5cb93b90be70ecc96e09461bf604b70e523a992` |
| H-TO (F-053) | `bun test-timeout-persist-v2324.ts` (re-run) | 1/0 | `test-timeout-persist-v2324-v2325.txt` — `ca255ec9813389287b4fc4bf33f07eee5bc7a0771c03f73fe7623e74953315aa` |
| H-CB (F-054) | `bun test-cache-budget-v2324.ts` (re-run) | 4/0 | `test-cache-budget-v2324-v2325.txt` — `2b30e455ce4a703c4e4253f17bad76cc6bd2acbc2507e0b2567e85bbe77f1356` |
| H-B58 (F-055) | `bun test-solana-check-v2324.ts` (re-run) | 5/0 | `test-solana-check-v2324-v2325.txt` — `d7704e8fdd6472567b0a632e6349f8f6280079e582626407a78780afdabdad6f` |
| H-SO (F-056) | `bun test-same-origin-redirect-v2324.ts` (re-run) | 5/0 | `test-same-origin-redirect-v2324-v2325.txt` — `9dc6878e51dd203e1b2ab4d201ae3fe7137cc556f6d7f5ed4cca912d27f5a54d` |
| H-AN (F-057, baru) | `bun test-anon-saved-v2325.ts` | 5/0 | `test-anon-saved-v2325-v2325.txt` — `764c1f88900344805644d4be52784038b7c79ba455e0dc53d145d7176ef94eb2` |
| H-PL (F-058, baru) | `bun test-principal-local-v2325.ts` | 7/0 | `test-principal-local-v2325-v2325.txt` — `ccf0b0f47b9eaf6f3ac79aeb4ff303c6317b4e7bbec62c0bf425a783e89133ce` |

**TOTAL: 375/375 PASS, 0 FAIL.** `tsc` server + client: exit 0.

**Yang gagal selama putaran ini (diperbaiki, bukan disembunyikan):**
1. **Merge `origin/main` berkonflik** pada 2 file dokumen — lihat
   §2 butir 3. Diselesaikan tanpa membuang konten; 0 conflict marker
   tersisa.
2. **Tidak ada kegagalan harness.** Kedua harness baru lulus 5/5 dan
   7/7 pada run pertama; regresi penuh 18/18 harness lulus pada run
   pertama (tidak ada re-run perbaikan).

**Pengulangan yang dijelaskan (protokol butir 6):** H-MIG/H-SSRF/
H-RES/H-LEASE/H-CACHE/H-LEG/H-KILL/H-RD/H-IP/H-AUTH/H-PRIN/H-DL/
H-TO/H-CB/H-B58/H-SO diulang karena implementasi berubah material
(F-057/F-058 menyentuh `actions.ts` — pemetaan principal dipakai
SEMUA handler ber-principal — dan ekspektasi harness yang
meng-hardcode principal lama diperbarui). D-06 clean-clone TIDAK
diulang (tidak ada perubahan material — DL-24-08).

## §9. Changed Files

| File | Tujuan |
| --- | --- |
| `SSRF_RESPONSE_MATRIX_V2325.md` (BARU, file ini — `main`) | Matriks respons atas V19: §1 status F-001..F-058, §2 handoff 5 butir, §3 carry-forward V18, Decision Log DL-25-01..06, §4 tabel handoff, §5 risiko U-113..U-115, §6 hard gates, §7 gate G-M, §8 bukti, §10 blocker |
| `STAGING_READINESS_V2325.md` (BARU — `main`) | Readiness diperbarui: peran tetap UNASSIGNED + 2 baris baru (24–25) untuk prasyarat baru v2.3.25 (F-057/STAGE-P02 mode single-owner, F-058/U-113/U-114 kontrak provider + migrasi data) |
| `SSRF_REMEDIATION_DESIGN.md` (diubah: header + changelog + §D.4.36 baru — `main`) | Desain diperbarui secukupnya tanpa menghapus riwayat; §D.4.35 dipertahankan |
| Branch `development` (BUKAN `main`) — merge `37a23a2` | Sync V19 dari main (`cfb55a6`); konflik 2 dokumen diselesaikan |
| Branch `development` — `2eb5a2a` | F-057 + F-058 (`actions.ts`; H-AN 5/5, H-PL 7/7; harness lama diperbarui) |
| Branch `development` — `d864fd0` | Harness baru H-AN + H-PL |
| Branch `development` — `7b77a91` + `b884c3d` | Regresi penuh v2.3.25 (evidence/v2325/ 18 log + 2 harness baru + matriks dev + BACKLOG D-13) |

Verifikasi `git ls-remote origin development` = `b884c3d35b8b08557ece3394000994dd72adbdb4`
(cocok HEAD lokal development); `origin/main` sebelum commit revisi
ini = `cfb55a67dfb79982a78a7f381448862124d47f0b`; HEAD `main` setelah
commit revisi ini = `PENDING` (diisi commit lanjutan, pola `6167749`
v2.3.24; terverifikasi via `git ls-remote origin main`).

## §10. Unresolved Blockers

| Blocker | Owner yang dibutuhkan | Percobaan/bukti | Hasil | Langkah berikutnya |
| --- | --- | --- | --- | --- |
| F-047 SDK redistributable / kontrak build (M-1/M-2, U-97) | Provider Hatch via owner | npm 404; clean-clone install FAIL; build:client ditolak SDK (v2.3.22); stub tidak disentuh v2.3.25 | BLOCKED | Owner minta pernyataan/distribusi SDK + kontrak build client |
| F-047/F-030 build reproducibility | Runtime/build provider | Bun/lockfile mismatch historis + SDK path absolut + penolakan build tangan | CONFIRMED BLOCKER | Clean external builder + provenance SDK + frozen install/typecheck/build |
| T-01 second Hatch space (M-6) | Platform Hatch via owner | `evidence/v2323/t-01-verification.txt` (v2.3.23, branch development); tidak dicoba ulang v2.3.24/v2.3.25 | BLOCKED / NOT VERIFIED | Owner menanyakan T-01 ke platform; catat jawaban tertulis |
| F-019 Link Scanner disabled | Runtime/artifact operator | Tidak ada bukti kontrol (a)–(e); kill-switch default-off hanya terbukti di VM (H-KILL 5/5) | BLOCKED / NOT VERIFIED | Bukti read-only semua invocation paths; jangan invoke action |
| F-028 deployment provenance | Artifact operator/provider | Manifest belum terisi | NOT VERIFIED | Manifest artifact digest/source commit/release/approval/rollback |
| Staging roles + environment | Rama/provider/ops sesuai peran | Readiness v2.3.25 (baris 1–6 UNASSIGNED) | Keenam role UNASSIGNED | Tetapkan owner dan staging sebelum STAGE-P01..P12 |
| F-001..F-005/F-049..F-058 staging | Staging operator + runtime/egress/DB owner | Semua bukti baru adalah VM; STAGE-P01/P02/P03 belum dapat jalan | BLOCKED | Staging tersedia → ulang H-SSRF/H-DL/H-TO/H-PRIN/H-AN/H-PL di runtime staging (bukan Node/Bun VM) |
| F-058 kontrak provider (U-113) | Runtime provider via owner | Hanya deklarasi tipe SDK 0.14.0 + komentar doc yang dibaca (§2 butir 2); pencarian pernyataan provider di repo: tidak ada | BLOCKED / NOT VERIFIED | Pernyataan tertulis provider tentang populasi `userId`/`ownerUserId`/`isOwner`/`delegate` ATAU staging trace yang aman |
| U-114 migrasi data kunci principal lama | DB operator + owner | Baris `local:{ownerUserId}` menjadi orphan setelah F-058; belum ada pemetaan `userId`↔`ownerUserId` nyata | OPEN | Putuskan rename kunci vs terima kehilangan visibilitas sebelum deployment menyentuh DB berisi baris lama |
| U-115 bukti mode single-owner eksplisit | Runtime provider / staging operator | `LOCAL_SINGLE_OWNER_MODE` default OFF; tidak ada deployment yang membuktikan dirinya local single-owner | OPEN | Buktikan di staging (STAGE-P02 extension) sebelum deployment apa pun mengaktifkannya |
| F-006b narasi insiden di string kode | Muse (stage-(b) code change) | String di `actions.ts` belum dibersihkan | OPEN | Bersihkan string insiden di putaran development berikutnya |
| K-1 (cabang cache), K-4 (provenance verifier), K-10 (legacy) | Owner proyek | Belum diputuskan | OPEN | Keputusan tertulis owner; K-4 kini terkait F-050 (service identity U-109) |
| U-90 versi SQLite produksi | Runtime provider / staging operator | Hanya terukur di VM (3.53.4) + CLI (3.45.1) | NOT VERIFIED | STAGE-P01 mencatat versi SQLite runtime produksi sebelum migrate 0008 |
| U-108 registry-diff berkala | Muse | Korpus IANA lengkap per 2025-10-09; belum ada tes diff otomatis | OPEN | Buat harness registry-diff + jadwal pengecekan berkala |
| U-109 service identity terjadwal | Owner + runtime provider | Tidak ada principal terjadwal di codebase/runtime | OPEN | Owner memutuskan apakah job terjadwal perlu menambah katalog; bila ya, definisikan identitas + staging proof |
| U-110 pre-check migrasi 0008 | DB operator / staging | Prosedur dicatat §2 butir 7 v2.3.24 | OPEN | Jalankan pre-check (0 baris pelanggar) sebelum migrate di DB berisi data |
| Diskusi link-jadi (U-100) | ChatGPT + owner | Dijawab GPT 13:47 WIB 2026-11-08 (rangking C/A/D/B) | ANSWERED — tindak lanjut OPEN (T-01, landing page, implementation-first) | T-01 diverifikasi Muse + ditinjau GPT; landing page terpisah bila owner memutuskan |
| Klasifikasi Vercel Hobby (U-101) | Owner proyek | Terms resmi dibaca 2026-11-08 | NOT VERIFIED | Owner memutuskan non-komersial vs komersial sebelum deploy Hobby |
| CPU checkLink vs 10 ms Cloudflare (U-102, M-10) | Muse + staging | Belum pernah diukur | NOT VERIFIED | Ukur setelah port/adapter tersedia |
