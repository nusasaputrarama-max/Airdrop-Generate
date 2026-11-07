#!/usr/bin/env python3
"""OPS-T1..T6 — kontrol operasional never-unlink (U-33).
Kernel/filesystem nyata di VM ini, BUKAN mock.
Membedakan: kontrol yang ditegakkan OS vs aturan runbook-only.
"""
import os
import pwd
import shutil
import signal
import subprocess
import sys
import time

BASE = "/tmp/ops-v236"
shutil.rmtree(BASE, ignore_errors=True)
os.makedirs(BASE, exist_ok=True)


def check(name, cond, detail):
    print(f"{'PASS' if cond else 'FAIL'} {name} :: {detail}", flush=True)
    return cond


def run_as(user, *argv):
    return subprocess.run(
        ["setpriv", f"--reuid={user}", "--regid=nogroup", "--clear-groups",
         *argv], capture_output=True, text=True)


results = []

# ---- OPS-T1: direktori 0700 milik service user — user lain tidak bisa unlink/create ----
d1 = f"{BASE}/lockdir"
os.makedirs(d1)
os.chmod(d1, 0o700)
open(f"{d1}/startup.lock", "w").write('{"holderPid": 1}\n')
r_unlink = run_as("nobody", "rm", f"{d1}/startup.lock")
r_create = run_as("nobody", "touch", f"{d1}/evil.lock")
still_there = os.path.exists(f"{d1}/startup.lock") and not os.path.exists(f"{d1}/evil.lock")
results.append(check("OPS-T1", r_unlink.returncode != 0 and r_create.returncode != 0 and still_there,
    f"nobody rm lock -> rc={r_unlink.returncode} ({r_unlink.stderr.strip()}); "
    f"nobody touch -> rc={r_create.returncode}; file utuh={still_there} "
    f"(permission 0700 DITEGAKKAN kernel)"))

# ---- OPS-T2: chattr +i / +a — apakah tersedia di VM ini? ----
f2 = f"{BASE}/lockfile"
open(f2, "w").write("x")
r_i = subprocess.run(["chattr", "+i", f2], capture_output=True, text=True)
r_a = subprocess.run(["chattr", "+a", f2], capture_output=True, text=True)
results.append(check("OPS-T2", r_i.returncode != 0 and r_a.returncode != 0,
    f"chattr +i -> rc={r_i.returncode} ({r_i.stderr.strip()}); chattr +a -> rc={r_a.returncode} "
    f"({r_a.stderr.strip()}) — atribut immutable/append-only TIDAK tersedia di VM ini "
    f"(tmpfs DAN overlay), BUKAN kontrol yang dapat diandalkan di sini"))

# ---- OPS-T3: read-only bind mount direktori lock ----
d3 = f"{BASE}/lockdir-ro"
os.makedirs(d3)
open(f"{d3}/startup.lock", "w").write('{"holderPid": 1}\n')
m1 = subprocess.run(["mount", "--bind", d3, d3], capture_output=True, text=True)
m2 = subprocess.run(["mount", "-o", "remount,ro,bind", d3], capture_output=True, text=True)
r_ro_unlink = subprocess.run(["rm", f"{d3}/startup.lock"], capture_output=True, text=True)
ro_blocked = r_ro_unlink.returncode != 0 and os.path.exists(f"{d3}/startup.lock")
ro_file_intact_at_ro_stage = os.path.exists(f"{d3}/startup.lock")
m3 = subprocess.run(["mount", "-o", "remount,rw,bind", d3], capture_output=True, text=True)
r_rw_unlink = subprocess.run(["rm", f"{d3}/startup.lock"], capture_output=True, text=True)
rw_allowed = r_rw_unlink.returncode == 0
subprocess.run(["umount", d3], capture_output=True)
results.append(check("OPS-T3", m1.returncode == 0 and m2.returncode == 0 and ro_blocked and rw_allowed,
    f"bind+remount ro: mount rc={m1.returncode}/{m2.returncode}; rm saat ro -> rc={r_ro_unlink.returncode} "
    f"({r_ro_unlink.stderr.strip()}) file utuh saat ro={ro_file_intact_at_ro_stage}; "
    f"remount rw lalu rm -> rc={r_rw_unlink.returncode} (root DAPAT me-remount — kontrol ini "
    f"menghentikan penghapusan TAK SENGAJA, bukan root yang sengaja)"))

# ---- OPS-T4: root tetap dapat menghapus (kontrol OS tidak mengikat root) ----
d4 = f"{BASE}/lockdir-root"
os.makedirs(d4)
os.chmod(d4, 0o700)
open(f"{d4}/startup.lock", "w").write('{"holderPid": 1}\n')
r_root = subprocess.run(["rm", f"{d4}/startup.lock"], capture_output=True, text=True)
results.append(check("OPS-T4", r_root.returncode == 0 and not os.path.exists(f"{d4}/startup.lock"),
    f"root rm file di dir 0700 -> rc={r_root.returncode} (root MELEWATI DAC — "
    f"permission direktori TIDAK mengikat root; root hanya dibatasi runbook + audit)"))

# ---- OPS-T5: audit trail penghapusan — apakah tersedia? ----
auditd = shutil.which("auditctl") or shutil.which("auditd")
results.append(check("OPS-T5", auditd is None,
    f"auditctl/auditd: {'ADA di ' + auditd if auditd else 'TIDAK ADA di VM ini'} — "
    f"jejak audit unlink TIDAK dapat dibuktikan di sini; wajib prasyarat staging "
    f"(audit rule -w <lockdir> -p wa atau eBPF) bila operator root harus dapat diaudit"))

# ---- OPS-T6: dua user non-root yang berbeda tidak saling mengganggu ----
# Dir milik nobody:0700; user 'daemon' (uid 1, ada di /etc/passwd) mencoba unlink.
try:
    daemon_pw = pwd.getpwnam("daemon")
    d6 = f"{BASE}/lockdir-nobody"
    os.makedirs(d6)
    os.chown(d6, 65534, 65534)  # nobody:nogroup
    os.chmod(d6, 0o700)
    open(f"{d6}/startup.lock", "w").write('{"holderPid": 1}\n')
    os.chown(f"{d6}/startup.lock", 65534, 65534)
    r_daemon = run_as("daemon", "rm", f"{d6}/startup.lock")
    results.append(check("OPS-T6", r_daemon.returncode != 0 and os.path.exists(f"{d6}/startup.lock"),
        f"daemon (uid={daemon_pw.pw_uid}) rm file milik nobody di dir 0700 -> rc={r_daemon.returncode} "
        f"({r_daemon.stderr.strip()}); file utuh — isolasi antar user layanan DITEGAKKAN kernel"))
except KeyError:
    results.append(check("OPS-T6", False, "user 'daemon' tidak ada di /etc/passwd — tes dilewati"))

print(f"=== OPS: {sum(results)}/{len(results)} PASS ===")
sys.exit(0 if all(results) else 1)
