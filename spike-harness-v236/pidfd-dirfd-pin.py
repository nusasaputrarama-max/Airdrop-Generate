#!/usr/bin/env python3
"""PIDFD-T10 — apakah open("/proc/<pid>", O_DIRECTORY) mem-pin task?
Uji: buka dirfd pada korban, bunuh + reap korban, pakai ulang PID-nya
oleh decoy, lalu baca stat VIA dirfd. Bila dirfd mem-pin task lama,
stat yang terbaca tetap milik korban (state Z / starttime lama),
bukan milik decoy. Ini menentukan apakah validasi identitas dapat
diikat pada dirfd yang di-pin, bukan pada nomor PID.
"""
import os
import signal
import subprocess
import sys
import time

PROC2 = "/tmp/proc2-pidfd10"
os.makedirs(PROC2, exist_ok=True)
subprocess.run(["mount", "-t", "proc", "proc", PROC2], check=False,
               capture_output=True)


def set_pid_max(v):
    with open(f"{PROC2}/sys/kernel/pid_max", "w") as f:
        f.write(str(v))


def read_stat_via_dirfd(dirfd):
    fd = os.open("stat", os.O_RDONLY, dir_fd=dirfd)
    try:
        data = os.read(fd, 4096).decode()
    finally:
        os.close(fd)
    # format: pid (comm) state ... field 22 = starttime (index 19 setelah ") ")
    after = data.rsplit(") ", 1)[1].split()
    return {"state": after[0], "starttime": after[19]}


def read_stat_by_number(pid):
    try:
        data = open(f"/proc/{pid}/stat").read()
    except FileNotFoundError:
        return None
    after = data.rsplit(") ", 1)[1].split()
    return {"state": after[0], "starttime": after[19]}


def check(name, cond, detail):
    print(f"{'PASS' if cond else 'FAIL'} {name} :: {detail}", flush=True)
    return cond


results = []
orig_pid_max = open("/proc/sys/kernel/pid_max").read().strip()
try:
    set_pid_max(8192)
    # Korban.
    v = os.fork()
    if v == 0:
        os.execv("/bin/sleep", ["sleep", "60"])
        os._exit(127)
    time.sleep(0.2)
    st_victim = read_stat_by_number(v)
    dirfd = os.open(f"/proc/{v}", os.O_DIRECTORY)
    st_via_dirfd_before = read_stat_via_dirfd(dirfd)
    results.append(check("PIDFD-T10a", st_via_dirfd_before == st_victim,
        f"stat via dirfd SEBELUM mati == stat by-number: {st_via_dirfd_before} vs {st_victim}"))
    # Bunuh + reap korban.
    os.kill(v, signal.SIGKILL)
    os.waitpid(v, 0)
    time.sleep(0.2)
    # Baca stat via dirfd SETELAH korban mati + di-reap.
    try:
        st_via_dirfd_dead = read_stat_via_dirfd(dirfd)
        dead_read = f"{st_via_dirfd_dead}"
    except OSError as e:
        st_via_dirfd_dead = None
        dead_read = f"OSError errno={e.errno} ({e.strerror})"
    # Pakai ulang PID korban oleh decoy.
    decoy = None
    for i in range(30000):
        c = os.fork()
        if c == 0:
            os.execv("/bin/sleep", ["sleep", "60"])
            os._exit(127)
        if c == v:
            decoy = c
            break
        os.kill(c, signal.SIGKILL)
        os.waitpid(c, 0)
    st_decoy = read_stat_by_number(decoy) if decoy else None
    try:
        st_via_dirfd_after_reuse = read_stat_via_dirfd(dirfd)
        reuse_read = f"{st_via_dirfd_after_reuse}"
    except OSError as e:
        st_via_dirfd_after_reuse = None
        reuse_read = f"OSError errno={e.errno} ({e.strerror})"
    pinned = (
        st_via_dirfd_after_reuse is not None
        and st_via_dirfd_after_reuse["starttime"] == st_victim["starttime"]
        and st_via_dirfd_after_reuse["starttime"] != (st_decoy or {}).get("starttime")
    )
    results.append(check("PIDFD-T10b", decoy is not None and pinned,
        f"PID {v} dipakai ulang decoy={decoy} (starttime decoy={st_decoy}); "
        f"stat via dirfd SETELAH mati+reap: {dead_read}; "
        f"stat via dirfd SETELAH reuse: {reuse_read}; "
        f"korban starttime={st_victim['starttime']} -> dirfd mem-pin task lama={pinned}"))
    if decoy:
        os.kill(decoy, signal.SIGKILL)
        os.waitpid(decoy, 0)
    os.close(dirfd)
finally:
    set_pid_max(int(orig_pid_max))
    assert open("/proc/sys/kernel/pid_max").read().strip() == orig_pid_max
    subprocess.run(["umount", PROC2], check=False, capture_output=True)

print(f"=== PIDFD-T10: {sum(results)}/{len(results)} PASS ===")
sys.exit(0 if all(results) else 1)
