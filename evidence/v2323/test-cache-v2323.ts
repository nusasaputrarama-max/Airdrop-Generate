// test-cache-v2323.ts — Harness H-CACHE-xx: cache correctness/isolation
// for the fetch path (D-05, F-016/F-017), added by the implementation
// agent AFTER the v2.3.23 matrix (post-matrix D-05 work on branch
// `development`).
//
// Tests the REAL function site/server/src/actions.ts `fetchText` (exported
// for harness verification; NOT an action) with a stub resolver +
// stub connector injected through its test-only `testHooks` parameter.
// The REAL guard still runs: validateUrlForFetch resolves the stub
// hostname via the stub resolver (accepted public IP 93.184.216.34),
// fetchGuardedOnce validates every hop, and readCappedStream enforces
// the cap. NO real DNS, NO real network, NO request to any public host
// or internal/metadata network. The stub connector serves canned bodies.
//
// CAP SEMANTICS (verified, not assumed): readCappedStream THROWS when
// the body exceeds the cap — the whole fetch then fails (null). The cap
// is a rejection threshold, NOT a truncation: a 500 KB body with a
// 400 KB cap returns null, not 400 KB of text. Bodies below are sized
// accordingly (100 KB always fits; 350 KB fits 400 KB but not 300 KB).
//
//   H-CACHE-00  Sanity: same URL + same cap twice (100 KB body) ->
//               second call served from cache (connector called
//               exactly once). Proves the fix did not disable caching.
//   H-CACHE-06  F-017 cap-key, isolated (400 KB -> 300 KB, 350 KB
//               body): first fetch succeeds and caches; second fetch
//               (smaller cap) must MISS the cache, re-fetch, and FAIL
//               (350 KB > 300 KB cap) -> null. Bug (URL-only key):
//               cache hit returned the 350 KB text, bypassing the
//               script caller's 300 KB cap.
//   H-CACHE-05  F-017 + F-016 combined (300 KB -> 400 KB, 350 KB
//               body): first fetch fails (350 KB > 300 KB cap); second
//               fetch (larger cap) must re-fetch and SUCCEED (350 KB
//               text). Bug (URL-only key + cached null): second call
//               returned the cached null.
//   H-CACHE-03  F-016 null-cache, isolated (same cap 400 KB, 100 KB
//               body): connector fails twice (both in-call retries),
//               fetchText -> null; then connector recovers, fetchText
//               -> body. Bug (null cached): second call returned null.
//   H-CACHE-01  (round 2) benign -> malicious within TTL: the guard
//               preflight runs BEFORE the cache on every call, so a
//               cached URL whose host now resolves to a BLOCKED IP is
//               DENIED, not served from cache. Content-change staleness
//               (same IP, different body) is NOT detected within the
//               TTL — documented residual, pending the remove-cache
//               branch (owner decision K-1 / G-F, NOT authorized here).
//   H-CACHE-02  (round 2) freshness display: FetchResult carries
//               `fetchedAt` (epoch ms of the network fetch) and
//               `fromCache` (true on a cache hit, original fetchedAt
//               preserved), so a display can show how old the copy is.
//   H-CACHE-04  (round 2) re-check bypass / force-fresh: fetchText
//               `forceFresh` skips the cache READ (guard still runs,
//               fresh result refreshes the cache); threaded through
//               analyze/runCheck and the checkLink request contract
//               (optional `forceFresh`, default false).
//
// NOT covered here (remain open, F-016 partially addressed):
//   H-CACHE-01 remove-cache branch (purge a cached entry when its host
//               turns malicious) — design recommendation awaiting owner
//               decision K-1 / G-F, NOT authorized for implementation
//               here. What IS covered: preflight re-validation on every
//               cache access (01a) + TTL-bounded staleness documented
//               as the accepted residual (01b).
//
// Run:  bun evidence/v2323/test-cache-v2323.ts   (from worktree root)
// Exit 0 = all PASS; exit 1 = any FAIL. VM evidence only — not staging.

import { Readable } from "node:stream";
import { Actions, fetchText } from "../../site/server/src/actions";
import type { Connector } from "../../site/server/src/ssrf-guard";

// ---------------------------------------------------------------------------
// Minimal test framework (mirrors test-ssrf-guard-v2323.ts).
// ---------------------------------------------------------------------------
interface TestCase {
  id: string;
  name: string;
  run: () => Promise<void> | void;
}
const tests: TestCase[] = [];
const results: { id: string; name: string; pass: boolean; error?: string }[] = [];
function test(id: string, name: string, run: () => Promise<void> | void): void {
  tests.push({ id, name, run });
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function eq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ---------------------------------------------------------------------------
// Stubs: resolver returns an accepted public IP; connector serves canned
// bodies and can be told to fail the next N invocations (connection
// failure -> fetchGuardedOnce returns null -> fetchTextOnce returns null).
// ---------------------------------------------------------------------------
const PUBLIC_IP = "93.184.216.34";
const resolver = async (_hostname: string): Promise<string[]> => [PUBLIC_IP];

function makeConnector(opts: {
  body: string;
  bodyFn?: () => string;
  failTimes?: number;
  calls: string[];
}): Connector {
  let remainingFails = opts.failTimes ?? 0;
  return async (req) => {
    opts.calls.push(req.url);
    if (remainingFails > 0) {
      remainingFails -= 1;
      throw new Error("stub connection failure");
    }
    const body = opts.bodyFn ? opts.bodyFn() : opts.body;
    return {
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null,
      },
      body: Readable.from([Buffer.from(body)]),
    };
  };
}

const BODY_100K = "A".repeat(100_000);
const BODY_350K = "B".repeat(350_000);

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------
test("H-CACHE-00", "same URL + same cap twice -> served from cache (1 connector call)", async () => {
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector({ body: BODY_100K, calls }) };
  const url = "http://cache.test/c00";
  const first = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(first !== null, "first fetch must succeed");
  eq(first!.text.length, 100_000, "first fetch text length");
  const second = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(second !== null, "second fetch must succeed (cached)");
  eq(second!.text.length, 100_000, "second fetch text length");
  eq(calls.length, 1, "connector must be called exactly once (second served from cache)");
});

test("H-CACHE-06", "F-017 400 KB -> 300 KB: smaller cap must NOT get the cached 350 KB text", async () => {
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector({ body: BODY_350K, calls }) };
  const url = "http://cache.test/c06";
  const big = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(big !== null, "400 KB fetch must succeed");
  eq(big!.text.length, 350_000, "400 KB fetch text length");
  // 300 KB cap: cache must MISS (different key), fresh fetch exceeds the
  // 300 KB cap -> readCappedStream throws -> null (after one in-call retry).
  const small = await fetchText(url, 300_000, undefined, undefined, hooks);
  assert(
    small === null,
    `300 KB fetch must fail (350 KB body exceeds the 300 KB cap), not return cached text (got ${small === null ? "null" : `${small.text.length} chars`})`,
  );
  eq(calls.length, 3, "connector calls: 1 (400 KB success) + 2 (300 KB attempts, both over cap)");
});

test("H-CACHE-05", "F-017+F-016 300 KB -> 400 KB: larger cap must re-fetch and succeed", async () => {
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector({ body: BODY_350K, calls }) };
  const url = "http://cache.test/c05";
  // 300 KB cap: 350 KB body exceeds it -> null (after one in-call retry).
  // That null must NOT be cached.
  const small = await fetchText(url, 300_000, undefined, undefined, hooks);
  assert(
    small === null,
    `300 KB fetch must fail (350 KB body exceeds the 300 KB cap); got ${small === null ? "null" : `${small.text.length} chars`}`,
  );
  const big = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(big !== null, "400 KB fetch must succeed (no cached null in the way)");
  eq(big!.text.length, 350_000, "400 KB fetch text length");
  eq(calls.length, 3, "connector calls: 2 (300 KB attempts, both over cap) + 1 (400 KB success)");
});

test("H-CACHE-03", "F-016 failure -> recovery: failed fetch is NOT cached as null", async () => {
  const calls: string[] = [];
  // failTimes=2: fetchText retries once internally (500 ms backoff), so the
  // first fetchText call consumes two failing connector invocations.
  const hooks = { resolver, connector: makeConnector({ body: BODY_100K, failTimes: 2, calls }) };
  const url = "http://cache.test/c03";
  const failed = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(
    failed === null,
    `first fetch must fail (connector down); got ${failed === null ? "null" : `${failed.text.length} chars`}`,
  );
  const recovered = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(recovered !== null, "second fetch must succeed after recovery (null must not be cached)");
  eq(recovered!.text.length, 100_000, "recovered fetch text length");
  eq(calls.length, 3, "connector calls: 2 failed attempts + 1 recovery (no cached-null shortcut)");
});

// ---------------------------------------------------------------------------
// Round 2 (D-05 remainder): H-CACHE-01/02/04.
// ---------------------------------------------------------------------------

// Mutable resolver: the stub hostname's IP can be flipped mid-test to
// simulate a host turning malicious (benign public IP -> blocked IP).
let mutableIp = PUBLIC_IP;
const mutableResolver = async (_hostname: string): Promise<string[]> => [mutableIp];

test("H-CACHE-01a", "F-016 guard-before-cache: cached URL whose IP turns BLOCKED is DENIED, not served", async () => {
  const calls: string[] = [];
  const hooks = { resolver: mutableResolver, connector: makeConnector({ body: BODY_100K, calls }) };
  const url = "http://cache.test/c01a";
  mutableIp = PUBLIC_IP;
  const first = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(first !== null, "first fetch (benign IP) must succeed");
  eq(calls.length, 1, "connector called once for the first fetch");
  // Host turns malicious: same hostname now resolves to a blocked IP.
  mutableIp = "10.0.0.5";
  try {
    const denied = await fetchText(url, 400_000, undefined, undefined, hooks);
    assert(
      denied === null,
      `cached URL with blocked IP must be DENIED (got ${denied === null ? "null" : `${denied.text.length} chars from cache`})`,
    );
    eq(calls.length, 1, "denied fetch must NOT call the connector (preflight runs before cache)");
  } finally {
    mutableIp = PUBLIC_IP;
  }
  // The cached entry itself survives the deny (not poisoned): good IP again
  // serves the cached copy.
  const again = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(again !== null, "good IP again must serve the cached copy");
  eq(again!.fromCache, true, "third fetch must be a cache hit");
  eq(calls.length, 1, "no new connector call for the cache hit");
});

test("H-CACHE-01b", "DOCUMENTED RESIDUAL (pending K-1): content change within TTL is NOT picked up", async () => {
  const calls: string[] = [];
  let bodyVersion = 1;
  const hooks = {
    resolver,
    connector: makeConnector({ body: "", bodyFn: () => `V${bodyVersion}`.repeat(25_000), calls }),
  };
  const url = "http://cache.test/c01b";
  const first = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(first !== null && first.text.startsWith("V1"), "first fetch must return V1 body");
  bodyVersion = 2;
  const second = await fetchText(url, 400_000, undefined, undefined, hooks);
  // With the cache retained (K-1 undecided), the stale V1 copy is served
  // until the 10-minute TTL expires. This is the ACCEPTED residual: the
  // remove-cache branch (purge on content/IP change) needs owner decision
  // K-1 and is NOT implemented here. The guard preflight (01a) still
  // protects against IP-level turn-malicious.
  assert(second !== null && second.text.startsWith("V1"), "within TTL the stale V1 copy is served (documented)");
  eq(second!.fromCache, true, "second fetch must be a cache hit");
  eq(calls.length, 1, "no re-fetch within TTL");
});

test("H-CACHE-02a", "freshness display: first fetch fromCache=false + fetchedAt in window; hit preserves fetchedAt", async () => {
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector({ body: BODY_100K, calls }) };
  const url = "http://cache.test/c02a";
  const before = Date.now();
  const first = await fetchText(url, 400_000, undefined, undefined, hooks);
  const after = Date.now();
  assert(first !== null, "first fetch must succeed");
  eq(first!.fromCache, false, "first fetch must NOT be from cache");
  assert(
    first!.fetchedAt >= before && first!.fetchedAt <= after,
    `fetchedAt must be within the fetch window [${before}, ${after}], got ${first!.fetchedAt}`,
  );
  const second = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(second !== null, "second fetch must succeed");
  eq(second!.fromCache, true, "second fetch must be from cache");
  eq(second!.fetchedAt, first!.fetchedAt, "cache hit must preserve the original fetchedAt");
  eq(second!.text, first!.text, "cache hit text must equal the fetched text");
});

test("H-CACHE-02b", "freshness display: separate cap keys carry separate fetchedAt", async () => {
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector({ body: BODY_100K, calls }) };
  const url = "http://cache.test/c02b";
  const big = await fetchText(url, 400_000, undefined, undefined, hooks);
  const small = await fetchText(url, 300_000, undefined, undefined, hooks);
  assert(big !== null && small !== null, "both cap fetches must succeed (100 KB fits both caps)");
  eq(big!.fromCache, false, "400 KB fetch must be fresh");
  eq(small!.fromCache, false, "300 KB fetch must be fresh (separate cache key)");
  assert(big!.fetchedAt > 0 && small!.fetchedAt > 0, "both results must carry fetchedAt");
  eq(calls.length, 2, "two connector calls (one per cap key)");
});

test("H-CACHE-04a", "forceFresh: bypasses cache read, returns fresh body, refreshes the entry", async () => {
  const calls: string[] = [];
  let bodyVersion = 1;
  const hooks = {
    resolver,
    connector: makeConnector({ body: "", bodyFn: () => `V${bodyVersion}`.repeat(25_000), calls }),
  };
  const url = "http://cache.test/c04a";
  const first = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(first !== null && first.text.startsWith("V1"), "first fetch must return V1 body");
  eq(first!.fromCache, false, "first fetch must be fresh");
  bodyVersion = 2;
  const fresh = await fetchText(url, 400_000, undefined, undefined, hooks, { forceFresh: true });
  assert(fresh !== null && fresh.text.startsWith("V2"), "forceFresh must return the fresh V2 body");
  eq(fresh!.fromCache, false, "forceFresh result must NOT be from cache");
  // The fresh result refreshes the cache: a normal fetch now serves V2.
  const after = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(after !== null && after.text.startsWith("V2"), "after forceFresh the cache must hold V2");
  eq(after!.fromCache, true, "fetch after forceFresh must be a cache hit");
  eq(calls.length, 2, "connector calls: 1 initial + 1 forceFresh (no call for the final hit)");
});

test("H-CACHE-04b", "forceFresh still runs the guard: blocked IP -> null", async () => {
  const calls: string[] = [];
  const hooks = { resolver: mutableResolver, connector: makeConnector({ body: BODY_100K, calls }) };
  const url = "http://cache.test/c04b";
  mutableIp = "10.0.0.5";
  try {
    const denied = await fetchText(url, 400_000, undefined, undefined, hooks, { forceFresh: true });
    assert(denied === null, "forceFresh with blocked IP must be denied");
    eq(calls.length, 0, "denied forceFresh must NOT call the connector");
  } finally {
    mutableIp = PUBLIC_IP;
  }
});

test("H-CACHE-04c", "forceFresh on an uncached URL behaves like a normal fetch", async () => {
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector({ body: BODY_100K, calls }) };
  const url = "http://cache.test/c04c";
  const fresh = await fetchText(url, 400_000, undefined, undefined, hooks, { forceFresh: true });
  assert(fresh !== null, "forceFresh on uncached URL must succeed");
  eq(fresh!.fromCache, false, "forceFresh result must NOT be from cache");
  eq(fresh!.text.length, 100_000, "forceFresh text length");
  eq(calls.length, 1, "exactly one connector call");
});

test("H-CACHE-04d", "checkLink contract accepts optional forceFresh (omitted = undefined, treated as false)", async () => {
  const withFlag: any = (Actions.checkLink as any).request.parse({
    url: "http://cache.test/x",
    forceFresh: true,
  });
  eq(withFlag.forceFresh, true, "forceFresh:true must parse through");
  const withoutFlag: any = (Actions.checkLink as any).request.parse({ url: "http://cache.test/x" });
  eq(withoutFlag.forceFresh, undefined, "forceFresh omitted must parse as undefined (handler treats it as false)");
  eq(withoutFlag.url, "http://cache.test/x", "url must parse through unchanged");
});

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
