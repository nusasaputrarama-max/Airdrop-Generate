// Regression test for F-035 (v2.3.18): the E2E PID file must live
// in a private per-run directory — never at a fixed /tmp path.
//
// Proves, per audit V11 §6 F-035 and §11 item 2:
//   1. A symlink pre-planted at the OLD fixed path
//      (/tmp/f032-hang-child.pid) is never followed: its target
//      file is byte-identical before and after the runs.
//   2. Two driver invocations running IN PARALLEL each use their
//      own private directory (different mkdtemp paths), each reads
//      only its own 12 PIDs (the two PID sets are disjoint), and
//      both PASS.
//   3. Cleanup: both private directories are gone after the drivers
//      exit.
//   4. Neither driver log mentions the legacy fixed path at all.
//
// The drivers run the full E2E (12 hanging children x 3 s timeout
// each); two in parallel take ~40 s total.
//
// Usage (from evidence/f032-harness-validation/):
//   bun test-f035-pidfile.ts
// Exit 0 = all assertions PASS; exit 1 = FAIL.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";

const LEGACY_PID_FILE = "/tmp/f032-hang-child.pid";
const SENTINEL_TARGET = "/tmp/f035-sentinel-target.txt";
const SENTINEL_CONTENT = "F-035 sentinel — this file must never change\n";

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

async function main() {
  // Setup: plant the symlink at the OLD fixed path.
  for (const p of [LEGACY_PID_FILE, SENTINEL_TARGET]) {
    try {
      rmSync(p, { force: true });
    } catch {
      /* ignore */
    }
  }
  writeFileSync(SENTINEL_TARGET, SENTINEL_CONTENT);
  symlinkSync(SENTINEL_TARGET, LEGACY_PID_FILE);
  const sentinelBefore = sha256(SENTINEL_TARGET);
  console.log(`f035 setup: symlink ${LEGACY_PID_FILE} -> ${SENTINEL_TARGET} (sha256 ${sentinelBefore.slice(0, 16)}…)`);
  check(lstatSync(LEGACY_PID_FILE).isSymbolicLink(), "legacy path is a symlink before the runs");

  try {
    // Two drivers in parallel.
    const [a, b] = await Promise.all([runDriver(), runDriver()]);

    check(a.status === 0, `driver A exits 0 (got ${a.status})`);
    check(b.status === 0, `driver B exits 0 (got ${b.status})`);
    check(a.out.includes("E2E TIMEOUT TEST: PASS"), "driver A reports E2E TIMEOUT TEST: PASS");
    check(b.out.includes("E2E TIMEOUT TEST: PASS"), "driver B reports E2E TIMEOUT TEST: PASS");

    const dirA = extractRunDir(a.out);
    const dirB = extractRunDir(b.out);
    check(dirA !== null && dirB !== null, `both drivers print a private run dir (A=${dirA} B=${dirB})`);
    check(dirA !== dirB, "parallel drivers use DIFFERENT private directories");
    check(
      dirA !== null && dirA.startsWith("/tmp/f032-e2e-"),
      `driver A run dir is a fresh mkdtemp path (${dirA})`,
    );
    check(
      dirB !== null && dirB.startsWith("/tmp/f032-e2e-"),
      `driver B run dir is a fresh mkdtemp path (${dirB})`,
    );

    const pidsA = extractPids(a.out);
    const pidsB = extractPids(b.out);
    check(pidsA.length === 12, `driver A recorded 12 PIDs (got ${pidsA.length})`);
    check(pidsB.length === 12, `driver B recorded 12 PIDs (got ${pidsB.length})`);
    const overlap = pidsA.filter((p) => pidsB.includes(p));
    check(overlap.length === 0, `PID sets are disjoint — each run read only its own PIDs (overlap: ${overlap.join(", ") || "none"})`);

    check(!a.out.includes(LEGACY_PID_FILE), "driver A log never mentions the legacy fixed path");
    check(!b.out.includes(LEGACY_PID_FILE), "driver B log never mentions the legacy fixed path");
    check(a.out.includes("mode=700"), "driver A private dir validated mode=700");
    check(b.out.includes("mode=700"), "driver B private dir validated mode=700");
    check(a.out.includes("mode=600"), "driver A PID file validated mode=600");
    check(b.out.includes("mode=600"), "driver B PID file validated mode=600");

    // Cleanup: both private directories must be gone.
    check(dirA !== null && !existsSync(dirA), `driver A private dir removed after run (${dirA})`);
    check(dirB !== null && !existsSync(dirB), `driver B private dir removed after run (${dirB})`);
    check(a.out.includes("removed: true"), "driver A log confirms cleanup (removed: true)");
    check(b.out.includes("removed: true"), "driver B log confirms cleanup (removed: true)");
  } finally {
    // The symlink target must be untouched by either driver.
    const sentinelAfter = sha256(SENTINEL_TARGET);
    check(
      sentinelAfter === sentinelBefore,
      `symlink target unchanged (sha256 ${sentinelAfter.slice(0, 16)}… == before)`,
    );
    check(
      lstatSync(LEGACY_PID_FILE).isSymbolicLink() &&
        readlinkSync(LEGACY_PID_FILE) === SENTINEL_TARGET,
      "legacy symlink still points at the sentinel target (never replaced)",
    );
    // Teardown: leave /tmp clean.
    rmSync(LEGACY_PID_FILE, { force: true });
    rmSync(SENTINEL_TARGET, { force: true });
    check(!existsSync(LEGACY_PID_FILE), "legacy symlink removed in teardown");
  }
}

await main();

if (failures > 0) {
  console.log(`F-035 PIDFILE TEST: FAIL — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("F-035 PIDFILE TEST: PASS — private per-run dirs, parallel-safe, symlink target untouched, cleanup verified");
