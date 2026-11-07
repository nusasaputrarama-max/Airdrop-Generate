// Runner pengujian v2.3.2 (dipakai ulang sebagai REGRESI pada v2.3.3) — startup NOT_READY, validasi identitas,
// pidfile atomik, startup lock. Semua tes lokal di /tmp/ssrf-v232,
// proses yang dikontrol sendiri. Skala tes: exitWaitMs=300, attempts=3.
// Setiap tes dijalankan 2× (RUN=1 dan RUN=2) untuk reproduksibilitas.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const S = require('./startup-v233.cjs');

const DIR = '/tmp/ssrf-v233';
const WORKER = path.join(DIR, 'dns-worker.cjs');
const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name} :: ${detail}`);
}
const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'v232-'));

function spawnWorker() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; if (out.includes('ready')) resolve(child); });
    child.on('error', reject);
    setTimeout(() => reject(new Error('worker tidak ready dalam 5 dtk')), 5000);
  });
}
async function killQuietly(child) { try { child.kill('SIGKILL'); } catch {} }

// SU-T1: worker tidak bisa dimatikan (exit tak terkonfirmasi) -> tetap NOT_READY
async function testT1() {
  const d = tmpdir();
  const pidfile = path.join(d, 'parent.pid.json');
  const fake = S.fakeUnconfirmableKiller();
  const parent = new S.ParentStartup({ attempts: 3, exitWaitMs: 300, killer: fake });
  // Pidfile mengklaim worker pid 999999 (tidak hidup) -> tidak menguji ini;
  // untuk menguji jalur attempts, pidfile harus menunjuk PID HIDUP yang
  // identitasnya valid. Pakai worker nyata, tetapi killer palsu yang
  // TIDAK PERNAH membunuh -> exit tidak pernah terkonfirmasi.
  const worker = await spawnWorker();
  const stat = S.readProcStat(worker.pid);
  S.atomicWritePidfile(pidfile, {
    parentPid: 11111, workerPid: worker.pid, workerStarttime: stat.starttime,
    workerToken: 'tok-t1', writtenAt: Date.now(), version: 1,
  });
  const res = await parent.runCleanup(pidfile);
  const rej1 = parent.acceptLookup();
  const rej2 = parent.acceptLookup();
  check('SU-T1', parent.state === 'NOT_READY' && res.ready === false
    && res.path === 'attempts-exhausted-unconfirmed'
    && fake.kills.length === 3 && parent.lookupRejections === 2
    && rej1.code === 'DNS_PARENT_NOT_READY' && rej2.code === 'DNS_PARENT_NOT_READY'
    && S.pidAlive(worker.pid),
    `state=${parent.state} path=${res.path} sigsSent=${fake.kills.length} ` +
    `rejections=${parent.lookupRejections} workerMasihHidup=${S.pidAlive(worker.pid)}`);
  await killQuietly(worker);
}

// SU-T2: PID reuse — pidfile menunjuk proses lain (cmdline/starttime beda) -> tanpa SIGKILL, NOT_READY
async function testT2() {
  const d = tmpdir();
  const pidfile = path.join(d, 'parent.pid.json');
  // Decoy: proses `sleep` — cmdline tidak mengandung 'dns-worker'.
  const decoy = spawn('sleep', ['30'], { stdio: 'ignore' });
  const stat = S.readProcStat(decoy.pid);
  S.atomicWritePidfile(pidfile, {
    parentPid: 11111, workerPid: decoy.pid, workerStarttime: stat.starttime,
    workerToken: 'tok-t2', writtenAt: Date.now(), version: 1,
  });
  const fake = S.fakeUnconfirmableKiller();
  const parent = new S.ParentStartup({ attempts: 3, exitWaitMs: 300, killer: fake });
  // Ubah starttime yang diklaim agar tidak cocok (simulasi PID reuse
  // dengan starttime berbeda) — validasi harus gagal di starttime.
  const rec = JSON.parse(fs.readFileSync(pidfile, 'utf8'));
  rec.workerStarttime = String(Number(rec.workerStarttime) + 12345);
  S.atomicWritePidfile(pidfile, rec);
  const res = await parent.runCleanup(pidfile);
  check('SU-T2', parent.state === 'NOT_READY' && res.ready === false
    && res.path === 'identity-failed' && fake.kills.length === 0
    && parent.pageCount === 1 && S.pidAlive(decoy.pid),
    `state=${parent.state} path=${res.path} reason=${res.reason} ` +
    `sigsSent=${fake.kills.length} page=${parent.pageCount} decoyHidup=${S.pidAlive(decoy.pid)}`);
  await killQuietly(decoy);
}

// SU-T3: worker nyata, identitas valid -> SIGKILL + exit terkonfirmasi -> READY
async function testT3() {
  const d = tmpdir();
  const pidfile = path.join(d, 'parent.pid.json');
  const worker = await spawnWorker();
  const stat = S.readProcStat(worker.pid);
  S.atomicWritePidfile(pidfile, {
    parentPid: 11111, workerPid: worker.pid, workerStarttime: stat.starttime,
    workerToken: 'tok-t3', writtenAt: Date.now(), version: 1,
  });
  const parent = new S.ParentStartup({ attempts: 3, exitWaitMs: 2000, killer: S.realKiller });
  const res = await parent.runCleanup(pidfile);
  const ok = parent.acceptLookup();
  check('SU-T3', parent.state === 'READY' && res.ready === true
    && res.path === 'exit-confirmed' && res.attemptsUsed === 1
    && ok.ok === true && !S.pidAlive(worker.pid),
    `state=${parent.state} path=${res.path} attemptsUsed=${res.attemptsUsed} ` +
    `lookupOk=${ok.ok} workerHidup=${S.pidAlive(worker.pid)}`);
}

// SU-T4: pidfile atomik — 20 penulis bersamaan + simulasi crash saat tulis
async function testT4() {
  const d = tmpdir();
  const pidfile = path.join(d, 'parent.pid.json');
  S.atomicWritePidfile(pidfile, {
    parentPid: 1, workerPid: 2, workerStarttime: '100', workerToken: 'seed',
    writtenAt: Date.now(), version: 1,
  });
  // 20 penulis bersamaan, masing-masing record lengkap berbeda.
  const writers = [];
  for (let i = 0; i < 20; i++) {
    writers.push(new Promise((resolve) => {
      setImmediate(() => {
        S.atomicWritePidfile(pidfile, {
          parentPid: 100 + i, workerPid: 200 + i, workerStarttime: String(1000 + i),
          workerToken: `tok-${i}`, writtenAt: Date.now(), version: 1,
        });
        resolve();
      });
    }));
  }
  await Promise.all(writers);
  const afterRace = S.readPidfile(pidfile);
  // Simulasi crash saat tulis: file tmp setengah tertulis, TIDAK pernah di-rename.
  fs.writeFileSync(`${pidfile}.tmp.crash`, '{"parentPid": 999, "workerPid":');
  const afterCrash = S.readPidfile(pidfile);
  check('SU-T4', afterRace.ok === true && afterCrash.ok === true
    && afterCrash.record.workerToken === afterRace.record.workerToken
    && typeof afterCrash.record.workerPid === 'number'
    && typeof afterCrash.record.workerStarttime === 'string'
    && typeof afterCrash.record.workerToken === 'string',
    `setelahRace ok=${afterRace.ok} token=${afterRace.ok ? afterRace.record.workerToken : '-'} ` +
    `setelahCrash ok=${afterCrash.ok} tokenSama=${afterCrash.ok && afterRace.ok && afterCrash.record.workerToken === afterRace.record.workerToken}`);
}

// SU-T5: startup lock — 5 parent (proses nyata) bersamaan, tepat 1 menang,
// yang kalah tidak melakukan cleanup (tidak ada pemanggilan killer).
async function testT5() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  const racers = [];
  for (let i = 0; i < 5; i++) {
    racers.push(new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(DIR, 'lock-racer.cjs'), lockPath, String(i)], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', (c) => { out += c; });
      child.on('close', () => { try { resolve(JSON.parse(out.trim())); } catch { resolve({ id: String(i), acquired: false, reason: 'no-output' }); } });
    }));
  }
  const res = await Promise.all(racers);
  const winners = res.filter((r) => r.acquired);
  const losers = res.filter((r) => !r.acquired);
  const allLosersHeld = losers.every((r) => r.reason === 'held-by-live-holder');
  check('SU-T5', winners.length === 1 && losers.length === 4 && allLosersHeld,
    `pemenang=${winners.length} kalah=${losers.length} alasanKalah=${[...new Set(losers.map((r) => r.reason))].join(',')}`);
}

// SU-T6: pemegang lock mati -> lock dapat direklamasi parent baru
async function testT6() {
  const d = tmpdir();
  const lockPath = path.join(d, 'startup.lock');
  const holder = spawn('sleep', ['30'], { stdio: 'ignore' });
  const stat = S.readProcStat(holder.pid);
  const first = S.acquireStartupLock(lockPath, { pid: holder.pid, starttime: stat.starttime }, { heartbeatStaleMs: 100 });
  await killQuietly(holder);
  await S.sleep(300); // pastikan proses mati + heartbeat basi
  const second = S.acquireStartupLock(lockPath, { pid: process.pid, starttime: S.readProcStat(process.pid).starttime }, { heartbeatStaleMs: 100 });
  check('SU-T6', first.acquired === true && second.acquired === true && second.reclaimed === true,
    `pertama=${first.acquired} kedua=${second.acquired} direklamasi=${second.reclaimed}`);
  if (second.acquired) { try { fs.closeSync(second.fd); } catch {} }
}

// SU-T7: pidfile basi (parent mati, worker mati) -> "tidak pernah ada" -> READY tanpa SIGKILL
async function testT7() {
  const d = tmpdir();
  const pidfile = path.join(d, 'parent.pid.json');
  S.atomicWritePidfile(pidfile, {
    parentPid: 999998, workerPid: 999999, workerStarttime: '123456',
    workerToken: 'tok-t7', writtenAt: Date.now(), version: 1,
  });
  const fake = S.fakeUnconfirmableKiller();
  const parent = new S.ParentStartup({ attempts: 3, exitWaitMs: 300, killer: fake });
  const res = await parent.runCleanup(pidfile);
  check('SU-T7', parent.state === 'READY' && res.ready === true
    && res.path === 'worker-already-dead' && fake.kills.length === 0,
    `state=${parent.state} path=${res.path} sigsSent=${fake.kills.length}`);
}

// SU-T8: worker mati sendiri SEBELUM cleanup dimulai -> bukti (b)
// "worker tidak pernah ada" -> READY tanpa SIGKILL apa pun.
async function testT8() {
  const d = tmpdir();
  const pidfile = path.join(d, 'parent.pid.json');
  const worker = await spawnWorker();
  const stat = S.readProcStat(worker.pid);
  S.atomicWritePidfile(pidfile, {
    parentPid: 11111, workerPid: worker.pid, workerStarttime: stat.starttime,
    workerToken: 'tok-t8', writtenAt: Date.now(), version: 1,
  });
  // Worker mati sendiri sebelum cleanup dimulai (di luar kendali parent baru).
  worker.kill('SIGKILL');
  for (let i = 0; i < 100 && S.pidAlive(worker.pid); i++) await S.sleep(10);
  const deadBefore = !S.pidAlive(worker.pid);
  const fake = S.fakeUnconfirmableKiller();
  const parent = new S.ParentStartup({ attempts: 3, exitWaitMs: 300, killer: fake });
  const res = await parent.runCleanup(pidfile);
  check('SU-T8', deadBefore && parent.state === 'READY' && res.ready === true
    && res.path === 'worker-already-dead' && fake.kills.length === 0,
    `matiSebelumCleanup=${deadBefore} state=${parent.state} path=${res.path} sigsSent=${fake.kills.length}`);
}

// SU-T9: pidfile rusak/parsial -> TIDAK dapat membuktikan worker mati ->
// tetap NOT_READY + page, 0 SIGKILL (fail-closed, kriteria 1).
async function testT9() {
  const d = tmpdir();
  const fake = S.fakeUnconfirmableKiller();
  // (a) JSON terpotong.
  const p1 = path.join(d, 'corrupt.pid.json');
  fs.writeFileSync(p1, '{"parentPid": 11111, "workerPid":');
  const parentA = new S.ParentStartup({ attempts: 3, exitWaitMs: 300, killer: fake });
  const resA = await parentA.runCleanup(p1);
  // (b) JSON valid tetapi field hilang.
  const p2 = path.join(d, 'partial.pid.json');
  fs.writeFileSync(p2, JSON.stringify({ parentPid: 11111, workerPid: 999999 }));
  const parentB = new S.ParentStartup({ attempts: 3, exitWaitMs: 300, killer: fake });
  const resB = await parentB.runCleanup(p2);
  // (c) File tidak ada -> READY (bukti tidak ada klaim worker).
  const p3 = path.join(d, 'missing.pid.json');
  const parentC = new S.ParentStartup({ attempts: 3, exitWaitMs: 300, killer: fake });
  const resC = await parentC.runCleanup(p3);
  check('SU-T9', parentA.state === 'NOT_READY' && resA.path === 'pidfile-corrupt'
    && parentB.state === 'NOT_READY' && resB.path === 'pidfile-corrupt'
    && parentC.state === 'READY' && resC.path === 'no-pidfile'
    && fake.kills.length === 0 && parentA.pageCount === 1 && parentB.pageCount === 1,
    `rusak: state=${parentA.state} path=${resA.path} | parsial: state=${parentB.state} path=${resB.path} | ` +
    `hilang: state=${parentC.state} path=${resC.path} | sigsSent=${fake.kills.length} page=${parentA.pageCount + parentB.pageCount}`);
}

(async () => {
  const run = process.argv[2] || '1';
  console.log(`=== SUITE v2.3.3-REGRESI (RUN=${run}) Node ${process.version} ===`);
  await testT1();
  await testT2();
  await testT3();
  await testT4();
  await testT5();
  await testT6();
  await testT7();
  await testT8();
  await testT9();
  const passed = results.filter((r) => r.pass).length;
  console.log(`=== HASIL RUN=${run}: ${passed}/${results.length} PASS ===`);
  if (passed !== results.length) process.exitCode = 1;
})();
