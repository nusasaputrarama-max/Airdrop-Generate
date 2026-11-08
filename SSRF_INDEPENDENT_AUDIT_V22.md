# SSRF Independent Audit V22 — Principal Migration Tool Output Safety & Rollback Integrity

**Tanggal:** 8 November 2026 (WIB)  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Main HEAD saat audit:** `1b532e947f8e363404de38795b00a20c8112ac5b`  
**Development HEAD saat audit:** `b6f21384f4ab2bc378955b2b1e65cd083b1197f1`  
**Relasi:** `development` 50 ahead / 2 behind `main`; merge base `2bc34e1065efb99277f97700a2f12d241b04be56`  
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA

## 1. Ringkasan keputusan

Muse menjawab Audit V21 melalui v2.3.27. Perubahan source nyata ditemukan pada branch `development` untuk F-061..F-064 di CLI offline `evidence/v2326/principal-key-migration.ts`:

- mapping chain/cycle ditolak;
- sentinel `<LEGACY>` dan checks NULL-owner dapat diekspor melalui `archive-special`;
- rollback memvalidasi baris sebelum menulis, memeriksa affected-row count, dan memeriksa postcondition;
- guard menolak symlink sebagai path DB dan memeriksa realpath.

Muse melaporkan H-MIGR 18/18 PASS dan total regresi 394/394 PASS pada VM. Matriks v2.3.27 juga menyebut 2/2 sidecar SHA-256 baru cocok. Semua ini adalah bukti VM yang dilaporkan Muse, bukan staging. Auditor ini melakukan static source review; tidak menjalankan kode repository, tidak mengulang tes, dan tidak menghitung ulang hash.

Review source v2.3.27 menemukan empat risiko lanjutan pada tool migrasi:

- **F-065 High:** path output backup/archive tidak dilindungi; dapat menimpa DB atau file backup yang sudah ada, termasuk melalui symlink output.
- **F-066 Medium:** rollback menerima backup JSON yang tidak lengkap dan dapat melaporkan sukses tanpa memulihkan semua tabel.
- **F-067 Medium:** backup/archive yang berisi riwayat dan principal dibuat tanpa permission privat eksplisit.
- **F-068 Medium:** guard DB yang menolak symlink masih dapat dilewati oleh hard link ke inode database runtime.

Temuan ini berada pada tool offline/migrasi, bukan bukti bahwa database produksi telah disentuh. Tidak ada migrasi yang dijalankan, tidak ada DB yang diubah, dan tidak ada kode repository yang dieksekusi oleh auditor.

Project link Muse masih belum terverifikasi secara independen dan belum terbukti berasal dari source `landing/`. Tidak ada staging yang tersedia; tidak ada dasar untuk owner-only trial atau community beta.

## 2. Snapshot branch, commit, dan koordinasi

Branch yang ditemukan: `main`, `development`, `discussion-link-jadi`, `beta-readiness`, `project-landing`. Tidak ada branch bernama `dev`; `development` tetap branch implementasi.

| Branch | Ahead dari main | Behind dari main | Catatan |
|---|---:|---:|---|
| `main` | 0 | 0 | HEAD `1b532e9` |
| `development` | 50 | 2 | HEAD `b6f2138`; merge base `2bc34e1` |
| `discussion-link-jadi` | 2 | 18 | Dokumen diskusi lama |
| `beta-readiness` | 2 | 22 | Paket kesiapan, bukan deployment |
| `project-landing` | 2 | 14 | Source statis; README masih NOT DEPLOYED |

Commit penting:
- `6ac587ba9c67c2a4b4a326bdb86306080dc5b38f` — perubahan tool migrasi v2.3.27 pada `development`.
- `b6f21384f4ab2bc378955b2b1e65cd083b1197f1` — evidence H-MIGR v2.3.27.
- `9776a183e4ee989444a90fd865e00ccf26157b96` — merge Audit V21 dari `main` ke `development`.
- `54811393eb6a1592818a25fd1721e2fd5d8e849c` — dokumen matriks v2.3.27, desain, dan staging readiness di `main`.
- `1b532e947f8e363404de38795b00a20c8112ac5b` — pencatatan SHA main ke matriks.

Dua commit `main` setelah merge V21 ke `development` adalah dokumentasi v2.3.27. Compare pada snapshot audit menunjukkan `development` tertinggal dua commit dokumentasi tersebut. Setelah laporan V22 ini di-commit ke `main`, HEAD `main` maju ke `fb38b655e1fd55843995b7a7a09f75bbdc40f067` dan compare terbaru menunjukkan `development` 50 ahead / 3 behind. Muse harus menyinkronkan branch pengembangan ke HEAD `fb38b65` sebelum implementasi berikutnya; jangan merge source aplikasi ke `main`.

Tidak ada pull request terbuka. GitHub Actions API mengembalikan `total_count: 0` workflow runs. Combined status untuk HEAD main tidak memiliki status checks. Branch `main` dan `development` sama-sama `protected: false`; repository rulesets mengembalikan array kosong. Ini adalah governance gap yang masih terbuka (U-116).

## 3. Artefak yang ditinjau

| Artefak | Ref | Git blob SHA | Hasil |
|---|---|---|---|
| `evidence/v2326/principal-key-migration.ts` | development | `baab1180b9f47a6fd4af8ea944b1b547dcfe9a0f` | Static review fungsi guard, archive, rename, rollback, dan CLI dispatch |
| `evidence/v2327/test-principal-migration-v2327.ts` | development | `66ae5c2f01cd17d1f8ad2988cc64411e9aa41b63` | H-MIGR-09..18 ditinjau; tidak ada tes output-path collision, malformed backup, permission mode, atau hard link |
| `SSRF_RESPONSE_MATRIX_V2327.md` | main | `470efcb6bf9c982416c2fdc58de846fb6640d3b3` | Respons Muse V21 |
| `STAGING_READINESS_V2327.md` | main | `f6eb012487030e77720ca04203d9e62c0c0aa7ef` | Semua peran staging masih UNASSIGNED/BLOCKED |
| `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` | main | `355864c22a55a9da4685c86b3f5a691d4c958aea` | Protokol handoff langsung |
| `MUSE_IMPLEMENTATION_FIRST_DIRECTIVE.md` | main | `ad04e65404b817789f9a2f1b2d196c46d2112fb5` | Otorisasi development branch dan batas produksi |
| `GPT_RESPONSE_LINK_JADI.md` | discussion-link-jadi | `b582a33b2ca9bade63113e9fa123ad54d196885d` | Definisi project link vs application trial |
| `MUSE_DISCUSSION_LINK_JADI.md` | discussion-link-jadi | `69c2cc111e2c5d1ba8cdfdc41bfb04bb7126d8a1` | Pertanyaan dan konteks link |
| `SSRF_INDEPENDENT_AUDIT_V16.md` | main | `cda4f1d15ba54246f9fe376fe7ccaa8280c691c6` | Riwayat implementation-first dan batas link |
| `SSRF_INDEPENDENT_AUDIT_V17.md` | main | `5dfb438bb8f2598f911666608755cfc77d12c118` | Source landing page dan status deployment historis |

**Metode:** GitHub contents, commit metadata/diff, branch compare, workflow-run API, combined status, branch protection, dan static code review. Tidak ada kode yang dieksekusi. Tidak ada command test yang dijalankan auditor; exit code independen = NOT RUN. Hash sidecar Muse tidak dihitung ulang oleh auditor.

## 4. Response to Previous Handoff — Audit V21

| Permintaan V21 | Hasil independen V22 | Bukti / batas |
|---|---|---|
| F-061: tolak mapping chain/cycle | **Addressed pada development + VM evidence yang dilaporkan** | `validateMapping()` menolak irisan currentKey/legacyKey; H-MIGR-09..11 dilaporkan 3/3 PASS. |
| F-062: ekspor sentinel dan NULL-owner | **Addressed pada development + VM evidence yang dilaporkan** | `archive-special` read-only; H-MIGR-12..13 dilaporkan 2/2 PASS. |
| F-063: rollback precondition/affected rows/postcondition | **Addressed untuk backup valid; residual F-066** | H-MIGR-14..16 dilaporkan 3/3 PASS. Validasi struktur backup belum lengkap; backup dengan section hilang masih dapat dianggap sukses. |
| F-064: tolak symlink DB path | **Partially addressed** | `lstatSync` + `realpathSync`; H-MIGR-17 menguji symlink. Hard-link alias belum diuji dan tetap dapat melewati guard. |
| U-117: bukti project link | **Partially addressed oleh bukti Muse; NOT VERIFIED oleh auditor independen** | Muse melaporkan `share.shared=true` dan browser internal berhasil membuka URL. Percobaan browser eksternal auditor ke URL Muse gagal di lingkungan audit; tidak ada HTTP status. Artifact-to-source tetap NOT VERIFIED. |
| Sinkronisasi development | **Addressed pada baseline V21; stale lagi setelah dua commit dokumentasi main** | `development` 50 ahead / 2 behind main. |
| T-01, U-113/U-114, staging | **Tetap BLOCKED** | Staging readiness v2.3.27 menyatakan tidak ada staging, semua enam peran operasional belum terisi, kontrak provider dan mapping identitas belum tersedia. |

## 5. Temuan baru

### F-065 — High: output backup/archive dapat menimpa DB atau file yang sudah ada

**Klasifikasi:** confirmed source-level destructive path-safety gap.  
**Confidence:** tinggi.  
**Path:** `evidence/v2326/principal-key-migration.ts` — `archive()` line 219, `archiveSpecial()` line 248, `rename()` line 339; input validation/DB open di `main()` line 486.

**Bukti:** ketiga fungsi menulis langsung dengan `writeFileSync(outPath/backupPath, ...)`. Tidak ada pemeriksaan bahwa output berbeda dari `dbPath`, tidak ada pemeriksaan symlink/inode pada output, dan tidak ada exclusive-create flag. `writeFileSync` mengikuti symlink dan memotong file yang sudah ada. `guardDbPath()` hanya memeriksa input `dbPath`, bukan `--out` atau `--backup`.

**Skenario dampak:** operator memberi `--backup` atau `--out` yang sama dengan path DB, symlink ke DB runtime, atau path backup lama. Tool dapat menimpa file tersebut; pada kasus output yang menunjuk DB runtime, ini dapat merusak DB walaupun input `dbPath` adalah salinan yang aman. Reusing backup path juga dapat menghapus satu-satunya backup pemulihan sebelumnya.

**Prasyarat:** path output salah, sudah ada, atau menunjuk file lain melalui symlink/hard link. Tidak ada bukti kejadian ini pernah terjadi.

**Mitigasi:** resolve output path sebelum menulis; tolak symlink; bandingkan realpath dan identitas file (device/inode) terhadap DB input dan path runtime yang diketahui; buat output dengan exclusive-create (`wx`) dan mode privat; jangan pernah overwrite; tulis secara atomik dan verifikasi file selesai sebelum memulai transaksi DB.

**Regression tests wajib:** output sama dengan DB path; output symlink menuju DB; output hard link menuju DB; output path sudah ada; output mengarah ke path runtime terlarang. Semua memakai DB disposable dan sentinel file, serta membuktikan tidak ada file target yang berubah.

### F-066 — Medium: rollback menerima backup dengan section hilang dan dapat melaporkan sukses palsu

**Klasifikasi:** confirmed source-level rollback integrity gap.  
**Confidence:** tinggi.  
**Path:** `evidence/v2326/principal-key-migration.ts:378-398` dan blok postcondition rollback.

**Bukti:** validasi awal hanya memeriksa `mode === "rename-backup"`, `mapping` berupa array, dan `rows` bertipe object. Selanjutnya `backup.rows.checks ?? []`, `saved_projects ?? []`, dan `projects ?? []` mengubah section yang hilang menjadi array kosong. Mapping kosong juga tidak ditolak pada rollback. Dengan JSON valid seperti `{"mode":"rename-backup","mapping":[],"rows":{}}`, semua loop tidak melakukan pekerjaan, row counts tidak berubah, transaksi dapat COMMIT, dan fungsi mencetak bahwa rollback berhasil.

**Dampak:** backup yang tidak lengkap atau telah diedit dapat membuat tool menyatakan pemulihan berhasil padahal sebagian/seluruh baris masih berada pada principal hasil rename. Ini melemahkan jaminan F-063.

**Prasyarat:** file backup valid secara sintaks JSON tetapi kehilangan satu atau lebih section, mapping, atau record; bisa akibat edit manual, proses penyalinan yang salah, atau file backup yang tidak sesuai versi.

**Mitigasi:** validasi schema backup secara ketat sebelum membuka transaksi: nama tool, versi yang didukung, mode, mapping non-empty dan valid, ketiga array tabel wajib ada dan bertipe array, row shape/PK lengkap, counts konsisten, serta manifest/hash backup cocok. Jangan gunakan default array kosong untuk section wajib. Tolak backup yang tidak lengkap dengan exit nonzero tanpa write.

**Regression tests wajib:** rows kosong; setiap section tabel hilang satu per satu; section bukan array; mapping kosong; mapping duplikat/malformed; versi tidak didukung; count/hash mismatch. Semua harus exit nonzero dan DB tidak berubah.

### F-067 — Medium: backup/archive tidak dibuat dengan permission privat eksplisit

**Klasifikasi:** confirmed confidentiality design gap; keterpaparan aktual bergantung pada OS dan umask.  
**Confidence:** tinggi untuk ketiadaan permission eksplisit; medium untuk dampak pada host tertentu.  
**Path:** `evidence/v2326/principal-key-migration.ts:219,248,339`.

**Bukti:** `writeFileSync` dipanggil tanpa mode privat, exclusive-create, atau enkripsi. File archive/backup memuat URL riwayat pemeriksaan, verdict/score, principal key, bookmark/task state, dan provenance. Pada sistem POSIX, mode pembuatan default mengikuti umask; umask umum 022 dapat menghasilkan file yang dapat dibaca user lokal lain.

**Dampak/prasyarat:** jika tool dijalankan di VM/host bersama atau direktori yang dapat dibaca user lain, data yang diekspor dapat terbaca di luar operator yang berwenang. Tidak ada bukti file tertentu telah terekspos.

**Mitigasi:** buat file dengan permission 0600 dan exclusive-create; tolak overwrite; simpan di direktori privat yang diverifikasi; bila perlu transfer/penyimpanan bersama, enkripsi archive dan hapus salinan sementara secara aman. Dokumentasikan retensi dan pemilik file.

**Regression tests wajib:** periksa permission file setelah pembuatan pada POSIX; pastikan tidak group/world-readable; pastikan file existing tidak ditimpa; pastikan mode gagal tertutup jika permission privat tidak dapat diterapkan.

### F-068 — Medium: hard-link alias masih melewati guard DB F-064

**Klasifikasi:** confirmed guard design gap; belum ada bukti tool dijalankan terhadap live DB melalui hard link.  
**Confidence:** tinggi.  
**Path:** `evidence/v2326/principal-key-migration.ts:125-146` (`guardDbPath`) dan `:486` (`new Database(dbPath)`).

**Bukti:** `lstatSync` menolak hanya symbolic link. Hard link tampak sebagai regular file; `realpathSync` mengembalikan nama alias, bukan path kanonis inode. Jika alias hard link tidak bernama `app.db` dan tidak berada di path yang mengandung `ts-spaces`, pemeriksaan basename/substring dapat lolos. `new Database(dbPath)` kemudian membuka inode yang sama. H-MIGR-17 hanya menguji symbolic link dan symlinked directory; tidak menguji hard link.

**Dampak/prasyarat:** operator membuat hard link ke DB runtime di lokasi yang tampak seperti salinan, lalu menjalankan mode writable. Operasi dapat mengubah inode database runtime meskipun nama path alias terlihat aman.

**Mitigasi:** jangan menganggap realpath cukup untuk membuktikan copy. Tolak hard-link aliases dengan pemeriksaan device/inode terhadap semua lokasi runtime yang diketahui; gunakan workflow snapshot/copy eksplisit dengan verifikasi independen; jalankan tool hanya pada direktori kerja yang di-allowlist dan tidak dapat mengakses runtime DB. Catat residual TOCTOU antara pemeriksaan path dan pembukaan file.

**Regression tests wajib:** hard link dari DB runtime fixture ke nama alias yang aman harus ditolak; salinan byte terpisah harus diterima; uji symlink yang sudah ada tetap dipertahankan. Semua menggunakan DB disposable.

## 6. Project link, T-01, dan status staging

**Project link informasional:** Muse melaporkan static artifact slug `airdrop-generate` memiliki `share.shared=true` dan browser internal berhasil membuka URL pada 8 November 2026 sekitar 21:18–21:20 WIB. URL yang dilaporkan:

`https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`

Auditor ini mencoba membuka URL tersebut dari browser eksternal, tetapi domain tidak dapat diakses melalui environment audit. HTTP status tidak diperoleh. Karena itu status independen adalah **NOT VERIFIED**, bukan PASS. `landing/README.md` pada branch `project-landing` (blob `a08ad38a9641435989557be976be284d13e05517`) masih menyatakan **NOT DEPLOYED — NO PUBLIC URL VERIFIED**. Tidak ada build/publish provenance yang menghubungkan artifact Muse ke commit/source `landing/index.html`; artifact-to-source tetap NOT VERIFIED. Artifact yang dilaporkan adalah project link informasional, bukan scanner atau application trial.

**T-01:** tetap BLOCKED; tidak ada jawaban baru tentang second Hatch space, subdomain gratis, akses owner-only, biaya, runtime, atau health check.

**Staging:** tidak tersedia. STAGING_READINESS_V2327 menyatakan enam peran staging belum terisi, provider contract belum tersedia, egress owner/DB owner/alert recipient/rollback owner belum ditetapkan. Hasil VM tidak boleh dipromosikan menjadi staging evidence.

## 7. Gate dan status rilis

| Gate | Status |
|---|---|
| F-061..F-063 | Addressed di development + VM evidence yang dilaporkan; staging pending |
| F-064 | Symlink path ditangani; hard-link residual F-068 masih OPEN |
| F-065..F-068 | OPEN — perlu implementasi dan regression tests |
| F-058/U-113 provider identity contract | BLOCKED |
| F-060/U-114 mapping identitas lama yang sah | BLOCKED; tool belum boleh dijalankan pada DB berisi data lama |
| F-019 scanner disabled pada semua invocation path | NOT VERIFIED; checkLink tidak di-invoke |
| U-116 CI/branch governance | OPEN; 0 workflow runs, no status checks, main/development unprotected |
| U-117 artifact-to-source project link | NOT VERIFIED |
| T-01 second Hatch space | BLOCKED |
| Staging G-E | BLOCKED |

Status tetap **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA**.

## 8. Muse Handoff / Required Response

Muse boleh melanjutkan implementasi pada branch `development` sesuai direktif owner. Jangan mengubah `main` selain dokumen audit/handoff, jangan mengubah produksi, dan jangan mengaktifkan Link Scanner.

1. **F-065 — amankan output path.** Ubah `archive()`, `archiveSpecial()`, dan `rename()` agar output tidak dapat menunjuk DB input/runtime, symlink/hard-link alias, atau file existing. Gunakan exclusive-create dan permission privat.  
   **Acceptance criteria:** semua collision/alias/existing-path tests ditolak tanpa perubahan DB/file target; valid path baru berhasil; diff dan log mentah tersedia.

2. **F-066 — validasi backup schema/integrity.** Validasi nama tool, versi, mode, mapping non-empty, semua table arrays wajib, row schema, counts, dan manifest/hash sebelum rollback.  
   **Acceptance criteria:** backup kosong, section hilang, tipe salah, mapping kosong, versi salah, dan integrity mismatch semuanya exit nonzero tanpa write; backup valid tetap rollback normal.

3. **F-067 — proteksi data ekspor.** Buat backup/archive dengan permission 0600, exclusive-create, dan retensi yang jelas.  
   **Acceptance criteria:** test stat mode membuktikan file tidak group/world-readable; file existing tidak pernah ditimpa; jika filesystem tidak mendukung mode privat, tool fail closed.

4. **F-068 — tutup hard-link guard gap.** Tambahkan pemeriksaan file identity terhadap lokasi runtime yang diketahui dan workflow copy/snapshot terverifikasi. Dokumentasikan residual TOCTOU; jangan menyebut realpath sebagai bukti bahwa file pasti salinan.  
   **Acceptance criteria:** hard link fixture ke runtime DB ditolak; salinan byte terpisah diterima; symlink tests tetap PASS.

5. **Sinkronisasi branch.** Merge/sinkronkan seluruh commit `main` yang belum ada di `development`, termasuk V21 response docs dan Audit V22; current main HEAD setelah audit adalah `fb38b655e1fd55843995b7a7a09f75bbdc40f067`.  
   **Acceptance criteria:** compare `main...development` menunjukkan behind=0; source aplikasi tetap hanya di development; catat merge base, commit SHA, dan diff.

6. **Project link provenance.** Berikan artifact ID/slug, source commit yang benar-benar dipakai saat build, build/publish log, dan health-check eksternal. Jangan mengklaim landing source sudah live tanpa provenance.  
   **Acceptance criteria:** URL HTTPS dapat dibuka dari sesi eksternal; dokumentasikan respons/health check dan isi yang tampil; scanner/API/backend tidak terekspos. Jika tooling tidak menyediakan static publish terpisah, catat keterbatasan spesifik dan jangan mengarang URL.

7. **CI dan staging.** Jelaskan kenapa GitHub Actions masih 0 workflow runs dan main/development tidak protected; usulkan CI reproducible tanpa mengubah production/deployment. Tetap catat staging roles yang belum terisi dan blocker provider/T-01.  
   **Acceptance criteria:** clean build/test dari environment non-Hatch dapat direproduksi atau blocker SDK dijelaskan dengan bukti provider; staging evidence tetap dipisahkan dari VM.

Untuk setiap butir, sertakan exact path/function, commit SHA, command, runtime/version, exit code, raw stdout/stderr, dan SHA-256 sidecar. Jangan mengulang harness lama yang valid kecuali implementasi/harness/environment berubah. Jangan jalankan migrasi pada live DB atau database berisi data nyata.

## 9. Bukti, command, dan batas audit

**Muse-reported VM evidence v2.3.27:**
- `bun evidence/v2327/test-principal-migration-v2327.ts` — H-MIGR 10/10 PASS; log SHA-256 `e2c267810a59ba7fc237aa7bf8df0e48e271bf0a849ed3f3c1a640c57eedde57`.
- `bun evidence/v2326/test-principal-migration-v2326.ts` — H-MIGR 8/8 PASS; log SHA-256 `fcb8128cc7cae869a2a9f1c38af99ede4ebe624ef88e1540de2a8979281efade`.
- Total regresi dilaporkan 394/394 PASS; 2/2 sidecar baru cocok menurut Muse.
- Runtime yang dilaporkan: Bun 1.4.4, bun:sqlite 3.53.4, sqlite3 CLI 3.45.1.
- Evidence commit: `b6f21384f4ab2bc378955b2b1e65cd083b1197f1`.

**Independent auditor:** tidak menjalankan command test, tidak menjalankan migration CLI, tidak mengakses DB, tidak melakukan fetch URL scanner, dan tidak menghitung ulang SHA sidecar. Independent test exit code = NOT RUN. Status source findings berasal dari static review GitHub contents.

Tidak ada deployment, staging, produksi, atau live artifact yang diubah. Tidak ada wallet/signing/transaction. Link Scanner tidak di-invoke.

---
**Post-audit update:** Audit V22 committed to `main` as `fb38b655e1fd55843995b7a7a09f75bbdc40f067`. A fresh compare confirms `development` is now 50 ahead / 3 behind `main`; this includes the V22 handoff and must be synchronized before the next implementation commit.  

**End of Audit V22.**  
**Next review trigger:** respons Muse terhadap F-065..F-068 dengan perubahan source dan evidence baru, staging/provider evidence, atau bukti artifact-to-source project link yang dapat diverifikasi independen.
