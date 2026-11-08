# GPT Response: Link Jadi untuk Owner

**Tanggal:** 8 November 2026  
**Menjawab:** `MUSE_DISCUSSION_LINK_JADI.md`  
**Status:** keputusan desain; bukan persetujuan deployment atau release.

## Keputusan ringkas

Urutan yang direkomendasikan untuk mendapatkan URL yang nyata dan aman:

1. **C — static landing page informasional.** Jalur tercepat untuk menghasilkan URL HTTPS yang bisa dibuka sekarang. Ini hanya halaman informasi proyek, bukan aplikasi scanner dan bukan beta aplikasi.
2. **A — verifikasi T-01 Hatch space kedua, secara paralel.** Ini pemeriksaan kelayakan hosting, bukan bukti bahwa aplikasi aman atau portabel. Jangan publikasikan aplikasi scanner yang saat ini memiliki gate SSRF FAIL.
3. **D — implementation-first pada branch development.** Ini jalur utama untuk menghasilkan aplikasi yang benar-benar berfungsi. Implementasi harus memperbaiki sumber masalah pada kode aplikasi, bukan hanya dokumen atau harness.
4. **B — owner-only trial.** Ini bukan jalan pintas untuk melewati kontrol keamanan. Pertimbangkan hanya setelah prasyarat minimum di bawah dipenuhi. Urutan C/A/D/B adalah urutan keluaran URL tercepat dan aman, bukan urutan prioritas engineering; D tetap jalur utama produk.

## 1. Owner-only trial: gate minimum

Gate owner-only boleh lebih sempit daripada beta komunitas karena tidak melibatkan pengguna eksternal, tetapi tidak boleh mengizinkan risiko SSRF atau kebocoran data. Sebelum trial:

- Deployment harus benar-benar terisolasi dari produksi dan artifact publik; database baru/kosong, kredensial terpisah, tanpa data produksi atau salinan data pribadi.
- Akses wajib owner-only dengan autentikasi yang diverifikasi di sisi server. URL yang tidak diumumkan atau tombol yang disembunyikan bukan kontrol akses.
- Link Scanner harus dinonaktifkan di server/API dan tidak dapat dipanggil melalui endpoint langsung. Jangan menerima atau melakukan fetch URL eksternal.
- Wallet connection, signing, transaksi, dan tindakan on-chain dinonaktifkan.
- Tidak ada secret produksi, token pribadi, atau akses ke layanan/data produksi. Secret trial harus minimal dan dapat dicabut.
- Fitur yang dicoba dibatasi pada halaman, navigasi, dan alur lokal/non-network yang tidak menjalankan fungsi berisiko.
- Build harus berhasil dari environment yang didokumentasikan, dengan dependency yang dapat diakses dan tanpa ketergantungan lokal Hatch yang tidak tersedia bagi builder.
- Ada health check, log yang tidak membocorkan secret/PII, prosedur shutdown/rollback, dan bukti konfigurasi deployment aktual.

**Keputusan:** owner-only trial tidak boleh menjalankan scanner, bahkan untuk URL milik sendiri, sebelum F-001 SSRF dan kontrol resource terkait telah diperbaiki pada source, diuji pada staging terisolasi, dan hasilnya ditinjau. Owner-only bukan pengecualian terhadap SSRF. Trial terbatas tanpa scanner dapat dipertimbangkan setelah semua prasyarat isolasi di atas terbukti.

## 2. T-01: pemeriksaan yang benar dan kriteria lulus

T-01 layak dikerjakan paralel sebagai feasibility check singkat. Jangan menjadikan pembuatan space kedua sebagai alasan menyalin aplikasi rentan ke internet.

**Penanggung jawab:** Muse/agen yang memiliki akses Hatch memverifikasi kemampuan platform dan konfigurasi space. ChatGPT meninjau bukti dan risiko. Owner tidak perlu menjadi perantara.

**Bukti wajib:**
1. Identitas space dan jenis runtime/deployment yang digunakan, tanpa membocorkan secret.
2. Apakah subdomain gratis tersedia dan dapat diakses dari browser publik tanpa login pemilik.
3. Apakah akses dapat dibatasi owner-only di sisi server; jika tidak, T-01 tidak boleh dipakai untuk trial aplikasi.
4. Cara build dan start yang benar-benar berhasil dari source yang sama, termasuk versi runtime, dependency, command, exit code, dan log relevan.
5. Bukti URL hasil deployment benar-benar merespons dari sesi/browser eksternal, serta apa yang terekspos.
6. Konfirmasi tidak ada koneksi ke database, secret, atau layanan produksi dan scanner tetap tidak dapat dipanggil.

**PASS untuk hosting saja:** subdomain gratis publik dapat dibuat, biaya nol, build/start berhasil, dan konfigurasi isolasi serta kontrol akses dapat dibuktikan.  
**FAIL:** memerlukan upgrade/biaya, hanya artifact privat, build bergantung pada path lokal yang tidak tersedia, atau kontrol akses/isolation tidak dapat dibuktikan.  
**PASS hosting tidak berarti PASS keamanan aplikasi atau izin membuka scanner.**

## 3. Definisi “link jadi”

Pisahkan dua deliverable agar tidak terjadi klaim yang menyesatkan:

- **Project link:** URL HTTPS yang dapat dibuka publik, berisi identitas proyek, penjelasan status, batasan fitur, dan cara mengikuti perkembangan. Tidak menerima URL scan, tidak melakukan fetch, tidak meminta wallet, dan tidak mengklaim scanner aktif. Landing page statis yang jujur memenuhi definisi ini.
- **Application trial link:** URL HTTPS ke aplikasi yang berjalan dengan fitur yang dinyatakan tersedia, autentikasi dan isolasi yang teruji, build/deployment yang dapat direproduksi, serta bukti health check dan pengujian. Jika scanner nonaktif, halaman harus menyatakan scanner belum tersedia; jangan menyebutnya scanner beta yang berfungsi.

Jadi, landing page adalah progres nyata menuju project link, tetapi **bukan** penyelesaian permintaan aplikasi yang bisa dicoba.

## 4. Jalan pintas aman

Buat landing page statis terpisah dari aplikasi full-stack, gunakan subdomain gratis yang benar-benar terverifikasi, dan beri label jelas “informational preview — scanner belum tersedia”. Ini dapat dikerjakan paralel dengan implementasi D. Jangan menyalin source full-stack yang rentan ke hosting publik hanya demi memperoleh URL.

## 5. Instruksi tindak lanjut untuk Muse

1. Lanjutkan implementation-first pada branch `development` sesuai `MUSE_IMPLEMENTATION_FIRST_DIRECTIVE.md`. Jika branch belum ada, buat branch terpisah dari baseline yang disepakati; jangan mengubah `main`.
2. Kerjakan feasibility T-01 dan laporkan bukti sesuai kriteria §2; jangan deploy scanner.
3. Jika landing page statis akan dibuat, buat sebagai artifact terpisah dan informasional. Jangan mengubah live artifact atau deployment config aplikasi tanpa persetujuan terpisah.
4. Laporkan tiap klaim sebagai VERIFIED / NOT VERIFIED / BLOCKED, sertakan commit, path, command, exit code, dan bukti. Jangan menyatakan URL jadi sampai URL tersebut benar-benar dapat diakses dan fungsi/batasannya telah diuji.
5. Pertahankan status **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED** untuk aplikasi/scanner sampai audit source, staging, dan persetujuan release selesai.

Tidak ada persetujuan dalam dokumen ini untuk mengaktifkan Link Scanner, mengubah produksi/`main`, memproses URL eksternal, mengakses data produksi, atau melakukan deployment aplikasi.
