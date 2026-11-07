# SECURITY REQUIREMENTS — AIRDROP GENERATE (AG-001)

## 1. Prinsip keamanan produk

1. **Jangan pernah menyatakan suatu link 100% aman** hanya karena tidak ditemukan
   ancaman. Vonis terbaik adalah NO KNOWN THREAT (tidak ada ancaman yang diketahui)
   — bukan "aman".
2. **Setiap hasil pemeriksaan** harus punya: dasar pemeriksaan, waktu pemeriksaan,
   sumber intelijen, dan keterbatasan analisis.
3. **Domain baru bukan otomatis scam.** Tidak masuk blacklist bukan berarti aman.
   Kontrak terverifikasi bukan otomatis bebas fungsi berbahaya. Banyaknya pengguna
   bukan bukti legitimasi.
4. **Jangan membuat fitur palsu** dan jangan mengarang hasil security scan.
5. **Secret tidak pernah** ada di frontend, di repository, atau di chat.

## 2. Standar keamanan (berlaku sejak Phase 1)

| # | Persyaratan | Status di produk saat ini | Yang harus dilakukan di stack target |
| --- | --- | --- | --- |
| 2.1 | Validasi input (URL, alamat, teks) | 🔄 Sebagian — URL divalidasi sebelum fetch; validasi format alamat kontrak jalan | Skema validasi (zod) di semua endpoint; tolak input di luar spesifikasi |
| 2.2 | Environment variables untuk secret | ✅ Tidak ada secret yang dipakai produk saat ini | `.env.local` tidak pernah di-commit; `.env.example` hanya berisi placeholder |
| 2.3 | Server-side API keys | ✅ Tidak ada API key eksternal yang dipakai | API key (Supabase service-role, dsb.) hanya di server / Edge Functions |
| 2.4 | Rate limiting | ⚠️ **Belum ada** | Middleware rate limit per IP di `/api/scan` (target awal: 20 scan/menit/IP); naikkan ke Redis bila abuse nyata |
| 2.5 | Input sanitization | 🔄 Sebagian — output scan di-escape di UI | Sanitasi semua input pengguna sebelum disimpan/ditampilkan (cegah XSS/stored injection) |
| 2.6 | Error handling | 🔄 Sebagian — kegagalan fetch ditangani dengan vonis fallback | Error tidak membocorkan stack trace / detail internal ke klien; kode error terstruktur |
| 2.7 | Logging | ⚠️ **Belum ada** | Log server-side terstruktur (waktu, endpoint, hasil, tanpa PII/URL sensitif berlebihan); retensi 30 hari |
| 2.8 | HTTPS + security headers | ✅ Disediakan runtime artifact | Di Vercel: HSTS, CSP, X-Content-Type-Options, Referrer-Policy via `next.config` |
| 2.9 | Dependensi terbarui | ⚠️ **Belum diterapkan** | `npm audit` di CI; dependabot/renovate aktif setelah repo dibuat |

## 3. Aturan SSRF — Link Scanner

Link Scanner melakukan fetch terhadap URL yang ditempel pengguna. Itu adalah
permukaan SSRF klasik. Aturan berikut **wajib** di implementasi target
(`src/scanner/ssrf-guard.ts` adalah kerangkanya) dan **harus diuji** sebelum
scanner target diumumkan.

### 3.1 Daftar blokir

| Aturan | Detail |
| --- | --- |
| Blokir localhost | `localhost`, `127.0.0.0/8`, `::1` |
| Blokir private IP | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` |
| Blokir link-local | `169.254.0.0/16` (termasuk metadata cloud `169.254.169.254`), `fe80::/10` |
| Blokir metadata endpoints | Hostname/alamat metadata cloud (mis. `metadata.google.internal`) |
| Blokir protokol non-HTTP(S) | Hanya `http:` dan `https:` yang diizinkan; tolak `file:`, `ftp:`, `gopher:`, `dict:`, dsb. |
| DNS re-resolution | Resolve hostname **sebelum** fetch, dan periksa ulang hasil resolve pada **setiap redirect** — hasil DNS tidak boleh dipercaya buta (DNS rebinding) |
| Redirect | Ikuti maksimal 6 hop; setiap hop melewati seluruh pemeriksaan di atas; rantai redirect dicatat sebagai bukti |
| Timeout | Batas waktu fetch (target: 10 detik per hop, 30 detik total) |
| Batas ukuran respons | Batas ukuran body yang dibaca (target: 2 MB) — respons lebih besar dipotong dan dicatat |

### 3.2 Status kepatuhan scanner saat ini — JUJUR

Status berikut didasarkan **hanya** pada perilaku scanner yang terdokumentasi
(hasil uji 3 URL + deskripsi aksi). Source code artifact tidak diintip, jadi
yang tidak bisa diverifikasi dinyatakan demikian.

| Aturan SSRF | Status | Bukti / alasan |
| --- | --- | --- |
| Protokol non-HTTP(S) diblokir | ⚠️ **Belum terverifikasi** | Tidak ada uji yang mendokumentasikan penolakan `file:`/`ftp:` |
| Localhost diblokir | ⚠️ **Belum terverifikasi** | Tidak ada uji terhadap `http://localhost` / `127.0.0.1` |
| Private IP diblokir | ⚠️ **Belum terverifikasi** | Tidak ada uji terhadap `192.168.x.x` / `10.x.x.x` |
| Link-local / metadata diblokir | ⚠️ **Belum terverifikasi** | Tidak ada uji terhadap `169.254.169.254` |
| DNS re-resolution per redirect | ⚠️ **Belum terverifikasi** | Redirect diikuti dan dicatat, tapi pemeriksaan DNS per hop tidak terdokumentasi |
| Redirect maks 6 hop | ✅ **Terpenuhi (terdokumentasi)** | Rantai redirect dicatat hop demi hop, maks 6 |
| Timeout | ⚠️ **Belum terverifikasi** | Tidak ada nilai timeout yang terdokumentasi |
| Batas ukuran respons | ⚠️ **Belum terverifikasi** | Tidak ada batas ukuran yang terdokumentasi |
| Rate limiting | ❌ **Belum ada** | Tidak ada pembatasan yang terdokumentasi |

**Kesimpulan:** scanner yang sudah jalan **belum boleh diasumsikan aman dari SSRF.**
Audit SSRF adalah item 2.6 di roadmap dan prasyarat sebelum scanner target
diluncurkan. Sampai audit itu selesai, jangan mempublikasikan klaim "scanner kami
anti-SSRF".

### 3.3 Uji SSRF yang wajib lolos (sebelum launch scanner target)

```
TOLAK (tanpa fetch):
  http://localhost/admin
  http://127.0.0.1:8080/
  http://192.168.1.1/
  http://10.0.0.5/
  http://169.254.169.254/latest/meta-data/
  http://metadata.google.internal/
  file:///etc/passwd
  ftp://example.com/x
  https://example.com/ → redirect ke http://127.0.0.1/  (redirect ke privat: TOLAK)

TERIMA (lalu dipindai normal):
  https://www.binance.com/
  https://ptah.trade/poa
```

## 4. Keamanan data & privasi

- URL yang dipindai pengguna **bukan** data pribadi, tetapi log scan tidak boleh
  menyimpan alamat IP mentah lebih lama dari yang diperlukan (target: hash IP
  untuk rate limiting, retensi 24 jam).
- Tidak ada seed phrase / private key yang pernah diminta atau disimpan —
  platform ini **tidak pernah** meminta kredensial wallet.
- Laporan komunitas (`security_reports`) tidak menampilkan identitas pelapor ke publik.
- Jika suatu hari ada autentikasi: password tidak pernah disimpan sendiri —
  seluruhnya lewat Supabase Auth.

## 5. Checklist pengujian keamanan sebelum peluncuran publik (Phase 5)

- [ ] Uji SSRF § 3.3 lolos semua.
- [ ] Rate limiting teruji (banjir 100 request/menit dari satu IP dibatasi).
- [ ] XSS: tempel URL + teks dengan payload `<script>` — tidak tereksekusi di UI.
- [ ] Secret scan: tidak ada API key/secret di repo (`gitleaks` atau sejenis).
- [ ] RLS: pengguna A tidak bisa membaca/menulis data pengguna B.
- [ ] Uji paralel scanner: 3 URL pembanding memberi vonis yang sama dengan artifact.
- [ ] Tidak ada klaim "100% aman" di seluruh UI/dokumen.
- [ ] Audit eksternal (firma keamanan) — dijadwalkan, bukan digantikan oleh
      checklist ini.
