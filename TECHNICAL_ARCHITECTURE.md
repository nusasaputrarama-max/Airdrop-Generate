# TECHNICAL ARCHITECTURE — AIRDROP GENERATE (AG-001)

## 1. Arsitektur saat ini (yang sudah berjalan — jangan dibongkar)

Produk live berjalan sebagai **web artifact fullstack** di hosted runtime:

```
Pengguna (browser)
  └─ Web artifact "cek-link-airdrop"  (TypeScript, hosted runtime)
       ├─ UI: katalog, Link Scanner, dashboard, chat Gibran
       ├─ Server actions:
       │    ├─ checkLink        — fetch + pindai halaman, RDAP, skor per sinyal
       │    ├─ listChecks / deleteCheck
       │    ├─ listProjects / addProject (aturan ketat di dalam aksi)
       │    ├─ setProjectState  — bookmark + status tugas
       │    └─ askGibran        — asisten AI berbasis data situs
       └─ Database: SQLite + Drizzle
            ├─ projects        (13 baris, katalog terverifikasi)
            ├─ checks          (riwayat pemeriksaan link)
            └─ saved_projects  (bookmark + status tugas)
  └─ Cron 2 jam (di luar artifact)
       └─ Riset airdrop baru → verifikasi ketat → addProject / draft
```

**Karakteristik arsitektur saat ini:**

- Server actions berjalan di runtime artifact; tidak ada server yang dikelola sendiri.
- Database SQLite tertanam di artifact (durable lewat migrasi Drizzle, termasuk
  migrasi seed katalog permanen `0004` dan migrasi terjemahan `0005`).
- Tidak ada autentikasi pengguna; tidak ada API key eksternal yang dipakai.
- Link Scanner melakukan fetch terhadap URL yang ditempel pengguna (server-side).

## 2. Arsitektur target

```
Pengguna (browser)
  └─ Next.js (Vercel)
       ├─ App Router + React Server Components
       ├─ Tailwind CSS + shadcn/ui
       ├─ Halaman: Explorer, Scanner, Dashboard, Guide, About
       └─ API Routes (Next.js API)
            ├─ POST /api/scan            — Link Scanner
            ├─ GET  /api/projects        — Airdrop Explorer
            ├─ POST /api/projects        — tambah proyek (admin/otomasi)
            ├─ GET  /api/threats         — threat intelligence
            ├─ POST /api/reports         — pelaporan komunitas
            └─ POST /api/assistant       — Gibran
  └─ Supabase (PostgreSQL + Auth + Storage)
       ├─ Tabel: users, scanned_urls, domains, threat_intelligence,
       │         security_reports, airdrop_projects, scan_history
       └─ Row Level Security (RLS) aktif di semua tabel
  └─ GitHub (version control) → Vercel (CI/CD otomatis dari main)
  └─ Cron / Edge Functions — auto-discovery 2 jam (pengganti cron saat ini)
```

## 3. Alasan teknis tiap pilihan stack target

| Pilihan | Alasan | Alternatif yang dipertimbangkan |
| --- | --- | --- |
| **Next.js (App Router)** | Satu codebase untuk frontend + API; React Server Components menjaga secret tetap di server; routing file-based rapi untuk 5 mesin | Remix (bagus, tapi ekosistem shadcn + Vercel lebih matang untuk Next.js) |
| **TypeScript** | Type-safety di seluruh alur scan → skor → vonis; mencegah bug klasifikasi akibat tipe longgar; sudah dipakai di artifact saat ini | JavaScript biasa (ditolak: risiko bug diam-diam di mesin scoring) |
| **Tailwind CSS + shadcn/ui** | Styling cepat + komponen aksesibel yang sudah teruji; tema dark + aksen emas brand mudah dipertahankan | CSS murni / MUI (lebih lambat, bundle lebih besar) |
| **Supabase PostgreSQL** | Postgres terkelola + Auth + RLS tanpa mengelola server DB; migrasi dari SQLite/Drizzle dapat dilakukan bertahap karena skema sudah relasional | Neon/PlanetScale (juga layak; Supabase dipilih karena Auth + RLS satu paket) |
| **Supabase Auth** | Login email/OAuth tanpa membangun auth sendiri; RLS mengikat data pengguna ke `auth.uid()` | Auth.js/Clerk (layak; ditunda sampai kebutuhan akun benar-benar ada) |
| **Vercel** | Deploy otomatis dari GitHub; Edge Functions untuk cron; cocok dengan Next.js | VPS sendiri / Fly.io (lebih banyak pekerjaan operasional) |
| **GitHub** | Version control + review + CI; wajib sebelum ada kontributor lain | GitLab (setara; GitHub dipilih karena integrasi Vercel paling mulus) |

**Catatan:** stack target adalah rekomendasi awal. Perubahan stack memerlukan
persetujuan pemilik bila ada alasan teknis yang kuat — jangan mengganti diam-diam.

## 4. Rencana migrasi bertahap (tanpa membongkar produk yang jalan)

Prinsip: **artifact yang live tetap menjadi produk sampai penggantinya terbukti
berjalan.** Tidak ada "big bang rewrite".

| Tahap migrasi | Pekerjaan | Produk live |
| --- | --- | --- |
| **M0 — Fondasi (sekarang)** | Dokumen ini + kerangka `src/` + skema target. Repo GitHub dibuat. | Tetap artifact |
| **M1 — Repo + CI** | Inisialisasi Next.js + TypeScript + Tailwind + shadcn di repo; Vercel preview deploy; pipeline lint/typecheck/test. | Tetap artifact |
| **M2 — Database** | Proyek Supabase; jalankan migrasi skema target; **impor data nyata** dari artifact (13 proyek katalog + riwayat cek + daftar domain drainer) lewat skrip migrasi — bukan data dummy. | Tetap artifact |
| **M3 — Link Scanner di Next.js** | Port `checkLink` ke `POST /api/scan` dengan **aturan SSRF penuh** (lihat `SECURITY_REQUIREMENTS.md`); uji paralel: bandingkan hasil scan artifact vs Next.js pada 3 URL pembanding yang sama (scamsem, binance, ptah). Lolos bila vonis sama. | Tetap artifact; Next.js sebagai staging |
| **M4 — Explorer + Gibran** | Port katalog + `askGibran` ke Next.js; uji paralel daftar proyek. | Tetap artifact; staging makin lengkap |
| **M5 — Cutover** | DNS/domain diarahkan ke Vercel **hanya setelah** semua uji paralel lolos dan pemilik menyetujui. Artifact lama dipertahankan sebagai cadangan sampai 30 hari. | **Beralih ke Next.js** |
| **M6 — Auth + komunitas** | Supabase Auth, pelaporan komunitas, dashboard per pengguna. | Next.js |

### Aturan migrasi data

- Hanya data **nyata dan terverifikasi** yang dimigrasi (katalog 13 proyek, riwayat
  cek, daftar drainer). Tidak ada baris dummy.
- Setiap baris yang dimigrasi membawa `verified_at` dan `verified_note` aslinya.
- Skrip migrasi harus idempotent (bisa dijalankan ulang tanpa duplikat) — pola yang
  sama dengan migrasi seed `0004` di artifact (`WHERE NOT EXISTS`).

## 5. Struktur folder target (dicerminkan di `src/` paket ini)

```
src/
├── scanner/        # Link Scanner: fetch aman, sinyal, redirect, skor
├── intelligence/   # Risk scoring, threat intel, klasifikasi 4 tingkat
├── contract/       # Contract Analyzer (Phase 4)
├── wallet/         # Wallet Analyzer (Phase 4)
├── db/             # Klien + skema database (Drizzle/Supabase)
├── api/            # Handler rute API (Next.js API Routes)
├── ui/             # Komponen UI (shadcn/ui + komponen brand)
└── lib/            # Config, logger, error, validasi
```

Detail tiap modul dan status implementasinya ada di komentar header masing-masing
file stub. **Semua file di `src/` saat ini adalah kerangka (stub)** — bukan fitur
yang sudah jadi. File stub yang meniru fitur jadi adalah pelanggaran aturan proyek.

## 6. Keputusan arsitektur yang masih terbuka

| Keputusan | Opsi | Rekomendasi awal |
| --- | --- | --- |
| Domain publik | Beli domain sendiri vs subdomain gratis | Domain sendiri (`airdropgenerate.id` atau sejenis) sebelum launch — diputuskan pemilik |
| Model AI Gibran | Tetap memakai model yang sama vs model khusus | Tetap dulu; evaluasi biaya setelah traffic beta |
| Threat intel eksternal | API berbayar (mis. Chainabuse, Etherscan API) vs kurasi manual | Kurasi manual dulu; API eksternal hanya bila ada anggaran + API key pemilik |
| Rate limiting | Upstash Redis vs middleware in-memory | In-memory dulu (Vercel), Redis bila abuse nyata terjadi |
