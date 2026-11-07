#!/usr/bin/env python3
# flock-semantics.py — kernel flock(2) behaviour via Python fcntl (stdlib).
# Proves the LANGUAGE-INDEPENDENT kernel semantics the v2.3.4 design relies
# on. The production binding is Bun FFI (startup-flock.js, proven separately
# in bun-flock-sanity: acquire / EWOULDBLOCK errno 11 / release on close).
# Usage: python3 flock-semantics.py <dir> <run>
#   <dir> = directory holding the test lock files. Run the suite once on
#           tmpfs (/tmp) and once on overlay (/home) and compare (FLK-T6).
import os
import sys
import time
import fcntl
import signal
import subprocess

RUN = sys.argv[2] if len(sys.argv) > 2 else "1"
BASE = sys.argv[1]
# Fresh directory per run: a stale lock file from a previous run can still
# be flock-held by that run's orphaned child (FLK-T8b leaves one alive for
# 30 s), which would make THIS run's holder block forever on a blocking
# flock() call. Wipe first (same lesson as the ADV orchestrators).
import shutil
if os.path.exists(BASE):
    shutil.rmtree(BASE)
os.makedirs(BASE, exist_ok=True)

RESULTS = []
def report(name, ok, detail):
    RESULTS.append(ok)
    print(f"{'PASS' if ok else 'FAIL'} {name} :: {detail}")

def mount_type(path):
    best, best_len = ("?", 0)
    with open("/proc/mounts") as f:
        for line in f:
            parts = line.split()
            if len(parts) < 3:
                continue
            mp, fstype = parts[1], parts[2]
            if path.startswith(mp) and len(mp) > best_len:
                best, best_len = fstype, len(mp)
    return best

HOLDER_CODE = (
    "import fcntl, os, sys, time\n"
    "fd = os.open(sys.argv[1], os.O_RDWR | os.O_CREAT, 0o644)\n"
    "fcntl.flock(fd, fcntl.LOCK_EX)\n"
    "open(sys.argv[2], 'w').write('locked')\n"
    "time.sleep(30)\n"
)

def spawn_holder(lock_path):
    ready = lock_path + ".ready"
    if os.path.exists(ready):
        os.unlink(ready)
    p = subprocess.Popen(
        [sys.executable, "-c", HOLDER_CODE, lock_path, ready],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(100):
        if os.path.exists(ready):
            return p
        time.sleep(0.05)
    raise RuntimeError("holder did not signal ready")

def try_flock_nb(path):
    fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return fd, True, None
    except BlockingIOError as e:
        os.close(fd)
        return None, False, e.errno
    except OSError as e:
        os.close(fd)
        return None, False, e.errno

def kill_quiet(p):
    try:
        p.kill()
    except Exception:
        pass
    try:
        p.wait(timeout=5)
    except Exception:
        pass

# ---- FLK-T1: contention -> EWOULDBLOCK ----
p1 = os.path.join(BASE, "t1.lock")
holder = spawn_holder(p1)
try:
    _, ok, err = try_flock_nb(p1)
    report("FLK-T1", (not ok and err == 11),
           f"contender flock NB while held -> acquired={ok} errno={err} (11=EWOULDBLOCK expected)")
finally:
    kill_quiet(holder)

# ---- FLK-T2: SIGKILL releases the lock (kernel closes fd on death) ----
p2 = os.path.join(BASE, "t2.lock")
holder = spawn_holder(p2)
holder.send_signal(signal.SIGKILL)
holder.wait(timeout=5)
time.sleep(0.2)
fd2, ok, err = try_flock_nb(p2)
report("FLK-T2", ok, f"contender flock NB after holder SIGKILL -> acquired={ok} errno={err}")
if fd2 is not None:
    os.close(fd2)

# ---- FLK-T3: close releases the lock ----
p3 = os.path.join(BASE, "t3.lock")
fd3 = os.open(p3, os.O_RDWR | os.O_CREAT, 0o644)
fcntl.flock(fd3, fcntl.LOCK_EX)
os.close(fd3)
fd3b, ok, err = try_flock_nb(p3)
report("FLK-T3", ok, f"contender flock NB after holder close -> acquired={ok} errno={err}")
if fd3b is not None:
    os.close(fd3b)

# ---- FLK-T4: same-process second open + close does NOT release the lock ----
# The holder opens the file a SECOND time in the SAME process (independent
# open file description), reads, and closes it. The contender must still
# be blocked: closing the second description must not release the flock
# held via the first description.
p4b = os.path.join(BASE, "t4b.lock")
fd_a = os.open(p4b, os.O_RDWR | os.O_CREAT, 0o644)
fcntl.flock(fd_a, fcntl.LOCK_EX | fcntl.LOCK_NB)
fd_b = os.open(p4b, os.O_RDONLY)
os.read(fd_b, 4096)
os.close(fd_b)  # closing the SECOND description must not release fd_a's lock
child = subprocess.Popen(
    [sys.executable, "-c",
     "import fcntl, os, sys\n"
     "fd = os.open(sys.argv[1], os.O_RDWR)\n"
     "try:\n"
     "    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)\n"
     "    print('ACQUIRED')\n"
     "except BlockingIOError:\n"
     "    print('BLOCKED')\n",
     p4b], stdout=subprocess.PIPE, text=True)
out = child.communicate(timeout=10)[0].strip()
report("FLK-T4", out == "BLOCKED",
       f"second open+close in holder process, contender says {out} (BLOCKED expected)")
os.close(fd_a)

# ---- FLK-T5: unlinked-inode hazard (never-unlink rule is load-bearing) ----
p5 = os.path.join(BASE, "t5.lock")
holder = spawn_holder(p5)
try:
    os.unlink(p5)  # third party removes the path while holder holds flock
    fd5, ok, err = try_flock_nb(p5)  # new inode at the same path
    report("FLK-T5", ok,
           f"after unlink+recreate, new opener flock NB -> acquired={ok} (True proves TWO holders can coexist -> never-unlink is load-bearing)")
    if fd5 is not None:
        os.close(fd5)
finally:
    kill_quiet(holder)

# ---- FLK-T6: filesystem behaviour (label + repeat contention on this fs) ----
p6 = os.path.join(BASE, "t6.lock")
fstype = mount_type(BASE)
holder = spawn_holder(p6)
try:
    _, ok, err = try_flock_nb(p6)
    report("FLK-T6", (not ok and err == 11),
           f"fstype={fstype} dir={BASE} contender flock NB while held -> acquired={ok} errno={err}")
finally:
    kill_quiet(holder)

# ---- FLK-T7: explicit LOCK_UN releases ----
p7 = os.path.join(BASE, "t7.lock")
fd7 = os.open(p7, os.O_RDWR | os.O_CREAT, 0o644)
fcntl.flock(fd7, fcntl.LOCK_EX)
fcntl.flock(fd7, fcntl.LOCK_UN)
fd7b, ok, err = try_flock_nb(p7)
report("FLK-T7", ok, f"contender flock NB after LOCK_UN -> acquired={ok} errno={err}")
os.close(fd7)
if fd7b is not None:
    os.close(fd7b)

# ---- FLK-T8a: O_CLOEXEC (default) — child does not inherit; parent death releases ----
p8a = os.path.join(BASE, "t8a.lock")
holder_code_8 = (
    "import fcntl, os, subprocess, sys, time\n"
    "fd = os.open(sys.argv[1], os.O_RDWR | os.O_CREAT, 0o644)\n"
    "fcntl.flock(fd, fcntl.LOCK_EX)\n"
    "open(sys.argv[2], 'w').write('locked')\n"
    "subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'])\n"
    "time.sleep(0.5)\n"  # holder exits; its fd closes; child (no fd) survives
)
ready8a = p8a + ".ready"
if os.path.exists(ready8a):
    os.unlink(ready8a)
h8a = subprocess.Popen([sys.executable, "-c", holder_code_8, p8a, ready8a],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(100):
    if os.path.exists(ready8a):
        break
    time.sleep(0.05)
h8a.wait(timeout=10)
time.sleep(0.3)
fd8a, ok, err = try_flock_nb(p8a)
report("FLK-T8a", ok,
       f"CLOEXEC holder died, orphan child alive (no fd), contender flock NB -> acquired={ok} (True expected)")
if fd8a is not None:
    os.close(fd8a)

# ---- FLK-T8b: inheritable fd — child inherits; parent death does NOT release ----
p8b = os.path.join(BASE, "t8b.lock")
holder_code_8b = (
    "import fcntl, os, subprocess, sys, time\n"
    "fd = os.open(sys.argv[1], os.O_RDWR | os.O_CREAT, 0o644)\n"
    "os.set_inheritable(fd, True)\n"  # simulate a runtime WITHOUT CLOEXEC
    "fcntl.flock(fd, fcntl.LOCK_EX)\n"
    "open(sys.argv[2], 'w').write('locked')\n"
    "subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'], pass_fds=(fd,))\n"
    "time.sleep(0.5)\n"  # holder exits; child still holds the inherited fd
)
ready8b = p8b + ".ready"
if os.path.exists(ready8b):
    os.unlink(ready8b)
h8b = subprocess.Popen([sys.executable, "-c", holder_code_8b, p8b, ready8b],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(100):
    if os.path.exists(ready8b):
        break
    time.sleep(0.05)
h8b.wait(timeout=10)
time.sleep(0.3)
fd8b, ok, err = try_flock_nb(p8b)
report("FLK-T8b", (not ok and err == 11),
       f"INHERITABLE fd holder died, orphan child holds fd, contender flock NB -> acquired={ok} errno={err} (False/11 expected: hazard is REAL if CLOEXEC is forgotten)")
if fd8b is not None:
    os.close(fd8b)

print(f"=== HASIL RUN={RUN} ({BASE}): {sum(RESULTS)}/{len(RESULTS)} PASS ===")
sys.exit(0 if all(RESULTS) else 1)
