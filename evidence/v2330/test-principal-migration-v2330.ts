// test-principal-migration-v2330.ts — U-120, U-118 reassessment
// (v2.3.30, audit V24): principal-key migration tool
// (evidence/v2326/principal-key-migration.ts, TOOL_VERSION v2330-1).
//
// Audit V24 found a confirmed design gap in the v2.3.29 allowlist
// (U-120): guardDbPath() checked only path containment against
// PRINCIPAL_MIGRATION_ALLOWED_DIR — not the directory's owner, mode,
// group/world writability, or writable ancestors — and when the
// variable was unset, main() only warned and continued (H-MIGR-41
// asserted exit 0 without an allowlist). This revision:
//
//   * fails closed when the allowlist is unset, for EVERY mode
//     including inventory (audit's safer default: inventory reads
//     sensitive principal data);
//   * validates every allowlisted directory (real path, ownership,
//     mode, writable ancestors) and refuses group/world-writable
//     directories unconditionally — there is NO trusted-group escape
//     hatch in this project (no trusted-group policy has been
//     documented or approved);
//   * keeps the operator workflow (fresh copy in a private per-run
//     directory, verify copy + nlink == 1, no concurrent untrusted
//     writers) as defense in depth, not a replacement for the checks;
//   * does NOT close U-118: the guard→open TOCTOU still cannot be
//     closed from inside the process (Bun exposes no fd/inode for
//     the opened file — v2.3.29 probe). H-MIGR-46 demonstrates the
//     residual with a disposable race instead of claiming it closed.
//
// Every test builds its OWN disposable DB and drives the REAL CLI as
// a child process, so exit codes are the tool's own. No test ever
// touches a live database. All directories used here are disposable
// mkdtemp directories under the OS temp dir; modes/owners are set
// explicitly per test and restored before cleanup.
//
//   H-MIGR-42  U-120 unset allowlist: inventory, archive-special and
//              rename all refuse exit 2 BEFORE opening the DB; no
//              backup written; DB bytes unchanged; no warn-and-
//              continue path remains
//   H-MIGR-43  U-120 shared/group-writable allowlist directory
//              refused: mode 0777, 0775, and 1777 (sticky — the
//              directory itself is refused regardless of sticky)
//   H-MIGR-44  U-120 private owner-controlled directory accepted:
//              mode 0700, operator-owned; inventory exit 0 and a
//              normal rename succeeds
//   H-MIGR-45  U-120 writable-ancestor + symlinked-directory cases:
//              non-sticky world/group-writable ancestor refused;
//              sticky world-writable ancestor accepted; allowlist
//              via symlink to a private dir accepted; via symlink
//              to a shared dir refused; ancestor owned by another
//              uid refused
//   H-MIGR-46  U-118/U-120 disposable path-swap race: while a worker
//              swaps the target DB between two masters, every
//              inventory run exits 0 and reports exactly one
//              consistent state (A or B), never a mix; the log
//              records how often the swapped file was observed and
//              states the remaining limitation explicitly
//   H-MIGR-47  U-120 allowlist directory owned by another uid
//              refused; restored to operator ownership it is
//              accepted again
//
// Run:  bun evidence/v2330/test-principal-migration-v2330.ts
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import {
  countRows,
  makeMigratedDb,
  seedChecks,
  type TestDb,
} from "../v2323/harness-helpers";
import { Database } from "bun:sqlite";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  chownSync,
  copyFileSync,
  existsSync,
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
const WORKER = join(import.meta.dir, "swap-race-worker.ts");
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
  const dir = mkdtempSync(join(tmpdir(), `v2330-migr-${tag}-`));
  const p = join(dir, "input.json");
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  return p;
}

function tmpOut(tag: string): string {
  return join(tmpdir(), `v2330-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`);
}

/** Copy a seeded disposable DB into a fresh directory with an explicit mode. */
function copyDbInto(src: string, dir: string, name = "copy.sqlite"): string {
  const dst = join(dir, name);
  copyFileSync(src, dst);
  return dst;
}

test("H-MIGR-42", "U-120 unset allowlist: inventory, archive-special and rename refuse exit 2 before opening the DB; no backup; DB unchanged", async () => {
  const tdb = seedLegacyDb();
  try {
    const bytesBefore = fileHash(tdb.dbPath);
    const countsBefore = JSON.stringify(counts(tdb));
    // (a) inventory — read-only mode, still refused: it reads
    // sensitive principal data (audit's safer default).
    const rA = runToolEnv(tdb.dbPath, { PRINCIPAL_MIGRATION_ALLOWED_DIR: undefined }, "inventory");
    eq(rA.status, 2, `inventory without an allowlist must be REFUSED with exit 2 (got ${rA.status}; stdout: ${rA.stdout}; stderr: ${rA.stderr})`);
    assert(rA.stderr.includes("PRINCIPAL_MIGRATION_ALLOWED_DIR is not set"), "refusal must name the unset allowlist variable");
    assert(rA.stderr.includes("U-120"), "refusal must name U-120");
    assert(!rA.stderr.includes("WARNING"), "the v2.3.29 warn-and-continue path must be gone — no WARNING, a refusal instead");
    assert(!rA.stdout.includes("local:owner-1"), "refused inventory must NOT print any principal data");
    // (b) archive-special — read-only mode, still refused.
    const rB = runToolEnv(tdb.dbPath, { PRINCIPAL_MIGRATION_ALLOWED_DIR: undefined }, "archive-special", "--out", tmpOut("f120-archspec"));
    eq(rB.status, 2, `archive-special without an allowlist must be REFUSED with exit 2 (got ${rB.status}; stderr: ${rB.stderr})`);
    // (c) rename — mutating mode, refused before any write: no backup.
    const mappingFile = tmpJson(
      [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: U-120 unset case" }],
      "f120-unset",
    );
    const backupFile = tmpOut("f120-unset-backup");
    const rC = runToolEnv(tdb.dbPath, { PRINCIPAL_MIGRATION_ALLOWED_DIR: undefined }, "rename", "--mapping", mappingFile, "--backup", backupFile);
    eq(rC.status, 2, `rename without an allowlist must be REFUSED with exit 2 (got ${rC.status}; stderr: ${rC.stderr})`);
    assert(!existsSync(backupFile), "refused rename must NOT write a backup file");
    // The database must be byte-identical: the refusal happens in
    // guardDbPath(), before new Database() opens it.
    eq(fileHash(tdb.dbPath), bytesBefore, "the database file bytes must be untouched by refused runs");
    eq(JSON.stringify(counts(tdb)), countsBefore, "row counts must be unchanged");
  } finally {
    tdb.close();
  }
});

test("H-MIGR-43", "U-120 shared/group-writable allowlist directory refused: mode 0777, 0775, and 1777 (sticky — directory itself refused regardless of sticky)", async () => {
  const tdb = seedLegacyDb();
  const base = mkdtempSync(join(tmpdir(), "v2330-shared-"));
  try {
    for (const mode of [0o777, 0o775, 0o1777] as const) {
      const sharedDir = join(base, `shared-${mode.toString(8)}`);
      mkdirSync(sharedDir);
      chmodSync(sharedDir, mode);
      const dbCopy = copyDbInto(tdb.dbPath, sharedDir);
      const before = fileHash(dbCopy);
      const r = runToolEnv(dbCopy, { PRINCIPAL_MIGRATION_ALLOWED_DIR: sharedDir }, "inventory");
      eq(r.status, 2, `inventory with a 0${mode.toString(8)} allowlist directory must be REFUSED with exit 2 (got ${r.status}; stderr: ${r.stderr})`);
      assert(r.stderr.includes("U-120"), "refusal must name U-120");
      // The tool reports the PERMISSION bits (sticky bit excluded):
      // mode 1777 is reported as 0777 — the directory itself is
      // refused regardless of sticky, so the reported bits are 0777.
      assert(r.stderr.includes(`0${(mode & 0o777).toString(8)}`), "refusal must name the offending permission bits");
      assert(!r.stdout.includes("local:owner-1"), "refused inventory must NOT print any principal data");
      eq(fileHash(dbCopy), before, `the database copy in the 0${mode.toString(8)} directory must be untouched`);
      // Restore a removable mode before cleanup (root can remove
      // anyway, but leave no surprising bits behind).
      chmodSync(sharedDir, 0o700);
    }
  } finally {
    tdb.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test("H-MIGR-44", "U-120 private owner-controlled directory accepted: mode 0700, operator-owned; inventory exit 0 and a normal rename succeeds", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2330-private-"));
  try {
    chmodSync(dir, 0o700);
    const dbCopy = copyDbInto(tdb.dbPath, dir);
    const st = statSync(dir);
    eq(st.mode & 0o777, 0o700, "precondition: private directory must be mode 0700");
    eq(st.uid, process.getuid?.() ?? -1, "precondition: private directory must be owned by the operator");
    const rInv = runToolEnv(dbCopy, { PRINCIPAL_MIGRATION_ALLOWED_DIR: dir }, "inventory");
    eq(rInv.status, 0, `inventory in a private directory must exit 0 (stderr: ${rInv.stderr})`);
    assert(rInv.stdout.includes("local:owner-1: 2"), "inventory must report the legacy checks");
    const mappingFile = tmpJson(
      [{ legacyKey: LEGACY_A, currentKey: CURRENT_A, basis: "harness fixture: U-120 private-dir rename" }],
      "f120-private",
    );
    const backupFile = join(dir, "backup.json");
    const rRen = runToolEnv(dbCopy, { PRINCIPAL_MIGRATION_ALLOWED_DIR: dir }, "rename", "--mapping", mappingFile, "--backup", backupFile);
    eq(rRen.status, 0, `rename in a private directory must exit 0 (stderr: ${rRen.stderr})`);
    assert(existsSync(backupFile), "rename must write its backup JSON");
    eq(statSync(backupFile).mode & 0o777, 0o600, "the rename backup must be mode 0600");
    const raw = new Database(dbCopy);
    try {
      const row: any = raw.query("SELECT count(*) AS n FROM checks WHERE owner_user_id = ?").get(LEGACY_A);
      eq(Number(row?.n ?? -1), 0, "rename must have applied (no legacy checks left)");
    } finally {
      raw.close();
    }
  } finally {
    tdb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("H-MIGR-45", "U-120 writable-ancestor + symlinked-directory cases: non-sticky writable ancestor refused, sticky accepted, symlinked allowlist resolved to its real target", async () => {
  const tdb = seedLegacyDb();
  const base = mkdtempSync(join(tmpdir(), "v2330-ancestor-"));
  try {
    // (a) Non-sticky world-writable ancestor (0777) → refused.
    const parentWorld = join(base, "parent-world");
    mkdirSync(parentWorld);
    chmodSync(parentWorld, 0o777);
    const childA = join(parentWorld, "child");
    mkdirSync(childA);
    chmodSync(childA, 0o700);
    const dbA = copyDbInto(tdb.dbPath, childA);
    const rA = runToolEnv(dbA, { PRINCIPAL_MIGRATION_ALLOWED_DIR: childA }, "inventory");
    eq(rA.status, 2, `inventory under a non-sticky world-writable ancestor must be REFUSED with exit 2 (got ${rA.status}; stderr: ${rA.stderr})`);
    assert(rA.stderr.includes("ancestor"), "refusal must name the ancestor directory");
    chmodSync(parentWorld, 0o700);

    // (b) Non-sticky group-writable ancestor (0775) → refused.
    const parentGroup = join(base, "parent-group");
    mkdirSync(parentGroup);
    chmodSync(parentGroup, 0o775);
    const childB = join(parentGroup, "child");
    mkdirSync(childB);
    chmodSync(childB, 0o700);
    const dbB = copyDbInto(tdb.dbPath, childB);
    const rB = runToolEnv(dbB, { PRINCIPAL_MIGRATION_ALLOWED_DIR: childB }, "inventory");
    eq(rB.status, 2, `inventory under a non-sticky group-writable ancestor must be REFUSED with exit 2 (got ${rB.status}; stderr: ${rB.stderr})`);
    assert(rB.stderr.includes("ancestor"), "refusal must name the ancestor directory");
    chmodSync(parentGroup, 0o700);

    // (c) Sticky world-writable ancestor (1777) → accepted: a sticky
    // directory does not let a non-owner unlink/rename entries owned
    // by others, so the allowlisted directory cannot be swapped out
    // from under the tool through that ancestor.
    const parentSticky = join(base, "parent-sticky");
    mkdirSync(parentSticky);
    chmodSync(parentSticky, 0o1777);
    const childC = join(parentSticky, "child");
    mkdirSync(childC);
    chmodSync(childC, 0o700);
    const dbC = copyDbInto(tdb.dbPath, childC);
    const rC = runToolEnv(dbC, { PRINCIPAL_MIGRATION_ALLOWED_DIR: childC }, "inventory");
    eq(rC.status, 0, `inventory under a sticky world-writable ancestor must exit 0 (stderr: ${rC.stderr})`);
    assert(rC.stdout.includes("local:owner-1: 2"), "inventory under a sticky ancestor must report the legacy checks");

    // (d) Allowlist given as a SYMLINK to a private directory →
    // accepted: the tool resolves the allowlist entry to its real
    // path before the containment check.
    const realPrivate = join(base, "real-private");
    mkdirSync(realPrivate);
    chmodSync(realPrivate, 0o700);
    const dbD = copyDbInto(tdb.dbPath, realPrivate);
    const linkPrivate = join(base, "link-private");
    symlinkSync(realPrivate, linkPrivate);
    const rD = runToolEnv(dbD, { PRINCIPAL_MIGRATION_ALLOWED_DIR: linkPrivate }, "inventory");
    eq(rD.status, 0, `inventory with a symlinked allowlist to a private directory must exit 0 (stderr: ${rD.stderr})`);

    // (e) Allowlist given as a SYMLINK to a shared directory →
    // refused: validation applies to the resolved target, not the
    // link name.
    const realShared = join(base, "real-shared");
    mkdirSync(realShared);
    chmodSync(realShared, 0o777);
    const dbE = copyDbInto(tdb.dbPath, realShared);
    const linkShared = join(base, "link-shared");
    symlinkSync(realShared, linkShared);
    const rE = runToolEnv(dbE, { PRINCIPAL_MIGRATION_ALLOWED_DIR: linkShared }, "inventory");
    eq(rE.status, 2, `inventory with a symlinked allowlist to a shared directory must be REFUSED with exit 2 (got ${rE.status}; stderr: ${rE.stderr})`);
    assert(rE.stderr.includes("U-120"), "refusal must name U-120");
    chmodSync(realShared, 0o700);

    // (f) Ancestor owned by another uid → refused. (Runs as root in
    // this VM, so chown to uid 65534/nobody is possible; the
    // operator uid is 0 here.)
    const parentForeign = join(base, "parent-foreign");
    mkdirSync(parentForeign);
    const childF = join(parentForeign, "child");
    mkdirSync(childF);
    chmodSync(childF, 0o700);
    const dbF = copyDbInto(tdb.dbPath, childF);
    chownSync(parentForeign, 65534, 65534);
    try {
      const rF = runToolEnv(dbF, { PRINCIPAL_MIGRATION_ALLOWED_DIR: childF }, "inventory");
      eq(rF.status, 2, `inventory under an ancestor owned by another uid must be REFUSED with exit 2 (got ${rF.status}; stderr: ${rF.stderr})`);
      assert(rF.stderr.includes("ancestor") && rF.stderr.includes("65534"), "refusal must name the foreign-owned ancestor");
    } finally {
      chownSync(parentForeign, 0, 0);
    }
  } finally {
    tdb.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test("H-MIGR-46", "U-118/U-120 disposable path-swap race: every inventory run reports exactly one consistent state (A or B); the residual is recorded, not hidden", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2330-race-"));
  let worker: ReturnType<typeof spawn> | null = null;
  try {
    chmodSync(dir, 0o700);
    // Master A: the seeded DB (legacy marker local:owner-1: 2 checks).
    const masterA = join(dir, "master-a.sqlite");
    copyFileSync(tdb.dbPath, masterA);
    // Master B: same shape, ALL principal markers re-owned to a
    // distinct marker — checks, saved_projects (except the <LEGACY>
    // sentinel row) and projects provenance — so an A-inventory and
    // a B-inventory share no marker string at all.
    const masterB = join(dir, "master-b.sqlite");
    copyFileSync(tdb.dbPath, masterB);
    const rawB = new Database(masterB);
    try {
      rawB.exec("UPDATE checks SET owner_user_id = 'local:race-B'");
      rawB.exec("UPDATE saved_projects SET principal_id = 'local:race-B' WHERE principal_id != '<LEGACY>'");
      rawB.exec("UPDATE projects SET provenance_submitted_by = 'local:race-B' WHERE provenance_submitted_by = 'local:owner-1'");
    } finally {
      rawB.close();
    }
    const hashA = fileHash(masterA);
    const hashB = fileHash(masterB);
    assert(hashA !== hashB, "precondition: master A and B must differ");
    const target = join(dir, "target.sqlite");
    copyFileSync(masterA, target);
    // Start the swapper: it atomically renames B over the target,
    // then A over the target, in a tight loop, until killed.
    worker = spawn("bun", [WORKER, dir, target, masterA, masterB], { stdio: "ignore" });
    // Give the worker a moment to start swapping before the first run.
    await new Promise((r) => setTimeout(r, 300));
    const N = 120;
    let seenA = 0;
    let seenB = 0;
    let realpathRetries = 0;
    for (let i = 0; i < N; i++) {
      // The aggressive swap loop can make glibc realpath(3) fail with
      // a transient ENOENT even though the path never disappears:
      // realpath resolves the path component-by-component and can
      // race a rename, while a single stat(2) never fails in the
      // same loop (probe: realpathSync 99/5000 fails, statSync
      // 0/5000, tmpfs). That is a harness/filesystem artifact of
      // swapping as fast as possible, NOT the tool opening the wrong
      // database — so a run that fails only with that exact ENOENT
      // is retried (up to 5 times) and the retries are counted in
      // the log. Any other failure, or an ENOENT that persists, FAILS
      // the test.
      let r: { status: number | null; stdout: string; stderr: string } | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const cand = runToolEnv(target, { PRINCIPAL_MIGRATION_ALLOWED_DIR: dir }, "inventory");
        if (cand.status === 2 && cand.stderr.includes("cannot resolve real path") && cand.stderr.includes("ENOENT")) {
          realpathRetries++;
          continue;
        }
        r = cand;
        break;
      }
      assert(r !== null, `race inventory run #${i} kept hitting the transient realpath/rename ENOENT after 5 attempts`);
      eq(r!.status, 0, `race inventory run #${i} must exit 0 (stderr: ${r!.stderr})`);
      const isA = r!.stdout.includes("local:owner-1: 2") && !r!.stdout.includes("local:race-B");
      const isB = r!.stdout.includes("local:race-B: 5") && !r!.stdout.includes("local:owner-1");
      assert(isA || isB, `race inventory run #${i} must report exactly one consistent state (A or B), never a mix — stdout: ${r!.stdout.slice(0, 400)}`);
      if (isA) seenA++;
      else seenB++;
    }
    console.log(`RACE observed-A=${seenA} observed-B=${seenB} (N=${N}) realpath-ENOENT-retries=${realpathRetries}`);
    if (seenB > 0) {
      console.log(
        `RACE DEMONSTRATED: the tool opened the swapped-in database in ${seenB}/${N} runs — a concurrent writer that can modify the allowlisted directory CAN change which file the tool opens after the guard. This is the U-118 residual, reproduced in a disposable setting; it is NOT closed by this revision.`,
      );
    } else {
      console.log(
        `RACE NOT TRIGGERED in ${N} runs (all runs observed A): the window between guardDbPath() and new Database() is small, but it EXISTS — the U-118 probe (v2.3.29) proves Bun exposes no fd/inode for the opened file, so no run count can prove the window closed. Residual stays OPEN.`,
      );
    }
    console.log(
      `RACE RESIDUAL (U-118, explicit): the only enforceable boundary is the U-120 private-directory precondition — no untrusted local writer may be able to modify the allowlisted directory. If such a writer exists, the tool cannot guarantee which database it opens.`,
    );
    // The target must end as a whole A or a whole B, never a mix.
    const finalHash = fileHash(target);
    assert(finalHash === hashA || finalHash === hashB, "after the race the target file must be byte-identical to master A or master B (atomic rename, no torn file)");
  } finally {
    if (worker) {
      worker.kill("SIGKILL");
      await new Promise((r) => {
        worker!.on("exit", r);
        setTimeout(r, 2000);
      });
    }
    tdb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("H-MIGR-47", "U-120 allowlist directory owned by another uid refused; restored to operator ownership it is accepted again", async () => {
  const tdb = seedLegacyDb();
  const dir = mkdtempSync(join(tmpdir(), "v2330-owner-"));
  try {
    chmodSync(dir, 0o700);
    const dbCopy = copyDbInto(tdb.dbPath, dir);
    const me = process.getuid?.() ?? -1;
    // (a) Owned by uid 65534 (nobody) → refused.
    chownSync(dir, 65534, 65534);
    try {
      const rA = runToolEnv(dbCopy, { PRINCIPAL_MIGRATION_ALLOWED_DIR: dir }, "inventory");
      eq(rA.status, 2, `inventory in a directory owned by another uid must be REFUSED with exit 2 (got ${rA.status}; stderr: ${rA.stderr})`);
      assert(rA.stderr.includes("65534"), "refusal must name the foreign owner uid");
      assert(rA.stderr.includes("U-120"), "refusal must name U-120");
      assert(!rA.stdout.includes("local:owner-1"), "refused inventory must NOT print any principal data");
    } finally {
      chownSync(dir, me, me);
    }
    // (b) Restored to operator ownership → accepted again.
    const st = statSync(dir);
    eq(st.uid, me, "precondition: directory must be operator-owned again after restore");
    const rB = runToolEnv(dbCopy, { PRINCIPAL_MIGRATION_ALLOWED_DIR: dir }, "inventory");
    eq(rB.status, 0, `inventory after restoring operator ownership must exit 0 (stderr: ${rB.stderr})`);
    assert(rB.stdout.includes("local:owner-1: 2"), "inventory must report the legacy checks after restore");
  } finally {
    tdb.close();
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
