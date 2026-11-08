// F-029 parent harness: runs pattern A and pattern B as SEPARATE PROCESSES
// (one child per run, new PID, clean baseline each time) and aggregates
// the OS high-water mark (VmHWM) deltas.
//
// Usage (run once per Bun version; the parent spawns children with the
// SAME Bun binary via process.execPath, identical flags/env, identical
// input):
//   bun run-f029.ts --runs 5
//
// Output: full raw log on stdout (redirect to run-<version>-f029.txt) +
// a summary table with median + range per combination. Forced-GC and
// natural-GC runs are reported separately and never mixed.

import { spawnSync } from "node:child_process";

const RUNS = Number(process.argv.slice(2).find((a, i, arr) => arr[i - 1] === "--runs") ?? 5);
const PATTERNS = ["A", "B"];
const FIXTURES = ["ascii", "nonascii", "nonascii-bytes"];
const GCS = ["forced", "natural"];

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
console.log(`total child runs: ${PATTERNS.length * FIXTURES.length * GCS.length * RUNS}`);

type Rec = { pattern: string; fixture: string; gc: string; run: number; pid: number; result: any };
const records: Rec[] = [];
const seenPids = new Set<number>();
let failures = 0;

for (const pattern of PATTERNS) {
  for (const fixture of FIXTURES) {
    for (const gc of GCS) {
      for (let run = 1; run <= RUNS; run++) {
        const args = ["exp-pattern.ts", "--pattern", pattern, "--fixture", fixture, "--gc", gc];
        const child = spawnSync(process.execPath, args, { encoding: "utf8" });
        const out = (child.stdout ?? "") as string;
        const err = (child.stderr ?? "") as string;
        const resultLine = out.split("\n").find((l) => l.startsWith("RESULT "));
        if (child.status !== 0 || !resultLine) {
          failures++;
          console.log(`FAIL pattern=${pattern} fixture=${fixture} gc=${gc} run=${run} status=${child.status}`);
          console.log(out);
          console.log(err);
          continue;
        }
        const result = JSON.parse(resultLine.slice("RESULT ".length));
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
console.log(failures === 0 ? "parent done: all child runs ok" : `parent done: ${failures} child failure(s)`);
if (failures > 0) process.exit(1);
