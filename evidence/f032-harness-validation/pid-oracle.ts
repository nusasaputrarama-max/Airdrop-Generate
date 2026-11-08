// Strict PID liveness oracle + PID-file parser (v2.3.19, F-034/F-035/F-036).
//
// This module is the fix for audit V11 finding F-034 and audit V12
// finding F-036: the v2.3.17 E2E driver treated EVERY exception from
// `process.kill(pid, 0)` as "process is dead" (`catch { stillAlive = false; }`), so an EPERM
// (process alive but not signallable), an EINVAL, or a malformed PID
// could all false-pass the "all children terminated" assertion. The
// v2.3.17 driver also parsed the PID file with a bare `Number(...)`
// per line — no validation of shape, range, or duplicates.
//
// v2.3.19 (F-036): the v2.3.18 parser still accepted `starttime = 0`
// (it checked `< 0`, not `<= 0`) although its contract required
// positive safe integers. A corrupted/tampered record `<pid> 0`
// made `classifyLiveness()` compare against a starttime that can
// never match a live process and return "dead" for a LIVE child —
// a false-pass of the termination assertion. The parser now rejects
// starttime <= 0 in BOTH `parsePidFile()` and `parseProcStat()`;
// `classifyLiveness()` validates its own inputs (never trusts the
// caller); and `verifyPidFile()` fails the WHOLE file fast on any
// parse error — no liveness assertion is ever run over partial
// records.
//
// Rules enforced here (acceptance criteria of V11 §11 item 1 and
// V12 §10 item 1):
//   1. A PID file line must be exactly "<pid> <starttime>" with
//      both fields positive safe integers; pid in 1..2^31-1.
//      Empty, malformed, out-of-range, or duplicate lines are
//      ERRORS — the file is rejected before any liveness assertion.
//   2. Only `error.code === "ESRCH"` from `kill(pid, 0)` means
//      "no such process" (dead).
//   3. EPERM means the process EXISTS but cannot be signalled —
//      verdict "alive" (the caller must FAIL, never PASS).
//   4. EINVAL / ERR_INVALID_ARG_TYPE / any other exception means
//      the oracle cannot decide — verdict "inconclusive" (FAIL).
//   5. When `kill(pid, 0)` succeeds, the PID may have been reused
//      by a different process. Identity is therefore verified
//      against the starttime the child recorded at spawn from
//      `/proc/<pid>/stat` (field 22): matching starttime = the
//      same child, still alive; different starttime = the PID was
//      reused, the original child is dead; state Z/X = zombie/dead.
//      An unreadable or unparsable `/proc` entry is "inconclusive"
//      (FAIL), never "dead".
//   6. The one exception: if the process exits between the signal
//      probe and the `/proc` read (ENOENT on the stat read), the
//      child is dead — it demonstrably exited in that window.
//
// The oracle is deliberately injectable (`kill` / `readStat` deps)
// so the regression tests can prove EPERM/EINVAL can never yield
// PASS without depending on the host's permission layout
// (this VM runs as root, so a live EPERM cannot be produced here —
// see test-pid-oracle.ts). Production code paths never import this
// module; it lives only in the experiment sandbox.

import { readFileSync } from "node:fs";

export const MAX_PID = 2_147_483_647; // pid_t maximum

export type PidRecord = { pid: number; starttime: number };

export type ProcStat = { state: string; starttime: number };

/** Parse one `/proc/<pid>/stat` text. Field 22 is starttime; the
 *  comm field (in parens, may contain spaces/parens) is skipped by
 *  cutting at the LAST ")". Returns null when unparsable. */
export function parseProcStat(statText: string): ProcStat | null {
  const close = statText.lastIndexOf(")");
  if (close < 0) return null;
  const rest = statText.slice(close + 1).trim().split(/\s+/);
  // rest[0] = field 3 (state); field 22 (starttime) = rest[19].
  if (rest.length < 20) return null;
  const starttime = Number(rest[19]);
  // F-036: starttime is clock ticks since boot for a live process —
  // 0 is not a valid value (a record claiming 0 can never match a
  // live process and would false-report "dead"). Reject <= 0.
  if (!Number.isSafeInteger(starttime) || starttime <= 0) return null;
  return { state: rest[0], starttime };
}

/** Strictly parse a PID file. One record per line, exactly
 *  "<pid> <starttime>". A single trailing newline is the file
 *  terminator, not an empty record. Any other empty line,
 *  malformed line, out-of-range value, or duplicate pid is an
 *  error — the caller must reject the file before asserting
 *  liveness. */
export function parsePidFile(text: string): { records: PidRecord[]; errors: string[] } {
  const errors: string[] = [];
  const records: PidRecord[] = [];
  const seen = new Set<number>();
  const lines = text.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const label = `line ${i + 1}`;
    if (line === "") {
      errors.push(`${label}: empty line`);
      continue;
    }
    const m = /^(\d+) (\d+)$/.exec(line);
    if (!m) {
      errors.push(`${label}: malformed (expected "<pid> <starttime>"): ${JSON.stringify(line)}`);
      continue;
    }
    const pid = Number(m[1]);
    const starttime = Number(m[2]);
    if (!Number.isSafeInteger(pid) || pid < 1 || pid > MAX_PID) {
      errors.push(`${label}: pid out of range: ${m[1]}`);
      continue;
    }
    if (!Number.isSafeInteger(starttime) || starttime <= 0) {
      errors.push(`${label}: starttime out of range (must be a positive safe integer): ${m[2]}`);
      continue;
    }
    if (seen.has(pid)) {
      errors.push(`${label}: duplicate pid ${pid}`);
      continue;
    }
    seen.add(pid);
    records.push({ pid, starttime });
  }
  return { records, errors };
}

export type KillFn = (pid: number) => void; // throws a NodeJS.ErrnoException-like error
export type ReadStatFn = (pid: number) => string; // throws ENOENT when the process is gone

export type Liveness =
  | { verdict: "dead"; reason: string }
  | { verdict: "alive"; reason: string }
  | { verdict: "inconclusive"; reason: string };

/** Decide whether the child recorded as (pid, recordedStarttime)
 *  is still alive. ONLY "dead" may satisfy a "terminated"
 *  assertion; "alive" and "inconclusive" must both FAIL it. */
export function classifyLiveness(
  pid: number,
  recordedStarttime: number,
  deps: { kill: KillFn; readStat: ReadStatFn },
): Liveness {
  // F-036: validate our OWN inputs — never trust the caller to have
  // run parsePidFile() first. An invalid pid or starttime can never
  // yield "dead" (that would false-pass a termination assertion);
  // it yields "inconclusive" so the caller FAILS.
  if (!Number.isSafeInteger(pid) || pid < 1 || pid > MAX_PID) {
    return {
      verdict: "inconclusive",
      reason: `invalid oracle input: pid must be a safe integer in 1..${MAX_PID}, got ${String(pid)}`,
    };
  }
  if (!Number.isSafeInteger(recordedStarttime) || recordedStarttime <= 0) {
    return {
      verdict: "inconclusive",
      reason: `invalid oracle input: recordedStarttime must be a positive safe integer, got ${String(recordedStarttime)}`,
    };
  }
  try {
    deps.kill(pid);
  } catch (e: any) {
    const code = e?.code;
    if (code === "ESRCH") {
      return { verdict: "dead", reason: "kill(pid,0) threw ESRCH — no such process" };
    }
    if (code === "EPERM") {
      // A process with this PID exists; we just cannot signal it.
      return { verdict: "alive", reason: "kill(pid,0) threw EPERM — process exists but cannot be signalled" };
    }
    return {
      verdict: "inconclusive",
      reason: `kill(pid,0) threw ${code ?? e?.name ?? "unknown error"} — oracle cannot decide`,
    };
  }
  // kill(pid, 0) succeeded: SOME process owns this PID. Verify it is
  // still OUR child via the starttime recorded at spawn.
  let statText: string;
  try {
    statText = deps.readStat(pid);
  } catch (e: any) {
    if (e?.code === "ENOENT") {
      return { verdict: "dead", reason: "process exited between signal probe and /proc read (ENOENT)" };
    }
    return {
      verdict: "inconclusive",
      reason: `/proc/<pid>/stat unreadable (${e?.code ?? e?.name ?? "unknown error"}) — identity cannot be verified`,
    };
  }
  const parsed = parseProcStat(statText);
  if (parsed === null) {
    return { verdict: "inconclusive", reason: "/proc/<pid>/stat unparsable — identity cannot be verified" };
  }
  if (parsed.state === "Z" || parsed.state === "X") {
    return { verdict: "dead", reason: `process state is ${parsed.state} (zombie/dead) — terminated` };
  }
  if (parsed.starttime === recordedStarttime) {
    return { verdict: "alive", reason: `starttime ${parsed.starttime} matches the recorded child — still alive` };
  }
  return {
    verdict: "dead",
    reason: `starttime ${parsed.starttime} != recorded ${recordedStarttime} — PID reused by a different process; the original child is dead`,
  };
}

/** Real dependencies: the actual `process.kill` and `/proc` reads. */
export function defaultDeps(): { kill: KillFn; readStat: ReadStatFn } {
  return {
    kill: (pid: number) => process.kill(pid, 0),
    readStat: (pid: number) => readFileSync(`/proc/${pid}/stat`, "utf8"),
  };
}

export type PidFileVerdict = {
  ok: boolean;
  errors: string[];
  /** One liveness verdict per record — EMPTY when the file failed
   *  to parse (fail-fast: no liveness assertion is ever run over
   *  partial records). */
  verdicts: { pid: number; starttime: number; liveness: Liveness }[];
};

/** Verify a whole PID file end to end (F-036 fail-fast gate).
 *
 *  1. Strict-parse the file. ANY parse error → return
 *     `{ ok: false, errors, verdicts: [] }` WITHOUT calling
 *     `classifyLiveness()` on any record — a file with one bad
 *     record cannot partially prove termination.
 *  2. Require exactly `expectedCount` records (the caller knows
 *     how many children it launched); a short/long file is an
 *     error, not a partial pass.
 *  3. Classify every record. `ok` is true only when EVERY record
 *     is verdict "dead". "alive" or "inconclusive" on any record
 *     fails the whole file.
 *
 *  The E2E driver (run-f032-timeout-e2e.ts) must use this helper
 *  instead of inlining the parse-then-classify loop, so the
 *  fail-fast rule is enforced in exactly one place and is covered
 *  by the regression tests in test-pid-oracle.ts. */
export function verifyPidFile(
  text: string,
  expectedCount: number,
  deps: { kill: KillFn; readStat: ReadStatFn },
): PidFileVerdict {
  const { records, errors } = parsePidFile(text);
  if (errors.length > 0) {
    return { ok: false, errors, verdicts: [] };
  }
  if (records.length !== expectedCount) {
    return {
      ok: false,
      errors: [
        `record count mismatch: expected ${expectedCount} record(s), got ${records.length}`,
      ],
      verdicts: [],
    };
  }
  const verdicts = records.map((rec) => ({
    pid: rec.pid,
    starttime: rec.starttime,
    liveness: classifyLiveness(rec.pid, rec.starttime, deps),
  }));
  const failures = verdicts.filter((v) => v.liveness.verdict !== "dead");
  if (failures.length > 0) {
    return {
      ok: false,
      errors: failures.map(
        (v) => `pid ${v.pid}: not dead (${v.liveness.verdict}: ${v.liveness.reason})`,
      ),
      verdicts,
    };
  }
  return { ok: true, errors: [], verdicts };
}
