// test-cache-budget-v2324.ts — F-054 (v2.3.24): cache hit TIDAK BOLEH
// melewati budget byte agregat 1 MB per scan.
//
// Tests the REAL `fetchText` from site/server/src/actions.ts with a
// stub resolver/connector (no real network). Pilihan mitigasi: simpan
// panjang decoded byte eksak di tiap cache entry dan reserve terhadap
// ScanBudget saat ini sebelum mengembalikan hit (bukan bypass cache).
//
//   H-CB-01  cache hit men-charge budget: fetch 300 KB 2x dengan budget
//            yang sama -> used 600 KB; decodedBytes tercatat 300.000
//   H-CB-02  agregat 1 MB ditegakkan lintas hit: 300+300+300 = 900 KB
//            lolos; fetch 300 KB berikutnya (network) -> null, used tetap
//            900 KB
//   H-CB-03  cache hit dengan budget FRESH tetap dilayani (fromCache true)
//   H-CB-04  decodedBytes eksak: body 100 KB -> decodedBytes 100.000
//
// URL berbeda per tes (cache module-level dibagi dalam satu proses).
//
// Run:  bun evidence/v2324/test-cache-budget-v2324.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import { fetchText } from "../../site/server/src/actions";
import { AGGREGATE_DECODED_CAP, createScanBudget } from "../../site/server/src/ssrf-guard.ts";
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

const resolver = async (_h: string): Promise<string[]> => ["93.184.216.34"];

function makeConnector(calls: string[]): any {
  return async (req: { url: string }) => {
    calls.push(req.url);
    // Body 300 KB: ukuran diambil dari path (…/300k) agar satu stub bisa
    // melayani beberapa URL dengan ukuran sama.
    const size = req.url.includes("100k") ? 100_000 : 300_000;
    const ch = req.url.includes("100k") ? "C" : "B";
    return {
      status: 200,
      headers: { get: (n: string) => (n.toLowerCase() === "content-type" ? "text/html" : null) },
      body: Readable.from([Buffer.from(ch.repeat(size))]),
    };
  };
}

test("H-CB-01", "cache hit men-charge budget: 300 KB x2 -> used 600 KB", async () => {
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector(calls) };
  const budget = createScanBudget();
  const url = "http://cb.test/cb01-300k";
  const first = await fetchText(url, 400_000, undefined, budget, hooks);
  assert(first !== null, "first fetch must succeed");
  eq(first!.decodedBytes, 300_000, "decodedBytes must be the exact decoded length");
  eq(first!.fromCache, false, "first fetch must be fresh");
  eq(budget.aggregateDecodedUsed, 300_000, "network read must reserve 300 KB");
  const second = await fetchText(url, 400_000, undefined, budget, hooks);
  assert(second !== null, "cache hit must be served");
  eq(second!.fromCache, true, "second fetch must be a cache hit");
  eq(second!.decodedBytes, 300_000, "hit must keep the exact decoded length");
  eq(budget.aggregateDecodedUsed, 600_000, "cache hit must reserve another 300 KB");
  eq(calls.length, 1, "hit must not call the connector again");
});

test("H-CB-02", "agregat 1 MB ditegakkan lintas cache hit: 900 KB lolos, +300 KB ditolak", async () => {
  eq(AGGREGATE_DECODED_CAP, 1_000_000, "aggregate cap must be 1,000,000");
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector(calls) };
  const budget = createScanBudget();
  const page = await fetchText("http://cb.test/cb02-page-300k", 400_000, undefined, budget, hooks);
  assert(page !== null, "page fetch must succeed");
  const s1 = await fetchText("http://cb.test/cb02-s1-300k", 300_000, undefined, budget, hooks);
  assert(s1 !== null, "script 1 must succeed");
  const s1hit = await fetchText("http://cb.test/cb02-s1-300k", 300_000, undefined, budget, hooks);
  assert(s1hit !== null, "script 1 cache hit must be served (900 KB total)");
  eq(budget.aggregateDecodedUsed, 900_000, "used must be 900 KB after page + script + hit");
  // Skenario audit: page 400 KB + 3 script 300 KB cached = 1,3 MB.
  // Di sini 900 KB sudah terpakai; 300 KB berikutnya melewati 1 MB.
  const s2 = await fetchText("http://cb.test/cb02-s2-300k", 300_000, undefined, budget, hooks);
  eq(s2, null, "fetch that would exceed the aggregate cap must return null");
  eq(budget.aggregateDecodedUsed, 900_000, "used must stay 900 KB after the refused fetch");
  assert(budget.abort.signal.aborted, "budget must be aborted on aggregate overflow");
});

test("H-CB-03", "cache hit dengan budget fresh tetap dilayani", async () => {
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector(calls) };
  const budget1 = createScanBudget();
  const url = "http://cb.test/cb03-300k";
  const first = await fetchText(url, 400_000, undefined, budget1, hooks);
  assert(first !== null, "first fetch must succeed");
  const budget2 = createScanBudget();
  const second = await fetchText(url, 400_000, undefined, budget2, hooks);
  assert(second !== null, "hit with a fresh budget must be served");
  eq(second!.fromCache, true, "must be a cache hit");
  eq(budget2.aggregateDecodedUsed, 300_000, "fresh budget must be charged 300 KB");
});

test("H-CB-04", "decodedBytes eksak untuk body 100 KB", async () => {
  const calls: string[] = [];
  const hooks = { resolver, connector: makeConnector(calls) };
  const budget = createScanBudget();
  const res = await fetchText("http://cb.test/cb04-100k", 400_000, undefined, budget, hooks);
  assert(res !== null, "fetch must succeed");
  eq(res!.text.length, 100_000, "text length must be 100 KB");
  eq(res!.decodedBytes, 100_000, "decodedBytes must equal the text length for identity encoding");
  eq(budget.aggregateDecodedUsed, 100_000, "budget must be charged exactly 100 KB");
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
console.log(`\nH-CB: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
