// H-RES-03 VM experiment: what does Bun Response.body expose for a gzip response?
// Local-only: server + client both on 127.0.0.1. No external network, no artifact, no checkLink.
import { gzipSync } from "node:zlib";

const DECOMPRESSED_SIZE = 500_000;
const MARKER = "DECOMPRESSED-MARKER-HRES03";
const markerAt = 400_000; // byte offset of marker inside decompressed body
const plain = Buffer.alloc(DECOMPRESSED_SIZE, 0x41); // 'A' * 500000
plain.write(MARKER, markerAt, "utf8");
const gz = gzipSync(plain);
console.log("decompressed bytes:", plain.length);
console.log("gzip wire bytes:", gz.length);
console.log("marker at decompressed offset:", markerAt);

const server = Bun.serve({
  port: 0,
  fetch(req) {
    const url = new URL(req.url);
    const ae = req.headers.get("accept-encoding");
    console.log("server saw Accept-Encoding:", ae, "| path:", url.pathname);
    if (url.pathname === "/gzip") {
      return new Response(gz, { headers: { "content-encoding": "gzip", "content-type": "text/plain", "content-length": String(gz.length) } });
    }
    if (url.pathname === "/plain") {
      return new Response(plain, { headers: { "content-type": "text/plain", "content-length": String(plain.length) } });
    }
    return new Response("nf", { status: 404 });
  },
});
const base = `http://127.0.0.1:${server.port}`;
console.log("listening:", base);

async function probe(label: string, path: string, init?: RequestInit) {
  const res = await fetch(base + path, init);
  console.log(`--- ${label} ---`);
  console.log("status:", res.status, "| content-encoding hdr:", res.headers.get("content-encoding"), "| content-length hdr:", res.headers.get("content-length"));
  const reader = res.body!.getReader();
  let total = 0, chunks = 0, firstChunk = 0;
  const seen = new Uint8Array(0);
  let buf = Buffer.alloc(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks++;
    if (chunks === 1) firstChunk = value.length;
    total += value.length;
    buf = Buffer.concat([buf, Buffer.from(value)]);
  }
  console.log("chunks:", chunks, "| first chunk bytes:", firstChunk, "| TOTAL bytes read from Response.body:", total);
  console.log("marker present in body bytes:", buf.includes(MARKER), "| marker byte offset in read body:", buf.indexOf(MARKER));
  console.log("body bytes == decompressed size?", total === DECOMPRESSED_SIZE, "| == gzip wire size?", total === gz.length);
}

await probe("default fetch /gzip", "/gzip");
await probe("explicit identity /gzip", "/gzip", { headers: { "Accept-Encoding": "identity" } });
await probe("default fetch /plain", "/plain");
server.stop(true);
console.log("done");
