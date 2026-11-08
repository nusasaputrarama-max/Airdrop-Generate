// test-checklink-killswitch-v2323.ts — Harness H-KILL-xx: F-019 —
// server-side kill-switch for `checkLink` (round 2, D-03).
//
// Tests the REAL `runCheck` / `checkLink` handler from
// site/server/src/actions.ts against a disposable DB built by applying
// the REAL migrations 0001-0007 (see harness-helpers.ts). All fetches
// are hermetic: a stub resolver (93.184.216.34 for any hostname) + a
// stub connector that serves a fixed benign HTML page and a fixed RDAP
// JSON — no real network is touched (testHooks).
//
// The kill-switch is module state: `let CHECKLINK_ENABLED = false`
// (default DISABLED on this branch) + test-only `setCheckLinkEnabled`.
// While disabled, runCheck rejects BEFORE normalizeUrl, rate limit,
// lease, fetch or DB write — the disabled state is enforced by code.
//
// Run:  bun evidence/v2323/test-checklink-killswitch-v2323.ts  (from worktree root)
// Exit 0 = all PASS; exit 1 = any FAIL. VM evidence only — not staging.

import {
  Actions,
  isCheckLinkEnabled,
  runCheck,
  setCheckLinkEnabled,
} from "../../site/server/src/actions";
import {
  countRows,
  localViewer,
  makeMigratedDb,
  mkCtx,
} from "./harness-helpers";
import { Readable } from "node:stream";

// ---------------------------------------------------------------------------
// Minimal test framework (mirrors test-cache-v2323.ts).
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
// Hermetic stubs: benign page + benign RDAP (registered 2020, registrar).
// ---------------------------------------------------------------------------
const PAGE_HTML =
  "<html><head><title>Kill Test</title></head>" +
  "<body><p>Hello, world.</p><a href=\"https://github.com/x\">GitHub</a></body></html>";
const RDAP_JSON = JSON.stringify({
  events: [{ eventAction: "registration", eventDate: "2020-01-15T00:00:00Z" }],
  entities: [
    {
      roles: ["registrar"],
      vcardArray: ["vcard", [["fn", {}, "x", "Example Registrar"]]],
    },
  ],
});

const connectorCalls: string[] = [];
const hooks = {
  // Resolver MUST return string[] (type Resolver) — a bare string would
  // be iterated char-by-char by the guard and denied (fail-closed).
  resolver: async (_host: string): Promise<string[]> => ["93.184.216.34"],
  connector: async (req: { url: string }) => {
    connectorCalls.push(req.url);
    const isRdap = req.url.startsWith("https://rdap.org/");
    const bodyText = isRdap ? RDAP_JSON : PAGE_HTML;
    const contentType = isRdap ? "application/json" : "text/html; charset=utf-8";
    return {
      status: 200,
      headers: {
        get: (n: string) => (n.toLowerCase() === "content-type" ? contentType : null),
      },
      body: Readable.from([Buffer.from(bodyText)]),
    };
  },
};

const tdb = makeMigratedDb();
const ctx = mkCtx(tdb.db, localViewer("principal-A", false));
const checkLink: any = (Actions as any).checkLink;

async function expectDisabledError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  throw new Error("expected the call to throw, but it returned");
}

test("H-KILL-01", "disabled (default): checkLink handler throws the kill-switch error, 0 side effects", async () => {
  setCheckLinkEnabled(false);
  eq(isCheckLinkEnabled(), false, "flag must start disabled");
  const msg = await expectDisabledError(checkLink.handler(ctx, { url: "http://kill.test/page" }));
  assert(msg.includes("nonaktif"), `error must say the checker is disabled (got: ${msg})`);
  eq(countRows(tdb.dbPath, "checks"), 0, "no check row may be stored while disabled");
  eq(countRows(tdb.dbPath, "rate_limits"), 0, "no rate-limit row may be consumed while disabled");
  eq(countRows(tdb.dbPath, "scan_leases"), 0, "no scan lease may be taken while disabled");
  eq(connectorCalls.length, 0, "no fetch may happen while disabled");
  // Gate precedes URL parsing: even an empty URL gets the disabled error.
  const msg2 = await expectDisabledError(checkLink.handler(ctx, { url: "" }));
  assert(msg2.includes("nonaktif"), `disabled + empty url must still be the disabled error (got: ${msg2})`);
});

test("H-KILL-02", "enabled: runCheck performs the full scan hermetically and stores the row", async () => {
  setCheckLinkEnabled(true);
  eq(isCheckLinkEnabled(), true, "flag must be enabled");
  const before = connectorCalls.length;
  const check = await runCheck(ctx, "http://kill.test/page", { testHooks: hooks });
  eq(check.domain, "kill.test", "stored check domain");
  eq(check.verdict, "lebih_aman", "benign page + old domain + social link => lebih_aman");
  eq(countRows(tdb.dbPath, "checks"), 1, "exactly 1 check row after an enabled scan");
  assert(connectorCalls.length > before, "an enabled scan must actually fetch");
  assert(
    connectorCalls.some((u) => u.includes("kill.test")),
    `page fetch must be called (calls: ${JSON.stringify(connectorCalls)})`,
  );
  assert(
    connectorCalls.some((u) => u.startsWith("https://rdap.org/domain/kill.test")),
    `RDAP lookup must be called (calls: ${JSON.stringify(connectorCalls)})`,
  );
});

test("H-KILL-03", "enabled: guard-blocked URL (non-standard port) still stores a row (scan ran, page null)", async () => {
  const before = countRows(tdb.dbPath, "checks");
  const callsBefore = connectorCalls.length;
  const check = await runCheck(ctx, "http://kill.test:8080/x", { testHooks: hooks });
  eq(check.domain, "kill.test", "stored check domain for the blocked URL");
  eq(check.page_title, null, "guard-denied page must not be fetched (page null)");
  eq(countRows(tdb.dbPath, "checks"), before + 1, "an enabled scan stores a row even when the page is guard-denied");
  // No new connector call at all: the page is denied at preflight, and
  // the RDAP lookup for kill.test is served from the cache populated by
  // H-KILL-02 (RDAP_CACHE_TTL 1 h) — so nothing is fetched for this scan.
  const newCalls = connectorCalls.slice(callsBefore);
  eq(newCalls.length, 0, `no fetch may happen for a guard-denied page (got: ${JSON.stringify(newCalls)})`);
});

test("H-KILL-04", "flag is dynamic: re-disable makes the handler throw again", async () => {
  setCheckLinkEnabled(false);
  eq(isCheckLinkEnabled(), false, "flag must be disabled again");
  const msg = await expectDisabledError(checkLink.handler(ctx, { url: "http://kill.test/page" }));
  assert(msg.includes("nonaktif"), `re-disabled handler must throw the disabled error (got: ${msg})`);
  eq(countRows(tdb.dbPath, "checks"), 2, "no new row may be stored after re-disabling");
});

test("H-KILL-05", "enabled: handler with an empty URL throws the normalize error (not the disabled error)", async () => {
  setCheckLinkEnabled(true);
  const msg = await expectDisabledError(checkLink.handler(ctx, { url: "" }));
  assert(
    msg.includes("Tempel dulu"),
    `enabled + empty url must reach URL parsing (got: ${msg})`,
  );
  assert(!msg.includes("nonaktif"), `enabled + empty url must NOT be the disabled error (got: ${msg})`);
});

// ---------------------------------------------------------------------------
// Runner (mirrors test-cache-v2323.ts). Flag restored to disabled at end.
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
setCheckLinkEnabled(false);
tdb.close();
process.exit(failed.length === 0 ? 0 : 1);
