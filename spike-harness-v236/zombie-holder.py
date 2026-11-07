#!/usr/bin/env python3
# SPDX-License-Identifier: MIT (harness uji AG-001, bukan kode produksi)
# Helper untuk PIDFD-T11e: buat SATU zombie yang tidak di-reap.
# CPython TIDAK me-reap child sampai wait()/poll() dipanggil — child yang
# dibunuh tanpa wait() tetap state Z selama helper ini hidup.
# (Node TIDAK dapat dipakai untuk ini: libuv me-reap child hampir seketika.)
# Cara pakai: python3 zombie-holder.py -> cetak JSON {pid, starttime, stateAfterKill},
# lalu tidur 15 dtk sambil menahan zombie.
import json, subprocess, sys, time

child = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)",
                          "dns-worker"],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
pid = child.pid
time.sleep(0.5)
with open(f"/proc/{pid}/stat") as f:
    raw = f.read()
starttime = raw[raw.rfind(") ") + 2:].split(" ")[19]
child.kill()  # SIGKILL, TANPA wait() -> zombie
time.sleep(0.3)
with open(f"/proc/{pid}/stat") as f:
    raw2 = f.read()
state = raw2[raw2.rfind(") ") + 2:].split(" ")[0]
print(json.dumps({"pid": pid, "starttime": starttime, "stateAfterKill": state}), flush=True)
time.sleep(15)
