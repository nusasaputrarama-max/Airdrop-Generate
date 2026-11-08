// test-principal-migration-v2329.ts — F-069, F-070, U-118 (v2.3.29, audit V23):
// principal-key migration tool (evidence/v2326/principal-key-migration.ts,
// TOOL_VERSION v2329-1).
//
// Audit V23 found two follow-on flaws in the v2.3.28 tool:
//   F-069 Medium backup validation errors printed complete row objects
//                (JSON.stringify(row)) to stderr — URLs, verdicts,
//                scores, principal IDs and other stored history could
//                leak into captured logs.
//   F-070 Medium writePrivateJsonAtomic() fsynced the file but not its
//                parent directory — the link(2) directory entry was
//                not durable before the SQLite transaction started.
//   U-118 OPEN   guard→open TOCTOU on the DB path; audit asked whether
//                Bun SQLite can verify the opened file's identity, and
//                if not, to enforce/document a private allowlisted
//                working directory.
//
// Every test builds its OWN disposable DB and drives the REAL CLI as a
// child process, so exit codes are the tool's own. No test ever touches
// a live database.
//
// Seed fixture (per fresh DB) — same as v2326/v2327/v2328:
//   checks:          2 x local:owner-1 (legacy A), 1 x local:u-owner-1
//                    (current A), 1 x local:owner-2 (legacy B),
//                    1 x NULL owner
//   saved_projects:  (local:owner-1, p1), (local:owner-1, p2),
//                    (<LEGACY>, p2), (local:u-owner-1, p3)
//   projects:        catalog project 1 provenance_submitted_by =
//                    local:owner-1 (legacy A)
//
//   H-MIGR-34  F-069 malformed checks row (sentinel URL/metadata/owner,
//              missing id) refused; stderr names table+field, contains
//              NO sentinel, DB unchanged
//   H-MIGR-35  F-069 malformed saved_projects row (sentinel principal,
//              missing project_id) refused; same assertions
//   H-MIGR-36  F-069 malformed projects row (sentinel provenance,
//              missing id) refused; same assertions
//   H-MIGR-37  F-069 chained mapping with sentinel principal keys +
//              sentinel tool/version values refused; stderr contains NO
//              sentinel value
//   H-MIGR-38  F-069 rollback pre-validation with a sentinel current
//              key refused; stderr names row index + field, contains NO
//              sentinel principal
//   H-MIGR-39  F-070 syscall-order evidence (PRINCIPAL_MIGRATION_
//              FS_TRACE): write → fsync file → link → unlink temp →
//              open dir → fsync dir → read-back, before the transaction.
//              Labelled syscall-order evidence, NOT a real crash test.
//   H-MIGR-40  U-118 allowlisted working directory enforced: DB outside
//              PRINCIPAL_MIGRATION_ALLOWED_DIR refused exit 2; DB
//              inside allowed
//   H-MIGR-41  U-118 with no allowlist configured: tool warns explicitly
//              (residual OPEN) and still runs
//
// Run:  bun evidence/v2329/test-principal-migration-v2329.ts
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import {
  countRows,
  makeMigratedDb,
  seedChecks,
  type TestDb,
} from "../v2323/harness-helpers";
import { Database } from "bun:sqlite";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
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

/** SHA-256 of a file's bytes — proves a target file was not touched. */
function fileHash(p: string): string {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

function runTool(dbPath: string, ...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync("bun", [TOOL, dbPath, ...args], { encoding: "utf8" });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function runToolEnv(
  dbPath: string,
  envExtra: Record<string, string | undefined>,
  ...args: string[]
): { status: number | null; stdout: string; stderr: string } {
  const env: Record<string, string | undefined> = { ...process.env, ...envExtra };
  for (const k of Object.keys(envExtra)) if (envExtra[k] === undefined) delete env[k];
  const r = spawnSync("bun", [TOOL, dbPath, ...args], { encoding: "utf8", env: env as Record<string, string> });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function tmpJson(obj: unknown, tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `v2329-migr-${tag}-`));
  const p = join(dir, "input.json");
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  return p;
}

function tmpOut(tag: string): string {
  return join(tmpdir(), `v2329-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`);
}

function doRename(tdb: TestDb, mapping: unknown, tag: string): { status: number | null; stdout: string; stderr: string; backupFile: string } {
  const mappingFile = tmpJson(mapping, tag);
  const backupFile = tmpOut(`backup-${tag}`);
  const r = runTool(tdb.dbPath, "rename", "--mapping", mappingFile, "--backup", backupFile);
  return { ...r, backupFile };
}

/** Load a valid backup, mutate it, write it to a fresh temp file, return the path. */
function mutatedBackup(validBackupFile: string, tag: string, fn: (b: any) => void): string {
  const b = JSON.parse(readFileSync(validBackupFile, "utf8"));
  fn(b);
  const p = tmpOut(`mut-backup-${tag}`);
  writeFileSync(p, JSON.stringify(b, null, 2), "utf8");
  return p;
}

/** Assert none of the sentinel strings appear in combined tool output. */
function assertNoSentinels(output: string, sentinels: string[], where: string): void {
  for (const s of sentinels) {
    assert(!output.includes(s), `${where}: tool output must NOT contain sentinel ${JSON.stringify(s)} (F-069 log disclosure)`);
  }
}

test("H-MIGR-34", "F-069 malformed checks row (sentinel URL/metadata/owner, missing id) refused; stderr has table+field, no sentinel", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: F-069 checks case" }], "f069-checks");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    const before = snapshot(tdb);
    const bytesBefore = fileHash(tdb.dbPath);
    const sentinels = [
      "SENTINEL-F069-CHECK-URL-7f3a9c",
      "SENTINEL-F069-CHECK-DOMAIN-7f3a9c",
      "SENTINEL-F069-CHECK-OWNER-7f3a9c",
      "SENTINEL-F069-CHECK-META-7f3a9c",
    ];
    const bad = mutatedBackup(r1.backupFile, "f069-checks", (b) => {
      // Row missing `id` but carrying sentinel values in every other
      // field: the OLD code printed the whole row via JSON.stringify.
      b.rows.checks[0] = {
        url: `https://${sentinels[0]}.example/`,
        domain: `${sentinels[1]}.example`,
        verdict: "bahaya",
        score: 99,
        owner_user_id: `local:${sentinels[2]}`,
        metadata: sentinels[3],
      };
    });
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", bad);
    assert(r2.status !== 0, `rollback with a malformed checks row must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
    assert(r2.stderr.includes("checks"), "refusal must name the checks table");
    assert(r2.stderr.includes('"id"') && r2.stderr.includes("integer"), "refusal must name the failed field (id) and expected type (integer)");
    assertNoSentinels(r2.stdout + r2.stderr, sentinels, "H-MIGR-34");
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    eq(fileHash(tdb.dbPath), bytesBefore, "the database file bytes must be untouched");
    rmSync(r1.backupFile, { force: true });
    rmSync(bad, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-35", "F-069 malformed saved_projects row (sentinel principal, missing project_id) refused; stderr has table+field, no sentinel", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: F-069 saved case" }], "f069-saved");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    const before = snapshot(tdb);
    const sentinels = ["SENTINEL-F069-SAVED-PRINCIPAL-4d8b21", "SENTINEL-F069-SAVED-NOTE-4d8b21"];
    const bad = mutatedBackup(r1.backupFile, "f069-saved", (b) => {
      b.rows.saved_projects[0] = {
        principal_id: `local:${sentinels[0]}`,
        note: sentinels[1],
      };
    });
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", bad);
    assert(r2.status !== 0, `rollback with a malformed saved_projects row must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
    assert(r2.stderr.includes("saved_projects"), "refusal must name the saved_projects table");
    assert(r2.stderr.includes('"project_id"') && r2.stderr.includes("integer"), "refusal must name the failed field (project_id) and expected type (integer)");
    assertNoSentinels(r2.stdout + r2.stderr, sentinels, "H-MIGR-35");
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    rmSync(r1.backupFile, { force: true });
    rmSync(bad, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-36", "F-069 malformed projects row (sentinel provenance, missing id) refused; stderr has table+field, no sentinel", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: F-069 projects case" }], "f069-projects");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    const before = snapshot(tdb);
    const sentinels = ["SENTINEL-F069-PROJECT-PROV-9c1e77", "SENTINEL-F069-PROJECT-TITLE-9c1e77"];
    const bad = mutatedBackup(r1.backupFile, "f069-projects", (b) => {
      b.rows.projects[0] = {
        provenance_submitted_by: `local:${sentinels[0]}`,
        title: sentinels[1],
      };
    });
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", bad);
    assert(r2.status !== 0, `rollback with a malformed projects row must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
    assert(r2.stderr.includes("projects"), "refusal must name the projects table");
    assert(r2.stderr.includes('"id"') && r2.stderr.includes("integer"), "refusal must name the failed field (id) and expected type (integer)");
    assertNoSentinels(r2.stdout + r2.stderr, sentinels, "H-MIGR-36");
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    rmSync(r1.backupFile, { force: true });
    rmSync(bad, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-37", "F-069 chained mapping with sentinel principals + sentinel tool/version refused; stderr contains NO sentinel value", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = snapshot(tdb);
    // (a) Chained mapping whose keys are sentinels: the OLD code
    // printed the overlapping keys in the refusal.
    const sentinels = [
      "SENTINEL-F069-CHAIN-A-2a6f08",
      "SENTINEL-F069-CHAIN-B-2a6f08",
      "SENTINEL-F069-CHAIN-C-2a6f08",
    ];
    const mappingFile = tmpJson(
      [
        { legacyKey: `local:${sentinels[0]}`, currentKey: `local:${sentinels[1]}`, basis: "harness fixture: F-069 chain case" },
        { legacyKey: `local:${sentinels[1]}`, currentKey: `local:${sentinels[2]}`, basis: "harness fixture: F-069 chain case" },
      ],
      "f069-chain",
    );
    const rA = runTool(tdb.dbPath, "rename", "--mapping", mappingFile, "--backup", tmpOut("f069-chain-backup"));
    eq(rA.status, 2, `chained mapping must be REFUSED with exit 2 (got ${rA.status}; stderr: ${rA.stderr})`);
    assert(rA.stderr.includes("chained/cyclic"), "refusal must name the chained/cyclic rule");
    assertNoSentinels(rA.stdout + rA.stderr, sentinels, "H-MIGR-37(a)");
    eq(snapshot(tdb), before, "refused rename must NOT change the DB");
    // (b)+(c) Sentinel tool name and version in a mutated backup: the
    // OLD code echoed the received value in the refusal.
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: F-069 header case" }], "f069-header");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    // The rename above legitimately changed the DB; failed rollbacks
    // below must not change it FURTHER.
    const afterRename = snapshot(tdb);
    const headerSentinels = ["SENTINEL-F069-TOOL-5e19d3", "SENTINEL-F069-VERSION-5e19d3"];
    const badTool = mutatedBackup(r1.backupFile, "f069-tool", (b) => {
      b.tool = headerSentinels[0];
    });
    const rB = runTool(tdb.dbPath, "rollback", "--backup", badTool);
    assert(rB.status !== 0, `rollback with a sentinel tool name must FAIL (got ${rB.status})`);
    assertNoSentinels(rB.stdout + rB.stderr, [headerSentinels[0]], "H-MIGR-37(b)");
    const badVersion = mutatedBackup(r1.backupFile, "f069-version", (b) => {
      b.version = headerSentinels[1];
    });
    const rC = runTool(tdb.dbPath, "rollback", "--backup", badVersion);
    assert(rC.status !== 0, `rollback with a sentinel version must FAIL (got ${rC.status})`);
    assertNoSentinels(rC.stdout + rC.stderr, [headerSentinels[1]], "H-MIGR-37(c)");
    eq(snapshot(tdb), afterRename, "failed rollbacks must NOT change the DB");
    rmSync(r1.backupFile, { force: true });
    rmSync(badTool, { force: true });
    rmSync(badVersion, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-38", "F-069 rollback pre-validation with a sentinel current key refused; stderr names row index + field, no sentinel principal", async () => {
  const tdb = seedLegacyDb();
  try {
    const sentinelCurrent = "local:SENTINEL-F069-CURRENT-6b42af";
    const r1 = doRename(
      tdb,
      [{ legacyKey: LEGACY_A, currentKey: sentinelCurrent, basis: "harness fixture: F-069 prevalidation case" }],
      "f069-preval",
    );
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    // Break the post-rename state of one BACKUP checks row directly in
    // the DB, so rollback pre-validation fails on that row. The OLD
    // code printed the expected current key (the sentinel) in the
    // error; the new code must name only row index + field.
    const backup = JSON.parse(readFileSync(r1.backupFile, "utf8"));
    const victimId = backup.rows.checks[0].id;
    const raw = new Database(tdb.dbPath);
    try {
      raw.exec(`UPDATE checks SET owner_user_id = 'local:tampered-x' WHERE id = ${victimId}`);
    } finally {
      raw.close();
    }
    const before = snapshot(tdb);
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", r1.backupFile);
    assert(r2.status !== 0, `rollback with broken post-rename state must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
    assert(/checks row #\d+/.test(r2.stderr), "refusal must name the failing checks row by index");
    assert(r2.stderr.includes("owner_user_id"), "refusal must name the failed field (owner_user_id)");
    assertNoSentinels(r2.stdout + r2.stderr, [sentinelCurrent, "SENTINEL-F069-CURRENT-6b42af"], "H-MIGR-38");
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    rmSync(r1.backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-39", "F-070 syscall-order evidence: fsync parent dir happens after link+unlink and before the DB transaction", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2329-fsync-order-"));
  try {
    const traceFile = join(dir, "fs-trace.txt");
    const mappingFile = tmpJson(
      [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: F-070 order case" }],
      "f070-order",
    );
    const backupFile = join(dir, "backup.json");
    const r = runToolEnv(
      tdb.dbPath,
      { PRINCIPAL_MIGRATION_FS_TRACE: traceFile },
      "rename",
      "--mapping",
      mappingFile,
      "--backup",
      backupFile,
    );
    eq(r.status, 0, `rename with fs tracing must exit 0 (stderr: ${r.stderr})`);
    assert(existsSync(traceFile), "the fs trace file must exist");
    const lines = readFileSync(traceFile, "utf8").trim().split("\n");
    const ops = lines.map((l) => l.split(" ")[0]);
    // Required order: write → fsync file → close file → link →
    // unlink temp → open dir → fsync dir → close dir → stat →
    // read-back. The DB transaction (BEGIN IMMEDIATE) starts only
    // after writePrivateJsonAtomic() returns, i.e. after fsync-dir
    // in program order — so the trace proves the directory entry is
    // durable before any DB write. This is syscall-order evidence,
    // NOT a real power-loss/crash test.
    const expected = ["open-tmp", "write", "fsync-file", "close-file", "link", "unlink-tmp", "open-dir", "fsync-dir", "close-dir", "stat", "read-back"];
    let cursor = -1;
    for (const op of expected) {
      const idx = ops.indexOf(op, cursor + 1);
      assert(idx > cursor, `fs trace must contain ${op} after the previous step (trace: ${ops.join(",")})`);
      cursor = idx;
    }
    const fsyncDirLine = lines.find((l) => l.startsWith("fsync-dir "));
    assert(fsyncDirLine !== undefined, "fs trace must contain an fsync-dir step");
    eq(fsyncDirLine.split(" ").slice(1).join(" "), dir, "fsync-dir must target the backup's parent directory");
    const openDirLine = lines.find((l) => l.startsWith("open-dir "));
    eq(openDirLine?.split(" ").slice(1).join(" "), dir, "open-dir must target the backup's parent directory");
    // The backup the transaction protected must exist and verify.
    assert(existsSync(backupFile), "the rename backup must exist");
    eq(statSync(backupFile).mode & 0o777, 0o600, "the rename backup must be mode 0600");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 0, "rename must have applied (no legacy checks left)");
    rmSync(backupFile, { force: true });
  } finally {
    tdb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("H-MIGR-40", "U-118 allowlisted working directory enforced: DB outside refused exit 2, DB inside allowed", async () => {
  const tdb = seedLegacyDb();
  const otherDir = mkdtempSync(join(tmpdir(), "v2329-allowlist-other-"));
  try {
    // (a) DB is NOT under the allowlisted directory → refuse.
    const rA = runToolEnv(tdb.dbPath, { PRINCIPAL_MIGRATION_ALLOWED_DIR: otherDir }, "inventory");
    eq(rA.status, 2, `inventory outside the allowlist must be REFUSED with exit 2 (got ${rA.status}; stderr: ${rA.stderr})`);
    assert(rA.stderr.includes("PRINCIPAL_MIGRATION_ALLOWED_DIR"), "refusal must name the allowlist");
    // (b) DB IS under the allowlisted directory → allowed.
    const rB = runToolEnv(tdb.dbPath, { PRINCIPAL_MIGRATION_ALLOWED_DIR: dirname(tdb.dbPath) }, "inventory");
    eq(rB.status, 0, `inventory inside the allowlist must exit 0 (stderr: ${rB.stderr})`);
    assert(rB.stdout.includes("local:owner-1: 2"), "inventory inside the allowlist must report the legacy checks");
    // (c) With the allowlist set, the U-118 unset-warning must NOT appear.
    assert(!rB.stderr.includes("PRINCIPAL_MIGRATION_ALLOWED_DIR is not set"), "no unset-allowlist warning when the allowlist is configured");
  } finally {
    tdb.close();
    rmSync(otherDir, { recursive: true, force: true });
  }
});

test("H-MIGR-41", "U-118 with no allowlist configured: tool warns explicitly (residual OPEN) and still runs", async () => {
  const tdb = seedLegacyDb();
  try {
    const r = runToolEnv(tdb.dbPath, { PRINCIPAL_MIGRATION_ALLOWED_DIR: undefined }, "inventory");
    eq(r.status, 0, `inventory without an allowlist must exit 0 (stderr: ${r.stderr})`);
    assert(r.stderr.includes("WARNING") && r.stderr.includes("U-118"), "tool must warn explicitly that the U-118 residual is open when no allowlist is configured");
    assert(r.stderr.includes("PRINCIPAL_MIGRATION_ALLOWED_DIR is not set"), "warning must name the unset allowlist variable");
    assert(r.stdout.includes("local:owner-1: 2"), "inventory must still report the legacy checks");
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
