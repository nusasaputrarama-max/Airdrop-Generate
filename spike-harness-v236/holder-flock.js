// SPDX-License-Identifier: MIT (harness uji AG-001, bukan kode produksi)
// Holder flock minimal untuk OPS-T7: acquire flock pada path lock,
// tulis record, lalu:
//  - tunggu file perintah `verify` -> jalankan verifyFlockOwnership
//    (fstat(fd) vs stat(path) + baca record via path), laporkan hasil,
//    bila gagal -> tutup fd + keluar TANPA cleanup (exit 0, cleanupCalls=0).
//  - tunggu file perintah `exit` -> keluar biasa.
import { dlopen, FFIType } from "bun:ffi";
import * as fs from "node:fs";

const lib = dlopen("libc.so.6", {
  flock: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
});
const LOCK_EX = 2, LOCK_NB = 4, LOCK_UN = 8;

const [lockPath, dir] = [process.argv[2], process.argv[3]];
const id = process.argv[4];
const token = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);

const fd = fs.openSync(lockPath, "r+");
if (lib.symbols.flock(fd, LOCK_EX | LOCK_NB) !== 0) {
  console.log(JSON.stringify({ id, acquired: false, reason: "held-by-live-holder" }));
  process.exit(78);
}
const ino = fs.fstatSync(fd).ino;
fs.writeFileSync(`${dir}/ready.${id}`, JSON.stringify({ pid: process.pid, ino, token }));
// Tulis record via fd yang sama.
fs.writeSync(fd, JSON.stringify({ pid: process.pid, token, ino }) + "\n", 0, "utf8");

let cleanupCalls = 0;
function verify() {
  const stFd = fs.fstatSync(fd);
  let stPath = null;
  try { stPath = fs.statSync(lockPath); } catch { stPath = null; }
  let rec = null;
  try { rec = JSON.parse(fs.readFileSync(lockPath, "utf8")); } catch { rec = null; }
  const ok = !!stPath && stFd.ino === stPath.ino && rec && rec.token === token && rec.pid === process.pid;
  return { ok, fdIno: stFd.ino, pathIno: stPath ? stPath.ino : null, recToken: rec ? rec.token : null };
}

const iv = setInterval(() => {
  const cmdVerify = `${dir}/cmd.verify.${id}`;
  const cmdExit = `${dir}/cmd.exit.${id}`;
  if (fs.existsSync(cmdVerify)) {
    fs.unlinkSync(cmdVerify);
    const v = verify();
    console.log(JSON.stringify({ id, verifiedAfterInterference: v.ok, cleanupCalls, ...v }));
    if (!v.ok) {
      fs.closeSync(fd); // lepas flock pada inode lama
      console.log(JSON.stringify({ id, stoodDown: true, cleanupCalls }));
      clearInterval(iv);
      process.exit(0);
    }
  }
  if (fs.existsSync(cmdExit)) {
    fs.unlinkSync(cmdExit);
    try { lib.symbols.flock(fd, LOCK_UN); } catch {}
    fs.closeSync(fd);
    clearInterval(iv);
    process.exit(0);
  }
}, 50);
