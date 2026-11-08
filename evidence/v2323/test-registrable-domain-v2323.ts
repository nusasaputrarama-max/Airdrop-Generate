// test-registrable-domain-v2323.ts — Harness H-RD-xx: registrableDomain
// correctness for IP literals (defect found in round-2 testing, out of
// scope of D-01..D-06; BACKLOG D-11).
//
// The defect: registrableDomain() takes the last two dot-labels of any
// host, so an IPv4 literal is mangled — 127.0.0.1 becomes "0.1",
// 8.8.8.8 becomes "8.8". The mangled value is stored as the check's
// `domain` (runCheck, actions.ts:1035; analyze, actions.ts:584) and fed
// to RDAP (lookupRdap(domain), actions.ts:617), so an IP-literal check
// queries a nonsense domain (rdap.org/domain/0.1).
//
// Tests the REAL function site/server/src/actions.ts `registrableDomain`
// (exported for harness verification; NOT an action). Pure function —
// no DNS, no network, no DB, no fetch.
//
//   H-RD-01  127.0.0.1 -> "127.0.0.1" (bug: "0.1")
//   H-RD-02  8.8.8.8 -> "8.8.8.8" (bug: "8.8")
//   H-RD-03  192.168.1.1 -> "192.168.1.1" (bug: "1.1")
//   H-RD-04  ::1 -> "::1" (control — already correct, no dots)
//   H-RD-05  2001:db8::1 -> "2001:db8::1" (control — already correct)
//   H-RD-06  contoh.com -> "contoh.com" (control)
//   H-RD-07  sub.contoh.co.id -> "contoh.co.id" (control, two-level suffix)
//   H-RD-08  www.google.com -> "google.com" (control)
//   H-RD-09  sub.example.com -> "example.com" (control)
//   H-RD-10  SUB.EXAMPLE.COM -> "example.com" (control, case)
//
// Exit 0 = all PASS; exit 1 = any FAIL. VM evidence only — not staging.

import { registrableDomain } from "../../site/server/src/actions";

type Test = { id: string; name: string; run: () => void | Promise<void> };
const tests: Test[] = [];
const results: { id: string; name: string; pass: boolean; error?: string }[] = [];

function eq(actual: unknown, expected: unknown, msg: string): void {
  if (actual !== expected) {
    throw new Error(
      `${msg} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`,
    );
  }
}

function test(id: string, name: string, input: string, expected: string): void {
  tests.push({
    id,
    name,
    run: () =>
      eq(
        registrableDomain(input),
        expected,
        `registrableDomain(${JSON.stringify(input)})`,
      ),
  });
}

// IP literals — must be returned whole (the defect).
test("H-RD-01", "IPv4 loopback 127.0.0.1 stays whole", "127.0.0.1", "127.0.0.1");
test("H-RD-02", "IPv4 public 8.8.8.8 stays whole", "8.8.8.8", "8.8.8.8");
test("H-RD-03", "IPv4 private 192.168.1.1 stays whole", "192.168.1.1", "192.168.1.1");
// IPv6 literals — already correct on old code (no dots), kept as controls.
test("H-RD-04", "IPv6 loopback ::1 stays whole", "::1", "::1");
test("H-RD-05", "IPv6 2001:db8::1 stays whole", "2001:db8::1", "2001:db8::1");
// Normal domains — behavior must not change.
test("H-RD-06", "bare domain contoh.com unchanged", "contoh.com", "contoh.com");
test(
  "H-RD-07",
  "two-level suffix sub.contoh.co.id -> contoh.co.id",
  "sub.contoh.co.id",
  "contoh.co.id",
);
test("H-RD-08", "www.google.com -> google.com", "www.google.com", "google.com");
test("H-RD-09", "sub.example.com -> example.com", "sub.example.com", "example.com");
test("H-RD-10", "case: SUB.EXAMPLE.COM -> example.com", "SUB.EXAMPLE.COM", "example.com");

// ---------------------------------------------------------------------------
// Runner (mirrors test-ssrf-guard-v2323.ts).
// ---------------------------------------------------------------------------
for (const t of tests) {
  const started = Date.now();
  try {
    await t.run();
    results.push({ id: t.id, name: t.name, pass: true });
    console.log(`[PASS] ${t.id} ${t.name} (${Date.now() - started} ms)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ id: t.id, name: t.name, pass: false, error: msg });
    console.log(`[FAIL] ${t.id} ${t.name} (${Date.now() - started} ms)`);
    console.log(`       ${msg.split("\n").join("\n       ")}`);
  }
}

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass);
console.log(`\nPASS ${passed} / FAIL ${failed.length} (total ${results.length})`);
if (failed.length > 0) {
  console.log("Failed IDs: " + failed.map((r) => r.id).join(", "));
}
process.exit(failed.length === 0 ? 0 : 1);
