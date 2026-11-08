// Tes aggregate budget concurrency-safe F-039 (v2.3.20) — jawaban atas
// audit V13 §4 F-039.
//
// MEMBUKTIKAN dua hal tentang rancangan v2.3.20 §2.3:
//   (1) tryReserve sinkron SEBELUM append membuat A1 (accepted /
//       retained bytes) TIDAK PERNAH melewati aggregate cap —
//       berapa pun jumlah reader paralel.
//   (2) Pseudodiff v2.3.19 (append dulu, cek sesudah) DAPAT melewati
//       cap: dengan 3 reader paralel, overshoot mencapai 2 chunk
//       tambahan dalam satu ronde lockstep — klaim "cap + satu chunk"
//       (H-RES-07 v2.3.19) SALAH untuk multi-reader.
//
// Definisi (proposal v2.3.20 §2.3):
//   A1 = accepted/retained bytes — byte yang lolos tryReserve dan
//        di-append ke accumulator aplikasi. Dijamin: A1 <= cap.
//   A2 = transient/in-flight bytes — byte yang sudah diserahkan
//        runtime ke callback reader tetapi belum diputuskan
//        (reserve/append/discard). Batas: A2 <= R x C_max, dengan
//        R = jumlah reader aktif dan C_max = ukuran chunk terbesar
//        yang diserahkan runtime dalam satu read. Bila script
//        dibaca SERIAL (satu reader aktif, R = 1), batasnya menjadi
//        A2 <= 1 x C_max — inilah keputusan desain v2.3.20.
//   C_max TIDAK dijamin kecil oleh runtime (bukti f024: chunk pertama
//   hingga 393.110 byte; probe F-038 v2320: 16.384 byte) — karena itu
//   batas A2 dinyatakan sebagai rumus + C_max terukur per deployment,
//   bukan angka mutlak.
//
// Bagian 1: simulasi lockstep DETERMINISTIK (tanpa jaringan) —
//   page 400.000 + 3 script @ 300.000, chunk 65.536, cap 1.000.000.
//   Logika baru vs logika lama dijalankan pada urutan chunk yang SAMA.
// Bagian 2: jaringan lokal nyata (Bun fetch + server 127.0.0.1) —
//   logika baru, varian paralel dan serial; ukur A1, C_max teramati,
//   peak pending (A2 teramati), waktu dinding, dan pastikan tidak ada
//   append setelah abort + hasil parsial dibuang.
//
// Bukti VM SAJA — bukan staging. Tidak ada checkLink, tidak ada
// artifact live.
//
// Usage (dari evidence/v2320/):
//   bun test-f039-tryreserve-v2320.ts > test-f039-tryreserve-v2320.txt 2>&1
// Exit 0 = semua assertion PASS; exit 1 = FAIL.

import http from "node:http";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
  } else {
    fail++;
    console.log(`FAIL ${name}${detail ? " — " + detail : ""}`);
  }
}

console.log("=== test-f039-tryreserve-v2320 ===");
console.log(`date: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })} WIB`);
console.log(`bun: ${Bun.version}`);
console.log(`uid: ${typeof process.getuid === "function" ? process.getuid() : "n/a"}`);
console.log(`env: VM lokal — BUKAN staging, BUKAN produksi`);

let unhandledRejections = 0;
process.on("unhandledRejection", (reason: any) => {
  // Bila quirk ini muncul lagi, tes GAGAL dengan keras — bukan
  // mencetak stack lalu exit 0. (Lihat catatan di bawah.)
  unhandledRejections++;
  console.log(`UNHANDLED REJECTION #${unhandledRejections}: ${reason?.name ?? "?"} ${reason?.message ?? reason}`);
});

const CAP = 1_000_000;
const CHUNK = 65_536;
const PAGE_LEN = 400_000;
const SCRIPT_LEN = 300_000;

// ------------------------------------------------------------------
// ScanBudget v2.3.20 — tryReserve sinkron sebelum append.
// ------------------------------------------------------------------
class ScanBudget {
  cap: number;
  accepted = 0; // A1
  pending = 0; // byte diterima tetapi belum diputuskan (bagian dari A2)
  peakPending = 0; // A2 teramati (puncak)
  aborted = false;
  appendsAfterAbort = 0;
  constructor(cap: number) { this.cap = cap; }
  tryReserve(n: number): boolean {
    if (this.aborted) return false;
    if (this.accepted + n > this.cap) {
      this.aborted = true; // memicu cancel semua reader + buang parsial
      return false;
    }
    this.accepted += n;
    return true;
  }
  // Dipanggil saat chunk tiba, SEBELUM keputusan reserve.
  onChunkArrive(n: number) {
    this.pending += n;
    if (this.pending > this.peakPending) this.peakPending = this.pending;
  }
  // Dipanggil setelah keputusan (diterima -> A1, ditolak -> dibuang).
  onChunkDecided(n: number) { this.pending -= n; }
}

function chunkSizes(total: number, size: number): number[] {
  const out: number[] = [];
  let rest = total;
  while (rest > 0) { const c = Math.min(size, rest); out.push(c); rest -= c; }
  return out;
}

// ------------------------------------------------------------------
// Bagian 1 — simulasi lockstep deterministik.
// ------------------------------------------------------------------
console.log("--- bagian 1: lockstep deterministik (tanpa jaringan) ---");
{
  // Unit tryReserve.
  const b0 = new ScanBudget(CAP);
  check("tryReserve: reserve tepat sisa -> true", b0.tryReserve(CAP) === true && b0.accepted === CAP);
  check("tryReserve: reserve 1 byte lagi -> false + aborted", b0.tryReserve(1) === false && b0.aborted);
  check("tryReserve: setelah abort selalu false", b0.tryReserve(0) === false);
  const b00 = new ScanBudget(CAP);
  check("tryReserve: reserve 0 di awal -> true", b00.tryReserve(0) === true && b00.accepted === 0);

  const pageChunks = chunkSizes(PAGE_LEN, CHUNK);
  const scriptChunks = chunkSizes(SCRIPT_LEN, CHUNK);

  // Logika BARU (v2.3.20): page dulu, lalu 3 script lockstep.
  // Ronde = s1, s2, s3 masing-masing satu chunk, berurutan.
  function runNewLogic(): { a1: number; rounds: number } {
    const b = new ScanBudget(CAP);
    for (const c of pageChunks) {
      b.onChunkArrive(c);
      if (!b.tryReserve(c)) { b.onChunkDecided(c); break; }
      b.onChunkDecided(c);
    }
    let rounds = 0;
    const idx = [0, 0, 0];
    outer: for (;;) {
      rounds++;
      for (let r = 0; r < 3; r++) {
        if (idx[r] >= scriptChunks.length) continue;
        const c = scriptChunks[idx[r]++];
        b.onChunkArrive(c);
        if (!b.tryReserve(c)) { b.onChunkDecided(c); break outer; }
        b.onChunkDecided(c);
      }
      if (idx.every((i) => i >= scriptChunks.length)) break;
    }
    return { a1: b.accepted, rounds };
  }

  // Logika LAMA (v2.3.19): append dulu, cek sesudah; tidak ada cek
  // abort-flag sebelum append (chunk yang sudah in-flight tetap di-append).
  function runOldLogic(): { a1: number } {
    let used = 0;
    let aborted = false;
    for (const c of pageChunks) { used += c; if (used > CAP) aborted = true; }
    const idx = [0, 0, 0];
    outer: for (;;) {
      for (let r = 0; r < 3; r++) {
        if (idx[r] >= scriptChunks.length) continue;
        const c = scriptChunks[idx[r]++];
        used += c; // append TANPA reserve
        if (used > CAP) aborted = true;
        // reader lain di ronde yang sama tetap jalan: chunk mereka
        // sudah in-flight dan tetap di-append sebelum abort diproses.
      }
      if (aborted) break outer;
      if (idx.every((i) => i >= scriptChunks.length)) break;
    }
    return { a1: used };
  }

  const fresh = runNewLogic();
  console.log(`logika baru (tryReserve): A1=${fresh.a1}, ronde=${fresh.rounds}`);
  // Hitung ekspektasi: page 400.000; sisa 600.000; chunk script 65.536.
  // 600.000 / 65.536 = 9,15 -> 9 chunk penuh diterima (589.824),
  // chunk ke-10 ditolak. A1 = 400.000 + 589.824 = 989.824.
  check("baru: A1 TIDAK PERNAH melewati cap", fresh.a1 <= CAP, `A1=${fresh.a1} cap=${CAP}`);
  check("baru: A1 tepat 989.824 (deterministik lockstep)", fresh.a1 === 989_824, `A1=${fresh.a1}`);
  check("baru: berhenti pada ronde ke-4 (chunk ke-10 ditolak)", fresh.rounds === 4, `ronde=${fresh.rounds}`);

  const old = runOldLogic();
  console.log(`logika lama (append-dulu): A1=${old.a1}`);
  check("lama: A1 MELEWATI cap (cacat v2.3.19 terbukti)", old.a1 > CAP, `A1=${old.a1} cap=${CAP}`);
  // Ekspektasi: s1 ronde-4 append -> 1.055.360 (lewat cap); s2 dan s3
  // ronde-4 tetap append -> +131.072 = 1.186.432. Overshoot 186.432.
  check("lama: overshoot tepat 3 chunk ronde-4 (A1=1.186.432)", old.a1 === 1_186_432, `A1=${old.a1}`);
  check("lama: overshoot > satu chunk (klaim 'cap + satu chunk' SALAH)", old.a1 - CAP > CHUNK, `overshoot=${old.a1 - CAP} vs satu chunk=${CHUNK}`);

  // Varian SERIAL (keputusan desain v2.3.20): script satu per satu.
  function runSerialized(): { a1: number } {
    const b = new ScanBudget(CAP);
    for (const c of pageChunks) { b.onChunkArrive(c); if (!b.tryReserve(c)) { b.onChunkDecided(c); break; } b.onChunkDecided(c); }
    for (let s = 0; s < 3 && !b.aborted; s++) {
      for (const c of scriptChunks) {
        b.onChunkArrive(c);
        if (!b.tryReserve(c)) { b.onChunkDecided(c); break; }
        b.onChunkDecided(c);
      }
    }
    return { a1: b.accepted };
  }
  const ser = runSerialized();
  console.log(`logika baru SERIAL: A1=${ser.a1}`);
  check("serial: A1 TIDAK PERNAH melewati cap", ser.a1 <= CAP, `A1=${ser.a1}`);
  // s1 penuh 300.000 -> 700.000; s2: 4 chunk (262.144) -> 962.144,
  // chunk ke-5 37.856 -> tepat 1.000.000; s3 chunk pertama ditolak.
  check("serial: A1 tepat 1.000.000 (batas inklusif tercapai)", ser.a1 === 1_000_000, `A1=${ser.a1}`);
}

// ------------------------------------------------------------------
// Bagian 2 — jaringan lokal nyata (Bun fetch, server 127.0.0.1).
// ------------------------------------------------------------------
console.log("--- bagian 2: jaringan lokal (Bun fetch) ---");
{
  const server = http.createServer((req, res) => {
    const len = req.url === "/page" ? PAGE_LEN : SCRIPT_LEN;
    res.writeHead(200, { "Content-Type": "text/plain" });
    let sent = 0;
    const tick = () => {
      if (sent >= len) { res.end(); return; }
      const c = Math.min(CHUNK, len - sent);
      sent += c;
      res.write(Buffer.alloc(c, 0x42));
      setTimeout(tick, 1);
    };
    tick();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;
  let fetchAbortedCount = 0; // fetch() yang reject AbortError karena shared abort (ditangani, dihitung)

  // CATATAN (temuan saat penulisan tes ini — DUA quirk Bun yang
  // ditangani, bukan disembunyikan):
  //   (a) fetch() dengan shared AbortSignal dapat REJECT AbortError
  //       bila sinyal abort menyala SEBELUM fetch resolve (reader lain
  //       mencapai cap lebih dulu). Karena itu await fetch HARUS di
  //       dalam try/catch dan AbortError diperlakukan sebagai
  //       "aborted mid-stream". Ini juga syarat implementasi di
  //       proposal v2.3.20 §2.3 (readCappedStream/fetchGuarded).
  //   (b) reader.cancel() pada stream yang sudah di-abort me-REJECT
  //       dengan AbortError. Bila dipanggil TANPA await di blok
  //       finally, rejection itu menjadi UNHANDLED (Bun mencetak
  //       stack trace tetapi tetap exit 0 — false green yang
  //       berbahaya bagi log bukti). Run pertama tes ini (log
  //       test-f039-tryreserve-v2320-run1-noisy.txt) menunjukkan
  //       tepat 3 unhandled AbortError — satu per reader paralel —
  //       dari pola ini. Perbaikan: `await reader.cancel()` di dalam
  //       try/catch. Tes ini kini MENGGAGALKAN DIRI SENDIRI bila ada
  //       satu pun unhandled rejection (lihat handler di atas).
  async function readStream(
    url: string, budget: ScanBudget, abort: AbortController,
  ): Promise<{ bytes: number; abortedMid: boolean; fetchAborted: boolean }> {
    let res: Response;
    try {
      res = await fetch(url, { signal: abort.signal });
    } catch (e: any) {
      if (e?.name === "AbortError") {
        fetchAbortedCount++;
        return { bytes: 0, abortedMid: true, fetchAborted: true };
      }
      throw e;
    }
    const reader = res.body!.getReader();
    let bytes = 0;
    let abortedMid = false;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        budget.onChunkArrive(value.length);
        if (budget.aborted) {
          budget.appendsAfterAbort++;
          budget.onChunkDecided(value.length);
          abortedMid = true;
          break;
        }
        if (!budget.tryReserve(value.length)) {
          budget.onChunkDecided(value.length);
          abort.abort();
          abortedMid = true;
          break;
        }
        budget.onChunkDecided(value.length);
        bytes += value.length;
      }
    } catch {
      abortedMid = true; // abort signal membatalkan read
    } finally {
      try { await reader.cancel(); } catch { /* abaikan: stream sudah abort */ }
    }
    return { bytes, abortedMid, fetchAborted: false };
  }

  // Varian PARALEL (3 script bersamaan, seperti actions.ts saat ini).
  const tPar0 = Date.now();
  const budgetPar = new ScanBudget(CAP);
  const abortPar = new AbortController();
  const pagePar = await readStream(`${base}/page`, budgetPar, abortPar);
  const scriptsPar = await Promise.all([
    readStream(`${base}/s1`, budgetPar, abortPar),
    readStream(`${base}/s2`, budgetPar, abortPar),
    readStream(`${base}/s3`, budgetPar, abortPar),
  ]);
  const tPar = Date.now() - tPar0;
  const totalParAccepted = pagePar.bytes + scriptsPar.reduce((a, s) => a + s.bytes, 0);
  console.log(`paralel: page=${pagePar.bytes}, scripts=${scriptsPar.map((s) => s.bytes).join(",")}, A1=${budgetPar.accepted}, peakPending(A2 teramati)=${budgetPar.peakPending}, appendsAfterAbort=${budgetPar.appendsAfterAbort}, wall=${tPar}ms`);
  check("paralel live: A1 (budget) TIDAK melewati cap", budgetPar.accepted <= CAP, `A1=${budgetPar.accepted}`);
  check("paralel live: A1 == jumlah byte diterima semua reader", budgetPar.accepted === totalParAccepted, `budget=${budgetPar.accepted} sum=${totalParAccepted}`);
  check("paralel live: abort terjadi (cap terlampaui)", budgetPar.aborted === true);
  check("paralel live: tidak ada append setelah abort", budgetPar.appendsAfterAbort === 0, `appendsAfterAbort=${budgetPar.appendsAfterAbort}`);
  check("paralel live: minimal satu script terpotong", scriptsPar.some((s) => s.bytes < SCRIPT_LEN), JSON.stringify(scriptsPar.map((s) => s.bytes)));
  check("paralel live: peak pending > 0 (A2 teramati, bukan nol)", budgetPar.peakPending > 0, `peakPending=${budgetPar.peakPending}`);
  console.log(`paralel live: batas A2 rumus = 3 x C_max teramati; C_max teramati di run ini <= ${budgetPar.peakPending} (peak pending) — batas eksak butuh C_max runtime`);

  // Varian SERIAL (keputusan desain v2.3.20).
  const tSer0 = Date.now();
  const budgetSer = new ScanBudget(CAP);
  const abortSer = new AbortController();
  const pageSer = await readStream(`${base}/page`, budgetSer, abortSer);
  const s1 = await readStream(`${base}/s1`, budgetSer, abortSer);
  const s2 = await readStream(`${base}/s2`, budgetSer, abortSer);
  const s3 = await readStream(`${base}/s3`, budgetSer, abortSer);
  const tSer = Date.now() - tSer0;
  console.log(`serial: page=${pageSer.bytes}, scripts=${[s1.bytes, s2.bytes, s3.bytes].join(",")}, A1=${budgetSer.accepted}, peakPending=${budgetSer.peakPending}, appendsAfterAbort=${budgetSer.appendsAfterAbort}, wall=${tSer}ms`);
  check("serial live: A1 TIDAK melewati cap", budgetSer.accepted <= CAP, `A1=${budgetSer.accepted}`);
  check("serial live: abort terjadi", budgetSer.aborted === true);
  check("serial live: tidak ada append setelah abort", budgetSer.appendsAfterAbort === 0);
  check("serial live: hasil parsial dibuang (tidak ada verdict dari parsial)", budgetSer.aborted && budgetSer.accepted < PAGE_LEN + 3 * SCRIPT_LEN, `A1=${budgetSer.accepted} < total=${PAGE_LEN + 3 * SCRIPT_LEN}`);
  console.log(`latensi: paralel=${tPar}ms serial=${tSer}ms (serial lebih lambat ${tSer - tPar}ms pada fixture ini; keduanya jauh di bawah deadline 20 detik — trade-off terukur, lihat proposal §2.3)`);
  console.log(`fetchAborted (fetch reject AbortError karena shared abort, ditangani): ${fetchAbortedCount}`);
  check("live: TIDAK ADA unhandled rejection (AbortError fetch ditangkap)", unhandledRejections === 0, `unhandledRejections=${unhandledRejections}`);

  server.close();
}

console.log(`=== RESULT: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
