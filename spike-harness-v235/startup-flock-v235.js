// REFERENCE IMPLEMENTATION (test-only) — flock ownership authority, v2.3.5.
// BUKAN kode produksi. Bun 1.4.4 + bun:ffi -> libc flock(2).
//
// PERUBAHAN INTI v2.3.5 (menjawab REQUEST V2.3.5 — menyelesaikan U-31 dan
// mixed-version safety):
//   1. OTORITAS = flock kernel pada fd yang dipegang, BUKAN pemeriksaan
//      (dev,ino)/token. Pemeriksaan (dev,ino)+token adalah DETEKTOR
//      penggantian path (fork otoritas), bukan pengganti eksklusivitas
//      kernel. Setiap tindakan sensitif (SIGKILL worker lama, tulis
//      pidfile, spawn worker, transisi READY) WAJIB didahului
//      assertOwnership() dalam tick sinkron yang sama, tanpa await di
//      antaranya (guardedAction). Jendela mikro tidak dapat dibuat nol
//      dengan syscall file biasa — tetapi KONSEKUENSI jendela dibuat
//      fail-closed: SIGKILL diikat identitas per-sinyal (§A.5.5.2),
//      pidfile membawa lockToken dan worker menolak melayani bila
//      token tidak cocok SEBELUM lookup pertama.
//   2. CLOEXEC DIVERIFIKASI, bukan diasumsikan: setelah open, flag
//      O_CLOEXEC diperiksa via /proc/self/fdinfo; bila tidak set,
//      startup GAGAL (fail-closed). fd lock tidak pernah diwariskan
//      ke child (tidak ada pass_fds atas fd lock; worker menerima
//      token lewat IPC/file, bukan fd).
//   3. MIXED-VERSION: record membawa `protocol: "flock-v2"`.
//      Setelah flock berhasil, record yang ada di path DIKLASIFIKASI
//      SEBELUM ditimpa: protokol lama + holder hidup -> lepas flock,
//      keluar `held-by-old-version`, tulis sentinel
//      `startup.lock.mixed`; record tidak terbaca -> lepas flock,
//      keluar `lock-record-unreadable` (MEMPERKETAT aturan v2.3.4
//      yang mengizinkan record tak terbaca sebagai observabilitas
//      saja — aturan itu mengasumsikan operasi satu versi, dan
//      tidak aman bila holder versi lama yang hidup dapat
//      bersembunyi di balik record rusak).
//   4. PRE-START GUARD: sebelum acquire, parent baru memindai /proc
//      untuk proses parent lain (marker cmdline); bila ada parent
//      lain yang hidup -> keluar `other-parent-alive` tanpa acquire.
//   5. PIDFILE FLOCK: parent memegang flock kedua pada pidfile
//      (domain flock terpisah). Worker, SEBELUM melayani lookup
//      pertama, mem-probe pidfile (LOCK_EX|LOCK_NB): bila probe
//      BERHASIL berarti tidak ada parent hidup yang memegangnya ->
//      worker MENOLAK melayani. Bila probe gagal EWOULDBLOCK DAN
//      pidfile.lockToken == lockRecord.token -> worker melayani.
//      Probe diulang saat IPC parent terputus dan berkala.
//   6. NEVER-UNLINK tetap mengikat: tidak ada unlink dalam jalur
//      lock; satu-satunya pengecualian adalah prosedur flag-day
//      dengan semua parent berhenti.
import { dlopen, FFIType, toArrayBuffer } from "bun:ffi";
import fs from "node:fs";
import { randomBytes } from "node:crypto";

const LOCK_EX = 2;
const LOCK_NB = 4;
const LOCK_UN = 8;
const EWOULDBLOCK = 11;
const O_CLOEXEC_OCTAL = 0o2000000;

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
function readProcCmdline(pid) {
  try { return fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " "); }
  catch { return null; }
}
// Liveness ZOMBIE-AWARE (perbaikan v2.3.5, temuan AUTH-T3):
// kill(pid,0) saja TIDAK cukup — proses zombie (state Z) masih ada di
// tabel proses sampai di-reap, sehingga kill(pid,0) SUCCEEDS padahal
// proses sudah mati. Bila supervisor/container tidak segera me-reap,
// holder zombie diklasifikasi "hidup" dan parent baru menolak start
// (lock-record-contradiction) — fail-closed tapi memblokir startup
// tanpa batas. Karena itu /proc/<pid>/stat dibaca dulu: state Z
// (zombie) atau X/x (dead) => TIDAK hidup. Hanya R/S/D/T yang
// dihitung hidup. Bila /proc tidak dapat dibaca, fallback ke
// kill(pid,0) dengan "uncertain" untuk error non-ESRCH.
function pidAlive(pid) {
  const st = readProcStat(pid);
  if (st) {
    if (st.state === "Z" || st.state === "X" || st.state === "x") return false;
    return true;
  }
  try { process.kill(pid, 0); return true; } catch (e) { return e && e.code !== "ESRCH" ? "uncertain" : false; }
}

// Verifikasi eksplisit: fd lock WAJIB O_CLOEXEC (dibaca dari
// /proc/self/fdinfo, bukan diasumsikan dari default runtime).
function fdIsCloexec(fd) {
  try {
    const info = fs.readFileSync(`/proc/self/fdinfo/${fd}`, "utf8");
    const m = info.match(/flags:\s*([0-7]+)/);
    if (!m) return false;
    return (parseInt(m[1], 8) & O_CLOEXEC_OCTAL) !== 0;
  } catch { return false; }
}

// Pindai /proc untuk proses parent lain (marker cmdline), kecuali diri.
// PENTING: marker harus cocok sebagai TOKEN argv yang persis (cmdline
// dipecah \0), BUKAN substring. Alasan: shell/supervisor yang
// menjalankan parent mengandung seluruh perintah di cmdline-nya —
// pencocokan substring akan menemukan shell itu sendiri sebagai
// "parent lain" (false positive yang TERTANGKAP saat pengujian
// AUTH-T3: shell bash -c mengandung 'v235-parent' di argv[2]-nya).
function scanOtherParents(marker) {
  const found = [];
  let entries;
  try { entries = fs.readdirSync("/proc"); } catch { return { error: "proc-unreadable", found }; }
  for (const e of entries) {
    if (!/^\d+$/.test(e)) continue;
    const pid = Number(e);
    if (pid === process.pid) continue;
    let raw;
    try { raw = fs.readFileSync(`/proc/${pid}/cmdline`); } catch { continue; }
    const tokens = raw.toString("utf8").split("\0").filter(Boolean);
    if (tokens.includes(marker)) found.push(pid);
  }
  return { error: null, found };
}

function readRecordViaPath(lockPath) {
  try {
    const rfd = fs.openSync(lockPath, fs.constants.O_RDONLY);
    try {
      const buf = Buffer.alloc(8192);
      const n = fs.readSync(rfd, buf, 0, 8192, 0);
      if (n <= 0) return { kind: "empty", record: null };
      return { kind: "parsed", record: JSON.parse(buf.subarray(0, n).toString("utf8")) };
    } finally { fs.closeSync(rfd); }
  } catch { return { kind: "unreadable", record: null }; }
}

// Klasifikasi record yang ada di path SEBELUM ditimpa (mixed-version).
//  - empty: file kosong/baru -> aman ditulis.
//  - flock-v2: protokol baru. Bila pid lain dan hidup -> kontradiksi
//    (kita memegang flock inode ini, jadi holder flock-v2 lain yang
//    hidup tidak mungkin ada) -> fail-closed.
//  - old: format lama (tanpa field protocol). Bila holder hidup ->
//    held-by-old-version. Bila holder mati -> aman ditimpa.
//  - unreadable: tidak dapat dibuktikan tidak ada holder lama yang
//    hidup -> fail-closed (MEMPERKETAT v2.3.4).
function classifyLockRecord(lockPath) {
  const r = readRecordViaPath(lockPath);
  if (r.kind === "empty") return { kind: "empty", record: null };
  if (r.kind === "unreadable") return { kind: "unreadable", record: null };
  const rec = r.record;
  if (!rec || typeof rec.pid !== "number") return { kind: "unreadable", record: null };
  if (rec.protocol === "flock-v2") {
    if (rec.pid === process.pid) return { kind: "flock-v2-self", record: rec };
    const alive = pidAlive(rec.pid);
    if (alive === true) {
      const st = readProcStat(rec.pid);
      if (st && String(st.starttime) === String(rec.starttime)) {
        return { kind: "flock-v2-contradiction", record: rec };
      }
    }
    if (alive === "uncertain") return { kind: "unreadable", record: rec };
    return { kind: "flock-v2-stale", record: rec };
  }
  // Format lama (v2.3.3 ke bawah): tanpa field protocol.
  const alive = pidAlive(rec.pid);
  if (alive === true) {
    const st = readProcStat(rec.pid);
    if (st && rec.starttime !== undefined && String(st.starttime) === String(rec.starttime)) {
      return { kind: "old-live", record: rec };
    }
    if (rec.starttime === undefined) return { kind: "old-live", record: rec };
  }
  if (alive === "uncertain") return { kind: "unreadable", record: rec };
  return { kind: "old-stale", record: rec };
}

function verifyFlockOwnership(lockPath, fd, record) {
  try {
    const fst = fs.fstatSync(fd);
    const pst = fs.statSync(lockPath);
    if (fst.ino !== pst.ino || fst.dev !== pst.dev) return false;
    const r = readRecordViaPath(lockPath);
    if (r.kind !== "parsed" || !r.record) return false;
    const rec = r.record;
    return rec && rec.pid === record.pid
      && String(rec.starttime) === String(record.starttime)
      && typeof rec.token === "string" && rec.token === record.token;
  } catch { return false; }
}

// assertOwnership: revalidasi sinkron, tanpa await di antaranya dan
// tindakan sesudahnya (lihat guardedAction). Mengembalikan boolean.
function assertOwnership(lockPath, fd, record) {
  return verifyFlockOwnership(lockPath, fd, record);
}

// guardedAction: revalidasi + tindakan dalam SATU tick sinkron.
// Bila revalidasi gagal, fn TIDAK PERNAH dijalankan.
function guardedAction(lockPath, fd, record, actionName, fn) {
  if (!assertOwnership(lockPath, fd, record)) {
    return { ok: false, reason: "ownership-lost", actionName };
  }
  return { ok: true, actionName, value: fn() };
}

function releaseLock(fd) {
  try { libc.symbols.flock(fd, LOCK_UN); } catch {}
  try { fs.closeSync(fd); } catch {}
}

function writeSentinel(dir, details) {
  try {
    const p = `${dir}/startup.lock.mixed`;
    fs.writeFileSync(p, JSON.stringify({ ...details, writtenAt: Date.now() }));
    const fd = fs.openSync(p, "r");
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return true;
  } catch { return false; }
}

// acquireStartupLockFlockV2(lockPath, identity, opts)
// opts: { parentMarker, scanParents=true, sentinelDir, hooks }
function acquireStartupLockFlockV2(lockPath, identity, opts = {}) {
  const hooks = opts.hooks ?? {};
  const callHook = (name, ctx) => { if (typeof hooks[name] === "function") hooks[name](ctx); };

  // Langkah 0 — pre-start guard: tolak bila parent lain masih hidup.
  if (opts.scanParents !== false && opts.parentMarker) {
    const scan = scanOtherParents(opts.parentMarker);
    if (scan.error) {
      return { acquired: false, reason: "parent-scan-failed", page: true };
    }
    if (scan.found.length > 0) {
      return { acquired: false, reason: "other-parent-alive", others: scan.found };
    }
  }

  let fd;
  try {
    fd = fs.openSync(lockPath, fs.constants.O_RDWR | fs.constants.O_CREAT, 0o644);
  } catch (e) {
    return { acquired: false, reason: `lock-open-failed:${e.code || "unknown"}`, page: true };
  }
  // CLOEXEC DIVERIFIKASI (bukan diasumsikan): bila tidak set, gagal.
  if (!fdIsCloexec(fd)) {
    try { fs.closeSync(fd); } catch {}
    return { acquired: false, reason: "lock-fd-not-cloexec", page: true };
  }
  callHook("afterOpen", { fd });
  const fl = flockFd(fd, LOCK_EX | LOCK_NB);
  callHook("afterFlock", { fd, flockOk: fl.ok, errno: fl.errno ?? 0 });
  if (!fl.ok) {
    try { fs.closeSync(fd); } catch {}
    if (fl.errno === EWOULDBLOCK) return { acquired: false, reason: "held-by-live-holder" };
    return { acquired: false, reason: `flock-error:${fl.errno}`, page: true };
  }

  // Langkah 2 — klasifikasi record SEBELUM menimpa (mixed-version).
  callHook("beforeClassify", { fd });
  const cls = classifyLockRecord(lockPath);
  callHook("afterClassify", { fd, clsKind: cls.kind });
  if (cls.kind === "unreadable") {
    releaseLock(fd);
    return { acquired: false, reason: "lock-record-unreadable", page: true };
  }
  if (cls.kind === "old-live") {
    releaseLock(fd);
    if (opts.sentinelDir) {
      writeSentinel(opts.sentinelDir, {
        reason: "held-by-old-version", holderPid: cls.record.pid, byPid: process.pid,
      });
    }
    return { acquired: false, reason: "held-by-old-version", holderPid: cls.record.pid, page: true };
  }
  if (cls.kind === "flock-v2-contradiction") {
    releaseLock(fd);
    return { acquired: false, reason: "lock-record-contradiction", page: true };
  }
  // empty / old-stale / flock-v2-stale / flock-v2-self: aman ditimpa.

  const token = randomBytes(16).toString("hex");
  const rec = { ...identity, token, heartbeatAt: Date.now(), version: 2, protocol: "flock-v2" };
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

// --- Pidfile: tulis atomik + flock kedua (domain terpisah) ---
function atomicWritePidfile(pidfilePath, record) {
  const tmp = `${pidfilePath}.tmp.${process.pid}.${Date.now()}`;
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeSync(fd, JSON.stringify(record), 0);
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, pidfilePath);
  const dfd = fs.openSync(pidfilePath.split("/").slice(0, -1).join("/") || ".", "r");
  try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
}

// Buka pidfile (setelah rename) dan pegang flock EX|NB atasnya.
// Mengembalikan {fd} atau {error}.
function acquirePidfileLock(pidfilePath) {
  let fd;
  try {
    fd = fs.openSync(pidfilePath, fs.constants.O_RDWR | fs.constants.O_CREAT, 0o644);
  } catch (e) {
    return { error: `pidfile-open-failed:${e.code || "unknown"}` };
  }
  if (!fdIsCloexec(fd)) {
    try { fs.closeSync(fd); } catch {}
    return { error: "pidfile-fd-not-cloexec" };
  }
  const fl = flockFd(fd, LOCK_EX | LOCK_NB);
  if (!fl.ok) {
    try { fs.closeSync(fd); } catch {}
    return { error: fl.errno === EWOULDBLOCK ? "pidfile-held-by-live-parent" : `pidfile-flock-error:${fl.errno}` };
  }
  return { fd };
}

// Probe worker: coba flock EX|NB pada pidfile.
//  - ok=true  -> TIDAK ADA parent hidup yang memegang pidfile flock
//                (worker WAJIB menolak melayani).
//  - ok=false + EWOULDBLOCK -> parent hidup memegangnya.
function probePidfileLock(pidfilePath) {
  let fd;
  try {
    fd = fs.openSync(pidfilePath, fs.constants.O_RDONLY);
  } catch (e) {
    return { error: `pidfile-probe-open-failed:${e.code || "unknown"}` };
  }
  const fl = flockFd(fd, LOCK_EX | LOCK_NB);
  try { libc.symbols.flock(fd, LOCK_UN); } catch {}
  try { fs.closeSync(fd); } catch {}
  if (fl.ok) return { held: false };
  if (fl.errno === EWOULDBLOCK) return { held: true };
  return { error: `pidfile-probe-flock-error:${fl.errno}` };
}

function readPidfile(pidfilePath) {
  try { return JSON.parse(fs.readFileSync(pidfilePath, "utf8")); }
  catch { return null; }
}

function heartbeatLockFlock(fd, lockPath, identity, record) {
  return setInterval(() => {
    try {
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, JSON.stringify({ ...record, heartbeatAt: Date.now() }), 0);
      fs.fsyncSync(fd);
    } catch { /* fd tertutup / proses sekarat: biarkan */ }
  }, 2000).unref();
}

export {
  acquireStartupLockFlockV2, verifyFlockOwnership, assertOwnership,
  guardedAction, releaseLock, heartbeatLockFlock, readProcStat,
  readProcCmdline, pidAlive, fdIsCloexec, scanOtherParents,
  classifyLockRecord, writeSentinel, atomicWritePidfile,
  acquirePidfileLock, probePidfileLock, readPidfile, readRecordViaPath, flockFd,
  LOCK_EX, LOCK_NB, LOCK_UN,
};
