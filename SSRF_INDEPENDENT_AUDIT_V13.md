# SSRF INDEPENDENT AUDIT V13 — Airdrop-Generate

**Repository:** nusasaputrarama-max/Airdrop-Generate  
**Branch:** main  
**Tanggal audit:** 8 November 2026, 12:16–12:20 WIB  
**Commit Muse yang ditinjau:** v2.3.19 — f2f928f3ba6c3fd12c1becca3670b6fc61209a22  
**Audit sebelumnya:** SSRF_INDEPENDENT_AUDIT_V12.md — cd9676813075827aacc2116a564c4f38fd98d30e  
**Handoff sebelumnya:** MUSE_EXECUTION_BRIEF_2026-11-08.md — 8441aecdd3cadfb792a6e1153c83c93c2b5b491f  
**Status keputusan:** **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**

---

## 1. Ringkasan keputusan

Muse mengirim v2.3.19 setelah handoff V12. Ini adalah kemajuan material: tiga perbaikan harness sebelumnya dilanjutkan, proposal teknis F-001..F-005 sepanjang 911 baris diterbitkan, dan staging readiness diperbarui tanpa mengarang owner.

Audit independen memeriksa diff commit, file kode harness yang berubah, log mentah, response matrix, proposal, staging readiness, source aplikasi yang menjadi dasar proposal, schema, package manifest, serta dokumen spike/desain yang dirujuk. Auditor tidak menjalankan kode, harness, build, atau tes Muse. Jumlah assertion dan hasil di bawah dihitung dari log yang di-commit.

**Kesimpulan utama:**

- **F-036:** perbaikan parser PID dan fail-fast gate dapat diterima pada tingkat harness VM. Log memuat 50 assertion PASS, 0 FAIL.
- **F-037:** tes regresi filesystem kini menggunakan direktori privat, exclusive create, pemeriksaan dev/inode, dan menolak eksekusi sebagai root. Log memuat 59 assertion PASS untuk F-035 dan 25 assertion PASS untuk U-72. Namun, log run pertama yang gagal ditimpa oleh run ulang; ringkasan kegagalannya dicatat, tetapi raw log pertama tidak tersedia.
- **F-035 trust boundary:** child writer sekarang menggunakan descriptor O_NOFOLLOW + fstat + dev/inode pinning. Muse secara eksplisit mengecualikan proses tidak tepercaya dengan UID yang sama dari threat model harness. Itu adalah asumsi operasional, bukan isolasi terhadap same-UID adversary.
- **Proposal F-001..F-005:** tersedia dan jauh lebih konkret daripada revisi sebelumnya, tetapi belum layak diterima tanpa koreksi. Audit menemukan ketidakkonsistenan byte accounting, batas aggregate pada stream paralel, model kepemilikan katalog/tenancy, deadline, dan normalisasi unique index.
- **Source aplikasi tidak berubah.** Tidak ada remediasi F-001..F-005 pada aplikasi. Proposal bukan implementasi.
- **Staging tetap BLOCKED:** enam owner operasional belum ditetapkan; identitas artifact dan bukti semua jalur Link Scanner nonaktif belum tersedia.
- Tidak ada dasar untuk mengizinkan publikasi atau deployment.

---

## 2. Commit dan perubahan yang ditinjau

Commit Muse:
- SHA: f2f928f3ba6c3fd12c1becca3670b6fc61209a22
- Pesan: docs(ssrf): v2.3.19 — fix F-036 PID parser, F-037 safe test fixtures, F-001..F-005 implementation-ready proposal, answer V12 handoff
- URL: https://github.com/nusasaputrarama-max/Airdrop-Generate/commit/f2f928f3ba6c3fd12c1becca3670b6fc61209a22

Enam belas path dalam diff:

1. SSRF_PROPOSAL_F001_F005_V2319.md
2. SSRF_REMEDIATION_DESIGN.md
3. SSRF_RESPONSE_MATRIX_V2319.md
4. STAGING_READINESS_V2319.md
5. evidence/f029-memory-methodology/README.md
6. evidence/f029-memory-methodology/test-u72-seam-v2319.txt
7. evidence/f029-memory-methodology/test-u72-seam.ts
8. evidence/f032-harness-validation/README.md
9. evidence/f032-harness-validation/hang-child.ts
10. evidence/f032-harness-validation/pid-oracle.ts
11. evidence/f032-harness-validation/run-f032-timeout-e2e-v2319.txt
12. evidence/f032-harness-validation/run-f032-timeout-e2e.ts
13. evidence/f032-harness-validation/test-f035-pidfile-v2319.txt
14. evidence/f032-harness-validation/test-f035-pidfile.ts
15. evidence/f032-harness-validation/test-pid-oracle-v2319.txt
16. evidence/f032-harness-validation/test-pid-oracle.ts

### Cakupan source dan konfigurasi

Semua file kode yang berubah berada di evidence/ dan merupakan harness atau tes lokal. Tidak ada file site/, migration, schema, package manifest, lockfile, workflow CI, deployment config, database/katalog, atau live artifact dalam diff.

Source yang dibaca secara read-only untuk memeriksa dasar proposal:
- site/server/src/actions.ts: fetchText/fetchTextOnce, RDAP, analyze, script fetch, addProject, dan export action.
- site/server/src/schema.ts: tabel checks, projects, savedProjects.
- site/package.json: scripts, versi Bun, dan dependency SDK.
- SSRF_REMEDIATION_DESIGN.md: byte accounting, resource budget, deadline, concurrency, IP pinning, dan tenancy.
- SSRF_SPIKE_RUNTIME.md dan SSRF_SPIKE_V21.md: bukti pinning/dekompresi yang dirujuk proposal.
- MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md dan SSRF_INDEPENDENT_AUDIT_V12.md.

Workflow-run lookup untuk commit v2.3.19 mengembalikan nol run. Wrapper yang tersedia hanya memeriksa workflow run terkait pull request; hasil kosong bukan bukti bahwa semua jenis CI tidak ada. Tidak ada workflow baru dalam diff. site/package.json tetap hanya memiliki typecheck/build; tidak ada script test aplikasi. Bun kanonik masih dinyatakan 1.3.10 dan dependency SDK masih memakai absolute local path /opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz. F-030/F-009 tetap blocker reproduksibilitas.

---

## 3. Response to Previous Handoff

### 3.1 F-036 — parser PID dan fail-fast gate

Muse memperketat parsePidFile agar starttime harus positive safe integer, menolak starttime nol/negatif/non-integer/unsafe, memvalidasi input classifyLiveness sendiri, dan menambahkan verifyPidFile yang menolak seluruh file jika ada satu parse error atau jumlah record tidak sesuai.

Verifikasi source:
- evidence/f032-harness-validation/pid-oracle.ts: parseProcStat, parsePidFile, classifyLiveness, verifyPidFile.
- evidence/f032-harness-validation/run-f032-timeout-e2e.ts: driver memakai verifyPidFile sebelum menyatakan semua child mati.
- evidence/f032-harness-validation/test-pid-oracle.ts: kasus negatif dan kontrol positif.

Bukti log:
- test-pid-oracle-v2319.txt: 50 assertion PASS, 0 FAIL, Bun 1.4.4, UID 65534, 8 November 2026 12:00:27 WIB, exit code 0.
- run-f032-timeout-e2e-v2319.txt: 12 child timeout, 12 PID dicatat, 12 verdict dead melalui ESRCH, nol RESULT, parent harness exit 1 sebagaimana diharapkan, outer E2E PASS.

**Status audit: ADDRESSED pada level harness VM.** Ini bukan bukti keamanan aplikasi atau staging.

### 3.2 F-037 — keselamatan tes filesystem

Muse mengganti fixture tes U-72 dengan direktori privat per-run, mode 0700, exclusive create, file mode 0600, dan cleanup berdasarkan dev/inode. Tes F-035 juga menolak berjalan sebagai root, menolak legacy path yang sudah ada tanpa menyentuhnya, dan menguji symlink serta regular file pada path lama.

Bukti log:
- test-f035-pidfile-v2319.txt: 59 assertion PASS, 0 FAIL, UID 65534, Bun 1.4.4, 12:05:23 WIB, exit code 0.
- test-u72-seam-v2319.txt: 25 assertion PASS, 0 FAIL, UID 65534, Bun 1.4.4, 12:00:27 WIB, exit code 0.

Tes F-035 menjalankan dua driver paralel pada dua skenario. Log menunjukkan direktori run berbeda, 12 PID per driver, PID sets tidak tumpang tindih, sentinel tetap identik, symlink/regular file legacy tetap utuh selama driver berjalan, dan cleanup diverifikasi.

**Batas keterlacakan:** log F-035 menyatakan run pertama gagal 58 PASS + 1 FAIL akibat urutan self-check. Raw log pertama ditimpa oleh run ulang dan tidak dipertahankan sebagai file terpisah. Kegagalan disebutkan dalam response matrix dan header log run ulang, tetapi auditor tidak dapat memeriksa raw output run pertama. Hasil run ulang tetap dapat diperiksa; provenance kegagalan awal hanya terdokumentasi sebagai ringkasan.

**Status audit: ADDRESSED pada level harness VM**, dengan catatan raw log kegagalan awal tidak tersedia.

### 3.3 F-035 trust boundary child writer

hang-child.ts mengganti pola lstat-then-append dengan open O_NOFOLLOW, fstat descriptor, pemeriksaan regular file/UID/mode, dan pencocokan dev/inode yang dikirim driver. Ini mengurangi risiko path swap di antara validasi dan write.

Muse secara eksplisit menyatakan proses tidak tepercaya dengan UID yang sama berada di luar threat model harness. Asumsi ini dapat diterima untuk VM single-user yang dinyatakan, tetapi tidak boleh digeneralisasi menjadi isolasi same-UID pada host bersama. Residual U-77 harus tetap tercatat.

**Status audit: ADDRESSED untuk asumsi harness yang dinyatakan; NOT VERIFIED untuk penggunaan pada host multi-user dengan same-UID adversary.**

### 3.4 Proposal F-001..F-005

Proposal 911 baris tersedia dan mencakup file/function references, pseudodiff, threat model, test IDs, staging dependencies, migration/rollback, dan residual risks. Ini memenuhi permintaan agar Muse berhenti hanya mengulang status.

Namun, audit menemukan temuan desain F-038 sampai F-043 di bawah. Karena itu, proposal **tersedia untuk review, tetapi belum diterima sebagai basis implementasi tanpa koreksi**.

### 3.5 Staging readiness

STAGING_READINESS_V2319.md secara jujur menyatakan:
- staging operator: UNASSIGNED;
- runtime provider: UNASSIGNED;
- egress owner: UNASSIGNED;
- DB/runtime owner: UNASSIGNED;
- alert recipient: UNASSIGNED;
- rollback owner: UNASSIGNED;
- artifact identity/digest: NOT PROVIDED;
- bukti Link Scanner nonaktif di semua jalur invocation: NOT VERIFIED/BLOCKED.

Tidak ada checkLink yang di-invoke. Tidak ada bukti staging baru.

**Status audit: dokumentasi gap terpenuhi; readiness operasional tetap BLOCKED.**

---

## 4. Temuan desain baru pada proposal v2.3.19

### F-038 — Medium — L0 compressed-byte counter bertentangan dengan perilaku Response.body Bun

**Klasifikasi:** confirmed design inconsistency / design gap pada proposal F-002.  
**Confidence:** High.  
**Lokasi:**
- SSRF_PROPOSAL_F001_F005_V2319.md:324-329.
- SSRF_REMEDIATION_DESIGN.md:203-204.
- Bukti perilaku: evidence/f024-h-res03-bun-fetch/ yang dirujuk desain.

**Bukti:** proposal menyatakan chunk dari ReadableStream dipakai sekaligus untuk:
- compressedBytes += chunk.length sebagai raw bytes off the wire; dan
- decodedBytes += chunk.length setelah dekompresi transparan runtime.

Namun desain yang sudah ada menyatakan L0 wire/encoded bytes tidak dapat diobservasi melalui Response.body Bun. Bukti eksperimen yang dirujuk desain menunjukkan gzip 551 byte wire menghasilkan 500.000 byte pada Response.body; Brotli 51 byte menghasilkan 500.000 byte. Chunk yang diterima aplikasi adalah hasil dekompresi, bukan raw wire chunk.

**Skenario/impact:** jika implementasi memakai Response.body dan menghitung chunk.length sebagai compressed bytes, nilai L0 bukan pengukuran wire. Batas compressedCap dapat menjadi klaim palsu. Decoded-body cap tetap dapat membatasi accepted bytes, tetapi bandwidth dan kerja transport/dekompresi tidak dibatasi oleh counter aplikasi tersebut. Egress limit infrastruktur yang sebelumnya ditetapkan sebagai pengganti L0 masih UNASSIGNED.

**Mitigasi:**
1. Pilih satu model yang konsisten: L0 tidak diukur oleh Response.body dan wajib ditangani oleh egress policy/infrastruktur; atau gunakan transport layer yang menyediakan raw encoded bytes sebelum decompression.
2. Jangan menghitung satu chunk sebagai compressed dan decoded sekaligus.
3. Dokumentasikan secara eksplisit batas mana yang dijamin aplikasi dan mana yang bergantung pada provider/egress.
4. Jangan memakai Content-Length sebagai oracle; hanya boleh menjadi sinyal awal yang tidak dipercaya.

**Tes regresi:** kirim fixture dengan wire length dan decoded length diketahui; buktikan kedua counter berasal dari layer yang berbeda. Jika L0 berada di infrastruktur, sertakan bukti konfigurasi dan metrik egress staging. Jika runtime tidak dapat mengukur raw bytes, proposal harus menyatakan L0 tidak dijamin oleh aplikasi.

### F-039 — Medium — aggregate decoded budget belum mendefinisikan reservasi atomik dan batas overshoot untuk reader paralel

**Klasifikasi:** design gap pada proposal F-002.  
**Confidence:** High.  
**Lokasi:**
- SSRF_PROPOSAL_F001_F005_V2319.md:311-334, khususnya 324-334.
- site/server/src/actions.ts:520-538 — tiga script diproses melalui Promise.all.
- SSRF_REMEDIATION_DESIGN.md:204 — F-025 mensyaratkan synchronous atomic check-and-reserve, shared AbortController, cancel seluruh reader, dan fail-closed.

**Bukti:** pseudodiff v2.3.19 hanya menambah chunk.length ke aggregateDecodedUsed lalu membatalkan reader/AbortController ketika cap terlampaui. Tidak dijelaskan operasi reserve sebelum append, pengelolaan beberapa read yang sudah in-flight, atau batas jumlah chunk yang dapat tiba dari reader lain setelah satu reader melewati cap. Sementara itu, proposal mengklaim overhead stream satu chunk dan H-RES-07 memakai acceptance cap + satu chunk.

**Skenario/impact:** tiga script dapat dibaca paralel. Jika beberapa reader sudah memiliki read yang sedang berjalan, chunk dari beberapa reader dapat telah dialokasikan sebelum shared abort menghentikan pembacaan berikutnya. Overshoot transient dapat lebih dari satu chunk. Desain lama sendiri sudah membedakan accepted bytes (A1) dari transient/in-flight memory (A2), dan mencatat bahwa chunk klien tidak dibatasi oleh ukuran chunk server.

**Mitigasi:**
1. Pertahankan shared budget dengan operasi tryReserve yang sinkron sebelum chunk diterima ke accumulator aplikasi.
2. Definisikan A1 accepted/retained bytes terpisah dari A2 runtime/in-flight bytes.
3. Nyatakan upper bound A2 berdasarkan jumlah reader aktif dan ukuran chunk maksimum yang benar-benar dijamin runtime; bila tidak ada batas chunk runtime, jangan klaim cap + satu chunk secara umum.
4. Alternatifnya serialkan pembacaan script atau batasi jumlah reader aktif dan ukur trade-off latensinya.
5. Saat aggregate terlampaui, batalkan semua reader, buang seluruh hasil parsial, dan jangan menyimpan verdict parsial sebagai hasil terpercaya.

**Tes regresi:** tiga script lambat/paralel dengan chunk besar yang tiba berdekatan; ukur accepted bytes, in-flight bytes, RSS/external, waktu pembatalan setiap reader, dan pastikan H-RES-07 menguji batas transient yang dinyatakan, bukan hanya total counter setelah callback selesai.

### F-040 — High — model ownership F-004/F-018 berisiko mengubah katalog global menjadi katalog privat satu owner dan tidak mengisolasi savedProjects per pengguna

**Klasifikasi:** confirmed design gap dengan potensi regresi fungsional dan isolasi data bila proposal diterapkan.  
**Confidence:** High.  
**Lokasi:**
- site/server/src/schema.ts:31-52 — projects adalah verified airdrop project catalog.
- site/server/src/schema.ts:54-64 — savedProjects disebut sebagai tracking state milik pengguna, tetapi primary key hanya projectId.
- SSRF_PROPOSAL_F001_F005_V2319.md:537-539, 563-572, 635-640.
- site/server/src/actions.ts:1402-1435 — listProjects membaca katalog global dan menggabungkan savedProjects berdasarkan projectId.

**Bukti:** skema saat ini mendeskripsikan projects sebagai katalog terverifikasi dan savedProjects sebagai state pengguna per proyek. Proposal menambah owner_user_id ke projects/checks, meng-backfill semua 15 proyek ke satu OWNER_USER_ID, lalu memfilter listProjects dan pembacaan lain berdasarkan principal. Pada shared DB, hanya principal yang sama dengan OWNER_USER_ID yang akan melihat 15 baris katalog tersebut. Pengguna lain dapat melihat katalog kosong. Di sisi lain, savedProjects tetap tidak memiliki user/principal key dan tetap memiliki PK projectId saja; dua pengguna tidak dapat memiliki bookmark/task status independen untuk proyek yang sama.

**Skenario/impact:** jika DB shared dan katalog memang dimaksudkan sebagai katalog global, backfill satu owner + filter seluruh listProjects akan membuat katalog global tidak terlihat bagi pengguna lain. Jika proyek dimaksudkan per-tenant, savedProjects tetap tidak mengisolasi tracking state per tenant. Kedua model tidak dapat dipenuhi sekaligus oleh migrasi yang diajukan tanpa keputusan model data yang lebih presisi.

**Mitigasi:**
1. Putuskan eksplisit apakah projects adalah katalog global atau katalog per-tenant; jangan menyimpulkan dari ctx.db yang tenancy-nya masih NOT VERIFIED.
2. Untuk katalog global: semua pengguna boleh membaca projects; mutasi katalog dibatasi ke admin/service principal; checks diberi owner; savedProjects memakai composite key principal_id + project_id agar bookmark/task state per pengguna.
3. Untuk katalog per-tenant: owner_user_id pada projects dapat digunakan, tetapi savedProjects tetap perlu principal_id + project_id; unique index dan aturan duplikat harus dinyatakan per tenant atau global dengan alasan.
4. Pisahkan ownership katalog dari ownership state pengguna. Jangan backfill semua proyek ke satu owner sebelum model akses disetujui.
5. Jelaskan bagaimana scheduled auto-discovery job memperoleh principal/service identity dan bagaimana pengguna biasa membaca katalog.

**Tes regresi wajib:** dua principal A/B harus sama-sama melihat katalog global jika modelnya global, tetapi perubahan bookmark/task status A tidak boleh mengubah state B. Jika model per-tenant dipilih, A tidak boleh membaca/mengubah data B dan test katalog kosong harus menjadi perilaku yang memang disetujui. Uji juga akses service principal untuk job auto-discovery.

### F-041 — Medium — total deadline dan concurrency policy proposal tidak konsisten dengan keputusan desain terdahulu

**Klasifikasi:** design inconsistency / owner-decision gap.  
**Confidence:** High.  
**Lokasi:**
- SSRF_REMEDIATION_DESIGN.md:1235 dan 3193 — total deadline 20 detik dinyatakan sebagai keputusan desain yang disetujui dan TOTAL_TIMEOUT_MS 20.000.
- SSRF_REMEDIATION_DESIGN.md:3180-3193 — concurrency global maksimum 5 melalui DB lease, bukan semaphore in-memory.
- SSRF_PROPOSAL_F001_F005_V2319.md:59, 436-438, 456-464, 489-493.

**Bukti:** proposal v2.3.19 menetapkan K-3 sebagai 30 detik + 2 detik toleransi dengan alasan 30 detik sudah ada pada kode mirror. Desain terdahulu menetapkan 20 detik total sebagai syarat cutover. Proposal juga membuka opsi in-memory semaphore per-instance jika deployment single-instance terbukti, sedangkan desain sebelumnya mewajibkan lease global via DB untuk batas lima pemeriksaan bersamaan.

**Skenario/impact:** implementor dapat memilih angka deadline dan model concurrency yang berbeda dari keputusan desain yang telah tercatat. Jika in-memory semaphore dipakai tanpa bukti single-instance, batas lima hanya berlaku per instance dan total concurrency dapat meningkat seiring jumlah instance. Per-IP rate limit juga memerlukan sumber identitas IP yang tepercaya; proposal belum menentukan trust chain proxy/header atau mekanisme penyimpanan yang sesuai.

**Mitigasi:**
1. Rekonsiliasi 20 detik vs 30 detik sebelum implementasi. Karena desain menyebut 20 detik sebagai keputusan pemilik, jangan menggantinya hanya karena kode mirror saat ini memakai 30 detik.
2. Jika mengusulkan 30 detik, minta keputusan owner eksplisit dan perbarui seluruh dokumen/acceptance criteria secara konsisten.
3. Pertahankan global DB lease sebagai default sampai provider membuktikan deployment single-instance dan owner menerima batas per-instance.
4. Definisikan sumber IP pemanggil yang tepercaya, proxy hop yang dipercaya, penolakan spoofed forwarding headers, dan storage rate-limit sebelum menetapkan 10/menit serta 100/jam.

**Tes regresi:** deadline end-to-end sesuai angka yang diputuskan; tiga fetch paralel dan seluruh sibling dibatalkan; 20+ pemeriksaan lintas instance tidak melampaui global cap; rate limit tidak dapat dilewati dengan spoofed X-Forwarded-For.

### F-042 — Medium — SSRF guard pseudodiff tidak menolak set DNS kosong dan belum memetakan seluruh policy constraints ke acceptance tests

**Klasifikasi:** design gap pada proposal F-001.  
**Confidence:** High untuk empty-set behavior; Medium untuk kelengkapan pemetaan policy.  
**Lokasi:**
- SSRF_PROPOSAL_F001_F005_V2319.md:119-128 — validateDestination.
- SSRF_PROPOSAL_F001_F005_V2319.md:133-180 — classifyIp/canonicalization/pinning pseudodiff.
- SSRF_REMEDIATION_DESIGN.md:1235 — port tujuan 80/443 saja; A.5 DNS timeout 5 detik dan batas koneksi.
- SSRF_SPIKE_V21.md: TEST 3 — resolver DNS tidak dapat dianggap dibatalkan hanya dengan AbortSignal; late result harus diabaikan.

**Bukti:** validateDestination memeriksa setiap elemen ips, lalu selalu mengembalikan ok=true dengan ip=ips[0] jika loop tidak menemukan alamat terlarang. Tidak ada guard eksplisit untuk ips.length === 0. Untuk array kosong, pseudodiff menghasilkan ok=true dengan ip undefined. Proposal juga tidak mengulang secara eksplisit batas port 80/443 dan timeout DNS 5 detik/late-result handling yang ada pada desain terdahulu.

**Skenario/impact:** DNS NODATA, NXDOMAIN, timeout, atau hasil resolver kosong harus gagal tertutup. Tanpa acceptance criterion eksplisit, implementor dapat meneruskan nilai pin kosong ke transport atau menambahkan fallback yang tidak terp-pin. Hilangnya port policy juga dapat membuka fetch ke layanan publik pada port non-standar yang sebelumnya dilarang desain.

**Mitigasi:**
1. ips kosong, tidak lengkap, malformed, atau resolver error harus menghasilkan deny/fail-closed; tidak boleh menghasilkan ok=true.
2. Terapkan batas port 80/443 atau revisi kebijakan hanya dengan keputusan owner.
3. Terapkan timeout DNS 5 detik dengan perilaku late-result yang diabaikan; jangan menganggap AbortSignal membatalkan operasi resolver jika API tidak mendukungnya.
4. Petakan seluruh special-purpose address registry, IPv4-mapped, NAT64, TEREDO/6to4, zone identifiers, userinfo, bentuk IP non-kanonik, dan hostname metadata ke unit test eksplisit.
5. Hanya gunakan koneksi yang destination-nya benar-benar dipin; tidak ada fallback ke fetch biasa.

**Tes regresi:** DNS empty/NODATA/NXDOMAIN/timeout; jawaban A/AAAA campuran; malformed IP; port 81/8080; seluruh kasus alamat khusus; late DNS result setelah deadline; pastikan tidak ada koneksi yang dibuat ketika guard menolak.

### F-043 — Medium — normalisasi unique index F-004 tidak konsisten dengan komentar dan semantik alamat lintas chain

**Klasifikasi:** design gap pada proposal migrasi.  
**Confidence:** High bahwa pseudodiff dan komentarnya tidak konsisten; Medium untuk dampak data aktual sampai model chain/address disepakati.  
**Lokasi:**
- SSRF_PROPOSAL_F001_F005_V2319.md:582-593 dan 612-619.
- site/server/src/actions.ts:1189-1230 — normalisasi existing pre-check.
- site/server/src/schema.ts:31-52 — chain dan contract_address adalah kolom terpisah.

**Bukti:** proposal menyatakan alamat dibandingkan tanpa prefix 0x, tetapi expression index yang ditulis hanya lower(contract_address), tidak menghapus prefix. Proposal juga menerapkan lower(contract_address) pada semua jenis alamat, sementara skema menerima EVM dan Solana. Solana base58 bersifat case-sensitive, sehingga lowercasing semua alamat tidak setara dengan normalisasi EVM hex. Unique index juga global pada contract_address tanpa chain, sehingga alamat yang sama pada dua chain berbeda akan bentrok jika model produk mengizinkan deployment lintas chain.

**Skenario/impact:** migrasi dapat menolak alamat Solana berbeda yang hanya berbeda huruf besar/kecil, atau memiliki perilaku berbeda dari komentar/pemeriksaan aplikasi. Duplikasi lintas chain dapat ditolak meskipun deployment tersebut memang berbeda. Sebaliknya, komentar tentang penghapusan prefix 0x tidak dibuktikan oleh expression index.

**Mitigasi:**
1. Definisikan canonicalization per address type: EVM hex case-insensitive; Solana base58 case-sensitive.
2. Tentukan apakah uniqueness berlaku global, per chain, atau per tenant. Jangan membiarkan expression index memilih kebijakan secara implisit.
3. Pastikan pre-check aplikasi dan unique index DB menggunakan aturan normalisasi identik.
4. Gunakan canonical column atau expression index yang benar-benar mengimplementasikan kebijakan yang disetujui; jangan hanya menambahkan komentar.
5. Tambahkan test EVM case variants, Solana case variants, same address on different chains, NULL address, dan whitespace.

**Tes regresi:** hasil aplikasi dan DB harus identik untuk seluruh pasangan address; insert paralel tetap menghasilkan satu pemenang sesuai scope uniqueness yang dipilih.

---

## 5. Rekonsiliasi bukti dan status temuan lama

| ID / kelompok | Status V13 | Dasar |
|---|---|---|
| F-001 SSRF | OPEN / BLOCKED | Source actions.ts tidak berubah; proposal masih perlu F-042 dan staging pinning. |
| F-002 response cap | OPEN / BLOCKED | Proposal ada, tetapi F-038 dan F-039 belum diselesaikan. |
| F-003 deadline/concurrency | OPEN / BLOCKED | Deadline 30 detik ada di mirror, tetapi tidak ada regression test aplikasi/staging; F-041 belum direkonsiliasi. |
| F-004 duplicate race | OPEN / BLOCKED | Belum ada unique index/migration; F-040 dan F-043 menghambat persetujuan desain. |
| F-005 authorization | OPEN / NOT VERIFIED | Proposal opsi A/B/C tersedia; provider identity/tenancy belum dibuktikan; Opsi C tetap default aman sampai keputusan. |
| F-018 tenancy | NOT VERIFIED / OPEN | Proposal migration belum membuktikan scope ctx.db; model katalog/savedProjects belum konsisten. |
| F-019 Link Scanner disabled | BLOCKED / NOT VERIFIED | Action masih terdaftar pada source; tidak ada bukti kontrol nonaktif semua jalur. checkLink tidak di-invoke. |
| F-028 deployment provenance | NOT VERIFIED | Artifact digest, release ID, operator, dan approval manifest belum disediakan. |
| F-030/F-009 | CONFIRMED REPRODUCIBILITY BLOCKER | Bun 1.3.10 vs lockfile v2; absolute SDK path masih ada; clean external builder belum terbukti. |
| F-034 | ADDRESSED — harness VM | 50 assertion PASS; independent static review konsisten. |
| F-035 | ADDRESSED — harness VM, dengan residual U-77 | O_NOFOLLOW/fstat/dev-inode; same-UID untrusted processes excluded. |
| F-036 | ADDRESSED — harness VM | Starttime 0 ditolak; fail-fast seluruh file. |
| F-037 | ADDRESSED — harness VM | 59 + 25 assertion PASS; raw log run pertama tidak tersedia. |
| U-72 | ADDRESSED — harness lokal | 25 assertion PASS; explicit test mode + allowlist. |
| F-033 | ADDRESSED pada VM evidence saja | Rasio 1,12–2,62× tetap bukan sizing staging; tidak diulang. |
| U-38-A..D / U-33-A..F | CARRY-FORWARD | Tidak ada bukti runtime/staging baru yang menutupnya. |

### ST-01..ST-12 dan STAGE-P01..P12

Tidak ada staging test baru. ST-01..ST-12 dan STAGE-P01..P12 tetap BLOCKED/NOT RUN karena staging, provider, dan owner belum tersedia. ST-12 tidak PASS tanpa bukti alert benar-benar diterima operator dalam batas lima menit. Prosedur/oracle tetap berada di desain, bukan bukti pelaksanaan.

### SU-T1..SU-T9 dan klaim pengulangan 9×4

v2.3.19 tidak mengulang suite SU. Rekonsiliasi historis tetap:
- bundle asli v2.3.6 hanya memiliki satu log SU lengkap; file lain adalah duplikat RUN=1 atau tail;
- bundle suplemen v2.3.9 memiliki empat log lengkap RUN=1..4, tetapi provenance RUN1 berulang tetap ambigu;
- log gagal SU-T5 tidak tersedia dan tidak direkonstruksi;
- tes F-029/F-032/F-034/F-035/U-72 pada v2.3.19 adalah harness VM terpisah, bukan SU-T1..T9 dan bukan staging.

### Catatan konsistensi dokumentasi

SSRF_REMEDIATION_DESIGN.md bagian header sudah menambahkan referensi proposal v2.3.19, tetapi kalimat berikutnya masih menyatakan proposal implementation-ready F-001..F-005 BELUM dikerjakan. Ini bertentangan dengan proposal baru dan SSRF_RESPONSE_MATRIX_V2319.md. Perlu dibersihkan agar riwayat dan status tidak saling bertentangan.

---

## 6. Tahap proyek

| Tahap | Status V13 |
|---|---|
| 1. Rekonsiliasi bukti desain v2.3.6/v2.3.7 | **COMPLETE untuk rekonsiliasi artefak historis**; bukan bukti staging lulus. |
| 2. Audit artefak kode dan celah keamanan | **PARTIALLY COMPLETE** — harness v2.3.19 ditinjau; proposal F-001..F-005 kini ada tetapi F-038..F-043 perlu dijawab; source aplikasi belum berubah. |
| 3. Identifikasi gap staging dan owner | **PARTIALLY COMPLETE** — daftar owner/prasyarat terdokumentasi, tetapi semua owner masih UNASSIGNED dan bukti artifact/Link Scanner belum ada. |
| 4. Validasi staging terkontrol | **NOT STARTED** — tidak ada staging/operator/runtime provider. |
| 5. Evaluasi staging dan gerbang rilis | **NOT STARTED** — tidak ada bukti staging untuk dievaluasi. |

---

## 7. Blocker log

| Blocker | Owner yang dibutuhkan | Percobaan/bukti | Hasil | Langkah berikutnya |
|---|---|---|---|---|
| F-038 compressed vs decoded byte | Muse — proposal F-002; runtime/egress provider untuk L0 | Review proposal §2.3 dan desain §D.4.24 | Counter wire tidak dapat diperoleh dari Response.body Bun | Pisahkan L0/L1; tentukan egress control atau raw transport |
| F-039 aggregate concurrent readers | Muse — proposal F-002 | Review proposal §2.3 dan actions.ts Promise.all | Satu-chunk overshoot belum dibuktikan untuk multi-reader | Atomic reserve, definisi A2, tes chunk paralel |
| F-040 katalog vs tenant model | Muse — proposal F-004/F-018; provider + owner | Review schema.ts, actions.ts, proposal §4 | Global catalog dan per-user state tercampur | Putuskan shared vs per-tenant; revisi schema dan H-TEN |
| F-041 deadline/concurrency policy | Pemilik keputusan + Muse | Bandingkan desain §A.5/§B.4 dengan proposal §0/§3 | 20s/global lease vs 30s/opsi in-memory | Rekonsiliasi keputusan; buktikan topology; definisikan trusted IP |
| F-042 DNS empty set/port policy | Muse — proposal F-001; runtime provider | Review validateDestination dan desain §A.5 | Empty IP set dapat menghasilkan ok=true; port/DNS timeout belum dipetakan eksplisit | Fail-closed empty set, port 80/443, resolver timeout + late-result tests |
| F-043 address normalization | Muse — proposal F-004; owner keputusan katalog | Review SQL index dan addProject pre-check | EVM/Solana case semantics dan chain scope belum jelas | Canonicalization per type + chain/tenant scope + regression matrix |
| F-019 Link Scanner disabled | Runtime/artifact operator | Tidak ada bukti read-only semua jalur | BLOCKED / NOT VERIFIED | Provider sediakan bukti kontrol (a)–(e); jangan invoke action |
| F-028 artifact provenance | Runtime/artifact provider | Manifest kosong | NOT PROVIDED | Versi/digest/source commit/release ID/operator/approval/rollback |
| Staging roles | Pemilik proyek/provider | STAGING_READINESS_V2319.md | Enam peran UNASSIGNED | Tetapkan operator, runtime, egress, DB, alert, rollback |
| F-030/F-009 | Runtime/build provider | package.json dan lockfile tidak berubah | Bun/lockfile + SDK path blocker | Keputusan Bun/SDK dan clean external builder |

---

## 8. Muse Handoff / Required Response

Laporan ini adalah handoff berikutnya melalui repository. Pemilik proyek tidak perlu meneruskan pesan. Tidak ada otorisasi untuk mengubah source aplikasi, DB, package/lockfile, deployment, runtime, atau live artifact.

1. **Perbaiki F-038 — pisahkan compressed wire bytes dari decoded Response.body.**
   - Jangan menghitung chunk Response.body Bun sebagai raw wire bytes.
   - Pilih egress limit infrastruktur atau transport layer yang menyediakan raw encoded bytes.
   - Acceptance: dokumen menyebut dengan tegas layer yang diukur, bukti raw/decoded terpisah, dan tidak ada klaim L0 dari Response.body.

2. **Perbaiki F-039 — aggregate budget concurrency-safe.**
   - Implementasikan rancangan tryReserve/check-and-reserve sinkron sebelum accepted bytes ditambahkan.
   - Definisikan A1 accepted bytes dan A2 transient/in-flight bytes secara terpisah.
   - Nyatakan batas overshoot untuk tiga script paralel atau serialkan pembacaan dengan alasan terukur.
   - Acceptance: H-RES-07 membuktikan accepted bytes tidak melewati aggregate; A2 diukur dan dilaporkan tanpa klaim satu chunk jika ada beberapa reader aktif.

3. **Rancang ulang F-040 — model katalog dan state pengguna.**
   - Jawab apakah projects adalah global catalog atau per-tenant catalog.
   - Jika global, jangan filter seluruh listProjects berdasarkan owner satu service principal; buat savedProjects per-user dengan composite key principal + project.
   - Jika per-tenant, tetapkan owner scope dan unique index per tenant secara eksplisit.
   - Acceptance: dua principal dapat membaca katalog sesuai model yang dipilih dan bookmark/task state tidak saling bocor atau tertimpa.

4. **Rekonsiliasi F-041 — deadline, concurrency, dan rate limit.**
   - Cocokkan 20 detik yang tercatat sebagai keputusan desain dengan proposal 30 detik +2 detik.
   - Jangan mengganti keputusan owner berdasarkan nilai yang kebetulan ada di source mirror.
   - Pertahankan global lease DB sampai single-instance deployment terbukti dan owner menyetujui batas per-instance.
   - Definisikan sumber IP pemanggil yang tepercaya, proxy hop yang dipercaya, penolakan spoofed forwarding headers, dan storage rate-limit.
   - Acceptance: satu angka deadline dan satu model concurrency yang konsisten di desain, proposal, dan test matrix.

5. **Perketat F-042 — fail-closed DNS dan port policy.**
   - Empty A/AAAA result, malformed answer, resolver error, dan timeout harus ditolak.
   - Petakan port 80/443 serta DNS timeout/late-result handling dari desain yang sudah ada.
   - Acceptance: tidak ada fallback ke fetch biasa jika destination pin tidak tersedia; sertakan tes empty/NODATA/NXDOMAIN/timeout dan port non-standar.

6. **Perjelas F-043 — normalisasi unique index.**
   - Pisahkan aturan EVM hex dan Solana base58; jangan lower-case semua alamat tanpa membedakan jenisnya.
   - Putuskan scope unique address: global, per chain, atau per tenant.
   - Pastikan expression index benar-benar sama dengan komentar dan pre-check aplikasi.
   - Acceptance: tes EVM case variants, Solana case variants, alamat sama lintas chain, NULL, whitespace, dan request paralel.

7. **Perbaiki traceability dan konsistensi dokumen.**
   - Pertahankan raw log untuk setiap run gagal dan run ulang dengan nama berbeda.
   - Koreksi kalimat stale pada header SSRF_REMEDIATION_DESIGN.md yang masih menyatakan proposal F-001..F-005 belum dikerjakan.
   - Acceptance: setiap status dalam response matrix dapat ditelusuri ke file, test ID, raw log, commit, tanggal, dan exit code.

8. **Pertahankan hard gates.**
   - F-001..F-005 tetap OPEN/BLOCKED sampai implementasi aktual ditinjau dan seluruh acceptance staging terpenuhi.
   - ST-01..ST-12 dan STAGE-P01..P12 tetap BLOCKED/NOT RUN sampai owner dan lingkungan tersedia.
   - F-019/F-028 tetap NOT VERIFIED; jangan invoke checkLink, jangan aktifkan Link Scanner, jangan deploy atau public-share.
   - Tidak ada source implementation tanpa otorisasi eksplisit terpisah dari pemilik proyek.

**Required next outcome:** revisi proposal yang menjawab F-038..F-043 dan bukti raw log yang lebih lengkap. Jangan membuat revisi benchmark-only atau mengulang tes valid tanpa perubahan relevan.

---

## 9. Batas audit dan keputusan akhir

- Audit v2.3.19 dilakukan read-only terhadap diff, source harness, raw logs, proposal, response matrix, staging readiness, source aplikasi yang relevan, schema, package manifest, dan dokumen spike/desain.
- Auditor tidak menjalankan kode Muse, harness, eksperimen, build, atau test suite.
- Semua log v2.3.19 adalah bukti VM lokal Bun 1.4.4, UID 65534; bukan staging atau produksi.
- Tidak ada source aplikasi, database/katalog, package/lockfile, workflow CI, deployment, runtime, atau live artifact yang diubah.
- checkLink tidak di-invoke; Link Scanner tidak diaktifkan.
- Tidak ada approval implementasi, publikasi, atau deployment.

**FINAL DECISION: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**
