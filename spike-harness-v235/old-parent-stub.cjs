// Old-version parent simulator — kode v2.3.3 PERSIS (O_EXCL create +
// probe ESRCH + unlink reklamasi), TIDAK PERNAH memanggil flock.
// Dipakai untuk AUTH-T5 (mixed-version) dan AUTH-T8b (record corrupt +
// holder lama hidup). Record yang ditulis TIDAK punya field `protocol`
// (format lama: {pid, starttime, heartbeatAt, version:1}).
//
// Usage: node old-parent-stub.cjs <lockPath> <barrierDir> [no-heartbeat] v235-parent
// Menulis old-parent.json ke barrierDir setelah acquire, lalu menahan
// lock + heartbeat (500 ms, skala tes) sampai dibunuh.
'use strict';
const fs = require('fs');
const S = require('./startup-v233.cjs');

const lockPath = process.argv[2];
const barrierDir = process.argv[3];
const noHeartbeat = process.argv[4] === 'no-heartbeat';

const identity = { pid: process.pid, starttime: S.readProcStat(process.pid).starttime };

const res = S.acquireStartupLock(lockPath, identity, { maxReclaim: 10 });
const out = {
  id: 'old-parent', pid: process.pid, acquired: !!res.acquired,
  reason: res.reason || null, reclaimed: !!res.reclaimed,
  myIno: null, cleanupCalls: 0,
};
if (res.acquired) {
  try { out.myIno = fs.fstatSync(res.fd).ino; } catch {}
  try { fs.writeFileSync(`${barrierDir}/old-parent.json`, JSON.stringify(out)); } catch {}
  if (!noHeartbeat) S.heartbeatLock(res.fd, lockPath, identity);
  // Tahan sampai dibunuh; tidak pernah keluar sendiri.
  setInterval(() => {}, 60000);
} else {
  try { fs.writeFileSync(`${barrierDir}/old-parent.json`, JSON.stringify(out)); } catch {}
  process.stdout.write(JSON.stringify(out) + '\n');
  process.exit(0);
}
