// principal-key-migration.ts — F-060 / U-114 (v2.3.26), revised v2.3.27
// (F-061..F-064, audit V21): OFFLINE tool for principal-key
// compatibility after the v2.3.25 change
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
//                    Opened READ-ONLY.
//   - `archive`    — copy rows for an EXPLICIT, operator-supplied list
//                    of legacy keys into a JSON archive file. The DB is
//                    NOT modified; '<LEGACY>' sentinel rows and
//                    NULL-owner checks are NOT in this mode (see
//                    `archive-special`).
//   - `archive-special` — export ONLY the two categories that must
//                    never be renamed or owner-guessed, into a SEPARATE
//                    JSON file with explicit sections: `sentinelRows`
//                    (saved_projects principal_id='<LEGACY>') and
//                    `nullOwnerChecks` (checks owner_user_id IS NULL),
//                    with row counts. The DB is NOT modified. Opened
//                    READ-ONLY. (F-062)
//   - `rename`     — apply an EXPLICIT mapping file
//                    [{ legacyKey, currentKey, basis }] in ONE SQLite
//                    transaction across all three tables, with a full
//                    backup JSON written BEFORE any write, pre/post row
//                    counts, per-key count verification, collision
//                    pre-checks, and automatic rollback on any failure.
//                    Refuses to run without a mapping file.
//   - `rollback`   — restore original keys from a backup JSON written
//                    by a previous `rename`, in one transaction, ONLY if
//                    every backup row is still present at its expected
//                    current key; verifies affected-row counts
//                    (exactly 1 per row) and postconditions before
//                    COMMIT; ROLLBACK + nonzero exit on any mismatch.
//                    (F-063)
//
// Tables/columns that store a principal key (inventory, F-060):
//   checks.owner_user_id, saved_projects.principal_id,
//   projects.provenance_submitted_by.
// '<LEGACY>' rows are NEVER renamed (their owner is unknown by
// definition — DL-23-03); NULL-owner checks are NEVER touched (L-A).
//
// Safety guards (fail-closed):
//   - refuses to open a file named app.db or under a ts-spaces path —
//     checked on the RESOLVED real path, not just the given string;
//   - refuses ANY symlink as the db path (lstatSync), and refuses a
//     realpath whose basename is app.db or that lies under a ts-spaces
//     (runtime) directory — a path check is not cryptographic proof
//     the DB is a copy; always copy-and-verify first (F-064);
//   - inventory and archive-special open the DB read-only; archive /
//     rename / rollback open it writable and must run ONLY on a copy;
//   - refuses a mapping entry whose legacyKey is '<LEGACY>' or NULL;
//   - refuses duplicate legacyKey / duplicate currentKey in one file;
//   - F-061: refuses the WHOLE mapping if the set of currentKeys
//     intersects the set of legacyKeys (chain A→B,B→C or cycle A↔B).
//     Rationale for REJECT over a two-phase transform via a temporary
//     namespace: reject is simpler, deterministic, and fail-closed —
//     there is no intermediate state that could be mistaken for a real
//     principal, no temp-key collision surface, and no order
//     dependence. An operator who genuinely needs a chained move must
//     decompose it into separate, individually verified,
//     non-overlapping mappings (no target equal to another source)
//     with a fresh backup per step; the tool never performs a chained
//     move in one invocation. Per-key counts are verified before
//     COMMIT (expected current count = pre-existing current rows +
//     renamed legacy rows, per table).
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
//   bun evidence/v2326/principal-key-migration.ts <db-path> archive-special --out archive-special.json
//   bun evidence/v2326/principal-key-migration.ts <db-path> rename --mapping mapping.json --backup backup.json
//   bun evidence/v2326/principal-key-migration.ts <db-path> rollback --backup backup.json
// Exit 0 = success; exit 1 = runtime error; exit 2 = refused (fail-closed).
// VM / offline evidence only — not staging, not production.

import { Database } from "bun:sqlite";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";

const TOOL_VERSION = "v2327-1";
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
  // F-064: never trust the given string. Reject any symlink as the db
  // path itself, resolve the real path (which also resolves symlinked
  // parent directories), and refuse when the resolved target is the
  // live database or lives under a runtime directory.
  let st;
  try {
    st = lstatSync(dbPath);
  } catch {
    fail(`cannot access database path ${dbPath} — file does not exist or is not readable (run this tool only on an existing COPY)`, 2);
  }
  if (st.isSymbolicLink()) {
    fail(`refusing symlink database path ${dbPath} — run this tool only on a real COPY of a database file, never via a symlink/alias`, 2);
  }
  let real: string;
  try {
    real = realpathSync(dbPath);
  } catch (e) {
    fail(`cannot resolve real path of ${dbPath}: ${e instanceof Error ? e.message : String(e)}`, 2);
  }
  const base = real.split("/").pop() ?? real;
  if (base === "app.db") {
    fail(`refusing to open ${real} (resolves to app.db) — run this tool only on a COPY of a database file`, 2);
  }
  if (real.includes("ts-spaces")) {
    fail(`refusing a path under ts-spaces (resolved: ${real}) — run this tool only on a COPY of a database file, never on the runtime database`, 2);
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
  console.log(`\nNOTE: ${legacySaved.length} saved_projects row(s) use the '<LEGACY>' sentinel — archive-only via archive-special, never renamed.`);
  const nullChecks: any = db.query("SELECT count(*) AS n FROM checks WHERE owner_user_id IS NULL").get();
  console.log(`NOTE: ${Number(nullChecks?.n ?? 0)} checks row(s) have NULL owner_user_id — archive-only via archive-special, never touched (L-A).`);
}

function archive(db: Database, keysPath: string, outPath: string): void {
  const keysJson = readJson(keysPath);
  const keys: string[] = Array.isArray(keysJson) ? keysJson : keysJson.keys;
  if (!Array.isArray(keys) || keys.length === 0) fail("--keys file must be a JSON array of legacy key strings (or {\"keys\": [...]})", 2);
  for (const k of keys) {
    if (typeof k !== "string" || k === LEGACY_SENTINEL) {
      fail(`archive key list must not contain '<LEGACY>' (archive it via archive-special, not this list) — bad key: ${JSON.stringify(k)}`, 2);
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

function archiveSpecial(db: Database, outPath: string): void {
  // F-062: the two categories that must never be renamed or
  // owner-guessed get their OWN export mode with explicit sections.
  // No --keys input exists here: sentinel rows are selected by the
  // literal '<LEGACY>' principal and NULL-owner checks by IS NULL —
  // neither value can be supplied through the `column = ?` path of
  // archive(). The DB is opened read-only (see main()) and is NOT
  // modified; no owner is ever inferred for these rows.
  const sentinelRows = rowsForKey(db, "saved_projects", "principal_id", LEGACY_SENTINEL);
  const nullOwnerChecks: any[] = db.query("SELECT * FROM checks WHERE owner_user_id IS NULL").all();
  const doc = {
    tool: "principal-key-migration",
    version: TOOL_VERSION,
    mode: "archive-special",
    createdAt: new Date().toISOString(),
    note: "Sentinel '<LEGACY>' rows and NULL-owner checks are archive-only: their owner is unknown and must never be guessed or renamed.",
    sentinelRows,
    nullOwnerChecks,
    counts: {
      sentinelSavedProjects: sentinelRows.length,
      nullOwnerChecks: nullOwnerChecks.length,
    },
    totalRows: sentinelRows.length + nullOwnerChecks.length,
  };
  writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
  console.log(`archive-special: ${doc.totalRows} row(s) written to ${outPath} (DB NOT modified)`);
  console.log(`  sentinelRows (saved_projects principal_id='<LEGACY>'): ${sentinelRows.length}`);
  console.log(`  nullOwnerChecks (checks owner_user_id IS NULL): ${nullOwnerChecks.length}`);
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
  // F-061: REJECT the whole mapping when any currentKey is also a
  // legacyKey elsewhere in the file (chain A→B,B→C or cycle A↔B).
  // Sequential UPDATEs would otherwise cascade: rows renamed A→B
  // would be picked up again by the B→C update and land on the wrong
  // principal, with the result depending on array order. Rejecting
  // the entire mapping (exit 2, no writes, no backup) is fail-closed;
  // see the header comment for why reject was chosen over a two-phase
  // temporary-namespace transform.
  const overlap = [...seenCurrent].filter((k) => seenLegacy.has(k));
  if (overlap.length > 0) {
    fail(
      `mapping rejected: currentKey(s) ${overlap.join(", ")} also appear as legacyKey(s) — chained/cyclic mapping (A→B,B→C or A↔B) would cascade rows onto the wrong principal depending on order; split into separate non-overlapping mappings with fresh backups per step`,
      2,
    );
  }
  return mapping as MappingEntry[];
}

function rename(db: Database, mappingPath: string, backupPath: string): void {
  const mapping = validateMapping(readJson(mappingPath));
  // Pre-checks (before any write): counts + per-key counts + collision detection.
  const beforeCounts: Record<string, number> = {};
  for (const t of TABLES) beforeCounts[t.table] = countRows(db, t.table);
  const affected: Record<string, any[]> = {};
  // expectedCurrent[t][mappingIndex] = rows already at currentKey + rows to be renamed in.
  const expectedCurrent: Record<string, number[]> = {};
  for (const t of TABLES) {
    affected[t.table] = [];
    expectedCurrent[t.table] = [];
    for (const m of mapping) {
      const legacyRows = rowsForKey(db, t.table, t.column, m.legacyKey);
      affected[t.table].push(...legacyRows);
      const alreadyCurrent = rowsForKey(db, t.table, t.column, m.currentKey).length;
      expectedCurrent[t.table].push(alreadyCurrent + legacyRows.length);
    }
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
    // Post-checks inside the transaction, BEFORE commit: counts
    // unchanged, no legacy key left, and per-key counts exact
    // (F-061: pre-existing current rows + renamed legacy rows).
    for (const t of TABLES) {
      const after = countRows(db, t.table);
      if (after !== beforeCounts[t.table]) throw new Error(`${t.table} row count changed ${beforeCounts[t.table]} -> ${after}`);
      for (let i = 0; i < mapping.length; i++) {
        const m = mapping[i];
        const left = rowsForKey(db, t.table, t.column, m.legacyKey);
        if (left.length > 0) throw new Error(`${t.table} still has ${left.length} row(s) with legacy key ${m.legacyKey}`);
        const gotCurrent = rowsForKey(db, t.table, t.column, m.currentKey).length;
        if (gotCurrent !== expectedCurrent[t.table][i]) {
          throw new Error(`${t.table} key ${m.currentKey}: expected ${expectedCurrent[t.table][i]} row(s), got ${gotCurrent}`);
        }
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
  const currentKeyFor = (legacyKey: string): string => {
    const hit = mapping.find((x) => x.legacyKey === legacyKey);
    if (!hit) throw new Error(`backup row has legacy key ${legacyKey} with no mapping entry — refusing to guess`);
    return hit.currentKey;
  };
  // F-063 (1): PRE-VALIDATION before any write — every backup row
  // must still exist at its expected CURRENT key. A row deleted after
  // the rename, or a principal changed after the rename, is a
  // mismatch: refuse (exit 2) instead of restoring partially or
  // overwriting the new legitimate owner.
  const checksRows: any[] = backup.rows.checks ?? [];
  const savedRows: any[] = backup.rows.saved_projects ?? [];
  const projectsRows: any[] = backup.rows.projects ?? [];
  try {
    for (const r of checksRows) {
      const cur = currentKeyFor(r.owner_user_id);
      const hit: any = db.query("SELECT 1 AS ok FROM checks WHERE id = ? AND owner_user_id = ?").get(r.id, cur);
      if (!hit) throw new Error(`checks id=${r.id}: expected owner ${cur} (post-rename state), row missing or owner changed — refusing rollback`);
    }
    for (const r of savedRows) {
      const cur = currentKeyFor(r.principal_id);
      const hit: any = db.query("SELECT 1 AS ok FROM saved_projects WHERE principal_id = ? AND project_id = ?").get(cur, r.project_id);
      if (!hit) throw new Error(`saved_projects (principal=${cur}, project_id=${r.project_id}): row missing or principal changed after rename — refusing rollback`);
    }
    for (const r of projectsRows) {
      const cur = currentKeyFor(r.provenance_submitted_by);
      const hit: any = db.query("SELECT 1 AS ok FROM projects WHERE id = ? AND provenance_submitted_by = ?").get(r.id, cur);
      if (!hit) throw new Error(`projects id=${r.id}: expected submitted_by ${cur} (post-rename state), row missing or owner changed — refusing rollback`);
    }
  } catch (e) {
    fail(`rollback refused, no writes made: ${e instanceof Error ? e.message : String(e)}`, 2);
  }
  try {
    db.exec("BEGIN IMMEDIATE");
    // F-063 (2): match on the CURRENT key as well as the row id, and
    // require exactly 1 affected row per UPDATE — never overwrite a
    // principal that changed after the rename, never silently skip.
    for (const r of checksRows) {
      const info: any = db
        .query("UPDATE checks SET owner_user_id = ? WHERE id = ? AND owner_user_id = ?")
        .run(r.owner_user_id, r.id, currentKeyFor(r.owner_user_id));
      if (info.changes !== 1) throw new Error(`checks id=${r.id}: expected exactly 1 row updated, got ${info.changes}`);
    }
    for (const r of savedRows) {
      const info: any = db
        .query("UPDATE saved_projects SET principal_id = ? WHERE principal_id = ? AND project_id = ?")
        .run(r.principal_id, currentKeyFor(r.principal_id), r.project_id);
      if (info.changes !== 1) throw new Error(`saved_projects project_id=${r.project_id}: expected exactly 1 row updated, got ${info.changes}`);
    }
    for (const r of projectsRows) {
      const info: any = db
        .query("UPDATE projects SET provenance_submitted_by = ? WHERE id = ? AND provenance_submitted_by = ?")
        .run(r.provenance_submitted_by, r.id, currentKeyFor(r.provenance_submitted_by));
      if (info.changes !== 1) throw new Error(`projects id=${r.id}: expected exactly 1 row updated, got ${info.changes}`);
    }
    // F-063 (3): POSTCONDITION before COMMIT — every backup row is
    // back on its legacy key, and per-table counts are unchanged.
    for (const r of checksRows) {
      const hit: any = db.query("SELECT 1 AS ok FROM checks WHERE id = ? AND owner_user_id = ?").get(r.id, r.owner_user_id);
      if (!hit) throw new Error(`postcondition failed: checks id=${r.id} not restored to ${r.owner_user_id}`);
    }
    for (const r of savedRows) {
      const hit: any = db.query("SELECT 1 AS ok FROM saved_projects WHERE principal_id = ? AND project_id = ?").get(r.principal_id, r.project_id);
      if (!hit) throw new Error(`postcondition failed: saved_projects project_id=${r.project_id} not restored to ${r.principal_id}`);
    }
    for (const r of projectsRows) {
      const hit: any = db.query("SELECT 1 AS ok FROM projects WHERE id = ? AND provenance_submitted_by = ?").get(r.id, r.provenance_submitted_by);
      if (!hit) throw new Error(`postcondition failed: projects id=${r.id} not restored to ${r.provenance_submitted_by}`);
    }
    for (const t of TABLES) {
      const after = countRows(db, t.table);
      if (after !== beforeCounts[t.table]) throw new Error(`${t.table} row count changed ${beforeCounts[t.table]} -> ${after} during rollback`);
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
      "usage: bun evidence/v2326/principal-key-migration.ts <db-path> <inventory|archive|archive-special|rename|rollback> [--keys f] [--mapping f] [--backup f] [--out f]",
    );
    process.exit(2);
  }
  guardDbPath(dbPath);
  const flags = parseArgs(rest);
  let db: Database;
  try {
    // F-064: read-only modes (inventory, archive-special) never open
    // the DB writable; write modes run ONLY on a copy (guard above).
    db = new Database(dbPath, { readonly: mode === "inventory" || mode === "archive-special" });
  } catch (e) {
    fail(`cannot open ${dbPath}: ${e instanceof Error ? e.message : String(e)}`, 1);
  }
  try {
    if (mode === "inventory") {
      inventory(db);
    } else if (mode === "archive") {
      if (!flags.keys || !flags.out) fail("archive needs --keys <file> and --out <file>", 2);
      archive(db, flags.keys, flags.out);
    } else if (mode === "archive-special") {
      if (!flags.out) fail("archive-special needs --out <file>", 2);
      archiveSpecial(db, flags.out);
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
