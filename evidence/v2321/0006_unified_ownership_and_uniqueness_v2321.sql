-- ======================================================================
-- 0006_unified_ownership_and_uniqueness_v2321.sql — TEKS v3 (v2.3.21)
-- PROPOSAL ONLY — DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.
-- File ini BUKAN migrasi aktif. JANGAN disalin ke site/drizzle/ tanpa
-- persetujuan eksplisit terpisah dari pemilik proyek DAN review
-- audit independen berikutnya. File ini adalah ARTEFAK yang
-- dieksekusi harness evidence/v2321/test-f044-f045-f046-migration-v2321.ts
-- terhadap salinan disposable dari schema saat ini (0001-0005).
--
-- MENGGANTIKAN teks v2 (v2.3.20, SSRF_PROPOSAL_F001_F005_V2320.md
-- §4.3). Alasan penggantian: audit independen V14, temuan F-044
-- (ALTER TABLE ADD COLUMN ... STORED tidak valid di SQLite) dan
-- F-045 (CHECK constraint chain hanya disebut di komentar, tidak
-- ada sebagai SQL nyata). Teks v2 SUPERSEDED dan TIDAK BOLEH
-- dijalankan. NUANSA F-044 (U-96, dibuktikan H-MIG-00a/e):
-- ALTER ADD ... STORED GAGAL hanya pada tabel yang BERISI baris;
-- pada tabel KOSONG statement itu BERHASIL di SQLite 3.53.4 dan
-- 3.45.1. DDL v2 karena itu lolos di DB dev kosong dan gagal di
-- katalog produksi (12 baris) — jebakan dev/prod. Tambahan: teks
-- v2 juga mengandung TYPO sintaks pada ekspresi generated column
-- (U-94: `lower(trim(`contract_address'))` — backtick dibuka,
-- single-quote menutup — tidak valid; file v3 memakai bentuk yang
-- benar `lower(trim(`contract_address`))`).
--
-- PENDEKATAN YANG DIPILIH (F-044): REBUILD create/copy/validate/swap
-- untuk generated column STORED, mengikuti prosedur 12 langkah
-- SQLite (https://sqlite.org/lang_altertable.html — "Making Other
-- Kinds Of Table Schema Changes"). Alasan memilih rebuild atas dua
-- alternatif (lihat proposal v2.3.21 §4.3 dan Decision Log):
--   (a) VIRTUAL via ALTER TABLE ADD COLUMN memang valid dan teruji
--       (H-MIG-00), TETAPI CHECK constraint chain (F-045) TIDAK
--       DAPAT ditambahkan via ALTER TABLE — CHECK baru tetap
--       membutuhkan rebuild. Karena rebuild tidak dapat dihindari,
--       STORED dipertahankan dalam rebuild yang sama tanpa biaya
--       tambahan, dan seluruh penalaran v2.3.20 (H-CAT-10, unique
--       index, kesamaan app-vs-DB) tetap berlaku tanpa pembuktian
--       ulang atas jenis kolom yang berbeda.
--   (b) Kolom biasa yang diisi aplikasi DITOLAK: sumber kebenaran
--       kanonik akan menjadi kode aplikasi, bukan DB; butuh kontrol
--       audit/repair transaksional terpisah yang belum dirancang.
--
-- PERSYARATAN VERSI SQLite:
--   - Up migration: SQLite >= 3.31.0 (generated columns, 2020-01-22).
--   - Down migration (file terpisah 0006_down_v2321.sql):
--     SQLite >= 3.35.0 (ALTER TABLE DROP COLUMN).
--   - Teruji di VM ini pada SQLite 3.53.4 (Bun 1.4.4, bun:sqlite)
--     dan SQLite 3.45.1 (CLI sqlite3). Versi SQLite runtime artifact
--     produksi TIDAK TERVERIFIKASI (U-90) — STAGE-P01 wajib
--     mencatatnya sebelum implementasi; bila runtime produksi di
--     bawah 3.31.0, migrasi ini TIDAK BOLEH dijalankan.
--
-- CARA MENJALANKAN (operator / migration runner):
--   1. FASE 0 (di luar file ini): backup file app.db (salin file +
--      catat SHA-256 + jumlah baris per tabel). JANGAN lanjut tanpa
--      backup yang terverifikasi dapat di-restore (H-MIG-06).
--   2. Jalankan file ini statement demi statement, SATU koneksi,
--      dalam urutan tertulis. Pernyataan yang diawali komentar
--      "-- VALIDATION:" adalah query validasi: bila mengembalikan
--      SATU baris pun, runner WAJIB BERHENTI dan ROLLBACK (bila
--      transaksi sudah dimulai) — JANGAN lanjut ke statement
--      berikutnya, JANGAN COMMIT. Validasi di file ini TIDAK
--      self-aborting di luar runner (keterbatasan tercatat U-93:
--      RAISE() hanya berlaku di trigger/CHECK, bukan di SELECT
--      biasa) — penegakannya ada pada runner, dan harness
--      evidence/v2321 adalah runner referensi yang membuktikannya.
--   3. Migrasi ini TIDAK idempotent dan TIDAK BOLEH di-re-run pada
--      DB yang sudah termigrasi: re-run gagal bersih di pre-check
--      (H-MIG-07). Status migrasi dicatat di journal migrasi
--      operator (di luar file ini), bukan dengan re-run file ini.
--   4. Down migration hanya boleh dijalankan bila belum ada state
--      per-principal baru (pre-check file down menolak bila ada
--      baris saved_projects dengan principal_id <> '<LEGACY>').
--      Bila sudah ada, rollback = restore dari backup Fase 0.
--
-- JUMLAH BARIS: pre-check TIDAK memakai angka hardcode. v2.3.20
--   mengklaim katalog "15 baris" — SALAH: migrasi repo 0001-0005
--   menghasilkan 12 baris (12 INSERT di 0004; CATALOG di
--   actions.ts juga 12 entri) — koreksi U-87. Runner mencatat
--   jumlah aktual SEBELUM migrasi dan mensyaratkan jumlah yang
--   SAMA sesudahnya. Jumlah baris DB live TIDAK TERVERIFIKASI
--   dari VM ini dan wajib dicatat operator saat migrasi.
-- ======================================================================

-- ----------------------------------------------------------------------
-- FASE 1 — PRE-CHECK (read-only; SEBELUM BEGIN apa pun).
-- Setiap VALIDATION harus mengembalikan 0 baris. Bila ada yang
-- mengembalikan baris: ABORT — jangan mulai transaksi, jangan ubah
-- apa pun, laporkan baris yang dikembalikan untuk diselesaikan
-- manual. Duplikat TIDAK PERNAH dihapus diam-diam oleh migrasi.
-- ----------------------------------------------------------------------

-- VALIDATION V1: duplikat nama ternormalisasi (lower(trim(name))).
SELECT lower(trim(`name`)) AS dup_name, count(*) AS n FROM `projects`
  GROUP BY 1 HAVING count(*) > 1;

-- VALIDATION V2: duplikat alamat kanonik per chain, dengan ATURAN
-- KANONIK v2 (bukan lower() mentah — lower() mentah melaporkan
-- "duplikat" palsu untuk dua alamat Solana berbeda huruf, F-043).
-- Ekspresi di bawah IDENTIK dengan definisi generated column Fase 2.
SELECT `chain`,
  CASE
    WHEN `contract_address` IS NULL THEN NULL
    WHEN `chain` = 'Solana' THEN trim(`contract_address`)
    WHEN `chain` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain') THEN
      CASE WHEN lower(substr(trim(`contract_address`),1,2)) = '0x'
           THEN '0x' || lower(substr(trim(`contract_address`),3))
           ELSE '0x' || lower(trim(`contract_address`)) END
    ELSE NULL
  END AS canon,
  count(*) AS n
FROM `projects`
WHERE `contract_address` IS NOT NULL
GROUP BY 1, 2 HAVING count(*) > 1;

-- VALIDATION V3 (F-045): chain di luar allowlist. Harus 0 baris.
SELECT `id`, `name`, `chain` FROM `projects`
  WHERE `chain` NOT IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain','Solana');

-- VALIDATION V4: alamat kontrak yang formatnya tidak valid untuk
-- tipe chain-nya. EVM menerima DUA bentuk yang diterima fungsi
-- aplikasi canonicalizeContractAddress(): 0x/0X + 40 hex (42 char)
-- ATAU 40 hex tanpa prefix — keduanya dikanonikalisasi ke '0x' +
-- 40 hex lowercase oleh generated column. Solana harus 32-44 char
-- base58 tanpa 0/O/I/l/spasi. Harus 0 baris — bila ada, alamat
-- itu diperbaiki manual dulu; migrasi tidak menebak perbaikan.
SELECT `id`, `name`, `chain`, `contract_address` FROM `projects`
WHERE `contract_address` IS NOT NULL AND NOT (
  (`chain` = 'Solana'
    AND length(trim(`contract_address`)) BETWEEN 32 AND 44
    AND trim(`contract_address`) NOT GLOB '*[0OlI]*'
    AND trim(`contract_address`) NOT GLOB '* *')
  OR
  (`chain` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain')
    AND (
      (length(trim(`contract_address`)) = 42
       AND lower(substr(trim(`contract_address`),1,2)) = '0x'
       AND substr(trim(`contract_address`),3) NOT GLOB '*[^0-9a-fA-F]*')
      OR
      (length(trim(`contract_address`)) = 40
       AND trim(`contract_address`) NOT GLOB '*[^0-9a-fA-F]*')
    ))
);

-- VALIDATION V5: tidak ada trigger/view yang merujuk tabel projects
-- (bila ada, rebuild harus menciptakannya ulang — saat ini 0;
-- validasi ini menjaga asumsi itu tetap benar).
SELECT `type`, `name` FROM `sqlite_master`
  WHERE (`type` = 'trigger' OR `type` = 'view')
    AND `sql` LIKE '%projects%';

-- CATATAN V6 (bukan validasi SQL): tidak ada baris checks yang sudah
-- punya owner (kolom owner_user_id belum ada sebelum migrasi ini;
-- bila migrasi di-re-run atau dijalankan dua kali, kolom sudah ada
-- dan file ini gagal di Fase 2 — runner memeriksa keberadaan kolom
-- via PRAGMA table_info(checks) sebelum menjalankan file).

-- ----------------------------------------------------------------------
-- FASE 2 — TRANSAKSI TUNGGAL (ATOMIK). Satu kegagalan di langkah
-- mana pun = ROLLBACK seluruh fase; DB kembali ke keadaan sebelum
-- BEGIN (dibuktikan H-MIG-05). Urutan mengikuti prosedur 12 langkah
-- SQLite: matikan FK -> BEGIN -> buat tabel baru -> salin -> validasi
-- -> drop lama -> rename -> buat ulang index -> hidupkan FK -> COMMIT.
-- ----------------------------------------------------------------------

PRAGMA foreign_keys = OFF;

BEGIN IMMEDIATE;

-- Simpan nilai AUTOINCREMENT sequence (dipulihkan setelah rename;
-- DROP TABLE menghapus baris sqlite_sequence, RENAME membawa
-- sequence tabel baru — pemulihan eksplisit di bawah membuat hasil
-- deterministik apa pun perilaku rename itu).
CREATE TEMP TABLE _mig_saved_seq AS
  SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'projects';

-- Langkah 2a: tabel projects BARU — SEMUA kolom lama (urutan dan
-- definisi sama seperti 0003) + kolom kanonik STORED + CHECK chain
-- (F-045, bernama eksplisit agar dapat diperiksa di sqlite_master)
-- + CHECK format alamat + kolom provenance (nullable, diisi server).
CREATE TABLE `projects_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `ticker` text,
  `chain` text NOT NULL,
  `category` text NOT NULL,
  `segment` text NOT NULL,
  `status_label` text NOT NULL,
  `description` text NOT NULL,
  `difficulty` text NOT NULL,
  `reward_note` text,
  `contract_address` text,
  `contract_address_canonical` text GENERATED ALWAYS AS (
    CASE
      WHEN `contract_address` IS NULL THEN NULL
      WHEN `chain` = 'Solana' THEN trim(`contract_address`)
      WHEN `chain` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain') THEN
        CASE WHEN lower(substr(trim(`contract_address`),1,2)) = '0x'
             THEN '0x' || lower(substr(trim(`contract_address`),3))
             ELSE '0x' || lower(trim(`contract_address`)) END
      ELSE NULL
    END
  ) STORED,
  `explorer_url` text,
  `official_url` text,
  `x_handle` text,
  `verified_at` text NOT NULL,
  `verified_note` text NOT NULL,
  `sort` integer DEFAULT 0 NOT NULL,
  `provenance_source_url` text,
  `provenance_submitted_by` text,
  `provenance_verified_by` text,
  CONSTRAINT `projects_chain_allowlist_ck` CHECK (
    `chain` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain','Solana')
  ),
  CONSTRAINT `projects_contract_format_ck` CHECK (
    `contract_address` IS NULL
    OR (`chain` = 'Solana'
      AND length(trim(`contract_address`)) BETWEEN 32 AND 44
      AND trim(`contract_address`) NOT GLOB '*[0OlI]*'
      AND trim(`contract_address`) NOT GLOB '* *')
    OR (`chain` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain')
      AND (
        (length(trim(`contract_address`)) = 42
         AND lower(substr(trim(`contract_address`),1,2)) = '0x'
         AND substr(trim(`contract_address`),3) NOT GLOB '*[^0-9a-fA-F]*')
        OR
        (length(trim(`contract_address`)) = 40
         AND trim(`contract_address`) NOT GLOB '*[^0-9a-fA-F]*')
      ))
  )
);

-- Langkah 2b: salin data (daftar kolom eksplisit; kolom generated
-- TIDAK ditulis — dihitung DB; kolom provenance NULL — diisi server).
INSERT INTO `projects_new` (
  `id`, `name`, `ticker`, `chain`, `category`, `segment`,
  `status_label`, `description`, `difficulty`, `reward_note`,
  `contract_address`, `explorer_url`, `official_url`, `x_handle`,
  `verified_at`, `verified_note`, `sort`
)
SELECT
  `id`, `name`, `ticker`, `chain`, `category`, `segment`,
  `status_label`, `description`, `difficulty`, `reward_note`,
  `contract_address`, `explorer_url`, `official_url`, `x_handle`,
  `verified_at`, `verified_note`, `sort`
FROM `projects`;

-- VALIDATION V7 (di dalam transaksi): jumlah baris harus sama.
-- Mengembalikan SATU baris bila jumlah berbeda (runner ROLLBACK).
SELECT 'row-count-mismatch' AS problem,
  (SELECT count(*) FROM `projects`) AS old_n,
  (SELECT count(*) FROM `projects_new`) AS new_n
WHERE (SELECT count(*) FROM `projects`) <> (SELECT count(*) FROM `projects_new`);

-- VALIDATION V8 (di dalam transaksi): tidak boleh ada baris dengan
-- contract_address non-NULL yang canonical-nya NULL (chain sudah
-- lolos allowlist di V3, jadi NULL canonical di sini = inkonsistensi
-- ekspresi — ROLLBACK bila muncul).
SELECT `id`, `name`, `chain`, `contract_address`
  FROM `projects_new`
  WHERE `contract_address` IS NOT NULL
    AND `contract_address_canonical` IS NULL;

-- VALIDATION V9 (di dalam transaksi): tidak boleh ada duplikat
-- kanonik di tabel baru (V2 sudah memeriksa tabel lama; pemeriksaan
-- ulang ini menangkap inkonsistensi salinan).
SELECT `chain`, `contract_address_canonical` AS canon, count(*) AS n
  FROM `projects_new`
  WHERE `contract_address` IS NOT NULL
  GROUP BY 1, 2 HAVING count(*) > 1;

-- Langkah 2c: swap — drop lama, rename baru.
DROP TABLE `projects`;
ALTER TABLE `projects_new` RENAME TO `projects`;

-- Langkah 2d: pulihkan AUTOINCREMENT sequence (deterministik).
DELETE FROM `sqlite_sequence` WHERE `name` = 'projects';
INSERT INTO `sqlite_sequence` (`name`, `seq`)
  SELECT 'projects', `seq` FROM _mig_saved_seq;
DROP TABLE _mig_saved_seq;

-- Langkah 2e: unique index (dua index terpisah, scope GLOBAL).
CREATE UNIQUE INDEX `projects_name_normalized_unique`
  ON `projects` (lower(trim(`name`)));
CREATE UNIQUE INDEX `projects_contract_normalized_unique`
  ON `projects` (`chain`, `contract_address_canonical`)
  WHERE `contract_address` IS NOT NULL;

-- Langkah 2f: ownership HANYA untuk checks (F-040/F-046).
-- Baris lama tetap owner_user_id NULL ("tanpa pemilik tercatat",
-- BUKAN "publik" — lihat proposal v2.3.21 §4.3 langkah 1 dan §5.3:
-- NULL tidak pernah dibaca sebagai publik oleh principal biasa).
ALTER TABLE `checks` ADD COLUMN `owner_user_id` text;
CREATE INDEX `checks_owner_idx` ON `checks` (`owner_user_id`);

-- Langkah 2g: saved_projects — rebuild ke composite key
-- (principal_id, project_id) + sentinel '<LEGACY>' untuk state lama
-- yang pemiliknya tidak tercatat (F-040; sentinel terdokumentasi,
-- bukan ditebak sebagai user tertentu).
CREATE TABLE `saved_projects_new` (
  `principal_id` text NOT NULL,
  `project_id` integer NOT NULL REFERENCES `projects` (`id`),
  `bookmarked` integer NOT NULL DEFAULT 1,
  `task_status` text NOT NULL DEFAULT 'not_started',
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`principal_id`, `project_id`)
);
INSERT INTO `saved_projects_new`
  (`principal_id`, `project_id`, `bookmarked`, `task_status`, `updated_at`)
  SELECT '<LEGACY>', `project_id`, `bookmarked`, `task_status`, `updated_at`
  FROM `saved_projects`;
DROP TABLE `saved_projects`;
ALTER TABLE `saved_projects_new` RENAME TO `saved_projects`;

-- VALIDATION V10 (di dalam transaksi): integritas foreign key.
-- PRAGMA foreign_key_check harus mengembalikan 0 baris.
PRAGMA foreign_key_check;

-- VALIDATION V11 (di dalam transaksi): integritas file DB.
-- PRAGMA integrity_check harus mengembalikan tepat satu baris 'ok'.
PRAGMA integrity_check;

COMMIT;

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------
-- FASE 3 — POST-CHECK (read-only, setelah COMMIT). Runner mencatat
-- hasilnya sebagai bukti; bila ada yang gagal, rollback = restore
-- dari backup Fase 0 (transaksi sudah ter-commit — tidak ada lagi
-- ROLLBACK yang dapat dipakai).
--   - count(*) projects / checks / saved_projects == sebelum migrasi
--   - sqlite_master memuat: contract_address_canonical STORED,
--     projects_chain_allowlist_ck, projects_contract_format_ck,
--     kedua unique index, checks_owner_idx
--   - INSERT percobaan dengan chain tak dikenal DITOLAK (H-CAT-11)
--     — dijalankan harness pada salinan, BUKAN pada DB hasil migrasi
--     yang akan dipakai (agar DB hasil tidak terkotori baris uji)
-- ----------------------------------------------------------------------
