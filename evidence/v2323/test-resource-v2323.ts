// test-resource-v2323.ts — Harness 1 (H-RES-xx): resource budget / capped
// streaming read untuk revisi desain v2.3.23 (SSRF remediation).
//
// Menguji modul ASLI site/server/src/ssrf-guard.ts (readCappedStream,
// createScanBudget, tryReserve, CapError, konstanta cap/deadline) secara
// lokal saja: stream in-memory / mock, TANPA request jaringan apa pun.
// Desain acuan: SSRF_REMEDIATION_DESIGN.md §A.5 + §A.5.1 (dekompresi) +
// §A.5.2 (DNS non-cancellable); SSRF_PROPOSAL_F001_F005_V2320.md §1–§3
// (F-002 L0/L1/L3, F-039 tryReserve, F-003 deadline 20s); SSRF_SPIKE_V21.md
// TEST 2 (Node Agent decompression, abort pada 409.600 decoded bytes).
//
// Usage (dari root worktree /home/hatch/workspace/airdrop-generate-dev):
//   bun evidence/v2323/test-resource-v2323.ts
// Exit 0 = semua PASS; exit 1 = ada FAIL. Satu-satunya test lambat adalah
// H-RES-15 (~20 detik, deadline total); semua skenario waktu lain memakai
// signal timeout pendek / `now` injeksi — tidak ada sleep waktu-nyata lain.
//
// BUKTI VM SAJA — bukan staging, bukan produksi.

import { gzipSync, deflateSync, brotliCompressSync } from "node:zlib";
import { Readable } from "node:stream";
import {
  readCappedStream,
  createScanBudget,
  tryReserve,
  CapError,
  PAGE_DECODED_CAP,
  SCRIPT_DECODED_CAP,
  AGGREGATE_DECODED_CAP,
  TOTAL_DEADLINE_MS,
  type ScanBudget,
} from "../../site/server/src/ssrf-guard";

// ---------------------------------------------------------------------------
// Mini framework
// ---------------------------------------------------------------------------
let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`assert gagal: ${msg}`);
}

async function test(id: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    pass++;
    console.log(`PASS ${id}`);
  } catch (e) {
    fail++;
    const m = e instanceof Error ? e.message : String(e);
    failures.push(id);
    console.log(`FAIL ${id} — ${m}`);
  }
}

process.on("unhandledRejection", (e) => {
  console.log(`FAIL unhandledRejection — ${e instanceof Error ? e.message : String(e)}`);
  fail++;
  finish();
});

function finish(): never {
  console.log(`\n==== RINGKASAN test-resource-v2323: PASS ${pass} / FAIL ${fail} ====`);
  if (failures.length > 0) console.log(`Gagal: ${failures.join(", ")}`);
  process.exit(fail === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Helpers stream
// ---------------------------------------------------------------------------
/** Readable satu-chunk dari Buffer. */
function oneChunk(buf: Buffer): Readable {
  return Readable.from([buf]);
}

/** Readable yang mencatat apakah _read pernah dipanggil (bukti "belum dibaca"). */
function flagStream(buf: Buffer): { stream: Readable; wasRead: () => boolean } {
  let read = false;
  let pushed = false;
  const stream = new Readable({
    read() {
      read = true;
      if (!pushed) {
        pushed = true;
        this.push(buf);
      } else {
        this.push(null);
      }
    },
  });
  return { stream, wasRead: () => read };
}

/** Stream plain totalBytes dalam chunkSize, dengan jeda microtask antar chunk. */
function chunkedStream(totalBytes: number, chunkSize: number, fill = 0x78): Readable {
  async function* gen(): AsyncGenerator<Buffer> {
    let remaining = totalBytes;
    while (remaining > 0) {
      const n = Math.min(chunkSize, remaining);
      remaining -= n;
      yield Buffer.alloc(n, fill);
      await new Promise<void>((r) => setImmediate(r));
    }
  }
  return Readable.from(gen());
}

/** Stream slow-drip: 1 chunk kecil tiap `intervalMs`; tidak pernah selesai bila `total` = Infinity. */
function dripStream(intervalMs: number, totalChunks = Infinity): Readable {
  let sent = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const stream = new Readable({
    read() {
      if (sent >= totalChunks) {
        this.push(null);
        return;
      }
      timer = setTimeout(() => {
        sent++;
        this.push(Buffer.from("x"));
      }, intervalMs);
    },
    destroy(err, cb) {
      if (timer !== null) clearTimeout(timer);
      cb(err);
    },
  });
  return stream;
}

function freshBudget(cap = AGGREGATE_DECODED_CAP): ScanBudget {
  return createScanBudget(cap);
}

function neverSignal(): AbortSignal {
  return new AbortController().signal;
}

// ===========================================================================
// H-RES-13 — L0/L1 separation: gzip 520 B wire -> 500.000 B decoded
// ===========================================================================
await test("H-RES-13", async () => {
  const text = "A".repeat(500_000);
  const gz = gzipSync(Buffer.from(text, "utf-8"));
  // Fixture harus sesuai spesifikasi: ~520 B wire -> 500.000 B decoded.
  ok(gz.length >= 400 && gz.length <= 2_000, `wire fixture ${gz.length} B di luar rentang 400..2000`);
  console.log(`  fixture: wire=${gz.length} B, decoded=500000 B`);

  const r = await readCappedStream(oneChunk(gz), {
    contentEncoding: "gzip",
    contentLength: gz.length,
    compressedCap: 10_000,
    // Cap baca 1.000.000 (bukan PAGE_DECODED_CAP 400.000): fixture 500.000 B
    // memang MELEWATI page cap menurut desain — pembuktian di sini adalah
    // separasi L0/L1 (wire 520 B vs decoded 500.000 B), bukan page cap.
    // Trip decoded-cap 400.000 dibuktikan pada pengulangan di bawah.
    decompressedCap: 1_000_000,
    budget: freshBudget(),
    signal: neverSignal(),
  });
  ok(r.wireBytes === gz.length, `wireBytes ${r.wireBytes} != ${gz.length}`);
  ok(r.decodedBytes === 500_000, `decodedBytes ${r.decodedBytes} != 500000`);
  ok(r.text === text, "teks hasil dekompresi tidak sama dengan aslinya");
  ok(r.text.length === 500_000, `panjang teks ${r.text.length} != 500000`);
  console.log(`  L0/L1: wireBytes=${r.wireBytes}, decodedBytes=${r.decodedBytes} (L0 != L1, terpisah)`);

  // Ulangi dengan decodedCap 400.000 -> CapError decoded-cap, TANPA teks parsial.
  let threw: unknown = null;
  try {
    await readCappedStream(oneChunk(gz), {
      contentEncoding: "gzip",
      contentLength: gz.length,
      compressedCap: 10_000,
      decompressedCap: 400_000,
      budget: freshBudget(),
      signal: neverSignal(),
    });
  } catch (e) {
    threw = e;
  }
  ok(threw instanceof CapError, `harapkan CapError, dapat ${String(threw)}`);
  ok((threw as CapError).code === "decoded-cap", `code ${(threw as CapError).code} != decoded-cap`);
  // throw = tidak ada nilai balik sama sekali, jadi tidak ada teks parsial.
});

// ===========================================================================
// H-RES-02 — Wire cap abort (L0)
// ===========================================================================
await test("H-RES-02", async () => {
  // (a) Sesuai spesifikasi: plain 500.000 B, compressedCap 400.000.
  const src500k = chunkedStream(500_000, 65_536);
  let threw: unknown = null;
  try {
    await readCappedStream(src500k, {
      contentEncoding: "identity",
      contentLength: 500_000,
      compressedCap: 400_000,
      decompressedCap: 1_000_000,
      budget: freshBudget(),
      signal: neverSignal(),
    });
  } catch (e) {
    threw = e;
  }
  ok(threw instanceof CapError, `harapkan CapError, dapat ${String(threw)}`);
  ok((threw as CapError).code === "wire-cap", `code ${(threw as CapError).code} != wire-cap`);
  ok(src500k.destroyed, "stream sumber TIDAK destroyed setelah wire-cap");

  // (b) Bukti pembacaan berhenti lebih awal: stream 2.000.000 B, cap 400.000 —
  // sumber harus berhenti jauh sebelum 2 MB (stream buffering membuat 500 kB
  // penuh sempat masuk buffer sebelum error merambat, jadi varian 2 MB yang
  // membuktikan early-stop secara observabel).
  let pushed = 0;
  const src2M = new Readable({
    read() {
      if (pushed >= 2_000_000) {
        this.push(null);
        return;
      }
      const n = Math.min(65_536, 2_000_000 - pushed);
      pushed += n;
      this.push(Buffer.alloc(n, 0x78));
    },
  });
  threw = null;
  try {
    await readCappedStream(src2M, {
      contentEncoding: "identity",
      contentLength: 2_000_000,
      compressedCap: 400_000,
      decompressedCap: 5_000_000,
      budget: freshBudget(),
      signal: neverSignal(),
    });
  } catch (e) {
    threw = e;
  }
  ok(threw instanceof CapError && (threw as CapError).code === "wire-cap", "varian 2MB harus wire-cap");
  await new Promise((r) => setTimeout(r, 200));
  ok(src2M.destroyed, "stream 2MB TIDAK destroyed setelah wire-cap");
  ok(pushed <= 600_000, `sumber terus dibaca setelah cap: pushed=${pushed} (batas 600.000)`);
  console.log(`  early-stop: pushed=${pushed} dari 2.000.000 B, destroyed=${src2M.destroyed}`);
});

// ===========================================================================
// H-RES-07 (revisi) — Aggregate cap: 1 budget, page 400k + 3 script 300k
// ===========================================================================
await test("H-RES-07", async () => {
  const budget = freshBudget(); // aggregate 1.000.000
  const reads: Array<{ label: string; size: number; cap: number }> = [
    { label: "page", size: 400_000, cap: PAGE_DECODED_CAP },
    { label: "script-1", size: 300_000, cap: SCRIPT_DECODED_CAP },
    { label: "script-2", size: 300_000, cap: SCRIPT_DECODED_CAP },
    { label: "script-3", size: 300_000, cap: SCRIPT_DECODED_CAP },
  ];
  let succeededDecoded = 0;
  let lastError: unknown = null;
  for (const r of reads) {
    try {
      const res = await readCappedStream(oneChunk(Buffer.alloc(r.size, 0x79)), {
        contentEncoding: "identity",
        contentLength: r.size,
        compressedCap: 2_000_000,
        decompressedCap: r.cap,
        budget,
        signal: neverSignal(),
      });
      ok(res.decodedBytes === r.size, `${r.label}: decodedBytes ${res.decodedBytes} != ${r.size}`);
      succeededDecoded += res.decodedBytes;
      console.log(`  ${r.label}: OK decoded=${res.decodedBytes}, budget.used=${budget.aggregateDecodedUsed}`);
    } catch (e) {
      lastError = e;
      console.log(`  ${r.label}: GAGAL (${e instanceof CapError ? e.code : String(e)}), budget.used=${budget.aggregateDecodedUsed}`);
      break;
    }
  }
  // Pembacaan ke-4 (script-3) harus gagal: 400k+300k+300k = 1.000.000 tepat.
  ok(lastError instanceof CapError, "pembacaan ke-4 harus throw CapError");
  ok(succeededDecoded === 1_000_000, `total decoded berhasil ${succeededDecoded} != 1.000.000`);
  ok(succeededDecoded <= AGGREGATE_DECODED_CAP, "total decoded berhasil melewati aggregate cap");
  ok(budget.aggregateDecodedUsed <= AGGREGATE_DECODED_CAP, "budget.used melewati aggregate cap");
  ok(budget.abort.signal.aborted, "budget tidak diabort setelah aggregate-cap");
  // CATATAN EVIDENCE: kode error yang muncul diamati "aborted", bukan
  // "aggregate-cap" (deterministik 10/10 pada probe /tmp/probe6-v2323.ts,
  // single-chunk maupun small-chunk). Mekanisme: tryReserve() meng-abort
  // budget BERSAMA sebelum transform memanggil balik error aggregate-cap,
  // sehingga pipeline merambat abort gabungan dan catch readCappedStream
  // memetakannya ke CapError "aborted". Invariant cap tetap terbukti
  // (throw + used tetap 1.000.000 + tidak ada teks parsial), tetapi
  // fidelitas kode error menyimpang dari spesifikasi tugas.
  ok((lastError as CapError).code === "aggregate-cap", `code ${(lastError as CapError).code} != aggregate-cap`);
});

// ===========================================================================
// H-RES-14 — tryReserve A1/A2
// ===========================================================================
await test("H-RES-14", async () => {
  // A1: reserve dalam budget.
  const b1 = freshBudget();
  ok(tryReserve(b1, 100) === true, "tryReserve(100) harus true");
  ok(b1.aggregateDecodedUsed === 100, `used ${b1.aggregateDecodedUsed} != 100`);
  // A1: reserve melebihi aggregate -> false + budget diabort.
  ok(tryReserve(b1, 999_901) === false, "tryReserve(999901) harus false (100+999901 > 1.000.000)");
  ok(b1.abort.signal.aborted, "budget harus diabort setelah reserve gagal");
  ok(b1.aggregateDecodedUsed === 100, `used berubah setelah reserve gagal: ${b1.aggregateDecodedUsed}`);
  ok(tryReserve(b1, 1) === false, "tryReserve setelah abort harus false");

  // A2: dua reader paralel pada SATU budget (simulasi race) — total A1
  // tidak pernah melewati aggregate cap.
  const b2 = freshBudget(500_000);
  const mk = () => chunkedStream(500_000, 20_000);
  const results = await Promise.allSettled([
    readCappedStream(mk(), {
      contentEncoding: "identity", contentLength: 500_000,
      compressedCap: 2_000_000, decompressedCap: 500_000,
      budget: b2, signal: neverSignal(),
    }),
    readCappedStream(mk(), {
      contentEncoding: "identity", contentLength: 500_000,
      compressedCap: 2_000_000, decompressedCap: 500_000,
      budget: b2, signal: neverSignal(),
    }),
  ]);
  const rejected = results.filter((r) => r.status === "rejected");
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  console.log(`  race: fulfilled=${fulfilled.length}, rejected=${rejected.length}, budget.used=${b2.aggregateDecodedUsed}`);
  for (const r of rejected) {
    if (r.status === "rejected") {
      console.log(`    rejected: ${r.reason instanceof CapError ? r.reason.code : String(r.reason)}`);
    }
  }
  ok(b2.aggregateDecodedUsed <= 500_000, `A1 melewati cap: used=${b2.aggregateDecodedUsed} > 500.000`);
  ok(rejected.length >= 1, "race: diharapkan >=1 reader ditolak (cap 500k, 2x500k)");
  ok(
    rejected.some(
      (r) => r.status === "rejected" && r.reason instanceof CapError &&
        (r.reason.code === "aggregate-cap" || r.reason.code === "aborted"),
    ),
    "race: tidak ada penolakan aggregate-cap/aborted",
  );
  let okDecoded = 0;
  for (const r of fulfilled) {
    if (r.status === "fulfilled") okDecoded += r.value.decodedBytes;
  }
  ok(okDecoded <= 500_000, `decoded dari reader sukses ${okDecoded} > cap 500.000`);
});

// ===========================================================================
// H-RES-05 — Encoding
// ===========================================================================
await test("H-RES-05a-gzip-bomb", async () => {
  const bomb = gzipSync(Buffer.from("A".repeat(2_000_000), "utf-8"));
  ok(bomb.length < 10_000, `gzip bomb wire ${bomb.length} B terlalu besar untuk disebut bomb`);
  let threw: unknown = null;
  try {
    await readCappedStream(oneChunk(bomb), {
      contentEncoding: "gzip",
      contentLength: bomb.length,
      compressedCap: 100_000,
      decompressedCap: PAGE_DECODED_CAP,
      budget: freshBudget(),
      signal: neverSignal(),
    });
  } catch (e) {
    threw = e;
  }
  ok(threw instanceof CapError, `gzip bomb harus throw, dapat ${String(threw)}`);
  ok((threw as CapError).code === "decoded-cap", `gzip bomb code ${(threw as CapError).code} != decoded-cap`);
  console.log(`  gzip bomb: wire=${bomb.length} B -> decoded>1MB, ditolak decoded-cap`);
});

await test("H-RES-05b-deflate-ok", async () => {
  const text = "0123456789abcdef".repeat(6_250); // 16 x 6250 = 100.000 char
  const comp = deflateSync(Buffer.from(text, "utf-8"));
  const r = await readCappedStream(oneChunk(comp), {
    contentEncoding: "deflate",
    contentLength: comp.length,
    compressedCap: 100_000,
    decompressedCap: PAGE_DECODED_CAP,
    budget: freshBudget(),
    signal: neverSignal(),
  });
  ok(r.text === text, "teks deflate tidak sama");
  ok(r.decodedBytes === 100_000, `decodedBytes ${r.decodedBytes} != 100000`);
});

await test("H-RES-05c-brotli-ok", async () => {
  const text = "Hello brotli! ".repeat(6_250); // 87.500 char
  const comp = brotliCompressSync(Buffer.from(text, "utf-8"));
  const r = await readCappedStream(oneChunk(comp), {
    contentEncoding: "br",
    contentLength: comp.length,
    compressedCap: 100_000,
    decompressedCap: PAGE_DECODED_CAP,
    budget: freshBudget(),
    signal: neverSignal(),
  });
  ok(r.text === text, "teks brotli tidak sama");
  ok(r.decodedBytes === text.length, `decodedBytes ${r.decodedBytes} != ${text.length}`);
});

await test("H-RES-05d-unknown-encoding", async () => {
  const { stream, wasRead } = flagStream(Buffer.from("x".repeat(100)));
  let threw: unknown = null;
  try {
    await readCappedStream(stream, {
      contentEncoding: "zstd",
      contentLength: 100,
      compressedCap: 100_000,
      decompressedCap: PAGE_DECODED_CAP,
      budget: freshBudget(),
      signal: neverSignal(),
    });
  } catch (e) {
    threw = e;
  }
  ok(threw instanceof CapError, `zstd harus throw, dapat ${String(threw)}`);
  ok((threw as CapError).code === "unsupported-encoding", `code ${(threw as CapError).code} != unsupported-encoding`);
  ok(!wasRead(), "body SUDAH dibaca sebelum penolakan zstd (harus ditolak sebelum baca)");
});

await test("H-RES-05e-multiple-encoding", async () => {
  const { stream, wasRead } = flagStream(Buffer.from("x".repeat(100)));
  let threw: unknown = null;
  try {
    await readCappedStream(stream, {
      contentEncoding: "gzip, br",
      contentLength: 100,
      compressedCap: 100_000,
      decompressedCap: PAGE_DECODED_CAP,
      budget: freshBudget(),
      signal: neverSignal(),
    });
  } catch (e) {
    threw = e;
  }
  ok(threw instanceof CapError, `gzip, br harus throw, dapat ${String(threw)}`);
  ok((threw as CapError).code === "unsupported-encoding", `code ${(threw as CapError).code} != unsupported-encoding`);
  ok(!wasRead(), "body SUDAH dibaca sebelum penolakan multiple-encoding");
});

await test("H-RES-05f-corrupt-gzip", async () => {
  const text = "A".repeat(500_000);
  const gz = gzipSync(Buffer.from(text, "utf-8"));
  const corrupt = Buffer.from(gz);
  corrupt[Math.floor(corrupt.length / 2)] ^= 0xff; // byte rusak di tengah
  let threw: unknown = null;
  try {
    await readCappedStream(oneChunk(corrupt), {
      contentEncoding: "gzip",
      contentLength: corrupt.length,
      compressedCap: 10_000,
      // Cap besar agar dekompresi mencapai byte rusak (bukan decoded-cap dulu).
      decompressedCap: 1_000_000,
      budget: freshBudget(),
      signal: neverSignal(),
    });
  } catch (e) {
    threw = e;
  }
  ok(threw instanceof CapError, `corrupt gzip harus throw, dapat ${String(threw)}`);
  ok((threw as CapError).code === "decompression-failed", `code ${(threw as CapError).code} != decompression-failed`);
  // Fail-closed: throw berarti tidak ada teks (parsial) yang dikembalikan.
});

await test("H-RES-05g-content-length-cap", async () => {
  const { stream, wasRead } = flagStream(Buffer.from("x".repeat(100)));
  let threw: unknown = null;
  try {
    await readCappedStream(stream, {
      contentEncoding: "identity",
      contentLength: 500_001, // > decompressedCap 400.000
      compressedCap: 1_000_000,
      decompressedCap: PAGE_DECODED_CAP,
      budget: freshBudget(),
      signal: neverSignal(),
    });
  } catch (e) {
    threw = e;
  }
  ok(threw instanceof CapError, `Content-Length > cap harus throw, dapat ${String(threw)}`);
  ok((threw as CapError).code === "content-length-cap", `code ${(threw as CapError).code} != content-length-cap`);
  ok(!wasRead(), "body SUDAH dibaca sebelum penolakan content-length-cap");
});

// ===========================================================================
// H-RES-06 — Deadline / abort propagation (signal pendek)
// ===========================================================================
await test("H-RES-06a-deadline-constant", async () => {
  ok(TOTAL_DEADLINE_MS === 20_000, `TOTAL_DEADLINE_MS ${TOTAL_DEADLINE_MS} != 20_000`);
});

await test("H-RES-06b-slow-drip-abort-500ms", async () => {
  const drip = dripStream(2000); // 1 chunk kecil tiap 2 detik, tak pernah selesai
  const t0 = Date.now();
  let threw: unknown = null;
  try {
    await readCappedStream(drip, {
      contentEncoding: "identity",
      contentLength: null,
      compressedCap: 1_000_000,
      decompressedCap: 1_000_000,
      budget: freshBudget(),
      signal: AbortSignal.timeout(500),
    });
  } catch (e) {
    threw = e;
  }
  const elapsed = Date.now() - t0;
  ok(threw instanceof CapError, `slow-drip harus throw, dapat ${String(threw)}`);
  ok((threw as CapError).code === "aborted", `code ${(threw as CapError).code} != aborted`);
  ok(elapsed >= 400 && elapsed < 2_000, `abort dalam ${elapsed} ms, bukan ~500 ms`);
  ok(drip.destroyed, "stream drip TIDAK destroyed setelah abort");
  console.log(`  abort dalam ${elapsed} ms (signal 500 ms, drip 2 detik/chunk)`);
});

// ===========================================================================
// H-RES-07-serial — Serial script timing: 3 read berurutan, bukan paralel
// ===========================================================================
await test("H-RES-07-serial", async () => {
  const budget = freshBudget();
  const order: string[] = [];
  const marks: Array<{ label: string; at: number }> = [];
  for (let i = 1; i <= 3; i++) {
    const label = `read-${i}`;
    const stream = new Readable({
      read() {
        order.push(`start-${label}`);
        marks.push({ label: `start-${label}`, at: Date.now() });
        this.push(Buffer.alloc(10_000, 0x61 + i));
        this.push(null);
        order.push(`end-${label}`);
        marks.push({ label: `end-${label}`, at: Date.now() });
      },
    });
    const r = await readCappedStream(stream, {
      contentEncoding: "identity",
      contentLength: 10_000,
      compressedCap: 100_000,
      decompressedCap: SCRIPT_DECODED_CAP,
      budget,
      signal: neverSignal(),
    });
    ok(r.decodedBytes === 10_000, `${label}: decodedBytes ${r.decodedBytes} != 10000`);
  }
  const expected = ["start-read-1", "end-read-1", "start-read-2", "end-read-2", "start-read-3", "end-read-3"];
  ok(JSON.stringify(order) === JSON.stringify(expected), `urutan chunk ${JSON.stringify(order)} != ${JSON.stringify(expected)}`);
  // Monotonik: read berikutnya mulai setelah read sebelumnya selesai.
  for (let i = 1; i < marks.length; i++) {
    ok(marks[i]!.at >= marks[i - 1]!.at, `timestamp tidak monotonik di ${marks[i]!.label}`);
  }
  ok(budget.aggregateDecodedUsed === 30_000, `budget.used ${budget.aggregateDecodedUsed} != 30000`);
});

// ===========================================================================
// H-RES-15 — End-to-end slow-drip dengan deadline total 20 detik
// (SATU-SATUNYA test lambat — ~20 detik.)
// ===========================================================================
await test("H-RES-15", async () => {
  const drip = dripStream(2000); // tidak pernah selesai
  const t0 = Date.now();
  let threw: unknown = null;
  try {
    await readCappedStream(drip, {
      contentEncoding: "identity",
      contentLength: null,
      compressedCap: 1_000_000,
      decompressedCap: 1_000_000,
      budget: freshBudget(),
      signal: AbortSignal.timeout(TOTAL_DEADLINE_MS),
    });
  } catch (e) {
    threw = e;
  }
  const elapsed = Date.now() - t0;
  ok(threw instanceof CapError, `H-RES-15 harus throw, dapat ${String(threw)}`);
  ok((threw as CapError).code === "aborted", `code ${(threw as CapError).code} != aborted`);
  ok(elapsed >= 19_000 && elapsed < 22_500, `abort total dalam ${elapsed} ms, bukan ~20.000 ms`);
  ok(drip.destroyed, "stream drip TIDAK destroyed setelah abort 20 detik");
  console.log(`  abort total dalam ${elapsed} ms (deadline TOTAL_DEADLINE_MS=20000)`);
});

finish();
