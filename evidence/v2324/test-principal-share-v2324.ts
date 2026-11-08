// test-principal-share-v2324.ts — F-051 (v2.3.24): shareId Cloudflare
// BUKAN identitas per-user.
//
// Tests the REAL `Actions` handlers from site/server/src/actions.ts
// against a disposable DB (REAL migrations). Dua viewer berbeda pada
// SATU share (shareId sama, tokenId beda) tidak boleh saling membaca,
// memutasi, atau menghapus history maupun saved state satu sama lain.
//
//   H-PRIN-01  listChecks: dua viewer satu share -> [] (baris share
//              gaya lama `cloudflare:{shareId}` TIDAK terbaca)
//   H-PRIN-02  deleteCheck: viewer A tidak bisa menghapus baris viewer
//              lain / baris share gaya lama (baris tetap ada)
//   H-PRIN-03  askGibran: prompt viewer A tidak berisi domain riwayat
//              viewer lain; prompt owner berisi domainnya sendiri
//   H-PRIN-04  setProjectState viewer share -> no-op (0 baris); kedua
//              viewer melihat state default
//   H-PRIN-05  kontrol positif: local owner tetap bisa bookmark; principal
//              lokal lain tidak melihatnya
//   H-PRIN-06  runCheck sebagai viewer share -> baris owner NULL
//              (write-only L-A); listChecks viewer itu -> []
//
// Run:  bun evidence/v2324/test-principal-share-v2324.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import { Actions, runCheck, setCheckLinkEnabled } from "../../site/server/src/actions";
import {
  cloudflareViewer,
  countRows,
  localViewer,
  makeMigratedDb,
  mkCtx,
  seedChecks,
} from "../v2323/harness-helpers";
import { Database } from "bun:sqlite";
import { Readable } from "node:stream";

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
// Baris gaya lama (sebelum F-051): owner = shareId mentah — tidak boleh
// terbaca oleh viewer share mana pun. Baris NULL = legacy (L-A).
seedChecks(tdb.dbPath, [
  { url: "https://share-a.test/claim", domain: "share-a.test", verdict: "waspada", score: 55, ownerUserId: "cloudflare:share-1" },
  { url: "https://pemilik-rahasia.test/x", domain: "pemilik-rahasia.test", verdict: "bahaya", score: 90, ownerUserId: "local:owner-1" },
  { url: "https://legacy.test/x", domain: "legacy.test", verdict: "lebih_aman", score: 5, ownerUserId: null },
]);

const viewerA = { ...cloudflareViewer("share-1", false), tokenId: "tok-A" };
const viewerB = { ...cloudflareViewer("share-1", false), tokenId: "tok-B" };
const ctxA = mkCtx(tdb.db, viewerA);
const ctxB = mkCtx(tdb.db, viewerB);
const ownerCtx = mkCtx(tdb.db, localViewer("owner-1", true));
const listChecks: any = (Actions as any).listChecks;
const deleteCheck: any = (Actions as any).deleteCheck;
const listProjects: any = (Actions as any).listProjects;
const setProjectState: any = (Actions as any).setProjectState;
const askGibran: any = (Actions as any).askGibran;

function checkIdByDomain(dbPath: string, domain: string): number {
  const raw = new Database(dbPath);
  try {
    const row: any = raw.query("SELECT id FROM checks WHERE domain = ?").get(domain);
    return Number(row?.id ?? -1);
  } finally {
    raw.close();
  }
}

test("H-PRIN-01", "listChecks: dua viewer satu share -> [] (baris share lama tak terbaca)", async () => {
  const a = await listChecks.handler(ctxA, { limit: 30 });
  const b = await listChecks.handler(ctxB, { limit: 30 });
  eq(a.checks.length, 0, "viewer A must see no history");
  eq(b.checks.length, 0, "viewer B must see no history");
});

test("H-PRIN-02", "deleteCheck: viewer share tak bisa hapus baris orang lain", async () => {
  const targetId = checkIdByDomain(tdb.dbPath, "share-a.test");
  assert(targetId > 0, "seeded share row must exist");
  const before = countRows(tdb.dbPath, "checks");
  await deleteCheck.handler(ctxA, { id: targetId });
  await deleteCheck.handler(ctxB, { id: targetId });
  eq(countRows(tdb.dbPath, "checks"), before, "row must still exist after both delete attempts");
  eq(checkIdByDomain(tdb.dbPath, "share-a.test"), targetId, "row id unchanged");
});

test("H-PRIN-03", "askGibran: prompt viewer share tanpa riwayat orang lain; owner dapat riwayatnya", async () => {
  let promptA = "";
  const ctxPromptA = mkCtx(tdb.db, viewerA, { promptSink: (p) => { promptA = p; } });
  await askGibran.handler(ctxPromptA, { message: "apa riwayat cek saya?", history: [] });
  assert(!promptA.includes("pemilik-rahasia.test"), "viewer A prompt must NOT contain owner's domain");
  assert(!promptA.includes("share-a.test"), "viewer A prompt must NOT contain the old share row domain");
  assert(promptA.includes("Belum ada riwayat cek link"), "viewer A prompt must show empty history");

  let promptOwner = "";
  const ctxPromptOwner = mkCtx(tdb.db, localViewer("owner-1", true), { promptSink: (p) => { promptOwner = p; } });
  await askGibran.handler(ctxPromptOwner, { message: "apa riwayat cek saya?", history: [] });
  assert(promptOwner.includes("pemilik-rahasia.test"), "owner prompt must contain their own domain");
  assert(!promptOwner.includes("share-a.test"), "owner prompt must NOT contain the share row");
});

test("H-PRIN-04", "setProjectState viewer share -> no-op; kedua viewer lihat default", async () => {
  const before = countRows(tdb.dbPath, "saved_projects");
  await setProjectState.handler(ctxA, { projectId: 1, bookmarked: true, taskStatus: "completed" });
  await setProjectState.handler(ctxB, { projectId: 1, bookmarked: true, taskStatus: "in_progress" });
  eq(countRows(tdb.dbPath, "saved_projects"), before, "no saved_projects row may be written by share viewers");
  const a = await listProjects.handler(ctxA, {});
  const b = await listProjects.handler(ctxB, {});
  const pa = a.projects.find((p: any) => p.id === 1);
  const pb = b.projects.find((p: any) => p.id === 1);
  eq(pa.bookmarked, false, "viewer A must see default bookmarked=false");
  eq(pa.task_status, "not_started", "viewer A must see default task_status");
  eq(pb.bookmarked, false, "viewer B must see default bookmarked=false");
  eq(pb.task_status, "not_started", "viewer B must see default task_status");
});

test("H-PRIN-05", "kontrol positif: local owner bookmark tersimpan + terisolasi", async () => {
  await setProjectState.handler(ownerCtx, { projectId: 2, bookmarked: true, taskStatus: "in_progress" });
  const owner = await listProjects.handler(ownerCtx, {});
  const other = await listProjects.handler(mkCtx(tdb.db, localViewer("owner-2", false)), {});
  const po = owner.projects.find((p: any) => p.id === 2);
  const px = other.projects.find((p: any) => p.id === 2);
  eq(po.bookmarked, true, "owner must see their bookmark");
  eq(po.task_status, "in_progress", "owner must see their task status");
  eq(px.bookmarked, false, "another local principal must NOT see owner's bookmark");
  eq(px.task_status, "not_started", "another local principal must NOT see owner's task status");
});

test("H-PRIN-06", "runCheck viewer share -> baris owner NULL; listChecks tetap []", async () => {
  const hooks = {
    resolver: async (_host: string): Promise<string[]> => ["93.184.216.34"],
    connector: async (req: { url: string }) => {
      const isRdap = req.url.startsWith("https://rdap.org/");
      const bodyText = isRdap
        ? JSON.stringify({ events: [{ eventAction: "registration", eventDate: "2020-01-15T00:00:00Z" }], entities: [] })
        : "<html><head><title>T</title></head><body><p>Hai.</p></body></html>";
      return {
        status: 200,
        headers: { get: (n: string) => (n.toLowerCase() === "content-type" ? (isRdap ? "application/json" : "text/html") : null) },
        body: Readable.from([Buffer.from(bodyText)]),
      };
    },
  };
  setCheckLinkEnabled(true);
  try {
    const before = countRows(tdb.dbPath, "checks");
    const res = await runCheck(ctxA, "https://viewer-share.test/page", { testHooks: hooks });
    assert(typeof res.id === "number", "runCheck must return a stored check");
    eq(countRows(tdb.dbPath, "checks"), before + 1, "exactly one row inserted");
    const raw = new Database(tdb.dbPath);
    let owner: unknown;
    try {
      const row: any = raw.query("SELECT owner_user_id AS o FROM checks WHERE id = ?").get(res.id);
      owner = row?.o ?? null;
    } finally {
      raw.close();
    }
    eq(owner, null, "share-viewer check row must have NULL owner (write-only L-A)");
    const listed = await listChecks.handler(ctxA, { limit: 30 });
    eq(listed.checks.length, 0, "viewer must not read back their own NULL-owner row");
    const listedB = await listChecks.handler(ctxB, { limit: 30 });
    eq(listedB.checks.length, 0, "the other viewer must not read it either");
  } finally {
    setCheckLinkEnabled(false);
  }
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
console.log(`\nH-PRIN: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
