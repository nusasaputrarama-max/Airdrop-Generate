// test-legacy-export-v2323.ts — Harness H-LEG-xx: F-005 gate §5 —
// `exportLegacyChecks` (round 2, D-01/D-04 remainder).
//
// Tests the REAL function site/server/src/actions.ts `exportLegacyChecks`
// (exported for harness verification; NOT an action — not in the Actions
// map, not invocable from the client) against a disposable DB built by
// applying the REAL migrations 0001-0007 (see harness-helpers.ts).
// Fixture: 2 legacy rows (owner_user_id NULL) + 1 row owned by
// local:u-principal-A.
//
// Gate §5 (policy L-A default): only the SPACE OWNER —
// ctx.viewer.isOwner === true, an identity the runtime verifies — may
// read legacy rows. Everyone else gets [] (fail-closed, no leak about
// whether legacy rows exist). L-B/L-C need owner decision K-10 + provider
// evidence and are NOT available.
//
// Run:  bun evidence/v2323/test-legacy-export-v2323.ts  (from worktree root)
// Exit 0 = all PASS; exit 1 = any FAIL. VM evidence only — not staging.

import { Actions, exportLegacyChecks } from "../../site/server/src/actions";
import {
  cloudflareViewer,
  countRows,
  localViewer,
  makeMigratedDb,
  mkCtx,
  seedChecks,
} from "./harness-helpers";

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
// Fixture: 2 legacy NULL rows + 1 row owned by local:u-principal-A.
// ---------------------------------------------------------------------------
const tdb = makeMigratedDb();
seedChecks(tdb.dbPath, [
  {
    url: "https://example-legacy-1.test/x",
    domain: "example-legacy-1.test",
    verdict: "waspada",
    score: 60,
    ownerUserId: null,
  },
  {
    url: "https://example-legacy-2.test/x",
    domain: "example-legacy-2.test",
    verdict: "bahaya",
    score: 90,
    ownerUserId: null,
  },
  {
    url: "https://a-1.test/x",
    domain: "a-1.test",
    verdict: "waspada",
    score: 60,
    ownerUserId: "local:u-principal-A",
  },
]);

test("H-LEG-01", "owner (local, isOwner true) gets exactly the 2 legacy NULL rows", async () => {
  const ctx = mkCtx(tdb.db, localViewer("principal-A", true));
  const rows = await exportLegacyChecks(ctx);
  eq(rows.length, 2, "owner export must return exactly 2 rows");
  eq(rows[0].domain, "example-legacy-1.test", "first legacy row (oldest first)");
  eq(rows[1].domain, "example-legacy-2.test", "second legacy row");
});

test("H-LEG-02", "non-owner principal (isOwner false) gets [] (fail-closed)", async () => {
  const ctx = mkCtx(tdb.db, localViewer("principal-B", false));
  const rows = await exportLegacyChecks(ctx);
  eq(rows.length, 0, "non-owner export must be empty");
});

test("H-LEG-03", "anonymous (no viewer) gets [] (fail-closed)", async () => {
  const ctx = mkCtx(tdb.db, undefined);
  const rows = await exportLegacyChecks(ctx);
  eq(rows.length, 0, "anonymous export must be empty");
});

test("H-LEG-04", "owner export contains NO owned rows (only NULL-owner rows)", async () => {
  const ctx = mkCtx(tdb.db, localViewer("principal-A", true));
  const rows = await exportLegacyChecks(ctx);
  const domains = rows.map((r) => r.domain);
  assert(!domains.includes("a-1.test"), `owned row a-1.test must NOT be exported (got ${JSON.stringify(domains)})`);
  assert(
    domains.every((d) => d.startsWith("example-legacy-")),
    `all exported rows must be legacy rows (got ${JSON.stringify(domains)})`,
  );
});

test("H-LEG-05", "exportLegacyChecks is NOT in the Actions map (not invocable)", () => {
  assert(
    !("exportLegacyChecks" in Actions),
    "exportLegacyChecks must NOT be an action (no client path)",
  );
});

test("H-LEG-06", "owner via cloudflare share (isOwner true) also gets the legacy rows", async () => {
  const ctx = mkCtx(tdb.db, cloudflareViewer("share-1", true));
  const rows = await exportLegacyChecks(ctx);
  eq(rows.length, 2, "cloudflare owner export must return exactly 2 rows");
});

test("H-LEG-07", "cloudflare non-owner (isOwner false) gets [] (fail-closed)", async () => {
  const ctx = mkCtx(tdb.db, cloudflareViewer("share-1", false));
  const rows = await exportLegacyChecks(ctx);
  eq(rows.length, 0, "cloudflare non-owner export must be empty");
});

test("H-LEG-08", "export is read-only: row counts unchanged after all exports", async () => {
  const ctxOwner = mkCtx(tdb.db, localViewer("principal-A", true));
  await exportLegacyChecks(ctxOwner);
  await exportLegacyChecks(mkCtx(tdb.db, localViewer("principal-B", false)));
  await exportLegacyChecks(mkCtx(tdb.db, undefined));
  eq(countRows(tdb.dbPath, "checks"), 3, "checks table must still hold exactly 3 rows");
});

// ---------------------------------------------------------------------------
// Runner (mirrors test-cache-v2323.ts).
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
tdb.close();
process.exit(failed.length === 0 ? 0 : 1);
