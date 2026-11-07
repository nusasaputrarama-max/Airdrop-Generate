// verify-evidence-manifest.mjs — manifest checker for AG-001 evidence bundles.
//
// Usage:
//   node scripts/verify-evidence-manifest.mjs <evidence-dir>
//   (manifest file is <evidence-dir>/MANIFEST.md; exit 0 = all checks pass,
//    exit 1 = one or more checks fail)
//
// What it checks, per evidence file listed in the manifest inventory table:
//   1. the file exists in the evidence directory;
//   2. SHA-256 matches the manifest table;
//   3. byte size matches the manifest table (where the table has a size);
//   4. where the file carries a run header (=== SUITE ... (RUN=n) ===) and a
//      summary (=== HASIL RUN=n: ... ===), header run == summary run ==
//      the run number claimed in the manifest table AND implied by the
//      filename (…-runN.txt);
//   5. uniqueness: two files that claim DIFFERENT runs must not share a
//      SHA-256 (a duplicate hash under different run labels fails);
//   6. files with no run discriminator in their content (no RUN header and
//      no RUN summary) cannot prove distinct runs from the artifacts alone
//      and are reported NOT-INDEPENDENT (warn); where two such files also
//      share a hash under different claimed runs, rule 5 fails them.
//
// The checker never edits evidence. It only reads. A FAIL here does not
// prove a test was never run; it proves the committed artifacts do not
// independently establish the claimed run count. See F-010
// (SSRF_INDEPENDENT_AUDIT_V3.md §5) and the corrected
// evidence/v236/MANIFEST.md.
//
// Manifest table shapes supported (header-driven parsing): the v236 table
// (File | Test ID | Run | Timestamp | Size | SHA-256 | Result) and the
// v236-supplement table (File | Test ID | Run | Timestamp | Command | Exit
// | Result | SHA-256). The Run cell may be "1" or "supp-1" — the trailing
// integer is the run number.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/verify-evidence-manifest.mjs <evidence-dir>");
  process.exit(2);
}
const manifestPath = path.join(dir, "MANIFEST.md");

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

let failures = 0;
let warnings = 0;
function fail(msg) {
  failures++;
  console.log(`FAIL  ${msg}`);
}
function ok(msg) {
  console.log(`ok    ${msg}`);
}
function info(msg) {
  console.log(`info  ${msg}`);
}
function warn(msg) {
  warnings++;
  console.log(`WARN  ${msg}`);
}

const manifestText = await readFile(manifestPath, "utf8");

// Header-driven parsing of the inventory table.
const rows = [];
const lines = manifestText.split("\n");
let colFile = -1, colTest = -1, colRun = -1, colSize = -1, colSha = -1;
for (const line of lines) {
  if (!line.trim().startsWith("|")) continue;
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.length < 2) continue;
  if (/^[\s:-]+$/.test(cells.join(""))) continue; // separator row
  const isHeader = /sha[- ]?256/i.test(cells.join(" "));
  if (isHeader && colFile < 0) {
    colFile = cells.findIndex((c) => /^file$/i.test(c.replace(/`/g, "")));
    colTest = cells.findIndex((c) => /test/i.test(c));
    colRun = cells.findIndex((c) => /^run$/i.test(c));
    colSize = cells.findIndex((c) => /ukuran|size/i.test(c));
    colSha = cells.findIndex((c) => /sha[- ]?256/i.test(c));
    continue;
  }
  if (colFile < 0 || colRun < 0 || colSha < 0) continue;
  const fileCell = cells[colFile] || "";
  const fileMatch = fileCell.match(/`([^`]+\.txt)`/);
  if (!fileMatch) continue;
  const file = fileMatch[1];
  const runRaw = cells[colRun] || "";
  const runMatch = runRaw.match(/(\d+)\s*$/);
  const run = runMatch ? parseInt(runMatch[1], 10) : NaN;
  const sizeRaw = colSize >= 0 ? cells[colSize] || "" : "";
  const size = sizeRaw ? parseInt(sizeRaw.replace(/[^\d]/g, ""), 10) : NaN;
  const sha = (cells[colSha] || "").replace(/`/g, "").trim().toLowerCase();
  if (!file || Number.isNaN(run) || !/^[0-9a-f]{64}$/.test(sha)) {
    warn(`manifest row skipped (unparsable): ${line.trim().slice(0, 120)}`);
    continue;
  }
  rows.push({ file, testId: colTest >= 0 ? (cells[colTest] || "").replace(/`/g, "") : "", run, size, sha });
}

console.log(`manifest: ${manifestPath}`);
console.log(`entries : ${rows.length}`);
console.log("");

const seen = new Map(); // sha -> [rows]
const onDisk = new Set(await readdir(dir));

for (const row of rows) {
  const label = `${row.file} (claimed run ${row.run}, ${row.testId})`;
  if (!onDisk.has(row.file)) {
    fail(`${label}: file missing from ${dir}`);
    continue;
  }
  const buf = await readFile(path.join(dir, row.file));
  const actualSha = sha256(buf);
  const actualSize = buf.length;
  if (actualSha !== row.sha) fail(`${label}: SHA-256 mismatch (manifest ${row.sha.slice(0, 12)}… vs actual ${actualSha.slice(0, 12)}…)`);
  else ok(`${label}: SHA-256 matches manifest`);
  if (!Number.isNaN(row.size)) {
    if (actualSize !== row.size) fail(`${label}: size mismatch (manifest ${row.size} B vs actual ${actualSize} B)`);
    else ok(`${label}: size ${actualSize} B matches manifest`);
  } else {
    info(`${label}: size ${actualSize} B (no size column in this manifest)`);
  }

  // Run-number checks from content.
  const text = buf.toString("utf8");
  const headerRuns = [...text.matchAll(/\(RUN=(\d+)\)/g)].map((m) => parseInt(m[1], 10));
  const summaryRuns = [...text.matchAll(/HASIL RUN=(\d+):/g)].map((m) => parseInt(m[1], 10));
  const fileRunMatch = row.file.match(/-run(\d+)\.txt$/);
  const fileRun = fileRunMatch ? parseInt(fileRunMatch[1], 10) : null;

  if (headerRuns.length === 0 && summaryRuns.length === 0) {
    // No run discriminator in content: the artifacts alone cannot prove
    // this file is a different run from another file with the same content.
    warn(`${label}: no RUN header/summary in content — run number not independently provable from this file`);
  } else {
    const headerRun = headerRuns.length ? headerRuns[0] : null;
    const summaryRun = summaryRuns.length ? summaryRuns[0] : null;
    if (headerRun === null) {
      fail(`${label}: no RUN header in content but manifest claims run ${row.run}`);
    } else if (headerRun !== row.run) {
      fail(`${label}: header RUN=${headerRun} but manifest claims run ${row.run}`);
    } else {
      ok(`${label}: header RUN=${headerRun} matches manifest run`);
    }
    if (summaryRun !== null && summaryRun !== row.run)
      fail(`${label}: summary RUN=${summaryRun} but manifest claims run ${row.run}`);
    else if (summaryRun !== null) ok(`${label}: summary RUN=${summaryRun} matches manifest run`);
    if (fileRun !== null && headerRun !== null && headerRun !== fileRun)
      fail(`${label}: header RUN=${headerRun} but filename implies run ${fileRun}`);
    else if (fileRun !== null && headerRun !== null) ok(`${label}: header RUN matches filename run ${fileRun}`);
    if (text.trim().split("\n").length <= 2)
      fail(`${label}: only ${text.trim().split("\n").length} line(s) — partial log, not a complete run output`);
  }

  if (!seen.has(actualSha)) seen.set(actualSha, []);
  seen.get(actualSha).push(row);
}

console.log("");
console.log("--- uniqueness (distinct claimed runs must have distinct hashes) ---");
for (const [hash, group] of seen) {
  const distinctRuns = new Set(group.map((r) => `${r.testId}#${r.run}`));
  if (group.length > 1 && distinctRuns.size > 1) {
    fail(
      `duplicate SHA-256 ${hash.slice(0, 16)}… shared by ${group.map((r) => `${r.file} (run ${r.run})`).join(", ")} — NOT independent evidence for distinct runs`
    );
  } else if (group.length > 1) {
    info(`same SHA-256 shared by ${group.map((r) => r.file).join(", ")} (same claimed run — duplicate copy, not distinct evidence)`);
  }
}

// Files on disk not listed in the manifest (excluding this checker's own
// output files and the manifest itself).
for (const f of [...onDisk].sort()) {
  if (f.endsWith(".txt") && !f.startsWith("VERIFY-") && !rows.some((r) => r.file === f)) {
    warn(`on-disk file not listed in manifest: ${f}`);
  }
}

console.log("");
console.log(`RESULT: ${failures} failure(s), ${warnings} warning(s), ${rows.length} manifest entries checked`);
process.exit(failures > 0 ? 1 : 0);
