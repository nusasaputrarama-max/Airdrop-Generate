// Racer v2.3.3 (STARTUP-10) — satu proses yang mencoba acquire startup
// lock dengan acquireStartupLock yang diperkeras, lalu memvalidasi ulang
// kepemilikan lock. TIDAK PERNAH melakukan cleanup apa pun: tugasnya hanya
// acquire + verifikasi. Output JSON satu baris ke stdout.
// Pemakaian: node lock-racer-v233.cjs <lockPath> <id> [maxReclaim]
'use strict';
const fs = require('fs');
const S = require('./startup.cjs');

const lockPath = process.argv[2];
const id = process.argv[3] || '0';
const maxReclaim = Number(process.argv[4] || '10');

const identity = { pid: process.pid, starttime: S.readProcStat(process.pid).starttime };
const res = S.acquireStartupLock(lockPath, identity, { maxReclaim });
let ownershipVerified = false;
if (res.acquired) {
  ownershipVerified = S.verifyLockOwnership(lockPath, identity);
  // Pertahankan fd terbuka sebentar agar pemegang lain melihat holder hidup.
  setTimeout(() => { try { fs.closeSync(res.fd); } catch {} process.exit(0); }, 300);
  // Jangan exit sebelum timeout: biarkan proses lain membaca holder hidup.
} else {
  process.stdout.write(JSON.stringify({
    id, pid: process.pid, acquired: false, reason: res.reason,
    detail: res.detail || null, reclaimed: false,
    ownershipVerified: false, cleanupCalls: 0,
  }) + '\n');
  process.exit(0);
}
process.stdout.write(JSON.stringify({
  id, pid: process.pid, acquired: true, reason: null,
  detail: null, reclaimed: !!res.reclaimed,
  ownershipVerified, cleanupCalls: 0,
}) + '\n');
