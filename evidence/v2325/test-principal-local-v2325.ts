// test-principal-local-v2325.ts — F-058 (v2.3.25): local principal
// memakai `userId`, bukan `ownerUserId`.
//
// Tests the REAL `Actions` handlers from site/server/src/actions.ts
// against a disposable DB (REAL migrations). Dua LocalViewer dengan
// `ownerUserId` SAMA tetapi `userId` BERBEDA tidak boleh berbagi
// history maupun saved state. `isOwner` adalah otorisasi, bukan
// identitas: dua viewer dengan userId sama berbagi satu principal dan
// dibedakan hanya oleh gate isOwner per-invocation. Invokasi delegate
// (`delegate: "agent" | "schedule"`) adalah aktor BERBEDA dan tidak
// pernah berbagi principal dengan pemanggil langsung.
//
// Bukti kontrak provider: SDK 0.14.0 `server-contract.d.ts`
// (tarball SHA-256 f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356
// eaeb91d120ad49e) mendeklarasikan LocalViewer { userId, ownerUserId,
// isOwner, delegate? } — nama field `userId` adalah identitas
// pemanggil; TIDAK ADA pernyataan provider tentang bagaimana runtime
// mengisi field-field itu (populasi runtime NOT VERIFIED, STAGE-P02).
// Pemetaan di sini adalah pembacaan paling defensif dari tipe yang
// dideklarasikan; semantik runtime tetap butuh staging trace.
//
//   H-PL-01  listChecks: alice vs bob (ownerUserId sama) terisolasi
//   H-PL-02  deleteCheck: bob tak bisa hapus baris alice; alice bisa
//            hapus barisnya sendiri
//   H-PL-03  askGibran: prompt alice hanya berisi domain alice
//   H-PL-04  saved state: bookmark alice tak terlihat bob/owner
//   H-PL-05  userId sama, isOwner beda: principal sama (berbagi
//            history), TETAPI addProject hanya owner (gate isOwner)
//   H-PL-06  delegate agent/schedule: principal berbeda dari pemanggil
//            langsung dan satu sama lain; delegate+isOwner tetap bisa
//            addProject (gate isOwner, bukan principal)
//   H-PL-07  runCheck sebagai alice menulis owner `local:alice`;
//            alice membaca kembali, bob tidak
//
// Run:  bun evidence/v2325/test-principal-local-v2325.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import { Actions, runCheck, setCheckLinkEnabled } from "../../site/server/src/actions";
import {
  countRows,
  localViewerAs,
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
// Semua baris di bawah SATU ownerUserId "owner-1" — yang membedakan
// hanyalah userId pemanggil (F-058: itulah inti pengujian ini).
seedChecks(tdb.dbPath, [
  { url: "https://alice-1.test/x", domain: "alice-1.test", verdict: "waspada", score: 55, ownerUserId: "local:alice" },
  { url: "https://alice-2.test/x", domain: "alice-2.test", verdict: "lebih_aman", score: 10, ownerUserId: "local:alice" },
  { url: "https://bob-1.test/x", domain: "bob-1.test", verdict: "bahaya", score: 90, ownerUserId: "local:bob" },
  { url: "https://owner-1.test/x", domain: "owner-1.test", verdict: "lebih_aman", score: 5, ownerUserId: "local:owner-1" },
  { url: "https://legacy.test/x", domain: "legacy.test", verdict: "lebih_aman", score: 5, ownerUserId: null },
]);

const alice = localViewerAs({ userId: "alice", ownerUserId: "owner-1", isOwner: false });
const bob = localViewerAs({ userId: "bob", ownerUserId: "owner-1", isOwner: false });
const owner = localViewerAs({ userId: "owner-1", ownerUserId: "owner-1", isOwner: true });
const ownerAsNonOwner = localViewerAs({ userId: "owner-1", ownerUserId: "owner-1", isOwner: false });
const agentDelegate = localViewerAs({ userId: "owner-1", ownerUserId: "owner-1", isOwner: true, delegate: "agent" });
const scheduleDelegate = localViewerAs({ userId: "owner-1", ownerUserId: "owner-1", isOwner: true, delegate: "schedule" });

const ctxAlice = mkCtx(tdb.db, alice);
const ctxBob = mkCtx(tdb.db, bob);
const ctxOwner = mkCtx(tdb.db, owner);
const listChecks: any = (Actions as any).listChecks;
const deleteCheck: any = (Actions as any).deleteCheck;
const listProjects: any = (Actions as any).listProjects;
const setProjectState: any = (Actions as any).setProjectState;
const askGibran: any = (Actions as any).askGibran;
const addProject: any = (Actions as any).addProject;

function validArgs(name: string, addr = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"): any {
  return {
    name,
    ticker: "TST",
    description: "Proyek uji principal lokal.",
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

function checkIdByDomain(dbPath: string, domain: string): number {
  const raw = new Database(dbPath);
  try {
    const row: any = raw.query("SELECT id FROM checks WHERE domain = ?").get(domain);
    return Number(row?.id ?? -1);
  } finally {
    raw.close();
  }
}

function savedRowFor(principal: string, projectId: number): any | null {
  const raw = new Database(tdb.dbPath);
  try {
    const row: any = raw
      .query("SELECT principal_id AS p, bookmarked AS b, task_status AS t FROM saved_projects WHERE principal_id = ? AND project_id = ?")
      .get(principal, projectId);
    return row ?? null;
  } finally {
    raw.close();
  }
}

test("H-PL-01", "listChecks: alice vs bob (ownerUserId sama) terisolasi; legacy tak terlihat", async () => {
  const a = await listChecks.handler(ctxAlice, { limit: 30 });
  const b = await listChecks.handler(ctxBob, { limit: 30 });
  const aDomains = a.checks.map((c: any) => c.domain).sort();
  const bDomains = b.checks.map((c: any) => c.domain).sort();
  eq(JSON.stringify(aDomains), JSON.stringify(["alice-1.test", "alice-2.test"]), "alice must see only her own rows");
  eq(JSON.stringify(bDomains), JSON.stringify(["bob-1.test"]), "bob must see only his own row");
  assert(!aDomains.includes("legacy.test") && !bDomains.includes("legacy.test"), "neither may see legacy NULL rows");
});

test("H-PL-02", "deleteCheck: bob tak bisa hapus baris alice; alice bisa hapus barisnya sendiri", async () => {
  const aliceRowId = checkIdByDomain(tdb.dbPath, "alice-1.test");
  assert(aliceRowId > 0, "seeded alice row must exist");
  await deleteCheck.handler(ctxBob, { id: aliceRowId });
  eq(checkIdByDomain(tdb.dbPath, "alice-1.test"), aliceRowId, "alice row must survive bob's delete attempt");
  const aliceRow2 = checkIdByDomain(tdb.dbPath, "alice-2.test");
  await deleteCheck.handler(ctxAlice, { id: aliceRow2 });
  eq(checkIdByDomain(tdb.dbPath, "alice-2.test"), -1, "alice's own row must be gone after her own delete");
});

test("H-PL-03", "askGibran: prompt alice hanya berisi domain alice; bob hanya domain bob", async () => {
  let promptAlice = "";
  await askGibran.handler(mkCtx(tdb.db, alice, { promptSink: (p) => { promptAlice = p; } }), { message: "apa riwayat cek saya?", history: [] });
  assert(promptAlice.includes("alice-1.test"), "alice prompt must contain her own domain");
  assert(!promptAlice.includes("bob-1.test"), "alice prompt must NOT contain bob's domain");
  assert(!promptAlice.includes("owner-1.test"), "alice prompt must NOT contain the owner's domain");
  let promptBob = "";
  await askGibran.handler(mkCtx(tdb.db, bob, { promptSink: (p) => { promptBob = p; } }), { message: "apa riwayat cek saya?", history: [] });
  assert(promptBob.includes("bob-1.test"), "bob prompt must contain his own domain");
  assert(!promptBob.includes("alice-1.test"), "bob prompt must NOT contain alice's domain");
});

test("H-PL-04", "saved state: bookmark alice tak terlihat bob maupun owner", async () => {
  await setProjectState.handler(ctxAlice, { projectId: 3, bookmarked: true, taskStatus: "completed" });
  const a = await listProjects.handler(ctxAlice, {});
  const b = await listProjects.handler(ctxBob, {});
  const o = await listProjects.handler(ctxOwner, {});
  const pa = a.projects.find((p: any) => p.id === 3);
  const pb = b.projects.find((p: any) => p.id === 3);
  const po = o.projects.find((p: any) => p.id === 3);
  eq(pa.bookmarked, true, "alice must see her bookmark");
  eq(pa.task_status, "completed", "alice must see her task status");
  eq(pb.bookmarked, false, "bob must NOT see alice's bookmark");
  eq(pb.task_status, "not_started", "bob must NOT see alice's task status");
  eq(po.bookmarked, false, "owner must NOT see alice's bookmark");
  eq(po.task_status, "not_started", "owner must NOT see alice's task status");
  const row = savedRowFor("local:alice", 3);
  assert(row !== null, "alice row must exist keyed by local:alice");
  eq(row.b, 1, "alice row bookmarked must be 1");
  eq(savedRowFor("local:bob", 3), null, "no saved row may exist for local:bob on project 3");
  eq(savedRowFor("local:owner-1", 3), null, "no saved row may exist for local:owner-1 on project 3");
});

test("H-PL-05", "userId sama, isOwner beda: principal sama, TETAPI addProject hanya owner", async () => {
  // isOwner adalah otorisasi, bukan identitas: kedua viewer userId
  // "owner-1" berbagi principal local:owner-1 dan berbagi history.
  const asOwner = await listChecks.handler(ctxOwner, { limit: 30 });
  const asNonOwner = await listChecks.handler(mkCtx(tdb.db, ownerAsNonOwner), { limit: 30 });
  const dOwner = asOwner.checks.map((c: any) => c.domain).sort();
  const dNonOwner = asNonOwner.checks.map((c: any) => c.domain).sort();
  eq(JSON.stringify(dOwner), JSON.stringify(["owner-1.test"]), "owner must see the owner-1 row");
  eq(JSON.stringify(dNonOwner), JSON.stringify(["owner-1.test"]), "same userId as non-owner sees the SAME principal history (isOwner is not identity)");
  // ...tetapi gate addProject membedakan mereka per-invocation.
  const before = countRows(tdb.dbPath, "projects");
  const denied = await addProject.handler(mkCtx(tdb.db, ownerAsNonOwner), validArgs("Uji PL Non-Owner"));
  eq(denied.added, false, "non-owner with the owner's userId must still be rejected by addProject");
  eq(countRows(tdb.dbPath, "projects"), before, "rejected addProject must create 0 rows");
  const allowed = await addProject.handler(ctxOwner, validArgs("Uji PL Owner", "0xdddddddddddddddddddddddddddddddddddddddd"));
  eq(allowed.added, true, "owner must succeed at addProject");
  eq(countRows(tdb.dbPath, "projects"), before + 1, "exactly one row created by owner");
  const raw = new Database(tdb.dbPath);
  try {
    const row: any = raw.query("SELECT provenance_submitted_by AS p FROM projects WHERE name = ?").get("Uji PL Owner");
    eq(row?.p ?? null, "local:owner-1", "owner provenance must be the userId principal");
  } finally {
    raw.close();
  }
});

test("H-PL-06", "delegate agent/schedule: principal berbeda dari pemanggil langsung dan satu sama lain", async () => {
  const ctxAgent = mkCtx(tdb.db, agentDelegate);
  const ctxSchedule = mkCtx(tdb.db, scheduleDelegate);
  const listed = await listChecks.handler(ctxAgent, { limit: 30 });
  eq(listed.checks.length, 0, "agent delegate must NOT read the owner's direct history");
  await setProjectState.handler(ctxAgent, { projectId: 4, bookmarked: true, taskStatus: "completed" });
  const agentRow = savedRowFor("local:delegate:agent:owner-1", 4);
  assert(agentRow !== null, "agent delegate write must land under local:delegate:agent:owner-1");
  eq(agentRow.b, 1, "agent delegate row bookmarked must be 1");
  const o = await listProjects.handler(ctxOwner, {});
  const po = o.projects.find((p: any) => p.id === 4);
  eq(po.bookmarked, false, "owner must NOT see the agent delegate's bookmark");
  eq(po.task_status, "not_started", "owner must NOT see the agent delegate's task status");
  const s = await listProjects.handler(ctxSchedule, {});
  const ps = s.projects.find((p: any) => p.id === 4);
  eq(ps.bookmarked, false, "schedule delegate must NOT see the agent delegate's bookmark");
  eq(savedRowFor("local:delegate:schedule:owner-1", 4), null, "no schedule-delegate row may exist for project 4");
  eq(savedRowFor("local:owner-1", 4), null, "no direct-owner row may exist for project 4");
  // Gate owner tetap berbasis isOwner, bukan principal: delegate yang
  // isOwner=true tetap boleh addProject.
  const before = countRows(tdb.dbPath, "projects");
  const res = await addProject.handler(ctxAgent, validArgs("Uji PL Delegate", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"));
  eq(res.added, true, "delegate with isOwner=true must pass the addProject owner gate");
  eq(countRows(tdb.dbPath, "projects"), before + 1, "exactly one row created by delegate owner");
});

test("H-PL-07", "runCheck sebagai alice menulis owner `local:alice`; alice membaca kembali, bob tidak", async () => {
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
    const res = await runCheck(ctxAlice, "https://alice-runcheck.test/page", { testHooks: hooks });
    assert(typeof res.id === "number", "runCheck must return a stored check");
    eq(countRows(tdb.dbPath, "checks"), before + 1, "exactly one row inserted");
    const raw = new Database(tdb.dbPath);
    let ownerVal: unknown;
    try {
      const row: any = raw.query("SELECT owner_user_id AS o FROM checks WHERE id = ?").get(res.id);
      ownerVal = row?.o ?? null;
    } finally {
      raw.close();
    }
    eq(ownerVal, "local:alice", "alice runCheck row must be owned by local:alice (userId principal)");
    const listedA = await listChecks.handler(ctxAlice, { limit: 30 });
    assert(listedA.checks.some((c: any) => c.domain === "alice-runcheck.test"), "alice must read back her own runCheck row");
    const listedB = await listChecks.handler(ctxBob, { limit: 30 });
    assert(!listedB.checks.some((c: any) => c.domain === "alice-runcheck.test"), "bob must NOT see alice's runCheck row");
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
console.log(`\nH-PL: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
