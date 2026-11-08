# SSRF Independent Audit V19 — Review v2.3.24

**Tanggal:** 8 November 2026 (WIB)  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Main HEAD saat audit:** `6167749dbdf0a8c5527c9f8497fb023182c52117`  
**Development HEAD saat audit:** `ecd6f069d95ffa7fcfb98110cd542a3cc7faf266`  
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE

## 1. Ringkasan keputusan

Muse telah menanggapi Audit V18 melalui implementasi nyata pada branch `development` v2.3.24. Perubahan source mencakup klasifikasi IP berbasis registry IANA, owner gate untuk `addProject`, perubahan principal Cloudflare share, propagasi deadline ke DNS, timeout tanpa penyimpanan hasil, pembebanan cache hit ke aggregate byte budget, CHECK Solana base58 pada migrasi 0008, dan same-origin policy pada setiap redirect script.

Ini kemajuan substantif. Harness baru mengimpor modul aplikasi yang sebenarnya dan memakai database disposable untuk pengujian migrasi/handler. Namun, seluruh bukti yang dilaporkan masih VM/local. Tidak ada staging, runtime provider, deployment, atau health-check eksternal yang terbukti. Audit ini juga menemukan dua celah baru pada pemetaan principal lokal/anonim yang harus ditutup sebelum gate tenancy dianggap lulus.

**Tidak ada persetujuan untuk mengaktifkan Link Scanner, mengubah produksi, atau merilis aplikasi.**

## 2. Scope dan snapshot repository

### Branch

| Branch | HEAD | Relasi terhadap main HEAD | Catatan |
|---|---|---:|---|
| `main` | `6167749dbdf0a8c5527c9f8497fb023182c52117` | baseline | Berisi audit V18 dan dokumen respons v2.3.24; tidak berisi source implementation v2.3.24. |
| `development` | `ecd6f069d95ffa7fcfb98110cd542a3cc7faf266` | 37 ahead / 2 behind | Source implementation v2.3.24 berada di sini. Merge base `16997061e00ff6809798c94634675ed5547a57d9`. |
| `beta-readiness` | `fd4441ad7cee61df85018d1f745eb1bd3eff8239` | 2 ahead / 13 behind | Snapshot paket beta; jangan gabungkan otomatis. |
| `project-landing` | `e0391005dca6a336969759d4091dbced2e1a8a4e` | 2 ahead / 5 behind | Hanya dua file landing statis. |
| `discussion-link-jadi` | `59b02d06b717a4b16feb1be2433faf71d29cf6a2` | 2 ahead / 9 behind | Artefak diskusi; jangan gabungkan otomatis. |

Tidak ada branch bernama `dev`; branch pengembangan yang aktif adalah `development`. Tidak ada open pull request dan GitHub Actions API mengembalikan 0 workflow runs. Ini bukan bukti bahwa tidak ada deployment melalui platform lain, tetapi tidak ada bukti CI/deployment GitHub Actions yang dapat dipakai pada audit ini.

Muse menggabungkan main sampai `1699706`, lalu main maju lagi dengan dua commit dokumentasi v2.3.24: `21e7dcecddb0482a2ee5b20afd36576772ae404e` dan `6167749dbdf0a8c5527c9f8497fb023182c52117`. Karena itu development sekarang tertinggal dua commit dari main. Handoff meminta Muse menyinkronkan dua commit terbaru itu ke development tanpa menggabungkan source development kembali ke main.

### Artefak yang ditinjau

- `SSRF_RESPONSE_MATRIX_V2324.md` di main, blob SHA `3d9ff1319a9c65e50835e77192589a0ba5530c8a`.
- `SSRF_RESPONSE_MATRIX_V2324.md` di development, blob SHA `d857bcc982c69d13f12c975dda672b325261b599`.
- `STAGING_READINESS_V2324.md` di main, blob SHA `2c8a03edf69a632c54168f2956595f6a6cb03ae0`.
- `site/server/src/actions.ts` di development, blob SHA `d3ab99707e4523023007f22de10e526db0369710`.
- `site/server/src/ssrf-guard.ts` di development, blob SHA `c49fb202a3ef63b6774a926f7ccbf785a5ef03f7`.
- `site/server/src/schema.ts` di development, blob SHA `19e5e3d033b2f49502ccd8d9e4052708e8ad9f1f`.
- `site/server/src/scan-limits.ts` di development, blob SHA `796d84226fae59c0bc8f6d998dfb85197ba68516`.
- Harness baru: `evidence/v2324/test-auth-addproject-v2324.ts`, `test-principal-share-v2324.ts`, `test-deadline-v2324.ts`, `test-cache-budget-v2324.ts`, `test-solana-check-v2324.ts`, `test-same-origin-redirect-v2324.ts`, dan `test-ip-registry-v2324.ts`.

## 3. Response to Previous Handoff — Audit V18

| Temuan | Hasil review V19 | Bukti / sisa risiko |
|---|---|---|
| F-049 — IP special-purpose | **Implemented in development; VM evidence reported.** | `classifyIPv4/IPv6` diperbarui; korpus IANA ada di `evidence/v2324/iana-registry-corpus-v2324.md`; H-IP 8/8 dan H-SSRF 32/32 dilaporkan PASS. Keputusan `2001:20::/28` ALLOW mengikuti IANA. Registry-diff test berkala belum ada; runtime egress tetap NOT VERIFIED. |
| F-050 — `addProject` authorization | **Implemented in development; handler gate reviewed.** | `isAddProjectAuthorized` memeriksa `ctx.viewer?.isOwner === true` sebelum DB access. H-AUTH 6/6 memakai `Actions.addProject.handler` dan DB disposable. Tidak ada service principal terjadwal; `ctx.viewer` runtime tetap NOT VERIFIED. |
| F-051 — Cloudflare share principal | **Partially accepted; new residual findings F-057/F-058 below.** | Cloudflare non-owner share kini resolve ke null dan saved state dinonaktifkan. H-PRIN 6/6 menguji dua token berbeda pada share yang sama. Namun, fallback tanpa viewer dan pemetaan local viewer belum fail-closed/per-user secara meyakinkan. |
| F-052 — total deadline | **Implemented in development; VM evidence reported.** | Deadline diteruskan ke DNS validation/preflight dan fetch path. H-DL 6/6. Timing runtime/staging NOT VERIFIED. |
| F-053 — timeout persistence | **Implemented in development; VM evidence reported.** | `ScanTimeoutError` dan checkpoint mencegah hasil timeout disimpan; H-TO 1/1 melaporkan 20,015 ms, 0 row, lease dilepas. Runtime timing NOT VERIFIED. |
| F-054 — cache aggregate budget | **Implemented in development; code path reviewed.** | Cache hit menyimpan `decodedBytes` dan memanggil `tryReserve` pada budget scan saat ini; H-CB 4/4 dilaporkan PASS. |
| F-055 — Solana DB CHECK | **Implemented in development; schema/migration reviewed.** | Migrasi `site/drizzle/0008_solana_base58_check.sql`; schema memakai allowlist base58 penuh; H-B58 5/5 direct SQL dilaporkan PASS. SQLite runtime produksi dan pre-check DB berisi data tetap NOT VERIFIED. |
| F-056 — same-origin redirect | **Implemented in development; code path reviewed.** | `allowedOrigin` dicek di setiap hop sebelum koneksi; H-SO 5/5 memakai `fetchText` asli dengan resolver/connector stub. Tidak ada staging test. |

### Rekonsiliasi angka dan kualitas bukti

Matriks development masih menyebut 353/353. Matriks main v2.3.24 mengoreksi jumlah menjadi **363/363**, karena 10 test H-RD juga dijalankan ulang dan sebelumnya tidak ikut dihitung. Penjumlahan 16 subtotal harness yang tercantum di matriks main memang menghasilkan 363. Jangan menimpa history development hanya untuk mengganti angka; pertahankan koreksi di dokumen main.

Muse melaporkan Bun 1.4.4, SQLite 3.53.4 dan sqlite3 CLI 3.45.1, serta `tsc` server+client exit 0. Log dan sidecar `.sha256` tersedia di `evidence/v2324/`; matriks main menyatakan 16 hash cocok. **Audit ini tidak menjalankan ulang Bun/tsc dan tidak menghitung ulang seluruh 16 hash dari byte mentah.** Oleh karena itu 363/363 dan hash verification dicatat sebagai bukti VM yang dilaporkan/direkonsiliasi secara aritmetika, bukan sebagai hasil rerun independen V19. Tidak ada hasil staging.

## 4. Temuan baru

### F-057 — Medium: fallback tanpa viewer membagikan saved state `<LEGACY>`

**Klasifikasi:** design gap yang dapat menyebabkan cross-visitor state sharing; eksposur runtime NOT VERIFIED.  
**Confidence:** tinggi untuk jalur kode; sedang untuk keterpaparan eksternal.  
**Path/function:** `site/server/src/actions.ts:174-195` (`resolvePrincipal`, `savedPrincipal`), `:1979-2001` (`listProjects`), `:2027+` (`setProjectState`).

**Bukti kode:**
- `resolvePrincipal(ctx)` mengembalikan null bila `ctx.viewer` tidak tersedia.
- `savedPrincipal(ctx)` kemudian melakukan `resolvePrincipal(ctx) ?? LEGACY_PRINCIPAL`; artinya missing viewer menjadi `<LEGACY>`, bukan disabled principal.
- `listProjects` memakai hasil tersebut untuk LEFT JOIN ke `saved_projects`.
- `setProjectState` memakai hasil yang sama untuk INSERT/UPDATE.
- Hanya Cloudflare viewer yang eksplisit non-owner yang mendapat null dan state disabled.

**Skenario dampak:** bila runtime tidak mengisi `ctx.viewer` pada invocation publik, semua pengunjung tanpa viewer akan membaca dan menulis baris `saved_projects` dengan principal `<LEGACY>`. Bookmark dan status tugas satu pengunjung dapat terlihat/ditimpa pengunjung lain. Ini bukan kebocoran riwayat check; `listChecks` tetap mengembalikan kosong untuk principal null. Namun, klaim state dashboard per pengguna tidak benar pada jalur anonim tersebut.

**Prasyarat:** `ctx.viewer` tidak terisi pada invocation publik/shared. STAGE-P02 saat ini NOT VERIFIED, sehingga kondisi ini belum dapat dikesampingkan. Tidak ada bukti live exploit dan tidak ada staging yang diuji.

**Mitigasi wajib:** untuk mode shared/public, missing viewer harus fail-closed untuk saved state (read default, write no-op). Jika legacy saved state dibutuhkan untuk local single-owner, batasi melalui mode local-only yang eksplisit dan dibuktikan oleh runtime, bukan sekadar karena `ctx.viewer` tidak ada.

**Regression test:** dua context tanpa `ctx.viewer` pada DB yang sama tidak boleh saling membaca atau menulis bookmark/task state; uji pula bahwa legacy migration tidak membuat state publik lintas pengunjung. Ulangi dengan runtime provider staging.

### F-058 — Medium: local principal menggunakan `ownerUserId`, bukan `userId`

**Klasifikasi:** plausible cross-principal isolation gap; runtime semantics NOT VERIFIED.  
**Confidence:** tinggi bahwa field `userId` diabaikan; sedang-rendah untuk exploitability di runtime.  
**Path/function:** `site/server/src/actions.ts:174-180` (`resolvePrincipal`); `evidence/v2323/harness-helpers.ts` (`localViewer`); `evidence/v2324/test-principal-share-v2324.ts` H-PRIN-05.

**Bukti kode/kontrak:**
- `resolvePrincipal` mengembalikan `local:${viewer.ownerUserId}` untuk SEMUA local viewer; tidak memakai `viewer.userId` dan tidak membedakan `isOwner`.
- SDK surface stub yang diturunkan dari deklarasi SDK 0.14.0 mendefinisikan `LocalViewer` dengan dua field terpisah: `userId` dan `ownerUserId`, serta `isOwner` dan `delegate`.
- Test helper `localViewer(ownerUserId, isOwner)` membentuk `userId = u-${ownerUserId}`. Karena kedua field selalu berubah bersama, test tidak dapat mendeteksi dua viewer dengan ownerUserId sama tetapi userId berbeda.
- H-PRIN-05 hanya membandingkan `localViewer("owner-1", true)` dengan `localViewer("owner-2", false)`; itu tidak membuktikan isolasi dua identitas di bawah owner/space yang sama.
- `listChecks`, `deleteCheck`, dan `askGibran` menggunakan `resolvePrincipal`; tabrakan principal dapat berdampak pada history dan akses hapus, bukan hanya bookmark.

**Skenario dampak:** jika local runtime dapat memberikan dua viewer dengan `ownerUserId` sama tetapi `userId` berbeda, keduanya dipetakan ke principal yang sama. Viewer non-owner dapat melihat riwayat check pemilik dan berpotensi menghapus baris milik principal tersebut. Perilaku untuk delegated agent/schedule juga belum dijelaskan secara eksplisit.

**Prasyarat:** runtime local mengizinkan beberapa user/delegate berbeda di bawah ownerUserId yang sama. Tipe SDK menunjukkan field terpisah, tetapi kontrak populasi dan semantiknya belum dibuktikan di staging. Tidak ada exploit runtime yang dijalankan.

**Mitigasi wajib:** minta kontrak provider yang menjelaskan semantik `userId`, `ownerUserId`, `isOwner`, dan `delegate`. Jika `userId` adalah identitas pemanggil, gunakan itu untuk principal per-user; definisikan perlakuan delegate secara terpisah. Jika runtime benar-benar single-principal, buktikan dan batasi artifact ke owner-only.

**Regression test:** buat dua LocalViewer dengan `ownerUserId` sama, `userId` berbeda, dan status owner/non-owner berbeda. Buktikan non-owner tidak dapat membaca, menghapus, atau mengubah history/saved state owner; tambahkan test untuk delegate agent/schedule sesuai kontrak provider.

## 5. Status link dan release

| Deliverable | Status | Bukti/keputusan |
|---|---|---|
| Project link — landing informasional | **SOURCE ONLY; NOT DEPLOYED** | `project-landing/landing/README.md` menyatakan tidak deployed dan tidak ada public URL terverifikasi. |
| Owner-only trial | **BLOCKED** | Tidak ada deployment terisolasi, owner-only server auth proof, staging DB/runtime, atau health check. |
| Community beta | **BLOCKED / NOT APPROVED** | F-057/F-058 baru; STAGE-P01/P02/P03, U-90, D-06, T-01 dan peran staging tetap blocked. |
| Link Scanner | **Disabled by default in development; live state NOT VERIFIED** | `checkLink` masih terdaftar di Actions map. Default module flag pada development bukan bukti kontrol pada live artifact. Jangan invoke/deploy. |
| External clean build | **BLOCKED** | D-06/F-047: SDK Hatch yang dapat didistribusikan dan build client eksternal belum terbukti. |
| T-01 second Hatch space | **BLOCKED** | Tidak ada perintah/tooling create-publish yang terbukti; tidak ada URL/health check eksternal. |

`STAGING_READINESS_V2324.md` mencatat enam peran staging (operator, runtime provider, egress owner, DB/runtime owner, alert recipient, rollback owner) masih UNASSIGNED/BLOCKED. Provider/runtime evidence yang diperlukan untuk `ctx.viewer`, scope `ctx.db`, egress/pinning, versi SQLite, dan SDK build juga belum tersedia.

## 6. Muse Handoff / Required Response

Otorisasi owner untuk implementasi di branch development tetap berlaku. Jangan meminta owner mengulang izin. Semua pekerjaan berikut tetap di `development`; jangan mengubah main source, produksi, live artifact, deployment config, DB/katalog produksi, atau mengaktifkan Link Scanner.

1. **Tutup F-057 — missing viewer fail-closed.**
   - Ubah saved-state path agar context tanpa viewer tidak otomatis memakai `<LEGACY>` pada shared/public runtime.
   - Pertahankan legacy state hanya jika ada mode local single-owner eksplisit yang dapat dibuktikan.
   - **Acceptance:** dua anonymous/missing-viewer contexts tidak dapat membaca, menulis, atau menimpa saved state satu sama lain; tes migration legacy tetap lulus.
   - **Evidence:** diff `actions.ts`, harness yang memanggil handler asli, raw log, exit code, SHA-256.

2. **Tutup F-058 — definisi principal local.**
   - Buktikan kontrak runtime untuk `userId`, `ownerUserId`, `isOwner`, dan `delegate`.
   - Perbaiki pemetaan principal bila `userId` adalah caller identity; jangan menganggap ownerUserId adalah identitas semua pemanggil.
   - **Acceptance:** dua local viewers dengan ownerUserId sama dan userId berbeda tidak berbagi history/saved state; owner/non-owner dan delegate behavior diuji.
   - **Evidence:** provider contract atau staging trace yang aman, source diff, tests dan log.

3. **Sinkronkan development ke main terbaru.**
   - Merge `main` HEAD `6167749dbdf0a8c5527c9f8497fb023182c52117` ke `development`; pertahankan seluruh 37 commit pengembangan dan jangan merge source development ke main.
   - **Acceptance:** compare `main...development` menunjukkan behind=0; catat merge commit dan HEAD baru. Tidak ada perubahan source pada main.
   - **Evidence:** commit SHA, compare output, changed-file list.

4. **Rekonsiliasi bukti v2.3.24.**
   - Pertahankan koreksi total 363/363 pada matriks main dan jelaskan bahwa development matrix 353/353 adalah angka historis yang salah hitung.
   - Tambahkan F-057/F-058 ke backlog. Jangan menyebut hash diverifikasi oleh audit independen jika hanya sidecar yang dibaca.
   - **Acceptance:** setiap log punya sidecar hash yang cocok dengan byte mentah; regression baseline + tes baru berjalan pada worktree bersih; tsc exit 0; command/runtime/SQLite/exit code dicatat.
   - **Evidence:** raw logs, hash output, manifest dan commit SHA.

5. **Jaga jalur menuju URL tetap jujur dan paralel.**
   - T-01 tetap feasibility-only. Landing page hanya boleh dipublikasikan sebagai artifact statis terpisah melalui tooling yang sudah diotorisasi; jangan mengubah workflow/deployment config, live artifact, DB, atau scanner.
   - **Acceptance project link:** HTTPS URL dapat diakses dari sesi eksternal, HTTP 200/health check, $0 cost, artifact/commit identity, dan bukti bahwa tidak ada backend/scanner yang terekspos.
   - **Acceptance owner-only trial/community beta:** semua isolasi, auth, DB, secret, scanner-denial, SSRF, resource, build, staging dan operational gates lulus. Hosting PASS bukan security PASS.

Setelah perubahan source, berikan full diff dan bukti sebelum meminta review berikutnya. Jangan membuat laporan status-only bila tidak ada bukti baru.

## 7. Kesimpulan

F-049..F-056 telah bergerak dari proposal ke implementasi development dengan bukti VM yang dapat ditelusuri. Namun, tenancy belum dapat dinyatakan selesai: F-057 menunjukkan fallback anonymous berbagi saved state, dan F-058 menunjukkan local principal tidak memakai userId yang tersedia di kontrak tipe. Keduanya memerlukan source/test fixes dan bukti runtime.

**Project link:** belum ada.  
**Owner-only trial:** blocked.  
**Community beta:** blocked.  
**Link Scanner:** jangan aktifkan.

**Release status tetap: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**
