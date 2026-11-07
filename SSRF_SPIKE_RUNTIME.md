# HASIL SPIKE RUNTIME — IP Pinning untuk Link Scanner (AG-001)

- **Tanggal:** 7 November 2026
- **Tujuan:** Membuktikan pendekatan IP pinning mana yang benar-benar didukung
  runtime Bun/artifact, sebelum implementasi perbaikan SSRF (P0-1a).
- **Status:** SELESAI — hasil spike menentukan pilihan arsitektur (§A.2 v2).
- **Ruang lingkup:** Spike HANYA di `/tmp/ssrf-spike`, terhadap server HTTP/HTTPS
  lokal (127.0.0.1) yang dikontrol sendiri. Tidak ada akses ke endpoint internal
  produksi, metadata cloud, atau sistem pihak ketiga. Tidak ada kode artifact,
  database, atau production build yang diubah.

---

## 0. Ringkasan putusan

| Pendekatan | Putusan | Bukti |
| --- | --- | --- |
| **Pendekatan 1 — custom lookup** (Node `http`/`https` Agent `lookup`) | ✅ **TERBUKTI di Bun 1.4.4 dan Node 24** — pendekatan UTAMA | B1-fixed, W2, W3 |
| **Pendekatan 2 — IP literal + SNI manual** (Bun.fetch `tls.serverName` + header `Host`) | ✅ **TERBUKTI di Bun 1.4.4** — pendekatan FALLBACK | W1, W5, T3a, T3c |
| **Pendekatan 2 — IP literal + SNI manual** (Bun.connect socket, tulis di handler `open`) | ✅ **TERBUKTI, dengan catatan** — butuh implementasi HTTP manual | V1, V4 |
| **Custom lookup via `fetch` global** (Bun.fetch / Node fetch) | ❌ **TIDAK DIDUKUNG** — tidak ada opsi lookup/dispatcher yang dihormati | B2a, B2b |
| **undici v7 dns interceptor** (Node) | ✅ **TERBUKTI di Node 24, hanya via `.compose()`** — bukan jalur utama di runtime Bun | T1, T1b, T2, T2c |
| **Egress proxy via `Bun.fetch({ proxy })`** | ✅ **TERBUKTI dihormati** — opsi arsitektur P2 | B6 |

**Putusan arsitektur:** Pendekatan 1 via **Node `https`/`http` Agent `lookup` di
runtime Bun** menjadi jalur utama `fetchGuarded()` — karena itulah satu-satunya
mekanisme pinning yang terbukti di runtime artifact DAN mempertahankan TLS/SNI
normal. Pendekatan 2 via `Bun.fetch` + `tls.serverName` + header `Host`
menjadi fallback bila jalur Agent tidak dapat dipakai (mis. butuh HTTP/2).
Undici **tidak** direkomendasikan sebagai dependensi runtime Bun (tidak ada
undici bawaan di Bun; API-nya terbukti rapuh antar versi — lihat §5).

**Peringatan keras yang terbukti:** `rejectUnauthorized: false` TIDAK PERNAH
dibutuhkan dan TIDAK PERNAH dipakai dalam satu pun uji yang lolos. Semua uji
TLS lolos dengan verifikasi sertifikat aktif.

---

## 1. Environment spike

| Komponen | Versi / nilai |
| --- | --- |
| Bun | 1.4.4 (`/opt/hatch-image/bin/bun`) |
| Node.js | v24.22.1 (`/usr/bin/node`) |
| undici (uji Node saja) | 7.30.2 (diinstal di `/tmp/ssrf-spike`, bukan di proyek) |
| OpenSSL | tersedia (sertifikat uji dibuat lokal) |
| Direktori spike | `/tmp/ssrf-spike` (skrip `node-spike*.cjs`, `bun-spike.ts`, `bun-debug*.ts`) |

**Caveat environment (penting):** VM ini berada di balik egress proxy
(`HTTP_PROXY`/`HTTPS_PROXY` → `hatch-egress-proxy:3128`,
`NODE_USE_ENV_PROXY=1`) dan DNS-nya diintersep: `example.com` me-resolve ke
`198.18.228.151` (rentang benchmarking RFC 2544, BUKAN alamat publik
sebenarnya). Karena itu hasil resolve DNS publik di VM ini **tidak
representatif** untuk produksi — semua uji pinning memakai server lokal dan
lookup yang di-override, bukan DNS publik. Uji yang memakai `127.0.0.2`
(tanpa listener) menghasilkan `ECONNRESET`, bukan `ECONNREFUSED` — perilaku
jaringan sandbox, dicatat apa adanya.

---

## 2. Hasil uji — Node.js 24 + undici 7.30.2

Semua uji memakai server HTTP/HTTPS lokal di `127.0.0.1` dan sertifikat
self-signed yang dibuat dengan OpenSSL (CA spike `ca.crt`; `test.example`
dan `wrong.example` ditandatangani CA yang sama, agar uji mismatch menguji
verifikasi hostname — bukan validasi rantai).

| # | Uji | Hasil | Bukti (output aktual) |
| --- | --- | --- | --- |
| T0 | `dns.lookup` / `resolve4` / `resolve6` tersedia | ✅ PASS | `dns.lookup('example.com', {all:true})` → `[{address:'198.18.228.151',family:4}]`; `resolve4` sama; `resolve6` → `ENODATA` (resolver sandbox tidak mengembalikan AAAA) |
| T1 | Custom lookup dihormati (undici dns interceptor, `compose`) | ✅ PASS | `status=200 body=host-header=pinned.test:18080 lookupCalls=1` — `pinned.test` tidak ada di DNS mana pun, namun request berhasil: koneksi memakai jawaban lookup |
| T1b | Jawaban lookup menggerakkan koneksi (rebinding) | ✅ PASS | Koneksi #1 ke `127.0.0.1` berhasil; koneksi #2 (lookup mengembalikan `127.0.0.2`) → `ECONNREFUSED` — koneksi memakai jawaban lookup, bukan resolve ulang |
| T2 | TLS SNI hostname asli + lookup pin | ✅ PASS | `status=200 body=tls-ok host=test.example:18443` |
| T2b | Sertifikat rantai tidak cocok ditolak | ✅ PASS | `DEPTH_ZERO_SELF_SIGNED_CERT` (server memakai CA berbeda) |
| T2c | Hostname mismatch (CA sama) ditolak | ✅ PASS | `ERR_TLS_CERT_ALTNAME_INVALID` — membuktikan **verifikasi hostname** aktif, bukan sekadar validasi rantai |
| T2d | Kontrol positif (CA sama, host cocok) | ✅ PASS | `status=200 body=tls-ok host=test.example:18443` |
| T3a | IP literal + `servername` + header `Host` (node:https) | ✅ PASS | `status=200 authorized=true authError=null` |
| T3b | IP literal TANPA `servername` | ⚠️ **TEMUAN** | Request **BERHASIL** (`authorized=true`) — karena Node `https.request` menurunkan SNI dari header `Host` bila `servername` tidak diisi (dibuktikan di §4). Perilaku implisit — rancangan WAJIB mengisi `servername` eksplisit, jangan mengandalkan ini |
| T3c | IP literal + `servername` SALAH | ✅ PASS | `ERR_TLS_CERT_ALTNAME_INVALID` — verifikasi hostname aktif |

**Koreksi API penting (undici v7):**
- `Agent({ connect: { lookup } })` (API undici lama) **tidak berlaku** di v7 —
  uji awal dengan cara ini gagal (`Invalid IP address: undefined`).
- Cara yang benar: `new Agent().compose([interceptors.dns({ lookup })])`.
- `lookup` menerima **origin lengkap sebagai string**
  (`"http://pinned.test:18080/"`), BUKAN hostname — harus di-parse
  (`new URL(origin).hostname`) sebelum dipakai.
- `Agent({ interceptors: { Agent: [...] } })` di constructor **tidak
  menjalankan lookup** (terbukti: lookup tidak pernah dipanggil, request
  jatuh ke DNS biasa). Jangan pakai cara ini.

---

## 3. Hasil uji — Bun 1.4.4 (runtime artifact — penentu)

| # | Uji | Hasil | Bukti (output aktual) |
| --- | --- | --- | --- |
| B1 | Bun `node:http` Agent custom lookup (awal) | ❌ FAIL (lalu diperbaiki) | `ERR_INVALID_IP_ADDRESS Invalid IP address: undefined` — Bun memanggil lookup dengan `options = {hints:32, all:true}`; callback yang mengembalikan alamat tunggal (bukan array) dianggap tidak valid |
| B1-fixed | Bun `node:http` Agent custom lookup (callback menghormati `options.all`) | ✅ **PASS** | `200:srv-ok host=pinned.test:18080` — lookup dihormati, header Host asli dipertahankan |
| B2a | `Bun.fetch` biasa ke hostname tanpa DNS | ✅ PASS (negatif) | Gagal seperti diharapkan — tidak ada jalan pintas DNS di `fetch` global |
| B2b | `Bun.fetch` opsi `dispatcher` (gaya undici) | ✅ PASS (negatif) | Opsi **diabaikan diam-diam** (`status=200` dari IP langsung) — tidak ada custom lookup via `fetch` |
| B3 | `Bun.connect` TLS + `tls.serverName`, tulis SEBELUM `open` | ❌ FAIL (artefak uji) | Tidak ada respons dalam 2–8 detik — tulis sebelum handshake selesai tidak diteruskan; **bukan** kegagalan TLS (lihat V1) |
| V1 | `Bun.connect` TLS + `tls.serverName`, tulis DI DALAM handler `open` | ✅ **PASS** | `open 3ms`, server menerima request, `data 9ms: HTTP/1.1 200 OK` |
| V2 | `Bun.connect` TLS + `rejectUnauthorized:false` | ✅ PASS (kontrol) | Berhasil — dicatat hanya sebagai kontrol; opsi ini **dilarang** dipakai di implementasi |
| V3 | `Bun.fetch` ke IP literal + `tls.ca` (tanpa `serverName`) | ✅ PASS (negatif) | `ERR_TLS_CERT_ALTNAME_INVALID` — verifikasi sertifikat aktif terhadap host URL |
| V4 | `Bun.serve` TLS + `Bun.connect` TLS | ✅ PASS | `open 2ms`, server menerima request, `data 3ms` — Bun↔Bun TLS normal |
| W1 | `Bun.fetch` IP literal + `tls.serverName` | ✅ **PASS** | `status=200` — `Bun.fetch` **mendukung `tls.serverName`** untuk verifikasi sertifikat terhadap hostname asli |
| W5 | `Bun.fetch` + override header `Host` | ✅ **PASS** | Server melihat `Host: test.example` — override header `Host` **diizinkan** Bun (diperlukan agar virtual hosting bekerja pada Pendekatan 2) |
| W2 | Bun `node:https` Agent custom lookup (HTTPS + TLS) | ✅ **PASS** | `200:tls-ok host=test.example:18443` — pinning + verifikasi sertifikat terhadap hostname asli |
| W3 | Bun `node:https` lookup + hostname mismatch (CA sama) | ✅ **PASS** | `ERR_TLS_CERT_ALTNAME_INVALID ... Host: test.example. is not in the cert's altnames: DNS:wrong.example` |
| B5/B5b | Bun `node:dns` `lookup` / `resolve4` | ✅ PASS | Mengembalikan `198.18.228.151` (DNS sandbox — lihat caveat §1) |
| B6 | `Bun.fetch` opsi `proxy` | ✅ **PASS** | `status=200 body=via-proxy` — opsi proxy dihormati (relevan untuk alternatif egress proxy, P2) |
| W6 | Batas streaming dihitung SETELAH dekompresi | ✅ **PASS** | Body gzip 1.004 byte (Content-Length: 1004) mengembang ke 1.000.000 byte; reader membatalkan pada **524.288 byte terdekompresi** — membuktikan `Content-Length` tidak dapat dipakai sebagai batas |

**Catatan B3 vs V1:** kegagalan B3 adalah artefak cara uji (menulis sebelum
`open`), bukan kegagalan pendekatan. Aturan implementasi yang diturunkan:
pada `Bun.connect`, tulis HANYA di dalam handler `open` (setelah handshake
TLS selesai).

---

## 4. Temuan perilaku implisit yang wajib ditangani rancangan

1. **Node menurunkan SNI dari header `Host` (T3b).** Bila `servername` tidak
   diisi, `https.request` memakai nilai header `Host` sebagai SNI (dibuktikan:
   tanpa header `Host` → `ERR_TLS_CERT_ALTNAME_INVALID`; dengan
   `Host: test.example` → berhasil, server melihat SNI `test.example`).
   Rancangan WAJIB mengisi `servername` eksplisit di semua jalur — jangan
   pernah mengandalkan perilaku implisit ini.
2. **Bun memanggil `lookup` dengan `options.all === true`.** Callback lookup
   HARUS mengembalikan array `[{address, family}]` bila `options.all` benar,
   dan alamat tunggal bila tidak. Callback yang selalu mengembalikan alamat
   tunggal gagal dengan `ERR_INVALID_IP_ADDRESS` (B1).
3. **Undici v7 mengubah API lookup** (interceptor `dns` + `.compose()`,
   argumen pertama adalah origin lengkap sebagai string). Kode yang ditulis
   untuk API undici lama akan gagal diam-diam atau terang-terangan. Ini
   alasan tambahan untuk TIDAK menjadikan undici sebagai dependensi utama
   di runtime Bun.
4. **`Bun.fetch` mengabaikan opsi `dispatcher`/`agent` secara diam-diam**
   (B2b). Jangan pernah berasumsi `fetch` global dapat dipin.
5. **DNS sandbox VM ini diintersep** (`example.com` → `198.18.228.151`,
   rentang benchmarking RFC 2544). Uji yang bergantung pada DNS publik di
   VM ini tidak valid untuk produksi; uji staging wajib memakai DNS uji
   yang dikontrol sendiri.
6. **`Content-Length` tidak mengukur ukuran setelah dekompresi** (W6:
   1.004 byte di header vs 1.000.000 byte konten). Batas sumber daya HARUS
   dihitung dari byte stream terdekompresi.

---

## 5. Yang TIDAK dapat diuji di environment ini

| # | Uji yang tidak dapat dijalankan | Kenapa | Yang dibutuhkan |
| --- | --- | --- | --- |
| U-1 | Apakah runtime artifact produksi (bukan Bun CLI di VM ini) mendukung `node:https` Agent `lookup` dengan cara yang sama | Spike dijalankan pada Bun CLI 1.4.4 di VM, bukan pada runtime artifact produksi — versi dan konfigurasi runtime produksi tidak terdokumentasi di sini | Uji P0-1a ulang di staging artifact sebelum integrasi penuh (langkah ini tetap wajib di §C v2) |
| U-2 | Apakah egress proxy / firewall produksi memblokir `169.254.169.254` atau jaringan internal | Memerlukan probing terhadap infrastruktur produksi — dilarang tanpa otorisasi | Uji staging terisolasi + dokumentasi topologi egress dari penyedia runtime |
| U-3 | Perilaku HTTP/2 pada Pendekatan 2 (otoritas `:authority`) | Server uji memakai HTTP/1.1; tidak ada server HTTP/2 dalam spike | Uji HTTP/2 di staging bila Pendekatan 2 dipakai untuk host HTTP/2 (atau paksa HTTP/1.1 untuk fetch terp-pin) |
| U-4 | Kinerja/latensi DNS resolve + pinning pada beban nyata | Spike memakai server lokal dan satu koneksi per uji | Uji beban di staging (bagian dari uji P1) |

---

## 6. Putusan akhir spike

1. **Pendekatan 1 (UTAMA):** custom lookup via **Node `http`/`https` Agent
   `lookup`** di runtime Bun — TERBUKTI (B1-fixed, W2, W3). Syarat: jangan
   memakai `fetch` global untuk jalur terp-pin; gunakan API `http`/`https`
   Node (atau wrapper tipis di atasnya) dengan `lookup` yang mengembalikan
   IP yang sudah divalidasi, dan hormati `options.all`.
2. **Pendekatan 2 (FALLBACK):** IP literal + `tls.serverName` + header
   `Host` via **`Bun.fetch`** — TERBUKTI (W1, W5). Syarat: `servername`
   SELALU diisi eksplisit; header `Host` SELALU hostname asli; sertifikat
   diverifikasi terhadap hostname asli (terbukti V3/W3).
3. **Alternatif bila keduanya gagal di staging produksi:** fetcher terpisah
   (proses Node + undici `.compose()` — TERBUKTI di Node 24) atau egress
   proxy (opsi `proxy` Bun.fetch TERBUKTI dihormati — B6; proxy harus
   memvalidasi tujuan sendiri). Keduanya dicatat sebagai rencana cadangan,
   bukan jalur utama.
4. **`fetch` global tidak pernah dipakai untuk koneksi terp-pin.**
   `resolve lalu fetch biasa` tetap dinyatakan sebagai teater keamanan.

---

*Dokumen ini adalah bukti uji spike AG-001 (7 Nov 2026). Perintah dan output
di atas adalah hasil aktual dari skrip di `/tmp/ssrf-spike`
(`node-spike.cjs`, `node-spike2.cjs`, `node-spike3.cjs`, `node-spike4.cjs`,
`bun-spike.ts`, `bun-debug.ts`, `bun-debug2.ts`, `bun-debug3.ts`,
`bun-debug4.ts`, `bun-debug5.ts`). Kegagalan awal (API undici lama, callback
lookup tanpa `all`, tulis sebelum `open`) didokumentasikan bersama
perbaikannya — bukan disembunyikan.*
