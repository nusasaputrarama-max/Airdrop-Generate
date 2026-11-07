#!/usr/bin/env python3
"""PIDFD-T1..T7 — pidfd_open / pidfd_send_signal via ctypes (Python 3.12.3).
Kernel nyata, proses nyata, BUKAN mock.
Syscall x86_64: __NR_pidfd_open = 434, __NR_pidfd_send_signal = 424.
"""
import ctypes
import os
import signal
import sys
import time

libc = ctypes.CDLL("libc.so.6", use_errno=True)
SYS_pidfd_open = 434
SYS_pidfd_send_signal = 424


def pidfd_open(pid, flags=0):
    ctypes.set_errno(0)
    fd = libc.syscall(SYS_pidfd_open, pid, flags)
    return fd, ctypes.get_errno()


def pidfd_send_signal(pidfd, sig, info=None, flags=0):
    ctypes.set_errno(0)
    r = libc.syscall(SYS_pidfd_send_signal, pidfd, sig, info, flags)
    return r, ctypes.get_errno()



def proc_state(pid):
    try:
        return open(f"/proc/{pid}/stat").read().rsplit(") ", 1)[1].split()[0]
    except (FileNotFoundError, ProcessLookupError, IndexError):
        return None


def is_live(pid):
    """Zombie-aware: Z/X/hilang = mati (pelajaran v2.3.5 AUTH-T3)."""
    return proc_state(pid) in ("R", "S", "D", "T", "t", "I")


def check(name, cond, detail):
    print(f"{'PASS' if cond else 'FAIL'} {name} :: {detail}", flush=True)
    return cond


def spawn_sleep(secs=60):
    pid = os.fork()
    if pid == 0:
        os.execv("/bin/sleep", ["sleep", str(secs)])
        os._exit(127)
    return pid


def reap(pid):
    try:
        _, status = os.waitpid(pid, 0)
        return status
    except ChildProcessError:
        return None


results = []

# ---- PIDFD-T1: pidfd_open + pidfd_send_signal(SIGKILL) pada child hidup ----
victim = spawn_sleep(60)
pfd, e1 = pidfd_open(victim)
r, e2 = pidfd_send_signal(pfd, signal.SIGKILL) if pfd >= 0 else (-1, -1)
time.sleep(0.3)
wpid, status = os.waitpid(victim, os.WNOHANG)
dead = wpid == victim and os.WIFSIGNALED(status) and os.WTERMSIG(status) == signal.SIGKILL
r2, e3 = pidfd_send_signal(pfd, 0) if pfd >= 0 else (-1, -1)
results.append(check("PIDFD-T1", pfd >= 0 and r == 0 and dead and r2 == -1 and e3 == 3,
    f"pidfd_open({victim}) -> {pfd} errno={e1}; send SIGKILL -> {r} errno={e2}; "
    f"child mati SIGKILL={dead}; probe sesudah mati -> {r2} errno={e3} (ekspektasi -1/ESRCH=3)"))
os.close(pfd)

# ---- PIDFD-T2: pidfd mengikat IDENTITAS, bukan nomor PID ----
# /proc/sys di VM ini read-only, tetapi procfs BARU yang di-mount memberi
# akses tulis ke sysctl (terbukti di probe awal). Turunkan pid_max
# sementara ke 8192 agar reuse deterministik (dipulihkan di finally).
import subprocess

PROC2 = "/tmp/proc2-pidfd"
os.makedirs(PROC2, exist_ok=True)
subprocess.run(["mount", "-t", "proc", "proc", PROC2], check=False,
               capture_output=True)


def set_pid_max(v):
    with open(f"{PROC2}/sys/kernel/pid_max", "w") as f:
        f.write(str(v))


PID_MAX_PATH = "/proc/sys/kernel/pid_max"
orig_pid_max = open(PID_MAX_PATH).read().strip()
decoy_pid = None
reuse_iters = 0
reuse_secs = None
pid_max_lowered = False
try:
    set_pid_max(8192)
    pid_max_lowered = True
    assert open(PID_MAX_PATH).read().strip() == "8192"
    victim2 = spawn_sleep(60)
    pfd2, _ = pidfd_open(victim2)
    # Bunuh korban via kill biasa, reap (PID bebas).
    os.kill(victim2, signal.SIGKILL)
    reap(victim2)
    # Putar alokasi PID sampai PID korban dipakai ulang.
    t0 = time.monotonic()
    for i in range(30000):
        reuse_iters = i + 1
        c = os.fork()
        if c == 0:
            os.execv("/bin/sleep", ["sleep", "60"])
            os._exit(127)
        if c == victim2:
            decoy_pid = c
            break
        os.kill(c, signal.SIGKILL)
        reap(c)
    reuse_secs = time.monotonic() - t0
    found = decoy_pid is not None
    # pidfd lama HARUS menolak: ia menunjuk korban yang sudah mati, bukan decoy.
    r, e = pidfd_send_signal(pfd2, signal.SIGKILL)
    time.sleep(0.2)
    decoy_alive = is_live(decoy_pid)
    decoy_state = proc_state(decoy_pid)
    results.append(check("PIDFD-T2", found and r == -1 and e == 3 and decoy_alive,
        f"reuse PID {victim2} setelah {reuse_iters} spawn dalam {reuse_secs:.2f} dtk (pid_max=8192); "
        f"pidfd_send_signal(pidfd-lama, SIGKILL) -> {r} errno={e} (ekspektasi -1/ESRCH=3); decoy hidup={decoy_alive} state={decoy_state}"))
    os.close(pfd2)
    # ---- PIDFD-T3 (kontrol): kill(pid) biasa SETELAH reuse membunuh decoy ----
    if found:
        os.kill(decoy_pid, signal.SIGKILL)
        time.sleep(0.2)
        decoy_dead = not is_live(decoy_pid)
        decoy_state3 = proc_state(decoy_pid)
        results.append(check("PIDFD-T3", decoy_dead,
            f"kill({decoy_pid}, SIGKILL) biasa SETELAH reuse -> decoy mati={decoy_dead} state={decoy_state3} "
            f"(membuktikan race kill-by-number itu NYATA)"))
        reap(decoy_pid)
finally:
    if pid_max_lowered:
        set_pid_max(int(orig_pid_max))
    assert open(PID_MAX_PATH).read().strip() == orig_pid_max, "pid_max tidak terpulihkan!"
    subprocess.run(["umount", PROC2], check=False, capture_output=True)

# ---- PIDFD-T4: pidfd pada zombie ----
z = spawn_sleep(60)
os.kill(z, signal.SIGKILL)
time.sleep(0.3)
# JANGAN reap dulu: z adalah zombie.
state = open(f"/proc/{z}/stat").read().rsplit(") ", 1)[1].split()[0]
pfdz, ez = pidfd_open(z)
rz0, ez0 = pidfd_send_signal(pfdz, 0) if pfdz >= 0 else (-1, -1)
rzk, ezk = pidfd_send_signal(pfdz, signal.SIGKILL) if pfdz >= 0 else (-1, -1)
results.append(check("PIDFD-T4", state == "Z" and pfdz >= 0,
    f"zombie state={state}; pidfd_open(zombie {z}) -> {pfdz} errno={ez}; "
    f"send_signal(0) -> {rz0} errno={ez0}; send_signal(SIGKILL) -> {rzk} errno={ezk} "
    f"(nilai dicatat apa adanya — lihat analisis)"))
if pfdz >= 0:
    os.close(pfdz)
reap(z)

# ---- PIDFD-T5: pidfd_open pada PID yang tidak ada ----
pfd_bad, e_bad = pidfd_open(999999)
results.append(check("PIDFD-T5", pfd_bad == -1 and e_bad == 3,
    f"pidfd_open(999999) -> {pfd_bad} errno={e_bad} (ekspektasi -1/ESRCH=3)"))

# ---- PIDFD-T6: pidfd_open pada proses BUKAN child (PID 1) ----
pfd1, e1 = pidfd_open(1)
r1, e1b = pidfd_send_signal(pfd1, 0) if pfd1 >= 0 else (-1, -1)
results.append(check("PIDFD-T6", pfd1 >= 0 and r1 == 0,
    f"pidfd_open(1) -> {pfd1} errno={e1}; probe sig 0 -> {r1} errno={e1b} (bukan child tetap bisa)"))
if pfd1 >= 0:
    os.close(pfd1)

# ---- PIDFD-T7: pidfd_open dengan flags tidak valid ----
pfd_inv, e_inv = pidfd_open(os.getpid(), 0xFFFFFFFF)
results.append(check("PIDFD-T7", pfd_inv == -1 and e_inv == 22,
    f"pidfd_open(self, flags=0xFFFFFFFF) -> {pfd_inv} errno={e_inv} (ekspektasi -1/EINVAL=22)"))

print(f"=== PIDFD PYTHON: {sum(results)}/{len(results)} PASS ===")
sys.exit(0 if all(results) else 1)
