// H-RES-03 VM experiment, part 2: Brotli (br) — same question as gzip probe.
// Local-only: 127.0.0.1 server + client. No external network, no artifact, no checkLink.
import { brotliCompressSync } from "node:zlib";

const DECOMPRESSED_SIZE = 500_000;
const MARKER = "DECOMPRESSED-MARKER-HRES03-BR";
const markerAt = 400_000;
const plain = Buffer.alloc(DECOMPRESSED_SIZE, 0x42); // 'B' * 500000
plain.write(MARKER, markerAt, "utf8");
const br = brotliCompressSync(plain);
console.log("decompressed bytes:", plain.length);
console.log("brotli wire bytes:", br.length);

const server = Bun.serve({
  port: 0,
  fetch() {
    return new Response(br, { headers: { "content-encoding": "br", "content-type": "text/plain", "content-length": String(br.length) } });
  },
});
const res = await fetch(`http://127.0.0.1:${server.port}/br`);
console.log("status:", res.status, "| content-encoding hdr:", res.headers.get("content-encoding"), "| content-length hdr:", res.headers.get("content-length"));
const reader = res.body!.getReader();
let total = 0, chunks = 0, maxChunk = 0;
let buf = Buffer.alloc(0);
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks++;
  maxChunk = Math.max(maxChunk, value.length);
  total += value.length;
  buf = Buffer.concat([buf, Buffer.from(value)]);
}
console.log("chunks:", chunks, "| max single chunk bytes:", maxChunk, "| TOTAL bytes read from Response.body:", total);
console.log("marker present:", buf.includes(MARKER), "| marker byte offset:", buf.indexOf(MARKER));
console.log("body bytes == decompressed size?", total === DECOMPRESSED_SIZE, "| == brotli wire size?", total === br.length);
server.stop(true);
console.log("done");
