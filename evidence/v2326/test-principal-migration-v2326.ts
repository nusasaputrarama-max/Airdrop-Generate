// test-principal-migration-v2326.ts — F-060 / U-114 (v2.3.26): principal-key
// compatibility tool (evidence/v2326/principal-key-migration.ts).
//
// The v2.3.25 change `local:{ownerUserId}` -> `local:{userId}` left
// pre-existing rows orphaned: old keys no longer match any principal.
// Old and new keys share the format `local:<id>`, so NO code may guess
// a mapping. This harness proves the OFFLINE tool handles that honestly:
// explicit operator-supplied keys/mapping only, transactional rename
// with backup + pre/post counts, collision refusal, rollback, and
// fail-closed refusals. Every test builds its OWN disposable DB
// (REAL migrations) and drives the REAL CLI as a child process, so
// exit codes are the tool's own.
//
// Seed fixture (per fresh DB):
//   checks:          2 x local:owner-1 (legacy), 1 x local:u-owner-1
//                    (current), 1 x local:owner-2 (second user legacy),
//                    1 x NULL owner
//   saved_projects:  (local:owner-1, p1), (local:owner-1, p2),
//                    (<LEGACY>, p2), (local:u-owner-1, p3)
//   projects:        catalog project 1 provenance_submitted_by =
//                    local:owner-1 (legacy)
//
//   H-MIGR-01  inventory reports exact per-key counts per table
//   H-MIGR-02  archive copies legacy rows to JSON; DB NOT modified
//   H-MIGR-03  rename with verified mapping: counts unchanged, owner
//              (local:u-owner-1) reads renamed history via listChecks,
//              second user isolated, backup JSON written
//   H-MIGR-04  rename with saved_projects PK collision -> exit 2,
//              DB unchanged, no backup written
//   H-MIGR-05  rename without --mapping -> exit 2, DB unchanged
//   H-MIGR-06  rename mapping '<LEGACY>' -> exit 2, DB unchanged
//   H-MIGR-07  rollback restores original keys; counts unchanged;
//              owner no longer sees the renamed rows
//   H-MIGR-08  tool refuses a database file named app.db (exit 2)
//
// Run:  bun evidence/v2326/test-principal-migration-v2326.ts
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import { Actions } from "../../site/server/src/actions";
import {
  countRows,
  localViewer,
  makeMigratedDb,
  mkCtx,
  seedChecks,
  type TestDb,
} from "../v2323/harness-helpers";
import { Database } from "bun:sqlite";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0;
let fail = 0;
const failures: string[] = [];
type Test = { id: string; name: string; run: () => Promise<void> | void };
const tests: Test[] = [];
function test(id: string, name: string, run: () => Promise<void> | void): void {
  tests.push({ id, name, run });
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function eq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected)
    throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const TOOL = join(import.meta.dir, "principal-key-migration.ts");
const LEGACY_A = "local:owner-1";
const LEGACY_B = "local:owner-2";
const CURRENT_A = "local:u-owner-1";

function seedLegacyDb(): TestDb {
  const tdb = makeMigratedDb();
  seedChecks(tdb.dbPath, [
    { url: "https://a.example/", domain: "a.example", verdict: "lebih_aman", score: 10, ownerUserId: LEGACY_A },
    { url: "https://b.example/", domain: "b.example", verdict: "waspada", score: 40, ownerUserId: LEGACY_A },
    { url: "https://c.example/", domain: "c.example", verdict: "lebih_aman", score: 10, ownerUserId: CURRENT_A },
    { url: "https://d.example/", domain: "d.example", verdict: "bahaya", score: 90, ownerUserId: LEGACY_B },
    { url: "https://e.example/", domain: "e.example", verdict: "lebih_aman", score: 10, ownerUserId: null },
  ]);
  const raw = new Database(tdb.dbPath);
  try {
    const now = Date.now();
    raw.exec(
      `INSERT INTO saved_projects (principal_id, project_id, bookmarked, task_status, updated_at) VALUES ('${LEGACY_A}', 1, 1, 'completed', ${now}), ('${LEGACY_A}', 2, 0, 'in_progress', ${now}), ('<LEGACY>', 2, 1, 'completed', ${now}), ('${CURRENT_A}', 3, 1, 'not_started', ${now})`,
    );
    raw.exec(`UPDATE projects SET provenance_submitted_by = '${LEGACY_A}' WHERE id = 1`);
  } finally {
    raw.close();
  }
  return tdb;
}

function counts(tdb: TestDb): Record<string, number> {
  return {
    checks: countRows(tdb.dbPath, "checks"),
    saved_projects: countRows(tdb.dbPath, "saved_projects"),
    projects: countRows(tdb.dbPath, "projects"),
  };
}

function keyCount(tdb: TestDb, table: string, column: string, key: string): number {
  const raw = new Database(tdb.dbPath);
  try {
    const row: any = raw.query(`SELECT count(*) AS n FROM ${table} WHERE ${column} = ?`).get(key);
    return Number(row?.n ?? 0);
  } finally {
    raw.close();
  }
}

function runTool(dbPath: string, ...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync("bun", [TOOL, dbPath, ...args], { encoding: "utf8" });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function tmpJson(obj: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "v2326-migr-"));
  const p = join(dir, "input.json");
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  return p;
}

const listChecks: any = (Actions as any).listChecks;

test("H-MIGR-01", "inventory reports exact per-key counts per table", async () => {
  const tdb = seedLegacyDb();
  try {
    const r = runTool(tdb.dbPath, "inventory");
    eq(r.status, 0, `inventory must exit 0 (stderr: ${r.stderr})`);
    assert(r.stdout.includes("checks.owner_user_id — total rows: 5"), "inventory must report 5 checks rows");
    assert(r.stdout.includes("local:owner-1: 2"), "inventory must report 2 legacy checks for owner-1");
    assert(r.stdout.includes("local:u-owner-1: 1"), "inventory must report 1 current check");
    assert(r.stdout.includes("local:owner-2: 1"), "inventory must report 1 legacy check for owner-2");
    assert(r.stdout.includes("<NULL>: 1"), "inventory must report 1 NULL-owner check");
    assert(r.stdout.includes("saved_projects.principal_id — total rows: 4"), "inventory must report 4 saved rows");
    assert(r.stdout.includes("1 saved_projects row(s) use the '<LEGACY>' sentinel"), "inventory must flag the <LEGACY> row");
    assert(r.stdout.includes("1 checks row(s) have NULL owner_user_id"), "inventory must flag the NULL-owner check");
  } finally {
    tdb.close();
  }
});

test("H-MIGR-02", "archive copies legacy rows to JSON; DB NOT modified", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = counts(tdb);
    const keysFile = tmpJson([LEGACY_A, LEGACY_B]);
    const outFile = join(tmpdir(), `v2326-archive-${Date.now()}.json`);
    const r = runTool(tdb.dbPath, "archive", "--keys", keysFile, "--out", outFile);
    eq(r.status, 0, `archive must exit 0 (stderr: ${r.stderr})`);
    const doc = JSON.parse(readFileSync(outFile, "utf8"));
    eq(doc.mode, "archive", "archive JSON must record mode=archive");
    eq(doc.rows.checks.length, 3, "archive must contain 3 legacy checks (2 owner-1 + 1 owner-2)");
    eq(doc.rows.saved_projects.length, 2, "archive must contain 2 legacy saved rows");
    eq(doc.rows.projects.length, 1, "archive must contain 1 legacy provenance row");
    eq(doc.totalRows, 6, "archive total must be 6");
    assert(!JSON.stringify(doc).includes("<LEGACY>"), "archive of explicit keys must not include the <LEGACY> sentinel row");
    const after = counts(tdb);
    eq(JSON.stringify(after), JSON.stringify(before), "archive must NOT modify the DB");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 2, "legacy checks must still be in the DB after archive");
    rmSync(outFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-03", "rename with verified mapping: counts unchanged, owner reads history, second user isolated", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = counts(tdb);
    const mappingFile = tmpJson([
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: operator-verified export mapping local:owner-1 -> local:u-owner-1" },
    ]);
    const backupFile = join(tmpdir(), `v2326-backup-${Date.now()}.json`);
    const r = runTool(tdb.dbPath, "rename", "--mapping", mappingFile, "--backup", backupFile);
    eq(r.status, 0, `rename must exit 0 (stderr: ${r.stderr})`);
    assert(existsSync(backupFile), "rename must write a backup JSON before writing");
    const backup = JSON.parse(readFileSync(backupFile, "utf8"));
    eq(backup.mode, "rename-backup", "backup must record mode=rename-backup");
    eq(backup.rows.checks.length, 2, "backup must hold the 2 renamed checks");
    const after = counts(tdb);
    eq(JSON.stringify(after), JSON.stringify(before), "rename must NOT change per-table row counts");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 0, "no checks row may keep the legacy key");
    eq(keyCount(tdb, "checks", "owner_user_id", CURRENT_A), 3, "3 checks must now carry the current key (2 renamed + 1 pre-existing)");
    eq(keyCount(tdb, "saved_projects", "principal_id", LEGACY_A), 0, "no saved row may keep the legacy key");
    eq(keyCount(tdb, "saved_projects", "principal_id", CURRENT_A), 3, "3 saved rows must now carry the current key");
    eq(keyCount(tdb, "saved_projects", "principal_id", "<LEGACY>"), 1, "<LEGACY> sentinel row must be untouched by rename");
    eq(keyCount(tdb, "projects", "provenance_submitted_by", LEGACY_A), 0, "no provenance row may keep the legacy key");
    // Handler-level: owner (userId u-owner-1) reads renamed history; second user isolated.
    const ownerCtx = mkCtx(tdb.db, localViewer("owner-1", true));
    const listed = await listChecks.handler(ownerCtx, { limit: 30 });
    eq(listed.checks.length, 3, "owner must see 3 checks after rename (2 renamed + 1 pre-existing)");
    const otherCtx = mkCtx(tdb.db, localViewer("owner-2", true));
    const other = await listChecks.handler(otherCtx, { limit: 30 });
    eq(other.checks.length, 0, "second user (local:u-owner-2) must see 0 checks — their legacy row is still local:owner-2, not renamed");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_B), 1, "second user's legacy check must be untouched (mapping covered only owner-1)");
    rmSync(backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-04", "rename with saved_projects PK collision -> exit 2, DB unchanged, no backup", async () => {
  const tdb = seedLegacyDb();
  try {
    // Create the collision: target principal already holds project 1.
    const raw = new Database(tdb.dbPath);
    try {
      raw.exec(
        `INSERT INTO saved_projects (principal_id, project_id, bookmarked, task_status, updated_at) VALUES ('${CURRENT_A}', 1, 0, 'not_started', ${Date.now()})`,
      );
    } finally {
      raw.close();
    }
    const before = counts(tdb);
    const mappingFile = tmpJson([
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: collision case" },
    ]);
    const backupFile = join(tmpdir(), `v2326-backup-collide-${Date.now()}.json`);
    const r = runTool(tdb.dbPath, "rename", "--mapping", mappingFile, "--backup", backupFile);
    eq(r.status, 2, `colliding rename must be REFUSED with exit 2 (got ${r.status}; stdout: ${r.stdout}; stderr: ${r.stderr})`);
    assert(!existsSync(backupFile), "refused rename must NOT write a backup file");
    const after = counts(tdb);
    eq(JSON.stringify(after), JSON.stringify(before), "refused rename must NOT change any row count");
    eq(keyCount(tdb, "saved_projects", "principal_id", LEGACY_A), 2, "legacy saved rows must be untouched after refusal");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 2, "legacy checks must be untouched after refusal");
  } finally {
    tdb.close();
  }
});

test("H-MIGR-05", "rename without --mapping -> exit 2, DB unchanged", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = counts(tdb);
    const r = runTool(tdb.dbPath, "rename", "--backup", join(tmpdir(), `v2326-backup-nomap-${Date.now()}.json`));
    eq(r.status, 2, `rename without a mapping must be REFUSED with exit 2 (got ${r.status})`);
    const after = counts(tdb);
    eq(JSON.stringify(after), JSON.stringify(before), "refused rename must NOT change any row count");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 2, "legacy checks must be untouched");
  } finally {
    tdb.close();
  }
});

test("H-MIGR-06", "rename mapping '<LEGACY>' -> exit 2, DB unchanged", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = counts(tdb);
    const mappingFile = tmpJson([
      { legacyKey: "<LEGACY>", currentKey: CURRENT_A, basis: "harness fixture: sentinel must never be renamed" },
    ]);
    const r = runTool(tdb.dbPath, "rename", "--mapping", mappingFile, "--backup", join(tmpdir(), `v2326-backup-leg-${Date.now()}.json`));
    eq(r.status, 2, `rename of '<LEGACY>' must be REFUSED with exit 2 (got ${r.status})`);
    const after = counts(tdb);
    eq(JSON.stringify(after), JSON.stringify(before), "refused rename must NOT change any row count");
    eq(keyCount(tdb, "saved_projects", "principal_id", "<LEGACY>"), 1, "<LEGACY> row must be untouched");
  } finally {
    tdb.close();
  }
});

test("H-MIGR-07", "rollback restores original keys; counts unchanged; owner loses renamed rows", async () => {
  const tdb = seedLegacyDb();
  try {
    const mappingFile = tmpJson([
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: rollback case" },
    ]);
    const backupFile = join(tmpdir(), `v2326-backup-rb-${Date.now()}.json`);
    const r1 = runTool(tdb.dbPath, "rename", "--mapping", mappingFile, "--backup", backupFile);
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 0, "precondition: legacy key gone after rename");
    const before = counts(tdb);
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", backupFile);
    eq(r2.status, 0, `rollback must exit 0 (stderr: ${r2.stderr})`);
    const after = counts(tdb);
    eq(JSON.stringify(after), JSON.stringify(before), "rollback must NOT change per-table row counts");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 2, "rollback must restore 2 legacy checks");
    eq(keyCount(tdb, "checks", "owner_user_id", CURRENT_A), 1, "rollback must leave only the 1 pre-existing current check");
    eq(keyCount(tdb, "saved_projects", "principal_id", LEGACY_A), 2, "rollback must restore 2 legacy saved rows");
    eq(keyCount(tdb, "projects", "provenance_submitted_by", LEGACY_A), 1, "rollback must restore the legacy provenance row");
    const ownerCtx = mkCtx(tdb.db, localViewer("owner-1", true));
    const listed = await listChecks.handler(ownerCtx, { limit: 30 });
    eq(listed.checks.length, 1, "after rollback the owner sees only the 1 pre-existing current check");
    rmSync(backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-08", "tool refuses a database file named app.db (exit 2)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "v2326-appdb-"));
  const appDb = join(dir, "app.db");
  writeFileSync(appDb, "not a real db", "utf8");
  try {
    const r = runTool(appDb, "inventory");
    eq(r.status, 2, `app.db guard must refuse with exit 2 (got ${r.status})`);
    assert(r.stderr.includes("app.db"), "refusal must name the app.db guard");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const t of tests) {
  try {
    await t.run();
    pass++;
    console.log(`PASS ${t.id} ${t.name}`);
  } catch (err) {
    fail++;
    failures.push(t.id);
    console.log(`FAIL ${t.id} ${t.name} — ${err instanceof Error ? err.message : String(err)}`);
  }
}
console.log(`\nH-MIGR: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
