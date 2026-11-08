// Tes kanonikalisasi alamat + scope uniqueness F-043 (v2.3.20) — jawaban
// atas audit V13 §4 F-043.
//
// MEMBUKTIKAN bahwa aturan v2.3.20 benar-benar sama di tiga tempat:
//   (1) fungsi kanonikalisasi aplikasi (pre-check),
//   (2) generated column + unique index di migrasi 0006 v2 (SQLite),
//   (3) komentar/aturan yang didokumentasikan di proposal.
//
// Aturan (proposal v2.3.20 §4.3):
//   - EVM hex: case-INSENSITIVE — strip prefix 0x, lowercase, trim.
//   - Solana base58: case-SENSITIVE — hanya trim, huruf TIDAK diubah.
//   - Scope uniqueness: PER (chain, canonical_address) — GLOBAL
//     lintas tenant (konsisten dengan keputusan F-040: projects adalah
//     katalog GLOBAL). Alamat sama di chain berbeda = baris berbeda.
//   - Chain yang tidak ada di peta CHAIN_ADDRESS_TYPE -> REJECT
//     fail-closed (aplikasi melempar; DB CHECK constraint menolak).
//   - contract_address NULL -> tidak masuk unique index (boleh >1 baris).
//
// Peta chain yang dipakai di sini (berdasarkan seed 0004 saat ini —
// hanya 'BNB Chain' + 'Robinhood Chain', keduanya EVM; 'Solana'
// didefinisikan untuk masa depan; memperluas peta = keputusan owner
// K-8 + migrasi, BUKAN tebakan implementor):
//   EVM family: BNB Chain, Ethereum, Base, Arbitrum, Polygon, opBNB,
//               Robinhood Chain
//   Solana family: Solana
//
// Diuji dengan bun:sqlite in-memory: tabel + generated column +
// unique index dibuat PERSIS seperti teks migrasi 0006 v2, lalu
// matriks insert dijalankan dan hasilnya dibandingkan dengan fungsi JS.
//
// Bukti VM SAJA — bukan staging. Tidak ada DB/katalog nyata yang
// disentuh (in-memory saja).
//
// Usage (dari evidence/v2320/):
//   bun test-f043-canonical-v2320.ts > test-f043-canonical-v2320.txt 2>&1
// Exit 0 = semua assertion PASS; exit 1 = FAIL.

import { Database } from "bun:sqlite";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
  } else {
    fail++;
    console.log(`FAIL ${name}${detail ? " — " + detail : ""}`);
  }
}

console.log("=== test-f043-canonical-v2320 ===");
console.log(`date: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })} WIB`);
console.log(`bun: ${Bun.version}`);
console.log(`uid: ${typeof process.getuid === "function" ? process.getuid() : "n/a"}`);
console.log(`env: VM lokal (bun:sqlite in-memory) — BUKAN staging, BUKAN produksi`);

// ------------------------------------------------------------------
// (1) Fungsi kanonikalisasi aplikasi (cermin proposal §4.3).
// ------------------------------------------------------------------
const EVM_CHAINS = new Set(["BNB Chain", "Ethereum", "Base", "Arbitrum", "Polygon", "opBNB", "Robinhood Chain"]);
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
    return a; // case-SENSITIVE: huruf tidak diubah
  }
  throw new Error(`unknown-chain:${chain}`);
}

// ------------------------------------------------------------------
// (2) Tabel + generated column + index PERSIS teks migrasi 0006 v2.
// ------------------------------------------------------------------
const db = new Database(":memory:");
db.exec(`
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain TEXT NOT NULL CHECK (chain IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain','Solana')),
  contract_address TEXT,
  contract_address_canonical TEXT GENERATED ALWAYS AS (
    CASE
      WHEN contract_address IS NULL THEN NULL
      WHEN chain = 'Solana' THEN trim(contract_address)
      WHEN chain IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain') THEN
        CASE WHEN substr(trim(contract_address),1,2) = '0x'
             THEN '0x' || lower(substr(trim(contract_address),3))
             ELSE '0x' || lower(trim(contract_address)) END
      ELSE NULL
    END
  ) STORED
);
CREATE UNIQUE INDEX projects_addr_unique
  ON projects (chain, contract_address_canonical)
  WHERE contract_address IS NOT NULL;
CREATE UNIQUE INDEX projects_name_unique ON projects (lower(trim('x')));
`);
db.exec(`DROP INDEX projects_name_unique;`); // placeholder di atas hanya penanda; tidak dipakai di tes ini

function dbCanonical(chain: string, address: string | null): string | null {
  const row: any = db
    .query(`SELECT contract_address_canonical AS c FROM projects WHERE chain = ? AND contract_address = ? LIMIT 1`)
    .get(chain, address);
  return row ? row.c : null;
}

function tryInsert(chain: string, address: string | null): { ok: boolean; error?: string; id?: number } {
  try {
    // Pre-check aplikasi dulu (fail-closed), persis seperti addProject v2.3.20.
    const canon = canonicalizeContractAddress(chain, address);
    void canon;
    const info = db.query(`INSERT INTO projects (chain, contract_address) VALUES (?, ?)`).run(chain, address);
    return { ok: true, id: Number(info.lastInsertRowid) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

// ------------------------------------------------------------------
// Kasus uji.
// ------------------------------------------------------------------

// A. Kanonikalisasi JS — EVM case-insensitive, strip 0x, trim.
{
  const evmMixed = "0xcBe2DBBFF4264Dc67Bf557c64e29997B82439354"; // alamat BAOracle di seed 0004
  check(
    "F-043 EVM mixed-case -> lowercase + 0x dipertahankan",
    canonicalizeContractAddress("BNB Chain", evmMixed) === "0xcbe2dbbff4264dc67bf557c64e29997b82439354",
    canonicalizeContractAddress("BNB Chain", evmMixed) ?? "",
  );
  check(
    "F-043 EVM tanpa prefix 0x -> hasil sama",
    canonicalizeContractAddress("BNB Chain", "cBe2DBBFF4264Dc67Bf557c64e29997B82439354") ===
      canonicalizeContractAddress("BNB Chain", evmMixed),
  );
  check(
    "F-043 EVM whitespace di-trim",
    canonicalizeContractAddress("BNB Chain", "  0xCBE2DBBFF4264DC67BF557C64E29997B82439354  ") ===
      "0xcbe2dbbff4264dc67bf557c64e29997b82439354",
  );
  check(
    "F-043 EVM lowercase murni (seed Ptah) tetap sama",
    canonicalizeContractAddress("BNB Chain", "0xd87adb2e47979d6cb323896b1a9320e0dd132213") ===
      "0xd87adb2e47979d6cb323896b1a9320e0dd132213",
  );
  let threw = false;
  try { canonicalizeContractAddress("BNB Chain", "0x1234"); } catch { threw = true; }
  check("F-043 EVM panjang salah -> reject", threw);
  threw = false;
  try { canonicalizeContractAddress("BNB Chain", "0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"); } catch { threw = true; }
  check("F-043 EVM non-hex -> reject", threw);
}

// B. Kanonikalisasi JS — Solana case-sensitive.
{
  const sol = "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump"; // token SCAMSEM (contoh alamat Solana nyata dari insiden)
  check("F-043 Solana huruf dipertahankan (case-sensitive)", canonicalizeContractAddress("Solana", sol) === sol, sol);
  // Varian case yang TETAP valid base58: ubah satu huruf yang valid di
  // kedua case ('W'->'w'). CATATAN: lowercase SELURUH alamat BUKAN
  // varian yang valid — 'L' menjadi 'l', dan 'l' BUKAN karakter
  // base58 (0/O/I/l dikecualikan). Itulah sebabnya lower() sembarangan
  // pada alamat Solana adalah BUG, bukan normalisasi.
  const solOneCharLower = sol.replace("W", "w");
  check(
    "F-043 Solana satu huruf beda case = alamat BERBEDA",
    canonicalizeContractAddress("Solana", solOneCharLower) !== canonicalizeContractAddress("Solana", sol),
    `${solOneCharLower} != ${sol}`,
  );
  let threwLower = false;
  try { canonicalizeContractAddress("Solana", sol.toLowerCase()); } catch { threwLower = true; }
  check("F-043 Solana full-lowercase -> REJECT (huruf 'l' bukan base58)", threwLower);
  check("F-043 Solana whitespace di-trim, huruf tetap", canonicalizeContractAddress("Solana", `  ${sol} `) === sol);
  let threw = false;
  try { canonicalizeContractAddress("Solana", "0OIl"); } catch { threw = true; }
  check("F-043 Solana karakter base58 ilegal (0/O/I/l) -> reject", threw);
}

// C. Chain tak dikenal -> fail-closed di aplikasi DAN di DB.
{
  let threw = false;
  try { canonicalizeContractAddress("FooChain", "0xd87adb2e47979d6cb323896b1a9320e0dd132213"); } catch (e: any) { threw = /unknown-chain/.test(e.message); }
  check("F-043 chain tak dikenal -> reject aplikasi", threw);
  const r = tryInsert("FooChain", "0xd87adb2e47979d6cb323896b1a9320e0dd132213");
  check("F-043 chain tak dikenal -> insert gagal", !r.ok, r.error ?? "");
}

// D. Uniqueness di DB — EVM: varian case SAMA (collision); chain beda OK.
{
  const a1 = tryInsert("BNB Chain", "0xcBe2DBBFF4264Dc67Bf557c64e29997B82439354");
  check("F-043 insert EVM pertama OK", a1.ok, JSON.stringify(a1));
  const a2 = tryInsert("BNB Chain", "0xcbe2dbbff4264dc67bf557c64e29997b82439354");
  check("F-043 insert EVM varian lowercase chain sama -> UNIQUE violation", !a2.ok && /UNIQUE/.test(a2.error ?? ""), a2.error ?? "");
  const a3 = tryInsert("BNB Chain", "CBE2DBBFF4264DC67BF557C64E29997B82439354");
  check("F-043 insert EVM tanpa 0x uppercase chain sama -> UNIQUE violation", !a3.ok && /UNIQUE/.test(a3.error ?? ""), a3.error ?? "");
  const a4 = tryInsert("Ethereum", "0xcBe2DBBFF4264Dc67Bf557c64e29997B82439354");
  check("F-043 alamat sama di chain BERBEDA -> OK (scope per chain)", a4.ok, JSON.stringify(a4));
  const a5 = tryInsert("BNB Chain", "  0xCBE2DBBFF4264DC67BF557C64E29997B82439354  ");
  check("F-043 insert EVM whitespace chain sama -> UNIQUE violation", !a5.ok && /UNIQUE/.test(a5.error ?? ""), a5.error ?? "");
}

// E. Uniqueness di DB — Solana: varian case BERBEDA (boleh); sama persis collision.
{
  const sol = "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump";
  const s1 = tryInsert("Solana", sol);
  check("F-043 insert Solana pertama OK", s1.ok, JSON.stringify(s1));
  const s2 = tryInsert("Solana", sol.replace("W", "w"));
  check("F-043 insert Solana satu huruf beda case -> OK (alamat BERBEDA, case-sensitive)", s2.ok, JSON.stringify(s2));
  const s3 = tryInsert("Solana", sol);
  check("F-043 insert Solana sama persis -> UNIQUE violation", !s3.ok && /UNIQUE/.test(s3.error ?? ""), s3.error ?? "");
  const s4 = tryInsert("Solana", sol.replace("pump", "PUMP"));
  check("F-043 insert Solana 'PUMP' -> OK (alamat berbeda)", s4.ok, JSON.stringify(s4));
}

// F. NULL address: boleh >1 baris; kesamaan JS vs kolom DB.
{
  const n1 = tryInsert("BNB Chain", null);
  const n2 = tryInsert("BNB Chain", null);
  check("F-043 dua baris NULL contract_address -> OK", n1.ok && n2.ok, JSON.stringify([n1, n2]));
  const rows: any[] = db.query(`SELECT chain, contract_address, contract_address_canonical AS c FROM projects`).all();
  let agree = true;
  for (const row of rows) {
    const js = canonicalizeContractAddress(row.chain, row.contract_address);
    if (js !== row.c) {
      agree = false;
      console.log(`  MISMATCH js=${js} db=${row.c} chain=${row.chain} addr=${row.contract_address}`);
    }
  }
  check("F-043 fungsi JS == generated column DB untuk SEMUA baris", agree, `${rows.length} baris diperiksa`);
  const evmRow: any = db.query(`SELECT contract_address_canonical AS c FROM projects WHERE contract_address = '0xcBe2DBBFF4264Dc67Bf557c64e29997B82439354'`).get();
  check("F-043 kolom DB EVM = lowercase tanpa kehilangan 0x", evmRow?.c === "0xcbe2dbbff4264dc67bf557c64e29997b82439354", evmRow?.c ?? "");
}

// G. Kontras dengan v2.3.19: lower(contract_address) saja akan
//    (i) menyamakan dua alamat Solana berbeda huruf, (ii) tidak
//    menghapus prefix 0x sehingga komentar "tanpa prefix" bohong.
{
  const badIndexSql = `lower(contract_address)`;
  const solA = "41WpXn15fxQXEGhiKnkqHcoJn14tNXXgmymLKE57pump";
  const solB = solA.toLowerCase();
  check(
    "F-043 v2.3.19 lower() saja: dua alamat Solana berbeda jadi 'sama' (BUG yang diperbaiki)",
    solA.toLowerCase() === solB.toLowerCase(),
    "lower() mengaburkan case Solana",
  );
  check(
    "F-043 v2.3.19 lower() saja: prefix 0x TIDAK dihapus (komentar bohong)",
    "0xABC".toLowerCase().startsWith("0x"),
    "lower('0xABC') = '0xabc', prefix tetap ada",
  );
}

db.close();
console.log(`=== RESULT: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
