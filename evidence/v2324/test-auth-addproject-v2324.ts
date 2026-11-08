// test-auth-addproject-v2324.ts — F-050 (v2.3.24): addProject
// owner-only authorization inside the handler.
//
// Tests the REAL `Actions.addProject.handler` from
// site/server/src/actions.ts against a disposable DB built by applying
// the REAL migrations (see harness-helpers.ts). No network.
//
//   H-AUTH-01  anonymous (no viewer) -> rejected, 0 rows
//   H-AUTH-02  local non-owner -> rejected, 0 rows
//   H-AUTH-03  Cloudflare non-owner share viewer -> rejected, 0 rows
//   H-AUTH-04  local owner -> succeeds, 1 row, provenance = local principal
//   H-AUTH-05  Cloudflare owner -> succeeds, 1 row, provenance = cloudflare-owner principal
//   H-AUTH-06  rejected calls create zero rows even with otherwise-valid
//              args (count before/after identical)
//
// Run:  bun evidence/v2324/test-auth-addproject-v2324.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import { Actions } from "../../site/server/src/actions";
import {
  cloudflareViewer,
  countRows,
  localViewer,
  makeMigratedDb,
  mkCtx,
} from "../v2323/harness-helpers";
import { Database } from "bun:sqlite";

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
function eq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected)
    throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const tdb = makeMigratedDb();
const addProject: any = (Actions as any).addProject;

function validArgs(name: string, addr = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"): any {
  return {
    name,
    ticker: "TST",
    description: "Proyek uji otorisasi.",
    chain: "BNB Chain",
    category: "DeFi",
    contractAddress: addr,
    contractBased: true,
    officialUrl: "https://contoh.test/proyek",
    xHandle: "@contoh",
    segment: "live",
    statusLabel: "Uji",
    difficulty: "Easy",
    rewardNote: null,
    verifiedAt: "2026-11-08",
    verifiedNote: "Uji harness.",
  };
}

function provenanceOf(dbPath: string, name: string): string | null {
  const raw = new Database(dbPath);
  try {
    const row: any = raw
      .query("SELECT provenance_submitted_by AS p FROM projects WHERE name = ?")
      .get(name);
    return row?.p ?? null;
  } finally {
    raw.close();
  }
}

test("H-AUTH-01", "anonymous (no viewer) -> rejected, 0 rows", async () => {
  const before = countRows(tdb.dbPath, "projects");
  const ctx = mkCtx(tdb.db, null);
  const res = await addProject.handler(ctx, validArgs("Uji Anon"));
  eq(res.added, false, "anonymous must be rejected");
  assert(typeof res.reason === "string" && res.reason.includes("pemilik"), `reason must say owner-only (got: ${res.reason})`);
  eq(countRows(tdb.dbPath, "projects"), before, "no row may be created");
});

test("H-AUTH-02", "local non-owner -> rejected, 0 rows", async () => {
  const before = countRows(tdb.dbPath, "projects");
  const ctx = mkCtx(tdb.db, localViewer("user-biasa", false));
  const res = await addProject.handler(ctx, validArgs("Uji Lokal Non-Owner"));
  eq(res.added, false, "non-owner local must be rejected");
  eq(countRows(tdb.dbPath, "projects"), before, "no row may be created");
});

test("H-AUTH-03", "Cloudflare non-owner share viewer -> rejected, 0 rows", async () => {
  const before = countRows(tdb.dbPath, "projects");
  const ctx = mkCtx(tdb.db, cloudflareViewer("share-1", false));
  const res = await addProject.handler(ctx, validArgs("Uji Share Viewer"));
  eq(res.added, false, "non-owner share viewer must be rejected");
  eq(countRows(tdb.dbPath, "projects"), before, "no row may be created");
});

test("H-AUTH-04", "local owner -> succeeds, provenance = local principal", async () => {
  const before = countRows(tdb.dbPath, "projects");
  const ctx = mkCtx(tdb.db, localViewer("owner-1", true));
  const res = await addProject.handler(ctx, validArgs("Uji Owner Lokal", "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"));
  eq(res.added, true, `owner must succeed (got reason: ${res.reason})`);
  eq(countRows(tdb.dbPath, "projects"), before + 1, "exactly one row created");
  eq(provenanceOf(tdb.dbPath, "Uji Owner Lokal"), "local:owner-1", "provenance must be the owner principal");
});

test("H-AUTH-05", "Cloudflare owner -> succeeds, provenance = cloudflare-owner principal", async () => {
  const before = countRows(tdb.dbPath, "projects");
  const ctx = mkCtx(tdb.db, cloudflareViewer("share-1", true));
  const res = await addProject.handler(
    ctx,
    validArgs("Uji Owner Cloudflare", "0xcccccccccccccccccccccccccccccccccccccccc"),
  );
  eq(res.added, true, `cloudflare owner must succeed (got reason: ${res.reason})`);
  eq(countRows(tdb.dbPath, "projects"), before + 1, "exactly one row created");
  eq(provenanceOf(tdb.dbPath, "Uji Owner Cloudflare"), "cloudflare-owner:share-1", "provenance must be the owner principal");
});

test("H-AUTH-06", "three rejections in a row create zero rows total", async () => {
  const before = countRows(tdb.dbPath, "projects");
  for (const [label, viewer] of [
    ["anon", null],
    ["local-non-owner", localViewer("user-x", false)],
    ["cf-viewer", cloudflareViewer("share-9", false)],
  ] as const) {
    const ctx = mkCtx(tdb.db, viewer);
    const res = await addProject.handler(ctx, validArgs(`Uji Tolak ${label}`));
    eq(res.added, false, `${label} must be rejected`);
  }
  eq(countRows(tdb.dbPath, "projects"), before, "no rows from any rejection");
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
tdb.close();
console.log(`\nH-AUTH: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
