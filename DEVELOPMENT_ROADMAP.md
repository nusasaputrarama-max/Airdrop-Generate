# DEVELOPMENT ROADMAP — AIRDROP GENERATE (AG-001)

Status jujur per 2026-11-07. Legenda: ✅ Selesai · 🔄 Berjalan · ⏳ Belum ·
⚠️ Butuh keputusan/kredensial pemilik.

## Phase 1 — Foundation

| # | Item | Status | Catatan |
| --- | --- | --- | --- |
| 1.1 | Arsitektur ditentukan (saat ini + target) | ✅ | `TECHNICAL_ARCHITECTURE.md` |
| 1.2 | Repository GitHub disiapkan | ⏳⚠️ | Butuh akun GitHub pemilik |
| 1.3 | Project Next.js dibuat | ⏳ | Setelah 1.2; kerangka `src/` di paket ini adalah persiapan, bukan project Next.js jadi |
| 1.4 | Supabase terhubung | ⏳⚠️ | Butuh proyek + kredensial Supabase pemilik |
| 1.5 | Struktur folder + dokumentasi | ✅ | Paket ini |
| 1.6 | Skema database awal | ✅ | `DATABASE_SCHEMA.md` (skema saat ini + target) |
| 1.7 | Klasifikasi 4 tingkat + pemetaan | ✅ | `CLASSIFICATION.md` |
| 1.8 | Standar keamanan + aturan SSRF | ✅ | `SECURITY_REQUIREMENTS.md` (termasuk status kepatuhan jujur) |
| 1.9 | Environment diperiksa | ✅ | Node v24.22.1, npm 10.9.4, git 2.43.0, Python 3.12.3, internet OK (2026-11-07) |

**Target akhir Phase 1:** fondasi siap dikembangkan, dokumentasi lengkap, struktur
kode rapi. **Belum tercapai penuh** — 1.2 dan 1.4 menunggu pemilik.

## Phase 2 — Link Scanner MVP

| # | Item | Status | Catatan |
| --- | --- | --- | --- |
| 2.1 | Input URL + validasi domain | ✅ | Sudah jalan di artifact (`checkLink`) |
| 2.2 | Deteksi phishing (sinyal halaman) | ✅ | Connect-wallet, signing, iming-iming, obfuscation |
| 2.3 | Pemeriksaan redirect | ✅ | Hop demi hop, maks 6, rantai dicatat sebagai bukti |
| 2.4 | Integrasi threat intelligence | 🔄 | Daftar drainer terbukti jalan; DB threat intelligence terstruktur belum (Phase 3) |
| 2.5 | Hasil + alasan (bukti per sinyal) | ✅ | Tiap sinyal mencantumkan dampak skor |
| 2.6 | Aturan SSRF penuh di scanner | ⏳⚠️ | Status kepatuhan saat ini BELUM terverifikasi — audit dulu, lihat `SECURITY_REQUIREMENTS.md` |
| 2.7 | Port scanner ke Next.js API + uji paralel | ⏳ | Bagian dari migrasi M3 |
| 2.8 | Klasifikasi 4 tingkat diterapkan di UI | ⏳ | Vonis saat ini masih 3 tingkat; pemetaan sudah ada |

**Target akhir Phase 2:** scanner MVP di Next.js dengan hasil yang sama dengan
artifact pada URL pembanding, plus SSRF guard yang teruji.

## Phase 3 — Security Intelligence

| # | Item | Status | Catatan |
| --- | --- | --- | --- |
| 3.1 | Risk scoring engine (terstruktur) | 🔄 | Scoring per sinyal jalan; engine terpisah + bobot terdokumentasi belum |
| 3.2 | Database domain berbahaya | ⏳ | Skema `threat_intelligence` sudah dirancang; data awal 4 indikator terverifikasi |
| 3.3 | Riwayat pemeriksaan | ✅ | `checks`/`scan_history` jalan di artifact |
| 3.4 | Sistem pelaporan komunitas | ⏳ | Skema `security_reports` sudah dirancang; butuh Auth dulu |
| 3.5 | Supabase Auth | ⏳⚠️ | Butuh keputusan pemilik: masuk Phase 1 atau Phase 3 |

## Phase 4 — Web3 Analysis

| # | Item | Status | Catatan |
| --- | --- | --- | --- |
| 4.1 | Smart contract analyzer | ⏳ | Baru validasi format alamat; belum ada analisis fungsi/bytecode |
| 4.2 | Wallet risk analyzer | ⏳ | Baru investigasi manual via RPC (insiden 7 Nov 2026) |
| 4.3 | Pemeriksaan proyek airdrop (mendalam) | 🔄 | Katalog + auto-discovery ketat jalan; pemeriksaan on-chain per proyek belum otomatis |

## Phase 5 — Launch

| # | Item | Status | Catatan |
| --- | --- | --- | --- |
| 5.1 | Security testing | ⏳ | Checklist di `SECURITY_REQUIREMENTS.md` § Pengujian; audit eksternal belum dijadwalkan |
| 5.2 | Performance testing | ⏳ | Belum ada; baru setelah M5 (cutover) |
| 5.3 | Deployment (Vercel) | ⏳⚠️ | Butuh akun Vercel pemilik |
| 5.4 | Beta testing bersama komunitas Indonesia | ⏳ | Calon: channel Telegram airdrop pemilik |

## Prinsip urutan

- **Target pertama bukan meluncurkan website secepat mungkin.** Target pertama
  adalah fondasi yang tidak perlu dibongkar ketika pengguna mulai bertambah.
- Jangan membangun empat mesin sekaligus. Mulai dari Link Scanner, dengan
  arsitektur yang memungkinkan integrasi mesin lain nanti.
- Setiap fase berakhir dengan sesuatu yang **dapat diuji** — bukan sekadar dokumen.
