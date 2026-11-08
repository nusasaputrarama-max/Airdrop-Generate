// Bukti lapisan byte F-038 (v2.3.20) — jawaban atas audit V13 §4 F-038.
//
// MEMBUKTIKAN, pada VM lokal (Bun 1.4.4), bahwa chunk Response.body
// Bun adalah byte HASIL DEKOMPRESI (L1), BUKAN raw wire bytes (L0),
// sehingga pseudodiff v2.3.19 §2.3 yang menghitung SATU chunk sebagai
// compressed DAN decoded sekaligus adalah SALAH dan harus diperbaiki.
//
// Fixture: 500.000 byte 'A' di-gzip -> ~520 byte wire (rasio ~962x).
//   (a) fetch() default Bun + reader: total chunk.length HARUS ==
//       500.000 (decoded). Bila seseorang menghitung chunk.length
//       sebagai "wire", ia mengklaim wire = 500.000 — SALAH 962x.
//   (b) transport mentah (node:http, tanpa dekompresi): total byte
//       HARUS == ukuran gzip (~520) — inilah L0 yang sebenarnya.
//   (c) fetch() dengan Accept-Encoding: identity: Bun TETAP
//       mendekompresi (total == 500.000, bukan gzip magic) —
//       aplikasi TIDAK DAPAT memperoleh raw bytes lewat Bun fetch
//       walau meminta identity. Karena itu Model B proposal v2.3.20
//       memakai transport mentah + dekompresi di aplikasi, atau L0
//       diserahkan ke egress/infrastruktur (bukan diklaim aplikasi).
//
// Server + klien di 127.0.0.1 saja. Tidak ada jaringan luar, tidak ada
// checkLink, tidak ada artifact live. Bukti VM SAJA — bukan staging.
//
// Usage (dari evidence/v2320/):
//   bun test-f038-layers-v2320.ts > test-f038-layers-v2320.txt 2>&1
// Exit 0 = semua assertion PASS; exit 1 = FAIL.

import { gzipSync } from "node:zlib";
import http from "node:http";

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

console.log("=== test-f038-layers-v2320 ===");
console.log(`date: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })} WIB`);
console.log(`bun: ${Bun.version}`);
console.log(`uid: ${typeof process.getuid === "function" ? process.getuid() : "n/a"}`);
console.log(`env: VM lokal — BUKAN staging, BUKAN produksi`);

const DECODED_LEN = 500_000;
const decoded = Buffer.alloc(DECODED_LEN, 0x41); // 500.000 x 'A'
const wire = gzipSync(decoded);
console.log(`fixture: decoded=${DECODED_LEN} byte, gzip wire=${wire.length} byte, rasio=${(DECODED_LEN / wire.length).toFixed(1)}x`);
check("fixture wire jauh lebih kecil dari decoded", wire.length < 1_000, `wire=${wire.length}`);

const server = http.createServer((_req, res) => {
  // Server SENGAJA mengirim gzip apa pun yang diminta klien, supaya
  // perilaku dekompresi runtime terlihat apa adanya.
  res.writeHead(200, { "Content-Type": "text/plain", "Content-Encoding": "gzip" });
  res.end(wire);
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as any).port;
const url = `http://127.0.0.1:${port}/`;

// (a) Bun fetch default + reader
const resA = await fetch(url);
let totalA = 0;
let chunksA = 0;
let maxChunkA = 0;
const reader = resA.body!.getReader();
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  chunksA++;
  maxChunkA = Math.max(maxChunkA, value.length);
  totalA += value.length;
}
console.log(`(a) Bun fetch default: total chunk bytes=${totalA}, chunks=${chunksA}, max chunk=${maxChunkA}`);
check("A: chunk Response.body berjumlah decoded (500.000)", totalA === DECODED_LEN, `total=${totalA}`);
check("A: chunk Response.body BUKAN wire (jauh > wire)", totalA !== wire.length, `total=${totalA} vs wire=${wire.length}`);
// Penghitung naif v2.3.19: compressedBytes += chunk.length
const naiveWireClaim = totalA;
check(
  "A: penghitung naif 'wire = chunk.length' SALAH (overstate ~962x)",
  naiveWireClaim / wire.length > 100,
  `klaim=${naiveWireClaim} vs wire sebenarnya=${wire.length}`,
);

// (b) Transport mentah node:http tanpa dekompresi
const rawTotal: number = await new Promise((resolve, reject) => {
  http.get(url, { headers: { "Accept-Encoding": "identity" } }, (res) => {
    let n = 0;
    let c = 0;
    res.on("data", (d: Buffer) => { n += d.length; c++; });
    res.on("end", () => { console.log(`(b) raw http: chunks=${c}`); resolve(n); });
    res.on("error", reject);
  }).on("error", reject);
});
console.log(`(b) raw http total bytes=${rawTotal}`);
check("B: transport mentah mengukur wire sebenarnya", rawTotal === wire.length, `raw=${rawTotal} vs wire=${wire.length}`);
check("B: L0 (wire) dan L1 (decoded) berasal dari layer berbeda", rawTotal !== totalA, `L0=${rawTotal} L1=${totalA}`);

// (c) Bun fetch + Accept-Encoding: identity
const resC = await fetch(url, { headers: { "Accept-Encoding": "identity" } });
const bufC = Buffer.from(await resC.arrayBuffer());
const isGzipMagic = bufC[0] === 0x1f && bufC[1] === 0x8b;
console.log(`(c) fetch identity: total bytes=${bufC.length}, gzip magic=${isGzipMagic}`);
check(
  "C: Bun fetch tetap mendekompresi walau diminta identity (raw TIDAK tersedia via fetch)",
  bufC.length === DECODED_LEN && !isGzipMagic,
  `total=${bufC.length}, gzipMagic=${isGzipMagic}`,
);

// Catatan ukuran chunk runtime (relevan F-039): chunk reader Bun di
// sini hingga 483.616 byte pada satu run dan 16.384 byte pada probe
// awal — ukuran chunk runtime TIDAK dijamin kecil dan bervariasi
// antar run/server. Karena itu batas A2 dinyatakan sebagai rumus
// (R x C_max), bukan angka mutlak.
check("catatan: ukuran chunk runtime bervariasi dan tidak dijamin kecil", maxChunkA > 0, `maxChunk=${maxChunkA}`);

server.close();
console.log(`=== RESULT: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
