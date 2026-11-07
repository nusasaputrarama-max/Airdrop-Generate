// Racer startup lock (v2.3.2 SU-T5): satu proses mencoba acquire lock,
// lalu menahan fd selama 2 detik bila menang, dan mencetak hasil JSON.
'use strict';
const S = require('./startup.cjs');
const lockPath = process.argv[2];
const id = process.argv[3];
const stat = S.readProcStat(process.pid);
const r = S.acquireStartupLock(lockPath, { pid: process.pid, starttime: stat.starttime });
console.log(JSON.stringify({ id, acquired: r.acquired, reason: r.reason || null, reclaimed: !!r.reclaimed }));
if (r.acquired) {
  // Tahan lock selama 2 detik (fd terbuka = lock dipegang seumur proses).
  setTimeout(() => { try { require('fs').closeSync(r.fd); } catch {} process.exit(0); }, 2000);
} else {
  process.exit(0);
}
