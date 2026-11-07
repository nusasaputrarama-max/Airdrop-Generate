#!/usr/bin/env python3
# SPDX-License-Identifier: MIT (harness uji AG-001, bukan kode produksi)
# PIDFD-T12 — ORACLE urutan lengkap signalWorkerByPidfd di bawah REUSE PAKSA.
# Mengulangi urutan yang sama seperti pidfd-signal.js (Bun) langkah demi
# langkah, tetapi dalam Python, agar kasus reuse dapat dipaksa dengan
# pid_max yang diturunkan.
#
# Mekanisme penurunan pid_max (sama seperti PIDFD-T2, terbukti bekerja):
# /proc/sys di VM ini di-mount read-only, TETAPI procfs BARU yang di-mount
# memberi akses tulis ke sysctl yang sama (sysctl bersifat global), jadi
# menulis pid_max=8192 lewat procfs baru mengubah nilai kernel global.
# Nilai dipulihkan ke semula di finally; procfs baru di-unmount.
# Di STAGING, pid_max HANYA dibaca, tidak diubah (STAGE-P08).
#
# T12a: urutan penuh pada worker hidup -> signaled + confirmed.
# T12b: urutan penuh, korban mati + PID dipakai ulang decoy SEBELUM langkah 1
#       -> ditolak identity-mismatch di langkah 1, decoy hidup.
# T12c: urutan penuh, korban mati + PID dipakai ulang decoy DI ANTARA
#       langkah 2 (pidfd_open) dan langkah 3 (re-validasi) -> ditolak
#       identity-changed, decoy hidup. (Jendela ini dipaksa dengan hook
#       yang membunuh korban + mengisi ulang PID di antaranya.)
# T12d: pidfd DIBUKA saat korban hidup, korban mati + PID dipakai ulang,
#       sinyal dikirim via pidfd LAMA -> ESRCH, decoy hidup.
#       (Membuktikan ikatan pidfd bekerja bahkan bila re-validasi
#       dilewati — pertahanan lapis terakhir.)
import ctypes, os, signal, subprocess, sys, time

LIBC = ctypes.CDLL("libc.so.6", use_errno=True)
SYS_pidfd_open = 434
SYS_pidfd_send_signal = 424
SIGKILL = 9
PROC2 = "/tmp/proc2-pidfd-t12"

def pidfd_open(pid, flags=0):
    return LIBC.syscall(SYS_pidfd_open, pid, flags)

def pidfd_send_signal(pfd, sig):
    return LIBC.syscall(SYS_pidfd_send_signal, pfd, sig, None, None)

def stat(pid):
    try:
        with open(f"/proc/{pid}/stat") as f:
            raw = f.read()
        after = raw[raw.rfind(") ") + 2:].split(" ")
        return {"state": after[0], "starttime": after[19]}
    except Exception:
        return None

def cmdline(pid):
    try:
        with open(f"/proc/{pid}/cmdline", "rb") as f:
            return f.read().decode(errors="replace")
    except Exception:
        return None

def is_live(pid):
    s = stat(pid)
    return s is not None and s["state"] in ("R", "S", "D", "T", "t", "I")

def signal_sequence(pid, expected_starttime, marker, reuse_hook=None):
    """Replikasi urutan pidfd-signal.js. reuse_hook dipanggil setelah
    pidfd_open, sebelum re-validasi (untuk memaksa reuse di jendela itu)."""
    st1 = stat(pid)
    if not st1:
        return {"ok": False, "reason": "pid-not-alive"}
    if st1["state"] in ("Z", "X", "x"):
        return {"ok": False, "reason": "already-dead", "detail": st1["state"]}
    if str(st1["starttime"]) != str(expected_starttime):
        return {"ok": False, "reason": "identity-mismatch", "detail": "starttime"}
    if marker and marker not in (cmdline(pid) or ""):
        return {"ok": False, "reason": "identity-mismatch", "detail": "cmdline"}
    pfd = pidfd_open(pid, 0)
    if pfd < 0:
        en = ctypes.get_errno()
        return {"ok": False, "reason": "pid-not-alive" if en == 3 else "pidfd-open-failed",
                "detail": f"errno={en}"}
    try:
        if reuse_hook:
            reuse_hook()
        st2 = stat(pid)
        if not st2:
            return {"ok": False, "reason": "already-dead", "detail": "gone-after-pidfd-open"}
        if str(st2["starttime"]) != str(expected_starttime):
            return {"ok": False, "reason": "identity-changed", "detail": "starttime-after-pidfd-open"}
        if st2["state"] in ("Z", "X", "x"):
            return {"ok": False, "reason": "already-dead", "detail": st2["state"]}
        r = pidfd_send_signal(pfd, SIGKILL)
        if r != 0:
            en = ctypes.get_errno()
            return {"ok": False, "reason": "already-dead" if en == 3 else "signal-failed",
                    "detail": f"errno={en}"}
        deadline = time.time() + 2.0
        while time.time() < deadline:
            s = stat(pid)
            if s is None or s["state"] in ("Z", "X", "x"):
                return {"ok": True, "reason": "signaled-and-confirmed"}
            time.sleep(0.02)
        return {"ok": False, "reason": "exit-unconfirmed"}
    finally:
        os.close(pfd)

def spawn_worker():
    p = subprocess.Popen(["sleep", "60"])
    time.sleep(0.05)
    return p

def force_reuse(target):
    """Fork anak sampai satu mendapat PID target; anak lain dibunuh+di-reap.
    Mengembalikan PID decoy (= target) atau None bila tidak tercapai."""
    for _ in range(30000):
        c = os.fork()
        if c == 0:
            os.execv("/bin/sleep", ["sleep", "60"])
            os._exit(127)
        if c == target:
            return c
        os.kill(c, SIGKILL)
        os.waitpid(c, 0)
    return None

def set_pid_max(v):
    with open(f"{PROC2}/sys/kernel/pid_max", "w") as f:
        f.write(str(v))

def out(name, cond, detail):
    print(f"{'PASS' if cond else 'FAIL'} {name} :: {detail}", flush=True)
    return bool(cond)

def main():
    results = []
    orig = open("/proc/sys/kernel/pid_max").read().strip()
    os.makedirs(PROC2, exist_ok=True)
    subprocess.run(["mount", "-t", "proc", "proc", PROC2], check=False,
                   capture_output=True)
    try:
        set_pid_max(8192)
        assert open("/proc/sys/kernel/pid_max").read().strip() == "8192"
        # T12a — urutan penuh, worker hidup.
        w = spawn_worker()
        st = stat(w.pid)
        r = signal_sequence(w.pid, st["starttime"], None)
        w.wait()
        results.append(out("PIDFD-T12a", r["ok"] and r["reason"] == "signaled-and-confirmed",
                           f"worker {w.pid} -> {r}"))
        # T12b — korban mati + reuse SEBELUM langkah 1.
        w = spawn_worker()
        pid, st = w.pid, stat(w.pid)["starttime"]
        w.kill(); w.wait()
        decoy = force_reuse(pid)
        r = signal_sequence(pid, st, None)
        alive = is_live(pid)
        results.append(out("PIDFD-T12b", decoy == pid and (not r["ok"])
                           and r["reason"] == "identity-mismatch" and alive,
                           f"reuse sebelum langkah 1: decoy={decoy} (target {pid}) -> {r}; decoy hidup={alive}"))
        if decoy:
            os.kill(decoy, SIGKILL); os.waitpid(decoy, 0)
        # T12c — reuse DI ANTARA pidfd_open dan re-validasi.
        w = spawn_worker()
        pid, st = w.pid, stat(w.pid)["starttime"]
        holder = {}
        def hook():
            w.kill(); w.wait()
            holder["decoy"] = force_reuse(pid)
        r = signal_sequence(pid, st, None, reuse_hook=hook)
        s = stat(pid)
        alive = is_live(pid)
        results.append(out("PIDFD-T12c", holder.get("decoy") == pid and (not r["ok"])
                           and r["reason"] == "identity-changed" and alive,
                           f"reuse di antara open & revalidasi: decoy={holder.get('decoy')} starttime baru={s['starttime'] if s else None} -> {r}; decoy hidup={alive}"))
        if holder.get("decoy"):
            os.kill(holder["decoy"], SIGKILL); os.waitpid(holder["decoy"], 0)
        # T12d — pidfd lama dipakai SETELAH reuse (re-validasi dilewati).
        w = spawn_worker()
        pid = w.pid
        pfd = pidfd_open(pid, 0)
        assert pfd >= 0
        w.kill(); w.wait()
        decoy = force_reuse(pid)
        r2 = pidfd_send_signal(pfd, SIGKILL)
        en = ctypes.get_errno()
        os.close(pfd)
        alive = is_live(pid)
        results.append(out("PIDFD-T12d", decoy == pid and r2 == -1 and en == 3 and alive,
                           f"pidfd lama setelah reuse (decoy={decoy}, target {pid}): send_signal -> {r2} errno={en} (ekspektasi -1/ESRCH=3); decoy hidup={alive}"))
        if decoy:
            os.kill(decoy, SIGKILL); os.waitpid(decoy, 0)
    finally:
        try:
            set_pid_max(orig)
        except Exception as e:
            print(f"PERINGATAN: gagal memulihkan pid_max: {e}", flush=True)
        subprocess.run(["umount", PROC2], check=False, capture_output=True)
    print(f"=== PIDFD-T12: {sum(results)}/{len(results)} PASS ===", flush=True)
    print(f"pid_max dipulihkan ke {open('/proc/sys/kernel/pid_max').read().strip()}", flush=True)
    return 0 if all(results) else 1

if __name__ == "__main__":
    sys.exit(main())
