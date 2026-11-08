# Staging Readiness — satu halaman (v2.3.24)

**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA
**Sumber:** `SSRF_REMEDIATION_DESIGN.md` §D.4.15 (STAGE-P01..P12) +
`SSRF_RESPONSE_MATRIX_V2324.md` §2/§7/§10 +
`DEPLOYMENT_FEASIBILITY_V2322.md` §5
**Menjawab:** butir 4 `SSRF_INDEPENDENT_AUDIT_V18.md` §6
(carry-forward dari `STAGING_READINESS_V2323.md` — dokumen V2323
hanya ada di branch `development`, commit `31c3db3`; dokumen V2322
di `main` dipertahankan sebagai catatan sejarah).
**Perubahan v2.3.24:** F-049..F-056 SELESAI di branch `development`
dan teruji di VM (regresi penuh **363/363 PASS** — dikoreksi dari
353, lihat matriks v2.3.24 DL-24-01; tsc server+client exit 0 —
SEMUA bukti VM, BUKAN staging); D-06/F-047 tetap IN PROGRESS/
BLOCKED; T-01 tetap BLOCKED; landing page tidak disentuh. Tiga
baris baru ditambahkan (21–23) untuk prasyarat baru yang
diidentifikasi revisi ini. **Tidak satu pun peran staging terisi;
tidak ada staging yang tersedia; tidak ada bukti runtime baru.**

**Bacaan:** tabel ini adalah RINGKASAN KEPUTUSAN, bukan bukti
staging. Bila nama atau akses tidak tersedia, tertulis
**UNASSIGNED / BLOCKED** — tidak ada nama yang dikarang, tidak
ada staging yang diimplikasikan ada.

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
| 14 | SDK redistributable + kontrak build client (F-047, U-97, M-1/M-2) | **NOT VERIFIED / BLOCKED** | Tarball SDK yang sah + dapat diakses builder luar ATAU pernyataan tertulis provider tentang distribusi SDK + kontrak runtime/build; pernyataan bahwa `buildClient()` memang hanya boleh jalan lewat tooling artifact (atau cara reproduksinya). Bukti v2.3.22: npm 404; install FAIL tanpa `/opt/hatch`; `build:client` FAIL meski SDK ada (SDK 0.14.0, tarball SHA-256 `f2cb7b25…ad49e`) | Provider belum menyatakan; tidak ada sumber redistributable yang sah |
| 15 | Jawaban T-01 (second Hatch space publishability, M-6) | **UNASSIGNED / BLOCKED** | Jawaban tertulis platform (bukti §2 `GPT_RESPONSE_LINK_JADI.md`: identitas space + runtime, subdomain gratis dapat diakses publik tanpa login pemilik, akses owner-only sisi server, build/start berhasil dari source yang sama, URL merespons dari sesi eksternal, tanpa koneksi DB/secret/layanan produksi + scanner tak dapat dipanggil) | Platform belum menjawab; v2.3.23: agen mencoba via tooling yang tersedia — `hatch` tanpa subcommand, `share-space` butuh space sudah ter-publish (lihat `evidence/v2323/t-01-verification.txt` di branch `development`) |
| 16 | Konfirmasi otorisasi implementasi di branch `development` (U-99) | **CLOSED / GRANTED (v2.3.23)** | V16 §1 + §2 + direktif `c53fd73` — implementasi D-01..D-04 dieksekusi di `development` dalam revisi itu; V18 §7 menegaskan otorisasi yang sama tetap cukup untuk F-049..F-056 (v2.3.24) | — (otorisasi produksi/rilis tetap BELUM diberikan) |
| 17 | Klasifikasi Vercel Hobby + pengukuran CPU checkLink (U-101/U-102, M-9/M-10) | **NOT VERIFIED / BLOCKED** | Keputusan owner non-komersial vs komersial (terms Vercel Hobby); pengukuran CPU `checkLink` terhadap batas 10 ms Cloudflare Workers Free setelah port/adapter tersedia | Owner belum memutuskan; port/adapter belum ada |
| 18 | Pinning + guard di runtime produksi (STAGE-P01, F-001) | **NOT VERIFIED / BLOCKED** | Runtime staging membuktikan: custom `lookup` mengembalikan HANYA IP tervalidasi; TLS SNI + verifikasi sertifikat terhadap hostname; H-SSRF-23 diulang terhadap runtime produksi (bukan Node/Bun VM) | Runtime produksi belum tersedia untuk diuji; bukti VM (H-SSRF 32/32) BUKAN bukti staging |
| 19 | `ctx.viewer` terisi di runtime + semantik `SpaceDb.run` (STAGE-P02, F-005/U-107) | **NOT VERIFIED / BLOCKED** | Runtime staging membuktikan: `ctx.viewer` terisi di setiap jalur invocation (local + Cloudflare) dengan identitas stabil; `SpaceDb.run` atas `INSERT ... RETURNING` melaporkan `rows` (+ `rowsAffected` — bandingkan dengan perilaku libsql: 0); H-TEN diulang di staging | Runtime produksi belum tersedia untuk diuji; tipe SDK ada ≠ runtime terisi |
| 20 | URL publik landing page + health check eksternal (V16 §6 butir 5) | **NOT VERIFIED / BLOCKED** | URL HTTPS publik artifact slug `airdrop-generate` + health check dari sesi eksternal berhasil (status 200, tanpa console error); share membutuhkan permintaan eksplisit user | Belum di-share (`share.shared=false`); user belum meminta share |
| 21 | **BARU v2.3.24** — `ctx.viewer` membedakan owner vs viewer share di runtime (STAGE-P02, F-051) | **NOT VERIFIED / BLOCKED** | Runtime staging membuktikan: viewer share Cloudflare non-owner resolve ke principal null (tanpa history/saved state — H-PRIN diulang di staging); owner Cloudflare resolve ke `cloudflare-owner:{shareId}`; dua viewer satu share tidak saling membaca state | Runtime produksi belum tersedia untuk diuji; bukti VM (H-PRIN 6/6) BUKAN bukti staging |
| 22 | **BARU v2.3.24** — Pre-check migrasi 0008 + versi SQLite runtime (F-055, U-90/U-110) | **NOT VERIFIED / BLOCKED** | `SELECT sqlite_version()` runtime produksi + pre-check operator V1: 0 baris Solana melanggar CHECK base58 baru sebelum migrate 0008 di DB berisi data; H-B58 diulang di staging | Runtime produksi belum tersedia untuk diuji; DB berisi data belum ada di staging |
| 23 | **BARU v2.3.24** — Deadline keras + timeout terukur di runtime (F-052/F-053) | **NOT VERIFIED / BLOCKED** | Runtime staging membuktikan: scan dengan DNS lambat berakhir ≤ 20 dtk + grace terdokumentasi, lease lepas, respons timeout eksplisit, 0 baris checks (H-DL + H-TO diulang di staging, bukan Node/Bun VM) | Runtime produksi belum tersedia untuk diuji; angka VM (20015 ms, unwind <1 dtk) BUKAN bukti staging |

**Keputusan yang dibutuhkan sebelum validasi staging dapat
dimulai:** Rama menunjuk keenam peran (baris 1–6) + provider
menyediakan bukti baris 7–15 dan 17–23 + keputusan owner K-10
(baris 13) + keputusan service identity terjadwal (U-109, bila
job auto-discovery harus menambah katalog). Sampai saat itu,
STAGE-P01..P12 tetap BLOCKED dan tidak ada run staging. Prosedur,
oracle PASS/FAIL, dan bukti tiap prasyarat ada di desain §D.4.15
(STAGE-P01..P12) dan §D.4.26.
