// F-029 parent harness (v2.3.17, F-033 fix + F-032 timeout E2E seam):
// runs pattern A and pattern B as SEPARATE PROCESSES (one child per
// run, new PID, clean baseline each time) and aggregates the OS
// high-water mark (VmHWM) deltas.
//
// Spawning uses node:child_process.spawnSync with process.execPath
// (the SAME Bun binary as the parent) — NOT Bun.spawnSync. Run from
// the evidence/f029-memory-methodology/ directory (cwd) so the child
// script resolves as ./exp-pattern.ts.
//
// Usage (run once per Bun version; the parent spawns children with the
// SAME Bun binary via process.execPath, identical flags/env, identical
// input):
//   bun run-f029.ts --runs 5
//
//   --runs N is REQUIRED and must be an integer in the approved range
//   1..10 (F-032). 0, negative, NaN, non-numeric, missing value, or a
//   missing flag all exit non-zero WITHOUT printing
//   "all child runs ok" — a zero-run invocation can never look like
//   success. Each child has a 120 s timeout; a child that times out or
//   dies by signal counts as a failure.
//
// v2.3.17 (F-033): BEFORE spawning any measured child, the parent
// runs preflight-fixture.ts in its own process (same Bun binary).
// The preflight is the independent byte proof: it measures every
// fixture segment with TextEncoder and asserts exact per-segment /
// total bytes (cap-1/cap/cap+1). If the preflight fails, the parent
// aborts with exit 1 and NO child is spawned — a measured run can
// never proceed on an unverified fixture. The parent also asserts
// every RESULT carries encoderInMeasuredPhase === false, proving no
// measured child allocated a full-segment encoder buffer.
//
// TEST-ONLY SEAM (F-032 timeout E2E, see
// evidence/f032-harness-validation/run-f032-timeout-e2e.txt):
//   F029_TEST_MODE=1                  — explicit test mode; REQUIRED
//     for either override below to be honored (U-72, v2.3.18).
//   F029_CHILD_SCRIPT=<path>        — spawn this script instead of
//     exp-pattern.ts (the E2E test points it at hang-child.ts).
//     Only an approved fixture (exp-pattern.ts or hang-child.ts,
//     realpath, no symlinks, inside the evidence tree) is accepted.
//   F029_CHILD_TIMEOUT_MS=<ms>      — child timeout override, integer
//     100..120000 (default 120000). The E2E test uses 3000.
// Overrides without F029_TEST_MODE=1, symlinks, or paths outside
// the approved fixtures all exit 2 before any child spawns. When
// set, the parent prints an explicit "test-seam:" line in the log
// so an overridden run can never be mistaken for a production run.
// Production runs NEVER set these variables.
//
// Output: full raw log on stdout (redirect to run-<version>-f033.txt)
// + a summary table with median + range per combination. Forced-GC and
// natural-GC runs are reported separately and never mixed.
//
// v2.3.16 (F-032): the parent now asserts records.length ===
// expectedRuns, asserts every combination has exactly RUNS records,
// validates every RESULT against the requested pattern/fixture/GC,
// validates the measured byte totals (ascii and nonascii-bytes must be
// exactly 1,000,000 UTF-8 bytes; nonascii must be exactly 1,999,939),
// and fails on child timeout/signal instead of silently skipping.

import { spawnSync } from "node:child_process";
import { lstatSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

const MAX_RUNS = 10; // approved range for --runs: 1..10
const DEFAULT_CHILD_TIMEOUT_MS = 120_000;

// TEST-ONLY SEAM (F-032 E2E), tightened v2.3.18 (U-72): an override
// is honored ONLY when explicit test mode is active
// (F029_TEST_MODE=1) AND the child script resolves (realpath, no
// symlinks) to an APPROVED fixture inside the evidence tree
// (exp-pattern.ts or hang-child.ts). Any override without explicit
// test mode, any symlink, any path outside the evidence tree, or
// any unapproved script → exit 2 BEFORE any child spawns.
// Production runs never set these variables.
const TEST_MODE = process.env.F029_TEST_MODE === "1";

function seamFail(msg: string): never {
  console.error(`run-f029: ERROR: ${msg}`);
  process.exit(2);
}

function resolveChildScript(): string {
  const override = process.env.F029_CHILD_SCRIPT;
  if (override === undefined) return "exp-pattern.ts";
  if (!TEST_MODE) {
    seamFail(
      "F029_CHILD_SCRIPT requires F029_TEST_MODE=1 (explicit test mode); refusing to run an overridden child script",
    );
  }
  let lst;
  try {
    lst = lstatSync(override);
  } catch {
    seamFail(`F029_CHILD_SCRIPT does not exist: ${JSON.stringify(override)}`);
  }
  if (lst.isSymbolicLink()) {
    seamFail(`F029_CHILD_SCRIPT must not be a symlink: ${JSON.stringify(override)}`);
  }
  let real: string;
  try {
    real = realpathSync(override);
  } catch {
    seamFail(`F029_CHILD_SCRIPT does not resolve: ${JSON.stringify(override)}`);
  }
  // Allowlist: canonical realpaths of the two approved fixtures.
  // realpathSync on the allowlist entries themselves, so a fixture
  // that is itself a symlink resolves to its target and the check
  // still compares canonical paths.
  const approved = new Set(
    [
      resolve(import.meta.dir, "exp-pattern.ts"),
      resolve(import.meta.dir, "../f032-harness-validation/hang-child.ts"),
    ].map((p) => {
      try {
        return realpathSync(p);
      } catch {
        return p;
      }
    }),
  );
  if (!approved.has(real)) {
    seamFail(
      `F029_CHILD_SCRIPT realpath ${real} is not an approved fixture (allowed: ${[...approved].join(", ")}); refusing to run an arbitrary child script`,
    );
  }
  return real;
}

const CHILD_SCRIPT = resolveChildScript();
let CHILD_TIMEOUT_MS = DEFAULT_CHILD_TIMEOUT_MS;
if (process.env.F029_CHILD_TIMEOUT_MS !== undefined) {
  if (!TEST_MODE) {
    seamFail("F029_CHILD_TIMEOUT_MS requires F029_TEST_MODE=1 (explicit test mode)");
  }
  const raw = process.env.F029_CHILD_TIMEOUT_MS;
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 100 || Number(raw) > DEFAULT_CHILD_TIMEOUT_MS) {
    console.error(`run-f029: ERROR: F029_CHILD_TIMEOUT_MS must be an integer 100..${DEFAULT_CHILD_TIMEOUT_MS}, got ${JSON.stringify(raw)}`);
    process.exit(2);
  }
  CHILD_TIMEOUT_MS = Number(raw);
}
const TEST_SEAM_ACTIVE =
  process.env.F029_CHILD_SCRIPT !== undefined ||
  process.env.F029_CHILD_TIMEOUT_MS !== undefined;

function usageFail(msg: string): never {
  console.error(`run-f029: ERROR: ${msg}`);
  console.error(`usage: bun run-f029.ts --runs N   (N = integer, ${1}..${MAX_RUNS}; required)`);
  process.exit(2);
}

function parseRuns(): number {
  const argv = process.argv.slice(2);
  let raw: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--runs") {
      if (i + 1 >= argv.length) usageFail("--runs requires a value");
      raw = argv[i + 1];
      break;
    }
    if (argv[i].startsWith("--runs=")) {
      raw = argv[i].slice("--runs=".length);
      break;
    }
  }
  if (raw === undefined) usageFail("--runs is required (no default — a missing argument must not silently run)");
  if (!/^\d+$/.test(raw)) usageFail(`--runs must be a positive integer, got ${JSON.stringify(raw)}`);
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_RUNS) {
    usageFail(`--runs out of approved range 1..${MAX_RUNS}, got ${n}`);
  }
  return n;
}

const RUNS = parseRuns();
const PATTERNS = ["A", "B"];
const FIXTURES = ["ascii", "nonascii", "nonascii-bytes"];
const GCS = ["forced", "natural"];
const EXPECTED_RUNS = PATTERNS.length * FIXTURES.length * GCS.length * RUNS;

// Expected MEASURED UTF-8 byte totals per fixture at the default
// 1,000,000-byte target (F-031): ascii and nonascii-bytes are exactly
// 1,000,000; nonascii (char-matched, 1,000,000 chars of U+00E9 plus
// 61 ASCII marker bytes) is exactly 1,999,939.
const EXPECTED_BYTES: Record<string, number> = {
  ascii: 1_000_000,
  "nonascii": 1_999_939,
  "nonascii-bytes": 1_000_000,
};

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

console.log(`parent pid=${process.pid} bun=${Bun.version} execPath=${process.execPath}`);
console.log(`matrix: patterns=${PATTERNS.join(",")} fixtures=${FIXTURES.join(",")} gc=${GCS.join(",")} runs=${RUNS} per combination`);
console.log(`total child runs: ${EXPECTED_RUNS}`);
console.log(`child: script=${CHILD_SCRIPT} timeoutMs=${CHILD_TIMEOUT_MS}`);
if (TEST_SEAM_ACTIVE) {
  console.log(`test-seam: F029_TEST_MODE=1, F029_CHILD_SCRIPT/F029_CHILD_TIMEOUT_MS override ACTIVE (test-only; this is NOT a production run)`);
}

// v2.3.17 (F-033): run the independent byte preflight FIRST, in its
// own process. If it fails, abort before any measured child spawns.
{
  const pre = spawnSync(process.execPath, ["preflight-fixture.ts"], { encoding: "utf8", timeout: 120_000 });
  console.log("--- preflight-fixture.ts ---");
  console.log(((pre.stdout ?? "") as string).trimEnd());
  if ((pre.stderr ?? "") !== "") console.log((pre.stderr as string).trimEnd());
  if ((pre as any).error || pre.status !== 0) {
    console.log(`PREFLIGHT FAILED — aborting, no measured child runs started (error=${(pre as any).error?.code ?? "none"} status=${pre.status})`);
    console.log("parent done: FAILED — preflight fixture not verified");
    process.exit(1);
  }
  console.log("--- preflight ok, starting measured children ---");
}

type Rec = { pattern: string; fixture: string; gc: string; run: number; pid: number; result: any };
const records: Rec[] = [];
const seenPids = new Set<number>();
let failures = 0;

for (const pattern of PATTERNS) {
  for (const fixture of FIXTURES) {
    for (const gc of GCS) {
      for (let run = 1; run <= RUNS; run++) {
        const args = [CHILD_SCRIPT, "--pattern", pattern, "--fixture", fixture, "--gc", gc];
        const child = spawnSync(process.execPath, args, { encoding: "utf8", timeout: CHILD_TIMEOUT_MS });
        const out = (child.stdout ?? "") as string;
        const err = (child.stderr ?? "") as string;
        const resultLine = out.split("\n").find((l) => l.startsWith("RESULT "));
        // F-032: timeout / signal / non-zero exit / missing RESULT are
        // all failures — never a silent skip.
        if ((child as any).error || child.status === null || child.status !== 0 || !resultLine) {
          failures++;
          const reason = (child as any).error?.code === "ETIMEDOUT"
            ? `timeout after ${CHILD_TIMEOUT_MS} ms`
            : child.signal
              ? `killed by signal ${child.signal}`
              : `status=${child.status}`;
          console.log(`FAIL pattern=${pattern} fixture=${fixture} gc=${gc} run=${run} reason=${reason}`);
          console.log(out);
          console.log(err);
          continue;
        }
        let result: any;
        try {
          result = JSON.parse(resultLine.slice("RESULT ".length));
        } catch (e) {
          failures++;
          console.log(`FAIL pattern=${pattern} fixture=${fixture} gc=${gc} run=${run} reason=unparsable RESULT`);
          console.log(out);
          continue;
        }
        // F-032: validate the RESULT against the requested parameters.
        const mismatch: string[] = [];
        if (result.pattern !== pattern) mismatch.push(`pattern ${result.pattern} != ${pattern}`);
        if (result.fixture !== fixture) mismatch.push(`fixture ${result.fixture} != ${fixture}`);
        if (result.gc !== gc) mismatch.push(`gc ${result.gc} != ${gc}`);
        if (result.bun !== Bun.version) mismatch.push(`bun ${result.bun} != parent ${Bun.version}`);
        if (result.asksConnect !== true) mismatch.push(`asksConnect ${result.asksConnect} != true`);
        if (typeof result.utf8Bytes !== "number" || result.utf8Bytes !== EXPECTED_BYTES[fixture]) {
          mismatch.push(`utf8Bytes ${result.utf8Bytes} != expected ${EXPECTED_BYTES[fixture]} (fixture ${fixture})`);
        }
        if (typeof result.segmentBytes !== "object" || result.segmentBytes === null
          || result.segmentBytes.page + result.segmentBytes.script1 + result.segmentBytes.script2 !== result.utf8Bytes) {
          mismatch.push(`segmentBytes do not sum to utf8Bytes`);
        }
        if (typeof result.vmHwmDelta !== "number" || result.vmHwmDelta < 0) {
          mismatch.push(`vmHwmDelta ${result.vmHwmDelta} is not a non-negative number`);
        }
        // F-033: the measured child must prove it allocated no
        // full-segment encoder buffer in the measured phase.
        if (result.encoderInMeasuredPhase !== false) {
          mismatch.push(`encoderInMeasuredPhase ${result.encoderInMeasuredPhase} != false (F-033)`);
        }
        if (result.byteProof !== "preflight+arithmetic") {
          mismatch.push(`byteProof ${JSON.stringify(result.byteProof)} != "preflight+arithmetic" (F-033)`);
        }
        if (mismatch.length > 0) {
          failures++;
          console.log(`FAIL pattern=${pattern} fixture=${fixture} gc=${gc} run=${run} reason=RESULT validation: ${mismatch.join("; ")}`);
          continue;
        }
        if (seenPids.has(result.pid)) {
          failures++;
          console.log(`FAIL duplicate pid ${result.pid} pattern=${pattern} fixture=${fixture} gc=${gc} run=${run}`);
          continue;
        }
        seenPids.add(result.pid);
        records.push({ pattern, fixture, gc, run, pid: result.pid, result });
        console.log(`--- child run pattern=${pattern} fixture=${fixture} gc=${gc} run=${run} pid=${result.pid} exit=0 ---`);
        console.log(out.trimEnd());
      }
    }
  }
}

// F-032: assert the record count and per-combination completeness
// before printing any success claim.
let countOk = records.length === EXPECTED_RUNS && seenPids.size === records.length;
const incomplete: string[] = [];
for (const pattern of PATTERNS) {
  for (const fixture of FIXTURES) {
    for (const gc of GCS) {
      const n = records.filter((r) => r.pattern === pattern && r.fixture === fixture && r.gc === gc).length;
      if (n !== RUNS) incomplete.push(`${pattern}/${fixture}/${gc}: ${n} of ${RUNS}`);
    }
  }
}
if (incomplete.length > 0) {
  countOk = false;
  console.log(`COUNT MISMATCH: expected ${EXPECTED_RUNS} records (${RUNS} per combination), got ${records.length}; incomplete: ${incomplete.join("; ")}`);
}

console.log("");
console.log(`SUMMARY bun=${Bun.version} runs-per-combination=${RUNS} child-failures=${failures} distinct-child-pids=${seenPids.size} of ${records.length}`);
console.log("metric = delta vs that child's own clean baseline (bytes). vmHwm = OS high-water RSS from /proc/self/status.");
console.log("pattern | fixture | gc | n | vmHwmDelta median [min..max] | rssDelta median [min..max] | heapUsedDelta median [min..max] | externalDelta median [min..max] | asksConnect");
for (const pattern of PATTERNS) {
  for (const fixture of FIXTURES) {
    for (const gc of GCS) {
      const rs = records.filter((r) => r.pattern === pattern && r.fixture === fixture && r.gc === gc);
      if (rs.length === 0) {
        console.log(`${pattern} | ${fixture} | ${gc} | 0 | NO DATA`);
        continue;
      }
      const col = (k: string) => rs.map((r) => r.result[k] as number);
      const rng = (xs: number[]) => `[${fmt(Math.min(...xs))}..${fmt(Math.max(...xs))}]`;
      const allFound = rs.every((r) => r.result.asksConnect === true);
      console.log(
        `${pattern} | ${fixture} | ${gc} | ${rs.length} | vmHwm ${fmt(median(col("vmHwmDelta")))} ${rng(col("vmHwmDelta"))} | rss ${fmt(median(col("rssDelta")))} ${rng(col("rssDelta"))} | heapUsed ${fmt(median(col("heapUsedDelta")))} ${rng(col("heapUsedDelta"))} | external ${fmt(median(col("externalDelta")))} ${rng(col("externalDelta"))} | ${allFound ? "true (all runs)" : "MIXED/FAIL"}`
      );
    }
  }
}

// A-vs-B ratio on the primary metric (VmHWM delta), per fixture+gc, median-based.
console.log("");
console.log("RATIO A/B (median vmHwmDelta, same fixture+gc; >1 means pattern A peaked higher than B):");
for (const fixture of FIXTURES) {
  for (const gc of GCS) {
    const a = records.filter((r) => r.pattern === "A" && r.fixture === fixture && r.gc === gc).map((r) => r.result.vmHwmDelta as number);
    const b = records.filter((r) => r.pattern === "B" && r.fixture === fixture && r.gc === gc).map((r) => r.result.vmHwmDelta as number);
    if (a.length && b.length) {
      const ratio = median(a) / median(b);
      console.log(`${fixture} | ${gc} | A median vmHwm ${fmt(median(a))} / B median vmHwm ${fmt(median(b))} = ${ratio.toFixed(2)}x (A range ${fmt(Math.min(...a))}..${fmt(Math.max(...a))}; B range ${fmt(Math.min(...b))}..${fmt(Math.max(...b))})`);
    } else {
      console.log(`${fixture} | ${gc} | NO DATA for ratio`);
    }
  }
}
console.log("");
// F-032: the success line is printed ONLY when every check passed —
// zero failures, exact record count, every combination complete.
if (failures === 0 && countOk) {
  console.log("parent done: all child runs ok");
} else {
  console.log(`parent done: FAILED — ${failures} child failure(s), ${records.length} of ${EXPECTED_RUNS} records, count-ok=${countOk}`);
  process.exit(1);
}
