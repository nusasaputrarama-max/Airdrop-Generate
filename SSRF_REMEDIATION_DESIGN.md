# RANCANGAN PERBAIKAN SSRF — Link Scanner Live AIRDROP GENERATE (AG-001)

- **Tanggal:** 7 November 2026 — **Revisi v2.3.27 (8 November 2026)**
- **Status dokumen:** RANCANGAN v2.3.27 (design-only) — **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE** (status ini TIDAK berubah oleh revisi ini)
- **Respons atas audit kode V1 + V2 + V3 + V4 + V5 + V6 + V7 + V8 + V9 + V10 + V11:** `SSRF_RESPONSE_MATRIX_V2318.md` (F-034, F-035, U-72 diperketat, jawaban Handoff V11 §11 9 butir) — lihat §D.4.29. **Respons atas audit independen V12:** `SSRF_RESPONSE_MATRIX_V2319.md` (F-036, F-037, trust boundary F-035, proposal F-001..F-005 — lihat §D.4.30). Proposal implementation-ready F-001..F-005: `SSRF_PROPOSAL_F001_F005_V2319.md`. **Respons atas audit independen V13:** `SSRF_RESPONSE_MATRIX_V2320.md` (F-038..F-043, traceability, hard gates — lihat §D.4.31). Proposal direvisi: `SSRF_PROPOSAL_F001_F005_V2320.md`. **Respons atas audit independen V14:** `SSRF_RESPONSE_MATRIX_V2321.md` (F-044/F-045/F-046 + handoff §9 — lihat §D.4.32). Proposal direvisi: `SSRF_PROPOSAL_F001_F005_V2321.md`. **Respons atas audit independen V15:** `SSRF_RESPONSE_MATRIX_V2322.md` (F-047/F-048 + handoff §9 7 butir — lihat §D.4.33). Feasibility deployment: `DEPLOYMENT_FEASIBILITY_V2322.md`. **Respons atas audit independen V16:** `SSRF_RESPONSE_MATRIX_V2323.md` (implementasi D-01..D-04 di branch `development` + jawaban handoff V16 §6 7 butir — lihat §D.4.34, yang hanya ada di branch `development`, commit `31c3db3`; `main` tidak pernah menerima revisi v2.3.23 sebagai dokumen). **Respons atas audit independen V18:** `SSRF_RESPONSE_MATRIX_V2324.md` (F-049..F-056 diimplementasikan di branch `development` + jawaban handoff V18 §7 10 butir — lihat §D.4.35). **Respons atas audit independen V19:** `SSRF_RESPONSE_MATRIX_V2325.md` (F-057 diimplementasikan + F-058 diimplementasikan sebagian di branch `development` + jawaban handoff V19 §6 5 butir — lihat §D.4.36). **Respons atas audit independen V20:** `SSRF_RESPONSE_MATRIX_V2326.md` (F-059 diimplementasikan — mode legacy dihapus + F-060 diimplementasikan sebagian di branch `development` + jawaban handoff V20 §7 6 butir — lihat §D.4.37). **Respons atas audit independen V21:** `SSRF_RESPONSE_MATRIX_V2327.md` (F-061..F-064 diimplementasikan di branch `development` + U-117 dijawab sebagian + jawaban handoff V21 §8 7 butir — lihat §D.4.38). **Respons atas audit independen V22:** `SSRF_RESPONSE_MATRIX_V2328.md` (F-065..F-068 diimplementasikan di branch `development` + U-117 dijawab sebagian + jawaban handoff V22 §8 7 butir — lihat §D.4.39). **Respons atas audit independen V23:** `SSRF_RESPONSE_MATRIX_V2329.md` (F-069/F-070 diimplementasikan di branch `development`, U-118 diselidiki + allowlist direktori kerja, F-006b dibersihkan dari string kode aplikasi + jawaban handoff V23 §8 7 butir — lihat §D.4.40). **[KOREKSI v2.3.21: §D.4.31 dirujuk v2.3.20 tetapi badannya tidak pernah ditulis (U-88) — v2.3.21 menambahkan §D.4.32 dan tidak memalsukan §D.4.31 secara retroaktif.]** Matriks v2.3.17 (`SSRF_RESPONSE_MATRIX_V2317.md`) dipertahankan utuh sebagai catatan sejarah. Revisi ini juga menjawab butir 1 + 3 brief eksekusi `MUSE_EXECUTION_BRIEF_2026-11-08.md` (commit `8441aec`); butir 2 brief (proposal remediasi F-001..F-005 yang implementation-ready) SELESAI v2.3.19 dan DIREVISI v2.3.20 (jawaban atas audit V13 — lihat §D.4.31). **[KOREKSI v2.3.20: kalimat sebelumnya yang menyatakan butir 2 BELUM dikerjakan adalah STALE sejak v2.3.19 — diperbaiki pada revisi ini.]** **Bukti mentah v2.3.6 diterbitkan:** `evidence/v236/` (21 file `.txt` byte-identik + `MANIFEST.md`) — lihat §D.4.17. **[KOREKSI v2.3.10 (F-010): bundle itu hanya membuktikan 1 log SU lengkap — su-run2/su-run3 adalah duplikat RUN=1, su-run4 hanya ekor; lihat `evidence/v236/MANIFEST.md` bagian koreksi + checker `scripts/verify-evidence-manifest.mjs`.]** **Manifest reproduksibilitas:** `SSRF_REPRODUCIBILITY_V238.md` (direkonsiliasi v2.3.10 — run repro baru + output mentah `evidence/v239-repro/`). **Revisi v2.3.9:** bundle bukti suplemen `evidence/v236-supplement-20261108/` (4 run SU lengkap 9/9 + run ketiga OPS-T7 PASS + `MANIFEST.md`) + verifikasi F-005 dari kode + verifikasi F-009 (SDK tarball, frozen install, typecheck di salinan scratch) — lihat §D.4.20 dan changelog v2.3.9. **Revisi v2.3.10:** jawaban atas audit V3 (F-010..F-015) — lihat §D.4.21 dan changelog v2.3.10. **Revisi v2.3.11:** jawaban atas audit V4 (F-016..F-020) — lihat §D.4.22 dan changelog v2.3.11. **Revisi v2.3.12:** jawaban atas audit V5 (F-021, F-022) — lihat §D.4.23 dan changelog v2.3.12. **Revisi v2.3.13:** jawaban atas audit V6 (F-023, F-024, F-025) — lihat §D.4.24 dan changelog v2.3.13. **Revisi v2.3.14:** jawaban atas audit V7 (F-026, F-027, F-028) — lihat §D.4.25 dan changelog v2.3.14. **Revisi v2.3.15:** jawaban atas audit V8 (F-029, F-030) — lihat §D.4.26 dan changelog v2.3.15.
- **Pemisahan tiga tahap (keputusan pemilik, mengikat v2.3.8):** (a) desain remediasi — boleh dilanjutkan dan ditinjau (inilah v2.3.8 dan v2.3.9); (b) implementasi pada source code — butuh persetujuan eksplisit terpisah dari pemilik proyek, **TIDAK diberikan saat ini**; (c) penerapan ke situs live — butuh persetujuan dan prosedur deployment tersendiri. **Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live berubah.** v2.3.8 dan v2.3.9 TIDAK mengimplementasikan apa pun; temuan kode F-001..F-005 tetap OPEN/blocked sampai tahap (b) + bukti harness staging.
- **Rekonsiliasi bukti v2.3.7:** `SSRF_RECONCILIATION_V237.md` (pemetaan evaluasi ChatGPT ST-01..ST-12, SU-T1..SU-T9, U-38-A..D/U-33-A..F ke bukti v2.3.6 yang sudah ada — lihat §D.4.16; penomoran kanonik ST-01..ST-16; daftar kekurangan §6 dokumen tersebut) — TIDAK ADA pengujian baru yang dijalankan untuk v2.3.7.
- **Bukti uji v2.3.6:** `SSRF_SPIKE_V236.md` (pidfd PIDFD-T1..T12 + window
  PIDFD-T9 + OPS-T1..T7 + re-run SU-T1..SU-T9 9/9 × 4 — lihat §D.4.14;
  matriks prasyarat staging STAGE-P01..P12 — lihat §D.4.15) — bukti dari
  VM ini, BUKAN dari runtime artifact produksi (lihat batas bukti di file
  tersebut). Harness disalin ke `spike-harness-v236/` agar dapat
  dijalankan ulang. **[KOREKSI v2.3.10 (F-010): klaim "9/9 × 4" adalah hitungan
  run yang dijalankan; bukti mentah yang tersimpan hanya 1 log lengkap
  (`su-run1`) + 2 duplikat byte-identik (`su-run2/3`, RUN=1) + 1 ekor 2 baris
  (`su-run4`) — koreksi v2.3.8 yang menyebut "3 log lengkap" sudah kedaluwarsa;
  lihat `evidence/v236/MANIFEST.md` dan §D.4.21.]**
- **Bukti uji v2.3.4:** `SSRF_SPIKE_V234.md` (race TERBUKTI pada kode v2.3.3 — ADV-T1: 2 pemilik, 3/3 × 2; perbaikan flock TERUJI — ADV-T2/T2sim/T5/T6: 4/4 × 2; semantik flock kernel TERUJI — FLK-T1..T8: 9/9 × 2 tmpfs, 9/9 × 2 overlay) — bukti dari VM ini, BUKAN dari runtime artifact produksi (lihat batas bukti di file tersebut). Harness disalin ke `spike-harness-v234/` agar dapat dijalankan ulang.
- **Bukti uji v2.3.5:** `SSRF_SPIKE_V235.md` (suite adversarial AUTH 18/18 PASS,
  dijalankan ulang **2×**: AUTH-T1..T11 + AUTH-C1 — otoritas flock, mixed-version,
  zombie liveness; AUTH-T9c NOT RUN — tidak ada NFS di VM ini; regresi v2.3.4
  diulang: ADV fixed-code 4/4 × 2, FLK-T1..T8 9/9 tmpfs + 9/9 overlay,
  bun-flock-sanity OK; SU-T1..SU-T9 v2.3.2 NOT RUN — dependensi `/tmp` hilang)
  — bukti dari VM ini, BUKAN dari runtime artifact produksi (lihat batas bukti
  di file tersebut). Harness disalin ke `spike-harness-v235/` agar dapat
  dijalankan ulang.
- **Bukti uji v2.3.2:** `SSRF_SPIKE_V232.md` (9/9 PASS, dijalankan ulang **3×**:
  SU-T1..SU-T9 — aturan startup NOT_READY, validasi identitas PID,
  pidfile atomik, startup lock) — bukti dari VM ini,
  BUKAN dari runtime artifact produksi (lihat batas bukti di file tersebut).
  Harness disalin ke `spike-harness-v232/` agar dapat dijalankan ulang.
  **Koreksi v2.3.3:** klaim awal "dijalankan ulang 2×" di revisi v2.3.2
  sudah benar pada saat itu, tetapi pesan laporan pengiriman v2.3.2
  menyebut "3×" tanpa output RUN=3 — lihat §0 `SSRF_SPIKE_V233.md`
  untuk rekonsiliasi lengkap: RUN=3 yang sesungguhnya dijalankan
  selama revisi v2.3.3 (output verbatim di file bukti tersebut), sehingga
  klaim 3× kini didukung tiga output terdokumentasi (RUN=1, RUN=2, RUN=3).
- **Bukti uji v2.3.1:** `SSRF_SPIKE_V231.md` (61/61 PASS, dijalankan ulang 2×:
  TERM-T1..T4 23 pemeriksaan + PARENT-T1a/T1b/T2 15 pemeriksaan +
  pengulangan SEM-R1..R6 + ORPH-T0..T5 23 pemeriksaan) — bukti dari VM ini,
  BUKAN dari runtime artifact produksi (lihat batas bukti di file tersebut).
  Catatan: harness asli v2.2 DAN v2.3 hilang karena `/tmp` dibersihkan antar
  sesi; semua pengujian v2.3.1 adalah implementasi ulang dari spesifikasi
  yang didokumentasikan di `SSRF_SPIKE_V22.md` §1 dan `SSRF_SPIKE_V23.md`
  §1–§8.
- **Bukti uji v2.3:** `SSRF_SPIKE_V23.md` (13/13 PASS, dijalankan ulang 2×:
  pengulangan SEM-01..SEM-06 6/6 + orphaned/breaker/worker 7/7) — bukti dari
  VM ini, BUKAN dari runtime artifact produksi (lihat batas bukti di file
  tersebut). Catatan: harness asli v2.2 hilang karena `/tmp` dibersihkan
  antar sesi; SEM-R1..SEM-R6 adalah implementasi ulang dari spesifikasi
  yang didokumentasikan di `SSRF_SPIKE_V22.md` §1.
- **Bukti uji v2.2:** `SSRF_SPIKE_V22.md` (11/11 PASS: semaphore DNS 6/6, atomicity lease 5/5) — bukti dari VM ini, BUKAN dari runtime artifact produksi (lihat batas bukti di file tersebut).
- **Bukti uji v2.1:** `SSRF_SPIKE_V21.md` (48/48 PASS: NAT64 10/10, dekompresi
  jalur Node Agent 11/11, DNS 7/7, RDAP 20/20) — bukti dari VM ini, BUKAN dari
  runtime artifact produksi (lihat batas bukti di file tersebut).
- **Keputusan pemilik yang sudah disetujui (7 Nov 2026, menjadi asumsi tetap):**
  1. Temporary mitigation: opsi (a) — nonaktifkan scanning URL arbitrer sementara.
  2. Script fetching: nonaktifkan sementara via feature flag.
  3. IP pinning: menunggu hasil spike runtime — **spike selesai, lihat
     `SSRF_SPIKE_RUNTIME.md`** (Pendekatan 1 via Node `https` Agent `lookup`
     TERBUKTI di Bun 1.4.4; Pendekatan 2 via `Bun.fetch` + `tls.serverName` +
     header `Host` TERBUKTI sebagai fallback).
  4. Rate limit awal: **10 pemeriksaan/menit dan 100/jam per IP**.
  5. Port tujuan: **hanya 80 dan 443**.
  6. CGNAT (`100.64.0.0/10`): **blokir secara default**.
  7. Timeout global: **target awal 20 detik**.
  8. Implementasi bertahap dengan pengujian setiap build; **production cutover
     HANYA setelah seluruh pengujian wajib lolos** — scanner tetap NONAKTIF di
     produksi selama perbaikan, dan TIDAK dibuka kembali hanya karena P0 selesai
     bila timeout global dan rate limit belum siap.
- **Tujuan:** Menutup temuan audit SSRF (`SSRF_AUDIT.md`, status keseluruhan **VULNERABLE**)
  tanpa merusak perilaku scanner yang sudah terbukti benar untuk URL publik.
- **Evaluasi:** Dokumen ini disusun untuk dievaluasi ChatGPT sebelum pemilik memberi
  persetujuan implementasi. **Jangan implementasikan apa pun berdasarkan dokumen ini
  sebelum ada persetujuan eksplisit pemilik.**
- **Ruang lingkup:** Link Scanner live di artifact slug `cek-link-airdrop`
  (aksi server `checkLink`). Tidak ada perubahan pada katalog proyek, histori cek,
  sistem scoring, atau asisten Gibran kecuali yang dinyatakan eksplisit di §B dan §E.

## Perubahan di revisi v2.3.27 (8 November 2026)

| # | Lokasi perubahan | Isi perubahan |
| --- | --- | --- |
| 1 | §D.4.38 (baru) + matriks §2 butir 6 | **Sinkronisasi development dengan main:** main HEAD saat re-read `2bc34e1` (audit V21); merge commit `9776a18` (tanpa konflik); setelah merge `git log origin/main --not HEAD` = 0. Tidak ada merge balik development→main. |
| 2 | §D.4.38 (baru) + matriks §2 butir 1–4 | **F-061..F-064 — tool migrasi kunci principal DIPERKERAS:** `TOOL_VERSION` v2327-1 — `validateMapping()` menolak seluruh mapping bila `currentKey` beririsan dengan `legacyKey` (chain/cycle, exit 2, tanpa write/backup; keputusan REJECT vs two-phase didokumentasikan, DL-27-01); mode baru `archive-special` mengekspor sentinel `'<LEGACY>'` + checks NULL-owner ke JSON terpisah, read-only, DB tidak berubah; `rollback()` pre-validasi tiap baris backup pada currentKey yang diharapkan + periksa `changes` tiap UPDATE (tepat 1) + verifikasi postcondition sebelum COMMIT (mismatch → ROLLBACK + exit nonzero); `guardDbPath()` menolak symlink (`lstatSync`/`realpathSync`) dan memisahkan mode read-only vs write. H-MIGR baru 09..18 **10/10 PASS**; H-MIGR lama 01..08 diulang **8/8 PASS** (total H-MIGR 18/18). |
| 3 | §D.4.38 (baru) + matriks §2 butir 5 | **U-117 — rekonsiliasi status project link (PARTIALLY ADDRESSED):** `share.shared=true` terverifikasi ulang via `artifact.status` (~21:20 WIB 2026-11-08) + URL publik terverifikasi merespons via `browser.open` (~21:18 WIB, judul "Airdrop Generate"); baris 20 readiness v2.3.26 (`shared=false`) dinyatakan carry-forward kedaluwarsa dan diperbaiki; HTTP status TIDAK diklaim; artifact-to-source tetap NOT VERIFIED (tidak ada catatan build/publish di repo; judul `landing/index.html` berbeda — indikasi, bukan bukti final). |
| 4 | §D.4.38 (baru) + matriks §2 butir 7 + §8 | **Rekonsiliasi bukti + blocker jujur:** total regresi **394/394 PASS** (384 v2.3.26 dipertahankan + 10 baru); 2/2 sidecar `.sha256` baru cocok; log re-run H-MIGR lama byte-identik dengan v2.3.26 dijelaskan (DL-27-02); harness lain TIDAK diulang karena `actions.ts` tidak berubah (DL-27-03); `.tsbuildinfo` tidak ter-commit (DL-27-05). U-113 dicari ulang — tetap BLOCKED; D-06 npm 404 dikonfirmasi ulang — tetap BLOCKED; T-01 tanpa jawaban baru — tetap BLOCKED; F-006b masih ada; 6 staging roles UNASSIGNED. |
| 5 | §D.4.38 + matriks §5 + §10 | **Risiko U-117** (bukti project link) dicatat sebagai partially addressed dengan sisa artifact-to-source; U-116 tetap OPEN. Gate **G-M diperbarui** (V22 + F-061..F-064 addressed dev+VM + U-114 mapping BLOCKED + U-117 sisa + staging G-E). F-061..F-064 addressed (dev + VM); staging tetap BLOCKED; F-019/F-028 NOT VERIFIED; F-030 CONFIRMED BLOCKER. |

## Perubahan di revisi v2.3.26 (8 November 2026)

| # | Lokasi perubahan | Isi perubahan |
| --- | --- | --- |
| 1 | §D.4.37 (baru) + matriks §2 butir 4 | **Sinkronisasi development dengan main:** main HEAD saat re-read `77317c3` (audit V20; mencakup `cb2ab9b` dan `f1bfea3` yang disebut handoff V20 §7 butir 4); merge commit `f93aa72` (dengan konflik 1 dokumen — matriks v2.3.25 memakai versi main); setelah merge `git log origin/main --not HEAD` = 0. Tidak ada merge balik development→main. |
| 2 | §D.4.37 (baru) + matriks §2 butir 1 | **F-059 — mode legacy DIHAPUS:** `LOCAL_SINGLE_OWNER_MODE` + setter/getter + konstanta `LEGACY_PRINCIPAL` dihapus dari `site/server/src/actions.ts`; `savedPrincipal()` selalu null bila tidak ada principal (missing/unknown viewer, `userId` kosong). H-AN2 6/6 PASS menggantikan H-AN 5/5 (DISUPERSEDE). U-115 DITUTUP (mode dihapus, attestation tak lagi diperlukan). |
| 3 | §D.4.37 (baru) + matriks §2 butir 2 | **F-060 — tool migrasi kunci principal (PARTIALLY ADDRESSED):** tool offline `evidence/v2326/principal-key-migration.ts` (inventory/archive/rename transaksional + backup/rollback + refusal fail-closed) untuk `checks.owner_user_id`, `saved_projects.principal_id`, `projects.provenance_submitted_by`. H-MIGR 8/8 PASS. Rename butuh mapping eksplisit terverifikasi — mapping TIDAK ADA, jadi U-114 tetap OPEN (menyempit). |
| 4 | §D.4.37 (baru) + matriks §2 butir 3 + §8 | **Rekonsiliasi bukti:** total regresi **384/384 PASS** (370 baseline + 14 baru: H-AN2 6 + H-MIGR 8); 19/19 sidecar `.sha256` cocok; 9 log re-run byte-identik dengan v2.3.25 dijelaskan (DL-26-02); H-AN disupersede dijelaskan (DL-26-03); bug rollback diperbaiki (DL-26-04); `.tsbuildinfo` ter-commit di merge — dibersihkan (DL-26-05). F-059/F-060 masuk backlog (D-14). |
| 5 | §D.4.37 + matriks §2 butir 5–6 + §8 | **U-113/D-06/T-01/landing jujur:** pencarian pernyataan provider diulang — tetap nihil (U-113 BLOCKED); npm 404 dikonfirmasi ulang (D-06 BLOCKED); stub tidak disentuh; clean-clone TIDAK diulang. Kemampuan tooling publish statis + URL landing yang sudah ada terverifikasi read-only; publish fresh TIDAK dilakukan; T-01 tetap BLOCKED. |
| 6 | §D.4.37 + matriks §5 + §10 | **Risiko baru U-116** (CI/branch governance: 0 workflow runs, branch tidak protected). Gate **G-M diperbarui** (V21 + K-1/K-4/K-10 + T-01 + M-1/M-2 + U-108/U-109/U-110/U-113/U-114/U-116 + staging G-E; U-115 keluar dari gate). F-059 addressed (dev + VM); F-060 partially addressed (dev + VM, mapping BLOCKED); staging tetap BLOCKED; F-019/F-028 NOT VERIFIED; F-030 CONFIRMED BLOCKER. |

## Perubahan di revisi v2.3.25 (8 November 2026)

| # | Lokasi perubahan | Isi perubahan |
| --- | --- | --- |
| 1 | §D.4.36 (baru) + matriks §2 butir 3 | **Sinkronisasi development dengan main:** main HEAD saat re-read `cfb55a6` (audit V19; mencakup `6167749` yang disebut handoff V19 §6 butir 3); merge commit `37a23a2` (dengan konflik 2 dokumen — matriks v2.3.24 memakai versi main, desain mempertahankan §D.4.34 + §D.4.35); setelah merge `git log origin/main --not HEAD` = 0. Tidak ada merge balik development→main. |
| 2 | §D.4.36 (baru) + matriks §2 butir 1 | **F-057 — missing viewer fail-closed:** `savedPrincipal()` tidak lagi memakai `'<LEGACY>'` untuk context tanpa viewer (read default, write no-op); `'<LEGACY>'` hanya di balik mode local single-owner eksplisit (`LOCAL_SINGLE_OWNER_MODE`, default OFF — pola module flag seperti `CHECKLINK_ENABLED`). H-AN 5/5 PASS. Migrasi legacy tetap lulus (H-MIG 232/232, H-LEG 8/8). |
| 3 | §D.4.36 (baru) + matriks §2 butir 2 | **F-058 — principal local memakai `userId` (PARTIALLY ADDRESSED):** `resolvePrincipal()` local → `local:{userId}`; delegate → `local:delegate:{delegate}:{userId}`; `isOwner` adalah otorisasi, bukan identitas (H-PL-05). H-PL 7/7 PASS. Bukti kontrak provider TIDAK ADA — hanya deklarasi tipe SDK 0.14.0 (tarball SHA `f2cb7b25…ad49e`); populasi runtime NOT VERIFIED (U-113). Baris lama berkunci `local:{ownerUserId}` menjadi orphan (U-114). |
| 4 | §D.4.36 (baru) + matriks §2 butir 4 | **Rekonsiliasi bukti:** total regresi **375/375 PASS** (363 baseline terkoreksi + 12 baru); 18/18 sidecar `.sha256` cocok; koreksi 363/363 dipertahankan (DL-24-01); 8 log re-run byte-identik dengan v2.3.24 dijelaskan (DL-25-02). F-057/F-058 masuk backlog (D-13). |
| 5 | §D.4.36 + matriks §2 butir 5 + §8 | **D-06/T-01/landing jujur:** D-06 stub SDK tidak disentuh; clean-clone TIDAK diulang (tidak ada perubahan material). T-01 tetap BLOCKED. Landing page tidak disentuh; URL publik tidak diklaim. |
| 6 | §D.4.36 + matriks §5 + §10 | **Risiko baru U-113..U-115** (kontrak provider F-058, orphan kunci principal lama, bukti mode single-owner eksplisit). Gate **G-M diperbarui** (V20 + K-1/K-4/K-10 + T-01 + M-1/M-2 + U-108/U-109/U-110/U-113/U-114/U-115 + staging G-E). F-057 addressed (dev + VM); F-058 partially addressed (dev + VM, kontrak BLOCKED); staging tetap BLOCKED; F-019/F-028 NOT VERIFIED; F-030 CONFIRMED BLOCKER. |

## Perubahan di revisi v2.3.24 (8 November 2026)

| # | Lokasi perubahan | Isi perubahan |
| --- | --- | --- |
| 1 | §D.4.35 (baru) + matriks §2 butir 1 | **Sinkronisasi development dengan main:** main HEAD saat re-read `1699706` (V18 `75fc5ee` + klarifikasi `1699706`); merge commit `32731defe190694fc49efad6ca259c5a5e03b905` (tanpa konflik); setelah merge `git log origin/main --not HEAD` = 0. Tidak ada merge balik development→main. |
| 2 | §D.4.35 (baru) + matriks §2 butir 2 | **F-049 — korpus IANA lengkap (fetch live):** kedua registry IANA diambil langsung 2026-11-08 ~16:25 WIB (Last Updated 2025-10-09, sama dengan klaim audit V18); korpus per-entri di `evidence/v2324/iana-registry-corpus-v2324.md` (branch `development`). Tambah DENY `192.88.99.0/24` (termasuk `192.88.99.2/32`), `5f00::/16`, default-deny `2001::/23` dengan exception GR=True; exception GR=True di dalam prefix GR=False tetap ALLOW (`192.0.0.9/32`, `192.0.0.10/32`). **Keputusan 2001:20::/28 = ALLOW** mengikuti IANA (ORCHIDv2 GR=True, identifier kriptografis bukan host routable; kebijakan lebih ketat tidak diadopsi); H-SSRF-04 diperbaiki. H-IP 8/8 PASS. Tindak lanjut: registry-diff test berkala (U-108). |
| 3 | §D.4.35 (baru) + matriks §2 butir 3 | **F-050 — otorisasi addProject di handler:** gate owner-only (`isAddProjectAuthorized`) DI DALAM handler sebelum akses DB; tidak mengandalkan asumsi dispatch-layer SDK. H-AUTH 6/6 PASS (anonim/non-owner/viewer share → 0 baris). Kejujuran batas: tidak ada service principal terjadwal di codebase/runtime — gate = owner-only; definisi service identity terjadwal butuh keputusan + staging proof (U-109). |
| 4 | §D.4.35 (baru) + matriks §2 butir 4 | **F-051 — semantik principal didesain ulang:** viewer share Cloudflare non-owner → principal null: tanpa history, saved state nonaktif (`setProjectState` no-op), Gibran tanpa riwayat; owner Cloudflare → `cloudflare-owner:{shareId}`. Tidak ada label user-scoped pada baris share-scoped. H-PRIN 6/6 PASS. Trade-off diakui: viewer share kehilangan saved state by design. `ctx.viewer` runtime NOT VERIFIED (STAGE-P02, baris readiness 21 baru). |
| 5 | §D.4.35 (baru) + matriks §2 butir 5 | **F-052 + F-053 — deadline batas keras + timeout tidak tersimpan:** DNS di-race melawan per-query 5 dtk DAN deadline total; `deadline.aborted` dicek sebelum cache read dan sebelum tiap script; lease TTL 25 dtk dipertahankan dengan alasan tertulis (deadline batas keras + unwind <1 dtk di VM). `ScanTimeoutError` di 3 checkpoint analyze; `runCheck` → error timeout eksplisit retryable, tanpa insert baris. H-DL 6/6 + H-TO-01 PASS (elapsed 20015 ms, 0 baris, lease 0). Timing runtime NOT VERIFIED (baris readiness 23 baru). |
| 6 | §D.4.35 (baru) + matriks §2 butir 6 | **F-054 — akuntansi agregat pada cache hit:** opsi simpan-panjang + reserve: `FetchResult.decodedBytes` disimpan per cache entry dan di-reserve via `tryReserve` sebelum hit dilayani (900 KB lolos, +300 KB ditolak). H-CB 4/4 PASS. RDAP cache tetap berbudget sendiri by design. |
| 7 | §D.4.35 (baru) + matriks §2 butir 7 | **F-055 — CHECK Solana base58 penuh:** migrasi 0008 (`site/drizzle/0008_solana_base58_check.sql`, journal idx 7) — CHECK cabang Solana kini allowlist penuh (`NOT GLOB '*[^1-9A-HJ-NP-Za-km-z]*'`), setara validator aplikasi; `schema.ts` + `catalog.ts` diselaraskan; DDL drizzle-kit diregenerasi (diff hanya cabang CHECK Solana); down migration diuji. H-B58 5/5 PASS; H-MIG re-run 232/232 (8 migrasi). Pre-check operator V1 wajib sebelum migrate di DB berisi data (U-110, baris readiness 22 baru). |
| 8 | §D.4.35 (baru) + matriks §2 butir 8 | **F-056 — same-origin tiap hop redirect:** `opts.allowedOrigin` ditegakkan di setiap hop redirect fetch script sebelum koneksi hop berikutnya; `analyze` meneruskan `pageOrigin`. H-SO 5/5 PASS (redirect relatif same-origin tetap diikuti). |
| 9 | §D.4.35 + matriks §2 butir 9–10 + §8 | **D-06/T-01/landing jujur + koreksi total:** D-06 stub SDK tidak disentuh; clean-clone TIDAK diulang (tidak ada perubahan material — protokol butir 6). T-01 tetap BLOCKED. Landing page tidak disentuh; URL publik tidak diklaim. **KOREKSI TOTAL (DL-24-01):** regresi penuh v2.3.24 adalah **363/363 PASS** (bukan 353/353 seperti tertulis di matriks development — H-RD 10/10 tidak dijumlahkan); koordinator memverifikasi independen ke-16 SHA-256 log (16/16 cocok), ekor tiap log, dan typecheck exit 0 (diulang). Bukti mentah TIDAK diduplikasi ke `main` (DL-24-02 — rujuk branch `development` + SHA commit). |
| 10 | §D.4.35 + matriks §5 + §10 | **Risiko baru U-108..U-112** (registry-diff berkala, service identity terjadwal, pre-check migrasi 0008, total regresi salah hitung — DIKOREKSI, re-run 0006 mengembalikan CHECK lemah). Gate **G-L diperbarui** (V19 + K-1/K-4/K-10 + T-01 + M-1/M-2 + U-108/U-109/U-110 + staging G-E). F-049..F-056 addressed (dev + VM); staging tetap BLOCKED; F-019/F-028 NOT VERIFIED; F-030 CONFIRMED BLOCKER. |
## Perubahan di revisi v2.3.23 (8 November 2026)

Revisi ini adalah **implementasi development-branch pertama** (bukan
desain-only): atas otorisasi V16 §1 + penilaian U-99 (DITUTUP sebagai
blocker proses) + direktif owner `c53fd73`, D-01..D-04 dikerjakan di
branch `dev` (base `main` @ `7e82818`, merge `67cc7c7`) dan diuji di
VM atas FILE AKTUAL. Status keseluruhan tetap: **DESIGN REVIEW ONLY
— IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY
BETA**. `main`, produksi, live artifact, dan `app.db` live TIDAK
diubah; Link Scanner TIDAK diaktifkan.

| # | Lokasi perubahan | Isi perubahan |
| --- | --- | --- |
| 1 | §D.4.34 (baru) + matriks §2 butir 1 + `site/drizzle/0006…` + `site/server/src/schema.ts` + `site/server/src/actions.ts` + `site/server/src/catalog.ts` | **D-01 — F-044/F-045/F-046 DIIMPLEMENTASIKAN (bukan lagi proposal):** migrasi 0006 aktual (rebuild; journal idx 5) + down migration operator; schema Drizzle mirror (STORED, CHECK bernama, provenance, composite PK, `checks_owner_idx`); owner scoping semua actions; canonical comparison per-chain; provenance server-side. H-MIG-00..09 + H-CAT-11..13 + H-TEN-11..15 + DK-01..07 = **232 PASS / 0 FAIL** (migrator CLI nyata + sqlite3 CLI 3.45.1 + Bun 3.53.4). Lantai SQLite >= 3.31.0 (up) / >= 3.35.0 (down); runtime produksi NOT VERIFIED (U-90). K-10: default L-A; keputusan bisnis masih dibutuhkan. |
| 2 | §D.4.34 (baru) + matriks §2 butir 2 + `site/server/src/ssrf-guard.ts` (BARU) + wiring `actions.ts` | **F-001 DIIMPLEMENTASIKAN di jalur fetch nyata:** canonicalizeHost + port policy, resolveAll (ALL A/AAAA, 5 dtk, late-result dibuang), validateDestination, nodeConnector pinned lookup (Pendekatan 1, Model B), fetchGuardedOnce, validateUrlForFetch (K-1: guard sebelum cache), redirect-hop revalidation, RDAP via guard, script serial + same-origin. H-SSRF **32/32 PASS**. Tiga temuan harness diperbaiki: multicast 224/4 (U-108), trailing dot (RFC 1034 §3.1), timeout resolver injeksi (H-SSRF-18). Staging egress NOT VERIFIED (STAGE-P01/P03). |
| 3 | §D.4.34 (baru) + matriks §2 butir 3 + `site/drizzle/0007…` + `site/server/src/scan-limits.ts` (BARU) | **F-002/F-003/F-022/F-025/F-026/F-027 DIIMPLEMENTASIKAN:** `readCappedStream` (L0/L1) + `ScanBudget` aggregate 1.000.000 + deadline total 20 dtk (koreksi dari 30 dtk — bukan keputusan pemilik) + lease global max 5 (atomic conditional INSERT, TTL 25 dtk) + rate per principal 10/menit + 100/jam + wiring `runCheck` fail-closed. H-RES **15/15 PASS** + H-LEASE **8/8 PASS**. Dua temuan diperbaiki: kode error aggregate-cap (DL-23-06) + `rowsAffected` RETURNING di libsql (DL-23-05; U-107: semantik `SpaceDb.run` produksi NOT VERIFIED). Memori bounded TIDAK diklaim dari model VM. |
| 4 | §D.4.34 (baru) + matriks §2 butir 4 | **F-004/F-005/F-018 + auth boundary DIIMPLEMENTASIKAN di `dev`:** uniqueness via unique index (SpaceDb tanpa `transaction` — atomicity dari statement/index); principal dari `ctx.viewer` (ADA di tipe SDK 0.14.0 — populasi runtime NOT VERIFIED, STAGE-P02); owner scoping semua actions; H-TEN PASS via handler Actions asli + mock ctx + libsql nyata. Gate §5 (export legacy) tetap BELUM diimplementasikan. |
| 5 | §D.4.34 (baru) + matriks §2 butir 5 + `evidence/v2323/landing-page-status.txt` | **Landing page statis DIBANGUN parent agent** (artifact baru terpisah, slug `airdrop-generate`; live `cek-link-airdrop` TIDAK disentuh; verifikasi internal builder lulus). **TAPI:** `share.shared=false`, BELUM ADA URL publik — acceptance V16 butir 5 TIDAK TERPENUHI → **partially addressed**; next action share + health check eksternal. |
| 6 | §D.4.34 (baru) + matriks §2 butir 6 + `evidence/v2323/t-01-verification.txt` | **T-01 dicoba via tooling yang tersedia: tetap BLOCKED.** `hatch` hanya daemon (tanpa subcommand); `builtin-artifacts` hanya 2 built-in; `share-space` butuh space sudah ter-publish; probe `fetch-space-url` bekerja (kedua space belum shared). Butuh pernyataan provider / run artifact-tooling. |
| 7 | §D.4.34 (baru) + matriks §2 butir 7 + `evidence/v2323/run-clean-clone-build.sh` (BARU) | **U-103 ADDRESSED:** driver portabel (argumen repo/ref, default remote, mktemp+trap, output dari lokasi script, status setup exit 2). Check-setup PASS (clone remote + unshare, exit 0) TANPA re-run build (dilarang untuk kosmetik). F-047 tetap BLOCKED. |
| 8 | §D.4.34 + matriks §5 + §10 | **Risiko baru U-103..U-108** (driver portabel; legacy saved_projects; typing Drizzle; log run-pertama tidak dipertahankan — U-106 process gap; `SpaceDb.run` rowsAffected; multicast 224/4). U-98/U-99 CLOSED (V16). Gate **G-K diperbarui** (otorisasi `dev` granted; K-10 + T-01 + M-1/M-2 tetap OPEN). **Gate berikutnya: STAGING VALIDATION** (prasyarat: 6 peran ditunjuk + bukti provider + K-10 + environment G-E). Pemicu revisi v2.3.24: audit V17, ATAU bukti staging, ATAU keputusan owner K-10/T-01, ATAU jawaban provider M-1/M-2. |

## Perubahan di revisi v2.3.22 (8 November 2026)

| # | Lokasi perubahan | Isi perubahan |
| --- | --- | --- |
| 1 | §D.4.33 (baru) + matriks §2 butir 1 | **F-044/F-045/F-046 — TIDAK diuji ulang, diverifikasi silang:** tidak ada perubahan material sejak v2.3.21 (implementasi, lingkungan, harness, risiko sama), sehingga pengulangan tes dilarang protokol handoff butir 6. Verifikasi: SHA-256 kelima file kanonik v2.3.21 COCOK dengan klaim matriks v2.3.21; tail log 109 PASS 0 FAIL + H-MIG-09 ALL PASS. Status: "addressed in v2.3.21, carried forward and verified by cross-reference". F-004 tetap OPEN/BLOCKED; K-10 tersisa; scope `ctx.db` NOT VERIFIED. |
| 2 | §D.4.33 (baru) + matriks §2 butir 2 + `DEPLOYMENT_FEASIBILITY_V2322.md` (BARU) | **Feasibility deployment free-tier:** inspeksi tree lengkap (7 actions, `ctx.db` 7×, `ctx.inference` 1×, env var NOL, tanpa HTTP entry point/Dockerfile/start script, tanpa test/CI, auth boundary NOT VERIFIED). Matriks Vercel Hobby / Supabase Free / Cloudflare Workers+D1 + Oracle Always Free VM + second Hatch space dari dokumen resmi provider yang dicek langsung 2026-11-08 ~13:43–13:44 WIB (Vercel Hobby non-komersial + tunggu 30 hari bila lewat limit; Supabase pause 7 hari + DB 500 MB read-only; Workers 100k req/hari + 10 ms CPU + 50 subrequest; D1 5M read/100k write per hari). Jalur aman terkecil: **BLOCKED**; artefak hilang persis M-1..M-10. |
| 3 | §D.4.33 (baru) + matriks §2 butir 3 + `evidence/v2322/` (BARU) | **F-047 — clean-clone build DIBUKTIKAN gagal (bukan diklaim):** clone bersih @ `c53fd73` → `unshare -rm` + bind dir kosong ke `/opt/hatch` → install FAIL exit 1 (`ENOENT extracting tarball from @hatch/space-sdk`) + build FAIL exit 1 (`Could not resolve: "@hatch/space-sdk"`). Kontrol dengan `/opt/hatch`: install OK, `build:server` OK (191 modul, 221 KB), `build:client` FAIL exit 1 — SDK menolak build tangan (temuan BARU **U-97**: lapisan kedua blocker portabilitas). SDK: `@hatch/space-sdk` 0.14.0, tarball SHA-256 `f2cb7b25…ad49e`; `npm view` → 404 (tidak ada sumber redistributable publik yang sah). Aksi owner minimal: M-1/M-2 (pernyataan/distribusi SDK + kontrak build client) atau M-6 (jawaban T-01). Status F-047: partially addressed (bukti lengkap; resolusi BLOCKED). |
| 4 | §D.4.33 (baru) + matriks §2 butir 4 + `README.md` (diubah) | **F-048 — README direkonsiliasi:** klaim "Repo GitHub: Belum ada" DIHAPUS (repo publik ada sejak 2026-11-07); status dibedakan 4 artefak (live Hatch artifact / mirror repo / foundation package / deployment standalone masa depan) dengan tanggal verifikasi 2026-11-08 + bukti atau label NOT VERIFIED; katalog 15 (live) vs seed repo 12 (U-87); Supabase/Vercel tetap "belum ada" + NOT VERIFIED. Uji regresi V15 §3.3 lolos dari README saja. |
| 5 | §D.4.33 (baru) + matriks §2 butir 5 + branch `dev` (`bd5d8fa` + `f25bb24`) | **Pengembangan paralel:** branch `dev` dari `main` @ `c53fd73` berisi `BACKLOG.md` (D-01..D-10) — backlog awal saja, TANPA perubahan kode. Perbedaan nama dicatat (U-98): tugas terjadwal `dev` vs `c53fd73` `development`; rename diserahkan ke agen induk/pemilik. |
| 6 | §D.4.33 (baru) + matriks §2 butir 6 + `CLOSED_BETA_PACKAGE_POINTER.md` (BARU) | **Paket beta diverifikasi + direkonsiliasi:** 5 file ADA di branch `beta-readiness` @ `fd4441a`, keputusan BLOCKED, SHA paket `850592a` tercatat di `RELEASE_EVIDENCE.md`. Klaim V15 "no beta package found" = gap visibilitas branch (V15 hanya me-review `main`, ditulis sebelum paket di-push). File TIDAK diduplikasi ke `main`; pointer singkat sebagai gantinya. |
| 7 | §D.4.33 (baru) + matriks §2 butir 8 + `DEPLOYMENT_FEASIBILITY_V2322.md` §4.1 | **Direktif `c53fd73` + jawaban GPT link-jadi dicatat:** `c53fd73` (implementation-first di branch development) masuk 13:41 WIB — implementasi TIDAK dieksekusi dalam revisi ini (otorisasi run ini desain+bukti saja; U-99 — keputusan diserahkan ke agen induk/pemilik). ChatGPT menjawab diskusi link-jadi 13:47 WIB (`59b02d0`): rangking C/A/D/B; definisi "project link" vs "application trial link"; kriteria T-01; gate minimum owner-only trial. |
| 8 | §D.4.33 + matriks §5 + §10 | **Risiko baru U-97..U-102** (SDK menolak build tangan, nama branch, otorisasi implementasi, diskusi link-jadi, klasifikasi Vercel Hobby, CPU checkLink vs 10 ms). Gate **G-K diperbarui** (K-1..K-5/K-7..K-10 + otorisasi tahap (b) + U-99 + T-01 + M-1/M-2). F-001..F-005 tetap OPEN/BLOCKED; F-019/F-028 NOT VERIFIED; F-030 CONFIRMED BLOCKER; staging roles UNASSIGNED + 4 baris baru (14–17). |

## Perubahan di revisi v2.3.21 (8 November 2026)

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.32 (baru) + matriks §2 F-044 + `evidence/v2321/0006_unified_ownership_and_uniqueness_v2321.sql` (BARU) + harness | **F-044 — migrasi SQLite ditulis ulang (rebuild):** teks v2 (ALTER ADD STORED) SUPERSEDED — gagal pada tabel berisi (`cannot add a STORED column`, H-MIG-00a, 3.53.4 + 3.45.1) dan mengandung typo sintaks (U-94). Pendekatan rebuild create/copy/validate/swap dalam satu transaksi atomik; urutan SQL, FK handling, backup/restore, failure injection + rollback, dan down migration eksplisit di artefak. Bukti VM atas ARTEFAK migrasi yang sebenarnya (bukan mirror): `test-f044-f045-f046-migration-v2321.txt` (Bun 1.4.4 / SQLite 3.53.4, uid 0, 109 assert PASS) + `...-sqlite3451.txt` (25 assert PASS). Nuansa U-96: ALTER ADD STORED berhasil pada tabel KOSONG — jebakan dev/prod. Lantai versi >= 3.31.0 (up) / >= 3.35.0 (down); versi runtime produksi NOT VERIFIED (U-90). Tes baru H-MIG-00..09. |
| 2 | §D.4.32 (baru) + matriks §2 F-045 + proposal §4 (3d) | **F-045 — CHECK constraint chain nyata:** `projects_chain_allowlist_ck` + `projects_contract_format_ck` sebagai SQL bernama dalam rebuild (bukan komentar). Direct SQL INSERT/UPDATE negatif teruji termasuk contract NULL (tutup bypass canonical-NULL); 8 chain allowlist lolos; inspeksi `sqlite_master` membuktikan constraint terpasang. Format CHECK disamakan dengan fungsi aplikasi (prefix `0x`/`0X` + 40 hex, atau 40 hex tanpa prefix — U-95). Tes baru H-CAT-11..13. |
| 3 | §D.4.32 (baru) + matriks §2 F-046 + proposal §5 (baru) | **F-046 — legacy checks fail-closed:** default L-A — NULL berarti "tanpa pemilik tercatat", BUKAN publik; predikat lama v2.3.20 (`OR owner IS NULL`) DIHAPUS setelah harness membuktikan kebocoran 2 baris legacy ke principal B (H-TEN-11d). Pseudodiff `listChecks`/`deleteCheck`/`askGibran` fail-closed + fungsi terpisah `exportLegacyChecks` (admin-gated). Scope `ctx.db` dinyatakan NOT VERIFIED; keputusan baru K-10 (L-A/L-B/L-C); konsekuensi anonim write-only dicatat (U-89). Tes baru H-TEN-11..15. |
| 4 | §D.4.32 + header desain (baris 3–5) + proposal §6 | **Koreksi faktual U-87 + U-88:** katalog repo adalah 12 baris (bukan 15 seperti diklaim v2.3.20); migrasi v3 memakai jumlah aktual, bukan hardcode. §D.4.31 dirujuk 9× v2.3.20 tetapi badannya tidak pernah ditulis — v2.3.21 menambahkan §D.4.32 dan TIDAK memalsukan §D.4.31 retroaktif. |
| 5 | §D.4.32 + matriks §5 + proposal Lampiran B | **Risiko baru U-87..U-96** (row-count, §D.4.31 hilang, anonim write-only, versi SQLite produksi, sqlite_sequence, pemetaan Drizzle, validasi runner, typo DDL v2, kesamaan input app-vs-DB, jebakan dev/prod). Gate **G-K diperbarui** (K-1..K-5/K-7..K-10 + otorisasi tahap (b)). |
| 6 | §D.4.32 + matriks §6/§8/§10 | **Carry-forward + traceability:** F-001..F-005 tetap OPEN/BLOCKED; F-019/F-028 NOT VERIFIED; F-030 CONFIRMED BLOCKER; staging roles UNASSIGNED + 2 baris baru (SQLite runtime, K-10); `checkLink` TIDAK di-invoke; log gagal run1/run2 + CLI run1 dipertahankan terpisah (aturan raw log). Pemicu revisi v2.3.22 adalah audit independen V15, ATAU keputusan owner atas K-1..K-5/K-7..K-10/G-A/G-C/G-D/G-F/G-G (G-K), ATAU bukti runtime G-B, ATAU staging tersedia (G-E). |

## Perubahan di revisi v2.3.20 (8 November 2026)

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.31 (baru) + matriks §2 F-038 + `evidence/v2320/test-f038-layers-v2320.ts` (BARU) | **F-038 — L0/L1 dipisah (koreksi atas v2.3.19 §2.3):** SATU chunk TIDAK PERNAH dihitung sebagai compressed dan decoded sekaligus. `Response.body` Bun HANYA menghasilkan L1 (decoded). Dua model dipilih (K-7): Model B — transport mentah + dekompresi di aplikasi (L0 terukur, rekomendasi); Model A — egress/infrastruktur menegakkan L0, aplikasi TIDAK mengklaim L0 (fallback; tanpa bukti egress, Model A TIDAK memenuhi F-002 — U-78). Bukti VM (`test-f038-layers-v2320.txt`, 19 baris, Bun 1.4.4, uid 0, 8 assert PASS): fixture gzip 520 byte wire → 500.000 byte decoded (rasio 961,5x); chunk `Response.body` berjumlah 500.000; transport mentah mengukur 520 byte; `fetch()` dengan `Accept-Encoding: identity` TETAP mendekompresi — aplikasi tidak dapat memperoleh raw bytes lewat Bun fetch. Tes baru H-RES-13. |
| 2 | §D.4.31 (baru) + matriks §2 F-039 + `evidence/v2320/test-f039-tryreserve-v2320.ts` (BARU) | **F-039 — aggregate budget concurrency-safe:** `tryReserve()` sinkron SEBELUM append (check-and-reserve atomik); A1 (accepted/retained — dijamin keras A1 ≤ cap) vs A2 (transient/in-flight — batas RUMUS R × C_max, C_max tidak dijamin kecil oleh runtime: hingga 483.616 byte teramati) didefinisikan terpisah; script dibaca SERIAL (R = 1, batas A2 = 1 × C_max) dengan trade-off latensi TERUKUR (paralel 19–22 ms vs serial 25–28 ms pada fixture lokal — selisih ~6 ms). Simulasi lockstep deterministik membuktikan logika lama v2.3.19 (append-dulu) overshoot 186.432 byte = 3 chunk (A1 = 1.186.432 > cap) — klaim "cap + satu chunk" SALAH; logika baru A1 = 989.824 (paralel) / tepat 1.000.000 (serial). H-RES-07 DIREVISI; H-RES-14 baru. Temuan evidence: `await fetch(...)` dan `await reader.cancel()` HARUS di try/catch (AbortError) — `cancel()` tanpa await pada stream ter-abort menjadi unhandled rejection (3x pada run pertama; log run 1 + 2 dipertahankan terpisah). Tes regresi: `test-f039-tryreserve-v2320.txt` (39 baris, Bun 1.4.4, uid 0, 23 assert PASS, 0 unhandled rejection). |
| 3 | §D.4.31 (baru) + matriks §2 F-040 + proposal §4 (ditulis ulang) | **F-040 — model katalog diputuskan: `projects` = katalog GLOBAL.** Migrasi 0006 DITULIS ULANG (teks v2): TIDAK ADA kolom owner di `projects`, TIDAK ADA backfill 15 baris ke satu owner (K-6 DIHAPUS); `checks` mendapat `owner_user_id` nullable (NULL = riwayat anonim/legacy); `savedProjects` di-rework ke composite key `(principal_id, project_id)` + sentinel `<LEGACY>` terdokumentasi; `listProjects` membaca global tanpa filter owner; mutasi katalog lewat gerbang otorisasi §5. H-TEN-06/07 v2.3.19 SUPERSEDED (mengasumsikan backfill); H-TEN-08..10 + H-AUTH-07 baru; H-AUTH-04 direvisi (B MELIHAT baris A). Cabang per-tenant dicatat sebagai alternatif yang ditolak untuk revisi ini (proposal §4.7). |
| 4 | §D.4.31 (baru) + matriks §2 F-041 + proposal §3.3 (direvisi) | **F-041 — deadline + concurrency direkonsiliasi:** total deadline **20 detik** (KOREKSI atas 30 detik v2.3.19 — 20 detik adalah keputusan pemilik tercatat §A.5, syarat cutover; 30 detik di kode mirror adalah nilai yang HARUS diubah saat implementasi, bukan keputusan). Global DB lease (`scan_leases`, maks 5) adalah DEFAULT; varian in-memory semaphore TERKUNCI (butuh bukti single-instance + persetujuan owner). Sumber IP = peer TCP langsung; `X-Forwarded-For` hanya dari trusted proxy (validasi hop-per-hop); spoofed header DIABAIKAN; storage rate limit = tabel DB. Tes baru H-RES-15..17. Risiko baru U-81 (kode mirror masih 30 detik) + U-85 (trusted proxy + storage belum ada). |
| 5 | §D.4.31 (baru) + matriks §2 F-042 + `evidence/v2320/test-f042-guard-v2320.ts` (BARU) | **F-042 — guard fail-closed diperketat:** `validateDestination` kini menolak eksplisit empty/null/undefined IP set (`empty-dns-result` / `resolver-no-answer`) — celah v2.3.19 (`ok=true, ip=undefined`) ditutup; checkPort 80/443 dipetakan eksplisit; DNS timeout 5 detik + late result diabaikan (generation flag; AbortSignal tidak dianggap membatalkan resolver); LARANGAN KERAS fallback ke fetch biasa bila destination pin tidak tersedia. Tes regresi: `test-f042-guard-v2320.txt` (53 baris, Bun 1.4.4, uid 0, 47 assert PASS): empty/NODATA/NXDOMAIN/timeout → deny; 19 alamat terlarang/malformed/non-kanonik/zone → deny; mapped publik → ok dengan IPv4 ekstraksi; port non-standar → deny; late result tidak dipakai (0 koneksi). Tes baru H-SSRF-27..30. |
| 6 | §D.4.31 (baru) + matriks §2 F-043 + `evidence/v2320/test-f043-canonical-v2320.ts` (BARU) | **F-043 — kanonikalisasi per tipe alamat + scope uniqueness:** EVM hex case-insensitive (trim → strip `0x` → lowercase); Solana base58 case-sensitive (trim saja — full-lowercase dapat menghasilkan string yang BUKAN alamat valid karena `'l'` bukan base58); scope uniqueness PER `(chain, canonical_address)`, GLOBAL lintas tenant (konsisten F-040); peta chain → tipe alamat mengikat (K-8; EVM: BNB Chain, Ethereum, Base, Arbitrum, Polygon, opBNB, Robinhood Chain; Solana: Solana; chain tak dikenal → REJECT fail-closed via CHECK constraint + pre-check). SATU fungsi `canonicalizeContractAddress()` dipakai aplikasi DAN definisi kolom kanonik DB (generated column STORED + unique index). Tes regresi: `test-f043-canonical-v2320.txt` (33 baris, Bun 1.4.4, uid 0, 27 assert PASS — fungsi JS == kolom generated DB untuk SEMUA baris; EVM collision; Solana case-sensitive; lintas chain OK; NULL OK). Tes baru H-CAT-07..10. |
| 7 | §D.4.31 (baru) + header desain (baris 5) + proposal §9 (baru) + matriks §2 butir 7 | **Traceability — kalimat stale diperbaiki + aturan raw log:** kalimat header yang masih menyatakan butir 2 brief "BELUM dikerjakan" DIPERBAIKI (stale sejak v2.3.19 — proposal selesai v2.3.19, direvisi v2.3.20). Aturan raw log BARU (proposal §9): setiap run gagal/ulang disimpan sebagai file terpisah, tidak pernah ditimpa; setiap log memuat tanggal WIB + Bun + UID + label lingkungan + PASS/FAIL + exit code; setiap status matriks harus dapat ditelusuri ke file + test ID + log (+ SHA-256) + commit SHA + tanggal + exit code. Dipraktikkan v2.3.20: 5 file log non-kanonik dipertahankan di `evidence/v2320/` (run1-label F-038, run1-fail F-043, run1-noisy + run2-fail F-039 — penyebab + perbaikan dicatat di README paket + matriks §10). |
| 8 | §D.4.31 (baru) + matriks §2 (F-034/F-035/F-036/F-037/U-72) + §5 (U-78..U-86) + §G | **Carry-forward + risk register + gate:** F-001..F-005 tetap OPEN/BLOCKED (proposal direvisi, bukan implementasi); audit V13 §3 mengonfirmasi F-034/F-036 ADDRESSED (harness VM, 50 assert PASS), F-037 ADDRESSED (59 + 25 assert PASS) dengan catatan raw log run pertama — dijawab sebagai aturan §9; F-035 ADDRESSED dengan residual U-77; F-029 TIDAK diulang; SU-T5 TIDAK direkonstruksi; F-030 tetap CONFIRMED BLOCKER; F-019/F-028 NOT VERIFIED; `checkLink` TIDAK di-invoke. Risiko baru **U-78..U-86** (F-038..F-043 — lihat proposal Lampiran B). Gate **G-K diperbarui** (review proposal v2.3.20 + keputusan K-1..K-5/K-7..K-9 + otorisasi tahap (b)); gate G-A..G-J dipertahankan. Pemicu revisi v2.3.21 adalah audit independen V14, ATAU keputusan owner atas K-1..K-5/K-7..K-9/G-A/G-C/G-D/G-F/G-G (G-K), ATAU bukti runtime G-B, ATAU staging tersedia (G-E). |

## Perubahan di revisi v2.3.19 (8 November 2026)

Revisi ini menjawab audit independen V12 (`SSRF_INDEPENDENT_AUDIT_V12.md`, commit `cd96768`, audit 2026-11-08 11:36 WIB atas v2.3.18 commit `3f129fc`) — keenam butir Handoff §10 dijawab satu per satu; matriks respons lengkap: `SSRF_RESPONSE_MATRIX_V2319.md`. Status tetap **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**. F-001..F-005 TETAP blocked (proposal kini tersedia untuk ditinjau — bukan implementasi, bukan otorisasi). Dokumen respons lengkap:

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.30 (baru) + matriks §2 F-036 + `evidence/f032-harness-validation/pid-oracle.ts` (diperbarui) + `test-pid-oracle.ts` (diperbarui) | **F-036 — parser PID menolak starttime 0:** `parsePidFile()` dan `parseProcStat()` kini menolak `starttime <= 0` (sebelumnya `< 0`); `classifyLiveness()` memvalidasi input pid/recordedStarttime sendiri (invalid → "inconclusive", tidak pernah "dead", `kill()` tidak pernah dipanggil); helper baru `verifyPidFile()` gagal-cepat untuk SELURUH file bila ada parse error — tidak ada assertion liveness atas record parsial; driver E2E memakai `verifyPidFile()`. Tes regresi `test-pid-oracle.ts` (log `test-pid-oracle-v2319.txt`, 59 baris, Bun 1.4.4, uid 65534, 50 assert PASS): starttime 0 (kasus penerimaan audit), negatif, non-integer, unsafe integer, sangat besar, valid+invalid campur, `parseProcStat` starttime 0 → null, 8 kasus validasi input oracle, 4 kasus fail-fast `verifyPidFile()`. |
| 2 | §D.4.30 (baru) + matriks §2 F-037 + `evidence/f032-harness-validation/test-f035-pidfile.ts` (ditulis ulang) + `evidence/f029-memory-methodology/test-u72-seam.ts` (ditulis ulang) | **F-037 — keselamatan filesystem pada tes F-035 dan U-72:** kedua file tes ditulis ulang — semua fixture di SATU direktori privat per-run (`mkdtemp`, 0700); file dibuat EKSKLUSIF (`openSync "wx"`, 0600); symlink dibuat hanya setelah memastikan path tidak ada; bila path legacy SUDAH ADA saat tes mulai, tes GAGAL AMAN tanpa menyentuhnya; teardown hanya menghapus objek yang (dev,ino)-nya masih cocok dengan yang dicatat saat pembuatan; kedua tes MENOLAK berjalan sebagai root (uid 0). Tes regresi F-035 (log `test-f035-pidfile-v2319.txt`, 75 baris, Bun 1.4.4, uid 65534, 59 assert PASS): DUA skenario (legacy = symlink DAN regular file, masing-masing dua driver paralel) — file lama tidak pernah berubah/terhapus, set PID disjoint, cleanup terverifikasi, tidak ada leftover `/tmp`. Tes regresi U-72 (log `test-u72-seam-v2319.txt`, 36 baris, Bun 1.4.4, uid 65534, 25 assert PASS): 7 penolakan + 1 penerimaan seperti v2.3.18 + pemeriksaan direktori privat + cleanup terverifikasi. Bukti kanonik uid 65534 dari salinan stage byte-identik (sha256 terverifikasi) karena repo tidak dapat dibaca `nobody` — lihat matriks §10 butir 1. |
| 3 | §D.4.30 (baru) + matriks §2 trust boundary + `evidence/f032-harness-validation/hang-child.ts` (ditulis ulang) + `run-f032-timeout-e2e.ts` (diperbarui) | **Trust boundary F-035 — child writer fd-based + keputusan eksplisit:** pola `lstat` lalu `appendFileSync` DIGANTI open fd `O_WRONLY\|O_APPEND\|O_NOFOLLOW` + verifikasi `fstat` pada descriptor (regular, uid sama, mode 0600, (dev,ino) sama dengan yang dicatat driver via `F032_PID_FILE_DEV`/`F032_PID_FILE_INO`) + satu `writeSync`; tanpa env pin, child exit 1. Keputusan yang dinyatakan eksplisit: proses tidak tepercaya UID-sama DI LUAR threat model harness (alasan: same-UID dapat ptrace/signal/mem-baca driver; direktori 0700 sudah mengecualikan UID lain; child adalah kode tepercaya) — penjepitan fd adalah defense-in-depth terhadap swap path yang tidak disengaja. Uji E2E diulang pada driver baru (log `run-f032-timeout-e2e-v2319.txt`, 191 baris, Bun 1.4.4, uid 65534): 12 FAIL timeout, ke-12 PID mati via ESRCH, 12 == 12, direktori privat terhapus. Tes regresi negatif TIDAK diulang (driver negatif tidak berubah). |
| 4 | `SSRF_PROPOSAL_F001_F005_V2319.md` (BARU) + matriks §2 F-001..F-005 | **Proposal implementation-ready F-001..F-005 — SELESAI (prioritas utama V12 §10 butir 4):** file/fungsi/baris terverifikasi pada main `cd96768` (read-only), pseudodiff, threat model, matriks tes dengan kasus negatif + hasil yang diharapkan (H-SSRF-21..26, H-RES-07..12, H-CAT-04..06, H-TEN-06..07, H-AUTH-04..06 — baru), dependensi staging, migrasi/rollback, risiko tersisa. Temuan baru saat verifikasi: RDAP memakai `redirect: "follow"` tanpa validasi hop (F-001f); tidak ada lease/rate limit di `actions.ts` (F-003c belum ada sama sekali). F-004 + F-018 dirancang sebagai SATU migrasi koheren (`0006`); F-005 memberi tiga opsi otorisasi tanpa asumsi SDK (default: nonaktifkan `addProject`). Status F-001..F-005 tetap OPEN/BLOCKED — proposal bukan implementasi dan bukan otorisasi tahap (b). |
| 5 | §D.4.30 (baru) + matriks §2 (F-033/F-030/F-019/F-028) + `STAGING_READINESS_V2319.md` (BARU) | **F-033, F-030, F-019, F-028 — dipertahankan tanpa perubahan:** rasio 1,12–2,62× tetap HANYA bukti VM; F-029 TIDAK diulang; SU-T5 TIDAK direkonstruksi; F-030 tetap CONFIRMED BLOCKER dan F-009 tetap NOT REPRODUCIBLE; `checkLink` TIDAK di-invoke, tidak ada public share, tidak ada perubahan runtime; kontrol F-019 (a)–(e) tetap belum satu pun terpenuhi; LIVE VERSION / DEPLOYMENT APPROVAL tetap NOT VERIFIED (semua field manifest NOT PROVIDED). Staging owners/prereqs — tetap UNASSIGNED, dicatat sebagai BLOCKED (`STAGING_READINESS_V2319.md` carry-forward dari V2318). |
| 6 | §D.4.30 (baru) + matriks §2 (carry-forward) + §G U-75/U-76/U-77 | **Carry-forward + risk register + gate:** F-001..F-005, F-006b/F-006c, F-016..F-019, F-028, U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa perubahan status; log gagal SU-T5 TIDAK direkonstruksi; bukti VM dipisah ketat dari staging. Risiko baru **U-75** (F-036 — parser starttime 0), **U-76** (F-037 — tes regresi path tetap), **U-77** (F-035 — asumsi trust boundary UID-sama yang diterima). **U-70 DIPERBARUI** (jalur timeout kini memakai `verifyPidFile()` fail-fast + child writer fd-based), **U-72 DIPERBARUI** (tes seam ditulis ulang untuk F-037), **U-73 DIPERBARUI** (celah starttime 0 ditutup), **U-74 DIPERBARUI** (child writer fd-based + trust boundary diklarifikasi). Gate baru **G-K** (review proposal F-001..F-005 oleh ChatGPT + keputusan owner K-1..K-6 + otorisasi tahap (b)); gate G-A..G-J dipertahankan. Pemicu revisi v2.3.20 adalah audit independen V13, ATAU keputusan owner atas K-1..K-6/G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU staging tersedia (G-E). |

## Perubahan di revisi v2.3.18 (8 November 2026)

Revisi respons atas audit independen V11 ChatGPT
(`SSRF_INDEPENDENT_AUDIT_V11.md`, commit `c69af06`, 2026-11-08 —
F-034, F-035 + catatan U-72 + Handoff §11 9 butir). Tidak ada
keputusan D-1 s.d. D-8 yang diubah. Status tetap: **DESIGN
ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED**. Tidak
ada kode aplikasi yang diubah, tidak ada perubahan
database/katalog, tidak ada production build, Link Scanner tetap
nonaktif, public tester tetap ON HOLD (Rama, 2026-11-08 00:28
WIB). F-001..F-005 TETAP blocked. Dokumen respons lengkap:
`SSRF_RESPONSE_MATRIX_V2318.md` (file baru; matriks v2.3.17
`SSRF_RESPONSE_MATRIX_V2317.md` dipertahankan utuh sebagai
catatan sejarah).

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.29 (baru) + matriks §2 F-034 + `evidence/f032-harness-validation/pid-oracle.ts` (BARU) + `test-pid-oracle.ts` (BARU) | **F-034 — oracle terminasi PID DIPERKETAT:** hanya `error.code === "ESRCH"` yang berarti proses tidak ada; EPERM berarti proses ADA (verdict "alive" → FAIL); EINVAL / `ERR_INVALID_ARG_TYPE` / exception lain berarti oracle tidak dapat memutuskan (verdict "inconclusive" → FAIL). File PID di-parse ketat (tiap baris tepat `"<pid> <starttime>"`, keduanya positive safe integer, pid 1..2^31−1; baris kosong/malformed/duplikat/di luar rentang ditolak SEBELUM assertion liveness). Identitas PID diverifikasi via starttime field 22 `/proc/<pid>/stat` yang dicatat child saat spawn (cocok = child yang sama masih hidup; berbeda = PID dipakai ulang; state Z/X = mati; `/proc` tak terbaca/tak ter-parse = inconclusive). Tes regresi `test-pid-oracle.ts` (log `test-pid-oracle-v2318.txt`, 30 assert PASS): 15 kasus parsing + 11 kasus klasifikasi stub injeksi (EPERM/EINVAL TIDAK BISA PASS — dibuktikan deterministik, karena VM ini berjalan sebagai root sehingga EPERM hidup tidak dapat diproduksi; itu dicatat jujur di log, bukan dipalsukan) + 4 kasus proses hidup nyata (exit→ESRCH; `sleep 30` stat ter-parse + alive, lalu SIGKILL terkontrol→dead). |
| 2 | §D.4.29 (baru) + matriks §2 F-035 + `evidence/f032-harness-validation/` (driver + `hang-child.ts` diperbarui) + `test-f035-pidfile.ts` (BARU) | **F-035 — file PID pindah ke direktori privat per-run:** path tetap `/tmp/f032-hang-child.pid` DIHAPUS dari driver (tidak lagi direferensikan). Driver kini membuat direktori privat per-run via `mkdtemp` (mode 0700, realpath + kepemilikan uid divalidasi) dan file PID di dalamnya secara eksklusif (`openSync "wx"`, mode 0600, fstat-validated); `hang-child.ts` mencatat `"<pid> <starttime>"` dan memvalidasi file PID dengan `lstat` (file regular, bukan symlink, uid sama, mode 0600) sebelum append; direktori dihapus di blok `finally`. Tes regresi `test-f035-pidfile.ts` (log `test-f035-pidfile-v2318.txt`, 25 assert PASS): symlink ditanam di path lama (target sentinel byte-identik sebelum/sesudah), dua driver PARALEL (direktori berbeda, set PID disjoint, keduanya PASS), cleanup terverifikasi. Uji E2E diulang pada driver baru (log `run-f032-timeout-e2e-v2318.txt`, 189 baris): 12 FAIL timeout, ke-12 PID mati via ESRCH, 12 PID yang diuji == 12 child yang diluncurkan, direktori privat terhapus. |
| 3 | §D.4.29 (baru) + matriks §2 U-72 + `evidence/f029-memory-methodology/run-f029.ts` (diperbarui) + `test-u72-seam.ts` (BARU) | **U-72 — test seam DIPERKETAT:** `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` kini hanya dihormati bila `F029_TEST_MODE=1` eksplisit; script child harus realpath ke fixture yang disetujui (`exp-pattern.ts` atau `hang-child.ts` di dalam evidence tree); path yang diberikan tidak boleh berupa symlink; selain itu → exit 2 sebelum child mana pun di-spawn. Tes regresi `test-u72-seam.ts` (log `test-u72-seam-v2318.txt`, 15 assert PASS): 7 kasus penolakan (tanpa test mode, `F029_TEST_MODE=true`, timeout tanpa test mode, path arbitrer, symlink, path tak ada, file non-script) + 1 kasus penerimaan (fixture yang disetujui + timeout 100 ms → 12 FAIL timeout, exit 1, baris `test-seam:` tercatat). TIDAK ADA workflow CI yang ditambahkan (sesuai audit — tanpa threat model, tidak ada workflow yang mengeksekusi input PR tak tepercaya). Tes regresi negatif diulang pada harness baru (log `run-f032-negative-v2318.txt`, 307 baris): 7 kasus exit 2, kontrol positif `--runs 1` exit 0 dengan 12 RESULT — perilaku default tidak berubah. |
| 4 | §D.4.29 (baru) + matriks §2 (F-033/F-030/F-019/F-028) | **F-033, F-030, F-019, F-028 — dipertahankan tanpa perubahan:** rasio 1,12–2,62× tetap HANYA bukti VM (bukan sizing/cgroup/acceptance); ambang pra-tes H-RES-05 ditetapkan sebagai ambang yang ditentukan operator staging dari budget memori target (BUKAN diturunkan dari rasio VM); F-030 tetap CONFIRMED BLOCKER dan F-009 tetap NOT REPRODUCIBLE (tidak ada digest/provenance baru yang dikarang); `checkLink` TIDAK di-invoke, tidak ada public share, tidak ada perubahan runtime; kontrol F-019 (a)–(e) tetap belum satu pun terpenuhi; LIVE VERSION / DEPLOYMENT APPROVAL tetap NOT VERIFIED (semua field manifest NOT PROVIDED). Eksperimen memori F-029 TIDAK diulang: child terukur dan metodologi byte tidak berubah; kontrol positif `--runs 1` pada harness baru membuktikan jalur default tetap bekerja end-to-end. |
| 5 | §D.4.29 (baru) + matriks §2 (staging owners) + `STAGING_READINESS_V2318.md` (BARU) | **Staging owners/prereqs — tetap UNASSIGNED, dicatat sebagai BLOCKED:** operator, runtime provider, egress owner, DB/runtime owner, alert channel/operator penerima, dan rollback owner tetap UNASSIGNED karena tidak ada keputusan Rama/provider — tidak ada nama yang dikarang; prasyarat tiap peran dirumuskan eksplisit; ST-12 tetap tidak PASS tanpa alert yang benar-benar diterima operator (kriteria ST-12-LAT-01..03 dipertahankan). Tabel readiness 1 halaman baru `STAGING_READINESS_V2318.md` merangkum keenam peran + dua bukti minimum (identitas artifact read-only; Link Scanner nonaktif di semua jalur) — semua UNASSIGNED / BLOCKED / NOT PROVIDED; menjawab butir 3 brief eksekusi `MUSE_EXECUTION_BRIEF_2026-11-08.md` (commit `8441aec`). |
| 6 | §D.4.29 (baru) + matriks §2 (carry-forward) + §G U-73/U-74 | **Carry-forward + risk register + gate:** F-001..F-005, F-006b/F-006c, F-016..F-019, F-028, U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa perubahan status; log gagal SU-T5 TIDAK direkonstruksi; bukti VM dipisah ketat dari staging. Risiko baru **U-73** (F-034 — oracle terminasi PID menerima semua exception sebagai "mati") dan **U-74** (F-035 — file PID di path tetap `/tmp`, rentan symlink/TOCTOU + concurrency). **U-70 DIPERBARUI** (jalur timeout kini teruji dengan oracle ketat + direktori privat; sisa risikonya adalah seam yang kini diperketat) dan **U-72 DIPERBARUI** (seam kini di-gate mode test eksplisit + allowlist realpath + tolak symlink). Gate berikutnya tetap G-A..G-J; tidak ada gate baru — pemicu revisi v2.3.19 adalah keputusan owner atas G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU staging tersedia (G-E), ATAU audit independen V12. |

## Perubahan di revisi v2.3.17 (8 November 2026)

Revisi respons atas audit independen V10 ChatGPT
(`SSRF_INDEPENDENT_AUDIT_V10.md`, commit `237d491`, 2026-11-08 —
F-033 + Handoff §9 9 butir). Tidak ada keputusan D-1 s.d. D-8
yang diubah. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED**. Tidak ada kode aplikasi yang diubah,
tidak ada perubahan database/katalog, tidak ada production build, Link
Scanner tetap nonaktif, public tester tetap ON HOLD (Rama, 2026-11-08
00:28 WIB). F-001..F-005 TETAP blocked. Dokumen respons lengkap:
`SSRF_RESPONSE_MATRIX_V2317.md` (file baru; matriks v2.3.16
`SSRF_RESPONSE_MATRIX_V2316.md` dipertahankan utuh sebagai catatan
sejarah).

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.28 (baru) + matriks §2 F-033 + `evidence/f029-memory-methodology/` (diperbarui) | **F-033 — instrumen pengukuran DIPERBAIKI, rasio v2.3.16 dinyatakan SUPERSEDED:** `TextEncoder` DIKELUARKAN dari measured process (`exp-pattern.ts` tidak lagi memanggilnya sama sekali); jumlah byte kini dihitung **aritmetik deterministik** dari lebar byte filler/marker yang diketahui (modul bersama baru `fixture.ts`); bukti byte independen adalah **preflight terpisah** (`preflight-fixture.ts`, proses sendiri, 61 checks TextEncoder — marker 33/15/13, lebar filler, cap−1/cap/cap+1 per segmen + total, nonascii 1.999.939) yang dijalankan parent harness SEBELUM child terukur mana pun dan menggagalkan run bila gagal; tiap RESULT membawa `encoderInMeasuredPhase: false` + `byteProof: "preflight+arithmetic"` yang di-assert parent. **Lifecycle pola B dibuat eksplisit:** scan satu segmen pindah ke helper `scanSegment()` scope tertutup (hanya `{ found, bytes, chars }` yang kembali; `seg`/`segLower` keluar scope sebelum `doGc()`), tiap forced GC pola B dicatat di log (90 baris `B gc after segment` per log). Rerun penuh dibenarkan karena harness berubah: 60 run anak per versi Bun (1.3.10 `1.3.10+30e609e08` DAN 1.4.4 `1.4.4+38afee6c8`), 0 gagal, 60 PID berbeda, `asksConnect = true` pada semua 120 run (log baru `run-1310-f033.txt`, `run-144-f033.txt`, 995 baris masing-masing) + varian byte 14 run (`run-144-f033-byte-variants.txt`). **Rasio A/B terukur ulang 1,12–2,62× (median VmHWM)** — rentang v2.3.16 (1,13–1,84×) dinyatakan SUPERSEDED (instrumen terkonfounded); forced-GC 1,69–2,62× vs natural-GC 1,12–1,30×. Hipotesis arah V10 (rasio lama melebih-lebihkan manfaat) TIDAK terkonfirmasi pada sel forced-GC — confound `segLower` yang hidup melewati GC ternyata lebih besar daripada transient encoder; rasio tetap HANYA bukti VM, BUKAN sizing/cgroup acceptance (status angka operasional tetap NOT VERIFIED sampai review independen). Karakter hidup 3,60× dipertahankan sebagai character accounting; `heapUsed` = 0 pada semua 60 run 1.3.10 direproduksi. |
| 2 | §D.4.28 (baru) + matriks §2 F-032 + `evidence/f032-harness-validation/` (diperbarui) | **F-032 — timeout end-to-end DIBUKTIKAN:** child dummy `hang-child.ts` (menggantung selamanya, tanpa RESULT, PID dicatat) + driver `run-f032-timeout-e2e.ts` membuktikan melalui parent harness yang sebenarnya: 12 child gantung semuanya timeout (`timeout after 3000 ms`), semuanya dimatikan parent (ke-12 PID terverifikasi mati via kill(pid,0) → ESRCH), 0 record, `COUNT MISMATCH`, `parent done: FAILED`, exit 1, TIDAK ADA `all child runs ok` dan TIDAK ADA baris RESULT (log `run-f032-timeout-e2e.txt`, 11 assert PASS). Test seam env `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` ditambahkan ke `run-f029.ts` (tervalidasi; dicatat eksplisit bila aktif; production run tidak pernah mengesetnya). Tes regresi negatif diulang pada harness baru (log `run-f032-negative-v2317.txt`): 7 kasus exit 2, kontrol positif `--runs 1` exit 0 dengan 12 RESULT. Caveat V10 atas F-032 dengan ini TERTUTUP. |
| 3 | §D.4.28 (baru) + matriks §2 (F-030/F-019/F-028) | **F-030, F-019, F-028 — dipertahankan tanpa perubahan:** F-030 tetap CONFIRMED BLOCKER dan F-009 tetap NOT REPRODUCIBLE (Opsi A/B tetap proposal; tidak ada digest/provenance baru yang dikarang); `checkLink` TIDAK di-invoke, tidak ada public share, tidak ada perubahan runtime; kontrol F-019 (a)–(e) tetap belum satu pun terpenuhi; LIVE VERSION / DEPLOYMENT APPROVAL tetap NOT VERIFIED (semua field manifest NOT PROVIDED). |
| 4 | §D.4.28 (baru) + matriks §2 (staging owners) | **Staging owners/prereqs — tetap UNASSIGNED, dicatat sebagai BLOCKED:** operator, runtime provider, egress owner, DB/runtime owner, alert channel/operator penerima, dan rollback owner tetap UNASSIGNED karena tidak ada keputusan Rama/provider — tidak ada nama yang dikarang; prasyarat tiap peran dirumuskan eksplisit; ST-12 tetap tidak PASS tanpa alert yang benar-benar diterima operator (kriteria ST-12-LAT-01..03 dipertahankan). |
| 5 | §D.4.28 (baru) + matriks §2 (carry-forward) + §G U-71/U-72 | **Carry-forward + risk register + gate:** F-001..F-005, F-006b/F-006c, F-016..F-019, F-028, U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa perubahan status; log gagal SU-T5 TIDAK direkonstruksi; bukti VM dipisah ketat dari staging. Risiko baru **U-71** (F-033 — instrumen A/B terkonfounded; rasio v2.3.16 superseded; hipotesis arah V10 tidak terkonfirmasi pada sel forced-GC) dan **U-72** (F-032 — test seam harness sebagai permukaan override baru). **U-67 DIPERBARUI** (rasio terukur ulang 1,12–2,62×; manfaat tetap bergantung GC) dan **U-70 DIPERBARUI** (jalur timeout kini teruji end-to-end; sisa risikonya adalah seam). Gate berikutnya tetap G-A..G-J; tidak ada gate baru — pemicu revisi v2.3.18 adalah keputusan owner atas G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU staging tersedia (G-E), ATAU audit independen V11. |

## Perubahan di revisi v2.3.16 (8 November 2026)

Revisi respons atas audit independen V9 ChatGPT
(`SSRF_INDEPENDENT_AUDIT_V9.md`, commit `619f320`, 2026-11-08 —
F-031, F-032 + Handoff §9 8 butir). Tidak ada keputusan D-1 s.d. D-8
yang diubah. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED**. Tidak ada kode aplikasi yang diubah,
tidak ada perubahan database/katalog, tidak ada production build, Link
Scanner tetap nonaktif, public tester tetap ON HOLD (Rama, 2026-11-08
00:28 WIB). F-001..F-005 TETAP blocked. Dokumen respons lengkap:
`SSRF_RESPONSE_MATRIX_V2316.md` (file baru; matriks v2.3.15
`SSRF_RESPONSE_MATRIX_V2315.md` dipertahankan utuh sebagai catatan
sejarah).

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.27 (baru) + matriks §2 F-031 + `evidence/f029-memory-methodology/` (diperbarui) | **F-031 — fixture exact-byte DIPERBAIKI:** `exp-pattern.ts` kini mengukur SETIAP segmen dengan `TextEncoder().encode(segment).byteLength`, membangun filler dari panjang marker yang TERUKUR (33 / 15 / 13 byte, total 61 — bukan perkiraan 40/20/20), dan melakukan assert total byte SEBELUM scan. Fixture ASCII dan non-ASCII byte-matched kini TEPAT 1.000.000 byte (sebelumnya 999.981 / 999.901); non-ASCII char-matched terukur 1.999.939 byte (bukan ~2.000.000). Varian cap−1 (999.999) dan cap+1 (1.000.001) terukur via argumen `--bytes` baru (log `run-144-f031-byte-variants.txt`, 14 run, semua tepat). Rerun penuh dibenarkan karena harness berubah: 60 run anak per versi Bun (1.3.10 DAN 1.4.4), 0 gagal, 60 PID berbeda, `asksConnect = true` pada semua 120 run (log baru `run-1310-f031-f032.txt`, `run-144-f031-f032.txt`). **Rasio A/B terukur ulang 1,13–1,84× (median VmHWM)** — rentang v2.3.15 (1,18–1,88×) dinyatakan SUPERSEDED (tidak direproduksi eksak; perbedaan kecil, dalam sebaran antar-run); pola B tetap lebih rendah dari pola A pada SEMUA 12 kombinasi di kedua versi; forced-GC 1,51–1,84× vs natural-GC 1,13–1,28×. Karakter hidup 3,60× dipertahankan sebagai character accounting. Dua draf harness yang salah urutan (fixture sebelum baseline; semua segmen di muka untuk pola B) tertangkap saat pengembangan, log trial-nya DIBUANG tanpa di-commit dan dicatat di README F-029 — bukan disembunyikan. |
| 2 | §D.4.27 (baru) + matriks §2 F-032 + `evidence/f032-harness-validation/` (baru) | **F-032 — validasi harness DIPERBAIKI, false green DITUTUP:** `run-f029.ts` kini mewajibkan `--runs` (integer 1..10, tanpa default diam-diam); assertion `records.length === EXPECTED_RUNS` + tiap kombinasi tepat RUNS record; validasi setiap RESULT terhadap pattern/fixture/GC/bun yang diminta dan total byte terukur yang diharapkan; timeout child 120 detik + FAIL bila timeout/signal; baris "all child runs ok" hanya bila semua pemeriksaan lolos. Tes regresi (log `run-f032-negative.txt`): `--runs 0`, `--runs abc`, `--runs -1`, nilai hilang, flag hilang, `--runs 11`, `--runs 1.5` — ketujuh kasus exit 2 tanpa mencetak sukses; kontrol positif `--runs 1` exit 0 dengan 12 RESULT. |
| 3 | §D.4.27 (baru) + matriks §2 F-030 + §G U-68/U-70 | **F-030 — proposal keputusan DISELESAIKAN sebagai paket yang dapat diputuskan (TANPA implementasi):** rekomendasi teknis disampaikan sebagai keputusan yang dapat diambil owner tanpa mengubah file apa pun: **Opsi A (naikkan Bun kanonik ke 1.4.4) + penggantian SDK path via artefak SDK berversi yang di-vendor ke repo dengan digest SHA-256 tercatat** sebagai rekomendasi utama; Opsi B (regenerasi lockfile v1 di bawah 1.3.10) sebagai fallback; masing-masing dengan provenance/digest yang dibutuhkan, prasyarat clean-builder, rencana rollback, dan dampak terhadap bukti runtime (semua bukti VM 1.3.10 harus dibaca ulang sebagai bukti versi lama bila Opsi A dipilih). TIDAK ADA digest yang dikarang: digest SDK yang tercatat (`f2cb7b25…`) adalah hasil ukur VM yang provenance-nya tetap NOT VERIFIED; digest rilis resmi Bun 1.4.4 dan atestasi provider atas SDK harus diisi owner/provider pada saat keputusan (saat ini NOT PROVIDED). F-030 tetap CONFIRMED BLOCKER; F-009 tetap NOT REPRODUCIBLE; tidak ada klaim reproducible sebelum frozen install + typecheck + build pada clean external builder berhasil. |
| 4 | §D.4.27 (baru) + matriks §2 F-019/F-028 | **F-019 dan F-028 — dipertahankan tanpa perubahan:** `checkLink` TIDAK di-invoke, tidak ada public share, tidak ada perubahan runtime; kontrol F-019 (a)–(e) tetap belum satu pun terpenuhi; LIVE VERSION / DEPLOYMENT APPROVAL tetap NOT VERIFIED (semua field manifest NOT PROVIDED). |
| 5 | §D.4.27 (baru) + matriks §2 (staging owners) | **Staging owners/prereqs — tetap UNASSIGNED:** tabel STAGE-P01..P12 dipertahankan lengkap dengan peran yang dibutuhkan; tidak ada nama owner yang dikarang; ST-12 tetap tidak PASS tanpa alert yang benar-benar diterima operator (kriteria ST-12-LAT-01..03 dipertahankan). |
| 6 | §D.4.27 (baru) + matriks §2 (carry-forward) + §G U-69/U-70 | **Carry-forward + risk register + gate:** F-001..F-005, F-006b/F-006c, F-016..F-018, U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa perubahan status; log gagal SU-T5 TIDAK direkonstruksi; bukti VM dipisah ketat dari staging. Risiko baru **U-69** (F-031 — klaim batas byte fixture tidak tepat; rasio v2.3.15 superseded) dan **U-70** (F-032 — harness dapat melaporkan sukses dengan nol run). **U-67 DIPERBARUI** (rasio terukur ulang 1,13–1,84×; manfaat tetap bergantung GC) dan **U-68 DIPERBARUI** (proposal keputusan F-030 selesai sebagai paket yang dapat diputuskan; blocker tetap CONFIRMED). Gate berikutnya tetap G-A..G-J; tidak ada gate baru — pemicu revisi v2.3.17 adalah keputusan owner atas G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU staging tersedia (G-E), ATAU audit independen V10. |

## Perubahan di revisi v2.3.15 (8 November 2026)

Revisi respons atas audit independen V8 ChatGPT
(`SSRF_INDEPENDENT_AUDIT_V8.md`, commit `bed14bd`, 2026-11-08 —
F-029, F-030 + Handoff §9 8 butir). Tidak ada keputusan D-1 s.d. D-8
yang diubah. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED**. Tidak ada kode aplikasi yang diubah,
tidak ada perubahan database/katalog, tidak ada production build, Link
Scanner tetap nonaktif, public tester tetap ON HOLD (Rama, 2026-11-08
00:28 WIB). F-001..F-005 TETAP blocked. Dokumen respons lengkap:
`SSRF_RESPONSE_MATRIX_V2315.md` (file baru; matriks v2.3.14
`SSRF_RESPONSE_MATRIX_V2314.md` dipertahankan utuh sebagai catatan
sejarah).

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.26 (baru) + matriks §2 F-029 + `evidence/f029-memory-methodology/` (baru) | **F-029 — metodologi perbandingan memori F-027 DIPERBAIKI dan rasio v2.3.14 DIKOREKSI:** parent harness baru menjalankan pola A dan B sebagai **proses terpisah** (PID baru, baseline bersih, 60 run anak per versi Bun, 0 gagal, 60 PID berbeda terverifikasi), metrik utama **VmHWM** (OS high-water RSS dari `/proc/self/status`), forced-GC dan natural-GC dilaporkan terpisah, 5 run per kombinasi dengan median + rentang, fixture non-ASCII char-matched DAN byte-matched (500.000 karakter U+00E9 = 1.000.000 byte UTF-8) **[KOREKSI v2.3.16 (F-031): klaim byte itu TIDAK TEPAT — fixture lama terukur 999.901 byte (non-ASCII byte-matched) dan 999.981 byte (ASCII); fixture v2.3.16 adalah 500.032 karakter = tepat 1.000.000 byte terukur. Lihat §D.4.27.]**. Hasil apa adanya: rasio A/B terkoreksi **1,18–1,88×** (median VmHWM) — forced-GC 1,57–1,88×, natural-GC 1,18–1,32×. **Rasio 4,5–5,4× v2.3.14 TIDAK TERKONFIRMASI dan DICABUT sebagai klaim kuantitatif** (artefak baseline B yang tercemar); angka itu dinyatakan NOT VERIFIED dan tidak boleh dipakai sebagai sizing/cgroup acceptance. **[PEMBARUAN v2.3.16: rentang 1,18–1,88× dinyatakan SUPERSEDED oleh pengukuran ulang exact-byte 1,13–1,84×. Lihat §D.4.27.]** Karakter hidup 3,60× dipertahankan hanya sebagai character accounting. Aturan desain (L2 = input-body budget, larangan materialisasi bersamaan, pemindaian incremental) TETAP berlaku — manfaat incremental nyata tetapi lebih kecil, dan larangan itu membatasi worst-case, bukan bergantung pada rasio lama. |
| 2 | §D.4.26 (baru) + matriks §2 F-030 + `evidence/f030-bun-compatibility/` (baru) | **F-030 — matriks kompatibilitas Bun/lockfile/SDK path + trade-off Opsi A vs Opsi B (keduanya PROPOSAL — HOLD):** terverifikasi: Bun 1.3.10 MENOLAK lockfile v2 (frozen install exit 1, log F-009 — tidak diulang); Bun 1.4.4 MENERIMA lockfile v2 — frozen install exit 0 (79 paket, lockfile tidak berubah, hash tetap `a7e1457e…`) + typecheck exit 0 terhadap lockfile ter-commit (log baru `run-144-frozen-install-typecheck.txt`); SDK tarball ada di VM ini (SHA-256 `f2cb7b25…`, sama dengan v2.3.9) tetapi provenance NOT VERIFIED; clean external builder tanpa `/opt/hatch` TIDAK DAPAT install pada versi Bun mana pun (SDK path absolut). Opsi A (naikkan kanonik ke 1.4.4) vs Opsi B (regenerasi lockfile v1 di bawah 1.3.10) + penggantian SDK path dijelaskan trade-off-nya; versi Bun minimum yang menerima lockfile v2 NOT VERIFIED. Build penuh NOT RUN pada kedua versi. F-009 tetap NOT REPRODUCIBLE; F-030 tetap CONFIRMED BLOCKER. |
| 3 | §D.4.26 (baru) + matriks §2 F-028/F-019 | **F-028 dan F-019 — dipertahankan tanpa perubahan:** LIVE VERSION / DEPLOYMENT APPROVAL tetap NOT VERIFIED (semua field manifest NOT PROVIDED, tidak ada tebakan); `checkLink` TIDAK di-invoke, tidak ada public share, tidak ada perubahan runtime; kontrol F-019 (a)–(e) tetap belum satu pun terpenuhi. |
| 4 | §D.4.26 (baru) + matriks §2 (staging owners) + §D.4.19a | **Staging owners/prereqs — tetap UNASSIGNED, dilengkapi prasyarat/prosedur/oracle/bukti per STAGE-P01..P12:** tidak ada nama owner yang dikarang; tiap STAGE-P mendapat prasyarat, prosedur aman, PASS/FAIL oracle, dan bukti yang harus dihasilkan; ST-12 tetap tidak PASS tanpa alert yang benar-benar diterima operator (kriteria ST-12-LAT-01..03 dipertahankan). |
| 5 | §D.4.26 (baru) + matriks §2 (carry-forward) + §G U-67/U-68 | **Carry-forward + risk register + gate:** F-001..F-005, F-006b/F-006c, F-016..F-018, U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa perubahan status; log gagal SU-T5 TIDAK direkonstruksi; bukti VM dipisah ketat dari staging. Risiko baru **U-67** (F-029 — rasio incremental v2.3.14 tidak valid; manfaat terkoreksi 1,18–1,88× dan bergantung GC) dan **U-68** (F-030 — lockfile v2 vs Bun kanonik + SDK path absolut; keputusan G-G + penggantian SDK path dibutuhkan). **U-64 DIPERBARUI** (rasio terkoreksi; aturan desain tetap) dan **U-66 DIPERBARUI** (matriks kompatibilitas + trade-off Opsi A/B). Gate baru **G-J** (keputusan reproduksibilitas F-030: versi Bun kanonik + penggantian SDK path + bukti clean-builder); G-A..G-I dipertahankan. |

## Perubahan di revisi v2.3.14 (8 November 2026)

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.25 (baru) + matriks §2 F-026 | **F-026 — semantik budget memori DIJUJURKAN, klaim "overhead 0 byte" DICABUT sebagai pernyataan umum:** v2.3.13 mengklaim overhead 0 — klaim itu kini DIBATASI hanya pada accepted/retained bytes di accumulator yang dikendalikan aplikasi (terbukti ≤ cap). Dua anggaran dipisah eksplisit: **A1** accepted/retained decoded bytes (halaman ≤ 400.000, tiap script ≤ 300.000, aggregate L2 ≤ 1.000.000 — ditegakkan pre-append, terbukti VM) dan **A2** transient chunk / in-flight memory (alokasi runtime sebelum pemeriksaan aplikasi — worst-case per chunk = seluruh body, teramati 528.384 byte untuk body 1.000.000 dan satu chunk 500.000 byte = seluruh body; tidak ada angka A2 yang dijamin tanpa batas chunk runtime / BYOB / limit proses). Eksperimen VM baru di `evidence/f026-chunk-accounting/` (Bun 1.3.10 DAN 1.4.4, server + klien 127.0.0.1): chunk tidak deterministik dan bergantung versi (max 1.3.10: 528.384; max 1.4.4: 392.791); chunking server 64 KiB TIDAK membatasi chunk klien; shared abort membatalkan sibling dengan cepat di loopback tetapi itu balapan, bukan jaminan; RSS + external adalah metrik yang benar (`heapUsed` saja menyesatkan — body hidup sebagai external). BYOB/fixed-size reads NOT VERIFIED pada Bun mana pun. |
| 2 | §D.4.25 (baru) + matriks §2 F-027 | **F-027 — L2 DINYATAKAN sebagai input-body budget, BUKAN peak-memory budget:** eksperimen VM baru di `evidence/f027-derived-strings/` (pola `actions.ts:520-533` disimulasikan pada kasus batas L2: halaman 400.000 + 2 script 300.000 = 1.000.000 karakter): karakter hidup pada titik analisis **3.599.936 = 3,60× input** (`html` + `scriptTexts` + `join` + `haystack` + `lower` hidup bersamaan); peak RSS **+4,98× input (1.3.10)** / **+4,33× input (1.4.4)**; peak heapUsed +3,61× input (1.4.4) — tetapi `heapUsed` pada 1.3.10 TIDAK BERGERAK sama sekali (string dicatat di external/RSS), sehingga ambang acceptance wajib memakai RSS + external per versi runtime. Aturan desain baru: **LARANGAN materialisasi bersamaan** `html` + `scriptTexts` + `join` + `haystack` + `lower`; pemindaian incremental per segmen (lowercase per segmen, dilepas sebelum segmen berikutnya) — alternatif incremental terukur **~4,5–5,4× lebih rendah** peak-nya dan tetap mendeteksi sinyal yang sama pada kasus uji. **[KOREKSI v2.3.15 (F-029): angka ~4,5–5,4× TIDAK TERKONFIRMASI — metodologi v2.3.14 tidak valid (pola A dan B satu proses, baseline B tercemar); eksperimen terkoreksi `evidence/f029-memory-methodology/` memberi rasio 1,18–1,88× (median VmHWM). Lihat §D.4.26.]** Stress test H-RES-05 diperbarui: fixture batas 1.000.000 byte + varian non-ASCII (fixture H-RES-02 A/B/C), acceptance = high-water RSS ≤ ambang operasional yang ditetapkan SEBELUM tes. |
| 3 | §D.4.25 (baru) + matriks §2 F-028 + `DEPLOYMENT_MANIFEST_TEMPLATE.md` (baru) | **F-028 — LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan):** klaim v2.3.13 "live sudah v15, d85a1e2 disetujui Rama 2026-11-08 ~02:09 WIB" TIDAK memiliki deployment manifest, artifact digest, release/workflow ID, atau approval artifact yang dapat diaudit — klaim itu dicatat NOT VERIFIED, bukan dianggap salah atau benar. Tidak ada tebakan versi live, tidak ada perubahan live. Template/skema deployment manifest non-secret dipublikasikan sebagai dokumen desain (`DEPLOYMENT_MANIFEST_TEMPLATE.md`: environment, artifact version/digest, source commit, timestamp, operator, release/workflow ID, diff, rollback target + verifikasi rollback, rujukan approval, verifikasi pasca-deploy) — manifest itu sendiri tetap KOSONG (`NOT PROVIDED` di semua field) sampai operator menyediakannya. |
| 4 | §D.4.25 (baru) + matriks §2 F-009/U-62/U-66 + `evidence/f009-bun1310-install-typecheck/` (baru) | **F-009 / U-62 / U-66 — bukti Bun 1.3.10 (kanonik) dari salinan scratch `/tmp/scratch-site-1310`:** (a) dekompresi transparan `Response.body` TERKONFIRMASI pada 1.3.10 — skrip F-024 v2.3.13 dijalankan ulang tanpa perubahan (gzip 551 byte wire → 500.000 byte decoded; br 51 → 500.000; marker offset 400.000) — bagian VM dari U-62 kini terjawab; staging + `deflate`/`zstd` tetap NOT VERIFIED. (b) **TEMUAN BARU U-66: frozen install pada 1.3.10 GAGAL** — `bun.lock` ter-commit memakai `"lockfileVersion": 2` yang tidak dikenali Bun 1.3.10 (`Unknown lockfile version`); install non-frozen berhasil (79 paket) tetapi menulis ulang lockfile ke v1 di scratch; typecheck exit 0 hanya berlaku terhadap lockfile hasil regenerasi itu. Kanonik 1.3.10 dan lockfile ter-commit tidak kompatibel — F-009 tetap NOT REPRODUCIBLE untuk clean external builder. Keputusan G-G kini punya bukti konkret: adopsi Bun lebih baru sebagai kanonik vs regenerasi lockfile di bawah 1.3.10 (keduanya butuh keputusan owner + otorisasi tahap b). Absolute local SDK path (`file:/opt/hatch/...`) tetap blocker clean-builder terpisah; rencana desain penggantian jalur dirumuskan di §D.4.25 (registry/paket ter-publish atau artefak SDK berversi + digest). |
| 5 | §D.4.25 (baru) + matriks §2 F-019 | **F-019 — tetap BLOCKED / NOT VERIFIED:** hanya bukti read-only; `checkLink` TIDAK di-invoke, tidak ada public share, tidak ada perubahan runtime state. Kontrol (a)–(e) tetap belum satu pun terpenuhi. |
| 6 | §D.4.25 (baru) + matriks §2 F-001..F-005 | **F-001..F-005 — tetap blocker implementasi:** requirement implementasi ditulis ulang sebagai desain + test ID + regression mapping yang dibutuhkan (validasi URL tiap hop redirect + script URL, DNS/IP policy, connection pinning, streamed byte limit L1+L2 dengan semantik baru F-026/F-027, total deadline, atomic DB uniqueness, authorization) — tanpa menyentuh source. Handoff V7 BUKAN izin mengubah source. |
| 7 | §D.4.25 (baru) + matriks §2 (staging owners) | **Staging owners/prereqs — tetap UNASSIGNED:** peran yang dibutuhkan didaftarkan eksplisit (staging operator, platform/runtime provider, egress owner, DB/runtime owner, alert channel + operator penerima, rollback owner); STAGE-P01..P12 tetap BLOCKED sampai bukti masing-masing tersedia; ST-12 tidak PASS tanpa pengiriman alert nyata kepada operator. |
| 8 | §D.4.25 (baru) + matriks §2 (provenance) | **Provenance suite lama dipertahankan:** klaim bundle asli 9/9×4 TIDAK diubah (bundle asli 1 log lengkap + duplikat + tail; suplemen RUN=1..4); log gagal SU-T5 TIDAK direkonstruksi; bukti VM dipisah ketat dari staging (semua paket bukti baru dilabeli VM). |
| 9 | §D.4.25 (baru) + matriks §2 (carry-forward) + §H G6 | **Carry-forward + risk register + gate:** F-018, F-006b/F-006c, U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa perubahan status (hanya bukti/keputusan owner yang dapat dilacak yang boleh mengubahnya); tidak ada detail narasi insiden atau data wallet di dokumen mana pun. Risiko baru **U-63** (F-026 — transient chunk tidak dibatasi pre-append accounting), **U-64** (F-027 — L2 bukan batas peak memory), **U-65** (F-028 — provenance deployment live tidak dapat diaudit), **U-66** (lockfile v2 tidak dapat dibaca Bun kanonik 1.3.10); **U-62 DIPERSEMPIT** (dekompresi VM pada 1.3.10 terkonfirmasi gzip/br; staging + deflate/zstd tetap NOT VERIFIED). Gate baru **G-I** (stress test memori H-RES-03/05 pada staging Bun 1.3.10 + proses deployment manifest); G-A..G-H dipertahankan. |

## Perubahan di revisi v2.3.13 (8 November 2026)

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.24 (baru) + matriks §2 F-023 | **F-023 — arah fixture H-RES-02 yang mustahil DIHAPUS, fixture feasible dipublikasikan + diverifikasi:** H-RES-02 v2.3.12 meminta konten "setelah 300.000 UTF-16 code unit tetapi sebelum 300.000 raw byte" — mustahil, karena byte UTF-8 ≥ code unit UTF-16 untuk setiap skalar valid. Tiga fixture feasible dipublikasikan di `evidence/f023-h-res02-fixtures/` (A: 150.001 × U+00E9, 300.018 byte / 150.017 CU; B: 75.001 × U+1F600 supplementary plane, 300.020 byte / 150.018 CU; C: 100.001 × U+20AC, 300.019 byte / 100.017 CU; marker `XSS-MARKER-RES02` tepat pada offset byte 300.000 di ketiganya). Hitungan diverifikasi dua alat independen (Python 3.12.3 + Node.js v24.22.1, cocok persis; `wc -c` mengonfirmasi) dan SHA-256 tiap fixture dicatat. Implementasi byte-cap yang benar mengecualikan marker; implementasi `string.length` memuat seluruh fixture → FAIL. Harness staging belum dijalankan. |
| 2 | §D.4.24 (baru) + matriks §2 F-024 | **F-024 — tiga lapisan byte H-RES-03 didefinisikan terpisah:** L0 wire/encoded — TIDAK dapat diobservasi via `Response.body` di Bun, tidak ada wire-byte cap yang diklaim di lapisan aplikasi (pengganti: egress limit infrastruktur, saat ini UNASSIGNED); L1 decoded-body per-request — ditegakkan (halaman 400.000, tiap script 300.000 decoded byte, pre-append accounting, overhead 0); L2 aggregate per-scan — ditegakkan (lihat butir 3). Tidak ada lapisan dekompresi yang dikontrol aplikasi. `Content-Length` DILARANG sebagai oracle. Perilaku Bun dibuktikan eksperimen VM lokal (`evidence/f024-h-res03-bun-fetch/`, Bun 1.4.4, server + klien di 127.0.0.1): gzip 551 byte wire → 500.000 byte `Response.body`; br 51 byte wire → 500.000 byte; chunk pertama hingga 393.110 byte (kontrol plain) — karena itu cap HARUS pre-append. Perilaku pada Bun kanonik 1.3.10 NOT VERIFIED (risiko U-62). |
| 3 | §D.4.24 (baru) + matriks §2 F-025 | **F-025 — angka aggregate H-RES-05 ditetapkan:** aggregate decoded-body budget per scan **1.000.000 byte** (di bawah jumlah cap individual 1.300.000; = halaman 400.000 + 2 script 300.000 pada batas inklusif; halaman + 3 script pada cap penuh = 1.300.000 → WAJIB abort); max 3 script; overhead 0 byte ter-buffer di luar aggregate; body redirect di-cancel tanpa dibaca (kontribusi 0 byte); cakupan L2 = halaman + script saja (RDAP di luar cakupan); akuntansi concurrency-safe — check-and-reserve sinkron atomik, satu AbortController bersama, cancel semua reader, buang parsial, fail-closed tanpa partial trusted verdict. Tes: halaman 400.000 + 3×300.000 bersamaan → abort; kontrol batas 400.000 + 2×300.000 = tepat 1.000.000 → PASS. Tes staging belum dijalankan. |
| 4 | §D.4.24 (baru) + matriks §2 G-F | **Klarifikasi semantik kepemilikan G-F:** cabang pilihan (hapus cache dari semua jalur security-scan) adalah **rekomendasi desain yang menunggu penerimaan owner, BUKAN otorisasi implementasi**; F-017 + H-CACHE-05/06 menjadi NOT APPLICABLE HANYA SETELAH cabang itu diimplementasikan — sebelum itu F-017 tetap partially addressed dan H-CACHE-05/06 tetap oracle yang berlaku pada cabang alternatif. Tidak ada source yang berubah sampai keputusan owner + otorisasi tahap (b) terpisah. |
| 5 | §D.4.24 (baru) + matriks §2 (koreksi) | **Koreksi catatan "live untouched" v2.3.12 — BASI:** berdasarkan catatan repo (bukan verifikasi baru revisi ini), situs live sudah **v15** — commit repo `d85a1e2` (perbaikan performa S1–S9 server + C1–C7 client) SUDAH diterapkan ke live dan **disetujui Rama 2026-11-08 ~02:09 WIB**. Revisi v2.3.13 tidak melakukan verifikasi live baru dan tidak mengubah live; d85a1e2 TIDAK di-revert. |
| 6 | §D.4.24 (baru) + matriks §2 F-020 | **F-020 — HOLD dipertahankan:** v2.3.13 TIDAK mengubah satu pun file source aplikasi; tidak ada artefak approval terpisah di repo. |
| 7 | §D.4.24 (baru) + matriks §5 + §H G6 | **Risk register + gate:** risiko baru U-59 (F-023), U-60 (F-024), U-61 (F-025), U-62 (bukti VM H-RES-03 memakai Bun 1.4.4, bukan kanonik 1.3.10 — perilaku pada 1.3.10 NOT VERIFIED); U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa perubahan status. Gate baru **G-H** (eksekusi harness H-RES-02/03/05 yang sudah dikoreksi — prasyarat: otorisasi tahap (b) + staging tersedia + verifikasi ulang Bun kanonik); G-A..G-G dipertahankan. |

## Perubahan di revisi v2.3.12 (8 November 2026)

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §D.4.23 (baru) + matriks §2 F-021 | **F-021 — paket bukti artifact-state yang dapat diaudit:** `artifact.list_actions` + `artifact.status` slug `cek-link-airdrop` dipanggil ulang read-only 2026-11-08 03:47 WIB dan responsnya dipublikasikan apa adanya di `evidence/f021-artifact-state-20261108/` (`list_actions.json` SHA-256 `dbe989b5…`, `status.json` SHA-256 `3b343a27…`) beserta `README.md` metadata capture. Hasil konsisten dengan v2.3.11: `checklink` MASIH TERDAFTAR; tidak ada build berjalan; `share.shared=false`, `share.url=null`. Tool/API version, request/response IDs, dan artifact version/digest TIDAK terekspos tool — dicatat NOT PROVIDED (tidak ditebak). Deskripsi `addproject`/`askgibran` terpotong persis seperti dikembalikan tool — dicatat sebagai artefak respons, tidak direkonstruksi. `checkLink` TIDAK di-invoke; tidak ada perubahan runtime state; tidak ada public share yang dibuat. |
| 2 | §D.4.23 (baru) + matriks §2 F-022 | **F-022 — cabang implementasi cache DINYATAKAN eksplisit:** cabang pilihan = HAPUS cache fetch dari SEMUA jalur security-scan (halaman + script); konsekuensinya F-017 + H-CACHE-05/06 menjadi **NOT APPLICABLE untuk jalur security-scan** pada cabang ini, sementara F-002 streamed byte cap tetap berlaku terpisah dan H-CACHE-01..04 tetap berlaku. Cabang alternatif (cache dipertahankan) didokumentasikan lengkap dengan 6 syarat sekaligus (enumerasi caller, key `url + cap + policy-version`, kegagalan tidak pernah di-cache, freshness terlihat, re-check wajib fresh, H-CACHE-01..06 semua berlaku) — bukan rekomendasi, hanya opsi lengkap untuk keputusan owner. |
| 3 | §D.4.23 (baru) + matriks §2 F-022 + §H G6 | **Koreksi oracle tes H-CACHE/H-RES:** cap didefinisikan sebagai **raw bytes pada lapisan response stream** (sebelum decoding, sebelum dekompresi selesai dibaca); `res.text().slice()` dinyatakan **BUKAN bukti byte cap**. H-RES-02 (multibyte UTF-8 — oracle membedakan byte vs UTF-16 code unit), H-RES-03 (compressed/decompressed limit), H-RES-04 (redirect chains), H-RES-05 (aggregate per-scan limit) ditambahkan; H-RES-06 adalah total-deadline (penomoran ulang dari H-RES-04..06 v2.3.11, isi tidak berubah). H-CACHE-05/06 dicatat NOT APPLICABLE pada cabang pilihan. |
| 4 | §D.4.23 (baru) + matriks §2 F-018 | **F-018 — kutipan `.d.ts` minimal dipublikasikan:** tarball SDK 0.14.0 dibaca ulang read-only (SHA-256 `f2cb7b25…` — SAMA dengan v2.3.11) dan kutipan verbatim `PortableCtx`/`Viewer`/`LocalViewer`/`CloudflareViewer` dari `server-contract.d.ts` kini ada di matriks v2.3.12 §2 F-018. Dicatat jujur: `db` adalah accessor per-invocation — kata itu TIDAK menyatakan scope data; grep tenancy pada `.d.ts` + README SDK nol; **tidak ada kesimpulan dari nama tipe saja**. Principal key stabil per varian didefinisikan (local: `ownerUserId`/`userId` + `spaceSlug`; cloudflare: `shareId` + `tokenId`); `viewer` hilang ditangani fail-closed. Pernyataan resmi provider tetap BELUM ADA; tenancy tetap NOT VERIFIED. |
| 5 | §D.4.23 (baru) + matriks §2 F-020 | **F-020 — HOLD dipertahankan:** v2.3.12 TIDAK mengubah satu pun file source aplikasi; d85a1e2 TIDAK di-revert; tidak ada artefak approval terpisah di repo. |
| 6 | §D.4.23 (baru) + matriks §2 F-009/F-014 | **Keputusan Bun (F-009/F-014):** versi kanonik untuk build bersih kelak adalah **1.3.10 (yang dideklarasikan di `packageManager`)**; bukti VM 1.4.4 dicatat sebagai bukti dengan versi BERBEDA dan tidak boleh dikutip sebagai bukti build 1.3.10. Bila owner memilih 1.4.4, deklarasi harus diubah eksplisit (perubahan source — masuk HOLD F-020). Jalur retrievable SDK source/provenance dicatat BELUM ADA (tarball builder-local saja). Status keseluruhan tetap NOT REPRODUCIBLE untuk clean external builder. |
| 7 | §D.4.23 (baru) + matriks §2 F-006b/c | **F-006b/c:** lokasi F-006b diverifikasi ulang pada mirror `d85a1e2` — nomor baris bergeser vs v2.3.11: `KNOWN_BAD_DOMAINS` baris **52** (dulu 51), `GIBRAN_SITE_KNOWLEDGE` baris **1245** (dulu ~1089), plus string detail user-facing baris **483** (baru dicatat); disebutkan hanya sebagai pengenal lokasi TANPA mengutip narasi. Bukti versi/diff live F-006c didefinisikan (a)–(c) tetapi tetap belum tersedia; status tetap "reported by Muse, not independently verified". |
| 8 | §D.4.23 (baru) + matriks §5 + §H G6 | **Risk register + ST-12:** risiko baru U-55 (cabang cache), U-56 (oracle cap), U-57 (bukti artifact-state), U-58 (kutipan `.d.ts`); U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa perubahan status. Kriteria latensi alert **ST-12-LAT-01..03** ditambahkan (alert ≤ 5 menit, wajib memuat timestamp + lock path + identitas proses, tanpa kanal = NOT RUN bukan PASS). |
| 9 | §D.4.23 (baru) + §H G6 | **Gate konkret berikutnya diperluas:** gate baru **G-F** (keputusan cache F-022: cabang pilihan vs alternatif) dan **G-G** (keputusan Bun F-009: kanonik 1.3.10 vs 1.4.4); G-A..G-E dipertahankan. Sampai gate terpenuhi, tidak ada pekerjaan tahap (b). |

## Perubahan di revisi v2.3.11 (8 November 2026)

Revisi respons atas audit independen V4 ChatGPT
(`SSRF_INDEPENDENT_AUDIT_V4.md`, commit `ce21b39`, 2026-11-08 ~02:45 WIB
— F-016..F-020 + Handoff §9 8 butir). Tidak ada keputusan D-1 s.d. D-8
yang diubah. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED**. Tidak ada kode aplikasi yang diubah,
tidak ada perubahan database/katalog, tidak ada production build, Link
Scanner tetap nonaktif, public tester tetap ON HOLD (Rama, 2026-11-08
00:28 WIB). F-001..F-005 TETAP blocked. Dokumen respons lengkap:
`SSRF_RESPONSE_MATRIX_V2311.md` (file baru; matriks v2.3.10
`SSRF_RESPONSE_MATRIX_V2310.md` dipertahankan utuh sebagai catatan
sejarah).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §D.4.22 (baru) + matriks §2 F-016 | **F-016 — keputusan freshness cache:** rekomendasi DESAIN adalah **hapus cache fetch untuk jalur security scan** (alasan teknis: vonis keamanan harus mencerminkan konten saat scan; jendela basi 10 menit adalah jendela false-negative untuk halaman yang dikontrol penyerang; cache kegagalan sebagai `null` mengunci hasil "tidak terjangkau" selama TTL; janji `site/DATA-PLAN.md` baris 26 — re-check dari history menjalankan fresh scan — sudah berkomitmen ke fresh). Alternatif bila owner tetap menginginkan cache: hanya sukses yang di-cache (kegagalan TIDAK PERNAH), TTL eksplisit + `fetchedAt`/`cacheHit`/umur ditampilkan, re-check dari history WAJIB melewati cache (jalur fresh), dan ada jalur "force fresh". Cache RDAP (sukses saja, 1 jam) dipertahankan dengan catatan freshness yang sama — RDAP tidak memengaruhi sinyal konten. Spesifikasi regresi H-CACHE-01..04 (benign→malicious dalam TTL, failure→recovery, tanpa penguncian null, tampilan freshness + bypass re-check). |
| 2 | §D.4.22 (baru) + matriks §2 F-017 | **F-017 — cache key memperhitungkan cap:** keputusan DESAIN — key cache WAJIB menyertakan cap (`url + "|" + cap`); alternatif "simpan representasi mentah lalu potong per caller" DITOLAK sebagai utama karena menyimpan mentah tanpa batas bertentangan dengan streamed cap F-002. Fakta kode diverifikasi: halaman `fetchText(..., 400_000)` (baris 396), script `fetchText(..., 300_000)` (baris 524); `fetchTextOnce` memotong SETELAH `res.text()` lalu hasilnya yang terpotong itulah yang di-cache. Spesifikasi regresi H-CACHE-05/06 (urutan 300 KB → 400 KB dan 400 KB → 300 KB). Ini TIDAK menggantikan streaming byte limit F-002. |
| 3 | §D.4.22 (baru) + matriks §2 F-018 | **F-018 — bukti tenancy SDK (read-only):** tarball SDK `@hatch/space-sdk` 0.14.0 diperiksa read-only (ekstrak ke `/tmp`, bukan repo; SHA-256 `f2cb7b25…`): `server-contract.d.ts` mendefinisikan `PortableCtx.db: SpaceDbAccessor` (accessor per-invocation) + `viewer?: Viewer` opsional (`LocalViewer`: `authenticated`, `spaceSlug`, `userId`, `ownerUserId`, `isOwner`, `delegate`; `CloudflareViewer`: `shareId`, `spaceId`, `isOwner`, `tokenId`, `tokenExpiresAt`) — tetapi TIDAK ADA pernyataan apakah DB di balik accessor itu per-user atau per-artifact/shared; README SDK tidak memuat dokumentasi database/tenancy sama sekali. Fakta skema diverifikasi: `checks` tanpa kolom owner/principal; `savedProjects` PK `projectId` tanpa identitas pengguna; `listChecks`/`deleteCheck`/`askGibran` tanpa filter kepemilikan; `actions.ts` TIDAK PERNAH merujuk `ctx.viewer` (grep: nol). Desain ownership/partitioning bila DB shared (kolom `ownerUserId`, filter tiap baca, hapus/ubah wajib cocok pemilik, Gibran hanya dari riwayat pemanggil) + spesifikasi tes dua principal H-TEN-01..05 (staging). Semantik tenancy runtime tetap **NOT VERIFIED** — exploitability TIDAK diklaim. |
| 4 | §D.4.22 (baru) + matriks §2 F-019 | **F-019 — bukti runtime scanner (read-only, 2026-11-08 ~02:47–02:50 WIB):** `artifact.list_actions` slug `cek-link-airdrop` — action `checklink` **MASIH TERDAFTAR** sebagai published action dengan deskripsi live-check link; `artifact.status` — tidak ada build berjalan, `share.shared=false`, `share.url=null`. TIDAK ADA versi/digest artifact yang terekspos oleh tool read-only; TIDAK ADA feature flag/guard di mirror source (`actions.ts` mengekspor `checkLink`; `App.tsx` menghubungkan checker ke `checkMut.mutate`); kontradiksi README ("Link Scanner fitur live") vs dokumen desain ("harus nonaktif") TIDAK terselesaikan oleh bukti runtime. Status: **NOT VERIFIED / BLOCKED**. `checkLink` TIDAK di-invoke (tes produksi dilarang). Kontrol runtime yang dibutuhkan didaftar eksplisit (§D.4.22); deployment tetap BLOCKED. |
| 5 | §D.4.22 (baru) + matriks §2 F-020 | **F-020 — klarifikasi scope commit d85a1e2:** diverifikasi via `git show d85a1e2 --stat` — tepat 3 file berubah (`docs/AUDIT_FIX_LIST_V1.md`, `site/client/src/App.tsx`, `site/server/src/actions.ts`); commit message + fix-list menyatakan repo-only, live untouched, F-001..F-005 dan F-010..F-015 tetap terbuka. Dasar otorisasi yang tercatat: arahan Rama 2026-11-08 ~02:11 WIB ("Tetap kolab dengan gpt, dan tetap tingkatkan kualitas web") — mendahului commit (~02:17 WIB) — + konsolidasi 10 audit performa (APInex, model gratis, biaya 0). Dicatat jujur: **tidak ada artefak approval owner terpisah di repo** untuk perubahan source aplikasi; pernyataan v2.3.10 "Tidak ada kode aplikasi yang diubah" benar pada commit `12391e4` tetapi menjadi basi setelah `d85a1e2`; bukti "live untouched" bersandar pada sisi repo (git + tidak ada `artifact.edit` dalam commit itu) — versi/digest live NOT VERIFIED (celah yang sama dengan F-019). **HOLD: tidak ada perubahan source aplikasi lanjutan sampai owner mengklarifikasi scope**; tidak ada revert (sesuai instruksi V4). |
| 6 | §D.4.22 (baru) + matriks §2 F-001..F-005 | **Rencana remediasi F-001..F-005 dipertahankan + dipetakan ulang:** tiap kontrol dipetakan ke H-SSRF-01..20 / H-RES-01..06 / H-CAT-01..03 / H-AUTH-01..03 + test ID + kriteria PASS/FAIL + lingkungan (staging) + destinasi bukti. Keterkaitan baru yang dicatat: perbaikan cache F-016/F-017 berada di jalur kode yang sama dengan guard F-001 (`fetchText`) sehingga wajib dikirim bersama implementasi guard; unique constraint F-004 dan kolom ownership F-018 adalah pekerjaan migrasi yang sama dan wajib didesain sebagai satu migrasi, bukan dua yang bertentangan; `ctx.viewer` SDK (temuan F-018) adalah kandidat sumber identitas untuk mekanisme otorisasi F-005 (keputusan mekanisme tetap di tangan owner). F-003 kini **PARTIALLY MITIGATED** di kode mirror (deadline total 30 detik di `analyze()`, commit d85a1e2) — tetapi tanpa tes regresi, status penutupan TIDAK berubah: tetap OPEN sampai H-RES-04..06 PASS di staging. |
| 7 | §D.4.22 (baru) + matriks §2 F-009/F-014, F-013 | **Reproducibility + ownership staging — tidak ada fakta baru:** SDK provenance tetap NOT VERIFIED (tarball builder-local, mtime 1 Jan 1980; inspeksi `.d.ts` v2.3.11 membuktikan permukaan API SDK, BUKAN provenance); Bun 1.4.4 vs deklarasi 1.3.10; build penuh TIDAK dicoba; tidak ada CI. Staging operator, kanal alert, egress policy, staging DB+runtime tetap **UNASSIGNED/BLOCKED**; ST-01..ST-16 dan STAGE-P01..P12 tetap BLOCKED. |
| 8 | §D.4.22 (baru) + matriks §2 F-006b/c + §G (U-50..U-54) | **F-006b/c + risiko baru:** F-006b tetap OPEN/blocked (proposal cleanup matriks v2.3.10 §4 tetap berlaku; d85a1e2 sengaja tidak menyentuh string narasi — commit message mencatatnya). F-006c tetap "reported by Muse, not independently verified" — `artifact.inspect` TIDAK dipakai untuk verifikasi ini karena inspect adalah delegasi diagnosis atas laporan malfungsi pengguna, bukan pembaca state read-only; tool read-only yang tersedia tidak mengekspos versi/digest atau isi file live DATA-PLAN. Risiko baru U-50 (F-016), U-51 (F-017), U-52 (F-018), U-53 (F-019), U-54 (F-020). **U-46 tetap OPEN** dengan scope sempit v2.3.10; pekerjaan cache/tenancy tidak bergantung pada U-46 (tidak ada jalur signaling). |
| 9 | §D.4.22 (baru) + §H G6 | **Gate konkret berikutnya diidentifikasi:** (G-A) keputusan owner atas scope perubahan source (F-020); (G-B) bukti runtime F-019 (versi/digest + kontrol disabled yang dapat diverifikasi); (G-C) keputusan tenancy F-018 (per-user vs shared + desain ownership); (G-D) keputusan U-46; (G-E) staging tersedia + peran UNASSIGNED terisi. Sampai G-A..G-E terpenuhi, tidak ada pekerjaan tahap (b). Gerbang G6 diperluas dengan H-CACHE-01..06 + H-TEN-01..05. |

## Perubahan di revisi v2.3.9 (8 November 2026)

Revisi penyempitan celah bukti tanpa otorisasi implementasi, atas perintah
pemilik proyek ("kerjakan dengan benar jobdeskmu dan persempit celah dulu";
public tester DITAHAN — proposal sudah di-push di commit `e1dcad8`, tidak
ada tindak lanjut deployment). Tidak ada keputusan D-1 s.d. D-8 yang
diubah. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION
NOT APPROVED**. F-001..F-005 TETAP blocked. Dokumen respons lengkap:
`SSRF_RESPONSE_MATRIX_V238.md` (diperbarui ke v2.3.9).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §D.4.20 (baru) + matriks §1/§2 | **F-007 — bundle bukti suplemen** `evidence/v236-supplement-20261108/` + `MANIFEST.md`: SU-T1..SU-T9 4 run lengkap 9/9 (supp-1..4, 2026-11-07T17:29:40Z–17:30:06Z, exit 0) + OPS-T7 run ketiga PASS (supp-3, 17:30:15Z, exit 0). `su-supp-run1.txt` byte-identik dengan `evidence/v236/su-run1.txt`. File `evidence/v236/` TIDAK diubah; klaim v2.3.6 tetap bersandar pada bukti lama. Justifikasi re-run: log run ke-4 lama hanya ekor dan log run ketiga OPS-T7 tidak ada — celah bukti nyata (pengecualian yang sudah dicatat matriks v2.3.8). Run gagal awal SU-T5 tetap NOT PRESERVED. |
| 2 | §D.4.20 (baru) + matriks F-005 | **F-005 — verifikasi dari kode (read-only):** tidak ada mekanisme auth di `site/server/src/actions.ts` (grep auth/token/session/ADMIN: nol); tidak ada pemanggil `addProject` di `client/src/` maupun file server lain — hanya `actions.ts` (internal baris 959 + `defineAction` baris 1321–1342); deskripsi action menyebut pemanggil yang dimaksud "scheduled auto-discovery job"; provenance (`verified_at`/`verified_note`, baris 1062–1063) disimpan verbatim dari argumen caller; schema (`schema.ts` baris 48–49) tidak punya kolom provenance. Scoping endpoint runtime artifact tetap NOT VERIFIED. Desain otorisasi tidak berubah; keputusan mekanisme tetap butuh pemilik + fakta runtime. |
| 3 | §D.4.20 (baru) + matriks F-009 | **F-009 — verifikasi reproduksibilitas:** SDK tarball TERBUKTI ADA (`@hatch/space-sdk` 0.14.0, 2.051.070 byte, SHA-256 `f2cb7b25…`) — provenance tetap NOT VERIFIED; `bun install --frozen-lockfile` di salinan scratch `/tmp/scratch-site` exit 0 (79 paket, `bun.lock` tidak berubah, hash `a7e1457e…`); typecheck client+server exit 0 (Bun 1.4.4, TS 5.6.3). Build penuh TIDAK dicoba (house rules); konsistensi di bawah Bun 1.3.10 yang dideklarasikan tetap NOT VERIFIED; tidak ada CI. |
| 4 | Matriks F-006 | **F-006 residual (presisi v2.3.9):** narasi insiden di string kode mirror terdapat di `site/server/src/actions.ts` baris 1089 (`GIBRAN_SITE_KNOWLEDGE`) dan komentar baris 51 (`KNOWN_BAD_DOMAINS`) — keduanya copy/kode live; perbaikannya follow-up tahap (b). Status F-006 tetap ADDRESSED (redaksi `site/DATA-PLAN.md`). |
| 5 | Pernyataan penutup | Paragraf v2.3.9 ditambahkan. Estimasi TETAP ~8–14 hari kerja. G0 tetap wajib dibuktikan aktif; dokumen final BUKAN persetujuan implementasi; perubahan mirror GitHub TIDAK berarti situs live berubah. Public tester DITAHAN oleh pemilik — tidak ada pekerjaan tester di v2.3.9. |

## Perubahan di revisi v2.3.10 (8 November 2026)

Revisi respons atas audit independen V3 ChatGPT
(`SSRF_INDEPENDENT_AUDIT_V3.md`, commit `b42b02a`, 2026-11-08 01:21 WIB
— F-010..F-015 + Handoff §8 7 butir). Tidak ada keputusan D-1 s.d. D-8
yang diubah. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED**. Tidak ada kode aplikasi yang diubah,
tidak ada perubahan database/katalog, tidak ada production build, Link
Scanner tetap nonaktif, public tester tetap ON HOLD (Rama, 2026-11-08
00:28 WIB). F-001..F-005 TETAP blocked. Dokumen respons lengkap:
`SSRF_RESPONSE_MATRIX_V2310.md` (file baru; matriks v2.3.9
`SSRF_RESPONSE_MATRIX_V238.md` dipertahankan utuh sebagai catatan
sejarah).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §D.4.21 (baru) + matriks §2 F-010 + `evidence/v236/MANIFEST.md` + `scripts/verify-evidence-manifest.mjs` | **F-010 — koreksi akuntansi bukti:** diverifikasi sendiri dengan `sha256sum` bahwa su-run1/2/3 byte-identik berheader RUN=1 dan su-run4 hanya ekor 2 baris; manifest terkoreksi (su-run2/3 = DUPLIKAT / NOT PRESERVED sebagai log independen; su-run4 = SEBAGIAN; file TIDAK dihapus — alasannya tercatat); klaim v2.3.6 asli dipisahkan dari 4 run suplemen v2.3.9; checker manifest baru + output run-nya di-commit (`evidence/v236/VERIFY-20261108.txt` exit 1 — 11 failure yang diharapkan untuk bundle asli; `evidence/v236-supplement-20261108/VERIFY-20261108.txt` exit 0). Temuan sejenis baru: ops-run1/2 juga byte-identik tanpa diskriminator run (NOT-INDEPENDENT). |
| 2 | §D.4.21 (baru) + matriks §2 F-011 + proposal tester | **F-011 — koreksi matriks fitur tester:** proposal `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md` §2.4/§3.5 terkoreksi (shape statis = visual preview, bukan functional tester; catalog/Gibran/`listChecks` → Disabled); §2.5 baru berisi client/API request map ketujuh action + spesifikasi no-backend smoke test; fixture/API terpisah TIDAK diimplementasikan. |
| 3 | §D.4.21 (baru) + matriks §2.6/§4 | **F-006 dipecah (F-012):** F-006a mirror redacted — addressed; F-006b narasi di string kode (`actions.ts:51`, `GIBRAN_SITE_KNOWLEDGE` ~1089) — OPEN/blocked, butuh edit source live tahap (b) + otorisasi owner; F-006c redaksi live SUDAH dilakukan 2026-11-08 ~00:59 WIB — dicatat "reported by Muse, not independently verified". Proposal privacy cleanup (§4 matriks) dengan path/baris eksak + approved artifact workflow, tanpa mengutip nilai sensitif. |
| 4 | §D.4.19a (baru) | **F-013 — kepemilikan staging lengkap:** tiap gate ST-01..ST-16 kini punya accountable owner/peran (Rama / Muse / ChatGPT), next action, prasyarat, prosedur, kriteria PASS/FAIL, destinasi bukti. Staging operator, kanal alert, egress policy, staging DB+runtime ditulis **UNASSIGNED/BLOCKED** secara eksplisit; tidak ada gate READY. |
| 5 | §D.4.21 (baru) + matriks §2 F-014 + `evidence/v239-repro/` | **F-009/F-014 — rekonsiliasi reproduksibilitas:** run repro baru dijalankan sendiri di scratch copy (bukan repo, bukan live) — `bun install --frozen-lockfile` exit 0 (79 paket, `bun.lock` tidak berubah) + typecheck client+server exit 0 (Bun 1.4.4, TS 5.6.3, 2026-11-07T18:49:04Z); output mentah di-commit (`evidence/v239-repro/repro-run1.txt` + `MANIFEST.md`); `SSRF_REPRODUCIBILITY_V238.md` direkonsiliasi. Tetap NOT VERIFIED: provenance SDK, Bun 1.3.10, build penuh, CI. Status: **NOT REPRODUCIBLE untuk clean external builder**. |
| 6 | §D.4.21 (baru) + matriks §2 F-015/§3 + `site/DATA-PLAN.md` | **F-015 + pemetaan U-46:** mirror `site/DATA-PLAN.md` terkoreksi (perilaku aktual fetch script tanpa same-origin; same-origin = kontrol masa depan yang belum diimplementasikan); teks koreksi live artifact disiapkan (`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md`, belum diterapkan — butuh approved artifact workflow). **U-46 dipetakan presisi:** hanya memblokir worker-signaling fallback path (§A.5.5.2a / STAGE-P07) — BUKAN blanket dependency untuk F-001..F-005 atau tester. |
| 7 | §D.4.21 (baru) + matriks §6 | **Hard gates ditegaskan kembali:** no Link Scanner activation, no public deployment, no production build, no DB/catalog change, no source implementation tanpa owner approval terpisah. F-001..F-005 tetap OPEN/BLOCKED. |

## Perubahan di revisi v2.3.8 (8 November 2026)

Revisi respons atas DUA audit independen ChatGPT terhadap kode sumber
(`SSRF_CODE_SECURITY_AUDIT_V1.md`, commit `52724d6`, 2026-11-07 23:52
WIB — F-001..F-006; `SSRF_INDEPENDENT_AUDIT_V2.md`, commit `789797e`,
2026-11-07 23:56 WIB — F-007..F-009, ST-01..ST-16, B-01..B-12). V1 dan
V2 hanya berselang 4 menit; observasi V2 bahwa "belum ada respons Muse"
benar secara repo pada saat itu — v2.3.8 inilah responsnya. Tidak ada
keputusan D-1 s.d. D-8 yang diubah. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Tidak ada pengujian baru
yang dijalankan untuk v2.3.8 (tidak ada file bukti eksperimen baru);
yang baru adalah publikasi bukti lama, koreksi penjelasan, dan desain
remediasi + harness. Dokumen respons lengkap:
`SSRF_RESPONSE_MATRIX_V238.md`.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §D.4.17 (baru) + §G + §H | Ringkasan matriks respons F-001..F-009: F-001..F-005 BLOCKED (desain selesai, implementasi menunggu otorisasi tahap b); F-006 ADDRESSED (mirror `site/DATA-PLAN.md` di-redact + rescan); F-007 PARTIALLY ADDRESSED (bundle `evidence/v236/` diterbitkan — 21 file byte-identik + manifest; caveat: `su-run4` hanya ekor, run gagal awal + run ketiga OPS-T7 tidak tersimpan); F-008 ADDRESSED (koreksi penjelasan SU-T5 — lihat butir 2); F-009 PARTIALLY ADDRESSED (`site/bun.lock` di-mirror + manifest reproduksibilitas; SDK provenance, test suite/CI, hasil build tetap NOT VERIFIED). |
| 2 | §D.4.16 + `SSRF_RECONCILIATION_V237.md` | Koreksi F-008 secara transparan (teks salah ditandai, bukan dihapus diam-diam): penjelasan SU-T5 v2.3.7 ("fd lock lalu `process.exit()` tanpa `flock.unlock()`") SALAH terhadap kode committed — yang benar: salinan harness v2.3.6 awalnya tidak menyertakan `lock-racer.cjs` (child mati module-not-found → `no-output`); `startup.cjs` memakai `openSync 'wx'`, `lock-racer.cjs` memanggil `fs.closeSync` — tidak ada flock di jalur SU-T5. Tambahan koreksi: sitasi `pidfd-node-run1..3.log` di rekonsiliasi tidak ada — nama benar `pidfd-t11-run1..3.log`. |
| 3 | §D.4.18 (baru) | Desain remediasi F-001..F-005 (bukan implementasi): spesifikasi perubahan kode eksak per temuan (file, fungsi, line range, perilaku) + spesifikasi harness deterministik H-SSRF-01..20 (redirect berantai, DNS rebinding, IPv4+IPv6, jawaban campuran, script-to-internal, bentuk IP non-kanonik, userinfo), H-RES-01..06, H-CAT-01..03, H-AUTH-01..03 — masing-masing dengan kriteria PASS/FAIL eksplisit + kriteria penerimaan per temuan. Persyaratan DG-1..DG-3 dirumuskan dengan kriteria tes (§G U-47..U-49). |
| 4 | §D.4.19 (baru) + §G (U-46) | Inventaris staging template tahap 3 (tanpa menjalankan tes): tiap gate ST-01..ST-16 mendapat owner, precondition, prosedur aman, aturan PASS/FAIL, destinasi bukti. U-46 didefinisikan LENGKAP (definisi, status, owner, fakta teknis, opsi (a)/(b) + trade-off, prasyarat, kriteria penerimaan) — TANPA diputuskan; keputusan tertulis tetap di tangan pemilik. |
| 5 | §H + pernyataan penutup | Pemisahan tiga tahap ditulis eksplisit (desain / implementasi / deployment); G7 mencatat re-evaluasi wajib membaca matriks respons + bundle bukti + manifest reproduksibilitas; G6 mencatat caveat bukti SU-T1..SU-T9. |
| 6 | Pernyataan penutup | Paragraf v2.3.8 ditambahkan. Estimasi TETAP ~8–14 hari kerja. G0 tetap wajib dibuktikan aktif; dokumen final BUKAN persetujuan implementasi; perubahan mirror GitHub TIDAK berarti situs live berubah. |

## Perubahan di revisi v2.3.7 (7 November 2026)

Revisi rekonsiliasi bukti atas EVALUASI ChatGPT terhadap v2.3.6
(`SSRF_EVALUATION_V235.md`, commit `39ea4ef`): evaluasi itu ditulis TANPA
mereferensikan bukti v2.3.6 — status SU-T1..SU-T9 NOT RUN dan eksperimen
pidfd NOT RUN sudah kedaluwarsa saat ditulis. v2.3.7 memetakan setiap gate
evaluasi ke bukti v2.3.6 yang SUDAH ADA (bukan mengulang pengujian) dan
mencatat hanya yang benar-benar belum terbukti. Tidak ada keputusan D-1
s.d. D-8 yang diubah. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED**. Tidak ada pengujian baru yang dijalankan;
bukti: `SSRF_RECONCILIATION_V237.md`.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §D.4.16 (baru) + §G + §H | Tambah rekonsiliasi ST-01..ST-12 (TERBUKTI VM 1 · SEBAGIAN 7 · BELUM 4), matriks SU-T1..SU-T9 (9/9 TERBUKTI VM — status NOT RUN evaluasi dikoreksi: 9 eksekusi penuh suite, semuanya 9/9 PASS), penomoran kanonik ST-01..ST-16 (STAGE-P01..P12 dipertahankan sebagai alias), dan pemetaan risiko evaluasi (U-38-A DIJAWAB, U-38-B/U-38-D/U-33-A/U-33-B/U-33-E SEBAGIAN, U-38-C/U-33-C/U-33-D/U-33-F tetap TERBUKA). |
| 2 | §G | Tambah risiko baru U-45 (latensi deteksi — dari evaluasi §8 butir 9) dan U-46 (divergensi fallback numeric-kill: evaluasi §2.2 melarang, v2.3.6 STAGE-P07 mengizinkan dengan persetujuan eksplisit owner — membutuhkan keputusan owner, tidak diputuskan v2.3.7). Tambah kesenjangan desain DG-1..DG-3 (mode file lock 0600, open `O_NOFOLLOW` + validasi `fstat`, penolakan symlink/non-regular — persyaratan evaluasi §3.2 yang TIDAK ADA di desain v2.3.6). |
| 3 | §H | G6 diperluas dengan rekonsiliasi v2.3.7 + penomoran kanonik ST-01..ST-16; G7 mencatat evaluasi atas v2.3.6 ditulis tanpa bukti v2.3.6 — re-evaluasi wajib membaca `SSRF_SPIKE_V236.md` dan `SSRF_RECONCILIATION_V237.md`. |
| 4 | Pernyataan penutup | Paragraf v2.3.7 ditambahkan. Estimasi TETAP ~8–14 hari kerja. G0 tetap wajib dibuktikan aktif; dokumen final BUKAN persetujuan implementasi. |

## Perubahan di revisi v2.3.6 (7 November 2026)

Revisi teknis terbatas atas TIGA KEBERATAN ChatGPT terhadap v2.3.5
("REQUEST V2.3.6: FINAL SECURITY REVIEW FOLLOW-UP"): PID reuse saat
SIGKILL (U-38), never-unlink dan kontrol operasional (U-33), dan matriks
prasyarat staging. Tidak ada keputusan D-1 s.d. D-8 yang diubah. Risiko
U-11, U-16 s.d. U-23, U-25 s.d. U-32, U-36, U-37, U-39, U-40 tetap
tercatat (U-24/U-29/U-33/U-34/U-35/U-38 diperbarui — lihat bawah);
ditambah risiko baru U-41 s.d. U-44. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti uji: `SSRF_SPIKE_V236.md`.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.5.2a (baru — pensinyalan terikat identitas via pidfd, U-38 DIJAWAB) | Urutan mengikat baru: validasi identitas → `pidfd_open` → re-validasi starttime → `pidfd_send_signal` → konfirmasi exit. Sinyal terikat struct pid kernel, bukan nomor PID — kill-salah-sasaran DITUTUP (bukan hanya dipersempit). Implementasi referensi `signalWorkerByPidfd` (Bun `bun:ffi`) + fallback terkuantifikasi (jendela ~46 µs, P ≈ 7e-9/cleanup pada pid_max default) bila pidfd tidak tersedia. Jendela residual yang tersisa: tabrakan starttime (U-41) dan kebutaan zombie pidfd (ditutup pemeriksaan `/proc` zombie-aware). Alternatif pinning lewat dirfd `/proc/<pid>` DITOLAK oleh eksperimen (PIDFD-T10). |
| 2 | §A.5.5.4g (baru — kontrol operasional never-unlink, U-33 DIJAWAB) | Katalog kontrol OS-enforced vs runbook-only dengan bukti per kontrol (OPS-T1..T6): direktori 0700 + user layanan dan isolasi antar-user DITEGAKKAN kernel; `chattr +i/+a` TIDAK tersedia di VM ini (bukan kontrol yang dapat diandalkan tanpa bukti staging); bind-mount ro menghentikan penghapusan tak sengaja tetapi bukan root yang sengaja; root melewati DAC (hanya audit + runbook); auditd/eBPF TIDAK ADA di VM ini (wajib staging). Prosedur deployment/rollback/maintenance yang mengikat + runbook pemulihan bila lock terhapus saat parent aktif (OPS-T7: dua pemilik terdeteksi dan diselesaikan tanpa cleanup ganda). |
| 3 | §D.4.14 (baru) + §D.4.15 (baru) + §H | Tambah uji pidfd/ops (PIDFD-01..PIDFD-08, OPS-01..OPS-03) dan matriks prasyarat staging STAGE-P01..P12 (masing-masing dengan kriteria PASS/FAIL eksplisit + konsekuensi FAIL: BLOCK atau fallback terbukti) ke gerbang G6; G7 menyebut evaluasi atas v2.3.6. §D.4.13 diperbarui: AUTH-16 (SU-T1..SU-T9) kini TERJAWAB di VM — 9/9 PASS × 4 run (diagnosis SU-T5 §0.1 `SSRF_SPIKE_V236.md`: bug setup harness, bukan regresi). |
| 4 | §G | U-38 dijawab v2.3.6 (pidfd, residual U-41); U-24 dijawab v2.3.6 (TOCTOU kill-by-number diganti pidfd, residual pindah ke U-41); U-33 dijawab v2.3.6 (kontrol dikatalogkan, residual U-43/U-44); U-29 diperbarui (pidfd via `bun:ffi` TERBUKTI di Bun 1.4.4; binding Node tetap belum terbukti); U-34/U-35/U-36 diperbarui (dirujuk ke STAGE-P01/P02/P04). Tambah U-41 (tabrakan starttime — residual pidfd), U-42 (celah bukti staging — matriks itu sendiri), U-43 (root sengaja menghapus lock — hanya audit + runbook), U-44 (ro-bind-mount bukan default deployment). |
| 5 | Pernyataan penutup | Paragraf v2.3.6 ditambahkan. Estimasi TETAP ~8–14 hari kerja — perubahan v2.3.6 (pidfd + prosedur operasional) masuk dalam P0-1b/P0-UJI yang sudah ada. G0 tetap wajib dibuktikan aktif; dokumen final BUKAN persetujuan implementasi. |

## Perubahan di revisi v2.3.5 (7 November 2026)

Revisi teknis terbatas atas LIMA BAGIAN permintaan pemilik ("REQUEST V2.3.5:
FLOCK STARTUP LOCK SECURITY REVIEW"): otoritas kepemilikan flock (U-31),
keamanan mixed-version, uji adversarial, dan kompatibilitas runtime/
filesystem. Tidak ada keputusan D-1 s.d. D-8 yang diubah. Risiko U-11
dan U-16 s.d. U-30 tetap tercatat (U-29/U-30 diperbarui, U-31 dijawab);
ditambah risiko baru U-32 s.d. U-40. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti uji: `SSRF_SPIKE_V235.md`.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.5.4e (baru — otoritas kepemilikan flock, U-31 DIJAWAB) | Argumen keamanan: otoritas = flock kernel pada fd yang dipegang seumur hidup proses; (dev,ino)+token adalah DETEKTOR, bukan otoritas. Setiap tindakan sensitif didahului `assertOwnership()` segar dalam tick sinkron yang sama (`guardedAction`); CLOEXEC diverifikasi via fdinfo; fd lock tidak pernah diwariskan; pidfile flock sebagai domain kedua + worker menolak token yang tidak cocok sebelum lookup pertama. Jendela mikro tidak dibuat nol, tetapi konsekuensinya fail-closed (residual dicatat U-38). |
| 2 | §A.5.5.4f (baru — mixed-version fail-closed) | Dua lapis pencegahan: pre-start scan `/proc` (token argv persis) + klasifikasi record (`protocol: "flock-v2"`, old-live → `held-by-old-version` + sentinel, tak terbaca → `lock-record-unreadable`). Bahaya reverse (old-first) diidentifikasi dan diuji (AUTH-T5a/T5b). Aturan v2.3.4 yang mengizinkan record tak terbaca sebagai observabilitas-only DIPERKETAT. Flag-day tetap mengikat (U-28) — deteksi bukan pencegahan. |
| 3 | §A.5.5 (liveness — perbaikan dari diagnosis AUTH-T3) | `pidAlive()` menjadi zombie-aware: state `Z`/`X` di `/proc/<pid>/stat` = tidak hidup; `kill(pid,0)` saja terbukti tidak cukup (zombie SUCCEEDS). Fallback `kill(pid,0)` hanya bila `/proc` tak terbaca. Tes baru AUTH-T11. |
| 4 | §D.4.13 (baru) + §H | Tambah uji adversarial AUTH-01..AUTH-16 ke gerbang G6; G7 menyebut evaluasi atas v2.3.5. |
| 5 | §G | U-31 dijawab v2.3.5 (otoritas flock); U-29 diperbarui (`fs-ext` gagal dibangun ketiga kalinya); U-30 diperbarui (AUTH-T9c NOT RUN). Tambah U-32 (mixed-version reverse), U-33 (advisory flock), U-34 (runtime produksi `bun:ffi` NOT VERIFIED), U-35 (filesystem lock produksi NOT VERIFIED), U-36 (supervisor/mount replacement NOT VERIFIED), U-37 (zombie liveness — ditutup, residual runtime tanpa `/proc`), U-38 (jendela mikro residual), U-39 (PID spawn vs PID pelayan), U-40 (scan false positive substring — ditutup). |
| 6 | Pernyataan penutup | **Koreksi atribusi v2.3.4:** empat klarifikasi (koreksi 3×, reklamasi diperkeras, STARTUP-10, durabilitas pidfile) adalah isi v2.3.3, bukan v2.3.4; v2.3.4 menjawab SATU keberatan (race reklamasi lock). Paragraf v2.3.3 yang hilang ditambahkan kembali; paragraf v2.3.5 ditambahkan. |
| 7 | §F + pernyataan penutup | Estimasi TETAP ~8–14 hari kerja — perubahan v2.3.5 (liveness zombie-aware, lapis mixed-version) masuk dalam P0-1b/P0-UJI yang sudah ada. G0 tetap wajib dibuktikan aktif; dokumen final BUKAN persetujuan implementasi. |


## Perubahan di revisi v2 (7 Nov 2026)

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.2 (IP pinning) | Hasil spike dimasukkan: Pendekatan 1 via Node `https` Agent `lookup` TERBUKTI di Bun 1.4.4 (utama); Pendekatan 2 via `Bun.fetch` + `tls.serverName` + header `Host` TERBUKTI (fallback); `fetch` global terbukti TIDAK mendukung custom lookup; undici v7 hanya terbukti di Node via `.compose()` dan TIDAK dijadikan dependensi utama Bun. Aturan implementasi dari temuan spike: hormati `options.all` pada callback lookup, tulis socket hanya di handler `open`, isi `servername` eksplisit (jangan andalkan penurunan SNI dari header `Host`). |
| 2 | §A.4 (daftar blokir) | Diperluas ke seluruh entri IANA special-purpose IPv4/IPv6 (diambil 7 Nov 2026, terakhir diperbarui IANA 9 Okt 2025): tambah NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48`), IPv4-mapped (`::ffff:0:0/96`), Teredo/6to4 (dengan ekstraksi IPv4 tertanam), dokumentasi TEST-NET, benchmarking, discard-only, ORCHIDv2, zone identifier IPv6 (`%eth0`), dan sumber + proses pembaruan daftar. |
| 3 | §A.1 RDAP | Allowlist redirect RDAP ditentukan dari IANA RDAP bootstrap registry (`data.iana.org/rdap/dns.json`, 592 layanan per 7 Nov 2026) + 5 RIR — bukan wildcard. Host konkret untuk TLD relevan dicantumkan; semua redirect RDAP tetap melalui DNS validation + IP pinning. |
| 4 | §A.5 (resource limit) | Batas streaming dihitung dari byte AKTUAL setelah dekompresi (terbukti: Content-Length 1.004 byte vs 1.000.000 byte konten). Mekanisme abort per tahap (DNS, koneksi, redirect, RDAP, body) pada timeout global 20 detik dijelaskan. |
| 5 | §A.7 (rate limit) | Sumber IP tepercaya, anti-spoofing forwarded headers, dan perilaku multi-instance dijelaskan — termasuk status NOT VERIFIED untuk topologi runtime dan langkah discovery yang wajib dilakukan sebelum memilih store. |
| 6 | §D.5 (cutover) | Diperketat: scanner tetap nonaktif selama perbaikan; go/no-go eksplisit termasuk timeout global + rate limit; penanda tangan tiap gerbang (pemilik + ChatGPT). |
| 7 | §G (baru) | Daftar risiko yang BELUM terselesaikan setelah revisi. |
| 8 | §H (baru) | Rencana pengujian dan rollback FINAL. |
| 9 | §C, §F, daftar keputusan | P0-1a (spike) dinyatakan SELESAI; keputusan D-1 s.d. D-8 ditandai DISETUJUI dengan nilai yang diputuskan pemilik; estimasi disesuaikan (risiko +1 tingkat karena runtime tidak mendukung pinning SUDAH tertutup oleh hasil spike). |

## Perubahan di revisi v2.1 (7 November 2026)

Revisi teknis terbatas atas evaluasi ChatGPT terhadap v2. Tidak ada keputusan
D-1 s.d. D-8 yang diubah. Bukti uji: `SSRF_SPIKE_V21.md` (48/48 PASS).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.4.2–§A.4.3 (NAT64) | **KOREKSI BUG v2:** aturan ekstraksi IPv4 untuk prefix `64:ff9b:1::/48` diperbaiki sesuai RFC 6052 §2.2 — IPv4 TIDAK berada di 32 bit terakhir, melainkan 16 bit di bit 48..63 (byte 6..7) + 16 bit di bit 72..87 (byte 9..10), dengan oktet "u" di bit 64..71 (byte 8) yang WAJIB 0 (bila ≠ 0 → malformed, tolak). Aturan v2 terbukti salah lewat tes: memblokir 8.8.8.8 yang sah (false positive) DAN meloloskan 192.168.1.1 yang disembunyikan di suffix (bypass). Tambah uji unit S-44..S-48. |
| 2 | §A.5 (resource limit) | Batas 400 KB setelah dekompresi kini TERBUKTI pada jalur utama Node `http.Agent` (bukan hanya spike `Bun.fetch`): gzip/deflate/brotli bomb diabort pada 409.600 byte; tanpa Content-Length tetap abort; Content-Length hanya sinyal tolak-awal; encoding tidak dikenal ditolak; stream rusak/terpotong fail-closed. |
| 3 | §A.5 (timeout global & DNS) | **TEMUAN BARU:** `AbortSignal` TIDAK menghentikan `dns.lookup`/`resolve4` di Node v24.22.1 pada VM ini — DNS diperlakukan sebagai NON-CANCELLABLE; mitigasi: race + timeout 5 dtk per lookup + semaphore + abaikan hasil telat + log. Timeout global 20 dtk: seluruh pemeriksaan berhenti, TIDAK BOLEH ada vonis parsial (status "tidak selesai (timeout)", tanpa skor, tanpa baris `checks`). Timeout lokal RDAP dibedakan dari timeout global. |
| 4 | §A.1b (baru — DNS TTL) | API resolver DITETAPKAN: `dns.resolve4`/`resolve6` dengan `{ttl:true}` (satu-satunya API yang memberi TTL; `dns.lookup` tidak memberi TTL). TIDAK ADA caching DNS antar pemeriksaan; masa berlaku pinning = satu hop saja (resolve segar per hop). TTL dicatat untuk observabilitas. |
| 5 | §A.1a (RDAP) | Pencocokan origin + path-prefix WAJIB memakai parsing WHATWG URL yang ketat (bukan string sederhana): bukti tes 20/20; matcher naif `includes()` salah pada 12/20 kasus. Aturan: host persis, port 443, path segment-aware, tolak userinfo, path case-sensitive. |
| 6 | §A.7.2 (konkurensi) | **KOREKSI v2:** batas 5 pemeriksaan DITETAPKAN sebagai batas GLOBAL via tabel lease DB bersama (`scan_leases`, TTL 25 dtk, acquire dalam transaksi), BUKAN 5 per instance. Saat penuh → tolak langsung 429 (tanpa antrean lintas instance). Rate limit DB TIDAK dianggap membatasi konkurensi. |
| 7 | §D.4, §H | Tambah uji S-44..S-48 (NAT64), R-11..R-14 (dekompresi jalur Node Agent, timeout tanpa vonis parsial, race DNS, matcher RDAP), dan RD-01..RD-20 (matcher RDAP ketat). Gerbang G4/G6 diperluas. |
| 8 | §G | Tambah risiko belum terselesaikan U-11..U-15 (NSP di luar dua prefix NAT64 yang dikenal; DNS non-cancellable; TTL sandbox tidak representatif; lease DB sebagai single point; perilaku signal di runtime produksi belum terbukti). |
| 9 | §F | Estimasi TETAP ~8–14 hari kerja — koreksi v2.1 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru). |

## Perubahan di revisi v2.3.4 (7 November 2026)

Revisi teknis terbatas atas SATU keberatan teknis evaluasi ChatGPT terhadap
v2.3.3: race condition pada reklamasi startup lock (§A.5.5.4). Tidak ada
keputusan D-1 s.d. D-8 yang diubah. Risiko U-11 dan U-16 s.d. U-27 tetap
tercatat (U-25 ditulis ulang, U-26 diperbarui); ditambah risiko baru U-28
s.d. U-31. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED**. Bukti uji: `SSRF_SPIKE_V234.md`.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.5.4a (baru — urutan operasi aktual) | Urutan operasi `acquireStartupLock` v2.3.3 didokumentasikan sebagai pseudocode persis dari implementasi referensi (bukan versi ideal), dengan jendela race ditandai. **Pengakuan: implementasi v2.3.3 TIDAK mencegah B menghapus lock baru milik A** — unlink tak bersyarat setelah probe basi + verify yang hanya pemeriksaan sesaat. |
| 2 | §A.5.5.4b (baru — mengapa SU10-T1 tidak cukup) | Klaim v2.3.3 "balapan hapus+create diselesaikan oleh O_EXCL" **ditarik**: SU10-T1 hanya menguji satu titik ruang interleaving secara acak; ADV-T1 mereproduksi 2 pemilik secara deterministik (2/2 run). |
| 3 | §A.5.5.4c (baru — perbaikan flock) | **Primitif kepemilikan diganti: flock(LOCK_EX\|LOCK_NB) pada fd yang dipegang seumur hidup proses.** Jalur probe ESRCH + unlink reklamasi DIHAPUS. Aturan never-unlink; verifikasi ulang kepemilikan (inode + record via path + token acak per-akuisisi); fd WAJIB close-on-exec; heartbeat hanya observabilitas. Jalur probe/tabel ESRCH v2.3.3 untuk lock dinyatakan SUPERSEDED (probe tetap dipakai untuk cleanup worker di §A.5.5.1/§A.5.5.2, yang tidak berubah). |
| 4 | §A.5.5.4d (baru — flag-day) | Migrasi WAJIB flag-day: versi lama (unlink-reclaim) dan versi baru (flock) tidak boleh berjalan bersamaan — ADV-T6 membuktikan dua pemilik pada masa transisi, meskipun jaring pengaman (verifikasi ulang) menangkapnya sebelum cleanup. |
| 5 | §D.4.12 (baru) + §H | Tambah uji adversarial ADV-T1..T6 dan uji semantik flock FLK-T1..T8 ke gerbang G6; G7 menyebut evaluasi atas v2.3.4. |
| 6 | §G | U-25 ditulis ulang (race TERBUKTI, bukan "tersisa kecil"); U-26 diperbarui (kondisi pemicu dari jalur probe hilang bersama jalur itu; residual dicatat di U-28/U-31). Tambah U-28 (versi campuran/flag-day), U-29 (binding flock runtime), U-30 (flock di NFS), U-31 (jendela mikro verifikasi->cleanup). |
| 7 | §F + pernyataan penutup | Estimasi TETAP ~8–14 hari kerja — klarifikasi v2.3.4 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru, kecuali pengujian staging tambahan yang dicatat di G6). Ditegaskan eksplisit: G0 tetap wajib dibuktikan aktif sebelum scanner dapat dibuka kembali, dan seluruh gerbang G0–G7 wajib lolos sebelum keputusan cutover G8; dokumen final BUKAN persetujuan implementasi. |

## Perubahan di revisi v2.3.3 (7 November 2026)

Revisi teknis terbatas atas empat hal evaluasi ChatGPT terhadap v2.3.2:
konsistensi jumlah pengujian, reklamasi startup lock, pengujian
STARTUP-10, dan durabilitas pidfile. Tidak ada keputusan D-1 s.d. D-8
yang diubah. Risiko U-11 dan U-16 s.d. U-25 tetap tercatat; ditambah
risiko baru U-26 dan U-27. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti uji:
`SSRF_SPIKE_V233.md` (RUN=3 suite v2.3.2: 9/9 PASS; regresi 9/9 PASS × 2;
tes baru 8/8 PASS × 2). **Dokumen final BUKAN berarti implementasi
otomatis disetujui** — itu dua keputusan berbeda; persetujuan
implementasi tetap menunggu keputusan eksplisit pemilik.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | Header + §0 `SSRF_SPIKE_V233.md` (baru — rekonsiliasi jumlah run) | **KOREKSI KLAIM:** pesan laporan v2.3.2 menyebut "9/9 PASS dijalankan 3×", tetapi `SSRF_SPIKE_V232.md` dan dokumen desain hanya mendokumentasikan RUN=1 dan RUN=2 (hanya ada `run1.log` dan `run2.log`). Klaim 3× pada saat itu TIDAK didukung bukti. Perbaikan: RUN=3 yang sesungguhnya dijalankan selama revisi ini (output verbatim di `SSRF_SPIKE_V233.md` §0; diff terhadap RUN=1 identik modulo header) — klaim 3× kini didukung tiga output. Seluruh klaim jumlah run SU-T1..SU-T9 diperbarui dari 2× menjadi 3× di dokumen ini. |
| 2 | §A.5.5.4 (reklamasi startup lock — DIPERKERAS) | **Perubahan perilaku inti.** Penghapusan lock HANYA setelah PID pemegang TERBUKTI mati (ESRCH via `kill(pid, 0)`). Heartbeat basi TIDAK PERNAH menjadi bukti kematian — heartbeat tidak lagi dikonsultasikan dalam keputusan hapus (hanya metrik/alert). PID masih hidup → JANGAN hapus, JANGAN lanjut (berlaku juga bila starttime tidak cocok/PID reuse — aturan ketat v2.3.3). EPERM dan error probe lain → status TIDAK PASTI → jangan hapus, jangan lanjut (NOT_READY + page). Lock yang tidak terbaca → JANGAN PERNAH hapus otomatis (menghapus aturan v2.3.2 "hapus bila mtime > 30 dtk"). Validasi ulang kepemilikan setelah acquire berhasil (baca kembali file, pastikan PID sendiri) sebelum cleanup apa pun. Tabel perlakuan error proses (ESRCH/EPERM/lainnya) ditetapkan eksplisit. |
| 3 | §D.4.11 + §H (STARTUP-10) | **STARTUP-10 kini TERUJI di VM ini** (sebelumnya "belum teruji di VM ini — wajib di staging"): 5 parent bersamaan mereklamasi lock basi yang sama → tepat 1 pemenang, yang kalah keluar tanpa cleanup, pemenang memvalidasi ulang kepemilikan (bukti `SSRF_SPIKE_V233.md`, SU10-T1/T2 8/8 PASS × 2). Uji ulang di staging produksi tetap wajib sebelum cutover. |
| 4 | §A.5.5.3 (baru — visibilitas vs durabilitas pidfile) | SU-T4 membuktikan *atomic visibility* (rename atomik), BUKAN durabilitas. Didokumentasikan batas bukti: seluruh pengujian berjalan di `/tmp` bertipe tmpfs (fsync tidak menguji durabilitas disk) dan `/home` di overlay btrfs dengan `fsync=volatile`. Rencana uji crash/durabilitas staging D-01..D-03 ditambahkan; pidfile WAJIB berada di penyimpanan persisten, bukan tmpfs. |
| 5 | §G | Perbarui U-25 (jendela TOCTOU reklamasi menyempit — balapan hapus+create kini teruji SU10-T1; sisa jendela: PID dipakai ulang antara probe ESRCH dan unlink — penghapusan file klaim basi tetap aman karena proses baru tidak memegang lock). Tambah risiko baru U-26 (startup macet sampai intervensi operator bila angka PID hidup/EPERM/lock tak terbaca) dan U-27 (durabilitas pidfile belum terbukti di filesystem produksi). |
| 6 | §D.4.11 + §H | Tambah uji baru RCL-T1..T6 (reklamasi yang diperkeras) dan SU10-T1/T2 (STARTUP-10) ke gerbang G6; G7 menyebut evaluasi atas v2.3.3. |
| 7 | §F + pernyataan penutup | Estimasi TETAP ~8–14 hari kerja — klarifikasi v2.3.3 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru). Ditegaskan eksplisit: G0 tetap wajib dibuktikan aktif sebelum scanner dapat dibuka kembali, dan seluruh gerbang G0–G7 wajib lolos sebelum keputusan cutover G8; dokumen final BUKAN persetujuan implementasi. |

## Perubahan di revisi v2.3.2 (7 November 2026)

Revisi teknis terbatas atas satu klarifikasi wajib evaluasi ChatGPT
terhadap v2.3.1: aturan startup parent baru pada §A.5.5. Tidak ada
keputusan D-1 s.d. D-8 yang diubah. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti uji:
`SSRF_SPIKE_V232.md` (9/9 PASS, dijalankan ulang **3×** — RUN=1, RUN=2,
dan RUN=3; RUN=3 dijalankan dan didokumentasikan selama revisi v2.3.3,
lihat §0 `SSRF_SPIKE_V233.md`). **Dokumen final
BUKAN berarti implementasi otomatis disetujui** — itu dua keputusan
berbeda; persetujuan implementasi tetap menunggu keputusan eksplisit
pemilik.

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.5 (diperjelas — aturan startup NOT_READY) | **Inti revisi v2.3.2 (butir 1).** Aturan keras yang tidak dapat dinegosiasi: bila worker lama tidak dapat dipastikan mati setelah batas waktu dan percobaan cleanup habis, parent baru WAJIB tetap `NOT_READY` dan tidak menerima lookup DNS. Batas percobaan BUKAN izin melanjutkan startup. Ditetapkan: 3 percobaan cleanup × tunggu konfirmasi exit 5 dtk per percobaan (anggaran total 15 dtk); tiap percobaan = validasi ulang identitas → SIGKILL → tunggu event `exit`; setelah percobaan ke-3 gagal, parent tetap `NOT_READY` sampai intervensi operator atau exit worker lama akhirnya terkonfirmasi. Selama `NOT_READY`: semua lookup DNS ditolak `DNS_PARENT_NOT_READY`, dicatat, metrik `parentNotReady` + page aktif. Hanya dua kondisi yang mengizinkan transisi ke `READY`: (a) exit worker lama terkonfirmasi via event `exit`, atau (b) bukti worker lama tidak pernah ada (tidak ada pidfile, atau PID worker tidak hidup). **Koreksi inkonsistensi v2.3.1:** langkah cleanup di §A.5.5 sebelumnya menulis tunggu maks 2 dtk — diselaraskan ke exit-confirm timeout 5 dtk yang sama dengan aturan konfirmasi terminasi (§A.5.5 butir 1); frasa "JANGAN lanjut sebelum worker lama mati ATAU batas percobaan habis" DIHAPUS karena "atau batas percobaan habis" dapat dibaca sebagai izin melanjutkan — diganti aturan keras di atas. |
| 2 | §A.5.5.2 (baru — validasi identitas proses sebelum SIGKILL) | **Inti revisi v2.3.2 (butir 2a).** PID saja tidak cukup. Sebelum SIGKILL, parent baru WAJIB memvalidasi identitas worker lama: (1) PID hidup (`kill(pid, 0)`); (2) start time proses dari `/proc/<pid>/stat` field 22 HARUS sama dengan `workerStarttime` di pidfile — ini yang mengikat PID ke instans proses tertentu dan menggagalkan PID reuse; (3) command line dari `/proc/<pid>/cmdline` HARUS mengandung penanda worker (`dns-worker`); (4) bila channel IPC ke worker lama tersedia, tantangan token (token di pidfile harus dijawab benar oleh worker). Bila SATU PUN pemeriksaan gagal → JANGAN kirim SIGKILL, parent tetap `NOT_READY` + page, operator harus memeriksa manual. Validasi diulang sesaat sebelum tiap percobaan SIGKILL (bukan sekali di awal startup). |
| 3 | §A.5.5.3 (baru — pidfile atomik) | **Inti revisi v2.3.2 (butir 2b).** Penulisan pidfile: tulis record lengkap ke file sementara di direktori yang sama → fsync file → rename atomik → fsync direktori. Isi: `parentPid`, `workerPid`, `workerStarttime`, `workerToken`, `writtenAt`, `version`. Tidak pernah ada keadaan setengah tertulis: kegagalan di tengah jalan hanya meninggalkan file sementara yang tidak pernah menjadi pidfile. Pidfile yang ada tetapi rusak/parsial (JSON tidak terbaca atau field hilang) diperlakukan sebagai "worker lama tidak dapat dibuktikan mati dan tidak dapat dibuktikan tidak ada" → parent tetap `NOT_READY` + page (fail-closed); hanya pidfile yang TIDAK ADA yang berarti "tidak ada klaim worker" → boleh READY. |
| 4 | §A.5.5.4 (baru — startup lock) | **Inti revisi v2.3.2 (butir 2c).** Satu parent memegang startup lock selama masa hidup prosesnya (file lock dibuat atomik O_EXCL, fd dipertahankan terbuka, heartbeat ditulis tiap 5 dtk). Parent yang kalah acquire (lock dipegang pemegang yang hidup + heartbeat segar) KELUAR SEGERA dengan kode keluar dan log yang jelas, dan TIDAK melakukan cleanup atau startup apa pun. Bila pemegang lock mati (PID tidak hidup dan/atau heartbeat basi > 10 dtk), lock dapat direklamasi setelah validasi identitas pemegang — penghapusan lock basi hanya setelah PID pemegang terbukti mati; jendela TOCTOU kecil antara validasi dan penghapusan dicatat sebagai risiko baru U-25. |
| 5 | §D.4.11 (baru) + §H | Gerbang G6 diperluas dengan uji startup STARTUP-01..STARTUP-09 (SU-T1..SU-T9, bukti `SSRF_SPIKE_V232.md`). G7 menyebut evaluasi atas v2.3.2. |
| 6 | §G | Tambah risiko belum terselesaikan U-24 (jendela TOCTOU validasi-identitas → SIGKILL) dan U-25 (balapan reklamasi lock basi). U-11, U-16, U-17, U-18, U-19, U-20, U-21, U-22, U-23 TETAP dicatat tanpa perubahan. |
| 7 | §F + pernyataan penutup | Estimasi TETAP ~8–14 hari kerja — klarifikasi v2.3.3 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru). Ditegaskan eksplisit: G0 tetap wajib dibuktikan aktif sebelum scanner dapat dibuka kembali, dan seluruh gerbang G0–G7 wajib lolos sebelum keputusan cutover G8; dokumen final BUKAN persetujuan implementasi. |

## Perubahan di revisi v2.3.1 (7 November 2026)

Revisi teknis terbatas atas evaluasi ChatGPT terhadap v2.3: konfirmasi
terminasi child process, parent crash/restart, batas lintas instance, dan
rekonsiliasi laporan pengujian. Tidak ada keputusan D-1 s.d. D-8 yang
diubah. Status tetap: **DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION
NOT APPROVED**. Bukti uji: `SSRF_SPIKE_V231.md` (61/61 PASS, dijalankan
ulang 2×).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.5 (baru — konfirmasi terminasi worker + parent crash/restart) | **Inti revisi v2.3.1 (butir 1–2).** (a) Counter `orphaned`/`active` HANYA dikurangi setelah event `exit` child process diterima — TIDAK PERNAH saat SIGKILL dikirim; satu jalur decrement (`_decrementForWorker`, idempotent) yang hanya dipanggil dari exit handler; bila exit tidak terkonfirmasi dalam batas waktu (5 dtk produksi), counter TETAP, breaker TETAP terbuka, metrik `workerExitUnconfirmed` + page. (b) Evaluasi penutupan breaker terjadi tepat 1× dan HANYA setelah exit terkonfirmasi (dibuktikan TERM-T2 dengan penghitungan pemanggilan). (c) Parent crash: worker keluar sendiri saat parent mati (`disconnect` + watchdog ppid) — dibuktikan PARENT-T1a; bila mekanisme itu gagal (worker stubborn), parent baru membersihkan worker lama lewat pidfile (SIGKILL + konfirmasi exit) — dibuktikan PARENT-T1b; state in-memory dibangun dari nol oleh parent baru, lease global DB bertahan (dibuktikan PARENT-T2); request yang sedang berjalan saat parent mati gagal fail-closed tanpa vonis. (d) Supervisor eksternal ditetapkan sebagai persyaratan staging (U-22) karena perilaku supervisor platform tidak dapat diperiksa di VM ini. |
| 2 | §A.5.6 (baru — batas lintas instance) | **Inti revisi v2.3.1 (butir 3).** Batas 8 operasi hidup ditegaskan sebagai batas PER PROSES, bukan global: worst-case lintas instance = **8N** (N = jumlah instance; 100 instance → 800). Dijelaskan hubungannya dengan `scan_leases` global (batas 5 pemeriksaan): lease membatasi pemeriksaan yang berjalan, BUKAN akumulasi orphaned — karena lease dilepas saat pemeriksaan selesai sementara lookup-nya tetap hidup sebagai orphaned. Alasan batas global orphaned belum masuk P0 (butuh store bersama + heartbeat/lease-TTL pada entri orphaned + failure mode baru) dan syarat memasukkannya di P2. U-18 TETAP TERBUKA dengan angka worst-case ini. |
| 3 | §D.4.10 (baru) + §H | Gerbang G6 diperluas dengan uji terminasi TERM-01..TERM-04, uji parent PARENT-01..PARENT-02, uji rekonsiliasi RECON-01, dan uji supervisor SUP-01. |
| 4 | §G | Tambah risiko belum terselesaikan U-21 (exit worker tidak terkonfirmasi), U-22 (parent crash / supervisor platform belum terbukti), U-23 (batas global orphaned belum ada — worst-case 8N). U-18 diperbarui dengan angka worst-case lintas instance dan hubungan dengan `scan_leases`. U-11, U-16, U-17, U-19, U-20 TETAP dicatat tanpa perubahan. |
| 5 | §4 (rekonsiliasi, di `SSRF_SPIKE_V231.md`) | **Koreksi laporan (butir 4).** Anotasi blok output `SSRF_SPIKE_V23.md` terbukti bergeser satu baris: anotasi di bawah SEM-R6 sebenarnya menjelaskan ORPH-T0 (orphaned akhir=6, live maks=6), dan anotasi di bawah ORPH-T0 sebenarnya menjelaskan ORPH-T1 (orphaned maks=3, live maks=4, started=4). Pengulangan v2.3.1 mengonfirmasi isi §2/§3 v2.3 benar; tidak ada angka yang diubah. Koreksi kedua: "5 kunci baru" pada SEM-R6 seharusnya "7" (total 19 tetap benar: 10 + 7 + `liveOps` + `capDeferred`); v2.3.1 menambah 2 kunci (`workerExitConfirmed`, `workerExitUnconfirmed`) menjadi 21. |
| 6 | §F | Estimasi TETAP ~8–14 hari kerja — revisi v2.3.1 masuk dalam P0-1b/P0-UJI yang sudah ada (tidak menambah langkah baru). |

## Perubahan di revisi v2.3 (7 November 2026)

Revisi teknis terbatas atas satu keberatan evaluasi akhir ChatGPT terhadap
v2.2: absolute cap DNS berpotensi membuka akumulasi lookup yang tidak
pernah settle. Tidak ada keputusan D-1 s.d. D-8 yang diubah. Status tetap:
**DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti
uji: `SSRF_SPIKE_V23.md` (13/13 PASS, dijalankan ulang 2×).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.4 (baru — penghitung orphaned, batas keras, circuit breaker, pemulihan worker) | **Inti revisi v2.3.** (a) Penghitung slot semaphore dan penghitung operasi DNS orphaned DIPISAH: operasi yang terkena force-release tetap dihitung sebagai operasi yang mungkin masih berjalan sampai promise aslinya settle atau proses worker-nya benar-benar dihentikan — force-release TIDAK PERNAH dianggap sebagai berhentinya operasi DNS. (b) Batas keras orphaned: `orphanHardCap = 4` (produksi); force-release HANYA merebut slot bila `orphaned < cap` — bila sudah di cap, slot tetap terpakai sebagai "cap-deferred" sampai orphaned turun. Invarian yang ditegakkan: `orphaned ≤ cap` SELALU dan `liveOps = active + orphaned ≤ maxActive + cap` SELALU. (c) Circuit breaker fail-closed: saat `orphaned ≥ cap`, penerimaan lookup DNS baru dihentikan sementara (tolak `DNS_CIRCUIT_OPEN`, antrean dikosongkan); breaker menutup hanya saat `orphaned ≤ threshold pemulihan = 1` (hysteresis). (d) Mekanisme pemulihan: isolasi DNS worker anak-proses yang dapat di-kill (`SIGKILL`) dan dibuat ulang — satu-satunya pembatalan DNS yang terbukti, karena `AbortSignal` terbukti tidak menghentikan DNS (temuan v2.1). Worker thread dievaluasi dan DITOLAK sebagai pengganti (berbagi memori/resolver proses induk). (e) Metrik baru: `orphaned` aktif, total force-release, high-water mark orphaned, status/trip breaker, restart worker — lengkap dengan ambang alert dan tindakan operasional. Bukti: ORPH-T0 (kontrol v2.2 — keberatan TERBUKTI: orphaned tumbuh 2→4→6 tanpa batas) dan ORPH-T1..T5 (7/7 PASS). |
| 2 | §A.5.3 | Ditambah rujukan ke §A.5.4: absolute cap v2.2 kini dibatasi oleh penghitung orphaned dan circuit breaker; SEM-T5 tetap berlaku tetapi kini dilengkapi ORPH-T1..T5. |
| 3 | §G | Tambah risiko belum terselesaikan U-18 (akumulasi orphaned — kini TERBATAS tetapi tidak hilang: breaker per proses, bukan global), U-19 (restart worker DNS — kompleksitas dan risiko restart loop), U-20 (breaker yang terlalu agresif dapat menolak lookup legit saat resolver bermasalah). U-16 diperbarui: perilaku semaphore + orphan accounting di runtime produksi tetap belum terbukti. U-11, PostgreSQL belum teruji, dan U-17 TETAP dicatat tanpa perubahan. |
| 4 | §H + §D.4.9 (baru) | Gerbang G6 diperluas dengan uji orphaned ORPH-01..ORPH-05 (termasuk pengulangan SEM-01..SEM-06 setelah perubahan); G7 menyebut evaluasi atas v2.3. Uji baru: kontrol tanpa batas (ORPH-T0), gelombang berulang (ORPH-T1), breaker (ORPH-T2), pemulihan lewat settle (ORPH-T3), kill worker (ORPH-T4), metrik (ORPH-T5). |
| 5 | §F | Estimasi TETAP ~8–14 hari kerja — revisi v2.3 masuk dalam P0-1b/P0-UJI/P1-2 yang sudah ada (worker DNS adalah bagian dari P0-1b; tidak menambah langkah baru). |

## Perubahan di revisi v2.2 (7 November 2026)

Revisi teknis terbatas atas evaluasi ChatGPT terhadap v2.1. Tidak ada
keputusan D-1 s.d. D-8 yang diubah. Status tetap: **DESIGN ACCEPTED WITH
CONDITIONS — IMPLEMENTATION NOT APPROVED**. Bukti uji:
`SSRF_SPIKE_V22.md` (11/11 PASS: semaphore DNS 6/6, atomicity lease 5/5).

| # | Bagian | Perubahan |
| --- | --- | --- |
| 1 | §A.5.3 (baru — siklus hidup slot semaphore DNS) | Slot semaphore HANYA dilepas saat promise DNS asli settle (selesai/gagal) atau saat absolute cap 30 dtk tercapai — TIDAK PERNAH hanya karena `Promise.race` mencapai timeout. Lookup yang timeout tetap dihitung aktif sampai settle; antrean FIFO berbatas (maks 4, tunggu maks 5 dtk, penuh → tolak); penumpukan lookup background dibatasi `maxActive + maxQueue` = 8 per proses; metrik + ambang alert ditetapkan. Bukti: SEM-T1..SEM-T6 (6/6 PASS). Temuan samping: timer penolakan race TIDAK BOLEH di-unref. |
| 2 | §A.7.3 (baru — atomicity lease global per database) | Mekanisme atomisitas ditetapkan PER DATABASE AKTUAL: SQLite (live) — single-statement `INSERT ... SELECT ... WHERE count < 5` ATAU transaksi `BEGIN IMMEDIATE`, keduanya TERBUKTI (LSE-T1, 3 ronde × 8 proses → tepat 1 pemenang); PostgreSQL (target) — advisory lock transaksi ATAU counter row `UPDATE ... WHERE used < 5 RETURNING used`, dengan peringatan eksplisit bahwa single-statement `INSERT ... SELECT ... WHERE COUNT(*)` TIDAK aman di PostgreSQL di bawah `READ COMMITTED` (belum teruji di sini — wajib diuji di staging G6). Isolation level, locking, dan strategi retry (backoff 25/50/100 ms, maks 3×, lalu 503 fail-closed) ditetapkan. |
| 3 | §G (U-11) | Risiko NAT64 U-11 TETAP TERBUKA (tidak diklaim tertangani): ditambah rencana penanganan di staging (uji DNS64 dengan prefix NSP yang diketahui + kriteria penurunan status) dan daftar dokumen egress runtime yang harus diminta untuk mengurangi ketidakpastian. |
| 4 | §D.6 (baru — bukti mitigasi produksi G0) | Status keputusan mitigasi DIPISAH dari bukti bahwa mitigasi benar-benar aktif. Daftar bukti (evidence checklist) G0 ditetapkan: flag aktif, URL arbitrer ditolak sebelum koneksi keluar, tidak ada jalur cron yang melewati mitigasi, katalog/dashboard/histori/Gibran tetap berfungsi, timestamp aktivasi + identitas build. Dinyatakan eksplisit: **bukti-bukti ini BELUM ADA** karena mitigasi belum diaktifkan — dokumen ini hanya menetapkan apa yang harus dibuktikan di gerbang G0. |
| 5 | §G | Tambah risiko belum terselesaikan U-16 (semaphore DNS: perilaku lookup di runtime produksi belum terbukti; katup absolute cap sebagai mitigasi) dan U-17 (lease `scan_leases` di bawah beban ratusan instance belum teruji; kontensi lock SQLite/PostgreSQL). |
| 6 | §H | Gerbang G0 diperluas dengan checklist bukti §D.6; gerbang G6 diperluas dengan uji semaphore SEM-01..SEM-06 dan uji lease LSE-01..LSE-05 + uji beban konkurensi R-15. |
| 7 | §F | Estimasi TETAP ~8–14 hari kerja — revisi v2.2 masuk dalam P0-1b/P0-UJI/P1-2 yang sudah ada (tidak menambah langkah baru). |

---

## 0. Ringkasan eksekutif

Audit menemukan scanner live melakukan fetch server-side atas URL arbitrer tanpa
validasi DNS/IP: satu-satunya gate adalah protokol `http:`/`https:`. Tidak ada DNS
resolution, tidak ada IP pinning, tidak ada blocklist localhost/privat/link-local/
metadata, redirect tidak divalidasi ulang, fetch `<script src>` adalah vektor kedua,
dan tidak ada rate limiting. Satu panggilan dapat memicu ~11 fetch dan ~132 detik
wall-clock.

Rancangan ini menutup jalur-jalur itu dengan satu prinsip: **tidak ada koneksi
keluar yang terjadi sebelum hostname di-resolve, semua alamat hasil resolve
divalidasi, dan koneksi dibuat ke IP yang sudah divalidasi itu (IP pinning)** —
diterapkan secara identik pada URL awal, setiap hop redirect, dan (bila diaktifkan
kembali) setiap fetch script.

**Hasil spike runtime (v2 — `SSRF_SPIKE_RUNTIME.md`, 7 Nov 2026):** pinning
TERBUKTI dapat dilakukan di runtime Bun 1.4.4 — Pendekatan 1 via Node
`http`/`https` Agent `lookup` (utama), Pendekatan 2 via `Bun.fetch` +
`tls.serverName` + header `Host` (fallback). `fetch` global terbukti TIDAK
mendukung custom lookup (opsi `dispatcher` diabaikan diam-diam). Karena itu
jalur fetch terp-pin TIDAK BOLEH memakai `fetch` global; ia memakai API
`http`/`https` Node (Pendekatan 1) atau `Bun.fetch` dengan IP literal +
`tls.serverName` (Pendekatan 2). Spike P0-1a dengan demikian SELESAI; yang
masih wajib adalah uji ulang P0-1a di staging artifact produksi (U-1 di
laporan spike), karena spike dijalankan pada Bun CLI di VM — bukan pada
runtime artifact produksi.

**Hasil revisi v2.1 (7 Nov 2026 — `SSRF_SPIKE_V21.md`, 48/48 PASS):** enam
koreksi teknis atas evaluasi ChatGPT. (1) Aturan NAT64 v2 **salah** dan
diperbaiki: untuk `64:ff9b:1::/48` IPv4 berada di bit 48..63 + 72..87 dengan
oktet "u" wajib 0 — aturan v2 terbukti memblokir 8.8.8.8 yang sah dan
meloloskan 192.168.1.1 yang disembunyikan di suffix. (2) Batas 400 KB setelah
dekompresi terbukti pada jalur utama Node `http.Agent` (abort pada 409.600
byte untuk gzip/deflate/brotli, termasuk tanpa Content-Length). (3) TEMUAN:
`AbortSignal` TIDAK menghentikan DNS di Node v24.22.1 pada VM ini — DNS
diperlakukan sebagai NON-CANCELLABLE. (4) API resolver ditetapkan
(`resolve4/6` dengan `{ttl:true}`); tanpa caching DNS antar pemeriksaan.
(5) Pencocokan allowlist RDAP wajib parsing URL ketat (20/20; matcher naif
salah 12/20). (6) Batas 5 pemeriksaan ditetapkan GLOBAL via lease DB
bersama, bukan per instance. Semua bukti berasal dari VM ini — BUKAN dari
runtime artifact produksi; uji ulang staging (U-1) tetap wajib.

**Hasil revisi v2.2 (7 Nov 2026 — `SSRF_SPIKE_V22.md`, 11/11 PASS):** empat
tindak lanjut evaluasi akhir ChatGPT atas v2.1. (1) Siklus hidup slot
semaphore DNS diperjelas: slot dilepas HANYA saat promise DNS asli settle
atau absolute cap 30 dtk — tidak pernah hanya karena `Promise.race`
timeout; antrean FIFO berbatas (maks 4, tunggu 5 dtk); lookup background
dibatasi `maxActive + maxQueue` = 8 per proses; metrik + ambang alert
ditetapkan (6/6 PASS, termasuk temuan samping: timer penolakan race
TIDAK BOLEH di-unref). (2) Atomicity lease global ditetapkan PER DATABASE:
SQLite (live) — single-statement ATAU `BEGIN IMMEDIATE`, keduanya TERBUKTI
(3 ronde × 8 proses → tepat 1 pemenang); PostgreSQL (target) — advisory
lock ATAU counter row, dengan peringatan bahwa single-statement
`INSERT ... SELECT ... WHERE COUNT(*)` TIDAK aman di PostgreSQL di bawah
`READ COMMITTED` (belum teruji di sini — wajib diuji di staging G6).
(3) Risiko NAT64 U-11 TETAP TERBUKA dengan rencana staging + daftar
dokumen egress yang harus diminta. (4) Bukti mitigasi produksi G0 dipisah
dari keputusan mitigasi: checklist bukti G0-E1..G0-E5 ditetapkan dan
dinyatakan eksplisit BELUM ADA karena mitigasi belum diaktifkan. Status
tetap: **DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED**.

**Hasil revisi v2.3 (7 Nov 2026 — `SSRF_SPIKE_V23.md`, 13/13 PASS,
dijalankan ulang 2×):** satu keberatan atas v2.2 — absolute cap berpotensi
membuka akumulasi lookup yang tidak pernah settle. (1) Kontrol ORPH-T0
membuktikan keberatan itu NYATA: tanpa batas orphaned, tiga gelombang
force-release menumbuhkan operasi hidup 2→4→6 tanpa batas. (2) v2.3
memisahkan penghitung slot semaphore dari penghitung operasi DNS orphaned:
operasi yang di-force-release tetap dihitung sampai promise aslinya settle
atau proses worker-nya benar-benar dihentikan. (3) Batas keras orphaned
(`orphanHardCap = 4` produksi): force-release hanya merebut slot bila
`orphaned < cap` — bila sudah di cap, slot tetap terpakai sebagai
"cap-deferred". Invarian yang ditegakkan dan dibuktikan: `orphaned ≤ cap`
SELALU dan `liveOps ≤ maxActive + cap` SELALU (ORPH-T1, gelombang
berulang). (4) Circuit breaker fail-closed: saat `orphaned ≥ cap`,
penerimaan lookup baru dihentikan (`DNS_CIRCUIT_OPEN`, 0 lookup baru
dimulai — ORPH-T2); breaker menutup hanya saat `orphaned ≤ 1`
(hysteresis), dan gelombang kedua tetap berbatas (ORPH-T3). (5) Pemulihan
lewat isolasi DNS worker anak-proses: kill `SIGKILL` TERBUKTI menghentikan
operasi yang menggantung (`orphaned` 2→0, breaker menutup, worker baru
melayani — ORPH-T4); worker thread dievaluasi dan DITOLAK sebagai
pengganti (berbagi memori/resolver induk). (6) Metrik orphaned baru
(aktif, total force-release, high-water mark) sesuai prediksi state
machine (ORPH-T5). (7) Seluruh SEM-01..SEM-06 diulang setelah perubahan
(SEM-R1..SEM-R6, 6/6 PASS). Semua bukti berasal dari VM ini — BUKAN dari
runtime artifact produksi; uji ulang staging (U-1) tetap wajib.

Tiga keputusan desain yang paling penting:

1. **Fail-closed, bukan fail-open.** Bila DNS gagal, hasil resolve meragukan,
   atau guard tidak dapat memastikan keamanan tujuan, pemeriksaan **ditolak** —
   bukan di-fetch "coba saja".
2. **IP pinning nyata, bukan DNS lookup seremonial.** Resolve lalu `fetch` biasa
   adalah teater keamanan: resolver fetch dapat mengembalikan IP berbeda (DNS
   rebinding / TOCTOU). Koneksi harus dibuat ke IP yang sudah divalidasi.
3. **Penolakan tidak membocorkan informasi.** URL yang ditolak guard tidak
   mengembalikan status HTTP, judul halaman, URL akhir, rantai redirect, atau
   kontrak dari target — hanya penolakan generik.

**Yang dipertahankan (non-negotiable):** histori tabel `checks`, 13 proyek katalog,
sistem scoring dan sinyal yang ada, perilaku scanner untuk URL publik yang sudah
terbukti benar, serta 3 URL acuan yang vonisnya harus tetap sama setelah perbaikan:
`scamsem.solbarn.cc` → BAHAYA 100, `binance.com` → LEBIH AMAN,
`ptah.trade/poa` → WASPADA.

---

## A. Rancangan arsitektur perbaikan

### A.1 Alur fetch aman end-to-end (diagram teks)

```
Pengguna menempel URL di UI Link Scanner
  └─ POST ./actions { action: "checkLink", args: { url } }     (tanpa auth — lihat §A.7)
       └─ checkLink (server/src/actions.ts)
            │
            ├─ [P1-2] GATE RATE LIMIT + KONKURENSI
            │    Tolak (429 + pesan generik) bila IP pemanggil melebihi kuota
            │    atau antrean penuh. Dicatat di log (bukan di tabel checks).
            │
            ├─ [P0-5] normalizeUrl() — DIPERKETAT (lihat §B.1)
            │    • Skema harus http:/https: (sudah ada — dipertahankan)
            │    • Tolak userinfo (username/password) apa pun
            │    • Tolak port di luar 80/443 (P1-3; bila P1-3 belum
            │      diimplementasikan, catat port sebagai sinyal, jangan diblokir
            │      diam-diam — lihat §C)
            │    • Tolak hostname literal IP privat/loopback/link-local dan
            │      hostname localhost / metadata.* (setelah normalisasi bentuk IP)
            │    • Normalisasi hostname: lowercase, buang trailing dot,
            │      IDNA/punycode di-decode ke bentuk kanonik sebelum dicocokkan
            │    • Bila ditolak di sini → langsung ke [PENOLAKAN AMAN] (§A.6),
            │      TIDAK ADA fetch apa pun yang terjadi
            │
            ├─ [P0-1] resolveAndCheck(hostname) — BARU (implementasi stub
            │    di src/scanner/ssrf-guard.ts)
            │    • Resolve via DNS dengan timeout sendiri (mis. 5 detik)
            │    • Minta SEMUA alamat: A dan AAAA (lookup all, verbatim)
            │    • Normalisasi tiap alamat hasil resolve:
            │        – IPv4-mapped IPv6 (::ffff:a.b.c.d) → konversi ke IPv4
            │        – IPv6 literal → bentuk kanonik terkompresi
            │    • Validasi SETIAP alamat terhadap daftar blokir (§A.4):
            │      loopback, privat RFC1918, link-local, multicast,
            │      0.0.0.0/8, ULA fc00::/7, ::1, fe80::/10, ::/128
            │    • Bila SATU alamat saja terlarang → tolak SELURUH hostname
            │      (penyerang mengontrol DNS; satu jawaban jahat cukup)
            │    • Bila hostname tidak dapat di-resolve → tolak (fail-closed),
            │      jangan lanjutkan dengan "coba fetch saja"
            │    • Kembalikan: daftar IP yang diizinkan + TTL terendah
            │      (untuk batas umur pinning)
            │
            ├─ [P0-1] fetchWithPinnedIp(url, pinnedIps) — BARU
            │    • Koneksi DIBUAT KE IP YANG SUDAH DIVALIDASI, bukan ke
            │      hostname (lihat §A.2 — mekanisme pinning)
            │    • Timeout per hop 12 detik (dipertahankan dari kode live
            │      sebagai lantai) di dalam anggaran global (§A.5)
            │    • Streaming dengan batas ukuran: abort bila Content-Length
            │      melebihi batas ATAU byte yang terbaca melebihi batas
            │      (~400 KB untuk halaman, sesuai cap pemindaian yang ada)
            │    • Cek Content-Type: hanya HTML/teks yang dipindai; tipe lain
            │      (octet-stream, video, arsip) tidak diunduh penuh dan tidak
            │      dipindai sebagai HTML
            │    • TIDAK PERNAH mengikuti redirect otomatis (redirect: manual
            │      — dipertahankan)
            │
            ├─ [P0-3] LOOP REDIRECT (maks 6 hop — dipertahankan)
            │    Untuk setiap respons 301/302/303/307/308:
            │    • Ambil header Location → new URL(loc, current)
            │    • Jalankan ULANG SELURUH RANTAI untuk URL baru:
            │      normalizeUrl() → resolveAndCheck() → fetchWithPinnedIp()
            │      (protokol, userinfo, port, hostname, DNS, IP — semuanya)
            │    • Tolak skema non-http(s) pada Location (mis. file:, ftp:,
            │      javascript:, data:) — hentikan rantai sebagai PENOLAKAN,
            │      bukan sebagai "tidak terjangkau"
            │    • Hop ke-7 masih redirect → hentikan (perilaku lama:
            │      kembalikan null / "tidak terjangkau" — dipertahankan)
            │    • Rantai hostname dicatat sebagai bukti (perilaku lama —
            │      dipertahankan), TETAPI rantai yang berakhir pada penolakan
            │      guard TIDAK menampilkan host internal (lihat §A.6)
            │
            ├─ [P0-4] SCRIPT SRC — DINONAKTIFKAN SEMENTARA (lihat §D.2)
            │    • Selama mitigasi: JANGAN fetch <script src> eksternal sama
            │      sekali. Sinyal dari isi script tidak dihitung.
            │    • Bila diaktifkan kembali di masa depan: setiap script src
            │      melewati rantai guard yang sama persis (normalize →
            │      resolve → pin → fetch), chain redirect-nya TIDAK dibuang,
            │      dan cek known-bad berlaku pada chain tersebut.
            │
            ├─ [DIPERKETAT — v2] lookupRdap(domain)
            │    • Fetch ke https://rdap.org/domain/<domain> — host AWAL
            │      tetap rdap.org; domain berasal dari
            │      registrableDomain(hostname) yang sudah lolos guard
            │    • Redirect rdap.org mengikuti guard yang sama (bukan
            │      redirect:'follow' buta): setiap hop di-resolve, divalidasi,
            │      DAN di-pin — DAN host tujuan redirect harus ada dalam
            │      allowlist RDAP (§A.1a v2, diturunkan dari IANA RDAP
            │      bootstrap registry — bukan wildcard, bukan "*.rdap.org"
            │      sembarangan)
            │    • Timeout 12 detik per fetch (dipertahankan), di dalam
            │      anggaran global; abort RDAP mengikuti §A.5 v2
            │
            │    §A.1a Allowlist redirect RDAP (v2 — bukan wildcard)
            │    Sumber: IANA RDAP bootstrap registry, diunduh dan dibaca
            │    7 Nov 2026 — `https://data.iana.org/rdap/dns.json`
            │    (592 layanan) untuk domain, `https://data.iana.org/rdap/
            │    ipv4.json` dan `ipv6.json` untuk IP, `asn.json` untuk ASN.
            │    Aturan: (1) redirect RDAP HANYA boleh menuju origin yang
            │    tercantum dalam bootstrap registry untuk TLD yang
            │    bersangkutan (cocok persis pada scheme+host+path-prefix
            │    dari entri registry); (2) `rdap.org` sendiri selalu
            │    diizinkan sebagai titik awal; (3) 5 RIR diizinkan untuk
            │    lookup berbasis IP — `rdap.arin.net`, `rdap.apnic.net`,
            │    `rdap.db.ripe.net`, `rdap.lacnic.net`,
            │    `rdap.afrinic.net`; (4) entri `http://` (non-HTTPS) dalam
            │    registry DITOLAK — RDAP hanya lewat HTTPS (bila entri
            │    registry hanya menyediakan `http://`, lookup untuk TLD itu
            │    gagal dengan "RDAP tidak tersedia", bukan dialihkan ke
            │    HTTP); (5) host di luar daftar → redirect DITOLAK dan
            │    lookup dianggap "umur domain tidak diketahui".
            │    Host konkret untuk TLD yang relevan dengan katalog
            │    (per 7 Nov 2026): `.com` → `rdap.verisign.com/com/v1/`,
            │    `.net` → `rdap.verisign.com/net/v1/`, `.cc` →
            │    `tld-rdap.verisign.com/cc/v1/`, `.org` →
            │    `rdap.publicinterestregistry.org/rdap/`, `.app`/`.dev` →
            │    `pubapi.registry.google/rdap/`, `.xyz` →
            │    `rdap.centralnic.com/xyz/`, `.ai`/`.cash`/`.live` →
            │    `rdap.identitydigital.services/rdap/`, `.fun`/`.online`/
            │    `.site` → `rdap.radix.host/rdap/`, `.trade` →
            │    `rdap.nic.trade/`, `.win` → `rdap.nic.win/`, `.id` →
            │    `rdap.pandi.id/rdap/`, `.link` →
            │    `rdap.uniregistry.net/rdap/`, `.ly` → `rdap.nic.ly/`,
            │    `.top` → `rdap.zdnsgtld.com/top/`.
            │    Pemeliharaan: file bootstrap di-cache server-side dan
            │    diunduh ulang **semingguan** (atau bila ada TLD baru yang
            │    gagal RDAP); bila unduhan gagal, pakai cache terakhir dan
            │    catat di log (jangan gagal terbuka); perubahan entri
            │    dicatat dengan tanggal. Daftar lengkap 592 layanan TIDAK
            │    ditulis manual di kode — kode membaca file bootstrap yang
            │    di-cache, sehingga penambahan TLD baru oleh IANA ikut
            │    tanpa perubahan kode.
            │
            ├─ [TIDAK BERUBAH] Pemindaian sinyal + scoring
            │    • Umur domain (RDAP), connect-wallet, signing code, bahasa
            │      iming-iming, kode tersamar, tautan resmi, alamat kontrak,
            │      daftar domain drainer (solbarn.cc, sharkmoon.tech —
            │      termasuk di rantai redirect)
            │    • Skor 0–100 transparan per sinyal; pemetaan vonis ke
            │      klasifikasi 4 tingkat (CLASSIFICATION.md) tidak berubah
            │
            ├─ [TIDAK BERUBAH] Penyimpanan hasil
            │    • SATU baris ke tabel checks HANYA bila pemeriksaan benar-
            │      benar dilakukan (fetch terjadi). Baris berisi final_url,
            │      http_status, page_title, skor, sinyal, rantai redirect —
            │      sama seperti sekarang
            │    • URL yang DITOLAK guard: TIDAK disimpan ke tabel checks
            │      (lihat §A.6). Upaya yang diblokir dicatat di log keamanan
            │      terpisah (hash URL + alasan + waktu — tanpa isi respons)
            │
            └─ Kembalikan ke pengguna:
                 • Hasil normal: verdict + skor + sinyal + bukti (tidak berubah)
                 • Penolakan guard: respons penolakan aman (§A.6)
```

### A.1a Allowlist redirect RDAP (v2 — bukan wildcard)

Aturan lengkap ada di kotak §A.1 di atas; ringkasnya di sini sebagai jangkar
untuk semua referensi §A.1a di dokumen ini:

- **Sumber:** IANA RDAP bootstrap registry — `https://data.iana.org/rdap/dns.json`
  (592 layanan, diunduh dan dibaca 7 Nov 2026), `ipv4.json`/`ipv6.json` (5 RIR),
  `asn.json`. Bukan wildcard, bukan "*.rdap.org" sembarangan.
- **Aturan:** redirect RDAP HANYA boleh menuju origin yang tercantum dalam
  bootstrap registry untuk TLD yang bersangkutan (cocok persis pada
  scheme+host+path-prefix); `rdap.org` selalu diizinkan sebagai titik awal;
  5 RIR (`rdap.arin.net`, `rdap.apnic.net`, `rdap.db.ripe.net`,
  `rdap.lacnic.net`, `rdap.afrinic.net`) diizinkan untuk lookup berbasis IP;
  entri `http://` DITOLAK (RDAP hanya HTTPS); host di luar daftar → redirect
  DITOLAK, lookup jadi "umur domain tidak diketahui".
- **Semua redirect RDAP tetap melalui DNS validation + IP pinning** — sama
  seperti redirect URL biasa (§A.2a, §A.3).
- **Pemeliharaan:** file bootstrap di-cache server-side, diunduh ulang
  semingguan (atau bila ada TLD baru yang gagal RDAP); bila unduhan gagal,
  pakai cache terakhir dan catat di log; daftar lengkap 592 layanan TIDAK
  ditulis manual di kode.

### A.1b DNS: API resolver, TTL, dan masa berlaku pinning (v2.1)

- **API resolver yang DITETAPKAN:** `dns/promises` `resolve4(hostname,
  { ttl: true })` dan `resolve6(hostname, { ttl: true })` — satu-satunya
  API yang mengembalikan TTL per alamat (`[{ address, ttl }]`).
  **Bukti** (`SSRF_SPIKE_V21.md` TEST 3, Node v24.22.1):
  `resolve4('example.com', {ttl:true})` → `[{"address":"198.18.228.151",
  "ttl":15}]`; `resolve6` di sandbox mengembalikan `ENODATA` (dicatat,
  bukan kegagalan API); `dns.lookup({all:true})` mengembalikan
  `[{"address":"198.18.228.151","family":4}]` — **TIDAK ada field TTL**.
  Karena itu `dns.lookup` TIDAK BOLEH dipakai untuk resolve yang
  membutuhkan TTL; `lookup` hanya dipakai bila dibutuhkan perilaku
  `verbatim` (mis. di dalam callback `lookup` Agent pinning — dan di
  sana pun TTL tidak relevan karena IP sudah divalidasi sebelumnya).
- **TIDAK ADA caching DNS antar pemeriksaan.** Rancangan ini secara
  eksplisit TIDAK mengklaim TTL-aware caching: tidak ada cache hasil
  resolve yang dipakai ulang antar hop atau antar pemeriksaan. Setiap hop
  melakukan resolve segar. TTL yang diterima DICATAT (di log, bersama
  daftar IP) untuk observabilitas — dan TIDAK dipakai sebagai dasar
  keputusan blokir semata (TTL rendah saja bukan bukti jahat; rebinding
  sudah ditangani oleh pinning, bukan oleh TTL).
- **Masa berlaku pinning:** pin (daftar IP yang divalidasi) berlaku
  HANYA selama satu hop fetch yang memakainya. Begitu hop selesai
  (respons diterima, redirect diikuti, atau hop gagal), pin kedaluwarsa;
  hop berikutnya WAJIB resolve segar. Tidak ada pin yang dipakai ulang
  antar hop, antar redirect, atau antar pemeriksaan — ini menutup celah
  "pin kedaluwarsa lalu DNS berubah" secara konstruksi.
- **Kegagalan resolve:** bila `resolve4` dan `resolve6` keduanya gagal
  (NXDOMAIN / timeout / ENODATA untuk keduanya) → tolak (fail-closed),
  jangan lanjutkan dengan "coba fetch saja". Bila hanya satu keluarga
  yang gagal (mis. hanya AAAA yang ENODATA) → lanjutkan dengan keluarga
  yang berhasil; catat di log.

### A.1c Pencocokan allowlist RDAP: parsing URL ketat (v2.1)

Pencocokan origin + path-prefix pada allowlist RDAP (§A.1a) WAJIB memakai
parsing WHATWG URL (`new URL()`), **bukan pencocokan string sederhana**
(`includes`/`startsWith` pada URL mentah). **Bukti**
(`SSRF_SPIKE_V21.md` TEST 4, 20/20 PASS): matcher ketat meloloskan 8
kasus legit dan menolak 12 kasus serangan; matcher naif `includes()`
salah pada **12 dari 20 kasus** (antara lain meloloskan
`rdap.verisign.com.evil.com`, `com-evil`, userinfo, port 8443, path huruf
besar, dot-segment, dan host evil dengan string allowlist di query).

Aturan matcher (mengikat untuk URL awal RDAP DAN setiap hop redirect RDAP):

1. Parse dengan `new URL()`; bila gagal parse → tolak.
2. Skema HARUS `https:` (entri `http://` dalam registry ditolak — §A.1a).
3. Tolak bila ada userinfo (`username`/`password` tidak kosong) — host
   sebenarnya adalah bagian setelah `@`.
4. Hostname dibandingkan PERSIS (setelah lowercase; URL sudah
   me-lowercase host) setelah strip SATU trailing dot FQDN
   (`rdap.verisign.com.` → `rdap.verisign.com`). Tidak ada suffix match,
   tidak ada wildcard.
5. Port HARUS kosong atau `443` (port default HTTPS). Port lain → tolak.
6. Path HARUS sama persis dengan prefix entri, ATAU diawali prefix + `/`
   (segment-aware — prefix tanpa slash akhir wajib diikuti `/`). Contoh:
   prefix `/com/v1/` cocok dengan `/com/v1/domain/x` dan `/com/v1/`,
   tetapi TIDAK cocok dengan `/com-evil/v1/` atau `/comv1/`.
7. Path bersifat case-sensitive: `/COM/V1/` DITOLAK (fail-closed —
   path RDAP case-sensitive).
8. Dot-segment (`/com/v1/../evil`) dinormalisasi oleh parser URL menjadi
   `/com/evil` SEBELUM pencocokan — hasilnya tidak cocok → tolak.
9. Path yang mengandung escape persen (`/%63om/v1/`) TIDAK di-decode
   sebelum pencocokan — `pathname` apa adanya tidak cocok → tolak.
10. Query dan fragment diabaikan dalam pencocokan (tidak memengaruhi
    keputusan).

Matcher ini diuji unit dengan 20 kasus di atas (RD-01..RD-20, §D.4.7
v2.1); setiap perubahan allowlist atau matcher WAJIB mengulang ke-20
kasus itu.

### A.2 IP pinning — mekanisme yang benar (inti rancangan ini)

**Masalah yang harus dipecahkan.** Pola yang SALAH dan masih sering ditulis:

```text
const addrs = await dns.lookup(host, { all: true });  // resolve sekali
if (addrs.some(isBlocked)) throw ...;
await fetch(url);   // ❌ SALAH: fetch me-resolve ulang hostname sendiri.
                    //    Resolver fetch dapat mengembalikan IP berbeda
                    //    (DNS rebinding / TOCTOU). Validasi di atas sia-sia.
```

Validasi DNS hanya bermakna bila **soket yang dibuka terhubung ke IP yang
sudah divalidasi**. Ada tiga pendekatan; rancangan ini merekomendasikan
**Pendekatan 1** sebagai utama, dengan **Pendekatan 2** sebagai fallback bila
runtime tidak mendukungnya, dan **Pendekatan 3** sebagai lapisan infra (P2).

#### Pendekatan 1 (UTAMA — TERBUKTI di spike v2): custom lookup pada HTTP agent

- Prinsip: berikan ke stack HTTP sebuah fungsi `lookup(hostname)` yang
  **mengembalikan persis IP yang sudah divalidasi** (dan hanya itu), sehingga
  resolver internal fetch tidak pernah dipanggil untuk hostname tersebut.
- **Hasil spike (v2, `SSRF_SPIKE_RUNTIME.md`):** di runtime Bun 1.4.4, Node
  `http.Agent` / `https.Agent` menerima opsi `lookup` dan lookup TERBUKTI
  dihormati — untuk HTTP (`B1-fixed`: `200:srv-ok host=pinned.test:18080`)
  maupun HTTPS dengan verifikasi sertifikat terhadap hostname asli (`W2`:
  `200:tls-ok host=test.example:18443`; hostname mismatch DITOLAK dengan
  `ERR_TLS_CERT_ALTNAME_INVALID` pada `W3`). **Jalur ini memakai API
  `http`/`https` Node — BUKAN `fetch` global** (lihat §A.2a).
- **Koreksi v1:** rancangan v1 menyebut undici (`new Agent({ connect: {
  lookup } })`) sebagai salah satu jalan Pendekatan 1. Spike membuktikan
  API itu **tidak berlaku di undici v7** (gagal `Invalid IP address:
  undefined`); cara undici v7 yang benar adalah `.compose()` +
  `interceptors.dns({ lookup })` — dan cara itu hanya terbukti di Node 24,
  bukan di runtime Bun (Bun tidak memiliki undici bawaan). **Undici TIDAK
  dijadikan dependensi utama di runtime Bun.** Bila di masa depan dibutuhkan
  fetcher Node terpisah, undici v7 via `.compose()` adalah opsi yang
  terbukti — lihat §A.2a.
- Aturan implementasi dari spike (wajib):
  1. Callback `lookup` HARUS menghormati `options.all`: Bun memanggil
     lookup dengan `options = {hints:32, all:true}` — kembalikan array
     `[{address, family}]` bila `all` benar, alamat tunggal bila tidak.
     Callback yang selalu mengembalikan alamat tunggal gagal
     (`ERR_INVALID_IP_ADDRESS`, B1).
  2. Lookup TIDAK BOLEH memanggil DNS sistem untuk hostname yang diperiksa:
     ia mengembalikan persis IP yang sudah divalidasi oleh
     `resolveAndCheck()` (pinning), bukan hasil resolve ulang.
  3. Satu agent sekali pakai per pemeriksaan (atau per hop), dengan lookup
     yang mengembalikan daftar IP lolos itu — pilih satu secara
     deterministik dan catat pilihannya.
- Alur per hop:
  1. `resolveAndCheck(host)` → daftar IP lolos (mis. `[93.184.216.34]`).
  2. Buat agent sekali pakai dengan `lookup` yang mengembalikan IP itu
     (pilih satu; bila ada beberapa IP lolos, pilih satu secara deterministik
     — mis. yang pertama — dan catat pilihannya; JANGAN melakukan round-robin
     ke IP yang belum divalidasi).
  3. Fetch dengan dispatcher agent tersebut.
- Kelebihan: TLS tetap bekerja normal — SNI dan verifikasi sertifikat memakai
  **hostname asli**, karena URL yang di-fetch tetap `https://hostname/...`
  (hanya resolusi alamatnya yang dipin). Tidak ada Host-header manual, tidak
  ada risiko sertifikat untuk IP literal. HTTP/2 dan virtual hosting tetap
  bekerja.
- Kekurangan: bergantung pada kemampuan runtime menyediakan custom lookup.
  `fetch` global (WHATWG) tidak menerima agent/dispatcher — TERBUKTI di
  spike: `Bun.fetch` mengabaikan opsi `dispatcher` secara diam-diam (B2b)
  dan tidak ada jalan custom lookup lewat `fetch` global. Karena itu jalur
  terp-pin HARUS memakai `http`/`https.request` secara eksplisit (bukan
  `undici.request` — lihat koreksi di atas). **Spike P0-1a SUDAH membuktikan
  runtime Bun 1.4.4 mendukung lookup kustom** (B1-fixed, W2, W3); yang masih
  wajib adalah uji ulang di staging artifact produksi (U-1 laporan spike),
  karena spike dijalankan pada Bun CLI di VM — bukan pada runtime artifact
  produksi. Bila uji staging produksi membuktikan lookup TIDAK didukung di
  sana → jatuh ke Pendekatan 2, atau ke alternatif §A.2a (fetcher terpisah /
  egress proxy).

#### Pendekatan 2 (FALLBACK — TERBUKTI di spike v2): koneksi literal ke IP + Host header + SNI manual

- Prinsip: ganti hostname di URL dengan IP literal yang sudah divalidasi,
  lalu pulihkan identitas hostname lewat header dan TLS:
  1. `https://93.184.216.34/path` dengan header `Host: hostname-asli`.
  2. TLS: `servername` (SNI) = hostname asli, dan verifikasi sertifikat
     terhadap hostname asli (bukan terhadap IP) — JANGAN menonaktifkan
     verifikasi sertifikat (`rejectUnauthorized: false` adalah **dilarang
     keras**; itu menukar SSRF dengan MITM).
  3. Untuk IPv6 literal, URL memakai bracket: `https://[2606:4700::...]/`.
- **Hasil spike (v2):** TERBUKTI di Bun 1.4.4 lewat `Bun.fetch` dengan opsi
  `tls: { serverName }` — `W1`: fetch ke IP literal + `tls.serverName =
  'test.example'` berhasil (`status=200`, sertifikat diverifikasi terhadap
  hostname asli); `W5`: override header `Host` diizinkan Bun (server
  melihat `Host: test.example`); `V3`: fetch ke IP literal TANPA
  `serverName` DITOLAK (`ERR_TLS_CERT_ALTNAME_INVALID`) — verifikasi aktif.
  Juga TERBUKTI lewat `Bun.connect` socket (`V1`: tulis di handler `open`,
  `data 9ms: HTTP/1.1 200 OK`; `V4`: Bun↔Bun TLS normal) dan lewat
  Node `https.request` (`T3a`: IP literal + `servername` + `Host` →
  `authorized=true`; `T3c`: `servername` SALAH → `ERR_TLS_CERT_ALTNAME_INVALID`).
- **Peringatan spike yang wajib ditaati:**
  - `servername` HARUS diisi eksplisit di semua jalur. Node terbukti
    menurunkan SNI dari header `Host` bila `servername` tidak diisi (T3b:
    request tanpa `servername` BERHASIL karena `Host: test.example`
    dipakai sebagai SNI; tanpa header `Host` request yang sama DITOLAK).
    Perilaku implisit ini TIDAK BOLEH diandalkan — ia dapat berbeda antar
    versi runtime dan menyembunyikan hilangnya verifikasi hostname.
  - Pada `Bun.connect`, tulis HANYA di dalam handler `open` (setelah
    handshake TLS selesai). Menulis sebelum `open` tidak diteruskan
    (B3: tidak ada respons dalam 2–8 detik — artefak cara uji, bukan
    kegagalan TLS).
  - Verifikasi sertifikat terhadap hostname asli TERBUKTI aktif di semua
    jalur (V3, W3, T3c) — dan `rejectUnauthorized: false` TIDAK PERNAH
    dibutuhkan dalam satu pun uji yang lolos.
- Kelebihan: tidak bergantung pada custom lookup; bekerja di runtime apa pun
  yang mengizinkan koneksi TCP/TLS manual.
- Kekurangan / risiko yang harus ditangani:
  - HTTP/2: otoritas (`:authority`) harus hostname asli, bukan IP — perlu
    penanganan eksplisit; bila tidak bisa, paksa HTTP/1.1 untuk fetch ini.
    (Tidak diuji dalam spike — server uji memakai HTTP/1.1; lihat U-3
    laporan spike.)
  - Virtual hosting berbasis SNI/Host yang tidak konsisten dapat mengembalikan
    konten host lain — mitigasi: SNI dan Host header SELALU hostname asli,
    dan tolak bila sertifikat tidak cocok dengan hostname asli.
  - Redirect `Location` relatif harus di-resolve terhadap URL hostname asli,
    bukan URL IP literal (simpan URL kanonik hostname secara terpisah dari
    URL koneksi).
  - Lebih banyak kode rawan salah — karena itu pendekatan ini adalah fallback,
    bukan utama.
- Keputusan: **Pendekatan 1 adalah utama; Pendekatan 2 adalah fallback** —
  diputuskan dari hasil spike (§A.2a). Kedua pendekatan harus lolos
  **uji pinning** yang sama (§D.4): DNS yang membalik jawaban antara resolve
  pertama dan kedua harus tetap menghasilkan koneksi ke IP pertama (yang
  divalidasi) — atau penolakan.

#### Pendekatan 3 (LAPISAN INFRA, P2): egress proxy / fetcher terisolasi

- Fetcher berjalan di subnet tanpa rute ke jaringan internal; egress hanya
  lewat proxy yang menerapkan allowlist DNS dan memblokir metadata cloud di
  firewall/security group.
- Ini adalah pertahanan **kedua**, bukan pengganti guard di kode: bila guard
  kode lolos (bug), infra masih menahan. Sebaliknya, infra saja tanpa guard
  kode tidak cukup — guard akan ikut terbawa saat migrasi stack, infra belum
  tentu.
- Di luar ruang lingkup P0/P1; dicatat sebagai P2 karena butuh akses infra
  yang saat ini tidak tersedia/didokumentasikan.

### A.2a Hasil spike runtime (v2) dan alternatif bila pinning tidak didukung

Rincian lengkap: `SSRF_SPIKE_RUNTIME.md` (7 Nov 2026). Ringkasan putusan:

| Pendekatan | Putusan | Bukti spike |
| --- | --- | --- |
| Pendekatan 1 — custom lookup (Node `http`/`https` Agent `lookup` di Bun) | ✅ TERBUKTI — UTAMA | B1-fixed, W2, W3 |
| Pendekatan 2 — IP literal + SNI (Bun.fetch `tls.serverName` + header `Host`) | ✅ TERBUKTI — FALLBACK | W1, W5, T3a, T3c |
| Pendekatan 2 — IP literal + SNI (Bun.connect socket, tulis di `open`) | ✅ TERBUKTI dengan catatan — butuh HTTP manual | V1, V4 |
| Custom lookup via `fetch` global | ❌ TIDAK DIDUKUNG | B2a, B2b |
| undici v7 dns interceptor (Node) | ✅ TERBUKTI di Node 24, hanya via `.compose()` | T1, T1b, T2, T2c |
| Egress proxy via `Bun.fetch({ proxy })` | ✅ TERBUKTI dihormati | B6 |

**Yang dinyatakan TIDAK AMAN dan dilarang:** pola "resolve lalu `fetch`
biasa" (teater keamanan — TOCTOU/DNS rebinding); `rejectUnauthorized:
false` dalam pendekatan apa pun; mengandalkan penurunan SNI implisit dari
header `Host` (T3b); callback `lookup` yang mengabaikan `options.all`
(B1); menulis ke socket `Bun.connect` sebelum handler `open` (B3).

**Bila di staging produksi ternyata TIDAK ADA pendekatan yang didukung**
(skenario yang sudah tidak terjadi di Bun CLI, tetapi wajib disiapkan —
lihat U-1 laporan spike), evaluasi dua alternatif berikut secara jujur:

| Alternatif | Cara kerja | Pro | Kontra | Putusan |
| --- | --- | --- | --- | --- |
| **Fetcher terpisah** | Proses/komponen fetch khusus (Node 24 + undici v7 via `.compose()` + `interceptors.dns`, ATAU Node `https` Agent `lookup`) yang menerima hanya URL + IP yang sudah divalidasi dari proses utama, melakukan koneksi terp-pin, dan mengembalikan body + metadata. Komunikasi antar proses lewat channel lokal yang diautentikasi (bukan HTTP terbuka). | Pinning TERBUKTI di Node 24 (T1, T1b, T2, T2c); mengisolasi kode fetch berbahaya dari proses utama; dapat diuji dan di-restart independen. | Biaya operasional: satu proses tambahan + IPC + deployment; permukaan baru (channel IPC harus diautentikasi — bila tidak, menjadi SSRF lewat jalur lain); latensi antar proses; perlu penjaga agar fetcher tidak dapat dipanggil langsung oleh pengguna. | **Rencana cadangan pertama.** Dipilih bila staging produksi membuktikan Agent `lookup` Bun tidak bekerja di sana. Estimasi tambahan: +Besar (lihat §F v2). |
| **Egress proxy** | Semua koneksi keluar scanner lewat proxy egress khusus yang memvalidasi tujuan sendiri (resolve + tolak privat/metadata + pin) sebelum meneruskan; scanner tidak lagi membuka koneksi langsung. | Satu titik kontrol untuk semua egress; pertahanan berlaku bahkan bila guard kode lolos; opsi `proxy` pada `Bun.fetch` TERBUKTI dihormati (B6). | Proxy menjadi komponen kritis baru (harus dibuat/dikonfigurasi/dioperasikan — tidak ada saat ini); proxy yang salah konfigurasi = bypass total; TLS end-to-end lewat proxy butuh CONNECT + verifikasi sertifikat di sisi klien tetap berjalan; biaya infra + latensi. | **Rencana cadangan kedua (P2).** Dipilih bila fetcher terpisah pun tidak memungkinkan, atau sebagai lapisan kedua setelah P0. Bukan pengganti guard di kode. |

**Verifikasi sertifikat TLS tidak boleh dinonaktifkan dalam pendekatan apa
pun** — termasuk kedua alternatif di atas. Setiap alternatif harus lolos uji
yang sama: sertifikat dengan hostname tidak cocok (CA sama) DITOLAK
(`ERR_TLS_CERT_ALTNAME_INVALID`, seperti T2c/W3), dan `rejectUnauthorized:
false` tidak muncul di kode mana pun (diperiksa dengan grep pada review).

### A.3 Di mana guard dipanggil (checklist penempatan)

| Titik | Guard yang dipanggil | Keterangan |
| --- | --- | --- |
| `checkLink` — sebelum apa pun | Rate limit + konkurensi (P1-2) | Sebelum fetch; setelah validasi skema zod |
| `normalizeUrl()` | `checkUrlAllowed()` diperluas (§B.1) | Literal IP/hostname/userinfo/port |
| URL awal → fetch | `resolveAndCheck()` + `fetchWithPinnedIp()` | P0-1 |
| Setiap hop redirect | Seluruh rantai (§A.1) diulang | P0-3 |
| Setiap `<script src>` | (Dinonaktifkan sementara; bila aktif: rantai penuh) | P0-4 / §D.2 |
| `lookupRdap()` | Guard pada setiap hop redirect rdap.org + allowlist RDAP dari IANA bootstrap (§A.1a v2) | P0-3 (bagian RDAP) |
| Penyimpanan `checks` | TIDAK menyimpan hasil dari URL yang ditolak | §A.6 |
| Respons ke pengguna | Respons penolakan aman | §A.6 |

**Aturan penempatan:** guard dipanggil di **satu fungsi pembungkus fetch**
(`fetchGuarded()` — baru, lihat §B) yang dipakai oleh SEMUA jalur fetch
(halaman, redirect, script, RDAP). Tidak boleh ada jalur fetch lain yang
mem-bypass pembungkus ini. Code review harus memverifikasi: `grep` untuk
`fetch(` di `actions.ts` — setelah perbaikan, semua pemanggilan fetch harus
melewati `fetchGuarded()`.

### A.4 Daftar blokir (satu sumber kebenaran)

Satu modul — `src/scanner/ssrf-guard.ts` (diperluas, §B.4) — menjadi satu-satunya
tempat daftar blokir didefinisikan. Kode live mengimpor dari modul ini (atau
salinannya yang setara di artifact), bukan mendefinisikan ulang daftar di
tempat lain.

**Sumber klasifikasi (v2):** daftar ini diturunkan dari **IANA Special-Purpose
Address Registries** — IPv4 dan IPv6 — yang diunduh dan dibaca pada 7 Nov 2026
(terakhir diperbarui IANA **9 Oktober 2025**):
- `https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.txt`
- `https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.txt`

Aturan penurunan: **blokir semua rentang yang kolom `Globally Reachable`-nya
FALSE** (atau yang kolom `Destination`-nya FALSE), DITAMBAH rentang yang secara
eksplisit diputuskan pemilik (CGNAT). Rentang dengan `Globally Reachable:
TRUE` (mis. anycast `192.0.0.9/32`, `192.0.0.10/32`, `192.31.196.0/24`,
`192.52.193.0/24`) TIDAK diblokir secara individual — tetapi seluruh
`192.0.0.0/24` diblokir sebagai blok (IANA: "not useable unless by virtue
of a more specific reservation"), sehingga anycast di dalamnya ikut
terblokir; ini dicatat sebagai keputusan sadar (bukan kelalaian), karena
tidak ada server web legit yang dijangkau publik dari `192.0.0.0/24`.

#### A.4.1 IPv4 — yang diblokir (tujuan)

| Rentang | Nama (IANA) | RFC |
| --- | --- | --- |
| `0.0.0.0/8` | This network | RFC 791 |
| `10.0.0.0/8` | Private-Use | RFC 1918 |
| `100.64.0.0/10` | Shared Address Space (CGNAT) | RFC 6598 — **diblokir per keputusan pemilik v2** |
| `127.0.0.0/8` | Loopback | RFC 1122 |
| `169.254.0.0/16` | Link Local (termasuk metadata `169.254.169.254`) | RFC 3927 |
| `172.16.0.0/12` | Private-Use | RFC 1918 |
| `192.0.0.0/24` | IETF Protocol Assignments (blok penuh, lihat catatan di atas) | RFC 6890 |
| `192.0.2.0/24` | Documentation (TEST-NET-1) | RFC 5737 |
| `192.168.0.0/16` | Private-Use | RFC 1918 |
| `198.18.0.0/15` | Benchmarking | RFC 2544 |
| `198.51.100.0/24` | Documentation (TEST-NET-2) | RFC 5737 |
| `203.0.113.0/24` | Documentation (TEST-NET-3) | RFC 5737 |
| `240.0.0.0/4` | Reserved | RFC 1112 |
| `255.255.255.255/32` | Limited Broadcast | RFC 919 |

#### A.4.2 IPv6 — yang diblokir (tujuan)

| Rentang | Nama (IANA) | RFC |
| --- | --- | --- |
| `::1/128` | Loopback Address | RFC 4291 |
| `::/128` | Unspecified Address | RFC 4291 |
| `::ffff:0:0/96` | IPv4-mapped Address | RFC 4291 — **dikonversi ke IPv4 tertanam lalu divalidasi terhadap tabel IPv4** (§A.4.3) |
| `64:ff9b::/96` | IPv4-IPv6 Translation (NAT64 Well-Known Prefix) | RFC 6052 — **ekstrak IPv4 tertanam (32 bit terakhir) lalu validasi terhadap tabel IPv4** (§A.4.3) |
| `64:ff9b:1::/48` | IPv4-IPv6 Translation (NAT64 local-use) | RFC 8215 + RFC 6052 §2.2 — **KOREKSI v2.1:** IPv4 TIDAK di 32 bit terakhir; 16 bit di bit 48..63 (byte 6..7) + 16 bit di bit 72..87 (byte 9..10), oktet "u" byte 8 WAJIB 0 (bila ≠ 0 → malformed, tolak). Ekstrak lalu validasi terhadap tabel IPv4 (§A.4.3 butir 2) |
| `100::/64` | Discard-Only Address Block | RFC 6666 |
| `100:0:0:1::/64` | Dummy IPv6 Prefix | RFC 9780 |
| `2001::/32` | TEREDO | RFC 4380 — **ekstrak IPv4 tertanam (32 bit terakhir) lalu validasi** (§A.4.3) |
| `2001:2::/48` | Benchmarking | RFC 5180 |
| `2001:10::/28` | Deprecated (previously ORCHID) | RFC 4843 |
| `2001:20::/28` | ORCHIDv2 | RFC 7343 |
| `2001:db8::/32` | Documentation | RFC 3849 |
| `2002::/16` | 6to4 | RFC 3056 — **ekstrak IPv4 tertanam (bit 16–47) lalu validasi** (§A.4.3) |
| `3fff::/20` | Documentation | RFC 9637 |
| `fc00::/7` | Unique-Local (ULA) | RFC 4193 |
| `fd00:ec2::254/128` | AWS EC2 instance metadata (IPv6) — BUKAN entri IANA; sumber: dokumentasi AWS | AWS docs |
| `fe80::/10` | Link-Local Unicast | RFC 4291 |
| `ff00::/8` | Multicast | RFC 4291 |

Tidak diblokir (dan dicatat alasannya): `2001::/23` IETF Protocol
Assignments (blok payung dengan banyak pengecualian spesifik yang
`Globally Reachable: TRUE`, mis. `2001:1::1/128`, `2001:1::2/128`,
`2001:4:112::/48`, `2620:4f:8000::/48`) — yang diblokir adalah
sub-rentang spesifik di atas (`2001::/32`, `2001:2::/48`,
`2001:10::/28`, `2001:20::/28`, `2001:db8::/32`), bukan seluruh
`2001::/23`, agar tidak memblokir layanan anycast legit. `2001:30::/28`
(Drone Remote ID DETs) dan `5f00::/16` (SRv6 SIDs) juga tidak diblokir
(`Globally Reachable: TRUE` menurut IANA) — keduanya bukan alamat server
web, tetapi pemblokirannya tidak dibenarkan oleh registry; bila di masa
depan terbukti disalahgunakan, tambahkan sebagai entri khusus dengan
catatan.

#### A.4.3 Aturan khusus: prefiks translasi, IPv4-mapped, dan zone identifier

1. **IPv4-mapped IPv6** (`::ffff:a.b.c.d`): konversi ke IPv4 tertanam,
   lalu validasi terhadap tabel IPv4 (§A.4.1). `::ffff:127.0.0.1` DITOLAK
   (loopback); `::ffff:93.184.216.34` DIIZINKAN.
2. **NAT64 — KOREKSI v2.1 (RFC 6052 §2.2).** Aturan v2 ("ekstrak IPv4
   tertanam di 32 bit terakhir" untuk kedua prefix) **SALAH untuk
   `64:ff9b:1::/48`** dan diperbaiki di sini. Format RFC 6052 §2.2:
   IPv4 dikodekan mengikuti prefix, most significant bits first, dengan
   oktet "u" yang dicadangkan di bit 64..71 yang WAJIB nol — sehingga
   posisi IPv4 bergantung pada panjang prefix:
   - **`64:ff9b::/96` (WKP):** IPv4 = 32 bit terakhir (byte 12..15).
     `64:ff9b::7f00:1` (= 127.0.0.1) DITOLAK; `64:ff9b::5db8:d822`
     (= 93.184.216.34) DIIZINKAN.
   - **`64:ff9b:1::/48` (local-use, RFC 8215):** IPv4 = 16 bit pertama di
     bit 48..63 (byte 6..7), lalu oktet "u" di bit 64..71 (byte 8, WAJIB
     0), lalu 16 bit terakhir di bit 72..87 (byte 9..10). Contoh Tabel 1
     RFC 6052: prefix `2001:db8:122::/48` + `192.0.2.33` →
     `2001:db8:122:c000:2:2100::` (`c000` = 192.0, `00` = u, `0221` =
     2.33). Bila byte 8 ≠ 0, alamat MALFORMED → tolak (fail-closed),
     jangan ekstrak.
   - **Dampak bug v2 (terbukti di `SSRF_SPIKE_V21.md` TEST 1, 10/10
     PASS):** aturan "32 bit terakhir" untuk /48 memblokir `8.8.8.8`
     yang sah — `64:ff9b:1:808:8:800::` diekstrak menjadi `0.0.0.0` →
     BLOCK (false positive) — DAN meloloskan `192.168.1.1` yang
     disembunyikan di suffix — `64:ff9b:1:c0a8:1:100:5db8:d822`
     diekstrak menjadi `93.184.216.34` → ALLOW (bypass). Aturan benar
     mengekstrak `192.168.1.1` → BLOCK pada kedua kasus.
   - IANA mencatat `64:ff9b::/96` sebagai `Globally Reachable: TRUE` —
     karena itu prefiksnya sendiri TIDAK diblokir; yang divalidasi
     adalah IPv4 hasil translasi. Hal yang sama berlaku untuk /48.
   - Catatan: guard hanya mengekstrak untuk DUA prefix NAT64 yang
     dikenal di atas. Prefix translasi network-specific (NSP) lain di
     luar kedua prefix ini TIDAK diekstrak — risikonya dicatat di §G
     (U-11).
3. **TEREDO** (`2001::/32`) dan **6to4** (`2002::/16`): keduanya
   menanamkan alamat IPv4 (TEREDO: 32 bit terakhir; 6to4: bit 16–47).
   Prefiks DIBLOKIR penuh (sesuai tabel) — tidak perlu ekstraksi, karena
   kedua mekanisme transisi ini tidak dipakai oleh server web publik yang
   sah untuk dijangkau scanner.
4. **IPv6 zone identifier** (`%eth0`, mis. `fe80::1%eth0`, atau
   `http://[fe80::1%25eth0]/` dalam URL): zone ID adalah artefak antarmuka
   lokal dan TIDAK PERNAH valid sebagai tujuan internet. Aturan: (a) bila
   hostname mengandung `%` (atau `%25` yang ter-decode menjadi `%`),
   tolak SEBELUM resolve — URL dengan zone ID tidak pernah di-fetch;
   (b) `URL.hostname` yang mengandung `%` setelah parsing juga ditolak;
   (c) zone ID TIDAK PERNAH di-strip lalu dilanjutkan — strip-and-continue
   akan mengubah `fe80::1%eth0` menjadi `fe80::1` yang tetap terlarang,
   tetapi mengubah `::1%lo` menjadi `::1` yang juga terlarang; tidak ada
   kasus di mana strip menghasilkan alamat yang sah dan diinginkan.
5. **Bentuk IP literal non-desimal** (integer `2130706433`, oktal
   `0177.0.0.1`, heksadesimal `0x7f.0.0.1`/`0x7f000001`, bentuk pendek
   `127.1`): dinormalisasi ke bentuk kanonik desimal bertitik DAHULU
   (`normalizeIpLiteral()`), baru dicocokkan ke tabel. Bentuk yang tidak
   dapat dinormalisasi dengan pasti DITOLAK (fail-closed).
6. **Hostname terlarang** (selain alamat): `localhost` (termasuk
   `*.localhost`), `metadata.google.internal`, dan `metadata.*` (semua
   subdomain `metadata`) — suffix match, bukan hanya dua hostname eksak.
   Juga tolak hostname yang setelah decode IDNA/punycode menjadi salah
   satu dari pola di atas.

#### A.4.4 Pemeliharaan daftar blokir (cara pembaruan)

| Aspek | Ketentuan |
| --- | --- |
| Sumber | IANA Special-Purpose Address Registries (IPv4 + IPv6) — URL di atas. TIDAK memakai daftar dari blog/daftar pihak ketiga tanpa dasar registry. |
| Frekuensi | Diperiksa **setiap 6 bulan** (Januari dan Juli) dan setiap kali ada insiden SSRF baru atau perubahan besar IANA. Terakhir diperbarui IANA: 9 Okt 2025; terakhir dibaca tim: 7 Nov 2026. |
| Penanggung jawab | Pemilik proyek (Rama) menunjuk peninjau; implementor menjalankan pemeriksaan dan mencatat hasilnya di `SECURITY_REQUIREMENTS.md` §3.2. |
| Proses | (1) Unduh ulang kedua file registry; (2) bandingkan entri dengan tabel §A.4.1–§A.4.2; (3) entri baru dengan `Globally Reachable: FALSE` masuk ke daftar blokir; (4) entri yang DIHAPUS dari registry ditinjau manual sebelum dihapus dari daftar (jangan hapus otomatis — penghapusan registry belum tentu berarti alamat itu aman); (5) perubahan dicatat dengan tanggal + sumber + alasan di commit dan di dokumen ini. |
| Uji setelah pembaruan | Uji unit guard diulang (kasus lama + kasus untuk entri baru) dan 3 URL acuan diuji ulang di staging sebelum cutover. |
| Pengecualian | Pengecualian apa pun (mis. CGNAT diizinkan di masa depan) HARUS dicatat eksplisit dengan alasan, tanggal, dan persetujuan pemilik — tidak ada pengecualian diam-diam. |

Catatan: guard fondasi saat ini (`ssrf-guard.ts`) baru mencakup sebagian dari
tabel ini (belum ada ULA, multicast, `0.0.0.0/8` ada, CGNAT belum ada, dan
`metadata.*` hanya dua hostname eksak; belum ada NAT64/TEREDO/6to4, zone
identifier, dan bentuk IP non-desimal). Perluasan ini adalah bagian dari P0-1.

### A.5 Anggaran sumber daya per pemeriksaan (resource budget) — v2

| Batas | Nilai rancangan | Status |
| --- | --- | --- |
| Timeout per hop | 12 detik (dipertahankan dari kode live) | P0 — lantai yang sudah ada |
| Timeout global per `checkLink` | **20 detik total** (semua hop + script + RDAP) — **disetujui pemilik v2** | P1-1 (baru) — dan menjadi **syarat cutover** (§D.5 v2): scanner tidak dibuka kembali bila ini belum siap |
| Timeout DNS resolve | 5 detik per resolve | P0-1 (baru) |
| Maks redirect | 6 hop (dipertahankan) | Tidak berubah |
| Maks ukuran body halaman | 400 KB **byte aktual setelah dekompresi** (abort streaming bila terlampaui) | P1-1 (baru; saat ini hanya potong pasca-download) |
| Maks ukuran body script | 300 KB per script **setelah dekompresi** (bila script diaktifkan kembali) | P1-1 |
| Maks script src yang di-fetch | 0 selama mitigasi; 3 bila diaktifkan kembali | P0-4 / P1-3 |
| Content-Type yang dipindai | `text/html`, `application/xhtml+xml`, `text/plain` (dan `*/*` hanya bila tidak ada header?) — lihat catatan | P1-1 |
| Port tujuan | **80 (http) dan 443 (https) saja — disetujui pemilik v2** | P1-3 (diterapkan bersama P0-5) |
| Rate limit | **10/menit + 100/jam per IP — disetujui pemilik v2** (lihat §A.7 v2) | P1-2 |
| Konkurensi | **5 pemeriksaan bersamaan GLOBAL** (bukan per instance) via lease DB bersama `scan_leases` — saat penuh tolak langsung 429, tanpa antrean lintas instance (§A.7.2 v2.1) | P1-2 |

**Batas ukuran dihitung dari byte AKTUAL setelah dekompresi (v2 — terbukti
di spike W6).** `Content-Length` TIDAK BOLEH dipakai sebagai batas:
server dapat mengirim `Content-Encoding: gzip` dengan `Content-Length:
1004` yang mengembang menjadi 1.000.000 byte (terbukti di spike: reader
membatalkan pada 524.288 byte terdekompresi). Mekanisme yang benar:
- Jangan memakai `res.text()` / `res.arrayBuffer()` (memuat seluruh body
  ke memori sebelum dipotong — perilaku kode live saat ini).
- Baca lewat `ReadableStream` reader; hitung `byteLength` tiap chunk
  **setelah** dekompresi (fetch/decompressor sudah mengembalikan byte
  terdekompresi ke reader — yang dihitung adalah byte yang keluar dari
  reader, bukan `Content-Length` header).
- Bila hitungan melewati batas (400 KB halaman / 300 KB script):
  `reader.cancel()` + abort koneksi + hentikan pemeriksaan dengan status
  "konten melebihi batas" (bukan vonis).
- `Content-Length` tetap dibaca sebagai **sinyal awal**: bila header ada
  dan nilainya > batas, tolak SEBELUM membaca body (hemat bandwidth) —
  tetapi JANGAN jadikan itu satu-satunya batas, karena header dapat
  berbohong (terlalu kecil, atau tidak ada).

**Pembatalan saat timeout global 20 detik tercapai (v2).** Satu
`AbortController` bersama dibuat di awal `runCheck()`; sinyalnya
(`AbortSignal.timeout(20000)` atau controller manual + timer) dibagikan
ke SEMUA tahap. Bila sinyal abort aktif:

| Tahap | Yang dibatalkan | Cara | Setelah abort |
| --- | --- | --- | --- |
| DNS resolve | Lookup yang sedang berjalan | `dns.lookup(host, { signal })` bila runtime mendukung; bila tidak, bungkus lookup dalam `Promise.race` dengan timer abort dan abaikan hasilnya bila timer menang (lookup yang sudah terlanjur berjalan tidak dapat ditarik kembali — dicatat sebagai keterbatasan; lookup dibatasi 5 detik per resolve agar tidak menggantung) | Resolve yang terlambat diabaikan; pemeriksaan berakhir "tidak selesai (timeout)" |
| Koneksi / fetch halaman | Soket + request yang sedang berjalan | `signal` diteruskan ke `http`/`https.request` / `fetchGuarded`; abort menutup soket | Koneksi ditutup; tidak ada body yang diproses |
| Redirect (antar hop) | Loop redirect | Setiap iterasi loop memeriksa `signal.aborted` SEBELUM resolve hop berikutnya; bila abort, loop berhenti | Tidak ada hop baru yang dimulai |
| RDAP | Fetch RDAP yang sedang berjalan | Sinyal yang sama diteruskan ke fetch RDAP | RDAP yang belum selesai dianggap "umur domain tidak diketahui" (perilaku lama bila RDAP gagal) — pemeriksaan tetap dapat selesai dengan sinyal itu |
| Body streaming | Reader body | `reader.cancel()` + abort koneksi | Byte yang sudah terbaca dibuang; memori tidak bertambah |

Sumber daya yang sudah dialokasikan (soket, reader, agent sekali pakai)
DITUTUP eksplisit di blok `finally` — tidak dibiarkan menggantung sampai
GC. Bila timeout global tercapai, hasil yang dikembalikan adalah status
"pemeriksaan tidak selesai (timeout)" — BUKAN vonis keamanan dan BUKAN
"tidak terjangkau" — dan tidak ada baris `checks` yang menyimpan hasil
parsial dari pemeriksaan yang terpotong.

Catatan Content-Type: banyak server tidak mengirim `Content-Type` yang tepat
atau mengirim `text/html` untuk halaman error. Aturan rancangan: bila header
`Content-Type` ada dan **jelas bukan** HTML/teks (octet-stream, video, audio,
zip, image), hentikan pengunduhan dan perlakukan sebagai "tipe konten tidak
didukung" (bukan sebagai vonis). Bila header tidak ada, lanjutkan dengan batas
ukuran streaming sebagai pengaman.

#### A.5.1 Batas dekompresi pada jalur utama Node Agent (v2.1)

Batas 400 KB setelah dekompresi kini **TERBUKTI pada jalur utama yang akan
dipakai implementasi** — Node `http.Agent` dengan custom `lookup` (Pendekatan
1) — bukan hanya pada spike `Bun.fetch` (W6). **Bukti**
(`SSRF_SPIKE_V21.md` TEST 2, 11/11 PASS, Node v24.22.1, server lokal):
bombe gzip (1.003 byte → 1.000.000 byte), deflate (991 byte), dan brotli
(14 byte) semuanya diabort pada **409.600 byte terdekompresi**; bombe gzip
TANPA Content-Length (chunked) tetap diabort pada 409.600 byte — membuktikan
batas dihitung dari stream terdekompresi dan TIDAK bergantung pada
Content-Length.

Penanganan per encoding (mengikat):

| `Content-Encoding` | Penanganan |
| --- | --- |
| `gzip` | Dekompresi via gunzip stream; hitung byte keluar; abort di 400 KB |
| `deflate` | Dekompresi via inflate stream; sama |
| `br` (Brotli) | Dekompresi via brotli stream; sama |
| (tidak ada) / `identity` | Hitung byte mentah; abort di 400 KB |
| Tidak dikenal (mis. `x-custom`) | **Tolak segera** tanpa membaca body ("encoding tidak didukung") — terbukti: 0 byte diproses |
| Beberapa encoding (`gzip, br`) | **Tolak** — rantai encoding ganda tidak didukung di P0/P1; hanya satu encoding yang dikenal yang diterima |

Stream rusak/terpotong (terbukti): gzip dengan magic byte dibalik →
`incorrect header check`, 0 byte, fail-closed; gzip terpotong + FIN →
`unexpected end of file`, fail-closed. Bila kerusakan terdeteksi SETELAH
batas tercapai (korupsi di tengah payload bombe), hasil akhirnya tetap
abort-di-batas — keduanya fail-closed, tanpa vonis, tanpa baris `checks`.
Semua kegagalan dekompresi menghasilkan status "pemeriksaan gagal
(dekompresi)" — BUKAN vonis keamanan.

Content-Length dipakai HANYA sebagai sinyal tolak-awal: bila header ada
dan nilainya > 400 KB → tolak SEBELUM membaca body (terbukti: CL 1.000.000
dengan body kecil valid ditolak dengan 0 byte dibaca). Sebaliknya,
Content-Length kecil yang akurat (1.003 byte untuk bombe gzip) TIDAK
mencegah abort — batas penegakan selalu byte terdekompresi.

#### A.5.2 Timeout global dan pembatalan DNS (v2.1)

**TEMUAN BARU — DNS tidak dapat dibatalkan (NON-CANCELLABLE).** Pengujian
di Node v24.22.1 pada VM ini (`SSRF_SPIKE_V21.md` TEST 3 + uji lanjutan
`dns-signal-check.cjs`) membuktikan: `dns.lookup` (callback MAUPUN
promises) dengan signal yang sudah di-abort SEBELUM pemanggilan TETAP
mengembalikan hasil; abort 5 ms di tengah lookup juga tidak menghentikannya;
`dns.resolve4/6` mengabaikan opsi `signal` sepenuhnya (tidak melempar,
resolve tetap jalan). Apakah ini perilaku umum Node atau efek resolver
lokal VM ini (yang menjawab seketika dari cache) **tidak dapat dibedakan
di sini** — karena itu rancangan ini memperlakukan DNS sebagai
NON-CANCELLABLE dan TIDAK bergantung pada `AbortSignal` untuk DNS.
Uji ulang di staging produksi (U-1) wajib mencakup perilaku signal ini.

Mitigasi untuk lookup yang tidak dapat dibatalkan (mengikat):

1. **Timeout per lookup 5 detik** via `Promise.race(lookup, timer)` —
   bila timer menang, hasil lookup DIABAIKAN (tidak dipakai untuk pinning),
   dan pemeriksaan berakhir "tidak selesai (timeout DNS)".
2. **Semaphore konkurensi lookup** (maks 4 lookup bersamaan secara
   global per proses): lookup yang telat tidak dapat ditarik kembali,
   tetapi jumlahnya dibatasi — lookup tidak dapat menumpuk tanpa batas
   setelah timeout. Lookup yang kehabisan slot antrean dibatasi antrean
   5 detik; bila antrean penuh → tolak pemeriksaan (fail-closed).
3. **Hasil telat diabaikan dan dicatat:** bila lookup yang sudah
   kedaluwarsa akhirnya selesai di background, hasilnya DIBUANG (tidak
   dipakai untuk pinning, tidak disimpan, tidak memengaruhi keputusan) —
   hanya dicatat di log sebagai "lookup telat diabaikan" untuk
   observabilitas. Terbukti dalam tes: lookup 2000 ms yang kalah race
   dari timer 100 ms tiba 1900 ms kemudian dan diabaikan.
4. **Satu `AbortController` bersama untuk SEMUA tahap lain** (koneksi,
   redirect, RDAP, body streaming) — tahap-tahap ini DAPAT dibatalkan
   (soket ditutup, reader di-cancel), tidak seperti DNS. Tabel abort
   per tahap di §A.5 tetap berlaku.

**Timeout lokal RDAP vs timeout global (v2.1).** Keduanya dibedakan secara
eksplisit:
- **Timeout lokal RDAP (12 detik per fetch RDAP):** bila RDAP melebihi
  12 detik, lookup RDAP dibatalkan dan umur domain dicatat "tidak
  diketahui" — pemeriksaan HALAMAN tetap dapat selesai dengan sinyal
  yang tersisa (perilaku lama bila RDAP gagal; §A.5). RDAP tidak pernah
  menggagalkan pemeriksaan secara keseluruhan.
- **Timeout global 20 detik:** bila tercapai, SELURUH pemeriksaan
  BERHENTI — DNS yang sedang berjalan ditinggalkan (race), koneksi
  ditutup, reader di-cancel, loop redirect dihentikan, RDAP dihentikan.
  Hasil yang dikembalikan adalah status **"pemeriksaan tidak selesai
  (timeout)"** — BUKAN vonis keamanan (bukan BAHAYA/WASPADA/LEBIH AMAN,
  bukan UNVERIFIED), TANPA skor, TANPA sinyal parsial, dan TANPA baris
  `checks`. Alasannya: vonis dari pemeriksaan yang terpotong di tengah
  akan menyesatkan (mis. sinyal drainer yang belum sempat dibaca
  menghasilkan skor rendah yang palsu). UI menampilkan status ini secara
  berbeda dari penolakan guard dan dari "tidak terjangkau".

### A.5.3 Siklus hidup slot semaphore DNS (v2.2 — WAJIB diperjelas)

**Prinsip yang mengikat:** slot semaphore DNS dilepas HANYA pada salah
satu dari dua peristiwa berikut — (a) promise DNS asli **settle**
(selesai dengan hasil, atau gagal dengan error), atau (b) **absolute
cap** tercapai (lihat di bawah). Slot **TIDAK PERNAH** dilepas hanya
karena `Promise.race` mencapai timeout per lookup (5 detik). Melepas
slot pada race timeout adalah bug: lookup yang masih berjalan di
background tidak lagi terhitung, sehingga lookup background dapat
menumpuk tanpa batas meski semaphore "terlihat" kosong.

**Siklus hidup slot (state machine):**

```text
                    acquire()
   [tidak ada slot] ----------> [MENUNGGU DI ANTREAN] --(slot bebas)--> [AKTIF]
          |                          |  (timeout antrean 5 dtk)          |
          |                          v                                   |
          +----> TOLAK (DNS_QUEUE_FULL)   TOLAK (DNS_QUEUE_TIMEOUT)      |
                                                                          |
                              +-------------------------------------------+
                              | lookup berjalan (underlying promise)      |
                              +-------------------------------------------+
                                |                    |                   |
                    (a) settle: hasil/   (b) race timeout 5 dtk:    (c) absolute cap 30 dtk:
                        error              pemanggil DITOLAK,            slot DIREBUT,
                        -> RELEASE         slot TETAP TERPAKAI           lookup ditinggalkan,
                                           (tetap dihitung aktif)        dicatat forceReleased
```

**Aturan implementasi yang mengikat (diturunkan dari bukti tes):**

1. **Release terikat pada settle, bukan pada race.** Implementasi
   referensi (`/tmp/ssrf-v22/semaphore-test.cjs`): `underlying.then(onSettle,
   onSettle)` adalah SATU-SATUNYA tempat slot dilepas (dengan guard
   `released` agar tidak dilepas dua kali). Handler `Promise.race` yang
   kalah TIDAK memanggil release. **Bukti:** SEM-T1 — lookup 3000 ms
   dengan race timeout 100 ms: pemanggil menerima `DNS_TIMEOUT` pada
   ~100 ms, tetapi `active` tetap 1 pada +200 ms dan +1500 ms, dan baru
   menjadi 0 setelah underlying settle (~3000 ms); metrik
   `timedOut=1`, `lateSettled=1`.
2. **Lookup yang timeout tetap dihitung sebagai operasi aktif.**
   Selama underlying belum settle, slotnya tetap terpakai dan lookup
   itu tetap tercatat di metrik `active` dan `timedOut`. Bila akhirnya
   settle setelah race timeout, hasilnya DIBUANG (tidak dipakai untuk
   pinning) dan dicatat sebagai `lateSettled` — tetapi slotnya baru
   dilepas pada saat itu. **Bukti:** SEM-T1, SEM-T3 (`lateSettled=6`
   setelah banjir 20 request).
3. **Absolute cap 30 detik sebagai katup pengaman.** Bila underlying
   TIDAK PERNAH settle (resolver menggantung selamanya), slot direbut
   kembali oleh timer cap 30 detik dan dicatat `forceReleased`. Cap
   ini adalah SATU-SATUNYA pengecualian terhadap "lepas hanya saat
   settle" — dan ia ada justru agar satu resolver yang menggantung
   tidak memacetkan semaphore selamanya. Nilai produksi: 30 detik
   (6× timeout race per lookup). **Bukti:** SEM-T5 — lookup yang tidak
   pernah resolve direbut pada cap 800 ms (skala tes); slot langsung
   bisa dipakai lookup berikutnya.
4. **Antrean FIFO berbatas.** Nilai produksi: `maxActive = 4`,
   `maxQueue = 4`, tunggu antrean maks **5 detik**. Bila antrean penuh
   → tolak langsung `DNS_QUEUE_FULL` (fail-closed, tanpa menunggu).
   Bila waiter menunggu lebih dari 5 detik → tolak
   `DNS_QUEUE_TIMEOUT` dan waiter KELUAR dari antrean. Antrean
   dilayani FIFO; slot yang bebas langsung diberikan ke waiter
   terdepan. **Bukti:** SEM-T2 (antrean penuh menolak; FIFO berjalan),
   SEM-T4 (waiter timeout 300 ms skala tes, keluar dari antrean).
5. **Batas total lookup background.** Pada satu proses, jumlah lookup
   yang sedang berjalan di background TIDAK PERNAH melebihi
   `maxActive + maxQueue` = **8** (4 aktif + 4 menunggu — dan waiter
   belum memulai lookup, jadi lookup yang benar-benar berjalan di
   background maksimal 4). Berapa pun request yang masuk, sisanya
   ditolak di depan pintu, bukan menumpuk di belakang. **Bukti:**
   SEM-T3 — 20 request serentak ke resolver lambat: hanya 6 lookup
   dimulai (4 aktif + 2 antrean skala tes), 14 ditolak antrean penuh,
   `maxActiveObserved` tidak pernah melewati 4, dan setelah semua
   settle `active=0`, `queued=0`.
6. **Timer penolakan race TIDAK BOLEH di-unref.** Temuan samping dari
   pengujian v2.2: timer penolakan race yang dibuat dengan `.unref()`
   membuat proses Node keluar sendiri sebelum pemanggil menerima
   timeout-nya, karena satu-satunya pekerjaan yang tersisa adalah
   timer unref + promise yang tidak pernah settle (proses keluar
   dengan exit 0 setelah SEM-T4, SEM-T5/T6 tidak berjalan). Aturan:
   timer yang menentukan hasil yang sedang ditunggu pemanggil
   (penolakan race) harus tetap ref'd; hanya timer metrik dan absolute
   cap yang boleh di-unref. Setelah perbaikan, 6/6 tes lolos.

**Metrik pemantauan (nama, arti, ambang alert):**

| Metrik | Jenis | Arti | Ambang alert |
| --- | --- | --- | --- |
| `dns_lookup_active` | gauge | Lookup yang sedang berjalan saat ini | > 4 selama 60 dtk → waspada (seharusnya tidak mungkin melewati 4) |
| `dns_lookup_queued` | gauge | Waiter yang sedang menunggu slot | > 0 sustained 5 menit → waspada (resolver lambat / banjir) |
| `dns_lookup_timed_out_total` | counter | Race timeout per lookup (pemanggil menyerah menunggu) | > 5/menit selama 5 menit → waspada (resolver bermasalah) |
| `dns_lookup_late_settled_total` | counter | Underlying settle SETELAH race timeout (hasil dibuang) | > 0 → info; tren naik bersama `timed_out` → selidiki resolver |
| `dns_lookup_force_released_total` | counter | Slot direbut absolute cap (lookup menggantung) | **> 0 → page** (resolver menggantung; bukan kondisi normal) |
| `dns_lookup_queue_full_total` | counter | Request ditolak karena antrean penuh | > 10/menit selama 5 menit → waspada (banjir / kapasitas kurang) |
| `dns_lookup_queue_timeout_total` | counter | Waiter kehabisan waktu di antrean | > 5/menit selama 5 menit → waspada |
| `dns_lookup_max_active_observed` | gauge | High-water mark aktif sejak proses mulai | Hanya observabilitas (tidak boleh > 4) |

Metrik diekspos per proses dan dikumpulkan oleh pemantau yang sama
dengan metrik rate limit (§A.7). Tidak ada metrik yang berisi hostname
atau IP mentah — hanya hitungan.

**Uji yang membuktikan perilaku ini (gerbang G6):** SEM-01..SEM-06 —
lihat `SSRF_SPIKE_V22.md` §1 (6/6 PASS, Node v24.22.1, resolver
lambat yang dikontrol sendiri). Uji ulang di staging produksi (U-1)
wajib mencakup perilaku ini, karena perilaku signal DNS di runtime
produksi belum terbukti (U-12/U-15).

> **Catatan v2.3:** §A.5.3 di atas TIDAK LAGI berdiri sendiri. Absolute
> cap yang dijelaskan di sini direbut slotnya — tetapi slot yang direbut
> TIDAK berarti operasinya berhenti. §A.5.4 di bawah menambahkan
> penghitung orphaned, batas keras, circuit breaker, dan pemulihan worker
> yang menutup celah akumulasi itu. SEM-01..SEM-06 diulang setelah
> perubahan (SEM-R1..SEM-R6, 6/6 PASS, `SSRF_SPIKE_V23.md` §1).

### A.5.4 Penghitung orphaned, batas keras, circuit breaker, dan pemulihan worker (v2.3 — MENJAWAB KEBERATAN ATAS ABSOLUTE CAP)

**Keberatan yang dijawab.** Pada v2.2, absolute cap 30 detik merebut slot
dari lookup yang tidak pernah settle — tetapi lookup itu tetap berjalan di
background. Setelah slot direbut, lookup baru dapat dimulai; beberapa
siklus force-release berpotensi menghasilkan operasi DNS yang terus
bertambah. SEM-T5 v2.2 hanya membuktikan SATU lookup menggantung dapat
direbut slotnya — tidak ada pengujian berulang yang membuktikan operasi
yang masih hidup setelah force-release tetap dibatasi. Kontrol ORPH-T0
(`SSRF_SPIKE_V23.md` §2) membuktikan keberatan itu NYATA: tanpa batas
orphaned, tiga gelombang force-release menumbuhkan operasi hidup 2→4→6
tanpa batas.

**Prinsip yang mengikat (v2.3): force-release TIDAK PERNAH dianggap
sebagai berhentinya operasi DNS.** Operasi yang terkena force-release
tetap dihitung sebagai operasi yang mungkin masih berjalan sampai salah
satu dari dua hal terjadi: (a) promise DNS aslinya settle (hasil atau
error — hasilnya dibuang), atau (b) proses yang menjalankannya
benar-benar dihentikan (worker di-kill — lihat butir 5). Tidak ada jalur
kode yang boleh mengurangi penghitung operasi hidup hanya karena timer
cap tercapai.

#### 1. Dua penghitung yang terpisah

| Penghitung | Arti | Bertambah saat | Berkurang saat |
| --- | --- | --- | --- |
| `active` (slot semaphore) | Lookup yang sedang memegang slot semaphore | Lookup baru dimulai (acquire berhasil) | Underlying settle (normal/late) ATAU slot direbut force-release ATAU operasi dihentikan lewat terminasi worker |
| `orphaned` (operasi DNS orphaned) | Lookup yang slotnya SUDAH direbut force-release tetapi underlying-nya BELUM settle | Force-release merebut slot | Underlying settle telat (hasil dibuang) ATAU operasi dihentikan lewat terminasi worker |
| `liveOps` (turunan: `active + orphaned`) | Semua operasi DNS yang mungkin masih berjalan di proses ini | — | — |

Siklus hidup masing-masing:

```text
LOOKUP BARU
  acquire() berhasil
    -> active + 1, liveOps + 1
    |
    +-- (a) settle normal ---------> active - 1, liveOps - 1 (hasil dipakai)
    |
    +-- (b) race timeout 5 dtk ----> pemanggil ditolak DNS_TIMEOUT,
    |                                TETAP active (menunggu settle/cap)
    |                                  |
    |                                  +-- settle telat -> active - 1,
    |                                  |   liveOps - 1, lateSettled + 1
    |                                  |
    |                                  +-- absolute cap 30 dtk -> lihat (c)
    |
    +-- (c) absolute cap 30 dtk ----> BILA orphaned < cap:
    |                                  active - 1, orphaned + 1,
    |                                  forceReleased + 1
    |                                  (liveOps TIDAK BERUBAH)
    |                                  BILA orphaned >= cap:
    |                                  TIDAK direbut — op menjadi
    |                                  "cap-deferred", TETAP active
    |                                  sampai orphaned turun
    |
    +-- (d) terminasi worker --------> op dinyatakan berhenti:
                                       active - 1 ATAU orphaned - 1,
                                       liveOps - 1, orphanedTerminated + 1
```

**Aturan yang mengikat:**

1. `orphaned` HANYA bertambah di `_forceRelease()` dan HANYA berkurang
   di `_onSettle()` (late settle) atau `terminateAllWorkerOps()`. Tidak
   ada pengurangan lain — khususnya TIDAK PERNAH berkurang karena timer
   cap, timer race, atau penolakan pemanggil.
2. `active` HANYA berkurang di `_onSettle()`, `_forceRelease()`, atau
   `terminateAllWorkerOps()`. Tidak pernah berkurang karena race timeout
   (aturan v2.2 butir 1–2, dipertahankan).
3. Operasi cap-deferred tetap tercatat di `active` dan tetap tercatat di
   metrik `active` — ia bukan orphaned (slotnya belum direbut) dan bukan
   selesai. Saat `orphaned` turun di bawah cap, operasi cap-deferred
   dicoba rebut kembali (lihat butir 2, urutan pemulihan).

#### 2. Batas keras orphaned + circuit breaker

**Nilai produksi (tetap, dengan alasan):**

| Parameter | Nilai produksi | Alasan |
| --- | --- | --- |
| `orphanHardCap` | **4** (= `maxActive`) | Setiap slot maksimal menghasilkan satu orphan per siklus; cap = `maxActive` berarti total operasi hidup maksimal `maxActive + cap = 8` — SAMA dengan batas v2.2 (`maxActive + maxQueue = 8`), sehingga v2.3 tidak melonggarkan batas total apa pun, hanya memindahkan batas itu dari antrean ke orphaned |
| `orphanRecoveryThreshold` | **1** | Hysteresis: breaker menutup hanya saat `orphaned ≤ 1`, bukan saat `orphaned < cap` — mencegah buka-tutup berulang (flapping) bila satu orphan settle lalu satu force-release baru langsung terjadi |
| Perilaku saat batas tercapai | **Fail-closed / circuit breaker terbuka** | Penerimaan lookup DNS baru DIHENTIKAN SEMENTARA: acquire baru ditolak langsung `DNS_CIRCUIT_OPEN` (tanpa menunggu, tanpa memulai lookup); semua waiter antrean ditolak dengan kode yang sama dan antrean dikosongkan |

**Perilaku saat breaker terbuka:**

- Lookup yang SUDAH berjalan (aktif maupun orphaned) TIDAK dihentikan
  oleh terbukanya breaker — mereka dibiarkan settle atau direbut cap
  seperti biasa. Breaker hanya menghentikan PENERIMAAN yang baru.
- Tidak ada antrean yang menumpuk selama breaker terbuka: request baru
  ditolak instan, bukan ditahan. Penolakan dicatat
  (`rejectedCircuitOpen`).
- Breaker MENUTUP hanya bila `orphaned ≤ 1` (threshold pemulihan).
  Penutupan dievaluasi SETIAP KALI `orphaned` berkurang (late settle
  atau terminasi worker) — dan SETELAH operasi cap-deferred dicoba
  rebut kembali (urutan ini penting: reclaim yang tertunda dapat
  menaikkan `orphaned` kembali ke cap, sehingga breaker yang baru saja
  akan menutup harus tetap terbuka — perilaku ini dibuktikan ORPH-T3).
- Breaker TIDAK PERNAH menutup berdasarkan waktu (tidak ada "tutup
  otomatis setelah N detik") — hanya berdasarkan `orphaned` yang
  benar-benar turun. Menutup berdasarkan waktu akan membuka kembali
  penerimaan sementara operasi lama masih hidup — persis akumulasi yang
  hendak dicegah.

**Invarian yang ditegakkan (dibuktikan ORPH-T1):**

- **(I1)** `orphaned ≤ orphanHardCap` SELALU — karena force-release
  memeriksa `orphaned < cap` SEBELUM merebut, dan semua pemeriksaan
  itu berjalan serial di event loop (tidak ada dua force-release yang
  berjalan bersamaan).
- **(I2)** `liveOps = active + orphaned ≤ maxActive + orphanHardCap`
  SELALU — `liveOps` hanya bertambah saat acquire berhasil, dan acquire
  mensyaratkan `active < maxActive` DAN breaker tertutup
  (`orphaned < cap`); force-release tidak mengubah `liveOps`
  (active −1, orphaned +1).
- **(I3)** Selama breaker terbuka, TIDAK ADA lookup baru yang dimulai —
  dibuktikan ORPH-T2 (0 lookup underlying baru selama breaker terbuka).

#### 3. Mekanisme pemulihan

Ada dua jalan pemulihan, dengan peran yang berbeda:

| Jalan pemulihan | Cara kerja | Kapan terjadi |
| --- | --- | --- |
| **(a) Settle alami** | Underlying promise akhirnya settle (hasil/error) → `orphaned` berkurang → operasi cap-deferred dicoba rebut → breaker menutup saat `orphaned ≤ 1` | Otomatis, tanpa intervensi |
| **(b) Terminasi DNS worker** | Proses worker DNS di-kill (`SIGKILL`) → semua operasi di dalamnya dinyatakan berhenti (`terminateAllWorkerOps()`) → `orphaned` turun sekaligus → breaker menutup | Dipicu operator/otomasi bila breaker terbuka terlalu lama (lihat pemicu di bawah) |

**Pemicu restart worker (aturan yang mengikat):**

- Breaker terbuka terus-menerus selama **> 60 detik** (produksi) dengan
  `orphaned` di cap → restart worker DNS (kill + respawn).
- ATAU `forceReleased` dalam 5 menit terakhir **≥ 3** (tanda resolver
  menggantung berulang) → restart worker DNS.
- Setelah restart, jeda pendinginan (**cooldown 30 detik**) sebelum
  restart berikutnya diizinkan; maksimal **3 restart per 10 menit** —
  bila terlampaui, breaker TETAP terbuka dan halaman operator (page)
  dinaikkan: restart berulang adalah gejala resolver/infra, bukan
  sesuatu yang boleh diulang tanpa batas.
- Worker yang baru di-spawn TIDAK BOLEH langsung diberi lookup tanpa
  readiness check: tunggu event `spawn` + jeda startup sebelum lookup
  IPC pertama — temuan ORPH-T4/§9 bukti: tanpa readiness check, lookup
  pertama selalu timeout karena startup proses (~50–100 ms).

**Evaluasi isolasi DNS worker — apakah diperlukan?**

Jawabannya: **YA, diperlukan untuk pemulihan yang TERJAMIN.** Tanpa
worker, satu-satunya jalan orphaned turun adalah settle alami — dan
resolver yang menggantung selamanya TIDAK PERNAH settle, sehingga
breaker dapat terbuka selamanya dan semaphore macet total (semua slot
akhirnya cap-deferred). Worker adalah satu-satunya mekanisme yang dapat
menjamin orphaned turun tanpa menunggu resolver yang tidak kooperatif.

| Pendekatan pemulihan | Pro | Kontra | Putusan |
| --- | --- | --- | --- |
| **(A) DNS worker anak-proses (child_process.fork)** | Isolasi penuh: memori, resolver state, dan event loop terpisah; `SIGKILL` TERBUKTI menghentikan operasi (ORPH-T4: `orphaned` 2→0, breaker menutup, worker baru melayani); crash worker tidak menjatuhkan proses utama; dapat di-restart independen | Biaya: spawn proses (~50–100 ms) + IPC per lookup + kode parent/child; permukaan baru: channel IPC harus diautentikasi/diikat ke parent (bukan socket terbuka); lookup yang sedang berjalan di worker yang di-kill gagal fail-closed (`DNS_WORKER_RESTARTED`) dan harus ditangani pemanggil | **DIPILIH sebagai mekanisme pemulihan.** Menjadi bagian dari P0-1b (bukan langkah baru) |
| **(B) Worker thread (worker_threads + terminate())** | Lebih murah (tanpa spawn proses); `terminate()` TERBUKTI menghentikan thread dalam 2–3 ms (ORPH-T4b) | Thread berbagi memori dan resolver proses induk — hang di tingkat native dapat memengaruhi induk; terminasi thread di tengah panggilan native bukan penghentian yang sebersih kematian proses; crash di thread tetap berada di proses yang sama | **DITOLAK sebagai pengganti (A).** Dicatat sebagai alternatif yang lebih murah tetapi lebih lemah — boleh dipakai untuk pemulihan ringan, BUKAN sebagai satu-satunya mekanisme pemulihan |
| **(C) Tanpa worker (hanya breaker + tunggu settle)** | Tidak ada kompleksitas tambahan | TIDAK ADA jaminan pemulihan: resolver yang menggantung selamanya membuat breaker terbuka selamanya; satu-satunya jalan keluar adalah restart manual seluruh proses layanan | **DITOLAK sebagai satu-satunya mekanisme.** Diterima hanya sebagai fallback bila worker belum tersedia — dengan catatan eksplisit di §G (U-18) bahwa dalam mode ini pemulihan tidak terjamin |

**Pernyataan jujur tentang pembatalan DNS:** rancangan ini TIDAK
mengklaim DNS dapat "dibatalkan". Yang terbukti: (1) `AbortSignal`
TIDAK menghentikan `dns.lookup`/`resolve4` (temuan v2.1); (2)
penghentian PROSES yang menjalankan lookup menghentikan lookup itu
(ORPH-T4); (3) penghentian THREAD menghentikan thread itu (ORPH-T4b).
"Pembatalan" dalam dokumen ini SELALU berarti salah satu dari ketiganya
— dan bila suatu pendekatan mengklaim membatalkan DNS tanpa salah satu
mekanisme itu, klaim tersebut SALAH dan harus ditolak di review.

#### 4. Metrik baru v2.3 + ambang alert dan tindakan operasional

Metrik v2.2 (8 kunci) dipertahankan; v2.3 menambahkan 7 kunci berikut
(total 19 kunci numerik — dibuktikan ORPH-T5/SEM-R6):

| Metrik | Jenis | Arti | Ambang alert | Tindakan operasional |
| --- | --- | --- | --- | --- |
| `dns_lookup_orphaned_active` | gauge | Operasi orphaned yang masih hidup saat ini | ≥ 2 → **warning** (selidiki resolver); == cap → **page** (breaker terbuka) | Warning: periksa log resolver + `forceReleased`; page: ikuti runbook breaker (lihat bawah) |
| `dns_lookup_orphaned_high_water` | gauge | Maksimum orphaned sejak proses mulai | ≥ 3 dalam 1 jam → **warning** | Selidiki apakah resolver memburuk; bila tren naik antar jam, eskalasi |
| `dns_lookup_force_released_total` | counter | Total slot yang direbut absolute cap (sudah ada di v2.2) | > 0 → **page** (dipertahankan dari v2.2) | Resolver menggantung; bukan kondisi normal |
| `dns_lookup_circuit_breaker_open` | gauge (0/1) | Status breaker saat ini | == 1 selama > 60 dtk → **page** (pemicu restart worker) | Restart worker DNS sesuai butir 3; bila restart tidak menutup breaker, eskalasi manual |
| `dns_lookup_circuit_breaker_trips_total` | counter | Jumlah breaker pernah terbuka | > 0 → **warning**; ≥ 3/hari → **page** | Selidiki penyebab trip berulang |
| `dns_lookup_circuit_open_rejected_total` | counter | Request ditolak karena breaker terbuka | > 10/menit selama 5 menit → **warning** (banjir saat breaker terbuka) | Periksa apakah ada banjir request; bukan kesalahan breaker itu sendiri |
| `dns_lookup_orphaned_terminated_total` | counter | Operasi orphaned yang dihentikan lewat terminasi worker | > 0 → **info** (pemulihan bekerja); tren naik → **warning** | Bila sering terjadi, resolver/worker perlu diselidiki |
| `dns_lookup_worker_restarts_total` | counter | Jumlah restart worker DNS | ≥ 3 per 10 menit → **page** (batas restart tercapai; restart otomatis dihentikan) | Intervensi manual; jangan paksa restart lagi |

**Runbook singkat saat breaker terbuka (page):** (1) konfirmasi di
dashboard: `orphaned`, `forceReleased`, `breakerOpen`; (2) periksa log
resolver (apakah satu hostname/resolver tertentu yang menggantung);
(3) bila breaker terbuka > 60 dtk, restart worker DNS (otomatis bila
dikonfigurasi, manual bila tidak); (4) bila restart tidak menutup
breaker dalam 5 menit, JANGAN restart berulang — eskalasi: periksa
apakah resolver upstream mati atau ada serangan; (5) setelah breaker
menutup, pantau `orphanedHighWater` selama 1 jam sebelum menyatakan
pulih. Tidak ada metrik yang berisi hostname atau IP mentah — hanya
hitungan.

#### 5. Uji yang membuktikan perilaku ini (gerbang G6 — ORPH-01..ORPH-05)

Bukti lengkap: `SSRF_SPIKE_V23.md` (13/13 PASS, dijalankan ulang 2×).
Ringkasan:

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| ORPH-01 | Kontrol v2.2 tanpa batas orphaned (ORPH-T0) | Keberatan TERBUKTI: orphaned tumbuh 2→4→6 tanpa batas dalam 3 gelombang — tanpa batas, akumulasi nyata |
| ORPH-02 | Gelombang berulang dengan batas (ORPH-T1) | `orphaned` tidak pernah > cap 3; live ops tidak pernah > 5; hanya 4 lookup dimulai dalam 3 gelombang |
| ORPH-03 | Breaker (ORPH-T2) | Request ditolak `DNS_CIRCUIT_OPEN` instan (< 50 ms); 0 lookup baru selama breaker terbuka |
| ORPH-04 | Pemulihan lewat settle + gelombang kedua (ORPH-T3) | Breaker menutup hanya saat `orphaned ≤ 1`; gelombang kedua tetap berbatas (orphaned ≤ 3, live ≤ 5) |
| ORPH-05 | Kill worker + metrik (ORPH-T4, ORPH-T4b, ORPH-T5) | `SIGKILL` menghentikan operasi (`orphaned` 2→0, breaker menutup, worker baru melayani); worker thread terminate terbukti tetapi ditolak sebagai pengganti; metrik sesuai prediksi state machine |

Pengulangan SEM-01..SEM-06 setelah perubahan (SEM-R1..SEM-R6, 6/6 PASS)
termasuk dalam gerbang G6. Catatan kejujuran: harness asli v2.2 hilang
karena `/tmp` dibersihkan antar sesi; SEM-R1..SEM-R6 adalah implementasi
ulang dari spesifikasi yang didokumentasikan di `SSRF_SPIKE_V22.md` §1.

### A.5.5 Konfirmasi terminasi worker dan crash/restart parent (v2.3.1 — MENJAWAB KEBERATAN ATAS TERMINASI TANPA KONFIRMASI)

**Keberatan yang dijawab.** Pada v2.3, terminasi worker digambarkan
sebagai "kill + counter turun + breaker menutup" tanpa membedakan
pengiriman sinyal dari konfirmasi kematian proses. Bila counter
dikurangi saat SIGKILL dikirim — sementara proses sebenarnya belum mati
— penghitung berbohong: operasi yang masih berjalan tidak lagi
dihitung, breaker dapat menutup sementara lookup lama masih hidup, dan
akumulasi yang hendak dicegah kembali lewat pintu belakang. Keberatan
kedua: bila proses parent mati mendadak saat worker menjalankan lookup,
worker dapat menjadi proses yatim yang terus berjalan — dan parent baru
yang mulai harus dapat mendeteksi serta membersihkannya, atau
pemeriksaan baru akan berjalan di samping operasi yatim yang tidak
terhitung.

#### 1. Konfirmasi exit: counter hanya turun setelah event `exit`

**Aturan yang mengikat (v2.3.1):**

1. Mengirim `SIGKILL` ke worker TIDAK PERNAH mengurangi counter apa
   pun — bukan `active`, bukan `orphaned`, bukan `capDeferred`, dan
   TIDAK PERNAH mengevaluasi penutupan breaker.
2. Counter hanya dikurangi di SATU tempat: handler event `exit` child
   process (`_decrementForWorker`, idempotent — op yang sudah settled
   dilewati, sehingga pemanggilan ganda aman). Handler ini berjalan
   bila dan hanya bila proses worker benar-benar berhenti (event
   `exit` diterima dengan `code`/`signal`).
3. Bila event `exit` tidak diterima dalam **exit-confirm timeout
   (5 detik produksi; 500 ms skala tes)**, maka: counter TETAP,
   breaker TETAP terbuka, metrik `workerExitUnconfirmed` bertambah 1,
   dan halaman operator (page) dinaikkan. TIDAK ADA pengurangan paksa
   setelah timeout — listener `exit` tetap terpasang, sehingga bila
   proses akhirnya mati, decrement berjalan saat itu (bukan
   sebelumnya). Alasan: `SIGKILL` hampir selalu membunuh proses
   seketika, tetapi proses dalam keadaan D-state (uninterruptible
   sleep, mis. I/O disk menggantung) atau namespace yang bermasalah
   dapat menunda kematian; mengasumsikan kematian dari pengiriman
   sinyal adalah klaim yang tidak terbukti.
4. Metrik baru v2.3.1: `workerExitConfirmed` (counter — exit
   terkonfirmasi dan counter dikurangi) dan `workerExitUnconfirmed`
   (counter — timeout tanpa konfirmasi; ambang: > 0 → **page**).
   Keduanya ditambah ke daftar metrik §A.5.4 butir 4 (total kunci
   menjadi 21 — lihat rekonsiliasi §4 di `SSRF_SPIKE_V231.md`).

**Urutan pembukaan breaker (v2.3.1):**

```text
terminateWorker() dipanggil
  -> child.kill('SIGKILL') dikirim
  -> TIDAK ADA perubahan counter, TIDAK ADA evaluasi breaker
  -> [jendela: breaker TETAP terbuka; lookup baru TETAP ditolak
  |   DNS_CIRCUIT_OPEN; lookup lama TETAP dihitung]
  -> event 'exit' diterima (code/signal)
  -> _decrementForWorker(): active/orphaned/capDeferred turun
  -> _maybeCloseBreaker() dievaluasi (tepat 1× per terminasi)
  -> BILA orphaned <= threshold (1): breaker MENUTUP
  -> BILA tidak ada event 'exit' dalam 5 dtk: counter TETAP,
     breaker TETAP terbuka, workerExitUnconfirmed + 1, page
```

Dibuktikan TERM-T1..T4 (`SSRF_SPIKE_V231.md` §1): T1 membuktikan
counter tidak berubah pada pemeriksaan sinkron segera setelah `kill()`
kembali dan hanya turun setelah `exit` (orphaned 3→0,
`orphanedTerminated=3`); T2 membuktikan evaluasi penutupan breaker
terjadi tepat 1× dan hanya setelah exit (dihitung lewat instrumentasi
pemanggilan `_maybeCloseBreaker()`); T3 membuktikan exit yang tidak
pernah terkonfirmasi (worker palsu) membuat counter dan breaker tetap
— bahkan setelah +500 ms tambahan; T4 membuktikan terminate ganda
idempotent dan tidak ada counter negatif.

**Catatan pengujian yang mengikat:** pemeriksaan "counter tidak berubah
saat kill dikirim" HARUS dilakukan sinkron di tick yang sama dengan
pengiriman sinyal — sebelum event loop sempat memproses event `exit`.
Pemeriksaan apa pun yang memakai `await` memberi kesempatan event
`exit` tiba lebih dulu dan mengaburkan hasil (temuan TERM-T1b/T1c).

#### 2. Parent crash/restart: supervisor, cleanup, dan recovery state

**Skenario yang dirancang.** Parent mati mendadak (SIGKILL / crash /
OOM-kill) saat DNS worker menjalankan lookup. Tiga lapis pertahanan,
berurutan:

| Lapis | Mekanisme | Kapan bekerja | Bukti |
| --- | --- | --- | --- |
| **L1 — worker keluar sendiri** | Worker mendeteksi kematian parent lewat (a) event `disconnect` pada channel IPC, atau (b) watchdog ppid (bila `ppid === 1`, artinya di-reparent ke init) → `process.exit(0)` | Otomatis, dalam hitungan detik setelah parent mati | PARENT-T1a: worker mati setelah parent di-SIGKILL, alasan tercatat `disconnect` |
| **L2 — cleanup oleh parent baru (pidfile)** | Parent baru saat startup membaca pidfile (`parent.pid.json`: parentPid + workerPid lama); bila worker lama masih hidup → validasi ulang identitas → SIGKILL + tunggu konfirmasi exit (maks 5 dtk per percobaan, 3 percobaan — lihat §A.5.5.1 v2.3.2; bila tidak terkonfirmasi, parent tetap `NOT_READY`) → baru spawn worker sendiri dan tulis pidfile baru | Setiap startup parent | PARENT-T1b: worker stubborn yang sengaja dibuat tetap hidup berhasil dibunuh parent baru (`waitedMs=51`) |
| **L3 — supervisor eksternal** | Supervisor platform me-restart proses layanan saat crash dan membunuh seluruh process group (termasuk anak) | Saat crash | **BELUM TERBUKTI** — lihat U-22 di bawah |

**Recovery state parent baru (aturan yang mengikat):**

- **State in-memory DIBANGUN DARI NOL:** semaphore (`active`,
  `orphaned`, `capDeferred`), breaker (mulai TERTUTUP), antrean, dan
  metrik dimulai dari nol. Parent baru TIDAK BOLEH mewarisi angka
  counter dari parent mati — angka itu mati bersama prosesnya.
- **State DB BERTAHAN:** `scan_leases` global hidup di database
  bersama, bukan di memori. Lease dari parent mati tetap dihitung
  sampai TTL-nya habis (25 dtk produksi) — batas global 5 pemeriksaan
  tetap ditegakkan melewati restart. Dibuktikan PARENT-T2: parent baru
  melihat `liveLeases=2` (1 dari parent mati + 1 milik sendiri), dan
  setelah TTL keduanya kedaluwarsa sendiri.
- **Request yang sedang berjalan saat parent mati GAGAL FAIL-CLOSED:**
  pemanggil tidak pernah menerima vonis — koneksinya putus / timeout
  tanpa hasil. Dibuktikan PARENT-T1a: lookup yang sedang berjalan
  tetap `PENDING` (tidak pernah kembali). Tidak ada vonis parsial dari
  pemeriksaan yang parent-nya mati.
- **Urutan startup parent baru (wajib, v2.3.2 — MENGGANTIKAN rumusan
  v2.3.1):** (1) acquire startup lock (lihat §A.5.5.3 — bila kalah,
  keluar segera, jangan lakukan apa pun) → (2) baca pidfile lama →
  (3) cleanup worker lama menurut aturan keras §A.5.5.1 di bawah →
  (4) spawn worker baru + readiness check → (5) tulis pidfile baru
  secara atomik (lihat §A.5.5.3) → (6) baru terima lookup. Melayani
  lookup sebelum langkah (3) selesai adalah cacat: operasi yatim
  berjalan di luar penghitung. **Rumusan v2.3.1 yang DIHAPUS:**
  "JANGAN lanjut sebelum worker lama mati ATAU batas percobaan habis"
  — frasa "atau batas percobaan habis" dapat dibaca sebagai izin
  melanjutkan startup setelah percobaan habis, dan itu SALAH. Aturan
  yang menggantikannya ada di §A.5.5.1.

#### A.5.5.1 Aturan keras startup: NOT_READY sampai worker lama terkonfirmasi mati (v2.3.2 — KLARIFIKASI WAJIB)

**Aturan yang tidak dapat dinegosiasi.** Bila worker lama tidak dapat
dipastikan mati setelah batas waktu dan percobaan cleanup habis, parent
baru **WAJIB tetap `NOT_READY`** dan **tidak menerima lookup DNS**.
Batas percobaan **BUKAN** izin untuk melanjutkan startup ketika worker
lama masih hidup. Tidak ada pengecualian, tidak ada jalan pintas
berbasis waktu, dan tidak ada "lanjut dengan risiko yang dicatat" —
satu-satunya jalan keluar dari `NOT_READY` adalah salah satu dari dua
kondisi di bawah, atau intervensi operator yang membuktikan kematian
worker lama secara manual (lihat runbook).

**Batas cleanup yang eksplisit (nilai produksi):**

| Parameter | Nilai produksi | Nilai skala tes | Keterangan |
| --- | --- | --- | --- |
| Jumlah percobaan cleanup | 3 | 3 | Tiap percobaan = validasi ulang identitas → SIGKILL → tunggu event `exit` |
| Timeout tunggu konfirmasi exit per percobaan | 5 dtk | 300 ms | Sama dengan exit-confirm timeout §A.5.5 butir 1 (v2.3.1) — **koreksi:** langkah cleanup v2.3.1 menulis maks 2 dtk; diselaraskan ke 5 dtk agar satu angka berlaku di semua tempat |
| Anggaran total cleanup | 15 dtk (3 × 5 dtk) | 900 ms | Setelah anggaran habis tanpa konfirmasi, tidak ada percobaan ke-4 |
| Jeda antar percobaan | 0 (langsung percobaan berikutnya) | 0 | Tidak ada jeda yang memperpanjang jendela bahaya; tiap percobaan memvalidasi ulang identitas sebelum sinyal |

**Apa yang terjadi di setiap percobaan (urutan yang mengikat):**

1. Validasi ulang identitas worker lama (lihat §A.5.5.2 di bawah —
   validasi dilakukan SESAAT sebelum tiap SIGKILL, bukan sekali di
   awal startup, karena PID dapat dipakai ulang di antara percobaan).
2. Bila validasi gagal → berhenti seketika: JANGAN kirim SIGKILL,
   parent tetap `NOT_READY` + page (kasus PID reuse — lihat SU-T2).
3. Bila validasi lolos → kirim SIGKILL (satu sinyal per percobaan),
   lalu tunggu event `exit` sampai timeout percobaan.
4. Bila event `exit` diterima → decrement counter lewat satu jalur
   idempotent (`_decrementForWorker`, hanya dari exit handler) →
   lanjut ke langkah startup berikutnya.
5. Bila timeout tanpa event `exit` → counter TETAP, breaker TETAP
   terbuka (bila sudah terbuka), metrik `workerExitUnconfirmed` + 1,
   lanjut ke percobaan berikutnya (bila masih ada).

**Setelah percobaan ke-3 gagal (tindakan dan eskalasi):**

- Parent tetap `NOT_READY` **tanpa batas waktu** sampai salah satu
  terjadi: (a) event `exit` worker lama akhirnya diterima (listener
  tetap terpasang), atau (b) operator membuktikan kematian worker
  lama secara manual dan mencatatnya (lihat runbook di bawah).
- Selama `NOT_READY`: SEMUA lookup DNS ditolak dengan kode
  `DNS_PARENT_NOT_READY` (tanpa antrean — penolakan instan, tidak ada
  lookup yang menunggu di belakang worker yang belum mati); setiap
  penolakan dicatat (`parentNotReadyRejections`); metrik
  `parentNotReady` (gauge: 1 selama NOT_READY) aktif; alert page
  dinaikkan sekali saat memasuki `NOT_READY` karena cleanup gagal dan
  diulang tiap 5 menit selama status bertahan.
- Runbook operator (wajib): (1) periksa proses worker lama
  (`ps -o pid,lstart,cmd -p <workerPid>` dan `/proc/<pid>/stat` +
  `/proc/<pid>/cmdline`); (2) bila proses sudah tidak ada, hapus
  pidfile basi secara manual dan restart parent (parent baru akan
  membaca "tidak ada pidfile" → jalur (b)); (3) bila proses masih ada
  tetapi tidak merespons, eskalasi ke operator infra — JANGAN memaksa
  decrement counter dan JANGAN menghapus pidfile sementara proses yang
  dimaksud masih hidup; (4) catat tindakan + timestamp di log
  insiden.

**Dua kondisi SATU-SATUNYA yang mengizinkan transisi ke `READY`:**

- (a) **Exit worker lama terkonfirmasi** via event `exit` (atau
  konfirmasi manual operator yang tercatat, lihat runbook) — counter
  dikurangi lewat jalur idempotent, breaker dievaluasi tepat 1×.
- (b) **Bukti worker lama tidak pernah ada** — salah satu: pidfile
  tidak ada sama sekali; atau PID worker di pidfile tidak hidup DAN
  identitasnya tidak dapat dikaitkan dengan proses apa pun yang hidup
  (lihat §A.5.5.1). Pidfile yang ADA tetapi rusak/parsial BUKAN bukti
  (b) — ia berarti "tidak dapat dibuktikan" dan parent tetap
  `NOT_READY` + page (dibuktikan SU-T9).

Dibuktikan SU-T1 (`SSRF_SPIKE_V232.md` §2): setelah 3 percobaan tanpa
konfirmasi exit, state tetap `NOT_READY`, `sigsSent=3`, 2 lookup
ditolak `DNS_PARENT_NOT_READY`, worker masih hidup. Dibuktikan SU-T9:
pidfile rusak/parsial → `NOT_READY` + page; pidfile hilang → `READY`.

#### A.5.5.2 Validasi identitas proses sebelum SIGKILL (v2.3.2 — PID SAJA TIDAK CUKUP)

**Aturan yang mengikat.** PID saja tidak cukup untuk mengidentifikasi
worker lama: PID dapat dipakai ulang oleh proses lain setelah worker
mati. Sebelum SIGKILL dikirim — pada SETIAP percobaan cleanup —
parent baru WAJIB memvalidasi identitas worker lama. Bila SATU PUN
pemeriksaan gagal, JANGAN kirim SIGKILL.

**Pemeriksaan identitas (berurutan, semua harus lolos):**

1. **PID hidup** — `kill(pid, 0)` berhasil. Bila gagal (ESRCH):
   worker sudah mati → jalur (b) di §A.5.5.1 (READY tanpa sinyal).
2. **Start time cocok** — baca `/proc/<pid>/stat` field 22
   (starttime, dalam jiffies sejak boot) dan bandingkan dengan
   `workerStarttime` yang tercatat di pidfile. Start time mengikat PID
   ke SATU instans proses tertentu: bila PID dipakai ulang, start time
   proses baru berbeda dan validasi gagal. Ini pemeriksaan utama
   anti-PID-reuse.
3. **Command line cocok** — baca `/proc/<pid>/cmdline` dan pastikan
   mengandung penanda worker (`dns-worker`). Proses lain yang kebetulan
   memakai PID lama (mis. `sleep`, shell, atau layanan lain) akan gagal
   di sini meskipun start time-nya entah bagaimana cocok.
4. **Tantangan token (bila channel IPC tersedia)** — bila parent baru
   dapat membuka channel IPC ke worker lama, kirim tantangan berisi
   `workerToken` dari pidfile; worker harus menjawab dengan token yang
   sama. Bila channel IPC tidak tersedia (worker tidak lagi merespons
   IPC), pemeriksaan ini dilewati dan start time + command line menjadi
   pengikat — hal ini dicatat di log startup (`identityProof:
   starttime+cmdline`, tanpa token). Token TIDAK PERNAH ditulis ke
   `/proc` atau command line (agar tidak bocor ke `ps`).

**Bila validasi gagal:**

- JANGAN kirim SIGKILL — sinyal ke PID yang salah dapat membunuh
  proses yang tidak bersalah.
- Parent tetap `NOT_READY` + page (`identityValidationFailed` + 1),
  dengan alasan yang tercatat (`starttime-mismatch`,
  `cmdline-mismatch`, `token-mismatch`, atau `pid-not-alive` yang
  ternyata hidup kembali — lihat di bawah).
- Operator memeriksa manual: bila proses yang memegang PID adalah
  proses lain, pidfile dinyatakan basi oleh operator dan dihapus
  manual, lalu parent di-restart.

**Kasus batas yang ditetapkan:**

- PID hidup kembali di antara pemeriksaan (2) dan pengiriman SIGKILL:
  jendela TOCTOU ini **DITUTUP untuk kill-salah-sasaran oleh pidfd**
  (v2.3.6, §A.5.5.2a): sinyal dikirim via `pidfd_send_signal` pada
  pidfd yang dibuka SETELAH validasi, sehingga sinyal terikat pada
  struct pid korban — bila korban mati dan PID dipakai ulang, sinyal
  mengembalikan ESRCH dan TIDAK mengenai proses baru (dibuktikan
  PIDFD-T2/T12d). Yang tersisa adalah jendela **validasi-kedaluwarsa**
  yang dipersempit: korban mati + PID dipakai ulang + proses baru
  KEBETULAN memiliki starttime yang sama persis — dicatat sebagai U-41
  (terkuantifikasi di §A.5.5.2a). Bila pidfd tidak tersedia, fallback
  adalah mitigasi v2.3.2 (validasi sesaat sebelum sinyal dalam tick
  yang sama + baca ulang starttime tepat sebelum `kill()`) dengan
  jendela residual ~46 µs dan P ≈ 7e-9 per cleanup — lihat §A.5.5.2a.
  Sisa risiko yang tidak dapat ditutup dicatat sebagai U-24 (dijawab
  v2.3.6; residual pindah ke U-41).
- PID tidak hidup saat pemeriksaan (1) tetapi proses muncul kembali:
  tidak mungkin — PID yang mati tidak dapat "hidup kembali" sebagai
  proses yang sama; PID baru dengan nomor yang sama adalah proses
  berbeda dan akan gagal pada pemeriksaan (2).

Dibuktikan SU-T2 (`SSRF_SPIKE_V232.md` §2): pidfile menunjuk proses
`sleep` dengan start time yang diklaim digeser → validasi gagal
`starttime-mismatch` → 0 SIGKILL, `page=1`, decoy tetap hidup, parent
tetap `NOT_READY`.

#### A.5.5.2a Pensinyalan terikat identitas via pidfd (v2.3.6 — MENJAWAB U-38)

**Keberatan yang dijawab.** U-38 (v2.3.5) mencatat jendela mikro residual
antara revalidasi dan tindakan destruktif: pemeriksaan starttime +
command line TIDAK menghilangkan seluruh race PID reuse — keduanya
hanya mempersempit jendela validasi. Revisi ini mengganti mekanisme
pengiriman sinyal itu sendiri: dari `kill(pid)` (terikat NOMOR) ke
`pidfd_send_signal` (terikat IDENTITAS proses).

**Primitif.** Linux `pidfd_open(2)` (syscall 434 x86_64) mengembalikan
file descriptor yang menunjuk struct pid kernel dari proses target;
`pidfd_send_signal(2)` (syscall 424) mengirim sinyal lewat fd itu.
Bila proses target mati, pidfd tetap menunjuk struct pid yang mati —
sinyal mengembalikan ESRCH dan TIDAK PERNAH diteruskan ke proses yang
kemudian memakai ulang nomor PID itu. Bila `pidfd_open` dipanggil pada
PID yang sudah mati, ia mengembalikan ESRCH. Primitif ini TIDAK
membutuhkan hubungan parent-child (`pidfd_open(1)` berhasil, PIDFD-T6).

**Urutan yang mengikat (`signalWorkerByPidfd` — semua sinkron, tanpa
`await` di antaranya).** Implementasi referensi (Bun):
`spike-harness-v236/pidfd-signal.js`.

1. **Validasi identitas by-number** — `/proc/<pid>/stat` (starttime,
   state zombie-aware) + `/proc/<pid>/cmdline` (marker `dns-worker`),
   persis §A.5.5.2 butir 1–3. Gagal → batal (`identity-mismatch` /
   `already-dead` / `pid-not-alive`), TIDAK ADA sinyal ke mana pun.
2. **`pidfd_open(pid, 0)`** — ikat identitas. Gagal ESRCH → batal
   (`pid-not-alive`).
3. **Re-validasi starttime by-number SETELAH `pidfd_open`** — bila PID
   dipakai ulang di antara langkah 1 dan 2, starttime berubah → batal
   (`identity-changed`). Langkah ini menutup jendela
   validasi-kedaluwarsa; tanpanya, sinyal via pidfd tetap aman (lihat
   PIDFD-T12d) tetapi urutan akan menunggu konfirmasi exit yang tidak
   pernah datang.
4. **`pidfd_send_signal(pidfd, SIGKILL)`** — sinyal terikat struct pid.
   ESRCH → target sudah mati (`already-dead`).
5. **Konfirmasi exit** — poll `/proc` zombie-aware (state `Z`/`X` =
   mati), maks 2 dtk skala tes. Bila tidak terkonfirmasi → parent
   tetap `NOT_READY` (§A.5.5.1, TERM-T3).

**Yang dibuktikan (bukti: `SSRF_SPIKE_V236.md` §1):**

| Bukti | Hasil |
|---|---|
| PIDFD-T1..T7 (Python ctypes) | 7/7 PASS × 2 — primitif bekerja; T2: reuse paksa (7.871 spawn, pid_max=8192) → sinyal via pidfd lama ESRCH, decoy hidup; T3 (kontrol): `kill(pid)` biasa SETELAH reuse MEMBUNUH decoy — membuktikan race kill-by-number itu nyata |
| PIDFD-T8 (Bun `bun:ffi`) | 2/2 PASS × 2 — `pidfd_open`/`pidfd_send_signal` via `bun:ffi` BEKERJA di Bun 1.4.4 (fd pidfd 5/6, errno via `__errno_location`) |
| PIDFD-T11 (urutan referensi Bun) | 5/5 PASS × 3 — signaled+confirmed (T11a); starttime salah / marker salah / target mati+reap / zombie → ditolak, TIDAK ADA sinyal ke proses lain (T11b–T11e) |
| PIDFD-T12 (oracle reuse paksa) | 4/4 PASS × 2 — urutan penuh lolos di semua titik injeksi reuse: sebelum langkah 1 (`identity-mismatch`), di antara open dan re-validasi (`identity-changed`), dan setelah open dengan re-validasi dilewati sengaja (ESRCH, decoy hidup) |

**Jendela race yang TETAP ADA — dinyatakan dengan jujur:**

- **(a) Kill-salah-sasaran: DITUTUP oleh pidfd.** Tidak ada jendela
  waktu di mana `pidfd_send_signal` dapat mengenai proses lain
  (T2, T12d). Satu-satunya jalur yang tersisa membutuhkan tabrakan
  starttime — lihat (b).
- **(b) Tabrakan starttime (U-41):** `pidfd_open` pada langkah 2 dapat
  terjadi SETELAH reuse — bila proses baru KEBETULAN memiliki starttime
  yang sama persis dengan korban, langkah 3 juga lolos dan sinyal
  mengenai proses baru. `starttime` beresolusi ~10 ms (100 tick/detik);
  tabrakan membutuhkan reuse dalam jendela langkah 1→2 DAN start dalam
  tick yang sama. Jendela langkah 1→2 diukur (PIDFD-T9): p99 ≈ 42–46 µs;
  P per cleanup ≈ 6–7e-9 pada pid_max default 4.194.304 (laju spawn
  628/detik), naik menjadi ≈ 2,8e-5 pada pid_max=1024. Angka ini adalah
  estimasi orde-besaran (asumsi laju spawn konstan + sebaran seragam),
  bukan probabilitas eksak — lihat STAGE-P08 untuk ambang keputusan.
- **(c) Kebutaan zombie pidfd (temuan PIDFD-T4):** pada zombie,
  `pidfd_open` berhasil DAN `pidfd_send_signal` (sig 0 maupun SIGKILL)
  mengembalikan 0 — pidfd TIDAK dapat membedakan zombie dari hidup.
  Karena itu pidfd TIDAK BOLEH dipakai sebagai satu-satunya probe
  liveness; langkah 1, 3, dan 5 memakai pemeriksaan `/proc` yang
  zombie-aware (T11e). Residual: runtime tanpa `/proc` kembali ke
  fallback `kill(pid,0)` yang buta zombie (U-37 — tidak berubah).
- **(d) Alternatif yang DITOLAK — pinning lewat dirfd `/proc/<pid>`:**
  hipotesis bahwa membuka `/proc/<pid>` lalu membaca `stat` lewat
  dirfd akan mem-pin task lama **DITOLAK oleh eksperimen**
  (PIDFD-T10: setelah target mati + di-reap, `stat` lewat dirfd gagal
  ESRCH — bahkan setelah PID dipakai ulang; dirfd TIDAK mem-pin task).
  Dirfd pinning TIDAK masuk ke desain.

**Fallback bila pidfd tidak tersedia (mengikat).** Bila `pidfd_open`
tidak tersedia di runtime produksi (syscall diblokir seccomp, atau
binding FFI tidak ada), `signalWorkerByPidfd` mengembalikan
`pidfd-unavailable` secara eksplisit — TIDAK PERNAH diam-diam memakai
`kill(pid)`. Pemanggil memakai fallback v2.3.2 (validasi identitas
per-sinyal + baca ulang starttime tepat sebelum `kill()`) dengan
jendela residual ~46 µs dan P ≈ 7e-9 per cleanup (PIDFD-T9). Fallback
ini HANYA diizinkan dengan persetujuan eksplisit owner setelah
STAGE-P07 FAIL (lihat §D.4.15).

**Aturan yang mengikat dari bagian ini:**
- Pensinyalan worker lama WAJIB memakai `signalWorkerByPidfd`
  (urutan 1–5) bila pidfd tersedia di runtime; `process.kill(pid)`
  langsung untuk worker lama DILARANG kecuali sebagai fallback yang
  disetujui (§D.4.15 STAGE-P07).
- `pidfd_open` TIDAK BOLEH dipakai sebagai probe liveness — liveness
  selalu diputuskan lewat `/proc` zombie-aware.
- Re-validasi starttime SETELAH `pidfd_open` adalah langkah wajib;
  melewatinya DILARANG (meski sinyal via pidfd tetap aman tanpanya,
  urutan akan menunggu konfirmasi yang tidak pernah datang).

#### A.5.5.3 Pidfile atomik (v2.3.2 — TIDAK PERNAH SETENGAH TERTULIS)

**Aturan yang mengikat.** Pidfile ditulis dengan urutan yang tidak
dapat menghasilkan keadaan setengah tertulis:

1. Tulis record lengkap ke file sementara di direktori yang SAMA
   dengan pidfile (`<pidfile>.tmp.<pid>.<timestamp>` — nama unik per
   proses penulis agar dua penulis tidak menimpa file sementara yang
   sama).
2. `fsync` file sementara (isi lengkap mencapai disk).
3. `rename` atomik file sementara menjadi pidfile (satu operasi
   atomik pada filesystem yang sama — pembaca hanya pernah melihat
   pidfile lama yang lengkap ATAU pidfile baru yang lengkap, tidak
   pernah campuran keduanya).
4. `fsync` direktori (entri rename mencapai disk — tanpa ini, crash
   tepat setelah rename dapat mengembalikan pidfile lama setelah
   reboot).

**Isi metadata identitas proses (wajib, semua field harus ada):**

| Field | Isi | Fungsi |
| --- | --- | --- |
| `parentPid` | PID proses parent yang menulis | Mengikat pidfile ke satu parent |
| `workerPid` | PID DNS worker | Target cleanup bila parent mati |
| `workerStarttime` | Start time worker (`/proc` field 22) | Pengikat anti-PID-reuse (lihat §A.5.5.2) |
| `workerToken` | Token acak per worker | Tantangan identitas via IPC (lihat §A.5.5.2) |
| `writtenAt` | Timestamp penulisan (ms) | Deteksi kebasian + urutan penulisan |
| `version` | Versi skema pidfile (1) | Penolakan skema lama yang tidak dikenal |

**Aturan pembacaan (fail-closed):**

- Pidfile TIDAK ADA → tidak ada klaim worker → jalur (b) §A.5.5.1
  (boleh READY).
- Pidfile ADA tetapi JSON tidak terbaca ATAU field wajib hilang →
  "tidak dapat dibuktikan" → parent tetap `NOT_READY` + page (lihat
  §A.5.5.1). Operator harus memeriksa manual sebelum pidfile
  diperbaiki/dihapus — penghapusan otomatis pidfile rusak DILARANG
  (dapat menghapus bukti satu-satunya tentang worker yang mungkin
  masih hidup).
- Pidfile ADA dan valid tetapi `version` tidak dikenal → perlakukan
  sebagai rusak (aturan yang sama).

Dibuktikan SU-T4 (`SSRF_SPIKE_V232.md` §2): 20 penulis bersamaan →
file selalu berisi SATU record lengkap yang valid; file sementara
setengah tertulis yang tidak pernah di-rename tidak merusak pidfile
(record sesudah "crash" identik dengan sebelumnya).

#### A.5.5.3a Visibilitas atomik BUKAN durabilitas (v2.3.3 — BATAS BUKTI)

SU-T4 membuktikan **atomic visibility**: rename atomik membuat
pembaca hanya pernah melihat pidfile lama yang lengkap ATAU pidfile
baru yang lengkap, tidak pernah campuran keduanya. SU-T4 TIDAK
membuktikan **durabilitas** — yaitu bahwa data pidfile bertahan setelah
crash daya/OS. Perbedaan keduanya:

- **Atomic visibility** — rename atomik menjamin file terlihat lengkap
  sekaligus oleh pembaca lain. Ini dijamin oleh semantik rename pada
  filesystem yang sama, dan SU-T4 mengujinya.
- **Durability** — `fsync` file + `fsync` direktori menjamin data dan
  entri rename benar-benar mencapai penyimpanan persisten dan bertahan
  setelah crash. Ini hanya dapat dibuktikan dengan uji crash nyata
  pada filesystem yang dipakai produksi, dan bergantung pada
  filesystem + perangkat penyimpanan + konfigurasi OS.

**Batas bukti yang dicatat dengan jujur (v2.3.3):** seluruh pengujian
di VM ini berjalan di `/tmp` yang bertipe **tmpfs** — fsync di tmpfs
tidak menguji durabilitas disk sama sekali (tmpfs adalah RAM).
`/home` berada di overlay btrfs dengan opsi `fsync=volatile`, sehingga
durabilitas di sana juga bergantung pada penyimpanan di bawah overlay.
**Tidak ada bukti durability di VM ini yang membuktikan durability di
filesystem produksi.**

**Persyaratan yang mengikat (v2.3.3):**

- Pidfile dan startup lock HARUS berada di direktori penyimpanan
  persisten di runtime produksi — BUKAN di tmpfs (`/tmp`, `/dev/shm`)
  dan bukan di mount dengan opsi yang menonaktifkan durabilitas
  fsync. Lokasi persisten harus ditetapkan dan didokumentasikan saat
  implementasi (P0-1b), bersama output `df`/`mount` yang membuktikan
  filesystem-nya.
- Urutan tulis (temp → fsync file → rename → fsync direktori) TETAP
  berlaku; yang diuji di staging adalah apakah filesystem produksi
  benar-benar menghormati fsync tersebut.

**Rencana uji crash/durabilitas staging (v2.3.3 — wajib, gerbang G6):**

| Uji | Apa yang diuji | Cara mensimulasikan | Kriteria lolos |
| --- | --- | --- | --- |
| D-01 | Pidfile lengkap sesudah crash tepat setelah rename | Tulis pidfile (urutan lengkap) lalu matikan paksa VM/container tepat setelah rename kembali, sebelum proses berikutnya sempat membaca | Pidfile sesudah reboot berisi SATU record lengkap yang valid — pidfile baru ATAU pidfile lama, tidak pernah parsial/corrupt |
| D-02 | Pidfile lama tidak hilang bila crash sebelum fsync direktori | Tulis pidfile, jeda tepat sebelum fsync direktori, matikan paksa | Pidfile sesudah reboot adalah record lama yang lengkap (bukan hilang dan bukan parsial) |
| D-03 | Pidfile tidak hilang bila crash saat menulis file sementara | Matikan paksa saat file sementara sedang ditulis (sebelum rename) | Pidfile lama tetap utuh; file sementara setengah tertulis tidak pernah terlihat sebagai pidfile |

Bila filesystem runtime produksi ternyata berbeda dari VM (atau
memiliki opsi yang melemahkan fsync), D-01..D-03 harus dijalankan di
lingkungan staging yang memakai filesystem yang sama dengan produksi —
bukti dari VM ini TIDAK dapat dipakai sebagai pengganti. Risiko U-27
mencatat batas ini.

#### A.5.5.4 Startup lock: satu parent, satu cleanup (v2.3.2 — PENCEGAHAN DUA PARENT BERSAMAAN; DIPERKERAS v2.3.3; RACE TERBUKTI DAN DIPERBAIKI v2.3.4)

**Aturan yang mengikat.** Dua parent TIDAK BOLEH melakukan cleanup
atau mengklaim worker secara bersamaan. Mekanisme v2.3.2/v2.3.3 (O_EXCL
create + reklamasi berbasis probe ESRCH + unlink) **TERBUKTI MENGANDUNG
RACE** pada revisi ini (ADV-T1, `SSRF_SPIKE_V234.md` §3a) dan
**DIGANTI** oleh mekanisme flock pada §A.5.5.4c di bawah. Bagian
§A.5.5.4a–§A.5.5.4b mendokumentasikan kegagalan itu dengan jujur —
bukan untuk dipertahankan, melainkan agar peninjau dapat memeriksa
bahwa perbaikan memang menjawab keberatan yang diajukan.

#### A.5.5.4a Urutan operasi aktual `acquireStartupLock` v2.3.3 (BUKTI KEGAGALAN)

Pseudocode di bawah adalah transkripsi PERSIS dari implementasi referensi
v2.3.3 (`spike-harness-v233/startup.cjs`, fungsi `acquireStartupLock`,
jalur yang ditempuh saat lock sudah ada) — bukan versi idealnya. Jendela
race ditandai `[RACE]`.

```text
acquireStartupLock(lockPath, identity):
  for attempt in 0..maxReclaim (3):
    try:
      fd = open(lockPath, 'wx')            # O_EXCL create — atomik
      write(fd, record{pid, starttime, heartbeatAt}) ; fsync(fd)
      if !verifyLockOwnership(lockPath, identity):   # baca path, bandingkan pid+starttime
        close(fd); return {acquired:false, reason:'ownership-revalidation-failed'}
      return {acquired:true, fd, record, reclaimed: attempt>0}
    catch EEXIST:
      holder = parse(read(lockPath))       # baca record pemegang lama
      if !parseable OR holder.pid bukan number:
        return {acquired:false, reason:'lock-unreadable', page:true}
      probeRes = probe(holder.pid)         # kill(pid,0) + /proc
      if probeRes == dead (ESRCH):
        unlink(lockPath)                   # [RACE-1] unlink TAK BERSYARAT
        continue                           # -> ulang loop, coba create lagi
      if probeRes == uncertain:            # EPERM / stat tak terbaca
        return {acquired:false, reason:'holder-unverifiable', page:true}
      if probeRes == alive:
        return {acquired:false, reason:'held-by-live-holder' / 'holder-identity-mismatch'}
  return {acquired:false, reason:'reclaim-exhausted'}
```

- **[RACE-1] — unlink tak bersyarat setelah probe basi (INTI KEBERATAN).**
  Keputusan unlink didasarkan pada hasil probe yang dibaca SEBELUM unlink;
  tidak ada pemeriksaan ulang bahwa file di path masih file yang sama dengan
  yang diprobe. B dapat meng-unlink file lock baru milik A (dibuat setelah
  probe B) dan kemudian membuat lock sendiri. O_EXCL TIDAK melindungi dari
  ini: O_EXCL hanya men-serialisasi pembuatan file ketika path belum ada —
  ia tidak mencegah penghapusan.
- **[RACE-2] — verify adalah pemeriksaan sesaat (point-in-time).** Setelah
  `verifyLockOwnership` mengembalikan true, TIDAK ADA mekanisme yang
  mempertahankan kepemilikan: proses lain dapat meng-unlink file lock kapan
  saja selama masa hidup parent. Otoritas lock "menguap" begitu path
  dihapus — fd yang dipegang A tetap terbuka pada inode yang sudah
  di-unlink, dan heartbeat A menulis ke inode yang tidak terlihat siapa pun.
- **Bukan jendela:** probe ESRCH -> PID reuse (proses baru memakai ulang angka
  PID antara probe dan unlink) — penghapusan file klaim basi tetap aman dalam
  jendela ini karena proses baru itu tidak memegang lock.

**Bukti:** ADV-T1 (`SSRF_SPIKE_V234.md` §3a) mereproduksi skenario keberatan
secara deterministik (barrier: B menahan unlink sampai A selesai acquire):
**2 pemilik pada 2/2 run** — A memperoleh lock (ino 103) dan B menghapus
file A lalu memperoleh lock sendiri (ino 107). `aFileDeleted=true`.

#### A.5.5.4b Mengapa SU10-T1 tidak cukup (v2.3.4 — KLAIM v2.3.3 DITARIK)

Klaim v2.3.3 bahwa "balapan hapus+create diselesaikan oleh O_EXCL" dan
bahwa SU10-T1 membuktikan balapan reklamasi terkelola **ditarik** pada
revisi ini. SU10-T1 (5 parent mereklamasi lock basi bersamaan, tepat 1
pemenang) TIDAK membuktikan tidak adanya race ini:

1. Dalam balapan acak, kelima racer mem-probe + meng-unlink dalam ledakan
   yang rapat; unlink pihak yang kalah hampir selalu mendarat SEBELUM
   pemenang membuat file (jendela T1 hanya terbuka setelah pemenang
   create+verify — rentang waktu sempit yang jarang tertembak acak). Yang
   kalah kemudian membaca ulang file pemenang yang HIDUP dan keluar via
   `held-by-live-holder`.
2. SU10-T1 hanya menguji SATU titik dalam ruang interleaving (semua pihak
   mulai bersamaan, tanpa penahanan). Ia tidak pernah menahan satu pihak
   pada titik kritis (setelah probe, sebelum unlink) sementara pihak lain
   menyelesaikan akuisisi — persis interleaving yang ditanyakan keberatan.
3. Bukti "tepat satu pemenang" dalam balapan acak adalah bukti
   probabilistik (tidak terjadi pada N percobaan), bukan bukti
   ketidakmungkinan. Tes adversarial dengan barrier (ADV-T1/T3a/T3c)
   mengubahnya menjadi bukti deterministik: tiap interleaving diuji
   sendiri-sendiri dengan penahanan pada titik kritisnya.

Yang TETAP benar dari v2.3.3: verify MENANGKAP interleaving unlink-sebelum-
verify (ADV-T3a: A gagal `ownership-revalidation-failed`, tepat satu
pemilik), dan O_EXCL men-serialisasi pembuatan BILA kedua unlink mendahului
kedua create (ADV-T3c). Kedua fakta itu tidak menjawab keberatan — karena
keberatan bukan tentang create, melainkan tentang unlink atas file baru.

#### A.5.5.4c Perbaikan v2.3.4: flock sebagai primitif kepemilikan (MENGIKAT)

**Perubahan perilaku inti.** Primitif kepemilikan diganti dari O_EXCL +
probe + unlink menjadi **flock(LOCK_EX|LOCK_NB) pada fd yang dipertahankan
terbuka selama masa hidup proses**. Jalur reklamasi berbasis probe ESRCH +
unlink **DIHAPUS SELURUHNYA** — tidak ada lagi penghapusan file lock dalam
kode apa pun. Aturan-aturan berikut MENGIKAT:

- **Akuisisi:** file lock dibuka `O_RDWR|O_CREAT` (tanpa O_EXCL, tanpa
  truncate) — file hanya rendezvous point. Dua proses yang bersamaan
  membuka file yang sama (inode yang sama); **kernel** yang memutuskan
  siapa pemiliknya lewat flock. `flock` gagal EWOULDBLOCK berarti pemegang
  hidup -> parent yang kalah KELUAR SEGERA (exit code 78, log
  `startup-lock-held-by:<pid>`) dan TIDAK melakukan cleanup, startup,
  atau penulisan pidfile apa pun. Menunggu tanpa batas DILARANG; ikut
  cleanup DILARANG; mengklaim worker DILARANG.
- **Pelepasan otomatis (menggantikan reklamasi):** holder yang mati
  melepaskan flock OTOMATIS saat proses berakhir — kernel menutup fd.
  Tidak ada lagi "lock basi" yang harus direklamasi, tidak ada lagi probe
  kematian PID dalam jalur akuisisi lock. Parent baru yang datang setelah
  holder mati langsung memperoleh flock (dibuktikan FLK-T2: contender
  memperoleh lock segera setelah holder di-SIGKILL).
- **Aturan never-unlink (load-bearing, dibuktikan FLK-T5):** file lock
  TIDAK PERNAH di-unlink oleh siapa pun — bukan hanya oleh kode, tetapi
  juga oleh operator dan tooling (runbook). Bila path di-unlink dan file
  baru dibuat, opener baru memperoleh flock pada inode BARU sementara
  holder lama masih memegang flock pada inode lama — dua "pemegang" hidup
  berdampingan. flock saja tidak cukup; never-unlink adalah bagian dari
  desain, bukan etiket. Satu-satunya pengecualian: penghapusan saat SEMUA
  parent dipastikan berhenti (prosedur flag-day, §A.5.5.4d).
- **Penulisan identitas:** setelah flock berhasil, parent menulis
  identitasnya (PID + starttime + token acak per-akuisisi + heartbeat)
  ke dalam file lock via fd YANG SAMA (tidak pernah open ulang).
  Heartbeat diperbarui tiap 5 dtk (fsync tiap penulisan) — HANYA untuk
  observabilitas ("pemegang masih hidup dan sehat"), TIDAK PERNAH dipakai
  dalam keputusan akuisisi.
- **Validasi ulang kepemilikan setelah acquire (DIPERKERAS v2.3.4):**
  setelah acquire berhasil, parent WAJIB menjalankan
  `verifyFlockOwnership` SEBELUM cleanup apa pun, dan mengulanginya
  sesaat sebelum langkah destruktif pertama (spawn worker / tulis pidfile).
  Verifikasi memakai DUA pemeriksaan yang keduanya wajib lolos:
  (1) (dev, ino) `fstat(fd)` vs `stat(path)` sama;
  (2) record dibaca via PATH (open segar O_RDONLY — BUKAN via fd yang
  dipegang, karena fd dapat menunjuk ke inode yang sudah di-unlink
  tetapi isinya masih record kita) dan HARUS berisi pid + starttime +
  token acak 128-bit per-akuisisi kita.
  Bila verifikasi gagal -> tutup fd (lepas flock), keluar dengan alasan
  `ownership-revalidation-failed`, TIDAK melakukan cleanup.
  **Batas yang dicatat jujur:** pemeriksaan inode saja TIDAK CUKUP sebagai
  identitas — nomor inode didaur ulang oleh filesystem secara umum
  (tidak teramati dalam 30 percobaan unlink+recreate di VM ini: 0/30
  tmpfs, 0/30 overlay — `SSRF_SPIKE_V234.md` §4c). Token dipertahankan
  sebagai defense-in-depth (biaya ~nol); yang terbukti menahan beban di
  VM ini adalah kombinasi inode + baca-via-path, dan diagnostik T6
  inode-only mendeteksi penggantian pada 2/2 run.
- **fd WAJIB close-on-exec (MENGIKAT):** fd lock harus dibuka dengan
  O_CLOEXEC (Node/Bun `fs.openSync` sudah demikian secara default).
  Bila worker (child process) mewarisi fd lock, kematian parent TIDAK
  melepaskan flock selama worker hidup — dibuktikan FLK-T8b (contender
  tetap terblokir selama anak yatim memegang fd inheritable). Persyaratan
  ini wajib diverifikasi di staging untuk API open yang dipakai runtime
  produksi (U-29). Parent TIDAK BOLEH mewariskan fd lock ke child mana
  pun (pass_fds / pewarisan eksplisit atas fd lock DILARANG).
- **Tabel perlakuan hasil pemeriksaan proses v2.3.3 (probe ESRCH/EPERM)
  untuk LOCK dinyatakan SUPERSEDED** — jalur itu tidak ada lagi. Probe
  kematian PID tetap dipakai untuk CLEANUP WORKER (§A.5.5.1/§A.5.5.2:
  validasi identitas sebelum SIGKILL, konfirmasi exit) dan tidak berubah
  oleh revisi ini. Aturan lock rusak/tidak terbaca v2.3.3 ("JANGAN PERNAH
  hapus otomatis") digantikan oleh: isi file lock tidak lagi menjadi
  otoritas apa pun — bila record tidak terbaca, parent tetap dapat
  memperoleh flock (otoritas dari kernel); record yang tidak terbaca hanya
  dicatat sebagai peringatan observabilitas, dan parent TIDAK BOLEH
  menghapus file untuk "memperbaikinya".

Dibuktikan ADV-T2 (`SSRF_SPIKE_V234.md` §4a): interleaving yang sama
dengan ADV-T1 pada kode flock — tepat satu pemilik (2/2 run). Dibuktikan
ADV-T2sim: kedua pihak mencoba flock bersamaan — tepat satu pemenang,
kernel yang men-serialisasi (2/2 run, pemenang bervariasi). Dibuktikan
ADV-T5: unlink oleh pihak ketiga setelah acquire terdeteksi oleh
verifikasi ulang (2/2 run, 0 cleanup). Dibuktikan FLK-T1..T8
(`SSRF_SPIKE_V234.md` §5c): semantik flock kernel pada tmpfs dan overlay
(9/9 × 2 tiap filesystem).

#### A.5.5.4d Masa transisi versi campuran: flag-day (v2.3.4 — MENGIKAT)

ADV-T6 membuktikan: bila racer berkode LAMA (unlink-reclaim) berjalan
bersamaan dengan holder berkode BARU (flock), KEDUA pihak dapat berstatus
pemilik — unlink kode lama menghapus file holder baru, lalu kode lama
memperoleh lock sendiri. Jaring pengaman (verifikasi ulang inode+token)
menangkapnya SEBELUM cleanup pada 2/2 run, tetapi itu adalah jaring
pengaman, bukan penutup struktural. Karena itu:

- **Migrasi ke mekanisme flock WAJIB flag-day:** hentikan SEMUA parent
  (pastikan tidak ada proses parent lama yang masih berjalan — periksa
  `ps` + pidfile), baru kemudian start parent versi baru. Menjalankan
  versi lama dan baru secara bersamaan DILARANG selama masa transisi.
- Prosedur rollback ke versi lama mengikuti aturan yang sama (hentikan
  semua parent dulu).
- Bila verifikasi ulang gagal selama masa transisi, parent baru keluar
  dengan alasan `ownership-revalidation-failed` + page — operator
  memeriksa apakah ada parent versi lama yang masih berjalan sebelum
  start ulang.

Dibuktikan SU-T5 (`SSRF_SPIKE_V232.md` §2) pada mekanisme LAMA: 5 proses
nyata berlomba — tepat 1 pemenang, 4 kalah dengan alasan
`held-by-live-holder`. Pada mekanisme BARU (flock), padanannya adalah
ADV-T2sim (`SSRF_SPIKE_V234.md` §4a): tepat 1 pemenang, kernel yang
men-serialisasi. Dibuktikan SU-T6 pada mekanisme LAMA: pemegang lock mati
→ parent baru berhasil acquire dengan `reclaimed=true`. Pada mekanisme
BARU tidak ada lagi konsep reklamasi — pelepasan flock saat holder mati
dibuktikan FLK-T2 (contender memperoleh lock segera setelah holder
di-SIGKILL).

**Temuan jujur dari pengujian PARENT-T1b (kegagalan run pertama).**
Run pertama T1b GAGAL: worker "stubborn" ternyata mati sendiri setelah
parent di-SIGKILL meskipun handler `disconnect` dan watchdog ppid
dimatikan. Penyebab: worker tidak memegang handle aktif apa pun — saat
channel IPC tertutup, event loop Node kosong dan proses keluar sendiri.
Artinya skenario yatim TIDAK DAPAT direproduksi tanpa handle aktif.
Perbaikan harness (bukan perbaikan implementasi): worker stubborn kini
memegang interval ref'd sebagai simulasi handle native c-ares yang
tertunda — lookup DNS nyata yang menggantung memang menahan event loop.
Setelah perbaikan, T1b lolos. Kegagalan ini didokumentasikan karena ia
membuktikan satu hal penting: **worker yang tidak memegang lookup aktif
tidak bisa menjadi yatim** — bahaya yatim hanya nyata bila worker sedang
menjalankan operasi yang menahan event loop.

**U-22 — supervisor eksternal belum terbukti (risiko terbuka baru).**
Dua lapis pertama (self-exit + pidfile cleanup) terbukti di VM ini.
Lapis ketiga — supervisor platform — TIDAK DAPAT diperiksa: apakah
platform me-restart proses layanan saat crash, dan apakah ia membunuh
seluruh process group atau hanya proses utama, tidak terdokumentasi di
bundle bukti mana pun. Persyaratan staging (gerbang G6, uji SUP-01):
dokumentasi supervisor platform HARUS menyatakan (a) apakah crash
memicu restart otomatis, dan (b) apakah anak proses dibunuh bersama
parent (kill process group) atau dibiarkan hidup. Bila supervisor tidak
membunuh process group, pidfile cleanup + self-exit adalah satu-satunya
pertahanan dan harus diuji ulang di staging produksi. Tanpa bukti
supervisor, klaim "tidak ada yatim" hanya berlaku sejauh dua lapis yang
teruji di sini.

**Risiko baru U-21 — exit worker tidak terkonfirmasi.** Bila proses
worker tidak mati setelah SIGKILL (D-state, namespace bermasalah),
counter tetap, breaker tetap terbuka, dan satu-satunya jalan keluar
adalah intervensi operator (page) atau restart manual proses layanan.
Ini adalah perilaku fail-closed yang disengaja — ketersediaan
dikorbankan demi tidak berbohong pada penghitung — tetapi berarti satu
worker yang tidak bisa mati dapat menahan breaker terbuka sampai
intervensi manual. Mitigasi: alert `workerExitUnconfirmed > 0` → page;
runbook: periksa proses (`ps`), bila proses ada tetapi tidak merespons,
eskalasi ke operator infra; JANGAN memaksa decrement counter secara
manual tanpa bukti proses mati.

#### A.5.5.4e Otoritas kepemilikan flock: bagaimana proses tahu ia masih pemilik (v2.3.5 — MENJAWAB U-31)

**Pernyataan inti.** Kepemilikan lock TIDAK dibuktikan oleh isi file,
bukan oleh (dev, ino), bukan oleh token, bukan oleh heartbeat. Kepemilikan
dibuktikan oleh SATU fakta kernel: **proses ini memegang
flock(LOCK_EX|LOCK_NB) pada open file description yang sama sejak acquire,
dan fd itu masih terbuka**. (dev, ino) + token adalah DETEKTOR penggantian
path (authority fork) — ia memberi tahu bila file di path sudah bukan
file yang di-lock — tetapi ia bukan pengganti mekanisme eksklusivitas
kernel. Bila (dev, ino) cocok dan token cocok, itu BUKAN bukti "saya
pemilik"; bukti "saya pemilik" adalah flock yang masih dipegang. Bila
(dev, ino) atau token TIDAK cocok, itu bukti "sesuatu berubah di path"
dan tindakan DIBATALKAN — detektor bekerja sebagai fail-closed, bukan
sebagai otoritas.

**1. Fd yang sama sepanjang lifecycle.** Fd lock dibuka sekali di
`acquireStartupLockFlockV2` (`O_RDWR|O_CREAT`, tanpa O_EXCL, tanpa
truncate) dan dipertahankan terbuka selama masa hidup proses. Fd TIDAK
PERNAH ditutup lalu dibuka ulang, TIDAK PERNAH di-duplikasi ke fd lain
untuk keperluan verifikasi, dan TIDAK PERNAH diserahkan ke proses lain.
`verifyFlockOwnership` memakai `fstat(fd)` pada fd YANG SAMA — bukan
open baru — untuk membandingkan (dev, ino) dengan `stat(path)`.
Bila fd ditutup (proses mati, atau `releaseLock` eksplisit), flock
lepas OTOMATIS oleh kernel (dibuktikan FLK-T2/T3/T7). Tidak ada keadaan
di mana proses "masih pemilik" setelah fd-nya tertutup.

**2. CLOEXEC diverifikasi, bukan diasumsikan.** Setelah open, flag
O_CLOEXEC diperiksa dengan membaca `/proc/self/fdinfo/<fd>` dan
menguji bit `02000000` oktal pada `flags:`. Bila tidak set, startup
GAGAL (`lock-fd-not-cloexec`) — tidak ada fallback. Alasan: bila fd
lock diwariskan ke child (worker), kematian parent TIDAK melepaskan
flock selama worker hidup — dibuktikan FLK-T8b (contender tetap
terblokir selama anak yatim memegang fd inheritable) dan AUTH-T4
(Python: contender BLOCKED selama child pemegang fd hidup, ACQUIRED
setelah child mati). Node dan Bun `fs.openSync` membuka dengan
O_CLOEXEC secara default — DIVERIFIKASI AUTH-C1 (flag fdinfo
`02100001` oktal pada keduanya; round-trip `F_SETFD` Python) — tetapi
desain TIDAK mengandalkannya: verifikasi fdinfo adalah langkah wajib
di setiap acquire. Parent TIDAK BOLEH mewariskan fd lock ke child mana
pun (`pass_fds` / pewarisan eksplisit atas fd lock DILARANG); worker
menerima token lewat FILE (pidfile), bukan lewat fd.

**3. Mencegah unlink / penggantian / pembuatan ulang selama lock aktif.**
Tiga lapis, masing-masing dengan peran berbeda:
- (a) **Aturan never-unlink** (§A.5.5.4c, dibuktikan FLK-T5): file
  lock TIDAK PERNAH di-unlink oleh kode, operator, atau tooling.
  Ini adalah aturan perilaku, BUKAN penegakan kernel — flock bersifat
  advisory dan tidak dapat menghentikan proses yang tidak memanggilnya
  (lihat U-33). Satu-satunya pengecualian adalah flag-day dengan
  SEMUA parent dipastikan berhenti (§A.5.5.4d).
- (b) **Detektor penggantian path.** Setiap `verifyFlockOwnership`
  membandingkan (dev, ino) `fstat(fd)` vs `stat(path)` DAN membaca
  record via PATH (open segar `O_RDONLY` — BUKAN via fd yang dipegang,
  karena fd dapat menunjuk ke inode yang sudah di-unlink tetapi isinya
  masih record kita). Bila keduanya tidak cocok → otoritas dinyatakan
  hilang → tindakan dibatalkan. Dibuktikan AUTH-T2 (unlink+recreate
  terdeteksi, `verifiedAfterInterference=false`, 0 cleanup) dan
  AUTH-T10d (pidfile di-rename terdeteksi worker meski konten identik).
- (c) **Gating tindakan, bukan hanya deteksi.** Deteksi tanpa gating
  tidak ada gunanya. Setiap tindakan sensitif — SIGKILL worker lama,
  tulis pidfile, spawn worker, transisi READY — didahului
  `assertOwnership()` SEgar dalam tick sinkron yang sama, tanpa `await`
  di antaranya (`guardedAction`, lihat butir 5). Bila verifikasi gagal,
  fungsi tindakan TIDAK PERNAH dijalankan.

**4. Inode mismatch antara fd dan path.** Bila `fstat(fd).ino !=
stat(path).ino` (atau `dev` berbeda), itu berarti path kini menunjuk
file lain — inode lama di-unlink dan file baru dibuat, atau path
di-replace (rename/mount). Perlakuan: otoritas dinyatakan hilang;
parent menutup fd (melepas flock pada inode lama), keluar dengan alasan
`ownership-revalidation-failed` + page, TIDAK melakukan cleanup.
Daur ulang inode (nomor inode yang sama dipakai ulang oleh file baru)
tidak dapat dideteksi oleh (dev, ino) saja — karena itu record juga
memeriksa token acak 128-bit per-akuisisi; token dipertahankan sebagai
defense-in-depth (biaya ~nol), dan yang terbukti menahan beban di VM
ini adalah kombinasi inode + baca-via-path (diagnostik T6 v2.3.4:
mendeteksi penggantian 2/2 run; probe daur ulang 0/30 tmpfs, 0/30
overlay). Bila inode SAMA tetapi token BERBEDA, itu juga kegagalan
verifikasi (record ditimpa pihak ketiga) → batalkan tindakan.

**5. Gating setiap tindakan sensitif (guardedAction).** Pola yang
mengikat:

```
ok = assertOwnership(lockPath, fd, record)   // sinkron, tanpa await
if (!ok) return { ok:false, reason:"ownership-lost" }  // fn TIDAK jalan
value = fn()                                 // tick sinkron yang sama
```

`assertOwnership` = `verifyFlockOwnership`: (1) (dev, ino) fstat(fd)
vs stat(path) sama; (2) record via path berisi pid + starttime + token
kita. TIDAK ADA `await` antara revalidasi dan `fn()` — keduanya dalam
satu tick sinkron yang sama, sehingga tidak ada interleaving kooperatif
di antaranya. Jendela yang tersisa adalah antara dua syscall di dalam
tick itu (revalidasi selesai, tindakan dimulai) — jendela ini TIDAK
dapat dibuat nol dengan syscall file biasa (residual U-38). Yang
membuatnya dapat diterima adalah butir 6: tiap tindakan ITU SENDIRI
di-gating identitas, sehingga pemilik basi yang lolos dari jendela
tidak dapat menimbulkan kerusakan di luar fail-closed.

**6. Gating per-tindakan (defense-in-depth di dalam tindakan).**
- **SIGKILL worker lama:** validasi identitas per-sinyal (§A.5.5.2)
  — starttime + cmdline worker dibaca ulang sesaat sebelum `kill()`,
  dalam tick yang sama; bila tidak cocok, sinyal dibatalkan. Pemilik
  basi paling buruk membunuh worker yang identitasnya cocok dengan
  pidfile — worker yang sama yang akan dibunuh pemilik sah (SIGKILL
  idempotent; dampak terbatas).
- **Tulis pidfile:** pidfile membawa `lockToken` (token acak
  per-akuisisi parent). Worker yang membaca pidfile dengan token yang
  tidak cocok dengan record lock MENOLAK melayani SEBELUM lookup
  pertamanya (AUTH-T10b). Parent yang kalah menulis pidfile dengan
  token basi tidak dapat "membajak" worker — worker menolaknya.
- **Spawn worker:** spawn dilakukan HANYA setelah `guardedAction`
  untuk penulisan pidfile lolos; worker baru membaca pidfile yang
  ditulis parent yang memegang otoritas saat itu.
- **Transisi READY:** `guardedAction` terakhir sebelum menulis
  sinyal `parent-ready`; bila otoritas hilang di titik ini, parent
  keluar `ownership-lost-before-ready` dan TIDAK melayani lookup.

**7. Parent crash, child masih hidup, supervisor restart.**
- **Parent crash (SIGKILL):** kernel menutup fd → flock lepas
  otomatis (FLK-T2). Parent baru langsung memperoleh flock; record
  lama diklasifikasi `flock-v2-stale` (holder dinilai mati lewat
  `pidAlive` yang zombie-aware, butir 8) dan ditimpa. Dibuktikan
  AUTH-T3 (parent baru READY, worker lama dibunuh, worker baru
  melayani) dan AUTH-T7 (via supervisor stub).
- **Child (worker) masih hidup setelah parent mati:** worker
  mendeteksi lewat DUA lapis — self-exit via `disconnect`/ppid
  watchdog (PARENT-T1a/T1b v2.3.1) DAN probe pidfile flock berkala:
  bila parent mati, flock pidfile lepas → probe worker BERHASIL
  (tidak ada yang memegang) → worker menyimpulkan tidak ada parent
  hidup → exit sendiri (AUTH-T10c). Worker TIDAK PERNAH memegang fd
  lock (CLOEXEC, butir 2), sehingga kematiannya tidak menahan flock.
- **Supervisor restart:** parent baru menjalankan siklus penuh —
  pre-start scan (§A.5.5.4f), acquire flock, klasifikasi record,
  cleanup worker lama via pidfile (validasi identitas + SIGKILL +
  konfirmasi exit, §A.5.5.1/§A.5.5.2), spawn worker baru, tulis
  pidfile + flock pidfile, tunggu worker self-check, READY. Lease
  global `scan_leases` bertahan melewati restart (PARENT-T2 v2.3.1).
  Perilaku supervisor platform (apakah me-restart otomatis, apakah
  membunuh process group) TETAP NOT VERIFIED (U-22, SUP-01).
- **Dua parent tidak pernah cleanup/startup bersamaan.** Mekanisme:
  kernel men-serialisasi flock (tepat satu pemenang — AUTH-T1,
  ADV-T2sim); yang kalah KELUAR SEGERA (exit 78) tanpa cleanup,
  startup, atau penulisan pidfile. Pre-start scan menangkap parent
  lama yang hidup sebelum acquire (§A.5.5.4f). Flag-day menutup
  jendela transisi versi (§A.5.5.4d). Satu-satunya jalan menuju dua
  pemilik yang tersisa adalah proses yang TIDAK memanggil flock
  (kode lama saat transisi, operator `rm`, tooling pihak ketiga) —
  dan untuk masing-masing, verifikasi ulang + gating per-tindakan
  memastikan tidak ada cleanup yang dilakukan tanpa otoritas
  (AUTH-T5c, AUTH-T6).

**8. Liveness zombie-aware (perbaikan v2.3.5 dari diagnosis AUTH-T3).**
`pidAlive()` v2.3.4 hanya memakai `kill(pid,0)` — dan itu SALAH untuk
zombie: proses zombie (state `Z`) masih ada di tabel proses sampai
di-reap, sehingga `kill(pid,0)` SUCCEEDS padahal proses sudah mati.
Dibuktikan langsung (§4.1 `SSRF_SPIKE_V235.md`): P1 setelah SIGKILL
tanpa reap → state `Z`, `kill(pid,0)` SUCCEEDS → `classifyLockRecord`
menilai holder hidup → `flock-v2-contradiction` → parent baru menolak
start. Perbaikan: `pidAlive()` membaca state `/proc/<pid>/stat` dulu —
`Z` (zombie) atau `X`/`x` (dead) → TIDAK hidup; hanya `R`/`S`/`D`/`T`
yang dihitung hidup. Fallback `kill(pid,0)` hanya bila `/proc` tidak
dapat dibaca (error non-ESRCH → `"uncertain"`). Perbaikan yang sama
menutup jalur konfirmasi exit worker (zombie worker kini dinilai mati,
bukan "exit tidak terkonfirmasi"). Dibuktikan AUTH-T11 (setup zombie
`state=Z` + `kill0=SUCCEEDS`, parent baru tetap READY, 2/2 run).
Residual: perbaikan bergantung pada `/proc`; runtime tanpa `/proc`
kembali ke fallback `kill(pid,0)` (U-37).

Dibuktikan AUTH-T1..T11 + AUTH-C1 (`SSRF_SPIKE_V235.md` §3):
18/18 PASS × 2 run.


#### A.5.5.4f Mixed-version fail-closed: dua lapis pencegahan (v2.3.5 — MENGIKAT)

ADV-T6 (v2.3.4) membuktikan SATU arah bahaya transisi: parent BARU
memperoleh flock DULU, lalu parent LAMA (unlink-reclaim) meng-unlink
file-nya dan memperoleh lock sendiri — dua pemilik, jaring pengaman
(verifikasi ulang) yang menangkapnya sebelum cleanup. Revisi ini
menjawab pertanyaan yang belum dijawab v2.3.4: bagaimana dengan arah
SEBALIKNYA — parent LAMA memperoleh lock DULU, lalu parent BARU datang?
Dan bagaimana mencegah dua versi menjadi pemilik secara bersamaan,
bukan hanya mendeteksinya?

**Bahaya reverse (old-first) — diidentifikasi v2.3.5.** Parent lama
TIDAK PERNAH memanggil flock. Ia membuka file lock, menulis record
format lama (tanpa field `protocol`), dan menganggap dirinya pemilik.
Parent baru membuka file yang sama dan memanggil
`flock(LOCK_EX|LOCK_NB)` — flock BERHASIL, karena tidak ada flock yang
dipegang siapa pun. Parent baru pun menganggap dirinya pemilik. KEDUA
pihak berstatus pemilik secara bersamaan — dan tidak seperti arah
new-first, tidak ada unlink yang terjadi di sini, sehingga TIDAK ADA
peristiwa yang dapat dideteksi verifikasi ulang inode: (dev, ino)
keduanya sama (file yang sama, inode yang sama), token parent baru
tertulis di record (parent baru baru saja menimpa record lama).
Satu-satunya yang membedakan adalah: record SEBELUM ditimpa adalah
format lama dengan holder yang masih hidup. Karena itu pencegahan
harus terjadi SEBELUM penimpaan — pada klasifikasi record dan
pre-start scan.

**Lapis 1 — pre-start guard (scan `/proc`).** Sebelum acquire, parent
baru memindai `/proc` untuk proses parent lain (marker cmdline
`v235-parent`). Bila parent lain hidup → keluar `other-parent-alive`
tanpa acquire, tanpa cleanup, tanpa penulisan apa pun. Marker HARUS
cocok sebagai TOKEN argv yang persis (cmdline dipecah `\0`), BUKAN
substring — pencocokan substring terbukti false positive saat pengujian
(shell `bash -c` yang menjalankan parent mengandung marker di
argv-nya; temuan AUTH-T3, risiko U-40). Scan bergantung pada `/proc`
(Linux) dan marker yang unik per layanan; bila `/proc` tidak dapat
dibaca → `parent-scan-failed` + page (fail-closed). Dibuktikan
AUTH-T5a (old parent hidup → new keluar `other-parent-alive`, 2/2 run).

**Lapis 2 — klasifikasi record sebelum penimpaan.** Setelah flock
berhasil, parent baru membaca record yang ADA di path dan
mengklasifikasikannya SEBELUM menimpa:
- `flock-v2-self` (pid sendiri) → lanjut.
- `flock-v2-stale` (holder mati — `pidAlive` zombie-aware) → aman
  ditimpa.
- `flock-v2-contradiction` (holder `flock-v2` lain yang hidup) → ini
  tidak mungkin terjadi bila semua pihak memakai flock (kernel tidak
  memberi dua flock eksklusif pada inode yang sama) — bila terjadi,
  itu bukti ada yang salah pada asumsi (mis. dua inode, dua filesystem,
  atau flock yang tidak bekerja) → keluar + page.
- `old-live` (format lama tanpa `protocol`, holder hidup — starttime
  cocok, atau starttime tidak ada) → lepas flock, keluar
  `held-by-old-version`, tulis sentinel `startup.lock.mixed`, page.
- `old-stale` (holder lama mati) → aman ditimpa.
- `unreadable` (record tidak dapat dibaca / JSON rusak / field hilang)
  → lepas flock, keluar `lock-record-unreadable` + page.
  **MEMPERKETAT v2.3.4:** aturan v2.3.4 mengizinkan record tak terbaca
  sebagai observabilitas-only ("isi file lock bukan otoritas"). Aturan
  itu berasumsi operasi versi tunggal dan TIDAK AMAN bila holder lama
  yang hidup dapat bersembunyi di balik record korup — parent baru
  akan menimpa record, mengklaim kepemilikan, dan berjalan bersamaan
  dengan holder lama tanpa satu pun peringatan. Karena itu v2.3.5
  mengembalikan fail-closed untuk record tak terbaca. Dibuktikan
  AUTH-T5b (scan dinonaktifkan test-only → klasifikasi sendiri yang
  menolak, `held-by-old-version` + sentinel, 2/2 run) dan AUTH-T8a/T8b
  (record korup → `lock-record-unreadable`, 2/2 run).

**Deteksi bukan pencegahan — dan apa yang mencegah.** ADV-T6 dan
AUTH-T5c membuktikan: pada masa transisi, deteksi (verifikasi ulang)
menangkap konflik SEBELUM cleanup, tetapi tidak MENCEGAH dua pemilik
untuk ada. Pencegahan struktural HANYA ada satu: **flag-day**
(§A.5.5.4d) — hentikan SEMUA parent sebelum upgrade/rollback, sehingga
tidak pernah ada dua versi yang berjalan bersamaan. Lapis 1 + lapis 2
di atas adalah pencegahan untuk SATU arah transisi yang spesifik
(old-first, new-second) DAN deteksi dini untuk arah lainnya — mereka
mengurangi jendela bahaya, bukan menghilangkannya. Bila flag-day
DILANGGAR (dua versi berjalan bersamaan), yang terjadi adalah:
(a) arah old-first → lapis 1/2 menolak parent baru (tidak ada dua
pemilik, tetapi parent baru tidak dapat start sampai old parent
berhenti — ketersediaan dikorbankan); (b) arah new-first → kedua pihak
berstatus pemilik sampai verifikasi ulang parent baru menangkapnya
(AUTH-T5c: 0 cleanup) — tidak ada kerusakan, tetapi ada DUA pemilik
yang tercatat sampai salah satu keluar. Dalam kedua kasus TIDAK ADA
cleanup ganda — itu yang dijamin jaring pengaman. Yang TIDAK dijamin
tanpa flag-day adalah "tepat satu pemilik yang tercatat".

**Aturan yang mengikat dari bagian ini:**
- Record lock WAJIB membawa `protocol: "flock-v2"` (ditulis oleh
  parent baru pada setiap acquire).
- Klasifikasi record SEBELUM penimpaan adalah langkah wajib; menimpa
  record tanpa klasifikasi DILARANG.
- Pre-start scan adalah langkah wajib; flag test-only `V235_NO_SCAN`
  TIDAK ADA di implementasi produksi.
- Sentinel `startup.lock.mixed` ditulis setiap kali mixed-version
  terdeteksi (untuk diagnosis operator) — sentinel BUKAN lock dan
  tidak memberi otoritas apa pun.
- Flag-day (§A.5.5.4d) tetap MENGIKAT dan tidak digantikan oleh lapis
  ini.

Dibuktikan AUTH-T5a/T5b/T5c + AUTH-T8a/T8b (`SSRF_SPIKE_V235.md` §3).


#### A.5.5.4g Kontrol operasional never-unlink: permission, ownership, dan prosedur (v2.3.6 — MENJAWAB U-33)

**Keberatan yang dijawab.** U-33 (v2.3.5) mencatat flock bersifat
advisory: never-unlink adalah aturan + runbook, bukan penegakan kernel —
kode lama, operator `rm`, dan tooling pihak ketiga tidak terikat.
Revisi ini mengatalogkan, kontrol demi kontrol, mana yang benar-benar
ditegakkan sistem operasi dan mana yang hanya bergantung pada runbook,
dengan bukti eksperimen per kontrol (bukti: `SSRF_SPIKE_V236.md` §2).

**Tabel kejujuran — OS-enforced vs runbook-only:**

| Kontrol | Jenis | Terhadap siapa efektif | Bukti |
|---|---|---|---|
| Direktori lock 0700 + ownership user layanan | **OS-enforced** (DAC kernel) | Semua user non-root; layanan lain | OPS-T1 |
| Isolasi antar user layanan (satu layanan satu uid) | **OS-enforced** (DAC kernel) | Layanan lain yang terkompromi | OPS-T6 |
| Bind-mount read-only direktori lock | **OS-enforced sebagian** | Penghapusan tak sengaja (termasuk oleh root yang tidak sadar mount-nya ro — perintah gagal dan terlihat); TIDAK terhadap root yang sengaja me-remount rw | OPS-T3 |
| `chattr +i/+a` (immutable/append-only) | **Tidak tersedia di VM ini** — OS-enforced HANYA bila filesystem produksi mendukung + dibuktikan di staging | — (belum terbukti) | OPS-T2 |
| Jejak audit penghapusan (auditd/eBPF) | **OS-enforced bila terpasang**; TIDAK ADA di VM ini — wajib staging | Root yang sengaja (deteksi pasca-kejadian, bukan pencegahan) | OPS-T5 |
| Larangan `rm` manual, flag-day, pengecualian tmpfiles | **Runbook-only** | Bergantung disiplin operator + review change | — |
| Deteksi kehilangan otoritas + stand-down | **Kode (aplikasi)** — `guardedAction` | Siapa pun yang menghapus/mengganti file — deteksi, bukan pencegahan | OPS-T7 |

**Yang TIDAK diklaim:** tidak ada kombinasi kontrol di atas yang
menghentikan root yang SENGAJA menghapus lock (OPS-T4 membuktikan root
melewati DAC — `rm` di direktori 0700 berhasil, rc=0). Yang dijamin
adalah: (a) penghapusan tak sengaja oleh operator/tooling non-root
dicegah oleh permission; (b) penghapusan tak sengaja oleh root dicegah
oleh bind-mount ro selama tidak di-remount; (c) bila lock tetap
terhapus, parent aktif MENDETEKSI kehilangan otoritas sebelum tindakan
sensitif berikutnya dan berhenti fail-closed, dan prosedur pemulihan
mengembalikan satu pemilik tanpa cleanup ganda (OPS-T7).

**Prosedur deployment (urutan wajib):**

1. Buat direktori lock sebagai user layanan, mode `0700`, ownership
   user layanan (BUKAN root). Verifikasi: `stat` menunjukkan uid yang
   benar dan mode 0700 (cek otomatis di skrip deployment; gagal →
   deployment berhenti).
2. (Direkomendasikan) Bind-mount direktori lock read-only setelah file
   lock awal dibuat — dokumentasikan mount ini di inventaris mount
   deployment; cek berkala (monitoring) bahwa mount masih `ro`.
3. Jalankan parent sebagai user layanan (BUKAN root) — bila layanan
   harus start sebagai root, turunkan privilege sebelum acquire
   (setuid/setgid ke user layanan).
4. Parent menjalankan siklus penuh: pre-start scan → acquire flock →
   klasifikasi record → cleanup worker lama (pidfd, §A.5.5.2a) → spawn
   worker → READY. Deployment dinyatakan sukses hanya bila parent
   mencapai READY dan satu `guardedAction` uji lolos.

**Prosedur rollback (flag-day — mengikat, §A.5.5.4d):**

1. Hentikan SEMUA parent (semua versi) sebelum upgrade/rollback.
   Verifikasi penghentian lewat pre-start scan: tidak ada proses parent
   hidup dengan marker layanan.
2. Baru setelah itu ganti biner dan start parent versi target.
3. **DILARANG:** menjalankan dua versi bersamaan; me-rollback dengan
   parent lama masih hidup; menghapus file lock sebagai "cara cepat"
   menyelesaikan konflik (gunakan prosedur pemulihan di bawah, bukan
   `rm`).

**Prosedur maintenance (dilarang vs diizinkan):**

- **DILARANG saat parent aktif:** `rm`/`mv` file lock atau pidfile;
  `chmod`/`chown` direktori lock; me-remount direktori lock rw tanpa
  change record; menjalankan tooling pembersih (`tmpwatch`,
  `systemd-tmpfiles` dengan pola yang cocok dengan direktori lock) —
  direktori lock WAJIB dikecualikan dari semua pembersih otomatis.
- **Diizinkan:** membaca file lock/pidfile (read-only, untuk diagnosis);
  memeriksa mount (`findmnt`); memeriksa jejak audit; me-restart parent
  lewat supervisor (yang menjalankan siklus penuh, bukan `rm` manual).

**Runbook pemulihan — bila file lock terhapus saat parent aktif
(mengikat):**

1. JANGAN membuat file lock baru secara manual.
2. Periksa apakah parent masih hidup (pre-start scan): bila hidup,
   biarkan parent mendeteksi kehilangan otoritas sendiri
   (`verifyFlockOwnership` gagal pada `guardedAction` berikutnya →
   parent keluar fail-closed) — JANGAN membunuh parent secara paksa
   sebelum ia keluar sendiri, kecuali ia tidak keluar dalam batas
   waktu operator (5 menit) — bila demikian, SIGTERM lalu SIGKILL
   lewat pidfd/sinyal by-number dengan validasi identitas (§A.5.5.2a).
3. Setelah TIDAK ADA parent hidup (scan bersih), supervisor me-restart
   parent — parent baru membuat file lock baru lewat jalur acquire
   normal (flock + klasifikasi record). File lock lama yang hilang
   tidak perlu "dipulihkan" — otoritas lahir dari flock, bukan dari
   isi file.
4. Catat insiden (siapa/apa yang menghapus, dari jejak audit) dan
   periksa apakah penyebabnya adalah tooling pembersih — bila ya,
   perbaiki pengecualiannya sebelum restart berikutnya.

Dibuktikan OPS-T1..T7 (`SSRF_SPIKE_V236.md` §2): OPS-T1..T6 6/6 PASS × 2;
OPS-T7 (dua pemilik dari penghapusan file → terdeteksi via pre-start
scan → holder lama stand-down `verified=false` → satu pemilik, 0
cleanup) PASS × 3. **Yang TIDAK dibuktikan:** skenario parent berada
DI TENGAH `guardedAction` tepat saat file dihapus — jendela itu tetap
ada (residual U-38) dan ditutup oleh gating per-tindakan, bukan oleh
prosedur pemulihan.


### 3. Uji yang membuktikan perilaku ini (gerbang G6 — TERM-01..TERM-04, PARENT-01..PARENT-02)

Bukti lengkap: `SSRF_SPIKE_V231.md` §1–§2 (TERM 23/23 PASS, PARENT
15/15 PASS, masing-masing dijalankan ulang 2×).

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| TERM-01 | SIGKILL worker (3 orphaned, breaker terbuka) | Counter tidak berubah saat kill dikirim; turun hanya setelah event `exit` (`orphaned` 3→0, `orphanedTerminated`=3); breaker menutup setelah exit |
| TERM-02 | Urutan pembukaan breaker | Evaluasi `_maybeCloseBreaker()` 0× saat kill, tepat 1× setelah exit; lookup sebelum exit ditolak `DNS_CIRCUIT_OPEN` |
| TERM-03 | Exit tidak pernah terkonfirmasi | Counter tetap, breaker tetap terbuka, `workerExitUnconfirmed`=1 — bahkan setelah +500 ms tambahan |
| TERM-04 | Terminate ganda / sudah mati | Idempotent; tidak ada counter negatif |
| PARENT-01 | Parent SIGKILL saat lookup berjalan (worker normal) | Worker mati (`disconnect`); request in-flight fail-closed tanpa vonis; tidak ada yatim |
| PARENT-02 | Worker stubborn + parent baru | Worker lama tetap hidup; parent baru membunuhnya via pidfile; worker baru melayani; lease global bertahan melewati restart; tidak ada yatim tersisa |

### A.5.6 Batas lintas instance (v2.3.1 — MENJAWAB KEBERATAN ATAS BATAS 8 OPERASI)

**Penegasan yang mengikat: batas 8 operasi hidup
(`maxActive + orphanHardCap`) adalah batas PER PROSES, bukan batas
global platform.** U-18 TETAP TERBUKA dengan angka ini.

**Perhitungan worst-case:**

- Per proses: `liveOps ≤ maxActive + orphanHardCap = 4 + 4 = 8`
  (nilai produksi; skala tes: 2 + 3 = 5).
- Lintas instance: `liveOps_total ≤ N × 8`, dengan N = jumlah instance.
  Contoh: N = 10 → ≤ 80; N = 100 → ≤ **800** operasi DNS hidup.

**Hubungan dengan `scan_leases` global (batas 5 pemeriksaan):**

- `scan_leases` membatasi **pemeriksaan** yang berjalan bersamaan
  (maks 5 di seluruh platform). Setiap pemeriksaan menjalankan lookup
  DNS secara sekuensial (satu per satu: URL awal → tiap hop redirect →
  RDAP), jadi satu pemeriksaan menahan maksimal **1** lookup aktif pada
  satu waktu.
- TETAPI `scan_leases` TIDAK membatasi akumulasi orphaned: lease
  dilepas saat pemeriksaan selesai (pemanggil menerima `DNS_TIMEOUT`),
  sementara lookup DNS-nya tetap hidup sebagai orphaned di proses
  tersebut. Orphaned terakumulasi dari pemeriksaan yang SUDAH SELESAI,
  bukan dari pemeriksaan yang sedang berjalan — sehingga batas 5
  pemeriksaan tidak mengikat jumlah orphaned.
- Karena itu worst-case lintas instance adalah **8N**, bukan 5. Contoh
  jujur: 100 instance × 8 = **800 operasi DNS hidup** — semuanya lookup
  yang menggantung pada resolver yang tidak kooperatif.

**Alasan batas global orphaned belum masuk P0:**

1. Butuh store bersama (seperti `scan_leases`) dengan increment/decrement
   atomik lintas proses — tetapi decrement membutuhkan pengetahuan kapan
   lookup di proses LAIN settle, yang hanya bisa diketahui lewat
   heartbeat atau lease-TTL pada entri orphaned. Ini menambah satu
   mekanisme state terdistribusi baru dengan failure mode-nya sendiri
   (DB down → seluruh DNS fail-closed, lihat U-14).
2. Batas per proses (8) + breaker per proses + restart worker + metrik
   dan alert (`forceReleased > 0` → page) sudah membatasi kerusakan per
   instance dan membuat kondisi abnormal langsung terlihat operator.
3. Akumulasi orphaned mensyaratkan resolver yang menggantung — kondisi
   abnormal yang di-page, bukan kondisi operasi normal.

**Syarat agar batas global orphaned masuk fase berikutnya (P2):**
(a) store bersama dengan TTL-lease pada entri orphaned teruji di staging
di bawah beban multi-instance (R-15 diperluas); (b) failure mode
store-nya terdokumentasi (apa yang terjadi saat store down — fail-closed
atau fallback ke batas per proses); (c) keputusan eksplisit pemilik.
Sampai syarat itu terpenuhi, U-18 TETAP TERBUKA dengan angka worst-case
8N di atas sebagai risiko yang diterima sementara.

**Uji yang membuktikan perilaku ini:** perhitungan worst-case di atas
adalah analisis atas batas yang ditegakkan per proses (dibuktikan
ORPH-T1: `liveOps ≤ maxActive + cap` SELALU) dan batas lease global
(dibuktikan LSE-T1 v2.2: tepat 1 pemenang per ronde). Tidak ada uji
multi-instance dengan 100 proses di VM ini — beban ratusan instance
tetap menjadi uji staging R-15 (U-17).

### A.6 Respons penolakan yang aman (anti information disclosure)

**Prinsip:** penolakan guard tidak boleh menjadi oracle. Penyerang tidak boleh
bisa membedakan "host internal ada dan menolak" dari "host internal tidak ada",
dan tidak boleh menerima data apa pun yang berasal dari target.

Respons penolakan (satu bentuk untuk SEMUA alasan penolakan):

```json
{
  "blocked": true,
  "verdict": null,
  "score": null,
  "reason": "URL ditolak oleh kebijakan keamanan",
  "checked_at": "<waktu ISO>"
}
```

Aturan yang mengikat:

1. **Satu pesan generik** untuk semua alasan (IP privat, localhost, metadata,
   DNS gagal, redirect terlarang). JANGAN mengembalikan alasan spesifik
   ("IP 127.0.0.1 terlarang") ke pengguna — alasan spesifik hanya masuk log
   keamanan server-side.
2. **Tidak ada** `http_status`, `final_url`, `page_title`, rantai redirect,
   atau alamat kontrak dari target yang ditolak — baik di respons maupun di
   tabel `checks`.
3. **Tidak ada baris `checks`** untuk URL yang ditolak. Yang dicatat adalah
   log keamanan terpisah: hash URL (SHA-256, bukan URL mentah bila mengandung
   data sensitif), kategori penolakan, waktu, dan hash IP pemanggil — retensi
   30 hari, tidak ditampilkan di UI riwayat publik.
4. **Waktu respons dibuat seragam** sebisa mungkin: penolakan yang terjadi di
   `normalizeUrl()` (instan) vs setelah resolve (lambat) tetap memberi celah
   timing oracle kecil. Mitigasi: tidak dikejar kesempurnaan timing di P0;
   dicatat sebagai keterbatasan yang diketahui (timing oracle residual).
5. UI menampilkan penolakan sebagai **"Pemeriksaan ditolak oleh kebijakan
   keamanan"** — BUKAN sebagai vonis BAHAYA/WASPADA/LEBIH AMAN dan BUKAN
   sebagai UNVERIFIED. Vonis keamanan hanya diberikan untuk pemeriksaan yang
   benar-benar dilakukan.

### A.7 Rate limiting & autentikasi (P1-2, desain) — v2

- **Tanpa autentikasi untuk saat ini** (sesuai keputusan pemilik: tidak ada
  akun di Phase 1). Rate limiting berbasis IP pemanggil.
- **Kuota yang disetujui pemilik (v2): 10 pemeriksaan / menit / IP dan
  100 / jam / IP.** IP disimpan sebagai **hash** (SHA-256 + salt
  server-side), bukan IP mentah; retensi 24 jam (sesuai
  SECURITY_REQUIREMENTS.md §4).
- Respons saat kuota habis: HTTP 429 + pesan generik "Terlalu banyak
  permintaan, coba lagi nanti" — tanpa detail kuota yang tersisa.
- **Konkurensi (v2.1 — KOREKSI):** batas **5 pemeriksaan `checkLink`
  bersamaan berlaku GLOBAL** (bukan 5 per instance) — lihat §A.7.2 v2.1.
  Bila batas tercapai, tolak langsung dengan 429 (tanpa antrean lintas
  instance).
- **CAPTCHA:** tidak di P0/P1 awal (butuh penyedia pihak ketiga + kunci).
  Bila abuse berlanjut setelah rate limit, CAPTCHA adalah langkah berikutnya
  (P2) — bukan bagian dari rancangan ini.
- **Pengecualian cron internal:** cron auto-add 2 jam memakai `checkLink`
  sebagai verifikasi. Selama mitigasi (a), checkLink menolak semua → cron
  TIDAK boleh mem-bypass guard lewat jalur khusus yang tidak diaudit. Opsi:
  (a) cron melewati langkah checkLink dan menandai kandidat
  "belum terverifikasi link" (tidak auto-add), atau (b) cron memakai kuota
  rate-limit terpisah dengan token server-side yang tidak terekspos ke
  pengguna. Rancangan ini merekomendasikan **(a)** — lebih sederhana dan
  tidak menciptakan jalur bypass.

#### A.7.1 Sumber IP pemanggil yang tepercaya (v2)

**Status: NOT VERIFIED — topologi runtime artifact tidak terdokumentasi.**
Audit tidak menemukan dokumen tentang bagaimana platform runtime
meneruskan alamat IP klien ke server artifact (`space.json` hanya berisi
`entry`/`name`/`platformVersion`/`runtime`/`slug`; tidak ada konfigurasi
ingress/proxy). Karena itu rancangan ini TIDAK BOLEH mengasumsikan satu
pun sumber IP — ia menetapkan hierarki kepercayaan dan langkah discovery
yang wajib dilakukan sebelum P1-2 diimplementasikan:

| Sumber kandidat | Kepercayaan | Keterangan |
| --- | --- | --- |
| Alamat peer TCP langsung (`socket.remoteAddress`) | **Tertinggi** — tidak dapat dipalsukan oleh klien | Ini adalah alamat yang benar-benar membuka koneksi ke server. Bila platform menempatkan ingress/proxy di depan server, nilai ini adalah alamat proxy — bukan alamat pengguna — dan rate limit akan menghitung per proxy (semua pengguna berbagi kuota). Itu aman (fail-closed untuk abuse) tetapi dapat memblokir pengguna legit secara massal bila proxy-nya tunggal. |
| Header yang disetel platform sendiri (mis. header khusus ingress) | Tinggi — HANYA bila platform mendokumentasikan bahwa header itu ditulis/ditimpa oleh ingress-nya sendiri | Harus ada bukti dokumentasi atau perilaku (uji: kirim header palsu dari klien; bila nilai yang diterima server tidak berubah, header itu tepercaya). Tanpa bukti itu, header ini TIDAK BOLEH dipercaya. |
| `X-Forwarded-For` / `X-Real-IP` dari klien | **TIDAK dipercaya** | Siapa pun dapat mengirim `X-Forwarded-For: 1.2.3.4` dan berpura-pura menjadi IP lain — untuk menghindari rate limit (dengan merotasi IP palsu) maupun untuk menjebak IP orang lain (agar IP korban yang terblokir). |
| `CF-Connecting-IP` / header sejenis dari CDN | Hanya bila platform mendokumentasikan CDN di depan server | Sama seperti baris kedua: butuh bukti. |

**Aturan anti-spoofing yang mengikat:**
1. JANGAN PERNAH membaca `X-Forwarded-For` sebagai IP pemanggil, kecuali
   langkah discovery (di bawah) membuktikan ada SATU proxy tepercaya yang
   menimpa header itu — dan bila demikian, baca HANYA entri yang ditambahkan
   proxy tepercaya itu (entri terakhir dari rantai yang berasal dari proxy
   tepercaya), dan abaikan entri lain.
2. Bila tidak ada bukti proxy tepercaya: gunakan `socket.remoteAddress`
   sebagai IP pemanggil. Bila itu ternyata alamat proxy tunggal, rate
   limit berlaku per proxy — terima konsekuensinya (kuota bersama) dan
   catat sebagai keterbatasan; JANGAN "memperbaiki" dengan mempercayai
   `X-Forwarded-For` tanpa bukti.
3. IP pemanggil yang dipakai untuk rate limit SELALU disimpan sebagai hash
   (SHA-256 + salt server-side), bukan mentah; retensi 24 jam.
4. Respons 429 TIDAK BOLEH mengungkapkan IP yang terblokir atau sisa kuota.

**Langkah discovery wajib sebelum P1-2 (P1-2a):** (1) baca dokumentasi
platform runtime tentang ingress/proxy dan header yang diteruskannya;
(2) uji di staging: kirim request dengan `X-Forwarded-For` palsu dan
`X-Real-IP` palsu, lalu catat nilai IP apa yang diterima server; (3) catat
hasilnya (sumber IP yang terbukti tepercaya) di `SECURITY_REQUIREMENTS.md`
§4 dan di laporan implementasi P1-2. Bila dokumentasi tidak tersedia dan
uji tidak dapat dilakukan, keputusan default adalah
`socket.remoteAddress` + kuota bersama per proxy (butir 2 di atas).

#### A.7.2 Rate limit & konkurensi pada multi-instance (v2.1 — KOREKSI)

**Masalah:** bila server berjalan sebagai SATU instance, state in-memory
(Map IP-hash → counter + antrean) sudah cukup. Bila server berjalan
multi-instance (lebih dari satu proses/container di balik load balancer),
state in-memory TIDAK cukup: penyerang dapat menyebar request ke
instance yang berbeda dan masing-masing instance menghitung kuotanya
sendiri — kuota efektif menjadi `N × kuota` untuk N instance.

| Topologi | Store yang benar | Konsekuensi bila salah pilih |
| --- | --- | --- |
| Satu instance (satu proses) | In-memory (Map + timer) — cukup | — |
| Multi-instance, ada DB bersama | **Counter di database bersama** (tabel `rate_limits` di database artifact yang sama dengan `checks`): increment atomik per jendela waktu (menit/jam) per hash IP; baca + increment dalam satu transaksi/operasi atomik agar tidak ada race antar instance | In-memory di tiap instance → kuota bocor sebesar faktor jumlah instance; antrean konkurensi per instance → total konkurensi `N × 5` |
| Multi-instance, tanpa DB bersama | Store eksternal bersama (mis. Redis/KV platform) — memerlukan layanan yang belum ada; ATAU terima kuota per instance dengan kuota yang dibagi (`kuota / N`) — rapuh bila N berubah | Tanpa store bersama, tidak ada rate limit global yang benar |

**Keputusan rancangan v2.1 — batas konkurensi GLOBAL (koreksi atas v2):**
v2 menetapkan "maks 5 bersamaan per instance" dengan catatan batas global
menjadi `5 × N` — itu TIDAK DAPAT DITERIMA sebagai batas global, karena
batas yang bocor sebesar faktor jumlah instance bukan batas. **Ditetapkan:
batas 5 pemeriksaan bersamaan berlaku GLOBAL, ditegakkan dengan mekanisme
bersama, bukan per instance.**

Mekanisme yang ditetapkan — tabel lease DB bersama `scan_leases`:

| Aspek | Ketentuan |
| --- | --- |
| Tabel | `scan_leases` di database artifact yang sama dengan `checks` (sudah ada — tidak butuh layanan baru): kolom `id` (token lease acak), `ip_hash` (hash IP pemanggil, untuk observabilitas), `acquired_at`, `expires_at` |
| Acquire | Dalam SATU transaksi: hitung lease yang masih hidup (`expires_at > now`); bila < 5 → INSERT lease baru dan lanjutkan; bila ≥ 5 → ROLLBACK dan tolak. Pengecekan + insert atomik — tidak ada race antar instance |
| TTL lease | **25 detik** (lebih panjang dari timeout global 20 detik + buffer 5 detik): lease yang tidak dilepas (proses mati di tengah pemeriksaan) kedaluwarsa sendiri dan tidak memblokir selamanya |
| Release | Lease DIHAPUS eksplisit di blok `finally` saat pemeriksaan selesai (sukses, ditolak guard, atau timeout) — slot langsung tersedia kembali |
| Reaping | Lease kedaluwarsa dihapus oleh pekerjaan berkala ATAU secara lazy pada acquire berikutnya (hitung hanya lease hidup) — tidak ada proses latar terpisah yang wajib |
| Saat penuh | **Tolak langsung dengan 429** + pesan generik "Terlalu banyak permintaan, coba lagi nanti" — TANPA antrean lintas instance (antrean terdistribusi menambah kompleksitas head-of-line blocking dan tidak dibutuhkan pada batas sekecil ini; antrean FIFO 10 detik v2 DIHAPUS untuk jalur global) |
| Backstop lokal | Setiap instance TETAP memegang semaphore in-memory maks 5 sebagai backstop lokal (melindungi satu proses dari lonjakan internal) — tetapi batas yang MENGIKAT adalah lease global 5; semaphore lokal tidak pernah mengizinkan lebih dari yang diizinkan lease global |
| Perilaku saat DB lease tidak tersedia | Fail-closed: tolak dengan 503 generik (sama seperti §A.7.2 v2 untuk rate limit) — BUKAN lolos tanpa batas |

**JANGAN menganggap rate limit DB otomatis membatasi konkurensi (koreksi
eksplisit atas asumsi yang mungkin terbaca dari v2).** Rate limit
(`rate_limits`: 10/menit + 100/jam per IP) membatasi JUMLAH pemeriksaan per
IP per jendela waktu; konkurensi (`scan_leases`: maks 5 bersamaan) membatasi
PEMERIKSAAN YANG SEDANG BERJALAN pada satu saat. Keduanya mekanisme yang
berbeda, dengan tabel yang berbeda, dan keduanya harus lolos:
- **Urutan gate:** (1) rate limit per IP → (2) lease konkurensi global →
  (3) pemeriksaan. Gagal di gate mana pun → 429 generik (tanpa membedakan
  gate mana yang menolak — jangan bocorkan informasi).
- **Interaksi:** satu IP yang membanjiri request akan terkena rate limit
  LEBIH DULU (10/menit) sebelum sempat menghabiskan slot konkurensi
  global; sebaliknya 5 pengguna berbeda yang sah tetap dapat memakai
  kelima slot bersamaan. Rate limit melindungi dari SATU penyerang;
  lease konkurensi melindungi KAPASITAS server dari SEMUA pemanggil.
- **Cron internal:** cron auto-add memakai `checkLink` dan tunduk pada
  KEDUA gate yang sama (tanpa bypass — §A.7); selama mitigasi (a), cron
  menandai "belum terverifikasi link" dan tidak auto-add.

**Perilaku saat store tidak tersedia:** bila database rate limit tidak
dapat dijangkau (error koneksi), pilihan fail-closed adalah **tolak
request dengan 503 generik** ("layanan pemeriksaan sedang tidak tersedia")
— BUKAN lolos tanpa rate limit. Alasannya: fail-open pada rate limit
membuka banjir tepat saat sistem sedang bermasalah. Pengecualian: bila
database utama (`checks`) sendiri tidak tersedia, seluruh `checkLink`
sudah gagal juga — jadi tidak ada kasus di mana rate limit mati
sementara pemeriksaan tetap jalan.

**Pembersihan:** baris `rate_limits` yang kedaluwarsa (> 1 jam + buffer)
dihapus oleh pekerjaan berkala (atau pada tulis berikutnya — lazy
cleanup); retensi hash IP maksimal 24 jam, selaras dengan §A.7.

#### A.7.3 Atomicity lease global `scan_leases` per database (v2.2 — WAJIB diperkuat)

**Pernyataan masalah:** transaksi biasa TIDAK OTOMATIS menjamin operasi
`COUNT + INSERT` aman dari race antar-instance. Dua instance yang
bersamaan menghitung lease hidup = 4, keduanya menyimpulkan "masih ada
slot", keduanya INSERT — total menjadi 6 dan batas global 5 DILAMPAUI.
Mekanisme atomicity HARUS ditetapkan berdasarkan database aktual yang
dipakai — dan berbeda antara SQLite (live) dan PostgreSQL (target).
Bagian ini menetapkan mekanisme untuk KEDUANYA, beserta isolation
level, locking, dan strategi retry.

**Skema (sama untuk kedua database):**

```sql
CREATE TABLE scan_leases (
  id TEXT PRIMARY KEY,          -- token lease acak (bukan urutan)
  ip_hash TEXT NOT NULL,        -- hash IP pemanggil, observabilitas
  acquired_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_scan_leases_expires ON scan_leases (expires_at);
```

##### SQLite (database live artifact) — TERBUKTI

SQLite menserialisasi semua penulis pada level database (satu write
lock untuk seluruh database; `isolation_level` efektif SERIALIZABLE
untuk transaksi tulis). Karena itu DUA mekanisme berikut keduanya aman
— dan keduanya TERBUKTI dalam pengujian v2.2 (`SSRF_SPIKE_V22.md` §2,
Python sqlite3 3.45.1, 8 proses serentak, 3 ronde per mekanisme → tepat
1 pemenang tiap ronde, total hidup 5):

| Mekanisme | Cara kerja | Kenapa atomik di SQLite |
| --- | --- | --- |
| **(A) Single-statement (utama)** | Satu statement: `INSERT INTO scan_leases (...) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM scan_leases WHERE expires_at > ?) < 5` — lalu periksa `rowcount`: 1 = lease diperoleh, 0 = ditolak 429 | Satu statement dieksekusi secara atomik di bawah write lock database; tidak ada jendela antar COUNT dan INSERT |
| **(B) Transaksi `BEGIN IMMEDIATE`** | `BEGIN IMMEDIATE` → `SELECT COUNT(*) ...` → bila < 5 `INSERT` → `COMMIT`; bila ≥ 5 `ROLLBACK` | `BEGIN IMMEDIATE` mengambil RESERVED/write lock di awal transaksi, sehingga penulis lain diblokir (busy timeout 5 dtk) sampai transaksi selesai — hitung dan INSERT terjadi di bawah lock yang sama |

Aturan implementasi SQLite: koneksi memakai `timeout` (busy timeout)
5 detik — bila lock tidak diperoleh dalam 5 detik, acquire GAGAL
dengan 503 fail-closed (bukan menunggu tanpa batas). `rowcount`
harus diperiksa secara eksplisit pada mekanisme (A): `rowcount == 0`
berarti ditolak, BUKAN error.

##### PostgreSQL (target migrasi Supabase) — DITETAPKAN, BELUM TERUJI DI SINI

**PostgreSQL TIDAK tersedia di environment ini** (`psql`/`postgres`/
`initdb` tidak ditemukan), sehingga mekanisme berikut adalah spesifikasi
yang WAJIB diuji di staging dengan PostgreSQL nyata (gerbang G6)
sebelum cutover — bukan klaim yang sudah terbukti.

**Peringatan yang mengikat:** mekanisme (A) SQLite — single-statement
`INSERT ... SELECT ... WHERE (SELECT COUNT(*)) < 5` — **TIDAK AMAN**
di PostgreSQL di bawah `READ COMMITTED`. Setiap statement melihat
snapshot per awal statement; `COUNT(*)` tidak mengunci baris yang
dihitung. Dua statement bersamaan dapat sama-sama melihat count = 4
sebelum salah satu INSERT, lalu keduanya INSERT → total 6. **Jangan
memindahkan mekanisme (A) ke PostgreSQL tanpa locking.**

Mekanisme yang ditetapkan untuk PostgreSQL (pilih satu sebagai utama,
satunya sebagai alternatif — keputusan dicatat di laporan P1-2):

| Mekanisme | Cara kerja | Isolation level & locking |
| --- | --- | --- |
| **(P1) Advisory lock transaksi (utama)** | Dalam SATU transaksi: `SELECT pg_advisory_xact_lock(727271)` (kunci tetap untuk `scan_leases`) → `SELECT COUNT(*) FROM scan_leases WHERE expires_at > now()` → bila < 5 `INSERT` → `COMMIT`; bila ≥ 5 `ROLLBACK`. Lock dilepas otomatis saat transaksi berakhir (commit/rollback) | `READ COMMITTED` sudah cukup — advisory lock menserialisasi semua acquire antar instance; tidak ada dua transaksi yang menghitung bersamaan. Lock key 727271 didokumentasikan sebagai konstanta dan TIDAK dipakai untuk keperluan lain |
| **(P2) Counter row (alternatif)** | Satu baris penghitung `lease_counter(id=1, used INT)`: `UPDATE lease_counter SET used = used + 1 WHERE id = 1 AND used < 5 RETURNING used` — `rowcount 1` = lease diperoleh (lalu INSERT baris lease dalam transaksi yang sama); `rowcount 0` = ditolak 429. Release: `UPDATE lease_counter SET used = used - 1 WHERE id = 1 AND used > 0` dalam transaksi yang sama dengan DELETE baris lease | `UPDATE` mengambil row lock eksklusif pada baris counter — semua acquire bersaing pada satu baris dan diserialisasi oleh lock itu. `READ COMMITTED` cukup. Kelemahan: counter dapat menyimpang dari jumlah baris lease bila release gagal — karena itu reaper berkala (lihat di bawah) MENYELARASKAN counter dengan `COUNT(*)` lease hidup setiap 60 detik, dan counter TIDAK PERNAH dipakai sebagai satu-satunya sumber kebenaran saat terjadi selisih (bila selisih, yang dipakai adalah `COUNT(*)` + advisory lock) |

**Strategi retry bila terjadi konflik (PostgreSQL):** konflik yang
mungkin: `40001` (serialization failure, bila suatu saat memakai
`SERIALIZABLE`) dan `40P01` (deadlock detected). Retry dengan
exponential backoff **25 ms → 50 ms → 100 ms, maks 3 percobaan**;
setiap percobaan ulang menjalankan SELURUH acquire dari awal (bukan
melanjutkan transaksi yang gagal). Setelah 3 percobaan gagal →
**503 fail-closed** ("layanan pemeriksaan sedang tidak tersedia"),
bukan lolos tanpa batas. Retry HANYA untuk error konflik (40001/40P01
dan timeout lock); error lain (mis. koneksi putus) langsung 503 tanpa
retry. Mekanisme advisory lock (P1) praktis tidak menghasilkan 40001/
40P01 karena tidak ada dua transaksi yang bersaing pada data yang
sama — retry adalah pengaman, bukan jalur normal.

**Pengujian simultan (gerbang G6) — wajib untuk KEDUA database:**

| Uji | Cara | Kriteria lolos |
| --- | --- | --- |
| LSE-01 | 8 instance serentak, tersisa 1 slot (dari batas 5) | Tepat **1** pemenang; total lease hidup = 5 (tidak pernah 6) |
| LSE-02 | Ulangi LSE-01 sebanyak 3 ronde | Tepat 1 pemenang tiap ronde |
| LSE-03 | Lease kedaluwarsa (TTL 25 dtk produksi; 2 dtk skala tes) | Slot bebas setelah TTL; acquire berhasil |
| LSE-04 | Lease yatim — proses mati sebelum release | Ditolak selama TTL; diambil alih setelah TTL lewat |
| LSE-05 | Kegagalan release (release id yang tidak ada / release dua kali) | Rowcount 0, tanpa error; lease tetap kedaluwarsa sendiri; tidak ada slot yang macet selamanya |
| LSE-06 (PostgreSQL saja) | Uji yang sama dengan server PostgreSQL nyata di staging, termasuk percobaan konflik bersamaan | Sama seperti LSE-01/02; tambahan: tidak ada error 40001/40P01 yang tidak tertangani |

**Bukti yang sudah ada (SQLite):** LSE-T1..LSE-T4 di
`SSRF_SPIKE_V22.md` §2 — LSE-01/02 (3 ronde × 8 proses, kedua
mekanisme), LSE-03 (TTL), LSE-04 (yatim), LSE-05 (release gagal)
— **5/5 PASS**. **Bukti PostgreSQL: BELUM ADA** — wajib dihasilkan
di staging (LSE-06) sebelum cutover; tanpa itu, gerbang G6 tidak
lolos.

**Perilaku saat DB lease tidak tersedia (tetap berlaku):** fail-closed
503 generik — bukan lolos tanpa batas (lihat §A.7.2). Bila DB lease
lambat (bukan down), timeout acquire 5 detik berlaku; setelah itu 503.

---

## B. File dan fungsi yang akan diubah

Sumber: inspeksi audit `94ecc20a` (build `e9f0a944`) atas `server/src/actions.ts`,
`client/src/api.ts`, `space.json`, `package.json`, `bunfig.toml`, dan dokumen
fondasi. Nama file/fungsi mengikuti hasil inspeksi; bila nama sebenarnya di
repo berbeda saat implementasi dimulai, implementor wajib menyesuaikan daftar
ini dan mencatat perbedaannya di laporan implementasi.

### B.1 `server/src/actions.ts` — file utama (semua perubahan P0/P1 ada di sini)

| Fungsi / bagian | Perubahan | Tidak berubah |
| --- | --- | --- |
| `normalizeUrl()` | **P0-5 (diperluas) — v2:** tolak userinfo; tolak hostname literal IP privat/loopback/link-local (setelah normalisasi bentuk IP — §B.4); tolak `localhost` dan `metadata.*` (suffix match, bukan hanya dua hostname eksak); tolak zone identifier (`%...`); normalisasi hostname (lowercase, buang trailing dot, IDNA); **tolak port di luar 80/443 (disetujui pemilik v2 — diterapkan di P0-5, bukan ditunda ke P1-3)** | Perilaku dasar tetap: tambah prefix `https://` bila tanpa skema; tolak protokol non-http(s); batas panjang URL 2048 (skema zod) |
| `fetchText(url, cap)` | **P0-1 + P0-3 + P1-1 (dirombak jalurnya, bukan logikanya):** ganti `fetch()` langsung dengan `fetchGuarded()` (baru, §B.3); setiap hop: `checkUrlAllowed` → `resolveAndCheck` → `fetchWithPinnedIp`; timeout per hop 12 dtk dipertahankan; tambah abort streaming saat body melebihi cap; tambah cek Content-Type; simpan `page.chain` seperti sekarang | Cap 400.000 karakter halaman / 300.000 script sebagai batas **pemindaian**; pencatatan rantai redirect; penggabungan konten script (bila script aktif) |
| `lookupRdap(domain)` | **P0-3 (bagian RDAP) — v2:** host awal `rdap.org`; redirect mengikuti guard per hop (ganti `redirect:'follow'` buta dengan loop manual + guard + DNS validation + IP pinning); host tujuan redirect HARUS ada dalam allowlist RDAP dari IANA bootstrap registry (§A.1a — 592 layanan per 7 Nov 2026, cache semingguan); hanya HTTPS (entri `http://` ditolak); timeout 12 dtk dipertahankan | Endpoint `https://rdap.org/domain/<domain>`; domain dari `registrableDomain(hostname)` |
| `analyze()` | **P0-4:** hapus/nonaktifkan blok fetch `<script src>` selama mitigasi (sisakan sebagai kode yang dinonaktifkan dengan flag, bukan dihapus permanen — lihat §D.2); **P0-6:** bila guard menolak di tahap mana pun, kembalikan hasil PENOLAKAN AMAN (§A.6), bukan hasil parsial | Seluruh logika pemindaian sinyal (umur domain, connect-wallet, signing, bahasa iming-iming, obfuscation, tautan resmi, alamat kontrak, known-bad domain) dan skoring 0–100 per sinyal — **tidak berubah** |
| `runCheck()` | **P0-6 + P1-1:** bungkus seluruh pemeriksaan dalam anggaran global 20 detik (AbortController bersama); bila guard menolak → JANGAN simpan baris `checks`; catat ke log keamanan; bila timeout global → kembalikan "pemeriksaan tidak selesai" (bukan vonis) | Urutan `normalizeUrl → analyze → simpan → kembalikan` |
| `checkLink` (aksi server) | **P1-2:** gate rate limit + konkurensi sebelum `runCheck()`; **P0-6:** teruskan respons penolakan aman apa adanya ke klien | Skema zod `{url: min 1, maks 2048}`; tanpa auth (sesuai keputusan Phase 1) |
| `KNOWN_BAD_DOMAINS` | **Tidak berubah** (tetap `solbarn.cc`, `sharkmoon.tech`) — daftar ini adalah threat intel, bukan pengganti guard; guard SSRF dan known-bad adalah dua lapisan berbeda | Cara pencocokan string hostname (eksak / suffix) |
| `listChecks` / `deleteCheck` | **Tidak berubah dalam P0/P1 ini** (tanpa auth — dicatat sebagai temuan di luar ruang lingkup SSRF langsung; ditangani saat Auth masuk) | — |

### B.2 `client/src/api.ts` dan `client/src/App.tsx` — perubahan minimal

| Bagian | Perubahan | Tidak berubah |
| --- | --- | --- |
| UI Link Scanner | Tambah penanganan respons `blocked: true` → tampilkan "Pemeriksaan ditolak oleh kebijakan keamanan" (bukan verdict/score); tambah status saat mitigasi aktif (§D.1): bila scanning arbitrer dimatikan, tampilkan pesan "Pemeriksaan link dijeda sementara untuk peningkatan keamanan" dan nonaktifkan input | Seluruh UI lain (katalog, dashboard, Gibran, filter, bookmark) |
| `api.ts` (client action) | Tambah tipe respons penolakan (`blocked`) agar TypeScript mengenalinya; tambah penanganan 429 (tampilkan "Terlalu banyak permintaan") | Cara POST `./actions` |

### B.3 Fungsi baru (dibuat di `server/src/actions.ts` atau modul server baru)

| Fungsi baru | Tugas |
| --- | --- |
| `fetchGuarded(url, opts)` | SATU-SATUNYA jalur fetch. Menjalankan rantai §A.1 untuk satu hop: `checkUrlAllowed` → `resolveAndCheck` → `fetchWithPinnedIp` (dengan timeout hop + batas streaming pasca-dekompresi + cek Content-Type). Dipakai oleh fetch halaman, redirect, script (bila aktif), dan RDAP. **JANGAN memakai `fetch` global di dalamnya** (terbukti tidak mendukung pinning — §A.2a). |
| `resolveAndCheck(hostname)` | Implementasi dari stub di `ssrf-guard.ts`: DNS lookup semua alamat → normalisasi (termasuk NAT64/TEREDO/6to4/mapped) → validasi → kembalikan IP lolos + TTL. |
| `fetchWithPinnedIp(url, pinnedIps, opts)` | Koneksi ke IP yang divalidasi — **Pendekatan 1 (utama): Node `https`/`http` Agent `lookup` (TERBUKTI di Bun 1.4.4 — B1-fixed, W2, W3)**; **Pendekatan 2 (fallback): `Bun.fetch` dengan URL IP literal + `tls.serverName` + header `Host` (TERBUKTI — W1, W5)**. Callback `lookup` HARUS menghormati `options.all`; `servername` HARUS diisi eksplisit; tulis socket `Bun.connect` HANYA di handler `open`. |
| `normalizeIpLiteral(host)` | Uraikan SEMUA bentuk IP literal: desimal bertitik, integer (`2130706433`), oktal (`0177.0.0.1`), heksadesimal (`0x7f.0.0.1`, `0x7f000001`), bentuk pendek (`127.1`), IPv6 (`::1`, `fe80::1`), IPv4-mapped (`::ffff:127.0.0.1`) → kembalikan bentuk kanonik atau "bukan IP". |
| `isBlockedAddress(ip)` | Cocokkan IP kanonik ke tabel §A.4. |
| `checkRateLimit(callerHash)` | Kuota per IP (hash) + antrean konkurensi (P1-2). |
| `acquireScanSlot(callerHash)` / `releaseScanSlot(leaseId)` | **v2.1 (baru):** lease konkurensi GLOBAL via tabel `scan_leases` — acquire atomik (hitung lease hidup < 5 → INSERT, bila ≥ 5 → tolak 429), TTL lease 25 detik, release eksplisit di `finally`. JANGAN memakai semaphore in-memory sebagai pengganti lease global. |
| `signalWorkerByPidfd({ pid, expectedStarttime, cmdlineMarker, signal })` | **v2.3.6 (baru):** pensinyalan worker lama yang terikat identitas (§A.5.5.2a) — validasi identitas by-number → `pidfd_open` → re-validasi starttime → `pidfd_send_signal` → konfirmasi exit (poll `/proc` zombie-aware). Mengembalikan `{ ok, reason }` fail-closed (`identity-mismatch` / `identity-changed` / `already-dead` / `pid-not-alive` / `pidfd-unavailable` / `exit-unconfirmed`). **DILARANG** memakai `process.kill(pid)` langsung untuk worker lama kecuali sebagai fallback yang disetujui setelah STAGE-P07 FAIL. Implementasi referensi (Bun): `spike-harness-v236/pidfd-signal.js`. |
| `logBlockedAttempt(hashUrl, kategori, waktu)` | Log keamanan terpisah (bukan tabel `checks`). |

### B.4 `src/scanner/ssrf-guard.ts` (paket fondasi) — perluasan

| Bagian | Perubahan |
| --- | --- |
| `BLOCKED_HOSTNAMES` | Tambah suffix match: `localhost` dan subdomainnya, `metadata.*` (semua subdomain metadata), `metadata.google.internal` (tetap) |
| `isBlockedIpLiteral()` | Ganti dengan `normalizeIpLiteral()` + `isBlockedAddress()` (§B.3): tangani integer/oktal/heksadesimal/bentuk pendek, IPv4-mapped IPv6, NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48` — ekstrak IPv4 tertanam; **koreksi v2.1:** /48 di bit 48..63 + 72..87, oktet "u" byte 8 wajib 0, bila ≠ 0 → malformed/tolak), TEREDO/6to4, zone identifier (`%...` → tolak), seluruh rentang §A.4 v2 (tambah ULA `fc00::/7`, multicast, `::/128`, CGNAT `100.64.0.0/10`, TEST-NET, benchmarking, discard-only, ORCHIDv2, dokumentasi) |
| `resolveAndCheck()` | Implementasi penuh (saat ini stub yang melempar error): DNS lookup + validasi semua alamat + kembalikan IP lolos |
| `checkUrlAllowed()` | Tambah: tolak userinfo (sudah ada — dipertahankan), tolak port non-80/443 (disetujui pemilik v2 — diterapkan bersama P0-5), tolak zone identifier, normalisasi hostname (lowercase, trailing dot, IDNA) |
| Konstanta | `MAX_REDIRECTS = 6` (tetap), `FETCH_TIMEOUT_MS = 12_000` (selaraskan dari 10_000 ke nilai live 12 detik — JANGAN menurunkan batas yang sudah ada), `TOTAL_TIMEOUT_MS = 20_000` (baru, menggantikan 30_000 di fondasi — selaras dengan §A.5), `MAX_RESPONSE_BYTES = 400_000` (baru, selaras dengan cap halaman live) |

### B.5 File fondasi lain

| File | Perubahan |
| --- | --- |
| `src/scanner/link-scanner.ts` (stub) | Implementasi memakai `fetchGuarded()` + sinyal/scoring dari kode live (port logika — bukan tulis ulang sinyal) |
| `src/scanner/redirect.ts`, `src/scanner/domain.ts` (stub) | Implementasi loop redirect ber-guard dan normalisasi domain |
| `src/intelligence/risk-scoring.ts` (stub) | Port skoring live apa adanya (skor per sinyal + pemetaan CLASSIFICATION.md) |
| `src/db/schema.ts` | Tambah (P1-2): tabel `rate_limits` (hash IP, jendela menit/jam, counter, `updated_at`) dan tabel **`scan_leases` (v2.1, baru)** — `id` (token lease acak), `ip_hash`, `acquired_at`, `expires_at` (TTL 25 detik) — untuk lease konkurensi global (§A.7.2 v2.1). Tambah (opsional, P0-6): tabel `blocked_attempts` (hash URL, kategori, waktu) — terpisah dari `checks`; **tidak ada perubahan** pada tabel `projects`, `checks`, `saved_projects` yang sudah ada |
| `SECURITY_REQUIREMENTS.md` §3.2 | Perbarui tabel status kepatuhan setelah implementasi + uji (bukan sebelum) |
| `CLASSIFICATION.md` | Tambah: hasil `blocked` bukan klasifikasi (bukan MALICIOUS/SUSPICIOUS/UNVERIFIED/NO_KNOWN_THREAT) — penolakan adalah status tersendiri |

### B.6 Yang HARUS dipertahankan (checklist non-negotiable)

- [ ] Histori tabel `checks` (termasuk 2× solbarn.cc skor 100) — tidak dihapus, tidak diubah.
- [ ] Katalog 13 proyek — tidak berubah.
- [ ] Sistem scoring dan sinyal — logika dan bobot tidak berubah (kecuali dampak
      script-fetch yang dinonaktifkan — lihat §D.2 dan §E).
- [ ] Perilaku scanner untuk URL publik yang sudah terbukti benar — 3 URL acuan
      vonisnya tetap sama (§D.4).
- [ ] Redirect maks 6 hop dan timeout per-fetch 12 detik — sebagai lantai,
      bukan untuk dilonggarkan; jangan ganti fetch manual dengan
      `redirect: 'follow'` tanpa validasi.
- [ ] Deteksi domain drainer `solbarn.cc`/`sharkmoon.tech` termasuk di rantai
      redirect — dipertahankan.
- [ ] Jangan menyatakan scanner "aman" berdasarkan guard fondasi sampai guard
      yang sama terintegrasi dan teruji di kode live.

---

## C. Urutan implementasi P0 dan P1

### C.1 Peta dependensi

```text
Keputusan pemilik (§F) — DISETUJUI 7 Nov 2026 (v2): mitigasi (a), script off,
rate limit 10/menit + 100/jam, port 80/443, CGNAT blokir, timeout global 20 dtk
  └─► [M0] Mitigasi sementara (§D.1) — opsi (a), aktif sebelum coding P0
        └─► [P0-1a] SPIKE kemampuan runtime — ✅ SELESAI (v2, SSRF_SPIKE_RUNTIME.md)
        │      └─► [P0-1a'] Uji ulang pinning di STAGING ARTIFAKT PRODUKSI (U-1)
        │      └─► [P0-1b] Perluas ssrf-guard.ts (normalisasi IP + resolveAndCheck)
        │             └─► [P0-1c] fetchWithPinnedIp + fetchGuarded
        │                    ├─► [P0-2] Integrasi ke fetchText URL awal
        │                    ├─► [P0-3] Guard di setiap hop redirect (+ RDAP)
        │                    ├─► [P0-4] Nonaktifkan script fetch
        │                    └─► [P0-5] Perketat normalizeUrl (termasuk port 80/443)
        │                           └─► [P0-6] Respons penolakan aman + jangan simpan
        │                                  └─► [UJI] Regresi + blokir di staging (§D.4)
        │                                         └─► [P1-1] Timeout global 20 dtk + streaming pasca-dekompresi + Content-Type
        │                                                ├─► [P1-2] Rate limit + konkurensi (discovery P1-2a dulu)
        │                                                └─► [P1-3] Batas script (port sudah di P0-5)
        │                                                       └─► [P1-4] Logging/alert
        │                                                              └─► [UJI AKHIR] + evaluasi ChatGPT
        │                                                                     └─► Cutover (go/no-go, §D.5 v2 — HANYA bila SEMUA uji wajib lolos)
```

### C.2 P0 — wajib sebelum scanner dipakai publik lebih luas

| Langkah | Isi | Bergantung pada | Keluaran yang dapat diuji |
| --- | --- | --- | --- |
| **P0-0** | Keputusan mitigasi sementara (§D.1) | Keputusan pemilik | Mitigasi aktif (atau keputusan tercatat untuk tidak mitigasi + alasan) |
| **P0-1a** | **Spike runtime — SELESAI (v2, 7 Nov 2026).** Bukti: `SSRF_SPIKE_RUNTIME.md` — Pendekatan 1 (Node `https` Agent `lookup`) TERBUKTI di Bun 1.4.4; Pendekatan 2 (`Bun.fetch` + `tls.serverName` + `Host`) TERBUKTI sebagai fallback. **Sisa wajib:** uji ulang di staging artifact produksi (U-1) sebelum integrasi penuh, karena spike dijalankan pada Bun CLI di VM. | — (selesai) | Laporan spike + putusan pendekatan (sudah ada) |
| **P0-1b** | Perluas `ssrf-guard.ts`: `normalizeIpLiteral`, `isBlockedAddress` (tabel §A.4 v2 — termasuk NAT64/TEREDO/6to4/mapped/zone identifier), implementasi `resolveAndCheck` — **v2.1:** koreksi ekstraksi NAT64 /48 (RFC 6052 §2.2, byte 6..7 + 9..10, u-octet byte 8 wajib 0) + unit test NAT64 S-44..S-48 + unit test matcher RDAP ketat RD-01..RD-20 (§D.4.7) | P0-1a (tahu batasan runtime) | Unit test guard: 25 kasus lama + kasus baru (integer, heksadesimal, oktal, bentuk pendek, IPv4-mapped, NAT64 /96 + /48, TEREDO, 6to4, zone identifier, ULA, multicast, CGNAT, TEST-NET, benchmarking) + matcher RDAP 20/20 |
| **P0-1c** | `fetchGuarded()` + `fetchWithPinnedIp()` — via Node `https`/`http` Agent `lookup` (utama) atau `Bun.fetch` + `tls.serverName` (fallback) | P0-1b | Fetch ter-guard untuk satu URL di staging |
| **P0-2** | Integrasi guard ke `fetchText()` URL awal | P0-1c | 3 URL acuan tetap sama + URL internal ditolak |
| **P0-3** | Guard di setiap hop redirect + redirect RDAP | P0-2 | Redirect ke privat ditolak; redirect legit tetap diikuti |
| **P0-4** | Nonaktifkan fetch `<script src>` (flag) | — (independen, bisa paralel dengan P0-2) | Sinyal script = 0; 3 URL acuan tetap sama (lihat §D.2) |
| **P0-5** | Perketat `normalizeUrl()` (userinfo, literal IP, localhost/metadata.*, normalisasi hostname) | P0-1b (butuh normalisasi IP) | URL `http://127.0.0.1/`, `http://0x7f.0.0.1/`, `https://x@127.0.0.1/` ditolak sebelum fetch |
| **P0-6** | Respons penolakan aman + jangan simpan baris `checks` + log keamanan | P0-2..P0-5 | Respons penolakan tidak mengandung data internal (uji §D.4) |
| **P0-UJI** | Uji regresi + uji blokir di staging (§D.4) | Semua P0 | Laporan uji; go/no-go P0 |

**Catatan urutan:** P0-4 independen dan dapat dikerjakan paralel dengan P0-1/2.
P0-5 bergantung pada normalisasi IP dari P0-1b. P0-6 terakhir karena bergantung
pada semua titik penolakan.

### C.3 P1 — penting, segera setelah P0

| Langkah | Isi | Bergantung pada | Keluaran yang dapat diuji |
| --- | --- | --- | --- |
| **P1-1** | Timeout global **20 detik — disetujui pemilik v2** (AbortController bersama) + abort streaming saat body terdekompresi > 400 KB + cek Content-Type; abort per tahap (§A.5 v2) | P0-UJI lolos | Scan URL lambat/raksasa selesai ≤ ~20 detik; memori tidak membengkak; **syarat cutover** (§D.5 v2) |
| **P1-2** | Rate limit per IP (hash) **10/menit + 100/jam — disetujui pemilik v2** + antrean konkurensi + penanganan 429 di UI; **didahului P1-2a discovery sumber IP tepercaya** (§A.7.1 v2); store counter di tabel `rate_limits` (DB bersama) | P0-UJI lolos | Banjir dari satu IP dibatasi; pengguna normal tidak terdampak; **syarat cutover** (§D.5 v2) |
| **P1-3** | Batas kuantitas/ukuran script (bila script diaktifkan kembali) — **port 80/443 sudah diterapkan di P0-5 (disetujui pemilik v2)** | P0-5 | URL `http://example.com:8080/` ditolak |
| **P1-4** | Logging + alert percobaan SSRF yang diblokir + pola banjir | P0-6 (log keamanan sudah ada) | Log berisi upaya blokir; alert dipicu pada pola banjir |
| **P1-UJI** | Uji akhir + evaluasi ChatGPT + cutover (§D.5 v2 — hanya bila SEMUA uji wajib lolos) | Semua P1 | Laporan akhir; keputusan cutover |

### C.4 Yang TIDAK masuk P0/P1 (dicatat agar tidak tercampur)

- Autentikasi pengguna / Supabase Auth (Phase 1/3 — keputusan terpisah).
- CAPTCHA (P2 — bila abuse berlanjut setelah rate limit).
- Isolasi egress infra / proxy egress (P2 — butuh akses infra).
- Contract Analyzer dan Wallet Analyzer (Phase 4).
- Audit eksternal firma keamanan (Phase 5).

---

## D. Strategi pengujian dan rollback

### D.1 Temporary mitigation — evaluasi 3 opsi (SEBELUM P0 selesai)

| Opsi | Isi | Pro | Kontra | Risiko sisa |
| --- | --- | --- | --- | --- |
| **(a) Nonaktifkan sementara scanning URL arbitrer** | `checkLink` menolak semua URL arbitrer dengan pesan "Pemeriksaan link dijeda sementara untuk peningkatan keamanan". Katalog, dashboard, Gibran tetap jalan. | Menutup seluruh jalur SSRF seketika. Paling sederhana — satu flag. Tidak ada celah parsial. | Fitur utama produk mati sementara. Pengguna tidak bisa cek link sama sekali. Cron auto-add kehilangan langkah checkLink (lihat §A.7). | Hampir nol untuk scanner (tidak ada fetch). Risiko reputasi: pengguna melihat fitur mati. |
| **(b) Batasi akses scanner (allowlist)** | Hanya URL dari domain yang dikenal yang boleh dipindai: domain di katalog 13 proyek + daftar domain besar yang dikurasi manual (mis. binance.com, bscscan.com, etherscan.io, solscan.io). Sisanya ditolak. | Produk tetap berguna sebagian. Risiko SSRF menyusut drastis (penyerang tidak bisa mengarah ke host arbitrer). | Allowlist harus dikelola manual; pengguna tidak bisa cek link airdrop baru (kasus pakai utama produk). Domain allowlist sendiri masih bisa me-redirect ke internal (redirect tetap tidak divalidasi sampai P0-3) — jadi opsi ini HANYA aman bila digabung dengan pemblokiran redirect ke luar allowlist, yang pada praktiknya hampir sama rumitnya dengan P0. | Sedang: redirect dari domain allowlist ke internal masih terbuka sampai P0-3 selesai. |
| **(c) Biarkan jalan dengan peringatan** | Scanner tetap menerima URL arbitrer; tambahkan peringatan di UI bahwa pemeriksaan sedang dalam audit keamanan. | Tidak ada downtime fitur. | Peringatan tidak menghentikan eksploitasi. Scanner tetap menjadi jalur SSRF terbuka yang diketahui publik — dan sekarang penyerang tahu kerentanannya sudah didokumentasikan. | **Tinggi: sama dengan status saat ini (VULNERABLE).** |

**Keputusan pemilik (v2, 7 Nov 2026): opsi (a) DISETUJUI dan HARUS diterapkan
sebelum coding P0.** `checkLink` menolak semua URL arbitrer dengan pesan
"Pemeriksaan link dijeda sementara untuk peningkatan keamanan". Katalog,
dashboard, Gibran tetap jalan. Selama mitigasi, cron auto-add menandai
kandidat "belum terverifikasi link" dan TIDAK auto-add (§A.7) — tidak ada
jalur bypass khusus cron.

**Durasi mitigasi (v2):** sejak keputusan ini sampai cutover disetujui
(§D.5 v2). Mitigasi dicabut hanya oleh keputusan pemilik setelah SELURUH
uji wajib lolos — bukan otomatis, dan bukan hanya karena P0 selesai.

### D.2 Script fetching — evaluasi MVP vs risiko

**Pertanyaan:** apakah fetch eksternal via `<script src>` diperlukan untuk MVP?

**Manfaat yang hilang bila dimatikan:**

| Sinyal yang memakai isi script | Dampak bila script tidak di-fetch |
| --- | --- |
| Connect-wallet / signing code di file JS eksternal | Sinyal ini hanya terdeteksi bila kodenya ada di HTML halaman itu sendiri. Halaman yang memuat logika drainer dari file JS eksternal **tidak akan terdeteksi** lewat sinyal ini. |
| Kode tersamar (obfuscation) di file JS eksternal | Sama — hanya obfuscation di HTML yang terdeteksi. |
| Alamat kontrak di file JS eksternal | Kontrak di HTML tetap terdeteksi; kontrak yang hanya ada di JS eksternal tidak. |

**Manfaat yang TETAP ada tanpa script fetch:** umur domain (RDAP), bahasa
iming-iming di HTML, tautan resmi, alamat kontrak di HTML, daftar domain
drainer (termasuk di rantai redirect), dan seluruh sinyal dari HTML halaman.

**Risiko bila tetap diaktifkan:** setiap halaman yang dipindai dapat mengarahkan
scanner ke hingga 3 URL arbitrer tambahan (vektor SSRF kedua), dan chain
redirect script selama ini dibuang sehingga cek known-bad tidak berlaku.
Risiko ini **tidak sebanding** dengan manfaatnya untuk MVP — terutama karena
drainer modern memang sering menyembunyikan logika di JS eksternal, yang
berarti sinyal script justru paling berharga TETAPI juga paling berbahaya
tanpa guard. Jalan yang benar: matikan sekarang, aktifkan kembali HANYA
setelah guard penuh (P0-1..P0-3) diterapkan pada script fetch + chain-nya
tidak dibuang.

**Keputusan pemilik (v2, 7 Nov 2026): nonaktifkan sementara fetch `<script src>`
DISETUJUI** (dengan flag, bukan hapus kode — agar dapat diaktifkan kembali setelah P0).
Konsekuensi yang harus diterima secara eksplisit: skor beberapa halaman dapat
**turun** (sinyal script = 0). Bila salah satu dari 3 URL acuan berubah vonis
karena ini, itu adalah temuan uji yang harus dilaporkan dan didiskusikan —
bukan alasan untuk mengaktifkan kembali script fetch secara diam-diam.
Prediksi: `scamsem.solbarn.cc` tetap BAHAYA 100 karena deteksinya berbasis
domain drainer terkonfirmasi (bukan isi script); `binance.com` dan
`ptah.trade/poa` tidak memakai sinyal script secara material — tetapi prediksi
ini **harus dibuktikan di staging**, bukan diasumsikan.

### D.3 Information disclosure — rancangan respons (ringkas, detail di §A.6)

- Satu respons penolakan generik untuk semua alasan (§A.6).
- Tidak ada `http_status` / `final_url` / `page_title` / rantai redirect /
  kontrak dari target yang ditolak — di respons maupun di tabel `checks`.
- Upaya blokir dicatat di log keamanan terpisah (hash URL + kategori + waktu),
  bukan di riwayat publik.
- UI: "Pemeriksaan ditolak oleh kebijakan keamanan" — bukan vonis keamanan.

### D.4 Strategi pengujian

#### D.4.1 Prinsip pengujian

1. **Staging terisolasi, target uji yang dikontrol sendiri.** Semua uji blokir
   memakai server uji dan DNS uji yang dikontrol tim (mis. server HTTP lokal
   di jaringan staging terisolasi + zona DNS dengan TTL pendek untuk uji
   rebinding). **JANGAN** menguji dengan mengakses metadata cloud
   (`169.254.169.254`) atau jaringan internal produksi.
2. **Tiga URL acuan adalah tes regresi, bukan satu-satunya tes.** Lolosnya
   ketiga URL tidak membuktikan guard bekerja; lolosnya uji blokir yang
   membuktikannya.
3. **Uji perilaku, bukan keberadaan kode.** Guard "ada di file" tidak cukup;
   yang diuji adalah: URL jahat **tidak menghasilkan fetch** (dibuktikan
   lewat log server uji yang tidak menerima koneksi) dan URL legit tetap
   menghasilkan vonis yang sama.
4. **Setiap uji mencatat:** input, hasil yang diharapkan, hasil aktual,
   dan bukti (log server uji / respons).

#### D.4.2 Uji regresi — 3 URL acuan (harus TETAP SAMA)

| URL | Vonis yang diharapkan | Klasifikasi target |
| --- | --- | --- |
| `scamsem.solbarn.cc` | BAHAYA, skor 100 | MALICIOUS |
| `binance.com` | LEBIH AMAN (skor ~10) | NO_KNOWN_THREAT |
| `ptah.trade/poa` | WASPADA, skor ~45 | SUSPICIOUS |

Toleransi: skor boleh berbeda **maksimal ±5 poin** bila penyebabnya
terdokumentasi (mis. hilangnya sinyal script — lihat §D.2). Perubahan vonis
(naik/turun tingkat) adalah **gagal regresi** — hentikan cutover, diskusikan.

#### D.4.3 Uji blokir SSRF (semua harus DITOLAK sebelum fetch — server uji TIDAK boleh menerima koneksi)

| # | Kasus uji | Input contoh | Yang dibuktikan |
| --- | --- | --- | --- |
| S-01 | IPv4 loopback | `http://127.0.0.1/` | Literal IP loopback ditolak |
| S-02 | IPv4 loopback + port | `http://127.0.0.1:8080/admin` | Port tidak menghindar dari blokir |
| S-03 | localhost | `http://localhost/` | Hostname localhost ditolak |
| S-04 | Private IP 10/8 | `http://10.0.0.5/` | RFC1918 ditolak |
| S-05 | Private IP 172.16/12 | `http://172.16.0.1/` | RFC1918 ditolak |
| S-06 | Private IP 192.168/16 | `http://192.168.1.1/` | RFC1918 ditolak |
| S-07 | Link-local / metadata | `http://169.254.169.254/latest/meta-data/` | Metadata cloud ditolak |
| S-08 | Metadata hostname | `http://metadata.google.internal/` | Hostname metadata ditolak |
| S-09 | IPv6 loopback | `http://[::1]/` | IPv6 loopback ditolak |
| S-10 | IPv6 link-local | `http://[fe80::1]/` | IPv6 link-local ditolak |
| S-11 | IPv4-mapped IPv6 | `http://[::ffff:127.0.0.1]/` | Mapped IPv6 dikonversi lalu ditolak |
| S-12 | IPv4-mapped IPv6 (privat) | `http://[::ffff:10.0.0.5]/` | Mapped IPv6 privat ditolak |
| S-13 | Integer IP | `http://2130706433/` (= 127.0.0.1) | Bentuk integer diurai lalu ditolak |
| S-14 | Hex IP | `http://0x7f.0.0.1/` dan `http://0x7f000001/` | Bentuk heksadesimal diurai lalu ditolak |
| S-15 | Oktal IP | `http://0177.0.0.1/` | Bentuk oktal diurai lalu ditolak |
| S-16 | Bentuk pendek | `http://127.1/` | Bentuk pendek diurai lalu ditolak |
| S-17 | `0.0.0.0` | `http://0.0.0.0/` | "This network" ditolak |
| S-18 | Userinfo | `https://x@127.0.0.1/` dan `http://127.0.0.1@93.184.216.34/` | Userinfo ditolak / tidak mengaburkan host |
| S-19 | Skema non-HTTP(S) | `file:///etc/passwd`, `ftp://example.com/x`, `gopher://example.com/` | Skema ditolak |
| S-20 | Redirect ke privat | Server uji → 302 → `http://127.0.0.1/` | Redirect divalidasi ulang dan ditolak |
| S-21 | Redirect ke metadata | Server uji → 302 → `http://169.254.169.254/` | Redirect ke metadata ditolak |
| S-22 | Redirect skema jahat | Server uji → 302 → `file:///etc/passwd` | Skema Location ditolak |
| S-23 | Redirect rantai campuran | Server uji → 302 publik → 302 → `http://10.0.0.5/` | Hop ke-2 divalidasi, bukan hanya hop pertama |
| S-24 | DNS rebinding | DNS uji: resolve pertama → IP publik; resolve kedua (TTL 1 dtk) → 127.0.0.1 | Koneksi tetap ke IP pertama yang divalidasi (pinning) ATAU ditolak — yang TIDAK boleh: koneksi ke 127.0.0.1 |
| S-25 | DNS ke privat | Hostname uji yang me-resolve ke 192.168.1.1 | Resolve privat ditolak sebelum koneksi |
| S-26 | DNS multi-alamat campuran | Hostname uji → `[93.184.216.34, 10.0.0.5]` | SATU alamat terlarang → seluruh hostname ditolak |
| S-27 | Script src ke privat | Halaman uji dengan `<script src="http://10.0.0.5/x.js">` | (Selama mitigasi: tidak ada fetch script sama sekali. Bila script diaktifkan kembali: script src ditolak guard) |
| S-28 | Script src redirect | Halaman uji dengan script src → 302 → privat | (Bila script aktif: chain script divalidasi, tidak dibuang) |
| S-29 | DNS tidak dapat di-resolve | Hostname yang NXDOMAIN | Ditolak (fail-closed), bukan "coba fetch" |
| S-30 | URL dengan port non-standar (publik) | `http://93.184.216.34:8080/` | Ditolak (port 80/443 saja — disetujui pemilik v2, diterapkan di P0-5) |

#### D.4.4 Uji legit — harus TETAP LOLOS (anti false-positive)

| # | Kasus uji | Yang dibuktikan |
| --- | --- | --- |
| L-01 | URL publik biasa (3 URL acuan) | Vonis tidak berubah (§D.4.2) |
| L-02 | URL publik dengan port eksplisit 443 | `https://example.com:443/` lolos (port standar) |
| L-03 | Subdomain dalam (mis. `https://sub.domain.example.com/path`) | Subdomain publik lolos |
| L-04 | Redirect legit antar domain publik (mis. shortener → domain publik) | Rantai redirect publik tetap diikuti |
| L-05 | IPv6 publik | `http://[2606:4700:4700::1111]/` lolos |
| L-06 | IDN / punycode publik | Domain IDN yang resolve ke IP publik lolos |
| L-07 | URL dengan query + fragment | Query tidak memengaruhi guard |
| L-08 | Domain dengan banyak alamat A/AAAA publik | Semua alamat publik → lolos |

#### D.4.5 Uji sumber daya (P1) — v2

| # | Kasus uji | Yang diharapkan |
| --- | --- | --- |
| R-01 | Server lambat (respons > 20 detik) | Pemeriksaan selesai ≤ ~20 detik (timeout global); status "tidak selesai (timeout)", bukan vonis |
| R-02 | Respons raksasa (mis. 50 MB) | Streaming di-abort pada ~400 KB; memori tidak membengkak |
| R-03 | Content-Length besar | Abort sebelum body penuh diunduh |
| R-04 | Content-Type octet-stream | Tidak dipindai sebagai HTML |
| R-05 | Banjir 100 request/menit dari satu IP | Dibatasi rate limit (429); pengguna lain tidak terdampak |
| R-06 | 10 pemeriksaan bersamaan | Antrean bekerja; tidak ada yang menggantung tanpa batas |
| R-07 | **Bombe dekompresi (v2):** gzip ~1 KB yang mengembang ke 1 MB | Abort pada ~400 KB **byte terdekompresi** (terbukti di spike W6: abort pada 524.288 byte padahal Content-Length hanya 1.004); `Content-Length` kecil TIDAK boleh meloloskan body raksasa |
| R-08 | **Abort per tahap (v2):** DNS lambat (> 5 dtk), koneksi menggantung, redirect lambat, RDAP lambat, body menetes pelan | Masing-masing tahap dibatalkan oleh timeout global 20 dtk; tidak ada tahap yang jalan melampaui anggaran; sumber daya (soket/reader/agent) ditutup di `finally` |
| R-09 | **Rate limit multi-instance (v2):** banjir dari satu IP yang disebar ke semua instance | Kuota global tetap 10/menit + 100/jam (bukan per instance); respons 429 konsisten di semua instance |
| R-10 | **Spoofing header (v2):** request dengan `X-Forwarded-For` palsu | IP pemanggil yang dihitung rate limit-nya BUKAN IP palsu dari header (kecuali discovery P1-2a membuktikan proxy tepercaya) |
| R-11 | **Dekompresi jalur Node Agent (v2.1):** bombe gzip/deflate/brotli 1 MB via `http.Agent` pinning | Abort pada ~400 KB byte terdekompresi di semua encoding (terbukti: 409.600 byte); tanpa Content-Length tetap abort |
| R-12 | **Timeout global tanpa vonis parsial (v2.1):** server tidak merespons > 20 detik | Pemeriksaan berhenti pada ~20 detik; status "tidak selesai (timeout)", TANPA skor/vonis/baris `checks` |
| R-13 | **DNS race + non-cancellable (v2.1):** lookup lambat vs timer 5 detik | Timer menang; hasil telat DIABAIKAN (tidak dipakai pinning); lookup tidak menumpuk (semaphore) |
| R-14 | **Konkurensi global (v2.1):** 6 pemeriksaan bersamaan dari instance berbeda | Hanya 5 yang berjalan; ke-6 ditolak 429; slot kembali tersedia setelah salah satu selesai; lease kedaluwarsa 25 detik membersihkan slot proses yang mati |
| R-15 | **Beban konkurensi ratusan instance (v2.2):** ratusan acquire lease bersamaan di staging | Latensi acquire p95 tercatat; rasio 503 < 1%; tidak ada lease yang melampaui batas 5; bila kontensi terbukti bermasalah, tindak lanjuti sesuai U-17 |

#### D.4.6 Uji blokir tambahan (v2 — perluasan S-01..S-30)

| # | Kasus uji | Yang dibuktikan |
| --- | --- | --- |
| S-31 | NAT64: `http://[64:ff9b::7f00:1]/` (= 127.0.0.1 tertanam) | IPv4 tertanam diekstrak lalu ditolak |
| S-32 | NAT64 legit: `http://[64:ff9b::5db8:d822]/` (= 93.184.216.34 tertanam) | IPv4 tertanam publik → diizinkan (bukan ditolak membabi buta) |
| S-33 | IPv4-mapped: `http://[::ffff:192.168.1.1]/` | Dikonversi lalu ditolak |
| S-34 | TEREDO / 6to4: `http://[2001::7f00:1]/`, `http://[2002:7f00:1::]/` | Prefiks translasi ditolak |
| S-35 | Zone identifier: `http://[fe80::1%eth0]/`, `http://[fe80::1%25eth0]/` | Ditolak sebelum resolve — zone ID tidak pernah di-strip lalu dilanjutkan |
| S-36 | TEST-NET / benchmarking: `http://192.0.2.1/`, `http://198.18.0.1/`, `http://203.0.113.1/` | Dokumentasi/benchmarking ditolak |
| S-37 | Dokumentasi IPv6: `http://[2001:db8::1]/`, `http://[3fff::1]/` | Ditolak |
| S-38 | Discard-only: `http://[100::1]/` | Ditolak |
| S-39 | CGNAT: `http://100.64.0.1/` | Ditolak (keputusan pemilik v2) |
| S-40 | RDAP redirect ke host di luar bootstrap: server uji RDAP → 302 → `https://rdap.evil.example/` | Redirect RDAP di luar allowlist bootstrap DITOLAK; lookup jadi "umur domain tidak diketahui" |
| S-41 | RDAP redirect ke entri `http://` dalam registry | Ditolak (RDAP hanya HTTPS); bukan dialihkan ke HTTP |
| S-42 | RDAP redirect ke host bootstrap yang benar (mis. `.com` → `rdap.verisign.com`) | Diizinkan DAN tetap melalui DNS validation + IP pinning |
| S-43 | DNS rebinding dengan TTL pendek (lanjutan S-24) | Koneksi tetap ke IP pertama yang divalidasi; server uji mencatat 0 koneksi ke IP kedua |
| S-44 | **NAT64 /48 privat (v2.1):** `http://[64:ff9b:1:c0a8:1:100::]/` | IPv4 `192.168.1.1` diekstrak dari bit 48..63 + 72..87 lalu DITOLAK |
| S-45 | **NAT64 /48 publik (v2.1):** `http://[64:ff9b:1:808:8:800::]/` | IPv4 `8.8.8.8` diekstrak lalu DIIZINKAN (anti false-positive atas koreksi) |
| S-46 | **NAT64 /48 bypass suffix (v2.1):** `http://[64:ff9b:1:c0a8:1:100:5db8:d822]/` | IPv4 privat `192.168.1.1` diekstrak (bukan `93.184.216.34` dari suffix) lalu DITOLAK — aturan v2 yang salah MELOLOSKAN kasus ini |
| S-47 | **NAT64 /48 u-octet ≠ 0 (v2.1):** `http://[64:ff9b:1:c0a8:ff01:100::]/` | Malformed (byte 8 = 0xff) → DITOLAK, jangan ekstrak |
| S-48 | **Regresi aturan v2 (v2.1):** uji ekstraktor terhadap `64:ff9b:1:808:8:800::` | Ekstraktor TIDAK BOLEH menghasilkan `0.0.0.0` (hasil aturan v2 yang salah) — harus `8.8.8.8` |
| S-49 | **NSP staging — prefix diketahui (v2.2):** DNS64 staging dengan prefix NSP `2001:db8:100::/48` yang mengemas `192.168.1.1` | IPv4 privat diekstrak dari posisi sesuai panjang prefix (RFC 6052) lalu DITOLAK — membuktikan guard dapat menangani NSP BILA prefixnya diketahui |
| S-50 | **NSP staging — prefix tidak diketahui (v2.2):** DNS64 staging dengan prefix NSP yang TIDAK ada di daftar guard, mengemas `192.168.1.1` | DITOLAK ATAU dicatat sebagai keterbatasan yang diketahui — hasil ini TIDAK BOLEH diklaim sebagai "lolos" bila guard tidak mengekstraknya; bila lolos, risiko U-11 TETAP TERBUKA dan prefix itu ditambahkan ke daftar guard sebelum cutover |

#### D.4.8 Uji semaphore DNS dan lease global (v2.2 — SEM-01..SEM-06, LSE-01..LSE-06)

Uji perilaku dari `SSRF_SPIKE_V22.md` (bukti: 11/11 PASS di VM ini;
uji ulang di staging produksi wajib sebelum cutover):

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| SEM-01 | Lookup lambat vs race timeout (SEM-T1) | Slot tetap terpakai setelah race timeout; dilepas hanya saat underlying settle; `lateSettled` tercatat |
| SEM-02 | Antrean penuh (SEM-T2) | Waiter ke-3 ditolak `DNS_QUEUE_FULL`; FIFO berjalan; `active`/`queued` kembali 0 |
| SEM-03 | Banjir 20 request (SEM-T3) | Lookup yang dimulai ≤ `maxActive + maxQueue`; `maxActiveObserved` tidak pernah > 4; semua settle dan dilepas |
| SEM-04 | Waiter antrean timeout (SEM-T4) | Waiter keluar dari antrean setelah `queueWaitMs`; `queueTimedOut` tercatat |
| SEM-05 | Lookup tak pernah settle (SEM-T5) | Slot direbut absolute cap; `forceReleased` tercatat; slot bisa dipakai lagi |
| SEM-06 | Metrik (SEM-T6) | 10 kunci metrik tersedia dengan tipe numerik |
| LSE-01 | 8 instance serentak, 1 slot tersisa | Tepat 1 pemenang; total lease hidup = 5 |
| LSE-02 | Ulangi LSE-01 sebanyak 3 ronde | Tepat 1 pemenang tiap ronde |
| LSE-03 | Lease kedaluwarsa (TTL) | Slot bebas setelah TTL; acquire berhasil |
| LSE-04 | Lease yatim (proses mati sebelum release) | Ditolak selama TTL; diambil alih setelah TTL lewat |
| LSE-05 | Kegagalan release | Rowcount 0 tanpa error; lease tetap kedaluwarsa sendiri |
| LSE-06 | Sama seperti LSE-01/02 dengan **PostgreSQL nyata di staging** (advisory lock / counter row) | Tepat 1 pemenang; tidak ada error 40001/40P01 yang tidak tertangani |

#### D.4.9 Uji orphaned DNS, circuit breaker, dan pemulihan worker (v2.3 — ORPH-01..ORPH-05)

Uji perilaku dari `SSRF_SPIKE_V23.md` (bukti: 13/13 PASS, dijalankan
ulang 2×, Node v24.22.1, resolver stub yang dikontrol sendiri). Semua uji
ini wajib diulang di staging produksi (U-1) sebelum cutover, karena
perilaku timer/IPC di runtime produksi belum terbukti.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| ORPH-01 | Kontrol v2.2 tanpa batas orphaned (ORPH-T0) | Keberatan TERBUKTI: 3 gelombang force-release menumbuhkan orphaned 2→4→6 tanpa batas — kontrol ini mendokumentasikan perilaku yang diperbaiki v2.3, bukan perilaku yang diterima |
| ORPH-02 | Gelombang berulang dengan batas (ORPH-T1) | `orphaned` tidak pernah > cap; live ops tidak pernah > `maxActive + cap`; gelombang ke-3 ditolak breaker |
| ORPH-03 | Breaker (ORPH-T2) | Request ditolak `DNS_CIRCUIT_OPEN` instan; 0 lookup underlying baru selama breaker terbuka; `rejectedCircuitOpen` tercatat |
| ORPH-04 | Pemulihan lewat settle + gelombang kedua (ORPH-T3) | Breaker menutup hanya saat `orphaned ≤ threshold`; operasi cap-deferred direbut kembali dengan benar; gelombang kedua tetap berbatas |
| ORPH-05 | Kill worker + metrik (ORPH-T4, ORPH-T4b, ORPH-T5) | `SIGKILL` menghentikan operasi (`orphaned` → 0, breaker menutup, worker baru melayani); worker thread terminate terbukti tetapi DITOLAK sebagai pengganti isolasi proses; metrik sesuai prediksi state machine |
| ORPH-06 | Pengulangan SEM-01..SEM-06 setelah perubahan (SEM-R1..SEM-R6) | 6/6 lolos terhadap implementasi v2.3 (catatan: harness asli v2.2 hilang karena `/tmp` dibersihkan; SEM-R1..R6 adalah implementasi ulang dari spesifikasi `SSRF_SPIKE_V22.md` §1) |

#### D.4.10 Uji konfirmasi terminasi, crash parent, dan rekonsiliasi (v2.3.1 — TERM-01..TERM-04, PARENT-01..PARENT-02, RECON-01)

Uji perilaku dari `SSRF_SPIKE_V231.md` (bukti: 61/61 PASS — TERM 23/23 +
PARENT 15/15 + pengulangan SEM-R1..R6 + ORPH-T0..T5 23/23, masing-masing
dijalankan ulang 2×, Node v24.22.1, proses/komponen lokal yang dikontrol
sendiri). Semua uji ini wajib diulang di staging produksi (U-1, U-16,
U-22) sebelum cutover, karena perilaku timer/IPC/exit event di runtime
produksi belum terbukti. Catatan: harness asli v2.2 DAN v2.3 hilang karena
`/tmp` dibersihkan antar sesi; semua pengujian v2.3.1 adalah implementasi
ulang dari spesifikasi yang didokumentasikan.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| TERM-01 | SIGKILL worker (3 orphaned, breaker terbuka) | Counter tidak berubah pada pemeriksaan sinkron segera setelah `kill()` kembali; turun hanya setelah event `exit` (`orphaned` 3→0, `orphanedTerminated`=3); breaker menutup setelah exit |
| TERM-02 | Urutan pembukaan breaker | Evaluasi `_maybeCloseBreaker()` 0× saat kill, tepat 1× setelah exit; lookup sebelum exit ditolak `DNS_CIRCUIT_OPEN`; worker baru melayani setelah pemulihan |
| TERM-03 | Exit tidak pernah terkonfirmasi | Counter tetap, breaker tetap terbuka, `workerExitUnconfirmed`=1 — bahkan setelah +500 ms tambahan tanpa konfirmasi |
| TERM-04 | Terminate ganda / sudah mati | Idempotent; tidak ada counter negatif |
| PARENT-01 | Parent SIGKILL saat lookup berjalan (worker normal) | Worker mati (`disconnect` tercatat); request in-flight fail-closed tanpa vonis; tidak ada yatim |
| PARENT-02 | Worker stubborn + parent baru; pemulihan state | Worker lama tetap hidup; parent baru membunuhnya via pidfile (SIGKILL + konfirmasi exit); worker baru melayani; lease global dari parent mati terlihat parent baru; lease kedaluwarsa sendiri setelah TTL; tidak ada yatim tersisa |
| RECON-01 | Pengulangan SEM-R1..R6 + ORPH-T0..T5 (23 pemeriksaan) | Semua lolos terhadap implementasi referensi v2.3.1; ORPH-T0 = orphaned akhir 6 / live maks 6 / started 6; ORPH-T1 = orphaned maks 3 / live maks 4 / started 4 — mengonfirmasi isi §2/§3 `SSRF_SPIKE_V23.md` dan mengoreksi penempatan anotasi blok output-nya (lihat §4 `SSRF_SPIKE_V231.md`); SEM-R6 = 21 kunci metrik (19 v2.3 + 2 baru v2.3.1) |
| SUP-01 | Supervisor platform (staging, U-22) | Dokumentasi supervisor menyatakan (a) crash memicu restart otomatis dan (b) anak proses dibunuh bersama parent (kill process group). Bila tidak dapat dibuktikan, G6 tidak lolos untuk lapis supervisor — pertahanan yang tersisa adalah self-exit + pidfile cleanup yang teruji di PARENT-01/PARENT-02 |

#### D.4.11 Uji aturan startup NOT_READY, validasi identitas, pidfile atomik, dan startup lock (v2.3.2 — STARTUP-01..STARTUP-09; diperluas v2.3.3 — STARTUP-10, RCL-01..RCL-06, D-01..D-03)

Uji perilaku dari `SSRF_SPIKE_V232.md` (bukti: 9/9 PASS — SU-T1..SU-T9,
masing-masing dijalankan ulang **3×** dengan hasil identik — RUN=1,
RUN=2, dan RUN=3; RUN=3 dijalankan dan didokumentasikan selama revisi
v2.3.3, output verbatim di `SSRF_SPIKE_V233.md` §0 — Node v24.22.1,
proses/komponen lokal yang dikontrol sendiri di `/tmp/ssrf-v232`).
Harness disalin ke `spike-harness-v232/` agar dapat dijalankan ulang.
Regresi terhadap implementasi referensi yang diperkeras v2.3.3: 9/9 PASS
× 2 run tambahan (bukti `SSRF_SPIKE_V233.md` §2a, harness
`spike-harness-v233/`). Uji baru v2.3.3 (reklamasi yang diperkeras +
STARTUP-10): 8/8 PASS × 2 (bukti `SSRF_SPIKE_V233.md` §2b).
Semua uji ini wajib diulang di staging produksi (U-1, U-16, U-22)
sebelum cutover, karena perilaku `/proc`, O_EXCL, dan supervisor di
runtime produksi belum terbukti.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| STARTUP-01 | Worker tidak bisa dimatikan (exit tak terkonfirmasi) — SU-T1 | Setelah 3 percobaan tanpa konfirmasi exit: state tetap `NOT_READY`, `sigsSent=3`, lookup ditolak `DNS_PARENT_NOT_READY`, worker masih hidup |
| STARTUP-02 | PID reuse (starttime tidak cocok) — SU-T2 | Validasi gagal `starttime-mismatch` → 0 SIGKILL, `page=1`, decoy tetap hidup, parent tetap `NOT_READY` |
| STARTUP-03 | Worker nyata, identitas valid — SU-T3 | 1 SIGKILL, exit terkonfirmasi pada percobaan pertama, state `READY`, lookup diterima, worker tidak lagi hidup |
| STARTUP-04 | Pidfile atomik, 20 penulis bersamaan + crash saat tulis — SU-T4 | File selalu berisi SATU record lengkap yang valid; file tmp setengah tertulis tidak merusak pidfile |
| STARTUP-05 | Startup lock, 5 parent (proses nyata) bersamaan — SU-T5 | Tepat 1 pemenang; 4 kalah dengan alasan `held-by-live-holder`; yang kalah tidak melakukan cleanup |
| STARTUP-06 | Pemegang lock mati — SU-T6 | Parent baru berhasil acquire dengan `reclaimed=true` setelah PID pemegang mati + heartbeat basi |
| STARTUP-07 | Pidfile basi (parent+worker mati) — SU-T7 | `READY` via `worker-already-dead`, 0 SIGKILL |
| STARTUP-08 | Worker mati sendiri sebelum cleanup — SU-T8 | `READY` via `worker-already-dead`, 0 SIGKILL |
| STARTUP-09 | Pidfile rusak/parsial/hilang — SU-T9 | Rusak/parsial → `NOT_READY` + `pidfile-corrupt` + page, 0 SIGKILL; hilang → `READY` (`no-pidfile`) |
| STARTUP-10 | Reklamasi lock basi bersamaan (v2.3.3 — TERUJI di VM ini) | Lima parent (proses nyata) mereklamasi lock basi yang sama bersamaan: tepat 1 pemenang (`reclaimed=true`, `ownershipVerified=true`); 4 kalah dengan alasan `held-by-live-holder`; 0 cleanup dari pihak mana pun; file lock di akhir berisi identitas pemenang. Bukti: `SSRF_SPIKE_V233.md` SU10-T1 (8/8 PASS × 2). **Catatan v2.3.4: hasil ini tetap benar sebagai catatan balapan ACAK, tetapi klaim bahwa ia membuktikan tidak adanya race DITARIK — lihat ADV-01 (§D.4.12).** Uji ulang di staging produksi tetap wajib sebelum cutover (U-1, U-16) |
| RCL-01 | Heartbeat basi + PID HIDUP — RCL-T1 (v2.3.3) | Holder hidup dengan heartbeat 60 dtk yang lalu: `held-by-live-holder`, file lock utuh byte-demi-byte, holder tetap hidup. Membuktikan heartbeat tidak dipakai dalam keputusan hapus |
| RCL-02 | EPERM dari probe — RCL-T2 (v2.3.3) | Probe melempar EPERM: `holder-unverifiable`, `page=true`, lock utuh |
| RCL-03 | Error probe lain (stat tidak terbaca) — RCL-T3 (v2.3.3) | Probe mengembalikan `uncertain`: `holder-unverifiable`, `page=true`, lock utuh |
| RCL-04 | ESRCH (PID terbukti mati) — RCL-T4 (v2.3.3) | Reklamasi berjalan: `acquired=true`, `reclaimed=true`, `ownershipVerified=true` |
| RCL-05 | Lock tidak terbaca — RCL-T5 (v2.3.3) | JSON terpotong dengan mtime segar: `lock-unreadable`, `page=true`, file tetap ada dengan isi yang sama (aturan "hapus bila > 30 dtk" v2.3.2 sudah dihapus) |
| RCL-06 | PID reuse (PID hidup, starttime tidak cocok) — RCL-T6 (v2.3.3) | `holder-identity-mismatch`, `page=true`, lock utuh, decoy tetap hidup — aturan ketat: PID hidup berarti JANGAN hapus |
| ADV-01 | Skenario keberatan ChatGPT (v2.3.4 — race TERBUKTI, kode v2.3.3) | B menahan unlink sampai A selesai acquire (barrier): 2 pemilik pada 2/2 run (A ino ≠ B ino, `aFileDeleted=true`); A tidak pernah tahu filenya dihapus. Bukti: `SSRF_SPIKE_V234.md` ADV-T1. Klaim v2.3.3 tentang O_EXCL ditarik |
| ADV-02 | Unlink sebelum verify (v2.3.4 — kode v2.3.3) | B meng-unlink setelah A create tetapi sebelum A verify: A gagal `ownership-revalidation-failed`, tepat satu pemilik (B). Bukti: ADV-T3a. Membuktikan verify hanya menangkap jendela sebelum verify |
| ADV-03 | Kedua unlink mendahului kedua create (v2.3.4 — kode v2.3.3) | Dengan barrier "kedua pihak unlink dulu, baru create": O_EXCL men-serialisasi pembuatan, tepat satu pemilik (pemenang bervariasi). Bukti: ADV-T3c. Membuktikan O_EXCL bekerja pada bagiannya — dan tidak menjawab keberatan |
| ADV-04 | Skenario ADV-T1 pada kode flock (v2.3.4 — PERBAIKAN) | B mencoba flock SETELAH A memperolehnya: tepat satu pemilik (B: `held-by-live-holder`), 2/2 run. Bukti: ADV-T2 |
| ADV-05 | Kedua pihak flock bersamaan (v2.3.4 — PERBAIKAN) | Tepat satu pemenang (kernel men-serialisasi; pemenang bervariasi A/B antar run), 2/2 run. Bukti: ADV-T2sim |
| ADV-06 | Unlink pihak ketiga + versi campuran (v2.3.4 — PERBAIKAN + FLAG-DAY) | ADV-T5: unlink+recreate setelah acquire terdeteksi verifikasi ulang (2/2, 0 cleanup). ADV-T6: kode lama vs flock — KEDUA pihak memperoleh lock (bahaya transisi terbukti), tetapi holder flock mendeteksi kepemilikan tidak valid sebelum cleanup (2/2, 0 cleanup). Bukti: `SSRF_SPIKE_V234.md` §4a |
| FLK-01 | Kontensi flock (v2.3.4) | flock EX\|NB kedua gagal EWOULDBLOCK (errno 11) saat holder hidup — tmpfs dan overlay, 9/9 × 2 tiap fs. Bukti: FLK-T1 |
| FLK-02 | Pelepasan flock (v2.3.4) | SIGKILL holder (FLK-T2), close fd (FLK-T3), LOCK_UN eksplisit (FLK-T7) — contender langsung memperoleh lock. Membuktikan tidak ada lagi "lock basi" yang harus direklamasi |
| FLK-03 | Open kedua + close tidak melepas (v2.3.4) | Holder membuka file yang sama kedua kalinya, membaca, menutupnya — contender tetap BLOCKED. Membuktikan verifikasi ulang via open O_RDONLY aman. Bukti: FLK-T4 |
| FLK-04 | Bahaya unlink (v2.3.4) | Setelah path di-unlink + file baru dibuat, opener baru memperoleh flock pada inode BARU sementara holder lama masih memegang flock pada inode lama — dua "pemegang" berdampingan. Membuktikan aturan never-unlink adalah load-bearing. Bukti: FLK-T5 |
| FLK-05 | CLOEXEC (v2.3.4) | FLK-T8a: holder (fd O_CLOEXEC) mati, anak yatim hidup tanpa fd — contender langsung memperoleh lock. FLK-T8b: fd dibuat inheritable dan diwariskan ke anak — contender TETAP terblokir selama anak hidup. Membuktikan persyaratan CLOEXEC bukan teori |
| D-01 | Durabilitas pidfile — crash tepat setelah rename (v2.3.3, staging) | Matikan paksa VM/container tepat setelah rename: pidfile sesudah reboot berisi SATU record lengkap yang valid (baru ATAU lama), tidak pernah parsial/corrupt |
| D-02 | Durabilitas pidfile — crash sebelum fsync direktori (v2.3.3, staging) | Jeda tepat sebelum fsync direktori lalu matikan paksa: pidfile sesudah reboot adalah record lama yang lengkap (bukan hilang, bukan parsial) |
| D-03 | Durabilitas pidfile — crash saat menulis file sementara (v2.3.3, staging) | Matikan paksa saat file sementara sedang ditulis: pidfile lama tetap utuh; file sementara setengah tertulis tidak pernah terlihat sebagai pidfile |

#### D.4.12 Uji adversarial reklamasi lock dan semantik flock (v2.3.4 — ADV-01..ADV-06, FLK-01..FLK-05)

Uji perilaku dari `SSRF_SPIKE_V234.md` (bukti: ADV old-code 3/3 × 2, ADV
fixed-code 4/4 × 2, FLK 9/9 × 2 tmpfs + 9/9 × 2 overlay — Node v24.22.1,
Bun 1.4.4, Python 3.12.3, proses/komponen lokal yang dikontrol sendiri).
Harness disalin ke `spike-harness-v234/` agar dapat dijalankan ulang.
Semua uji ini wajib diulang di staging produksi (U-1, U-16, U-22, U-29,
U-30) sebelum cutover, karena perilaku flock, binding FFI, `/proc`, dan
supervisor di runtime produksi belum terbukti.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| ADV-01 | Skenario keberatan ChatGPT pada kode v2.3.3 (ADV-T1) | B menahan unlink sampai A selesai acquire (barrier deterministik): 2 pemilik pada 2/2 run — race TERBUKTI, bukan hipotesis. `aFileDeleted=true`, A tidak pernah tahu |
| ADV-02 | Unlink sebelum verify pada kode v2.3.3 (ADV-T3a) | A gagal `ownership-revalidation-failed`, tepat satu pemilik (B). Membuktikan batas verify: hanya jendela sebelum verify yang tertangkap |
| ADV-03 | Kedua unlink mendahului kedua create, kode v2.3.3 (ADV-T3c) | Barrier "kedua pihak unlink dulu": O_EXCL men-serialisasi pembuatan, tepat satu pemilik. Tanpa barrier ini, uji berdegenerasi menjadi ADV-T1 (didokumentasikan di `SSRF_SPIKE_V234.md` §3a) |
| ADV-04 | Skenario ADV-T1 pada kode flock (ADV-T2) | B mencoba flock setelah A memperolehnya: tepat satu pemilik (B: `held-by-live-holder`), 2/2 run |
| ADV-05 | Flock bersamaan + interferensi pihak ketiga (ADV-T2sim, ADV-T5) | T2sim: tepat satu pemenang (kernel men-serialisasi). T5: unlink+recreate setelah acquire terdeteksi verifikasi ulang (`verifiedAfterInterference=false`, 0 cleanup), 2/2 run |
| ADV-06 | Versi campuran lama vs flock (ADV-T6) | KEDUA pihak memperoleh lock (bahaya transisi TERBUKTI), tetapi holder flock mendeteksi kepemilikan tidak valid sebelum cleanup (`verifiedAfter=false`, 0 cleanup), 2/2 run. Menegakkan flag-day §A.5.5.4d |
| ADV-07 | Diagnostik T6 inode-only (bukan bagian suite permanen — bukti pendukung) | Verifikasi inode-only + baca-via-fd terhadap skenario T6 dengan harness yang sudah diperbaiki: mendeteksi penggantian pada 2/2 run. Membuktikan kegagalan T6 pertama adalah cacat harness (timeout barrier 15 dtk), BUKAN daur ulang inode. Probe daur ulang: 0/30 tmpfs, 0/30 overlay |
| FLK-01 | Kontensi flock (FLK-T1, FLK-T6) | flock EX\|NB kedua gagal EWOULDBLOCK (errno 11) saat holder hidup — perilaku identik di tmpfs dan overlay |
| FLK-02 | Pelepasan flock (FLK-T2/T3/T7) | SIGKILL holder, close fd, LOCK_UN eksplisit — contender langsung memperoleh lock pada tiap kasus |
| FLK-03 | Open kedua + close tidak melepas (FLK-T4) | Contender tetap BLOCKED setelah holder menutup fd kedua — verifikasi ulang via open O_RDONLY aman |
| FLK-04 | Bahaya unlink (FLK-T5) | Setelah unlink+recreate, opener baru memperoleh flock pada inode baru sementara holder lama memegang inode lama — dua pemegang berdampingan. Never-unlink terbukti load-bearing |
| FLK-05 | CLOEXEC (FLK-T8a/T8b) | T8a: holder O_CLOEXEC mati, anak yatim tanpa fd — contender langsung memperoleh lock. T8b: fd inheritable diwariskan ke anak — contender TETAP terblokir selama anak hidup. Persyaratan CLOEXEC terbukti bukan teori |
| FLK-06 | Binding flock (staging — BELUM TERUJI di VM ini untuk Node) | `bun:ffi` -> libc flock TERBUKTI di Bun 1.4.4 (acquire / EWOULDBLOCK errno 11 / release on close). `fs-ext` untuk Node GAGAL dibangun di VM ini (node-gyp EPERM fchown — pembatasan sandbox). Bila produksi memakai Node, binding wajib dibuktikan di staging (U-29) |
| FLK-07 | flock di NFS (staging — BELUM TERUJI) | Tidak ada NFS di VM ini. Bila direktori lock produksi berada di NFS, flock TIDAK BOLEH diandalkan tanpa bukti staging (U-30) |

#### D.4.13 Uji otoritas flock, mixed-version, dan zombie liveness (v2.3.5 — AUTH-01..AUTH-16)

Uji perilaku dari `SSRF_SPIKE_V235.md` (bukti: AUTH 18/18 PASS × 2 run
— Bun 1.4.4, Node v24.22.1, Python 3.12.3, proses/komponen lokal yang
dikontrol sendiri). Harness disalin ke `spike-harness-v235/` agar dapat
dijalankan ulang. Semua uji ini wajib diulang di staging produksi
(U-1, U-16, U-22, U-29, U-30, U-34, U-35, U-36) sebelum cutover,
karena perilaku flock, binding FFI, `/proc`, dan supervisor di runtime
produksi belum terbukti.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| AUTH-01 | Dua parent berebut flock, inode sama (AUTH-T1) | Tepat satu pemilik; yang kalah `held-by-live-holder`, 0 cleanup, 2/2 run (pemenang boleh bertukar — balapan simetris) |
| AUTH-02 | Unlink + recreate saat fd lama memegang flock (AUTH-T2) | Holder lama mendeteksi (`verifiedAfterInterference=false`, 0 cleanup); opener baru memperoleh flock pada inode baru, 2/2 run |
| AUTH-03 | Parent crash, worker stubborn hidup (AUTH-T3) | Parent baru READY, worker lama mati, worker baru hidup, tepat 1 dns-worker, 2/2 run |
| AUTH-04 | Fd diwariskan ke child (AUTH-T4) | Contender BLOCKED selama child pemegang fd hidup, ACQUIRED setelah child mati, 2/2 run |
| AUTH-05 | Mixed-version old-first, scan aktif (AUTH-T5a) | Parent baru keluar `other-parent-alive` tanpa acquire/cleanup, 2/2 run |
| AUTH-06 | Mixed-version, klasifikasi record, scan off test-only (AUTH-T5b) | Parent baru keluar `held-by-old-version`, sentinel tertulis, 2/2 run |
| AUTH-07 | Mixed-version new-first, old unlink (AUTH-T5c, regresi ADV-T6) | Kedua pihak memperoleh lock (bahaya direproduksi) tetapi holder flock mendeteksi sebelum cleanup (`verifiedAfter=false`, 0 cleanup), 2/2 run |
| AUTH-08 | Jendela mikro guarded vs unguarded (AUTH-T6) | Guarded: tindakan TIDAK berjalan (`ownershipLost=true`); kontrol unguarded: tindakan berjalan (membuktikan jendela nyata), 2/2 run |
| AUTH-09 | Supervisor restart + cleanup (AUTH-T7) | Parent #2 READY, worker lama mati, worker baru hidup, tepat 1 dns-worker, 2/2 run (supervisor stub — SUP-01 tetap wajib) |
| AUTH-10 | Record korup / tak terbaca (AUTH-T8a/T8b) | `lock-record-unreadable`, fail-closed; setelah operator menghapus file, acquire berhasil (T8a), 2/2 run |
| AUTH-11 | Filesystem read-only + POSIX lockf vs flock (AUTH-T9a/T9b) | Open di `/sys` gagal EROFS fail-closed; `lockf` dilepas oleh close fd lain (contender ACQUIRED) sementara `flock` bertahan (contender BLOCKED), 2/2 run |
| AUTH-12 | Worker token self-check + pidfile flock (AUTH-T10a–T10d) | Serve normal; token diganti in-place → worker exit `token-mismatch`; parent mati → worker exit `pidfile-lock-not-held-no-live-parent`; pidfile di-rename → worker exit alasan yang sama, 2/2 run |
| AUTH-13 | Zombie liveness (AUTH-T11, BARU) | Setup zombie terverifikasi (state `Z` + `kill(pid,0)` SUCCEEDS); parent baru tetap READY, worker lama mati, worker baru hidup, 2/2 run |
| AUTH-14 | O_CLOEXEC default + F_SETFD (AUTH-C1) | Bun + Node `cloexecDefault=true`; Python round-trip `CLEARED=True SET_AGAIN=True BEFORE=True`, 2/2 run |
| AUTH-15 | flock di NFS (AUTH-T9c) | **NOT RUN di VM ini** (tidak ada NFS) — wajib di staging (FLK-07, U-30) |
| AUTH-16 | Startup v2.3.2 SU-T1..SU-T9 (regresi) | **TERJAWAB v2.3.6 di VM ini — 9/9 PASS × 4 run** (`SSRF_SPIKE_V236.md` §0.1 + §4; `spike-harness-v236/su-v232/`). Diagnosis awal revisi ini (8/9 × 3, SU-T5 FAIL `no-output`) adalah bug setup harness — `lock-racer.cjs` tidak ikut disalin — BUKAN regresi desain. Re-run di staging tetap wajib (STAGE-P05). |

#### D.4.14 Uji pidfd, jendela reuse, dan kontrol operasional (v2.3.6 — PIDFD-01..PIDFD-08, OPS-01..OPS-03)

Uji perilaku dari `SSRF_SPIKE_V236.md` (bukti: semua suite pidfd/ops
lolos pada pengulangan — Bun 1.4.4, Node v24.22.1, Python 3.12.3,
Linux 7.0.0-43-generic, proses/komponen lokal yang dikontrol sendiri).
Harness disalin ke `spike-harness-v236/` agar dapat dijalankan ulang.
Semua uji ini wajib diulang di staging produksi (STAGE-P01..P12)
sebelum cutover, karena runtime, filesystem, `/proc`, dan supervisor
produksi belum terbukti.

| Uji | Kasus | Kriteria lolos |
| --- | --- | --- |
| PIDFD-01 | Primitif pidfd (PIDFD-T1..T7) | 7/7 PASS: `pidfd_open` + `pidfd_send_signal(SIGKILL)` membunuh target; probe setelah mati ESRCH; reuse paksa → sinyal via pidfd lama ESRCH, decoy hidup; kontrol `kill(pid)` setelah reuse MEMBUNUH decoy (race nyata); zombie: pidfd buta (send mengembalikan 0); PID tidak ada ESRCH; flag tidak dikenal EINVAL |
| PIDFD-02 | pidfd via Bun `bun:ffi` (PIDFD-T8) | 2/2 PASS: `pidfd_open`/`pidfd_send_signal` via `bun:ffi` bekerja di Bun 1.4.4; probe setelah mati ESRCH |
| PIDFD-03 | Urutan referensi `signalWorkerByPidfd` (PIDFD-T11) | 5/5 PASS: signaled+confirmed; starttime salah / marker salah / target mati+reap / zombie → ditolak, TIDAK ADA sinyal ke proses lain |
| PIDFD-04 | Oracle urutan penuh di bawah reuse paksa (PIDFD-T12) | 4/4 PASS: reuse sebelum validasi → `identity-mismatch`; reuse di antara open dan re-validasi → `identity-changed`; pidfd lama setelah reuse dengan re-validasi dilewati → ESRCH, decoy hidup |
| PIDFD-05 | Pengukuran jendela + kuantifikasi (PIDFD-T9) | WINDOW-P99 ≈ 42–46 µs; P per cleanup ≈ 6–7e-9 (pid_max default) — angka dicatat per run; ambang STAGE-P08 diterapkan pada nilai staging |
| PIDFD-06 | Falsifikasi dirfd pinning (PIDFD-T10) | T10a PASS (stat via dirfd sebelum mati sama); **T10b FAIL adalah hasil yang diharapkan** — dirfd TIDAK mem-pin task (stat setelah mati+reap ESRCH, bahkan setelah reuse). Dirfd pinning DILARANG masuk desain |
| PIDFD-07 | Re-run SU-T1..SU-T9 (v2.3.2) | 9/9 PASS (lihat §D.4.13 AUTH-16) |
| PIDFD-08 | pidfd di staging (STAGE-P07) | Re-run PIDFD-01..PIDFD-07 pada runtime staging; bila pidfd tidak tersedia → fallback terkuantifikasi HANYA dengan persetujuan eksplisit owner |
| OPS-01 | Kontrol permission/ownership/mount/audit (OPS-T1..T6) | 6/6 PASS di VM: 0700 ditegakkan kernel; `chattr +i/+a` TIDAK tersedia di VM ini (dicatat, bukan diandalkan); ro-bind-mount menghentikan hapus tak sengaja, root dapat me-remount; root melewati DAC; auditd TIDAK ADA di VM ini; isolasi antar-user ditegakkan kernel |
| OPS-02 | Pemulihan penghapusan lock (OPS-T7) | PASS: dua pemilik dari penghapusan file → terdeteksi via pre-start scan → holder lama stand-down → satu pemilik, 0 cleanup |
| OPS-03 | Kontrol operasional di staging (STAGE-P12) | Direktori 0700 + user layanan + audit rule + bukti satu `unlink` uji tercatat; ro-bind-mount bila dipakai |

#### D.4.15 Matriks prasyarat staging (v2.3.6 — STAGE-P01..P12)

Daftar bukti yang WAJIB dikumpulkan SEBELUM implementasi dimulai
(gerbang G0/G1), bukan sebelum cutover. Setiap prasyarat memiliki
kriteria PASS/FAIL eksplisit dan konsekuensi FAIL yang dinyatakan
sebelumnya. **Tidak satu pun prasyarat ini dapat dipenuhi di VM ini
untuk runtime produksi** — semuanya wajib dikumpulkan di staging pada
runtime/filesystem/supervisor yang SAMA dengan produksi.

| ID | Prasyarat (bukti yang wajib dikumpulkan) | Kriteria PASS | Bila FAIL |
|---|---|---|---|
| STAGE-P01 | Runtime artifact + ketersediaan `bun:ffi` (versi Bun, `dlopen("libc.so.6")`, `flock`, `pidfd_open`, `pidfd_send_signal` di dalam sandbox artifact) | Semua simbol FFI terpanggil dan mengembalikan hasil yang benar (re-run FLK-06 + PIDFD-T8 di staging) | **BLOCK** — tidak ada implementasi flock/pidfd; kembali ke meja desain |
| STAGE-P02 | Filesystem direktori lock + semantik flock (re-run FLK-T1..T8 pada filesystem produksi; uji `chattr +i/+a` bila direncanakan) | FLK 9/9 PASS pada fs produksi; `chattr` dicatat tersedia/tidak | **BLOCK** bila flock gagal; bila hanya `chattr` yang gagal → lanjut TANPA mengandalkan `chattr` (catat sebagai tidak tersedia) |
| STAGE-P03 | Ketersediaan `/proc` + `pidAlive` zombie-aware (re-run AUTH-T11 di staging) | AUTH-T11 PASS (zombie dinilai mati, parent baru READY) | **BLOCK** — primitif liveness hilang; perlu keputusan desain alternatif |
| STAGE-P04 | Supervisor + process-group (dokumen + tes hidup SUP-01: bunuh parent → apakah group ikut mati; restart otomatis?) | Perilaku terdokumentasi DAN terbukti lewat tes hidup | **BLOCK** kecuali owner menerima residual U-22 secara tertulis (lapis self-exit + pidfile cleanup yang sudah terbukti + monitoring orphan) |
| STAGE-P05 | SU-T1..SU-T9 re-run di staging | 9/9 PASS pada runtime produksi | **BLOCK** — perbaiki kode, ulang dari gerbang G3 |
| STAGE-P06 | NFS — HANYA bila filesystem produksi memakai NFS (re-run FLK-07/AUTH-T9c pada mount NFS produksi) | Semantik flock terbukti pada mount NFS tersebut | **BLOCK** — pindahkan direktori lock ke filesystem lokal |
| STAGE-P07 | Pengujian pidfd bila mekanisme itu dipilih (re-run PIDFD-T1..T12 pada runtime staging) | Semua suite pidfd PASS | **Fallback terbukti** — pakai starttime re-read + `kill(pid)` dengan residual terkuantifikasi (§A.5.5.2a), HANYA dengan persetujuan eksplisit owner |
| STAGE-P08 | `pid_max` produksi + reuse-interval (baca nilai, hitung P per cleanup dengan metode PIDFD-T9) | P ≤ 1e-6 | P 1e-6–1e-5 → kondisional (persetujuan owner tertulis); P > 1e-5 → **BLOCK** |
| STAGE-P09 | DNS/pinning staging (G2/P0-1a': re-run spike runtime di staging) | Pinning + klasifikasi IP lolos pada runtime staging | **BLOCK** — kembali ke spike |
| STAGE-P10 | PostgreSQL lease LSE-06 (mekanisme `scan_leases` pada PostgreSQL staging) | LSE-06 PASS (tidak ada pelanggaran batas 5 di bawah konkurensi) | **BLOCK** — perbaiki mekanisme lease sebelum cutover |
| STAGE-P11 | NAT64/NSP (dokumen egress + tes S-49/S-50 dengan prefix produksi) | Dokumen egress menyatakan prefix (atau menyatakan tidak ada NAT64/DNS64) DAN tes staging lolos | **BLOCK** sampai dokumen + tes ada (U-11 tetap OPEN) |
| STAGE-P12 | Kontrol operasional lock (direktori 0700 + user layanan + audit rule `-w <lockdir> -p wa` atau eBPF + bukti satu `unlink` uji tercatat; ro-bind-mount bila dipakai) | Semua kontrol terverifikasi di staging; satu `unlink` uji tercatat di jejak audit | **BLOCK** sampai kontrol diperbaiki (kontrol ini murah diperbaiki — tidak ada alasan melanjutkan tanpa mereka) |


#### D.4.7 Uji matcher allowlist RDAP (v2.1 — RD-01..RD-20)

Unit test matcher ketat §A.1c — 20 kasus dari `SSRF_SPIKE_V21.md` TEST 4
(harus 20/20 lolos; matcher naif `includes()` terbukti salah 12/20 dan
TIDAK BOLEH dipakai): entri `.com` normal + prefix persis + query/fragment
diabaikan (ALLOW); host mirip (`rdap.verisign.com.evil.com`,
`rdapverisign.com`, `rdap.org.evil.com`), path-prefix palsu (`com-evil`,
`comv1`), userinfo, port 8443, path huruf besar, dot-segment, path
ter-encode `%63om`, skema `http`, host evil dengan string allowlist di
query (REJECT); port 443 eksplisit, skema/host huruf besar, trailing dot
FQDN (ALLOW); `rdap.org/domain/` (ALLOW). Setiap perubahan allowlist
atau matcher WAJIB mengulang ke-20 kasus ini.

### D.5 Rollback dan kriteria cutover — v2

**Mekanisme rollback (per langkah):**

| Langkah | Cara rollback | Pemicu rollback |
| --- | --- | --- |
| Mitigasi (a) | Matikan flag mitigasi (kembalikan scanning) — **hanya atas keputusan pemilik setelah SELURUH uji wajib lolos (§D.5 v2)** | — |
| Tiap langkah P0/P1 | Kembalikan artifact ke **versi build sebelumnya** (artifact memiliki riwayat versi; restore versi live sebelumnya). Karena perubahan bersifat inkremental per langkah, rollback dilakukan ke build terakhir yang lolos uji. | Uji regresi gagal, vonis 3 URL acuan berubah tingkat, atau error baru di staging |
| P0-4 (script off) | Nyalakan kembali flag script fetch (kode tidak dihapus) | Skor turun drastis dan pemilik memutuskan manfaat script lebih besar (keputusan eksplisit, bukan diam-diam) |

**Aturan rollback yang mengikat:**

1. Setiap langkah diimplementasikan sebagai **satu build terpisah** (bukan
   satu build raksasa P0 sekaligus) agar rollback dapat dilakukan per langkah.
2. Setiap build harus lolos uji §D.4 **sebelum** build berikutnya dimulai.
3. Bila suatu langkah gagal uji, langkah itu di-rollback — langkah sebelumnya
   yang sudah lolos **tidak** ikut di-rollback.
4. Tidak ada cutover ke produksi tanpa: (a) semua uji §D.4.2–§D.4.6 lolos,
   (b) evaluasi ChatGPT atas rancangan + hasil uji, (c) persetujuan eksplisit
   pemilik.

**Cutover (v2) — scanner tetap NONAKTIF di produksi selama perbaikan.**
Keputusan pemilik (7 Nov 2026): **tidak ada pembukaan kembali scanner hanya
karena P0 selesai** bila timeout global (P1-1) dan rate limit (P1-2) belum
siap. Cutover terjadi HANYA bila SELURUH kriteria di bawah lolos — termasuk
dua baris yang ditandai ★ (syarat yang ditambahkan v2). Bila satu saja
no-go, scanner TETAP nonaktif (mitigasi (a) tetap berjalan) dan perbaikan
dilanjutkan — tidak ada pembukaan parsial.

**Kriteria go / no-go cutover (v2):**

| Kriteria | Go bila | No-go bila | Penanda tangan |
| --- | --- | --- | --- |
| Regresi 3 URL acuan | Vonis sama (toleransi skor ±5, §D.4.2) | Vonis berubah tingkat | Pemilik + ChatGPT |
| Uji blokir S-01..S-50 | Semua ditolak sebelum fetch (server uji menerima 0 koneksi) | Satu saja lolos dan ter-fetch | Pemilik + ChatGPT |
| Uji legit L-01..L-08 | Semua lolos | Satu false positive tanpa penjelasan yang diterima pemilik | Pemilik |
| Uji sumber daya R-01..R-15 + RDAP RD-01..RD-20 + semaphore SEM-01..SEM-06 + lease LSE-01..LSE-06 | Semua dalam batas | Timeout/DoS masih mungkin | Pemilik + ChatGPT |
| ★ Timeout global 20 dtk (P1-1) | R-01 + R-08 lolos; tidak ada tahap yang melewati anggaran | Satu tahap melewati 20 dtk | Pemilik + ChatGPT |
| ★ Rate limit 10/menit + 100/jam (P1-2) | R-05 + R-09 + R-10 lolos; discovery P1-2a tercatat (sumber IP tepercaya terbukti) | Kuota bocor antar instance, atau IP dihitung dari header yang dapat dipalsukan | Pemilik + ChatGPT |
| ★ Uji ulang pinning di staging produksi (U-1) | Pendekatan 1 terbukti di staging artifact (atau fallback Pendekatan 2 terbukti) | Pinning tidak terbukti di staging produksi | Pemilik + ChatGPT |
| Evaluasi ChatGPT | Tidak ada keberatan P0 yang belum dijawab | Ada keberatan yang belum dijawab | ChatGPT |
| Data | Histori `checks` dan katalog 13 proyek utuh | Ada data hilang/berubah | Pemilik |

### D.6 Bukti mitigasi produksi G0 — evidence checklist (v2.2)

**Pernyataan yang memisahkan keputusan dari bukti — baca dulu:**
Keputusan mitigasi (a) — nonaktifkan scanning URL arbitrer sementara —
SUDAH disetujui pemilik (D-1). Tetapi persetujuan keputusan BUKAN
bukti bahwa mitigasi benar-benar aktif di produksi. **Bukti-bukti di
bawah ini BELUM ADA, karena mitigasi belum diaktifkan dan revisi ini
tidak mengubah produksi.** Bagian ini hanya menetapkan APA yang harus
dibuktikan di gerbang G0, BAGAIMANA membuktikannya, dan SIAPA yang
menandatanganinya — bukan mengklaim mitigasi sudah aktif. Gerbang G0
TIDAK lolos sampai seluruh butir bukti di bawah terkumpul dan
terverifikasi.

| # | Bukti yang harus dikumpulkan | Cara memverifikasi | Format pencatatan | Penanda tangan |
| --- | --- | --- | --- | --- |
| G0-E1 | **Flag mitigasi aktif di produksi** | Baca nilai flag dari konfigurasi produksi yang sedang berjalan (bukan dari kode sumber saja): tampilkan nama flag, lokasi penyimpanan (mis. variabel environment / tabel konfigurasi / berkas flag), nilai saat ini (`enabled`), dan waktu nilai itu terakhir diubah. Bila flag disimpan di lebih dari satu tempat, verifikasi KEDUANYA konsisten | Entri log: `flag=<nama>, value=enabled, source=<lokasi>, read_at=<ISO-8601>, read_by=<nama>` | Pemilik |
| G0-E2 | **Request URL arbitrer ditolak SEBELUM koneksi keluar** | Dari produksi (atau staging yang mereplikasi produksi): kirim 3 request URL arbitrer — satu URL publik legit (`https://example.com/`), satu URL privat (`http://127.0.0.1/`), satu URL metadata (`http://169.254.169.254/`) — dan catat untuk masing-masing: respons yang diterima (harus penolakan generik §A.6, tanpa `http_status`/`final_url`/`page_title`), DAN bukti dari log server bahwa TIDAK ADA koneksi keluar yang dilakukan untuk ketiga URL itu (log fetch/egress menunjukkan 0 koneksi; atau log penolakan guard dengan kategori yang sesuai). URL publik legit pun harus ditolak selama mitigasi (a) — itu memang tujuannya | Entri per URL: `url_hash=<SHA-256>, response=<penolakan generik>, outbound_connections=0, log_ref=<id>` | Pemilik + ChatGPT |
| G0-E3 | **Tidak ada jalur cron yang melewati mitigasi** | Daftar SEMUA pemanggil `checkLink` di kode dan konfigurasi (pencarian kode + daftar cron yang terdaftar): (1) UI Cek Link (pengguna), (2) cron auto-add 2 jam, (3) Gibran/`askGibran` bila memakai `checkLink`, (4) jalur lain bila ada. Untuk SETIAP pemanggil, buktikan ia melewati gate mitigasi yang sama — yaitu dengan menunjukkan bahwa tidak ada parameter, flag, token, atau jalur kode yang mem-bypass gate (pencarian kode untuk kata kunci bypass/skip/direct, + uji: jalankan cron auto-add selama mitigasi aktif dan catat bahwa kandidat ditandai "belum terverifikasi link" dan TIDAK auto-add, bukan lolos diam-diam) | Daftar pemanggil + hasil pencarian kode (`grep` untuk bypass) + log satu siklus cron selama mitigasi | Pemilik + ChatGPT |
| G0-E4 | **Katalog, dashboard, histori, dan Gibran tetap berfungsi** | Uji tiap fitur di produksi selama mitigasi aktif: (a) katalog menampilkan 13 proyek; (b) dashboard/bookmark/status task dapat dibaca dan diubah; (c) histori cek menampilkan entri lama (tidak ada baris baru dari scanner yang nonaktif); (d) Gibran menjawab pertanyaan tentang katalog (tanpa memanggil scanner). Catat hasil tiap uji (lolos/gagal) | Checklist per fitur: `fitur, uji, hasil, waktu` | Pemilik |
| G0-E5 | **Timestamp aktivasi dan identitas build yang diuji** | Catat: waktu aktivasi flag (ISO-8601, zona waktu), identitas build yang sedang berjalan saat pengujian (versi/slug/hash build), dan identitas orang yang mengaktifkan. Bila flag diaktifkan ulang setelah rollback, catat setiap aktivasi sebagai entri terpisah — jangan menimpa entri lama | Entri: `activated_at=<ISO-8601>, build=<id/versi>, activated_by=<nama>` | Pemilik |

**Aturan yang mengikat untuk G0:**

1. Bila SATU SAJA butir G0-E1..G0-E5 tidak dapat dibuktikan, gerbang G0
   TIDAK lolos — perbaikan tidak lanjut ke G1, dan scanner tetap
   dianggap BELUM termitigasi.
2. Bukti G0-E2 harus menunjukkan penolakan SEBELUM koneksi keluar,
   bukan sesudah fetch gagal — log egress 0 koneksi adalah buktinya;
   respons penolakan saja TIDAK cukup (fetch yang gagal setelah
   koneksi tetap menghitung sebagai koneksi keluar).
3. Bila ditemukan jalur cron/bypass yang melewati mitigasi (G0-E3),
   itu adalah temuan P0 tersendiri: hentikan, tutup jalurnya, dan uji
   ulang G0 dari awal.
4. Bukti G0 disimpan bersama laporan uji gerbang lainnya (§H.2) dan
   dievaluasi ChatGPT di gerbang G7.

---

### D.4.16 Rekonsiliasi bukti v2.3.7 — evaluasi ChatGPT terhadap bukti v2.3.6 (BARU)

Evaluasi ChatGPT atas v2.3.6 (`SSRF_EVALUATION_V235.md`, commit `39ea4ef`,
280 baris) ditulis **tanpa mereferensikan bukti v2.3.6** (`SSRF_SPIKE_V236.md`,
commit `fc798ce`): nama file evaluasi (V235) tidak cocok dengan judul
isinya (v2.3.6), §6.1 menyatakan SU-T1..SU-T9 NOT RUN, dan §7 mencatat
eksperimen pidfd NOT RUN — padahal semuanya sudah dijalankan dan PASS di
v2.3.6. Revisi ini memperbaikinya dengan pemetaan yang dapat dilacak, BUKAN
dengan mengulang pengujian. Dokumen lengkap: `SSRF_RECONCILIATION_V237.md`.
Ringkasan:

**Matriks ST-01..ST-12 (evaluasi) — status bukti VM:** TERBUKTI (VM) **1**
(ST-08 — SU-T1..SU-T9, lihat bawah) · SEBAGIAN **7** (ST-02, ST-03, ST-04,
ST-05, ST-06, ST-10, ST-11 — mekanisme terbukti di VM, pengulangan di
staging tetap wajib) · BELUM **4** (ST-01 runtime artifact, ST-07
supervisor, ST-09 NFS, ST-12 observabilitas — tidak ada bukti sama sekali,
wajib staging). **Nol gate diklaim lolos staging.**

**SU-T1..SU-T9 — koreksi status NOT RUN:** kesembilan tes TERBUKTI di VM.
Riwayat: v2.3.2 9/9 × 3 run (`SSRF_SPIKE_V232.md` §1–§2; RUN=3 di
`SSRF_SPIKE_V233.md` §0), v2.3.3 regresi terhadap kode yang diperkeras 9/9
× 2 (`SSRF_SPIKE_V233.md`), v2.3.6 re-run 9/9 × 4 (`SSRF_SPIKE_V236.md`
§0.1; `spike-harness-v236/su-run1.log` s.d. `su-run4.log`) — total 9
eksekusi penuh suite, semuanya 9/9 PASS. **[KOREKSI v2.3.8 — caveat
bukti: hitungan 4 run adalah menurut `SSRF_SPIKE_V236.md` §0.1; bukti
mentah yang tersimpan hanya 3 log lengkap + 1 ekor 2 baris (`su-run4`,
194 byte) — lihat `evidence/v236/MANIFEST.md`. Status yang benar:
"reported PASS in VM documentation" dengan 3 log lengkap.]**
Satu-satunya kegagalan yang pernah tercatat adalah bug setup harness SU-T5
pada run pertama v2.3.6 **[KOREKSI v2.3.8 — penjelasan v2.3.7 di sini
SALAH: teks asli menyebut "(`lock-racer.cjs` memakai fd lock lalu
`process.exit()` tanpa `flock.unlock()`)". Yang benar, sesuai
`SSRF_SPIKE_V236.md` §0.1 dan kode committed: salinan harness v2.3.6
awalnya tidak menyertakan `lock-racer.cjs`, sehingga child mati
module-not-found tanpa stdout → `no-output`; `startup.cjs` memakai
`fs.openSync(lockPath, 'wx')` dan `lock-racer.cjs` memanggil
`fs.closeSync` — tidak ada flock di jalur SU-T5. Koreksi lengkap di
`SSRF_RECONCILIATION_V237.md` (catatan koreksi v2.3.8) dan
`SSRF_RESPONSE_MATRIX_V238.md` §2.8]**, terdiagnosis dan diperbaiki
sebelum 4 run bersih.
Perubahan status ini memenuhi syarat evaluasi §6.1 (referensi bukti yang
dapat dilacak + konfirmasi reviewer — dokumen rekonsiliasi ini; re-review
ChatGPT pada G7). Pengulangan SU-T1..SU-T9 di staging tetap wajib
(STAGE-P05 / ST-08 aspek staging).

**Penomoran kanonik ke depan: ST-01..ST-16.** ST-01..ST-12 memakai nomor
evaluasi; ST-13..ST-16 adalah keempat prasyarat v2.3.6 tanpa padanan
evaluasi (ex-STAGE-P08 pid_max, ex-P09 DNS/pinning, ex-P10 lease
PostgreSQL, ex-P11 NAT64/NSP). Pemetaan lengkap STAGE-P01..P12 ↔ ST-01..ST-16
ada di §3 `SSRF_RECONCILIATION_V237.md`; STAGE-P01..P12 dipertahankan
sebagai alias historis. Dua perbedaan yang tersisa dicatat, bukan
diratakan: (1) evaluasi memakai ST-08 untuk SU-T1..SU-T9, v2.3.6 memakai
AUTH-16 (§D.4.13) — keduanya merujuk suite yang sama, kanonik: ST-08;
(2) divergensi fallback — evaluasi §2.2 melarang fallback ke numeric
`kill(pid)`, v2.3.6 STAGE-P07 mengizinkannya hanya dengan persetujuan
eksplisit owner dan BUKAN sebagai default — dicatat sebagai risiko baru
U-46 yang membutuhkan keputusan owner.

**Risiko evaluasi → v2.3.6:** U-38-A DIJAWAB (residual U-41); U-38-B,
U-38-D, U-33-A, U-33-B, U-33-E SEBAGIAN (residual U-41/U-43/U-44);
U-38-C, U-33-C, U-33-D, U-33-F tetap TERBUKA (wajib staging). Risiko baru:
U-45 (latensi deteksi) dan U-46 (divergensi fallback). Kesenjangan desain
dari evaluasi §3.2 (pencarian teks di desain v2.3.6: nol kemunculan
"0600", "NOFOLLOW", "symlink"): DG-1 mode file lock 0600, DG-2 open
`O_NOFOLLOW` + validasi `fstat`, DG-3 penolakan symlink/non-regular —
untuk diputuskan pada revisi desain berikutnya, bukan diklaim sudah ada.

**Daftar kekurangan yang benar-benar tersisa:** 20 butir (§5
`SSRF_RECONCILIATION_V237.md`) — 15 staging, 1 desain (DG-1..DG-3), 1
keputusan owner (U-46), 1 pengujian tertunda (AUTH-T9c), 1 gerbang
produksi (G0), 1 latensi deteksi (U-45, bersama ST-12). Tidak satu pun
butir di sana adalah pengulangan pekerjaan v2.3.6.

### D.4.17 Matriks respons v2.3.8 atas audit kode V1 + V2 (BARU)

Dua audit independen ChatGPT atas kode sumber mirror (V1 commit
`52724d6`, 2026-11-07 23:52 WIB; V2 commit `789797e`, 2026-11-07 23:56
WIB — hanya 4 menit berselang; observasi V2 "belum ada respons Muse"
benar secara repo pada saat itu) dijawab oleh
`SSRF_RESPONSE_MATRIX_V238.md` (dokumen ini hanya ringkasannya; matriks
adalah rujukan kanonik). **Pemisahan tiga tahap mengikat seluruh bagian
ini:** (a) desain — diizinkan; (b) implementasi — butuh persetujuan
eksplisit terpisah pemilik, TIDAK diberikan saat ini; (c) deployment —
butuh persetujuan + prosedur tersendiri. Perubahan mirror GitHub TIDAK
berarti situs live berubah.

| ID | Status v2.3.8 | Ringkasan |
| --- | --- | --- |
| F-001 Critical SSRF | **blocked** | Desain remediasi + harness H-SSRF-01..20 selesai (§D.4.18). Implementasi menunggu otorisasi tahap (b). Link Scanner tetap nonaktif. |
| F-002 High cap setelah buffering | **blocked** | Desain streamed cap + decompressed cap selesai (§D.4.18). Implementasi menunggu otorisasi. |
| F-003 High tanpa total deadline | **blocked** | Desain total deadline + cancellation budget selesai (§D.4.18). Implementasi menunggu otorisasi. |
| F-004 Medium duplicate race | **blocked** | Desain unique constraint + harness konkurensi selesai (§D.4.18). Implementasi (termasuk migrasi DB) menunggu otorisasi. |
| F-005 Medium otorisasi addProject | **blocked** | Trust boundary didokumentasikan NOT VERIFIED dari mirror; desain otorisasi + provenance selesai (§D.4.18). Mekanisme otorisasi butuh keputusan pemilik + fakta runtime. |
| F-006 Medium DATA-PLAN.md | **addressed** | Mirror `site/DATA-PLAN.md` di-redact; rescan mirror: nol temuan kecuali komentar kode `site/server/src/actions.ts:51` (follow-up tahap b) dan copy generik di `App.tsx`/`GIBRAN_SITE_KNOWLEDGE` (follow-up terpisah). DATA-PLAN.md di live artifact MASIH berisi narasi asli — follow-up terpisah via artifact workflow, bukan edit langsung. |
| F-007 Medium log mentah tidak ada | **partially addressed** | Bundle `evidence/v236/` diterbitkan: 21 file `.txt` byte-identik dari `spike-harness-v236/*.log` (verifikasi `cmp` 21/21 OK) + `MANIFEST.md` (test ID, run, timestamp UTC, harness commit `fc798ce`, host `htch-runtime`, kernel, Bun 1.4.4, Node v24.22.1, SHA-256). Caveat material: `su-run4` hanya ekor 2 baris (3 log lengkap + 1 ekor); run gagal awal SU-T5 (8/9 × 3) dan run ketiga OPS-T7 TIDAK TERSIMPAN (NOT PRESERVED, tidak dapat dipulihkan); perintah shell + exit status per run NOT VERIFIED. Status SU-T1..SU-T9 yang benar: "reported PASS in VM documentation" dengan 3 log lengkap. |
| F-008 Medium penjelasan SU-T5 | **addressed** | Koreksi transparan di `SSRF_RECONCILIATION_V237.md` + §D.4.16 di atas (teks salah ditandai, bukan dihapus diam-diam). Verifikasi kode committed: `openSync 'wx'` di `startup.cjs`, `fs.closeSync` di `lock-racer.cjs`, blob SHA identik v2.3.2/v2.3.6 (`8c7a33ac88c3514f7841245eb45c5a1639b0fbc0`). |
| F-009 Medium reproduksibilitas | **partially addressed** | `site/bun.lock` di-mirror (SHA-256 `a7e1457ee5cb6423d6e2a08c4058fd63c1c05f5a17b01f5bd8d1aebe1d89405f`, byte-identik dengan live artifact); manifest `SSRF_REPRODUCIBILITY_V238.md`. Tetap NOT VERIFIED: provenance tarball SDK (path builder-local `/opt/hatch/...`, tidak dapat diambil independen); tidak ada test suite site; tidak ada CI; tidak ada hasil typecheck/build. Bun site 1.3.10 vs spike 1.4.4 dicatat apa adanya. |

**Yang TIDAK diklaim v2.3.8:** tidak ada implementasi kode; tidak ada
tes harness baru yang dijalankan; tidak ada perubahan perilaku aplikasi
live, database/katalog, atau production build. Sampai commit v2.3.8
masuk `main`, tidak ada kemajuan teknis yang dapat diverifikasi dari
repo.

### D.4.18 Desain remediasi F-001..F-005 — SPESIFIKASI, BUKAN IMPLEMENTASI (BARU)

Bagian ini adalah **desain tahap (a)**. Setiap butir memberi: file,
fungsi, line range pada mirror commit `c68c727`, perilaku yang diubah,
spesifikasi harness, dan kriteria penerimaan. **Tidak satu butir pun di
bawah ini diterapkan di v2.3.8.** Implementasi menunggu persetujuan
eksplisit pemilik (tahap b). Harness lengkap dengan tabel kasus uji ada
di `SSRF_RESPONSE_MATRIX_V238.md` §2; bagian ini memuat spesifikasi
perubahan + ringkasan harness + kriteria penerimaan agar desain dapat
dibaca sendiri.

**F-001a — Resolve + validasi semua jawaban A/AAAA (awal + tiap hop).**
File: `site/server/src/actions.ts`, `normalizeUrl()` (baris 69–89) dan
`fetchText()` (baris 101–125) + pemanggil `analyze()` (baris 236+).
Perilaku baru: setiap hostname di-resolve ke SEMUA jawaban A dan AAAA
(termasuk jawaban dari CNAME — ikuti rantai sampai jawaban akhir);
setiap jawaban divalidasi SEBELUM koneksi; bila SATU jawaban terlarang,
seluruh set jawaban DITOLAK (kebijakan tolak-set — paling ketat, paling
mudah diverifikasi). Validasi memakai klasifikasi alamat yang sama
untuk A dan AAAA (butir F-001b). DNS dilakukan lewat resolver yang
hasilnya dapat di-pin (lihat F-001c); tidak ada caching jawaban antar
hop.

**F-001b — Tolak non-global-unicast (IPv4 dan IPv6).** Rentang yang
ditolak: loopback (`127.0.0.0/8`, `::1`), RFC1918 (`10/8`,
`172.16/12`, `192.168/16`), link-local (`169.254/16`, `fe80::/10`),
metadata cloud (`169.254.169.254` sudah tercakup link-local — tetap
disebut eksplisit di daftar uji), unique-local (`fc00::/7`), alamat
tidak ditentukan (`0.0.0.0`, `::`), CGNAT (`100.64.0.0/10` — sudah
diputuskan D-1 s.d. D-8: blokir default), IPv4-mapped IPv6
(`::ffff:0:0/96` — ekstrak IPv4 tertanam lalu klasifikasikan sebagai
IPv4), IPv4-compatible/translasi lain yang menanamkan IPv4 (termasuk
prefix NAT64 yang diketahui — lihat U-11; prefix NSP yang tidak dikenal
tetap risiko terbuka), dan alamat zone-scoped (`fe80::1%eth0`,
`::1%lo` — zone ID TIDAK membuat alamat aman; tolak bila alamat
dasarnya terlarang, dan jangan pernah strip zone lalu memakai
alamatnya). Parsing host WAJIB kanonik sebelum klasifikasi: bentuk
desimal/oktal/heksadesimal (`2130706433`, `0177.0.0.1`, `0x7f.0.0.1`),
bentuk pendek (`127.1`), dan userinfo (`http://publik@127.0.0.1/`)
harus diparse ke host sebenarnya dulu — host yang gagal diparse secara
kanonik DITOLAK (fail-closed), bukan di-fetch sebagai hostname.

**F-001c — Pin destination ke koneksi.** Alamat yang lolos validasi
di-pin ke koneksi aktual (pendekatan yang sudah TERBUKTI di VM:
Pendekatan 1 via Node `https` Agent `lookup` — `SSRF_SPIKE_RUNTIME.md`;
fallback Pendekatan 2 via `Bun.fetch` + `tls.serverName` + header
`Host`). Pinning berarti: resolve ulang di antara validasi dan connect
TIDAK BOLEH mengubah destination (menutup DNS rebinding); sertifikat
TLS diverifikasi terhadap hostname, bukan terhadap IP pin. Bila runtime
produksi tidak mendukung pinning (U-1/STAGE-P01), implementasi
DIBLOKIR dan kembali ke meja desain (§A.2a).

**F-001d — Validasi ulang tiap hop redirect.** `fetchText()` saat ini
mengikuti redirect manual (maks 6 hop + initial = 7 request) tanpa
kebijakan IP. Perilaku baru: SETIAP hop redirect diperlakukan seperti
URL awal yang baru — resolve + validasi + pinning penuh (butir
F-001a..F-001c) sebelum fetch hop itu; hop yang melanggar menghentikan
rantai (tidak ada koneksi ke hop itu); batas hop tetap 6; redirect ke
scheme selain http/https DITOLAK; redirect dengan userinfo/internal
divalidasi sebagai host sebenarnya. Koreksi dokumen: klaim
`site/DATA-PLAN.md` "up to 3 same-origin script files" SALAH terhadap
kode (kode tidak memberlakukan same-origin) — klaim itu diperbaiki
menjadi perilaku baru butir F-001e saat implementasi.

**F-001e — Script same-origin saja.** Fetch script saat ini
(~baris 373–386) mengambil sampai 3 URL script dari HTML yang
dikontrol penyerang tanpa pembatasan origin. Perilaku baru: script
HANYA di-fetch bila URL-nya same-origin dengan halaman yang sedang
diperiksa (scheme + host + port sama); script lintas origin TIDAK
di-fetch; script yang URL-nya resolve ke alamat terlarang DITOLAK
dengan validasi yang sama seperti F-001a..F-001c (termasuk redirect
pada fetch script). Jumlah script tetap maks 3.

**Harness F-001 — H-SSRF-01..20 (spesifikasi ringkas; tabel lengkap di
matriks §2.1).** Semua kasus memakai server uji lokal saja (listener
`127.0.0.1` sebagai target "internal", stub DNS terkontrol) — TIDAK
PERNAH layanan metadata nyata atau infrastruktur produksi. Aturan ukur:
"zero connections" dibuktikan listener lokal + log egress; verdict
checker harus tolak; tidak ada byte internal yang sampai ke output.
Kasus: H-SSRF-01 privat IPv4; -02 loopback IPv4; -03 link-local/metadata;
-04 RFC1918; -05 loopback IPv6; -06 link-local IPv6; -07 unique-local
IPv6; -08 IPv4-mapped IPv6 (3 varian); -09 zone-scoped; -10 redirect
berantai multi-hop ke internal (2 varian akhir); -11 DNS rebinding;
-12 jawaban DNS campuran (tolak set); -13 script src ke internal;
-14 script lintas origin; -15 redirect loop/hop berlebih; -16
rebinding via redirect; -17 CNAME ke internal; -18 bentuk IP
non-kanonik; -19 userinfo menutupi host; -20 redirect ke URL
userinfo/internal. **Kriteria penerimaan F-001:** H-SSRF-01..20 SEMUA
PASS pada implementasi tahap (b), dijalankan di staging (bukan hanya
VM), dengan log mentah + manifest seperti `evidence/v236/`. Satu kasus
FAIL = F-001 tetap OPEN. **Peringatan yang mengikat:** harness yang
lulus TIDAK membuktikan implementasi aman bila tidak menguji jalur
eksploitasi nyata di atas — daftar ini adalah syarat minimum, bukan
daftar opsional.

**F-002a — Streamed byte cap (compressed).** File: `fetchText()`
(baris 101–125). Perilaku baru: body dibaca via stream (bukan
`await res.text()` lalu slice); stream dibatalkan (abort) segera saat
byte terkompresi yang diterima melewati cap; cap dinyatakan sebagai
konstanta + didokumentasikan (nilai cap diputuskan saat implementasi
dengan merujuk kebutuhan checker — bukan di sini).
**F-002b — Decompressed cap.** Dekompresi (gzip/deflate/brotli bila
didukung) dihitung terhadap byte HASIL dekompresi; stream dibatalkan
saat hasil dekompresi melewati cap terpisah — menutup gzip bomb.
**F-002c — Cap per request dan total.** Cap berlaku per request DAN
total per pemeriksaan (page + semua redirect + semua script) — satu
rantai tidak boleh mengakali cap dengan memecah body ke banyak hop.
**Harness F-002 — H-RES-01..03:** H-RES-01 body 50 MB → koneksi
dibatalkan sebelum 50 MB ter-buffer, memori proses di bawah anggaran
yang dinyatakan; H-RES-02 gzip bomb (rasio > 100×) → dibatalkan pada
decompressed cap; H-RES-03 body tepat di bawah cap → lolos utuh.
**Kriteria penerimaan F-002:** byte yang di-buffer tidak pernah
melebihi cap + overhead stream yang dinyatakan, pada ketiga kasus, di
staging.

**F-003a — Satu total deadline.** File: `analyze()` (baris 236+) +
`fetchText()`. Perilaku baru: satu anggaran waktu per pemeriksaan yang
mencakup RDAP + page + semua redirect + semua script; timeout 12 detik
per-fetch yang sekarang ada menjadi batas per-fetch DI DALAM anggaran
total (bukan penggantinya). Nilai anggaran total diputuskan saat
implementasi dengan merujuk keputusan D-1 s.d. D-8 (timeout global
target awal 20 detik) — anggaran total TIDAK BOLEH melebihi timeout
global yang diputuskan.
**F-003b — Cancellation budget.** Satu sinyal batal dibagikan ke semua
fetch dalam pemeriksaan; saat anggaran habis, semua fetch yang berjalan
dibatalkan (bukan hanya yang terakhir); hasil parsial dibuang.
**F-003c — Concurrency/rate bounds.** Batas pemeriksaan bersamaan
yang dinyatakan (merujuk lease global maks 5 — §A.5.6 — dan semaphore
DNS); kelebihan DITOLAK fail-closed (429/503), bukan antre tanpa batas;
rate limit per IP yang sudah diputuskan (10/menit, 100/jam) tetap
berlaku.
**Harness F-003 — H-RES-04..06:** H-RES-04 slow drip (1 byte/10
detik) → pemeriksaan berakhir pada total deadline; H-RES-05 rantai 7
fetch lambat → total waktu ≤ deadline + toleransi yang dinyatakan;
H-RES-06 20 pemeriksaan bersamaan → tidak melebihi batas konkurensi,
kelebihan ditolak fail-closed. **Kriteria penerimaan F-003:** waktu
total dan jumlah fetch bersamaan selalu dalam anggaran yang dinyatakan,
di staging.

**F-004a — Unique constraint DB.** File: `site/server/src/schema.ts`
(tabel `projects`) + migrasi drizzle baru. Perilaku baru: unique
constraint pada nama ternormalisasi DAN pada alamat kontrak
ternormalisasi. Normalisasi: trim, lowercase; untuk alamat kontrak,
perbandingan tanpa prefix `0x` — nilai tersimpan tetap bentuk kanonik
(hex asli). Dua constraint terpisah (bukan satu composite): duplikat
nama DITOLAK walau alamat berbeda; duplikat alamat DITOLAK walau nama
berbeda.
**F-004b — Insert atomik.** File: `addProject()` (~baris 987–1046).
Perilaku baru: hapus pola baca-semua-lalu-insert; insert atomik dengan
penanganan konflik DB (satu baris menang, yang lain menerima respons
konflik — bukan duplikat, bukan error 500 yang tidak tertangani).
**F-004c — Migrasi.** Migrasi drizzle baru yang menambahkan kedua
constraint; migrasi TIDAK menghapus data katalog yang ada (data 14
proyek tetap utuh); bila katalog yang ada sudah mengandung duplikat
menurut normalisasi baru, migrasi GAGAL dengan laporan — duplikat
diselesaikan manual dulu, bukan dihapus diam-diam oleh migrasi.
**Harness F-004 — H-CAT-01..03:** H-CAT-01 10 request duplikat
bersamaan (nama sama) → tepat 1 baris; H-CAT-02 alamat sama dengan
perbedaan case/spasi → tepat 1 baris; H-CAT-03 dua nama berbeda, alamat
sama → tepat 1 baris (konflik alamat). **Kriteria penerimaan F-004:**
hitung baris di DB setelah tiap run cocok dengan yang dinyatakan, di
staging.

**F-005a — Trust boundary (didokumentasikan apa adanya).** Dari mirror
saja, TIDAK DAPAT DIVERIFIKASI apakah ada lapisan otorisasi di luar
`actions.ts` (mis. di runtime artifact atau di pemanggil cron) —
status: **NOT VERIFIED**, bukan "tidak ada". Fakta yang terverifikasi:
tidak ada pemeriksaan otorisasi di `actions.ts` (grep `auth|authorize|
role`: nol, kecuali "registrar" RDAP dan peran Gibran); `checkLink`
(~baris 1204–1210) adalah `defineAction` biasa tanpa wrapper auth.
**F-005b — Otorisasi addProject.** Perilaku baru: `addProject` hanya
boleh dipanggil dari jalur terotorisasi yang didokumentasikan;
panggilan tanpa otorisasi DITOLAK dan di-log. Mekanisme otorisasi eksak
(sesi admin / token layanan / daftar pemanggil) adalah keputusan desain
yang butuh pemilik + fakta runtime artifact — v2.3.8 TIDAK mengarang
mekanisme yang tidak dapat diverifikasi; keputusan dicatat sebagai
butir keputusan pemilik (§7 matriks).
**F-005c — Provenance.** Setiap penambahan katalog mencatat: sumber
resmi (URL), yang mengajukan, yang memverifikasi, tanggal. Penambahan
tanpa provenance DITOLAK.
**F-005d — checkLink.** `checkLink` tetap dapat dipanggil publik untuk
pemeriksaan (itu fungsinya), tetapi TIDAK BOLEH menjadi jalur mutasi
katalog — pemisahan ini dinyatakan eksplisit di dokumentasi aksi.
**Harness F-005 — H-AUTH-01..03:** H-AUTH-01 panggilan tanpa otorisasi
→ ditolak + tercatat; H-AUTH-02 panggilan terotorisasi → diterima +
provenance lengkap; H-AUTH-03 panggilan terotorisasi tanpa provenance →
ditolak. **Kriteria penerimaan F-005:** keputusan otorisasi cocok
dengan kebijakan yang didokumentasikan pada tiap kasus, di staging.

**DG-1 — Mode file lock 0600 (persyaratan desain, v2.3.8).** File lock
dibuat dengan mode `0600` (owner read/write saja), direktori lock
`0700`; mode diverifikasi saat startup — gagal → NOT_READY. Kriteria
tes: `stat` mode file `0600`; proses UID lain tidak dapat
membaca/menulis file. (§G U-47.)
**DG-2 — Open O_NOFOLLOW + validasi fstat (persyaratan desain,
v2.3.8).** Pembukaan file lock memakai `O_NOFOLLOW` (atau padanan
Bun/Node); setelah open, `fstat` memvalidasi fd adalah file regular
milik UID layanan dengan (dev,ino) yang dicatat; mismatch → tolak +
page. Kriteria tes: symlink di path lock → open gagal ELOOP; file
diganti antara open dan fstat → terdeteksi. (§G U-48.)
**DG-3 — Penolakan symlink/non-regular (persyaratan desain, v2.3.8).**
Path lock yang berupa symlink, FIFO, socket, atau direktori DITOLAK
saat startup (bukan diikuti). Kriteria tes: tiap jenis non-regular di
path lock → startup NOT_READY dengan alasan tercatat. (§G U-49.)

### D.4.19 Inventaris staging template — tahap 3, tanpa menjalankan tes (BARU)

Lingkungan staging produksi **belum ada** — itu blocker yang sudah
diketahui (U-42). Bagian ini adalah TEMPLATE inventaris yang wajib
diisi sebelum SATU PUN tes staging dijalankan (menjawab V2 §8 butir 8).
Tidak ada tes yang dijalankan di v2.3.8. Tiap gate ST-01..ST-16
mendapat: owner, precondition, prosedur aman, aturan PASS/FAIL, dan
destinasi bukti. Template diisi dengan nilai nyata saat staging
tersedia; sampai saat itu, semua kolom bernilai "BELUM ADA".

| Gate | Inventaris yang wajib dicatat | Owner | Precondition | Prosedur aman | PASS / FAIL | Destinasi bukti |
| --- | --- | --- | --- | --- | --- | --- |
| ST-01 | Digest artifact staging; runtime + versi (Bun/Node) + konfigurasi sandbox; kernel | BELUM ADA — owner: pemilik proyek | Staging artifact ter-deploy dari commit yang dicatat; runtime sama dengan produksi | Jalankan probe read-only (FLK-06 + PIDFD-T8) di dalam sandbox staging; tidak ada akses ke endpoint internal produksi | PASS: `bun:ffi` → `flock` + `pidfd_open`/`pidfd_send_signal` bekerja; FAIL: satu pun primitif tidak tersedia → implementasi DIBLOKIR | Log probe + manifest (format `evidence/v236/`) di repo |
| ST-02 | Filesystem direktori lock: jenis, `df`/`mount`, ACL | BELUM ADA | Direktori lock di filesystem lokal (bukan NFS) | Uji FLK-T1..T8 di staging pada filesystem produksi; catat `df`/`mount` | PASS: flock saling mengecualikan + lepas saat close; FAIL: sebaliknya → DIBLOKIR | Log FLK + output `df`/`mount` |
| ST-03 | Topologi egress: firewall/security group/VPC/egress proxy; apakah NAT64/DNS64 dipakai + prefix NSP | BELUM ADA | Dokumen egress dari penyedia runtime | Minta dokumen tertulis; jalankan DNS64 uji dengan prefix NSP yang diketahui (uji S-49/S-50) | PASS: prefix terdokumentasi + uji lolos, atau pernyataan tertulis tidak ada NAT64/DNS64; FAIL: tidak ada dokumen → U-11 tetap TERBUKA | Dokumen egress + log S-49/S-50 |
| ST-04 | Identitas supervisor: nama, restart otomatis (ya/tidak), kill process group (ya/tidak), apakah mount lock dapat diganti saat deploy | BELUM ADA | Dokumentasi supervisor + deployment | Uji SUP-01: matikan parent, amati restart + kill process group | PASS: restart otomatis + process group terbunuh; FAIL: sebaliknya → U-22/U-36 tetap TERBUKA | Log SUP-01 + dokumen supervisor |
| ST-05 | Suite SU-T1..SU-T9 di staging | BELUM ADA | ST-01..ST-04 PASS | Jalankan ulang SU-T1..SU-T9 di staging (bukan pengulangan bukti VM) | PASS: 9/9; FAIL: satu pun gagal | Log mentah + manifest |
| ST-06 | Suite AUTH (otoritas flock, mixed-version, zombie) di staging | BELUM ADA | ST-01..ST-02 PASS | Jalankan ulang AUTH-T1..T11 + AUTH-C1 di staging; AUTH-T9c bila NFS terlibat | PASS: 18/18; FAIL: satu pun gagal | Log mentah + manifest |
| ST-07 | Supervisor + parent crash di staging | BELUM ADA | ST-04 PASS | Uji PARENT-T1a/T1b: crash parent, amati pemulihan state + pidfile cleanup | PASS: satu pemilik setelah crash; FAIL: dua pemilik / state hilang | Log PARENT + pidfile |
| ST-08 | SU-T1..SU-T9 + pidfd di staging (aspek staging dari ST-08) | BELUM ADA | ST-05 PASS | Lihat ST-05 + PIDFD-T1..T12 di staging | PASS: 9/9 + pidfd terikat identitas; FAIL: sebaliknya | Log mentah + manifest |
| ST-09 | NFS (bila direktori lock di NFS — default: DILARANG) | BELUM ADA | Keputusan: lock di filesystem lokal | Bila NFS tetap dipakai: uji FLK-07 + AUTH-T9c di NFS staging | PASS: flock benar di NFS + AUTH-T9c lolos; FAIL: sebaliknya → pindah ke filesystem lokal | Log FLK-07/AUTH-T9c |
| ST-10 | Observabilitas: log + metrik + alert (forceReleased, orphaned, workerExitUnconfirmed) | BELUM ADA | Pipeline log staging aktif | Picu tiap kondisi sekali; verifikasi alert sampai ke operator | PASS: tiap alert sampai < batas latensi yang dinyatakan (U-45); FAIL: alert tidak sampai | Log alert + bukti pengiriman |
| ST-11 | DNS/semaphore/orphaned/breaker di staging | BELUM ADA | ST-01 PASS | Jalankan ulang SEM-T1..T6, ORPH-T1..T5 di staging | PASS: semua dalam batas; FAIL: sebaliknya | Log mentah + manifest |
| ST-12 | Observabilitas + audit trail (auditd/eBPF untuk unlink lock) | BELUM ADA | ST-10 PASS | Verifikasi rule audit `-w <lockdir> -p wa` atau eBPF aktif; hapus file lock uji, verifikasi jejak | PASS: jejak tercatat + alert; FAIL: tidak ada jejak → U-43 tidak terdeteksi | Jejak audit + log |
| ST-13 | pid_max produksi + hitung P tabrakan starttime (U-41) | BELUM ADA | Baca pid_max produksi (HANYA baca — tidak diubah) | Hitung P per cleanup; bandingkan ambang | PASS ≤ 1e-6; kondisional ≤ 1e-5 (persetujuan owner tertulis); BLOCK > 1e-5 | Nilai pid_max + perhitungan |
| ST-14 | DNS/pinning di staging (DNS64, jawaban campuran, rebinding) | BELUM ADA | ST-03 PASS | Jalankan H-SSRF-10..12, H-SSRF-16..17 di staging (dari §D.4.18) | PASS: semua; FAIL: satu pun gagal → F-001 tetap OPEN | Log harness + manifest |
| ST-15 | Lease PostgreSQL staging (atomicity + beban) | BELUM ADA | Detail PostgreSQL staging: host, versi, skema `scan_leases` | Uji LSE-01..LSE-06 + R-15 (ratusan acquire bersamaan) | PASS: atomicity + latensi p95 dalam batas; FAIL: sebaliknya | Log LSE/R-15 + detail DB |
| ST-16 | NAT64/NSP staging (lanjutan ST-03) | BELUM ADA | ST-03 PASS | Uji S-49/S-50 dengan prefix NSP produksi | PASS: guard mengekstrak IPv4 tertanam dengan benar; FAIL: sebaliknya → U-11 tetap TERBUKA | Log S-49/S-50 |

**Operator alert yang akuntabel:** BELUM ADA — wajib dinamai (nama +
saluran + jam jaga) sebelum tes staging pertama; sampai saat itu,
ST-10/ST-12 tidak dapat PASS. **Egress policy staging:** BELUM ADA —
wajib didokumentasikan (daftar egress yang diizinkan + yang diblokir)
sebelum H-SSRF dijalankan di staging. **Detail PostgreSQL staging:**
BELUM ADA — host, versi, kredensial akses baca (bukan password di
dokumen), dan skema `scan_leases` wajib dicatat saat ST-15 disiapkan.

#### D.4.19a Kepemilikan gate staging — pelengkapan v2.3.10 (F-013)

Audit V3 (F-013) menemukan §D.4.19 di atas mencantumkan `BELUM ADA`
sebagai owner untuk ST-02..ST-16 tanpa menamai peran yang akuntabel.
Subbagian ini melengkapinya. Peran yang dipakai adalah peran yang nyata
ada di proyek ini — **Rama** (pemilik proyek), **Muse** (design author),
**ChatGPT** (independent reviewer). Peran yang memang belum ada ditulis
**UNASSIGNED/BLOCKED** secara eksplisit — tidak ada nama yang dikarang.
Prosedur dan kriteria PASS/FAIL per gate mengikuti tabel §D.4.19 di atas
(tidak diulang di sini kecuali bila berubah); kolom di bawah menambahkan
owner akuntabel + next action + status gate.

**Aturan yang mengikat:** tidak ada gate yang boleh masuk READY tanpa
owner + prasyarat + kriteria PASS/FAIL + destinasi bukti. Semua gate
berstatus **BLOCKED** sampai lingkungan staging tersedia dan peran
UNASSIGNED terisi. Tidak ada tes staging yang dijalankan di v2.3.10.

| Gate | Accountable owner / peran | Next action | Status |
| --- | --- | --- | --- |
| ST-01 | Muse (desain + eksekusi probe) / Staging operator: **UNASSIGNED** | Rama menamai staging operator + menyediakan staging artifact dari commit tercatat; Muse menjalankan probe FLK-06 + PIDFD-T8 | BLOCKED — staging + operator belum ada |
| ST-02 | Muse (harness FLK) / Staging operator: **UNASSIGNED** | Operator mencatat jenis filesystem + `df`/`mount` direktori lock staging; Muse menjalankan FLK-T1..T8 di filesystem itu | BLOCKED |
| ST-03 | Rama (meminta dokumen egress dari penyedia runtime) / Muse (uji S-49/S-50) | Rama meminta dokumen egress tertulis (firewall/security group/VPC/egress proxy, NAT64/DNS64 + prefix NSP); tanpa dokumen ini U-11 tetap TERBUKA | BLOCKED — egress policy **UNASSIGNED** |
| ST-04 | Rama (dokumentasi supervisor/deployment) / Staging operator: **UNASSIGNED** | Rama/operator mendokumentasikan identitas supervisor (restart otomatis, kill process group, mount lock saat deploy); Muse menguji SUP-01 | BLOCKED |
| ST-05 | Muse (eksekusi SU di staging) / ChatGPT (review independen hasil) | Tunggu ST-01..ST-04 PASS; jalankan ulang SU-T1..SU-T9 di staging (bukan pengulangan bukti VM) | BLOCKED |
| ST-06 | Muse (eksekusi AUTH di staging) / ChatGPT (review independen hasil) | Tunggu ST-01..ST-02 PASS; jalankan AUTH-T1..T11 + AUTH-C1 di staging | BLOCKED |
| ST-07 | Muse (eksekusi PARENT di staging) / Staging operator: **UNASSIGNED** | Tunggu ST-04 PASS; uji crash parent + pemulihan state/pidfile | BLOCKED |
| ST-08 | Muse (eksekusi SU+pidfd di staging) / ChatGPT (review independen hasil) | Tunggu ST-05 PASS; jalankan SU + PIDFD-T1..T12 di staging | BLOCKED |
| ST-09 | Muse (keputusan + uji bila NFS dipakai) / Rama (keputusan: lock di filesystem lokal) | Rama memutuskan lock di filesystem lokal (default: DILARANG di NFS); bila NFS tetap dipakai, uji FLK-07 + AUTH-T9c | BLOCKED |
| ST-10 | Staging operator: **UNASSIGNED** (pemilik alert) / Muse (spesifikasi metrik/alert) | Rama menamai operator + kanal alert (nama + saluran + jam jaga); operator memverifikasi tiap alert sampai ke kanal | BLOCKED — kanal alert **UNASSIGNED** |
| ST-11 | Muse (eksekusi SEM/ORPH di staging) / ChatGPT (review independen hasil) | Tunggu ST-01 PASS; jalankan SEM-T1..T6, ORPH-T1..T5 di staging | BLOCKED |
| ST-12 | Staging operator: **UNASSIGNED** (pemilik jejak audit) / Muse (spesifikasi rule audit) | Operator mengaktifkan rule audit `-w <lockdir> -p wa` atau eBPF di staging; verifikasi jejak + alert saat file lock uji dihapus | BLOCKED — operator + kanal alert **UNASSIGNED** |
| ST-13 | Muse (perhitungan P tabrakan starttime) / Rama (konteks pid_max produksi) | Baca pid_max produksi (hanya baca); hitung P per cleanup; bandingkan ambang (PASS ≤ 1e-6, kondisional ≤ 1e-5 dengan persetujuan tertulis, BLOCK > 1e-5) | BLOCKED |
| ST-14 | Muse (eksekusi H-SSRF di staging) / ChatGPT (review independen hasil) | Tunggu ST-03 PASS; jalankan H-SSRF-10..12, 16..17 di staging | BLOCKED |
| ST-15 | Staging operator: **UNASSIGNED** (pemilik PostgreSQL staging) / Muse (harness LSE/R-15) | Rama/operator menyediakan detail PostgreSQL staging (host, versi, skema `scan_leases`); Muse menguji LSE-01..LSE-06 + R-15 | BLOCKED — staging DB+runtime **UNASSIGNED** |
| ST-16 | Muse (uji S-49/S-50) / Rama (dokumen egress, lihat ST-03) | Tunggu ST-03 PASS; uji dengan prefix NSP produksi | BLOCKED — egress policy **UNASSIGNED** |

**Daftar UNASSIGNED/BLOCKED (v2.3.10 — tidak ada yang dikarang):**

- Staging operator (nama + tanggung jawab eksekusi tes staging): UNASSIGNED.
- Kanal alert operator (nama + saluran + jam jaga): UNASSIGNED — ST-10/ST-12 tidak dapat PASS.
- Egress policy staging (daftar egress diizinkan/diblokir + dokumen penyedia runtime): UNASSIGNED — ST-03/ST-16 tidak dapat PASS; U-11 tetap TERBUKA.
- Staging DB + runtime (host/versi PostgreSQL, skema `scan_leases`, runtime + versi staging): UNASSIGNED — ST-15 (dan ST-01 sebagai prasyarat runtime) tidak dapat PASS.
- Lingkungan staging itu sendiri: BELUM ADA (U-42).

Destinasi bukti tiap gate mengikuti tabel §D.4.19 (log mentah + manifest
format `evidence/v236/` di repo). Bukti VM bukan bukti staging; bukti
staging bukan bukti produksi.

### D.4.20 Penyempitan celah bukti v2.3.9 — suplemen F-007, verifikasi F-005, verifikasi F-009 (BARU)

Revisi ini mempersempit celah bukti TANPA otorisasi implementasi, atas
perintah pemilik proyek (8 November 2026; public tester DITAHAN). Tidak
ada kode aplikasi yang diubah, tidak ada perubahan database/katalog,
tidak ada production build, Link Scanner tetap nonaktif. F-001..F-005
TETAP blocked. Detail lengkap: `SSRF_RESPONSE_MATRIX_V238.md`
(diperbarui ke v2.3.9) dan `evidence/v236-supplement-20261108/MANIFEST.md`.

**F-007 — bundle suplemen (menutup caveat 1 dan 3 v2.3.8).**
`evidence/v236-supplement-20261108/` — 5 file `.txt` + `MANIFEST.md`
(test ID, nomor run, timestamp UTC, harness commit `fc798ce`, host
`htch-runtime`, kernel Linux 7.0.0-43-generic x86_64, Node v24.22.1,
Bun 1.4.4, command, exit status, SHA-256):

| Test ID | Run | Timestamp UTC | Command | Exit | Hasil |
| --- | --- | --- | --- | --- | --- |
| SU-T1..SU-T9 | supp-1 | 2026-11-07T17:29:40Z | `node su-v232/run-tests.cjs 1` | 0 | 9/9 PASS (11 baris lengkap) |
| SU-T1..SU-T9 | supp-2 | 2026-11-07T17:29:49Z | `node su-v232/run-tests.cjs 2` | 0 | 9/9 PASS (11 baris lengkap) |
| SU-T1..SU-T9 | supp-3 | 2026-11-07T17:29:57Z | `node su-v232/run-tests.cjs 3` | 0 | 9/9 PASS (11 baris lengkap) |
| SU-T1..SU-T9 | supp-4 | 2026-11-07T17:30:06Z | `node su-v232/run-tests.cjs 4` | 0 | 9/9 PASS (11 baris lengkap) |
| OPS-T7 | supp-3 | 2026-11-07T17:30:15Z | `node ops-recovery.cjs` | 0 | PASS (5 baris lengkap) |

Verifikasi silang: `su-supp-run1.txt` byte-identik dengan
`evidence/v236/su-run1.txt` (`diff` exit 0); `ops-t7-supp-run3.txt`
berbeda dari `opsrec-run1.txt` hanya pada nomor inode/PID. Bundle ini
BUKAN pengganti `evidence/v236/` (file lama TIDAK diubah) dan BUKAN
rekonstruksi log lama — klaim v2.3.6 tetap bersandar pada bukti lama.
Justifikasi re-run: log run ke-4 SU yang tersimpan hanya ekor 2 baris
dan log run ketiga OPS-T7 tidak ada — celah bukti nyata, sesuai
pengecualian yang dicatat matriks v2.3.8. Tetap NOT PRESERVED: run
gagal awal SU-T5, log mentah v2.3.2–v2.3.5, perintah shell eksak tiap
run v2.3.6 asli.

**F-005 — verifikasi dari kode (read-only, mirror sinkron `c68c727`).**
Auth di dalam kode TERBUKTI TIDAK ADA (`site/server/src/actions.ts`:
grep auth/token/session/ADMIN — nol mekanisme; handler baris 1342
tidak memeriksa identitas pemanggil). Tidak ada pemanggil `addProject`
di `client/src/` maupun file server lain — hanya `actions.ts`
(internal baris 959 + `defineAction` baris 1321–1342); pemanggil yang
dimaksud menurut deskripsi action adalah "scheduled auto-discovery job".
Provenance disimpan verbatim dari argumen caller (`verified_at` /
`verified_note`, baris 1062–1063); schema tidak punya kolom provenance
(`schema.ts` baris 48–49; hanya `created_at` baris 21). Scoping
endpoint runtime artifact tetap NOT VERIFIED dari mirror. Desain
otorisasi + provenance (§D.4.18 butir F-005b..F-005d) tidak berubah;
mekanisme otorisasi tetap butuh keputusan pemilik + fakta runtime.

**F-009 — verifikasi reproduksibilitas (salinan scratch, bukan live).**
SDK tarball TERBUKTI ADA: `@hatch/space-sdk` 0.14.0, 2.051.070 byte,
SHA-256 `f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`
— provenance tetap NOT VERIFIED (builder-local, mtime 1 Jan 1980).
`bun install --frozen-lockfile` di `/tmp/scratch-site` (salinan
`site/`): exit 0, 79 paket, `bun.lock` TIDAK berubah (SHA-256
`a7e1457e…` sebelum dan sesudah — sama dengan catatan v2.3.8).
Typecheck client+server di salinan scratch: exit 0 dan exit 0
(Bun 1.4.4, TS 5.6.3). Build penuh TIDAK dicoba (house rules —
build/ship hanya via artifact tools); konsistensi di bawah Bun 1.3.10
yang dideklarasikan tetap NOT VERIFIED; tidak ada test suite site;
tidak ada CI.

**F-006 residual (presisi v2.3.9).** Narasi insiden di string kode
mirror: `site/server/src/actions.ts` baris 1089
(`GIBRAN_SITE_KNOWLEDGE`) dan komentar baris 51 (`KNOWN_BAD_DOMAINS`).
Keduanya copy/kode live — perbaikannya follow-up tahap (b), bukan
edit diam-diam di mirror. Status F-006 tetap ADDRESSED.

### D.4.21 Jawaban atas audit independen V3 — F-010..F-015 (BARU, v2.3.10)

Revisi ini menjawab `SSRF_INDEPENDENT_AUDIT_V3.md` (commit `b42b02a`,
2026-11-08 01:21 WIB) satu per satu. Detail lengkap + response matrix:
`SSRF_RESPONSE_MATRIX_V2310.md`. Ringkasan di sini:

**F-010 — akuntansi bukti SU asli.** Diverifikasi sendiri dengan
`sha256sum` (2026-11-08 ~01:49 WIB): `su-run1/2/3.txt` byte-identik
(SHA-256 `a8bbf1bb…`, 904 B, header/ringkasan RUN=1) dan `su-run4.txt`
hanya ekor 2 baris. `evidence/v236/MANIFEST.md` terkoreksi: su-run2/3 =
DUPLIKAT / NOT PRESERVED sebagai log independen; su-run4 = SEBAGIAN;
file TIDAK dihapus (alasan tercatat di manifest). Klaim v2.3.6 asli
("9/9 × 4") TIDAK DAPAT diverifikasi dari repo — status benar:
"reported PASS in VM documentation" dengan 1 log lengkap. Klaim asli
dipisahkan dari 4 run suplemen v2.3.9 (VM evidence, tanggal terpisah).
Temuan sejenis baru: `ops-run1/2.txt` juga byte-identik tanpa
diskriminator run (NOT-INDEPENDENT). Checker baru
`scripts/verify-evidence-manifest.mjs` memverifikasi SHA-256, ukuran,
header run, nomor run ringkasan, dan keunikan hash; output di-commit:
`evidence/v236/VERIFY-20261108.txt` (exit 1 — 11 failure yang
diharapkan untuk bundle asli) dan
`evidence/v236-supplement-20261108/VERIFY-20261108.txt` (exit 0).

**F-011 — matriks fitur tester.** Proposal
`docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md` terkoreksi: shape statis
dinyatakan **visual preview, bukan functional tester**; catalog
browsing, Gibran Q&A, dan `listChecks` dipindah ke Disabled pada shape
statis; §2.5 baru berisi client/API request map ketujuh action
(`listProjects`/`listChecks`/`setProjectState`/`checkLink`/`deleteCheck`
/`askGibran`/`addProject` → POST `./actions`, tidak satu pun bekerja
tanpa backend) + spesifikasi no-backend smoke test. Fixture/API terpisah
TIDAK diimplementasikan. Tester tetap ON HOLD (Rama, 2026-11-08 00:28 WIB).

**F-006 dipecah (F-012).** F-006a (redaksi dokumen mirror) — addressed.
F-006b (narasi di string kode `actions.ts:51` dan
`GIBRAN_SITE_KNOWLEDGE` ~1089) — OPEN/blocked; perbaikan butuh edit
source live tahap (b) + otorisasi owner; proposal cleanup di matriks
v2.3.10 §4. F-006c (DATA-PLAN live) — redaksi live SUDAH dilakukan dan
diverifikasi 2026-11-08 ~00:59 WIB (nol kecocokan di artifact v13),
dicatat sebagai "reported by Muse, not independently verified" karena
audit V3 ditulis sebelum/sambil verifikasi itu.

**F-013 — kepemilikan staging.** §D.4.19a melengkapi ST-01..ST-16
dengan owner/peran akuntabel (Rama / Muse / ChatGPT), next action,
prasyarat, prosedur, PASS/FAIL, destinasi bukti. Staging operator,
kanal alert, egress policy, staging DB+runtime: **UNASSIGNED/BLOCKED**.
Tidak ada gate READY; staging tetap belum ada; tidak ada tes staging
yang dijalankan.

**F-009/F-014 — rekonsiliasi reproduksibilitas.** Run repro baru
dijalankan sendiri di scratch copy `/tmp/scratch-site-v239` (bukan repo,
bukan live), 2026-11-07T18:49:04Z, Bun 1.4.4, Node v24.22.1:
`bun install --frozen-lockfile` exit 0 (79 paket, `bun.lock` tidak
berubah) + typecheck client+server exit 0; output mentah di-commit
(`evidence/v239-repro/repro-run1.txt` + `MANIFEST.md`);
`SSRF_REPRODUCIBILITY_V238.md` direkonsiliasi. Tetap NOT VERIFIED:
provenance SDK `@hatch/space-sdk` (tarball builder-local, tidak ada di
repo), Bun 1.4.4 vs deklarasi 1.3.10, build penuh (TIDAK dicoba), CI.
Status: **NOT REPRODUCIBLE untuk clean external builder**.

**F-015 — koreksi DATA-PLAN.** Mirror `site/DATA-PLAN.md` terkoreksi:
perilaku aktual fetch script (sampai 3 URL, di-resolve terhadap final
URL, tanpa pembatasan same-origin — `actions.ts` ~373–386) dideskripsikan
apa adanya; same-origin dinyatakan kontrol masa depan yang belum
diimplementasikan. Teks koreksi live artifact disiapkan di
`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md` (belum diterapkan —
butuh approved artifact workflow).

**U-46 — pemetaan dependensi presisi (bukan blanket).** U-46 tetap
TERBUKA (keputusan owner belum ada) dan hanya memblokir
**worker-signaling fallback path** (§A.5.5.2a / STAGE-P07 — fallback
numeric `kill(pid)` bila pidfd tidak tersedia). U-46 TIDAK memblokir:
remediasi fetch guard F-001 (H-SSRF-01..20 tidak memakai signaling),
F-002/F-003/F-004, F-005, public tester (tester tidak menjalankan
worker-signaling), atau pekerjaan desain tahap (a). Setiap klaim
"U-46 memblokir X" wajib menyebut rantai dependensi; klaim blanket
tanpa rantai adalah kesalahan. Peta lengkap: matriks v2.3.10 §3.

**Hard gates — ditegaskan kembali (v2.3.10):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah.
F-001..F-005 tetap OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..20
terhadap implementasi aktual di staging terisolasi + log mentah +
review independen — hasil VM saja tidak cukup.

### D.4.22 Jawaban atas audit independen V4 — F-016..F-020 (BARU, v2.3.11)

Revisi ini menjawab `SSRF_INDEPENDENT_AUDIT_V4.md` (commit `ce21b39`,
2026-11-08 ~02:45 WIB) satu per satu. Detail lengkap + response matrix:
`SSRF_RESPONSE_MATRIX_V2311.md`. Ringkasan di sini:

**F-016 — keputusan freshness cache (Medium, design gap, false-negative).**
Fakta kode diverifikasi dari mirror commit `d85a1e2`
(`site/server/src/actions.ts` baris 111–168, dibaca 2026-11-08):
`FETCH_CACHE` adalah `Map` module-scope, key = URL saja, TTL 10 menit,
maks 50 entri; `fetchText()` mengembalikan cached value sebelum fetch
baru; kegagalan fetch disimpan sebagai `null` selama TTL yang sama
(baris ~176: `cacheSet(FETCH_CACHE, url, null, ...)` setelah 2
percobaan gagal). Cache RDAP terpisah: hanya sukses yang di-cache, TTL
1 jam, maks 100. Cache bersifat per-instance proses (tiap instance
punya cache sendiri) — tidak ada konsistensi lintas instance. Klaim
`site/DATA-PLAN.md` baris 26 ("Re-checking the same link from history
runs a fresh scan and saves a new row") TIDAK dipenuhi perilaku cache
ini.

Keputusan DESAIN v2.3.11 — **rekomendasi utama: HAPUS cache fetch
untuk jalur security scan** (`checkLink`/`fetchText` pada pemeriksaan
keamanan). Alasan teknis: (1) vonis keamanan harus mencerminkan konten
pada saat scan — jendela basi 10 menit adalah jendela false-negative
untuk halaman yang dikontrol penyerang (benign → malicious dalam TTL);
(2) mengunci kegagalan sebagai `null` selama 10 menit mengubah
gangguan jaringan sementara menjadi vonis "tidak terjangkau" yang
menempel; (3) keuntungan performa (menghindari fetch ulang URL yang
sama dalam 10 menit) tidak sebanding dengan risiko false-negative pada
vonis keamanan; (4) janji DATA-PLAN tentang fresh scan pada re-check
sudah berkomitmen ke perilaku fresh. **Alternatif bila owner tetap
menginginkan cache untuk alasan performa** (bukan rekomendasi):
(a) HANYA hasil sukses yang di-cache — kegagalan TIDAK PERNAH
di-cache; (b) TTL eksplisit + setiap baris `checks` menyimpan
`fetchedAt`, flag `cacheHit`, dan umur data, ditampilkan di UI;
(c) re-check dari history WAJIB melewati cache (jalur fresh) dan
menyimpan baris baru; (d) tersedia jalur "force fresh" eksplisit;
(e) key cache memperhitungkan cap (F-017). Cache RDAP dipertahankan
apa adanya (sukses saja) dengan catatan freshness yang sama — RDAP
(umur domain/registrar) berubah lambat dan tidak memengaruhi sinyal
konten; bila RDAP gagal, pemeriksaan tetap berjalan dengan sinyal
"umur domain tidak diketahui" (perilaku lama). Keputusan ini adalah
DESAIN — implementasi menunggu otorisasi tahap (b) + HOLD F-020.

Spesifikasi regresi (DESAIN tes staging — TIDAK dijalankan di v2.3.11,
tidak ada staging, tidak ada implementasi): **H-CACHE-01**
benign→malicious dalam TTL — URL yang sama memberi respons benign
lalu malicious dalam 10 menit; request kedua HARUS melihat konten
baru (vonis kedua = malicious). **H-CACHE-02** failure→recovery —
fetch pertama gagal (server mati), server pulih dalam TTL, request
kedua HARUS berhasil (bukan `null` terkunci). **H-CACHE-03**
tidak ada penguncian null — retry segera setelah pemulihan HARUS
berhasil; tidak ada hasil `null` yang bertahan melewati satu retry
pasca-pemulihan. **H-CACHE-04** freshness terlihat + bypass re-check —
setiap baris `checks` membawa `fetchedAt` + `cacheHit` + umur;
re-check dari history memakai jalur fresh dan menyimpan baris baru
dengan `fetchedAt` baru. Kriteria penerimaan F-016: H-CACHE-01..04
SEMUA PASS di staging, pada implementasi tahap (b). Satu kasus FAIL =
F-016 tetap OPEN.

**F-017 — cache key mengabaikan cap (Medium, confirmed correctness
defect).** Fakta kode diverifikasi dari mirror commit `d85a1e2`:
halaman utama `fetchText(input.toString(), 400_000, deadline)` (baris
396); script `fetchText(abs, 300_000, deadline)` (baris 524);
`fetchTextOnce` melakukan `(await res.text()).slice(0, cap)` — hasil
yang disimpan di cache SUDAH terpotong ke cap pemanggil pertama.
Key cache hanya URL. Skenario: URL yang sama lebih dulu di-cache
sebagai script (300 KB) lalu diminta sebagai halaman (400 KB) →
halaman menerima 300 KB; sinyal berbahaya setelah byte ke-300.000
tidak dianalisis. Arah sebaliknya: script menerima hasil lebih panjang
dari cap yang diminta.

Keputusan DESAIN v2.3.11 — **key cache WAJIB menyertakan cap**
(`url + "|" + cap`). Alternatif "simpan representasi mentah lalu
potong per caller" DITOLAK sebagai utama: menyimpan representasi
mentah tanpa batas mengembalikan buffering tak terbatas dan
bertentangan langsung dengan streamed cap F-002. Keputusan ini TIDAK
menggantikan streaming byte limit F-002 — cap-aware key hanya
memperbaiki kebenaran hasil cache, bukan cara body dibaca.

Spesifikasi regresi (DESAIN tes staging): **H-CACHE-05** urutan
300 KB → 400 KB — cache URL dengan cap 300.000 lalu minta URL yang
sama dengan cap 400.000; hasil kedua TIDAK BOLEH terpotong oleh hasil
pertama (konten setelah 300 KB hadir). **H-CACHE-06** urutan
400 KB → 300 KB — cache URL dengan cap 400.000 lalu minta dengan cap
300.000; hasil kedua HARUS menghormati cap 300.000 (tidak melebihi
kebijakan cap caller). Kriteria penerimaan F-017: H-CACHE-05/06 PASS
di staging, pada implementasi tahap (b). H-CACHE-05/06 masuk gerbang
G6 bersama H-CACHE-01..04.

**F-018 — isolasi data antar-pengguna / tenancy ctx.db (High bila DB
shared; exploitability NOT VERIFIED).** Bukti SDK read-only
(2026-11-08 ~02:50 WIB): tarball `@hatch/space-sdk` 0.14.0
(2.051.070 byte, SHA-256 `f2cb7b25…`, mtime 1 Jan 1980) diekstrak ke
`/tmp/sdk-inspect` (BUKAN ke repo, tidak di-commit) dan dibaca
`package/dist/server-contract.d.ts` + `package/dist/index.d.ts` +
`package/README.md`. Temuan: (1) `PortableCtx` membawa
`db: SpaceDbAccessor` — accessor DB per-invocation — dan `viewer?:
Viewer` opsional; (2) `LocalViewer` = `{ source: "local",
authenticated: true, spaceSlug, userId, ownerUserId, isOwner,
delegate?: "agent" | "schedule" }`; `CloudflareViewer` = `{ source:
"cloudflare", authenticated: true, shareId, spaceSlug, spaceId?,
isOwner, tokenId, tokenExpiresAt }`; (3) **TIDAK ADA pernyataan di
`.d.ts` maupun README SDK tentang apakah DB di balik accessor itu
per-user atau per-artifact/shared** — grep `tenant|per-user|multi-user|
isolated|principal|owner|auth` pada README dan `index.d.ts`
mengembalikan nol untuk semantik tenancy (satu-satunya hit relevan
adalah definisi `Viewer` itu sendiri); (4) `invalidateQueries`
didokumentasikan sebagai "Signal every open client for this Space" —
isyarat (bukan bukti) bahwa model data ber-scope space.

Fakta skema/handler diverifikasi dari mirror commit `d85a1e2`:
`site/server/src/schema.ts` — tabel `checks` TIDAK punya kolom
owner/principal; `savedProjects` memakai `projectId` sebagai primary
key tanpa identitas pengguna; `projects` tanpa kolom owner.
`site/server/src/actions.ts` — `listChecks` membaca seluruh baris
tanpa filter owner; `deleteCheck` menghapus berdasarkan `id` saja;
`askGibran` membaca 10 pemeriksaan terakhir tanpa filter; dan
`actions.ts` **TIDAK PERNAH merujuk `ctx.viewer`** (grep `viewer`:
nol). Konsekuensi kondisional: BILA `ctx.db` adalah database bersama
per artifact, maka riwayat pemeriksaan dapat terbaca/dihapus lintas
pengguna dan bookmark/status proyek menjadi state bersama — semata
dari konstruksi kode di atas. Exploitability tetap **NOT VERIFIED**
karena semantik tenancy runtime belum dinyatakan oleh dokumentasi
atau source SDK yang tersedia. V4 §4.4 benar: ini belum dapat
dinyatakan confirmed vulnerability; dan komentar skema saja bukan
bukti aman.

Keputusan DESAIN v2.3.11 — **bila DB shared (diputuskan setelah bukti
tenancy):** (a) tambah kolom `ownerUserId` (dari `ctx.viewer`
local: `ownerUserId`/`userId`; cloudflare: `shareId` + `tokenId`
sebagai identitas pemanggil) pada `checks` dan `savedProjects`;
(b) SETIAP baca (`listChecks`, `askGibran`) difilter oleh principal
pemanggil; (c) hapus/ubah (`deleteCheck`, `setProjectState`) WAJIB
mencocokkan kepemilikan — mismatch DITOLAK + di-log; (d) `askGibran`
HANYA memasukkan riwayat pemanggil ke prompt; (e) migrasi wajib
mem-partisi baris yang ada (pemilik saat ini = owner artifact) dan
TIDAK menghapus riwayat — bila riwayat yang ada tidak dapat
diatribusikan ke satu principal, migrasi GAGAL dengan laporan (pola
yang sama dengan F-004c). **Bila DB terbukti per-user:** tidak ada
perubahan skema; yang wajib tetap ada adalah tes dua principal
H-TEN-01..05 di staging sebagai bukti, bukan asumsi. Keputusan
tenancy adalah keputusan owner + fakta runtime (bukan Muse saja);
desain di atas disiapkan untuk kedua cabang agar tidak ada pekerjaan
ulang.

Spesifikasi regresi (DESAIN tes staging): **H-TEN-01** dua principal
terpisah membuat riwayat berbeda; principal A TIDAK dapat me-list
riwayat principal B. **H-TEN-02** A TIDAK dapat menghapus check milik
B berdasarkan id (ditolak + tercatat). **H-TEN-03** `askGibran`
sebagai A TIDAK PERNAH memasukkan riwayat B ke konteks/jawaban.
**H-TEN-04** bookmark/task status per-principal; perubahan A tidak
mengubah state B. **H-TEN-05** pemanggil tanpa identitas (bila runtime
mengizinkan jalur anonim) TIDAK mendapat data lintas principal; bila
runtime TIDAK punya jalur anonim, fakta itu dicatat sebagai bagian
dari scoping. Kriteria penerimaan F-018: bukti tenancy SDK/runtime
yang menyatakan scope DB + H-TEN-01..05 PASS di staging. Sampai itu
ada, F-018 tetap OPEN dan public tester TIDAK BOLEH memuat data
pengguna.

**F-019 — status Link Scanner nonaktif tanpa bukti kontrol runtime
(High; dapat menjadi Critical bila scanner masih dapat dipanggil
publik).** Bukti read-only yang dikumpulkan 2026-11-08 ~02:47–02:50
WIB (oleh parent agent, diverifikasi ulang oleh revisi ini):
(1) `artifact.list_actions` slug `cek-link-airdrop` — action
`checklink` **MASIH TERDAFTAR** sebagai published action, deskripsi:
"Live-checks a pasted airdrop/claim link: fetches the page, scans it
for wallet-connect requests, signing code, contract addresses, bait
language and obfuscation, looks up the domain age via RDAP, saves the
result to history, and returns the verdict with per-signal evidence."
Action lain yang terdaftar: `addproject`, `askgibran`,
`deletecheck`, `listchecks`, `listprojects`, `setprojectstate`.
(2) `artifact.status` slug `cek-link-airdrop` — tidak ada build
berjalan; `share.shared=false`, `share.url=null`. (3) Mirror source:
`site/server/src/actions.ts` mengekspor `checkLink` tanpa feature
flag atau disabled guard; `site/client/src/App.tsx` merender bagian
checker dan menghubungkan `onCheck` ke `checkMut.mutate`; root
`README.md` menggambarkan Link Scanner sebagai fitur live,
sedangkan dokumen desain menyatakan harus nonaktif — kontradiksi
ini TIDAK terselesaikan oleh bukti runtime.

Status jujur v2.3.11: **NOT VERIFIED / BLOCKED**. `checkLink` TIDAK
di-invoke selama pengumpulan bukti ini (memanggilnya adalah tes
produksi — dilarang). `share.shared=false` membatasi eksposur publik
(artifact tidak punya public link) tetapi TIDAK membuktikan endpoint
action nonaktif untuk jalur owner/agent. Tidak ada versi/digest
artifact yang terekspos oleh tool read-only yang tersedia
(`list_actions`/`status` tidak mengembalikannya), sehingga klaim
"versi live X tidak menjalankan scanner" tidak dapat dibuat.

Kontrol runtime yang DIBUTUHKAN untuk menutup F-019 (daftar
penerimaan, belum satu pun terpenuhi): (a) versi/digest artifact live
yang dapat dikutip; (b) bukti read-only bahwa endpoint action
`checkLink` tidak dapat dipanggil publik (mis. action tidak ada di
dispatch table runtime, atau ditolak di gerbang sebelum handler);
(c) bukti bahwa UI checker tidak dapat memanggil `checkLink`
(feature gate / UI dinonaktifkan pada build live); (d) kontrol yang
mencegah pemanggilan publik (bukan sekadar "tidak ada link publik");
(e) log egress yang menunjukkan nol fetch keluar dari `checkLink`
pada periode pengamatan. Sampai (a)–(e) tersedia, status deployment
tetap **BLOCKED** dan owner harus menerima laporan ini melalui repo.
`artifact.inspect` TIDAK dipakai untuk F-019: inspect adalah
delegasi diagnosis atas laporan malfungsi pengguna (butuh
`verbatim_request` laporan pengguna) — bukan pembaca state read-only;
tool read-only yang tersedia tidak mengekspos versi/digest.

**F-020 — klarifikasi scope commit d85a1e2 (Medium, process/scope
control).** Fakta diverifikasi via `git show d85a1e2 --stat`
(2026-11-08): commit `d85a1e2` (2026-11-07 19:17 UTC = 2026-11-08
02:17 WIB) mengubah TEPAT 3 file: `docs/AUDIT_FIX_LIST_V1.md`
(+346/−0), `site/client/src/App.tsx` (+103/−37), dan
`site/server/src/actions.ts` (+224/−59) — total 673 insertions,
96 deletions. Commit message menyatakan
repo-only, live untouched, F-001..F-005 tetap terbuka. Dokumen
`docs/AUDIT_FIX_LIST_V1.md` menyatakan batas cakupannya sendiri:
"HANYA soal performa + refactoring. Bukan remediasi keamanan.
F-001..F-005 TETAP TERBUKA / BLOCKED … Perubahan di sini repo-only
(mirror `site/` di repo ini). Situs live (`cek-link-airdrop`) TIDAK
berubah oleh commit ini — live hanya berubah lewat artifact tools
dengan persetujuan terpisah." Perubahan server yang diterapkan:
`listProjects` satu LEFT JOIN; `addProject` WHERE-based duplicate
check + max(sort); cache fetch (10 menit, maks 50) + cache RDAP
(1 jam, sukses saja); deadline total 30 detik di `analyze()`;
fetch script paralel + dedup URL; regex module-level; konteks
katalog Gibran diringkas; retry 1× jeda 500 ms. Perubahan client:
`useMemo` + formatter tanggal module-level + banner error mutasi.
Verifikasi commit: typecheck di scratch copy exit 0; tidak ada
build; `app.db` tidak disentuh.

Dasar otorisasi yang tercatat: (1) arahan Rama 2026-11-08 ~02:11 WIB
— "Tetap kolab dengan gpt, dan tetap tingkatkan kualitas web"
(dicatat di `MEMORY.md`) — arahan ini mendahului commit d85a1e2
(~02:17 WIB) sekitar 6 menit; (2) pekerjaan itu adalah konsolidasi
10 laporan audit performa (APInex, model gratis, biaya 0) yang
didokumentasikan di `docs/AUDIT_FIX_LIST_V1.md`. Dicatat jujur:
**tidak ada artefak approval owner terpisah di repo** (dokumen
persetujuan tertulis, issue, atau catatan keputusan) yang secara
eksplisit mengotorisasi perubahan source aplikasi — baik mirror
maupun live. Aturan pemisahan tiga tahap (§D.4.21 matriks v2.3.10
§0) mensyaratkan persetujuan eksplisit terpisah untuk tahap (b)
implementasi pada source code. Pernyataan v2.3.10 "Tidak ada kode
aplikasi yang diubah" BENAR pada commit `12391e4`, tetapi menjadi
BASI setelah `d85a1e2` — koreksi ini dicatat di sini agar sejarah
klaim tidak menyesatkan. Bukti "live untouched" bersandar pada sisi
repo: git menunjukkan commit itu hanya menyentuh file repo, dan
tidak ada `artifact.edit` yang menjadi bagian commit itu; tetapi
versi/digest live NOT VERIFIED (celah yang sama dengan F-019),
sehingga "live untouched" berstatus didukung bukti repo, bukan
terbukti independen di artifact.

Keputusan v2.3.11 — **HOLD: tidak ada perubahan source aplikasi
lanjutan (mirror maupun live) sampai owner mengklarifikasi scope dan
memberi persetujuan tertulis atas ruang lingkup perubahan source.**
Tidak ada revert yang dilakukan melalui revisi ini (sesuai instruksi
V4 §4.6). F-020 berstatus **partially addressed** (fakta +
dasar otorisasi yang tercatat sudah didokumentasikan; klarifikasi
scope tetap menunggu keputusan owner). Pertanyaan yang diajukan ke
owner (lihat matriks v2.3.11 §6): apakah arahan "tingkatkan kualitas
web" mencakup perubahan source mirror repo-only untuk performa?
Apakah perubahan source mirror memerlukan approval terpisah yang
sama dengan perubahan live? Batas mana yang berlaku untuk pekerjaan
kualitas web berikutnya?

**F-001..F-005 — rencana remediasi dipertahankan + dipetakan ulang
(v2.3.11).** Desain §D.4.18 tetap menjadi spesifikasi; yang ditambah
v2.3.11 adalah pemetaan implementasi dan keterkaitan antar-temuan:

| Temuan | Kontrol implementasi (tahap b) | Harness | Test ID / bukti yang dibutuhkan | Lingkungan |
| --- | --- | --- | --- | --- |
| F-001 Critical | Validasi URL awal + tiap hop redirect + tiap script; resolve SEMUA jawaban A/AAAA; tolak-set; pinning IP ke koneksi; TLS terhadap hostname | H-SSRF-01..20 | Tiap kasus PASS/FAIL + raw log + commit + runtime + environment; log egress 0 koneksi untuk kasus blokir | Staging terisolasi |
| F-002 High | Streamed byte cap (compressed + decompressed); cap per request DAN total per pemeriksaan; abort saat cap terlampaui | H-RES-01..03 | Byte ter-buffer ≤ cap + overhead yang dinyatakan; memori proses dalam anggaran | Staging |
| F-003 High | Satu total deadline per pemeriksaan (RDAP + page + redirect + script); satu sinyal batal bersama; hasil parsial dibuang | H-RES-04..06 | Total waktu ≤ deadline + toleransi; konkurensi dalam batas; kelebihan ditolak fail-closed | Staging |
| F-004 Medium | Unique constraint (nama + alamat kontrak ternormalisasi) + insert atomik + migrasi yang gagal dengan laporan bila duplikat ada | H-CAT-01..03 | Hitung baris DB setelah tiap run = yang dinyatakan | Staging |
| F-005 Medium | Otorisasi `addProject` dari jalur terotorisasi yang didokumentasikan + provenance wajib; `checkLink` bukan jalur mutasi katalog | H-AUTH-01..03 | Keputusan otorisasi cocok dengan kebijakan pada tiap kasus | Staging |

Keterkaitan baru (v2.3.11): (1) perbaikan cache F-016/F-017 berada
di jalur kode yang sama dengan guard F-001 (`fetchText`) — keduanya
wajib dikirim bersama dalam satu implementasi tahap (b); mengirim
guard tanpa memperbaiki cache meninggalkan jendela false-negative
yang sama; (2) unique constraint F-004 dan kolom ownership F-018
adalah pekerjaan migrasi yang sama — wajib didesain sebagai SATU
migrasi, bukan dua migrasi yang bertentangan; (3) `ctx.viewer` SDK
(temuan F-018) adalah kandidat sumber identitas untuk mekanisme
otorisasi F-005 (`isOwner`/`ownerUserId` sebagai dasar "hanya owner
yang boleh menambah katalog") — keputusan mekanisme tetap di tangan
owner, tetapi kandidat teknisnya kini bernama; (4) F-003 kini
**PARTIALLY MITIGATED** di kode mirror — deadline total 30 detik di
`analyze()` (d85a1e2) diteruskan ke RDAP, halaman, dan script —
tetapi TANPA tes regresi; status penutupan TIDAK berubah: F-003
tetap OPEN sampai H-RES-04..06 PASS di staging. VM tidak dapat
menggantikan staging untuk satu pun baris tabel di atas.

**Reproducibility + ownership staging (carry-forward, tidak ada
fakta baru v2.3.11).** SDK provenance tetap NOT VERIFIED: inspeksi
`.d.ts` v2.3.11 membuktikan permukaan API SDK, BUKAN provenance —
tarball tetap builder-local (`/opt/hatch/...`, mtime 1 Jan 1980),
tidak ada di repo, tidak ada source/signature yang dapat diambil
clean builder. Bun 1.4.4 vs deklarasi 1.3.10 (mismatch). Build penuh
TIDAK dicoba. Tidak ada test suite site; tidak ada CI. Staging
operator, kanal alert, egress policy, staging DB+runtime tetap
**UNASSIGNED/BLOCKED**; ST-01..ST-16 dan STAGE-P01..P12 tetap
BLOCKED; tidak ada gate READY. Kriteria penerimaan handoff V4 butir
7 tidak terpenuhi — dicatat apa adanya, bukan ditutup.

**F-006b/c (carry-forward).** F-006b tetap OPEN/blocked — proposal
cleanup matriks v2.3.10 §4 tetap berlaku; commit d85a1e2 sengaja
tidak menyentuh string narasi (`KNOWN_BAD_DOMAINS` baris 51,
`GIBRAN_SITE_KNOWLEDGE` ~1089) — commit message mencatatnya
eksplisit. **[KOREKSI v2.3.12: nomor baris di atas bergeser setelah
verifikasi ulang pada mirror `d85a1e2` — lokasi yang benar adalah
`KNOWN_BAD_DOMAINS` baris 52, `GIBRAN_SITE_KNOWLEDGE` baris 1245,
plus string detail user-facing baris 483; lihat §D.4.23.]** F-006c tetap **"reported by Muse, not independently
verified"** — redaksi live DATA-PLAN dilakukan + diverifikasi nol
kecocokan 2026-11-08 ~00:59 WIB (artifact v13), tetapi konfirmasi
independen belum ada; v2.3.11 tidak menambah bukti baru untuk
F-006c (alasan tidak memakai `artifact.inspect` ada di butir F-019
di atas). F-006b tetap OPEN sampai ada keputusan + otorisasi
terpisah untuk source cleanup.

**U-46 — tetap OPEN, scope sempit dipertahankan.** Pemetaan v2.3.10
tidak berubah: U-46 hanya memblokir worker-signaling fallback path
(§A.5.5.2a / STAGE-P07). Pekerjaan v2.3.11 (cache, tenancy,
bukti runtime, klarifikasi scope) TIDAK bergantung pada U-46 —
tidak ada satu pun jalur di atas yang memakai pensinyalan worker.
Keputusan owner tertulis atas opsi (a)/(b) tetap belum ada.

**Gate konkret berikutnya (v2.3.11 → v2.3.12).** Revisi ini bukan
pengulangan status: ia menambah keputusan desain (F-016/F-017),
bukti SDK read-only (F-018), bukti runtime read-only (F-019), dan
klarifikasi scope berbasis git (F-020). Gate berikutnya dan
prasyaratnya: **(G-A)** keputusan owner atas scope perubahan source
(F-020) — prasyarat: jawaban atas 3 pertanyaan scope di matriks
v2.3.11 §6; tanpa ini, HOLD source tetap berlaku dan tidak ada
pekerjaan tahap (b). **(G-B)** bukti runtime F-019 — prasyarat:
versi/digest artifact + kontrol disabled yang dapat diverifikasi
(butir (a)–(e) di atas); tanpa ini, deployment tetap BLOCKED.
**(G-C)** keputusan tenancy F-018 — prasyarat: pernyataan resmi
runtime provider tentang scope `ctx.db` (per-user vs per-artifact);
tanpa ini, desain ownership tidak dapat dipilih cabangnya dan
H-TEN tidak dapat dijalankan. **(G-D)** keputusan U-46 —
prasyarat: keputusan tertulis owner opsi (a)/(b); tanpa ini,
implementasi pensinyalan (cabang fallback) tetap diblokir — tetapi
tidak memblokir F-001..F-005, cache, atau tenancy. **(G-E)**
staging tersedia + peran UNASSIGNED terisi (operator, kanal alert,
egress policy, DB+runtime) — prasyarat: penamaan oleh owner;
tanpa ini, ST-01..ST-16 dan seluruh harness staging (H-SSRF,
H-RES, H-CAT, H-AUTH, H-CACHE, H-TEN) tidak dapat dijalankan.
Pemicu revisi v2.3.12: keputusan owner atas G-A/G-C/G-D, ATAU
bukti runtime G-B, ATAU audit independen V5 — mana pun yang datang
dulu. Tidak ada revisi baru yang hanya mengulang status v2.3.11.

**Hard gates — ditegaskan kembali (v2.3.11):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah
(DITAMBAH: HOLD perubahan source mirror sampai klarifikasi F-020),
no production testing (termasuk tidak memanggil `checkLink`).
F-001..F-005 tetap OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..20
terhadap implementasi aktual di staging terisolasi + log mentah +
review independen — hasil VM saja tidak cukup.

### D.4.23 Jawaban atas audit independen V5 — F-021, F-022 + Handoff §8 (BARU, v2.3.12)

**F-021 — bukti artifact-state tidak dapat diaudit independen
(Medium, evidence/provenance).** Audit V5 benar: matriks v2.3.11
merangkum hasil `artifact.list_actions` + `artifact.status` dalam
prosa tanpa respons mentah yang disanitasi. v2.3.12 menutup celah
provenance itu: kedua tool dipanggil ulang read-only 2026-11-08
03:47 WIB (2026-11-07 20:47 UTC) untuk slug `cek-link-airdrop` dan
responsnya dipublikasikan apa adanya di
`evidence/f021-artifact-state-20261108/` — `list_actions.json`
(SHA-256 `dbe989b520de47bc031602e164096ef75b3805d35968a0b6f9e1343fca4436d9`),
`status.json` (SHA-256
`3b343a27720ef3aa156845a98c7c8cb26ded566de5808fdbaae950ce3d230019`),
beserta `README.md` yang mencatat metadata capture, yang terbukti
dan yang tidak terbukti, serta keterbatasan pencatatan. Hasilnya
konsisten dengan v2.3.11: `checklink` MASIH TERDAFTAR sebagai
published action; tidak ada build berjalan; `share.shared=false`,
`share.url=null`. `checkLink` TIDAK di-invoke; tidak ada perubahan
runtime state; tidak ada public share yang dibuat. Yang TIDAK dapat
disediakan — dicatat NOT PROVIDED, bukan ditebak: artifact
version/digest, tool/API version, dan request/response IDs tidak
diekspos oleh kedua tool. Deskripsi `addproject`/`askgibran`
terpotong di ujung persis seperti dikembalikan tool — artefak
respons, bukan redaksi; isi terpotong tidak direkonstruksi dan
tidak memengaruhi kesimpulan (nama action + keberadaan `checklink`
lengkap). Paket ini menutup F-021 sebagai celah provenance, tetapi
TIDAK menutup F-019: kontrol runtime (a)–(e) tetap belum satu pun
terpenuhi, dan F-019 tetap BLOCKED / NOT VERIFIED.

**F-022 — cabang implementasi cache + oracle tes cap (Medium,
design/test-oracle).** Audit V5 benar pada dua hal: (1) F-016
(hapus cache) dan F-017 (key wajib menyertakan cap) tidak dinyatakan
sebagai cabang yang saling eksklusif; (2) H-CACHE-05/06
mendeskripsikan batas "300 KB"/"400 KB" sementara implementasi saat
ini memakai `(await res.text()).slice(0, cap)` — slicing string JS
menghitung UTF-16 code unit, bukan byte UTF-8, dan terjadi SETELAH
seluruh body di-buffer — sehingga nilai 300.000/400.000 saat ini
TIDAK menegakkan byte cap atau memory cap apa pun.

Keputusan cabang v2.3.12 — **cabang pilihan: HAPUS cache fetch dari
SEMUA jalur security-scan** (halaman utama `fetchText(..., 400_000)`
DAN script `fetchText(..., 300_000)`, karena keduanya memakai helper
`fetchText` yang sama dan keduanya adalah jalur vonis keamanan).
Konsekuensi eksplisit: **F-017 (cache key menyertakan cap) dan
H-CACHE-05/06 menjadi NOT APPLICABLE untuk jalur security-scan**
pada cabang ini — tidak ada cache di jalur itu, sehingga tidak ada
key yang perlu diperbaiki. **F-002 (streamed byte cap) tetap berlaku
secara terpisah** — penghapusan cache tidak menggantikan streamed
cap; keduanya kontrol yang berbeda (freshness vs batas resource)
dan diuji harness yang berbeda (H-CACHE vs H-RES). **H-CACHE-01..04
tetap berlaku** pada cabang ini (menguji bahwa TIDAK ADA cache di
jalur scan). Cache RDAP dipertahankan apa adanya (hanya sukses yang
di-cache, TTL 1 jam) — RDAP bukan jalur vonis konten.

**Cabang alternatif (hanya bila owner secara eksplisit memilih
mempertahankan cache):** cache dipertahankan HANYA dengan seluruh
syarat berikut sekaligus: (a) enumerasi lengkap SEMUA caller cache
yang tersisa; (b) key cache = `url + "|" + cap + "|" +
policy-version`; (c) kegagalan TIDAK PERNAH di-cache; (d) TTL
eksplisit + setiap baris `checks` menyimpan `fetchedAt`,
`cacheHit`, umur data, ditampilkan di UI; (e) re-check dari history
WAJIB melewati cache (jalur fresh) dan menyimpan baris baru;
(f) H-CACHE-01..06 SEMUA berlaku pada cabang ini. Cabang alternatif
BUKAN rekomendasi dan TIDAK dipilih oleh revisi ini — ia hanya
didokumentasikan agar keputusan owner kelak memiliki dua opsi
lengkap. Sampai owner memilih, cabang pilihan adalah keputusan
desain yang berlaku.

**Koreksi oracle tes (mengikat v2.3.12).** Cap adalah **raw bytes
pada lapisan response stream**, diukur SEBELUM decoding ke string
dan SEBELUM dekompresi selesai dibaca ke memori. Satuan oracle
adalah **byte**, bukan UTF-16 code unit, bukan code point Unicode,
bukan karakter JS. **`res.text().slice()` dinyatakan BUKAN bukti
byte cap** — dalam dokumen ini, dalam matriks respons, dan dalam
implementasi kelak, pemotongan string setelah `res.text()` tidak
boleh dikutip sebagai bukti penegakan cap. Bukti cap yang sah hanya
berasal dari instrumentasi stream (byte yang dibaca dari stream ≤
cap + overhead yang dinyatakan) atau dari abort koneksi pada cap.

Spesifikasi oracle yang dikoreksi (DESAIN tes staging — TIDAK
dijalankan di v2.3.12): **H-CACHE-01..04** tetap (benign→malicious
terlihat; failure tidak terkunci; freshness + bypass re-check);
**H-CACHE-05/06 NOT APPLICABLE pada cabang pilihan** (hanya pada
cabang alternatif, dengan oracle raw bytes); **H-RES-01** body 50 MB
ASCII — stream abort pada cap, byte ter-buffer ≤ cap + overhead;
**H-RES-02 (BARU)** payload multibyte UTF-8 — konten berbahaya
ditempatkan SETELAH batas yang setara dengan 300.000 UTF-16 code
unit tetapi SEBELUM 300.000 raw bytes (dan sebaliknya) — oracle
menghitung raw bytes, bukan `string.length`; tes ini MEMBEDAKAN
oracle byte vs oracle code-unit (tes ASCII saja tidak cukup);
**H-RES-03 (BARU)** payload terkompresi (gzip/br) yang mengembang
melewati cap saat didekompresi — abort saat ukuran TERDEKOMPRESI
melewati cap, meskipun ukuran terkompresi di bawah cap;
**H-RES-04 (BARU)** redirect chain (3+ hop) dengan payload besar di
hop terakhir + total deadline — setiap hop divalidasi (F-001), byte
ter-buffer kumulatif dihitung per scan; **H-RES-05 (BARU)**
aggregate per-scan limit — halaman 400.000 + N script 300.000
masing-masing — total byte ter-buffer per pemeriksaan ≤ aggregate
limit yang dinyatakan, kelebihan → abort fail-closed; **H-RES-06**
total-deadline — penomoran ulang dari H-RES-04..06 v2.3.11 (deadline
30 detik, konkurensi dalam batas, hasil parsial dibuang; isi tidak
berubah). Kriteria penerimaan F-022: matriks, kontrak kode, dan test
ID sepakat pada satu cabang cache; H-RES-01..06 membuktikan streamed
byte cap secara independen; H-CACHE hanya berlaku di mana cache
benar-benar tersisa. Belum diimplementasikan; belum dijalankan di
staging mana pun.

**F-018 — kutipan `.d.ts` minimal dipublikasikan (carry-forward
v2.3.12).** Tarball SDK 0.14.0 dibaca ulang read-only (ekstrak ke
`/tmp/sdk-v2312`, BUKAN ke repo; SHA-256
`f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e` —
SAMA dengan yang tercatat v2.3.11; ukuran 2.051.070 byte; mtime
1 Jan 1980). Kutipan verbatim `PortableCtx` / `Viewer` /
`LocalViewer` / `CloudflareViewer` dari
`package/dist/server-contract.d.ts` (baris 20–44 dan 123–129) kini
ada di matriks v2.3.12 §2 F-018 — audit berikutnya dapat memeriksanya
dari repo tanpa mengakses tarball. Yang dinyatakan kutipan itu:
`db` adalah accessor per-invocation (`SpaceDbAccessor`); `viewer`
opsional (`viewer?: Viewer`). Yang TIDAK dinyatakan: apakah database
di balik accessor itu per-user, per-space, atau shared per artifact
— grep tenancy pada `.d.ts` dan `package/README.md` mengembalikan
nol. **Tidak ada kesimpulan tenancy yang ditarik dari nama tipe
saja.** Principal key stabil per varian (DESAIN): local —
`ownerUserId` (fallback `userId`) + `spaceSlug`; cloudflare —
`shareId` + `tokenId` (dengan `tokenExpiresAt` — key kedaluwarsa
tidak boleh dipakai sebagai identitas stabil lintas sesi).
Penanganan `viewer` hilang: fail closed — handler yang membutuhkan
ownership WAJIB menolak bila `viewer` tidak ada (default TOLAK,
bukan "perlakukan sebagai owner"). Pernyataan resmi runtime provider
tentang scope `ctx.db` tetap BELUM ADA; H-TEN-01..05 dipertahankan
sebagai tes staging; public tester TIDAK BOLEH memuat data pengguna
sampai tenancy terbukti.

**F-020 — HOLD dipertahankan (v2.3.12).** Revisi ini TIDAK mengubah
satu pun file source aplikasi (hanya dokumen desain, matriks
respons, dan paket bukti read-only). d85a1e2 TIDAK di-revert.
Tidak ada artefak approval terpisah di repo. HOLD tetap berlaku
penuh: tidak ada perubahan `.ts`/`.tsx`, skema, migrasi, client,
build, atau live artifact sampai ada keputusan scope tertulis
terpisah.

**F-001..F-005 — spesifikasi dipertahankan + oracle F-002 dikoreksi
(v2.3.12).** Desain §D.4.18 tetap menjadi spesifikasi; yang berubah
adalah oracle F-002 (lihat koreksi di atas): streamed byte cap dalam
RAW BYTES di lapisan stream, cap per request DAN aggregate per
pemeriksaan, diuji H-RES-01..05; total deadline diuji H-RES-06
(penomoran ulang). Keterkaitan v2.3.11 dipertahankan: cache F-016/
F-022 berada di jalur kode yang sama dengan guard F-001
(`fetchText`) — wajib dikirim bersama dalam satu implementasi tahap
(b); unique constraint F-004 dan kolom ownership F-018 adalah SATU
migrasi; `ctx.viewer` adalah kandidat sumber identitas F-005
(principal key per varian kini didefinisikan di atas).

**Reproducibility (F-009/F-014) — keputusan Bun v2.3.12.**
`site/package.json` mendeklarasikan `packageManager` Bun 1.3.10,
sedangkan bukti VM (frozen install + typecheck) memakai Bun 1.4.4.
Keputusan yang dicatat: **versi kanonik untuk build bersih kelak
adalah 1.3.10 (yang dideklarasikan)**; bukti VM dengan 1.4.4 dicatat
sebagai bukti dengan versi yang BERBEDA dan tidak boleh dikutip
sebagai bukti build 1.3.10. Bila owner memilih 1.4.4, deklarasi
`packageManager` harus diubah eksplisit (perubahan source — masuk
HOLD F-020, tidak dilakukan di v2.3.12). Jalur retrievable SDK
source/provenance: BELUM ADA — tarball hanya tersedia di path
builder-local; tidak ada URL paket publik atau signature yang dapat
diverifikasi clean builder. Tidak ada test suite site (hanya
`typecheck`, `build`, `build:server`, `build:client`); tidak ada CI
(tidak ada file `.github/workflows/*` — dikonfirmasi ulang V5 §2.3,
diterima). Status keseluruhan tetap: **NOT REPRODUCIBLE untuk clean
external builder**.

**Ownership staging (F-013) — tidak ada fakta baru kecuali kriteria
latensi ST-12.** Staging operator, kanal alert, egress policy,
staging DB+runtime tetap **UNASSIGNED/BLOCKED**; ST-01..ST-16 dan
STAGE-P01..P12 tetap BLOCKED; tidak ada gate READY. **BARU v2.3.12 —
kriteria latensi alert ST-12 (ST-12-LAT-01..03):** alert atas
penghapusan/inkonsistensi lock uji HARUS terkirim ke kanal alert
yang dinamai dalam ≤ 5 menit sejak kejadian (kriteria DESAIN —
kanal alert sendiri masih UNASSIGNED, sehingga kriteria ini belum
dapat diuji); setiap alert HARUS memuat timestamp kejadian, lock
path, dan identitas proses yang terdeteksi — alert tanpa ketiganya
= FAIL; bila kanal alert tidak tersedia saat uji, ST-12 = NOT RUN
(bukan PASS, bukan FAIL). Kriteria ini masuk gerbang G6 bersama
ST-12 yang sudah ada.

**F-006b/c (carry-forward v2.3.12).** Lokasi F-006b diverifikasi
ulang pada mirror commit `d85a1e2` — nomor baris BERGESER vs
v2.3.11: `KNOWN_BAD_DOMAINS` baris **52** (dulu 51),
`GIBRAN_SITE_KNOWLEDGE` baris **1245** (dulu ~1089), plus string
detail user-facing baris **483** (baru dicatat v2.3.12). Lokasi
disebutkan hanya sebagai pengenal (nama + nomor baris) TANPA
mengutip narasi, nilai, atau detail insiden apa pun. Proposal
cleanup tetap berlaku (butuh edit source live tahap (b) + otorisasi
owner terpisah). F-006c tetap **"reported by Muse, not
independently verified"** — bukti versi/diff live yang dibutuhkan
didefinisikan v2.3.12: (a) versi/digest artifact live yang dapat
dikutip; (b) diff isi DATA-PLAN live sebelum vs sesudah redaksi,
atau hash konten sebelum/sesudah; (c) timestamp capture. Yang
tersedia saat ini: TIDAK SATU PUN dari (a)–(c) — tool read-only
tidak mengekspos versi/digest atau isi file live (celah yang sama
dengan F-019/F-021); `artifact.inspect` TIDAK dipakai karena inspect
adalah delegasi diagnosis atas laporan malfungsi pengguna, bukan
pembaca state read-only.

**U-46 — tetap OPEN, scope sempit dipertahankan.** Pemetaan v2.3.10
tidak berubah: U-46 hanya memblokir worker-signaling fallback path
(§A.5.5.2a / STAGE-P07). Pekerjaan v2.3.12 (paket bukti, cabang
cache, oracle, kutipan SDK, kriteria ST-12) TIDAK bergantung pada
U-46 — tidak ada satu pun jalur di atas yang memakai pensinyalan
worker. Keputusan owner tertulis atas opsi (a)/(b) tetap belum ada.

**Risiko baru v2.3.12 (§G):** U-55 (F-022 — cabang cache tidak
dinyatakan; partially addressed desain), U-56 (F-022 — oracle cap
mengukur string bukan byte; partially addressed desain), U-57
(F-021 — bukti artifact-state tidak auditable; partially addressed —
paket + digest dipublikasikan, version/digest tetap NOT PROVIDED),
U-58 (F-018 — kutipan `.d.ts` tidak ada di repo; partially
addressed — kutipan dipublikasikan, pernyataan provider tetap belum
ada).

**Gate konkret berikutnya (v2.3.12 → v2.3.13).** Revisi ini bukan
pengulangan status: ia menambah paket bukti yang dapat diaudit
(F-021), keputusan cabang cache yang eksplisit + oracle yang
dikoreksi (F-022), kutipan `.d.ts` yang dapat diperiksa (F-018),
keputusan Bun, koreksi lokasi F-006b, dan kriteria latensi ST-12.
Gate berikutnya dan prasyaratnya: **(G-A)** keputusan owner atas
scope perubahan source (F-020); **(G-B)** bukti runtime F-019
(versi/digest + kontrol disabled (a)–(e)); **(G-C)** keputusan
tenancy F-018 (pernyataan resmi provider tentang scope `ctx.db`);
**(G-D)** keputusan U-46; **(G-E)** staging tersedia + peran
UNASSIGNED terisi; **(G-F) BARU** keputusan cache F-022 — owner
memilih cabang pilihan vs alternatif; **(G-G) BARU** keputusan Bun
F-009 — kanonik 1.3.10 vs 1.4.4. Pemicu revisi v2.3.13: keputusan
owner atas G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU audit
independen V6 — mana pun yang datang dulu. Tidak ada revisi baru
yang hanya mengulang status v2.3.12.

**Hard gates — ditegaskan kembali (v2.3.12):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah
(HOLD perubahan source mirror sampai klarifikasi F-020 tetap
berlaku), no production testing (termasuk tidak memanggil
`checkLink`). F-001..F-005, F-016/F-017/F-022, F-018 tetap
OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..20 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup.

### D.4.24 Jawaban atas audit independen V6 — F-023, F-024, F-025 + Handoff §10 (BARU, v2.3.13)

**F-023 — H-RES-02 berisi kondisi fixture UTF-8 yang mustahil
(Medium, design/test-oracle).** Audit V6 benar: H-RES-02 v2.3.12
meminta konten berbahaya "setelah batas yang setara dengan 300.000
UTF-16 code unit tetapi sebelum 300.000 raw bytes (dan sebaliknya)".
Arah pertama mustahil — untuk setiap urutan skalar Unicode yang
valid, panjang byte UTF-8 selalu ≥ jumlah UTF-16 code unit (ASCII
1 byte = 1 CU; BMP non-ASCII 2–3 byte = 1 CU; supplementary 4 byte
= 2 CU). String dengan >300.000 CU tetapi <300.000 byte tidak dapat
dibuat. **Arah mustahil itu DIHAPUS dari H-RES-02 di v2.3.13.**
Yang tersisa hanya arah feasible: marker SETELAH batas 300.000 byte
tetapi SEBELUM batas 300.000 code unit — arah inilah yang membedakan
oracle byte dari oracle `string.length`.

Fixture feasible pengganti dipublikasikan di
`evidence/f023-h-res02-fixtures/` — setiap fixture = PREFIX ×
karakter uji + marker `XSS-MARKER-RES02` (16 karakter ASCII = 16
byte = 16 CU) + 1 × karakter uji; marker tepat pada offset byte
300.000 (cap H-RES-02 = 300.000 decoded-body byte): **A** 150.001 ×
U+00E9 — 150.017 code point, 150.017 CU, 300.018 byte UTF-8, marker
offset byte 300.000 / CU 150.000 (mengikuti contoh audit V6);
**B** 75.001 × U+1F600 (supplementary plane) — 75.017 code point,
150.018 CU, 300.020 byte, marker offset byte 300.000 / CU 150.000;
**C** 100.001 × U+20AC — 100.017 code point, 100.017 CU, 300.019
byte, marker offset byte 300.000 / CU 100.000. Hitungan diverifikasi
dua alat independen (Python 3.12.3 dan Node.js v24.22.1 — hasil cocok
persis; `wc -c` mengonfirmasi 300018 / 300020 / 300019); SHA-256
fixture tercatat di `evidence/f023-h-res02-fixtures/README.md`.
Verdict yang diharapkan: implementasi byte-cap yang benar TIDAK
memuat marker (mulai tepat pada byte ke-300.000); implementasi
berbasis `string.length` memuat seluruh fixture (total CU
100.017–150.018 < 300.000) sehingga marker HADIR — FAIL. Fixture
adalah INPUT tes, bukan hasil tes; H-RES-02A/B/C baru PASS bila
harness staging menjalankannya terhadap implementasi tahap (b).

**F-024 — H-RES-03 tidak mendefinisikan lapisan byte yang di-cap
(Medium, design/resource-limit).** Audit V6 benar: v2.3.12 menyebut
cap "raw bytes di lapisan stream sebelum dekompresi selesai dibaca"
sekaligus meminta "decompressed-size limit" tanpa menyatakan lapisan
mana yang dihitung. v2.3.13 mendefinisikan tiga lapisan secara
terpisah (mengikat): **L0 wire/encoded** — byte terkompresi yang
ditransfer di jaringan; **TIDAK dapat diobservasi** melalui
`Response.body` di Bun (terbukti eksperimen di bawah), sehingga
**tidak ada wire-byte cap yang diklaim di lapisan aplikasi** —
transfer wire hanya dibatasi egress limit infrastruktur (belum
didefinisikan; staging operator UNASSIGNED, G-E); wire cap pun tidak
akan melindungi memori dari decompression bomb (51 byte wire →
500.000 byte decoded). **L1 decoded-body per-request** — byte yang
diekspos `Response.body` setelah dekompresi transparan runtime,
dihitung chunk demi chunk SEBELUM decoding teks; cap halaman 400.000,
tiap script 300.000 decoded byte; **ditegakkan** dengan pre-append
accounting (bila counter + panjang chunk > cap, abort TANPA append —
buffered ≤ cap, overhead 0 di luar cap pada lapisan aplikasi).
**[KOREKSI v2.3.14 (F-026): "overhead 0" di sini DICABUT sebagai
pernyataan umum dan DIBATASI hanya pada accepted/retained bytes di
accumulator aplikasi. Chunk yang sudah diserahkan `reader.read()`
sudah teralokasi SEBELUM pemeriksaan panjangnya — transient chunk
dapat mencapai seluruh body (teramati 528.384 byte untuk body
1.000.000; satu chunk 500.000 byte = seluruh body — lihat
`evidence/f026-chunk-accounting/`). Anggaran A1 (accepted) dan A2
(transient/in-flight) kini dipisah eksplisit di §D.4.25.]**
**L2 aggregate per-scan** — 1.000.000 decoded byte (lihat F-025).
**Tidak ada lapisan dekompresi yang dikontrol aplikasi** — implementasi
tidak melakukan dekompresi sendiri. **`Content-Length` DILARANG
sebagai oracle** — terbukti bernilai ukuran terkompresi (551/51)
sementara body yang dibaca 500.000 byte.

Eksperimen VM lokal v2.3.13 (`evidence/f024-h-res03-bun-fetch/` —
server + klien di `127.0.0.1`, tanpa jaringan eksternal, tanpa
artifact live, `checkLink` TIDAK di-invoke; Bun 1.4.4): payload
500.000 byte dengan marker pada offset 400.000 disajikan sebagai
gzip (551 byte wire) dan br (51 byte wire); `Response.body` pada
keduanya dibaca **500.000 byte** — Bun mendekompresi transparan
berdasarkan `Content-Encoding` respons (termasuk saat klien meminta
`Accept-Encoding: identity`); `fetch` default mengirim
`Accept-Encoding: gzip, deflate, br, zstd`. Kontrol `/plain`: chunk
pertama 393.110 byte — satu chunk dapat jauh melebihi cap, sehingga
pre-append accounting adalah satu-satunya penegakan yang benar.
**Batasan:** eksperimen memakai Bun 1.4.4, sedangkan versi kanonik
yang dideklarasikan adalah 1.3.10 — perilaku dekompresi pada 1.3.10
**NOT VERIFIED** dan wajib diverifikasi ulang di staging pada versi
kanonik sebelum H-RES-03 dapat PASS (risiko U-62). `deflate`/`zstd`
tidak diuji di VM ini; H-RES-03 staging harus mencakup gzip DAN br
(minimal).

**F-025 — H-RES-05 tanpa angka aggregate budget (Medium,
design/incomplete acceptance).** Audit V6 benar: H-RES-05 v2.3.12
mensyaratkan total di bawah "aggregate limit" tanpa angka, cakupan,
atau aturan akuntansi concurrency-safe. v2.3.13 menetapkan angka
(mengikat): **aggregate decoded-body budget per scan (L2) =
1.000.000 byte** — di bawah jumlah cap individual 400.000 +
3×300.000 = 1.300.000 (agar aggregate benar-benar mengikat); ≥
400.000 + 300.000 = 700.000 (halaman + 1 script pada cap penuh tetap
lolos); = 400.000 + 2×300.000 (halaman + 2 script pada cap penuh
lolos tepat pada batas inklusif); halaman + 3 script pada cap penuh
= 1.300.000, melebihi aggregate sebesar 300.000 → WAJIB abort.
**Max script count = 3** (sesuai source `actions.ts:512–525`).
**Per-request caps (L1):** halaman 400.000, tiap script 300.000.
**Batas inklusif:** total ≤ 1.000.000 = PASS; > 1.000.000 = abort.
**Overhead yang diizinkan: 0 byte** ter-buffer di luar aggregate
(pre-append accounting; byte yang masih dalam perjalanan di wire
tidak dihitung karena tidak ter-buffer). **[KOREKSI v2.3.14 (F-026):
"0 byte" di sini hanya berlaku untuk accepted/retained bytes di
accumulator aplikasi — BUKAN untuk transient chunk / in-flight
memory. Lihat §D.4.25: anggaran A2 (transient) tidak dibatasi oleh
pre-append accounting.]** **Kebijakan redirect-body:**
body respons redirect di-cancel tanpa dibaca (`body.cancel()`)
segera setelah hop diproses — kontribusi **0 byte** terhadap
aggregate; hanya body respons final yang dihitung; hop tetap
divalidasi (F-001) dan dihitung dalam total deadline (H-RES-06).
**Cakupan L2:** hanya decoded-body byte halaman + script; RDAP di
luar cakupan (jalur lookup terpisah). **Akuntansi concurrency-safe:**
satu objek budget bersama per scan; check-and-reserve dieksekusi
sinkron tanpa `await` di antara pemeriksaan dan pencatatan — dalam
event loop JS single-threaded blok sinkron itu atomik; saat budget
habis: satu `AbortController` bersama meng-abort SEMUA fetch yang
masih berjalan, semua reader di-cancel, seluruh konten parsial
DIBUANG, verdict = **fail-closed** — tidak ada partial trusted
verdict. Tes H-RES-05 (staging): halaman 400.000 + 3 script 300.000
bersamaan → abort + cancel + fail-closed; kontrol batas: halaman
400.000 + 2 script 300.000 = tepat 1.000.000 → PASS. Tes staging
belum dijalankan.

**G-F — klarifikasi semantik kepemilikan (handoff V6 butir 4).**
Cabang pilihan v2.3.12 (hapus cache fetch dari semua jalur
security-scan) adalah **rekomendasi desain yang menunggu penerimaan
owner, BUKAN otorisasi implementasi**. Tidak ada perubahan source
yang terjadi atau diizinkan oleh rekomendasi ini; source tetap memakai
cache seperti saat ini (`actions.ts:152`, lookup keyed by URL, `null`
di-cache setelah retry gagal — `actions.ts:166`). **F-017 dan
H-CACHE-05/06 menjadi NOT APPLICABLE HANYA SETELAH cabang penghapusan
cache DIIMPLEMENTASIKAN** pada jalur security-scan; sebelum itu F-017
tetap partially addressed dan H-CACHE-05/06 tetap oracle yang berlaku
pada cabang alternatif. Gate G-F tetap keputusan owner; implementasi
tetap butuh otorisasi tahap (b) terpisah.

**Koreksi catatan "live untouched" v2.3.12 (BARU v2.3.13).**
Matriks v2.3.12 dan desain v2.3.12 masih memuat kesan bahwa live
belum tersentuh sejak sebelum d85a1e2. **Koreksi berdasarkan catatan
repo (bukan verifikasi baru yang dilakukan revisi ini):** situs live
sudah **v15** — commit repo `d85a1e2` (perbaikan performa S1–S9
server + C1–C7 client) SUDAH diterapkan ke live dan **disetujui Rama
2026-11-08 ~02:09 WIB**. Klaim "live untouched" di v2.3.12 dengan
demikian BASI dan dikoreksi di sini; revisi v2.3.13 tidak melakukan
verifikasi live baru apa pun dan tidak mengubah live; d85a1e2 TIDAK
di-revert.

**F-020 — HOLD dipertahankan (v2.3.13).** Revisi ini TIDAK mengubah
satu pun file source aplikasi (hanya dokumen desain, matriks
respons, dan paket bukti read-only/VM). d85a1e2 TIDAK di-revert.
Tidak ada artefak approval terpisah di repo. HOLD tetap berlaku
penuh.

**F-001..F-005, F-018, F-019, F-006b/c — carry-forward v2.3.13.**
Tidak ada fakta baru: F-001..F-005 tetap OPEN/BLOCKED (spesifikasi
§D.4.18 dipertahankan; oracle F-002 dikoreksi per F-023/F-024/F-025
di atas); F-018 tetap partially addressed (tenancy NOT VERIFIED,
pernyataan provider belum ada); F-019 tetap BLOCKED / NOT VERIFIED
(`checklink` masih terdaftar; kontrol (a)–(e) belum satu pun
terpenuhi); F-006b tetap OPEN (baris 52, 483, 1245); F-006c tetap
"reported by Muse, not independently verified". **Reproducibility
(F-009/F-014):** keputusan Bun kanonik 1.3.10 dipertahankan; bukti VM
H-RES-03 memakai 1.4.4 — perilaku pada 1.3.10 NOT VERIFIED (U-62).
**Ownership staging (F-013):** operator, kanal alert, egress policy,
staging DB+runtime tetap UNASSIGNED/BLOCKED; ST-01..ST-16 dan
STAGE-P01..P12 tetap BLOCKED; kriteria ST-12-LAT-01..03
dipertahankan. **U-46** tetap OPEN — keputusan owner belum ada.

**Risiko baru v2.3.13 (§G):** U-59 (F-023 — fixture H-RES-02
mustahil; addressed desain), U-60 (F-024 — lapisan byte H-RES-03
ambigu; addressed desain), U-61 (F-025 — aggregate H-RES-05 tanpa
angka; addressed desain), U-62 (bukti VM H-RES-03 memakai Bun 1.4.4
bukan kanonik 1.3.10; OPEN / NOT VERIFIED).

**Gate konkret berikutnya (v2.3.13 → v2.3.14).** Revisi ini bukan
pengulangan status: ia menghapus fixture mustahil dan menerbitkan
fixture feasible yang angkanya terverifikasi (F-023), mendefinisikan
tiga lapisan byte terpisah dengan bukti eksperimen VM atas perilaku
Bun (F-024), menetapkan angka aggregate + aturan cancel
concurrency-safe (F-025), mengklarifikasi semantik kepemilikan G-F,
dan mengoreksi catatan "live untouched" yang basi. Gate berikutnya
dan prasyaratnya: **(G-A)** keputusan owner atas scope perubahan
source (F-020); **(G-B)** bukti runtime F-019 (versi/digest + kontrol
disabled (a)–(e)); **(G-C)** keputusan tenancy F-018 (pernyataan
resmi provider tentang scope `ctx.db`); **(G-D)** keputusan U-46;
**(G-E)** staging tersedia + peran UNASSIGNED terisi; **(G-F)**
keputusan cache F-022 — owner menerima cabang pilihan (rekomendasi)
vs alternatif; **(G-G)** keputusan Bun F-009 — kanonik 1.3.10 vs
1.4.4; **(G-H) BARU** eksekusi harness H-RES-02/03/05 yang sudah
dikoreksi — prasyarat: otorisasi implementasi tahap (b) (G-A) +
staging tersedia (G-E) + verifikasi ulang perilaku Bun pada versi
kanonik (U-62). Pemicu revisi v2.3.14: keputusan owner atas
G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU audit independen
V7 — mana pun yang datang dulu. Tidak ada revisi baru yang hanya
mengulang status v2.3.13.

**Hard gates — ditegaskan kembali (v2.3.13):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah
(HOLD perubahan source mirror sampai klarifikasi F-020 tetap
berlaku), no production testing (termasuk tidak memanggil
`checkLink`). F-001..F-005, F-016/F-017/F-022, F-018 tetap
OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..20 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup.

### D.4.25 Jawaban atas audit independen V7 — F-026, F-027, F-028 + Handoff §10 (BARU, v2.3.14)

**F-026 — batas decoded-byte tidak membatasi transient chunk
allocation (Medium, design gap / resource-accounting mismatch).**
Audit V7 benar: pre-append accounting v2.3.13 mencegah chunk yang
melewati cap ditambahkan ke accumulator, tetapi tidak menghapus
alokasi chunk yang sudah diserahkan runtime oleh `reader.read()`.
Log VM v2.3.13 sendiri mencatat chunk pertama 393.110 byte pada
kontrol plain — lebih besar dari cap script 300.000 byte.

Eksperimen VM baru v2.3.14 (`evidence/f026-chunk-accounting/` —
server + klien di `127.0.0.1`, Bun 1.3.10 DAN 1.4.4, `checkLink`
TIDAK di-invoke) mengukur ini secara langsung. Hasil yang mengikat:

- **Chunk maksimum teramati (1.3.10): 528.384 byte** (P3, body
  1.000.000, satu chunk — melebihi cap halaman 400.000; accepted 0)
  dan **500.000 byte = seluruh body dalam satu chunk** (P4, meskipun
  server me-enqueue potongan 64 KiB). Pada 1.4.4 max teramati
  392.791 byte (P3). Chunk tidak deterministik antar run dan antar
  versi — **tidak ada batas ukuran chunk tetap yang aman diasumsikan**.
- **Chunking sisi server TIDAK membatasi chunk sisi klien** (P4
  1.3.10: enqueue 64 KiB → chunk klien 500.000 byte).
- **Accepted/retained bound TERBUKTI di kedua versi** — accepted
  selalu ≤ cap per-request dan ≤ L2 (P1 1.3.10: accepted 16.384 ≤
  300.000; P3 1.4.4: accepted 392.791 ≤ 400.000). Pre-append
  accounting bekerja untuk apa yang ia klaim.
- **Shared abort membatalkan sibling dengan cepat di loopback**
  (P2: reader lain ter-abort sebelum chunk pertama; P2b 1.3.10: dua
  reader menerima 0 chunk / body kosong setelah abort bersama) —
  tetapi itu adalah hasil balapan di loopback, BUKAN jaminan: pada
  jaringan lambat / runtime staging, beberapa chunk besar dapat
  mendarat sebelum abort diproses. Tidak ada angka in-flight
  maksimum yang dapat diklaim dari eksperimen loopback ini.
- **RSS + external adalah metrik yang benar.** Body bytes hidup
  sebagai `Uint8Array`/external: peak RSS 1.3.10 mencapai 65.044.480
  (P4) dari baseline ~50 MB sementara `heapUsed` tetap ~1,8–2,3 MB.
  `heapUsed` saja menyesatkan sebagai oracle memori.

**Definisi jujur yang mengikat (menggantikan klaim v2.3.13):**

- **A1 — accepted/retained decoded bytes** (accumulator yang
  dikendalikan aplikasi): halaman ≤ 400.000, tiap script ≤ 300.000,
  aggregate L2 ≤ 1.000.000 — ditegakkan pre-append, terbukti VM
  pada Bun 1.3.10 dan 1.4.4.
- **A2 — transient chunk / in-flight memory** (alokasi runtime
  sebelum pemeriksaan aplikasi): worst-case per chunk = **seluruh
  body**; worst-case simultan = jumlah max-chunk semua reader yang
  masih berjalan sebelum abort bersama diproses (4 reader: 1
  halaman + 3 script). **Tidak ada angka A2 yang dijamin** tanpa
  batas chunk runtime / BYOB / limit proses.
- **Klaim "overhead 0 byte" v2.3.13 DICABUT sebagai pernyataan
  umum** dan DIBATASI hanya pada A1. Klaim itu TIDAK BOLEH dibaca
  sebagai "peak-memory overhead nol" — lihat koreksi yang
  ditambahkan pada §D.4.24 (F-024/F-025) di atas.
- **Batas yang ditetapkan v2.3.14 (desain):** max chunk yang
  diasumsikan = ukuran body penuh; concurrency reader = max 4
  (1 halaman + 3 script); bila peak memory adalah requirement,
  wajib ada limit proses/cgroup + pengukuran high-water RSS pada
  concurrency maksimum di staging Bun 1.3.10 (H-RES-03/H-RES-05
  yang diperbarui, lihat di bawah).
- **BYOB / fixed-size reads:** dukungan pada Bun 1.3.10 dan runtime
  staging **NOT VERIFIED** — jangan diasumsikan tersedia; bila
  dipakai sebagai mitigasi, dukungannya harus dibuktikan dulu di
  staging pada versi kanonik.

**Tes regresi wajib (staging, diperbarui v2.3.14):** satu respons
yang mengirim chunk lebih besar daripada cap script; tiga script
paralel dengan chunk besar; catat ukuran maksimum chunk, jumlah
in-flight, accepted bytes, cancellation, dan **peak RSS/heap +
external** pada Bun 1.3.10 staging. Acceptance: accepted ≤ cap
(DAN) peak RSS ≤ ambang operasional yang ditetapkan SEBELUM tes
oleh staging operator — ambang itu prasyarat tes, bukan hasil tes.

**F-027 — L2 tidak mencakup representasi string turunan (Medium,
design gap / plausible resource-exhaustion risk).** Audit V7 benar:
L2 v2.3.13 hanya menghitung decoded-body bytes, sedangkan source
saat ini (`site/server/src/actions.ts:520-533`, dikutip read-only)
membentuk `scriptTexts.join("\n")`, `haystack` dari HTML +
scriptText, dan `lower = haystack.toLowerCase()` — beberapa
representasi konten yang sama dapat hidup bersamaan.

Eksperimen VM baru v2.3.14 (`evidence/f027-derived-strings/` —
simulasi pola source pada string lokal, Bun 1.3.10 DAN 1.4.4,
tanpa jaringan, tanpa artifact) mengukur ini pada kasus batas L2
(halaman 400.000 + 2 script 300.000 = 1.000.000 karakter input —
maksimum yang mencapai jalur analisis; script ketiga pada cap penuh
meng-abort scan dan parsialnya dibuang):

- **Karakter hidup pada titik analisis: 3.599.936 = 3,60× input**
  (`html` 399.993 + script 599.988 + join 599.989 + haystack
  999.983 + lower 999.983) — deterministik, sama di kedua versi.
- **Peak RSS: +4.980.736 byte (~4,98× input) pada 1.3.10** dan
  **+4.325.376 byte (~4,33× input) pada 1.4.4**; peak heapUsed
  +3.609.196 byte (~3,61× input) pada 1.4.4.
- **`heapUsed` bukan oracle yang dapat diandalkan di semua versi:**
  pada Bun 1.3.10 `heapUsed` tetap 211.394 pada semua langkah
  sementara RSS naik ~5 MB dan `external` naik ~2,6 MB. Ambang
  acceptance wajib memakai **RSS (+ external), per versi runtime**,
  bukan `heapUsed` saja.
- **Alternatif incremental terukur ~4,5–5,4× lebih rendah**
  peak-nya (peak RSS +917.504 pada 1.3.10; peak heapUsed +802.465
  pada 1.4.4) dan tetap mendeteksi sinyal yang sama pada kasus uji
  (`asksConnect = true` di kedua pola) — bukti VM atas pola
  simulasi, BUKAN bukti implementasi. **[KOREKSI v2.3.15 (F-029):
  angka ~4,5–5,4× TIDAK TERKONFIRMASI — perbandingan v2.3.14 tidak
  valid secara komparatif (pola A dan B dalam satu proses; baseline
  B tercemar string A yang masih hidup; pengukuran hanya checkpoint
  post-GC, bukan high-water mark OS). Eksperimen terkoreksi
  `evidence/f029-memory-methodology/` (proses terpisah + VmHWM,
  median 5 run) memberi rasio A/B 1,18–1,88×. Angka lama dinyatakan
  NOT VERIFIED dan TIDAK BOLEH dipakai sebagai sizing/cgroup
  acceptance. Lihat §D.4.26.]**

**Keputusan desain yang mengikat:**

1. **L2 DINYATAKAN sebagai input-body budget, BUKAN peak-memory
   budget.** "Aggregate 1.000.000 byte" berarti: jumlah decoded-body
   byte halaman + script yang diterima per scan ≤ 1.000.000. Peak
   memory per scan TIDAK dibatasi oleh L2.
2. **LARANGAN materialisasi bersamaan:** implementasi TIDAK BOLEH
   menahan `html` + `scriptTexts` + `scriptText` (join) + `haystack`
   + `lower` secara bersamaan pada jalur analisis.
3. **Pemindaian incremental:** tiap segmen (halaman, tiap script)
   diperiksa sendiri-sendiri; lowercase hanya per segmen dan dilepas
   sebelum segmen berikutnya; sinyal dikumpulkan sebagai
   boolean/ringkasan, bukan string gabungan. Bila suatu sinyal
   membutuhkan konteks lintas segmen, sinyal itu ditulis ulang
   sebagai pemeriksaan per segmen + agregasi boolean — bukan
   penggabungan string. Tidak ada pengecualian.
4. **Stress test H-RES-05 diperbarui (staging):** fixture halaman
   400.000 + 2 script 300.000 (tepat 1.000.000 byte) DAN varian
   non-ASCII (fixture H-RES-02 A/B/C sebagai konten script — angka
   teoretis UTF-16 2 byte/karakter adalah batas atas; pengukuran
   ASCII saja tidak cukup untuk worst-case), pada concurrency scan
   yang disepakati; acceptance = high-water **RSS** ≤ ambang
   operasional yang ditetapkan SEBELUM tes oleh staging operator.
   Sampai ambang ditetapkan dan tes lolos, peak-memory per scan
   tetap **NOT VERIFIED**.
5. **Limit proses/cgroup tetap menjadi lapisan pertahanan yang
   disyaratkan** bila peak memory adalah requirement (lihat F-026)
   — L2 saja tidak cukup.

**F-028 — klaim live v15 dan persetujuan d85a1e2 tidak memiliki
provenance yang dapat diaudit (Medium, governance /
deployment-evidence gap).** Audit V7 benar: tidak ada deployment
manifest, artifact digest, release record, approval artifact, atau
diff live yang dapat diverifikasi dari repository untuk klaim
v2.3.13 ("live sudah v15, d85a1e2 disetujui Rama 2026-11-08
~02:09 WIB"). Audit V7 mencatat klaim itu sebagai NOT VERIFIED —
bukan salah, bukan benar.

**Keputusan v2.3.14: LIVE VERSION / DEPLOYMENT APPROVAL =
NOT VERIFIED — dipertahankan.** Tidak ada tebakan versi live,
tidak ada perubahan live, tidak ada klaim approval baru. Template/
skema deployment manifest non-secret dipublikasikan sebagai dokumen
desain (`DEPLOYMENT_MANIFEST_TEMPLATE.md`): environment, artifact
version/digest, source commit, timestamp, operator, release/
workflow ID, diff, rollback target (+ verifikasi rollback),
rujukan approval, verifikasi pasca-deploy. **Manifest itu sendiri
tetap KOSONG** (`NOT PROVIDED` di semua field) sampai operator
menyediakannya. Satu manifest per deployment; nilai ditebak =
manifest tidak sah; "disetujui Rama" tanpa tanggal + rujukan yang
dapat diperiksa TIDAK memenuhi `approval_ref`. Manifest yang terisi
TIDAK mengubah status DESIGN REVIEW ONLY dan TIDAK memberi
otorisasi deployment berikutnya — ia hanya membuktikan deployment
yang sudah terjadi.

**F-019 — tetap BLOCKED / NOT VERIFIED (v2.3.14).** Tidak ada fakta
baru. Hanya bukti read-only yang dipakai; `checkLink` TIDAK
di-invoke, tidak ada public share yang dibuat, tidak ada perubahan
runtime state. Kontrol (a)–(e) (§D.4.22) tetap belum satu pun
terpenuhi: versi/digest artifact, action dispatch denial /
pre-handler rejection, UI gate, public invocation denial, dan
egress observation. Deployment tetap BLOCKED.

**F-001..F-005 — tetap blocker implementasi (v2.3.14).**
Requirement implementasi (desain + test ID + regression mapping,
tanpa menyentuh source) — handoff V7 BUKAN izin mengubah source:

| Temuan | Requirement implementasi (desain) | Test ID / bukti staging yang dibutuhkan |
| --- | --- | --- |
| F-001 Critical SSRF | Validasi URL pada input awal, SETIAP hop redirect, dan SETIAP script URL (host/IP/port/skema per hop; tolak IP privat/loopback/link-local/metadata + bentuk non-kanonik) | H-SSRF-01..20 (redirect berantai, DNS rebinding, IPv4+IPv6, jawaban campuran, script-to-internal, IP non-kanonik, userinfo) + log mentah staging + review independen |
| F-002 High response cap | Streamed decoded-byte limit L1 (halaman 400.000, script 300.000) + L2 aggregate 1.000.000 dengan semantik baru F-026/F-027: A1 accepted (pre-append) + A2 transient (worst-case = seluruh body per chunk) + larangan materialisasi bersamaan + pemindaian incremental | H-RES-01..03 (diperbarui: chunk > cap, 3 script paralel chunk besar, peak RSS/heap+external) + H-RES-05 (diperbarui: fixture batas 1.000.000 + varian non-ASCII, high-water RSS ≤ ambang pra-tes) |
| F-003 High total deadline | Satu total deadline per pemeriksaan (RDAP + page + redirect + script); satu sinyal batal bersama; hasil parsial dibuang | H-RES-06 (total-deadline; slow drip; 20 pemeriksaan bersamaan ≤ batas konkurensi) |
| F-004 Medium duplicate race | Atomic DB uniqueness (unique constraint; bukan check-then-insert) | H-CAT-01..03 + bukti migrasi staging (constraint teruji di bawah konkurensi) |
| F-005 Medium authorization | Endpoint ownership + caller authorization (mekanisme diputuskan owner; kandidat `ctx.viewer` SDK) | H-AUTH-01..03 + bukti scoping endpoint runtime |

Setiap perubahan harus memiliki test ID, raw staging log, artifact
digest, serta regression mapping sebelum dapat dinyatakan lolos.
Tidak ada remediasi source atau hasil staging di v2.3.14.

**Clean build provenance — rencana desain (handoff V7 butir 6;
F-009/U-62/U-66).** Bukti VM baru v2.3.14
(`evidence/f009-bun1310-install-typecheck/`, salinan scratch
`/tmp/scratch-site-1310` — repo tidak diubah):

- **Frozen install pada Bun 1.3.10 GAGAL (exit 1):**
  `Unknown lockfile version` — `bun.lock` ter-commit memakai
  `"lockfileVersion": 2`, tidak dikenali 1.3.10. Lockfile di repo
  TIDAK berubah (hash tetap `a7e1457e…`).
- Install non-frozen 1.3.10 berhasil (79 paket, 26,03 detik) tetapi
  menulis ulang lockfile ke v1 di scratch; typecheck exit 0 hanya
  berlaku terhadap lockfile hasil regenerasi itu — typecheck
  terhadap lockfile ter-commit v2 di bawah 1.3.10 tetap
  NOT VERIFIED.
- **Dekompresi transparan TERKONFIRMASI pada 1.3.10** (skrip F-024
  v2.3.13 dijalankan ulang tanpa perubahan: gzip 551 byte wire →
  500.000 byte decoded; br 51 → 500.000; marker offset 400.000) —
  bagian VM dari U-62 kini terjawab; staging + `deflate`/`zstd`
  tetap NOT VERIFIED.
- **Rencana desain penggantian absolute local SDK path**
  (`file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` di
  `site/package.json` — clean builder tanpa `/opt/hatch` tidak dapat
  meng-install sama sekali): (a) terbitkan SDK sebagai paket
  berversi yang dapat diambil builder (registry / URL bertanda
  digest) dan kunci versinya di `package.json` + `bun.lock`;
  ATAU (b) vendorkan artefak SDK berversi ke dalam repo dengan
  digest SHA-256 yang tercatat dan diverifikasi saat install;
  ATAU (c) sediakan artefak SDK yang provenance-nya dapat
  diverifikasi dari sumber resmi runtime provider. Opsi dipilih
  oleh owner + runtime provider; acceptance = frozen install +
  typecheck pada Bun 1.3.10 dari clean external builder, raw
  output, dependency digest, tanpa path `/opt/hatch`. Sampai
  rencana ini dieksekusi dan dibuktikan, F-009 tetap
  NOT REPRODUCIBLE.
- **Keputusan G-G kini punya bukti konkret:** kanonik 1.3.10 dan
  lockfile v2 tidak kompatibel. Opsi: (a) adopsi Bun lebih baru
  sebagai kanonik (1.4.4 membaca lockfile v2; frozen install +
  typecheck terbukti v2.3.9) — butuh keputusan owner + pembaruan
  `packageManager`; atau (b) regenerasi lockfile di bawah 1.3.10
  (v1) dan kunci kanonik tetap 1.3.10 — butuh regenerasi +
  verifikasi ulang resolusi dependensi. Keduanya adalah perubahan
  source dan butuh otorisasi tahap (b) terpisah.

**Staging owners/prereqs — tetap UNASSIGNED (handoff V7 butir 7).**
Peran yang dibutuhkan (tidak satu pun terisi): staging operator;
platform/runtime provider; egress owner (egress policy + deny
policy + logging); DB/runtime owner; alert channel + operator
penerima (ST-12 tidak PASS tanpa pengiriman alert nyata kepada
operator); rollback owner. STAGE-P01..P12 tetap **BLOCKED** sampai
bukti masing-masing tersedia; STAGE-P06 bersyarat (filesystem harus
diidentifikasi dulu; bila NFS, tes NFS wajib). Tidak ada gate yang
dilabeli READY di v2.3.14.

**Provenance suite lama — dipertahankan (handoff V7 butir 8).**
Klaim bundle asli 9/9 × 4 TIDAK diubah: bundle asli hanya
membuktikan 1 log lengkap + duplikat + tail; bundle suplemen
RUN=1..4 tetap menjadi empat log lengkap yang tersedia; log gagal
awal SU-T5 TIDAK direkonstruksi (tetap NOT PRESERVED). Semua bukti
VM baru v2.3.14 dilabeli VM dan dipisah ketat dari staging — tidak
ada bukti VM yang diklaim sebagai bukti staging.

**Carry-forward (handoff V7 butir 9).** F-018, F-006b/F-006c,
U-38/U-33/U-41/U-43/U-44/U-45/U-46 hanya berubah status berdasarkan
bukti atau keputusan owner yang dapat dilacak — tidak ada perubahan
status di v2.3.14. U-46 tetap keputusan owner yang belum ada (opsi
(a)/(b) tetap terbuka; implementasi pensinyalan tetap DIBLOKIR).
Tidak ada detail narasi insiden atau data wallet apa pun di dokumen
revisi ini.

**Risiko baru v2.3.14 (§G):** U-63 (F-026 — transient chunk tidak
dibatasi pre-append accounting; addressed desain, staging belum),
U-64 (F-027 — L2 bukan batas peak memory; addressed desain,
staging belum), U-65 (F-028 — provenance deployment live tidak
dapat diaudit; NOT VERIFIED), U-66 (lockfile v2 tidak dapat dibaca
Bun kanonik 1.3.10 — frozen install gagal; keputusan G-G
dibutuhkan). **U-62 DIPERSEMPIT:** dekompresi VM pada 1.3.10
terkonfirmasi gzip/br — sisa NOT VERIFIED adalah perilaku di
runtime artifact staging + `deflate`/`zstd`. U-38/U-33/U-41/U-43/
U-44/U-45/U-46 dipertahankan tanpa perubahan status.

**Gate konkret berikutnya (v2.3.14 → v2.3.15).** Revisi ini bukan
pengulangan status: ia mencabut klaim "overhead 0 byte" sebagai
pernyataan umum dan memisah anggaran A1/A2 dengan bukti eksperimen
VM pada Bun kanonik 1.3.10 (F-026), menyatakan L2 sebagai
input-body budget dengan larangan materialisasi bersamaan +
pemindaian incremental yang terukur lebih hemat memori (F-027),
mempertahankan LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED
dengan template manifest deployment (F-028), mengonfirmasi
dekompresi Bun 1.3.10 sekaligus membuktikan frozen install 1.3.10
gagal karena lockfile v2 (F-009/U-62/U-66). Gate berikutnya dan
prasyaratnya: **(G-A)** keputusan owner atas scope perubahan
source (F-020); **(G-B)** bukti runtime F-019 (versi/digest +
kontrol disabled (a)–(e)); **(G-C)** keputusan tenancy F-018
(pernyataan resmi provider tentang scope `ctx.db`); **(G-D)**
keputusan U-46; **(G-E)** staging tersedia + peran UNASSIGNED
terisi; **(G-F)** keputusan cache F-022 — owner menerima cabang
pilihan (rekomendasi) vs alternatif; **(G-G)** keputusan Bun
F-009 — kanonik 1.3.10 vs 1.4.4 (kini dengan bukti
inkompatibilitas lockfile v2); **(G-H)** eksekusi harness
H-RES-02/03/05 yang sudah dikoreksi — prasyarat: otorisasi
implementasi tahap (b) (G-A) + staging tersedia (G-E) +
verifikasi ulang perilaku Bun pada versi kanonik (U-62, bagian
staging); **(G-I) BARU** stress test memori H-RES-03/05 pada
staging Bun 1.3.10 (chunk > cap, 3 script paralel, fixture batas
1.000.000 + varian non-ASCII, high-water RSS ≤ ambang pra-tes) +
proses deployment manifest terisi untuk setiap deployment
(F-028). Pemicu revisi v2.3.15: keputusan owner atas
G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU staging
tersedia (G-E), ATAU audit independen V8 — mana pun yang datang
dulu. Tidak ada revisi baru yang hanya mengulang status v2.3.14.

**Hard gates — ditegaskan kembali (v2.3.14):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah
(HOLD perubahan source mirror sampai klarifikasi F-020 tetap
berlaku), no production testing (termasuk tidak memanggil
`checkLink`). F-001..F-005, F-016/F-017/F-022, F-018 tetap
OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..20 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup.

### D.4.26 Jawaban atas audit independen V8 — F-029, F-030 + Handoff §9 (BARU, v2.3.15)

**F-029 — perbandingan peak memory F-027 tidak valid secara
metodologis (Medium, evidence-methodology flaw).** Audit V8 benar:
eksperimen v2.3.14 (`evidence/f027-derived-strings/exp-derived.ts`)
menjalankan pola A dan B berurutan dalam satu proses; tiga string
turunan A (`scriptText`, `haystack`, `lower`) tetap hidup saat
baseline B diambil (komentar A8 skrip itu sendiri menyatakannya);
pengukuran hanya checkpoint `process.memoryUsage()` setelah GC —
bukan OS high-water mark. Rasio penghematan 4,5–5,4× yang
disimpulkan dari perbandingan itu tidak didukung eksperimen yang
valid.

Eksperimen VM baru v2.3.15 (`evidence/f029-memory-methodology/` —
`run-f029.ts` parent harness + `exp-pattern.ts` satu pola per
proses; Bun 1.3.10 `1.3.10+30e609e08` DAN Bun 1.4.4
`1.4.4+38afee6c8`; `checkLink` TIDAK di-invoke) memperbaiki
metodologi sesuai mitigasi V8 butir demi butir:

- **Proses terpisah:** setiap run adalah proses anak baru (PID
  baru, baseline bersih, binary Bun yang sama, flags/environment
  identik, input identik). Parent memverifikasi 60 PID berbeda
  dari 60 run per versi Bun, 0 gagal; tidak ada objek atau
  allocator state pola A pada baseline pola B — secara konstruksi,
  bukan klaim.
- **Metrik utama = VmHWM** (OS high-water RSS dari
  `/proc/self/status`, delta terhadap baseline tiap proses) — bukan
  checkpoint post-GC. RSS saat ini, external, dan heapUsed dicatat
  sebagai pendamping.
- **Forced-GC dan natural-GC dipisah** dan tidak pernah dicampur
  (forced: `Bun.gc(true)` di tiap titik ukur; natural: tanpa GC
  eksplisit).
- **Pengulangan:** 5 run per kombinasi (2 pola × 3 fixture × 2 mode
  GC = 12 kombinasi × 5 = 60 run anak per versi Bun); dilaporkan
  median + rentang [min..max].
- **Fixture non-ASCII:** `nonascii` (U+00E9, jumlah karakter sama
  — 1.000.000 karakter, ~2.000.000 byte UTF-8) DAN
  `nonascii-bytes` (U+00E9, setengah jumlah karakter — 500.000
  karakter = 1.000.000 byte UTF-8, batas byte L2 yang sebenarnya).

**Hasil apa adanya (median VmHWM delta, 5 run per kombinasi):**

| Bun | Fixture | GC | A | B | Rasio A/B |
| --- | --- | --- | --- | --- | --- |
| 1.3.10 | ascii | forced | 5.009.408 | 3.194.880 | 1,57× |
| 1.3.10 | ascii | natural | 4.911.104 | 3.723.264 | 1,32× |
| 1.3.10 | nonascii | forced | 5.443.584 | 3.325.952 | 1,64× |
| 1.3.10 | nonascii | natural | 5.042.176 | 3.854.336 | 1,31× |
| 1.3.10 | nonascii-bytes | forced | 3.137.536 | 1.667.072 | 1,88× |
| 1.3.10 | nonascii-bytes | natural | 2.936.832 | 2.338.816 | 1,26× |
| 1.4.4 | ascii | forced | 4.091.904 | 2.355.200 | 1,74× |
| 1.4.4 | ascii | natural | 4.583.424 | 3.854.336 | 1,19× |
| 1.4.4 | nonascii | forced | 4.038.656 | 2.412.544 | 1,67× |
| 1.4.4 | nonascii | natural | 4.669.440 | 3.936.256 | 1,19× |
| 1.4.4 | nonascii-bytes | forced | 2.207.744 | 1.368.064 | 1,61× |
| 1.4.4 | nonascii-bytes | natural | 2.854.912 | 2.420.736 | 1,18× |

**Rasio terkoreksi keseluruhan: 1,18–1,88× (median VmHWM).**
**[PEMBARUAN v2.3.16 (F-031): rentang ini dinyatakan SUPERSEDED
oleh pengukuran ulang exact-byte 1,13–1,84× — lihat §D.4.27.
Angka di bagian ini adalah catatan sejarah v2.3.15.]**
Rasio 4,5–5,4× v2.3.14 **TIDAK TERKONFIRMASI** — angka itu adalah
artefak baseline B yang tercemar, bukan efek pola incremental.
Angka lama dinyatakan **NOT VERIFIED** dan **TIDAK BOLEH** dipakai
sebagai sizing/cgroup acceptance atau kapasitas operasional.
Koreksi ini dicatat pada §D.4.25 (F-027), tabel perubahan v2.3.14
butir 2, dan paragraf penutup — bukan dihapus diam-diam.

**Temuan lanjutan dari eksperimen terkoreksi:**

- Manfaat incremental **nyata tetapi lebih kecil**: pola B selalu
  lebih rendah dari pola A pada fixture+GC yang sama — tetapi
  rasionya 1,18–1,88×, bukan 4,5–5,4×.
- **Manfaat bergantung pada GC:** forced-GC 1,57–1,88×;
  natural-GC (perilaku runtime realistis) hanya 1,18–1,32×,
  karena segmen yang dilepas pola B tetap menahan halaman
  allocator sampai GC berjalan. Desain TIDAK BOLEH mengasumsikan
  angka forced-GC sebagai perilaku runtime nyata.
- **Karakter hidup 3,60× DIPERTAHANKAN sebagai character
  accounting** (3.599.936 karakter hidup pada titik analisis pola
  A — deterministik, sama di kedua versi), BUKAN klaim
  peak-memory.
- **`heapUsed` tetap bukan oracle di Bun 1.3.10:** delta heapUsed
  = 0 pada SEMUA 60 run anak 1.3.10, sementara VmHWM naik
  1,7–5,4 MB. Ambang acceptance WAJIB memakai VmHWM/RSS
  (+ external), per versi runtime.
- **Fixture non-ASCII:** pada jumlah karakter yang sama, peak
  VmHWM non-ASCII ≈ ASCII (penyimpanan string UTF-16 per code
  unit); pada batas byte L2 yang sama, konten non-ASCII hanya
  500.000 karakter sehingga peak absolutnya lebih rendah
  (A: 2,2–3,1 MB vs 4,0–5,4 MB ASCII). Worst-case memori string
  ditentukan jumlah code unit, bukan byte UTF-8.
- **Deteksi tidak hilang:** `asksConnect = true` pada SEMUA 120
  run anak (kedua pola, semua fixture, kedua mode GC, kedua versi
  Bun).
- **Konkurensi TIDAK disimulasikan di VM** (satu scan per proses
  adalah inti koreksi metodologi) — oracle konkurensi tetap
  staging H-RES-05.

**Keputusan desain yang mengikat (v2.3.15):**

1. Rasio 4,5–5,4× v2.3.14 **DICABUT** sebagai klaim kuantitatif.
   Rasio yang didukung eksperimen terkoreksi: **1,18–1,88×**
   (median VmHWM), dengan catatan angka forced-GC BUKAN perilaku
   runtime natural. Sampai ada bukti staging, TIDAK ADA angka
   penghematan yang boleh dipakai sebagai sizing/cgroup acceptance.
2. **Aturan desain v2.3.14 TETAP BERLAKU dan tidak dilemahkan
   oleh koreksi rasio:** L2 tetap input-body budget; LARANGAN
   materialisasi bersamaan tetap mengikat; pemindaian incremental
   tetap disyaratkan — karena manfaatnya nyata DAN karena larangan
   itu membatasi worst-case (3,60× karakter hidup), bukan karena
   rasio lama.
3. **Stress test H-RES-05 diperbarui (staging):** acceptance =
   high-water RSS/VmHWM ≤ ambang pra-tes, diukur per proses scan
   pada Bun kanonik, pada KEDUA mode GC (forced dan natural
   dilaporkan terpisah), fixture batas ASCII + non-ASCII
   byte-matched (500.000 karakter U+00E9 = 1.000.000 byte UTF-8),
   dan concurrency scan yang disepakati.
4. **Kriteria penerimaan F-029 (untuk audit V9):** setiap pola
   pada PID baru (60 PID berbeda per versi, terverifikasi parent
   harness); tidak ada objek/allocator state pola A pada baseline
   B; log mentah memuat versi Bun, input, flags, baseline,
   high-water RSS, external, dan hasil deteksi — terpenuhi
   (`run-1310-f029.txt`, `run-144-f029.txt`).

**F-030 — lockfile ter-commit tidak kompatibel dengan Bun kanonik
(Medium, confirmed build reproducibility blocker).** Audit V8
benar: `packageManager` menyatakan Bun 1.3.10
(`site/package.json:4`), sementara lockfile memakai version 2
(`site/bun.lock:2`); log frozen install 1.3.10 menampilkan
`Unknown lockfile version` dan gagal. Bukti 1.3.10 TIDAK diulang
di revisi ini (log F-009 v2.3.14 sudah valid; tidak ada perubahan
material yang membenarkan pengulangan — protokol butir 6).

Matriks kompatibilitas baru v2.3.15
(`evidence/f030-bun-compatibility/` — salinan scratch
`/tmp/scratch-site-f030-144`, repo tidak diubah):

| Dimensi | Bun 1.3.10 (kanonik) | Bun 1.4.4 (`1.4.4+38afee6c8`) |
| --- | --- | --- |
| Membaca lockfile v2 | **TIDAK** — `Unknown lockfile version` | **YA** |
| Frozen install | **GAGAL exit 1** (log F-009) | **BERHASIL exit 0**, 79 paket, lockfile TIDAK berubah (hash tetap `a7e1457e…`) — log baru `run-144-frozen-install-typecheck.txt` |
| Typecheck (client + server) | **NOT VERIFIED** terhadap lockfile v2 (exit 0 hanya vs lockfile regenerasi v1 di scratch) | **BERHASIL exit 0** terhadap lockfile ter-commit v2 (log baru) |
| Build penuh | NOT RUN (house rules) | NOT RUN (house rules) |
| SDK path `file:/opt/hatch/...` | Install berhasil HANYA karena path ada di VM ini | Sama — path ada di VM ini |
| Clean external builder (tanpa `/opt/hatch`) | **TIDAK DAPAT install** — gagal di lockfile v2 sebelum SDK path | **TIDAK DAPAT install** — lockfile lolos, SDK path absolut tidak ada |
| Dependency digest / provenance | NOT VERIFIED | NOT VERIFIED |

Tarball SDK diverifikasi ulang: ada di VM ini (2.051.070 byte,
SHA-256 `f2cb7b25…` — SAMA dengan v2.3.9); provenance tetap
NOT VERIFIED. **Versi Bun minimum yang menerima lockfile v2:
NOT VERIFIED** — hanya 1.3.10 (menolak) dan 1.4.4 (menerima) yang
terverifikasi; sweep versi di antaranya tidak dilakukan (keputusan
G-G hanya membutuhkan satu versi kompatibel yang terverifikasi).

**Trade-off Opsi A vs Opsi B (keduanya PROPOSAL — HOLD sampai
persetujuan implementasi terpisah; TIDAK ADA perubahan source/
lockfile di revisi ini):**

- **Opsi A — naikkan Bun kanonik ke versi yang kompatibel lockfile
  v2 (mis. 1.4.4):** ubah `packageManager`; `bun.lock` tetap v2;
  resolusi dependensi tidak berubah; frozen install + typecheck
  1.4.4 sudah dua kali terkonfirmasi. Kerugian: SEMUA bukti VM
  1.3.10 harus dibaca ulang sebagai bukti versi lama (perilaku
  chunk/dekompresi/GC 1.4.4 terbukti berbeda dari 1.3.10 di
  F-026/F-029); runtime staging harus memakai versi baru itu.
- **Opsi B — regenerasi lockfile dengan Bun 1.3.10 (v1), kunci
  kanonik tetap 1.3.10:** ubah `bun.lock` ke v1; `packageManager`
  tetap; bukti VM 1.3.10 tetap berlaku. Kerugian: resolusi
  dependensi HARUS diverifikasi ulang paket-per-paket (perbedaan
  versi transitif vs lockfile v2 belum diperiksa); frozen install
  + typecheck terhadap lockfile hasil regenerasi belum dibuktikan
  sebagai satu alur bersih.
- **Penggantian absolute local SDK path (wajib di KEDUA opsi):**
  (1) paket ter-publish berversi (registry/URL bertanda digest);
  (2) vendorkan artefak SDK berversi ke repo dengan digest SHA-256
  tercatat; (3) artefak SDK dari sumber resmi runtime provider
  dengan provenance yang dapat diverifikasi. Opsi dipilih owner +
  runtime provider. Acceptance: frozen install + typecheck pada
  Bun kanonik dari clean external builder (tanpa `/opt/hatch`),
  raw output + dependency digest tercatat, lockfile tidak berubah.

Sampai keputusan Bun + penggantian SDK path + pembuktian
clean-builder selesai, **F-009 tetap NOT REPRODUCIBLE** dan
**F-030 tetap CONFIRMED BLOCKER**.

**F-028 — tetap NOT VERIFIED (v2.3.15).** Tidak ada fakta baru.
LIVE VERSION / DEPLOYMENT APPROVAL tetap NOT VERIFIED; semua field
manifest tetap NOT PROVIDED; tidak ada tebakan versi live, tidak
ada perubahan live, tidak ada klaim approval baru. Template
manifest (`DEPLOYMENT_MANIFEST_TEMPLATE.md`) tetap kosong sampai
operator menyediakannya.

**F-019 — tetap BLOCKED / NOT VERIFIED (v2.3.15).** Tidak ada fakta
baru. Hanya bukti read-only; `checkLink` TIDAK di-invoke, tidak
ada public share yang dibuat, tidak ada perubahan runtime state.
Kontrol (a)–(e) (§D.4.22) tetap belum satu pun terpenuhi:
versi/digest artifact, action dispatch denial / pre-handler
rejection, UI gate, public invocation denial, dan egress
observation. Deployment tetap BLOCKED.

**F-001..F-005 — tetap blocker implementasi (v2.3.15).** Tidak ada
perubahan status; requirement implementasi (desain + test ID +
regression mapping, tanpa menyentuh source) dipertahankan dari
§D.4.25. Handoff V8 BUKAN izin mengubah source. Satu pembaruan
spesifikasi: H-RES-05 kini mensyaratkan pengukuran high-water
RSS/VmHWM pada kedua mode GC (forced dan natural, dilaporkan
terpisah) + fixture non-ASCII byte-matched — lihat F-029 di atas.

**Staging owners/prereqs — tetap UNASSIGNED (handoff V8 butir 6),
dilengkapi per STAGE-P01..P12.** Tidak satu pun peran terisi dan
tidak ada nama owner yang dikarang. Pelengkapan v2.3.15 (tabel di
bawah ini; §D.4.19a tetap menjadi inventaris kepemilikan dasar
v2.3.10): tiap STAGE-P kini memiliki prasyarat, prosedur aman,
PASS/FAIL oracle, dan bukti yang harus dihasilkan:

| Gate | Prasyarat | Prosedur aman | PASS/FAIL oracle | Bukti yang harus dihasilkan |
| --- | --- | --- | --- | --- |
| STAGE-P01 runtime artifact (versi + `bun:ffi`) | Staging operator + runtime provider ditunjuk; versi runtime staging tercatat | Probe read-only `bun:ffi` → libc `flock`/`pidfd_open` di dalam sandbox artifact (tanpa mengubah artifact) | PASS: binding terbukti pada runtime yang sama dengan produksi; FAIL: binding tidak tersedia/berbeda → implementasi flock/pidfd DIBLOKIR | Log probe mentah + versi runtime + tanggal |
| STAGE-P02 filesystem direktori lock | Lokasi lock diidentifikasi; `df`/`mount` staging tersedia | Uji FLK-T1..T8 diulang di staging pada filesystem produksi | PASS: flock saling mengecualikan + lepas saat proses mati; FAIL: filesystem tidak mendukung → lock WAJIB pindah ke filesystem lokal | Output `df`/`mount` + log FLK mentah |
| STAGE-P03 isolasi user layanan | User layanan staging didefinisikan; direktori lock 0700 | Uji OPS-T1/T6 (direktori 0700 + isolasi antar-user) | PASS: user lain tidak dapat membaca/mengubah lock; FAIL: isolasi tidak ditegakkan kernel | Log OPS mentah + `ls -ld` direktori |
| STAGE-P04 supervisor/deployment | Dokumentasi supervisor tersedia (restart otomatis + kill process group + apakah mount dapat diganti saat deploy) | Verifikasi SUP-01: dokumen menyatakan ketiga perilaku | PASS: ketiganya dinyatakan + jalur kill supervisor terbukti; FAIL: satu pun tidak dinyatakan → residual U-22 diterima tertulis atau DIBLOKIR | Dokumen supervisor + log uji kill |
| STAGE-P05 egress policy | Egress owner ditunjuk; topologi egress + daftar prefix NAT64/DNS64 (atau pernyataan tidak ada) didokumentasikan | Uji staging dengan prefix NSP yang didokumentasikan (S-49/S-50) | PASS: guard mengekstrak IPv4 tertanam untuk semua prefix yang dipakai; FAIL: prefix tidak didokumentasikan → U-11 tetap TERBUKA | Dokumen egress + log S-49/S-50 |
| STAGE-P06 filesystem (NFS) | Filesystem staging diidentifikasi dulu (prasyarat P02) | Bila NFS: uji FLK-07 (flock di NFS + partition/restart); bila bukan NFS: gate ini NOT APPLICABLE dengan bukti identifikasi | PASS: flock NFS terbukti saling mengecualikan ATAU filesystem bukan NFS (terbukti); FAIL: NFS tanpa bukti → lock dilarang di NFS | Identifikasi filesystem + log FLK-07 bila relevan |
| STAGE-P07 worker-signaling fallback | Keputusan U-46 tertulis (opsi (a) atau (b)); pid_max produksi tercatat (STAGE-P08) | Bila opsi (a): fallback numeric-kill hanya dengan persetujuan tertulis per deployment; bila opsi (b): desain alternatif pengganti selesai + terbukti | PASS: keputusan tertulis + prasyarat terpenuhi; FAIL: tidak ada keputusan → pensinyalan DIBLOKIR | Keputusan tertulis owner (opsi + tanggal) + pid_max + log PIDFD |
| STAGE-P08 pid_max + kuantifikasi U-41 | pid_max runtime produksi tercatat | Hitung P tabrakan starttime dari pid_max (rumus PIDFD-T9) | PASS: P ≤ 1e-6; kondisional ≤ 1e-5 (persetujuan owner tertulis); BLOCK: > 1e-5 | pid_max + perhitungan P |
| STAGE-P09 staging DB + runtime | DB/runtime owner ditunjuk; staging DB terisolasi dari produksi; skema + migrasi staging tersedia | Uji H-CAT-01..03 (atomic uniqueness di bawah konkurensi) + H-TEN-01..05 (dua principal) | PASS: constraint + filter kepemilikan terbukti di bawah konkurensi; FAIL: satu pun gagal → migrasi DIBLOKIR | Log H-CAT/H-TEN mentah + bukti migrasi staging |
| STAGE-P10 rate limit + konkurensi | Batas konkurensi scan disepakati; ambang RSS pra-tes ditetapkan SEBELUM tes | Uji H-RES-01..06 (termasuk H-RES-05 diperbarui v2.3.15: kedua mode GC + fixture non-ASCII byte-matched) | PASS: semua H-RES lolos + high-water RSS ≤ ambang pra-tes; FAIL: satu pun gagal → cutover DIBLOKIR | Log H-RES mentah + ambang pra-tes tertulis |
| STAGE-P11 alert channel + operator penerima | Alert channel + operator penerima ditunjuk (nama/jabatan, bukan "nanti") | Uji ST-12: picu kondisi alert, ukur latensi sampai operator menerima (ST-12-LAT-01..03: ≤ 5 menit, memuat timestamp + lock path + identitas proses) | PASS: alert diterima operator ≤ 5 menit dengan isi lengkap; FAIL: alert tidak sampai / tidak lengkap / tanpa kanal → **ST-12 NOT RUN, bukan PASS** | Bukti penerimaan alert oleh operator (timestamp kirim + terima) |
| STAGE-P12 audit trail | Mekanisme audit (auditd/eBPF/log) tersedia di staging | Uji OPS-T5: hapus/ganti file lock sebagai root, verifikasi jejak audit tercatat | PASS: jejak audit tercatat + dapat ditelusuri ke pelaku/waktu; FAIL: tidak ada jejak → deteksi pasca-kejadian tidak ada (U-43 tetap) | Log audit mentah |

STAGE-P01..P12 tetap **BLOCKED** sampai bukti masing-masing
tersedia; tidak ada gate yang dilabeli READY di v2.3.15.

**Provenance suite lama — dipertahankan (handoff V8 butir 7).**
Klaim bundle asli 9/9 × 4 TIDAK diubah: bundle asli hanya
membuktikan 1 log lengkap + duplikat + tail; bundle suplemen
RUN=1..4 tetap menjadi empat log lengkap yang tersedia; log gagal
awal SU-T5 TIDAK direkonstruksi (tetap NOT PRESERVED). Semua bukti
VM baru v2.3.15 dilabeli VM dan dipisah ketat dari staging — tidak
ada bukti VM yang diklaim sebagai bukti staging. Tidak ada
pengulangan SU-T1..SU-T9 di revisi ini (tidak ada perubahan
implementasi/harness suite lama yang membenarkan rerun).

**Carry-forward (handoff V8 butir 7).** F-018, F-006b/F-006c,
U-38/U-33/U-41/U-43/U-44/U-45/U-46 hanya berubah status berdasarkan
bukti atau keputusan owner yang dapat dilacak — tidak ada perubahan
status di v2.3.15. U-46 tetap keputusan owner yang belum ada (opsi
(a)/(b) tetap terbuka; implementasi pensinyalan tetap DIBLOKIR).
Tidak ada detail narasi insiden atau data wallet apa pun di dokumen
revisi ini.

**Risiko baru v2.3.15 (§G):** U-67 (F-029 — rasio incremental
v2.3.14 tidak valid; manfaat terkoreksi 1,18–1,88× dan bergantung
GC) dan U-68 (F-030 — lockfile v2 vs Bun kanonik + SDK path
absolut; keputusan G-G + penggantian SDK path dibutuhkan).
**U-64 DIPERBARUI** (rasio terkoreksi; aturan desain tetap) dan
**U-66 DIPERBARUI** (matriks kompatibilitas + trade-off Opsi A/B).
U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa perubahan
status.

**Gate konkret berikutnya (v2.3.15 → v2.3.16).** Revisi ini bukan
pengulangan status: ia memperbaiki metodologi perbandingan memori
F-027 dengan bukti eksperimen VM baru pada Bun kanonik 1.3.10 DAN
1.4.4 (F-029) dan mengoreksi klaim kuantitatif 4,5–5,4× menjadi
1,18–1,88× (median VmHWM), menyajikan matriks kompatibilitas
Bun/lockfile/SDK path dengan trade-off Opsi A vs Opsi B yang
keduanya tetap PROPOSAL (F-030), mempertahankan LIVE VERSION /
DEPLOYMENT APPROVAL = NOT VERIFIED (F-028) dan F-019 BLOCKED,
serta melengkapi prasyarat/prosedur/oracle/bukti STAGE-P01..P12
tanpa mengarang owner. Gate berikutnya dan prasyaratnya:
**(G-A)** keputusan owner atas scope perubahan source (F-020);
**(G-B)** bukti runtime F-019 (versi/digest + kontrol disabled
(a)–(e)); **(G-C)** keputusan tenancy F-018 (pernyataan resmi
provider tentang scope `ctx.db`); **(G-D)** keputusan U-46;
**(G-E)** staging tersedia + peran UNASSIGNED terisi; **(G-F)**
keputusan cache F-022 — owner menerima cabang pilihan
(rekomendasi) vs alternatif; **(G-G)** keputusan Bun F-009 —
kanonik 1.3.10 vs 1.4.4 (kini dengan matriks kompatibilitas +
trade-off Opsi A/B); **(G-H)** eksekusi harness H-RES-02/03/05
yang sudah dikoreksi — prasyarat: otorisasi implementasi tahap
(b) (G-A) + staging tersedia (G-E) + verifikasi ulang perilaku
Bun pada versi kanonik (U-62, bagian staging); **(G-I)** stress
test memori H-RES-03/05 pada staging Bun 1.3.10 (chunk > cap,
3 script paralel, fixture batas 1.000.000 + varian non-ASCII
byte-matched, high-water RSS ≤ ambang pra-tes, kedua mode GC) +
proses deployment manifest terisi untuk setiap deployment (F-028);
**(G-J) BARU** keputusan reproduksibilitas F-030 — prasyarat:
keputusan owner G-G (Opsi A vs Opsi B) + penggantian SDK path
(paket ter-publish/vendorkan/sumber resmi) + bukti clean-builder
(frozen install + typecheck exit 0, lockfile tidak berubah,
dependency digest tercatat, tanpa `/opt/hatch`). Pemicu revisi
v2.3.16: keputusan owner atas G-A/G-C/G-D/G-F/G-G, ATAU bukti
runtime G-B, ATAU staging tersedia (G-E), ATAU audit independen
V9 — mana pun yang datang dulu. Tidak ada revisi baru yang hanya
mengulang status v2.3.15.

**Hard gates — ditegaskan kembali (v2.3.15):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah
(HOLD perubahan source mirror sampai klarifikasi F-020 tetap
berlaku), no production testing (termasuk tidak memanggil
`checkLink`). F-001..F-005, F-016/F-017/F-022, F-018 tetap
OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..20 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup.

### D.4.27 Jawaban atas audit independen V9 — F-031, F-032 + Handoff §9 (BARU, v2.3.16)

**F-031 — fixture F-029 tidak tepat pada batas byte yang
dinyatakan (Low, test-fixture accuracy defect).** Audit V9 benar:
skrip v2.3.15 mengurangi filler 40 karakter (halaman) dan 20
karakter (tiap script), padahal marker ASCII sebenarnya 33 / 15 /
13 byte — ASCII terukur 999.981 byte, non-ASCII byte-matched
999.901 byte, non-ASCII char-matched 1.999.901 byte (bukan
~2.000.000). Klaim "tepat di batas 1 MB" tidak akurat; fixture
itu tidak menguji kondisi tepat cap maupun cap+1.

Perbaikan v2.3.16 (`evidence/f029-memory-methodology/` —
`exp-pattern.ts` ditulis ulang, `run-f029.ts` diperbarui;
README paket diperbarui):

- **Pengukuran TextEncoder per segmen:** setiap segmen diukur
  dengan `TextEncoder().encode(segment).byteLength`; filler
  dibangun dari panjang marker yang TERUKUR (33 / 15 / 13,
  total 61 byte); total byte di-assert SEBELUM scan
  (assert per segmen + assert total). Tidak ada perkiraan
  jumlah karakter yang dipakai sebagai klaim byte.
- **Kompensasi byte ganjil:** filler U+00E9 = 2 byte dan target
  filler per segmen bisa ganjil — kekurangan 0–1 byte per
  segmen ditutup dengan SATU karakter pad ASCII `'A'` (1 byte,
  filler inert). Pada target default, `nonascii-bytes` =
  499.968 karakter U+00E9 + 3 pad ASCII + 61 marker =
  **500.032 karakter, tepat 1.000.000 byte**.
- **Varian cap−1 / cap+1:** argumen baru `--bytes N`
  (1..2.000.000) menggeser target agregat; halaman =
  N−600.000, tiap script = 300.000.
- **Urutan metodologi dipertahankan dari v2.3.15:** baseline
  bersih diambil SEBELUM segmen dibangun; segmen dibangun
  LAZILY per pola (pola A ketiganya sekaligus; pola B satu
  per satu, dilepas sebelum berikutnya). Dua draf yang
  melanggar urutan ini tertangkap saat pengembangan (fixture
  sebelum baseline → delta menyusut ke 0 dan rasio
  "Infinityx"; semua segmen di muka untuk pola B → B melebihi
  A pada satu kombinasi, rasio 0,93×); log trial keduanya
  DIBUANG tanpa di-commit dan dicatat di README F-029.
- **Overhead pengukuran (dicatat jujur):** tiap segmen
  di-encode satu kali untuk mengukurnya; salinan Uint8Array
  transien (maks. satu segmen, ≤ 400.000 byte) ikut terhitung
  dalam VmHWM dan berlaku sama untuk kedua pola. Delta absolut
  v2.3.16 sedikit lebih besar dari v2.3.15 karena overhead
  ini; rasio yang dibandingkan tetap dalam pita yang sama.

**Bukti baru v2.3.16 (rerun DIBENARKAN — harness berubah,
protokol butir 6):**

- Rerun penuh: `run-1310-f031-f032.txt` dan
  `run-144-f031-f032.txt` (839 baris masing-masing) — 60 run
  anak per versi Bun (1.3.10 `1.3.10+30e609e08`, diunduh ulang
  dari rilis resmi oven-sh/bun `bun-v1.3.10`, zip 39.328.732
  byte; 1.4.4 `1.4.4+38afee6c8`), 0 gagal, 60 PID berbeda
  terverifikasi per versi, `asksConnect = true` pada SEMUA
  120 run anak, `utf8Bytes` terukur 1.000.000 pada 40 RESULT
  dan 1.999.939 pada 20 RESULT per log.
- Varian byte: `run-144-f031-byte-variants.txt` (14 run, Bun
  1.4.4, gc natural) — pola A dan B × `ascii` dan
  `nonascii-bytes` × `--bytes` 999.999 / 1.000.000 /
  1.000.001, plus pola A dan B × `nonascii` default; semua
  exit 0 dan total byte TEPAT sama dengan target.
- Log v2.3.15 DIPERTAHANKAN sebagai bukti historis; klaim
  batas-byte-nya TIDAK dibawa ulang.

**Hasil terukur ulang (median VmHWM delta):**

| Bun | Fixture | GC | A median | B median | Rasio A/B |
| --- | --- | --- | --- | --- | --- |
| 1.3.10 | ascii | forced | 6.336.512 | 3.899.392 | 1,63× |
| 1.3.10 | ascii | natural | 5.865.472 | 4.739.072 | 1,24× |
| 1.3.10 | nonascii | forced | 8.073.216 | 4.849.664 | 1,66× |
| 1.3.10 | nonascii | natural | 8.138.752 | 6.615.040 | 1,23× |
| 1.3.10 | nonascii-bytes | forced | 4.685.824 | 2.543.616 | 1,84× |
| 1.3.10 | nonascii-bytes | natural | 4.575.232 | 3.837.952 | 1,19× |
| 1.4.4 | ascii | forced | 5.300.224 | 3.379.200 | 1,57× |
| 1.4.4 | ascii | natural | 5.804.032 | 5.140.480 | 1,13× |
| 1.4.4 | nonascii | forced | 5.349.376 | 3.149.824 | 1,70× |
| 1.4.4 | nonascii | natural | 7.897.088 | 6.176.768 | 1,28× |
| 1.4.4 | nonascii-bytes | forced | 3.063.808 | 2.031.616 | 1,51× |
| 1.4.4 | nonascii-bytes | natural | 4.603.904 | 3.739.648 | 1,23× |

**Rasio terukur ulang keseluruhan: 1,13–1,84× (median VmHWM).**
Rentang v2.3.15 (1,18–1,88×) TIDAK direproduksi secara eksak
dan dinyatakan **SUPERSEDED** — ujung bawah kini 1,13×
(1.4.4 ascii natural), ujung atas 1,84× (1.3.10
nonascii-bytes forced). Perbedaan ini kecil dan dalam
sebaran antar-run, tetapi dilaporkan apa adanya, bukan
dibulatkan agar cocok. Yang TIDAK berubah: pola B lebih
rendah dari pola A pada SEMUA 12 kombinasi di kedua versi;
forced-GC 1,51–1,84× vs natural-GC 1,13–1,28× (manfaat
incremental tetap bergantung GC — angka forced-GC BUKAN
perilaku runtime natural). Karakter hidup 3,60×
dipertahankan sebagai character accounting (ascii:
3.600.005; nonascii-bytes: 1.800.116 / 500.032). `heapUsed`
tetap bukan oracle di Bun 1.3.10 (delta = 0 pada SEMUA 60
run anak 1.3.10 — direproduksi v2.3.16). Rasio ini tetap
HANYA bukti VM atas pola simulasi — BUKAN sizing/cgroup
acceptance, BUKAN acceptance staging.

**Kriteria penerimaan F-031 (audit V9 §9 butir 1) — terpenuhi:**
fixture ASCII dan non-ASCII byte-matched tepat 1.000.000
byte (terukur, di-assert); varian cap−1 dan cap+1 terukur
(999.999 / 1.000.001); marker ASCII diperhitungkan (33/15/13);
raw output mencatat byte aktual per segmen dan total (baris
`bytes:` di setiap child + `segmentBytes` di RESULT).

**F-032 — harness dapat melaporkan sukses dengan nol run (Low,
harness false-success path).** Audit V9 benar: `RUNS`
v2.3.15 diparsing `Number(...)` tanpa validasi; `--runs 0`
atau non-numerik menghasilkan nol child run tetapi parent
tetap mencetak "all child runs ok" dan keluar 0.

Perbaikan v2.3.16 (`run-f029.ts` ditulis ulang; paket bukti
baru `evidence/f032-harness-validation/`):

- `--runs` WAJIB (tidak ada default diam-diam); bentuk
  `--runs N` atau `--runs=N`; nilai harus cocok `/^\d+$/`
  dan integer dalam rentang yang disetujui **1..10**
  (`MAX_RUNS = 10`). Nilai 0, negatif, NaN, non-numerik,
  desimal, terlalu besar, nilai hilang, atau flag hilang →
  error + usage + **exit 2**, tanpa child dijalankan.
- Assertion `records.length === EXPECTED_RUNS` (12 kombinasi
  × RUNS) + tiap kombinasi tepat RUNS record; ketidakcocokan
  dicetak `COUNT MISMATCH` dan menggagalkan run.
- Validasi setiap RESULT terhadap parameter yang diminta
  (pattern/fixture/gc/bun parent), `asksConnect === true`,
  `utf8Bytes` terukur sama dengan yang diharapkan per fixture
  (1.000.000 / 1.999.939), `segmentBytes` berjumlah sama
  dengan `utf8Bytes`, `vmHwmDelta` non-negatif.
- Timeout child 120 detik (`spawnSync` `timeout`); timeout /
  signal / exit non-zero / RESULT hilang → FAIL dengan alasan
  yang dicetak. Mekanisme timeout diverifikasi terpisah
  (`sleep 30`, timeout 200 ms → `ETIMEDOUT`, `status: null`,
  `signal: SIGTERM`); uji end-to-end dengan child yang
  sengaja menggantung TIDAK dibuat di revisi ini (dicatat
  sebagai batasan).
- Baris "parent done: all child runs ok" HANYA bila
  `failures === 0` DAN jumlah record tepat DAN semua
  kombinasi lengkap; bila tidak, parent mencetak
  "parent done: FAILED — …" dan exit 1.

**Tes regresi F-032 (log `run-f032-negative.txt`, Bun 1.4.4,
2026-11-08T01:56:59Z):** `--runs 0`, `--runs abc`,
`--runs -1`, `--runs` (nilai hilang), tanpa argumen (flag
hilang), `--runs 11`, `--runs 1.5` — ketujuh kasus exit 2
tanpa mencetak "all child runs ok"; kontrol positif
`--runs 1` exit 0 dengan 12 RESULT dan "all child runs ok".
Kriteria penerimaan F-032 (audit V9 §9 butir 2) terpenuhi
pada level harness; log v2.3.15 tetap tidak dibatalkan
(F-032 tidak mengubah isi log lama yang sudah terverifikasi
berisi 60 RESULT per versi).

**Dokumentasi harness diselaraskan (handoff V9 butir 3).**
README F-029 v2.3.15 salah menyebut `Bun.spawnSync`; yang
benar **`node:child_process.spawnSync`** dengan
`process.execPath`. Command yang benar:
`bun run-f029.ts --runs 5` dari direktori
`evidence/f029-memory-methodology/` (cwd). Versi Bun yang
dipakai: 1.3.10 (`1.3.10+30e609e08`) dan 1.4.4
(`1.4.4+38afee6c8`). Batasan dinyatakan eksplisit: skrip
hanya simulasi pola string (bukan implementasi, bukan
staging, bukan produksi); konkurensi multi-scan tidak
diukur; fixture supplementary-plane (U+1F600) tetap varian
staging (H-RES-02 B).

**Rasio F-027 dipertahankan terkoreksi (handoff V9 butir 4).**
Klaim 4,5–5,4× TIDAK dikembalikan. Rasio yang dipakai di
semua dokumen aktif kini **1,13–1,84×** (pengukuran ulang
v2.3.16, fixture exact-byte) — hanya hasil eksperimen VM;
TIDAK dipakai untuk cgroup sizing atau acceptance staging.
Koreksi dicatat pada §D.4.25 (F-027), §D.4.26 (F-029),
tabel perubahan v2.3.14/v2.3.15, README F-029, dan paragraf
penutup — bukan dihapus diam-diam.

**Proposal F-030 diselesaikan tanpa implementasi (handoff V9
butir 5).** Paket keputusan yang dapat diputuskan owner
tanpa mengubah file apa pun:

**Rekomendasi utama — Opsi A + SDK vendorkan (P-1 + P-3b):**

| Aspek | Isi rekomendasi |
| --- | --- |
| Bun kanonik | **1.4.4** (`1.4.4+38afee6c8`, rilis resmi oven-sh/bun `bun-v1.4.4`) — versi yang terverifikasi menerima lockfile v2 (frozen install + typecheck exit 0, log F-030). `packageManager` diubah `bun@1.3.10` → `bun@1.4.4` (satu baris + dokumentasi versi kanonik). |
| Lockfile | Tetap v2 ter-commit (sudah kompatibel dengan 1.4.4); resolusi dependensi tidak berubah; tidak ada regenerasi. |
| SDK | **Vendorkan artefak SDK berversi ke dalam repo** dengan digest SHA-256 tercatat dan diverifikasi saat install (opsi 2 dari matriks v2.3.15). Tarball yang ada di VM ini (`@hatch/space-sdk` 0.14.0, 2.051.070 byte, SHA-256 `f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e` — diukur di VM, SAMA dengan v2.3.9) adalah kandidat artefaknya; provenance tarball itu sendiri tetap NOT VERIFIED sampai runtime provider menyatakan sumber resminya secara tertulis. |
| Provenance / digest yang DIBUTUHKAN pada saat keputusan (saat ini NOT PROVIDED — tidak dikarang) | (a) Digest resmi rilis Bun 1.4.4 dari oven-sh/bun (SHA-256 rilis + rujukan URL rilis); (b) atestasi tertulis runtime provider atas asal tarball SDK (URL/sumber resmi + digest yang dinyatakan provider, dicocokkan dengan `f2cb7b25…` hasil ukur VM); (c) dependency digest dari lockfile v2 ter-commit (dicatat dari hasil frozen install clean-builder). |
| Prasyarat clean-builder | Builder eksternal bersih TANPA `/opt/hatch`, TANPA akses jaringan ke path lokal VM; Bun 1.4.4 terpasang dari rilis resmi (digest terverifikasi); repo berisi `package.json` (kanonik 1.4.4) + `bun.lock` v2 + artefak SDK vendorkan berdigest; registry publik dapat dijangkau untuk 79 paket. |
| Prosedur pembuktian (setelah keputusan + otorisasi tahap b) | Salinan bersih repo → `bun install --frozen-lockfile` (exit 0, lockfile tidak berubah, hash tercatat) → `bun run typecheck` (exit 0, client + server) → `bun run build` (exit 0 — house rules saat ini melarang build dari `site/`; build adalah bagian acceptance G-J setelah keputusan owner) → raw log + environment manifest disimpan sebagai bukti clean-builder. |
| Rollback | Kembalikan `packageManager` ke `bun@1.3.10` dan hapus artefak SDK vendorkan (kembali ke lockfile v2 ter-commit + path `file:/opt/hatch/...` yang hanya berlaku di VM ini); rollback mengembalikan status ke NOT REPRODUCIBLE — dicatat sebagai rollback ke keadaan blocked, bukan ke keadaan baik. |
| Dampak terhadap bukti runtime | SEMUA bukti VM yang memakai 1.3.10 sebagai "kanonik" harus dibaca ulang sebagai bukti versi LAMA (perilaku chunk/dekompresi/GC 1.4.4 terbukti berbeda dari 1.3.10 di F-026/F-029 — mis. `heapUsed` bergerak di 1.4.4 tetapi 0 di 1.3.10; chunk maksimum berbeda); H-RES-03/05 staging harus dijalankan pada 1.4.4; runtime artifact staging harus memakai versi 1.4.4 itu. Keputusan ini TIDAK mengubah satu pun angka VM yang sudah diterbitkan — hanya cara membacanya. |

**Fallback — Opsi B (P-2, regenerasi lockfile v1):** bila
owner menolak perubahan runtime, kanonik tetap 1.3.10 dan
`bun.lock` diregenerasi ke v1 di bawah 1.3.10; prasyarat
tambahan: diff resolusi dependensi v1 vs v2 diperiksa
paket-per-paket (perbedaan versi transitif belum diperiksa);
frozen install + typecheck + build dari lockfile hasil
regenerasi dibuktikan sebagai satu alur bersih pada clean
builder. Penggantian SDK path tetap wajib (sama seperti
Opsi A). Opsi B mempertahankan validitas semua bukti VM
1.3.10 tetapi memakai format lockfile lama yang dukungan
masa depannya tidak dijamin.

**Yang TIDAK diputuskan di sini:** pilihan Opsi A vs B
tetap keputusan owner (G-G); penggantian SDK path tetap
butuh persetujuan owner + runtime provider; TIDAK ADA
perubahan `site/package.json`, `site/bun.lock`, atau file
apa pun di revisi ini. **Acceptance F-030 tetap belum satu
pun terpenuhi** (clean external builder tanpa `/opt/hatch`;
frozen install + typecheck + build exit 0; digest tercatat;
lockfile tidak berubah) — **F-030 tetap CONFIRMED BLOCKER**
dan **F-009 tetap NOT REPRODUCIBLE**. Tidak ada klaim
reproducible sebelum pembuktian clean-builder berhasil.

**F-019 — tetap BLOCKED / NOT VERIFIED (handoff V9 butir 6).**
Tidak ada fakta baru. `checkLink` TIDAK di-invoke, tidak ada
public share, tidak ada perubahan runtime state. Hanya bukti
read-only yang tersedia (paket F-021 v2.3.12, tidak ada
capture baru — tidak ada perubahan status yang membenarkan
capture ulang): `checklink` MASIH TERDAFTAR; tidak ada
versi/digest artifact yang terekspos tool; kontrol (a)–(e)
(versi/digest, dispatch denial, UI gate, public invocation
denial, egress observation) tetap NOT PROVIDED / NOT
VERIFIED — masing-masing dinyatakan demikian, bukan ditebak.
Deployment tetap BLOCKED.

**F-028 — tetap NOT VERIFIED.** Tidak ada fakta baru. LIVE
VERSION / DEPLOYMENT APPROVAL tetap NOT VERIFIED; semua field
manifest tetap NOT PROVIDED; tidak ada tebakan versi live,
tidak ada perubahan live, tidak ada klaim approval baru.

**F-001..F-005 — tetap blocker implementasi.** Tidak ada
perubahan status; requirement implementasi dipertahankan dari
§D.4.25. Handoff V9 BUKAN izin mengubah source. Satu
pembaruan spesifikasi (F-031): H-RES-05 kini mensyaratkan
fixture batas byte yang TERUKUR eksak (cap / cap−1 / cap+1)
pada kedua mode GC — lihat F-031 di atas.

**Staging owners/prereqs — tetap UNASSIGNED (handoff V9
butir 7).** Tabel STAGE-P01..P12 di §D.4.26 dipertahankan
lengkap dengan peran yang dibutuhkan, prasyarat, prosedur
aman, PASS/FAIL oracle, dan bukti yang harus dihasilkan.
Tidak satu pun peran terisi dan tidak ada nama owner yang
dikarang. ST-12 tetap tidak PASS tanpa alert yang
benar-benar diterima operator (kriteria ST-12-LAT-01..03
dipertahankan). STAGE-P01..P12 tetap BLOCKED; tidak ada gate
READY.

**Provenance suite lama — dipertahankan (handoff V9 butir 7).**
Klaim bundle asli 9/9 × 4 TIDAK diubah: bundle asli hanya
membuktikan 1 log lengkap + duplikat + tail; bundle suplemen
RUN=1..4 tetap menjadi empat log lengkap yang tersedia; log
gagal awal SU-T5 TIDAK direkonstruksi (tetap NOT PRESERVED).
Semua bukti VM baru v2.3.16 dilabeli VM dan dipisah ketat
dari staging — tidak ada bukti VM yang diklaim sebagai bukti
staging. Tidak ada pengulangan SU-T1..SU-T9 di revisi ini
(tidak ada perubahan implementasi/harness suite lama yang
membenarkan rerun).

**Carry-forward (handoff V9 butir 7).** F-018, F-006b/F-006c,
U-38/U-33/U-41/U-43/U-44/U-45/U-46 hanya berubah status
berdasarkan bukti atau keputusan owner yang dapat dilacak —
tidak ada perubahan status di v2.3.16. U-46 tetap keputusan
owner yang belum ada (opsi (a)/(b) tetap terbuka;
implementasi pensinyalan tetap DIBLOKIR). Tidak ada detail
narasi insiden atau data wallet apa pun di dokumen revisi
ini.

**Risiko baru v2.3.16 (§G):** U-69 (F-031 — klaim batas byte
fixture tidak tepat; rasio v2.3.15 superseded) dan U-70
(F-032 — harness dapat melaporkan sukses dengan nol run;
jalur timeout belum diuji end-to-end). **U-67 DIPERBARUI**
(rasio terukur ulang 1,13–1,84×; manfaat tetap bergantung
GC) dan **U-68 DIPERBARUI** (proposal keputusan F-030 selesai
sebagai paket yang dapat diputuskan; blocker tetap
CONFIRMED). U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan
tanpa perubahan status.

**Gate konkret berikutnya (v2.3.16 → v2.3.17).** Revisi ini
bukan pengulangan status: ia memperbaiki fixture exact-byte
F-029 dengan bukti eksperimen VM baru pada Bun kanonik 1.3.10
DAN 1.4.4 (F-031) dan mengukur ulang rasio menjadi
1,13–1,84×, menutup jalur false green harness (F-032)
dengan tes regresi negatif, menyelaraskan dokumentasi
harness, dan menyelesaikan proposal keputusan F-030 sebagai
paket yang dapat diputuskan tanpa mengubah file apa pun,
sambil mempertahankan LIVE VERSION / DEPLOYMENT APPROVAL =
NOT VERIFIED (F-028) dan F-019 BLOCKED. Gate berikutnya dan
prasyaratnya: **(G-A)** keputusan owner atas scope perubahan
source (F-020); **(G-B)** bukti runtime F-019 (versi/digest +
kontrol disabled (a)–(e)); **(G-C)** keputusan tenancy
F-018 (pernyataan resmi provider tentang scope `ctx.db`);
**(G-D)** keputusan U-46; **(G-E)** staging tersedia + peran
UNASSIGNED terisi; **(G-F)** keputusan cache F-022 — owner
menerima cabang pilihan (rekomendasi) vs alternatif;
**(G-G)** keputusan Bun F-009 — kanonik 1.3.10 vs 1.4.4
(kini dengan rekomendasi Opsi A + SDK vendorkan vs fallback
Opsi B, §D.4.27); **(G-H)** eksekusi harness H-RES-02/03/05
yang sudah dikoreksi — prasyarat: otorisasi implementasi
tahap (b) (G-A) + staging tersedia (G-E) + verifikasi ulang
perilaku Bun pada versi kanonik (U-62, bagian staging);
**(G-I)** stress test memori H-RES-03/05 pada staging
(chunk > cap, 3 script paralel, fixture batas 1.000.000 +
varian cap−1/cap+1 + non-ASCII byte-matched terukur eksak,
high-water RSS ≤ ambang pra-tes, kedua mode GC) + proses
deployment manifest terisi untuk setiap deployment (F-028);
**(G-J)** keputusan reproduksibilitas F-030 — prasyarat:
keputusan owner G-G (Opsi A vs Opsi B) + penggantian SDK
path (paket ter-publish/vendorkan/sumber resmi) + bukti
clean-builder (frozen install + typecheck + build exit 0,
lockfile tidak berubah, dependency digest tercatat, tanpa
`/opt/hatch`). Pemicu revisi v2.3.17: keputusan owner atas
G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU staging
tersedia (G-E), ATAU audit independen V10 — mana pun yang
datang dulu. Tidak ada revisi baru yang hanya mengulang
status v2.3.16.

**Hard gates — ditegaskan kembali (v2.3.16):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah
(HOLD perubahan source mirror sampai klarifikasi F-020 tetap
berlaku), no production testing (termasuk tidak memanggil
`checkLink`). F-001..F-005, F-016/F-017/F-022, F-018 tetap
OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..20 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup.

### D.4.28 Jawaban atas audit independen V10 — F-033, F-032 E2E + Handoff §9 (BARU, v2.3.17)

Audit V10 (`SSRF_INDEPENDENT_AUDIT_V10.md`, commit `237d491`,
8 November 2026) meninjau v2.3.16 (commit `7ac30bc`) dan menemukan
satu temuan baru, **F-033 (Medium)**, serta satu caveat pada F-032.
Revisi ini menjawab kesembilan butir Handoff V10 §9; detail penuh
+ response matrix ada di `SSRF_RESPONSE_MATRIX_V2317.md`.

**F-033 — instrumen pengukuran memori tidak simetris (DITERIMA
sepenuhnya; DIPERBAIKI).** Audit V10 benar di semua poin bukti
(§5 F-033): `makeSegment()` v2.3.16 memanggil
`enc.encode(seg)` di dalam fase yang diukur (baris 171);
pola A membangun tiga segmen sebelum GC pertama (baris
228–230, GC pertama baris 241); pola B GC setelah tiap segmen
(baris 279, 295); `segLower` pola B masih berada dalam lexical
block saat `doGc()` dipanggil; VmHWM monotonik sehingga
transient encoder ikut menaikkan puncak. Besarnya bias belum
terukur pada saat audit — rerun v2.3.17 kini mengukurnya dengan
instrumen yang sudah diperbaiki (lihat di bawah).

Perbaikan v2.3.17 (`evidence/f029-memory-methodology/` —
`fixture.ts` BARU, `preflight-fixture.ts` BARU,
`exp-pattern.ts` ditulis ulang, `run-f029.ts` diperbarui):

- **Tidak ada TextEncoder di measured process.** `exp-pattern.ts`
  tidak lagi memanggil TextEncoder sama sekali. Jumlah byte
  dihitung aritmetik deterministik dari lebar byte yang
  diketahui (modul bersama `fixture.ts`): filler ASCII 1 byte,
  U+00E9 2 byte, marker ASCII 33/15/13 byte (konstanta
  hardcode). Tidak ada klaim overhead "berlaku sama" lagi —
  alokasi encoder DIHILANGKAN dari fase ukur, bukan disamakan.
  Overhead tetap yang didokumentasikan: hanya import modul
  (sebelum baseline, identik untuk A/B).
- **Preflight terpisah sebagai bukti byte independen.**
  `preflight-fixture.ts` berjalan di prosesnya SENDIRI
  (dijalankan `run-f029.ts` sebelum child terukur mana pun),
  membangun segmen yang sama via `fixture.ts` dan mengukurnya
  dengan TextEncoder: 61 checks — marker 33/15/13, lebar
  filler, ascii + nonascii-bytes pada 999.999/1.000.000/1.000.001
  per segmen + total, nonascii total 1.999.939 — 0 gagal di
  kedua versi Bun; output preflight tercatat di kepala tiap log
  run. Bila preflight gagal, parent abort (exit 1) tanpa
  menjalankan child apa pun.
- **Lifecycle pola B eksplisit.** Scan satu segmen pindah ke
  helper `scanSegment()` dengan scope tertutup; helper
  mengembalikan hanya `{ found, bytes, chars }`; `seg` dan
  `segLower` keluar dari scope saat helper return; caller
  menjalankan `doGc()` HANYA setelah return. Tiap forced GC
  pola B dicatat (`B gc after segment i: seg refs out of
  scope ...` — 90 baris per log).
- **Parent meng-assert bukti F-033 pada tiap RESULT:**
  `encoderInMeasuredPhase === false` dan
  `byteProof === "preflight+arithmetic"`; satu pun mismatch →
  failure.

**Bukti baru v2.3.17 (rerun DIBENARKAN — harness berubah,
protokol butir 6):** log mentah `run-1310-f033.txt` (SHA-256
`bd6860baaad15fd1aef5572ba8a0db77a73ac4ffa407143b6bf2f6f2a2b171fd`,
995 baris) dan `run-144-f033.txt` (SHA-256
`44d76ae0b566c13eea49571bce80cefcb84bd4cce884f5d86859ee470ec445f8`,
995 baris) — Bun 1.3.10 (`1.3.10+30e609e08`, diunduh ulang dari
rilis resmi oven-sh/bun `bun-v1.3.10`, zip 39.328.732 byte,
2026-11-08) DAN Bun 1.4.4 (`1.4.4+38afee6c8`); 60 run anak per
versi, 60 PID berbeda terverifikasi per versi, 0 gagal,
`asksConnect = true` pada SEMUA 120 run anak;
`encoderInMeasuredPhase = false` pada SEMUA 120 RESULT;
preflight 61 PASS di kedua log; 90 baris `B gc after segment`
per log. Log varian byte `run-144-f033-byte-variants.txt`
(SHA-256
`bb3acc16807c627ee35f08cd5a2c859884c52f68caf886fa0c113dc372f57a36`,
107 baris): 14 run langsung `exp-pattern.ts` (Bun 1.4.4, gc
natural) — pola A dan B × `ascii`/`nonascii-bytes` × `--bytes`
999.999/1.000.000/1.000.001 + pola A dan B × `nonascii`
default; semua exit 0, total byte tepat sama dengan target.

**Hasil terukur ulang (median VmHWM delta, 5 run per kombinasi):**

| Bun | Fixture | GC | A median | B median | Rasio A/B |
| --- | --- | --- | --- | --- | --- |
| 1.3.10 | ascii | forced | 4.861.952 | 2.871.296 | 1,69× |
| 1.3.10 | ascii | natural | 4.784.128 | 3.670.016 | 1,30× |
| 1.3.10 | nonascii | forced | 5.337.088 | 2.965.504 | 1,80× |
| 1.3.10 | nonascii | natural | 4.915.200 | 3.796.992 | 1,29× |
| 1.3.10 | nonascii-bytes | forced | 2.912.256 | 1.490.944 | 1,95× |
| 1.3.10 | nonascii-bytes | natural | 2.809.856 | 2.281.472 | 1,23× |
| 1.4.4 | ascii | forced | 4.104.192 | 1.654.784 | 2,48× |
| 1.4.4 | ascii | natural | 4.542.464 | 3.964.928 | 1,15× |
| 1.4.4 | nonascii | forced | 4.177.920 | 1.597.440 | 2,62× |
| 1.4.4 | nonascii | natural | 4.624.384 | 3.977.216 | 1,16× |
| 1.4.4 | nonascii-bytes | forced | 2.453.504 | 1.335.296 | 1,84× |
| 1.4.4 | nonascii-bytes | natural | 2.818.048 | 2.527.232 | 1,12× |

**Rasio terukur ulang keseluruhan: 1,12–2,62× (median VmHWM).**
Rentang v2.3.16 (1,13–1,84×) dinyatakan **SUPERSEDED**
(instrumen terkonfounded F-033 — bukan lagi angka yang boleh
dikutip, bahkan sebagai bukti VM). Pola B tetap lebih rendah
dari pola A pada SEMUA 12 kombinasi di kedua versi; forced-GC
1,69–2,62× vs natural-GC 1,12–1,30×. Karakter hidup 3,60×
dipertahankan sebagai character accounting (ascii: 3.600.005).
`heapUsed` tetap bukan oracle di Bun 1.3.10 (delta = 0 pada
SEMUA 60 run anak 1.3.10 — direproduksi v2.3.17).

**Mengapa rasio forced-GC naik — hipotesis arah V10 TIDAK
terkonfirmasi pada sel itu.** Dua confound v2.3.16 mendorong
ke arah berlawanan: transient encoder menghukum pola A
(cenderung MEMBESARKAN rasio), sementara `segLower` yang
hidup melewati forced GC menghukum pola B (cenderung
MENGECILKAN rasio). Rerun menunjukkan confound kedua LEBIH
BESAR: median B forced-GC 1.4.4 jatuh jauh (ascii 3.379.200 →
1.654.784; nonascii 3.149.824 → 1.597.440) setelah `segLower`
dilepas sebelum GC, sementara median A turun lebih sedikit
(ascii 5.300.224 → 4.104.192). Pada sel natural-GC rasio
hampir tidak bergerak (1,13–1,28× → 1,12–1,30×), sesuai
harapan: tanpa checkpoint forced-GC, lifetime `segLower`
tidak berpengaruh pada puncak. Fakta ini dilaporkan apa
adanya — audit V10 benar bahwa instrumennya terkonfounded,
tetapi arah bias netonya tidak seperti yang dihipotesiskan.
**Rasio 1,12–2,62× tetap HANYA bukti VM; statusnya sebagai
angka operasional (sizing/cgroup/acceptance staging) tetap
NOT VERIFIED sampai review independen atas paket ini**
(kriteria penerimaan V10 §5 butir 6).

**F-032 — timeout end-to-end (caveat V10 DITUTUP).**
`evidence/f032-harness-validation/` — child dummy
`hang-child.ts` (menggantung selamanya, tanpa RESULT, PID
dicatat append) + driver `run-f032-timeout-e2e.ts`:
`bun run-f029.ts --runs 1` dengan seam
`F029_CHILD_SCRIPT=<hang-child>` + `F029_CHILD_TIMEOUT_MS=3000`
memberi 12 FAIL `timeout after 3000 ms`, ke-12 PID child
terverifikasi mati (kill(pid,0) → ESRCH, bocor: none), 0
record, `COUNT MISMATCH`, `parent done: FAILED`, exit 1,
TIDAK ADA `all child runs ok`, TIDAK ADA baris RESULT — 11
assert PASS (log `run-f032-timeout-e2e.txt`, SHA-256
`6148cb8924fdfd3c0195994f3146ae275064e124e139bcec1558a5fa37c87fd4`,
165 baris; Bun 1.4.4, 2026-11-08T02:53:24Z). Test seam env
ditambahkan ke `run-f029.ts` (tervalidasi; dicatat eksplisit
bila aktif; production run tidak pernah mengesetnya). Tes
regresi negatif diulang pada harness baru (log
`run-f032-negative-v2317.txt`, SHA-256
`4c97e1d079a21f94a8f4e0aec1b7eda961843bc7f5adc36c324123331b8a7a91`,
307 baris): 7 kasus exit 2, kontrol positif `--runs 1` exit 0
dengan 12 RESULT.

**F-030/F-009 — dipertahankan sebagai blocker.** Opsi A/B
tetap proposal; tidak ada digest rilis Bun, atestasi SDK,
frozen install, typecheck, atau build clean external baru —
tidak ada yang dikarang. F-030 tetap CONFIRMED BLOCKER; F-009
tetap NOT REPRODUCIBLE.

**F-019 dan F-028 — dipertahankan NOT VERIFIED.** `checkLink`
TIDAK di-invoke, tidak ada public share, tidak ada perubahan
runtime; kontrol F-019 (a)–(e) tetap belum satu pun terpenuhi;
template manifest deployment tetap kosong (semua field NOT
PROVIDED).

**Staging owners — tetap UNASSIGNED, dicatat sebagai BLOCKED.**
Tidak ada keputusan Rama/provider sejak v2.3.16, maka tidak
ada nama owner yang diisi: staging operator, runtime
provider, egress owner, DB/runtime owner, alert channel /
operator penerima, dan rollback owner tetap UNASSIGNED —
masing-masing dengan prasyarat yang jelas di matriks
v2.3.17 §2 (butir 7). STAGE-P01..P12 tetap memiliki
prasyarat/prosedur/oracle/evidence; ST-12 tidak PASS tanpa
alert yang benar-benar diterima operator
(ST-12-LAT-01..03 dipertahankan).

**Carry-forward (handoff V10 butir 8).** F-001..F-005,
F-006b/F-006c, F-016..F-019, F-028, U-38/U-33/U-41/U-43/U-44/
U-45/U-46 hanya berubah status berdasarkan bukti atau
keputusan owner yang dapat dilacak — tidak ada perubahan
status di v2.3.17. U-46 tetap keputusan owner yang belum ada
(opsi (a)/(b) tetap terbuka; implementasi pensinyalan tetap
DIBLOKIR). Log gagal awal SU-T5 TIDAK direkonstruksi (tetap
NOT PRESERVED). Tidak ada detail narasi insiden atau data
wallet apa pun di dokumen revisi ini.

**Proposal terpisah (handoff V10 butir 9 — HOLD).** Tidak ada
perubahan source/lockfile/DB/deployment yang diusulkan BARU
di v2.3.17. Proposal yang sudah ada (P-1/P-2/P-3 F-030 di
matriks v2.3.16 §4 butir 8) dibawa utuh ke matriks v2.3.17
§4 butir 9 dan tetap HOLD — masing-masing butuh keputusan
owner dan otorisasi tahap (b) terpisah sebelum dieksekusi.

**Risiko baru v2.3.17 (§G):** U-71 (F-033 — instrumen A/B
terkonfounded; rasio v2.3.16 superseded; hipotesis arah V10
tidak terkonfirmasi pada sel forced-GC) dan U-72 (F-032 —
test seam harness sebagai permukaan override baru).
**U-67 DIPERBARUI** (rasio terukur ulang 1,12–2,62×; manfaat
tetap bergantung GC) dan **U-70 DIPERBARUI** (jalur timeout
kini teruji end-to-end; sisa risikonya adalah seam).
U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa
perubahan status.

**Gate konkret berikutnya (v2.3.17 → v2.3.18).** Revisi ini
bukan pengulangan status: ia memperbaiki instrumen F-029
dengan bukti eksperimen VM baru pada Bun kanonik 1.3.10 DAN
1.4.4 (F-033) dan mengukur ulang rasio menjadi 1,12–2,62×,
membuktikan jalur timeout harness end-to-end (F-032),
sambil mempertahankan F-030 sebagai CONFIRMED BLOCKER,
LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (F-028)
dan F-019 BLOCKED. Gate berikutnya dan prasyaratnya:
**(G-A)** keputusan owner atas scope perubahan source (F-020);
**(G-B)** bukti runtime F-019 (versi/digest + kontrol disabled
(a)–(e)); **(G-C)** keputusan tenancy F-018 (pernyataan resmi
provider tentang scope `ctx.db`); **(G-D)** keputusan U-46;
**(G-E)** staging tersedia + peran UNASSIGNED terisi;
**(G-F)** keputusan cache F-022 — owner menerima cabang
pilihan (rekomendasi) vs alternatif; **(G-G)** keputusan Bun
F-009 — kanonik 1.3.10 vs 1.4.4 (rekomendasi Opsi A + SDK
vendorkan vs fallback Opsi B, §D.4.27); **(G-H)** eksekusi
harness H-RES-02/03/05 yang sudah dikoreksi — prasyarat:
otorisasi implementasi tahap (b) (G-A) + staging tersedia
(G-E) + verifikasi ulang perilaku Bun pada versi kanonik
(U-62, bagian staging); **(G-I)** stress test memori
H-RES-03/05 pada staging (chunk > cap, 3 script paralel,
fixture batas 1.000.000 + varian cap−1/cap+1 + non-ASCII
byte-matched terukur eksak, high-water RSS ≤ ambang pra-tes,
kedua mode GC) + proses deployment manifest terisi untuk
setiap deployment (F-028); **(G-J)** keputusan
reproducibilitas F-030 — prasyarat: keputusan owner G-G
(Opsi A vs Opsi B) + penggantian SDK path (paket
ter-publish/vendorkan/sumber resmi) + bukti clean-builder
(frozen install + typecheck + build exit 0, lockfile tidak
berubah, dependency digest tercatat, tanpa `/opt/hatch`).
Pemicu revisi v2.3.18: keputusan owner atas
G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU staging
tersedia (G-E), ATAU audit independen V11 — mana pun yang
datang dulu. Tidak ada revisi baru yang hanya mengulang
status v2.3.17.

**Hard gates — ditegaskan kembali (v2.3.17):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah
(HOLD perubahan source mirror sampai klarifikasi F-020 tetap
berlaku), no production testing (termasuk tidak memanggil
`checkLink`). F-001..F-005, F-016/F-017/F-022, F-018 tetap
OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..20 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup.

### D.4.29 Jawaban atas audit independen V11 — F-034, F-035, U-72 diperketat + Handoff §11 (BARU, v2.3.18)

Audit V11 (`SSRF_INDEPENDENT_AUDIT_V11.md`, commit `c69af06`,
8 November 2026) meninjau v2.3.17 (commit `77d5dcd`) dan
menyatakan angka v2.3.17 konsisten dengan log yang dipublikasikan.
Ia menemukan dua temuan baru, **F-034 (Low)** dan **F-035
(Low)**, serta memperjelas catatan **U-72**; F-032 dinilai
PARTIALLY ADDRESSED karena kelemahan oracle F-034. Revisi ini
menjawab kesembilan butir Handoff V11 §11; detail penuh +
response matrix ada di `SSRF_RESPONSE_MATRIX_V2318.md`.

**F-034 — oracle terminasi PID menerima semua exception sebagai
"mati" (DITERIMA sepenuhnya; DIPERBAIKI).** Audit V11 benar:
driver v2.3.17 (`run-f032-timeout-e2e.ts:93-108`) memakai
`catch { stillAlive = false; }` pada `process.kill(pid, 0)` —
komentar menyebut ESRCH tetapi kode tidak memeriksa
`error.code` — dan mem-parsing baris PID dengan `Number(...)`
tanpa validasi. Kelemahan itu nyata: EPERM (proses hidup tetapi
tidak bisa di-signal) atau exception lain dapat false-pass
assertion "semua child terminated".

Perbaikan v2.3.18 (modul baru
`evidence/f032-harness-validation/pid-oracle.ts`, SHA-256
`4d36b47ea6bced479944cd6d959a305e9209cf406445c595e306306f69a8166c`):

- **Hanya ESRCH = mati.** `classifyLiveness()` mengembalikan
  `dead` hanya bila `kill(pid, 0)` melempar dengan `code ===
  "ESRCH"`. EPERM berarti proses ADA tetapi tidak bisa
  di-signal → verdict `alive` (caller WAJIB FAIL). EINVAL,
  `ERR_INVALID_ARG_TYPE`, dan exception lain → verdict
  `inconclusive` (caller WAJIB FAIL). Hanya verdict `dead` yang
  boleh memenuhi assertion "terminated".
- **Parsing file PID ketat.** `parsePidFile()` menuntut tiap
  baris tepat `"<pid> <starttime>"`, keduanya positive safe
  integer, pid 1..2^31−1; baris kosong (selain satu newline
  penutup), malformed, duplikat, atau di luar rentang adalah
  error — file ditolak SEBELUM assertion liveness.
- **Identitas PID via starttime.** Bila `kill(pid, 0)` berhasil,
  oracle membaca `/proc/<pid>/stat` (field 22 = starttime) dan
  membandingkannya dengan starttime yang dicatat child saat
  spawn: cocok = child yang sama masih hidup; berbeda = PID
  dipakai ulang proses lain (child asli mati); state Z/X =
  zombie/mati; `/proc` tak terbaca/tak ter-parse = inconclusive.
  Satu-satunya pengecualian: proses yang keluar di antara probe
  signal dan pembacaan `/proc` (ENOENT) = mati. `hang-child.ts`
  kini mencatat `"<pid> <starttime>"` (starttime dari
  `/proc/self/stat` saat spawn; bila tidak terbaca, child exit 1
  tanpa menggantung — E2E gagal dengan keras, bukan melemah
  diam-diam).
- **Oracle injectable.** `kill`/`readStat` dapat di-stub
  sehingga tes regresi membuktikan aturan EPERM/EINVAL tanpa
  bergantung pada layout permission host.

**Bukti baru v2.3.18 — tes regresi oracle
(`test-pid-oracle.ts`, SHA-256
`56e0e0cb2a2b727fa8f12bd30e6e835638e75b1fe10b44447266eb55f42068f9`;
log `test-pid-oracle-v2318.txt`, SHA-256
`4cc0d407c90dbb2900ca35be46afc6c0c68413f849de6dd123f2d749f529b300`,
36 baris; Bun 1.4.4, 2026-11-08T03:59:48Z): 30 assert PASS —
15 kasus parsing (valid, tanpa trailing newline, file kosong,
baris kosong, tanpa starttime, non-numerik, field tambahan, pid
0, pid > 2^31−1, float, negatif, duplikat, starttime sama di dua
pid diizinkan, spasi di depan); 11 kasus klasifikasi stub injeksi
(ESRCH→dead, EPERM→alive, EINVAL→inconclusive,
ERR_INVALID_ARG_TYPE→inconclusive, `parseProcStat` mem-parse
`/proc/self/stat`, hidup + starttime cocok→alive, hidup +
starttime berbeda→dead, state Z→dead, kill ok + `/proc`
ENOENT→dead, kill ok + `/proc` EPERM→inconclusive, kill ok +
stat tak ter-parse→inconclusive); 4 kasus proses hidup nyata
(child yang sudah exit → dead via ESRCH sungguhan; `sleep 30`
stat ter-parse + alive via kill + starttime, lalu SIGKILL
terkontrol → dead). **Catatan jujur (dicatat di log, bukan dipalsukan):**
VM ini berjalan sebagai root (uid 0), sehingga `kill(1,0)`
berhasil dan EPERM HIDUP tidak dapat diproduksi di sini —
aturan EPERM→FAIL dibuktikan oleh kasus stub injeksi, bukan
oleh proses hidup.

**F-035 — file PID memakai path tetap di /tmp (DITERIMA
sepenuhnya; DIPERBAIKI).** Audit V11 benar: driver v2.3.17
memakai `/tmp/f032-hang-child.pid` (cek-keberadaan lalu hapus,
teruskan path via env; child `appendFileSync` mengikuti symlink)
— celah symlink/TOCTOU pada host multi-user dan dua invocation
paralel dapat saling menghapus/mencampur PID.

Perbaikan v2.3.18 (`run-f032-timeout-e2e.ts` ditulis ulang,
SHA-256
`55be54784500953aed13ac2daa27551ee19a2f2f7cddd0f7e50df2bdce51063f`;
`hang-child.ts` diperbarui, SHA-256
`da44592561e181ff196b607cc94b0f37c71174eb57543f08b17765541ea7b25a`):

- **Direktori privat per-run.** Driver membuat direktori via
  `mkdtemp` (`/tmp/f032-e2e-XXXXXX`, mode 0700) dan memvalidasi
  realpath + kepemilikan uid SEBELUM child mana pun dijalankan.
  Path tetap lama TIDAK lagi direferensikan driver sama sekali.
- **File PID eksklusif.** File dibuat di dalam direktori privat
  dengan `openSync "wx"` (O_CREAT|O_EXCL — gagal bila path adalah
  symlink, bahkan yang menggantung), mode 0600, fstat-validated.
- **Validasi di child.** `hang-child.ts` memvalidasi file PID
  dengan `lstat` sebelum append: harus file regular (bukan
  symlink), milik uid yang sama, mode 0600 — bila gagal, child
  exit 1 tanpa menggantung (parent mencatat FAIL non-timeout).
  Jendela mikro antara `lstat` dan `append` ditutup oleh
  direktori privat itu sendiri (hanya pemilik yang bisa menulis
  di dalamnya); pemeriksaan `lstat` adalah lapis tambahan, bukan
  satu-satunya kontrol.
- **Cleanup di `finally`.** Direktori (dan file PID di dalamnya)
  dihapus setelah semua child selesai, apa pun hasil run-nya.

**Bukti baru v2.3.18 — tes regresi F-035
(`test-f035-pidfile.ts`, SHA-256
`7f060400fb07555171334aa976a0178e51293272b65102682f0811ac8efe6975`;
log `test-f035-pidfile-v2318.txt`, SHA-256
`937ed44521d09a8c218130ac97f3faf9344e982c15b730c97bc733cd86e539df`,
31 baris; Bun 1.4.4, 2026-11-08T03:59:56Z): 25 assert PASS —
symlink ditanam di path lama menunjuk file sentinel (sha256
target IDENTIK sebelum/sesudah, symlink tetap menunjuk target,
tidak pernah diganti); dua driver PARALEL (direktori privat
berbeda `/tmp/f032-e2e-48auan` vs `/tmp/f032-e2e-YyTPEK`,
masing-masing 12 PID, kedua set PID disjoint, keduanya PASS,
tak satu pun log menyebut path lama, mode 700/600 tervalidasi,
kedua direktori terhapus setelah run).

**Uji E2E diulang pada driver baru (log
`run-f032-timeout-e2e-v2318.txt`, SHA-256
`00d23aa532548242bc19f0399f298f485e25f91a823112798b046b56c594de33`,
189 baris; Bun 1.4.4, 2026-11-08T03:58:01Z, durasi ~36 detik):**
12 FAIL `timeout after 3000 ms`; ke-12 PID tercatat sebagai
`"<pid> <starttime>"` (3116, 3126, 3135, 3147, 3155, 3165, 3178,
3188, 3198, 3206, 3219, 3232); jumlah PID yang diuji (12) ==
jumlah child yang diluncurkan (12); ke-12 verdict liveness
`dead` via ESRCH sungguhan (starttime tercatat di tiap baris
log); 0 record; `COUNT MISMATCH`; `parent done: FAILED`; exit
1; TIDAK ADA `all child runs ok`; TIDAK ADA baris RESULT;
direktori privat terhapus (`removed: true`). Verdict driver:
**E2E TIMEOUT TEST: PASS**. F-032 kini dinilai ADDRESSED pada
tingkat harness VM — termasuk oracle terminasi yang sebelumnya
berstatus PARTIALLY ADDRESSED di V11 §3 butir 4. Log v2.3.17
(`run-f032-timeout-e2e.txt`) dipertahankan sebagai bukti
historis; klaim terminasi yang mengikat kini bersandar pada log
v2.3.18.

**U-72 — test seam diperketat (DITERIMA sepenuhnya;
DIPERBAIKI).** Audit V11 benar: `run-f029.ts:62` mengambil
`F029_CHILD_SCRIPT` langsung dari environment tanpa allowlist
atau pembatasan realpath — ini design gap / local tooling risk,
bukan product vulnerability (audit menegaskan itu, dan revisi
ini tidak menaikkannya menjadi risiko aplikasi).

Perbaikan v2.3.18 (`run-f029.ts` diperbarui, SHA-256
`df7cd6c6dd6b736ae05e3ad02ff7dea4c401616306cc97b22f34a067a6e97295`):

- Override `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` hanya
  dihormati bila `F029_TEST_MODE=1` eksplisit (nilai lain —
  `"true"`, `"0"`, `"yes"` — TIDAK mengaktifkan mode test).
- Script child harus realpath ke fixture yang disetujui:
  `exp-pattern.ts` atau `hang-child.ts` di dalam evidence tree.
  Path di luar evidence tree, path yang tidak resolve, dan file
  non-script → exit 2.
- Path yang diberikan tidak boleh berupa symlink (diperiksa
  dengan `lstat` sebelum `realpath`) — bahkan symlink yang
  menunjuk fixture yang disetujui ditolak.
- Semua penolakan terjadi SEBELUM preflight/child mana pun
  di-spawn (exit 2). Perilaku default tidak berubah: tanpa env
  var, script = `exp-pattern.ts`, timeout = 120.000 ms.
- Driver E2E kini menyetel `F029_TEST_MODE=1` bersama seam-nya.

**Bukti baru v2.3.18 — tes regresi seam
(`test-u72-seam.ts`, SHA-256
`a598eba8a6182b2e698af4e208e8d8ea871af69cba8d50dabe1fb9cc942ed34e`;
log `test-u72-seam-v2318.txt`, SHA-256
`cefadfdd4753f7686f6d1656c85c5813976adec38babdc095259689663eaa550`,
20 baris; Bun 1.4.4, 2026-11-08T03:59:48Z): 15 assert PASS — 7
kasus penolakan (override tanpa test mode; `F029_TEST_MODE=true`;
timeout override tanpa test mode; path arbitrer di luar evidence
dalam test mode; symlink ke fixture yang disetujui dalam test
mode; path tak ada; file non-script) + 1 kasus penerimaan
(fixture yang disetujui + timeout 100 ms → 12 FAIL timeout,
exit 1, baris `test-seam:` tercatat). **TIDAK ADA workflow CI
yang ditambahkan** — sesuai audit V11 §11 butir 3: tidak ada
workflow yang mengeksekusi input PR tak tepercaya tanpa threat
model.

**Tes regresi negatif diulang pada harness baru (log
`run-f032-negative-v2318.txt`, SHA-256
`0028237b23af9e93a160ed8c2883e08242775c1d2c969ad7107b90e6889e68dc`,
307 baris; Bun 1.4.4, 2026-11-08T03:59:29Z):** `--runs 0`,
`--runs abc`, `--runs -1`, nilai hilang, flag hilang,
`--runs 11`, `--runs 1.5` — ketujuh kasus tetap exit 2 tanpa
mencetak sukses; kontrol positif `--runs 1` exit 0 dengan 12
RESULT + `parent done: all child runs ok`. Rerun dibenarkan
karena `run-f029.ts` berubah (protokol butir 6). Log v2.3.17
(`run-f032-negative-v2317.txt`) dipertahankan sebagai bukti
historis.

**F-033 — dipertahankan sebagai VM evidence saja.** Rasio
1,12–2,62× (median VmHWM) TIDAK diubah menjadi angka
sizing/cgroup/acceptance. **Ambang pra-tes H-RES-05 ditetapkan
di sini secara eksplisit:** ambang itu ditentukan oleh operator
staging dari budget memori target (runtime, kernel, cgroup,
concurrency, dan konfigurasi yang sama dengan target) pada saat
staging disiapkan — BUKAN diturunkan dari rasio VM 1,12–2,62×
atau dari angka forced-GC mana pun. Gate G-I mensyaratkan
high-water RSS/VmHWM terukur di staging ≤ ambang pra-tes itu,
pada kedua mode GC, dengan fixture v2.3.17. Eksperimen memori
F-029 TIDAK diulang di v2.3.18: child terukur dan metodologi byte
tidak berubah (yang berubah hanya gate seam + oracle/file PID
pada jalur uji); kontrol positif `--runs 1` pada harness baru
membuktikan jalur default tetap bekerja end-to-end.

**F-030/F-009 — dipertahankan sebagai blocker.** Tidak ada
perubahan package/lockfile/source sebelum keputusan owner
terpisah (keputusan G-G). Digest rilis Bun, provenance/attestasi
SDK, frozen install, typecheck, dan build clean external tetap
NOT PROVIDED — tidak ada yang dikarang.

**F-019 dan F-028 — dipertahankan NOT VERIFIED.** `checkLink`
TIDAK di-invoke, tidak ada public share, tidak ada perubahan
runtime; kontrol F-019 (a)–(e) tetap belum satu pun terpenuhi;
template manifest deployment tetap kosong (semua field NOT
PROVIDED).

**Staging owners — tetap UNASSIGNED, dicatat sebagai BLOCKED.**
Tidak ada keputusan Rama/provider sejak v2.3.17, maka tidak ada
nama owner yang diisi: staging operator, runtime provider,
egress owner, DB/runtime owner, alert channel / operator
penerima, dan rollback owner tetap UNASSIGNED — masing-masing
dengan prasyarat yang jelas di matriks v2.3.18 §2 (butir 7).
STAGE-P01..P12 tetap memiliki prasyarat/prosedur/oracle/evidence;
ST-12 tidak PASS tanpa alert yang benar-benar diterima operator
(ST-12-LAT-01..03 dipertahankan). Tabel readiness 1 halaman
`STAGING_READINESS_V2318.md` merangkum keenam peran + dua bukti
minimum (identitas artifact read-only; Link Scanner nonaktif di
semua jalur invocation) — semua UNASSIGNED / BLOCKED / NOT
PROVIDED; menjawab butir 3 brief eksekusi
`MUSE_EXECUTION_BRIEF_2026-11-08.md` (commit `8441aec`).

**Carry-forward (handoff V11 butir 8).** F-001..F-005,
F-006b/F-006c, F-016..F-019, F-028, U-38/U-33/U-41/U-43/U-44/
U-45/U-46 hanya berubah status berdasarkan bukti atau keputusan
owner yang dapat dilacak — tidak ada perubahan status di
v2.3.18. U-46 tetap keputusan owner yang belum ada (opsi (a)/(b)
tetap terbuka; implementasi pensinyalan tetap DIBLOKIR). Log
gagal awal SU-T5 TIDAK direkonstruksi (tetap NOT PRESERVED).
Tidak ada detail narasi insiden atau data wallet apa pun di
dokumen revisi ini.

**Proposal terpisah (handoff V11 butir 9 — HOLD).** Tidak ada
perubahan source/lockfile/DB/deployment yang diusulkan BARU di
v2.3.18. Proposal yang sudah ada (P-1/P-2/P-3 F-030 di matriks
v2.3.16 §4 butir 8) dibawa utuh ke matriks v2.3.18 §4 butir 9
dan tetap HOLD — masing-masing butuh keputusan owner dan
otorisasi tahap (b) terpisah sebelum dieksekusi.

**Risiko baru v2.3.18 (§G):** U-73 (F-034 — oracle terminasi PID
menerima semua exception sebagai "mati"; rasio v2.3.17 TIDAK
dibatalkan — yang diperbaiki adalah kekuatan buktinya) dan U-74
(F-035 — file PID di path tetap `/tmp`, rentan symlink/TOCTOU +
concurrency). **U-70 DIPERBARUI** (jalur timeout kini teruji
dengan oracle ketat + direktori privat; sisa risikonya adalah
seam yang kini diperketat) dan **U-72 DIPERBARUI** (seam kini
di-gate mode test eksplisit + allowlist realpath + tolak symlink;
sisa risiko: operator yang sengaja menyetel `F029_TEST_MODE=1`
dengan fixture yang disetujui lalu mengklaim run itu sebagai
run produksi — dimitigasi baris log `test-seam:` eksplisit).
U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa
perubahan status.

**Gate konkret berikutnya (v2.3.18 → v2.3.19).** Revisi ini
bukan pengulangan status: ia memperbaiki oracle terminasi PID
(F-034) dan file PID (F-035) dengan bukti tes regresi baru, dan
memperketat test seam (U-72), sambil mempertahankan F-030
sebagai CONFIRMED BLOCKER, LIVE VERSION / DEPLOYMENT APPROVAL =
NOT VERIFIED (F-028) dan F-019 BLOCKED. Gate berikutnya dan
prasyaratnya: **(G-A)** keputusan owner atas scope perubahan
source (F-020); **(G-B)** bukti runtime F-019 (versi/digest +
kontrol disabled (a)–(e)); **(G-C)** keputusan tenancy F-018
(pernyataan resmi provider tentang scope `ctx.db`); **(G-D)**
keputusan U-46; **(G-E)** staging tersedia + peran UNASSIGNED
terisi; **(G-F)** keputusan cache F-022 — owner menerima cabang
pilihan (rekomendasi) vs alternatif; **(G-G)** keputusan Bun
F-009 — kanonik 1.3.10 vs 1.4.4 (rekomendasi Opsi A + SDK
vendorkan vs fallback Opsi B, §D.4.27); **(G-H)** eksekusi
harness H-RES-02/03/05 yang sudah dikoreksi — prasyarat:
otorisasi implementasi tahap (b) (G-A) + staging tersedia
(G-E) + verifikasi ulang perilaku Bun pada versi kanonik
(U-62, bagian staging); **(G-I)** stress test memori
H-RES-03/05 pada staging (chunk > cap, 3 script paralel,
fixture batas 1.000.000 + varian cap−1/cap+1 + non-ASCII
byte-matched terukur eksak, high-water RSS/VmHWM ≤ ambang
pra-tes yang ditetapkan operator staging dari budget memori
target, kedua mode GC) + proses deployment manifest terisi untuk
setiap deployment (F-028); **(G-J)** keputusan
reproducibilitas F-030 — prasyarat: keputusan owner G-G
(Opsi A vs Opsi B) + penggantian SDK path (paket
ter-publish/vendorkan/sumber resmi) + bukti clean-builder
(frozen install + typecheck + build exit 0, lockfile tidak
berubah, dependency digest tercatat, tanpa `/opt/hatch`).
Pemicu revisi v2.3.19: keputusan owner atas
G-A/G-C/G-D/G-F/G-G, ATAU bukti runtime G-B, ATAU staging
tersedia (G-E), ATAU audit independen V12 — mana pun yang
datang dulu. Tidak ada revisi baru yang hanya mengulang
status v2.3.18.

**Hard gates — ditegaskan kembali (v2.3.18):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah
(HOLD perubahan source mirror sampai klarifikasi F-020 tetap
berlaku), no production testing (termasuk tidak memanggil
`checkLink`). F-001..F-005, F-016/F-017/F-022, F-018 tetap
OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..20 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup.

### D.4.30 Jawaban atas audit independen V12 — F-036, F-037, trust boundary F-035, proposal F-001..F-005 (BARU, v2.3.19)

Audit V12 (`SSRF_INDEPENDENT_AUDIT_V12.md`, commit `cd96768`,
2026-11-08 11:36 WIB) meninjau v2.3.18 (commit `3f129fc`) dan
menyatakan: F-035 ADDRESSED pada level harness VM (dengan F-037
pada kode tes), U-72 ADDRESSED pada level harness lokal, F-034
PARTIALLY ADDRESSED (parser menerima starttime 0 — F-036), dua
masalah baru pada test harness (F-036, F-037), dan butir paling
penting brief eksekusi — proposal remediasi implementation-ready
F-001..F-005 — BELUM DIKERJAKAN. Revisi ini menjawab keenam butir
Handoff V12 §10 satu per satu. Matriks respons lengkap:
`SSRF_RESPONSE_MATRIX_V2319.md`. Proposal:
`SSRF_PROPOSAL_F001_F005_V2319.md`.

**F-036 — parser PID menolak starttime 0 (audit V12 §5).**
Audit V12 benar: `pid-oracle.ts:82-95` v2.3.18 memeriksa
`starttime < 0`, bukan `<= 0`, padahal kontrak komentar baris
12-15 menyebut kedua nilai harus positive safe integers — record
`<pid> 0` diterima dan `classifyLiveness()` dapat mengembalikan
"dead" untuk child yang masih hidup (false-pass assertion
terminasi). **DIPERBAIKI v2.3.19:** `parsePidFile()` dan
`parseProcStat()` menolak `starttime <= 0`; `classifyLiveness()`
memvalidasi input pid/recordedStarttime sendiri (invalid →
"inconclusive", tidak pernah "dead", `kill()` tidak pernah
dipanggil); helper baru `verifyPidFile()` gagal-cepat untuk
SELURUH file bila ada parse error — tidak ada assertion liveness
atas record parsial; driver E2E memakai `verifyPidFile()`.
Tes regresi `test-pid-oracle.ts` (50 assert PASS, log
`test-pid-oracle-v2319.txt`, Bun 1.4.4, uid 65534): starttime 0
(kasus penerimaan audit `parsePidFile("1234 0\n")` harus error),
negatif, non-integer, unsafe integer, sangat besar, valid+invalid
campur, `parseProcStat` starttime 0 → null, 8 kasus validasi
input oracle, 4 kasus fail-fast `verifyPidFile()`.

**F-037 — keselamatan filesystem pada tes F-035 dan U-72
(audit V12 §6).** Audit V12 benar: `test-f035-pidfile.ts`
v2.3.18 menghapus `/tmp/f032-hang-child.pid` dan
`/tmp/f035-sentinel-target.txt` dengan `rmSync(force)` lalu
menulis ulang sentinel dengan `writeFileSync` (truncate/follow),
dan `test-u72-seam.ts` v2.3.18 memakai nama tetap
`/tmp/u72-evil-child.ts`, `/tmp/u72-link-to-hang-child.ts`,
`/tmp/u72-pidfile.txt` dengan `writeFileSync` default — pada host
bersama, symlink yang ditanam pihak lain dapat diikuti write dan
file asing dapat terhapus; menjalankan tes sebagai root
memperbesar dampak. **DIPERBAIKI v2.3.19:** kedua file tes
ditulis ulang — semua fixture di SATU direktori privat per-run
(`mkdtemp`, 0700); file dibuat EKSKLUSIF (`openSync "wx"`, 0600);
symlink dibuat hanya setelah memastikan path tidak ada; bila
path legacy SUDAH ADA saat tes mulai, tes GAGAL AMAN tanpa
menyentuhnya; teardown hanya menghapus objek yang (dev,ino)-nya
masih cocok dengan yang dicatat saat pembuatan; kedua tes
MENOLAK berjalan sebagai root (uid 0). Tes regresi F-035 (log
`test-f035-pidfile-v2319.txt`, 59 assert PASS, uid 65534): DUA
skenario (legacy = symlink DAN regular file, masing-masing dua
driver paralel) — file lama tidak pernah berubah/terhapus, set
PID disjoint, cleanup terverifikasi, tidak ada leftover `/tmp`.
Tes regresi U-72 (log `test-u72-seam-v2319.txt`, 25 assert PASS,
uid 65534): 7 penolakan + 1 penerimaan + pemeriksaan direktori
privat + cleanup terverifikasi. **Catatan eksekusi non-root:**
repo tidak dapat dibaca `nobody` (mode 2770 pada mount yang
menegakkan akses host-side); tes dijalankan dari salinan stage
byte-identik di `/tmp/f036-stage` (sha256 tiap file `.ts`
diverifikasi IDENTIK dengan repo sebelum run). **Hambatan yang
dicatat:** run pertama tes F-035 v2.3.19 gagal 58 PASS + 1 FAIL
karena bug urutan self-check di tes itu sendiri (cek leftover
berjalan setelah `mkdtemp` sehingga menghitung direktorinya
sendiri) — bukan cacat harness/driver; diperbaiki (cek dipindah
sebelum `mkdtemp`), re-run → 59 PASS (lihat matriks §10 butir 2).

**Trust boundary F-035 — child writer (audit V12 §4.2, §10
butir 3).** Audit V12 mencatat child masih memakai `lstat` lalu
`appendFileSync(path)` dan meminta klarifikasi apakah proses
tidak tepercaya UID-sama termasuk threat model. **KEPUTUSAN
v2.3.19 (asumsi yang diterima, dinyatakan eksplisit):** proses
tidak tepercaya dengan UID YANG SAMA DI LUAR threat model
harness — (1) harness berjalan single-user satu UID oleh desain;
(2) proses same-UID sudah dapat ptrace driver (child adalah
descendant), membaca `/proc/<driver-pid>/mem`, memberi signal/
membunuh driver, dan menulis file apa pun yang dapat ditulis
driver — tidak ada cek level-file yang dapat mengisolasi terhadap
same-UID; (3) direktori run 0700 sudah mengecualikan UID lain;
(4) child adalah kode TEPERCAYA (di-spawn via seam U-72 dari
path yang di-allowlist). **Perbaikan yang tetap diterapkan
(defense-in-depth):** pola `lstat`+`appendFileSync` DIGANTI open
fd `O_WRONLY|O_APPEND|O_NOFOLLOW` (numerik; diverifikasi probe
sebagai nobody: symlink → ELOOP, regular file → terbuka dan
ter-append) + verifikasi `fstat` pada DESCRIPTOR (regular, uid
sama, mode 0600, (dev,ino) sama dengan yang dicatat driver via
`F032_PID_FILE_DEV`/`F032_PID_FILE_INO`) + satu `writeSync`;
tanpa env pin, child exit 1. Skenario penggantian path di antara
validasi dan write TIDAK DAPAT mengalihkan write ke target lain.
Uji E2E diulang (log `run-f032-timeout-e2e-v2319.txt`, 12/12
`dead` via ESRCH). Sisa risiko dicatat U-77: tinjau ulang asumsi
ini bila harness kelak jalan di host bersama dengan same-UID tak
tepercaya.

**Proposal implementation-ready F-001..F-005 (audit V12 §10
butir 4 — prioritas utama; brief butir 2).** **SELESAI
v2.3.19:** `SSRF_PROPOSAL_F001_F005_V2319.md`. Untuk setiap
finding: file/fungsi/baris diverifikasi pada current main
(commit `cd96768`) — `fetchText` :147-168, `fetchTextOnce`
:170-210, `lookupRdapOnce` :220-268, `analyze` :369 + deadline
:378 + page cap :396 + script fetch :511-538, `addProject`
:1103-1262, `checkLink` defineAction :1365, `addProject`
defineAction :1486, `schema.ts` (67 baris, tanpa unique/index/
owner), migrasi drizzle `0001..0005`. Temuan baru saat
verifikasi: RDAP memakai `redirect: "follow"` tanpa validasi hop
(F-001f — dimasukkan ke proposal §1); tidak ada lease/rate
limit/429/503 di `actions.ts` (F-003c belum ada sama sekali).
Proposal memberi: file list, pseudodiff, threat model, mitigasi,
test IDs (H-SSRF-21..26, H-RES-07..12, H-CAT-04..06,
H-TEN-06..07, H-AUTH-04..06 — baru), negative cases + expected
PASS/FAIL, staging dependencies, migration/rollback, residual
risk. SSRF mencakup redirect-by-redirect validation, DNS
rebinding terikat destination koneksi aktual, IPv4/IPv6/mapped/
private/link-local/metadata, bounded streaming, decompression,
aggregate byte budget, total deadline/cancellation. F-004 dan
tenancy/ownership F-018 dirancang sebagai SATU migrasi koheren
(migrasi `0006`); F-005 menjelaskan auth dan tenant scoping
tanpa mengasumsikan SDK behavior yang belum dibuktikan (tiga
opsi A/B/C; default C — nonaktifkan `addProject`). **Status
F-001..F-005 tetap OPEN/BLOCKED** — proposal bukan implementasi
dan bukan otorisasi tahap (b). Keputusan owner yang masih
terbuka: K-1..K-6 + G-A (proposal §7).

**Staging readiness + blocker (audit V12 §10 butir 5).**
`STAGING_READINESS_V2319.md` (carry-forward dari V2318): keenam
peran tetap UNASSIGNED/BLOCKED; tidak ada nama yang dikarang;
tidak ada staging yang tersedia; `checkLink` TIDAK di-invoke;
tidak ada bukti runtime baru.

**Rekonsiliasi historis + batas bukti (audit V12 §10 butir 6).**
F-029 TIDAK diulang (tidak ada perubahan metodologi/runtime yang
relevan). SU-T5 TIDAK direkonstruksi. Bukti VM dipisah ketat dari
staging/produksi — semua log baru berlabel VM lokal, Bun 1.4.4,
uid 65534. F-033, F-030/F-009, F-019/F-028 dipertahankan tanpa
perubahan status (lihat matriks §2).

**Carry-forward (handoff V12 butir 5–6).** F-001..F-005,
F-006b/F-006c, F-016..F-019, F-028, U-38/U-33/U-41/U-43/U-44/
U-45/U-46 hanya berubah status berdasarkan bukti atau keputusan
owner yang dapat dilacak — proposal v2.3.19 mengubah status
F-001..F-005 dari "proposal belum ditulis" menjadi "proposal
implementation-ready tersedia untuk ditinjau", BUKAN menjadi
closed. U-46 tetap keputusan owner yang belum ada (opsi (a)/(b)
tetap terbuka; implementasi pensinyalan tetap DIBLOKIR). Log
gagal awal SU-T5 TIDAK direkonstruksi (tetap NOT PRESERVED).
Tidak ada detail narasi insiden atau data wallet apa pun di
dokumen revisi ini.

**Proposal terpisah (HOLD).** Tidak ada perubahan source/
lockfile/DB/deployment yang diusulkan BARU di v2.3.19 di luar
proposal F-001..F-005 itu sendiri. Proposal yang sudah ada
(P-1/P-2/P-3 F-030 di matriks v2.3.16 §4 butir 8) dibawa utuh ke
matriks v2.3.19 §4 butir 4 dan tetap HOLD — masing-masing butuh
keputusan owner dan otorisasi tahap (b) terpisah sebelum
dieksekusi.

**Risiko baru v2.3.19 (§G):** U-75 (F-036 — parser PID menerima
starttime 0), U-76 (F-037 — tes regresi memakai path tetap
`/tmp`), U-77 (F-035 — asumsi trust boundary UID-sama yang
diterima). **U-70 DIPERBARUI** (jalur timeout kini memakai
`verifyPidFile()` fail-fast + child writer fd-based; sisa
risikonya adalah seam yang kini diperketat dan ditulis ulang
untuk F-037), **U-72 DIPERBARUI** (tes seam ditulis ulang:
fixture privat, exclusive create, fail-safe, cleanup
terverifikasi; sisa risiko: operator yang sengaja menyetel
`F029_TEST_MODE=1` dengan fixture yang disetujui lalu mengklaim
run itu sebagai run produksi — dimitigasi baris log `test-seam:`
eksplisit), **U-73 DIPERBARUI** (celah starttime 0 ditutup
v2.3.19), **U-74 DIPERBARUI** (child writer kini fd-based
O_NOFOLLOW + pin (dev,ino); trust boundary UID-sama
diklarifikasi — lihat U-77). U-38/U-33/U-41/U-43/U-44/U-45/U-46
dipertahankan tanpa perubahan status.

**Gate konkret berikutnya (v2.3.19 → v2.3.20).** Revisi ini
bukan pengulangan status: ia menutup celah parser F-036,
menulis ulang keselamatan filesystem tes F-037, mengklarifikasi
+ memperkeras trust boundary child writer F-035, dan
menyelesaikan proposal implementation-ready F-001..F-005 yang
ditunda di v2.3.18 — sambil mempertahankan F-030 sebagai
CONFIRMED BLOCKER, LIVE VERSION / DEPLOYMENT APPROVAL =
NOT VERIFIED (F-028) dan F-019 BLOCKED. Gate berikutnya dan
prasyaratnya: **(G-A)** keputusan owner atas scope perubahan
source (F-020); **(G-B)** bukti runtime F-019 (versi/digest +
kontrol disabled (a)–(e)); **(G-C)** keputusan tenancy F-018
(pernyataan resmi provider tentang scope `ctx.db`); **(G-D)**
keputusan U-46; **(G-E)** staging tersedia + peran UNASSIGNED
terisi; **(G-F)** keputusan cache F-022 — owner menerima cabang
pilihan (rekomendasi) vs alternatif; **(G-G)** keputusan Bun
F-009 — kanonik 1.3.10 vs 1.4.4 (rekomendasi Opsi A + SDK
vendorkan vs fallback Opsi B, §D.4.27); **(G-H)** eksekusi
harness H-RES-02/03/05 yang sudah dikoreksi — prasyarat:
otorisasi implementasi tahap (b) (G-A) + staging tersedia
(G-E) + verifikasi ulang perilaku Bun pada versi kanonik
(U-62, bagian staging); **(G-I)** stress test memori
H-RES-03/05 pada staging (chunk > cap, 3 script paralel,
fixture batas 1.000.000 + varian cap−1/cap+1 + non-ASCII
byte-matched terukur eksak, high-water RSS/VmHWM ≤ ambang
pra-tes yang ditetapkan operator staging dari budget memori
target, kedua mode GC) + proses deployment manifest terisi untuk
setiap deployment (F-028); **(G-J)** keputusan
reproducibilitas F-030 — prasyarat: keputusan owner G-G
(Opsi A vs Opsi B) + penggantian SDK path (paket
ter-publish/vendorkan/sumber resmi) + bukti clean-builder
(frozen install + typecheck + build exit 0, lockfile tidak
berubah, dependency digest tercatat, tanpa `/opt/hatch`).
**(G-K) (BARU)** review + keputusan atas proposal F-001..F-005
— prasyarat: tidak ada (proposal sudah tersedia untuk ditinjau);
hasil: keputusan per K-item (K-1..K-6, proposal §7) + otorisasi
tahap (b) per change set, atau penolakan dengan alasan.
Pemicu revisi v2.3.20: audit independen V13, ATAU keputusan
owner atas K-1..K-6/G-A/G-C/G-D/G-F/G-G (G-K), ATAU bukti
runtime G-B, ATAU staging tersedia (G-E) — mana pun yang datang
dulu. Tidak ada revisi baru yang hanya mengulang status v2.3.19.

**Hard gates — ditegaskan kembali (v2.3.19):** no Link Scanner
activation, no public deployment, no production build, no DB/catalog
change, no source implementation tanpa owner approval terpisah
(HOLD perubahan source mirror sampai klarifikasi F-020 tetap
berlaku), no production testing (termasuk tidak memanggil
`checkLink`). F-001..F-005, F-016/F-017/F-022, F-018 tetap
OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..26 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup.

---

### D.4.32 Jawaban atas audit independen V14 — F-044, F-045, F-046 + Handoff §9 (BARU, v2.3.21)

**Catatan kejujuran (U-88):** changelog v2.3.20 merujuk §D.4.31
sembilan kali, tetapi badan §D.4.31 tidak pernah ditulis di dokumen
ini. Revisi v2.3.21 TIDAK memalsukan §D.4.31 secara retroaktif —
bagian ini diberi nomor §D.4.32 dan ketiadaan §D.4.31 dicatat sebagai
risiko U-88 di matriks v2.3.21 §5 dan proposal v2.3.21 Lampiran B.

**F-044 — migrasi SQLite (High):** teks v2 (ALTER TABLE ADD COLUMN
... STORED) SUPERSEDED. Pendekatan yang dipilih: rebuild
create/copy/validate/swap dalam satu transaksi atomik (prosedur 12
langkah SQLite). Bukti VM atas ARTEFAK migrasi yang sebenarnya
(`evidence/v2321/0006_unified_ownership_and_uniqueness_v2321.sql`,
SHA-256 `6c5bcbdc…`): H-MIG-00 (reproduksi — gagal pada tabel berisi
di 3.53.4 + 3.45.1; berhasil pada tabel kosong — U-96, jebakan
dev/prod), H-MIG-01 (sukses; 12/2/2 baris utuh; id lanjut 13),
H-MIG-02 (inspeksi schema), H-MIG-03/04 (pre-check abort, DB
byte-identik), H-MIG-05 (sabotase + crash tanpa COMMIT → rollback
penuh), H-MIG-06 (backup/restore byte-identik), H-MIG-07 (re-run
gagal bersih), H-MIG-08 (down migration; struktur == base),
H-MIG-09 (lintas versi 3.45.1). Total 109 PASS (Bun) + 25 PASS
(CLI), 0 FAIL. Lantai versi: >= 3.31.0 (up) / >= 3.35.0 (down);
versi runtime produksi NOT VERIFIED (U-90).

**F-045 — CHECK constraint chain (Medium):** dua CHECK bernama
sebagai SQL nyata dalam rebuild (`projects_chain_allowlist_ck`,
`projects_contract_format_ck`); direct SQL INSERT/UPDATE negatif
teruji termasuk NULL contract (H-CAT-11); 8 chain allowlist lolos +
uniqueness teruji (H-CAT-12); JS == DB canonical untuk semua baris
+ edge (H-CAT-13).

**F-046 — legacy checks privacy (Medium):** default fail-closed
L-A — `owner_user_id = NULL` berarti "tanpa pemilik tercatat",
BUKAN publik; predikat lama v2.3.20 (`OR owner_user_id IS NULL`)
DIHAPUS setelah harness membuktikan kebocoran 2 baris legacy ke
principal B (H-TEN-11d). Dua principal teruji (H-TEN-11..15);
scope `ctx.db` dinyatakan NOT VERIFIED; keputusan owner baru K-10
(L-A/L-B/L-C); konsekuensi anonim write-only dicatat (U-89).

**Koreksi faktual (U-87):** katalog repo adalah 12 baris, bukan 15
seperti diklaim v2.3.20; migrasi v3 memakai jumlah aktual, bukan
hardcode. **Temuan proses (U-94/U-95):** DDL v2 mengandung typo
sintaks dan mishandle prefix `0X` — keduanya ditemukan karena
harness mengeksekusi artefak, bukan menyalin teks tes; pelajaran:
DDL proposal harus selalu dieksekusi harness sebelum diklaim siap.

**Carry-forward:** F-001..F-005 tetap OPEN/BLOCKED; F-019/F-028
NOT VERIFIED; F-030 CONFIRMED BLOCKER; STAGE-P01..P12 BLOCKED.
Gate G-K diperbarui (K-1..K-5/K-7..K-10 + otorisasi tahap (b)).
Pemicu revisi v2.3.22 adalah audit independen V15, ATAU keputusan
owner atas K-1..K-5/K-7..K-10/G-A/G-C/G-D/G-F/G-G (G-K), ATAU bukti
runtime G-B (termasuk versi SQLite produksi, U-90), ATAU staging
tersedia (G-E). [TEKS ASLI v2.3.21 — pemicu itu kini TERPENUHI oleh
audit V15; revisi ini adalah v2.3.22.]

### D.4.33 Jawaban atas audit independen V15 — F-047, F-048 + Handoff §9 (BARU, v2.3.22)

**F-047 — portabilitas deployment free-tier (High):** DIBUKTIKAN
BLOCKED oleh percobaan clean-clone build, bukan diklaim. Clone bersih
@ `c53fd73` → `unshare -rm` + bind dir kosong ke `/opt/hatch` →
`bun install --frozen-lockfile` FAIL exit 1 (`ENOENT extracting
tarball from @hatch/space-sdk`) dan `bun run build` FAIL exit 1
(`Could not resolve: "@hatch/space-sdk"`). Kontrol dengan `/opt/hatch`:
install OK, `build:server` OK (191 modul, `actions.js` 221 KB),
`build:client` FAIL exit 1 — SDK menolak build tangan ("This web
artifact cannot be built by hand...") — temuan BARU U-97: portabilitas
terhalang dua lapis independen (tarball tak terdistribusi + build
client digerbangi tooling artifact). SDK `@hatch/space-sdk` 0.14.0,
tarball SHA-256 `f2cb7b25…ad49e`; `npm view` → 404 (tidak ada sumber
redistributable publik yang sah). Aksi owner minimal: pernyataan/
distribusi SDK (M-1), kontrak build client (M-2), atau jawaban T-01
(M-6). Log mentah: `evidence/v2322/clean-clone-build-no-hatch.txt`
(SHA-256 `7a3c3331…`) + `...-with-hatch-control.txt` (SHA-256
`4a74ba04…`) + driver `run-clean-clone-build.sh` (terverifikasi
reproduksi: INSTALL_EXIT=1, BUILD_EXIT=1).

**F-048 — README (Medium):** direkonsiliasi langsung di `README.md`
(file dokumentasi). Klaim "Repo GitHub: Belum ada" DIHAPUS; status
dibedakan 4 artefak (live Hatch artifact / mirror repo / foundation
package / deployment standalone masa depan) dengan tanggal verifikasi
2026-11-08 + bukti atau label NOT VERIFIED; katalog 15 (live) vs
seed repo 12 (U-87); Supabase/Vercel tetap "belum ada" + NOT VERIFIED.
Uji regresi V15 §3.3 lolos dari README saja. Residual: URL/digest
live artifact tetap NOT VERIFIED (tidak ada public link).

**F-044/F-045/F-046 — carry-forward terverifikasi:** TIDAK diuji ulang
(tidak ada perubahan material; protokol melarang pengulangan tanpa
alasan). Verifikasi silang SHA-256 kelima file kanonik v2.3.21 COCOK;
tail log 109 PASS 0 FAIL + H-MIG-09 ALL PASS. Tidak ditemukan cacat
pada v2.3.21. F-004 tetap OPEN/BLOCKED; K-10 tersisa; scope `ctx.db`
NOT VERIFIED.

**Feasibility deployment:** `DEPLOYMENT_FEASIBILITY_V2322.md` —
inspeksi tree lengkap (7 actions; `ctx.db` 7×; `ctx.inference` 1×;
env var NOL; tanpa HTTP entry point/Dockerfile/start script; tanpa
test/CI; auth boundary NOT VERIFIED) + matriks free tier dari dokumen
resmi provider yang dicek langsung 2026-11-08 (Vercel Hobby
non-komersial + tunggu 30 hari; Supabase pause 7 hari + DB 500 MB;
Workers 100k req/hari + 10 ms CPU + 50 subrequest; D1 5M read/100k
write per hari) + jalur aman terkecil BLOCKED + artefak hilang M-1..M-10.

**Paket beta:** diverifikasi di branch `beta-readiness` @ `fd4441a`
(5 file ADA, keputusan BLOCKED, SHA paket `850592a`); klaim V15 "no
beta package found" = gap visibilitas branch. File TIDAK diduplikasi
ke `main`; pointer singkat `CLOSED_BETA_PACKAGE_POINTER.md`.

**Pengembangan paralel:** branch `dev` dari `main` @ `c53fd73`
(`bd5d8fa` + `f25bb24`) berisi `BACKLOG.md` (D-01..D-10) — tanpa kode.
Perbedaan nama dicatat (U-98): `dev` vs `development` (`c53fd73` §1).

**Direktif `c53fd73` + jawaban GPT link-jadi:** `c53fd73`
(implementation-first di branch development) masuk 13:41 WIB —
implementasi TIDAK dieksekusi dalam revisi ini (otorisasi run ini
desain+bukti saja; U-99 — keputusan diserahkan ke agen induk/pemilik).
ChatGPT menjawab diskusi link-jadi 13:47 WIB (`59b02d0`): rangking
C/A/D/B; definisi "project link" vs "application trial link"; kriteria
T-01; gate minimum owner-only trial. Ringkasan di
`DEPLOYMENT_FEASIBILITY_V2322.md` §4.1.

**Risiko baru U-97..U-102:** U-97 (SDK menolak build tangan), U-98
(nama branch), U-99 (otorisasi implementasi), U-100 (diskusi link-jadi
— DIJAWAB GPT, tindak lanjut OPEN), U-101 (klasifikasi Vercel Hobby),
U-102 (CPU checkLink vs 10 ms, NOT VERIFIED).

**Carry-forward:** F-001..F-005 tetap OPEN/BLOCKED; F-019/F-028
NOT VERIFIED; F-030 CONFIRMED BLOCKER; STAGE-P01..P12 BLOCKED.
Gate G-K diperbarui (K-1..K-5/K-7..K-10 + otorisasi tahap (b) + U-99 +
T-01 + M-1/M-2). Pemicu revisi v2.3.23 adalah audit independen V16,
ATAU tanggapan ChatGPT atas diskusi link-jadi, ATAU keputusan owner
atas K-1..K-5/K-7..K-10/U-99/T-01 (G-K), ATAU bukti runtime G-B,
ATAU staging tersedia (G-E).

---

### D.4.34 Jawaban atas audit independen V16 — implementasi D-01..D-04 di branch `dev` + Handoff §6 (BARU, v2.3.23)

**Otorisasi (dasar hukum revisi ini):** V16 §1 keputusan 1 +
§2 penilaian U-99 + direktif owner `c53fd73` + instruksi owner
terbaru. U-99 DITUTUP sebagai blocker proses; U-98 terjawab
(`dev` = development branch). Implementasi HANYA di `dev`
(base `main` @ `7e82818`, merge `67cc7c7`); `main`, produksi,
live artifact `cek-link-airdrop`, deployment config, dan `app.db`
live TIDAK diubah; Link Scanner TIDAK diaktifkan; tanpa
destructive testing produksi. Status keseluruhan tetap **DESIGN
REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY
FOR COMMUNITY BETA**.

**What materially changed (vs v2.3.22 — desain-only):** revisi ini
menulis KODE APLIKASI NYATA + mengujinya atas FILE AKTUAL di VM
(bukan proposal/harness model saja). Tujuh commit di `dev`:
`67cc7c7` (merge), `e022869` (migrasi 0006), `daec8ea` (schema +
owner scoping), `9c666a4` (guard + wiring fetch), `247d98a`
(migrasi 0007 + scan-limits), `514352b` (fix H-SSRF-02/12b/18),
`24de11e` (fix H-RES-07 + H-LEASE). Detail + bukti lengkap:
`SSRF_RESPONSE_MATRIX_V2323.md` §2/§8 + `evidence/v2323/`.

**D-01 — F-044/F-045/F-046 (V16 §6 butir 1):** migrasi 0006
AKTUAL di `site/drizzle/` (rebuild create/copy/validate/swap;
teks v3 diadaptasi format migrator SAJA — breakpoint satu
statement, tanpa kontrol transaksi/PRAGMA, tanpa SELECT validasi
di file karena migrator mengabaikannya, U-93) + `schema.ts`
mirror + owner scoping + `catalog.ts`. Legacy NULL fail-closed
L-A (DL-23-03); K-10 tersisa. H-MIG-00..09 + H-CAT-11..13 +
H-TEN-11..15 + DK-01..07 = **232 PASS / 0 FAIL** (migrator CLI
nyata, Bun SQLite 3.53.4 + CLI 3.45.1; re-run verifikasi run-5
juga 232/0). Down migration 0006 + 0007 (operator-run, sqlite3
CLI) teruji. Lantai SQLite >= 3.31.0 (up) / >= 3.35.0 (down);
runtime produksi NOT VERIFIED (U-90).

**F-001 (V16 §6 butir 2):** `ssrf-guard.ts` + wiring
`actions.ts` pada jalur fetch `checkLink` yang sebenarnya:
canonicalizeHost + port policy (http→80/https→443), resolveAll
(ALL A/AAAA, 5 dtk, late-result dibuang), validateDestination
(empty/mixed/malformed → DENY), nodeConnector pinned lookup
(Pendekatan 1, Model B raw bytes; TLS SNI + verifikasi sertifikat
terhadap hostname), fetchGuardedOnce (revalidasi tiap hop, TANPA
fallback fetch), validateUrlForFetch (K-1: guard SEBELUM cache),
RDAP via guard (redirect manual), script SERIAL + same-origin.
H-SSRF **32/32 PASS** (stub + server lokal; nol request ke
metadata/internal/publik). Temuan diperbaiki: multicast 224/4
(U-108), trailing dot (RFC 1034 §3.1), timeout resolver injeksi
(H-SSRF-18; race 5 dtk kini membungkus resolver injeksi juga).

**F-002/F-003/F-022/F-025/F-026/F-027 (V16 §6 butir 3):**
`readCappedStream` (L0 wire / L1 decoded / L3 aggregate
1.000.000 via `ScanBudget` sinkron) + deadline total 20 dtk
(koreksi dari 30 dtk di kode lama — bukan keputusan pemilik) +
Content-Type/Encoding allowlist + migrasi 0007 + `scan-limits.ts`
(lease atomik max 5, TTL 25 dtk > deadline; rate 10/menit +
100/jam per principal; bucket anonim) + wiring `runCheck`
fail-closed. H-RES **15/15 PASS** + H-LEASE **8/8 PASS**.
Temuan diperbaiki: kode error aggregate-cap (DL-23-06) +
`rowsAffected` RETURNING di libsql (DL-23-05; U-107: semantik
`SpaceDb.run` produksi NOT VERIFIED). IP-based enforcement
BLOCKED (U-85 — Ctx tanpa peer TCP address). Memori bounded
TIDAK diklaim dari slice/model VM.

**F-004/F-005/F-018 + auth boundary (V16 §6 butir 4):**
uniqueness via unique index + tangkap pelanggaran (SpaceDb
tanpa `transaction` — atomicity dari statement/index);
principal dari `ctx.viewer` (ADA di tipe SDK 0.14.0:
`LocalViewer`/`CloudflareViewer` — populasi runtime NOT
VERIFIED, STAGE-P02); owner scoping semua actions; H-TEN PASS
via handler `Actions` asli + mock ctx + libsql nyata. Gate §5
(export legacy) tetap BELUM diimplementasikan.

**Landing page (V16 §6 butir 5):** dibangun parent agent sebagai
artifact BARU terpisah (slug `airdrop-generate`; live TIDAK
disentuh; verifikasi internal lulus) — TAPI `share.shared=false`,
BELUM ADA URL publik → partially addressed; acceptance "URL HTTPS
publik + health check eksternal" BELUM TERPENUHI.

**T-01 (V16 §6 butir 6):** dicoba via tooling yang tersedia —
tetap BLOCKED. `hatch` hanya daemon; `builtin-artifacts` hanya
2 built-in; `share-space` butuh space sudah ter-publish; probe
`fetch-space-url` bekerja. Butuh pernyataan provider / run
artifact-tooling.

**U-103 (V16 §6 butir 7):** driver portabel baru (argumen
repo/ref, default remote, mktemp+trap, output dari lokasi
script, status setup exit 2); check-setup PASS tanpa re-run
build.

**Risiko baru U-103..U-108:** U-103 addressed; U-104 OPEN
(tradeoff legacy saved_projects); U-105 addressed (DDL diff
sebagai penjaga); U-106 BARU — process gap (log mentah
run-pertama 3 harness tidak dipertahankan terpisah; temuan +
perbaikan tetap terlacak); U-107 OPEN (semantik `SpaceDb.run`
RETURNING di produksi NOT VERIFIED); U-108 CLOSED (multicast
224/4 — ditemukan + diperbaiki). U-98/U-99 CLOSED (V16).

**Carry-forward:** F-019 NOT VERIFIED (`checkLink` masih
terdaftar); F-047 resolusi BLOCKED (U-97); F-006b/F-016/F-017
OPEN; staging roles UNASSIGNED + 3 baris baru (STAGE-P01/P02,
U-90, K-10 — lihat `STAGING_READINESS_V2323.md`).

**Gate proyek konkret berikutnya: STAGING VALIDATION.**
Prasyarat: (1) Rama menunjuk keenam peran staging; (2) provider
menyediakan bukti (versi/digest runtime, scope `ctx.db`,
topologi egress, SDK redistributable/kontrak build, jawaban
T-01); (3) keputusan owner K-10; (4) environment staging
tersedia (G-E). Pemicu revisi v2.3.24 adalah audit independen
V17, ATAU bukti staging, ATAU keputusan owner atas K-10/T-01,
ATAU jawaban provider atas M-1/M-2.

---
### D.4.35 Jawaban atas audit independen V18 — F-049..F-056 diimplementasikan di branch `development` + Handoff §7 (BARU, v2.3.24)

**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR
RELEASE — NOT READY FOR COMMUNITY BETA. Revisi ini menjawab audit
independen V18 (`SSRF_INDEPENDENT_AUDIT_V18.md`, commit `75fc5ee` +
klarifikasi `1699706`, 8 November 2026) atas `main` sampai V17
(`c0efbfd`). **Catatan penomoran (DL-24-09):** §D.4.34 adalah bagian
v2.3.23 yang hanya ada di branch `development` (commit `31c3db3`);
`main` tidak pernah menerima revisi v2.3.23 sebagai dokumen — bagian
ini diberi nomor §D.4.35 dan ketiadaan §D.4.34 di `main` dicatat
secara eksplisit, bukan diisi secara retroaktif.

**Otorisasi implementasi:** V18 §7 menegaskan otorisasi yang ada
untuk implementasi di branch pengembangan terisolasi "remains
sufficient" + direktif owner `c53fd73` + instruksi owner 2026-11-08
~15:31 WIB ("perbaiki semua"). Implementasi F-049..F-056
DIEKSEKUSI di branch `development` (merge `32731de`; commit
`1863c1f`, `56d4a66`, `8344055`, `811561b`, `ecd6f06`; ls-remote
terverifikasi `ecd6f069d95ffa7fcfb98110cd542a3cc7faf266`).
Implementasi di `development` TIDAK berarti persetujuan
rilis/produksi. `main` tidak disentuh source aplikasinya; live
artifact `cek-link-airdrop` tidak disentuh; Link Scanner tetap
nonaktif; tidak ada merge development→main.

**F-049 — korpus IANA lengkap.** Classifier IPv4/IPv6 diturunkan
dari fetch live kedua registry IANA 2026-11-08 (Last Updated
2025-10-09): semua entri GR=False di-DENY, entri GR=True di-ALLOW,
parent-prefix default-deny `2001::/23` dengan exception GR=True
yang lebih spesifik. Tambahan eksplisit: `192.88.99.0/24`
(termasuk `192.88.99.2/32`), `5f00::/16`. **Keputusan produk
2001:20::/28 = ALLOW** mengikuti IANA (ORCHIDv2 GR=True;
identifier kriptografis, bukan host routable; kebijakan lebih
ketat tidak diadopsi). Korpus per-entri di
`evidence/v2324/iana-registry-corpus-v2324.md` (branch
`development`). H-IP 8/8 PASS. Tindak lanjut: registry-diff test
berkala (U-108). Runtime reachability NOT VERIFIED.

**F-050 — otorisasi addProject di handler.** Gate owner-only
(`isAddProjectAuthorized`) di dalam handler, sebelum akses DB.
Tidak mengandalkan asumsi dispatch-layer SDK yang belum terbukti.
H-AUTH 6/6 PASS (anonim/non-owner/viewer share → 0 baris).
Batas jujur: tidak ada service principal terjadwal di
codebase/runtime — gate = owner-only; definisi service identity
terjadwal butuh keputusan + staging proof (U-109).

**F-051 — semantik principal didesain ulang.** Viewer share
Cloudflare non-owner → principal null: tanpa history, saved state
nonaktif, Gibran tanpa riwayat; owner Cloudflare →
`cloudflare-owner:{shareId}`. Tidak ada label user-scoped pada
baris share-scoped. H-PRIN 6/6 PASS. Trade-off: viewer share
kehilangan saved state by design. `ctx.viewer` runtime NOT
VERIFIED (STAGE-P02; baris readiness v2.3.24 #21 baru).

**F-052 + F-053 — deadline batas keras + timeout tidak tersimpan.**
DNS di-race melawan per-query 5 dtk DAN deadline total;
`deadline.aborted` dicek sebelum cache read dan sebelum tiap
script; lease TTL 25 dtk dipertahankan (deadline batas keras +
unwind <1 dtk di VM). `ScanTimeoutError` di 3 checkpoint analyze;
`runCheck` → error timeout eksplisit retryable, tanpa insert
baris. H-DL 6/6 + H-TO-01 PASS (elapsed 20015 ms, 0 baris, lease
0). Timing runtime NOT VERIFIED (baris readiness #23 baru).

**F-054 — akuntansi agregat pada cache hit.** Opsi simpan-panjang
+ reserve: `FetchResult.decodedBytes` disimpan per cache entry
dan di-reserve via `tryReserve` sebelum hit dilayani. H-CB 4/4
PASS (900 KB lolos, +300 KB ditolak). RDAP cache berbudget
sendiri by design.

**F-055 — CHECK Solana base58 penuh.** Migrasi 0008
(`site/drizzle/0008_solana_base58_check.sql`, journal idx 7):
CHECK cabang Solana kini allowlist penuh
(`NOT GLOB '*[^1-9A-HJ-NP-Za-km-z]*'`), setara validator aplikasi
`canonicalizeContractAddress`; `schema.ts` + `catalog.ts`
diselaraskan; DDL drizzle-kit diregenerasi (diff hanya cabang
CHECK Solana); down migration diuji. H-B58 5/5 PASS; H-MIG
re-run 232/232 (8 migrasi). Pre-check operator V1 wajib sebelum
migrate di DB berisi data (U-110; baris readiness #22 baru).
Versi SQLite runtime produksi NOT VERIFIED (U-90).

**F-056 — same-origin tiap hop redirect.** `opts.allowedOrigin`
ditegakkan di setiap hop redirect fetch script sebelum koneksi
hop berikutnya; `analyze` meneruskan `pageOrigin`. H-SO 5/5
PASS.

**D-06 / T-01 / landing.** Stub SDK tidak disentuh; clean-clone
TIDAK diulang (tidak ada perubahan material — protokol handoff
butir 6). T-01 tetap BLOCKED. Landing page tidak disentuh; URL
publik tidak diklaim.

**Bukti (semua VM, bukan staging/produksi):** regresi penuh
v2.3.24 **363/363 PASS** (232+32+15+8+12+8+5+10+8+6+6+6+1+4+5+5),
tsc server+client exit 0, 2026-11-08 ~16:25–16:41 WIB, log +
harness di branch `development` `evidence/v2324/` (commit
`811561b`/`ecd6f06`), ke-16 SHA-256 log terverifikasi cocok oleh
koordinator revisi. **Koreksi total (DL-24-01):** matriks
development menulis 353/353 — salah hitung (H-RD 10/10 tidak
dijumlahkan); angka benar 363/363. Bukti mentah TIDAK diduplikasi
ke `main` (DL-24-02). Detail lengkap: matriks respons v2.3.24
§2/§8; staging readiness v2.3.24 (baris 21–23 baru); risiko baru
U-108..U-112; gate G-L.

**Pemicu revisi v2.3.25:** audit independen V19, ATAU keputusan
owner atas K-1/K-4/K-10/T-01, ATAU bukti runtime G-B (termasuk
versi SQLite produksi, U-90), ATAU staging tersedia (G-E).

### D.4.36 Jawaban atas audit independen V19 — F-057 fail-closed + F-058 principal userId diimplementasikan (sebagian) di branch `development` + Handoff §6 (BARU, v2.3.25)

**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR
RELEASE — NOT READY FOR COMMUNITY BETA. Revisi ini menjawab audit
independen V19 (`SSRF_INDEPENDENT_AUDIT_V19.md`, commit `cfb55a6`,
8 November 2026) atas `main` sampai `6167749` dan `development`
sampai `ecd6f06`.

**F-057 — context tanpa viewer fail-closed untuk saved state.**
`savedPrincipal()` di `site/server/src/actions.ts` (commit
`2eb5a2a`) tidak lagi mengembalikan sentinel `'<LEGACY>'` bila
`ctx.viewer` tidak ada: saved state dinonaktifkan (read default,
write no-op), perlakuan yang sama dengan viewer share Cloudflare
non-owner (F-051). `'<LEGACY>'` hanya dipakai bila
`LOCAL_SINGLE_OWNER_MODE` aktif — module flag default OFF dengan
pola yang sama seperti `CHECKLINK_ENABLED` (tidak ada env var di
runtime ini). Harness baru H-AN 5/5 PASS membuktikan dua anon tidak
saling membaca/menulis saved state, baris `'<LEGACY>'` tidak terbaca
saat mode OFF dan terbaca + tertulis (update baris yang sama) saat
mode ON, viewer share tetap disabled bahkan saat mode ON, dan
kontrol positif owner tetap bekerja. Migrasi legacy tetap lulus
(H-MIG 232/232, H-LEG 8/8). Sisa risiko: mode single-owner belum
punya bukti runtime (U-115); `ctx.viewer` terisi di runtime NOT
VERIFIED (STAGE-P02).

**F-058 — principal local memakai `userId` (PARTIALLY ADDRESSED).**
`resolvePrincipal()` local kini `local:{userId}`; delegate
(`"agent" | "schedule"`) memakai namespace terpisah
`local:delegate:{delegate}:{userId}`; `userId` kosong → null;
`isOwner` adalah otorisasi, bukan identitas (H-PL-05: userId sama
berbagi principal/history, tetapi `addProject` tetap menolak
non-owner). Harness baru H-PL 7/7 PASS membuktikan isolasi dua
LocalViewer dengan `ownerUserId` sama dan `userId` berbeda di
`listChecks`/`deleteCheck`/`askGibran`/saved state/`runCheck`, serta
perilaku delegate. Bukti kontrak provider: dibaca deklarasi tipe SDK
0.14.0 asli (`server-contract.d.ts`, tarball SHA-256
`f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`) —
hanya nama field + komentar doc; TIDAK ADA pernyataan tertulis
provider tentang semantik populasi runtime (pencarian di repo
dicatat DL-25-06). Karena itu F-058 partially addressed: kriteria
VM lolos, bukti kontrak BLOCKED (U-113). Konsekuensi: baris lama
berkunci `local:{ownerUserId}` menjadi orphan (U-114) — keputusan
rename vs terima orphan harus dibuat sebelum deployment menyentuh
DB berisi baris lama. Harness lama yang meng-hardcode principal lama
diperbarui mengikuti perubahan material (H-AUTH-04, H-PRIN-03,
H-TEN-11/15).

**Sinkronisasi + bukti.** Merge `37a23a2` (main `cfb55a6` →
development; konflik 2 dokumen diselesaikan tanpa buang konten).
Regresi penuh v2.3.25: **375/375 PASS** (363 baseline terkoreksi +
12 baru), 18/18 sidecar `.sha256` cocok, `tsc` server+client exit 0
(Bun 1.4.4, bun:sqlite 3.53.4, sqlite3 CLI 3.45.1). Detail lengkap:
matriks respons v2.3.25 §2/§8; staging readiness v2.3.25 (baris
24–25 baru); risiko baru U-113..U-115; gate G-M.

**Pemicu revisi v2.3.26:** audit independen V20, ATAU keputusan
owner atas K-1/K-4/K-10/T-01, ATAU bukti runtime G-B (termasuk
versi SQLite produksi, U-90), ATAU jawaban provider atas U-113,
ATAU staging tersedia (G-E).

### D.4.37 Jawaban atas audit independen V20 — F-059 mode legacy dihapus + F-060 tool migrasi kunci principal diimplementasikan (sebagian) di branch `development` + Handoff §7 (BARU, v2.3.26)

**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR
RELEASE — NOT READY FOR COMMUNITY BETA. Revisi ini menjawab audit
independen V20 (`SSRF_INDEPENDENT_AUDIT_V20.md`, commit `77317c3`,
8 November 2026) atas `main` sampai `cb2ab9b` dan `development`
sampai `b884c3d`.

**F-059 — mode local single-owner DIHAPUS dari handler.**
`LOCAL_SINGLE_OWNER_MODE`, `setLocalSingleOwnerMode`,
`isLocalSingleOwnerMode`, dan konstanta `LEGACY_PRINCIPAL` dihapus
dari `site/server/src/actions.ts` (commit `2066f4a`): tidak ada
lagi flag, setter, atau jalur kode yang dapat mengembalikan
`'<LEGACY>'` dari `savedPrincipal()` — fungsi itu kini
`return resolvePrincipal(ctx)` setelah menolak viewer share
Cloudflare non-owner. Alasan penghapusan (bukan default OFF):
flag module tidak dapat membuktikan deployment local-only, dan
tidak ada mekanisme attestation runtime di runtime ini — jadi
penutupan struktural satu-satunya adalah penghapusan. Kebutuhan
legacy yang sah (pemulihan baris lama) dipindah ke tool offline
dengan mapping eksplisit, bukan ke handler. Harness baru H-AN2 6/6
PASS membuktikan anon tidak pernah membaca/menulis
`'<LEGACY>'`, API mode tidak ada lagi (assert source-level), viewer
source tidak dikenal dan `userId` kosong fail-closed, dan kontrol
positif owner tetap bekerja. H-AN v2325 DISUPERSEDE (H-AN-03
menegaskan perilaku yang dihapus). U-115 DITUTUP: mode dihapus,
attestation tak lagi diperlukan. Sisa risiko: `ctx.viewer` terisi
di runtime NOT VERIFIED (STAGE-P02).

**F-060 — tool migrasi kunci principal (PARTIALLY ADDRESSED).**
Perubahan v2.3.25 `local:{ownerUserId}` → `local:{userId}`
meninggalkan baris lama orphan; kunci lama dan baru berbagi format
`local:<id>` sehingga mapping tidak boleh ditebak. Tool offline
`evidence/v2326/principal-key-migration.ts` (commit `0e4e06e`,
BUKAN server action, tidak pernah jalan terhadap live `app.db`)
menyediakan `inventory`, `archive`, `rename` transaksional
(backup JSON dulu, pre-check tabrakan PK komposit, post-check
jumlah baris, rollback otomatis), dan `rollback` — semuanya
fail-closed tanpa mapping eksplisit terverifikasi operator
(menolak tanpa mapping, menolak `'<LEGACY>'`, menolak duplikat/
ambigu, menolak basis kosong). Inventarisasi: `checks.
owner_user_id`, `saved_projects.principal_id`, `projects.
provenance_submitted_by`. Harness baru H-MIGR 8/8 PASS (CLI asli
sebagai child process; exit code adalah exit code tool): inventory
tepat, archive 6 baris tanpa ubah DB, rename mengubah kunci dengan
jumlah tetap + owner membaca history via `listChecks` sedang user
kedua terisolasi, tabrakan PK / tanpa mapping / `'<LEGACY>'`
ditolak exit 2 tanpa perubahan, rollback mengembalikan kunci asli,
tool menolak `app.db`. Status jujur: tool siap, mapping TIDAK ADA
(bergantung U-113) — deployment ke DB berisi baris lama tetap
BLOCKED; U-114 MENYEMPIT (tool siap, menunggu mapping), bukan
tertutup. Bug rollback ditemukan dan diperbaiki selama putaran ini
(backup menyimpan baris mentah, rollback membaca `r.row.*`).

**Sinkronisasi + bukti + investigasi paralel.** Merge `f93aa72`
(main `77317c3` → development; konflik 1 dokumen diselesaikan
pakai versi main; behind=0). Regresi penuh v2.3.26: **384/384 PASS**
(370 baseline + 14 baru), 19/19 sidecar `.sha256` cocok, `tsc`
server+client exit 0 (Bun 1.4.4, bun:sqlite 3.53.4, sqlite3 CLI
3.45.1). U-113 dicari ulang — tetap BLOCKED (hanya deklarasi tipe
SDK 0.14.0; tidak ada pernyataan provider). D-06 tetap BLOCKED
(npm 404 dikonfirmasi ulang). Jalur project link: kemampuan tooling
`artifact.create_web_static` ada + URL landing yang sudah ada
terverifikasi merespons (read-only); publish fresh TIDAK dilakukan;
T-01 tetap BLOCKED. Risiko baru U-116 (CI/branch governance: 0
workflow runs, branch tidak protected). Gate G-M diperbarui.
Detail lengkap: matriks respons v2.3.26 §2/§8; staging readiness
v2.3.26 (baris 24–25 diperbarui, 26–28 baru).

**Pemicu revisi v2.3.28:** audit independen V22, ATAU keputusan
owner atas K-1/K-4/K-10/T-01, ATAU bukti runtime G-B (termasuk
versi SQLite produksi, U-90), ATAU jawaban provider atas U-113,
ATAU mapping terverifikasi U-114, ATAU staging tersedia (G-E).

### D.4.38 Jawaban atas audit independen V21 — F-061..F-064 tool migrasi diperkeras + U-117 dijawab sebagian di branch `development` + Handoff §8 (BARU, v2.3.27)

**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR
RELEASE — NOT READY FOR COMMUNITY BETA. Revisi ini menjawab audit
independen V21 (`SSRF_INDEPENDENT_AUDIT_V21.md`, commit `2bc34e1`,
8 November 2026) atas `main` sampai `0832bed` dan `development`
sampai `e11e8d1`.

**F-061 — mapping berantai/cycle DITOLAK (High).**
`validateMapping()` di `evidence/v2326/principal-key-migration.ts`
(`TOOL_VERSION` v2327-1, commit `6ac587b`) menolak seluruh mapping
bila himpunan `currentKey` beririsan dengan himpunan `legacyKey`
— chain A→B + B→C dan cycle A↔B ditolak exit 2 tanpa write dan
tanpa backup, apa pun urutan entrinya. Dipilih REJECT, bukan
transformasi dua fase via temporary namespace/CTE: reject
deterministik dan fail-closed, tanpa intermediate state yang bisa
disangka principal asli dan tanpa permukaan tabrakan temp-key
(DL-27-01). Operator dengan kebutuhan chain yang sah memecahnya
menjadi mapping terpisah non-overlapping dengan backup baru per
langkah. Verifikasi per-key counts sebelum COMMIT dipertahankan dan
diperkuat (jumlah akhir tiap `currentKey` = baris current yang sudah
ada + baris legacy yang di-rename). H-MIGR-09/10/11 3/3 PASS.

**F-062 — archive khusus sentinel + NULL-owner (Medium).** Mode
CLI baru `archive-special` menulis JSON terpisah dengan section
eksplisit `sentinelRows` (`saved_projects`
`principal_id='<LEGACY>'`) dan `nullOwnerChecks` (`checks`
`owner_user_id IS NULL`), lengkap dengan counts dan totalRows.
Mode dibuka read-only; DB tidak berubah; pemilik tidak pernah
ditebak; keduanya tidak pernah di-rename. H-MIGR-12/13 2/2 PASS
(counts + isi ekspor benar, DB tidak berubah).

**F-063 — rollback terverifikasi (Medium).** `rollback()` kini
pre-validasi setiap baris backup masih ada pada `currentKey` yang
diharapkan sebelum write (tolak exit 2 tanpa write bila tidak);
UPDATE mencocokkan id + principal saat ini (checks/projects tidak
lagi hanya mencocokkan id); `changes` tiap UPDATE harus tepat 1;
postcondition (semua baris kembali ke `legacyKey`, counts tidak
berubah) diverifikasi sebelum COMMIT — mismatch → ROLLBACK + exit
nonzero. H-MIGR-14/15/16 3/3 PASS (baris hilang, principal berubah
pasca-rename, konflik saved_projects — semua fail-closed, DB tidak
berubah). H-MIGR-18 membuktikan rollback normal tetap sukses.

**F-064 — guard path DB terhadap symlink (Medium).**
`guardDbPath()` memakai `lstatSync` (tolak bila dbPath adalah
symlink) dan `realpathSync` (tolak bila target `app.db` atau di
bawah `ts-spaces`); mode dipisah — `inventory` dan
`archive-special` read-only, `archive`/`rename`/`rollback`
write-only pada salinan. H-MIGR-17 PASS (symlink alias dan symlink
via direktori runtime ditolak exit 2; salinan disposable sah tetap
bisa dipakai). Dicatat jujur: guard path adalah pemeriksaan path,
bukan bukti kriptografis bahwa DB adalah salinan; workflow
copy-and-verify tetap tanggung jawab operator. Semua pengujian
hanya pada DB disposable — tool tidak pernah jalan pada live DB.

**U-117 — status project link (partially addressed).**
`artifact.status` slug `airdrop-generate` ~21:20 WIB 2026-11-08
membuktikan `share.shared=true` dengan URL yang sama seperti
matriks v2.3.26; `browser.open` ~21:18 WIB membuktikan URL
merespons (judul "Airdrop Generate"). Baris 20 readiness v2.3.26
(`shared=false`) dinyatakan carry-forward kedaluwarsa dan
diperbaiki di readiness v2.3.27 dengan snapshot bertanggal. HTTP
status TIDAK diklaim (tool tidak menampilkannya);
artifact-to-source tetap NOT VERIFIED (tidak ada catatan
build/publish di repo; judul `landing/index.html` berbeda dari
judul URL — indikasi, bukan bukti final). Publish fresh dari
`landing/` tetap NOT VERIFIED. Artifact tetap bukan application
trial.

**Sinkronisasi + bukti + investigasi paralel.** Merge `9776a18`
(main `2bc34e1` → development; tanpa konflik; behind=0). Regresi
v2.3.27: **394/394 PASS** (384 v2.3.26 dipertahankan + 10 baru
H-MIGR-09..18), 2/2 sidecar `.sha256` baru cocok (Bun 1.4.4).
Harness lain tidak diulang karena `site/**` tidak berubah
(DL-27-03). U-113 dicari ulang — tetap BLOCKED (hanya deklarasi
tipe SDK 0.14.0). D-06 tetap BLOCKED (npm 404 dikonfirmasi ulang).
T-01 tetap BLOCKED (tidak ada jawaban baru). F-006b masih ada
(string insiden di `actions.ts`). Risiko baru U-117 (partially
addressed; sisa artifact-to-source); U-116 tetap OPEN. Gate G-M
diperbarui. Detail lengkap: matriks respons v2.3.27 §2/§8; staging
readiness v2.3.27 (baris 20 diperbaiki, 25/27 diperbarui, 29–31
baru).

### D.4.39 Jawaban atas audit independen V22 — F-065..F-068 tool migrasi diperkeras + U-117/U-116 dijawab sebagian di branch `development` + Handoff §8 (BARU, v2.3.28)

**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR
RELEASE — NOT READY FOR COMMUNITY BETA. Revisi ini menjawab audit
independen V22 (`SSRF_INDEPENDENT_AUDIT_V22.md`, commit `fb38b65`,
8 November 2026) atas `main` sampai `1b532e9` dan `development`
sampai `b6f2138`.

**F-065 — output backup/archive diamankan (High).**
`guardOutputPath()` + `writePrivateJsonAtomic()` di
`evidence/v2326/principal-key-migration.ts` (`TOOL_VERSION`
v2328-1, commit `a4bc568`): output ditolak bila symlink, bila
sudah ada (tidak pernah overwrite — termasuk hard link ke DB,
dideteksi lewat perbandingan device/inode), bila resolve-nya sama
dengan DB input, bila bernama `app.db`, atau bila di bawah path
`ts-spaces`. File ditulis ke temp file di direktori yang sama
(`openSync "wx"`, mode 0600, `fsync`), dipublikasikan dengan
`link(2)` — atomik DAN eksklusif (`rename(2)` sengaja tidak
dipakai karena menimpa destinasi) — lalu diverifikasi mode 0600,
nlink == 1, dan read-back byte-per-byte. `rename()` memverifikasi
ulang backup (parse + hash) SEBELUM transaksi DB dimulai.
H-MIGR-19..23 PASS (output == DB, symlink, hard link, existing,
nama `app.db`, direktori `ts-spaces` — semuanya exit 2, DB tidak
berubah). Preseden guard: hard link ke DB menaikkan nlink DB input
sehingga guard F-068 menyala lebih dulu (DL-28-01).

**F-066 — validasi backup ketat sebelum rollback (Medium).**
`validateBackupStructure()` dipanggil dari `main()` SEBELUM DB
dibuka: tool, versi didukung (`v2327-1`/`v2328-1`), mode,
mapping non-empty dan valid (aturan `validateMapping()` dipakai
ulang — duplikat/malformed/chain ditolak), ketiga array tabel
wajib hadir dan bertipe array (TIDAK ADA lagi default `?? []`),
shape/PK tiap baris, `countsBefore` per tabel, total baris ≥ 1,
dan — untuk backup v2328-1 — `totalRows` cocok + hash integritas
SHA-256 cocok (hash atas konten kanonis `stableStringify`:
mapping + rows + countsBefore + totalRows). `rename()` menulis
`totalRows` + `integrity` ke setiap backup. `rollback()` juga
memeriksa `countsBefore` == count DB saat ini sebelum write apa
pun. Backup v2327-1 (tanpa hash) diterima hanya setelah semua
cek struktural lolos, dengan peringatan UNVERIFIED eksplisit ke
stderr (DL-28-04). H-MIGR-24..29 + 33 PASS (rows kosong, section
hilang satu per satu, section bukan array, mapping
kosong/duplikat/malformed, versi tidak didukung, count/hash
mismatch; backup legacy tetap rollback dengan peringatan).

**F-067 — output privat 0600 + retensi (Medium).** Semua output
dibuat mode 0600 sejak lahir, exclusive-create, tidak pernah
overwrite; verifikasi mode pasca-tulis — bila mode privat tidak
dapat diterapkan, file dihapus dan tool fail closed (cabang ini
ADA di kode tetapi tidak dapat dipicu langsung di VM ini —
DL-28-05, dicatat jujur). Tiap dokumen JSON membawa field
`retention`: milik operator, simpan sampai rename terverifikasi
atau di-rollback, lalu hapus aman (shred/rm); jangan salin ke
penyimpanan bersama tanpa enkripsi. H-MIGR-30 PASS (+ H-MIGR-22:
file existing tidak ditimpa, byte + mode tidak berubah).

**F-068 — hard-link guard (Medium).** `guardDbPath()` kini
menolak file DB dengan `nlink > 1` (salinan byte hasil `cp`
selalu nlink == 1) dan membandingkan device/inode terhadap path
runtime yang didaftar operator di env var
`PRINCIPAL_MIGRATION_RUNTIME_DBS`. Komentar header menegaskan:
`realpath` TIDAK membuktikan file adalah salinan. H-MIGR-31 PASS
(hard-link alias ditolak inventory + rename; salinan byte
diterima). Sisa: TOCTOU antara guard dan `new Database()` +
runtime DB yang tidak didaftar operator — risiko baru U-118,
mitigasi workflow salinan terverifikasi.

**Sinkronisasi + bukti.** Merge `2f45148` (main `44a823f` →
development; tanpa konflik; 4 behind saat merge — audit V22
menyebut 3 dari snapshot lebih lama). Regresi penuh v2.3.28:
**409/409 PASS** (394 v2.3.27 dipertahankan + 15 baru H-MIGR-19..33;
H-MIGR 33/33; 3/3 sidecar `.sha256` baru cocok, 2 log re-run
byte-identik dengan v2.3.27 — DL-28-02). U-117 dijawab sebagian:
share flag + URL terverifikasi ulang (~22:48–22:51 WIB);
artifact-to-source tetap NOT VERIFIED (tooling tidak mengekspos
source commit/digest/build log). U-116 dikonfirmasi ulang via
`gh api`: 0 workflow runs, 0 workflows, kedua branch tidak
protected (404), 0 rulesets; npm 404 `@hatch/space-sdk`
dikonfirmasi ulang. U-113 tetap BLOCKED; D-06 tetap BLOCKED;
T-01 tetap BLOCKED; F-006b masih ada (string insiden di
`actions.ts`). Risiko baru U-118 (residual TOCTOU). Gate G-M
diperbarui. Detail lengkap: matriks respons v2.3.28 §2/§8; staging
readiness v2.3.28 (baris 20/25/27/29/30 diperbarui, 32–33 baru).

**Pemicu revisi v2.3.29:** audit independen V23, ATAU keputusan
owner atas K-1/K-4/K-10/T-01, ATAU bukti runtime G-B (termasuk
versi SQLite produksi, U-90), ATAU jawaban provider atas U-113,
ATAU mapping terverifikasi U-114, ATAU staging tersedia (G-E).

### D.4.40 Jawaban atas audit independen V23 — F-069/F-070 tool migrasi diperkeras + U-118 diselidiki + F-006b dibersihkan dari string kode aplikasi + Handoff §8 (BARU, v2.3.29)

**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR
RELEASE — NOT READY FOR COMMUNITY BETA. Revisi ini menjawab audit
independen V23 (`SSRF_INDEPENDENT_AUDIT_V23.md`, commit `56c6c27`,
9 November 2026) atas `main` sampai `b436dae` dan `development`
sampai `a4bc568`.

**F-069 — error validasi backup tidak lagi mencetak isi baris (Medium).**
`validateBackupRow()` di `evidence/v2326/principal-key-migration.ts`
(`TOOL_VERSION` v2329-1) tidak lagi menginterpolasi
`JSON.stringify(row)`: setiap kegagalan melaporkan HANYA nama tabel,
indeks baris, field yang gagal, dan tipe yang diharapkan. Aturan yang
sama diterapkan ke semua jalur error lain yang dapat mencetak konten
backup: `validateBackupStructure()` (tool/version/mode/countsBefore/
totalRows/integrity — nilai tidak lagi di-echo), `validateMapping()`
(pesan memakai indeks entri; kunci principal tidak pernah dicetak,
termasuk pada penolakan chain/cycle yang kini hanya menyebut jumlah
overlap), `archive()` (indeks entri key list), pemeriksaan tabrakan
`rename()` (hanya jumlah project yang bertabrakan), dan seluruh error
pre/post-validasi `rollback()` (indeks baris + tabel + field). `inventory`
tetap mencetak kunci principal ke STDOUT — itu laporan operator yang
dimaksud, bukan jalur error, dan di luar scope F-069. H-MIGR-34..38
PASS (sentinel URL/metadata/principal di ketiga tabel + mapping chain
+ tool/version + pre-validasi rollback: semuanya exit nonzero,
stderr menyebut tabel/field, TIDAK SATU PUN sentinel muncul di
stdout/stderr, DB tidak berubah).

**F-070 — fsync direktori parent sebelum transaksi DB (Medium).**
`writePrivateJsonAtomic()` kini, setelah `link(2)` + unlink temp,
membuka direktori parent dan mem-`fsync` deskriptornya SEBELUM
return — sehingga entri direktori backup durable sebelum
`rename()` memulai transaksi SQLite. Bila direktori tidak dapat
dibuka atau di-fsync, output yang sudah ter-publish DIHAPUS dan tool
fail closed (exit 1) — tidak pernah mengklaim durabilitas yang
tidak diberikan platform. Catatan platform: directory fsync
terverifikasi di Linux VM ini; di platform yang tidak mendukungnya
tool fail closed, bukan diam-diam mengklaim. Bukti urutan syscall:
hook trace env `PRINCIPAL_MIGRATION_FS_TRACE` mencatat langkah
filesystem (H-MIGR-39 PASS: write → fsync file → link → unlink temp
→ open dir → fsync dir → read-back, fsync-dir menarget direktori
parent backup), dikoroborasi `strace -f` independen atas satu rename
nyata (`evidence/v2329/strace-f070-rename.txt` — fsync file → link →
unlink → openat `/tmp` → fsync dir → read-back → fsync SQLite
transaksi). Label eksplisit: ini bukti URUTAN SYSCALL, BUKAN tes
crash/power-loss nyata.

**U-118 — identitas file DB yang dibuka tidak dapat diverifikasi dari
Bun SQLite (diselidiki, residual tetap OPEN).** Probe 2026-11-09
(Bun 1.4.4, bun:sqlite 3.53.4; `evidence/v2329/u118-bun-sqlite-probe.txt`):
instance `Database` hanya mengekspos `filename` (string path);
`PRAGMA database_list` hanya mengembalikan string path; tidak ada
properti fd (`$handle`/`fd`/`_fd` tidak ada); `db.handle` adalah
angka polos (0 pada DB baru) tanpa makna identitas; `fileControl()`
tidak mengembalikan identitas file. `statSync(path)` pasca-open hanya
membaca ulang PATH, bukan file yang dibuka — jadi tidak dapat
membuktikan inode yang dibuka sama dengan inode yang di-guard.
KESIMPULAN: TOCTOU guard→open TIDAK DAPAT ditutup dari dalam proses
dengan API Bun. Batas yang dapat ditegakkan: direktori kerja
allowlist — env `PRINCIPAL_MIGRATION_ALLOWED_DIR` (dipisah titik dua);
bila di-set, `guardDbPath()` menolak DB di luar allowlist (exit 2);
bila tidak di-set, tool mencetak WARNING U-118 eksplisit di setiap
run. H-MIGR-40 PASS (di luar allowlist ditolak; di dalam diizinkan)
+ H-MIGR-41 PASS (tanpa allowlist: warning tampil, tool tetap jalan).
Residual U-118 tetap OPEN secara eksplisit; workflow operator
(salinan privat, tanpa concurrent writer) tetap menjadi mitigasi.

**F-006b — narasi insiden dibersihkan dari string kode aplikasi.**
`site/server/src/actions.ts` (9 situs) + `site/client/src/App.tsx`
(3 situs): referensi ke insiden 7 Nov 2026, `$SCAMSEM`, dan
"pengurasan wallet Solana" dihapus dari komentar dan string
user-facing (detail sinyal, panduan Gibran, panduan 60 detik, contoh
link, explainer). Perilaku TIDAK berubah: `KNOWN_BAD_DOMAINS`
(`solbarn.cc`, `sharkmoon.tech`), scoring +100 known-bad, dan sinyal
`known_bad`/`known_bad_redirect` utuh — hanya kata-kata yang
diubah, bukan vonis. Keputusan scope (DL-29-04): baris data undian
Ptah ("dibaca dari API resmi Ptah pada 7 Nov 2026") adalah data
katalog, bukan narasi insiden, dan sengaja dipertahankan. H-NAR-01..05
PASS (5/5: tidak ada frasa narasi insiden di kedua file; proteksi
fungsional utuh; baris Ptah dipertahankan); regresi perilaku
H-KILL 5/5 diulang atas `actions.ts` yang sudah dibersihkan (kill-switch
tetap bekerja); `tsc --noEmit` server + client exit 0.

**Sinkronisasi + bukti.** Merge `67708f4` (main `56c6c27` →
development; tanpa konflik; 3 behind saat merge). Regresi penuh v2.3.29:
**422/422 PASS** (409 v2.3.28 dipertahankan + 8 baru H-MIGR-34..41 +
5 baru H-NAR-01..05; H-MIGR 41/41). Yang DIEKSEKUSI pada revisi ini:
354 tes — H-MIGR 41/41, H-NAR 5/5, H-KILL 5/5, H-CACHE 12/12, H-LEG
8/8, H-MIG 232/232, H-RD 10/10, H-AUTH 6/6, H-CB 4/4, H-DL 6/6,
H-PRIN 6/6, H-SO 5/5, H-TO 1/1, H-PL 7/7, H-AN2 6/6 (semua PASS;
log + sidecar di `evidence/v2329/`); yang DIPERTAHANKAN tanpa re-run:
68 tes (H-SSRF 32, H-RES 15, H-LEASE 8, H-IP 8, H-B58 5 — kode yang
mereka uji tidak berubah pada revisi ini). `tsc --noEmit` server +
client exit 0. 7/7 sidecar `.sha256` baru cocok (4 log H-MIGR + H-NAR
+ H-KILL + strace); 3 log re-run H-MIGR lama byte-identik dengan
v2.3.28 — DL-29-02. Harness lama H-AN (v2325) TIDAK dihitung: ia
mengimpor `isLocalSingleOwnerMode` yang sudah DIHAPUS v2.3.26
(F-059) dan digantikan H-AN2 — gagal import, bukan regresi
(DL-29-05); file-nya dipertahankan sebagai catatan sejarah, tidak
dihapus.
lagi: snapshot raw `artifact.status` bertanggal 2026-11-09 ~01:00 WIB
disimpan di repo (`evidence/v2329/artifact-status-airdrop-generate-20261109/`,
`share.shared=true`, URL sama, tidak ada build berjalan) + hasil
`browser.open` mentah; artifact-to-source tetap NOT VERIFIED
(tooling tidak mengekspos source commit/digest/build log; judul
`landing/index.html` tetap berbeda dari judul URL publik) DAN
`artifact.list_actions` untuk slug `airdrop-generate` gagal dibaca
(HTTP 405) — inventaris action artifact ini tetap NOT VERIFIED
lewat jalur itu. Kemampuan platform yang hilang dicatat eksplisit:
tidak ada cara mem-publish folder `landing/` secara terpisah dengan
provenance tercatat. U-116 dikonfirmasi ulang via `gh api`:
0 workflow runs, 0 workflows, `main` tidak protected (404),
0 rulesets; npm 404 `@hatch/space-sdk` dikonfirmasi ulang. U-113
tetap BLOCKED; D-06 tetap BLOCKED; T-01 tetap BLOCKED (tidak ada
jawaban baru sejak `f1bfea3`); 6 staging roles UNASSIGNED. Gate G-M
diperbarui. Detail lengkap: matriks respons v2.3.29 §2/§8; staging
readiness v2.3.29 (baris 20/25/27/29/30 diperbarui, 34–36 baru).

**Pemicu revisi v2.3.30:** audit independen V24, ATAU keputusan
owner atas K-1/K-4/K-10/T-01, ATAU bukti runtime G-B (termasuk
versi SQLite produksi, U-90), ATAU jawaban provider atas U-113,
ATAU mapping terverifikasi U-114, ATAU staging tersedia (G-E).

---

## E. Risiko regresi terhadap scanner yang sudah berjalan

| # | Risiko | Penjelasan | Probabilitas | Dampak | Mitigasi |
| --- | --- | --- | --- | --- | --- |
| E-1 | **False positive pada URL legit** | Guard yang terlalu agresif menolak URL publik yang sah: IP literal publik yang ditulis sebagai integer/heksadesimal (jarang, tetapi ada), domain yang resolve ke alamat CGNAT `100.64.0.0/10` (dipakai sebagian ISP), atau redirect melalui domain perantara yang resolve-nya sempat gagal | Sedang | Pengguna tidak bisa memeriksa link legit; kepercayaan turun | Uji legit §D.4.4 wajib lolos; CGNAT dijadikan pengecualian yang diputuskan eksplisit bila terbukti bermasalah; log penolakan dimonitor 1 minggu pertama setelah cutover |
| E-2 | **Perubahan skor/vonis pada 3 URL acuan** | Terutama akibat P0-4 (script off): sinyal dari isi script hilang. Juga akibat timeout global: halaman lambat yang sebelumnya selesai dalam 12–132 detik kini dapat terpotong pada 20 detik | Sedang | Vonis berubah → gagal regresi; katalog/proyek terkait (Ptah) tampil berbeda | Prediksi + uji di staging SEBELUM cutover (§D.2); toleransi skor ±5; bila vonis berubah, diskusikan — jangan sesuaikan ambang diam-diam |
| E-3 | **Gibran membaca data yang berubah bentuk** | Gibran (`askGibran`) membaca katalog + 10 riwayat cek terakhir. Bila format hasil cek berubah (mis. field `blocked`), Gibran dapat menjawab keliru tentang hasil cek yang ditolak | Rendah | Jawaban Gibran menyesatkan ("link ini aman/berbahaya" dari data yang sebenarnya ditolak) | Sertakan `blocked` dalam konteks Gibran dengan instruksi: hasil yang diblokir BUKAN vonis keamanan; uji tanya-jawab Gibran setelah P0-6 |
| E-4 | **Cron auto-add kehilangan verifikasi checkLink** | Cron 2 jam memakai `checkLink` untuk memverifikasi kandidat sebelum auto-add. Selama mitigasi (a), checkLink menolak semua → cron tidak bisa memverifikasi → auto-add macet atau (lebih buruk) kandidat lolos tanpa verifikasi | Sedang bila mitigasi (a) dipilih | Katalog berhenti bertambah otomatis; atau risiko kandidat tak terverifikasi masuk katalog | Selama mitigasi: cron menandai kandidat "belum terverifikasi link" dan TIDAK auto-add (§A.7). JANGAN buat jalur bypass khusus cron |
| E-5 | **Timeout global memotong pemeriksaan legit yang lambat** | Halaman legit di server lambat (mis. > 20 detik) kini menghasilkan "tidak selesai" padahal sebelumnya (dengan 12 dtk × banyak hop) bisa selesai | Rendah–Sedang | Hasil "tidak selesai" membingungkan; pengguna mengira situs bermasalah | Bedakan pesan: "pemeriksaan tidak selesai (timeout)" vs "situs tidak terjangkau" vs "ditolak guard"; catat sebagai sinyal UNVERIFIED, bukan vonis |
| E-6 | **Rate limit memblokir pengguna legit** | Pengguna yang memeriksa banyak link berurutan (mis. kurator airdrop) terkena 429 | Rendah (dengan kuota 10/menit yang disetujui v2) | Pengguna frustrasi | Pesan 429 yang jelas + waktu tunggu; monitor log 429 minggu pertama |
| E-7 | **Pinning merusak TLS / virtual hosting** | Pendekatan 2 (IP literal + Host header) yang salah implementasi dapat merusak verifikasi sertifikat atau mengambil konten host yang salah | Sedang bila memakai Pendekatan 2 | Vonis salah (konten host lain yang dipindai); atau semua HTTPS gagal | Pilih pendekatan dari hasil spike (§C, P0-1a); uji TLS di staging dengan berbagai host HTTPS; JANGAN pernah `rejectUnauthorized: false` |
| E-8 | **DNS resolve menambah latensi / kegagalan baru** | DNS lambat atau gagal untuk domain legit → pemeriksaan ditolak (fail-closed) padahal situsnya baik-baik saja | Rendah–Sedang | False negative (penolakan) untuk domain legit | Timeout DNS 5 detik + cache DNS singkat (TTL-aware) untuk hostname yang sama dalam satu pemeriksaan; monitor rasio penolakan DNS |
| E-9 | **Regresi pada RDAP** | Guard pada redirect rdap.org yang terlalu ketat dapat memutus lookup umur domain (sinyal penting — Ptah WASPADA 45 sebagian besar dari sinyal ini) | Rendah | Skor berubah; sinyal umur domain hilang | RDAP diuji sebagai bagian dari 3 URL acuan; allowlist RDAP dari IANA bootstrap (§A.1a v2); bila RDAP gagal, pemeriksaan tetap berjalan dengan sinyal "umur domain tidak diketahui" (perilaku lama) |
| E-10 | **Perubahan perilaku yang tidak terlihat di UI** | Penolakan guard yang tampil sebagai "tidak terjangkau" (bukan "ditolak") akan membingungkan pengguna dan Gibran | Rendah (dicegah oleh §A.6) | Kepercayaan terhadap hasil menurun | Respons penolakan adalah tipe tersendiri (§A.6); uji UI setelah P0-6 |

**Risiko terbesar secara keseluruhan:** E-2 (perubahan vonis acuan) dan E-4
(cron auto-add). Keduanya ditangani oleh uji staging + aturan "jangan bypass"
di §A.7 — bukan oleh optimisme.

### E.11 Risiko baru yang ditemukan dari spike runtime (v2)

| # | Risiko | Penjelasan | Probabilitas | Dampak | Mitigasi |
| --- | --- | --- | --- | --- | --- |
| E-11 | **Perilaku implisit runtime (SNI dari header `Host`)** | Node menurunkan SNI dari header `Host` bila `servername` tidak diisi (T3b). Implementasi yang lupa mengisi `servername` dapat mengira verifikasi hostname berjalan padahal ia bergantung pada perilaku implisit yang dapat berubah antar versi runtime | Sedang bila tidak diuji | Verifikasi hostname hilang diam-diam pada runtime lain | `servername` SELALU diisi eksplisit; uji T3b (tanpa `servername` harus gagal) masuk ke uji regresi; grep review memastikan tidak ada jalur TLS tanpa `servername` eksplisit |
| E-12 | **Callback `lookup` yang salah menangani `options.all`** | Bun memanggil lookup dengan `all:true`; callback yang mengembalikan alamat tunggal gagal (`ERR_INVALID_IP_ADDRESS`, B1) — kegagalan ini dapat disalahartikan sebagai "runtime tidak mendukung pinning" | Sedang | Diagnosis salah → keputusan arsitektur salah (mis. membangun fetcher terpisah yang tidak perlu) | Callback lookup WAJIB menangani kedua bentuk; uji unit lookup mencakup `all:true` dan `all:false`; spike mendokumentasikan perilaku ini (§A.2a) |
| E-13 | **Menulis socket sebelum handshake selesai** | `Bun.connect` + tulis sebelum handler `open` tidak diteruskan (B3) — dapat disalahartikan sebagai kegagalan TLS | Rendah | Diagnosis salah; implementasi Pendekatan 2 via socket dinilai "tidak bekerja" | Aturan: tulis HANYA di handler `open`; uji V1 menjadi uji penerimaan Pendekatan 2 via socket |
| E-14 | **API undici berubah antar versi** | Undici v7 mengubah API lookup (interceptor `dns` + `.compose()`; argumen pertama adalah origin lengkap sebagai string). Kode yang ditulis untuk API lama gagal — sebagian secara diam-diam (constructor `interceptors` tidak menjalankan lookup) | Sedang bila undici dipakai | Pinning yang dikira bekerja ternyata tidak bekerja — kegagalan diam-diam yang paling berbahaya | Undici TIDAK dijadikan dependensi utama di runtime Bun; bila dipakai (fetcher Node terpisah), kunci versi mayor dan uji T1/T1b menjadi uji penerimaan |
| E-15 | **DNS sandbox VM tidak representatif** | Resolver di VM ini mengembalikan `198.18.228.151` untuk `example.com` (rentang benchmarking) — hasil resolve DNS publik di VM ini TIDAK VALID untuk produksi | Pasti (teramati) | Keputusan berbasis DNS VM ini salah; uji staging yang memakai DNS publik VM ini menyesatkan | Semua uji DNS memakai DNS/server uji yang dikontrol sendiri; hasil resolve publik dari VM dicatat sebagai tidak valid |
| E-16 | **HTTP/2 pada Pendekatan 2 belum teruji** | Spike memakai HTTP/1.1; perilaku `:authority` pada HTTP/2 untuk koneksi IP literal belum dibuktikan (U-3 laporan spike) | Rendah–Sedang | Konten host yang salah dipindai, atau fetch HTTP/2 gagal | Bila Pendekatan 2 dipakai: paksa HTTP/1.1 untuk fetch terp-pin, ATAU uji HTTP/2 di staging sebelum cutover |
| E-17 | **Sumber IP rate limit belum terbukti** | Topologi runtime tidak terdokumentasi — sumber IP tepercaya belum diketahui (§A.7.1 v2) | Pasti (belum diketahui) | Rate limit menghitung IP yang salah (proxy tunggal atau header palsu) | Discovery P1-2a wajib sebelum P1-2; default fail-closed (`socket.remoteAddress`) |

---

## F. Estimasi kompleksitas pengerjaan

**Asumsi estimasi (v2, TETAP untuk v2.1):** satu engineer yang sudah mengenal kode artifact;
spike P0-1a SUDAH membuktikan runtime Bun 1.4.4 mendukung pinning
(Pendekatan 1 via Node `https` Agent `lookup`; Pendekatan 2 via `Bun.fetch`
+ `tls.serverName`) — risiko "runtime tidak mendukung pinning sama sekali"
SUDAH tertutup untuk Bun CLI; yang tersisa adalah uji ulang di staging
artifact produksi (U-1). **Catatan v2.1:** koreksi-koreksi v2.1 (NAT64,
matcher RDAP, lease konkurensi, dokumentasi TTL/timeout) masuk dalam
P0-1b/P0-UJI yang sudah ada — TIDAK menambah langkah baru dan TIDAK mengubah
total estimasi ~8–14 hari kerja. Estimasi adalah **rentang kasar dalam hari kerja**,
bukan janji. "Paralel" berarti dapat dikerjakan bersamaan oleh orang berbeda
atau tanpa menunggu langkah lain selesai.

| Langkah | Ukuran | Estimasi kasar | Paralel / berurutan | Dependensi kritis |
| --- | --- | --- | --- | --- |
| P0-0 Mitigasi (flag + pesan UI) | Kecil | < 0,5 hari | Berurutan (pertama) | Keputusan pemilik — DISETUJUI v2 |
| P0-1a Spike runtime (pinning) | Sedang | ✅ SELESAI (v2) | — | — |
| P0-1a' Uji ulang pinning di staging artifact produksi | Kecil–Sedang | 0,5 hari | Setelah P0-1c | Akses staging artifact |
| P0-1b Perluas ssrf-guard + resolveAndCheck | Sedang | 1–2 hari | Setelah P0-1a | Hasil spike |
| P0-1c fetchGuarded + fetchWithPinnedIp | Sedang–Besar | 1–2 hari | Setelah P0-1b | P0-1b; TLS/SNI bila Pendekatan 2 |
| P0-2 Integrasi ke fetchText (URL awal) | Kecil–Sedang | 0,5–1 hari | Setelah P0-1c | P0-1c |
| P0-3 Guard redirect + RDAP | Sedang | 1–1,5 hari | Setelah P0-2 | P0-2; bootstrap RDAP |
| P0-4 Nonaktifkan script fetch | Kecil | < 0,5 hari | **Paralel** dengan P0-1/2 | Keputusan pemilik — DISETUJUI v2 |
| P0-5 Perketat normalizeUrl (termasuk port 80/443) | Kecil | 0,5 hari | Setelah P0-1b | Normalisasi IP |
| P0-6 Respons penolakan aman + log | Kecil–Sedang | 0,5–1 hari | Setelah P0-2..P0-5 | Semua titik penolakan |
| P0-UJI Regresi + blokir staging | Sedang | 1–2 hari | Setelah semua P0 | Server + DNS uji |
| **Total P0** | — | **~5–9 hari kerja** | — | — |
| P1-1 Timeout global + streaming + Content-Type | Sedang | 1 hari | Setelah P0-UJI | P0-UJI lolos |
| P1-2a Discovery sumber IP tepercaya | Kecil | < 0,5 hari | Sebelum P1-2 | Dokumentasi/uji staging |
| P1-2 Rate limit + konkurensi + 429 | Sedang | 1–2 hari | Setelah P0-UJI; paralel dengan P1-1 | P1-2a; tabel `rate_limits` |
| P1-3 Batas script (port sudah di P0-5) | Kecil | < 0,5 hari | Setelah P0-5; paralel dengan P1-1/2 | — |
| P1-4 Logging + alert | Kecil–Sedang | 0,5–1 hari | Setelah P0-6 | Log keamanan P0-6 |
| P1-UJI + evaluasi ChatGPT + cutover | Sedang | 1–2 hari | Setelah semua P1 | Semua P1 |
| **Total P1** | — | **~3–5 hari kerja** | — | — |
| **Total P0+P1** | — | **~8–14 hari kerja** | — | — |

**Yang dapat memperbesar estimasi (risiko estimasi) — v2:**

- Uji staging produksi (U-1) membuktikan runtime artifact **tidak mendukung**
  pinning → diperlukan fetcher terpisah atau egress proxy: +Besar, dan
  rancangan ini harus direvisi sebelum implementasi (alternatif §A.2a).
- Uji staging menemukan false positive massal pada URL legit (E-1) → iterasi
  guard + uji ulang: +1–3 hari.
- Vonis 3 URL acuan berubah karena script off (E-2) → diskusi + penyesuaian
  sinyal: +0,5–1 hari (bukan dengan mengaktifkan kembali script secara
  diam-diam).
- Discovery P1-2a menunjukkan topologi multi-instance tanpa store bersama
  yang jelas → implementasi semaphore DB: +Sedang.
- HTTP/2 pada Pendekatan 2 (E-16) memerlukan penanganan `:authority` →
  +Kecil–Sedang, atau keputusan paksa HTTP/1.1 (tanpa biaya).

---

## Keputusan pemilik — DISETUJUI (v2, 7 Nov 2026)

| # | Keputusan | Nilai yang disetujui | Rujukan |
| --- | --- | --- | --- |
| D-1 | Temporary mitigation | **(a) Nonaktifkan scanning URL arbitrer sementara** | §D.1 v2 |
| D-2 | Script fetching | **Matikan sementara (flag)** | §D.2 v2 |
| D-3 | Pendekatan pinning | **Pendekatan 1 (Node `https` Agent `lookup`) sebagai utama; Pendekatan 2 (`Bun.fetch` + `tls.serverName` + `Host`) sebagai fallback** — diputuskan dari hasil spike | §A.2a, `SSRF_SPIKE_RUNTIME.md` |
| D-4 | Kuota rate limit | **10/menit + 100/jam per IP** | §A.7 v2 |
| D-5 | Port non-standar | **Blokir di P0-5 — hanya 80 dan 443** | §A.5 v2, §B.1 |
| D-6 | CGNAT `100.64.0.0/10` | **Blokir secara default** | §A.4 v2 |
| D-7 | Timeout global | **20 detik** | §A.5 v2 |
| D-8 | Cutover | **Hanya setelah SELURUH uji wajib lolos** (termasuk timeout global + rate limit + uji ulang pinning staging); implementasi bertahap per langkah dengan pengujian setiap build | §D.5 v2 |

Tidak ada keputusan D-1 s.d. D-8 yang masih terbuka. Yang masih menunggu
keputusan pemilik setelah evaluasi ChatGPT atas v2 ini: **persetujuan
implementasi** itu sendiri (ya/tidak, dan bila ya, tanggal mulai P0-0).

---

## G. Risiko yang BELUM terselesaikan setelah revisi v2.3.7

Daftar ini jujur: risiko-risiko berikut TIDAK ditutup oleh rancangan ini,
dan harus diterima secara eksplisit atau ditangani di luar rancangan ini.

| # | Risiko belum terselesaikan | Kenapa belum tertutup | Dampak bila terjadi | Penanganan yang tersedia |
| --- | --- | --- | --- | --- |
| U-1 | **Pinning belum terbukti di runtime artifact produksi** | Spike dijalankan pada Bun CLI 1.4.4 di VM — versi/konfigurasi runtime produksi tidak terdokumentasi di sini | Pendekatan 1 gagal di staging produksi → implementasi harus beralih ke fallback/alternatif di tengah jalan | Uji P0-1a' di staging produksi SEBELUM integrasi penuh; bila gagal, ikuti alternatif §A.2a (fetcher terpisah / egress proxy) |
| U-2 | **Apakah metadata cloud / layanan internal dapat dijangkau dari server produksi** | Memerlukan probing terhadap infrastruktur produksi — dilarang tanpa otorisasi; audit §5 mencatat status ini sebagai alasan tidak ada temuan Kritis | Bila ternyata dapat dijangkau, dampak SSRF naik menjadi Kritis dan mitigasi (a) menjadi satu-satunya penahan sampai P0 selesai | Uji staging terisolasi + dokumentasi topologi egress dari penyedia runtime; mitigasi (a) menutup jendela selama perbaikan |
| U-3 | **Topologi egress / isolasi jaringan server produksi tidak diketahui** | Tidak ada dokumen firewall/security group/VPC/egress proxy di bundle bukti audit (§7 NOT VERIFIED) | Guard kode adalah satu-satunya lapisan; bila guard lolos (bug), tidak ada lapisan kedua | P2: isolasi egress infra; dokumentasi topologi sebagai prasyarat Phase 5 |
| U-4 | **Sumber IP pemanggil yang tepercaya belum diketahui** | Topologi ingress/proxy runtime tidak terdokumentasi (§A.7.1 v2) | Rate limit dapat menghitung IP yang salah (proxy tunggal atau header palsu) | Discovery P1-2a; default fail-closed (`socket.remoteAddress`) |
| U-5 | **Apakah scanner sudah disalahgunakan sebelum mitigasi** | Tidak ada akses ke log server atau metrik penyalahgunaan di luar kode (keterbatasan audit) | Serangan yang sudah terjadi tidak terdeteksi; kredensial/data yang sudah bocor tidak diketahui | Periksa log runtime bila tersedia; rotasi kredensial yang mungkin terekspos; monitor log percobaan SSRF setelah P1-4 |
| U-6 | **HTTP/2 pada Pendekatan 2 belum teruji** | Server uji memakai HTTP/1.1 (U-3 laporan spike) | Konten host yang salah dipindai atau fetch HTTP/2 gagal bila Pendekatan 2 dipakai | Paksa HTTP/1.1 untuk fetch terp-pin, atau uji HTTP/2 di staging |
| U-7 | **Kinerja/latensi DNS + pinning pada beban nyata belum teruji** | Spike memakai server lokal dan satu koneksi per uji (U-4 laporan spike) | Latensi pemeriksaan naik; timeout DNS 5 detik dapat menolak domain legit yang lambat | Uji beban di staging (R-01..R-15); monitor rasio penolakan DNS minggu pertama |
| U-8 | **Timing oracle residual pada penolakan** | Penolakan di `normalizeUrl()` (instan) vs setelah resolve (lambat) memberi celah timing kecil (dicatat di §A.6 butir 4) | Penyerang dapat membedakan alasan penolakan lewat waktu respons | Diterima sebagai keterbatasan di P0; mitigasi timing (delay seragam) dipertimbangkan di P2 bila dinilai perlu |
| U-9 | **RDAP bootstrap registry dapat berubah** | IANA dapat menambah/mengubah entri; cache semingguan dapat kedaluwarsa | Redirect RDAP ke host baru yang sah ditolak (false negative sinyal umur domain) | Refresh semingguan + fallback cache terakhir + log; RDAP yang gagal tidak menggagalkan pemeriksaan (sinyal "tidak diketahui") |
| U-10 | **Daftar blokir IANA dapat berubah** | Registry diperbarui IANA (terakhir 9 Okt 2025); entri baru dapat muncul | Alamat yang baru diklasifikasikan tidak terjangkau lolos sampai daftar diperbarui | Pemeriksaan 6 bulanan (§A.4.4); penghapusan entri tidak otomatis |
| U-11 | **Prefix translasi network-specific (NSP) di luar dua prefix NAT64 yang dikenal (v2.1) — TETAP TERBUKA (v2.2)** | Guard hanya mengekstrak IPv4 tertanam untuk `64:ff9b::/96` dan `64:ff9b:1::/48`. NSP lain (mis. prefix organisasi sendiri) yang menanamkan IPv4 privat di bawah prefix yang tampak publik TIDAK dikenali — alamat IPv6-nya lolos tabel IPv6 karena tampak publik | SSRF ke IPv4 privat lewat translasi NSP yang tidak dikenal | **TETAP sebagai risiko terbuka — tidak diklaim tertangani.** Penanganan di staging (v2.2): (1) jalankan DNS64 uji dengan prefix NSP yang diketahui (mis. prefix uji `2001:db8::/32` yang dikonfigurasi di DNS64 staging) dan verifikasi guard mengekstrak IPv4 tertanam dengan benar untuk prefix tersebut — uji S-49/S-50 baru; (2) minta dokumentasi egress runtime produksi: apakah jalur egress memakai NAT64/DNS64, prefix NSP apa saja yang dipakai, dan apakah ada daftar prefix yang didokumentasikan. **Kriteria penurunan status:** risiko ini HANYA boleh diturunkan dari TERBUKA bila (a) dokumentasi egress menyatakan prefix NSP yang dipakai (atau menyatakan tidak ada NAT64/DNS64 di jalur egress) DAN (b) uji staging dengan prefix-prefix itu lolos. Bila salah satu tidak terpenuhi, status TETAP TERBUKA dan prefix yang ditemukan di kemudian hari ditambahkan sebagai entri khusus dengan ekstraksi per RFC 6052 (posisi IPv4 bergantung panjang prefix). Dokumentasi egress mengurangi ketidakpastian dengan cara: bila runtime menyatakan tidak memakai NAT64/DNS64, permukaan serangan NSP hilang; bila memakai, daftar prefix-nya menjadi daftar yang harus ditangani guard — tanpa dokumen itu, guard tidak tahu prefix apa yang harus dicari. |
| U-16 | **Perilaku semaphore DNS di runtime artifact produksi belum terbukti (v2.2; diperbarui v2.3)** | Siklus hidup slot (§A.5.3), absolute cap, DAN penghitung orphaned + circuit breaker + terminasi worker (§A.5.4) TERBUKTI di Node v24.22.1 pada VM ini (SEM-T1..SEM-T6, SEM-R1..SEM-R6, ORPH-T1..T5) — BUKAN di runtime artifact produksi. Perilaku `AbortSignal`/timer/event-loop/IPC di runtime produksi dapat berbeda | Slot dilepas terlalu dini (race timeout) atau tidak pernah dilepas (cap tidak berjalan) di produksi → lookup background menumpuk atau semaphore macet; breaker tidak membuka/menutup sebagaimana dirancang | Absolute cap 30 dtk + batas orphaned + breaker sebagai katup pengaman; uji ulang perilaku semaphore DAN orphaned di staging produksi (U-1) wajib mencakup SEM-T1/T3/T5, ORPH-T1..T4; monitor `forceReleased` dan `orphaned` — bila > 0 di minggu pertama, selidiki resolver staging |
| U-18 | **Akumulasi orphaned TERBATAS tetapi tidak hilang (v2.3 — risiko sisa dari keberatan absolute cap; diperbarui v2.3.1 dengan angka worst-case lintas instance)** | Batas keras + breaker bersifat PER PROSES: tiap proses menahan maksimal `maxActive + cap = 8` operasi hidup. Batas ini TIDAK global antar instance — worst-case lintas instance = **8N** (N = jumlah instance; 100 instance → 800 operasi hidup total). `scan_leases` global TIDAK mengikat angka ini: lease membatasi pemeriksaan yang berjalan (maks 5), bukan akumulasi orphaned — karena lease dilepas saat pemeriksaan selesai sementara lookup-nya tetap hidup sebagai orphaned (lihat §A.5.6). Selain itu, operasi cap-deferred menahan slot sampai orphaned turun; bila resolver menggantung dan worker belum tersedia (mode tanpa worker), pemulihan tidak terjamin | Akumulasi lintas instance tetap mungkin (dibatasi per proses, bukan global); semaphore macet total bila worker tidak ada dan resolver menggantung selamanya | Batas per proses + breaker + restart worker sebagai pemulihan terjamin; bila mode tanpa worker dipakai, catat eksplisit bahwa pemulihan tidak terjamin dan satu-satunya jalan keluar adalah restart manual proses layanan; batas global lintas instance (bila dibutuhkan) adalah keputusan P2, bukan bagian P0 — syaratnya di §A.5.6 |
| U-19 | **Restart worker DNS — kompleksitas dan risiko restart loop (v2.3)** | Worker menambah komponen bergerak: spawn IPC, readiness check, respawn, cooldown, batas restart. Restart yang gagal (worker langsung mati lagi) atau restart loop dapat memperburuk keadaan; lookup yang sedang berjalan di worker yang di-kill gagal fail-closed dan membebani pemanggil | Restart loop menghabiskan sumber daya; lookup gagal massal saat worker di-restart berulang; IPC yang tidak diautentikasi menjadi permukaan baru | Cooldown 30 dtk + maks 3 restart/10 menit + page bila terlampaui; readiness check sebelum lookup pertama; channel IPC diikat ke parent (bukan socket terbuka); restart hanya bila breaker terbuka > 60 dtk atau `forceReleased ≥ 3`/5 menit |
| U-20 | **Breaker yang terlalu agresif dapat menolak lookup legit (v2.3)** | Bila resolver upstream lambat/bermasalah (bukan serangan), orphaned naik, breaker terbuka, dan SEMUA lookup DNS baru ditolak — termasuk domain legit. Ini adalah harga dari fail-closed: ketersediaan dikorbankan demi keamanan | Penolakan massal pemeriksaan legit saat resolver bermasalah; pengguna melihat scanner "mati" padahal targetnya aman | Ambang alert + runbook (§A.5.4 butir 4) agar operator cepat membedakan serangan vs resolver bermasalah; threshold pemulihan (hysteresis) mencegah flapping; bila resolver bermasalah terbukti, perbaikan resolver adalah tindakan yang benar — bukan melonggarkan breaker diam-diam |
| U-12 | **DNS non-cancellable — perilaku signal di runtime produksi belum terbukti (v2.1)** | Di VM ini `AbortSignal` tidak menghentikan `dns.lookup`/`resolve4` (TEST 3); apakah ini perilaku umum Node atau efek resolver lokal TIDAK dapat dibedakan di sini | Lookup yang tidak dapat dibatalkan menumpuk dan melampaui anggaran bila mitigasi race/semaphore gagal atau tidak diimplementasikan dengan benar | Mitigasi v2.1: race + timeout 5 dtk + semaphore 4 + abaikan hasil telat + log; uji ulang perilaku signal di staging produksi (U-1) wajib mencakup ini |
| U-13 | **TTL hasil resolve sandbox tidak representatif (v2.1)** | Resolver VM mengembalikan TTL 15 untuk `example.com` → `198.18.228.151` (alamat benchmarking, bukan alamat publik sebenarnya) — nilai TTL/alamat dari VM tidak valid untuk produksi | Keputusan berbasis TTL/alamat VM ini salah bila diterapkan ke produksi | TTL hanya dicatat (tidak dipakai sebagai dasar blokir); tidak ada caching DNS — pin selalu resolve segar per hop; uji TTL di staging dengan DNS yang dikontrol sendiri |
| U-14 | **Tabel lease `scan_leases` sebagai titik kegagalan baru (v2.1)** | Konkurensi global bergantung pada DB bersama; bila DB lambat/down, seluruh pemeriksaan ditolak 503 (fail-closed) atau lease bocor | Downtime pemeriksaan bila DB bermasalah; slot macet bila release gagal dan TTL 25 detik belum kedaluwarsa | TTL lease 25 dtk membersihkan slot macet otomatis; release di `finally`; monitor rasio 503/429 minggu pertama; bila DB lease terbukti rapuh, fallback ke semaphore per instance + kuota dibagi (keputusan eksplisit pemilik, bukan diam-diam) |
| U-15 | **Perilaku `AbortSignal` dan `lookup` pada runtime artifact produksi belum terbukti (v2.1)** | Semua bukti spike (pinning, dekompresi, DNS, RDAP) berasal dari Bun/Node CLI di VM ini, BUKAN runtime artifact produksi — versi/konfigurasi runtime produksi tidak terdokumentasi | Pendekatan pinning atau perilaku DNS yang terbukti di VM gagal di staging produksi → implementasi harus beralih di tengah jalan | Uji P0-1a' di staging produksi SEBELUM integrasi penuh (tetap wajib); bila gagal, ikuti alternatif §A.2a (fetcher terpisah / egress proxy) |
| U-17 | **Lease `scan_leases` di bawah beban ratusan instance belum teruji (v2.2)** | Uji atomicity memakai 8 proses serentak; kontensi lock pada ratusan instance bersamaan (antrean lock SQLite, atau lock advisory PostgreSQL) belum diukur — latensi acquire dapat naik dan timeout 5 dtk dapat terpicu massal | Acquire lease melambat → 503 massal saat beban tinggi; atau timeout lock menyebabkan penolakan pengguna legit | Uji beban R-15 baru (ratusan acquire bersamaan, ukur latensi p95 dan rasio 503); bila kontensi terbukti bermasalah, pertimbangkan sharding lease per kelompok instance atau semaphore lokal sebagai lapisan pertama + lease global sebagai lapisan kedua (keputusan eksplisit, bukan diam-diam) |
| U-21 | **Exit worker tidak terkonfirmasi (v2.3.1 — BARU)** | Bila proses worker tidak mati setelah SIGKILL (D-state / uninterruptible sleep, namespace bermasalah), tidak ada event `exit` — counter tetap, breaker tetap terbuka, dan satu-satunya jalan keluar adalah intervensi operator atau restart manual proses layanan. Perilaku ini TERBUKTI sebagai fail-closed (TERM-T3), tetapi berarti satu worker yang tidak bisa mati dapat menahan breaker terbuka sampai intervensi manual | Breaker terbuka berkepanjangan → seluruh lookup DNS baru ditolak sampai intervensi manual; ketersediaan scanner mati sementara | Alert `workerExitUnconfirmed > 0` → page; runbook: periksa proses (`ps`), bila proses ada tetapi tidak merespons, eskalasi ke operator infra; JANGAN memaksa decrement counter secara manual tanpa bukti proses mati |
| U-22 | **Parent crash / supervisor platform belum terbukti (v2.3.1 — BARU)** | Dua lapis pertahanan TERBUKTI di VM ini (worker self-exit via `disconnect`/ppid-watchdog + pidfile cleanup oleh parent baru — PARENT-T1a/T1b). Lapis ketiga — supervisor platform yang me-restart proses dan membunuh process group saat crash — TIDAK DAPAT diperiksa di VM ini; perilaku supervisor runtime produksi tidak terdokumentasi | Bila supervisor tidak membunuh process group DAN dua lapis pertama gagal (mis. worker sedang menjalankan operasi yang menahan event loop tanpa handler cleanup), worker yatim dapat terus berjalan di luar penghitung parent baru | Persyaratan staging SUP-01 (gerbang G6): dokumentasi supervisor HARUS menyatakan restart otomatis + kill process group; bila tidak dapat dibuktikan, pertahanan yang tersisa adalah self-exit + pidfile cleanup yang teruji — dan harus diuji ulang di staging produksi |
| U-23 | **Batas global orphaned belum ada — worst-case lintas instance 8N (v2.3.1 — BARU, kuantifikasi U-18)** | Batas 8 operasi hidup adalah batas per proses; tidak ada mekanisme bersama yang mengikat total orphaned lintas instance. `scan_leases` tidak mengikatnya (lihat §A.5.6). Store bersama untuk orphaned global membutuhkan heartbeat/lease-TTL pada entri orphaned + failure mode baru (DB down → seluruh DNS fail-closed) | 100 instance × 8 = 800 operasi DNS hidup pada resolver yang menggantung; akumulasi tidak terlihat oleh satu pun breaker per proses | Batas per proses + breaker + restart worker + metrik/alert sebagai mitigasi P0; batas global orphaned adalah keputusan P2 dengan syarat di §A.5.6 (store bersama teruji + failure mode terdokumentasi + keputusan pemilik) |
| U-24 | **Jendela TOCTOU validasi-identitas → SIGKILL (v2.3.2 — DIJAWAB v2.3.6, residual pindah ke U-41)** | Mitigasi v2.3.2 (validasi sesaat sebelum sinyal + baca ulang starttime) diganti oleh pidfd (§A.5.5.2a): sinyal kini terikat struct pid, bukan nomor — kill-salah-sasaran DITUTUP (dibuktikan PIDFD-T2/T12d). Yang tersisa dari U-24 adalah jendela validasi-kedaluwarsa yang membutuhkan tabrakan starttime — dicatat sebagai U-41 (terkuantifikasi: P ≈ 7e-9/cleanup pada pid_max default). Fallback tanpa pidfd tetap memakai mitigasi v2.3.2 dengan jendela ~46 µs | SIGKILL mengenai proses yang salah HANYA bila terjadi tabrakan starttime (U-41) | pidfd sebagai mekanisme utama; fallback terkuantifikasi HANYA dengan persetujuan eksplisit owner (STAGE-P07) |
| U-25 | **Race reklamasi lock basi — TERBUKTI (v2.3.2 — DIPERSEMPIT v2.3.3 — DITARIK DAN DIGANTI v2.3.4)** | Klaim v2.3.3 ("balapan hapus+create diselesaikan oleh O_EXCL", "SU10-T1 membuktikan balapan terkelola") TERBUKTI SALAH: ADV-T1 mereproduksi 2 pemilik secara deterministik (2/2 run) — B meng-unlink file lock baru milik A berdasarkan probe basi, lalu memperoleh lock sendiri; A tidak pernah tahu. Akar masalah: (1) unlink tak bersyarat setelah probe basi; (2) verify hanya pemeriksaan sesaat — otoritas lock menguap begitu path dihapus. Seluruh jalur probe+unlink DIHAPUS v2.3.4 dan diganti flock (§A.5.5.4c); ADV-T2/T2sim membuktikan perbaikan (tepat satu pemilik, 2/2 run). Sisa dari U-25 yang masih relevan: PID reuse antara probe dan unlink (proses baru kehilangan file yang bukan miliknya — tidak ada dampak) | Dua parent sama-sama berstatus pemilik dan sama-sama melakukan cleanup (pada KODE LAMA) | Mekanisme flock + never-unlink + verifikasi ulang (ADV-T2/T2sim/T5, FLK-T1..T8); uji ulang di staging produksi tetap wajib (balapan di bawah beban/latensi runtime produksi belum teruji) |
| U-26 | **Startup macet sampai intervensi operator (v2.3.3 — BARU — DIPERBARUI v2.3.4)** | Aturan ketat v2.3.3 (PID hidup/EPERM/lock tak terbaca -> NOT_READY sampai operator memeriksa) menjadi TIDAK RELEVAN untuk lock setelah v2.3.4: jalur probe+unlink yang memicunya sudah dihapus — tidak ada lagi keputusan hapus yang dapat macet. Residual yang TETAP: (a) bila verifikasi ulang kepemilikan gagal (mis. file diganti pihak ketiga), parent keluar `ownership-revalidation-failed` + page dan TIDAK BOLEH start ulang sebelum operator memeriksa (runbook §A.5.5.4c); (b) bila flock dipegang proses yang tidak mati-mati (holder hidup tetapi tidak sehat), parent baru keluar `held-by-live-holder` dan supervisor harus menangani holder lama — bukan parent baru yang memaksakan akuisisi. Operator yang salah menghapus file lock pemegang yang hidup tetap dapat menciptakan dua pemilik (flock bersifat advisory) | Scanner tetap nonaktif sampai operator memeriksa; penghapusan file lock yang ceroboh oleh operator adalah satu-satunya jalan tersisa menuju dua pemilik di luar masa transisi versi | Page segera saat `ownership-revalidation-failed`; runbook operator wajib: (1) JANGAN PERNAH `rm` file lock saat parent berjalan; (2) periksa `ps` + `/proc` untuk PID yang diklaim; (3) bila proses hidup, biarkan pemegangnya atau matikan pemegang itu terlebih dahulu (flock lepas otomatis saat proses mati — FLK-T2), jangan hapus file-nya; (4) catat keputusan di log insiden |
| U-27 | **Durabilitas pidfile belum terbukti di filesystem produksi (v2.3.3 — BARU)** | SU-T4 membuktikan atomic visibility (rename atomik), BUKAN durabilitas. Seluruh bukti di VM ini berjalan di `/tmp` bertipe tmpfs (fsync tidak menguji durabilitas disk) dan `/home` di overlay btrfs dengan `fsync=volatile` — tidak ada bukti durability di VM ini yang membuktikan durability di filesystem produksi. Bila filesystem produksi mengabaikan fsync, crash tepat setelah rename dapat mengembalikan pidfile lama (atau menghilangkan pidfile) setelah reboot | Pidfile lama yang kembali setelah reboot dapat membuat parent baru menilai worker lama sebagai masih hidup (NOT_READY yang tidak perlu) atau, sebaliknya, kehilangan jejak worker yang sebenarnya masih hidup — dalam kedua kasus, keputusan startup didasarkan pada data basi | Pidfile + lock WAJIB di penyimpanan persisten (bukan tmpfs); uji crash staging D-01..D-03 wajib dijalankan di lingkungan dengan filesystem yang sama dengan produksi sebelum cutover; lokasi pidfile/lock + output `df`/`mount` didokumentasikan saat implementasi (P0-1b) |

---

| U-28 | **Masa transisi versi campuran (v2.3.4 — BARU)** | ADV-T6 membuktikan: parent berkode LAMA (unlink-reclaim) yang berjalan bersamaan dengan holder berkode BARU (flock) dapat menghasilkan DUA pemilik — unlink kode lama menghapus file holder baru. Jaring pengaman (verifikasi ulang inode+token) menangkapnya sebelum cleanup pada 2/2 run, tetapi itu jaring pengaman, bukan penutup struktural. flock bersifat advisory: ia tidak menghalangi proses yang tidak memanggil flock | Dua parent berstatus pemilik selama masa transisi; bila verifikasi ulang dilewati/diabaikan implementasi, keduanya melakukan cleanup | Flag-day WAJIB (§A.5.5.4d): hentikan SEMUA parent sebelum upgrade/rollback; verifikasi ulang sebelum cleanup apa pun; uji ADV-T6 diulang di staging sebelum cutover |
| U-29 | **Binding flock/pidfd untuk runtime produksi belum terbukti (v2.3.4 — BARU — DIPERBARUI v2.3.5 — DIPERBARUI v2.3.6)** | `bun:ffi` -> libc flock TERBUKTI di Bun 1.4.4 (acquire / EWOULDBLOCK errno 11 / release on close). `fs-ext` untuk Node GAGAL dibangun di VM ini (node-gyp EPERM fchown — pembatasan sandbox, bukan cacat fs-ext) — dikonfirmasi ketiga kalinya di v2.3.5 (`npm install fs-ext` di `/tmp/fsext-retest2` → error yang sama). **BARU v2.3.6:** `bun:ffi` -> libc `pidfd_open`/`pidfd_send_signal` TERBUKTI di Bun 1.4.4 (PIDFD-T8, 2/2 × 2). Bila runtime produksi memakai Node (bukan Bun), jalur binding flock MAUPUN pidfd belum terbukti. Selain itu, fd lock WAJIB O_CLOEXEC — FLK-T8b membuktikan bila fd diwariskan ke worker, flock tidak lepas sampai worker mati. Ketersediaan `bun:ffi` di dalam sandbox artifact produksi sendiri adalah risiko terpisah U-34 (NOT VERIFIED, kini STAGE-P01) | Parent baru tidak dapat memperoleh lock (startup macet), pensinyalan pidfd tidak dapat berjalan, atau implementasi fallback tanpa flock mengembalikan race lama | Buktikan binding di staging pada runtime yang sama dengan produksi (FLK-06 + PIDFD-T8, STAGE-P01/P07); verifikasi O_CLOEXEC pada API open yang dipakai (FLK-T8a/T8b diulang di staging); bila tidak ada binding yang terbukti, JANGAN implementasikan mekanisme flock/pidfd — kembali ke meja desain |
| U-30 | **flock di network filesystem belum terbukti (v2.3.4 — BARU — DIPERBARUI v2.3.5)** | FLK-T1..T8 teruji di tmpfs dan overlay (perilaku identik). NFS TIDAK diuji — tidak ada NFS di VM ini; AUTH-T9c NOT RUN di v2.3.5. flock di NFS bergantung pada lockd (NFSv3) atau delegasi (NFSv4); perilaku saat network partition / server restart berbeda dari filesystem lokal dan dapat memberi hasil yang salah (lock yang tidak saling mengecualikan, atau lock yang tidak lepas) | Dua parent memperoleh lock di atas NFS, atau parent baru macet selamanya pada lock yang tidak pernah lepas | Direktori lock WAJIB di filesystem lokal (bukan NFS) kecuali bukti staging menyatakan sebaliknya (FLK-07); lokasi + `df`/`mount` didokumentasikan saat implementasi (P0-1b) |
| U-31 | **Jendela mikro verifikasi ulang -> tindakan destruktif — DIJAWAB v2.3.5 (otoritas flock)** | U-31 v2.3.4 bertanya apakah pemeriksaan (dev,ino)/token cukup sebagai otoritas. Jawaban v2.3.5 (§A.5.5.4e): TIDAK — otoritas adalah flock kernel pada fd yang dipegang; (dev,ino)+token adalah detektor, bukan otoritas. Setiap tindakan sensitif di-gating `assertOwnership()` segar dalam tick sinkron yang sama (`guardedAction`); CLOEXEC diverifikasi via fdinfo; tiap tindakan di-gating identitas (SIGKILL per-sinyal, token pidfile ditolak worker). Dibuktikan AUTH-T1..T11 + AUTH-C1, 18/18 × 2 | Sisa jendela yang tidak dapat dibuat nol dicatat sebagai U-38 (residual, dampak dibatasi fail-closed) | Verifikasi ulang sesaat sebelum tiap langkah destruktif; validasi identitas per-sinyal; token pidfile; uji ulang di staging produksi |
| U-32 | **Bahaya reverse mixed-version: old parent memperoleh lock DULU (v2.3.5 — BARU)** | Parent lama tidak pernah memanggil flock, sehingga parent baru dapat memperoleh flock pada file yang sama sementara holder lama hidup — (dev,ino) sama, tidak ada unlink yang dapat dideteksi verifikasi ulang. Pencegahan harus terjadi SEBELUM penimpaan record | Dua pemilik tercatat bersamaan sampai salah satu keluar; parent baru dapat berjalan dengan keyakinan palsu bahwa ia pemilik tunggal | Pre-start scan `/proc` (AUTH-T5a) + klasifikasi record sebelum penimpaan (AUTH-T5b) sebagai dua lapis; flag-day tetap mengikat (§A.5.5.4d); uji ulang di staging sebelum cutover |
| U-33 | **flock bersifat advisory — tidak menghentikan proses yang tidak memanggilnya (v2.3.5 — DIJAWAB v2.3.6, residual U-43/U-44)** | Jawaban v2.3.6 (§A.5.5.4g): kontrol dikatalogkan dengan bukti per kontrol (OPS-T1..T7). Yang OS-enforced dan TERBUKTI: direktori lock 0700 + ownership user layanan (OPS-T1) dan isolasi antar-user layanan (OPS-T6) — keduanya ditegakkan kernel terhadap semua user non-root. Bind-mount ro TERBUKTI menghentikan penghapusan tak sengaja, tetapi root dapat me-remount rw (OPS-T3). `chattr +i/+a` TIDAK tersedia di VM ini (OPS-T2) — bukan kontrol yang dapat diandalkan tanpa bukti staging. Auditd/eBPF TIDAK ADA di VM ini (OPS-T5) — wajib staging (STAGE-P12). Pemulihan penghapusan TERBUKTI: dua pemilik dari penghapusan file terdeteksi via pre-start scan dan diselesaikan tanpa cleanup ganda (OPS-T7). Yang TETAP residual: root yang SENGAJA menghapus (U-43) dan ro-bind-mount yang bukan default deployment (U-44) | Dua pemilik (satu via flock, satu via jalur lain) atau kehilangan file lock oleh penghapusan ceroboh | Never-unlink + prosedur deployment/rollback/maintenance yang mengikat (§A.5.5.4g) + runbook pemulihan; verifikasi ulang + gating per-tindakan memastikan tidak ada cleanup tanpa otoritas; flag-day untuk transisi versi; audit sebagai jejak atas root |
| U-34 | **Runtime artifact produksi: versi dan ketersediaan `bun:ffi` TIDAK DAPAT DIVERIFIKASI (v2.3.5 — BARU — DIPERBARUI v2.3.6)** | Dari VM ini hanya Bun CLI 1.4.4 yang terverifikasi. Versi/konfigurasi runtime di dalam sandbox artifact tidak terdokumentasi di bundle bukti mana pun; tidak ada cara mengaksesnya dari VM ini. **BARU v2.3.6:** prasyarat ini kini dirumuskan sebagai STAGE-P01 (matriks §D.4.15) dengan kriteria PASS/FAIL eksplisit — FAIL = implementasi DIBLOKIR | `bun:ffi` tidak tersedia / perilaku berbeda di runtime produksi → implementasi flock/pidfd tidak dapat berjalan → kembali ke meja desain di tengah jalan | Probe staging pada runtime yang SAMA dengan produksi (FLK-06 diperluas + PIDFD-T8): buktikan `bun:ffi` → libc `flock` DAN `pidfd_open`/`pidfd_send_signal` (acquire / EWOULDBLOCK / release) di dalam sandbox artifact; bila tidak terbukti, JANGAN implementasikan mekanisme flock/pidfd |
| U-35 | **Filesystem direktori lock produksi TIDAK DAPAT DIVERIFIKASI (v2.3.5 — BARU — DIPERBARUI v2.3.6)** | Jenis filesystem, dukungan semantik flock, dan apakah mount/inode dapat diganti oleh container/deployment/supervisor tidak diketahui dari VM ini. Yang teruji hanya tmpfs dan overlay di VM ini. **BARU v2.3.6:** prasyarat ini kini dirumuskan sebagai STAGE-P02 (matriks §D.4.15) — FAIL = implementasi DIBLOKIR (kecuali hanya `chattr` yang gagal, yang dicatat sebagai tidak tersedia) | flock tidak saling mengecualikan / tidak lepas pada filesystem produksi → dua pemilik atau startup macet | Lokasi lock WAJIB di filesystem lokal; `df`/`mount` didokumentasikan saat implementasi (P0-1b); uji FLK-T1..T8 diulang di staging pada filesystem produksi; NFS dilarang tanpa bukti (U-30, STAGE-P06) |
| U-36 | **Supervisor / container / deployment dapat mengganti mount atau inode (v2.3.5 — BARU, perluasan U-22 — DIPERBARUI v2.3.6)** | Perilaku supervisor platform (restart otomatis, kill process group) dan apakah deployment me-replace mount tidak terdokumentasi; tidak dapat diperiksa dari VM ini. **BARU v2.3.6:** prasyarat ini kini dirumuskan sebagai STAGE-P04 (matriks §D.4.15) — FAIL = implementasi DIBLOKIR kecuali owner menerima residual U-22 secara tertulis | Mount diganti di tengah jalan → (dev,ino) berubah → parent keluar `ownership-revalidation-failed` (fail-closed, tetapi scanner mati) atau, lebih buruk, dua mount dengan dua file lock yang masing-masing memberi satu pemilik | Persyaratan staging SUP-01 diperluas: dokumentasi supervisor + deployment HARUS menyatakan (a) restart otomatis, (b) kill process group, (c) apakah mount direktori lock dapat diganti saat deploy; bila mount dapat diganti, direktori lock harus di luar path yang di-replace |
| U-37 | **Zombie liveness — DITUTUP v2.3.5, residual runtime tanpa `/proc` (v2.3.5 — BARU)** | `pidAlive()` v2.3.4 hanya memakai `kill(pid,0)` dan mengklasifikasi zombie sebagai hidup → parent baru menolak start (`lock-record-contradiction`, dibuktikan §4.1 `SSRF_SPIKE_V235.md`). Perbaikan v2.3.5: baca state `/proc/<pid>/stat` (`Z`/`X` = tidak hidup), dibuktikan AUTH-T11 (2/2 run). Residual: perbaikan bergantung pada `/proc` | Bila runtime produksi tidak menyediakan `/proc`, `pidAlive()` kembali ke fallback `kill(pid,0)` dan zombie kembali memblokir startup | Staging wajib memverifikasi ketersediaan `/proc` di runtime produksi; bila tidak ada `/proc`, liveness harus memakai primitif lain yang terbukti (keputusan desain terpisah, bukan diam-diam) |
| U-38 | **Jendela mikro residual: revalidasi → tindakan tidak dapat dibuat nol (v2.3.5 — DIJAWAB v2.3.6, residual terkuantifikasi U-41)** | Jawaban v2.3.6 (§A.5.5.2a): untuk pensinyalan worker lama, jendela ini DITUTUP sebagai jalur kill-salah-sasaran — `pidfd_send_signal` terikat struct pid, bukan nomor (dibuktikan PIDFD-T2/T12d). Yang tersisa adalah jendela validasi-kedaluwarsa yang membutuhkan tabrakan starttime, terkuantifikasi di PIDFD-T9 (P ≈ 7e-9/cleanup pada pid_max default) dan dicatat sebagai U-41. Untuk tindakan lain (tulis pidfile, spawn worker, transisi READY), jendela mikro v2.3.5 TETAP: revalidasi dan tindakan adalah dua syscall terpisah — konsekuensinya fail-closed (tindakan tidak berjalan bila otoritas hilang; SIGKILL di-gating identitas per-sinyal; worker menolak token yang tidak cocok), BUKAN bahwa jendela itu tidak ada | Pihak ketiga yang mengganti file TEPAT di antara revalidasi dan tindakan: pemilik basi paling buruk membunuh worker yang identitasnya cocok dengan pidfile (SIGKILL idempotent) atau menulis pidfile yang ditolak worker (token mismatch) — dampak dibatasi, bukan dihilangkan | Revalidasi sesaat sebelum tiap langkah destruktif (bukan sekali di awal); validasi identitas per-sinyal (kini via pidfd); token pidfile; penutup struktural penuh membutuhkan primitif atomik check-and-act yang tidak tersedia lewat syscall file biasa — diterima sebagai residual (U-41 untuk pensinyalan) |
| U-39 | **PID yang di-spawn supervisor dapat berbeda dari PID proses yang melayani (v2.3.5 — BARU)** | Teramati pada peluncuran via shell (debug manual: `$!` = 3859 vs PID parent sebenarnya 3863); mekanisme TIDAK ditentukan. Pada spawn Node langsung, PID spawn == PID proses (4506 == 4506, dibuktikan). Supervisor yang membunuh hanya PID yang di-spawn dapat membiarkan parent asli tetap hidup memegang lock | Parent lama yang dikira mati ternyata hidup → parent baru terblokir `held-by-live-holder` atau, bila supervisor me-restart tanpa verifikasi, dua parent hidup bersamaan | Supervisor WAJIB membunuh berdasarkan PID yang tercatat di pidfile/lock record (ditulis dari dalam proses itu sendiri) dan memverifikasi kematian via state `/proc` (bukan hanya `kill(pid,0)`); staging wajib membuktikan jalur kill supervisor (SUP-01) |
| U-40 | **Scan parent false positive via pencocokan substring (v2.3.5 — BARU — DITUTUP)** | Pemindaian `/proc` versi awal mencocokkan marker sebagai substring — shell `bash -c` peluncur mengandung marker di cmdline-nya dan terdeteksi sebagai "parent lain" (tertangkap saat diagnosis AUTH-T3). Perbaikan: marker harus cocok sebagai TOKEN argv persis (cmdline dipecah `\0`), dibuktikan suite AUTH 18/18 × 2 | Sebelum perbaikan: startup sehat ditolak `other-parent-alive` tanpa alasan yang benar | Aturan mengikat: marker adalah token argv persis dan unik per layanan; bila dua layanan berbagi marker yang sama, false positive kembali — penamaan marker didokumentasikan saat implementasi |

| U-41 | **Tabrakan starttime — residual pidfd (v2.3.6 — BARU, sisa U-24/U-38)** | pidfd menutup kill-salah-sasaran, tetapi `pidfd_open` pada langkah 2 dapat terjadi SETELAH reuse — bila proses baru KEBETULAN memiliki starttime yang sama persis dengan korban, re-validasi langkah 3 juga lolos dan sinyal mengenai proses baru. `starttime` beresolusi ~10 ms (100 tick/detik). Jendela langkah 1→2 diukur (PIDFD-T9): p99 ≈ 42–46 µs; P per cleanup ≈ 6–7e-9 pada pid_max default 4.194.304, ≈ 8,8e-7 pada pid_max=32768, ≈ 7,1e-6 pada pid_max=4096, ≈ 2,8e-5 pada pid_max=1024. Angka ini estimasi orde-besaran (asumsi laju spawn konstan + sebaran seragam), bukan probabilitas eksak — dan TIDAK mencakup lonjakan spawn (fork bomb) | SIGKILL mengenai proses yang salah (proses lain yang memakai ulang PID DAN starttime yang sama) | STAGE-P08: catat pid_max produksi + hitung P; PASS ≤ 1e-6, kondisional ≤ 1e-5 (persetujuan owner tertulis), BLOCK > 1e-5. Tidak ada penutup struktural yang tersedia lewat syscall biasa — diterima sebagai residual terkuantifikasi |
| U-42 | **Celah bukti staging — matriks itu sendiri (v2.3.6 — BARU)** | STAGE-P01..P12 (§D.4.15) adalah daftar bukti yang wajib dikumpulkan — tetapi belum satu pun dikumpulkan, karena staging produksi belum tersedia/didokumentasikan dari VM ini. Sampai prasyarat itu dipenuhi, SEMUA kesimpulan v2.3.6 tentang runtime produksi tetap bersyarat | Implementasi dimulai tanpa bukti staging → kegagalan ditemukan di tengah jalan (runtime tidak mendukung, filesystem tidak cocok, supervisor tidak berperilaku seperti asumsi) | Matriks STAGE-P01..P12 dengan konsekuensi FAIL yang dinyatakan sebelumnya; implementasi DIBLOKIR sampai prasyarat BLOCK terpenuhi atau fallback-nya disetujui owner secara eksplisit |
| U-43 | **Root yang sengaja menghapus/mengganti lock (v2.3.6 — BARU, sisa U-33)** | OPS-T4 membuktikan root melewati DAC — tidak ada permission Unix yang mengikat root. Bind-mount ro (OPS-T3) hanya menghentikan root yang tidak sadar; root yang sengaja me-remount rw lalu menghapus tidak dapat dicegah oleh kontrol teknis apa pun di level ini | File lock hilang → parent aktif mendeteksi dan berhenti fail-closed (OPS-T7) — dampaknya ketersediaan, bukan dua pemilik yang saling membersihkan; tetapi bila penghapusan dilakukan berulang/sengaja, scanner tidak dapat berjalan stabil | Jejak audit (STAGE-P12) sebagai deteksi pasca-kejadian + runbook operator yang mengikat (§A.5.5.4g) + monitoring mount/direktori. Risiko ini TIDAK dapat ditutup secara teknis — diterima secara eksplisit atau ditangani di luar rancangan ini (mis. MAC/SELinux/AppArmor — di luar lingkup P0, perlu keputusan terpisah) |
| U-44 | **Ro-bind-mount bukan default deployment (v2.3.6 — BARU, sisa U-33)** | Bind-mount read-only direktori lock adalah prosedur deployment (§A.5.5.4g), bukan default platform — ia harus dipasang, didokumentasikan di inventaris mount, dan dicek berkala. Bila langkah ini dilewati (deployment manual, environment baru, lupa), lapis pertahanan terhadap penghapusan tak sengaja oleh root hilang tanpa peringatan | Penghapusan tak sengaja oleh root yang seharusnya dicegah ro-mount menjadi mungkin | Cek otomatis di skrip deployment (verifikasi mount masih `ro` sebelum parent start — gagal → deployment berhenti); monitoring berkala mount; STAGE-P12 memverifikasi kontrol ini di staging |
| U-45 | **Latensi deteksi — monitoring inode mendeteksi pemisahan lock setelah terjadi (v2.3.7 — BARU, dari evaluasi §8 butir 9)** | v2.3.6 memiliki monitoring sebagai deteksi tetapi tidak pernah merumuskan latensi deteksi sebagai risiko: pemindaian proses/inode terjadi berkala, sehingga ada interval di mana dua pemilik dapat hidup bersamaan tanpa terdeteksi. Tidak ada bukti yang membuktikan tidak ada interval split-lock di antara pemindaian | Dua pemilik hidup bersamaan selama interval antar pemindaian tanpa alert; bila keduanya melakukan cleanup dalam interval itu, kerusakan terjadi sebelum deteksi | Batas latensi dirumuskan + alert teruji sampai ke operator (ST-12, §5 butir 11 `SSRF_RECONCILIATION_V237.md`); pemindaian pre-start + gating per-tindakan membatasi apa yang dapat dilakukan pemilik basi dalam interval itu |
| U-46 | **Divergensi fallback numeric-kill — evaluasi melarang, v2.3.6 mengizinkan dengan persetujuan owner (v2.3.7 — BARU — DIDEFINISIKAN LENGKAP v2.3.8, TANPA KEPUTUSAN)** | **Definisi masalah:** evaluasi §2.2 melarang fallback ke numeric `kill(pid)` ("Never fall back to numeric kill(pid)"). Desain v2.3.6 STAGE-P07 mengizinkan fallback numeric-kill terkuantifikasi HANYA dengan persetujuan eksplisit owner dan BUKAN sebagai default. Kedua posisi tidak dapat dipenuhi bersamaan — salah satu harus dipilih sebelum implementasi pensinyalan worker. **Status:** TERBUKA — belum diputuskan (blokir B-11 register V2). Tidak memblokir pekerjaan desain tahap (a), tetapi MEMBLOKIR implementasi pensinyalan (tahap b) sampai diputuskan. **Owner keputusan:** Rama (pemilik proyek) — bukan Muse, bukan ChatGPT; keputusan harus tertulis dan menyebut opsi + tanggal. **Fakta teknis (terbukti di VM):** jalur utama pidfd menutup kill-salah-sasaran (PIDFD-T2/T12d, `evidence/v236/pidfd-run1/2.txt`, `pidfd-t12-run1/2.txt`); residual pidfd adalah tabrakan starttime U-41 (P ≈ 7e-9/cleanup pada pid_max default 4.194.304; ≈ 8,8e-7 pada 32768; ≈ 7,1e-6 pada 4096; ≈ 2,8e-5 pada 1024 — PIDFD-T9, `window-run1/2.txt`, estimasi orde-besaran); fallback memakai mitigasi v2.3.2 (validasi sesaat sebelum sinyal + baca ulang starttime) dengan jendela ~46 µs (p99 terukur 41,7–46,0 µs). **Opsi (a) terima fallback terkuantifikasi:** numeric-kill diizinkan HANYA bila pidfd tidak tersedia, HANYA dengan persetujuan owner tertulis per deployment, BUKAN default — risiko residual kill-salah-sasaran terkuantifikasi tetap ada (U-41). **Opsi (b) adopsi larangan evaluasi:** fallback numeric-kill DILARANG mutlak; bila pidfd tidak tersedia, pensinyalan harus memakai retained child-process handle, supervisor, atau Bun documented termination API (evaluasi §2.4) — ketiganya BELUM ADA di desain dan BELUM TERBUKTI — masing-masing butuh desain + bukti sendiri sebelum implementasi. **Prasyarat sebelum keputusan dapat dieksekusi:** (1) pid_max produksi tercatat (STAGE-P08); (2) ketersediaan `bun:ffi` → pidfd di runtime produksi terbukti atau tidak (STAGE-P01) — bila pidfd terbukti tersedia, urgensi U-46 turun; (3) bila opsi (b) dipilih, desain + bukti alternatif pengganti harus selesai DULU. **Kriteria penerimaan (U-46 TERTUTUP):** keputusan tertulis pemilik menyebut opsi (a) ATAU (b) + tanggal; bila (a): persetujuan tertulis per deployment tercatat, STAGE-P08 PASS ≤ 1e-6 atau kondisional ≤ 1e-5 dengan persetujuan, fallback TIDAK menjadi default di kode; bila (b): desain alternatif selesai + bukti VM-nya ada + fallback numeric-kill dihapus dari desain. Sampai semua itu terpenuhi, U-46 tetap TERBUKA dan implementasi pensinyalan tetap DIBLOKIR. Definisi lengkap juga di `SSRF_RESPONSE_MATRIX_V238.md` §3. **Pemetaan v2.3.10 (F-015/U-46):** U-46 hanya memblokir worker-signaling fallback path (§A.5.5.2a / STAGE-P07) — BUKAN blanket dependency untuk F-001..F-005 atau tester; peta lengkap di `SSRF_RESPONSE_MATRIX_V2310.md` §3 dan `SSRF_REMEDIATION_DESIGN.md` §D.4.21. | Bila owner menerima fallback: risiko kill-salah-sasaran terkuantifikasi tetap ada (U-41). Bila owner mengadopsi larangan: fallback harus diganti sebelum implementasi — desain fallback berubah; bila pengganti belum didesain, pensinyalan tidak memiliki jalur fallback sama sekali | **Keputusan owner tertulis wajib sebelum implementasi pensinyalan.** v2.3.8 mendefinisikan lengkap dan TIDAK memutuskan. |
| U-47 | **DG-1 — mode file lock 0600 belum menjadi persyaratan implementasi (v2.3.8 — BARU)** | Persyaratan dirumuskan di §D.4.18 (file lock `0600`, direktori `0700`, verifikasi saat startup → NOT_READY bila gagal) — tetapi belum diimplementasikan (tahap b) dan belum diuji | File lock dapat dibaca proses lain → informasi lock bocor / dimanipulasi | Implementasi + kriteria tes DG-1 (§D.4.18) di staging |
| U-48 | **DG-2 — open O_NOFOLLOW + validasi fstat belum menjadi persyaratan implementasi (v2.3.8 — BARU)** | Persyaratan dirumuskan di §D.4.18 (`O_NOFOLLOW` + validasi `fstat` dev/ino/UID) — tetapi belum diimplementasikan (tahap b) dan belum diuji | Symlink di path lock diikuti → lock menunjuk file yang dikontrol pihak lain | Implementasi + kriteria tes DG-2 (§D.4.18) di staging |
| U-49 | **DG-3 — penolakan symlink/non-regular belum menjadi persyaratan implementasi (v2.3.8 — BARU)** | Persyaratan dirumuskan di §D.4.18 (symlink/FIFO/socket/direktori di path lock DITOLAK saat startup) — tetapi belum diimplementasikan (tahap b) dan belum diuji | Path lock non-regular diterima → startup memakai lock yang bukan file regular | Implementasi + kriteria tes DG-3 (§D.4.18) di staging |
| U-50 | **F-016 — cache hasil scan basi: false-negative benign→malicious dalam TTL + kegagalan dikunci sebagai null 10 menit (v2.3.11 — BARU)** | Perilaku TERBUKTI di kode mirror commit `d85a1e2` (`actions.ts` baris 111–168): `FETCH_CACHE` key = URL saja, TTL 10 menit; `fetchText` mengembalikan cache sebelum fetch; kegagalan disimpan sebagai `null` selama TTL. Keputusan desain v2.3.11 (§D.4.22): hapus cache fetch untuk jalur security scan (rekomendasi utama) atau, bila dipertahankan, hanya sukses di-cache + freshness ditampilkan + re-check wajib fresh. Belum diimplementasikan (tahap b + HOLD F-020) dan belum diuji (H-CACHE-01..04 spesifikasi staging) | Halaman berubah benign → malicious dalam TTL → vonis kedua memakai konten lama (false-negative); gangguan sementara tampil sebagai "tidak terjangkau" selama 10 menit | Implementasi keputusan F-016 + H-CACHE-01..04 PASS di staging |
| U-51 | **F-017 — cache key mengabaikan cap: hasil 300 KB dipakai untuk permintaan 400 KB dan sebaliknya (v2.3.11 — BARU)** | Cacat kebenaran TERBUKTI di kode mirror commit `d85a1e2`: halaman `fetchText(..., 400_000)` (baris 396), script `fetchText(..., 300_000)` (baris 524); `fetchTextOnce` memotong SETELAH `res.text()` lalu hasil terpotong itu yang di-cache; key hanya URL. Keputusan desain v2.3.11 (§D.4.22): key WAJIB menyertakan cap. Belum diimplementasikan dan belum diuji (H-CACHE-05/06 spesifikasi staging) | Sinyal berbahaya setelah byte ke-300.000 tidak dianalisis (halaman memakai cache script); atau script menerima hasil melebihi cap yang diminta | Implementasi key cap-aware + H-CACHE-05/06 PASS di staging |
| U-52 | **F-018 — isolasi data antar-pengguna belum terbukti: skema tanpa owner + semantik tenancy ctx.db tidak dinyatakan SDK (v2.3.11 — BARU)** | Fakta skema TERBUKTI: `checks` tanpa kolom owner/principal; `savedProjects` PK `projectId` tanpa identitas pengguna; `listChecks`/`deleteCheck`/`askGibran` tanpa filter kepemilikan; `actions.ts` tidak pernah merujuk `ctx.viewer`. Bukti SDK read-only v2.3.11 (§D.4.22): `server-contract.d.ts` mendefinisikan `PortableCtx.db` + `viewer?: Viewer` (`ownerUserId`/`isOwner`) tetapi TIDAK menyatakan apakah DB per-user atau per-artifact/shared. Exploitability NOT VERIFIED | Bila DB shared per artifact: riwayat cek terbaca/dihapus lintas pengguna; bookmark/status menjadi state bersama; Gibran dapat memasukkan riwayat principal lain ke jawaban | Pernyataan resmi runtime provider tentang scope `ctx.db` + desain ownership (§D.4.22) + H-TEN-01..05 PASS di staging |
| U-53 | **F-019 — status Link Scanner nonaktif tidak memiliki bukti kontrol runtime (v2.3.11 — BARU)** | Bukti read-only 2026-11-08 ~02:47–02:50 WIB (§D.4.22): action `checklink` MASIH TERDAFTAR sebagai published action di artifact `cek-link-airdrop`; `artifact.status`: tidak ada build berjalan, `share.shared=false`, `share.url=null`; tidak ada versi/digest yang terekspos tool read-only; tidak ada feature flag/guard di mirror source. Status: NOT VERIFIED / BLOCKED | Scanner masih dapat dipanggil (jalur owner/agent) tanpa kontrol yang terbukti; klaim "nonaktif" hanya bersandar pada dokumen, bukan bukti runtime | Bukti versi/digest + kontrol disabled yang dapat diverifikasi (butir (a)–(e) §D.4.22); sampai ada, deployment BLOCKED |
| U-54 | **F-020 — scope perubahan source mirror tanpa artefak approval owner terpisah (v2.3.11 — BARU)** | Fakta TERBUKTI via git: commit `d85a1e2` mengubah 3 file source/dokumen (`site/server/src/actions.ts`, `site/client/src/App.tsx`, `docs/AUDIT_FIX_LIST_V1.md`); dasar otorisasi yang tercatat adalah arahan Rama 2026-11-08 ~02:11 WIB ("tingkatkan kualitas web") + konsolidasi 10 audit performa; TIDAK ADA artefak approval owner terpisah di repo. Pernyataan v2.3.10 "tidak ada kode aplikasi yang diubah" menjadi basi setelah commit ini. HOLD perubahan source lanjutan sampai klarifikasi owner (§D.4.22) | Perubahan source berikutnya dapat melampaui batas tahap (b) tanpa disadari; sejarah klaim menyesatkan bila tidak dikoreksi | Keputusan owner atas 3 pertanyaan scope (matriks v2.3.11 §6); HOLD tetap berlaku sampai ada jawaban tertulis |
| U-55 | **F-022 — cabang implementasi cache tidak dinyatakan eksplisit (v2.3.12 — BARU)** | Audit V5 benar: F-016 (hapus cache) dan F-017 (key wajib cap) tidak dinyatakan sebagai cabang saling eksklusif di v2.3.11. Keputusan v2.3.12 (§D.4.23): cabang pilihan = hapus cache fetch dari SEMUA jalur security-scan; F-017 + H-CACHE-05/06 NOT APPLICABLE untuk jalur itu pada cabang pilihan; cabang alternatif didokumentasikan lengkap (6 syarat). Belum diimplementasikan (tahap b + HOLD F-020) dan belum diuji | Implementasi kelak dapat mengirim cabang yang salah atau mengerjakan key cache yang tidak perlu setelah cache dihapus | Owner memilih cabang (G-F); implementasi + H-CACHE-01..04 PASS di staging |
| U-56 | **F-022 — oracle tes cap mengukur string, bukan byte (v2.3.12 — BARU)** | Cacat oracle TERBUKTI di kode mirror: `(await res.text()).slice(0, cap)` menghitung UTF-16 code unit setelah buffering penuh — nilai 300.000/400.000 TIDAK menegakkan byte cap. Koreksi v2.3.12 (§D.4.23): cap = raw bytes di lapisan stream; `res.text().slice()` BUKAN bukti byte cap; H-RES-02 (multibyte UTF-8), H-RES-03 (compressed/decompressed), H-RES-04 (redirect chains), H-RES-05 (aggregate per-scan limit) ditambahkan; H-RES-06 = total-deadline (penomoran ulang) | Tes ASCII saja dapat lolos sementara batas byte/resource yang sebenarnya gagal — false confidence pada F-002 | Implementasi streamed cap + H-RES-01..06 PASS di staging |
| U-57 | **F-021 — bukti artifact-state tidak dapat diaudit independen (v2.3.12 — BARU)** | Matriks v2.3.11 hanya merangkum hasil `list_actions`/`status` dalam prosa. Paket bukti dipublikasikan v2.3.12 (`evidence/f021-artifact-state-20261108/`, capture 2026-11-08 03:47 WIB, digest SHA-256 per respons). Tool/API version, request/response IDs, dan artifact version/digest TIDAK terekspos tool — dicatat NOT PROVIDED | Klaim tentang state live tidak dapat direproduksi independen; F-019 tetap tidak dapat ditutup dari paket ini | Jalur read-only baru yang mengekspos versi/digest, bila tersedia; sampai ada, F-019 tetap BLOCKED |
| U-58 | **F-018 — kutipan `.d.ts` SDK tidak ada di repo (v2.3.12 — BARU)** | Matriks v2.3.11 mendeskripsikan deklarasi SDK tanpa kutipan yang dapat diperiksa. Kutipan verbatim `PortableCtx`/`Viewer`/`LocalViewer`/`CloudflareViewer` kini dipublikasikan di matriks v2.3.12 §2 F-018 (tarball SHA-256 `f2cb7b25…`). Kutipan membuktikan permukaan API saja — TIDAK menyatakan scope DB; pernyataan resmi provider tetap belum ada; tenancy tetap NOT VERIFIED | Audit berikutnya tetap tidak dapat memastikan tenancy dari repo; risiko lintas-pengguna tidak dapat diputuskan | Pernyataan resmi runtime provider tentang scope `ctx.db` + H-TEN-01..05 PASS di staging |
| U-59 | **F-023 — fixture H-RES-02 mustahil: arah UTF-16-sebelum-UTF-8-byte tidak dapat dibuat (v2.3.13 — BARU)** | Audit V6 benar: string dengan >300.000 UTF-16 code unit tetapi <300.000 byte UTF-8 tidak dapat ada (byte ≥ code unit untuk setiap skalar valid). Arah mustahil DIHAPUS v2.3.13 (§D.4.24); tiga fixture feasible dipublikasikan (`evidence/f023-h-res02-fixtures/`: A 300.018 byte / 150.017 CU, B 300.020 / 150.018, C 300.019 / 100.017; marker pada offset byte 300.000) dengan hitungan diverifikasi dua alat independen + SHA-256 | Harness dapat diam-diam mengubah fixture, melemahkan assertion, atau mengklaim PASS atas kasus mustahil bila oracle tidak dikoreksi | Implementasi streamed cap + H-RES-02A/B/C PASS di staging |
| U-60 | **F-024 — lapisan byte H-RES-03 ambigu: wire vs decoded tidak dibedakan (v2.3.13 — BARU)** | Audit V6 benar: v2.3.12 tidak menyatakan lapisan mana yang di-cap. Koreksi v2.3.13 (§D.4.24): L0 wire TIDAK dapat diobservasi via `Response.body` (tanpa klaim cap aplikasi; pengganti egress limit infrastruktur, UNASSIGNED); L1 decoded-body ditegakkan (halaman 400.000, script 300.000, pre-append); L2 aggregate ditegakkan. Perilaku Bun TERBUKTI eksperimen VM lokal (`evidence/f024-h-res03-bun-fetch/`, Bun 1.4.4): gzip 551 byte wire → 500.000 byte `Response.body`; br 51 → 500.000; `Content-Length` DILARANG sebagai oracle | Tes dapat melaporkan respons terkompresi di bawah cap raw-byte sementara body terdekompresi jauh melampaui budget memori — false confidence pada F-002 | Implementasi streamed decoded-body cap + H-RES-03 PASS di staging; egress limit infrastruktur didefinisikan (G-E) |
| U-61 | **F-025 — aggregate H-RES-05 tanpa angka: harness tidak dapat memberi PASS/FAIL objektif (v2.3.13 — BARU)** | Audit V6 benar: v2.3.12 mensyaratkan aggregate limit tanpa angka. Koreksi v2.3.13 (§D.4.24): aggregate **1.000.000 decoded byte per scan**; max 3 script; overhead 0 (pre-append); redirect body di-cancel tanpa dibaca (0 byte); cakupan L2 = halaman + script; cancel concurrency-safe (check-and-reserve sinkron atomik, satu AbortController bersama, buang parsial, fail-closed, tanpa partial trusted verdict) | Fetch bersamaan masing-masing di bawah cap individual dapat melampaui budget per-scan tanpa terdeteksi — resource exhaustion tidak tertahan | Implementasi shared-budget + H-RES-05 (+ kontrol batas 1.000.000) PASS di staging |
| U-62 | **Bukti VM H-RES-03 memakai Bun 1.4.4, bukan kanonik 1.3.10 (v2.3.13 — BARU — DIPERSEMPIT v2.3.14)** | Eksperimen dekompresi `Response.body` (§D.4.24, F-024) dijalankan dengan Bun 1.4.4; versi kanonik yang dideklarasikan adalah 1.3.10 (`packageManager`). **BARU v2.3.14:** skrip F-024 dijalankan ulang TANPA perubahan di bawah Bun 1.3.10 — dekompresi transparan TERKONFIRMASI (gzip 551 byte wire → 500.000 byte decoded; br 51 → 500.000; marker offset 400.000; `evidence/f026-chunk-accounting/run-1310-gzip-rerun.txt` + `run-1310-br-rerun.txt`). Yang TETAP NOT VERIFIED: perilaku di runtime artifact staging/produksi dan `deflate`/`zstd`. | Bukti 1.4.4 dikutip sebagai bukti 1.3.10 → klaim H-RES-03 yang tidak berdasar pada runtime kanonik | Verifikasi ulang perilaku `Response.body` (gzip/br) di staging pada Bun 1.3.10 sebelum H-RES-03 dapat PASS; atau keputusan owner memilih 1.4.4 sebagai kanonik (G-G) |
| U-63 | **F-026 — transient chunk allocation tidak dibatasi pre-append accounting (v2.3.14 — BARU)** | Audit V7 benar: chunk sudah teralokasi saat `reader.read()` mengembalikannya, sebelum aplikasi memeriksa panjangnya. Eksperimen VM v2.3.14 (`evidence/f026-chunk-accounting/`, Bun 1.3.10 DAN 1.4.4): max chunk teramati 528.384 byte (1.3.10, body 1.000.000) dan satu chunk 500.000 byte = seluruh body (1.3.10, meski server enqueue 64 KiB); chunk tidak deterministik antar run/versi. Klaim "overhead 0 byte" v2.3.13 DICABUT sebagai pernyataan umum — dibatasi hanya pada accepted/retained bytes (A1, terbukti ≤ cap). Anggaran A2 (transient/in-flight) worst-case = seluruh body per chunk; tidak ada angka A2 yang dijamin tanpa batas chunk runtime / BYOB / limit proses. BYOB NOT VERIFIED. | Peak memory proses dapat jauh melampaui budget L2 1.000.000 byte bila beberapa chunk besar mendarat sebelum abort bersama diproses | Batas chunk runtime / BYOB dibuktikan di staging Bun 1.3.10, ATAU limit proses/cgroup + pengukuran high-water RSS pada concurrency maksimum (H-RES-03/05 diperbarui, gate G-I) |
| U-64 | **F-027 — L2 bukan batas peak memory: salinan string turunan (v2.3.14 — BARU — DIPERBARUI v2.3.15)** | Audit V7 benar: L2 hanya menghitung decoded-body bytes; source (`actions.ts:520-533`) membentuk `join` + `haystack` + `lower` yang hidup bersamaan. Eksperimen VM v2.3.14 (`evidence/f027-derived-strings/`): pada input batas 1.000.000 karakter, karakter hidup 3.599.936 = 3,60× input; peak RSS +4,98× input (1.3.10) / +4,33× (1.4.4); peak heapUsed +3,61× (1.4.4). L2 DINYATAKAN sebagai input-body budget. Aturan baru: LARANGAN materialisasi bersamaan + pemindaian incremental (alternatif terukur ~4,5–5,4× lebih hemat; tetap mendeteksi sinyal pada kasus uji). `heapUsed` pada 1.3.10 tidak bergerak — ambang acceptance wajib memakai RSS + external per versi runtime. **DIPERBARUI v2.3.15 (F-029): angka ~4,5–5,4× TIDAK TERKONFIRMASI dan DICABUT sebagai klaim kuantitatif — eksperimen terkoreksi `evidence/f029-memory-methodology/` (proses terpisah + VmHWM, median 5 run) memberi rasio A/B 1,18–1,88× (forced-GC 1,57–1,88×; natural-GC 1,18–1,32×). Aturan desain (larangan materialisasi + incremental) TETAP berlaku; karakter hidup 3,60× dipertahankan hanya sebagai character accounting.** | Scan pada budget penuh memakai ~4–5× memori dari angka L2; ambang berbasis `heapUsed` saja memberi false confidence pada 1.3.10 | Implementasi pemindaian incremental + stress test H-RES-05 diperbarui (fixture batas + varian non-ASCII byte-matched, high-water RSS/VmHWM ≤ ambang pra-tes, kedua mode GC dilaporkan terpisah) PASS di staging (gate G-I) |
| U-65 | **F-028 — provenance deployment live tidak dapat diaudit (v2.3.14 — BARU)** | Audit V7 benar: klaim "live sudah v15, d85a1e2 disetujui Rama 2026-11-08 ~02:09 WIB" tidak disertai deployment manifest, artifact digest, release/workflow ID, atau approval artifact yang dapat diaudit. Status LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan v2.3.14). Template manifest non-secret dipublikasikan (`DEPLOYMENT_MANIFEST_TEMPLATE.md`) — manifest itu sendiri tetap KOSONG sampai operator menyediakannya. | Auditor tidak dapat menentukan source commit yang benar-benar berjalan di live, waktu penerapannya, atau bukti otorisasi; status ini tidak boleh dipakai sebagai dasar menyetujui deployment lain | Operator + owner menyediakan manifest terisi per deployment (field 2, 4, 6, 8, 12 minimal); sampai ada, jangan simpulkan versi live |
| U-66 | **Lockfile v2 tidak dapat dibaca Bun kanonik 1.3.10 — frozen install gagal (v2.3.14 — BARU — DIPERBARUI v2.3.15)** | Bukti VM v2.3.14 (`evidence/f009-bun1310-install-typecheck/`, salinan scratch): `bun install --frozen-lockfile` pada Bun 1.3.10 GAGAL exit 1 — `Unknown lockfile version` (`bun.lock` ter-commit memakai `"lockfileVersion": 2`). Install non-frozen berhasil (79 paket) tetapi menulis ulang lockfile ke v1 di scratch; typecheck exit 0 hanya berlaku terhadap lockfile hasil regenerasi itu. Kanonik 1.3.10 dan lockfile ter-commit tidak kompatibel; F-009 tetap NOT REPRODUCIBLE untuk clean external builder. Absolute local SDK path (`file:/opt/hatch/...`) tetap blocker clean-builder terpisah. **DIPERBARUI v2.3.15 (F-030): matriks kompatibilitas `evidence/f030-bun-compatibility/` — Bun 1.4.4 MENERIMA lockfile v2 (frozen install exit 0, 79 paket, lockfile tidak berubah; typecheck exit 0 terhadap lockfile ter-commit); clean external builder tanpa `/opt/hatch` tetap TIDAK DAPAT install pada versi Bun mana pun (SDK path absolut); trade-off Opsi A (naikkan kanonik ke 1.4.4) vs Opsi B (regenerasi lockfile v1) + penggantian SDK path dirumuskan — keduanya PROPOSAL, HOLD sampai otorisasi tahap (b).** | Clean builder pada 1.3.10 tidak dapat mereproduksi install; klaim reproduksibilitas berbasis bukti 1.4.4 tidak berlaku untuk kanonik | Keputusan owner G-G: (a) adopsi Bun lebih baru sebagai kanonik, ATAU (b) regenerasi lockfile di bawah 1.3.10 + verifikasi ulang resolusi — keduanya perubahan source, butuh otorisasi tahap (b); rencana penggantian SDK path di §D.4.25 + matriks/trade-off di §D.4.26 (gate G-J) |
| U-67 | **F-029 — rasio penghematan incremental v2.3.14 tidak valid; manfaat terkoreksi bergantung GC (v2.3.15 — BARU — DIPERBARUI v2.3.16 — DIPERBARUI v2.3.17)** | Audit V8 benar: perbandingan A/B v2.3.14 satu proses dengan baseline B tercemar; rasio 4,5–5,4× tidak didukung. Eksperimen terkoreksi v2.3.15 (`evidence/f029-memory-methodology/` — proses terpisah + VmHWM, 5 run/kombinasi, median + rentang, Bun 1.3.10 DAN 1.4.4, fixture non-ASCII char-matched + byte-matched): rasio A/B **1,18–1,88×** (forced-GC 1,57–1,88×; natural-GC 1,18–1,32×). Rasio lama DICABUT sebagai klaim kuantitatif (NOT VERIFIED). Manfaat incremental nyata tetapi lebih kecil dan bergantung pada GC benar-benar mereklamasi segmen yang dilepas. **DIPERBARUI v2.3.16 (F-031): rerun dengan fixture exact-byte memberi rasio 1,13–1,84× (median VmHWM) — forced-GC 1,51–1,84×, natural-GC 1,13–1,28×; rentang 1,18–1,88× dinyatakan SUPERSEDED (tidak direproduksi eksak); pola B tetap lebih rendah dari pola A pada semua 12 kombinasi di kedua versi; karakter hidup 3,60× dipertahankan sebagai character accounting.** | Keputusan sizing/cgroup/acceptance dapat didasarkan pada rasio yang terlalu optimistis bila angka lama dipakai; angka forced-GC disalahartikan sebagai perilaku runtime natural | Jangan pakai angka 4,5–5,4× untuk kapasitas apa pun; H-RES-05 staging memakai high-water RSS/VmHWM ≤ ambang pra-tes pada kedua mode GC (gate G-I); rasio 1,13–1,84× sendiri BUKAN acceptance staging — hanya bukti VM. **DIPERBARUI v2.3.17 (F-033): rerun de-confounded memberi rasio 1,12–2,62× (median VmHWM) — forced-GC 1,69–2,62×, natural-GC 1,12–1,30×; rentang 1,13–1,84× dinyatakan SUPERSEDED (instrumen terkonfounded); hipotesis arah V10 tidak terkonfirmasi pada sel forced-GC; rasio tetap BUKAN acceptance staging.** |
| U-68 | **F-030 — lockfile v2 vs Bun kanonik + SDK path absolut: keputusan reproduksibilitas belum ada (v2.3.15 — BARU — DIPERBARUI v2.3.16)** | Audit V8 benar: `packageManager` bun@1.3.10 vs lockfile v2 tidak kompatibel (frozen install gagal, log F-009); SDK path absolut `file:/opt/hatch/...` tidak ada pada clean builder. Matriks v2.3.15 (`evidence/f030-bun-compatibility/`): 1.4.4 menerima lockfile v2 (frozen install + typecheck exit 0, log baru); clean builder tetap gagal pada kedua versi karena SDK path; versi Bun minimum yang menerima lockfile v2 NOT VERIFIED; build penuh NOT RUN pada kedua versi; dependency digest NOT VERIFIED. Opsi A vs Opsi B + penggantian SDK path dirumuskan sebagai PROPOSAL — HOLD. **DIPERBARUI v2.3.16: proposal keputusan DISELESAIKAN sebagai paket yang dapat diputuskan (§D.4.27) — rekomendasi utama Opsi A (Bun kanonik 1.4.4) + SDK vendorkan berdigest, fallback Opsi B (regenerasi lockfile v1); provenance/digest yang dibutuhkan, prasyarat clean-builder, rollback, dan dampak bukti runtime dirumuskan; digest rilis Bun 1.4.4 dan atestasi provider atas SDK tetap NOT PROVIDED (tidak dikarang); TIDAK ADA perubahan file; F-030 tetap CONFIRMED BLOCKER, F-009 tetap NOT REPRODUCIBLE.** | Clean builder/CI tidak dapat mereproduksi install dari pohon ter-commit; artifact yang dibangun tidak dapat dibuktikan berasal dari dependency graph yang disetujui; keputusan yang tertunda memblokir reproducible build | Keputusan owner G-G (Opsi A vs B) + penggantian SDK path + bukti clean-builder (frozen install + typecheck exit 0, lockfile tidak berubah, digest tercatat, tanpa `/opt/hatch`) — gate G-J; sampai selesai, F-009 tetap NOT REPRODUCIBLE dan F-030 tetap CONFIRMED BLOCKER |
| U-69 | **F-031 — klaim batas byte fixture F-029 tidak tepat; rasio v2.3.15 superseded (v2.3.16 — BARU)** | Audit V9 benar: fixture v2.3.15 mengurangi filler 40/20 karakter padahal marker ASCII 33/15/13 byte — ASCII terukur 999.981 byte, non-ASCII byte-matched 999.901 byte (99 byte di bawah L2), non-ASCII char-matched 1.999.901 byte (bukan ~2.000.000). H-RES-05 tidak boleh memakai fixture itu sebagai bukti byte-boundary. **DIPERBAIKI v2.3.16:** `exp-pattern.ts` mengukur tiap segmen dengan TextEncoder, filler dari panjang marker terukur, assert total sebelum scan; ASCII dan non-ASCII byte-matched kini TEPAT 1.000.000 byte; varian cap−1/cap+1 terukur (999.999/1.000.001); rerun penuh 120 run anak, 0 gagal; rasio terukur ulang 1,13–1,84× — rentang 1,18–1,88× v2.3.15 dinyatakan SUPERSEDED. | Fixture yang tidak tepat batas dapat membuat H-RES-05 staging menguji kasus yang salah (di bawah cap) dan mengklaim lolos batas yang tidak pernah diuji | Pakai fixture v2.3.16 (exact-byte, cap/cap−1/cap+1) untuk H-RES-05 staging (gate G-I); jangan kutip angka v2.3.15 sebagai pengukuran batas eksak |
| U-70 | **F-032 — parent harness F-029 dapat melaporkan sukses dengan nol run (v2.3.16 — BARU)** | Audit V9 benar: `run-f029.ts` v2.3.15 mem-parsing `--runs` tanpa validasi — nilai 0/non-numerik menghasilkan nol child run tetapi parent mencetak "all child runs ok" dan keluar 0 (false green). Log v2.3.15 sendiri tetap valid (60 RESULT, 60 PID unik per versi — F-032 tidak membatalkannya). **DIPERBAIKI v2.3.16:** `--runs` wajib integer 1..10; assertion jumlah record + validasi RESULT + timeout child 120 detik; tes regresi negatif 7 kasus exit 2 tanpa mencetak sukses (log `run-f032-negative.txt`); kontrol positif `--runs 1` exit 0. Jalur timeout end-to-end dengan child yang sengaja menggantung TIDAK diuji (mekanisme `spawnSync` `ETIMEDOUT` diverifikasi terpisah). **DIPERBARUI v2.3.17: jalur timeout TERBUKTI end-to-end — child dummy `hang-child.ts` + driver `run-f032-timeout-e2e.ts`: 12 child gantung timeout, ke-12 PID terverifikasi mati, 0 record, `parent done: FAILED`, exit 1, tanpa success line (11 assert PASS, log `run-f032-timeout-e2e.txt`); tes regresi negatif diulang pada harness baru (log `run-f032-negative-v2317.txt`). Sisa risiko kini adalah test seam (U-72).** | Pemakaian ulang harness sebagai oracle penerimaan dapat menghasilkan artefak kosong/parsial yang tampak sukses | Pakai harness v2.3.16 untuk rerun apa pun; rerun lama v2.3.15 tidak perlu diulang (log-nya sudah terverifikasi berisi data). **DIPERBARUI v2.3.17: pakai harness v2.3.17 (preflight gate + validasi `encoderInMeasuredPhase`) untuk rerun apa pun; log v2.3.16 dipertahankan sebagai bukti historis.** **DIPERBARUI v2.3.18: jalur timeout kini teruji dengan oracle terminasi KETAT (hanya ESRCH = mati; EPERM = hidup; starttime `/proc` untuk identitas PID — F-034) + direktori PID privat per-run (F-035); klaim terminasi yang mengikat bersandar pada log `run-f032-timeout-e2e-v2318.txt` (12 PID mati via ESRCH, 12 == 12 diluncurkan). Sisa risiko kini adalah seam yang diperketat (U-72).** |
| U-71 | **F-033 — instrumen pengukuran A/B terkonfounded; rasio v2.3.16 superseded (v2.3.17 — BARU)** | Audit V10 benar: `TextEncoder.encode(segment)` di dalam fase ukur mengalokasikan Uint8Array sementara sebesar segmen; pola A membangun 3 segmen sebelum GC pertama sementara pola B GC setelah tiap segmen; `segLower` pola B hidup melewati forced GC; VmHWM monotonik menyimpan semua transient peak. **DIPERBAIKI v2.3.17:** TextEncoder dikeluarkan dari measured process (byte aritmetik via `fixture.ts`); preflight terpisah 61 checks sebagai bukti byte independen; lifecycle pola B eksplisit via helper `scanSegment()` scope tertutup + 90 baris log `B gc after segment` per run; parent meng-assert `encoderInMeasuredPhase === false` per RESULT; rerun penuh 120 run anak memberi rasio 1,12–2,62× — rentang 1,13–1,84× v2.3.16 dinyatakan SUPERSEDED. **Hipotesis arah V10 TIDAK terkonfirmasi pada sel forced-GC:** rasio naik (bukan turun) karena confound `segLower` lebih besar daripada transient encoder; pada sel natural-GC rasio hampir tidak bergerak (1,13–1,28× → 1,12–1,30×). | Rasio lama yang terkonfounded dipakai sebagai dasar sizing/cgroup/acceptance staging; arah bias disalahpahami (dikira melebih-lebihkan manfaat, padahal neto sebaliknya pada sel forced-GC) | Jangan kutip rasio 1,13–1,84× untuk kapasitas apa pun; rasio 1,12–2,62× tetap HANYA bukti VM — status angka operasional tetap NOT VERIFIED sampai review independen atas paket v2.3.17; H-RES-05 staging memakai ambang pra-tes + kedua mode GC (gate G-I) |
| U-72 | **F-032 — test seam harness sebagai permukaan override baru (v2.3.17 — BARU)** | `run-f029.ts` v2.3.17 menambah env var test-only `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` untuk uji E2E timeout. Seseorang dapat menjalankan harness dengan seam aktif (child dummy / timeout pendek) lalu mengira outputnya run produksi — atau sebaliknya, mengklaim run produksi padahal child-nya diganti. | Bukti run tercemar diam-diam: log uji disajikan sebagai bukti produksi, atau run produksi yang sebenarnya memakai child pengganti | Seam TIDAK mengubah perilaku default (tanpa env var: script `exp-pattern.ts`, timeout 120.000 ms); bila aktif, parent mencetak baris `test-seam:` eksplisit di log; reviewer WAJIB memeriksa ada/tidaknya baris itu sebelum menerima log sebagai bukti produksi; seam hanya dipakai oleh driver E2E yang terdokumentasi. **DIPERBARUI v2.3.18 (U-72 diperketat): override kini hanya dihormati bila `F029_TEST_MODE=1` eksplisit; script child harus realpath ke fixture yang disetujui (`exp-pattern.ts` atau `hang-child.ts`); path yang diberikan tidak boleh berupa symlink; selain itu exit 2 sebelum child mana pun di-spawn (tes regresi `test-u72-seam.ts`, 15 assert PASS). Sisa risiko: operator yang SENGAJA menyetel `F029_TEST_MODE=1` dengan fixture yang disetujui lalu mengklaim run itu sebagai run produksi — dimitigasi baris log `test-seam:` eksplisit + reviewer wajib memeriksanya.** |
| U-73 | **F-034 — oracle terminasi PID menerima semua exception sebagai "mati" (v2.3.18 — BARU)** | Audit V11 benar: driver E2E v2.3.17 memakai `catch { stillAlive = false; }` pada `process.kill(pid, 0)` tanpa memeriksa `error.code`, dan mem-parsing baris PID dengan `Number(...)` tanpa validasi — EPERM (proses hidup tetapi tidak bisa di-signal), EINVAL, atau PID malformed dapat false-pass assertion "semua child terminated". **DIPERBAIKI v2.3.18:** modul baru `pid-oracle.ts` — hanya ESRCH = mati; EPERM = hidup (FAIL); EINVAL/lainnya = inconclusive (FAIL); file PID di-parse ketat (`"<pid> <starttime>"`, positive safe integer, tanpa duplikat); identitas PID diverifikasi via starttime field 22 `/proc/<pid>/stat` (cocok = hidup; berbeda = PID dipakai ulang; Z/X = mati). Tes regresi `test-pid-oracle.ts` (30 assert PASS, log `test-pid-oracle-v2318.txt`): stub injeksi membuktikan EPERM/EINVAL tidak bisa PASS; proses hidup nyata membuktikan alive→SIGKILL terkontrol→dead. **Catatan jujur:** VM ini berjalan sebagai root sehingga EPERM hidup tidak dapat diproduksi di sini — aturan EPERM→FAIL dibuktikan stub, bukan proses hidup. | Klaim "semua child mati" yang bersandar pada oracle lama dapat false-pass bila pemeriksaan signal mengembalikan EPERM/EINVAL atau PID file malformed | Pakai oracle ketat `pid-oracle.ts` untuk semua klaim terminasi; log E2E v2.3.17 dipertahankan sebagai bukti historis, klaim yang mengikat bersandar pada log v2.3.18 |
| U-74 | **F-035 — file PID E2E memakai path tetap di /tmp, rentan symlink/TOCTOU + concurrency (v2.3.18 — BARU)** | Audit V11 benar: driver v2.3.17 memakai `/tmp/f032-hang-child.pid` (cek lalu hapus, child `appendFileSync` mengikuti symlink) — pada host multi-user, symlink dapat ditanam di celah waktu setelah unlink dan sebelum child membuka file; dua invocation paralel dapat saling menghapus/mencampur PID. **DIPERBAIKI v2.3.18:** direktori privat per-run via `mkdtemp` (mode 0700, realpath + kepemilikan divalidasi) + file PID eksklusif (`openSync "wx"`, mode 0600, fstat-validated) + validasi `lstat` di child (file regular, bukan symlink, uid sama, mode 0600) + cleanup di `finally`. Tes regresi `test-f035-pidfile.ts` (25 assert PASS, log `test-f035-pidfile-v2318.txt`): symlink di path lama tidak pernah diikuti (sentinel byte-identik), dua driver paralel memakai direktori berbeda dengan set PID disjoint, cleanup terverifikasi. | PID file menunjuk target yang dikontrol pihak lain, atau dua run mencampur PID sehingga klaim terminasi didasarkan pada PID run lain | Pakai direktori privat per-run + file eksklusif untuk semua pengujian harness; jangan pernah memakai path tetap di direktori bersama |
| U-75 | **F-036 — parser PID menerima starttime 0 (v2.3.19 — BARU)** | Audit V12 benar: parser v2.3.18 memeriksa `starttime < 0`, bukan `<= 0` — record `<pid> 0` diterima dan `classifyLiveness()` dapat mengembalikan "dead" untuk child yang masih hidup (false-pass assertion terminasi). **DIPERBAIKI v2.3.19:** tolak `starttime <= 0` di `parsePidFile()` + `parseProcStat()`; validasi input di `classifyLiveness()` (invalid → inconclusive, tidak pernah dead); helper `verifyPidFile()` gagal-cepat seluruh file bila ada parse error (tidak ada liveness atas record parsial); driver E2E memakai `verifyPidFile()`. Tes regresi `test-pid-oracle.ts` (50 assert PASS, log `test-pid-oracle-v2319.txt`, uid 65534). | Record PID korup/dimodifikasi dengan starttime 0 dapat membuat oracle menganggap child hidup sebagai mati | Pakai oracle + parser v2.3.19 untuk semua klaim terminasi; jangan pernah menerima starttime 0 |
| U-76 | **F-037 — tes regresi memakai path tetap di /tmp (v2.3.19 — BARU)** | Audit V12 benar: tes v2.3.18 memakai path tetap `/tmp/u72-*` dan `/tmp/f032-hang-child.pid` dengan `writeFileSync` (truncate/follow) + `rmSync` tanpa verifikasi kepemilikan — pada host bersama dapat menimpa target symlink atau menghapus file asing; run sebagai root memperbesar dampak. **DIPERBAIKI v2.3.19:** kedua file tes ditulis ulang — direktori privat per-run (`mkdtemp`, 0700) + exclusive create (`openSync "wx"`, 0600) + fail-safe bila path legacy sudah ada + cleanup terverifikasi (dev,ino); kedua tes menolak berjalan sebagai root. Tes regresi `test-f035-pidfile.ts` (59 assert PASS, log `test-f035-pidfile-v2319.txt`, uid 65534) + `test-u72-seam.ts` (25 assert PASS, log `test-u72-seam-v2319.txt`, uid 65534). | Tes regresi merusak file asing / mengikuti symlink pada host bersama | Pakai direktori privat + exclusive create + fail-safe untuk semua pengujian harness; jangan pernah memakai path tetap di direktori bersama; jangan jalankan tes sebagai root |
| U-77 | **F-035 — asumsi trust boundary UID-sama (v2.3.19 — BARU, asumsi yang diterima)** | Proses tidak tepercaya dengan UID YANG SAMA dinyatakan eksplisit DI LUAR threat model harness: (1) harness single-user satu UID oleh desain; (2) proses same-UID sudah dapat ptrace/signal/mem-baca driver — tidak ada cek level-file yang dapat mengisolasi terhadap same-UID; (3) direktori run 0700 sudah mengecualikan UID lain; (4) child adalah kode TEPERCAYA (seam U-72). **Penjepitan fd diterapkan sebagai defense-in-depth:** child writer kini open `O_NOFOLLOW` + verifikasi `fstat` pada descriptor + pin (dev,ino) — menutup jendela TOCTOU untuk swap path yang tidak disengaja / stale. | Bila harness kelak jalan di host bersama dengan same-UID tak tepercaya, asumsi ini tidak lagi berlaku dan file PID dapat dialihkan | Tinjau ulang asumsi ini sebelum menjalankan harness di host bersama (pemisahan UID per proses / supervisor pemilik file PID); sampai saat itu, catat sebagai asumsi yang diterima, bukan sebagai temuan yang ditutup |

## H. Rencana pengujian dan rollback FINAL (v2)

### H.1 Urutan pengujian (gerbang berurutan — tidak ada yang dilewati)

| Gerbang | Isi | Kriteria lolos | Bila gagal |
| --- | --- | --- | --- |
| G0 — Mitigasi aktif + bukti (§D.6 v2.2) | Flag mitigasi (a) aktif; `checkLink` menolak semua URL arbitrer dengan pesan jeda; katalog/dashboard/Gibran tetap jalan; **seluruh butir bukti G0-E1..G0-E5 terkumpul dan terverifikasi** | Semua URL arbitrer ditolak SEBELUM koneksi keluar (log egress 0 koneksi); tidak ada jalur cron yang melewati mitigasi; bukti G0-E1..G0-E5 lengkap | Perbaiki flag / tutup jalur bypass sebelum lanjut; G0 tidak lolos bila satu butir bukti tidak ada |
| G1 — Unit guard | Uji unit `ssrf-guard.ts` (25 kasus lama + kasus baru §C.2 P0-1b) | Semua lolos | Perbaiki guard; jangan lanjut ke integrasi |
| G2 — Spike staging produksi (U-1) | Uji pinning di staging artifact: Pendekatan 1 (atau fallback Pendekatan 2) terbukti dengan DNS uji yang membalik jawaban | Koneksi tetap ke IP pertama yang divalidasi; sertifikat mismatch ditolak | Ikuti alternatif §A.2a; rancangan direvisi |
| G3 — Regresi 3 URL acuan | `scamsem.solbarn.cc` → BAHAYA 100; `binance.com` → LEBIH AMAN; `ptah.trade/poa` → WASPADA (toleransi skor ±5) | Vonis sama | Hentikan; diskusikan (jangan sesuaikan ambang diam-diam) |
| G4 — Uji blokir S-01..S-50 | Semua ditolak SEBELUM fetch; server uji menerima 0 koneksi (termasuk S-44..S-48 NAT64 v2.1 dan S-49/S-50 NSP staging v2.2) | 50/50 ditolak | Perbaiki titik yang lolos; uji ulang dari G3 |
| G5 — Uji legit L-01..L-08 | Semua lolos | 8/8 lolos | Perbaiki false positive; uji ulang dari G3 |
| G6 — Uji sumber daya R-01..R-15 + matcher RDAP RD-01..RD-20 + semaphore SEM-01..SEM-06 + lease LSE-01..LSE-06 (v2.2) + orphaned/breaker/worker ORPH-01..ORPH-06 (v2.3) + konfirmasi terminasi TERM-01..TERM-04 + parent crash PARENT-01..PARENT-02 + rekonsiliasi RECON-01 + supervisor SUP-01 (v2.3.1) + aturan startup STARTUP-01..STARTUP-10 (v2.3.2) + reklamasi yang diperkeras RCL-01..RCL-06 + reklamasi bersamaan SU10-T1/T2 + durabilitas pidfile D-01..D-03 (v2.3.3) + uji adversarial reklamasi lock ADV-01..ADV-06 + semantik flock FLK-01..FLK-07 (v2.3.4) + otoritas flock & mixed-version AUTH-01..AUTH-16 (v2.3.5) + pidfd & jendela reuse PIDFD-01..PIDFD-08 + kontrol operasional OPS-01..OPS-03 + matriks prasyarat staging STAGE-P01..P12 (v2.3.6) | Timeout global, bombe dekompresi (jalur Node Agent), abort per tahap, rate limit multi-instance, anti-spoofing, konkurensi global (R-14), matcher RDAP 20/20, **siklus hidup semaphore DNS (SEM-01..SEM-06), atomicity lease global termasuk PostgreSQL di staging (LSE-01..LSE-06), uji beban konkurensi ratusan instance (R-15), penghitung orphaned + circuit breaker + pemulihan worker (ORPH-01..ORPH-06, termasuk pengulangan SEM-01..SEM-06 setelah perubahan), konfirmasi terminasi worker (TERM-01..TERM-04), crash/restart parent dan pemulihan state (PARENT-01..PARENT-02), pengulangan + rekonsiliasi SEM-R1..R6 + ORPH-T0..T5 (RECON-01), dokumentasi supervisor platform (SUP-01), aturan startup NOT_READY + validasi identitas PID + pidfile atomik + startup lock (STARTUP-01..STARTUP-09), reklamasi lock basi bersamaan di VM ini (STARTUP-10), reklamasi yang diperkeras — heartbeat bukan bukti kematian, EPERM/tidak-pasti → fail-closed, lock tak terbaca tidak pernah dihapus otomatis (RCL-01..RCL-06), durabilitas pidfile pada filesystem produksi (D-01..D-03), race reklamasi lock TERBUKTI pada kode v2.3.3 dan perbaikan flock TERUJI (ADV-01..ADV-06: ADV-T1 2 pemilik 2/2, ADV-T2/T2sim/T5/T6 4/4 × 2), semantik flock kernel pada tmpfs dan overlay (FLK-01..FLK-05: 9/9 × 2 tiap fs), binding flock + flock di NFS wajib dibuktikan di staging (FLK-06/FLK-07), otoritas flock + mixed-version + zombie liveness (AUTH-01..AUTH-16: 18/18 × 2; AUTH-T9c NOT RUN — lihat §D.4.13), SU-T1..SU-T9 re-run v2.3.6: 9/9 × 4 (AUTH-16) [koreksi v2.3.8: 3 log lengkap + 1 ekor — lihat §D.4.17; suplemen v2.3.9: 4 run lengkap + OPS-T7 run ke-3 — lihat §D.4.20], pensinyalan terikat identitas via pidfd + kuantifikasi jendela reuse + falsifikasi dirfd pinning (PIDFD-01..PIDFD-08: PIDFD-T1..T12 + OPS-T1..T7 — lihat §D.4.14), kontrol operasional lock + pemulihan penghapusan (OPS-01..OPS-03), prasyarat staging STAGE-P01..P12 dengan kriteria PASS/FAIL (lihat §D.4.15), rekonsiliasi bukti v2.3.7 — matriks ST-01..ST-12, SU-T1..SU-T9 9/9 TERBUKTI (VM), penomoran kanonik ST-01..ST-16 (lihat §D.4.16 dan `SSRF_RECONCILIATION_V237.md`), matriks respons v2.3.8 atas audit kode V1+V2 — F-001..F-009, desain remediasi + harness H-SSRF-01..20, definisi lengkap U-46, inventaris staging ST-01..ST-16 (lihat §D.4.17, §D.4.18, §D.4.19 dan `SSRF_RESPONSE_MATRIX_V238.md`), matriks respons v2.3.10 atas audit V3 — F-010..F-015, koreksi akuntansi bukti SU + checker manifest, pemisahan F-006a/b/c, kepemilikan staging ST-01..ST-16 (lihat §D.4.21 dan `SSRF_RESPONSE_MATRIX_V2310.md`), matriks respons v2.3.11 atas audit V4 — F-016..F-020, keputusan freshness cache + cap-aware cache key, bukti tenancy SDK, bukti runtime scanner, klarifikasi scope d85a1e2 (lihat §D.4.22 dan `SSRF_RESPONSE_MATRIX_V2311.md`), regresi cache H-CACHE-01..06 + isolasi tenancy H-TEN-01..05 (v2.3.11, §D.4.22), matriks respons v2.3.12 atas audit V5 — F-021, F-022, cabang cache eksplisit (H-CACHE-05/06 NOT APPLICABLE pada cabang pilihan), oracle byte cap yang dikoreksi H-RES-01..06 (multibyte UTF-8, compressed/decompressed, redirect chains, aggregate per-scan limit), kutipan `.d.ts` minimal, paket bukti artifact F-021, kriteria latensi alert ST-12-LAT-01..03 (lihat §D.4.23 dan `SSRF_RESPONSE_MATRIX_V2312.md`), matriks respons v2.3.13 atas audit V6 — F-023, F-024, F-025, koreksi oracle H-RES-02/03/05 (fixture feasible terverifikasi, tiga lapisan byte terpisah + bukti eksperimen VM perilaku Bun, angka aggregate 1.000.000 byte + cancel concurrency-safe), klarifikasi semantik kepemilikan G-F, koreksi catatan "live untouched" (live sudah v15, d85a1e2, disetujui Rama 2026-11-08 ~02:09 WIB), risiko baru U-59..U-62, gate baru G-H (lihat §D.4.24 dan `SSRF_RESPONSE_MATRIX_V2313.md`), matriks respons v2.3.14 atas audit V7 — F-026, F-027, F-028, semantik budget memori yang dijujurkan (anggaran A1/A2, klaim "overhead 0 byte" dibatasi pada accumulator), L2 sebagai input-body budget + larangan materialisasi bersamaan + pemindaian incremental, LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED + template manifest deployment, bukti Bun 1.3.10 (dekompresi terkonfirmasi; frozen install gagal karena lockfile v2), risiko baru U-63..U-66, gate baru G-I (lihat §D.4.25 dan `SSRF_RESPONSE_MATRIX_V2314.md`), matriks respons v2.3.15 atas audit V8 — F-029, F-030, metodologi perbandingan memori yang diperbaiki (proses terpisah + VmHWM, rasio terkoreksi 1,18–1,88×, klaim 4,5–5,4× dicabut sebagai klaim kuantitatif), matriks kompatibilitas Bun/lockfile/SDK path + trade-off Opsi A vs Opsi B (keduanya PROPOSAL — HOLD), F-028/F-019 dipertahankan, prasyarat/prosedur/oracle/bukti STAGE-P01..P12 dilengkapi tanpa mengarang owner, risiko baru U-67/U-68, U-64/U-66 diperbarui, gate baru G-J (lihat §D.4.26 dan `SSRF_RESPONSE_MATRIX_V2315.md`)** | Semua dalam batas | Perbaiki; uji ulang dari G3 |
| G7 — Uji akhir + evaluasi ChatGPT | Seluruh hasil G0–G6 + dokumen v2.3.7 dievaluasi ChatGPT. **Catatan v2.3.7:** evaluasi atas v2.3.6 (`SSRF_EVALUATION_V235.md`) ditulis TANPA membaca bukti v2.3.6 — status NOT RUN-nya sudah dikoreksi oleh `SSRF_RECONCILIATION_V237.md`. Re-evaluasi WAJIB membaca `SSRF_SPIKE_V236.md` dan `SSRF_RECONCILIATION_V237.md` sebelum menyatakan satu pun tes "belum dijalankan". **Catatan v2.3.8:** evaluasi berikutnya WAJIB membaca `SSRF_RESPONSE_MATRIX_V238.md`, `evidence/v236/MANIFEST.md` (+ 21 file bukti), dan `SSRF_REPRODUCIBILITY_V238.md` — dan memverifikasi F-001..F-005 tetap OPEN/blocked sampai implementasi tahap (b) + harness staging PASS; F-007 dibaca dengan caveat su-run4/OPS-T7; F-008 dibaca dengan koreksi SU-T5 | Tidak ada keberatan P0 yang belum dijawab | Jawab keberatan; uji ulang yang terdampak |
| G8 — Cutover | Persetujuan eksplisit pemilik + ChatGPT; mitigasi (a) dicabut; scanner dibuka kembali | Semua gerbang G0–G7 lolos + tanda tangan di §D.5 v2 | Scanner TETAP nonaktif; lanjutkan perbaikan |

### H.2 Perintah dan bukti pengujian

Setiap gerbang menghasilkan laporan tertulis berisi: input, hasil yang
diharapkan, hasil aktual, dan bukti (log server uji / respons / tangkapan
status). Bukti yang diterima: log server uji yang menunjukkan 0 koneksi
untuk uji blokir; respons HTTP + body untuk uji legit; pengukuran waktu
dan memori untuk uji sumber daya. Bukti yang TIDAK diterima: "kode guard
sudah ada di file" tanpa uji perilaku; hasil uji yang hanya menguji 3 URL
acuan tanpa uji blokir.

### H.3 Rollback final (per langkah, sesuai §D.5 v2)

1. Setiap langkah = satu build terpisah; rollback = restore versi build
   sebelumnya yang lolos uji.
2. Bila suatu gerbang gagal, rollback langkah yang menyebabkannya saja —
   langkah sebelumnya yang sudah lolos tidak ikut di-rollback.
3. Rollback mitigasi (a) HANYA oleh keputusan pemilik setelah G8 lolos.
4. Bila cutover sudah terjadi dan regresi ditemukan di produksi:
   aktifkan kembali flag mitigasi (a) SEGERA (satu flag), lalu rollback
   ke build terakhir yang lolos G3–G6, lalu investigasi — jangan
   memperbaiki di produksi sambil scanner tetap terbuka.

### H.4 Kriteria "selesai" perbaikan ini

Perbaikan dinyatakan selesai bila: (a) G0–G8 lolos; (b) scanner dibuka
kembali dengan mitigasi dicabut atas persetujuan pemilik; (c) monitor
minggu pertama menunjukkan tidak ada false positive massal dan tidak ada
upaya SSRF yang lolos; (d) `SECURITY_REQUIREMENTS.md` §3.2 diperbarui
dengan status kepatuhan yang sebenarnya; (e) dokumen ini ditandai
"TERIMPLEMENTASI" dengan tanggal cutover dan tautan laporan uji.

---

## Pernyataan penutup

Dokumen ini adalah **rancangan v2.3.8 untuk dievaluasi ChatGPT** — bukan persetujuan
implementasi. **Dokumen final BUKAN berarti implementasi otomatis
disetujui** — itu dua keputusan berbeda. **Pemisahan tiga tahap (keputusan
pemilik, mengikat v2.3.8):** (a) desain remediasi boleh dilanjutkan dan
ditinjau; (b) implementasi pada source code butuh persetujuan eksplisit
terpisah dari pemilik proyek — TIDAK diberikan saat ini; (c) penerapan ke
situs live butuh persetujuan dan prosedur deployment tersendiri.
Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah. Status tetap: **DESIGN ACCEPTED
WITH CONDITIONS — IMPLEMENTATION NOT APPROVED**. Tidak ada kode yang
diubah, tidak ada data yang diubah, dan tidak ada akun/kredensial yang
dibuat dalam penyusunan revisi ini. Spike runtime dilakukan HANYA di
`/tmp/ssrf-spike`, `/tmp/ssrf-spike-v21`, `/tmp/ssrf-v22`, `/tmp/ssrf-v23`,
`/tmp/ssrf-v231`, `/tmp/ssrf-v232`, `/tmp/ssrf-v233`, `/tmp/ssrf-v234`,
`/tmp/ssrf-v235`, dan `/tmp/ssrf-v236`
terhadap server/komponen lokal yang dikontrol sendiri; tidak ada akses ke
endpoint internal produksi atau metadata cloud. Semua bukti uji v2.1,
v2.2, v2.3, v2.3.1, v2.3.2, v2.3.3, v2.3.4, v2.3.5, dan v2.3.6 berasal dari VM ini —
BUKAN dari runtime artifact produksi.

**Gerbang yang tetap mengikat:** G0 tetap wajib dibuktikan aktif
sebelum scanner dapat dibuka kembali, dan seluruh gerbang G0–G7 wajib
lolos sebelum keputusan cutover G8. Tidak satu pun gerbang dapat
dilewati dengan alasan dokumen ini sudah "final".

Implementasi dimulai **hanya setelah**:

1. ChatGPT mengevaluasi rancangan v2.3.6 ini dan keberatannya dijawab,
2. Pemilik memberikan **persetujuan implementasi eksplisit** (keputusan D-1
   s.d. D-8 sudah disetujui 7 Nov 2026 — yang masih menunggu adalah
   persetujuan implementasi itu sendiri),
3. Uji ulang pinning di staging artifact produksi (P0-1a' / U-1) membuktikan
   pendekatan yang dipilih benar-benar bekerja di runtime produksi.

Setelah itu, implementasi mengikuti urutan §C dengan uji §D.4 di setiap langkah
dan rollback §D.5 bila regresi terjadi. Scanner tetap NONAKTIF di produksi
selama perbaikan dan hanya dibuka kembali bila SELURUH kriteria cutover
§D.5 v2 lolos.

---

*Disusun berdasarkan: `SSRF_AUDIT.md` (7 Nov 2026, status VULNERABLE),
`SSRF_SPIKE_RUNTIME.md` (7 Nov 2026 — bukti uji pinning),
`SSRF_SPIKE_V21.md` (7 Nov 2026 — bukti uji v2.1, 48/48 PASS),
`SSRF_SPIKE_V22.md` (7 Nov 2026 — bukti uji v2.2, 11/11 PASS),
`SSRF_SPIKE_V23.md` (7 Nov 2026 — bukti uji v2.3, 13/13 PASS, dijalankan
ulang 2×),
`SSRF_SPIKE_V231.md` (7 Nov 2026 — bukti uji v2.3.1, 61/61 PASS,
dijalankan ulang 2×),
`SSRF_SPIKE_V232.md` (7 Nov 2026 — bukti uji v2.3.2, 9/9 PASS,
dijalankan ulang 3×; harness disalin ke `spike-harness-v232/`),
`SSRF_SPIKE_V234.md` (7 Nov 2026 — bukti uji v2.3.4: race TERBUKTI ADV-T1 2 pemilik 3/3 × 2; perbaikan flock TERUJI 4/4 × 2; FLK 9/9 × 2 tmpfs + overlay), `SSRF_SPIKE_V235.md` (7 Nov 2026 — bukti uji v2.3.5: AUTH 18/18 PASS × 2; regresi ADV 4/4 × 2, FLK 9/9 tmpfs + overlay; AUTH-T9c + SU-T1..SU-T9 NOT RUN; harness disalin ke `spike-harness-v235/`) dan `SSRF_SPIKE_V233.md` (7 Nov 2026 — bukti uji v2.3.3: RUN=3 suite v2.3.2
9/9 PASS, regresi SU-T1..SU-T9 terhadap kode yang diperkeras 9/9 PASS
× 2, tes baru RCL-T1..T6 + SU10-T1/T2 8/8 PASS × 2; harness disalin ke
`spike-harness-v233/`), `SSRF_SPIKE_V236.md` (7 Nov 2026 — bukti uji v2.3.6: pidfd PIDFD-T1..T12, window PIDFD-T9, OPS-T1..T7, re-run SU-T1..SU-T9 9/9 PASS × 4; matriks prasyarat staging STAGE-P01..P12; harness disalin ke `spike-harness-v236/`), `SSRF_EVALUATION_V235.md` (7 Nov 2026 — evaluasi ChatGPT atas v2.3.6, commit 39ea4ef — ditulis tanpa mereferensikan bukti v2.3.6; status NOT RUN-nya dikoreksi v2.3.7) dan `SSRF_RECONCILIATION_V237.md` (7 Nov 2026 — rekonsiliasi bukti v2.3.7: matriks ST-01..ST-12, SU-T1..SU-T9, risiko, penomoran kanonik ST-01..ST-16, daftar kekurangan 20 butir),
`SECURITY_REQUIREMENTS.md`, `CLASSIFICATION.md`, dan
`src/scanner/ssrf-guard.ts` (guard fondasi, lolos uji 25/25, belum terintegrasi
ke kode live). Revisi v2 menjawab enam hal yang diminta pemilik (A–F) dan
memasukkan keputusan pemilik 7 Nov 2026 (D-1 s.d. D-8). Revisi v2.1 menjawab
enam hal evaluasi ChatGPT atas v2 (NAT64, batas dekompresi jalur Node Agent,
timeout global & DNS cancellation, TTL DNS, pencocokan RDAP ketat,
konkurensi global) tanpa mengubah satu pun keputusan D-1 s.d. D-8. Revisi
v2.2 menjawab empat tindak lanjut evaluasi akhir ChatGPT atas v2.1
(semaphore DNS, atomicity lease global, risiko NAT64 U-11, bukti mitigasi
produksi G0) tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa
mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT
APPROVED. Revisi v2.3 menjawab satu keberatan teknis atas v2.2
(akumulasi lookup orphaned akibat absolute cap — penghitung orphaned
terpisah, batas keras, circuit breaker, pemulihan worker, metrik baru)
tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status
DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi
v2.3.1 menjawab empat hal evaluasi ChatGPT atas v2.3 (konfirmasi
terminasi child process, parent crash/restart, batas lintas instance,
rekonsiliasi laporan pengujian) tanpa mengubah satu pun keputusan D-1
s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS —
IMPLEMENTATION NOT APPROVED. Revisi v2.3.2 menjawab satu klarifikasi
wajib evaluasi ChatGPT atas v2.3.1 (aturan startup parent baru pada
§A.5.5: NOT_READY yang tidak dapat dinegosiasi, validasi identitas
proses sebelum SIGKILL, pidfile atomik, startup lock) tanpa mengubah
satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN
ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.3 menjawab empat hal evaluasi ChatGPT atas v2.3.2 (konsistensi jumlah pengujian — koreksi klaim 3× dengan RUN=3 yang sesungguhnya, reklamasi startup lock yang diperkeras, pengujian STARTUP-10, dan durabilitas pidfile) tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. **Koreksi v2.3.5:** paragraf ini sebelumnya salah mengatribusikan keempat klarifikasi tersebut kepada v2.3.4; v2.3.4 sebenarnya menjawab SATU keberatan teknis evaluasi ChatGPT atas v2.3.3 (race condition pada reklamasi startup lock — §A.5.5.4) tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.5 menjawab LIMA BAGIAN permintaan pemilik atas v2.3.4 (otoritas kepemilikan flock, keamanan mixed-version, uji adversarial, kompatibilitas runtime/filesystem) tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.6 menjawab TIGA KEBERATAN evaluasi ChatGPT atas v2.3.5 (PID reuse saat SIGKILL — pidfd terikat identitas, never-unlink dan kontrol operasional — katalog OS-enforced vs runbook-only + prosedur deployment/rollback/maintenance + runbook pemulihan, dan matriks prasyarat staging STAGE-P01..P12 dengan kriteria PASS/FAIL) tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.7 adalah rekonsiliasi bukti atas evaluasi ChatGPT terhadap v2.3.6 (`SSRF_EVALUATION_V235.md`, commit 39ea4ef) — memetakan ST-01..ST-12, SU-T1..SU-T9, dan U-38/U-33 ke bukti v2.3.6 yang sudah ada tanpa mengulang satu pun pengujian, menetapkan penomoran kanonik ST-01..ST-16, dan mencatat daftar kekurangan yang benar-benar tersisa (20 butir, `SSRF_RECONCILIATION_V237.md` §5) — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.8 adalah respons atas DUA audit independen ChatGPT terhadap kode sumber mirror (V1 `SSRF_CODE_SECURITY_AUDIT_V1.md`, commit 52724d6 — F-001..F-006; V2 `SSRF_INDEPENDENT_AUDIT_V2.md`, commit 789797e — F-007..F-009, B-01..B-12): matriks respons F-001..F-009 (`SSRF_RESPONSE_MATRIX_V238.md`), publikasi bundle bukti mentah v2.3.6 (`evidence/v236/` + `MANIFEST.md`), koreksi penjelasan SU-T5 (F-008) dan caveat bukti su-run4, redaksi `site/DATA-PLAN.md` di mirror (F-006), `site/bun.lock` di-mirror + manifest reproduksibilitas (`SSRF_REPRODUCIBILITY_V238.md`), desain remediasi F-001..F-005 + harness diperketat H-SSRF-01..20 (§D.4.18), persyaratan DG-1..DG-3 (§G U-47..U-49), definisi lengkap U-46 tanpa keputusan (§G, §D.4.19 inventaris staging ST-01..ST-16) — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Setelah klarifikasi ini, dokumen desain dapat dianggap final untuk masuk tahap keputusan implementasi terpisah — keputusan implementasi itu sendiri tetap menunggu pemilik. Revisi v2.3.9 mempersempit celah bukti tanpa otorisasi implementasi (bundle suplemen F-007 — 4 run SU lengkap + OPS-T7 run ke-3; verifikasi F-005 dari kode — auth di dalam kode TERBUKTI TIDAK ADA; verifikasi F-009 di salinan scratch — SDK tarball ada, frozen install + typecheck exit 0) atas perintah pemilik; public tester DITAHAN oleh pemilik dan tidak dikerjakan di v2.3.9 — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.10 menjawab audit independen V3 (F-010..F-015 + Handoff §8 7 butir): koreksi akuntansi bukti SU asli + checker manifest, koreksi matriks fitur tester, pemisahan F-006a/b/c, kepemilikan staging ST-01..ST-16 lengkap dengan UNASSIGNED/BLOCKED eksplisit, rekonsiliasi reproduksibilitas dengan output mentah, koreksi DATA-PLAN F-015, dan pemetaan dependensi U-46 yang presisi — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.11 menjawab audit independen V4 (F-016..F-020 + Handoff §9 8 butir): keputusan desain freshness cache (hapus cache untuk security scan sebagai rekomendasi utama) dan cap-aware cache key, bukti tenancy SDK read-only (permukaan API `viewer`/`db` ditemukan, semantik per-user vs shared tetap NOT VERIFIED), bukti runtime read-only bahwa action `checklink` masih ter-publish (F-019 NOT VERIFIED / BLOCKED), klarifikasi scope commit d85a1e2 berbasis git dengan HOLD perubahan source lanjutan sampai owner memutuskan, pemetaan ulang rencana F-001..F-005 ke harness + keterkaitan cache/migrasi/otorisasi, serta risiko baru U-50..U-54 dan gate konkret G-A..G-E — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.12 menjawab audit independen V5 (F-021, F-022 + Handoff §8 9 butir): paket bukti artifact-state read-only yang dapat diaudit (`evidence/f021-artifact-state-20261108/`, digest SHA-256 per respons; version/digest tetap NOT PROVIDED karena tidak diekspos tool), cabang implementasi cache yang dinyatakan eksplisit (pilihan: hapus cache dari semua jalur security-scan; F-017 + H-CACHE-05/06 NOT APPLICABLE pada cabang itu), koreksi oracle tes cap ke raw bytes di lapisan stream (H-RES-02..05 baru: multibyte UTF-8, compressed/decompressed, redirect chains, aggregate per-scan limit; `res.text().slice()` bukan bukti byte cap), kutipan `.d.ts` minimal `PortableCtx`/`Viewer`/`LocalViewer`/`CloudflareViewer` yang dipublikasikan, keputusan Bun kanonik 1.3.10, koreksi lokasi F-006b (baris 52, 483, 1245), kriteria latensi alert ST-12-LAT-01..03, risiko baru U-55..U-58, dan gate baru G-F (keputusan cache) + G-G (keputusan Bun) — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.13 menjawab audit independen V6 (F-023, F-024, F-025 + Handoff §10 11 butir): arah fixture H-RES-02 yang mustahil dihapus dan tiga fixture feasible dipublikasikan dengan angka yang diverifikasi dua alat independen (`evidence/f023-h-res02-fixtures/`), tiga lapisan byte H-RES-03 didefinisikan terpisah dengan bukti eksperimen VM atas perilaku dekompresi transparan Bun (`evidence/f024-h-res03-bun-fetch/`, gzip 551→500.000 byte, br 51→500.000 byte, Bun 1.4.4 — perilaku pada kanonik 1.3.10 NOT VERIFIED, U-62), angka aggregate H-RES-05 ditetapkan 1.000.000 decoded byte per scan beserta overhead 0, kebijakan redirect-body, dan cancel concurrency-safe fail-closed, semantik kepemilikan G-F diklarifikasi (cabang pilihan adalah rekomendasi yang menunggu penerimaan owner, bukan otorisasi implementasi), catatan "live untouched" v2.3.12 dikoreksi sebagai basi (live sudah v15, d85a1e2, disetujui Rama 2026-11-08 ~02:09 WIB — berdasarkan catatan repo, tanpa verifikasi live baru), risiko baru U-59..U-62, dan gate baru G-H (eksekusi harness H-RES-02/03/05 yang sudah dikoreksi) — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.14 menjawab audit independen V7 (F-026, F-027, F-028 + Handoff §10 9 butir): klaim "overhead 0 byte" dicabut sebagai pernyataan umum dan dibatasi hanya pada accepted/retained bytes di accumulator aplikasi, dengan anggaran transient/in-flight (A2) dipisah eksplisit dan dibuktikan eksperimen VM pada Bun kanonik 1.3.10 DAN 1.4.4 (`evidence/f026-chunk-accounting/` — max chunk teramati 528.384 byte, satu chunk 500.000 byte = seluruh body; chunking server 64 KiB tidak membatasi chunk klien); L2 dinyatakan sebagai input-body budget, bukan peak-memory budget, dengan larangan materialisasi bersamaan dan pemindaian incremental **[KOREKSI v2.3.15 (F-029): klaim kuantitatif v2.3.14 "terukur ~4,5–5,4× lebih hemat memori" TIDAK TERKONFIRMASI; rasio terkoreksi 1,18–1,88× (median VmHWM) — lihat §D.4.26]**; LIVE VERSION / DEPLOYMENT APPROVAL dipertahankan NOT VERIFIED dengan template manifest deployment non-secret yang tetap kosong (`DEPLOYMENT_MANIFEST_TEMPLATE.md`); dekompresi transparan terkonfirmasi pada Bun 1.3.10 (re-run skrip F-024 tanpa perubahan) sekaligus frozen install 1.3.10 terbukti GAGAL karena lockfile v2 (`evidence/f009-bun1310-install-typecheck/` — temuan baru U-66; keputusan G-G kini punya bukti konkret); risiko baru U-63..U-66, U-62 dipersempit (bagian VM terjawab, staging tetap NOT VERIFIED), dan gate baru G-I (stress test memori H-RES-03/05 pada staging Bun 1.3.10 + proses deployment manifest) — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.15 menjawab audit independen V8 (F-029, F-030 + Handoff §9 8 butir): metodologi perbandingan memori pola incremental diperbaiki dengan parent harness proses-terpisah + VmHWM OS (`evidence/f029-memory-methodology/` — 60 run anak per versi Bun, 0 gagal, 60 PID berbeda; rasio A/B terkoreksi 1,18–1,88× median VmHWM, forced-GC 1,57–1,88× vs natural-GC 1,18–1,32×) dan klaim kuantitatif v2.3.14 sebesar 4,5–5,4× DICABUT (NOT VERIFIED — artefak baseline B yang tercemar; karakter hidup 3,60× dipertahankan hanya sebagai character accounting); matriks kompatibilitas Bun/lockfile/SDK path disajikan (`evidence/f030-bun-compatibility/` — 1.3.10 menolak lockfile v2, 1.4.4 menerima dengan frozen install + typecheck exit 0, clean builder tanpa `/opt/hatch` tetap gagal pada kedua versi) dengan trade-off Opsi A vs Opsi B yang keduanya tetap PROPOSAL — HOLD; F-028 tetap NOT VERIFIED dan F-019 tetap BLOCKED; prasyarat/prosedur/oracle/bukti STAGE-P01..P12 dilengkapi tanpa mengarang owner; risiko baru U-67/U-68, U-64/U-66 diperbarui, dan gate baru G-J (keputusan reproduksibilitas F-030) — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED Revisi v2.3.16 menjawab audit independen V9 (F-031, F-032 + Handoff §9 8 butir): fixture exact-byte diperbaiki dengan pengukuran TextEncoder + assert sebelum scan (ASCII dan non-ASCII byte-matched tepat 1.000.000 byte; varian cap−1/cap+1 terukur; rerun penuh 120 run anak, 0 gagal; rasio terukur ulang 1,13–1,84× dan rentang 1,18–1,88× dinyatakan superseded), jalur false green harness ditutup dengan validasi `--runs` + assertion jumlah record + validasi RESULT + timeout child dan tes regresi negatif 7 kasus, dokumentasi harness diselaraskan (`node:child_process.spawnSync`), proposal keputusan F-030 diselesaikan sebagai paket yang dapat diputuskan (rekomendasi Opsi A + SDK vendorkan, fallback Opsi B) tanpa mengubah file apa pun, serta risiko baru U-69/U-70 dan pembaruan U-67/U-68 — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED. Revisi v2.3.17 menjawab audit independen V10 (F-033 + Handoff §9 9 butir): TextEncoder dikeluarkan dari measured process (byte aritmetik + preflight terpisah 61 checks sebagai bukti independen), lifecycle pola B dibuat eksplisit via helper `scanSegment()` scope tertutup, rasio terukur ulang menjadi 1,12–2,62× dan rentang 1,13–1,84× dinyatakan superseded (hipotesis arah V10 tidak terkonfirmasi pada sel forced-GC — confound `segLower` lebih besar daripada transient encoder), jalur timeout harness dibuktikan end-to-end dengan child dummy yang menggantung (12 child timeout, ke-12 PID terverifikasi mati, tanpa success line), serta risiko baru U-71/U-72 dan pembaruan U-67/U-70 — tanpa mengubah satu pun keputusan D-1 s.d. D-8 dan tanpa mengubah status DESIGN ACCEPTED WITH CONDITIONS — IMPLEMENTATION NOT APPROVED.
