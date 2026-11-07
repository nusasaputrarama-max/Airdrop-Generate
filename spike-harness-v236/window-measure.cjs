// SPDX-License-Identifier: MIT (harness uji AG-001, bukan kode produksi)
// PIDFD-T9 — ukur jendela race validasi->kill dan laju alokasi PID.
// Tujuan: kuantifikasi JUJUR sisa risiko U-38 (bukan klaim "nol").
'use strict';
const fs = require('fs');
const { spawnSync } = require('child_process');

function bench(fn, n) {
  const t = [];
  for (let i = 0; i < n; i++) {
    const a = process.hrtime.bigint();
    fn();
    const b = process.hrtime.bigint();
    t.push(Number(b - a));
  }
  t.sort((x, y) => x - y);
  const med = t[Math.floor(n / 2)];
  const p99 = t[Math.floor(n * 0.99)];
  const avg = t.reduce((s, v) => s + v, 0) / n;
  return { avgNs: Math.round(avg), medNs: med, p99Ns: p99 };
}

const selfPid = process.pid;
// 1. Biaya baca /proc/<pid>/stat (open+read+close).
const rStat = bench(() => { fs.readFileSync(`/proc/${selfPid}/stat`, 'utf8'); }, 5000);
// 2. Biaya kill(pid, 0).
const rKill0 = bench(() => { process.kill(selfPid, 0); }, 5000);
// 3. Biaya kill(pid, SIGKILL) pada child yang sudah mati (ESRCH) — batas atas syscall kill.
const dead = spawnSync('true');
const rKillDead = bench(() => { try { process.kill(999999, 0); } catch {} }, 5000);

console.log(`STAT-READ avg=${rStat.avgNs}ns med=${rStat.medNs}ns p99=${rStat.p99Ns}ns`);
console.log(`KILL0 avg=${rKill0.avgNs}ns med=${rKill0.medNs}ns p99=${rKill0.p99Ns}ns`);
console.log(`KILL-ESRCH avg=${rKillDead.avgNs}ns med=${rKillDead.medNs}ns p99=${rKillDead.p99Ns}ns`);

// Jendela validasi->kill (perkiraan): baca stat + baca cmdline + kill.
// cmdline ≈ stat (satu read /proc lagi). Total ≈ 2×stat + 1×kill (p99).
const windowP99Ns = 2 * rStat.p99Ns + rKill0.p99Ns;
console.log(`WINDOW-P99-NS=${windowP99Ns} (~${(windowP99Ns / 1000).toFixed(1)} mikrodetik)`);

// 4. Laju alokasi PID: fork+exec /bin/true berurutan, ukur per detik.
// (Python mengukur 1106/s; C batch 7721/s — Node diukur di sini.)
const { spawn } = require('child_process');
async function spawnRate() {
  const N = 2000;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) {
    await new Promise((resolve) => {
      const c = spawn('/bin/true', [], { stdio: 'ignore' });
      c.on('exit', resolve);
    });
  }
  const dt = Number(process.hrtime.bigint() - t0) / 1e9;
  return N / dt;
}
spawnRate().then((rate) => {
  console.log(`SPAWN-RATE-NODE=${Math.round(rate)}/detik`);
  const pidMax = parseInt(fs.readFileSync('/proc/sys/kernel/pid_max', 'utf8').trim(), 10);
  const reuseInterval = pidMax / rate;
  console.log(`PID_MAX=${pidMax} REUSE-INTERVAL-S=${reuseInterval.toFixed(1)}`);
  const windowS = windowP99Ns / 1e9;
  console.log(`P-PER-CLEANUP-DEFAULT=${(windowS / reuseInterval).toExponential(2)} (jendela/reuse-interval, asumsi sebaran seragam)`);
  for (const pm of [32768, 4096, 1024]) {
    console.log(`P-PER-CLEANUP-PIDMAX-${pm}=${(windowS / (pm / rate)).toExponential(2)}`);
  }
  console.log('=== WINDOW-MEASURE SELESAI ===');
});
