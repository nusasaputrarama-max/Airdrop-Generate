// test-same-origin-redirect-v2324.ts — F-056 (v2.3.24): kebijakan
// same-origin script TIDAK BOLEH lolos lewat redirect.
//
// Tests the REAL `fetchText` from site/server/src/actions.ts with
// `opts.allowedOrigin` (stub resolver/connector, no real network).
// Kebijakan diteruskan ke loop fetch dan ditegakkan di SETIAP hop
// redirect — sebelum koneksi hop kedua dibuka.
//
//   H-SO-01  script same-origin -> 302 cross-origin -> null; connector
//            dipanggil 1x saja (hop kedua tak pernah dibuka)
//   H-SO-02  redirect same-origin -> diikuti, body kembali (2 calls)
//   H-SO-03  URL awal cross-origin vs allowedOrigin -> null, 0 calls
//   H-SO-04  tanpa allowedOrigin (jalur page): redirect cross-origin
//            tetap diikuti (perilaku lama dipertahankan)
//   H-SO-05  redirect relatif same-origin -> diikuti
//
// URL berbeda per tes (cache module-level dibagi dalam satu proses).
//
// Run:  bun evidence/v2324/test-same-origin-redirect-v2324.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import { fetchText } from "../../site/server/src/actions";
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

type Route = { status: number; location?: string; body: string };
function makeConnector(routes: Record<string, Route>, calls: string[]): any {
  return async (req: { url: string }) => {
    calls.push(req.url);
    const route = routes[req.url];
    if (!route) throw new Error(`no stub route for ${req.url}`);
    return {
      status: route.status,
      headers: {
        get: (n: string) => {
          const name = n.toLowerCase();
          if (name === "location") return route.location ?? null;
          if (name === "content-type") return "text/html";
          return null;
        },
      },
      body: Readable.from([Buffer.from(route.body)]),
    };
  };
}

test("H-SO-01", "script same-origin -> 302 cross-origin -> null, hop kedua tak dibuka", async () => {
  const calls: string[] = [];
  const hooks = {
    resolver,
    connector: makeConnector(
      {
        "https://a.test/so01-bundle.js": { status: 302, location: "https://evil.test/x.js", body: "" },
        "https://evil.test/x.js": { status: 200, body: "MALICIOUS" },
      },
      calls,
    ),
  };
  const res = await fetchText("https://a.test/so01-bundle.js", 300_000, undefined, undefined, hooks, {
    allowedOrigin: "https://a.test",
  });
  eq(res, null, "cross-origin redirect from a same-origin script must be rejected");
  // fetchText retries once internally on null, so the first hop is
  // fetched twice (2 calls) — but the cross-origin hop must NEVER be
  // fetched on either attempt.
  assert(calls.every((c) => c === "https://a.test/so01-bundle.js"), `only the same-origin hop may be fetched (got: ${calls.join(", ")})`);
  assert(!calls.includes("https://evil.test/x.js"), "the cross-origin redirect target must never be fetched");
});

test("H-SO-02", "redirect same-origin -> diikuti, body kembali", async () => {
  const calls: string[] = [];
  const hooks = {
    resolver,
    connector: makeConnector(
      {
        "https://a.test/so02-ok.js": { status: 302, location: "https://a.test/so02-other.js", body: "" },
        "https://a.test/so02-other.js": { status: 200, body: "OK-BODY" },
      },
      calls,
    ),
  };
  const res = await fetchText("https://a.test/so02-ok.js", 300_000, undefined, undefined, hooks, {
    allowedOrigin: "https://a.test",
  });
  assert(res !== null, "same-origin redirect must be followed");
  eq(res!.text, "OK-BODY", "final body must be returned");
  eq(calls.length, 2, "both same-origin hops must be fetched");
});

test("H-SO-03", "URL awal cross-origin vs allowedOrigin -> null, 0 calls", async () => {
  const calls: string[] = [];
  const hooks = {
    resolver,
    connector: makeConnector({ "https://evil.test/so03.js": { status: 200, body: "X" } }, calls),
  };
  const res = await fetchText("https://evil.test/so03.js", 300_000, undefined, undefined, hooks, {
    allowedOrigin: "https://a.test",
  });
  eq(res, null, "initial cross-origin URL must be rejected before any fetch");
  eq(calls.length, 0, "connector must never be called");
});

test("H-SO-04", "tanpa allowedOrigin (jalur page): redirect cross-origin tetap diikuti", async () => {
  const calls: string[] = [];
  const hooks = {
    resolver,
    connector: makeConnector(
      {
        "https://a.test/so04-page": { status: 302, location: "https://b.test/so04-landing", body: "" },
        "https://b.test/so04-landing": { status: 200, body: "LANDING" },
      },
      calls,
    ),
  };
  const res = await fetchText("https://a.test/so04-page", 400_000, undefined, undefined, hooks);
  assert(res !== null, "page fetches without an origin policy must still follow redirects");
  eq(res!.text, "LANDING", "final body must be returned");
  eq(res!.finalUrl, "https://b.test/so04-landing", "final URL must be the redirect target");
  eq(calls.length, 2, "both hops must be fetched");
});

test("H-SO-05", "redirect relatif same-origin -> diikuti", async () => {
  const calls: string[] = [];
  const hooks = {
    resolver,
    connector: makeConnector(
      {
        "https://a.test/so05-a.js": { status: 302, location: "/so05-b.js", body: "" },
        "https://a.test/so05-b.js": { status: 200, body: "RELATIVE-OK" },
      },
      calls,
    ),
  };
  const res = await fetchText("https://a.test/so05-a.js", 300_000, undefined, undefined, hooks, {
    allowedOrigin: "https://a.test",
  });
  assert(res !== null, "relative same-origin redirect must be followed");
  eq(res!.text, "RELATIVE-OK", "final body must be returned");
  eq(calls.length, 2, "both hops must be fetched");
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
console.log(`\nH-SO: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
