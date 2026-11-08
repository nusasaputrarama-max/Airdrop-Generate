// harness-helpers.ts — shared disposable-DB + mock-ctx setup for round-2
// harnesses (H-LEG legacy export, H-KILL checkLink kill-switch).
//
// No test runs on import; pure helpers. The DB is built by applying the
// REAL migration files 0001-0007 statement-by-statement (bun:sqlite)
// into a disposable file under os.tmpdir() — never the live app.db.
// The mock ctx mirrors the H-TEN pattern (test-migration-v2323.ts):
// db() returns a real drizzle libsql instance; viewer is a local or
// cloudflare viewer object; inference.complete is stubbed.
//
// Run harnesses from the worktree root:  bun evidence/v2323/<harness>.ts
// Exit 0 = all PASS; exit 1 = any FAIL. VM evidence only — not staging.

import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "../../site/node_modules/drizzle-orm/libsql";
import { createClient } from "../../site/node_modules/@libsql/client";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const MIGRATION_FILES = [
  "0001_initial.sql",
  "0002_checks_table_replaces_entries.sql",
  "0003_add_projects_catalog_and_saved_projects.sql",
  "0004_seed_projects_catalog_permanently.sql",
  "0005_translate_catalog_text_to_bahasa_indonesia.sql",
  "0006_unified_ownership_and_uniqueness.sql",
  "0007_scan_leases_and_rate_limits.sql",
  "0008_solana_base58_check.sql",
];

export interface TestDb {
  dir: string;
  dbPath: string;
  client: any;
  db: any;
  close: () => void;
}

/** Build a disposable DB by applying migrations 0001-0007 in order. */
export function makeMigratedDb(): TestDb {
  const dir = mkdtempSync(join(tmpdir(), "v2324-harness-"));
  const dbPath = join(dir, "test.db");
  for (const file of MIGRATION_FILES) {
    const text = readFileSync(join(REPO_ROOT, "site", "drizzle", file), "utf8");
    const chunks = text
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    const raw = new Database(dbPath);
    try {
      for (const chunk of chunks) raw.exec(chunk);
    } finally {
      raw.close();
    }
  }
  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzle(client);
  return {
    dir,
    dbPath,
    client,
    db,
    close: () => {
      try {
        client.close();
      } catch {
        /* already closed — ignore */
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export interface SeedCheckRow {
  url: string;
  domain: string;
  verdict: string;
  score: number;
  ownerUserId: string | null;
}

/** Insert check rows directly (bypasses the actions under test). */
export function seedChecks(dbPath: string, rows: SeedCheckRow[]): void {
  const raw = new Database(dbPath);
  try {
    const stmt = raw.query(
      "INSERT INTO checks (url, domain, verdict, score, signals, contracts, created_at, owner_user_id) VALUES (?,?,?,?,?,?,?,?)",
    );
    const nowMs = Date.now();
    for (const r of rows) {
      stmt.run(r.url, r.domain, r.verdict, r.score, "[]", "[]", nowMs, r.ownerUserId);
    }
  } finally {
    raw.close();
  }
}

/** Count rows in a table (raw SQL, for side-effect assertions). */
export function countRows(dbPath: string, table: string): number {
  const raw = new Database(dbPath);
  try {
    const row: any = raw.query(`SELECT count(*) AS n FROM ${table}`).get();
    return Number(row?.n ?? 0);
  } finally {
    raw.close();
  }
}

/** A local viewer object (mirrors the H-TEN mock ctx). */
export function localViewer(ownerUserId: string, isOwner: boolean): any {
  return {
    source: "local",
    authenticated: true,
    spaceSlug: "test",
    userId: `u-${ownerUserId}`,
    ownerUserId,
    isOwner,
  };
}

/** A cloudflare viewer object (identity is the share, not a user id). */
export function cloudflareViewer(shareId: string, isOwner: boolean): any {
  return {
    source: "cloudflare",
    authenticated: true,
    shareId,
    spaceSlug: "test",
    isOwner,
    tokenExpiresAt: Date.now() + 3_600_000,
    tokenId: "test-token",
  };
}

/** Mock ctx in the H-TEN shape (db + viewer + inference stub). */
export function mkCtx(db: any, viewer: any, opts?: { promptSink?: (p: string) => void }): any {
  return {
    slug: "test",
    invocationId: "test-1",
    spaceDir: "test",
    db: () => db,
    viewer,
    invalidateQueries: () => {},
    inference: {
      complete: async (prompt: string, _o: any) => {
        opts?.promptSink?.(prompt);
        return "MOCK-REPLY";
      },
    },
    blobs: {},
    agent: {},
    tool: {},
    emit: () => {},
    executePrivileged: async () => {
      throw new Error("privileged tidak dipakai di tes ini");
    },
  };
}
