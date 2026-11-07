# BUKTI UJI SPIKE v2.1 — Revisi Teknis Terbatas SSRF (AG-001)

- **Tanggal:** 7 November 2026
- **Tujuan:** Membuktikan enam jawaban revisi v2.1 (NAT64, batas dekompresi pada
  jalur Node Agent, timeout global & DNS cancellation, TTL DNS, pencocokan
  allowlist RDAP, konkurensi global) dengan tes yang benar-benar dijalankan.
- **Ruang lingkup:** HANYA di `/tmp/ssrf-spike-v21`, terhadap server/target
  lokal yang dikontrol sendiri. Tidak ada akses ke metadata cloud, jaringan
  internal produksi, atau sistem pihak ketiga. Tidak ada kode artifact,
  database, katalog, atau production build yang diubah.
- **BATAS BUKTI (wajib dibaca):** Semua tes dijalankan pada Node v24.22.1 /
  Bun 1.4.4 di VM ini — **BUKAN pada runtime artifact produksi**. Hasil ini
  membuktikan logika dan perilaku API di VM ini; uji ulang di staging
  artifact produksi (U-1) tetap wajib sebelum implementasi. DNS VM ini
  diintersep (`example.com` → `198.18.228.151`, rentang benchmarking
  RFC 2544) — nilai ALAMAT hasil resolve tidak representatif, tetapi BENTUK
  API dan perilaku signal yang diuji tetap valid sebagai bukti API.
- **File tes:** `nat64.test.cjs`, `decomp.test.cjs`, `dns.test.cjs`,
  `dns-signal-check.cjs`, `rdap.test.cjs` (di `/tmp/ssrf-spike-v21/`).

Perintah reproduksi (dari `/tmp/ssrf-spike-v21/`):

```bash
node nat64.test.cjs   # TEST 1 — NAT64 RFC 6052
node decomp.test.cjs  # TEST 2 — batas dekompresi jalur Node http.Agent
node dns.test.cjs     # TEST 3 — TTL + cancellation DNS
node dns-signal-check.cjs  # TEST 3 lanjutan — AbortSignal dns.lookup/resolve4
node rdap.test.cjs    # TEST 4 — allowlist RDAP (parsing ketat)
```

---

## TEST 1 — NAT64: koreksi aturan ekstraksi IPv4 (RFC 6052 §2.2) — 10/10 PASS

**Aturan yang benar (RFC 6052 §2.2, diverifikasi dari teks RFC + Tabel 1):**

| Prefix | Posisi IPv4 32 bit | Oktet "u" (bit 64..71) |
| --- | --- | --- |
| `64:ff9b::/96` (WKP) | 32 bit TERAKHIR (byte 12..15) | Bagian dari prefix (byte 8 = 0x00 otomatis) |
| `64:ff9b:1::/48` (local-use, RFC 8215) | 16 bit pertama di bit 48..63 (byte 6..7) + 16 bit terakhir di bit 72..87 (byte 9..10) | Byte 8, **WAJIB 0**; bila ≠ 0 alamat MALFORMED → tolak |

Bukti format dari Tabel 1 RFC 6052: prefix `2001:db8:122::/48` + IPv4
`192.0.2.33` menghasilkan `2001:db8:122:c000:2:2100::` — `c000` = 192.0
(bit 48..63), `00` = oktet u (bit 64..71), `0221` = 2.33 (bit 72..87).
Aturan v2 ("ekstrak 32 bit terakhir" untuk /48) **salah** dan terbukti
berdampak ganda (lihat tabel dampak di bawah).

**Hasil tes (`node nat64.test.cjs`, TOTAL: 10 PASS, 0 FAIL):**

| Alamat | Ekstraksi benar | Keputusan |
| --- | --- | --- |
| `64:ff9b::c0a8:101` | 192.168.1.1 | BLOCK (privat 192.168.0.0/16) |
| `64:ff9b::808:808` | 8.8.8.8 | ALLOW (publik) |
| `64:ff9b::7f00:1` | 127.0.0.1 | BLOCK (loopback) |
| `64:ff9b::5db8:d822` | 93.184.216.34 | ALLOW (publik) |
| `64:ff9b::c000:221` | 192.0.2.33 | BLOCK (TEST-NET-1; contoh WKP Tabel 2 RFC 6052) |
| `64:ff9b:1:c0a8:1:100::` | 192.168.1.1 | BLOCK (privat, /48) |
| `64:ff9b:1:808:8:800::` | 8.8.8.8 | ALLOW (publik, /48) |
| `64:ff9b:1:c0a8:1:100:5db8:d822` | 192.168.1.1 | BLOCK (privat, /48 — suffix berisi IP publik diabaikan) |
| `64:ff9b:1:c0a8:ff01:100::` | — (u-octet 0xff) | REJECT malformed (bit 64..71 wajib 0) |
| `2001:db8:122:c000:2:2100::` | 192.0.2.33 | Ekstraksi /48 generik TERKONFIRMASI cocok Tabel 1 RFC 6052 |

**Dampak aturan v2 yang salah (diukur langsung dalam tes yang sama):**

| Alamat | Aturan v2 (32 bit terakhir) | Aturan benar v2.1 |
| --- | --- | --- |
| `64:ff9b:1:c0a8:1:100::` | 0.0.0.0 → BLOCK (alasan salah) | 192.168.1.1 → BLOCK |
| `64:ff9b:1:808:8:800::` | 0.0.0.0 → **BLOCK (false positive atas 8.8.8.8)** | 8.8.8.8 → ALLOW |
| `64:ff9b:1:c0a8:1:100:5db8:d822` | 93.184.216.34 → **ALLOW (BYPASS atas 192.168.1.1)** | 192.168.1.1 → BLOCK |

Konteks tambahan (bukan bukti tes): draft `draft-ietf-v6ops-nat64-wkp-1918`
(November 2026, belum RFC) mengusulkan pelonggaran §3.1 RFC 6052 agar WKP
boleh merepresentasikan alamat IPv4 non-global. Sampai draft itu menjadi RFC,
keputusan guard tetap: validasi IPv4 hasil translasi terhadap tabel blokir
(bukan memblokir prefiks NAT64 secara membabi buta).

---

## TEST 2 — Batas 400 KB setelah dekompresi pada jalur UTAMA Node `http.Agent` — 11/11 PASS

Jalur yang diuji adalah **Pendekatan 1 (utama)**: `http.request` dengan
`http.Agent({ lookup })` yang mem-pin ke `127.0.0.1` (hostname `pinned.test`
tidak ada di DNS mana pun — koneksi hanya berhasil karena lookup pin).
Server uji lokal `127.0.0.1` menyajikan bombe dekompresi. Nilai timeout di
tes ini 5 detik agar suite cepat; nilai desain tetap 20 detik.

Ukuran terkompresi (dari 1.000.000 byte nol): gzip=1003, deflate=991,
brotli=14 byte.

**Hasil tes (`node decomp.test.cjs`, TOTAL: 11 PASS, 0 FAIL):**

| # | Kasus | Hasil | Byte terdekompresi | Waktu |
| --- | --- | --- | --- | --- |
| 1 | gzip bomb (CL = 1003) | aborted-over-limit | 409.600 | 19 ms |
| 2 | deflate bomb (CL = 991) | aborted-over-limit | 409.600 | 4 ms |
| 3 | brotli bomb (CL = 14) | aborted-over-limit | 409.600 | 7 ms |
| 4 | gzip bomb TANPA Content-Length (chunked) | aborted-over-limit | 409.600 | 4 ms |
| 5 | Content-Length = 1.000.000, body kecil valid | rejected-cl-too-large (0 byte dibaca) | 0 | 2 ms |
| 6 | Encoding `x-custom` (chunked, 500 KB) | rejected-unsupported-encoding (0 byte diproses) | 0 | 3 ms |
| 7 | gzip rusak di header (magic byte dibalik) | decompression-error `incorrect header check` | 0 | 2 ms |
| 8 | gzip rusak di tengah payload | aborted-over-limit (fail-closed — batas tercapai sebelum error terdeteksi) | 409.600 | 3 ms |
| 9 | gzip terpotong + FIN (payload kecil 1000 byte) | decompression-error `unexpected end of file` | 260 | 3 ms |
| 10 | Body kecil valid (14 byte HTML) | ok | 14 | 1 ms |
| 11 | Server tidak merespons (global timeout 5 dtk di tes) | global-timeout, tanpa vonis parsial | 0 | 5.006 ms |

**Yang dibuktikan:** batas 400 KB dihitung dari byte stream terdekompresi
pada jalur Node Agent (bukan hanya pada spike `Bun.fetch` W6); Content-Length
kecil yang akurat (1003) TIDAK mencegah abort; tanpa Content-Length pun abort
tetap terjadi; Content-Length besar dipakai HANYA sebagai sinyal tolak-awal;
encoding tidak dikenal ditolak tanpa memproses body; stream rusak/terpotong
berakhir fail-closed (error, tanpa vonis, tanpa baris `checks`); timeout
global menghentikan pemeriksaan tanpa vonis parsial.

**Catatan koreksi selama pengujian (dicatat jujur):** tiga kegagalan awal
adalah bug harness tes, bukan temuan desain — (a) kasus encoding tidak
dikenal awalnya memakai CL 500.000 sehingga penolakan CL mendahului
penolakan encoding (diperbaiki: kirim chunked tanpa CL); (b) kasus `/ok`
awal memakai `Content-Length: 11` untuk body 14 byte sehingga parser
menghasilkan `Parse Error: Data after Connection: close` (diperbaiki:
CL dihitung dari panjang body sebenarnya); (c) kasus gzip terpotong awal
memakai bombe 1 MB sehingga abort-di-batas mendahului error truncasi
(diperbaiki: pakai payload kecil 1000 byte). Ketiganya didokumentasikan
bersama perbaikannya, bukan disembunyikan.

---

## TEST 3 — API resolver DNS: TTL + cancellation — 7/7 PASS

**Hasil tes (`node dns.test.cjs`, TOTAL: 7 PASS, 0 FAIL):**

| # | Uji | Hasil aktual |
| --- | --- | --- |
| 1 | `resolve4('example.com', {ttl:true})` | `[{"address":"198.18.228.151","ttl":15}]` — TTL tersedia |
| 2 | `resolve6('example.com', {ttl:true})` | Error `ENODATA` dari resolver sandbox (dicatat, bukan kegagalan API) |
| 3 | `lookup('example.com', {all:true})` | `[{"address":"198.18.228.151","family":4}]` — **TIDAK ada field TTL** |
| 4 | `lookup` + signal yang sudah di-abort | Lookup **TETAP jalan** (hasil dikembalikan) — signal TIDAK dihormati di sini |
| 5 | `resolve4` + opsi `signal` | Signal **DIABAIKAN** (tidak melempar, resolve tetap jalan) |
| 6 | `Promise.race`: timer 100 ms vs lookup 2000 ms | Timer menang; hasil lookup yang telat DIABAIKAN |
| 7 | Lookup telat tetap selesai di background | Tiba 1900 ms kemudian — tidak dapat dibatalkan |

**Uji lanjutan (`node dns-signal-check.cjs`):** callback `dns.lookup` +
pre-aborted signal → BERHASIL (`address=198.18.228.151`); promises lookup +
abort 5 ms mid-flight → BERHASIL (`198.18.228.155`); `resolve4` +
pre-aborted signal → BERHASIL (signal diabaikan).

**Kesimpulan yang ditarik (dan batasnya):** API yang DIPILIH v2.1 adalah
`dns.resolve4`/`resolve6` dengan `{ttl:true}` (satu-satunya API yang memberi
TTL). `dns.lookup` hanya dipakai bila dibutuhkan perilaku `verbatim`.
**TEMUAN PENTING: AbortSignal TIDAK menghentikan `dns.lookup` maupun
`dns.resolve4/6` di Node v24.22.1 pada VM ini** — bahkan signal yang sudah
di-abort sebelum pemanggilan tidak mencegah lookup. Apakah ini perilaku umum
Node atau efek resolver lokal VM ini (yang menjawab seketika dari cache)
**tidak dapat dibedakan di sini**; karena itu desain v2.1 memperlakukan DNS
sebagai **NON-CANCELLABLE** dan tidak bergantung pada cancellation:
mitigasinya adalah `Promise.race` + timeout 5 detik per lookup + semaphore
konkurensi lookup + abaikan hasil telat + pencatatan. Uji ulang di staging
produksi (U-1) wajib mencakup perilaku signal ini.

---

## TEST 4 — Allowlist RDAP: pencocokan ketat via parsing URL — 20/20 PASS

Matcher yang diuji: parse `new URL()`, wajib `https:`, tolak userinfo, host
dibandingkan persis setelah lowercase + strip SATU trailing dot, port harus
kosong atau `443`, path harus sama persis dengan prefix ATAU diawali prefix +
`/` (segment-aware). Allowlist uji: `rdap.verisign.com/com/v1/`,
`rdap.verisign.com/net/v1/`, `rdap.org/domain/`.

**Hasil tes (`node rdap.test.cjs`, TOTAL: 20 PASS, 0 FAIL):**

| URL | Hasil | Alasan |
| --- | --- | --- |
| `https://rdap.verisign.com/com/v1/domain/example.com` | ALLOW | Entri .com normal |
| `https://rdap.verisign.com/com/v1/` | ALLOW | Prefix persis |
| `https://rdap.verisign.com/com/v1/domain/example.com?x=1` | ALLOW | Query diabaikan |
| `https://rdap.verisign.com/com/v1/domain/example.com#frag` | ALLOW | Fragment diabaikan |
| `https://rdap.verisign.com.evil.com/com/v1/domain/x` | REJECT | Host mirip (suffix jahat) |
| `https://rdapverisign.com/com/v1/domain/x` | REJECT | Host mirip (tanpa dot) |
| `https://rdap.verisign.com/com-evil/v1/domain/x` | REJECT | Path-prefix palsu (com-evil) |
| `https://rdap.verisign.com/comv1/domain/x` | REJECT | Path-prefix palsu (comv1) |
| `https://rdap.verisign.com@evil.com/com/v1/domain/x` | REJECT | Userinfo (host sebenarnya evil.com) |
| `https://rdap.verisign.com:8443/com/v1/domain/x` | REJECT | Port bukan 443 |
| `https://rdap.verisign.com:443/com/v1/domain/x` | ALLOW | Port 443 eksplisit |
| `HTTPS://RDAP.VERISIGN.COM/com/v1/domain/x` | ALLOW | Skema/host dinormalisasi URL |
| `https://rdap.verisign.com/COM/V1/domain/x` | REJECT | Path case-sensitive (fail-closed) |
| `https://rdap.verisign.com/com/v1/../evil` | REJECT | Dot-segment dinormalisasi ke /com/evil |
| `https://rdap.verisign.com./com/v1/domain/x` | ALLOW | Trailing dot FQDN di-strip satu |
| `https://rdap.verisign.com/%63om/v1/domain/x` | REJECT | Path ter-encode |
| `http://rdap.verisign.com/com/v1/domain/x` | REJECT | Skema http (RDAP hanya HTTPS) |
| `https://evil.com/?rdap.verisign.com` | REJECT | Host evil, string allowlist hanya di query |
| `https://rdap.org/domain/example.com` | ALLOW | rdap.org titik awal |
| `https://rdap.org.evil.com/domain/x` | REJECT | Host mirip rdap.org |

**Kontras dengan matcher naif `includes()`:** matcher string sederhana salah
pada **12 dari 20 kasus** (antara lain meloloskan `rdap.verisign.com.evil.com`,
`com-evil`, userinfo, port 8443, path huruf besar, dot-segment, dan host evil
dengan string allowlist di query). Ini membuktikan pencocokan string tidak
cukup dan matcher ketat v2.1 wajib.

---

## Ringkasan hasil v2.1

| Tes | Hasil |
| --- | --- |
| TEST 1 NAT64 (RFC 6052) | 10/10 PASS — termasuk bukti aturan v2 salah (false positive + bypass) |
| TEST 2 Dekompresi jalur Node Agent | 11/11 PASS — abort pada 409.600 byte terdekompresi di semua bombe |
| TEST 3 DNS TTL + cancellation | 7/7 PASS — API `{ttl:true}` terbukti; signal TIDAK menghentikan lookup (temuan) |
| TEST 4 RDAP strict matching | 20/20 PASS — matcher naif salah 12/20 |
| **TOTAL** | **48/48 PASS** |

**Yang TIDAK dapat diuji di environment ini (dicatat jujur):** perilaku
`AbortSignal` pada DNS terhadap resolver lambat yang nyata (resolver VM
menjawab seketika — apakah signal diabaikan secara umum atau hanya karena
jawaban instan, tidak dapat dibedakan di sini); perilaku pinning dan
dekompresi pada runtime artifact produksi (bukan Bun/Node CLI di VM ini);
perilaku HTTP/2 pada Pendekatan 2 (sudah dicatat U-3/U-6 sebelumnya).
Ketiganya masuk daftar risiko tersisa v2.1 (§G) dan gerbang uji staging.
