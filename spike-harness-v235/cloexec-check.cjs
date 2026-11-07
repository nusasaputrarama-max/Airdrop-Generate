// AUTH-C1 (Node) — verifikasi O_CLOEXEC default.
'use strict';
const fs = require('fs');
const fd = fs.openSync('/tmp/cloexec-v235-probe-node.txt', 'w');
const info = fs.readFileSync(`/proc/self/fdinfo/${fd}`, 'utf8');
const m = info.match(/flags:\s*([0-7]+)/);
const flags = m ? parseInt(m[1], 8) : 0;
const cloexec = (flags & 0o2000000) !== 0;
console.log(JSON.stringify({ test: 'AUTH-C1', runtime: 'node', cloexecDefault: cloexec, flagsOctal: m ? m[1] : null }));
fs.closeSync(fd);
process.exit(cloexec ? 0 : 1);
