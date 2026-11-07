import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const checks = sqliteTable("checks", {
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
});

/**
 * Verified airdrop project catalog. Seeded once from the user's own
 * verified on-chain radar (see DATA-PLAN.md); rows carry the verification
 * date and source so nothing is presented as more current than it is.
 */
export const projects = sqliteTable("projects", {
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
  explorer_url: text("explorer_url"),
  official_url: text("official_url"),
  x_handle: text("x_handle"),
  verified_at: text("verified_at").notNull(),
  verified_note: text("verified_note").notNull(),
  sort: integer("sort").notNull().default(0),
});

/** The user's own tracking state per project: bookmark + task status. */
export const savedProjects = sqliteTable("saved_projects", {
  projectId: integer("project_id")
    .primaryKey()
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
});
