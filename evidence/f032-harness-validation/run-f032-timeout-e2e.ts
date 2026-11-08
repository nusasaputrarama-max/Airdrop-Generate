// F-032 timeout END-TO-END test driver (v2.3.18 — F-034 strict PID
// oracle + F-035 private per-run directory).
//
// Closes the V10 caveat on F-032: the v2.3.16 timeout mechanism was
// verified only in isolation (sleep 30 + 200 ms timeout). This test
// drives the REAL parent harness (run-f029.ts) against a REAL
// hanging child (hang-child.ts) and proves, end to end, that the
// parent:
//   1. times out every hanging child (12 children, --runs 1),
//   2. counts each timeout as a failure (FAIL lines, reason
//      "timeout after 3000 ms"),
//   3. TERMINATES the child (the recorded child PID no longer
//      exists after the parent exits — strict oracle, see below),
//   4. does NOT print "all child runs ok" and exits non-zero,
//   5. prints "parent done: FAILED" and a COUNT MISMATCH (0 of 12
//      records), and emits NO RESULT line.
//
// v2.3.18 (F-034): the v2.3.17 driver treated EVERY exception from
// `process.kill(pid, 0)` as "process is dead" and parsed PID lines
// with a bare `Number(...)`. The liveness check now uses the strict
// oracle in `pid-oracle.ts`: only ESRCH means dead; EPERM means the
// process exists (alive → FAIL); any other error is inconclusive
// (FAIL); a surviving PID is verified by starttime identity from
// `/proc/<pid>/stat` so PID reuse cannot false-pass. The PID file
// is strictly parsed (exactly "<pid> <starttime>" per line, positive
// safe integers, no empty/malformed/duplicate/out-of-range lines),
// and the number of PIDs tested must equal the number of children
// launched (12 == 12).
//
// v2.3.19 (F-036): the liveness gate now uses `verifyPidFile()`
// from pid-oracle.ts — a parse error fails the WHOLE file fast and
// NO liveness assertion runs over partial records (previously the
// driver pushed parse errors but still classified the records that
// did parse). `classifyLiveness()` also validates its own inputs
// now, so a starttime of 0 can never yield "dead".
//
// v2.3.19 (F-035 trust boundary): the driver records the (dev,ino)
// of the exclusively-created PID file and passes them to the child
// via F032_PID_FILE_DEV / F032_PID_FILE_INO. hang-child.ts opens
// the file with O_NOFOLLOW and verifies the descriptor's dev/ino
// against those values before appending, so the write is pinned to
// exactly the file the driver created. Same-UID untrusted processes
// are explicitly OUT of the harness threat model (see hang-child.ts
// header); the fd pinning is defense-in-depth against accidental /
// stale path swaps, not a same-UID isolation claim.
//
// The test uses the harness's own test-only env seam
// (F029_TEST_MODE=1 + F029_CHILD_SCRIPT + F029_CHILD_TIMEOUT_MS=3000);
// the harness logs the seam as active, so the run in the log can
// never be mistaken for a production run. The hanging child is a
// local dummy in this evidence folder only — no production target,
// no artifact, no checkLink.
//
// Usage (from evidence/f032-harness-validation/):
//   bun run-f032-timeout-e2e.ts
// Exit 0 = E2E PASS (all assertions above held); exit 1 = FAIL.
// The full raw output of the driven run-f029.ts invocation is
// printed first, so redirecting stdout captures the complete log.

import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { defaultDeps, verifyPidFile } from "./pid-oracle.ts";

const HERE = import.meta.dir;
const F029_DIR = resolve(HERE, "../f029-memory-methodology");
const HANG_CHILD = join(HERE, "hang-child.ts");
const CHILD_TIMEOUT_MS = 3000;
const OUTER_TIMEOUT_MS = 180_000;

// F-035: one private directory per driver invocation. Created once
// here; removed in the finally block below whatever happens.
const RUN_DIR = mkdtempSync(join(tmpdir(), "f032-e2e-"));

let exitCode = 1;
try {
  exitCode = main();
} catch (e: any) {
  console.log(`E2E TIMEOUT TEST: FAIL — driver threw: ${e?.stack ?? e}`);
  exitCode = 1;
} finally {
  // F-035: cleanup in finally — the private directory (and the PID
  // file inside it) must not survive the run.
  try {
    rmSync(RUN_DIR, { recursive: true, force: true });
  } catch {
    // Best effort; the assertion below reports it.
  }
  console.log(`e2e cleanup: private run dir ${RUN_DIR} removed: ${!existsSync(RUN_DIR)}`);
}
process.exit(exitCode);

function main(): number {
  const failures: string[] = [];
  const check = (cond: boolean, label: string) => {
    console.log(`e2e assert ${cond ? "PASS" : "FAIL"}: ${label}`);
    if (!cond) failures.push(label);
  };

  // F-035: validate the private run directory before any child runs.
  const runDirReal = realpathSync(RUN_DIR);
  const runDirStat = statSync(RUN_DIR);
  const myUid = typeof process.getuid === "function" ? process.getuid() : undefined;
  console.log(`e2e driver pid=${process.pid} bun=${Bun.version}`);
  console.log(
    `private run dir: ${RUN_DIR} (realpath=${runDirReal} mode=${(runDirStat.mode & 0o777).toString(8)} uid=${runDirStat.uid})`,
  );
  check(runDirReal === RUN_DIR, `private run dir realpath matches (no symlink): ${runDirReal}`);
  check((runDirStat.mode & 0o777) === 0o700, `private run dir mode is 700 (got ${(runDirStat.mode & 0o777).toString(8)})`);
  if (myUid !== undefined) {
    check(runDirStat.uid === myUid, `private run dir owned by our uid ${myUid} (got ${runDirStat.uid})`);
  }

  // F-035: create the PID file EXCLUSIVELY (O_CREAT|O_EXCL — fails
  // if the path is a symlink, even a dangling one), mode 0600.
  const PID_FILE = join(RUN_DIR, "hang-child.pid");
  let fd: number;
  try {
    fd = openSync(PID_FILE, "wx", 0o600);
  } catch (e: any) {
    failures.push(`exclusive PID file create failed: ${e?.code ?? e}`);
    console.log(`e2e assert FAIL: PID file created exclusively (error: ${e?.code ?? e})`);
    console.log(`E2E TIMEOUT TEST: FAIL — ${failures.length} assertion(s) failed: ${failures.join("; ")}`);
    return 1;
  }
  const pidFileStat = fstatSync(fd);
  console.log(`pid file: ${PID_FILE} (mode=${(pidFileStat.mode & 0o777).toString(8)} regular=${pidFileStat.isFile()} dev=${pidFileStat.dev} ino=${pidFileStat.ino})`);
  check(pidFileStat.isFile(), `PID file is a regular file`);
  check((pidFileStat.mode & 0o777) === 0o600, `PID file mode is 600 (got ${(pidFileStat.mode & 0o777).toString(8)})`);
  closeSync(fd);
  // F-035 (v2.3.19): pin the child writer to EXACTLY this file —
  // its (dev,ino) travel to hang-child.ts via env (inherited by
  // run-f029.ts when it spawns the child).
  const PID_FILE_DEV = String(pidFileStat.dev);
  const PID_FILE_INO = String(pidFileStat.ino);

  console.log(`driving: bun run-f029.ts --runs 1 (cwd=${F029_DIR})`);
  console.log(
    `test seam: F029_TEST_MODE=1 F029_CHILD_SCRIPT=${HANG_CHILD} F029_CHILD_TIMEOUT_MS=${CHILD_TIMEOUT_MS}`,
  );

  const driven = spawnSync(
    process.execPath,
    ["run-f029.ts", "--runs", "1"],
    {
      cwd: F029_DIR,
      env: {
        ...process.env,
        F029_TEST_MODE: "1",
        F029_CHILD_SCRIPT: HANG_CHILD,
        F029_CHILD_TIMEOUT_MS: String(CHILD_TIMEOUT_MS),
        F032_PID_FILE: PID_FILE,
        F032_PID_FILE_DEV: PID_FILE_DEV,
        F032_PID_FILE_INO: PID_FILE_INO,
      },
      encoding: "utf8",
      timeout: OUTER_TIMEOUT_MS,
    },
  );
  const out = ((driven.stdout ?? "") as string) + ((driven.stderr ?? "") as string);
  console.log("--- driven run-f029.ts raw output (begin) ---");
  console.log(out.trimEnd());
  console.log("--- driven run-f029.ts raw output (end) ---");
  console.log(`driven exit status=${driven.status} signal=${driven.signal} error=${(driven as any).error?.code ?? "none"}`);

  // Assertions.
  const failLines = out.split("\n").filter((l) => l.startsWith("FAIL "));
  const timeoutFails = failLines.filter((l) => l.includes(`timeout after ${CHILD_TIMEOUT_MS} ms`));
  const resultLines = out.split("\n").filter((l) => l.startsWith("RESULT "));

  check(driven.status === 1, `driven run exits 1 (got status=${driven.status})`);
  check(failLines.length === 12, `12 FAIL lines for 12 hanging children (got ${failLines.length})`);
  check(timeoutFails.length === 12, `all 12 FAILs are timeouts after ${CHILD_TIMEOUT_MS} ms (got ${timeoutFails.length})`);
  check(out.includes("parent done: FAILED"), `parent prints "parent done: FAILED"`);
  check(!out.includes("all child runs ok"), `parent does NOT print "all child runs ok"`);
  check(out.includes("COUNT MISMATCH"), `parent prints COUNT MISMATCH (0 of 12 records)`);
  check(resultLines.length === 0, `no RESULT line emitted (got ${resultLines.length})`);
  check(out.includes("test-seam:"), `parent logs the test-seam override line`);
  check(out.includes("preflight: all fixture byte counts verified exact"), `preflight still ran and passed before the hanging children`);

  // F-034/F-036: the hanging children must have been TERMINATED by
  // the parent. The WHOLE PID file is verified by verifyPidFile():
  // ANY parse error (including a starttime of 0) fails the file
  // fast and NO liveness assertion runs at all; the record count
  // must equal the number of children launched; only a strict
  // "dead" verdict (ESRCH / exited / PID-reused) on EVERY record
  // satisfies the assertion — "alive" or "inconclusive" on any
  // record fails it.
  if (!existsSync(PID_FILE)) {
    failures.push("hang-child never wrote its PID file");
    console.log("e2e assert FAIL: hang-child wrote its PID file (missing)");
  } else {
    const result = verifyPidFile(readFileSync(PID_FILE, "utf8"), failLines.length, defaultDeps());
    for (const v of result.verdicts) {
      console.log(`e2e liveness pid=${v.pid} starttime=${v.starttime}: ${v.liveness.verdict} (${v.liveness.reason})`);
      if (v.liveness.verdict === "alive") {
        // Clean up the leaked child so the test never leaves a hang behind.
        try {
          process.kill(v.pid, "SIGKILL");
        } catch {
          /* already gone */
        }
      }
    }
    if (result.verdicts.length === 0) {
      console.log(
        `e2e: NO liveness verdicts — file failed fast (${result.errors.join("; ") || "no records"})`,
      );
    } else {
      console.log(
        `e2e: hang-child recorded ${result.verdicts.length} pid(s): ${result.verdicts.map((v) => v.pid).join(", ")}`,
      );
    }
    for (const e of result.errors) {
      failures.push(`pid file verification: ${e}`);
      console.log(`e2e assert FAIL: pid file verifies strictly (${e})`);
    }
    check(
      result.ok,
      `all ${failLines.length} hanging children terminated by parent (verifyPidFile ok)`,
    );
  }

  if (failures.length > 0) {
    console.log(`E2E TIMEOUT TEST: FAIL — ${failures.length} assertion(s) failed: ${failures.join("; ")}`);
    return 1;
  }
  console.log("E2E TIMEOUT TEST: PASS — parent timed out, killed, and failed all 12 hanging children with no success line");
  return 0;
}
