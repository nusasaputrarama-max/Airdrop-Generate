// Orchestrator — adversarial tests v2.3.5 (AUTH-T1..T11 + AUTH-C1).
// Semua tes deterministik (barrier), proses/kernel nyata, bukan mock.
//   AUTH-T1  dua parent baru berebut flock pada inode yang sama.
//   AUTH-T2  path lock di-unlink + dibuat ulang saat fd lama memegang flock.
//   AUTH-T3  parent crash (SIGKILL) saat worker stubborn masih hidup.
//   AUTH-T4  fd diwariskan ke child (Python fcntl, flock-compat.py).
//   AUTH-T5  mixed-version old/new (a: scan, b: klasifikasi record,
//            c: new-first lalu old unlink — regresi ADV-T6).
//   AUTH-T6  jendela mikro: guarded vs unguarded (kontrol).
//   AUTH-T7  supervisor restart + cleanup (supervisor-stub.py).
//   AUTH-T8  lock file corrupt/tidak terbaca (a: tanpa holder,
//            b: holder lama hidup).
//   AUTH-T9  kompatibilitas filesystem (a: read-only fs, b: POSIX
//            lockf vs flock, c: NFS — NOT RUN).
//   AUTH-T10 worker token self-check + probe pidfile flock
//            (a: serve, b: token-mismatch in-place, c: parent mati,
//             d: pidfile di-rename).
//   AUTH-T11 zombie liveness (temuan AUTH-T3): holder zombie harus
//            diklasifikasi mati, parent baru tetap READY.
//   AUTH-C1  verifikasi O_CLOEXEC default (Bun + Node) + F_SETFD.
// Usage: node run-auth-tests.cjs <run-number>
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const RUN = process.argv[2] || '1';
const HARNESS = __dirname;
const HARNESS_V234 = path.join(__dirname, '..', 'spike-harness-v234');
const BASE = `/tmp/ssrf-v235/auth-run${RUN}`;
fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });

function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch {}
}
function waitForFile(p, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(p)) return true;
    sleepSync(10);
  }
  return false;
}
function waitForGone(p, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!fs.existsSync(p)) return true;
    sleepSync(10);
  }
  return false;
}
function procAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}
// State /proc (untuk membedakan zombie dari hidup — kill(pid,0)
// saja tidak cukup, lihat AUTH-T11). null = hilang dari /proc.
function procState(pid) {
  try {
    const raw = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const close = raw.lastIndexOf(')');
    return raw.slice(close + 2).split(' ')[0];
  } catch { return null; }
}
// Mati = hilang dari /proc ATAU zombie (Z) ATAU dead (X/x).
function procDead(pid) {
  const s = procState(pid);
  if (s === null) return true;
  return s === 'Z' || s === 'X' || s === 'x';
}
function readJsonFile(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function killPid(pid) {
  if (!pid) return;
  try { process.kill(pid, 'SIGKILL'); } catch {}
}
function countDnsWorkers() {
  let n = 0;
  try {
    for (const e of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(e)) continue;
      try {
        const cmd = fs.readFileSync(`/proc/${e}/cmdline`, 'utf8');
        if (cmd.includes('dns-worker')) n += 1;
      } catch {}
    }
  } catch {}
  return n;
}
function killStragglers() {
  try {
    for (const e of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(e)) continue;
      try {
        const cmd = fs.readFileSync(`/proc/${e}/cmdline`, 'utf8');
        if (cmd.includes('v235-parent') || cmd.includes('dns-worker')) {
          try { process.kill(Number(e), 'SIGKILL'); } catch {}
        }
      } catch {}
    }
  } catch {}
}
function runProc(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, {
      cwd: opts.cwd || HARNESS,
      env: { ...process.env, ...(opts.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, opts.timeoutMs || 30000);
    p.on('exit', (code) => {
      clearTimeout(timer);
      let json = null;
      try { json = JSON.parse(out.trim().split('\n').filter(Boolean).pop()); } catch {}
      resolve({ cmd, code, json, out: out.trim(), err: err.trim(), pid: p.pid });
    });
  });
}
function spawnProc(cmd, args, opts = {}) {
  const p = spawn(cmd, args, {
    cwd: opts.cwd || HARNESS,
    env: { ...process.env, ...(opts.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '', err = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { err += d; });
  p._getJson = () => {
    try { return JSON.parse(out.trim().split('\n').filter(Boolean).pop()); } catch { return null; }
  };
  p._out = () => out.trim();
  p._err = () => err.trim();
  return p;
}
function waitPidExit(pid, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!procAlive(pid)) return true;
    sleepSync(20);
  }
  return false;
}
function staleLock(dir) {
  const lockPath = path.join(dir, 'startup.lock');
  fs.writeFileSync(lockPath, JSON.stringify(
    { pid: 999999, starttime: '0', heartbeatAt: Date.now() - 60000, version: 1 }));
  return lockPath;
}
function mkDir(name) {
  const dir = path.join(BASE, name);
  fs.mkdirSync(dir, { recursive: true });
  const barrier = path.join(dir, 'barrier');
  fs.mkdirSync(barrier, { recursive: true });
  return { dir, barrier, lockPath: path.join(dir, 'startup.lock'), pidfile: path.join(dir, 'parent.pid.json') };
}

const results = [];
function report(name, ok, detail) {
  results.push(ok);
  console.log(`${name} :: ${ok ? 'PASS' : 'FAIL'} | ${detail}`);
}

async function testT1() {
  const { dir, barrier, lockPath } = mkDir('AUTH-T1');
  const [a, b] = await Promise.all([
    runProc('bun', ['parent-stub.js', dir, 'acquire-only', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } }),
    runProc('bun', ['parent-stub.js', dir, 'acquire-only', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } }),
  ]);
  const owners = [a, b].filter((r) => r.json && r.json.acquired);
  const ok = owners.length === 1;
  report('AUTH-T1', ok, `owners=${owners.length} (A acq=${a.json && a.json.acquired}, B acq=${b.json && b.json.acquired}, reasons: A=${a.json && a.json.reason}, B=${b.json && b.json.reason})`);
}

async function testT2() {
  const { dir, barrier, lockPath } = mkDir('AUTH-T2');
  const aP = spawnProc('bun', ['parent-stub.js', dir, 'verify-after-interference', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } });
  if (!waitForFile(path.join(barrier, 'verified'))) { report('AUTH-T2', false, 'A never verified'); try { aP.kill('SIGKILL'); } catch {} return; }
  const inoBefore = fs.statSync(lockPath).ino;
  fs.unlinkSync(lockPath);
  fs.writeFileSync(lockPath, JSON.stringify({ pid: 424242, starttime: '999', heartbeatAt: Date.now(), version: 1, protocol: 'flock-v2' }));
  const inoAfter = fs.statSync(lockPath).ino;
  fs.writeFileSync(path.join(barrier, 'interfered'), '1');
  const aOut = await new Promise((res) => aP.on('exit', () => res(aP._getJson())));
  const detected = aOut && aOut.verifiedAfterInterference === false && aOut.cleanupCalls === 0;
  const b = await runProc('bun', ['parent-stub.js', dir, 'acquire-only', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } });
  const ok = detected && b.json && b.json.acquired === true && inoBefore !== inoAfter;
  report('AUTH-T2', !!ok, `A verifiedAfterInterference=${aOut && aOut.verifiedAfterInterference} cleanupCalls=${aOut && aOut.cleanupCalls} ino ${inoBefore}->${inoAfter} | B (opener baru) acq=${b.json && b.json.acquired}`);
}

async function testT3() {
  const { dir, barrier, lockPath, pidfile } = mkDir('AUTH-T3');
  const p1 = spawnProc('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve-nocheck', 'v235-parent']);
  if (!waitForFile(path.join(barrier, 'parent-ready'))) { report('AUTH-T3', false, 'parent1 never READY'); try { p1.kill('SIGKILL'); } catch {} return; }
  const pf1 = readJsonFile(pidfile);
  const w1 = pf1 && pf1.workerPid;
  const w1AliveBefore = procAlive(w1);
  try { p1.kill('SIGKILL'); } catch {}
  waitPidExit(p1.pid, 5000);
  sleepSync(300);
  const w1AliveAfterCrash = procAlive(w1);
  for (const f of ['parent-ready', 'worker-ready', 'worker-check.json']) {
    try { fs.unlinkSync(path.join(barrier, f)); } catch {}
  }
  const p2 = spawnProc('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve', 'v235-parent']);
  const ready2 = waitForFile(path.join(barrier, 'parent-ready'));
  const pf2 = readJsonFile(pidfile);
  const w2 = pf2 && pf2.workerPid;
  const w1Dead = w1 ? !procAlive(w1) : false;
  const w2Alive = procAlive(w2);
  const nWorkers = countDnsWorkers();
  const ok = ready2 && w1AliveBefore && w1AliveAfterCrash && w1Dead && w2Alive && nWorkers === 1 && w2 !== w1;
  if (!ok) {
    // Dump captured stdio agar penyebab kegagalan P2 dapat didiagnosis
    // (spawnProc menyimpan _out/_err; _getJson mengembalikan JSON terakhir).
    try { console.log('  [AUTH-T3 debug] p2 json:', JSON.stringify(p2._getJson ? p2._getJson() : null), 'p2 rawOut:', JSON.stringify(p2._out ? p2._out() : null), 'p2 rawErr:', JSON.stringify(p2._err ? p2._err() : null)); } catch (e) { console.log('  [AUTH-T3 debug] dump failed:', e.message); }
  }
  report('AUTH-T3', !!ok, `p1Ready w1AliveBefore=${w1AliveBefore} w1AliveAfterCrash=${w1AliveAfterCrash} | p2Ready=${ready2} w1Dead=${w1Dead} w2Alive=${w2Alive} dnsWorkerCount=${nWorkers} w1=${w1} w2=${w2}`);
  try { p2.kill('SIGKILL'); } catch {}
  waitPidExit(p2.pid, 3000);
  killPid(w2);
  killStragglers();
}

async function testT4T9b() {
  const r = spawnSync('python3', ['flock-compat.py', BASE, RUN], { cwd: HARNESS, encoding: 'utf8', timeout: 60000 });
  const lines = r.stdout.trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } });
  const t4 = lines.find((x) => x && x.test === 'AUTH-T4');
  const t9b = lines.find((x) => x && x.test === 'AUTH-T9b');
  global.__t9b = t9b;
  report('AUTH-T4', !!(t4 && t4.result === 'PASS'), `blockedWhileChildAlive=${t4 && t4.blockedWhileChildAlive} acquiredAfterChildDeath=${t4 && t4.acquiredAfterChildDeath} childPid=${t4 && t4.childPid}`);
  return { t4, t9b };
}

async function testT5a() {
  const { dir, barrier, lockPath } = mkDir('AUTH-T5a');
  staleLock(dir);
  const oldP = spawnProc('node', ['old-parent-stub.cjs', lockPath, barrier, '', 'v235-parent']);
  if (!waitForFile(path.join(barrier, 'old-parent.json'))) { report('AUTH-T5a', false, 'old parent never acquired'); try { oldP.kill('SIGKILL'); } catch {} return; }
  const oldJson = readJsonFile(path.join(barrier, 'old-parent.json'));
  const oldAlive = procAlive(oldP.pid);
  const np = await runProc('bun', ['parent-stub.js', dir, 'acquire-only', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent']);
  const ok = oldJson && oldJson.acquired === true && oldAlive
    && np.json && np.json.acquired === false && np.json.reason === 'other-parent-alive';
  report('AUTH-T5a', !!ok, `old acq=${oldJson && oldJson.acquired} oldAlive=${oldAlive} | new acq=${np.json && np.json.acquired} reason=${np.json && np.json.reason} others=${np.json && np.json.others}`);
  try { oldP.kill('SIGKILL'); } catch {}
  waitPidExit(oldP.pid, 3000);
}

async function testT5b() {
  const { dir, barrier, lockPath } = mkDir('AUTH-T5b');
  staleLock(dir);
  const oldP = spawnProc('node', ['old-parent-stub.cjs', lockPath, barrier, '', 'v235-parent']);
  if (!waitForFile(path.join(barrier, 'old-parent.json'))) { report('AUTH-T5b', false, 'old parent never acquired'); try { oldP.kill('SIGKILL'); } catch {} return; }
  const oldJson = readJsonFile(path.join(barrier, 'old-parent.json'));
  const np = await runProc('bun', ['parent-stub.js', dir, 'acquire-only', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } });
  const sentinel = fs.existsSync(path.join(dir, 'startup.lock.mixed'));
  const ok = oldJson && oldJson.acquired === true
    && np.json && np.json.acquired === false && np.json.reason === 'held-by-old-version'
    && sentinel === true;
  report('AUTH-T5b', !!ok, `old acq=${oldJson && oldJson.acquired} | new acq=${np.json && np.json.acquired} reason=${np.json && np.json.reason} holderPid=${np.json && np.json.holderPid} sentinelWritten=${sentinel}`);
  try { oldP.kill('SIGKILL'); } catch {}
  waitPidExit(oldP.pid, 3000);
}

async function testT5c() {
  const { dir, barrier, lockPath } = mkDir('AUTH-T5c');
  staleLock(dir);
  // URUTAN MENGIKAT: B (old-code) HARUS selesai mem-probe record basi
  // SEBELUM A di-spawn. Bila A sudah acquire dulu, B membaca record
  // hidup milik A dan menyerah `held-by-live-holder` sebelum sempat
  // unlink — interleaving yang diuji tidak pernah terjadi.
  const bP = spawnProc('node', ['stepped-racer.cjs', lockPath, 'B', 'T6B', barrier], { cwd: HARNESS_V234 });
  if (!waitForFile(path.join(barrier, 'probed.B'))) { report('AUTH-T5c', false, 'old-code racer never probed'); try { bP.kill('SIGKILL'); } catch {} return; }
  const aP = spawnProc('bun', ['parent-stub.js', dir, 'verify-after-interference', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } });
  if (!waitForFile(path.join(barrier, 'acquired'))) { report('AUTH-T5c', false, 'new parent never acquired'); try { aP.kill('SIGKILL'); bP.kill('SIGKILL'); } catch {} return; }
  fs.writeFileSync(path.join(barrier, 'acquired.A'), '1');
  const bOut = await new Promise((res) => bP.on('exit', () => res(bP._getJson())));
  fs.writeFileSync(path.join(barrier, 'interfered'), '1');
  const aOut = await new Promise((res) => aP.on('exit', () => res(aP._getJson())));
  const bothAcquired = bOut && bOut.acquired === true;
  const detected = aOut && aOut.verifiedAfterInterference === false && aOut.cleanupCalls === 0;
  report('AUTH-T5c', !!(bothAcquired && detected), `B(old) acq=${bOut && bOut.acquired} | A(flock) verifiedAfter=${aOut && aOut.verifiedAfterInterference} cleanupCalls=${aOut && aOut.cleanupCalls} (hazard direproduksi, jaring pengaman menangkap)`);
}

async function testT6() {
  const { dir, barrier, lockPath } = mkDir('AUTH-T6g');
  const aP = spawnProc('bun', ['parent-stub.js', dir, 'guarded-action', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } });
  if (!waitForFile(path.join(barrier, 'verified'))) { report('AUTH-T6', false, 'guarded parent never verified'); try { aP.kill('SIGKILL'); } catch {} return; }
  fs.unlinkSync(lockPath);
  fs.writeFileSync(lockPath, JSON.stringify({ pid: 424242, starttime: '999', heartbeatAt: Date.now(), version: 1, protocol: 'flock-v2' }));
  fs.writeFileSync(path.join(barrier, 'interfered'), '1');
  const aOut = await new Promise((res) => aP.on('exit', () => res(aP._getJson())));
  const guardedOk = aOut && aOut.actionRan === false && aOut.ownershipLost === true;

  const d2 = mkDir('AUTH-T6c');
  const cP = spawnProc('bun', ['parent-stub.js', d2.dir, 'unguarded-action', d2.lockPath, path.join(d2.dir, 'parent.pid.json'), d2.barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } });
  if (!waitForFile(path.join(d2.barrier, 'verified'))) { report('AUTH-T6', false, 'control parent never verified'); try { cP.kill('SIGKILL'); } catch {} return; }
  fs.unlinkSync(d2.lockPath);
  fs.writeFileSync(d2.lockPath, JSON.stringify({ pid: 424242, starttime: '999', heartbeatAt: Date.now(), version: 1, protocol: 'flock-v2' }));
  fs.writeFileSync(path.join(d2.barrier, 'interfered'), '1');
  const cOut = await new Promise((res) => cP.on('exit', () => res(cP._getJson())));
  const controlRan = cOut && cOut.actionRan === true;
  report('AUTH-T6', !!(guardedOk && controlRan), `guarded: actionRan=${aOut && aOut.actionRan} ownershipLost=${aOut && aOut.ownershipLost} | KONTROL tanpa revalidasi: actionRan=${cOut && cOut.actionRan} (jendela nyata, revalidasi kedua yang menutupnya)`);
}

async function testT7() {
  const r = spawnSync('python3', ['supervisor-stub.py', BASE, RUN], { cwd: HARNESS, encoding: 'utf8', timeout: 90000 });
  let j = null;
  try { j = JSON.parse(r.stdout.trim().split('\n').filter(Boolean).pop()); } catch {}
  report('AUTH-T7', !!(j && j.result === 'PASS'), `p2Ready=${j && j.parent2Ready} w1AliveAfterCrash=${j && j.w1AliveAfterCrash} w1Dead=${j && j.w1Dead} w2Alive=${j && j.w2Alive} dnsWorkerCount=${j && j.dnsWorkerCount}`);
  killStragglers();
}

async function testT8a() {
  const { dir, barrier, lockPath } = mkDir('AUTH-T8a');
  fs.writeFileSync(lockPath, 'THIS IS NOT JSON {{{');
  const np = await runProc('bun', ['parent-stub.js', dir, 'acquire-only', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } });
  const refused = np.json && np.json.acquired === false && np.json.reason === 'lock-record-unreadable';
  fs.unlinkSync(lockPath);
  const np2 = await runProc('bun', ['parent-stub.js', dir, 'acquire-only', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } });
  const ok = refused && np2.json && np2.json.acquired === true;
  report('AUTH-T8a', !!ok, `corrupt record -> reason=${np.json && np.json.reason} | setelah operator menghapus file -> acq=${np2.json && np2.json.acquired}`);
}

async function testT8b() {
  const { dir, barrier, lockPath } = mkDir('AUTH-T8b');
  staleLock(dir);
  const oldP = spawnProc('node', ['old-parent-stub.cjs', lockPath, barrier, 'no-heartbeat', 'v235-parent']);
  if (!waitForFile(path.join(barrier, 'old-parent.json'))) { report('AUTH-T8b', false, 'old parent never acquired'); try { oldP.kill('SIGKILL'); } catch {} return; }
  const oldJson = readJsonFile(path.join(barrier, 'old-parent.json'));
  // Rusak isi file DI TEMPAT (inode sama, tanpa heartbeat yang menimpa).
  fs.writeFileSync(lockPath, 'GARBAGE{{{NOT-JSON');
  const np = await runProc('bun', ['parent-stub.js', dir, 'acquire-only', lockPath, path.join(dir, 'parent.pid.json'), barrier, '', 'v235-parent'], { env: { V235_NO_SCAN: '1' } });
  const oldAlive = procAlive(oldP.pid);
  const ok = oldJson && oldJson.acquired === true && oldAlive
    && np.json && np.json.acquired === false && np.json.reason === 'lock-record-unreadable';
  report('AUTH-T8b', !!ok, `old acq=${oldJson && oldJson.acquired} oldAlive=${oldAlive} | new reason=${np.json && np.json.reason} (lapis scan akan menangkapnya lebih dulu bila aktif)`);
  try { oldP.kill('SIGKILL'); } catch {}
  waitPidExit(oldP.pid, 3000);
}

async function testT9a() {
  const r = await runProc('bun', ['rofs-test.js', '/sys/ssrf-v235-test.lock'], { timeoutMs: 15000 });
  const ok = r.json && r.json.openSucceeded === false && r.json.failClosed === true;
  report('AUTH-T9a', !!ok, `open di /sys (read-only): openSucceeded=${r.json && r.json.openSucceeded} errno=${r.json && r.json.errno} failClosed=${r.json && r.json.failClosed}`);
}

function testT9c() {
  const r = spawnSync('sh', ['-c', 'mount | grep -i nfs ; grep -i nfs /proc/mounts'], { encoding: 'utf8' });
  const noNfs = r.stdout.trim() === '';
  // NOT RUN: bukan PASS/FAIL — tidak masuk hitungan.
  console.log(`AUTH-T9c :: NOT RUN | ${noNfs ? 'tidak ada NFS di VM ini (mount/proc/mounts kosong); flock di NFS wajib diuji di staging (FLK-07)' : 'NFS ditemukan — uji tidak dirancang untuk kasus ini'}`);
}

async function testT10a() {
  const { dir, barrier, lockPath, pidfile } = mkDir('AUTH-T10a');
  const p = spawnProc('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve', 'v235-parent']);
  const ready = waitForFile(path.join(barrier, 'parent-ready'));
  const wc = readJsonFile(path.join(barrier, 'worker-check.json'));
  const pf = readJsonFile(pidfile);
  const ok = ready && wc && wc.serve === true && pf && pf.workerPid;
  report('AUTH-T10a', !!ok, `parentReady=${ready} workerCheck.serve=${wc && wc.serve} reason=${wc && wc.reason}`);
  try { p.kill('SIGKILL'); } catch {}
  waitPidExit(p.pid, 3000);
  killPid(pf && pf.workerPid);
  killStragglers();
  return { dir, barrier, lockPath, pidfile };
}

async function testT10b() {
  const { dir, barrier, lockPath, pidfile } = mkDir('AUTH-T10b');
  const p = spawnProc('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve', 'v235-parent']);
  if (!waitForFile(path.join(barrier, 'parent-ready'))) { report('AUTH-T10b', false, 'parent never READY'); try { p.kill('SIGKILL'); } catch {} killStragglers(); return; }
  const pf = readJsonFile(pidfile);
  const w = pf && pf.workerPid;
  // Timpa token DI TEMPAT (panjang byte sama, inode sama — flock pidfile
  // tetap dipegang parent, sehingga yang diuji murni jalur token).
  const raw = fs.readFileSync(pidfile, 'utf8');
  const replaced = raw.replace(/"lockToken":"[0-9a-f]{32}"/, `"lockToken":"${'0'.repeat(32)}"`);
  if (replaced === raw || replaced.length !== raw.length) { report('AUTH-T10b', false, 'gagal menyiapkan overwrite in-place'); try { p.kill('SIGKILL'); } catch {} killPid(w); killStragglers(); return; }
  const wfd = fs.openSync(pidfile, 'w');
  fs.writeSync(wfd, replaced, 0);
  fs.closeSync(wfd);
  const dead = waitPidExit(w, 4000);
  const wc = readJsonFile(path.join(barrier, 'worker-check.json'));
  const ok = dead && wc && wc.recheckFailed === true && wc.reason === 'token-mismatch';
  report('AUTH-T10b', !!ok, `worker exit setelah token diganti in-place: dead=${dead} recheckReason=${wc && wc.reason}`);
  try { p.kill('SIGKILL'); } catch {}
  waitPidExit(p.pid, 3000);
  killStragglers();
}

async function testT10c() {
  const { dir, barrier, lockPath, pidfile } = mkDir('AUTH-T10c');
  const p = spawnProc('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve', 'v235-parent']);
  if (!waitForFile(path.join(barrier, 'parent-ready'))) { report('AUTH-T10c', false, 'parent never READY'); try { p.kill('SIGKILL'); } catch {} killStragglers(); return; }
  const pf = readJsonFile(pidfile);
  const w = pf && pf.workerPid;
  try { p.kill('SIGKILL'); } catch {}
  waitPidExit(p.pid, 3000);
  const dead = waitPidExit(w, 4000);
  const wc = readJsonFile(path.join(barrier, 'worker-check.json'));
  const ok = dead && wc && wc.recheckFailed === true && wc.reason === 'pidfile-lock-not-held-no-live-parent';
  report('AUTH-T10c', !!ok, `parent SIGKILL -> worker exit sendiri: dead=${dead} recheckReason=${wc && wc.reason}`);
  killStragglers();
}

async function testT10d() {
  const { dir, barrier, lockPath, pidfile } = mkDir('AUTH-T10d');
  const p = spawnProc('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve', 'v235-parent']);
  if (!waitForFile(path.join(barrier, 'parent-ready'))) { report('AUTH-T10d', false, 'parent never READY'); try { p.kill('SIGKILL'); } catch {} killStragglers(); return; }
  const pf = readJsonFile(pidfile);
  const w = pf && pf.workerPid;
  // Ganti pidfile via rename atomik dengan ISI IDENTIK (hanya inode
  // yang berubah): probe worker atas inode baru harus lolos (tidak ada
  // flock) -> worker keluar. Ini menguji murni jalur probe, bukan token.
  const pf2 = { ...pf };
  const tmp = `${pidfile}.tmp.orchestrator`;
  fs.writeFileSync(tmp, JSON.stringify(pf2));
  fs.renameSync(tmp, pidfile);
  const dead = waitPidExit(w, 4000);
  const wc = readJsonFile(path.join(barrier, 'worker-check.json'));
  const ok = dead && wc && wc.recheckFailed === true && wc.reason === 'pidfile-lock-not-held-no-live-parent';
  report('AUTH-T10d', !!ok, `pidfile di-rename (inode baru) -> worker exit: dead=${dead} recheckReason=${wc && wc.reason}`);
  try { p.kill('SIGKILL'); } catch {}
  waitPidExit(p.pid, 3000);
  killStragglers();
}

async function testC1() {
  const bun = await runProc('bun', ['cloexec-check.js'], { timeoutMs: 15000 });
  const node = await runProc('node', ['cloexec-check.cjs'], { timeoutMs: 15000 });
  const py = spawnSync('python3', ['-c', [
    'import fcntl, os',
    'fd = os.open("/tmp/cloexec-v235-py.txt", os.O_RDWR | os.O_CREAT, 0o644)',
    'def has():',
    '    info = open(f"/proc/self/fdinfo/{fd}").read()',
    '    import re; m = re.search(r"flags:\\s*([0-7]+)", info)',
    '    return (int(m.group(1), 8) & 0o2000000) != 0',
    'before = has()',
    'flags = fcntl.fcntl(fd, fcntl.F_GETFD)',
    'fcntl.fcntl(fd, fcntl.F_SETFD, flags & ~fcntl.FD_CLOEXEC)',
    'cleared = not has()',
    'fcntl.fcntl(fd, fcntl.F_SETFD, flags | fcntl.FD_CLOEXEC)',
    'set_again = has()',
    'print("CLEARED=%s SET_AGAIN=%s BEFORE=%s" % (cleared, set_again, before))',
    'os.close(fd)',
  ].join('\n')], { encoding: 'utf8', timeout: 15000 });
  const pyOk = /CLEARED=True SET_AGAIN=True BEFORE=True/.test(py.stdout);
  const ok = bun.json && bun.json.cloexecDefault === true
    && node.json && node.json.cloexecDefault === true && pyOk;
  report('AUTH-C1', !!ok, `bun cloexecDefault=${bun.json && bun.json.cloexecDefault} node cloexecDefault=${node.json && node.json.cloexecDefault} python F_SETFD round-trip: ${py.stdout.trim()}`);
}

// AUTH-T11 — zombie liveness (temuan AUTH-T3, perbaikan v2.3.5):
// P1 dibunuh SIGKILL TANPA di-reap (event loop sengaja diblokir
// sleepSync, menirukan supervisor yang tidak me-reap). P1 harus
// teramati sebagai zombie (state Z) sementara kill(pid,0) tetap
// SUCCEEDS. P2 kemudian harus tetap bisa READY — membuktikan
// pidAlive() yang zombie-aware mengklasifikasi holder zombie
// sebagai mati (stale), bukan lock-record-contradiction.
// Tanpa perbaikan ini P2 keluar dengan reason
// lock-record-contradiction (dibuktikan di /tmp/zombiecheck2.cjs:
// P1 state Z, kill0 SUCCEEDS, P2 acquired:false).
async function testT11() {
  const { dir, barrier, lockPath, pidfile } = mkDir('AUTH-T11');
  const p1 = spawnProc('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve-nocheck', 'v235-parent']);
  if (!waitForFile(path.join(barrier, 'parent-ready'))) { report('AUTH-T11', false, 'parent1 never READY'); try { p1.kill('SIGKILL'); } catch {} return; }
  const pf1 = readJsonFile(pidfile);
  const w1 = pf1 && pf1.workerPid;
  try { p1.kill('SIGKILL'); } catch {}
  sleepSync(500); // event loop terblokir -> P1 TIDAK di-reap -> zombie
  const p1State = procState(p1.pid);
  let kill0 = 'n/a';
  try { process.kill(p1.pid, 0); kill0 = 'SUCCEEDS'; } catch (e) { kill0 = 'throws ' + e.code; }
  const zombieSetup = p1State === 'Z' && kill0 === 'SUCCEEDS';
  for (const f of ['parent-ready', 'worker-ready', 'worker-check.json']) {
    try { fs.unlinkSync(path.join(barrier, f)); } catch {}
  }
  const p2 = spawnProc('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve', 'v235-parent']);
  const ready2 = waitForFile(path.join(barrier, 'parent-ready'), 20000);
  const pf2 = readJsonFile(pidfile);
  const w2 = pf2 && pf2.workerPid;
  const w1Dead = w1 ? procDead(w1) : false;
  const w2Alive = procAlive(w2);
  const nWorkers = countDnsWorkers();
  const ok = zombieSetup && ready2 && w1Dead && w2Alive && nWorkers === 1 && w2 !== w1;
  report('AUTH-T11', !!ok, `zombieSetup=${zombieSetup} (P1 state=${p1State}, kill0=${kill0}) | p2Ready=${ready2} w1Dead=${w1Dead} w2Alive=${w2Alive} dnsWorkerCount=${nWorkers} w1=${w1} w2=${w2}`);
  try { p2.kill('SIGKILL'); } catch {}
  waitPidExit(p2.pid, 3000);
  killPid(w2);
  killStragglers();
}

(async () => {
  console.log(`=== SUITE v2.3.5-AUTH (RUN=${RUN}) Bun 1.4.4 + Node v24.22.1 + Python 3.12.3 ===`);
  await testT1();
  await testT2();
  await testT3();
  await testT4T9b();
  await testT5a();
  await testT5b();
  await testT5c();
  await testT6();
  await testT7();
  await testT8a();
  await testT8b();
  await testT9a();
  testT9c();
  await testT10a();
  await testT10b();
  await testT10c();
  await testT10d();
  await testC1();
  await testT11();
  killStragglers();
  const passed = results.filter(Boolean).length;
  console.log(`=== HASIL RUN=${RUN}: ${passed}/${results.length} expectations matched ===`);
  if (passed !== results.length) process.exitCode = 1;
})();
