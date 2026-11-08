# DEPLOYMENT FREE TIER — AIRDROP GENERATE (Closed Beta)

**Tanggal:** 2026-11-08 (WIB)
**Status:** Rekomendasi persiapan — **JANGAN deploy sekarang (BLOCKED)**. Dokumen ini berlaku setelah release gate di `CLOSED_BETA_READINESS.md` lolos dan implementasi disetujui terpisah.
**Prinsip:** free tier saja; tanpa custom domain berbayar; tanpa API berbayar; tanpa menganggap filesystem ephemeral sebagai storage durable.

## 1. Rekomendasi ringkas

**Jangan deploy sekarang.** Setelah gate lolos, jalur yang direkomendasikan, berurutan:

1. **Opsi 0 — Second Hatch space (isolated beta).** Satu-satunya opsi zero-port: aplikasi jalan apa adanya dengan database terpisah. **Status: NOT VERIFIED** — apakah Hatch dapat mempublikasikan space kedua di subdomain gratis dengan data terisolasi belum terbukti (blocker T-01 di `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md`). Owner action: jawab T-01 dari platform sebelum memilih jalur lain.
2. **Opsi 1 — Oracle Cloud Always Free VM + adaptasi minimal.** Paling setia pada arsitektur saat ini (Bun + SQLite file + proses long-running + cache in-memory). Butuh: akun Oracle milik owner, VM A1, dan adaptasi minimal (§5). Tanpa free subdomain dari Oracle — butuh DNS gratis (mis. DuckDNS) + TLS Let's Encrypt, atau terowongan Cloudflare (URL ephemeral, tidak stabil untuk beta).
3. **Opsi 2 — Vercel Hobby (Bun) + Turso Free.** Hanya bila re-platform disetujui: ganti lapisan SDK dengan HTTP API, ganti `ctx.db` dengan Drizzle libSQL ke Turso, matikan Gibran atau sediakan LLM key. Cocok untuk jangka panjang, tapi pekerjaannya paling besar setelah Opsi 0/1.
4. **Opsi 3 — Vercel Hobby + Supabase Free.** Port lebih besar (SQLite → Postgres + Auth + RLS). Risiko tambahan: proyek Free **pause setelah 1 minggu tidak aktif** — beta yang dibuka tester secara sporadis akan tertidur. Tidak direkomendasikan sebagai jalur utama.

**Yang ditolak:** Railway Free (kredit $1/bulan — tidak cukup untuk layanan always-on), Fly.io (trial saja, tanpa free tier untuk akun baru), Koyeb (free Starter ditutup untuk pengguna baru awal 2026), Heroku (paid-only sejak Nov 2022), Render Free + SQLite lokal (filesystem ephemeral — data hilang tiap restart; free Postgres kedaluwarsa 30 hari).

## 2. Mengapa aplikasi tidak bisa lift-and-shift

Aplikasi live adalah Hatch space artifact, bukan server mandiri:

- Server actions memakai `@hatch/space-sdk` (`defineAction`, `Ctx`, `ctx.db`, `ctx.inference`) — SDK ini tidak berjalan di host lain (lockfile: `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`, path absolut builder-local).
- Database disediakan runtime (`ctx.db` → SQLite `app.db` di dalam artifact); tidak ada koneksi DB yang dapat dikonfigurasi lewat env var (nol `process.env` di `site/server/src/`).
- AI Gibran memakai `ctx.inference.complete()` dari platform — di host luar butuh LLM API (berbayar) atau dimatikan.
- Tidak ada entry point HTTP, Dockerfile, atau start script (`site/package.json` hanya punya `typecheck` + `build`).
- Cache in-memory (FETCH 10 mnt/maks 50, RDAP 1 jam/maks 100) hanya hidup selama proses berjalan — di serverless, cache hilang tiap cold start (bukan masalah keamanan, tapi perilaku berubah).

Adaptasi minimal yang diperlukan (desain saja, BUKAN implementasi — butuh otorisasi terpisah) ada di §5.

## 3. Matriks kompatibilitas free tier

Limit di bawah dicek via pencarian web 2026-11-08 dari ringkasan dokumentasi resmi provider (sumber tercantum). Limit berubah — verifikasi ulang di halaman resmi provider pada hari keputusan diambil.

| Opsi | Kompatibel dengan app saat ini? | Limit/risiko terkini | Verdict |
|---|---|---|---|
| **0. Second Hatch space** | **Ya, zero-port (by construction)** — runtime sama, DB terpisah | Publishability di subdomain gratis **NOT VERIFIED** (T-01). Biaya $0 bila dapat dipublikasikan | **Tanyakan dulu (T-01)** — jalur termurah bila memungkinkan |
| **1. Oracle Always Free VM** | **Setelah adaptasi minimal (§5)** — Bun + SQLite file jalan di VM; disk persisten (block volume) | A1: **2 OCPU / 12 GB** per dokumentasi saat ini (1.500 OCPU-hours + 9.000 GB-hours/bulan; dipangkas dari 4/24 pada Jun 2026, penegakan tidak konsisten). 200 GB block storage total; egress 10 TB/bulan; 2 AMD micro. Risiko: kapasitas A1 sering habis (`Out of host capacity`); instance idle (<20% CPU/network/memory 7 hari) dapat di-reclaim; tanpa SLA; butuh kartu saat signup; **tanpa free subdomain** | **Direkomendasikan setelah gate lolos** |
| **2. Vercel Hobby + Turso Free** | **Setelah re-platform (§5)** — Bun didukung Vercel Fluid compute (`bunVersion: "1.x"` di `vercel.json`; `Bun.serve` didukung) | Vercel Hobby: $0, **non-komersial personal use saja**; 100 GB Fast Data Transfer/bulan; 10 GB Fast Origin Transfer; 1 juta invokasi fungsi/bulan; 4 CPU-hours; 360 GB-hours; durasi fungsi maks 300 dtk; 1 juta edge request/bulan; build maks 45 mnt; 100 deployment/hari; cron maks 1×/hari; tanpa kartu kredit. Turso Free: $0, tanpa kartu; storage 5 GB; 100 database; 500 juta row read/bulan; 10 juta row write/bulan; 3 GB sync/bulan; DB diarsip setelah 10 hari tidak aktif; query kena BLOCKED bila kuota terlampaui. Angka lama "9 GB / 500 DB / 1 miliar read" sudah stale | **Viable setelah port** |
| **3. Vercel Hobby + Supabase Free** | **Setelah re-platform besar** — migrasi SQLite → Postgres + Auth + RLS | Supabase Free: $0; DB 500 MB; storage file 1 GB; egress 5 GB (+5 GB cached)/bulan; 50 ribu MAU; 500 ribu invokasi Edge Function/bulan; 2 proyek aktif; Nano shared CPU 0,5 GB RAM; 60 koneksi langsung / 200 pooled; **pause setelah 1 minggu tidak aktif**; tanpa backup otomatis; upload maks 50 MB. Vercel: sama seperti Opsi 2 | **Viable, bukan jalur utama** — risiko pause + port terbesar |
| **4. Render Free + Turso** | **Setelah re-platform (§5)** | Render Free: $0, tanpa kartu; 512 MB RAM, 0,1 CPU, 750 instance-hours/bulan/workspace; **sleep setelah 15 mnt idle** (±1 mnt wake); **filesystem ephemeral** (disk persisten berbayar saja); bandwidth 100 GB/bulan (satu sumber sekunder menyebut 5 GB — konflik, verifikasi ulang); tanpa worker/cron di free tier. Free Postgres 1 GB **kedaluwarsa 30 hari** setelah dibuat (+14 hari grace, lalu dihapus) — karena itu Turso tetap dibutuhkan | **Paling lemah** — sleep + disk ephemeral; hanya bila Opsi 0–2 tidak mungkin |
| Railway Free | Tidak | Kredit $1/bulan (tidak cukup untuk layanan always-on); trial $5 sekali (30 hari); Hobby $5/bulan | **Ditolak** |
| Fly.io | Tidak | Tanpa free tier untuk org baru (sejak Okt 2024); trial $1 / 7 hari saja | **Ditolak** |
| Koyeb | Tidak | Free Starter ditutup untuk pengguna baru (awal 2026) | **Ditolak** |
| Heroku | Tidak | Paid-only sejak Nov 2022 | **Ditolak** |

## 4. Variabel environment (nama saja — JANGAN isi nilai di sini)

Nilai diisi owner di pengaturan secret/env provider, tidak pernah di chat/commit/source:

| Nama | Dipakai untuk | Kapan dibutuhkan |
|---|---|---|
| `DATABASE_URL` | Koneksi database (Postgres, bila Opsi 3) | Opsi 3 |
| `TURSO_DATABASE_URL` | URL database Turso (libSQL) | Opsi 2 / 4 |
| `TURSO_AUTH_TOKEN` | Token auth Turso (server saja) | Opsi 2 / 4 |
| `SUPABASE_URL` | URL proyek Supabase | Opsi 3 |
| `SUPABASE_ANON_KEY` | Anon key Supabase (client aman) | Opsi 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server/migrasi SAJA, tidak pernah di frontend) | Opsi 3 |
| `BETA_ACCESS_TOKEN` | Token akses beta (bila beta memakai token bersama) | Semua opsi, bila diputuskan |
| `LLM_API_KEY` | Key LLM eksternal untuk Gibran | Hanya bila owner memutuskan Gibran aktif di beta (default: Gibran dimatikan / fallback non-AI) |
| `BETA_BASE_URL` | URL publik beta (untuk health check + tautan) | Semua opsi |

Aplikasi live saat ini memakai **nol** env var — tabel di atas hanya berlaku untuk deployment beta hasil adaptasi.

## 5. Adaptasi minimal yang diperlukan (desain saja — belum diimplementasikan)

Pekerjaan ini **bukan** otorisasi implementasi. Daftar ini adalah spesifikasi adaptasi terkecil agar aplikasi dapat jalan di luar Hatch:

1. **HTTP entrypoint** — server Bun (`Bun.serve`) yang menyajikan client hasil build + endpoint `POST /api/<action>`; ganti `createActionClient` di client dengan `fetch` biasa.
2. **Lapisan server tanpa SDK** — ganti `defineAction`/`Ctx` dengan handler HTTP tipis yang memanggil fungsi yang sama (`runCheck`, `addProject`, `askGibran`, dst.); `ctx.db` diganti koneksi Drizzle eksplisit (SQLite file lokal untuk Opsi 1; libSQL/Turso untuk Opsi 2/4; Postgres untuk Opsi 3).
3. **Konfigurasi via env** — path file SQLite / URL database / token diambil dari env (nama di §4); tanpa nilai default yang mengarah ke database produksi.
4. **Seed database beta terisolasi** — skrip seed yang membuat database beta kosong + katalog dari migrasi `0001–0005` + perbaikan F-044/F-045/F-046 yang sudah disetujui; tidak menyalin `app.db` produksi.
5. **Gibran di beta** — default **nonaktif**; bila diaktifkan, tampilkan label yang jelas bahwa jawaban berasal dari LLM eksternal + fallback non-AI bila LLM gagal; jangan pernah memalsukan hasil AI.
6. **Kontrol akses beta** — token akses beta (`BETA_ACCESS_TOKEN`) diperiksa di setiap request sebelum action dijalankan; tanpa token, semua action menolak (401).
7. **Rate limiting + batas resource** — batas per-IP dan per-token (angka pasti ditetapkan saat implementasi; desain mengacu pada H-RES-16/17); deadline total 20 dtk + lease DB global (F-041) bila diimplementasikan.
8. **Health-check endpoint** — `GET /health` mengembalikan `{ ok: true, version, commit, db: "ok"|"error" }` tanpa data sensitif; dipakai untuk bukti deployment.
9. **Log terstruktur** — log tanpa URL lengkap yang mengandung token/kredensial, tanpa isi respons AI mentah, tanpa alamat wallet pengguna.

## 6. Langkah deploy (berlaku SETELAH gate lolos + implementasi disetujui)

### Opsi 0 — Second Hatch space (bila T-01 terjawab YA)
1. Owner/provider mengonfirmasi publikasi space kedua di subdomain gratis + data terisolasi.
2. Buat space kedua dari commit yang sama; verifikasi `app.db`-nya kosong/ter-seed beta, bukan salinan produksi.
3. Health check: buka URL publik, verifikasi katalog tampil + `checkLink` berperilaku sesuai gate (atau nonaktif bila diputuskan).
4. Bagikan URL + token hanya ke 5–10 tester.

### Opsi 1 — Oracle Always Free VM
1. Owner membuat akun Oracle Cloud (kartu diperlukan saat signup) + VM `VM.Standard.A1.Flex` (2 OCPU / 12 GB) di region dengan kapasitas tersedia; boot volume ≤ 47 GB; pasang SSH key (dibuat lokal oleh owner).
2. Instal Bun (versi yang sama dengan `packageManager` di `site/package.json`) + Caddy/Nginx sebagai reverse proxy.
3. Atur DNS gratis (mis. DuckDNS) + TLS Let's Encrypt untuk nama host beta.
4. Deploy kode hasil adaptasi (§5) dari commit yang ditandai; jalankan migrasi seed beta; verifikasi `GET /health`.
5. Bagikan URL + token hanya ke tester.

### Opsi 2/3/4 — Vercel / Render + Turso/Supabase
1. Owner membuat akun provider + database (Turso/Supabase) + proyek Vercel/Render yang terhubung ke repo.
2. Isi env var (§4) di pengaturan provider (bukan di repo).
3. Deploy dari branch/commit yang ditandai; jalankan migrasi seed beta; verifikasi health check + katalog.
4. Perhatikan risiko pause (Supabase: 1 minggu idle; Turso: arsip 10 hari idle; Render: sleep 15 mnt) — jadwalkan "keep-alive" manual oleh operator bila beta harus tetap bangun (tindakan operator, bukan otomasi tersembunyi).

## 7. Rollback

- **Sebelum ada deployment:** rollback tidak relevan — jangan publikasikan URL.
- **Setelah deployment beta:** kembalikan ke commit sebelumnya yang ditandai, atau hentikan instance / hapus deployment; cabut `BETA_ACCESS_TOKEN`; hapus database beta bila beta dihentikan.
- **Produksi tidak pernah disentuh** oleh beta — tidak ada rollback produksi dalam rencana ini.

## 8. Cost guardrails ($0)

- Jangan simpan kartu kredit di provider beta bila memungkinkan (Vercel Hobby, Turso Free, Render Free: tanpa kartu; Oracle: kartu wajib saat signup — aktifkan budget alert $0 dan jangan pernah melewati batas Always Free).
- Jangan aktifkan overage/billing otomatis di provider mana pun.
- Bila ada kuota yang terlampaui, layanan berhenti (bukan menagih) — perlakukan itu sebagai sinyal untuk menghentikan beta, bukan untuk upgrade berbayar, kecuali owner memutuskan lain secara eksplisit.
- Periksa pemakaian mingguan selama beta (owner/operator).

## 9. Sumber limit (dicek 2026-11-08)

- Vercel Hobby / Fluid compute + Bun runtime: ringkasan dokumentasi Vercel (vercel.com/docs/limits, vercel.com/docs/project-configuration/vercel-json, bun.com/guides/deployment/vercel), diringkas sumber sekunder Agustus 2026. Verifikasi ulang sebelum keputusan.
- Supabase Free: supabase.com/pricing, diringkas sumber sekunder Oktober 2026.
- Turso Free: turso.tech/pricing, diringkas 2026-08-31 dan dibaca ulang 2026-10-26 (angka lama 9 GB/500 DB/1 miliar read sudah stale).
- Oracle Always Free: dokumentasi OCI Always Free (perubahan Jun 2026: 4 OCPU/24 GB → 2 OCPU/12 GB; penegakan tidak konsisten).
- Render Free: render.com/pricing + Deploy for Free docs, dibaca ulang Oktober 2026 (free Postgres 30 hari + 14 hari grace).
- Railway / Fly.io / Koyeb / Heroku: audit free tier September–Oktober 2026 (bex.co, stackwrite.com, aibizhub.io).
