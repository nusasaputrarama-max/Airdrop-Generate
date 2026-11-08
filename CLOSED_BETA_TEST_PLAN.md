# CLOSED BETA TEST PLAN — AIRDROP GENERATE

**Tanggal:** 2026-11-08 (WIB)
**Status:** Rencana — hanya berlaku SETELAH semua release gate di `CLOSED_BETA_READINESS.md` lolos dan URL beta diterbitkan. Saat ini: **BLOCKED, tidak ada tester yang diundang.**
**Cakupan:** 5–10 tester undangan, akses terkontrol (token akses beta — mekanisme belum ada, OWNER ACTION REQUIRED).

## 1. Protokol tester

1. Owner mengundang 5–10 tester dan membagikan URL beta + token akses melalui kanal pribadi (bukan kanal publik).
2. Tester memakai perangkat/browsers sendiri; tidak perlu akun apa pun bila beta tanpa auth (keputusan auth masih terbuka — lihat §5).
3. Tester mencatat setiap temuan dengan format di §6 dan mengirimkannya ke kanal dukungan yang disediakan owner.
4. Durasi beta yang diusulkan: 7–14 hari, lalu evaluasi go/no-go sebelum membuka akses lebih luas.
5. Tester dilarang membagikan URL beta, token akses, tangkapan layar berisi data tester lain, atau tautan hasil cek ke pihak luar.

## 2. Skenario pengujian

| # | Skenario | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| S1 | Jelajahi katalog | Buka halaman utama; gulir katalog; buka kartu detail 3 proyek (live, upcoming, ended) | Katalog tampil lengkap (15 proyek saat penulisan rencana); detail konsisten dengan kartu; tidak ada data dummy |
| S2 | Cari + filter proyek | Gunakan pencarian dan filter kategori/segment | Hasil sesuai query; proyek ended tetap tampil dengan label yang benar, bukan sebagai live |
| S3 | Bookmark + status tugas | Tandai 1 proyek sebagai bookmark; ubah status tugas not_started → in_progress → completed | Status tersimpan dan bertahan setelah refresh; hanya status tester itu yang berubah (bila isolasi per-tester diterapkan — bila belum, catat sebagai temuan) |
| S4 | Cek link aman | Tempel URL proyek resmi yang dikenal (mis. `binance.com`) ke fitur cek link | Hasil: LEBIH AMAN dengan skor rendah + sinyal yang dapat dijelaskan |
| S5 | Cek link berbahaya (known-bad) | Tempel domain drainer yang sudah terkonfirmasi (daftar diberikan owner saat beta — JANGAN menebak domain sendiri) | Hasil: BAHAYA dengan skor 100 + alasan yang jelas |
| S6 | Cek link redirect | Tempel URL yang me-redirect 1–2 hop ke domain yang dikenal | Hasil mencantumkan rantai redirect; vonis mengikuti hop final yang terverifikasi |
| S7 | Riwayat cek | Lakukan 2–3 cek, lalu buka riwayat; hapus 1 entri | Riwayat mencatat cek dengan benar; entri yang dihapus hilang dan tidak kembali setelah refresh |
| S8 | Tanya Gibran | Tanyakan 3 hal: (a) proyek di katalog, (b) cara memakai cek link, (c) hal di luar data situs | (a)(b) dijawab dari data situs; (c) Gibran jujur bilang tidak tahu + mengarahkan ke sumber resmi. Bila Gibran dalam mode fallback non-AI, jawaban harus menyatakan itu secara eksplisit |
| S9 | Cek link tidak valid | Tempel teks bukan URL, URL tanpa skema, dan URL yang tidak dapat dijangkau | Pesan error yang jelas dan aman (tanpa stack trace / detail internal) |
| S10 | Beban ringan | 5 tester memakai beta bersamaan selama 30 menit | Tidak ada error massal; waktu respons tetap wajar; tidak ada data tester lain yang bocor ke tester lain |

## 3. Yang DILARANG (input/aksi terlarang bagi tester)

- **DILARANG** menghubungkan wallet apa pun (dompet asli maupun dompet berisi dana) ke situs beta atau ke tautan apa pun yang diperiksa.
- **DILARANG** memasukkan seed phrase, private key, kata sandi, atau menandatangani transaksi apa pun.
- **DILARANG** memeriksa URL internal/metadata (`localhost`, `127.0.0.1`, `169.254.169.254`, `metadata.google.internal`, IP privat, `file://`, `ftp://`) atau URL yang mengarah ke infrastruktur pribadi.
- **DILARANG** menguji dengan URL berisi kredensial, token, atau data pribadi (mis. tautan reset password, tautan undangan privat).
- **DILARANG** melakukan pengujian beban otomatis, scraping massal, pemindaian port, atau percobaan injeksi (SQLi/XSS/SSRF) — beta ini bukan bug bounty.
- **DILARANG** memasukkan data pribadi asli (nama lengkap, alamat, nomor telepon, KTP) ke kolom apa pun.
- **DILARANG** membagikan URL/token beta ke luar kelompok tester.
- Pelanggaran atas larangan ini = dikeluarkan dari beta; temuan yang diperoleh dengan cara terlarang tidak diterima sebagai laporan bug yang valid.

## 4. Retensi dan penghapusan data

- Database beta **terisolasi** dari database produksi — tidak ada data produksi yang disalin ke beta.
- Data yang dibuat tester selama beta (riwayat cek, bookmark, status tugas) hanya dipakai untuk evaluasi beta.
- Saat beta berakhir: database beta **dihapus seluruhnya**; owner mengonfirmasi penghapusan secara tertulis di `RELEASE_EVIDENCE.md`.
- Tester dapat meminta penghapusan data yang mereka buat kapan pun selama beta (sampaikan ke kanal dukungan).
- Tidak ada data tester yang dibagikan ke pihak ketiga atau dipakai untuk tujuan lain.

## 5. Asumsi terbuka (harus diputuskan sebelum beta dibuka)

1. **Auth:** apakah beta memakai token akses bersama, akun per-tester, atau tanpa auth sama sekali? Tanpa auth, isolasi antar-tester tidak dapat dijamin (S3/S10) — keputusan owner.
2. **Gibran:** mode LLM penuh (butuh key dari owner via provider secret settings) atau mode fallback non-AI yang diungkapkan? Default: **fallback non-AI / dimatikan**.
3. **checkLink di beta:** dibuka atau dimatikan? Hanya boleh dibuka bila gate SSRF (G1) lolos di staging. Bila belum, beta hanya menguji katalog + Gibran.
4. **Kanal dukungan tester:** belum disediakan owner (OWNER ACTION REQUIRED).
5. **Jadwal beta:** tanggal mulai/berakhir belum ditetapkan (tergantung gate).

## 6. Format laporan bug

```
Judul: [Singkat, spesifik]
Skenario: S# (atau "di luar skenario")
Langkah reproduksi:
  1. ...
  2. ...
Hasil yang diamati:
Hasil yang diharapkan:
URL beta yang dipakai:
Waktu (WIB):
Perangkat/browser:
Tangkapan layar (bila ada, tanpa data tester lain):
```

## 7. Definisi severity

| Level | Arti | Contoh | Respons |
|---|---|---|---|
| **S0 — Blocker** | Beta harus dihentikan; data/keamanan terancam | Data tester lain terlihat; `checkLink` mengembalikan data internal; Gibran meminta seed phrase | Hentikan beta segera; cabut akses; laporkan ke owner dalam 1 jam |
| **S1 — Kritis** | Fitur inti tidak berfungsi / hasil salah secara berbahaya | Link berbahaya dinilai AMAN; katalog menampilkan proyek palsu sebagai terverifikasi; penghapusan riwayat gagal total | Perbaiki sebelum beta lanjut; beri tahu semua tester |
| **S2 — Mayor** | Fitur rusak tapi ada jalan lain | Filter tidak berfungsi; Gibran mengarang proyek; riwayat tidak tersimpan | Masuk backlog beta; perbaiki sebelum go/no-go |
| **S3 — Minor** | Kosmetik / teks / UX | Typo; label tidak konsisten; layout rusak di layar kecil | Catat; perbaiki bila sempat sebelum rilis |

## 8. Kriteria go / no-go setelah beta

- **GO** (lanjut ke rilis terbatas): nol temuan S0/S1 yang belum diperbaiki; semua skenario S1–S10 lolos; tidak ada kebocoran data antar-tester; gate G1–G8 tetap lolos.
- **NO-GO** (beta diperpanjang atau dihentikan): ada S0/S1 yang belum diperbaiki; atau kebocoran data; atau gate keamanan gagal saat beta berjalan.
