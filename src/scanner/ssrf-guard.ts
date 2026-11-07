/**
 * SSRF Guard — AIRDROP GENERATE (AG-001)
 *
 * STATUS: IMPLEMENTED (pure logic, no external dependencies)
 * Logika pemeriksaan alamat di file ini nyata dan dapat diuji.
 * Yang BELUM ada: integrasi ke fetch nyata (DNS lookup + fetch dengan
 * guard ini) — itu bagian dari implementasi `link-scanner.ts` (masih stub).
 *
 * Aturan yang diterapkan (lihat SECURITY_REQUIREMENTS.md §3):
 *  - Tolak localhost, private IP, link-local, metadata endpoints.
 *  - Hanya protokol http: dan https:.
 *  - Setiap redirect harus melewati pemeriksaan ini lagi.
 */

export type SsrfCheckResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

function inRange(ip: number, cidr: string): boolean {
  const parts = cidr.split("/");
  const base = parts[0];
  const bitsStr = parts[1];
  if (base === undefined || bitsStr === undefined) return false;
  const baseInt = ipv4ToInt(base);
  const bits = Number(bitsStr);
  if (baseInt === null || Number.isNaN(bits)) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ip & mask) === (baseInt & mask);
}

/** Rentang IPv4 yang dilarang: localhost, privat, link-local (termasuk metadata cloud). */
const BLOCKED_IPV4_RANGES = [
  "127.0.0.0/8", // loopback
  "10.0.0.0/8", // private
  "172.16.0.0/12", // private
  "192.168.0.0/16", // private
  "169.254.0.0/16", // link-local incl. 169.254.169.254 metadata
  "0.0.0.0/8", // "this network"
];

function isBlockedIpLiteral(host: string): string | null {
  const lower = host.toLowerCase();
  if (lower === "::1" || lower === "[::1]") return "IPv6 loopback (::1)";
  if (lower.startsWith("fe80:") || lower.startsWith("[fe80:")) {
    return "IPv6 link-local (fe80::/10)";
  }
  const ip = ipv4ToInt(host);
  if (ip === null) return null;
  for (const range of BLOCKED_IPV4_RANGES) {
    if (inRange(ip, range)) return `IP ${host} berada di rentang terlarang ${range}`;
  }
  return null;
}

/**
 * Periksa satu URL sebelum fetch. Panggil untuk URL awal DAN setiap hop redirect.
 * Catatan: pemeriksaan ini bekerja pada hostname/IP literal. Perlindungan penuh
 * terhadap DNS rebinding memerlukan resolve DNS + pemeriksaan ulang hasil
 * resolve — lihat `resolveAndCheck` (stub) di bawah.
 */
export function checkUrlAllowed(rawUrl: string): SsrfCheckResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: `URL tidak valid: ${rawUrl}` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { allowed: false, reason: `Protokol tidak diizinkan: ${url.protocol}` };
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { allowed: false, reason: `Hostname terlarang: ${host}` };
  }
  const blockedIp = isBlockedIpLiteral(host);
  if (blockedIp) {
    return { allowed: false, reason: blockedIp };
  }
  if (url.username !== "" || url.password !== "") {
    return { allowed: false, reason: "URL mengandung kredensial (userinfo)" };
  }
  return { allowed: true };
}

/**
 * STUB — BELUM DIIMPLEMENTASIKAN.
 * Resolve hostname lewat DNS, lalu periksa SETIAP alamat hasil resolve dengan
 * `isBlockedIpLiteral`. Implementasi membutuhkan akses DNS (Node `dns/promises`)
 * dan harus menolak bila salah satu alamat hasil resolve masuk rentang terlarang.
 */
export async function resolveAndCheck(
  _hostname: string,
): Promise<SsrfCheckResult> {
  throw new Error(
    "STUB: resolveAndCheck belum diimplementasikan — membutuhkan DNS lookup + pemeriksaan ulang hasil resolve (anti DNS-rebinding).",
  );
}

export const MAX_REDIRECTS = 6;
export const FETCH_TIMEOUT_MS = 10_000;
export const TOTAL_TIMEOUT_MS = 30_000;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
