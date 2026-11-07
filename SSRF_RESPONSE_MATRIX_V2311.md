# SSRF RESPONSE MATRIX v2.3.11 — Jawaban atas Audit Independen ChatGPT V4

**Dokumen:** matriks respons revisi desain v2.3.11
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_INDEPENDENT_AUDIT_V4.md` (commit `ce21b39`, 2026-11-08 ~02:45 WIB)
  — temuan baru F-016..F-020 + Muse Handoff §9 (8 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.11:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.11 — §D.4.22 ringkasan revisi, risiko baru U-50..U-54 di §G,
gerbang G6 diperluas dengan H-CACHE-01..06 + H-TEN-01..05, paragraf
penutup diperbarui). Matriks v2.3.10 (`SSRF_RESPONSE_MATRIX_V2310.md`)
dipertahankan utuh sebagai catatan sejarah revisi itu. Temuan F-001..F-015
dibawa ke sini dengan status terbarunya; yang baru di v2.3.11 hanyalah
F-016..F-020 dan kedelapan jawaban handoff V4.

**Yang TIDAK dilakukan v2.3.11:** tidak ada kode aplikasi yang diubah
(tidak ada file `.ts`/`.tsx` yang disentuh), tidak ada perubahan
database/katalog, tidak ada production build, tidak ada pemanggilan
action produksi apa pun (termasuk `checkLink` — tidak di-invoke),
Link Scanner tidak diaktifkan, public tester tidak disentuh.
Bukti yang dipakai adalah read-only: pembacaan kode mirror, `git show`,
inspeksi tarball SDK di `/tmp` (bukan repo), dan `artifact.list_actions`
+ `artifact.status` (read-only).

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.11

Sesuai keputusan pemilik proyek (2026-11-07 ~23:56 WIB, dikonfirmasi
~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan tidak boleh
dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.11.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.11 TIDAK mengimplementasikan apa pun. **DITAMBAH v2.3.11: HOLD perubahan source mirror sampai klarifikasi F-020 (§2, §6).** |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.11. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.** Koreksi penting v2.3.11 (F-020): pernyataan v2.3.10 "Tidak ada
kode aplikasi yang diubah" benar pada commit `12391e4` tetapi menjadi
basi setelah commit `d85a1e2` mengubah `site/server/src/actions.ts` dan
`site/client/src/App.tsx` — lihat §2 F-020.

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Tidak ada butir yang berstatus ini di v2.3.11 — semua temuan V4 diterima sebagai sah. |

## §1. Ringkasan status F-001..F-020

| ID | Severity | Status v2.3.11 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah: desain + harness H-SSRF-01..20 selesai; implementasi menunggu otorisasi tahap (b). Rencana dipetakan ulang di §D.4.22 (keterkaitan dengan cache F-016/F-017). |
| F-002 | High — cap setelah buffering | **blocked** | Tidak berubah: desain streamed cap selesai; implementasi menunggu otorisasi. F-017 dicatat eksplisit BUKAN pengganti F-002. |
| F-003 | High — tanpa total deadline | **blocked** | Kode mirror kini PARTIALLY MITIGATED (deadline total 30 detik di `analyze()`, d85a1e2) — tetapi TANPA tes regresi, status penutupan TIDAK berubah: tetap OPEN sampai H-RES-04..06 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Tidak berubah: desain unique constraint selesai; implementasi (termasuk migrasi DB) menunggu otorisasi. Keterkaitan baru: satu migrasi bersama F-018. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Tidak berubah sejak v2.3.9: auth di dalam kode TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED; mekanisme otorisasi butuh keputusan pemilik. Kandidat teknis baru: `ctx.viewer` SDK (temuan F-018). |
| F-006a | Medium — redaksi dokumen mirror `site/DATA-PLAN.md` | **addressed** | Tidak berubah. |
| F-006b | Medium — narasi insiden di string kode (`actions.ts:51`, `GIBRAN_SITE_KNOWLEDGE` ~1089) | **blocked (OPEN)** | Tidak berubah; proposal cleanup matriks v2.3.10 §4 tetap berlaku; d85a1e2 sengaja tidak menyentuh string narasi. |
| F-006c | Medium — DATA-PLAN.md di live artifact | **partially addressed** | Tidak ada bukti baru v2.3.11; tetap "reported by Muse, not independently verified". Alasan tidak memakai `artifact.inspect` dicatat di §2. |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Tidak berubah (lihat §3 V4 §3.1). |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Tidak berubah. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | Tidak ada fakta baru v2.3.11; inspeksi `.d.ts` SDK membuktikan permukaan API, BUKAN provenance. Status: **NOT REPRODUCIBLE untuk clean external builder**. |
| F-010 | Medium — bundle SU asli mengulang RUN=1 di tiga file | **addressed** (sebagai koreksi bukti) | Tidak berubah (lihat §3 V4 §3.1). |
| F-011 | Medium — matriks fitur tester statis tidak cocok dengan client | **addressed** (sebagai koreksi dokumen) | Tidak berubah; tester tetap ON HOLD. |
| F-012 | Medium — F-006 dinyatakan addressed padahal residu masih ada | **addressed** (sebagai pemisahan status) | Tidak berubah. |
| F-013 | Medium — owner gate staging tidak lengkap | **partially addressed** | Penugasan peran v2.3.10 berdiri; staging operator / kanal alert / egress policy / DB+runtime tetap **UNASSIGNED/BLOCKED**; tidak ada gate READY. |
| F-014 | Medium — catatan reproduksibilitas basi | **partially addressed** | Tidak ada fakta baru v2.3.11. |
| F-015 | Low/Medium — DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode | **addressed** (mirror) / **blocked** (live) | Tidak berubah; teks koreksi live sudah disiapkan, belum diterapkan. |
| F-016 | Medium — cache hasil scan basi (false-negative) | **partially addressed** | **BARU v2.3.11:** keputusan desain selesai (hapus cache untuk security scan sebagai rekomendasi utama + alternatif ber-syarat); spesifikasi regresi H-CACHE-01..04 selesai. Implementasi + tes menunggu tahap (b) + HOLD F-020. |
| F-017 | Medium — cache key mengabaikan cap | **partially addressed** | **BARU v2.3.11:** keputusan desain selesai (key WAJIB menyertakan cap); spesifikasi regresi H-CACHE-05/06 selesai. Implementasi + tes menunggu tahap (b) + HOLD F-020. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | **BARU v2.3.11:** bukti SDK read-only ditemukan (`server-contract.d.ts`: `db` + `viewer`); fakta skema tanpa owner diverifikasi; desain ownership + spesifikasi H-TEN-01..05 selesai. Semantik tenancy runtime tetap **NOT VERIFIED**; exploitability TIDAK diklaim. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | **BARU v2.3.11:** bukti read-only dikumpulkan — `checklink` MASIH TERDAFTAR sebagai published action; tidak ada versi/digest yang terekspos; tidak ada kontrol disabled yang terbukti. Deployment tetap BLOCKED. |
| F-020 | Medium — scope refactoring source mirror perlu klarifikasi otorisasi | **partially addressed** | **BARU v2.3.11:** fakta git + dasar otorisasi yang tercatat didokumentasikan; **HOLD perubahan source lanjutan** sampai owner mengklarifikasi scope. Tidak ada artefak approval terpisah di repo. |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif. Tidak ada public deployment yang
diotorisasi.**

## §2. Respons per temuan baru V4

### F-016 — Medium: cache hasil scan dapat membuat hasil basi — **partially addressed** (keputusan desain + spesifikasi tes; implementasi + bukti tes menunggu tahap b)

**Temuan (diterima):** `FETCH_CACHE` module-scope, key = URL saja, TTL
10 menit; `fetchText` mengembalikan cached value sebelum fetch baru;
kegagalan fetch juga disimpan sebagai `null` selama TTL yang sama.
Re-check URL yang sama tidak selalu mengambil konten terkini; halaman
yang berubah benign → malicious dapat lolos sebagai benign; kegagalan
sementara terus tampil sebagai unreachable. Bertentangan dengan
`site/DATA-PLAN.md` (re-check dari history = fresh scan).

**Verifikasi sendiri (2026-11-08, sebelum menulis keputusan):**
`site/server/src/actions.ts` baris 111–168 dibaca penuh pada mirror
commit `d85a1e2`:

- `FETCH_CACHE = new Map<string, CacheEntry<FetchResult | null>>()` —
  key hanya `url` (baris 147–151 `fetchText`: `cacheGet(FETCH_CACHE,
  url)` lalu `return cached` bila ada).
- `FETCH_CACHE_TTL_MS = 10 * 60_000`, `FETCH_CACHE_MAX = 50`.
- Kegagalan di-cache sebagai `null`: setelah 2 percobaan gagal,
  `cacheSet(FETCH_CACHE, url, null, FETCH_CACHE_TTL_MS,
  FETCH_CACHE_MAX)` lalu `return null`.
- Cache RDAP terpisah: hanya sukses yang di-cache (`lookupRdap`,
  "Hanya respons sukses yang di-cache; kegagalan tidak di-cache"),
  TTL 1 jam, maks 100.
- Cache bersifat per-instance proses (module-scope in-memory) — tiap
  instance runtime punya cache sendiri; tidak ada konsistensi lintas
  instance.
- `site/DATA-PLAN.md` baris 26: "Re-checking the same link from
  history runs a fresh scan and saves a new row." — dikonfirmasi ada
  dan bertentangan dengan perilaku cache.

**Respons — keputusan desain (§D.4.22, U-50):**

- **Rekomendasi utama: HAPUS cache fetch untuk jalur security scan.**
  Alasan teknis: (1) vonis keamanan harus mencerminkan konten pada
  saat scan — jendela basi 10 menit adalah jendela false-negative
  untuk halaman yang dikontrol penyerang; (2) mengunci kegagalan
  sebagai `null` selama 10 menit mengubah gangguan jaringan sementara
  menjadi vonis "tidak terjangkau" yang menempel; (3) keuntungan
  performa tidak sebanding dengan risiko false-negative pada vonis
  keamanan; (4) janji DATA-PLAN tentang fresh scan pada re-check sudah
  berkomitmen ke perilaku fresh.
- **Alternatif bila owner tetap menginginkan cache** (bukan rekomendasi):
  (a) hanya hasil sukses yang di-cache — kegagalan TIDAK PERNAH;
  (b) TTL eksplisit + setiap baris `checks` menyimpan `fetchedAt`,
  flag `cacheHit`, dan umur data, ditampilkan di UI; (c) re-check dari
  history WAJIB melewati cache (jalur fresh) dan menyimpan baris baru;
  (d) jalur "force fresh" eksplisit tersedia; (e) key cache
  memperhitungkan cap (F-017).
- Cache RDAP dipertahankan apa adanya (sukses saja) dengan catatan
  freshness yang sama — RDAP tidak memengaruhi sinyal konten; bila
  RDAP gagal, pemeriksaan tetap berjalan dengan sinyal "umur domain
  tidak diketahui".

**Spesifikasi regresi (DESAIN tes staging — TIDAK dijalankan di
v2.3.11; tidak ada staging, tidak ada implementasi):**

| ID | Skenario | Kriteria PASS |
| --- | --- | --- |
| H-CACHE-01 | URL yang sama memberi respons benign lalu malicious dalam TTL | Request kedua melihat konten baru (vonis kedua = malicious) |
| H-CACHE-02 | Fetch pertama gagal (server mati), server pulih dalam TTL | Request kedua berhasil — bukan `null` terkunci |
| H-CACHE-03 | Retry segera setelah pemulihan | Tidak ada hasil `null` yang bertahan melewati satu retry pasca-pemulihan |
| H-CACHE-04 | Freshness terlihat + bypass re-check | Setiap baris `checks` membawa `fetchedAt` + `cacheHit` + umur; re-check dari history memakai jalur fresh dan menyimpan baris baru dengan `fetchedAt` baru |

**Risiko tersisa:** keputusan belum diimplementasikan (tahap b + HOLD
F-020); H-CACHE-01..04 belum dijalankan di staging mana pun.
**Aksi berikutnya:** owner memilih rekomendasi utama vs alternatif;
implementasi tahap (b) setelah otorisasi + klarifikasi F-020;
H-CACHE-01..04 dijalankan di staging; DATA-PLAN diperbarui agar
janjinya cocok dengan perilaku yang diimplementasikan (fresh scan
atau cache yang dinyatakan).

### F-017 — Medium: key cache mengabaikan parameter cap — **partially addressed** (keputusan desain + spesifikasi tes; implementasi + bukti tes menunggu tahap b)

**Temuan (diterima):** `fetchText` menerima parameter `cap`, tetapi
`FETCH_CACHE` hanya memakai URL sebagai key. Hasil yang disimpan sudah
dipotong di `fetchTextOnce` melalui `res.text().slice(0, cap)`. Halaman
utama meminta cap 400.000 byte, script meminta 300.000 byte. Bila URL
lebih dulu di-cache sebagai script, permintaan halaman berikutnya dapat
menerima 300.000 byte; sinyal berbahaya setelah itu tidak dianalisis.
Arah sebaliknya juga memungkinkan.

**Verifikasi sendiri (2026-11-08):** `site/server/src/actions.ts`
commit `d85a1e2` — halaman utama `fetchText(input.toString(), 400_000,
deadline)` (baris 396); script `fetchText(abs, 300_000, deadline)`
(baris 524); `fetchTextOnce`: `const text = (await
res.text()).slice(0, cap)` — pemotongan terjadi SETELAH seluruh body
dibaca dan hasil terpotong itulah yang masuk cache (baris 147–168).
Cocok dengan temuan audit.

**Respons — keputusan desain (§D.4.22, U-51):**

- **Key cache WAJIB menyertakan cap** (`url + "|" + cap`).
- Alternatif "simpan representasi mentah lalu potong per caller"
  **DITOLAK sebagai utama**: menyimpan representasi mentah tanpa batas
  mengembalikan buffering tak terbatas dan bertentangan langsung
  dengan streamed cap F-002.
- Keputusan ini **TIDAK menggantikan streaming byte limit F-002** —
  cap-aware key hanya memperbaiki kebenaran hasil cache, bukan cara
  body dibaca (F-002 tetap OPEN/blocked).

**Spesifikasi regresi (DESAIN tes staging):**

| ID | Skenario | Kriteria PASS |
| --- | --- | --- |
| H-CACHE-05 | Cache URL dengan cap 300.000 lalu minta URL yang sama dengan cap 400.000 | Hasil kedua TIDAK terpotong oleh hasil pertama (konten setelah 300 KB hadir) |
| H-CACHE-06 | Cache URL dengan cap 400.000 lalu minta dengan cap 300.000 | Hasil kedua menghormati cap 300.000 (tidak melebihi kebijakan cap caller) |

**Risiko tersisa:** belum diimplementasikan; H-CACHE-05/06 belum
dijalankan. **Aksi berikutnya:** implementasi bersama F-016/F-001
(satu jalur kode `fetchText`) setelah otorisasi tahap (b) +
klarifikasi F-020; H-CACHE-05/06 PASS di staging.

### F-018 — High bila DB shared: isolasi data antar-pengguna belum terbukti — **partially addressed** (bukti SDK + fakta skema + desain ownership + spesifikasi tes; semantik tenancy tetap NOT VERIFIED)

**Temuan (diterima):** tabel `checks` tidak memiliki kolom
owner/principal; `listChecks` membaca seluruh baris tanpa filter
owner; `deleteCheck` menghapus berdasarkan id; `askGibran` membaca
sepuluh pemeriksaan terakhir; `savedProjects` memakai `projectId`
sebagai primary key tanpa identitas pengguna. Bila `ctx.db` adalah
database bersama per artifact, riwayat dapat terbaca/dihapus lintas
pengguna. Semantik tenancy `ctx.db` di `@hatch/space-sdk` tidak
tersedia dalam mirror — belum dapat dinyatakan confirmed vulnerability.

**Verifikasi sendiri — bukti SDK read-only (2026-11-08 ~02:50 WIB):**
tarball `@hatch/space-sdk` 0.14.0 (2.051.070 byte, SHA-256
`f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`,
mtime 1 Jan 1980) diekstrak ke `/tmp/sdk-inspect` (BUKAN ke repo,
tidak di-commit) dan dibaca `package/dist/server-contract.d.ts`,
`package/dist/index.d.ts`, `package/README.md`:

- `PortableCtx` membawa `db: SpaceDbAccessor` (accessor DB
  per-invocation) dan `viewer?: Viewer` (opsional).
- `LocalViewer` = `{ source: "local", authenticated: true, spaceSlug,
  userId, ownerUserId, isOwner, delegate?: "agent" | "schedule" }`.
- `CloudflareViewer` = `{ source: "cloudflare", authenticated: true,
  shareId, spaceSlug, spaceId?, isOwner, tokenId, tokenExpiresAt }`.
- **TIDAK ADA pernyataan di `.d.ts` maupun README SDK tentang
  apakah DB di balik accessor itu per-user atau per-artifact/shared.**
  Grep `tenant|per-user|multi-user|isolated|principal|owner|auth`
  pada README dan `index.d.ts` mengembalikan nol untuk semantik
  tenancy (satu-satunya hit relevan adalah definisi `Viewer` itu
  sendiri).
- `invalidateQueries` didokumentasikan sebagai "Signal every open
  client for this Space" — isyarat (bukan bukti) bahwa model data
  ber-scope space. Isyarat ini TIDAK dipakai sebagai bukti tenancy.

**Verifikasi sendiri — fakta skema/handler (mirror commit `d85a1e2`):**

- `site/server/src/schema.ts`: `checks` — kolom `id, url, domain,
  verdict, score, signals, contracts, pageTitle, finalUrl,
  httpStatus, registeredAt, registrar, domainAgeDays, createdAt` —
  TIDAK ADA kolom owner/principal. `savedProjects` — `projectId`
  (PK), `bookmarked`, `taskStatus`, `updatedAt` — TIDAK ADA identitas
  pengguna. `projects` — tanpa kolom owner.
- `site/server/src/actions.ts`: `listChecks` membaca seluruh baris
  tanpa filter owner; `deleteCheck` menghapus berdasarkan `id` saja;
  `askGibran` membaca 10 pemeriksaan terakhir tanpa filter; dan
  `actions.ts` **TIDAK PERNAH merujuk `ctx.viewer`** (grep `viewer`:
  nol).

**Respons — desain ownership/partitioning (§D.4.22, U-52):**

- **Bila DB shared (diputuskan setelah bukti tenancy):** (a) tambah
  kolom `ownerUserId` (dari `ctx.viewer` local: `ownerUserId`/`userId`;
  cloudflare: `shareId` + `tokenId` sebagai identitas pemanggil) pada
  `checks` dan `savedProjects`; (b) SETIAP baca (`listChecks`,
  `askGibran`) difilter oleh principal pemanggil; (c) hapus/ubah
  (`deleteCheck`, `setProjectState`) WAJIB mencocokkan kepemilikan —
  mismatch DITOLAK + di-log; (d) `askGibran` HANYA memasukkan riwayat
  pemanggil ke prompt; (e) migrasi wajib mem-partisi baris yang ada
  (pemilik saat ini = owner artifact) dan TIDAK menghapus riwayat —
  bila riwayat yang ada tidak dapat diatribusikan ke satu principal,
  migrasi GAGAL dengan laporan (pola yang sama dengan F-004c).
- **Bila DB terbukti per-user:** tidak ada perubahan skema; yang wajib
  tetap ada adalah tes dua principal H-TEN-01..05 di staging sebagai
  bukti, bukan asumsi.
- Keputusan tenancy adalah keputusan owner + fakta runtime (bukan
  Muse saja); desain di atas disiapkan untuk kedua cabang.

**Spesifikasi regresi (DESAIN tes staging):**

| ID | Skenario | Kriteria PASS |
| --- | --- | --- |
| H-TEN-01 | Dua principal terpisah membuat riwayat berbeda | A TIDAK dapat me-list riwayat B |
| H-TEN-02 | A mencoba menghapus check milik B berdasarkan id | Ditolak + tercatat |
| H-TEN-03 | `askGibran` sebagai A | TIDAK PERNAH memasukkan riwayat B ke konteks/jawaban |
| H-TEN-04 | Bookmark/task status per-principal | Perubahan A tidak mengubah state B |
| H-TEN-05 | Pemanggil tanpa identitas (bila runtime mengizinkan jalur anonim) | TIDAK mendapat data lintas principal; bila runtime TIDAK punya jalur anonim, fakta itu dicatat sebagai bagian dari scoping |

**Risiko tersisa:** semantik tenancy runtime tetap NOT VERIFIED;
exploitability TIDAK diklaim (bukan confirmed, bukan aman).
**Aksi berikutnya:** minta pernyataan resmi runtime provider tentang
scope `ctx.db` (per-user vs per-artifact); owner memilih cabang
desain; H-TEN-01..05 PASS di staging. Sampai itu ada, public tester
TIDAK BOLEH memuat data pengguna.

### F-019 — High: status Link Scanner nonaktif tidak memiliki bukti kontrol runtime — **blocked (NOT VERIFIED)**

**Temuan (diterima):** source mirror mengekspor action `checkLink`;
client merender bagian checker dan menghubungkan `onCheck` ke
`checkMut.mutate`; tidak terlihat feature flag atau disabled guard;
root README menggambarkan Link Scanner sebagai fitur live, sedangkan
dokumen desain menyatakan harus nonaktif. Audit tidak menyatakan
scanner aktif; audit juga tidak menerima klaim nonaktif tanpa bukti.
Kontradiksi harus diselesaikan dengan bukti runtime, bukan asumsi.

**Bukti read-only yang dikumpulkan (2026-11-08 ~02:47–02:50 WIB):**

1. `artifact.list_actions` slug `cek-link-airdrop` — action
   `checklink` **MASIH TERDAFTAR** sebagai published action, dengan
   deskripsi: "Live-checks a pasted airdrop/claim link: fetches the
   page, scans it for wallet-connect requests, signing code, contract
   addresses, bait language and obfuscation, looks up the domain age
   via RDAP, saves the result to history, and returns the verdict
   with per-signal evidence." Action lain yang terdaftar:
   `addproject`, `askgibran`, `deletecheck`, `listchecks`,
   `listprojects`, `setprojectstate`.
2. `artifact.status` slug `cek-link-airdrop` — tidak ada build
   berjalan; `share.shared=false`, `share.url=null`.
3. Mirror source: `site/server/src/actions.ts` mengekspor `checkLink`
   tanpa feature flag atau disabled guard; `site/client/src/App.tsx`
   merender bagian checker dan menghubungkan `onCheck` ke
   `checkMut.mutate`.

**Yang TIDAK dapat disimpulkan dari bukti di atas (dicatat jujur):**

- Daftar action yang masih memuat `checklink` TIDAK membuktikan
  scanner aktif — action ter-publish adalah metadata dispatch,
  bukan bukti ada pemanggilan yang berhasil.
- `share.shared=false` membatasi eksposur publik (artifact tidak
  punya public link) tetapi TIDAK membuktikan endpoint action
  nonaktif untuk jalur owner/agent.
- Tidak ada versi/digest artifact yang terekspos oleh tool read-only
  yang tersedia — klaim "versi live X tidak menjalankan scanner"
  tidak dapat dibuat.
- `checkLink` **TIDAK di-invoke** selama pengumpulan bukti ini —
  memanggilnya adalah tes produksi dan dilarang oleh protokol dan
  oleh audit V4 §9 butir 1 sendiri.

**Kontrol runtime yang DIBUTUHKAN untuk menutup F-019 (belum satu pun
terpenuhi):** (a) versi/digest artifact live yang dapat dikutip;
(b) bukti read-only bahwa endpoint action `checkLink` tidak dapat
dipanggil publik (mis. tidak ada di dispatch table runtime, atau
ditolak di gerbang sebelum handler); (c) bukti bahwa UI checker tidak
dapat memanggil `checkLink` (feature gate / UI dinonaktifkan pada
build live); (d) kontrol yang mencegah pemanggilan publik (bukan
sekadar "tidak ada link publik"); (e) log egress yang menunjukkan nol
fetch keluar dari `checkLink` pada periode pengamatan.

**Mengapa `artifact.inspect` TIDAK dipakai untuk F-019/F-006c:**
`artifact.inspect` adalah delegasi diagnosis atas laporan malfungsi
pengguna — pemakaiannya butuh `verbatim_request` berupa laporan
pengguna yang melaporkan malfungsi. Tidak ada laporan pengguna seperti
itu di sini, dan inspect bukan pembaca state read-only (ia
mendelegasikan ke builder diagnosis). Tool read-only yang tersedia
(`list_actions`/`status`) sudah dipakai dan tidak mengekspos
versi/digest atau isi file live. Bila tersedia jalur read-only baru
yang mengekspos versi/digest artifact, verifikasi akan diulang
melalui jalur itu.

**Risiko tersisa:** klaim "nonaktif" hanya bersandar pada dokumen,
bukan bukti runtime. **Aksi berikutnya:** owner/operator artifact
menyediakan bukti (a)–(e); sampai ada, status deployment tetap
**BLOCKED** dan laporan ini disampaikan ke owner melalui repo.

### F-020 — Medium: scope refactoring source mirror perlu klarifikasi otorisasi — **partially addressed** (fakta + dasar otorisasi tercatat; klarifikasi scope menunggu keputusan owner)

**Temuan (diterima):** commit `d85a1e2` mengubah dua file source
aplikasi mirror setelah revisi v2.3.10 menyatakan tidak ada kode
aplikasi yang diubah. Commit message menyatakan repo-only dan live
untouched; tidak ada approval artifact terpisah yang ditemukan dalam
materi repository yang ditinjau. Ini kebutuhan klarifikasi scope,
bukan tuduhan bahwa live diubah.

**Verifikasi sendiri via git (2026-11-08):**

```sh
git show d85a1e2 --stat
# docs/AUDIT_FIX_LIST_V1.md  | 346 +++++
# site/client/src/App.tsx    | 140 +++++----
# site/server/src/actions.ts | 283 ++++++++++++---
# 3 files changed, 673 insertions(+), 96 deletions(-)
git show --numstat d85a1e2
# 346  0   docs/AUDIT_FIX_LIST_V1.md
# 103  37  site/client/src/App.tsx
# 224  59  site/server/src/actions.ts
```

Commit `d85a1e2` (2026-11-07 19:17 UTC = 2026-11-08 02:17 WIB)
mengubah TEPAT 3 file di atas — tidak ada file lain, tidak ada
perubahan database/katalog. `docs/AUDIT_FIX_LIST_V1.md` menyatakan
batas cakupannya sendiri: "HANYA soal performa + refactoring. Bukan
remediasi keamanan. F-001..F-005 TETAP TERBUKA / BLOCKED … Perubahan
di sini repo-only (mirror `site/` di repo ini). Situs live
(`cek-link-airdrop`) TIDAK berubah oleh commit ini — live hanya
berubah lewat artifact tools dengan persetujuan terpisah."
Perubahan server: `listProjects` satu LEFT JOIN; `addProject`
WHERE-based duplicate check + max(sort); cache fetch (10 menit, maks
50) + cache RDAP (1 jam, sukses saja); deadline total 30 detik di
`analyze()`; fetch script paralel + dedup URL; regex module-level;
konteks katalog Gibran diringkas; retry 1× jeda 500 ms. Perubahan
client: `useMemo` + formatter tanggal module-level + banner error
mutasi. Verifikasi commit: typecheck di scratch copy exit 0; tidak
ada build; `app.db` tidak disentuh.

**Dasar otorisasi yang tercatat:**

1. Arahan Rama 2026-11-08 ~02:11 WIB — "Tetap kolab dengan gpt, dan
   tetap tingkatkan kualitas web" (dicatat di `MEMORY.md`) — arahan
   ini mendahului commit `d85a1e2` (~02:17 WIB) sekitar 6 menit.
2. Pekerjaan itu adalah konsolidasi 10 laporan audit performa (APInex,
   model gratis, biaya 0) yang didokumentasikan di
   `docs/AUDIT_FIX_LIST_V1.md`.

**Dicatat jujur:** **tidak ada artefak approval owner terpisah di
repo** (dokumen persetujuan tertulis, issue, atau catatan keputusan)
yang secara eksplisit mengotorisasi perubahan source aplikasi — baik
mirror maupun live. Aturan pemisahan tiga tahap mensyaratkan
persetujuan eksplisit terpisah untuk tahap (b) implementasi pada
source code. Pernyataan v2.3.10 "Tidak ada kode aplikasi yang diubah"
BENAR pada commit `12391e4`, tetapi menjadi BASI setelah `d85a1e2` —
koreksi ini dicatat di sini dan di §D.4.22 agar sejarah klaim tidak
menyesatkan. Bukti "live untouched" bersandar pada sisi repo (git
menunjukkan commit itu hanya menyentuh file repo; tidak ada
`artifact.edit` yang menjadi bagian commit itu) — tetapi versi/digest
live NOT VERIFIED (celah yang sama dengan F-019), sehingga "live
untouched" berstatus didukung bukti repo, bukan terbukti independen
di artifact.

**Keputusan v2.3.11 — HOLD:** tidak ada perubahan source aplikasi
lanjutan (mirror maupun live) sampai owner mengklarifikasi scope dan
memberi persetujuan tertulis atas ruang lingkup perubahan source.
Tidak ada revert yang dilakukan melalui revisi ini (sesuai instruksi
V4 §4.6 — jangan melakukan revert melalui audit).

**Risiko tersisa:** klarifikasi scope menunggu keputusan owner.
**Aksi berikutnya:** owner menjawab 3 pertanyaan scope di §6.

### F-001..F-005 — rencana remediasi dipertahankan + dipetakan ulang — **blocked** (desain selesai; implementasi + bukti staging menunggu tahap b)

Desain §D.4.18 tetap menjadi spesifikasi. Pemetaan implementasi
v2.3.11 (§D.4.22):

| Temuan | Kontrol implementasi (tahap b) | Harness | Test ID / bukti yang dibutuhkan | Lingkungan |
| --- | --- | --- | --- | --- |
| F-001 Critical | Validasi URL awal + tiap hop redirect + tiap script; resolve SEMUA jawaban A/AAAA; tolak-set; pinning IP ke koneksi; TLS terhadap hostname | H-SSRF-01..20 | Tiap kasus PASS/FAIL + raw log + commit + runtime + environment; log egress 0 koneksi untuk kasus blokir | Staging terisolasi |
| F-002 High | Streamed byte cap (compressed + decompressed); cap per request DAN total per pemeriksaan; abort saat cap terlampaui | H-RES-01..03 | Byte ter-buffer ≤ cap + overhead yang dinyatakan; memori proses dalam anggaran | Staging |
| F-003 High | Satu total deadline per pemeriksaan (RDAP + page + redirect + script); satu sinyal batal bersama; hasil parsial dibuang | H-RES-04..06 | Total waktu ≤ deadline + toleransi; konkurensi dalam batas; kelebihan ditolak fail-closed | Staging |
| F-004 Medium | Unique constraint (nama + alamat kontrak ternormalisasi) + insert atomik + migrasi yang gagal dengan laporan bila duplikat ada | H-CAT-01..03 | Hitung baris DB setelah tiap run = yang dinyatakan | Staging |
| F-005 Medium | Otorisasi `addProject` dari jalur terotorisasi yang didokumentasikan + provenance wajib; `checkLink` bukan jalur mutasi katalog | H-AUTH-01..03 | Keputusan otorisasi cocok dengan kebijakan pada tiap kasus | Staging |

**Keterkaitan baru (v2.3.11):**

1. Perbaikan cache F-016/F-017 berada di jalur kode yang sama dengan
   guard F-001 (`fetchText`) — keduanya wajib dikirim bersama dalam
   satu implementasi tahap (b); mengirim guard tanpa memperbaiki cache
   meninggalkan jendela false-negative yang sama.
2. Unique constraint F-004 dan kolom ownership F-018 adalah pekerjaan
   migrasi yang sama — wajib didesain sebagai SATU migrasi, bukan dua
   migrasi yang bertentangan.
3. `ctx.viewer` SDK (temuan F-018) adalah kandidat sumber identitas
   untuk mekanisme otorisasi F-005 (`isOwner`/`ownerUserId` sebagai
   dasar "hanya owner yang boleh menambah katalog") — keputusan
   mekanisme tetap di tangan owner, tetapi kandidat teknisnya kini
   bernama.
4. F-003 kini **PARTIALLY MITIGATED** di kode mirror — deadline total
   30 detik di `analyze()` (d85a1e2) diteruskan ke RDAP, halaman, dan
   script — tetapi TANPA tes regresi; status penutupan TIDAK berubah:
   F-003 tetap OPEN sampai H-RES-04..06 PASS di staging.

VM tidak dapat menggantikan staging untuk satu pun baris tabel di
atas. **Risiko tersisa:** implementasi + bukti staging belum ada.
**Aksi berikutnya:** otorisasi tahap (b) + klarifikasi F-020 +
staging tersedia (gate G-A/G-E).

### Reproducibility + ownership staging (handoff V4 butir 7) — **blocked** (tidak ada fakta baru v2.3.11)

**Reproducibility (F-009/F-014):** tidak ada run repro baru di
v2.3.11 (tidak ada yang perlu diulang — bukti VM yang valid tidak
diulang tanpa perubahan material, sesuai protokol). Status
v2.3.10 berdiri: SDK provenance NOT VERIFIED (tarball builder-local,
mtime 1 Jan 1980); Bun 1.4.4 vs deklarasi 1.3.10; build penuh TIDAK
dicoba; tidak ada test suite site; tidak ada CI. **Yang baru:**
inspeksi `.d.ts` SDK v2.3.11 membuktikan permukaan API SDK (tipe
`Viewer`, `PortableCtx`, `SpaceDb`), BUKAN provenance — tarball tetap
tidak ada di repo, tidak ada source/signature yang dapat diambil
clean builder. Status keseluruhan tetap: **NOT REPRODUCIBLE untuk
clean external builder**. Kriteria penerimaan handoff V4 butir 7
(bagian reproducibility) tidak terpenuhi.

**Ownership staging (F-013):** staging operator, kanal alert, egress
policy, staging DB+runtime tetap **UNASSIGNED/BLOCKED**; ST-01..ST-16
dan STAGE-P01..P12 tetap BLOCKED; tidak ada gate READY; tidak ada tes
staging yang dijalankan. Penugasan peran v2.3.10 (§D.4.19a) berdiri —
penugasan peran di atas kertas bukan bukti lingkungan/operator
tersedia (V4 §3.4, diterima).

### F-006b — narasi insiden di string kode — **blocked (OPEN)**

Tidak berubah. Proposal cleanup matriks v2.3.10 §4 tetap berlaku
(lokasi: `site/server/src/actions.ts` baris 51 — komentar
`KNOWN_BAD_DOMAINS`; baris 1088–1089 — `GIBRAN_SITE_KNOWLEDGE`).
Commit `d85a1e2` sengaja tidak menyentuh string narasi — commit
message mencatat "incident-narrative strings untouched (F-006
residual still open)". Perbaikan butuh edit source live tahap (b) +
otorisasi owner terpisah; TIDAK diedit diam-diam di mirror.

### F-006c — DATA-PLAN.md di live artifact — **partially addressed**

Tidak ada bukti baru di v2.3.11. Redaksi live SUDAH dilakukan dan
diverifikasi nol kecocokan 2026-11-08 ~00:59 WIB (artifact v13),
tetapi status kejujuran tetap: **"reported by Muse, not independently
verified"** — audit V4 tidak mengonfirmasinya, dan v2.3.11 tidak
menambah bukti independen. Alasan `artifact.inspect` tidak dipakai
dicatat di §2 F-019: inspect adalah delegasi diagnosis atas laporan
malfungsi pengguna, bukan pembaca state read-only; tool read-only
yang tersedia tidak mengekspos versi/digest atau isi file live
DATA-PLAN. Konfirmasi independen tetap menjadi tugas audit
berikutnya, melalui jalur bukti yang tersedia saat itu.

## §3. Response to Previous Handoff — status temuan V3 menurut audit V4 §3 (dicatat, bukan diklaim ulang)

Bagian ini mencatat bagaimana V4 menilai respons v2.3.10 — sebagai
catatan rekonsiliasi, bukan sebagai klaim baru Muse:

| Butir V3 | Penilaian V4 §3 | Catatan Muse v2.3.11 |
| --- | --- | --- |
| F-010 akuntansi bukti SU | ADDRESSED untuk koreksi manifest; bukti asli tetap tidak dapat dipulihkan | Diterima. Manifest terkoreksi + checker berdiri; klaim asli 9/9 × 4 tetap NOT VERIFIED dari bundle aslinya. Suplemen v2.3.9 bukan pengganti log asli. |
| F-011 matriks tester | ADDRESSED sebagai koreksi dokumen; tester tetap ON HOLD | Diterima. Tidak ada fixture/backend/deployment yang dibuat; hold Rama 2026-11-08 00:28 WIB tetap berlaku. |
| F-006 pemisahan residu | PARTIALLY ADDRESSED (F-006a addressed; F-006b OPEN/BLOCKED; F-006c NOT VERIFIED) | Diterima. Status §1 di atas mencerminkan pemisahan ini; F-006c tetap "reported by Muse, not independently verified". |
| F-013 owner staging | PARTIALLY ADDRESSED; seluruh gate tetap BLOCKED | Diterima. §D.4.19a memberi owner/peran; operator/alert/egress/DB tetap UNASSIGNED — penugasan peran bukan bukti ketersediaan. |
| F-009/F-014 reproduksibilitas | PARTIALLY ADDRESSED; clean external builder tetap NOT REPRODUCIBLE | Diterima. Bukti VM (frozen install + typecheck, Bun 1.4.4) bukan bukti build eksternal; SDK path lokal + mismatch Bun tetap. |
| F-015 klaim same-origin | ADDRESSED pada mirror; LIVE NOT VERIFIED/BLOCKED | Diterima. Teks koreksi live sudah disiapkan (`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md`), belum diterapkan — butuh approved artifact workflow. |
| U-46 dependensi fallback | OPEN, tetapi ruang lingkup blokir dipersempit dengan benar | Diterima. Pemetaan presisi v2.3.10 dipertahankan di v2.3.11 (§D.4.22): U-46 hanya memblokir worker-signaling fallback path. |

**Kesimpulan V4 §3.8 (diterima):** respons v2.3.10 membuktikan adanya
respons di repository, bukan bahwa semua temuan keamanan telah
ditutup. F-001..F-005 tetap terbuka; F-006b/c belum selesai; F-014
belum memenuhi clean external reproducibility; staging belum tersedia.

## §4. Jawaban atas Handoff V4 §9 (8 butir)

1. **F-019 — buktikan Link Scanner tetap nonaktif** — Dijawab §2
   F-019: bukti read-only `list_actions` (checklink MASIH TERDAFTAR)
   + `status` (tidak ada build berjalan, `share.shared=false`,
   `share.url=null`) dikumpulkan 2026-11-08 ~02:47–02:50 WIB;
   `checkLink` TIDAK di-invoke; tidak ada versi/digest yang
   terekspos; status **NOT VERIFIED / BLOCKED**; kontrol runtime yang
   dibutuhkan didaftar (a)–(e); deployment tetap BLOCKED.
2. **F-016 — perbaiki freshness cache** — Dijawab §2 F-016 +
   §D.4.22: keputusan desain (hapus cache untuk security scan sebagai
   rekomendasi utama; alternatif ber-syarat bila dipertahankan);
   spesifikasi tes H-CACHE-01..04 (benign→malicious dalam TTL,
   failure→recovery, tanpa penguncian null, freshness + bypass
   re-check). Tidak ada perubahan kode sebelum otorisasi source change
   (HOLD F-020).
3. **F-017 — perbaiki cache key/cap mismatch** — Dijawab §2 F-017 +
   §D.4.22: key WAJIB menyertakan cap; alternatif raw-store DITOLAK
   dengan alasan teknis (bertentangan dengan F-002); spesifikasi tes
   H-CACHE-05/06 (dua urutan 300 KB → 400 KB dan 400 KB → 300 KB).
4. **F-018 — buktikan batas data pengguna** — Dijawab §2 F-018 +
   §D.4.22: dokumentasi/source SDK dilampirkan sebagai bukti
   (`server-contract.d.ts`: `PortableCtx.db` + `viewer?: Viewer`
   dengan `ownerUserId`/`isOwner`); dicatat jujur bahwa SDK TIDAK
   menyatakan scope DB (per-user vs shared); fakta skema tanpa owner
   diverifikasi; desain ownership/partitioning + spesifikasi tes dua
   principal H-TEN-01..05 disiapkan. Tenancy tetap NOT VERIFIED;
   tidak ada klaim aman dari komentar skema.
5. **F-020 — klarifikasi scope commit d85a1e2** — Dijawab §2 F-020 +
   §D.4.22: dasar otorisasi yang tercatat (arahan Rama ~02:11 WIB +
   konsolidasi 10 audit performa); daftar perubahan (`git show`
   d85a1e2 — tepat 3 file); bukti repo-only "live untouched" dengan
   caveat versi/digest live NOT VERIFIED; **HOLD perubahan source
   aplikasi lanjutan** sampai scope disetujui owner; tidak ada revert.
6. **Pertahankan remediasi F-001..F-005 dan bukti staging** — Dijawab
   §2 F-001..F-005 + §D.4.22: rencana implementasi dipetakan ke
   H-SSRF-01..20 / H-RES-01..06 / H-CAT-01..03 / H-AUTH-01..03 dengan
   test ID, kriteria PASS/FAIL, lingkungan staging, dan destinasi
   bukti; keterkaitan baru dicatat (cache bersama guard F-001; satu
   migrasi F-004+F-018; `ctx.viewer` sebagai kandidat identitas
   F-005); F-003 PARTIALLY MITIGATED di kode tanpa tes regresi —
   status penutupan tidak berubah. VM tidak menggantikan staging.
7. **Tutup gap reproducibility dan ownership staging** — Dijawab §2
   (bagian reproducibility/staging): tidak ada fakta baru; SDK
   provenance tetap NOT VERIFIED (inspeksi `.d.ts` membuktikan API,
   bukan provenance); Bun mismatch, build penuh, dan CI tetap NOT
   VERIFIED; staging operator/alert/egress/DB tetap UNASSIGNED;
   ST-01..ST-16 dan STAGE-P01..P12 tetap BLOCKED. Kriteria penerimaan
   butir ini tidak terpenuhi — dicatat apa adanya.
8. **Tutup verifikasi F-006c tanpa mengungkap data pribadi** —
   Dijawab §2 F-006c: tidak ada bukti independen baru; status tetap
   "reported by Muse, not independently verified"; alasan tidak
   memakai `artifact.inspect` dicatat; tidak ada narasi atau nilai
   sensitif yang disalin ke revisi ini. F-006b tetap OPEN sampai ada
   keputusan dan otorisasi terpisah untuk source cleanup.

## §5. Hard gates — ditegaskan kembali (v2.3.11)

Tidak satu pun dari yang berikut diizinkan oleh revisi ini:

- **No Link Scanner activation** — scanner tetap nonaktif; mitigasi G0
  (tolak semua URL arbitrer) tetap menjadi penahan. F-019 tetap
  NOT VERIFIED / BLOCKED.
- **No public deployment** — public tester tetap ON HOLD (Rama,
  2026-11-08 00:28 WIB); tidak ada deploy dari revisi ini.
- **No production build** — build penuh tidak dicoba di VM ini (house
  rules); tidak ada klaim build.
- **No DB/catalog change** — tidak ada migrasi, tidak ada perubahan
  katalog, tidak ada perubahan `app.db`.
- **No source implementation** — F-001..F-005 tetap OPEN/BLOCKED sampai
  otorisasi eksplisit tahap (b) dari pemilik + harness staging PASS +
  review independen. **DITAMBAH v2.3.11: HOLD perubahan source mirror
  sampai klarifikasi scope F-020.**
- **No production testing** — tidak ada pemanggilan action produksi
  (termasuk `checkLink`) sebagai bagian revisi ini.

## §6. Yang butuh keputusan Rama (pemilik proyek)

1. **Scope perubahan source (F-020) — BARU, paling mendesak:**
   (a) Apakah arahan "tetap tingkatkan kualitas web" (2026-11-08
   ~02:11 WIB) mencakup perubahan source mirror repo-only untuk
   performa seperti d85a1e2? (b) Apakah perubahan source mirror
   memerlukan approval terpisah yang sama dengan perubahan live?
   (c) Batas mana yang berlaku untuk pekerjaan kualitas web
   berikutnya? Sampai ada jawaban tertulis, HOLD perubahan source
   tetap berlaku.
2. **Otorisasi implementasi tahap (b) untuk F-001..F-005** — TIDAK
   diberikan saat ini.
3. **Keputusan U-46** — opsi (a) terima fallback terkuantifikasi ATAU
   opsi (b) larang mutlak + ganti fallback. Tanpa ini, implementasi
   pensinyalan worker (cabang fallback) tetap diblokir — tetapi
   F-001 guard, F-002..F-005, cache, dan tenancy TIDAK diblokir
   oleh U-46.
4. **Keputusan tenancy F-018 — BARU:** per-user vs shared untuk
   `ctx.db` (butuh pernyataan resmi runtime provider); cabang desain
   ownership yang dipilih.
5. **Keputusan cache F-016 — BARU:** rekomendasi utama (hapus cache
   untuk security scan) vs alternatif ber-syarat (cache dipertahankan
   dengan freshness + bypass re-check).
6. **Mekanisme otorisasi addProject (F-005)** — pilih mekanisme +
   fakta scoping endpoint runtime artifact. Kandidat baru:
   `ctx.viewer` (`isOwner`/`ownerUserId`) sebagai sumber identitas.
7. **Proposal privacy cleanup F-006b (§4 matriks v2.3.10)** — setujui/
   tolak edit source live untuk `actions.ts:51` +
   `GIBRAN_SITE_KNOWLEDGE`.
8. **Koreksi teks DATA-PLAN live (F-015)** — ajukan via artifact
   workflow (`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md`
   sudah disiapkan).
9. **Bukti runtime F-019 — BARU:** siapa yang dapat menyediakan
   versi/digest artifact + bukti kontrol disabled (butir (a)–(e)
   §2 F-019)? Sampai ada, deployment tetap BLOCKED.
10. **Staging (tahap 3)** — lingkungan staging belum ada; peran
    UNASSIGNED (operator, kanal alert, egress policy, DB+runtime)
    butuh penamaan oleh pemilik sebelum ST-01..ST-16 dapat
    dijadwalkan.
11. **Public tester** — tetap ON HOLD; pencabutan hold + pilihan
    bentuk rilis (visual preview vs functional tester) adalah
    keputusan pemilik.

## §7. Yang TIDAK diklaim v2.3.11

- Tidak ada implementasi kode F-001..F-005, F-016, F-017, atau F-018;
  tidak ada perubahan perilaku aplikasi live; tidak ada perubahan
  database/katalog; tidak ada production build; Link Scanner tidak
  diaktifkan; public tester tidak disentuh di luar status ON HOLD.
- Tidak ada klaim "F-016/F-017 selesai" — keduanya partially
  addressed pada level desain; penutupan butuh implementasi tahap (b)
  + H-CACHE-01..06 PASS di staging.
- Tidak ada klaim "F-018 aman" atau "F-018 rentan" — semantik tenancy
  NOT VERIFIED; yang ada adalah bukti SDK + fakta skema + desain
  untuk kedua cabang.
- Tidak ada klaim "scanner nonaktif terbukti" — F-019 NOT VERIFIED /
  BLOCKED; bukti read-only yang ada justru menunjukkan action
  `checklink` masih ter-publish.
- Tidak ada klaim "d85a1e2 terotorisasi penuh" — dasar otorisasi yang
  tercatat sudah didokumentasikan, tetapi tidak ada artefak approval
  terpisah di repo; klarifikasi scope menunggu owner.
- Redaksi live F-006c dicatat sebagai "reported by Muse, not
  independently verified" — bukan sebagai fakta yang sudah diaudit.
- Sampai commit v2.3.11 masuk `main`, tidak ada kemajuan teknis yang
  dapat diverifikasi dari repo.

## §8. Gate konkret berikutnya (v2.3.11 → v2.3.12)

| Gate | Isi | Prasyarat | Pemicu revisi berikutnya |
| --- | --- | --- | --- |
| G-A | Keputusan owner atas scope perubahan source (F-020) | Jawaban atas 3 pertanyaan scope (§6 butir 1) | Keputusan tertulis owner |
| G-B | Bukti runtime F-019 | Versi/digest artifact + kontrol disabled yang dapat diverifikasi (butir (a)–(e) §2 F-019) | Bukti dari operator artifact |
| G-C | Keputusan tenancy F-018 | Pernyataan resmi runtime provider tentang scope `ctx.db` | Pernyataan provider / keputusan owner |
| G-D | Keputusan U-46 | Keputusan tertulis owner opsi (a)/(b) | Keputusan tertulis owner |
| G-E | Staging tersedia + peran UNASSIGNED terisi | Penamaan operator, kanal alert, egress policy, DB+runtime oleh owner | Lingkungan staging tersedia |

Pemicu revisi v2.3.12: keputusan owner atas G-A/G-C/G-D, ATAU bukti
runtime G-B, ATAU audit independen V5 — mana pun yang datang dulu.
Tidak ada revisi baru yang hanya mengulang status v2.3.11.
