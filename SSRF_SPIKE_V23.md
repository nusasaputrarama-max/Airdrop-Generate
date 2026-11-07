# BUKTI PENGUJIAN v2.3 — Orphaned DNS, Circuit Breaker, Pemulihan Worker

**Tanggal:** 7 November 2026
**Ruang lingkup:** bukti teknis untuk revisi terbatas v2.3 atas
`SSRF_REMEDIATION_DESIGN.md`, menjawab satu keberatan: absolute cap DNS
berpotensi membuka akumulasi lookup yang tidak pernah settle. Semua tes
dijalankan terhadap komponen lokal yang dikontrol sendiri di `/tmp/ssrf-v23`
— **bukan** terhadap database produksi artifact, **bukan** metadata cloud,
dan **bukan** jaringan internal produksi.

**Environment:** Node v24.22.1, Bun 1.4.4 tersedia. Semua tes memakai
resolver stub yang dikontrol sendiri (deferred / hang / lambat) — TIDAK ADA
akses ke DNS nyata.

**File tes:**
- `/tmp/ssrf-v23/dns-guard-v23.cjs` — implementasi referensi
  `DnsLookupSemaphore` v2.3 (penghitung slot vs orphaned terpisah, batas
  keras orphaned, circuit breaker, `terminateAllWorkerOps`)
- `/tmp/ssrf-v23/dns-worker.cjs` — DNS worker anak-proses (stub hang/ok)
- `/tmp/ssrf-v23/sem-orphan-test.cjs` — 13 uji (SEM-R1..SEM-R6, ORPH-T0..T5)

**Hasil keseluruhan: 13/13 PASS**, dijalankan ulang dua kali dengan hasil
yang sama (reproducible). Perintah:

```bash
cd /tmp/ssrf-v23 && node sem-orphan-test.cjs
```

Output aktual lengkap (run ke-2, identik dengan run ke-1):

```text
PASS SEM-R1 lookup lambat vs race timeout, slot dilepas hanya saat settle
PASS SEM-R2 antrean penuh menolak langsung, FIFO berjalan
PASS SEM-R3 banjir 20 request: lookup yang dimulai berbatas
PASS SEM-R4 waiter antrean kehabisan waktu
PASS SEM-R5 lookup tak pernah settle direbut absolute cap
PASS SEM-R6 bentuk metrik
  (kontrol: orphaned akhir=6, live maks=6 — keberatan TERBUKTI nyata)
PASS ORPH-T0 kontrol v2.2: tanpa batas orphaned, operasi hidup tumbuh tiap siklus
  (live maks=4, orphaned maks=3, started=4)
PASS ORPH-T1 gelombang berulang: live ops dan orphaned tetap berbatas
PASS ORPH-T2 breaker terbuka: request ditolak instan, 0 lookup baru dimulai
PASS ORPH-T3 pemulihan: settle menurunkan orphaned, breaker menutup, gelombang kedua tetap berbatas
PASS ORPH-T4 worker di-kill: orphaned kembali 0, breaker menutup, worker baru melayani
  (worker thread terminate: 3 ms, code=1 — penghentian thread TERBUKTI, tetapi thread berbagi memori/resolver proses induk, jadi BUKAN pengganti isolasi proses untuk DNS)
PASS ORPH-T4b worker thread di-terminate: thread benar-benar berhenti
PASS ORPH-T5 metrik: orphaned aktif, total force-release, high-water mark

ALL V2.3 TESTS PASSED
```

**Skala waktu tes vs produksi:** parameter tes sengaja diperkecil agar uji
berjalan cepat (race timeout 60 ms, absolute cap 300 ms, antrean 500 ms,
`maxActive` 2, `maxQueue` 2, `orphanHardCap` 3, threshold pemulihan 1).
Nilai produksi yang ditetapkan di desain v2.3: `maxActive` 4, `maxQueue` 4,
antrean 5 dtk, race timeout 5 dtk, absolute cap 30 dtk, `orphanHardCap` 4,
threshold pemulihan 1. Perilaku yang diuji (bukan angka absolutnya) yang
dipindahkan ke produksi.

**CATATAN KEJUJURAN — harness v2.2 hilang:** file harness asli v2.2
(`/tmp/ssrf-v22/semaphore-test.cjs`) HILANG karena `/tmp` dibersihkan antar
sesi. Uji SEM-R1..SEM-R6 di sini adalah IMPLEMENTASI ULANG dari spesifikasi
yang didokumentasikan di `SSRF_SPIKE_V22.md` §1 (bukan file asli),
dijalankan terhadap implementasi referensi v2.3. Hasilnya adalah bukti
perilaku yang sah untuk implementasi referensi ini — tetapi BUKAN
pengulangan byte-demi-byte dari file v2.2. Bila pengulangan eksak dari
file v2.2 dibutuhkan, file itu harus ditulis ulang dari spesifikasi
terdokumentasi (yang sudah dilakukan di sini) atau dipulihkan dari
riwayat versi bila ada.

---

## 1. Pengulangan SEM-01..SEM-06 (v2.2) — 6/6 PASS

| Uji | Skenario | Hasil yang dibuktikan |
| --- | --- | --- |
| SEM-R1 | Lookup 300 ms vs race timeout 60 ms | Pemanggil `DNS_TIMEOUT` pada ~60 ms; slot tetap terpakai pada +120 ms dan +200 ms; dilepas hanya saat underlying settle (~300 ms); `lateSettled=1` |
| SEM-R2 | 2 holder + 2 waiter + 1 waiter ke-3 | Waiter ke-3 ditolak `DNS_QUEUE_FULL`; holder `DNS_TIMEOUT` bagi pemanggil (150 ms > 60 ms) tetapi underlying settle dan slot dilepas; waiter FIFO mendapat slot dan selesai `ok` |
| SEM-R3 | Banjir 20 request, resolver 200 ms | Lookup yang dimulai ≤ 4 (`maxActive+maxQueue`); `maxActiveObserved` tidak pernah > 2; semua request terjawab (timeout atau queue-full); `active` kembali 0 |
| SEM-R4 | Waiter antrean timeout 150 ms | Waiter ditolak `DNS_QUEUE_TIMEOUT`; `queueTimedOut=1`; waiter keluar dari antrean |
| SEM-R5 | Lookup tak pernah settle, cap 300 ms | `forceReleased=1`; slot direbut (`active=0`); operasi dihitung `orphaned=1`; slot yang direbut bisa dipakai lookup berikutnya |
| SEM-R6 | Bentuk metrik | 19 kunci metrik numerik, termasuk 5 kunci baru v2.3 (`orphaned`, `orphanedHighWater`, `breakerOpen`, `rejectedCircuitOpen`, `breakerTrips`, `workerRestarts`, `orphanedTerminated`) |

## 2. ORPH-T0 — Kontrol: perilaku v2.2 TANPA batas orphaned (keberatan TERBUKTI)

Implementasi referensi dijalankan dengan `orphanCapEnabled: false`
(perilaku v2.2: force-release selalu merebut slot). Tiga gelombang × 2
lookup menggantung, masing-masing melewati absolute cap 300 ms:

- Gelombang 1 → `orphaned = 2`; gelombang 2 → `orphaned = 4`;
  gelombang 3 → `orphaned = 6`; live ops maks = 6 dan **terus bertambah
  2 per siklus tanpa batas**.
- **Kesimpulan: keberatan itu NYATA.** Tanpa batas orphaned, setiap siklus
  force-release menambah operasi DNS yang masih hidup. SEM-T5 v2.2 hanya
  membuktikan satu lookup dapat direbut — ia tidak membuktikan akumulasi
  berulang berbatas. Inilah yang diperbaiki v2.3.

## 3. ORPH-T1 — Gelombang berulang DENGAN batas orphaned

Tiga gelombang × 2 lookup menggantung, `orphanHardCap = 3`, threshold 1,
sampling live ops tiap 15 ms:

- `orphaned` maks = **3** (tidak pernah melewati cap);
- live ops (`active + orphaned`) maks = **4** (tidak pernah melewati
  `maxActive + cap = 5`);
- lookup yang dimulai = **4** (2 gelombang); gelombang ke-3 ditolak
  breaker;
- `orphaned` akhir tepat di cap 3; breaker terbuka.

**Membuktikan (a):** jumlah operasi DNS yang masih hidup tidak melewati
batas keras, berapa pun gelombang force-release yang terjadi.

## 4. ORPH-T2 — Breaker menolak request baru, 0 lookup baru dimulai

Setelah `orphaned` mencapai cap 3 dan breaker terbuka:

- acquire berikutnya ditolak `DNS_CIRCUIT_OPEN` dalam < 50 ms (instan);
- jumlah lookup underlying yang dimulai TIDAK bertambah selama breaker
  terbuka;
- `rejectedCircuitOpen` tercatat.

**Membuktikan (b):** request berikutnya ditolak ketika batas tercapai, dan
penolakan itu tidak memulai operasi DNS baru apa pun.

## 5. ORPH-T3 — Pemulihan lewat settle + gelombang kedua tetap berbatas

Empat deferred resolver (D1–D4), diselesaikan satu per satu:

- Setelah cap: `orphaned = 3`, breaker terbuka, D4 cap-deferred
  (slotnya tetap terpakai — TIDAK direbut karena sudah di cap).
- Settle D1 → `orphaned` 3→2, lalu D4 yang cap-deferred DIREBUT
  (orphaned 2→3, breaker tetap terbuka). Ini perilaku yang benar:
  reclaim yang tertunda tidak boleh membuka breaker secara diam-diam.
- Settle D2 → `orphaned = 2`, breaker tetap terbuka (2 > threshold 1).
- Settle D3 → `orphaned = 1`, breaker **MENUTUP** (1 ≤ threshold 1);
  lookup baru diterima lagi (`ok`).
- Gelombang kedua (2 lookup menggantung): `orphaned` maks tetap 3,
  live ops tetap ≤ 5.

**Membuktikan (c):** pemulihan menutup breaker hanya pada ambang
hysteresis, dan gelombang berikutnya tidak membuka peluang akumulasi
baru — batas yang sama berlaku lagi dari nol.

## 6. ORPH-T4 — Isolasi worker: kill proses menghentikan operasi

- 2 lookup menggantung (deferred, TIDAK PERNAH di-resolve) → cap →
  `orphaned = 2`.
- Worker anak-proses di-kill `SIGKILL` (exit signal TERBUKTI `SIGKILL`).
- `terminateAllWorkerOps()` → `orphaned = 0`,
  `orphanedTerminated = 2`, breaker menutup, `liveOps = 0`.
- Worker baru di-spawn dan melayani lookup normal lewat IPC
  (`address 93.184.216.34`).

**Membuktikan:** penghentian proses benar-benar menghentikan operasi
DNS yang menggantung di dalamnya — satu-satunya bentuk "pembatalan DNS"
yang terbukti, karena `AbortSignal` terbukti tidak menghentikan
`dns.lookup`/`resolve4` (temuan v2.1). Deferred yang tidak pernah
di-resolve TIDAK PERNAH settle sendiri: tanpa terminasi eksplisit,
`orphaned` akan tetap 2 selamanya — jadi `terminateAllWorkerOps` bukan
hiasan, melainkan satu-satunya jalan turunnya counter dalam skenario ini.

## 7. ORPH-T4b — Worker thread di-terminate (alternatif, TERBUKTI tetapi DITOLAK sebagai pengganti)

Worker thread dengan operasi menggantung di-terminate dalam 2–3 ms
(exit code 1). Penghentian thread TERBUKTI bekerja — tetapi thread
berbagi memori dan resolver proses induk, sehingga TIDAK setara dengan
isolasi proses: resolver yang menggantung di tingkat native masih
berbagi proses yang sama, dan crash/hang di thread dapat memengaruhi
induk. Karena itu desain v2.3 memilih **child process** (isolasi
penuh), bukan worker thread, sebagai mekanisme pemulihan. Worker thread
dicatat sebagai alternatif yang lebih murah tetapi lebih lemah — bukan
pengganti.

## 8. ORPH-T5 — Metrik orphaned

Setelah skenario yang ditulis (2 + 2 lookup menggantung melewati cap):

- `orphaned` aktif = 3, `orphanedHighWater` = 3,
  `forceReleased` total = 3 (satu slot cap-deferred, belum direbut),
  `breakerTrips` = 1, `breakerOpen` = 1.
- Semua nilai sesuai prediksi dari state machine §A.5.4 — metrik
  mencerminkan keadaan sebenarnya, bukan angka hiasan.

## 9. Temuan samping dari pengujian (bug HARNESS, bukan bug implementasi — sudah diperbaiki)

Tiga kesalahan tes ditemukan dan diperbaiki selama pengujian; ketiganya
adalah kesalahan harness, bukan kesalahan implementasi referensi:

1. **Unhandled rejection (Node 24 crash):** janji holder yang disimpan
   tanpa penangan langsung ditolak `DNS_TIMEOUT` sebelum di-await →
   proses crash. Perbaikan: semua janji yang disimpan langsung dipasangi
   penangan (atau `.catch`). Aturan yang sama berlaku untuk kode produksi:
   janji pemeriksaan yang disimpan harus selalu punya penangan.
2. **Waiter memakai lookup 150 ms dengan race timeout 60 ms:**
   waiter SEM-R2 diharapkan `ok` tetapi lookup-nya lebih lambat dari
   race timeout. Perbaikan: waiter memakai lookup 10 ms; holder tetap
   150 ms dan diharapkan `DNS_TIMEOUT` bagi pemanggil.
3. **Worker hasil fork belum siap saat lookup IPC pertama:**
   jawaban tiba setelah race timeout 60 ms karena startup Node
   ~50–100 ms. Perbaikan: tunggu event `spawn` + 300 ms sebelum lookup
   IPC pertama. Temuan ini dicatat sebagai peringatan implementasi:
   worker yang baru di-spawn TIDAK BOLEH langsung diberi lookup tanpa
   readiness check — kalau tidak, lookup pertama selalu timeout.

## 10. Yang TIDAK diuji di sini (dinyatakan jujur)

- **Runtime artifact produksi:** semua bukti berasal dari Node v24.22.1
  di VM ini. Perilaku timer/event-loop/`AbortSignal`/IPC di runtime
  artifact produksi belum terbukti — uji ulang staging (U-1, U-12, U-15,
  U-16) tetap wajib.
- **DNS resolver sungguhan:** tes memakai resolver stub. Perilaku
  resolver sistem nyata (c-ares) saat menggantung — apakah ia
  benar-benar tidak pernah settle, atau akhirnya timeout sendiri —
  tidak diuji di sini. Worker kill menutup celah ini: apa pun perilaku
  resolvernya, kematian proses mengakhirinya.
- **Beban ratusan instance:** tes memakai satu proses. Perilaku
  orphaned/breaker per proses di bawah ratusan instance (U-17) belum
  diuji; breaker bersifat per proses, dan batas global antar instance
  tetap dipegang oleh lease `scan_leases`, bukan oleh breaker ini.
- **PostgreSQL:** tidak tersedia di environment ini; mekanisme lease
  PostgreSQL tetap belum teruji (wajib di staging, gerbang G6).

---

**Status dokumen:** bukti ini adalah lampiran evaluasi akhir. Status
proyek tetap: **DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT
APPROVED**. Tidak ada kode artifact, database produksi, atau production
build yang diubah dalam penyusunan bukti ini.
