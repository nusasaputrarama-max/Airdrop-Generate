// Regression tests for the tightened F-029 test seam (U-72, v2.3.18).
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
//     (run-f032-timeout-e2e-v2318.txt, 3000 ms timeout, driver PASS).
//
// All rejection cases fail FAST (exit 2 before preflight/children).
// No CI workflow is added by this revision — deliberately, per the
// audit: no workflow may execute untrusted PR input without a
// threat model.
//
// Usage (from evidence/f029-memory-methodology/):
//   bun test-u72-seam.ts
// Exit 0 = all assertions PASS; exit 1 = FAIL.

import { spawnSync } from "node:child_process";
import { existsSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const HERE = import.meta.dir;
const HANG_CHILD = resolve(HERE, "../f032-harness-validation/hang-child.ts");
const EVIL = "/tmp/u72-evil-child.ts";
const LINK = "/tmp/u72-link-to-hang-child.ts";
const PIDFILE = "/tmp/u72-pidfile.txt";

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

// Fixtures for the rejection cases: a real script outside the
// evidence tree, and a symlink pointing at the approved fixture.
writeFileSync(EVIL, 'console.log("evil child — must never run");\n');
if (existsSync(LINK)) rmSync(LINK, { force: true });
symlinkSync(HANG_CHILD, LINK);

try {
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
  r = run({ F029_TEST_MODE: "1", F029_CHILD_SCRIPT: "/tmp/u72-does-not-exist.ts" });
  check(r.status === 2, `nonexistent path in test mode → exit 2 (got ${r.status})`);

  // 7. Existing non-script file, in test mode → exit 2.
  r = run({ F029_TEST_MODE: "1", F029_CHILD_SCRIPT: "/etc/passwd" });
  check(r.status === 2, `non-script file in test mode → exit 2 (got ${r.status})`);

  // 8. ACCEPTANCE: approved fixture in test mode passes the gate.
  // hang-child + 100 ms timeout: 12 children time out fast, exit 1
  // (NOT 2), with the test-seam line — proving the gate lets the
  // approved fixture through. hang-child needs a valid PID file
  // (regular file, mode 0600, same uid — its own F-035 validation),
  // so one is created here first.
  writeFileSync(PIDFILE, "", { mode: 0o600 });
  r = run({
    F029_TEST_MODE: "1",
    F029_CHILD_SCRIPT: HANG_CHILD,
    F029_CHILD_TIMEOUT_MS: "100",
    F032_PID_FILE: PIDFILE,
  });
  check(r.status === 1, `approved fixture in test mode → proceeds (exit 1 from timeouts, got ${r.status})`);
  check(r.out.includes("test-seam:"), "approved fixture run logs the test-seam line");
  const timeoutFails = r.out.split("\n").filter((l) => l.startsWith("FAIL ") && l.includes("timeout after 100 ms"));
  check(timeoutFails.length === 12, `approved fixture run: 12 timeout FAILs after 100 ms (got ${timeoutFails.length})`);
  check(r.out.includes("parent done: FAILED"), "approved fixture run prints parent done: FAILED");
} finally {
  rmSync(EVIL, { force: true });
  rmSync(LINK, { force: true });
  rmSync(PIDFILE, { force: true });
}

if (failures > 0) {
  console.log(`U-72 SEAM TEST: FAIL — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("U-72 SEAM TEST: PASS — overrides refused without explicit test mode, arbitrary/symlink paths refused, approved fixture accepted");
