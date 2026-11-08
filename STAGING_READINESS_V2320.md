# Staging Readiness — satu halaman (v2.3.20)

**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Sumber:** `SSRF_REMEDIATION_DESIGN.md` §D.4.15 (STAGE-P01..P12) +
`SSRF_RESPONSE_MATRIX_V2320.md` §4 butir 8
**Menjawab:** butir 8 `SSRF_INDEPENDENT_AUDIT_V13.md` §8
(carry-forward dari `STAGING_READINESS_V2319.md` — tidak ada
perubahan status; dokumen V2319 dipertahankan sebagai catatan
sejarah).
**Perubahan v2.3.20:** proposal F-001..F-005 direvisi
(`SSRF_PROPOSAL_F001_F005_V2320.md` — jawaban F-038..F-043) sebagai
bahan tinjauan — revisi itu TIDAK mengubah readiness: tidak ada
staging yang tersedia, tidak ada peran yang terisi, tidak ada
bukti runtime baru. Tiga baris baru ditambahkan (9–11) untuk
prasyarat baru yang diidentifikasi audit V13: egress L0, transport
mentah, dan trusted proxy/IP. Gate **G-K** (review proposal +
keputusan K-1..K-9 + otorisasi tahap (b)) diperbarui di matriks
v2.3.20 §7.

**Bacaan:** tabel ini adalah RINGKASAN KEPUTUSAN, bukan bukti
staging. Tidak ada satu pun peran yang terisi; tidak ada staging
yang tersedia; tidak ada bukti runtime baru. Bila nama atau akses
tidak tersedia, tertulis **UNASSIGNED / BLOCKED** — tidak ada
nama yang dikarang, tidak ada staging yang diimplikasikan ada.

| # | Peran / kontrol yang dibutuhkan | Owner saat ini | Evidence yang dibutuhkan | Blocker |
| --- | --- | --- | --- | --- |
| 1 | Staging operator | **UNASSIGNED / BLOCKED** | Nama + kanal kontak operator yang dapat menjalankan ST-01..ST-12 dan menerima alert | Rama belum menunjuk operator |
| 2 | Runtime provider | **UNASSIGNED / BLOCKED** | Pernyataan tertulis provider: versi/digest runtime artifact, scope `ctx.db` (F-018), asal tarball SDK (F-030), dukungan transport mentah (Model B, F-038) | Provider belum menyatakan tertulis |
| 3 | Egress owner | **UNASSIGNED / BLOCKED** | Dokumentasi topologi egress (NAT64/DNS64, prefix, allowlist); uji S-49/S-50 tidak dapat jalan tanpa ini; **batas L0 egress (F-038, Model A)** | Pemilik topologi belum ditetapkan |
| 4 | DB/runtime owner | **UNASSIGNED / BLOCKED** | Pemilik staging DB + runtime; uji H-CAT-01..10 + H-TEN-01..05/08..10 tidak dapat jalan tanpa ini | Pemilik belum ditetapkan |
| 5 | Alert recipient (kanal + operator penerima) | **UNASSIGNED / BLOCKED** | Kanal alert + operator penerima; ST-12 hanya PASS bila alert diterima operator ≤ 5 menit dengan isi lengkap (ST-12-LAT-01..03) | Kanal + penerima belum ditetapkan |
| 6 | Rollback owner | **UNASSIGNED / BLOCKED** | Pemilik prosedur rollback; tanpa ini, tidak ada cutover yang dapat di-rollback | Pemilik belum ditetapkan |
| 7 | Bukti identitas artifact (read-only, minimum) | **NOT PROVIDED** | Versi/digest artifact + source commit + release ID dari provider; tool read-only saat ini TIDAK mengekspos versi/digest (F-021) | Provider/tool belum menyediakan jalur read-only itu |
| 8 | Bukti Link Scanner tetap nonaktif di SEMUA jalur invocation | **NOT VERIFIED / BLOCKED** | Bukti read-only kontrol disabled (a)–(e) (§D.4.22): versi/digest, action dispatch denial / pre-handler rejection, UI gate, public invocation denial, egress observation — belum satu pun terpenuhi | Tidak ada kontrol yang terbukti; `checkLink` TIDAK di-invoke untuk mengujinya |
| 9 | **BARU v2.3.20** — Egress L0 limit (F-038, Model A) | **UNASSIGNED / BLOCKED** | Konfigurasi egress limit + metrik per pemeriksaan dari provider/egress owner; tanpa ini Model A tidak memenuhi F-002 | Pemilik egress belum ditetapkan; tidak ada bukti konfigurasi |
| 10 | **BARU v2.3.20** — Bukti transport mentah didukung runtime produksi (F-038, Model B) | **NOT VERIFIED / BLOCKED** | Runtime staging membuktikan: koneksi mentah tanpa dekompresi runtime + dekompresi aplikasi menghasilkan L0 = wire dan L1 = decoded (H-RES-13); bila gagal, Model B gugur dan Model A berlaku | Runtime produksi belum tersedia untuk diuji |
| 11 | **BARU v2.3.20** — Trusted proxy + sumber IP + storage rate limit (F-041) | **UNASSIGNED / BLOCKED** | Daftar trusted proxy hop tertulis (STAGE-P03) + bukti deployment single/multi-instance + tabel `rate_limits` di DB staging (H-RES-16/17) | Operator/provider belum menyatakan topologi |

**Keputusan yang dibutuhkan sebelum validasi staging dapat
dimulai:** Rama menunjuk keenam peran (baris 1–6) + provider
menyediakan bukti baris 7–11. Sampai saat itu, STAGE-P01..P12
tetap BLOCKED dan tidak ada run staging. Prosedur, oracle
PASS/FAIL, dan bukti tiap prasyarat ada di desain §D.4.15
(STAGE-P01..P12) dan §D.4.26.
