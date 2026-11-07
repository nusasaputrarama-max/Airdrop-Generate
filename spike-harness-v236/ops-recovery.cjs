// SPDX-License-Identifier: MIT (harness uji AG-001, bukan kode produksi)
// OPS-T7 — pemulihan setelah file lock dihapus saat parent masih berjalan.
// Skenario: A memegang flock (inode lama) -> operator unlink + recreate
// -> B memperoleh flock (inode baru) -> DUA pemilik -> deteksi via
// /proc-scan (fd menunjuk path "(deleted)") + revalidasi A -> A mundur
// (0 cleanup) -> B satu-satunya pemilik.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-t7-'));
const LOCK = path.join(DIR, 'startup.lock');
fs.writeFileSync(LOCK, '{}\n');
const HOLDER = path.join(__dirname, 'holder-flock.js');

function waitFor(f, ms = 5000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const iv = setInterval(() => {
      if (fs.existsSync(f)) { clearInterval(iv); resolve(true); }
      else if (Date.now() - t0 > ms) { clearInterval(iv); reject(new Error('timeout ' + f)); }
    }, 20);
  });
}
function spawnHolder(id) {
  const c = spawn('bun', [HOLDER, LOCK, DIR, id], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  c.stdout.on('data', (d) => { out += d; });
  c.stderr.on('data', (d) => { out += '[stderr]' + d; });
  return { proc: c, out: () => out };
}
function scanDeletedLockHolders() {
  // Cari proses yang fd-nya menunjuk ke path lock dengan suffix "(deleted)".
  const found = [];
  for (const pid of fs.readdirSync('/proc').filter((x) => /^\d+$/.test(x))) {
    try {
      const fds = fs.readdirSync(`/proc/${pid}/fd`);
      for (const fd of fds) {
        try {
          const target = fs.readlinkSync(`/proc/${pid}/fd/${fd}`);
          if (target === LOCK + ' (deleted)') found.push({ pid: Number(pid), fd });
        } catch {}
      }
    } catch {}
  }
  return found;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const A = spawnHolder('A');
  await waitFor(path.join(DIR, 'ready.A'));
  const aReady = JSON.parse(fs.readFileSync(path.join(DIR, 'ready.A'), 'utf8'));
  // Operator: unlink + recreate.
  fs.unlinkSync(LOCK);
  fs.writeFileSync(LOCK, '{}\n');
  const B = spawnHolder('B');
  await waitFor(path.join(DIR, 'ready.B'));
  const bReady = JSON.parse(fs.readFileSync(path.join(DIR, 'ready.B'), 'utf8'));
  const twoOwners = aReady.ino !== bReady.ino;
  console.log(`OPS-T7a two-owners-reproduced=${twoOwners} A.ino=${aReady.ino} B.ino=${bReady.ino} A.pid=${aReady.pid} B.pid=${bReady.pid}`);
  // Deteksi via /proc-scan.
  const stale = scanDeletedLockHolders();
  const detected = stale.some((s) => s.pid === aReady.pid) && !stale.some((s) => s.pid === bReady.pid);
  console.log(`OPS-T7b proc-scan-detected-stale-holder=${detected} scan=${JSON.stringify(stale)}`);
  // Pemulihan: minta A revalidasi -> A harus mundur tanpa cleanup.
  fs.writeFileSync(path.join(DIR, 'cmd.verify.A'), '');
  await sleep(500);
  const aOut = A.out();
  const aStoodDown = aOut.includes('"stoodDown":true') && aOut.includes('"cleanupCalls":0');
  const aVerifiedFalse = aOut.includes('"verifiedAfterInterference":false');
  console.log(`OPS-T7c A-stood-down=${aStoodDown} verifiedFalse=${aVerifiedFalse}`);
  // B revalidasi -> harus tetap pemilik.
  fs.writeFileSync(path.join(DIR, 'cmd.verify.B'), '');
  await sleep(500);
  const bOut = B.out();
  const bStillOwner = bOut.includes('"verifiedAfterInterference":true');
  console.log(`OPS-T7d B-still-owner=${bStillOwner}`);
  // Bersihkan B.
  fs.writeFileSync(path.join(DIR, 'cmd.exit.B'), '');
  await sleep(300);
  try { B.proc.kill('SIGKILL'); } catch {}
  try { A.proc.kill('SIGKILL'); } catch {}
  const pass = twoOwners && detected && aStoodDown && aVerifiedFalse && bStillOwner;
  console.log(`${pass ? 'PASS' : 'FAIL'} OPS-T7 :: twoOwners=${twoOwners} detected=${detected} aStoodDown=${aStoodDown} bStillOwner=${bStillOwner}`);
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error('FAIL OPS-T7 ::', e.message); process.exit(1); });
