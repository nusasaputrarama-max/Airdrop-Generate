// test-anon-saved-v2325.ts — F-057 (v2.3.25): missing viewer fail-closed
// untuk saved state.
//
// Tests the REAL `Actions` handlers from site/server/src/actions.ts
// against a disposable DB (REAL migrations). Dua context tanpa
// `ctx.viewer` pada DB yang sama tidak boleh saling membaca, menulis,
// atau menimpa saved state (bookmark/task status) satu sama lain —
// perilaku lama yang memakai sentinel '<LEGACY>' bersama untuk semua
// pengunjung anonim sudah ditutup. Baris '<LEGACY>' pra-migrasi hanya
// terbaca/tertulis bila mode local single-owner eksplisit AKTIF
// (setLocalSingleOwnerMode, default OFF — pola yang sama dengan
// kill-switch CHECKLINK_ENABLED: tidak ada env var di runtime ini).
//
//   H-AN-01  mode default OFF: dua anon setProjectState -> 0 baris;
//            keduanya listProjects -> default
//   H-AN-02  baris '<LEGACY>' yang di-seed TIDAK terbaca anon saat OFF
//   H-AN-03  mode ON: anon membaca + menulis baris '<LEGACY>' yang
//            sama (update, bukan baris baru); mode OFF lagi -> default
//   H-AN-04  viewer share Cloudflare non-owner tetap disabled bahkan
//            saat mode ON (mode tidak boleh bocor ke viewer share)
//   H-AN-05  kontrol positif: local owner tetap bisa bookmark; anon
//            (OFF) tidak melihatnya; baris '<LEGACY>' tidak tertimpa
//
// Run:  bun evidence/v2325/test-anon-saved-v2325.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import {
  Actions,
  isLocalSingleOwnerMode,
  setLocalSingleOwnerMode,
} from "../../site/server/src/actions";
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

test("H-AN-01", "mode default OFF: dua anon setProjectState -> 0 baris; keduanya lihat default", async () => {
  eq(isLocalSingleOwnerMode(), false, "local single-owner mode must default to OFF");
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

test("H-AN-02", "baris '<LEGACY>' yang di-seed TIDAK terbaca anon saat mode OFF", async () => {
  eq(legacyRowCount(), 1, "seeded <LEGACY> row must exist before the read");
  const a = await listProjects.handler(ctxAnonA, {});
  eq(projectState(a, 2).bookmarked, false, "anon must NOT read the seeded <LEGACY> bookmark when mode is OFF");
  eq(projectState(a, 2).task_status, "not_started", "anon must NOT read the seeded <LEGACY> task status when mode is OFF");
  eq(legacyRowCount(), 1, "<LEGACY> row must still exist (read must not delete it)");
});

test("H-AN-03", "mode ON: anon membaca + menulis baris '<LEGACY>' yang sama; OFF lagi -> default", async () => {
  setLocalSingleOwnerMode(true);
  try {
    eq(isLocalSingleOwnerMode(), true, "mode must be ON after setter");
    const a = await listProjects.handler(ctxAnonA, {});
    eq(projectState(a, 2).bookmarked, true, "anon must read the seeded <LEGACY> bookmark when mode is ON");
    eq(projectState(a, 2).task_status, "completed", "anon must read the seeded <LEGACY> task status when mode is ON");
    await setProjectState.handler(ctxAnonB, { projectId: 2, bookmarked: false, taskStatus: "in_progress" });
    eq(legacyRowCount(), 1, "anon write in ON mode must UPDATE the same <LEGACY> row, not insert a new one");
    const updated = legacyRow();
    assert(updated !== null, "legacy row must still exist after update");
    eq(updated.bookmarked, 0, "legacy row bookmarked must be updated to 0");
    eq(updated.taskStatus, "in_progress", "legacy row task_status must be updated to in_progress");
    const b = await listProjects.handler(ctxAnonB, {});
    eq(projectState(b, 2).bookmarked, false, "anon B must see the updated legacy state while mode is ON");
    eq(projectState(b, 2).task_status, "in_progress", "anon B must see the updated legacy task status while mode is ON");
  } finally {
    setLocalSingleOwnerMode(false);
  }
  eq(isLocalSingleOwnerMode(), false, "mode must be OFF again after reset");
  const a = await listProjects.handler(ctxAnonA, {});
  eq(projectState(a, 2).bookmarked, false, "anon must see defaults again once mode is OFF");
  eq(projectState(a, 2).task_status, "not_started", "anon must see default task status again once mode is OFF");
});

test("H-AN-04", "viewer share Cloudflare non-owner tetap disabled bahkan saat mode ON", async () => {
  const viewerA = { ...cloudflareViewer("share-1", false), tokenId: "tok-A" };
  const ctxShare = mkCtx(tdb.db, viewerA);
  const before = countRows(tdb.dbPath, "saved_projects");
  setLocalSingleOwnerMode(true);
  try {
    await setProjectState.handler(ctxShare, { projectId: 1, bookmarked: true, taskStatus: "completed" });
    eq(countRows(tdb.dbPath, "saved_projects"), before, "share viewer write must stay a no-op even when mode is ON");
    const listed = await listProjects.handler(ctxShare, {});
    eq(projectState(listed, 2).bookmarked, false, "share viewer must NOT read the <LEGACY> row even when mode is ON");
    eq(projectState(listed, 2).task_status, "not_started", "share viewer must see defaults even when mode is ON");
  } finally {
    setLocalSingleOwnerMode(false);
  }
});

test("H-AN-05", "kontrol positif: local owner bookmark tersimpan; anon (OFF) tidak melihatnya", async () => {
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
console.log(`\nH-AN: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
