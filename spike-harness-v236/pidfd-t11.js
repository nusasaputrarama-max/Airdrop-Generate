// SPDX-License-Identifier: MIT (harness uji AG-001, bukan kode produksi)
// PIDFD-T11 — uji urutan referensi signalWorkerByPidfd (Bun).
// T11a: kill worker normal via pidfd (identitas cocok) -> signaled + confirmed.
// T11b: starttime SALAH -> ditolak, worker hidup.
// T11c: cmdline marker SALAH -> ditolak, worker hidup.
// T11d: target sudah mati + di-reap -> pid-not-alive, tidak ada sinyal ke mana pun.
// T11e: target zombie (mati, belum di-reap) -> already-dead, TIDAK ada sinyal.
// Semua tes memakai proses Bun nyata + kernel nyata, BUKAN mock.
import { signalWorkerByPidfd, readProcStat } from "./pidfd-signal.js";

const out = (name, cond, detail) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name} :: ${detail}`);
  return !!cond;
};
const results = [];

function spawnWorker() {
  // Worker tiruan: proses Bun dengan marker di argv.
  const p = Bun.spawn([process.execPath, "-e", "setInterval(()=>{}, 1000);", "dns-worker"],
    { stdout: "ignore", stderr: "ignore" });
  return p;
}
function statOf(pid) {
  try {
    const txt = require("node:fs").readFileSync(`/proc/${pid}/stat`, "utf8");
    const after = txt.slice(txt.lastIndexOf(") ") + 2).split(" ");
    return { state: after[0], starttime: after[19] };
  } catch { return null; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// T11a — normal kill.
{
  const w = spawnWorker();
  await sleep(300);
  const st = statOf(w.pid);
  const r = signalWorkerByPidfd({ pid: w.pid, expectedStarttime: st.starttime, cmdlineMarker: "dns-worker" });
  await sleep(100);
  results.push(out("PIDFD-T11a", r.ok === true && r.reason === "signaled-and-confirmed" && w.exited !== null,
    `signal worker ${w.pid} (starttime ${st.starttime}) -> ${JSON.stringify(r)}; exited=${w.exited !== null}`));
  try { w.kill(9); } catch {}
}
// T11b — starttime salah.
{
  const w = spawnWorker();
  await sleep(300);
  const st = statOf(w.pid);
  const r = signalWorkerByPidfd({ pid: w.pid, expectedStarttime: String(Number(st.starttime) + 100), cmdlineMarker: "dns-worker" });
  const alive = statOf(w.pid) && statOf(w.pid).state !== "Z";
  results.push(out("PIDFD-T11b", r.ok === false && r.reason === "identity-mismatch" && alive,
    `starttime salah -> ${JSON.stringify(r)}; worker hidup=${!!alive}`));
  w.kill(9);
  await sleep(100);
}
// T11c — cmdline marker salah.
{
  const w = spawnWorker();
  await sleep(300);
  const st = statOf(w.pid);
  const r = signalWorkerByPidfd({ pid: w.pid, expectedStarttime: st.starttime, cmdlineMarker: "bukan-worker" });
  const alive = statOf(w.pid) && statOf(w.pid).state !== "Z";
  results.push(out("PIDFD-T11c", r.ok === false && r.reason === "identity-mismatch" && alive,
    `marker salah -> ${JSON.stringify(r)}; worker hidup=${!!alive}`));
  w.kill(9);
  await sleep(100);
}
// T11d — target mati + di-reap.
{
  const w = spawnWorker();
  await sleep(300);
  const st = statOf(w.pid);
  const pid = w.pid;
  w.kill(9);
  await w.exited;
  await sleep(100);
  const r = signalWorkerByPidfd({ pid, expectedStarttime: st.starttime, cmdlineMarker: "dns-worker" });
  results.push(out("PIDFD-T11d", r.ok === false && r.reason === "pid-not-alive",
    `target mati+reap -> ${JSON.stringify(r)} (tidak ada sinyal ke proses lain)`));
}
// T11e — target zombie (mati, belum di-reap).
// Bun me-reap child otomatis dan Node/libuv juga me-reap hampir seketika,
// jadi zombie dibuat oleh helper Python (zombie-holder.py): CPython tidak
// me-reap child sampai wait()/poll() dipanggil.
// Baca stdout helper per-baris (JANGAN tunggu stream menutup — helper
// hidup 15 dtk menahan zombie).
{
  const helper = Bun.spawn(["python3", "./zombie-holder.py"], {
    cwd: import.meta.dir, stdout: "pipe", stderr: "ignore",
  });
  const reader = helper.stdout.getReader();
  let buf = "";
  let info = null;
  while (!info) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += new TextDecoder().decode(value);
    const nl = buf.indexOf("\n");
    if (nl >= 0) { info = JSON.parse(buf.slice(0, nl).trim()); break; }
  }
  try { reader.releaseLock(); } catch {}
  const stZ = statOf(info.pid);
  const r = signalWorkerByPidfd({ pid: info.pid, expectedStarttime: info.starttime, cmdlineMarker: "dns-worker" });
  const isZombieSetup = stZ && stZ.state === "Z" && info.stateAfterKill === "Z";
  results.push(out("PIDFD-T11e", r.ok === false && r.reason === "already-dead" && isZombieSetup,
    `zombie setup state=${stZ ? stZ.state : "gone"} -> ${JSON.stringify(r)} (pidfd TIDAK dipakai untuk membunuh zombie)`));
  helper.kill(9);
  await sleep(100);
}

console.log(`=== PIDFD-T11: ${results.filter(Boolean).length}/${results.length} PASS ===`);
process.exit(results.every(Boolean) ? 0 : 1);
