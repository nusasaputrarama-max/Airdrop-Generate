// Shared fixture construction for the F-029 VM experiment (v2.3.17).
//
// Single source of construction logic for BOTH:
//   - exp-pattern.ts        (the MEASURED child process), and
//   - preflight-fixture.ts  (the separate byte-validation process).
//
// F-033 FIX (audit V10): this module contains NO TextEncoder and
// allocates NO full-segment Uint8Array. Byte counts are computed
// DETERMINISTICALLY from known filler/marker byte widths:
//   - filler 'A'/'B'/'C' = 1 byte/char UTF-8, 1 UTF-16 code unit;
//   - filler U+00E9      = 2 bytes/char UTF-8, 1 UTF-16 code unit;
//   - markers are pure ASCII, so marker bytes == marker chars.
// The marker byte lengths (33 / 15 / 13) are HARDCODED constants
// below; they are VERIFIED by the independent preflight process
// (preflight-fixture.ts), which measures the same segments with
// TextEncoder in its OWN process — never inside a measured child.
// The arithmetic byte total inside exp-pattern.ts is therefore a
// construction self-check; the INDEPENDENT byte proof is the
// preflight log. Never claim the child's arithmetic assert alone
// proves the byte total.
//
// Fixtures (same definitions as v2.3.16, byte totals unchanged):
//   ascii          — 'A'/'B'/'C' filler; total exactly --bytes.
//   nonascii       — U+00E9 filler, same char counts as ascii
//                    (1,000,000 chars); measured total 1,999,939
//                    bytes (61 ASCII marker bytes count 1, not 2).
//   nonascii-bytes — U+00E9 filler at the L2 BYTE boundary; each
//                    segment hits its byte target exactly. A segment
//                    filler can be 1 byte short of its target
//                    (U+00E9 = 2 bytes, odd marker byte totals);
//                    that 1 byte is closed with a single ASCII 'A'
//                    pad char. At the default target: 499,968 U+00E9
//                    chars + 3 ASCII pad chars + 61 marker chars =
//                    500,032 chars, 1,000,000 bytes.
//
// Local-only, no network, no artifact, no checkLink.

export const MARKERS = [
  "window.solana connect your wallet", // 33 bytes (ASCII)
  "window.ethereum", // 15 bytes (ASCII)
  "walletconnect", // 13 bytes (ASCII)
];
// Hardcoded MEASURED marker byte lengths (== char lengths: ASCII).
// Verified independently by preflight-fixture.ts on every run.
export const MARKER_BYTES = [33, 15, 13];
export const MARKER_BYTES_TOTAL = 61;

export const PAGE_CHARS = 400_000;
export const SCRIPT_CHARS = 300_000;
export const SCRIPT_BYTES = 300_000;

export type Fixture = "ascii" | "nonascii" | "nonascii-bytes";

const FILLER_CHARS: Record<Fixture, [string, string, string]> = {
  ascii: ["A", "B", "C"],
  nonascii: ["é", "é", "é"],
  "nonascii-bytes": ["é", "é", "é"],
};

// UTF-8 bytes per filler char, by fixture (known constants, NOT
// measured per segment — the per-segment measurement lives only in
// the preflight process).
export function fillerBytesPerChar(fixture: Fixture): number {
  return fixture === "ascii" ? 1 : 2;
}

export function segmentByteTarget(i: number, byteTarget: number): number {
  return i === 0 ? byteTarget - 2 * SCRIPT_BYTES : SCRIPT_BYTES;
}

export function segmentCharCount(i: number): number {
  return i === 0 ? PAGE_CHARS : SCRIPT_CHARS;
}

// Expected UTF-8 bytes of segment i, computed arithmetically from
// the known filler/marker widths — no encoder allocation.
export function expectedSegmentBytes(
  i: number,
  fixture: Fixture,
  byteTarget: number,
): number {
  if (fixture === "nonascii") {
    const chars = segmentCharCount(i);
    return 2 * (chars - MARKERS[i].length) + MARKERS[i].length;
  }
  return segmentByteTarget(i, byteTarget);
}

export function expectedTotal(fixture: Fixture, byteTarget: number): number {
  return (
    expectedSegmentBytes(0, fixture, byteTarget) +
    expectedSegmentBytes(1, fixture, byteTarget) +
    expectedSegmentBytes(2, fixture, byteTarget)
  );
}

function fail(msg: string): never {
  console.error(`fixture: ERROR: ${msg}`);
  process.exit(2);
}

// Build segment i. Returns the segment, its ARITHMETIC byte count
// (deterministic, no TextEncoder), and its char length. The byte
// count is asserted against the construction formula before the
// segment is used; the independent byte proof is the preflight.
export function buildSegment(
  i: number,
  fixture: Fixture,
  byteTarget: number,
): { seg: string; bytes: number; chars: number } {
  const marker = MARKERS[i];
  const fillerChar = FILLER_CHARS[fixture][i];
  let seg: string;
  let bytes: number;
  if (fixture === "nonascii") {
    const chars = segmentCharCount(i);
    seg = fillerChar.repeat(chars - marker.length) + marker;
    bytes = 2 * (chars - marker.length) + MARKER_BYTES[i];
  } else {
    const target = segmentByteTarget(i, byteTarget);
    const markerLen = MARKER_BYTES[i];
    const fillerBytes = target - markerLen;
    const bytesPerFiller = fillerBytesPerChar(fixture);
    const fillerChars = Math.floor(fillerBytes / bytesPerFiller);
    const padChars = fillerBytes - fillerChars * bytesPerFiller; // 0 (ascii) or 0..1 (U+00E9)
    seg = fillerChar.repeat(fillerChars) + "A".repeat(padChars) + marker;
    bytes = fillerChars * bytesPerFiller + padChars + markerLen;
    if (bytes !== target) {
      fail(
        `segment ${i} construction mismatch: arithmetic ${bytes}, target ${target}`,
      );
    }
  }
  const expected = expectedSegmentBytes(i, fixture, byteTarget);
  if (bytes !== expected) {
    fail(
      `segment ${i} byte mismatch: arithmetic ${bytes}, expected ${expected}`,
    );
  }
  return { seg, bytes, chars: seg.length };
}
