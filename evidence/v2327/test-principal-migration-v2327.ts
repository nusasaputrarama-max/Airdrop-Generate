// test-principal-migration-v2327.ts — F-061..F-064 (v2.3.27, audit V21):
// principal-key migration tool (evidence/v2326/principal-key-migration.ts,
// TOOL_VERSION v2327-1).
//
// Audit V21 found four flaws in the v2.3.26 tool:
//   F-061 High   chained/cyclic mappings cascade rows onto the wrong
//                principal (sequential UPDATEs, order-dependent).
//   F-062 Medium '<LEGACY>' sentinel rows and NULL-owner checks were
//                called archive-only but no archive path could export
//                them.
//   F-063 Medium rollback reported success on partial restore (no
//                pre-validation, no affected-row checks, no
//                postcondition).
//   F-064 Medium db-path guard bypassable via symlink (string checks
//                only, no lstat/realpath).
//
// Every test builds its OWN disposable DB and drives the REAL CLI as a
// child process, so exit codes are the tool's own. No test ever touches
// a live database; symlink tests point at disposable copies only.
//
// Seed fixture (per fresh DB) — same as v2326 plus explicit names:
//   checks:          2 x local:owner-1 (legacy A), 1 x local:u-owner-1
//                    (current A), 1 x local:owner-2 (legacy B),
//                    1 x NULL owner
//   saved_projects:  (local:owner-1, p1), (local:owner-1, p2),
//                    (<LEGACY>, p2), (local:u-owner-1, p3)
//   projects:        catalog project 1 provenance_submitted_by =
//                    local:owner-1 (legacy A)
//
//   H-MIGR-09  chain A→B + B→C refused exit 2, DB unchanged, no backup
//   H-MIGR-10  cycle A↔B refused exit 2, DB unchanged
//   H-MIGR-11  same chain in reversed order refused exit 2 (reject is
//              order-independent), DB unchanged, no backup
//   H-MIGR-12  archive-special exports the <LEGACY> sentinel saved row
//              with correct counts/content; DB NOT modified
//   H-MIGR-13  archive-special exports the NULL-owner check with
//              correct counts/content; DB NOT modified
//   H-MIGR-14  rollback with a row deleted post-rename -> nonzero
//              exit, DB unchanged (no partial restore)
//   H-MIGR-15  rollback with a principal changed post-rename ->
//              nonzero exit, DB unchanged (new owner NOT overwritten)
//   H-MIGR-16  rollback with a saved_projects restore conflict ->
//              nonzero exit, DB unchanged
//   H-MIGR-17  symlink alias to app.db refused exit 2; symlink through
//              a runtime (ts-spaces) directory refused exit 2; a valid
//              disposable copy still works (inventory + rename)
//   H-MIGR-18  re-run sanity: a valid non-chain rename still succeeds
//              and a normal rollback still succeeds (F-061..F-064 did
//              not break the already-correct path)
//
// Run:  bun evidence/v2327/test-principal-migration-v2327.ts
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import {
  countRows,
  makeMigratedDb,
  seedChecks,
  type TestDb,
} from "../v2323/harness-helpers";
import { Database } from "bun:sqlite";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

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

const TOOL = join(import.meta.dir, "..", "v2326", "principal-key-migration.ts");
const LEGACY_A = "local:owner-1";
const LEGACY_B = "local:owner-2";
const CURRENT_A = "local:u-owner-1";
const CURRENT_B = "local:u-owner-2";

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

function snapshot(tdb: TestDb): string {
  // Full observable state: per-table counts + per-key counts for every
  // key the fixture uses. Two snapshots are equal iff the DB is
  // unchanged for every assertion this harness cares about.
  const keys: [string, string, string][] = [
    ["checks", "owner_user_id", LEGACY_A],
    ["checks", "owner_user_id", CURRENT_A],
    ["checks", "owner_user_id", LEGACY_B],
    ["checks", "owner_user_id", CURRENT_B],
    ["saved_projects", "principal_id", LEGACY_A],
    ["saved_projects", "principal_id", CURRENT_A],
    ["saved_projects", "principal_id", LEGACY_B],
    ["saved_projects", "principal_id", "<LEGACY>"],
    ["projects", "provenance_submitted_by", LEGACY_A],
    ["projects", "provenance_submitted_by", CURRENT_A],
  ];
  const parts = [JSON.stringify(counts(tdb))];
  for (const [t, c, k] of keys) parts.push(`${t}.${c}=${k}:${keyCount(tdb, t, c, k)}`);
  return parts.join("|");
}

function runTool(dbPath: string, ...args: string[]): { status: number | null; stdout: string; stderr: string } {
  // v2.3.30 (U-120): the tool now fails closed without an allowlisted
  // private working directory for EVERY mode. These regression
  // harnesses run only on disposable DBs in their own fresh private
  // mkdtemp directory, so they allowlist exactly that directory.
  // The allowlist precondition itself is tested by H-MIGR-42..47
  // (evidence/v2330); this wiring is harness plumbing, not a test
  // of the precondition.
  const env = { ...process.env, PRINCIPAL_MIGRATION_ALLOWED_DIR: process.env.PRINCIPAL_MIGRATION_ALLOWED_DIR ?? dirname(dbPath) };
  const r = spawnSync("bun", [TOOL, dbPath, ...args], { encoding: "utf8", env });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function tmpJson(obj: unknown, tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `v2327-migr-${tag}-`));
  const p = join(dir, "input.json");
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  return p;
}

function tmpOut(tag: string): string {
  return join(tmpdir(), `v2327-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`);
}

function doRename(tdb: TestDb, mapping: unknown, tag: string): { status: number | null; stdout: string; stderr: string; backupFile: string } {
  const mappingFile = tmpJson(mapping, tag);
  const backupFile = tmpOut(`backup-${tag}`);
  const r = runTool(tdb.dbPath, "rename", "--mapping", mappingFile, "--backup", backupFile);
  return { ...r, backupFile };
}

test("H-MIGR-09", "chain A→B + B→C refused exit 2, DB unchanged, no backup", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = snapshot(tdb);
    const r = doRename(tdb, [
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: chain case A->B" },
      { legacyKey: CURRENT_A, currentKey: CURRENT_B, basis: "harness fixture: chain case B->C" },
    ], "chain");
    eq(r.status, 2, `chained rename must be REFUSED with exit 2 (got ${r.status}; stdout: ${r.stdout}; stderr: ${r.stderr})`);
    assert(!existsSync(r.backupFile), "refused chain rename must NOT write a backup file");
    assert(r.stderr.includes("chained/cyclic") || r.stderr.includes("currentKey"), "refusal must explain the chain/cycle overlap");
    eq(snapshot(tdb), before, "refused chain rename must NOT change the DB");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 2, "legacy checks must be untouched after refusal");
    eq(keyCount(tdb, "checks", "owner_user_id", CURRENT_A), 1, "current checks must be untouched after refusal");
  } finally {
    tdb.close();
  }
});

test("H-MIGR-10", "cycle A↔B refused exit 2, DB unchanged", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = snapshot(tdb);
    const r = doRename(tdb, [
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: cycle case A->B" },
      { legacyKey: CURRENT_A, currentKey: LEGACY_A, basis: "harness fixture: cycle case B->A" },
    ], "cycle");
    eq(r.status, 2, `cyclic rename must be REFUSED with exit 2 (got ${r.status}; stderr: ${r.stderr})`);
    assert(!existsSync(r.backupFile), "refused cycle rename must NOT write a backup file");
    eq(snapshot(tdb), before, "refused cycle rename must NOT change the DB");
  } finally {
    tdb.close();
  }
});

test("H-MIGR-11", "same chain in reversed order refused exit 2 (reject is order-independent)", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = snapshot(tdb);
    // Identical mapping to H-MIGR-09 with the two entries swapped:
    // reject must not depend on array order.
    const r = doRename(tdb, [
      { legacyKey: CURRENT_A, currentKey: CURRENT_B, basis: "harness fixture: reversed chain B->C first" },
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: reversed chain A->B second" },
    ], "chain-rev");
    eq(r.status, 2, `reversed-order chain must be REFUSED with exit 2 (got ${r.status}; stderr: ${r.stderr})`);
    assert(!existsSync(r.backupFile), "refused reversed chain must NOT write a backup file");
    eq(snapshot(tdb), before, "refused reversed chain must NOT change the DB");
  } finally {
    tdb.close();
  }
});

test("H-MIGR-12", "archive-special exports <LEGACY> sentinel saved row; DB NOT modified", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = snapshot(tdb);
    const outFile = tmpOut("archive-special-sentinel");
    const r = runTool(tdb.dbPath, "archive-special", "--out", outFile);
    eq(r.status, 0, `archive-special must exit 0 (stderr: ${r.stderr})`);
    const doc = JSON.parse(readFileSync(outFile, "utf8"));
    eq(doc.mode, "archive-special", "archive-special JSON must record mode=archive-special");
    eq(doc.counts.sentinelSavedProjects, 1, "sentinel count must be 1");
    eq(doc.sentinelRows.length, 1, "sentinelRows must hold exactly 1 row");
    eq(doc.sentinelRows[0].principal_id, "<LEGACY>", "sentinel row principal must be '<LEGACY>'");
    eq(doc.sentinelRows[0].project_id, 2, "sentinel row must be project 2");
    eq(doc.totalRows, 2, "totalRows must be 2 (1 sentinel + 1 NULL-owner check)");
    eq(snapshot(tdb), before, "archive-special must NOT modify the DB");
    rmSync(outFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-13", "archive-special exports NULL-owner check; DB NOT modified", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = snapshot(tdb);
    const outFile = tmpOut("archive-special-null");
    const r = runTool(tdb.dbPath, "archive-special", "--out", outFile);
    eq(r.status, 0, `archive-special must exit 0 (stderr: ${r.stderr})`);
    const doc = JSON.parse(readFileSync(outFile, "utf8"));
    eq(doc.counts.nullOwnerChecks, 1, "NULL-owner check count must be 1");
    eq(doc.nullOwnerChecks.length, 1, "nullOwnerChecks must hold exactly 1 row");
    eq(doc.nullOwnerChecks[0].owner_user_id, null, "NULL-owner check row must have owner_user_id null");
    eq(doc.nullOwnerChecks[0].domain, "e.example", "NULL-owner check row must be the e.example check");
    assert(!JSON.stringify(doc.nullOwnerChecks).includes("local:owner-1"), "nullOwnerChecks must not contain owned rows");
    eq(snapshot(tdb), before, "archive-special must NOT modify the DB");
    rmSync(outFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-14", "rollback with a row deleted post-rename -> nonzero exit, DB unchanged", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: rollback missing-row case" },
    ], "rb-missing");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    // Post-rename state change: delete one renamed check.
    const raw = new Database(tdb.dbPath);
    try {
      const victim: any = raw.query("SELECT id FROM checks WHERE owner_user_id = ? LIMIT 1").get(CURRENT_A);
      assert(victim, "precondition: a renamed check must exist to delete");
      raw.query("DELETE FROM checks WHERE id = ?").run(victim.id);
    } finally {
      raw.close();
    }
    const before = snapshot(tdb);
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", r1.backupFile);
    assert(r2.status !== 0, `rollback with a missing row must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB (no partial restore)");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 0, "no legacy check may reappear after a refused rollback");
    rmSync(r1.backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-15", "rollback with a principal changed post-rename -> nonzero exit, DB unchanged", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: rollback changed-principal case" },
    ], "rb-changed");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    // Post-rename state change: legitimately reassign one renamed
    // check to a different principal.
    const raw = new Database(tdb.dbPath);
    try {
      raw.query("UPDATE checks SET owner_user_id = ? WHERE owner_user_id = ? LIMIT 1").run("local:other-owner", CURRENT_A);
    } finally {
      raw.close();
    }
    eq(keyCount(tdb, "checks", "owner_user_id", "local:other-owner"), 1, "precondition: one check now belongs to local:other-owner");
    const before = snapshot(tdb);
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", r1.backupFile);
    assert(r2.status !== 0, `rollback with a changed principal must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    eq(keyCount(tdb, "checks", "owner_user_id", "local:other-owner"), 1, "the post-rename owner must NOT be overwritten by rollback");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 0, "no legacy check may reappear after a refused rollback");
    rmSync(r1.backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-16", "rollback with a saved_projects restore conflict -> nonzero exit, DB unchanged", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: rollback saved conflict case" },
    ], "rb-conflict");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    // Post-rename conflict: a NEW row now occupies the restore
    // target (LEGACY_A, project 1), so restoring would violate the
    // saved_projects composite PK.
    const raw = new Database(tdb.dbPath);
    try {
      raw.exec(
        `INSERT INTO saved_projects (principal_id, project_id, bookmarked, task_status, updated_at) VALUES ('${LEGACY_A}', 1, 0, 'not_started', ${Date.now()})`,
      );
    } finally {
      raw.close();
    }
    const before = snapshot(tdb);
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", r1.backupFile);
    assert(r2.status !== 0, `rollback with a saved_projects conflict must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    eq(keyCount(tdb, "saved_projects", "principal_id", CURRENT_A), 3, "renamed saved rows must stay on the current key after a refused rollback");
    rmSync(r1.backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-17", "symlink to app.db and via runtime dir refused; valid disposable copy works", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2327-symlink-"));
  try {
    // (a) A file named app.db holding a real disposable copy, reached
    // through a symlink with an innocent name.
    const appDb = join(dir, "app.db");
    copyFileSync(tdb.dbPath, appDb);
    const alias = join(dir, "alias.sqlite");
    symlinkSync(appDb, alias);
    assert(lstatSync(alias).isSymbolicLink(), "precondition: alias must be a symlink");
    const rAlias = runTool(alias, "inventory");
    eq(rAlias.status, 2, `symlink alias to app.db must be REFUSED with exit 2 (got ${rAlias.status}; stderr: ${rAlias.stderr})`);
    assert(rAlias.stderr.includes("symlink"), "refusal must name the symlink guard");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 2, "target DB must be untouched by the refused symlink run");

    // (b) A disposable copy reached through a symlinked directory
    // whose real path is a runtime (ts-spaces) directory.
    const runtimeDir = join(dir, "ts-spaces");
    mkdirSync(runtimeDir);
    const runtimeCopy = join(runtimeDir, "copy.sqlite");
    copyFileSync(tdb.dbPath, runtimeCopy);
    const dirLink = join(dir, "dirlink");
    symlinkSync(runtimeDir, dirLink);
    const rRuntime = runTool(join(dirLink, "copy.sqlite"), "inventory");
    eq(rRuntime.status, 2, `path via symlinked runtime dir must be REFUSED with exit 2 (got ${rRuntime.status}; stderr: ${rRuntime.stderr})`);
    assert(rRuntime.stderr.includes("ts-spaces"), "refusal must name the ts-spaces guard");

    // (c) A valid disposable copy (real file, plain name, plain dir)
    // still works: inventory exit 0 and a normal rename succeeds.
    const goodCopy = join(dir, "good-copy.sqlite");
    copyFileSync(tdb.dbPath, goodCopy);
    const rInv = runTool(goodCopy, "inventory");
    eq(rInv.status, 0, `inventory on a valid copy must exit 0 (stderr: ${rInv.stderr})`);
    assert(rInv.stdout.includes("local:owner-1: 2"), "inventory on the copy must report the legacy checks");
    const mappingFile = tmpJson([
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: symlink-test valid rename" },
    ], "symlink-good");
    const backupFile = tmpOut("backup-symlink-good");
    const rRen = runTool(goodCopy, "rename", "--mapping", mappingFile, "--backup", backupFile);
    eq(rRen.status, 0, `rename on a valid copy must exit 0 (stderr: ${rRen.stderr})`);
    rmSync(backupFile, { force: true });
  } finally {
    tdb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("H-MIGR-18", "sanity: valid non-chain rename + normal rollback still succeed", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = counts(tdb);
    const r1 = doRename(tdb, [
      { legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: sanity valid mapping" },
    ], "sanity");
    eq(r1.status, 0, `valid rename must exit 0 (stderr: ${r1.stderr})`);
    assert(existsSync(r1.backupFile), "valid rename must write a backup JSON");
    const backup = JSON.parse(readFileSync(r1.backupFile, "utf8"));
    eq(backup.version, "v2330-1", "backup must record the new tool version v2330-1");
    eq(JSON.stringify(counts(tdb)), JSON.stringify(before), "valid rename must NOT change per-table row counts");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 0, "no checks row may keep the legacy key");
    eq(keyCount(tdb, "checks", "owner_user_id", CURRENT_A), 3, "3 checks must now carry the current key");
    eq(keyCount(tdb, "saved_projects", "principal_id", "<LEGACY>"), 1, "<LEGACY> sentinel row must be untouched");
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", r1.backupFile);
    eq(r2.status, 0, `normal rollback must exit 0 (stderr: ${r2.stderr})`);
    eq(JSON.stringify(counts(tdb)), JSON.stringify(before), "normal rollback must NOT change per-table row counts");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 2, "rollback must restore 2 legacy checks");
    eq(keyCount(tdb, "checks", "owner_user_id", CURRENT_A), 1, "rollback must leave only the 1 pre-existing current check");
    eq(keyCount(tdb, "saved_projects", "principal_id", LEGACY_A), 2, "rollback must restore 2 legacy saved rows");
    eq(keyCount(tdb, "projects", "provenance_submitted_by", LEGACY_A), 1, "rollback must restore the legacy provenance row");
    rmSync(r1.backupFile, { force: true });
  } finally {
    tdb.close();
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
