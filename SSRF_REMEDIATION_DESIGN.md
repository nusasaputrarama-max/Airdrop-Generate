# RANCANGAN PERBAIKAN SSRF — Link Scanner Live AIRDROP GENERATE (AG-001)

- **Tanggal:** 7 November 2026 — **Revisi v2.3.5 (7 November 2026)**
- **Status dokumen:** RANCANGAN v2.3.5 (design-only) — **DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED** (status ini TIDAK berubah oleh revisi ini)
- **Bukti uji v2.3.4:** `SSRF_SPIKE_V234.md` (race TERBUKTI pada kode v2.3.3 — ADV-T1: 2 pemilik, 3/3 × 2; perbaikan flock TERUJI — ADV-T2/T2sim/T5/T6: 4/4 × 2; semantik flock kernel TERUJI — FLK-T1..T8: 9/9 × 2 tmpfs, 9/9 × 2 overlay) — bukti dari VM ini, BUKAN dari runtime artifact produksi (lihat batas bukti di file tersebut). Harness disalin ke `spike-harness-v234/` agar dapat dijalankan ulang.
- **Bukti uji v2.3.5:** `SSRF_SPIKE_V235.md` (suite adversarial AUTH 18/18 PASS,
  dijalankan ulang **2×**: AUTH-T1..T11 + AUTH-C1 — otoritas flock, mixed-version,
  zombie liveness; AUTH-T9c NOT RUN — tidak ada NFS di VM ini; regresi v2.3.4
  diulang: ADV fixed-code 4/4 × 2, FLK-T1..T8 9/9 tmpfs + 9/9 overlay,
  bun-flock-sanity OK; SU-T1..SU-T9 v2.3.2 NOT RUN — dependensi `/tmp` hilang)
  — bukti dari VM ini, BUKAN dari runtime artifact produksi (lihat batas bukti
  di file tersebut). Harness disalin ke `spike-harness-v235/` agar dapat
  dijalankan ulang.
- **Bukti uji v2.3.2:** `SSRF_SPIKE_V232.md` (9/9 PASS, dijalankan ulang **3×**:
  SU-T1..SU-T9 — aturan startup NOT_READY, validasi identitas PID,
  pidfile atomik, startup lock) — bukti dari VM ini,
  BUKAN dari runtime artifact produksi (lihat batas bukti di file tersebut).
  Harness disalin ke `spike-harness-v232/` agar dapat dijalankan ulang.
  **Koreksi v2.3.3:** klaim awal "dijalankan ulang 2×" di revisi v2.3.2
  sudah benar pada saat itu, tetapi pesan laporan pengiriman v2.3.2
  menyebut "3×" tanpa output RUN=3 — lihat §0 `SSRF_SPIKE_V233.md`
  untuk rekonsiliasi lengkap: RUN=3 yang sesungguhnya dijalankan
  selama revisi v2.3.3 (output verbatim di file bukti tersebut), sehingga
  klaim 3× kini didukung tiga output terdokumentasi (RUN=1, RUN=2, RUN=3).
- **Bukti uji v2.3.1:** `SSRF_SPIKE_V231.md` (61/61 PASS, dijalankan ulang 2×:
  TERM-T1..T4 23 pemeriksaan + PARENT-T1a/T1b/T2 15 pemeriksaan +
  pengulangan SEM-R1..R6 + ORPH-T0..T5 23 pemeriksaan) — bukti dari VM ini,
  BUKAN dari runtime artifact produksi (lihat batas bukti di file tersebut).
  Catatan: harness asli v2.2 DAN v2.3 hilang karena `/tmp` dibersihkan antar
  sesi; semua pengujian v2.3.1 adalah implementasi ulang dari spesifikasi
  yang didokumentasikan di `SSRF_SPIKE_V22.md` §1 dan `SSRF_SPIKE_V23.md`
  §1–§8.
- **Bukti uji v2.3:** `SSRF_SPIKE_V23.md` (13/13 PASS, dijalankan ulang 2×:
  pengulangan SEM-01..SEM-06 6/6 + orphaned/breaker/worker 7/7) — bukti dari
  VM ini, BUKAN dari runtime artifact produksi (lihat batas bukti di file
  tersebut). Catatan: harness asli v2.2 hilang karena `/tmp` dibersihkan
  antar sesi; SEM-R1..SEM-R6 adalah implementasi ulang dari spesifikasi
  yang didokumentasikan di `SSRF_SPIKE_V22.md` §1.
- **Bukti uji v2.2:** `SSRF_SPIKE_V22.md` (11/11 PASS: semaphore DNS 6/6, atomicity lease 5/5) — bukti dari VM ini, BUKAN dari runtime artifact produksi (lihat batas bukti di file tersebut).
- **Bukti uji v2.1:** `SSRF_SPIKE_V21.md` (48/48 PASS: NAT64 10/10, dekompresi
  jalur Node Agent 11/11, DNS 7/7, RDAP 20/20) — bukti dari VM ini, BUKAN dari
  runtime artifact produksi (lihat batas bukti di file tersebut).
- **Keputusan pemilik yang sudah disetujui (7 Nov 2026, menjadi asumsi tetap):**
  1. Temporary mitigation: opsi (a) — nonaktifkan scanning URL arbitrer sementara.
  2. Script fetching: nonaktifkan sementara via feature flag.
  3. IP pinning: menunggu hasil spike runtime — **spike selesai, lihat
     `SSRF_SPIKE_RUNTIME.md`** (Pendekatan 1 via Node `https` Agent `lookup`
     TERBUKTI di Bun 1.4.4; Pendekatan 2 via `Bun.fetch` + `tls.serverName` +
     header `Host` TERBUKTI sebagai fallback).
  4. Rate limit awal: **10 pemeriksaan/menit dan 100/jam per IP**.
  5. Port tujuan: **hanya 80 dan 443**.
  6. CGNAT (`100.64.0.0/10`): **blokir secara default**.
  7. Timeout global: **target awal 20 detik**.
  8. Implementasi bertahap dengan pengujian setiap build; **production cutover
     HANYA setelah seluruh pengujian wajib lolos** — scanner tetap NONAKTIF di
     produksi selama perbaikan, dan TIDAK dibuka kembali hanya karena P0 selesai
     bila timeout global dan rate limit belum siap.
- **Tujuan:** Menutup temuan audit SSRF (`SSRF_AUDIT.md`, status keseluruhan **VULNERABLE**)
  tanpa merusak perilaku scanner yang sudah terbukti benar untuk URL publik.
- **Evaluasi:** Dokumen ini disusun untuk dievaluasi ChatGPT sebelum pemilik memberi
  persetujuan implementasi. **Jangan implementasikan apa pun berdasarkan dokumen ini
  sebelum ada persetujuan eksplisit pemilik.**
- **Ruang lingkup:** Link Scanner live di artifact slug `cek-link-airdrop`
  (aksi server `checkLink`). Tidak ada perubahan pada katalog proyek, histori cek,
  sistem scoring, atau asisten Gibran kecuali yang dinyatakan eksplisit di §B dan §E.

## Perubahan di revisi v2.3.5 (7 November 2026)

Revisi teknis terbatas atas LIMA BAGIAN permintaan pemilik ("REQUEST V2.3.5:
FLOCK STARTUP LOCK SECURITY REVIEW"): otoritas kepemilikan flock (U-31),
keamanan mixed-version, uji adversarial, dan kompatibilitas runtime/
filesystem. Tidak ada keputusan D-1 s.d. D-8 yang diubah. Risiko U-11
dan U-16 s.d. U-30 tetap tercatat (U-29/U-30 diperbarui, U-31 dijawab);
ditambah risiko baru U-32 s.d. U-40. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti uji: `SSRF_SPIKE_V235.md`.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.5.4e (baru — otoritas kepemilikan flock, U-31 DIJAWAB) | Argumen keamanan: otoritas = flock kernel pada fd yang dipegang seumur hidup proses; (dev,ino)+token adalah DETEKTOR, bukan otoritas. Setiap tindakan sensitif didahului `assertOwnership()` segar dalam tick sinkron yang sama (`guardedAction`); CLOEXEC diverifikasi via fdinfo; fd lock tidak pernah diwariskan; pidfile flock sebagai domain kedua + worker menolak token yang tidak cocok sebelum lookup pertama. Jendela mikro tidak dibuat nol, tetapi konsekuensinya fail-closed (residual dicatat U-38). |
| 2 | §A.5.5.4f (baru — mixed-version fail-closed) | Dua lapis pencegahan: pre-start scan `/proc` (token argv persis) + klasifikasi record (`protocol: "flock-v2"`, old-live → `held-by-old-version` + sentinel, tak terbaca → `lock-record-unreadable`). Bahaya reverse (old-first) diidentifikasi dan diuji (AUTH-T5a/T5b). Aturan v2.3.4 yang mengizinkan record tak terbaca sebagai observabilitas-only DIPERKETAT. Flag-day tetap mengikat (U-28) — deteksi bukan pencegahan. |
| 3 | §A.5.5 (liveness — perbaikan dari diagnosis AUTH-T3) | `pidAlive()` menjadi zombie-aware: state `Z`/`X` di `/proc/<pid>/stat` = tidak hidup; `kill(pid,0)` saja terbukti tidak cukup (zombie SUCCEEDS). Fallback `kill(pid,0)` hanya bila `/proc` tak terbaca. Tes baru AUTH-T11. |
| 4 | §D.4.13 (baru) + §H | Tambah uji adversarial AUTH-01..AUTH-16 ke gerbang G6; G7 menyebut evaluasi atas v2.3.5. |
| 5 | §G | U-31 dijawab v2.3.5 (otoritas flock); U-29 diperbarui (`fs-ext` gagal dibangun ketiga kalinya); U-30 diperbarui (AUTH-T9c NOT RUN). Tambah U-32 (mixed-version reverse), U-33 (advisory flock), U-34 (runtime produksi `bun:ffi` NOT VERIFIED), U-35 (filesystem lock produksi NOT VERIFIED), U-36 (supervisor/mount replacement NOT VERIFIED), U-37 (zombie liveness — ditutup, residual runtime tanpa `/proc`), U-38 (jendela mikro residual), U-39 (PID spawn vs PID pelayan), U-40 (scan false positive substring — ditutup). |
| 6 | Pernyataan penutup | **Koreksi atribusi v2.3.4:** empat klarifikasi (koreksi 3×, reklamasi diperkeras, STARTUP-10, durabilitas pidfile) adalah isi v2.3.3, bukan v2.3.4; v2.3.4 menjawab SATU keberatan (race reklamasi lock). Paragraf v2.3.3 yang hilang ditambahkan kembali; paragraf v2.3.5 ditambahkan. |
| 7 | §F + pernyataan penutup | Estimasi TETAP ~8–14 hari kerja — perubahan v2.3.5 (liveness zombie-aware, lapis mixed-version) masuk dalam P0-1b/P0-UJI yang sudah ada. G0 tetap wajib dibuktikan aktif; dokumen final BUKAN persetujuan implementasi. |


## Perubahan di revisi v2 (7 Nov 2026)

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.2 (IP pinning) | Hasil spike dimasukkan: Pendekatan 1 via Node `https` Agent `lookup` TERBUKTI di Bun 1.4.4 (utama); Pendekatan 2 via `Bun.fetch` + `tls.serverName` + header `Host` TERBUKTI (fallback); `fetch` global terbukti TIDAK mendukung custom lookup; undici v7 hanya terbukti di Node via `.compose()` dan TIDAK dijadikan dependensi utama Bun. Aturan implementasi dari temuan spike: hormati `options.all` pada callback lookup, tulis socket hanya di handler `open`, isi `servername` eksplisit (jangan andalkan penurunan SNI dari header `Host`). |
| 2 | §A.4 (daftar blokir) | Diperluas ke seluruh entri IANA special-purpose IPv4/IPv6 (diambil 7 Nov 2026, terakhir diperbarui IANA 9 Okt 2025): tambah NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48`), IPv4-mapped (`::ffff:0:0/96`), Teredo/6to4 (dengan ekstraksi IPv4 tertanam), dokumentasi TEST-NET, benchmarking, discard-only, ORCHIDv2, zone identifier IPv6 (`%eth0`), dan sumber + proses pembaruan daftar. |
| 3 | §A.1 RDAP | Allowlist redirect RDAP ditentukan dari IANA RDAP bootstrap registry (`data.iana.org/rdap/dns.json`, 592 layanan per 7 Nov 2026) + 5 RIR — bukan wildcard. Host konkret untuk TLD relevan dicantumkan; semua redirect RDAP tetap melalui DNS validation + IP pinning. |
| 4 | §A.5 (resource limit) | Batas streaming dihitung dari byte AKTUAL setelah dekompresi (terbukti: Content-Length 1.004 byte vs 1.000.000 byte konten). Mekanisme abort per tahap (DNS, koneksi, redirect, RDAP, body) pada timeout global 20 detik dijelaskan. |
| 5 | §A.7 (rate limit) | Sumber IP tepercaya, anti-spoofing forwarded headers, dan perilaku multi-instance dijelaskan — termasuk status NOT VERIFIED untuk topologi runtime dan langkah discovery yang wajib dilakukan sebelum memilih store. |
| 6 | §D.5 (cutover) | Diperketat: scanner tetap nonaktif selama perbaikan; go/no-go eksplisit termasuk timeout global + rate limit; penanda tangan tiap gerbang (pemilik + ChatGPT). |
| 7 | §G (baru) | Daftar risiko yang BELUM terselesaikan setelah revisi. |
| 8 | §H (baru) | Rencana pengujian dan rollback FINAL. |
| 9 | §C, §F, daftar keputusan | P0-1a (spike) dinyatakan SELESAI; keputusan D-1 s.d. D-8 ditandai DISETUJUI dengan nilai yang diputuskan pemilik; estimasi disesuaikan (risiko +1 tingkat karena runtime tidak mendukung pinning SUDAH tertutup oleh hasil spike). |

## Perubahan di revisi v2.1 (7 November 2026)

Revisi teknis terbatas atas evaluasi ChatGPT terhadap v2. Tidak ada keputusan
D-1 s.d. D-8 yang diubah. Bukti uji: `SSRF_SPIKE_V21.md` (48/48 PASS).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.4.2–§A.4.3 (NAT64) | **KOREKSI BUG v2:** aturan ekstraksi IPv4 untuk prefix `64:ff9b:1::/48` diperbaiki sesuai RFC 6052 §2.2 — IPv4 TIDAK berada di 32 bit terakhir, melainkan 16 bit di bit 48..63 (byte 6..7) + 16 bit di bit 72..87 (byte 9..10), dengan oktet "u" di bit 64..71 (byte 8) yang WAJIB 0 (bila ≠ 0 → malformed, tolak). Aturan v2 terbukti salah lewat tes: memblokir 8.8.8.8 yang sah (false positive) DAN meloloskan 192.168.1.1 yang disembunyikan di suffix (bypass). Tambah uji unit S-44..S-48. |
| 2 | §A.5 (resource limit) | Batas 400 KB setelah dekompresi kini TERBUKTI pada jalur utama Node `http.Agent` (bukan hanya spike `Bun.fetch`): gzip/deflate/brotli bomb diabort pada 409.600 byte; tanpa Content-Length tetap abort; Content-Length hanya sinyal tolak-awal; encoding tidak dikenal ditolak; stream rusak/terpotong fail-closed. |
| 3 | §A.5 (timeout global & DNS) | **TEMUAN BARU:** `AbortSignal` TIDAK menghentikan `dns.lookup`/`resolve4` di Node v24.22.1 pada VM ini — DNS diperlakukan sebagai NON-CANCELLABLE; mitigasi: race + timeout 5 dtk per lookup + semaphore + abaikan hasil telat + log. Timeout global 20 dtk: seluruh pemeriksaan berhenti, TIDAK BOLEH ada vonis parsial (status "tidak selesai (timeout)", tanpa skor, tanpa baris `checks`). Timeout lokal RDAP dibedakan dari timeout global. |
| 4 | §A.1b (baru — DNS TTL) | API resolver DITETAPKAN: `dns.resolve4`/`resolve6` dengan `{ttl:true}` (satu-satunya API yang memberi TTL; `dns.lookup` tidak memberi TTL). TIDAK ADA caching DNS antar pemeriksaan; masa berlaku pinning = satu hop saja (resolve segar per hop). TTL dicatat untuk observabilitas. |
| 5 | §A.1a (RDAP) | Pencocokan origin + path-prefix WAJIB memakai parsing WHATWG URL yang ketat (bukan string sederhana): bukti tes 20/20; matcher naif `includes()` salah pada 12/20 kasus. Aturan: host persis, port 443, path segment-aware, tolak userinfo, path case-sensitive. |
| 6 | §A.7.2 (konkurensi) | **KOREKSI v2:** batas 5 pemeriksaan DITETAPKAN sebagai batas GLOBAL via tabel lease DB bersama (`scan_leases`, TTL 25 dtk, acquire dalam transaksi), BUKAN 5 per instance. Saat penuh → tolak langsung 429 (tanpa antrean lintas instance). Rate limit DB TIDAK dianggap membatasi konkurensi. |
| 7 | §D.4, §H | Tambah uji S-44..S-48 (NAT64), R-11..R-14 (dekompresi jalur Node Agent, timeout tanpa vonis parsial, race DNS, matcher RDAP), dan RD-01..RD-20 (matcher RDAP ketat). Gerbang G4/G6 diperluas. |
| 8 | §G | Tambah risiko belum terselesaikan U-11..U-15 (NSP di luar dua prefix NAT64 yang dikenal; DNS non-cancellable; TTL sandbox tidak representatif; lease DB sebagai single point; perilaku signal di runtime produksi belum terbukti). |
| 9 | §F | Estimasi TETAP ~8–14 hari kerja — koreksi v2.1 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru). |

## Perubahan di revisi v2.3.4 (7 November 2026)

Revisi teknis terbatas atas SATU keberatan teknis evaluasi ChatGPT terhadap
v2.3.3: race condition pada reklamasi startup lock (§A.5.5.4). Tidak ada
keputusan D-1 s.d. D-8 yang diubah. Risiko U-11 dan U-16 s.d. U-27 tetap
tercatat (U-25 ditulis ulang, U-26 diperbarui); ditambah risiko baru U-28
s.d. U-31. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED**. Bukti uji: `SSRF_SPIKE_V234.md`.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.5.4a (baru — urutan operasi aktual) | Urutan operasi `acquireStartupLock` v2.3.3 didokumentasikan sebagai pseudocode persis dari implementasi referensi (bukan versi ideal), dengan jendela race ditandai. **Pengakuan: implementasi v2.3.3 TIDAK mencegah B menghapus lock baru milik A** — unlink tak bersyarat setelah probe basi + verify yang hanya pemeriksaan sesaat. |
| 2 | §A.5.5.4b (baru — mengapa SU10-T1 tidak cukup) | Klaim v2.3.3 "balapan hapus+create diselesaikan oleh O_EXCL" **ditarik**: SU10-T1 hanya menguji satu titik ruang interleaving secara acak; ADV-T1 mereproduksi 2 pemilik secara deterministik (2/2 run). |
| 3 | §A.5.5.4c (baru — perbaikan flock) | **Primitif kepemilikan diganti: flock(LOCK_EX\|LOCK_NB) pada fd yang dipegang seumur hidup proses.** Jalur probe ESRCH + unlink reklamasi DIHAPUS. Aturan never-unlink; verifikasi ulang kepemilikan (inode + record via path + token acak per-akuisisi); fd WAJIB close-on-exec; heartbeat hanya observabilitas. Jalur probe/tabel ESRCH v2.3.3 untuk lock dinyatakan SUPERSEDED (probe tetap dipakai untuk cleanup worker di §A.5.5.1/§A.5.5.2, yang tidak berubah). |
| 4 | §A.5.5.4d (baru — flag-day) | Migrasi WAJIB flag-day: versi lama (unlink-reclaim) dan versi baru (flock) tidak boleh berjalan bersamaan — ADV-T6 membuktikan dua pemilik pada masa transisi, meskipun jaring pengaman (verifikasi ulang) menangkapnya sebelum cleanup. |
| 5 | §D.4.12 (baru) + §H | Tambah uji adversarial ADV-T1..T6 dan uji semantik flock FLK-T1..T8 ke gerbang G6; G7 menyebut evaluasi atas v2.3.4. |
| 6 | §G | U-25 ditulis ulang (race TERBUKTI, bukan "tersisa kecil"); U-26 diperbarui (kondisi pemicu dari jalur probe hilang bersama jalur itu; residual dicatat di U-28/U-31). Tambah U-28 (versi campuran/flag-day), U-29 (binding flock runtime), U-30 (flock di NFS), U-31 (jendela mikro verifikasi->cleanup). |
| 7 | §F + pernyataan penutup | Estimasi TETAP ~8–14 hari kerja — klarifikasi v2.3.4 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru, kecuali pengujian staging tambahan yang dicatat di G6). Ditegaskan eksplisit: G0 tetap wajib dibuktikan aktif sebelum scanner dapat dibuka kembali, dan seluruh gerbang G0–G7 wajib lolos sebelum keputusan cutover G8; dokumen final BUKAN persetujuan implementasi. |

## Perubahan di revisi v2.3.3 (7 November 2026)

Revisi teknis terbatas atas empat hal evaluasi ChatGPT terhadap v2.3.2:
konsistensi jumlah pengujian, reklamasi startup lock, pengujian
STARTUP-10, dan durabilitas pidfile. Tidak ada keputusan D-1 s.d. D-8
yang diubah. Risiko U-11 dan U-16 s.d. U-25 tetap tercatat; ditambah
risiko baru U-26 dan U-27. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti uji:
`SSRF_SPIKE_V233.md` (RUN=3 suite v2.3.2: 9/9 PASS; regresi 9/9 PASS × 2;
tes baru 8/8 PASS × 2). **Dokumen final BUKAN berarti implementasi
otomatis disetujui** — itu dua keputusan berbeda; persetujuan
implementasi tetap menunggu keputusan eksplisit pemilik.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | Header + §0 `SSRF_SPIKE_V233.md` (baru — rekonsiliasi jumlah run) | **KOREKSI KLAIM:** pesan laporan v2.3.2 menyebut "9/9 PASS dijalankan 3×", tetapi `SSRF_SPIKE_V232.md` dan dokumen desain hanya mendokumentasikan RUN=1 dan RUN=2 (hanya ada `run1.log` dan `run2.log`). Klaim 3× pada saat itu TIDAK didukung bukti. Perbaikan: RUN=3 yang sesungguhnya dijalankan selama revisi ini (output verbatim di `SSRF_SPIKE_V233.md` §0; diff terhadap RUN=1 identik modulo header) — klaim 3× kini didukung tiga output. Seluruh klaim jumlah run SU-T1..SU-T9 diperbarui dari 2× menjadi 3× di dokumen ini. |
| 2 | §A.5.5.4 (reklamasi startup lock — DIPERKERAS) | **Perubahan perilaku inti.** Penghapusan lock HANYA setelah PID pemegang TERBUKTI mati (ESRCH via `kill(pid, 0)`). Heartbeat basi TIDAK PERNAH menjadi bukti kematian — heartbeat tidak lagi dikonsultasikan dalam keputusan hapus (hanya metrik/alert). PID masih hidup → JANGAN hapus, JANGAN lanjut (berlaku juga bila starttime tidak cocok/PID reuse — aturan ketat v2.3.3). EPERM dan error probe lain → status TIDAK PASTI → jangan hapus, jangan lanjut (NOT_READY + page). Lock yang tidak terbaca → JANGAN PERNAH hapus otomatis (menghapus aturan v2.3.2 "hapus bila mtime > 30 dtk"). Validasi ulang kepemilikan setelah acquire berhasil (baca kembali file, pastikan PID sendiri) sebelum cleanup apa pun. Tabel perlakuan error proses (ESRCH/EPERM/lainnya) ditetapkan eksplisit. |
| 3 | §D.4.11 + §H (STARTUP-10) | **STARTUP-10 kini TERUJI di VM ini** (sebelumnya "belum teruji di VM ini — wajib di staging"): 5 parent bersamaan mereklamasi lock basi yang sama → tepat 1 pemenang, yang kalah keluar tanpa cleanup, pemenang memvalidasi ulang kepemilikan (bukti `SSRF_SPIKE_V233.md`, SU10-T1/T2 8/8 PASS × 2). Uji ulang di staging produksi tetap wajib sebelum cutover. |
| 4 | §A.5.5.3 (baru — visibilitas vs durabilitas pidfile) | SU-T4 membuktikan *atomic visibility* (rename atomik), BUKAN durabilitas. Didokumentasikan batas bukti: seluruh pengujian berjalan di `/tmp` bertipe tmpfs (fsync tidak menguji durabilitas disk) dan `/home` di overlay btrfs dengan `fsync=volatile`. Rencana uji crash/durabilitas staging D-01..D-03 ditambahkan; pidfile WAJIB berada di penyimpanan persisten, bukan tmpfs. |
| 5 | §G | Perbarui U-25 (jendela TOCTOU reklamasi menyempit — balapan hapus+create kini teruji SU10-T1; sisa jendela: PID dipakai ulang antara probe ESRCH dan unlink — penghapusan file klaim basi tetap aman karena proses baru tidak memegang lock). Tambah risiko baru U-26 (startup macet sampai intervensi operator bila angka PID hidup/EPERM/lock tak terbaca) dan U-27 (durabilitas pidfile belum terbukti di filesystem produksi). |
| 6 | §D.4.11 + §H | Tambah uji baru RCL-T1..T6 (reklamasi yang diperkeras) dan SU10-T1/T2 (STARTUP-10) ke gerbang G6; G7 menyebut evaluasi atas v2.3.3. |
| 7 | §F + pernyataan penutup | Estimasi TETAP ~8–14 hari kerja — klarifikasi v2.3.3 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru). Ditegaskan eksplisit: G0 tetap wajib dibuktikan aktif sebelum scanner dapat dibuka kembali, dan seluruh gerbang G0–G7 wajib lolos sebelum keputusan cutover G8; dokumen final BUKAN persetujuan implementasi. |

## Perubahan di revisi v2.3.2 (7 November 2026)

Revisi teknis terbatas atas satu klarifikasi wajib evaluasi ChatGPT
terhadap v2.3.1: aturan startup parent baru pada §A.5.5. Tidak ada
keputusan D-1 s.d. D-8 yang diubah. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti uji:
`SSRF_SPIKE_V232.md` (9/9 PASS, dijalankan ulang **3×** — RUN=1, RUN=2,
dan RUN=3; RUN=3 dijalankan dan didokumentasikan selama revisi v2.3.3,
lihat §0 `SSRF_SPIKE_V233.md`). **Dokumen final
BUKAN berarti implementasi otomatis disetujui** — itu dua keputusan
berbeda; persetujuan implementasi tetap menunggu keputusan eksplisit
pemilik.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.5 (diperjelas — aturan startup NOT_READY) | **Inti revisi v2.3.2 (butir 1).** Aturan keras yang tidak dapat dinegosiasi: bila worker lama tidak dapat dipastikan mati setelah batas waktu dan percobaan cleanup habis, parent baru WAJIB tetap `NOT_READY` dan tidak menerima lookup DNS. Batas percobaan BUKAN izin melanjutkan startup. Ditetapkan: 3 percobaan cleanup × tunggu konfirmasi exit 5 dtk per percobaan (anggaran total 15 dtk); tiap percobaan = validasi ulang identitas → SIGKILL → tunggu event `exit`; setelah percobaan ke-3 gagal, parent tetap `NOT_READY` sampai intervensi operator atau exit worker lama akhirnya terkonfirmasi. Selama `NOT_READY`: semua lookup DNS ditolak `DNS_PARENT_NOT_READY`, dicatat, metrik `parentNotReady` + page aktif. Hanya dua kondisi yang mengizinkan transisi ke `READY`: (a) exit worker lama terkonfirmasi via event `exit`, atau (b) bukti worker lama tidak pernah ada (tidak ada pidfile, atau PID worker tidak hidup). **Koreksi inkonsistensi v2.3.1:** langkah cleanup di §A.5.5 sebelumnya menulis tunggu maks 2 dtk — diselaraskan ke exit-confirm timeout 5 dtk yang sama dengan aturan konfirmasi terminasi (§A.5.5 butir 1); frasa "JANGAN lanjut sebelum worker lama mati ATAU batas percobaan habis" DIHAPUS karena "atau batas percobaan habis" dapat dibaca sebagai izin melanjutkan — diganti aturan keras di atas. |
| 2 | §A.5.5.2 (baru — validasi identitas proses sebelum SIGKILL) | **Inti revisi v2.3.2 (butir 2a).** PID saja tidak cukup. Sebelum SIGKILL, parent baru WAJIB memvalidasi identitas worker lama: (1) PID hidup (`kill(pid, 0)`); (2) start time proses dari `/proc/<pid>/stat` field 22 HARUS sama dengan `workerStarttime` di pidfile — ini yang mengikat PID ke instans proses tertentu dan menggagalkan PID reuse; (3) command line dari `/proc/<pid>/cmdline` HARUS mengandung penanda worker (`dns-worker`); (4) bila channel IPC ke worker lama tersedia, tantangan token (token di pidfile harus dijawab benar oleh worker). Bila SATU PUN pemeriksaan gagal → JANGAN kirim SIGKILL, parent tetap `NOT_READY` + page, operator harus memeriksa manual. Validasi diulang sesaat sebelum tiap percobaan SIGKILL (bukan sekali di awal startup). |
| 3 | §A.5.5.3 (baru — pidfile atomik) | **Inti revisi v2.3.2 (butir 2b).** Penulisan pidfile: tulis record lengkap ke file sementara di direktori yang sama → fsync file → rename atomik → fsync direktori. Isi: `parentPid`, `workerPid`, `workerStarttime`, `workerToken`, `writtenAt`, `version`. Tidak pernah ada keadaan setengah tertulis: kegagalan di tengah jalan hanya meninggalkan file sementara yang tidak pernah menjadi pidfile. Pidfile yang ada tetapi rusak/parsial (JSON tidak terbaca atau field hilang) diperlakukan sebagai "worker lama tidak dapat dibuktikan mati dan tidak dapat dibuktikan tidak ada" → parent tetap `NOT_READY` + page (fail-closed); hanya pidfile yang TIDAK ADA yang berarti "tidak ada klaim worker" → boleh READY. |
| 4 | §A.5.5.4 (baru — startup lock) | **Inti revisi v2.3.2 (butir 2c).** Satu parent memegang startup lock selama masa hidup prosesnya (file lock dibuat atomik O_EXCL, fd dipertahankan terbuka, heartbeat ditulis tiap 5 dtk). Parent yang kalah acquire (lock dipegang pemegang yang hidup + heartbeat segar) KELUAR SEGERA dengan kode keluar dan log yang jelas, dan TIDAK melakukan cleanup atau startup apa pun. Bila pemegang lock mati (PID tidak hidup dan/atau heartbeat basi > 10 dtk), lock dapat direklamasi setelah validasi identitas pemegang — penghapusan lock basi hanya setelah PID pemegang terbukti mati; jendela TOCTOU kecil antara validasi dan penghapusan dicatat sebagai risiko baru U-25. |
| 5 | §D.4.11 (baru) + §H | Gerbang G6 diperluas dengan uji startup STARTUP-01..STARTUP-09 (SU-T1..SU-T9, bukti `SSRF_SPIKE_V232.md`). G7 menyebut evaluasi atas v2.3.2. |
| 6 | §G | Tambah risiko belum terselesaikan U-24 (jendela TOCTOU validasi-identitas → SIGKILL) dan U-25 (balapan reklamasi lock basi). U-11, U-16, U-17, U-18, U-19, U-20, U-21, U-22, U-23 TETAP dicatat tanpa perubahan. |
| 7 | §F + pernyataan penutup | Estimasi TETAP ~8–14 hari kerja — klarifikasi v2.3.3 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru). Ditegaskan eksplisit: G0 tetap wajib dibuktikan aktif sebelum scanner dapat dibuka kembali, dan seluruh gerbang G0–G7 wajib lolos sebelum keputusan cutover G8; dokumen final BUKAN persetujuan implementasi. |

## Perubahan di revisi v2.3.1 (7 November 2026)

Revisi teknis terbatas atas evaluasi ChatGPT terhadap v2.3: konfirmasi
terminasi child process, parent crash/restart, batas lintas instance, dan
rekonsiliasi laporan pengujian. Tidak ada keputusan D-1 s.d. D-8 yang
diubah. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION
NOT APPROVED**. Bukti uji: `SSRF_SPIKE_V231.md` (61/61 PASS, dijalankan
ulang 2×).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.5 (baru — konfirmasi terminasi worker + parent crash/restart) | **Inti revisi v2.3.1 (butir 1–2).** (a) Counter `orphaned`/`active` HANYA dikurangi setelah event `exit` child process diterima — TIDAK PERNAH saat SIGKILL dikirim; satu jalur decrement (`_decrementForWorker`, idempotent) yang hanya dipanggil dari exit handler; bila exit tidak terkonfirmasi dalam batas waktu (5 dtk produksi), counter TETAP, breaker TETAP terbuka, metrik `workerExitUnconfirmed` + page. (b) Evaluasi penutupan breaker terjadi tepat 1× dan HANYA setelah exit terkonfirmasi (dibuktikan TERM-T2 dengan penghitungan pemanggilan). (c) Parent crash: worker keluar sendiri saat parent mati (`disconnect` + watchdog ppid) — dibuktikan PARENT-T1a; bila mekanisme itu gagal (worker stubborn), parent baru membersihkan worker lama lewat pidfile (SIGKILL + konfirmasi exit) — dibuktikan PARENT-T1b; state in-memory dibangun dari nol oleh parent baru, lease global DB bertahan (dibuktikan PARENT-T2); request yang sedang berjalan saat parent mati gagal fail-closed tanpa vonis. (d) Supervisor eksternal ditetapkan sebagai persyaratan staging (U-22) karena perilaku supervisor platform tidak dapat diperiksa di VM ini. |
| 2 | §A.5.6 (baru — batas lintas instance) | **Inti revisi v2.3.1 (butir 3).** Batas 8 operasi hidup ditegaskan sebagai batas PER PROSES, bukan global: worst-case lintas instance = **8N** (N = jumlah instance; 100 instance → 800). Dijelaskan hubungannya dengan `scan_leases` global (batas 5 pemeriksaan): lease membatasi pemeriksaan yang berjalan, BUKAN akumulasi orphaned — karena lease dilepas saat pemeriksaan selesai sementara lookup-nya tetap hidup sebagai orphaned. Alasan batas global orphaned belum masuk P0 (butuh store bersama + heartbeat/lease-TTL pada entri orphaned + failure mode baru) dan syarat memasukkannya di P2. U-18 TETAP TERBUKA dengan angka worst-case ini. |
| 3 | §D.4.10 (baru) + §H | Gerbang G6 diperluas dengan uji terminasi TERM-01..TERM-04, uji parent PARENT-01..PARENT-02, uji rekonsiliasi RECON-01, dan uji supervisor SUP-01. |
| 4 | §G | Tambah risiko belum terselesaikan U-21 (exit worker tidak terkonfirmasi), U-22 (parent crash / supervisor platform belum terbukti), U-23 (batas global orphaned belum ada — worst-case 8N). U-18 diperbarui dengan angka worst-case lintas instance dan hubungan dengan `scan_leases`. U-11, U-16, U-17, U-19, U-20 TETAP dicatat tanpa perubahan. |
| 5 | §4 (rekonsiliasi, di `SSRF_SPIKE_V231.md`) | **Koreksi laporan (butir 4).** Anotasi blok output `SSRF_SPIKE_V23.md` terbukti bergeser satu baris: anotasi di bawah SEM-R6 sebenarnya menjelaskan ORPH-T0 (orphaned akhir=6, live maks=6), dan anotasi di bawah ORPH-T0 sebenarnya menjelaskan ORPH-T1 (orphaned maks=3, live maks=4, started=4). Pengulangan v2.3.1 mengonfirmasi isi §2/§3 v2.3 benar; tidak ada angka yang diubah. Koreksi kedua: "5 kunci baru" pada SEM-R6 seharusnya "7" (total 19 tetap benar: 10 + 7 + `liveOps` + `capDeferred`); v2.3.1 menambah 2 kunci (`workerExitConfirmed`, `workerExitUnconfirmed`) menjadi 21. |
| 6 | §F | Estimasi TETAP ~8–14 hari kerja — revisi v2.3.1 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru). |

## Perubahan di revisi v2.3 (7 November 2026)

Revisi teknis terbatas atas satu keberatan evaluasi akhir ChatGPT terhadap
v2.2: absolute cap DNS berpotensi membuka akumulasi lookup yang tidak
pernah settle. Tidak ada keputusan D-1 s.d. D-8 yang diubah. Status tetap:
**DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti
uji: `SSRF_SPIKE_V23.md` (13/13 PASS, dijalankan ulang 2×).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.4 (baru — penghitung orphaned, batas keras, circuit breaker, pemulihan worker) | **Inti revisi v2.3.** (a) Penghitung slot semaphore dan penghitung operasi DNS orphaned DIPISAH: operasi yang terkena force-release tetap dihitung sebagai operasi yang mungkin masih berjalan sampai promise aslinya settle atau proses worker-nya benar-benar dihentikan — force-release TIDAK PERNAH dianggap sebagai berhentinya operasi DNS. (b) Batas keras orphaned: `orphanHardCap = 4` (produksi); force-release HANYA merebut slot bila `orphaned < cap` — bila sudah di cap, slot tetap terpakai sebagai "cap-deferred" sampai orphaned turun. Invarian yang ditegakkan: `orphaned ≤ cap` SELALU dan `liveOps = active + orphaned ≤ maxActive + cap` SELALU. (c) Circuit breaker fail-closed: saat `orphaned ≥ cap`, penerimaan lookup DNS baru dihentikan sementara (tolak `DNS_CIRCUIT_OPEN`, antrean dikosongkan); breaker menutup hanya saat `orphaned ≤ threshold pemulihan = 1` (hysteresis). (d) Mekanisme pemulihan: isolasi DNS worker anak-proses yang dapat di-kill (`SIGKILL`) dan dibuat ulang — satu-satunya pembatalan DNS yang terbukti, karena `AbortSignal` terbukti tidak menghentikan DNS (temuan v2.1). Worker thread dievaluasi dan DITOLAK sebagai pengganti (berbagi memori/resolver proses induk). (e) Metrik baru: `orphaned` aktif, total force-release, high-water mark orphaned, status/trip breaker, restart worker — lengkap dengan ambang alert dan tindakan operasional. Bukti: ORPH-T0 (kontrol v2.2 — keberatan TERBUKTI: orphaned tumbuh 2→4→6 tanpa batas) dan ORPH-T1..T5 (7/7 PASS). |
| 2 | §A.5.3 | Ditambah rujukan ke §A.5.4: absolute cap v2.2 kini dibatasi oleh penghitung orphaned dan circuit breaker; SEM-T5 tetap berlaku tetapi kini dilengkapi ORPH-T1..T5. |
| 3 | §G | Tambah risiko belum terselesaikan U-18 (akumulasi orphaned — kini TERBATAS tetapi tidak hilang: breaker per proses, bukan global), U-19 (restart worker DNS — kompleksitas dan risiko restart loop), U-20 (breaker yang terlalu agresif dapat menolak lookup legit saat resolver bermasalah). U-16 diperbarui: perilaku semaphore + orphan accounting di runtime produksi tetap belum terbukti. U-11, PostgreSQL belum teruji, dan U-17 TETAP dicatat tanpa perubahan. |
| 4 | §H + §D.4.9 (baru) | Gerbang G6 diperluas dengan uji orphaned ORPH-01..ORPH-05 (termasuk pengulangan SEM-01..SEM-06 setelah perubahan); G7 menyebut evaluasi atas v2.3. Uji baru: kontrol tanpa batas (ORPH-T0), gelombang berulang (ORPH-T1), breaker (ORPH-T2), pemulihan lewat settle (ORPH-T3), kill worker (ORPH-T4), metrik (ORPH-T5). |
| 5 | §F | Estimasi TETAP ~8–14 hari kerja — revisi v2.3 masuk dalam P0-1b/P0-UJI/P1-2 yang sudah ada (worker DNS adalah bagian dari P0-1b; tidak menambah langkah baru). |

## Perubahan di revisi v2.2 (7 November 2026)

Revisi teknis terbatas atas evaluasi ChatGPT terhadap v2.1. Tidak ada
keputusan D-1 s.d. D-8 yang diubah. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti uji:
`SSRF_SPIKE_V22.md` (11/11 PASS: semaphore DNS 6/6, atomicity lease 5/5).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.3 (baru — siklus hidup slot semaphore DNS) | Slot semaphore HANYA dilepas saat promise DNS asli settle (selesai/gagal) atau saat absolute cap 30 dtk tercapai — TIDAK PERNAH hanya karena `Promise.race` mencapai timeout. Lookup yang timeout tetap dihitung aktif sampai settle; antrean FIFO berbatas (maks 4, tunggu maks 5 dtk, penuh → tolak); penumpukan lookup background dibatasi `maxActive + maxQueue` = 8 per proses; metrik + ambang alert ditetapkan. Bukti: SEM-T1..SEM-T6 (6/6 PASS). Temuan samping: timer penolakan race TIDAK BOLEH di-unref. |
| 2 | §A.7.3 (baru — atomicity lease global per database) | Mekanisme atomisitas ditetapkan PER DATABASE AKTUAL: SQLite (live) — single-statement `INSERT ... SELECT ... WHERE count < 5` ATAU transaksi `BEGIN IMMEDIATE`, keduanya TERBUKTI (LSE-T1, 3 ronde × 8 proses → tepat 1 pemenang); PostgreSQL (target) — advisory lock transaksi ATAU counter row `UPDATE ... WHERE used < 5 RETURNING used`, dengan peringatan eksplisit bahwa single-statement `INSERT ... SELECT ... WHERE COUNT(*)` TIDAK aman di PostgreSQL di bawah `READ COMMITTED` (belum teruji di sini — wajib diuji di staging G6). Isolation level, locking, dan strategi retry (backoff 25/50/100 ms, maks 3×, lalu 503 fail-closed) ditetapkan. |
| 3 | §G (U-11) | Risiko NAT64 U-11 TETAP TERBUKA (tidak diklaim tertangani): ditambah rencana penanganan di staging (uji DNS64 dengan prefix NSP yang diketahui + kriteria penurunan status) dan daftar dokumen egress runtime yang harus diminta untuk mengurangi ketidakpastian. |
| 4 | §D.6 (baru — bukti mitigasi produksi G0) | Status keputusan mitigasi DIPISAH dari bukti bahwa mitigasi benar-benar aktif. Daftar bukti (evidence checklist) G0 ditetapkan: flag aktif, URL arbitrer ditolak sebelum koneksi keluar, tidak ada jalur cron yang melewati mitigasi, katalog/dashboard/histori/Gibran tetap berfungsi, timestamp aktivasi + identitas build. Dinyatakan eksplisit: **bukti-bukti ini BELUM ADA** karena mitigasi belum diaktifkan — dokumen ini hanya menetapkan apa yang harus dibuktikan di gerbang G0. |
| 5 | §G | Tambah risiko belum terselesaikan U-16 (semaphore DNS: perilaku lookup di runtime produksi belum terbukti; katup absolute cap sebagai mitigasi) dan U-17 (lease `scan_leases` di bawah beban ratusan instance belum teruji; kontensi lock SQLite/PostgreSQL). |
| 6 | §H | Gerbang G0 diperluas dengan checklist bukti §D.6; gerbang G6 diperluas dengan uji semaphore SEM-01..SEM-06 dan uji lease LSE-01..LSE-05 + uji beban konkurensi R-15. |
| 7 | §F | Estimasi TETAP ~8–14 hari kerja — revisi v2.2 masuk dalam P0-1b/P0-UJI/P1-2 yang sudah ada (tidak menambah langkah baru). |

---

## 0. Ringkasan eksekutif

Audit menemukan scanner live melakukan fetch server-side atas URL arbitrer tanpa
validasi DNS/IP: satu-satunya gate adalah protokol `http:`/`https:`. Tidak ada DNS
resolution, tidak ada IP pinning, tidak ada blocklist localhost/privat/link-local/
metadata, redirect tidak divalidasi ulang, fetch `<script src>` adalah vektor kedua,
dan tidak ada rate limiting. Satu panggilan dapat memicu ~11 fetch dan ~132 detik
wall-clock.

Rancangan ini menutup jalur-jalur itu dengan satu prinsip: **tidak ada koneksi
keluar yang terjadi sebelum hostname di-resolve, semua alamat hasil resolve
divalidasi, dan koneksi dibuat ke IP yang sudah divalidasi itu (IP pinning)** —
diterapkan secara identik pada URL awal, setiap hop redirect, dan (bila diaktifkan
kembali) setiap fetch script.

**Hasil spike runtime (v2 — `SSRF_SPIKE_RUNTIME.md`, 7 Nov 2026):** pinning
TERBUKTI dapat dilakukan di runtime Bun 1.4.4 — Pendekatan 1 via Node
`http`/`https` Agent `lookup` (utama), Pendekatan 2 via `Bun.fetch` +
`tls.serverName` + header `Host` (fallback). `fetch` global terbukti TIDAK
mendukung custom lookup (opsi `dispatcher` diabaikan diam-diam). Karena itu
jalur fetch terp-pin TIDAK BOLEH memakai `fetch` global; ia memakai API
`http`/`https` Node (Pendekatan 1) atau `Bun.fetch` dengan IP literal +
`tls.serverName` (Pendekatan 2). Spike P0-1a dengan demikian SELESAI; yang
masih wajib adalah uji ulang P0-1a di staging artifact produksi (U-1 di
laporan spike), karena spike dijalankan pada Bun CLI di VM — bukan pada
runtime artifact produksi.

**Hasil revisi v2.1 (7 Nov 2026 — `SSRF_SPIKE_V21.md`, 48/48 PASS):** enam
koreksi teknis atas evaluasi ChatGPT. (1) Aturan NAT64 v2 **salah** dan
diperbaiki: untuk `64:ff9b:1::/48` IPv4 berada di bit 48..63 + 72..87 dengan
oktet "u" wajib 0 — aturan v2 terbukti memblokir 8.8.8.8 yang sah dan
meloloskan 192.168.1.1 yang disembunyikan di suffix. (2) Batas 400 KB setelah
dekompresi terbukti pada jalur utama Node `http.Agent` (abort pada 409.600
byte untuk gzip/deflate/brotli, termasuk tanpa Content-Length). (3) TEMUAN:
`AbortSignal` TIDAK menghentikan DNS di Node v24.22.1 pada VM ini — DNS
diperlakukan sebagai NON-CANCELLABLE. (4) API resolver ditetapkan
(`resolve4/6` dengan `{ttl:true}`); tanpa caching DNS antar pemeriksaan.
(5) Pencocokan allowlist RDAP wajib parsing URL ketat (20/20; matcher naif
salah 12/20). (6) Batas 5 pemeriksaan ditetapkan GLOBAL via lease DB
bersama, bukan per instance. Semua bukti berasal dari VM ini — BUKAN dari
runtime artifact produksi; uji ulang staging (U-1) tetap wajib.

**Hasil revisi v2.2 (7 Nov 2026 — `SSRF_SPIKE_V22.md`, 11/11 PASS):** empat
tindak lanjut evaluasi akhir ChatGPT atas v2.1. (1) Siklus hidup slot
semaphore DNS diperjelas: slot dilepas HANYA saat promise DNS asli settle
atau absolute cap 30 dtk — tidak pernah hanya karena `Promise.race`
timeout; antrean FIFO berbatas (maks 4, tunggu 5 dtk); lookup background
dibatasi `maxActive + maxQueue` = 8 per proses; metrik + ambang alert
ditetapkan (6/6 PASS, termasuk temuan samping: timer penolakan race
TIDAK BOLEH di-unref). (2) Atomicity lease global ditetapkan PER DATABASE:
SQLite (live) — single-statement ATAU `BEGIN IMMEDIATE`, keduanya TERBUKTI
(3 ronde × 8 proses → tepat 1 pemenang); PostgreSQL (target) — advisory
lock ATAU counter row, dengan peringatan bahwa single-statement
`INSERT ... SELECT ... WHERE COUNT(*)` TIDAK aman di PostgreSQL di bawah
`READ COMMITTED` (belum teruji di sini — wajib diuji di staging G6).
(3) Risiko NAT64 U-11 TETAP TERBUKA dengan rencana staging + daftar
dokumen egress yang harus diminta. (4) Bukti mitigasi produksi G0 dipisah
dari keputusan mitigasi: checklist bukti G0-E1..G0-E5 ditetapkan dan
dinyatakan eksplisit BELUM ADA karena mitigasi belum diaktifkan. Status
tetap: **DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED**.

**Hasil revisi v2.3 (7 Nov 2026 — `SSRF_SPIKE_V23.md`, 13/13 PASS,
dijalankan ulang 2×):** satu keberatan atas v2.2 — absolute cap berpotensi
membuka akumulasi lookup yang tidak pernah settle. (1) Kontrol ORPH-T0
membuktikan keberatan itu NYATA: tanpa batas orphaned, tiga gelombang
force-release menumbuhkan operasi hidup 2→4→6 tanpa batas. (2) v2.3
memisahkan penghitung slot semaphore dari penghitung operasi DNS orphaned:
operasi yang di-force-release tetap dihitung sampai promise aslinya settle
atau proses worker-nya benar-benar dihentikan. (3) Batas keras orphaned
(`orphanHardCap = 4` produksi): force-release hanya merebut slot bila
`orphaned < cap` — bila sudah di cap, slot tetap terpakai sebagai
"cap-deferred". Invarian yang ditegakkan dan dibuktikan: `orphaned ≤ cap`
SELALU dan `liveOps ≤ maxActive + cap` SELALU (ORPH-T1, gelombang
berulang). (4) Circuit breaker fail-closed: saat `orphaned ≥ cap`,
penerimaan lookup baru dihentikan (`DNS_CIRCUIT_OPEN`, 0 lookup baru
dimulai — ORPH-T2); breaker menutup hanya saat `orphaned ≤ 1`
(hysteresis), dan gelombang kedua tetap berbatas (ORPH-T3). (5) Pemulihan
lewat isolasi DNS worker anak-proses: kill `SIGKILL` TERBUKTI menghentikan
operasi yang menggantung (`orphaned` 2→0, breaker menutup, worker baru
melayani — ORPH-T4); worker thread dievaluasi dan DITOLAK sebagai
pengganti (berbagi memori/resolver induk). (6) Metrik orphaned baru
(aktif, total force-release, high-water mark) sesuai prediksi state
machine (ORPH-T5). (7) Seluruh SEM-01..SEM-06 diulang setelah perubahan
(SEM-R1..SEM-R6, 6/6 PASS). Semua bukti berasal dari VM ini — BUKAN dari
runtime artifact produksi; uji ulang staging (U-1) tetap wajib.

Tiga keputusan desain yang paling penting:

1. **Fail-closed, bukan fail-open.** Bila DNS gagal, hasil resolve meragukan,
   atau guard tidak dapat memastikan keamanan tujuan, pemeriksaan **ditolak** —
   bukan di-fetch "coba saja".
2. **IP pinning nyata, bukan DNS lookup seremonial.** Resolve lalu `fetch` biasa
   adalah teater keamanan: resolver fetch dapat mengembalikan IP berbeda (DNS
   rebinding / TOCTOU). Koneksi harus dibuat ke IP yang sudah divalidasi.
3. **Penolakan tidak membocorkan informasi.** URL yang ditolak guard tidak
   mengembalikan status HTTP, judul halaman, URL akhir, rantai redirect, atau
   kontrak dari target — hanya penolakan generik.

**Yang dipertahankan (non-negotiable):** histori tabel `checks`, 13 proyek katalog,
sistem scoring dan sinyal yang ada, perilaku scanner untuk URL publik yang sudah
terbukti benar, serta 3 URL acuan yang vonisnya harus tetap sama setelah perbaikan:
`scamsem.solbarn.cc` → BAHAYA 100, `binance.com` → LEBIH AMAN,
`ptah.trade/poa` → WASPADA.

---

## A. Rancangan arsitektur perbaikan

### A.1 Alur fetch aman end-to-end (diagram teks)

```
Pengguna menempel URL di UI Link Scanner
  └─ POST ./actions { action: "checkLink", args: { url } }     (tanpa auth — lihat §A.7)
       └─ checkLink (server/src/actions.ts)
            │
            ├─ [P1-2] GATE RATE LIMIT + KONKURENSI
            │    Tolak (429 + pesan generik) bila IP pemanggil melebihi kuota
            │    atau antrean penuh. Dicatat di log (bukan di tabel checks).
            │
            ├─ [P0-5] normalizeUrl() — DIPERKETAT (lihat §B.1)
            │    • Skema harus http:/https: (sudah ada — dipertahankan)
            │    • Tolak userinfo (username/password) apa pun
            │    • Tolak port di luar 80/443 (P1-3; bila P1-3 belum
            │      diimplementasikan, catat port sebagai sinyal, jangan diblokir
            │      diam-diam — lihat §C)
            │    • Tolak hostname literal IP privat/loopback/link-local dan
            │      hostname localhost / metadata.* (setelah normalisasi bentuk IP)
            │    • Normalisasi hostname: lowercase, buang trailing dot,
            │      IDNA/punycode di-decode ke bentuk kanonik sebelum dicocokkan
            │    • Bila ditolak di sini → langsung ke [PENOLAKAN AMAN] (§A.6),
            │      TIDAK ADA fetch apa pun yang terjadi
            │
            ├─ [P0-1] resolveAndCheck(hostname) — BARU (implementasi stub
            │    di src/scanner/ssrf-guard.ts)
            │    • Resolve via DNS dengan timeout sendiri (mis. 5 detik)
            │    • Minta SEMUA alamat: A dan AAAA (lookup all, verbatim)
            │    • Normalisasi tiap alamat hasil resolve:
            │        – IPv4-mapped IPv6 (::ffff:a.b.c.d) → konversi ke IPv4
            │        – IPv6 literal → bentuk kanonik terkompresi
            │    • Validasi SETIAP alamat terhadap daftar blokir (§A.4):
            │      loopback, privat RFC1918, link-local, multicast,
            │      0.0.0.0/8, ULA fc00::/7, ::1, fe80::/10, ::/128
            │    • Bila SATU alamat saja terlarang → tolak SELURUH hostname
            │      (penyerang mengontrol DNS; satu jawaban jahat cukup)
            │    • Bila hostname tidak dapat di-resolve → tolak (fail-closed),
            │      jangan lanjutkan dengan "coba fetch saja"
            │    • Kembalikan: daftar IP yang diizinkan + TTL terendah
            │      (untuk batas umur pinning)
            │
            ├─ [P0-1] fetchWithPinnedIp(url, pinnedIps) — BARU
            │    • Koneksi DIBUAT KE IP YANG SUDAH DIVALIDASI, bukan ke
            │      hostname (lihat §A.2 — mekanisme pinning)
            │    • Timeout per hop 12 detik (dipertahankan dari kode live
            │      sebagai lantai) di dalam anggaran global (§A.5)
            │    • Streaming dengan batas ukuran: abort bila Content-Length
            │      melebihi batas ATAU byte yang terbaca melebihi batas
            │      (~400 KB untuk halaman, sesuai cap pemindaian yang ada)
            │    • Cek Content-Type: hanya HTML/teks yang dipindai; tipe lain
            │      (octet-stream, video, arsip) tidak diunduh penuh dan tidak
            │      dipindai sebagai HTML
            │    • TIDAK PERNAH mengikuti redirect otomatis (redirect: manual
            │      — dipertahankan)
            │
            ├─ [P0-3] LOOP REDIRECT (maks 6 hop — dipertahankan)
            │    Untuk setiap respons 301/302/303/307/308:
            │    • Ambil header Location → new URL(loc, current)
            │    • Jalankan ULANG SELURUH RANTAI untuk URL baru:
            │      normalizeUrl() → resolveAndCheck() → fetchWithPinnedIp()
            │      (protokol, userinfo, port, hostname, DNS, IP — semuanya)
            │    • Tolak skema non-http(s) pada Location (mis. file:, ftp:,
            │      javascript:, data:) — hentikan rantai sebagai PENOLAKAN,
            │      bukan sebagai "tidak terjangkau"
            │    • Hop ke-7 masih redirect → hentikan (perilaku lama:
            │      kembalikan null / "tidak terjangkau" — dipertahankan)
            │    • Rantai hostname dicatat sebagai bukti (perilaku lama —
            │      dipertahankan), TETAPI rantai yang berakhir pada penolakan
            │      guard TIDAK menampilkan host internal (lihat §A.6)
            │
            ├─ [P0-4] SCRIPT SRC — DINONAKTIFKAN SEMENTARA (lihat §D.2)
            │    • Selama mitigasi: JANGAN fetch <script src> eksternal sama
            │      sekali. Sinyal dari isi script tidak dihitung.
            │    • Bila diaktifkan kembali di masa depan: setiap script src
            │      melewati rantai guard yang sama persis (normalize →
            │      resolve → pin → fetch), chain redirect-nya TIDAK dibuang,
            │      dan cek known-bad berlaku pada chain tersebut.
            │
            ├─ [DIPERKETAT — v2] lookupRdap(domain)
            │    • Fetch ke https://rdap.org/domain/<domain> — host AWAL
            │      tetap rdap.org; domain berasal dari
            │      registrableDomain(hostname) yang sudah lolos guard
            │    • Redirect rdap.org mengikuti guard yang sama (bukan
            │      redirect:'follow' buta): setiap hop di-resolve, divalidasi,
            │      DAN di-pin — DAN host tujuan redirect harus ada dalam
            │      allowlist RDAP (§A.1a v2, diturunkan dari IANA RDAP
            │      bootstrap registry — bukan wildcard, bukan "*.rdap.org"
            │      sembarangan)
            │    • Timeout 12 detik per fetch (dipertahankan), di dalam
            │      anggaran global; abort RDAP mengikuti §A.5 v2
            │
            │    §A.1a Allowlist redirect RDAP (v2 — bukan wildcard)
            │    Sumber: IANA RDAP bootstrap registry, diunduh dan dibaca
            │    7 Nov 2026 — `https://data.iana.org/rdap/dns.json`
            │    (592 layanan) untuk domain, `https://data.iana.org/rdap/
            │    ipv4.json` dan `ipv6.json` untuk IP, `asn.json` untuk ASN.
            │    Aturan: (1) redirect RDAP HANYA boleh menuju origin yang
            │    tercantum dalam bootstrap registry untuk TLD yang
            │    bersangkutan (cocok persis pada scheme+host+path-prefix
            │    dari entri registry); (2) `rdap.org` sendiri selalu
            │    diizinkan sebagai titik awal; (3) 5 RIR diizinkan untuk
            │    lookup berbasis IP — `rdap.arin.net`, `rdap.apnic.net`,
            │    `rdap.db.ripe.net`, `rdap.lacnic.net`,
            │    `rdap.afrinic.net`; (4) entri `http://` (non-HTTPS) dalam
            │    registry DITOLAK — RDAP hanya lewat HTTPS (bila entri
            │    registry hanya menyediakan `http://`, lookup untuk TLD itu
            │    gagal dengan "RDAP tidak tersedia", bukan dialihkan ke
            │    HTTP); (5) host di luar daftar → redirect DITOLAK dan
            │    lookup dianggap "umur domain tidak diketahui".
            │    Host konkret untuk TLD yang relevan dengan katalog
            │    (per 7 Nov 2026): `.com` → `rdap.verisign.com/com/v1/`,
            │    `.net` → `rdap.verisign.com/net/v1/`, `.cc` →
            │    `tld-rdap.verisign.com/cc/v1/`, `.org` →
            │    `rdap.publicinterestregistry.org/rdap/`, `.app`/`.dev` →
            │    `pubapi.registry.google/rdap/`, `.xyz` →
            │    `rdap.centralnic.com/xyz/`, `.ai`/`.cash`/`.live` →
            │    `rdap.identitydigital.services/rdap/`, `.fun`/`.online`/
            │    `.site` → `rdap.radix.host/rdap/`, `.trade` →
            │    `rdap.nic.trade/`, `.win` → `rdap.nic.win/`, `.id` →
            │    `rdap.pandi.id/rdap/`, `.link` →
            │    `rdap.uniregistry.net/rdap/`, `.ly` → `rdap.nic.ly/`,
            │    `.top` → `rdap.zdnsgtld.com/top/`.
            │    Pemeliharaan: file bootstrap di-cache server-side dan
            │    diunduh ulang **semingguan** (atau bila ada TLD baru yang
            │    gagal RDAP); bila unduhan gagal, pakai cache terakhir dan
            │    catat di log (jangan gagal terbuka); perubahan entri
            │    dicatat dengan tanggal. Daftar lengkap 592 layanan TIDAK
            │    ditulis manual di kode — kode membaca file bootstrap yang
            │    di-cache, sehingga penambahan TLD baru oleh IANA ikut
            │    tanpa perubahan kode.
            │
            ├─ [TIDAK BERUBAH] Pemindaian sinyal + scoring
            │    • Umur domain (RDAP), connect-wallet, signing code, bahasa
            │      iming-iming, kode tersamar, tautan resmi, alamat kontrak,
            │      daftar domain drainer (solbarn.cc, sharkmoon.tech —
            │      termasuk di rantai redirect)
            │    • Skor 0–100 transparan per sinyal; pemetaan vonis ke
            │      klasifikasi 4 tingkat (CLASSIFICATION.md) tidak berubah
            │
            ├─ [TIDAK BERUBAH] Penyimpanan hasil
            │    • SATU baris ke tabel checks HANYA bila pemeriksaan benar-
            │      benar dilakukan (fetch terjadi). Baris berisi final_url,
            │      http_status, page_title, skor, sinyal, rantai redirect —
            │      sama seperti sekarang
            │    • URL yang DITOLAK guard: TIDAK disimpan ke tabel checks
            │      (lihat §A.6). Upaya yang diblokir dicatat di log keamanan
            │      terpisah (hash URL + alasan + waktu — tanpa isi respons)
            │
            └─ Kembalikan ke pengguna:
                 • Hasil normal: verdict + skor + sinyal + bukti (tidak berubah)
                 • Penolakan guard: respons penolakan aman (§A.6)
```

### A.1a Allowlist redirect RDAP (v2 — bukan wildcard)

Aturan lengkap ada di kotak §A.1 di atas; ringkasnya di sini sebagai jangkar
untuk semua referensi §A.1a di dokumen ini:

- **Sumber:** IANA RDAP bootstrap registry — `https://data.iana.org/rdap/dns.json`
  (592 layanan, diunduh dan dibaca 7 Nov 2026), `ipv4.json`/`ipv6.json` (5 RIR),
  `asn.json`. Bukan wildcard, bukan "*.rdap.org" sembarangan.
- **Aturan:** redirect RDAP HANYA boleh menuju origin yang tercantum dalam
  bootstrap registry untuk TLD yang bersangkutan (cocok persis pada
  scheme+host+path-prefix); `rdap.org` selalu diizinkan sebagai titik awal;
  5 RIR (`rdap.arin.net`, `rdap.apnic.net`, `rdap.db.ripe.net`,
  `rdap.lacnic.net`, `rdap.afrinic.net`) diizinkan untuk lookup berbasis IP;
  entri `http://` DITOLAK (RDAP hanya HTTPS); host di luar daftar → redirect
  DITOLAK, lookup jadi "umur domain tidak diketahui".
- **Semua redirect RDAP tetap melalui DNS validation + IP pinning** — sama
  seperti redirect URL biasa (§A.2a, §A.3).
- **Pemeliharaan:** file bootstrap di-cache server-side, diunduh ulang
  semingguan (atau bila ada TLD baru yang gagal RDAP); bila unduhan gagal,
  pakai cache terakhir dan catat di log; daftar lengkap 592 layanan TIDAK
  ditulis manual di kode.

### A.1b DNS: API resolver, TTL, dan masa berlaku pinning (v2.1)

- **API resolver yang DITETAPKAN:** `dns/promises` `resolve4(hostname,
  { ttl: true })` dan `resolve6(hostname, { ttl: true })` — satu-satunya
  API yang mengembalikan TTL per alamat (`[{ address, ttl }]`).
  **Bukti** (`SSRF_SPIKE_V21.md` TEST 3, Node v24.22.1):
  `resolve4('example.com', {ttl:true})` → `[{"address":"198.18.228.151",
  "ttl":15}]`; `resolve6` di sandbox mengembalikan `ENODATA` (dicatat,
  bukan kegagalan API); `dns.lookup({all:true})` mengembalikan
  `[{"address":"198.18.228.151","family":4}]` — **TIDAK ada field TTL**.
  Karena itu `dns.lookup` TIDAK BOLEH dipakai untuk resolve yang
  membutuhkan TTL; `lookup` hanya dipakai bila dibutuhkan perilaku
  `verbatim` (mis. di dalam callback `lookup` Agent pinning — dan di
  sana pun TTL tidak relevan karena IP sudah divalidasi sebelumnya).
- **TIDAK ADA caching DNS antar pemeriksaan.** Rancangan ini secara
  eksplisit TIDAK mengklaim TTL-aware caching: tidak ada cache hasil
  resolve yang dipakai ulang antar hop atau antar pemeriksaan. Setiap hop
  melakukan resolve segar. TTL yang diterima DICATAT (di log, bersama
  daftar IP) untuk observabilitas — dan TIDAK dipakai sebagai dasar
  keputusan blokir semata (TTL rendah saja bukan bukti jahat; rebinding
  sudah ditangani oleh pinning, bukan oleh TTL).
- **Masa berlaku pinning:** pin (daftar IP yang divalidasi) berlaku
  HANYA selama satu hop fetch yang memakainya. Begitu hop selesai
  (respons diterima, redirect diikuti, atau hop gagal), pin kedaluwarsa;
  hop berikutnya WAJIB resolve segar. Tidak ada pin yang dipakai ulang
  antar hop, antar redirect, atau antar pemeriksaan — ini menutup celah
  "pin kedaluwarsa lalu DNS berubah" secara konstruksi.
- **Kegagalan resolve:** bila `resolve4` dan `resolve6` keduanya gagal
  (NXDOMAIN / timeout / ENODATA untuk keduanya) → tolak (fail-closed),
  jangan lanjutkan dengan "coba fetch saja". Bila hanya satu keluarga
  yang gagal (mis. hanya AAAA yang ENODATA) → lanjutkan dengan keluarga
  yang berhasil; catat di log.

### A.1c Pencocokan allowlist RDAP: parsing URL ketat (v2.1)

Pencocokan origin + path-prefix pada allowlist RDAP (§A.1a) WAJIB memakai
parsing WHATWG URL (`new URL()`), **bukan pencocokan string sederhana**
(`includes`/`startsWith` pada URL mentah). **Bukti**
(`SSRF_SPIKE_V21.md` TEST 4, 20/20 PASS): matcher ketat meloloskan 8
kasus legit dan menolak 12 kasus serangan; matcher naif `includes()`
salah pada **12 dari 20 kasus** (antara lain meloloskan
`rdap.verisign.com.evil.com`, `com-evil`, userinfo, port 8443, path huruf
besar, dot-segment, dan host evil dengan string allowlist di query).

Aturan matcher (mengikat untuk URL awal RDAP DAN setiap hop redirect RDAP):

1. Parse dengan `new URL()`; bila gagal parse → tolak.
2. Skema HARUS `https:` (entri `http://` dalam registry ditolak — §A.1a).
3. Tolak bila ada userinfo (`username`/`password` tidak kosong) — host
   sebenarnya adalah bagian setelah `@`.
4. Hostname dibandingkan PERSIS (setelah lowercase; URL sudah
   me-lowercase host) setelah strip SATU trailing dot FQDN
   (`rdap.verisign.com.` → `rdap.verisign.com`). Tidak ada suffix match,
   tidak ada wildcard.
5. Port HARUS kosong atau `443` (port default HTTPS). Port lain → tolak.
6. Path HARUS sama persis dengan prefix entri, ATAU diawali prefix + `/`
   (segment-aware — prefix tanpa slash akhir wajib diikuti `/`). Contoh:
   prefix `/com/v1/` cocok dengan `/com/v1/domain/x` dan `/com/v1/`,
   tetapi TIDAK cocok dengan `/com-evil/v1/` atau `/comv1/`.
7. Path bersifat case-sensitive: `/COM/V1/` DITOLAK (fail-closed —
   path RDAP case-sensitive).
8. Dot-segment (`/com/v1/../evil`) dinormalisasi oleh parser URL menjadi
   `/com/evil` SEBELUM pencocokan — hasilnya tidak cocok → tolak.
9. Path yang mengandung escape persen (`/%63om/v1/`) TIDAK di-decode
   sebelum pencocokan — `pathname` apa adanya tidak cocok → tolak.
10. Query dan fragment diabaikan dalam pencocokan (tidak memengaruhi
    keputusan).

Matcher ini diuji unit dengan 20 kasus di atas (RD-01..RD-20, §D.4.7
v2.1); setiap perubahan allowlist atau matcher WAJIB mengulang ke-20
kasus itu.

### A.2 IP pinning — mekanisme yang benar (inti rancangan ini)

**Masalah yang harus dipecahkan.** Pola yang SALAH dan masih sering ditulis:

```text
const addrs = await dns.lookup(host, { all: true });  // resolve sekali
if (addrs.some(isBlocked)) throw ...;
await fetch(url);   // ❌ SALAH: fetch me-resolve ulang hostname sendiri.
                    //    Resolver fetch dapat mengembalikan IP berbeda
                    //    (DNS rebinding / TOCTOU). Validasi di atas sia-sia.
```

Validasi DNS hanya bermakna bila **soket yang dibuka terhubung ke IP yang
sudah divalidasi**. Ada tiga pendekatan; rancangan ini merekomendasikan
**Pendekatan 1** sebagai utama, dengan **Pendekatan 2** sebagai fallback bila
runtime tidak mendukungnya, dan **Pendekatan 3** sebagai lapisan infra (P2).

#### Pendekatan 1 (UTAMA — TERBUKTI di spike v2): custom lookup pada HTTP agent

- Prinsip: berikan ke stack HTTP sebuah fungsi `lookup(hostname)` yang
  **mengembalikan persis IP yang sudah divalidasi** (dan hanya itu), sehingga
  resolver internal fetch tidak pernah dipanggil untuk hostname tersebut.
- **Hasil spike (v2, `SSRF_SPIKE_RUNTIME.md`):** di runtime Bun 1.4.4, Node
  `http.Agent` / `https.Agent` menerima opsi `lookup` dan lookup TERBUKTI
  dihormati — untuk HTTP (`B1-fixed`: `200:srv-ok host=pinned.test:18080`)
  maupun HTTPS dengan verifikasi sertifikat terhadap hostname asli (`W2`:
  `200:tls-ok host=test.example:18443`; hostname mismatch DITOLAK dengan
  `ERR_TLS_CERT_ALTNAME_INVALID` pada `W3`). **Jalur ini memakai API
  `http`/`https` Node — BUKAN `fetch` global** (lihat §A.2a).
- **Koreksi v1:** rancangan v1 menyebut undici (`new Agent({ connect: {
  lookup } })`) sebagai salah satu jalan Pendekatan 1. Spike membuktikan
  API itu **tidak berlaku di undici v7** (gagal `Invalid IP address:
  undefined`); cara undici v7 yang benar adalah `.compose()` +
  `interceptors.dns({ lookup })` — dan cara itu hanya terbukti di Node 24,
  bukan di runtime Bun (Bun tidak memiliki undici bawaan). **Undici TIDAK
  dijadikan dependensi utama di runtime Bun.** Bila di masa depan dibutuhkan
  fetcher Node terpisah, undici v7 via `.compose()` adalah opsi yang
  terbukti — lihat §A.2a.
- Aturan implementasi dari spike (wajib):
  1. Callback `lookup` HARUS menghormati `options.all`: Bun memanggil
     lookup dengan `options = {hints:32, all:true}` — kembalikan array
     `[{address, family}]` bila `all` benar, alamat tunggal bila tidak.
     Callback yang selalu mengembalikan alamat tunggal gagal
     (`ERR_INVALID_IP_ADDRESS`, B1).
  2. Lookup TIDAK BOLEH memanggil DNS sistem untuk hostname yang diperiksa:
     ia mengembalikan persis IP yang sudah divalidasi oleh
     `resolveAndCheck()` (pinning), bukan hasil resolve ulang.
  3. Satu agent sekali pakai per pemeriksaan (atau per hop), dengan lookup
     yang mengembalikan daftar IP lolos itu — pilih satu secara
     deterministik dan catat pilihannya.
- Alur per hop:
  1. `resolveAndCheck(host)` → daftar IP lolos (mis. `[93.184.216.34]`).
  2. Buat agent sekali pakai dengan `lookup` yang mengembalikan IP itu
     (pilih satu; bila ada beberapa IP lolos, pilih satu secara deterministik
     — mis. yang pertama — dan catat pilihannya; JANGAN melakukan round-robin
     ke IP yang belum divalidasi).
  3. Fetch dengan dispatcher agent tersebut.
- Kelebihan: TLS tetap bekerja normal — SNI dan verifikasi sertifikat memakai
  **hostname asli**, karena URL yang di-fetch tetap `https://hostname/...`
  (hanya resolusi alamatnya yang dipin). Tidak ada Host-header manual, tidak
  ada risiko sertifikat untuk IP literal. HTTP/2 dan virtual hosting tetap
  bekerja.
- Kekurangan: bergantung pada kemampuan runtime menyediakan custom lookup.
  `fetch` global (WHATWG) tidak menerima agent/dispatcher — TERBUKTI di
  spike: `Bun.fetch` mengabaikan opsi `dispatcher` secara diam-diam (B2b)
  dan tidak ada jalan custom lookup lewat `fetch` global. Karena itu jalur
  terp-pin HARUS memakai `http`/`https.request` secara eksplisit (bukan
  `undici.request` — lihat koreksi di atas). **Spike P0-1a SUDAH membuktikan
  runtime Bun 1.4.4 mendukung lookup kustom** (B1-fixed, W2, W3); yang masih
  wajib adalah uji ulang di staging artifact produksi (U-1 laporan spike),
  karena spike dijalankan pada Bun CLI di VM — bukan pada runtime artifact
  produksi. Bila uji staging produksi membuktikan lookup TIDAK didukung di
  sana → jatuh ke Pendekatan 2, atau ke alternatif §A.2a (fetcher terpisah /
  egress proxy).

#### Pendekatan 2 (FALLBACK — TERBUKTI di spike v2): koneksi literal ke IP + Host header + SNI manual

- Prinsip: ganti hostname di URL dengan IP literal yang sudah divalidasi,
  lalu pulihkan identitas hostname lewat header dan TLS:
  1. `https://93.184.216.34/path` dengan header `Host: hostname-asli`.
  2. TLS: `servername` (SNI) = hostname asli, dan verifikasi sertifikat
     terhadap hostname asli (bukan terhadap IP) — JANGAN menonaktifkan
     verifikasi sertifikat (`rejectUnauthorized: false` adalah **dilarang
     keras**; itu menukar SSRF dengan MITM).
  3. Untuk IPv6 literal, URL memakai bracket: `https://[2606:4700::...]/`.
- **Hasil spike (v2):** TERBUKTI di Bun 1.4.4 lewat `Bun.fetch` dengan opsi
  `tls: { serverName }` — `W1`: fetch ke IP literal + `tls.serverName =
  'test.example'` berhasil (`status=200`, sertifikat diverifikasi terhadap
  hostname asli); `W5`: override header `Host` diizinkan Bun (server
  melihat `Host: test.example`); `V3`: fetch ke IP literal TANPA
  `serverName` DITOLAK (`ERR_TLS_CERT_ALTNAME_INVALID`) — verifikasi aktif.
  Juga TERBUKTI lewat `Bun.connect` socket (`V1`: tulis di handler `open`,
  `data 9ms: HTTP/1.1 200 OK`; `V4`: Bun↔Bun TLS normal) dan lewat
  Node `https.request` (`T3a`: IP literal + `servername` + `Host` →
  `authorized=true`; `T3c`: `servername` SALAH → `ERR_TLS_CERT_ALTNAME_INVALID`).
- **Peringatan spike yang wajib ditaati:**
  - `servername` HARUS diisi eksplisit di semua jalur. Node terbukti
    menurunkan SNI dari header `Host` bila `servername` tidak diisi (T3b:
    request tanpa `servername` BERHASIL karena `Host: test.example`
    dipakai sebagai SNI; tanpa header `Host` request yang sama DITOLAK).
    Perilaku implisit ini TIDAK BOLEH diandalkan — ia dapat berbeda antar
    versi runtime dan menyembunyikan hilangnya verifikasi hostname.
  - Pada `Bun.connect`, tulis HANYA di dalam handler `open` (setelah
    handshake TLS selesai). Menulis sebelum `open` tidak diteruskan
    (B3: tidak ada respons dalam 2–8 detik — artefak cara uji, bukan
    kegagalan TLS).
  - Verifikasi sertifikat terhadap hostname asli TERBUKTI aktif di semua
    jalur (V3, W3, T3c) — dan `rejectUnauthorized: false` TIDAK PERNAH
    dibutuhkan dalam satu pun uji yang lolos.
- Kelebihan: tidak bergantung pada custom lookup; bekerja di runtime apa pun
  yang mengizinkan koneksi TCP/TLS manual.
- Kekurangan / risiko yang harus ditangani:
  - HTTP/2: otoritas (`:authority`) harus hostname asli, bukan IP — perlu
    penanganan eksplisit; bila tidak bisa, paksa HTTP/1.1 untuk fetch ini.
    (Tidak diuji dalam spike — server uji memakai HTTP/1.1; lihat U-3
    laporan spike.)
  - Virtual hosting berbasis SNI/Host yang tidak konsisten dapat mengembalikan
    konten host lain — mitigasi: SNI dan Host header SELALU hostname asli,
    dan tolak bila sertifikat tidak cocok dengan hostname asli.
  - Redirect `Location` relatif harus di-resolve terhadap URL hostname asli,
    bukan URL IP literal (simpan URL kanonik hostname secara terpisah dari
    URL koneksi).
  - Lebih banyak kode rawan salah — karena itu pendekatan ini adalah fallback,
    bukan utama.
- Keputusan: **Pendekatan 1 adalah utama; Pendekatan 2 adalah fallback** —
  diputuskan dari hasil spike (§A.2a). Kedua pendekatan harus lolos
  **uji pinning** yang sama (§D.4): DNS yang membalik jawaban antara resolve
  pertama dan kedua harus tetap menghasilkan koneksi ke IP pertama (yang
  divalidasi) — atau penolakan.

#### Pendekatan 3 (LAPISAN INFRA, P2): egress proxy / fetcher terisolasi

- Fetcher berjalan di subnet tanpa rute ke jaringan internal; egress hanya
  lewat proxy yang menerapkan allowlist DNS dan memblokir metadata cloud di
  firewall/security group.
- Ini adalah pertahanan **kedua**, bukan pengganti guard di kode: bila guard
  kode lolos (bug), infra masih menahan. Sebaliknya, infra saja tanpa guard
  kode tidak cukup — guard akan ikut terbawa saat migrasi stack, infra belum
  tentu.
- Di luar ruang lingkup P0/P1; dicatat sebagai P2 karena butuh akses infra
  yang saat ini tidak tersedia/didokumentasikan.

### A.2a Hasil spike runtime (v2) dan alternatif bila pinning tidak didukung

Rincian lengkap: `SSRF_SPIKE_RUNTIME.md` (7 Nov 2026). Ringkasan putusan:

| Pendekatan | Putusan | Bukti spike |
| --- | --- | --- |
| Pendekatan 1 — custom lookup (Node `http`/`https` Agent `lookup` di Bun) | ✅ TERBUKTI — UTAMA | B1-fixed, W2, W3 |
| Pendekatan 2 — IP literal + SNI (Bun.fetch `tls.serverName` + header `Host`) | ✅ TERBUKTI — FALLBACK | W1, W5, T3a, T3c |
| Pendekatan 2 — IP literal + SNI (Bun.connect socket, tulis di `open`) | ✅ TERBUKTI dengan catatan — butuh HTTP manual | V1, V4 |
| Custom lookup via `fetch` global | ❌ TIDAK DIDUKUNG | B2a, B2b |
| undici v7 dns interceptor (Node) | ✅ TERBUKTI di Node 24, hanya via `.compose()` | T1, T1b, T2, T2c |
| Egress proxy via `Bun.fetch({ proxy })` | ✅ TERBUKTI dihormati | B6 |

**Yang dinyatakan TIDAK AMAN dan dilarang:** pola "resolve lalu `fetch`
biasa" (teater keamanan — TOCTOU/DNS rebinding); `rejectUnauthorized:
false` dalam pendekatan apa pun; mengandalkan penurunan SNI implisit dari
header `Host` (T3b); callback `lookup` yang mengabaikan `options.all`
(B1); menulis ke socket `Bun.connect` sebelum handler `open` (B3).

**Bila di staging produksi ternyata TIDAK ADA pendekatan yang didukung**
(skenario yang sudah tidak terjadi di Bun CLI, tetapi wajib disiapkan —
lihat U-1 laporan spike), evaluasi dua alternatif berikut secara jujur:

| Alternatif | Cara kerja | Pro | Kontra | Putusan |
| --- | --- | --- | --- | --- |
| **Fetcher terpisah** | Proses/komponen fetch khusus (Node 24 + undici v7 via `.compose()` + `interceptors.dns`, ATAU Node `https` Agent `lookup`) yang menerima hanya URL + IP yang sudah divalidasi dari proses utama, melakukan koneksi terp-pin, dan mengembalikan body + metadata. Komunikasi antar proses lewat channel lokal yang diautentikasi (bukan HTTP terbuka). | Pinning TERBUKTI di Node 24 (T1, T1b, T2, T2c); mengisolasi kode fetch berbahaya dari proses utama; dapat diuji dan di-restart independen. | Biaya operasional: satu proses tambahan + IPC + deployment; permukaan baru (channel IPC harus diautentikasi — bila tidak, menjadi SSRF lewat jalur lain); latensi antar proses; perlu penjaga agar fetcher tidak dapat dipanggil langsung oleh pengguna. | **Rencana cadangan pertama.** Dipilih bila staging produksi membuktikan Agent `lookup` Bun tidak bekerja di sana. Estimasi tambahan: +Besar (lihat §F v2). |
| **Egress proxy** | Semua koneksi keluar scanner lewat proxy egress khusus yang memvalidasi tujuan sendiri (resolve + tolak privat/metadata + pin) sebelum meneruskan; scanner tidak lagi membuka koneksi langsung. | Satu titik kontrol untuk semua egress; pertahanan berlaku bahkan bila guard kode lolos; opsi `proxy` pada `Bun.fetch` TERBUKTI dihormati (B6). | Proxy menjadi komponen kritis baru (harus dibuat/dikonfigurasi/dioperasikan — tidak ada saat ini); proxy yang salah konfigurasi = bypass total; TLS end-to-end lewat proxy butuh CONNECT + verifikasi sertifikat di sisi klien tetap berjalan; biaya infra + latensi. | **Rencana cadangan kedua (P2).** Dipilih bila fetcher terpisah pun tidak memungkinkan, atau sebagai lapisan kedua setelah P0. Bukan pengganti guard di kode. |

**Verifikasi sertifikat TLS tidak boleh dinonaktifkan dalam pendekatan apa
pun** — termasuk kedua alternatif di atas. Setiap alternatif harus lolos uji
yang sama: sertifikat dengan hostname tidak cocok (CA sama) DITOLAK
(`ERR_TLS_CERT_ALTNAME_INVALID`, seperti T2c/W3), dan `rejectUnauthorized:
false` tidak muncul di kode mana pun (diperiksa dengan grep pada review).

### A.3 Di mana guard dipanggil (checklist penempatan)

| Titik | Guard yang dipanggil | Keterangan |
| --- | --- | --- |
| `checkLink` — sebelum apa pun | Rate limit + konkurensi (P1-2) | Sebelum fetch; setelah validasi skema zod |
| `normalizeUrl()` | `checkUrlAllowed()` diperluas (§B.1) | Literal IP/hostname/userinfo/port |
| URL awal → fetch | `resolveAndCheck()` + `fetchWithPinnedIp()` | P0-1 |
| Setiap hop redirect | Seluruh rantai (§A.1) diulang | P0-3 |
| Setiap `<script src>` | (Dinonaktifkan sementara; bila aktif: rantai penuh) | P0-4 / §D.2 |
| `lookupRdap()` | Guard pada setiap hop redirect rdap.org + allowlist RDAP dari IANA bootstrap (§A.1a v2) | P0-3 (bagian RDAP) |
| Penyimpanan `checks` | TIDAK menyimpan hasil dari URL yang ditolak | §A.6 |
| Respons ke pengguna | Respons penolakan aman | §A.6 |

**Aturan penempatan:** guard dipanggil di **satu fungsi pembungkus fetch**
(`fetchGuarded()` — baru, lihat §B) yang dipakai oleh SEMUA jalur fetch
(halaman, redirect, script, RDAP). Tidak boleh ada jalur fetch lain yang
mem-bypass pembungkus ini. Code review harus memverifikasi: `grep` untuk
`fetch(` di `actions.ts` — setelah perbaikan, semua pemanggilan fetch harus
melewati `fetchGuarded()`.

### A.4 Daftar blokir (satu sumber kebenaran)

Satu modul — `src/scanner/ssrf-guard.ts` (diperluas, §B.4) — menjadi satu-satunya
tempat daftar blokir didefinisikan. Kode live mengimpor dari modul ini (atau
salinannya yang setara di artifact), bukan mendefinisikan ulang daftar di
tempat lain.

**Sumber klasifikasi (v2):** daftar ini diturunkan dari **IANA Special-Purpose
Address Registries** — IPv4 dan IPv6 — yang diunduh dan dibaca pada 7 Nov 2026
(terakhir diperbarui IANA **9 Oktober 2025**):
- `https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.txt`
- `https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.txt`

Aturan penurunan: **blokir semua rentang yang kolom `Globally Reachable`-nya
FALSE** (atau yang kolom `Destination`-nya FALSE), DITAMBAH rentang yang secara
eksplisit diputuskan pemilik (CGNAT). Rentang dengan `Globally Reachable:
TRUE` (mis. anycast `192.0.0.9/32`, `192.0.0.10/32`, `192.31.196.0/24`,
`192.52.193.0/24`) TIDAK diblokir secara individual — tetapi seluruh
`192.0.0.0/24` diblokir sebagai blok (IANA: "not useable unless by virtue
of a more specific reservation"), sehingga anycast di dalamnya ikut
terblokir; ini dicatat sebagai keputusan sadar (bukan kelalaian), karena
tidak ada server web legit yang dijangkau publik dari `192.0.0.0/24`.

#### A.4.1 IPv4 — yang diblokir (tujuan)

| Rentang | Nama (IANA) | RFC |
| --- | --- | --- |
| `0.0.0.0/8` | This network | RFC 791 |
| `10.0.0.0/8` | Private-Use | RFC 1918 |
| `100.64.0.0/10` | Shared Address Space (CGNAT) | RFC 6598 — **diblokir per keputusan pemilik v2** |
| `127.0.0.0/8` | Loopback | RFC 1122 |
| `169.254.0.0/16` | Link Local (termasuk metadata `169.254.169.254`) | RFC 3927 |
| `172.16.0.0/12` | Private-Use | RFC 1918 |
| `192.0.0.0/24` | IETF Protocol Assignments (blok penuh, lihat catatan di atas) | RFC 6890 |
| `192.0.2.0/24` | Documentation (TEST-NET-1) | RFC 5737 |
| `192.168.0.0/16` | Private-Use | RFC 1918 |
| `198.18.0.0/15` | Benchmarking | RFC 2544 |
| `198.51.100.0/24` | Documentation (TEST-NET-2) | RFC 5737 |
| `203.0.113.0/24` | Documentation (TEST-NET-3) | RFC 5737 |
| `240.0.0.0/4` | Reserved | RFC 1112 |
| `255.255.255.255/32` | Limited Broadcast | RFC 919 |

#### A.4.2 IPv6 — yang diblokir (tujuan)

| Rentang | Nama (IANA) | RFC |
| --- | --- | --- |
| `::1/128` | Loopback Address | RFC 4291 |
| `::/128` | Unspecified Address | RFC 4291 |
| `::ffff:0:0/96` | IPv4-mapped Address | RFC 4291 — **dikonversi ke IPv4 tertanam lalu divalidasi terhadap tabel IPv4** (§A.4.3) |
| `64:ff9b::/96` | IPv4-IPv6 Translation (NAT64 Well-Known Prefix) | RFC 6052 — **ekstrak IPv4 tertanam (32 bit terakhir) lalu validasi terhadap tabel IPv4** (§A.4.3) |
| `64:ff9b:1::/48` | IPv4-IPv6 Translation (NAT64 local-use) | RFC 8215 + RFC 6052 §2.2 — **KOREKSI v2.1:** IPv4 TIDAK di 32 bit terakhir; 16 bit di bit 48..63 (byte 6..7) + 16 bit di bit 72..87 (byte 9..10), oktet "u" byte 8 WAJIB 0 (bila ≠ 0 → malformed, tolak). Ekstrak lalu validasi terhadap tabel IPv4 (§A.4.3 butir 2) |
| `100::/64` | Discard-Only Address Block | RFC 6666 |
| `100:0:0:1::/64` | Dummy IPv6 Prefix | RFC 9780 |
| `2001::/32` | TEREDO | RFC 4380 — **ekstrak IPv4 tertanam (32 bit terakhir) lalu validasi** (§A.4.3) |
| `2001:2::/48` | Benchmarking | RFC 5180 |
| `2001:10::/28` | Deprecated (previously ORCHID) | RFC 4843 |
| `2001:20::/28` | ORCHIDv2 | RFC 7343 |
| `2001:db8::/32` | Documentation | RFC 3849 |
| `2002::/16` | 6to4 | RFC 3056 — **ekstrak IPv4 tertanam (bit 16–47) lalu validasi** (§A.4.3) |
| `3fff::/20` | Documentation | RFC 9637 |
| `fc00::/7` | Unique-Local (ULA) | RFC 4193 |
| `fd00:ec2::254/128` | AWS EC2 instance metadata (IPv6) — BUKAN entri IANA; sumber: dokumentasi AWS | AWS docs |
| `fe80::/10` | Link-Local Unicast | RFC 4291 |
| `ff00::/8` | Multicast | RFC 4291 |

Tidak diblokir (dan dicatat alasannya): `2001::/23` IETF Protocol
Assignments (blok payung dengan banyak pengecualian spesifik yang
`Globally Reachable: TRUE`, mis. `2001:1::1/128`, `2001:1::2/128`,
`2001:4:112::/48`, `2620:4f:8000::/48`) — yang diblokir adalah
sub-rentang spesifik di atas (`2001::/32`, `2001:2::/48`,
`2001:10::/28`, `2001:20::/28`, `2001:db8::/32`), bukan seluruh
`2001::/23`, agar tidak memblokir layanan anycast legit. `2001:30::/28`
(Drone Remote ID DETs) dan `5f00::/16` (SRv6 SIDs) juga tidak diblokir
(`Globally Reachable: TRUE` menurut IANA) — keduanya bukan alamat server
web, tetapi pemblokirannya tidak dibenarkan oleh registry; bila di masa
depan terbukti disalahgunakan, tambahkan sebagai entri khusus dengan
catatan.

#### A.4.3 Aturan khusus: prefiks translasi, IPv4-mapped, dan zone identifier

1. **IPv4-mapped IPv6** (`::ffff:a.b.c.d`): konversi ke IPv4 tertanam,
   lalu validasi terhadap tabel IPv4 (§A.4.1). `::ffff:127.0.0.1` DITOLAK
   (loopback); `::ffff:93.184.216.34` DIIZINKAN.
2. **NAT64 — KOREKSI v2.1 (RFC 6052 §2.2).** Aturan v2 ("ekstrak IPv4
   tertanam di 32 bit terakhir" untuk kedua prefix) **SALAH untuk
   `64:ff9b:1::/48`** dan diperbaiki di sini. Format RFC 6052 §2.2:
   IPv4 dikodekan mengikuti prefix, most significant bits first, dengan
   oktet "u" yang dicadangkan di bit 64..71 yang WAJIB nol — sehingga
   posisi IPv4 bergantung pada panjang prefix:
   - **`64:ff9b::/96` (WKP):** IPv4 = 32 bit terakhir (byte 12..15).
     `64:ff9b::7f00:1` (= 127.0.0.1) DITOLAK; `64:ff9b::5db8:d822`
     (= 93.184.216.34) DIIZINKAN.
   - **`64:ff9b:1::/48` (local-use, RFC 8215):** IPv4 = 16 bit pertama di
     bit 48..63 (byte 6..7), lalu oktet "u" di bit 64..71 (byte 8, WAJIB
     0), lalu 16 bit terakhir di bit 72..87 (byte 9..10). Contoh Tabel 1
     RFC 6052: prefix `2001:db8:122::/48` + `192.0.2.33` →
     `2001:db8:122:c000:2:2100::` (`c000` = 192.0, `00` = u, `0221` =
     2.33). Bila byte 8 ≠ 0, alamat MALFORMED → tolak (fail-closed),
     jangan ekstrak.
   - **Dampak bug v2 (terbukti di `SSRF_SPIKE_V21.md` TEST 1, 10/10
     PASS):** aturan "32 bit terakhir" untuk /48 memblokir `8.8.8.8`
     yang sah — `64:ff9b:1:808:8:800::` diekstrak menjadi `0.0.0.0` →
     BLOCK (false positive) — DAN meloloskan `192.168.1.1` yang
     disembunyikan di suffix — `64:ff9b:1:c0a8:1:100:5db8:d822`
     diekstrak menjadi `93.184.216.34` → ALLOW (bypass). Aturan benar
     mengekstrak `192.168.1.1` → BLOCK pada kedua kasus.
   - IANA mencatat `64:ff9b::/96` sebagai `Globally Reachable: TRUE` —
     karena itu prefiksnya sendiri TIDAK diblokir; yang divalidasi
     adalah IPv4 hasil translasi. Hal yang sama berlaku untuk /48.
   - Catatan: guard hanya mengekstrak untuk DUA prefix NAT64 yang
     dikenal di atas. Prefix translasi network-specific (NSP) lain di
     luar kedua prefix ini TIDAK diekstrak — risikonya dicatat di §G
     (U-11).
3. **TEREDO** (`2001::/32`) dan **6to4** (`2002::/16`): keduanya
   menanamkan alamat IPv4 (TEREDO: 32 bit terakhir; 6to4: bit 16–47).
   Prefiks DIBLOKIR penuh (sesuai tabel) — tidak perlu ekstraksi, karena
   kedua mekanisme transisi ini tidak dipakai oleh server web publik yang
   sah untuk dijangkau scanner.
4. **IPv6 zone identifier** (`%eth0`, mis. `fe80::1%eth0`, atau
   `http://[fe80::1%25eth0]/` dalam URL): zone ID adalah artefak antarmuka
   lokal dan TIDAK PERNAH valid sebagai tujuan internet. Aturan: (a) bila
   hostname mengandung `%` (atau `%25` yang ter-decode menjadi `%`),
   tolak SEBELUM resolve — URL dengan zone ID tidak pernah di-fetch;
   (b) `URL.hostname` yang mengandung `%` setelah parsing juga ditolak;
   (c) zone ID TIDAK PERNAH di-strip lalu dilanjutkan — strip-and-continue
   akan mengubah `fe80::1%eth0` menjadi `fe80::1` yang tetap terlarang,
   tetapi mengubah `::1%lo` menjadi `::1` yang juga terlarang; tidak ada
   kasus di mana strip menghasilkan alamat yang sah dan diinginkan.
5. **Bentuk IP literal non-desimal** (integer `2130706433`, oktal
   `0177.0.0.1`, heksadesimal `0x7f.0.0.1`/`0x7f000001`, bentuk pendek
   `127.1`): dinormalisasi ke bentuk kanonik desimal bertitik DAHULU
   (`normalizeIpLiteral()`), baru dicocokkan ke tabel. Bentuk yang tidak
   dapat dinormalisasi dengan pasti DITOLAK (fail-closed).
6. **Hostname terlarang** (selain alamat): `localhost` (termasuk
   `*.localhost`), `metadata.google.internal`, dan `metadata.*` (semua
   subdomain `metadata`) — suffix match, bukan hanya dua hostname eksak.
   Juga tolak hostname yang setelah decode IDNA/punycode menjadi salah
   satu dari pola di atas.

#### A.4.4 Pemeliharaan daftar blokir (cara pembaruan)

| Aspek | Ketentuan |
| --- | --- |
| Sumber | IANA Special-Purpose Address Registries (IPv4 + IPv6) — URL di atas. TIDAK memakai daftar dari blog/daftar pihak ketiga tanpa dasar registry. |
| Frekuensi | Diperiksa **setiap 6 bulan** (Januari dan Juli) dan setiap kali ada insiden SSRF baru atau perubahan besar IANA. Terakhir diperbarui IANA: 9 Okt 2025; terakhir dibaca tim: 7 Nov 2026. |
| Penanggung jawab | Pemilik proyek (Rama) menunjuk peninjau; implementor menjalankan pemeriksaan dan mencatat hasilnya di `SECURITY_REQUIREMENTS.md` §3.2. |
| Proses | (1) Unduh ulang kedua file registry; (2) bandingkan entri dengan tabel §A.4.1–§A.4.2; (3) entri baru dengan `Globally Reachable: FALSE` masuk ke daftar blokir; (4) entri yang DIHAPUS dari registry ditinjau manual sebelum dihapus dari daftar (jangan hapus otomatis — penghapusan registry belum tentu berarti alamat itu aman); (5) perubahan dicatat dengan tanggal + sumber + alasan di commit dan di dokumen ini. |
| Uji setelah pembaruan | Uji unit guard diulang (kasus lama + kasus untuk entri baru) dan 3 URL acuan diuji ulang di staging sebelum cutover. |
| Pengecualian | Pengecualian apa pun (mis. CGNAT diizinkan di masa depan) HARUS dicatat eksplisit dengan alasan, tanggal, dan persetujuan pemilik — tidak ada pengecualian diam-diam. |

Catatan: guard fondasi saat ini (`ssrf-guard.ts`) baru mencakup sebagian dari
tabel ini (belum ada ULA, multicast, `0.0.0.0/8` ada, CGNAT belum ada, dan
`metadata.*` hanya dua hostname eksak; belum ada NAT64/TEREDO/6to4, zone
identifier, dan bentuk IP non-desimal). Perluasan ini adalah bagian dari P0-1.

### A.5 Anggaran sumber daya per pemeriksaan (resource budget) — v2

| Batas | Nilai rancangan | Status |
| --- | --- | --- |
| Timeout per hop | 12 detik (dipertahankan dari kode live) | P0 — lantai yang sudah ada |
| Timeout global per `checkLink` | **20 detik total** (semua hop + script + RDAP) — **disetujui pemilik v2** | P1-1 (baru) — dan menjadi **syarat cutover** (§D.5 v2): scanner tidak dibuka kembali bila ini belum siap |
| Timeout DNS resolve | 5 detik per resolve | P0-1 (baru) |
| Maks redirect | 6 hop (dipertahankan) | Tidak berubah |
| Maks ukuran body halaman | 400 KB **byte aktual setelah dekompresi** (abort streaming bila terlampaui) | P1-1 (baru; saat ini hanya potong pasca-download) |
| Maks ukuran body script | 300 KB per script **setelah dekompresi** (bila script diaktifkan kembali) | P1-1 |
| Maks script src yang di-fetch | 0 selama mitigasi; 3 bila diaktifkan kembali | P0-4 / P1-3 |
| Content-Type yang dipindai | `text/html`, `application/xhtml+xml`, `text/plain` (dan `*/*` hanya bila tidak ada header?) — lihat catatan | P1-1 |
| Port tujuan | **80 (http) dan 443 (https) saja — disetujui pemilik v2** | P1-3 (diterapkan bersama P0-5) |
| Rate limit | **10/menit + 100/jam per IP — disetujui pemilik v2** (lihat §A.7 v2) | P1-2 |
| Konkurensi | **5 pemeriksaan bersamaan GLOBAL** (bukan per instance) via lease DB bersama `scan_leases` — saat penuh tolak langsung 429, tanpa antrean lintas instance (§A.7.2 v2.1) | P1-2 |

**Batas ukuran dihitung dari byte AKTUAL setelah dekompresi (v2 — terbukti
di spike W6).** `Content-Length` TIDAK BOLEH dipakai sebagai batas:
server dapat mengirim `Content-Encoding: gzip` dengan `Content-Length:
1004` yang mengembang menjadi 1.000.000 byte (terbukti di spike: reader
membatalkan pada 524.288 byte terdekompresi). Mekanisme yang benar:
- Jangan memakai `res.text()` / `res.arrayBuffer()` (memuat seluruh body
  ke memori sebelum dipotong — perilaku kode live saat ini).
- Baca lewat `ReadableStream` reader; hitung `byteLength` tiap chunk
  **setelah** dekompresi (fetch/decompressor sudah mengembalikan byte
  terdekompresi ke reader — yang dihitung adalah byte yang keluar dari
  reader, bukan `Content-Length` header).
- Bila hitungan melewati batas (400 KB halaman / 300 KB script):
  `reader.cancel()` + abort koneksi + hentikan pemeriksaan dengan status
  "konten melebihi batas" (bukan vonis).
- `Content-Length` tetap dibaca sebagai **sinyal awal**: bila header ada
  dan nilainya > batas, tolak SEBELUM membaca body (hemat bandwidth) —
  tetapi JANGAN jadikan itu satu-satunya batas, karena header dapat
  berbohong (terlalu kecil, atau tidak ada).

**Pembatalan saat timeout global 20 detik tercapai (v2).** Satu
`AbortController` bersama dibuat di awal `runCheck()`; sinyalnya
(`AbortSignal.timeout(20000)` atau controller manual + timer) dibagikan
ke SEMUA tahap. Bila sinyal abort aktif:

| Tahap | Yang dibatalkan | Cara | Setelah abort |
| --- | --- | --- | --- |
| DNS resolve | Lookup yang sedang berjalan | `dns.lookup(host, { signal })` bila runtime mendukung; bila tidak, bungkus lookup dalam `Promise.race` dengan timer abort dan abaikan hasilnya bila timer menang (lookup yang sudah terlanjur berjalan tidak dapat ditarik kembali — dicatat sebagai keterbatasan; lookup dibatasi 5 detik per resolve agar tidak menggantung) | Resolve yang terlambat diabaikan; pemeriksaan berakhir "tidak selesai (timeout)" |
| Koneksi / fetch halaman | Soket + request yang sedang berjalan | `signal` diteruskan ke `http`/`https.request` / `fetchGuarded`; abort menutup soket | Koneksi ditutup; tidak ada body yang diproses |
| Redirect (antar hop) | Loop redirect | Setiap iterasi loop memeriksa `signal.aborted` SEBELUM resolve hop berikutnya; bila abort, loop berhenti | Tidak ada hop baru yang dimulai |
| RDAP | Fetch RDAP yang sedang berjalan | Sinyal yang sama diteruskan ke fetch RDAP | RDAP yang belum selesai dianggap "umur domain tidak diketahui" (perilaku lama bila RDAP gagal) — pemeriksaan tetap dapat selesai dengan sinyal itu |
| Body streaming | Reader body | `reader.cancel()` + abort koneksi | Byte yang sudah terbaca dibuang; memori tidak bertambah |

Sumber daya yang sudah dialokasikan (soket, reader, agent sekali pakai)
DITUTUP eksplisit di blok `finally` — tidak dibiarkan menggantung sampai
GC. Bila timeout global tercapai, hasil yang dikembalikan adalah status
"pemeriksaan tidak selesai (timeout)" — BUKAN vonis keamanan dan BUKAN
"tidak terjangkau" — dan tidak ada baris `checks` yang menyimpan hasil
parsial dari pemeriksaan yang terpotong.

Catatan Content-Type: banyak server tidak mengirim `Content-Type` yang tepat
atau mengirim `text/html` untuk halaman error. Aturan rancangan: bila header
`Content-Type` ada dan **jelas bukan** HTML/teks (octet-stream, video, audio,
zip, image), hentikan pengunduhan dan perlakukan sebagai "tipe konten tidak
didukung" (bukan sebagai vonis). Bila header tidak ada, lanjutkan dengan batas
ukuran streaming sebagai pengaman.

#### A.5.1 Batas dekompresi pada jalur utama Node Agent (v2.1)

Batas 400 KB setelah dekompresi kini **TERBUKTI pada jalur utama yang akan
dipakai implementasi** — Node `http.Agent` dengan custom `lookup` (Pendekatan
1) — bukan hanya pada spike `Bun.fetch` (W6). **Bukti**
(`SSRF_SPIKE_V21.md` TEST 2, 11/11 PASS, Node v24.22.1, server lokal):
bombe gzip (1.003 byte → 1.000.000 byte), deflate (991 byte), dan brotli
(14 byte) semuanya diabort pada **409.600 byte terdekompresi**; bombe gzip
TANPA Content-Length (chunked) tetap diabort pada 409.600 byte — membuktikan
batas dihitung dari stream terdekompresi dan TIDAK bergantung pada
Content-Length.

Penanganan per encoding (mengikat):

| `Content-Encoding` | Penanganan |
| --- | --- |
| `gzip` | Dekompresi via gunzip stream; hitung byte keluar; abort di 400 KB |
| `deflate` | Dekompresi via inflate stream; sama |
| `br` (Brotli) | Dekompresi via brotli stream; sama |
| (tidak ada) / `identity` | Hitung byte mentah; abort di 400 KB |
| Tidak dikenal (mis. `x-custom`) | **Tolak segera** tanpa membaca body ("encoding tidak didukung") — terbukti: 0 byte diproses |
| Beberapa encoding (`gzip, br`) | **Tolak** — rantai encoding ganda tidak didukung di P0/P1; hanya satu encoding yang dikenal yang diterima |

Stream rusak/terpotong (terbukti): gzip dengan magic byte dibalik →
`incorrect header check`, 0 byte, fail-closed; gzip terpotong + FIN →
`unexpected end of file`, fail-closed. Bila kerusakan terdeteksi SETELAH
batas tercapai (korupsi di tengah payload bombe), hasil akhirnya tetap
abort-di-batas — keduanya fail-closed, tanpa vonis, tanpa baris `checks`.
Semua kegagalan dekompresi menghasilkan status "pemeriksaan gagal
(dekompresi)" — BUKAN vonis keamanan.

Content-Length dipakai HANYA sebagai sinyal tolak-awal: bila header ada
dan nilainya > 400 KB → tolak SEBELUM membaca body (terbukti: CL 1.000.000
dengan body kecil valid ditolak dengan 0 byte dibaca). Sebaliknya,
Content-Length kecil yang akurat (1.003 byte untuk bombe gzip) TIDAK
mencegah abort — batas penegakan selalu byte terdekompresi.

#### A.5.2 Timeout global dan pembatalan DNS (v2.1)

**TEMUAN BARU — DNS tidak dapat dibatalkan (NON-CANCELLABLE).** Pengujian
di Node v24.22.1 pada VM ini (`SSRF_SPIKE_V21.md` TEST 3 + uji lanjutan
`dns-signal-check.cjs`) membuktikan: `dns.lookup` (callback MAUPUN
promises) dengan signal yang sudah di-abort SEBELUM pemanggilan TETAP
mengembalikan hasil; abort 5 ms di tengah lookup juga tidak menghentikannya;
`dns.resolve4/6` mengabaikan opsi `signal` sepenuhnya (tidak melempar,
resolve tetap jalan). Apakah ini perilaku umum Node atau efek resolver
lokal VM ini (yang menjawab seketika dari cache) **tidak dapat dibedakan
di sini** — karena itu rancangan ini memperlakukan DNS sebagai
NON-CANCELLABLE dan TIDAK bergantung pada `AbortSignal` untuk DNS.
Uji ulang di staging produksi (U-1) wajib mencakup perilaku signal ini.

Mitigasi untuk lookup yang tidak dapat dibatalkan (mengikat):

1. **Timeout per lookup 5 detik** via `Promise.race(lookup, timer)` —
   bila timer menang, hasil lookup DIABAIKAN (tidak dipakai untuk pinning),
   dan pemeriksaan berakhir "tidak selesai (timeout DNS)".
2. **Semaphore konkurensi lookup** (maks 4 lookup bersamaan secara
   global per proses): lookup yang telat tidak dapat ditarik kembali,
   tetapi jumlahnya dibatasi — lookup tidak dapat menumpuk tanpa batas
   setelah timeout. Lookup yang kehabisan slot antrean dibatasi antrean
   5 detik; bila antrean penuh → tolak pemeriksaan (fail-closed).
3. **Hasil telat diabaikan dan dicatat:** bila lookup yang sudah
   kedaluwarsa akhirnya selesai di background, hasilnya DIBUANG (tidak
   dipakai untuk pinning, tidak disimpan, tidak memengaruhi keputusan) —
   hanya dicatat di log sebagai "lookup telat diabaikan" untuk
   observabilitas. Terbukti dalam tes: lookup 2000 ms yang kalah race
   dari timer 100 ms tiba 1900 ms kemudian dan diabaikan.
4. **Satu `AbortController` bersama untuk SEMUA tahap lain** (koneksi,
   redirect, RDAP, body streaming) — tahap-tahap ini DAPAT dibatalkan
   (soket ditutup, reader di-cancel), tidak seperti DNS. Tabel abort
   per tahap di §A.5 tetap berlaku.

**Timeout lokal RDAP vs timeout global (v2.1).** Keduanya dibedakan secara
eksplisit:
- **Timeout lokal RDAP (12 detik per fetch RDAP):** bila RDAP melebihi
  12 detik, lookup RDAP dibatalkan dan umur domain dicatat "tidak
  diketahui" — pemeriksaan HALAMAN tetap dapat selesai dengan sinyal
  yang tersisa (perilaku lama bila RDAP gagal; §A.5). RDAP tidak pernah
  menggagalkan pemeriksaan secara keseluruhan.
- **Timeout global 20 detik:** bila tercapai, SELURUH pemeriksaan
  BERHENTI — DNS yang sedang berjalan ditinggalkan (race), koneksi
  ditutup, reader di-cancel, loop redirect dihentikan, RDAP dihentikan.
  Hasil yang dikembalikan adalah status **"pemeriksaan tidak selesai
  (timeout)"** — BUKAN vonis keamanan (bukan BAHAYA/WASPADA/LEBIH AMAN,
  bukan UNVERIFIED), TANPA skor, TANPA sinyal parsial, dan TANPA baris
  `checks`. Alasannya: vonis dari pemeriksaan yang terpotong di tengah
  akan menyesatkan (mis. sinyal drainer yang belum sempat dibaca
  menghasilkan skor rendah yang palsu). UI menampilkan status ini secara
  berbeda dari penolakan guard dan dari "tidak terjangkau".

### A.5.3 Siklus hidup slot semaphore DNS (v2.2 — WAJIB diperjelas)

**Prinsip yang mengikat:** slot semaphore DNS dilepas HANYA pada salah
satu dari dua peristiwa berikut — (a) promise DNS asli **settle**
(selesai dengan hasil, atau gagal dengan error), atau (b) **absolute
cap** tercapai (lihat di bawah). Slot **TIDAK PERNAH** dilepas hanya
karena `Promise.race` mencapai timeout per lookup (5 detik). Melepas
slot pada race timeout adalah bug: lookup yang masih berjalan di
background tidak lagi terhitung, sehingga lookup background dapat
menumpuk tanpa batas meski semaphore "terlihat" kosong.

**Siklus hidup slot (state machine):**

```text
                    acquire()
   [tidak ada slot] ----------> [MENUNGGU DI ANTREAN] --(slot bebas)--> [AKTIF]
          |                          |  (timeout antrean 5 dtk)          |
          |                          v                                   |
          +----> TOLAK (DNS_QUEUE_FULL)   TOLAK (DNS_QUEUE_TIMEOUT)      |
                                                                          |
                              +-------------------------------------------+
                              | lookup berjalan (underlying promise)      |
                              +-------------------------------------------+
                                |                    |                   |
                    (a) settle: hasil/   (b) race timeout 5 dtk:    (c) absolute cap 30 dtk:
                        error              pemanggil DITOLAK,            slot DIREBUT,
                        -> RELEASE         slot TETAP TERPAKAI           lookup ditinggalkan,
                                           (tetap dihitung aktif)        dicatat forceReleased
```

**Aturan implementasi yang mengikat (diturunkan dari bukti tes):**

1. **Release terikat pada settle, bukan pada race.** Implementasi
   referensi (`/tmp/ssrf-v22/semaphore-test.cjs`): `underlying.then(onSettle,
   onSettle)` adalah SATU-SATUNYA tempat slot dilepas (dengan guard
   `released` agar tidak dilepas dua kali). Handler `Promise.race` yang
   kalah TIDAK memanggil release. **Bukti:** SEM-T1 — lookup 3000 ms
   dengan race timeout 100 ms: pemanggil menerima `DNS_TIMEOUT` pada
   ~100 ms, tetapi `active` tetap 1 pada +200 ms dan +1500 ms, dan baru
   menjadi 0 setelah underlying settle (~3000 ms); metrik
   `timedOut=1`, `lateSettled=1`.
2. **Lookup yang timeout tetap dihitung sebagai operasi aktif.**
   Selama underlying belum settle, slotnya tetap terpakai dan lookup
   itu tetap tercatat di metrik `active` dan `timedOut`. Bila akhirnya
   settle setelah race timeout, hasilnya DIBUANG (tidak dipakai untuk
   pinning) dan dicatat sebagai `lateSettled` — tetapi slotnya baru
   dilepas pada saat itu. **Bukti:** SEM-T1, SEM-T3 (`lateSettled=6`
   setelah banjir 20 request).
3. **Absolute cap 30 detik sebagai katup pengaman.** Bila underlying
   TIDAK PERNAH settle (resolver menggantung selamanya), slot direbut
   kembali oleh timer cap 30 detik dan dicatat `forceReleased`. Cap
   ini adalah SATU-SATUNYA pengecualian terhadap "lepas hanya saat
   settle" — dan ia ada justru agar satu resolver yang menggantung
   tidak memacetkan semaphore selamanya. Nilai produksi: 30 detik
   (6× timeout race per lookup). **Bukti:** SEM-T5 — lookup yang tidak
   pernah resolve direbut pada cap 800 ms (skala tes); slot langsung
   bisa dipakai lookup berikutnya.
4. **Antrean FIFO berbatas.** Nilai produksi: `maxActive = 4`,
   `maxQueue = 4`, tunggu antrean maks **5 detik**. Bila antrean penuh
   → tolak langsung `DNS_QUEUE_FULL` (fail-closed, tanpa menunggu).
   Bila waiter menunggu lebih dari 5 detik → tolak
   `DNS_QUEUE_TIMEOUT` dan waiter KELUAR dari antrean. Antrean
   dilayani FIFO; slot yang bebas langsung diberikan ke waiter
   terdepan. **Bukti:** SEM-T2 (antrean penuh menolak; FIFO berjalan),
   SEM-T4 (waiter timeout 300 ms skala tes, keluar dari antrean).
5. **Batas total lookup background.** Pada satu proses, jumlah lookup
   yang sedang berjalan di background TIDAK PERNAH melebihi
   `maxActive + maxQueue` = **8** (4 aktif + 4 menunggu — dan waiter
   belum memulai lookup, jadi lookup yang benar-benar berjalan di
   background maksimal 4). Berapa pun request yang masuk, sisanya
   ditolak di depan pintu, bukan menumpuk di belakang. **Bukti:**
   SEM-T3 — 20 request serentak ke resolver lambat: hanya 6 lookup
   dimulai (4 aktif + 2 antrean skala tes), 14 ditolak antrean penuh,
   `maxActiveObserved` tidak pernah melewati 4, dan setelah semua
   settle `active=0`, `queued=0`.
6. **Timer penolakan race TIDAK BOLEH di-unref.** Temuan samping dari
   pengujian v2.2: timer penolakan race yang dibuat dengan `.unref()`
   membuat proses Node keluar sendiri sebelum pemanggil menerima
   timeout-nya, karena satu-satunya pekerjaan yang tersisa adalah
   timer unref + promise yang tidak pernah settle (proses keluar
   dengan exit 0 setelah SEM-T4, SEM-T5/T6 tidak berjalan). Aturan:
   timer yang menentukan hasil yang sedang ditunggu pemanggil
   (penolakan race) harus tetap ref'd; hanya timer metrik dan absolute
   cap yang boleh di-unref. Setelah perbaikan, 6/6 tes lolos.

**Metrik pemantauan (nama, arti, ambang alert):**

| Metrik | Jenis | Arti | Ambang alert |
| --- | --- | --- | --- |
| `dns_lookup_active` | gauge | Lookup yang sedang berjalan saat ini | > 4 selama 60 dtk → waspada (seharusnya tidak mungkin melewati 4) |
| `dns_lookup_queued` | gauge | Waiter yang sedang menunggu slot | > 0 sustained 5 menit → waspada (resolver lambat / banjir) |
| `dns_lookup_timed_out_total` | counter | Race timeout per lookup (pemanggil menyerah menunggu) | > 5/menit selama 5 menit → waspada (resolver bermasalah) |
| `dns_lookup_late_settled_total` | counter | Underlying settle SETELAH race timeout (hasil dibuang) | > 0 → info; tren naik bersama `timed_out` → selidiki resolver |
| `dns_lookup_force_released_total` | counter | Slot direbut absolute cap (lookup menggantung) | **> 0 → page** (resolver menggantung; bukan kondisi normal) |
| `dns_lookup_queue_full_total` | counter | Request ditolak karena antrean penuh | > 10/menit selama 5 menit → waspada (banjir / kapasitas kurang) |
| `dns_lookup_queue_timeout_total` | counter | Waiter kehabisan waktu di antrean | > 5/menit selama 5 menit → waspada |
| `dns_lookup_max_active_observed` | gauge | High-water mark aktif sejak proses mulai | Hanya observabilitas (tidak boleh > 4) |

Metrik diekspos per proses dan dikumpulkan oleh pemantau yang sama
dengan metrik rate limit (§A.7). Tidak ada metrik yang berisi hostname
atau IP mentah — hanya hitungan.

**Uji yang membuktikan perilaku ini (gerbang G6):** SEM-01..SEM-06 —
lihat `SSRF_SPIKE_V22.md` §1 (6/6 PASS, Node v24.22.1, resolver
lambat yang dikontrol sendiri). Uji ulang di staging produksi (U-1)
wajib mencakup perilaku ini, karena perilaku signal DNS di runtime
produksi belum terbukti (U-12/U-15).

> **Catatan v2.3:** §A.5.3 di atas TIDAK LAGI berdiri sendiri. Absolute
> cap yang dijelaskan di sini direbut slotnya — tetapi slot yang direbut
> TIDAK berarti operasinya berhenti. §A.5.4 di bawah menambahkan
> penghitung orphaned, batas keras, circuit breaker, dan pemulihan worker
> yang menutup celah akumulasi itu. SEM-01..SEM-06 diulang setelah
> perubahan (SEM-R1..SEM-R6, 6/6 PASS, `SSRF_SPIKE_V23.md` §1).

### A.5.4 Penghitung orphaned, batas keras, circuit breaker, dan pemulihan worker (v2.3 — MENJAWAB KEBERATAN ATAS ABSOLUTE CAP)

**Keberatan yang dijawab.** Pada v2.2, absolute cap 30 detik merebut slot
dari lookup yang tidak pernah settle — tetapi lookup itu tetap berjalan di
background. Setelah slot direbut, lookup baru dapat dimulai; beberapa
siklus force-release berpotensi menghasilkan operasi DNS yang terus
bertambah. SEM-T5 v2.2 hanya membuktikan SATU lookup menggantung dapat
direbut slotnya — tidak ada pengujian berulang yang membuktikan operasi
yang masih hidup setelah force-release tetap dibatasi. Kontrol ORPH-T0
(`SSRF_SPIKE_V23.md` §2) membuktikan keberatan itu NYATA: tanpa batas
orphaned, tiga gelombang force-release menumbuhkan operasi hidup 2→4→6
tanpa batas.

**Prinsip yang mengikat (v2.3): force-release TIDAK PERNAH dianggap
sebagai berhentinya operasi DNS.** Operasi yang terkena force-release
tetap dihitung sebagai operasi yang mungkin masih berjalan sampai salah
satu dari dua hal terjadi: (a) promise DNS aslinya settle (hasil atau
error — hasilnya dibuang), atau (b) proses yang menjalankannya
benar-benar dihentikan (worker di-kill — lihat butir 5). Tidak ada jalur
kode yang boleh mengurangi penghitung operasi hidup hanya karena timer
cap tercapai.

#### 1. Dua penghitung yang terpisah

| Penghitung | Arti | Bertambah saat | Berkurang saat |
| --- | --- | --- | --- |
| `active` (slot semaphore) | Lookup yang sedang memegang slot semaphore | Lookup baru dimulai (acquire berhasil) | Underlying settle (normal/late) ATAU slot direbut force-release ATAU operasi dihentikan lewat terminasi worker |
| `orphaned` (operasi DNS orphaned) | Lookup yang slotnya SUDAH direbut force-release tetapi underlying-nya BELUM settle | Force-release merebut slot | Underlying settle telat (hasil dibuang) ATAU operasi dihentikan lewat terminasi worker |
| `liveOps` (turunan: `active + orphaned`) | Semua operasi DNS yang mungkin masih berjalan di proses ini | — | — |

Siklus hidup masing-masing:

```text
LOOKUP BARU
  acquire() berhasil
    -> active + 1, liveOps + 1
    |
    +-- (a) settle normal ---------> active - 1, liveOps - 1 (hasil dipakai)
    |
    +-- (b) race timeout 5 dtk ----> pemanggil ditolak DNS_TIMEOUT,
    |                                TETAP active (menunggu settle/cap)
    |                                  |
    |                                  +-- settle telat -> active - 1,
    |                                  |   liveOps - 1, lateSettled + 1
    |                                  |
    |                                  +-- absolute cap 30 dtk -> lihat (c)
    |
    +-- (c) absolute cap 30 dtk ----> BILA orphaned < cap:
    |                                  active - 1, orphaned + 1,
    |                                  forceReleased + 1
    |                                  (liveOps TIDAK BERUBAH)
    |                                  BILA orphaned >= cap:
    |                                  TIDAK direbut — op menjadi
    |                                  "cap-deferred", TETAP active
    |                                  sampai orphaned turun
    |
    +-- (d) terminasi worker --------> op dinyatakan berhenti:
                                       active - 1 ATAU orphaned - 1,
                                       liveOps - 1, orphanedTerminated + 1
```

**Aturan yang mengikat:**

1. `orphaned` HANYA bertambah di `_forceRelease()` dan HANYA berkurang
   di `_onSettle()` (late settle) atau `terminateAllWorkerOps()`. Tidak
   ada pengurangan lain — khususnya TIDAK PERNAH berkurang karena timer
   cap, timer race, atau penolakan pemanggil.
2. `active` HANYA berkurang di `_onSettle()`, `_forceRelease()`, atau
   `terminateAllWorkerOps()`. Tidak pernah berkurang karena race timeout
   (aturan v2.2 butir 1–2, dipertahankan).
3. Operasi cap-deferred tetap tercatat di `active` dan tetap tercatat di
   metrik `active` — ia bukan orphaned (slotnya belum direbut) dan bukan
   selesai. Saat `orphaned` turun di bawah cap, operasi cap-deferred
   dicoba rebut kembali (lihat butir 2, urutan pemulihan).

#### 2. Batas keras orphaned + circuit breaker

**Nilai produksi (tetap, dengan alasan):**

| Parameter | Nilai produksi | Alasan |
| --- | --- | --- |
| `orphanHardCap` | **4** (= `maxActive`) | Setiap slot maksimal menghasilkan satu orphan per siklus; cap = `maxActive` berarti total operasi hidup maksimal `maxActive + cap = 8` — SAMA dengan batas v2.2 (`maxActive + maxQueue = 8`), sehingga v2.3 tidak melonggarkan batas total apa pun, hanya memindahkan batas itu dari antrean ke orphaned |
| `orphanRecoveryThreshold` | **1** | Hysteresis: breaker menutup hanya saat `orphaned ≤ 1`, bukan saat `orphaned < cap` — mencegah buka-tutup berulang (flapping) bila satu orphan settle lalu satu force-release baru langsung terjadi |
| Perilaku saat batas tercapai | **Fail-closed / circuit breaker terbuka** | Penerimaan lookup DNS baru DIHENTIKAN SEMENTARA: acquire baru ditolak langsung `DNS_CIRCUIT_OPEN` (tanpa menunggu, tanpa memulai lookup); semua waiter antrean ditolak dengan kode yang sama dan antrean dikosongkan |

**Perilaku saat breaker terbuka:**

- Lookup yang SUDAH berjalan (aktif maupun orphaned) TIDAK dihentikan
  oleh terbukanya breaker — mereka dibiarkan settle atau direbut cap
  seperti biasa. Breaker hanya menghentikan PENERIMAAN yang baru.
- Tidak ada antrean yang menumpuk selama breaker terbuka: request baru
  ditolak instan, bukan ditahan. Penolakan dicatat
  (`rejectedCircuitOpen`).
- Breaker MENUTUP hanya bila `orphaned ≤ 1` (threshold pemulihan).
  Penutupan dievaluasi SETIAP KALI `orphaned` berkurang (late settle
  atau terminasi worker) — dan SETELAH operasi cap-deferred dicoba
  rebut kembali (urutan ini penting: reclaim yang tertunda dapat
  menaikkan `orphaned` kembali ke cap, sehingga breaker yang baru saja
  akan menutup harus tetap terbuka — perilaku ini dibuktikan ORPH-T3).
- Breaker TIDAK PERNAH menutup berdasarkan waktu (tidak ada "tutup
  otomatis setelah N detik") — hanya berdasarkan `orphaned` yang
  benar-benar turun. Menutup berdasarkan waktu akan membuka kembali
  penerimaan sementara operasi lama masih hidup — persis akumulasi yang
  hendak dicegah.

**Invarian yang ditegakkan (dibuktikan ORPH-T1):**

- **(I1)** `orphaned ≤ orphanHardCap` SELALU — karena force-release
  memeriksa `orphaned < cap` SEBELUM merebut, dan semua pemeriksaan
  itu berjalan serial di event loop (tidak ada dua force-release yang
  berjalan bersamaan).
- **(I2)** `liveOps = active + orphaned ≤ maxActive + orphanHardCap`
  SELALU — `liveOps` hanya bertambah saat acquire berhasil, dan acquire
  mensyaratkan `active < maxActive` DAN breaker tertutup
  (`orphaned < cap`); force-release tidak mengubah `liveOps`
  (active −1, orphaned +1).
- **(I3)** Selama breaker terbuka, TIDAK ADA lookup baru yang dimulai —
  dibuktikan ORPH-T2 (0 lookup underlying baru selama breaker terbuka).

#### 3. Mekanisme pemulihan

Ada dua jalan pemulihan, dengan peran yang berbeda:

| Jalan pemulihan | Cara kerja | Kapan terjadi |
| --- | --- | --- |
| **(a) Settle alami** | Underlying promise akhirnya settle (hasil/error) → `orphaned` berkurang → operasi cap-deferred dicoba rebut → breaker menutup saat `orphaned ≤ 1` | Otomatis, tanpa intervensi |
| **(b) Terminasi DNS worker** | Proses worker DNS di-kill (`SIGKILL`) → semua operasi di dalamnya dinyatakan berhenti (`terminateAllWorkerOps()`) → `orphaned` turun sekaligus → breaker menutup | Dipicu operator/otomasi bila breaker terbuka terlalu lama (lihat pemicu di bawah) |

**Pemicu restart worker (aturan yang mengikat):**

- Breaker terbuka terus-menerus selama **> 60 detik** (produksi) dengan
  `orphaned` di cap → restart worker DNS (kill + respawn).
- ATAU `forceReleased` dalam 5 menit terakhir **≥ 3** (tanda resolver
  menggantung berulang) → restart worker DNS.
- Setelah restart, jeda pendinginan (**cooldown 30 detik**) sebelum
  restart berikutnya diizinkan; maksimal **3 restart per 10 menit** —
  bila terlampaui, breaker TETAP terbuka dan halaman operator (page)
  dinaikkan: restart berulang adalah gejala resolver/infra, bukan
  sesuatu yang boleh diulang tanpa batas.
- Worker yang baru di-spawn TIDAK BOLEH langsung diberi lookup tanpa
  readiness check: tunggu event `spawn` + jeda startup sebelum lookup
  IPC pertama — temuan ORPH-T4/§9 bukti: tanpa readiness check, lookup
  pertama selalu timeout karena startup proses (~50–100 ms).

**Evaluasi isolasi DNS worker — apakah diperlukan?**

Jawabannya: **YA, diperlukan untuk pemulihan yang TERJAMIN.** Tanpa
worker, satu-satunya jalan orphaned turun adalah settle alami — dan
resolver yang menggantung selamanya TIDAK PERNAH settle, sehingga
breaker dapat terbuka selamanya dan semaphore macet total (semua slot
akhirnya cap-deferred). Worker adalah satu-satunya mekanisme yang dapat
menjamin orphaned turun tanpa menunggu resolver yang tidak kooperatif.

| Pendekatan pemulihan | Pro | Kontra | Putusan |
| --- | --- | --- | --- |
| **(A) DNS worker anak-proses (child_process.fork)** | Isolasi penuh: memori, resolver state, dan event loop terpisah; `SIGKILL` TERBUKTI menghentikan operasi (ORPH-T4: `orphaned` 2→0, breaker menutup, worker baru melayani); crash worker tidak menjatuhkan proses utama; dapat di-restart independen | Biaya: spawn proses (~50–100 ms) + IPC per lookup + kode parent/child; permukaan baru: channel IPC harus diautentikasi/diikat ke parent (bukan socket terbuka); lookup yang sedang berjalan di worker yang di-kill gagal fail-closed (`DNS_WORKER_RESTARTED`) dan harus ditangani pemanggil | **DIPILIH sebagai mekanisme pemulihan.** Menjadi bagian dari P0-1b (bukan langkah baru) |
| **(B) Worker thread (worker_threads + terminate())** | Lebih murah (tanpa spawn proses); `terminate()` TERBUKTI menghentikan thread dalam 2–3 ms (ORPH-T4b) | Thread berbagi memori dan resolver proses induk — hang di tingkat native dapat memengaruhi induk; terminasi thread di tengah panggilan native bukan penghentian yang sebersih kematian proses; crash di thread tetap berada di proses yang sama | **DITOLAK sebagai pengganti (A).** Dicatat sebagai alternatif yang lebih murah tetapi lebih lemah — boleh dipakai untuk pemulihan ringan, BUKAN sebagai satu-satunya mekanisme pemulihan |
| **(C) Tanpa worker (hanya breaker + tunggu settle)** | Tidak ada kompleksitas tambahan | TIDAK ADA jaminan pemulihan: resolver yang menggantung selamanya membuat breaker terbuka selamanya; satu-satunya jalan keluar adalah restart manual seluruh proses layanan | **DITOLAK sebagai satu-satunya mekanisme.** Diterima hanya sebagai fallback bila worker belum tersedia — dengan catatan eksplisit di §G (U-18) bahwa dalam mode ini pemulihan tidak terjamin |

**Pernyataan jujur tentang pembatalan DNS:** rancangan ini TIDAK
mengklaim DNS dapat "dibatalkan". Yang terbukti: (1) `AbortSignal`
TIDAK menghentikan `dns.lookup`/`resolve4` (temuan v2.1); (2)
penghentian PROSES yang menjalankan lookup menghentikan lookup itu
(ORPH-T4); (3) penghentian THREAD menghentikan thread itu (ORPH-T4b).
"Pembatalan" dalam dokumen ini SELALU berarti salah satu dari ketiganya
— dan bila suatu pendekatan mengklaim membatalkan DNS tanpa salah satu
mekanisme itu, klaim tersebut SALAH dan harus ditolak di review.

#### 4. Metrik baru v2.3 + ambang alert dan tindakan operasional

Metrik v2.2 (8 kunci) dipertahankan; v2.3 menambahkan 7 kunci berikut
(total 19 kunci numerik — dibuktikan ORPH-T5/SEM-R6):

| Metrik | Jenis | Arti | Ambang alert | Tindakan operasional |
| --- | --- | --- | --- | --- |
| `dns_lookup_orphaned_active` | gauge | Operasi orphaned yang masih hidup saat ini | ≥ 2 → **warning** (selidiki resolver); == cap → **page** (breaker terbuka) | Warning: periksa log resolver + `forceReleased`; page: ikuti runbook breaker (lihat bawah) |
| `dns_lookup_orphaned_high_water` | gauge | Maksimum orphaned sejak proses mulai | ≥ 3 dalam 1 jam → **warning** | Selidiki apakah resolver memburuk; bila tren naik antar jam, eskalasi |
| `dns_lookup_force_released_total` | counter | Total slot yang direbut absolute cap (sudah ada di v2.2) | > 0 → **page** (dipertahankan dari v2.2) | Resolver menggantung; bukan kondisi normal |
| `dns_lookup_circuit_breaker_open` | gauge (0/1) | Status breaker saat ini | == 1 selama > 60 dtk → **page** (pemicu restart worker) | Restart worker DNS sesuai butir 3; bila restart tidak menutup breaker, eskalasi manual |
| `dns_lookup_circuit_breaker_trips_total` | counter | Jumlah breaker pernah terbuka | > 0 → **warning**; ≥ 3/hari → **page** | Selidiki penyebab trip berulang |
| `dns_lookup_circuit_open_rejected_total` | counter | Request ditolak karena breaker terbuka | > 10/menit selama 5 menit → **warning** (banjir saat breaker terbuka) | Periksa apakah ada banjir request; bukan kesalahan breaker itu sendiri |
| `dns_lookup_orphaned_terminated_total` | counter | Operasi orphaned yang dihentikan lewat terminasi worker | > 0 → **info** (pemulihan bekerja); tren naik → **warning** | Bila sering terjadi, resolver/worker perlu diselidiki |
| `dns_lookup_worker_restarts_total` | counter | Jumlah restart worker DNS | ≥ 3 per 10 menit → **page** (batas restart tercapai; restart otomatis dihentikan) | Intervensi manual; jangan paksa restart lagi |

**Runbook singkat saat breaker terbuka (page):** (1) konfirmasi di
dashboard: `orphaned`, `forceReleased`, `breakerOpen`; (2) periksa log
resolver (apakah satu hostname/resolver tertentu yang menggantung);
(3) bila breaker terbuka > 60 dtk, restart worker DNS (otomatis bila
dikonfigurasi, manual bila tidak); (4) bila restart tidak menutup
breaker dalam 5 menit, JANGAN restart berulang — eskalasi: periksa
apakah resolver upstream mati atau ada serangan; (5) setelah breaker
menutup, pantau `orphanedHighWater` selama 1 jam sebelum menyatakan
pulih. Tidak ada metrik yang berisi hostname atau IP mentah — hanya
hitungan.

#### 5. Uji yang membuktikan perilaku ini (gerbang G6 — ORPH-01..ORPH-05)

Bukti lengkap: `SSRF_SPIKE_V23.md` (13/13 PASS, dijalankan ulang 2×).
Ringkasan:

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| ORPH-01 | Kontrol v2.2 tanpa batas orphaned (ORPH-T0) | Keberatan TERBUKTI: orphaned tumbuh 2→4→6 tanpa batas dalam 3 gelombang — tanpa batas, akumulasi nyata |
| ORPH-02 | Gelombang berulang dengan batas (ORPH-T1) | `orphaned` tidak pernah > cap 3; live ops tidak pernah > 5; hanya 4 lookup dimulai dalam 3 gelombang |
| ORPH-03 | Breaker (ORPH-T2) | Request ditolak `DNS_CIRCUIT_OPEN` instan (< 50 ms); 0 lookup baru selama breaker terbuka |
| ORPH-04 | Pemulihan lewat settle + gelombang kedua (ORPH-T3) | Breaker menutup hanya saat `orphaned ≤ 1`; gelombang kedua tetap berbatas (orphaned ≤ 3, live ≤ 5) |
| ORPH-05 | Kill worker + metrik (ORPH-T4, ORPH-T4b, ORPH-T5) | `SIGKILL` menghentikan operasi (`orphaned` 2→0, breaker menutup, worker baru melayani); worker thread terminate terbukti tetapi ditolak sebagai pengganti; metrik sesuai prediksi state machine |

Pengulangan SEM-01..SEM-06 setelah perubahan (SEM-R1..SEM-R6, 6/6 PASS)
termasuk dalam gerbang G6. Catatan kejujuran: harness asli v2.2 hilang
karena `/tmp` dibersihkan antar sesi; SEM-R1..SEM-R6 adalah implementasi
ulang dari spesifikasi yang didokumentasikan di `SSRF_SPIKE_V22.md` §1.

### A.5.5 Konfirmasi terminasi worker dan crash/restart parent (v2.3.1 — MENJAWAB KEBERATAN ATAS TERMINASI TANPA KONFIRMASI)

**Keberatan yang dijawab.** Pada v2.3, terminasi worker digambarkan
sebagai "kill + counter turun + breaker menutup" tanpa membedakan
pengiriman sinyal dari konfirmasi kematian proses. Bila counter
dikurangi saat SIGKILL dikirim — sementara proses sebenarnya belum mati
— penghitung berbohong: operasi yang masih berjalan tidak lagi
dihitung, breaker dapat menutup sementara lookup lama masih hidup, dan
akumulasi yang hendak dicegah kembali lewat pintu belakang. Keberatan
kedua: bila proses parent mati mendadak saat worker menjalankan lookup,
worker dapat menjadi proses yatim yang terus berjalan — dan parent baru
yang mulai harus dapat mendeteksi serta membersihkannya, atau
pemeriksaan baru akan berjalan di samping operasi yatim yang tidak
terhitung.

#### 1. Konfirmasi exit: counter hanya turun setelah event `exit`

**Aturan yang mengikat (v2.3.1):**

1. Mengirim `SIGKILL` ke worker TIDAK PERNAH mengurangi counter apa
   pun — bukan `active`, bukan `orphaned`, bukan `capDeferred`, dan
   TIDAK PERNAH mengevaluasi penutupan breaker.
2. Counter hanya dikurangi di SATU tempat: handler event `exit` child
   process (`_decrementForWorker`, idempotent — op yang sudah settled
   dilewati, sehingga pemanggilan ganda aman). Handler ini berjalan
   bila dan hanya bila proses worker benar-benar berhenti (event
   `exit` diterima dengan `code`/`signal`).
3. Bila event `exit` tidak diterima dalam **exit-confirm timeout
   (5 detik produksi; 500 ms skala tes)**, maka: counter TETAP,
   breaker TETAP terbuka, metrik `workerExitUnconfirmed` bertambah 1,
   dan halaman operator (page) dinaikkan. TIDAK ADA pengurangan paksa
   setelah timeout — listener `exit` tetap terpasang, sehingga bila
   proses akhirnya mati, decrement berjalan saat itu (bukan
   sebelumnya). Alasan: `SIGKILL` hampir selalu membunuh proses
   seketika, tetapi proses dalam keadaan D-state (uninterruptible
   sleep, mis. I/O disk menggantung) atau namespace yang bermasalah
   dapat menunda kematian; mengasumsikan kematian dari pengiriman
   sinyal adalah klaim yang tidak terbukti.
4. Metrik baru v2.3.1: `workerExitConfirmed` (counter — exit
   terkonfirmasi dan counter dikurangi) dan `workerExitUnconfirmed`
   (counter — timeout tanpa konfirmasi; ambang: > 0 → **page**).
   Keduanya ditambah ke daftar metrik §A.5.4 butir 4 (total kunci
   menjadi 21 — lihat rekonsiliasi §4 di `SSRF_SPIKE_V231.md`).

**Urutan pembukaan breaker (v2.3.1):**

```text
terminateWorker() dipanggil
  -> child.kill('SIGKILL') dikirim
  -> TIDAK ADA perubahan counter, TIDAK ADA evaluasi breaker
  -> [jendela: breaker TETAP terbuka; lookup baru TETAP ditolak
  |   DNS_CIRCUIT_OPEN; lookup lama TETAP dihitung]
  -> event 'exit' diterima (code/signal)
  -> _decrementForWorker(): active/orphaned/capDeferred turun
  -> _maybeCloseBreaker() dievaluasi (tepat 1× per terminasi)
  -> BILA orphaned <= threshold (1): breaker MENUTUP
  -> BILA tidak ada event 'exit' dalam 5 dtk: counter TETAP,
     breaker TETAP terbuka, workerExitUnconfirmed + 1, page
```

Dibuktikan TERM-T1..T4 (`SSRF_SPIKE_V231.md` §1): T1 membuktikan
counter tidak berubah pada pemeriksaan sinkron segera setelah `kill()`
kembali dan hanya turun setelah `exit` (orphaned 3→0,
`orphanedTerminated=3`); T2 membuktikan evaluasi penutupan breaker
terjadi tepat 1× dan hanya setelah exit (dihitung lewat instrumentasi
pemanggilan `_maybeCloseBreaker()`); T3 membuktikan exit yang tidak
pernah terkonfirmasi (worker palsu) membuat counter dan breaker tetap
— bahkan setelah +500 ms tambahan; T4 membuktikan terminate ganda
idempotent dan tidak ada counter negatif.

**Catatan pengujian yang mengikat:** pemeriksaan "counter tidak berubah
saat kill dikirim" HARUS dilakukan sinkron di tick yang sama dengan
pengiriman sinyal — sebelum event loop sempat memproses event `exit`.
Pemeriksaan apa pun yang memakai `await` memberi kesempatan event
`exit` tiba lebih dulu dan mengaburkan hasil (temuan TERM-T1b/T1c).

#### 2. Parent crash/restart: supervisor, cleanup, dan recovery state

**Skenario yang dirancang.** Parent mati mendadak (SIGKILL / crash /
OOM-kill) saat DNS worker menjalankan lookup. Tiga lapis pertahanan,
berurutan:

| Lapis | Mekanisme | Kapan bekerja | Bukti |
| --- | --- | --- | --- |
| **L1 — worker keluar sendiri** | Worker mendeteksi kematian parent lewat (a) event `disconnect` pada channel IPC, atau (b) watchdog ppid (bila `ppid === 1`, artinya di-reparent ke init) → `process.exit(0)` | Otomatis, dalam hitungan detik setelah parent mati | PARENT-T1a: worker mati setelah parent di-SIGKILL, alasan tercatat `disconnect` |
| **L2 — cleanup oleh parent baru (pidfile)** | Parent baru saat startup membaca pidfile (`parent.pid.json`: parentPid + workerPid lama); bila worker lama masih hidup → validasi ulang identitas → SIGKILL + tunggu konfirmasi exit (maks 5 dtk per percobaan, 3 percobaan — lihat §A.5.5.1 v2.3.2; bila tidak terkonfirmasi, parent tetap `NOT_READY`) → baru spawn worker sendiri dan tulis pidfile baru | Setiap startup parent | PARENT-T1b: worker stubborn yang sengaja dibuat tetap hidup berhasil dibunuh parent baru (`waitedMs=51`) |
| **L3 — supervisor eksternal** | Supervisor platform me-restart proses layanan saat crash dan membunuh seluruh process group (termasuk anak) | Saat crash | **BELUM TERBUKTI** — lihat U-22 di bawah |

**Recovery state parent baru (aturan yang mengikat):**

- **State in-memory DIBANGUN DARI NOL:** semaphore (`active`,
  `orphaned`, `capDeferred`), breaker (mulai TERTUTUP), antrean, dan
  metrik dimulai dari nol. Parent baru TIDAK BOLEH mewarisi angka
  counter dari parent mati — angka itu mati bersama prosesnya.
- **State DB BERTAHAN:** `scan_leases` global hidup di database
  bersama, bukan di memori. Lease dari parent mati tetap dihitung
  sampai TTL-nya habis (25 dtk produksi) — batas global 5 pemeriksaan
  tetap ditegakkan melewati restart. Dibuktikan PARENT-T2: parent baru
  melihat `liveLeases=2` (1 dari parent mati + 1 milik sendiri), dan
  setelah TTL keduanya kedaluwarsa sendiri.
- **Request yang sedang berjalan saat parent mati GAGAL FAIL-CLOSED:**
  pemanggil tidak pernah menerima vonis — koneksinya putus / timeout
  tanpa hasil. Dibuktikan PARENT-T1a: lookup yang sedang berjalan
  tetap `PENDING` (tidak pernah kembali). Tidak ada vonis parsial dari
  pemeriksaan yang parent-nya mati.
- **Urutan startup parent baru (wajib, v2.3.2 — MENGGANTIKAN rumusan
  v2.3.1):** (1) acquire startup lock (lihat §A.5.5.3 — bila kalah,
  keluar segera, jangan lakukan apa pun) → (2) baca pidfile lama →
  (3) cleanup worker lama menurut aturan keras §A.5.5.1 di bawah →
  (4) spawn worker baru + readiness check → (5) tulis pidfile baru
  secara atomik (lihat §A.5.5.3) → (6) baru terima lookup. Melayani
  lookup sebelum langkah (3) selesai adalah cacat: operasi yatim
  berjalan di luar penghitung. **Rumusan v2.3.1 yang DIHAPUS:**
  "JANGAN lanjut sebelum worker lama mati ATAU batas percobaan habis"
  — frasa "atau batas percobaan habis" dapat dibaca sebagai izin
  melanjutkan startup setelah percobaan habis, dan itu SALAH. Aturan
  yang menggantikannya ada di §A.5.5.1.

#### A.5.5.1 Aturan keras startup: NOT_READY sampai worker lama terkonfirmasi mati (v2.3.2 — KLARIFIKASI WAJIB)

**Aturan yang tidak dapat dinegosiasi.** Bila worker lama tidak dapat
dipastikan mati setelah batas waktu dan percobaan cleanup habis, parent
baru **WAJIB tetap `NOT_READY`** dan **tidak menerima lookup DNS**.
Batas percobaan **BUKAN** izin untuk melanjutkan startup ketika worker
lama masih hidup. Tidak ada pengecualian, tidak ada jalan pintas
berbasis waktu, dan tidak ada "lanjut dengan risiko yang dicatat" —
satu-satunya jalan keluar dari `NOT_READY` adalah salah satu dari dua
kondisi di bawah, atau intervensi operator yang membuktikan kematian
worker lama secara manual (lihat runbook).

**Batas cleanup yang eksplisit (nilai produksi):**

| Parameter | Nilai produksi | Nilai skala tes | Keterangan |
| --- | --- | --- | --- |
| Jumlah percobaan cleanup | 3 | 3 | Tiap percobaan = validasi ulang identitas → SIGKILL → tunggu event `exit` |
| Timeout tunggu konfirmasi exit per percobaan | 5 dtk | 300 ms | Sama dengan exit-confirm timeout §A.5.5 butir 1 (v2.3.1) — **koreksi:** langkah cleanup v2.3.1 menulis maks 2 dtk; diselaraskan ke 5 dtk agar satu angka berlaku di semua tempat |
| Anggaran total cleanup | 15 dtk (3 × 5 dtk) | 900 ms | Setelah anggaran habis tanpa konfirmasi, tidak ada percobaan ke-4 |
| Jeda antar percobaan | 0 (langsung percobaan berikutnya) | 0 | Tidak ada jeda yang memperpanjang jendela bahaya; tiap percobaan memvalidasi ulang identitas sebelum sinyal |

**Apa yang terjadi di setiap percobaan (urutan yang mengikat):**

1. Validasi ulang identitas worker lama (lihat §A.5.5.2 di bawah —
   validasi dilakukan SESAAT sebelum tiap SIGKILL, bukan sekali di
   awal startup, karena PID dapat dipakai ulang di antara percobaan).
2. Bila validasi gagal → berhenti seketika: JANGAN kirim SIGKILL,
   parent tetap `NOT_READY` + page (kasus PID reuse — lihat SU-T2).
3. Bila validasi lolos → kirim SIGKILL (satu sinyal per percobaan),
   lalu tunggu event `exit` sampai timeout percobaan.
4. Bila event `exit` diterima → decrement counter lewat satu jalur
   idempotent (`_decrementForWorker`, hanya dari exit handler) →
   lanjut ke langkah startup berikutnya.
5. Bila timeout tanpa event `exit` → counter TETAP, breaker TETAP
   terbuka (bila sudah terbuka), metrik `workerExitUnconfirmed` + 1,
   lanjut ke percobaan berikutnya (bila masih ada).

**Setelah percobaan ke-3 gagal (tindakan dan eskalasi):**

- Parent tetap `NOT_READY` **tanpa batas waktu** sampai salah satu
  terjadi: (a) event `exit` worker lama akhirnya diterima (listener
  tetap terpasang), atau (b) operator membuktikan kematian worker
  lama secara manual dan mencatatnya (lihat runbook di bawah).
- Selama `NOT_READY`: SEMUA lookup DNS ditolak dengan kode
  `DNS_PARENT_NOT_READY` (tanpa antrean — penolakan instan, tidak ada
  lookup yang menunggu di belakang worker yang belum mati); setiap
  penolakan dicatat (`parentNotReadyRejections`); metrik
  `parentNotReady` (gauge: 1 selama NOT_READY) aktif; alert page
  dinaikkan sekali saat memasuki `NOT_READY` karena cleanup gagal dan
  diulang tiap 5 menit selama status bertahan.
- Runbook operator (wajib): (1) periksa proses worker lama
  (`ps -o pid,lstart,cmd -p <workerPid>` dan `/proc/<pid>/stat` +
  `/proc/<pid>/cmdline`); (2) bila proses sudah tidak ada, hapus
  pidfile basi secara manual dan restart parent (parent baru akan
  membaca "tidak ada pidfile" → jalur (b)); (3) bila proses masih ada
  tetapi tidak merespons, eskalasi ke operator infra — JANGAN memaksa
  decrement counter dan JANGAN menghapus pidfile sementara proses yang
  dimaksud masih hidup; (4) catat tindakan + timestamp di log
  insiden.

**Dua kondisi SATU-SATUNYA yang mengizinkan transisi ke `READY`:**

- (a) **Exit worker lama terkonfirmasi** via event `exit` (atau
  konfirmasi manual operator yang tercatat, lihat runbook) — counter
  dikurangi lewat jalur idempotent, breaker dievaluasi tepat 1×.
- (b) **Bukti worker lama tidak pernah ada** — salah satu: pidfile
  tidak ada sama sekali; atau PID worker di pidfile tidak hidup DAN
  identitasnya tidak dapat dikaitkan dengan proses apa pun yang hidup
  (lihat §A.5.5.1). Pidfile yang ADA tetapi rusak/parsial BUKAN bukti
  (b) — ia berarti "tidak dapat dibuktikan" dan parent tetap
  `NOT_READY` + page (dibuktikan SU-T9).

Dibuktikan SU-T1 (`SSRF_SPIKE_V232.md` §2): setelah 3 percobaan tanpa
konfirmasi exit, state tetap `NOT_READY`, `sigsSent=3`, 2 lookup
ditolak `DNS_PARENT_NOT_READY`, worker masih hidup. Dibuktikan SU-T9:
pidfile rusak/parsial → `NOT_READY` + page; pidfile hilang → `READY`.

#### A.5.5.2 Validasi identitas proses sebelum SIGKILL (v2.3.2 — PID SAJA TIDAK CUKUP)

**Aturan yang mengikat.** PID saja tidak cukup untuk mengidentifikasi
worker lama: PID dapat dipakai ulang oleh proses lain setelah worker
mati. Sebelum SIGKILL dikirim — pada SETIAP percobaan cleanup —
parent baru WAJIB memvalidasi identitas worker lama. Bila SATU PUN
pemeriksaan gagal, JANGAN kirim SIGKILL.

**Pemeriksaan identitas (berurutan, semua harus lolos):**

1. **PID hidup** — `kill(pid, 0)` berhasil. Bila gagal (ESRCH):
   worker sudah mati → jalur (b) di §A.5.5.1 (READY tanpa sinyal).
2. **Start time cocok** — baca `/proc/<pid>/stat` field 22
   (starttime, dalam jiffies sejak boot) dan bandingkan dengan
   `workerStarttime` yang tercatat di pidfile. Start time mengikat PID
   ke SATU instans proses tertentu: bila PID dipakai ulang, start time
   proses baru berbeda dan validasi gagal. Ini pemeriksaan utama
   anti-PID-reuse.
3. **Command line cocok** — baca `/proc/<pid>/cmdline` dan pastikan
   mengandung penanda worker (`dns-worker`). Proses lain yang kebetulan
   memakai PID lama (mis. `sleep`, shell, atau layanan lain) akan gagal
   di sini meskipun start time-nya entah bagaimana cocok.
4. **Tantangan token (bila channel IPC tersedia)** — bila parent baru
   dapat membuka channel IPC ke worker lama, kirim tantangan berisi
   `workerToken` dari pidfile; worker harus menjawab dengan token yang
   sama. Bila channel IPC tidak tersedia (worker tidak lagi merespons
   IPC), pemeriksaan ini dilewati dan start time + command line menjadi
   pengikat — hal ini dicatat di log startup (`identityProof:
   starttime+cmdline`, tanpa token). Token TIDAK PERNAH ditulis ke
   `/proc` atau command line (agar tidak bocor ke `ps`).

**Bila validasi gagal:**

- JANGAN kirim SIGKILL — sinyal ke PID yang salah dapat membunuh
  proses yang tidak bersalah.
- Parent tetap `NOT_READY` + page (`identityValidationFailed` + 1),
  dengan alasan yang tercatat (`starttime-mismatch`,
  `cmdline-mismatch`, `token-mismatch`, atau `pid-not-alive` yang
  ternyata hidup kembali — lihat di bawah).
- Operator memeriksa manual: bila proses yang memegang PID adalah
  proses lain, pidfile dinyatakan basi oleh operator dan dihapus
  manual, lalu parent di-restart.

**Kasus batas yang ditetapkan:**

- PID hidup kembali di antara pemeriksaan (2) dan pengiriman SIGKILL:
  jendela TOCTOU ini tidak dapat dihilangkan sepenuhnya — pemeriksaan
  dan pengiriman sinyal adalah dua syscall terpisah. Mitigasi:
  validasi dilakukan SESAAT sebelum sinyal (dalam tick yang sama,
  tanpa `await` di antaranya), dan bila proses mati dan PID dipakai
  ulang tepat di jendela itu, start time yang dibaca ulang sesaat
  sebelum sinyal akan berbeda — karena itu implementasi WAJIB membaca
  ulang start time tepat sebelum `kill()` dan membatalkannya bila
  berbeda. Sisa risiko yang tidak dapat ditutup dicatat sebagai U-24.
- PID tidak hidup saat pemeriksaan (1) tetapi proses muncul kembali:
  tidak mungkin — PID yang mati tidak dapat "hidup kembali" sebagai
  proses yang sama; PID baru dengan nomor yang sama adalah proses
  berbeda dan akan gagal pada pemeriksaan (2).

Dibuktikan SU-T2 (`SSRF_SPIKE_V232.md` §2): pidfile menunjuk proses
`sleep` dengan start time yang diklaim digeser → validasi gagal
`starttime-mismatch` → 0 SIGKILL, `page=1`, decoy tetap hidup, parent
tetap `NOT_READY`.

#### A.5.5.3 Pidfile atomik (v2.3.2 — TIDAK PERNAH SETENGAH TERTULIS)

**Aturan yang mengikat.** Pidfile ditulis dengan urutan yang tidak
dapat menghasilkan keadaan setengah tertulis:

1. Tulis record lengkap ke file sementara di direktori yang SAMA
   dengan pidfile (`<pidfile>.tmp.<pid>.<timestamp>` — nama unik per
   proses penulis agar dua penulis tidak menimpa file sementara yang
   sama).
2. `fsync` file sementara (isi lengkap mencapai disk).
3. `rename` atomik file sementara menjadi pidfile (satu operasi
   atomik pada filesystem yang sama — pembaca hanya pernah melihat
   pidfile lama yang lengkap ATAU pidfile baru yang lengkap, tidak
   pernah campuran keduanya).
4. `fsync` direktori (entri rename mencapai disk — tanpa ini, crash
   tepat setelah rename dapat mengembalikan pidfile lama setelah
   reboot).

**Isi metadata identitas proses (wajib, semua field harus ada):**

| Field | Isi | Fungsi |
| --- | --- | --- |
| `parentPid` | PID proses parent yang menulis | Mengikat pidfile ke satu parent |
| `workerPid` | PID DNS worker | Target cleanup bila parent mati |
| `workerStarttime` | Start time worker (`/proc` field 22) | Pengikat anti-PID-reuse (lihat §A.5.5.2) |
| `workerToken` | Token acak per worker | Tantangan identitas via IPC (lihat §A.5.5.2) |
| `writtenAt` | Timestamp penulisan (ms) | Deteksi kebasian + urutan penulisan |
| `version` | Versi skema pidfile (1) | Penolakan skema lama yang tidak dikenal |

**Aturan pembacaan (fail-closed):**

- Pidfile TIDAK ADA → tidak ada klaim worker → jalur (b) §A.5.5.1
  (boleh READY).
- Pidfile ADA tetapi JSON tidak terbaca ATAU field wajib hilang →
  "tidak dapat dibuktikan" → parent tetap `NOT_READY` + page (lihat
  §A.5.5.1). Operator harus memeriksa manual sebelum pidfile
  diperbaiki/dihapus — penghapusan otomatis pidfile rusak DILARANG
  (dapat menghapus bukti satu-satunya tentang worker yang mungkin
  masih hidup).
- Pidfile ADA dan valid tetapi `version` tidak dikenal → perlakukan
  sebagai rusak (aturan yang sama).

Dibuktikan SU-T4 (`SSRF_SPIKE_V232.md` §2): 20 penulis bersamaan →
file selalu berisi SATU record lengkap yang valid; file sementara
setengah tertulis yang tidak pernah di-rename tidak merusak pidfile
(record sesudah "crash" identik dengan sebelumnya).

#### A.5.5.3a Visibilitas atomik BUKAN durabilitas (v2.3.3 — BATAS BUKTI)

SU-T4 membuktikan **atomic visibility**: rename atomik membuat
pembaca hanya pernah melihat pidfile lama yang lengkap ATAU pidfile
baru yang lengkap, tidak pernah campuran keduanya. SU-T4 TIDAK
membuktikan **durabilitas** — yaitu bahwa data pidfile bertahan setelah
crash daya/OS. Perbedaan keduanya:

- **Atomic visibility** — rename atomik menjamin file terlihat lengkap
  sekaligus oleh pembaca lain. Ini dijamin oleh semantik rename pada
  filesystem yang sama, dan SU-T4 mengujinya.
- **Durability** — `fsync` file + `fsync` direktori menjamin data dan
  entri rename benar-benar mencapai penyimpanan persisten dan bertahan
  setelah crash. Ini hanya dapat dibuktikan dengan uji crash nyata
  pada filesystem yang dipakai produksi, dan bergantung pada
  filesystem + perangkat penyimpanan + konfigurasi OS.

**Batas bukti yang dicatat dengan jujur (v2.3.3):** seluruh pengujian
di VM ini berjalan di `/tmp` yang bertipe **tmpfs** — fsync di tmpfs
tidak menguji durabilitas disk sama sekali (tmpfs adalah RAM).
`/home` berada di overlay btrfs dengan opsi `fsync=volatile`, sehingga
durabilitas di sana juga bergantung pada penyimpanan di bawah overlay.
**Tidak ada bukti durability di VM ini yang membuktikan durability di
filesystem produksi.**

**Persyaratan yang mengikat (v2.3.3):**

- Pidfile dan startup lock HARUS berada di direktori penyimpanan
  persisten di runtime produksi — BUKAN di tmpfs (`/tmp`, `/dev/shm`)
  dan bukan di mount dengan opsi yang menonaktifkan durabilitas
  fsync. Lokasi persisten harus ditetapkan dan didokumentasikan saat
  implementasi (P0-1b), bersama output `df`/`mount` yang membuktikan
  filesystem-nya.
- Urutan tulis (temp → fsync file → rename → fsync direktori) TETAP
  berlaku; yang diuji di staging adalah apakah filesystem produksi
  benar-benar menghormati fsync tersebut.

**Rencana uji crash/durabilitas staging (v2.3.3 — wajib, gerbang G6):**

| Uji | Apa yang diuji | Cara mensimulasikan | Kriteria lolos |
| --- | --- | --- | --- |
| D-01 | Pidfile lengkap sesudah crash tepat setelah rename | Tulis pidfile (urutan lengkap) lalu matikan paksa VM/container tepat setelah rename kembali, sebelum proses berikutnya sempat membaca | Pidfile sesudah reboot berisi SATU record lengkap yang valid — pidfile baru ATAU pidfile lama, tidak pernah parsial/corrupt |
| D-02 | Pidfile lama tidak hilang bila crash sebelum fsync direktori | Tulis pidfile, jeda tepat sebelum fsync direktori, matikan paksa | Pidfile sesudah reboot adalah record lama yang lengkap (bukan hilang dan bukan parsial) |
| D-03 | Pidfile tidak hilang bila crash saat menulis file sementara | Matikan paksa saat file sementara sedang ditulis (sebelum rename) | Pidfile lama tetap utuh; file sementara setengah tertulis tidak pernah terlihat sebagai pidfile |

Bila filesystem runtime produksi ternyata berbeda dari VM (atau
memiliki opsi yang melemahkan fsync), D-01..D-03 harus dijalankan di
lingkungan staging yang memakai filesystem yang sama dengan produksi —
bukti dari VM ini TIDAK dapat dipakai sebagai pengganti. Risiko U-27
mencatat batas ini.

#### A.5.5.4 Startup lock: satu parent, satu cleanup (v2.3.2 — PENCEGAHAN DUA PARENT BERSAMAAN; DIPERKERAS v2.3.3; RACE TERBUKTI DAN DIPERBAIKI v2.3.4)

**Aturan yang mengikat.** Dua parent TIDAK BOLEH melakukan cleanup
atau mengklaim worker secara bersamaan. Mekanisme v2.3.2/v2.3.3 (O_EXCL
create + reklamasi berbasis probe ESRCH + unlink) **TERBUKTI MENGANDUNG
RACE** pada revisi ini (ADV-T1, `SSRF_SPIKE_V234.md` §3a) dan
**DIGANTI** oleh mekanisme flock pada §A.5.5.4c di bawah. Bagian
§A.5.5.4a–§A.5.5.4b mendokumentasikan kegagalan itu dengan jujur —
bukan untuk dipertahankan, melainkan agar peninjau dapat memeriksa
bahwa perbaikan memang menjawab keberatan yang diajukan.

#### A.5.5.4a Urutan operasi aktual `acquireStartupLock` v2.3.3 (BUKTI KEGAGALAN)

Pseudocode di bawah adalah transkripsi PERSIS dari implementasi referensi
v2.3.3 (`spike-harness-v233/startup.cjs`, fungsi `acquireStartupLock`,
jalur yang ditempuh saat lock sudah ada) — bukan versi idealnya. Jendela
race ditandai `[RACE]`.

```text
acquireStartupLock(lockPath, identity):
  for attempt in 0..maxReclaim (3):
    try:
      fd = open(lockPath, 'wx')            # O_EXCL create — atomik
      write(fd, record{pid, starttime, heartbeatAt}) ; fsync(fd)
      if !verifyLockOwnership(lockPath, identity):   # baca path, bandingkan pid+starttime
        close(fd); return {acquired:false, reason:'ownership-revalidation-failed'}
      return {acquired:true, fd, record, reclaimed: attempt>0}
    catch EEXIST:
      holder = parse(read(lockPath))       # baca record pemegang lama
      if !parseable OR holder.pid bukan number:
        return {acquired:false, reason:'lock-unreadable', page:true}
      probeRes = probe(holder.pid)         # kill(pid,0) + /proc
      if probeRes == dead (ESRCH):
        unlink(lockPath)                   # [RACE-1] unlink TAK BERSYARAT
        continue                           # -> ulang loop, coba create lagi
      if probeRes == uncertain:            # EPERM / stat tak terbaca
        return {acquired:false, reason:'holder-unverifiable', page:true}
      if probeRes == alive:
        return {acquired:false, reason:'held-by-live-holder' / 'holder-identity-mismatch'}
  return {acquired:false, reason:'reclaim-exhausted'}
```

- **[RACE-1] — unlink tak bersyarat setelah probe basi (INTI KEBERATAN).**
  Keputusan unlink didasarkan pada hasil probe yang dibaca SEBELUM unlink;
  tidak ada pemeriksaan ulang bahwa file di path masih file yang sama dengan
  yang diprobe. B dapat meng-unlink file lock baru milik A (dibuat setelah
  probe B) dan kemudian membuat lock sendiri. O_EXCL TIDAK melindungi dari
  ini: O_EXCL hanya men-serialisasi pembuatan file ketika path belum ada —
  ia tidak mencegah penghapusan.
- **[RACE-2] — verify adalah pemeriksaan sesaat (point-in-time).** Setelah
  `verifyLockOwnership` mengembalikan true, TIDAK ADA mekanisme yang
  mempertahankan kepemilikan: proses lain dapat meng-unlink file lock kapan
  saja selama masa hidup parent. Otoritas lock "menguap" begitu path
  dihapus — fd yang dipegang A tetap terbuka pada inode yang sudah
  di-unlink, dan heartbeat A menulis ke inode yang tidak terlihat siapa pun.
- **Bukan jendela:** probe ESRCH -> PID reuse (proses baru memakai ulang angka
  PID antara probe dan unlink) — penghapusan file klaim basi tetap aman dalam
  jendela ini karena proses baru itu tidak memegang lock.

**Bukti:** ADV-T1 (`SSRF_SPIKE_V234.md` §3a) mereproduksi skenario keberatan
secara deterministik (barrier: B menahan unlink sampai A selesai acquire):
**2 pemilik pada 2/2 run** — A memperoleh lock (ino 103) dan B menghapus
file A lalu memperoleh lock sendiri (ino 107). `aFileDeleted=true`.

#### A.5.5.4b Mengapa SU10-T1 tidak cukup (v2.3.4 — KLAIM v2.3.3 DITARIK)

Klaim v2.3.3 bahwa "balapan hapus+create diselesaikan oleh O_EXCL" dan
bahwa SU10-T1 membuktikan balapan reklamasi terkelola **ditarik** pada
revisi ini. SU10-T1 (5 parent mereklamasi lock basi bersamaan, tepat 1
pemenang) TIDAK membuktikan tidak adanya race ini:

1. Dalam balapan acak, kelima racer mem-probe + meng-unlink dalam ledakan
   yang rapat; unlink pihak yang kalah hampir selalu mendarat SEBELUM
   pemenang membuat file (jendela T1 hanya terbuka setelah pemenang
   create+verify — rentang waktu sempit yang jarang tertembak acak). Yang
   kalah kemudian membaca ulang file pemenang yang HIDUP dan keluar via
   `held-by-live-holder`.
2. SU10-T1 hanya menguji SATU titik dalam ruang interleaving (semua pihak
   mulai bersamaan, tanpa penahanan). Ia tidak pernah menahan satu pihak
   pada titik kritis (setelah probe, sebelum unlink) sementara pihak lain
   menyelesaikan akuisisi — persis interleaving yang ditanyakan keberatan.
3. Bukti "tepat satu pemenang" dalam balapan acak adalah bukti
   probabilistik (tidak terjadi pada N percobaan), bukan bukti
   ketidakmungkinan. Tes adversarial dengan barrier (ADV-T1/T3a/T3c)
   mengubahnya menjadi bukti deterministik: tiap interleaving diuji
   sendiri-sendiri dengan penahanan pada titik kritisnya.

Yang TETAP benar dari v2.3.3: verify MENANGKAP interleaving unlink-sebelum-
verify (ADV-T3a: A gagal `ownership-revalidation-failed`, tepat satu
pemilik), dan O_EXCL men-serialisasi pembuatan BILA kedua unlink mendahului
kedua create (ADV-T3c). Kedua fakta itu tidak menjawab keberatan — karena
keberatan bukan tentang create, melainkan tentang unlink atas file baru.

#### A.5.5.4c Perbaikan v2.3.4: flock sebagai primitif kepemilikan (MENGIKAT)

**Perubahan perilaku inti.** Primitif kepemilikan diganti dari O_EXCL +
probe + unlink menjadi **flock(LOCK_EX|LOCK_NB) pada fd yang dipertahankan
terbuka selama masa hidup proses**. Jalur reklamasi berbasis probe ESRCH +
unlink **DIHAPUS SELURUHNYA** — tidak ada lagi penghapusan file lock dalam
kode apa pun. Aturan-aturan berikut MENGIKAT:

- **Akuisisi:** file lock dibuka `O_RDWR|O_CREAT` (tanpa O_EXCL, tanpa
  truncate) — file hanya rendezvous point. Dua proses yang bersamaan
  membuka file yang sama (inode yang sama); **kernel** yang memutuskan
  siapa pemiliknya lewat flock. `flock` gagal EWOULDBLOCK berarti pemegang
  hidup -> parent yang kalah KELUAR SEGERA (exit code 78, log
  `startup-lock-held-by:<pid>`) dan TIDAK melakukan cleanup, startup,
  atau penulisan pidfile apa pun. Menunggu tanpa batas DILARANG; ikut
  cleanup DILARANG; mengklaim worker DILARANG.
- **Pelepasan otomatis (menggantikan reklamasi):** holder yang mati
  melepaskan flock OTOMATIS saat proses berakhir — kernel menutup fd.
  Tidak ada lagi "lock basi" yang harus direklamasi, tidak ada lagi probe
  kematian PID dalam jalur akuisisi lock. Parent baru yang datang setelah
  holder mati langsung memperoleh flock (dibuktikan FLK-T2: contender
  memperoleh lock segera setelah holder di-SIGKILL).
- **Aturan never-unlink (load-bearing, dibuktikan FLK-T5):** file lock
  TIDAK PERNAH di-unlink oleh siapa pun — bukan hanya oleh kode, tetapi
  juga oleh operator dan tooling (runbook). Bila path di-unlink dan file
  baru dibuat, opener baru memperoleh flock pada inode BARU sementara
  holder lama masih memegang flock pada inode lama — dua "pemegang" hidup
  berdampingan. flock saja tidak cukup; never-unlink adalah bagian dari
  desain, bukan etiket. Satu-satunya pengecualian: penghapusan saat SEMUA
  parent dipastikan berhenti (prosedur flag-day, §A.5.5.4d).
- **Penulisan identitas:** setelah flock berhasil, parent menulis
  identitasnya (PID + starttime + token acak per-akuisisi + heartbeat)
  ke dalam file lock via fd YANG SAMA (tidak pernah open ulang).
  Heartbeat diperbarui tiap 5 dtk (fsync tiap penulisan) — HANYA untuk
  observabilitas ("pemegang masih hidup dan sehat"), TIDAK PERNAH dipakai
  dalam keputusan akuisisi.
- **Validasi ulang kepemilikan setelah acquire (DIPERKERAS v2.3.4):**
  setelah acquire berhasil, parent WAJIB menjalankan
  `verifyFlockOwnership` SEBELUM cleanup apa pun, dan mengulanginya
  sesaat sebelum langkah destruktif pertama (spawn worker / tulis pidfile).
  Verifikasi memakai DUA pemeriksaan yang keduanya wajib lolos:
  (1) (dev, ino) `fstat(fd)` vs `stat(path)` sama;
  (2) record dibaca via PATH (open segar O_RDONLY — BUKAN via fd yang
  dipegang, karena fd dapat menunjuk ke inode yang sudah di-unlink
  tetapi isinya masih record kita) dan HARUS berisi pid + starttime +
  token acak 128-bit per-akuisisi kita.
  Bila verifikasi gagal -> tutup fd (lepas flock), keluar dengan alasan
  `ownership-revalidation-failed`, TIDAK melakukan cleanup.
  **Batas yang dicatat jujur:** pemeriksaan inode saja TIDAK CUKUP sebagai
  identitas — nomor inode didaur ulang oleh filesystem secara umum
  (tidak teramati dalam 30 percobaan unlink+recreate di VM ini: 0/30
  tmpfs, 0/30 overlay — `SSRF_SPIKE_V234.md` §4c). Token dipertahankan
  sebagai defense-in-depth (biaya ~nol); yang terbukti menahan beban di
  VM ini adalah kombinasi inode + baca-via-path, dan diagnostik T6
  inode-only mendeteksi penggantian pada 2/2 run.
- **fd WAJIB close-on-exec (MENGIKAT):** fd lock harus dibuka dengan
  O_CLOEXEC (Node/Bun `fs.openSync` sudah demikian secara default).
  Bila worker (child process) mewarisi fd lock, kematian parent TIDAK
  melepaskan flock selama worker hidup — dibuktikan FLK-T8b (contender
  tetap terblokir selama anak yatim memegang fd inheritable). Persyaratan
  ini wajib diverifikasi di staging untuk API open yang dipakai runtime
  produksi (U-29). Parent TIDAK BOLEH mewariskan fd lock ke child mana
  pun (pass_fds / pewarisan eksplisit atas fd lock DILARANG).
- **Tabel perlakuan hasil pemeriksaan proses v2.3.3 (probe ESRCH/EPERM)
  untuk LOCK dinyatakan SUPERSEDED** — jalur itu tidak ada lagi. Probe
  kematian PID tetap dipakai untuk CLEANUP WORKER (§A.5.5.1/§A.5.5.2:
  validasi identitas sebelum SIGKILL, konfirmasi exit) dan tidak berubah
  oleh revisi ini. Aturan lock rusak/tidak terbaca v2.3.3 ("JANGAN PERNAH
  hapus otomatis") digantikan oleh: isi file lock tidak lagi menjadi
  otoritas apa pun — bila record tidak terbaca, parent tetap dapat
  memperoleh flock (otoritas dari kernel); record yang tidak terbaca hanya
  dicatat sebagai peringatan observabilitas, dan parent TIDAK BOLEH
  menghapus file untuk "memperbaikinya".

Dibuktikan ADV-T2 (`SSRF_SPIKE_V234.md` §4a): interleaving yang sama
dengan ADV-T1 pada kode flock — tepat satu pemilik (2/2 run). Dibuktikan
ADV-T2sim: kedua pihak mencoba flock bersamaan — tepat satu pemenang,
kernel yang men-serialisasi (2/2 run, pemenang bervariasi). Dibuktikan
ADV-T5: unlink oleh pihak ketiga setelah acquire terdeteksi oleh
verifikasi ulang (2/2 run, 0 cleanup). Dibuktikan FLK-T1..T8
(`SSRF_SPIKE_V234.md` §5c): semantik flock kernel pada tmpfs dan overlay
(9/9 × 2 tiap filesystem).

#### A.5.5.4d Masa transisi versi campuran: flag-day (v2.3.4 — MENGIKAT)

ADV-T6 membuktikan: bila racer berkode LAMA (unlink-reclaim) berjalan
bersamaan dengan holder berkode BARU (flock), KEDUA pihak dapat berstatus
pemilik — unlink kode lama menghapus file holder baru, lalu kode lama
memperoleh lock sendiri. Jaring pengaman (verifikasi ulang inode+token)
menangkapnya SEBELUM cleanup pada 2/2 run, tetapi itu adalah jaring
pengaman, bukan penutup struktural. Karena itu:

- **Migrasi ke mekanisme flock WAJIB flag-day:** hentikan SEMUA parent
  (pastikan tidak ada proses parent lama yang masih berjalan — periksa
  `ps` + pidfile), baru kemudian start parent versi baru. Menjalankan
  versi lama dan baru secara bersamaan DILARANG selama masa transisi.
- Prosedur rollback ke versi lama mengikuti aturan yang sama (hentikan
  semua parent dulu).
- Bila verifikasi ulang gagal selama masa transisi, parent baru keluar
  dengan alasan `ownership-revalidation-failed` + page — operator
  memeriksa apakah ada parent versi lama yang masih berjalan sebelum
  start ulang.

Dibuktikan SU-T5 (`SSRF_SPIKE_V232.md` §2) pada mekanisme LAMA: 5 proses
nyata berlomba — tepat 1 pemenang, 4 kalah dengan alasan
`held-by-live-holder`. Pada mekanisme BARU (flock), padanannya adalah
ADV-T2sim (`SSRF_SPIKE_V234.md` §4a): tepat 1 pemenang, kernel yang
men-serialisasi. Dibuktikan SU-T6 pada mekanisme LAMA: pemegang lock mati
→ parent baru berhasil acquire dengan `reclaimed=true`. Pada mekanisme
BARU tidak ada lagi konsep reklamasi — pelepasan flock saat holder mati
dibuktikan FLK-T2 (contender memperoleh lock segera setelah holder
di-SIGKILL).

**Temuan jujur dari pengujian PARENT-T1b (kegagalan run pertama).**
Run pertama T1b GAGAL: worker "stubborn" ternyata mati sendiri setelah
parent di-SIGKILL meskipun handler `disconnect` dan watchdog ppid
dimatikan. Penyebab: worker tidak memegang handle aktif apa pun — saat
channel IPC tertutup, event loop Node kosong dan proses keluar sendiri.
Artinya skenario yatim TIDAK DAPAT direproduksi tanpa handle aktif.
Perbaikan harness (bukan perbaikan implementasi): worker stubborn kini
memegang interval ref'd sebagai simulasi handle native c-ares yang
tertunda — lookup DNS nyata yang menggantung memang menahan event loop.
Setelah perbaikan, T1b lolos. Kegagalan ini didokumentasikan karena ia
membuktikan satu hal penting: **worker yang tidak memegang lookup aktif
tidak bisa menjadi yatim** — bahaya yatim hanya nyata bila worker sedang
menjalankan operasi yang menahan event loop.

**U-22 — supervisor eksternal belum terbukti (risiko terbuka baru).**
Dua lapis pertama (self-exit + pidfile cleanup) terbukti di VM ini.
Lapis ketiga — supervisor platform — TIDAK DAPAT diperiksa: apakah
platform me-restart proses layanan saat crash, dan apakah ia membunuh
seluruh process group atau hanya proses utama, tidak terdokumentasi di
bundle bukti mana pun. Persyaratan staging (gerbang G6, uji SUP-01):
dokumentasi supervisor platform HARUS menyatakan (a) apakah crash
memicu restart otomatis, dan (b) apakah anak proses dibunuh bersama
parent (kill process group) atau dibiarkan hidup. Bila supervisor tidak
membunuh process group, pidfile cleanup + self-exit adalah satu-satunya
pertahanan dan harus diuji ulang di staging produksi. Tanpa bukti
supervisor, klaim "tidak ada yatim" hanya berlaku sejauh dua lapis yang
teruji di sini.

**Risiko baru U-21 — exit worker tidak terkonfirmasi.** Bila proses
worker tidak mati setelah SIGKILL (D-state, namespace bermasalah),
counter tetap, breaker tetap terbuka, dan satu-satunya jalan keluar
adalah intervensi operator (page) atau restart manual proses layanan.
Ini adalah perilaku fail-closed yang disengaja — ketersediaan
dikorbankan demi tidak berbohong pada penghitung — tetapi berarti satu
worker yang tidak bisa mati dapat menahan breaker terbuka sampai
intervensi manual. Mitigasi: alert `workerExitUnconfirmed > 0` → page;
runbook: periksa proses (`ps`), bila proses ada tetapi tidak merespons,
eskalasi ke operator infra; JANGAN memaksa decrement counter secara
manual tanpa bukti proses mati.

#### A.5.5.4e Otoritas kepemilikan flock: bagaimana proses tahu ia masih pemilik (v2.3.5 — MENJAWAB U-31)

**Pernyataan inti.** Kepemilikan lock TIDAK dibuktikan oleh isi file,
bukan oleh (dev, ino), bukan oleh token, bukan oleh heartbeat. Kepemilikan
dibuktikan oleh SATU fakta kernel: **proses ini memegang
flock(LOCK_EX|LOCK_NB) pada open file description yang sama sejak acquire,
dan fd itu masih terbuka**. (dev, ino) + token adalah DETEKTOR penggantian
path (authority fork) — ia memberi tahu bila file di path sudah bukan
file yang di-lock — tetapi ia bukan pengganti mekanisme eksklusivitas
kernel. Bila (dev, ino) cocok dan token cocok, itu BUKAN bukti "saya
pemilik"; bukti "saya pemilik" adalah flock yang masih dipegang. Bila
(dev, ino) atau token TIDAK cocok, itu bukti "sesuatu berubah di path"
dan tindakan DIBATALKAN — detektor bekerja sebagai fail-closed, bukan
sebagai otoritas.

**1. Fd yang sama sepanjang lifecycle.** Fd lock dibuka sekali di
`acquireStartupLockFlockV2` (`O_RDWR|O_CREAT`, tanpa O_EXCL, tanpa
truncate) dan dipertahankan terbuka selama masa hidup proses. Fd TIDAK
PERNAH ditutup lalu dibuka ulang, TIDAK PERNAH di-duplikasi ke fd lain
untuk keperluan verifikasi, dan TIDAK PERNAH diserahkan ke proses lain.
`verifyFlockOwnership` memakai `fstat(fd)` pada fd YANG SAMA — bukan
open baru — untuk membandingkan (dev, ino) dengan `stat(path)`.
Bila fd ditutup (proses mati, atau `releaseLock` eksplisit), flock
lepas OTOMATIS oleh kernel (dibuktikan FLK-T2/T3/T7). Tidak ada keadaan
di mana proses "masih pemilik" setelah fd-nya tertutup.

**2. CLOEXEC diverifikasi, bukan diasumsikan.** Setelah open, flag
O_CLOEXEC diperiksa dengan membaca `/proc/self/fdinfo/<fd>` dan
menguji bit `02000000` oktal pada `flags:`. Bila tidak set, startup
GAGAL (`lock-fd-not-cloexec`) — tidak ada fallback. Alasan: bila fd
lock diwariskan ke child (worker), kematian parent TIDAK melepaskan
flock selama worker hidup — dibuktikan FLK-T8b (contender tetap
terblokir selama anak yatim memegang fd inheritable) dan AUTH-T4
(Python: contender BLOCKED selama child pemegang fd hidup, ACQUIRED
setelah child mati). Node dan Bun `fs.openSync` membuka dengan
O_CLOEXEC secara default — DIVERIFIKASI AUTH-C1 (flag fdinfo
`02100001` oktal pada keduanya; round-trip `F_SETFD` Python) — tetapi
desain TIDAK mengandalkannya: verifikasi fdinfo adalah langkah wajib
di setiap acquire. Parent TIDAK BOLEH mewariskan fd lock ke child mana
pun (`pass_fds` / pewarisan eksplisit atas fd lock DILARANG); worker
menerima token lewat FILE (pidfile), bukan lewat fd.

**3. Mencegah unlink / penggantian / pembuatan ulang selama lock aktif.**
Tiga lapis, masing-masing dengan peran berbeda:
- (a) **Aturan never-unlink** (§A.5.5.4c, dibuktikan FLK-T5): file
  lock TIDAK PERNAH di-unlink oleh kode, operator, atau tooling.
  Ini adalah aturan perilaku, BUKAN penegakan kernel — flock bersifat
  advisory dan tidak dapat menghentikan proses yang tidak memanggilnya
  (lihat U-33). Satu-satunya pengecualian adalah flag-day dengan
  SEMUA parent dipastikan berhenti (§A.5.5.4d).
- (b) **Detektor penggantian path.** Setiap `verifyFlockOwnership`
  membandingkan (dev, ino) `fstat(fd)` vs `stat(path)` DAN membaca
  record via PATH (open segar `O_RDONLY` — BUKAN via fd yang dipegang,
  karena fd dapat menunjuk ke inode yang sudah di-unlink tetapi isinya
  masih record kita). Bila keduanya tidak cocok → otoritas dinyatakan
  hilang → tindakan dibatalkan. Dibuktikan AUTH-T2 (unlink+recreate
  terdeteksi, `verifiedAfterInterference=false`, 0 cleanup) dan
  AUTH-T10d (pidfile di-rename terdeteksi worker meski konten identik).
- (c) **Gating tindakan, bukan hanya deteksi.** Deteksi tanpa gating
  tidak ada gunanya. Setiap tindakan sensitif — SIGKILL worker lama,
  tulis pidfile, spawn worker, transisi READY — didahului
  `assertOwnership()` SEgar dalam tick sinkron yang sama, tanpa `await`
  di antaranya (`guardedAction`, lihat butir 5). Bila verifikasi gagal,
  fungsi tindakan TIDAK PERNAH dijalankan.

**4. Inode mismatch antara fd dan path.** Bila `fstat(fd).ino !=
stat(path).ino` (atau `dev` berbeda), itu berarti path kini menunjuk
file lain — inode lama di-unlink dan file baru dibuat, atau path
di-replace (rename/mount). Perlakuan: otoritas dinyatakan hilang;
parent menutup fd (melepas flock pada inode lama), keluar dengan alasan
`ownership-revalidation-failed` + page, TIDAK melakukan cleanup.
Daur ulang inode (nomor inode yang sama dipakai ulang oleh file baru)
tidak dapat dideteksi oleh (dev, ino) saja — karena itu record juga
memeriksa token acak 128-bit per-akuisisi; token dipertahankan sebagai
defense-in-depth (biaya ~nol), dan yang terbukti menahan beban di VM
ini adalah kombinasi inode + baca-via-path (diagnostik T6 v2.3.4:
mendeteksi penggantian 2/2 run; probe daur ulang 0/30 tmpfs, 0/30
overlay). Bila inode SAMA tetapi token BERBEDA, itu juga kegagalan
verifikasi (record ditimpa pihak ketiga) → batalkan tindakan.

**5. Gating setiap tindakan sensitif (guardedAction).** Pola yang
mengikat:

```
ok = assertOwnership(lockPath, fd, record)   // sinkron, tanpa await
if (!ok) return { ok:false, reason:"ownership-lost" }  // fn TIDAK jalan
value = fn()                                 // tick sinkron yang sama
```

`assertOwnership` = `verifyFlockOwnership`: (1) (dev, ino) fstat(fd)
vs stat(path) sama; (2) record via path berisi pid + starttime + token
kita. TIDAK ADA `await` antara revalidasi dan `fn()` — keduanya dalam
satu tick sinkron yang sama, sehingga tidak ada interleaving kooperatif
di antaranya. Jendela yang tersisa adalah antara dua syscall di dalam
tick itu (revalidasi selesai, tindakan dimulai) — jendela ini TIDAK
dapat dibuat nol dengan syscall file biasa (residual U-38). Yang
membuatnya dapat diterima adalah butir 6: tiap tindakan ITU SENDIRI
di-gating identitas, sehingga pemilik basi yang lolos dari jendela
tidak dapat menimbulkan kerusakan di luar fail-closed.

**6. Gating per-tindakan (defense-in-depth di dalam tindakan).**
- **SIGKILL worker lama:** validasi identitas per-sinyal (§A.5.5.2)
  — starttime + cmdline worker dibaca ulang sesaat sebelum `kill()`,
  dalam tick yang sama; bila tidak cocok, sinyal dibatalkan. Pemilik
  basi paling buruk membunuh worker yang identitasnya cocok dengan
  pidfile — worker yang sama yang akan dibunuh pemilik sah (SIGKILL
  idempotent; dampak terbatas).
- **Tulis pidfile:** pidfile membawa `lockToken` (token acak
  per-akuisisi parent). Worker yang membaca pidfile dengan token yang
  tidak cocok dengan record lock MENOLAK melayani SEBELUM lookup
  pertamanya (AUTH-T10b). Parent yang kalah menulis pidfile dengan
  token basi tidak dapat "membajak" worker — worker menolaknya.
- **Spawn worker:** spawn dilakukan HANYA setelah `guardedAction`
  untuk penulisan pidfile lolos; worker baru membaca pidfile yang
  ditulis parent yang memegang otoritas saat itu.
- **Transisi READY:** `guardedAction` terakhir sebelum menulis
  sinyal `parent-ready`; bila otoritas hilang di titik ini, parent
  keluar `ownership-lost-before-ready` dan TIDAK melayani lookup.

**7. Parent crash, child masih hidup, supervisor restart.**
- **Parent crash (SIGKILL):** kernel menutup fd → flock lepas
  otomatis (FLK-T2). Parent baru langsung memperoleh flock; record
  lama diklasifikasi `flock-v2-stale` (holder dinilai mati lewat
  `pidAlive` yang zombie-aware, butir 8) dan ditimpa. Dibuktikan
  AUTH-T3 (parent baru READY, worker lama dibunuh, worker baru
  melayani) dan AUTH-T7 (via supervisor stub).
- **Child (worker) masih hidup setelah parent mati:** worker
  mendeteksi lewat DUA lapis — self-exit via `disconnect`/ppid
  watchdog (PARENT-T1a/T1b v2.3.1) DAN probe pidfile flock berkala:
  bila parent mati, flock pidfile lepas → probe worker BERHASIL
  (tidak ada yang memegang) → worker menyimpulkan tidak ada parent
  hidup → exit sendiri (AUTH-T10c). Worker TIDAK PERNAH memegang fd
  lock (CLOEXEC, butir 2), sehingga kematiannya tidak menahan flock.
- **Supervisor restart:** parent baru menjalankan siklus penuh —
  pre-start scan (§A.5.5.4f), acquire flock, klasifikasi record,
  cleanup worker lama via pidfile (validasi identitas + SIGKILL +
  konfirmasi exit, §A.5.5.1/§A.5.5.2), spawn worker baru, tulis
  pidfile + flock pidfile, tunggu worker self-check, READY. Lease
  global `scan_leases` bertahan melewati restart (PARENT-T2 v2.3.1).
  Perilaku supervisor platform (apakah me-restart otomatis, apakah
  membunuh process group) TETAP NOT VERIFIED (U-22, SUP-01).
- **Dua parent tidak pernah cleanup/startup bersamaan.** Mekanisme:
  kernel men-serialisasi flock (tepat satu pemenang — AUTH-T1,
  ADV-T2sim); yang kalah KELUAR SEGERA (exit 78) tanpa cleanup,
  startup, atau penulisan pidfile. Pre-start scan menangkap parent
  lama yang hidup sebelum acquire (§A.5.5.4f). Flag-day menutup
  jendela transisi versi (§A.5.5.4d). Satu-satunya jalan menuju dua
  pemilik yang tersisa adalah proses yang TIDAK memanggil flock
  (kode lama saat transisi, operator `rm`, tooling pihak ketiga) —
  dan untuk masing-masing, verifikasi ulang + gating per-tindakan
  memastikan tidak ada cleanup yang dilakukan tanpa otoritas
  (AUTH-T5c, AUTH-T6).

**8. Liveness zombie-aware (perbaikan v2.3.5 dari diagnosis AUTH-T3).**
`pidAlive()` v2.3.4 hanya memakai `kill(pid,0)` — dan itu SALAH untuk
zombie: proses zombie (state `Z`) masih ada di tabel proses sampai
di-reap, sehingga `kill(pid,0)` SUCCEEDS padahal proses sudah mati.
Dibuktikan langsung (§4.1 `SSRF_SPIKE_V235.md`): P1 setelah SIGKILL
tanpa reap → state `Z`, `kill(pid,0)` SUCCEEDS → `classifyLockRecord`
menilai holder hidup → `flock-v2-contradiction` → parent baru menolak
start. Perbaikan: `pidAlive()` membaca state `/proc/<pid>/stat` dulu —
`Z` (zombie) atau `X`/`x` (dead) → TIDAK hidup; hanya `R`/`S`/`D`/`T`
yang dihitung hidup. Fallback `kill(pid,0)` hanya bila `/proc` tidak
dapat dibaca (error non-ESRCH → `"uncertain"`). Perbaikan yang sama
menutup jalur konfirmasi exit worker (zombie worker kini dinilai mati,
bukan "exit tidak terkonfirmasi"). Dibuktikan AUTH-T11 (setup zombie
`state=Z` + `kill0=SUCCEEDS`, parent baru tetap READY, 2/2 run).
Residual: perbaikan bergantung pada `/proc`; runtime tanpa `/proc`
kembali ke fallback `kill(pid,0)` (U-37).

Dibuktikan AUTH-T1..T11 + AUTH-C1 (`SSRF_SPIKE_V235.md` §3):
18/18 PASS × 2 run.


#### A.5.5.4f Mixed-version fail-closed: dua lapis pencegahan (v2.3.5 — MENGIKAT)

ADV-T6 (v2.3.4) membuktikan SATU arah bahaya transisi: parent BARU
memperoleh flock DULU, lalu parent LAMA (unlink-reclaim) meng-unlink
file-nya dan memperoleh lock sendiri — dua pemilik, jaring pengaman
(verifikasi ulang) yang menangkapnya sebelum cleanup. Revisi ini
menjawab pertanyaan yang belum dijawab v2.3.4: bagaimana dengan arah
SEBALIKNYA — parent LAMA memperoleh lock DULU, lalu parent BARU datang?
Dan bagaimana mencegah dua versi menjadi pemilik secara bersamaan,
bukan hanya mendeteksinya?

**Bahaya reverse (old-first) — diidentifikasi v2.3.5.** Parent lama
TIDAK PERNAH memanggil flock. Ia membuka file lock, menulis record
format lama (tanpa field `protocol`), dan menganggap dirinya pemilik.
Parent baru membuka file yang sama dan memanggil
`flock(LOCK_EX|LOCK_NB)` — flock BERHASIL, karena tidak ada flock yang
dipegang siapa pun. Parent baru pun menganggap dirinya pemilik. KEDUA
pihak berstatus pemilik secara bersamaan — dan tidak seperti arah
new-first, tidak ada unlink yang terjadi di sini, sehingga TIDAK ADA
peristiwa yang dapat dideteksi verifikasi ulang inode: (dev, ino)
keduanya sama (file yang sama, inode yang sama), token parent baru
tertulis di record (parent baru baru saja menimpa record lama).
Satu-satunya yang membedakan adalah: record SEBELUM ditimpa adalah
format lama dengan holder yang masih hidup. Karena itu pencegahan
harus terjadi SEBELUM penimpaan — pada klasifikasi record dan
pre-start scan.

**Lapis 1 — pre-start guard (scan `/proc`).** Sebelum acquire, parent
baru memindai `/proc` untuk proses parent lain (marker cmdline
`v235-parent`). Bila parent lain hidup → keluar `other-parent-alive`
tanpa acquire, tanpa cleanup, tanpa penulisan apa pun. Marker HARUS
cocok sebagai TOKEN argv yang persis (cmdline dipecah `\0`), BUKAN
substring — pencocokan substring terbukti false positive saat pengujian
(shell `bash -c` yang menjalankan parent mengandung marker di
argv-nya; temuan AUTH-T3, risiko U-40). Scan bergantung pada `/proc`
(Linux) dan marker yang unik per layanan; bila `/proc` tidak dapat
dibaca → `parent-scan-failed` + page (fail-closed). Dibuktikan
AUTH-T5a (old parent hidup → new keluar `other-parent-alive`, 2/2 run).

**Lapis 2 — klasifikasi record sebelum penimpaan.** Setelah flock
berhasil, parent baru membaca record yang ADA di path dan
mengklasifikasikannya SEBELUM menimpa:
- `flock-v2-self` (pid sendiri) → lanjut.
- `flock-v2-stale` (holder mati — `pidAlive` zombie-aware) → aman
  ditimpa.
- `flock-v2-contradiction` (holder `flock-v2` lain yang hidup) → ini
  tidak mungkin terjadi bila semua pihak memakai flock (kernel tidak
  memberi dua flock eksklusif pada inode yang sama) — bila terjadi,
  itu bukti ada yang salah pada asumsi (mis. dua inode, dua filesystem,
  atau flock yang tidak bekerja) → keluar + page.
- `old-live` (format lama tanpa `protocol`, holder hidup — starttime
  cocok, atau starttime tidak ada) → lepas flock, keluar
  `held-by-old-version`, tulis sentinel `startup.lock.mixed`, page.
- `old-stale` (holder lama mati) → aman ditimpa.
- `unreadable` (record tidak dapat dibaca / JSON rusak / field hilang)
  → lepas flock, keluar `lock-record-unreadable` + page.
  **MEMPERKETAT v2.3.4:** aturan v2.3.4 mengizinkan record tak terbaca
  sebagai observabilitas-only ("isi file lock bukan otoritas"). Aturan
  itu berasumsi operasi versi tunggal dan TIDAK AMAN bila holder lama
  yang hidup dapat bersembunyi di balik record korup — parent baru
  akan menimpa record, mengklaim kepemilikan, dan berjalan bersamaan
  dengan holder lama tanpa satu pun peringatan. Karena itu v2.3.5
  mengembalikan fail-closed untuk record tak terbaca. Dibuktikan
  AUTH-T5b (scan dinonaktifkan test-only → klasifikasi sendiri yang
  menolak, `held-by-old-version` + sentinel, 2/2 run) dan AUTH-T8a/T8b
  (record korup → `lock-record-unreadable`, 2/2 run).

**Deteksi bukan pencegahan — dan apa yang mencegah.** ADV-T6 dan
AUTH-T5c membuktikan: pada masa transisi, deteksi (verifikasi ulang)
menangkap konflik SEBELUM cleanup, tetapi tidak MENCEGAH dua pemilik
untuk ada. Pencegahan struktural HANYA ada satu: **flag-day**
(§A.5.5.4d) — hentikan SEMUA parent sebelum upgrade/rollback, sehingga
tidak pernah ada dua versi yang berjalan bersamaan. Lapis 1 + lapis 2
di atas adalah pencegahan untuk SATU arah transisi yang spesifik
(old-first, new-second) DAN deteksi dini untuk arah lainnya — mereka
mengurangi jendela bahaya, bukan menghilangkannya. Bila flag-day
DILANGGAR (dua versi berjalan bersamaan), yang terjadi adalah:
(a) arah old-first → lapis 1/2 menolak parent baru (tidak ada dua
pemilik, tetapi parent baru tidak dapat start sampai old parent
berhenti — ketersediaan dikorbankan); (b) arah new-first → kedua pihak
berstatus pemilik sampai verifikasi ulang parent baru menangkapnya
(AUTH-T5c: 0 cleanup) — tidak ada kerusakan, tetapi ada DUA pemilik
yang tercatat sampai salah satu keluar. Dalam kedua kasus TIDAK ADA
cleanup ganda — itu yang dijamin jaring pengaman. Yang TIDAK dijamin
tanpa flag-day adalah "tepat satu pemilik yang tercatat".

**Aturan yang mengikat dari bagian ini:**
- Record lock WAJIB membawa `protocol: "flock-v2"` (ditulis oleh
  parent baru pada setiap acquire).
- Klasifikasi record SEBELUM penimpaan adalah langkah wajib; menimpa
  record tanpa klasifikasi DILARANG.
- Pre-start scan adalah langkah wajib; flag test-only `V235_NO_SCAN`
  TIDAK ADA di implementasi produksi.
- Sentinel `startup.lock.mixed` ditulis setiap kali mixed-version
  terdeteksi (untuk diagnosis operator) — sentinel BUKAN lock dan
  tidak memberi otoritas apa pun.
- Flag-day (§A.5.5.4d) tetap MENGIKAT dan tidak digantikan oleh lapis
  ini.

Dibuktikan AUTH-T5a/T5b/T5c + AUTH-T8a/T8b (`SSRF_SPIKE_V235.md` §3).


### 3. Uji yang membuktikan perilaku ini (gerbang G6 — TERM-01..TERM-04, PARENT-01..PARENT-02)

Bukti lengkap: `SSRF_SPIKE_V231.md` §1–§2 (TERM 23/23 PASS, PARENT
15/15 PASS, masing-masing dijalankan ulang 2×).

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| TERM-01 | SIGKILL worker (3 orphaned, breaker terbuka) | Counter tidak berubah saat kill dikirim; turun hanya setelah event `exit` (`orphaned` 3→0, `orphanedTerminated`=3); breaker menutup setelah exit |
| TERM-02 | Urutan pembukaan breaker | Evaluasi `_maybeCloseBreaker()` 0× saat kill, tepat 1× setelah exit; lookup sebelum exit ditolak `DNS_CIRCUIT_OPEN` |
| TERM-03 | Exit tidak pernah terkonfirmasi | Counter tetap, breaker tetap terbuka, `workerExitUnconfirmed`=1 — bahkan setelah +500 ms tambahan |
| TERM-04 | Terminate ganda / sudah mati | Idempotent; tidak ada counter negatif |
| PARENT-01 | Parent SIGKILL saat lookup berjalan (worker normal) | Worker mati (`disconnect`); request in-flight fail-closed tanpa vonis; tidak ada yatim |
| PARENT-02 | Worker stubborn + parent baru | Worker lama tetap hidup; parent baru membunuhnya via pidfile; worker baru melayani; lease global bertahan melewati restart; tidak ada yatim tersisa |

### A.5.6 Batas lintas instance (v2.3.1 — MENJAWAB KEBERATAN ATAS BATAS 8 OPERASI)

**Penegasan yang mengikat: batas 8 operasi hidup
(`maxActive + orphanHardCap`) adalah batas PER PROSES, bukan batas
global platform.** U-18 TETAP TERBUKA dengan angka ini.

**Perhitungan worst-case:**

- Per proses: `liveOps ≤ maxActive + orphanHardCap = 4 + 4 = 8`
  (nilai produksi; skala tes: 2 + 3 = 5).
- Lintas instance: `liveOps_total ≤ N × 8`, dengan N = jumlah instance.
  Contoh: N = 10 → ≤ 80; N = 100 → ≤ **800** operasi DNS hidup.

**Hubungan dengan `scan_leases` global (batas 5 pemeriksaan):**

- `scan_leases` membatasi **pemeriksaan** yang berjalan bersamaan
  (maks 5 di seluruh platform). Setiap pemeriksaan menjalankan lookup
  DNS secara sekuensial (satu per satu: URL awal → tiap hop redirect →
  RDAP), jadi satu pemeriksaan menahan maksimal **1** lookup aktif pada
  satu waktu.
- TETAPI `scan_leases` TIDAK membatasi akumulasi orphaned: lease
  dilepas saat pemeriksaan selesai (pemanggil menerima `DNS_TIMEOUT`),
  sementara lookup DNS-nya tetap hidup sebagai orphaned di proses
  tersebut. Orphaned terakumulasi dari pemeriksaan yang SUDAH SELESAI,
  bukan dari pemeriksaan yang sedang berjalan — sehingga batas 5
  pemeriksaan tidak mengikat jumlah orphaned.
- Karena itu worst-case lintas instance adalah **8N**, bukan 5. Contoh
  jujur: 100 instance × 8 = **800 operasi DNS hidup** — semuanya lookup
  yang menggantung pada resolver yang tidak kooperatif.

**Alasan batas global orphaned belum masuk P0:**

1. Butuh store bersama (seperti `scan_leases`) dengan increment/decrement
   atomik lintas proses — tetapi decrement membutuhkan pengetahuan kapan
   lookup di proses LAIN settle, yang hanya bisa diketahui lewat
   heartbeat atau lease-TTL pada entri orphaned. Ini menambah satu
   mekanisme state terdistribusi baru dengan failure mode-nya sendiri
   (DB down → seluruh DNS fail-closed, lihat U-14).
2. Batas per proses (8) + breaker per proses + restart worker + metrik
   dan alert (`forceReleased > 0` → page) sudah membatasi kerusakan per
   instance dan membuat kondisi abnormal langsung terlihat operator.
3. Akumulasi orphaned mensyaratkan resolver yang menggantung — kondisi
   abnormal yang di-page, bukan kondisi operasi normal.

**Syarat agar batas global orphaned masuk fase berikutnya (P2):**
(a) store bersama dengan TTL-lease pada entri orphaned teruji di staging
di bawah beban multi-instance (R-15 diperluas); (b) failure mode
store-nya terdokumentasi (apa yang terjadi saat store down — fail-closed
atau fallback ke batas per proses); (c) keputusan eksplisit pemilik.
Sampai syarat itu terpenuhi, U-18 TETAP TERBUKA dengan angka worst-case
8N di atas sebagai risiko yang diterima sementara.

**Uji yang membuktikan perilaku ini:** perhitungan worst-case di atas
adalah analisis atas batas yang ditegakkan per proses (dibuktikan
ORPH-T1: `liveOps ≤ maxActive + cap` SELALU) dan batas lease global
(dibuktikan LSE-T1 v2.2: tepat 1 pemenang per ronde). Tidak ada uji
multi-instance dengan 100 proses di VM ini — beban ratusan instance
tetap menjadi uji staging R-15 (U-17).

### A.6 Respons penolakan yang aman (anti information disclosure)

**Prinsip:** penolakan guard tidak boleh menjadi oracle. Penyerang tidak boleh
bisa membedakan "host internal ada dan menolak" dari "host internal tidak ada",
dan tidak boleh menerima data apa pun yang berasal dari target.

Respons penolakan (satu bentuk untuk SEMUA alasan penolakan):

```json
{
  "blocked": true,
  "verdict": null,
  "score": null,
  "reason": "URL ditolak oleh kebijakan keamanan",
  "checked_at": "<waktu ISO>"
}
```

Aturan yang mengikat:

1. **Satu pesan generik** untuk semua alasan (IP privat, localhost, metadata,
   DNS gagal, redirect terlarang). JANGAN mengembalikan alasan spesifik
   ("IP 127.0.0.1 terlarang") ke pengguna — alasan spesifik hanya masuk log
   keamanan server-side.
2. **Tidak ada** `http_status`, `final_url`, `page_title`, rantai redirect,
   atau alamat kontrak dari target yang ditolak — baik di respons maupun di
   tabel `checks`.
3. **Tidak ada baris `checks`** untuk URL yang ditolak. Yang dicatat adalah
   log keamanan terpisah: hash URL (SHA-256, bukan URL mentah bila mengandung
   data sensitif), kategori penolakan, waktu, dan hash IP pemanggil — retensi
   30 hari, tidak ditampilkan di UI riwayat publik.
4. **Waktu respons dibuat seragam** sebisa mungkin: penolakan yang terjadi di
   `normalizeUrl()` (instan) vs setelah resolve (lambat) tetap memberi celah
   timing oracle kecil. Mitigasi: tidak dikejar kesempurnaan timing di P0;
   dicatat sebagai keterbatasan yang diketahui (timing oracle residual).
5. UI menampilkan penolakan sebagai **"Pemeriksaan ditolak oleh kebijakan
   keamanan"** — BUKAN sebagai vonis BAHAYA/WASPADA/LEBIH AMAN dan BUKAN
   sebagai UNVERIFIED. Vonis keamanan hanya diberikan untuk pemeriksaan yang
   benar-benar dilakukan.

### A.7 Rate limiting & autentikasi (P1-2, desain) — v2

- **Tanpa autentikasi untuk saat ini** (sesuai keputusan pemilik: tidak ada
  akun di Phase 1). Rate limiting berbasis IP pemanggil.
- **Kuota yang disetujui pemilik (v2): 10 pemeriksaan / menit / IP dan
  100 / jam / IP.** IP disimpan sebagai **hash** (SHA-256 + salt
  server-side), bukan IP mentah; retensi 24 jam (sesuai
  SECURITY_REQUIREMENTS.md §4).
- Respons saat kuota habis: HTTP 429 + pesan generik "Terlalu banyak
  permintaan, coba lagi nanti" — tanpa detail kuota yang tersisa.
- **Konkurensi (v2.1 — KOREKSI):** batas **5 pemeriksaan `checkLink`
  bersamaan berlaku GLOBAL** (bukan 5 per instance) — lihat §A.7.2 v2.1.
  Bila batas tercapai, tolak langsung dengan 429 (tanpa antrean lintas
  instance).
- **CAPTCHA:** tidak di P0/P1 awal (butuh penyedia pihak ketiga + kunci).
  Bila abuse berlanjut setelah rate limit, CAPTCHA adalah langkah berikutnya
  (P2) — bukan bagian dari rancangan ini.
- **Pengecualian cron internal:** cron auto-add 2 jam memakai `checkLink`
  sebagai verifikasi. Selama mitigasi (a), checkLink menolak semua → cron
  TIDAK boleh mem-bypass guard lewat jalur khusus yang tidak diaudit. Opsi:
  (a) cron melewati langkah checkLink dan menandai kandidat
  "belum terverifikasi link" (tidak auto-add), atau (b) cron memakai kuota
  rate-limit terpisah dengan token server-side yang tidak terekspos ke
  pengguna. Rancangan ini merekomendasikan **(a)** — lebih sederhana dan
  tidak menciptakan jalur bypass.

#### A.7.1 Sumber IP pemanggil yang tepercaya (v2)

**Status: NOT VERIFIED — topologi runtime artifact tidak terdokumentasi.**
Audit tidak menemukan dokumen tentang bagaimana platform runtime
meneruskan alamat IP klien ke server artifact (`space.json` hanya berisi
`entry`/`name`/`platformVersion`/`runtime`/`slug`; tidak ada konfigurasi
ingress/proxy). Karena itu rancangan ini TIDAK BOLEH mengasumsikan satu
pun sumber IP — ia menetapkan hierarki kepercayaan dan langkah discovery
yang wajib dilakukan sebelum P1-2 diimplementasikan:

| Sumber kandidat | Kepercayaan | Keterangan |
| --- | --- | --- |
| Alamat peer TCP langsung (`socket.remoteAddress`) | **Tertinggi** — tidak dapat dipalsukan oleh klien | Ini adalah alamat yang benar-benar membuka koneksi ke server. Bila platform menempatkan ingress/proxy di depan server, nilai ini adalah alamat proxy — bukan alamat pengguna — dan rate limit akan menghitung per proxy (semua pengguna berbagi kuota). Itu aman (fail-closed untuk abuse) tetapi dapat memblokir pengguna legit secara massal bila proxy-nya tunggal. |
| Header yang disetel platform sendiri (mis. header khusus ingress) | Tinggi — HANYA bila platform mendokumentasikan bahwa header itu ditulis/ditimpa oleh ingress-nya sendiri | Harus ada bukti dokumentasi atau perilaku (uji: kirim header palsu dari klien; bila nilai yang diterima server tidak berubah, header itu tepercaya). Tanpa bukti itu, header ini TIDAK BOLEH dipercaya. |
| `X-Forwarded-For` / `X-Real-IP` dari klien | **TIDAK dipercaya** | Siapa pun dapat mengirim `X-Forwarded-For: 1.2.3.4` dan berpura-pura menjadi IP lain — untuk menghindari rate limit (dengan merotasi IP palsu) maupun untuk menjebak IP orang lain (agar IP korban yang terblokir). |
| `CF-Connecting-IP` / header sejenis dari CDN | Hanya bila platform mendokumentasikan CDN di depan server | Sama seperti baris kedua: butuh bukti. |

**Aturan anti-spoofing yang mengikat:**
1. JANGAN PERNAH membaca `X-Forwarded-For` sebagai IP pemanggil, kecuali
   langkah discovery (di bawah) membuktikan ada SATU proxy tepercaya yang
   menimpa header itu — dan bila demikian, baca HANYA entri yang ditambahkan
   proxy tepercaya itu (entri terakhir dari rantai yang berasal dari proxy
   tepercaya), dan abaikan entri lain.
2. Bila tidak ada bukti proxy tepercaya: gunakan `socket.remoteAddress`
   sebagai IP pemanggil. Bila itu ternyata alamat proxy tunggal, rate
   limit berlaku per proxy — terima konsekuensinya (kuota bersama) dan
   catat sebagai keterbatasan; JANGAN "memperbaiki" dengan mempercayai
   `X-Forwarded-For` tanpa bukti.
3. IP pemanggil yang dipakai untuk rate limit SELALU disimpan sebagai hash
   (SHA-256 + salt server-side), bukan mentah; retensi 24 jam.
4. Respons 429 TIDAK BOLEH mengungkapkan IP yang terblokir atau sisa kuota.

**Langkah discovery wajib sebelum P1-2 (P1-2a):** (1) baca dokumentasi
platform runtime tentang ingress/proxy dan header yang diteruskannya;
(2) uji di staging: kirim request dengan `X-Forwarded-For` palsu dan
`X-Real-IP` palsu, lalu catat nilai IP apa yang diterima server; (3) catat
hasilnya (sumber IP yang terbukti tepercaya) di `SECURITY_REQUIREMENTS.md`
§4 dan di laporan implementasi P1-2. Bila dokumentasi tidak tersedia dan
uji tidak dapat dilakukan, keputusan default adalah
`socket.remoteAddress` + kuota bersama per proxy (butir 2 di atas).

#### A.7.2 Rate limit & konkurensi pada multi-instance (v2.1 — KOREKSI)

**Masalah:** bila server berjalan sebagai SATU instance, state in-memory
(Map IP-hash → counter + antrean) sudah cukup. Bila server berjalan
multi-instance (lebih dari satu proses/container di balik load balancer),
state in-memory TIDAK cukup: penyerang dapat menyebar request ke
instance yang berbeda dan masing-masing instance menghitung kuotanya
sendiri — kuota efektif menjadi `N × kuota` untuk N instance.

| Topologi | Store yang benar | Konsekuensi bila salah pilih |
| --- | --- | --- |
| Satu instance (satu proses) | In-memory (Map + timer) — cukup | — |
| Multi-instance, ada DB bersama | **Counter di database bersama** (tabel `rate_limits` di database artifact yang sama dengan `checks`): increment atomik per jendela waktu (menit/jam) per hash IP; baca + increment dalam satu transaksi/operasi atomik agar tidak ada race antar instance | In-memory di tiap instance → kuota bocor sebesar faktor jumlah instance; antrean konkurensi per instance → total konkurensi `N × 5` |
| Multi-instance, tanpa DB bersama | Store eksternal bersama (mis. Redis/KV platform) — memerlukan layanan yang belum ada; ATAU terima kuota per instance dengan kuota yang dibagi (`kuota / N`) — rapuh bila N berubah | Tanpa store bersama, tidak ada rate limit global yang benar |

**Keputusan rancangan v2.1 — batas konkurensi GLOBAL (koreksi atas v2):**
v2 menetapkan "maks 5 bersamaan per instance" dengan catatan batas global
menjadi `5 × N` — itu TIDAK DAPAT DITERIMA sebagai batas global, karena
batas yang bocor sebesar faktor jumlah instance bukan batas. **Ditetapkan:
batas 5 pemeriksaan bersamaan berlaku GLOBAL, ditegakkan dengan mekanisme
bersama, bukan per instance.**

Mekanisme yang ditetapkan — tabel lease DB bersama `scan_leases`:

| Aspek | Ketentuan |
| --- | --- |
| Tabel | `scan_leases` di database artifact yang sama dengan `checks` (sudah ada — tidak butuh layanan baru): kolom `id` (token lease acak), `ip_hash` (hash IP pemanggil, untuk observabilitas), `acquired_at`, `expires_at` |
| Acquire | Dalam SATU transaksi: hitung lease yang masih hidup (`expires_at > now`); bila < 5 → INSERT lease baru dan lanjutkan; bila ≥ 5 → ROLLBACK dan tolak. Pengecekan + insert atomik — tidak ada race antar instance |
| TTL lease | **25 detik** (lebih panjang dari timeout global 20 detik + buffer 5 detik): lease yang tidak dilepas (proses mati di tengah pemeriksaan) kedaluwarsa sendiri dan tidak memblokir selamanya |
| Release | Lease DIHAPUS eksplisit di blok `finally` saat pemeriksaan selesai (sukses, ditolak guard, atau timeout) — slot langsung tersedia kembali |
| Reaping | Lease kedaluwarsa dihapus oleh pekerjaan berkala ATAU secara lazy pada acquire berikutnya (hitung hanya lease hidup) — tidak ada proses latar terpisah yang wajib |
| Saat penuh | **Tolak langsung dengan 429** + pesan generik "Terlalu banyak permintaan, coba lagi nanti" — TANPA antrean lintas instance (antrean terdistribusi menambah kompleksitas head-of-line blocking dan tidak dibutuhkan pada batas sekecil ini; antrean FIFO 10 detik v2 DIHAPUS untuk jalur global) |
| Backstop lokal | Setiap instance TETAP memegang semaphore in-memory maks 5 sebagai backstop lokal (melindungi satu proses dari lonjakan internal) — tetapi batas yang MENGIKAT adalah lease global 5; semaphore lokal tidak pernah mengizinkan lebih dari yang diizinkan lease global |
| Perilaku saat DB lease tidak tersedia | Fail-closed: tolak dengan 503 generik (sama seperti §A.7.2 v2 untuk rate limit) — BUKAN lolos tanpa batas |

**JANGAN menganggap rate limit DB otomatis membatasi konkurensi (koreksi
eksplisit atas asumsi yang mungkin terbaca dari v2).** Rate limit
(`rate_limits`: 10/menit + 100/jam per IP) membatasi JUMLAH pemeriksaan per
IP per jendela waktu; konkurensi (`scan_leases`: maks 5 bersamaan) membatasi
PEMERIKSAAN YANG SEDANG BERJALAN pada satu saat. Keduanya mekanisme yang
berbeda, dengan tabel yang berbeda, dan keduanya harus lolos:
- **Urutan gate:** (1) rate limit per IP → (2) lease konkurensi global →
  (3) pemeriksaan. Gagal di gate mana pun → 429 generik (tanpa membedakan
  gate mana yang menolak — jangan bocorkan informasi).
- **Interaksi:** satu IP yang membanjiri request akan terkena rate limit
  LEBIH DULU (10/menit) sebelum sempat menghabiskan slot konkurensi
  global; sebaliknya 5 pengguna berbeda yang sah tetap dapat memakai
  kelima slot bersamaan. Rate limit melindungi dari SATU penyerang;
  lease konkurensi melindungi KAPASITAS server dari SEMUA pemanggil.
- **Cron internal:** cron auto-add memakai `checkLink` dan tunduk pada
  KEDUA gate yang sama (tanpa bypass — §A.7); selama mitigasi (a), cron
  menandai "belum terverifikasi link" dan tidak auto-add.

**Perilaku saat store tidak tersedia:** bila database rate limit tidak
dapat dijangkau (error koneksi), pilihan fail-closed adalah **tolak
request dengan 503 generik** ("layanan pemeriksaan sedang tidak tersedia")
— BUKAN lolos tanpa rate limit. Alasannya: fail-open pada rate limit
membuka banjir tepat saat sistem sedang bermasalah. Pengecualian: bila
database utama (`checks`) sendiri tidak tersedia, seluruh `checkLink`
sudah gagal juga — jadi tidak ada kasus di mana rate limit mati
sementara pemeriksaan tetap jalan.

**Pembersihan:** baris `rate_limits` yang kedaluwarsa (> 1 jam + buffer)
dihapus oleh pekerjaan berkala (atau pada tulis berikutnya — lazy
cleanup); retensi hash IP maksimal 24 jam, selaras dengan §A.7.

#### A.7.3 Atomicity lease global `scan_leases` per database (v2.2 — WAJIB diperkuat)

**Pernyataan masalah:** transaksi biasa TIDAK OTOMATIS menjamin operasi
`COUNT + INSERT` aman dari race antar-instance. Dua instance yang
bersamaan menghitung lease hidup = 4, keduanya menyimpulkan "masih ada
slot", keduanya INSERT — total menjadi 6 dan batas global 5 DILAMPAUI.
Mekanisme atomicity HARUS ditetapkan berdasarkan database aktual yang
dipakai — dan berbeda antara SQLite (live) dan PostgreSQL (target).
Bagian ini menetapkan mekanisme untuk KEDUANYA, beserta isolation
level, locking, dan strategi retry.

**Skema (sama untuk kedua database):**

```sql
CREATE TABLE scan_leases (
  id TEXT PRIMARY KEY,          -- token lease acak (bukan urutan)
  ip_hash TEXT NOT NULL,        -- hash IP pemanggil, observabilitas
  acquired_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_scan_leases_expires ON scan_leases (expires_at);
```

##### SQLite (database live artifact) — TERBUKTI

SQLite menserialisasi semua penulis pada level database (satu write
lock untuk seluruh database; `isolation_level` efektif SERIALIZABLE
untuk transaksi tulis). Karena itu DUA mekanisme berikut keduanya aman
— dan keduanya TERBUKTI dalam pengujian v2.2 (`SSRF_SPIKE_V22.md` §2,
Python sqlite3 3.45.1, 8 proses serentak, 3 ronde per mekanisme → tepat
1 pemenang tiap ronde, total hidup 5):

| Mekanisme | Cara kerja | Kenapa atomik di SQLite |
| --- | --- | --- |
| **(A) Single-statement (utama)** | Satu statement: `INSERT INTO scan_leases (...) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM scan_leases WHERE expires_at > ?) < 5` — lalu periksa `rowcount`: 1 = lease diperoleh, 0 = ditolak 429 | Satu statement dieksekusi secara atomik di bawah write lock database; tidak ada jendela antar COUNT dan INSERT |
| **(B) Transaksi `BEGIN IMMEDIATE`** | `BEGIN IMMEDIATE` → `SELECT COUNT(*) ...` → bila < 5 `INSERT` → `COMMIT`; bila ≥ 5 `ROLLBACK` | `BEGIN IMMEDIATE` mengambil RESERVED/write lock di awal transaksi, sehingga penulis lain diblokir (busy timeout 5 dtk) sampai transaksi selesai — hitung dan INSERT terjadi di bawah lock yang sama |

Aturan implementasi SQLite: koneksi memakai `timeout` (busy timeout)
5 detik — bila lock tidak diperoleh dalam 5 detik, acquire GAGAL
dengan 503 fail-closed (bukan menunggu tanpa batas). `rowcount`
harus diperiksa secara eksplisit pada mekanisme (A): `rowcount == 0`
berarti ditolak, BUKAN error.

##### PostgreSQL (target migrasi Supabase) — DITETAPKAN, BELUM TERUJI DI SINI

**PostgreSQL TIDAK tersedia di environment ini** (`psql`/`postgres`/
`initdb` tidak ditemukan), sehingga mekanisme berikut adalah spesifikasi
yang WAJIB diuji di staging dengan PostgreSQL nyata (gerbang G6)
sebelum cutover — bukan klaim yang sudah terbukti.

**Peringatan yang mengikat:** mekanisme (A) SQLite — single-statement
`INSERT ... SELECT ... WHERE (SELECT COUNT(*)) < 5` — **TIDAK AMAN**
di PostgreSQL di bawah `READ COMMITTED`. Setiap statement melihat
snapshot per awal statement; `COUNT(*)` tidak mengunci baris yang
dihitung. Dua statement bersamaan dapat sama-sama melihat count = 4
sebelum salah satu INSERT, lalu keduanya INSERT → total 6. **Jangan
memindahkan mekanisme (A) ke PostgreSQL tanpa locking.**

Mekanisme yang ditetapkan untuk PostgreSQL (pilih satu sebagai utama,
satunya sebagai alternatif — keputusan dicatat di laporan P1-2):

| Mekanisme | Cara kerja | Isolation level & locking |
| --- | --- | --- |
| **(P1) Advisory lock transaksi (utama)** | Dalam SATU transaksi: `SELECT pg_advisory_xact_lock(727271)` (kunci tetap untuk `scan_leases`) → `SELECT COUNT(*) FROM scan_leases WHERE expires_at > now()` → bila < 5 `INSERT` → `COMMIT`; bila ≥ 5 `ROLLBACK`. Lock dilepas otomatis saat transaksi berakhir (commit/rollback) | `READ COMMITTED` sudah cukup — advisory lock menserialisasi semua acquire antar instance; tidak ada dua transaksi yang menghitung bersamaan. Lock key 727271 didokumentasikan sebagai konstanta dan TIDAK dipakai untuk keperluan lain |
| **(P2) Counter row (alternatif)** | Satu baris penghitung `lease_counter(id=1, used INT)`: `UPDATE lease_counter SET used = used + 1 WHERE id = 1 AND used < 5 RETURNING used` — `rowcount 1` = lease diperoleh (lalu INSERT baris lease dalam transaksi yang sama); `rowcount 0` = ditolak 429. Release: `UPDATE lease_counter SET used = used - 1 WHERE id = 1 AND used > 0` dalam transaksi yang sama dengan DELETE baris lease | `UPDATE` mengambil row lock eksklusif pada baris counter — semua acquire bersaing pada satu baris dan diserialisasi oleh lock itu. `READ COMMITTED` cukup. Kelemahan: counter dapat menyimpang dari jumlah baris lease bila release gagal — karena itu reaper berkala (lihat di bawah) MENYELARASKAN counter dengan `COUNT(*)` lease hidup setiap 60 detik, dan counter TIDAK PERNAH dipakai sebagai satu-satunya sumber kebenaran saat terjadi selisih (bila selisih, yang dipakai adalah `COUNT(*)` + advisory lock) |

**Strategi retry bila terjadi konflik (PostgreSQL):** konflik yang
mungkin: `40001` (serialization failure, bila suatu saat memakai
`SERIALIZABLE`) dan `40P01` (deadlock detected). Retry dengan
exponential backoff **25 ms → 50 ms → 100 ms, maks 3 percobaan**;
setiap percobaan ulang menjalankan SELURUH acquire dari awal (bukan
melanjutkan transaksi yang gagal). Setelah 3 percobaan gagal →
**503 fail-closed** ("layanan pemeriksaan sedang tidak tersedia"),
bukan lolos tanpa batas. Retry HANYA untuk error konflik (40001/40P01
dan timeout lock); error lain (mis. koneksi putus) langsung 503 tanpa
retry. Mekanisme advisory lock (P1) praktis tidak menghasilkan 40001/
40P01 karena tidak ada dua transaksi yang bersaing pada data yang
sama — retry adalah pengaman, bukan jalur normal.

**Pengujian simultan (gerbang G6) — wajib untuk KEDUA database:**

| Uji | Cara | Kriteria lolos |
| --- | --- | --- |
| LSE-01 | 8 instance serentak, tersisa 1 slot (dari batas 5) | Tepat **1** pemenang; total lease hidup = 5 (tidak pernah 6) |
| LSE-02 | Ulangi LSE-01 sebanyak 3 ronde | Tepat 1 pemenang tiap ronde |
| LSE-03 | Lease kedaluwarsa (TTL 25 dtk produksi; 2 dtk skala tes) | Slot bebas setelah TTL; acquire berhasil |
| LSE-04 | Lease yatim — proses mati sebelum release | Ditolak selama TTL; diambil alih setelah TTL lewat |
| LSE-05 | Kegagalan release (release id yang tidak ada / release dua kali) | Rowcount 0, tanpa error; lease tetap kedaluwarsa sendiri; tidak ada slot yang macet selamanya |
| LSE-06 (PostgreSQL saja) | Uji yang sama dengan server PostgreSQL nyata di staging, termasuk percobaan konflik bersamaan | Sama seperti LSE-01/02; tambahan: tidak ada error 40001/40P01 yang tidak tertangani |

**Bukti yang sudah ada (SQLite):** LSE-T1..LSE-T4 di
`SSRF_SPIKE_V22.md` §2 — LSE-01/02 (3 ronde × 8 proses, kedua
mekanisme), LSE-03 (TTL), LSE-04 (yatim), LSE-05 (release gagal)
— **5/5 PASS**. **Bukti PostgreSQL: BELUM ADA** — wajib dihasilkan
di staging (LSE-06) sebelum cutover; tanpa itu, gerbang G6 tidak
lolos.

**Perilaku saat DB lease tidak tersedia (tetap berlaku):** fail-closed
503 generik — bukan lolos tanpa batas (lihat §A.7.2). Bila DB lease
lambat (bukan down), timeout acquire 5 detik berlaku; setelah itu 503.

---

## B. File dan fungsi yang akan diubah

Sumber: inspeksi audit `94ecc20a` (build `e9f0a944`) atas `server/src/actions.ts`,
`client/src/api.ts`, `space.json`, `package.json`, `bunfig.toml`, dan dokumen
fondasi. Nama file/fungsi mengikuti hasil inspeksi; bila nama sebenarnya di
repo berbeda saat implementasi dimulai, implementor wajib menyesuaikan daftar
ini dan mencatat perbedaannya di laporan implementasi.

### B.1 `server/src/actions.ts` — file utama (semua perubahan P0/P1 ada di sini)

| Fungsi / bagian | Perubahan | Tidak berubah |
| --- | --- | --- |
| `normalizeUrl()` | **P0-5 (diperluas) — v2:** tolak userinfo; tolak hostname literal IP privat/loopback/link-local (setelah normalisasi bentuk IP — §B.4); tolak `localhost` dan `metadata.*` (suffix match, bukan hanya dua hostname eksak); tolak zone identifier (`%...`); normalisasi hostname (lowercase, buang trailing dot, IDNA); **tolak port di luar 80/443 (disetujui pemilik v2 — diterapkan di P0-5, bukan ditunda ke P1-3)** | Perilaku dasar tetap: tambah prefix `https://` bila tanpa skema; tolak protokol non-http(s); batas panjang URL 2048 (skema zod) |
| `fetchText(url, cap)` | **P0-1 + P0-3 + P1-1 (dirombak jalurnya, bukan logikanya):** ganti `fetch()` langsung dengan `fetchGuarded()` (baru, §B.3); setiap hop: `checkUrlAllowed` → `resolveAndCheck` → `fetchWithPinnedIp`; timeout per hop 12 dtk dipertahankan; tambah abort streaming saat body melebihi cap; tambah cek Content-Type; simpan `page.chain` seperti sekarang | Cap 400.000 karakter halaman / 300.000 script sebagai batas **pemindaian**; pencatatan rantai redirect; penggabungan konten script (bila script aktif) |
| `lookupRdap(domain)` | **P0-3 (bagian RDAP) — v2:** host awal `rdap.org`; redirect mengikuti guard per hop (ganti `redirect:'follow'` buta dengan loop manual + guard + DNS validation + IP pinning); host tujuan redirect HARUS ada dalam allowlist RDAP dari IANA bootstrap registry (§A.1a — 592 layanan per 7 Nov 2026, cache semingguan); hanya HTTPS (entri `http://` ditolak); timeout 12 dtk dipertahankan | Endpoint `https://rdap.org/domain/<domain>`; domain dari `registrableDomain(hostname)` |
| `analyze()` | **P0-4:** hapus/nonaktifkan blok fetch `<script src>` selama mitigasi (sisakan sebagai kode yang dinonaktifkan dengan flag, bukan dihapus permanen — lihat §D.2); **P0-6:** bila guard menolak di tahap mana pun, kembalikan hasil PENOLAKAN AMAN (§A.6), bukan hasil parsial | Seluruh logika pemindaian sinyal (umur domain, connect-wallet, signing, bahasa iming-iming, obfuscation, tautan resmi, alamat kontrak, known-bad domain) dan skoring 0–100 per sinyal — **tidak berubah** |
| `runCheck()` | **P0-6 + P1-1:** bungkus seluruh pemeriksaan dalam anggaran global 20 detik (AbortController bersama); bila guard menolak → JANGAN simpan baris `checks`; catat ke log keamanan; bila timeout global → kembalikan "pemeriksaan tidak selesai" (bukan vonis) | Urutan `normalizeUrl → analyze → simpan → kembalikan` |
| `checkLink` (aksi server) | **P1-2:** gate rate limit + konkurensi sebelum `runCheck()`; **P0-6:** teruskan respons penolakan aman apa adanya ke klien | Skema zod `{url: min 1, maks 2048}`; tanpa auth (sesuai keputusan Phase 1) |
| `KNOWN_BAD_DOMAINS` | **Tidak berubah** (tetap `solbarn.cc`, `sharkmoon.tech`) — daftar ini adalah threat intel, bukan pengganti guard; guard SSRF dan known-bad adalah dua lapisan berbeda | Cara pencocokan string hostname (eksak / suffix) |
| `listChecks` / `deleteCheck` | **Tidak berubah dalam P0/P1 ini** (tanpa auth — dicatat sebagai temuan di luar ruang lingkup SSRF langsung; ditangani saat Auth masuk) | — |

### B.2 `client/src/api.ts` dan `client/src/App.tsx` — perubahan minimal

| Bagian | Perubahan | Tidak berubah |
| --- | --- | --- |
| UI Link Scanner | Tambah penanganan respons `blocked: true` → tampilkan "Pemeriksaan ditolak oleh kebijakan keamanan" (bukan verdict/score); tambah status saat mitigasi aktif (§D.1): bila scanning arbitrer dimatikan, tampilkan pesan "Pemeriksaan link dijeda sementara untuk peningkatan keamanan" dan nonaktifkan input | Seluruh UI lain (katalog, dashboard, Gibran, filter, bookmark) |
| `api.ts` (client action) | Tambah tipe respons penolakan (`blocked`) agar TypeScript mengenalinya; tambah penanganan 429 (tampilkan "Terlalu banyak permintaan") | Cara POST `./actions` |

### B.3 Fungsi baru (dibuat di `server/src/actions.ts` atau modul server baru)

| Fungsi baru | Tugas |
| --- | --- |
| `fetchGuarded(url, opts)` | SATU-SATUNYA jalur fetch. Menjalankan rantai §A.1 untuk satu hop: `checkUrlAllowed` → `resolveAndCheck` → `fetchWithPinnedIp` (dengan timeout hop + batas streaming pasca-dekompresi + cek Content-Type). Dipakai oleh fetch halaman, redirect, script (bila aktif), dan RDAP. **JANGAN memakai `fetch` global di dalamnya** (terbukti tidak mendukung pinning — §A.2a). |
| `resolveAndCheck(hostname)` | Implementasi dari stub di `ssrf-guard.ts`: DNS lookup semua alamat → normalisasi (termasuk NAT64/TEREDO/6to4/mapped) → validasi → kembalikan IP lolos + TTL. |
| `fetchWithPinnedIp(url, pinnedIps, opts)` | Koneksi ke IP yang divalidasi — **Pendekatan 1 (utama): Node `https`/`http` Agent `lookup` (TERBUKTI di Bun 1.4.4 — B1-fixed, W2, W3)**; **Pendekatan 2 (fallback): `Bun.fetch` dengan URL IP literal + `tls.serverName` + header `Host` (TERBUKTI — W1, W5)**. Callback `lookup` HARUS menghormati `options.all`; `servername` HARUS diisi eksplisit; tulis socket `Bun.connect` HANYA di handler `open`. |
| `normalizeIpLiteral(host)` | Uraikan SEMUA bentuk IP literal: desimal bertitik, integer (`2130706433`), oktal (`0177.0.0.1`), heksadesimal (`0x7f.0.0.1`, `0x7f000001`), bentuk pendek (`127.1`), IPv6 (`::1`, `fe80::1`), IPv4-mapped (`::ffff:127.0.0.1`) → kembalikan bentuk kanonik atau "bukan IP". |
| `isBlockedAddress(ip)` | Cocokkan IP kanonik ke tabel §A.4. |
| `checkRateLimit(callerHash)` | Kuota per IP (hash) + antrean konkurensi (P1-2). |
| `acquireScanSlot(callerHash)` / `releaseScanSlot(leaseId)` | **v2.1 (baru):** lease konkurensi GLOBAL via tabel `scan_leases` — acquire atomik (hitung lease hidup < 5 → INSERT, bila ≥ 5 → tolak 429), TTL lease 25 detik, release eksplisit di `finally`. JANGAN memakai semaphore in-memory sebagai pengganti lease global. |
| `logBlockedAttempt(hashUrl, kategori, waktu)` | Log keamanan terpisah (bukan tabel `checks`). |

### B.4 `src/scanner/ssrf-guard.ts` (paket fondasi) — perluasan

| Bagian | Perubahan |
| --- | --- |
| `BLOCKED_HOSTNAMES` | Tambah suffix match: `localhost` dan subdomainnya, `metadata.*` (semua subdomain metadata), `metadata.google.internal` (tetap) |
| `isBlockedIpLiteral()` | Ganti dengan `normalizeIpLiteral()` + `isBlockedAddress()` (§B.3): tangani integer/oktal/heksadesimal/bentuk pendek, IPv4-mapped IPv6, NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48` — ekstrak IPv4 tertanam; **koreksi v2.1:** /48 di bit 48..63 + 72..87, oktet "u" byte 8 wajib 0, bila ≠ 0 → malformed/tolak), TEREDO/6to4, zone identifier (`%...` → tolak), seluruh rentang §A.4 v2 (tambah ULA `fc00::/7`, multicast, `::/128`, CGNAT `100.64.0.0/10`, TEST-NET, benchmarking, discard-only, ORCHIDv2, dokumentasi) |
| `resolveAndCheck()` | Implementasi penuh (saat ini stub yang melempar error): DNS lookup + validasi semua alamat + kembalikan IP lolos |
| `checkUrlAllowed()` | Tambah: tolak userinfo (sudah ada — dipertahankan), tolak port non-80/443 (disetujui pemilik v2 — diterapkan bersama P0-5), tolak zone identifier, normalisasi hostname (lowercase, trailing dot, IDNA) |
| Konstanta | `MAX_REDIRECTS = 6` (tetap), `FETCH_TIMEOUT_MS = 12_000` (selaraskan dari 10_000 ke nilai live 12 detik — JANGAN menurunkan batas yang sudah ada), `TOTAL_TIMEOUT_MS = 20_000` (baru, menggantikan 30_000 di fondasi — selaras dengan §A.5), `MAX_RESPONSE_BYTES = 400_000` (baru, selaras dengan cap halaman live) |

### B.5 File fondasi lain

| File | Perubahan |
| --- | --- |
| `src/scanner/link-scanner.ts` (stub) | Implementasi memakai `fetchGuarded()` + sinyal/scoring dari kode live (port logika — bukan tulis ulang sinyal) |
| `src/scanner/redirect.ts`, `src/scanner/domain.ts` (stub) | Implementasi loop redirect ber-guard dan normalisasi domain |
| `src/intelligence/risk-scoring.ts` (stub) | Port skoring live apa adanya (skor per sinyal + pemetaan CLASSIFICATION.md) |
| `src/db/schema.ts` | Tambah (P1-2): tabel `rate_limits` (hash IP, jendela menit/jam, counter, `updated_at`) dan tabel **`scan_leases` (v2.1, baru)** — `id` (token lease acak), `ip_hash`, `acquired_at`, `expires_at` (TTL 25 detik) — untuk lease konkurensi global (§A.7.2 v2.1). Tambah (opsional, P0-6): tabel `blocked_attempts` (hash URL, kategori, waktu) — terpisah dari `checks`; **tidak ada perubahan** pada tabel `projects`, `checks`, `saved_projects` yang sudah ada |
| `SECURITY_REQUIREMENTS.md` §3.2 | Perbarui tabel status kepatuhan setelah implementasi + uji (bukan sebelum) |
| `CLASSIFICATION.md` | Tambah: hasil `blocked` bukan klasifikasi (bukan MALICIOUS/SUSPICIOUS/UNVERIFIED/NO_KNOWN_THREAT) — penolakan adalah status tersendiri |

### B.6 Yang HARUS dipertahankan (checklist non-negotiable)

- [ ] Histori tabel `checks` (termasuk 2× solbarn.cc skor 100) — tidak dihapus, tidak diubah.
- [ ] Katalog 13 proyek — tidak berubah.
- [ ] Sistem scoring dan sinyal — logika dan bobot tidak berubah (kecuali dampak
      script-fetch yang dinonaktifkan — lihat §D.2 dan §E).
- [ ] Perilaku scanner untuk URL publik yang sudah terbukti benar — 3 URL acuan
      vonisnya tetap sama (§D.4).
- [ ] Redirect maks 6 hop dan timeout per-fetch 12 detik — sebagai lantai,
      bukan untuk dilonggarkan; jangan ganti fetch manual dengan
      `redirect: 'follow'` tanpa validasi.
- [ ] Deteksi domain drainer `solbarn.cc`/`sharkmoon.tech` termasuk di rantai
      redirect — dipertahankan.
- [ ] Jangan menyatakan scanner "aman" berdasarkan guard fondasi sampai guard
      yang sama terintegrasi dan teruji di kode live.

---

## C. Urutan implementasi P0 dan P1

### C.1 Peta dependensi

```text
Keputusan pemilik (§F) — DISETUJUI 7 Nov 2026 (v2): mitigasi (a), script off,
rate limit 10/menit + 100/jam, port 80/443, CGNAT blokir, timeout global 20 dtk
  └─► [M0] Mitigasi sementara (§D.1) — opsi (a), aktif sebelum coding P0
        └─► [P0-1a] SPIKE kemampuan runtime — ✅ SELESAI (v2, SSRF_SPIKE_RUNTIME.md)
        │      └─► [P0-1a'] Uji ulang pinning di STAGING ARTIFAKT PRODUKSI (U-1)
        │      └─► [P0-1b] Perluas ssrf-guard.ts (normalisasi IP + resolveAndCheck)
        │             └─► [P0-1c] fetchWithPinnedIp + fetchGuarded
        │                    ├─► [P0-2] Integrasi ke fetchText URL awal
        │                    ├─► [P0-3] Guard di setiap hop redirect (+ RDAP)
        │                    ├─► [P0-4] Nonaktifkan script fetch
        │                    └─► [P0-5] Perketat normalizeUrl (termasuk port 80/443)
        │                           └─► [P0-6] Respons penolakan aman + jangan simpan
        │                                  └─► [UJI] Regresi + blokir di staging (§D.4)
        │                                         └─► [P1-1] Timeout global 20 dtk + streaming pasca-dekompresi + Content-Type
        │                                                ├─► [P1-2] Rate limit + konkurensi (discovery P1-2a dulu)
        │                                                └─► [P1-3] Batas script (port sudah di P0-5)
        │                                                       └─► [P1-4] Logging/alert
        │                                                              └─► [UJI AKHIR] + evaluasi ChatGPT
        │                                                                     └─► Cutover (go/no-go, §D.5 v2 — HANYA bila SEMUA uji wajib lolos)
```

### C.2 P0 — wajib sebelum scanner dipakai publik lebih luas

| Langkah | Isi | Bergantung pada | Keluaran yang dapat diuji |
| --- | --- | --- | --- |
| **P0-0** | Keputusan mitigasi sementara (§D.1) | Keputusan pemilik | Mitigasi aktif (atau keputusan tercatat untuk tidak mitigasi + alasan) |
| **P0-1a** | **Spike runtime — SELESAI (v2, 7 Nov 2026).** Bukti: `SSRF_SPIKE_RUNTIME.md` — Pendekatan 1 (Node `https` Agent `lookup`) TERBUKTI di Bun 1.4.4; Pendekatan 2 (`Bun.fetch` + `tls.serverName` + `Host`) TERBUKTI sebagai fallback. **Sisa wajib:** uji ulang di staging artifact produksi (U-1) sebelum integrasi penuh, karena spike dijalankan pada Bun CLI di VM. | — (selesai) | Laporan spike + putusan pendekatan (sudah ada) |
| **P0-1b** | Perluas `ssrf-guard.ts`: `normalizeIpLiteral`, `isBlockedAddress` (tabel §A.4 v2 — termasuk NAT64/TEREDO/6to4/mapped/zone identifier), implementasi `resolveAndCheck` — **v2.1:** koreksi ekstraksi NAT64 /48 (RFC 6052 §2.2, byte 6..7 + 9..10, u-octet byte 8 wajib 0) + unit test NAT64 S-44..S-48 + unit test matcher RDAP ketat RD-01..RD-20 (§D.4.7) | P0-1a (tahu batasan runtime) | Unit test guard: 25 kasus lama + kasus baru (integer, heksadesimal, oktal, bentuk pendek, IPv4-mapped, NAT64 /96 + /48, TEREDO, 6to4, zone identifier, ULA, multicast, CGNAT, TEST-NET, benchmarking) + matcher RDAP 20/20 |
| **P0-1c** | `fetchGuarded()` + `fetchWithPinnedIp()` — via Node `https`/`http` Agent `lookup` (utama) atau `Bun.fetch` + `tls.serverName` (fallback) | P0-1b | Fetch ter-guard untuk satu URL di staging |
| **P0-2** | Integrasi guard ke `fetchText()` URL awal | P0-1c | 3 URL acuan tetap sama + URL internal ditolak |
| **P0-3** | Guard di setiap hop redirect + redirect RDAP | P0-2 | Redirect ke privat ditolak; redirect legit tetap diikuti |
| **P0-4** | Nonaktifkan fetch `<script src>` (flag) | — (independen, bisa paralel dengan P0-2) | Sinyal script = 0; 3 URL acuan tetap sama (lihat §D.2) |
| **P0-5** | Perketat `normalizeUrl()` (userinfo, literal IP, localhost/metadata.*, normalisasi hostname) | P0-1b (butuh normalisasi IP) | URL `http://127.0.0.1/`, `http://0x7f.0.0.1/`, `https://x@127.0.0.1/` ditolak sebelum fetch |
| **P0-6** | Respons penolakan aman + jangan simpan baris `checks` + log keamanan | P0-2..P0-5 | Respons penolakan tidak mengandung data internal (uji §D.4) |
| **P0-UJI** | Uji regresi + uji blokir di staging (§D.4) | Semua P0 | Laporan uji; go/no-go P0 |

**Catatan urutan:** P0-4 independen dan dapat dikerjakan paralel dengan P0-1/2.
P0-5 bergantung pada normalisasi IP dari P0-1b. P0-6 terakhir karena bergantung
pada semua titik penolakan.

### C.3 P1 — penting, segera setelah P0

| Langkah | Isi | Bergantung pada | Keluaran yang dapat diuji |
| --- | --- | --- | --- |
| **P1-1** | Timeout global **20 detik — disetujui pemilik v2** (AbortController bersama) + abort streaming saat body terdekompresi > 400 KB + cek Content-Type; abort per tahap (§A.5 v2) | P0-UJI lolos | Scan URL lambat/raksasa selesai ≤ ~20 detik; memori tidak membengkak; **syarat cutover** (§D.5 v2) |
| **P1-2** | Rate limit per IP (hash) **10/menit + 100/jam — disetujui pemilik v2** + antrean konkurensi + penanganan 429 di UI; **didahului P1-2a discovery sumber IP tepercaya** (§A.7.1 v2); store counter di tabel `rate_limits` (DB bersama) | P0-UJI lolos | Banjir dari satu IP dibatasi; pengguna normal tidak terdampak; **syarat cutover** (§D.5 v2) |
| **P1-3** | Batas kuantitas/ukuran script (bila script diaktifkan kembali) — **port 80/443 sudah diterapkan di P0-5 (disetujui pemilik v2)** | P0-5 | URL `http://example.com:8080/` ditolak |
| **P1-4** | Logging + alert percobaan SSRF yang diblokir + pola banjir | P0-6 (log keamanan sudah ada) | Log berisi upaya blokir; alert dipicu pada pola banjir |
| **P1-UJI** | Uji akhir + evaluasi ChatGPT + cutover (§D.5 v2 — hanya bila SEMUA uji wajib lolos) | Semua P1 | Laporan akhir; keputusan cutover |

### C.4 Yang TIDAK masuk P0/P1 (dicatat agar tidak tercampur)

- Autentikasi pengguna / Supabase Auth (Phase 1/3 — keputusan terpisah).
- CAPTCHA (P2 — bila abuse berlanjut setelah rate limit).
- Isolasi egress infra / proxy egress (P2 — butuh akses infra).
- Contract Analyzer dan Wallet Analyzer (Phase 4).
- Audit eksternal firma keamanan (Phase 5).

---

## D. Strategi pengujian dan rollback

### D.1 Temporary mitigation — evaluasi 3 opsi (SEBELUM P0 selesai)

| Opsi | Isi | Pro | Kontra | Risiko sisa |
| --- | --- | --- | --- | --- |
| **(a) Nonaktifkan sementara scanning URL arbitrer** | `checkLink` menolak semua URL arbitrer dengan pesan "Pemeriksaan link dijeda sementara untuk peningkatan keamanan". Katalog, dashboard, Gibran tetap jalan. | Menutup seluruh jalur SSRF seketika. Paling sederhana — satu flag. Tidak ada celah parsial. | Fitur utama produk mati sementara. Pengguna tidak bisa cek link sama sekali. Cron auto-add kehilangan langkah checkLink (lihat §A.7). | Hampir nol untuk scanner (tidak ada fetch). Risiko reputasi: pengguna melihat fitur mati. |
| **(b) Batasi akses scanner (allowlist)** | Hanya URL dari domain yang dikenal yang boleh dipindai: domain di katalog 13 proyek + daftar domain besar yang dikurasi manual (mis. binance.com, bscscan.com, etherscan.io, solscan.io). Sisanya ditolak. | Produk tetap berguna sebagian. Risiko SSRF menyusut drastis (penyerang tidak bisa mengarah ke host arbitrer). | Allowlist harus dikelola manual; pengguna tidak bisa cek link airdrop baru (kasus pakai utama produk). Domain allowlist sendiri masih bisa me-redirect ke internal (redirect tetap tidak divalidasi sampai P0-3) — jadi opsi ini HANYA aman bila digabung dengan pemblokiran redirect ke luar allowlist, yang pada praktiknya hampir sama rumitnya dengan P0. | Sedang: redirect dari domain allowlist ke internal masih terbuka sampai P0-3 selesai. |
| **(c) Biarkan jalan dengan peringatan** | Scanner tetap menerima URL arbitrer; tambahkan peringatan di UI bahwa pemeriksaan sedang dalam audit keamanan. | Tidak ada downtime fitur. | Peringatan tidak menghentikan eksploitasi. Scanner tetap menjadi jalur SSRF terbuka yang diketahui publik — dan sekarang penyerang tahu kerentanannya sudah didokumentasikan. | **Tinggi: sama dengan status saat ini (VULNERABLE).** |

**Keputusan pemilik (v2, 7 Nov 2026): opsi (a) DISETUJUI dan HARUS diterapkan
sebelum coding P0.** `checkLink` menolak semua URL arbitrer dengan pesan
"Pemeriksaan link dijeda sementara untuk peningkatan keamanan". Katalog,
dashboard, Gibran tetap jalan. Selama mitigasi, cron auto-add menandai
kandidat "belum terverifikasi link" dan TIDAK auto-add (§A.7) — tidak ada
jalur bypass khusus cron.

**Durasi mitigasi (v2):** sejak keputusan ini sampai cutover disetujui
(§D.5 v2). Mitigasi dicabut hanya oleh keputusan pemilik setelah SELURUH
uji wajib lolos — bukan otomatis, dan bukan hanya karena P0 selesai.

### D.2 Script fetching — evaluasi MVP vs risiko

**Pertanyaan:** apakah fetch eksternal via `<script src>` diperlukan untuk MVP?

**Manfaat yang hilang bila dimatikan:**

| Sinyal yang memakai isi script | Dampak bila script tidak di-fetch |
| --- | --- |
| Connect-wallet / signing code di file JS eksternal | Sinyal ini hanya terdeteksi bila kodenya ada di HTML halaman itu sendiri. Halaman yang memuat logika drainer dari file JS eksternal **tidak akan terdeteksi** lewat sinyal ini. |
| Kode tersamar (obfuscation) di file JS eksternal | Sama — hanya obfuscation di HTML yang terdeteksi. |
| Alamat kontrak di file JS eksternal | Kontrak di HTML tetap terdeteksi; kontrak yang hanya ada di JS eksternal tidak. |

**Manfaat yang TETAP ada tanpa script fetch:** umur domain (RDAP), bahasa
iming-iming di HTML, tautan resmi, alamat kontrak di HTML, daftar domain
drainer (termasuk di rantai redirect), dan seluruh sinyal dari HTML halaman.

**Risiko bila tetap diaktifkan:** setiap halaman yang dipindai dapat mengarahkan
scanner ke hingga 3 URL arbitrer tambahan (vektor SSRF kedua), dan chain
redirect script selama ini dibuang sehingga cek known-bad tidak berlaku.
Risiko ini **tidak sebanding** dengan manfaatnya untuk MVP — terutama karena
drainer modern memang sering menyembunyikan logika di JS eksternal, yang
berarti sinyal script justru paling berharga TETAPI juga paling berbahaya
tanpa guard. Jalan yang benar: matikan sekarang, aktifkan kembali HANYA
setelah guard penuh (P0-1..P0-3) diterapkan pada script fetch + chain-nya
tidak dibuang.

**Keputusan pemilik (v2, 7 Nov 2026): nonaktifkan sementara fetch `<script src>`
DISETUJUI** (dengan flag, bukan hapus kode — agar dapat diaktifkan kembali setelah P0).
Konsekuensi yang harus diterima secara eksplisit: skor beberapa halaman dapat
**turun** (sinyal script = 0). Bila salah satu dari 3 URL acuan berubah vonis
karena ini, itu adalah temuan uji yang harus dilaporkan dan didiskusikan —
bukan alasan untuk mengaktifkan kembali script fetch secara diam-diam.
Prediksi: `scamsem.solbarn.cc` tetap BAHAYA 100 karena deteksinya berbasis
domain drainer terkonfirmasi (bukan isi script); `binance.com` dan
`ptah.trade/poa` tidak memakai sinyal script secara material — tetapi prediksi
ini **harus dibuktikan di staging**, bukan diasumsikan.

### D.3 Information disclosure — rancangan respons (ringkas, detail di §A.6)

- Satu respons penolakan generik untuk semua alasan (§A.6).
- Tidak ada `http_status` / `final_url` / `page_title` / rantai redirect /
  kontrak dari target yang ditolak — di respons maupun di tabel `checks`.
- Upaya blokir dicatat di log keamanan terpisah (hash URL + kategori + waktu),
  bukan di riwayat publik.
- UI: "Pemeriksaan ditolak oleh kebijakan keamanan" — bukan vonis keamanan.

### D.4 Strategi pengujian

#### D.4.1 Prinsip pengujian

1. **Staging terisolasi, target uji yang dikontrol sendiri.** Semua uji blokir
   memakai server uji dan DNS uji yang dikontrol tim (mis. server HTTP lokal
   di jaringan staging terisolasi + zona DNS dengan TTL pendek untuk uji
   rebinding). **JANGAN** menguji dengan mengakses metadata cloud
   (`169.254.169.254`) atau jaringan internal produksi.
2. **Tiga URL acuan adalah tes regresi, bukan satu-satunya tes.** Lolosnya
   ketiga URL tidak membuktikan guard bekerja; lolosnya uji blokir yang
   membuktikannya.
3. **Uji perilaku, bukan keberadaan kode.** Guard "ada di file" tidak cukup;
   yang diuji adalah: URL jahat **tidak menghasilkan fetch** (dibuktikan
   lewat log server uji yang tidak menerima koneksi) dan URL legit tetap
   menghasilkan vonis yang sama.
4. **Setiap uji mencatat:** input, hasil yang diharapkan, hasil aktual,
   dan bukti (log server uji / respons).

#### D.4.2 Uji regresi — 3 URL acuan (harus TETAP SAMA)

| URL | Vonis yang diharapkan | Klasifikasi target |
| --- | --- | --- |
| `scamsem.solbarn.cc` | BAHAYA, skor 100 | MALICIOUS |
| `binance.com` | LEBIH AMAN (skor ~10) | NO_KNOWN_THREAT |
| `ptah.trade/poa` | WASPADA, skor ~45 | SUSPICIOUS |

Toleransi: skor boleh berbeda **maksimal ±5 poin** bila penyebabnya
terdokumentasi (mis. hilangnya sinyal script — lihat §D.2). Perubahan vonis
(naik/turun tingkat) adalah **gagal regresi** — hentikan cutover, diskusikan.

#### D.4.3 Uji blokir SSRF (semua harus DITOLAK sebelum fetch — server uji TIDAK boleh menerima koneksi)

| # | Kasus uji | Input contoh | Yang dibuktikan |
| --- | --- | --- | --- |
| S-01 | IPv4 loopback | `http://127.0.0.1/` | Literal IP loopback ditolak |
| S-02 | IPv4 loopback + port | `http://127.0.0.1:8080/admin` | Port tidak menghindar dari blokir |
| S-03 | localhost | `http://localhost/` | Hostname localhost ditolak |
| S-04 | Private IP 10/8 | `http://10.0.0.5/` | RFC1918 ditolak |
| S-05 | Private IP 172.16/12 | `http://172.16.0.1/` | RFC1918 ditolak |
| S-06 | Private IP 192.168/16 | `http://192.168.1.1/` | RFC1918 ditolak |
| S-07 | Link-local / metadata | `http://169.254.169.254/latest/meta-data/` | Metadata cloud ditolak |
| S-08 | Metadata hostname | `http://metadata.google.internal/` | Hostname metadata ditolak |
| S-09 | IPv6 loopback | `http://[::1]/` | IPv6 loopback ditolak |
| S-10 | IPv6 link-local | `http://[fe80::1]/` | IPv6 link-local ditolak |
| S-11 | IPv4-mapped IPv6 | `http://[::ffff:127.0.0.1]/` | Mapped IPv6 dikonversi lalu ditolak |
| S-12 | IPv4-mapped IPv6 (privat) | `http://[::ffff:10.0.0.5]/` | Mapped IPv6 privat ditolak |
| S-13 | Integer IP | `http://2130706433/` (= 127.0.0.1) | Bentuk integer diurai lalu ditolak |
| S-14 | Hex IP | `http://0x7f.0.0.1/` dan `http://0x7f000001/` | Bentuk heksadesimal diurai lalu ditolak |
| S-15 | Oktal IP | `http://0177.0.0.1/` | Bentuk oktal diurai lalu ditolak |
| S-16 | Bentuk pendek | `http://127.1/` | Bentuk pendek diurai lalu ditolak |
| S-17 | `0.0.0.0` | `http://0.0.0.0/` | "This network" ditolak |
| S-18 | Userinfo | `https://x@127.0.0.1/` dan `http://127.0.0.1@93.184.216.34/` | Userinfo ditolak / tidak mengaburkan host |
| S-19 | Skema non-HTTP(S) | `file:///etc/passwd`, `ftp://example.com/x`, `gopher://example.com/` | Skema ditolak |
| S-20 | Redirect ke privat | Server uji → 302 → `http://127.0.0.1/` | Redirect divalidasi ulang dan ditolak |
| S-21 | Redirect ke metadata | Server uji → 302 → `http://169.254.169.254/` | Redirect ke metadata ditolak |
| S-22 | Redirect skema jahat | Server uji → 302 → `file:///etc/passwd` | Skema Location ditolak |
| S-23 | Redirect rantai campuran | Server uji → 302 publik → 302 → `http://10.0.0.5/` | Hop ke-2 divalidasi, bukan hanya hop pertama |
| S-24 | DNS rebinding | DNS uji: resolve pertama → IP publik; resolve kedua (TTL 1 dtk) → 127.0.0.1 | Koneksi tetap ke IP pertama yang divalidasi (pinning) ATAU ditolak — yang TIDAK boleh: koneksi ke 127.0.0.1 |
| S-25 | DNS ke privat | Hostname uji yang me-resolve ke 192.168.1.1 | Resolve privat ditolak sebelum koneksi |
| S-26 | DNS multi-alamat campuran | Hostname uji → `[93.184.216.34, 10.0.0.5]` | SATU alamat terlarang → seluruh hostname ditolak |
| S-27 | Script src ke privat | Halaman uji dengan `<script src="http://10.0.0.5/x.js">` | (Selama mitigasi: tidak ada fetch script sama sekali. Bila script diaktifkan kembali: script src ditolak guard) |
| S-28 | Script src redirect | Halaman uji dengan script src → 302 → privat | (Bila script aktif: chain script divalidasi, tidak dibuang) |
| S-29 | DNS tidak dapat di-resolve | Hostname yang NXDOMAIN | Ditolak (fail-closed), bukan "coba fetch" |
| S-30 | URL dengan port non-standar (publik) | `http://93.184.216.34:8080/` | Ditolak (port 80/443 saja — disetujui pemilik v2, diterapkan di P0-5) |

#### D.4.4 Uji legit — harus TETAP LOLOS (anti false-positive)

| # | Kasus uji | Yang dibuktikan |
| --- | --- | --- |
| L-01 | URL publik biasa (3 URL acuan) | Vonis tidak berubah (§D.4.2) |
| L-02 | URL publik dengan port eksplisit 443 | `https://example.com:443/` lolos (port standar) |
| L-03 | Subdomain dalam (mis. `https://sub.domain.example.com/path`) | Subdomain publik lolos |
| L-04 | Redirect legit antar domain publik (mis. shortener → domain publik) | Rantai redirect publik tetap diikuti |
| L-05 | IPv6 publik | `http://[2606:4700:4700::1111]/` lolos |
| L-06 | IDN / punycode publik | Domain IDN yang resolve ke IP publik lolos |
| L-07 | URL dengan query + fragment | Query tidak memengaruhi guard |
| L-08 | Domain dengan banyak alamat A/AAAA publik | Semua alamat publik → lolos |

#### D.4.5 Uji sumber daya (P1) — v2

| # | Kasus uji | Yang diharapkan |
| --- | --- | --- |
| R-01 | Server lambat (respons > 20 detik) | Pemeriksaan selesai ≤ ~20 detik (timeout global); status "tidak selesai (timeout)", bukan vonis |
| R-02 | Respons raksasa (mis. 50 MB) | Streaming di-abort pada ~400 KB; memori tidak membengkak |
| R-03 | Content-Length besar | Abort sebelum body penuh diunduh |
| R-04 | Content-Type octet-stream | Tidak dipindai sebagai HTML |
| R-05 | Banjir 100 request/menit dari satu IP | Dibatasi rate limit (429); pengguna lain tidak terdampak |
| R-06 | 10 pemeriksaan bersamaan | Antrean bekerja; tidak ada yang menggantung tanpa batas |
| R-07 | **Bombe dekompresi (v2):** gzip ~1 KB yang mengembang ke 1 MB | Abort pada ~400 KB **byte terdekompresi** (terbukti di spike W6: abort pada 524.288 byte padahal Content-Length hanya 1.004); `Content-Length` kecil TIDAK boleh meloloskan body raksasa |
| R-08 | **Abort per tahap (v2):** DNS lambat (> 5 dtk), koneksi menggantung, redirect lambat, RDAP lambat, body menetes pelan | Masing-masing tahap dibatalkan oleh timeout global 20 dtk; tidak ada tahap yang jalan melampaui anggaran; sumber daya (soket/reader/agent) ditutup di `finally` |
| R-09 | **Rate limit multi-instance (v2):** banjir dari satu IP yang disebar ke semua instance | Kuota global tetap 10/menit + 100/jam (bukan per instance); respons 429 konsisten di semua instance |
| R-10 | **Spoofing header (v2):** request dengan `X-Forwarded-For` palsu | IP pemanggil yang dihitung rate limit-nya BUKAN IP palsu dari header (kecuali discovery P1-2a membuktikan proxy tepercaya) |
| R-11 | **Dekompresi jalur Node Agent (v2.1):** bombe gzip/deflate/brotli 1 MB via `http.Agent` pinning | Abort pada ~400 KB byte terdekompresi di semua encoding (terbukti: 409.600 byte); tanpa Content-Length tetap abort |
| R-12 | **Timeout global tanpa vonis parsial (v2.1):** server tidak merespons > 20 detik | Pemeriksaan berhenti pada ~20 detik; status "tidak selesai (timeout)", TANPA skor/vonis/baris `checks` |
| R-13 | **DNS race + non-cancellable (v2.1):** lookup lambat vs timer 5 detik | Timer menang; hasil telat DIABAIKAN (tidak dipakai pinning); lookup tidak menumpuk (semaphore) |
| R-14 | **Konkurensi global (v2.1):** 6 pemeriksaan bersamaan dari instance berbeda | Hanya 5 yang berjalan; ke-6 ditolak 429; slot kembali tersedia setelah salah satu selesai; lease kedaluwarsa 25 detik membersihkan slot proses yang mati |
| R-15 | **Beban konkurensi ratusan instance (v2.2):** ratusan acquire lease bersamaan di staging | Latensi acquire p95 tercatat; rasio 503 < 1%; tidak ada lease yang melampaui batas 5; bila kontensi terbukti bermasalah, tindak lanjuti sesuai U-17 |

#### D.4.6 Uji blokir tambahan (v2 — perluasan S-01..S-30)

| # | Kasus uji | Yang dibuktikan |
| --- | --- | --- |
| S-31 | NAT64: `http://[64:ff9b::7f00:1]/` (= 127.0.0.1 tertanam) | IPv4 tertanam diekstrak lalu ditolak |
| S-32 | NAT64 legit: `http://[64:ff9b::5db8:d822]/` (= 93.184.216.34 tertanam) | IPv4 tertanam publik → diizinkan (bukan ditolak membabi buta) |
| S-33 | IPv4-mapped: `http://[::ffff:192.168.1.1]/` | Dikonversi lalu ditolak |
| S-34 | TEREDO / 6to4: `http://[2001::7f00:1]/`, `http://[2002:7f00:1::]/` | Prefiks translasi ditolak |
| S-35 | Zone identifier: `http://[fe80::1%eth0]/`, `http://[fe80::1%25eth0]/` | Ditolak sebelum resolve — zone ID tidak pernah di-strip lalu dilanjutkan |
| S-36 | TEST-NET / benchmarking: `http://192.0.2.1/`, `http://198.18.0.1/`, `http://203.0.113.1/` | Dokumentasi/benchmarking ditolak |
| S-37 | Dokumentasi IPv6: `http://[2001:db8::1]/`, `http://[3fff::1]/` | Ditolak |
| S-38 | Discard-only: `http://[100::1]/` | Ditolak |
| S-39 | CGNAT: `http://100.64.0.1/` | Ditolak (keputusan pemilik v2) |
| S-40 | RDAP redirect ke host di luar bootstrap: server uji RDAP → 302 → `https://rdap.evil.example/` | Redirect RDAP di luar allowlist bootstrap DITOLAK; lookup jadi "umur domain tidak diketahui" |
| S-41 | RDAP redirect ke entri `http://` dalam registry | Ditolak (RDAP hanya HTTPS); bukan dialihkan ke HTTP |
| S-42 | RDAP redirect ke host bootstrap yang benar (mis. `.com` → `rdap.verisign.com`) | Diizinkan DAN tetap melalui DNS validation + IP pinning |
| S-43 | DNS rebinding dengan TTL pendek (lanjutan S-24) | Koneksi tetap ke IP pertama yang divalidasi; server uji mencatat 0 koneksi ke IP kedua |
| S-44 | **NAT64 /48 privat (v2.1):** `http://[64:ff9b:1:c0a8:1:100::]/` | IPv4 `192.168.1.1` diekstrak dari bit 48..63 + 72..87 lalu DITOLAK |
| S-45 | **NAT64 /48 publik (v2.1):** `http://[64:ff9b:1:808:8:800::]/` | IPv4 `8.8.8.8` diekstrak lalu DIIZINKAN (anti false-positive atas koreksi) |
| S-46 | **NAT64 /48 bypass suffix (v2.1):** `http://[64:ff9b:1:c0a8:1:100:5db8:d822]/` | IPv4 privat `192.168.1.1` diekstrak (bukan `93.184.216.34` dari suffix) lalu DITOLAK — aturan v2 yang salah MELOLOSKAN kasus ini |
| S-47 | **NAT64 /48 u-octet ≠ 0 (v2.1):** `http://[64:ff9b:1:c0a8:ff01:100::]/` | Malformed (byte 8 = 0xff) → DITOLAK, jangan ekstrak |
| S-48 | **Regresi aturan v2 (v2.1):** uji ekstraktor terhadap `64:ff9b:1:808:8:800::` | Ekstraktor TIDAK BOLEH menghasilkan `0.0.0.0` (hasil aturan v2 yang salah) — harus `8.8.8.8` |
| S-49 | **NSP staging — prefix diketahui (v2.2):** DNS64 staging dengan prefix NSP `2001:db8:100::/48` yang mengemas `192.168.1.1` | IPv4 privat diekstrak dari posisi sesuai panjang prefix (RFC 6052) lalu DITOLAK — membuktikan guard dapat menangani NSP BILA prefixnya diketahui |
| S-50 | **NSP staging — prefix tidak diketahui (v2.2):** DNS64 staging dengan prefix NSP yang TIDAK ada di daftar guard, mengemas `192.168.1.1` | DITOLAK ATAU dicatat sebagai keterbatasan yang diketahui — hasil ini TIDAK BOLEH diklaim sebagai "lolos" bila guard tidak mengekstraknya; bila lolos, risiko U-11 TETAP TERBUKA dan prefix itu ditambahkan ke daftar guard sebelum cutover |

#### D.4.8 Uji semaphore DNS dan lease global (v2.2 — SEM-01..SEM-06, LSE-01..LSE-06)

Uji perilaku dari `SSRF_SPIKE_V22.md` (bukti: 11/11 PASS di VM ini;
uji ulang di staging produksi wajib sebelum cutover):

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| SEM-01 | Lookup lambat vs race timeout (SEM-T1) | Slot tetap terpakai setelah race timeout; dilepas hanya saat underlying settle; `lateSettled` tercatat |
| SEM-02 | Antrean penuh (SEM-T2) | Waiter ke-3 ditolak `DNS_QUEUE_FULL`; FIFO berjalan; `active`/`queued` kembali 0 |
| SEM-03 | Banjir 20 request (SEM-T3) | Lookup yang dimulai ≤ `maxActive + maxQueue`; `maxActiveObserved` tidak pernah > 4; semua settle dan dilepas |
| SEM-04 | Waiter antrean timeout (SEM-T4) | Waiter keluar dari antrean setelah `queueWaitMs`; `queueTimedOut` tercatat |
| SEM-05 | Lookup tak pernah settle (SEM-T5) | Slot direbut absolute cap; `forceReleased` tercatat; slot bisa dipakai lagi |
| SEM-06 | Metrik (SEM-T6) | 10 kunci metrik tersedia dengan tipe numerik |
| LSE-01 | 8 instance serentak, 1 slot tersisa | Tepat 1 pemenang; total lease hidup = 5 |
| LSE-02 | Ulangi LSE-01 sebanyak 3 ronde | Tepat 1 pemenang tiap ronde |
| LSE-03 | Lease kedaluwarsa (TTL) | Slot bebas setelah TTL; acquire berhasil |
| LSE-04 | Lease yatim (proses mati sebelum release) | Ditolak selama TTL; diambil alih setelah TTL lewat |
| LSE-05 | Kegagalan release | Rowcount 0 tanpa error; lease tetap kedaluwarsa sendiri |
| LSE-06 | Sama seperti LSE-01/02 dengan **PostgreSQL nyata di staging** (advisory lock / counter row) | Tepat 1 pemenang; tidak ada error 40001/40P01 yang tidak tertangani |

#### D.4.9 Uji orphaned DNS, circuit breaker, dan pemulihan worker (v2.3 — ORPH-01..ORPH-05)

Uji perilaku dari `SSRF_SPIKE_V23.md` (bukti: 13/13 PASS, dijalankan
ulang 2×, Node v24.22.1, resolver stub yang dikontrol sendiri). Semua uji
ini wajib diulang di staging produksi (U-1) sebelum cutover, karena
perilaku timer/IPC di runtime produksi belum terbukti.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| ORPH-01 | Kontrol v2.2 tanpa batas orphaned (ORPH-T0) | Keberatan TERBUKTI: 3 gelombang force-release menumbuhkan orphaned 2→4→6 tanpa batas — kontrol ini mendokumentasikan perilaku yang diperbaiki v2.3, bukan perilaku yang diterima |
| ORPH-02 | Gelombang berulang dengan batas (ORPH-T1) | `orphaned` tidak pernah > cap; live ops tidak pernah > `maxActive + cap`; gelombang ke-3 ditolak breaker |
| ORPH-03 | Breaker (ORPH-T2) | Request ditolak `DNS_CIRCUIT_OPEN` instan; 0 lookup underlying baru selama breaker terbuka; `rejectedCircuitOpen` tercatat |
| ORPH-04 | Pemulihan lewat settle + gelombang kedua (ORPH-T3) | Breaker menutup hanya saat `orphaned ≤ threshold`; operasi cap-deferred direbut kembali dengan benar; gelombang kedua tetap berbatas |
| ORPH-05 | Kill worker + metrik (ORPH-T4, ORPH-T4b, ORPH-T5) | `SIGKILL` menghentikan operasi (`orphaned` → 0, breaker menutup, worker baru melayani); worker thread terminate terbukti tetapi DITOLAK sebagai pengganti isolasi proses; metrik sesuai prediksi state machine |
| ORPH-06 | Pengulangan SEM-01..SEM-06 setelah perubahan (SEM-R1..SEM-R6) | 6/6 lolos terhadap implementasi v2.3 (catatan: harness asli v2.2 hilang karena `/tmp` dibersihkan; SEM-R1..R6 adalah implementasi ulang dari spesifikasi `SSRF_SPIKE_V22.md` §1) |

#### D.4.10 Uji konfirmasi terminasi, crash parent, dan rekonsiliasi (v2.3.1 — TERM-01..TERM-04, PARENT-01..PARENT-02, RECON-01)

Uji perilaku dari `SSRF_SPIKE_V231.md` (bukti: 61/61 PASS — TERM 23/23 +
PARENT 15/15 + pengulangan SEM-R1..R6 + ORPH-T0..T5 23/23, masing-masing
dijalankan ulang 2×, Node v24.22.1, proses/komponen lokal yang dikontrol
sendiri). Semua uji ini wajib diulang di staging produksi (U-1, U-16,
U-22) sebelum cutover, karena perilaku timer/IPC/exit event di runtime
produksi belum terbukti. Catatan: harness asli v2.2 DAN v2.3 hilang karena
`/tmp` dibersihkan antar sesi; semua pengujian v2.3.1 adalah implementasi
ulang dari spesifikasi yang didokumentasikan.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| TERM-01 | SIGKILL worker (3 orphaned, breaker terbuka) | Counter tidak berubah pada pemeriksaan sinkron segera setelah `kill()` kembali; turun hanya setelah event `exit` (`orphaned` 3→0, `orphanedTerminated`=3); breaker menutup setelah exit |
| TERM-02 | Urutan pembukaan breaker | Evaluasi `_maybeCloseBreaker()` 0× saat kill, tepat 1× setelah exit; lookup sebelum exit ditolak `DNS_CIRCUIT_OPEN`; worker baru melayani setelah pemulihan |
| TERM-03 | Exit tidak pernah terkonfirmasi | Counter tetap, breaker tetap terbuka, `workerExitUnconfirmed`=1 — bahkan setelah +500 ms tambahan tanpa konfirmasi |
| TERM-04 | Terminate ganda / sudah mati | Idempotent; tidak ada counter negatif |
| PARENT-01 | Parent SIGKILL saat lookup berjalan (worker normal) | Worker mati (`disconnect` tercatat); request in-flight fail-closed tanpa vonis; tidak ada yatim |
| PARENT-02 | Worker stubborn + parent baru; pemulihan state | Worker lama tetap hidup; parent baru membunuhnya via pidfile (SIGKILL + konfirmasi exit); worker baru melayani; lease global dari parent mati terlihat parent baru; lease kedaluwarsa sendiri setelah TTL; tidak ada yatim tersisa |
| RECON-01 | Pengulangan SEM-R1..R6 + ORPH-T0..T5 (23 pemeriksaan) | Semua lolos terhadap implementasi referensi v2.3.1; ORPH-T0 = orphaned akhir 6 / live maks 6 / started 6; ORPH-T1 = orphaned maks 3 / live maks 4 / started 4 — mengonfirmasi isi §2/§3 `SSRF_SPIKE_V23.md` dan mengoreksi penempatan anotasi blok output-nya (lihat §4 `SSRF_SPIKE_V231.md`); SEM-R6 = 21 kunci metrik (19 v2.3 + 2 baru v2.3.1) |
| SUP-01 | Supervisor platform (staging, U-22) | Dokumentasi supervisor menyatakan (a) crash memicu restart otomatis dan (b) anak proses dibunuh bersama parent (kill process group). Bila tidak dapat dibuktikan, G6 tidak lolos untuk lapis supervisor — pertahanan yang tersisa adalah self-exit + pidfile cleanup yang teruji di PARENT-01/PARENT-02 |

#### D.4.11 Uji aturan startup NOT_READY, validasi identitas, pidfile atomik, dan startup lock (v2.3.2 — STARTUP-01..STARTUP-09; diperluas v2.3.3 — STARTUP-10, RCL-01..RCL-06, D-01..D-03)

Uji perilaku dari `SSRF_SPIKE_V232.md` (bukti: 9/9 PASS — SU-T1..SU-T9,
masing-masing dijalankan ulang **3×** dengan hasil identik — RUN=1,
RUN=2, dan RUN=3; RUN=3 dijalankan dan didokumentasikan selama revisi
v2.3.3, output verbatim di `SSRF_SPIKE_V233.md` §0 — Node v24.22.1,
proses/komponen lokal yang dikontrol sendiri di `/tmp/ssrf-v232`).
Harness disalin ke `spike-harness-v232/` agar dapat dijalankan ulang.
Regresi terhadap implementasi referensi yang diperkeras v2.3.3: 9/9 PASS
× 2 run tambahan (bukti `SSRF_SPIKE_V233.md` §2a, harness
`spike-harness-v233/`). Uji baru v2.3.3 (reklamasi yang diperkeras +
STARTUP-10): 8/8 PASS × 2 (bukti `SSRF_SPIKE_V233.md` §2b).
Semua uji ini wajib diulang di staging produksi (U-1, U-16, U-22)
sebelum cutover, karena perilaku `/proc`, O_EXCL, dan supervisor di
runtime produksi belum terbukti.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| STARTUP-01 | Worker tidak bisa dimatikan (exit tak terkonfirmasi) — SU-T1 | Setelah 3 percobaan tanpa konfirmasi exit: state tetap `NOT_READY`, `sigsSent=3`, lookup ditolak `DNS_PARENT_NOT_READY`, worker masih hidup |
| STARTUP-02 | PID reuse (starttime tidak cocok) — SU-T2 | Validasi gagal `starttime-mismatch` → 0 SIGKILL, `page=1`, decoy tetap hidup, parent tetap `NOT_READY` |
| STARTUP-03 | Worker nyata, identitas valid — SU-T3 | 1 SIGKILL, exit terkonfirmasi pada percobaan pertama, state `READY`, lookup diterima, worker tidak lagi hidup |
| STARTUP-04 | Pidfile atomik, 20 penulis bersamaan + crash saat tulis — SU-T4 | File selalu berisi SATU record lengkap yang valid; file tmp setengah tertulis tidak merusak pidfile |
| STARTUP-05 | Startup lock, 5 parent (proses nyata) bersamaan — SU-T5 | Tepat 1 pemenang; 4 kalah dengan alasan `held-by-live-holder`; yang kalah tidak melakukan cleanup |
| STARTUP-06 | Pemegang lock mati — SU-T6 | Parent baru berhasil acquire dengan `reclaimed=true` setelah PID pemegang mati + heartbeat basi |
| STARTUP-07 | Pidfile basi (parent+worker mati) — SU-T7 | `READY` via `worker-already-dead`, 0 SIGKILL |
| STARTUP-08 | Worker mati sendiri sebelum cleanup — SU-T8 | `READY` via `worker-already-dead`, 0 SIGKILL |
| STARTUP-09 | Pidfile rusak/parsial/hilang — SU-T9 | Rusak/parsial → `NOT_READY` + `pidfile-corrupt` + page, 0 SIGKILL; hilang → `READY` (`no-pidfile`) |
| STARTUP-10 | Reklamasi lock basi bersamaan (v2.3.3 — TERUJI di VM ini) | Lima parent (proses nyata) mereklamasi lock basi yang sama bersamaan: tepat 1 pemenang (`reclaimed=true`, `ownershipVerified=true`); 4 kalah dengan alasan `held-by-live-holder`; 0 cleanup dari pihak mana pun; file lock di akhir berisi identitas pemenang. Bukti: `SSRF_SPIKE_V233.md` SU10-T1 (8/8 PASS × 2). **Catatan v2.3.4: hasil ini tetap benar sebagai catatan balapan ACAK, tetapi klaim bahwa ia membuktikan tidak adanya race DITARIK — lihat ADV-01 (§D.4.12).** Uji ulang di staging produksi tetap wajib sebelum cutover (U-1, U-16) |
| RCL-01 | Heartbeat basi + PID HIDUP — RCL-T1 (v2.3.3) | Holder hidup dengan heartbeat 60 dtk yang lalu: `held-by-live-holder`, file lock utuh byte-demi-byte, holder tetap hidup. Membuktikan heartbeat tidak dipakai dalam keputusan hapus |
| RCL-02 | EPERM dari probe — RCL-T2 (v2.3.3) | Probe melempar EPERM: `holder-unverifiable`, `page=true`, lock utuh |
| RCL-03 | Error probe lain (stat tidak terbaca) — RCL-T3 (v2.3.3) | Probe mengembalikan `uncertain`: `holder-unverifiable`, `page=true`, lock utuh |
| RCL-04 | ESRCH (PID terbukti mati) — RCL-T4 (v2.3.3) | Reklamasi berjalan: `acquired=true`, `reclaimed=true`, `ownershipVerified=true` |
| RCL-05 | Lock tidak terbaca — RCL-T5 (v2.3.3) | JSON terpotong dengan mtime segar: `lock-unreadable`, `page=true`, file tetap ada dengan isi yang sama (aturan "hapus bila > 30 dtk" v2.3.2 sudah dihapus) |
| RCL-06 | PID reuse (PID hidup, starttime tidak cocok) — RCL-T6 (v2.3.3) | `holder-identity-mismatch`, `page=true`, lock utuh, decoy tetap hidup — aturan ketat: PID hidup berarti JANGAN hapus |
| ADV-01 | Skenario keberatan ChatGPT (v2.3.4 — race TERBUKTI, kode v2.3.3) | B menahan unlink sampai A selesai acquire (barrier): 2 pemilik pada 2/2 run (A ino ≠ B ino, `aFileDeleted=true`); A tidak pernah tahu filenya dihapus. Bukti: `SSRF_SPIKE_V234.md` ADV-T1. Klaim v2.3.3 tentang O_EXCL ditarik |
| ADV-02 | Unlink sebelum verify (v2.3.4 — kode v2.3.3) | B meng-unlink setelah A create tetapi sebelum A verify: A gagal `ownership-revalidation-failed`, tepat satu pemilik (B). Bukti: ADV-T3a. Membuktikan verify hanya menangkap jendela sebelum verify |
| ADV-03 | Kedua unlink mendahului kedua create (v2.3.4 — kode v2.3.3) | Dengan barrier "kedua pihak unlink dulu, baru create": O_EXCL men-serialisasi pembuatan, tepat satu pemilik (pemenang bervariasi). Bukti: ADV-T3c. Membuktikan O_EXCL bekerja pada bagiannya — dan tidak menjawab keberatan |
| ADV-04 | Skenario ADV-T1 pada kode flock (v2.3.4 — PERBAIKAN) | B mencoba flock SETELAH A memperolehnya: tepat satu pemilik (B: `held-by-live-holder`), 2/2 run. Bukti: ADV-T2 |
| ADV-05 | Kedua pihak flock bersamaan (v2.3.4 — PERBAIKAN) | Tepat satu pemenang (kernel men-serialisasi; pemenang bervariasi A/B antar run), 2/2 run. Bukti: ADV-T2sim |
| ADV-06 | Unlink pihak ketiga + versi campuran (v2.3.4 — PERBAIKAN + FLAG-DAY) | ADV-T5: unlink+recreate setelah acquire terdeteksi verifikasi ulang (2/2, 0 cleanup). ADV-T6: kode lama vs flock — KEDUA pihak memperoleh lock (bahaya transisi terbukti), tetapi holder flock mendeteksi kepemilikan tidak valid sebelum cleanup (2/2, 0 cleanup). Bukti: `SSRF_SPIKE_V234.md` §4a |
| FLK-01 | Kontensi flock (v2.3.4) | flock EX\|NB kedua gagal EWOULDBLOCK (errno 11) saat holder hidup — tmpfs dan overlay, 9/9 × 2 tiap fs. Bukti: FLK-T1 |
| FLK-02 | Pelepasan flock (v2.3.4) | SIGKILL holder (FLK-T2), close fd (FLK-T3), LOCK_UN eksplisit (FLK-T7) — contender langsung memperoleh lock. Membuktikan tidak ada lagi "lock basi" yang harus direklamasi |
| FLK-03 | Open kedua + close tidak melepas (v2.3.4) | Holder membuka file yang sama kedua kalinya, membaca, menutupnya — contender tetap BLOCKED. Membuktikan verifikasi ulang via open O_RDONLY aman. Bukti: FLK-T4 |
| FLK-04 | Bahaya unlink (v2.3.4) | Setelah path di-unlink + file baru dibuat, opener baru memperoleh flock pada inode BARU sementara holder lama masih memegang flock pada inode lama — dua "pemegang" berdampingan. Membuktikan aturan never-unlink adalah load-bearing. Bukti: FLK-T5 |
| FLK-05 | CLOEXEC (v2.3.4) | FLK-T8a: holder (fd O_CLOEXEC) mati, anak yatim hidup tanpa fd — contender langsung memperoleh lock. FLK-T8b: fd dibuat inheritable dan diwariskan ke anak — contender TETAP terblokir selama anak hidup. Membuktikan persyaratan CLOEXEC bukan teori |
| D-01 | Durabilitas pidfile — crash tepat setelah rename (v2.3.3, staging) | Matikan paksa VM/container tepat setelah rename: pidfile sesudah reboot berisi SATU record lengkap yang valid (baru ATAU lama), tidak pernah parsial/corrupt |
| D-02 | Durabilitas pidfile — crash sebelum fsync direktori (v2.3.3, staging) | Jeda tepat sebelum fsync direktori lalu matikan paksa: pidfile sesudah reboot adalah record lama yang lengkap (bukan hilang, bukan parsial) |
| D-03 | Durabilitas pidfile — crash saat menulis file sementara (v2.3.3, staging) | Matikan paksa saat file sementara sedang ditulis: pidfile lama tetap utuh; file sementara setengah tertulis tidak pernah terlihat sebagai pidfile |

#### D.4.12 Uji adversarial reklamasi lock dan semantik flock (v2.3.4 — ADV-01..ADV-06, FLK-01..FLK-05)

Uji perilaku dari `SSRF_SPIKE_V234.md` (bukti: ADV old-code 3/3 × 2, ADV
fixed-code 4/4 × 2, FLK 9/9 × 2 tmpfs + 9/9 × 2 overlay — Node v24.22.1,
Bun 1.4.4, Python 3.12.3, proses/komponen lokal yang dikontrol sendiri).
Harness disalin ke `spike-harness-v234/` agar dapat dijalankan ulang.
Semua uji ini wajib diulang di staging produksi (U-1, U-16, U-22, U-29,
U-30) sebelum cutover, karena perilaku flock, binding FFI, `/proc`, dan
supervisor di runtime produksi belum terbukti.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| ADV-01 | Skenario keberatan ChatGPT pada kode v2.3.3 (ADV-T1) | B menahan unlink sampai A selesai acquire (barrier deterministik): 2 pemilik pada 2/2 run — race TERBUKTI, bukan hipotesis. `aFileDeleted=true`, A tidak pernah tahu |
| ADV-02 | Unlink sebelum verify pada kode v2.3.3 (ADV-T3a) | A gagal `ownership-revalidation-failed`, tepat satu pemilik (B). Membuktikan batas verify: hanya jendela sebelum verify yang tertangkap |
| ADV-03 | Kedua unlink mendahului kedua create, kode v2.3.3 (ADV-T3c) | Barrier "kedua pihak unlink dulu": O_EXCL men-serialisasi pembuatan, tepat satu pemilik. Tanpa barrier ini, uji berdegenerasi menjadi ADV-T1 (didokumentasikan di `SSRF_SPIKE_V234.md` §3a) |
| ADV-04 | Skenario ADV-T1 pada kode flock (ADV-T2) | B mencoba flock setelah A memperolehnya: tepat satu pemilik (B: `held-by-live-holder`), 2/2 run |
| ADV-05 | Flock bersamaan + interferensi pihak ketiga (ADV-T2sim, ADV-T5) | T2sim: tepat satu pemenang (kernel men-serialisasi). T5: unlink+recreate setelah acquire terdeteksi verifikasi ulang (`verifiedAfterInterference=false`, 0 cleanup), 2/2 run |
| ADV-06 | Versi campuran lama vs flock (ADV-T6) | KEDUA pihak memperoleh lock (bahaya transisi TERBUKTI), tetapi holder flock mendeteksi kepemilikan tidak valid sebelum cleanup (`verifiedAfter=false`, 0 cleanup), 2/2 run. Menegakkan flag-day §A.5.5.4d |
| ADV-07 | Diagnostik T6 inode-only (bukan bagian suite permanen — bukti pendukung) | Verifikasi inode-only + baca-via-fd terhadap skenario T6 dengan harness yang sudah diperbaiki: mendeteksi penggantian pada 2/2 run. Membuktikan kegagalan T6 pertama adalah cacat harness (timeout barrier 15 dtk), BUKAN daur ulang inode. Probe daur ulang: 0/30 tmpfs, 0/30 overlay |
| FLK-01 | Kontensi flock (FLK-T1, FLK-T6) | flock EX\|NB kedua gagal EWOULDBLOCK (errno 11) saat holder hidup — perilaku identik di tmpfs dan overlay |
| FLK-02 | Pelepasan flock (FLK-T2/T3/T7) | SIGKILL holder, close fd, LOCK_UN eksplisit — contender langsung memperoleh lock pada tiap kasus |
| FLK-03 | Open kedua + close tidak melepas (FLK-T4) | Contender tetap BLOCKED setelah holder menutup fd kedua — verifikasi ulang via open O_RDONLY aman |
| FLK-04 | Bahaya unlink (FLK-T5) | Setelah unlink+recreate, opener baru memperoleh flock pada inode baru sementara holder lama memegang inode lama — dua pemegang berdampingan. Never-unlink terbukti load-bearing |
| FLK-05 | CLOEXEC (FLK-T8a/T8b) | T8a: holder O_CLOEXEC mati, anak yatim tanpa fd — contender langsung memperoleh lock. T8b: fd inheritable diwariskan ke anak — contender TETAP terblokir selama anak hidup. Persyaratan CLOEXEC terbukti bukan teori |
| FLK-06 | Binding flock (staging — BELUM TERUJI di VM ini untuk Node) | `bun:ffi` -> libc flock TERBUKTI di Bun 1.4.4 (acquire / EWOULDBLOCK errno 11 / release on close). `fs-ext` untuk Node GAGAL dibangun di VM ini (node-gyp EPERM fchown — pembatasan sandbox). Bila produksi memakai Node, binding wajib dibuktikan di staging (U-29) |
| FLK-07 | flock di NFS (staging — BELUM TERUJI) | Tidak ada NFS di VM ini. Bila direktori lock produksi berada di NFS, flock TIDAK BOLEH diandalkan tanpa bukti staging (U-30) |

#### D.4.13 Uji otoritas flock, mixed-version, dan zombie liveness (v2.3.5 — AUTH-01..AUTH-16)

Uji perilaku dari `SSRF_SPIKE_V235.md` (bukti: AUTH 18/18 PASS × 2 run
— Bun 1.4.4, Node v24.22.1, Python 3.12.3, proses/komponen lokal yang
dikontrol sendiri). Harness disalin ke `spike-harness-v235/` agar dapat
dijalankan ulang. Semua uji ini wajib diulang di staging produksi
(U-1, U-16, U-22, U-29, U-30, U-34, U-35, U-36) sebelum cutover,
karena perilaku flock, binding FFI, `/proc`, dan supervisor di runtime
produksi belum terbukti.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| AUTH-01 | Dua parent berebut flock, inode sama (AUTH-T1) | Tepat satu pemilik; yang kalah `held-by-live-holder`, 0 cleanup, 2/2 run (pemenang boleh bertukar — balapan simetris) |
| AUTH-02 | Unlink + recreate saat fd lama memegang flock (AUTH-T2) | Holder lama mendeteksi (`verifiedAfterInterference=false`, 0 cleanup); opener baru memperoleh flock pada inode baru, 2/2 run |
| AUTH-03 | Parent crash, worker stubborn hidup (AUTH-T3) | Parent baru READY, worker lama mati, worker baru hidup, tepat 1 dns-worker, 2/2 run |
| AUTH-04 | Fd diwariskan ke child (AUTH-T4) | Contender BLOCKED selama child pemegang fd hidup, ACQUIRED setelah child mati, 2/2 run |
| AUTH-05 | Mixed-version old-first, scan aktif (AUTH-T5a) | Parent baru keluar `other-parent-alive` tanpa acquire/cleanup, 2/2 run |
| AUTH-06 | Mixed-version, klasifikasi record, scan off test-only (AUTH-T5b) | Parent baru keluar `held-by-old-version`, sentinel tertulis, 2/2 run |
| AUTH-07 | Mixed-version new-first, old unlink (AUTH-T5c, regresi ADV-T6) | Kedua pihak memperoleh lock (bahaya direproduksi) tetapi holder flock mendeteksi sebelum cleanup (`verifiedAfter=false`, 0 cleanup), 2/2 run |
| AUTH-08 | Jendela mikro guarded vs unguarded (AUTH-T6) | Guarded: tindakan TIDAK berjalan (`ownershipLost=true`); kontrol unguarded: tindakan berjalan (membuktikan jendela nyata), 2/2 run |
| AUTH-09 | Supervisor restart + cleanup (AUTH-T7) | Parent #2 READY, worker lama mati, worker baru hidup, tepat 1 dns-worker, 2/2 run (supervisor stub — SUP-01 tetap wajib) |
| AUTH-10 | Record korup / tak terbaca (AUTH-T8a/T8b) | `lock-record-unreadable`, fail-closed; setelah operator menghapus file, acquire berhasil (T8a), 2/2 run |
| AUTH-11 | Filesystem read-only + POSIX lockf vs flock (AUTH-T9a/T9b) | Open di `/sys` gagal EROFS fail-closed; `lockf` dilepas oleh close fd lain (contender ACQUIRED) sementara `flock` bertahan (contender BLOCKED), 2/2 run |
| AUTH-12 | Worker token self-check + pidfile flock (AUTH-T10a–T10d) | Serve normal; token diganti in-place → worker exit `token-mismatch`; parent mati → worker exit `pidfile-lock-not-held-no-live-parent`; pidfile di-rename → worker exit alasan yang sama, 2/2 run |
| AUTH-13 | Zombie liveness (AUTH-T11, BARU) | Setup zombie terverifikasi (state `Z` + `kill(pid,0)` SUCCEEDS); parent baru tetap READY, worker lama mati, worker baru hidup, 2/2 run |
| AUTH-14 | O_CLOEXEC default + F_SETFD (AUTH-C1) | Bun + Node `cloexecDefault=true`; Python round-trip `CLEARED=True SET_AGAIN=True BEFORE=True`, 2/2 run |
| AUTH-15 | flock di NFS (AUTH-T9c) | **NOT RUN di VM ini** (tidak ada NFS) — wajib di staging (FLK-07, U-30) |
| AUTH-16 | Startup v2.3.2 SU-T1..SU-T9 (regresi) | **NOT RUN di revisi ini** (dependensi `/tmp/ssrf-v232` hilang — lihat `SSRF_SPIKE_V235.md` §0.4) — wajib dijalankan ulang setelah memperbaiki path harness, sebelum cutover |


#### D.4.7 Uji matcher allowlist RDAP (v2.1 — RD-01..RD-20)

Unit test matcher ketat §A.1c — 20 kasus dari `SSRF_SPIKE_V21.md` TEST 4
(harus 20/20 lolos; matcher naif `includes()` terbukti salah 12/20 dan
TIDAK BOLEH dipakai): entri `.com` normal + prefix persis + query/fragment
diabaikan (ALLOW); host mirip (`rdap.verisign.com.evil.com`,
`rdapverisign.com`, `rdap.org.evil.com`), path-prefix palsu (`com-evil`,
`comv1`), userinfo, port 8443, path huruf besar, dot-segment, path
ter-encode `%63om`, skema `http`, host evil dengan string allowlist di
query (REJECT); port 443 eksplisit, skema/host huruf besar, trailing dot
FQDN (ALLOW); `rdap.org/domain/` (ALLOW). Setiap perubahan allowlist
atau matcher WAJIB mengulang ke-20 kasus ini.

### D.5 Rollback dan kriteria cutover — v2

**Mekanisme rollback (per langkah):**

| Langkah | Cara rollback | Pemicu rollback |
| --- | --- | --- |
| Mitigasi (a) | Matikan flag mitigasi (kembalikan scanning) — **hanya atas keputusan pemilik setelah SELURUH uji wajib lolos (§D.5 v2)** | — |
| Tiap langkah P0/P1 | Kembalikan artifact ke **versi build sebelumnya** (artifact memiliki riwayat versi; restore versi live sebelumnya). Karena perubahan bersifat inkremental per langkah, rollback dilakukan ke build terakhir yang lolos uji. | Uji regresi gagal, vonis 3 URL acuan berubah tingkat, atau error baru di staging |
| P0-4 (script off) | Nyalakan kembali flag script fetch (kode tidak dihapus) | Skor turun drastis dan pemilik memutuskan manfaat script lebih besar (keputusan eksplisit, bukan diam-diam) |

**Aturan rollback yang mengikat:**

1. Setiap langkah diimplementasikan sebagai **satu build terpisah** (bukan
   satu build raksasa P0 sekaligus) agar rollback dapat dilakukan per langkah.
2. Setiap build harus lolos uji §D.4 **sebelum** build berikutnya dimulai.
3. Bila suatu langkah gagal uji, langkah itu di-rollback — langkah sebelumnya
   yang sudah lolos **tidak** ikut di-rollback.
4. Tidak ada cutover ke produksi tanpa: (a) semua uji §D.4.2–§D.4.6 lolos,
   (b) evaluasi ChatGPT atas rancangan + hasil uji, (c) persetujuan eksplisit
   pemilik.

**Cutover (v2) — scanner tetap NONAKTIF di produksi selama perbaikan.**
Keputusan pemilik (7 Nov 2026): **tidak ada pembukaan kembali scanner hanya
karena P0 selesai** bila timeout global (P1-1) dan rate limit (P1-2) belum
siap. Cutover terjadi HANYA bila SELURUH kriteria di bawah lolos — termasuk
dua baris yang ditandai ★ (syarat yang ditambahkan v2). Bila satu saja
no-go, scanner TETAP nonaktif (mitigasi (a) tetap berjalan) dan perbaikan
dilanjutkan — tidak ada pembukaan parsial.

**Kriteria go / no-go cutover (v2):**

| Kriteria | Go bila | No-go bila | Penanda tangan |
| --- | --- | --- | --- |
| Regresi 3 URL acuan | Vonis sama (toleransi skor ±5, §D.4.2) | Vonis berubah tingkat | Pemilik + ChatGPT |
| Uji blokir S-01..S-50 | Semua ditolak sebelum fetch (server uji menerima 0 koneksi) | Satu saja lolos dan ter-fetch | Pemilik + ChatGPT |
| Uji legit L-01..L-08 | Semua lolos | Satu false positive tanpa penjelasan yang diterima pemilik | Pemilik |
| Uji sumber daya R-01..R-15 + RDAP RD-01..RD-20 + semaphore SEM-01..SEM-06 + lease LSE-01..LSE-06 | Semua dalam batas | Timeout/DoS masih mungkin | Pemilik + ChatGPT |
| ★ Timeout global 20 dtk (P1-1) | R-01 + R-08 lolos; tidak ada tahap yang melewati anggaran | Satu tahap melewati 20 dtk | Pemilik + ChatGPT |
| ★ Rate limit 10/menit + 100/jam (P1-2) | R-05 + R-09 + R-10 lolos; discovery P1-2a tercatat (sumber IP tepercaya terbukti) | Kuota bocor antar instance, atau IP dihitung dari header yang dapat dipalsukan | Pemilik + ChatGPT |
| ★ Uji ulang pinning di staging produksi (U-1) | Pendekatan 1 terbukti di staging artifact (atau fallback Pendekatan 2 terbukti) | Pinning tidak terbukti di staging produksi | Pemilik + ChatGPT |
| Evaluasi ChatGPT | Tidak ada keberatan P0 yang belum dijawab | Ada keberatan yang belum dijawab | ChatGPT |
| Data | Histori `checks` dan katalog 13 proyek utuh | Ada data hilang/berubah | Pemilik |

### D.6 Bukti mitigasi produksi G0 — evidence checklist (v2.2)

**Pernyataan yang memisahkan keputusan dari bukti — baca dulu:**
Keputusan mitigasi (a) — nonaktifkan scanning URL arbitrer sementara —
SUDAH disetujui pemilik (D-1). Tetapi persetujuan keputusan BUKAN
bukti bahwa mitigasi benar-benar aktif di produksi. **Bukti-bukti di
bawah ini BELUM ADA, karena mitigasi belum diaktifkan dan revisi ini
tidak mengubah produksi.** Bagian ini hanya menetapkan APA yang harus
dibuktikan di gerbang G0, BAGAIMANA membuktikannya, dan SIAPA yang
menandatanganinya — bukan mengklaim mitigasi sudah aktif. Gerbang G0
TIDAK lolos sampai seluruh butir bukti di bawah terkumpul dan
terverifikasi.

| # | Bukti yang harus dikumpulkan | Cara memverifikasi | Format pencatatan | Penanda tangan |
| --- | --- | --- | --- | --- |
| G0-E1 | **Flag mitigasi aktif di produksi** | Baca nilai flag dari konfigurasi produksi yang sedang berjalan (bukan dari kode sumber saja): tampilkan nama flag, lokasi penyimpanan (mis. variabel environment / tabel konfigurasi / berkas flag), nilai saat ini (`enabled`), dan waktu nilai itu terakhir diubah. Bila flag disimpan di lebih dari satu tempat, verifikasi KEDUANYA konsisten | Entri log: `flag=<nama>, value=enabled, source=<lokasi>, read_at=<ISO-8601>, read_by=<nama>` | Pemilik |
| G0-E2 | **Request URL arbitrer ditolak SEBELUM koneksi keluar** | Dari produksi (atau staging yang mereplikasi produksi): kirim 3 request URL arbitrer — satu URL publik legit (`https://example.com/`), satu URL privat (`http://127.0.0.1/`), satu URL metadata (`http://169.254.169.254/`) — dan catat untuk masing-masing: respons yang diterima (harus penolakan generik §A.6, tanpa `http_status`/`final_url`/`page_title`), DAN bukti dari log server bahwa TIDAK ADA koneksi keluar yang dilakukan untuk ketiga URL itu (log fetch/egress menunjukkan 0 koneksi; atau log penolakan guard dengan kategori yang sesuai). URL publik legit pun harus ditolak selama mitigasi (a) — itu memang tujuannya | Entri per URL: `url_hash=<SHA-256>, response=<penolakan generik>, outbound_connections=0, log_ref=<id>` | Pemilik + ChatGPT |
| G0-E3 | **Tidak ada jalur cron yang melewati mitigasi** | Daftar SEMUA pemanggil `checkLink` di kode dan konfigurasi (pencarian kode + daftar cron yang terdaftar): (1) UI Cek Link (pengguna), (2) cron auto-add 2 jam, (3) Gibran/`askGibran` bila memakai `checkLink`, (4) jalur lain bila ada. Untuk SETIAP pemanggil, buktikan ia melewati gate mitigasi yang sama — yaitu dengan menunjukkan bahwa tidak ada parameter, flag, token, atau jalur kode yang mem-bypass gate (pencarian kode untuk kata kunci bypass/skip/direct, + uji: jalankan cron auto-add selama mitigasi aktif dan catat bahwa kandidat ditandai "belum terverifikasi link" dan TIDAK auto-add, bukan lolos diam-diam) | Daftar pemanggil + hasil pencarian kode (`grep` untuk bypass) + log satu siklus cron selama mitigasi | Pemilik + ChatGPT |
| G0-E4 | **Katalog, dashboard, histori, dan Gibran tetap berfungsi** | Uji tiap fitur di produksi selama mitigasi aktif: (a) katalog menampilkan 13 proyek; (b) dashboard/bookmark/status task dapat dibaca dan diubah; (c) histori cek menampilkan entri lama (tidak ada baris baru dari scanner yang nonaktif); (d) Gibran menjawab pertanyaan tentang katalog (tanpa memanggil scanner). Catat hasil tiap uji (lolos/gagal) | Checklist per fitur: `fitur, uji, hasil, waktu` | Pemilik |
| G0-E5 | **Timestamp aktivasi dan identitas build yang diuji** | Catat: waktu aktivasi flag (ISO-8601, zona waktu), identitas build yang sedang berjalan saat pengujian (versi/slug/hash build), dan identitas orang yang mengaktifkan. Bila flag diaktifkan ulang setelah rollback, catat setiap aktivasi sebagai entri terpisah — jangan menimpa entri lama | Entri: `activated_at=<ISO-8601>, build=<id/versi>, activated_by=<nama>` | Pemilik |

**Aturan yang mengikat untuk G0:**

1. Bila SATU SAJA butir G0-E1..G0-E5 tidak dapat dibuktikan, gerbang G0
   TIDAK lolos — perbaikan tidak lanjut ke G1, dan scanner tetap
   dianggap BELUM termitigasi.
2. Bukti G0-E2 harus menunjukkan penolakan SEBELUM koneksi keluar,
   bukan sesudah fetch gagal — log egress 0 koneksi adalah buktinya;
   respons penolakan saja TIDAK cukup (fetch yang gagal setelah
   koneksi tetap menghitung sebagai koneksi keluar).
3. Bila ditemukan jalur cron/bypass yang melewati mitigasi (G0-E3),
   itu adalah temuan P0 tersendiri: hentikan, tutup jalurnya, dan uji
   ulang G0 dari awal.
4. Bukti G0 disimpan bersama laporan uji gerbang lainnya (§H.2) dan
   dievaluasi ChatGPT di gerbang G7.

---

## E. Risiko regresi terhadap scanner yang sudah berjalan

| # | Risiko | Penjelasan | Probabilitas | Dampak | Mitigasi |
| --- | --- | --- | --- | --- | --- |
| E-1 | **False positive pada URL legit** | Guard yang terlalu agresif menolak URL publik yang sah: IP literal publik yang ditulis sebagai integer/heksadesimal (jarang, tetapi ada), domain yang resolve ke alamat CGNAT `100.64.0.0/10` (dipakai sebagian ISP), atau redirect melalui domain perantara yang resolve-nya sempat gagal | Sedang | Pengguna tidak bisa memeriksa link legit; kepercayaan turun | Uji legit §D.4.4 wajib lolos; CGNAT dijadikan pengecualian yang diputuskan eksplisit bila terbukti bermasalah; log penolakan dimonitor 1 minggu pertama setelah cutover |
| E-2 | **Perubahan skor/vonis pada 3 URL acuan** | Terutama akibat P0-4 (script off): sinyal dari isi script hilang. Juga akibat timeout global: halaman lambat yang sebelumnya selesai dalam 12–132 detik kini dapat terpotong pada 20 detik | Sedang | Vonis berubah → gagal regresi; katalog/proyek terkait (Ptah) tampil berbeda | Prediksi + uji di staging SEBELUM cutover (§D.2); toleransi skor ±5; bila vonis berubah, diskusikan — jangan sesuaikan ambang diam-diam |
| E-3 | **Gibran membaca data yang berubah bentuk** | Gibran (`askGibran`) membaca katalog + 10 riwayat cek terakhir. Bila format hasil cek berubah (mis. field `blocked`), Gibran dapat menjawab keliru tentang hasil cek yang ditolak | Rendah | Jawaban Gibran menyesatkan ("link ini aman/berbahaya" dari data yang sebenarnya ditolak) | Sertakan `blocked` dalam konteks Gibran dengan instruksi: hasil yang diblokir BUKAN vonis keamanan; uji tanya-jawab Gibran setelah P0-6 |
| E-4 | **Cron auto-add kehilangan verifikasi checkLink** | Cron 2 jam memakai `checkLink` untuk memverifikasi kandidat sebelum auto-add. Selama mitigasi (a), checkLink menolak semua → cron tidak bisa memverifikasi → auto-add macet atau (lebih buruk) kandidat lolos tanpa verifikasi | Sedang bila mitigasi (a) dipilih | Katalog berhenti bertambah otomatis; atau risiko kandidat tak terverifikasi masuk katalog | Selama mitigasi: cron menandai kandidat "belum terverifikasi link" dan TIDAK auto-add (§A.7). JANGAN buat jalur bypass khusus cron |
| E-5 | **Timeout global memotong pemeriksaan legit yang lambat** | Halaman legit di server lambat (mis. > 20 detik) kini menghasilkan "tidak selesai" padahal sebelumnya (dengan 12 dtk × banyak hop) bisa selesai | Rendah–Sedang | Hasil "tidak selesai" membingungkan; pengguna mengira situs bermasalah | Bedakan pesan: "pemeriksaan tidak selesai (timeout)" vs "situs tidak terjangkau" vs "ditolak guard"; catat sebagai sinyal UNVERIFIED, bukan vonis |
| E-6 | **Rate limit memblokir pengguna legit** | Pengguna yang memeriksa banyak link berurutan (mis. kurator airdrop) terkena 429 | Rendah (dengan kuota 10/menit yang disetujui v2) | Pengguna frustrasi | Pesan 429 yang jelas + waktu tunggu; monitor log 429 minggu pertama |
| E-7 | **Pinning merusak TLS / virtual hosting** | Pendekatan 2 (IP literal + Host header) yang salah implementasi dapat merusak verifikasi sertifikat atau mengambil konten host yang salah | Sedang bila memakai Pendekatan 2 | Vonis salah (konten host lain yang dipindai); atau semua HTTPS gagal | Pilih pendekatan dari hasil spike (§C, P0-1a); uji TLS di staging dengan berbagai host HTTPS; JANGAN pernah `rejectUnauthorized: false` |
| E-8 | **DNS resolve menambah latensi / kegagalan baru** | DNS lambat atau gagal untuk domain legit → pemeriksaan ditolak (fail-closed) padahal situsnya baik-baik saja | Rendah–Sedang | False negative (penolakan) untuk domain legit | Timeout DNS 5 detik + cache DNS singkat (TTL-aware) untuk hostname yang sama dalam satu pemeriksaan; monitor rasio penolakan DNS |
| E-9 | **Regresi pada RDAP** | Guard pada redirect rdap.org yang terlalu ketat dapat memutus lookup umur domain (sinyal penting — Ptah WASPADA 45 sebagian besar dari sinyal ini) | Rendah | Skor berubah; sinyal umur domain hilang | RDAP diuji sebagai bagian dari 3 URL acuan; allowlist RDAP dari IANA bootstrap (§A.1a v2); bila RDAP gagal, pemeriksaan tetap berjalan dengan sinyal "umur domain tidak diketahui" (perilaku lama) |
| E-10 | **Perubahan perilaku yang tidak terlihat di UI** | Penolakan guard yang tampil sebagai "tidak terjangkau" (bukan "ditolak") akan membingungkan pengguna dan Gibran | Rendah (dicegah oleh §A.6) | Kepercayaan terhadap hasil menurun | Respons penolakan adalah tipe tersendiri (§A.6); uji UI setelah P0-6 |

**Risiko terbesar secara keseluruhan:** E-2 (perubahan vonis acuan) dan E-4
(cron auto-add). Keduanya ditangani oleh uji staging + aturan "jangan bypass"
di §A.7 — bukan oleh optimisme.

### E.11 Risiko baru yang ditemukan dari spike runtime (v2)

| # | Risiko | Penjelasan | Probabilitas | Dampak | Mitigasi |
| --- | --- | --- | --- | --- | --- |
| E-11 | **Perilaku implisit runtime (SNI dari header `Host`)** | Node menurunkan SNI dari header `Host` bila `servername` tidak diisi (T3b). Implementasi yang lupa mengisi `servername` dapat mengira verifikasi hostname berjalan padahal ia bergantung pada perilaku implisit yang dapat berubah antar versi runtime | Sedang bila tidak diuji | Verifikasi hostname hilang diam-diam pada runtime lain | `servername` SELALU diisi eksplisit; uji T3b (tanpa `servername` harus gagal) masuk ke uji regresi; grep review memastikan tidak ada jalur TLS tanpa `servername` eksplisit |
| E-12 | **Callback `lookup` yang salah menangani `options.all`** | Bun memanggil lookup dengan `all:true`; callback yang mengembalikan alamat tunggal gagal (`ERR_INVALID_IP_ADDRESS`, B1) — kegagalan ini dapat disalahartikan sebagai "runtime tidak mendukung pinning" | Sedang | Diagnosis salah → keputusan arsitektur salah (mis. membangun fetcher terpisah yang tidak perlu) | Callback lookup WAJIB menangani kedua bentuk; uji unit lookup mencakup `all:true` dan `all:false`; spike mendokumentasikan perilaku ini (§A.2a) |
| E-13 | **Menulis socket sebelum handshake selesai** | `Bun.connect` + tulis sebelum handler `open` tidak diteruskan (B3) — dapat disalahartikan sebagai kegagalan TLS | Rendah | Diagnosis salah; implementasi Pendekatan 2 via socket dinilai "tidak bekerja" | Aturan: tulis HANYA di handler `open`; uji V1 menjadi uji penerimaan Pendekatan 2 via socket |
| E-14 | **API undici berubah antar versi** | Undici v7 mengubah API lookup (interceptor `dns` + `.compose()`; argumen pertama adalah origin lengkap sebagai string). Kode yang ditulis untuk API lama gagal — sebagian secara diam-diam (constructor `interceptors` tidak menjalankan lookup) | Sedang bila undici dipakai | Pinning yang dikira bekerja ternyata tidak bekerja — kegagalan diam-diam yang paling berbahaya | Undici TIDAK dijadikan dependensi utama di runtime Bun; bila dipakai (fetcher Node terpisah), kunci versi mayor dan uji T1/T1b menjadi uji penerimaan |
| E-15 | **DNS sandbox VM tidak representatif** | Resolver di VM ini mengembalikan `198.18.228.151` untuk `example.com` (rentang benchmarking) — hasil resolve DNS publik di VM ini TIDAK VALID untuk produksi | Pasti (teramati) | Keputusan berbasis DNS VM ini salah; uji staging yang memakai DNS publik VM ini menyesatkan | Semua uji DNS memakai DNS/server uji yang dikontrol sendiri; hasil resolve publik dari VM dicatat sebagai tidak valid |
| E-16 | **HTTP/2 pada Pendekatan 2 belum teruji** | Spike memakai HTTP/1.1; perilaku `:authority` pada HTTP/2 untuk koneksi IP literal belum dibuktikan (U-3 laporan spike) | Rendah–Sedang | Konten host yang salah dipindai, atau fetch HTTP/2 gagal | Bila Pendekatan 2 dipakai: paksa HTTP/1.1 untuk fetch terp-pin, ATAU uji HTTP/2 di staging sebelum cutover |
| E-17 | **Sumber IP rate limit belum terbukti** | Topologi runtime tidak terdokumentasi — sumber IP tepercaya belum diketahui (§A.7.1 v2) | Pasti (belum diketahui) | Rate limit menghitung IP yang salah (proxy tunggal atau header palsu) | Discovery P1-2a wajib sebelum P1-2; default fail-closed (`socket.remoteAddress`) |

---

## F. Estimasi kompleksitas pengerjaan

**Asumsi estimasi (v2, TETAP untuk v2.1):** satu engineer yang sudah mengenal kode artifact;
spike P0-1a SUDAH membuktikan runtime Bun 1.4.4 mendukung pinning
(Pendekatan 1 via Node `https` Agent `lookup`; Pendekatan 2 via `Bun.fetch`
+ `tls.serverName`) — risiko "runtime tidak mendukung pinning sama sekali"
SUDAH tertutup untuk Bun CLI; yang tersisa adalah uji ulang di staging
artifact produksi (U-1). **Catatan v2.1:** koreksi-koreksi v2.1 (NAT64,
matcher RDAP, lease konkurensi, dokumentasi TTL/timeout) masuk dalam
P0-1b/P0-UJI yang sudah ada — TIDAK menambah langkah baru dan TIDAK mengubah
total estimasi ~8–14 hari kerja. Estimasi adalah **rentang kasar dalam hari kerja**,
bukan janji. "Paralel" berarti dapat dikerjakan bersamaan oleh orang berbeda
atau tanpa menunggu langkah lain selesai.

| Langkah | Ukuran | Estimasi kasar | Paralel / berurutan | Dependensi kritis |
| --- | --- | --- | --- | --- |
| P0-0 Mitigasi (flag + pesan UI) | Kecil | < 0,5 hari | Berurutan (pertama) | Keputusan pemilik — DISETUJUI v2 |
| P0-1a Spike runtime (pinning) | Sedang | ✅ SELESAI (v2) | — | — |
| P0-1a' Uji ulang pinning di staging artifact produksi | Kecil–Sedang | 0,5 hari | Setelah P0-1c | Akses staging artifact |
| P0-1b Perluas ssrf-guard + resolveAndCheck | Sedang | 1–2 hari | Setelah P0-1a | Hasil spike |
| P0-1c fetchGuarded + fetchWithPinnedIp | Sedang–Besar | 1–2 hari | Setelah P0-1b | P0-1b; TLS/SNI bila Pendekatan 2 |
| P0-2 Integrasi ke fetchText (URL awal) | Kecil–Sedang | 0,5–1 hari | Setelah P0-1c | P0-1c |
| P0-3 Guard redirect + RDAP | Sedang | 1–1,5 hari | Setelah P0-2 | P0-2; bootstrap RDAP |
| P0-4 Nonaktifkan script fetch | Kecil | < 0,5 hari | **Paralel** dengan P0-1/2 | Keputusan pemilik — DISETUJUI v2 |
| P0-5 Perketat normalizeUrl (termasuk port 80/443) | Kecil | 0,5 hari | Setelah P0-1b | Normalisasi IP |
| P0-6 Respons penolakan aman + log | Kecil–Sedang | 0,5–1 hari | Setelah P0-2..P0-5 | Semua titik penolakan |
| P0-UJI Regresi + blokir staging | Sedang | 1–2 hari | Setelah semua P0 | Server + DNS uji |
| **Total P0** | — | **~5–9 hari kerja** | — | — |
| P1-1 Timeout global + streaming + Content-Type | Sedang | 1 hari | Setelah P0-UJI | P0-UJI lolos |
| P1-2a Discovery sumber IP tepercaya | Kecil | < 0,5 hari | Sebelum P1-2 | Dokumentasi/uji staging |
| P1-2 Rate limit + konkurensi + 429 | Sedang | 1–2 hari | Setelah P0-UJI; paralel dengan P1-1 | P1-2a; tabel `rate_limits` |
| P1-3 Batas script (port sudah di P0-5) | Kecil | < 0,5 hari | Setelah P0-5; paralel dengan P1-1/2 | — |
| P1-4 Logging + alert | Kecil–Sedang | 0,5–1 hari | Setelah P0-6 | Log keamanan P0-6 |
| P1-UJI + evaluasi ChatGPT + cutover | Sedang | 1–2 hari | Setelah semua P1 | Semua P1 |
| **Total P1** | — | **~3–5 hari kerja** | — | — |
| **Total P0+P1** | — | **~8–14 hari kerja** | — | — |

**Yang dapat memperbesar estimasi (risiko estimasi) — v2:**

- Uji staging produksi (U-1) membuktikan runtime artifact **tidak mendukung**
  pinning → diperlukan fetcher terpisah atau egress proxy: +Besar, dan
  rancangan ini harus direvisi sebelum implementasi (alternatif §A.2a).
- Uji staging menemukan false positive massal pada URL legit (E-1) → iterasi
  guard + uji ulang: +1–3 hari.
- Vonis 3 URL acuan berubah karena script off (E-2) → diskusi + penyesuaian
  sinyal: +0,5–1 hari (bukan dengan mengaktifkan kembali script secara
  diam-diam).
- Discovery P1-2a menunjukkan topologi multi-instance tanpa store bersama
  yang jelas → implementasi semaphore DB: +Sedang.
- HTTP/2 pada Pendekatan 2 (E-16) memerlukan penanganan `:authority` →
  +Kecil–Sedang, atau keputusan paksa HTTP/1.1 (tanpa biaya).

---

## Keputusan pemilik — DISETUJUI (v2, 7 Nov 2026)

| # | Keputusan | Nilai yang disetujui | Rujukan |
| --- | --- | --- | --- |
| D-1 | Temporary mitigation | **(a) Nonaktifkan scanning URL arbitrer sementara** | §D.1 v2 |
| D-2 | Script fetching | **Matikan sementara (flag)** | §D.2 v2 |
| D-3 | Pendekatan pinning | **Pendekatan 1 (Node `https` Agent `lookup`) sebagai utama; Pendekatan 2 (`Bun.fetch` + `tls.serverName` + `Host`) sebagai fallback** — diputuskan dari hasil spike | §A.2a, `SSRF_SPIKE_RUNTIME.md` |
| D-4 | Kuota rate limit | **10/menit + 100/jam per IP** | §A.7 v2 |
| D-5 | Port non-standar | **Blokir di P0-5 — hanya 80 dan 443** | §A.5 v2, §B.1 |
| D-6 | CGNAT `100.64.0.0/10` | **Blokir secara default** | §A.4 v2 |
| D-7 | Timeout global | **20 detik** | §A.5 v2 |
| D-8 | Cutover | **Hanya setelah SELURUH uji wajib lolos** (termasuk timeout global + rate limit + uji ulang pinning staging); implementasi bertahap per langkah dengan pengujian setiap build | §D.5 v2 |

Tidak ada keputusan D-1 s.d. D-8 yang masih terbuka. Yang masih menunggu
keputusan pemilik setelah evaluasi ChatGPT atas v2 ini: **persetujuan
implementasi** itu sendiri (ya/tidak, dan bila ya, tanggal mulai P0-0).

---

## G. Risiko yang BELUM terselesaikan setelah revisi v2.3.5

Daftar ini jujur: risiko-risiko berikut TIDAK ditutup oleh rancangan ini,
dan harus diterima secara eksplisit atau ditangani di luar rancangan ini.

| # | Risiko belum terselesaikan | Kenapa belum tertutup | Dampak bila terjadi | Penanganan yang tersedia |
| --- | --- | --- | --- | --- |
| U-1 | **Pinning belum terbukti di runtime artifact produksi** | Spike dijalankan pada Bun CLI 1.4.4 di VM — versi/konfigurasi runtime produksi tidak terdokumentasi di sini | Pendekatan 1 gagal di staging produksi → implementasi harus beralih ke fallback/alternatif di tengah jalan | Uji P0-1a' di staging produksi SEBELUM integrasi penuh; bila gagal, ikuti alternatif §A.2a (fetcher terpisah / egress proxy) |
| U-2 | **Apakah metadata cloud / layanan internal dapat dijangkau dari server produksi** | Memerlukan probing terhadap infrastruktur produksi — dilarang tanpa otorisasi; audit §5 mencatat status ini sebagai alasan tidak ada temuan Kritis | Bila ternyata dapat dijangkau, dampak SSRF naik menjadi Kritis dan mitigasi (a) menjadi satu-satunya penahan sampai P0 selesai | Uji staging terisolasi + dokumentasi topologi egress dari penyedia runtime; mitigasi (a) menutup jendela selama perbaikan |
| U-3 | **Topologi egress / isolasi jaringan server produksi tidak diketahui** | Tidak ada dokumen firewall/security group/VPC/egress proxy di bundle bukti audit (§7 NOT VERIFIED) | Guard kode adalah satu-satunya lapisan; bila guard lolos (bug), tidak ada lapisan kedua | P2: isolasi egress infra; dokumentasi topologi sebagai prasyarat Phase 5 |
| U-4 | **Sumber IP pemanggil yang tepercaya belum diketahui** | Topologi ingress/proxy runtime tidak terdokumentasi (§A.7.1 v2) | Rate limit dapat menghitung IP yang salah (proxy tunggal atau header palsu) | Discovery P1-2a; default fail-closed (`socket.remoteAddress`) |
| U-5 | **Apakah scanner sudah disalahgunakan sebelum mitigasi** | Tidak ada akses ke log server atau metrik penyalahgunaan di luar kode (keterbatasan audit) | Serangan yang sudah terjadi tidak terdeteksi; kredensial/data yang sudah bocor tidak diketahui | Periksa log runtime bila tersedia; rotasi kredensial yang mungkin terekspos; monitor log percobaan SSRF setelah P1-4 |
| U-6 | **HTTP/2 pada Pendekatan 2 belum teruji** | Server uji memakai HTTP/1.1 (U-3 laporan spike) | Konten host yang salah dipindai atau fetch HTTP/2 gagal bila Pendekatan 2 dipakai | Paksa HTTP/1.1 untuk fetch terp-pin, atau uji HTTP/2 di staging |
| U-7 | **Kinerja/latensi DNS + pinning pada beban nyata belum teruji** | Spike memakai server lokal dan satu koneksi per uji (U-4 laporan spike) | Latensi pemeriksaan naik; timeout DNS 5 detik dapat menolak domain legit yang lambat | Uji beban di staging (R-01..R-15); monitor rasio penolakan DNS minggu pertama |
| U-8 | **Timing oracle residual pada penolakan** | Penolakan di `normalizeUrl()` (instan) vs setelah resolve (lambat) memberi celah timing kecil (dicatat di §A.6 butir 4) | Penyerang dapat membedakan alasan penolakan lewat waktu respons | Diterima sebagai keterbatasan di P0; mitigasi timing (delay seragam) dipertimbangkan di P2 bila dinilai perlu |
| U-9 | **RDAP bootstrap registry dapat berubah** | IANA dapat menambah/mengubah entri; cache semingguan dapat kedaluwarsa | Redirect RDAP ke host baru yang sah ditolak (false negative sinyal umur domain) | Refresh semingguan + fallback cache terakhir + log; RDAP yang gagal tidak menggagalkan pemeriksaan (sinyal "tidak diketahui") |
| U-10 | **Daftar blokir IANA dapat berubah** | Registry diperbarui IANA (terakhir 9 Okt 2025); entri baru dapat muncul | Alamat yang baru diklasifikasikan tidak terjangkau lolos sampai daftar diperbarui | Pemeriksaan 6 bulanan (§A.4.4); penghapusan entri tidak otomatis |
| U-11 | **Prefix translasi network-specific (NSP) di luar dua prefix NAT64 yang dikenal (v2.1) — TETAP TERBUKA (v2.2)** | Guard hanya mengekstrak IPv4 tertanam untuk `64:ff9b::/96` dan `64:ff9b:1::/48`. NSP lain (mis. prefix organisasi sendiri) yang menanamkan IPv4 privat di bawah prefix yang tampak publik TIDAK dikenali — alamat IPv6-nya lolos tabel IPv6 karena tampak publik | SSRF ke IPv4 privat lewat translasi NSP yang tidak dikenal | **TETAP sebagai risiko terbuka — tidak diklaim tertangani.** Penanganan di staging (v2.2): (1) jalankan DNS64 uji dengan prefix NSP yang diketahui (mis. prefix uji `2001:db8::/32` yang dikonfigurasi di DNS64 staging) dan verifikasi guard mengekstrak IPv4 tertanam dengan benar untuk prefix tersebut — uji S-49/S-50 baru; (2) minta dokumentasi egress runtime produksi: apakah jalur egress memakai NAT64/DNS64, prefix NSP apa saja yang dipakai, dan apakah ada daftar prefix yang didokumentasikan. **Kriteria penurunan status:** risiko ini HANYA boleh diturunkan dari TERBUKA bila (a) dokumentasi egress menyatakan prefix NSP yang dipakai (atau menyatakan tidak ada NAT64/DNS64 di jalur egress) DAN (b) uji staging dengan prefix-prefix itu lolos. Bila salah satu tidak terpenuhi, status TETAP TERBUKA dan prefix yang ditemukan di kemudian hari ditambahkan sebagai entri khusus dengan ekstraksi per RFC 6052 (posisi IPv4 bergantung panjang prefix). Dokumentasi egress mengurangi ketidakpastian dengan cara: bila runtime menyatakan tidak memakai NAT64/DNS64, permukaan serangan NSP hilang; bila memakai, daftar prefix-nya menjadi daftar yang harus ditangani guard — tanpa dokumen itu, guard tidak tahu prefix apa yang harus dicari. |
| U-16 | **Perilaku semaphore DNS di runtime artifact produksi belum terbukti (v2.2; diperbarui v2.3)** | Siklus hidup slot (§A.5.3), absolute cap, DAN penghitung orphaned + circuit breaker + terminasi worker (§A.5.4) TERBUKTI di Node v24.22.1 pada VM ini (SEM-T1..SEM-T6, SEM-R1..SEM-R6, ORPH-T1..T5) — BUKAN di runtime artifact produksi. Perilaku `AbortSignal`/timer/event-loop/IPC di runtime produksi dapat berbeda | Slot dilepas terlalu dini (race timeout) atau tidak pernah dilepas (cap tidak berjalan) di produksi → lookup background menumpuk atau semaphore macet; breaker tidak membuka/menutup sebagaimana dirancang | Absolute cap 30 dtk + batas orphaned + breaker sebagai katup pengaman; uji ulang perilaku semaphore DAN orphaned di staging produksi (U-1) wajib mencakup SEM-T1/T3/T5, ORPH-T1..T4; monitor `forceReleased` dan `orphaned` — bila > 0 di minggu pertama, selidiki resolver staging |
| U-18 | **Akumulasi orphaned TERBATAS tetapi tidak hilang (v2.3 — risiko sisa dari keberatan absolute cap; diperbarui v2.3.1 dengan angka worst-case lintas instance)** | Batas keras + breaker bersifat PER PROSES: tiap proses menahan maksimal `maxActive + cap = 8` operasi hidup. Batas ini TIDAK global antar instance — worst-case lintas instance = **8N** (N = jumlah instance; 100 instance → 800 operasi hidup total). `scan_leases` global TIDAK mengikat angka ini: lease membatasi pemeriksaan yang berjalan (maks 5), bukan akumulasi orphaned — karena lease dilepas saat pemeriksaan selesai sementara lookup-nya tetap hidup sebagai orphaned (lihat §A.5.6). Selain itu, operasi cap-deferred menahan slot sampai orphaned turun; bila resolver menggantung dan worker belum tersedia (mode tanpa worker), pemulihan tidak terjamin | Akumulasi lintas instance tetap mungkin (dibatasi per proses, bukan global); semaphore macet total bila worker tidak ada dan resolver menggantung selamanya | Batas per proses + breaker + restart worker sebagai pemulihan terjamin; bila mode tanpa worker dipakai, catat eksplisit bahwa pemulihan tidak terjamin dan satu-satunya jalan keluar adalah restart manual proses layanan; batas global lintas instance (bila dibutuhkan) adalah keputusan P2, bukan bagian P0 — syaratnya di §A.5.6 |
| U-19 | **Restart worker DNS — kompleksitas dan risiko restart loop (v2.3)** | Worker menambah komponen bergerak: spawn IPC, readiness check, respawn, cooldown, batas restart. Restart yang gagal (worker langsung mati lagi) atau restart loop dapat memperburuk keadaan; lookup yang sedang berjalan di worker yang di-kill gagal fail-closed dan membebani pemanggil | Restart loop menghabiskan sumber daya; lookup gagal massal saat worker di-restart berulang; IPC yang tidak diautentikasi menjadi permukaan baru | Cooldown 30 dtk + maks 3 restart/10 menit + page bila terlampaui; readiness check sebelum lookup pertama; channel IPC diikat ke parent (bukan socket terbuka); restart hanya bila breaker terbuka > 60 dtk atau `forceReleased ≥ 3`/5 menit |
| U-20 | **Breaker yang terlalu agresif dapat menolak lookup legit (v2.3)** | Bila resolver upstream lambat/bermasalah (bukan serangan), orphaned naik, breaker terbuka, dan SEMUA lookup DNS baru ditolak — termasuk domain legit. Ini adalah harga dari fail-closed: ketersediaan dikorbankan demi keamanan | Penolakan massal pemeriksaan legit saat resolver bermasalah; pengguna melihat scanner "mati" padahal targetnya aman | Ambang alert + runbook (§A.5.4 butir 4) agar operator cepat membedakan serangan vs resolver bermasalah; threshold pemulihan (hysteresis) mencegah flapping; bila resolver bermasalah terbukti, perbaikan resolver adalah tindakan yang benar — bukan melonggarkan breaker diam-diam |
| U-12 | **DNS non-cancellable — perilaku signal di runtime produksi belum terbukti (v2.1)** | Di VM ini `AbortSignal` tidak menghentikan `dns.lookup`/`resolve4` (TEST 3); apakah ini perilaku umum Node atau efek resolver lokal TIDAK dapat dibedakan di sini | Lookup yang tidak dapat dibatalkan menumpuk dan melampaui anggaran bila mitigasi race/semaphore gagal atau tidak diimplementasikan dengan benar | Mitigasi v2.1: race + timeout 5 dtk + semaphore 4 + abaikan hasil telat + log; uji ulang perilaku signal di staging produksi (U-1) wajib mencakup ini |
| U-13 | **TTL hasil resolve sandbox tidak representatif (v2.1)** | Resolver VM mengembalikan TTL 15 untuk `example.com` → `198.18.228.151` (alamat benchmarking, bukan alamat publik sebenarnya) — nilai TTL/alamat dari VM tidak valid untuk produksi | Keputusan berbasis TTL/alamat VM ini salah bila diterapkan ke produksi | TTL hanya dicatat (tidak dipakai sebagai dasar blokir); tidak ada caching DNS — pin selalu resolve segar per hop; uji TTL di staging dengan DNS yang dikontrol sendiri |
| U-14 | **Tabel lease `scan_leases` sebagai titik kegagalan baru (v2.1)** | Konkurensi global bergantung pada DB bersama; bila DB lambat/down, seluruh pemeriksaan ditolak 503 (fail-closed) atau lease bocor | Downtime pemeriksaan bila DB bermasalah; slot macet bila release gagal dan TTL 25 detik belum kedaluwarsa | TTL lease 25 dtk membersihkan slot macet otomatis; release di `finally`; monitor rasio 503/429 minggu pertama; bila DB lease terbukti rapuh, fallback ke semaphore per instance + kuota dibagi (keputusan eksplisit pemilik, bukan diam-diam) |
| U-15 | **Perilaku `AbortSignal` dan `lookup` pada runtime artifact produksi belum terbukti (v2.1)** | Semua bukti spike (pinning, dekompresi, DNS, RDAP) berasal dari Bun/Node CLI di VM ini, BUKAN runtime artifact produksi — versi/konfigurasi runtime produksi tidak terdokumentasi | Pendekatan pinning atau perilaku DNS yang terbukti di VM gagal di staging produksi → implementasi harus beralih di tengah jalan | Uji P0-1a' di staging produksi SEBELUM integrasi penuh (tetap wajib); bila gagal, ikuti alternatif §A.2a (fetcher terpisah / egress proxy) |
| U-17 | **Lease `scan_leases` di bawah beban ratusan instance belum teruji (v2.2)** | Uji atomicity memakai 8 proses serentak; kontensi lock pada ratusan instance bersamaan (antrean lock SQLite, atau lock advisory PostgreSQL) belum diukur — latensi acquire dapat naik dan timeout 5 dtk dapat terpicu massal | Acquire lease melambat → 503 massal saat beban tinggi; atau timeout lock menyebabkan penolakan pengguna legit | Uji beban R-15 baru (ratusan acquire bersamaan, ukur latensi p95 dan rasio 503); bila kontensi terbukti bermasalah, pertimbangkan sharding lease per kelompok instance atau semaphore lokal sebagai lapisan pertama + lease global sebagai lapisan kedua (keputusan eksplisit, bukan diam-diam) |
| U-21 | **Exit worker tidak terkonfirmasi (v2.3.1 — BARU)** | Bila proses worker tidak mati setelah SIGKILL (D-state / uninterruptible sleep, namespace bermasalah), tidak ada event `exit` — counter tetap, breaker tetap terbuka, dan satu-satunya jalan keluar adalah intervensi operator atau restart manual proses layanan. Perilaku ini TERBUKTI sebagai fail-closed (TERM-T3), tetapi berarti satu worker yang tidak bisa mati dapat menahan breaker terbuka sampai intervensi manual | Breaker terbuka berkepanjangan → seluruh lookup DNS baru ditolak sampai intervensi manual; ketersediaan scanner mati sementara | Alert `workerExitUnconfirmed > 0` → page; runbook: periksa proses (`ps`), bila proses ada tetapi tidak merespons, eskalasi ke operator infra; JANGAN memaksa decrement counter secara manual tanpa bukti proses mati |
| U-22 | **Parent crash / supervisor platform belum terbukti (v2.3.1 — BARU)** | Dua lapis pertahanan TERBUKTI di VM ini (worker self-exit via `disconnect`/ppid-watchdog + pidfile cleanup oleh parent baru — PARENT-T1a/T1b). Lapis ketiga — supervisor platform yang me-restart proses dan membunuh process group saat crash — TIDAK DAPAT diperiksa di VM ini; perilaku supervisor runtime produksi tidak terdokumentasi | Bila supervisor tidak membunuh process group DAN dua lapis pertama gagal (mis. worker sedang menjalankan operasi yang menahan event loop tanpa handler cleanup), worker yatim dapat terus berjalan di luar penghitung parent baru | Persyaratan staging SUP-01 (gerbang G6): dokumentasi supervisor HARUS menyatakan restart otomatis + kill process group; bila tidak dapat dibuktikan, pertahanan yang tersisa adalah self-exit + pidfile cleanup yang teruji — dan harus diuji ulang di staging produksi |
| U-23 | **Batas global orphaned belum ada — worst-case lintas instance 8N (v2.3.1 — BARU, kuantifikasi U-18)** | Batas 8 operasi hidup adalah batas per proses; tidak ada mekanisme bersama yang mengikat total orphaned lintas instance. `scan_leases` tidak mengikatnya (lihat §A.5.6). Store bersama untuk orphaned global membutuhkan heartbeat/lease-TTL pada entri orphaned + failure mode baru (DB down → seluruh DNS fail-closed) | 100 instance × 8 = 800 operasi DNS hidup pada resolver yang menggantung; akumulasi tidak terlihat oleh satu pun breaker per proses | Batas per proses + breaker + restart worker + metrik/alert sebagai mitigasi P0; batas global orphaned adalah keputusan P2 dengan syarat di §A.5.6 (store bersama teruji + failure mode terdokumentasi + keputusan pemilik) |
| U-24 | **Jendela TOCTOU validasi-identitas → SIGKILL (v2.3.2 — BARU)** | Validasi identitas dan pengiriman SIGKILL adalah dua syscall terpisah: PID dapat mati dan dipakai ulang tepat di antara pembacaan `/proc` dan `kill()`. Mitigasi: validasi dilakukan sesaat sebelum sinyal dalam tick yang sama (tanpa `await` di antaranya) dan start time dibaca ulang tepat sebelum `kill()` — bila berbeda, sinyal dibatalkan. Sisa jendela (proses mati + PID dipakai ulang + start time baru KEBETULAN sama) praktis tidak mungkin (start time berbeda per instans), tetapi tidak dapat dibuktikan nol secara formal | SIGKILL mengenai proses yang salah (proses lain yang memakai ulang PID) | Validasi sesaat-sebelum-sinyal + pembacaan ulang start time; bila ada keraguan, JANGAN kirim sinyal (fail-closed ke NOT_READY + page); uji ulang perilaku ini di staging produksi (U-16) |
| U-25 | **Race reklamasi lock basi — TERBUKTI (v2.3.2 — DIPERSEMPIT v2.3.3 — DITARIK DAN DIGANTI v2.3.4)** | Klaim v2.3.3 ("balapan hapus+create diselesaikan oleh O_EXCL", "SU10-T1 membuktikan balapan terkelola") TERBUKTI SALAH: ADV-T1 mereproduksi 2 pemilik secara deterministik (2/2 run) — B meng-unlink file lock baru milik A berdasarkan probe basi, lalu memperoleh lock sendiri; A tidak pernah tahu. Akar masalah: (1) unlink tak bersyarat setelah probe basi; (2) verify hanya pemeriksaan sesaat — otoritas lock menguap begitu path dihapus. Seluruh jalur probe+unlink DIHAPUS v2.3.4 dan diganti flock (§A.5.5.4c); ADV-T2/T2sim membuktikan perbaikan (tepat satu pemilik, 2/2 run). Sisa dari U-25 yang masih relevan: PID reuse antara probe dan unlink (proses baru kehilangan file yang bukan miliknya — tidak ada dampak) | Dua parent sama-sama berstatus pemilik dan sama-sama melakukan cleanup (pada KODE LAMA) | Mekanisme flock + never-unlink + verifikasi ulang (ADV-T2/T2sim/T5, FLK-T1..T8); uji ulang di staging produksi tetap wajib (balapan di bawah beban/latensi runtime produksi belum teruji) |
| U-26 | **Startup macet sampai intervensi operator (v2.3.3 — BARU — DIPERBARUI v2.3.4)** | Aturan ketat v2.3.3 (PID hidup/EPERM/lock tak terbaca -> NOT_READY sampai operator memeriksa) menjadi TIDAK RELEVAN untuk lock setelah v2.3.4: jalur probe+unlink yang memicunya sudah dihapus — tidak ada lagi keputusan hapus yang dapat macet. Residual yang TETAP: (a) bila verifikasi ulang kepemilikan gagal (mis. file diganti pihak ketiga), parent keluar `ownership-revalidation-failed` + page dan TIDAK BOLEH start ulang sebelum operator memeriksa (runbook §A.5.5.4c); (b) bila flock dipegang proses yang tidak mati-mati (holder hidup tetapi tidak sehat), parent baru keluar `held-by-live-holder` dan supervisor harus menangani holder lama — bukan parent baru yang memaksakan akuisisi. Operator yang salah menghapus file lock pemegang yang hidup tetap dapat menciptakan dua pemilik (flock bersifat advisory) | Scanner tetap nonaktif sampai operator memeriksa; penghapusan file lock yang ceroboh oleh operator adalah satu-satunya jalan tersisa menuju dua pemilik di luar masa transisi versi | Page segera saat `ownership-revalidation-failed`; runbook operator wajib: (1) JANGAN PERNAH `rm` file lock saat parent berjalan; (2) periksa `ps` + `/proc` untuk PID yang diklaim; (3) bila proses hidup, biarkan pemegangnya atau matikan pemegang itu terlebih dahulu (flock lepas otomatis saat proses mati — FLK-T2), jangan hapus file-nya; (4) catat keputusan di log insiden |
| U-27 | **Durabilitas pidfile belum terbukti di filesystem produksi (v2.3.3 — BARU)** | SU-T4 membuktikan atomic visibility (rename atomik), BUKAN durabilitas. Seluruh bukti di VM ini berjalan di `/tmp` bertipe tmpfs (fsync tidak menguji durabilitas disk) dan `/home` di overlay btrfs dengan `fsync=volatile` — tidak ada bukti durability di VM ini yang membuktikan durability di filesystem produksi. Bila filesystem produksi mengabaikan fsync, crash tepat setelah rename dapat mengembalikan pidfile lama (atau menghilangkan pidfile) setelah reboot | Pidfile lama yang kembali setelah reboot dapat membuat parent baru menilai worker lama sebagai masih hidup (NOT_READY yang tidak perlu) atau, sebaliknya, kehilangan jejak worker yang sebenarnya masih hidup — dalam kedua kasus, keputusan startup didasarkan pada data basi | Pidfile + lock WAJIB di penyimpanan persisten (bukan tmpfs); uji crash staging D-01..D-03 wajib dijalankan di lingkungan dengan filesystem yang sama dengan produksi sebelum cutover; lokasi pidfile/lock + output `df`/`mount` didokumentasikan saat implementasi (P0-1b) |

---

| U-28 | **Masa transisi versi campuran (v2.3.4 — BARU)** | ADV-T6 membuktikan: parent berkode LAMA (unlink-reclaim) yang berjalan bersamaan dengan holder berkode BARU (flock) dapat menghasilkan DUA pemilik — unlink kode lama menghapus file holder baru. Jaring pengaman (verifikasi ulang inode+token) menangkapnya sebelum cleanup pada 2/2 run, tetapi itu jaring pengaman, bukan penutup struktural. flock bersifat advisory: ia tidak menghalangi proses yang tidak memanggil flock | Dua parent berstatus pemilik selama masa transisi; bila verifikasi ulang dilewati/diabaikan implementasi, keduanya melakukan cleanup | Flag-day WAJIB (§A.5.5.4d): hentikan SEMUA parent sebelum upgrade/rollback; verifikasi ulang sebelum cleanup apa pun; uji ADV-T6 diulang di staging sebelum cutover |
| U-29 | **Binding flock untuk runtime produksi belum terbukti (v2.3.4 — BARU — DIPERBARUI v2.3.5)** | `bun:ffi` -> libc flock TERBUKTI di Bun 1.4.4 (acquire / EWOULDBLOCK errno 11 / release on close). `fs-ext` untuk Node GAGAL dibangun di VM ini (node-gyp EPERM fchown — pembatasan sandbox, bukan cacat fs-ext) — dikonfirmasi ketiga kalinya di v2.3.5 (`npm install fs-ext` di `/tmp/fsext-retest2` → error yang sama). Bila runtime produksi memakai Node (bukan Bun), jalur binding belum terbukti. Selain itu, fd lock WAJIB O_CLOEXEC — FLK-T8b membuktikan bila fd diwariskan ke worker, flock tidak lepas sampai worker mati. Ketersediaan `bun:ffi` di dalam sandbox artifact produksi sendiri adalah risiko terpisah U-34 (NOT VERIFIED) | Parent baru tidak dapat memperoleh lock (startup macet) atau implementasi fallback tanpa flock mengembalikan race lama | Buktikan binding di staging pada runtime yang sama dengan produksi (FLK-06); verifikasi O_CLOEXEC pada API open yang dipakai (FLK-T8a/T8b diulang di staging); bila tidak ada binding yang terbukti, JANGAN implementasikan mekanisme flock — kembali ke meja desain |
| U-30 | **flock di network filesystem belum terbukti (v2.3.4 — BARU — DIPERBARUI v2.3.5)** | FLK-T1..T8 teruji di tmpfs dan overlay (perilaku identik). NFS TIDAK diuji — tidak ada NFS di VM ini; AUTH-T9c NOT RUN di v2.3.5. flock di NFS bergantung pada lockd (NFSv3) atau delegasi (NFSv4); perilaku saat network partition / server restart berbeda dari filesystem lokal dan dapat memberi hasil yang salah (lock yang tidak saling mengecualikan, atau lock yang tidak lepas) | Dua parent memperoleh lock di atas NFS, atau parent baru macet selamanya pada lock yang tidak pernah lepas | Direktori lock WAJIB di filesystem lokal (bukan NFS) kecuali bukti staging menyatakan sebaliknya (FLK-07); lokasi + `df`/`mount` didokumentasikan saat implementasi (P0-1b) |
| U-31 | **Jendela mikro verifikasi ulang -> tindakan destruktif — DIJAWAB v2.3.5 (otoritas flock)** | U-31 v2.3.4 bertanya apakah pemeriksaan (dev,ino)/token cukup sebagai otoritas. Jawaban v2.3.5 (§A.5.5.4e): TIDAK — otoritas adalah flock kernel pada fd yang dipegang; (dev,ino)+token adalah detektor, bukan otoritas. Setiap tindakan sensitif di-gating `assertOwnership()` segar dalam tick sinkron yang sama (`guardedAction`); CLOEXEC diverifikasi via fdinfo; tiap tindakan di-gating identitas (SIGKILL per-sinyal, token pidfile ditolak worker). Dibuktikan AUTH-T1..T11 + AUTH-C1, 18/18 × 2 | Sisa jendela yang tidak dapat dibuat nol dicatat sebagai U-38 (residual, dampak dibatasi fail-closed) | Verifikasi ulang sesaat sebelum tiap langkah destruktif; validasi identitas per-sinyal; token pidfile; uji ulang di staging produksi |
| U-32 | **Bahaya reverse mixed-version: old parent memperoleh lock DULU (v2.3.5 — BARU)** | Parent lama tidak pernah memanggil flock, sehingga parent baru dapat memperoleh flock pada file yang sama sementara holder lama hidup — (dev,ino) sama, tidak ada unlink yang dapat dideteksi verifikasi ulang. Pencegahan harus terjadi SEBELUM penimpaan record | Dua pemilik tercatat bersamaan sampai salah satu keluar; parent baru dapat berjalan dengan keyakinan palsu bahwa ia pemilik tunggal | Pre-start scan `/proc` (AUTH-T5a) + klasifikasi record sebelum penimpaan (AUTH-T5b) sebagai dua lapis; flag-day tetap mengikat (§A.5.5.4d); uji ulang di staging sebelum cutover |
| U-33 | **flock bersifat advisory — tidak menghentikan proses yang tidak memanggilnya (v2.3.5 — BARU)** | flock hanya mengikat proses yang memanggil flock pada inode yang sama. Kode lama, operator `rm`, dan tooling pihak ketiga tidak terikat — never-unlink adalah aturan + runbook, bukan penegakan kernel | Dua pemilik (satu via flock, satu via jalur lain) atau kehilangan file lock oleh penghapusan ceroboh | Never-unlink + runbook operator (JANGAN PERNAH `rm` file lock saat parent berjalan); verifikasi ulang + gating per-tindakan memastikan tidak ada cleanup tanpa otoritas; flag-day untuk transisi versi |
| U-34 | **Runtime artifact produksi: versi dan ketersediaan `bun:ffi` TIDAK DAPAT DIVERIFIKASI (v2.3.5 — BARU)** | Dari VM ini hanya Bun CLI 1.4.4 yang terverifikasi. Versi/konfigurasi runtime di dalam sandbox artifact tidak terdokumentasi di bundle bukti mana pun; tidak ada cara mengaksesnya dari VM ini | `bun:ffi` tidak tersedia / perilaku berbeda di runtime produksi → implementasi flock tidak dapat berjalan → kembali ke meja desain di tengah jalan | Probe staging pada runtime yang SAMA dengan produksi (FLK-06 diperluas): buktikan `bun:ffi` → libc `flock` (acquire / EWOULDBLOCK / release) di dalam sandbox artifact; bila tidak terbukti, JANGAN implementasikan mekanisme flock |
| U-35 | **Filesystem direktori lock produksi TIDAK DAPAT DIVERIFIKASI (v2.3.5 — BARU)** | Jenis filesystem, dukungan semantik flock, dan apakah mount/inode dapat diganti oleh container/deployment/supervisor tidak diketahui dari VM ini. Yang teruji hanya tmpfs dan overlay di VM ini | flock tidak saling mengecualikan / tidak lepas pada filesystem produksi → dua pemilik atau startup macet | Lokasi lock WAJIB di filesystem lokal; `df`/`mount` didokumentasikan saat implementasi (P0-1b); uji FLK-T1..T8 diulang di staging pada filesystem produksi; NFS dilarang tanpa bukti (U-30) |
| U-36 | **Supervisor / container / deployment dapat mengganti mount atau inode (v2.3.5 — BARU, perluasan U-22)** | Perilaku supervisor platform (restart otomatis, kill process group) dan apakah deployment me-replace mount tidak terdokumentasi; tidak dapat diperiksa dari VM ini | Mount diganti di tengah jalan → (dev,ino) berubah → parent keluar `ownership-revalidation-failed` (fail-closed, tetapi scanner mati) atau, lebih buruk, dua mount dengan dua file lock yang masing-masing memberi satu pemilik | Persyaratan staging SUP-01 diperluas: dokumentasi supervisor + deployment HARUS menyatakan (a) restart otomatis, (b) kill process group, (c) apakah mount direktori lock dapat diganti saat deploy; bila mount dapat diganti, direktori lock harus di luar path yang di-replace |
| U-37 | **Zombie liveness — DITUTUP v2.3.5, residual runtime tanpa `/proc` (v2.3.5 — BARU)** | `pidAlive()` v2.3.4 hanya memakai `kill(pid,0)` dan mengklasifikasi zombie sebagai hidup → parent baru menolak start (`lock-record-contradiction`, dibuktikan §4.1 `SSRF_SPIKE_V235.md`). Perbaikan v2.3.5: baca state `/proc/<pid>/stat` (`Z`/`X` = tidak hidup), dibuktikan AUTH-T11 (2/2 run). Residual: perbaikan bergantung pada `/proc` | Bila runtime produksi tidak menyediakan `/proc`, `pidAlive()` kembali ke fallback `kill(pid,0)` dan zombie kembali memblokir startup | Staging wajib memverifikasi ketersediaan `/proc` di runtime produksi; bila tidak ada `/proc`, liveness harus memakai primitif lain yang terbukti (keputusan desain terpisah, bukan diam-diam) |
| U-38 | **Jendela mikro residual: revalidasi → tindakan tidak dapat dibuat nol (v2.3.5 — BARU, sisa U-31)** | Revalidasi dan tindakan adalah dua syscall terpisah; jendela di antaranya tidak dapat dibuat nol dengan syscall file biasa. AUTH-T6 membuktikan konsekuensi jendela itu fail-closed (tindakan tidak berjalan bila otoritas hilang; SIGKILL di-gating identitas per-sinyal; worker menolak token yang tidak cocok) — BUKAN bahwa jendela itu tidak ada | Pihak ketiga yang mengganti file TEPAT di antara revalidasi dan tindakan: pemilik basi paling buruk membunuh worker yang identitasnya cocok dengan pidfile (SIGKILL idempotent) atau menulis pidfile yang ditolak worker (token mismatch) — dampak dibatasi, bukan dihilangkan | Revalidasi sesaat sebelum tiap langkah destruktif (bukan sekali di awal); validasi identitas per-sinyal; token pidfile; penutup struktural penuh membutuhkan primitif atomik check-and-act yang tidak tersedia lewat syscall file biasa — diterima sebagai residual |
| U-39 | **PID yang di-spawn supervisor dapat berbeda dari PID proses yang melayani (v2.3.5 — BARU)** | Teramati pada peluncuran via shell (debug manual: `$!` = 3859 vs PID parent sebenarnya 3863); mekanisme TIDAK ditentukan. Pada spawn Node langsung, PID spawn == PID proses (4506 == 4506, dibuktikan). Supervisor yang membunuh hanya PID yang di-spawn dapat membiarkan parent asli tetap hidup memegang lock | Parent lama yang dikira mati ternyata hidup → parent baru terblokir `held-by-live-holder` atau, bila supervisor me-restart tanpa verifikasi, dua parent hidup bersamaan | Supervisor WAJIB membunuh berdasarkan PID yang tercatat di pidfile/lock record (ditulis dari dalam proses itu sendiri) dan memverifikasi kematian via state `/proc` (bukan hanya `kill(pid,0)`); staging wajib membuktikan jalur kill supervisor (SUP-01) |
| U-40 | **Scan parent false positive via pencocokan substring (v2.3.5 — BARU — DITUTUP)** | Pemindaian `/proc` versi awal mencocokkan marker sebagai substring — shell `bash -c` peluncur mengandung marker di cmdline-nya dan terdeteksi sebagai "parent lain" (tertangkap saat diagnosis AUTH-T3). Perbaikan: marker harus cocok sebagai TOKEN argv persis (cmdline dipecah `\0`), dibuktikan suite AUTH 18/18 × 2 | Sebelum perbaikan: startup sehat ditolak `other-parent-alive` tanpa alasan yang benar | Aturan mengikat: marker adalah token argv persis dan unik per layanan; bila dua layanan berbagi marker yang sama, false positive kembali — penamaan marker didokumentasikan saat implementasi |

## H. Rencana pengujian dan rollback FINAL (v2)

### H.1 Urutan pengujian (gerbang berurutan — tidak ada yang dilewati)

| Gerbang | Isi | Kriteria lolos | Bila gagal |
| --- | --- | --- | --- |
| G0 — Mitigasi aktif + bukti (§D.6 v2.2) | Flag mitigasi (a) aktif; `checkLink` menolak semua URL arbitrer dengan pesan jeda; katalog/dashboard/Gibran tetap jalan; **seluruh butir bukti G0-E1..G0-E5 terkumpul dan terverifikasi** | Semua URL arbitrer ditolak SEBELUM koneksi keluar (log egress 0 koneksi); tidak ada jalur cron yang melewati mitigasi; bukti G0-E1..G0-E5 lengkap | Perbaiki flag / tutup jalur bypass sebelum lanjut; G0 tidak lolos bila satu butir bukti tidak ada |
| G1 — Unit guard | Uji unit `ssrf-guard.ts` (25 kasus lama + kasus baru §C.2 P0-1b) | Semua lolos | Perbaiki guard; jangan lanjut ke integrasi |
| G2 — Spike staging produksi (U-1) | Uji pinning di staging artifact: Pendekatan 1 (atau fallback Pendekatan 2) terbukti dengan DNS uji yang membalik jawaban | Koneksi tetap ke IP pertama yang divalidasi; sertifikat mismatch ditolak | Ikuti alternatif §A.2a; rancangan direvisi |
| G3 — Regresi 3 URL acuan | `scamsem.solbarn.cc` → BAHAYA 100; `binance.com` → LEBIH AMAN; `ptah.trade/poa` → WASPADA (toleransi skor ±5) | Vonis sama | Hentikan; diskusikan (jangan sesuaikan ambang diam-diam) |
| G4 — Uji blokir S-01..S-50 | Semua ditolak SEBELUM fetch; server uji menerima 0 koneksi (termasuk S-44..S-48 NAT64 v2.1 dan S-49/S-50 NSP staging v2.2) | 50/50 ditolak | Perbaiki titik yang lolos; uji ulang dari G3 |
| G5 — Uji legit L-01..L-08 | Semua lolos | 8/8 lolos | Perbaiki false positive; uji ulang dari G3 |
| G6 — Uji sumber daya R-01..R-15 + matcher RDAP RD-01..RD-20 + semaphore SEM-01..SEM-06 + lease LSE-01..LSE-06 (v2.2) + orphaned/breaker/worker ORPH-01..ORPH-06 (v2.3) + konfirmasi terminasi TERM-01..TERM-04 + parent crash PARENT-01..PARENT-02 + rekonsiliasi RECON-01 + supervisor SUP-01 (v2.3.1) + aturan startup STARTUP-01..STARTUP-10 (v2.3.2) + reklamasi yang diperkeras RCL-01..RCL-06 + reklamasi bersamaan SU10-T1/T2 + durabilitas pidfile D-01..D-03 (v2.3.3) + uji adversarial reklamasi lock ADV-01..ADV-06 + semantik flock FLK-01..FLK-07 (v2.3.4) + otoritas flock & mixed-version AUTH-01..AUTH-16 (v2.3.5) | Timeout global, bombe dekompresi (jalur Node Agent), abort per tahap, rate limit multi-instance, anti-spoofing, konkurensi global (R-14), matcher RDAP 20/20, **siklus hidup semaphore DNS (SEM-01..SEM-06), atomicity lease global termasuk PostgreSQL di staging (LSE-01..LSE-06), uji beban konkurensi ratusan instance (R-15), penghitung orphaned + circuit breaker + pemulihan worker (ORPH-01..ORPH-06, termasuk pengulangan SEM-01..SEM-06 setelah perubahan), konfirmasi terminasi worker (TERM-01..TERM-04), crash/restart parent dan pemulihan state (PARENT-01..PARENT-02), pengulangan + rekonsiliasi SEM-R1..R6 + ORPH-T0..T5 (RECON-01), dokumentasi supervisor platform (SUP-01), aturan startup NOT_READY + validasi identitas PID + pidfile atomik + startup lock (STARTUP-01..STARTUP-09), reklamasi lock basi bersamaan di VM ini (STARTUP-10), reklamasi yang diperkeras — heartbeat bukan bukti kematian, EPERM/tidak-pasti → fail-closed, lock tak terbaca tidak pernah dihapus otomatis (RCL-01..RCL-06), durabilitas pidfile pada filesystem produksi (D-01..D-03), race reklamasi lock TERBUKTI pada kode v2.3.3 dan perbaikan flock TERUJI (ADV-01..ADV-06: ADV-T1 2 pemilik 2/2, ADV-T2/T2sim/T5/T6 4/4 × 2), semantik flock kernel pada tmpfs dan overlay (FLK-01..FLK-05: 9/9 × 2 tiap fs), binding flock + flock di NFS wajib dibuktikan di staging (FLK-06/FLK-07), otoritas flock + mixed-version + zombie liveness (AUTH-01..AUTH-16: 18/18 × 2; AUTH-T9c + SU-T1..SU-T9 NOT RUN — lihat §D.4.13)** | Semua dalam batas | Perbaiki; uji ulang dari G3 |
| G7 — Uji akhir + evaluasi ChatGPT | Seluruh hasil G0–G6 + dokumen v2.3.5 dievaluasi ChatGPT | Tidak ada keberatan P0 yang belum dijawab | Jawab keberatan; uji ulang yang terdampak |
| G8 — Cutover | Persetujuan eksplisit pemilik + ChatGPT; mitigasi (a) dicabut; scanner dibuka kembali | Semua gerbang G0–G7 lolos + tanda tangan di §D.5 v2 | Scanner TETAP nonaktif; lanjutkan perbaikan |

### H.2 Perintah dan bukti pengujian

Setiap gerbang menghasilkan laporan tertulis berisi: input, hasil yang
diharapkan, hasil aktual, dan bukti (log server uji / respons / tangkapan
status). Bukti yang diterima: log server uji yang menunjukkan 0 koneksi
untuk uji blokir; respons HTTP + body untuk uji legit; pengukuran waktu
dan memori untuk uji sumber daya. Bukti yang TIDAK diterima: "kode guard
sudah ada di file" tanpa uji perilaku; hasil uji yang hanya menguji 3 URL
acuan tanpa uji blokir.

### H.3 Rollback final (per langkah, sesuai §D.5 v2)

1. Setiap langkah = satu build terpisah; rollback = restore versi build
   sebelumnya yang lolos uji.
2. Bila suatu gerbang gagal, rollback langkah yang menyebabkannya saja —
   langkah sebelumnya yang sudah lolos tidak ikut di-rollback.
3. Rollback mitigasi (a) HANYA oleh keputusan pemilik setelah G8 lolos.
4. Bila cutover sudah terjadi dan regresi ditemukan di produksi:
   aktifkan kembali flag mitigasi (a) SEGERA (satu flag), lalu rollback
   ke build terakhir yang lolos G3–G6, lalu investigasi — jangan
   memperbaiki di produksi sambil scanner tetap terbuka.

### H.4 Kriteria "selesai" perbaikan ini

Perbaikan dinyatakan selesai bila: (a) G0–G8 lolos; (b) scanner dibuka
kembali dengan mitigasi dicabut atas persetujuan pemilik; (c) monitor
minggu pertama menunjukkan tidak ada false positive massal dan tidak ada
upaya SSRF yang lolos; (d) `SECURITY_REQUIREMENTS.md` §3.2 diperbarui
dengan status kepatuhan yang sebenarnya; (e) dokumen ini ditandai
"TERIMPLEMENTASI" dengan tanggal cutover dan tautan laporan uji.

---

## Pernyataan penutup

Dokumen ini adalah **rancangan v2.3.5 untuk dievaluasi ChatGPT** — bukan persetujuan
implementasi. **Dokumen final BUKAN berarti implementasi otomatis
disetujui** — itu dua keputusan berbeda. Status tetap: **DESIGN ACCEPTED
WITH CONDITIONS — IMPLEMENTATION NOT APPROVED**. Tidak ada kode yang
diubah, tidak ada data yang diubah, dan tidak ada akun/kredensial yang
dibuat dalam penyusunan revisi ini. Spike runtime dilakukan HANYA di
`/tmp/ssrf-spike`, `/tmp/ssrf-spike-v21`, `/tmp/ssrf-v22`, `/tmp/ssrf-v23`,
`/tmp/ssrf-v231`, `/tmp/ssrf-v232`, `/tmp/ssrf-v233`, dan `/tmp/ssrf-v234`
terhadap server/komponen lokal yang dikontrol sendiri; tidak ada akses ke
endpoint internal produksi atau metadata cloud. Semua bukti uji v2.1,
v2.2, v2.3, v2.3.1, v2.3.2, v2.3.3, dan v2.3.4 berasal dari VM ini —
BUKAN dari runtime artifact produksi.

**Gerbang yang tetap mengikat:** G0 tetap wajib dibuktikan aktif
sebelum scanner dapat dibuka kembali, dan seluruh gerbang G0–G7 wajib
lolos sebelum keputusan cutover G8. Tidak satu pun gerbang dapat
dilewati dengan alasan dokumen ini sudah "final".

Implementasi dimulai **hanya setelah**:

1. ChatGPT mengevaluasi rancangan v2.3.5 ini dan keberatannya dijawab,
2. Pemilik memberikan **persetujuan implementasi eksplisit** (keputusan D-1
   s.d. D-8 sudah disetujui 7 Nov 2026 — yang masih menunggu adalah
   persetujuan implementasi itu sendiri),
3. Uji ulang pinning di staging artifact produksi (P0-1a' / U-1) membuktikan
   pendekatan yang dipilih benar-benar bekerja di runtime produksi.

Setelah itu, implementasi mengikuti urutan §C dengan uji §D.4 di setiap langkah
dan rollback §D.5 bila regresi terjadi. Scanner tetap NONAKTIF di produksi
selama perbaikan dan hanya dibuka kembali bila SELURUH kriteria cutover
§D.5 v2 lolos.

---

*Disusun berdasarkan: `SSRF_AUDIT.md` (7 Nov 2026, status VULNERABLE),
`SSRF_SPIKE_RUNTIME.md` (7 Nov 2026 — bukti uji pinning),
`SSRF_SPIKE_V21.md` (7 Nov 2026 — bukti uji v2.1, 48/48 PASS),
`SSRF_SPIKE_V22.md` (7 Nov 2026 — bukti uji v2.2, 11/11 PASS),
`SSRF_SPIKE_V23.md` (7 Nov 2026 — bukti uji v2.3, 13/13 PASS, dijalankan
ulang 2×),
`SSRF_SPIKE_V231.md` (7 Nov 2026 — bukti uji v2.3.1, 61/61 PASS,
dijalankan ulang 2×),
`SSRF_SPIKE_V232.md` (7 Nov 2026 — bukti uji v2.3.2, 9/9 PASS,
dijalankan ulang 3×; harness disalin ke `spike-harness-v232/`),
`SSRF_SPIKE_V234.md` (7 Nov 2026 — bukti uji v2.3.4: race TERBUKTI ADV-T1 2 pemilik 3/3 × 2; perbaikan flock TERUJI 4/4 × 2; FLK 9/9 × 2 tmpfs + overlay), `SSRF_SPIKE_V235.md` (7 Nov 2026 — bukti uji v2.3.5: AUTH 18/18 PASS × 2; regresi ADV 4/4 × 2, FLK 9/9 tmpfs + overlay; AUTH-T9c + SU-T1..SU-T9 NOT RUN; harness disalin ke `spike-harness-v235/`) dan `SSRF_SPIKE_V233.md` (7 Nov 2026 — bukti uji v2.3.3: RUN=3 suite v2.3.2
9/9 PASS, regresi SU-T1..SU-T9 terhadap kode yang diperkeras 9/9 PASS
× 2, tes baru RCL-T1..T6 + SU10-T1/T2 8/8 PASS × 2; harness disalin ke
`spike-harness-v233/`),
`SECURITY_REQUIREMENTS.md`, `CLASSIFICATION.md`, dan
`src/scanner/ssrf-guard.ts` (guard fondasi, lolos uji 25/25, belum terintegrasi
ke kode live). Revisi v2 menjawab enam hal yang diminta pemilik (A–F) dan
memasukkan keputusan pemilik 7 Nov 2026 (D-1 s.d. D-8). Revisi v2.1 menjawab
enam hal evaluasi ChatGPT atas v2 (NAT64, batas dekompresi jalur Node Agent,
timeout global & DNS cancellation, TTL DNS, pencocokan RDAP ketat,
konkurensi global) tanpa mengubah satu pun keputusan D-1 s.d. D-8. Revisi
v2.2 menjawab empat tindak lanjut evaluasi akhir ChatGPT atas v2.1
(semaphore DNS, atomicity lease global, risiko NAT64 U-11, bukti mitigasi
produksi G0) tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa
mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT
APPROVED. Revisi v2.3 menjawab satu keberatan teknis atas v2.2
(akumulasi lookup orphaned akibat absolute cap — penghitung orphaned
terpisah, batas keras, circuit breaker, pemulihan worker, metrik baru)
tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status
DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi
v2.3.1 menjawab empat hal evaluasi ChatGPT atas v2.3 (konfirmasi
terminasi child process, parent crash/restart, batas lintas instance,
rekonsiliasi laporan pengujian) tanpa mengubah satu pun keputusan D-1
s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED. Revisi v2.3.2 menjawab satu klarifikasi
wajib evaluasi ChatGPT atas v2.3.1 (aturan startup parent baru pada
§A.5.5: NOT_READY yang tidak dapat dinegosiasi, validasi identitas
proses sebelum SIGKILL, pidfile atomik, startup lock) tanpa mengubah
satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN
ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.3 menjawab empat hal evaluasi ChatGPT atas v2.3.2 (konsistensi jumlah pengujian — koreksi klaim 3× dengan RUN=3 yang sesungguhnya, reklamasi startup lock yang diperkeras, pengujian STARTUP-10, dan durabilitas pidfile) tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. **Koreksi v2.3.5:** paragraf ini sebelumnya salah mengatribusikan keempat klarifikasi tersebut kepada v2.3.4; v2.3.4 sebenarnya menjawab SATU keberatan teknis evaluasi ChatGPT atas v2.3.3 (race condition pada reklamasi startup lock — §A.5.5.4) tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.5 menjawab LIMA BAGIAN permintaan pemilik atas v2.3.4 (otoritas kepemilikan flock, keamanan mixed-version, uji adversarial, kompatibilitas runtime/filesystem) tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Setelah klarifikasi ini, dokumen desain dapat dianggap final untuk masuk tahap keputusan implementasi terpisah — keputusan implementasi itu sendiri tetap menunggu pemilik.*
