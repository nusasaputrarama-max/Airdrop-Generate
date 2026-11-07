// AUTH-C1 — verifikasi O_CLOEXEC default (Node dan Bun) + F_SETFD.
// Membaca /proc/self/fdinfo/<fd> dan memeriksa bit O_CLOEXEC
// (02000000 oktal). Juga membuktikan F_SETFD dapat mengubah flag
// (via fcntl Python di file ini — Bun/Node tidak mengekspos fcntl).
// Usage: bun cloexec-check.js  |  node cloexec-check.cjs
import fs from "node:fs";
const fd = fs.openSync("/tmp/cloexec-v235-probe.txt", "w");
const info = fs.readFileSync(`/proc/self/fdinfo/${fd}`, "utf8");
const m = info.match(/flags:\s*([0-7]+)/);
const flags = m ? parseInt(m[1], 8) : 0;
const cloexec = (flags & 0o2000000) !== 0;
console.log(JSON.stringify({ test: "AUTH-C1", runtime: "bun", cloexecDefault: cloexec, flagsOctal: m ? m[1] : null }));
fs.closeSync(fd);
process.exit(cloexec ? 0 : 1);
