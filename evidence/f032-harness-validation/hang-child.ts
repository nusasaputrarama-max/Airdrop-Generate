// Dummy HANGING child for the F-032 timeout end-to-end test
// (v2.3.17). It accepts the same CLI args as exp-pattern.ts
// (--pattern/--fixture/--gc) and ignores them, records its PID to
// $F032_PID_FILE so the test driver can prove the parent killed it,
// prints one line, and then hangs FOREVER. It never prints a RESULT
// line and never exits on its own.
//
// This file lives ONLY in the experiment sandbox
// (evidence/f032-harness-validation/). It is a local test dummy: no
// network, no artifact, no checkLink, no production target. The
// parent harness run-f029.ts spawns it ONLY when the test-only env
// var F029_CHILD_SCRIPT points at it (see run-f032-timeout-e2e.ts).
// Production runs never set that variable.

import { appendFileSync } from "node:fs";

const pidFile = process.env.F032_PID_FILE;
if (pidFile) {
  // Append (one PID per line): the driver proves EVERY hanging child
  // was terminated, not just the last one spawned.
  appendFileSync(pidFile, `${process.pid}\n`);
}
console.log(
  `hang-child pid=${process.pid} args=${JSON.stringify(process.argv.slice(2))} — hanging forever (test dummy, no RESULT)`,
);
// Hang forever: a never-resolving promise keeps the event loop alive.
await new Promise(() => {});
