// Regression tests for the strict PID liveness oracle (F-034, v2.3.18).
//
// Proves, per audit V11 §6 F-034 and §11 item 1:
//   - ESRCH → dead (PASS for the caller: the child is gone);
//   - EPERM → alive, NEVER dead (the process exists; the caller must FAIL);
//   - EINVAL / ERR_INVALID_ARG_TYPE / other errors → inconclusive, NEVER dead;
//   - a live PID → alive, with controlled SIGKILL cleanup afterwards;
//   - malformed / empty / duplicate / out-of-range PID lines fail
//     BEFORE any liveness assertion;
//   - the 12 PIDs tested by the E2E driver are the 12 children it
//     launched (that identity check lives in run-f032-timeout-e2e.ts;
//     this file proves the oracle primitives it relies on).
//
// The error-injection cases use stubbed kill/readStat functions, so
// they are deterministic and independent of the host's permission
// layout. That matters here: this VM runs as root (uid 0), so a
// LIVE EPERM cannot be produced — kill(1,0) succeeds as root. The
// live-process section below records that fact honestly instead of
// pretending a live EPERM was observed.
//
// Usage (from evidence/f032-harness-validation/):
//   bun test-pid-oracle.ts
// Exit 0 = all assertions PASS; exit 1 = FAIL.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  classifyLiveness,
  defaultDeps,
  parsePidFile,
  parseProcStat,
  type Liveness,
} from "./pid-oracle.ts";

let failures = 0;
function check(cond: boolean, label: string) {
  console.log(`oracle assert ${cond ? "PASS" : "FAIL"}: ${label}`);
  if (!cond) failures++;
}

function throwsWith(code: string): () => never {
  return () => {
    const e: any = new Error(`simulated ${code}`);
    e.code = code;
    throw e;
  };
}
const neverStat = (): string => {
  throw new Error("readStat must not be called on this path");
};
const statFrom = (text: string) => () => text;

// Rebuild a /proc stat string with one field replaced, by token
// (split at the LAST ")" so a comm containing parens/spaces is safe).
function withStatField(statText: string, fieldIndexAfterComm: number, value: string): string {
  const close = statText.lastIndexOf(")");
  const head = statText.slice(0, close + 1);
  const tokens = statText.slice(close + 1).trim().split(/\s+/);
  tokens[fieldIndexAfterComm] = value;
  return `${head} ${tokens.join(" ")}`;
}
// Field 22 (starttime) is token 19 after comm; field 3 (state) is token 0.
const withStarttime = (statText: string, value: number) => withStatField(statText, 19, String(value));
const withState = (statText: string, value: string) => withStatField(statText, 0, value);

// --- parsePidFile: strict validation before any liveness assertion ---
{
  const good = parsePidFile("3776 123456\n3782 123457\n3790 123458\n");
  check(good.errors.length === 0 && good.records.length === 3, "valid file: 3 records, 0 errors");
  check(
    good.records[0].pid === 3776 && good.records[0].starttime === 123456,
    "valid file: first record parses to pid=3776 starttime=123456",
  );

  const noTrailing = parsePidFile("3776 123456");
  check(noTrailing.errors.length === 0 && noTrailing.records.length === 1, "no trailing newline: still 1 record, 0 errors");

  const empty = parsePidFile("");
  check(empty.errors.length === 0 && empty.records.length === 0, "empty file: 0 records, 0 errors (driver rejects it separately by count)");

  const emptyLine = parsePidFile("3776 123456\n\n3782 123457\n");
  check(emptyLine.errors.length === 1 && emptyLine.errors[0].includes("empty line"), "empty line in the middle → error");

  const noStarttime = parsePidFile("3776\n");
  check(noStarttime.errors.length === 1 && noStarttime.records.length === 0, "line without starttime → malformed error, 0 records");

  const nonNumeric = parsePidFile("abc 123456\n");
  check(nonNumeric.errors.length === 1, "non-numeric pid → error");

  const extraField = parsePidFile("3776 123456 extra\n");
  check(extraField.errors.length === 1, "extra field → malformed error");

  const zeroPid = parsePidFile("0 123456\n");
  check(zeroPid.errors.length === 1 && zeroPid.errors[0].includes("out of range"), "pid 0 → out-of-range error");

  const hugePid = parsePidFile("2147483648 123456\n");
  check(hugePid.errors.length === 1 && hugePid.errors[0].includes("out of range"), "pid > 2^31-1 → out-of-range error");

  const floatPid = parsePidFile("3776.5 123456\n");
  check(floatPid.errors.length === 1, "float pid → malformed error");

  const negativePid = parsePidFile("-5 123456\n");
  check(negativePid.errors.length === 1, "negative pid → malformed error");

  const dup = parsePidFile("3776 123456\n3776 123457\n");
  check(dup.errors.length === 1 && dup.errors[0].includes("duplicate pid 3776"), "duplicate pid → error");

  const dupStarttimeOk = parsePidFile("3776 123456\n3782 123456\n");
  check(
    dupStarttimeOk.errors.length === 0 && dupStarttimeOk.records.length === 2,
    "same starttime on two pids is allowed (children spawned in the same tick)",
  );

  const whitespace = parsePidFile(" 3776 123456\n");
  check(whitespace.errors.length === 1, "leading space → malformed error");
}

// --- classifyLiveness with injected errors (deterministic) ---
{
  const vEsrch: Liveness = classifyLiveness(424242, 999, { kill: throwsWith("ESRCH"), readStat: neverStat });
  check(vEsrch.verdict === "dead", `ESRCH → dead (PASS) [${vEsrch.reason}]`);

  const vEperm: Liveness = classifyLiveness(424242, 999, { kill: throwsWith("EPERM"), readStat: neverStat });
  check(vEperm.verdict === "alive", `EPERM → alive, NEVER dead [${vEperm.reason}]`);

  const vEinval: Liveness = classifyLiveness(424242, 999, { kill: throwsWith("EINVAL"), readStat: neverStat });
  check(vEinval.verdict === "inconclusive", `EINVAL → inconclusive, NEVER dead [${vEinval.reason}]`);

  const vBadArg: Liveness = classifyLiveness(424242, 999, {
    kill: throwsWith("ERR_INVALID_ARG_TYPE"),
    readStat: neverStat,
  });
  check(vBadArg.verdict === "inconclusive", `ERR_INVALID_ARG_TYPE → inconclusive, NEVER dead [${vBadArg.reason}]`);

  // A live process whose /proc stat matches the recorded starttime.
  const selfStat = readFileSync("/proc/self/stat", "utf8");
  const selfParsed = parseProcStat(selfStat);
  check(selfParsed !== null, "parseProcStat parses our own /proc/self/stat");
  if (selfParsed !== null) {
    const vAlive: Liveness = classifyLiveness(process.pid, selfParsed.starttime, {
      kill: () => {},
      readStat: statFrom(selfStat),
    });
    check(vAlive.verdict === "alive", `live pid + matching starttime → alive [${vAlive.reason}]`);

    // Same PID, different starttime = PID reuse by another process.
    const reusedStat = withStarttime(selfStat, selfParsed.starttime + 1000);
    const vReused: Liveness = classifyLiveness(process.pid, selfParsed.starttime, {
      kill: () => {},
      readStat: statFrom(reusedStat),
    });
    check(vReused.verdict === "dead", `live pid + DIFFERENT starttime → dead (PID reused) [${vReused.reason}]`);

    // Zombie state Z = terminated, even though kill() succeeds.
    const zombieStat = withState(selfStat, "Z");
    const vZombie: Liveness = classifyLiveness(process.pid, selfParsed.starttime, {
      kill: () => {},
      readStat: statFrom(zombieStat),
    });
    check(vZombie.verdict === "dead", `state Z (zombie) → dead [${vZombie.reason}]`);
  }

  // kill() succeeds, then /proc disappears (exited in between) → dead.
  const vRaced: Liveness = classifyLiveness(424242, 999, { kill: () => {}, readStat: throwsWith("ENOENT") });
  check(vRaced.verdict === "dead", `kill ok + /proc ENOENT → dead (exited between probes) [${vRaced.reason}]`);

  // kill() succeeds but /proc is unreadable → inconclusive, never dead.
  const vNoProc: Liveness = classifyLiveness(424242, 999, { kill: () => {}, readStat: throwsWith("EPERM") });
  check(vNoProc.verdict === "inconclusive", `kill ok + /proc EPERM → inconclusive [${vNoProc.reason}]`);

  // Unparsable /proc stat → inconclusive, never dead.
  const vBadStat: Liveness = classifyLiveness(424242, 999, { kill: () => {}, readStat: statFrom("garbage") });
  check(vBadStat.verdict === "inconclusive", `kill ok + unparsable /proc stat → inconclusive [${vBadStat.reason}]`);
}

// --- live-process checks with the REAL kill() and /proc ---
async function liveChecks() {
  const deps = defaultDeps();

  // 1. A child that already exited → real ESRCH path.
  const short = spawn(process.execPath, ["-e", "process.exit(0);"]);
  const shortPid = short.pid!;
  await new Promise<void>((res) => short.on("exit", () => res()));
  const vExited = classifyLiveness(shortPid, 1, deps);
  check(vExited.verdict === "dead", `exited child pid=${shortPid} → dead via real ESRCH [${vExited.reason}]`);

  // 2. A live child → alive; then controlled SIGKILL cleanup → dead.
  const sleeper = spawn("sleep", ["30"]);
  const sleepPid = sleeper.pid!;
  const sleepStat = readFileSync(`/proc/${sleepPid}/stat`, "utf8");
  const sleepParsed = parseProcStat(sleepStat);
  check(sleepParsed !== null, `live child /proc stat parses (pid=${sleepPid})`);
  if (sleepParsed !== null) {
    const vLive = classifyLiveness(sleepPid, sleepParsed.starttime, deps);
    check(vLive.verdict === "alive", `live child pid=${sleepPid} → alive via real kill + starttime [${vLive.reason}]`);
    sleeper.kill("SIGKILL");
    await new Promise<void>((res) => sleeper.on("exit", () => res()));
    const vKilled = classifyLiveness(sleepPid, sleepParsed.starttime, deps);
    check(vKilled.verdict === "dead", `SIGKILLed child pid=${sleepPid} → dead after controlled cleanup [${vKilled.reason}]`);
  } else {
    sleeper.kill("SIGKILL");
    await new Promise<void>((res) => sleeper.on("exit", () => res()));
  }

  // 3. EPERM probe — recorded honestly, not faked.
  // This VM runs as root, so kill(1,0) succeeds and no live EPERM
  // can be produced here. The EPERM → alive rule is therefore
  // proven by the injected-stub case above, not by a live process.
  try {
    process.kill(1, 0);
    console.log(
      "oracle note: kill(1,0) succeeded — this VM runs as root (uid 0), so a LIVE EPERM cannot be produced here; EPERM→FAIL is proven by the injected-stub case above",
    );
  } catch (e: any) {
    const v1 = classifyLiveness(1, 1, deps);
    check(
      v1.verdict !== "dead",
      `kill(1,0) threw ${e.code} — oracle verdict for pid 1 is ${v1.verdict}, never dead`,
    );
  }
}

await liveChecks();

if (failures > 0) {
  console.log(`PID ORACLE TEST: FAIL — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("PID ORACLE TEST: PASS — ESRCH-only death, EPERM/EINVAL can never PASS, strict PID-file parsing, live-process proof");
