// SPDX-License-Identifier: MIT (harness uji AG-001, bukan kode produksi)
// PIDFD-T8 — pidfd_open / pidfd_send_signal via bun:ffi (Bun 1.4.4).
// Membuktikan binding flock/sinyal tersedia dari runtime Bun, bukan
// hanya dari Python ctypes.
import { dlopen, FFIType, suffix } from "bun:ffi";

const lib = dlopen(`libc.so.6`, {
  pidfd_open: { args: [FFIType.i32, FFIType.u32], returns: FFIType.i32 },
  pidfd_send_signal: {
    args: [FFIType.i32, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
});

const out = (name, cond, detail) =>
  console.log(`${cond ? "PASS" : "FAIL"} ${name} :: ${detail}`);

function spawnSleep(secs) {
  const p = Bun.spawn(["sleep", String(secs)], { stdout: "ignore", stderr: "ignore" });
  return p;
}

// T8a: pidfd_open pada child yang hidup, lalu pidfd_send_signal(SIGKILL).
{
  const child = spawnSleep(60);
  const pid = child.pid;
  const pfd = lib.symbols.pidfd_open(pid, 0);
  const okOpen = pfd >= 0;
  let sigRes = null;
  if (okOpen) sigRes = lib.symbols.pidfd_send_signal(pfd, 9, null, null);
  await new Promise((r) => setTimeout(r, 300));
  const exited = child.exited !== null;
  out(
    "PIDFD-T8a",
    okOpen && sigRes === 0 && exited,
    `bun pidfd_open(child ${pid}) -> ${pfd}; pidfd_send_signal(SIGKILL) -> ${sigRes}; child.exited=${exited}`,
  );
  try { child.kill(9); } catch {}
}

// T8b: pidfd_send_signal(0) pada proses hidup (PID 1) + ESRCH setelah mati.
{
  const pfd1 = lib.symbols.pidfd_open(1, 0);
  const probe = pfd1 >= 0 ? lib.symbols.pidfd_send_signal(pfd1, 0, null, null) : -99;
  const child = spawnSleep(60);
  const pid = child.pid;
  const pfd = lib.symbols.pidfd_open(pid, 0);
  lib.symbols.pidfd_send_signal(pfd, 9, null, null);
  await new Promise((r) => setTimeout(r, 300));
  const after = lib.symbols.pidfd_send_signal(pfd, 0, null, null);
  // errno dibaca lewat FFI? bun:ffi tidak mengekspos errno per panggilan
  // secara langsung di sini; yang diuji adalah nilai kembali (-1 = gagal).
  out(
    "PIDFD-T8b",
    pfd1 >= 0 && probe === 0 && after === -1,
    `pidfd_open(1) -> ${pfd1}, probe sig 0 -> ${probe}; setelah SIGKILL via pidfd, probe sig 0 -> ${after} (ekspektasi -1/ESRCH)`,
  );
  try { child.kill(9); } catch {}
}

console.log("=== PIDFD BUN FFI SELESAI ===");
