-- ======================================================================
-- 0007_scan_leases_and_rate_limits.sql — MIGRASI AKTIF (branch dev)
-- Status: IMPLEMENTASI v2.3.23 (D-06 / F-003c) atas desain v2.3.20 §3.
-- BUKAN lagi proposal: file ini adalah migrasi Drizzle yang dijalankan
-- runtime Hatch (site/drizzle/meta/_journal.json, idx 6).
--
-- Dua tabel ephemeral untuk kontrol sumber daya checkLink (F-003):
--   scan_leases  — satu baris = satu pemeriksaan yang sedang berjalan
--                  (batas global MAX_SCAN_CONCURRENCY = 5);
--   rate_limits  — counter per (principal, window, window_start)
--                  (10/menit + 100/jam per principal).
-- Isi kedua tabel ini EPHEMERAL: baris kedaluwarsa dibersihkan
-- best-effort oleh aplikasi (scan-limits.ts) — bukan oleh migrasi.
-- Lease yang ditinggalkan scan yang crash kedaluwarsa lewat TTL
-- (25 detik > deadline total 20 detik — by design, lease tidak pernah
-- kedaluwarsa di tengah scan normal).
--
-- ADAPTASI FORMAT (sama seperti 0006 — wajib runtime migrator Hatch,
-- dibuktikan dari source /opt/hatch/skills/spaces/ts-runtime/dist/migrate.js):
--   (a) Setiap statement dipisah penanda breakpoint drizzle (satu
--       statement per chunk — migrator menjalankan tiap chunk sebagai
--       SATU statement libsql dan membuang diam-diam apa pun setelah
--       titik-koma pertama; JANGAN PERNAH menulis literal penanda itu
--       di dalam komentar file ini).
--   (b) TIDAK ADA kontrol transaksi eksplisit (BEGIN/COMMIT/ROLLBACK).
--   (c) TIDAK ADA PRAGMA.
-- PERSYARATAN VERSI SQLite: CREATE TABLE + CREATE INDEX saja —
-- kompatibel dengan semua versi yang didukung (>= 3.0). UPSERT
-- (ON CONFLICT DO UPDATE, butuh >= 3.24.0) dipakai APLIKASI
-- (scan-limits.ts), bukan migrasi ini. Versi SQLite runtime artifact
-- produksi TIDAK TERVERIFIKASI (U-90).
-- TIDAK idempotent: JANGAN re-run pada DB yang sudah termigrasi.
-- ======================================================================

CREATE TABLE `scan_leases` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `principal_id` text NOT NULL,
  `acquired_at` integer NOT NULL,
  `expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scan_leases_expires_idx` ON `scan_leases` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
  `principal_id` text NOT NULL,
  `window` text NOT NULL,
  `window_start` integer NOT NULL,
  `count` integer NOT NULL DEFAULT 1,
  PRIMARY KEY (`principal_id`, `window`, `window_start`)
);
