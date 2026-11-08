# Matriks Respons v2.3.21 atas Audit Independen V14

**Revisi:** v2.3.21 — jawaban atas audit independen V14
(`SSRF_INDEPENDENT_AUDIT_V14.md`, commit `f74f0bd`, audit
2026-11-08 13:09 WIB atas v2.3.20 commit `b543eca`) dan butir
`MUSE_DIRECTIVE_V14_ACTION_REQUIRED.md` (commit `48c3f94`,
dibaca sebagai referensi isi audit)
**Tanggal revisi:** 2026-11-08 (WIB)
**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**
**Dokumen desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.32 (baru)
**Proposal F-001..F-005:** `SSRF_PROPOSAL_F001_F005_V2321.md`
(SHA-256 `5b933d9b184ca62ce4eb7d5d95489a2e16f3e4231e262c102960a95dfe3d1788`,
606 baris)
**Staging readiness:** `STAGING_READINESS_V2321.md`
**Matriks sebelumnya:** `SSRF_RESPONSE_MATRIX_V2320.md`
(diperbarui status F-040/F-043 di bawah; isinya dipertahankan
utuh sebagai catatan sejarah)

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.21

(a) desain remediasi — boleh dilanjutkan dan ditinjau (inilah
v2.3.21); (b) implementasi pada source code — butuh persetujuan
eksplisit terpisah dari pemilik proyek, **TIDAK diberikan saat
ini**; (c) penerapan ke situs live — butuh persetujuan dan
prosedur deployment tersendiri. **Perubahan pada source mirror
GitHub TIDAK otomatis berarti situs live berubah.** v2.3.21
TIDAK mengimplementasikan apa pun; F-001..F-005 tetap
OPEN/BLOCKED sampai tahap (b) + bukti harness staging.

## Cara membaca status

- **addressed** — perbaikan selesai dengan bukti yang dapat
  dilacak (file, test ID, log mentah, commit SHA, tanggal run)
  dan kriteria yang benar-benar lolos.
- **partially addressed** — sebagian dikerjakan; sisanya
  dinyatakan eksplisit sebagai pekerjaan berikutnya, bukan
  disembunyikan.
- **blocked** — tidak dapat dikerjakan tanpa keputusan owner /
  bukti runtime / staging; hambatan + yang sudah dicoba +
  hasilnya dicatat di §10.
- **rejected** — tidak dikerjakan karena alasan teknis yang
  dijelaskan + bukti yang dapat direproduksi (bukan diam-diam
  dihilangkan).
- **NOT VERIFIED** — belum ada bukti; bukan klaim benar/salah.

**Catatan penting tentang "addressed" di revisi ini:** F-044,
F-045, F-046 adalah temuan DESAIN atas proposal v2.3.20.
"Addressed" di sini berarti DESAINNYA diperbaiki + mekanisme
yang diperbaiki dibuktikan di VM atas ARTEFAK MIGRASI YANG
SEBENARNYA — BUKAN berarti F-001..F-005 tertutup. F-001..F-005
tetap **blocked** (OPEN) sampai implementasi tahap (b) + bukti
staging. Tidak ada satu pun finding F-001..F-005 yang ditandai
closed di revisi ini. Yang BARU di v2.3.21 vs v2.3.20: harness
MENJALANKAN file artefak migrasi (SHA-256 tercatat di header
log), bukan teks yang disalin ke dalam skrip tes.

## §1. Ringkasan status F-001..F-046

| ID | Temuan | Status v2.3.21 | Ringkasan |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah (proposal §1 v2.3.20 tetap berlaku). Implementasi tetap menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Tidak berubah. |
| F-003 | High — tanpa total deadline | **blocked** | Tidak berubah. |
| F-004 | Medium — addProject duplicate race | **blocked** | Migrasi 0006 DITULIS ULANG teks v3 (§4 proposal: rebuild + CHECK bernama + format CHECK; H-MIG-00..09 + H-CAT-11..13 baru). Migrasi menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Proposal diperbarui (§5: kebijakan legacy + gerbang export; keputusan baru K-10). Mekanisme butuh keputusan pemilik (K-4/K-10). |
| F-006b | Narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah. |
| F-006c | DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah. |
| F-016 | Cache fetch | **blocked** | Tidak berubah; cabang pilihan G-F kini menjadi keputusan K-1 di proposal. |
| F-017 | Cache key tidak memperhitungkan cap | **blocked** | Tidak berubah. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | Model global dipertahankan; kebijakan legacy fail-closed diputuskan desain (§5 proposal); semantik tenancy runtime tetap **NOT VERIFIED**; scope `ctx.db` dinyatakan NOT VERIFIED (§5.1); ratifikasi owner (G-C) + keputusan K-10 tersisa. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checklink` MASIH TERDAFTAR; tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. `checkLink` TIDAK di-invoke. Deployment tetap BLOCKED. |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan); template manifest tetap kosong. |
| F-030 | Bun/lockfile + SDK path | **blocked (CONFIRMED BLOCKER)** | Tidak berubah. |
| F-033 | Rasio memori A/B terkonfounded | **addressed** (dipertahankan sebagai VM evidence saja) | Tidak berubah; F-029 TIDAK diulang. |
| F-034 | Low — oracle terminasi child menerima semua exception sebagai proses mati | **addressed** | Dipertahankan. |
| F-035 | Low — PID file E2E memakai path tetap di /tmp dan rentan symlink/TOCTOU | **addressed** (harness VM) | Dipertahankan, dengan residual U-77. |
| F-036 | Low — parser menerima starttime nol dan dapat salah menyatakan PID hidup sebagai mati | **addressed** | Dipertahankan. |
| F-037 | Medium — tes regresi memakai path tetap di /tmp dan dapat menghapus/menimpa file yang bukan miliknya | **addressed** | Dipertahankan. |
| F-038 | Medium — L0 compressed-byte counter bertentangan dengan perilaku Response.body Bun | **addressed** (desain diperbaiki + bukti VM; F-002 tetap OPEN/BLOCKED) | Dipertahankan (v2.3.20). |
| F-039 | Medium — aggregate decoded budget belum mendefinisikan reservasi atomik dan batas overshoot untuk reader paralel | **addressed** (desain diperbaiki + bukti VM; F-002 tetap OPEN/BLOCKED) | Dipertahankan (v2.3.20). |
| F-040 | High — model ownership F-004/F-018 berisiko mengubah katalog global menjadi katalog privat satu owner | **addressed** (desain diputuskan: global + migrasi ditulis ulang teks v3; F-004/F-018 tetap OPEN/BLOCKED) | Diperbarui v2.3.21: migrasi teks v3 (rebuild) + H-MIG-01/02/08 + H-TEN-15. Teks v2 SUPERSEDED (ALTER ADD STORED gagal + typo U-94). |
| F-041 | Medium — total deadline dan concurrency policy proposal tidak konsisten dengan keputusan desain terdahulu | **addressed** (desain direkonsiliasi; F-003 tetap OPEN/BLOCKED) | Dipertahankan (v2.3.20). |
| F-042 | Medium — SSRF guard pseudodiff tidak menolak set DNS kosong dan belum memetakan seluruh policy constraints ke acceptance tests | **addressed** (desain diperketat + bukti VM; F-001 tetap OPEN/BLOCKED) | Dipertahankan (v2.3.20). |
| F-043 | Medium — normalisasi unique index F-004 tidak konsisten dengan komentar dan semantik alamat lintas chain | **addressed** (desain diperbaiki + bukti VM atas kesamaan app-vs-DB; F-004 tetap OPEN/BLOCKED) | Diperbarui v2.3.21: aturan kanonik DIREVISI (prefix `0X` + tanpa prefix diterima; U-95) + bukti atas ARTEFAK migrasi (H-CAT-13), bukan mirror. Teks v2 SUPERSEDED. |
| F-044 | High — migrasi SQLite mencoba menambahkan generated column STORED dengan ALTER TABLE ADD COLUMN | **addressed** (desain diperbaiki + bukti VM atas artefak; F-004 tetap OPEN/BLOCKED) | §2 matriks ini. Bukti: `test-f044-f045-f046-migration-v2321.txt` (109 assert PASS) + `...-sqlite3451.txt` (25 assert PASS). |
| F-045 | Medium — klaim DB fail-closed untuk chain tidak dikenal tidak diwujudkan sebagai CHECK constraint | **addressed** (desain diperbaiki + bukti VM direct SQL; F-004 tetap OPEN/BLOCKED) | §2 matriks ini. Bukti: H-CAT-11..13 di kedua log kanonik. |
| F-046 | Medium — legacy checks owner NULL dirancang terbaca semua principal | **addressed** (desain diperbaiki + bukti VM dua principal; keputusan owner K-10 tersisa; scope NOT VERIFIED) | §2 matriks ini. Bukti: H-TEN-11..15. |
| U-72 | Test seam F029_CHILD_SCRIPT | **addressed** (harness lokal) | Dipertahankan. |
| U-73 | Oracle terminasi (F-034) | **addressed** | Dipertahankan. |
| U-74 | File PID path tetap (F-035) | **addressed** | Dipertahankan. |
| U-75 | Parser starttime 0 (F-036) | **addressed** | Dipertahankan. |
| U-76 | Tes regresi path tetap (F-037) | **addressed** | Dipertahankan. |
| U-77 | Trust boundary UID-sama (F-035) | **accepted assumption** (risiko tersisa tercatat) | Dipertahankan. |
| U-78..U-86 | Risiko baru v2.3.20 (F-038..F-043) | **OPEN** (tercatat) | Dipertahankan; lihat proposal v2.3.20 Lampiran B. |
| U-87..U-96 | Risiko/temuan baru v2.3.21 (F-044..F-046) | **BARU — tercatat; U-91/U-94/U-95/U-96 addressed di level desain+VM, sisanya OPEN** | Lihat proposal §7 Lampiran B + matriks §5. |

## §2. Respons per temuan baru V14

### F-044 — High: migrasi SQLite mencoba menambahkan generated column STORED dengan ALTER TABLE ADD COLUMN — **addressed** (desain diperbaiki + bukti VM atas artefak; F-004 tetap OPEN/BLOCKED)

**Yang diubah:**
- Proposal v2.3.21 §4.3 DITULIS ULANG (migrasi 0006 teks v3):
  teks v2 SUPERSEDED dan TIDAK BOLEH dijalankan. Pendekatan yang
  dipilih: **rebuild create/copy/validate/swap** mengikuti prosedur
  12 langkah SQLite, dalam SATU transaksi atomik (`PRAGMA
  foreign_keys=OFF` → `BEGIN IMMEDIATE` → buat `projects_new` →
  salin → validasi V7/V8/V9 → drop + rename → pulihkan
  `sqlite_sequence` → buat ulang index → `checks.owner_user_id` →
  rebuild `saved_projects` → `foreign_key_check`/`integrity_check`
  → `COMMIT` → `PRAGMA foreign_keys=ON`).
- Urutan SQL/transaksi, FK handling, index/trigger handling
  (V5: 0 trigger/view — tercatat sebagai asumsi yang divalidasi),
  backup/restore (Fase 0 + H-MIG-06), failure injection + rollback
  atomik (H-MIG-05), dan down migration (file terpisah) semuanya
  ditulis eksplisit di artefak — bukan "Drizzle handles rebuild".
- Versi SQLite runtime target DITETAPKAN sejauh yang dapat
  diverifikasi: lantai versi >= 3.31.0 (up) / >= 3.35.0 (down);
  teruji 3.53.4 (Bun 1.4.4) dan 3.45.1 (CLI). Versi runtime artifact
  produksi dinyatakan **NOT VERIFIED** (U-90) — bukan pura-pura
  kompatibel; STAGE-P01 wajib mencatatnya.
- Tiga cacat tambahan pada teks v2 ditemukan karena harness
  mengeksekusi artefak (bukan menyalin teks tes): **U-94** (typo
  sintaks `lower(trim(`contract_address'))` — DDL v2 tidak pernah
  dapat dieksekusi apa adanya), **U-95** (ekspresi v2 mishandle
  prefix `0X` → `'0x0x...'`), **U-96** (ALTER ADD STORED gagal
  hanya pada tabel berisi — berhasil pada tabel kosong; jebakan
  dev/prod). Ketiganya diperbaiki di teks v3 + teruji.
- Alternatif VIRTUAL didokumentasikan dengan bukti (H-MIG-00b/c:
  ADD berhasil, index berfungsi) dan DITOLAK dengan alasan
  (CHECK tetap butuh rebuild; ubah semantik read-path tanpa
  keuntungan). Kolom biasa DITOLAK (sumber kebenaran pindah ke
  aplikasi). Decision Log lengkap: proposal §7.

**Bukti (VM, Bun 1.4.4 / SQLite 3.53.4, 2026-11-08 13:32:54 WIB):**
- Log `evidence/v2321/test-f044-f045-f046-migration-v2321.txt`
  (142 baris, SHA-256 `24c314b57bbcfc665cc80d91cbbff4842cb48fc0c1ff9a29972ee2491a579167`,
  exit 0): **109 assert PASS, 0 FAIL** — H-MIG-00 (reproduksi +
  nuansa isi-tabel), H-MIG-01 (migrasi sukses, 12/2/2 baris utuh,
  dump identik, id lanjut 13), H-MIG-02 (inspeksi schema),
  H-MIG-03/04 (pre-check abort, DB byte-identik), H-MIG-05
  (sabotase + crash, rollback penuh, DB byte-identik), H-MIG-06
  (backup/restore byte-identik), H-MIG-07 (re-run gagal bersih),
  H-MIG-08 (down migration, struktur == base), H-CAT-11..13,
  H-TEN-11..15.
- Log lintas versi
  `evidence/v2321/test-f044-f045-f046-migration-v2321-sqlite3451.txt`
  (40 baris, SHA-256 `3f3cecc313f7a700e3899e20b8a62559da58ca72f046b25d6a61d6231b8d5831`,
  exit 0): **25 assert PASS, 0 FAIL** — file artefak yang SAMA
  (SHA-256 `6c5bcbdc…`) dieksekusi di SQLite 3.45.1: migrasi + down
  + F-045 negatif lolos.
- Artefak: `evidence/v2321/0006_unified_ownership_and_uniqueness_v2321.sql`
  (339 baris, SHA-256 `6c5bcbdc4082497f682dd4d2908e71fa0f89a26bdb933c1d84b85e12edf2640c`),
  `evidence/v2321/0006_down_v2321.sql` (149 baris, SHA-256
  `1f1bf2a260174d5a424cfb855b74fd06f16d5e74bfd0f114104d9f5c9eac46cf`),
  harness `evidence/v2321/test-f044-f045-f046-migration-v2321.ts`
  (SHA-256 `6fb8bd905726b0c88d9933fe7fd4390863588360cffbb752364f60b305def040`).
- Log gagal dipertahankan terpisah (aturan raw log): run1-fail
  (typo U-94), run2-fail (90 PASS + 5 FAIL: urutan DROP INDEX di
  down file + CHECK format vs fungsi aplikasi + ekspektasi pesan
  error), sqlite3451-run1-fail (probe tabel kosong — U-96 belum
  dipahami). Lihat `evidence/v2321/README.md`.

**Risiko tersisa:** U-90 (versi SQLite runtime produksi NOT
VERIFIED — gate STAGE-P01); U-92 (pemetaan Drizzle 0.45.2 atas
schema hasil rebuild belum diverifikasi); U-93 (validasi SQL
tidak self-aborting di luar runner — penegakan pada runner).

### F-045 — Medium: klaim DB fail-closed untuk chain tidak dikenal tidak diwujudkan sebagai CHECK constraint — **addressed** (desain diperbaiki + bukti VM direct SQL; F-004 tetap OPEN/BLOCKED)

**Yang diubah:**
- Proposal v2.3.21 §4.3 (3d): DUA CHECK constraint NYATA sebagai
  SQL dalam definisi tabel hasil rebuild, BERNAMA eksplisit:
  `projects_chain_allowlist_ck` (allowlist 8 chain) dan
  `projects_contract_format_ck` (format per tipe chain). Keduanya
  terintegrasi dengan strategi rebuild F-044 (bukan ALTER terpisah
  — CHECK tidak dapat ditambahkan via ALTER TABLE).
- CHECK chain menolak INSERT DAN UPDATE, termasuk bila
  `contract_address` NULL — menutup bypass canonical-NULL yang
  ditunjukkan audit V14 §4 F-045: chain tak dikenal tidak dapat
  menjadi baris dengan canonical NULL yang lolos unique index,
  karena barisnya sendiri ditolak lebih dulu.
- CHECK format menyamakan himpunan input yang diterima DB dengan
  fungsi aplikasi (U-95): EVM menerima `0x`/`0X` + 40 hex ATAU
  40 hex tanpa prefix; Solana 32–44 base58 tanpa `0/O/I/l`/spasi.
- Skema hasil migrasi diperiksa langsung (`sqlite_master` memuat
  kedua nama CHECK; H-MIG-02b/c) — bukan hanya test mirror.

**Bukti (VM, sama seperti F-044):**
- H-CAT-11 (direct SQL, bukan via helper aplikasi): 9 penolakan
  — INSERT chain tak dikenal (+ alamat valid), INSERT chain tak
  dikenal + contract NULL, UPDATE chain → tak dikenal, INSERT
  salah case, INSERT spasi, INSERT Solana berkarakter ilegal,
  INSERT EVM pendek, INSERT EVM non-hex, UPDATE contract →
  format salah — semua DITOLAK dengan nama CHECK yang tepat;
  jumlah baris tetap.
- H-CAT-12: semua 8 chain allowlist lolos INSERT; duplikat EVM
  (case/prefix `0x`/`0X`/whitespace) DITOLAK unique index; Solana
  beda huruf DITERIMA; alamat sama lintas chain DITERIMA; NULL
  boleh >1 baris; duplikat nama ternormalisasi DITOLAK.
- H-CAT-13: fungsi JS == kolom generated DB untuk semua 12 baris
  seed + korpus edge.
- Lintas versi 3.45.1: INSERT chain tak dikenal (+ NULL contract)
  DITOLAK di CLI juga (H-MIG-09).

**Risiko tersisa:** U-95 (kesamaan himpunan input app-vs-DB harus
dijaga tiap kali aturan kanonik berubah); U-92 (pemetaan Drizzle).

### F-046 — Medium: legacy checks dengan owner_user_id NULL dirancang terbaca oleh semua principal — **addressed** (desain diperbaiki + bukti VM dua principal; keputusan owner K-10 tersisa; scope NOT VERIFIED)

**Yang diubah:**
- Proposal v2.3.21 §5 (DITULIS ULANG): default **fail-closed
  L-A**. `owner_user_id = NULL` berarti "tanpa pemilik tercatat",
  BUKAN "publik". Predikat lama v2.3.20
  (`owner_user_id = <principal> OR owner_user_id IS NULL`)
  DIHAPUS — harness membuktikan predikat itu membocorkan 2 baris
  legacy ke principal B (H-TEN-11d).
- Pseudodiff konsisten untuk `listChecks` (hanya `= <principal>`),
  `deleteCheck` (DELETE ... `AND owner_user_id = <principal>`,
  affected-rows harus 1, respons "tidak ditemukan" generik),
  `askGibran` (subquery checks hanya milik principal), plus fungsi
  terpisah `exportLegacyChecks` (admin/service-gated, §5) untuk
  audit/migrasi data legacy — BUKAN bagian `listChecks`.
- Opsi kebijakan legacy: L-A (default, berlaku sekarang), L-B
  (single-user terkonfirmasi — butuh bukti provider + keputusan
  owner), L-C (owner mapping berbasis bukti — tidak tersedia).
  Keputusan baru K-10.
- Scope database/action dinyatakan eksplisit **NOT VERIFIED**
  (proposal §5.1): tidak ada dokumentasi provider tentang scope
  `ctx.db` atau identitas principal; desain MENGASUMSIKAN
  MULTI-USER sampai terbukti sebaliknya.
- Migrasi TIDAK menulis ulang kepemilikan (baris legacy tetap
  NULL; tidak ditebak pemiliknya). Konsekuensi produk dicatat
  jujur (U-89): check anonim menjadi write-only sampai identitas
  principal ada (K-4).

**Bukti (VM, sama seperti F-044):**
- H-TEN-11: dua principal pada DB yang sama — B hanya melihat
  baris B (1 baris); A hanya baris A (2 baris); legacy NULL tidak
  terlihat siapa pun; kontras predikat lama = 3 baris untuk B
  (2 legacy bocor).
- H-TEN-12: DELETE lintas principal = 0 baris (baris A + legacy
  tetap ada); DELETE baris sendiri = 1; DELETE id tak ada = 0.
- H-TEN-13: askGibran(A) hanya membaca 2 baris A.
- H-TEN-14: predikat export legacy mengembalikan tepat 2 baris
  NULL (gate §5-nya TIDAK diuji — F-005 tetap OPEN).
- H-TEN-15: isolasi `saved_projects` pasca-rebuild (composite key
  menegakkan di DB); baris `'<LEGACY>'` utuh.

**Risiko tersisa:** K-10 belum diputuskan (L-B/L-C butuh bukti
provider); U-89 (anonim write-only); scope `ctx.db` NOT VERIFIED
— penerimaan runtime (runtime acceptance) untuk F-046 tetap
BLOCKED sampai bukti provider ada, meski desain fail-closed sudah
disediakan.

## §3. Response to Previous Handoff (V13) — carry-forward

V13 §8 butir 1–8 sudah dijawab v2.3.20 dan dikonfirmasi audit V14
§3 (F-038/F-039/F-041/F-042 ADDRESSED desain+VM; F-040/F-043
PARTIALLY ADDRESSED — keduanya kini diperbarui v2.3.21, lihat
§1/§2 di atas). Tidak ada butir V13 yang dibuka kembali di V14
selain F-040/F-043 (melalui F-044/F-045/F-046).

## §4. Respons atas 8 butir handoff V14 §9

| Butir | Respons | Bukti |
| --- | --- | --- |
| 1. Perbaiki F-044 | Addressed — rebuild + artefak dieksekusi + failure/rollback + down + lintas versi | §2 F-044; proposal §4; H-MIG-00..09 |
| 2. Perbaiki F-045 | Addressed — CHECK bernama + direct SQL + inspeksi schema | §2 F-045; proposal §4 (3d); H-CAT-11..13 |
| 3. Selesaikan F-046 | Addressed (desain + VM); K-10 tersisa; scope NOT VERIFIED | §2 F-046; proposal §5; H-TEN-11..15 |
| 4. Buktikan migrasi bukan mirror test | Addressed — harness menjalankan file artefak (SHA-256 di header log) | `evidence/v2321/`; H-MIG-01/02/05/08, H-CAT-13 |
| 5. Pertahankan F-001..F-005 OPEN/BLOCKED | Dipatuhi | §1; proposal §8 |
| 6. Pertahankan hard gates | Dipatuhi — tidak ada invoke checkLink, tidak ada perubahan source/migration/CI/deployment/live | §6 |
| 7. Perbarui blocker/readiness | Dipatuhi — peran tetap UNASSIGNED; 2 baris baru | `STAGING_READINESS_V2321.md` |
| 8. Raw logs dan provenance | Dipatuhi — run gagal terpisah; command/Bun/SQLite/kernel/UID/tanggal/exit/SHA-256/commit tercatat | `evidence/v2321/README.md` |

## §5. Risiko baru v2.3.21 (U-87..U-96)

| ID | Risiko/temuan | Status |
| --- | --- | --- |
| U-87 | Klaim jumlah baris katalog v2.3.20 salah (15 vs 12 terukur); jumlah DB live tidak terverifikasi | OPEN — migrasi v3 memakai jumlah aktual; operator mencatat jumlah live |
| U-88 | §D.4.31 dirujuk 9× tetapi badannya tidak pernah ditulis | OPEN — v2.3.21 menambahkan §D.4.32; §D.4.31 tidak difabrikasi retroaktif |
| U-89 | Check anonim menjadi write-only di bawah fail-closed sampai identitas principal ada (K-4) | OPEN — butuh keputusan K-4/K-10 |
| U-90 | Versi SQLite runtime artifact produksi TIDAK TERVERIFIKASI | OPEN — gate STAGE-P01; lantai versi 3.31.0/3.35.0 |
| U-91 | Preservasi AUTOINCREMENT `sqlite_sequence` saat rebuild | Addressed (desain + bukti VM) — H-MIG-01h |
| U-92 | Pemetaan Drizzle 0.45.2 atas schema hasil rebuild belum diverifikasi | OPEN — gate staging |
| U-93 | Validasi SQL tidak self-aborting di luar runner | OPEN — runner referensi = harness |
| U-94 | DDL proposal v2 mengandung typo sintaks | Addressed di v3 (diperbaiki + teruji); pelajaran proses: DDL proposal harus selalu dieksekusi harness |
| U-95 | Himpunan input app-vs-DB dapat menyimpang (prefix `0X`, tanpa prefix) | Addressed di v3 (disamakan + teruji); harus dijaga tiap perubahan aturan |
| U-96 | ALTER ADD STORED bergantung isi tabel (jebakan dev/prod) | Addressed (desain rebuild; didokumentasikan + teruji H-MIG-00a/e) |

## §6. Hard gates — No Implementation Confirmation

Revisi v2.3.21 mengubah HANYA: `SSRF_PROPOSAL_F001_F005_V2321.md`
(BARU), `SSRF_RESPONSE_MATRIX_V2321.md` (BARU),
`STAGING_READINESS_V2321.md` (BARU), `SSRF_REMEDIATION_DESIGN.md`
(header/changelog + §D.4.32), dan `evidence/v2321/` (artefak
migrasi + harness + README + log kanonik/non-kanonik). Verifikasi
`git status` sebelum commit menunjukkan TIDAK ADA perubahan pada
`site/**`, `package.json`, `bun.lock`, migration aktual di
`site/drizzle/`, workflow CI, deployment, database/katalog, atau
live artifact. `checkLink` TIDAK di-invoke. Link Scanner TIDAK
diaktifkan. Tidak ada tes produksi/destruktif. Status tetap
**DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**

## §7. Gate G-K (diperbarui)

Gate **G-K** kini: review proposal v2.3.21 + keputusan
K-1..K-5/K-7..K-10 + otorisasi tahap (b). Pemicu revisi v2.3.22
adalah audit independen V15, ATAU keputusan owner atas
K-1..K-5/K-7..K-10/G-A/G-C/G-D/G-F/G-G (G-K), ATAU bukti runtime
G-B (termasuk versi SQLite produksi, U-90), ATAU staging tersedia
(G-E). Gate G-A..G-J dipertahankan.

## §8. Test Evidence (ringkas — detail di README evidence)

| Paket | Perintah | Lingkungan | Hasil | Log |
| --- | --- | --- | --- | --- |
| H-MIG-00..08, H-CAT-11..13, H-TEN-11..15 | `bun test-f044-f045-f046-migration-v2321.ts` | Bun 1.4.4, SQLite 3.53.4, uid 0, kernel 7.0.0-43-generic, 2026-11-08 13:32:54 WIB, commit `48c3f94` | 109 PASS, 0 FAIL, exit 0 | `evidence/v2321/test-f044-f045-f046-migration-v2321.txt` (SHA-256 `24c314b5…`) |
| H-MIG-09 | `sh run-mig-sqlite3451.sh` | sqlite3 CLI 3.45.1, uid 0, 2026-11-08 13:32:54 WIB | 25 PASS, 0 FAIL, exit 0 | `evidence/v2321/test-f044-f045-f046-migration-v2321-sqlite3451.txt` (SHA-256 `3f3cecc3…`) |

Log non-kanonik: run1-fail (typo U-94), run2-fail (90 PASS + 5
FAIL: urutan DROP INDEX + CHECK format + ekspektasi pesan error),
sqlite3451-run1-fail (probe tabel kosong — U-96). Semua disimpan
terpisah dengan SHA-256 di `evidence/v2321/README.md`.

## §9. Changed Files

| File | Tujuan |
| --- | --- |
| `SSRF_PROPOSAL_F001_F005_V2321.md` (BARU, 606 baris) | Proposal revisi terarah: §4.3 migrasi v3, §5 kebijakan F-046, §6 verifikasi, §7 log perubahan + Decision Log, Lampiran B U-87..U-96 |
| `SSRF_RESPONSE_MATRIX_V2321.md` (BARU, file ini) | Matriks respons atas V14: §1 status, §2 F-044/045/046, §4 handoff, §5 risiko, §6 hard gates, §7 gate G-K, §8 bukti, §10 blocker |
| `STAGING_READINESS_V2321.md` (BARU) | Readiness diperbarui: peran tetap UNASSIGNED + 2 baris baru (SQLite runtime, K-10) |
| `SSRF_REMEDIATION_DESIGN.md` (diubah: header + changelog + §D.4.32 baru) | Desain diperbarui secukupnya tanpa menghapus riwayat |
| `evidence/v2321/0006_unified_ownership_and_uniqueness_v2321.sql` (BARU) | Artefak migrasi v3 yang dieksekusi harness |
| `evidence/v2321/0006_down_v2321.sql` (BARU) | Artefak down migration v3 |
| `evidence/v2321/test-f044-f045-f046-migration-v2321.ts` (BARU) | Harness utama (109 assert) |
| `evidence/v2321/crash-mid-migration.ts` (BARU) | Simulasi crash tengah migrasi |
| `evidence/v2321/run-mig-sqlite3451.sh` (BARU) | Driver lintas versi 3.45.1 (25 assert) |
| `evidence/v2321/README.md` (BARU) | README paket bukti + log non-kanonik |
| `evidence/v2321/test-f044-f045-f046-migration-v2321.txt` (BARU) | Log kanonik Bun (109 PASS) |
| `evidence/v2321/test-f044-f045-f046-migration-v2321-sqlite3451.txt` (BARU) | Log kanonik CLI 3.45.1 (25 PASS) |
| `evidence/v2321/test-f044-f045-f046-migration-v2321-run1-fail.txt` (BARU) | Log gagal run1 (typo U-94) |
| `evidence/v2321/test-f044-f045-f046-migration-v2321-run2-fail.txt` (BARU) | Log gagal run2 (5 FAIL) |
| `evidence/v2321/test-f044-f045-f046-migration-v2321-sqlite3451-run1-fail.txt` (BARU) | Log gagal CLI run1 (probe U-96) |

## §10. Unresolved Blockers

| Blocker | Owner yang dibutuhkan | Percobaan/bukti | Hasil | Langkah berikutnya |
| --- | --- | --- | --- | --- |
| F-044 versi runtime produksi (U-90) | Runtime provider / staging operator | `SELECT sqlite_version()` hanya dapat diukur di VM (3.53.4) + CLI (3.45.1); tidak ada akses ke runtime artifact | NOT VERIFIED | STAGE-P01 mencatat versi SQLite runtime produksi sebelum implementasi |
| F-045/F-044 pemetaan Drizzle (U-92) | Muse — schema designer + staging | Codegen Drizzle tidak dijalankan (tidak ada node_modules/instalasi di VM ini untuk site) | NOT VERIFIED | Jalankan `drizzle-kit generate` + typecheck pada staging sebelum implementasi |
| F-046 scope `ctx.db` + keputusan legacy (K-10) | Owner proyek + runtime provider | Pencarian dokumen provider di repo: tidak ada | NOT VERIFIED | Provider menyatakan tertulis scope DB/principal; owner memilih L-A/L-B/L-C |
| F-046 penerimaan runtime | Owner + provider | Desain fail-closed tersedia; bukti provider tidak ada | BLOCKED | Lihat baris di atas; desain tetap berlaku sementara itu |
| F-001..F-005 implementation | Pemilik proyek untuk otorisasi; Muse untuk perubahan setelah izin | Proposal v2.3.21 tersedia; source tetap identik | OPEN/BLOCKED | Selesaikan review desain dan keputusan owner sebelum implementasi |
| F-019 Link Scanner disabled | Runtime/artifact operator | Tidak ada bukti kontrol (a)–(e) | BLOCKED / NOT VERIFIED | Bukti read-only semua invocation paths; jangan invoke action |
| F-028 deployment provenance | Artifact operator/provider | Manifest belum terisi | NOT VERIFIED | Manifest artifact digest/source commit/release/approval/rollback |
| Staging roles + environment | Rama/provider/ops sesuai peran | Readiness v2.3.21 | Keenam role UNASSIGNED | Tetapkan owner dan staging sebelum STAGE-P01..P12 |
| F-030 build reproducibility | Runtime/build provider | Bun/lockfile mismatch dan absolute SDK path historis | CONFIRMED BLOCKER | Clean external builder + provenance SDK + frozen install/typecheck/build |
| U-93 validasi runner | Muse + staging operator | RAISE() tidak valid di SELECT biasa (aturan SQLite); harness adalah runner referensi | OPEN (didesain) | Runner migrasi staging WAJIB memeriksa VALIDATION sebelum COMMIT; uji runner itu di staging |
| U-87 jumlah baris DB live | DB/runtime owner | Jumlah repo = 12 terukur; jumlah live tidak dapat diukur dari VM | NOT VERIFIED | Operator mencatat jumlah aktual DB live saat migrasi |
