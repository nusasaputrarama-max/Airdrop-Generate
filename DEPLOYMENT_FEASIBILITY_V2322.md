# DEPLOYMENT FEASIBILITY — AIRDROP GENERATE (v2.3.22)

**Tanggal:** 2026-11-08 (WIB)
**Menjawab:** butir 2 handoff audit independen V15 §9 (feasibility deployment
free-tier, bukan tebakan nama provider) + butir 3 (F-047) + direktif beta
§A/§D.
**Status proyek:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.
**Tidak ada deployment.** Tidak ada URL beta. Dokumen ini adalah analisis
kelayakan + bukti, bukan rencana deploy yang dieksekusi.

## 1. Inspeksi tree repo — entry point aktual aplikasi

Diperiksa dari `main` @ `c53fd73` (2026-11-08). Semua path di bawah adalah
path repo; nomor baris terverifikasi saat inspeksi.

### 1.1 Yang live hari ini

| Aspek | Fakta terverifikasi | Sumber |
| --- | --- | --- |
| Produk live | Web artifact fullstack Hatch, slug `cek-link-airdrop`, v15 | `site/space.json`: `runtime: "typescript"`, `platformVersion: 28`, `entry: "client/dist/index.html"`, `managedCronJobs: []` |
| Server | 7 server actions via `@hatch/space-sdk` (`defineAction`, `Ctx`) | `site/server/src/actions.ts` (1.520 baris): `checkLink`, `listChecks`, `deleteCheck`, `listProjects`, `setProjectState`, `addProject`, `askGibran` (map `Actions` baris 1364–1520) |
| Database | SQLite via runtime: `ctx.db<typeof schema>()` (Drizzle); migrasi `0001–0005`; file DB (`app.db`) dikelola platform, tidak ada di repo | `site/server/src/schema.ts` (67 baris); `site/drizzle/0001–0005` + `meta/_journal.json`; `site/README.md` |
| Client | React 19 + React Query; RPC via `@hatch/space-sdk/client`, POST `{action, args}` ke `./actions` | `site/client/src/api.ts` (20 baris), `site/client/src/App.tsx` (1.865 baris), `site/client/src/main.tsx` |
| AI (Gibran) | `ctx.inference.complete()` — LLM disediakan platform Hatch | `site/server/src/actions.ts` (1× `ctx.inference`, baris ~1272) |
| Env var aplikasi | **NOL.** Tidak ada `process.env` di `site/server/src/` maupun `site/client/src/` | `grep -rn "process\.env" site/server/src/ site/client/src/` = 0 |
| Entry point HTTP | **TIDAK ADA.** Tidak ada `Dockerfile`, tidak ada start script, tidak ada HTTP server | `site/package.json` hanya punya `typecheck` + `build` |
| Cron/jobs di app | **TIDAK ADA** (`managedCronJobs: []`); otomasi 2 jam berjalan di luar repo (cron runtime Muse) | `site/space.json` |
| Skrip build | `build:server` = `bun build ./src/actions.ts --target=bun`; `build:client` = `bun ./client/build.mjs` → `buildClient()` milik SDK | `site/package.json:8–10`; `site/client/build.mjs:8–10` |
| Dependensi kunci | `@hatch/space-sdk: file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`; `drizzle-orm 0.45.2`; `react 19.2.5`; `zod 4.4.3`; `packageManager: bun@1.3.10` | `site/package.json:5,13`; `site/bun.lock:8,29` |
| Peer deps SDK | `@libsql/client ^0.14`, `@tanstack/react-query ^5`, `drizzle-orm ^0.45`, `react ^18 \|\| ^19`, `typescript ^5` | `site/bun.lock:29` |
| Test suite / CI | **TIDAK ADA.** Tidak ada test runner, tidak ada workflow CI di repo | Inspeksi tree (tidak ada `.github/`, tidak ada `*test*` di `site/`) |
| Fetch eksternal | `fetch()` ke URL pengguna (baris 180) + RDAP `https://rdap.org/domain/...` (baris 233) — inilah permukaan SSRF (F-001) | `site/server/src/actions.ts:180,233` |

### 1.2 Kontrak SDK/runtime (yang diketahui dari repo saja)

- Server actions dipanggil lewat kontrak SDK: handler menerima
  `(ctx, args)`; `ctx.db` menyediakan Drizzle atas SQLite runtime;
  `ctx.inference` menyediakan LLM platform. **Tidak ada dokumentasi
  kontrak SDK di repo** (isi paket SDK tidak tersedia di repo).
- Client build dimiliki SDK (`buildClient()` — entrypoint, outdir,
  `NODE_ENV` define, penamaan aset, plugin Tailwind — lihat komentar
  `site/client/build.mjs:1–7`).
- Auth/tenant: **tidak ada bukti boundary auth di source.** `listChecks`
  (baris 1373–1388), `deleteCheck` (1390–1398), `askGibran` (baris 1278)
  membaca/menghapus tanpa filter principal (dikonfirmasi audit V15 §4).
  Apakah framework/SDK menegakkan tenant di luar source — **NOT VERIFIED**;
  tidak boleh diasumsikan ada atau tidak ada tanpa bukti provider.
- Skema: `checks` tanpa `owner_user_id`; `saved_projects` ber-PK tunggal
  `project_id` (V15 §4; proposal v2.3.21 menulis ulang keduanya — desain
  saja, belum implementasi).

### 1.3 Asumsi deploy yang TIDAK boleh dibuat

1. Jangan asumsikan `bun install` + `bun run build` cukup di host luar —
   dibuktikan gagal (F-047, §2).
2. Jangan asumsikan SQLite file dapat dipindah begitu saja — file DB
   dikelola platform; tidak ada koneksi DB yang dapat dikonfigurasi
   lewat env var (nol `process.env`).
3. Jangan asumsikan Gibran jalan di host luar — butuh LLM API (berbayar)
   atau dimatikan (mode fallback non-AI harus dinyatakan eksplisit).
4. Jangan asumsikan cache in-memory bertahan — FETCH 10 mnt/maks 50,
   RDAP 1 jam/maks 100 hanya hidup selama proses berjalan; di serverless
   hilang tiap cold start.
5. Jangan asumsikan cron 2 jam ikut ter-deploy — cron berjalan di luar
   repo; host tujuan butuh scheduler sendiri (Vercel Hobby: maks 1×/hari;
   Cloudflare: 5 cron trigger/akun di Free).

## 2. Bukti portabilitas F-047 (clean-clone build)

Ringkasan; log mentah + provenance lengkap di `evidence/v2322/README.md`.

| Run | Perintah | Hasil |
| --- | --- | --- |
| Tanpa `/opt/hatch` | Clone bersih @ `c53fd73` → `unshare -rm`, bind dir kosong ke `/opt/hatch` → `bun install --frozen-lockfile` → `bun run build` | install **FAIL exit 1**: `error: ENOENT extracting tarball from @hatch/space-sdk`; build **FAIL exit 1**: `Could not resolve: "@hatch/space-sdk"` |
| Kontrol (dengan `/opt/hatch`) | Sama, tanpa namespace | install **OK exit 0**; `build:server` OK (191 modul, `actions.js` 221 KB); `build:client` **FAIL exit 1** — SDK menolak build tangan |

**Dua lapis blocker independen:**
- (a) Tarball SDK tidak terdistribusi: `npm view @hatch/space-sdk` → 404;
  tarball hanya di `/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`
  (2.051.070 byte, SHA-256 `f2cb7b25…ad49e`, versi 0.14.0 dari metadata
  install lokal — metadata saja, tidak diekstrak/didistribusikan).
- (b) **BARU (U-97):** meski SDK ada, `buildClient()` menolak build tangan:
  "This web artifact cannot be built by hand. To make this change, call
  the `artifact.edit` tool..." — client build digerbangi ke tooling
  artifact Hatch. Jadi ketersediaan tarball saja TIDAK cukup; butuh
  pernyataan/kontrak build dari provider.

## 3. Matriks kompatibilitas free tier

Fakta limit di bawah **dicek langsung dari dokumen resmi provider pada
2026-11-08 ~13:43–13:44 WIB** (halaman resmi yang dikutip V15 §5;
tanggal cek ini). Limit berubah — verifikasi ulang di halaman resmi pada
hari keputusan diambil. Semua baris "kompatibel?" menilai aplikasi
**saat ini** (Hatch SDK-bound), bukan aplikasi setelah re-platform.

| Opsi | Kompatibel dengan app saat ini? | Limit/risiko resmi (dicek 2026-11-08) | Verdict |
| --- | --- | --- | --- |
| **0. Second Hatch space** | **Ya, zero-port by construction** — runtime sama, DB terpisah | Publishability di subdomain gratis **NOT VERIFIED** (blocker T-01, `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md` §8). Biaya $0 bila dapat dipublikasikan | **Tanyakan dulu (T-01)** — jalur termurah bila memungkinkan; T-01 menjawab "di mana di-host", bukan "apakah aman dibuka" (app yang disalin tetap rentan — G1 FAIL) |
| **1. Oracle Always Free VM** | **Setelah adaptasi minimal** — Bun + SQLite file + proses long-running + cache in-memory jalan di VM; disk persisten | A1: 2 OCPU / 12 GB (dokumen saat ini; 1.500 OCPU-hours + 9.000 GB-hours/bulan); 200 GB block storage total; egress 10 TB/bulan; kapasitas A1 sering habis (`Out of host capacity`); instance idle dapat di-reclaim; tanpa SLA; butuh kartu saat signup; **tanpa free subdomain** (butuh DNS gratis + TLS Let's Encrypt, atau terowongan) | **Direkomendasikan setelah gate lolos** — paling setia pada arsitektur saat ini |
| **2. Vercel Hobby + Turso Free** | **Setelah re-platform** — ganti lapisan SDK dengan HTTP API; ganti `ctx.db` dengan Drizzle libSQL ke Turso; matikan Gibran atau sediakan LLM key | Vercel Hobby (resmi, `vercel.com/docs/plans/hobby`, last_updated 2026-09-14): $0; **non-komersial personal use saja** (fair-use guidelines); 100 GB Fast Data Transfer, 10 GB Fast Origin Transfer, 1M CDN requests, 1M function invocations, 4 CPU-hours, 360 GB-hours/bulan; durasi fungsi maks 300 dtk; 100 deployment/hari; 50 domain/proyek; log runtime 1 jam; cron maks 1×/hari; **kelebihan limit → tunggu 30 hari** (tidak bisa beli tambahan). Turso Free: 5 GB storage, 500 juta row read/bulan, 10 juta row write/bulan; DB diarsip setelah 10 hari tidak aktif | **Viable setelah port** — pekerjaan besar, tapi jalur jangka panjang yang paling bersih |
| **3. Vercel Hobby + Supabase Free** | **Setelah re-platform besar** — migrasi SQLite → Postgres + Auth + RLS | Supabase Free (resmi, `supabase.com/docs/guides/platform/billing-on-supabase`, updated 2026-09-17): DB **500 MB/proyek** (lewat → read-only), egress 5 GB/bulan, 50.000 MAU, storage file 1 GB, **500.000 invokasi Edge Function/bulan**, 2 proyek aktif, tanpa backup otomatis, log 1 hari. **Pause setelah 7 hari aktivitas rendah** (resmi, `supabase.com/docs/guides/platform/free-project-pausing`, updated 2026-09-22): email peringatan ~1 minggu sebelum + konfirmasi; restore s.d. 1 tahun; proyek berbayar tidak pernah pause. Vercel: sama seperti Opsi 2 | **Viable, bukan jalur utama** — risiko pause + port terbesar |
| **4. Cloudflare Workers Free + D1** | **Setelah re-platform** — butuh entry point Workers + adapter D1; Bun/Hatch SDK tidak terbukti portable | Workers Free (resmi, `developers.cloudflare.com/workers/platform/limits/`): **100.000 request/hari** (lewat → Error 1027), **10 ms CPU/request** (waktu tunggu network TIDAK dihitung; rata-rata Worker ~2,2 ms; parsing berat 10–20 ms), memori 128 MB, **50 subrequest/invocation** (tiap hop redirect dihitung!), 6 koneksi simultan, ukuran Worker 64 MiB, startup 1 dtk, 5 cron trigger/akun. D1 Free (resmi, `developers.cloudflare.com/d1/platform/pricing/`, updated 2026-10-30): **5 juta rows read/hari, 100.000 rows written/hari, storage 5 GB total, 10 database**; lewat limit → query gagal sampai reset 00:00 UTC | **Viable setelah port, dengan catatan CPU** — 10 ms CPU harus diukur terhadap HTML parsing/scoring checkLink; 50 subrequest membatasi rantai redirect + RDAP dalam satu invocation; Gibran butuh Workers AI (10.000 neurons/hari, shared) atau dimatikan |

### 3.1 Penjelasan batas yang paling sering disalahpahami

- **Vercel non-komersial:** Hobby membatasi "non-commercial, personal use
  only" (halaman Hobby resmi + fair-use guidelines). Penggunaan komersial
  apa pun — termasuk proyek yang menghasilkan uang bagi siapa pun yang
  terlibat — butuh Pro ($20/kursi/bulan). Apakah AIRDROP GENERATE
  (produk komunitas tanpa monetisasi saat ini) termasuk non-komersial
  adalah **keputusan owner + penafsiran terms** — bukan klaim teknis;
  jangan deploy ke Hobby sebelum owner memutuskan klasifikasi ini.
- **Supabase pause:** bukan "sleep" yang bangun sendiri — proyek pause
  mematikan infrastruktur (DB offline, pg_cron mati tanpa backfill);
  resume manual dari dashboard. Beta yang dibuka tester secara sporadis
  akan tertidur dalam seminggu. Keep-alive otomatis (ping harian) adalah
  workaround yang harus dinyatakan eksplisit bila dipakai — bukan
  perilaku default.
- **Cloudflare CPU 10 ms:** ini CPU time, bukan wall time — `fetch()`
  dan query D1 yang menunggu network tidak dihitung. Tetapi parsing
  HTML + scoring + validasi kontrak di `checkLink` adalah CPU murni dan
  **belum pernah diukur** terhadap batas 10 ms (NOT VERIFIED). Rantai
  redirect maks 6 hop + RDAP + hingga 3 script fetch dapat menghabiskan
  jatah 50 subrequest dalam satu invocation bila tiap hop dihitung.
- **Tidak ada opsi "lift-and-shift":** tidak satu pun dari Opsi 1–4 yang
  dapat menjalankan repo saat ini tanpa perubahan. Opsi 0 adalah
  satu-satunya zero-port — dan statusnya NOT VERIFIED (T-01).

## 4. Jalur aman terkecil menuju URL HTTPS nyata

**Keputusan: BLOCKED — tidak ada jalur aman terkecil saat ini.**

Urutan minimum yang harus terjadi, tanpa ada yang boleh dilewati:

1. **T-01 terjawab tertulis oleh platform** (Opsi 0 mungkin/tidak) — aksi
   owner. Bila YA: second Hatch space isolated menjadi jalur termurah;
   Bila TIDAK: lanjut ke langkah 2.
2. **Gerbang keamanan G1–G8 lolos** (SSRF, tenant, DB, auth, secrets,
   resource, tests, Link Scanner) — butuh implementasi di branch `dev`
   (backlog `BACKLOG.md` D-01..D-06) + staging + review independen.
   Tanpa ini, URL apa pun yang mengekspos scanner adalah URL yang
   mengekspos kerentanan — dilarang keras oleh direktif beta §B dan V15 §8.
3. **Adapter/port teruji** untuk Opsi 1 (minimal) atau Opsi 2/4
   (re-platform): entry point HTTP, pengganti `ctx.db`/`ctx.inference`,
   migrasi SQLite→target, health check, rollback — dibuktikan di
   environment isolated, BUKAN di VM saja.
4. **Staging tersedia + peran terisi** (`STAGING_READINESS_V2322.md`:
   keenam peran masih UNASSIGNED).
5. Baru setelah 1–4: deployment beta isolated + URL HTTPS + health-check
   evidence + 5–10 tester undangan.

**Yang TIDAK dihitung sebagai "link jadi":** URL repo GitHub, preview
dokumentasi, URL lokal, mockup, halaman landing statis yang
direpresentasikan sebagai scanner (V15 §1 mengizinkan landing statis
terpisah HANYA bila diberi label jujur sebagai informasi, bukan
scanner). Diskusi jalur menuju link sedang berjalan di branch
`discussion-link-jadi` (`MUSE_DISCUSSION_LINK_JADI.md`, commit
`6d743cc`) — **dijawab ChatGPT 2026-11-08 13:47 WIB**
(`GPT_RESPONSE_LINK_JADI.md`, commit `59b02d0`, branch
`discussion-link-jadi`) — lihat §4.1.

### 4.1 Tanggapan ChatGPT atas diskusi link-jadi (2026-11-08 13:47 WIB)

ChatGPT menjawab diskusi `MUSE_DISCUSSION_LINK_JADI.md` dengan
rangking **C/A/D/B** (urutan URL tercepat yang aman — BUKAN urutan
prioritas engineering; D tetap jalur utama produk):

1. **C — static landing page informasional:** jalur tercepat ke URL
   HTTPS yang bisa dibuka; hanya halaman informasi proyek, BUKAN
   scanner/beta aplikasi.
2. **A — verifikasi T-01 Hatch space kedua, paralel:** feasibility
   hosting saja; jangan publikasikan scanner yang gate SSRF-nya FAIL.
3. **D — implementation-first di branch development:** jalur utama
   aplikasi yang benar-benar berfungsi; perbaiki sumber masalah di kode,
   bukan hanya dokumen/harness.
4. **B — owner-only trial:** BUKAN jalan pintas. Tidak boleh menjalankan
   scanner bahkan untuk URL sendiri sebelum F-001 + kontrol resource
   diperbaiki di source, diuji di staging terisolasi, dan ditinjau.
   Gate minimum trial: deployment terisolasi total (DB baru/kosong,
   tanpa data produksi), akses owner-only dengan autentikasi
   terverifikasi sisi server (URL tak diumumkan BUKAN kontrol akses),
   scanner nonaktif di server/API dan tak dapat dipanggil lewat endpoint
   langsung, tanpa wallet/signing/transaksi, tanpa secret produksi,
   fitur hanya alur lokal/non-network, build reproduksibel tanpa
   ketergantungan lokal Hatch, health check + log tanpa secret/PII +
   shutdown/rollback + bukti konfigurasi deployment aktual.

**Definisi "link jadi" (ChatGPT):** pisahkan dua deliverable —
**project link** (URL HTTPS publik: identitas proyek, status, batasan,
cara mengikuti perkembangan; tanpa scan/fetch/wallet; landing page
statis yang jujur memenuhi ini) vs **application trial link** (URL ke
aplikasi berjalan dengan fitur yang dinyatakan tersedia, auth/isolasi
teruji, build reproduksibel, bukti health check + pengujian; bila
scanner nonaktif, halaman harus menyatakan itu — jangan menyebutnya
scanner beta yang berfungsi). Landing page adalah progres nyata menuju
project link, BUKAN penyelesaian permintaan aplikasi yang bisa dicoba.

**T-01 menurut ChatGPT:** Muse memverifikasi (agen dengan akses Hatch),
ChatGPT meninjau bukti; owner bukan perantara. Bukti wajib: identitas
space + runtime, subdomain gratis dapat diakses publik tanpa login
pemilik, akses owner-only sisi server (bila tidak bisa — T-01 tidak
boleh dipakai untuk trial), build/start berhasil dari source yang sama
(versi runtime, dependency, command, exit code, log), URL deployment
benar-benar merespons dari sesi/browser eksternal + apa yang terekspos,
konfirmasi tanpa koneksi DB/secret/layanan produksi + scanner tak dapat
dipanggil. **PASS hosting ≠ PASS keamanan aplikasi.** FAIL bila: butuh
upgrade/biaya, hanya artifact privat, build bergantung path lokal,
atau kontrol akses/isolasi tak dapat dibuktikan.

**Tindak lanjut (ChatGPT §5):** lanjutkan implementation-first di
branch `development` (otorisasi run terpisah — U-99); kerjakan T-01
dan laporkan bukti sesuai kriteria; landing page statis sebagai
artifact terpisah dan informasional (jangan ubah live artifact atau
deployment config tanpa persetujuan terpisah); laporkan tiap klaim
sebagai VERIFIED / NOT VERIFIED / BLOCKED dengan commit/path/command/
exit code/bukti. Dokumen ini TIDAK memberi persetujuan mengaktifkan
Link Scanner, mengubah produksi/`main`, memproses URL eksternal,
mengakses data produksi, atau deployment aplikasi.

## 5. Artefak yang hilang — daftar persis (F-047)

| # | Artefak hilang | Siapa yang dapat menyediakannya | Status |
| --- | --- | --- | --- |
| M-1 | Tarball SDK redistributable yang sah ATAU pernyataan tertulis provider tentang distribusi SDK + kontrak runtime/build (`@hatch/space-sdk` 0.14.0) | Provider Hatch (aksi owner minimal: minta pernyataan/distribusi) | BLOCKED |
| M-2 | Kontrak build client yang dapat direproduksi di luar tooling artifact (atau pernyataan bahwa `buildClient()` memang hanya boleh jalan lewat artifact tooling) | Provider Hatch | BLOCKED — bukti baru U-97 |
| M-3 | Entry point HTTP / server adapter untuk host generik | Implementasi di `dev` (butuh otorisasi run berikutnya) | BLOCKED |
| M-4 | Adapter DB (`ctx.db` → libSQL/Turso atau Postgres/Supabase) + migrasi SQLite→target yang teruji | Implementasi di `dev` | BLOCKED |
| M-5 | Pengganti `ctx.inference` (LLM API berbayar ATAU fallback non-AI eksplisit) | Keputusan owner + implementasi | BLOCKED |
| M-6 | Jawaban tertulis T-01 (second Hatch space publishability) | Platform Hatch via owner | BLOCKED |
| M-7 | Bukti auth/tenant boundary (scope `ctx.db`, identitas principal) | Provider Hatch | NOT VERIFIED |
| M-8 | Staging environment + 6 peran terisi | Owner/provider/ops | BLOCKED |
| M-9 | Klasifikasi non-komersial vs komersial untuk Vercel Hobby | Owner (penafsiran terms) | NOT VERIFIED |
| M-10 | Pengukuran CPU `checkLink` terhadap batas 10 ms Cloudflare | Tes di `dev`/staging setelah port | NOT VERIFIED |

Sampai M-1/M-2 (atau M-6 sebagai pengganti jalur) terpenuhi, status
deployment tetap **BLOCKED**. Tidak ada satu pun artefak di atas yang
boleh dikarang, diasumsikan ada, atau diganti dengan klaim build-only.
