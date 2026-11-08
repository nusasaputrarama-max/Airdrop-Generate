// Dummy HANGING child for the F-032 timeout end-to-end test
// (v2.3.17; hardened v2.3.18 for F-034/F-035; hardened v2.3.19 for
// the F-035 trust boundary). It accepts the same CLI args as
// exp-pattern.ts (--pattern/--fixture/--gc) and ignores them,
// records its PID + starttime to $F032_PID_FILE so the test driver
// can prove the parent killed it, prints one line, and then hangs
// FOREVER. It never prints a RESULT line and never exits on its own.
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
//
// v2.3.19 (F-035 trust boundary, audit V12 §4.2 + §10 item 3):
// the lstat-then-appendFileSync pattern is REPLACED by a single
// file-descriptor open with O_NOFOLLOW + fstat verification on the
// descriptor, and the write is pinned to the exact inode the driver
// created (F032_PID_FILE_DEV / F032_PID_FILE_INO).
//
// TRUST BOUNDARY DECISION (explicit, accepted assumption):
// processes that are UNTRUSTED *and* run as the SAME UID are
// EXPLICITLY OUT of the harness threat model. Reasons:
//   1. The harness runs on a single-user VM as one UID by design:
//      driver, parent harness, and child are all the same UID.
//   2. A same-UID process can already ptrace the driver (children
//      are descendants, which ptrace_scope permits), read
//      /proc/<driver-pid>/mem, signal or kill the driver, and write
//      to any file the driver can write. No file-level check —
//      fd-based or otherwise — can isolate against same-UID.
//   3. The 0700 run directory already excludes every OTHER UID;
//      the only processes that can even reach the PID file path
//      are same-UID ones.
//   4. The child itself is TRUSTED code: it is spawned by the
//      driver through the U-72-gated seam from an allowlisted path,
//      not an untrusted writer.
// The remaining risk the fd pattern DOES close is the ACCIDENTAL /
// stale-path swap: a symlink left by a crashed run, or a buggy
// concurrent driver. open(O_NOFOLLOW) is atomic — a symlink at
// open time fails with ELOOP instead of being followed — and the
// returned fd is pinned to the inode that was at the path at open
// time, so no check-then-open window exists in which the path can
// be swapped to redirect the write. fstat on the descriptor then
// verifies regular file / same uid / mode 0600 / (dev,ino) equal
// to the values the driver recorded, before a single writeSync.
// If this harness is ever run on a shared host where same-UID
// processes are untrusted, this assumption must be revisited
// (per-process UID separation, or a supervisor that owns the PID
// file) — recorded as residual risk U-77 in the v2.3.19 matrix.

import { closeSync, fstatSync, openSync, readFileSync, writeSync } from "node:fs";
import { parseProcStat } from "./pid-oracle.ts";

// Linux open flags, passed numerically (Node's fs.openSync accepts
// a number for flags). O_NOFOLLOW = 0o400000 on Linux; verified by
// probe on this VM (Bun 1.4.4, uid 65534): opening a symlink with
// O_WRONLY|O_APPEND|O_NOFOLLOW fails ELOOP, a regular file opens
// and appends normally.
const O_WRONLY = 0o1;
const O_APPEND = 0o2000;
const O_NOFOLLOW = 0o400000;

function fail(msg: string): never {
  console.error(`hang-child: ERROR: ${msg}`);
  process.exit(1);
}

const pidFile = process.env.F032_PID_FILE;
if (!pidFile) fail("F032_PID_FILE not set");

// F-035 (v2.3.19): the driver MUST pin the file by (dev,ino).
// A run without the pin is a misconfiguration — fail loudly
// instead of appending to an unverified path.
const expectedDev = process.env.F032_PID_FILE_DEV;
const expectedIno = process.env.F032_PID_FILE_INO;
if (expectedDev === undefined || expectedIno === undefined) {
  fail("F032_PID_FILE_DEV / F032_PID_FILE_INO not set — refusing to write to an unpinned PID file");
}
if (!/^\d+$/.test(expectedDev) || !/^\d+$/.test(expectedIno)) {
  fail(`F032_PID_FILE_DEV/INO must be decimal integers, got dev=${JSON.stringify(expectedDev)} ino=${JSON.stringify(expectedIno)}`);
}

// Open with O_NOFOLLOW: a symlink at this path fails ELOOP here
// (atomic — there is no check-then-open window), and the fd is
// pinned to the inode that was at the path at open time.
let fd: number;
try {
  fd = openSync(pidFile, O_WRONLY | O_APPEND | O_NOFOLLOW);
} catch (e: any) {
  fail(`cannot open PID file with O_NOFOLLOW (symlink or missing?): ${pidFile} (${e?.code ?? e})`);
}

// Verify the DESCRIPTOR (not the path): regular file, same uid,
// mode 0600, and exactly the (dev,ino) the driver recorded.
const st = fstatSync(fd);
if (!st.isFile()) {
  closeSync(fd);
  fail(`PID file descriptor is not a regular file: ${pidFile}`);
}
if (typeof process.getuid === "function" && st.uid !== process.getuid()) {
  closeSync(fd);
  fail(`PID file owned by uid ${st.uid}, expected uid ${process.getuid()}: ${pidFile}`);
}
if ((st.mode & 0o777) !== 0o600) {
  closeSync(fd);
  fail(`PID file mode is ${(st.mode & 0o777).toString(8)}, expected 600: ${pidFile}`);
}
if (String(st.dev) !== expectedDev || String(st.ino) !== expectedIno) {
  closeSync(fd);
  fail(
    `PID file identity mismatch: descriptor is dev=${st.dev} ino=${st.ino}, driver recorded dev=${expectedDev} ino=${expectedIno} — refusing to write to a different file: ${pidFile}`,
  );
}

// F-034: record our own starttime so the driver can verify identity.
let selfStat: string;
try {
  selfStat = readFileSync("/proc/self/stat", "utf8");
} catch {
  closeSync(fd);
  fail("cannot read /proc/self/stat — PID identity cannot be recorded");
}
const parsed = parseProcStat(selfStat);
if (parsed === null) {
  closeSync(fd);
  fail("cannot parse /proc/self/stat — PID identity cannot be recorded");
}
// Append (one "<pid> <starttime>" line per child) through the
// pinned descriptor: the driver proves EVERY hanging child was
// terminated, not just the last one spawned.
try {
  writeSync(fd, `${process.pid} ${parsed.starttime}\n`);
} finally {
  closeSync(fd);
}
console.log(
  `hang-child pid=${process.pid} starttime=${parsed.starttime} args=${JSON.stringify(process.argv.slice(2))} — hanging forever (test dummy, no RESULT)`,
);
// Hang forever: a never-resolving promise keeps the event loop alive.
await new Promise(() => {});
