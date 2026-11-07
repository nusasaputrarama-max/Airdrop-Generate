# Daftar Perbaikan Terpadu — Hasil Konsolidasi Audit Performa AIRDROP GENERATE

**Tanggal:** 2026-11-08
**Sumber:** konsolidasi 10 laporan audit performa + refactoring (semua via APInex,
model gratis, biaya 0), masing-masing dalam Bahasa Indonesia:

| # | Model | Laporan |
|---|-------|---------|
| 1 | Muse Spark 1.3 | `airdrop-generate-audit-20261108.md` (audit penuh) |
| 2 | DeepSeek V4.1 Flash | `airdrop-generate-audit-deepseek-20261108.md` (server + client) |
| 3 | GLM-5.3 Flash | `airdrop-generate-audit-glm-20261108.md` (server + client) |
| 4 | Qwen 3.8 MAX | `airdrop-generate-audit-qwen-20261108.md` (server + client) |
| 5 | Gemini 3.8 Flash | `airdrop-generate-audit-gemini-20261108.md` (server + client) |
| 6 | Kimi K3 | `airdrop-generate-audit-kimi-20261108.md` (server + client) |
| 7 | HY 4 | `airdrop-generate-audit-hy4-20261108.md` (server + client) |
| 8 | Mimo V2.6 Flash | `airdrop-generate-audit-mimo-20261108.md` (server + client) |
| 9 | MiniMax M3.1 Flash | `airdrop-generate-audit-minimax-20261108.md` (server + client) |
| 10 | GPT 6 Luna | `airdrop-generate-audit-gptoneluna-20261108.md` (server + client) |

**Singkatan model di bawah:** MS = Muse Spark, DS = DeepSeek, GLM, QW = Qwen,
GM = Gemini, KI = Kimi, HY = HY 4, MI = Mimo, MM = MiniMax, GL = GPT Luna.

**Metode:** temuan yang sama dari berbagai model digabung (dedupe) menjadi satu
item. Nomor baris di bawah adalah perkiraan dari masing-masing laporan audit —
nomor baris antar-model berbeda karena tiap model mengutip perkiraan sendiri;
yang dipakai sebagai acuan implementasi adalah kode mirror `site/` pada commit
`c68c727` (sama dengan kode live per v2.3.10; tidak ada perubahan kode aplikasi
sejak itu). Semua temuan sudah diverifikasi keberadaannya di kode mirror sebelum
diimplementasikan.

**Batasan cakupan (penting):**

- Dokumen ini HANYA soal performa + refactoring. **Bukan** remediasi keamanan.
- **F-001..F-005 (SSRF dkk.) TETAP TERBUKA / BLOCKED** — implementasi remediasi
  keamanan butuh persetujuan pemilik + bukti staging (lihat
  `SSRF_REMEDIATION_DESIGN.md` v2.3.10). Begitu juga temuan audit V3
  **F-010..F-015 TETAP TERBUKA**. Tidak ada satu pun item di sini yang menutup
  temuan keamanan tersebut.
- Dua perbaikan di bawah bersinggungan dengan desain F-002/F-003 (deadline total
  dan cache): yang diimplementasikan adalah **versi minimal performa saja**
  (satu `AbortController` 30 detik; cache in-memory bertingkat TTL). Kontrol
  keamanan lengkap F-002/F-003 (streaming byte limit, validasi per-hop, dst.)
  tetap menjadi bagian desain remediasi yang belum diimplementasikan.
- Perubahan di sini **repo-only** (mirror `site/` di repo ini). Situs live
  (`cek-link-airdrop`) TIDAK berubah oleh commit ini — live hanya berubah lewat
  artifact tools dengan persetujuan terpisah.

**Legenda status:** ✅ Diimplementasikan · ⏸️ Ditunda (alasan dicantumkan) ·
❌ Tidak diimplementasikan (alasan dicantumkan).

---

## Bagian A — Server (`site/server/src/actions.ts`)

### ✅ S1. `listProjects`: gabungkan query katalog + savedProjects jadi satu JOIN
- **Apa:** dua query penuh (`SELECT` seluruh `projects` + `SELECT` seluruh
  `savedProjects`) plus join manual di JavaScript diganti satu query
  `LEFT JOIN` — satu round-trip DB, tidak ada lagi join di memori.
- **File:** `site/server/src/actions.ts`, handler `listProjects`.
- **Model:** MS, DS, GLM, QW, GM, KI, HY, MI, MM, GL (10/10).
- **Usaha:** rendah–sedang.
- **Status:** ✅ Diimplementasikan.

### ✅ S2. Deadline total per pemeriksaan di `analyze()` (versi minimal performa)
- **Apa:** satu `AbortController` 30 detik (`AbortSignal.timeout(30_000)`)
  dibuat di `analyze()` dan diturunkan ke `lookupRdap` + `fetchText`
  (halaman + script) lewat `AbortSignal.any()` digabung dengan timeout 12 detik
  per-request. Bila deadline tercapai, pemeriksaan gagal secara graceful
  (halaman tercatat tidak terjangkau) — bukan hang.
- **File:** `site/server/src/actions.ts`, `analyze`, `fetchText`, `lookupRdap`.
- **Model:** MS, DS, GLM, QW, GM, KI, HY, MI, MM, GL (10/10).
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan (versi minimal). **F-003 tetap TERBUKA** —
  kontrol keamanan lengkap (streaming byte limit, validasi per-hop, dsb.)
  tetap menunggu implementasi remediasi yang disetujui.

### ✅ S3. Paralelkan fetch 3 script di `analyze()` (+ dedup URL)
- **Apa:** loop serial `for...await` diganti `Promise.all` (hasil tetap urut),
  dengan dedup URL via `Set` sebelum fetch. Worst case script fetch turun dari
  ~36 detik menjadi ~12 detik (dibatasi timeout per script + deadline total).
- **File:** `site/server/src/actions.ts`, `analyze` (bagian fetch script).
- **Model:** MS, DS, GLM, QW, GM, KI, HY, MI, MM, GL (10/10).
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ S4. Pre-compile regex + hilangkan O(n²) di `extractContracts`
- **Apa:** empat regex `/g` dipindah ke konstanta module-level (di-compile
  sekali saat modul dimuat, bukan setiap panggilan). Pemeriksaan pengulangan
  substring Solana diubah dari `cand.split(chunk)` berulang menjadi
  pengecekan chunk yang sudah didedup — predikatnya persis sama (chunk 4
  karakter yang muncul ≥ 3 kali tanpa overlap), hanya komputasi yang
  dihemat.
- **File:** `site/server/src/actions.ts`, `extractContracts`.
- **Model:** MS, DS, GLM, QW, GM, KI, HY, MI, MM, GL (10/10).
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ S5. Ringkas konteks katalog yang dikirim ke Gibran
- **Apa:** `catalogText` di `askGibran` tidak lagi memuat `description`,
  `reward_note`, dan `verified_note` lengkap per proyek; yang dikirim hanya
  ringkasan per proyek (nama, ticker, chain, kategori, segmen + status,
  kesulitan, kontrak, X, tanggal verifikasi). Prompt mengecil ~70–80%.
- **Trade-off (dicatat jujur):** Gibran tidak lagi bisa menjawab detail
  reward/distribusi dan catatan verifikasi dari ingatannya — bila ditanya
  hal itu, ia akan jujur bilang datanya tidak ada dan mengarahkan ke kartu
  detail proyek (yang tetap menampilkan teks lengkap). Ini sesuai aturan
  keras Gibran (jangan mengarang).
- **File:** `site/server/src/actions.ts`, `askGibran`.
- **Model:** MS, DS, GLM, QW, GM, KI, HY, MI, MM, GL (10/10).
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ S6. `addProject`: cek duplikat dengan query WHERE, bukan SELECT *
- **Apa:** `SELECT *` seluruh katalog diganti tiga query spesifik:
  `SELECT id ... WHERE lower(name) = ?`, `SELECT id ... WHERE
  lower(contract_address) = ?` (bila ada kontrak), dan `SELECT sort ...
  ORDER BY sort DESC LIMIT 1` untuk `nextSort`. Perilaku duplikat persis
  sama (nama case-insensitive, kontrak case-insensitive); tidak ada
  perubahan skema, tidak ada unique constraint baru.
- **File:** `site/server/src/actions.ts`, `addProject`.
- **Model:** MS, DS, GLM, QW, GM, KI, HY, MI, MM, GL (10/10).
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ S7. Cache in-memory untuk hasil fetch + RDAP (TTL singkat, ukuran dibatasi)
- **Apa:** `Map` module-level: cache hasil `fetchText` per URL persis
  (TTL 10 menit, maks 50 entri, evict entri terlama) dan hasil `lookupRdap`
  per domain (TTL 1 jam, maks 100 entri, hanya respons sukses yang
  di-cache). Cek ulang link/domain yang sama dalam TTL tidak mengulang
  fetch keluar.
- **Catatan:** cache menyimpan hasil apa adanya — tidak mengubah logika
  vonis (input sama → output sama). Ini BUKAN kontrol keamanan dan tidak
  mengubah status F-001/F-002/F-003.
- **File:** `site/server/src/actions.ts`, `fetchText`, `lookupRdap`.
- **Model:** MS, DS, GLM, QW, GM, KI, HY, MI, MM, GL (10/10).
- **Usaha:** sedang.
- **Status:** ✅ Diimplementasikan.

### ✅ S8. `KNOWN_BAD_DOMAINS` menjadi `Set` (lookup O(1))
- **Apa:** array diubah menjadi `Set` + helper `isKnownBadDomain()`.
  **Isi daftar tidak berubah** (tetap `solbarn.cc`, `sharkmoon.tech`,
  urutan sama). Komentar narasi insiden di baris 51 dan teks
  `GIBRAN_SITE_KNOWLEDGE` TIDAK disentuh (residu F-006b, tetap terbuka
  sebagai follow-up stage-b).
- **File:** `site/server/src/actions.ts` (deklarasi + 2 call site + 1 `.join`).
- **Model:** DS.
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ S9. Retry 1× dengan backoff untuk fetch/RDAP
- **Apa:** bila `fetchText` / `lookupRdap` gagal karena error jaringan
  (bukan karena deadline total tercapai), coba sekali lagi setelah jeda
  500 ms. Retry dibatasi deadline total yang sama, jadi tidak pernah
  memperpanjang pemeriksaan melewati 30 detik.
- **File:** `site/server/src/actions.ts`, `fetchText`, `lookupRdap`.
- **Model:** GL, GM, QW (disebut juga sebagai tidak adanya retry di DS).
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ⏸️ S10. Cache hasil `listProjects` di module scope (TTL 60 dtk)
- **Alasan ditunda:** berisiko stale — `setProjectState` (bookmark/status)
  mengubah state lewat jalur lain; cache server tidak tahu kapan harus
  invalidasi, sehingga toggle bookmark bisa tampil basi sampai TTL habis.
  JOIN (S1) sudah memangkas biaya ke satu query; cache katalog butuh desain
  invalidasi dulu.
- **Model:** HY, MI, MM.

### ⏸️ S11. Turunkan cap halaman/script & batasi total haystack (mis. 400 KB → 150 KB)
- **Alasan ditunda:** mengubah cakupan deteksi checker (sinyal yang
  terpotong tidak masuk vonis) — keputusan produk, bukan sekadar performa.
  Cap yang berlaku (400 KB halaman, 300 KB script) dipertahankan.
- **Model:** KI, MM, GL.

### ⏸️ S12. Unique index / unique constraint (`projects.name`, `contract_address`)
- **Alasan ditunda:** butuh migrasi database baru. Selain itu, unique
  constraint adalah bagian dari F-004 — yang implementasinya secara
  eksplisit di luar cakupan ini.
- **Model:** KI, MM, GL.

### ⏸️ S13. Index DB (`checks.created_at`, `projects(sort, id)`, dsb.)
- **Alasan ditunda:** butuh migrasi database baru.
- **Model:** GL.

### ❌ S14. Hapus validasi Zod di `rowToCheck`
- **Alasan tidak diimplementasikan:** validasi Zod adalah penjaga integritas
  data riwayat; menghapusnya menukar keamanan data dengan gain kecil.
- **Model:** MI.

### ⏸️ S15. Bedakan jenis kegagalan fetch/RDAP (structured error, bukan `null`)
- **Alasan ditunda:** mengubah kontrak error internal `analyze` (observability)
  — butuh desain, bukan perbaikan performa murni.
- **Model:** QW, GM, GL.

### ⏸️ S16. Early-write di `runCheck` (simpan sebelum I/O selesai)
- **Alasan ditunda:** robustness, bukan performa; di luar cakupan.
- **Model:** HY.

### ⏸️ S17. Pindahkan `CATALOG` ke file terpisah / seed via migrasi
- **Alasan ditunda:** perubahan struktur; seeding sudah idempotent
  (migrasi 0004 + guard `LIMIT 1` di `listProjects`).
- **Model:** GL.

### ⏸️ S18. Paginasi `listProjects` (limit/offset)
- **Alasan ditunda:** butuh perubahan kontrak API + kerja client
  (paginasi UI); JOIN (S1) sudah cukup untuk skala saat ini.
- **Model:** HY.

### ⏸️ S19. Guard panjang HTML sebelum regex Solana (`htmlOnly.length > 1_000_000`)
- **Alasan ditunda:** mengubah cakupan deteksi pada halaman raksasa
  (alamat Solana asli bisa terlewat) — keputusan produk.
- **Model:** GL.

---

## Bagian B — Client (`site/client/src/App.tsx`)

### ✅ C1. `useMemo` untuk `stats` + `detailFresh` di `App`
- **Apa:** array `stats` (4 item, 2× `.filter()`) dan `detailFresh`
  (`Array.find` per render) dibungkus `useMemo` dengan deps `[projects,
  checks]` / `[detail, projects]`.
- **File:** `site/client/src/App.tsx`, `App`.
- **Model:** DS, KI, HY, MI, MM, GL (6/10; MS tidak menyebutkannya).
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ C2. `useMemo` untuk `tracked` + `counts` di `DashboardSection`
- **Apa:** `tracked` (1× filter) dan `counts` (3× filter) dibungkus
  `useMemo` dengan deps `[projects]` / `[tracked, checks]`.
- **File:** `site/client/src/App.tsx`, `DashboardSection`.
- **Model:** DS, KI, HY, MI, MM, GL (6/10).
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ C3. `useMemo` agregat sekali-jalan di `CategoriesSection`
- **Apa:** 7× `.filter()` per kategori per render diganti satu loop
  `useMemo` yang menghitung semua count sekaligus (`Map` kategori →
  jumlah).
- **File:** `site/client/src/App.tsx`, `CategoriesSection`.
- **Model:** KI, MM, GL.
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ C4. Gabung `featured` + daftar sisa dalam satu `useMemo` di `ExploreSection`
- **Apa:** `filtered.filter(live)` dan `filtered.filter(bukan live)` yang
  dihitung di luar `useMemo` digabung menjadi satu pemisahan sekali-jalan
  dalam `useMemo` (deps `[filtered]`).
- **File:** `site/client/src/App.tsx`, `ExploreSection`.
- **Model:** KI, MM, GL.
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ C5. Memoize `monogram` + `hue` di `ProjectCard`
- **Apa:** `monogram(project.name)` dan `(project.id * 47) % 360`
  dibungkus `useMemo` (deps `[project.name]` / `[project.id]`).
- **File:** `site/client/src/App.tsx`, `ProjectCard`.
- **Model:** KI, HY, MI, MM, GL.
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ C6. Cache instance `Intl.DateTimeFormat` di module scope
- **Apa:** `fmtDateTime` / `fmtDateOnly` tidak lagi membuat
  `Intl.DateTimeFormat` baru setiap panggilan; dua instance dibuat sekali
  di module scope dan dipakai ulang.
- **File:** `site/client/src/App.tsx` (fungsi `fmtDateTime`/`fmtDateOnly`).
- **Model:** KI, HY, MI, MM, GL.
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ✅ C7. `onError` informatif pada mutation (`checkMut`, `deleteMut`, `stateMut`)
- **Apa:** ketiga mutation yang tadinya hanya punya `onSuccess` kini punya
  `onError` yang menampilkan pesan kesalahan berbahasa Indonesia lewat
  banner `actionError` di `App` (bisa ditutup). Sebelumnya, kegagalan
  `deleteMut` dan `stateMut` tidak terlihat sama sekali oleh pengguna.
- **Catatan:** `checkMut` tetap juga menampilkan error inline lewat prop
  `checkError` yang sudah ada — jadi pesan yang sama bisa tampil dua kali
  (banner + inline). Tumpang tindih kecil ini dicatat untuk disatukan pada
  cleanup berikutnya; bukan regresi.
- **File:** `site/client/src/App.tsx`, `App`.
- **Model:** DS, GL.
- **Usaha:** rendah.
- **Status:** ✅ Diimplementasikan.

### ⏸️ C8. `React.memo` pada `ProjectCard` + `useCallback` handler (`toggleBookmark`, `changeTaskStatus`, `openDetails`, `go`/`jump`)
- **Alasan ditunda:** memo hanya efektif bila semua prop stabil — butuh
  stabilisasi semua handler di `App` sekaligus; usaha sedang, risiko prop
  basi. Bukan bagian dari cakupan yang disetujui revisi ini.
- **Model:** GL, KI, HY.

### ⏸️ C9. Debounce input pencarian
- **Alasan ditunda:** mengubah perilaku input (latensi ketik) — keputusan
  produk.
- **Model:** HY.

### ⏸️ C10. Lazy-load gambar `gibranMascot`
- **Alasan ditunda:** perubahan pipeline aset; butuh verifikasi bahwa lazy
  import bekerja dengan artifact builder.
- **Model:** MI.

### ⏸️ C11. Pindahkan konstanta (`VERDICT`, `SEGMENT_META`, `TASK_META`, `DIFFICULTY_LABEL`) ke `constants.ts`
- **Alasan ditunda:** restrukturisasi file; tanpa gain runtime.
- **Model:** MS, KI, GL.

### ⏸️ C12. Ekstrak util (`monogram`, `fmt*`) ke `utils/format.ts`
- **Alasan ditunda:** restrukturisasi file; tercakup sebagian oleh C5/C6
  di tempat.
- **Model:** HY.

### ⏸️ C13. Optimasi scroll chat Gibran (`requestAnimationFrame` / scroll-ke-pesan-terakhir)
- **Alasan ditunda:** mengubah perilaku scroll (UX); butuh pengecekan produk.
- **Model:** KI, HY, MI, MM, GL.

### ⏸️ C14. Inline `style` dinamis → class Tailwind
- **Alasan ditunda:** refactor besar tanpa gain terukur.
- **Model:** HY, MI.

### ⏸️ C15. Virtualisasi daftar sinyal (`CheckDetail`)
- **Alasan ditunda:** pekerjaan masa depan; sinyal saat ini < 10.
- **Model:** MM.

### ❌ C16. Gabungkan 2 query React Query (`projects` + `checks`) jadi satu
- **Alasan tidak diimplementasikan:** React Query sudah menangani dedup /
  caching; gain tidak terukur; penggabungan mengubah permukaan API.
- **Model:** MS.

---

## Temuan yang diverifikasi bukan masalah (sudah ditangani)

- `listChecks` sudah punya `limit` (default 30, maks 100) — klaim "memuat
  seluruh riwayat" tidak terbukti di kode.
- `VERDICT`, `SEGMENT_META`, `TASK_META`, `DIFFICULTY_LABEL` sudah di
  module scope — tidak di-recreate per render (dicatat juga sebagai "sudah
  baik" oleh HY dan MM).
- `filtered` di `ExploreSection` sudah `useMemo` dengan deps lengkap.
- `useEffect` favicon di `App` punya deps `[]` — hanya jalan sekali.
- `askMut` (GibranChat) sudah punya `onError` — tidak perlu diubah.

---

## Verifikasi revisi ini

- Typecheck client + server di scratch copy (`/tmp/scratch-site`,
  `bun install --frozen-lockfile` lalu typecheck): **exit 0**
  (lihat commit message untuk detail perintah).
- Tidak ada `bun run build` yang dijalankan; tidak ada `app.db` yang disentuh.
- Perubahan repo-only; situs live tidak berubah.
