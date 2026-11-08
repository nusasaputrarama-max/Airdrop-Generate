// F-032 timeout END-TO-END test driver (v2.3.17).
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
//      exists after the parent exits — kill(pid, 0) throws),
//   4. does NOT print "all child runs ok" and exits non-zero,
//   5. prints "parent done: FAILED" and a COUNT MISMATCH (0 of 12
//      records), and emits NO RESULT line.
//
// The test uses the harness's own test-only env seam
// (F029_CHILD_SCRIPT + F029_CHILD_TIMEOUT_MS=3000); the harness
// logs the seam as active, so the run in the log can never be
// mistaken for a production run. The hanging child is a local dummy
// in this evidence folder only — no production target, no artifact,
// no checkLink.
//
// Usage (from evidence/f032-harness-validation/):
//   bun run-f032-timeout-e2e.ts
// Exit 0 = E2E PASS (all assertions above held); exit 1 = FAIL.
// The full raw output of the driven run-f029.ts invocation is
// printed first, so redirecting stdout captures the complete log.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const HERE = import.meta.dir;
const F029_DIR = resolve(HERE, "../f029-memory-methodology");
const HANG_CHILD = join(HERE, "hang-child.ts");
const PID_FILE = "/tmp/f032-hang-child.pid";
const CHILD_TIMEOUT_MS = 3000;
const OUTER_TIMEOUT_MS = 180_000;

if (existsSync(PID_FILE)) rmSync(PID_FILE);

console.log(`e2e driver pid=${process.pid} bun=${Bun.version}`);
console.log(`driving: bun run-f029.ts --runs 1 (cwd=${F029_DIR})`);
console.log(`test seam: F029_CHILD_SCRIPT=${HANG_CHILD} F029_CHILD_TIMEOUT_MS=${CHILD_TIMEOUT_MS}`);
console.log(`hang-child pid file: ${PID_FILE}`);

const driven = spawnSync(
  process.execPath,
  ["run-f029.ts", "--runs", "1"],
  {
    cwd: F029_DIR,
    env: {
      ...process.env,
      F029_CHILD_SCRIPT: HANG_CHILD,
      F029_CHILD_TIMEOUT_MS: String(CHILD_TIMEOUT_MS),
      F032_PID_FILE: PID_FILE,
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
const failures: string[] = [];
const check = (cond: boolean, label: string) => {
  console.log(`e2e assert ${cond ? "PASS" : "FAIL"}: ${label}`);
  if (!cond) failures.push(label);
};

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

// The hanging children must have been TERMINATED by the parent:
// EVERY recorded PID must no longer exist.
let childPids: number[] = [];
if (!existsSync(PID_FILE)) {
  failures.push("hang-child never wrote its PID file");
  console.log("e2e assert FAIL: hang-child wrote its PID file (missing)");
} else {
  childPids = readFileSync(PID_FILE, "utf8").split("\n").filter(Boolean).map(Number);
  console.log(`e2e: hang-child recorded ${childPids.length} pid(s): ${childPids.join(", ")}`);
  check(childPids.length === 12, `all 12 hanging children recorded a PID (got ${childPids.length})`);
  const leaked: number[] = [];
  for (const pid of childPids) {
    let stillAlive = false;
    try {
      process.kill(pid, 0);
      stillAlive = true;
    } catch {
      stillAlive = false; // ESRCH: no such process — the parent killed it.
    }
    if (stillAlive) {
      // Clean up the leaked child so the test never leaves a hang behind.
      try { process.kill(pid, "SIGKILL"); } catch { /* already gone */ }
      leaked.push(pid);
    }
  }
  check(leaked.length === 0, `all ${childPids.length} hanging children terminated by parent (leaked: ${leaked.join(", ") || "none"})`);
}

if (failures.length > 0) {
  console.log(`E2E TIMEOUT TEST: FAIL — ${failures.length} assertion(s) failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("E2E TIMEOUT TEST: PASS — parent timed out, killed, and failed all 12 hanging children with no success line");
