-- ======================================================================
-- 0006_down.sql — DOWN migration untuk migrasi AKTIF 0006 (v2.3.23, dev)
-- Status: IMPLEMENTASI v2.3.23 (D-01). File ini adalah artefak operator —
-- dijalankan MANUAL via sqlite3 CLI / runner bun:sqlite (satu koneksi,
-- urutan tertulis), BUKAN via migrator drizzle (tidak ada entri journal
-- untuk down migration; kontrol transaksi eksplisit di file ini memang
-- diperlukan di jalur operator itu).
-- Asal: evidence/v2321/0006_down_v2321.sql (SHA-256 sama 1f1bf2a2…,
-- kecuali header ini). Isi SQL TIDAK BERUBAH: down migration ini
-- mengembalikan schema ke keadaan sebelum 0006 v3 — dan 0006 aktif
-- memakai DDL yang sama dengan teks v3 (adaptasi hanya format drizzle:
-- breakpoint + tanpa kontrol transaksi eksplisit di file naik).
--
-- Mengembalikan schema ke keadaan sebelum 0006: tabel projects
-- seperti 0003 (tanpa kolom kanonik, tanpa CHECK, tanpa provenance),
-- checks tanpa owner_user_id, saved_projects dengan PK project_id
-- saja. Data katalog TIDAK dihapus: jumlah baris HARUS sama sebelum
-- dan sesudah down migration.
--
-- BATAS: down migration HANYA boleh dijalankan bila belum ada state
-- per-principal baru. Bila ada baris saved_projects dengan
-- principal_id <> '<LEGACY>', pre-check V-D1 gagal dan down
-- migration DITOLAK — rollback dalam keadaan itu = restore dari
-- backup Fase 0 migrasi naik, BUKAN file ini. Bila ada baris checks
-- dengan owner_user_id non-NULL, kolom itu dibuang BERSAMA
-- nilainya (pre-check V-D2 mencatat jumlahnya; operator harus
-- menyetujui kehilangan pemetaan owner itu — bila tidak setuju,
-- JANGAN jalankan file ini).
--
-- PERSYARATAN VERSI SQLite: >= 3.35.0 (ALTER TABLE DROP COLUMN).
-- Teruji di VM ini pada SQLite 3.53.4 (Bun 1.4.4) dan 3.45.1 (CLI).
--
-- Cara menjalankan: sama seperti migrasi naik — satu koneksi,
-- urutan tertulis; pernyataan "-- VALIDATION:" harus mengembalikan
-- 0 baris (atau 'ok' untuk integrity_check), bila tidak runner
-- WAJIB BERHENTI dan ROLLBACK.
-- ======================================================================

-- ----------------------------------------------------------------------
-- FASE 1 — PRE-CHECK (read-only; SEBELUM BEGIN apa pun).
-- ----------------------------------------------------------------------

-- VALIDATION V-D1: tidak boleh ada state per-principal baru.
SELECT `principal_id`, `project_id` FROM `saved_projects`
  WHERE `principal_id` <> '<LEGACY>';

-- VALIDATION V-D2 (informasi + persetujuan): baris checks yang
-- punya owner tercatat. Query ini MENGEMBALIKAN baris bila ada —
-- runner mencatat jumlahnya dan MEMINTA persetujuan operator
-- sebelum lanjut (nilai owner akan hilang bersama kolomnya).
-- Harness v2.3.21 menjalankannya pada salinan yang TIDAK punya
-- baris checks ber-owner, sehingga harus 0 baris di sana.
SELECT `id`, `owner_user_id` FROM `checks`
  WHERE `owner_user_id` IS NOT NULL;

-- VALIDATION V-D3: tidak ada trigger/view yang merujuk projects.
SELECT `type`, `name` FROM `sqlite_master`
  WHERE (`type` = 'trigger' OR `type` = 'view')
    AND `sql` LIKE '%projects%';

-- ----------------------------------------------------------------------
-- FASE 2 — TRANSAKSI TUNGGAL (ATOMIK).
-- ----------------------------------------------------------------------

PRAGMA foreign_keys = OFF;

BEGIN IMMEDIATE;

CREATE TEMP TABLE _mig_saved_seq AS
  SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'projects';

-- Rebuild projects ke definisi 0003 (persis, tanpa kolom baru).
CREATE TABLE `projects_old` (
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
  `explorer_url` text,
  `official_url` text,
  `x_handle` text,
  `verified_at` text NOT NULL,
  `verified_note` text NOT NULL,
  `sort` integer DEFAULT 0 NOT NULL
);
INSERT INTO `projects_old` (
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

-- VALIDATION V-D4: jumlah baris harus sama.
SELECT 'row-count-mismatch' AS problem,
  (SELECT count(*) FROM `projects`) AS old_n,
  (SELECT count(*) FROM `projects_old`) AS new_n
WHERE (SELECT count(*) FROM `projects`) <> (SELECT count(*) FROM `projects_old`);

DROP TABLE `projects`;
ALTER TABLE `projects_old` RENAME TO `projects`;

DELETE FROM `sqlite_sequence` WHERE `name` = 'projects';
INSERT INTO `sqlite_sequence` (`name`, `seq`)
  SELECT 'projects', `seq` FROM _mig_saved_seq;
DROP TABLE _mig_saved_seq;

-- checks: buang index owner dulu (DROP COLUMN gagal bila ada index
-- yang merujuk kolom itu), lalu buang kolom owner (DROP COLUMN
-- butuh SQLite >= 3.35.0).
DROP INDEX IF EXISTS `checks_owner_idx`;
ALTER TABLE `checks` DROP COLUMN `owner_user_id`;

-- saved_projects: rebuild ke PK project_id saja (definisi 0003).
CREATE TABLE `saved_projects_old` (
  `project_id` integer PRIMARY KEY NOT NULL,
  `bookmarked` integer DEFAULT 1 NOT NULL,
  `task_status` text DEFAULT 'not_started' NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO `saved_projects_old`
  (`project_id`, `bookmarked`, `task_status`, `updated_at`)
  SELECT `project_id`, `bookmarked`, `task_status`, `updated_at`
  FROM `saved_projects`;
DROP TABLE `saved_projects`;
ALTER TABLE `saved_projects_old` RENAME TO `saved_projects`;

-- VALIDATION V-D5: integritas foreign key (0 baris).
PRAGMA foreign_key_check;

-- VALIDATION V-D6: integritas file DB (tepat satu baris 'ok').
PRAGMA integrity_check;

COMMIT;

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------
-- FASE 3 — POST-CHECK (read-only): count(*) per tabel == sebelum
-- down migration; sqlite_master TIDAK lagi memuat
-- contract_address_canonical / projects_chain_allowlist_ck /
-- projects_contract_format_ck / kedua unique index / checks_owner_idx;
-- PRAGMA table_info(checks) TIDAK lagi memuat owner_user_id.
-- ----------------------------------------------------------------------
