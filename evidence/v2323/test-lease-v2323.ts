// test-lease-v2323.ts — Harness 2 (H-LEASE-xx): scan leases + rate limits
// untuk revisi desain v2.3.23 (F-003c, D-06).
//
// Setup ASLI (bukan mock): salin site/drizzle ASLI ke temp space dir,
// jalankan migrator CLI NYATA (bun /opt/hatch/skills/spaces/ts-runtime/
// dist/migrate.js) ke DB disposable di /tmp, buat drizzle libsql DB nyata
// (drizzle-orm/libsql dari site/node_modules) atas DB itu, lalu import
// acquireScanSlot/releaseScanSlot/checkRateLimit ASLI dari
// site/server/src/scan-limits.ts. TANPA request jaringan apa pun.
//
// Usage (dari root worktree /home/hatch/workspace/airdrop-generate-dev):
//   bun evidence/v2323/test-lease-v2323.ts
// Exit 0 = semua PASS; exit 1 = ada FAIL. Semua skenario waktu memakai
// `now` yang diinjeksikan — TIDAK ada waktu-tunggu nyata.
//
// BUKTI VM SAJA — bukan staging, bukan produksi. DB live TIDAK disentuh.

import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "../../site/node_modules/drizzle-orm/index.js";
import { drizzle } from "../../site/node_modules/drizzle-orm/libsql/index.js";
import { createClient } from "../../site/node_modules/@libsql/client/lib-esm/node.js";
import {
  acquireScanSlot,
  releaseScanSlot,
  checkRateLimit,
  MAX_SCAN_CONCURRENCY,
  SCAN_LEASE_TTL_MS,
  RATE_LIMIT_PER_MINUTE,
  RATE_LIMIT_PER_HOUR,
  ANONYMOUS_RATE_BUCKET,
} from "../../site/server/src/scan-limits";

// ---------------------------------------------------------------------------
// Mini framework
// ---------------------------------------------------------------------------
let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`assert gagal: ${msg}`);
}

async function test(id: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    pass++;
    console.log(`PASS ${id}`);
  } catch (e) {
    fail++;
    const m = e instanceof Error ? e.message : String(e);
    failures.push(id);
    console.log(`FAIL ${id} — ${m}`);
  }
}

process.on("unhandledRejection", (e) => {
  console.log(`FAIL unhandledRejection — ${e instanceof Error ? e.message : String(e)}`);
  fail++;
  finish();
});

function finish(): never {
  console.log(`\n==== RINGKASAN test-lease-v2323: PASS ${pass} / FAIL ${fail} ====`);
  if (failures.length > 0) console.log(`Gagal: ${failures.join(", ")}`);
  process.exit(fail === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Setup: salin drizzle asli, migrator CLI nyata, DB disposable
// ---------------------------------------------------------------------------
const HERE = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(HERE, "..", "..");
const MIGRATOR = "/opt/hatch/skills/spaces/ts-runtime/dist/migrate.js";

const tmpRoot = mkdtempSync(join(tmpdir(), "v2323-lease-"));
const spaceDir = join(tmpRoot, "space");
const dbPath = join(tmpRoot, "lease.db");
cpSync(join(WORKTREE, "site", "drizzle"), join(spaceDir, "drizzle"), { recursive: true });
console.log(`setup: tmpRoot=${tmpRoot}`);
console.log(`setup: spaceDir=${spaceDir} dbPath=${dbPath}`);

const mig = Bun.spawnSync(["bun", MIGRATOR, `--space-dir=${spaceDir}`, `--db-path=${dbPath}`], {
  stdout: "pipe",
  stderr: "pipe",
});
const migOut = mig.stdout.toString().trim();
const migErr = mig.stderr.toString().trim();
console.log(`setup: migrator exit=${mig.exitCode} out=${migOut} err=${migErr}`);

const client = createClient({ url: `file:${dbPath}` });
const db: any = drizzle(client, {});
const sqlVer = (await db.run(sql`SELECT sqlite_version() AS v`)).rows[0]?.v;
console.log(`setup: sqlite_version=${sqlVer}`);

// Basis waktu T0: sejajar menit DAN jam (1.800.000.000.000 % 60.000 == 0,
// % 3.600.000 == 0) agar window menit/jam dapat dihitung deterministik.
const T0 = 1_800_000_000_000;
const HOUR = 3_600_000;

// ---------------------------------------------------------------------------
// Helpers query
// ---------------------------------------------------------------------------
async function leaseCount(): Promise<number> {
  const r = await db.run(sql`SELECT COUNT(*) AS n FROM scan_leases`);
  return (r.rows[0] as { n: number }).n;
}
async function leaseRows(): Promise<Array<{ id: number; principal_id: string; acquired_at: number; expires_at: number }>> {
  const r = await db.run(sql`SELECT id, principal_id, acquired_at, expires_at FROM scan_leases ORDER BY id`);
  return r.rows as Array<{ id: number; principal_id: string; acquired_at: number; expires_at: number }>;
}

// ===========================================================================
// H-LEASE-00 — Setup: migrator nyata + skema hasil migrasi
// ===========================================================================
await test("H-LEASE-00", async () => {
  ok(mig.exitCode === 0, `migrator exit ${mig.exitCode} (err: ${migErr})`);
  const tables = (await db.run(sql`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)).rows.map(
    (r: any) => r.name,
  ) as string[];
  ok(tables.includes("scan_leases"), `tabel scan_leases hilang: ${tables.join(",")}`);
  ok(tables.includes("rate_limits"), `tabel rate_limits hilang: ${tables.join(",")}`);
  const migRows = (await db.run(sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`)).rows[0] as { n: number };
  ok(migRows.n === 7, `__drizzle_migrations ${migRows.n} != 7 (0001..0007)`);
  const journal = JSON.parse(readFileSync(join(spaceDir, "drizzle", "meta", "_journal.json"), "utf-8"));
  ok(journal.entries.length === 7, `journal entries ${journal.entries.length} != 7`);
  ok(journal.entries[6].tag === "0007_scan_leases_and_rate_limits", `journal idx 6 tag ${journal.entries[6].tag}`);
  const ddl = (await db.run(sql`SELECT sql FROM sqlite_master WHERE name='scan_leases'`)).rows[0] as { sql: string };
  ok(ddl.sql.includes("expires_at"), "DDL scan_leases tanpa expires_at");
  console.log(`  migrator ok, tabel: ${tables.join(", ")}, sqlite ${sqlVer}`);
});

// ===========================================================================
// H-LEASE-01 — Lease acquire/release
// ===========================================================================
await test("H-LEASE-01", async () => {
  ok(MAX_SCAN_CONCURRENCY === 5, `MAX_SCAN_CONCURRENCY ${MAX_SCAN_CONCURRENCY} != 5`);
  ok(SCAN_LEASE_TTL_MS === 25_000, `SCAN_LEASE_TTL_MS ${SCAN_LEASE_TTL_MS} != 25000`);
  const now = T0;
  const r1 = await acquireScanSlot(db, "lease-user-1", now);
  const countAfterAcquire = await leaseCount();
  const rowsAfterAcquire = await leaseRows();
  console.log(`  acquire#1 -> ${JSON.stringify(r1)}, COUNT(*)=${countAfterAcquire}, rows=${JSON.stringify(rowsAfterAcquire)}`);
  // Bukti diagnostik: releaseScanSlot dengan id dari DB (bila acquire
  // mengembalikan leaseId) atau dari baris yang ter-insert.
  if (r1.acquired) {
    ok(typeof r1.leaseId === "number", `leaseId bukan number: ${JSON.stringify(r1)}`);
    await releaseScanSlot(db, r1.leaseId);
    ok((await leaseCount()) === 0, "baris lease tidak hilang setelah release");
    const r2 = await acquireScanSlot(db, "lease-user-1", now);
    ok(r2.acquired === true, `acquire ulang harus ok, dapat ${JSON.stringify(r2)}`);
    ok(typeof (r2 as any).leaseId === "number", "acquire ulang tanpa leaseId number");
    // Bersihkan agar test berikut terisolasi.
    await releaseScanSlot(db, (r2 as any).leaseId);
    ok((await leaseCount()) === 0, "lease sisa setelah cleanup H-LEASE-01");
  }
  // Assert utama (dijalankan setelah diagnostik agar log lengkap).
  ok(r1.acquired === true, `acquire#1 harus {acquired:true}, dapat ${JSON.stringify(r1)} (COUNT(*)=${countAfterAcquire})`);
});

// ===========================================================================
// H-LEASE-02 — Max 5 global
// ===========================================================================
await test("H-LEASE-02", async () => {
  const now = T0 + HOUR; // basis baru: lease test-01 sudah kedaluwarsa
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(await acquireScanSlot(db, `lease-user-2-${i}`, now));
  }
  const count5 = await leaseCount();
  console.log(`  acquire 5x -> ${JSON.stringify(results)}, COUNT(*)=${count5}`);
  const r6 = await acquireScanSlot(db, "lease-user-2-5", now);
  console.log(`  acquire ke-6 -> ${JSON.stringify(r6)}, COUNT(*)=${await leaseCount()}`);
  const rows = await leaseRows();
  // Release 1 (pakai id baris pertama dari DB) lalu acquire lagi.
  let rAfterRelease: unknown = null;
  let countAfterRelease = -1;
  if (rows.length > 0) {
    await releaseScanSlot(db, rows[0]!.id);
    countAfterRelease = await leaseCount();
    rAfterRelease = await acquireScanSlot(db, "lease-user-2-6", now);
    console.log(`  release id=${rows[0]!.id} -> COUNT(*)=${countAfterRelease}, acquire lagi -> ${JSON.stringify(rAfterRelease)}`);
    // Bersihkan semua lease sisa.
    for (const row of await leaseRows()) await releaseScanSlot(db, row.id);
    ok((await leaseCount()) === 0, "lease sisa setelah cleanup H-LEASE-02");
  }
  ok(results.every((r) => r.acquired === true), `5 acquire pertama harus semua ok: ${JSON.stringify(results)}`);
  ok(count5 === 5, `COUNT(*) setelah 5 acquire ${count5} != 5`);
  ok(r6.acquired === false && (r6 as any).reason === "concurrency-limit", `acquire ke-6 harus concurrency-limit, dapat ${JSON.stringify(r6)}`);
  ok(countAfterRelease === 4, `COUNT(*) setelah release 1 harus 4, dapat ${countAfterRelease}`);
  ok((rAfterRelease as any)?.acquired === true, `acquire setelah release harus ok, dapat ${JSON.stringify(rAfterRelease)}`);
});

// ===========================================================================
// H-LEASE-03 — TTL expiry (25 detik)
// ===========================================================================
await test("H-LEASE-03", async () => {
  const T = T0 + 2 * HOUR;
  const r1 = await acquireScanSlot(db, "lease-user-3", T);
  const count1 = await leaseCount();
  const r2 = await acquireScanSlot(db, "lease-user-3", T + 26_000); // melewati TTL 25 dtk
  const count2 = await leaseCount();
  const rows2 = await leaseRows();
  console.log(`  acquire T -> ${JSON.stringify(r1)} COUNT(*)=${count1}`);
  console.log(`  acquire T+26000 -> ${JSON.stringify(r2)} COUNT(*)=${count2} rows=${JSON.stringify(rows2)}`);
  // Bersihkan.
  for (const row of rows2) await releaseScanSlot(db, row.id);
  ok((await leaseCount()) === 0, "lease sisa setelah cleanup H-LEASE-03");
  ok(r1.acquired === true, `acquire T harus ok, dapat ${JSON.stringify(r1)}`);
  ok(r2.acquired === true, `acquire T+26000 harus ok (lease lama kedaluwarsa), dapat ${JSON.stringify(r2)}`);
  ok(count2 === 1, `live lease setelah cleanup TTL harus 1, dapat ${count2}`);
  ok(rows2.length === 1 && rows2[0]!.expires_at === T + 26_000 + SCAN_LEASE_TTL_MS, `lease hidup harus expires_at T+51000, dapat ${JSON.stringify(rows2)}`);
});

// ===========================================================================
// H-LEASE-04 — Rate limit 10/menit
// ===========================================================================
await test("H-LEASE-04", async () => {
  ok(RATE_LIMIT_PER_MINUTE === 10, `RATE_LIMIT_PER_MINUTE ${RATE_LIMIT_PER_MINUTE} != 10`);
  const now = T0 + 3 * HOUR;
  const results = [];
  for (let i = 0; i < 10; i++) results.push(await checkRateLimit(db, "rl-min-user", now));
  ok(results.every((r) => r.allowed === true), `10 check pertama harus allowed: ${JSON.stringify(results)}`);
  const r11 = await checkRateLimit(db, "rl-min-user", now);
  ok(r11.allowed === false && (r11 as any).reason === "rate-limit-minute", `check ke-11 harus rate-limit-minute, dapat ${JSON.stringify(r11)}`);
  const other = await checkRateLimit(db, "rl-min-other", now);
  ok(other.allowed === true, `principal lain harus tidak terpengaruh, dapat ${JSON.stringify(other)}`);
  const nextWindow = await checkRateLimit(db, "rl-min-user", now + 61_000);
  ok(nextWindow.allowed === true, `window baru (now+61 dtk) harus allowed, dapat ${JSON.stringify(nextWindow)}`);
  console.log(`  10x allowed, ke-11 rate-limit-minute, principal lain allowed, window baru allowed`);
});

// ===========================================================================
// H-LEASE-05 — Rate limit 100/jam (10 per menit x 10 menit, tanpa
// memicu batas menit; `now` diinjeksikan — tanpa menunggu waktu nyata)
// ===========================================================================
await test("H-LEASE-05", async () => {
  ok(RATE_LIMIT_PER_HOUR === 100, `RATE_LIMIT_PER_HOUR ${RATE_LIMIT_PER_HOUR} != 100`);
  const hourStart = T0 + 4 * HOUR; // sejajar jam
  const principal = "rl-hour-user";
  let deniedEarly: unknown = null;
  for (let m = 0; m < 10; m++) {
    for (let k = 0; k < 10; k++) {
      const r = await checkRateLimit(db, principal, hourStart + m * 60_000);
      if (!r.allowed && !deniedEarly) deniedEarly = { m, k, r };
    }
  }
  ok(deniedEarly === null, `panggilan 1..100 tidak boleh ditolak: ${JSON.stringify(deniedEarly)}`);
  const hourRow = (await db.run(
    sql`SELECT count FROM rate_limits WHERE principal_id = ${principal} AND window = 'hour'`,
  )).rows[0] as { count: number } | undefined;
  ok(hourRow?.count === 100, `counter jam harus 100, dapat ${JSON.stringify(hourRow)}`);
  // Panggilan ke-101 dalam jam yang sama, di window menit BARU (menit ke-10)
  // agar batas menit tidak memicu duluan.
  const r101 = await checkRateLimit(db, principal, hourStart + 10 * 60_000);
  ok(r101.allowed === false && (r101 as any).reason === "rate-limit-hour", `panggilan ke-101 harus rate-limit-hour, dapat ${JSON.stringify(r101)}`);
  console.log(`  100x allowed (10/menit x 10 menit), counter jam=100, ke-101 rate-limit-hour`);
});

// ===========================================================================
// H-LEASE-06 — Anonymous bucket
// ===========================================================================
await test("H-LEASE-06", async () => {
  ok(ANONYMOUS_RATE_BUCKET === "<ANONYMOUS>", `ANONYMOUS_RATE_BUCKET ${ANONYMOUS_RATE_BUCKET}`);
  const now = T0 + 5 * HOUR;
  const results = [];
  for (let i = 0; i < 10; i++) results.push(await checkRateLimit(db, "", now));
  ok(results.every((r) => r.allowed === true), `10x "" harus allowed: ${JSON.stringify(results)}`);
  // Panggilan ke-11 dengan ejaan lain dari bucket yang sama.
  const r11 = await checkRateLimit(db, "<ANONYMOUS>", now);
  ok(r11.allowed === false && (r11 as any).reason === "rate-limit-minute", `ke-11 sebagai "<ANONYMOUS>" harus rate-limit-minute (satu bucket), dapat ${JSON.stringify(r11)}`);
  const anonRow = (await db.run(
    sql`SELECT count FROM rate_limits WHERE principal_id = ${ANONYMOUS_RATE_BUCKET} AND window = 'minute' AND window_start = ${now}`,
  )).rows[0] as { count: number } | undefined;
  ok(anonRow?.count === 11, `counter bucket anonim menit harus 11 (10x "" + 1x "<ANONYMOUS>"), dapat ${JSON.stringify(anonRow)}`);
  // Dua string kosong tetap satu bucket — tidak ada baris principal "" terpisah.
  const emptyRows = (await db.run(sql`SELECT COUNT(*) AS n FROM rate_limits WHERE principal_id = ''`)).rows[0] as { n: number };
  ok(emptyRows.n === 0, `tidak boleh ada baris principal "": ${emptyRows.n}`);
  console.log(`  "" x10 allowed, "<ANONYMOUS>" ke-11 ditolak (counter gabungan=11), tanpa baris "" terpisah`);
});

// ===========================================================================
// H-LEASE-07 — Atomicity smoke: 10 acquire paralel saat 0 slot terisi
// ===========================================================================
await test("H-LEASE-07", async () => {
  const now = T0 + 6 * HOUR; // basis baru: lease lama kedaluwarsa
  ok((await leaseCount()) === 0, `pre-kondisi: COUNT(*) harus 0, dapat ${await leaseCount()}`);
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) => acquireScanSlot(db, `lease-race-${i}`, now)),
  );
  const acquired = results.filter((r) => r.acquired === true);
  const denied = results.filter((r) => r.acquired === false);
  const count = await leaseCount();
  console.log(`  paralel 10x: acquired=${acquired.length}, denied=${denied.length}, COUNT(*)=${count}`);
  console.log(`  hasil: ${JSON.stringify(results)}`);
  // Bersihkan.
  for (const row of await leaseRows()) await releaseScanSlot(db, row.id);
  ok(acquired.length === 5, `tepat 5 harus berhasil, dapat ${acquired.length}`);
  ok(denied.length === 5, `tepat 5 harus gagal, dapat ${denied.length}`);
  ok(denied.every((r) => (r as any).reason === "concurrency-limit"), "alasan penolakan harus concurrency-limit");
  ok(count === 5, `COUNT(*) setelah race ${count} != 5`);
  ok(count <= MAX_SCAN_CONCURRENCY, `COUNT(*) ${count} melewati cap ${MAX_SCAN_CONCURRENCY}`);
});

client.close();
console.log(`\nartefak: tmpRoot=${tmpRoot} (DB disposable, bukan DB live)`);
finish();
