// principal-key-migration.ts — F-060 / U-114 (v2.3.26), revised v2.3.27
// (F-061..F-064, audit V21), revised v2.3.28 (F-065..F-068, audit V22),
// revised v2.3.29 (F-069, F-070, U-118, audit V23):
// OFFLINE tool for principal-key compatibility after the v2.3.25 change
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
//                    (F-063) The backup itself is STRICTLY validated
//                    before any DB access (F-066): tool name, supported
//                    version, mode, non-empty valid mapping, all three
//                    table arrays present and typed, complete row
//                    shape/PK per row, countsBefore consistent with
//                    the live DB, totalRows consistent, and the
//                    SHA-256 integrity hash (v2328-1 and later backups)
//                    matching.
//                    A backup missing a section, with an empty mapping,
//                    an unsupported version, or a hash/count mismatch
//                    is refused with exit 2 and NO writes. Backups
//                    written by v2327-1 carry no integrity hash; they
//                    are accepted ONLY after every other strict check
//                    passes, with an explicit stderr warning that
//                    integrity is unverified (legacy, pre-hash).
//
// Tables/columns that store a principal key (inventory, F-060):
//   checks.owner_user_id, saved_projects.principal_id,
//   projects.provenance_submitted_by.
// '<LEGACY>' rows are NEVER renamed (their owner is unknown by
// definition — DL-23-03); NULL-owner checks are NEVER touched (L-A).
//
// Safety guards (fail-closed):
//   - F-069 (v2.3.29): NO backup validation error prints row values,
//     full JSON objects, URLs, principal IDs, or other record data.
//     Every validation failure reports only the table name, the row
//     index, the failed field, and the expected type. The same rule
//     applies to mapping-entry errors, archive key-list errors, the
//     rename collision check, and rollback pre/post-validation errors
//     (row index + table + field only; integer PKs are not printed
//     either). `inventory` still prints principal keys to STDOUT —
//     that is the tool's intended operator report, not an error path,
//     and is out of scope for F-069.
//   - F-070 (v2.3.29): writePrivateJsonAtomic() fsyncs the PARENT
//     DIRECTORY (open dir fd + fsync) after link(2) + temp unlink and
//     BEFORE returning, so the backup directory entry is durable
//     before any SQLite transaction starts. If the directory cannot
//     be opened or fsynced, the published output is removed and the
//     tool fails closed (exit 1) instead of claiming durability it
//     does not have. Platform note: directory fsync is verified on
//     Linux in this VM; on a platform where it is unsupported the
//     tool fails closed — it never silently claims crash durability.
//     A trace hook (env PRINCIPAL_MIGRATION_FS_TRACE=<file>) records
//     the filesystem steps in order for the H-MIGR-39 syscall-order
//     test; that is syscall-order evidence, NOT a real power-loss
//     test.
//   - U-118 (v2.3.29): investigated whether Bun SQLite can verify
//     the opened DB file's identity against the pre-open guard.
//     PROBE (2026-11-09, Bun 1.4.4, bun:sqlite 3.53.4): a Database
//     instance exposes only `filename` (the path string as given);
//     `PRAGMA database_list` returns the path string only; there is
//     no fd property (`$handle`/`fd`/`_fd` absent); `db.handle` is a
//     bare number (0 on a fresh DB) with no identity meaning; and
//     `fileControl()` returns no file identity. A post-open
//     statSync(path) would only re-read the PATH, not the opened
//     file, so it cannot prove the opened inode equals the guarded
//     inode. CONCLUSION: the guard→open TOCTOU cannot be closed
//     from inside the process with Bun's API. The enforceable
//     boundary is an operator-configured allowlisted working
//     directory: env PRINCIPAL_MIGRATION_ALLOWED_DIR
//     (colon-separated); when set, the resolved DB path must sit
//     under one of those directories or the tool refuses (exit 2).
//     U-120 (v2.3.30): the variable is now REQUIRED for EVERY mode,
//     including inventory — an unset variable refuses (exit 2)
//     BEFORE the database is opened (audit V24 §3 mitigation 1,
//     safer default: inventory reads sensitive principal data).
//     Every allowlisted directory is validated by
//     validateAllowedDir(): resolved to its real path, must be
//     owned by the operator running the process, must NOT be
//     group/world-writable (regardless of the sticky bit — there is
//     NO trusted-group escape hatch in this project; no
//     trusted-group policy has been documented or approved, so the
//     rejection is unconditional), and every ancestor must be
//     owned by the operator or uid 0 (root) and must not be
//     group/world-writable unless the sticky bit is set. Path
//     containment alone is NOT treated as proof of privacy. Run
//     the tool only on a copy in a private directory with no
//     concurrent writers. RESIDUAL: the guard→open TOCTOU still
//     cannot be closed from inside the process (see U-118 probe);
//     U-118 stays OPEN — the directory validation only narrows the
//     window to directories no untrusted local writer can modify.
//     H-MIGR-42..47 (evidence/v2330) test the new precondition,
//     including a disposable path-swap race test that documents the
//     remaining limitation instead of claiming it closed.
//   - refuses to open a file named app.db or under a ts-spaces path —
//     checked on the RESOLVED real path, not just the given string;
//   - refuses ANY symlink as the db path (lstatSync), and refuses a
//     realpath whose basename is app.db or that lies under a ts-spaces
//     (runtime) directory — a path check is not cryptographic proof
//     the DB is a copy; always copy-and-verify first (F-064);
//   - F-068: refuses a db path whose file has more than one hard link
//     (nlink > 1) — a hard-link alias can point at the runtime DB
//     while looking like an innocent copy; realpath does NOT prove a
//     file is a copy (it returns the alias name, not the inode's
//     canonical identity), so the tool never claims realpath proves
//     copy-ness. Also compares device/inode against any runtime DB
//     paths the operator lists in PRINCIPAL_MIGRATION_RUNTIME_DBS
//     (colon-separated). RESIDUAL TOCTOU: between guardDbPath() and
//     new Database() another process could replace the path with a
//     link; the verified workflow is: copy with `cp` into a private
//     directory, `stat` the copy (nlink must be 1), then run the tool
//     immediately. The tool cannot close this window from inside a
//     single process; it is documented, not hidden;
//   - F-065: every output file (archive --out, archive-special --out,
//     rename --backup) goes through guardOutputPath() +
//     writePrivateJsonAtomic(): the output must not be a symlink, must
//     not already exist (never overwrite — including a hard link to
//     the DB, detected by device/inode comparison before the generic
//     exists-refusal), must not resolve to the input DB, must not be
//     named app.db, and must not sit under a ts-spaces path. The file
//     is created exclusive (wx-equivalent via link(2)), mode 0600,
//     written to a temp file in the same directory, fsynced, linked
//     into place atomically, and read back byte-for-byte before the
//     caller proceeds; for rename() the backup is additionally parsed
//     and hash-verified BEFORE the DB transaction starts. If the
//     private mode cannot be applied/verified, the file is removed
//     and the tool fails closed;
//   - F-067: backup/archive files are created mode 0600, never
//     group/world-readable, never overwritten. RETENTION / OWNERSHIP:
//     every backup/archive file is operator-owned, lives in a
//     directory the operator controls, and must be retained until the
//     rename is verified or rolled back, then deleted securely
//     (shred/rm — never copied to shared storage unencrypted; if a
//     shared transfer is ever needed, encrypt the archive first and
//     delete the plaintext copy). The retention note is recorded in
//     each output JSON document (field `retention`);
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
import { createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  closeSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const TOOL_VERSION = "v2330-1";
// Backups this tool version accepts for rollback. v2327-1 backups carry
// no integrity hash (pre-hash format); they are accepted only after
// every other strict check passes, with an explicit warning (F-066).
const SUPPORTED_BACKUP_VERSIONS = ["v2327-1", "v2328-1", "v2329-1", "v2330-1"];
// Retention/ownership note recorded in every backup/archive document
// (F-067): operator-owned, private, delete securely when no longer
// needed; never copy to shared storage unencrypted.
const RETENTION_NOTE =
  "Operator-owned file, mode 0600. Retain until the rename is verified or rolled back, then delete securely (shred/rm). Never copy to shared storage unencrypted; encrypt first if a shared transfer is ever needed.";
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

// F-070 evidence hook: when PRINCIPAL_MIGRATION_FS_TRACE is set to a
// file path, every filesystem step of writePrivateJsonAtomic() appends
// one line (`op target`) to that file, so a test can prove the syscall
// order (write → fsync file → link → unlink temp → open dir → fsync
// dir → read-back) without changing behaviour when the variable is
// unset. This is syscall-order evidence, NOT a real power-loss test.
// Tracing must never break the tool, so failures are swallowed.
function traceFs(op: string, target: string): void {
  const tracePath = process.env.PRINCIPAL_MIGRATION_FS_TRACE;
  if (!tracePath) return;
  try {
    appendFileSync(tracePath, `${op} ${target}\n`, "utf8");
  } catch {
    /* ignore */
  }
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

// U-120 (v2.3.30): validate ONE allowlisted directory — its real
// path, ownership, mode, and the ownership/mode of every writable
// ancestor. Returns the directory's real path. Refuses (exit 2) on
// any failure: the directory must exist, be a directory, be owned by
// the operator running this process, and must NOT be group- or
// world-writable — regardless of the sticky bit, because a
// group/world-writable directory lets another local user create
// entries inside it, and the tool must not treat path containment
// alone as proof of privacy. There is NO trusted-group escape hatch
// in this project: no trusted-group policy has been documented or
// approved, so the rejection is unconditional (audit V24 §3
// mitigation 2 allows a narrowly documented and tested trusted-group
// policy; none exists here, and adding one needs an explicit owner
// decision + tests). Ancestors: each ancestor directory must be
// owned by the operator or by uid 0 (root), and must not be
// group/world-writable UNLESS the sticky bit is set — a sticky
// directory does not let a non-owner unlink or rename entries owned
// by others, so a sticky world-writable ancestor (e.g. /tmp, mode
// 1777) cannot be used to swap the allowlisted directory itself. A
// non-sticky writable ancestor CAN be used to replace the directory,
// so it is refused. If the platform cannot report the process uid,
// fail closed: the ownership check cannot run, so the directory
// cannot be trusted.
function validateAllowedDir(dirRaw: string): string {
  let real: string;
  try {
    real = realpathSync(dirRaw);
  } catch (e) {
    fail(`PRINCIPAL_MIGRATION_ALLOWED_DIR entry ${dirRaw} cannot be resolved: ${e instanceof Error ? e.message : String(e)} (U-120)`, 2);
  }
  let st;
  try {
    st = statSync(real);
  } catch (e) {
    fail(`PRINCIPAL_MIGRATION_ALLOWED_DIR entry ${dirRaw} cannot be statted (resolved: ${real}): ${e instanceof Error ? e.message : String(e)} (U-120)`, 2);
  }
  if (!st.isDirectory()) {
    fail(`PRINCIPAL_MIGRATION_ALLOWED_DIR entry ${dirRaw} (resolved: ${real}) is not a directory (U-120)`, 2);
  }
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
  if (uid === undefined) {
    fail(`cannot determine the process owner (process.getuid unavailable) — refusing to trust allowlisted directory ${real} without an ownership check (U-120)`, 2);
  }
  if (st.uid !== uid) {
    fail(`PRINCIPAL_MIGRATION_ALLOWED_DIR entry ${dirRaw} (resolved: ${real}) is owned by uid ${st.uid}, not by the operator (uid ${uid}) — run this tool only from a directory you own (U-120)`, 2);
  }
  if ((st.mode & 0o022) !== 0) {
    fail(`PRINCIPAL_MIGRATION_ALLOWED_DIR entry ${dirRaw} (resolved: ${real}) has mode 0${(st.mode & 0o777).toString(8)} — group/world-writable directories are refused (no trusted-group policy exists in this project); use a private directory (mode 0700) (U-120)`, 2);
  }
  // Walk the ancestors from the parent up to "/".
  let ancestor = dirname(real);
  while (true) {
    let ast;
    try {
      ast = statSync(ancestor);
    } catch (e) {
      fail(`cannot stat ancestor directory ${ancestor} of allowlisted directory ${real}: ${e instanceof Error ? e.message : String(e)} (U-120)`, 2);
    }
    if (ast.uid !== uid && ast.uid !== 0) {
      fail(`ancestor directory ${ancestor} of allowlisted directory ${real} is owned by uid ${ast.uid} (operator uid ${uid}) — a third-party owner can rename/replace the allowlisted directory; use a path whose ancestors are owned by you or by root (U-120)`, 2);
    }
    const writableByOthers = (ast.mode & 0o022) !== 0;
    const sticky = (ast.mode & 0o1000) !== 0;
    if (writableByOthers && !sticky) {
      fail(`ancestor directory ${ancestor} of allowlisted directory ${real} has mode 0${(ast.mode & 0o777).toString(8)} — group/world-writable without the sticky bit, so another local user could replace the allowlisted directory; use a path under a private or sticky ancestor (U-120)`, 2);
    }
    if (ancestor === "/") break;
    ancestor = dirname(ancestor);
  }
  return real;
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
  // F-068: hard-link alias guard. A hard link looks like an ordinary
  // regular file and realpathSync returns the alias name, so neither
  // check above can see it. Two device/inode checks close the gap as
  // far as a single process can:
  //   (a) a file with nlink > 1 shares its inode with another name —
  //       that other name may be the runtime database. A real byte
  //       copy made with `cp` always has nlink == 1, so refusing
  //       nlink > 1 is fail-closed without blocking the verified
  //       copy workflow;
  //   (b) compare device/inode against every runtime DB path the
  //       operator lists in PRINCIPAL_MIGRATION_RUNTIME_DBS
  //       (colon-separated). On this VM no runtime DB path is known
  //       or reachable, so the list is normally empty and (a) is the
  //       operative check — recorded here, not hidden.
  // RESIDUAL (documented, not fixable from inside the tool): a hard
  // link created between this guard and new Database() (TOCTOU), and
  // a runtime DB whose path the operator never listed. Mitigation is
  // the operator workflow: cp into a private dir, stat (nlink == 1),
  // run immediately.
  let st2;
  try {
    st2 = statSync(dbPath);
  } catch (e) {
    fail(`cannot stat database path ${dbPath}: ${e instanceof Error ? e.message : String(e)}`, 2);
  }
  if (st2.nlink > 1) {
    fail(
      `refusing database path ${dbPath} — file has ${st2.nlink} hard links, so another name may point at the same inode (e.g. the runtime database); use a real byte copy (cp) into a private directory and re-run (nlink must be 1)`,
      2,
    );
  }
  const knownRuntime = (process.env.PRINCIPAL_MIGRATION_RUNTIME_DBS ?? "").split(":").filter(Boolean);
  for (const known of knownRuntime) {
    let kst;
    try {
      kst = statSync(known);
    } catch {
      continue; // listed path does not exist on this host — nothing to compare
    }
    if (kst.dev === st2.dev && kst.ino === st2.ino) {
      fail(`refusing database path ${dbPath} — same device/inode as known runtime database ${known}`, 2);
    }
  }
  // U-120 (v2.3.30): the allowlisted working directory is now a
  // REQUIRED precondition for EVERY mode, including inventory —
  // inventory reads sensitive principal data (audit V24 §3
  // mitigation 1, safer default). An unset variable refuses (exit 2)
  // BEFORE the database is opened; there is no warning-and-continue
  // path any more. Every listed directory is validated (real path,
  // ownership, mode, writable ancestors) by validateAllowedDir(),
  // and the containment check uses the REAL path of each allowlisted
  // directory, so a symlinked allowlist entry resolves to its target
  // instead of silently failing containment.
  const allowedRaw = (process.env.PRINCIPAL_MIGRATION_ALLOWED_DIR ?? "").split(":").filter(Boolean);
  if (allowedRaw.length === 0) {
    fail(
      `PRINCIPAL_MIGRATION_ALLOWED_DIR is not set — refusing to run without an allowlisted private working directory (U-120); set it to the private directory holding the database copy, for every mode including inventory (the variable is required because even inventory reads sensitive principal data)`,
      2,
    );
  }
  const allowedDirs = allowedRaw.map((d) => validateAllowedDir(d));
  const inside = allowedDirs.some((ad) => real === ad || real.startsWith(ad + "/"));
  if (!inside) {
    fail(
      `refusing database path ${dbPath} — resolved path ${real} is outside PRINCIPAL_MIGRATION_ALLOWED_DIR (${allowedDirs.join(":")}); run this tool only on a copy inside an allowlisted private working directory (U-118)`,
      2,
    );
  }
}

function readJson(path: string): any {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`cannot read JSON ${path}: ${e instanceof Error ? e.message : String(e)}`, 2);
  }
}

// --- F-065 / F-067: private, exclusive, atomic output writes ---------

/** JSON with sorted keys, so integrity hashes are reproducible. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

/** SHA-256 over the canonical backup content (mapping + rows + counts + totalRows). */
function backupIntegrityHash(backup: { mapping: unknown; rows: unknown; countsBefore: unknown; totalRows: unknown }): string {
  return createHash("sha256")
    .update(stableStringify({ mapping: backup.mapping, rows: backup.rows, countsBefore: backup.countsBefore, totalRows: backup.totalRows }), "utf8")
    .digest("hex");
}

function guardOutputPath(outPath: string, dbPath: string): void {
  // F-065: resolve the output before writing anything. Refuse a
  // symlink, refuse any existing file (never overwrite — this also
  // covers a hard link to the DB, which IS an existing file; the
  // device/inode comparison below names that case explicitly),
  // refuse an output that resolves to the input DB, refuse the
  // runtime name app.db, and refuse runtime (ts-spaces) locations.
  let lst;
  try {
    lst = lstatSync(outPath);
  } catch (e: any) {
    if (e?.code !== "ENOENT") {
      fail(`cannot access output path ${outPath}: ${e instanceof Error ? e.message : String(e)}`, 2);
    }
  }
  if (lst) {
    if (lst.isSymbolicLink()) {
      fail(`refusing symlink output path ${outPath} — output must be a fresh regular file, never a symlink (it could point at the database)`, 2);
    }
    let dbSt;
    try {
      dbSt = statSync(dbPath);
    } catch {
      dbSt = null;
    }
    if (dbSt && lst.dev === dbSt.dev && lst.ino === dbSt.ino) {
      fail(`refusing output path ${outPath} — it is the SAME file (device/inode) as the database ${dbPath} (hard link / same file); writing would destroy the database`, 2);
    }
    fail(`refusing to overwrite existing file ${outPath} — output must be a fresh path; move or securely delete the old file first`, 2);
  }
  const parent = dirname(resolve(outPath));
  let parentReal: string;
  try {
    parentReal = realpathSync(parent);
  } catch {
    fail(`output directory does not exist: ${parent} — create it first, then re-run`, 2);
  }
  const candidate = join(parentReal, basename(outPath));
  if (basename(outPath) === "app.db") {
    fail(`refusing output path ${outPath} (basename app.db) — an output file must never be named like the runtime database`, 2);
  }
  if (candidate.includes("ts-spaces")) {
    fail(`refusing output under a ts-spaces path (resolved: ${candidate}) — outputs must go to an operator-controlled directory, never a runtime directory`, 2);
  }
  let dbReal: string;
  try {
    dbReal = realpathSync(dbPath);
  } catch {
    dbReal = resolve(dbPath);
  }
  if (candidate === dbReal) {
    fail(`refusing output path ${outPath} — it resolves to the input database ${dbReal}; writing would destroy the database`, 2);
  }
}

function writePrivateJsonAtomic(outPath: string, doc: unknown, dbPath: string): void {
  // F-065 + F-067: exclusive-create (wx-equivalent), private mode
  // 0600, atomic publish, verified read-back. Steps:
  //   1. guardOutputPath() refuses symlink/existing/DB/runtime paths.
  //   2. Write the bytes to a temp file in the SAME directory with
  //      openSync(..., "wx", 0o600) + fsync — the temp file itself
  //      can never overwrite anything and is private from birth.
  //   3. link(2) the temp file into place: linkSync FAILS with
  //      EEXIST if the destination appeared in the meantime, so the
  //      publish is atomic AND exclusive (rename(2) would silently
  //      overwrite — deliberately not used). Then unlink the temp
  //      name; the published file has nlink == 1.
  //   4. F-070: fsync the PARENT DIRECTORY after link+unlink, so the
  //      directory entry created by link(2) is durable before any DB
  //      transaction starts. If the directory cannot be opened or
  //      fsynced, remove the published output and FAIL CLOSED —
  //      never claim crash durability the platform did not provide.
  //   5. Verify: mode must be exactly 0600 (chmod + re-stat once if
  //      needed; if it still is not private, remove the file and
  //      FAIL CLOSED), nlink must be 1, and the bytes read back must
  //      equal what was written.
  guardOutputPath(outPath, dbPath);
  const text = JSON.stringify(doc, null, 2) + "\n";
  const dir = dirname(resolve(outPath));
  const tmp = join(dir, `.${basename(outPath)}.tmp-${process.pid}-${Math.floor(Math.random() * 1e9)}`);
  let fd: number;
  try {
    fd = openSync(tmp, "wx", 0o600);
    traceFs("open-tmp", tmp);
  } catch (e) {
    fail(`cannot create output file ${outPath} (temp ${tmp}): ${e instanceof Error ? e.message : String(e)}`, 1);
  }
  try {
    writeSync(fd, text, "utf8");
    traceFs("write", tmp);
    fsyncSync(fd);
    traceFs("fsync-file", tmp);
  } catch (e) {
    try {
      closeSync(fd);
    } catch {
      /* ignore */
    }
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    fail(`cannot write output file ${outPath}: ${e instanceof Error ? e.message : String(e)}`, 1);
  }
  try {
    closeSync(fd);
    traceFs("close-file", tmp);
  } catch {
    /* ignore */
  }
  try {
    linkSync(tmp, outPath);
    traceFs("link", outPath);
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    fail(`cannot publish output file ${outPath} (destination appeared or link failed): ${e instanceof Error ? e.message : String(e)}`, 1);
  }
  try {
    unlinkSync(tmp);
    traceFs("unlink-tmp", tmp);
  } catch {
    /* ignore */
  }
  // F-070: fsync the parent directory so the link(2) directory entry
  // is durable before the caller starts any SQLite transaction.
  let dirFd: number;
  try {
    dirFd = openSync(dir, "r");
    traceFs("open-dir", dir);
  } catch (e) {
    try {
      unlinkSync(outPath);
    } catch {
      /* ignore */
    }
    fail(
      `cannot open parent directory ${dir} to fsync it after publishing ${outPath} (F-070 durability) — output removed, failing closed: ${e instanceof Error ? e.message : String(e)}`,
      1,
    );
  }
  try {
    fsyncSync(dirFd);
    traceFs("fsync-dir", dir);
  } catch (e) {
    try {
      closeSync(dirFd);
    } catch {
      /* ignore */
    }
    try {
      unlinkSync(outPath);
    } catch {
      /* ignore */
    }
    fail(
      `cannot fsync parent directory ${dir} after publishing ${outPath} (F-070 durability) — output removed, failing closed: ${e instanceof Error ? e.message : String(e)}`,
      1,
    );
  }
  try {
    closeSync(dirFd);
    traceFs("close-dir", dir);
  } catch {
    /* ignore */
  }
  // Fail-closed private-mode verification (F-067).
  let st = statSync(outPath);
  traceFs("stat", outPath);
  if ((st.mode & 0o777) !== 0o600) {
    try {
      chmodSync(outPath, 0o600);
      st = statSync(outPath);
    } catch {
      /* fall through to the check below */
    }
  }
  if ((st.mode & 0o777) !== 0o600 || (st.mode & 0o077) !== 0) {
    try {
      unlinkSync(outPath);
    } catch {
      /* ignore */
    }
    fail(`refusing to leave output ${outPath} without private mode 0600 (observed mode ${(st.mode & 0o777).toString(8)}) — file removed, failing closed`, 1);
  }
  if (st.nlink !== 1) {
    try {
      unlinkSync(outPath);
    } catch {
      /* ignore */
    }
    fail(`refusing to leave output ${outPath} with link count ${st.nlink} — file removed, failing closed`, 1);
  }
  let back: string;
  try {
    back = readFileSync(outPath, "utf8");
    traceFs("read-back", outPath);
  } catch (e) {
    fail(`cannot read back output file ${outPath} for verification: ${e instanceof Error ? e.message : String(e)}`, 1);
  }
  if (back !== text) {
    try {
      unlinkSync(outPath);
    } catch {
      /* ignore */
    }
    fail(`output file ${outPath} failed read-back verification (bytes differ) — file removed, failing closed`, 1);
  }
}

// --- F-066: strict backup schema + integrity validation --------------

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

/** Row shape for one table: the PK + the principal column the tool uses.
 * F-069: a failed row reports ONLY table name, row index, failed field,
 * and expected type — never a value, never the row JSON, never a URL
 * or principal ID. */
function validateBackupRow(table: string, row: any, index: number): void {
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    fail(`backup row #${index} in ${table} is not an object (expected an object row)`, 2);
  }
  if (table === "checks") {
    if (!isInt(row.id)) fail(`backup row #${index} in checks: field "id" must be an integer`, 2);
    if (typeof row.owner_user_id !== "string") fail(`backup row #${index} in checks: field "owner_user_id" must be a string`, 2);
  } else if (table === "saved_projects") {
    if (typeof row.principal_id !== "string") fail(`backup row #${index} in saved_projects: field "principal_id" must be a string`, 2);
    if (!isInt(row.project_id)) fail(`backup row #${index} in saved_projects: field "project_id" must be an integer`, 2);
  } else if (table === "projects") {
    if (!isInt(row.id)) fail(`backup row #${index} in projects: field "id" must be an integer`, 2);
    if (typeof row.provenance_submitted_by !== "string")
      fail(`backup row #${index} in projects: field "provenance_submitted_by" must be a string`, 2);
  }
}

/**
 * Structural backup validation — NO database access. Called from
 * main() BEFORE the DB is opened, so an incomplete/malformed backup
 * is refused with exit 2 and the database is never touched.
 * Returns the parsed backup for the caller. Never uses `?? []`
 * defaults for required sections: a missing section is a refusal,
 * not an empty array (F-066).
 */
function validateBackupStructure(backup: any, backupPath: string): any {
  if (typeof backup !== "object" || backup === null || Array.isArray(backup)) {
    fail(`--backup file is not a JSON object written by this tool: ${backupPath}`, 2);
  }
  if (backup.tool !== "principal-key-migration") {
    fail(`--backup file was not written by principal-key-migration (field "tool" must be "principal-key-migration"): ${backupPath}`, 2);
  }
  if (typeof backup.version !== "string" || !SUPPORTED_BACKUP_VERSIONS.includes(backup.version)) {
    fail(`--backup version is not supported (supported: ${SUPPORTED_BACKUP_VERSIONS.join(", ")}): ${backupPath}`, 2);
  }
  if (backup.mode !== "rename-backup") {
    fail(`--backup mode must be "rename-backup": ${backupPath}`, 2);
  }
  // Mapping: non-empty and valid — same rules as rename() (duplicates,
  // malformed entries, chained/cyclic mappings all refused).
  const mapping = validateMapping(backup.mapping);
  if (typeof backup.rows !== "object" || backup.rows === null || Array.isArray(backup.rows)) {
    fail(`--backup rows must be an object with checks/saved_projects/projects arrays: ${backupPath}`, 2);
  }
  let totalRows = 0;
  for (const t of TABLES) {
    if (!Object.prototype.hasOwnProperty.call(backup.rows, t.table)) {
      fail(`--backup is incomplete: rows.${t.table} section is missing (a missing section is never treated as empty): ${backupPath}`, 2);
    }
    const arr = backup.rows[t.table];
    if (!Array.isArray(arr)) {
      fail(`--backup is incomplete: rows.${t.table} must be an array (got ${typeof arr}): ${backupPath}`, 2);
    }
    for (let i = 0; i < arr.length; i++) validateBackupRow(t.table, arr[i], i);
    totalRows += arr.length;
  }
  if (totalRows === 0) {
    fail(`--backup holds zero rows across all tables — a rename that renamed nothing produces no restorable backup; refusing a vacuous rollback: ${backupPath}`, 2);
  }
  if (typeof backup.countsBefore !== "object" || backup.countsBefore === null || Array.isArray(backup.countsBefore)) {
    fail(`--backup countsBefore must be an object with per-table counts: ${backupPath}`, 2);
  }
  for (const t of TABLES) {
    const n = backup.countsBefore[t.table];
    if (!isInt(n) || n < 0) {
      fail(`--backup countsBefore.${t.table} must be a non-negative integer: ${backupPath}`, 2);
    }
  }
  if (backup.version !== "v2327-1") {
    // Hashed backup formats (v2328-1 and later): integrity is mandatory.
    if (!isInt(backup.totalRows)) {
      fail(`--backup totalRows must be an integer in a hashed backup: ${backupPath}`, 2);
    }
    if (backup.totalRows !== totalRows) {
      fail(`--backup totalRows does not match the sum of row sections: ${backupPath}`, 2);
    }
    if (
      typeof backup.integrity !== "object" ||
      backup.integrity === null ||
      backup.integrity.algorithm !== "sha-256" ||
      typeof backup.integrity.hash !== "string" ||
      !/^[0-9a-f]{64}$/.test(backup.integrity.hash)
    ) {
      fail(`--backup integrity { algorithm: "sha-256", hash } is missing or malformed in a hashed backup: ${backupPath}`, 2);
    }
    const recomputed = backupIntegrityHash(backup);
    if (recomputed !== backup.integrity.hash) {
      fail(`--backup integrity hash mismatch — backup was edited or corrupted: ${backupPath}`, 2);
    }
  } else {
    // v2327-1 legacy backup: no integrity field existed. Accept only
    // after every structural check above passed, and say so loudly.
    console.error(
      `principal-key-migration: WARNING: backup ${backupPath} was written by ${backup.version} and carries no integrity hash — integrity is UNVERIFIED; proceeding on structural checks only`,
    );
  }
  return { ...backup, mapping };
}

/** Re-read a backup the tool just wrote and verify it parses with a matching hash, BEFORE any DB transaction. */
function verifyBackupFile(backupPath: string, written: { mapping: unknown; rows: unknown; countsBefore: unknown; totalRows: unknown }): void {
  const back = readJson(backupPath);
  if (back?.tool !== "principal-key-migration" || back?.mode !== "rename-backup" || back?.version !== TOOL_VERSION) {
    fail(`backup verification failed: ${backupPath} did not read back as a ${TOOL_VERSION} rename-backup — refusing to start the transaction`, 1);
  }
  const recomputed = backupIntegrityHash(back);
  if (back?.integrity?.hash !== recomputed) {
    fail(`backup verification failed: integrity hash mismatch on ${backupPath} before transaction — refusing to start the transaction`, 1);
  }
  if (JSON.stringify(back.mapping) !== JSON.stringify(written.mapping) || JSON.stringify(back.rows) !== JSON.stringify(written.rows)) {
    fail(`backup verification failed: ${backupPath} content differs from what was written — refusing to start the transaction`, 1);
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

function archive(db: Database, dbPath: string, keysPath: string, outPath: string): void {
  const keysJson = readJson(keysPath);
  const keys: string[] = Array.isArray(keysJson) ? keysJson : keysJson.keys;
  if (!Array.isArray(keys) || keys.length === 0) fail("--keys file must be a JSON array of legacy key strings (or {\"keys\": [...]})", 2);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (typeof k !== "string" || k === LEGACY_SENTINEL) {
      fail(`archive key list entry #${i} must be a string and must not be '<LEGACY>' (archive it via archive-special, not this list)`, 2);
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
    retention: RETENTION_NOTE,
    legacyKeys: keys,
    rows: archived,
    totalRows: total,
  };
  // F-065/F-067: private (0600), exclusive, atomic, verified write —
  // never overwrites, never follows a symlink, never targets the DB.
  writePrivateJsonAtomic(outPath, doc, dbPath);
  console.log(`archive: ${total} row(s) for ${keys.length} legacy key(s) written to ${outPath} (mode 0600, DB NOT modified)`);
  for (const t of TABLES) console.log(`  ${t.table}: ${archived[t.table].length}`);
}

function archiveSpecial(db: Database, dbPath: string, outPath: string): void {
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
    retention: RETENTION_NOTE,
    note: "Sentinel '<LEGACY>' rows and NULL-owner checks are archive-only: their owner is unknown and must never be guessed or renamed.",
    sentinelRows,
    nullOwnerChecks,
    counts: {
      sentinelSavedProjects: sentinelRows.length,
      nullOwnerChecks: nullOwnerChecks.length,
    },
    totalRows: sentinelRows.length + nullOwnerChecks.length,
  };
  // F-065/F-067: private (0600), exclusive, atomic, verified write.
  writePrivateJsonAtomic(outPath, doc, dbPath);
  console.log(`archive-special: ${doc.totalRows} row(s) written to ${outPath} (mode 0600, DB NOT modified)`);
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
  for (let i = 0; i < mapping.length; i++) {
    const e = mapping[i];
    if (typeof e?.legacyKey !== "string" || typeof e?.currentKey !== "string" || typeof e?.basis !== "string" || e.basis.trim() === "") {
      fail(`mapping entry #${i} needs string legacyKey/currentKey and a non-empty basis (how the mapping was verified)`, 2);
    }
    if (e.legacyKey === LEGACY_SENTINEL) fail("mapping must never rename '<LEGACY>' rows — their owner is unknown; archive them instead", 2);
    if (!e.legacyKey.startsWith("local:") || !e.currentKey.startsWith("local:")) {
      fail(`mapping entry #${i}: keys must both be local principals (local:...)`, 2);
    }
    if (e.legacyKey === e.currentKey) fail(`mapping entry #${i}: legacyKey must differ from currentKey`, 2);
    if (seenLegacy.has(e.legacyKey)) fail(`mapping entry #${i}: duplicate legacyKey`, 2);
    if (seenCurrent.has(e.currentKey)) fail(`mapping entry #${i}: duplicate currentKey (ambiguous target)`, 2);
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
      `mapping rejected: ${overlap.length} currentKey(s) also appear as legacyKey(s) — chained/cyclic mapping (A→B,B→C or A↔B) would cascade rows onto the wrong principal depending on order; split into separate non-overlapping mappings with fresh backups per step`,
      2,
    );
  }
  return mapping as MappingEntry[];
}

function rename(db: Database, dbPath: string, mappingPath: string, backupPath: string): void {
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
        `collision: a mapping target already has saved_projects row(s) for ${clashes.length} project(s) also held by the legacy key — refusing rename (no writes made)`,
        2,
      );
    }
  }
  const totalAffected = Object.values(affected).reduce((n, rows) => n + rows.length, 0);
  const backupCore = {
    tool: "principal-key-migration",
    version: TOOL_VERSION,
    mode: "rename-backup",
    createdAt: new Date().toISOString(),
    retention: RETENTION_NOTE,
    mapping,
    rows: affected,
    countsBefore: beforeCounts,
    totalRows: totalAffected,
  };
  const backup = {
    ...backupCore,
    // F-066: integrity hash over the canonical backup content, so
    // rollback can detect an edited/truncated backup.
    integrity: { algorithm: "sha-256", hash: backupIntegrityHash(backupCore) },
  };
  // F-065/F-067: private (0600), exclusive, atomic, verified write —
  // the backup must be complete on disk BEFORE any DB write.
  writePrivateJsonAtomic(backupPath, backup, dbPath);
  // F-065/F-066: re-read + hash-verify the backup file before opening
  // the transaction. A backup that cannot be verified is a refusal,
  // not a rename.
  verifyBackupFile(backupPath, backupCore);
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
        if (left.length > 0) throw new Error(`${t.table} still has ${left.length} row(s) with a legacy key`);
        const gotCurrent = rowsForKey(db, t.table, t.column, m.currentKey).length;
        if (gotCurrent !== expectedCurrent[t.table][i]) {
          throw new Error(`${t.table} key count mismatch for mapping entry #${i}: expected ${expectedCurrent[t.table][i]} row(s), got ${gotCurrent}`);
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
  console.log(`rename: ${mapping.length} mapping(s), ${totalAffected} row(s) renamed; backup written to ${backupPath} (mode 0600, integrity sha-256 ${backup.integrity.hash.slice(0, 12)}…)`);
  for (const t of TABLES) console.log(`  ${t.table}: ${affected[t.table].length} row(s), count ${beforeCounts[t.table]} -> ${countRows(db, t.table)} (unchanged)`);
}

function rollback(db: Database, backup: any, backupPath: string): void {
  // F-066: the backup was already structurally validated in main()
  // BEFORE the database was opened (tool, version, mode, mapping,
  // all three row sections present and typed, row shapes, counts,
  // integrity hash). What remains here is DB-dependent validation,
  // still BEFORE any write:
  //   (a) countsBefore must equal the CURRENT per-table counts —
  //       rename() never changes counts, so any difference means
  //       rows were added/deleted after the rename: refuse;
  //   (b) the F-063 pre-validation below (every backup row still
  //       present at its expected current key).
  const mapping = backup.mapping as MappingEntry[];
  const beforeCounts: Record<string, number> = {};
  for (const t of TABLES) beforeCounts[t.table] = countRows(db, t.table);
  for (const t of TABLES) {
    if (beforeCounts[t.table] !== backup.countsBefore[t.table]) {
      fail(
        `rollback refused, no writes made: ${t.table} count changed since the backup (countsBefore ${backup.countsBefore[t.table]}, now ${beforeCounts[t.table]}) — rows were added or deleted after the rename; refusing rollback ${backupPath}`,
        2,
      );
    }
  }
  const currentKeyFor = (legacyKey: string): string => {
    const hit = mapping.find((x) => x.legacyKey === legacyKey);
    if (!hit) throw new Error(`backup row has a legacy key with no mapping entry — refusing to guess`);
    return hit.currentKey;
  };
  // F-066: NO `?? []` defaults anywhere — every section was proven
  // present and an array by validateBackupStructure().
  // F-069: every error below names only the table, the row index, and
  // the field — never a principal key value or a row's content.
  const checksRows: any[] = backup.rows.checks;
  const savedRows: any[] = backup.rows.saved_projects;
  const projectsRows: any[] = backup.rows.projects;
  try {
    for (let i = 0; i < checksRows.length; i++) {
      const r = checksRows[i];
      const cur = currentKeyFor(r.owner_user_id);
      const hit: any = db.query("SELECT 1 AS ok FROM checks WHERE id = ? AND owner_user_id = ?").get(r.id, cur);
      if (!hit) throw new Error(`checks row #${i}: pre-validation failed — row not found at its expected post-rename key (field owner_user_id); refusing rollback`);
    }
    for (let i = 0; i < savedRows.length; i++) {
      const r = savedRows[i];
      const cur = currentKeyFor(r.principal_id);
      const hit: any = db.query("SELECT 1 AS ok FROM saved_projects WHERE principal_id = ? AND project_id = ?").get(cur, r.project_id);
      if (!hit) throw new Error(`saved_projects row #${i}: pre-validation failed — row not found at its expected post-rename key (field principal_id); refusing rollback`);
    }
    for (let i = 0; i < projectsRows.length; i++) {
      const r = projectsRows[i];
      const cur = currentKeyFor(r.provenance_submitted_by);
      const hit: any = db.query("SELECT 1 AS ok FROM projects WHERE id = ? AND provenance_submitted_by = ?").get(r.id, cur);
      if (!hit) throw new Error(`projects row #${i}: pre-validation failed — row not found at its expected post-rename key (field provenance_submitted_by); refusing rollback`);
    }
  } catch (e) {
    fail(`rollback refused, no writes made: ${e instanceof Error ? e.message : String(e)}`, 2);
  }
  try {
    db.exec("BEGIN IMMEDIATE");
    // F-063 (2): match on the CURRENT key as well as the row id, and
    // require exactly 1 affected row per UPDATE — never overwrite a
    // principal that changed after the rename, never silently skip.
    for (let i = 0; i < checksRows.length; i++) {
      const r = checksRows[i];
      const info: any = db
        .query("UPDATE checks SET owner_user_id = ? WHERE id = ? AND owner_user_id = ?")
        .run(r.owner_user_id, r.id, currentKeyFor(r.owner_user_id));
      if (info.changes !== 1) throw new Error(`checks row #${i}: expected exactly 1 row updated, got ${info.changes}`);
    }
    for (let i = 0; i < savedRows.length; i++) {
      const r = savedRows[i];
      const info: any = db
        .query("UPDATE saved_projects SET principal_id = ? WHERE principal_id = ? AND project_id = ?")
        .run(r.principal_id, currentKeyFor(r.principal_id), r.project_id);
      if (info.changes !== 1) throw new Error(`saved_projects row #${i}: expected exactly 1 row updated, got ${info.changes}`);
    }
    for (let i = 0; i < projectsRows.length; i++) {
      const r = projectsRows[i];
      const info: any = db
        .query("UPDATE projects SET provenance_submitted_by = ? WHERE id = ? AND provenance_submitted_by = ?")
        .run(r.provenance_submitted_by, r.id, currentKeyFor(r.provenance_submitted_by));
      if (info.changes !== 1) throw new Error(`projects row #${i}: expected exactly 1 row updated, got ${info.changes}`);
    }
    // F-063 (3): POSTCONDITION before COMMIT — every backup row is
    // back on its legacy key, and per-table counts are unchanged.
    for (let i = 0; i < checksRows.length; i++) {
      const r = checksRows[i];
      const hit: any = db.query("SELECT 1 AS ok FROM checks WHERE id = ? AND owner_user_id = ?").get(r.id, r.owner_user_id);
      if (!hit) throw new Error(`postcondition failed: checks row #${i} not restored (field owner_user_id)`);
    }
    for (let i = 0; i < savedRows.length; i++) {
      const r = savedRows[i];
      const hit: any = db.query("SELECT 1 AS ok FROM saved_projects WHERE principal_id = ? AND project_id = ?").get(r.principal_id, r.project_id);
      if (!hit) throw new Error(`postcondition failed: saved_projects row #${i} not restored (field principal_id)`);
    }
    for (let i = 0; i < projectsRows.length; i++) {
      const r = projectsRows[i];
      const hit: any = db.query("SELECT 1 AS ok FROM projects WHERE id = ? AND provenance_submitted_by = ?").get(r.id, r.provenance_submitted_by);
      if (!hit) throw new Error(`postcondition failed: projects row #${i} not restored (field provenance_submitted_by)`);
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
  // U-120 (v2.3.30): guardDbPath() above now FAILS CLOSED when
  // PRINCIPAL_MIGRATION_ALLOWED_DIR is unset, for every mode — the
  // v2.3.29 warn-and-continue path is gone (H-MIGR-41 now asserts
  // refusal). The U-118 guard→open TOCTOU residual is still OPEN:
  // the allowlist + private-directory validation only narrows the
  // window to directories no untrusted local writer can modify.
  const flags = parseArgs(rest);
  // F-066: validate the rollback backup (structure + integrity) BEFORE
  // opening the database, so an incomplete/malformed backup is refused
  // with exit 2 and the database is never touched at all.
  let prevalidatedBackup: any = null;
  if (mode === "rollback") {
    if (!flags.backup) fail("rollback needs --backup <file>", 2);
    prevalidatedBackup = validateBackupStructure(readJson(flags.backup), flags.backup);
  }
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
      archive(db, dbPath, flags.keys, flags.out);
    } else if (mode === "archive-special") {
      if (!flags.out) fail("archive-special needs --out <file>", 2);
      archiveSpecial(db, dbPath, flags.out);
    } else if (mode === "rename") {
      if (!flags.mapping || !flags.backup) fail("rename needs --mapping <file> and --backup <file>", 2);
      rename(db, dbPath, flags.mapping, flags.backup);
    } else if (mode === "rollback") {
      rollback(db, prevalidatedBackup, flags.backup);
    } else {
      fail(`unknown mode: ${mode}`, 2);
    }
  } finally {
    db.close();
  }
}

main();
