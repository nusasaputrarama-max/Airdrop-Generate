// F-029 VM experiment (v2.3.17, F-033 fix): ONE pattern per process
// (child of run-f029.ts).
// Fixes the F-027 methodology flaw found by audit V8 (F-029): in v2.3.14
// exp-derived.ts, pattern A and pattern B ran sequentially in ONE process
// and A's derived strings stayed live when B's baseline was taken, so the
// A-vs-B comparison was not valid. Here each pattern runs in its OWN
// process (new PID, clean baseline), and the OS high-water mark (VmHWM
// from /proc/self/status) is the primary memory metric — not a
// post-GC process.memoryUsage() checkpoint.
//
// v2.3.16 fix (F-031, audit V9): the v2.3.15 fixture was NOT exactly
// 1,000,000 bytes. This version measured every segment with
// TextEncoder and asserted the byte total before scanning — but that
// fix itself introduced F-033 (audit V10).
//
// v2.3.17 fix (F-033, audit V10): the v2.3.16 child called
// TextEncoder.encode(segment) INSIDE the measured phase, allocating
// a transient Uint8Array up to one segment (<= 400,000 bytes) per
// segment — and pattern A built three segments before its first GC
// while pattern B GC'd after every segment, so the encoder overhead
// hit the two patterns asymmetrically while VmHWM (monotonic) kept
// every transient peak. The v2.3.16 ratio 1,13-1,84x is therefore
// SUPERSEDED: it was measured with a confounded instrument and must
// NOT be used for sizing/cgroup/acceptance. This version removes
// TextEncoder from the measured process ENTIRELY:
//   - byte counts are computed ARITHMETICALLY from known filler /
//     marker byte widths (fixture.ts — no encoder, no full-segment
//     Uint8Array, identical code path for A and B);
//   - the INDEPENDENT byte proof is preflight-fixture.ts, a
//     SEPARATE process run by the parent harness BEFORE any measured
//     child spawns; it measures the same segments with TextEncoder
//     and asserts exact per-segment/total bytes (cap-1/cap/cap+1).
//     Its allocations can never touch a measured child's VmHWM.
//   - the RESULT line carries encoderInMeasuredPhase=false so the
//     parent harness can assert it on every run.
// Fixed pre-baseline overhead (documented, identical for A/B):
// module import only; the baseline snapshot is taken after imports,
// before any segment is built — so import cost is inside the
// baseline, not inside the delta.
//
// Pattern B lifecycle (F-033 mitigation, audit V10 §5): the
// one-segment scan now lives in scanSegment(), a helper with a
// CLOSED scope. It returns only { found, bytes, chars }; the
// segment string and its lowercase copy go out of scope when the
// helper returns, and the caller runs doGc() ONLY after the
// return — so no segment reference is live across a forced-GC
// checkpoint or into the next segment's build. Each forced GC in
// pattern B is logged (lines "B gc after segment i") as the
// explicit lifetime evidence.
//
// ORDERING (methodology, same as v2.3.15/v2.3.16):
// - The clean baseline snapshot is taken BEFORE any input segment is
//   built, so building the input counts toward the scan-phase delta.
// - Segments are built LAZILY per pattern: pattern A builds all three
//   (it holds them simultaneously by design); pattern B builds ONE
//   segment at a time inside scanSegment(), scans it, and releases it
//   before building the next — materializing all three up front for
//   pattern B would defeat the incremental design being measured.
//
// Usage (spawned by the parent harness run-f029.ts, same Bun binary):
//   bun exp-pattern.ts --pattern A|B --fixture ascii|nonascii|nonascii-bytes --gc forced|natural [--bytes N]
//
//   --bytes N (optional, default 1000000): aggregate UTF-8 byte target
//   for the byte-driven fixtures (ascii, nonascii-bytes). The page
//   target is N-600000 bytes, each script target 300000 bytes.
//   Allowed range: 1..2000000. Not applicable to the char-matched
//   fixture (nonascii), which is defined by character counts, not a
//   byte target.
//
// Local-only, no network, no artifact, no checkLink. Simulates the
// CURRENT source pattern (site/server/src/actions.ts:520-533, read-only
// quote) at the L2 boundary case: page 400,000 bytes + 2 scripts x
// 300,000 bytes = 1,000,000 accepted input bytes. Pattern B is the
// DESIGN ALTERNATIVE (incremental / streaming scan): each segment is
// checked on its own, lowercased per segment, released before the next
// segment is built; no join, no combined haystack, no combined lower.
//
// Fixtures (byte totals ARITHMETIC in this process, independently
// proven exact by preflight-fixture.ts in its own process):
//   ascii    — 'A'/'B'/'C' filler (1 byte/char UTF-8, 1 UTF-16 code unit).
//              Total exactly --bytes (default 1,000,000).
//   nonascii — U+00E9 filler (2 bytes/char UTF-8, 1 UTF-16 code unit);
//              same char counts as ascii (1,000,000 chars). Total is
//              1,999,939 bytes (NOT 2,000,000 — the 61 ASCII marker
//              bytes are 1 byte each, not 2); it tests UTF-16
//              string-storage cost at the char-count boundary, NOT the
//              L2 byte boundary.
//   nonascii-bytes — U+00E9 filler at the L2 BYTE boundary: each
//              segment hits its byte target exactly (page N-600000,
//              scripts 300,000 each). Because U+00E9 is 2 bytes and
//              the marker byte totals are odd (33/15/13), a segment
//              filler can be 1 byte short of its target; that 1 byte
//              is closed with a single ASCII 'A' pad char (1 byte,
//              inert filler). At the default target: 499,968 U+00E9 chars + 3 ASCII
//              pad chars + 61 marker chars = 500,032 chars,
//              1,000,000 bytes.
//
// GC modes (reported separately, never mixed):
//   forced  — Bun.gc(true) at every measurement point
//   natural — no explicit GC; the engine collects on its own schedule

import { readFileSync } from "node:fs";
import {
  buildSegment,
  expectedSegmentBytes,
  expectedTotal,
  type Fixture,
} from "./fixture.ts";

const SCRIPT_BYTES = 300_000;

function fail(msg: string): never {
  console.error(`exp-pattern: ERROR: ${msg}`);
  process.exit(2);
}

function parseArgs(): { pattern: string; fixture: string; gc: string; bytes: number; bytesGiven: boolean } {
  const a = process.argv.slice(2);
  const get = (k: string): string => {
    const i = a.indexOf(k);
    if (i >= 0 && i + 1 < a.length) return a[i + 1];
    const eq = a.find((x) => x.startsWith(k + "="));
    if (eq !== undefined) return eq.slice(k.length + 1);
    return "";
  };
  const bytesRaw = get("--bytes");
  let bytes = 1_000_000;
  let bytesGiven = false;
  if (bytesRaw !== "") {
    bytesGiven = true;
    if (!/^\d+$/.test(bytesRaw)) fail(`--bytes must be a positive integer, got ${JSON.stringify(bytesRaw)}`);
    bytes = Number(bytesRaw);
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > 2_000_000) {
      fail(`--bytes out of approved range 1..2000000, got ${bytes}`);
    }
    if (bytes < 2 * SCRIPT_BYTES) fail(`--bytes must be at least ${2 * SCRIPT_BYTES} (2 script targets), got ${bytes}`);
  }
  return { pattern: get("--pattern"), fixture: get("--fixture"), gc: get("--gc"), bytes, bytesGiven };
}
const { pattern, fixture, gc, bytes: BYTE_TARGET, bytesGiven } = parseArgs();
if (pattern !== "A" && pattern !== "B") fail("pattern must be A or B");
if (fixture !== "ascii" && fixture !== "nonascii" && fixture !== "nonascii-bytes") fail("fixture must be ascii, nonascii, or nonascii-bytes");
if (gc !== "forced" && gc !== "natural") fail("gc must be forced or natural");
if (fixture === "nonascii" && bytesGiven) fail("--bytes is not applicable to the char-matched fixture nonascii (defined by character counts, not a byte target)");

const FIXTURE = fixture as Fixture;

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
console.log(`child pid=${pid} bun=${Bun.version} pattern=${pattern} fixture=${fixture} gc=${gc} encoderInMeasuredPhase=false byteProof=preflight+arithmetic`);

// Clean baseline FIRST (same methodology as v2.3.15/v2.3.16): input segments are
// built after this snapshot, so building the input counts toward the delta.
doGc();
const base = snap();
console.log(`baseline: rss=${base.rss} heapUsed=${base.heapUsed} heapTotal=${base.heapTotal} external=${base.external} vmHwm=${base.vmHwm}`);

const EXPECTED_TOTAL = expectedTotal(FIXTURE, BYTE_TARGET);
const BYTE_TARGET_LOG = fixture === "nonascii" ? "n/a (char-matched)" : String(BYTE_TARGET);

let found = false;
let liveChars = 0;
let segmentBytes: { page: number; script1: number; script2: number };
let inputChars: number;
let utf8Bytes: number;

// Pattern B single-segment scan (F-033): CLOSED SCOPE helper.
// Builds segment i, scans it, and returns ONLY { found, bytes,
// chars }. The segment string `seg` and its lowercase copy
// `segLower` are locals of this function: they go out of scope
// when it returns, so the caller's doGc() runs with NO segment
// reference live, and the next segment is built only after that
// GC. Nothing segment-sized survives into the next iteration.
function scanSegment(i: number): { found: boolean; bytes: number; chars: number } {
  const built = buildSegment(i, FIXTURE, BYTE_TARGET);
  const seg = built.seg;
  const segLower = seg.toLowerCase();
  const hit =
    /connect\s*(your\s*)?wallet/i.test(seg) ||
    segLower.includes("window.solana") ||
    segLower.includes("window.ethereum") ||
    segLower.includes("walletconnect") ||
    segLower.includes("eth_requestaccounts");
  console.log(`bytes: segment ${i} = ${built.bytes} (expected ${expectedSegmentBytes(i, FIXTURE, BYTE_TARGET)})`);
  return { found: hit, bytes: built.bytes, chars: built.chars };
}

if (pattern === "A") {
  // Current pattern: join + haystack + lower, all live at analysis time.
  // All three segments are built up front (held simultaneously by design).
  const s0 = buildSegment(0, FIXTURE, BYTE_TARGET);
  const s1 = buildSegment(1, FIXTURE, BYTE_TARGET);
  const s2 = buildSegment(2, FIXTURE, BYTE_TARGET);
  segmentBytes = { page: s0.bytes, script1: s1.bytes, script2: s2.bytes };
  inputChars = s0.chars + s1.chars + s2.chars;
  utf8Bytes = s0.bytes + s1.bytes + s2.bytes;
  if (utf8Bytes !== EXPECTED_TOTAL) fail(`byte total mismatch: measured ${utf8Bytes}, expected ${EXPECTED_TOTAL}`);
  console.log(`bytes: page=${segmentBytes.page} script1=${segmentBytes.script1} script2=${segmentBytes.script2} total=${utf8Bytes} target=${BYTE_TARGET_LOG}`);
  console.log(`input: page=${s0.chars} chars + 2 scripts x ${s1.chars}/${s2.chars} chars = ${inputChars} accepted input chars; utf8Bytes=${utf8Bytes}`);

  const html = s0.seg;
  const scriptTexts = [s1.seg, s2.seg];
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
  console.log(`A6 live string chars at peak analysis point: ${liveChars} (input ${inputChars}; ratio ${(liveChars / inputChars).toFixed(2)}x)`);
} else {
  // Design alternative: incremental per-segment scan. Each segment is
  // built, scanned inside scanSegment(), and released before the next
  // segment is built — the input is never held simultaneously.
  const segBytes: number[] = [];
  const segChars: number[] = [];
  let peakRss = base.rss;
  let peakHeap = base.heapUsed;
  for (let i = 0; i < 3; i++) {
    const r = scanSegment(i);
    segBytes.push(r.bytes);
    segChars.push(r.chars);
    found = found || r.found;
    const s = snap();
    if (s.rss > peakRss) peakRss = s.rss;
    if (s.heapUsed > peakHeap) peakHeap = s.heapUsed;
    // r holds only numbers/boolean; seg + segLower already went out
    // of scope when scanSegment() returned. GC runs now, with no
    // segment reference live.
    doGc();
    const s2 = snap();
    if (s2.rss > peakRss) peakRss = s2.rss;
    if (s2.heapUsed > peakHeap) peakHeap = s2.heapUsed;
    console.log(`B gc after segment ${i}: seg refs out of scope (helper returned), gc=${gc}, rss=${s2.rss} vmHwm=${s2.vmHwm}`);
  }
  segmentBytes = { page: segBytes[0], script1: segBytes[1], script2: segBytes[2] };
  inputChars = segChars[0] + segChars[1] + segChars[2];
  utf8Bytes = segBytes[0] + segBytes[1] + segBytes[2];
  if (utf8Bytes !== EXPECTED_TOTAL) fail(`byte total mismatch: measured ${utf8Bytes}, expected ${EXPECTED_TOTAL}`);
  console.log(`bytes: page=${segmentBytes.page} script1=${segmentBytes.script1} script2=${segmentBytes.script2} total=${utf8Bytes} target=${BYTE_TARGET_LOG}`);
  console.log(`input: page=${segChars[0]} chars + 2 scripts x ${segChars[1]}/${segChars[2]} chars = ${inputChars} accepted input chars; utf8Bytes=${utf8Bytes}`);
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
  inputChars,
  utf8Bytes, // ARITHMETIC byte total (F-033 — no TextEncoder in this process); independently proven exact by preflight-fixture.ts
  byteTarget: fixture === "nonascii" ? null : BYTE_TARGET,
  segmentBytes,
  asksConnect: found,
  liveChars: pattern === "A" ? liveChars : null,
  baseline: base,
  final: fin,
  vmHwmDelta: fin.vmHwm !== null && base.vmHwm !== null ? fin.vmHwm - base.vmHwm : null,
  rssDelta: fin.rss - base.rss,
  heapUsedDelta: fin.heapUsed - base.heapUsed,
  externalDelta: fin.external - base.external,
  // F-033 proof fields: the parent harness asserts encoderInMeasuredPhase === false on every RESULT.
  encoderInMeasuredPhase: false,
  byteProof: "preflight+arithmetic",
};
console.log("RESULT " + JSON.stringify(result));
console.log("done");
