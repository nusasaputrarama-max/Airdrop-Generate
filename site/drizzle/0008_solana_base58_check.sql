-- ======================================================================
-- 0008_solana_base58_check.sql — MIGRASI AKTIF (branch dev)
-- Status: IMPLEMENTASI v2.3.24 (F-055) atas audit V18 §5.
-- BUKAN lagi proposal: file ini adalah migrasi Drizzle yang dijalankan
-- runtime Hatch (site/drizzle/meta/_journal.json, idx 7).
--
-- PERUBAHAN (satu-satunya): CHECK `projects_contract_format_ck` cabang
-- Solana kini menegakkan allowlist base58 PENUH — sebelumnya hanya
-- panjang 32–44 + larangan 0/O/I/l/spasi, sehingga string berisi `!`,
-- `-`, `_`, dsb. lolos CHECK lewat direct SQL (F-055). Cabang baru:
--   length 32–44 AND trim(addr) NOT GLOB '*[^1-9A-HJ-NP-Za-km-z]*'
-- yang persis sama dengan validator aplikasi
-- `canonicalizeContractAddress` di catalog.ts
-- (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/). Cabang EVM, CHECK chain, kolom
-- generated, unique index, dan semua tabel lain TIDAK BERUBAH.
--
-- ADAPTASI FORMAT (sama seperti 0006 — wajib runtime migrator Hatch):
--   (a) Setiap statement dipisah penanda breakpoint drizzle (satu
--       statement per chunk; JANGAN PERNAH menulis literal penanda itu
--       di dalam komentar file ini).
--   (b) TIDAK ADA kontrol transaksi eksplisit (BEGIN/COMMIT/ROLLBACK).
--   (c) TIDAK ADA PRAGMA.
-- PERSYARATAN VERSI SQLite: >= 3.31.0 (generated columns, sama seperti
-- 0006). Down migration (file terpisah evidence/v2324/0008_down.sql,
-- operator-run via sqlite3 CLI — BUKAN via migrator drizzle) butuh
-- >= 3.35.0 (DROP COLUMN tidak dipakai; rebuild tabel seperti 0006).
-- Versi SQLite runtime artifact produksi TIDAK TERVERIFIKASI (U-90);
-- teruji di VM: Bun 1.4.4 / SQLite 3.53.4 dan sqlite3 CLI 3.45.1.
--
-- FASE 0 (operator, di luar file ini): backup file DB (salin + SHA-256 +
-- jumlah baris per tabel); verifikasi backup dapat di-restore. JANGAN
-- lanjut tanpa backup terverifikasi.
-- PRE-CHECK (operator, SEBELUM migrate; harus 0 baris):
--   V1 baris Solana yang melanggar CHECK baru (bila ada, migrasi GAGAL
--   di INSERT SELECT — abort operator, perbaiki datanya dulu):
--     SELECT id, contract_address FROM projects WHERE chain = 'Solana'
--       AND contract_address IS NOT NULL
--       AND (length(trim(contract_address)) NOT BETWEEN 32 AND 44
--            OR trim(contract_address) GLOB '*[^1-9A-HJ-NP-Za-km-z]*');
--   (Data seed 0001–0005 tidak punya alamat Solana; jalur aplikasi
--   sudah menolak non-base58 sejak awal, jadi V1 diharapkan 0 — TETAP
--   jalankan pre-check, jangan percaya harapan.)
-- TIDAK idempotent: JANGAN re-run pada DB yang sudah termigrasi.
-- JUMLAH BARIS: projects/checks/saved_projects HARUS sama sebelum dan
-- sesudah migrasi (diuji H-B58 + H-MIG re-run).
-- ======================================================================

-- Langkah 1: simpan nilai AUTOINCREMENT sequence (dipulihkan setelah rename).
CREATE TEMP TABLE `_mig_saved_seq` AS SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'projects';
--> statement-breakpoint
-- Langkah 2: tabel projects BARU — identik dengan 0006 KECUALI cabang
-- Solana pada CHECK format (F-055: allowlist base58 penuh).
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
      AND trim(`contract_address`) NOT GLOB '*[^1-9A-HJ-NP-Za-km-z]*')
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
--> statement-breakpoint
-- Langkah 3: salin data (kolom generated TIDAK ditulis — dihitung DB).
INSERT INTO `projects_new` (
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
--> statement-breakpoint
-- Langkah 4: swap — drop lama, rename baru.
DROP TABLE `projects`;
--> statement-breakpoint
ALTER TABLE `projects_new` RENAME TO `projects`;
--> statement-breakpoint
-- Langkah 5: pulihkan AUTOINCREMENT sequence (deterministik).
DELETE FROM `sqlite_sequence` WHERE `name` = 'projects';
--> statement-breakpoint
INSERT INTO `sqlite_sequence` (`name`, `seq`)
  SELECT 'projects', `seq` FROM `_mig_saved_seq`;
--> statement-breakpoint
DROP TABLE `_mig_saved_seq`;
--> statement-breakpoint
-- Langkah 6: unique index (dua index terpisah, scope GLOBAL — sama
-- seperti 0006; dibuat ulang karena DROP TABLE menghapus index lama).
CREATE UNIQUE INDEX `projects_name_normalized_unique`
  ON `projects` (lower(trim(`name`)));
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_contract_normalized_unique`
  ON `projects` (`chain`, `contract_address_canonical`)
  WHERE `contract_address` IS NOT NULL;
