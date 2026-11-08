// F-029 VM experiment: ONE pattern per process (child of run-f029.ts).
// Fixes the F-027 methodology flaw found by audit V8 (F-029): in v2.3.14
// exp-derived.ts, pattern A and pattern B ran sequentially in ONE process
// and A's derived strings stayed live when B's baseline was taken, so the
// A-vs-B comparison was not valid. Here each pattern runs in its OWN
// process (new PID, clean baseline), and the OS high-water mark (VmHWM
// from /proc/self/status) is the primary memory metric — not a
// post-GC process.memoryUsage() checkpoint.
//
// Usage (spawned by the parent harness run-f029.ts, same Bun binary):
//   bun exp-pattern.ts --pattern A|B --fixture ascii|nonascii --gc forced|natural
//
// Local-only, no network, no artifact, no checkLink. Simulates the
// CURRENT source pattern (site/server/src/actions.ts:520-533, read-only
// quote) at the L2 boundary case: page 400,000 chars + 2 scripts x
// 300,000 chars = 1,000,000 accepted input chars. Pattern B is the
// DESIGN ALTERNATIVE (incremental / streaming scan): each segment is
// checked on its own, lowercased per segment, released before the next
// segment is built; no join, no combined haystack, no combined lower.
//
// Fixtures:
//   ascii    — 'A'/'B'/'C' filler (1 byte/char UTF-8, 1 UTF-16 code unit)
//   nonascii — U+00E9 filler (2 bytes/char UTF-8, 1 UTF-16 code unit);
//              same char counts as ascii, so the UTF-8 byte total is
//              ~2,000,000 — it tests UTF-16 string-storage cost at the
//              char-count boundary, NOT the L2 byte boundary.
//   nonascii-bytes — U+00E9 filler at HALF the char counts
//              (page 200,000 + 2 scripts x 150,000 = 500,000 chars),
//              so the UTF-8 byte total is 1,000,000 = the L2 byte
//              boundary. Signal substrings stay ASCII in all fixtures
//              so detection behaviour is identical.
//
// GC modes (reported separately, never mixed):
//   forced  — Bun.gc(true) at every measurement point
//   natural — no explicit GC; the engine collects on its own schedule

import { readFileSync } from "node:fs";

// Char counts are set AFTER parsing args: the nonascii-bytes fixture
// halves the char counts so the UTF-8 byte total still equals the L2
// boundary (1,000,000 bytes) — see parseArgs below.
let PAGE_CHARS = 400_000;
let SCRIPT_CHARS = 300_000;

function parseArgs(): { pattern: string; fixture: string; gc: string } {
  const a = process.argv.slice(2);
  const get = (k: string) => {
    const i = a.indexOf(k);
    return i >= 0 && i + 1 < a.length ? a[i + 1] : "";
  };
  return { pattern: get("--pattern"), fixture: get("--fixture"), gc: get("--gc") };
}
const { pattern, fixture, gc } = parseArgs();
if (pattern !== "A" && pattern !== "B") throw new Error("pattern must be A or B");
if (fixture !== "ascii" && fixture !== "nonascii" && fixture !== "nonascii-bytes") throw new Error("fixture must be ascii, nonascii, or nonascii-bytes");
if (gc !== "forced" && gc !== "natural") throw new Error("gc must be forced or natural");

// nonascii-bytes: same L2 byte boundary (1,000,000 UTF-8 bytes) with
// U+00E9 filler (2 bytes/char) => half the chars: page 200,000 +
// 2 scripts x 150,000 = 500,000 chars = 1,000,000 UTF-8 bytes.
if (fixture === "nonascii-bytes") {
  PAGE_CHARS = 200_000;
  SCRIPT_CHARS = 150_000;
}

const FILLER = fixture === "ascii" ? { p: "A", s1: "B", s2: "C" } : { p: "é", s1: "é", s2: "é" };

function doGc() {
  if (gc === "forced") {
    try { (Bun as any).gc(true); } catch { /* no gc */ }
  }
}

// VmHWM: OS high-water mark of resident memory for this process (kB in
// /proc/self/status). Monotonic since process start, so it captures every
// transient peak between checkpoints — unlike a post-GC RSS checkpoint.
function vmHwmBytes(): number | null {
  try {
    const status = readFileSync("/proc/self/status", "utf8");
    const m = status.match(/^VmHWM:\s+(\d+)\s+kB$/m);
    return m ? Number(m[1]) * 1024 : null;
  } catch {
    return null;
  }
}

function snap() {
  const m = process.memoryUsage();
  return {
    rss: m.rss,
    heapUsed: m.heapUsed,
    heapTotal: m.heapTotal,
    external: m.external,
    vmHwm: vmHwmBytes(),
  };
}

const pid = process.pid;
console.log(`child pid=${pid} bun=${Bun.version} pattern=${pattern} fixture=${fixture} gc=${gc}`);
console.log(`input: page=${PAGE_CHARS} chars + 2 scripts x ${SCRIPT_CHARS} chars = ${PAGE_CHARS + 2 * SCRIPT_CHARS} accepted input chars`);

doGc();
const base = snap();
console.log(`baseline: rss=${base.rss} heapUsed=${base.heapUsed} heapTotal=${base.heapTotal} external=${base.external} vmHwm=${base.vmHwm}`);

let found = false;
let liveChars = 0;

if (pattern === "A") {
  // Current pattern: join + haystack + lower, all live at analysis time.
  let html = FILLER.p.repeat(PAGE_CHARS - 40) + "window.solana connect your wallet";
  let scriptTexts = [
    FILLER.s1.repeat(SCRIPT_CHARS - 20) + "window.ethereum",
    FILLER.s2.repeat(SCRIPT_CHARS - 20) + "walletconnect",
  ];
  doGc();
  const a1 = snap();
  console.log(`A1 after html + scriptTexts: rss=${a1.rss} (+${a1.rss - base.rss}) heapUsed=${a1.heapUsed} (+${a1.heapUsed - base.heapUsed}) external=${a1.external} vmHwm=${a1.vmHwm}`);

  const scriptText = scriptTexts.join("\n");
  doGc();
  const a2 = snap();
  console.log(`A2 after join: rss=${a2.rss} (+${a2.rss - base.rss}) heapUsed=${a2.heapUsed} (+${a2.heapUsed - base.heapUsed}) external=${a2.external} vmHwm=${a2.vmHwm}`);

  const haystack = `${html}\n${scriptText}`;
  doGc();
  const a3 = snap();
  console.log(`A3 after haystack: rss=${a3.rss} (+${a3.rss - base.rss}) heapUsed=${a3.heapUsed} (+${a3.heapUsed - base.heapUsed}) external=${a3.external} vmHwm=${a3.vmHwm}`);

  const lower = haystack.toLowerCase();
  doGc();
  const a4 = snap();
  console.log(`A4 after lower: rss=${a4.rss} (+${a4.rss - base.rss}) heapUsed=${a4.heapUsed} (+${a4.heapUsed - base.heapUsed}) external=${a4.external} vmHwm=${a4.vmHwm}`);

  found =
    /connect\s*(your\s*)?wallet/i.test(haystack) ||
    lower.includes("window.solana") ||
    lower.includes("window.ethereum") ||
    lower.includes("walletconnect") ||
    lower.includes("eth_requestaccounts");
  liveChars = html.length + scriptTexts[0].length + scriptTexts[1].length
    + scriptText.length + haystack.length + lower.length;
  console.log(`A5 checks ran, asksConnect=${found}`);
  console.log(`A6 live string chars at peak analysis point: ${liveChars} (input ${PAGE_CHARS + 2 * SCRIPT_CHARS}; ratio ${(liveChars / (PAGE_CHARS + 2 * SCRIPT_CHARS)).toFixed(2)}x)`);
} else {
  // Design alternative: incremental per-segment scan.
  function makeSegment(i: number): string {
    if (i === 0) return FILLER.p.repeat(PAGE_CHARS - 40) + "window.solana connect your wallet";
    if (i === 1) return FILLER.s1.repeat(SCRIPT_CHARS - 20) + "window.ethereum";
    return FILLER.s2.repeat(SCRIPT_CHARS - 20) + "walletconnect";
  }
  let peakRss = base.rss;
  let peakHeap = base.heapUsed;
  for (let i = 0; i < 3; i++) {
    let seg: string | null = makeSegment(i);
    const segLower = seg.toLowerCase();
    found = found
      || /connect\s*(your\s*)?wallet/i.test(seg)
      || segLower.includes("window.solana")
      || segLower.includes("window.ethereum")
      || segLower.includes("walletconnect")
      || segLower.includes("eth_requestaccounts");
    const s = snap();
    if (s.rss > peakRss) peakRss = s.rss;
    if (s.heapUsed > peakHeap) peakHeap = s.heapUsed;
    seg = null;
    doGc();
    const s2 = snap();
    if (s2.rss > peakRss) peakRss = s2.rss;
    if (s2.heapUsed > peakHeap) peakHeap = s2.heapUsed;
  }
  console.log(`B1 checks ran, asksConnect=${found}`);
  console.log(`B2 peak rss during incremental scan: ${peakRss} (+${peakRss - base.rss} vs baseline); peak heapUsed: ${peakHeap} (+${peakHeap - base.heapUsed} vs baseline)`);
}

doGc();
const fin = snap();
console.log(`final: rss=${fin.rss} (+${fin.rss - base.rss}) heapUsed=${fin.heapUsed} (+${fin.heapUsed - base.heapUsed}) heapTotal=${fin.heapTotal} external=${fin.external} (+${fin.external - base.external}) vmHwm=${fin.vmHwm} (+${fin.vmHwm !== null && base.vmHwm !== null ? fin.vmHwm - base.vmHwm : "n/a"} vs baseline vmHwm)`);

// Machine-readable result line for the parent harness.
const result = {
  pid,
  bun: Bun.version,
  pattern,
  fixture,
  gc,
  inputChars: PAGE_CHARS + 2 * SCRIPT_CHARS,
  utf8BytesApprox: fixture === "ascii" ? PAGE_CHARS + 2 * SCRIPT_CHARS : (PAGE_CHARS + 2 * SCRIPT_CHARS) * 2,
  asksConnect: found,
  liveChars: pattern === "A" ? liveChars : null,
  baseline: base,
  final: fin,
  vmHwmDelta: fin.vmHwm !== null && base.vmHwm !== null ? fin.vmHwm - base.vmHwm : null,
  rssDelta: fin.rss - base.rss,
  heapUsedDelta: fin.heapUsed - base.heapUsed,
  externalDelta: fin.external - base.external,
};
console.log("RESULT " + JSON.stringify(result));
console.log("done");
