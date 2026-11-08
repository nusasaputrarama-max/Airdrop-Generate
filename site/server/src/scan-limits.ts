// Scan concurrency leases + per-principal rate limits (F-003c, D-03).
//
// Design (v2.3.20 §3, F-003): the checkLink path is bounded by TWO
// independent mechanisms — a global concurrency lease (max 5 scans in
// flight, enforced by ONE atomic conditional INSERT) and a per-principal
// rate limit (10/min + 100/hour, enforced by UPSERT counters).
//
// Why the lease is a single statement: SpaceDb (SDK 0.14.0) exposes NO
// transaction ("D1 rejects Drizzle's SQL BEGIN/SAVEPOINT transaction
// implementation"), so a check-then-insert in two statements would race
// under concurrency. The conditional INSERT evaluates the live-lease
// count and inserts in the same statement — the cap holds even when two
// callers race. `RETURNING id` gives the lease id for release without a
// racy select-back.
//
// Why the rate limit is approximate: the UPSERT increment is atomic, but
// the count read-back is a separate statement, so two concurrent callers
// can both pass at exactly the boundary. The HARD bound is the lease
// cap (5 global), not this counter — the rate limit is abuse friction,
// not a correctness invariant.
//
// U-85 (carried forward): IP-based enforcement is BLOCKED — the SDK Ctx
// exposes no peer TCP address, so the key is the principal derived from
// ctx.viewer (see resolvePrincipal in actions.ts). Anonymous callers
// share ONE bucket ('<ANONYMOUS>') — fail-closed: anonymous traffic
// cannot bypass the limit by rotating identities it does not have.
//
// TTL vs deadline: SCAN_LEASE_TTL_MS (25 s) > TOTAL_DEADLINE_MS (20 s)
// by design — a lease never expires in the middle of a normal scan.
// A crashed scan's lease expires by TTL; expired rows are deleted
// best-effort on the next acquire.
//
// F-052 (v2.3.24): the 25 s TTL is sufficient ONLY because the 20 s
// deadline is now a HARD bound — it is propagated into every DNS
// validation/preflight (validateUrlForFetch races the resolver against
// it), checked before cache reads and before each script fetch, and
// aborts in-flight connectors/streams. No scan work can START after
// 20 s, and in-flight work unwinds promptly on abort (H-DL/H-TO prove
// the whole runCheck terminates within 20 s + grace and releases its
// lease). The 5 s margin covers that unwind (synchronous throw +
// one DELETE in runCheck's finally). Before v2.3.24 the deadline did
// NOT bound DNS, so a scan could outlive its lease unboundedly; that
// gap is closed, not papered over by lengthening the TTL.
//
// Staging gates: STAGE-P02 (ctx.viewer populated at runtime) decides
// whether principals are real; the lease/rate logic itself is tested on
// a real Drizzle libsql DB in evidence/v2323/test-lease-v2323.ts.

import { and, eq, lte, sql } from "drizzle-orm";
import type { SpaceDb } from "@hatch/space-sdk";
import * as schema from "./schema";

export type ScanDb = SpaceDb<typeof schema>;

/** Max scans in flight globally (owner decision §A.5, F-003). */
export const MAX_SCAN_CONCURRENCY = 5;
/** Lease lifetime. Must stay > TOTAL_DEADLINE_MS (20 s). */
export const SCAN_LEASE_TTL_MS = 25_000;
/** Per-principal rate limits (owner decision §A.5, F-003). */
export const RATE_LIMIT_PER_MINUTE = 10;
export const RATE_LIMIT_PER_HOUR = 100;
/** Shared rate-limit bucket for anonymous callers (fail-closed). */
export const ANONYMOUS_RATE_BUCKET = "<ANONYMOUS>";

export type LeaseResult =
  | { acquired: true; leaseId: number }
  | { acquired: false; reason: "concurrency-limit" };

/**
 * Acquire one global scan slot for `principalId`. Returns the lease id
 * on success (pass it to releaseScanSlot in a finally block) or a
 * concurrency-limit denial. `now` is injectable for tests (TTL expiry).
 */
export async function acquireScanSlot(
  db: ScanDb,
  principalId: string,
  now = Date.now(),
): Promise<LeaseResult> {
  const expiresAt = now + SCAN_LEASE_TTL_MS;
  // Best-effort cleanup of expired leases (keeps the table small; a
  // crashed scan's lease is gone by TTL even without this).
  await db.delete(schema.scanLeases).where(lte(schema.scanLeases.expiresAt, new Date(now)));
  // ONE atomic statement: insert only if fewer than MAX live leases.
  const res = await db.run(sql`
    INSERT INTO scan_leases (principal_id, acquired_at, expires_at)
    SELECT ${principalId}, ${now}, ${expiresAt}
    WHERE (SELECT COUNT(*) FROM scan_leases WHERE expires_at > ${now}) < ${MAX_SCAN_CONCURRENCY}
    RETURNING id
  `);
  // H-LEASE (v2.3.23): on the real @libsql/client driver, INSERT ...
  // RETURNING reports rowsAffected 0 even when the row IS inserted —
  // rowsAffected is NOT a reliable success signal for RETURNING
  // statements. The RETURNING row itself is the ground truth: one row
  // means one lease acquired; zero rows means the cap was full.
  // Whether production SpaceDb.run reports rowsAffected differently is
  // NOT VERIFIED from this VM (staging follow-up, STAGE-P02).
  const row = res.rows?.[0] as { id: number } | undefined;
  if (typeof row?.id !== "number")
    return { acquired: false, reason: "concurrency-limit" };
  return { acquired: true, leaseId: row.id };
}

/** Release a previously acquired lease (no-op if already gone). */
export async function releaseScanSlot(db: ScanDb, leaseId: number): Promise<void> {
  await db.delete(schema.scanLeases).where(eq(schema.scanLeases.id, leaseId));
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "rate-limit-minute" | "rate-limit-hour" };

/**
 * Per-principal rate limit: 10/min + 100/hour. Each window is a
 * separate UPSERT counter keyed by (principal, window, window_start).
 * Counts ATTEMPTS (a denied attempt still increments the counter).
 * `now` is injectable for tests (window rollover).
 */
export async function checkRateLimit(
  db: ScanDb,
  principalId: string,
  now = Date.now(),
): Promise<RateLimitResult> {
  const bucket = principalId === "" ? ANONYMOUS_RATE_BUCKET : principalId;
  for (const [window, limit] of [
    ["minute", RATE_LIMIT_PER_MINUTE],
    ["hour", RATE_LIMIT_PER_HOUR],
  ] as const) {
    const span = window === "minute" ? 60_000 : 3_600_000;
    const windowStart = now - (now % span);
    await db.run(sql`
      INSERT INTO rate_limits (principal_id, window, window_start, count)
      VALUES (${bucket}, ${window}, ${windowStart}, 1)
      ON CONFLICT(principal_id, window, window_start) DO UPDATE SET count = count + 1
    `);
    const rows = await db
      .select({ count: schema.rateLimits.count })
      .from(schema.rateLimits)
      .where(
        and(
          eq(schema.rateLimits.principalId, bucket),
          eq(schema.rateLimits.window, window),
          eq(schema.rateLimits.windowStart, new Date(windowStart)),
        ),
      );
    const count = rows[0]?.count ?? 0;
    if (count > limit)
      return {
        allowed: false,
        reason: window === "minute" ? "rate-limit-minute" : "rate-limit-hour",
      };
  }
  return { allowed: true };
}
