// test-timeout-persist-v2324.ts — F-053 (v2.3.24): scan yang timeout
// TIDAK BOLEH tersimpan sebagai hasil biasa.
//
// Tests the REAL `runCheck` from site/server/src/actions.ts against a
// disposable DB (REAL migrations). Fixture: resolver yang menjawab
// setiap query setelah 4 dtk, sehingga kerja serial (page + 3 script)
// terakumulasi melewati deadline total 20 dtk. Satu-satunya run 20 dtk
// di putaran ini — H-DL merujuk ke tes ini dan tidak menduplikasinya.
//
//   H-TO-01  runCheck + DNS tak pernah settle -> error timeout eksplisit
//            yang retryable, 0 baris checks, lease dilepas, elapsed
//            dalam [19.5 dtk, 25 dtk) — deadline + grace, bukan gantung
//
// Run:  bun evidence/v2324/test-timeout-persist-v2324.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import { runCheck, setCheckLinkEnabled } from "../../site/server/src/actions";
import { countRows, localViewer, makeMigratedDb, mkCtx } from "../v2323/harness-helpers";
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

test("H-TO-01", "runCheck + DNS lambat terakumulasi -> timeout eksplisit, 0 baris, lease lepas, ~20 dtk", async () => {
  const tdb = makeMigratedDb();
  try {
    const ctx = mkCtx(tdb.db, localViewer("owner-1", true));
    // Fixture: resolver yang menjawab SETIAP query setelah 4 dtk (di
    // bawah race DNS 5 dtk, jadi tiap lookup "berhasil" — tapi kerja
    // serialnya terakumulasi melewati deadline 20 dtk). Satu lookup yang
    // tak pernah settle TIDAK memicu deadline: race 5 dtk memotongnya
    // menjadi kegagalan DNS biasa ("unreachable", vonis lengkap yang sah)
    // — deadline hanya tercapai lewat kerja serial: page (preflight 4 dtk
    // + validasi hop 4 dtk) lalu 3 script serial (8 dtk masing-masing).
    // Deadline 20 dtk tercapai di tengah script ke-2; analyze harus
    // throw ScanTimeoutError dan runCheck TIDAK BOLEH insert baris.
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const hooks = {
      resolver: async (_host: string): Promise<string[]> => {
        await sleep(4000);
        return ["93.184.216.34"];
      },
      connector: async (req: { url: string }) => {
        const isRdap = req.url.startsWith("https://rdap.org/");
        const isScript = req.url.includes("/s");
        const bodyText = isRdap
          ? JSON.stringify({ events: [{ eventAction: "registration", eventDate: "2020-01-15T00:00:00Z" }], entities: [] })
          : isScript
            ? "console.log('script');"
            : "<html><head><title>Lambat</title></head><body>" +
              "<script src=\"/s1.js\"></script><script src=\"/s2.js\"></script>" +
              "<script src=\"/s3.js\"></script><p>Hai.</p></body></html>";
        return {
          status: 200,
          headers: { get: (n: string) => (n.toLowerCase() === "content-type" ? (isRdap ? "application/json" : "text/html") : null) },
          body: Readable.from([Buffer.from(bodyText)]),
        };
      },
    };
    setCheckLinkEnabled(true);
    const t0 = Date.now();
    let message = "";
    try {
      await runCheck(ctx, "https://lambat-terakumulasi.test/claim", { testHooks: hooks });
      throw new Error("runCheck must throw on timeout, but it returned");
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    } finally {
      setCheckLinkEnabled(false);
    }
    const elapsed = Date.now() - t0;
    assert(
      message.includes("kehabisan waktu"),
      `error must be the explicit timeout message (got: ${message})`,
    );
    assert(
      message.includes("tidak disimpan") && message.includes("Coba lagi"),
      `error must state nothing was stored and be retryable (got: ${message})`,
    );
    eq(countRows(tdb.dbPath, "checks"), 0, "zero check rows may be inserted on timeout");
    eq(countRows(tdb.dbPath, "scan_leases"), 0, "lease must be released after timeout");
    assert(
      elapsed >= 19_500 && elapsed < 25_000,
      `whole runCheck must terminate near the 20 s deadline (elapsed=${elapsed} ms)`,
    );
    console.log(`    [H-TO-01] elapsed=${elapsed} ms, error=${JSON.stringify(message)}`);
  } finally {
    tdb.close();
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
console.log(`\nH-TO: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
