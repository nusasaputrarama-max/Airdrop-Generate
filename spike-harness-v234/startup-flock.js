// REFERENCE IMPLEMENTATION (test-only) — fixed startup lock, v2.3.4.
// BUKAN kode produksi. Bun 1.4.4 (runtime artifact) + bun:ffi -> libc flock(2).
//
// PERUBAHAN INTI v2.3.4 (menjawab keberatan race ADV-T1 atas v2.3.3):
//   - Klaim kepemilikan BUKAN LAGI O_EXCL create + unlink reklamasi.
//     Primitif kepemilikan adalah flock(LOCK_EX|LOCK_NB) pada fd yang
//     dipertahankan terbuka selama masa hidup proses. Kernel yang
//     men-serialisasi akuisisi: tidak ada jendela "probe -> unlink ->
//     create" karena TIDAK ADA unlink dan TIDAK ADA probe dalam jalur ini.
//   - File lock TIDAK PERNAH di-unlink oleh siapa pun (aturan never-unlink).
//     File hanyalah rendezvous point; otoritas berasal dari flock kernel,
//     bukan dari isi file. Holder yang mati melepaskan flock OTOMATIS saat
//     proses berakhir (kernel menutup fd) — tidak ada lagi "lock basi" yang
//     harus direklamasi.
//   - Setelah flock berhasil, identitas ditulis via fd YANG SAMA (tidak
//     pernah open ulang — lihat FLK-T4: open kedua + close tidak melepas
//     flock, tetapi kami tidak mengandalkannya; satu fd, satu pemilik).
//   - Verifikasi ulang kepemilikan memakai DUA pemeriksaan: (dev, ino)
//     fstat(fd) vs stat(path) DAN record dibaca via PATH (open segar
//     O_RDONLY) yang harus berisi pid + starttime + token acak
//     per-akuisisi. Pemeriksaan inode saja TIDAK CUKUP: tmpfs mendaur
//     ulang nomor inode yang baru dibebaskan, sehingga file pengganti
//     dapat memperoleh nomor inode YANG SAMA (terbukti ADV-T6 —
//     verifikasi inode-only lolos palsu sebelum perbaikan ini). Baca-via-fd
//     juga tidak cukup: fd dapat menunjuk ke inode yang sudah di-unlink
//     tetapi isinya masih record kita. Token acak (128 bit, digenerate
//     saat acquire) adalah pemeriksaan yang menahan beban.
//   - fd lock WAJIB close-on-exec (Node/Bun fs.openSync sudah O_CLOEXEC
//     secara default — lihat FLK-T8): bila worker (child process) mewarisi
//     fd lock, kematian parent TIDAK melepaskan flock selama worker hidup.
//   - Heartbeat tetap ditulis via fd yang dipegang, tetapi HANYA untuk
//     observabilitas — tidak pernah dipakai dalam keputusan akuisisi.
//   - Yang kalah (EWOULDBLOCK) keluar segera (exit 78) tanpa cleanup.
import { dlopen, FFIType, toArrayBuffer } from "bun:ffi";
import fs from "node:fs";
import { randomBytes } from "node:crypto";

const LOCK_EX = 2;
const LOCK_NB = 4;
const LOCK_UN = 8;
const EWOULDBLOCK = 11;

const libc = dlopen("libc.so.6", {
  flock: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
  __errno_location: { args: [], returns: FFIType.ptr },
});
function errnoNow() {
  const p = libc.symbols.__errno_location();
  return new Int32Array(toArrayBuffer(p, 0, 4))[0];
}
function flockFd(fd, op) {
  const r = libc.symbols.flock(fd, op);
  return r === 0 ? { ok: true } : { ok: false, errno: errnoNow() };
}

function readProcStat(pid) {
  try {
    const raw = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const closeParen = raw.lastIndexOf(")");
    const rest = raw.slice(closeParen + 2).split(" ");
    return { starttime: rest[19], state: rest[0] };
  } catch { return null; }
}

// Verifikasi ulang kepemilikan SETELAH acquire (dan sebelum cleanup apa pun).
// DUA pemeriksaan, keduanya wajib lolos:
// (1) (dev, ino) fstat(fd) vs stat(path) sama — menangkap unlink + recreate
//     bila nomor inode BERBEDA. INI SAJA TIDAK CUKUP: tmpfs mendaur ulang
//     nomor inode yang baru dibebaskan, sehingga file pengganti dapat
//     memperoleh nomor inode YANG SAMA (terbukti ADV-T6: verifikasi lolos
//     palsu sebelum perbaikan ini).
// (2) record dibaca via PATH (open segar O_RDONLY — BUKAN via fd yang
//     dipegang: fd dapat menunjuk ke inode yang sudah di-unlink tetapi
//     isinya masih record kita, sehingga baca-via-fd selalu "lolos") dan
//     HARUS berisi pid + starttime + token acak per-akuisisi kita.
//     Token acak (128 bit, digenerate saat acquire) adalah pemeriksaan yang
//     menahan beban: pihak ketiga yang mengganti file tidak dapat
//     menghasilkan token kita (di luar model ancaman proses lokal yang
//     sengaja memalsukan — proses seperti itu dapat melakukan apa saja,
//     termasuk membunuh parent; model ancaman di sini adalah proses
//     versi lama / operator yang ceroboh, bukan penyerang lokal).
//     Bila record tidak terbaca / tidak ter-parse -> TIDAK terverifikasi
//     (fail-closed). Buka-tutup fd O_RDONLY kedua ini TIDAK melepas flock
//     (deskripsi open terpisah — dibuktikan FLK-T4).
function verifyFlockOwnership(lockPath, fd, record) {
  try {
    const fst = fs.fstatSync(fd);
    const pst = fs.statSync(lockPath);
    if (fst.ino !== pst.ino || fst.dev !== pst.dev) return false;
    const rfd = fs.openSync(lockPath, fs.constants.O_RDONLY);
    try {
      const buf = Buffer.alloc(4096);
      const n = fs.readSync(rfd, buf, 0, 4096, 0);
      if (n <= 0) return false;
      const rec = JSON.parse(buf.subarray(0, n).toString("utf8"));
      return rec && rec.pid === record.pid
        && String(rec.starttime) === String(record.starttime)
        && typeof rec.token === "string" && rec.token === record.token;
    } finally { fs.closeSync(rfd); }
  } catch { return false; }
}

function releaseLock(fd) {
  try { libc.symbols.flock(fd, LOCK_UN); } catch {}
  try { fs.closeSync(fd); } catch {}
}

// acquireStartupLockFlock(lockPath, identity, opts)
// opts.hooks (TEST-ONLY, v2.3.4 ADV): afterOpen, beforeFlock, afterFlock,
//   afterWrite, beforeVerify — synchronous, never mutate decisions.
function acquireStartupLockFlock(lockPath, identity, opts = {}) {
  const hooks = opts.hooks ?? {};
  const callHook = (name, ctx) => { if (typeof hooks[name] === "function") hooks[name](ctx); };
  let fd;
  try {
    // O_RDWR|O_CREAT, TANPA O_EXCL dan TANPA truncate: file hanya
    // rendezvous point. Dua proses yang bersamaan membuka file yang sama
    // (inode yang sama) — flock yang memutuskan siapa pemiliknya.
    fd = fs.openSync(lockPath, fs.constants.O_RDWR | fs.constants.O_CREAT, 0o644);
  } catch (e) {
    return { acquired: false, reason: `lock-open-failed:${e.code || "unknown"}`, page: true };
  }
  callHook("afterOpen", { fd });
  callHook("beforeFlock", { fd });
  const fl = flockFd(fd, LOCK_EX | LOCK_NB);
  callHook("afterFlock", { fd, flockOk: fl.ok, errno: fl.errno ?? 0 });
  if (!fl.ok) {
    try { fs.closeSync(fd); } catch {}
    if (fl.errno === EWOULDBLOCK) {
      return { acquired: false, reason: "held-by-live-holder" };
    }
    return { acquired: false, reason: `flock-error:${fl.errno}`, page: true };
  }
  // Kita memegang flock. Tulis identitas via fd YANG SAMA.
  // Token acak per-akuisisi (128 bit): pengikat verifikasi ulang — lihat
  // verifyFlockOwnership. Token digenerate di sini, dikembalikan ke
  // pemanggil dalam result.record, dan WAJIB dipakai saat verifikasi ulang.
  const token = randomBytes(16).toString("hex");
  const rec = { ...identity, token, heartbeatAt: Date.now(), version: 1 };
  try {
    fs.ftruncateSync(fd, 0);
    fs.writeSync(fd, JSON.stringify(rec), 0);
    fs.fsyncSync(fd);
  } catch (e) {
    releaseLock(fd);
    return { acquired: false, reason: `lock-write-failed:${e.code || "unknown"}`, page: true };
  }
  callHook("afterWrite", { fd });
  callHook("beforeVerify", { fd });
  if (!verifyFlockOwnership(lockPath, fd, rec)) {
    releaseLock(fd);
    return { acquired: false, reason: "ownership-revalidation-failed" };
  }
  return { acquired: true, fd, record: rec, reclaimed: false };
}

function heartbeatLockFlock(fd, lockPath, identity) {
  // Observabilitas saja — tidak pernah dipakai dalam keputusan akuisisi.
  return setInterval(() => {
    try {
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, JSON.stringify({ ...identity, heartbeatAt: Date.now(), version: 1 }), 0);
      fs.fsyncSync(fd);
    } catch { /* fd tertutup / proses sekarat: biarkan */ }
  }, 2000).unref();
}

export {
  acquireStartupLockFlock, verifyFlockOwnership, releaseLock,
  heartbeatLockFlock, readProcStat, flockFd, LOCK_EX, LOCK_NB, LOCK_UN,
};
