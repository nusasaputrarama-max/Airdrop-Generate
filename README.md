# AIRDROP GENERATE — Project Foundation (AG-001)

> **Protect Your Web3 Journey.**
> Platform Web3 Security Intelligence buatan anak bangsa untuk membantu masyarakat
> Indonesia mengidentifikasi penipuan airdrop, phishing, malicious link, dan ancaman
> dalam ekosistem cryptocurrency.

## Status dokumen (terverifikasi 2026-11-08)

| Item | Status |
| --- | --- |
| Tanggal fondasi | 2026-11-07 |
| Tahap | Foundation (Phase 1) |
| Produk yang sudah jalan | Web artifact fullstack `cek-link-airdrop` (lihat § Status saat ini) |
| Repo GitHub | **ADA** — publik `nusasaputrarama-max/Airdrop-Generate`, branch `main` (terverifikasi 2026-11-08; repo ini) |
| Supabase | **Belum ada** — belum ada proyek yang terverifikasi (NOT VERIFIED, 2026-11-08); butuh kredensial pemilik |
| Vercel | **Belum ada** — belum ada akun/proyek yang terverifikasi (NOT VERIFIED, 2026-11-08); butuh akun + keputusan pemilik |

## Status saat ini — empat artefak yang berbeda (baca dulu)

Agar tidak tertukar, dokumen ini membedakan empat hal yang sering
dicampuradukkan. Setiap pernyataan di bawah membawa tanggal verifikasi
atau label NOT VERIFIED eksplisit (rekonsiliasi F-048, 2026-11-08).

| # | Artefak | Status (2026-11-08) | Bukti |
| --- | --- | --- | --- |
| 1 | **Live Hatch artifact** — website AIRDROP GENERATE yang sudah berjalan (slug `cek-link-airdrop`, v15) | **LIVE** sebagai web artifact Hatch (bukan deployment standalone). URL publik/digest artifact: **NOT VERIFIED** — artifact tidak di-share publik, tidak ada public link | `site/space.json` (`runtime: "typescript"`, `platformVersion: 28`); `site/README.md` |
| 2 | **Mirror/source repo** — repo ini | **ADA** — publik, branch `main`, berisi mirror source `site/` + dokumen desain + bukti | Repo ini sendiri; `git log` |
| 3 | **Migration foundation package** — paket dokumen + kerangka ini | **ADA** — dokumentasi + kerangka kode modular (`src/`), bukan aplikasi yang di-deploy | Dokumen dalam paket ini (lihat tabel di bawah) |
| 4 | **Deployment standalone masa depan** (Vercel/Supabase/Cloudflare/dll.) | **BELUM ADA — BLOCKED** (lihat `DEPLOYMENT_FEASIBILITY_V2322.md`: clean-clone build gagal tanpa SDK Hatch; tidak ada entry point HTTP; gates keamanan belum lolos) | `DEPLOYMENT_FEASIBILITY_V2322.md` §2–§5; `SSRF_RESPONSE_MATRIX_V2322.md` |

**Batas yang mengikat:** situs live (artefak 1) TIDAK diubah dengan
mengedit repo ini (artefak 2/3). Perubahan live hanya lewat artifact
tools Muse, lalu mirror di-sync ulang. Sebaliknya, dokumen desain di
repo ini TIDAK otomatis berarti situs live berubah.

**Prinsip paket ini:** fondasi ini mendokumentasikan apa yang *sudah berjalan* sebagai
basis yang nyata, dan merancang migrasi ke stack target secara bertahap **tanpa membongkar**
produk yang sudah live. Tidak ada fitur palsu, tidak ada data dummy yang disajikan
sebagai data asli, dan tidak ada hasil scan yang dikarang di paket ini.

## Visi

Masyarakat Indonesia bisa memeriksa sebuah link airdrop *sebelum* menghubungkan wallet,
dengan hasil pemeriksaan yang punya dasar, waktu pemeriksaan, sumber intelijen, dan
keterbatasan analisis yang jelas — bukan sekadar label "aman" atau "scam".

Latar belakang nyata: pembuat platform kehilangan aset pada 7 November 2026 karena
sebuah halaman claim airdrop palsu (`scamsem.solbarn.cc`) yang mengarahkan ke
`sharkmoon.tech` dan menguras wallet Solana-nya. Kedua domain itu kini tercatat
sebagai domain drainer terbukti dan selalu dicap BAHAYA oleh Link Scanner.

## Yang sudah berjalan hari ini (fondasi yang nyata)

Website **AIRDROP GENERATE** sudah live sebagai web artifact fullstack (slug
`cek-link-airdrop`, TypeScript, database SQLite/Drizzle):

- **Link Scanner** — aksi `checkLink`: fetch halaman, pindai permintaan connect-wallet,
  kode signing, alamat kontrak, bahasa iming-iming, kode tersamar; umur domain via RDAP;
  redirect diikuti hop demi hop (maks 6); daftar domain drainer terbukti
  (`solbarn.cc`, `sharkmoon.tech`); validasi format alamat kontrak EVM/Solana; skor
  per sinyal dengan bukti. Riwayat tersimpan (`listChecks`, `deleteCheck`).
- **Airdrop Explorer** — katalog 15 proyek terverifikasi di live artifact
  (`listProjects`, `addProject` dengan aturan ketat anti-duplikat,
  `setProjectState` untuk bookmark/status tugas). Catatan: seed repo
  `site/drizzle/0004` berisi 12 baris — perbedaan repo-vs-live dicatat
  jujur sebagai U-87 (lihat matriks v2.3.21 §5); jumlah live
  terverifikasi via `listProjects` 2026-11-08 13:20 WIB.
- **Asisten AI Gibran** — aksi `askGibran`: menjawab hanya dari data situs (katalog,
  riwayat cek, panduan keamanan), jujur bilang tidak tahu bila datanya tidak ada.
- **Otomasi 2 jam** — cron memantau sumber airdrop baru dan auto-add proyek yang lolos
  aturan ketat; yang tidak lolos menjadi draft untuk persetujuan pemilik.
- **Branding** — Bahasa Indonesia penuh, identitas "Dibangun oleh anak bangsa
  Indonesia", logo resmi (emas `#F0B90B` di atas gelap `#0B0E11`).

Vonis saat ini 3 tingkat: **BAHAYA / WASPADA / LEBIH AMAN**. Pemetaan ke sistem
klasifikasi 4 tingkat target ada di [`CLASSIFICATION.md`](CLASSIFICATION.md).

## Dokumen dalam paket ini

| Dokumen | Isi |
| --- | --- |
| `README.md` | Dokumen ini — visi, status, cara menjalankan |
| `PROJECT_OVERVIEW.md` | Produk, target pasar, status tiap mesin |
| `TECHNICAL_ARCHITECTURE.md` | Arsitektur saat ini + arsitektur target + rencana migrasi |
| `DATABASE_SCHEMA.md` | Skema saat ini (SQLite) + skema target (PostgreSQL) |
| `DEVELOPMENT_ROADMAP.md` | Phase 1–5 dengan status jujur per item |
| `SECURITY_REQUIREMENTS.md` | Standar keamanan + aturan SSRF + status kepatuhan jujur |
| `CLASSIFICATION.md` | Sistem klasifikasi 4 tingkat + pemetaan dari vonis saat ini |
| `src/` | Kerangka kode modular (stub yang ditandai jelas, bukan fitur jadi) |
| `scripts/check-env.sh` | Pemeriksaan environment (node, npm, git, python, internet) |

## Cara menjalankan / memeriksa paket ini

Paket ini adalah **dokumentasi + kerangka**, bukan aplikasi yang di-deploy.
Tidak ada server yang perlu dijalankan. Ini berbeda dengan artifact live
(artefak 1 di § Status saat ini) — artifact live berjalan di runtime
Hatch, bukan dari paket ini.

```bash
# 1. Periksa environment
bash scripts/check-env.sh

# 2. Periksa kerangka TypeScript terkompilasi (tanpa dependensi eksternal)
npx -y -p typescript@5 tsc --noEmit -p tsconfig.json

# 3. Baca dokumen sesuai kebutuhan — mulai dari PROJECT_OVERVIEW.md
```

> Catatan: perintah `npx typescript` mengunduh paket TypeScript sementara dari npm
> registry. Tidak ada dependensi yang diinstal permanen di paket ini.

## Stack target (keputusan awal, bisa diubah dengan persetujuan pemilik)

| Komponen | Teknologi |
| --- | --- |
| Frontend | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (tahap berikutnya) |
| Deployment | Vercel |
| Version control | GitHub |

Alasan teknis tiap pilihan dan rencana migrasi bertahap ada di
[`TECHNICAL_ARCHITECTURE.md`](TECHNICAL_ARCHITECTURE.md).

## Yang dibutuhkan dari pemilik sebelum migrasi ke stack target

Tidak ada kredensial yang dibuat dalam paket ini. Sebelum Phase 1 (migrasi) bisa
dijalankan, pemilik harus menyediakan:

1. **Akun GitHub** — repository `airdrop-generate` (publik/privat sesuai keputusan pemilik).
2. **Proyek Supabase** — URL proyek + anon key + service-role key (service-role key
   hanya disimpan di server, tidak pernah di frontend).
3. **Akun Vercel** — terhubung ke repo GitHub, dengan environment variables dari Supabase.
4. Keputusan: apakah autentikasi pengguna (Supabase Auth) masuk Phase 1 atau ditunda
   ke Phase 3.

Sampai keempat hal itu ada, produk yang sudah live **tetap berjalan** di artifact
runtime dan tidak boleh dibongkar.

## Aturan pengerjaan (mengikat semua fase)

- Jangan membuat fitur palsu atau data dummy seolah-olah data asli.
- Jangan mengarang hasil security scan.
- Jangan menyimpan API key / secret di frontend atau di repository.
- Jangan pernah menyatakan suatu link 100% aman hanya karena tidak ditemukan ancaman.
- Setiap hasil pemeriksaan harus punya: dasar pemeriksaan, waktu pemeriksaan,
  sumber intelijen, dan keterbatasan analisis.
- Domain baru bukan otomatis scam. Tidak masuk blacklist bukan berarti aman.
  Kontrak terverifikasi bukan otomatis bebas fungsi berbahaya. Banyaknya pengguna
  bukan bukti legitimasi.
