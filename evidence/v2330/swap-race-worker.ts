// swap-race-worker.ts — disposable path-swap worker for H-MIGR-46
// (v2.3.30, U-118/U-120):
//
// The H-MIGR-46 harness starts this worker as a child process. The
// worker continuously swaps the contents of a TARGET database path
// between two master copies (A and B) with atomic rename(2), while
// the harness runs the migration tool's `inventory` mode against the
// target path in a loop. Each rename replaces the target atomically,
// so the tool always opens a complete file — either A or B — but the
// tool cannot control WHICH one it opens if the swap lands between
// guardDbPath() and new Database(). That is the U-118 residual, and
// this worker exists to make it observable in a disposable setting.
//
// Usage (harness only, never by hand against a real database):
//   bun evidence/v2330/swap-race-worker.ts <workdir> <target> <masterA> <masterB>
// Runs until killed. Only ever touches disposable files under <workdir>.

import { copyFileSync, renameSync } from "node:fs";
import { join } from "node:path";

const [workdir, target, masterA, masterB] = process.argv.slice(2);
if (!workdir || !target || !masterA || !masterB) {
  console.error("usage: swap-race-worker.ts <workdir> <target> <masterA> <masterB>");
  process.exit(2);
}

let i = 0;
for (;;) {
  const tmp = join(workdir, `swap-${process.pid}-${i}.tmp`);
  try {
    copyFileSync(masterB, tmp);
    renameSync(tmp, target);
    copyFileSync(masterA, tmp);
    renameSync(tmp, target);
  } catch {
    // The harness may delete the workdir while shutting down; the
    // worker is killed right after, so a failed swap is not an error.
  }
  i++;
}
