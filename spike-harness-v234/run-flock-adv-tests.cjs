// Orchestrator for adversarial tests on the FIXED flock implementation
// (startup-flock.js, Bun) + the mixed-version test.
//
//   ADV-T2   — same interleaving as ADV-T1, fixed code: B attempts flock
//              only AFTER A acquired. Expectation: exactly one owner
//              (B: held-by-live-holder).
//   ADV-T2sim— both attempt flock simultaneously after the ready barrier.
//              Expectation: exactly one owner (kernel serialises).
//   ADV-T5   — third-party unlink + recreate after A acquired (flock).
//              Expectation: A detects it (verifiedAfterInterference=false),
//              0 cleanup.
//   ADV-T6   — MIXED VERSION: old-code B (v2.3.3 unlink reclaim) vs
//              flock A. Expectation: BOTH acquire (hazard reproduced —
//              the old code's unlink deletes the new holder's file),
//              BUT A detects invalid ownership before cleanup
//              (verifiedAfterInterference=false, cleanupCalls=0).
//
// Usage: node run-flock-adv-tests.cjs <run-number>
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RUN = process.argv[2] || '1';
const HARNESS = __dirname;
const BASE = `/tmp/ssrf-v234/flk-adv-run${RUN}`;
fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });

function staleLock(dir) {
  const lockPath = path.join(dir, 'startup.lock');
  fs.writeFileSync(lockPath, JSON.stringify(
    { pid: 999999, starttime: '0', heartbeatAt: Date.now() - 60000, version: 1 }));
  return lockPath;
}
function waitForFile(dir, name, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(path.join(dir, name))) return true;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
  }
  return false;
}
function runProc(cmd, args, cwd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, 25000);
    p.on('exit', (code) => {
      clearTimeout(timer);
      let json = null;
      try { json = JSON.parse(out.trim().split('\n').filter(Boolean).pop()); } catch {}
      resolve({ cmd, code, json, out: out.trim(), err: err.trim() });
    });
  });
}
function readFinalLock(lockPath) {
  try {
    const st = fs.statSync(lockPath);
    const rec = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    return { ino: st.ino, pid: rec.pid };
  } catch (e) { return { error: String(e.code || e.message) }; }
}

async function testT2(name, variant) {
  const dir = path.join(BASE, name);
  fs.mkdirSync(dir, { recursive: true });
  const lockPath = path.join(dir, 'startup.lock');
  const [a, b] = await Promise.all([
    runProc('bun', ['stepped-racer-flock.js', lockPath, 'A', variant, dir], HARNESS),
    runProc('bun', ['stepped-racer-flock.js', lockPath, 'B', variant, dir], HARNESS),
  ]);
  const owners = [a, b].filter((r) => r.json && r.json.acquired);
  const ok = owners.length === 1;
  console.log(`${name} :: ${ok ? 'PROPERTY HOLDS' : 'PROPERTY VIOLATED'} | owners=${owners.map((o) => o.json.id).join(',') || 'none'}`
    + ` | A(acq=${a.json ? a.json.acquired : '?'},reason=${a.json ? (a.json.reason || 'ok') : '?'})`
    + ` B(acq=${b.json ? b.json.acquired : '?'},reason=${b.json ? (b.json.reason || 'ok') : '?'})`
    + ` | finalLockPid=${readFinalLock(lockPath).pid}`);
  return ok;
}

async function testT5() {
  const dir = path.join(BASE, 'ADV-T5');
  fs.mkdirSync(dir, { recursive: true });
  const lockPath = path.join(dir, 'startup.lock');
  const p = runProc('bun', ['stepped-racer-flock.js', lockPath, 'A', 'T5', dir], HARNESS);
  if (!waitForFile(dir, 'acquired.A')) { console.log('ADV-T5 :: TIMEOUT waiting for A to acquire'); return false; }
  // Third-party interference: unlink A's file, create a NEW file at the path.
  const aInoBefore = fs.statSync(lockPath).ino;
  fs.unlinkSync(lockPath);
  fs.writeFileSync(lockPath, JSON.stringify({ pid: 424242, starttime: '999', heartbeatAt: Date.now(), version: 1 }));
  const newIno = fs.statSync(lockPath).ino;
  fs.writeFileSync(path.join(dir, 'interfered'), '1');
  const a = await p;
  const detected = a.json && a.json.acquired && a.json.verifiedAfterInterference === false && a.json.cleanupCalls === 0;
  console.log(`ADV-T5 :: ${detected ? 'DETECTED' : 'NOT DETECTED'} | A(acq=${a.json ? a.json.acquired : '?'},verifiedAfterInterference=${a.json ? a.json.verifiedAfterInterference : '?'},cleanupCalls=${a.json ? a.json.cleanupCalls : '?'}) | aIno=${aInoBefore} newIno=${newIno} inodeChanged=${aInoBefore !== newIno}`);
  return !!detected;
}

async function testT6() {
  const dir = path.join(BASE, 'ADV-T6');
  fs.mkdirSync(dir, { recursive: true });
  const lockPath = staleLock(dir);
  const [a, b] = await Promise.all([
    runProc('bun', ['stepped-racer-flock.js', lockPath, 'A', 'T6A', dir], HARNESS),
    runProc('node', ['stepped-racer.cjs', lockPath, 'B', 'T6B', dir], HARNESS),
  ]);
  const bothAcquired = a.json && a.json.acquired && b.json && b.json.acquired;
  const aDetected = a.json && a.json.verifiedAfterInterference === false && a.json.cleanupCalls === 0;
  const fin = readFinalLock(lockPath);
  console.log(`ADV-T6 :: mixed-version hazard=${bothAcquired ? 'REPRODUCED (both acquired)' : 'NOT reproduced'} | A(flock,acq=${a.json ? a.json.acquired : '?'},verifiedAfter=${a.json ? a.json.verifiedAfterInterference : '?'},cleanupCalls=${a.json ? a.json.cleanupCalls : '?'},myIno=${a.json ? a.json.myIno : '?'})`
    + ` B(old-code,acq=${b.json ? b.json.acquired : '?'},reason=${b.json ? (b.json.reason || 'ok') : '?'},myIno=${b.json ? b.json.myIno : '?'})`
    + ` | safetyNet=${aDetected ? 'A DETECTED invalid ownership, no cleanup' : 'A FAILED to detect'} | finalLockPid=${fin.pid} finalIno=${fin.ino} inodeReused=${a.json && a.json.myIno !== null && fin.ino !== undefined && a.json.myIno === fin.ino}`);
  return !!(bothAcquired && aDetected);
}

(async () => {
  console.log(`=== SUITE v2.3.4-ADV FIXED-CODE (RUN=${RUN}) Bun 1.4.4 + Node v24.22.1 ===`);
  const results = [];
  results.push(await testT2('ADV-T2', 'T2'));
  results.push(await testT2('ADV-T2sim', 'T2sim'));
  results.push(await testT5());
  results.push(await testT6());
  const passed = results.filter(Boolean).length;
  console.log(`=== HASIL RUN=${RUN}: ${passed}/${results.length} expectations matched ===`);
  if (passed !== results.length) process.exitCode = 1;
})();
