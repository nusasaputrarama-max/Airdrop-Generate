// Regression tests for the tightened F-029 test seam (U-72, v2.3.18;
// REWRITTEN v2.3.19 for F-037).
//
// Proves, per audit V11 §6 U-72 and §11 item 3:
//   - F029_CHILD_SCRIPT without F029_TEST_MODE=1 → exit 2 (refused
//     before any child spawns);
//   - F029_TEST_MODE set to anything but exactly "1" does NOT
//     activate test mode;
//   - F029_CHILD_TIMEOUT_MS without F029_TEST_MODE=1 → exit 2;
//   - an arbitrary real file outside the evidence tree → exit 2,
//     even in test mode;
//   - a SYMLINK to an approved fixture → exit 2, even in test mode
//     (the given path itself must not be a symlink);
//   - a nonexistent path / a non-script file → exit 2 in test mode;
//   - the approved fixture IS accepted in test mode: a run with
//     F029_TEST_MODE=1 + hang-child + 100 ms timeout proceeds past
//     the gate (12 timeout FAILs, exit 1, test-seam line present).
//     The canonical acceptance proof remains the full E2E log
//     (run-f032-timeout-e2e-v2319.txt, 3000 ms timeout, driver PASS).
//
// All rejection cases fail FAST (exit 2 before preflight/children).
// No CI workflow is added by this revision — deliberately, per the
// audit: no workflow may execute untrusted PR input without a
// threat model.
//
// F-037 (v2.3.19) — how this test ITSELF became safe:
//   - The v2.3.18 version wrote fixed paths /tmp/u72-evil-child.ts,
//     /tmp/u72-link-to-hang-child.ts, and /tmp/u72-pidfile.txt with
//     writeFileSync (truncate/follow) and deleted them with rmSync
//     — on a shared host that could truncate a symlink target or
//     delete a foreign file, and a planted symlink at one of those
//     paths would be followed by the write.
//   - This version puts EVERY fixture inside ONE private test
//     directory (mkdtemp, mode 0700, realpath + ownership
//     validated). Files are created EXCLUSIVELY (openSync "wx",
//     0600); symlinks are created only after verifying the path
//     does not exist. If a stale /tmp/u72-* entry from an old run
//     already exists when the test starts, the test FAILS SAFE
//     without touching it.
//   - Teardown removes an object ONLY if a fresh lstat still shows
//     the (dev,ino) recorded at creation; a replaced object is left
//     untouched and reported as FAIL. The private directory itself
//     is removed only after its (dev,ino) are re-verified.
//
// NON-ROOT: this test REFUSES to run as root (uid 0) — see
// test-f035-pidfile.ts for the reason. Run as an unprivileged user:
//   setpriv --reuid=nobody --regid=nogroup --clear-groups bun test-u72-seam.ts
// The canonical evidence run is recorded in test-u72-seam-v2319.txt
// (uid 65534).
//
// Usage (from evidence/f029-memory-methodology/):
//   bun test-u72-seam.ts
// Exit 0 = all assertions PASS; exit 1 = FAIL.

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  closeSync,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const HERE = import.meta.dir;
const HANG_CHILD = resolve(HERE, "../f032-harness-validation/hang-child.ts");

const MY_UID = typeof process.getuid === "function" ? process.getuid() : undefined;
console.log(`u72 test: uid=${MY_UID} bun=${Bun.version}`);
if (MY_UID === 0) {
  console.log(
    "u72 test: REFUSING to run as root (uid 0) — run as an unprivileged user (see header); privileged evidence, if ever needed, must be recorded separately",
  );
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, label: string) {
  console.log(`u72 assert ${cond ? "PASS" : "FAIL"}: ${label}`);
  if (!cond) failures++;
}

function cleanEnv(extra: Record<string, string | undefined>): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.F029_CHILD_SCRIPT;
  delete env.F029_CHILD_TIMEOUT_MS;
  delete env.F029_TEST_MODE;
  delete env.F032_PID_FILE;
  delete env.F032_PID_FILE_DEV;
  delete env.F032_PID_FILE_INO;
  Object.assign(env, extra);
  return env;
}

function run(extraEnv: Record<string, string | undefined>): { status: number | null; out: string } {
  const r = spawnSync(process.execPath, ["run-f029.ts", "--runs", "1"], {
    cwd: HERE,
    env: cleanEnv(extraEnv),
    encoding: "utf8",
    timeout: 120_000,
  });
  return { status: r.status, out: ((r.stdout ?? "") as string) + ((r.stderr ?? "") as string) };
}

function pathExistsNoFollow(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function main() {
  // FAIL SAFE first: a stale /tmp/u72-* entry from an old
  // (fixed-path) run must never be deleted or overwritten by this
  // test. If one exists, report and stop before creating anything.
  const stale = readdirSync(tmpdir()).filter((n) => n.startsWith("u72-"));
  check(stale.length === 0, `no stale /tmp/u72-* entries at start (found: ${stale.join(", ") || "none"})`);
  if (stale.length > 0) {
    throw new Error(`fail-safe abort: stale /tmp/u72-* entries pre-exist (${stale.join(", ")}); refusing to delete or overwrite them`);
  }

  // Private test directory for ALL fixtures.
  const TEST_DIR = mkdtempSync(join(tmpdir(), "u72-test-"));
  chmodSync(TEST_DIR, 0o700);
  const testDirStat = statSync(TEST_DIR);
  const testDirReal = realpathSync(TEST_DIR);
  console.log(`u72 test dir: ${TEST_DIR} (realpath=${testDirReal} mode=${(testDirStat.mode & 0o777).toString(8)} uid=${testDirStat.uid})`);
  check(testDirReal === TEST_DIR, "test dir realpath matches (no symlink)");
  check((testDirStat.mode & 0o777) === 0o700, "test dir mode is 700");
  if (MY_UID !== undefined) {
    check(testDirStat.uid === MY_UID, `test dir owned by our uid ${MY_UID}`);
  }
  const testDirId = { dev: testDirStat.dev, ino: testDirStat.ino };

  const EVIL = join(TEST_DIR, "u72-evil-child.ts");
  const LINK = join(TEST_DIR, "u72-link-to-hang-child.ts");
  const PIDFILE = join(TEST_DIR, "u72-pidfile.txt");
  const NONEXISTENT = join(TEST_DIR, "u72-does-not-exist.ts");
  const NONSCRIPT = join(TEST_DIR, "u72-not-a-script.txt");

  // Created-object registry: (dev,ino) at creation; teardown only
  // removes objects whose identity still matches.
  const created = new Map<string, { dev: number; ino: number }>();
  function createExclusive(path: string, content: string): void {
    if (pathExistsNoFollow(path)) {
      throw new Error(`fail-safe abort: fixture path already exists inside fresh private dir (impossible without a race): ${path}`);
    }
    const fd = openSync(path, "wx", 0o600);
    try {
      writeSync(fd, content);
    } finally {
      const st = fstatSync(fd);
      created.set(path, { dev: st.dev, ino: st.ino });
      closeSync(fd);
    }
  }
  function removeIfOurs(path: string, label: string): void {
    const expected = created.get(path);
    if (!expected) return; // never created by this invocation — never touch
    let st;
    try {
      st = lstatSync(path);
    } catch {
      check(false, `${label}: vanished before teardown (${path})`);
      return;
    }
    if (st.dev !== expected.dev || st.ino !== expected.ino) {
      check(false, `${label}: REPLACED during the run (dev/ino changed) — left untouched, investigate (${path})`);
      return;
    }
    rmSync(path, { force: true });
    check(!pathExistsNoFollow(path), `${label} removed in teardown (was ours, dev/ino verified)`);
  }

  try {
    // Fixtures for the rejection cases: a real script outside the
    // evidence tree, and a symlink pointing at the approved fixture.
    // Both live inside the private test dir, created exclusively.
    createExclusive(EVIL, 'console.log("evil child — must never run");\n');
    if (pathExistsNoFollow(LINK)) {
      throw new Error(`fail-safe abort: symlink path already exists inside fresh private dir: ${LINK}`);
    }
    symlinkSync(HANG_CHILD, LINK);
    {
      const lst = lstatSync(LINK);
      created.set(LINK, { dev: lst.dev, ino: lst.ino });
    }
    createExclusive(NONSCRIPT, "this is not a script\n");

    // 1. Override without test mode → exit 2.
    let r = run({ F029_CHILD_SCRIPT: HANG_CHILD });
    check(r.status === 2, `override without test mode → exit 2 (got ${r.status})`);
    check(r.out.includes("F029_TEST_MODE=1"), "override without test mode → error names F029_TEST_MODE=1");
    check(!r.out.includes("preflight"), "override without test mode → refused before preflight");

    // 2. F029_TEST_MODE=true (not exactly "1") does NOT activate test mode.
    r = run({ F029_TEST_MODE: "true", F029_CHILD_SCRIPT: HANG_CHILD });
    check(r.status === 2, `F029_TEST_MODE=true + override → exit 2 (got ${r.status})`);

    // 3. Timeout override without test mode → exit 2.
    r = run({ F029_CHILD_TIMEOUT_MS: "3000" });
    check(r.status === 2, `timeout override without test mode → exit 2 (got ${r.status})`);

    // 4. Arbitrary real file outside the evidence tree, in test mode → exit 2.
    r = run({ F029_TEST_MODE: "1", F029_CHILD_SCRIPT: EVIL });
    check(r.status === 2, `arbitrary path in test mode → exit 2 (got ${r.status})`);
    check(r.out.includes("not an approved fixture"), "arbitrary path → error says not an approved fixture");

    // 5. Symlink to an approved fixture, in test mode → exit 2.
    r = run({ F029_TEST_MODE: "1", F029_CHILD_SCRIPT: LINK });
    check(r.status === 2, `symlink to approved fixture in test mode → exit 2 (got ${r.status})`);
    check(r.out.includes("must not be a symlink"), "symlink → error says must not be a symlink");

    // 6. Nonexistent path, in test mode → exit 2.
    r = run({ F029_TEST_MODE: "1", F029_CHILD_SCRIPT: NONEXISTENT });
    check(r.status === 2, `nonexistent path in test mode → exit 2 (got ${r.status})`);

    // 7. Existing non-script file, in test mode → exit 2.
    r = run({ F029_TEST_MODE: "1", F029_CHILD_SCRIPT: NONSCRIPT });
    check(r.status === 2, `non-script file in test mode → exit 2 (got ${r.status})`);

    // 8. ACCEPTANCE: approved fixture in test mode passes the gate.
    // hang-child + 100 ms timeout: 12 children time out fast, exit 1
    // (NOT 2), with the test-seam line — proving the gate lets the
    // approved fixture through. hang-child needs a valid PID file
    // (regular file, mode 0600, same uid — its own F-035 validation),
    // so one is created here first, EXCLUSIVELY, and its (dev,ino)
    // are passed through so hang-child v2.3.19 can pin its write.
    createExclusive(PIDFILE, "");
    const pidStat = statSync(PIDFILE);
    r = run({
      F029_TEST_MODE: "1",
      F029_CHILD_SCRIPT: HANG_CHILD,
      F029_CHILD_TIMEOUT_MS: "100",
      F032_PID_FILE: PIDFILE,
      F032_PID_FILE_DEV: String(pidStat.dev),
      F032_PID_FILE_INO: String(pidStat.ino),
    });
    check(r.status === 1, `approved fixture in test mode → proceeds (exit 1 from timeouts, got ${r.status})`);
    check(r.out.includes("test-seam:"), "approved fixture run logs the test-seam line");
    const timeoutFails = r.out.split("\n").filter((l) => l.startsWith("FAIL ") && l.includes("timeout after 100 ms"));
    check(timeoutFails.length === 12, `approved fixture run: 12 timeout FAILs after 100 ms (got ${timeoutFails.length})`);
    check(r.out.includes("parent done: FAILED"), "approved fixture run prints parent done: FAILED");
  } finally {
    // Teardown: only objects proven to be ours (dev/ino-verified).
    for (const [path, label] of [
      [EVIL, "evil fixture"],
      [LINK, "symlink fixture"],
      [NONSCRIPT, "non-script fixture"],
      [PIDFILE, "pidfile fixture"],
    ] as const) {
      removeIfOurs(path, label);
    }
    // Private test dir itself, dev/ino-verified.
    let st;
    try {
      st = statSync(TEST_DIR);
    } catch {
      st = null;
    }
    if (st && st.dev === testDirId.dev && st.ino === testDirId.ino) {
      rmSync(TEST_DIR, { recursive: true, force: true });
      check(!pathExistsNoFollow(TEST_DIR), "private test dir removed in teardown (dev/ino verified)");
    } else {
      check(false, "private test dir REPLACED or vanished — left untouched, investigate");
    }
    const leftovers = readdirSync(tmpdir()).filter((n) => n.startsWith("u72-"));
    check(leftovers.length === 0, `no /tmp/u72-* leftovers at end (found: ${leftovers.join(", ") || "none"})`);
  }
}

try {
  main();
} catch (e: any) {
  console.log(`U-72 SEAM TEST: FAIL — fail-safe abort: ${e?.message ?? e}`);
  process.exit(1);
}

if (failures > 0) {
  console.log(`U-72 SEAM TEST: FAIL — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("U-72 SEAM TEST: PASS — overrides refused without explicit test mode, arbitrary/symlink paths refused, approved fixture accepted; all fixtures in a private dir, exclusive create, dev/ino-verified cleanup");
