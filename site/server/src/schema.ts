import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Migrasi 0006 + 0007 + 0008 (v2.3.23 D-01/D-03, v2.3.24 F-055) — skema
// ini HARUS tetap cocok dengan DDL di site/drizzle/0006, 0007, dan 0008.
// Bila keduanya menyimpang, harness v2.3.23/v2.3.24 (H-MIG-02 / DK)
// gagal: DDL Drizzle dibangkitkan dari definisi ini dan dibandingkan
// dengan hasil migrasi.
// Lantai versi SQLite: >= 3.31.0 (generated columns). Versi runtime
// produksi TIDAK TERVERIFIKASI (U-90) — staging wajib mencatatnya.

export const checks = sqliteTable(
  "checks",
  {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  verdict: text("verdict", {
    enum: ["bahaya", "waspada", "lebih_aman", "tidak_diketahui"],
  }).notNull(),
  score: integer("score").notNull(),
  /** JSON array of signal objects: { id, status, label, detail }. */
  signals: text("signals").notNull(),
  /** JSON array of contract objects: { chain, address }. */
  contracts: text("contracts").notNull(),
  pageTitle: text("page_title"),
  finalUrl: text("final_url"),
  httpStatus: integer("http_status"),
  registeredAt: text("registered_at"),
  registrar: text("registrar"),
  domainAgeDays: integer("domain_age_days"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  /**
   * Principal pemilik baris ini (F-046, migrasi 0006). NULL berarti
   * "tanpa pemilik tercatat" — BUKAN "publik": baris NULL tidak pernah
   * dikembalikan ke principal biasa oleh query apa pun (kebijakan
   * fail-closed L-A; hanya export legacy admin-gated yang boleh
   * membacanya — lihat actions.ts). Diisi server dari ctx.viewer bila
   * tersedia (lihat resolvePrincipal), NULL bila anonim.
   */
  ownerUserId: text("owner_user_id"),
  },
  (t) => [
    // F-046: lookup riwayat per principal.
    index("checks_owner_idx").on(t.ownerUserId),
  ],
);

/**
 * Verified airdrop project catalog. Seeded once from the user's own
 * verified on-chain radar (see DATA-PLAN.md); rows carry the verification
 * date and source so nothing is presented as more current than it is.
 *
 * Model katalog adalah GLOBAL lintas principal (F-040): semua principal
 * melihat katalog yang sama; ownership hanya berlaku untuk checks dan
 * saved_projects, bukan untuk katalog.
 */
export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    ticker: text("ticker"),
    chain: text("chain").notNull(),
    category: text("category", {
      enum: ["DeFi", "Layer 1", "Layer 2", "NFT", "Gaming", "Testnet", "AI & Web3"],
    }).notNull(),
    segment: text("segment", { enum: ["live", "upcoming", "ended"] }).notNull(),
    status_label: text("status_label").notNull(),
    description: text("description").notNull(),
    difficulty: text("difficulty", { enum: ["Easy", "Medium", "Hard"] }).notNull(),
    reward_note: text("reward_note"),
    contract_address: text("contract_address"),
    /**
     * Bentuk kanonik alamat kontrak (F-043/F-045, migrasi 0006).
     * Generated STORED — dihitung DB, TIDAK PERNAH ditulis aplikasi.
     * Ekspresi ini HARUS identik dengan canonicalizeContractAddress()
     * di catalog.ts (diuji H-CAT-13).
     */
    contractAddressCanonical: text("contract_address_canonical").generatedAlwaysAs(
      sql`CASE
        WHEN "contract_address" IS NULL THEN NULL
        WHEN "chain" = 'Solana' THEN trim("contract_address")
        WHEN "chain" IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain') THEN
          CASE WHEN lower(substr(trim("contract_address"),1,2)) = '0x'
               THEN '0x' || lower(substr(trim("contract_address"),3))
               ELSE '0x' || lower(trim("contract_address")) END
        ELSE NULL
      END`,
      { mode: "stored" },
    ),
    explorer_url: text("explorer_url"),
    official_url: text("official_url"),
    x_handle: text("x_handle"),
    verified_at: text("verified_at").notNull(),
    verified_note: text("verified_note").notNull(),
    sort: integer("sort").notNull().default(0),
    /** Provenance — diisi SERVER (bukan dari args caller). */
    provenanceSourceUrl: text("provenance_source_url"),
    provenanceSubmittedBy: text("provenance_submitted_by"),
    provenanceVerifiedBy: text("provenance_verified_by"),
  },
  (t) => [
    // F-045: chain hanya dari allowlist (K-8) — menolak chain tak dikenal
    // pada INSERT DAN UPDATE, termasuk bila contract_address NULL.
    check(
      "projects_chain_allowlist_ck",
      sql`${t.chain} IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain','Solana')`,
    ),
    // F-045: format alamat harus valid untuk tipe chain-nya.
    // F-055 (v2.3.24, migrasi 0008): cabang Solana kini menegakkan
    // allowlist base58 PENUH — identik dengan validator aplikasi
    // (catalog.ts /^[1-9A-HJ-NP-Za-km-z]{32,44}$/). Sebelum 0008, CHECK
    // hanya memeriksa panjang + larangan 0/O/I/l/spasi.
    check(
      "projects_contract_format_ck",
      sql`${t.contract_address} IS NULL
        OR (${t.chain} = 'Solana'
          AND length(trim(${t.contract_address})) BETWEEN 32 AND 44
          AND trim(${t.contract_address}) NOT GLOB '*[^1-9A-HJ-NP-Za-km-z]*')
        OR (${t.chain} IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain')
          AND (
            (length(trim(${t.contract_address})) = 42
             AND lower(substr(trim(${t.contract_address}),1,2)) = '0x'
             AND substr(trim(${t.contract_address}),3) NOT GLOB '*[^0-9a-fA-F]*')
            OR
            (length(trim(${t.contract_address})) = 40
             AND trim(${t.contract_address}) NOT GLOB '*[^0-9a-fA-F]*')
          ))`,
    ),
    // F-004: nama ternormalisasi unik secara global.
    uniqueIndex("projects_name_normalized_unique").on(
      sql`lower(trim(${t.name}))`,
    ),
    // F-004: alamat kanonik unik per chain (NULL tidak pernah cocok).
    uniqueIndex("projects_contract_normalized_unique")
      .on(t.chain, t.contractAddressCanonical)
      .where(sql`${t.contract_address} IS NOT NULL`),
  ],
);

/**
 * The user's own tracking state per project: bookmark + task status.
 * Migrasi 0006 (F-040): composite key (principal_id, project_id) —
 * state tiap principal independen; baris lama memakai sentinel
 * '<LEGACY>' (pemilik tidak tercatat — bukan ditebak sebagai user
 * tertentu). Baca/tulis SELALU memakai principal_id (lihat actions.ts).
 */
export const savedProjects = sqliteTable(
  "saved_projects",
  {
    principalId: text("principal_id").notNull(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    bookmarked: integer("bookmarked").notNull().default(1),
    taskStatus: text("task_status", {
      enum: ["not_started", "in_progress", "completed"],
    })
      .notNull()
      .default("not_started"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.principalId, t.projectId] })],
);

/**
 * Scan concurrency leases (F-003c, migrasi 0007). One row = one scan in
 * flight. Acquired via a SINGLE atomic conditional INSERT (see
 * scan-limits.ts): the live-lease count check and the insert happen in
 * one statement, so the global cap (5) holds even under concurrency —
 * SpaceDb exposes no transaction (SDK 0.14.0), so atomicity must come
 * from the statement itself, not an app transaction.
 * Rows are ephemeral: expires_at = acquired_at + 25 s (TTL > 20 s total
 * deadline by design — a lease never expires mid-scan); expired rows
 * are deleted best-effort on the next acquire. A crashed scan's lease
 * expires by TTL — no manual cleanup needed.
 */
export const scanLeases = sqliteTable(
  "scan_leases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    principalId: text("principal_id").notNull(),
    acquiredAt: integer("acquired_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("scan_leases_expires_idx").on(t.expiresAt)],
);

/**
 * Per-principal rate-limit counters (F-003c, migrasi 0007). One row per
 * (principal, window, window_start): window = 'minute' (10/menit) atau
 * 'hour' (100/jam). Updated via UPSERT (ON CONFLICT DO UPDATE) —
 * approximate under concurrency (the count read-back is a separate
 * statement); the HARD global bound is the lease cap, not this counter.
 * Anonymous callers share the single bucket principal '<ANONYMOUS>'.
 * U-85: IP-based enforcement is BLOCKED — the SDK Ctx exposes no peer
 * TCP address, so the key is the principal, not the IP.
 */
export const rateLimits = sqliteTable(
  "rate_limits",
  {
    principalId: text("principal_id").notNull(),
    window: text("window", { enum: ["minute", "hour"] }).notNull(),
    windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
    count: integer("count").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.principalId, t.window, t.windowStart] })],
);
