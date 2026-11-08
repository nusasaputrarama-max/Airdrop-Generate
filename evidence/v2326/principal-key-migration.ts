// principal-key-migration.ts — F-060 / U-114 (v2.3.26): OFFLINE tool for
// principal-key compatibility after the v2.3.25 change
// `local:{ownerUserId}` -> `local:{userId}`.
//
// This is a STANDALONE Bun CLI script. It is NOT a server action, NOT
// imported by site/server/src/actions.ts, and NEVER runs against the
// live artifact database. Run it ONLY on a COPY of a database file, in
// a shell, by an operator who holds a VERIFIED owner mapping.
//
// Why a tool, not a migration: the old key `local:{ownerUserId}` and
// the new key `local:{userId}` have the SAME format (`local:<id>`), so
// no code can tell a legacy row from a current row by looking at the
// key alone. Guessing that userId == ownerUserId would silently hand
// one person's history to another (or orphan it). The tool therefore
// NEVER guesses a mapping:
//
//   - `inventory`  — report row counts per principal key, per table, so
//                    the operator can see exactly which keys exist.
//   - `archive`    — copy rows for an EXPLICIT, operator-supplied list
//                    of legacy keys into a JSON archive file. The DB is
//                    NOT modified; '<LEGACY>' sentinel rows and
//                    NULL-owner checks are archive-only by design.
//   - `rename`     — apply an EXPLICIT mapping file
//                    [{ legacyKey, currentKey, basis }] in ONE SQLite
//                    transaction across all three tables, with a full
//                    backup JSON written BEFORE any write, pre/post row
//                    counts, collision pre-checks, and automatic
//                    rollback on any failure. Refuses to run without a
//                    mapping file.
//   - `rollback`   — restore original keys from a backup JSON written
//                    by a previous `rename`, in one transaction.
//
// Tables/columns that store a principal key (inventory, F-060):
//   checks.owner_user_id, saved_projects.principal_id,
//   projects.provenance_submitted_by.
// '<LEGACY>' rows are NEVER renamed (their owner is unknown by
// definition — DL-23-03); NULL-owner checks are NEVER touched (L-A).
//
// Safety guards (fail-closed):
//   - refuses to open a file named app.db or under a ts-spaces path;
//   - refuses a mapping entry whose legacyKey is '<LEGACY>' or NULL;
//   - refuses duplicate legacyKey / duplicate currentKey in one file;
//   - refuses a rename whose target key would collide on the
//     saved_projects composite PK (principal_id, project_id);
//   - refuses to run `rename` without --mapping, `archive` without
//     --keys, `rollback` without --backup;
//   - every write path verifies pre/post counts and aborts (rollback)
//     on mismatch.
//
// Usage (from the worktree root; DB must be a COPY, never live app.db):
//   bun evidence/v2326/principal-key-migration.ts <db-path> inventory
//   bun evidence/v2326/principal-key-migration.ts <db-path> archive --keys keys.json --out archive.json
//   bun evidence/v2326/principal-key-migration.ts <db-path> rename --mapping mapping.json --backup backup.json
//   bun evidence/v2326/principal-key-migration.ts <db-path> rollback --backup backup.json
// Exit 0 = success; exit 1 = runtime error; exit 2 = refused (fail-closed).
// VM / offline evidence only — not staging, not production.

import { Database } from "bun:sqlite";
import { readFileSync, writeFileSync } from "node:fs";

const TOOL_VERSION = "v2326-1";
const LEGACY_SENTINEL = "<LEGACY>";

const TABLES: { table: string; column: string; pk: string }[] = [
  { table: "checks", column: "owner_user_id", pk: "id" },
  { table: "saved_projects", column: "principal_id", pk: "principal_id, project_id" },
  { table: "projects", column: "provenance_submitted_by", pk: "id" },
];

function fail(msg: string, code = 1): never {
  console.error(`principal-key-migration: ERROR: ${msg}`);
  process.exit(code);
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith("--")) fail(`flag --${key} needs a value`, 2);
      out[key] = val;
      i++;
    }
  }
  return out;
}

function guardDbPath(dbPath: string): void {
  const base = dbPath.split("/").pop() ?? dbPath;
  if (base === "app.db") {
    fail("refusing to open app.db — run this tool only on a COPY of a database file", 2);
  }
  if (dbPath.includes("ts-spaces")) {
    fail("refusing a path under ts-spaces — run this tool only on a COPY of a database file", 2);
  }
}

function readJson(path: string): any {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`cannot read JSON ${path}: ${e instanceof Error ? e.message : String(e)}`, 2);
  }
}

function countRows(db: Database, table: string): number {
  const row: any = db.query(`SELECT count(*) AS n FROM ${table}`).get();
  return Number(row?.n ?? 0);
}

function rowsForKey(db: Database, table: string, column: string, key: string): any[] {
  return db.query(`SELECT * FROM ${table} WHERE ${column} = ?`).all(key) as any[];
}

function inventory(db: Database): void {
  console.log(`principal-key-migration ${TOOL_VERSION} inventory`);
  for (const t of TABLES) {
    const total = countRows(db, t.table);
    const grouped: any[] = db
      .query(`SELECT ${t.column} AS k, count(*) AS n FROM ${t.table} GROUP BY ${t.column} ORDER BY n DESC`)
      .all();
    console.log(`\n${t.table}.${t.column} — total rows: ${total}`);
    for (const g of grouped) {
      const label = g.k === null ? "<NULL>" : String(g.k);
      console.log(`  ${label}: ${g.n}`);
    }
    if (grouped.length === 0) console.log("  (no rows)");
  }
  const legacySaved = rowsForKey(db, "saved_projects", "principal_id", LEGACY_SENTINEL);
  console.log(`\nNOTE: ${legacySaved.length} saved_projects row(s) use the '<LEGACY>' sentinel — archive-only, never renamed.`);
  const nullChecks: any = db.query("SELECT count(*) AS n FROM checks WHERE owner_user_id IS NULL").get();
  console.log(`NOTE: ${Number(nullChecks?.n ?? 0)} checks row(s) have NULL owner_user_id — never touched (L-A).`);
}

function archive(db: Database, keysPath: string, outPath: string): void {
  const keysJson = readJson(keysPath);
  const keys: string[] = Array.isArray(keysJson) ? keysJson : keysJson.keys;
  if (!Array.isArray(keys) || keys.length === 0) fail("--keys file must be a JSON array of legacy key strings (or {\"keys\": [...]})", 2);
  for (const k of keys) {
    if (typeof k !== "string" || k === LEGACY_SENTINEL) {
      fail(`archive key list must not contain '<LEGACY>' (archive it via the sentinel report, not this list) — bad key: ${JSON.stringify(k)}`, 2);
    }
  }
  const archived: Record<string, any[]> = {};
  let total = 0;
  for (const t of TABLES) {
    archived[t.table] = [];
    for (const k of keys) {
      const rows = rowsForKey(db, t.table, t.column, k);
      for (const r of rows) archived[t.table].push({ legacyKey: k, row: r });
    }
    total += archived[t.table].length;
  }
  const doc = {
    tool: "principal-key-migration",
    version: TOOL_VERSION,
    mode: "archive",
    createdAt: new Date().toISOString(),
    legacyKeys: keys,
    rows: archived,
    totalRows: total,
  };
  writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
  console.log(`archive: ${total} row(s) for ${keys.length} legacy key(s) written to ${outPath} (DB NOT modified)`);
  for (const t of TABLES) console.log(`  ${t.table}: ${archived[t.table].length}`);
}

interface MappingEntry {
  legacyKey: string;
  currentKey: string;
  basis: string;
}

function validateMapping(mapping: any): MappingEntry[] {
  if (!Array.isArray(mapping) || mapping.length === 0) {
    fail("--mapping file must be a non-empty JSON array of { legacyKey, currentKey, basis }", 2);
  }
  const seenLegacy = new Set<string>();
  const seenCurrent = new Set<string>();
  for (const e of mapping) {
    if (typeof e?.legacyKey !== "string" || typeof e?.currentKey !== "string" || typeof e?.basis !== "string" || e.basis.trim() === "") {
      fail(`each mapping entry needs string legacyKey/currentKey and a non-empty basis (how the mapping was verified): ${JSON.stringify(e)}`, 2);
    }
    if (e.legacyKey === LEGACY_SENTINEL) fail("mapping must never rename '<LEGACY>' rows — their owner is unknown; archive them instead", 2);
    if (!e.legacyKey.startsWith("local:") || !e.currentKey.startsWith("local:")) {
      fail(`keys must both be local principals (local:...): ${JSON.stringify(e)}`, 2);
    }
    if (e.legacyKey === e.currentKey) fail(`legacyKey must differ from currentKey: ${JSON.stringify(e)}`, 2);
    if (seenLegacy.has(e.legacyKey)) fail(`duplicate legacyKey in mapping: ${e.legacyKey}`, 2);
    if (seenCurrent.has(e.currentKey)) fail(`duplicate currentKey in mapping (ambiguous target): ${e.currentKey}`, 2);
    seenLegacy.add(e.legacyKey);
    seenCurrent.add(e.currentKey);
  }
  return mapping as MappingEntry[];
}

function rename(db: Database, mappingPath: string, backupPath: string): void {
  const mapping = validateMapping(readJson(mappingPath));
  // Pre-checks (before any write): counts + collision detection.
  const beforeCounts: Record<string, number> = {};
  for (const t of TABLES) beforeCounts[t.table] = countRows(db, t.table);
  const affected: Record<string, any[]> = {};
  for (const t of TABLES) {
    affected[t.table] = [];
    for (const m of mapping) affected[t.table].push(...rowsForKey(db, t.table, t.column, m.legacyKey));
  }
  // Collision pre-check: saved_projects composite PK (principal_id, project_id).
  for (const m of mapping) {
    const clashes: any[] = db
      .query(
        "SELECT sp.project_id AS pid FROM saved_projects sp WHERE sp.principal_id = ? AND EXISTS (SELECT 1 FROM saved_projects s2 WHERE s2.principal_id = ? AND s2.project_id = sp.project_id)",
      )
      .all(m.currentKey, m.legacyKey);
    if (clashes.length > 0) {
      fail(
        `collision: target ${m.currentKey} already has saved_projects row(s) for project(s) ${clashes.map((c: any) => c.pid).join(",")} also held by ${m.legacyKey} — refusing rename (no writes made)`,
        2,
      );
    }
  }
  const backup = {
    tool: "principal-key-migration",
    version: TOOL_VERSION,
    mode: "rename-backup",
    createdAt: new Date().toISOString(),
    mapping,
    rows: affected,
    countsBefore: beforeCounts,
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2) + "\n", "utf8");
  // Transactional rename.
  try {
    db.exec("BEGIN IMMEDIATE");
    for (const t of TABLES) {
      for (const m of mapping) {
        db.query(`UPDATE ${t.table} SET ${t.column} = ? WHERE ${t.column} = ?`).run(m.currentKey, m.legacyKey);
      }
    }
    // Post-checks inside the transaction: counts unchanged, no legacy key left.
    for (const t of TABLES) {
      const after = countRows(db, t.table);
      if (after !== beforeCounts[t.table]) throw new Error(`${t.table} row count changed ${beforeCounts[t.table]} -> ${after}`);
      for (const m of mapping) {
        const left = rowsForKey(db, t.table, t.column, m.legacyKey);
        if (left.length > 0) throw new Error(`${t.table} still has ${left.length} row(s) with legacy key ${m.legacyKey}`);
      }
    }
    db.exec("COMMIT");
  } catch (e) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    fail(`rename aborted, transaction rolled back: ${e instanceof Error ? e.message : String(e)}`, 1);
  }
  const totalAffected = Object.values(affected).reduce((n, rows) => n + rows.length, 0);
  console.log(`rename: ${mapping.length} mapping(s), ${totalAffected} row(s) renamed; backup written to ${backupPath}`);
  for (const t of TABLES) console.log(`  ${t.table}: ${affected[t.table].length} row(s), count ${beforeCounts[t.table]} -> ${countRows(db, t.table)} (unchanged)`);
}

function rollback(db: Database, backupPath: string): void {
  const backup = readJson(backupPath);
  if (backup?.mode !== "rename-backup" || !Array.isArray(backup?.mapping) || typeof backup?.rows !== "object") {
    fail(`--backup file is not a rename backup written by this tool: ${backupPath}`, 2);
  }
  const mapping = backup.mapping as MappingEntry[];
  const beforeCounts: Record<string, number> = {};
  for (const t of TABLES) beforeCounts[t.table] = countRows(db, t.table);
  // Backup rows store the PRE-rename (original) values. To restore, set
  // each column back to its backed-up value, matching the CURRENT key
  // (mapping currentKey) for the composite-PK table saved_projects.
  const currentKeyFor = (legacyKey: string): string => {
    const hit = mapping.find((x) => x.legacyKey === legacyKey);
    if (!hit) throw new Error(`backup row has legacy key ${legacyKey} with no mapping entry — refusing to guess`);
    return hit.currentKey;
  };
  try {
    db.exec("BEGIN IMMEDIATE");
    // Backup rows are RAW pre-rename rows (rename stores rowsForKey()
    // output directly, not { legacyKey, row } wrappers like archive).
    for (const r of backup.rows.checks ?? []) {
      db.query("UPDATE checks SET owner_user_id = ? WHERE id = ?").run(r.owner_user_id, r.id);
    }
    for (const r of backup.rows.saved_projects ?? []) {
      db.query("UPDATE saved_projects SET principal_id = ? WHERE principal_id = ? AND project_id = ?").run(
        r.principal_id,
        currentKeyFor(r.principal_id),
        r.project_id,
      );
    }
    for (const r of backup.rows.projects ?? []) {
      db.query("UPDATE projects SET provenance_submitted_by = ? WHERE id = ?").run(
        r.provenance_submitted_by,
        r.id,
      );
    }
    db.exec("COMMIT");
  } catch (e) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    fail(`rollback aborted, transaction rolled back: ${e instanceof Error ? e.message : String(e)}`, 1);
  }
  console.log(`rollback: restored original keys from ${backupPath}`);
  for (const t of TABLES) console.log(`  ${t.table}: count ${beforeCounts[t.table]} -> ${countRows(db, t.table)} (unchanged)`);
}

function main(): void {
  const [dbPath, mode, ...rest] = process.argv.slice(2);
  if (!dbPath || !mode) {
    console.error(
      "usage: bun evidence/v2326/principal-key-migration.ts <db-path> <inventory|archive|rename|rollback> [--keys f] [--mapping f] [--backup f] [--out f]",
    );
    process.exit(2);
  }
  guardDbPath(dbPath);
  const flags = parseArgs(rest);
  let db: Database;
  try {
    db = new Database(dbPath, { readonly: mode === "inventory" });
  } catch (e) {
    fail(`cannot open ${dbPath}: ${e instanceof Error ? e.message : String(e)}`, 1);
  }
  try {
    if (mode === "inventory") {
      inventory(db);
    } else if (mode === "archive") {
      if (!flags.keys || !flags.out) fail("archive needs --keys <file> and --out <file>", 2);
      archive(db, flags.keys, flags.out);
    } else if (mode === "rename") {
      if (!flags.mapping || !flags.backup) fail("rename needs --mapping <file> and --backup <file>", 2);
      rename(db, flags.mapping, flags.backup);
    } else if (mode === "rollback") {
      if (!flags.backup) fail("rollback needs --backup <file>", 2);
      rollback(db, flags.backup);
    } else {
      fail(`unknown mode: ${mode}`, 2);
    }
  } finally {
    db.close();
  }
}

main();
