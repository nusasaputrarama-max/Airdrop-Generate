/**
 * Database schema (types) — AIRDROP GENERATE (AG-001)
 *
 * STATUS: TYPES ONLY — mencerminkan DATABASE_SCHEMA.md §2 (PostgreSQL target).
 * Bukan ORM yang berfungsi; klien database ada di `client.ts` (stub).
 */

export type ProjectSegment = "live" | "upcoming" | "ended";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type TaskStatus = "not_started" | "in_progress" | "completed";
export type ReportStatus = "open" | "investigating" | "confirmed" | "rejected";

export interface AirdropProject {
  readonly id: string;
  readonly name: string;
  readonly ticker: string | null;
  readonly description: string;
  readonly chain: string;
  readonly category: string;
  readonly contractAddress: string | null;
  readonly officialUrl: string | null;
  readonly xHandle: string | null;
  readonly segment: ProjectSegment;
  readonly statusLabel: string;
  readonly difficulty: Difficulty;
  readonly rewardNote: string | null;
  readonly verifiedAt: string;
  readonly verifiedNote: string;
  readonly sort: number;
  readonly addedBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ScanHistoryRow {
  readonly id: string;
  readonly scannedUrlId: string;
  readonly userId: string | null;
  readonly classification: string;
  readonly legacyVerdict: string | null;
  readonly score: number;
  readonly signals: unknown;
  readonly intelSources: readonly string[];
  readonly limitations: readonly string[];
  readonly checkedAt: string;
}
