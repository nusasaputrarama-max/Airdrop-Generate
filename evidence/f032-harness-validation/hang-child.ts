// Dummy HANGING child for the F-032 timeout end-to-end test
// (v2.3.17; hardened v2.3.18 for F-034/F-035). It accepts the same
// CLI args as exp-pattern.ts (--pattern/--fixture/--gc) and ignores
// them, records its PID + starttime to $F032_PID_FILE so the test
// driver can prove the parent killed it, prints one line, and then
// hangs FOREVER. It never prints a RESULT line and never exits on
// its own.
//
// This file lives ONLY in the experiment sandbox
// (evidence/f032-harness-validation/). It is a local test dummy: no
// network, no artifact, no checkLink, no production target. The
// parent harness run-f029.ts spawns it ONLY when the test-only env
// var F029_CHILD_SCRIPT points at it AND explicit test mode
// (F029_TEST_MODE=1) is active (see run-f029.ts, U-72).
// Production runs never set those variables.
//
// v2.3.18 (F-034): the recorded line is now "<pid> <starttime>"
// (starttime = field 22 of /proc/self/stat, read at spawn), so the
// driver can verify PID identity instead of trusting the number
// alone (PID reuse). If /proc/self/stat cannot be read or parsed,
// the child exits 1 immediately — a missing record fails the E2E
// visibly instead of silently weakening the oracle.
// v2.3.18 (F-035): before appending, the child validates the PID
// file with lstat: it must be a REGULAR file (never a symlink),
// owned by the same uid, mode 0600 — the file the driver created
// exclusively inside its private 0700 run directory. A validation
// failure exits 1 without hanging, so the parent records a
// non-timeout FAIL and the E2E fails loudly.

import { appendFileSync, lstatSync, readFileSync } from "node:fs";
import { parseProcStat } from "./pid-oracle.ts";

function fail(msg: string): never {
  console.error(`hang-child: ERROR: ${msg}`);
  process.exit(1);
}

const pidFile = process.env.F032_PID_FILE;
if (!pidFile) fail("F032_PID_FILE not set");

// F-035: refuse to write through a symlink or a foreign file.
let st;
try {
  st = lstatSync(pidFile);
} catch {
  fail(`PID file does not exist or cannot be statted: ${pidFile}`);
}
if (!st.isFile()) {
  fail(`PID file is not a regular file (symlink or special file?): ${pidFile}`);
}
if (typeof process.getuid === "function" && st.uid !== process.getuid()) {
  fail(`PID file owned by uid ${st.uid}, expected uid ${process.getuid()}: ${pidFile}`);
}
if ((st.mode & 0o777) !== 0o600) {
  fail(`PID file mode is ${(st.mode & 0o777).toString(8)}, expected 600: ${pidFile}`);
}

// F-034: record our own starttime so the driver can verify identity.
let selfStat: string;
try {
  selfStat = readFileSync("/proc/self/stat", "utf8");
} catch {
  fail("cannot read /proc/self/stat — PID identity cannot be recorded");
}
const parsed = parseProcStat(selfStat);
if (parsed === null) {
  fail("cannot parse /proc/self/stat — PID identity cannot be recorded");
}
// Append (one "<pid> <starttime>" line per child): the driver proves
// EVERY hanging child was terminated, not just the last one spawned.
appendFileSync(pidFile, `${process.pid} ${parsed.starttime}\n`);
console.log(
  `hang-child pid=${process.pid} starttime=${parsed.starttime} args=${JSON.stringify(process.argv.slice(2))} — hanging forever (test dummy, no RESULT)`,
);
// Hang forever: a never-resolving promise keeps the event loop alive.
await new Promise(() => {});
