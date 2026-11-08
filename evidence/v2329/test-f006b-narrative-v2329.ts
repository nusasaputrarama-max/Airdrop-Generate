// test-f006b-narrative-v2329.ts — F-006b (v2.3.29, audit V23):
// incident-narrative strings removed from application source.
//
// Audit V23 §6 (carried from the v2.3.28 matrix) lists F-006b OPEN:
// incident-related narrative strings remained in application source.
// This harness proves, by reading the REAL source files, that the
// incident narrative is gone from site/server/src/actions.ts and
// site/client/src/App.tsx, while the FUNCTIONAL drainer protection
// is untouched: the KNOWN_BAD_DOMAINS denylist, the +100 known-bad
// scoring, and the known_bad / known_bad_redirect signals must still
// be present and unchanged in behaviour.
//
// Scoping decision (DL-29-04): the Ptah lottery data line in
// actions.ts ("...dibaca dari API resmi Ptah pada 7 Nov 2026.") is
// catalog/lottery data, NOT incident narrative, and is intentionally
// kept. The sentinel list below therefore targets incident phrasing
// ("kejadian 7 Nov", "pengurasan wallet", "SCAMSEM", ...), not every
// occurrence of the date string in actions.ts. In App.tsx every
// "7 Nov 2026" occurrence WAS incident narrative, so App.tsx asserts
// the date string is gone entirely.
//
// Run:  bun evidence/v2329/test-f006b-narrative-v2329.ts
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.
// Behavioural regression is covered separately by the H-KILL harness
// (evidence/v2323/test-checklink-killswitch-v2323.ts), which imports
// and executes the real actions.ts, plus tsc --noEmit on server+client.

import { readFileSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
let fail = 0;
const failures: string[] = [];
type Test = { id: string; name: string; run: () => Promise<void> | void };
const tests: Test[] = [];
function test(id: string, name: string, run: () => Promise<void> | void): void {
  tests.push({ id, name, run });
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const ACTIONS = join(import.meta.dir, "..", "..", "site", "server", "src", "actions.ts");
const APP = join(import.meta.dir, "..", "..", "site", "client", "src", "App.tsx");
const actionsSrc = readFileSync(ACTIONS, "utf8");
const appSrc = readFileSync(APP, "utf8");

test("H-NAR-01", "F-006b actions.ts contains no incident-narrative phrasing", () => {
  const banned = [
    "kejadian 7 Nov",
    "pengurasan wallet",
    "SCAMSEM",
    "2026-11-07 incident",
    "persis mekanisme drainer",
    "Pola persis kejadian",
    "yang terdokumentasi di platform ini",
    "menguras wallet pada kejadian",
    "dari kejadian 7 Nov",
    "pola persis di balik pengurasan",
  ];
  for (const s of banned) {
    assert(!actionsSrc.includes(s), `actions.ts must NOT contain incident narrative ${JSON.stringify(s)}`);
  }
});

test("H-NAR-02", "F-006b App.tsx contains no incident-narrative phrasing and no 7 Nov 2026 date", () => {
  const banned = [
    "7 Nov 2026",
    "kejadian 7 Nov",
    "pengurasan wallet",
    "SCAMSEM",
    "yang terdokumentasi di platform ini",
    "pola persis di balik pengurasan",
  ];
  for (const s of banned) {
    assert(!appSrc.includes(s), `App.tsx must NOT contain incident narrative ${JSON.stringify(s)}`);
  }
});

test("H-NAR-03", "F-006b functional drainer protection is preserved in actions.ts", () => {
  assert(
    actionsSrc.includes('const KNOWN_BAD_DOMAINS = new Set(["solbarn.cc", "sharkmoon.tech"])'),
    "KNOWN_BAD_DOMAINS denylist (solbarn.cc, sharkmoon.tech) must still exist unchanged",
  );
  assert(actionsSrc.includes("isKnownBadDomain"), "isKnownBadDomain helper must still exist");
  assert(actionsSrc.includes('"known_bad"') || actionsSrc.includes("id: \"known_bad\""), "known_bad signal must still exist");
  assert(actionsSrc.includes("known_bad_redirect"), "known_bad_redirect signal must still exist");
  assert(actionsSrc.includes("score += 100"), "known-bad +100 scoring must still exist");
  assert(
    actionsSrc.includes("tercatat sebagai drainer"),
    "known-bad user-facing detail must still explain the drainer verdict (reworded, not removed)",
  );
});

test("H-NAR-04", "F-006b functional example + explainer preserved in App.tsx", () => {
  assert(appSrc.includes("scamsem.solbarn.cc"), "App.tsx example URL (scamsem.solbarn.cc) must still exist");
  assert(appSrc.includes("solbarn.cc dan"), "App.tsx explainer must still name the blocked domains");
  assert(appSrc.includes("sharkmoon.tech"), "App.tsx explainer must still name sharkmoon.tech");
  assert(appSrc.includes("selalu divonis BAHAYA"), "App.tsx explainer must still state the BAHAYA verdict");
});

test("H-NAR-05", "F-006b Ptah lottery data line is out of scope and intentionally kept", () => {
  assert(
    actionsSrc.includes("dibaca dari API resmi Ptah pada 7 Nov 2026"),
    "Ptah lottery data (catalog data, not incident narrative) must still be present — scoping check",
  );
});

for (const t of tests) {
  try {
    await t.run();
    pass++;
    console.log(`PASS ${t.id} ${t.name}`);
  } catch (err) {
    fail++;
    failures.push(t.id);
    console.log(`FAIL ${t.id} ${t.name} — ${err instanceof Error ? err.message : String(err)}`);
  }
}
console.log(`\nH-NAR: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
