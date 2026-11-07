# AUDIT SSRF — Link Scanner Live AIRDROP GENERATE (AG-001)

- **Tanggal audit:** 7 November 2026
- **Ruang lingkup:** Link Scanner live di web artifact slug `cek-link-airdrop` (aksi server `checkLink`)
- **Metode:** Read-only. Pembacaan kode/konfigurasi artifact melalui jalur inspeksi resmi (`inspection_id` 94ecc20a-adc2-4f50-8263-82ddac2537ce, build snapshot `e9f0a944-efea-4030-bb35-12050a8833a7`) dan dokumen fondasi di `~/workspace/airdrop-generate-foundation/`. **Tidak ada live probing** terhadap endpoint internal, cloud metadata, atau sistem pihak ketiga.
- **Auditor:** auditor keamanan independen (read-only)
- **Status keseluruhan: VULNERABLE — terkonfirmasi dari kode.**

> Peringatan: guard SSRF di paket fondasi AG-001 (`src/scanner/ssrf-guard.ts`, lolos uji 25/25) **tidak ada** di kode live `server/src/actions.ts`. Jangan pernah mengklaim scanner live "anti-SSRF" berdasarkan guard fondasi itu sampai guard tersebut benar-benar diintegrasikan dan diuji di kode live.

---

## Ringkasan eksekutif

Scanner live melakukan fetch server-side atas URL arbitrer yang ditempel pengguna, **tanpa validasi DNS/IP sama sekali**. Satu-satunya gate adalah pemeriksaan skema URL (`http:`/`https:`). Tidak ada DNS resolution sebelum fetch, tidak ada blocklist localhost / IP privat / link-local / cloud metadata, tidak ada pemeriksaan ulang redirect terhadap IP tujuan, dan tidak ada penanganan bentuk IP non-standar. Ini bukan bug satu baris — ini **tidak adanya lapisan pertahanan SSRF di seluruh jalur fetch live**.

| Status | Jumlah temuan |
| --- | --- |
| VERIFIED | 1 (alur request, §1) |
| NOT VERIFIED | 2 (§4 parsial, §7) |
| VULNERABLE | 5 (§2, §3, §5, §6, §8) |

| Tingkat risiko | Jumlah |
| --- | --- |
| Tinggi | 5 (§2, §3, §5, §6, §8) |
| Sedang | 3 (§1, §4, §7) |
| Rendah | 0 |
| Kritis | 0 — **bukan** karena risikonya rendah, melainkan karena dampak penuh (apakah metadata cloud / layanan internal benar-benar dapat dijangkau dari server produksi) tidak dapat dibuktikan tanpa probing, yang sengaja tidak dilakukan. Jika topologi runtime ternyata memperbolehkan akses ke metadata cloud, temuan §5 naik menjadi **Kritis**. |

**Temuan paling penting:**

1. URL ke `http://127.0.0.1/`, `http://10.x.x.x/`, `http://192.168.x.x/`, `http://169.254.169.254/` **lolos validasi** dan akan di-fetch — VULNERABLE, Tinggi.
2. Redirect ke localhost / IP privat / metadata **tidak diperiksa ulang** — VULNERABLE, Tinggi.
3. **DNS rebinding / TOCTOU sepenuhnya terbuka** — tidak ada DNS resolution, apalagi IP pinning — VULNERABLE, Tinggi.
4. Bentuk IP non-standar (integer `2130706433`, oktal, heksadesimal `0x7f.0.0.1`, IPv4-mapped IPv6 `::ffff:127.0.0.1`, `[::1]`, userinfo) **tidak ditangani sama sekali** — VULNERABLE, Tinggi.
5. **Tidak ada rate limiting, autentikasi, atau CAPTCHA** — satu panggilan `checkLink` dapat memicu ~11 fetch dan ~132 detik wall-clock; scanner dapat dipakai sebagai oracle/proxy SSRF dan untuk DoS — VULNERABLE, Tinggi.
6. Timeout hanya 12 detik **per fetch** (bukan global); batas ukuran hanya pemotongan **pasca-download**; tidak ada cek Content-Type/Content-Length — NOT VERIFIED (parsial), Sedang.
7. Tidak ada bukti isolasi jaringan / pembatasan egress di konfigurasi yang dapat dibaca — NOT VERIFIED, Sedang.

**Data yang membuktikan fetch server-side benar-benar terjadi:** tabel `checks` berisi `final_url`, `http_status`, dan `page_title` dari fetch nyata (4 baris: solbarn.cc ×2 skor 100, sicodice.com, fungolabs.org — fungolabs.org `final_url https://fungolabs.org/`, status 200).

---

## 1. Alur request: frontend → backend

**Status: VERIFIED** (alur terkonfirmasi dari kode) — **Tingkat risiko: Sedang** (alur itu sendiri bekerja, tetapi tanpa autentikasi dan dengan gate validasi yang minimal — lihat §5 dan §8).

### Bukti kode / konfigurasi

- Frontend: `client/src/api.ts` — `createActionClient<typeof Actions>()` yang melakukan POST `{action, args}` ke `./actions`.
- Aksi server: `checkLink` di `server/src/actions.ts`, didefinisikan dengan skema `z.object({url: z.string().min(1).max(2048)})` — **tanpa autentikasi**.
- Handler: `runCheck()` → `normalizeUrl()` → `analyze()` → `Promise.all([lookupRdap(domain), fetchText(input.toString(), 400_000)])` → simpan satu baris ke tabel `checks` → kembalikan verdict / skor / sinyal ke pengguna.
- Render capture dan tabel `checks` (4 baris) mengonfirmasi jalur ini live.

### Alur lengkap

```
Pengguna menempel URL di UI Link Scanner
  └─ POST ./actions { action: "checkLink", args: { url } }     (tanpa auth)
       └─ checkLink (server/src/actions.ts)
            ├─ normalizeUrl(): tambah prefix https:// bila tanpa skema,
            │   new URL(text), TOLAK hanya bila protocol bukan http:/https:
            │   (tidak ada cek hostname, IP, port, userinfo, DNS, blocklist)
            ├─ analyze():
            │    ├─ lookupRdap(domain) — fetch https://rdap.org/domain/<domain>,
            │    │   redirect:'follow', timeout 12 dtk
            │    └─ fetchText(url, 400_000) — fetch halaman + hingga 3 <script src>
            ├─ Pindai sinyal: umur domain (RDAP), connect-wallet, signing code,
            │   bahasa iming-iming, kode tersamar, tautan resmi, alamat kontrak,
            │   daftar domain drainer (string-match hostname)
            ├─ Simpan satu baris ke tabel checks (final_url, http_status,
            │   page_title, skor, sinyal, rantai redirect)
            └─ Kembalikan ke pengguna: verdict (BAHAYA/WASPADA/LEBIH AMAN),
                skor 0–100, sinyal beserta bukti per sinyal
```

### Dampak

Alur ini adalah permukaan serangan SSRF: **setiap URL arbitrer pengguna langsung menjadi target fetch server-side**. Karena tidak ada autentikasi, siapa pun yang dapat membuka website dapat memicu fetch dari server — dampaknya dirinci di §5 dan §8.

### Rekomendasi

- Terapkan SSRF guard di `normalizeUrl()` dan di `fetchText()` **sebelum** fetch apa pun (lihat P0 di akhir laporan).
- Tambahkan autentikasi / rate limiting di `checkLink` (lihat §8, P1).

---

## 2. DNS resolution sebelum fetch & DNS rebinding (TOCTOU)

**Status: VULNERABLE** — **Tingkat risiko: Tinggi**

### Bukti kode / konfigurasi

- Seluruh `server/src/actions.ts` yang dibaca (definisi `checkLink`, `fetchText`, `lookupRdap`, `analyze`, `runCheck`) **tidak mengandung** string/logika `dns`, `lookup`, `dns.lookup`, `lookupFunction`, atau resolver apa pun.
- `package.json` tidak memuat pustaka SSRF/IP apa pun. Dependensi hanya: `@hatch/space-sdk`, `@tanstack/react-query`, `drizzle-orm`, `react`, `react-dom`, `recharts`, `zod`.
- Resolusi DNS terjadi **di dalam `fetch()` per hop**, tanpa pinning IP.

### Penjelasan

- Scanner **tidak melakukan DNS resolution sebelum mengakses URL**. Tidak ada tahap "resolve hostname → periksa alamat hasil resolve → baru fetch".
- Karena tidak ada validasi IP sama sekali, konsep TOCTOU (time-of-check vs time-of-use) di sini bahkan lebih buruk dari kasus klasik: **tidak ada check yang bisa di-bypass — tidak ada check sama sekali**. IP saat "validasi" (tidak ada) dan IP saat koneksi dapat berbeda, dan setiap hop redirect serta setiap fetch `<script src>` me-resolve ulang hostname secara independen.
- Skenario DNS rebinding klasik berlaku penuh: hostname publik yang lolos (tidak ada yang memeriksa hasil resolusinya) dapat me-resolve ke `127.0.0.1` pada saat fetch — misalnya lewat DNS dengan TTL sangat pendek, atau hostname yang memang mengarah ke IP privat.

### Dampak

- **Pengguna:** hasil scan dapat dimanipulasi — penyerang dapat menyajikan konten berbeda ke scanner dibanding ke pengguna (konten yang dipindai bukan konten yang dilihat korban).
- **Infrastruktur:** layanan internal yang hanya dapat dijangkau dari jaringan server dapat diakses lewat hostname yang me-resolve ke alamat internal, tanpa satu pun pemeriksaan yang menghalangi.

### Rekomendasi

- Resolve hostname lewat DNS **sebelum** koneksi (mis. `dns.lookup` / `lookupFunction` pada HTTP agent), periksa **semua** alamat hasil resolve (A dan AAAA) terhadap daftar blokir, dan **pin IP hasil resolve untuk koneksi itu** (jangan resolve ulang di dalam fetch).
- Ulangi pemeriksaan ini pada **setiap hop redirect** dan setiap fetch `<script src>`.
- Tolak bila salah satu alamat hasil resolve masuk rentang terlarang, atau bila hostname tidak dapat di-resolve.

---

## 3. Pemeriksaan ulang setiap redirect

**Status: VULNERABLE** — **Tingkat risiko: Tinggi**

### Bukti kode / konfigurasi

- `fetchText()` di `server/src/actions.ts`:
  - `fetch(current, {headers: {user-agent: UA, accept: 'text/html,application/xhtml+xml,*/*'}, redirect: 'manual', signal: AbortSignal.timeout(12000)})`
  - Loop `for (hop = 0; hop <= 6; hop++)`: bila status 301/302/303/307/308, ambil header `location`, lalu `current = new URL(loc, current).toString()`, lanjutkan.
  - **Tidak ada validasi ulang protokol / host / IP pada `Location`.**
  - Yang dicatat hanya rantai hostname dan sinyal `known_bad_redirect` / `redirect` bila domain akhir berbeda. Bila hop ke-7 masih redirect, kembalikan `null` (diperlakukan tidak terjangkau).
- Pemeriksaan domain yang ADA hanya berbasis string hostname: `KNOWN_BAD_DOMAINS = ['solbarn.cc', 'sharkmoon.tech']` dicek via `hostname === d || hostname.endsWith('.' + d) || domain === d` pada URL awal dan pada `page.chain` tiap hop. Tidak ada entri localhost, `127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `::1`, `fe80::/10`, `fc00::/7`, atau `169.254.169.254` di seluruh `actions.ts` yang dibaca.
- `lookupRdap()` memakai `redirect: 'follow'` (otomatis, tanpa validasi hop); host-nya tetap `rdap.org` dan domain berasal dari `registrableDomain(hostname)`, sehingga vektor ini terbatas — tetapi tetap tanpa validasi redirect.

### Penjelasan

- Redirect **diikuti** (maks 6 hop — bagian ini VERIFIED) dan **dicatat**, tetapi **tidak diperiksa ulang**. `Location` diterima apa adanya dan langsung di-fetch pada hop berikutnya.
- Redirect ke `http://127.0.0.1/`, `http://169.254.169.254/latest/meta-data/`, atau `http://192.168.1.1/` akan diikuti tanpa satu pun pemeriksaan.
- **Vektor SSRF kedua — fetch `<script src>`:** `analyze()` mengambil hingga 3 `<script src>` dari halaman (`slice(0, 3)`), me-resolve dengan `new URL(src, page.finalUrl)`, lalu `fetchText(abs, 300_000)` dan menggabungkan isinya ke haystack untuk dipindai. **Chain redirect dari fetch script ini dibuang** (hanya `s.text` dipakai), sehingga cek `known_bad_redirect` tidak berlaku untuk script. Halaman publik dapat mengarahkan scanner ke URL internal sebagai `script src`.

### Dampak

- **Pengguna:** situs yang tampak aman di URL awal dapat me-redirect scanner ke konten berbahaya/internal, dan vonis yang ditampilkan tidak mencerminkan URL yang benar-benar di-fetch.
- **Infrastruktur:** penyerang cukup meng-host halaman publik yang me-redirect (atau memuat script) ke endpoint internal — tidak perlu meyakinkan korban mengunjungi URL internal secara langsung.

### Rekomendasi

- Terapkan SSRF guard yang **sama** pada **setiap hop redirect** sebelum fetch berikutnya: validasi ulang protokol (`http:`/`https:` saja), hostname/IP, dan port yang diizinkan.
- Terapkan guard yang sama pada fetch `<script src>`, dan **jangan buang chain redirect script** — terapkan cek known-bad pada chain tersebut.
- Tolak skema non-`http(s)` pada `Location`, tolak userinfo, dan hentikan rantai (kembalikan hasil "redirect ditolak" sebagai sinyal, bukan sebagai "tidak terjangkau" yang samar).

---

## 4. Timeout, ukuran respons, jumlah redirect, jenis konten

**Status: NOT VERIFIED (parsial)** — **Tingkat risiko: Sedang**

Bagian yang terverifikasi dan bagian yang tidak:

| Batas | Nilai terdokumentasi di kode | Status |
| --- | --- | --- |
| Timeout per fetch | `AbortSignal.timeout(12000)` — 12 detik per `fetch()` (halaman, script, RDAP) | ✅ VERIFIED |
| Timeout global per `checkLink` | **Tidak ada** | ❌ Tidak ditemukan |
| Jumlah redirect | Maks 6 hop (`for (hop = 0; hop <= 6; hop++)`, hop ke-7 → `null`) | ✅ VERIFIED |
| Batas ukuran respons | **Tidak ada batas saat streaming.** `(await res.text()).slice(0, cap)` — cap 400.000 karakter (halaman) / 300.000 (script) adalah **pemotongan pasca-download**, bukan abort streaming | ❌ Tidak ditemukan sebagai batas |
| Batas Content-Length | **Tidak ada** pengecekan header `Content-Length` | ❌ Tidak ditemukan |
| Jenis konten (Content-Type) | **Tidak ada** pengecekan `Content-Type` — `res.text()` untuk status apa pun kecuali redirect | ❌ Tidak ditemukan |

### Penjelasan

- Worst-case satu panggilan `checkLink`: 7 fetch halaman (awal + 6 redirect) × 12 detik + 3 fetch script × 12 detik + RDAP 12 detik (paralel dengan halaman) = **~120–132 detik wall-clock**, tanpa timeout global.
- Karena `.text()` memuat **seluruh body ke memori sebelum dipotong**, respons berukuran sangat besar tetap diunduh penuh terlebih dahulu — cap hanya membatasi berapa banyak yang disimpan/dipindai, bukan berapa banyak yang diunduh.

### Dampak

- **Pengguna:** scan terhadap URL lambat/besar dapat menggantung hingga ~2 menit; pengalaman pengguna buruk dan hasil dapat menyesatkan (timeout parsial diperlakukan sebagai "tidak terjangkau").
- **Infrastruktur:** konsumsi memori dan koneksi server dapat ditekan oleh respons raksasa atau server lambat (slow response); lihat juga §8.

### Rekomendasi

- Timeout global per `checkLink` (~15–20 detik total), bukan hanya per fetch.
- Abort streaming saat `Content-Length` melebihi batas atau body yang terbaca melebihi ~400 KB.
- Tolak atau abaikan `Content-Type` non-HTML/teks (mis. `application/octet-stream`, video, arsip raksasa) — atau setidaknya jangan memindai isinya sebagai HTML.

---

## 5. Kemungkinan mengakses endpoint internal lewat URL yang dimanipulasi

**Status: VULNERABLE** — **Tingkat risiko: Tinggi** (naik menjadi **Kritis** bila terbukti metadata cloud / layanan internal dapat dijangkau dari server produksi — hal ini tidak dapat dibuktikan tanpa probing, yang sengaja tidak dilakukan).

### Bukti kode / konfigurasi

- `normalizeUrl()` (`server/src/actions.ts`): tambah prefix `https://` bila tanpa skema, `new URL(text)`, lalu tolak **hanya** bila protocol bukan `http:` atau `https:`. Tidak ada pemeriksaan hostname, IP, port, userinfo, DNS, atau allowlist/blocklist. Komentar header file sendiri hanya menyebut fetch server-side, "never executing its JS", tanpa menyebut SSRF.
- Tidak ada entri localhost / IP privat / link-local / metadata di seluruh `actions.ts` yang dibaca (lihat §3).
- Fetch hanya GET dengan header UA/Accept tetap, tanpa cookie/header auth yang diteruskan — ini **membatasi** (bukan menghilangkan) dampak: endpoint metadata cloud berbasis GET seperti `169.254.169.254/latest/meta-data/` tetap dapat dijangkau.

### Vektor yang terbuka

| Vektor | Contoh | Status |
| --- | --- | --- |
| URL langsung ke loopback | `http://127.0.0.1:8080/admin`, `http://localhost/` | Lolos, akan di-fetch |
| URL langsung ke private IP | `http://10.0.0.5/`, `http://192.168.1.1/`, `http://172.16.0.1/` | Lolos, akan di-fetch |
| Cloud metadata | `http://169.254.169.254/latest/meta-data/`, `http://metadata.google.internal/` | Lolos, akan di-fetch |
| Redirect ke internal | Halaman publik → 302 → `http://127.0.0.1/` | Lolos, akan diikuti (§3) |
| `<script src>` ke internal | `<script src="http://10.0.0.5/x.js">` di halaman target | Lolos, akan di-fetch (§3) |
| URL shortener / redirector | Shortener publik yang me-redirect ke internal | Lolos (redirect tidak divalidasi) |

### Kebocoran respons internal (oracle)

Hasil fetch **tidak** dikembalikan verbatim, tetapi dikembalikan/disimpan **sebagian** — dan itu sudah cukup sebagai oracle:

- `page_title` — regex `<title>` hingga **160 karakter**,
- `http_status`,
- `final_url`,
- rantai hostname di detail sinyal redirect ("Rantai redirect: …"),
- alamat kontrak yang diekstrak (regex `0x` + 40 hex dan base58 36–44 karakter, maks 8) — semuanya tersimpan di tabel `checks` dan dikembalikan ke pemanggil.

Ini memberi penyerang oracle *reachability / status / title / kontrak* untuk memetakan layanan internal, dan kanal eksfiltrasi terbatas bila endpoint internal mengembalikan `<title>` atau string mirip alamat. Kredensial IAM dari metadata cloud tidak bocor verbatim, tetapi kredensial berbentuk base58/hex panjang — atau yang terbungkus `<title>` pada endpoint internal — dapat bocor sebagian. (Hipotesis ini memerlukan pengujian terkontrol di staging, bukan produksi.)

### Dampak

- **Pengguna:** data internal organisasi yang meng-host scanner dapat bocor secara tidak langsung; kepercayaan terhadap platform rusak bila scanner dipakai menyerang infrastruktur lain.
- **Infrastruktur:** pemetaan layanan internal, potensi pencurian kredensial cloud (bila metadata dapat dijangkau), dan scanner berubah menjadi alat serang terhadap jaringan internal.

### Rekomendasi

- P0: integrasikan SSRF guard (DNS/IP + pinning) ke `fetchText()` untuk URL awal, setiap hop redirect, dan setiap fetch script; tolak hostname literal IP privat/loopback/link-local dan hostname `localhost`/`metadata.*` sejak `normalizeUrl()`.
- Jangan simpan/kembalikan `page_title` dan kontrak dari host yang diblokir; untuk URL yang ditolak guard, kembalikan sinyal "ditolak oleh kebijakan keamanan" tanpa `http_status`/`final_url` hasil fetch internal.

---

## 6. Penanganan IPv4, IPv6, IPv4-mapped IPv6, encoding IP, hostname privat

**Status: VULNERABLE** — **Tingkat risiko: Tinggi**

### Bukti kode / konfigurasi

- **Tidak ada parsing/validasi IP apa pun** di `actions.ts`: tidak ada `dns`, `ipaddr`, `isPrivate`, `isLoopback`, atau logika sejenis. Tidak ada dependensi validasi IP di `package.json`.

### Bentuk yang tidak ditangani (semuanya lolos `normalizeUrl` selama protokolnya `http`/`https`)

| Bentuk | Contoh | Keterangan |
| --- | --- | --- |
| IPv4 desimal biasa | `127.0.0.1` | Tidak diblokir |
| IPv4 integer | `2130706433` (= 127.0.0.1) | Tidak diblokir — `new URL()`/resolver dapat mengartikannya sebagai 127.0.0.1 |
| IPv4 oktal | `0177.0.0.1` | Tidak diblokir |
| IPv4 heksadesimal | `0x7f.0.0.1`, `0x7f000001` | Tidak diblokir |
| IPv4 campuran / pendek | `127.1`, `0.0.0.0` | Tidak diblokir |
| IPv6 loopback | `http://[::1]/` | Tidak diblokir |
| IPv6 link-local | `http://[fe80::1]/` | Tidak diblokir |
| IPv4-mapped IPv6 | `http://[::ffff:127.0.0.1]/` | Tidak diblokir |
| Userinfo | `https://x@127.0.0.1/` | Tidak diblokir (userinfo dapat mengaburkan host di mata manusia) |
| Hostname privat | `localhost`, `metadata.google.internal`, hostname yang me-resolve ke IP privat | Tidak diblokir; tidak ada DNS resolution (§2) |

### Dampak

- **Pengguna & infrastruktur:** seluruh daftar blokir berbasis string hostname menjadi tidak berguna — penyerang cukup menulis alamat internal dalam bentuk lain untuk lolos. Ini adalah cara klasik mem-bypass filter SSRF yang naif.

### Rekomendasi

- Normalisasi dan uraikan **semua** bentuk IP sebelum pemeriksaan: integer, oktal, heksadesimal, bentuk pendek, IPv6 (termasuk IPv4-mapped `::ffff:a.b.c.d`), dan notasi `[::1]`.
- Tolak userinfo pada URL.
- Periksa **semua** alamat hasil DNS resolve (A dan AAAA), termasuk hasil yang berupa IPv4-mapped IPv6 — konversikan ke IPv4 setara sebelum dicocokkan ke daftar blokir.
- Gunakan pustaka parsing IP yang teruji (atau guard `ssrf-guard.ts` AG-001 yang sudah menangani bentuk-bentuk ini secara eksplisit) — jangan menulis parser sendiri dari nol tanpa uji.

---

## 7. Isolasi jaringan / pembatasan egress pada server scanner

**Status: NOT VERIFIED** — **Tingkat risiko: Sedang**

### Bukti kode / konfigurasi

- `space.json` hanya berisi `entry` / `name` / `platformVersion` / `runtime` / `slug` — **tanpa** egress allowlist, proxy, atau sandbox.
- `package.json` dan `bunfig.toml` tidak berisi konfigurasi jaringan / proxy / firewall.
- Tidak ditemukan dokumen infra (firewall, security group, VPC, egress proxy, konfigurasi hosting) di bundle bukti inspeksi.

### Penjelasan

Status ini adalah **NOT VERIFIED** (tidak ada bukti), **bukan** bukti tidak ada. Dari sisi kode aplikasi, fetch keluar tanpa pembatasan apa pun (§1–§6). Apakah ada pembatasan di level infrastruktur runtime (mis. server berjalan di jaringan terisolasi, metadata dimatikan, egress dibatasi) **tidak dapat dipastikan** dari bukti yang tersedia.

### Dampak

- **Infrastruktur:** bila tidak ada isolasi egress, seluruh kerentanan §2–§6 dapat dieksploitasi penuh. Bila ada isolasi, dampak berkurang — tetapi **kerentanan kode tetap ada** dan akan ikut terbawa saat migrasi ke stack target (Vercel/Supabase) bila guard tidak diimplementasikan di kode.
- Ketergantungan pada isolasi infra yang tidak terdokumentasi adalah asumsi yang berbahaya.

### Rekomendasi

- Dapatkan dan dokumentasikan topologi egress runtime saat ini (apakah ada firewall/egress proxy, apakah `169.254.169.254` dapat dijangkau dari server — diuji di **staging**, bukan produksi).
- Di stack target: isolasi egress di level infra (allowlist DNS / proxy egress, blokir metadata di security group/firewall, jalankan fetcher di subnet tanpa akses internal) — sebagai **lapisan kedua**, bukan pengganti guard di kode.
- Logging/alert untuk setiap percobaan SSRF yang diblokir guard.

---

## 8. Denial of service & penyalahgunaan scanner sebagai proxy

**Status: VULNERABLE** — **Tingkat risiko: Tinggi**

### Bukti kode / konfigurasi

- **Tidak ada rate limiting, autentikasi, CAPTCHA, atau batas konkurensi** pada `checkLink`: skema request hanya `url` min 1 maks 2048 karakter; tidak ada kode rate-limit, kuota per IP/pengguna, atau antrean di `actions.ts`.
- Aksi `listChecks` / `deleteCheck` juga tanpa auth (di luar ruang lingkup SSRF langsung, dicatat sebagai konteks penyalahgunaan).
- Satu panggilan `checkLink` dapat memicu **~11 fetch** (7 halaman + 3 script + 1 RDAP) dengan worst-case **~120–132 detik** wall-clock (§4), tanpa timeout global dan tanpa batas panggilan.
- Tidak ada batasan ukuran/kuantitas fetch script selain `slice(0, 3)` dan cap pasca-download.

### Vektor penyalahgunaan

| Vektor | Cara | Dampak |
| --- | --- | --- |
| Banjir request | Panggilan `checkLink` berulang tanpa rate limit | CPU/memori/koneksi server habis; tagihan egress membengkak |
| Slow response / respons raksasa | URL ke server lambat atau file raksasa | Satu scan menahan worker ~132 detik; `.text()` memuat body penuh ke memori |
| Redirect loop (di luar batas) | Rantai redirect panjang | Dibatasi 6 hop (VERIFIED) — tetapi 6 hop × 12 detik tetap mahal |
| SSRF oracle | Perbedaan sinyal reachable / `http_status` / waktu respons / `final_url` antara target internal yang terbuka vs tertutup | Pemetaan layanan internal dari luar (hipotesis yang masuk akal dari kode; belum diuji live) |
| Scanner sebagai proxy | Meminta scan atas URL target, lalu membaca `page_title` / `http_status` / `final_url` / kontrak hasil fetch | Eksfiltrasi sebagian dari endpoint internal; penyamaran asal request (IP server, bukan IP penyerang) |
| Spam riwayat | Setiap scan menyimpan baris ke tabel `checks` | Database membengkak; riwayat publik tercemar |

### Dampak

- **Pengguna:** layanan melambat / tidak responsif saat diserang; hasil scan tercemar oleh data serangan.
- **Infrastruktur:** kehabisan sumber daya, biaya egress, dan risiko pemblokiran IP server oleh pihak ketiga karena dianggap sebagai sumber serangan.

### Rekomendasi

- Rate limit per IP (mis. beberapa cek per menit) + CAPTCHA / batas konkurensi dan antrean.
- Timeout global per `checkLink` dan abort streaming (§4).
- Jangan simpan baris `checks` untuk URL yang ditolak guard; batasi ukuran/kuantitas fetch script.
- Logging + alert untuk pola banjir dan percobaan SSRF yang diblokir.

---

## Rekomendasi perbaikan (diprioritaskan)

**Catatan:** diskusikan dan setujui dulu sebelum implementasi. Jangan deploy perbaikan tanpa uji regresi pada 3 URL acuan: `scamsem.solbarn.cc` tetap BAHAYA 100, `binance.com` tetap LEBIH AMAN, `ptah.trade/poa` tetap WASPADA.

### P0 — Wajib sebelum scanner dipakai publik lebih luas

| # | Perbaikan | Menutup temuan | Estimasi dampak |
| --- | --- | --- | --- |
| P0-1 | Integrasikan SSRF guard AG-001 (`src/scanner/ssrf-guard.ts`, sudah teruji 25/25) ke `fetchText()` live: resolve DNS sebelum koneksi, tolak loopback / privat (RFC1918) / link-local (`169.254.0.0/16`, `fe80::/10`) / multicast / `0.0.0.0/8` / metadata (`169.254.169.254`, `metadata.google.internal`, `fd00:ec2::254`); **pin IP hasil resolve** untuk koneksi itu; validasi **semua** alamat hasil resolve (A dan AAAA, termasuk IPv4-mapped IPv6) | §2, §5, §6 | Menutup jalur SSRF utama; risiko regresi: URL publik yang sah harus tetap lolos — uji paralel 3 URL acuan |
| P0-2 | Terapkan guard yang sama pada **setiap hop redirect** (validasi ulang protokol `http`/`https` + hostname/IP + port sebelum fetch berikutnya) dan pada fetch `<script src>` (termasuk cek known-bad pada chain script yang selama ini dibuang); tolak skema non-`http(s)` pada `Location`; tolak userinfo; normalisasi/urai bentuk IP non-desimal (integer, oktal, heksadesimal) sebelum pemeriksaan | §3, §5, §6 | Menutup jalur SSRF via redirect & script — dua jalur yang saat ini terbuka penuh |
| P0-3 | Tolak URL yang hostname-nya literal IP privat/loopback/link-local dan hostname `localhost`/`metadata.*` sejak `normalizeUrl()` | §5, §6 | Pertahanan lapis pertama yang murah; mencegah URL internal paling sederhana |

### P1 — Penting, segera setelah P0

| # | Perbaikan | Menutup temuan | Estimasi dampak |
| --- | --- | --- | --- |
| P1-1 | Timeout global per `checkLink` (~15–20 detik total); abort streaming saat `Content-Length` melebihi batas atau body melebihi ~400 KB; tolak/abaikan `Content-Type` non-HTML/teks | §4, §8 | Menghentikan DoS via respons lambat/raksasa; scan menjadi cepat dan dapat diprediksi |
| P1-2 | Rate limit per IP (mis. beberapa cek per menit) + CAPTCHA / batas konkurensi dan antrean; jangan simpan/kembalikan `page_title` dan kontrak dari host yang diblokir | §8, §5 | Menghentikan banjir dan penyalahgunaan sebagai oracle/proxy |
| P1-3 | Batasi port tujuan ke 80/443; batasi ukuran/kuantitas fetch script | §5, §8 | Mempersempit permukaan serangan; mencegah pemindaian port internal |

### P2 — Penguatan infrastruktur & proses

| # | Perbaikan | Menutup temuan | Estimasi dampak |
| --- | --- | --- | --- |
| P2-1 | Isolasi egress di level infra (allowlist DNS / proxy egress, blokir metadata di security group/firewall, jalankan fetcher di subnet tanpa akses internal) | §7 | Lapisan pertahanan kedua bila guard kode lolos; perlu akses infra |
| P2-2 | Logging/alert untuk percobaan SSRF yang diblokir + pola banjir | §7, §8 | Deteksi dini penyalahgunaan; bukti untuk evaluasi berikutnya |
| P2-3 | Uji regresi + uji blokir di **staging** sebelum rilis (localhost, `127.0.0.1`, `0x7f.0.0.1`, `2130706433`, `[::1]`, `[::ffff:127.0.0.1]`, `169.254.169.254`, redirect ke privat, DNS rebinding), lalu minta evaluasi ulang desain oleh ChatGPT seperti yang direncanakan pemilik | Semua | Memastikan perbaikan benar-benar bekerja dan tidak merusak URL publik yang sah |

### Yang harus dipertahankan selama perbaikan

- Perilaku scanner yang sudah terbukti benar untuk URL publik: deteksi domain drainer `solbarn.cc`/`sharkmoon.tech` (termasuk di rantai redirect), pencatatan rantai redirect maks 6 hop, RDAP umur domain, pemindaian wallet-connect/signing/kontrak/bait/obfuscation, dan skoring transparan per sinyal.
- Data yang ada: tabel `checks` (4 baris histori, termasuk 2× solbarn.cc skor 100) dan katalog `projects` (13 proyek) — perbaikan SSRF tidak boleh menghapus histori atau mengubah verdict/skor yang sudah tersimpan untuk URL publik.
- Batas yang sudah ada dan terbukti: redirect maks 6 hop dan timeout per-fetch 12 detik sebagai **lantai** — perbaikan harus menambah guard, bukan melonggarkan batas ini; jangan mengganti fetch manual dengan `redirect: 'follow'` tanpa validasi.
- Pisahkan guard fondasi AG-001 dari klaim live: jangan menyatakan scanner live aman berdasarkan guard di paket fondasi sampai guard yang sama benar-benar diintegrasikan dan diuji di `server/src/actions.ts`.

---

## Ruang lingkup & keterbatasan audit

- **Read-only.** Audit ini berbasis pembacaan kode/konfigurasi melalui jalur inspeksi resmi. Tidak ada kode yang diubah, tidak ada data yang diubah, tidak ada akun/kredensial yang dibuat.
- **Tanpa live probing.** Pengujian terhadap endpoint internal (`http://localhost`, `http://127.0.0.1`, `http://169.254.169.254`, metadata cloud) **sengaja tidak dilakukan** sesuai instruksi dan tanpa otorisasi. Status VULNERABLE disimpulkan dari pembacaan kode, bukan dari eksploitasi yang berhasil.
- **Topologi/infra runtime tidak diketahui.** Tidak ada dokumen firewall, security group, VPC, egress proxy, atau konfigurasi hosting di bundle bukti. Tidak dapat dipastikan apakah `169.254.169.254` atau layanan internal benar-benar dapat dijangkau dari server produksi. Bila server terisolasi penuh atau metadata dimatikan, dampak SSRF berkurang — tetapi kerentanan kode tetap ada dan akan ikut terbawa ke stack target bila guard tidak diimplementasikan.
- **Log runtime / metrik penyalahgunaan tidak tersedia.** Tidak ada akses ke log server atau data rate-limit di luar kode; tidak dapat dipastikan apakah scanner sudah disalahgunakan.
- **Perilaku resolver DNS server tidak diketahui.** Tidak ada bukti apakah ada DNS filtering di level resolver; dari sisi kode aplikasi, tidak ada filtering.
- **Pemetaan baris-per-baris tidak lengkap.** Lokasi baris persis pemanggilan `api.checkLink` di `client/src/App.tsx` (file ~75 KB) tidak dipetakan baris-per-baris; alur frontend dibuktikan lewat `client/src/api.ts` dan definisi aksi `checkLink`, yang sudah cukup untuk diagnosis jalur ini.
- **Hipotesis yang ditandai sebagai hipotesis** (bukan observasi): kemungkinan server runtime berjalan di jaringan yang sama dengan layanan internal lain; kemungkinan oracle port/layanan internal lewat perbedaan sinyal; kemungkinan kebocoran kredensial sebagian lewat `<title>`/kontrak. Ketiganya memerlukan pengujian terkontrol di staging, bukan produksi.
- **Audit ini bukan pengganti audit eksternal** oleh firma keamanan (dijadwalkan di Phase 5) dan bukan penetration test.

---

*Dokumen ini adalah laporan audit read-only AG-001. Perbaikan apa pun harus didiskusikan dengan pemilik (dan dievaluasi ChatGPT sesuai rencana pemilik) sebelum diimplementasikan.*
