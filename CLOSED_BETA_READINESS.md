# CLOSED BETA READINESS — AIRDROP GENERATE

**Tanggal:** 2026-11-08 (WIB)
**Branch:** `beta-readiness` (dari `main` @ `ba78b0b`)
**Menjawab:** `CLOSED_BETA_FREE_TIER_DIRECTIVE.md` (commit `ba78b0b`, 2026-11-08 13:26 WIB)
**Status proyek:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED

## Keputusan: BLOCKED

Tidak ada deployment beta. Tidak ada URL beta. Tidak ada tester yang diundang.

Alasan satu kalimat: gerbang keamanan kritis (SSRF, isolasi tenant, auth, database, tests) **gagal atau blocked** pada bukti yang ada, dan tidak ada staging yang tersedia untuk membuktikannya — jadi tidak ada subset produk yang aman untuk dibuka ke tester komunitas saat ini.

Ini adalah laporan BLOCKED berbasis bukti yang diminta direktif sebagai salah satu hasil yang sah, bukan penundaan tanpa isi: tiap gate di bawah membawa bukti berkas/baris dan aksi persis yang dapat membukanya.

## 1. Ringkasan hasil inspeksi realita (Task A)

Aplikasi yang live hari ini (`cek-link-airdrop`, v15) adalah **Hatch space artifact**, bukan aplikasi server mandiri:

| Aspek | Realita (terverifikasi di repo) |
|---|---|
| Runtime | Hatch space runtime (`site/space.json`: `runtime: "typescript"`, `platformVersion: 28`, `slug: "cek-link-airdrop"`, `managedCronJobs: []`) |
| Server | Server actions via `@hatch/space-sdk` (`defineAction`, `Ctx`, `ctx.db`, `ctx.inference`) — `site/server/src/actions.ts` (1.520 baris, 7 actions) |
| Database | SQLite yang disediakan runtime via `ctx.db<typeof schema>()` (Drizzle, migrasi `site/drizzle/0001–0005`); file DB dikelola platform (`app.db` di dalam artifact), bukan file yang bisa dipindah begitu saja |
| Client | React 19 + React Query, RPC via `@hatch/space-sdk/client` (POST `{action, args}` ke `./actions`) |
| AI (Gibran) | `ctx.inference.complete()` — LLM disediakan platform Hatch, **bukan** API berbayar eksternal; di host luar, Gibran butuh LLM API (berbayar) atau harus dimatikan |
| Env var | **Nol.** Tidak ada `process.env` di `site/server/src/`; tidak ada konfigurasi env di aplikasi live |
| Entry point HTTP | **Tidak ada.** Tidak ada `Dockerfile`, `start` script, atau HTTP server. `site/package.json` hanya punya `typecheck` + `build` |
| Cron/jobs di app | **Tidak ada** (`managedCronJobs: []`); otomasi 2 jam berjalan di luar repo (cron runtime Muse) |
| Dependency kunci | `@hatch/space-sdk: file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` di `site/bun.lock` — path absolut builder-local, tidak bisa di-install di luar Hatch (F-030) |
| Test suite / CI | **Tidak ada.** Tidak ada test runner, tidak ada workflow CI |

**Konsekuensi arsitektural:** aplikasi tidak bisa "di-deploy ulang" ke host gratis apa pun tanpa adaptasi — lapisan `@hatch/space-sdk` (actions, `ctx.db`, `ctx.inference`) harus diganti, dan SQLite file harus dipindah ke database yang persisten di host tujuan. Detail di `DEPLOYMENT_FREE_TIER.md`.

**Pernyataan README yang stale/bertentangan (direkonsiliasi):**

| Pernyataan | Status |
|---|---|
| `README.md`: "Repo GitHub: Belum ada" | **SALAH sekarang** — repo publik ada sejak 2026-11-07 |
| `README.md` / `PROJECT_OVERVIEW.md`: "katalog 13 proyek" | **STALE** — katalog kini 15 proyek (terverifikasi via `listProjects`, 2026-11-08 13:20 WIB) |
| `README.md` tabel target: "Database: PostgreSQL via Supabase; Auth: Supabase Auth; Deployment: Vercel" | **TARGET (rencana M2), bukan kondisi saat ini.** Saat ini: SQLite di artifact, tanpa auth, Hatch |
| `package.json` root: "Not a deployable app yet" | **Menyesatkan** — `site/` sudah deploy sebagai artifact v15; yang "belum deployable" adalah paket fondasi root + skeleton `src/` |
| `.env.example`: variabel Supabase untuk "M2" | **Rencana, belum terjadi.** Aplikasi live memakai nol env var |
| `src/scanner/ssrf-guard.ts`: "IMPLEMENTED" | **Logika murni yang tidak terintegrasi dan tidak diimpor `site/`.** `src/db/client.ts` adalah STUB yang melempar error; `src/` adalah skeleton paralel, bukan aplikasi yang jalan. Jangan tertukar dengan scanner live |
| `TECHNICAL_ARCHITECTURE.md`: target Next.js App Router | **Re-platform penuh**, bukan lift-and-shift. Aplikasi live adalah SPA React + Hatch actions, bukan Next.js |

## 2. Release gates (Task B)

| # | Gate | Verdict | Bukti / alasan |
|---|---|---|---|
| G1 | Proteksi SSRF | **FAIL** | `site/server/src/actions.ts`: `normalizeUrl` hanya batasi skema http/https; `fetchTextOnce` (170–212) buffer penuh `res.text()` dulu baru `.slice(0, cap)`, redirect manual maks 6 hop tanpa validasi ulang destinasi; RDAP `redirect: "follow"` tanpa validasi hop (F-001f); tanpa DNS pinning / anti-rebinding; tanpa streaming cap; deadline 30 dtk di `analyze()` (:378) dikomentari sendiri di kode sebagai "BUKAN kontrol keamanan F-003"; tanpa lease/rate limit. F-001..F-005 OPEN/BLOCKED. Proposal desain v2.3.20 ada, implementasi belum disetujui |
| G2 | Isolasi tenant | **FAIL** | Tidak ada konsep principal di kode (grep `auth\|session\|principal\|owner_user_id\|userId` di `actions.ts`: nol hasil). `checks` tanpa `owner_user_id`; `saved_projects` PK hanya `project_id` (`schema.ts`); `deleteCheck` menghapus by id tanpa cek kepemilikan; `listChecks` mengembalikan semua baris; `addProject` ter-publish tanpa auth (tidak dipanggil UI saat ini, tapi dapat dipanggil langsung via POST `./actions`). F-005/F-046 OPEN |
| G3 | Database (F-044/F-045/F-046) | **BLOCKED** | F-044: DDL proposal `ALTER TABLE ... ADD COLUMN ... GENERATED ... STORED` tidak valid di SQLite. F-045: klaim CHECK constraint chain tidak diwujudkan sebagai SQL nyata. F-046: baris legacy `owner_user_id IS NULL` dirancang terbaca semua principal. Revisi desain v2.3.21 sedang berjalan di `main` (agen paralel) — hasilnya **tidak diasumsikan**. Belum ada migrasi aktual yang diuji terhadap versi SQLite target; versi SQLite target itu sendiri NOT VERIFIED |
| G4 | Auth / session / autorisasi | **FAIL** | Tidak ada mekanisme auth apa pun di kode maupun UI (tanpa login, tanpa sesi). Ketujuh action dapat dipanggil siapa pun yang mencapai endpoint. Tidak ada bukti SDK melindungi endpoint secara implisit — framework boundary NOT VERIFIED |
| G5 | Secrets scan | **PASS** | Scan working tree + riwayat git (pola `sk-`, `ghp_`, `github_pat_`, `AKIA`, `PRIVATE KEY`, `service_role`, assignment password/secret): **nol temuan**. Satu-satunya file `.env` adalah `.env.example` (placeholder saja). Tidak ada file `.env` yang pernah di-commit (hanya `.env.example` di `44a8630`). Metode + batas: scan pola, bukan audit forensik penuh; `app.db` live dan secret runtime berada di luar scope repo dan TIDAK dipindai |
| G6 | Resource abuse | **FAIL** | Tanpa rate limiting, tanpa batas per-IP/per-principal, tanpa concurrency lease, tanpa batas jumlah request. Cap byte bersifat post-hoc (buffer dulu). Cache in-memory (FETCH 10 mnt/maks 50, RDAP 1 jam/maks 100) bersifat per-instance dan bukan kontrol abuse. Error fetch mengembalikan `null` (graceful, tapi fail-open untuk ketersediaan bukti) |
| G7 | Tests | **FAIL** | Tanpa test suite, tanpa test runner, tanpa CI. `site/package.json` hanya punya `typecheck` + `build`. Bukti yang ada adalah harness VM ad-hoc (`evidence/`, `spike-harness-v23x`) untuk validasi desain — bukan regression test aplikasi |
| G8 | Link Scanner nonaktif | **BLOCKED / NOT VERIFIED** | `checkLink` ter-publish di `artifact.list_actions` (terverifikasi 2026-11-08). Tidak ada bukti kontrol disabled di semua jalur invocation (STAGING_READINESS_V2320 butir 8). Scanner harus tetap nonaktif sampai dinyatakan lolos; tidak ada pemanggilan `checkLink` yang dilakukan dalam pekerjaan ini |

**Staging:** STAGE-P01..P12 BLOCKED/NOT RUN; keenam peran operasional UNASSIGNED (`STAGING_READINESS_V2320.md`); F-019 NOT VERIFIED; F-028 NOT VERIFIED; F-030 CONFIRMED BLOCKER.

## 3. Scope tester (bila gate lolos di masa depan)

- 5–10 tester undangan, akses via URL beta + token akses beta (mekanisme belum ada — OWNER ACTION REQUIRED).
- Tanpa data produksi, tanpa koneksi wallet, tanpa signing/transaksi, tanpa data pribadi sensitif. Dilarang meminta seed phrase/private key.
- Subset aman yang diusulkan (bukan keputusan): katalog read-only + `checkLink` hanya SETELAH G1 lolos di staging + Gibran dalam mode fallback non-AI yang diungkapkan bila LLM tidak disediakan.
- Data beta terisolasi (database terpisah); dihapus saat beta berakhir. Lihat `CLOSED_BETA_TEST_PLAN.md`.

## 4. Owner (saat ini)

| Peran | Owner |
|---|---|
| Staging operator | UNASSIGNED / BLOCKED |
| Runtime provider | UNASSIGNED / BLOCKED |
| Egress owner | UNASSIGNED / BLOCKED |
| DB/runtime owner | UNASSIGNED / BLOCKED |
| Alert recipient | UNASSIGNED / BLOCKED |
| Rollback owner | UNASSIGNED / BLOCKED |
| Beta operator / dukungan tester | UNASSIGNED — kanal dukungan tester belum disediakan (lihat `TESTER_QUICKSTART.md`) |

Tidak ada nama yang dikarang. Semua peran di atas harus diisi pemilik sebelum validasi staging dapat dimulai.

## 5. Matriks respons terhadap direktif

| Butir direktif | Respons | Bukti |
|---|---|---|
| A. Inspeksi realita + matriks kompatibilitas ≥2 opsi free-tier | **addressed** (dokumen ini §1 + `DEPLOYMENT_FREE_TIER.md`) | Inspeksi berkas/baris di atas; limit provider dicek via pencarian web 2026-11-08 (sumber tercantum di `DEPLOYMENT_FREE_TIER.md`) |
| B. Evaluasi release gates | **addressed** (dokumen ini §2) | Tiap gate: verdict + bukti berkas/baris atau NOT VERIFIED |
| C. Paket readiness (5 dokumen) | **addressed** | `CLOSED_BETA_READINESS.md`, `CLOSED_BETA_TEST_PLAN.md`, `DEPLOYMENT_FREE_TIER.md`, `TESTER_QUICKSTART.md`, `RELEASE_EVIDENCE.md` — branch `beta-readiness` |
| D. Rekomendasi deployment gratis | **addressed — rekomendasi: JANGAN deploy sekarang (BLOCKED)** | `DEPLOYMENT_FREE_TIER.md`: jalur yang direkomendasikan setelah gate lolos adalah (1) jawab T-01 (second Hatch space, zero-port) atau (2) Oracle Always Free VM + adaptasi minimal; Vercel Hobby + Turso/Supabase hanya setelah re-platform |
| E. Delivery + keputusan | **addressed** | Keputusan BLOCKED di dokumen ini; commit branch `beta-readiness` (lihat `RELEASE_EVIDENCE.md`); **tidak ada kode aplikasi atau resource produksi yang berubah** |

## 6. Blocker yang belum selesai (penghalang deployment)

1. **G1 (SSRF) FAIL** — butuh implementasi remediasi F-001..F-005 + harness staging H-SSRF/H-RES lolos + review independen + otorisasi implementasi terpisah (gate G-K). Belum ada satu pun.
2. **G2/G4 (tenant + auth) FAIL** — butuh keputusan owner soal model auth/tenancy (K-1..K-6) + implementasi + tes dua-principal di staging.
3. **G3 (DB) BLOCKED** — tunggu revisi v2.3.21 di `main` (F-044/F-045/F-046), lalu review V15; butuh versi SQLite target yang terverifikasi + migrasi aktual yang diuji (termasuk rollback/failure injection).
4. **G6/G7 FAIL** — butuh rate limiting + test suite + CI sebelum tester diundang.
5. **G8 BLOCKED** — butuh bukti runtime bahwa Link Scanner nonaktif di semua jalur, atau keputusan untuk tidak membuka `checkLink` di beta sama sekali.
6. **Staging tidak ada** — keenam peran UNASSIGNED; tanpa staging, tidak ada gate yang bisa dibuktikan lolos.
7. **T-01 NOT VERIFIED** — apakah second Hatch space dapat dipublikasikan di subdomain gratis dengan data terisolasi. Ini jawaban yang menentukan jalur deployment termurah.
8. **Gibran di beta** — tanpa LLM key dari owner, Gibran harus dimatikan di beta (fallback non-AI yang diungkapkan). Key tidak boleh ditempel di chat/commit/source.

## 7. Kill switch / rollback

Karena tidak ada deployment, kill switch saat ini adalah: **jangan publikasikan URL apa pun**. Bila beta nanti diterbitkan, kill switch-nya: hentikan instance / hapus deployment / cabut token akses beta, lalu hapus database beta. Tidak ada data produksi yang terlibat sehingga rollback produksi tidak relevan (N/A).

## 8. Yang TIDAK berubah dalam pekerjaan ini

- Tidak ada perubahan kode aplikasi (`site/` tidak disentuh).
- Tidak ada perubahan database/schema/migrasi produksi.
- Tidak ada deployment, tidak ada perubahan live artifact.
- Tidak ada pemanggilan `checkLink`, tidak ada pengaktifan Link Scanner, tidak ada tes produksi/destruktif.
- Semua pekerjaan berupa dokumen di branch `beta-readiness` saja.
