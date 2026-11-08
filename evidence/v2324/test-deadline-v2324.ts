// test-deadline-v2324.ts — F-052 (v2.3.24): deadline total 20 dtk adalah
// batas KERAS — dipropagasikan ke setiap validasi DNS dan preflight.
//
// Tests the REAL modules site/server/src/ssrf-guard.ts +
// site/server/src/actions.ts (fetchText). No real network: stub
// resolvers/connectors only. The full 20 s end-to-end runCheck proof
// lives in H-TO-01 (test-timeout-persist-v2324.ts) and is referenced,
// not duplicated, here.
//
//   H-DL-01  validateUrlForFetch + deadline sudah aborted -> ok:false
//            reason deadline-aborted, resolver 0 calls
//   H-DL-02  resolver tak pernah settle + deadline 2 dtk -> settle
//            ~2 dtk dengan deadline-aborted (bukan 5 dtk, bukan gantung)
//   H-DL-03  fetchText + deadline aborted -> null MESKI cache hit ada
//            (deadline dicek SEBELUM cache read)
//   H-DL-04  invarian lease: SCAN_LEASE_TTL_MS (25 dtk) > TOTAL_DEADLINE_MS
//            (20 dtk); lease yang di-acquire kedaluwarsa 25 dtk kemudian
//   H-DL-05  fetchGuardedOnce + deadline aborted -> null, connector 0 calls
//   H-DL-06  deadline TIDAK mengganggu jalur normal: resolver cepat +
//            deadline jauh -> ok
//
// Run:  bun evidence/v2324/test-deadline-v2324.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import {
  DNS_TIMEOUT_MS,
  TOTAL_DEADLINE_MS,
  fetchGuardedOnce,
  validateUrlForFetch,
} from "../../site/server/src/ssrf-guard.ts";
import { fetchText } from "../../site/server/src/actions";
import { SCAN_LEASE_TTL_MS, acquireScanSlot } from "../../site/server/src/scan-limits";
import { makeMigratedDb } from "../v2323/harness-helpers";
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
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

test("H-DL-01", "deadline sudah aborted -> validasi langsung gagal, resolver 0 calls", async () => {
  let calls = 0;
  const resolver = async (_h: string): Promise<string[]> => { calls++; return ["93.184.216.34"]; };
  const dead = AbortSignal.timeout(1);
  await sleep(10);
  assert(dead.aborted, "test signal must be aborted");
  const v = await validateUrlForFetch("https://contoh.test/x", { resolver, deadline: dead });
  eq(v.ok, false, "must not validate");
  if (!v.ok) eq(v.reason, "deadline-aborted", "reason must be deadline-aborted");
  eq(calls, 0, "resolver must never be called");
});

test("H-DL-02", "resolver tak settle + deadline 2 dtk -> deadline-aborted ~2 dtk", async () => {
  const resolver = async (_h: string): Promise<string[]> => new Promise(() => {});
  const deadline = AbortSignal.timeout(2000);
  const t0 = Date.now();
  const v = await validateUrlForFetch("https://lambat.test/x", { resolver, deadline });
  const elapsed = Date.now() - t0;
  eq(v.ok, false, "must not validate");
  if (!v.ok) eq(v.reason, "deadline-aborted", "reason must be deadline-aborted");
  assert(elapsed >= 1500 && elapsed < 4000, `must settle near the 2 s deadline, not the 5 s DNS timeout (elapsed=${elapsed} ms)`);
  assert(elapsed < DNS_TIMEOUT_MS, "deadline must win over the per-query DNS timeout");
});

test("H-DL-03", "fetchText + deadline aborted -> null meski cache hit tersedia", async () => {
  const calls: string[] = [];
  const hooks = {
    resolver: async (_h: string): Promise<string[]> => ["93.184.216.34"],
    connector: async (req: { url: string }) => {
      calls.push(req.url);
      return {
        status: 200,
        headers: { get: (n: string) => (n.toLowerCase() === "content-type" ? "text/html" : null) },
        body: Readable.from([Buffer.from("<html><body>isi</body></html>")]),
      };
    },
  };
  const url = "http://cache-deadline.test/dl03";
  const first = await fetchText(url, 400_000, undefined, undefined, hooks);
  assert(first !== null, "first fetch must populate the cache");
  const callsBefore = calls.length;
  const dead = AbortSignal.timeout(1);
  await sleep(10);
  const second = await fetchText(url, 400_000, dead, undefined, hooks);
  eq(second, null, "aborted deadline must return null even on a cache hit");
  eq(calls.length, callsBefore, "no connector call may happen after abort");
});

test("H-DL-04", "invarian lease: TTL 25 dtk > deadline 20 dtk; expiresAt = acquired + 25 dtk", async () => {
  eq(SCAN_LEASE_TTL_MS, 25_000, "lease TTL must be 25 s");
  eq(TOTAL_DEADLINE_MS, 20_000, "total deadline must be 20 s");
  assert(SCAN_LEASE_TTL_MS > TOTAL_DEADLINE_MS, "lease TTL must exceed the total deadline");
  const tdb = makeMigratedDb();
  try {
    const now = Date.now();
    const res = await acquireScanSlot(tdb.db, "h-dl-04", now);
    assert(res.acquired === true, "lease must be acquired");
    const { Database } = await import("bun:sqlite");
    const raw = new Database(tdb.dbPath);
    try {
      const row: any = raw.query("SELECT expires_at AS e FROM scan_leases WHERE id = ?").get(res.acquired ? (res as any).leaseId : -1);
      eq(Number(row?.e ?? -1) - now, SCAN_LEASE_TTL_MS, "lease must expire exactly TTL after acquire");
    } finally {
      raw.close();
    }
  } finally {
    tdb.close();
  }
});

test("H-DL-05", "fetchGuardedOnce + deadline aborted -> null, connector 0 calls", async () => {
  let calls = 0;
  const hooks = {
    resolver: async (_h: string): Promise<string[]> => ["93.184.216.34"],
    connector: async (_req: any) => { calls++; throw new Error("must not be called"); },
  };
  const dead = AbortSignal.timeout(1);
  await sleep(10);
  const res = await fetchGuardedOnce("https://contoh.test/x", { deadline: dead, ...hooks });
  eq(res, null, "must return null");
  eq(calls, 0, "connector must never be called");
});

test("H-DL-06", "jalur normal tak terganggu: resolver cepat + deadline jauh -> ok", async () => {
  const resolver = async (_h: string): Promise<string[]> => ["93.184.216.34"];
  const deadline = AbortSignal.timeout(60_000);
  const v = await validateUrlForFetch("https://contoh.test/x", { resolver, deadline });
  eq(v.ok, true, "fast resolver with a far deadline must validate");
  if (v.ok) eq(v.ip, "93.184.216.34", "pinned ip must be the resolved address");
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
console.log(`\nH-DL: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
