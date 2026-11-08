// Regression test for F-035 (v2.3.18) — REWRITTEN v2.3.19 for F-037.
//
// Proves, per audit V11 §6 F-035 and §11 item 2, plus audit V12 §6
// F-037 and §10 item 2:
//   1. A symlink pre-planted at the OLD fixed path
//      (/tmp/f032-hang-child.pid) is never followed: its target
//      file is byte-identical before and after the runs, and the
//      symlink itself still points at the same target.
//   2. A REGULAR file pre-planted at the OLD fixed path is never
//      truncated, overwritten, or deleted either.
//   3. Two driver invocations running IN PARALLEL each use their
//      own private directory (different mkdtemp paths), each reads
//      only its own 12 PIDs (the two PID sets are disjoint), and
//      both PASS.
//   4. Cleanup: both private directories are gone after the drivers
//      exit; no run-dir leftovers remain in /tmp.
//   5. Neither driver log mentions the legacy fixed path at all.
//
// F-037 (v2.3.19) — how this test ITSELF became safe:
//   - The v2.3.18 version of this file DELETED the legacy paths
//     with rmSync(force) and re-created them with writeFileSync
//     (truncate/follow) — on a shared host that could delete or
//     overwrite a foreign file, or follow a planted symlink.
//   - This version NEVER deletes or overwrites a path it did not
//     create. The legacy fixtures are created EXCLUSIVELY
//     (openSync "wx", 0600); if either legacy path ALREADY EXISTS
//     when the test starts, the test FAILS SAFE immediately — it
//     prints the fact, touches nothing, and exits non-zero.
//     (A leftover from a crashed run, or a foreign file, is never
//     "cleaned up" by this test.)
//   - Every object this test creates records its (dev,ino) at
//     creation. Teardown removes an object ONLY if a fresh lstat
//     still shows the same (dev,ino); a replaced object is left
//     untouched and reported as FAIL.
//   - All other test artifacts live in ONE private test directory
//     (mkdtemp, mode 0700, realpath + ownership validated), removed
//     in `finally` only after its (dev,ino) are re-verified.
//   - The planted legacy fixtures are the SIMULATED pre-existing
//     foreign state the audit's regression test requires
//     ("pre-create regular file dan symlink pada setiap path lama");
//     they are the only files this test creates outside its private
//     directory, they are created exclusively, and they are removed
//     only when proven to be ours.
//
// NON-ROOT: this test REFUSES to run as root (uid 0). The audit
// forbids running these tests as root before the fix, and the
// regression value of this test (a privileged run must not be able
// to clobber foreign files) is only meaningful unprivileged. Run
// as an unprivileged user, e.g.:
//   setpriv --reuid=nobody --regid=nogroup --clear-groups bun test-f035-pidfile.ts
// The canonical evidence run is recorded in
// test-f035-pidfile-v2319.txt (uid 65534).
//
// The drivers run the full E2E (12 hanging children x 3 s timeout
// each); two in parallel, two scenarios, take ~80 s total.
//
// Usage (from evidence/f032-harness-validation/):
//   bun test-f035-pidfile.ts
// Exit 0 = all assertions PASS; exit 1 = FAIL.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LEGACY_PID_FILE = "/tmp/f032-hang-child.pid";
const SENTINEL_TARGET = "/tmp/f035-sentinel-target.txt";
const SENTINEL_CONTENT = "F-035 sentinel — this file must never change\n";

const MY_UID = typeof process.getuid === "function" ? process.getuid() : undefined;
console.log(`f035 test: uid=${MY_UID} bun=${Bun.version}`);
if (MY_UID === 0) {
  console.log(
    "f035 test: REFUSING to run as root (uid 0) — run as an unprivileged user (see header); privileged evidence, if ever needed, must be recorded separately",
  );
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, label: string) {
  console.log(`f035 assert ${cond ? "PASS" : "FAIL"}: ${label}`);
  if (!cond) failures++;
}
function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function runDriver(): Promise<{ status: number | null; out: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, ["run-f032-timeout-e2e.ts"], {
      cwd: import.meta.dir,
      env: process.env,
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      out += d;
    });
    child.on("exit", (status) => resolvePromise({ status, out }));
  });
}
function extractRunDir(out: string): string | null {
  const m = /^private run dir: (\S+)/m.exec(out);
  return m ? m[1] : null;
}
function extractPids(out: string): number[] {
  const m = /^e2e: hang-child recorded \d+ pid\(s\): ([\d, ]+)$/m.exec(out);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isSafeInteger(n));
}
function pathExistsNoFollow(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}
function tmpLeftovers(): string[] {
  // Run-dir leftovers only (our mkdtemp prefixes). The planted
  // legacy fixtures are tracked separately by (dev,ino) below.
  return readdirSync(tmpdir()).filter(
    (n) => n.startsWith("f032-e2e-") || n.startsWith("f035-test-"),
  );
}
/** Remove `path` ONLY if it is still the object we created
 *  ((dev,ino) unchanged). A replaced object is left untouched and
 *  reported — never deleted blindly. */
function removeIfOurs(path: string, expected: { dev: number; ino: number }, label: string) {
  let st;
  try {
    st = lstatSync(path);
  } catch {
    check(false, `${label}: vanished before teardown (${path}) — expected our object to still be there`);
    return;
  }
  if (st.dev !== expected.dev || st.ino !== expected.ino) {
    check(
      false,
      `${label}: REPLACED during the run (dev/ino changed) — left untouched, investigate (${path})`,
    );
    return;
  }
  rmSync(path, { force: true });
  check(!pathExistsNoFollow(path), `${label} removed in teardown (was ours, dev/ino verified)`);
}

async function main() {
  // Check for leftovers BEFORE creating our own test dir (the
  // check must not see the directory this invocation just created).
  check(tmpLeftovers().length === 0, `no run-dir leftovers in /tmp at start (found: ${tmpLeftovers().join(", ") || "none"})`);

  // Private test directory for everything except the planted legacy
  // fixtures (see header). mkdtemp + explicit chmod 0700 + checks.
  const TEST_DIR = mkdtempSync(join(tmpdir(), "f035-test-"));
  chmodSync(TEST_DIR, 0o700);
  const testDirStat = statSync(TEST_DIR);
  const testDirReal = realpathSync(TEST_DIR);
  console.log(`f035 test dir: ${TEST_DIR} (realpath=${testDirReal} mode=${(testDirStat.mode & 0o777).toString(8)} uid=${testDirStat.uid})`);
  check(testDirReal === TEST_DIR, "test dir realpath matches (no symlink)");
  check((testDirStat.mode & 0o777) === 0o700, "test dir mode is 700");
  if (MY_UID !== undefined) {
    check(testDirStat.uid === MY_UID, `test dir owned by our uid ${MY_UID}`);
  }
  const testDirId = { dev: testDirStat.dev, ino: testDirStat.ino };

  try {
    for (const scenario of ["symlink", "regular"] as const) {
      console.log(`--- f035 scenario: legacy path is a ${scenario} file ---`);

      // FAIL SAFE: if either legacy path already exists, touch
      // NOTHING and fail. A leftover or foreign file is never
      // "cleaned up" by this test.
      for (const p of [LEGACY_PID_FILE, SENTINEL_TARGET]) {
        if (pathExistsNoFollow(p)) {
          check(false, `legacy path already exists before scenario ${scenario} — FAILING SAFE without touching it: ${p}`);
          // Throw (not process.exit): the outer finally still removes
          // our private test dir, and the bottom handler reports the
          // fail-safe abort. The pre-existing path is left untouched.
          throw new Error(`fail-safe abort: legacy path pre-exists (${p})`);
        }
      }

      // Create the sentinel target EXCLUSIVELY (fails if raced).
      let fd: number;
      try {
        fd = openSync(SENTINEL_TARGET, "wx", 0o600);
      } catch (e: any) {
        check(false, `exclusive create of sentinel target failed (${e?.code ?? e}) — failing safe`);
        throw new Error(`fail-safe abort: cannot exclusively create ${SENTINEL_TARGET}`);
      }
      writeSync(fd, SENTINEL_CONTENT);
      const sentinelStat = fstatSync(fd);
      closeSync(fd);
      const sentinelId = { dev: sentinelStat.dev, ino: sentinelStat.ino };
      const sentinelBefore = sha256(SENTINEL_TARGET);

      let legacyId: { dev: number; ino: number };
      if (scenario === "symlink") {
        symlinkSync(SENTINEL_TARGET, LEGACY_PID_FILE);
        const lst = lstatSync(LEGACY_PID_FILE);
        legacyId = { dev: lst.dev, ino: lst.ino };
        check(lst.isSymbolicLink(), "legacy path is a symlink before the runs");
        check(readlinkSync(LEGACY_PID_FILE) === SENTINEL_TARGET, "legacy symlink points at the sentinel target");
      } else {
        let fd2: number;
        try {
          fd2 = openSync(LEGACY_PID_FILE, "wx", 0o600);
        } catch (e: any) {
          check(false, `exclusive create of legacy regular file failed (${e?.code ?? e}) — failing safe`);
          throw new Error(`fail-safe abort: cannot exclusively create ${LEGACY_PID_FILE}`);
        }
        writeSync(fd2, SENTINEL_CONTENT);
        const lst2 = fstatSync(fd2);
        closeSync(fd2);
        legacyId = { dev: lst2.dev, ino: lst2.ino };
        check(lstatSync(LEGACY_PID_FILE).isFile(), "legacy path is a regular file before the runs");
      }
      console.log(
        `f035 setup (${scenario}): legacy ${LEGACY_PID_FILE} planted; sentinel sha256 ${sentinelBefore.slice(0, 16)}…`,
      );

      try {
        // Two drivers in parallel.
        const [a, b] = await Promise.all([runDriver(), runDriver()]);

        check(a.status === 0, `driver A exits 0 (got ${a.status}) [${scenario}]`);
        check(b.status === 0, `driver B exits 0 (got ${b.status}) [${scenario}]`);
        check(a.out.includes("E2E TIMEOUT TEST: PASS"), `driver A reports E2E TIMEOUT TEST: PASS [${scenario}]`);
        check(b.out.includes("E2E TIMEOUT TEST: PASS"), `driver B reports E2E TIMEOUT TEST: PASS [${scenario}]`);

        const dirA = extractRunDir(a.out);
        const dirB = extractRunDir(b.out);
        check(dirA !== null && dirB !== null, `both drivers print a private run dir (A=${dirA} B=${dirB}) [${scenario}]`);
        check(dirA !== dirB, `parallel drivers use DIFFERENT private directories [${scenario}]`);
        check(
          dirA !== null && dirA.startsWith("/tmp/f032-e2e-"),
          `driver A run dir is a fresh mkdtemp path (${dirA}) [${scenario}]`,
        );
        check(
          dirB !== null && dirB.startsWith("/tmp/f032-e2e-"),
          `driver B run dir is a fresh mkdtemp path (${dirB}) [${scenario}]`,
        );

        const pidsA = extractPids(a.out);
        const pidsB = extractPids(b.out);
        check(pidsA.length === 12, `driver A recorded 12 PIDs (got ${pidsA.length}) [${scenario}]`);
        check(pidsB.length === 12, `driver B recorded 12 PIDs (got ${pidsB.length}) [${scenario}]`);
        const overlap = pidsA.filter((p) => pidsB.includes(p));
        check(overlap.length === 0, `PID sets are disjoint — each run read only its own PIDs (overlap: ${overlap.join(", ") || "none"}) [${scenario}]`);

        check(!a.out.includes(LEGACY_PID_FILE), `driver A log never mentions the legacy fixed path [${scenario}]`);
        check(!b.out.includes(LEGACY_PID_FILE), `driver B log never mentions the legacy fixed path [${scenario}]`);
        check(a.out.includes("mode=700"), `driver A private dir validated mode=700 [${scenario}]`);
        check(b.out.includes("mode=700"), `driver B private dir validated mode=700 [${scenario}]`);
        check(a.out.includes("mode=600"), `driver A PID file validated mode=600 [${scenario}]`);
        check(b.out.includes("mode=600"), `driver B PID file validated mode=600 [${scenario}]`);

        // Cleanup: both private directories must be gone.
        check(dirA !== null && !existsSync(dirA), `driver A private dir removed after run (${dirA}) [${scenario}]`);
        check(dirB !== null && !existsSync(dirB), `driver B private dir removed after run (${dirB}) [${scenario}]`);
        check(a.out.includes("removed: true"), `driver A log confirms cleanup (removed: true) [${scenario}]`);
        check(b.out.includes("removed: true"), `driver B log confirms cleanup (removed: true) [${scenario}]`);
      } finally {
        // The planted legacy fixtures must be untouched by either driver.
        const sentinelAfter = sha256(SENTINEL_TARGET);
        check(
          sentinelAfter === sentinelBefore,
          `sentinel target unchanged (sha256 ${sentinelAfter.slice(0, 16)}… == before) [${scenario}]`,
        );
        if (scenario === "symlink") {
          const lst = lstatSync(LEGACY_PID_FILE);
          check(
            lst.isSymbolicLink() && readlinkSync(LEGACY_PID_FILE) === SENTINEL_TARGET,
            `legacy symlink still points at the sentinel target (never replaced) [${scenario}]`,
          );
        } else {
          check(
            lstatSync(LEGACY_PID_FILE).isFile(),
            `legacy regular file still a regular file (never replaced by a symlink) [${scenario}]`,
          );
        }
        // Teardown: remove ONLY the objects we created (dev/ino-verified).
        removeIfOurs(LEGACY_PID_FILE, legacyId, `legacy path [${scenario}]`);
        removeIfOurs(SENTINEL_TARGET, sentinelId, `sentinel target [${scenario}]`);
      }
    }
  } finally {
    // Remove the private test dir only if it is still the directory
    // we created (dev/ino re-verified); leave it and report if not.
    let st;
    try {
      st = statSync(TEST_DIR);
    } catch {
      st = null;
    }
    if (st && st.dev === testDirId.dev && st.ino === testDirId.ino) {
      rmSync(TEST_DIR, { recursive: true, force: true });
      check(!existsSync(TEST_DIR), "private test dir removed in teardown (dev/ino verified)");
    } else {
      check(false, "private test dir REPLACED or vanished — left untouched, investigate");
    }
    check(
      tmpLeftovers().length === 0,
      `no run-dir leftovers in /tmp at end (found: ${tmpLeftovers().join(", ") || "none"})`,
    );
  }
}

try {
  await main();
} catch (e: any) {
  console.log(`F-035 PIDFILE TEST: FAIL — fail-safe abort: ${e?.message ?? e}`);
  process.exit(1);
}

if (failures > 0) {
  console.log(`F-035 PIDFILE TEST: FAIL — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("F-035 PIDFILE TEST: PASS — private per-run dirs, parallel-safe, pre-existing symlink AND regular file untouched, cleanup verified, no leftovers");
