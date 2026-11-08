-- ======================================================================
-- 0008_down.sql — DOWN migration untuk migrasi AKTIF 0008 (v2.3.24, dev)
-- Status: IMPLEMENTASI v2.3.24 (F-055). File ini adalah artefak operator —
-- dijalankan MANUAL via sqlite3 CLI (satu koneksi, urutan tertulis),
-- BUKAN via migrator drizzle (tidak ada entri journal untuk down
-- migration; kontrol transaksi eksplisit di file ini memang diperlukan
-- di jalur operator itu).
--
-- Mengembalikan CHECK `projects_contract_format_ck` ke keadaan 0006
-- (cabang Solana: panjang 32–44 + larangan 0/O/I/l/spasi saja) dengan
-- me-rebuild tabel projects — skema lain (CHECK chain, kolom generated,
-- unique index, owner checks, tabel 0007) TIDAK berubah.
--
-- PERINGATAN: down ini MELEMAHKAN validasi DB (mengembalikan celah
-- F-055). Jalankan hanya untuk rollback darurat yang disengaja, dan
-- catat alasannya. Setelah down, direct SQL dengan alamat Solana
-- non-base58 (mis. mengandung `!`) akan lolos CHECK lagi — aplikasi
-- tetap menolaknya (validator catalog.ts tidak berubah), tapi jaminan
-- DB-nya hilang sampai 0008 diterapkan ulang.
--
-- PRE-CHECK (operator, SEBELUM BEGIN): tidak ada — rebuild menyalin
-- semua baris apa adanya; baris yang valid di bawah 0008 juga valid di
-- bawah 0006 (CHECK lama lebih lemah), jadi tidak ada baris yang bisa
-- gagal di INSERT SELECT. Jumlah baris HARUS sama sebelum/sesudah.
--
-- PERSYARATAN VERSI SQLite: >= 3.31.0 (generated columns, sama seperti
-- 0006). Teruji di VM ini pada SQLite 3.53.4 (Bun 1.4.4) dan 3.45.1
-- (CLI sqlite3).
--
-- Cara menjalankan: sqlite3 -bail <db> < evidence/v2324/0008_down.sql
-- Pernyataan "-- VALIDATION:" harus mengembalikan 0 baris (atau 'ok'
-- untuk integrity_check); bila tidak, runner WAJIB BERHENTI dan
-- ROLLBACK.
-- ======================================================================

-- ----------------------------------------------------------------------
-- FASE 1 — PRE-CHECK (read-only; SEBELUM BEGIN apa pun).
-- ----------------------------------------------------------------------

-- VALIDATION V-D8a: CHECK 0008 ada sebelum di-downgrade (bila tidak ada,
-- 0008 belum diterapkan / down ini sudah pernah dijalankan — jangan lanjut).
SELECT 'missing-0008-check' AS problem
  WHERE NOT EXISTS (
    SELECT 1 FROM `sqlite_master`
    WHERE `type` = 'table' AND `name` = 'projects'
      AND `sql` LIKE '%[^1-9A-HJ-NP-Za-km-z]%'
  );

-- VALIDATION V-D8b: jumlah baris tercatat (post-check membandingkan).
SELECT 'projects-count=' || count(*) AS info FROM `projects`;
SELECT 'checks-count=' || count(*) AS info FROM `checks`;
SELECT 'saved-count=' || count(*) AS info FROM `saved_projects`;

-- ----------------------------------------------------------------------
-- FASE 2 — TRANSAKSI TUNGGAL (ATOMIK).
-- ----------------------------------------------------------------------

PRAGMA foreign_keys = OFF;

BEGIN IMMEDIATE;

CREATE TEMP TABLE `_down_saved_seq` AS SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'projects';

CREATE TABLE `projects_down` (
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

INSERT INTO `projects_down` (
  `id`, `name`, `ticker`, `chain`, `category`, `segment`,
  `status_label`, `description`, `difficulty`, `reward_note`,
  `contract_address`, `explorer_url`, `official_url`, `x_handle`,
  `verified_at`, `verified_note`, `sort`,
  `provenance_source_url`, `provenance_submitted_by`, `provenance_verified_by`
)
SELECT
  `id`, `name`, `ticker`, `chain`, `category`, `segment`,
  `status_label`, `description`, `difficulty`, `reward_note`,
  `contract_address`, `explorer_url`, `official_url`, `x_handle`,
  `verified_at`, `verified_note`, `sort`,
  `provenance_source_url`, `provenance_submitted_by`, `provenance_verified_by`
FROM `projects`;

DROP TABLE `projects`;
ALTER TABLE `projects_down` RENAME TO `projects`;

DELETE FROM `sqlite_sequence` WHERE `name` = 'projects';
INSERT INTO `sqlite_sequence` (`name`, `seq`)
  SELECT 'projects', `seq` FROM `_down_saved_seq`;
DROP TABLE `_down_saved_seq`;

CREATE UNIQUE INDEX `projects_name_normalized_unique`
  ON `projects` (lower(trim(`name`)));
CREATE UNIQUE INDEX `projects_contract_normalized_unique`
  ON `projects` (`chain`, `contract_address_canonical`)
  WHERE `contract_address` IS NOT NULL;

-- VALIDATION V-D8c: integritas foreign key (0 baris).
PRAGMA foreign_key_check;

-- VALIDATION V-D8d: integritas file DB (tepat satu baris 'ok').
PRAGMA integrity_check;

COMMIT;

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------
-- FASE 3 — POST-CHECK (read-only): CHECK 0008 TIDAK ADA lagi; CHECK
-- 0006 (larangan 0/O/I/l/spasi) kembali; jumlah baris per tabel sama
-- dengan FASE 1; unique index + kolom generated utuh.
-- ----------------------------------------------------------------------
