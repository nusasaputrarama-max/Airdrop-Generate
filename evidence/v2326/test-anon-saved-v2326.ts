// test-anon-saved-v2326.ts — F-059 (v2.3.26): legacy single-owner mode
// REMOVED — missing/unknown viewer is fail-closed for saved state with
// NO opt-in and NO '<LEGACY>' fallback.
//
// Supersedes evidence/v2325/test-anon-saved-v2325.ts (H-AN), whose
// H-AN-03 asserted that mode-ON let anonymous contexts read/write the
// shared '<LEGACY>' row. V20 (F-059) showed that behaviour is the bug:
// a module flag cannot prove a deployment is local-only, so any
// invocation without a viewer on a shared/public artifact could share
// one '<LEGACY>' principal. v2.3.26 removes the flag, its test-only
// setter/getter, and the LEGACY_PRINCIPAL constant from the handlers
// entirely; '<LEGACY>' rows are reachable only through the OFFLINE
// principal-key archive/migration tool
// (evidence/v2326/principal-key-migration.ts), never via a handler.
//
//   H-AN2-01  dua anon setProjectState -> 0 baris; keduanya lihat default
//   H-AN2-02  baris '<LEGACY>' yang di-seed TIDAK PERNAH terbaca anon;
//             tidak tertimpa oleh write anon
//   H-AN2-03  API mode legacy TIDAK ADA LAGI: export setter/getter
//             hilang + pola kode opt-in tidak ada di source actions.ts
//   H-AN2-04  viewer share Cloudflare non-owner tetap disabled;
//             viewer source TIDAK DIKENAL fail-closed (read default,
//             write no-op)
//   H-AN2-05  local viewer dengan userId kosong fail-closed (tidak ada
//             principal, tidak ada write)
//   H-AN2-06  kontrol positif: local owner bookmark tersimpan; anon
//             tidak melihatnya; baris '<LEGACY>' tidak tertimpa
//
// Run:  bun evidence/v2326/test-anon-saved-v2326.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import * as ActionsModule from "../../site/server/src/actions";
import { Actions } from "../../site/server/src/actions";
import {
  cloudflareViewer,
  countRows,
  localViewer,
  localViewerAs,
  makeMigratedDb,
  mkCtx,
} from "../v2323/harness-helpers";
import { Database } from "bun:sqlite";
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
function eq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected)
    throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const tdb = makeMigratedDb();
// Baris saved pra-migrasi (fixture legacy): principal '<LEGACY>'.
{
  const raw = new Database(tdb.dbPath);
  try {
    raw.exec(
      `INSERT INTO saved_projects (principal_id, project_id, bookmarked, task_status, updated_at) VALUES ('<LEGACY>', 2, 1, 'completed', ${Date.now()})`,
    );
  } finally {
    raw.close();
  }
}

const ctxAnonA = mkCtx(tdb.db, undefined);
const ctxAnonB = mkCtx(tdb.db, undefined);
const listProjects: any = (Actions as any).listProjects;
const setProjectState: any = (Actions as any).setProjectState;

function projectState(listed: any, id: number): { bookmarked: boolean; task_status: string } {
  const p = listed.projects.find((x: any) => x.id === id);
  assert(p, `project ${id} must exist in listProjects output`);
  return { bookmarked: p.bookmarked, task_status: p.task_status };
}

function legacyRowCount(): number {
  const raw = new Database(tdb.dbPath);
  try {
    const row: any = raw
      .query("SELECT count(*) AS n FROM saved_projects WHERE principal_id = '<LEGACY>'")
      .get();
    return Number(row?.n ?? 0);
  } finally {
    raw.close();
  }
}

function legacyRow(): { bookmarked: number; taskStatus: string } | null {
  const raw = new Database(tdb.dbPath);
  try {
    const row: any = raw
      .query(
        "SELECT bookmarked AS b, task_status AS t FROM saved_projects WHERE principal_id = '<LEGACY>' AND project_id = 2",
      )
      .get();
    return row ? { bookmarked: Number(row.b), taskStatus: String(row.t) } : null;
  } finally {
    raw.close();
  }
}

test("H-AN2-01", "dua anon setProjectState -> 0 baris; keduanya lihat default", async () => {
  const before = countRows(tdb.dbPath, "saved_projects");
  await setProjectState.handler(ctxAnonA, { projectId: 1, bookmarked: true, taskStatus: "completed" });
  await setProjectState.handler(ctxAnonB, { projectId: 1, bookmarked: true, taskStatus: "in_progress" });
  eq(countRows(tdb.dbPath, "saved_projects"), before, "no saved_projects row may be written by anonymous viewers");
  const a = await listProjects.handler(ctxAnonA, {});
  const b = await listProjects.handler(ctxAnonB, {});
  eq(projectState(a, 1).bookmarked, false, "anon A must see default bookmarked=false");
  eq(projectState(a, 1).task_status, "not_started", "anon A must see default task_status");
  eq(projectState(b, 1).bookmarked, false, "anon B must see default bookmarked=false");
  eq(projectState(b, 1).task_status, "not_started", "anon B must see default task_status");
});

test("H-AN2-02", "baris '<LEGACY>' yang di-seed TIDAK PERNAH terbaca anon dan tidak tertimpa", async () => {
  eq(legacyRowCount(), 1, "seeded <LEGACY> row must exist before the read");
  const before = legacyRow();
  assert(before !== null, "seeded legacy row must exist");
  const a = await listProjects.handler(ctxAnonA, {});
  eq(projectState(a, 2).bookmarked, false, "anon must NEVER read the seeded <LEGACY> bookmark (F-059: no opt-in left)");
  eq(projectState(a, 2).task_status, "not_started", "anon must NEVER read the seeded <LEGACY> task status");
  await setProjectState.handler(ctxAnonB, { projectId: 2, bookmarked: false, taskStatus: "in_progress" });
  eq(legacyRowCount(), 1, "<LEGACY> row count must stay 1 after anon write attempt");
  const after = legacyRow();
  assert(after !== null, "legacy row must still exist after anon write attempt");
  eq(after.bookmarked, before.bookmarked, "anon write must NOT modify the <LEGACY> row");
  eq(after.taskStatus, before.taskStatus, "anon write must NOT modify the <LEGACY> task_status");
});

test("H-AN2-03", "API mode legacy tidak ada lagi (export + pola kode opt-in hilang)", async () => {
  const mod: any = ActionsModule as any;
  eq(typeof mod.setLocalSingleOwnerMode, "undefined", "setLocalSingleOwnerMode export must be REMOVED (F-059)");
  eq(typeof mod.isLocalSingleOwnerMode, "undefined", "isLocalSingleOwnerMode export must be REMOVED (F-059)");
  const src = readFileSync(join(import.meta.dir, "..", "..", "site", "server", "src", "actions.ts"), "utf8");
  for (const pattern of [
    "let LOCAL_SINGLE_OWNER_MODE",
    "setLocalSingleOwnerMode(enabled",
    "const LEGACY_PRINCIPAL",
    "LOCAL_SINGLE_OWNER_MODE ?",
  ]) {
    assert(!src.includes(pattern), `actions.ts must not contain opt-in code pattern: ${pattern}`);
  }
});

test("H-AN2-04", "viewer share Cloudflare non-owner + viewer source tidak dikenal fail-closed", async () => {
  const before = countRows(tdb.dbPath, "saved_projects");
  const viewerA = { ...cloudflareViewer("share-1", false), tokenId: "tok-A" };
  const ctxShare = mkCtx(tdb.db, viewerA);
  await setProjectState.handler(ctxShare, { projectId: 1, bookmarked: true, taskStatus: "completed" });
  eq(countRows(tdb.dbPath, "saved_projects"), before, "share viewer write must stay a no-op");
  const listed = await listProjects.handler(ctxShare, {});
  eq(projectState(listed, 2).bookmarked, false, "share viewer must NOT read the <LEGACY> row");
  eq(projectState(listed, 2).task_status, "not_started", "share viewer must see defaults");
  // Unknown viewer source: resolvePrincipal returns null -> fail-closed.
  const ctxUnknown = mkCtx(tdb.db, {
    source: "unknown",
    authenticated: true,
    spaceSlug: "test",
    userId: "u-intruder",
    ownerUserId: "owner-1",
    isOwner: false,
  });
  await setProjectState.handler(ctxUnknown, { projectId: 1, bookmarked: true, taskStatus: "completed" });
  eq(countRows(tdb.dbPath, "saved_projects"), before, "unknown-source viewer write must stay a no-op");
  const listedUnknown = await listProjects.handler(ctxUnknown, {});
  eq(projectState(listedUnknown, 1).bookmarked, false, "unknown-source viewer must see defaults");
  eq(projectState(listedUnknown, 2).bookmarked, false, "unknown-source viewer must NOT read the <LEGACY> row");
});

test("H-AN2-05", "local viewer dengan userId kosong fail-closed", async () => {
  const before = countRows(tdb.dbPath, "saved_projects");
  const ctxEmpty = mkCtx(
    tdb.db,
    localViewerAs({ userId: "", ownerUserId: "owner-1", isOwner: true }),
  );
  await setProjectState.handler(ctxEmpty, { projectId: 1, bookmarked: true, taskStatus: "completed" });
  eq(countRows(tdb.dbPath, "saved_projects"), before, "empty-userId viewer write must stay a no-op");
  const listed = await listProjects.handler(ctxEmpty, {});
  eq(projectState(listed, 1).bookmarked, false, "empty-userId viewer must see defaults");
});

test("H-AN2-06", "kontrol positif: local owner bookmark tersimpan; anon tidak melihatnya; <LEGACY> utuh", async () => {
  const ownerCtx = mkCtx(tdb.db, localViewer("owner-1", true));
  await setProjectState.handler(ownerCtx, { projectId: 3, bookmarked: true, taskStatus: "in_progress" });
  const owner = await listProjects.handler(ownerCtx, {});
  eq(projectState(owner, 3).bookmarked, true, "owner must see their bookmark");
  eq(projectState(owner, 3).task_status, "in_progress", "owner must see their task status");
  const anon = await listProjects.handler(ctxAnonA, {});
  eq(projectState(anon, 3).bookmarked, false, "anon must NOT see the owner's bookmark");
  eq(projectState(anon, 3).task_status, "not_started", "anon must NOT see the owner's task status");
  const raw = new Database(tdb.dbPath);
  try {
    const rows: any[] = raw
      .query("SELECT principal_id AS p FROM saved_projects WHERE project_id = 3")
      .all();
    eq(rows.length, 1, "exactly one saved row must exist for project 3");
    eq(rows[0].p, "local:u-owner-1", "owner row must be keyed by the userId principal (F-058)");
  } finally {
    raw.close();
  }
  eq(legacyRowCount(), 1, "the <LEGACY> seed row must be untouched by the owner write");
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
console.log(`\nH-AN2: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
