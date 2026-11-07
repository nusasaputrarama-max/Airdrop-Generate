// Stepped adversarial racer — v2.3.3 code (startup-v233.cjs) with barrier
// hooks, so a racy interleaving can be reproduced DETERMINISTICALLY instead
// of relying on random timing (which is why SU10-T1 passed despite the bug).
//
// Usage: node stepped-racer.cjs <lockPath> <id:A|B> <variant> <barrierDir>
//   variant T1  — B waits until A has acquired, THEN unlinks the path
//                 (the ChatGPT scenario: unlink lands AFTER A created +
//                 verified). Expected on v2.3.3 code: BOTH A and B acquire.
//   variant T3a — B waits until A created, then unlinks BEFORE A verifies;
//                 A waits for B's unlink before verifying.
//                 Expected: A fails ownership-revalidation, B acquires
//                 (exactly one owner — verify catches THIS interleaving).
//   variant T3c — both unlink before either creates (barrier in afterUnlink:
//                 neither proceeds to create until BOTH have unlinked).
//                 Expected: O_EXCL serialises creation, exactly one owner.
//   variant T6B — like T1, but B waits for a *flock* holder's signal
//                 (acquired.A written by the Bun flock racer) before
//                 unlinking. Used by the mixed-version test ADV-T6.
//
// The racer NEVER performs cleanup; it only acquires + verifies, then holds
// its fd briefly so the orchestrator can inspect final lock state.
// Output: one JSON line on stdout.
'use strict';
const fs = require('fs');
const S = require('./startup-v233.cjs');
const B = require('./barrier.cjs');

const lockPath = process.argv[2];
const id = process.argv[3]; // 'A' | 'B'
const variant = process.argv[4]; // T1 | T3a | T3c | T6B
const barrierDir = process.argv[5];

const identity = { pid: process.pid, starttime: S.readProcStat(process.pid).starttime };

const hooks = {
  afterProbe: () => {
    // Both racers must have probed ESRCH on the SAME stale record before
    // either proceeds — this freezes the "stale observation" both act on.
    B.sig(barrierDir, `probed.${id}`);
    if (variant === 'T6B') {
      // Mixed-version test: the other side is a FLOCK racer (Bun) which
      // never probes — there is no probed.A signal to wait for. Waiting
      // for it would burn the whole 15 s barrier timeout and let A verify
      // BEFORE B unlinks (false "A FAILED to detect"). B proceeds as soon
      // as it has probed; A's own ordering is enforced by acquired.A.
      return;
    }
    B.waitFor(barrierDir, ['probed.A', 'probed.B']);
  },
  beforeUnlink: () => {
    if ((variant === 'T1' || variant === 'T6B') && id === 'B') {
      // THE critical wait: B unlinks only AFTER A has fully acquired
      // (created + written + verified + returned).
      B.waitFor(barrierDir, ['acquired.A']);
    }
    if (variant === 'T3a' && id === 'B') {
      // B unlinks after A created but before A verified.
      B.waitFor(barrierDir, ['created.A']);
    }
    // T3c: no wait — both unlink immediately.
  },
  afterUnlink: () => {
    B.sig(barrierDir, `unlinked.${id}`);
    if (variant === 'T3c') {
      // Deterministic "both unlinked before either creates": neither
      // proceeds to the create attempt until BOTH have unlinked. Without
      // this barrier the test degenerates into the T1 interleaving (the
      // slower racer's unlink lands after the faster racer's create).
      B.waitFor(barrierDir, ['unlinked.A', 'unlinked.B']);
    }
  },
  afterCreate: () => { B.sig(barrierDir, `created.${id}`); },
  beforeVerify: () => {
    if (variant === 'T3a' && id === 'A') {
      // A verifies only after B has unlinked A's fresh file.
      B.waitFor(barrierDir, ['unlinked.B']);
    }
  },
};

const res = S.acquireStartupLock(lockPath, identity, { maxReclaim: 10, hooks });
let ownershipVerified = false;
let myIno = null;
if (res.acquired) {
  ownershipVerified = S.verifyLockOwnership(lockPath, identity);
  try { myIno = fs.fstatSync(res.fd).ino; } catch {}
  B.sig(barrierDir, `acquired.${id}`);
  // Hold the fd briefly so the orchestrator can observe final state.
  setTimeout(() => { try { fs.closeSync(res.fd); } catch {} process.exit(0); }, 2000);
} else {
  process.stdout.write(JSON.stringify({
    id, pid: process.pid, acquired: false, reason: res.reason,
    detail: res.detail || null, reclaimed: !!res.reclaimed,
    ownershipVerified: false, myIno, cleanupCalls: 0,
  }) + '\n');
  process.exit(0);
}
process.stdout.write(JSON.stringify({
  id, pid: process.pid, acquired: true, reason: null,
  detail: null, reclaimed: !!res.reclaimed,
  ownershipVerified, myIno, cleanupCalls: 0,
}) + '\n');
