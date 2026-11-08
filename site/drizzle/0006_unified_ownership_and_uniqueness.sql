-- ======================================================================
-- 0006_unified_ownership_and_uniqueness.sql — MIGRASI AKTIF (branch dev)
-- Status: IMPLEMENTASI v2.3.23 (D-01) atas desain v2.3.21 (teks v3).
-- BUKAN lagi proposal: file ini adalah migrasi Drizzle yang dijalankan
-- runtime Hatch (site/drizzle/meta/_journal.json, idx 5).
--
-- ASAL TEKS: evidence/v2321/0006_unified_ownership_and_uniqueness_v2321.sql
-- (teks v3, SHA-256 6c5bcbdc4082497f682dd4d2908e71fa0f89a26bdb933c1d84b85e12edf2640c).
-- SQL DDL/DML di bawah IDENTIK dengan teks v3, DENGAN TIGA ADAPTASI FORMAT
-- yang diwajibkan runtime migrator Hatch (dibuktikan dari source runtime
-- /opt/hatch/skills/spaces/ts-runtime/dist/migrate.js — lihat catatan di
-- SSRF_RESPONSE_MATRIX_V2323.md §2 butir 1):
--   (a) Setiap statement dipisah oleh penanda breakpoint drizzle
--       (satu statement per chunk — migrator menjalankan tiap chunk
--       sebagai SATU statement libsql dan membuang diam-diam apa pun
--       setelah titik-koma pertama; JANGAN PERNAH menulis literal
--       penanda itu di dalam komentar file ini — splitter migrator
--       akan memotong file di sana).
--   (b) TIDAK ADA kontrol transaksi eksplisit (BEGIN/COMMIT/ROLLBACK):
--       migrator drizzle membungkus SELURUH batch migrasi pending dalam
--       satu transaksi (session.migrate) dan validatornya MENOLAK file
--       yang mengandung kontrol transaksi eksplisit.
--   (c) TIDAK ADA PRAGMA foreign_keys OFF/ON: session.migrate migrator
--       sudah menonaktifkan FK selama batch dan menghidupkannya lagi di
--       finally (migrate.js:1296/1310).
-- Validasi V1–V5 (pre-check) dan V7–V11 (in-transaction/post-check) dari
-- teks v3 TIDAK ADA di file ini karena migrator TIDAK DAPAT menegakkannya
-- (hasil SELECT diabaikan — tidak menggagalkan migrasi; keterbatasan U-93):
-- validasi itu dijalankan OPERATOR sebelum migrate + HARNESS sebelum
-- klaim apa pun — lihat evidence/v2323/test-migration-v2323.ts dan
-- dokumen revisi v2.3.23. JANGAN jalankan file ini tanpa pre-check.
--
-- PERSYARATAN VERSI SQLite: >= 3.31.0 (generated columns). Down migration
-- (file terpisah evidence/v2323/0006_down.sql, operator-run via sqlite3
-- CLI — BUKAN via migrator drizzle) butuh >= 3.35.0 (DROP COLUMN).
-- Versi SQLite runtime artifact produksi TIDAK TERVERIFIKASI (U-90);
-- teruji di VM: Bun 1.4.4 / SQLite 3.53.4 (migrator runtime aktual) dan
-- sqlite3 CLI 3.45.1. Validasi staging tetap pending.
--
-- FASE 0 (operator, di luar file ini): backup file DB (salin + SHA-256 +
-- jumlah baris per tabel); verifikasi backup dapat di-restore. JANGAN
-- lanjut tanpa backup terverifikasi.
-- PRE-CHECK (operator, SEBELUM migrate; tiap VALIDATION harus 0 baris):
--   V1 duplikat nama ternormalisasi; V2 duplikat alamat kanonik per chain
--   (ekspresi kanonik v3); V3 chain di luar allowlist; V4 format alamat
--   tidak valid; V5 trigger/view merujuk projects; V6 kolom
--   owner_user_id belum ada (PRAGMA table_info(checks)). Bila ada yang
--   mengembalikan baris: ABORT — jangan jalankan migrate.
--   (SQL pre-check lengkap ada di evidence/v2321/0006_..._v2321.sql
--   Fase 1 + diulang di harness v2.3.23 — file ini TIDAK mengulanginya.)
-- TIDAK idempotent: JANGAN re-run pada DB yang sudah termigrasi
-- (re-run gagal bersih di pre-check V6 / migrator tidak menjalankan
-- ulang karena hash/created_at sudah tercatat).
-- JUMLAH BARIS: tidak memakai angka hardcode (koreksi U-87). Repo
-- 0001–0005 menghasilkan 12 baris projects; operator mencatat jumlah
-- aktual SEBELUM migrasi dan mensyaratkan jumlah yang SAMA sesudahnya.
-- ======================================================================

-- Langkah 1: simpan nilai AUTOINCREMENT sequence (dipulihkan setelah rename).
CREATE TEMP TABLE `_mig_saved_seq` AS SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'projects';
--> statement-breakpoint
-- Langkah 2: tabel projects BARU — semua kolom 0003 + kolom kanonik STORED
-- + CHECK chain (F-045, bernama eksplisit) + CHECK format alamat + provenance.
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
--> statement-breakpoint
-- Langkah 3: salin data (kolom generated TIDAK ditulis — dihitung DB).
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
-- Langkah 6: unique index (dua index terpisah, scope GLOBAL).
CREATE UNIQUE INDEX `projects_name_normalized_unique`
  ON `projects` (lower(trim(`name`)));
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_contract_normalized_unique`
  ON `projects` (`chain`, `contract_address_canonical`)
  WHERE `contract_address` IS NOT NULL;
--> statement-breakpoint
-- Langkah 7: ownership HANYA untuk checks (F-040/F-046). Baris lama tetap
-- owner_user_id NULL ("tanpa pemilik tercatat", BUKAN "publik").
ALTER TABLE `checks` ADD COLUMN `owner_user_id` text;
--> statement-breakpoint
CREATE INDEX `checks_owner_idx` ON `checks` (`owner_user_id`);
--> statement-breakpoint
-- Langkah 8: saved_projects — rebuild ke composite key
-- (principal_id, project_id) + sentinel '<LEGACY>' untuk state lama.
CREATE TABLE `saved_projects_new` (
  `principal_id` text NOT NULL,
  `project_id` integer NOT NULL REFERENCES `projects` (`id`),
  `bookmarked` integer NOT NULL DEFAULT 1,
  `task_status` text NOT NULL DEFAULT 'not_started',
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`principal_id`, `project_id`)
);
--> statement-breakpoint
INSERT INTO `saved_projects_new`
  (`principal_id`, `project_id`, `bookmarked`, `task_status`, `updated_at`)
  SELECT '<LEGACY>', `project_id`, `bookmarked`, `task_status`, `updated_at`
  FROM `saved_projects`;
--> statement-breakpoint
DROP TABLE `saved_projects`;
--> statement-breakpoint
ALTER TABLE `saved_projects_new` RENAME TO `saved_projects`;
