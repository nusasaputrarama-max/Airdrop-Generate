# PROJECT OVERVIEW — AIRDROP GENERATE (AG-001)

## Produk

**AIRDROP GENERATE** adalah platform Web3 Security Intelligence buatan anak bangsa.
Produk awalnya adalah **Link Scanner**: pengguna menempel sebuah link airdrop/claim,
dan platform memeriksa link itu lalu mengembalikan vonis beserta bukti per sinyal —
bukan sekadar label.

Tagline: **Protect Your Web3 Journey.**

## Masalah yang diselesaikan

1. **Link claim airdrop palsu** adalah vektor penipuan paling umum di komunitas crypto
   Indonesia: halaman yang tampak resmi, meminta connect wallet, lalu menguras aset
   lewat transaksi yang ditandatangani korban.
2. **Tidak ada alat pemeriksa berbahasa Indonesia** yang menjelaskan *kenapa* sebuah
   link berbahaya, dengan bukti yang bisa diperiksa.
3. **Daftar airdrop beredar tanpa verifikasi** — banyak yang sudah sold out, berbayar,
   atau tidak pernah ada kontraknya.

## Target pasar

- **Utama:** pengguna crypto Indonesia — pemburu airdrop, pemegang Agent ID / `.ai`,
  pengguna BSC dan Solana.
- **Bahasa:** Bahasa Indonesia penuh (UI, panduan, asisten Gibran).
- **Tahap awal:** komunitas pemilik sendiri (channel Telegram airdrop) sebagai pengguna
  beta, sebelum peluncuran publik.

## Mesin-mesin produk

Arsitektur produk memisahkan lima mesin agar mudah dikembangkan satu per satu.
**Jangan membangun semuanya sekaligus** — urutan pengembangan ada di
`DEVELOPMENT_ROADMAP.md`.

| # | Mesin | Fungsi | Status (2026-11-07) |
| --- | --- | --- | --- |
| 1 | **Link Scanner** | Risiko URL & domain: fetch halaman, pindai sinyal phishing, umur domain (RDAP), redirect, daftar domain berbahaya, skor per sinyal | **JALAN** — aksi `checkLink` di artifact live; vonis BAHAYA/WASPADA/LEBIH AMAN; riwayat tersimpan |
| 2 | **Contract Analyzer** | Risiko smart contract: format & keberadaan alamat, verifikasi di explorer, pemindaian fungsi berbahaya | **BELUM** — baru validasi *format* alamat (EVM 0x+40 hex, Solana base58 32–44) di dalam Link Scanner. Belum ada analisis bytecode/fungsi |
| 3 | **Wallet Analyzer** | Address intelligence: riwayat alamat, pola drainer/kolektor, saldo & token | **BELUM** — baru dipakai manual lewat RPC saat investigasi insiden 7 Nov 2026 (bukan fitur produk) |
| 4 | **Airdrop Explorer** | Verifikasi proyek airdrop: katalog proyek terverifikasi + status live/upcoming/ended | **JALAN** — katalog 13 proyek, aksi `listProjects`/`addProject`/`setProjectState`; auto-discovery tiap 2 jam dengan aturan ketat |
| 5 | **Security Intelligence Engine** | Risk scoring, threat intelligence, evidence | **SEBAGIAN** — scoring per sinyal + daftar domain drainer terbukti sudah jalan; database threat intelligence terstruktur dan sistem pelaporan komunitas **belum** ada |

## Alur pengguna saat ini (yang sudah live)

1. Pengguna membuka AIRDROP GENERATE → menjelajah katalog airdrop terverifikasi,
   mem-bookmark proyek, menandai status tugas (Belum Dimulai / Sedang Dikerjakan / Selesai).
2. Pengguna menempel link airdrop → Link Scanner memeriksa → vonis + bukti per sinyal
   + riwayat tersimpan.
3. Pengguna bertanya ke **Gibran** (asisten AI di situs) → jawaban hanya dari data situs
   (katalog, riwayat cek, panduan keamanan); Gibran jujur bilang tidak tahu bila
   datanya tidak ada.
4. Setiap 2 jam, cron memantau sumber airdrop baru → proyek yang lolos aturan ketat
   masuk katalog otomatis; yang tidak lolos menjadi draft untuk persetujuan pemilik.

## Data yang dimiliki saat ini (nyata, terverifikasi)

- **Katalog:** 13 proyek (5 live, 1 upcoming, 7 ended per data terakhir) — semua
  dengan kontrak, URL resmi, tanggal verifikasi, dan catatan verifikasi.
- **Riwayat cek link:** tersimpan di database artifact (termasuk 2 kasus pembanding
  yang terverifikasi: `scamsem.solbarn.cc` → BAHAYA skor 100; `binance.com` →
  LEBIH AMAN skor 10).
- **Threat intelligence awal:** 2 domain drainer terbukti — `solbarn.cc` dan
  `sharkmoon.tech` (insiden 7 Nov 2026) — plus 2 alamat wallet drainer Solana
  yang terkonfirmasi on-chain.
- **Tidak ada data pengguna:** belum ada akun, belum ada autentikasi. Bookmark/status
  tugas tersimpan per instalasi artifact, bukan per akun.

## Batasan produk saat ini (jujur)

- **Checker adalah alat saring, bukan vonis mutlak.** Proyek legit yang sangat baru
  bisa kena WASPADA karena domainnya muda (contoh terverifikasi: `ptah.trade/poa`
  → WASPADA 45 karena domain 17 hari + bahasa klaim, padahal proyeknya legit dan
  ada di katalog). Sebaliknya, scam yang rapi bisa lolos.
- **Tidak ada akun pengguna.** Tidak ada login, tidak ada sinkronisasi antar perangkat.
- **Skala terbatas pada artifact runtime.** Migrasi ke Supabase + Vercel diperlukan
  sebelum peluncuran publik (lihat `TECHNICAL_ARCHITECTURE.md`).
- **Kepatuhan SSRF scanner saat ini BELUM terverifikasi** — lihat
  `SECURITY_REQUIREMENTS.md` § SSRF. Jangan berasumsi scanner sudah aman dari SSRF
  sebelum audit itu dilakukan.
