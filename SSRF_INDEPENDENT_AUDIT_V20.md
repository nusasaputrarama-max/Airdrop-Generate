# SSRF Independent Audit V20 — Review v2.3.25 / Principal Migration

**Tanggal:** 8 November 2026 (WIB)  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Main HEAD sebelum audit:** `cb2ab9be7ef65d839b909b896bf26280c34a9f4b`  
**Development HEAD:** `b884c3d35b8b08557ece3394000994dd72adbdb4`  
**Merge base:** `cfb55a67dfb79982a78a7f381448862124d47f0b`  
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE

## 1. Ringkasan keputusan

Muse telah menanggapi Audit V19 melalui v2.3.25. F-057 diperbaiki pada source development: context tanpa viewer kini fail-closed untuk saved state secara default. F-058 juga diubah: principal local menggunakan `userId`, dan delegate mendapat namespace terpisah. Namun, F-058 tetap PARTIALLY ADDRESSED karena tipe SDK tidak membuktikan bagaimana runtime mengisi `userId`, `ownerUserId`, `isOwner`, dan `delegate`.

Audit independen ini mengonfirmasi dua risiko deployment yang harus diselesaikan:

- **F-059 — Medium, conditional design gap:** mode `LOCAL_SINGLE_OWNER_MODE` yang diaktifkan membuat context tanpa viewer kembali menggunakan principal bersama `<LEGACY>`. Ini dapat membuka saved state lintas pengunjung jika mode diaktifkan pada runtime yang masih menerima invocation publik/shared tanpa viewer. Default saat ini OFF; eksposur live tidak terbukti.
- **F-060 — Medium, data-compatibility gap:** perubahan dari `local:{ownerUserId}` menjadi `local:{userId}` tidak disertai migrasi/compatibility mapping untuk baris lama. Muse sendiri mencatat U-114: baris lama dapat menjadi orphan. Tidak ada data yang dihapus dalam perubahan ini, tetapi history/bookmark lama berpotensi tidak lagi terlihat oleh pemiliknya.

Tidak ada staging, deployment baru, URL HTTPS publik, atau health check eksternal yang terbukti. Tidak ada alasan untuk mengaktifkan Link Scanner.

## 2. Snapshot repository dan koordinasi

Branch yang tersedia pada saat pemeriksaan:

| Branch | HEAD / relasi terhadap main | Catatan |
|---|---|---|
| `main` | `cb2ab9be7ef65d839b909b896bf26280c34a9f4b` | V19 + dokumen respons v2.3.25 |
| `development` | `b884c3d35b8b08557ece3394000994dd72adbdb4`; 42 ahead / 2 behind | Source v2.3.25 berada di sini |
| `discussion-link-jadi` | 2 ahead / 12 behind | Dokumen diskusi |
| `beta-readiness` | 2 ahead / 16 behind | Paket kesiapan beta, bukan deployment |
| `project-landing` | 2 ahead / 8 behind | Hanya source landing statis |

Tidak ada branch bernama `dev`; `development` adalah branch pengembangan aktif. Merge base `main...development` adalah `cfb55a6` (Audit V19).

Tidak ada pull request terbuka. GitHub Actions API mengembalikan 0 workflow runs. Branch API menunjukkan `protected=false` untuk `main` dan `development`; tidak ada required status checks. Ini adalah gap otomasi/release governance, bukan bukti adanya eksploitasi.

### Commit Muse yang diverifikasi

| SHA | Isi | Penilaian |
|---|---|---|
| `37a23a2390a414ea6b689d3ef4c7cb8b0f7eb5c7` | Merge V19 main ke development | Sync pada saat itu berhasil |
| `2eb5a2ad21e55cc3c7e409d807c78f2fe4ce0524` | Source F-057/F-058 | Perubahan source nyata |
| `d864fd058f56e11cd90f13817859aa01773d6e74` | H-AN/H-PL harness | Harness baru |
| `7b77a914928db0b967d0f8f6d79cf04e710b954a` | Regresi penuh + matriks | 375/375 dilaporkan |
| `b884c3d35b8b08557ece3394000994dd72adbdb4` | SHA akhir matriks development | HEAD development saat audit |
| `f1bfea39e62b36d6481881e6a2260bbc0f39eb13` | Dokumen respons v2.3.25 di main | Dokumentasi saja |
| `cb2ab9be7ef65d839b909b896bf26280c34a9f4b` | Catat main HEAD ke matriks | Dokumentasi saja |

Main hanya menerima dokumen respons, bukan source aplikasi v2.3.25. Development belum memuat dua commit dokumentasi main terbaru (f1bfea39 dan cb2ab9be). Sinkronisasi berikutnya harus menggabungkan main terbaru ke development tanpa merge balik source development ke main.

## 3. Artefak source dan bukti yang ditinjau

| Artefak | Ref / blob SHA | Hasil |
|---|---|---|
| `site/server/src/actions.ts` | development / `35ce11547c874835fde93c1edd81ba5174062d20` | Source F-057/F-058 ditinjau |
| `site/server/src/schema.ts` | development / `19e5e3d033b2f49502ccd8d9e4052708e8ad9f1f` | `checks.owner_user_id` dan `saved_projects.principal_id` ditinjau |
| `site/drizzle/0006_unified_ownership_and_uniqueness.sql` | development / `12794d0e201ade2529b384cae1dd6e1f68a3f3f4` | Migrasi tidak memetakan principal lama ke userId baru |
| `evidence/v2325/test-anon-saved-v2325.ts` | development / `ebda9516036bc6f3e5c2a0fc24563507581f247c` | Mengimpor handler Actions aktual |
| `evidence/v2325/test-principal-local-v2325.ts` | development / `8757f84cca010f292676a0a6938b7fe95774ec60` | Mengimpor handler Actions aktual |

### Rekonsiliasi hasil pengujian

Muse melaporkan 375/375 PASS (363 baseline terkoreksi + 12 baru), Bun 1.4.4, bun:sqlite 3.53.4, sqlite3 CLI 3.45.1, serta TypeScript server/client exit 0. Ini seluruhnya diberi label VM/local, bukan staging.

Dua log baru diperiksa independen terhadap sidecar SHA-256:

| Test | Command yang tertulis di harness | Log SHA-256 | Hasil |
|---|---|---|---|
| H-AN 5/5 | `bun evidence/v2325/test-anon-saved-v2325.ts` | `764c1f88900344805644d4be52784038b7c79ba455e0dc53d145d7176ef94eb2` | Hash cocok dengan sidecar; exit code independen tidak tersedia |
| H-PL 7/7 | `bun evidence/v2325/test-principal-local-v2325.ts` | `ccf0b0f47b9eaf6f3ac79aeb4ff303c6317b4e7bbec62c0bf425a783e89133ce` | Hash cocok dengan sidecar; exit code independen tidak tersedia |

Harness mengimpor `Actions` dari `site/server/src/actions.ts` dan menggunakan database disposable. H-PL membangun LocalViewer secara eksplisit melalui helper test; karena itu ia membuktikan perilaku mapping handler terhadap input tersebut, bukan semantik populasi viewer oleh provider. Audit ini tidak menjalankan ulang 375 test, tidak menghitung ulang 18/18 hash, dan tidak mengklaim TypeScript check telah direproduksi independen.

## 4. Response to Previous Handoff — Audit V19

| Butir V19 | Status independen V20 | Bukti / sisa risiko |
|---|---|---|
| 1. F-057 missing viewer fail-closed | **Addressed pada source development, VM test** | `savedPrincipal()` default null untuk missing viewer; H-AN 5/5. F-059 di bawah membatasi keamanan opt-in legacy. |
| 2. F-058 local principal | **Partially addressed** | `resolvePrincipal()` memakai `local:{userId}`; H-PL 7/7. Kontrak runtime provider U-113 tetap BLOCKED. |
| 3. Sinkronisasi development | **Addressed pada saat merge V19; stale lagi** | Merge 37a23a2 berhasil, tetapi development sekarang 2 commit di belakang main. |
| 4. Rekonsiliasi bukti | **Partially verified** | Muse melaporkan 375/375 dan 18 hash cocok; audit ini hanya memverifikasi independen dua log baru. |
| 5. T-01 dan landing | **Belum addressed** | Tidak ada URL publik/health check. T-01 BLOCKED; landing README menyatakan NOT DEPLOYED. |

## 5. Temuan baru

### F-059 — Medium: legacy single-owner opt-in tidak terikat pada identitas local yang positif

**Klasifikasi:** conditional design gap / plausible cross-visitor saved-state exposure.  
**Confidence:** tinggi untuk perilaku source; sedang untuk keterpaparan runtime.  
**Path/function:** `site/server/src/actions.ts:243-272` (`LOCAL_SINGLE_OWNER_MODE`, `savedPrincipal`); `listProjects` dan `setProjectState`.

**Bukti source:**

- `LOCAL_SINGLE_OWNER_MODE` default false (line 243).
- `setLocalSingleOwnerMode(enabled)` diekspor sebagai fungsi test-only (lines 245-248).
- `savedPrincipal()` menolak Cloudflare viewer non-owner bila objek viewer hadir (line 269), lalu mengembalikan `LEGACY_PRINCIPAL` setiap kali principal null dan mode aktif (lines 270-272).
- Dengan demikian context tanpa `ctx.viewer` mendapatkan principal `<LEGACY>` saat mode aktif.
- H-AN-03 secara eksplisit membuktikan dua context tanpa viewer dapat membaca/menulis baris `<LEGACY>` ketika mode ON. H-AN-04 hanya menguji objek Cloudflare non-owner yang memiliki viewer; tidak menguji invocation shared/public yang kehilangan viewer.

**Skenario dampak:** jika mode diaktifkan pada artifact yang juga menerima invocation publik/shared dan salah satu jalur invocation tidak menyediakan `ctx.viewer`, semua invocation tanpa viewer dapat memakai principal `<LEGACY>` yang sama. Bookmark/status tugas pengunjung dapat dibaca atau ditimpa lintas pengunjung.

**Prasyarat:** `LOCAL_SINGLE_OWNER_MODE=true` dan ada invocation tanpa viewer pada deployment tersebut. Mode default saat ini OFF, tidak ada bukti live bahwa mode pernah diaktifkan, dan runtime population `ctx.viewer` belum diverifikasi. Karena itu ini BUKAN klaim eksploitasi live.

**Mitigasi:**

1. Jangan aktifkan mode legacy pada artifact shared/public.
2. Missing/unknown viewer harus tetap fail-closed; jangan menganggap tidak adanya viewer sebagai bukti single-owner.
3. Bila legacy state harus dipertahankan, gunakan bukti deployment-level yang tidak dapat dipengaruhi request dan ikat ke runtime local-only yang terverifikasi; lebih aman lakukan migrasi dengan pemetaan pemilik yang sah.
4. Batasi test setter agar tidak menjadi API konfigurasi production yang dapat diimpor sembarang modul.

**Regression test wajib:** mode ON + context tanpa viewer tetap tidak dapat membaca/menulis legacy kecuali harness membuktikan attestation local-only yang eksplisit; unknown viewer source fail-closed; Cloudflare viewer dan invocation publik tetap tidak berbagi state.

### F-060 — Medium: perubahan principal tidak memiliki migrasi kompatibilitas untuk baris lama

**Klasifikasi:** data-compatibility / data-visibility regression.  
**Confidence:** tinggi untuk perubahan key dan tidak adanya remapping dalam perubahan source v2.3.25; dampak pada DB runtime tergantung data yang telah tersimpan.  
**Path/function:** `site/server/src/actions.ts:213-227` (`resolvePrincipal`), `listChecks`, `deleteCheck`, `askGibran`, `runCheck` (owner disimpan sekitar line 1285), `listProjects`, `setProjectState`; `site/server/src/schema.ts:51` (`checks.owner_user_id`) dan `:154-162` (`saved_projects.principal_id`).

**Bukti source/diff:**

- Sebelum v2.3.25, principal local adalah `local:{ownerUserId}`.
- v2.3.25 mengubahnya menjadi `local:{userId}` (commit `2eb5a2a`).
- Query riwayat dan operasi delete membandingkan `checks.owner_user_id` dengan principal baru; saved state menggunakan `saved_projects.principal_id` yang sama.
- Perubahan source v2.3.25 tidak menambahkan migrasi yang memetakan key lama ke key baru.
- Matriks Muse v2.3.25 §2 sendiri mencatat U-114: baris lama dengan key `local:{ownerUserId}` menjadi orphan setelah perubahan.

**Skenario dampak:** DB yang telah menyimpan history/bookmark/provenance memakai `local:{ownerUserId}`; setelah deployment, viewer dengan `userId` berbeda membaca menggunakan `local:{userId}`. Baris lama tidak lagi cocok dengan predicate dan tidak terlihat. Baris tidak otomatis dihapus, tetapi pengguna kehilangan akses ke history/bookmark lama.

**Prasyarat:** DB berisi baris dari versi sebelum perubahan dan `userId !== ownerUserId` untuk principal terkait. DB produksi tidak diperiksa atau diubah dalam audit ini; keberadaan baris tersebut di live NOT VERIFIED.

**Mitigasi:**

1. Jangan deploy perubahan principal ke DB berisi data sampai keputusan U-114 selesai.
2. Dapatkan pemetaan identitas yang sah dari provider/runtime atau prosedur ekspor owner yang terverifikasi; jangan menebak bahwa userId selalu sama dengan ownerUserId.
3. Pilih migrasi transaksional yang mempertahankan jumlah baris dan relasi, atau ekspor/arsip eksplisit jika pemetaan tidak mungkin. Sertakan backup/restore, pre-check, post-check, dan rollback.
4. Jangan membuat dual-read lintas principal tanpa batas yang dapat membocorkan history antar-user.

**Regression test wajib:** seed baris lama `local:{ownerUserId}` pada checks dan saved_projects; buktikan migrasi mempertahankan akses pemilik yang benar, jumlah baris, dan isolasi dua user. Tambahkan failure injection/rollback serta verifikasi bahwa tidak ada baris yang diam-diam hilang dari hasil query.

## 6. Blocker yang tetap terbuka

| Gate | Status | Bukti / blocker |
|---|---|---|
| U-113 provider identity contract | **BLOCKED** | SDK 0.14.0 mendeklarasikan field, tetapi tidak membuktikan populasi runtime. Butuh pernyataan provider atau staging trace aman. |
| U-114 principal-key migration | **BLOCKED** | F-060; keputusan mapping/arsip belum ada. |
| U-115 single-owner attestation | **BLOCKED** | F-059; tidak ada bukti deployment runtime local-only. |
| STAGE-P01 egress/pinning | **NOT VERIFIED** | Tidak ada runtime staging untuk membuktikan DNS pinning, TLS/SNI, dan egress. |
| STAGE-P02 viewer + DB semantics | **NOT VERIFIED** | `ctx.viewer`, scope `ctx.db`, dan perilaku runtime belum dibuktikan. |
| D-06 / F-030 SDK build | **BLOCKED** | SDK redistributable dan clean external client build belum tersedia. |
| T-01 second Hatch space | **BLOCKED** | Tidak ada bukti platform publishability, subdomain, akses, atau health check. |
| Landing page | **SOURCE ONLY** | `project-landing:landing/index.html`; README menyatakan NOT DEPLOYED / NO PUBLIC URL VERIFIED. |
| F-019 Link Scanner runtime disabled | **NOT VERIFIED** | Default-off dan kill-switch diuji di VM; status action dispatch/live artifact belum dibuktikan. |
| Staging roles | **UNASSIGNED / BLOCKED** | Enam peran pada `STAGING_READINESS_V2325.md` belum memiliki owner. |
| CI / branch governance | **GAP** | 0 workflow runs; main/development tidak protected dan tidak memiliki required checks. |

## 7. Muse Handoff / Required Response

Otorisasi implementasi development branch tetap berlaku. Jangan meminta owner mengulang izin. Semua source change tetap di `development`; jangan merge source development ke main, jangan ubah produksi/live artifact/deployment config, dan jangan aktifkan Link Scanner.

1. **Tutup F-059 — legacy mode fail-closed.**
   - Ubah desain agar context tanpa/unknown viewer tidak otomatis memakai `<LEGACY>` hanya karena module flag aktif.
   - Bila legacy mode memang dibutuhkan, buktikan deployment local-only melalui attestation runtime yang tidak berasal dari request.
   - **Acceptance:** missing viewer, unknown viewer, dan shared/public invocation tidak dapat membaca/menulis legacy state; owner/local-only compatibility hanya aktif pada runtime yang terverifikasi.
   - **Evidence:** diff source, H-AN regression baru, raw log, command, exit code, SHA-256.

2. **Tutup F-060 / U-114 — principal-key compatibility.**
   - Inventarisasi semua field yang menyimpan `local:{ownerUserId}`: checks, saved_projects, dan provenance.
   - Jangan menebak mapping userId. Dapatkan provider trace/contract atau prosedur ekspor yang aman.
   - **Acceptance:** preexisting data dipertahankan/diarsipkan secara eksplisit, row count dan ownership diverifikasi sebelum/sesudah, rollback tersedia, dua user tidak dapat membaca data satu sama lain.
   - **Evidence:** migration atau export tool, disposable DB tests, pre/post counts, failure/rollback test, raw logs dan hash.

3. **Tutup U-113 — provider identity semantics.**
   - Dapatkan jawaban provider tertulis atau staging trace yang aman untuk `userId`, `ownerUserId`, `isOwner`, dan `delegate`.
   - **Acceptance:** bukti menunjukkan apakah dua viewer dapat memiliki ownerUserId sama dan userId berbeda, serta identitas yang dibawa delegate. Bila tidak dapat diperoleh, pertahankan F-058 BLOCKED dan jangan mengklaim tenancy runtime PASS.
   - **Evidence:** dokumen provider atau trace staging dengan PII/secret disamarkan.

4. **Sinkronkan development dengan main terbaru.**
   - Main saat audit sebelum laporan ini: `cb2ab9be7ef65d839b909b896bf26280c34a9f4b`; setelah V20 masuk main, gunakan HEAD main yang benar-benar terbaru.
   - Pertahankan 42 commit development; merge main ke development, jangan merge source development kembali ke main.
   - **Acceptance:** compare main...development menunjukkan behind=0 setelah sinkronisasi; catat merge SHA dan changed-file list.

5. **Jaga jalur project link terpisah dari aplikasi.**
   - Verifikasi apakah tooling platform dapat memublikasikan hanya `landing/` sebagai static artifact terpisah. Jangan ubah workflow/deployment config repo atau live artifact.
   - **Acceptance:** URL HTTPS dapat diakses dari sesi eksternal, status HTTP/health check tercatat, konten hanya informasional, dan tidak ada backend/scanner. Jika tooling tidak tersedia, catat nama kemampuan/perintah yang tidak ada dan bukti kegagalannya; jangan mengarang URL.
   - T-01 tetap feasibility-only. Jangan salin scanner ke space kedua.

6. **D-06/build portability tetap dikerjakan paralel.**
   - Cari jalur SDK redistributable yang sah atau pernyataan provider tentang build client melalui artifact tooling.
   - Jangan mengganti runtime integration dengan stub sebagai klaim build produksi.
   - **Acceptance:** clean-clone install, server/client build, test, dan CI dapat direproduksi tanpa path lokal Muse; jika client build hanya melalui tooling, sediakan bukti tertulis provider.

## 8. Batas rilis

- Project link: **belum ada URL publik terverifikasi**.
- Owner-only trial: **BLOCKED**.
- Community beta: **BLOCKED**.
- Link Scanner: **jangan diaktifkan**; runtime disable belum terbukti.
- Tidak ada scanner invocation, URL fetch eksternal, wallet/signing/transaction, perubahan DB produksi, atau deployment yang dilakukan dalam audit ini.

**Keputusan:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE. Source development v2.3.25 menunjukkan kemajuan, tetapi F-059/F-060, U-113..U-115, staging, SDK build, dan publikasi URL masih harus diselesaikan.
