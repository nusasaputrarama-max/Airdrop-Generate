// Runner pengujian v2.3.3 — reklamasi lock yang diperkeras + STARTUP-10.
// Semua tes lokal di /tmp/ssrf-v233, proses/komponen yang dikontrol sendiri.
// Skala tes: heartbeatStaleMs kecil (100 ms) HANYA untuk membuktikan
// heartbeat TIDAK dipakai dalam keputusan hapus (RCL-T1).
// Setiap tes dijalankan 2x (RUN=1 dan RUN=2) untuk reproduksibilitas.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const S = require('./startup.cjs');

const DIR = '/tmp/ssrf-v233';
const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name} :: ${detail}`);
}
const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'v233-'));
const sleep = S.sleep;
const myIdentity = () => ({ pid: process.pid, starttime: S.readProcStat(process.pid).starttime });

function writeLock(lockPath, holder) {
  fs.writeFileSync(lockPath, JSON.stringify({ ...holder, version: 1 }));
}
function readLockRaw(lockPath) { return fs.readFileSync(lockPath, 'utf8'); }

// RCL-T1: heartbeat basi + PID HIDUP -> JANGAN hapus (perubahan v2.3.3).
// v2.3.2 akan menghapus karena "PID tidak hidup DAN/ATAU heartbeat basi".
async function testRCL1() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  const holder = spawn('sleep', ['30'], { stdio: 'ignore' });
  const stat = S.readProcStat(holder.pid);
  const before = JSON.stringify({ pid: holder.pid, starttime: stat.starttime, heartbeatAt: Date.now() - 60000, version: 1 });
  fs.writeFileSync(lockPath, before);
  const res = S.acquireStartupLock(lockPath, myIdentity(), { heartbeatStaleMs: 100, maxReclaim: 3 });
  const after = readLockRaw(lockPath);
  check('RCL-T1', res.acquired === false && res.reason === 'held-by-live-holder'
    && after === before && S.pidAlive(holder.pid),
    `reason=${res.reason} lockUtuh=${after === before} holderHidup=${S.pidAlive(holder.pid)} heartbeatBasi=60dtk`);
  try { holder.kill('SIGKILL'); } catch {}
}

// RCL-T2: probe melempar EPERM -> status TIDAK PASTI -> jangan hapus, jangan lanjut.
async function testRCL2() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  writeLock(lockPath, { pid: 999999, starttime: '1', heartbeatAt: Date.now() - 60000 });
  const before = readLockRaw(lockPath);
  const epermProbe = () => { const e = new Error('not permitted'); e.code = 'EPERM'; throw e; };
  const res = S.acquireStartupLock(lockPath, myIdentity(), { probe: epermProbe });
  const after = readLockRaw(lockPath);
  check('RCL-T2', res.acquired === false && res.reason === 'holder-unverifiable'
    && res.page === true && after === before,
    `reason=${res.reason} detail=${res.detail} page=${res.page} lockUtuh=${after === before}`);
}

// RCL-T3: probe mengembalikan uncertain (stat tidak terbaca) -> sama, fail-closed.
async function testRCL3() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  writeLock(lockPath, { pid: 999999, starttime: '1', heartbeatAt: Date.now() - 60000 });
  const before = readLockRaw(lockPath);
  const res = S.acquireStartupLock(lockPath, myIdentity(), { probe: () => ({ status: 'uncertain', reason: 'stat-unreadable' }) });
  const after = readLockRaw(lockPath);
  check('RCL-T3', res.acquired === false && res.reason === 'holder-unverifiable'
    && res.detail === 'stat-unreadable' && res.page === true && after === before,
    `reason=${res.reason} detail=${res.detail} page=${res.page} lockUtuh=${after === before}`);
}

// RCL-T4: probe ESRCH (PID terbukti mati) -> reklamasi berjalan.
async function testRCL4() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  writeLock(lockPath, { pid: 999999, starttime: '1', heartbeatAt: Date.now() - 60000 });
  const res = S.acquireStartupLock(lockPath, myIdentity(), { probe: () => ({ status: 'dead', proof: 'esrch' }) });
  const owned = res.acquired ? S.verifyLockOwnership(lockPath, myIdentity()) : false;
  check('RCL-T4', res.acquired === true && res.reclaimed === true && owned === true,
    `acquired=${res.acquired} reclaimed=${res.reclaimed} ownershipVerified=${owned}`);
  if (res.acquired) { try { fs.closeSync(res.fd); } catch {} }
}

// RCL-T5: lock tidak terbaca (isi sampah, mtime segar) -> JANGAN hapus otomatis.
// (PERUBAHAN v2.3.3: menghapus aturan v2.3.2 "hapus bila >30 dtk".)
async function testRCL5() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  const garbage = '{"pid": 123, "starttime": "xx';
  fs.writeFileSync(lockPath, garbage);
  const res = S.acquireStartupLock(lockPath, myIdentity(), {});
  const after = readLockRaw(lockPath);
  check('RCL-T5', res.acquired === false && res.reason === 'lock-unreadable'
    && res.page === true && after === garbage,
    `reason=${res.reason} page=${res.page} lockUtuh=${after === garbage}`);
}

// RCL-T6: PID hidup + starttime tidak cocok (PID reuse) -> JANGAN hapus (aturan ketat v2.3.3).
async function testRCL6() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  const decoy = spawn('sleep', ['30'], { stdio: 'ignore' });
  const stat = S.readProcStat(decoy.pid);
  const before = JSON.stringify({ pid: decoy.pid, starttime: String(Number(stat.starttime) + 12345), heartbeatAt: Date.now() - 60000, version: 1 });
  fs.writeFileSync(lockPath, before);
  const res = S.acquireStartupLock(lockPath, myIdentity(), { heartbeatStaleMs: 100 });
  const after = readLockRaw(lockPath);
  check('RCL-T6', res.acquired === false && res.reason === 'holder-identity-mismatch'
    && res.page === true && after === before && S.pidAlive(decoy.pid),
    `reason=${res.reason} page=${res.page} lockUtuh=${after === before} decoyHidup=${S.pidAlive(decoy.pid)}`);
  try { decoy.kill('SIGKILL'); } catch {}
}

// SU10-T1 (STARTUP-10): 5 parent bersamaan mereklamasi lock basi yang sama.
// Holder PID 999999 mati (ESRCH) + heartbeat basi. Tepat 1 pemenang;
// yang kalah keluar tanpa cleanup; pemenang memvalidasi ulang kepemilikan.
async function testSU10T1() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  writeLock(lockPath, { pid: 999999, starttime: '1', heartbeatAt: Date.now() - 60000 });
  const racers = [];
  for (let i = 0; i < 5; i++) {
    racers.push(new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(DIR, 'lock-racer-v233.cjs'), lockPath, String(i), '10'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', (c) => { out += c; });
      child.on('close', () => { try { resolve(JSON.parse(out.trim().split('\n').pop())); } catch { resolve({ id: String(i), acquired: false, reason: 'no-output' }); } });
    }));
  }
  const res = await Promise.all(racers);
  const winners = res.filter((r) => r.acquired);
  const losers = res.filter((r) => !r.acquired);
  const loserReasonsOk = losers.every((r) => ['held-by-live-holder', 'lock-unreadable', 'reclaim-exhausted', 'ownership-revalidation-failed'].includes(r.reason));
  const noCleanup = res.every((r) => r.cleanupCalls === 0);
  let lockOwnerOk = false;
  try {
    const finalRec = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lockOwnerOk = winners.length === 1 && finalRec.pid === winners[0].pid;
  } catch { lockOwnerOk = false; }
  check('SU10-T1', winners.length === 1 && winners[0].reclaimed === true
    && winners[0].ownershipVerified === true && loserReasonsOk && noCleanup && lockOwnerOk,
    `pemenang=${winners.length} reclaimed=${winners[0] ? winners[0].reclaimed : '-'} ` +
    `ownershipVerified=${winners[0] ? winners[0].ownershipVerified : '-'} ` +
    `alasanKalah=${[...new Set(losers.map((r) => r.reason))].join(',')} ` +
    `cleanupCalls=0 lockOwnerOk=${lockOwnerOk}`);
}

// SU10-T2: 5 parent bersamaan, holder HIDUP -> 0 pemenang, semua held-by-live-holder.
async function testSU10T2() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  const holder = spawn('sleep', ['30'], { stdio: 'ignore' });
  const stat = S.readProcStat(holder.pid);
  writeLock(lockPath, { pid: holder.pid, starttime: stat.starttime, heartbeatAt: Date.now() });
  const racers = [];
  for (let i = 0; i < 5; i++) {
    racers.push(new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(DIR, 'lock-racer-v233.cjs'), lockPath, String(i), '3'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', (c) => { out += c; });
      child.on('close', () => { try { resolve(JSON.parse(out.trim().split('\n').pop())); } catch { resolve({ id: String(i), acquired: false, reason: 'no-output' }); } });
    }));
  }
  const res = await Promise.all(racers);
  const winners = res.filter((r) => r.acquired);
  const allHeld = res.every((r) => !r.acquired && r.reason === 'held-by-live-holder');
  const noCleanup = res.every((r) => r.cleanupCalls === 0);
  check('SU10-T2', winners.length === 0 && allHeld && noCleanup && S.pidAlive(holder.pid),
    `pemenang=${winners.length} semuaHeld=${allHeld} cleanupCalls=0 holderHidup=${S.pidAlive(holder.pid)}`);
  try { holder.kill('SIGKILL'); } catch {}
}

(async () => {
  const run = process.argv[2] || '1';
  console.log(`=== SUITE v2.3.3-RECLAIM (RUN=${run}) Node ${process.version} ===`);
  await testRCL1();
  await testRCL2();
  await testRCL3();
  await testRCL4();
  await testRCL5();
  await testRCL6();
  await testSU10T1();
  await testSU10T2();
  const passed = results.filter((r) => r.pass).length;
  console.log(`=== HASIL RUN=${run}: ${passed}/${results.length} PASS ===`);
  if (passed !== results.length) process.exitCode = 1;
})();
