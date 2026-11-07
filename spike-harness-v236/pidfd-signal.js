// SPDX-License-Identifier: MIT (implementasi REFERENSI AG-001 — bukan kode produksi)
// signalWorkerByPidfd — pensinyalan worker lama yang terikat identitas.
// Primitif: Linux pidfd_open(2) + pidfd_send_signal(2) via bun:ffi.
// Urutan yang mengikat (semua sinkron, tanpa await di antaranya):
//   1. Validasi identitas by-number: /proc/<pid>/stat (starttime) +
//      /proc/<pid>/cmdline (marker) + state zombie-aware.
//   2. pidfd_open(pid) — mengikat sinyal pada struct pid, BUKAN nomor.
//   3. Re-validasi starttime by-number SETELAH pidfd_open — bila PID
//      dipakai ulang di antara langkah 1 dan 2, starttime berubah
//      -> batal (fail-closed).
//   4. pidfd_send_signal(pidfd, SIGKILL) — sinyal tidak dapat mengenai
//      proses lain: bila target mati setelah langkah 3, hasilnya ESRCH.
//   5. Konfirmasi exit: pidfd probe -> ESRCH DAN /proc state Z/hilang
//      (zombie-aware — pidfd probe saja BUTA zombie, PIDFD-T4).
// Bila pidfd tidak tersedia -> kembalikan { ok:false, reason:"pidfd-unavailable" };
// pemanggil WAJIB memakai fallback starttime-re-read + kill(pid) yang
// residualnya terkuantifikasi (U-41), BUKAN diam-diam memakai kill(pid).
import { dlopen, FFIType, toArrayBuffer } from "bun:ffi";
import * as fs from "node:fs";

let _lib = null;
function libc() {
  if (_lib) return _lib;
  _lib = dlopen("libc.so.6", {
    pidfd_open: { args: [FFIType.i32, FFIType.u32], returns: FFIType.i32 },
    pidfd_send_signal: {
      args: [FFIType.i32, FFIType.i32, FFIType.ptr, FFIType.ptr],
      returns: FFIType.i32,
    },
    __errno_location: { args: [], returns: FFIType.ptr },
  });
  return _lib;
}
function errnoOf() {
  const p = libc().symbols.__errno_location();
  return new DataView(toArrayBuffer(p, 0, 4)).getInt32(0, true);
}

export function readProcStat(pid) {
  try {
    const raw = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const after = raw.slice(raw.lastIndexOf(") ") + 2).split(" ");
    return { state: after[0], starttime: after[19] };
  } catch {
    return null;
  }
}
export function readProcCmdline(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, "utf8");
  } catch {
    return null;
  }
}
export function pidAliveZombieAware(pid) {
  const st = readProcStat(pid);
  if (st) {
    if (st.state === "Z" || st.state === "X" || st.state === "x") return false;
    return true;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e && e.code !== "ESRCH" ? "uncertain" : false;
  }
}

/**
 * signalWorkerByPidfd({ pid, expectedStarttime, cmdlineMarker, signal=9 })
 * @returns { ok, reason, detail } — ok=true hanya bila sinyal TERKIRIM
 *   ke proses yang identitasnya cocok DAN exit terkonfirmasi.
 *   reason gagal: pid-not-alive | already-dead | identity-mismatch |
 *   identity-changed | pidfd-open-failed | pidfd-unavailable |
 *   signal-failed | exit-unconfirmed
 */
export function signalWorkerByPidfd({ pid, expectedStarttime, cmdlineMarker, signal = 9 }) {
  // Langkah 1 — validasi identitas by-number.
  const st1 = readProcStat(pid);
  if (!st1) return { ok: false, reason: "pid-not-alive" };
  if (st1.state === "Z" || st1.state === "X" || st1.state === "x")
    return { ok: false, reason: "already-dead", detail: `state=${st1.state}` };
  if (String(st1.starttime) !== String(expectedStarttime))
    return { ok: false, reason: "identity-mismatch", detail: "starttime" };
  if (cmdlineMarker) {
    const cmd = readProcCmdline(pid);
    if (cmd === null || !cmd.includes(cmdlineMarker))
      return { ok: false, reason: "identity-mismatch", detail: "cmdline" };
  }
  // Langkah 2 — pidfd_open (ikat identitas).
  let pfd;
  try {
    pfd = libc().symbols.pidfd_open(pid, 0);
  } catch (e) {
    return { ok: false, reason: "pidfd-unavailable", detail: String(e) };
  }
  if (pfd < 0) {
    const en = errnoOf();
    return { ok: false, reason: en === 3 ? "pid-not-alive" : "pidfd-open-failed", detail: `errno=${en}` };
  }
  try {
    // Langkah 3 — re-validasi starttime SETELAH pidfd_open.
    const st2 = readProcStat(pid);
    if (!st2) {
      // Target mati setelah pidfd_open -> pidfd menunjuk struct pid mati;
      // sinyal akan ESRCH. Tutup pidfd, laporkan already-dead.
      return { ok: false, reason: "already-dead", detail: "gone-after-pidfd-open" };
    }
    if (String(st2.starttime) !== String(expectedStarttime))
      return { ok: false, reason: "identity-changed", detail: "starttime-after-pidfd-open" };
    if (st2.state === "Z" || st2.state === "X" || st2.state === "x")
      return { ok: false, reason: "already-dead", detail: `state=${st2.state}` };
    // Langkah 4 — sinyal via pidfd (terikat struct pid).
    const r = libc().symbols.pidfd_send_signal(pfd, signal, null, null);
    if (r !== 0) {
      const en = errnoOf();
      return { ok: false, reason: en === 3 ? "already-dead" : "signal-failed", detail: `errno=${en}` };
    }
    // Langkah 5 — konfirmasi exit (poll singkat, zombie-aware).
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      if (pidAliveZombieAware(pid) === false) return { ok: true, reason: "signaled-and-confirmed" };
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
    return { ok: false, reason: "exit-unconfirmed" };
  } finally {
    try { fs.closeSync(pfd); } catch {}
  }
}
