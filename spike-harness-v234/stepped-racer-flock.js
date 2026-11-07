// Stepped adversarial racer — FIXED flock implementation (startup-flock.js,
// Bun). Barrier choreography mirrors the old-code racer so the SAME
// interleavings are attempted against the fixed code.
//
// Usage: bun stepped-racer-flock.js <lockPath> <id:A|B> <variant> <barrierDir>
//   variant T2   — B waits until A acquired, THEN attempts flock.
//                  Expected: exactly one owner (B gets EWOULDBLOCK).
//   variant T2sim— both attempt flock right after the ready barrier.
//                  Expected: exactly one owner (kernel serialises).
//   variant T5   — A acquires, then waits for `interfered` (orchestrator
//                  unlinks the path + creates a new file), then re-runs
//                  verifyFlockOwnership. Expected: verified=false, no cleanup.
//   variant T6A  — mixed-version A-side: wait for `probed.B` (old-code B
//                  probed the stale record), then flock + write identity,
//                  signal acquired.A, wait for `acquired.B`, then re-run
//                  verifyFlockOwnership. Expected: B ALSO acquires (hazard
//                  proven) but A detects invalid ownership (verified=false)
//                  and does NOT proceed to cleanup.
//
// Output: one JSON line on stdout. NEVER performs cleanup.
import fs from "node:fs";
import {
  acquireStartupLockFlock, verifyFlockOwnership, releaseLock, readProcStat,
} from "./startup-flock.js";

const lockPath = process.argv[2];
const id = process.argv[3]; // 'A' | 'B'
const variant = process.argv[4]; // T2 | T2sim | T5 | T6A
const barrierDir = process.argv[5];

function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
  catch { Bun.sleepSync(ms); }
}
function sig(name) {
  try { fs.writeFileSync(`${barrierDir}/${name}`, String(process.pid)); } catch {}
}
function has(name) { return fs.existsSync(`${barrierDir}/${name}`); }
function waitFor(names, timeoutMs = 15000) {
  const start = Date.now();
  while (true) {
    if (names.every((n) => has(n))) return true;
    if (Date.now() - start > timeoutMs) return false;
    sleepSync(5);
  }
}

const identity = { pid: process.pid, starttime: readProcStat(process.pid).starttime };

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

if (variant === "T6A") waitFor(["probed.B"]);

const hooks = {
  afterOpen: () => {
    if (variant === "T2" || variant === "T2sim") {
      sig(`ready.${id}`);
      waitFor(["ready.A", "ready.B"]);
    }
  },
  beforeFlock: () => {
    if (variant === "T2" && id === "B") waitFor(["acquired.A"]);
  },
};

const res = acquireStartupLockFlock(lockPath, identity, { hooks });
let ownershipVerified = false;
let myIno = null;
if (res.acquired) {
  ownershipVerified = verifyFlockOwnership(lockPath, res.fd, res.record);
  try { myIno = fs.fstatSync(res.fd).ino; } catch {}
  sig(`acquired.${id}`);
  if (variant === "T5") {
    // Wait for the orchestrator's third-party interference, then re-verify.
    waitFor(["interfered"]);
    const stillOwner = verifyFlockOwnership(lockPath, res.fd, res.record);
    out({
      id, pid: process.pid, acquired: true, reason: null, reclaimed: false,
      ownershipVerified, verifiedAfterInterference: stillOwner,
      myIno, cleanupCalls: 0,
    });
    releaseLock(res.fd);
    process.exit(0);
  }
  if (variant === "T6A") {
    // Wait until the old-code racer claims it acquired, then re-verify.
    waitFor(["acquired.B"]);
    const stillOwner = verifyFlockOwnership(lockPath, res.fd, res.record);
    out({
      id, pid: process.pid, acquired: true, reason: null, reclaimed: false,
      ownershipVerified, verifiedAfterInterference: stillOwner,
      myIno, cleanupCalls: 0,
    });
    releaseLock(res.fd);
    process.exit(0);
  }
  setTimeout(() => { releaseLock(res.fd); process.exit(0); }, 2000);
} else {
  out({
    id, pid: process.pid, acquired: false, reason: res.reason,
    detail: res.detail || null, reclaimed: false,
    ownershipVerified: false, myIno, cleanupCalls: 0,
  });
  process.exit(0);
}
out({
  id, pid: process.pid, acquired: true, reason: null, reclaimed: false,
  ownershipVerified, myIno, cleanupCalls: 0,
});
