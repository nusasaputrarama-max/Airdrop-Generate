// Worker stub — self-check SEBELUM melayani lookup pertama (v2.3.5).
// Worker TIDAK PERNAH menerima fd lock dan TIDAK PERNAH menerima token
// lewat argv/env. Ia membaca DUA file dari disk:
//   (1) pidfile  -> lockToken yang ditulis parent-nya
//   (2) lock record via path -> token pemegang lock saat ini
// dan mem-probe pidfile flock:
//   - probe BERHASIL (LOCK_EX|LOCK_NB lolos) -> tidak ada parent hidup
//     yang memegang pidfile -> MENOLAK melayani.
//   - probe gagal EWOULDBLOCK (parent hidup memegang) DAN
//     pidfile.lockToken == lockRecord.token -> melayani.
//   - token tidak cocok -> MENOLAK (pidfile ditulis parent basi).
// Pemeriksaan diulang berkala (500 ms, skala tes): bila parent mati
// (probe lolos) atau token berubah -> worker keluar sendiri (kode 4).
//
// PEMBEDAAN FASE (penting):
//   - Startup: pidfile yang belum ditulis parent-ku (parentPid != ppid
//     atau workerPid != pid-ku) adalah TRANSIEN — parent masih setup,
//     di-retry sampai 3 detik. Begitu pula pidfile flock yang belum
//     dipegang sementara ppid masih hidup.
//   - Serve: SEMUA kegagalan adalah FINAL — pidfile yang tidak lagi
//     menunjuk parent-ku, probe yang lolos, atau token yang berubah
//     berarti parent mati atau parent basi menimpa pidfile -> keluar.
//
// Usage: bun worker-stub.js <pidfilePath> <lockPath> <barrierDir> <mode> dns-worker
//   mode serve         — tetap hidup (interval ref'd) setelah check lolos.
//   mode serve-nocheck — worker STUBBORN tanpa re-check berkala (hanya
//                        untuk AUTH-T3/T7: parent baru harus membunuhnya
//                        via pidfile; BUKAN perilaku produksi).
//   mode checkonly     — keluar setelah check (kode 0 bila serve, 3 bila tolak).
// Output: worker-check.json di barrierDir + satu baris JSON di stdout.
import fs from "node:fs";
import {
  probePidfileLock, readPidfile, readRecordViaPath, readProcStat,
} from "./startup-flock-v235.js";

const pidfilePath = process.argv[2];
const lockPath = process.argv[3];
const barrierDir = process.argv[4];
const mode = process.argv[5] || "serve";

// Alasan yang masih TRANSIEN saat startup (parent sedang setup).
const TRANSIENT_STARTUP = new Set([
  "pidfile-not-mine-yet",
  "pidfile-flock-not-held-yet",
  "lock-record-unreadable",
  "pidfile-probe-error",
]);

function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
  catch { Bun.sleepSync(ms); }
}
function writeCheck(obj) {
  try { fs.writeFileSync(`${barrierDir}/worker-check.json`, JSON.stringify(obj)); } catch {}
  process.stdout.write(JSON.stringify(obj) + "\n");
}
function ppidAlive() {
  try { process.kill(process.ppid, 0); return true; } catch { return false; }
}

function selfCheck(phase) {
  // URUTAN MENGIKAT: probe pidfile flock DIDAHULUKAN dari pemeriksaan isi.
  // Kematian parent (flock lepas) dan penggantian pidfile via rename
  // (inode baru tanpa flock) HANYA terdeteksi lewat probe; isi file
  // dapat terlihat konsisten sementara otoritasnya sudah hilang.
  // Bila pidfile belum ada / belum ditulis parent-ku, probe open akan
  // gagal -> 'pidfile-probe-error' (transien saat startup).
  const probe = probePidfileLock(pidfilePath);
  if (probe.error) {
    return { serve: false, reason: "pidfile-probe-error", phase };
  }
  if (!probe.held) {
    // Tidak ada parent hidup yang memegang pidfile flock. Saat startup
    // ini masih bisa berarti parent sedang setup (ppid hidup) ->
    // transien. Saat serve ini berarti parent mati atau pidfile
    // di-rename (inode baru) -> final.
    if (phase === "startup" && ppidAlive()) {
      return { serve: false, reason: "pidfile-flock-not-held-yet", phase };
    }
    return { serve: false, reason: "pidfile-lock-not-held-no-live-parent", phase };
  }
  // Probe: ada parent hidup yang memegang pidfile. Sekarang periksa isi.
  const pf = readPidfile(pidfilePath);
  // Pidfile harus menunjuk parent-ku (ppid) DAN worker-ku (pid-ku).
  // Bila belum — saat startup berarti parent masih setup (transien);
  // saat serve berarti pidfile diganti in-place oleh parent basi (final).
  if (!pf || pf.parentPid !== process.ppid || pf.workerPid !== process.pid
      || typeof pf.lockToken !== "string") {
    return { serve: false, reason: "pidfile-not-mine-yet", phase };
  }
  const lr = readRecordViaPath(lockPath);
  if (lr.kind !== "parsed" || !lr.record || typeof lr.record.token !== "string") {
    return { serve: false, reason: "lock-record-unreadable", phase };
  }
  if (lr.record.token !== pf.lockToken) {
    return { serve: false, reason: "token-mismatch", phase,
             pidfileToken: pf.lockToken.slice(0, 8), lockToken: lr.record.token.slice(0, 8) };
  }
  return { serve: true, reason: "ok", phase, workerPid: process.pid };
}

// Startup: retry hanya alasan transien (maks 3 detik).
let first = selfCheck("startup");
let waitedMs = 0;
while (!first.serve && TRANSIENT_STARTUP.has(first.reason) && waitedMs < 3000) {
  sleepSync(100);
  waitedMs += 100;
  first = selfCheck("startup");
}
first.workerPid = process.pid;
try {
  const st = readProcStat(process.pid);
  first.starttime = st ? st.starttime : null;
} catch { first.starttime = null; }
writeCheck(first);
try { fs.writeFileSync(`${barrierDir}/worker-ready`, String(process.pid)); } catch {}

if (!first.serve) process.exit(3);
if (mode === "checkonly") process.exit(0);
if (mode === "serve-nocheck") {
  // Worker STUBBORN (tanpa re-check berkala): dipakai AUTH-T3/T7 agar
  // parent baru benar-benar harus membunuhnya via pidfile. Ini BUKAN
  // perilaku produksi (worker produksi selalu re-check).
  setInterval(() => {}, 60000);
  process.on("SIGTERM", () => process.exit(0));
  await new Promise(() => {});
}

// Mode serve: tetap hidup dengan interval ref'd (simulasi handle lookup
// aktif), dan periksa ulang berkala. Bila check gagal -> keluar sendiri.
const iv = setInterval(() => {
  const c = selfCheck("serve");
  if (!c.serve) {
    writeCheck({ ...c, recheckFailed: true });
    clearInterval(iv);
    process.exit(4);
  }
}, 500);

process.on("SIGTERM", () => process.exit(0));
