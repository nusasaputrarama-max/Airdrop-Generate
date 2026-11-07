// Barrier helpers (v2.3.4 ADV tests) — synchronisation between two racer
// processes via files in a shared directory. All operations are synchronous
// so they can be called from inside synchronous hooks.
// A "signal" is an empty file <barrierDir>/<name>.
// waitFor() polls every 5 ms (Atomics.wait sync sleep) until all named
// signals exist or the timeout expires.
'use strict';
const fs = require('fs');
const path = require('path');

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* busy fallback */ }
  }
}
function sig(dir, name) {
  try { fs.writeFileSync(path.join(dir, name), String(process.pid)); } catch {}
}
function has(dir, name) {
  return fs.existsSync(path.join(dir, name));
}
function waitFor(dir, names, timeoutMs = 15000) {
  const start = Date.now();
  while (true) {
    if (names.every((n) => has(dir, n))) return true;
    if (Date.now() - start > timeoutMs) return false;
    sleepSync(5);
  }
}
module.exports = { sleepSync, sig, has, waitFor };
