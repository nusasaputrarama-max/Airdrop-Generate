// REFERENCE IMPLEMENTATION (test-only) — startup/cleanup logic per
// SSRF_REMEDIATION_DESIGN.md v2.3.2 §A.5.5.
// BUKAN kode produksi. Tujuannya: membuktikan perilaku state machine
// NOT_READY, validasi identitas PID, pidfile atomik, dan startup lock.
// Semua batas waktu memakai skala tes (ms) yang dipetakan ke nilai
// produksi di dokumen (exit-confirm 5 dtk, 3 percobaan).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- /proc helpers (Linux) ----
function readProcStat(pid) {
  try {
    const raw = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const closeParen = raw.lastIndexOf(')');
    const rest = raw.slice(closeParen + 2).split(' ');
    // rest[0] = field 3 (state); starttime = field 22 -> index 19
    return { starttime: rest[19], state: rest[0] };
  } catch { return null; }
}
function readProcCmdline(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ');
  } catch { return null; }
}
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// ---- 1. Validasi identitas proses sebelum SIGKILL ----
// expected: { starttime, cmdMarker }
// Mengembalikan { ok: true } atau { ok: false, reason }.
// TIDAK PERNAH mengirim sinyal; hanya membaca /proc.
function validateIdentity(pid, expected) {
  if (!pidAlive(pid)) return { ok: false, reason: 'pid-not-alive' };
  const stat = readProcStat(pid);
  if (!stat) return { ok: false, reason: 'stat-unreadable' };
  if (String(stat.starttime) !== String(expected.starttime)) {
    return { ok: false, reason: 'starttime-mismatch' };
  }
  const cmdline = readProcCmdline(pid);
  if (cmdline === null) return { ok: false, reason: 'cmdline-unreadable' };
  if (!cmdline.includes(expected.cmdMarker)) {
    return { ok: false, reason: 'cmdline-mismatch' };
  }
  return { ok: true, reason: 'identity-confirmed' };
}

// ---- 2. Pidfile atomik ----
// Tulis ke file sementara di direktori yang sama, fsync, rename atomik,
// fsync direktori. Isi: pid parent + pid worker + starttime + token +
// writtenAt + version. Tidak pernah ada keadaan "setengah tertulis".
function atomicWritePidfile(pidfilePath, record) {
  const dir = path.dirname(pidfilePath);
  const tmp = `${pidfilePath}.tmp.${process.pid}.${Date.now()}`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, JSON.stringify(record));
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, pidfilePath);
  const dfd = fs.openSync(dir, 'r');
  try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
}
function readPidfile(pidfilePath) {
  try {
    const rec = JSON.parse(fs.readFileSync(pidfilePath, 'utf8'));
    if (typeof rec !== 'object' || rec === null) return { ok: false, reason: 'not-an-object' };
    for (const k of ['parentPid', 'workerPid', 'workerStarttime', 'workerToken', 'writtenAt', 'version']) {
      if (!(k in rec)) return { ok: false, reason: `missing-field:${k}` };
    }
    return { ok: true, record: rec };
  } catch (e) { return { ok: false, reason: `unparseable:${e.code || e.message}` }; }
}

// ---- 3. Startup lock (O_EXCL + heartbeat + stale reclaim) ----
// Lock dipegang selama masa hidup proses (fd tetap terbuka).
// Pemenang: satu-satunya yang boleh cleanup/startup. Yang kalah keluar
// segera dengan alasan jelas dan TIDAK melakukan cleanup apa pun.
// Bila pemegang lock mati, lock menjadi basi dan dapat direklamasi
// setelah validasi identitas pemegang (pid mati + heartbeat basi).
function acquireStartupLock(lockPath, identity, opts = {}) {
  const heartbeatStaleMs = opts.heartbeatStaleMs ?? 10000;
  const maxReclaim = opts.maxReclaim ?? 3;
  for (let attempt = 0; attempt <= maxReclaim; attempt++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      const rec = { ...identity, heartbeatAt: Date.now(), version: 1 };
      fs.writeSync(fd, JSON.stringify(rec));
      fs.fsyncSync(fd);
      return { acquired: true, fd, record: rec, reclaimed: attempt > 0 };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // Lock sudah ada: baca pemegangnya.
      let holder = null;
      try { holder = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch { holder = null; }
      if (!holder || typeof holder.pid !== 'number') {
        // Lock rusak/tidak terbaca: JANGAN hapus membabi buta — hanya
        // hapus bila file tidak dapat diparse DAN sudah tua (>30 dtk).
        try {
          const st = fs.statSync(lockPath);
          if (Date.now() - st.mtimeMs > 30000) { fs.unlinkSync(lockPath); continue; }
        } catch { continue; }
        return { acquired: false, reason: 'lock-unreadable' };
      }
      // Validasi identitas pemegang: pid hidup + starttime cocok?
      const alive = pidAlive(holder.pid);
      const stat = alive ? readProcStat(holder.pid) : null;
      const identityMatches = alive && stat && String(stat.starttime) === String(holder.starttime);
      const heartbeatStale = Date.now() - (holder.heartbeatAt || 0) > heartbeatStaleMs;
      if (identityMatches && !heartbeatStale) {
        return { acquired: false, reason: 'held-by-live-holder', holderPid: holder.pid };
      }
      if (!alive || heartbeatStale) {
        // Pemegang mati atau heartbeat basi: reklamasi — hapus lalu coba lagi.
        // Catatan: ada jendela TOCTOU kecil di sini (pemegang bisa hidup
        // kembali di antara cek dan hapus); pemegang yang hidup kembali
        // akan gagal heartbeat karena lock sudah berpindah — didokumentasikan
        // sebagai risiko sisa U-25.
        try { fs.unlinkSync(lockPath); } catch { /* kalah balapan hapus */ }
        continue;
      }
      return { acquired: false, reason: 'held-by-live-holder', holderPid: holder.pid };
    }
  }
  return { acquired: false, reason: 'reclaim-exhausted' };
}
function heartbeatLock(fd, lockPath, identity) {
  // Perbarui heartbeat secara periodik; kembalikan interval agar pemanggil bisa menghentikannya.
  return setInterval(() => {
    try {
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, JSON.stringify({ ...identity, heartbeatAt: Date.now(), version: 1 }), 0);
      fs.fsyncSync(fd);
    } catch { /* fd tertutup / proses sekarat: biarkan lock menjadi basi */ }
  }, 2000).unref();
}

// ---- 4. State machine startup parent (aturan keras v2.3.2) ----
// Status: 'NOT_READY' | 'READY'. Parent BARU mulai dari NOT_READY.
// READY hanya via dua jalan: (a) exit worker lama terkonfirmasi, atau
// (b) bukti worker lama tidak pernah ada (pidfile tidak ada / basi dan
// PID tidak hidup). Batas percobaan BUKAN izin melanjutkan.
// opts: { attempts=3, exitWaitMs=5000, killer }
// killer: { kill(pid), waitExit(pid, timeoutMs) } -> Promise<boolean>
//   - realKiller: process.kill + polling /proc.
//   - fakeUnconfirmableKiller: mencatat kill, TIDAK PERNAH mengonfirmasi exit
//     (simulasi D-state / exit tidak terkonfirmasi — tidak dapat diproduksi
//     dengan proses nyata karena SIGKILL selalu membunuh).
class ParentStartup {
  constructor(opts = {}) {
    this.state = 'NOT_READY';
    this.attempts = opts.attempts ?? 3;
    this.exitWaitMs = opts.exitWaitMs ?? 5000;
    this.killer = opts.killer;
    this.sigsSent = 0;
    this.cleanupLog = [];
    this.pageCount = 0;
    this.lookupRejections = 0;
  }
  acceptLookup() {
    if (this.state !== 'READY') { this.lookupRejections++; return { ok: false, code: 'DNS_PARENT_NOT_READY' }; }
    return { ok: true };
  }
  async runCleanup(pidfilePath, workerExpect) {
    const read = readPidfile(pidfilePath);
    if (!read.ok) {
      if (read.reason.startsWith('unparseable:ENOENT')) {
        // File TIDAK ADA: tidak ada klaim worker lama -> bukti (b).
        this.cleanupLog.push('no-pidfile');
        this.state = 'READY';
        return { ready: true, path: 'no-pidfile' };
      }
      // File ADA tetapi rusak/parsial/tidak lengkap: worker lama TIDAK
      // DAPAT dibuktikan mati dan TIDAK DAPAT dibuktikan tidak ada.
      // Fail-closed (kriteria 1): tetap NOT_READY + page. Operator harus
      // memeriksa proses secara manual sebelum pidfile diperbaiki/dihapus.
      this.cleanupLog.push(`pidfile-corrupt:${read.reason}`);
      this.pageCount++;
      return { ready: false, path: 'pidfile-corrupt', reason: read.reason };
    }
    const rec = read.record;
    const wpid = rec.workerPid;
    if (!pidAlive(wpid)) {
      // Bukti (b): PID tidak hidup -> worker lama tidak ada.
      this.cleanupLog.push('worker-pid-not-alive');
      this.state = 'READY';
      return { ready: true, path: 'worker-already-dead' };
    }
    // Worker hidup menurut /proc: validasi identitas SEBELUM sinyal apa pun.
    const id = validateIdentity(wpid, { starttime: rec.workerStarttime, cmdMarker: 'dns-worker' });
    if (!id.ok) {
      // Identitas gagal: JANGAN kirim SIGKILL (bisa jadi proses lain
      // yang memakai ulang PID). Parent tetap NOT_READY + page.
      this.cleanupLog.push(`identity-failed:${id.reason}`);
      this.pageCount++;
      return { ready: false, path: 'identity-failed', reason: id.reason };
    }
    // Percobaan cleanup: SIGKILL + tunggu event exit (konfirmasi).
    for (let i = 1; i <= this.attempts; i++) {
      this.killer.kill(wpid);
      this.sigsSent++;
      const confirmed = await this.killer.waitExit(wpid, this.exitWaitMs);
      this.cleanupLog.push(`attempt-${i}:exitConfirmed=${confirmed}`);
      if (confirmed) {
        this.state = 'READY';
        return { ready: true, path: 'exit-confirmed', attemptsUsed: i };
      }
      // TIDAK ada decrement paksa, TIDAK ada transisi READY di sini.
    }
    // Batas percobaan habis DAN exit tidak terkonfirmasi -> TETAP NOT_READY.
    // Ini aturan keras v2.3.2: batas percobaan BUKAN izin melanjutkan.
    this.pageCount++;
    return { ready: false, path: 'attempts-exhausted-unconfirmed', attemptsUsed: this.attempts };
  }
}

// ---- Killer adapters ----
const realKiller = {
  kill(pid) { process.kill(pid, 'SIGKILL'); },
  async waitExit(pid, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (!pidAlive(pid)) return true;
      await sleep(10);
    }
    return pidAlive(pid) ? false : true;
  },
};
function fakeUnconfirmableKiller() {
  const kills = [];
  return {
    kills,
    kill(pid) { kills.push({ pid, at: Date.now() }); /* TIDAK membunuh: simulasi exit tak terkonfirmasi */ },
    async waitExit(_pid, timeoutMs) { await sleep(timeoutMs); return false; },
  };
}

module.exports = {
  sleep, pidAlive, readProcStat, readProcCmdline, validateIdentity,
  atomicWritePidfile, readPidfile, acquireStartupLock, heartbeatLock,
  ParentStartup, realKiller, fakeUnconfirmableKiller,
};
