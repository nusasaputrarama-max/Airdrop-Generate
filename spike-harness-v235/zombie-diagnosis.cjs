const { spawn } = require('child_process');
const fs = require('fs');
const H = '/home/hatch/workspace/airdrop-generate-foundation/spike-harness-v235';
const dir = '/tmp/zombiecheck2'; fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir + '/barrier', { recursive: true });
const lockPath = dir + '/startup.lock', pidfile = dir + '/parent.pid.json', barrier = dir + '/barrier';
function sleepSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function waitFile(f, ms = 15000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fs.existsSync(f)) return true; sleepSync(100); } return false; }
function statState(pid) {
  try {
    const s = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const close = s.lastIndexOf(')');
    const rest = s.slice(close + 2).split(' ');
    return { state: rest[0], starttime: rest[19] };
  } catch (e) { return { state: '(gone:' + e.code + ')', starttime: null }; }
}
function kill0(pid) { try { process.kill(pid, 0); return 'SUCCEEDS'; } catch (e) { return 'throws ' + e.code; } }
const p1 = spawn('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve-nocheck', 'v235-parent'], { cwd: H, stdio: ['ignore', 'pipe', 'pipe'] });
let p1out = ''; p1.stdout.on('data', (d) => { p1out += d; });
console.log('P1 pid:', p1.pid, 'ready:', waitFile(barrier + '/parent-ready'));
const pf1 = JSON.parse(fs.readFileSync(pidfile, 'utf8'));
const w1 = pf1.workerPid;
p1.kill('SIGKILL');
sleepSync(500); // event loop TERBLOKIR -> P1 tidak di-reap
console.log('P1 state (no reap):', JSON.stringify(statState(p1.pid)), '| kill(pid,0):', kill0(p1.pid), '| p1.exitCode:', p1.exitCode);
console.log('W1 alive:', kill0(w1) === 'SUCCEEDS');
for (const f of ['parent-ready', 'worker-ready', 'worker-check.json']) { try { fs.unlinkSync(barrier + '/' + f); } catch {} }
const p2 = spawn('bun', ['parent-stub.js', dir, 'full', lockPath, pidfile, barrier, '', 'serve', 'v235-parent'], { cwd: H, stdio: ['ignore', 'pipe', 'pipe'] });
let p2out = '', p2err = '';
p2.stdout.on('data', (d) => { p2out += d; });
p2.stderr.on('data', (d) => { p2err += d; });
// JANGAN yield: blokir event loop 8 detik agar P1 tetap zombie selama P2 classify.
sleepSync(8000);
console.log('P1 state during P2 run (still blocked):', JSON.stringify(statState(p1.pid)), '| p2.exitCode (before yield):', p2.exitCode);
// Sekarang yield agar driver menguras pipe stdout P2 dan me-reap P1.
setTimeout(async () => {
  await new Promise((r) => setTimeout(r, 300));
  console.log('P2 exit code:', p2.exitCode, '| P2 stdout:', JSON.stringify(p2out.trim()), '| P2 stderr:', JSON.stringify(p2err.trim()));
  console.log('P2 phase log (stderr):', JSON.stringify(p2err.trim()));
  console.log('pidfile after P2:', fs.readFileSync(pidfile, 'utf8'));
  console.log('parent-ready exists:', fs.existsSync(barrier + '/parent-ready'));
  console.log('W1 alive after:', kill0(w1) === 'SUCCEEDS');
  console.log('P1 state after yield+reap:', JSON.stringify(statState(p1.pid)), '| p1.exitCode:', p1.exitCode);
  try { process.kill(w1, 'SIGKILL'); } catch {}
  try { p2.kill('SIGKILL'); } catch {}
  process.exit(0);
}, 0);
