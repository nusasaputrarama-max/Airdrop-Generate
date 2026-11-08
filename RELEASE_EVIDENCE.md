# RELEASE EVIDENCE — AIRDROP GENERATE Closed Beta

**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED. **TIDAK ADA DEPLOYMENT.**

Dokumen ini adalah buku bukti (evidence ledger) untuk paket readiness closed beta. Yang tidak diketahui tertulis **NOT VERIFIED** — tidak ada yang dikarang.

## 1. Identitas

| Item | Nilai |
|---|---|
| Repository | `nusasaputrarama-max/Airdrop-Generate` (publik, branch `main`) |
| Branch paket readiness | `beta-readiness` |
| Base commit branch | `ba78b0b` — `docs(beta): direct Muse to prepare secure free-tier closed beta` (2026-11-08 13:26 WIB) |
| Commit paket readiness | Lihat §2 (diisi setelah commit pertama) |
| Disiapkan oleh | Subagent persiapan closed beta (Muse), paralel dengan revisi desain v2.3.21 di `main` |
| File yang berubah | `CLOSED_BETA_READINESS.md`, `CLOSED_BETA_TEST_PLAN.md`, `DEPLOYMENT_FREE_TIER.md`, `TESTER_QUICKSTART.md`, `RELEASE_EVIDENCE.md` (dokumen saja) |
| Kode aplikasi berubah? | **TIDAK ADA** — `site/` tidak disentuh |
| Resource produksi berubah? | **TIDAK ADA** — tanpa deployment, tanpa perubahan DB/schema/migrasi, tanpa perubahan live artifact |

## 2. Commit paket

- Commit pertama paket readiness: `ce2ceae412c810a8ccaf10dcc1d0a4beb6834e47` — `docs(beta): closed-beta readiness package — decision BLOCKED, free-tier deployment plan` (5 file, +465, branch `beta-readiness`, 2026-11-08 WIB). Commit ini dibuat sebelum SHA dicatat di dokumen; SHA dicatat lewat amend tanpa mengubah isi lain.
- Perintah verifikasi: `git log --oneline beta-readiness -3` dan `git show --stat ce2ceae`

## 3. Build

| Item | Status |
|---|---|
| Build aplikasi dijalankan dalam pekerjaan ini? | **TIDAK** — paket ini dokumen saja; tidak ada build yang dijalankan |
| Log build | **NONE / NOT VERIFIED** |
| Typecheck | **NOT RUN** dalam pekerjaan ini (terakhir terverifikasi di scratch copy saat perbaikan performa v15, 2026-11-08 ~02:21 WIB — bukan bukti build beta) |
| Deploy ID | **NONE** — tidak ada deployment |
| Provider deployment | **NONE** |
| URL publik beta | **NONE** — tidak ada URL |
| Health check | **NOT RUN** — tidak ada endpoint untuk diperiksa |

## 4. Tests

| Item | Status |
|---|---|
| Test suite aplikasi | **TIDAK ADA** — tanpa test runner, tanpa CI (`site/package.json` hanya punya `typecheck` + `build`) |
| Log test aplikasi | **NONE** |
| Bukti desain VM yang dirujuk (bukan bukti aplikasi/staging) | v2.3.20: 105 assertion PASS (F-038: 8, F-039: 23, F-042: 47, F-043: 27) — log di `evidence/v2320/`, commit `b543eca`. Berlaku sebagai bukti VM desain saja |
| Revisi v2.3.21 (F-044/F-045/F-046) | **SEDANG BERJALAN di `main`** (agen paralel) — hasil tidak diasumsikan dalam paket ini |
| Tes dua-principal (tenant) | **NOT RUN** — tidak ada staging |
| Tes migrasi aktual | **NOT RUN** — tidak ada migrasi aktual yang diuji |

## 5. Secrets scan (pekerjaan ini, 2026-11-08)

- **Metode:** grep working tree (kecuali `.git`, kecuali `bun.lock`) untuk pola `sk-...`, `ghp_...`, `github_pat_...`, `AKIA...`, `-----BEGIN ... PRIVATE KEY-----`, `xox[baprs]-...`, `AIza...`, dan assignment `password|api_key|secret|service_role` bernilai ≥8 karakter; plus `git log --all -S"<pola>"` untuk riwayat (hanya daftar commit, tanpa nilai).
- **Hasil:** **NOL temuan.** Satu-satunya file `.env` adalah `.env.example` (placeholder saja). Tidak ada file `.env` yang pernah di-commit (hanya `.env.example` di `44a8630`).
- **Batas:** scan pola, bukan audit forensik penuh. `app.db` live dan secret runtime berada di luar scope repo dan TIDAK dipindai. Alamat wallet/kontrak publik di repo adalah identifier publik, bukan secret.

## 6. Bukti inspeksi (berkas:baris)

| Fakta | Sumber |
|---|---|
| Runtime Hatch space, slug `cek-link-airdrop`, tanpa cron | `site/space.json` |
| SDK via path absolut builder-local | `site/bun.lock:8` — `@hatch/space-sdk: file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` |
| 7 server actions, DB via `ctx.db`, AI via `ctx.inference` | `site/server/src/actions.ts:13–15, 761–765, 1265–1364, 1364–1520` |
| Nol `process.env`; nol referensi auth/session/principal | grep `site/server/src/actions.ts` (nol hasil) |
| `deleteCheck` tanpa cek kepemilikan; `listChecks` tanpa filter owner | `site/server/src/actions.ts:1373–1400` |
| `normalizeUrl` hanya batasi skema; `fetchTextOnce` buffer-penuh-dulu | `site/server/src/actions.ts:70–..., 170–212` |
| RDAP `redirect: "follow"` tanpa validasi hop | `site/server/src/actions.ts:231–248` |
| Deadline 30 dtk dikomentari "BUKAN kontrol keamanan F-003" | `site/server/src/actions.ts:376–378` |
| `checks` tanpa `owner_user_id`; `saved_projects` PK hanya `project_id`; tanpa unique index kontrak | `site/server/src/schema.ts` |
| Migrasi SQLite 0001–0005 | `site/drizzle/`, `site/drizzle/meta/_journal.json` |
| `src/db/client.ts` STUB (melempar error); `ssrf-guard.ts` tidak terintegrasi | `src/db/client.ts`, `src/scanner/ssrf-guard.ts` |
| Staging: 6 peran UNASSIGNED; STAGE-P01..P12 BLOCKED | `STAGING_READINESS_V2320.md` |
| Public tester ON HOLD; T-01 NOT VERIFIED | `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md` |
| Katalog 15 proyek (live) | `listProjects`, run airdropfinder 2026-11-08 13:20 WIB |

## 7. Risiko yang masih terbuka

1. **SSRF (F-001) di kode live** — `checkLink` yang ter-publish tetap rentan; belum ada implementasi remediasi.
2. **Tanpa auth/tenant** — siapa pun yang mencapai endpoint dapat memanggil semua action, termasuk `deleteCheck` dan `addProject`.
3. **Database F-044/F-045/F-046** — menunggu revisi v2.3.21 + review independen.
4. **Tanpa test suite/CI** — tidak ada regression safety net untuk perubahan apa pun.
5. **Build tidak reproducible di luar Hatch (F-030)** — SDK path absolut; Bun 1.3.10 vs 1.4.4.
6. **Tanpa staging** — tidak ada lingkungan untuk membuktikan gate apa pun lolos.
7. **T-01 (second Hatch space)** — jalur deployment termurah belum terjawab.
8. **Gibran di host luar** — butuh LLM API berbayar atau dimatikan; tidak ada key yang disediakan.
9. **Limit provider berubah** — angka di `DEPLOYMENT_FREE_TIER.md` adalah snapshot 2026-11-08; verifikasi ulang sebelum keputusan (khususnya pemangkasan Oracle A1 4/24 → 2/12 dan angka Vercel era fluid compute).
10. **Tidak ada operator beta** — belum ada yang menjalankan beta, menerima alert, atau menghapus data beta.

## 8. Pernyataan perubahan

Dengan ini dinyatakan: dalam pekerjaan persiapan ini **tidak ada kode aplikasi yang berubah, tidak ada database/schema/migrasi produksi yang berubah, tidak ada deployment yang dilakukan, tidak ada live artifact yang diubah, tidak ada pemanggilan `checkLink`, tidak ada pengaktifan Link Scanner, dan tidak ada tes produksi/destruktif.** Yang berubah hanyalah lima dokumen di branch `beta-readiness`.
