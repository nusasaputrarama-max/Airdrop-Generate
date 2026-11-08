// Actions for Cek Link Airdrop — a live airdrop-link scam checker.
//
// checkLink fetches the pasted page server-side (never executing its JS),
// following redirects manually so the whole redirect chain is evidence,
// scans the HTML plus up to 3 same-page scripts for wallet-connect /
// signing / contract / bait / obfuscation signals, validates every contract
// address it finds (format + consistency with the chain the page claims),
// checks the input domain AND every redirect hop against the confirmed
// drainer list, looks the domain up over RDAP for its registration date,
// scores everything transparently (each signal states its score impact),
// and saves the result as one row in `checks` (the user's history).

import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import * as schema from "./schema";
import { canonicalizeContractAddress } from "./catalog";
import {
  ANONYMOUS_RATE_BUCKET,
  acquireScanSlot,
  checkRateLimit,
  releaseScanSlot,
} from "./scan-limits";
import {
  MAX_REDIRECT_HOPS,
  MAX_SCRIPTS_PER_PAGE,
  PAGE_DECODED_CAP,
  RDAP_DECODED_CAP,
  SCRIPT_DECODED_CAP,
  TOTAL_DEADLINE_MS,
  GUARD_ACCEPT_RDAP,
  createScanBudget,
  fetchGuardedOnce,
  readCappedStream,
  tryReserve,
  validateUrlForFetch,
  type Connector,
  type Resolver,
  type ScanBudget,
} from "./ssrf-guard";

const signalSchema = z.object({
  id: z.string(),
  status: z.enum(["bahaya", "waspada", "aman", "info"]),
  label: z.string(),
  detail: z.string(),
});

const contractSchema = z.object({
  chain: z.enum(["evm", "solana"]),
  address: z.string(),
});

const checkSchema = z.object({
  id: z.number(),
  url: z.string(),
  domain: z.string(),
  verdict: z.enum(["bahaya", "waspada", "lebih_aman", "tidak_diketahui"]),
  score: z.number(),
  signals: z.array(signalSchema),
  contracts: z.array(contractSchema),
  page_title: z.string().nullable(),
  final_url: z.string().nullable(),
  http_status: z.number().nullable(),
  registered_at: z.string().nullable(),
  registrar: z.string().nullable(),
  domain_age_days: z.number().nullable(),
  checked_at: z.string(),
});

type Signal = z.infer<typeof signalSchema>;
type Contract = z.infer<typeof contractSchema>;
type Check = z.infer<typeof checkSchema>;
type Verdict = Check["verdict"];

/** Domains confirmed as drainers in the user's own 2026-11-07 incident. */
const KNOWN_BAD_DOMAINS = new Set(["solbarn.cc", "sharkmoon.tech"]);
const isKnownBadDomain = (d: string): boolean => KNOWN_BAD_DOMAINS.has(d);

const TWO_LEVEL_SUFFIXES = new Set([
  "co.id", "or.id", "web.id", "co.uk", "org.uk", "com.au", "co.jp",
  "com.br", "co.kr", "com.cn", "com.tw", "co.in", "com.mx", "com.sg",
  "com.my", "co.th", "com.vn", "com.ph", "co.za", "com.ar", "com.co",
  "com.pe", "com.ng", "co.ke",
]);

// Exported for harness verification only (NOT an action — the Actions map
// is the only invocable surface). H-RD tests import it directly.
export function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase();
  // IP literals are not domains: return them whole. Otherwise the
  // last-two-labels rule mangles 127.0.0.1 into "0.1" and RDAP then
  // queries a nonsense domain (rdap.org/domain/0.1).
  if (host.includes(":")) return host; // IPv6 literal
  const labels = host.split(".").filter(Boolean);
  if (labels.length > 0 && labels.every((l) => /^\d+$/.test(l))) {
    return labels.join("."); // IPv4 / all-numeric literal
  }
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  if (TWO_LEVEL_SUFFIXES.has(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
}

function normalizeUrl(raw: string): URL {
  let text = raw.trim();
  if (!text) throw new Error("Tempel dulu link-nya.");
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error("Link itu tidak bisa dibaca. Pastikan formatnya benar, contoh: https://situs.com/klaim");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Hanya link http/https yang bisa dicek.");
  }
  return url;
}

// ---------------------------------------------------------------------------
// Principal (F-005/F-018/F-046 — v2.3.23, D-01/D-04; F-051 — v2.3.24).
// ---------------------------------------------------------------------------
// The SDK DOES expose a verifiable per-invocation identity: `ctx.viewer`
// (@hatch/space-sdk 0.14.0, server-contract.d.ts — PortableCtx.viewer?).
//   - local runtime: LocalViewer { source: "local", authenticated: true,
//     userId, ownerUserId, isOwner, delegate? } — "User identity verified
//     by the local daemon, without a share token."
//   - cloudflare runtime: CloudflareViewer { source: "cloudflare",
//     authenticated: true, shareId, spaceSlug, isOwner, tokenExpiresAt,
//     tokenId } — identity is the SHARE, not a stable user id.
// That closes the F-005 "no principal" gap at the TYPE level. What is
// still NOT VERIFIED: whether the live worker actually POPULATES
// ctx.viewer on every invocation path (staging gate STAGE-P02 —
// the type existing does not prove the runtime fills it). Until that
// is proven, every consumer below treats a missing viewer as
// "anonymous" and fails closed (see L-A).
//
// F-051 (v2.3.24): a shareId is NOT a per-user identity — all viewers of
// one Cloudflare share resolved to the SAME principal, so they shared
// check history and saved state. The fix:
//   - Cloudflare NON-OWNER viewers have NO principal (null): they read
//     no history, their checks are owner-NULL (write-only under L-A),
//     Gibran gets no history for them, and saved state is DISABLED for
//     them (listProjects returns defaults; setProjectState is a no-op).
//   - Cloudflare OWNER viewers (isOwner === true, runtime-verified)
//     get `cloudflare-owner:{shareId}` — the owner is one person, so
//     this is a genuine single-user principal, distinct from any viewer.
//   - Local viewers resolve to `local:{userId}` (F-058, v2.3.25):
//     `userId` is the caller identity (SDK 0.14.0 server-contract.d.ts:
//     LocalViewer { userId, ownerUserId, isOwner, delegate? }); the old
//     `local:{ownerUserId}` mapping collapsed every caller under one
//     owner into a single principal. `ownerUserId` names the SPACE
//     OWNER (used only to interpret `isOwner`), it is NOT the caller.
//     A delegated invocation (`delegate: "agent" | "schedule"`) is a
//     DISTINCT actor: `local:delegate:{delegate}:{userId}` — it never
//     silently shares the direct caller's history or saved state.
//     `isOwner` is authorization, not identity: two viewers with the
//     same userId share one principal and are told apart only by the
//     per-invocation isOwner gate (addProject, exportLegacyChecks).
//     Runtime population of these fields is NOT VERIFIED (STAGE-P02);
//     no provider statement about population semantics was found in
//     the repo — see SSRF_RESPONSE_MATRIX_V2325.md §2 F-058.
//   - Anonymous (no viewer at all) NO LONGER gets the '<LEGACY>'
//     saved-state sentinel by default (F-057, v2.3.25): a missing
//     viewer is fail-closed for saved state (read defaults, write
//     no-op), the same treatment Cloudflare non-owner viewers already
//     had (F-051). '<LEGACY>' rows are readable/writable ONLY in
//     explicit local single-owner mode (LOCAL_SINGLE_OWNER_MODE,
//     default OFF — a module flag like CHECKLINK_ENABLED; no env vars
//     exist in this runtime). DL-23-03's single-user-local rationale
//     survives ONLY behind that explicit opt-in, which must be provable
//     at runtime (STAGE-P02 extension) before any deployment enables
//     it. Checks are unchanged: anonymous never reads legacy check rows
//     (L-A, F-046). K-10 may tighten this later.
// ---------------------------------------------------------------------------

/** Sentinel principal for pre-migration saved_projects rows (D-01). */
const LEGACY_PRINCIPAL = "<LEGACY>";

/**
 * Sentinel principal used ONLY as a never-matching key when saved state
 * is disabled for a viewer (F-051): no setProjectState call ever writes
 * this principal, so a listProjects join against it can match nothing.
 */
const DISABLED_SAVED_PRINCIPAL = "<DISABLED-SHARE-VIEWER>";

/**
 * Derive the calling principal from the SDK viewer, or null when no
 * per-user identity is available. A Cloudflare NON-OWNER viewer has no
 * per-user identity (the shareId names the LINK, not the visitor) and
 * therefore resolves to null — never to `cloudflare:{shareId}` (F-051).
 *
 * F-058 (v2.3.25): for a LOCAL viewer the caller identity is `userId`,
 * NOT `ownerUserId`. The SDK 0.14.0 type
 * (`server-contract.d.ts`, tarball SHA-256
 * f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e)
 * declares LocalViewer { userId, ownerUserId, isOwner, delegate? } with
 * the doc comment "User identity verified by the local daemon, without
 * a share token" and delegate documented as "Native Muse delegation,
 * distinct from the owner's browser". The field NAME `userId` is the
 * per-caller identity; `ownerUserId` names the space owner. The old
 * `local:{ownerUserId}` mapping therefore collapsed distinct callers
 * under one owner into one principal. A delegated invocation is a
 * distinct actor (`local:delegate:{delegate}:{userId}`) and never shares
 * the direct caller's principal. An empty userId resolves to null
 * (fail-closed). What the TYPE does NOT prove — and no provider
 * statement in the repo proves — is how the runtime POPULATES these
 * fields (STAGE-P02): whether two local viewers can share one
 * ownerUserId with different userIds, or what userId a delegate
 * invocation carries. The mapping above is the most defensive reading
 * of the declared type; the runtime semantics stay NOT VERIFIED.
 */
function resolvePrincipal(ctx: Ctx): string | null {
  const viewer = ctx.viewer;
  if (!viewer) return null;
  if (viewer.source === "local") {
    if (!viewer.userId) return null;
    if (viewer.delegate === "agent" || viewer.delegate === "schedule") {
      return `local:delegate:${viewer.delegate}:${viewer.userId}`;
    }
    return `local:${viewer.userId}`;
  }
  if (viewer.source === "cloudflare") {
    if (viewer.isOwner === true) return `cloudflare-owner:${viewer.shareId}`;
    return null; // shared-link viewer: no per-user identity (F-051)
  }
  return null;
}

// ---------------------------------------------------------------------------
// Explicit local single-owner mode (F-057, v2.3.25).
// ---------------------------------------------------------------------------
// Default OFF: a missing viewer is fail-closed for saved state (see
// savedPrincipal below). The flag is module state on purpose — the same
// pattern as CHECKLINK_ENABLED (no env vars exist in this runtime, no
// settings table exists yet): enabling legacy saved state requires a
// code change + review, not a silent toggle. `setLocalSingleOwnerMode`
// is test-only; production code never calls it. A deployment may enable
// it ONLY when it can prove at runtime that it is a local single-owner
// deployment (STAGE-P02 extension) — until then legacy rows stay
// unreachable through the handlers, exactly as legacy CHECK rows stay
// unreachable through listChecks (L-A, F-046).
let LOCAL_SINGLE_OWNER_MODE = false;

/** Test-only setter for the local single-owner legacy mode (harness H-AN). */
export function setLocalSingleOwnerMode(enabled: boolean): void {
  LOCAL_SINGLE_OWNER_MODE = enabled;
}

/** Current local single-owner legacy mode (read-only for diagnostics/tests). */
export function isLocalSingleOwnerMode(): boolean {
  return LOCAL_SINGLE_OWNER_MODE;
}

/**
 * Principal used for saved_projects rows. Known principal -> its own id;
 * Cloudflare shared-link viewer -> null, meaning saved state is DISABLED
 * for that viewer (F-051): callers must not read or write saved state
 * for them. Anonymous (no viewer) -> null as well (F-057, v2.3.25):
 * saved state is fail-closed (read defaults, write no-op) UNLESS the
 * deployment explicitly opted into local single-owner mode, in which
 * case — and only then — the '<LEGACY>' sentinel (DL-23-03) is used so
 * pre-migration rows stay reachable on a proven single-owner box.
 * Returns null for every disabled case — callers must treat null as
 * "no saved state", never fall back to a shared sentinel themselves.
 */
function savedPrincipal(ctx: Ctx): string | null {
  const viewer = ctx.viewer;
  if (viewer?.source === "cloudflare" && viewer.isOwner !== true) return null;
  const principal = resolvePrincipal(ctx);
  if (principal !== null) return principal;
  return LOCAL_SINGLE_OWNER_MODE ? LEGACY_PRINCIPAL : null;
}

interface FetchResult {
  text: string;
  finalUrl: string;
  status: number;
  /** Hostname of every request in order — the redirect chain, as evidence. */
  chain: string[];
  /**
   * Freshness (H-CACHE-02): epoch ms when this text was fetched from the
   * network. Preserved from the cached entry on a cache hit, so a display
   * can show how old the served copy is. `fromCache` tells whether this
   * result came from the in-memory cache (true) or a fresh fetch (false).
   */
  fetchedAt: number;
  fromCache: boolean;
  /**
   * Exact decoded byte length of this text (F-054): stored per cache
   * entry so a cache hit can be charged to the current scan's aggregate
   * budget exactly like a network read. Set by fetchTextOnce from
   * readCappedStream; a hit reserves this many bytes via tryReserve
   * before the cached text is returned.
   */
  decodedBytes: number;
}

/**
 * Fetches a page following redirects MANUALLY (max 6 hops) so the full
 * redirect chain is recorded: a claim link that quietly hops across domains
 * (the exact 7 Nov 2026 drainer pattern) must show every hop, not just the
 * landing page. Returns null when the page cannot be fetched at all.
 */
// ---- Cache in-memory hasil fetch + RDAP (performa, S7) ----
// Cache hanya menyimpan hasil apa adanya (input sama -> output sama);
// tidak mengubah logika vonis. TTL singkat + ukuran dibatasi; saat penuh,
// entri terlama dihapus. Ini BUKAN kontrol keamanan (F-001/F-002/F-003
// tetap terbuka) — sekadar menghindari fetch keluar yang berulang.
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const FETCH_CACHE = new Map<string, CacheEntry<FetchResult>>();
const RDAP_CACHE = new Map<string, CacheEntry<RdapInfo>>();
const FETCH_CACHE_TTL_MS = 10 * 60_000;
const RDAP_CACHE_TTL_MS = 60 * 60_000;
const FETCH_CACHE_MAX = 50;
const RDAP_CACHE_MAX = 100;

function cacheGet<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
  max: number,
): void {
  if (cache.size >= max) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Ambil isi halaman mengikuti redirect, dengan cache + satu retry jaringan.
 * `deadline` (opsional) adalah sinyal deadline total pemeriksaan dari
 * `analyze()` — bila sudah aborted, tidak ada retry lagi.
 * `budget` (opsional) adalah ScanBudget pemeriksaan — dibagikan page +
 * semua redirect + semua script; bila tidak ada, dibuatkan satu baru
 * (dipakai hanya oleh jalur non-analyze).
 *
 * K-1 (F-001): guard berjalan SEBELUM cache — entri cache hanya dilayani
 * setelah URL-nya sendiri lolos kanonikalisasi + port + validasi DNS.
 * Cache hit tidak membuka koneksi baru, jadi preflight hanya memeriksa
 * ulang URL-nya (bukan rantai redirect yang tersimpan — rantai itu sudah
 * divalidasi saat di-fetch).
 */
/**
 * Cache key for page/script fetches (F-017): the key MUST include the
 * caller's byte cap — page (400_000) and script (300_000) callers share
 * URLs, and a URL-only key returned the wrong caller's capped text
 * (400 KB text to a 300 KB caller = cap bypass; 300 KB text to a 400 KB
 * caller = silent truncation). Key format: `${url}|${cap}`.
 */
function fetchCacheKey(url: string, cap: number): string {
  return `${url}|${cap}`;
}

/** Test-only injection for the fetch path (harness H-CACHE). */
interface FetchTestHooks {
  resolver?: Resolver;
  connector?: Connector;
}

/**
 * Fetches a URL as text with SSRF guard + streamed caps (see fetchTextOnce).
 * Only SUCCESSFUL results are cached (F-016 partial): a failure (`null`)
 * is never cached, so a re-check retries the network instead of replaying
 * a stale "unreachable" for the TTL — same policy as lookupRdap.
 *
 * Freshness (H-CACHE-02): the returned result carries `fetchedAt` (epoch
 * ms of the network fetch) and `fromCache` (true when served from cache),
 * so a display can show how old the served copy is.
 *
 * Re-check bypass (H-CACHE-04): `opts.forceFresh` skips the cache READ —
 * the guard preflight above still runs, and the fresh result still
 * refreshes the cache entry. It does NOT skip the guard, the caps, the
 * budget, or the deadline.
 *
 * Exported for harness verification (H-CACHE) — it is NOT an action; the
 * Actions map is the only invocable surface. `testHooks` is a test-only
 * injection point for a stub resolver/connector; production callers omit
 * it and the real guard path is used.
 */
export async function fetchText(
  url: string,
  cap: number,
  deadline?: AbortSignal,
  budget?: ScanBudget,
  testHooks?: FetchTestHooks,
  opts?: { forceFresh?: boolean; allowedOrigin?: string },
): Promise<FetchResult | null> {
  // F-052: an already-aborted total deadline ends the fetch BEFORE any
  // cache read — no cached copy is served after the scan is over.
  if (deadline?.aborted) return null;
  // F-052: the total deadline is passed into the preflight, so DNS
  // cannot outlive the scan (validateUrlForFetch races the resolver
  // against it).
  const preflight = await validateUrlForFetch(
    url,
    testHooks?.resolver
      ? { resolver: testHooks.resolver, deadline }
      : { deadline },
  );
  if (!preflight.ok) return null;
  const key = fetchCacheKey(url, cap);
  if (opts?.forceFresh !== true) {
    const cached = cacheGet(FETCH_CACHE, key);
    // H-CACHE-02: the cached entry keeps its original fetchedAt; only the
    // fromCache flag flips, so the caller can tell a cached copy apart.
    if (cached !== undefined) {
      // F-054: a cache hit is charged to the CURRENT scan's aggregate
      // budget exactly like a network read — cached bytes are not free.
      // The entry stores its exact decoded length; a caller without a
      // budget gets a fresh one (a single entry can never exceed the
      // cap on its own). When the reserve fails the hit is NOT served
      // and no network retry is attempted (a fresh fetch would fail
      // the same aggregate check) — null, like an aggregate-cap failure.
      const scanBudget = budget ?? createScanBudget();
      const bytes = cached.decodedBytes ?? Buffer.byteLength(cached.text, "utf-8");
      if (!tryReserve(scanBudget, bytes)) return null;
      return { ...cached, fromCache: true };
    }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (deadline?.aborted) return null;
    }
    const result = await fetchTextOnce(url, cap, deadline, budget, testHooks, opts);
    if (result !== null) {
      cacheSet(FETCH_CACHE, key, result, FETCH_CACHE_TTL_MS, FETCH_CACHE_MAX);
      return result;
    }
    if (deadline?.aborted) return null;
  }
  return null;
}

/** Media types the scanner reads as text. Anything else is not downloaded. */
function isScannableContentType(contentType: string): boolean {
  const media = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (media.startsWith("text/")) return true;
  if (media === "application/xhtml+xml") return true;
  if (media === "application/xml") return true;
  if (media === "application/json" || media.endsWith("+json")) return true;
  return false;
}

function parseContentLength(value: string | null): number | null {
  if (value === null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function destroyBody(body: { destroy(): void }): void {
  try {
    body.destroy();
  } catch {
    /* already closed — ignore */
  }
}

async function fetchTextOnce(
  url: string,
  cap: number,
  deadline?: AbortSignal,
  budget?: ScanBudget,
  testHooks?: FetchTestHooks,
  opts?: { allowedOrigin?: string },
): Promise<FetchResult | null> {
  const chain: string[] = [];
  let current = url;
  const scanBudget = budget ?? createScanBudget();
  try {
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      // F-056: when an allowed origin is set (script fetches), EVERY hop
      // — including the first URL — must stay on that origin. A
      // same-origin script endpoint that redirects cross-origin is
      // rejected BEFORE the second-hop connection is opened. Checked
      // here, before fetchGuardedOnce, so a cross-origin redirect target
      // is never even validated/connected.
      if (opts?.allowedOrigin !== undefined) {
        let origin: string;
        try {
          origin = new URL(current).origin;
        } catch {
          return null;
        }
        if (origin !== opts.allowedOrigin) return null;
      }
      // F-052: never start a new hop after the total deadline fired.
      if (deadline?.aborted) return null;
      chain.push(new URL(current).hostname.toLowerCase());
      // F-001: every hop is re-validated in full (canonicalize + port +
      // resolve ALL + validate ALL + pinned connect) by fetchGuardedOnce.
      const guarded = await fetchGuardedOnce(current, {
        deadline,
        resolver: testHooks?.resolver,
        connector: testHooks?.connector,
      });
      if (guarded === null) return null;
      if ([301, 302, 303, 307, 308].includes(guarded.status)) {
        const loc = guarded.headers.get("location");
        // Redirect bodies are discarded WITHOUT being read.
        destroyBody(guarded.body);
        if (!loc) return null;
        current = new URL(loc, current).toString();
        continue;
      }
      // Content-Type gate (§A.5 note): clearly non-HTML/text bodies are
      // not downloaded at all ("unsupported content type", not a verdict).
      const contentType = guarded.headers.get("content-type");
      if (contentType !== null && !isScannableContentType(contentType)) {
        destroyBody(guarded.body);
        return null;
      }
      // F-002/F-003: streamed read with L0 wire cap + L1 decoded cap +
      // shared aggregate budget. Partial results are NEVER returned —
      // readCappedStream throws and the whole fetch fails (null).
      const { text, decodedBytes } = await readCappedStream(guarded.body, {
        contentEncoding: guarded.headers.get("content-encoding"),
        contentLength: parseContentLength(guarded.headers.get("content-length")),
        compressedCap: cap,
        decompressedCap: cap,
        budget: scanBudget,
        signal: deadline ?? AbortSignal.timeout(TOTAL_DEADLINE_MS),
      });
      return { text, finalUrl: current, status: guarded.status, chain, fetchedAt: Date.now(), fromCache: false, decodedBytes };
    }
    return null; // redirect loop or too many hops — treat as unreachable
  } catch {
    return null;
  }
}

interface RdapInfo {
  registeredAt: string | null;
  registrar: string | null;
}

/**
 * RDAP dengan cache + satu retry jaringan. Hanya respons sukses yang
 * di-cache; kegagalan tidak di-cache supaya cek ulang langsung mencoba
 * lagi. `deadline` sama seperti di `fetchText`.
 */
async function lookupRdap(domain: string, deadline?: AbortSignal, testHooks?: FetchTestHooks): Promise<RdapInfo> {
  // F-052: never serve (or start) RDAP work after the total deadline.
  if (deadline?.aborted) return { registeredAt: null, registrar: null };
  const cached = cacheGet(RDAP_CACHE, domain);
  if (cached !== undefined) return cached;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (deadline?.aborted) break;
    }
    const result = await lookupRdapOnce(domain, deadline, testHooks);
    if (result.registeredAt !== null || result.registrar !== null) {
      cacheSet(RDAP_CACHE, domain, result, RDAP_CACHE_TTL_MS, RDAP_CACHE_MAX);
      return result;
    }
    if (deadline?.aborted) break;
  }
  return { registeredAt: null, registrar: null };
}

async function lookupRdapOnce(domain: string, deadline?: AbortSignal, testHooks?: FetchTestHooks): Promise<RdapInfo> {
  // F-001f: RDAP goes through the SAME guard as pages — manual redirect
  // loop, every hop re-validated. The old `redirect: "follow"` followed
  // redirects to ANY host without validation. Body is read capped
  // (RDAP_DECODED_CAP) with its own budget — L3 aggregate per design
  // covers page + redirects + scripts only; RDAP is bounded separately.
  const rdapBudget = createScanBudget(RDAP_DECODED_CAP);
  let current = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  try {
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const guarded = await fetchGuardedOnce(current, {
        deadline,
        accept: GUARD_ACCEPT_RDAP,
        resolver: testHooks?.resolver,
        connector: testHooks?.connector,
      });
      if (guarded === null) return { registeredAt: null, registrar: null };
      if ([301, 302, 303, 307, 308].includes(guarded.status)) {
        const loc = guarded.headers.get("location");
        destroyBody(guarded.body);
        if (!loc) return { registeredAt: null, registrar: null };
        current = new URL(loc, current).toString();
        continue;
      }
      if (guarded.status < 200 || guarded.status >= 300) {
        destroyBody(guarded.body);
        return { registeredAt: null, registrar: null };
      }
      const { text } = await readCappedStream(guarded.body, {
        contentEncoding: guarded.headers.get("content-encoding"),
        contentLength: parseContentLength(guarded.headers.get("content-length")),
        compressedCap: RDAP_DECODED_CAP,
        decompressedCap: RDAP_DECODED_CAP,
        budget: rdapBudget,
        signal: deadline ?? AbortSignal.timeout(TOTAL_DEADLINE_MS),
      });
      const data: any = JSON.parse(text);
      let registeredAt: string | null = null;
      if (Array.isArray(data?.events)) {
        for (const ev of data.events) {
          if (ev?.eventAction === "registration" && typeof ev?.eventDate === "string") {
            registeredAt = ev.eventDate;
            break;
          }
        }
      }
      let registrar: string | null = null;
      if (Array.isArray(data?.entities)) {
        const reg = data.entities.find(
          (e: any) => Array.isArray(e?.roles) && e.roles.includes("registrar"),
        );
        const vcard: any[] = Array.isArray(reg?.vcardArray?.[1]) ? reg.vcardArray[1] : [];
        for (const field of vcard) {
          if (Array.isArray(field) && field[0] === "fn" && typeof field[3] === "string") {
            registrar = field[3];
            break;
          }
        }
      }
      return { registeredAt, registrar };
    }
    return { registeredAt: null, registrar: null }; // too many redirects
  } catch {
    return { registeredAt: null, registrar: null };
  }
}

// Pre-compiled (module-level): regex di bawah dipakai di setiap
// pemeriksaan; di-compile sekali saat modul dimuat, bukan per panggilan.
// Semua regex /g di sini hanya dipakai lewat `.match()` (yang me-reset
// lastIndex), jadi aman dipakai ulang antar panggilan.
const EVM_ADDRESS_RE = /0x[a-fA-F0-9]{40}/g;
const ZERO_ADDRESS_RE = /^0x0{40}$/;
const ZERO_RUN_RE = /0/g;
const TOKEN_ASSIGN_RE = /TOKEN_ADDRESS["']?\s*[:=]\s*["']([1-9A-HJ-NP-Za-km-z]{32,44})["']/g;
const TOKEN_ASSIGN_ADDR_RE = /([1-9A-HJ-NP-Za-km-z]{32,44})["']$/;
const SOLANA_CANDIDATE_RE = /\b[1-9A-HJ-NP-Za-km-z]{36,44}\b/g;
const MALFORMED_RE = /(?<![0-9a-zA-Z])0x[0-9a-zA-Z]{30,48}(?![0-9a-zA-Z])/g;
const VALID_EVM_RE = /^0x[a-fA-F0-9]{40}$/;

function extractContracts(
  fullText: string,
  htmlOnly: string,
): { contracts: Contract[]; malformed: string[] } {
  const found = new Map<string, Contract>();
  const evm = fullText.match(EVM_ADDRESS_RE) ?? [];
  for (const addr of evm) {
    if (ZERO_ADDRESS_RE.test(addr)) continue;
    // Mostly-zero values are counters/padding in page data, not contracts.
    if ((addr.slice(2).match(ZERO_RUN_RE) ?? []).length > 20) continue;
    found.set(addr.toLowerCase(), { chain: "evm", address: addr });
  }
  // Solana: explicit TOKEN_ADDRESS assignment first (high confidence).
  const tokenAssign = fullText.match(TOKEN_ASSIGN_RE) ?? [];
  for (const m of tokenAssign) {
    const addr = m.match(TOKEN_ASSIGN_ADDR_RE)?.[1];
    if (addr) found.set(addr, { chain: "solana", address: addr });
  }
  // Solana: bare base58 candidates from the page markup itself (NOT from
  // fetched script bundles — minified JS is full of base58-shaped noise).
  // A real pubkey looks random; minified identifiers repeat substrings.
  const candidates = htmlOnly.match(SOLANA_CANDIDATE_RE) ?? [];
  for (const cand of candidates) {
    if (!/[0-9]/.test(cand) || !/[a-z]/.test(cand) || !/[A-Z]/.test(cand)) continue;
    // Chunk 4 karakter yang sudah didedup: predikatnya persis sama dengan
    // sebelumnya (chunk yang muncul >= 3 kali tanpa overlap), tapi tanpa
    // pemindaian berulang per posisi — `split` per chunk adalah O(n) per
    // chunk, sedangkan di sini tiap chunk unik hanya dipindai sekali.
    let repeated = false;
    const seenChunks = new Set<string>();
    for (let i = 0; i + 4 <= cand.length && !repeated; i++) {
      const chunk = cand.slice(i, i + 4);
      if (seenChunks.has(chunk)) continue;
      seenChunks.add(chunk);
      let occurrences = 0;
      let from = 0;
      let at = cand.indexOf(chunk, from);
      while (at !== -1) {
        occurrences++;
        if (occurrences >= 3) {
          repeated = true;
          break;
        }
        from = at + chunk.length;
        at = cand.indexOf(chunk, from);
      }
    }
    if (repeated) continue;
    if (found.has(cand)) continue;
    found.set(cand, { chain: "solana", address: cand });
    if (found.size >= 8) break;
  }
  // Malformed look-alikes: 0x-prefixed strings of ADDRESS-LIKE length that
  // are NOT a valid EVM address (wrong hex length, or non-hex characters).
  // A scammer page often pastes a fake/broken "contract" purely as
  // decoration. Deliberately narrow: strings far from 42 chars are data
  // values, not address look-alikes, and mostly-zero hex is a number
  // (amounts, timestamps), never an address.
  const malformed: string[] = [];
  const malformedSeen = new Set<string>();
  for (const m of fullText.match(MALFORMED_RE) ?? []) {
    if (VALID_EVM_RE.test(m)) continue; // valid — handled above
    const hexPart = m.slice(2);
    if ((hexPart.match(/0/g) ?? []).length > hexPart.length * 0.4) continue;
    if (malformedSeen.has(m)) continue;
    malformedSeen.add(m);
    malformed.push(m.length > 24 ? `${m.slice(0, 24)}…` : m);
    if (malformed.length >= 3) break;
  }
  return { contracts: [...found.values()].slice(0, 8), malformed };
}

interface Analysis {
  verdict: Verdict;
  score: number;
  signals: Signal[];
  contracts: Contract[];
  pageTitle: string | null;
  finalUrl: string | null;
  httpStatus: number | null;
  registeredAt: string | null;
  registrar: string | null;
  domainAgeDays: number | null;
}

/**
 * F-053: typed timeout signal. `analyze` THROWS this (instead of
 * returning a partial Analysis) when the total deadline fires at any
 * checkpoint — runCheck converts it into an explicit, retryable timeout
 * error and inserts NO checks row. A timeout is "not a verdict".
 */
export class ScanTimeoutError extends Error {
  constructor() {
    super("Pemeriksaan kehabisan waktu (batas 20 detik) sebelum selesai.");
    this.name = "ScanTimeoutError";
  }
}

/** Throw ScanTimeoutError when the scan's total deadline has fired. */
function throwIfDeadlineAborted(deadline: AbortSignal): void {
  if (deadline.aborted) throw new ScanTimeoutError();
}

async function analyze(input: URL, opts?: { forceFresh?: boolean; testHooks?: FetchTestHooks }): Promise<Analysis> {
  const hostname = input.hostname.toLowerCase();
  const domain = registrableDomain(hostname);
  const signals: Signal[] = [];
  let score = 0;

  // Deadline total per pemeriksaan (F-003): 20 DETIK untuk semua fetch
  // keluar (RDAP + page + semua redirect + semua script) — keputusan
  // pemilik v2 (§A.5, syarat cutover). Nilai 30 detik di kode lama BUKAN
  // keputusan pemilik (koreksi F-041 atas v2.3.19 §3.3). Toleransi
  // staging +2 detik (K-3). Per-fetch 12 detik tetap sebagai batas DI
  // DALAM anggaran total. Bila deadline tercapai, hasil pemeriksaan
  // adalah "tidak selesai (timeout)" — BUKAN vonis — dan tidak ada baris
  // checks yang menyimpan hasil parsial (lihat runCheck).
  const deadline = AbortSignal.timeout(TOTAL_DEADLINE_MS);

  // SATU ScanBudget per pemeriksaan (F-002/F-039): page + semua redirect
  // + semua script berbagi aggregate cap 1.000.000 decoded bytes.
  const budget = createScanBudget();

  // Set lookup O(1): hostname === d atau domain (registrable) === d sudah
  // mencakup kasus hostname berakhiran `.d` untuk daftar ini.
  const knownBad = isKnownBadDomain(hostname) || isKnownBadDomain(domain);
  if (knownBad) {
    score += 100;
    signals.push({
      id: "known_bad",
      status: "bahaya",
      label: "Domain ini sudah terbukti menguras wallet",
      detail:
        "Tercatat dari kejadian 7 Nov 2026: link klaim airdrop palsu yang mengarahkan ke halaman connect wallet dan menguras isi wallet Solana dalam satu transaksi. Jangan buka, jangan connect wallet apa pun ke domain ini.",
    });
  }

  const [rdap, page] = await Promise.all([
    lookupRdap(domain, deadline, opts?.testHooks),
    fetchText(input.toString(), PAGE_DECODED_CAP, deadline, budget, opts?.testHooks, {
      forceFresh: opts?.forceFresh ?? false,
    }),
  ]);

  // F-053: the deadline may have fired while RDAP/page were in flight —
  // a timeout is NOT a verdict: throw (no Analysis, no checks row)
  // instead of scoring partial/unreachable results as if complete.
  throwIfDeadlineAborted(deadline);

  // --- Domain age (RDAP) ---
  let domainAgeDays: number | null = null;
  if (rdap.registeredAt) {
    const regMs = Date.parse(rdap.registeredAt);
    if (!Number.isNaN(regMs)) {
      domainAgeDays = Math.max(0, Math.floor((Date.now() - regMs) / 86_400_000));
    }
  }
  if (domainAgeDays === null) {
    signals.push({
      id: "domain_age",
      status: "info",
      label: "Umur domain tidak diketahui",
      detail: "Data pendaftaran domain tidak ditemukan di RDAP, jadi sinyal ini tidak bisa dinilai.",
    });
  } else if (domainAgeDays < 30) {
    score += 35;
    signals.push({
      id: "domain_age",
      status: "bahaya",
      label: `Domain baru berumur ${domainAgeDays} hari`,
      detail: `Terdaftar ${rdap.registeredAt}${rdap.registrar ? ` lewat ${rdap.registrar}` : ""}. Situs klaim airdrop yang domainnya baru berumur hitungan hari adalah pola klasik situs drainer: dibuat cepat, dipakai sebentar, lalu dibuang.`,
    });
  } else if (domainAgeDays < 180) {
    score += 15;
    signals.push({
      id: "domain_age",
      status: "waspada",
      label: `Domain masih muda (${domainAgeDays} hari)`,
      detail: `Terdaftar ${rdap.registeredAt}${rdap.registrar ? ` lewat ${rdap.registrar}` : ""}. Belum cukup tua untuk dianggap mapan; tetap hati-hati.`,
    });
  } else {
    signals.push({
      id: "domain_age",
      status: "aman",
      label: `Domain sudah berumur ${domainAgeDays} hari`,
      detail: `Terdaftar ${rdap.registeredAt}${rdap.registrar ? ` lewat ${rdap.registrar}` : ""}. Umur domain yang panjang bukan jaminan aman, tapi bukan pola situs sekali pakai.`,
    });
  }

  // --- HTTPS ---
  if (input.protocol !== "https:") {
    score += 15;
    signals.push({
      id: "https",
      status: "waspada",
      label: "Link tidak memakai HTTPS",
      detail: "Situs Web3 yang sah selalu memakai HTTPS. Link http polos patut dicurigai.",
    });
  }

  // --- Page scan ---
  let pageTitle: string | null = null;
  let finalUrl: string | null = null;
  let httpStatus: number | null = null;
  let contracts: Contract[] = [];

  if (!page) {
    signals.push({
      id: "reachable",
      status: "info",
      label: "Situs tidak bisa dijangkau saat dicek",
      detail: "Halamannya tidak merespons dari server pemeriksa, jadi isi halaman tidak bisa dinilai. Itu bukan bukti aman — situs drainer sering hanya hidup sebentar.",
    });
  } else {
    finalUrl = page.finalUrl;
    httpStatus = page.status;
    const html = page.text;
    pageTitle = html.match(/<title[^>]*>([^<]{1,160})<\/title>/i)?.[1]?.trim() ?? null;

    // The known-drainer list applies to EVERY hop, not just the pasted
    // domain: a clean-looking link that redirects through solbarn.cc or
    // sharkmoon.tech is the same drainer wearing a different front door.
    const chainHitsBad =
      !knownBad &&
      page.chain.some(
        (h) => isKnownBadDomain(h) || isKnownBadDomain(registrableDomain(h)),
      );
    if (chainHitsBad) {
      score += 100;
      signals.push({
        id: "known_bad_redirect",
        status: "bahaya",
        label: "Rantai redirect melewati domain drainer yang terbukti",
        detail: `Link ini memang bukan ${[...KNOWN_BAD_DOMAINS].join(" / ")} secara langsung, tapi rantai redirect-nya melewati salah satu domain itu (${page.chain.join(" → ")}). Keduanya tercatat menguras wallet pada kejadian 7 Nov 2026. Jangan lanjutkan, jangan connect wallet.`,
      });
    }

    // Redirect chain evidence: where did the link actually take us?
    try {
      const finalHost = new URL(page.finalUrl).hostname.toLowerCase();
      const chainText = page.chain.join(" → ");
      if (registrableDomain(finalHost) !== domain) {
        score += 20;
        signals.push({
          id: "redirect",
          status: "bahaya",
          label: "Link berbelok ke domain lain",
          detail: `Rantai redirect: ${chainText}. Kamu memasukkan domain ${domain}, tapi halaman berakhir di ${finalHost}. Pola persis kejadian 7 Nov 2026: link awal terlihat biasa, lalu diarahkan ke domain lain tempat connect wallet diminta.`,
        });
      } else if (page.chain.length >= 3) {
        score += 10;
        signals.push({
          id: "redirect",
          status: "waspada",
          label: `Rantai redirect panjang (${page.chain.length - 1} kali berbelok)`,
          detail: `Rantai redirect: ${chainText}. Banyak belokan sebelum halaman tampil sering dipakai untuk menyamarkan tujuan akhir dan menghindari pemindai sederhana, walau domain akhirnya sama.`,
        });
      }
    } catch {
      /* final URL unparsable — ignore */
    }

    // Fetch up to 3 script files referenced by the page for deeper signals.
    // SERIAL, satu reader aktif (F-039): dengan R = 1, batas transient
    // A2 menjadi 1 x C_max — satu chunk saja. Trade-off latensi terukur
    // ~6 ms pada fixture lokal (v2.3.20) — jauh di bawah deadline 20 detik.
    // F-001e: SAME-ORIGIN saja — script lintas origin tidak di-fetch.
    const scriptSrcs = [...new Set(
      [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
        .map((m) => m[1])
        .filter((src): src is string => typeof src === "string" && src.length > 0)
        .slice(0, MAX_SCRIPTS_PER_PAGE),
    )];
    const scriptTexts: string[] = [];
    const pageOrigin = new URL(page.finalUrl).origin;
    for (const src of scriptSrcs) {
      // F-052: never start another script fetch after the deadline fired.
      throwIfDeadlineAborted(deadline);
      try {
        const abs = new URL(src, page.finalUrl).toString();
        if (new URL(abs).origin !== pageOrigin) continue; // lintas origin — skip
        // F-056: the allowed origin is enforced on EVERY redirect hop
        // inside fetchText — a same-origin script that redirects
        // cross-origin is rejected before the second-hop connection.
        const s = await fetchText(abs, SCRIPT_DECODED_CAP, deadline, budget, opts?.testHooks, {
          allowedOrigin: pageOrigin,
        });
        scriptTexts.push(s ? s.text : "");
      } catch (err) {
        // F-053: a deadline abort inside a script fetch is a timeout,
        // not a skippable script failure — propagate it.
        if (err instanceof ScanTimeoutError) throw err;
        // skip bad script URL
      }
    }
    const scriptText = scriptTexts.join("\n");
    const haystack = `${html}\n${scriptText}`;
    const lower = haystack.toLowerCase();

    // Wallet connect request.
    const asksConnect =
      /connect\s*(your\s*)?wallet/i.test(haystack) ||
      lower.includes("window.solana") ||
      lower.includes("window.ethereum") ||
      lower.includes("walletconnect") ||
      lower.includes("eth_requestaccounts");
    if (asksConnect) {
      score += 15;
      signals.push({
        id: "wallet_connect",
        status: "waspada",
        label: "Halaman meminta connect wallet",
        detail: "Ada tombol/kode connect wallet di halaman ini. Connect sendiri tidak memindahkan dana, tapi ini pintu masuknya: setelah connect, situs bisa meminta tanda tangan transaksi yang menguras wallet. Jangan pernah connect wallet utama ke situs yang belum terbukti.",
      });
    } else {
      signals.push({
        id: "wallet_connect",
        status: "aman",
        label: "Tidak ditemukan permintaan connect wallet",
        detail: "Tidak ada tombol connect wallet atau kode wallet yang terdeteksi di halaman maupun script-nya.",
      });
    }

    // Transaction-signing capability in code.
    const canSign =
      lower.includes("signtransaction") ||
      lower.includes("signalltransactions") ||
      lower.includes("signand sendtransaction") ||
      lower.includes("eth_sign") ||
      lower.includes("personalsign") ||
      lower.includes("signtypeddata");
    if (canSign) {
      score += 20;
      signals.push({
        id: "signing",
        status: "bahaya",
        label: "Kode halaman bisa meminta tanda tangan transaksi",
        detail: "Di dalam script halaman ditemukan fungsi penandatanganan transaksi. Di tangan situs palsu, satu tanda tangan dari kamu cukup untuk memindahkan isi wallet — persis mekanisme drainer.",
      });
    }

    // Contracts / token addresses — with format validation and a
    // chain-consistency check: does the address family on the page match
    // the chain the page claims to run on?
    const extracted = extractContracts(haystack, html);
    contracts = extracted.contracts;
    const evmCount = contracts.filter((c) => c.chain === "evm").length;
    const solCount = contracts.filter((c) => c.chain === "solana").length;
    const claimsSolana = /\bsolana\b/i.test(haystack);
    const claimsEvm = /bnb chain|binance smart chain|\bbsc\b|ethereum/i.test(haystack);
    const chainMismatch =
      (solCount > 0 && evmCount === 0 && claimsEvm && !claimsSolana) ||
      (evmCount > 0 && solCount === 0 && claimsSolana && !claimsEvm);
    const looksLikeClaim =
      /airdrop|claim|free\s*mint|giveaway|eligibility/i.test(haystack);
    if (chainMismatch) {
      score += 10;
      signals.push({
        id: "contract_mismatch",
        status: "waspada",
        label: "Alamat yang ditampilkan tidak sesuai chain yang diklaim",
        detail: `Halaman ini mengklaim berjalan di ${claimsSolana ? "Solana" : "jaringan EVM (BNB Chain/Ethereum)"}, tapi alamat yang ditampilkan berformat ${solCount > 0 ? "Solana (base58)" : "EVM (0x + 40 heksadesimal)"}. Alamat tempelan yang tidak cocok dengan chain-nya adalah tanda halaman rakitan penipu — proyek asli menampilkan alamat yang benar-benar bisa dibuka di explorer chain-nya.`,
      });
    } else if (contracts.length > 0) {
      signals.push({
        id: "contract",
        status: "aman",
        label: `Alamat kontrak/token ditampilkan & formatnya valid (${contracts.length})`,
        detail: `Setiap alamat lolos pemeriksaan format: ${contracts
          .map(
            (c) =>
              `${c.address.slice(0, 10)}… (${c.chain === "evm" ? "EVM: 0x + 40 karakter heksadesimal — valid" : "Solana: base58 32–44 karakter — valid"})`,
          )
          .join(", ")}. Halaman ini terbuka soal alamat kontrak/token-nya — kamu bisa memeriksanya di explorer lewat daftar di bawah. Itu tanda transparansi, walau bukan jaminan tokennya berharga.`,
      });
    } else if (extracted.malformed.length > 0) {
      score += 10;
      signals.push({
        id: "contract_malformed",
        status: "waspada",
        label: "Ada alamat mirip kontrak, tapi formatnya rusak",
        detail: `Ditemukan string mirip alamat kontrak yang TIDAK valid formatnya: ${extracted.malformed.join(", ")}. Alamat EVM yang sah selalu 0x + tepat 40 karakter heksadesimal. "Kontrak" pajangan yang rusak seperti ini dipakai supaya halaman terlihat meyakinkan tanpa bisa diverifikasi.`,
      });
    } else if (looksLikeClaim) {
      score += 20;
      signals.push({
        id: "contract",
        status: "waspada",
        label: "Mengaku airdrop, tapi tidak ada alamat kontrak",
        detail: "Halaman ini menjanjikan klaim/airdrop tapi tidak menampilkan satu pun alamat kontrak token yang bisa diverifikasi. Proyek asli selalu bisa menunjukkan kontraknya.",
      });
    } else {
      signals.push({
        id: "contract",
        status: "info",
        label: "Tidak ditemukan alamat kontrak",
        detail: "Tidak ada alamat kontrak EVM atau Solana di halaman ini.",
      });
    }

    // Bait language.
    if (looksLikeClaim) {
      score += 10;
      signals.push({
        id: "bait",
        status: "waspada",
        label: "Bahasa iming-iming klaim/airdrop gratis",
        detail: "Halaman memakai kata-kata klaim, airdrop, atau token gratis. Itu umpan paling umum: korban dijanjikan menerima, padahal yang terjadi justru wallet-nya yang diambil.",
      });
    } else {
      signals.push({
        id: "bait",
        status: "aman",
        label: "Tidak ada iming-iming klaim gratis",
        detail: "Halaman tidak menjanjikan airdrop atau token gratis.",
      });
    }

    // Obfuscated code.
    const atobCount = (haystack.match(/atob\s*\(/g) ?? []).length;
    const evalPattern = "ev" + "al(";
    if (atobCount >= 1 && /onclick\s*=\s*"[^"]*atob/i.test(html) || atobCount >= 3 || lower.includes(evalPattern)) {
      score += 15;
      signals.push({
        id: "obfuscation",
        status: "waspada",
        label: "Ada kode yang disamarkan (obfuscated)",
        detail: "Tombol/script halaman memakai penyandian atob/eval untuk menyembunyikan fungsi aslinya. Situs yang jujur tidak perlu menyembunyikan apa yang terjadi saat kamu klik.",
      });
    }

    // Official/social links.
    const hasSocial =
      /(x\.com|twitter\.com|t\.me|telegram\.me|discord\.gg|discord\.com|github\.com)\//i.test(html);
    if (hasSocial) {
      signals.push({
        id: "social",
        status: "aman",
        label: "Ada tautan resmi (X/Telegram/Discord/GitHub)",
        detail: "Halaman menautkan akun resmi yang bisa kamu silang-cek dengan pengumuman proyek.",
      });
    } else {
      score += 10;
      signals.push({
        id: "social",
        status: "waspada",
        label: "Tidak ada tautan resmi sama sekali",
        detail: "Tidak ditemukan tautan X, Telegram, Discord, atau GitHub. Halaman klaim tanpa identitas resmi apa pun sulit diverifikasi dan mudah dibuat anonim.",
      });
    }
  }

  // Per-signal evidence clarity: append the exact score effect to every
  // signal's detail, so the visitor sees not just WHAT was found but WHY it
  // moves the verdict. Keys are `${signalId}:${status}`.
  const IMPACT: Record<string, string> = {
    "known_bad:bahaya": "+100 poin — domain drainer yang terbukti, otomatis divonis BAHAYA",
    "known_bad_redirect:bahaya":
      "+100 poin — rantai redirect menyentuh domain drainer, otomatis divonis BAHAYA",
    "domain_age:bahaya": "+35 poin risiko",
    "domain_age:waspada": "+15 poin risiko",
    "domain_age:aman": "0 poin — umur domain yang panjang tidak menambah risiko",
    "domain_age:info": "0 poin — sinyal ini tidak bisa dinilai",
    "https:waspada": "+15 poin risiko",
    "redirect:bahaya": "+20 poin risiko",
    "redirect:waspada": "+10 poin risiko",
    "wallet_connect:waspada": "+15 poin risiko",
    "wallet_connect:aman": "0 poin — tidak ditemukan permintaan connect wallet",
    "signing:bahaya": "+20 poin risiko",
    "contract:aman": "0 poin — alamat valid dan terbuka mengurangi kecurigaan",
    "contract:waspada": "+20 poin risiko",
    "contract:info": "0 poin — sinyal netral",
    "contract_mismatch:waspada": "+10 poin risiko",
    "contract_malformed:waspada": "+10 poin risiko",
    "bait:waspada": "+10 poin risiko",
    "bait:aman": "0 poin — tidak ada iming-iming klaim gratis",
    "obfuscation:waspada": "+15 poin risiko",
    "social:waspada": "+10 poin risiko",
    "social:aman": "0 poin — identitas resmi bisa disilang-cek",
    "reachable:info": "0 poin — isi halaman tidak bisa dinilai",
  };
  for (const s of signals) {
    const impact = IMPACT[`${s.id}:${s.status}`];
    if (impact) s.detail = `${s.detail} Dampak skor: ${impact}.`;
  }

  let verdict: Verdict;
  if (score >= 50) verdict = "bahaya";
  else if (score >= 20) verdict = "waspada";
  else if (!page && domainAgeDays === null && !knownBad) verdict = "tidak_diketahui";
  else verdict = "lebih_aman";

  // F-053 (final gate): never return an Analysis after the deadline
  // fired — even if every fetch above happened to settle first.
  throwIfDeadlineAborted(deadline);

  return {
    verdict,
    score: Math.min(score, 100),
    signals,
    contracts,
    pageTitle,
    finalUrl,
    httpStatus,
    registeredAt: rdap.registeredAt,
    registrar: rdap.registrar,
    domainAgeDays,
  };
}

function rowToCheck(row: typeof schema.checks.$inferSelect): Check {
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    verdict: row.verdict,
    score: row.score,
    signals: signalSchema.array().parse(JSON.parse(row.signals)),
    contracts: contractSchema.array().parse(JSON.parse(row.contracts)),
    page_title: row.pageTitle,
    final_url: row.finalUrl,
    http_status: row.httpStatus,
    registered_at: row.registeredAt,
    registrar: row.registrar,
    domain_age_days: row.domainAgeDays,
    checked_at: row.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Link Scanner kill-switch (F-019).
// ---------------------------------------------------------------------------
// Server-side runtime control for checkLink: while the flag is false the
// scan entry point (runCheck) rejects BEFORE any rate-limit, lease, fetch
// or DB write — the disabled state is enforced by code, not by a label.
// Default DISABLED on this branch (development): the scanner must not
// run until its gates are cleared and an explicit enable decision is
// recorded. The flag is module state on purpose (no env vars exist in
// this runtime, no settings table exists yet): flipping it requires a
// code change + review, not a silent toggle. `setCheckLinkEnabled` is
// test-only; production code never calls it.
let CHECKLINK_ENABLED = false;

/** Current kill-switch state (read-only for diagnostics/tests). */
export function isCheckLinkEnabled(): boolean {
  return CHECKLINK_ENABLED;
}

/** Test-only setter for the kill-switch (harness H-KILL). */
export function setCheckLinkEnabled(enabled: boolean): void {
  CHECKLINK_ENABLED = enabled;
}

/**
 * Runs one full link check and stores the result row.
 *
 * Exported for harness verification (H-KILL/H-CACHE) — it is NOT an
 * action; the Actions map is the only invocable surface. `opts.testHooks`
 * is a test-only injection point for a stub resolver/connector (used by
 * hermetic harnesses so no real network is touched); production callers
 * omit it. `opts.forceFresh` is the re-check bypass (H-CACHE-04).
 */
export async function runCheck(
  ctx: Ctx,
  rawUrl: string,
  opts?: { forceFresh?: boolean; testHooks?: FetchTestHooks },
): Promise<Check> {
  // F-019 kill-switch: reject BEFORE any work (no rate-limit/lease
  // consumed, no fetch, no row) with a clear error — never silently run.
  if (!CHECKLINK_ENABLED) {
    throw new Error(
      "Pemeriksa tautan sedang nonaktif. Fitur Cek Link dimatikan sementara untuk perbaikan keamanan (F-019) — belum bisa memeriksa link.",
    );
  }
  const input = normalizeUrl(rawUrl);
  const domain = registrableDomain(input.hostname.toLowerCase());
  const db = ctx.db<typeof schema>();
  const principal = resolvePrincipal(ctx) ?? ANONYMOUS_RATE_BUCKET;
  // F-003c: per-principal rate limit, then global concurrency lease.
  // Both fail CLOSED — a denied scan stores NO check row and performs
  // NO outbound fetch.
  const rate = await checkRateLimit(db, principal);
  if (!rate.allowed) {
    throw new Error(
      rate.reason === "rate-limit-minute"
        ? "Terlalu banyak pemeriksaan — coba lagi sebentar lagi."
        : "Batas pemeriksaan per jam tercapai — coba lagi nanti.",
    );
  }
  const lease = await acquireScanSlot(db, principal);
  if (!lease.acquired) {
    throw new Error("Server sedang sibuk — coba lagi sebentar lagi.");
  }
  try {
    // F-053: a timeout is NOT a verdict — analyze throws
    // ScanTimeoutError when the deadline fires; it is converted here
    // into an explicit, retryable timeout error and NO checks row is
    // inserted (the insert below only runs on a completed analysis).
    let result;
    try {
      result = await analyze(input, opts);
    } catch (err) {
      if (err instanceof ScanTimeoutError) {
        throw new Error(
          "Pemeriksaan kehabisan waktu (batas 20 detik) — hasilnya tidak disimpan. Coba lagi; bila terus timeout, situsnya mungkin memang lambat atau tidak merespons.",
        );
      }
      throw err;
    }
    const inserted = await db
      .insert(schema.checks)
      .values({
        url: input.toString(),
        domain,
        verdict: result.verdict,
        score: result.score,
        signals: JSON.stringify(result.signals),
        contracts: JSON.stringify(result.contracts),
        pageTitle: result.pageTitle,
        finalUrl: result.finalUrl,
        httpStatus: result.httpStatus,
        registeredAt: result.registeredAt,
        registrar: result.registrar,
        domainAgeDays: result.domainAgeDays,
        // Owner of this check (F-046): the calling principal when known,
        // NULL when anonymous. NULL means "no recorded owner" — under
        // policy L-A the row is write-only until a principal exists (K-4).
        ownerUserId: resolvePrincipal(ctx),
      })
      .returning();
    const row = inserted[0];
    if (!row) throw new Error("Hasil cek gagal disimpan.");
    ctx.invalidateQueries();
    return rowToCheck(row);
  } finally {
    await releaseScanSlot(db, lease.leaseId);
  }
}

const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  ticker: z.string().nullable(),
  chain: z.string(),
  category: z.enum(["DeFi", "Layer 1", "Layer 2", "NFT", "Gaming", "Testnet", "AI & Web3"]),
  segment: z.enum(["live", "upcoming", "ended"]),
  status_label: z.string(),
  description: z.string(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  reward_note: z.string().nullable(),
  contract_address: z.string().nullable(),
  explorer_url: z.string().nullable(),
  official_url: z.string().nullable(),
  x_handle: z.string().nullable(),
  verified_at: z.string(),
  verified_note: z.string(),
  sort: z.number(),
  bookmarked: z.boolean(),
  task_status: z.enum(["not_started", "in_progress", "completed"]),
});

type Project = z.infer<typeof projectSchema>;

type CatalogRow = typeof schema.projects.$inferInsert;

/**
 * The verified catalog. Every row comes from the user's own radar as
 * recorded 2026-10-31 – 2026-11-07 (see DATA-PLAN.md): contracts read
 * on-chain, free paths previewed, several minted/claimed with the user's
 * wallet. No invented projects, no invented rewards — reward_note is only
 * set where a distribution was actually observed. `verified_at` is the
 * date of that check; statuses describe that moment, and each card says so.
 */
const CATALOG: CatalogRow[] = [
  {
    name: "Ptah — Proof of Agent",
    ticker: "PTAH",
    chain: "BNB Chain",
    category: "AI & Web3",
    segment: "live",
    status_label: "Periode 14 dibuka — Periode 15 terakhir berakhir 9 Nov",
    description:
      "NFT identitas Proof of Agent (POA, soulbound). Pemegangnya mengikuti undian hadiah PTAH harian dengan memposting kartu mereka di Binance Square atau X setiap periode. Satu mint gratis per Agent ID; mint gratis ditutup 8 Nov 04:44 UTC.",
    difficulty: "Easy",
    reward_note:
      "Undian Periode 13 (7 Nov): 500 pemenang × 3,988.9 PTAH masing-masing, dari hasil undian resmi Ptah.",
    contract_address: "0xd87adb2e47979d6cb323896b1a9320e0dd132213",
    explorer_url: "https://bscscan.com/address/0xd87adb2e47979d6cb323896b1a9320e0dd132213",
    official_url: "https://ptah.trade/poa",
    x_handle: "@ptahtrade",
    verified_at: "2026-11-07",
    verified_note:
      "Di-mint dan diverifikasi ulang dengan wallet pengguna (Agent #43494). Jendela periode dan hasil undian dibaca dari API resmi Ptah pada 7 Nov 2026.",
    sort: 1,
  },
  {
    name: "BAOracle — Binance Agent Oracle",
    ticker: "BAO-NFT",
    chain: "BNB Chain",
    category: "NFT",
    segment: "live",
    status_label: "Kartu pertama gratis",
    description:
      "NFT oracle / ramalan untuk pemegang .ai Agent ID: 20,000 kartu dalam empat tingkatan (Jade, Silver, Gold, Dragon), maksimal 30 per wallet. Proyek komunitas independen — situs resminya sendiri menyatakan tidak berafiliasi dengan atau didukung oleh Binance.",
    difficulty: "Easy",
    reward_note: null,
    contract_address: "0xcBe2DBBFF4264Dc67Bf557c64e29997B82439354",
    explorer_url: "https://bscscan.com/address/0xcBe2DBBFF4264Dc67Bf557c64e29997B82439354",
    official_url: "https://baoracle.trade/mint",
    x_handle: null,
    verified_at: "2026-11-02",
    verified_note:
      "Situs dan kontrak dibaca pada 2 Nov 2026 (6,286 / 20,000 sudah di-mint saat pemeriksaan); pratinjau mint(1) gratis tersimulasikan dengan bersih. Belum di-mint — eksekusinya terhalang galat saldo gas, tidak ada dana yang hilang.",
    sort: 2,
  },
  {
    name: "SAFU — SafuAgent",
    ticker: "SAFU",
    chain: "BNB Chain",
    category: "AI & Web3",
    segment: "live",
    status_label: "Ronde klaim gratis untuk .ai Agent ID",
    description:
      "Klaim token SAFU gratis untuk .ai Agent ID paling awal, dirilis dalam ronde-ronde (Ronde 3 mencakup ID 10,001–15,000). Klaim gratis ini terpisah dari penjualan berbayar buyLots.",
    difficulty: "Easy",
    reward_note:
      "Tingkatan gratis yang diumumkan proyek: 45B SAFU untuk 50,000 Agent ID paling awal. Klaim sebesar 969,696.9697 SAFU terkonfirmasi di wallet pengguna pada 31 Okt 2026.",
    contract_address: "0xaDC383D53234f494e6Ed409228eC02334f9330B8",
    explorer_url: "https://bscscan.com/address/0xaDC383D53234f494e6Ed409228eC02334f9330B8",
    official_url: "https://safuagent.vercel.app",
    x_handle: null,
    verified_at: "2026-10-31",
    verified_note:
      "claimFree() dieksekusi dengan wallet pengguna pada 31 Okt 2026; saldo SAFU terkonfirmasi on-chain.",
    sort: 3,
  },
  {
    name: "Agent Mao",
    ticker: "MAOAI",
    chain: "BNB Chain",
    category: "AI & Web3",
    segment: "live",
    status_label: "Mao pertama gratis per Agent ID",
    description:
      "Token agen berbasis saham: 1 Mao = 1 saham = 1,000,000 MAOAI. Mao pertama untuk setiap .ai Agent ID gratis (hanya gas); Mao berikutnya berbayar dan tidak dilacak di sini.",
    difficulty: "Easy",
    reward_note:
      "Mao gratis pertama terkonfirmasi di wallet pengguna pada 1 Nov 2026: 1,000,000 MAOAI diterima.",
    contract_address: "0xD6C3285AEb95D2BE2e6DBA7ef08156b0A969edae",
    explorer_url: "https://bscscan.com/address/0xD6C3285AEb95D2BE2e6DBA7ef08156b0A969edae",
    official_url: "https://agentmao.fun",
    x_handle: null,
    verified_at: "2026-11-01",
    verified_note:
      "quote(1, agentId) = 0 terkonfirmasi on-chain dan mint dieksekusi 1 Nov 2026; saldo MAOAI terverifikasi.",
    sort: 4,
  },
  {
    name: "Mars Nexus",
    ticker: null,
    chain: "BNB Chain",
    category: "NFT",
    segment: "live",
    status_label: "Kartu pertama gratis (1 dari 5)",
    description:
      "Koleksi kartu dengan kartu pertama berupa mint gratis metode USDT; kartu 2–5 berbayar dan tidak dilacak di sini.",
    difficulty: "Easy",
    reward_note:
      "Kartu pertama gratis di-mint dengan wallet pengguna pada 31 Okt 2026 (tokenId 4878).",
    contract_address: null,
    explorer_url: null,
    official_url: null,
    x_handle: null,
    verified_at: "2026-10-31",
    verified_note:
      "Pratinjau mint gratis tersimulasikan +1 NFT dan eksekusinya tercatat on-chain 31 Okt 2026; sisa kuota 4/5 berbayar.",
    sort: 5,
  },
  {
    name: "SoulBoard",
    ticker: "BOARD",
    chain: "Robinhood Chain",
    category: "DeFi",
    segment: "upcoming",
    status_label: "Papan aktif — mint memerlukan voucher dari backend",
    description:
      "Launchpad agentic di Robinhood Chain (chain 4663), tidak berafiliasi dengan Binance. Dokumentasinya menyatakan mint pertama per wallet gratis, lalu berbayar dengan harga yang ditetapkan kreator — tetapi minting memerlukan voucher EIP-712 dari backend proyek ditambah SPACE ID Agent ID yang soulbound, jadi belum ada mint publik langsung.",
    difficulty: "Hard",
    reward_note: null,
    contract_address: "0x9518a406109d6072a76aC7aB8816cF267ad291c3",
    explorer_url: null,
    official_url: "https://soulboard.fun",
    x_handle: null,
    verified_at: "2026-11-02",
    verified_note:
      "Papan dan kontrak dibaca dari README GitHub resmi proyek pada 2 Nov 2026 (13 token terdaftar, 12 aktif). Tidak ada mint yang dieksekusi — jalur voucher memerlukan keputusan terpisah.",
    sort: 6,
  },
  {
    name: "Genesis Seeds",
    ticker: "GSEED",
    chain: "BNB Chain",
    category: "NFT",
    segment: "ended",
    status_label: "Mint gratis selesai 1 Nov",
    description:
      "Koleksi NFT bertema benih di BNB Chain dengan jalur mint gratis yang terverifikasi on-chain pada awal November.",
    difficulty: "Easy",
    reward_note: "Dua NFT GSEED dari mint gratis terkonfirmasi di wallet pengguna pada 1 Nov 2026.",
    contract_address: "0xe9522648503c626ad84e5bc7445d1e26c89f6fec",
    explorer_url: "https://bscscan.com/address/0xe9522648503c626ad84e5bc7445d1e26c89f6fec",
    official_url: null,
    x_handle: null,
    verified_at: "2026-11-01",
    verified_note:
      "mint(2) dengan nilai 0 dieksekusi 1 Nov 2026; tokenId 9519 dan 9520 terkonfirmasi di wallet pengguna.",
    sort: 7,
  },
  {
    name: "Night Shift Agents",
    ticker: "NIGHT",
    chain: "BNB Chain",
    category: "AI & Web3",
    segment: "ended",
    status_label: "Mint gratis selesai 1 Nov",
    description:
      "Koleksi NFT bertema agen di BNB Chain dengan mint pertama gratis yang terverifikasi on-chain pada awal November.",
    difficulty: "Easy",
    reward_note: "Satu NFT NIGHT dari mint gratis terkonfirmasi di wallet pengguna pada 1 Nov 2026.",
    contract_address: "0x427aed3f7427b48e45f5e648105aa1b77724cf14",
    explorer_url: "https://bscscan.com/address/0x427aed3f7427b48e45f5e648105aa1b77724cf14",
    official_url: null,
    x_handle: null,
    verified_at: "2026-11-01",
    verified_note:
      "mint(1) dengan nilai 0 dieksekusi 1 Nov 2026; tokenId 8065 terkonfirmasi di wallet pengguna.",
    sort: 8,
  },
  {
    name: "Cogito Agents",
    ticker: null,
    chain: "BNB Chain",
    category: "AI & Web3",
    segment: "ended",
    status_label: "Mint pertama gratis selesai 1 Nov",
    description:
      "Koleksi NFT agen di BNB Chain. Mint pertama per wallet gratis; mint berikutnya berharga 0.00067 BNB masing-masing dan berada di luar kebijakan khusus gratis.",
    difficulty: "Easy",
    reward_note: "Satu NFT Cogito dari mint gratis terkonfirmasi di wallet pengguna pada 1 Nov 2026.",
    contract_address: "0x5ae2be6BbA1BD4f561Dc13158c7f5B95992e045B",
    explorer_url: "https://bscscan.com/address/0x5ae2be6BbA1BD4f561Dc13158c7f5B95992e045B",
    official_url: null,
    x_handle: null,
    verified_at: "2026-11-01",
    verified_note:
      "mint(1) dengan nilai 0 dieksekusi 1 Nov 2026; tokenId 1347 terkonfirmasi di wallet pengguna.",
    sort: 9,
  },
  {
    name: "Mars Plots",
    ticker: "PLOT",
    chain: "BNB Chain",
    category: "NFT",
    segment: "ended",
    status_label: "Petak gratis diklaim 31 Okt",
    description:
      "NFT petak tanah di Mars: satu petak acak gratis per wallet; memilih petak tertentu atau Starter Pack berbayar. Proyek komunitas, tidak berafiliasi dengan Binance, BNB Chain, atau SPACE ID.",
    difficulty: "Easy",
    reward_note: "Satu PLOT gratis (tokenId 3397) terkonfirmasi di wallet pengguna pada 31 Okt 2026.",
    contract_address: "0xbC2C4A71791fb86d14a2A859B0253aa3BBaEB34c",
    explorer_url: "https://bscscan.com/address/0xbC2C4A71791fb86d14a2A859B0253aa3BBaEB34c",
    official_url: "https://marsplots.pages.dev",
    x_handle: "@MarsPlotsAI",
    verified_at: "2026-10-31",
    verified_note:
      "Mint gratis (0, false) tercatat on-chain 31 Okt 2026; hasMinted terkonfirmasi untuk wallet pengguna.",
    sort: 10,
  },
  {
    name: "Pocket Dragons",
    ticker: "PDRAGON",
    chain: "BNB Chain",
    category: "Gaming",
    segment: "ended",
    status_label: "Masa gratis berakhir 4 Nov",
    description:
      "Koleksi NFT naga yang naga pertamanya gratis untuk pemegang .ai Agent ID selama periode 28 Okt – 4 Nov; naga tambahan berbayar.",
    difficulty: "Easy",
    reward_note: "Satu Pocket Dragon gratis (tokenId 6498) terkonfirmasi di wallet pengguna pada 31 Okt 2026.",
    contract_address: "0x2CfF830264343F29d4924160096F1271A8a14aCE",
    explorer_url: "https://bscscan.com/address/0x2CfF830264343F29d4924160096F1271A8a14aCE",
    official_url: null,
    x_handle: null,
    verified_at: "2026-10-31",
    verified_note:
      "Mint(1) gratis dengan nilai 0 dieksekusi 31 Okt 2026 dalam periode yang diumumkan.",
    sort: 11,
  },
  {
    name: "Pixel",
    ticker: null,
    chain: "BNB Chain",
    category: "NFT",
    segment: "ended",
    status_label: "Fase gratis berakhir — sekarang berbayar",
    description:
      "Koleksi yang 7,000 token pertamanya merupakan fase gratis. Pasokan on-chain sudah melewati batas itu, dan fase saat ini mengenakan sekitar $1 per token — di luar kebijakan khusus gratis, jadi tetap terdaftar sebagai berakhir, bukan aktif.",
    difficulty: "Easy",
    reward_note: null,
    contract_address: "0x68f21FEf10A02F82D147192FC317E70De99DD882",
    explorer_url: "https://bscscan.com/address/0x68f21FEf10A02F82D147192FC317E70De99DD882",
    official_url: null,
    x_handle: null,
    verified_at: "2026-11-02",
    verified_note:
      "Dicek ulang on-chain 2 Nov 2026: totalSupply 7,032 / 10,000, sudah melewati batas gratis; panggilan mint gratis gagal (revert). Tampilan 'first 2 free' di situs proyek bertentangan dengan data rantai dan tidak dipercaya di sini.",
    sort: 12,
  },
];

const addProjectResultSchema = z.object({
  added: z.boolean(),
  /** Why the project was rejected; null when it was added. */
  reason: z.string().nullable(),
  /** The newly added project (with default tracking state); null when rejected. */
  project: projectSchema.nullable(),
});

type AddProjectResult = z.infer<typeof addProjectResultSchema>;

function deriveExplorerUrl(chain: string, contractAddress: string | null): string | null {
  if (!contractAddress) return null;
  const c = chain.toLowerCase();
  if (/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    if (c.includes("bnb") || c.includes("bsc") || c.includes("binance")) {
      return `https://bscscan.com/address/${contractAddress}`;
    }
    if (c.includes("ethereum") || c === "eth") {
      return `https://etherscan.io/address/${contractAddress}`;
    }
    return null;
  }
  if (c.includes("solana")) return `https://solscan.io/account/${contractAddress}`;
  return null;
}

/**
 * F-050 (v2.3.24): authorization for addProject. ONLY the space owner
 * (ctx.viewer.isOwner === true, an identity the runtime verifies — local
 * daemon / share) may insert into the GLOBAL catalog. There is NO other
 * trusted principal in this codebase or runtime: no scheduled-job
 * service identity, token, or role exists anywhere (searched: no
 * service principal, no job token, no dispatch-layer contract in the
 * repo or the SDK surface used here), so the "narrowly defined trusted
 * scheduled-job principal" from the audit cannot be named yet — until
 * such an identity is defined and proven (staging gate), the scheduled
 * auto-discovery job can only add projects when it runs as the owner.
 * This gate runs INSIDE the handler, before ANY DB access, so an
 * unauthorized call creates zero rows. It does NOT rely on any assumed
 * dispatch-layer control: the dispatch boundary is NOT VERIFIED at
 * runtime (V18 §5 F-050), and the handler must not assume it.
 */
function isAddProjectAuthorized(ctx: Ctx): boolean {
  return ctx.viewer?.isOwner === true;
}

async function addProject(
  ctx: Ctx,
  args: {
    name: string;
    ticker?: string | null;
    description: string;
    chain: string;
    category: Project["category"];
    contractAddress?: string | null;
    contractBased?: boolean;
    officialUrl?: string | null;
    xHandle?: string | null;
    segment: Project["segment"];
    statusLabel: string;
    difficulty: Project["difficulty"];
    rewardNote?: string | null;
    verifiedAt: string;
    verifiedNote: string;
  },
): Promise<AddProjectResult> {
  const reject = (reason: string): AddProjectResult => ({
    added: false,
    reason,
    project: null,
  });

  // F-050: authorize BEFORE any validation that touches the DB and
  // before any write — anonymous, non-owner local, and non-owner
  // Cloudflare viewers are rejected here with zero rows created.
  if (!isAddProjectAuthorized(ctx)) {
    return reject("Hanya pemilik yang boleh menambah proyek ke katalog.");
  }

  const name = args.name.trim();
  if (!name) return reject("Nama proyek wajib diisi.");

  // Official URL is mandatory — a project with no official source cannot be
  // verified and must never enter the catalog.
  const officialUrl = args.officialUrl?.trim() ?? "";
  if (!officialUrl) return reject("URL resmi wajib ada — proyek tanpa sumber resmi ditolak.");
  let parsedOfficial: URL;
  try {
    parsedOfficial = new URL(
      /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(officialUrl) ? officialUrl : `https://${officialUrl}`,
    );
  } catch {
    return reject("URL resmi tidak valid.");
  }
  if (parsedOfficial.protocol !== "http:" && parsedOfficial.protocol !== "https:") {
    return reject("URL resmi harus http/https.");
  }

  // Contract address: required for contract-based projects, and any address
  // supplied must be valid FOR ITS CHAIN (F-045): canonicalize throws on
  // an unknown chain or a malformed address — the same rule the DB CHECK
  // enforces (catalog.ts; H-CAT-13). The pre-checks below give friendly
  // rejections; the unique indexes are the race-proof backstop (see the
  // try/catch around the insert).
  const contractAddress = args.contractAddress?.trim() || null;
  if (args.contractBased && !contractAddress) {
    return reject("Proyek berbasis kontrak wajib menyertakan alamat kontrak.");
  }
  if (contractAddress) {
    try {
      canonicalizeContractAddress(args.chain.trim(), contractAddress);
    } catch (err) {
      return reject(
        err instanceof Error
          ? err.message
          : "Alamat kontrak tidak sesuai format address yang valid (EVM 0x… 40 hex atau Solana base58).",
      );
    }
  }

  // Verification date must be a real YYYY-MM-DD date.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.verifiedAt) || Number.isNaN(Date.parse(args.verifiedAt))) {
    return reject("Tanggal verifikasi harus format YYYY-MM-DD yang valid.");
  }

  const db = ctx.db<typeof schema>();

  // No duplicates: same project name (case-insensitive) or same contract.
  // Cek duplikat lewat query WHERE (bukan SELECT * seluruh katalog).
  // Perilaku persis sama: nama dibandingkan case-insensitive setelah trim,
  // kontrak dibandingkan case-insensitive (NULL tidak pernah cocok).
  // Ini BUKAN unique constraint — itu bagian F-004 yang tetap terbuka.
  const nameKey = name.toLowerCase();
  const nameDup = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(sql`lower(trim(${schema.projects.name})) = ${nameKey}`)
    .limit(1);
  if (nameDup.length > 0) {
    return reject(`Proyek bernama "${name}" sudah ada di katalog.`);
  }
  if (contractAddress) {
    // Compare CANONICAL addresses (F-043): lower() mentah salah untuk
    // Solana (dua alamat beda huruf adalah alamat BERBEDA) dan untuk
    // EVM tanpa prefix/0X. Kolom generated contract_address_canonical
    // menyimpan bentuk kanonik tiap baris; bandingkan dengan itu.
    const canonical = canonicalizeContractAddress(args.chain.trim(), contractAddress);
    if (canonical === null) return reject("Alamat kontrak tidak boleh kosong."); // unreachable: contractAddress non-null di sini
    const addrDup = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.chain, args.chain.trim()),
          eq(schema.projects.contractAddressCanonical, canonical),
        ),
      )
      .limit(1);
    if (addrDup.length > 0) return reject("Alamat kontrak itu sudah ada di katalog.");
  }

  const maxSortRows = await db
    .select({ maxSort: sql<number>`max(${schema.projects.sort})` })
    .from(schema.projects);
  const nextSort = (maxSortRows[0]?.maxSort ?? 0) + 1;
  const ticker = args.ticker?.trim() || null;
  const xHandleRaw = args.xHandle?.trim() || null;
  const xHandle = xHandleRaw
    ? xHandleRaw.startsWith("@")
      ? xHandleRaw
      : `@${xHandleRaw.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/\/$/, "")}`
    : null;
  const rewardNote = args.rewardNote?.trim() || null;

  // F-004: the unique indexes (projects_name_normalized_unique,
  // projects_contract_normalized_unique) are the transactional backstop
  // for the pre-checks above — two concurrent addProject calls can both
  // pass the SELECT checks, but only one INSERT can win; the loser gets a
  // constraint error, mapped here to the same friendly rejection instead
  // of a 500. (The SDK SpaceDb surface exposes no `transaction` API —
  // D1 rejects Drizzle's BEGIN/SAVEPOINT implementation — so the index,
  // not an app transaction, is the atomicity mechanism. The `sort` value
  // is still computed by max()+1 and is NOT unique: a tie only affects
  // display order, broken by id.)
  let inserted;
  try {
    inserted = await db
      .insert(schema.projects)
      .values({
        name,
        ticker,
        chain: args.chain.trim(),
        category: args.category,
        segment: args.segment,
        status_label: args.statusLabel.trim(),
        description: args.description.trim(),
        difficulty: args.difficulty,
        reward_note: rewardNote,
        contract_address: contractAddress,
        explorer_url: deriveExplorerUrl(args.chain, contractAddress),
        official_url: parsedOfficial.toString(),
        x_handle: xHandle,
        verified_at: args.verifiedAt,
        verified_note: args.verifiedNote.trim(),
        sort: nextSort,
        // Provenance is filled by the SERVER, never from caller args:
        // source = the verified official URL; submitted_by = the calling
        // principal (or "anonymous"); verified_by stays NULL — no separate
        // verifier identity exists yet (K-4 related).
        provenanceSourceUrl: parsedOfficial.toString(),
        provenanceSubmittedBy: resolvePrincipal(ctx) ?? "anonymous",
        provenanceVerifiedBy: null,
      })
      .returning();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      /projects_name_normalized_unique|projects_contract_normalized_unique|UNIQUE constraint failed/i.test(
        msg,
      )
    ) {
      return reject(
        "Proyek atau alamat kontrak itu sudah ada di katalog (duplikat terdeteksi di database).",
      );
    }
    throw err;
  }
  const row = inserted[0];
  if (!row) return reject("Proyek gagal disimpan.");
  ctx.invalidateQueries();
  return {
    added: true,
    reason: null,
    project: { ...row, bookmarked: false, task_status: "not_started" as const },
  };
}

// ---------------------------------------------------------------------------
// Gibran — the in-site assistant. Answers ONLY from this site's own data:
// the verified catalog, the link-check history, and the guide/safety copy
// published on the page. The grounding is rebuilt from the database on every
// question so answers never drift from what the site actually shows.
// ---------------------------------------------------------------------------

const gibranMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const GIBRAN_SITE_KNOWLEDGE = `TENTANG PLATFORM:
- AIRDROP GENERATE dibangun oleh anak bangsa Indonesia. Pembuatnya bernama Rama, yang mendirikan platform ini setelah mengalami sendiri kehilangan aset karena link klaim airdrop palsu (kejadian pengurasan wallet pada 7 Nov 2026). Misinya: membantu orang Indonesia agar tidak tertipu link airdrop palsu, dan membagikan airdrop yang sudah diverifikasi.
- AIRDROP GENERATE adalah proyek independen — bukan lembaga resmi dan tidak berafiliasi dengan Binance atau proyek mana pun di katalog.
- Kredit pembuat ada di bagian Tentang dan di footer: dibuat oleh Rama. Tautan Instagram resmi pembuat belum ditambahkan (menunggu pemiliknya memberikannya) — jangan mengarang handle Instagram apa pun, dan jangan menyebutkan handle X siapa pun sebagai Instagram pembuat.

CARA MEMAKAI PLATFORM AIRDROP GENERATE:
- Jelajahi Airdrop: katalog proyek terverifikasi; bisa dicari dan difilter berdasarkan blockchain, status (Sedang Berlangsung / Segera Hadir / Sudah Berakhir), dan kategori (DeFi, Layer 1, Layer 2, NFT, Gaming, Testnet, AI & Web3).
- Setiap kartu proyek punya tombol Lihat Detail: alamat kontrak, tautan resmi, tingkat kesulitan, catatan verifikasi, dan tanggal proyek itu diverifikasi. Status proyek berlaku per tanggal verifikasi yang tercantum — proyek bisa berubah, berhenti, atau berakhir setelah tanggal itu.
- Tandai (bookmark): ikon penanda di kartu proyek menyimpan proyek ke Dasbor.
- Dasbor: proyek yang ditandai atau dimulai, masing-masing dengan status tugas Belum Dimulai / Sedang Dikerjakan / Selesai yang bisa diubah pengunjung.
- Cek Link (Cek Link Airdrop): pengunjung menempel link airdrop/klaim, lalu pemeriksa membaca kode halaman dan data pendaftaran domain (RDAP) — tanpa menjalankan script situs dan tanpa connect wallet. Hasilnya berupa vonis BAHAYA / WASPADA / LEBIH AMAN / TIDAK BISA DINILAI, skor risiko 0–100, dan bukti per sinyal: permintaan connect wallet, kode tanda tangan transaksi, alamat kontrak/token yang ditemukan, umur domain, bahasa iming-iming klaim gratis, kode yang disamarkan (obfuscated), dan belokan ke domain lain. Setiap hasil tersimpan di Riwayat pemeriksaan dan bisa dicek ulang atau dihapus.
- Tombol Hubungkan Wallet di navbar hanya membuka dialog penjelasan: platform ini hanya-baca, koneksi wallet sengaja belum diaktifkan, dan tidak ada fitur di situs ini yang bisa memulai atau menandatangani transaksi.

PANDUAN KEAMANAN DI SITUS INI:
1. Cek link dulu sebelum klik (60 detik): tempel link ke fitur Cek Link sebelum membukanya. Halaman klaim di domain yang baru berumur beberapa hari, tanpa alamat kontrak dan tanpa tautan sosial resmi, adalah pola klasik situs drainer — pola persis di balik pengurasan wallet Solana pada 7 Nov 2026 yang terdokumentasi di platform ini (situs klaim "$SCAMSEM AIRDROP" palsu mengarahkan ke halaman connect wallet dan menguras isi wallet dalam satu transaksi yang ditandatangani).
2. Baca kontraknya, bukan hitung mundurnya: proyek asli selalu bisa menunjukkan alamat kontraknya. Buka di explorer jaringan: cek tanggal deploy, jumlah holder, dan apakah alamatnya cocok dengan yang diumumkan kanal resmi proyek. Tidak ada alamat = tidak ada kepercayaan.
3. Connect bukan bahayanya — tanda tanganlah bahayanya: connect wallet hanya membuka alamat publik. Pengurasan terjadi di langkah tanda tangan: satu persetujuan signTransaction bisa memindahkan semuanya. Pakai wallet burner terpisah untuk apa pun yang belum terbukti, dan jangan pernah menandatangani transaksi yang tidak bisa kamu baca.
4. Gratis berarti gratis: "free mint" yang diam-diam menambah biaya proses, tingkatan berbayar, atau langkah pembayaran di luar situs bukanlah gratis. Katalog situs ini hanya memuat peluang yang jalur gratisnya sudah di-preview dan terkonfirmasi bernilai 0.
5. Standar keamanan situs: situs ini tidak pernah meminta seed phrase atau private key — tidak ada pihak yang sah yang memintanya. Vonis hijau dari pemeriksa berarti "tidak ada bahaya yang terdeteksi", bukan "dijamin aman".`;

async function askGibran(
  ctx: Ctx,
  args: {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  },
): Promise<{ reply: string }> {
  const db = ctx.db<typeof schema>();
  // Catalog is GLOBAL (F-040) — every principal reads the same catalog.
  // Check history is OWNER-SCOPED (F-046, L-A): only this principal's own
  // rows enter the prompt; legacy NULL rows NEVER enter it. Anonymous
  // callers get no history at all (empty, not "all rows").
  const principal = resolvePrincipal(ctx);
  const [projectRows, checkRows] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .orderBy(asc(schema.projects.sort), asc(schema.projects.id)),
    principal === null
      ? Promise.resolve([])
      : db
          .select()
          .from(schema.checks)
          .where(eq(schema.checks.ownerUserId, principal))
          .orderBy(desc(schema.checks.id))
          .limit(10),
  ]);

  // Ringkasan katalog (S5): hanya fakta kunci per proyek — description,
  // reward_note, dan verified_note lengkap tidak lagi dikirim, supaya
  // prompt mengecil ~70–80%. Trade-off: Gibran tidak bisa menjawab detail
  // reward/catatan verifikasi dari ingatannya; aturan kerasnya tetap
  // berlaku (katakan tidak tahu + arahkan ke kartu detail proyek).
  const catalogText =
    projectRows.length === 0
      ? "(Katalog proyek masih kosong.)"
      : projectRows
          .map((p) => {
            const parts = [
              `- ${p.name}${p.ticker ? ` (${p.ticker})` : ""} — chain: ${p.chain}; kategori: ${p.category}; status: ${p.segment} ("${p.status_label}"); kesulitan: ${p.difficulty}.`,
              p.contract_address ? `Kontrak: ${p.contract_address}` : null,
              p.x_handle ? `X: ${p.x_handle}` : null,
              `Diverifikasi ${p.verified_at}.`,
            ];
            return parts.filter(Boolean).join(" ");
          })
          .join("\n");

  const checksText =
    checkRows.length === 0
      ? "(Belum ada riwayat cek link.)"
      : checkRows
          .map(
            (c) =>
              `- ${c.domain}: vonis ${c.verdict}, skor risiko ${c.score}/100, dicek ${c.createdAt.toISOString()}.`,
          )
          .join("\n");

  const historyText = args.history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Pengunjung" : "Gibran"}: ${m.content}`)
    .join("\n");

  const prompt = `Kamu adalah Gibran, asisten di dalam website AIRDROP GENERATE — platform informasi dan eksplorasi airdrop crypto. Tugasmu menjawab pertanyaan pengunjung tentang airdrop di katalog situs ini, cara memakai platform, cara memakai fitur cek link, dan panduan keamanan.

ATURAN KERAS (tidak boleh dilanggar):
- Jawab HANYA berdasarkan DATA SITUS di bawah. Jangan mengarang proyek, reward, harga, tanggal, atau fakta apa pun yang tidak ada di data.
- Jika jawabannya tidak ada di data, katakan dengan jujur bahwa kamu tidak tahu / datanya belum ada di website ini, dan arahkan pengunjung untuk memeriksa sumber resmi proyek yang bersangkutan.
- Jangan pernah meminta seed phrase, private key, kata sandi, atau tanda tangan transaksi — dan ingatkan pengunjung bahwa pihak yang sah tidak pernah memintanya jika topiknya muncul.
- Jangan pernah menjanjikan keuntungan atau hasil pasti, dan jangan memberikan nasihat keuangan. Boleh menjelaskan fakta katalog apa adanya.
- Status proyek berlaku per tanggal verifikasinya; bila relevan, sebutkan tanggal verifikasi itu supaya pengunjung tahu status bisa sudah berubah.
- Tautan situs resmi persisnya tidak dimuat di datamu: bila pengunjung butuh link resmi suatu proyek, arahkan mereka ke tombol "Situs Resmi" di kartu detail proyek itu (klik Lihat Detail pada kartunya di bagian Jelajahi Airdrop). Jangan menebak atau menyusun sendiri URL proyek.
- Gaya bahasa: Bahasa Indonesia, ramah, singkat, jelas, mudah dipahami. Hindari jawaban bertele-tele; pakai daftar pendek bila membantu.

DATA SITUS — KATALOG PROYEK TERVERIFIKASI:
${catalogText}

DATA SITUS — RIWAYAT CEK LINK TERAKHIR:
${checksText}

${GIBRAN_SITE_KNOWLEDGE}

RIWAYAT PERCAKAPAN:
${historyText || "(belum ada)"}

PESAN TERBARU PENGUNJUNG:
${args.message}

Tulis jawaban Gibran untuk pesan terbaru itu, mematuhi semua aturan di atas.`;

  let reply: string;
  try {
    reply = await ctx.inference.complete(prompt, { schema: z.string() });
  } catch {
    // Degrade gracefully (e.g. an upstream content filter trips on a word in
    // the visitor's own message) instead of failing the whole chat turn.
    return {
      reply:
        "Maaf, aku belum bisa menjawab pertanyaan itu. Coba rumuskan dengan kata lain ya — atau jelajahi langsung katalog, fitur cek link, dan panduan keamanan di halaman ini.",
    };
  }
  const trimmed = reply.trim();
  if (!trimmed) {
    return {
      reply:
        "Maaf, aku belum bisa menjawab itu sekarang. Coba tanya lagi sebentar, atau periksa langsung katalog dan panduan keamanan di halaman ini ya.",
    };
  }
  return { reply: trimmed };
}

/**
 * Export legacy check rows (F-046 gate §5, policy L-A default).
 *
 * Legacy rows are checks with owner_user_id IS NULL ("no recorded
 * owner"). Under L-A they are NEVER returned to an ordinary principal
 * by any query — the ONLY read path is this function, and it is gated
 * on the SPACE OWNER: ctx.viewer.isOwner === true, an identity the
 * runtime verifies (local daemon / share). It is NOT in the Actions
 * map, so no client can invoke it; it exists for server-side
 * audit/migration of legacy data only.
 *
 * Fail-closed: anonymous callers, non-owner principals, and a missing
 * viewer all get an EMPTY array — the response never reveals whether
 * legacy rows exist. Only NULL-owner rows are returned, oldest first,
 * in the same Check shape listChecks returns.
 *
 * Exported for harness verification (H-LEG) — it is NOT an action.
 */
export async function exportLegacyChecks(ctx: Ctx): Promise<Check[]> {
  const viewer = ctx.viewer;
  if (!viewer || viewer.isOwner !== true) return [];
  const db = ctx.db<typeof schema>();
  const rows = await db
    .select()
    .from(schema.checks)
    .where(isNull(schema.checks.ownerUserId))
    .orderBy(asc(schema.checks.id));
  return rows.map(rowToCheck);
}

export const Actions = {
  checkLink: defineAction({
    description:
      "Live-checks a pasted airdrop/claim link: fetches the page, scans it for wallet-connect requests, signing code, contract addresses, bait language and obfuscation, looks up the domain age via RDAP, saves the result to history, and returns the verdict with per-signal evidence.",
    request: z.object({
      url: z.string().min(1).max(2048),
      // H-CACHE-04 (re-check bypass): when true, the page fetch skips the
      // in-memory cache read and re-fetches fresh (guard, caps, budget and
      // deadline still apply). Optional — omitted means false; the handler
      // normalizes undefined to false. Kept optional (no .default) so
      // existing callers passing only { url } keep typechecking.
      forceFresh: z.boolean().optional(),
    }),
    response: checkSchema,
    handler: async (ctx, args): Promise<Check> =>
      runCheck(ctx, args.url, { forceFresh: args.forceFresh }),
  }),

  listChecks: defineAction({
    description: "Lists past link checks from history, newest first.",
    request: z.object({
      limit: z.number().int().positive().max(100).default(30),
    }),
    response: z.object({ checks: z.array(checkSchema) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      // OWNER-SCOPED (F-046, L-A fail-closed): only this principal's own
      // rows. Legacy NULL rows never match `=` — they are invisible by
      // construction of the predicate, not by a filter. Anonymous callers
      // get an EMPTY list (not all rows, not legacy rows).
      const principal = resolvePrincipal(ctx);
      if (principal === null) return { checks: [] };
      const rows = await db
        .select()
        .from(schema.checks)
        .where(eq(schema.checks.ownerUserId, principal))
        .orderBy(desc(schema.checks.id))
        .limit(args.limit);
      return { checks: rows.map(rowToCheck) };
    },
  }),

  deleteCheck: defineAction({
    description: "Deletes one check from history by id.",
    request: z.object({ id: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      // OWNER-SCOPED (F-046): delete only when id AND owner match.
      // 0 affected rows (someone else's row, a legacy row, or a missing
      // id) returns the same generic ok — the response never reveals
      // whether the row exists or belongs to someone else.
      const principal = resolvePrincipal(ctx);
      if (principal !== null) {
        await db
          .delete(schema.checks)
          .where(
            and(
              eq(schema.checks.id, args.id),
              eq(schema.checks.ownerUserId, principal),
            ),
          );
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  listProjects: defineAction({
    description:
      "Lists the verified airdrop project catalog (live, upcoming, ended) merged with the user's bookmark and task status per project. Seeds the catalog once from the user's verified radar when the table is empty.",
    request: z.object({}),
    response: z.object({ projects: z.array(projectSchema) }),
    async handler(ctx): Promise<{ projects: Project[] }> {
      const db = ctx.db<typeof schema>();
      const existing = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .limit(1);
      if (existing.length === 0) {
        await db.insert(schema.projects).values(CATALOG);
      }
      // Satu query LEFT JOIN (bukan dua SELECT penuh + join di JS).
      // Join di-scope ke principal pemanggil (F-040): state tiap
      // principal independen; F-057 (v2.3.25): tanpa viewer, saved state
      // DINONAKTIFKAN (savedPrincipal() null -> sentinel yang tidak
      // pernah cocok) — anonymous TIDAK lagi membaca baris '<LEGACY>'
      // kecuali mode local single-owner eksplisit aktif. F-051: untuk
      // viewer share Cloudflare non-owner, savedPrincipal() null — saved
      // state DINONAKTIFKAN: join memakai sentinel yang tidak pernah
      // cocok, jadi semua proyek kembali dengan state default (tidak
      // dibaca state viewer lain, tidak ada state yang bocor antar
      // viewer).
      const principal = savedPrincipal(ctx) ?? DISABLED_SAVED_PRINCIPAL;
      const rows = await db
        .select({
          project: schema.projects,
          bookmarked: schema.savedProjects.bookmarked,
          taskStatus: schema.savedProjects.taskStatus,
        })
        .from(schema.projects)
        .leftJoin(
          schema.savedProjects,
          and(
            eq(schema.savedProjects.projectId, schema.projects.id),
            eq(schema.savedProjects.principalId, principal),
          ),
        )
        .orderBy(asc(schema.projects.sort), asc(schema.projects.id));
      return {
        projects: rows.map(({ project, bookmarked, taskStatus }) => ({
          ...project,
          bookmarked: bookmarked === 1,
          task_status: taskStatus ?? ("not_started" as const),
        })),
      };
    },
  }),

  setProjectState: defineAction({
    description:
      "Sets the user's bookmark flag and/or task status (not_started, in_progress, completed) for one catalog project.",
    request: z.object({
      projectId: z.number().int().positive(),
      bookmarked: z.boolean().optional(),
      taskStatus: z
        .enum(["not_started", "in_progress", "completed"])
        .optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      // OWNER-SCOPED (F-040): baca/tulis HANYA baris (principal, project)
      // pemanggil — tanpa filter principal, satu principal dapat menimpa
      // state principal lain (bug cross-principal write pada kode lama
      // yang hanya memfilter projectId). F-057 (v2.3.25): tanpa viewer,
      // saved state DINONAKTIFKAN (no-op) kecuali mode local single-owner
      // eksplisit aktif — anonymous TIDAK lagi menulis '<LEGACY>'.
      // F-051: viewer share Cloudflare non-owner TIDAK punya principal —
      // saved state dinonaktifkan untuk mereka: no-op (ok generik, tanpa
      // write) supaya dua viewer satu share tidak saling menimpa/membaca
      // state. Responsnya tidak membocorkan apakah state itu ada.
      const principal = savedPrincipal(ctx);
      if (principal === null) {
        ctx.invalidateQueries();
        return { ok: true };
      }
      const existing = await db
        .select()
        .from(schema.savedProjects)
        .where(
          and(
            eq(schema.savedProjects.projectId, args.projectId),
            eq(schema.savedProjects.principalId, principal),
          ),
        );
      const current = existing[0];
      const bookmarked =
        args.bookmarked !== undefined
          ? args.bookmarked
          : current
            ? current.bookmarked === 1
            : true;
      const taskStatus =
        args.taskStatus ?? current?.taskStatus ?? "not_started";
      if (current) {
        await db
          .update(schema.savedProjects)
          .set({
            bookmarked: bookmarked ? 1 : 0,
            taskStatus,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.savedProjects.projectId, args.projectId),
              eq(schema.savedProjects.principalId, principal),
            ),
          );
      } else {
        await db.insert(schema.savedProjects).values({
          principalId: principal,
          projectId: args.projectId,
          bookmarked: bookmarked ? 1 : 0,
          taskStatus,
        });
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  addProject: defineAction({
    description:
      "Adds a new project to the verified airdrop catalog (used by the scheduled auto-discovery job running as the owner). OWNER-ONLY (F-050): anonymous, non-owner local, and non-owner share viewers are rejected before any database write. Strict rules enforced inside the action: rejects a project whose name or contract address already exists in the catalog, rejects any project without a valid official URL, rejects contract-based projects without a contract address and any malformed EVM/Solana address. New projects are appended after the last catalog entry and start with task_status not_started. Returns { added, reason, project } instead of throwing so the caller can log rejections.",
    request: z.object({
      name: z.string().min(1).max(200),
      ticker: z.string().max(32).nullable().optional(),
      description: z.string().min(1).max(2000),
      chain: z.string().min(1).max(100),
      category: z.enum(["DeFi", "Layer 1", "Layer 2", "NFT", "Gaming", "Testnet", "AI & Web3"]),
      contractAddress: z.string().max(64).nullable().optional(),
      contractBased: z.boolean().optional(),
      officialUrl: z.string().max(2048).nullable().optional(),
      xHandle: z.string().max(120).nullable().optional(),
      segment: z.enum(["live", "upcoming", "ended"]),
      statusLabel: z.string().min(1).max(300),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
      rewardNote: z.string().max(2000).nullable().optional(),
      verifiedAt: z.string().max(10),
      verifiedNote: z.string().min(1).max(2000),
    }),
    response: addProjectResultSchema,
    handler: async (ctx, args): Promise<AddProjectResult> => addProject(ctx, args),
  }),

  askGibran: defineAction({
    description:
      "Asks Gibran, the in-site AIRDROP GENERATE assistant. Answers in Indonesian strictly from the site's own data — the verified project catalog, the link-check history, and the published guide/safety content — and honestly says it does not know (pointing to the project's official source) when the answer is not in that data. Never asks for a seed phrase, private key, or signature, and never promises returns or gives financial advice.",
    request: z.object({
      message: z.string().min(1).max(1000),
      history: z.array(gibranMessageSchema).max(12).default([]),
    }),
    response: z.object({ reply: z.string() }),
    handler: async (ctx, args): Promise<{ reply: string }> => askGibran(ctx, args),
  }),
} satisfies ActionsModule;
