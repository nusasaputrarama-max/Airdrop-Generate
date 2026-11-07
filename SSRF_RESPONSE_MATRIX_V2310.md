# SSRF RESPONSE MATRIX v2.3.10 — Jawaban atas Audit Independen ChatGPT V3

**Dokumen:** matriks respons revisi desain v2.3.10
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_INDEPENDENT_AUDIT_V3.md` (commit `b42b02a`, 2026-11-08 01:21 WIB)
  — temuan baru F-010..F-015 + Muse Handoff §8 (7 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.10:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.10 — §D.4.21 ringkasan revisi, §D.4.19a kepemilikan staging
lengkap), `SSRF_REPRODUCIBILITY_V238.md` (direkonsiliasi — bagian
"Rekonsiliasi v2.3.10"), `evidence/v236/MANIFEST.md` (terkoreksi F-010),
`scripts/verify-evidence-manifest.mjs` (checker baru) +
`evidence/v236/VERIFY-20261108.txt` /
`evidence/v236-supplement-20261108/VERIFY-20261108.txt` (output checker),
`evidence/v239-repro/` (manifest + output mentah repro F-009/F-014),
`docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md` (terkoreksi F-011),
`site/DATA-PLAN.md` (terkoreksi F-015, mirror),
`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md` (teks koreksi live
artifact yang disiapkan, belum diterapkan).

**Catatan pola penamaan:** matriks ini adalah file BARU
(`SSRF_RESPONSE_MATRIX_V2310.md`), bukan edit atas
`SSRF_RESPONSE_MATRIX_V238.md` — file v2.3.9 dipertahankan utuh sebagai
catatan sejarah revisi itu. Temuan F-001..F-009 dibawa ke sini dengan
status terbarunya; yang baru di v2.3.10 hanyalah F-010..F-015 dan
ketujuh jawaban handoff V3.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.10

Sesuai keputusan pemilik proyek (2026-11-07 ~23:56 WIB, dikonfirmasi
~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan tidak boleh
dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.10.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.10 TIDAK mengimplementasikan apa pun. |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.10. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.** Satu-satunya perubahan "dokumen" di `site/` pada v2.3.10
adalah koreksi teks `site/DATA-PLAN.md` (F-015, dokumen — bukan kode
aplikasi). Tidak ada perubahan perilaku aplikasi, tidak ada perubahan
database/katalog, tidak ada production build, Link Scanner tidak
diaktifkan. Public tester tetap **ON HOLD** (perintah Rama 2026-11-08
00:28 WIB).

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Tidak ada butir yang berstatus ini di v2.3.10 — semua temuan V3 diterima sebagai sah. |

## §1. Ringkasan status F-001..F-015

| ID | Severity | Status v2.3.10 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah sejak v2.3.8: desain + harness H-SSRF-01..20 selesai; implementasi menunggu otorisasi tahap (b). Link Scanner tetap nonaktif. |
| F-002 | High — cap setelah buffering | **blocked** | Tidak berubah: desain streamed cap selesai; implementasi menunggu otorisasi. |
| F-003 | High — tanpa total deadline | **blocked** | Tidak berubah: desain total deadline selesai; implementasi menunggu otorisasi. |
| F-004 | Medium — addProject duplicate race | **blocked** | Tidak berubah: desain unique constraint selesai; implementasi menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Tidak berubah sejak v2.3.9: auth di dalam kode TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED; mekanisme otorisasi butuh keputusan pemilik. |
| F-006a | Medium — redaksi dokumen mirror `site/DATA-PLAN.md` | **addressed** | Redaksi + rescan v2.3.8 berdiri; tidak ada perubahan di v2.3.10. |
| F-006b | Medium — narasi insiden di string kode (`actions.ts:51`, `GIBRAN_SITE_KNOWLEDGE` ~baris 1089) | **blocked (OPEN)** | Perbaikan butuh edit source live tahap (b) + otorisasi owner terpisah; TIDAK diedit diam-diam di mirror. Proposal cleanup di §4. |
| F-006c | Medium — DATA-PLAN.md di live artifact | **partially addressed** | Redaksi live SUDAH dilakukan dan diverifikasi 2026-11-08 ~00:59 WIB (nol kecocokan fragmen/narasi di artifact v13) — tetapi dicatat sebagai **"reported by Muse, not independently verified"**: audit V3 ditulis sebelum/sambil verifikasi itu dan tidak mengonfirmasinya. |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Bundle suplemen v2.3.9 berdiri (4 run SU lengkap + OPS-T7 ke-3). **v2.3.10:** klaim asli dikoreksi — bundle asli hanya membuktikan 1 log lengkap (F-010), bukan 3; run gagal awal SU-T5 tetap NOT PRESERVED. |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Tidak berubah: koreksi transparan v2.3.8 berdiri. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | **v2.3.10:** klaim v2.3.9 kini dibuktikan output mentah (`evidence/v239-repro/repro-run1.txt` — frozen install exit 0, typecheck client+server exit 0, Bun 1.4.4). Tetap NOT VERIFIED: provenance SDK, Bun 1.3.10, build penuh, CI. Status keseluruhan: **NOT REPRODUCIBLE untuk clean external builder** (F-014). |
| F-010 | Medium — bundle SU asli mengulang RUN=1 di tiga file | **addressed** (sebagai koreksi bukti) | Diverifikasi sendiri dengan `sha256sum`; manifest terkoreksi (duplikat ditandai, file tidak dihapus); checker + output-nya diterbitkan; klaim v2.3.6 asli dipisahkan dari suplemen v2.3.9. Bundle asli itu sendiri **GAGAL** validasi checker — kegagalan itu dicatat, bukan disembunyikan. |
| F-011 | Medium — matriks fitur tester statis tidak cocok dengan client | **addressed** (sebagai koreksi dokumen) | Proposal terkoreksi: rilis shape 1 dinyatakan **visual preview, bukan functional tester**; catalog/Gibran/`listChecks` dipindah ke Disabled; client/API request map + spesifikasi no-backend smoke test ditambahkan (§2.5 proposal). Fixture/API terpisah TIDAK diimplementasikan. Tester tetap ON HOLD. |
| F-012 | Medium — F-006 dinyatakan addressed padahal residu masih ada | **addressed** (sebagai pemisahan status) | F-006 dipecah menjadi F-006a/b/c di atas (§1, §2.6, §4) — tidak ada lagi satu status "addressed" untuk ketiganya. |
| F-013 | Medium — owner gate staging tidak lengkap | **addressed** (sebagai penugasan peran) | §D.4.19a desain: tiap gate ST-01..ST-16 kini punya owner/peran akuntabel, next action, prasyarat, prosedur, kriteria PASS/FAIL, destinasi bukti. Yang memang belum ada (operator staging, kanal alert, egress policy, DB+runtime staging) ditulis **UNASSIGNED/BLOCKED** secara eksplisit — tidak ada gate yang masuk READY. Staging tetap belum ada. |
| F-014 | Medium — catatan reproduksibilitas basi, klaim baru tanpa output mentah | **partially addressed** | Manifest reproduksibilitas direkonsiliasi dengan run repro baru yang dijalankan sendiri di scratch copy + output mentah di-commit (`evidence/v239-repro/`). SDK provenance, mismatch Bun, dan build penuh tetap NOT VERIFIED; status NOT REPRODUCIBLE dipertahankan. |
| F-015 | Low/Medium — DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode | **addressed** (mirror) / **blocked** (live) | Mirror `site/DATA-PLAN.md` terkoreksi: perilaku aktual dideskripsikan, same-origin dinyatakan kontrol masa depan yang belum diimplementasikan. Teks koreksi live artifact disiapkan (`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md`) — penerapan di live butuh approved artifact workflow, belum dilakukan. |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif. Tidak ada public deployment yang
diotorisasi.**

## §2. Respons per temuan baru V3

### F-010 — Medium: bundle SU asli mengulang RUN=1 di tiga file — **addressed** (koreksi bukti)

**Temuan (diterima):** `evidence/v236/su-run1..3.txt` byte-identik,
masing-masing berheader RUN=1; `su-run4.txt` hanya ekor 2 baris.
Manifest v2.3.8 mencantumkan hash yang sama untuk ketiganya.

**Verifikasi sendiri (2026-11-08 ~01:49 WIB, sebelum menulis koreksi):**

```sh
sha256sum evidence/v236/su-run*.txt
# a8bbf1bbc724cfe248712717888b6e6957b7c23dae591aabe29ef24cb15ca036  su-run1.txt (904 B, 11 baris)
# a8bbf1bbc724cfe248712717888b6e6957b7c23dae591aabe29ef24cb15ca036  su-run2.txt (904 B, 11 baris)
# a8bbf1bbc724cfe248712717888b6e6957b7c23dae591aabe29ef24cb15ca036  su-run3.txt (904 B, 11 baris)
# 12f62f5ecea1de475bbc629ffbe7ebffde1139b974182e3362cd7b03eefb876a  su-run4.txt (194 B, 2 baris)
grep -h "^===" evidence/v236/su-run*.txt
# === SUITE v2.3.2 (RUN=1) ... === / === HASIL RUN=1: 9/9 PASS ===  (×3, untuk run1..3)
# === HASIL RUN=1: 9/9 PASS ===  (su-run4, tanpa header SUITE)
```

**Respons:**

- `evidence/v236/MANIFEST.md` dikoreksi (bagian "Koreksi v2.3.10
  (F-010)" di kepala file + catatan koreksi di §1 peringatan):
  su-run2/su-run3 ditandai **DUPLIKAT / NOT PRESERVED sebagai log
  independen**; su-run4 ditandai SEBAGIAN (ekor); klaim v2.3.6 asli
  ("9/9 × 4") dinyatakan TIDAK DAPAT diverifikasi dari repo — status
  yang benar: "reported PASS in VM documentation" dengan **1 log
  lengkap** yang terverifikasi. Tabel Inventaris asli TIDAK ditulis
  ulang (kolom Run/SHA tetap mencatat klaim v2.3.8 agar sejarah klaim
  tidak hilang); koreksi hidup di bagian koreksi yang mengikat.
- **File tidak dihapus** — alasannya dicatat di manifest: penghapusan
  akan menghancurkan jejak audit tentang bagaimana cacat ini terjadi.
  Asli yang hilang tidak dapat dipulihkan dan tidak direkonstruksi.
- **Temuan sejenis tambahan (dicatat v2.3.10, bukan bagian audit V3):**
  `ops-run1.txt`/`ops-run2.txt` juga byte-identik (SHA-256
  `c534b541739517366d64976e77e8172308b30662aee23d7e52f259799347d9f8`,
  1.423 byte) dan isinya tidak mengandung diskriminator nomor run apa
  pun — artefak tidak dapat membedakan dua run OPS-T1..T6 yang diklaim.
  Statusnya NOT-INDEPENDENT; klaim "6/6 PASS × 2" dari bundle asli
  berstatus NOT VERIFIED sebagai dua run independen. Dicatat di manifest
  yang dikoreksi.
- **Pemisahan klaim eksplisit:** klaim v2.3.6 asli vs 4 run suplemen
  v2.3.9 (`evidence/v236-supplement-20261108/`, VM evidence, tanggal
  2026-11-07T17:29:40Z–17:30:06Z) dipisahkan di manifest yang dikoreksi
  dan di §D.4.21 desain. Suplemen BUKAN pengganti log asli.
- **Manifest checker:** `scripts/verify-evidence-manifest.mjs` (Node,
  tanpa dependensi) memverifikasi SHA-256, ukuran byte, header run,
  nomor run ringkasan, dan keunikan hash di mana eksekusi berbeda
  diklaim. Output run-nya di-commit sebagai bukti:
  - `evidence/v236/VERIFY-20261108.txt` — **exit 1, 11 failure**
    (ketidakcocokan RUN su-run2/3, kegagalan su-run4, 2 duplikat hash).
    Kegagalan ini adalah hasil yang diharapkan untuk bundle asli yang
    terkoreksi.
  - `evidence/v236-supplement-20261108/VERIFY-20261108.txt` — **exit 0,
    0 failure** (5 entri; 1 warning: `ops-t7-supp-run3.txt` tidak punya
    diskriminator RUN di isi, tetapi hash-nya berbeda dari
    `opsrec-run1/2.txt` sehingga tidak ada klaim duplikat).
  - Tabel suplemen diberi kolom `File` (koreksi v2.3.10) agar checker
    dapat memetakan tiap baris ke file — nilai lain tidak diubah.
- Perintah verifikasi ulang ada di kepala checker dan di manifest yang
  dikoreksi.
- **Risiko tersisa:** jumlah run SU v2.3.6 yang sebenarnya dijalankan
  tetap hanya klaim dokumentasi; satu-satunya bukti 4-run SU yang dapat
  diverifikasi dari repo adalah suplemen v2.3.9 (VM evidence).
- **Aksi berikutnya:** tidak ada pemulihan log lama (tidak mungkin);
  bila reviewer meminta bukti run tambahan, jalurnya adalah run baru
  yang didokumentasikan sebagai run baru (seperti suplemen), bukan
  rekonstruksi.

### F-011 — Medium: matriks fitur tester statis tidak cocok dengan client — **addressed** (koreksi dokumen)

**Temuan (diterima):** proposal v1 §2.4/§3.5 menggambarkan frontend
statis tanpa ketujuh server action, tetapi matriksnya menandai catalog
browsing, Gibran Q&A, dan `listChecks` sebagai tersedia publik.
`site/client/src/api.ts` POST ke `./actions`; `App.tsx` memanggil
`listProjects`/`listChecks` saat page load, `setProjectState`/
`checkLink`/`deleteCheck` lewat mutasi, dan `askGibran` dari chat
Gibran; `listProjects` juga me-seed katalog saat tabel kosong
(`actions.ts` baris 1242–1255) sehingga bukan read-only murni.

**Verifikasi sendiri (2026-11-08):** call site diverifikasi ulang dari
mirror — `App.tsx` baris ~1471 (`api.askGibran`), ~1681
(`api.listProjects({})`), ~1685 (`api.listChecks({ limit: 100 })`),
~1690 (`api.setProjectState`), ~1695 (`api.checkLink`), ~1704
(`api.deleteCheck`); `api.ts` `createActionClient` POST `{action, args}`
ke `./actions`; `actions.ts` baris 1242–1255 mengonfirmasi seed saat
tabel kosong. Semua cocok dengan temuan audit.

**Respons (dokumen saja — tidak ada implementasi):**

- `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md` §2.4 dikoreksi: rilis
  shape 1 dinyatakan tegas sebagai **visual preview, bukan functional
  tester**; konten mirip katalog harus dilabeli sebagai sampel statis,
  bukan data katalog live.
- §2.5 (baru): **client/API request map** ketujuh action (call site,
  transport, efek server, bekerja tanpa backend atau tidak — jawabannya:
  tidak satu pun) + **spesifikasi no-backend smoke test** 7 butir
  (nol POST ke `./actions`; tidak ada empty/broken state yang disajikan
  sebagai data live; fitur nonaktif dilabeli; rescan secrets/narasi;
  version banner; PASS hanya bila keenam asersi lolos).
- §3.5 matriks dikoreksi: Catalog browsing, Gibran Q&A, dan `listChecks`
  dipindah dari Public=Yes ke **Disabled** pada shape statis, dengan
  catatan koreksi F-011 per baris. Guide/About tetap Public.
- §3.3 dikoreksi: baris sintetis (`TEST —`, 2–3 check sintetis) hanya
  berlaku untuk shape full-tester, bukan shape statis.
- §4.1 (F-006, T-G2) dan §11 diselaraskan dengan koreksi ini.
- **Fixture/API terpisah TIDAK diimplementasikan** — alternatif itu
  dicatat sebagai pekerjaan implementasi yang butuh otorisasi owner
  tersendiri, dengan persyaratan yang dispesifikasi (§2.5).
- **Public tester tetap ON HOLD** atas perintah Rama (2026-11-08 00:28
  WIB) — dicatat di kepala proposal. Koreksi ini bukan otorisasi deploy.
- **Risiko tersisa:** tidak ada — sebagai dokumen, proposal kini jujur
  tentang apa yang bisa dilakukan shape statis. Risiko deployment
  (T-01..T-14) tidak berubah.
- **Aksi berikutnya:** tidak ada sampai Rama mencabut hold dan
  memutuskan bentuk rilis (visual preview vs functional tester dengan
  fixture/API).

### F-012 — Medium: F-006 dinyatakan addressed padahal residu masih ada — **addressed** (pemindahan status)

**Temuan (diterima):** ringkasan F-006 v2.3.9 berbunyi `addressed`
sementara matriks itu sendiri mencatat residu kode + live artifact.

**Respons:** F-006 dipecah menjadi tiga outcome terpisah (§1, §2.6,
§4 dokumen ini) — F-006a addressed, F-006b blocked/OPEN, F-006c
partially addressed. Tidak ada lagi satu status "addressed" untuk
ketiganya, di matriks ini maupun di proposal §4.1 yang diselaraskan.

### F-013 — Medium: owner gate staging tidak lengkap — **addressed** (penugasan peran)

**Temuan (diterima):** §D.4.19 v2.3.8 mencantumkan `BELUM ADA` sebagai
owner untuk ST-02..ST-16 dan menyatakan staging belum ada, tanpa
operator alert, egress policy, dan detail PostgreSQL staging.

**Respons:** `SSRF_REMEDIATION_DESIGN.md` §D.4.19a (baru, v2.3.10)
melengkapi tiap gate ST-01..ST-16 dengan: accountable owner/peran,
next action, prasyarat, prosedur, kriteria PASS/FAIL, dan destinasi
bukti. Peran yang dipakai — pemilik proyek **Rama**, design author
**Muse**, independent reviewer **ChatGPT** — adalah peran yang nyata
ada di proyek ini. Yang memang belum ada ditulis eksplisit
**UNASSIGNED/BLOCKED**, tanpa mengarang nama:

- Staging operator: **UNASSIGNED** (ST-01..ST-16 tidak dapat
  dijadwalkan/dieksekusi sampai dinamai).
- Kanal alert operator (nama + saluran + jam jaga): **UNASSIGNED**
  (ST-10/ST-12 tidak dapat PASS).
- Egress policy staging (daftar egress diizinkan/diblokir): **UNASSIGNED**
  (ST-03/ST-16 tidak dapat PASS; U-11 tetap TERBUKA).
- Staging DB + runtime (host PostgreSQL, versi, skema `scan_leases`,
  runtime + versi): **UNASSIGNED** (ST-15 tidak dapat PASS; ST-01
  tidak dapat PASS).

**Aturan yang ditegakkan:** tidak ada gate yang boleh masuk READY tanpa
owner + prasyarat + kriteria. Semua gate ST-01..ST-16 berstatus
**BLOCKED** sampai staging tersedia dan peran di atas terisi. Tidak ada
tes staging yang dijalankan di v2.3.10 (tidak ada staging untuk
dijalankan).

### F-014 — Medium: catatan reproduksibilitas basi, klaim baru tanpa output mentah — **partially addressed**

**Temuan (diterima):** matriks v2.3.9 melaporkan frozen install +
typecheck exit 0 di scratch copy (Bun 1.4.4) tetapi
`SSRF_REPRODUCIBILITY_V238.md` tetap menyatakan NOT VERIFIED dan tidak
ada output mentah yang di-commit; SDK tarball builder-local; Bun
1.4.4 vs deklarasi 1.3.10.

**Respons — run repro baru yang dijalankan sendiri (bukan menyalin klaim
v2.3.9):** salinan scratch `/tmp/scratch-site-v239` (salinan `site/`
dari repo pada commit `b42b02a`; dihapus setelah run — bukan repo, bukan
live), 2026-11-07T18:49:04Z (= 2026-11-08 01:49:04 WIB), host
`htch-runtime`, kernel Linux 7.0.0-43-generic x86_64, Bun 1.4.4, Node
v24.22.1:

| Perintah | Exit | Hasil |
| --- | --- | --- |
| `bun install --frozen-lockfile` | 0 | 79 paket (6,43 dtk); `bun.lock` TIDAK berubah (SHA-256 `a7e1457e…`) |
| `bun run typecheck` (client + server, TS 5.6.3) | 0 | client exit 0, server exit 0 |

Output mentah di-commit: `evidence/v239-repro/repro-run1.txt` (SHA-256
`b14f98428fdb23514cc2d470c246cf49197cd2338d0e6348f4c0abc04bf67385`,
29 baris) + `evidence/v239-repro/MANIFEST.md`.
`SSRF_REPRODUCIBILITY_V238.md` direkonsiliasi (bagian "Rekonsiliasi
v2.3.10" + tabel ringkasan diperbarui).

**Yang tetap NOT VERIFIED — dicatat eksplisit:**

- SDK `@hatch/space-sdk` via `file:/opt/hatch/...` **TIDAK ada di repo**;
  tarball ADA di builder (0.14.0, 2.051.070 byte, SHA-256
  `f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`),
  provenance **NOT VERIFIED** (builder-local, mtime 1 Jan 1980).
- **Bun 1.4.4 vs deklarasi 1.3.10 — mismatch.** Hasil di atas TIDAK
  membuktikan konsistensi di bawah Bun 1.3.10.
- **Full build TIDAK dicoba / TIDAK diklaim PASS** (house rules
  `site/AGENTS.md`).
- Tidak ada test suite site; tidak ada CI.

**Status keseluruhan: NOT REPRODUCIBLE untuk clean external builder.**
Kriteria penerimaan F-014 tidak terpenuhi. Jangan klaim full-build PASS.

**Catatan koreksi kecil:** baris kedua output mentah berbunyi
`2026-11-07 18:49:04 UTC (WIB)` — label "(WIB)" itu salah (TZ shell
adalah UTC); waktu yang benar 18:49:04 UTC = 01:49:04 WIB. Label yang
salah dipertahankan apa adanya di file mentah; koreksi ini yang berlaku
(dicatat di `evidence/v239-repro/MANIFEST.md`).

### F-015 — Low/Medium: DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode — **addressed** (mirror) / **blocked** (live)

**Temuan (diterima):** `site/DATA-PLAN.md` menyatakan checker memindai
"up to 3 same-origin script files", sementara `actions.ts` baris
373–386 mengekstrak sampai 3 URL script dan mem-fetch tiap URL yang
di-resolve tanpa pembatasan same-origin.

**Verifikasi sendiri:** baris 373–386 `actions.ts` dibaca ulang
2026-11-08 — komentar "Fetch up to 3 script files referenced by the
page", ekstraksi `scriptSrcs` via regex `<script[^>]+src=...>`,
`.slice(0, 3)`, lalu `new URL(src, page.finalUrl)` + `fetchText(abs,
300_000)` tanpa pemeriksaan origin. Cocok dengan temuan audit.

**Respons:**

- **Mirror (addressed):** `site/DATA-PLAN.md` terkoreksi (v2.3.10) —
  perilaku aktual dideskripsikan (sampai 3 URL script yang di-resolve
  terhadap final URL, tanpa pembatasan same-origin) dan aturan
  same-origin dinyatakan sebagai **kontrol masa depan yang belum
  diimplementasikan** (desain F-001 §D.4.18, harness H-SSRF-13/H-SSRF-14).
- **Live artifact (blocked — follow-up terpisah):** teks koreksi eksak
  disiapkan di `docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md`
  (untuk parent/builder). Live artifact **TIDAK** diubah oleh revisi
  ini — penerapan butuh approved artifact workflow. Setelah live
  diperbarui, mirror disinkronkan ulang dan dicatat di matriks
  berikutnya.
- **Risiko tersisa:** sampai kontrol same-origin diimplementasikan
  (tahap b), risiko script-to-internal tetap bagian dari F-001 (OPEN).
- **Aksi berikutnya:** parent mengajukan koreksi teks live via artifact
  workflow; implementasi kontrol same-origin menunggu otorisasi tahap (b).

### F-006 — Medium: DATA-PLAN berisi narasi pribadi — **dipecah (F-006a/b/c)**

#### F-006a — redaksi dokumen mirror `site/DATA-PLAN.md` — **addressed**

Redaksi + rescan v2.3.8 berdiri: narasi insiden pribadi dan fragmen
wallet dihapus dari mirror; rationale threat-model generik dipertahankan.
Tidak ada perubahan di v2.3.10. Bukti: `site/DATA-PLAN.md` (redacted),
rescan v2.3.8 (nol temuan di dokumen itu).

#### F-006b — narasi insiden di string kode — **blocked (OPEN)**

Lokasi (path/baris eksak, tanpa mengutip nilai sensitif):

- `site/server/src/actions.ts` baris 51 — komentar kode di
  `KNOWN_BAD_DOMAINS` (merujuk insiden pribadi; tanpa nilai wallet,
  tanpa secret).
- `site/server/src/actions.ts` baris 1088–1089 — `GIBRAN_SITE_KNOWLEDGE`
  (konstanta didefinisikan di baris 1088; teks narasi asal platform
  berada di dalam blok string konstanta itu, mulai baris 1089).

Keduanya adalah copy/kode live yang di-mirror. Perbaikannya adalah edit
source live tahap (b) — butuh otorisasi owner terpisah — dan **TIDAK**
diedit diam-diam di mirror (edit mirror saja akan membuat mirror
menyimpang dari source live dan menggeser nomor baris yang dirujuk
audit). Proposal cleanup lengkap di §4.

#### F-006c — DATA-PLAN.md di live artifact — **partially addressed**

Redaksi live **SUDAH dilakukan dan diverifikasi 2026-11-08 ~00:59 WIB**:
DATA-PLAN.md di live artifact (cek-link-airdrop, v13) di-redact via
`artifact.edit` agar cocok dengan mirror; verifikasi mencatat nol
kecocokan fragmen wallet/narasi di artifact v13; mirror + live kini
konsisten untuk dokumen ini.

**Status kejujuran:** hasil ini dicatat sebagai **"reported by Muse,
not independently verified"** — audit V3 ditulis sebelum/sambil
verifikasi itu dan tidak mengonfirmasinya. Matriks ini TIDAK mengklaim
audit sudah mengonfirmasi redaksi live. Konfirmasi independen adalah
tugas audit berikutnya (ChatGPT membaca artifact/live atau bukti yang
diajukan).

## §3. U-46 — pemetaan dependensi yang presisi (menjawab V3 §7 + §8 butir 6)

U-46 tetap **TERBUKA** — keputusan owner tertulis belum ada. Yang
dikoreksi v2.3.10 adalah **ruang lingkup blokirnya**: U-46 bukan blanket
dependency untuk semua remediasi atau tester.

**Definisi (tidak berubah):** divergensi kebijakan fallback numeric-kill
— evaluasi melarang mutlak; desain v2.3.6 STAGE-P07 mengizinkan fallback
terkuantifikasi hanya dengan persetujuan eksplisit owner, bukan default.
Definisi lengkap + opsi (a)/(b) + prasyarat + kriteria penerimaan ada di
`SSRF_RESPONSE_MATRIX_V238.md` §3 dan `SSRF_REMEDIATION_DESIGN.md` §G.

**Peta dependensi (v2.3.10):**

| Jalur | Diblokir U-46? | Rantai dependensi / alasan teknis |
| --- | --- | --- |
| Worker-signaling fallback path — §A.5.5.2a, STAGE-P07 (fallback numeric `kill(pid)` bila pidfd tidak tersedia) | **YA — langsung** | U-46 ADALAH keputusan tentang jalur ini. Tanpa keputusan opsi (a)/(b), implementasi pensinyalan worker tidak dapat dimulai. |
| F-001 remediasi fetch guard (resolve + validasi + pinning + redirect + script same-origin) | **TIDAK** | Guard fetch tidak memakai pensinyalan worker. Harness H-SSRF-01..20 menguji guard, bukan signaling. U-46 tidak memblokir desain maupun implementasi guard. |
| F-002 (streamed cap), F-003 (total deadline), F-004 (unique constraint) | **TIDAK** | Tidak ada jalur kode yang memakai pensinyalan worker. |
| F-005 (otorisasi addProject) | **TIDAK** | Keputusan otorisasi terpisah; tidak ada ketergantungan teknis pada signaling. |
| Public tester (visual preview maupun full tester) | **TIDAK** | Tester tidak menjalankan worker-signaling. Satu-satunya kaitan adalah catatan T-07 di proposal (U-46 sebagai prasyarat BILA tester kelak memuat remediasi pensinyalan) — itu catatan bersyarat, bukan blanket dependency. Proposal §4.1 telah diselaraskan: "Blocks worker-signaling implementation, not the tester itself". |
| Pekerjaan desain tahap (a) secara umum | **TIDAK** | U-46 tidak memblokir penulisan desain, bukti, atau harness. |
| Implementasi pensinyalan worker secara keseluruhan | **YA — tidak langsung penuh** | Jalur utama pidfd dapat didesain/diuji tanpa U-46; yang diblokir adalah **cabang fallback** bila pidfd tidak tersedia. Bila opsi (b) dipilih, cabang fallback harus diganti dengan alternatif yang didesain + dibuktikan dulu. |

**Aturan pemakaian ke depan:** setiap kali sebuah dokumen mengklaim
U-46 memblokir sesuatu, klaim itu wajib menyebut rantai dependensi di
atas. Klaim blanket ("U-46 memblokir F-001..F-005" atau "U-46 memblokir
tester") tanpa rantai adalah kesalahan dan harus dikoreksi.

## §4. Proposal privacy cleanup F-006b (tanpa mengutip nilai sensitif)

**Tujuan:** menghapus narasi insiden pribadi dari string kode live
sambil menjaga mirror tetap sinkron dengan live. **Status:** PROPOSAL —
bukan otorisasi, bukan eksekusi. Butuh (1) persetujuan owner tertulis
untuk edit source live tahap (b), dan (2) workflow artifact yang
disetujui.

| # | Lokasi | Perubahan yang diusulkan (teks pengganti generik) | Workflow |
| --- | --- | --- | --- |
| 1 | `site/server/src/actions.ts` baris 51 — komentar `KNOWN_BAD_DOMAINS` | Ganti komentar yang merujuk insiden pribadi dengan komentar generik: daftar domain adalah domain yang terkonfirmasi sebagai drainer berdasarkan pola threat-model yang didokumentasikan (tanpa merujuk insiden pribadi pemilik). Nilai daftar domain TIDAK berubah. | Edit source live via artifact workflow yang disetujui (parent mengajukan edit ke builder artifact slug `cek-link-airdrop`); setelah live berubah, sinkronkan mirror `site/server/src/actions.ts` dari live dan catat commit sinkronisasi. JANGAN edit mirror saja. |
| 2 | `site/server/src/actions.ts` baris 1088–1092 (`GIBRAN_SITE_KNOWLEDGE`, blok TENTANG PLATFORM) | Ganti kalimat narasi asal yang merujuk pengalaman pribadi pemilik dengan kalimat misi generik: platform dibangun untuk membantu pengguna Indonesia menghindari link airdrop palsu dan membagikan airdrop terverifikasi (tanpa merujuk kejadian spesifik pemilik). Fakta lain di blok itu (nama pembuat, independensi dari Binance, aturan Instagram) TIDAK berubah. | Sama seperti butir 1 — satu perubahan live yang sama, satu sinkronisasi mirror. |
| 3 | Verifikasi pasca-perubahan | Cari di mirror + permukaan artifact yang diizinkan untuk frasa narasi insiden dan fragmen wallet; catat HANYA path/baris (tidak pernah nilai sensitif); hasilnya nol kecocokan. | Verifikasi oleh Muse setelah sinkronisasi; konfirmasi independen oleh audit ChatGPT berikutnya. |

**Yang TIDAK termasuk proposal ini:** redaksi `site/DATA-PLAN.md`
(sudah selesai — F-006a) dan redaksi DATA-PLAN live (sudah dilakukan —
F-006c). Tidak ada nilai sensitif yang dikutip di proposal ini; lokasi
hanya dicatat sebagai path/baris.

## §5. Jawaban atas Handoff V3 §8 (7 butir)

1. **Repair F-010 evidence accounting** — Dijawab §2 F-010: verifikasi
   `sha256sum` sendiri; manifest terkoreksi (duplikat ditandai, file
   tidak dihapus dengan alasan tercatat); klaim v2.3.6 asli dipisahkan
   dari 4 run suplemen v2.3.9; checker
   `scripts/verify-evidence-manifest.mjs` + output-nya
   (`evidence/v236/VERIFY-20261108.txt` exit 1 — 11 failure yang
   diharapkan; `evidence/v236-supplement-20261108/VERIFY-20261108.txt`
   exit 0). Temuan sejenis ops-run1/2 juga dicatat.
2. **Correct the public tester feature matrix for F-011** — Dijawab §2
   F-011: proposal §2.4/§2.5/§3.5/§4.1 terkoreksi; rilis shape 1
   dinyatakan visual preview; client/API request map + spesifikasi
   no-backend smoke test ditambahkan; fixture/API terpisah TIDAK
   diimplementasikan; tester tetap ON HOLD.
3. **Split and track F-006 residuals** — Dijawab §2.6 + §4: F-006a/b/c
   dicatat terpisah dengan status masing-masing; proposal cleanup dengan
   path/baris eksak + approved artifact workflow; tidak ada nilai
   sensitif yang dikutip.
4. **Complete ST-01..ST-16 ownership** — Dijawab §2 F-013 +
   `SSRF_REMEDIATION_DESIGN.md` §D.4.19a: tiap gate punya owner/peran,
   next action, prasyarat, prosedur, PASS/FAIL, destinasi bukti;
   operator staging / kanal alert / egress policy / DB+runtime staging
   ditulis UNASSIGNED/BLOCKED; tidak ada gate READY.
5. **Reconcile F-009 reproducibility records** — Dijawab §2 F-014:
   `SSRF_REPRODUCIBILITY_V238.md` direkonsiliasi; run repro baru
   dijalankan sendiri di scratch copy dengan lingkungan persis + output
   mentah di `evidence/v239-repro/`; SDK provenance, mismatch Bun, dan
   build penuh tetap NOT VERIFIED; status NOT REPRODUCIBLE dipertahankan.
6. **Correct F-015 and clarify dependency mapping** — Dijawab §2 F-015
   + §3: mirror `site/DATA-PLAN.md` terkoreksi (perilaku aktual +
   same-origin sebagai kontrol masa depan); teks koreksi live disiapkan
   (`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md`); U-46 dipetakan
   hanya ke worker-signaling fallback path dengan rantai dependensi.
7. **Preserve the hard security gates** — Ditegaskan §6: no Link Scanner
   activation, no public deployment, no production build, no DB/catalog
   change, no source implementation tanpa owner approval terpisah.
   F-001..F-005 tetap OPEN/BLOCKED; penutupan F-001 butuh H-SSRF-01..20
   terhadap implementasi aktual di staging terisolasi + log mentah +
   review independen — hasil VM saja tidak cukup.

## §6. Hard gates — ditegaskan kembali (v2.3.10)

Tidak satu pun dari yang berikut diizinkan oleh revisi ini:

- **No Link Scanner activation** — scanner tetap nonaktif; mitigasi G0
  (tolak semua URL arbitrer) tetap menjadi penahan.
- **No public deployment** — public tester tetap ON HOLD (Rama,
  2026-11-08 00:28 WIB); tidak ada deploy dari revisi ini.
- **No production build** — build penuh tidak dicoba di VM ini (house
  rules); tidak ada klaim build.
- **No DB/catalog change** — tidak ada migrasi, tidak ada perubahan
  katalog, tidak ada perubahan `app.db`.
- **No source implementation** — F-001..F-005 tetap OPEN/BLOCKED sampai
  otorisasi eksplisit tahap (b) dari pemilik + harness staging PASS +
  review independen.

## §7. Yang butuh keputusan Rama (pemilik proyek)

1. **Otorisasi implementasi tahap (b) untuk F-001..F-005** — TIDAK
   diberikan saat ini.
2. **Keputusan U-46** — opsi (a) terima fallback terkuantifikasi ATAU
   opsi (b) larang mutlak + ganti fallback (§3). Tanpa ini, implementasi
   pensinyalan worker (cabang fallback) tetap diblokir — tetapi F-001
   guard, F-002..F-005, dan tester TIDAK diblokir oleh U-46.
3. **Mekanisme otorisasi addProject (F-005)** — pilih mekanisme +
   fakta scoping endpoint runtime artifact.
4. **Proposal privacy cleanup F-006b (§4)** — setujui/tolak edit source
   live untuk `actions.ts:51` + `GIBRAN_SITE_KNOWLEDGE`.
5. **Koreksi teks DATA-PLAN live (F-015)** — ajukan via artifact workflow
   (`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md` sudah disiapkan).
6. **Staging (tahap 3)** — lingkungan staging belum ada; peran
   UNASSIGNED (operator, kanal alert, egress policy, DB+runtime) butuh
   penamaan oleh pemilik sebelum ST-01..ST-16 dapat dijadwalkan.
7. **Public tester** — tetap ON HOLD; pencabutan hold + pilihan bentuk
   rilis (visual preview vs functional tester) adalah keputusan pemilik.

## §8. Yang TIDAK diklaim v2.3.10

- Tidak ada implementasi kode F-001..F-005; tidak ada perubahan perilaku
  aplikasi live; tidak ada perubahan database/katalog; tidak ada
  production build; Link Scanner tidak diaktifkan; public tester tidak
  disentuh di luar koreksi dokumen.
- Tidak ada klaim "F-001..F-005 selesai" — kelimanya BLOCKED sampai tahap
  (b) + harness staging PASS.
- Bundle `evidence/v236/` asli **GAGAL** validasi checker (11 failure)
  — kegagalan itu adalah temuan yang dicatat, bukan sesuatu yang
  diperbaiki dengan mengedit file bukti.
- Redaksi live F-006c dicatat sebagai "reported by Muse, not
  independently verified" — bukan sebagai fakta yang sudah diaudit.
- Sampai commit v2.3.10 masuk `main`, tidak ada kemajuan teknis yang
  dapat diverifikasi dari repo.
