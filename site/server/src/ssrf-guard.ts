// SSRF guard + resource-limited fetch (F-001/F-002/F-003 — v2.3.23, D-02/D-03).
//
// Implements SSRF_REMEDIATION_DESIGN.md §A.4 (blocklist), §A.5 (resource
// budget), SSRF_PROPOSAL_F001_F005_V2320.md §1–§3 and SSRF_SPIKE_V21.md
// (pinning/decompression proofs). Pure module: no global state except the
// DNS lookup semaphore; no cache of DNS answers between hops.
//
// TRANSPORT (Pendekatan 1, UTAMA — terbukti di spike v2/v2.1 pada Bun
// 1.4.4 + Node 24): Node `http`/`https` with a custom `lookup` that
// returns ONLY the validated IP (pinning). TLS verifies the certificate
// against the HOSTNAME, not the pinned IP. Global `fetch` does NOT
// support a custom lookup (spike B2a/B2b) and is NEVER used here.
// If the production runtime does not support Pendekatan 1, the guard
// FAILS CLOSED (fetchGuardedOnce returns null) — there is NO fallback
// to plain fetch (F-042). STAGE-P01 must prove pinning on the production
// runtime; this VM proves it on Bun 1.4.4 / Node 24 only.
//
// BYTE LAYERS (F-038 — mengikat): L0 = wire bytes (raw off the transport,
// counted BEFORE decompression); L1 = decoded bytes per request (after
// app decompression); L3 = aggregate decoded bytes per scan (ScanBudget).
// One chunk is NEVER counted as L0 and L1 at once. Node http delivers
// RAW bytes (no transport decompression) — that is Model B. If a runtime
// ever decompresses on the transport, L0 cannot be measured and the
// implementation must fall back to Model A (L0 NOT guaranteed by the
// app) — see readCappedStream; the VM tests (H-RES-13) prove Model B
// on this runtime.
//
// DNS (F-042): resolveAll returns ALL A + AAAA answers with a 5 s race
// timeout; late results are IGNORED (never used as a destination).
// dns.lookup/resolve do NOT honor AbortSignal (spike TEST 3) — the
// timeout is a Promise.race, not a signal. Empty answer set = DENY.
// Mixed answers (one public + one internal) = DENY the whole set.
// No DNS caching between hops.
//
// PORT POLICY (F-042, keputusan pemilik v2 §A.5): http -> 80 only,
// https -> 443 only, no userinfo, no other scheme. A non-standard port
// is DENIED before any resolve/connect.
//
// LIMITS (keputusan pemilik v2 §A.5 — angka mengikat):
//   DNS_TIMEOUT_MS = 5_000 per resolve; PER_HOP_TIMEOUT_MS = 12_000;
//   TOTAL_DEADLINE_MS = 20_000 per check; MAX_REDIRECT_HOPS = 6;
//   PAGE_DECODED_CAP = 400_000; SCRIPT_DECODED_CAP = 300_000;
//   AGGREGATE_DECODED_CAP = 1_000_000; RDAP_DECODED_CAP = 200_000;
//   MAX_SCAN_CONCURRENCY = 5 (global DB lease — scan-limits.ts);
//   RATE_LIMIT_PER_MINUTE = 10, RATE_LIMIT_PER_HOUR = 100 (per principal;
//   IP-based enforcement needs runtime peer address — see scan-limits.ts).

import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import * as http from "node:http";
import * as https from "node:https";
import { resolve4, resolve6 } from "node:dns/promises";
import { pipeline } from "node:stream/promises";
import { Transform, type Readable } from "node:stream";

export const DNS_TIMEOUT_MS = 5_000;
export const PER_HOP_TIMEOUT_MS = 12_000;
export const TOTAL_DEADLINE_MS = 20_000;
export const MAX_REDIRECT_HOPS = 6;
export const MAX_SCRIPTS_PER_PAGE = 3;
export const PAGE_DECODED_CAP = 400_000;
export const SCRIPT_DECODED_CAP = 300_000;
export const RDAP_DECODED_CAP = 200_000;
export const AGGREGATE_DECODED_CAP = 1_000_000;

export type IpVerdict = { ok: true; ip: string } | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// IP classification (§A.4 — IANA special-purpose registries, 7 Nov 2026;
// IANA last updated 9 Oct 2025). Blocked = every range whose IANA
// "Globally Reachable" is FALSE (plus CGNAT by owner decision).
// Classification is BYTE-based: literals are parsed to bytes first, so
// textual variants of the same address cannot smuggle past the check.
// ---------------------------------------------------------------------------

function parseIPv4(ip: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const bytes: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const s = m[i]!;
    // Non-canonical forms (leading zeros) are rejected, not normalized.
    if (s.length > 1 && s.startsWith("0")) return null;
    const n = Number(s);
    if (n > 255) return null;
    bytes.push(n);
  }
  return bytes;
}

/** Parse an IPv6 literal to 16 bytes. Returns null when malformed. */
export function parseIPv6(ip: string): number[] | null {
  if (ip.includes("%")) return null; // zone identifier — never stripped
  const doubleColon = ip.indexOf("::");
  if (doubleColon !== ip.lastIndexOf("::")) return null;
  const left = doubleColon === -1 ? ip : ip.slice(0, doubleColon);
  const right = doubleColon === -1 ? "" : ip.slice(doubleColon + 2);
  const parseSide = (side: string): number[] | null => {
    if (side === "") return [];
    const groups = side.split(":");
    const out: number[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]!;
      if (g.includes(".")) {
        // Embedded IPv4 — only valid as the LAST group, counts as 2 groups.
        if (gi !== groups.length - 1) return null;
        const v4 = parseIPv4(g);
        if (!v4) return null;
        out.push(v4[0]!, v4[1]!, v4[2]!, v4[3]!);
      } else {
        if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
        const n = parseInt(g, 16);
        out.push((n >> 8) & 0xff, n & 0xff);
      }
    }
    return out;
  };
  const l = parseSide(left);
  const r = parseSide(right);
  if (l === null || r === null) return null;
  if (doubleColon === -1) {
    if (l.length !== 16) return null;
    return l;
  }
  const total = l.length + r.length;
  if (total >= 16) return null;
  return [...l, ...new Array(16 - total).fill(0), ...r];
}

function deny(reason: string): IpVerdict {
  return { ok: false, reason };
}

function classifyIPv4Bytes(b: number[]): IpVerdict {
  if (b.length !== 4) return deny("malformed-ipv4");
  const b0 = b[0]!;
  const b1 = b[1]!;
  const b2 = b[2]!;
  const b3 = b[3]!;
  if (b0 === 0) return deny("ipv4-this-network-0/8");
  if (b0 === 10) return deny("ipv4-private-10/8");
  if (b0 === 100 && (b1 & 0xc0) === 0x40) return deny("ipv4-cgnat-100.64/10");
  if (b0 === 127) return deny("ipv4-loopback-127/8");
  if (b0 === 169 && b1 === 254) return deny("ipv4-link-local-169.254/16");
  if (b0 === 172 && (b1 & 0xf0) === 0x10) return deny("ipv4-private-172.16/12");
  if (b0 === 192 && b1 === 0 && b2 === 0) return deny("ipv4-ietf-192.0.0/24");
  if (b0 === 192 && b1 === 0 && b2 === 2) return deny("ipv4-documentation-192.0.2/24");
  if (b0 === 192 && b1 === 168) return deny("ipv4-private-192.168/16");
  if (b0 === 198 && (b1 & 0xfe) === 0x12) return deny("ipv4-benchmarking-198.18/15");
  if (b0 === 198 && b1 === 51 && b2 === 100) return deny("ipv4-documentation-198.51.100/24");
  if (b0 === 203 && b1 === 0 && b2 === 113) return deny("ipv4-documentation-203.0.113/24");
  if ((b0 & 0xf0) === 0xf0) return deny("ipv4-reserved-240/4");
  if (b0 === 255 && b1 === 255 && b2 === 255 && b3 === 255)
    return deny("ipv4-limited-broadcast");
  return { ok: true, ip: b.join(".") };
}

/**
 * Classify one IP literal. Accepts CANONICAL forms only: a dotted-quad
 * IPv4 (no leading zeros) or a valid IPv6 literal (no zone id). Decimal /
 * octal / hex / short IPv4 forms ("2130706433", "0177.0.0.1", "0x7f.0.0.1",
 * "127.1") are DENIED here as malformed — never silently normalized.
 * IPv4-mapped and known NAT64 addresses are extracted to their embedded
 * IPv4 and classified as IPv4 (mapped-public -> ok with the extracted
 * IPv4; mapped-loopback -> deny). Unknown translation prefixes are NOT
 * extracted (residual U-11).
 */
export function classifyIp(ip: string): IpVerdict {
  if (typeof ip !== "string" || ip.length === 0) return deny("malformed-empty-entry");
  if (ip.includes("%")) return deny("ipv6-zone-identifier");
  const v4 = parseIPv4(ip);
  if (v4) return classifyIPv4Bytes(v4);
  // An IPv4-looking string that is NOT a canonical dotted quad (decimal,
  // octal, hex, short form) must never reach the IPv6 path or a resolver.
  if (/^[0-9a-fA-FxX.]+$/.test(ip) && /[0-9]/.test(ip) && !ip.includes(":"))
    return deny("non-canonical-ipv4-literal");
  const v6 = parseIPv6(ip);
  if (!v6) return deny("malformed-ip-literal");
  const b = v6;
  // Byte accessor — parseIPv6 guarantees exactly 16 bytes here.
  const at = (i: number): number => b[i]!;
  const isZero = (from: number, to: number, value = 0): boolean => {
    for (let i = from; i <= to; i++) if (at(i) !== value) return false;
    return true;
  };
  // ::1 and :: (loopback / unspecified).
  if (isZero(0, 14) && at(15) === 1) return deny("ipv6-loopback-::1");
  if (isZero(0, 15)) return deny("ipv6-unspecified-::");
  // IPv4-mapped ::ffff:0:0/96 — extract embedded IPv4, classify as IPv4.
  if (isZero(0, 9) && at(10) === 0xff && at(11) === 0xff) {
    return classifyIPv4Bytes([at(12), at(13), at(14), at(15)]);
  }
  // NAT64 Well-Known Prefix 64:ff9b::/96 — IPv4 = last 32 bits.
  if (
    at(0) === 0x00 && at(1) === 0x64 && at(2) === 0xff && at(3) === 0x9b &&
    isZero(4, 11)
  ) {
    return classifyIPv4Bytes([at(12), at(13), at(14), at(15)]);
  }
  // NAT64 local-use 64:ff9b:1::/48 (RFC 6052 §2.2 — KOREKSI v2.1):
  // IPv4 = bits 48..63 (bytes 6..7) + bits 72..87 (bytes 9..10); byte 8
  // ("u") MUST be 0, bytes 11..15 MUST be 0 — otherwise MALFORMED.
  if (
    at(0) === 0x00 && at(1) === 0x64 && at(2) === 0xff && at(3) === 0x9b &&
    at(4) === 0x00 && at(5) === 0x01
  ) {
    if (at(8) !== 0 || !isZero(11, 15)) return deny("nat64-/48-malformed-u-or-suffix");
    return classifyIPv4Bytes([at(6), at(7), at(9), at(10)]);
  }
  if (at(0) === 0x01 && at(1) === 0x00 && isZero(2, 7)) return deny("ipv6-discard-100::/64");
  if (at(0) === 0x01 && isZero(1, 6) && at(7) === 0x01) return deny("ipv6-dummy-100:0:0:1::/64");
  if (at(0) === 0x20 && at(1) === 0x01 && at(2) === 0x00 && at(3) === 0x00)
    return deny("ipv6-teredo-2001::/32");
  if (at(0) === 0x20 && at(1) === 0x01 && at(2) === 0x00 && at(3) === 0x02 && isZero(4, 5))
    return deny("ipv6-benchmarking-2001:2::/48");
  if (at(0) === 0x20 && at(1) === 0x01 && at(2) === 0x00 && (at(3) & 0xf0) === 0x10)
    return deny("ipv6-deprecated-orchid-2001:10::/28");
  if (at(0) === 0x20 && at(1) === 0x01 && at(2) === 0x00 && (at(3) & 0xf0) === 0x20)
    return deny("ipv6-orchidv2-2001:20::/28");
  if (at(0) === 0x20 && at(1) === 0x01 && at(2) === 0x0d && at(3) === 0xb8)
    return deny("ipv6-documentation-2001:db8::/32");
  if (at(0) === 0x20 && at(1) === 0x02) return deny("ipv6-6to4-2002::/16");
  if (at(0) === 0x3f && (at(1) & 0xf0) === 0xf0) return deny("ipv6-documentation-3fff::/20");
  if ((at(0) & 0xfe) === 0xfc) return deny("ipv6-ula-fc00::/7");
  if (
    at(0) === 0xfd && at(1) === 0x00 && at(2) === 0x0e && at(3) === 0xc2 &&
    isZero(4, 14) && at(15) === 0xfe
  )
    return deny("ipv6-aws-metadata-fd00:ec2::254");
  if (at(0) === 0xfe && (at(1) & 0xc0) === 0x80) return deny("ipv6-link-local-fe80::/10");
  if (at(0) === 0xff) return deny("ipv6-multicast-ff00::/8");
  return { ok: true, ip: ip.toLowerCase() };
}

// ---------------------------------------------------------------------------
// Host canonicalization + port policy (F-001b/F-001c, F-042).
// The RAW host string is inspected BEFORE any URL normalization: WHATWG
// URL would silently normalize "2130706433" -> "127.0.0.1", which is
// exactly the smuggling vector this rejects.
// ---------------------------------------------------------------------------

export type CanonicalHost = {
  hostname: string;
  port: number | null;
  secure: boolean;
};

export class GuardReject extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const HOSTNAME_LABEL_RE = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/** Parse + validate the authority of a raw URL string. Throws GuardReject. */
export function canonicalizeHost(rawUrl: string): CanonicalHost {
  const m = /^(https?):\/\/([^/?#]+)([/?#]|$)/i.exec(rawUrl.trim());
  if (!m) throw new GuardReject("bad-url", "URL harus http/https dengan host.");
  const secure = m[1]!.toLowerCase() === "https";
  const authority = m[2]!;
  if (authority.includes("@"))
    throw new GuardReject("userinfo-denied", "URL dengan userinfo ditolak.");
  if (authority.includes("%"))
    throw new GuardReject("zone-denied", "Zone identifier IPv6 ditolak.");
  let host: string;
  let port: number | null = null;
  if (authority.startsWith("[")) {
    const close = authority.indexOf("]");
    if (close === -1) throw new GuardReject("bad-ipv6", "Literal IPv6 tidak valid.");
    host = authority.slice(1, close);
    const rest = authority.slice(close + 1);
    if (rest !== "") {
      if (!rest.startsWith(":")) throw new GuardReject("bad-authority", "Otoritas URL tidak valid.");
      port = parsePort(rest.slice(1));
    }
    if (parseIPv6(host) === null) throw new GuardReject("bad-ipv6", "Literal IPv6 tidak valid.");
  } else {
    const colon = authority.lastIndexOf(":");
    if (colon !== -1) {
      host = authority.slice(0, colon);
      port = parsePort(authority.slice(colon + 1));
    } else {
      host = authority;
    }
    if (host === "") throw new GuardReject("empty-host", "Host kosong.");
    if (/^[0-9a-fA-FxX.]+$/.test(host) && /[0-9]/.test(host)) {
      // IPv4-looking: ONLY a canonical dotted quad is accepted here.
      // Decimal/octal/hex/short forms are rejected, not normalized.
      if (parseIPv4(host) === null)
        throw new GuardReject("non-canonical-ipv4", "Bentuk alamat IPv4 tidak kanonik.");
    } else {
      // DNS hostname: labels of [a-z0-9-], no empty labels, <= 253 chars.
      if (host.length > 253) throw new GuardReject("bad-hostname", "Hostname terlalu panjang.");
      const labels = host.split(".");
      for (const label of labels) {
        if (!HOSTNAME_LABEL_RE.test(label))
          throw new GuardReject("bad-hostname", "Hostname tidak valid.");
      }
    }
  }
  return { hostname: host.toLowerCase(), port, secure };
}

function parsePort(s: string): number {
  if (!/^\d+$/.test(s) || s.length === 0 || s.length > 5)
    throw new GuardReject("bad-port", "Port tidak valid.");
  const n = Number(s);
  if (n < 1 || n > 65535) throw new GuardReject("bad-port", "Port di luar rentang.");
  return n;
}

/**
 * Port policy (F-042): http -> 80 only, https -> 443 only (empty = default).
 * Checked BEFORE any resolve/connect.
 */
export function checkPort(host: CanonicalHost): boolean {
  if (host.port === null) return true;
  return host.secure ? host.port === 443 : host.port === 80;
}

// ---------------------------------------------------------------------------
// DNS resolution (F-001a, F-042). No caching between hops.
// ---------------------------------------------------------------------------

export class DnsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type Resolver = (hostname: string) => Promise<string[]>;

/** Real resolver: ALL A + AAAA answers, 5 s race timeout, late results ignored. */
export async function resolveAll(hostname: string): Promise<string[]> {
  const attempt = (async (): Promise<string[]> => {
    const [v4, v6] = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);
    const out: string[] = [];
    if (v4.status === "fulfilled") out.push(...v4.value);
    if (v6.status === "fulfilled") out.push(...v6.value);
    if (out.length === 0) {
      const reason =
        v4.status === "rejected" ? (v4.reason as NodeJS.ErrnoException)?.code ?? "ENOTFOUND" : "ENODATA";
      throw new DnsError(reason, `DNS tidak menjawab untuk ${hostname} (${reason}).`);
    }
    return out;
  })();
  // Timeout race: the loser promise is NOT awaited afterwards — a late
  // answer is discarded, never used as a destination (generation flag
  // semantics; dns.lookup cannot be cancelled — spike TEST 3).
  const timer = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new DnsError("dns-timeout", `DNS timeout 5 detik untuk ${hostname}.`)), DNS_TIMEOUT_MS);
  });
  try {
    return await Promise.race([attempt, timer]);
  } finally {
    // Swallow the loser's late settlement so it never becomes an
    // unhandled rejection; its result is discarded by construction.
    attempt.then(
      () => undefined,
      () => undefined,
    );
  }
}

/**
 * Validate ALL resolved addresses (F-001a, diperbaiki F-042): empty set,
 * non-array, malformed or empty entries are DENIED; ONE forbidden answer
 * denies the WHOLE set (reject-set, not first-public-wins). Returns the
 * CANONICAL first IP (for IPv4-mapped, the extracted IPv4).
 */
export function validateDestination(
  _hostname: string,
  ips: string[] | null | undefined,
): IpVerdict {
  if (!Array.isArray(ips)) return { ok: false, reason: "resolver-no-answer" };
  if (ips.length === 0) return { ok: false, reason: "empty-dns-result" };
  for (const ip of ips) {
    if (typeof ip !== "string" || ip.length === 0)
      return { ok: false, reason: "malformed-empty-entry" };
    const v = classifyIp(ip);
    if (!v.ok) return { ok: false, reason: v.reason };
  }
  const first = classifyIp(ips[0]!) as { ok: true; ip: string };
  return { ok: true, ip: first.ip };
}

// ---------------------------------------------------------------------------
// Resource budget (F-002/F-003, F-039). ONE ScanBudget per check, shared
// by the page + all redirects + all scripts (serial). tryReserve is
// SYNCHRONOUS check-and-reserve, called BEFORE a chunk is appended —
// never async (an async check lets two readers pass the same check
// before either updates the counter — the race proven by F-039).
// A1 (accepted/retained bytes) is HARD-bounded: A1 <= aggregate cap at
// every instant, any number of readers. A2 (transient/in-flight bytes)
// is bounded by the formula R x C_max with R = 1 (serial scripts),
// i.e. one chunk — see the design; C_max is runtime-dependent and is
// REPORTED per deployment, never claimed as a fixed number.
// ---------------------------------------------------------------------------

export type ScanBudget = {
  aggregateDecodedCap: number;
  aggregateDecodedUsed: number;
  /** Shared abort: aborts ALL readers + fetches of this check at once. */
  abort: AbortController;
};

export function createScanBudget(
  aggregateDecodedCap: number = AGGREGATE_DECODED_CAP,
): ScanBudget {
  return { aggregateDecodedCap, aggregateDecodedUsed: 0, abort: new AbortController() };
}

export function tryReserve(budget: ScanBudget, n: number): boolean {
  if (budget.abort.signal.aborted) return false;
  if (budget.aggregateDecodedUsed + n > budget.aggregateDecodedCap) {
    budget.abort.abort(); // cancel ALL readers + fetches of this check
    return false;
  }
  budget.aggregateDecodedUsed += n;
  return true;
}

// ---------------------------------------------------------------------------
// Capped streaming read (F-002, Model B). The body stream carries RAW
// wire bytes (L0); the app decompresses (L1) and counts both layers
// separately. On ANY abort/cap/decompression failure the caller gets an
// exception — partial results are NEVER returned as usable text.
// ---------------------------------------------------------------------------

export class CapError extends Error {
  readonly code:
    | "wire-cap"
    | "decoded-cap"
    | "aggregate-cap"
    | "unsupported-encoding"
    | "decompression-failed"
    | "content-length-cap"
    | "aborted";
  constructor(
    code: CapError["code"],
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

const SUPPORTED_ENCODINGS = new Set(["gzip", "deflate", "br", "identity", ""]);

export async function readCappedStream(
  body: NodeJS.ReadableStream,
  opts: {
    contentEncoding: string | null;
    contentLength: number | null;
    compressedCap: number;
    decompressedCap: number;
    budget: ScanBudget;
    signal: AbortSignal;
  },
): Promise<{ text: string; wireBytes: number; decodedBytes: number }> {
  const encoding = (opts.contentEncoding ?? "").trim().toLowerCase();
  const parts = encoding === "" ? ["identity"] : encoding.split(",").map((s) => s.trim());
  if (parts.length !== 1 || !SUPPORTED_ENCODINGS.has(parts[0]!)) {
    throw new CapError(
      "unsupported-encoding",
      `Content-Encoding tidak didukung: ${opts.contentEncoding ?? "(tidak ada)"}.`,
    );
  }
  const enc = parts[0];
  // Content-Length is a pre-check signal ONLY (never an oracle): when it
  // already exceeds the decoded cap, reject BEFORE reading a single byte.
  if (
    opts.contentLength !== null &&
    Number.isFinite(opts.contentLength) &&
    opts.contentLength > opts.decompressedCap
  ) {
    throw new CapError(
      "content-length-cap",
      `Content-Length ${opts.contentLength} melebihi batas ${opts.decompressedCap}.`,
    );
  }

  let wireBytes = 0;
  let decodedBytes = 0;
  const chunks: Buffer[] = [];

  const wireCounter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      wireBytes += chunk.length;
      if (wireBytes > opts.compressedCap) {
        cb(new CapError("wire-cap", `Wire bytes ${wireBytes} melebihi batas ${opts.compressedCap}.`));
        return;
      }
      cb(null, chunk);
    },
  });
  const decodedCounter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      decodedBytes += chunk.length;
      if (decodedBytes > opts.decompressedCap) {
        cb(new CapError("decoded-cap", `Decoded bytes ${decodedBytes} melebihi batas ${opts.decompressedCap}.`));
        return;
      }
      if (!tryReserve(opts.budget, chunk.length)) {
        cb(new CapError("aggregate-cap", `Aggregate decoded melebihi batas ${opts.budget.aggregateDecodedCap}.`));
        return;
      }
      chunks.push(chunk);
      cb(null, chunk);
    },
  });
  const sink = new Transform({
    transform(_chunk: Buffer, _enc, cb) {
      cb(); // discard — bytes already collected by decodedCounter
    },
  });

  let decompressor: NodeJS.ReadWriteStream;
  if (enc === "gzip") decompressor = createGunzip();
  else if (enc === "deflate") decompressor = createInflate();
  else if (enc === "br") decompressor = createBrotliDecompress();
  else {
    decompressor = new Transform({
      transform(chunk: Buffer, _enc: string, cb: (err?: Error | null, data?: unknown) => void) {
        cb(null, chunk);
      },
    }) as unknown as NodeJS.ReadWriteStream;
  }

  const combined = AbortSignal.any([opts.signal, opts.budget.abort.signal]);
  try {
    await pipeline(body, wireCounter, decompressor, decodedCounter, sink, { signal: combined });
  } catch (err) {
    if (err instanceof CapError) throw err;
    if (
      err instanceof Error &&
      (err.name === "AbortError" || combined.aborted)
    ) {
      throw new CapError("aborted", "Pembacaan dibatalkan (deadline atau aggregate cap).");
    }
    throw new CapError(
      "decompression-failed",
      `Dekompresi gagal: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return { text: Buffer.concat(chunks).toString("utf-8"), wireBytes, decodedBytes };
}

// ---------------------------------------------------------------------------
// Pinned transport (Pendekatan 1) + guarded single-hop fetch (F-001c/d).
// ---------------------------------------------------------------------------

const GUARD_UA = "Mozilla/5.0 (compatible; CekLinkAirdrop/1.0)";
export const GUARD_ACCEPT_HTML = "text/html,application/xhtml+xml,*/*";
export const GUARD_ACCEPT_RDAP = "application/rdap+json, application/json";

export type ConnectorRequest = {
  url: string;
  hostname: string;
  /** The validated IP the connection MUST go to (pinning). */
  pinnedIp: string;
  port: number;
  secure: boolean;
  signal: AbortSignal;
  /** Accept header for this request (default: HTML scanner accept). */
  accept: string;
};

export type ConnectorResponse = {
  status: number;
  headers: { get(name: string): string | null };
  /** RAW body stream (no transport decompression by the connector). The
   * runtime value is an http.IncomingMessage (a stream.Readable) — typed
   * as Readable so callers can destroy() it (redirect hops). */
  body: Readable;
};

export type Connector = (req: ConnectorRequest) => Promise<ConnectorResponse>;

/**
 * Real transport — Node http/https with a custom `lookup` returning ONLY
 * the pinned IP. TLS SNI + certificate verification still use the
 * HOSTNAME. Exported as a test seam (pinning is proven by calling it
 * directly with a local server + a hostname that does not exist in DNS).
 */
export function nodeConnector(req: ConnectorRequest): Promise<ConnectorResponse> {
  return new Promise((resolve, reject) => {
    const lib = req.secure ? https : http;
    const isV6 = req.pinnedIp.includes(":");
    const agent = new lib.Agent({
      lookup: (hostname, options, callback) => {
        void hostname;
        const addr = { address: req.pinnedIp, family: (isV6 ? 6 : 4) as 4 | 6 };
        // Bun quirk (spike B1-fixed): with options.all=true the callback
        // MUST receive an array, or Bun throws ERR_INVALID_IP_ADDRESS.
        if ((options as { all?: boolean }).all) callback(null, [addr]);
        else callback(null, addr.address, addr.family);
      },
    });
    const request = lib.request(
      req.url,
      {
        agent,
        method: "GET",
        headers: {
          "user-agent": GUARD_UA,
          accept: req.accept,
        },
        signal: req.signal,
      },
      (res) => {
        resolve({
          status: res.statusCode ?? 0,
          headers: {
            get: (name: string): string | null => {
              const v = res.headers[name.toLowerCase()];
              if (Array.isArray(v)) return v.join(", ");
              return v ?? null;
            },
          },
          body: res,
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}

export type GuardedResponse = ConnectorResponse & {
  url: string;
  pinnedIp: string;
};

export type UrlValidation =
  | { ok: true; ip: string; host: CanonicalHost }
  | { ok: false; reason: string };

/**
 * Validate a URL for fetching WITHOUT opening any connection: canonicalize
 * the raw host, enforce the port policy, resolve ALL DNS answers, and
 * validate the whole set. Used by fetchGuardedOnce AND as the K-1
 * preflight before the fetch cache (a cached entry is only served after
 * the URL itself passes validation — no new connection is made for a
 * cache hit, so the preflight only re-checks the URL).
 */
export async function validateUrlForFetch(
  url: string,
  opts: { resolver?: Resolver } = {},
): Promise<UrlValidation> {
  let host: CanonicalHost;
  try {
    host = canonicalizeHost(url);
  } catch (err) {
    return { ok: false, reason: err instanceof GuardReject ? err.code : "bad-url" };
  }
  if (!checkPort(host)) return { ok: false, reason: "port-denied" };
  const isLiteral =
    parseIPv4(host.hostname) !== null || parseIPv6(host.hostname) !== null;
  let ips: string[];
  try {
    // IP literals need no DNS — the literal itself is the destination.
    ips = isLiteral ? [host.hostname] : await (opts.resolver ?? resolveAll)(host.hostname);
  } catch (err) {
    return { ok: false, reason: err instanceof DnsError ? err.code : "dns-error" };
  }
  const verdict = validateDestination(host.hostname, ips);
  if (!verdict.ok) return { ok: false, reason: verdict.reason };
  return { ok: true, ip: verdict.ip, host };
}

/**
 * ONE guarded hop: canonicalize -> port policy -> resolve ALL -> validate
 * ALL -> connect ONLY to the validated IP. Returns null on ANY guard
 * denial, DNS failure, timeout, or connection error — NEVER a plain
 * fetch fallback (F-042). The caller owns the body stream: it MUST be
 * consumed via readCappedStream or destroyed (redirect hops).
 */
export async function fetchGuardedOnce(
  url: string,
  opts: {
    deadline?: AbortSignal;
    resolver?: Resolver;
    connector?: Connector;
    accept?: string;
  } = {},
): Promise<GuardedResponse | null> {
  const validation = await validateUrlForFetch(url, { resolver: opts.resolver });
  if (!validation.ok) return null;
  const { host } = validation;
  const port = host.port ?? (host.secure ? 443 : 80);
  const signal = AbortSignal.any([
    AbortSignal.timeout(PER_HOP_TIMEOUT_MS),
    ...(opts.deadline ? [opts.deadline] : []),
  ]);
  const connector = opts.connector ?? nodeConnector;
  try {
    const res = await connector({
      url,
      hostname: host.hostname,
      pinnedIp: validation.ip,
      port,
      secure: host.secure,
      signal,
      accept: opts.accept ?? GUARD_ACCEPT_HTML,
    });
    return { ...res, url, pinnedIp: validation.ip };
  } catch {
    return null;
  }
}
