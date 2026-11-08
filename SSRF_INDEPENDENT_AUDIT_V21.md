# SSRF Independent Audit V21 — Review v2.3.26 Principal-Key Migration Tool

**Tanggal:** 8 November 2026 (WIB)  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Main HEAD saat audit:** `0832bed321668e1eaa7f0276c36826589da17b29`  
**Development HEAD menurut matriks Muse:** `e11e8d13172d75e8ea8412754e5787b89d189465`  
**Relasi saat audit:** `development` 47 ahead / 2 behind `main`; merge base `77317c3a6715ef42f1e0fca23e99c64a735f4e50`  
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA

## 1. Ringkasan keputusan

Muse menjawab Audit V20 melalui v2.3.26. Perubahan source nyata ditemukan di branch `development`:

- F-059 ditutup secara struktural: `LOCAL_SINGLE_OWNER_MODE`, setter/getter, dan `LEGACY_PRINCIPAL` dihapus dari handler. `savedPrincipal()` kini mengembalikan principal hasil `resolvePrincipal()`; missing/unknown viewer tetap null.
- F-060 ditangani sebagian melalui CLI offline `evidence/v2326/principal-key-migration.ts`. Tool menyediakan inventory, archive untuk key eksplisit, rename transaksional, backup, dan rollback. Mapping `userId`↔`ownerUserId` yang benar tetap belum tersedia; deployment ke DB berisi data lama tetap BLOCKED.
- Muse melaporkan regresi 384/384 PASS dan 19/19 sidecar SHA-256 cocok pada VM. Ini bukti pelaksana VM, bukan staging. Audit ini tidak menjalankan ulang suite dan tidak menghitung ulang hash tersebut.

Review independen atas CLI migrasi menemukan empat masalah baru yang harus diperbaiki sebelum tool dipakai pada database yang berisi data:

- **F-061 High:** mapping berantai dapat memindahkan baris principal pertama ke pemilik yang salah karena UPDATE dilakukan berurutan.
- **F-062 Medium:** baris `<LEGACY>` dan owner NULL disebut archive-only, tetapi jalur archive tidak dapat mengekspornya.
- **F-063 Medium:** rollback tidak memeriksa jumlah baris yang benar-benar dipulihkan dan dapat melaporkan sukses pada rollback parsial.
- **F-064 Medium:** guard path database dapat dilewati dengan symlink; tool yang menulis DB belum membuktikan bahwa target benar-benar salinan.

Ada pula **U-117 — bukti status project link tidak konsisten** antara matriks dan staging readiness. Muse melaporkan sebuah static artifact telah di-share dan URL-nya merespons, tetapi tabel staging pada dokumen yang sama menyatakan share belum aktif. Browser independen audit ini tidak dapat mengambil domain Muse (DisabledError), sehingga akses publik belum diverifikasi ulang oleh auditor ini.

Tidak ada perubahan source aplikasi di `main`, tidak ada staging, tidak ada deployment baru yang diverifikasi, dan Link Scanner tidak dijalankan.

## 2. Snapshot branch dan koordinasi

Branch yang ditemukan: `main`, `development`, `discussion-link-jadi`, `beta-readiness`, `project-landing`. Tidak ada branch bernama `dev`; `development` tetap branch implementasi.

| Branch | Ahead dari main | Behind dari main | Catatan |
|---|---:|---:|---|
| `main` | 0 | 0 | HEAD `0832bed` |
| `development` | 47 | 2 | Source v2.3.26 dan evidence; merge base `77317c3` |
| `discussion-link-jadi` | 2 | 15 | Dokumen diskusi |
| `beta-readiness` | 2 | 19 | Paket kesiapan, bukan deployment |
| `project-landing` | 2 | 11 | Source landing statis |

Dua commit `main` setelah merge Muse V20 ke `development` adalah dokumentasi v2.3.26:
- `d84110c2c7e47fdf2a296dbafaab7c66f0bcca15` — matriks v2.3.26, desain D.4.37, staging readiness.
- `0832bed321668e1eaa7f0276c36826589da17b29` — pencatatan SHA main ke matriks.

Dengan demikian, klaim sinkronisasi V20 benar untuk baseline `77317c3`, tetapi `development` kembali tertinggal dua commit dokumentasi. Setelah Audit V21 ini masuk `main`, Muse harus menyinkronkan `development` dengan HEAD `main` yang baru. Jangan merge source `development` ke `main`.

Tidak ada pull request terbuka yang ditemukan. Matriks v2.3.26 melaporkan 0 workflow runs, branch `main` dan `development` tidak protected, dan tidak ada required checks; status governance ini tetap perlu ditindaklanjuti. Audit ini tidak memiliki endpoint GitHub Actions/branch-protection yang memungkinkan verifikasi ulang penuh atas seluruh workflow runs dan ruleset.

## 3. Artefak yang ditinjau

| Artefak | Ref | Blob SHA | Hasil |
|---|---|---|---|
| `site/server/src/actions.ts` | development | `155255786e153ba3750152836a7982e281773d22` | F-059 dan principal handler ditinjau |
| `evidence/v2326/principal-key-migration.ts` | development | `8542cc915066cffbba92d98a11e30bbcbf4283a2` | CLI offline ditinjau penuh |
| `evidence/v2326/test-principal-migration-v2326.ts` | development | `61601ad2700bf675f891a821faf1d4370047f771` | H-MIGR-01..08 ditinjau |
| `SSRF_RESPONSE_MATRIX_V2326.md` | main | `a38ec0f9a133e555a1aba90d288f69e1af9b1b07` | Respons Muse V20 |
| `STAGING_READINESS_V2326.md` | main | `d526f1e68f36b1f966c389299a23d8c375ceb9ca` | Staging roles dan blockers |
| `landing/README.md` | project-landing | `a08ad38a9641435989557be976be284d13e05517` | Source branch menyatakan NOT DEPLOYED |

**Metode dan batas audit:** pembacaan GitHub contents, commit metadata/diff, compare refs, dan static source review. Tidak ada kode repository yang dieksekusi oleh auditor. Tidak ada perintah lokal yang dijalankan; exit code pengujian independen = NOT RUN, bukan PASS. Hash log yang disebut Muse tidak dihitung ulang. Log H-MIGR yang dirujuk matriks Muse memiliki SHA-256 `fcb8128cc7cae869a2a9f1c38af99ede4ebe624ef88e1540de2a8979281efade`; angka itu dicatat sebagai klaim/artefak Muse, bukan hash yang dihitung auditor.

## 4. Response to Previous Handoff — Audit V20

| Permintaan V20 | Hasil independen V21 | Bukti / sisa risiko |
|---|---|---|
| F-059: hapus jalur legacy saved-state | **Addressed pada source development; VM evidence dilaporkan** | `actions.ts:211-225, 266-270`; `savedPrincipal()` mendelegasikan ke `resolvePrincipal()`. H-AN2 6/6 dilaporkan Muse. Runtime provider tetap belum diuji di staging. |
| F-060/U-114: kompatibilitas principal lama | **Partially addressed; deployment tetap BLOCKED** | Tool offline tersedia, tetapi mapping terverifikasi belum ada. Review tool menemukan F-061..F-064 di bawah. |
| U-113: kontrak provider `userId`/identity | **BLOCKED** | Matriks v2.3.26 menyatakan hanya deklarasi tipe SDK dan tidak ada pernyataan provider/staging trace. |
| Sinkronisasi development | **Addressed pada baseline V20, stale lagi** | Merge `f93aa72` membawa main `77317c3`; dua commit main dokumentasi terbaru belum ada di development. |
| Project link terpisah | **Partially addressed; bukti status bertentangan** | Matriks §2.5 menyebut `share.shared=true` dan URL aktif; STAGING_READINESS baris 20 menyebut `share.shared=false`. URL tidak dapat diambil oleh browser independen audit ini. |
| D-06/F-047 build portability | **Tetap BLOCKED menurut bukti Muse** | npm registry 404 dan SDK build-client contract belum terselesaikan; tidak ada clean external build baru. |

## 5. Temuan baru — principal-key migration tool

### F-061 — High: mapping berantai dapat mengalihkan data ke principal yang salah

**Klasifikasi:** confirmed source-level data-integrity flaw; belum ada bukti tool dijalankan pada DB nyata.  
**Confidence:** tinggi.  
**Path/lines:** `evidence/v2326/principal-key-migration.ts:175-195` (`validateMapping`) dan `:235-238` (`rename`).

**Bukti:** `validateMapping()` memeriksa duplikasi `legacyKey` dan duplikasi `currentKey` secara terpisah. Ia tidak menolak ketika suatu `currentKey` juga muncul sebagai `legacyKey` pada entri lain. `rename()` kemudian menjalankan UPDATE berurutan untuk setiap mapping pada setiap tabel.

**Skenario:** mapping `A → B` dan `B → C` diterima. Ketika UPDATE pertama memindahkan baris A menjadi B, UPDATE kedua yang mencari B juga akan memindahkan baris A tersebut ke C. Hasil akhir bergantung pada urutan array mapping. Ini dapat menggabungkan history/provenance dua pemilik ke principal yang salah. Pre-check collision hanya memeriksa composite PK `saved_projects` per mapping; ia tidak mencegah cascade pada `checks` dan `projects`, dan tidak menyelesaikan masalah urutan.

**Prasyarat:** mapping operator mengandung target yang sama dengan source key lain. Karena key lama dan baru sama-sama berbentuk `local:<id>`, overlap tidak dapat diasumsikan mustahil.

**Mitigasi:** tolak seluruh mapping jika himpunan `currentKey` beririsan dengan himpunan `legacyKey`, atau lakukan transformasi dua fase melalui temporary namespace/CTE yang mempertahankan snapshot original. Verifikasi per-key counts dan pemilik akhir untuk ketiga tabel sebelum COMMIT.

**Regression tests wajib:** A→B + B→C, A↔B cycle, mapping yang sama dalam urutan terbalik, dan collision di masing-masing tabel. Semua harus ditolak atau menghasilkan pemetaan yang identik tanpa bergantung pada urutan.

### F-062 — Medium: sentinel `<LEGACY>` dan owner NULL tidak dapat diarsipkan

**Klasifikasi:** confirmed source/design mismatch; bukan klaim data telah hilang.  
**Confidence:** tinggi.  
**Path/lines:** komentar tool `:19-22`; inventory `:130-133`; archive `:136-166`; guard sentinel `:140-143`.

**Bukti:** dokumentasi menyebut baris `<LEGACY>` dan checks dengan owner NULL sebagai “archive-only”. Inventory hanya menghitung dan menampilkan jumlahnya. Namun `archive()` secara eksplisit menolak `<LEGACY>`, menerima hanya string keys, dan melakukan query `column = ?`; mekanisme tersebut tidak dapat mengambil nilai SQL NULL. Tidak ada jalur archive khusus untuk kedua kategori tersebut. H-MIGR-02 juga secara eksplisit mengharuskan archive output tidak memuat `<LEGACY>`, sedangkan H-MIGR-06 hanya menguji penolakan rename sentinel.

**Dampak:** data saved-state sentinel dan checks NULL-owner tetap tidak dapat diekspor melalui tool, meskipun komentar menyatakan archive-only. Data tersebut tidak boleh ditebak pemiliknya atau di-rename.

**Mitigasi:** tambahkan mode archive khusus untuk sentinel dan NULL dengan output yang jelas/terpisah, atau ubah dokumentasi dan status readiness untuk menyatakan data tersebut tidak dapat diekspor. Jangan menggabungkan atau menghapusnya otomatis.

**Regression tests wajib:** arsip sentinel `saved_projects`, arsip checks NULL-owner, verifikasi jumlah baris dan isi ekspor, serta bukti DB tidak berubah.

### F-063 — Medium: rollback dapat melaporkan sukses meski pemulihan parsial

**Klasifikasi:** confirmed source-level rollback verification gap.  
**Confidence:** tinggi.  
**Path/lines:** `evidence/v2326/principal-key-migration.ts:263-302`; H-MIGR-07 pada `evidence/v2326/test-principal-migration-v2326.ts`.

**Bukti:** rollback melakukan UPDATE checks/projects berdasarkan ID dan saved_projects berdasarkan current principal + project_id, tetapi tidak memeriksa `changes` dari setiap UPDATE, tidak memverifikasi seluruh baris backup ditemukan, dan tidak menjalankan postcondition atas principal key. Setelah COMMIT, fungsi mencetak “restored original keys” dan menampilkan before/after row counts tanpa membandingkan hasil dengan jumlah baris yang diharapkan.

**Skenario:** setelah rename, sebuah baris dihapus atau principal-nya berubah. UPDATE saved_projects dapat memengaruhi nol baris; UPDATE checks/projects dapat menimpa principal baru yang sah karena hanya mencocokkan ID. Tool tetap dapat exit 0 dan melaporkan rollback berhasil meskipun hasil tidak lengkap atau menimpa perubahan ownership setelah migrasi.

**Mitigasi:** sebelum rollback, validasi bahwa setiap row backup masih ada dan berada pada currentKey yang diharapkan; tolak bila state telah berubah. Periksa affected-row count setiap UPDATE, verifikasi postcondition per tabel/key sebelum COMMIT, dan ROLLBACK bila ada mismatch.

**Regression tests wajib:** baris hilang, principal berubah pasca-rename, konflik saved_projects, dan rollback parsial harus ditolak dengan exit nonzero serta DB tidak berubah.

### F-064 — Medium: guard path DB dapat dilewati melalui symlink

**Klasifikasi:** plausible operational safety risk / design gap.  
**Confidence:** tinggi untuk kelemahan guard source; belum ada bukti pemakaian symlink terhadap DB live.  
**Path/lines:** `evidence/v2326/principal-key-migration.ts:89-96` (`guardDbPath`) dan pemanggilan `new Database(dbPath)` di `main()`.

**Bukti:** guard hanya memeriksa basename string sama dengan `app.db` dan apakah string path mengandung `ts-spaces`. Ia tidak memeriksa `lstat`, `realpath`, atau apakah path adalah symlink. Database driver membuka path yang diberikan; nama alias seperti `backup.sqlite` yang merupakan symlink ke `app.db` tidak akan cocok dengan dua pemeriksaan tersebut. Mode `rename` membuka DB writable.

**Dampak/prasyarat:** operator yang salah menunjuk symlink/path alias ke DB runtime dapat mengubah file target meskipun komentar tool menyatakan hanya boleh dipakai pada salinan. Tidak ada bukti kejadian ini pernah terjadi.

**Mitigasi:** tolak symlink sebelum open, resolve realpath, gunakan allowlist direktori salinan/snapshot yang terpisah dari runtime data, dan pisahkan inventory read-only dari operasi write. Dokumentasikan bahwa path check bukan bukti kriptografis bahwa DB adalah salinan; pertimbangkan copy-and-verify workflow yang eksplisit.

**Regression tests wajib:** literal `app.db`, symlink bernama lain menuju `app.db`, symlink ke direktori runtime, dan jalur salinan yang sah. Semua uji menggunakan DB disposable.

## 6. U-117 — status project link tidak konsisten

**Klasifikasi:** evidence/documentation inconsistency; bukan temuan keamanan aplikasi.  
**Confidence:** tinggi bahwa dua pernyataan berbeda ada di dokumen; status runtime aktual belum diverifikasi auditor ini.

- `SSRF_RESPONSE_MATRIX_V2326.md` §2 butir 5 menyatakan artifact `airdrop-generate` memiliki `share.shared=true`, memberi URL `https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`, dan menyebut browser eksternal menampilkan judul “Airdrop Generate”.
- `STAGING_READINESS_V2326.md` baris 20 menyatakan URL publik landing belum diverifikasi, `share.shared=false`, dan user belum meminta share.
- `landing/README.md` pada branch `project-landing` menyatakan source folder itu NOT DEPLOYED. Ini dapat konsisten bila artifact Muse dibuat terpisah dari source branch, tetapi hubungan artifact-to-source belum dibuktikan.

Percobaan `web.open` oleh auditor pada URL di atas gagal dengan `DisabledError`; ini adalah keterbatasan alat pemeriksa, bukan bukti URL mati.

**Required resolution:** satu snapshot bertanggal dari artifact status yang memuat slug, share flag, URL, source artifact/revision, dan timestamp; satu hasil browser eksternal terbaru dengan HTTP status/title; jelaskan apakah artifact tersebut dibuat dari `landing/` atau dari konten lain. Sampai itu tersedia, klasifikasikan sebagai **Muse-reported project link; external access not independently verified in this audit**. Jangan menyebutnya application trial.

## 7. Status deliverable dan release

| Deliverable | Status V21 |
|---|---|
| Project link informasional | Muse melaporkan static artifact shared dan memberi URL; audit independen belum dapat mengambilnya. Kategori: project link saja. |
| Source `project-landing/landing/` | Tetap source terpisah; README menyatakan NOT DEPLOYED / NO PUBLIC URL VERIFIED. |
| T-01 — Hatch second application space | BLOCKED / NOT VERIFIED |
| Owner-only application trial | BLOCKED |
| Community beta | NOT READY |
| Link Scanner live/disabled | Status runtime tidak terverifikasi. Jangan invoke action dan jangan aktifkan scanner. |

F-047/D-06 SDK redistributable dan external build contract tetap BLOCKED menurut matriks v2.3.26. U-113 provider identity semantics dan U-114 mapping principal lama belum selesai. Staging roles 1–6 pada readiness v2.3.26 masih UNASSIGNED; tidak ada bukti staging baru.

## 8. Muse Handoff / Required Response

Muse boleh melanjutkan implementasi di branch development terisolasi sesuai otorisasi owner dan `MUSE_IMPLEMENTATION_FIRST_DIRECTIVE.md`. Jangan meminta owner mengulang izin untuk perubahan development. Urutan kerja:

1. **F-061 — mapping order/cascade:** perbaiki validator/algoritma rename agar tidak bergantung pada urutan; tambahkan chain/cycle/permutation tests. Acceptance: seluruh pemetaan ditolak atau menghasilkan hasil identik tanpa cross-principal reassignment; bukti DB disposable + log mentah + SHA-256.
2. **F-062 — archive sentinel/NULL:** sediakan export aman untuk sentinel dan NULL-owner atau dokumentasikan secara eksplisit bahwa keduanya tidak dapat diarsipkan. Acceptance: H-MIGR tambahan membuktikan row counts, isi archive, dan DB tetap tidak berubah.
3. **F-063 — rollback integrity:** validasi exact expected rows/current keys, affected-row counts, dan postconditions; rollback harus abort bila state berubah. Acceptance: missing/changed/collision tests fail-closed tanpa partial commit.
4. **F-064 — DB path safety:** tolak symlink/path alias menuju runtime DB dan pisahkan mode read-only/write. Acceptance: symlink negative tests menolak target runtime, salinan disposable yang sah tetap dapat diuji. Jangan pernah mencoba tool ini pada live DB.
5. **U-117 — project link evidence:** rekonsiliasi `share.shared` dan berikan snapshot artifact status + external health check terbaru. Jelaskan sumber artifact dan batasannya. Jangan mengubah live full-stack artifact atau workflow/deployment config repo.
6. **Branch sync:** setelah audit ini masuk `main`, sinkronkan `development` dari HEAD `main` terbaru sambil mempertahankan semua commit implementasi. Jangan merge `development` ke `main`.
7. **Staging/build:** lanjutkan F-047, U-113, U-114, T-01, dan penetapan staging roles. Bila satu blocker belum dapat diselesaikan, kerjakan perbaikan source lain yang aman dan catat blocker/owner/percobaan/hasil.

Setiap item harus memiliki path, test ID, raw log, command, exit code, SHA-256, dan label VM/staging. Jangan menandai temuan closed hanya karena dokumentasi berubah.

## 9. Batas keras

- Tidak ada perubahan source aplikasi, schema, migration, deployment, workflow, atau database di `main`.
- Tidak ada operasi pada live/production DB; seluruh pengujian tool migrasi wajib memakai DB disposable/copy yang diverifikasi.
- Tidak ada deployment scanner, external URL fetch, wallet/signing/transaction, atau penggunaan production secrets/data.
- Tidak ada destructive/production testing.
- Status tetap **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE** sampai staging gates lulus dan ada persetujuan terpisah.

**Kesimpulan:** v2.3.26 menutup F-059 pada source development dan menyediakan tool awal untuk F-060, tetapi tool migrasinya sendiri belum aman untuk digunakan pada data nyata. Project link statis dilaporkan ada, namun bukti share state perlu direkonsiliasi. Fokus berikutnya adalah memperbaiki tool migrasi dan memperoleh bukti eksternal/runtime, bukan mengklaim aplikasi sudah siap.
