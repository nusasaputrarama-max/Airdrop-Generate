// F-026 VM experiment: chunk sizes, in-flight behaviour, peak memory on Bun.
// Local-only: server + client both on 127.0.0.1. No external network, no
// artifact, no checkLink. Run with Bun 1.3.10 (canonical) and Bun 1.4.4 and
// compare. Part of SSRF design revision v2.3.14 (answer to audit V7, F-026).
//
// What is measured:
//  - chunk sizes actually delivered by reader.read() (max / first / count)
//  - accepted bytes under pre-append accounting (cap per request + shared L2)
//  - transient chunk bytes: a chunk is already allocated when read() resolves,
//    BEFORE the application can check its length (F-026 core point)
//  - peak RSS / heapUsed during each probe (high-water, sampled per chunk)
//
// What is NOT measured (honest limitation):
//  - bytes buffered inside the runtime/network stack before read() resolves
//    are not observable from JS; only RSS/heap deltas can hint at them.
//  - per-reader "held" accounting is synchronous, so at most one chunk per
//    reader is held at any instant in this simulation; the RSS peak is the
//    empirical check for whether parallel chunks coexist in memory.

const PAGE_CAP = 400_000;
const SCRIPT_CAP = 300_000;
const L2_BUDGET = 1_000_000;

const plain500k = Buffer.alloc(500_000, 0x41); // 'A' * 500000
const plain1m = Buffer.alloc(1_000_000, 0x41);

function stream64kBody(): ReadableStream<Uint8Array> {
  const CHUNK = 65_536;
  const total = 500_000;
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= total) { controller.close(); return; }
      const n = Math.min(CHUNK, total - sent);
      controller.enqueue(new Uint8Array(n).fill(0x42));
      sent += n;
    },
  });
}

const server = Bun.serve({
  port: 0,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/plain500k") {
      return new Response(plain500k, { headers: { "content-type": "text/plain", "content-length": "500000" } });
    }
    if (url.pathname === "/plain1m") {
      return new Response(plain1m, { headers: { "content-type": "text/plain", "content-length": "1000000" } });
    }
    if (url.pathname === "/stream64k") {
      return new Response(stream64kBody(), { headers: { "content-type": "text/plain" } });
    }
    return new Response("nf", { status: 404 });
  },
});
const base = `http://127.0.0.1:${server.port}`;
console.log("bun version:", Bun.version);
console.log("listening:", base);

// ---- memory sampling ----
let peakRss = 0, peakHeap = 0, peakExt = 0;
function gc() { try { (Bun as any).gc(true); } catch { /* no gc */ } }
function sample() {
  const m = process.memoryUsage();
  if (m.rss > peakRss) peakRss = m.rss;
  if (m.heapUsed > peakHeap) peakHeap = m.heapUsed;
  if (m.external > peakExt) peakExt = m.external;
}
function resetPeak() { peakRss = 0; peakHeap = 0; peakExt = 0; }
function memLine(prefix: string) {
  const m = process.memoryUsage();
  console.log(`${prefix} rss=${m.rss} heapUsed=${m.heapUsed} heapTotal=${m.heapTotal} external=${m.external} | peak rss=${peakRss} heapUsed=${peakHeap} external=${peakExt}`);
}

// Shared-budget reader with pre-append accounting (the v2.3.13 design rule).
// shared: { used, aborted, controller } or null for per-request-only probes.
async function readCapped(
  label: string,
  path: string,
  cap: number,
  shared: { used: number; controller: AbortController } | null,
  held: number[],
  heldIdx: number,
): Promise<{ accepted: number; chunks: number; maxChunk: number; firstChunk: number; chunkSizes: number[]; abortedByBudget: boolean }> {
  let res: Response;
  try {
    res = await fetch(base + path, shared ? { signal: shared.controller.signal } : undefined);
  } catch {
    // Shared abort fired before this fetch even started (another reader
    // already exceeded its cap / the shared budget). No chunk was delivered
    // to this reader; nothing was accepted. This is itself an observation:
    // a shared abort can cancel sibling fetches before their first chunk.
    console.log(`${label}: fetch aborted before first chunk (shared abort already fired)`);
    return { accepted: 0, chunks: 0, maxChunk: 0, firstChunk: 0, chunkSizes: [], abortedByBudget: true };
  }
  const reader = res.body!.getReader();
  let accepted = 0;
  const chunkSizes: number[] = [];
  let abortedByBudget = false;
  while (true) {
    let r;
    try {
      r = await reader.read();
    } catch {
      abortedByBudget = true;
      break;
    }
    if (r.done) break;
    const len = r.value.length;
    held[heldIdx] = len; // chunk is held (allocated) from this instant
    sample();
    chunkSizes.push(len);
    // Pre-append check: accept only if it fits BOTH the per-request cap
    // and (when present) the shared L2 budget. Otherwise abort, discard.
    const overCap = accepted + len > cap;
    const overL2 = shared !== null && shared.used + len > L2_BUDGET;
    if (overCap || overL2) {
      if (shared) shared.controller.abort();
      abortedByBudget = true;
      held[heldIdx] = 0;
      try { await reader.cancel(); } catch { /* ignore */ }
      break;
    }
    accepted += len;
    if (shared) shared.used += len;
    held[heldIdx] = 0; // consumed (appended to accumulator in the real design)
    sample();
  }
  const maxChunk = chunkSizes.length ? Math.max(...chunkSizes) : 0;
  console.log(`${label}: chunks=${chunkSizes.length} firstChunk=${chunkSizes[0] ?? 0} maxChunk=${maxChunk} accepted=${accepted} abortedByBudget=${abortedByBudget} chunkSizes=[${chunkSizes.join(",")}]`);
  return { accepted, chunks: chunkSizes.length, maxChunk, firstChunk: chunkSizes[0] ?? 0, chunkSizes, abortedByBudget };
}

// ---- P1: single fetch, script cap 300_000 ----
console.log("--- P1 single /plain500k cap=300000 (script cap) ---");
gc(); resetPeak(); sample();
{
  const held = [0];
  const r = await readCapped("P1", "/plain500k", SCRIPT_CAP, null, held, 0);
  console.log("P1 transient-first-chunk bytes (allocated before any check):", r.firstChunk);
  console.log("P1 accepted bytes:", r.accepted, "| first chunk exceeded cap by:", r.firstChunk - SCRIPT_CAP);
}
memLine("P1 after:");

// ---- P2: three parallel fetches, script cap each + shared L2 ----
console.log("--- P2 three parallel /plain500k cap=300000 each, shared L2=1000000 ---");
gc(); resetPeak(); sample();
{
  const shared = { used: 0, controller: new AbortController() };
  const held = [0, 0, 0];
  const results = await Promise.all([
    readCapped("P2-r0", "/plain500k", SCRIPT_CAP, shared, held, 0),
    readCapped("P2-r1", "/plain500k", SCRIPT_CAP, shared, held, 1),
    readCapped("P2-r2", "/plain500k", SCRIPT_CAP, shared, held, 2),
  ]);
  const totalAccepted = results.reduce((a, r) => a + r.accepted, 0);
  const sumFirstChunks = results.reduce((a, r) => a + r.firstChunk, 0);
  const maxChunk = Math.max(...results.map((r) => r.maxChunk));
  console.log("P2 total accepted bytes:", totalAccepted, "| shared L2 used:", shared.used);
  console.log("P2 sum of first chunks (each allocated before its own check):", sumFirstChunks);
  console.log("P2 max single chunk:", maxChunk);
}
memLine("P2 after:");

// ---- P2b: three parallel /stream64k (small server chunks), shared L2 ----
console.log("--- P2b three parallel /stream64k cap=300000 each, shared L2=1000000 ---");
gc(); resetPeak(); sample();
{
  const shared = { used: 0, controller: new AbortController() };
  const held = [0, 0, 0];
  const results = await Promise.all([
    readCapped("P2b-r0", "/stream64k", SCRIPT_CAP, shared, held, 0),
    readCapped("P2b-r1", "/stream64k", SCRIPT_CAP, shared, held, 1),
    readCapped("P2b-r2", "/stream64k", SCRIPT_CAP, shared, held, 2),
  ]);
  const totalAccepted = results.reduce((a, r) => a + r.accepted, 0);
  console.log("P2b total accepted bytes:", totalAccepted, "| shared L2 used:", shared.used);
  console.log("P2b max single chunk:", Math.max(...results.map((r) => r.maxChunk)));
}
memLine("P2b after:");

// ---- P3: sequential /plain1m, page cap 400_000 ----
console.log("--- P3 single /plain1m cap=400000 (page cap) ---");
gc(); resetPeak(); sample();
{
  const held = [0];
  const r = await readCapped("P3", "/plain1m", PAGE_CAP, null, held, 0);
  console.log("P3 transient-first-chunk bytes:", r.firstChunk, "| accepted:", r.accepted);
}
memLine("P3 after:");

// ---- P4: single /stream64k, script cap 300_000 (accepted-chunk behaviour) ----
console.log("--- P4 single /stream64k cap=300000 ---");
gc(); resetPeak(); sample();
{
  const held = [0];
  const r = await readCapped("P4", "/stream64k", SCRIPT_CAP, null, held, 0);
  console.log("P4 accepted bytes (must be <= 300000):", r.accepted);
}
memLine("P4 after:");

server.stop(true);
console.log("done");
