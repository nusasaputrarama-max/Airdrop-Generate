// test-ssrf-guard-v2323.ts — evidence harness for SSRF remediation v2.3.23 (D-02/D-03).
//
// Tests the REAL module site/server/src/ssrf-guard.ts (never a copy):
//   classifyIp / parseIPv4 / parseIPv6 / canonicalizeHost / checkPort /
//   validateDestination / resolveAll (via injected stub resolvers where the
//   module accepts one — resolveAll itself has NO injection point, see
//   H-SSRF-18 note) / fetchGuardedOnce / validateUrlForFetch / nodeConnector
//   / constants.
//
// SAFETY: no real DNS, no global fetch, no request to any public host or
// internal/metadata network. All network peers are STUB resolvers/connectors
// plus ONE disposable local HTTP server on 127.0.0.1 (pinning proof).
// The VM sandbox DNS stub resolves everything to 198.18.0.0/15 (benchmarking
// = BLOCKED by §A.4), so real DNS is never used here at all.
//
// Run:  bun evidence/v2323/test-ssrf-guard-v2323.ts   (from worktree root)
// Exit code 0 only when every test PASSES.

import * as http from "node:http";
import { Readable, type AddressInfo } from "node:stream";
import {
  DNS_TIMEOUT_MS,
  PER_HOP_TIMEOUT_MS,
  TOTAL_DEADLINE_MS,
  MAX_REDIRECT_HOPS,
  PAGE_DECODED_CAP,
  SCRIPT_DECODED_CAP,
  AGGREGATE_DECODED_CAP,
  RDAP_DECODED_CAP,
  classifyIp,
  canonicalizeHost,
  checkPort,
  validateDestination,
  validateUrlForFetch,
  fetchGuardedOnce,
  nodeConnector,
  GuardReject,
  DnsError,
  GUARD_ACCEPT_RDAP,
  type Resolver,
  type Connector,
  type ConnectorRequest,
  type GuardedResponse,
} from "../../site/server/src/ssrf-guard.ts";

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

type Test = { id: string; name: string; run: () => Promise<void> | void };
const tests: Test[] = [];
function test(id: string, name: string, run: () => Promise<void> | void): void {
  tests.push({ id, name, run });
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function eq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected)
    throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Race a promise against a hard timeout so a hanging module call can never hang the harness. */
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

process.on("unhandledRejection", (err) => {
  console.error(`[HARNESS-FAIL] unhandledRejection: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// H-SSRF-00 — exported constants match the binding §A.5 numbers
// ---------------------------------------------------------------------------
test("H-SSRF-00", "constants match §A.5 binding values", () => {
  eq(DNS_TIMEOUT_MS, 5000, "DNS_TIMEOUT_MS");
  eq(PER_HOP_TIMEOUT_MS, 12000, "PER_HOP_TIMEOUT_MS");
  eq(TOTAL_DEADLINE_MS, 20000, "TOTAL_DEADLINE_MS");
  eq(MAX_REDIRECT_HOPS, 6, "MAX_REDIRECT_HOPS");
  eq(PAGE_DECODED_CAP, 400000, "PAGE_DECODED_CAP");
  eq(SCRIPT_DECODED_CAP, 300000, "SCRIPT_DECODED_CAP");
  eq(AGGREGATE_DECODED_CAP, 1000000, "AGGREGATE_DECODED_CAP");
  eq(RDAP_DECODED_CAP, 200000, "RDAP_DECODED_CAP");
});

// ---------------------------------------------------------------------------
// §1 — classifyIp corpus (§A.4)
// ---------------------------------------------------------------------------
test("H-SSRF-01", "classifyIp: public IPv4 OK", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "100.128.0.1", "198.17.255.255", "198.20.0.1"]) {
    const v = classifyIp(ip);
    assert(v.ok, `${ip} must be OK, got ${JSON.stringify(v)}`);
    eq(v.ip, ip, `${ip} canonical ip`);
  }
});

test("H-SSRF-02", "classifyIp: blocked IPv4 corpus DENY with exact reason", () => {
  const cases: Array<[string, string]> = [
    ["0.0.0.0", "ipv4-this-network-0/8"],
    ["0.1.2.3", "ipv4-this-network-0/8"],
    ["10.0.0.1", "ipv4-private-10/8"],
    ["10.255.255.255", "ipv4-private-10/8"],
    ["127.0.0.1", "ipv4-loopback-127/8"],
    ["127.1.2.3", "ipv4-loopback-127/8"],
    ["169.254.169.254", "ipv4-link-local-169.254/16"],
    ["169.254.0.1", "ipv4-link-local-169.254/16"],
    ["172.16.0.1", "ipv4-private-172.16/12"],
    ["172.31.255.255", "ipv4-private-172.16/12"],
    ["192.0.0.1", "ipv4-ietf-192.0.0/24"],
    ["192.0.2.1", "ipv4-documentation-192.0.2/24"],
    ["192.168.1.1", "ipv4-private-192.168/16"],
    ["198.18.0.1", "ipv4-benchmarking-198.18/15"],
    ["198.18.177.104", "ipv4-benchmarking-198.18/15"], // VM sandbox stub DNS answer
    ["198.19.255.255", "ipv4-benchmarking-198.18/15"],
    ["198.51.100.1", "ipv4-documentation-198.51.100/24"],
    ["203.0.113.1", "ipv4-documentation-203.0.113/24"],
    ["100.64.0.1", "ipv4-cgnat-100.64/10"],
    ["100.127.255.255", "ipv4-cgnat-100.64/10"],
    ["224.0.0.1", "ipv4-multicast-224/4"], // §A.4: 224/4 not globally reachable
    ["240.0.0.1", "ipv4-reserved-240/4"],
    ["255.255.255.255", "ipv4-reserved-240/4"], // 240/4 check precedes limited-broadcast
  ];
  for (const [ip, reason] of cases) {
    const v = classifyIp(ip);
    assert(!v.ok, `${ip} must be DENY, got ${JSON.stringify(v)}`);
    if (!v.ok) eq(v.reason, reason, `${ip} reason`);
  }
});

test("H-SSRF-03", "classifyIp: non-canonical IPv4 DENY (never loosely parsed)", () => {
  for (const ip of ["0177.0.0.1", "127.1", "1.2.3.04", "0x7f.0.0.1", "2130706433", "127.0.0.01"]) {
    const v = classifyIp(ip);
    assert(!v.ok, `${ip} must be DENY, got ${JSON.stringify(v)}`);
    if (!v.ok) eq(v.reason, "non-canonical-ipv4-literal", `${ip} reason`);
  }
});

test("H-SSRF-04", "classifyIp: blocked IPv6 corpus DENY with exact reason", () => {
  const cases: Array<[string, string]> = [
    ["::1", "ipv6-loopback-::1"],
    ["::", "ipv6-unspecified-::"],
    ["fe80::1", "ipv6-link-local-fe80::/10"],
    ["febf::1", "ipv6-link-local-fe80::/10"],
    ["fc00::1", "ipv6-ula-fc00::/7"],
    ["fd00::1", "ipv6-ula-fc00::/7"],
    ["ff02::1", "ipv6-multicast-ff00::/8"],
    ["2001:db8::1", "ipv6-documentation-2001:db8::/32"],
    ["2001:2::1", "ipv6-benchmarking-2001:2::/48"],
    ["2001:10::1", "ipv6-deprecated-orchid-2001:10::/28"],
    // 2001:20::1 REMOVED v2.3.24 (F-049): IANA marks 2001:20::/28
    // ORCHIDv2 Globally Reachable=True — the old DENY expectation was
    // a false positive (V18 §5). It is now ALLOW, covered by H-IP-06.
    ["3fff::1", "ipv6-documentation-3fff::/20"],
    ["100::1", "ipv6-discard-100::/64"],
  ];
  for (const [ip, reason] of cases) {
    const v = classifyIp(ip);
    assert(!v.ok, `${ip} must be DENY, got ${JSON.stringify(v)}`);
    if (!v.ok) eq(v.reason, reason, `${ip} reason`);
  }
});

test("H-SSRF-05", "classifyIp: IPv4-mapped / NAT64 / Teredo / 6to4 / zone ID DENY", () => {
  const cases: Array<[string, string]> = [
    ["::ffff:127.0.0.1", "ipv4-loopback-127/8"], // mapped -> embedded IPv4 blocked
    ["::ffff:10.0.0.1", "ipv4-private-10/8"],
    ["::ffff:169.254.169.254", "ipv4-link-local-169.254/16"],
    ["64:ff9b::127.0.0.1", "ipv4-loopback-127/8"], // NAT64 WKP RFC 6052 §2.2 + blocked IPv4
    ["64:ff9b::10.0.0.1", "ipv4-private-10/8"],
    ["64:ff9b:1:a9fe:1:100:0:0", "ipv4-link-local-169.254/16"], // NAT64 /48, u=0, suffix 0 -> 169.254.1.1
    ["2001::1", "ipv6-teredo-2001::/32"],
    ["2001:0:4136:e378:8000:63bf:3fff:fdd2", "ipv6-teredo-2001::/32"],
    ["2002::1", "ipv6-6to4-2002::/16"],
    ["2002:7f00:1::1", "ipv6-6to4-2002::/16"],
    ["fe80::1%eth0", "ipv6-zone-identifier"],
    ["::1%lo", "ipv6-zone-identifier"],
  ];
  for (const [ip, reason] of cases) {
    const v = classifyIp(ip);
    assert(!v.ok, `${ip} must be DENY, got ${JSON.stringify(v)}`);
    if (!v.ok) eq(v.reason, reason, `${ip} reason`);
  }
  // Mapped / NAT64 to a PUBLIC IPv4 is OK and returns the extracted IPv4.
  const mapped = classifyIp("::ffff:8.8.8.8");
  assert(mapped.ok && mapped.ip === "8.8.8.8", `::ffff:8.8.8.8 must be OK as 8.8.8.8, got ${JSON.stringify(mapped)}`);
  const nat64 = classifyIp("64:ff9b::8.8.8.8");
  assert(nat64.ok && nat64.ip === "8.8.8.8", `64:ff9b::8.8.8.8 must be OK as 8.8.8.8, got ${JSON.stringify(nat64)}`);
  const nat64b = classifyIp("64:ff9b:1:808:8:800:0:0");
  assert(nat64b.ok && nat64b.ip === "8.8.8.8", `64:ff9b:1:808:8:800:0:0 must be OK as 8.8.8.8, got ${JSON.stringify(nat64b)}`);
});

test("H-SSRF-06", "classifyIp: public IPv6 OK", () => {
  for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888", "2606:4700:4700:0:0:0:0:1111"]) {
    const v = classifyIp(ip);
    assert(v.ok, `${ip} must be OK, got ${JSON.stringify(v)}`);
  }
  const v = classifyIp("2606:4700:4700::1111");
  assert(v.ok && v.ip === "2606:4700:4700::1111", "public IPv6 canonical ip");
});

test("H-SSRF-07", "classifyIp: malformed strings DENY", () => {
  const cases: Array<[string, string]> = [
    ["", "malformed-empty-entry"],
    ["999.1.1.1", "non-canonical-ipv4-literal"],
    ["gggg::1", "malformed-ip-literal"],
    ["256.256.256.256", "non-canonical-ipv4-literal"],
    [":::", "malformed-ip-literal"],
    ["1:2:3:4:5:6:7:8:9", "malformed-ip-literal"],
    ["fe80::1::1", "malformed-ip-literal"],
  ];
  for (const [ip, reason] of cases) {
    const v = classifyIp(ip);
    assert(!v.ok, `${JSON.stringify(ip)} must be DENY, got ${JSON.stringify(v)}`);
    if (!v.ok) eq(v.reason, reason, `${JSON.stringify(ip)} reason`);
  }
});

// ---------------------------------------------------------------------------
// §2 — canonicalizeHost + port policy
// ---------------------------------------------------------------------------
function expectGuardReject(rawUrl: string, code: string): void {
  try {
    canonicalizeHost(rawUrl);
  } catch (err) {
    assert(err instanceof GuardReject, `${rawUrl} must throw GuardReject, got ${String(err)}`);
    eq((err as GuardReject).code, code, `${rawUrl} GuardReject code`);
    return;
  }
  throw new Error(`${rawUrl} must throw GuardReject(${code}), but canonicalizeHost succeeded`);
}

test("H-SSRF-08", "canonicalizeHost: userinfo rejected", () => {
  expectGuardReject("http://user:pass@example.com/", "userinfo-denied");
  expectGuardReject("http://user@example.com/", "userinfo-denied");
  expectGuardReject("https://token@api.example.com/x", "userinfo-denied");
});

test("H-SSRF-09", "canonicalizeHost: IPv6 zone identifier rejected", () => {
  expectGuardReject("http://[fe80::1%eth0]/", "zone-denied");
  expectGuardReject("http://[fe80::1%25eth0]/", "zone-denied");
});

test("H-SSRF-10", "checkPort: http->80 / https->443 only, non-standard denied", () => {
  const cases: Array<[string, boolean]> = [
    ["http://example.com/", true],
    ["https://example.com/", true],
    ["http://example.com:80/", true],
    ["https://example.com:443/", true],
    ["http://example.com:8080/", false],
    ["https://example.com:8443/", false],
    ["http://example.com:443/", false], // 443 is not the http default
    ["https://example.com:80/", false],
    ["http://example.com:1/", false],
    ["http://example.com:65535/", false],
  ];
  for (const [url, expected] of cases) {
    const host = canonicalizeHost(url);
    eq(checkPort(host), expected, `${url} checkPort`);
  }
  // Non-canonical IPv4 host in the URL is rejected at canonicalization.
  expectGuardReject("http://0177.0.0.1/", "non-canonical-ipv4");
  expectGuardReject("http://127.1/", "non-canonical-ipv4");
  expectGuardReject("http://0x7f.0.0.1/", "non-canonical-ipv4");
});

test("H-SSRF-11", "canonicalizeHost: non-http(s) scheme and empty host rejected", () => {
  expectGuardReject("ftp://example.com/", "bad-url");
  expectGuardReject("file:///etc/passwd", "bad-url");
  expectGuardReject("gopher://example.com/", "bad-url");
  expectGuardReject("http://", "bad-url");
  expectGuardReject("http:///path", "bad-url");
  expectGuardReject("//example.com/", "bad-url");
  expectGuardReject("example.com", "bad-url");
  expectGuardReject("http://example.com:0/", "bad-port");
  expectGuardReject("http://example.com:99999/", "bad-port");
  expectGuardReject("http://example.com:abc/", "bad-port");
  expectGuardReject("http://[::1/", "bad-ipv6");
  expectGuardReject("http://exa_mple.com/", "bad-hostname");
});

test("H-SSRF-12", "canonicalizeHost: uppercase normalized to lowercase", () => {
  const h = canonicalizeHost("HTTPS://EXAMPLE.COM/Path");
  eq(h.hostname, "example.com", "hostname lowercased");
  eq(h.secure, true, "HTTPS detected case-insensitively");
  eq(h.port, null, "no explicit port");
  const h0 = canonicalizeHost("HTTP://EXAMPLE.COM/");
  eq(h0.secure, false, "HTTP stays insecure");
  const h2 = canonicalizeHost("http://MiXeD-Case.Example.COM:80/");
  eq(h2.hostname, "mixed-case.example.com", "mixed case lowercased");
  eq(h2.port, 80, "explicit port kept");
});

test("H-SSRF-12b", "canonicalizeHost: trailing dot normalized (spec expectation)", () => {
  // Spec expectation from the task: a trailing dot is normalized away.
  // If the module rejects it instead, this test FAILS and the deviation is
  // reported as a finding (fail-closed is safe, but differs from spec).
  const h = canonicalizeHost("http://example.com./");
  eq(h.hostname, "example.com", "trailing dot normalized");
});

// ---------------------------------------------------------------------------
// §3 — validateDestination
// ---------------------------------------------------------------------------
test("H-SSRF-13", "validateDestination: empty set DENY (empty-dns-result)", () => {
  const v = validateDestination("example.com", []);
  assert(!v.ok, `empty set must be DENY, got ${JSON.stringify(v)}`);
  if (!v.ok) eq(v.reason, "empty-dns-result", "empty set reason");
  const v2 = validateDestination("example.com", null);
  assert(!v2.ok, "null must be DENY");
  if (!v2.ok) eq(v2.reason, "resolver-no-answer", "null reason");
  const v3 = validateDestination("example.com", undefined);
  assert(!v3.ok, "undefined must be DENY");
  if (!v3.ok) eq(v3.reason, "resolver-no-answer", "undefined reason");
});

test("H-SSRF-14", "validateDestination: mixed public+private DENY whole set", () => {
  const cases: string[][] = [
    ["93.184.216.34", "10.0.0.1"],
    ["10.0.0.1", "93.184.216.34"], // order must not matter
    ["93.184.216.34", "2606:4700:4700::1111", "192.168.0.1"],
    ["93.184.216.34", "::ffff:127.0.0.1"], // mapped loopback hides in v6 form
    ["93.184.216.34", "64:ff9b::169.254.169.254"], // NAT64 to metadata IP
    ["93.184.216.34", "198.18.177.104"], // VM sandbox benchmarking range
  ];
  for (const ips of cases) {
    const v = validateDestination("mixed.test", ips);
    assert(!v.ok, `${JSON.stringify(ips)} must be DENY whole set, got ${JSON.stringify(v)}`);
  }
});

test("H-SSRF-15", "validateDestination: empty/malformed entry DENY", () => {
  const cases: Array<[unknown[], string]> = [
    [[""], "malformed-empty-entry"],
    [["93.184.216.34", ""], "malformed-empty-entry"],
    [["gggg::1"], "malformed-ip-literal"],
    [["93.184.216.34", "999.1.1.1"], "non-canonical-ipv4-literal"],
  ];
  for (const [ips, reason] of cases) {
    const v = validateDestination("bad.test", ips as string[]);
    assert(!v.ok, `${JSON.stringify(ips)} must be DENY, got ${JSON.stringify(v)}`);
    if (!v.ok) eq(v.reason, reason, `${JSON.stringify(ips)} reason`);
  }
});

test("H-SSRF-16", "validateDestination: all-public OK with first IP", () => {
  const v = validateDestination("example.com", ["93.184.216.34", "2606:4700:4700::1111"]);
  assert(v.ok, `all-public must be OK, got ${JSON.stringify(v)}`);
  if (v.ok) eq(v.ip, "93.184.216.34", "first IP returned");
  const v2 = validateDestination("example.com", ["::ffff:8.8.8.8"]);
  assert(v2.ok && v2.ip === "8.8.8.8", `mapped public returns extracted IPv4, got ${JSON.stringify(v2)}`);
});

// ---------------------------------------------------------------------------
// §4 — resolveAll semantics via STUB resolvers (no real DNS anywhere).
// NOTE: resolveAll() itself takes no resolver argument — it always uses
// node:dns. The stub tests below therefore exercise the same code paths
// the module exposes for injection (validateUrlForFetch / fetchGuardedOnce
// opts.resolver). A never-resolving injected resolver has NO timeout inside
// validateUrlForFetch/fetchGuardedOnce (the 5 s race lives only in the real
// resolveAll) — H-SSRF-18 records that honestly instead of faking a DENY.
// ---------------------------------------------------------------------------
function stubResolver(
  map: Record<string, string[]>,
  calls: string[],
): Resolver {
  return async (hostname: string): Promise<string[]> => {
    calls.push(hostname);
    if (!(hostname in map)) throw new DnsError("ENOTFOUND", `stub NXDOMAIN for ${hostname}`);
    return map[hostname]!;
  };
}

test("H-SSRF-17", "stub resolver NXDOMAIN / empty answer -> DENY, 0 connections", async () => {
  const calls: string[] = [];
  const resolver = stubResolver({ "empty.test": [] }, calls);
  const v = await validateUrlForFetch("http://nxdomain.test/", { resolver });
  assert(!v.ok, `NXDOMAIN must be DENY, got ${JSON.stringify(v)}`);
  if (!v.ok) eq(v.reason, "ENOTFOUND", "NXDOMAIN reason");
  const v2 = await validateUrlForFetch("http://empty.test/", { resolver });
  assert(!v2.ok, `empty answer must be DENY, got ${JSON.stringify(v2)}`);
  if (!v2.ok) eq(v2.reason, "empty-dns-result", "empty answer reason");
  eq(calls.join(","), "nxdomain.test,empty.test", "resolver called once per URL");
});

test("H-SSRF-18", "never-resolving stub resolver: DENY within ~5 s (or record no-timeout finding)", async () => {
  const never: Resolver = () => new Promise<string[]>(() => {});
  const calls: ConnectorRequest[] = [];
  const connector: Connector = async (req) => {
    calls.push(req);
    return { status: 200, headers: { get: () => null }, body: Readable.from([Buffer.from("x")]) };
  };
  const started = Date.now();
  const raced = await Promise.race([
    fetchGuardedOnce("http://never.test/", { resolver: never, connector }).then((v) => ({ done: true as const, v })),
    sleep(6000).then(() => ({ done: false as const, v: null as GuardedResponse | null })),
  ]);
  const elapsed = Date.now() - started;
  console.log(`    [H-SSRF-18] race settled after ${elapsed} ms, moduleDone=${raced.done}`);
  assert(elapsed < 8000, `race must settle by ~6 s, took ${elapsed} ms`);
  if (raced.done) {
    // Module denied on its own (e.g. a future timeout was added).
    assert(raced.v === null, `never-resolving stub must DENY (null), got status ${raced.v?.status}`);
  } else {
    // Honest finding: the injected-resolver path has no 5 s timeout —
    // only the real resolveAll() races at DNS_TIMEOUT_MS. The fetch is
    // still pending; it is abandoned here (process exits explicitly).
    throw new Error(
      "FINDING: fetchGuardedOnce with a never-resolving injected resolver did NOT deny within 6 s — " +
        "no timeout is applied to opts.resolver (the 5 s race exists only inside the real resolveAll). " +
        "Connector calls so far: " + calls.length,
    );
  }
  eq(calls.length, 0, "0 connections while DNS never resolves");
});

test("H-SSRF-19", "slow stub resolving to BLOCKED IP after ~6 s -> DENY at the 5 s DNS timeout, 0 connections (late result discarded)", async () => {
  const calls: ConnectorRequest[] = [];
  const connector: Connector = async (req) => {
    calls.push(req);
    return { status: 200, headers: { get: () => null }, body: Readable.from([Buffer.from("x")]) };
  };
  const slow: Resolver = async (hostname: string): Promise<string[]> => {
    await sleep(6000);
    void hostname;
    return ["10.0.0.5"]; // blocked — arrives LATE, must never be connected to
  };
  const started = Date.now();
  const res = await withTimeout(
    fetchGuardedOnce("http://slow.test/", { resolver: slow, connector }),
    15000,
    "fetchGuardedOnce(slow blocked stub)",
  );
  const elapsed = Date.now() - started;
  console.log(`    [H-SSRF-19] settled after ${elapsed} ms`);
  assert(res === null, `late blocked IP must DENY (null), got status ${res?.status}`);
  eq(calls.length, 0, "0 connections to the late blocked IP");
  // CORRECTED v2.3.23 (H-SSRF-18 fix): the injected resolver is cut off
  // by the 5 s DNS race — the guard must NOT await the full ~6 s. The
  // previous assertion (elapsed >= 5500) measured the OLD buggy
  // behavior (no timeout on the injected-resolver path). The late 6 s
  // resolution is discarded; the denial comes from the timeout.
  assert(elapsed >= 4500 && elapsed < 5500, `must deny at the 5 s DNS timeout, took ${elapsed} ms`);
});

test("H-SSRF-20", "stub A+AAAA both validated: mixed A public + AAAA private -> DENY", async () => {
  const calls: string[] = [];
  const mixed = stubResolver({ "mixed.test": ["93.184.216.34", "fd00::1"] }, calls);
  const v = await validateUrlForFetch("http://mixed.test/", { resolver: mixed });
  assert(!v.ok, `A public + AAAA private must be DENY, got ${JSON.stringify(v)}`);
  if (!v.ok) eq(v.reason, "ipv6-ula-fc00::/7", "mixed A+AAAA reason");
  const bothPublic = stubResolver(
    { "both.test": ["93.184.216.34", "2606:4700:4700::1111"] },
    calls,
  );
  const v2 = await validateUrlForFetch("http://both.test/", { resolver: bothPublic });
  assert(v2.ok, `A+AAAA both public must be OK, got ${JSON.stringify(v2)}`);
  if (v2.ok) eq(v2.ip, "93.184.216.34", "first (A) IP chosen");
});

// ---------------------------------------------------------------------------
// §5 — fetchGuardedOnce with STUB connector (records every argument)
// ---------------------------------------------------------------------------
type StubRoute = { status: number; location?: string; body?: string };
function makeStubConnector(routes: Record<string, StubRoute>): { calls: ConnectorRequest[]; connector: Connector } {
  const calls: ConnectorRequest[] = [];
  const connector: Connector = async (req) => {
    calls.push(req);
    const host = new URL(req.url).hostname;
    const route = routes[host] ?? { status: 404, body: "stub-404" };
    return {
      status: route.status,
      headers: {
        get: (name: string): string | null =>
          name.toLowerCase() === "location" ? (route.location ?? null) : null,
      },
      body: Readable.from([Buffer.from(route.body ?? "")]),
    };
  };
  return { calls, connector };
}

async function readBody(res: GuardedResponse): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of res.body) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks).toString("utf-8");
}

/** Minimal redirect follower built on fetchGuardedOnce — one guarded hop per redirect, re-validating each hop. */
async function followRedirects(
  startUrl: string,
  opts: { resolver: Resolver; connector: Connector; accept?: string },
): Promise<{ final: GuardedResponse | null; hops: GuardedResponse[]; deniedAtHop: number }> {
  let url = startUrl;
  const hops: GuardedResponse[] = [];
  for (let i = 0; i <= MAX_REDIRECT_HOPS; i++) {
    const res = await fetchGuardedOnce(url, opts);
    if (!res) return { final: null, hops, deniedAtHop: i };
    hops.push(res);
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      res.body.destroy();
      if (!loc) return { final: res, hops, deniedAtHop: -1 };
      url = new URL(loc, url).toString();
      continue;
    }
    return { final: res, hops, deniedAtHop: -1 };
  }
  return { final: null, hops, deniedAtHop: -2 }; // exceeded MAX_REDIRECT_HOPS
}

const CHAIN_MAP: Record<string, string[]> = {
  "first.test": ["93.184.216.34"],
  "second.test": ["93.184.216.35"],
  "blocked.test": ["10.0.0.9"],
  "rdap.test": ["93.184.216.36"],
  "rdap2.test": ["93.184.216.37"],
};

test("H-SSRF-21", "redirect chain: hop-2 connector called with pinnedIp = hop-2 validated IP", async () => {
  const resolverCalls: string[] = [];
  const resolver = stubResolver(CHAIN_MAP, resolverCalls);
  const stub = makeStubConnector({
    "first.test": { status: 301, location: "http://second.test/", body: "" },
    "second.test": { status: 200, body: "hop2-ok" },
  });
  const { final, hops, deniedAtHop } = await followRedirects("http://first.test/", {
    resolver,
    connector: stub.connector,
  });
  eq(deniedAtHop, -1, "chain must not be denied");
  eq(hops.length, 2, "two hops");
  assert(final !== null, "final response must exist");
  eq(final!.status, 200, "final status 200");
  eq(await readBody(final!), "hop2-ok", "final body");
  eq(stub.calls.length, 2, "connector called once per hop");
  eq(stub.calls[0]!.hostname, "first.test", "hop-1 hostname");
  eq(stub.calls[0]!.pinnedIp, "93.184.216.34", "hop-1 pinnedIp = validated hop-1 IP");
  eq(stub.calls[1]!.hostname, "second.test", "hop-2 hostname");
  eq(stub.calls[1]!.pinnedIp, "93.184.216.35", "hop-2 pinnedIp = validated hop-2 IP (not hostname)");
  assert(stub.calls[1]!.url === "http://second.test/", "hop-2 url is the redirect target");
  eq(resolverCalls.join(","), "first.test,second.test", "resolver called once per hop");
});

test("H-SSRF-22", "redirect to blocked IP: DENY at hop-2, connector NOT called for hop-2", async () => {
  const resolverCalls: string[] = [];
  const resolver = stubResolver(CHAIN_MAP, resolverCalls);
  const stub = makeStubConnector({
    "first.test": { status: 301, location: "http://blocked.test/", body: "" },
    "blocked.test": { status: 200, body: "must-never-arrive" },
  });
  const { final, hops, deniedAtHop } = await followRedirects("http://first.test/", {
    resolver,
    connector: stub.connector,
  });
  assert(final === null, "chain to blocked IP must end DENIED (null)");
  eq(deniedAtHop, 1, "denied at hop-2 (index 1)");
  eq(hops.length, 1, "only hop-1 completed");
  eq(stub.calls.length, 1, "connector called ONLY for hop-1, never for blocked hop-2");
  eq(stub.calls[0]!.hostname, "first.test", "only hop-1 was connected");
  eq(resolverCalls.join(","), "first.test,blocked.test", "resolver WAS consulted for hop-2 (then denied)");
});

test("H-SSRF-25", "RDAP redirect: same re-validation per hop with RDAP accept header", async () => {
  const resolverCalls: string[] = [];
  const resolver = stubResolver(CHAIN_MAP, resolverCalls);
  const stub = makeStubConnector({
    "rdap.test": { status: 301, location: "http://rdap2.test/", body: "" },
    "rdap2.test": { status: 200, body: "{}" },
  });
  const { final, hops, deniedAtHop } = await followRedirects("http://rdap.test/", {
    resolver,
    connector: stub.connector,
    accept: GUARD_ACCEPT_RDAP,
  });
  eq(deniedAtHop, -1, "RDAP chain must not be denied");
  eq(hops.length, 2, "two RDAP hops");
  assert(final !== null && final.status === 200, "RDAP final 200");
  eq(stub.calls[1]!.pinnedIp, "93.184.216.37", "RDAP hop-2 pinnedIp = validated hop-2 IP");
  assert(stub.calls.every((c) => c.accept === GUARD_ACCEPT_RDAP), "RDAP accept header on every hop");
});

test("H-SSRF-24", "IP literal URL: resolver NOT called, connector pinned to the literal", async () => {
  const resolverCalls: string[] = [];
  const resolver = stubResolver({}, resolverCalls);
  const stub = makeStubConnector({ "8.8.8.8": { status: 200, body: "literal-ok" } });
  const res = await fetchGuardedOnce("http://8.8.8.8/", { resolver, connector: stub.connector });
  assert(res !== null, "public IP literal must fetch");
  eq(res!.pinnedIp, "8.8.8.8", "pinnedIp = the literal itself");
  eq(res!.status, 200, "status 200");
  eq(await readBody(res!), "literal-ok", "body");
  eq(resolverCalls.length, 0, "resolver NOT called for IP literal");
  eq(stub.calls.length, 1, "connector called once");
  // Blocked literal: denied without DNS and without a connection.
  const stub2 = makeStubConnector({});
  const res2 = await fetchGuardedOnce("http://169.254.169.254/latest/meta-data/", {
    resolver,
    connector: stub2.connector,
  });
  assert(res2 === null, "metadata IP literal must be DENY");
  eq(stub2.calls.length, 0, "0 connections to metadata IP");
  eq(resolverCalls.length, 0, "resolver still 0 calls");
});

test("H-SSRF-26", "non-standard port: DENY before resolver is called", async () => {
  const resolverCalls: string[] = [];
  const resolver = stubResolver(CHAIN_MAP, resolverCalls);
  const stub = makeStubConnector({ "example.com": { status: 200, body: "x" } });
  const res = await fetchGuardedOnce("http://first.test:8080/", { resolver, connector: stub.connector });
  assert(res === null, "http:8080 must be DENY");
  eq(resolverCalls.length, 0, "resolver 0 calls for port-denied URL");
  eq(stub.calls.length, 0, "connector 0 calls for port-denied URL");
  const res2 = await fetchGuardedOnce("https://first.test:8443/", { resolver, connector: stub.connector });
  assert(res2 === null, "https:8443 must be DENY");
  eq(resolverCalls.length, 0, "resolver still 0 calls");
  eq(stub.calls.length, 0, "connector still 0 calls");
});

// ---------------------------------------------------------------------------
// §6 — Pinning mechanism: call the REAL nodeConnector directly (H-SSRF-23
// style). A disposable local HTTP server listens on 127.0.0.1:random port.
// Hostname "pinned.test" does NOT exist in DNS — a 200 proves the
// connection used the pinned IP, not hostname resolution.
// ---------------------------------------------------------------------------
async function startLocalServer(): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("pinned-ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  return { server, port };
}

async function readNodeBody(res: { body: Readable }): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of res.body as AsyncIterable<Buffer>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf-8");
}

test("H-SSRF-23a", "pinning: nodeConnector reaches local server via pinnedIp, hostname never resolved", async () => {
  const { server, port } = await startLocalServer();
  try {
    const res = await withTimeout(
      nodeConnector({
        url: `http://pinned.test:${port}/`,
        hostname: "pinned.test",
        pinnedIp: "127.0.0.1",
        port,
        secure: false,
        signal: AbortSignal.timeout(5000),
        accept: "text/html",
      }),
      8000,
      "nodeConnector(pinned 127.0.0.1)",
    );
    eq(res.status, 200, "pinned connection status 200");
    eq(await readNodeBody(res), "pinned-ok", "pinned connection body");
    // "pinned.test" has no DNS record (and VM DNS would answer 198.18/15
    // if asked) — success here proves the lookup was bypassed entirely.
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("H-SSRF-23b", "pinning: wrong pinnedIp (127.0.0.2) fails ECONNREFUSED, never reaches another host", async () => {
  const { server, port } = await startLocalServer();
  try {
    let caught: unknown = null;
    try {
      await withTimeout(
        nodeConnector({
          url: `http://pinned.test:${port}/`,
          hostname: "pinned.test",
          pinnedIp: "127.0.0.2",
          port,
          secure: false,
          signal: AbortSignal.timeout(5000),
          accept: "text/html",
        }),
        8000,
        "nodeConnector(pinned 127.0.0.2)",
      );
    } catch (err) {
      caught = err;
    }
    assert(caught !== null, "pinnedIp 127.0.0.2 must fail (nothing listens there)");
    const code = (caught as NodeJS.ErrnoException)?.code;
    eq(code, "ECONNREFUSED", "failure is ECONNREFUSED, not a success to another host");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

// ---------------------------------------------------------------------------
// §7 — validateUrlForFetch (K-1 preflight): no connection is opened
// ---------------------------------------------------------------------------
test("H-SSRF-28", "validateUrlForFetch: valid URL -> ok + ip (stub resolver, no connection)", async () => {
  const resolverCalls: string[] = [];
  const resolver = stubResolver({ "example.com": ["93.184.216.34"] }, resolverCalls);
  const v = await validateUrlForFetch("https://example.com/path?q=1", { resolver });
  assert(v.ok, `valid URL must be ok, got ${JSON.stringify(v)}`);
  if (v.ok) {
    eq(v.ip, "93.184.216.34", "preflight ip");
    eq(v.host.hostname, "example.com", "preflight hostname");
    eq(v.host.secure, true, "preflight secure");
  }
  eq(resolverCalls.join(","), "example.com", "resolver called once");
});

test("H-SSRF-29", "validateUrlForFetch: blocked IP literal -> ok:false, resolver 0 calls", async () => {
  const resolverCalls: string[] = [];
  const resolver = stubResolver({}, resolverCalls);
  const cases: Array<[string, string]> = [
    ["http://169.254.169.254/latest/meta-data/", "ipv4-link-local-169.254/16"],
    ["http://10.0.0.5/", "ipv4-private-10/8"],
    ["http://[::1]/", "ipv6-loopback-::1"],
    ["http://[::ffff:127.0.0.1]/", "ipv4-loopback-127/8"],
    ["http://[64:ff9b::a9fe:a9fe]/", "ipv4-link-local-169.254/16"],
  ];
  for (const [url, reason] of cases) {
    const v = await validateUrlForFetch(url, { resolver });
    assert(!v.ok, `${url} must be ok:false, got ${JSON.stringify(v)}`);
    if (!v.ok) eq(v.reason, reason, `${url} reason`);
  }
  eq(resolverCalls.length, 0, "resolver 0 calls for IP literals");
});

test("H-SSRF-30", "validateUrlForFetch: non-standard port / userinfo -> ok:false, resolver 0 calls", async () => {
  const resolverCalls: string[] = [];
  const resolver = stubResolver({ "example.com": ["93.184.216.34"] }, resolverCalls);
  const v = await validateUrlForFetch("http://example.com:8080/", { resolver });
  assert(!v.ok, "http:8080 preflight must be ok:false");
  if (!v.ok) eq(v.reason, "port-denied", "port reason");
  const v2 = await validateUrlForFetch("http://user@example.com/", { resolver });
  assert(!v2.ok, "userinfo preflight must be ok:false");
  if (!v2.ok) eq(v2.reason, "userinfo-denied", "userinfo reason");
  const v3 = await validateUrlForFetch("ftp://example.com/", { resolver });
  assert(!v3.ok, "ftp preflight must be ok:false");
  if (!v3.ok) eq(v3.reason, "bad-url", "ftp reason");
  eq(resolverCalls.length, 0, "resolver 0 calls — preflight denies before DNS");
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const results: Array<{ id: string; name: string; pass: boolean; error?: string }> = [];

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
