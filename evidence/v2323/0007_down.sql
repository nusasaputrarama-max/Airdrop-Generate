-- ======================================================================
-- 0007_down.sql — DOWN migration untuk migrasi AKTIF 0007 (v2.3.23, dev)
-- Status: IMPLEMENTASI v2.3.23 (D-03, F-003c). File ini adalah artefak operator —
-- dijalankan MANUAL via sqlite3 CLI (satu koneksi, urutan tertulis),
-- BUKAN via migrator drizzle (tidak ada entri journal untuk down
-- migration; kontrol transaksi eksplisit di file ini memang diperlukan
-- di jalur operator itu).
--
-- Mengembalikan schema ke keadaan setelah 0006 saja: menghapus tabel
-- ephemeral scan_leases dan rate_limits (migrasi 0007). Isi kedua tabel
-- ini EPHEMERAL (lease scan yang sedang berjalan + counter rate limit)
-- — menghapusnya tidak menghilangkan data katalog, riwayat checks,
-- atau state saved_projects. Jumlah baris projects/checks/
-- saved_projects HARUS sama sebelum dan sesudah down migration.
--
-- BATAS: down migration ini TIDAK menyentuh artefak 0006 (generated
-- column STORED, kedua CHECK bernama, kedua unique index,
-- checks.owner_user_id, saved_projects composite PK) — semuanya harus
-- tetap utuh sesudah file ini dijalankan (diuji H-MIG-08b).
-- Bila ada scan yang sedang berjalan saat file ini dijalankan, lease-nya
-- hilang bersama tabel — jalankan hanya saat tidak ada scan aktif, atau
-- terima bahwa scan yang sedang berjalan kehilangan lease-nya (scan itu
-- sendiri tetap dibatasi deadline totalnya dan tidak bisa menggantung).
--
-- PERSYARATAN VERSI SQLite: DROP TABLE saja — kompatibel dengan semua
-- versi yang didukung. Teruji di VM ini pada SQLite 3.53.4 (Bun 1.4.4)
-- dan 3.45.1 (CLI sqlite3).
--
-- Cara menjalankan: sqlite3 -bail <db> < evidence/v2323/0007_down.sql
-- Pernyataan "-- VALIDATION:" harus mengembalikan 0 baris (atau 'ok'
-- untuk integrity_check); bila tidak, runner WAJIB BERHENTI dan
-- ROLLBACK.
-- ======================================================================

-- ----------------------------------------------------------------------
-- FASE 1 — PRE-CHECK (read-only; SEBELUM BEGIN apa pun).
-- ----------------------------------------------------------------------

-- VALIDATION V-D7: kedua tabel 0007 ada sebelum di-drop (bila tidak ada,
-- down migration ini sudah pernah dijalankan / 0007 belum diterapkan —
-- jangan lanjut).
SELECT 'missing-scan_leases' AS problem
  WHERE NOT EXISTS (SELECT 1 FROM `sqlite_master` WHERE `type` = 'table' AND `name` = 'scan_leases');
SELECT 'missing-rate_limits' AS problem
  WHERE NOT EXISTS (SELECT 1 FROM `sqlite_master` WHERE `type` = 'table' AND `name` = 'rate_limits');

-- ----------------------------------------------------------------------
-- FASE 2 — TRANSAKSI TUNGGAL (ATOMIK).
-- ----------------------------------------------------------------------

PRAGMA foreign_keys = OFF;

BEGIN IMMEDIATE;

DROP TABLE `scan_leases`;
DROP TABLE `rate_limits`;

-- VALIDATION V-D8: integritas foreign key (0 baris).
PRAGMA foreign_key_check;

-- VALIDATION V-D9: integritas file DB (tepat satu baris 'ok').
PRAGMA integrity_check;

COMMIT;

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------
-- FASE 3 — POST-CHECK (read-only): sqlite_master TIDAK lagi memuat
-- scan_leases / rate_limits / scan_leases_expires_idx; skema 0006
-- (projects/checks/saved_projects) tidak berubah; count(*) per tabel
-- katalog == sebelum down migration.
-- ----------------------------------------------------------------------
