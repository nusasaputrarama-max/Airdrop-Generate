// Sanity: can Bun 1.4.4 call libc flock() via bun:ffi, incl. errno?
import { dlopen, FFIType, toArrayBuffer } from "bun:ffi";
import fs from "node:fs";
const LOCK_EX = 2, LOCK_NB = 4, LOCK_UN = 8;
const libc = dlopen("libc.so.6", {
  flock: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
  __errno_location: { args: [], returns: FFIType.ptr },
});
function errnoNow() {
  const p = libc.symbols.__errno_location();
  return new Int32Array(toArrayBuffer(p, 0, 4))[0];
}
const path = "/tmp/bun-flock-sanity.lock";
const fd1 = fs.openSync(path, "w+");
let r = libc.symbols.flock(fd1, LOCK_EX | LOCK_NB);
console.log("flock fd1 EX|NB ->", r, "errno", r === -1 ? errnoNow() : 0);
const fd2 = fs.openSync(path, "w+");
r = libc.symbols.flock(fd2, LOCK_EX | LOCK_NB);
console.log("flock fd2 EX|NB ->", r, "errno", r === -1 ? errnoNow() : 0, "(11=EWOULDBLOCK expected)");
fs.closeSync(fd2);
fs.closeSync(fd1);
const fd3 = fs.openSync(path, "w+");
r = libc.symbols.flock(fd3, LOCK_EX | LOCK_NB);
console.log("flock fd3 EX|NB after close ->", r, "(0 expected: released on close)");
fs.closeSync(fd3);
console.log("BUN FFI FLOCK OK");
