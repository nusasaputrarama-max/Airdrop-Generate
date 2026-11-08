// test-migration-v2323.ts — revisi desain v2.3.23 (SSRF remediation, D-01/D-06).
//
// MEMBUKTIKAN, dengan MENJALANKAN ARTEFAK MIGRASI YANG SEBENARNYA
// (file site/drizzle/0006 + 0007 via migrator CLI NYATA — bukan model,
// bukan copy-paste test-only), bahwa migrasi aktif branch dev:
//   H-MIG-00  Reproduksi F-044 (ALTER ADD STORED gagal di tabel berisi).
//   H-MIG-01  (a) DB kosong + migrator nyata: exit 0, normalized [],
//             8 migrasi tercatat, seed 12 baris, seq 12, artefak 0006+
//             0007 + 0008, FK 0, integrity ok. (b) Jalur populated-DB: 0001–
//             0005 + fixture legacy, lalu 0006+0007+0008 sebagai pending —
//             sukses + row count sama sebelum/sesudah; sub-kasus
//             negatif: duplikat kanonik digagalkan pre-check.
//   H-MIG-02  Inspeksi schema hasil migrasi (STORED, 2 CHECK bernama,
//             2 unique index, owner, composite PK, tabel 0007).
//   H-MIG-03  Pre-check V1/V2 duplikat -> abort SEBELUM BEGIN;
//             DB byte-identik (migrator TIDAK dijalankan).
//   H-MIG-04  Pre-check V3 chain tak dikenal -> abort; DB byte-identik.
//   PRE-V4/V5 Pre-check V4 format alamat invalid + V5 trigger/view ->
//             abort; DB byte-identik. (V6: kolom owner belum ada.)
//   H-MIG-05  Failure injection + rollback: (a) copy 0006 disabotase
//             (index ke tabel tak ada); (b) checks sudah punya kolom
//             owner_user_id. Migrator gagal bersih, state tak berubah.
//   H-MIG-06  Backup/restore: restore byte-identik dengan backup.
//   H-MIG-07  Re-run: (a) migrator re-run = no-op bersih (ledger
//             gating); (b) file 0006 di-re-run LANGSUNG (tanpa migrator)
//             GAGAL di chunk #10 (ADD COLUMN duplikat) — rebuild
//             projects sebelum titik gagal ternyata idempotent pada
//             data/skema ini (schemaDump tak berubah), TETAPI itu
//             kebetulan urutan, bukan jaminan: kegagalan di chunk
//             lain bisa mengaplikasi sebagian. File JANGAN pernah
//             di-re-run langsung.
//   H-MIG-08  Down migration 0006 + 0007 (baru) via sqlite3 CLI:
//             schema kembali ke base / 0006 tetap utuh; row count tetap;
//             guard V-D1/V-D2.
//   H-MIG-09  Cross-version SQLite 3.45.1 (CLI): 0006+0007 + negatif
//             F-045 + down, pada file artefak yang SAMA.
//   H-CAT-11  F-045: direct SQL INSERT/UPDATE negatif (CHECK nyata).
//   H-CAT-12  F-045: positif allowlist + uniqueness.
//   H-CAT-13  canonicalizeContractAddress ASLI (catalog.ts) == kolom
//             generated DB (seed + edge + NULL).
//   H-TEN-11..15 F-046/F-040 via handler Actions ASLI (actions.ts)
//             + mock ctx + drizzle libsql NYATA atas DB disposable.
//   DK-01..07 Drizzle-kit DDL diff: DDL dari schema.ts ASLI dibanding
//             semantik dengan skema hasil migrasi (file DK v2.3.24 di
//             evidence/v2324/drizzle-kit-generated/ — CHECK Solana baru).
//
// BUKTI VM SAJA — bukan staging, bukan produksi. Semua DB disposable
// di direktori temp (mkdtemp 0700); DB/katalog live TIDAK disentuh;
// tidak ada request jaringan (checkLink TIDAK di-invoke; drizzle-kit
// DDL dibangkitkan offline sebelumnya — lihat
// evidence/v2324/drizzle-kit-generated/README.md).
//
// Usage (dari root worktree):
//   bun evidence/v2323/test-migration-v2323.ts > evidence/v2323/test-migration-v2323.log 2>&1
// Exit 0 = semua assertion PASS; exit 1 = ada FAIL atau BLOCKED.
// Bila run gagal: JANGAN timpa log kanonik. Simpan sebagai
// *-run<N>-fail.txt, perbaiki penyebabnya, lalu re-run.

import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalizeContractAddress } from "../../site/server/src/catalog";
import { Actions } from "../../site/server/src/actions";
import { drizzle } from "../../site/node_modules/drizzle-orm/libsql";
import { createClient } from "../../site/node_modules/@libsql/client";

let pass = 0;
let fail = 0;
const failures: string[] = [];
const blocked: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`FAIL ${name}${detail ? " — " + detail : ""}`);
  }
}
function block(name: string, reason: string) {
  fail++;
  blocked.push(`${name}: ${reason}`);
  failures.push(name);
  console.log(`BLOCKED ${name} — ${reason}`);
}
process.on("unhandledRejection", (e) => {
  fail++;
  failures.push(`unhandledRejection: ${String(e)}`);
  console.log(`FAIL unhandledRejection — ${String(e)}`);
});

// ------------------------------------------------------------------
// Header lingkungan.
// ------------------------------------------------------------------
const wib = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: "Asia/Jakarta", hour12: false });
const now = new Date();
const repoRoot = join(import.meta.dir, "..", "..");
const evDir = import.meta.dir;
const sha256 = (buf: Buffer | string) =>
  createHash("sha256").update(buf).digest("hex");
const shaFile = (p: string): string => sha256(readFileSync(p));
console.log("=== test-migration-v2323 (revisi desain v2.3.23, D-01/D-06) ===");
console.log(`date: ${wib(now)} WIB`);
console.log(`bun: ${Bun.version}`);
{
  const probe = new Database(":memory:");
  console.log(
    `sqlite_version (bun:sqlite): ${String((probe.query("SELECT sqlite_version() AS v").get() as any).v)}`,
  );
  probe.close();
}
{
  const cli = Bun.spawnSync(["sqlite3", "--version"]);
  console.log(`sqlite3 CLI: ${cli.stdout.toString().trim()} (exit ${cli.exitCode})`);
}
console.log(`uid: ${typeof process.getuid === "function" ? process.getuid() : "n/a"}`);
console.log(`kernel: ${Bun.spawnSync(["uname", "-r"]).stdout.toString().trim()}`);
{
  const git = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: repoRoot });
  console.log(`commit HEAD: ${git.stdout.toString().trim()}`);
  const br = Bun.spawnSync(["git", "branch", "--show-current"], { cwd: repoRoot });
  console.log(`branch: ${br.stdout.toString().trim()} (HARUS dev)`);
}
console.log("env: VM lokal — BUKAN staging, BUKAN produksi; DB disposable di temp dir; no checkLink; no network");
const MIGRATOR = "/opt/hatch/skills/spaces/ts-runtime/dist/migrate.js";
console.log(`migrator nyata: ${MIGRATOR}`);
console.log(`  sha256: ${shaFile(MIGRATOR).slice(0, 32)}…`);
const MIG06 = join(repoRoot, "site", "drizzle", "0006_unified_ownership_and_uniqueness.sql");
const MIG07 = join(repoRoot, "site", "drizzle", "0007_scan_leases_and_rate_limits.sql");
const DOWN06 = join(evDir, "0006_down.sql");
const DOWN07 = join(evDir, "0007_down.sql");
const DK_SQL = join(repoRoot, "evidence", "v2324", "drizzle-kit-generated", "0000_amused_dorian_gray.sql");
for (const [label, p] of [
  ["migration 0006 (AKTIF)", MIG06],
  ["migration 0007 (AKTIF)", MIG07],
  ["down 0006", DOWN06],
  ["down 0007 (BARU)", DOWN07],
  ["drizzle-kit generated DDL", DK_SQL],
  ["schema.ts (ASLI)", join(repoRoot, "site", "server", "src", "schema.ts")],
  ["catalog.ts (ASLI)", join(repoRoot, "site", "server", "src", "catalog.ts")],
  ["actions.ts (ASLI)", join(repoRoot, "site", "server", "src", "actions.ts")],
] as const) {
  console.log(`${label}: ${p.split("/").slice(-2).join("/")} sha256=${shaFile(p)}`);
}
console.log(`harness ini: sha256=${shaFile(import.meta.path)}`);

// ------------------------------------------------------------------
// Util umum.
// ------------------------------------------------------------------
const JOURNAL_WHEN = [1794042899606, 1794042899606, 1794043679911, 1794043817586, 1794046846965, 1794122805971, 1794123882373, 1794130567244];
const JOURNAL_TAGS = ["0001_initial", "0002_checks_table_replaces_entries", "0003_add_projects_catalog_and_saved_projects", "0004_seed_projects_catalog_permanently", "0005_translate_catalog_text_to_bahasa_indonesia", "0006_unified_ownership_and_uniqueness", "0007_scan_leases_and_rate_limits", "0008_solana_base58_check"];

function counts(db: Database): Record<string, number> {
  const c: Record<string, number> = {};
  for (const t of ["projects", "checks", "saved_projects", "scan_leases", "rate_limits"]) {
    try {
      c[t] = Number((db.query(`SELECT count(*) AS n FROM ${t}`).get() as any).n);
    } catch {
      c[t] = -1; // tabel belum ada
    }
  }
  return c;
}
function tryExec(db: Database, sql: string): { ok: boolean; error?: string } {
  try { db.exec(sql); return { ok: true }; } catch (e: any) { return { ok: false, error: String(e?.message ?? e) }; }
}
function tryRun(db: Database, sql: string, ...params: any[]): { ok: boolean; error?: string; changes?: number } {
  try {
    const info = db.query(sql).run(...params);
    return { ok: true, changes: Number(info.changes) };
  } catch (e: any) { return { ok: false, error: String(e?.message ?? e) }; }
}
function projectDump(db: Database): string {
  const rows: any[] = db.query("SELECT id, name, ticker, chain, category, segment, status_label, description, difficulty, reward_note, contract_address, explorer_url, official_url, x_handle, verified_at, verified_note, sort FROM projects ORDER BY id").all();
  return JSON.stringify(rows);
}
/** Dump state skema (untuk perbandingan sebelum/sesudah; bukan byte). */
function schemaDump(db: Database): string {
  const master: any[] = db.query("SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY type, name").all();
  const extra: Record<string, any> = {};
  for (const t of ["projects", "checks", "saved_projects", "scan_leases", "rate_limits"]) {
    try {
      extra[t] = {
        info: db.query(`PRAGMA table_info(${t})`).all(),
        idx: db.query(`PRAGMA index_list(${t})`).all(),
        fk: db.query(`PRAGMA foreign_key_list(${t})`).all(),
      };
    } catch { /* tabel tak ada */ }
  }
  return JSON.stringify({ master, extra });
}
/** Buka DB, checkpoint WAL + kembalikan ke journal DELETE, buang sidecar. */
function normalizeWal(dbPath: string) {
  const db = new Database(dbPath);
  try { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } catch {}
  try { db.exec("PRAGMA journal_mode=DELETE"); } catch {}
  db.close();
  for (const suf of ["-wal", "-shm", "-journal"]) {
    const f = dbPath + suf;
    if (existsSync(f)) { try { unlinkSync(f); } catch {} }
  }
}

// ------------------------------------------------------------------
// Migrator CLI NYATA (migrate.js) atas COPY drizzle dir.
// space-dir = dir yang berisi subdir drizzle/ (meta/_journal.json + *.sql).
// ------------------------------------------------------------------
function copyDrizzleDir(destSpaceDir: string, maxIdx: number | null) {
  const drizzleDest = join(destSpaceDir, "drizzle");
  mkdirSync(join(drizzleDest, "meta"), { recursive: true });
  const srcDir = join(repoRoot, "site", "drizzle");
  const entries = JOURNAL_TAGS.map((tag, idx) => ({ idx, version: "6", when: JOURNAL_WHEN[idx], tag, breakpoints: true }))
    .filter((e) => maxIdx === null || e.idx <= maxIdx);
  for (const e of entries) copyFileSync(join(srcDir, `${e.tag}.sql`), join(drizzleDest, `${e.tag}.sql`));
  writeFileSync(join(drizzleDest, "meta", "_journal.json"), JSON.stringify({ version: "7", dialect: "sqlite", entries }, null, 2));
  return destSpaceDir;
}
function runMigrator(spaceDir: string, dbPath: string): { exit: number | null; out: string; err: string; json: any } {
  const r = Bun.spawnSync(["bun", MIGRATOR, `--space-dir=${spaceDir}`, `--db-path=${dbPath}`], { stdout: "pipe", stderr: "pipe" });
  const out = r.stdout.toString();
  const err = r.stderr.toString();
  let json: any = null;
  try { json = JSON.parse(out.trim()); } catch { /* bukan JSON */ }
  return { exit: r.exitCode, out, err, json };
}
function ledgerRows(db: Database): any[] {
  try {
    return db.query("SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id").all();
  } catch { return []; }
}
function ledgerCreatedAts(db: Database): number[] {
  return ledgerRows(db).map((r: any) => Number(r.created_at)).sort((a, b) => a - b);
}

// ------------------------------------------------------------------
// sqlite3 CLI (3.45.1) — jalankan file/script SQL via stdin redirect.
// ------------------------------------------------------------------
function runSqliteCli(dbPath: string, scriptPath: string): { exit: number | null; out: string; err: string } {
  const r = Bun.spawnSync(["sh", "-c", `sqlite3 -bail '${dbPath}' < '${scriptPath}'`], { stdout: "pipe", stderr: "pipe" });
  return { exit: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}
function runSqliteCliText(dbPath: string, scriptText: string): { exit: number | null; out: string; err: string } {
  const p = join(workDir, `cli-script-${Math.random().toString(36).slice(2, 9)}.sql`);
  writeFileSync(p, scriptText);
  return runSqliteCli(dbPath, p);
}

// ------------------------------------------------------------------
// Pre-check V1–V6 (teks v3, verbatim dari evidence/v2321/0006_..._v2321.sql Fase 1).
// ------------------------------------------------------------------
const CANON_EXPR = `CASE
    WHEN \`contract_address\` IS NULL THEN NULL
    WHEN \`chain\` = 'Solana' THEN trim(\`contract_address\`)
    WHEN \`chain\` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain') THEN
      CASE WHEN lower(substr(trim(\`contract_address\`),1,2)) = '0x'
           THEN '0x' || lower(substr(trim(\`contract_address\`),3))
           ELSE '0x' || lower(trim(\`contract_address\`)) END
    ELSE NULL
  END`;
const PRECHECKS: Record<string, string> = {
  V1: "SELECT lower(trim(`name`)) AS dup_name, count(*) AS n FROM `projects` GROUP BY 1 HAVING count(*) > 1",
  V2: `SELECT \`chain\`, ${CANON_EXPR} AS canon, count(*) AS n FROM \`projects\` WHERE \`contract_address\` IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1`,
  V3: "SELECT `id`, `name`, `chain` FROM `projects` WHERE `chain` NOT IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain','Solana')",
  V4: `SELECT \`id\`, \`name\`, \`chain\`, \`contract_address\` FROM \`projects\` WHERE \`contract_address\` IS NOT NULL AND NOT (
  (\`chain\` = 'Solana'
    AND length(trim(\`contract_address\`)) BETWEEN 32 AND 44
    AND trim(\`contract_address\`) NOT GLOB '*[0OlI]*'
    AND trim(\`contract_address\`) NOT GLOB '* *')
  OR
  (\`chain\` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain')
    AND (
      (length(trim(\`contract_address\`)) = 42
       AND lower(substr(trim(\`contract_address\`),1,2)) = '0x'
       AND substr(trim(\`contract_address\`),3) NOT GLOB '*[^0-9a-fA-F]*')
      OR
      (length(trim(\`contract_address\`)) = 40
       AND trim(\`contract_address\`) NOT GLOB '*[^0-9a-fA-F]*')
    ))
)`,
  V5: "SELECT `type`, `name` FROM `sqlite_master` WHERE (`type` = 'trigger' OR `type` = 'view') AND `sql` LIKE '%projects%'",
};
/** Jalankan V1–V5 + V6 pada DB READ-ONLY; kembalikan jumlah baris per check. */
function runPrechecks(dbPath: string): Record<string, number> {
  const db = new Database(dbPath, { readonly: true });
  const out: Record<string, number> = {};
  for (const [k, sql] of Object.entries(PRECHECKS)) {
    out[k] = (db.query(sql).all() as any[]).length;
  }
  const info: any[] = db.query("PRAGMA table_info(checks)").all();
  out.V6 = info.some((r) => r.name === "owner_user_id") ? 1 : 0; // 1 = kolom SUDAH ada (pelanggaran pre-check)
  db.close();
  return out;
}

// ------------------------------------------------------------------
// Bangun DB dasar + fixture.
// ------------------------------------------------------------------
const workDir = mkdtempSync(join(tmpdir(), "v2323-"));
console.log(`work dir (mkdtemp 0700): ${workDir}`);
const FIXTURE_NOW = 1780000000000;

function insertFixtures(dbPath: string) {
  const db = new Database(dbPath);
  db.exec(
    `INSERT INTO checks (url, domain, verdict, score, signals, contracts, created_at) VALUES
     ('https://example-legacy-1.test/claim','example-legacy-1.test','waspada',55,'[]','[]',${FIXTURE_NOW}),
     ('https://example-legacy-2.test/airdrop','example-legacy-2.test','lebih_aman',10,'[]','[]',${FIXTURE_NOW})`,
  );
  db.exec(
    `INSERT INTO saved_projects (project_id, bookmarked, task_status, updated_at) VALUES
     (1, 1, 'not_started', ${FIXTURE_NOW}), (2, 1, 'in_progress', ${FIXTURE_NOW})`,
  );
  db.close();
}
/** Base DB: 0001–0005 via migrator NYATA (journal terpotong idx 0–4) + fixture. */
function buildBase(name: string): string {
  const spaceDir = join(workDir, `${name}-space`);
  copyDrizzleDir(spaceDir, 4);
  const dbPath = join(workDir, `${name}.db`);
  const res = runMigrator(spaceDir, dbPath);
  normalizeWal(dbPath);
  if (res.exit !== 0 || !res.json?.ok) {
    throw new Error(`buildBase ${name}: migrator 0001-0005 gagal exit=${res.exit} out=${res.out} err=${res.err}`);
  }
  if (JSON.stringify(res.json.normalized) !== "[]") {
    throw new Error(`buildBase ${name}: migrator menormalisasi file: ${JSON.stringify(res.json.normalized)}`);
  }
  insertFixtures(dbPath);
  return dbPath;
}
function freshCopy(src: string, name: string): string {
  const p = join(workDir, `${name}.db`);
  copyFileSync(src, p);
  return p;
}
/** Jalankan file drizzle (0006/0007) LANGSUNG statement-per-statement (tanpa migrator). */
function runDrizzleFileDirect(dbPath: string, filePath: string): { ok: boolean; failedAt?: number; error?: string } {
  const text = readFileSync(filePath, "utf8");
  const chunks = text.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
  const db = new Database(dbPath);
  for (let i = 0; i < chunks.length; i++) {
    try { db.exec(chunks[i]); } catch (e: any) {
      db.close();
      return { ok: false, failedAt: i, error: String(e?.message ?? e) };
    }
  }
  db.close();
  return { ok: true };
}

// ==================================================================
// H-MIG-00 — Reproduksi F-044: ALTER ADD STORED gagal; VIRTUAL ok.
// ==================================================================
console.log("--- H-MIG-00 (F-044 reproduksi) ---");
{
  const db = new Database(":memory:");
  db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, chain TEXT NOT NULL, addr TEXT)");
  db.exec("INSERT INTO t (chain, addr) VALUES ('BNB Chain','0xabc'), ('Solana','41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump')");
  const r1 = tryExec(db, "ALTER TABLE t ADD COLUMN canon TEXT GENERATED ALWAYS AS (lower(addr)) STORED");
  check("H-MIG-00a DDL v2.3.20 (ALTER ADD ... STORED) GAGAL pada tabel BERISI di SQLite 3.53.4 — F-044 ter-reproduksi", !r1.ok && /cannot add a STORED column/i.test(r1.error ?? ""), r1.error ?? "");
  const r2 = tryExec(db, "ALTER TABLE t ADD COLUMN canon2 TEXT GENERATED ALWAYS AS (lower(addr)) VIRTUAL");
  check("H-MIG-00b VIRTUAL ADD berhasil (alternatif yang didokumentasikan)", r2.ok, r2.error ?? "");
  db.close();
  const dbEmpty = new Database(":memory:");
  dbEmpty.exec("CREATE TABLE e (id INTEGER PRIMARY KEY, a TEXT)");
  const r5 = tryExec(dbEmpty, "ALTER TABLE e ADD COLUMN c TEXT GENERATED ALWAYS AS (lower(a)) STORED");
  check("H-MIG-00e tabel KOSONG + STORED ADD BERHASIL di 3.53.4 — kegagalan bergantung isi tabel (U-96)", r5.ok, r5.error ?? "");
  dbEmpty.close();
  // CLI 3.45.1: STORED ADD gagal pada tabel berisi; berhasil pada tabel kosong.
  const probeDb = join(workDir, "mig00-cli.db");
  const rCli1 = runSqliteCliText(probeDb, "CREATE TABLE t (id INTEGER PRIMARY KEY, a TEXT); INSERT INTO t (a) VALUES ('x'); ALTER TABLE t ADD COLUMN c TEXT GENERATED ALWAYS AS (lower(a)) STORED;");
  check("H-MIG-00-cli-a ALTER ADD STORED GAGAL di 3.45.1 pada tabel berisi", rCli1.exit !== 0 && /cannot add a STORED column/i.test(rCli1.err), rCli1.err.trim().split("\n")[0] ?? "");
  const probeDb2 = join(workDir, "mig00-cli-empty.db");
  const rCli2 = runSqliteCliText(probeDb2, "CREATE TABLE t (id INTEGER PRIMARY KEY, a TEXT); ALTER TABLE t ADD COLUMN c TEXT GENERATED ALWAYS AS (lower(a)) STORED; INSERT INTO t (a) VALUES ('AbC'); SELECT c FROM t;");
  check("H-MIG-00-cli-b tabel KOSONG + STORED ADD berhasil di 3.45.1, nilai 'abc'", rCli2.exit === 0 && rCli2.out.trim() === "abc", `exit=${rCli2.exit} out=${JSON.stringify(rCli2.out)} err=${rCli2.err.trim()}`);
}

// ==================================================================
// H-MIG-01a — DB kosong + migrator NYATA (full journal 0001–0007).
// ==================================================================
console.log("--- H-MIG-01a (DB kosong + migrator nyata) ---");
const mig01aSpace = copyDrizzleDir(join(workDir, "mig01a-space"), null);
const mig01aPath = join(workDir, "mig01a.db");
const mig01aRes = runMigrator(mig01aSpace, mig01aPath);
normalizeWal(mig01aPath);
check("H-MIG-01a-1 migrator CLI nyata exit 0 + ok:true", mig01aRes.exit === 0 && mig01aRes.json?.ok === true, `exit=${mig01aRes.exit} out=${mig01aRes.out.trim()} err=${mig01aRes.err.trim()}`);
check("H-MIG-01a-2 migrator TIDAK menormalisasi file (normalized [])", JSON.stringify(mig01aRes.json?.normalized ?? null) === "[]", JSON.stringify(mig01aRes.json?.normalized));
{
  const db = new Database(mig01aPath, { readonly: true });
  const led = ledgerRows(db);
  check("H-MIG-01a-3 ledger __drizzle_migrations = 8 baris", led.length === 8, `n=${led.length}`);
  check("H-MIG-01a-4 ledger created_at == journal when (8 nilai)", JSON.stringify(ledgerCreatedAts(db)) === JSON.stringify([...JOURNAL_WHEN].sort((a, b) => a - b)), JSON.stringify(ledgerCreatedAts(db)));
  const c = counts(db);
  check("H-MIG-01a-5 projects = 12 baris seed", c.projects === 12, `n=${c.projects}`);
  check("H-MIG-01a-6 checks = 0, saved_projects = 0 (DB kosong)", c.checks === 0 && c.saved_projects === 0, JSON.stringify(c));
  check("H-MIG-01a-7 scan_leases = 0, rate_limits = 0 (tabel 0007 ada, kosong)", c.scan_leases === 0 && c.rate_limits === 0, JSON.stringify(c));
  const seq: any = db.query("SELECT seq FROM sqlite_sequence WHERE name='projects'").get();
  check("H-MIG-01a-8 sqlite_sequence projects = 12", Number(seq?.seq) === 12, `seq=${seq?.seq}`);
  const fk: any[] = db.query("PRAGMA foreign_key_check").all();
  check("H-MIG-01a-9 PRAGMA foreign_key_check = 0 baris", fk.length === 0, JSON.stringify(fk));
  const ic: any[] = db.query("PRAGMA integrity_check").all();
  check("H-MIG-01a-10 PRAGMA integrity_check = 'ok'", ic.length === 1 && Object.values(ic[0])[0] === "ok");
  const names: any[] = db.query("SELECT name FROM projects ORDER BY id").all();
  check("H-MIG-01a-11 seed memuat BAOracle + Ptah (spot-check isi 0004)", names.some((r: any) => /BAOracle/.test(r.name)) && names.some((r: any) => /Ptah/.test(r.name)), names.map((r: any) => r.name).join(" | ").slice(0, 200));
  db.close();
}

// ==================================================================
// H-MIG-01b — Jalur populated-DB: 0001–0005 + fixture, lalu 0006+0007 pending.
// ==================================================================
console.log("--- H-MIG-01b (populated-DB: 0006+0007 sebagai pending) ---");
const basePath = buildBase("base");
const baseCounts = (() => {
  const db = new Database(basePath, { readonly: true });
  const c = counts(db);
  db.close();
  return c;
})();
console.log(`base DB (0001-0005 via migrator + fixture): projects=${baseCounts.projects}, checks=${baseCounts.checks}, saved_projects=${baseCounts.saved_projects}`);
check("H-MIG-01b-0 base katalog repo = 12 baris", baseCounts.projects === 12, `projects=${baseCounts.projects}`);
check("H-MIG-01b-0b base checks fixture = 2 baris legacy", baseCounts.checks === 2);
check("H-MIG-01b-0c base saved_projects fixture = 2 baris", baseCounts.saved_projects === 2);
{
  const pre = runPrechecks(basePath);
  check("H-MIG-01b-0d pre-check V1–V5 + V6 pada base BERSIH = 0 baris semua", Object.values(pre).every((n) => n === 0), JSON.stringify(pre));
}
const baseProjectsDump = (() => {
  const db = new Database(basePath, { readonly: true });
  const d = projectDump(db);
  db.close();
  return d;
})();
const baseChecksDump = (() => {
  const db = new Database(basePath, { readonly: true });
  const rows: any[] = db.query("SELECT * FROM checks ORDER BY id").all();
  db.close();
  return JSON.stringify(rows);
})();
const baseSavedDump = (() => {
  const db = new Database(basePath, { readonly: true });
  const rows: any[] = db.query("SELECT * FROM saved_projects ORDER BY project_id").all();
  db.close();
  return JSON.stringify(rows);
})();
const mig01bPath = freshCopy(basePath, "mig01b");
const mig01bSpace = copyDrizzleDir(join(workDir, "mig01b-space"), null);
const mig01bRes = runMigrator(mig01bSpace, mig01bPath);
normalizeWal(mig01bPath);
check("H-MIG-01b-1 migrator pending 0006+0007+0008 exit 0 + ok:true", mig01bRes.exit === 0 && mig01bRes.json?.ok === true, `exit=${mig01bRes.exit} out=${mig01bRes.out.trim()} err=${mig01bRes.err.trim()}`);
check("H-MIG-01b-2 migrator TIDAK menormalisasi file (normalized [])", JSON.stringify(mig01bRes.json?.normalized ?? null) === "[]", JSON.stringify(mig01bRes.json?.normalized));
{
  const db = new Database(mig01bPath);
  const c = counts(db);
  check("H-MIG-01b-3 projects tetap 12 baris", c.projects === 12, `n=${c.projects}`);
  check("H-MIG-01b-4 checks tetap 2 baris", c.checks === 2, `n=${c.checks}`);
  check("H-MIG-01b-5 saved_projects tetap 2 baris", c.saved_projects === 2, `n=${c.saved_projects}`);
  check("H-MIG-01b-6 SEMUA nilai kolom projects identik sebelum/sesudah (dump JSON sama)", projectDump(db) === baseProjectsDump);
  const checksAfter: any[] = db.query("SELECT * FROM checks ORDER BY id").all();
  check(
    "H-MIG-01b-7 baris checks utuh; owner_user_id legacy tetap NULL",
    JSON.stringify(checksAfter.map(({ owner_user_id, ...r }: any) => r)) === baseChecksDump &&
      checksAfter.every((r: any) => r.owner_user_id === null),
  );
  const savedAfter: any[] = db.query("SELECT * FROM saved_projects ORDER BY project_id").all();
  check(
    "H-MIG-01b-8 baris saved_projects utuh; principal_id = '<LEGACY>'",
    JSON.stringify(savedAfter.map(({ principal_id, ...r }: any) => r)) === baseSavedDump &&
      savedAfter.every((r: any) => r.principal_id === "<LEGACY>"),
  );
  const seq: any = db.query("SELECT seq FROM sqlite_sequence WHERE name='projects'").get();
  check("H-MIG-01b-9 sqlite_sequence projects tetap 12", Number(seq?.seq) === 12, `seq=${seq?.seq}`);
  const ins = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Uji Autoincrement','Ethereum','DeFi','live','uji','uji','Easy','2026-11-08','uji',99,'0x1111111111111111111111111111111111111111')`,
  );
  const newRow: any = db.query("SELECT id, contract_address_canonical AS c FROM projects WHERE name='Uji Autoincrement'").get();
  check("H-MIG-01b-10 insert pasca-migrasi dapat id 13 (AUTOINCREMENT lanjut)", ins.ok && newRow?.id === 13, `id=${newRow?.id}`);
  check(
    "H-MIG-01b-11 kolom kanonik baris baru terhitung DB (= fungsi JS)",
    newRow?.c === canonicalizeContractAddress("Ethereum", "0x1111111111111111111111111111111111111111"),
    `db=${newRow?.c}`,
  );
  db.exec("DELETE FROM projects WHERE name='Uji Autoincrement'");
  const led = ledgerRows(db);
  check("H-MIG-01b-12 ledger = 8 baris setelah pending 0006+0007+0008", led.length === 8, `n=${led.length}`);
  const fk: any[] = db.query("PRAGMA foreign_key_check").all();
  check("H-MIG-01b-13 PRAGMA foreign_key_check = 0 baris", fk.length === 0, JSON.stringify(fk));
  const ic: any[] = db.query("PRAGMA integrity_check").all();
  check("H-MIG-01b-14 PRAGMA integrity_check = 'ok'", ic.length === 1 && Object.values(ic[0])[0] === "ok");
  db.close();
}
// Sub-kasus negatif 01b: duplikat kanonik digagalkan pre-check, lalu
// setelah duplikat dibuang migrasi pending sukses pada DB yang sama.
{
  const p = freshCopy(basePath, "mig01b-neg");
  const db = new Database(p);
  db.exec(
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('BAOracle duplikat','BNB Chain','NFT','live','x','x','Easy','2026-11-02','x',50,'0xcbe2dbbff4264dc67bf557c64e29997b82439354')`,
  );
  db.close();
  const pre = runPrechecks(p);
  check("H-MIG-01b-neg-1 pre-check V2 MENDETEKSI duplikat kanonik (baris dikembalikan)", pre.V2 > 0, JSON.stringify(pre));
  check("H-MIG-01b-neg-2 pre-check V1 juga mendeteksi (nama 'BAOracle duplikat' beda — V1 harus 0)", pre.V1 === 0, JSON.stringify(pre));
  // Migrator TIDAK dijalankan saat pre-check gagal (abort operator) —
  // buktikan ledger masih 5 (0001–0005) dan skema masih base.
  const dbChk = new Database(p, { readonly: true });
  check("H-MIG-01b-neg-3 ledger tetap 5 (migrator tidak dijalankan)", ledgerRows(dbChk).length === 5);
  const info: any[] = dbChk.query("PRAGMA table_info(checks)").all();
  check("H-MIG-01b-neg-4 kolom owner_user_id BELUM ada (0006 belum jalan)", !info.some((r) => r.name === "owner_user_id"));
  dbChk.close();
  // Buang duplikat -> pre-check bersih -> migrasi pending sukses.
  const dbFix = new Database(p);
  dbFix.exec("DELETE FROM projects WHERE name='BAOracle duplikat'");
  dbFix.close();
  const pre2 = runPrechecks(p);
  check("H-MIG-01b-neg-5 setelah duplikat dibuang, semua pre-check 0 baris", Object.values(pre2).every((n) => n === 0), JSON.stringify(pre2));
  const spaceDir = copyDrizzleDir(join(workDir, "mig01b-neg-space"), null);
  const res = runMigrator(spaceDir, p);
  normalizeWal(p);
  check("H-MIG-01b-neg-6 migrasi pending sukses setelah perbaikan", res.exit === 0 && res.json?.ok === true, `exit=${res.exit} err=${res.err.trim()}`);
  const dbAfter = new Database(p, { readonly: true });
  check("H-MIG-01b-neg-7 projects kembali 12 baris", counts(dbAfter).projects === 12);
  dbAfter.close();
}

// ==================================================================
// H-MIG-02 — Inspeksi schema hasil migrasi (DB 01a).
// ==================================================================
console.log("--- H-MIG-02 (inspeksi schema) ---");
{
  const db = new Database(mig01aPath, { readonly: true });
  const projectsSql: any = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  const sql: string = projectsSql?.sql ?? "";
  check("H-MIG-02a sql projects memuat 'GENERATED ALWAYS AS' + 'STORED'", /GENERATED ALWAYS AS/i.test(sql) && /STORED/i.test(sql));
  check("H-MIG-02b sql projects memuat CHECK chain bernama", sql.includes("projects_chain_allowlist_ck"));
  check("H-MIG-02c sql projects memuat CHECK format bernama", sql.includes("projects_contract_format_ck"));
  check("H-MIG-02d sql projects memuat kolom provenance", sql.includes("provenance_source_url") && sql.includes("provenance_verified_by"));
  const idx: any[] = db.query("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='projects'").all();
  const idxNames = idx.map((r) => r.name);
  check("H-MIG-02e unique index nama ada", idxNames.includes("projects_name_normalized_unique"));
  check("H-MIG-02f unique index alamat per chain ada (partial)", idxNames.includes("projects_contract_normalized_unique"));
  const idxSql: any = db.query("SELECT sql FROM sqlite_master WHERE name='projects_contract_normalized_unique'").get();
  check("H-MIG-02g unique index alamat bersifat partial (WHERE contract_address IS NOT NULL)", /WHERE `contract_address` IS NOT NULL/i.test(idxSql?.sql ?? "") || /WHERE contract_address IS NOT NULL/i.test(idxSql?.sql ?? ""));
  const checksInfo: any[] = db.query("PRAGMA table_info(checks)").all();
  check("H-MIG-02h checks punya kolom owner_user_id", checksInfo.some((r) => r.name === "owner_user_id"));
  const checksIdx: any[] = db.query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='checks'").all();
  check("H-MIG-02i index checks_owner_idx ada", checksIdx.some((r) => r.name === "checks_owner_idx"));
  const savedInfo: any[] = db.query("PRAGMA table_info(saved_projects)").all();
  const pkCols = savedInfo.filter((r) => r.pk > 0).sort((a, b) => a.pk - b.pk).map((r) => r.name);
  check("H-MIG-02j saved_projects composite PK (principal_id, project_id)", JSON.stringify(pkCols) === JSON.stringify(["principal_id", "project_id"]), `pk=${JSON.stringify(pkCols)}`);
  const fkList: any[] = db.query("PRAGMA foreign_key_list(saved_projects)").all();
  check("H-MIG-02k saved_projects FK tetap ke projects(id)", fkList.some((r) => r.table === "projects" && r.from === "project_id" && r.to === "id"), JSON.stringify(fkList));
  const trig: any[] = db.query("SELECT count(*) AS n FROM sqlite_master WHERE type IN ('trigger','view')").all();
  check("H-MIG-02l tidak ada trigger/view", Number((trig[0] as any).n) === 0);
  // Artefak 0007.
  const leases: any = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='scan_leases'").get();
  const rates: any = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='rate_limits'").get();
  check("H-MIG-02m tabel scan_leases ada (0007)", !!leases?.sql && /principal_id/.test(leases.sql) && /expires_at/.test(leases.sql));
  check("H-MIG-02n tabel rate_limits ada (0007) + composite PK", !!rates?.sql && /PRIMARY KEY/.test(rates.sql) && /principal_id/.test(rates.sql));
  const leasesIdx: any[] = db.query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='scan_leases'").all();
  check("H-MIG-02o index scan_leases_expires_idx ada", leasesIdx.some((r) => r.name === "scan_leases_expires_idx"));
  const ratesInfo: any[] = db.query("PRAGMA table_info(rate_limits)").all();
  const ratesPk = ratesInfo.filter((r) => r.pk > 0).sort((a, b) => a.pk - b.pk).map((r) => r.name);
  check("H-MIG-02p rate_limits composite PK (principal_id, window, window_start)", JSON.stringify(ratesPk) === JSON.stringify(["principal_id", "window", "window_start"]), `pk=${JSON.stringify(ratesPk)}`);
  const leasesInfo: any[] = db.query("PRAGMA table_info(scan_leases)").all();
  check("H-MIG-02q scan_leases id AUTOINCREMENT PK", leasesInfo.some((r) => r.name === "id" && r.pk === 1));
  // Bandingkan dengan base: base TIDAK punya artefak-artefak itu.
  const bdb = new Database(basePath, { readonly: true });
  const bSql: any = bdb.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  check("H-MIG-02r base (pre-migrasi) TIDAK punya kolom kanonik/CHECK bernama — artefak di atas benar-benar dari migrasi", !/contract_address_canonical/.test(bSql?.sql ?? "") && !/projects_chain_allowlist_ck/.test(bSql?.sql ?? ""));
  const bLeases: any = bdb.query("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('scan_leases','rate_limits')").get();
  check("H-MIG-02s base TIDAK punya tabel 0007", Number(bLeases?.n) === 0);
  bdb.close();
  db.close();
}

// ==================================================================
// H-MIG-03 / H-MIG-04 / PRE-V4 / PRE-V5 — Pre-check operator V1–V5:
// pelanggaran terdeteksi, migrator TIDAK dijalankan, DB byte-identik.
// (Berbeda dari harness v2321: file drizzle AKTIF 0006 tidak memuat
// VALIDATION — SELECT di file migrasi diabaikan migrator — jadi
// pre-check adalah langkah OPERATOR sebelum migrate; yang diuji di
// sini adalah deteksi + abort-before-BEGIN itu.)
// ==================================================================
console.log("--- H-MIG-03/04 + PRE-V4/V5 (pre-check operator V1–V5) ---");
function precheckCase(label: string, injectSql: string | null, expectRows: Record<string, number>): string {
  const p = freshCopy(basePath, `pre-${label}`);
  if (injectSql) {
    const db = new Database(p);
    db.exec(injectSql);
    db.close();
  }
  const before = shaFile(p);
  const pre = runPrechecks(p);
  for (const [k, n] of Object.entries(expectRows)) {
    check(`H-MIG-${label} pre-check ${k} mengembalikan baris (deteksi benar)`, pre[k] === n, `V=${k} rows=${pre[k]} expected=${n} full=${JSON.stringify(pre)}`);
  }
  check(`H-MIG-${label} DB byte-identik sebelum/sesudah pre-check (tidak ada migrasi jalan)`, shaFile(p) === before, `sha ${before.slice(0, 12)} vs ${shaFile(p).slice(0, 12)}`);
  const dbChk = new Database(p, { readonly: true });
  check(`H-MIG-${label} ledger tetap 5 (migrator tidak dijalankan)`, ledgerRows(dbChk).length === 5);
  const info: any[] = dbChk.query("PRAGMA table_info(checks)").all();
  check(`H-MIG-${label} kolom owner_user_id TIDAK ditambahkan`, !info.some((r) => r.name === "owner_user_id"));
  dbChk.close();
  return p;
}
// H-MIG-03: V1 duplikat nama ternormalisasi + V2 duplikat alamat kanonik.
precheckCase(
  "03",
  `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
   VALUES ('  baoracle — binance agent oracle  ','BNB Chain','NFT','live','x','x','Easy','2026-11-02','x',50,'0xcbe2dbbff4264dc67bf557c64e29997b82439354')`,
  { V1: 1, V2: 1, V3: 0, V4: 0, V5: 0, V6: 0 },
);
// H-MIG-04: V3 chain tak dikenal.
precheckCase(
  "04",
  `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
   VALUES ('Proyek Chain Asing','Fake Chain','DeFi','live','x','x','Easy','2026-11-08','x',51,'0x2222222222222222222222222222222222222222')`,
  { V1: 0, V2: 0, V3: 1, V4: 1, V5: 0, V6: 0 },
);
// (V4 juga 1 baris: chain 'Fake Chain' tidak masuk cabang Solana maupun
// EVM pada ekspresi V4 — defense in depth, bukan kesalahan ekspektasi.)
// PRE-V4: V4 format alamat invalid (EVM pendek + Solana mengandung 'l').
precheckCase(
  "PRE-V4",
  `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
   VALUES ('Alamat Pendek','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',52,'0x1234'),
          ('Solana Huruf Ilegal','Solana','DeFi','live','x','x','Easy','2026-11-08','x',53,'41WlXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump')`,
  { V1: 0, V2: 0, V3: 0, V4: 2, V5: 0, V6: 0 },
);
// PRE-V5: V5 trigger/view merujuk projects.
precheckCase(
  "PRE-V5",
  `CREATE VIEW v_projects AS SELECT id, name FROM projects`,
  { V1: 0, V2: 0, V3: 0, V4: 0, V5: 1, V6: 0 },
);
// Kontrol bersih: semua pre-check 0 baris pada base tanpa injeksi.
{
  const p = freshCopy(basePath, "pre-clean");
  const before = shaFile(p);
  const pre = runPrechecks(p);
  check("PRE-V0 kontrol bersih: semua pre-check V1–V6 = 0 baris", Object.values(pre).every((n) => n === 0), JSON.stringify(pre));
  check("PRE-V0 DB byte-identik setelah pre-check bersih", shaFile(p) === before);
}

// ==================================================================
// H-MIG-05 — Failure injection + rollback (migrator nyata).
// Mode A: copy 0006 disabotase (index -> tabel tak ada).
// Mode B: checks SUDAH punya kolom owner_user_id sebelum migrate.
// Kriteria: migrator exit != 0; ledger tetap 5; row count + skema
// (schemaDump) TIDAK berubah; tidak ada tabel 0007 / sisa rebuild.
// CATATAN: perbandingan di sini STATE (bukan byte) — migrator menyetel
// PRAGMA journal_mode=WAL pada header DB saat dibuka, jadi byte file
// berubah secara sah walau isi logisnya identik.
// ==================================================================
console.log("--- H-MIG-05 (failure injection + rollback) ---");
{
  // Mode A.
  const p = freshCopy(basePath, "mig05a");
  const dbBefore = new Database(p, { readonly: true });
  const dumpBefore = schemaDump(dbBefore);
  const countsBefore = counts(dbBefore);
  const ledgerBefore = ledgerRows(dbBefore).length;
  dbBefore.close();
  const spaceDir = join(workDir, "mig05a-space");
  copyDrizzleDir(spaceDir, null);
  const sabPath = join(spaceDir, "drizzle", "0006_unified_ownership_and_uniqueness.sql");
  const sabotaged = readFileSync(sabPath, "utf8").replace(
    "ON `projects` (`chain`, `contract_address_canonical`)",
    "ON `projects_typo` (`chain`, `contract_address_canonical`)",
  );
  if (sabotaged === readFileSync(sabPath, "utf8")) throw new Error("H-MIG-05a: sabotase tidak mengenai target — pola tidak ditemukan");
  writeFileSync(sabPath, sabotaged);
  const res = runMigrator(spaceDir, p);
  normalizeWal(p);
  check("H-MIG-05a-1 migrator GAGAL pada 0006 tersabotase (exit != 0)", res.exit !== 0, `exit=${res.exit} out=${res.out.trim()} err=${res.err.trim().slice(0, 300)}`);
  const dbAfter = new Database(p, { readonly: true });
  check("H-MIG-05a-2 ledger tetap 5 setelah kegagalan (rollback batch)", ledgerRows(dbAfter).length === ledgerBefore, `n=${ledgerRows(dbAfter).length}`);
  check("H-MIG-05a-3 row counts tidak berubah", JSON.stringify(counts(dbAfter)) === JSON.stringify(countsBefore), `${JSON.stringify(counts(dbAfter))} vs ${JSON.stringify(countsBefore)}`);
  check("H-MIG-05a-4 schemaDump tidak berubah (tidak ada projects_new / index setengah jalan)", schemaDump(dbAfter) === dumpBefore);
  check("H-MIG-05a-5 tabel 0007 TIDAK terbentuk (batch rollback menyeluruh)", counts(dbAfter).scan_leases === -1 && counts(dbAfter).rate_limits === -1);
  const projSql: any = dbAfter.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  check("H-MIG-05a-6 sql projects tetap definisi lama (tanpa kolom kanonik)", !/contract_address_canonical/.test(projSql?.sql ?? ""));
  dbAfter.close();

  // Mode B.
  const p2 = freshCopy(basePath, "mig05b");
  const dbB = new Database(p2);
  dbB.exec("ALTER TABLE checks ADD COLUMN owner_user_id text");
  dbB.close();
  const dbBBefore = new Database(p2, { readonly: true });
  const dumpBBefore = schemaDump(dbBBefore);
  const countsBBefore = counts(dbBBefore);
  dbBBefore.close();
  const spaceDirB = copyDrizzleDir(join(workDir, "mig05b-space"), null);
  const resB = runMigrator(spaceDirB, p2);
  normalizeWal(p2);
  check("H-MIG-05b-1 migrator GAGAL saat checks sudah punya owner_user_id (exit != 0)", resB.exit !== 0, `exit=${resB.exit} err=${resB.err.trim().slice(0, 300)}`);
  const dbBAfter = new Database(p2, { readonly: true });
  check("H-MIG-05b-2 ledger tetap 5 setelah kegagalan", ledgerRows(dbBAfter).length === 5);
  check("H-MIG-05b-3 row counts tidak berubah", JSON.stringify(counts(dbBAfter)) === JSON.stringify(countsBBefore));
  check("H-MIG-05b-4 schemaDump tidak berubah", schemaDump(dbBAfter) === dumpBBefore);
  const ownerCols: any[] = dbBAfter.query("PRAGMA table_info(checks)").all();
  check("H-MIG-05b-5 checks tetap punya TEPAT SATU kolom owner_user_id (yang manual, bukan dari migrasi)", ownerCols.filter((r) => r.name === "owner_user_id").length === 1);
  check("H-MIG-05b-6 tabel 0007 TIDAK terbentuk", counts(dbBAfter).scan_leases === -1 && counts(dbBAfter).rate_limits === -1);
  dbBAfter.close();
}

// ==================================================================
// H-MIG-06 — Backup/restore.
// ==================================================================
console.log("--- H-MIG-06 (backup/restore) ---");
{
  const backup = join(workDir, "backup-pre-migration.db");
  copyFileSync(basePath, backup);
  const backupHash = shaFile(backup);
  const working = freshCopy(basePath, "mig06work");
  const spaceDir = copyDrizzleDir(join(workDir, "mig06-space"), null);
  const res = runMigrator(spaceDir, working);
  normalizeWal(working);
  check("H-MIG-06a migrasi pada salinan kerja sukses (prasyarat restore)", res.exit === 0 && res.json?.ok === true, `exit=${res.exit} err=${res.err.trim()}`);
  const restored = join(workDir, "restored.db");
  copyFileSync(backup, restored);
  check("H-MIG-06b restore dari backup = byte-identik dengan backup", shaFile(restored) === backupHash);
  const dbr = new Database(restored, { readonly: true });
  const sql: any = dbr.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  check("H-MIG-06c DB hasil restore berschema lama (tanpa kolom kanonik)", !/contract_address_canonical/.test(sql?.sql ?? ""));
  check("H-MIG-06d DB hasil restore: projects = 12 baris", counts(dbr).projects === 12);
  dbr.close();
}

// ==================================================================
// H-MIG-07 — Re-run.
// (a) Migrator re-run: ledger-gated -> no-op bersih.
// (b) File 0006 di-re-run LANGSUNG (tanpa migrator): GAGAL di tengah
//     dan mengaplikasi SEBAGIAN — didokumentasikan sebagai bahaya.
// ==================================================================
console.log("--- H-MIG-07 (re-run) ---");
{
  const p = freshCopy(mig01aPath, "mig07a");
  const dumpBefore = (() => {
    const db = new Database(p, { readonly: true });
    const d = schemaDump(db);
    const c = counts(db);
    db.close();
    return { d, c };
  })();
  const spaceDir = copyDrizzleDir(join(workDir, "mig07a-space"), null);
  const res = runMigrator(spaceDir, p);
  normalizeWal(p);
  check("H-MIG-07a-1 migrator re-run pada DB termigrasi exit 0 (no-op, bukan error)", res.exit === 0 && res.json?.ok === true, `exit=${res.exit} out=${res.out.trim()} err=${res.err.trim()}`);
  check("H-MIG-07a-2 normalized [] pada re-run", JSON.stringify(res.json?.normalized ?? null) === "[]");
  const dbAfter = new Database(p, { readonly: true });
  check("H-MIG-07a-3 ledger tetap 8 baris (tidak ada migrasi ganda)", ledgerRows(dbAfter).length === 8);
  check("H-MIG-07a-4 row counts tidak berubah", JSON.stringify(counts(dbAfter)) === JSON.stringify(dumpBefore.c));
  check("H-MIG-07a-5 schemaDump tidak berubah", schemaDump(dbAfter) === dumpBefore.d);
  dbAfter.close();

  // (b) Direct re-run file 0006 pada DB termigrasi.
  const p2 = freshCopy(mig01aPath, "mig07b");
  const dbB0 = new Database(p2, { readonly: true });
  const dumpB0 = projectDump(dbB0);
  const countsB0 = counts(dbB0);
  const schemaB0 = schemaDump(dbB0);
  dbB0.close();
  const resB = runDrizzleFileDirect(p2, MIG06);
  check("H-MIG-07b-1 re-run LANGSUNG file 0006 pada DB termigrasi GAGAL (bukan idempotent)", !resB.ok, resB.error ?? "");
  console.log(`  H-MIG-07b-1 detail: gagal pada chunk #${resB.failedAt}: ${(resB.error ?? "").slice(0, 200)}`);
  check("H-MIG-07b-2 kegagalan terjadi pada chunk #10 (ALTER checks ADD COLUMN owner_user_id — kolom sudah ada)", resB.failedAt === 10, `failedAt=${resB.failedAt}`);
  const dbB = new Database(p2, { readonly: true });
  check("H-MIG-07b-3 DATA utuh: row counts tidak berubah", JSON.stringify(counts(dbB)) === JSON.stringify(countsB0), JSON.stringify(counts(dbB)));
  check("H-MIG-07b-4 DATA utuh: dump projects identik", projectDump(dbB) === dumpB0);
  const idxAfter: any[] = dbB.query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='projects'").all();
  check(
    "H-MIG-07b-5 kedua unique index MASIH ADA (DROP TABLE projects ikut menjatuhkan index lama, lalu chunk 8/9 menciptakannya ulang sebelum gagal di chunk 10)",
    idxAfter.some((r) => r.name === "projects_name_normalized_unique") && idxAfter.some((r) => r.name === "projects_contract_normalized_unique"),
    `indexes=${JSON.stringify(idxAfter.map((r: any) => r.name))}`,
  );
  check(
    "H-MIG-07b-6 HASIL AKTUAL (koreksi atas prediksi awal): re-run langsung gagal di ADD COLUMN TETAPI schemaDump TIDAK berubah — rebuild projects bersifat idempotent pada data/skema ini; yang TIDAK aman tetaplah asumsi idempotency (kegagalan di chunk lain bisa mengaplikasi sebagian — lihat 07b-2), jadi file JANGAN pernah di-re-run langsung; keamanan re-run hanya dari ledger migrator (07a)",
    schemaDump(dbB) === schemaB0,
  );
  dbB.close();
}

// ==================================================================
// H-MIG-08 — Down migration via sqlite3 CLI.
// 08a: 0006_down pada salinan termigrasi -> schema base (0007 utuh).
// 08b: 0007_down (BARU) pada salinan termigrasi -> 0007 hilang, 0006 utuh.
// 08c: 0007_down lalu 0006_down -> base penuh.
// 08d: guard V-D1/V-D2 (down ditolak bila ada state per-principal baru).
// ==================================================================
console.log("--- H-MIG-08 (down migration via sqlite3 CLI) ---");
function tableInfoMap(db: Database): Record<string, any[]> {
  const out: Record<string, any[]> = {};
  for (const t of ["projects", "checks", "saved_projects"]) {
    out[t] = db.query(`PRAGMA table_info(${t})`).all();
  }
  return out;
}
const baseTableInfo = (() => {
  const db = new Database(basePath, { readonly: true });
  const m = tableInfoMap(db);
  db.close();
  return m;
})();
{
  // 08a: 0006_down.
  const p = freshCopy(mig01aPath, "mig08a");
  const res = runSqliteCli(p, DOWN06);
  check("H-MIG-08a-1 down 0006 via sqlite3 CLI exit 0", res.exit === 0, `exit=${res.exit} err=${res.err.trim().slice(0, 300)}`);
  check("H-MIG-08a-2 output CLI hanya 'ok' (semua VALIDATION 0 baris)", res.out.trim() === "ok", `out=${JSON.stringify(res.out)}`);
  const db = new Database(p);
  const c = counts(db);
  check("H-MIG-08a-3 projects tetap 12 baris setelah down 0006", c.projects === 12, `n=${c.projects}`);
  check("H-MIG-08a-4 checks tetap 0 baris setelah down 0006", c.checks === 0);
  check("H-MIG-08a-5 saved_projects tetap 0 baris setelah down 0006", c.saved_projects === 0);
  check("H-MIG-08a-6 dump projects setelah down == dump sebelum migrasi naik", projectDump(db) === (() => {
    const b = new Database(mig01aPath, { readonly: true });
    const d = projectDump(b);
    b.close();
    return d;
  })());
  const sql: any = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  check("H-MIG-08a-7 sql projects tanpa kolom kanonik/CHECK bernama", !/contract_address_canonical/.test(sql?.sql ?? "") && !/projects_chain_allowlist_ck/.test(sql?.sql ?? ""));
  const idx: any[] = db.query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='projects'").all();
  check("H-MIG-08a-8 kedua unique index hilang setelah down", !idx.some((r) => r.name === "projects_name_normalized_unique") && !idx.some((r) => r.name === "projects_contract_normalized_unique"));
  const checksInfo: any[] = db.query("PRAGMA table_info(checks)").all();
  check("H-MIG-08a-9 checks tanpa kolom owner_user_id setelah down", !checksInfo.some((r) => r.name === "owner_user_id"));
  const savedInfo: any[] = db.query("PRAGMA table_info(saved_projects)").all();
  const pkCols = savedInfo.filter((r) => r.pk > 0).map((r) => r.name);
  check("H-MIG-08a-10 saved_projects kembali PK project_id saja", JSON.stringify(pkCols) === JSON.stringify(["project_id"]), `pk=${JSON.stringify(pkCols)}`);
  check("H-MIG-08a-11 saved_projects tanpa kolom principal_id", !savedInfo.some((r) => r.name === "principal_id"));
  const fk: any[] = db.query("PRAGMA foreign_key_check").all();
  check("H-MIG-08a-12 foreign_key_check = 0 baris setelah down", fk.length === 0);
  check("H-MIG-08a-13 PRAGMA table_info ketiga tabel == base (struktur kembali persis)", JSON.stringify(tableInfoMap(db)) === JSON.stringify(baseTableInfo));
  check("H-MIG-08a-14 down 0006 TIDAK menyentuh tabel 0007 (scan_leases/rate_limits tetap ada)", counts(db).scan_leases === 0 && counts(db).rate_limits === 0);
  db.close();
}
{
  // 08b: 0007_down.
  const p = freshCopy(mig01aPath, "mig08b");
  const res = runSqliteCli(p, DOWN07);
  check("H-MIG-08b-1 down 0007 via sqlite3 CLI exit 0", res.exit === 0, `exit=${res.exit} err=${res.err.trim().slice(0, 300)}`);
  check("H-MIG-08b-2 output CLI hanya 'ok' (semua VALIDATION 0 baris)", res.out.trim() === "ok", `out=${JSON.stringify(res.out)}`);
  const db = new Database(p);
  const c = counts(db);
  check("H-MIG-08b-3 projects tetap 12 baris setelah down 0007", c.projects === 12, `n=${c.projects}`);
  check("H-MIG-08b-4 tabel scan_leases HILANG", c.scan_leases === -1);
  check("H-MIG-08b-5 tabel rate_limits HILANG", c.rate_limits === -1);
  const idx: any[] = db.query("SELECT name FROM sqlite_master WHERE type='index' AND name='scan_leases_expires_idx'").all();
  check("H-MIG-08b-6 index scan_leases_expires_idx hilang", idx.length === 0);
  const sqlRow: any = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  const sqlText: string = sqlRow?.sql ?? "";
  check("H-MIG-08b-7 skema 0006 TETAP UTUH: kolom kanonik + CHECK bernama masih ada", /contract_address_canonical/.test(sqlText) && sqlText.includes("projects_chain_allowlist_ck") && sqlText.includes("projects_contract_format_ck"));
  const checksInfo: any[] = db.query("PRAGMA table_info(checks)").all();
  check("H-MIG-08b-8 checks.owner_user_id tetap ada (0006 utuh)", checksInfo.some((r) => r.name === "owner_user_id"));
  const savedInfo: any[] = db.query("PRAGMA table_info(saved_projects)").all();
  const pkCols = savedInfo.filter((r) => r.pk > 0).sort((a, b) => a.pk - b.pk).map((r) => r.name);
  check("H-MIG-08b-9 saved_projects composite PK tetap utuh", JSON.stringify(pkCols) === JSON.stringify(["principal_id", "project_id"]));
  const fk: any[] = db.query("PRAGMA foreign_key_check").all();
  check("H-MIG-08b-10 foreign_key_check = 0 baris setelah down 0007", fk.length === 0);
  db.close();
}
{
  // 08c: 0007_down lalu 0006_down -> base penuh.
  const p = freshCopy(mig01aPath, "mig08c");
  const r1 = runSqliteCli(p, DOWN07);
  const r2 = runSqliteCli(p, DOWN06);
  check("H-MIG-08c-1 kedua down berurutan exit 0", r1.exit === 0 && r2.exit === 0, `exit1=${r1.exit} exit2=${r2.exit} err2=${r2.err.trim().slice(0, 200)}`);
  check("H-MIG-08c-2 output kedua down hanya 'ok'", r1.out.trim() === "ok" && r2.out.trim() === "ok", `out1=${JSON.stringify(r1.out)} out2=${JSON.stringify(r2.out)}`);
  const db = new Database(p);
  check("H-MIG-08c-3 projects tetap 12 baris", counts(db).projects === 12);
  check("H-MIG-08c-4 tabel 0007 hilang", counts(db).scan_leases === -1 && counts(db).rate_limits === -1);
  check("H-MIG-08c-5 PRAGMA table_info ketiga tabel == base", JSON.stringify(tableInfoMap(db)) === JSON.stringify(baseTableInfo));
  const fk: any[] = db.query("PRAGMA foreign_key_check").all();
  check("H-MIG-08c-6 foreign_key_check = 0 baris", fk.length === 0);
  db.close();
}
{
  // 08d: guard V-D1 (saved per-principal baru) + V-D2 (checks ber-owner).
  const p = freshCopy(mig01bPath, "mig08d"); // mig01b: termigrasi + fixture legacy
  const db = new Database(p);
  const nowMs = Date.now();
  db.exec(`INSERT INTO saved_projects (principal_id, project_id, bookmarked, task_status, updated_at) VALUES ('local:principal-A', 1, 1, 'completed', ${nowMs})`);
  db.exec(`INSERT INTO checks (url, domain, verdict, score, signals, contracts, created_at, owner_user_id) VALUES ('https://a.test/x','a.test','waspada',60,'[]','[]',${nowMs},'local:principal-A')`);
  db.close();
  const dbR = new Database(p, { readonly: true });
  const vd1: any[] = dbR.query("SELECT `principal_id`, `project_id` FROM `saved_projects` WHERE `principal_id` <> '<LEGACY>'").all();
  const vd2: any[] = dbR.query("SELECT `id`, `owner_user_id` FROM `checks` WHERE `owner_user_id` IS NOT NULL").all();
  check("H-MIG-08d-1 guard V-D1 MENDETEKSI state per-principal baru (down 0006 harus DITOLAK)", vd1.length === 1, JSON.stringify(vd1));
  check("H-MIG-08d-2 guard V-D2 MENDETEKSI checks ber-owner (down akan membuang pemetaan owner)", vd2.length === 1, JSON.stringify(vd2));
  dbR.close();
  // File down TIDAK dijalankan di sini — itu inti guard-nya. Buktikan DB tak berubah.
  const dbChk = new Database(p, { readonly: true });
  check("H-MIG-08d-3 DB tidak berubah (down tidak dijalankan saat guard gagal)", counts(dbChk).saved_projects === 3 && counts(dbChk).checks === 3);
  dbChk.close();
}

// ==================================================================
// H-MIG-09 — Cross-version SQLite 3.45.1 (CLI): file artefak SAMA.
// Base dibangun via CLI dari 0001–0005; 0006+0007 dibungkus satu
// transaksi eksplisit (BEGIN/COMMIT) agar atomicity tercermin —
// file drizzle sendiri tidak memuat kontrol transaksi (aturan migrator).
// ==================================================================
console.log("--- H-MIG-09 (cross-version SQLite 3.45.1 via CLI) ---");
{
  const cliBase = join(workDir, "mig09-base.db");
  let buildOk = true;
  for (const tag of JOURNAL_TAGS.slice(0, 5)) {
    const r = runSqliteCli(cliBase, join(repoRoot, "site", "drizzle", `${tag}.sql`));
    if (r.exit !== 0) { buildOk = false; console.log(`  build base gagal pada ${tag}: ${r.err.trim().slice(0, 300)}`); }
  }
  check("H-MIG-09a base 0001–0005 dibangun via sqlite3 CLI 3.45.1", buildOk);
  const dbFix = new Database(cliBase);
  dbFix.exec(
    `INSERT INTO checks (url, domain, verdict, score, signals, contracts, created_at) VALUES
     ('https://example-legacy-1.test/claim','example-legacy-1.test','waspada',55,'[]','[]',${FIXTURE_NOW}),
     ('https://example-legacy-2.test/airdrop','example-legacy-2.test','lebih_aman',10,'[]','[]',${FIXTURE_NOW})`,
  );
  dbFix.exec(
    `INSERT INTO saved_projects (project_id, bookmarked, task_status, updated_at) VALUES
     (1, 1, 'not_started', ${FIXTURE_NOW}), (2, 1, 'in_progress', ${FIXTURE_NOW})`,
  );
  dbFix.close();
  const cliMig = freshCopy(cliBase, "mig09");
  const wrapped = "BEGIN IMMEDIATE;\n" + readFileSync(MIG06, "utf8") + "\n" + readFileSync(MIG07, "utf8") + "\nCOMMIT;\n";
  const wrappedPath = join(workDir, "mig09-wrapped.sql");
  writeFileSync(wrappedPath, wrapped);
  const rMig = runSqliteCli(cliMig, wrappedPath);
  check("H-MIG-09b migrasi 0006+0007 (file SAMA) sukses di SQLite 3.45.1 (exit 0)", rMig.exit === 0, `exit=${rMig.exit} err=${rMig.err.trim().slice(0, 300)}`);
  const db = new Database(cliMig, { readonly: true });
  const c = counts(db);
  check("H-MIG-09c projects tetap 12 / checks 2 / saved 2 di 3.45.1", c.projects === 12 && c.checks === 2 && c.saved_projects === 2, JSON.stringify(c));
  const sqlRow9: any = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  const sqlText9: string = sqlRow9?.sql ?? "";
  check("H-MIG-09d STORED + CHECK bernama ada di 3.45.1", /STORED/i.test(sqlText9) && sqlText9.includes("projects_chain_allowlist_ck") && sqlText9.includes("projects_contract_format_ck"));
  const leases: any = db.query("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('scan_leases','rate_limits')").get();
  check("H-MIG-09e tabel 0007 ada di 3.45.1", Number(leases?.n) === 2);
  const fk: any[] = db.query("PRAGMA foreign_key_check").all();
  check("H-MIG-09f foreign_key_check = 0 baris di 3.45.1", fk.length === 0);
  const ic: any[] = db.query("PRAGMA integrity_check").all();
  check("H-MIG-09g integrity_check = 'ok' di 3.45.1", ic.length === 1 && Object.values(ic[0])[0] === "ok");
  db.close();
  // F-045 negatif di 3.45.1.
  const rNeg = runSqliteCliText(cliMig, `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address) VALUES ('X1','Fake Chain','DeFi','live','x','x','Easy','2026-11-08','x',60,'0x3333333333333333333333333333333333333333');`);
  check("H-MIG-09h INSERT Fake Chain DITOLAK CHECK di 3.45.1", rNeg.exit !== 0 && /CHECK constraint failed: projects_chain_allowlist_ck/i.test(rNeg.err), rNeg.err.trim().split("\n")[0] ?? "");
  const db2 = new Database(cliMig, { readonly: true });
  check("H-MIG-09i jumlah projects tetap 12 setelah penolakan di 3.45.1", counts(db2).projects === 12);
  db2.close();
  // Down via CLI 3.45.1.
  const cliDown = freshCopy(cliMig, "mig09-down");
  const rD7 = runSqliteCli(cliDown, DOWN07);
  const rD6 = runSqliteCli(cliDown, DOWN06);
  check("H-MIG-09j down 0007 + 0006 sukses di 3.45.1", rD7.exit === 0 && rD6.exit === 0, `exit7=${rD7.exit} exit6=${rD6.exit} err6=${rD6.err.trim().slice(0, 200)}`);
  const db3 = new Database(cliDown, { readonly: true });
  check("H-MIG-09k setelah down: tabel 0007 hilang, table_info == base", counts(db3).scan_leases === -1 && counts(db3).rate_limits === -1 && JSON.stringify(tableInfoMap(db3)) === JSON.stringify(baseTableInfo));
  check("H-MIG-09l setelah down: projects tetap 12 baris", counts(db3).projects === 12);
  db3.close();
}

// ==================================================================
// H-CAT-11 — F-045: direct SQL negatif (CHECK constraint nyata).
// ==================================================================
console.log("--- H-CAT-11 (F-045 direct SQL negatif) ---");
{
  const p = freshCopy(mig01aPath, "cat11");
  const db = new Database(p);
  const base = counts(db);
  const neg = (label: string, sql: string, mustMatch: RegExp) => {
    const r = tryRun(db, sql);
    check(`H-CAT-11 ${label} -> DITOLAK CHECK`, !r.ok && mustMatch.test(r.error ?? ""), r.error ?? "");
  };
  neg(
    "INSERT chain 'Fake Chain' + alamat EVM valid",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X1','Fake Chain','DeFi','live','x','x','Easy','2026-11-08','x',60,'0x3333333333333333333333333333333333333333')`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "INSERT chain 'Fake Chain' + contract NULL (tutup bypass canonical-NULL)",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X2','Fake Chain','DeFi','live','x','x','Easy','2026-11-08','x',61,NULL)`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "UPDATE chain baris ada -> 'Fake Chain'",
    `UPDATE projects SET chain='Fake Chain' WHERE id=1`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "INSERT chain 'bnb chain' (case salah)",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X3','bnb chain','DeFi','live','x','x','Easy','2026-11-08','x',62,'0x4444444444444444444444444444444444444444')`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "INSERT chain ' BNB Chain' (spasi)",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X4',' BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',63,'0x5555555555555555555555555555555555555555')`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "INSERT Solana + alamat mengandung 'l' (base58 ilegal)",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X5','Solana','DeFi','live','x','x','Easy','2026-11-08','x',64,'41WlXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump')`,
    /CHECK constraint failed: projects_contract_format_ck/i,
  );
  neg(
    "INSERT EVM + alamat pendek '0x1234'",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X6','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',65,'0x1234')`,
    /CHECK constraint failed: projects_contract_format_ck/i,
  );
  neg(
    "INSERT EVM + alamat non-hex '0xZZZ...'",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X7','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',66,'0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')`,
    /CHECK constraint failed: projects_contract_format_ck/i,
  );
  neg(
    "UPDATE contract_address baris ada -> format salah",
    `UPDATE projects SET contract_address='0x1234' WHERE id=2`,
    /CHECK constraint failed: projects_contract_format_ck/i,
  );
  const after = counts(db);
  check("H-CAT-11 jumlah projects TIDAK berubah setelah semua penolakan", after.projects === base.projects, `n=${after.projects}`);
  db.close();
}

// ==================================================================
// H-CAT-12 — F-045: positif allowlist + uniqueness.
// ==================================================================
console.log("--- H-CAT-12 (F-045 positif + uniqueness) ---");
{
  const p = freshCopy(mig01aPath, "cat12");
  const db = new Database(p);
  const chains: [string, string][] = [
    ["BNB Chain", "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["Ethereum", "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
    ["Base", "0xcccccccccccccccccccccccccccccccccccccccc"],
    ["Arbitrum", "0xdddddddddddddddddddddddddddddddddddddddd"],
    ["Polygon", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"],
    ["opBNB", "0xffffffffffffffffffffffffffffffffffffffff"],
    ["Robinhood Chain", "0x1111111111111111111111111111111111111112"],
    ["Solana", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
  ];
  let allOk = true;
  chains.forEach(([chain, addr], i) => {
    const r = tryRun(
      db,
      `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      `Allowlist ${chain}`, chain, "DeFi", "live", "x", "x", "Easy", "2026-11-08", "x", 70 + i, addr,
    );
    if (!r.ok) { allOk = false; console.log(`  allowlist FAIL ${chain}: ${r.error}`); }
  });
  check("H-CAT-12a SEMUA 8 chain allowlist lolos INSERT", allOk);
  const dup1 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Dup EVM case','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',80,'0xcbe2dbbff4264dc67bf557c64e29997b82439354')`,
  );
  check(
    "H-CAT-12b duplikat EVM beda case (alamat BAOracle) -> UNIQUE violation",
    !dup1.ok && /UNIQUE constraint failed: projects\.chain, projects\.contract_address_canonical/i.test(dup1.error ?? ""),
    dup1.error ?? "",
  );
  const dup2 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Dup EVM noprefix','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',81,'CBE2DBBFF4264DC67BF557C64E29997B82439354')`,
  );
  check("H-CAT-12c duplikat EVM tanpa prefix 0x uppercase -> UNIQUE violation", !dup2.ok && /UNIQUE/i.test(dup2.error ?? ""), dup2.error ?? "");
  const dup3 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Dup EVM ws','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',82,'  0xCBE2DBBFF4264DC67BF557C64E29997B82439354  ')`,
  );
  check("H-CAT-12d duplikat EVM whitespace -> UNIQUE violation", !dup3.ok && /UNIQUE/i.test(dup3.error ?? ""), dup3.error ?? "");
  const dup0x = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Dup EVM 0X','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',89,'0XCBE2DBBFF4264DC67BF557C64E29997B82439354')`,
  );
  check("H-CAT-12d2 duplikat EVM prefix '0X' uppercase -> UNIQUE violation (bukan '0x0x...' — U-95)", !dup0x.ok && /UNIQUE/i.test(dup0x.error ?? ""), dup0x.error ?? "");
  const sol2 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Solana varian','Solana','DeFi','live','x','x','Easy','2026-11-08','x',83,'41wpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump')`,
  );
  check("H-CAT-12e Solana satu huruf beda case -> DITERIMA (alamat BERBEDA)", sol2.ok, sol2.error ?? "");
  const sol3 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Solana sama persis','Solana','DeFi','live','x','x','Easy','2026-11-08','x',84,'41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump')`,
  );
  check("H-CAT-12f Solana sama persis -> UNIQUE violation", !sol3.ok && /UNIQUE/i.test(sol3.error ?? ""), sol3.error ?? "");
  const cross = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Cross chain','Ethereum','DeFi','live','x','x','Easy','2026-11-08','x',85,'0xcBe2DBBFF4264Dc67Bf557c64e29997B82439354')`,
  );
  check("H-CAT-12g alamat EVM sama di chain BERBEDA -> DITERIMA", cross.ok, cross.error ?? "");
  const n1 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Null 1','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',86,NULL)`,
  );
  const n2 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Null 2','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',87,NULL)`,
  );
  check("H-CAT-12h dua baris NULL contract_address -> DITERIMA", n1.ok && n2.ok);
  const dupName = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('  pTaH — Proof of Agent  ','Ethereum','DeFi','live','x','x','Easy','2026-11-08','x',88,'0x9999999999999999999999999999999999999999')`,
  );
  check(
    "H-CAT-12i duplikat nama ternormalisasi (case+spasi) -> UNIQUE violation",
    !dupName.ok && /UNIQUE constraint failed: index 'projects_name_normalized_unique'/i.test(dupName.error ?? ""),
    dupName.error ?? "",
  );
  db.close();
}

// ==================================================================
// H-CAT-13 — canonicalizeContractAddress ASLI (catalog.ts) == kolom
// generated DB (semua baris seed + korpus edge + NULL).
// ==================================================================
console.log("--- H-CAT-13 (JS ASLI == DB canonical) ---");
{
  const p = freshCopy(mig01aPath, "cat13");
  const db = new Database(p);
  const rows: any[] = db.query("SELECT id, name, chain, contract_address, contract_address_canonical AS c FROM projects ORDER BY id").all();
  let agree = true;
  for (const row of rows) {
    const js = canonicalizeContractAddress(row.chain, row.contract_address);
    if (js !== row.c) {
      agree = false;
      console.log(`  MISMATCH id=${row.id} js=${js} db=${row.c}`);
    }
  }
  check(`H-CAT-13a fungsi JS ASLI == generated column DB untuk SEMUA ${rows.length} baris seed (termasuk NULL)`, agree);
  const edge: [string, string, string][] = [
    ["BNB Chain", "  0xCBE2DBBFF4264DC67BF557C64E29997B82439354  ", "0xcbe2dbbff4264dc67bf557c64e29997b82439354"],
    ["BNB Chain", "cbe2dbbff4264dc67bf557c64e29997b82439354", "0xcbe2dbbff4264dc67bf557c64e29997b82439354"],
    ["BNB Chain", "0XCBE2DBBFF4264DC67BF557C64E29997B82439354", "0xcbe2dbbff4264dc67bf557c64e29997b82439354"],
    ["Solana", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
    ["Solana", "  41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump ", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
    // Alamat BARU (bukan seed) — memastikan perbandingan DB benar-benar dieksekusi, bukan hanya UNIQUE.
    ["BNB Chain", "  0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA  ", "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
  ];
  let edgeOk = true;
  for (const [chain, addr, expected] of edge) {
    const js = canonicalizeContractAddress(chain, addr);
    if (js !== expected) { edgeOk = false; console.log(`  EDGE JS MISMATCH ${chain} ${addr}: js=${js} expected=${expected}`); }
    const r = tryRun(
      db,
      `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      `Edge ${chain} ${addr.slice(0, 12)}`, chain, "DeFi", "live", "x", "x", "Easy", "2026-11-08", "x", 90, addr,
    );
    if (!r.ok) {
      // Duplikat dengan baris seed yang sudah ada adalah HASIL YANG
      // BENAR (unique index bekerja) — bukan kegagalan tes.
      if (!/UNIQUE/i.test(r.error ?? "")) { edgeOk = false; console.log(`  EDGE INSERT FAIL ${chain}: ${r.error}`); }
      continue;
    }
    const got: any = db.query("SELECT contract_address_canonical AS c FROM projects WHERE contract_address = ? AND chain = ?").get(addr, chain);
    if (got?.c !== expected) { edgeOk = false; console.log(`  EDGE DB MISMATCH ${chain}: db=${got?.c} expected=${expected}`); }
  }
  check("H-CAT-13b korpus edge: JS == DB (atau UNIQUE bila duplikat seed — benar)", edgeOk);
  // NULL: JS null == DB null; string kosong ditolak keduanya.
  const nullJs = canonicalizeContractAddress("BNB Chain", null);
  const nullRow: any = db.query("SELECT count(*) AS n FROM projects WHERE contract_address IS NULL AND contract_address_canonical IS NULL").get();
  check("H-CAT-13c NULL -> JS null DAN DB canonical null (baris seed NULL cocok)", nullJs === null && Number(nullRow?.n) > 0, `nullRows=${nullRow?.n}`);
  let jsEmptyThrows = false;
  try { canonicalizeContractAddress("BNB Chain", ""); } catch { jsEmptyThrows = true; }
  const emptyDb = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Empty addr','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',91,'')`,
  );
  check("H-CAT-13d alamat kosong: JS throw DAN DB tolak CHECK (keduanya menolak)", jsEmptyThrows && !emptyDb.ok && /CHECK/i.test(emptyDb.error ?? ""), emptyDb.error ?? "");
  let jsUnknownThrows = false;
  try { canonicalizeContractAddress("Fake Chain", "0x1111111111111111111111111111111111111111"); } catch { jsUnknownThrows = true; }
  check("H-CAT-13e chain tak dikenal: JS throw (fail-closed, selaras CHECK)", jsUnknownThrows);
  db.close();
}

// ==================================================================
// H-TEN-11..15 — F-046/F-040 via handler Actions ASLI (actions.ts)
// dengan mock ctx + drizzle libsql NYATA atas DB disposable termigrasi.
// Principal: viewer local ownerUserId "principal-A"/"principal-B"
// -> resolvePrincipal() = "local:principal-A" / "local:principal-B".
// inference.complete dimock dan prompt-nya ditangkap (askGibran).
// ==================================================================
console.log("--- H-TEN-11..15 (Actions ASLI + mock ctx + libsql nyata) ---");
{
  const p = freshCopy(mig01bPath, "ten"); // termigrasi + fixture legacy (2 checks NULL, 2 saved <LEGACY>)
  const nowMs = Date.now();
  {
    const raw = new Database(p);
    raw.exec(
      `INSERT INTO checks (url, domain, verdict, score, signals, contracts, created_at, owner_user_id) VALUES
       ('https://a-1.test/x','a-1.test','waspada',60,'[]','[]',${nowMs},'local:principal-A'),
       ('https://a-2.test/x','a-2.test','bahaya',90,'[]','[]',${nowMs},'local:principal-A'),
       ('https://b-1.test/x','b-1.test','lebih_aman',10,'[]','[]',${nowMs},'local:principal-B')`,
    );
    raw.close();
  }
  const client = createClient({ url: `file:${p}` });
  const db: any = drizzle(client);
  let lastPrompt = "";
  function mkCtx(owner: string | null): any {
    return {
      slug: "test", invocationId: "test-1", spaceDir: workDir,
      db: () => db,
      viewer: owner
        ? { source: "local", authenticated: true, spaceSlug: "test", userId: `u-${owner}`, ownerUserId: owner, isOwner: true }
        : undefined,
      invalidateQueries: () => {},
      inference: {
        complete: async (prompt: string, _opts: any) => {
          lastPrompt = prompt;
          return "MOCK-REPLY";
        },
      },
      blobs: {}, agent: {}, tool: {}, emit: () => {},
      executePrivileged: async () => { throw new Error("privileged tidak dipakai di tes ini"); },
    };
  }
  const ctxA = mkCtx("principal-A");
  const ctxB = mkCtx("principal-B");
  const ctxAnon = mkCtx(null);
  try {
    // H-TEN-11: listChecks fail-closed via handler ASLI.
    const listA: any = await (Actions.listChecks as any).handler(ctxA, { limit: 30 });
    const listB: any = await (Actions.listChecks as any).handler(ctxB, { limit: 30 });
    const listAnon: any = await (Actions.listChecks as any).handler(ctxAnon, { limit: 30 });
    check(
      "H-TEN-11a listChecks(B) via handler ASLI hanya baris B (1 baris)",
      listB.checks.length === 1 && listB.checks[0].domain === "b-1.test",
      JSON.stringify(listB.checks.map((c: any) => c.domain)),
    );
    check(
      "H-TEN-11b listChecks(A) via handler ASLI hanya baris A (2 baris)",
      listA.checks.length === 2 && listA.checks.every((c: any) => ["a-1.test", "a-2.test"].includes(c.domain)),
      JSON.stringify(listA.checks.map((c: any) => c.domain)),
    );
    check("H-TEN-11c listChecks(anon) via handler ASLI = [] (bukan semua baris)", listAnon.checks.length === 0, JSON.stringify(listAnon.checks));
    const aIds = new Set(listA.checks.map((c: any) => c.id));
    const bIds = new Set(listB.checks.map((c: any) => c.id));
    check(
      "H-TEN-11d legacy NULL TIDAK terlihat principal A maupun B (fail-closed)",
      ![...aIds, ...bIds].includes(1) && ![...aIds, ...bIds].includes(2),
      `A ids=${JSON.stringify([...aIds])} B ids=${JSON.stringify([...bIds])} (legacy ids 1,2)`,
    );
    // Kontras predikat lama (SQL langsung, bukan handler): OR owner IS NULL membocorkan.
    const oldPred: any[] = await client.execute("SELECT id, domain, owner_user_id FROM checks WHERE owner_user_id = 'local:principal-B' OR owner_user_id IS NULL ORDER BY id");
    check(
      "H-TEN-11e KONTRAS: predikat lama v2.3.20 (OR owner IS NULL) MEMBOCORKAN 2 baris legacy ke B — alasan F-046",
      oldPred.rows.length === 3 && oldPred.rows.filter((r: any) => r.owner_user_id === null).length === 2,
      `rows=${oldPred.rows.length}`,
    );

    // H-TEN-12: deleteCheck lintas principal via handler ASLI.
    const aRowId = listA.checks[0].id;
    const bRowId = listB.checks[0].id;
    const delA = await (Actions.deleteCheck as any).handler(ctxB, { id: aRowId });
    check("H-TEN-12a deleteCheck baris A oleh B via handler ASLI -> ok generik", (delA as any)?.ok === true);
    const stillA: any = await client.execute({ sql: "SELECT count(*) AS n FROM checks WHERE id = ?", args: [aRowId] });
    check("H-TEN-12b baris A MASIH ADA setelah percobaan hapus oleh B", Number(stillA.rows[0].n) === 1);
    const delLegacy = await (Actions.deleteCheck as any).handler(ctxB, { id: 1 });
    check("H-TEN-12c deleteCheck baris legacy NULL oleh B -> ok generik", (delLegacy as any)?.ok === true);
    const stillLegacy: any = await client.execute("SELECT count(*) AS n FROM checks WHERE owner_user_id IS NULL");
    check("H-TEN-12d kedua baris legacy MASIH ADA", Number(stillLegacy.rows[0].n) === 2);
    const delAnon = await (Actions.deleteCheck as any).handler(ctxAnon, { id: bRowId });
    check("H-TEN-12e deleteCheck oleh ANON -> ok generik, tanpa hapus apa pun", (delAnon as any)?.ok === true);
    const stillB1: any = await client.execute({ sql: "SELECT count(*) AS n FROM checks WHERE id = ?", args: [bRowId] });
    check("H-TEN-12f baris B MASIH ADA setelah percobaan hapus oleh anon", Number(stillB1.rows[0].n) === 1);
    const delOwn = await (Actions.deleteCheck as any).handler(ctxB, { id: bRowId });
    check("H-TEN-12g deleteCheck baris SENDIRI oleh B -> ok + 1 baris terhapus", (delOwn as any)?.ok === true);
    const goneB: any = await client.execute({ sql: "SELECT count(*) AS n FROM checks WHERE id = ?", args: [bRowId] });
    check("H-TEN-12h baris B HILANG setelah hapus sendiri", Number(goneB.rows[0].n) === 0);
    const delMissing = await (Actions.deleteCheck as any).handler(ctxB, { id: 99999 });
    check("H-TEN-12i deleteCheck id tidak ada -> ok generik (tanpa bocor info)", (delMissing as any)?.ok === true);

    // H-TEN-13: askGibran scope via handler ASLI (prompt ditangkap mock inference).
    lastPrompt = "";
    const gA: any = await (Actions.askGibran as any).handler(ctxA, { message: "apa riwayat cek saya?", history: [] });
    check("H-TEN-13a askGibran(A) mengembalikan balasan mock", gA.reply === "MOCK-REPLY");
    check(
      "H-TEN-13b prompt askGibran(A) memuat domain A saja (a-1, a-2; B/legacy TIDAK masuk)",
      lastPrompt.includes("a-1.test") && lastPrompt.includes("a-2.test") && !lastPrompt.includes("b-1.test") && !lastPrompt.includes("example-legacy-1.test") && !lastPrompt.includes("example-legacy-2.test"),
      `prompt-riwayat=${lastPrompt.split("RIWAYAT CEK LINK TERAKHIR:")[1]?.split("PANDUAN")[0]?.trim().slice(0, 200) ?? ""}`,
    );
    lastPrompt = "";
    const gB: any = await (Actions.askGibran as any).handler(ctxB, { message: "apa riwayat cek saya?", history: [] });
    check("H-TEN-13c askGibran(B) mengembalikan balasan mock", gB.reply === "MOCK-REPLY");
    check(
      "H-TEN-13d prompt askGibran(B) TIDAK memuat domain A/legacy (baris B sudah dihapus -> riwayat kosong)",
      !lastPrompt.includes("a-1.test") && !lastPrompt.includes("a-2.test") && !lastPrompt.includes("example-legacy-1.test") && lastPrompt.includes("(Belum ada riwayat cek link.)"),
      `prompt-riwayat=${lastPrompt.split("RIWAYAT CEK LINK TERAKHIR:")[1]?.split("PANDUAN")[0]?.trim().slice(0, 200) ?? ""}`,
    );
    lastPrompt = "";
    await (Actions.askGibran as any).handler(ctxAnon, { message: "halo", history: [] });
    check(
      "H-TEN-13e askGibran(anon) prompt riwayat KOSONG (bukan semua baris)",
      lastPrompt.includes("(Belum ada riwayat cek link.)") && !lastPrompt.includes("a-1.test") && !lastPrompt.includes("example-legacy-1.test"),
    );

    // H-TEN-14: predikat export legacy (admin-gated) — SQL-nya saja; gate §5 TIDAK diuji.
    const legacyRows: any = await client.execute("SELECT id, domain FROM checks WHERE owner_user_id IS NULL ORDER BY id");
    check(
      "H-TEN-14 predikat export legacy (admin-gated) mengembalikan TEPAT 2 baris NULL — bukan untuk principal biasa",
      legacyRows.rows.length === 2,
      JSON.stringify(legacyRows.rows.map((r: any) => r.domain)),
    );

    // H-TEN-15: isolasi saved_projects via handler ASLI (listProjects/setProjectState).
    await (Actions.setProjectState as any).handler(ctxA, { projectId: 1, bookmarked: false, taskStatus: "completed" });
    const lpA: any = await (Actions.listProjects as any).handler(ctxA, {});
    const lpB: any = await (Actions.listProjects as any).handler(ctxB, {});
    const p1A = lpA.projects.find((x: any) => x.id === 1);
    const p1B = lpB.projects.find((x: any) => x.id === 1);
    check(
      "H-TEN-15a setProjectState(A) terlihat di listProjects(A): completed + tidak bookmark",
      p1A?.task_status === "completed" && p1A?.bookmarked === false,
      JSON.stringify({ t: p1A?.task_status, b: p1A?.bookmarked }),
    );
    check(
      "H-TEN-15b listProjects(B) TIDAK terpengaruh state A (not_started)",
      p1B?.task_status === "not_started",
      JSON.stringify({ t: p1B?.task_status, b: p1B?.bookmarked }),
    );
    const savedRows: any = await client.execute("SELECT principal_id, project_id, bookmarked, task_status FROM saved_projects ORDER BY principal_id, project_id");
    const legacySaved = savedRows.rows.filter((r: any) => r.principal_id === "<LEGACY>");
    const aSaved = savedRows.rows.filter((r: any) => r.principal_id === "local:principal-A" && r.project_id === 1);
    const bSaved = savedRows.rows.filter((r: any) => r.principal_id === "local:principal-B");
    check("H-TEN-15c baris '<LEGACY>' tetap 2 (tidak tertimpa state per-principal)", legacySaved.length === 2, `n=${legacySaved.length}`);
    check("H-TEN-15d state A tersimpan sebagai baris (local:principal-A, 1)", aSaved.length === 1 && aSaved[0].task_status === "completed" && aSaved[0].bookmarked === 0, JSON.stringify(aSaved));
    check("H-TEN-15e TIDAK ADA baris saved untuk B (B belum pernah set state)", bSaved.length === 0, `n=${bSaved.length}`);
    let dupRejected = false;
    let dupErr = "";
    try {
      await client.execute({ sql: "INSERT INTO saved_projects (principal_id, project_id, bookmarked, task_status, updated_at) VALUES ('local:principal-A', 1, 1, 'completed', ?)", args: [nowMs] });
    } catch (e: any) {
      dupErr = String(e?.message ?? e);
      dupRejected = /UNIQUE/i.test(dupErr);
    }
    check("H-TEN-15f INSERT duplikat (principal-A, project 1) -> UNIQUE violation (composite key menegakkan di DB)", dupRejected, dupErr.slice(0, 200));
    check("H-TEN-15g katalog tetap GLOBAL (12 baris terlihat kedua principal)", lpA.projects.length === 12 && lpB.projects.length === 12, `A=${lpA.projects.length} B=${lpB.projects.length}`);
  } catch (e: any) {
    block("H-TEN (handler Actions ASLI)", `eksepsi saat menjalankan handler: ${String(e?.message ?? e)}`);
  } finally {
    try { client.close(); } catch {}
  }
  // Verifikasi akhir via bun:sqlite (koneksi terpisah, setelah client ditutup).
  const rawFinal = new Database(p, { readonly: true });
  const fc = counts(rawFinal);
  check("H-TEN-99 final: checks = 4 (2 legacy + 2 A; B terhapus sendiri)", fc.checks === 4, `n=${fc.checks}`);
  check("H-TEN-99 final: saved_projects = 3 (2 legacy + 1 A)", fc.saved_projects === 3, `n=${fc.saved_projects}`);
  rawFinal.close();
}

// ==================================================================
// DK-01..07 — Drizzle-kit DDL diff: DDL dari schema.ts ASLI
// (evidence/v2323/drizzle-kit-generated/0000_ambitious_firelord.sql,
// dibangkitkan offline dengan drizzle-kit 0.31.4 — lihat README di
// folder itu) diterapkan ke DB fresh, lalu dibandingkan SEMANTIK
// dengan skema hasil migrator nyata (DB 01a).
// Bukan perbandingan teks mentah: quoting/qualifier ("projects". vs
// `...`) dan penempatan FK (kolom vs tabel) dinormalisasi; yang
// dibandingkan adalah table_info, index, FK, CHECK, dan generated
// expression. Perbedaan non-skema yang DIKETAHUI (bukan FAIL):
// DDL drizzle-kit tidak membawa seed (projects 0 baris vs 12) dan
// tidak membawa ledger __drizzle_migrations.
// ==================================================================
console.log("--- DK (drizzle-kit DDL diff) ---");
function normSqlText(s: string): string {
  return s
    .replace(/["`]/g, "")
    .replace(/\bprojects\./gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+\(/g, "(")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim()
    .toLowerCase();
}
/** Ambil isi CHECK(...) / GENERATED ALWAYS AS (...) dengan pencocokan kurung berimbang.
 * Kata kunci dicari sebagai kata utuh diikuti '(' — agar "CHECK" tidak
 * cocok dengan kata "checks" pada nama tabel (bug run3: ekstraksi
 * menangkap daftar kolom, bukan CHECK). */
function balancedInner(sql: string, keyword: string): string[] {
  const out: string[] = [];
  const re = new RegExp("\\b" + keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\(", "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const start = sql.indexOf("(", m.index + m[0].length - 1);
    if (start === -1) continue;
    let depth = 0;
    for (let i = start; i < sql.length; i++) {
      if (sql[i] === "(") depth++;
      else if (sql[i] === ")") {
        depth--;
        if (depth === 0) {
          out.push(sql.slice(start + 1, i));
          re.lastIndex = i + 1;
          break;
        }
      }
    }
  }
  return out;
}
function schemaMaps(db: Database) {
  const tables: Record<string, any> = {};
  const idxs: Record<string, any> = {};
  const fks: Record<string, any> = {};
  const checks: Record<string, string[]> = {};
  const gen: Record<string, string[]> = {};
  const tableNames: any[] = db.query("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name").all();
  for (const t of tableNames) {
    const name = t.name;
    // Normalisasi notnull pada kolom INTEGER PRIMARY KEY (rowid alias):
    // SQLite memaksakan NOT NULL pada kolom itu apa pun deklarasinya,
    // jadi 'id INTEGER PRIMARY KEY AUTOINCREMENT' (migrasi 0002/0007,
    // tanpa NOT NULL eksplisit) dan 'id integer PRIMARY KEY
    // AUTOINCREMENT NOT NULL' (drizzle-kit) berperilaku identik.
    // Tanpa normalisasi ini, perbandingan melaporkan selisih semu.
    tables[name] = db.query(`PRAGMA table_info(${name})`).all().map((r: any) => {
      const nn = r.pk > 0 && String(r.type).toLowerCase() === "integer" ? 1 : r.notnull;
      return [r.name, r.type.toLowerCase(), nn, r.dflt_value === null ? null : String(r.dflt_value), r.pk];
    });
    const list: any[] = db.query(`PRAGMA index_list(${name})`).all();
    idxs[name] = list.map((ix: any) => {
      const cols: any[] = db.query(`PRAGMA index_info(${ix.name})`).all();
      return [ix.name, ix.unique, ix.partial, cols.sort((a: any, b: any) => a.seqno - b.seqno).map((c: any) => c.name)];
    }).sort((a: any, b: any) => String(a[0]).localeCompare(String(b[0])));
    fks[name] = db.query(`PRAGMA foreign_key_list(${name})`).all().map((r: any) => [r.table, r.from, r.to, r.on_update, r.on_delete]).sort();
    const sqlText: string = t.sql ?? "";
    checks[name] = balancedInner(sqlText, "CHECK").map(normSqlText).sort();
    gen[name] = balancedInner(sqlText, "GENERATED ALWAYS AS").map(normSqlText).sort();
  }
  return { tables, idxs, fks, checks, gen };
}
{
  const dkPath = join(workDir, "dk.db");
  const dkDb = new Database(dkPath);
  const dkText = readFileSync(DK_SQL, "utf8");
  const dkChunks = dkText.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
  let dkApplyOk = true;
  let dkApplyErr = "";
  for (const chunk of dkChunks) {
    const r = tryExec(dkDb, chunk);
    if (!r.ok) { dkApplyOk = false; dkApplyErr = r.error ?? ""; break; }
  }
  check("DK-00 DDL drizzle-kit diterapkan ke DB fresh tanpa error", dkApplyOk, dkApplyErr.slice(0, 300));
  const dkCounts = counts(dkDb);
  console.log(`  INFO (bukan FAIL): DDL drizzle-kit TIDAK membawa seed — projects=${dkCounts.projects} (migrasi: 12); ledger __drizzle_migrations ${(() => { try { dkDb.query("SELECT count(*) FROM __drizzle_migrations").get(); return "ADA"; } catch { return "TIDAK ADA"; } })()} (migrasi: 7 baris). Keduanya by design: drizzle-kit hanya membangkitkan DDL.`);
  const migDb = new Database(mig01aPath, { readonly: true });
  const dk = schemaMaps(dkDb);
  const mg = schemaMaps(migDb);
  check(
    "DK-01 himpunan tabel sama (5 tabel)",
    JSON.stringify(Object.keys(dk.tables).sort()) === JSON.stringify(Object.keys(mg.tables).sort()),
    `dk=${JSON.stringify(Object.keys(dk.tables).sort())} mig=${JSON.stringify(Object.keys(mg.tables).sort())}`,
  );
  let colsOk = true;
  for (const t of Object.keys(mg.tables).sort()) {
    if (JSON.stringify(dk.tables[t]) !== JSON.stringify(mg.tables[t])) {
      colsOk = false;
      console.log(`  COL DIFF ${t}: dk=${JSON.stringify(dk.tables[t])} mig=${JSON.stringify(mg.tables[t])}`);
    }
  }
  check("DK-02 PRAGMA table_info (kolom/tipe/notnull/default/pk) sama per tabel", colsOk);
  let idxOk = true;
  for (const t of Object.keys(mg.idxs).sort()) {
    if (JSON.stringify(dk.idxs[t]) !== JSON.stringify(mg.idxs[t])) {
      idxOk = false;
      console.log(`  IDX DIFF ${t}: dk=${JSON.stringify(dk.idxs[t])} mig=${JSON.stringify(mg.idxs[t])}`);
    }
  }
  check("DK-03 index (nama/unique/partial/kolom) sama per tabel", idxOk);
  let fkOk = true;
  for (const t of Object.keys(mg.fks).sort()) {
    if (JSON.stringify(dk.fks[t]) !== JSON.stringify(mg.fks[t])) {
      fkOk = false;
      console.log(`  FK DIFF ${t}: dk=${JSON.stringify(dk.fks[t])} mig=${JSON.stringify(mg.fks[t])}`);
    }
  }
  check("DK-04 foreign_key_list sama per tabel", fkOk);
  let ckOk = true;
  for (const t of Object.keys(mg.checks).sort()) {
    if (JSON.stringify(dk.checks[t]) !== JSON.stringify(mg.checks[t])) {
      ckOk = false;
      console.log(`  CHECK DIFF ${t}: dk=${JSON.stringify(dk.checks[t])} mig=${JSON.stringify(mg.checks[t])}`);
    }
  }
  check("DK-05 CHECK constraints (nama + ekspresi ternormalisasi) sama — termasuk kedua CHECK bernama projects", ckOk);
  let genOk = true;
  for (const t of Object.keys(mg.gen).sort()) {
    if (JSON.stringify(dk.gen[t]) !== JSON.stringify(mg.gen[t])) {
      genOk = false;
      console.log(`  GEN DIFF ${t}: dk=${JSON.stringify(dk.gen[t])} mig=${JSON.stringify(mg.gen[t])}`);
    }
  }
  check("DK-06 generated-column expression (ternormalisasi) sama", genOk);
  // Perbedaan teks mentah yang tersisa (INFO, bukan FAIL bila DK-01..06 lolos):
  const rawDiffs: string[] = [];
  for (const t of Object.keys(mg.tables).sort()) {
    const dkSql: any = dkDb.query("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(t);
    const mgSql: any = migDb.query("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(t);
    if (normSqlText(dkSql?.sql ?? "") !== normSqlText(mgSql?.sql ?? "")) rawDiffs.push(t);
  }
  if (rawDiffs.length > 0) {
    console.log(`  INFO perbedaan teks mentah sql (setelah normalisasi quoting/qualifier) pada tabel: ${rawDiffs.join(", ")} — DK-01..06 membuktikan kesetaraan semantik. Penyebab selisih teks: (1) saved_projects — penempatan FK (drizzle-kit: FOREIGN KEY level-tabel; migrasi 0006: REFERENCES level-kolom); (2) checks/scan_leases id — migrasi historis 0002/0007 menulis 'INTEGER PRIMARY KEY AUTOINCREMENT' tanpa NOT NULL eksplisit, drizzle-kit menulis 'NOT NULL' (perilaku identik — rowid alias selalu NOT NULL, dinormalisasi di DK-02); (3) rate_limits count — urutan kata 'NOT NULL DEFAULT 1' vs 'DEFAULT 1 NOT NULL'. Bukan divergensi skema.`);
  } else {
    console.log("  INFO tidak ada perbedaan teks mentah sql setelah normalisasi.");
  }
  check("DK-07 TIDAK ADA divergensi semantik (DK-02..DK-06 semua sama); selisih teks mentah hanya gaya penulisan", colsOk && idxOk && fkOk && ckOk && genOk);
  dkDb.close();
  migDb.close();
}

// ------------------------------------------------------------------
// Ringkasan.
// ------------------------------------------------------------------
console.log(`=== RESULT: ${pass} PASS, ${fail} FAIL ===`);
if (blocked.length > 0) {
  console.log("BLOCKED:");
  for (const b of blocked) console.log(`  - ${b}`);
}
if (failures.length > 0) {
  console.log("failures:");
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(`work dir (DB disposable, tidak di-commit): ${workDir}`);
process.exit(fail === 0 ? 0 : 1);
