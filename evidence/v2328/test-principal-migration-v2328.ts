// test-principal-migration-v2328.ts — F-065..F-068 (v2.3.28, audit V22):
// principal-key migration tool (evidence/v2326/principal-key-migration.ts,
// TOOL_VERSION v2328-1).
//
// Audit V22 found four follow-on flaws in the v2.3.27 tool:
//   F-065 High   backup/archive output paths unprotected — an output
//                could overwrite the DB or an existing backup, including
//                through a symlink or hard link.
//   F-066 Medium rollback accepted incomplete backups (missing table
//                sections silently became empty arrays) and could report
//                success without restoring all tables.
//   F-067 Medium backup/archive files were created without explicit
//                private permissions (umask-dependent, group/world
//                readable on a shared host).
//   F-068 Medium the F-064 symlink guard could be bypassed by a hard
//                link to the runtime database inode.
//
// Every test builds its OWN disposable DB and drives the REAL CLI as a
// child process, so exit codes are the tool's own. No test ever touches
// a live database; symlink/hard-link tests point at disposable copies
// only.
//
// Seed fixture (per fresh DB) — same as v2326/v2327:
//   checks:          2 x local:owner-1 (legacy A), 1 x local:u-owner-1
//                    (current A), 1 x local:owner-2 (legacy B),
//                    1 x NULL owner
//   saved_projects:  (local:owner-1, p1), (local:owner-1, p2),
//                    (<LEGACY>, p2), (local:u-owner-1, p3)
//   projects:        catalog project 1 provenance_submitted_by =
//                    local:owner-1 (legacy A)
//
//   H-MIGR-19  F-065 archive --out == db path refused exit 2, DB bytes
//              unchanged
//   H-MIGR-20  F-065 archive --out symlink to DB refused exit 2, DB
//              bytes unchanged
//   H-MIGR-21  F-065 archive --out hard link to DB refused exit 2, DB
//              bytes unchanged
//   H-MIGR-22  F-065/F-067 archive --out existing file refused exit 2,
//              existing bytes + mode untouched
//   H-MIGR-23  F-065 rename --backup == db path, archive-special --out
//              == db path, --out named app.db, --out under a ts-spaces
//              dir — all refused exit 2, DB unchanged
//   H-MIGR-24  F-066 rollback with rows={} (all sections missing)
//              refused exit 2, DB unchanged
//   H-MIGR-25  F-066 rollback with each table section missing, one at a
//              time (checks / saved_projects / projects) — all refused
//              exit 2, DB unchanged
//   H-MIGR-26  F-066 rollback with a table section not an array
//              (checks object, saved_projects string) — refused exit 2
//   H-MIGR-27  F-066 rollback with empty mapping, duplicate legacyKey,
//              malformed entry (missing basis), non-local key — all
//              refused exit 2
//   H-MIGR-28  F-066 rollback with unsupported version, wrong tool
//              name, wrong mode — all refused exit 2
//   H-MIGR-29  F-066 rollback with tampered countsBefore (rehash so
//              only the count check can fire), tampered integrity hash,
//              and all-empty rows (totalRows 0, rehashed) — all refused
//              exit 2, DB unchanged
//   H-MIGR-30  F-067 archive, archive-special, and rename backup files
//              are created mode 0600 (not group/world-readable)
//   H-MIGR-31  F-068 hard-link alias to a disposable DB refused exit 2
//              (inventory + rename); byte copy accepted (inventory
//              exit 0, rename exit 0)
//   H-MIGR-32  F-065/F-066/F-067 sanity: valid archive + valid rename +
//              valid rollback succeed; backup carries a 64-hex SHA-256
//              integrity hash + totalRows; outputs are mode 0600
//   H-MIGR-33  F-066 legacy: a v2327-1-format backup (no integrity
//              hash, no totalRows) still rolls back, with an explicit
//              UNVERIFIED-integrity warning on stderr
//
// Run:  bun evidence/v2328/test-principal-migration-v2328.ts
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
  chmodSync,
  copyFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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

function tmpJson(obj: unknown, tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `v2328-migr-${tag}-`));
  const p = join(dir, "input.json");
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  return p;
}

function tmpOut(tag: string): string {
  return join(tmpdir(), `v2328-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`);
}

function doRename(tdb: TestDb, mapping: unknown, tag: string): { status: number | null; stdout: string; stderr: string; backupFile: string } {
  const mappingFile = tmpJson(mapping, tag);
  const backupFile = tmpOut(`backup-${tag}`);
  const r = runTool(tdb.dbPath, "rename", "--mapping", mappingFile, "--backup", backupFile);
  return { ...r, backupFile };
}

/** Canonical JSON (sorted keys) — mirrors the tool's stableStringify. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

/** Recompute a mutated backup's integrity hash so the ONLY defect left is the intended one. */
function rehash(b: any): void {
  b.integrity = {
    algorithm: "sha-256",
    hash: createHash("sha256")
      .update(stableStringify({ mapping: b.mapping, rows: b.rows, countsBefore: b.countsBefore, totalRows: b.totalRows }), "utf8")
      .digest("hex"),
  };
}

/** Load a valid backup, mutate it, write it to a fresh temp file, return the path. */
function mutatedBackup(validBackupFile: string, tag: string, fn: (b: any) => void): string {
  const b = JSON.parse(readFileSync(validBackupFile, "utf8"));
  fn(b);
  const p = tmpOut(`mut-backup-${tag}`);
  writeFileSync(p, JSON.stringify(b, null, 2), "utf8");
  return p;
}

function modeOf(p: string): number {
  return statSync(p).mode & 0o777;
}

test("H-MIGR-19", "F-065 archive --out == db path refused exit 2, DB bytes unchanged", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = snapshot(tdb);
    const bytesBefore = fileHash(tdb.dbPath);
    const keysFile = tmpJson([LEGACY_A], "out-eq-db");
    const r = runTool(tdb.dbPath, "archive", "--keys", keysFile, "--out", tdb.dbPath);
    eq(r.status, 2, `archive --out == db path must be REFUSED with exit 2 (got ${r.status}; stderr: ${r.stderr})`);
    assert(r.stderr.includes("SAME file") || r.stderr.includes("same file"), "refusal must name the same-file (device/inode) collision");
    eq(snapshot(tdb), before, "refused archive must NOT change the DB");
    eq(fileHash(tdb.dbPath), bytesBefore, "the database file bytes must be untouched");
  } finally {
    tdb.close();
  }
});

test("H-MIGR-20", "F-065 archive --out symlink to DB refused exit 2, DB bytes unchanged", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2328-symlink-out-"));
  try {
    const before = snapshot(tdb);
    const bytesBefore = fileHash(tdb.dbPath);
    const link = join(dir, "out.json");
    symlinkSync(tdb.dbPath, link);
    assert(lstatSync(link).isSymbolicLink(), "precondition: output must be a symlink");
    const keysFile = tmpJson([LEGACY_A], "out-symlink");
    const r = runTool(tdb.dbPath, "archive", "--keys", keysFile, "--out", link);
    eq(r.status, 2, `archive --out symlink to DB must be REFUSED with exit 2 (got ${r.status}; stderr: ${r.stderr})`);
    assert(r.stderr.includes("symlink"), "refusal must name the symlink guard");
    eq(snapshot(tdb), before, "refused archive must NOT change the DB");
    eq(fileHash(tdb.dbPath), bytesBefore, "the database file bytes must be untouched");
    assert(lstatSync(link).isSymbolicLink(), "the symlink itself must still be a symlink (not replaced by a file)");
  } finally {
    tdb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("H-MIGR-21", "F-065 archive --out hard link to DB refused exit 2, DB bytes unchanged", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2328-hardlink-out-"));
  try {
    const before = snapshot(tdb);
    const bytesBefore = fileHash(tdb.dbPath);
    const hard = join(dir, "out.json");
    linkSync(tdb.dbPath, hard);
    eq(statSync(hard).nlink, 2, "precondition: output must be a hard link (nlink 2)");
    const keysFile = tmpJson([LEGACY_A], "out-hardlink");
    const r = runTool(tdb.dbPath, "archive", "--keys", keysFile, "--out", hard);
    eq(r.status, 2, `archive --out hard link to DB must be REFUSED with exit 2 (got ${r.status}; stderr: ${r.stderr})`);
    // Guard precedence (documented): creating the hard link raises the
    // INPUT db's nlink to 2, so the F-068 input guard fires before the
    // F-065 output identity check — either way the run is refused with
    // exit 2 and nothing is written. The F-065 device/inode branch
    // stays as defense-in-depth (e.g. link created after the guard).
    assert(
      r.stderr.includes("SAME file") || r.stderr.includes("same file") || r.stderr.includes("hard link"),
      "refusal must name the same-file collision or the hard-link guard",
    );
    eq(snapshot(tdb), before, "refused archive must NOT change the DB");
    eq(fileHash(tdb.dbPath), bytesBefore, "the database file bytes must be untouched");
    eq(fileHash(hard), bytesBefore, "the hard-linked file must still hold the same bytes");
  } finally {
    tdb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("H-MIGR-22", "F-065/F-067 archive --out existing file refused exit 2, bytes + mode untouched", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2328-existing-out-"));
  try {
    const before = snapshot(tdb);
    const outFile = join(dir, "previous-backup.json");
    const sentinel = JSON.stringify({ previous: "backup-do-not-touch", rows: [1, 2, 3] }, null, 2) + "\n";
    writeFileSync(outFile, sentinel, "utf8");
    chmodSync(outFile, 0o644); // explicit chmod: writeFileSync mode is masked by umask
    eq(modeOf(outFile), 0o644, "precondition: existing file mode 0644");
    const keysFile = tmpJson([LEGACY_A], "out-existing");
    const r = runTool(tdb.dbPath, "archive", "--keys", keysFile, "--out", outFile);
    eq(r.status, 2, `archive --out existing file must be REFUSED with exit 2 (got ${r.status}; stderr: ${r.stderr})`);
    assert(r.stderr.includes("overwrite") || r.stderr.includes("existing"), "refusal must name the no-overwrite rule");
    eq(readFileSync(outFile, "utf8"), sentinel, "the existing file's bytes must be untouched");
    eq(modeOf(outFile), 0o644, "the existing file's mode must be untouched");
    eq(snapshot(tdb), before, "refused archive must NOT change the DB");
  } finally {
    tdb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("H-MIGR-23", "F-065 rename --backup == db, archive-special --out == db, app.db name, ts-spaces dir — all refused", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2328-forbidden-out-"));
  try {
    const before = snapshot(tdb);
    const bytesBefore = fileHash(tdb.dbPath);
    // (a) rename --backup == db path.
    const mappingFile = tmpJson(
      [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: forbidden-output case" }],
      "forbidden-rename",
    );
    const rA = runTool(tdb.dbPath, "rename", "--mapping", mappingFile, "--backup", tdb.dbPath);
    eq(rA.status, 2, `rename --backup == db path must be REFUSED with exit 2 (got ${rA.status}; stderr: ${rA.stderr})`);
    // (b) archive-special --out == db path.
    const rB = runTool(tdb.dbPath, "archive-special", "--out", tdb.dbPath);
    eq(rB.status, 2, `archive-special --out == db path must be REFUSED with exit 2 (got ${rB.status}; stderr: ${rB.stderr})`);
    // (c) archive --out named app.db.
    const keysFile = tmpJson([LEGACY_A], "forbidden-appdb");
    const rC = runTool(tdb.dbPath, "archive", "--keys", keysFile, "--out", join(dir, "app.db"));
    eq(rC.status, 2, `archive --out named app.db must be REFUSED with exit 2 (got ${rC.status}; stderr: ${rC.stderr})`);
    assert(!existsSync(join(dir, "app.db")), "refused app.db output must NOT be created");
    // (d) archive --out under a ts-spaces (runtime) directory.
    const runtimeDir = join(dir, "ts-spaces");
    mkdirSync(runtimeDir);
    const rD = runTool(tdb.dbPath, "archive", "--keys", keysFile, "--out", join(runtimeDir, "archive.json"));
    eq(rD.status, 2, `archive --out under ts-spaces must be REFUSED with exit 2 (got ${rD.status}; stderr: ${rD.stderr})`);
    assert(!existsSync(join(runtimeDir, "archive.json")), "refused runtime-dir output must NOT be created");
    eq(snapshot(tdb), before, "all refused outputs must NOT change the DB");
    eq(fileHash(tdb.dbPath), bytesBefore, "the database file bytes must be untouched");
  } finally {
    tdb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("H-MIGR-24", "F-066 rollback with rows={} refused exit 2, DB unchanged", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: rows-empty case" }], "rb-rows-empty");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    const before = snapshot(tdb);
    const bad = mutatedBackup(r1.backupFile, "rows-empty", (b) => {
      b.rows = {};
    });
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", bad);
    assert(r2.status !== 0, `rollback with rows={} must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
    assert(r2.stderr.includes("missing"), "refusal must name the missing section");
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    rmSync(r1.backupFile, { force: true });
    rmSync(bad, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-25", "F-066 rollback with each table section missing, one at a time — all refused", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: section-missing case" }], "rb-sec-missing");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    const before = snapshot(tdb);
    for (const section of ["checks", "saved_projects", "projects"] as const) {
      const bad = mutatedBackup(r1.backupFile, `sec-${section}`, (b) => {
        delete b.rows[section];
      });
      const r2 = runTool(tdb.dbPath, "rollback", "--backup", bad);
      assert(r2.status !== 0, `rollback with rows.${section} missing must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
      assert(r2.stderr.includes(section) && r2.stderr.includes("missing"), `refusal for missing ${section} must name the section`);
      eq(snapshot(tdb), before, `failed rollback (missing ${section}) must NOT change the DB`);
      rmSync(bad, { force: true });
    }
    rmSync(r1.backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-26", "F-066 rollback with a table section not an array — refused", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: section-type case" }], "rb-sec-type");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    const before = snapshot(tdb);
    const badA = mutatedBackup(r1.backupFile, "sec-obj", (b) => {
      b.rows.checks = { not: "an-array" };
    });
    const rA = runTool(tdb.dbPath, "rollback", "--backup", badA);
    assert(rA.status !== 0, `rollback with rows.checks as object must FAIL (got ${rA.status})`);
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    const badB = mutatedBackup(r1.backupFile, "sec-str", (b) => {
      b.rows.saved_projects = "not-an-array";
    });
    const rB = runTool(tdb.dbPath, "rollback", "--backup", badB);
    assert(rB.status !== 0, `rollback with rows.saved_projects as string must FAIL (got ${rB.status})`);
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    rmSync(r1.backupFile, { force: true });
    rmSync(badA, { force: true });
    rmSync(badB, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-27", "F-066 rollback with empty/duplicate/malformed mapping — all refused", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: mapping-defect case" }], "rb-map-defect");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    const before = snapshot(tdb);
    const cases: [string, (b: any) => void, string][] = [
      ["empty-mapping", (b) => { b.mapping = []; }, "empty mapping"],
      ["dup-mapping", (b) => { b.mapping = [b.mapping[0], { ...b.mapping[0] }]; }, "duplicate mapping"],
      ["no-basis", (b) => { delete b.mapping[0].basis; }, "mapping entry without basis"],
      ["non-local", (b) => { b.mapping[0].currentKey = "cloud:u-owner-1"; }, "non-local mapping key"],
    ];
    for (const [tag, fn, label] of cases) {
      const bad = mutatedBackup(r1.backupFile, tag, fn);
      const r2 = runTool(tdb.dbPath, "rollback", "--backup", bad);
      assert(r2.status !== 0, `rollback with ${label} must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
      eq(snapshot(tdb), before, `failed rollback (${label}) must NOT change the DB`);
      rmSync(bad, { force: true });
    }
    rmSync(r1.backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-28", "F-066 rollback with unsupported version, wrong tool, wrong mode — all refused", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: version-defect case" }], "rb-ver-defect");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    const before = snapshot(tdb);
    const cases: [string, (b: any) => void, string][] = [
      ["bad-version", (b) => { b.version = "v9999-9"; }, "unsupported version"],
      ["bad-tool", (b) => { b.tool = "other-tool"; }, "wrong tool name"],
      ["bad-mode", (b) => { b.mode = "archive"; }, "wrong mode"],
    ];
    for (const [tag, fn, label] of cases) {
      const bad = mutatedBackup(r1.backupFile, tag, fn);
      const r2 = runTool(tdb.dbPath, "rollback", "--backup", bad);
      assert(r2.status !== 0, `rollback with ${label} must FAIL with nonzero exit (got ${r2.status}; stdout: ${r2.stdout})`);
      eq(snapshot(tdb), before, `failed rollback (${label}) must NOT change the DB`);
      rmSync(bad, { force: true });
    }
    rmSync(r1.backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-29", "F-066 rollback with tampered counts, tampered hash, all-empty rows — all refused", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: integrity-defect case" }], "rb-integrity");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    const before = snapshot(tdb);
    // (a) countsBefore tampered, hash recomputed so ONLY the DB count
    // consistency check can fire.
    const badCounts = mutatedBackup(r1.backupFile, "counts", (b) => {
      b.countsBefore.checks += 1;
      rehash(b);
    });
    const rA = runTool(tdb.dbPath, "rollback", "--backup", badCounts);
    assert(rA.status !== 0, `rollback with tampered countsBefore must FAIL (got ${rA.status})`);
    assert(rA.stderr.includes("count changed"), "refusal must name the count mismatch (not the hash)");
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    // (b) integrity hash tampered (zeros), content untouched.
    const badHash = mutatedBackup(r1.backupFile, "hash", (b) => {
      b.integrity.hash = "0".repeat(64);
    });
    const rB = runTool(tdb.dbPath, "rollback", "--backup", badHash);
    assert(rB.status !== 0, `rollback with tampered integrity hash must FAIL (got ${rB.status})`);
    assert(rB.stderr.includes("integrity hash mismatch"), "refusal must name the integrity hash mismatch");
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    // (c) all row sections emptied + totalRows 0 + hash recomputed, so
    // ONLY the zero-rows refusal can fire.
    const badEmpty = mutatedBackup(r1.backupFile, "empty-rows", (b) => {
      b.rows.checks = [];
      b.rows.saved_projects = [];
      b.rows.projects = [];
      b.totalRows = 0;
      rehash(b);
    });
    const rC = runTool(tdb.dbPath, "rollback", "--backup", badEmpty);
    assert(rC.status !== 0, `rollback with all-empty rows must FAIL (got ${rC.status})`);
    assert(rC.stderr.includes("zero rows"), "refusal must name the zero-rows rule");
    eq(snapshot(tdb), before, "failed rollback must NOT change the DB");
    rmSync(r1.backupFile, { force: true });
    rmSync(badCounts, { force: true });
    rmSync(badHash, { force: true });
    rmSync(badEmpty, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-30", "F-067 archive, archive-special, rename backup files are mode 0600", async () => {
  const tdb = seedLegacyDb();
  try {
    const keysFile = tmpJson([LEGACY_A, LEGACY_B], "mode-archive");
    const archiveOut = tmpOut("mode-archive");
    const rA = runTool(tdb.dbPath, "archive", "--keys", keysFile, "--out", archiveOut);
    eq(rA.status, 0, `archive must exit 0 (stderr: ${rA.stderr})`);
    eq(modeOf(archiveOut), 0o600, "archive output must be mode 0600");
    assert((modeOf(archiveOut) & 0o077) === 0, "archive output must not be group/world-readable");
    const specialOut = tmpOut("mode-special");
    const rB = runTool(tdb.dbPath, "archive-special", "--out", specialOut);
    eq(rB.status, 0, `archive-special must exit 0 (stderr: ${rB.stderr})`);
    eq(modeOf(specialOut), 0o600, "archive-special output must be mode 0600");
    assert((modeOf(specialOut) & 0o077) === 0, "archive-special output must not be group/world-readable");
    const rC = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: mode-backup case" }], "mode-backup");
    eq(rC.status, 0, `rename must exit 0 (stderr: ${rC.stderr})`);
    eq(modeOf(rC.backupFile), 0o600, "rename backup must be mode 0600");
    assert((modeOf(rC.backupFile) & 0o077) === 0, "rename backup must not be group/world-readable");
    const backup = JSON.parse(readFileSync(rC.backupFile, "utf8"));
    assert(typeof backup.retention === "string" && backup.retention.length > 0, "backup must record the retention/ownership note");
    assert(typeof backup.integrity?.hash === "string" && /^[0-9a-f]{64}$/.test(backup.integrity.hash), "backup must carry a 64-hex SHA-256 integrity hash");
    rmSync(archiveOut, { force: true });
    rmSync(specialOut, { force: true });
    rmSync(rC.backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-31", "F-068 hard-link alias to DB refused; byte copy accepted", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2328-hardlink-db-"));
  try {
    // A disposable "runtime-like" DB: real file, innocent name, NOT
    // app.db, NOT under a ts-spaces dir — so ONLY the hard-link guard
    // can refuse its alias.
    const runtimeLike = join(dir, "runtime.sqlite");
    copyFileSync(tdb.dbPath, runtimeLike);
    eq(statSync(runtimeLike).nlink, 1, "precondition: runtime-like copy has nlink 1");
    const alias = join(dir, "alias.sqlite");
    linkSync(runtimeLike, alias);
    eq(statSync(alias).nlink, 2, "precondition: alias is a hard link (nlink 2)");
    const rAlias = runTool(alias, "inventory");
    eq(rAlias.status, 2, `hard-link alias to a DB must be REFUSED with exit 2 (got ${rAlias.status}; stderr: ${rAlias.stderr})`);
    assert(rAlias.stderr.includes("hard link"), "refusal must name the hard-link guard");
    const mappingFile = tmpJson(
      [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: hard-link rename case" }],
      "hardlink-rename",
    );
    const rAliasRen = runTool(alias, "rename", "--mapping", mappingFile, "--backup", tmpOut("hardlink-rename-backup"));
    eq(rAliasRen.status, 2, `rename via a hard-link alias must be REFUSED with exit 2 (got ${rAliasRen.status})`);
    // A real byte copy of the SAME bytes is accepted.
    const goodCopy = join(dir, "good-copy.sqlite");
    copyFileSync(runtimeLike, goodCopy);
    eq(statSync(goodCopy).nlink, 1, "precondition: byte copy has nlink 1");
    const rInv = runTool(goodCopy, "inventory");
    eq(rInv.status, 0, `inventory on a byte copy must exit 0 (stderr: ${rInv.stderr})`);
    assert(rInv.stdout.includes("local:owner-1: 2"), "inventory on the copy must report the legacy checks");
    const backupFile = tmpOut("hardlink-good-backup");
    const rRen = runTool(goodCopy, "rename", "--mapping", mappingFile, "--backup", backupFile);
    eq(rRen.status, 0, `rename on a byte copy must exit 0 (stderr: ${rRen.stderr})`);
    rmSync(backupFile, { force: true });
  } finally {
    tdb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("H-MIGR-32", "sanity: valid archive + rename + rollback succeed with integrity hash and mode 0600", async () => {
  const tdb = seedLegacyDb();
  try {
    const before = counts(tdb);
    const keysFile = tmpJson([LEGACY_A], "sanity-v2328");
    const archiveOut = tmpOut("sanity-archive");
    const rA = runTool(tdb.dbPath, "archive", "--keys", keysFile, "--out", archiveOut);
    eq(rA.status, 0, `valid archive must exit 0 (stderr: ${rA.stderr})`);
    eq(modeOf(archiveOut), 0o600, "archive output must be mode 0600");
    const doc = JSON.parse(readFileSync(archiveOut, "utf8"));
    eq(doc.mode, "archive", "archive JSON must record mode=archive");
    eq(doc.totalRows, 5, "archive total must be 5 (2 checks + 2 saved + 1 provenance for local:owner-1)");
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: v2328 sanity valid mapping" }], "sanity-v2328");
    eq(r1.status, 0, `valid rename must exit 0 (stderr: ${r1.stderr})`);
    assert(existsSync(r1.backupFile), "valid rename must write a backup JSON");
    const backup = JSON.parse(readFileSync(r1.backupFile, "utf8"));
    eq(backup.version, "v2328-1", "backup must record the new tool version v2328-1");
    eq(backup.integrity.algorithm, "sha-256", "backup must record integrity algorithm sha-256");
    assert(/^[0-9a-f]{64}$/.test(backup.integrity.hash), "backup integrity hash must be 64 hex chars");
    eq(backup.totalRows, 5, "backup totalRows must be 5 (2 checks + 2 saved + 1 provenance)");
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
    rmSync(archiveOut, { force: true });
    rmSync(r1.backupFile, { force: true });
  } finally {
    tdb.close();
  }
});

test("H-MIGR-33", "F-066 legacy: v2327-1-format backup (no hash) still rolls back, with UNVERIFIED warning", async () => {
  const tdb = seedLegacyDb();
  try {
    const r1 = doRename(tdb, [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: legacy backup case" }], "legacy-backup");
    eq(r1.status, 0, `rename must exit 0 (stderr: ${r1.stderr})`);
    // Downgrade the fresh backup to the v2327-1 format: drop the
    // integrity hash and totalRows, set the old version.
    const legacyFile = tmpOut("legacy-backup-v2327");
    const b = JSON.parse(readFileSync(r1.backupFile, "utf8"));
    delete b.integrity;
    delete b.totalRows;
    b.version = "v2327-1";
    writeFileSync(legacyFile, JSON.stringify(b, null, 2), "utf8");
    const before = counts(tdb);
    const r2 = runTool(tdb.dbPath, "rollback", "--backup", legacyFile);
    eq(r2.status, 0, `rollback of a structurally valid v2327-1 backup must exit 0 (stderr: ${r2.stderr})`);
    assert(r2.stderr.includes("WARNING") && r2.stderr.includes("UNVERIFIED"), "legacy rollback must warn that integrity is UNVERIFIED");
    eq(JSON.stringify(counts(tdb)), JSON.stringify(before), "legacy rollback must NOT change per-table row counts");
    eq(keyCount(tdb, "checks", "owner_user_id", LEGACY_A), 2, "legacy rollback must restore 2 legacy checks");
    rmSync(r1.backupFile, { force: true });
    rmSync(legacyFile, { force: true });
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
