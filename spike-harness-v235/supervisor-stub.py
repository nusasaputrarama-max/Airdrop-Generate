# AUTH-T7 — supervisor restart + cleanup (simulasi supervisor platform).
#   1. Spawn parent #1 (full) -> tunggu parent-ready.
#   2. SIGKILL parent #1 (worker W1 tetap hidup — interval ref'd).
#   3. Spawn parent #2 (full) -> tunggu parent-ready.
#   4. Verifikasi: W1 mati (dibunuh parent #2 via validasi identitas),
#      W2 hidup, tepat 1 proses dns-worker, parent #2 READY.
#   5. Bersihkan: bunuh parent #2 + W2.
# Usage: python3 supervisor-stub.py <baseDir> <run>
import json
import os
import signal
import subprocess
import sys
import time

BASE = sys.argv[1]
RUN = sys.argv[2]
HARNESS = os.path.dirname(os.path.abspath(__file__))

def wait_for(path, timeout=20):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if os.path.exists(path):
            return True
        time.sleep(0.05)
    return False

def read_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None

def proc_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True

def count_dns_workers():
    n = 0
    for e in os.listdir("/proc"):
        if not e.isdigit():
            continue
        try:
            with open(f"/proc/{e}/cmdline", "rb") as f:
                if b"dns-worker" in f.read():
                    n += 1
        except Exception:
            pass
    return n

def main():
    d = os.path.join(BASE, "AUTH-T7")
    os.makedirs(d, exist_ok=True)
    lock_path = os.path.join(d, "startup.lock")
    pidfile = os.path.join(d, "parent.pid.json")
    barrier = os.path.join(d, "barrier")
    os.makedirs(barrier, exist_ok=True)
    result = {"test": "AUTH-T7", "result": "FAIL"}

    p1 = subprocess.Popen(
        ["bun", "parent-stub.js", d, "full", lock_path, pidfile, barrier, "", "serve-nocheck", "v235-parent"],
        cwd=HARNESS, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not wait_for(os.path.join(barrier, "parent-ready"), 20):
        result["detail"] = "parent1 never READY"
        print(json.dumps(result))
        try: p1.kill()
        except Exception: pass
        return
    pf1 = read_json(pidfile)
    w1 = pf1["workerPid"] if pf1 else None
    # Bunuh parent #1 saja (bukan process group): W1 harus tetap hidup.
    try: os.kill(p1.pid, signal.SIGKILL)
    except Exception: pass
    try: p1.wait(timeout=5)
    except Exception: pass
    time.sleep(0.3)
    w1_alive_after_crash = proc_alive(w1) if w1 else False
    # Hapus sinyal ready agar kemunculan berikutnya milik parent #2.
    try: os.unlink(os.path.join(barrier, "parent-ready"))
    except Exception: pass
    try: os.unlink(os.path.join(barrier, "worker-ready"))
    except Exception: pass
    try: os.unlink(os.path.join(barrier, "worker-check.json"))
    except Exception: pass

    p2 = subprocess.Popen(
        ["bun", "parent-stub.js", d, "full", lock_path, pidfile, barrier, "", "serve", "v235-parent"],
        cwd=HARNESS, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ready2 = wait_for(os.path.join(barrier, "parent-ready"), 20)
    pf2 = read_json(pidfile)
    w2 = pf2["workerPid"] if pf2 else None
    w1_dead = (not proc_alive(w1)) if w1 else False
    w2_alive = proc_alive(w2) if w2 else False
    n_workers = count_dns_workers()
    ok = bool(ready2 and w1_alive_after_crash and w1_dead and w2_alive and n_workers == 1 and w2 != w1)
    result.update({
        "result": "PASS" if ok else "FAIL",
        "parent1Ready": True, "w1AliveAfterCrash": w1_alive_after_crash,
        "parent2Ready": ready2, "w1Dead": w1_dead, "w2Alive": w2_alive,
        "dnsWorkerCount": n_workers, "w1": w1, "w2": w2,
    })
    # Bersihkan.
    for pid in (w2, w1):
        if pid:
            try: os.kill(pid, signal.SIGKILL)
            except Exception: pass
    try: p2.kill()
    except Exception: pass
    try: p2.wait(timeout=5)
    except Exception: pass
    print(json.dumps(result))

if __name__ == "__main__":
    main()
