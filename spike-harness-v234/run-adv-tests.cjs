// Orchestrator for adversarial stale-lock-reclaim tests on the v2.3.3
// reference implementation (startup-v233.cjs, Node).
//
// Each test spawns two REAL processes (A and B) that run the EXACT
// acquireStartupLock op sequence with barrier hooks, so the interleaving
// is deterministic, not a matter of random timing.
//
// Safety property under test: AT MOST ONE parent may report acquired=true
// (owner status) in a single run. Any run with two owners violates it.
//
//   ADV-T1  — ChatGPT scenario: B unlinks AFTER A created + verified.
//             Expectation on v2.3.3 code: property VIOLATED (2 owners).
//   ADV-T3a — B unlinks after A created, BEFORE A verifies.
//             Expectation: property HOLDS (verify catches it; A fails).
//   ADV-T3c — both unlink before either creates.
//             Expectation: property HOLDS (O_EXCL serialises creation).
//
// Usage: node run-adv-tests.cjs <run-number>
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RUN = process.argv[2] || '1';
const HARNESS = __dirname;
const BASE = `/tmp/ssrf-v234/adv-run${RUN}`;
// Barrier signal files MUST NOT survive from a previous run: a stale
// `acquired.A` / `probed.A` file would release a wait immediately and
// destroy the choreography. Wipe the whole run directory first.
fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });

function staleLock(dir) {
  const lockPath = path.join(dir, 'startup.lock');
  const rec = { pid: 999999, starttime: '0', heartbeatAt: Date.now() - 60000, version: 1 };
  fs.writeFileSync(lockPath, JSON.stringify(rec));
  return lockPath;
}

function runRacer(lockPath, id, variant, barrierDir) {
  return new Promise((resolve) => {
    const p = spawn('node', ['stepped-racer.cjs', lockPath, id, variant, barrierDir], {
      cwd: HARNESS, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, 20000);
    p.on('exit', (code) => {
      clearTimeout(timer);
      let json = null;
      try { json = JSON.parse(out.trim().split('\n').pop()); } catch {}
      resolve({ id, code, json, out: out.trim(), err: err.trim() });
    });
  });
}

function readFinalLock(lockPath) {
  try {
    const st = fs.statSync(lockPath);
    const rec = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    return { ino: st.ino, pid: rec.pid, starttime: rec.starttime };
  } catch (e) { return { error: String(e.code || e.message) }; }
}

async function oneTest(name, variant, expect) {
  const dir = path.join(BASE, name);
  fs.mkdirSync(dir, { recursive: true });
  const lockPath = staleLock(dir);
  const [a, b] = await Promise.all([
    runRacer(lockPath, 'A', variant, dir),
    runRacer(lockPath, 'B', variant, dir),
  ]);
  const owners = [a, b].filter((r) => r.json && r.json.acquired);
  const finalLock = readFinalLock(lockPath);
  const propertyHolds = owners.length <= 1;
  // Did B's unlink delete A's file? Proven when A's inode != final path inode
  // while A still reported acquired=true.
  const aDeleted = a.json && a.json.acquired && a.json.myIno !== null
    && finalLock.ino !== undefined && a.json.myIno !== finalLock.ino;
  const verdict = propertyHolds ? 'PROPERTY HOLDS' : 'PROPERTY VIOLATED — 2 OWNERS';
  const matchesExpectation = (expect === 'violated' && !propertyHolds)
    || (expect === 'holds' && propertyHolds);
  console.log(`${name} :: ${verdict} | owners=${owners.map((o) => o.id).join(',') || 'none'}`
    + ` | A(acq=${a.json ? a.json.acquired : '?'},reason=${a.json ? (a.json.reason || 'ok') : '?'},ino=${a.json ? a.json.myIno : '?'})`
    + ` B(acq=${b.json ? b.json.acquired : '?'},reason=${b.json ? (b.json.reason || 'ok') : '?'},ino=${b.json ? b.json.myIno : '?'})`
    + ` | finalLockPid=${finalLock.pid} finalIno=${finalLock.ino} aFileDeleted=${aDeleted}`
    + ` | expectation(${expect})=${matchesExpectation ? 'MATCHED' : 'MISMATCHED'}`);
  return { name, variant, owners: owners.map((o) => o.id), propertyHolds, aDeleted, matchesExpectation };
}

(async () => {
  console.log(`=== SUITE v2.3.4-ADV OLD-CODE (RUN=${RUN}) Node v24.22.1 ===`);
  const results = [];
  results.push(await oneTest('ADV-T1', 'T1', 'violated'));
  results.push(await oneTest('ADV-T3a', 'T3a', 'holds'));
  results.push(await oneTest('ADV-T3c', 'T3c', 'holds'));
  const bad = results.filter((r) => !r.matchesExpectation);
  console.log(`=== HASIL RUN=${RUN}: ${results.length - bad.length}/${results.length} expectations matched ===`);
  if (bad.length) { console.log('MISMATCHED: ' + bad.map((b) => b.name).join(', ')); process.exitCode = 1; }
})();
