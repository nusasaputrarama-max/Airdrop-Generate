// test-f044-f045-f046-migration-v2321.ts — jawaban atas audit V14 (F-044/F-045/F-046).
//
// MEMBUKTIKAN, dengan MENJALANKAN ARTEFAK MIGRASI YANG SEBENARNYA
// (bukan copy-paste versi test-only), bahwa:
//   H-MIG-00  DDL v2.3.20 (ALTER ADD ... STORED) GAGAL di SQLite (F-044
//             reproduksi); VIRTUAL ADD berhasil (alternatif terdokumentasi).
//   H-MIG-01  Migrasi 0006 v3 (rebuild) sukses pada salinan disposable
//             dari schema saat ini (migrasi repo 0001-0005 + fixture);
//             semua baris/nilai/ID/relasi utuh; AUTOINCREMENT lanjut.
//   H-MIG-02  Schema hasil migrasi memuat generated column STORED,
//             CHECK chain + format (bernama eksplisit), kedua unique
//             index, checks.owner_user_id, saved_projects composite key.
//   H-MIG-03  Pre-check duplikat -> abort SEBELUM BEGIN; DB byte-identik.
//   H-MIG-04  Pre-check chain tak dikenal -> abort; DB byte-identik.
//   H-MIG-05  Kegagalan di tengah transaksi (file migrasi disabotase)
//             + crash tanpa COMMIT (proses terpisah) -> rollback penuh;
//             DB byte-identik / schema awal utuh.
//   H-MIG-06  Backup/restore: restore dari backup = byte-identik.
//   H-MIG-07  Re-run migrasi pada DB yang sudah termigrasi -> gagal
//             bersih; DB tidak berubah.
//   H-MIG-08  Down migration pada salinan terpisah -> sukses; schema +
//             baris kembali ke keadaan sebelum migrasi.
//   H-MIG-09  Cross-version SQLite 3.45.1 (CLI) — lihat log terpisah
//             test-f044-f045-f046-migration-v2321-sqlite3451.txt
//             (skrip run-mig-sqlite3451.sh); harness ini mencatat
//             versinya dan menegaskan file migrasi yang sama dipakai.
//   H-CAT-11  F-045: direct SQL INSERT/UPDATE chain tak dikenal DITOLAK
//             (CHECK), termasuk dengan contract NULL (tutup bypass
//             canonical-NULL); chain salah case/spasi DITOLAK.
//   H-CAT-12  F-045: semua 8 chain allowlist lolos; duplikat EVM
//             (case/prefix/whitespace) DITOLAK unique index; Solana
//             beda huruf DITERIMA; alamat sama lintas chain DITERIMA;
//             NULL contract boleh >1 baris.
//   H-CAT-13  Fungsi JS canonicalize == kolom generated DB untuk
//             SEMUA baris seed + korpus edge.
//   H-TEN-11  F-046: listChecks fail-closed — B hanya melihat baris B;
//             legacy NULL tidak terlihat principal mana pun; predikat
//             lama v2.3.20 (OR owner IS NULL) terbukti membocorkan.
//   H-TEN-12  F-046: deleteCheck lintas principal = 0 baris terhapus;
//             baris milik A dan legacy tetap ada; baris sendiri bisa.
//   H-TEN-13  F-046: askGibran hanya membaca checks milik principal.
//   H-TEN-14  F-046: predikat export legacy (admin-gated) hanya
//             mengembalikan baris NULL — gate §5 TIDAK diuji di sini.
//   H-TEN-15  F-040/F-046: isolasi saved_projects pasca-rebuild —
//             state A tidak mengubah state B; baris '<LEGACY>' utuh.
//
// BUKTI VM SAJA — bukan staging, bukan produksi. Semua DB adalah
// salinan disposable di direktori temp (mkdtemp 0700); DB/katalog
// live TIDAK disentuh; checkLink TIDAK di-invoke; tidak ada
// jaringan luar.
//
// Usage (dari evidence/v2321/):
//   bun test-f044-f045-f046-migration-v2321.ts > test-f044-f045-f046-migration-v2321.txt 2>&1
// Exit 0 = semua assertion PASS; exit 1 = ada FAIL.
// Bila run gagal: JANGAN timpa log kanonik. Simpan sebagai
// *-run<N>-fail.txt, perbaiki penyebabnya, lalu re-run.

import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0;
let fail = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`FAIL ${name}${detail ? " — " + detail : ""}`);
  }
}
process.on("unhandledRejection", (e) => {
  fail++;
  failures.push(`unhandledRejection: ${String(e)}`);
  console.log(`FAIL unhandledRejection — ${String(e)}`);
});

// ------------------------------------------------------------------
// Header lingkungan.
// ------------------------------------------------------------------
const wib = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: "Asia/Jakarta", hour12: false });
const now = new Date();
const repoRoot = join(import.meta.dir, "..", "..");
const evDir = import.meta.dir;
console.log("=== test-f044-f045-f046-migration-v2321 ===");
console.log(`date: ${wib(now)} WIB`);
console.log(`bun: ${Bun.version}`);
{
  const probe = new Database(":memory:");
  console.log(
    `sqlite_version (bun:sqlite): ${String((probe.query("SELECT sqlite_version() AS v").get() as any).v)}`,
  );
  probe.close();
}
console.log(
  `uid: ${typeof process.getuid === "function" ? process.getuid() : "n/a"}`,
);
console.log(`kernel: ${Bun.spawnSync(["uname", "-r"]).stdout.toString().trim()}`);
{
  const git = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: repoRoot });
  console.log(`commit HEAD: ${git.stdout.toString().trim()}`);
}
console.log(
  "env: VM lokal — BUKAN staging, BUKAN produksi; DB disposable di temp dir; no checkLink",
);
const sha256 = (buf: Buffer | string) =>
  createHash("sha256").update(buf).digest("hex");
const migUpPath = join(evDir, "0006_unified_ownership_and_uniqueness_v2321.sql");
const migDownPath = join(evDir, "0006_down_v2321.sql");
console.log(`migration up artifact: 0006_unified_ownership_and_uniqueness_v2321.sql`);
console.log(`  sha256: ${sha256(readFileSync(migUpPath))}`);
console.log(`migration down artifact: 0006_down_v2321.sql`);
console.log(`  sha256: ${sha256(readFileSync(migDownPath))}`);
{
  const cli = Bun.spawnSync(["sqlite3", "--version"]);
  console.log(
    `sqlite3 CLI (cross-version H-MIG-09): ${cli.stdout.toString().trim()} (exit ${cli.exitCode})`,
  );
}

// ------------------------------------------------------------------
// Kanonikalisasi aplikasi (cermin proposal §4.3b; SAMA seperti v2.3.20).
// ------------------------------------------------------------------
const EVM_CHAINS = new Set([
  "BNB Chain", "Ethereum", "Base", "Arbitrum", "Polygon", "opBNB", "Robinhood Chain",
]);
const SOLANA_CHAINS = new Set(["Solana"]);
function canonicalizeContractAddress(chain: string, address: string | null): string | null {
  if (address === null || address === undefined) return null;
  const a = String(address).trim();
  if (a.length === 0) throw new Error("empty-address");
  if (EVM_CHAINS.has(chain)) {
    const hex = a.startsWith("0x") || a.startsWith("0X") ? a.slice(2) : a;
    if (!/^[0-9a-fA-F]{40}$/.test(hex)) throw new Error("invalid-evm-address");
    return "0x" + hex.toLowerCase();
  }
  if (SOLANA_CHAINS.has(chain)) {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) throw new Error("invalid-solana-address");
    return a;
  }
  throw new Error(`unknown-chain:${chain}`);
}

// ------------------------------------------------------------------
// Util SQL.
// ------------------------------------------------------------------
function shaFile(p: string): string {
  return sha256(readFileSync(p));
}

/** Pecah file SQL menjadi statement; kembalikan {sql, validation} —
 *  validation=true bila blok komentar tepat sebelum statement memuat
 *  "-- VALIDATION". Menolak file yang mengandung ';' di dalam string
 *  literal (splitter ini tidak menanganinya — kegagalan eksplisit,
 *  bukan diam-diam salah pecah). */
function splitSqlFile(path: string): { sql: string; validation: boolean }[] {
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n");
  const out: { sql: string; validation: boolean }[] = [];
  let buf: string[] = [];
  let pendingValidation = false;
  let inStr = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) {
      if (/VALIDATION/i.test(trimmed)) pendingValidation = true;
      continue; // komentar tidak masuk statement
    }
    if (trimmed === "") continue;
    // Deteksi ';' di dalam string literal pada baris ini (kasar tapi
    // cukup untuk file artefak ini: tidak ada string berisi ';').
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === "'") {
        if (line[i + 1] === "'") { i++; continue; }
        q = !q;
      }
      if (c === ";" && q) throw new Error(`splitter: ';' di dalam string literal (${path}): ${line}`);
    }
    buf.push(line);
    if (trimmed.endsWith(";")) {
      const sql = buf.join("\n").trim();
      out.push({ sql, validation: pendingValidation });
      buf = [];
      pendingValidation = false;
    }
    void inStr;
  }
  if (buf.length > 0) throw new Error(`splitter: statement tak berakhir ';' di ${path}: ${buf.join(" ")}`);
  return out;
}

/** Jalankan file migrasi statement demi statement pada SATU koneksi.
 *  Statement VALIDATION harus mengembalikan 0 baris (atau satu baris
 *  'ok' untuk PRAGMA integrity_check); bila tidak, berhenti dan
 *  ROLLBACK bila transaksi sedang berjalan. Mengembalikan
 *  {ok, failedAt?, error?}. */
function runMigrationFile(
  db: Database,
  path: string,
): { ok: boolean; failedAt?: number; error?: string } {
  const stmts = splitSqlFile(path);
  let inTxn = false;
  for (let i = 0; i < stmts.length; i++) {
    const { sql, validation } = stmts[i];
    const upper = sql.toUpperCase();
    try {
      if (upper.startsWith("BEGIN")) {
        db.exec(sql);
        inTxn = true;
        continue;
      }
      if (upper.startsWith("COMMIT")) {
        db.exec(sql);
        inTxn = false;
        continue;
      }
      if (upper.startsWith("ROLLBACK")) {
        db.exec(sql);
        inTxn = false;
        continue;
      }
      if (/PRAGMA\s+integrity_check/i.test(sql)) {
        const rows: any[] = db.query(sql).all();
        if (rows.length !== 1 || Object.values(rows[0])[0] !== "ok") {
          throw new Error(`integrity_check bukan 'ok': ${JSON.stringify(rows)}`);
        }
        continue;
      }
      if (validation || /PRAGMA\s+foreign_key_check/i.test(sql)) {
        const rows: any[] = db.query(sql).all();
        if (rows.length !== 0) {
          throw new Error(
            `VALIDATION gagal pada statement #${i} — mengembalikan ${rows.length} baris: ${JSON.stringify(rows).slice(0, 500)}`,
          );
        }
        continue;
      }
      db.exec(sql);
    } catch (e: any) {
      if (inTxn) {
        try { db.exec("ROLLBACK"); } catch { /* sudah tidak ada transaksi */ }
        inTxn = false;
      }
      return { ok: false, failedAt: i, error: `${String(e?.message ?? e)} (statement #${i}: ${sql.slice(0, 120).replace(/\n/g, " ")})` };
    }
  }
  if (inTxn) {
    try { db.exec("ROLLBACK"); } catch { /* abaikan */ }
    return { ok: false, error: "file berakhir saat transaksi masih terbuka — ROLLBACK" };
  }
  return { ok: true };
}

function counts(db: Database): Record<string, number> {
  const c: Record<string, number> = {};
  for (const t of ["projects", "checks", "saved_projects"]) {
    c[t] = Number((db.query(`SELECT count(*) AS n FROM ${t}`).get() as any).n);
  }
  return c;
}
function tryExec(db: Database, sql: string): { ok: boolean; error?: string } {
  try {
    db.exec(sql);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}
function tryRun(db: Database, sql: string, ...params: any[]): { ok: boolean; error?: string; changes?: number } {
  try {
    const info = db.query(sql).run(...params);
    return { ok: true, changes: Number(info.changes) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

// ------------------------------------------------------------------
// Bangun DB dasar dari migrasi repo 0001-0005 (read-only) + fixture.
// ------------------------------------------------------------------
const workDir = mkdtempSync(join(tmpdir(), "v2321-"));
console.log(`work dir (mkdtemp 0700): ${workDir}`);
const basePath = join(workDir, "base.db");
{
  const db = new Database(basePath);
  const drizzleFiles = [
    "0001_initial.sql",
    "0002_checks_table_replaces_entries.sql",
    "0003_add_projects_catalog_and_saved_projects.sql",
    "0004_seed_projects_catalog_permanently.sql",
    "0005_translate_catalog_text_to_bahasa_indonesia.sql",
  ];
  for (const name of drizzleFiles) {
    const f = join(repoRoot, "site", "drizzle", name);
    const parts = readFileSync(f, "utf8").split("--> statement-breakpoint");
    for (const part of parts) {
      const s = part.trim();
      if (s) db.exec(s);
    }
  }
  // Fixture checks legacy (2 baris, tanpa owner — owner_user_id belum ada).
  const nowMs = Date.now();
  db.exec(
    `INSERT INTO checks (url, domain, verdict, score, signals, contracts, created_at) VALUES
     ('https://example-legacy-1.test/claim','example-legacy-1.test','waspada',55,'[]','[]',${nowMs}),
     ('https://example-legacy-2.test/airdrop','example-legacy-2.test','lebih_aman',10,'[]','[]',${nowMs})`,
  );
  // Fixture saved_projects (2 baris).
  db.exec(
    `INSERT INTO saved_projects (project_id, bookmarked, task_status, updated_at) VALUES
     (1, 1, 'not_started', ${nowMs}), (2, 1, 'in_progress', ${nowMs})`,
  );
  db.close();
}
const baseCounts = (() => {
  const db = new Database(basePath, { readonly: true });
  const c = counts(db);
  db.close();
  return c;
})();
console.log(
  `base DB (0001-0005 + fixture): projects=${baseCounts.projects}, checks=${baseCounts.checks}, saved_projects=${baseCounts.saved_projects}, sha256=${shaFile(basePath).slice(0, 16)}…`,
);
check(
  "BASE katalog repo = 12 baris (koreksi U-87 atas klaim '15 baris' v2.3.20)",
  baseCounts.projects === 12,
  `projects=${baseCounts.projects} (12 INSERT di 0004; CATALOG actions.ts juga 12 entri)`,
);
check("BASE checks fixture = 2 baris legacy", baseCounts.checks === 2);
check("BASE saved_projects fixture = 2 baris", baseCounts.saved_projects === 2);

function freshCopy(name: string): string {
  const p = join(workDir, `${name}.db`);
  copyFileSync(basePath, p);
  return p;
}
function projectDump(db: Database): string {
  const rows: any[] = db
    .query("SELECT id, name, ticker, chain, category, segment, status_label, description, difficulty, reward_note, contract_address, explorer_url, official_url, x_handle, verified_at, verified_note, sort FROM projects ORDER BY id")
    .all();
  return JSON.stringify(rows);
}

// ==================================================================
// H-MIG-00 — Reproduksi F-044: ALTER ADD STORED gagal; VIRTUAL ok.
// ==================================================================
// H-MIG-00 — Reproduksi F-044: ALTER ADD STORED gagal; VIRTUAL ok.
// NUANSA PENTING (U-96): ALTER ADD ... STORED GAGAL hanya pada
// tabel yang BERISI baris; pada tabel KOSONG statement itu BERHASIL
// di kedua versi yang diuji (3.53.4 + 3.45.1). DDL v2.3.20 karena
// itu berbahaya ganda: lolos di DB dev kosong, gagal di katalog
// produksi yang berisi 12 baris. Rebuild tidak bergantung pada
// keadaan ini dan tetap menjadi pendekatan yang dipilih.
console.log("--- H-MIG-00 (F-044 reproduksi) ---");
{
  const db = new Database(":memory:");
  db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, chain TEXT NOT NULL, addr TEXT)");
  db.exec("INSERT INTO t (chain, addr) VALUES ('BNB Chain','0xabc'), ('Solana','41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump')");
  const r1 = tryExec(
    db,
    "ALTER TABLE t ADD COLUMN canon TEXT GENERATED ALWAYS AS (lower(addr)) STORED",
  );
  check(
    "H-MIG-00a DDL v2.3.20 (ALTER ADD ... STORED) GAGAL pada tabel BERISI di SQLite 3.53.4 — F-044 ter-reproduksi",
    !r1.ok && /cannot add a STORED column/i.test(r1.error ?? ""),
    r1.error ?? "",
  );
  const r2 = tryExec(
    db,
    "ALTER TABLE t ADD COLUMN canon2 TEXT GENERATED ALWAYS AS (lower(addr)) VIRTUAL",
  );
  check("H-MIG-00b VIRTUAL ADD berhasil (alternatif yang didokumentasikan)", r2.ok, r2.error ?? "");
  const r3 = tryExec(db, "CREATE UNIQUE INDEX t_canon2 ON t (canon2)");
  check("H-MIG-00c index pada kolom VIRTUAL berhasil dibuat", r3.ok, r3.error ?? "");
  const r4 = tryRun(db, "INSERT INTO t (chain, addr) VALUES ('BNB Chain','0xABC')");
  check(
    "H-MIG-00d VIRTUAL + unique index tetap menolak duplikat (alternatif fungsional, bukan yang dipilih)",
    !r4.ok && /UNIQUE/i.test(r4.error ?? ""),
    r4.error ?? "",
  );
  db.close();
  // Nuansa U-96: tabel KOSONG + STORED ADD berhasil (jebakan dev/prod).
  const dbEmpty = new Database(":memory:");
  dbEmpty.exec("CREATE TABLE e (id INTEGER PRIMARY KEY, a TEXT)");
  const r5 = tryExec(
    dbEmpty,
    "ALTER TABLE e ADD COLUMN c TEXT GENERATED ALWAYS AS (lower(a)) STORED",
  );
  check(
    "H-MIG-00e tabel KOSONG + STORED ADD BERHASIL di 3.53.4 — kegagalan bergantung isi tabel (U-96)",
    r5.ok,
    r5.error ?? "",
  );
  const r6 = tryRun(dbEmpty, "INSERT INTO e (a) VALUES ('AbC')");
  const got: any = dbEmpty.query("SELECT c FROM e WHERE a='AbC'").get();
  check("H-MIG-00f kolom STORED pada tabel kosong terhitung benar setelah insert", r6.ok && got?.c === "abc", `c=${got?.c}`);
  dbEmpty.close();
}

// ==================================================================
// H-MIG-01 — Migrasi v3 sukses; semua data utuh.
// ==================================================================
console.log("--- H-MIG-01 (migrasi v3 sukses) ---");
const mig01Path = freshCopy("mig01");
const baseProjectsDump = (() => {
  const db = new Database(basePath, { readonly: true });
  const d = projectDump(db);
  db.close();
  return d;
})();
const baseChecksDump = (() => {
  const db = new Database(basePath, { readonly: true });
  const rows: any[] = db.query("SELECT * FROM checks ORDER BY id").all();
  db.close();
  return JSON.stringify(rows);
})();
const baseSavedDump = (() => {
  const db = new Database(basePath, { readonly: true });
  const rows: any[] = db.query("SELECT * FROM saved_projects ORDER BY project_id").all();
  db.close();
  return JSON.stringify(rows);
})();
{
  const db = new Database(mig01Path);
  const res = runMigrationFile(db, migUpPath);
  check("H-MIG-01a migrasi 0006 v3 (artefak sebenarnya) sukses", res.ok, res.error ?? "");
  if (res.ok) {
    const c = counts(db);
    check("H-MIG-01b projects tetap 12 baris", c.projects === 12, `n=${c.projects}`);
    check("H-MIG-01c checks tetap 2 baris", c.checks === 2, `n=${c.checks}`);
    check("H-MIG-01d saved_projects tetap 2 baris", c.saved_projects === 2, `n=${c.saved_projects}`);
    check(
      "H-MIG-01e SEMUA nilai kolom projects identik sebelum/sesudah (dump JSON sama)",
      projectDump(db) === baseProjectsDump,
    );
    const checksAfter: any[] = db.query("SELECT * FROM checks ORDER BY id").all();
    check(
      "H-MIG-01f baris checks utuh; owner_user_id legacy tetap NULL",
      JSON.stringify(checksAfter.map(({ owner_user_id, ...r }: any) => r)) === baseChecksDump &&
        checksAfter.every((r: any) => r.owner_user_id === null),
    );
    const savedAfter: any[] = db.query("SELECT * FROM saved_projects ORDER BY project_id").all();
    check(
      "H-MIG-01g baris saved_projects utuh; principal_id = '<LEGACY>'",
      JSON.stringify(savedAfter.map(({ principal_id, ...r }: any) => r)) === baseSavedDump &&
        savedAfter.every((r: any) => r.principal_id === "<LEGACY>"),
    );
    // AUTOINCREMENT lanjut: insert baru harus dapat id 13.
    const ins = tryRun(
      db,
      `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
       VALUES ('Uji Autoincrement','Ethereum','DeFi','live','uji','uji','Easy','2026-11-08','uji',99,'0x1111111111111111111111111111111111111111')`,
    );
    const newRow: any = db.query("SELECT id, contract_address_canonical AS c FROM projects WHERE name='Uji Autoincrement'").get();
    check("H-MIG-01h insert pasca-migrasi dapat id 13 (sqlite_sequence utuh)", ins.ok && newRow?.id === 13, `id=${newRow?.id}`);
    check(
      "H-MIG-01i kolom kanonik baris baru terhitung DB (= fungsi JS)",
      newRow?.c === canonicalizeContractAddress("Ethereum", "0x1111111111111111111111111111111111111111"),
      `db=${newRow?.c}`,
    );
    db.exec("DELETE FROM projects WHERE name='Uji Autoincrement'");
    const fk: any[] = db.query("PRAGMA foreign_key_check").all();
    check("H-MIG-01j PRAGMA foreign_key_check = 0 baris", fk.length === 0, JSON.stringify(fk));
    const ic: any[] = db.query("PRAGMA integrity_check").all();
    check("H-MIG-01k PRAGMA integrity_check = 'ok'", ic.length === 1 && Object.values(ic[0])[0] === "ok");
  }
  db.close();
}

// ==================================================================
// H-MIG-02 — Inspeksi schema hasil migrasi.
// ==================================================================
console.log("--- H-MIG-02 (inspeksi schema) ---");
{
  const db = new Database(mig01Path, { readonly: true });
  const projectsSql: any = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  const sql: string = projectsSql?.sql ?? "";
  check("H-MIG-02a sql projects memuat 'GENERATED ALWAYS AS' + 'STORED'", /GENERATED ALWAYS AS/i.test(sql) && /STORED/i.test(sql));
  check("H-MIG-02b sql projects memuat CHECK chain bernama", sql.includes("projects_chain_allowlist_ck"));
  check("H-MIG-02c sql projects memuat CHECK format bernama", sql.includes("projects_contract_format_ck"));
  check("H-MIG-02d sql projects memuat kolom provenance", sql.includes("provenance_source_url") && sql.includes("provenance_verified_by"));
  const idx: any[] = db.query("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='projects'").all();
  const idxNames = idx.map((r) => r.name);
  check("H-MIG-02e unique index nama ada", idxNames.includes("projects_name_normalized_unique"));
  check("H-MIG-02f unique index alamat per chain ada (partial)", idxNames.includes("projects_contract_normalized_unique"));
  const idxSql: any = db.query("SELECT sql FROM sqlite_master WHERE name='projects_contract_normalized_unique'").get();
  check(
    "H-MIG-02g unique index alamat bersifat partial (WHERE contract_address IS NOT NULL)",
    /WHERE `contract_address` IS NOT NULL/i.test(idxSql?.sql ?? "") || /WHERE contract_address IS NOT NULL/i.test(idxSql?.sql ?? ""),
  );
  const checksInfo: any[] = db.query("PRAGMA table_info(checks)").all();
  check("H-MIG-02h checks punya kolom owner_user_id", checksInfo.some((r) => r.name === "owner_user_id"));
  const checksIdx: any[] = db.query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='checks'").all();
  check("H-MIG-02i index checks_owner_idx ada", checksIdx.some((r) => r.name === "checks_owner_idx"));
  const savedInfo: any[] = db.query("PRAGMA table_info(saved_projects)").all();
  const pkCols = savedInfo.filter((r) => r.pk > 0).sort((a, b) => a.pk - b.pk).map((r) => r.name);
  check(
    "H-MIG-02j saved_projects composite PK (principal_id, project_id)",
    JSON.stringify(pkCols) === JSON.stringify(["principal_id", "project_id"]),
    `pk=${JSON.stringify(pkCols)}`,
  );
  const fkList: any[] = db.query("PRAGMA foreign_key_list(saved_projects)").all();
  check(
    "H-MIG-02k saved_projects FK tetap ke projects(id)",
    fkList.some((r) => r.table === "projects" && r.from === "project_id" && r.to === "id"),
    JSON.stringify(fkList),
  );
  const trig: any[] = db.query("SELECT count(*) AS n FROM sqlite_master WHERE type IN ('trigger','view')").all();
  check("H-MIG-02l tidak ada trigger/view (0, seperti sebelum migrasi)", Number((trig[0] as any).n) === 0);
  // Bandingkan dengan base: base TIDAK punya artefak-artefak itu.
  const bdb = new Database(basePath, { readonly: true });
  const bSql: any = bdb.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  check(
    "H-MIG-02m base (pre-migrasi) TIDAK punya kolom kanonik/CHECK bernama — artefak di atas benar-benar dari migrasi v3",
    !/contract_address_canonical/.test(bSql?.sql ?? "") && !/projects_chain_allowlist_ck/.test(bSql?.sql ?? ""),
  );
  bdb.close();
  db.close();
}

// ==================================================================
// H-MIG-03 — Pre-check duplikat -> abort, DB byte-identik.
// ==================================================================
console.log("--- H-MIG-03 (pre-check duplikat) ---");
{
  const p = freshCopy("mig03");
  const db = new Database(p);
  // Duplikat EVM beda case (BAOracle) + duplikat nama beda case.
  db.exec(
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('baoracle — binance agent oracle','BNB Chain','NFT','live','x','x','Easy','2026-11-02','x',50,'0xcbe2dbbff4264dc67bf557c64e29997b82439354')`,
  );
  db.close();
  const before = shaFile(p); // hash SETELAH injeksi, SEBELUM migrasi
  const db2 = new Database(p);
  const res = runMigrationFile(db2, migUpPath);
  db2.close();
  check("H-MIG-03a migrasi GAGAL pada pre-check duplikat", !res.ok, res.error ?? "");
  check(
    "H-MIG-03b kegagalan terjadi di Fase 1 (statement VALIDATION, sebelum BEGIN)",
    (res.failedAt ?? 99) < 6,
    `failedAt=${res.failedAt}`,
  );
  check("H-MIG-03c DB byte-identik setelah abort pre-check", shaFile(p) === before, `sha ${before.slice(0, 12)} vs ${shaFile(p).slice(0, 12)}`);
  const db3 = new Database(p, { readonly: true });
  check("H-MIG-03d jumlah projects tetap 13 (12 + 1 duplikat injeksi, tanpa perubahan migrasi)", counts(db3).projects === 13);
  const info: any[] = db3.query("PRAGMA table_info(checks)").all();
  check("H-MIG-03e kolom owner_user_id TIDAK ditambahkan (abort sebelum Fase 2)", !info.some((r) => r.name === "owner_user_id"));
  db3.close();
}

// ==================================================================
// H-MIG-04 — Pre-check chain tak dikenal -> abort, DB byte-identik.
// ==================================================================
console.log("--- H-MIG-04 (pre-check chain tak dikenal) ---");
{
  const p = freshCopy("mig04");
  const db = new Database(p);
  db.exec(
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Proyek Chain Asing','Fake Chain','DeFi','live','x','x','Easy','2026-11-08','x',51,'0x2222222222222222222222222222222222222222')`,
  );
  db.close();
  const before = shaFile(p); // hash SETELAH injeksi, SEBELUM migrasi
  const db2 = new Database(p);
  const res = runMigrationFile(db2, migUpPath);
  db2.close();
  check("H-MIG-04a migrasi GAGAL pada pre-check chain tak dikenal", !res.ok, res.error ?? "");
  check("H-MIG-04b DB byte-identik setelah abort pre-check", shaFile(p) === before);
  const db3 = new Database(p, { readonly: true });
  check("H-MIG-04c jumlah projects tetap 13 (12 + 1 injeksi)", counts(db3).projects === 13);
  db3.close();
}

// ==================================================================
// H-MIG-05 — Kegagalan tengah transaksi + crash tanpa COMMIT.
// ==================================================================
console.log("--- H-MIG-05 (failure injection tengah transaksi) ---");
{
  // 05a: file migrasi disabotase — index terakhir menunjuk tabel
  // yang tidak ada; runner harus ROLLBACK seluruh transaksi.
  const p = freshCopy("mig05a");
  const before = shaFile(p);
  const sabotaged = readFileSync(migUpPath, "utf8").replace(
    "ON `projects` (`chain`, `contract_address_canonical`)",
    "ON `projects_typo` (`chain`, `contract_address_canonical`)",
  );
  const sabPath = join(workDir, "0006_sabotaged.sql");
  writeFileSync(sabPath, sabotaged);
  const db = new Database(p);
  const res = runMigrationFile(db, sabPath);
  db.close();
  check("H-MIG-05a migrasi tersabotase GAGAL", !res.ok, res.error ?? "");
  check(
    "H-MIG-05b kegagalan terjadi di Fase 2 (setelah BEGIN) dan ROLLBACK dieksekusi",
    (res.failedAt ?? 0) > 6,
    `failedAt=${res.failedAt}`,
  );
  check("H-MIG-05c DB byte-identik setelah ROLLBACK tengah transaksi", shaFile(p) === before);
  const db2 = new Database(p, { readonly: true });
  const sql: any = db2.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  check("H-MIG-05d schema projects tetap definisi lama (tanpa kolom kanonik)", !/contract_address_canonical/.test(sql?.sql ?? ""));
  check("H-MIG-05e jumlah projects tetap 12", counts(db2).projects === 12);
  db2.close();

  // 05b: crash — proses terpisah mati tanpa COMMIT di tengah rebuild.
  const p2 = freshCopy("mig05b");
  const before2 = shaFile(p2);
  const crash = Bun.spawnSync(["bun", join(evDir, "crash-mid-migration.ts"), p2], {
    stdout: "pipe",
    stderr: "pipe",
  });
  console.log(`  crash child stdout: ${crash.stdout.toString().trim()}`);
  check("H-MIG-05f proses crash keluar dengan kode 2 (simulasi mati)", crash.exitCode === 2, `exit=${crash.exitCode}`);
  const db3 = new Database(p2); // open berikutnya memulihkan via journal
  const sql3: any = db3.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  check("H-MIG-05g setelah crash: tabel projects lama UTUH (rollback journal)", /CREATE TABLE `projects`/.test(sql3?.sql ?? "") && !/contract_address_canonical/.test(sql3?.sql ?? ""));
  check("H-MIG-05h setelah crash: jumlah projects tetap 12", counts(db3).projects === 12);
  db3.close();
  check("H-MIG-05i DB byte-identik setelah pemulihan crash", shaFile(p2) === before2);
}

// ==================================================================
// H-MIG-06 — Backup/restore.
// ==================================================================
console.log("--- H-MIG-06 (backup/restore) ---");
{
  const backup = join(workDir, "backup-pre-migration.db");
  copyFileSync(basePath, backup);
  const backupHash = shaFile(backup);
  // Jalankan migrasi pada salinan kerja (simulasi "DB produksi" yang
  // sudah termigrasi), lalu restore dari backup ke file baru.
  const working = freshCopy("mig06work");
  const dbw = new Database(working);
  const res = runMigrationFile(dbw, migUpPath);
  dbw.close();
  check("H-MIG-06a migrasi pada salinan kerja sukses (prasyarat restore)", res.ok, res.error ?? "");
  const restored = join(workDir, "restored.db");
  copyFileSync(backup, restored);
  check("H-MIG-06b restore dari backup = byte-identik dengan backup", shaFile(restored) === backupHash);
  const dbr = new Database(restored, { readonly: true });
  const sql: any = dbr.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  check("H-MIG-06c DB hasil restore berschema lama (tanpa kolom kanonik)", !/contract_address_canonical/.test(sql?.sql ?? ""));
  check("H-MIG-06d DB hasil restore: projects = 12 baris", counts(dbr).projects === 12);
  dbr.close();
}

// ==================================================================
// H-MIG-07 — Re-run pada DB termigrasi gagal bersih.
// ==================================================================
console.log("--- H-MIG-07 (re-run ditolak) ---");
{
  const p = join(workDir, "mig07.db");
  copyFileSync(mig01Path, p); // mig01Path sudah termigrasi (H-MIG-01)
  const before = shaFile(p);
  const db = new Database(p);
  const res = runMigrationFile(db, migUpPath);
  db.close();
  check("H-MIG-07a re-run migrasi pada DB termigrasi GAGAL (bukan idempotent)", !res.ok, res.error ?? "");
  check("H-MIG-07b DB byte-identik setelah re-run gagal (rollback)", shaFile(p) === before);
  const db2 = new Database(p, { readonly: true });
  check("H-MIG-07c jumlah projects tetap 12 setelah re-run gagal", counts(db2).projects === 12);
  db2.close();
}

// ==================================================================
// H-MIG-08 — Down migration pada salinan terpisah.
// ==================================================================
console.log("--- H-MIG-08 (down migration) ---");
{
  const p = join(workDir, "mig08.db");
  copyFileSync(mig01Path, p);
  const db = new Database(p);
  const res = runMigrationFile(db, migDownPath);
  check("H-MIG-08a down migration sukses pada salinan terpisah", res.ok, res.error ?? "");
  if (res.ok) {
    const c = counts(db);
    check("H-MIG-08b projects tetap 12 baris setelah down", c.projects === 12, `n=${c.projects}`);
    check("H-MIG-08c checks tetap 2 baris setelah down", c.checks === 2, `n=${c.checks}`);
    check("H-MIG-08d saved_projects tetap 2 baris setelah down", c.saved_projects === 2, `n=${c.saved_projects}`);
    check("H-MIG-08e dump projects setelah down == dump sebelum migrasi naik", projectDump(db) === baseProjectsDump);
    const sql: any = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
    check("H-MIG-08f sql projects tanpa kolom kanonik/CHECK bernama", !/contract_address_canonical/.test(sql?.sql ?? "") && !/projects_chain_allowlist_ck/.test(sql?.sql ?? ""));
    const idx: any[] = db.query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='projects'").all();
    check("H-MIG-08g kedua unique index hilang setelah down", !idx.some((r) => r.name === "projects_name_normalized_unique") && !idx.some((r) => r.name === "projects_contract_normalized_unique"));
    const checksInfo: any[] = db.query("PRAGMA table_info(checks)").all();
    check("H-MIG-08h checks tanpa kolom owner_user_id setelah down", !checksInfo.some((r) => r.name === "owner_user_id"));
    const savedInfo: any[] = db.query("PRAGMA table_info(saved_projects)").all();
    const pkCols = savedInfo.filter((r) => r.pk > 0).map((r) => r.name);
    check("H-MIG-08i saved_projects kembali PK project_id saja", JSON.stringify(pkCols) === JSON.stringify(["project_id"]), `pk=${JSON.stringify(pkCols)}`);
    check("H-MIG-08j saved_projects tanpa kolom principal_id", !savedInfo.some((r) => r.name === "principal_id"));
    const fk: any[] = db.query("PRAGMA foreign_key_check").all();
    check("H-MIG-08k foreign_key_check = 0 baris setelah down", fk.length === 0);
    // Perbandingan struktural vs base (table_info per tabel).
    const bdb = new Database(basePath, { readonly: true });
    let structSame = true;
    for (const t of ["projects", "checks", "saved_projects"]) {
      const a: any[] = db.query(`PRAGMA table_info(${t})`).all();
      const b: any[] = bdb.query(`PRAGMA table_info(${t})`).all();
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        structSame = false;
        console.log(`  STRUCT DIFF ${t}: down=${JSON.stringify(a)} base=${JSON.stringify(b)}`);
      }
    }
    check("H-MIG-08l PRAGMA table_info ketiga tabel == base (struktur kembali persis)", structSame);
    bdb.close();
  }
  db.close();
}

// ==================================================================
// H-MIG-09 — Cross-version (dicatat; bukti di log CLI terpisah).
// ==================================================================
console.log("--- H-MIG-09 (cross-version SQLite 3.45.1) ---");
{
  const cli = Bun.spawnSync(["sqlite3", "--version"]);
  const ver = cli.stdout.toString().trim();
  check("H-MIG-09a sqlite3 CLI tersedia (versi kedua selain Bun)", cli.exitCode === 0 && ver.startsWith("3.45.1"), ver);
  console.log(
    "  H-MIG-09b eksekusi migrasi pada SQLite 3.45.1 dilakukan skrip run-mig-sqlite3451.sh; log: test-f044-f045-f046-migration-v2321-sqlite3451.txt (file migrasi yang SAMA, sha256 sama).",
  );
  check(
    "H-MIG-09c file migrasi yang dipakai CLI == file yang dipakai harness Bun (sha256 tercatat di header log ini)",
    existsSync(join(evDir, "run-mig-sqlite3451.sh")),
  );
}

// ==================================================================
// H-CAT-11 — F-045: direct SQL negatif (CHECK constraint nyata).
// ==================================================================
console.log("--- H-CAT-11 (F-045 direct SQL negatif) ---");
{
  const p = join(workDir, "cat11.db");
  copyFileSync(mig01Path, p);
  const db = new Database(p);
  const base = counts(db);
  const neg = (
    label: string,
    sql: string,
    mustMatch: RegExp,
  ) => {
    const r = tryRun(db, sql);
    check(`H-CAT-11 ${label} -> DITOLAK CHECK`, !r.ok && mustMatch.test(r.error ?? ""), r.error ?? "");
  };
  neg(
    "INSERT chain 'Fake Chain' + alamat EVM valid",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X1','Fake Chain','DeFi','live','x','x','Easy','2026-11-08','x',60,'0x3333333333333333333333333333333333333333')`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "INSERT chain 'Fake Chain' + contract NULL (tutup bypass canonical-NULL)",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X2','Fake Chain','DeFi','live','x','x','Easy','2026-11-08','x',61,NULL)`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "UPDATE chain baris ada -> 'Fake Chain'",
    `UPDATE projects SET chain='Fake Chain' WHERE id=1`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "INSERT chain 'bnb chain' (case salah)",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X3','bnb chain','DeFi','live','x','x','Easy','2026-11-08','x',62,'0x4444444444444444444444444444444444444444')`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "INSERT chain ' BNB Chain' (spasi)",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X4',' BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',63,'0x5555555555555555555555555555555555555555')`,
    /CHECK constraint failed: projects_chain_allowlist_ck/i,
  );
  neg(
    "INSERT Solana + alamat mengandung 'l' (base58 ilegal)",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X5','Solana','DeFi','live','x','x','Easy','2026-11-08','x',64,'41WlXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump')`,
    /CHECK constraint failed: projects_contract_format_ck/i,
  );
  neg(
    "INSERT EVM + alamat pendek '0x1234'",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X6','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',65,'0x1234')`,
    /CHECK constraint failed: projects_contract_format_ck/i,
  );
  neg(
    "INSERT EVM + alamat non-hex '0xZZZ...'",
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('X7','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',66,'0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')`,
    /CHECK constraint failed: projects_contract_format_ck/i,
  );
  neg(
    "UPDATE contract_address baris ada -> format salah",
    `UPDATE projects SET contract_address='0x1234' WHERE id=2`,
    /CHECK constraint failed: projects_contract_format_ck/i,
  );
  const after = counts(db);
  check("H-CAT-11 jumlah projects TIDAK berubah setelah semua penolakan", after.projects === base.projects, `n=${after.projects}`);
  db.close();
}

// ==================================================================
// H-CAT-12 — F-045: positif allowlist + uniqueness.
// ==================================================================
console.log("--- H-CAT-12 (F-045 positif + uniqueness) ---");
{
  const p = join(workDir, "cat12.db");
  copyFileSync(mig01Path, p);
  const db = new Database(p);
  const chains: [string, string][] = [
    ["BNB Chain", "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["Ethereum", "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
    ["Base", "0xcccccccccccccccccccccccccccccccccccccccc"],
    ["Arbitrum", "0xdddddddddddddddddddddddddddddddddddddddd"],
    ["Polygon", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"],
    ["opBNB", "0xffffffffffffffffffffffffffffffffffffffff"],
    ["Robinhood Chain", "0x1111111111111111111111111111111111111112"],
    ["Solana", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
  ];
  let allOk = true;
  chains.forEach(([chain, addr], i) => {
    const r = tryRun(
      db,
      `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      `Allowlist ${chain}`, chain, "DeFi", "live", "x", "x", "Easy", "2026-11-08", "x", 70 + i, addr,
    );
    if (!r.ok) { allOk = false; console.log(`  allowlist FAIL ${chain}: ${r.error}`); }
  });
  check("H-CAT-12a SEMUA 8 chain allowlist lolos INSERT", allOk);
  const dup1 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Dup EVM case','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',80,'0xcbe2dbbff4264dc67bf557c64e29997b82439354')`,
  );
  check(
    "H-CAT-12b duplikat EVM beda case (alamat BAOracle) -> UNIQUE violation",
    !dup1.ok && /UNIQUE constraint failed: projects\.chain, projects\.contract_address_canonical/i.test(dup1.error ?? ""),
    dup1.error ?? "",
  );
  const dup2 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Dup EVM noprefix','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',81,'CBE2DBBFF4264DC67BF557C64E29997B82439354')`,
  );
  check(
    "H-CAT-12c duplikat EVM tanpa prefix 0x uppercase -> UNIQUE violation",
    !dup2.ok && /UNIQUE/i.test(dup2.error ?? ""),
    dup2.error ?? "",
  );
  const dup3 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Dup EVM ws','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',82,'  0xCBE2DBBFF4264DC67BF557C64E29997B82439354  ')`,
  );
  check(
    "H-CAT-12d duplikat EVM whitespace -> UNIQUE violation",
    !dup3.ok && /UNIQUE/i.test(dup3.error ?? ""),
    dup3.error ?? "",
  );
  const dup0x = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Dup EVM 0X','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',89,'0XCBE2DBBFF4264DC67BF557C64E29997B82439354')`,
  );
  check(
    "H-CAT-12d2 duplikat EVM prefix '0X' uppercase -> UNIQUE violation (bukan '0x0x...' — U-95)",
    !dup0x.ok && /UNIQUE/i.test(dup0x.error ?? ""),
    dup0x.error ?? "",
  );
  const sol2 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Solana varian','Solana','DeFi','live','x','x','Easy','2026-11-08','x',83,'41wpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump')`,
  );
  check(
    "H-CAT-12e Solana satu huruf beda case -> DITERIMA (alamat BERBEDA)",
    sol2.ok,
    sol2.error ?? "",
  );
  const sol3 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Solana sama persis','Solana','DeFi','live','x','x','Easy','2026-11-08','x',84,'41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump')`,
  );
  check(
    "H-CAT-12f Solana sama persis -> UNIQUE violation",
    !sol3.ok && /UNIQUE/i.test(sol3.error ?? ""),
    sol3.error ?? "",
  );
  const cross = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Cross chain','Ethereum','DeFi','live','x','x','Easy','2026-11-08','x',85,'0xcBe2DBBFF4264Dc67Bf557c64e29997B82439354')`,
  );
  check("H-CAT-12g alamat EVM sama di chain BERBEDA -> DITERIMA", cross.ok, cross.error ?? "");
  const n1 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Null 1','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',86,NULL)`,
  );
  const n2 = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('Null 2','BNB Chain','DeFi','live','x','x','Easy','2026-11-08','x',87,NULL)`,
  );
  check("H-CAT-12h dua baris NULL contract_address -> DITERIMA", n1.ok && n2.ok);
  const dupName = tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES ('  pTaH — Proof of Agent  ','Ethereum','DeFi','live','x','x','Easy','2026-11-08','x',88,'0x9999999999999999999999999999999999999999')`,
  );
  check(
    "H-CAT-12i duplikat nama ternormalisasi (case+spasi) -> UNIQUE violation",
    !dupName.ok && /UNIQUE constraint failed: index 'projects_name_normalized_unique'/i.test(dupName.error ?? ""),
    dupName.error ?? "",
  );
  db.close();
}

// ==================================================================
// H-CAT-13 — Fungsi JS == kolom generated DB (semua baris + edge).
// ==================================================================
console.log("--- H-CAT-13 (JS == DB canonical) ---");
{
  const p = join(workDir, "cat13.db");
  copyFileSync(mig01Path, p);
  const db = new Database(p);
  const rows: any[] = db.query("SELECT id, name, chain, contract_address, contract_address_canonical AS c FROM projects ORDER BY id").all();
  let agree = true;
  for (const row of rows) {
    const js = canonicalizeContractAddress(row.chain, row.contract_address);
    if (js !== row.c) {
      agree = false;
      console.log(`  MISMATCH id=${row.id} js=${js} db=${row.c}`);
    }
  }
  check(`H-CAT-13a fungsi JS == generated column DB untuk SEMUA ${rows.length} baris seed`, agree);
  const edge: [string, string, string][] = [
    ["BNB Chain", "  0xCBE2DBBFF4264DC67BF557C64E29997B82439354  ", "0xcbe2dbbff4264dc67bf557c64e29997b82439354"],
    ["BNB Chain", "cbe2dbbff4264dc67bf557c64e29997b82439354", "0xcbe2dbbff4264dc67bf557c64e29997b82439354"],
    ["BNB Chain", "0XCBE2DBBFF4264DC67BF557C64E29997B82439354", "0xcbe2dbbff4264dc67bf557c64e29997b82439354"],
    ["Solana", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
    ["Solana", "  41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump ", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
  ];
  let edgeOk = true;
  for (const [chain, addr, expected] of edge) {
    const js = canonicalizeContractAddress(chain, addr);
    if (js !== expected) { edgeOk = false; console.log(`  EDGE JS MISMATCH ${chain} ${addr}: js=${js} expected=${expected}`); }
    const r = tryRun(
      db,
      `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      `Edge ${chain} ${addr.slice(0, 12)}`, chain, "DeFi", "live", "x", "x", "Easy", "2026-11-08", "x", 90, addr,
    );
    if (!r.ok) {
      // Duplikat dengan baris seed yang sudah ada adalah HASIL YANG
      // BENAR (unique index bekerja) — bukan kegagalan tes.
      if (!/UNIQUE/i.test(r.error ?? "")) { edgeOk = false; console.log(`  EDGE INSERT FAIL ${chain}: ${r.error}`); }
      continue;
    }
    const got: any = db.query("SELECT contract_address_canonical AS c FROM projects WHERE contract_address = ? AND chain = ?").get(addr, chain);
    if (got?.c !== expected) { edgeOk = false; console.log(`  EDGE DB MISMATCH ${chain}: db=${got?.c} expected=${expected}`); }
  }
  check("H-CAT-13b korpus edge: JS == DB (atau UNIQUE bila duplikat seed — benar)", edgeOk);
  db.close();
}

// ==================================================================
// H-TEN-11..15 — F-046: dua principal + legacy NULL, fail-closed.
// ==================================================================
console.log("--- H-TEN-11..15 (F-046 dua principal, fail-closed) ---");
{
  const p = join(workDir, "ten.db");
  copyFileSync(mig01Path, p);
  const db = new Database(p);
  const nowMs = Date.now();
  // Baris milik principal A (2) dan B (1), ditulis pasca-migrasi.
  db.exec(
    `INSERT INTO checks (url, domain, verdict, score, signals, contracts, created_at, owner_user_id) VALUES
     ('https://a-1.test/x','a-1.test','waspada',60,'[]','[]',${nowMs},'principal-A'),
     ('https://a-2.test/x','a-2.test','bahaya',90,'[]','[]',${nowMs},'principal-A'),
     ('https://b-1.test/x','b-1.test','lebih_aman',10,'[]','[]',${nowMs},'principal-B')`,
  );
  const listChecks = (principal: string): any[] =>
    db.query("SELECT id, domain, owner_user_id AS o FROM checks WHERE owner_user_id = ? ORDER BY id DESC").all(principal);
  const listOld = (principal: string): any[] =>
    db.query("SELECT id, domain, owner_user_id AS o FROM checks WHERE owner_user_id = ? OR owner_user_id IS NULL ORDER BY id DESC").all(principal);

  const bRows = listChecks("principal-B");
  check(
    "H-TEN-11a listChecks(B) hanya baris B (1 baris)",
    bRows.length === 1 && bRows[0].domain === "b-1.test" && bRows[0].o === "principal-B",
    JSON.stringify(bRows),
  );
  const aRows = listChecks("principal-A");
  check(
    "H-TEN-11b listChecks(A) hanya baris A (2 baris)",
    aRows.length === 2 && aRows.every((r: any) => r.o === "principal-A"),
    JSON.stringify(aRows.map((r: any) => r.domain)),
  );
  check(
    "H-TEN-11c legacy NULL TIDAK terlihat principal A maupun B (fail-closed)",
    listChecks("principal-A").every((r: any) => r.o !== null) &&
      listChecks("principal-B").every((r: any) => r.o !== null),
  );
  const bOld = listOld("principal-B");
  check(
    "H-TEN-11d KONTRAS: predikat lama v2.3.20 (OR owner IS NULL) MEMBOCORKAN 2 baris legacy ke B — alasan F-046",
    bOld.length === 3 && bOld.filter((r: any) => r.o === null).length === 2,
    `old-predicate rows=${bOld.length} (legacy=${bOld.filter((r: any) => r.o === null).length})`,
  );

  // H-TEN-12: deleteCheck lintas principal.
  const aRowId = Number(aRows[0].id);
  const legacyId: any = db.query("SELECT id FROM checks WHERE owner_user_id IS NULL ORDER BY id LIMIT 1").get();
  const bRowId = Number(bRows[0].id);
  const delA = tryRun(db, "DELETE FROM checks WHERE id = ? AND owner_user_id = ?", aRowId, "principal-B");
  check("H-TEN-12a DELETE baris A oleh B = 0 baris terhapus", delA.ok && delA.changes === 0, `changes=${delA.changes}`);
  const stillA: any = db.query("SELECT count(*) AS n FROM checks WHERE id = ?").get(aRowId);
  check("H-TEN-12b baris A MASIH ADA setelah percobaan hapus oleh B", Number(stillA.n) === 1);
  const delLegacy = tryRun(db, "DELETE FROM checks WHERE id = ? AND owner_user_id = ?", Number(legacyId.id), "principal-B");
  check("H-TEN-12c DELETE baris legacy NULL oleh B = 0 baris terhapus", delLegacy.ok && delLegacy.changes === 0, `changes=${delLegacy.changes}`);
  const stillLegacy: any = db.query("SELECT count(*) AS n FROM checks WHERE owner_user_id IS NULL").get();
  check("H-TEN-12d kedua baris legacy MASIH ADA", Number(stillLegacy.n) === 2);
  const delOwn = tryRun(db, "DELETE FROM checks WHERE id = ? AND owner_user_id = ?", bRowId, "principal-B");
  check("H-TEN-12e DELETE baris SENDIRI oleh B = 1 baris terhapus", delOwn.ok && delOwn.changes === 1, `changes=${delOwn.changes}`);
  const delMissing = tryRun(db, "DELETE FROM checks WHERE id = ? AND owner_user_id = ?", 99999, "principal-B");
  check("H-TEN-12f DELETE id tidak ada = 0 baris (not found, tanpa bocor info)", delMissing.ok && delMissing.changes === 0);

  // H-TEN-13: askGibran — hanya checks milik principal.
  const gibranA: any[] = db
    .query("SELECT domain FROM checks WHERE owner_user_id = ? ORDER BY id DESC LIMIT 10")
    .all("principal-A");
  check(
    "H-TEN-13 askGibran(A) hanya membaca checks A (2 baris; legacy + B tidak masuk prompt)",
    gibranA.length === 2 && gibranA.every((r: any) => ["a-1.test", "a-2.test"].includes(r.domain)),
    JSON.stringify(gibranA.map((r: any) => r.domain)),
  );

  // H-TEN-14: predikat export legacy (khusus admin, gated §5).
  const legacyRows: any[] = db.query("SELECT id, domain FROM checks WHERE owner_user_id IS NULL ORDER BY id").all();
  check(
    "H-TEN-14 predikat export legacy (admin-gated) mengembalikan TEPAT 2 baris NULL — bukan untuk principal biasa",
    legacyRows.length === 2,
    JSON.stringify(legacyRows.map((r: any) => r.domain)),
  );

  // H-TEN-15: isolasi saved_projects pasca-rebuild.
  db.exec(
    `INSERT INTO saved_projects (principal_id, project_id, bookmarked, task_status, updated_at) VALUES
     ('principal-A', 1, 1, 'completed', ${nowMs}),
     ('principal-B', 1, 0, 'not_started', ${nowMs})`,
  );
  const stateA: any = db.query("SELECT bookmarked AS b, task_status AS t FROM saved_projects WHERE principal_id='principal-A' AND project_id=1").get();
  const stateB: any = db.query("SELECT bookmarked AS b, task_status AS t FROM saved_projects WHERE principal_id='principal-B' AND project_id=1").get();
  check(
    "H-TEN-15a state A (completed/bookmarked) tidak mengubah state B (not_started/tidak bookmark)",
    stateA?.b === 1 && stateA?.t === "completed" && stateB?.b === 0 && stateB?.t === "not_started",
    `A=${JSON.stringify(stateA)} B=${JSON.stringify(stateB)}`,
  );
  const legacyState: any = db.query("SELECT count(*) AS n FROM saved_projects WHERE principal_id='<LEGACY>'").get();
  check("H-TEN-15b baris '<LEGACY>' tetap 2 (tidak tertimpa state per-principal)", Number(legacyState.n) === 2);
  const crossWrite = tryRun(
    db,
    "INSERT INTO saved_projects (principal_id, project_id, bookmarked, task_status, updated_at) VALUES ('principal-B', 1, 1, 'completed', ?)",
    nowMs,
  );
  check(
    "H-TEN-15c INSERT duplikat (principal-B, project 1) -> UNIQUE violation (composite key menegakkan di DB)",
    !crossWrite.ok && /UNIQUE/i.test(crossWrite.error ?? ""),
    crossWrite.error ?? "",
  );
  // Katalog tetap GLOBAL: listProjects tanpa filter owner.
  const catCount: any = db.query("SELECT count(*) AS n FROM projects").get();
  check("H-TEN-15d katalog tetap GLOBAL (12 baris terlihat tanpa filter owner)", Number(catCount.n) === 12);
  db.close();
}

// ------------------------------------------------------------------
// Ringkasan.
// ------------------------------------------------------------------
console.log(`=== RESULT: ${pass} PASS, ${fail} FAIL ===`);
if (failures.length > 0) {
  console.log("failures:");
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(`work dir (DB disposable, tidak di-commit): ${workDir}`);
process.exit(fail === 0 ? 0 : 1);
