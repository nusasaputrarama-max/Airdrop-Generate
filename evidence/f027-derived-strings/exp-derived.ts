// F-027 VM experiment: derived-string copies vs the 1,000,000-byte L2 budget.
// Local-only, no network, no artifact, no checkLink. Run with Bun 1.3.10
// (canonical) and Bun 1.4.4 and compare. Part of SSRF design revision
// v2.3.14 (answer to audit V7, F-027).
//
// Simulates the CURRENT source pattern (site/server/src/actions.ts:520-533,
// read-only quote, no code executed from the artifact):
//   const scriptText = scriptTexts.join("\n");
//   const haystack = `${html}\n${scriptText}`;
//   const lower = haystack.toLowerCase();
// at the L2 boundary case: page 400,000 chars + 2 scripts x 300,000 chars
// = 1,000,000 accepted input chars (the maximum that reaches analysis
// under the v2.3.13 L2 rule; a third full script would abort the scan
// and its partial content is discarded, never analysed).
//
// Then simulates the DESIGN ALTERNATIVE (incremental / streaming scan):
// each segment is checked on its own, lowercased per segment, released
// before the next segment is processed; no join, no combined haystack,
// no combined lowercase copy.
//
// Measurement: heapUsed / RSS after Bun.gc(true) at each step. JS strings
// are UTF-16, so 1,000,000 ASCII chars need >= 2,000,000 bytes of string
// storage before any copy; the experiment measures what the copies add.

const PAGE_CHARS = 400_000;
const SCRIPT_CHARS = 300_000;

function gc() { try { (Bun as any).gc(true); } catch { /* no gc */ } }
function mem() {
  const m = process.memoryUsage();
  return { rss: m.rss, heapUsed: m.heapUsed, heapTotal: m.heapTotal, external: m.external };
}
function logStep(step: string, base: { heapUsed: number; rss: number }) {
  const m = mem();
  console.log(`${step}: heapUsed=${m.heapUsed} (+${m.heapUsed - base.heapUsed} vs baseline) rss=${m.rss} (+${m.rss - base.rss}) heapTotal=${m.heapTotal} external=${m.external}`);
}

console.log("bun version:", Bun.version);
console.log(`boundary case: page=${PAGE_CHARS} chars + 2 scripts x ${SCRIPT_CHARS} chars = ${PAGE_CHARS + 2 * SCRIPT_CHARS} accepted input chars (= L2 1,000,000)`);

// ---------- A. Current pattern: join + haystack + lower ----------
console.log("--- A. current pattern (join / haystack / lower) ---");
gc();
const baseA = mem();
console.log(`A0 baseline: heapUsed=${baseA.heapUsed} rss=${baseA.rss} heapTotal=${baseA.heapTotal}`);

// Build the accepted input. 'A' filler + a few real signal substrings so the
// checks below actually match (as they would on a malicious page).
let html = "A".repeat(PAGE_CHARS - 40) + "window.solana connect your wallet";
let scriptTexts = [
  "B".repeat(SCRIPT_CHARS - 20) + "window.ethereum",
  "C".repeat(SCRIPT_CHARS - 20) + "walletconnect",
];
gc();
logStep("A1 after html + scriptTexts created (accepted input as JS strings)", baseA);

const scriptText = scriptTexts.join("\n");
gc();
logStep("A2 after scriptTexts.join (scriptText copy)", baseA);

const haystack = `${html}\n${scriptText}`;
gc();
logStep("A3 after haystack template (html + scriptText copy)", baseA);

const lower = haystack.toLowerCase();
gc();
logStep("A4 after lower = haystack.toLowerCase() (third full copy)", baseA);

// Run the same checks the source runs (actions.ts:534-541).
const asksConnect =
  /connect\s*(your\s*)?wallet/i.test(haystack) ||
  lower.includes("window.solana") ||
  lower.includes("window.ethereum") ||
  lower.includes("walletconnect") ||
  lower.includes("eth_requestaccounts");
console.log("A5 checks ran, asksConnect =", asksConnect);
logStep("A5 after checks (all derived strings still live)", baseA);

// Live-string accounting at A5 (characters, UTF-16 => ~2 bytes/char):
const liveChars = html.length + scriptTexts[0].length + scriptTexts[1].length
  + scriptText.length + haystack.length + lower.length;
console.log(`A6 live string chars at peak analysis point: html=${html.length} + scripts=${scriptTexts[0].length + scriptTexts[1].length} + join=${scriptText.length} + haystack=${haystack.length} + lower=${lower.length} = ${liveChars} chars (~${liveChars * 2} bytes UTF-16, before engine overhead)`);
console.log(`A6 input accepted chars: ${PAGE_CHARS + 2 * SCRIPT_CHARS}; live chars / input chars ratio: ${(liveChars / (PAGE_CHARS + 2 * SCRIPT_CHARS)).toFixed(2)}x`);

// Release and measure residual.
html = "" as any; scriptTexts = [] as any;
gc();
logStep("A7 after releasing input refs (derived strings still live: scriptText/haystack/lower)", baseA);
{
  // @ts-ignore release derived strings too
  const _drop1 = scriptText; void _drop1;
}
gc();
console.log("A8 (note): scriptText/haystack/lower are const in this script and stay live until process exit; residual after full release is measured in part B baseline instead.");

// ---------- B. Design alternative: incremental per-segment scan ----------
console.log("--- B. incremental alternative (no join / no combined haystack / no combined lower) ---");
gc();
const baseB = mem();
console.log(`B0 baseline: heapUsed=${baseB.heapUsed} rss=${baseB.rss} heapTotal=${baseB.heapTotal}`);

let peakHeapB = baseB.heapUsed;
let peakRssB = baseB.rss;
function samplePeakB() {
  const m = mem();
  if (m.heapUsed > peakHeapB) peakHeapB = m.heapUsed;
  if (m.rss > peakRssB) peakRssB = m.rss;
}

// Same boundary input, generated one segment at a time (streaming model:
// the implementation would never hold all segments at once), processed,
// then released before the next segment is built.
function makeSegment(i: number): string {
  if (i === 0) return "A".repeat(PAGE_CHARS - 40) + "window.solana connect your wallet";
  if (i === 1) return "B".repeat(SCRIPT_CHARS - 20) + "window.ethereum";
  return "C".repeat(SCRIPT_CHARS - 20) + "walletconnect";
}
let foundB = false;
for (let i = 0; i < 3; i++) {
  let seg: string | null = makeSegment(i);
  const segLower = seg.toLowerCase(); // per-segment copy only; released each iteration
  foundB = foundB
    || /connect\s*(your\s*)?wallet/i.test(seg)
    || segLower.includes("window.solana")
    || segLower.includes("window.ethereum")
    || segLower.includes("walletconnect")
    || segLower.includes("eth_requestaccounts");
  samplePeakB();
  // Release this segment's strings before the next one is built.
  seg = null;
  gc();
  samplePeakB();
}
console.log("B1 checks ran, asksConnect =", foundB);
logStep("B2 after incremental scan (all segments released)", baseB);
console.log(`B3 peak heapUsed during incremental scan: ${peakHeapB} (+${peakHeapB - baseB.heapUsed} vs baseline); peak rss: ${peakRssB} (+${peakRssB - baseB.rss} vs baseline)`);
console.log(`B4 comparison: current-pattern peak heap delta (A4-A0) vs incremental peak heap delta (B3-B0) — see numbers above; both measured from a post-GC baseline on the same runtime.`);
console.log("done");
