# AUTH-T4 + AUTH-T9b — Python fcntl (kernel nyata, bukan mock).
#   AUTH-T4  — fd lock diwariskan ke child (non-CLOEXEC via F_SETFD):
#              parent mati, child hidup -> contender TERBLOKIR; child
#              mati -> contender memperoleh lock. Siklus penuh.
#   AUTH-T9b — POSIX lockf vs flock(2): closing ANY fd dalam proses
#              yang sama melepaskan SEMUA POSIX lock proses itu atas
#              file tersebut (gotcha klasik) — membuktikan mengapa
#              F_SETLK TIDAK BOLEH dipakai sebagai pengganti flock.
#              Kontras: menutup fd kedua TIDAK melepas flock (FLK-T4).
# Usage: python3 flock-compat.py <baseDir> <run>
import fcntl
import json
import os
import signal
import subprocess
import sys
import time

BASE = sys.argv[1]
RUN = sys.argv[2]

def flock_nb(fd):
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except BlockingIOError:
        return False
    except OSError:
        return False

def test_t4():
    d = os.path.join(BASE, "AUTH-T4")
    os.makedirs(d, exist_ok=True)
    lock_path = os.path.join(d, "startup.lock")
    child_code = (
        "import time, sys; "
        "fd = int(sys.argv[1]); "
        "time.sleep(30)"
    )
    # Parent: buka, flock, hapus CLOEXEC, spawn child mewarisi fd, lalu mati.
    parent_code = (
        "import fcntl, os, subprocess, sys, time; "
        "fd = os.open(sys.argv[1], os.O_RDWR | os.O_CREAT, 0o644); "
        "fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB); "
        "flags = fcntl.fcntl(fd, fcntl.F_GETFD); "
        "fcntl.fcntl(fd, fcntl.F_SETFD, flags & ~fcntl.FD_CLOEXEC); "
        "p = subprocess.Popen([sys.executable, '-c', sys.argv[2], str(fd)], pass_fds=[fd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL); "
        "open(sys.argv[3], 'w').write(str(p.pid)); "
        "os._exit(0)"
    )
    child_pid_file = os.path.join(d, "child.pid")
    r = subprocess.run([sys.executable, "-c", parent_code, lock_path, child_code, child_pid_file],
                       capture_output=True, text=True, timeout=20)
    if r.returncode != 0:
        return {"test": "AUTH-T4", "result": "ERROR", "detail": r.stderr[-300:]}
    with open(child_pid_file) as f:
        child_pid = int(f.read().strip())
    time.sleep(0.3)
    # Contender 1: child masih hidup (mewarisi fd) -> HARUS terblokir.
    fd1 = os.open(lock_path, os.O_RDWR)
    blocked_while_child_alive = not flock_nb(fd1)
    os.close(fd1)
    # Bunuh child -> flock harus lepas.
    try:
        os.kill(child_pid, signal.SIGKILL)
        os.waitpid(child_pid, 0)
    except Exception:
        pass
    time.sleep(0.3)
    fd2 = os.open(lock_path, os.O_RDWR)
    acquired_after_child_death = flock_nb(fd2)
    if acquired_after_child_death:
        fcntl.flock(fd2, fcntl.LOCK_UN)
    os.close(fd2)
    ok = blocked_while_child_alive and acquired_after_child_death
    return {"test": "AUTH-T4", "result": "PASS" if ok else "FAIL",
            "blockedWhileChildAlive": blocked_while_child_alive,
            "acquiredAfterChildDeath": acquired_after_child_death,
            "childPid": child_pid}

def test_t9b():
    d = os.path.join(BASE, "AUTH-T9b")
    os.makedirs(d, exist_ok=True)
    p_posix = os.path.join(d, "posix.lock")
    p_flock = os.path.join(d, "flock.lock")
    # POSIX lockf: kunci via fd1, tutup fd2 (deskripsi open lain, proses sama).
    fd1 = os.open(p_posix, os.O_RDWR | os.O_CREAT, 0o644)
    fcntl.lockf(fd1, fcntl.LOCK_EX | fcntl.LOCK_NB)
    fd2 = os.open(p_posix, os.O_RDWR)
    os.close(fd2)  # GOTCHA: menutup fd APAPUN melepaskan lock POSIX proses ini.
    # Contender (proses lain): coba lockf -> bila berhasil, lock sudah lepas.
    code = "\n".join([
        "import fcntl, os, sys",
        "fd = os.open(sys.argv[1], os.O_RDWR)",
        "try:",
        "    fcntl.lockf(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)",
        "    print('ACQUIRED')",
        "except BlockingIOError:",
        "    print('BLOCKED')",
    ])
    r = subprocess.run([sys.executable, "-c", code, p_posix], capture_output=True, text=True, timeout=20)
    posix_released_by_close = (r.stdout.strip() == "ACQUIRED")
    os.close(fd1)
    # Kontras flock(2): kunci via fd1, tutup fd2 -> contender HARUS terblokir.
    g1 = os.open(p_flock, os.O_RDWR | os.O_CREAT, 0o644)
    fcntl.flock(g1, fcntl.LOCK_EX | fcntl.LOCK_NB)
    g2 = os.open(p_flock, os.O_RDWR)
    os.close(g2)
    code2 = "\n".join([
        "import fcntl, os, sys",
        "fd = os.open(sys.argv[1], os.O_RDWR)",
        "try:",
        "    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)",
        "    print('ACQUIRED')",
        "except BlockingIOError:",
        "    print('BLOCKED')",
    ])
    r2 = subprocess.run([sys.executable, "-c", code2, p_flock], capture_output=True, text=True, timeout=20)
    flock_survives_close = (r2.stdout.strip() == "BLOCKED")
    fcntl.flock(g1, fcntl.LOCK_UN)
    os.close(g1)
    ok = posix_released_by_close and flock_survives_close
    return {"test": "AUTH-T9b", "result": "PASS" if ok else "FAIL",
            "posixReleasedByClosingOtherFd": posix_released_by_close,
            "flockSurvivesClosingOtherFd": flock_survives_close}

if __name__ == "__main__":
    print(json.dumps(test_t4()))
    print(json.dumps(test_t9b()))
