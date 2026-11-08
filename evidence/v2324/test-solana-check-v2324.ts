// test-solana-check-v2324.ts — F-055 (v2.3.24): CHECK Solana di DB
// menegakkan allowlist base58 PENUH, setara validator aplikasi.
//
// Tests the REAL migrations 0001–0008 (see harness-helpers.ts) on a
// disposable DB, with DIRECT SQL (bypassing the app validator — the
// whole point of F-055 is that direct SQL writers can no longer store
// malformed Solana addresses).
//
//   H-B58-01  direct INSERT negatif: `!`, `-`, `_`, `~`, spasi, Unicode,
//            `0`/`O`/`I`/`l` di alamat Solana 32–44 char -> DITOLAK CHECK
//   H-B58-02  direct UPDATE negatif: baris Solana valid -> alamat berisi
//            `!` -> DITOLAK; baris tetap utuh
//   H-B58-03  positif: alamat base58 valid 32/44 char + NULL lolos;
//            EVM valid tetap lolos; EVM non-hex tetap ditolak
//   H-B58-04  kesetaraan app-vs-DB: canonicalizeContractAddress (asli)
//            setuju dengan CHECK untuk korpus (terima/tolak sama)
//   H-B58-05  down 0008 via sqlite3 CLI: CHECK kembali ke 0006 (lama),
//            `!` lolos lagi (membuktikan down mengembalikan keadaan),
//            jumlah baris + skema lain utuh
//
// Run:  bun evidence/v2324/test-solana-check-v2324.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import { Database } from "bun:sqlite";
import { canonicalizeContractAddress } from "../../site/server/src/catalog";
import { countRows, makeMigratedDb } from "../v2323/harness-helpers";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0;
let fail = 0;
const failures: string[] = [];
type Test = { id: string; name: string; run: () => Promise<void> | void };
const tests: Test[] = [];
function test(id: string, name: string, run: () => Promise<void> | void): void {
  tests.push({ id, name, run });
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function eq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected)
    throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const tdb = makeMigratedDb();
const CHECK_RE = /CHECK constraint failed: projects_contract_format_ck/i;

function tryRun(db: Database, sql: string, ...params: any[]): { ok: boolean; error?: string } {
  try {
    db.query(sql).run(...params);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}
function insertSolana(db: Database, name: string, addr: string | null, sort: number): { ok: boolean; error?: string } {
  return tryRun(
    db,
    `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    name, "Solana", "DeFi", "live", "x", "x", "Easy", "2026-11-08", "x", sort, addr,
  );
}

test("H-B58-01", "direct INSERT Solana non-base58 -> DITOLAK CHECK", () => {
  const db = new Database(tdb.dbPath);
  try {
    const base = countRows(tdb.dbPath, "projects");
    // Semua 32–44 char, hanya karakter terlarangnya yang membedakan.
    const bad: Array<[string, string]> = [
      ["bang-!", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pum!"],
      ["strip--", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pum-"],
      ["underscore-_", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pum_"],
      ["tilde-~", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pum~"],
      ["spasi-tengah", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE5 pump"],
      ["unicode-é", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pumé"],
      ["nol-0", "41W0Xn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
      ["huruf-O", "41WOXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
      ["huruf-I", "41WIXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
      ["huruf-l", "41WlXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"],
      ["pendek-31", "41WpXn15fxQXEGhiKnkqHcoJn14tNXX"],
      ["panjang-45", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pumpX"],
    ];
    bad.forEach(([label, addr], i) => {
      const r = insertSolana(db, `B58-neg-${label}`, addr, 100 + i);
      assert(!r.ok && CHECK_RE.test(r.error ?? ""), `${label} (${addr}) must be rejected by the CHECK (got ok=${r.ok} err=${r.error ?? ""})`);
    });
    eq(countRows(tdb.dbPath, "projects"), base, "no rows may be added by rejected inserts");
  } finally {
    db.close();
  }
});

test("H-B58-02", "direct UPDATE ke alamat non-base58 -> DITOLAK, baris utuh", () => {
  const db = new Database(tdb.dbPath);
  try {
    const ins = insertSolana(db, "B58-update-target", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump", 200);
    assert(ins.ok, `seed valid row must insert (err=${ins.error ?? ""})`);
    const before: any = db.query("SELECT contract_address AS c FROM projects WHERE name='B58-update-target'").get();
    const r = tryRun(db, `UPDATE projects SET contract_address='41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pum!' WHERE name='B58-update-target'`);
    assert(!r.ok && CHECK_RE.test(r.error ?? ""), `UPDATE to '!' address must be rejected (got ok=${r.ok} err=${r.error ?? ""})`);
    const after: any = db.query("SELECT contract_address AS c FROM projects WHERE name='B58-update-target'").get();
    eq(after?.c, before?.c, "row must be unchanged after rejected UPDATE");
  } finally {
    db.close();
  }
});

test("H-B58-03", "positif: base58 valid + NULL + EVM lolos; EVM non-hex ditolak", () => {
  const db = new Database(tdb.dbPath);
  try {
    const ok32 = insertSolana(db, "B58-pos-32", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXg", 210);
    assert(ok32.ok, `32-char valid base58 must insert (err=${ok32.error ?? ""})`);
    const ok44 = insertSolana(db, "B58-pos-44", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pumq", 211);
    assert(ok44.ok, `44-char valid base58 must insert (err=${ok44.error ?? ""})`);
    const okNull = insertSolana(db, "B58-pos-null", null, 212);
    assert(okNull.ok, `NULL contract must insert (err=${okNull.error ?? ""})`);
    const okEvm = tryRun(
      db,
      `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
       VALUES ('B58-pos-evm','Ethereum','DeFi','live','x','x','Easy','2026-11-08','x',213,'0x1111111111111111111111111111111111111111')`,
    );
    assert(okEvm.ok, `valid EVM must insert (err=${okEvm.error ?? ""})`);
    const badEvm = tryRun(
      db,
      `INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address)
       VALUES ('B58-neg-evm','Ethereum','DeFi','live','x','x','Easy','2026-11-08','x',214,'0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')`,
    );
    assert(!badEvm.ok && CHECK_RE.test(badEvm.error ?? ""), "non-hex EVM must still be rejected");
  } finally {
    db.close();
  }
});

test("H-B58-04", "kesetaraan app-vs-DB: canonicalize setuju dengan CHECK", () => {
  const db = new Database(tdb.dbPath);
  try {
    const cases: Array<[string, boolean]> = [
      ["41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pumr", true],
      ["41WpXn15fxQXEGhiKnkqHcoJn14tNXXh", true],
      ["41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pum!", false],
      ["41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pum-", false],
      ["41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pum_", false],
      ["41W0Xn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump", false],
      ["41WlXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump", false],
    ];
    cases.forEach(([addr, appAccepts], i) => {
      let appOk = true;
      let canonical: string | null = null;
      try {
        canonical = canonicalizeContractAddress("Solana", addr);
      } catch {
        appOk = false;
      }
      eq(appOk, appAccepts, `app must ${appAccepts ? "accept" : "reject"} ${addr}`);
      const r = insertSolana(db, `B58-eq-${i}`, addr, 220 + i);
      eq(r.ok, appAccepts, `DB must ${appAccepts ? "accept" : "reject"} ${addr} (err=${r.error ?? ""})`);
      if (appAccepts) {
        const row: any = db.query("SELECT contract_address_canonical AS c FROM projects WHERE name=?").get(`B58-eq-${i}`);
        eq(row?.c, canonical, `generated canonical must equal app canonical for ${addr}`);
      }
    });
  } finally {
    db.close();
  }
});

test("H-B58-05", "down 0008 via sqlite3 CLI: CHECK kembali ke 0006, baris + skema lain utuh", async () => {
  const { execSync } = await import("node:child_process");
  const workDir = mkdtempSync(join(tmpdir(), "v2324-b58-down-"));
  const copyPath = join(workDir, "down.db");
  // Salinan DB termigrasi (0001–0008) via cp file — bukan live DB.
  execSync(`cp '${tdb.dbPath}' '${copyPath}'`);
  const countsBefore = {
    projects: countRows(copyPath, "projects"),
    checks: countRows(copyPath, "checks"),
    saved: countRows(copyPath, "saved_projects"),
  };
  const downSql = join(import.meta.dir, "0008_down.sql");
  assert(existsSync(downSql), "0008_down.sql must exist");
  const res = Bun.spawnSync(["sh", "-c", `sqlite3 -bail '${copyPath}' < '${downSql}'`], { stdout: "pipe", stderr: "pipe" });
  assert(res.exitCode === 0, `down 0008 must exit 0 (err=${res.stderr.toString().slice(0, 300)})`);
  const db = new Database(copyPath);
  try {
    const sqlRow: any = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
    const sqlText: string = sqlRow?.sql ?? "";
    assert(!sqlText.includes("[^1-9A-HJ-NP-Za-km-z]"), "0008 CHECK must be gone after down");
    assert(sqlText.includes("[0OlI]"), "0006 CHECK (0/O/I/l ban) must be back after down");
    assert(sqlText.includes("projects_chain_allowlist_ck"), "chain CHECK must survive down");
    assert(sqlText.includes("GENERATED ALWAYS AS"), "generated column must survive down");
    eq(countRows(copyPath, "projects"), countsBefore.projects, "projects count unchanged by down");
    eq(countRows(copyPath, "checks"), countsBefore.checks, "checks count unchanged by down");
    eq(countRows(copyPath, "saved_projects"), countsBefore.saved, "saved_projects count unchanged by down");
    // Bukti down benar-benar melemahkan CHECK: '!' kini lolos.
    const r = insertSolana(db, "B58-down-probe", "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pum!", 300);
    assert(r.ok, `after down, '!' address must insert again (err=${r.error ?? ""})`);
  } finally {
    db.close();
  }
});

for (const t of tests) {
  try {
    await t.run();
    pass++;
    console.log(`PASS ${t.id} ${t.name}`);
  } catch (err) {
    fail++;
    failures.push(t.id);
    console.log(`FAIL ${t.id} ${t.name} — ${err instanceof Error ? err.message : String(err)}`);
  }
}
tdb.close();
console.log(`\nH-B58: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
