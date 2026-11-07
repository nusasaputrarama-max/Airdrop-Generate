# CLASSIFICATION — Sistem Klasifikasi 4 Tingkat (AG-001)

## 1. Empat tingkat klasifikasi target

| Tingkat | Label tampil (ID) | Arti | Kapan diberikan |
| --- | --- | --- | --- |
| `MALICIOUS` | BERBAHAYA | Ancaman **terkonfirmasi** — indikator cocok dengan threat intelligence terverifikasi, atau halaman terbukti meminta aksi berbahaya yang mengarah ke pengurasan/penipuan | Indikator (domain/URL/alamat) ada di `threat_intelligence` dengan `confidence = 'confirmed'` ATAU halaman mengandung drainer/signing berbahaya yang terverifikasi |
| `SUSPICIOUS` | MENCURIGAKAN | Ada sinyal risiko kuat, tetapi **belum ada bukti konfirmasi** | Skor tinggi dari kombinasi sinyal (domain sangat muda + bahasa iming-iming + connect-wallet + obfuscation, dsb.) tanpa indikator terkonfirmasi |
| `UNVERIFIED` | BELUM TERVERIFIKASI | Tidak cukup bukti untuk menilai — proyek/situs tidak dikenal, data kurang | Situs/proyek tidak ditemukan di sumber resmi, atau hasil pemeriksaan tidak meyakinkan ke arah mana pun |
| `NO_KNOWN_THREAT` | TIDAK ADA ANCAMAN DIKENAL | Tidak ditemukan ancaman yang diketahui pada pemeriksaan ini | Sinyal risiko minimal/nol. **Ini BUKAN pernyataan "aman"** — hanya "tidak ditemukan ancaman pada pemeriksaan ini" |

## 2. Aturan yang mengikat semua tingkat

1. **Jangan pernah menyatakan suatu link 100% aman** hanya karena tidak ditemukan
   ancaman. Vonis terbaik adalah NO KNOWN THREAT.
2. **Setiap hasil** wajib memuat: dasar pemeriksaan (sinyal + bukti), waktu
   pemeriksaan, sumber intelijen, dan keterbatasan analisis.
3. **Domain baru bukan otomatis scam** — umur domain muda hanya satu sinyal.
4. **Tidak masuk blacklist bukan berarti aman** — blacklist hanya berisi ancaman
   yang *sudah diketahui*.
5. **Kontrak terverifikasi bukan otomatis bebas fungsi berbahaya** — verifikasi
   source di explorer tidak sama dengan audit keamanan.
6. **Banyaknya pengguna bukan bukti legitimasi** — jumlah pengguna bisa dipalsukan.
7. **Skor bukan vonis.** Skor 0–100 adalah masukan; vonis akhir ditentukan oleh
   aturan di § 3, termasuk keberadaan indikator terkonfirmasi.

## 3. Pemetaan dari vonis saat ini (BAHAYA / WASPADA / LEBIH AMAN)

Vonis saat ini berbasis skor (0–100) + sinyal. Pemetaan ke 4 tingkat memakai
**keberadaan indikator terkonfirmasi** sebagai pembeda utama, bukan hanya skor.

| Vonis saat ini | Kondisi tambahan | Klasifikasi target |
| --- | --- | --- |
| BAHAYA | Domain/URL/alamat cocok dengan `threat_intelligence` (`confidence = 'confirmed'`) | **MALICIOUS** |
| BAHAYA | Skor ≥ 80 **tanpa** indikator terkonfirmasi (mis. kombinasi sinyal kuat) | **SUSPICIOUS** |
| BAHAYA | Skor 60–79 tanpa indikator terkonfirmasi | **SUSPICIOUS** |
| WASPADA | Skor 30–59, ada sinyal risiko (domain muda, bahasa klaim, dsb.) | **SUSPICIOUS** |
| WASPADA | Skor 30–59 tetapi sinyal hanya "tidak ada tautan resmi" / data kurang | **UNVERIFIED** |
| LEBIH AMAN | Skor < 30, tidak ada sinyal risiko berarti | **NO_KNOWN_THREAT** |

### Contoh pemetaan dari hasil uji yang sudah terverifikasi

| URL (diuji 2026-11-07) | Vonis lama | Klasifikasi target | Alasan |
| --- | --- | --- | --- |
| `scamsem.solbarn.cc` | BAHAYA, skor 100 | **MALICIOUS** | Domain `solbarn.cc` terkonfirmasi drainer (insiden 7 Nov 2026, tx `5mP1WgxW…LQMw`) |
| `www.binance.com` | LEBIH AMAN, skor 10 | **NO_KNOWN_THREAT** | Satu-satunya poin dari sinyal "tidak ada tautan resmi" (bot-challenge HTTP 202 ke fetcher) — bukan ancaman |
| `ptah.trade/poa` | WASPADA, skor 45 | **SUSPICIOUS** | Domain 17 hari (+35) + bahasa klaim (+10); 8 alamat EVM valid + tautan resmi. Proyeknya legit dan ada di katalog — contoh tepat bahwa **domain muda ≠ scam**, tetapi tetap dicatat sebagai risiko |

## 4. Ambang skor awal (dapat disesuaikan setelah data beta)

| Skor | Klasifikasi default (bila tidak ada indikator terkonfirmasi) |
| --- | --- |
| 80–100 | SUSPICIOUS |
| 60–79 | SUSPICIOUS |
| 30–59 | SUSPICIOUS atau UNVERIFIED (lihat § 3) |
| 0–29 | NO_KNOWN_THREAT |

**Catatan:** ambang ini adalah titik awal. Setelah data beta terkumpul (laporan
`false_positive` / `false_negative` dari komunitas), ambang dievaluasi ulang —
bukan diubah diam-diam.

## 5. Struktur hasil pemeriksaan (target)

Setiap baris `scan_history` wajib memuat:

```json
{
  "classification": "SUSPICIOUS",
  "legacy_verdict": "WASPADA",
  "score": 45,
  "signals": [
    {
      "key": "domain_age",
      "label": "Umur domain",
      "evidence": "Domain terdaftar 17 hari lalu (2026-10-21)",
      "score_impact": 35,
      "source": "RDAP"
    }
  ],
  "intel_sources": ["RDAP", "threat_intelligence:internal"],
  "limitations": [
    "Pemeriksaan tidak mensimulasikan transaksi",
    "Kontrak tidak dibaca mendalam (bukan audit)"
  ],
  "checked_at": "2026-11-07T10:00:00+07:00"
}
```

**Yang tidak boleh ada di hasil:** klaim "aman", "terpercaya 100%", atau skor
tanpa bukti.
