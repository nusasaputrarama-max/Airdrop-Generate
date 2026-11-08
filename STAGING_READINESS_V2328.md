# Staging Readiness — satu halaman (v2.3.28)

**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA
**Sumber:** `SSRF_REMEDIATION_DESIGN.md` §D.4.15 (STAGE-P01..P12) +
`SSRF_RESPONSE_MATRIX_V2328.md` §2/§7/§10 +
`DEPLOYMENT_FEASIBILITY_V2322.md` §5
**Menjawab:** butir 7 `SSRF_INDEPENDENT_AUDIT_V22.md` §8
(carry-forward dari `STAGING_READINESS_V2327.md` — dokumen V2327
di `main` dipertahankan sebagai catatan sejarah).
**Perubahan v2.3.28:** F-065..F-068 SELESAI di branch `development`
dan teruji di VM (tool migrasi v2328-1: output path aman
(exclusive `link(2)` + 0600 + atomik + read-back), validasi backup
ketat + hash SHA-256, output privat 0600 + retensi terdokumentasi,
guard hard-link (nlink + device/inode); H-MIGR kini **33/33 PASS**
— 18 lama diulang + 15 baru; total regresi **409/409 PASS** —
SEMUA bukti VM, BUKAN staging); F-064 naik dari partially
addressed menjadi addressed di dev+VM (residual hard-link
ditutup F-068; sisa TOCTOU dicatat sebagai risiko baru U-118);
U-117 SEBAGIAN TERJAWAB — `share.shared=true` terverifikasi ulang
via `artifact.status` (~22:48 WIB 2026-11-08) dan URL publik
terverifikasi merespons via `browser.open` (~22:51 WIB, judul
"Airdrop Generate"); HTTP status TIDAK diklaim dan
artifact-to-source tetap NOT VERIFIED; U-116 dikonfirmasi ulang
via `gh api` langsung (0 workflow runs, 0 workflows, kedua branch
tidak protected, 0 rulesets); U-113 tetap BLOCKED (pencarian ulang
nihil); D-06/F-047 tetap IN PROGRESS/BLOCKED (npm 404 dikonfirmasi
ulang); T-01 tetap BLOCKED; F-006b masih ada. Dua baris baru
ditambahkan (32–33) untuk prasyarat baru yang diidentifikasi
revisi ini.
**Tidak satu pun peran staging terisi; tidak ada staging yang
tersedia; tidak ada bukti runtime baru.**

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
| 20 | URL publik landing page + health check eksternal (V16 §6 butir 5; **DIPERBARUI v2.3.28 — U-117**) | **PARTIALLY VERIFIED** | URL HTTPS publik artifact slug `airdrop-generate` + health check dari sesi eksternal berhasil (tanpa console error); share membutuhkan permintaan eksplisit user | **Snapshot bertanggal 2026-11-08 ~22:48–22:51 WIB (v2.3.28):** `artifact.status` slug `airdrop-generate` → `share.shared=true`, tidak ada build berjalan, URL `https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`; `browser.open` 22:51 WIB BERHASIL (judul "Airdrop Generate", crawl 15:51 UTC <1 menit). Tidak ada perubahan sejak snapshot v2.3.27. **Sisa NOT VERIFIED:** HTTP status tidak diklaim (tool tidak menampilkannya); artifact-to-source tidak terbukti (tidak ada catatan build/publish di repo; tooling tidak mengekspos source commit/digest/build log — keterbatasan spesifik dicatat, bukan kekurangan sekali cek); publish fresh dari `landing/` tetap NOT VERIFIED |
| 21 | **BARU v2.3.24** — `ctx.viewer` membedakan owner vs viewer share di runtime (STAGE-P02, F-051) | **NOT VERIFIED / BLOCKED** | Runtime staging membuktikan: viewer share Cloudflare non-owner resolve ke principal null (tanpa history/saved state — H-PRIN diulang di staging); owner Cloudflare resolve ke `cloudflare-owner:{shareId}`; dua viewer satu share tidak saling membaca state | Runtime produksi belum tersedia untuk diuji; bukti VM (H-PRIN 6/6) BUKAN bukti staging |
| 22 | **BARU v2.3.24** — Pre-check migrasi 0008 + versi SQLite runtime (F-055, U-90/U-110) | **NOT VERIFIED / BLOCKED** | `SELECT sqlite_version()` runtime produksi + pre-check operator V1: 0 baris Solana melanggar CHECK base58 baru sebelum migrate 0008 di DB berisi data; H-B58 diulang di staging | Runtime produksi belum tersedia untuk diuji; DB berisi data belum ada di staging |
| 23 | **BARU v2.3.24** — Deadline keras + timeout terukur di runtime (F-052/F-053) | **NOT VERIFIED / BLOCKED** | Runtime staging membuktikan: scan dengan DNS lambat berakhir ≤ 20 dtk + grace terdokumentasi, lease lepas, respons timeout eksplisit, 0 baris checks (H-DL + H-TO diulang di staging, bukan Node/Bun VM) | Runtime produksi belum tersedia untuk diuji; angka VM (20015 ms, unwind <1 dtk) BUKAN bukti staging |
| 24 | **BARU v2.3.25, DIPERBARUI v2.3.26** — Anonymous fail-closed TANPA pengecualian mode (F-057/F-059; U-115 **CLOSED**) | **NOT VERIFIED / BLOCKED (staging)** | Runtime staging membuktikan: invocation tanpa `ctx.viewer`, viewer source tidak dikenal, dan `userId` kosong tidak membaca/menulis saved state (H-AN2 diulang di staging); mode local single-owner SUDAH DIHAPUS dari handler v2.3.26 — tidak ada lagi yang perlu dibuktikan soal mode; baris `'<LEGACY>'` tidak terjangkau lewat handler | Runtime produksi belum tersedia untuk diuji; bukti VM (H-AN2 6/6) BUKAN bukti staging |
| 25 | **BARU v2.3.25, DIPERBARUI v2.3.28** — Kontrak provider `userId`/`ownerUserId`/`isOwner`/`delegate` + keputusan migrasi data kunci principal lama (F-058, U-113/U-114) | **NOT VERIFIED / BLOCKED** | Pernyataan tertulis provider tentang semantik populasi keempat field LocalViewer di invocation nyata (local + delegate) ATAU staging trace yang aman (H-PL diulang di staging: dua viewer `ownerUserId` sama + `userId` beda terisolasi; delegate terisolasi); keputusan operator atas baris lama berkunci `local:{ownerUserId}` (rename ke `local:{userId}` vs terima orphan) sebelum deployment menyentuh DB berisi baris lama — tool `rename` SUDAH DIPERKERAS (H-MIGR 33/33, VM, v2.3.28), yang kurang hanya mapping terverifikasi | Provider belum menyatakan; runtime produksi belum tersedia untuk diuji; bukti VM (H-PL 7/7, H-MIGR 33/33) BUKAN bukti staging; pemetaan `userId`↔`ownerUserId` nyata belum ada |
| 26 | **BARU v2.3.26** — H-AN2 diulang di staging (F-059) | **NOT VERIFIED / BLOCKED** | H-AN2 6/6 diulang terhadap runtime staging: anon/unknown/empty-userId tidak membaca/menulis saved state; export mode legacy tidak ada di build staging (grep build artifact) | Runtime staging belum tersedia; bukti VM (H-AN2 6/6) BUKAN bukti staging |
| 27 | **BARU v2.3.26, DIPERBARUI v2.3.28** — Migrasi kunci principal di staging + mapping terverifikasi (F-060..F-068, U-114) | **NOT VERIFIED / BLOCKED** | Mapping `userId`↔`ownerUserId` terverifikasi (dari runtime/ekspor owner, dengan basis tercatat per entri); `rename` dijalankan pada SALINAN DB staging + pre/post counts + backup + rollback teruji di staging; keputusan arsip eksplisit bila mapping tidak mungkin; `archive-special` (sentinel + NULL-owner), guard symlink, output path aman, validasi backup ketat + hash SHA-256, output 0600, dan guard hard-link diulang di staging | Mapping belum ada; DB staging berisi data belum ada; tool hanya teruji di VM (H-MIGR 33/33: tolak chain/cycle, archive-special, rollback terverifikasi, guard symlink, output path aman, validasi backup + hash, output 0600, guard hard-link) |
| 28 | **BARU v2.3.26** — CI / branch governance (U-116) | **NOT VERIFIED / BLOCKED** | Proteksi branch `main` + `development` (required review + required status checks) + workflow CI minimal (install/typecheck/test) dengan run yang berhasil; keputusan owner/operator atas proteksi | Dikonfirmasi ulang v2.3.28 via `gh api` langsung: 0 workflow runs, 0 workflows, kedua branch tidak protected (HTTP 404), 0 rulesets — CI tidak ada (bukan CI gagal) |
| 29 | **BARU v2.3.27, DIPERBARUI v2.3.28** — Tool migrasi diperkeras diulang di staging (F-061..F-068) | **NOT VERIFIED / BLOCKED** | H-MIGR-09..33 diulang terhadap runtime staging: mapping chain/cycle ditolak; `archive-special` mengekspor sentinel + NULL-owner tanpa ubah DB; rollback gagal fail-closed bila state berubah atau backup tidak lengkap; symlink/hard link menuju DB runtime ditolak; output path tidak dapat menimpa DB/file existing; output 0600; backup ber-hash SHA-256; rename/rollback normal tetap sukses | Runtime staging belum tersedia; bukti VM (H-MIGR 33/33) BUKAN bukti staging |
| 30 | **BARU v2.3.27, DIPERBARUI v2.3.28** — Bukti artifact-to-source project link (U-117, sisa) | **NOT VERIFIED / BLOCKED** | Raw `artifact.status` bertanggal untuk slug `airdrop-generate` disimpan di repo (pola `evidence/f021-*`) + catatan eksplisit sumber konten artifact (apakah dari `landing/` atau konten lain) + HTTP status/health check lengkap dari sesi eksternal | Share flag + URL sudah terverifikasi ulang v2.3.28 (snapshot ~22:48–22:51 WIB); artifact-to-source dan HTTP status tetap NOT VERIFIED; tooling tidak mengekspos source commit/digest/build log |
| 31 | **BARU v2.3.27** — Narasi insiden di string kode dibersihkan (F-006b) | **NOT VERIFIED / BLOCKED** | String insiden di `site/server/src/actions.ts` (baris 75–76, 299, 874–876, 887, 992) dibersihkan pada putaran development berikutnya; tidak ada jejak narasi insiden di string kode | String masih ada (dicek ulang v2.3.28); pembersihan adalah stage-(b) code change di `development` |
| 32 | **BARU v2.3.28** — Residual TOCTOU guard DB ditutup/diuji di staging (U-118) | **NOT VERIFIED / BLOCKED** | Tool hanya dijalankan di direktori kerja allowlist staging yang tidak dapat mengakses DB runtime; pemeriksaan inode pasca-open (bandingkan inode file yang dibuka dengan inode yang di-guard) sebagai pengerasan; workflow salinan terverifikasi (`cp` → `stat` nlink==1 → jalankan segera) dijalankan sebagai prosedur staging | Runtime staging belum tersedia; TOCTOU antar guard dan open tidak dapat ditutup dari dalam satu proses di VM |
| 33 | **BARU v2.3.28** — CI minimal + proteksi branch diputuskan (U-116, tindak lanjut) | **NOT VERIFIED / BLOCKED** | Workflow CI minimal (install/typecheck/test migrasi) dengan run yang berhasil + proteksi branch `main`/`development` (required review + required checks) diputuskan owner/operator; workflow diuji dulu di `development` tanpa mengubah production/deployment | Keputusan owner/operator belum ada; revisi ini TIDAK mengubah proteksi (di luar otorisasi revisi desain) |

**Keputusan yang dibutuhkan sebelum validasi staging dapat
dimulai:** Rama menunjuk keenam peran (baris 1–6) + provider
menyediakan bukti baris 7–15 dan 17–33 (termasuk kontrak viewer
F-058/U-113, baris 25; mapping migrasi U-114, baris 27; CI
governance U-116, baris 28/33; tool migrasi diperkeras F-061..F-068,
baris 29; bukti artifact-to-source U-117, baris 30; residual TOCTOU
U-118, baris 32) + keputusan owner K-10 (baris 13) + keputusan
migrasi data kunci principal lama U-114 (baris 25/27) + keputusan
service identity terjadwal (U-109, bila job auto-discovery harus
menambah katalog). Sampai saat itu, STAGE-P01..P12 tetap BLOCKED
dan tidak ada run staging. Prosedur, oracle PASS/FAIL, dan bukti
tiap prasyarat ada di desain §D.4.15 (STAGE-P01..P12) dan §D.4.26.
