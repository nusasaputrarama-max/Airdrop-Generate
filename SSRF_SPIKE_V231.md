# BUKTI PENGUJIAN v2.3.1 — Konfirmasi Terminasi Worker, Crash/Restart Parent, Batas Lintas Instance, Rekonsiliasi Laporan

**Tanggal:** 7 November 2026
**Ruang lingkup:** bukti teknis untuk revisi terbatas v2.3.1 atas
`SSRF_REMEDIATION_DESIGN.md`, menjawab empat tindak lanjut evaluasi ChatGPT
terhadap v2.3: (1) konfirmasi terminasi child process, (2) parent
crash/restart, (3) batas lintas instance, (4) rekonsiliasi laporan pengujian.
Semua tes dijalankan terhadap proses/komponen lokal yang dikontrol sendiri
di `/tmp/ssrf-v231` — **bukan** terhadap database produksi artifact,
**bukan** metadata cloud, dan **bukan** jaringan internal produksi.

**Environment:** Node v24.22.1. Semua tes memakai resolver stub / worker
lokal yang dikontrol sendiri — TIDAK ADA akses DNS nyata.

**File tes:**
- `/tmp/ssrf-v231/dns-guard-v231.cjs` — implementasi referensi v2.3.1
  (`DnsLookupSemaphore` + `DnsWorkerPool`: konfirmasi exit, breaker,
  orphaned counter)
- `/tmp/ssrf-v231/dns-worker.cjs` — DNS worker anak-proses (stub hang/ok,
  cleanup saat parent mati; mode `WORKER_STUBBORN=1` untuk PARENT-T1b)
- `/tmp/ssrf-v231/crash-parent.cjs` — proses parent untuk PARENT-T1/T2
  (pidfile, cleanup worker lama, lease global simulasi di `leases.json`)
- `/tmp/ssrf-v231/term-test.cjs` — TERM-T1..T4 (23 pemeriksaan)
- `/tmp/ssrf-v231/parent-test.cjs` — PARENT-T1a/T1b/T2 (15 pemeriksaan)
- `/tmp/ssrf-v231/recon-test.cjs` — SEM-R1..R6 + ORPH-T0..T5 (23 pemeriksaan)

**Hasil keseluruhan: 61/61 PASS** (TERM 23/23 + PARENT 15/15 + RECON 23/23),
dijalankan ulang dua kali dengan hasil yang sama (reproducible). Tidak ada
proses yatim tersisa setelah pengujian (`ps` bersih).

**Skala waktu tes vs produksi:** parameter tes sengaja diperkecil agar uji
berjalan cepat (race timeout 60 ms, absolute cap 300 ms, maxActive 2,
maxQueue 2, orphanHardCap 3, exitConfirmTimeoutMs 500 ms, TTL lease 5 dtk).
Nilai produksi yang ditetapkan di desain v2.3.1: `maxActive` 4, `maxQueue` 4,
antrean 5 dtk, race timeout 5 dtk, absolute cap 30 dtk, `orphanHardCap` 4,
threshold pemulihan 1, exit-confirm timeout 5 dtk, TTL lease 25 dtk.
Perilaku yang diuji (bukan angka absolutnya) yang dipindahkan ke produksi.

**CATATAN KEJUJURAN — harness v2.2 DAN v2.3 hilang:** file harness asli
`/tmp/ssrf-v22/` dan `/tmp/ssrf-v23/` HILANG karena `/tmp` dibersihkan antar
sesi. Semua pengujian di sini adalah IMPLEMENTASI ULANG dari spesifikasi
yang didokumentasikan di `SSRF_SPIKE_V22.md` §1 dan `SSRF_SPIKE_V23.md`
§1–§8, dijalankan terhadap implementasi referensi v2.3.1 yang ditulis
untuk revisi ini. Hasilnya adalah bukti perilaku yang sah untuk implementasi
referensi ini — tetapi BUKAN pengulangan byte-demi-byte dari file v2.2/v2.3.
Bila pengulangan eksak dari file-file itu dibutuhkan, file itu harus
ditulis ulang dari spesifikasi terdokumentasi (yang sudah dilakukan di
sini) atau dipulihkan dari riwayat versi bila ada.

---

## 1. TERM-T1..T4 — Konfirmasi terminasi child process (23/23 PASS)

Perintah: `cd /tmp/ssrf-v231 && node term-test.cjs`

Output aktual (run ke-2, identik dengan run ke-1):

```text
PASS TERM-T1a setup: orphaned=3, breaker terbuka
     orphaned=3 breakerOpen=true active=0
PASS TERM-T1b counter tidak berubah saat SIGKILL dikirim
     orphaned=3 breakerOpen=true orphanedTerminated=0
PASS TERM-T1c breaker tetap menolak selama exit belum terkonfirmasi
     kode penolakan=DNS_CIRCUIT_OPEN
PASS TERM-T1d exit terkonfirmasi (SIGKILL)
     exitConfirmed=true signal=SIGKILL code=null
PASS TERM-T1e counter berkurang HANYA setelah exit terkonfirmasi
     orphaned=0 active=0 orphanedTerminated=3
PASS TERM-T1f breaker menutup setelah exit terkonfirmasi + orphaned<=1
     breakerOpen=false
PASS TERM-T1g workerExitConfirmed tercatat
     workerExitConfirmed=1
PASS TERM-T2a tidak ada evaluasi penutupan breaker saat SIGKILL dikirim
     closeEvals=0
PASS TERM-T2b exit terkonfirmasi
     exitConfirmed=true
PASS TERM-T2c evaluasi penutupan breaker terjadi tepat 1x dan HANYA setelah exit
     closeEvals=1
PASS TERM-T2d lookup yang diajukan sebelum exit ditolak DNS_CIRCUIT_OPEN
     rejected=DNS_CIRCUIT_OPEN
PASS TERM-T2e breaker menutup setelah exit terkonfirmasi
     breakerOpen=false orphaned=0
PASS TERM-T2d lookup normal diterima setelah pemulihan
     hasil=93.184.216.34
PASS TERM-T3a setup: orphaned=3, breaker terbuka
     orphaned=3 breakerOpen=true
PASS TERM-T3b exit TIDAK terkonfirmasi dalam batas waktu
     exitConfirmed=false
PASS TERM-T3c counter TETAP setelah timeout konfirmasi
     orphaned=3 active=0 orphanedTerminated=0
PASS TERM-T3d breaker TETAP terbuka (tidak ada penutupan paksa)
     breakerOpen=true
PASS TERM-T3e workerExitUnconfirmed tercatat
     workerExitUnconfirmed=1
PASS TERM-T3f counter TETAP setelah +500 ms tanpa konfirmasi exit
     orphaned=3 breakerOpen=true
PASS TERM-T4a terminate pertama terkonfirmasi
     exitConfirmed=true opsTerminated=3
PASS TERM-T4b terminate kedua idempotent (sudah mati)
     exitConfirmed=true alreadyDead=true
PASS TERM-T4c counter tidak berubah pada terminate kedua
     orphaned=0 active=0 orphanedTerminated=3 workerExitConfirmed=1
PASS TERM-T4d tidak ada counter negatif
     {"active":0,"queued":0,"orphaned":0,"liveOps":0,"capDeferred":0,"breakerOpen":0,"breakerTrips":1,"acquired":3,"timedOut":3,"lateSettled":0,"forceReleased":3,"rejectedQueueFull":0,"queueTimedOut":0,"maxActiveObserved":2,"maxQueueObserved":0,"rejectedCircuitOpen":0,"orphanedTerminated":3,"workerRestarts":0,"orphanedHighWater":3,"workerExitConfirmed":1,"workerExitUnconfirmed":0}

TERM RESULT: 23 passed, 0 failed
```

### Yang dibuktikan

| Uji | Skenario | Hasil yang dibuktikan |
| --- | --- | --- |
| TERM-T1 | SIGKILL ke worker dengan 3 lookup orphaned, breaker terbuka | Counter (`orphaned=3`, `orphanedTerminated=0`) TIDAK berubah pada pemeriksaan sinkron segera setelah `kill()` kembali; lookup yang diajukan di tick yang sama ditolak `DNS_CIRCUIT_OPEN`; setelah event `exit` (`signal=SIGKILL`, `code=null`) counter turun (`orphaned=0`, `orphanedTerminated=3`), breaker menutup, `workerExitConfirmed=1` |
| TERM-T2 | Urutan pembukaan breaker | Pemanggilan `_maybeCloseBreaker()` dihitung: **0×** saat SIGKILL dikirim, tepat **1×** dan hanya setelah event `exit`; lookup sebelum exit ditolak; breaker menutup setelah exit; worker baru melayani lookup normal (`93.184.216.34`) |
| TERM-T3 | Exit tidak pernah terkonfirmasi (worker palsu: `kill()` no-op, tidak pernah `exit`) | Setelah timeout konfirmasi 300 ms: `exitConfirmed=false`; counter TETAP (`orphaned=3`, `orphanedTerminated=0`); breaker TETAP terbuka; `workerExitUnconfirmed=1`; setelah +500 ms tambahan tetap tidak ada pengurangan paksa |
| TERM-T4 | Terminate ganda / worker sudah mati | Terminate kedua idempotent (`alreadyDead=true`); tidak ada counter yang berubah atau negatif |

### Catatan implementasi yang dibuktikan TERM-T1b/T1c

Pemeriksaan T1b/T1c dilakukan **sinkron di tick yang sama** dengan
pengiriman SIGKILL — sebelum event loop sempat memproses event `exit`.
Inilah satu-satunya cara yang deterministik untuk membuktikan "counter
tidak berubah saat sinyal dikirim": pemeriksaan apa pun yang memakai
`await` (termasuk `await sleep(...)`) memberi kesempatan event `exit`
tiba lebih dulu dan akan mengaburkan hasil. Aturan yang sama berlaku
untuk kode produksi: pengujian urutan kill-vs-exit harus sinkron di tick
yang sama, bukan berbasis timer.

---

## 2. PARENT-T1a/T1b/T2 — Parent crash/restart (15/15 PASS)

Perintah: `cd /tmp/ssrf-v231 && node parent-test.cjs`

Output aktual (run ke-2, identik dengan run ke-1):

```text
PASS PARENT-T1a parent + worker hidup
     parentPid=2492 workerPid=2500
PASS PARENT-T1a worker lama mati setelah parent di-SIGKILL (tidak yatim)
     workerPid=2500 masih hidup=false
PASS PARENT-T1a worker mencatat alasan keluar (disconnect / ppid-watchdog)
     alasan=disconnect
PASS PARENT-T1a request yang sedang berjalan gagal fail-closed (tanpa vonis)
     status lookup=PENDING
PASS PARENT-T1b worker stubborn TETAP HIDUP setelah parent mati (bahaya yatim nyata)
     oldWorkerPid=2521 masih hidup=true
PASS PARENT-T1b parent baru mendeteksi worker lama masih hidup dan membunuhnya
     cleanup={"found":true,"wasAlive":true,"killed":true,"pid":2521,"waitedMs":51}
PASS PARENT-T1b worker lama mati setelah cleanup parent baru
     oldWorkerPid=2521 masih hidup=false
PASS PARENT-T1b worker baru berbeda dari worker lama
     workerPid baru=2540 lama=2521
PASS PARENT-T1b worker baru melayani lookup normal
     hasil=93.184.216.34
PASS PARENT-T2a parent pertama mengakuisisi 1 lease global
     liveLeases=1
PASS PARENT-T2b lease tertulis di store bersama (bertahan di luar proses)
     leases=[{"id":"lease-2548","acquiredAt":1794052289889,"expiresAt":1794052294889}]
PASS PARENT-T2c parent baru MELIHAT lease parent mati yang masih hidup (state global bertahan)
     liveLeases=2 (1 dari parent mati + 1 milik sendiri)
PASS PARENT-T2d parent baru memakai worker segar (state in-memory dibangun dari nol)
     workerPid baru=2572 lama=2556
PASS PARENT-T2e lease parent mati kedaluwarsa sendiri (TTL membersihkan slot)
     lease hidup setelah TTL=0
PASS PARENT-T2f tidak ada proses yatim tersisa setelah tes
     parent1=false worker1=false parent2=false worker2=false

PARENT RESULT: 15 passed, 0 failed
```

### Yang dibuktikan

| Uji | Skenario | Hasil yang dibuktikan |
| --- | --- | --- |
| PARENT-T1a | Parent di-SIGKILL saat worker menjalankan lookup menggantung | Worker normal mati dalam 2 dtk (alasan tercatat: `disconnect`); request yang sedang berjalan tidak pernah kembali (fail-closed, tanpa vonis) |
| PARENT-T1b | Worker stubborn (tanpa cleanup) + parent baru | Worker lama TETAP HIDUP 1 dtk setelah parent mati (bahaya yatim NYATA); parent baru mendeteksi pid lama hidup lewat pidfile, SIGKILL + konfirmasi exit (`waitedMs=51`), lalu worker baru (pid berbeda) melayani lookup normal |
| PARENT-T2 | Pemulihan state | Lease global dari parent mati terlihat oleh parent baru (`liveLeases=2`); state in-memory dibangun dari nol (worker pid baru); lease kedaluwarsa sendiri setelah TTL; tidak ada proses yatim tersisa |

### Temuan jujur selama pengujian PARENT-T1b (kegagalan run pertama)

Run pertama PARENT-T1b **GAGAL** (2 pemeriksaan): worker "stubborn"
ternyata mati sendiri setelah parent di-SIGKILL, meskipun handler
`disconnect` dan watchdog ppid dimatikan. Penyebab: worker tidak
memegang handle aktif apa pun — saat channel IPC tertutup, event loop
Node kosong dan proses keluar sendiri. Artinya skenario yatim TIDAK
DAPAT direproduksi tanpa handle aktif. Perbaikan harness (bukan
perbaikan implementasi): worker stubborn kini memegang interval ref'd
sebagai simulasi handle native c-ares yang tertunda — lookup DNS nyata
yang menggantung memang menahan event loop (handle c-ares aktif).
Setelah perbaikan, T1b lolos: worker lama terbukti tetap hidup dan
cleanup parent baru terbukti bekerja. Kegagalan run pertama ini
didokumentasikan di sini (bukan disembunyikan) karena ia membuktikan
satu hal penting: **worker yang tidak memegang lookup aktif tidak bisa
menjadi yatim** — bahaya yatim hanya nyata bila worker sedang
menjalankan operasi yang menahan event loop, persis kondisi yang
disimulasikan interval ref'd.

### Mekanisme supervisor yang dirancang (bukan hanya yang diuji)

Pengujian di atas membuktikan dua lapis pertahanan di dalam proses:
(1) worker keluar sendiri saat parent mati (`disconnect` + watchdog
ppid); (2) parent baru membersihkan worker lama lewat pidfile. Lapis
ketiga — supervisor eksternal — TIDAK dapat diuji di VM ini karena
runtime artifact produksi tidak menyediakan supervisor yang dapat
diperiksa: apakah platform me-restart proses layanan saat crash, dan
apakah ia membunuh seluruh process group (termasuk anak) atau hanya
proses utama, TIDAK TERDOKUMENTASI. Karena itu desain v2.3.1 menetapkan
sebagai persyaratan staging (U-22): supervisor platform HARUS
membunuh process group saat crash; bila tidak dapat dibuktikan,
pidfile cleanup + worker self-exit adalah satu-satunya pertahanan dan
harus diuji ulang di staging produksi. Tanpa bukti supervisor, klaim
"tidak ada yatim" hanya berlaku sejauh dua lapis yang teruji di sini.

---

## 3. Batas lintas instance — perhitungan worst-case (U-18)

Batas 8 operasi hidup (`maxActive + orphanHardCap`) adalah batas
**PER PROSES**, bukan batas global platform. Perhitungannya:

- Per proses: `liveOps ≤ maxActive + orphanHardCap = 4 + 4 = 8`
  (nilai produksi; skala tes: 2 + 3 = 5).
- Lintas instance: `liveOps_total ≤ N × 8`, dengan N = jumlah instance.
  Contoh: N = 10 → ≤ 80; N = 100 → ≤ 800 operasi DNS hidup.

Hubungan dengan `scan_leases` global (batas 5 pemeriksaan bersamaan):

- `scan_leases` membatasi **pemeriksaan** yang berjalan bersamaan
  (maks 5 di seluruh platform). Setiap pemeriksaan menjalankan lookup
  DNS secara sekuensial (satu per satu: URL awal → tiap hop redirect →
  RDAP), jadi satu pemeriksaan menahan maksimal **1** lookup aktif
  pada satu waktu.
- TETAPI `scan_leases` TIDAK membatasi akumulasi orphaned: lease
  dilepas saat pemeriksaan selesai (pemanggil menerima `DNS_TIMEOUT`),
  sementara lookup DNS-nya tetap hidup sebagai orphaned di proses
  tersebut. Orphaned terakumulasi dari pemeriksaan yang SUDAH SELESAI,
  bukan dari pemeriksaan yang sedang berjalan — sehingga batas 5
  pemeriksaan tidak mengikat jumlah orphaned.
- Karena itu worst-case lintas instance adalah **8N**, bukan 5.
  Contoh jujur: 100 instance × 8 = **800 operasi DNS hidup** — semuanya
  lookup yang menggantung pada resolver yang tidak kooperatif.

Alasan batas global orphaned belum masuk P0:

1. Butuh store bersama (seperti `scan_leases`) dengan increment/decrement
   atomik lintas proses — tetapi decrement membutuhkan pengetahuan
   kapan lookup di proses LAIN settle, yang hanya bisa diketahui lewat
   heartbeat atau lease-TTL pada entri orphaned. Ini menambah satu
   mekanisme state terdistribusi baru (dengan failure mode-nya sendiri:
   DB down → seluruh DNS fail-closed, lihat U-14).
2. Batas per proses (8) + breaker per proses + restart worker + metrik
   dan alert (`forceReleased > 0` → page) sudah membatasi kerusakan per
   instance dan membuat kondisi abnormal langsung terlihat operator.
3. Akumulasi orphaned mensyaratkan resolver yang menggantung — kondisi
   abnormal yang di-page, bukan kondisi operasi normal.

Syarat agar batas global orphaned masuk fase berikutnya (P2): (a) store
bersama dengan TTL-lease pada entri orphaned teruji di staging di bawah
beban multi-instance (R-15 diperluas); (b) failure mode store-nya
terdokumentasi (apa yang terjadi saat store down — fail-closed atau
fallback ke batas per proses); (c) keputusan eksplisit pemilik. Sampai
syarat itu terpenuhi, U-18 TETAP TERBUKA dengan angka worst-case 8N di
atas sebagai risiko yang diterima sementara.

---

## 4. Rekonsiliasi laporan pengujian — SEM-R6 vs ORPH-T0

### 4.1 Temuan: anotasi blok output v2.3 bergeser satu baris

Blok output `SSRF_SPIKE_V23.md` ("Output aktual lengkap") memuat dua
baris anotasi yang posisinya tidak cocok dengan isi bagian §2/§3
dokumen yang sama:

```text
PASS SEM-R6 bentuk metrik
  (kontrol: orphaned akhir=6, live maks=6 — keberatan TERBUKTI nyata)
PASS ORPH-T0 kontrol v2.2: tanpa batas orphaned, operasi hidup tumbuh tiap siklus
  (live maks=4, orphaned maks=3, started=4)
PASS ORPH-T1 gelombang berulang: live ops dan orphaned tetap berbatas
```

Sementara isi bagian dokumen tersebut menyatakan:

- **§2 ORPH-T0** (kontrol tanpa batas, 3 gelombang × 2 lookup menggantung):
  orphaned tumbuh 2→4→6, live maks = 6.
- **§3 ORPH-T1** (dengan batas cap 3, 3 gelombang × 2): orphaned maks = 3,
  live maks = 4, started = 4.

Anotasi `(kontrol: orphaned akhir=6, live maks=6)` di bawah SEM-R6
menjelaskan ORPH-T0, bukan SEM-R6 (SEM-R6 adalah uji bentuk metrik —
tidak ada gelombang lookup di dalamnya). Anotasi
`(live maks=4, orphaned maks=3, started=4)` di bawah ORPH-T0
menjelaskan ORPH-T1, bukan ORPH-T0. Dengan kata lain: **anotasi
parenthesis pada blok output bergeser satu baris ke atas** — setiap
anotasi menjelaskan skenario pada baris BERIKUTNYA, bukan barisnya
sendiri. Isi bagian §2/§3 adalah yang benar; blok output-nya yang
salah letak anotasinya.

### 4.2 Verifikasi ulang: angka aktual hasil pengulangan v2.3.1

Pengulangan ORPH-T0 dan ORPH-T1 terhadap implementasi referensi v2.3.1
(konfigurasi identik: maxActive=2, maxQueue=2, race=60 ms, cap=300 ms,
orphanHardCap=3) menghasilkan:

```text
ORPH-T0 (kontrol tanpa batas, 3 gelombang x 2): orphaned akhir=6, live maks=6, started=6
ORPH-T1 (batas cap 3, 3 gelombang x 2): orphaned maks=3, live maks=4, started=4
```

Angka-angka ini **identik** dengan isi §2/§3 `SSRF_SPIKE_V23.md` dan
**berbeda** dari penempatan anotasi pada blok output-nya. Kesimpulan:
teks bagian §2/§3 benar; anotasi blok output bergeser satu baris.
Tidak ada angka yang diubah agar terlihat cocok — pengulangan di atas
adalah hasil aktual dari konfigurasi yang sama.

### 4.3 Temuan kedua: jumlah kunci metrik SEM-R6 ("5 kunci baru" vs 7)

`SSRF_SPIKE_V23.md` §1 (SEM-R6) menyatakan "19 kunci metrik numerik,
termasuk 5 kunci baru v2.3" — tetapi daftar yang ditulis setelahnya
memuat **7** kunci: `orphaned`, `orphanedHighWater`, `breakerOpen`,
`rejectedCircuitOpen`, `breakerTrips`, `workerRestarts`,
`orphanedTerminated`. Angka "5" adalah kesalahan tulis; seharusnya "7".
Total 19 tetap benar dengan perhitungan: 10 kunci v2.2 (SEM-T6) + 7 kunci
baru v2.3 + 2 gauge turunan yang didefinisikan di desain (`liveOps`,
`capDeferred`) = **19**. Pengulangan SEM-R6 di sini menghitung **21
kunci** = 19 kunci v2.3 + 2 kunci baru v2.3.1 (`workerExitConfirmed`,
`workerExitUnconfirmed`). Daftar lengkap 21 kunci tercantum pada output
SEM-R6 di §5.

### 4.4 Tabel rekonsiliasi — semua skenario, konfigurasi, dan hasil aktual

Konfigurasi skala tes (semua suite): maxActive=2, maxQueue=2, race=60 ms,
cap=300 ms, queueWait=500 ms, orphanHardCap=3 (kecuali dinyatakan lain),
threshold pemulihan=1. Nilai produksi berbeda (lihat desain §A.5.4).

| Skenario | Sumber | Konfigurasi khusus | Hasil aktual |
| --- | --- | --- | --- |
| SEM-01 | V22 §1 (SEM-T1) | lookup lambat 3000 ms, race 100 ms | Slot tetap terpakai setelah race timeout; dilepas saat settle; `lateSettled=1` |
| SEM-02 | V22 §1 (SEM-T2) | 4 slot + 2 waiter + 1 waiter ke-3 | Waiter ke-3 `DNS_QUEUE_FULL`; FIFO berjalan; counter kembali 0 |
| SEM-03 | V22 §1 (SEM-T3) | banjir 20, resolver 2000 ms, race 50 ms, maxActive 4 | Lookup dimulai 6 (4+2); `maxActiveObserved`=4; `lateSettled`=6 |
| SEM-04 | V22 §1 (SEM-T4) | maxActive 1, maxQueue 1, queueWait 300 ms | Waiter `DNS_QUEUE_TIMEOUT`; `queueTimedOut=1` |
| SEM-05 | V22 §1 (SEM-T5) | lookup tak pernah settle, race 100 ms, cap 800 ms | `forceReleased=1`; slot direbut dan dapat dipakai lagi |
| SEM-06 | V22 §1 (SEM-T6) | — | 10 kunci metrik numerik |
| SEM-R1 | V23 §1 = V231 §5 | lookup 200 ms vs race 60 ms | `DNS_TIMEOUT` @60 ms; active=1 @120 ms; active=0 + `lateSettled=1` setelah settle |
| SEM-R2 | V23 §1 = V231 §5 | 2 holder + 2 waiter + 1 waiter ke-3 | Waiter ke-3 `DNS_QUEUE_FULL`; FIFO berjalan; counter kembali 0 |
| SEM-R3 | V23 §1 = V231 §5 | banjir 20, resolver 200 ms | Dimulai total 4 (2+2 dari antrean); `maxActiveObserved`=2; 16 ditolak antrean penuh; counter kembali 0 |
| SEM-R4 | V23 §1 = V231 §5 | maxActive 1, maxQueue 1, queueWait 150 ms | Waiter `DNS_QUEUE_TIMEOUT`; `queueTimedOut=1`; queued=0 |
| SEM-R5 | V23 §1 = V231 §5 | lookup tak pernah settle, cap 300 ms | `forceReleased=1`; active=0; orphaned=1 |
| SEM-R6 | V23 §1 = V231 §5 | bentuk metrik | v2.3: 19 kunci (10+7+liveOps+capDeferred); v2.3.1: 21 kunci (+workerExitConfirmed, +workerExitUnconfirmed) |
| ORPH-T0 | V23 §2 = V231 §5 | **tanpa batas orphaned**, 3 gelombang × 2 | orphaned akhir=**6**, live maks=**6**, started=6 (anotasi blok output v2.3 yang menempatkan angka ini di bawah SEM-R6 adalah salah letak — lihat §4.1) |
| ORPH-T1 | V23 §3 = V231 §5 | cap 3, 3 gelombang × 2 | orphaned maks=**3**, live maks=**4**, started=**4** (anotasi blok output v2.3 yang menempatkan angka ini di bawah ORPH-T0 adalah salah letak — lihat §4.1) |
| ORPH-T2 | V23 §4 = V231 §5 | breaker terbuka (orphaned=3) | Ditolak `DNS_CIRCUIT_OPEN` instan (<50 ms); 0 lookup baru |
| ORPH-T3 | V23 §5 = V231 §5 | settle satu per satu (D1–D4) | Reclaim cap-deferred tidak membuka breaker diam-diam; breaker menutup hanya saat orphaned≤1; gelombang kedua tetap berbatas |
| ORPH-T4 | V23 §6 = V231 §5 | kill worker (2 orphaned) | `SIGKILL` → orphaned 2→0, breaker menutup, worker baru melayani (`93.184.216.34`) |
| ORPH-T4b | V23 §7 | worker thread terminate | Thread berhenti 2–3 ms, TETAPI ditolak sebagai pengganti isolasi proses |
| ORPH-T5 | V23 §8 = V231 §5 | metrik | orphaned=3, highWater=3, forceReleased=3, breakerTrips=1, breakerOpen=1 |
| TERM-T1 | V231 §1 | worker, 3 orphaned, breaker terbuka | Counter tidak berubah saat SIGKILL dikirim; turun hanya setelah event `exit` |
| TERM-T2 | V231 §1 | sama | Evaluasi penutupan breaker 0× saat kill, tepat 1× setelah exit |
| TERM-T3 | V231 §1 | worker palsu (tidak pernah exit) | Counter tetap, breaker tetap terbuka, `workerExitUnconfirmed=1` |
| TERM-T4 | V231 §1 | terminate ganda | Idempotent; tidak ada counter negatif |
| PARENT-T1a | V231 §2 | parent SIGKILL, worker normal | Worker mati (`disconnect`); request in-flight fail-closed tanpa vonis |
| PARENT-T1b | V231 §2 | worker stubborn + parent baru | Worker lama tetap hidup; parent baru membunuhnya via pidfile (`waitedMs=51`); worker baru melayani |
| PARENT-T2 | V231 §2 | restart parent, TTL lease 5 dtk | Lease parent mati terlihat parent baru; state in-memory dari nol; lease kedaluwarsa sendiri |

Catatan atas tabel: SEM-01..SEM-06 adalah hasil v2.2 dari
`SSRF_SPIKE_V22.md` (harness asli hilang — tidak dapat diulang
byte-demi-byte; SEM-R1..R6 adalah implementasi ulang dari spesifikasinya).
SEM-R1..R6 dan ORPH-T0..T5 pada kolom "V231 §5" adalah hasil pengulangan
v2.3.1 terhadap implementasi referensi baru; angka-angkanya sama dengan
laporan v2.3 kecuali penempatan anotasi blok output yang dikoreksi di §4.1.

---

## 5. Hasil pengulangan SEM-R1..R6 + ORPH-T0..T5 (23/23 PASS)

Perintah: `cd /tmp/ssrf-v231 && node recon-test.cjs`

Output aktual lengkap (run ke-2, identik dengan run ke-1):

```text
PASS SEM-R1 slot tetap terpakai setelah race timeout, dilepas saat settle
     outcome=REJECTED:DNS_TIMEOUT active@120ms=1 active akhir=0 lateSettled=1
PASS SEM-R2 waiter ke-3 ditolak DNS_QUEUE_FULL
     third=DNS_QUEUE_FULL rejectedQueueFull=1
PASS SEM-R2 antrean FIFO berjalan, active/queued kembali 0
     active=0 queued=0
PASS SEM-R3 total lookup yang dimulai = 4 (2 awal + 2 dari antrean; 16 ditolak antrean penuh)
     started total=4
PASS SEM-R3 banjir 20 request: lookup yang dimulai berbatas (<= maxActive+maxQueue)
     started@100ms=2 maxActiveObserved=2
PASS SEM-R3 semua request terjawab dan counter kembali 0
     active=0 queued=0
PASS SEM-R4 waiter antrean timeout dan keluar dari antrean
     waiter=DNS_QUEUE_TIMEOUT queueTimedOut=1 queued=0
PASS SEM-R5 lookup tak pernah settle direbut absolute cap
     outcome=DNS_TIMEOUT forceReleased=1 active=0 orphaned=1
PASS SEM-R6 bentuk metrik: 19 kunci v2.3 hadir (10 v2.2 + 7 baru + liveOps + capDeferred)
     jumlah kunci=21 (19 kunci v2.3 + 2 kunci baru v2.3.1: workerExitConfirmed, workerExitUnconfirmed); hilang=tidak ada
     kunci: acquired, active, breakerOpen, breakerTrips, capDeferred, forceReleased, lateSettled, liveOps, maxActiveObserved, maxQueueObserved, orphaned, orphanedHighWater, orphanedTerminated, queueTimedOut, queued, rejectedCircuitOpen, rejectedQueueFull, timedOut, workerExitConfirmed, workerExitUnconfirmed, workerRestarts
PASS ORPH-T0 kontrol v2.2: orphaned tumbuh tanpa batas (2->4->6)
     orphaned akhir=6 live maks=6 started=6
PASS ORPH-T1 gelombang berulang DENGAN batas: orphaned<=3, live<=5
     orphaned maks=3 live maks=4 started=4
PASS ORPH-T2a setup: breaker terbuka
     breakerOpen=true
PASS ORPH-T2b request ditolak DNS_CIRCUIT_OPEN instan, 0 lookup baru
     kode=DNS_CIRCUIT_OPEN durasi=0ms acquired=4 (sebelum=4)
PASS ORPH-T3a setup: orphaned=3, breaker terbuka, 1 cap-deferred
     orphaned=3 breakerOpen=true capDeferred=1
PASS ORPH-T3b reclaim cap-deferred tidak membuka breaker diam-diam
     orphaned=3 breakerOpen=true capDeferred=0
PASS ORPH-T3c breaker tetap terbuka saat orphaned=2 (> threshold 1)
     orphaned=2 breakerOpen=true
PASS ORPH-T3d breaker menutup hanya saat orphaned<=1
     orphaned=1 breakerOpen=false
PASS ORPH-T3e gelombang kedua tetap berbatas (orphaned<=3, live<=5)
     orphaned=2 liveOps=2
PASS ORPH-T4a setup: orphaned=2 (worker)
     orphaned=2
PASS ORPH-T4b SIGKILL menghentikan operasi (exit terkonfirmasi)
     exitConfirmed=true signal=SIGKILL opsTerminated=2
PASS ORPH-T4c orphaned kembali 0, breaker menutup
     orphaned=0 breakerOpen=false
PASS ORPH-T4d worker baru melayani lookup normal
     ready=true hasil=93.184.216.34
PASS ORPH-T5 metrik sesuai prediksi state machine
     orphaned=3 highWater=3 forceReleased=3 breakerTrips=1 breakerOpen=1

--- ANGKA REKONSILIASI (konfigurasi: maxActive=2, maxQueue=2, race=60ms, cap=300ms, orphanHardCap=3) ---
ORPH-T0 (kontrol tanpa batas, 3 gelombang x 2): orphaned akhir=6, live maks=6, started=6
ORPH-T1 (batas cap 3, 3 gelombang x 2): orphaned maks=3, live maks=4, started=4

RECON RESULT: 23 passed, 0 failed
```

Perbedaan konfigurasi yang perlu dicatat jujur (SEM-R3): laporan v2.2
(SEM-T3) memakai maxActive=4 sehingga total lookup yang dimulai adalah
6 (4+2); pengulangan v2.3.1 memakai skala tes v2.3 (maxActive=2)
sehingga totalnya 4 (2+2). Perilaku yang dibuktikan sama — lookup yang
dimulai tidak pernah melebihi `maxActive + maxQueue` — hanya angka
absolutnya berbeda karena konfigurasi berbeda. Ini BUKAN ketidakcocokan
hasil; ini perbedaan parameter yang didokumentasikan.

---

## 6. Yang TIDAK diuji di sini (dinyatakan jujur)

- **Runtime artifact produksi:** semua bukti berasal dari Node v24.22.1
  di VM ini. Perilaku timer/event-loop/IPC/`AbortSignal`/exit event di
  runtime artifact produksi belum terbukti — uji ulang staging (U-1,
  U-12, U-15, U-16) tetap wajib.
- **DNS resolver sungguhan:** tes memakai resolver stub. Perilaku
  resolver sistem nyata (c-ares) saat menggantung — apakah ia
  benar-benar tidak pernah settle, atau akhirnya timeout sendiri —
  tidak diuji di sini. Worker kill menutup celah ini: apa pun perilaku
  resolvernya, kematian proses mengakhirinya.
- **Supervisor eksternal:** tidak ada supervisor platform yang dapat
  diperiksa di VM ini (lihat §2). Perilaku supervisor produksi
  (restart proses, kill process group) belum terbukti — U-22.
- **Beban ratusan instance:** tes memakai satu proses (ditambah 8 proses
  pada LSE-T1 v2.2). Perilaku orphaned/breaker per proses di bawah
  ratusan instance (U-17) belum diuji; batas global antar instance
  tetap dipegang oleh lease `scan_leases`, bukan oleh breaker ini.
- **PostgreSQL:** tidak tersedia di environment ini; mekanisme lease
  PostgreSQL tetap belum teruji (wajib di staging, gerbang G6).

---

**Status dokumen:** bukti ini adalah lampiran evaluasi akhir. Status
proyek tetap: **DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT
APPROVED**. Tidak ada kode artifact, database produksi, atau production
build yang diubah dalam penyusunan bukti ini.
