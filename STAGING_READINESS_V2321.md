# Staging Readiness — satu halaman (v2.3.21)

**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Sumber:** `SSRF_REMEDIATION_DESIGN.md` §D.4.15 (STAGE-P01..P12) +
`SSRF_RESPONSE_MATRIX_V2321.md` §4 butir 7 + §10
**Menjawab:** butir 7 `SSRF_INDEPENDENT_AUDIT_V14.md` §9
(carry-forward dari `STAGING_READINESS_V2320.md` — tidak ada
perubahan status peran; dokumen V2320 dipertahankan sebagai catatan
sejarah).
**Perubahan v2.3.21:** proposal F-001..F-005 direvisi
(`SSRF_PROPOSAL_F001_F005_V2321.md` — jawaban F-044/F-045/F-046:
migrasi 0006 teks v3 + kebijakan legacy fail-closed) sebagai bahan
tinjauan — revisi itu TIDAK mengubah readiness: tidak ada staging
yang tersedia, tidak ada peran yang terisi, tidak ada bukti runtime
baru. Dua baris baru ditambahkan (12–13) untuk prasyarat baru yang
diidentifikasi audit V14: versi SQLite runtime produksi dan
keputusan kebijakan legacy. Gate **G-K** diperbarui di matriks
v2.3.21 §7 (keputusan K-1..K-5/K-7..K-10 + otorisasi tahap (b)).

**Bacaan:** tabel ini adalah RINGKASAN KEPUTUSAN, bukan bukti
staging. Tidak ada satu pun peran yang terisi; tidak ada staging
yang tersedia; tidak ada bukti runtime baru. Bila nama atau akses
tidak tersedia, tertulis **UNASSIGNED / BLOCKED** — tidak ada
nama yang dikarang, tidak ada staging yang diimplikasikan ada.

| # | Peran / kontrol yang dibutuhkan | Owner saat ini | Evidence yang dibutuhkan | Blocker |
| --- | --- | --- | --- | --- |
| 1 | Staging operator | **UNASSIGNED / BLOCKED** | Nama + kanal kontak operator yang dapat menjalankan ST-01..ST-12 dan menerima alert | Rama belum menunjuk operator |
| 2 | Runtime provider | **UNASSIGNED / BLOCKED** | Pernyataan tertulis provider: versi/digest runtime artifact, scope `ctx.db` (F-018/F-046), asal tarball SDK (F-030), dukungan transport mentah (Model B, F-038) | Provider belum menyatakan tertulis |
| 3 | Egress owner | **UNASSIGNED / BLOCKED** | Dokumentasi topologi egress (NAT64/DNS64, prefix, allowlist); uji S-49/S-50 tidak dapat jalan tanpa ini; **batas L0 egress (F-038, Model A)** | Pemilik topologi belum ditetapkan |
| 4 | DB/runtime owner | **UNASSIGNED / BLOCKED** | Pemilik staging DB + runtime; uji H-CAT-01..13 + H-TEN-01..05/08..15 + H-MIG-01..09 tidak dapat jalan tanpa ini | Pemilik belum ditetapkan |
| 5 | Alert recipient (kanal + operator penerima) | **UNASSIGNED / BLOCKED** | Kanal alert + operator penerima; ST-12 hanya PASS bila alert diterima operator ≤ 5 menit dengan isi lengkap (ST-12-LAT-01..03) | Kanal + penerima belum ditetapkan |
| 6 | Rollback owner | **UNASSIGNED / BLOCKED** | Pemilik prosedur rollback; tanpa ini, tidak ada cutover yang dapat di-rollback | Pemilik belum ditetapkan |
| 7 | Bukti identitas artifact (read-only, minimum) | **NOT PROVIDED** | Versi/digest artifact + source commit + release ID dari provider; tool read-only saat ini TIDAK mengekspos versi/digest (F-021) | Provider/tool belum menyediakan jalur read-only itu |
| 8 | Bukti Link Scanner tetap nonaktif di SEMUA jalur invocation | **NOT VERIFIED / BLOCKED** | Bukti read-only kontrol disabled (a)–(e) (§D.4.22): versi/digest, action dispatch denial / pre-handler rejection, UI gate, public invocation denial, egress observation — belum satu pun terpenuhi | Tidak ada kontrol yang terbukti; `checkLink` TIDAK di-invoke untuk mengujinya |
| 9 | Egress L0 limit (F-038, Model A) | **UNASSIGNED / BLOCKED** | Konfigurasi egress limit + metrik per pemeriksaan dari provider/egress owner; tanpa ini Model A tidak memenuhi F-002 | Pemilik egress belum ditetapkan; tidak ada bukti konfigurasi |
| 10 | Bukti transport mentah didukung runtime produksi (F-038, Model B) | **NOT VERIFIED / BLOCKED** | Runtime staging membuktikan: koneksi mentah tanpa dekompresi runtime + dekompresi aplikasi menghasilkan L0 = wire dan L1 = decoded (H-RES-13); bila gagal, Model B gugur dan Model A berlaku | Runtime produksi belum tersedia untuk diuji |
| 11 | Trusted proxy + sumber IP + storage rate limit (F-041) | **UNASSIGNED / BLOCKED** | Daftar trusted proxy hop tertulis (STAGE-P03) + bukti deployment single/multi-instance + tabel `rate_limits` di DB staging (H-RES-16/17) | Operator/provider belum menyatakan topologi |
| 12 | **BARU v2.3.21** — Versi SQLite runtime produksi (F-044, U-90) | **NOT VERIFIED / BLOCKED** | `SELECT sqlite_version()` dari runtime artifact produksi (atau pernyataan tertulis provider); lantai versi migrasi v3: >= 3.31.0 (up) / >= 3.35.0 (down); teruji VM 3.53.4 + 3.45.1 — keduanya BUKAN runtime produksi | Runtime produksi belum tersedia untuk diuji |
| 13 | **BARU v2.3.21** — Keputusan kebijakan legacy + bukti scope DB (F-046, K-10) | **UNASSIGNED / BLOCKED** | Keputusan owner K-10 (L-A/L-B/L-C); untuk L-B: pernyataan tertulis provider tentang scope `ctx.db` (single-user vs multi-user) + identitas principal; untuk L-C: bukti pemetaan owner per baris | Owner belum memutuskan; provider belum menyatakan scope |

**Keputusan yang dibutuhkan sebelum validasi staging dapat
dimulai:** Rama menunjuk keenam peran (baris 1–6) + provider
menyediakan bukti baris 7–13. Sampai saat itu, STAGE-P01..P12
tetap BLOCKED dan tidak ada run staging. Prosedur, oracle
PASS/FAIL, dan bukti tiap prasyarat ada di desain §D.4.15
(STAGE-P01..P12) dan §D.4.26.
