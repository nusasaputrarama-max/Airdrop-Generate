# BUKTI PENGUJIAN v2.2 — Semaphore DNS & Atomicity Lease Global

**Tanggal:** 7 November 2026
**Ruang lingkup:** bukti teknis untuk revisi terbatas v2.2 atas
`SSRF_REMEDIATION_DESIGN.md`. Semua tes dijalankan terhadap komponen
lokal yang dikontrol sendiri di `/tmp/ssrf-v22` — **bukan** terhadap
database produksi artifact, **bukan** metadata cloud, dan **bukan**
jaringan internal produksi.

**Environment:** Node v24.22.1, Python 3.12.3, sqlite3 3.45.1, Bun 1.4.4
(tersedia di `/opt/hatch-image/bin/bun`). **PostgreSQL TIDAK tersedia
di environment ini** (`psql`/`postgres`/`initdb` tidak ditemukan) —
mekanisme atomicity PostgreSQL dalam dokumen desain dinyatakan sebagai
spesifikasi yang BELUM teruji di sini dan wajib diuji di staging
dengan PostgreSQL nyata sebelum cutover (gerbang G6).

**File tes:**
- `/tmp/ssrf-v22/semaphore-test.cjs` — implementasi referensi
  `DnsLookupSemaphore` + 6 uji (SEM-T1..SEM-T6)
- `/tmp/ssrf-v22/leases-test.py` + `/tmp/ssrf-v22/lease-worker.py` —
  uji atomicity `scan_leases` (SQLite) + 5 uji (LSE-T1..LSE-T4)

**Hasil keseluruhan: 11/11 PASS** (6 semaphore + 5 lease).

**Skala waktu tes vs produksi:** parameter tes sengaja diperkecil agar
uji berjalan cepat (race timeout 50–100 ms, lookup lambat 100–3000 ms,
TTL lease 2 detik, absolute cap 800 ms–10 detik). Nilai produksi yang
ditetapkan di desain v2.2: `maxActive` 4, `maxQueue` 4, antrean menunggu
maks 5 detik, timeout race per lookup 5 detik, absolute cap 30 detik,
TTL lease 25 detik. Perilaku yang diuji (bukan angka absolutnya) yang
dipindahkan ke produksi.

---

## 1. Semaphore DNS — 6/6 PASS

Perintah:

```bash
cd /tmp/ssrf-v22 && node semaphore-test.cjs
```

Output aktual (lengkap):

```text
  metrics: {"active":0,"queued":0,"acquired":1,"timedOut":1,"lateSettled":1,"forceReleased":0,"rejectedQueueFull":0,"queueTimedOut":0,"maxActiveObserved":1,"maxQueueObserved":0}
PASS SEM-T1 slot held after race timeout until underlying settles
  metrics: {"active":0,"queued":0,"acquired":6,"timedOut":0,"lateSettled":0,"forceReleased":0,"rejectedQueueFull":1,"queueTimedOut":0,"maxActiveObserved":4,"maxQueueObserved":2}
PASS SEM-T2 queue-full rejects immediately, FIFO drains
  started=6 timeouts=6 queueFull=14 metrics={"active":0,"queued":0,"acquired":6,"timedOut":6,"lateSettled":6,"forceReleased":0,"rejectedQueueFull":14,"queueTimedOut":0,"maxActiveObserved":4,"maxQueueObserved":2}
PASS SEM-T3 20 requests vs slow resolver: bounded background lookups
  metrics: {"active":0,"queued":0,"acquired":1,"timedOut":0,"lateSettled":0,"forceReleased":0,"rejectedQueueFull":0,"queueTimedOut":1,"maxActiveObserved":1,"maxQueueObserved":1}
PASS SEM-T4 queued waiter times out after queueWaitMs
  metrics: {"active":0,"queued":0,"acquired":1,"timedOut":1,"lateSettled":0,"forceReleased":1,"rejectedQueueFull":0,"queueTimedOut":0,"maxActiveObserved":1,"maxQueueObserved":0}
PASS SEM-T5 never-settling lookup reclaimed by absolute cap
  metrics keys: active, queued, acquired, timedOut, lateSettled, forceReleased, rejectedQueueFull, queueTimedOut, maxActiveObserved, maxQueueObserved
PASS SEM-T6 metrics shape for monitoring

ALL SEMAPHORE TESTS PASSED
```

### SEM-T1 — Slot tetap terpakai setelah race timeout, dilepas saat settle

Satu lookup lambat 3000 ms dijalankan dengan race timeout 100 ms.
Pemanggil menerima `DNS_TIMEOUT` pada ~100 ms, tetapi:

- pada +200 ms dan +1500 ms setelah timeout, `active` tetap **1**;
- `active` baru menjadi **0** setelah underlying settle (~3000 ms);
- metrik akhir: `timedOut=1`, `lateSettled=1`.

**Membuktikan:** slot TIDAK dilepas hanya karena `Promise.race`
mencapai timeout. Release hanya terjadi di handler settle underlying.

### SEM-T2 — Antrean penuh menolak langsung, FIFO berjalan

4 slot diisi lookup 1500 ms; 2 waiter masuk antrean (maks 2); waiter
ke-3 langsung ditolak `DNS_QUEUE_FULL` (`rejectedQueueFull=1`).
Setelah holder selesai, kedua waiter FIFO mendapat slot dan selesai
dengan nilai benar; `active` dan `queued` kembali 0.

### SEM-T3 — Banjir 20 request: lookup background berbatas

20 request serentak ke resolver lambat 2000 ms dengan race timeout
50 ms, `maxActive=4`, `maxQueue=2`:

- lookup yang benar-benar dimulai: **6** (4 aktif + 2 antrean);
- `DNS_TIMEOUT`: 6; `DNS_QUEUE_FULL`: 14;
- `maxActiveObserved` = 4 (tidak pernah terlampaui);
- setelah semua underlying settle: `active=0`, `queued=0`,
  `lateSettled=6`.

**Membuktikan:** berapa pun request yang masuk, lookup background
tidak pernah melebihi `maxActive + maxQueue`, dan semuanya akhirnya
selesai/dilepas — tidak ada penumpukan tak terbatas.

### SEM-T4 — Waiter antrean kehabisan waktu

`maxActive=1`, `maxQueue=1`, `queueWaitMs=300 ms`: waiter yang
menunggu slot yang ditempati lookup 1500 ms ditolak
`DNS_QUEUE_TIMEOUT` pada ~300 ms; `queueTimedOut=1`; waiter keluar
dari antrean (`queued=0`).

### SEM-T5 — Lookup yang tidak pernah settle direbut absolute cap

Lookup yang tidak pernah resolve dijalankan dengan race timeout 100 ms
dan absolute cap 800 ms: pemanggil menerima `DNS_TIMEOUT`, slot tetap
terpakai, lalu pada ~800 ms `forceReleased=1` dan `active=0`. Slot
yang direbut langsung bisa dipakai lookup berikutnya (berhasil).

**Membuktikan:** absolute cap adalah katup pengaman yang mencegah satu
resolver menggantung memacetkan semaphore selamanya.

### SEM-T6 — Bentuk metrik

`getMetrics()` mengembalikan 10 kunci numerik:
`active`, `queued`, `acquired`, `timedOut`, `lateSettled`,
`forceReleased`, `rejectedQueueFull`, `queueTimedOut`,
`maxActiveObserved`, `maxQueueObserved`. Inilah metrik yang dipantau
di produksi (§A.5.3 v2.2).

### Temuan samping dari pengujian (bug harness, sudah diperbaiki)

Selama pengujian, proses Node keluar sendiri (exit 0) setelah SEM-T4
tanpa menjalankan SEM-T5/T6. Penyebab: timer penolakan race dibuat
dengan `.unref()`, sehingga ketika satu-satunya pekerjaan yang tersisa
adalah timer unref + promise yang tidak pernah settle, event loop
kosong dan Node keluar sebelum pemanggil menerima timeout-nya.
Perbaikan: **timer penolakan race TIDAK BOLEH di-unref** — pemanggil
sedang menunggu hasil race itu. Timer metrik dan absolute cap boleh
di-unref. Setelah perbaikan, 6/6 lolos. Temuan ini dicatat di desain
v2.2 (§A.5.3) sebagai aturan implementasi: jangan unref timer yang
menentukan hasil yang sedang ditunggu pemanggil.

---

## 2. Atomicity lease global `scan_leases` (SQLite) — 5/5 PASS

Perintah:

```bash
cd /tmp/ssrf-v22 && python3 leases-test.py
```

Output aktual (lengkap):

```text
  single-stmt: 3 ronde x 8 worker -> tepat 1 pemenang tiap ronde, total hidup 5
PASS LSE-T1 race 8 proses/1 slot tersisa (single-stmt)
  txn BEGIN IMMEDIATE: 3 ronde x 8 worker -> tepat 1 pemenang tiap ronde
PASS LSE-T1 race 8 proses/1 slot tersisa (txn BEGIN IMMEDIATE)
  TTL 2 detik: 5/5 ditolak -> setelah 3 detik 0 hidup -> acquire sukses
PASS LSE-T2 lease expiry membebaskan slot
  5 lease yatim (tanpa release) -> ditolak, lalu sukses setelah TTL 2 detik
PASS LSE-T3 orphan lease takeover setelah TTL
  release id salah: rowcount 0, tanpa error; lease tetap kedaluwarsa sendiri
PASS LSE-T4 kegagalan release tidak memacetkan slot

ALL LEASE TESTS PASSED
```

Skema tes (identik dengan skema rancangan):

```sql
CREATE TABLE scan_leases (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  acquired_at REAL NOT NULL,
  expires_at REAL NOT NULL
);
CREATE INDEX idx_scan_leases_expires ON scan_leases(expires_at);
```

### LSE-T1 — 8 proses serentak, tersisa 1 slot: tepat 1 pemenang

4 lease hidup diisi dulu (dari batas 5). 8 worker subprocess — masing-masing
proses terpisah dengan koneksi DB sendiri (simulasi 8 instance) — mencoba
acquire serentak. Diulang 3 ronde per mekanisme:

- **(A) single-statement** `INSERT ... SELECT ... WHERE (SELECT COUNT(*)
  FROM scan_leases WHERE expires_at > ?) < 5`: 3 ronde, tepat **1**
  pemenang tiap ronde; total lease hidup setelahnya = 5.
- **(B) transaksi `BEGIN IMMEDIATE`** (hitung → INSERT → COMMIT di
  bawah write lock): 3 ronde, tepat **1** pemenang tiap ronde.

**Membuktikan:** kedua mekanisme aman dari race antar-proses di
SQLite — batas global 5 tidak dapat dilampaui. Mekanisme (A) aman di
SQLite karena satu statement dieksekusi secara atomik di bawah write
lock level database; mekanisme (B) aman karena `BEGIN IMMEDIATE`
menserialisasi semua penulis.

### LSE-T2 — Lease kedaluwarsa membebaskan slot

5 lease dengan TTL 2 detik: acquire ke-6 ditolak. Setelah 3 detik
(TTL lewat), 0 lease hidup dan acquire berhasil.

### LSE-T3 — Lease yatim (proses mati sebelum release) diambil alih

5 lease ditulis tanpa pernah ada release (simulasi 5 proses yang mati
di tengah pemeriksaan): acquire langsung ditolak; setelah TTL 2 detik
lewat, acquire berhasil. **Membuktikan:** tidak ada slot yang macet
selamanya karena proses mati — TTL adalah pembersih otomatis.

### LSE-T4 — Kegagalan release tidak memacetkan slot

`DELETE ... WHERE id = 'id-tidak-ada'` mengembalikan rowcount 0 tanpa
error; lease tetap hidup sampai TTL-nya; release id valid menghapus
tepat 1 baris dan slot langsung bebas. Release yang gagal berulang
kali tidak pernah memblokir — lease tetap kedaluwarsa sendiri.

### Yang TIDAK diuji di sini (dinyatakan jujur)

- **PostgreSQL:** tidak ada server PostgreSQL di environment ini, jadi
  mekanisme atomicity PostgreSQL (advisory lock / counter row) **tidak
  teruji**. Peringatan penting: single-statement `INSERT ... SELECT ...
  WHERE (SELECT COUNT(*)) < 5` yang aman di SQLite **TIDAK aman** di
  PostgreSQL di bawah `READ COMMITTED` — dua statement bersamaan dapat
  sama-sama melihat count=4 sebelum salah satu INSERT (snapshot per
  statement; `COUNT(*)` tidak mengunci baris yang dihitung), sehingga
  keduanya INSERT dan total menjadi 6. Karena itu desain v2.2
  menetapkan untuk PostgreSQL: **advisory lock transaksi**
  (`pg_advisory_xact_lock`) ATAU **counter row**
  (`UPDATE ... SET used = used + 1 WHERE used < 5 RETURNING used`)
  sebagai mekanisme utama — dan keduanya wajib diuji di staging dengan
  PostgreSQL nyata (gerbang G6) sebelum cutover.
- **Beban tinggi / ratusan instance:** uji memakai 8 proses; perilaku
  di bawah ratusan instance bersamaan belum diuji dan menjadi bagian
  uji beban staging (R-15 baru di v2.2).

---

## 3. Ringkasan bukti v2.2

| Uji | Hasil | Yang dibuktikan |
| --- | --- | --- |
| SEM-T1 | PASS | Slot dilepas hanya saat underlying settle, bukan saat race timeout |
| SEM-T2 | PASS | Antrean berbatas (maks 2); penuh → tolak langsung; FIFO berjalan |
| SEM-T3 | PASS | 20 request → maks 6 lookup dimulai; aktif tidak pernah > 4 |
| SEM-T4 | PASS | Waiter antrean timeout (300 ms) dan keluar dari antrean |
| SEM-T5 | PASS | Lookup tak pernah settle direbut absolute cap (800 ms) |
| SEM-T6 | PASS | 10 kunci metrik tersedia untuk pemantauan |
| LSE-T1 (A) | PASS | 8 proses/1 slot → tepat 1 pemenang, 3 ronde (single-stmt) |
| LSE-T1 (B) | PASS | 8 proses/1 slot → tepat 1 pemenang, 3 ronde (BEGIN IMMEDIATE) |
| LSE-T2 | PASS | TTL membebaskan slot |
| LSE-T3 | PASS | Lease yatim diambil alih setelah TTL |
| LSE-T4 | PASS | Release gagal tidak memacetkan slot |

**Status dokumen:** revisi ini adalah bukti untuk evaluasi akhir.
Status proyek tetap: **DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED**. Tidak ada kode artifact, database
produksi, atau production build yang diubah dalam penyusunan bukti ini.
