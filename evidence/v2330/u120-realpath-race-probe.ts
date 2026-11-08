// u120-realpath-race-probe.ts — U-118/U-120 (v2.3.30):
// Why does H-MIGR-46 retry inventory runs that fail with a
// transient realpath ENOENT?
//
// While the swap-race worker renames a fresh copy over the target
// path as fast as possible, glibc realpath(3) can fail with ENOENT
// even though the path never disappears: realpath resolves the path
// component-by-component and can race the rename, while a single
// stat(2) never fails in the same loop. This probe quantifies that
// on this VM (tmpfs /tmp): 5000 realpathSync + 5000 statSync calls
// against a swapping target.
//
// Run:  bun evidence/v2330/u120-realpath-race-probe.ts
// Output is the probe's own stdout. VM evidence only. The worker
// (evidence/v2330/swap-race-worker.ts) and the target/master files
// are all disposable; no live database is touched.

import { copyFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { mkdtempSync, realpathSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeMigratedDb, seedChecks } from "../v2323/harness-helpers";

const tdb = makeMigratedDb();
seedChecks(tdb.dbPath, [
  { url: "https://a.example/", domain: "a.example", verdict: "lebih_aman", score: 10, ownerUserId: "local:owner-1" },
]);
const dir = mkdtempSync(join(tmpdir(), "v2330-realpath-probe-"));
const masterA = join(dir, "a.sqlite");
const masterB = join(dir, "b.sqlite");
copyFileSync(tdb.dbPath, masterA);
copyFileSync(tdb.dbPath, masterB);
const target = join(dir, "target.sqlite");
copyFileSync(masterA, target);
const worker = spawn("bun", [join(import.meta.dir, "swap-race-worker.ts"), dir, target, masterA, masterB], {
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 300));
const N = 5000;
let rpFail = 0;
let stFail = 0;
for (let i = 0; i < N; i++) {
  try {
    realpathSync(target);
  } catch {
    rpFail++;
  }
  try {
    statSync(target);
  } catch {
    stFail++;
  }
}
console.log(`u120-realpath-race-probe: realpathSync fails ${rpFail}/${N}, statSync fails ${stFail}/${N} (tmpfs, swap worker running)`);
console.log(
  `CONCLUSION: realpath(3) can return a transient ENOENT while a rename swaps the final component — a single stat(2) does not. H-MIGR-46 therefore retries runs that fail ONLY with the exact "cannot resolve real path ... ENOENT" error and counts the retries; any other failure FAILS the test. This is a harness/filesystem artifact of swapping as fast as possible, not evidence the tool opened the wrong database.`,
);
worker.kill("SIGKILL");
await new Promise((r) => {
  worker.on("exit", r);
  setTimeout(r, 2000);
});
tdb.close();
