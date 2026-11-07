// ONE-OFF diagnostic (not part of the permanent suite): re-run ADV-T6 with
// the INODE-ONLY verify (pre-token version) against the FIXED harness, to
// decide whether the first T6 "A FAILED to detect" was caused by inode
// reuse or by the harness timing flaw (B stuck 15 s in the probe barrier).
// Usage: node run-t6-inodeonly.cjs <run>
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const RUN = process.argv[2] || '1';
const HARNESS = __dirname;
const BASE = `/tmp/ssrf-v234/t6ino-run${RUN}`;
fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });
const dir = path.join(BASE, 'ADV-T6');
fs.mkdirSync(dir, { recursive: true });
const lockPath = path.join(dir, 'startup.lock');
fs.writeFileSync(lockPath, JSON.stringify({ pid: 999999, starttime: '0', heartbeatAt: Date.now() - 60000, version: 1 }));
function runProc(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: HARNESS, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, 25000);
    p.on('exit', () => {
      clearTimeout(timer);
      let json = null;
      try { json = JSON.parse(out.trim().split('\n').filter(Boolean).pop()); } catch {}
      resolve({ json, out: out.trim() });
    });
  });
}
(async () => {
  const [a, b] = await Promise.all([
    runProc('bun', ['stepped-racer-inodeonly.js', lockPath, 'A', 'T6A', dir]),
    runProc('node', ['stepped-racer.cjs', lockPath, 'B', 'T6B', dir]),
  ]);
  const fin = (() => { try { const st = fs.statSync(lockPath); const rec = JSON.parse(fs.readFileSync(lockPath, 'utf8')); return { ino: st.ino, pid: rec.pid }; } catch (e) { return { error: String(e.code) }; } })();
  console.log(`T6-INODEONLY RUN=${RUN} :: bothAcquired=${!!(a.json && a.json.acquired && b.json && b.json.acquired)}`
    + ` | A(verifiedAfter=${a.json ? a.json.verifiedAfterInterference : '?'},myIno=${a.json ? a.json.myIno : '?'})`
    + ` B(acq=${b.json ? b.json.acquired : '?'},myIno=${b.json ? b.json.myIno : '?'})`
    + ` | finalIno=${fin.ino} inodeReused=${a.json && a.json.myIno === fin.ino}`
    + ` | conclusion=${a.json && a.json.verifiedAfterInterference === false ? 'inode-only DETECTED (timing flaw was the cause)' : 'inode-only FAILED to detect'}`);
})();
