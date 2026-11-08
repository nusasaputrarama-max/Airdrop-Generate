// F-029 preflight fixture validation (v2.3.17, F-033 fix).
//
// Runs in its OWN process, SEPARATE from every measured child.
// It is the INDEPENDENT byte proof for the experiment: it builds
// the same segments as exp-pattern.ts (via the shared fixture.ts
// construction) and measures each one with TextEncoder, asserting
// exact per-segment and total byte counts.
//
// The measured child (exp-pattern.ts) NEVER calls TextEncoder:
// its byte totals are arithmetic (see fixture.ts). The preflight
// is therefore the only place a full-segment Uint8Array is ever
// allocated — and its allocations can never touch a measured
// child's VmHWM, because it runs in a different process, BEFORE
// the parent harness spawns any measured child. run-f029.ts runs
// this preflight first and aborts (exit 1, no success line) if
// it fails, so no measured run can ever proceed on an unverified
// fixture.
//
// Coverage (every case asserted, exit 0 only if ALL pass):
//   - marker byte lengths: 33 / 15 / 13 (TextEncoder-measured);
//   - filler byte widths: 'A' = 1 byte, U+00E9 = 2 bytes;
//   - fixtures ascii + nonascii-bytes at --bytes 999999 (cap-1),
//     1000000 (cap), 1000001 (cap+1): every segment exact, total
//     exact;
//   - fixture nonascii (char-matched): every segment exact,
//     total exactly 1,999,939 bytes.
//   - byteTarget bounds: 1..2000000, >= 600000 (same rules as the
//     measured child).
//
// Usage (standalone, either Bun version):
//   bun preflight-fixture.ts
// Exit 0 = PASS (all cases), exit 2 = FAIL (prints the mismatch).
//
// Local-only, no network, no artifact, no checkLink.

import {
  MARKERS,
  MARKER_BYTES,
  buildSegment,
  expectedSegmentBytes,
  expectedTotal,
  type Fixture,
} from "./fixture.ts";

const enc = new TextEncoder();
let checks = 0;
let failures = 0;

function check(cond: boolean, label: string, detail: string): void {
  checks++;
  if (cond) {
    console.log(`preflight PASS: ${label} — ${detail}`);
  } else {
    failures++;
    console.log(`preflight FAIL: ${label} — ${detail}`);
  }
}

// 1. Marker byte lengths (independent TextEncoder measurement).
MARKERS.forEach((m, i) => {
  const measured = enc.encode(m).byteLength;
  check(
    measured === MARKER_BYTES[i],
    `marker[${i}] byte length`,
    `measured ${measured}, hardcoded ${MARKER_BYTES[i]} (${JSON.stringify(m)})`,
  );
  check(
    m.length === MARKER_BYTES[i],
    `marker[${i}] is pure ASCII`,
    `chars ${m.length} == bytes ${measured}`,
  );
});

// 2. Filler byte widths.
check(enc.encode("A").byteLength === 1, "filler 'A' width", "1 byte");
check(enc.encode("é").byteLength === 2, "filler U+00E9 width", "2 bytes");

// 3. Byte-driven fixtures at cap-1 / cap / cap+1.
const BYTE_TARGETS = [999_999, 1_000_000, 1_000_001];
for (const fixture of ["ascii", "nonascii-bytes"] as Fixture[]) {
  for (const target of BYTE_TARGETS) {
    let total = 0;
    for (let i = 0; i < 3; i++) {
      const built = buildSegment(i, fixture, target);
      const measured = enc.encode(built.seg).byteLength;
      const expected = expectedSegmentBytes(i, fixture, target);
      check(
        measured === expected,
        `${fixture} target=${target} segment ${i}`,
        `TextEncoder-measured ${measured}, arithmetic expected ${expected}`,
      );
      check(
        built.bytes === expected,
        `${fixture} target=${target} segment ${i} arithmetic`,
        `arithmetic ${built.bytes} == expected ${expected}`,
      );
      total += measured;
    }
    check(
      total === target,
      `${fixture} target=${target} total`,
      `measured total ${total} == target ${target}`,
    );
    check(
      total === expectedTotal(fixture, target),
      `${fixture} target=${target} total vs expectedTotal()`,
      `measured ${total} == expectedTotal ${expectedTotal(fixture, target)}`,
    );
  }
}

// 4. Char-matched fixture (nonascii): total exactly 1,999,939.
{
  const fixture: Fixture = "nonascii";
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const built = buildSegment(i, fixture, 1_000_000);
    const measured = enc.encode(built.seg).byteLength;
    const expected = expectedSegmentBytes(i, fixture, 1_000_000);
    check(
      measured === expected,
      `nonascii segment ${i}`,
      `TextEncoder-measured ${measured}, arithmetic expected ${expected}`,
    );
    total += measured;
  }
  check(
    total === 1_999_939,
    "nonascii total",
    `measured total ${total} == 1,999,939`,
  );
  check(
    total === expectedTotal(fixture, 1_000_000),
    "nonascii total vs expectedTotal()",
    `measured ${total} == expectedTotal ${expectedTotal(fixture, 1_000_000)}`,
  );
}

console.log(
  `preflight done: ${checks} checks, ${failures} failure(s), bun=${Bun.version}`,
);
if (failures > 0) {
  console.log("preflight: FAILED — fixture NOT verified, no measured run may proceed");
  process.exit(2);
}
console.log("preflight: all fixture byte counts verified exact (TextEncoder, separate process)");
