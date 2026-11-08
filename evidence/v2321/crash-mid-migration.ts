// crash-mid-migration.ts — simulasi crash DI TENGAH migrasi (H-MIG-05b).
// Dipanggil harness sebagai PROSES TERPISAH dengan satu argumen: path DB.
// Proses ini: membuka DB, BEGIN IMMEDIATE, membuat projects_new +
// menyalin data + DROP TABLE projects, lalu process.exit(2) TANPA
// COMMIT — mensimulasikan proses migrasi yang mati (OOM/kill/power
// loss) di tengah transaksi. SQLite WAJIB memulihkan DB ke keadaan
// sebelum BEGIN saat koneksi berikutnya dibuka (rollback journal).
// Exit code 2 = "crash" yang disengaja (bukan error harness).
// Usage: bun crash-mid-migration.ts <path-db>

import { Database } from "bun:sqlite";

const path = process.argv[2];
if (!path) {
  console.error("usage: bun crash-mid-migration.ts <path-db>");
  process.exit(3);
}

const db = new Database(path);
db.exec("PRAGMA foreign_keys = OFF");
db.exec("BEGIN IMMEDIATE");
db.exec(
  "CREATE TABLE projects_new (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, x TEXT)",
);
db.exec("INSERT INTO projects_new (id, name) SELECT id, name FROM projects");
db.exec("DROP TABLE projects");
db.exec("ALTER TABLE projects_new RENAME TO projects");
console.log("crash-mid-migration: partial work done, exiting WITHOUT COMMIT (simulated crash)");
process.exit(2);
