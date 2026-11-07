// Parent stub — siklus hidup parent lengkap, implementasi referensi v2.3.5.
// TIDAK PERNAH melakukan cleanup tanpa otoritas: setiap tindakan sensitif
// (SIGKILL worker lama, tulis pidfile, spawn worker, transisi READY)
// didahului assertOwnership() dalam tick sinkron yang sama (guardedAction).
//
// Usage: bun parent-stub.js <dir> <mode> <lockPath> <pidfilePath> <barrierDir> [variant] v235-parent
//   mode acquire-only   — acquire lock saja, sinyal acquired, tahan 3 dtk, keluar.
//   mode guarded-action — acquire, verifikasi OK, sinyal verified, tunggu
//                         `interfered`, lalu guardedAction('cleanup').
//                         Output: {actionRan, ownershipLost}.
//   mode unguarded-action (KONTROL) — sama, tetapi tindakan dijalankan
//                         TANPA revalidasi kedua (membuktikan jendela
//                         mikro itu nyata).
//   mode full           — siklus penuh: acquire -> cleanup worker lama
//                         (validasi identitas + SIGKILL + konfirmasi exit)
//                         -> spawn worker -> tulis pidfile + flock pidfile
//                         -> tunggu worker-check serve:true -> READY.
//                         Menahan lock + heartbeat sampai dibunuh.
// Output: satu baris JSON di stdout saat keluar (atau saat READY, lalu tahan).
import fs from "node:fs";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  acquireStartupLockFlockV2, verifyFlockOwnership, guardedAction,
  releaseLock, heartbeatLockFlock, readProcStat, readProcCmdline,
  pidAlive, atomicWritePidfile, acquirePidfileLock, readPidfile,
} from "./startup-flock-v235.js";

const dir = process.argv[2];
const mode = process.argv[3];
const lockPath = process.argv[4];
const pidfilePath = process.argv[5];
const barrierDir = process.argv[6];
const variant = process.argv[7] || "";
// argv terakhir 'v235-parent' adalah marker cmdline untuk pre-start scan.

function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
  catch { Bun.sleepSync(ms); }
}
function sig(name, val = "") {
  try { fs.writeFileSync(`${barrierDir}/${name}`, val === "" ? String(process.pid) : String(val)); } catch {}
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
function out(obj) { process.stdout.write(JSON.stringify(obj) + "\n"); }
function readJsonFile(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

const identity = { pid: process.pid, starttime: readProcStat(process.pid).starttime };

const res = acquireStartupLockFlockV2(lockPath, identity, {
  parentMarker: "v235-parent",
  // V235_NO_SCAN=1 (TEST-ONLY): lewati pre-start guard agar lapis
  // kedua (klasifikasi record) dapat diuji sendiri.
  scanParents: process.env.V235_NO_SCAN ? false : true,
  sentinelDir: dir,
  hooks: {
    afterFlock: ({ flockOk }) => { if (mode === "acquire-only") sig(`flocked.${process.pid}`); },
  },
});

if (!res.acquired) {
  out({ id: "parent", pid: process.pid, mode, acquired: false, reason: res.reason, others: res.others || null, holderPid: res.holderPid || null, cleanupCalls: 0 });
  process.exit(0);
}

const hb = heartbeatLockFlock(res.fd, lockPath, identity, res.record);
sig("acquired");

if (mode === "acquire-only") {
  out({ id: "parent", pid: process.pid, mode, acquired: true, reason: null, cleanupCalls: 0, myIno: fs.fstatSync(res.fd).ino });
  setTimeout(() => { clearInterval(hb); releaseLock(res.fd); process.exit(0); }, 3000);
  // Tahan proses agar orchestrator dapat mengobservasi; stdout sudah ditulis.
  await new Promise(() => {});
}

if (mode === "verify-after-interference") {
  // Acquire, verifikasi OK, sinyal verified, tunggu `interfered`
  // (orchestrator mengganti file lock), lalu verifikasi ulang.
  // Output: {verifiedAfterInterference, cleanupCalls:0}.
  const verified = verifyFlockOwnership(lockPath, res.fd, res.record);
  sig("verified");
  waitFor(["interfered"], 15000);
  const stillOwner = verifyFlockOwnership(lockPath, res.fd, res.record);
  out({ id: "parent", pid: process.pid, mode, acquired: true, verified, verifiedAfterInterference: stillOwner, cleanupCalls: 0, myIno: fs.fstatSync(res.fd).ino });
  clearInterval(hb);
  releaseLock(res.fd);
  process.exit(0);
}

if (mode === "guarded-action" || mode === "unguarded-action") {
  const verified = verifyFlockOwnership(lockPath, res.fd, res.record);
  sig("verified");
  waitFor(["interfered"], 15000);
  let actionRan = false;
  let ownershipLost = false;
  if (mode === "guarded-action") {
    const r = guardedAction(lockPath, res.fd, res.record, "cleanup", () => {
      actionRan = true;
      sig("action-ran");
      return true;
    });
    ownershipLost = !r.ok;
  } else {
    // KONTROL: tindakan tanpa revalidasi kedua.
    actionRan = true;
    sig("action-ran");
  }
  out({ id: "parent", pid: process.pid, mode, acquired: true, verified, actionRan, ownershipLost, cleanupCalls: actionRan ? 1 : 0 });
  clearInterval(hb);
  releaseLock(res.fd);
  process.exit(0);
}

if (mode === "full") {
  // Langkah 1 — cleanup worker lama menurut pidfile (aturan §A.5.5.1/§A.5.5.2).
  let cleanupCalls = 0;
  let oldWorkerKilled = null;
  const pf = readPidfile(pidfilePath);
  if (pf && typeof pf.workerPid === "number") {
    const alive = pidAlive(pf.workerPid);
    if (alive === true) {
      const st = readProcStat(pf.workerPid);
      const cmd = readProcCmdline(pf.workerPid);
      const identityOk = st && String(st.starttime) === String(pf.workerStarttime)
        && cmd !== null && cmd.includes("dns-worker");
      if (!identityOk) {
        out({ id: "parent", pid: process.pid, mode, acquired: true, ready: false, reason: "old-worker-identity-mismatch", cleanupCalls: 0 });
        clearInterval(hb); releaseLock(res.fd); process.exit(5);
      }
      // Validasi ulang sesaat sebelum sinyal (tick yang sama, tanpa await).
      const st2 = readProcStat(pf.workerPid);
      if (!st2 || String(st2.starttime) !== String(pf.workerStarttime)) {
        out({ id: "parent", pid: process.pid, mode, acquired: true, ready: false, reason: "old-worker-identity-changed", cleanupCalls: 0 });
        clearInterval(hb); releaseLock(res.fd); process.exit(5);
      }
      const gr = guardedAction(lockPath, res.fd, res.record, "sigkill-old-worker", () => {
        try { process.kill(pf.workerPid, "SIGKILL"); } catch {}
        cleanupCalls += 1;
        return true;
      });
      if (!gr.ok) {
        out({ id: "parent", pid: process.pid, mode, acquired: true, ready: false, reason: "ownership-lost-before-sigkill", cleanupCalls: 0 });
        clearInterval(hb); releaseLock(res.fd); process.exit(5);
      }
      // Tunggu konfirmasi exit (poll /proc, maks 2 dtk skala tes).
      const deadline = Date.now() + 2000;
      let dead = false;
      while (Date.now() < deadline) {
        if (pidAlive(pf.workerPid) === false) { dead = true; break; }
        sleepSync(20);
      }
      oldWorkerKilled = dead;
      if (!dead) {
        out({ id: "parent", pid: process.pid, mode, acquired: true, ready: false, reason: "old-worker-exit-unconfirmed", cleanupCalls });
        clearInterval(hb); releaseLock(res.fd); process.exit(5);
      }
    }
  }

  // Langkah 2 — spawn worker baru (mode dari argv[8], default 'serve').
  const workerMode = process.argv[8] || "serve";
  const workerToken = randomBytes(16).toString("hex");
  const child = spawn("bun", ["worker-stub.js", pidfilePath, lockPath, barrierDir, workerMode, "dns-worker"], {
    cwd: import.meta.dir, stdio: ["ignore", "ignore", "ignore"], detached: false,
  });
  const workerPid = child.pid;
  // Tunggu /proc worker muncul (starttime tidak boleh null di pidfile).
  let wst = null;
  const wstart = Date.now();
  while (Date.now() - wstart < 1000) {
    wst = readProcStat(workerPid);
    if (wst) break;
    sleepSync(10);
  }
  const workerStarttime = wst ? wst.starttime : null;

  // Langkah 3 — tulis pidfile (atomik) + flock pidfile, keduanya
  // didahului revalidasi dalam guardedAction.
  let pidfileOk = false;
  const wr = guardedAction(lockPath, res.fd, res.record, "write-pidfile", () => {
    atomicWritePidfile(pidfilePath, {
      parentPid: process.pid, workerPid, workerStarttime, workerToken,
      lockToken: res.record.token, writtenAt: Date.now(), version: 2,
    });
    return true;
  });
  if (wr.ok) {
    const pl = acquirePidfileLock(pidfilePath);
    pidfileOk = !pl.error;
    if (!pidfileOk) {
      try { child.kill("SIGKILL"); } catch {}
      out({ id: "parent", pid: process.pid, mode, acquired: true, ready: false, reason: `pidfile-lock-failed:${pl.error}`, cleanupCalls });
      clearInterval(hb); releaseLock(res.fd); process.exit(6);
    }
  } else {
    try { child.kill("SIGKILL"); } catch {}
    out({ id: "parent", pid: process.pid, mode, acquired: true, ready: false, reason: "ownership-lost-before-pidfile", cleanupCalls });
    clearInterval(hb); releaseLock(res.fd); process.exit(6);
  }

  // Langkah 4 — tunggu worker self-check lolos, lalu READY (gated).
  let workerCheck = null;
  const wdeadline = Date.now() + 5000;
  while (Date.now() < wdeadline) {
    workerCheck = readJsonFile(`${barrierDir}/worker-check.json`);
    if (workerCheck && workerCheck.serve === true) break;
    if (workerCheck && workerCheck.serve === false && !workerCheck.recheckFailed) break;
    sleepSync(25);
  }
  if (!workerCheck || workerCheck.serve !== true) {
    try { child.kill("SIGKILL"); } catch {}
    out({ id: "parent", pid: process.pid, mode, acquired: true, ready: false, reason: "worker-self-check-failed", workerCheck, cleanupCalls });
    clearInterval(hb); releaseLock(res.fd); process.exit(6);
  }
  const rr = guardedAction(lockPath, res.fd, res.record, "transition-ready", () => {
    sig("parent-ready");
    return true;
  });
  if (!rr.ok) {
    try { child.kill("SIGKILL"); } catch {}
    out({ id: "parent", pid: process.pid, mode, acquired: true, ready: false, reason: "ownership-lost-before-ready", cleanupCalls });
    clearInterval(hb); releaseLock(res.fd); process.exit(6);
  }
  out({ id: "parent", pid: process.pid, mode, acquired: true, ready: true, reason: null, cleanupCalls, oldWorkerKilled, workerPid, pidfileOk });
  // Tahan sampai dibunuh (supervisor/orchestrator). Worker tetap hidup.
  await new Promise(() => {});
}

out({ id: "parent", pid: process.pid, mode, acquired: true, reason: `unknown-mode:${mode}`, cleanupCalls: 0 });
process.exit(0);
