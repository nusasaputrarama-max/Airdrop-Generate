# Staging Readiness — satu halaman (v2.3.22)

**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED — NOT READY FOR COMMUNITY BETA
**Sumber:** `SSRF_REMEDIATION_DESIGN.md` §D.4.15 (STAGE-P01..P12) +
`SSRF_RESPONSE_MATRIX_V2322.md` §2/§4/§10 +
`DEPLOYMENT_FEASIBILITY_V2322.md` §5
**Menjawab:** butir 7 `SSRF_INDEPENDENT_AUDIT_V15.md` §9
(carry-forward dari `STAGING_READINESS_V2321.md` — tidak ada
perubahan status peran; dokumen V2321 dipertahankan sebagai catatan
sejarah).
**Perubahan v2.3.22:** F-044/F-045/F-046 dicatat "addressed in
v2.3.21, carried forward and verified by cross-reference" (bukan
pengulangan tes); F-047 dibuktikan BLOCKED oleh clean-clone build
(install FAIL tanpa `/opt/hatch`; `buildClient` menolak build tangan
— U-97); F-048 addressed (README direkonsiliasi); branch `dev`
dibuat (BACKLOG.md, `bd5d8fa` + `f25bb24`) — backlog saja, tanpa kode;
paket beta diverifikasi di branch `beta-readiness` (BLOCKED);
ChatGPT menjawab diskusi link-jadi (rangking C/A/D/B, commit
`59b02d0`). Empat baris baru ditambahkan (14–17) untuk prasyarat
baru yang diidentifikasi audit V15 + direktif `c53fd73` + jawaban
GPT. Gate **G-K** diperbarui di matriks v2.3.22 §7 (keputusan
K-1..K-5/K-7..K-10 + otorisasi tahap (b) + konfirmasi otorisasi
implementasi di `dev` (U-99) + jawaban T-01 + pernyataan provider SDK).

**Bacaan:** tabel ini adalah RINGKASAN KEPUTUSAN, bukan bukti
staging. Tidak ada satu pun peran yang terisi; tidak ada staging
yang tersedia; tidak ada bukti runtime baru. Bila nama atau akses
tidak tersedia, tertulis **UNASSIGNED / BLOCKED** — tidak ada
nama yang dikarang, tidak ada staging yang diimplikasikan ada.

| # | Peran / kontrol yang dibutuhkan | Owner saat ini | Evidence yang dibutuhkan | Blocker |
| --- | --- | --- | --- | --- |
| 1 | Staging operator | **UNASSIGNED / BLOCKED** | Nama + kanal kontak operator yang dapat menjalankan ST-01..ST-12 dan menerima alert | Rama belum menunjuk operator |
| 2 | Runtime provider | **UNASSIGNED / BLOCKED** | Pernyataan tertulis provider: versi/digest runtime artifact, scope `ctx.db` (F-018/F-046), asal tarball SDK (F-030), dukungan transport mentah (Model B, F-038), kontrak build client (U-97) | Provider belum menyatakan tertulis |
| 3 | Egress owner | **UNASSIGNED / BLOCKED** | Dokumentasi topologi egress (NAT64/DNS64, prefix, allowlist); uji S-49/S-50 tidak dapat jalan tanpa ini; **batas L0 egress (F-038, Model A)** | Pemilik topologi belum ditetapkan |
| 4 | DB/runtime owner | **UNASSIGNED / BLOCKED** | Pemilik staging DB + runtime; uji H-CAT-01..13 + H-TEN-01..05/08..15 + H-MIG-01..09 tidak dapat jalan tanpa ini | Pemilik belum ditetapkan |
| 5 | Alert recipient (kanal + operator penerima) | **UNASSIGNED / BLOCKED** | Kanal alert + operator penerima; ST-12 hanya PASS bila alert diterima operator ≤ 5 menit dengan isi lengkap (ST-12-LAT-01..03) | Kanal + penerima belum ditetapkan |
| 6 | Rollback owner | **UNASSIGNED / BLOCKED** | Pemilik prosedur rollback; tanpa ini, tidak ada cutover yang dapat di-rollback | Pemilik belum ditetapkan |
| 7 | Bukti identitas artifact (read-only, minimum) | **NOT PROVIDED** | Versi/digest artifact + source commit + release ID dari provider; tool read-only saat ini TIDAK mengekspos versi/digest (F-021) | Provider/tool belum menyediakan jalur read-only itu |
| 8 | Bukti Link Scanner tetap nonaktif di SEMUA jalur invocation | **NOT VERIFIED / BLOCKED** | Bukti read-only kontrol disabled (a)–(e) (§D.4.22): versi/digest, action dispatch denial / pre-handler rejection, UI gate, public invocation denial, egress observation — belum satu pun terpenuhi | Tidak ada kontrol yang terbukti; `checkLink` TIDAK di-invoke untuk mengujinya |
| 9 | Egress L0 limit (F-038, Model A) | **UNASSIGNED / BLOCKED** | Konfigurasi egress limit + metrik per pemeriksaan dari provider/egress owner; tanpa ini Model A tidak memenuhi F-002 | Pemilik egress belum ditetapkan; tidak ada bukti konfigurasi |
| 10 | Bukti transport mentah didukung runtime produksi (F-038, Model B) | **NOT VERIFIED / BLOCKED** | Runtime staging membuktikan: koneksi mentah tanpa dekompresi runtime + dekompresi aplikasi menghasilkan L0 = wire dan L1 = decoded (H-RES-13); bila gagal, Model B gugur dan Model A berlaku | Runtime produksi belum tersedia untuk diuji |
| 11 | Trusted proxy + sumber IP + storage rate limit (F-041) | **UNASSIGNED / BLOCKED** | Daftar trusted proxy hop tertulis (STAGE-P03) + bukti deployment single/multi-instance + tabel `rate_limits` di DB staging (H-RES-16/17) | Operator/provider belum menyatakan topologi |
| 12 | Versi SQLite runtime produksi (F-044, U-90) | **NOT VERIFIED / BLOCKED** | `SELECT sqlite_version()` dari runtime artifact produksi (atau pernyataan tertulis provider); lantai versi migrasi v3: >= 3.31.0 (up) / >= 3.35.0 (down); teruji VM 3.53.4 + 3.45.1 — keduanya BUKAN runtime produksi | Runtime produksi belum tersedia untuk diuji |
| 13 | Keputusan kebijakan legacy + bukti scope DB (F-046, K-10) | **UNASSIGNED / BLOCKED** | Keputusan owner K-10 (L-A/L-B/L-C); untuk L-B: pernyataan tertulis provider tentang scope `ctx.db` (single-user vs multi-user) + identitas principal; untuk L-C: bukti pemetaan owner per baris | Owner belum memutuskan; provider belum menyatakan scope |
| 14 | **BARU v2.3.22** — SDK redistributable + kontrak build client (F-047, U-97, M-1/M-2) | **NOT VERIFIED / BLOCKED** | Tarball SDK yang sah + dapat diakses builder luar ATAU pernyataan tertulis provider tentang distribusi SDK + kontrak runtime/build; pernyataan bahwa `buildClient()` memang hanya boleh jalan lewat tooling artifact (atau cara reproduksinya). Bukti v2.3.22: npm 404; install FAIL tanpa `/opt/hatch`; `build:client` FAIL meski SDK ada (SDK 0.14.0, tarball SHA-256 `f2cb7b25…ad49e`) | Provider belum menyatakan; tidak ada sumber redistributable yang sah |
| 15 | **BARU v2.3.22** — Jawaban T-01 (second Hatch space publishability, M-6) | **UNASSIGNED / BLOCKED** | Jawaban tertulis platform (bukti §2 `GPT_RESPONSE_LINK_JADI.md`: identitas space + runtime, subdomain gratis dapat diakses publik tanpa login pemilik, akses owner-only sisi server, build/start berhasil dari source yang sama, URL merespons dari sesi eksternal, tanpa koneksi DB/secret/layanan produksi + scanner tak dapat dipanggil) | Platform belum menjawab; ChatGPT meninjau bukti setelah Muse memverifikasi |
| 16 | **BARU v2.3.22** — Konfirmasi otorisasi implementasi di branch `dev` (U-99) | **UNASSIGNED / BLOCKED** | Konfirmasi eksplisit agen induk/pemilik bahwa run berikutnya boleh menulis kode di branch `dev` (D-01..D-06); tanpa itu `dev` tetap backlog saja | `c53fd73` (repo) vs otorisasi tugas terjadwal (desain+bukti saja) — keputusan tertunda |
| 17 | **BARU v2.3.22** — Klasifikasi Vercel Hobby + pengukuran CPU checkLink (U-101/U-102, M-9/M-10) | **NOT VERIFIED / BLOCKED** | Keputusan owner non-komersial vs komersial (terms Vercel Hobby); pengukuran CPU `checkLink` terhadap batas 10 ms Cloudflare Workers Free setelah port/adapter tersedia | Owner belum memutuskan; port/adapter belum ada |

**Keputusan yang dibutuhkan sebelum validasi staging dapat
dimulai:** Rama menunjuk keenam peran (baris 1–6) + provider
menyediakan bukti baris 7–17. Sampai saat itu, STAGE-P01..P12
tetap BLOCKED dan tidak ada run staging. Prosedur, oracle
PASS/FAIL, dan bukti tiap prasyarat ada di desain §D.4.15
(STAGE-P01..P12) dan §D.4.26.
