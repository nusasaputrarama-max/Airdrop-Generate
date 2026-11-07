# Public Tester Deployment Proposal — V1

**Document:** `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md`
**Date:** 2026-11-08 (WIB)
**Status:** DISCUSSION ONLY — NO DEPLOYMENT OR IMPLEMENTATION AUTHORIZATION
**Responds to:** `PROJECT_DISCUSSION_PUBLIC_TESTER_20261108.md` (commit `c73a02e`, ChatGPT, 2026-11-08)
**Author:** Muse (Software Architect, AG-001)
**Decision state:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED. NO PUBLIC DEPLOYMENT AUTHORIZED. LINK SCANNER MUST REMAIN DISABLED.

> **ON HOLD (perintah pemilik, 2026-11-08 00:28 WIB):** public tester
> DITAHAN oleh Rama ("Tahan dulu untuk tester publik, jangan terburu²
> kerjakan dengan benar jobdeskmu dan persempit celah dulu"). Koreksi
> v2.3.10 di dokumen ini (F-011) adalah koreksi dokumen saja — BUKAN
> otorisasi deploy, bukan otorisasi implementasi fixture/API, dan bukan
> pencabutan hold. Tidak ada tindak lanjut deployment dari revisi ini.

> This document proposes architecture only. It deploys nothing, changes no
> application code, touches no database or catalog, does not activate Link
> Scanner, and does not create any production build or live service. Every
> technical claim is traceable to a repo file, a command output, or a provider
> source linked in §10. Where something could not be verified it is marked
> **NOT VERIFIED** with the condition that would settle it — it is not guessed.

## §0. The one-sentence finding

**No third-party free host runs this application unmodified.** The app needs
three things together — a Bun runtime, a long-lived server process, and a
persistent local SQLite file — and every free tier verified in §2 provides at
most two of the three. The only runtime known to run the stack as-is is the
Hatch space runtime it already runs on, and whether a second Hatch space can
be publicly exposed on a free subdomain is **NOT VERIFIED** (blocker T-01).
The honest choice is therefore between (A) a **free static-frontend-only
tester** with every server action disabled, and (B) a **full tester on paid
or self-managed infrastructure after a port** — and (B) is implementation
work that needs its own explicit owner approval.

## §1. Architecture and data flow (as built)

### 1.1 What the application actually is

Verified from the repo mirror (`site/`, commit `c68c727`, updated by v2.3.8
commit `039836a`):

| Layer | Technology (verified source) |
| --- | --- |
| Client | React 19 SPA; entry `client/dist/index.html` (`site/space.json`); built by `bun ./client/build.mjs` (`site/package.json` `build:client`) |
| Client → server transport | Typed RPC: `createActionClient` POSTs `{action, args}` to `./actions` (`site/client/src/api.ts`); types come straight from `server/src/actions.ts`, no codegen |
| Server | Bun server process; server bundle built by `bun build ./src/actions.ts --target=bun` (`site/package.json` `build:server`); actions declared with `defineAction` from `@hatch/space-sdk` (`site/server/src/actions.ts:13`) |
| SDK | `@hatch/space-sdk` is `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` (`site/package.json`) — a **builder-local absolute path**, not a registry package (see F-009, `SSRF_REPRODUCIBILITY_V238.md`) |
| Database | SQLite via `drizzle-orm/sqlite-core` (`site/server/src/schema.ts:1`); single file `app.db` at `~/workspace/ts-spaces/<slug>/app.db` (`site/AGENTS.md`); migrations `site/drizzle/0001`–`0005` (seed: `0004_seed_projects_catalog_permanently.sql`, 47 statements) |
| Runtime declaration | `packageManager: bun@1.3.10` (`site/package.json`); Hatch platform version 28 (`site/space.json`) |
| Secrets / env vars in code | **None.** `grep` over `site/server/src/actions.ts` finds no `apiKey`, `API_KEY`, `process.env`, or `Bun.env`, and only two `fetch(` call sites (see §1.3) |
| In-app cron | **None.** `site/space.json`: `"managedCronJobs": []`. The 2-hour auto-discovery cron lives in Muse's scheduler, not in the app |
| Health endpoint | **None.** No `health` string exists anywhere in `site/server/src/actions.ts` or `site/client/src/*`; the `Actions` object exposes exactly 7 actions (see §1.2) |
| Authentication | **None.** `grep auth|authorize|role` over `actions.ts` finds nothing except the word "registrar" (RDAP) — verified in `SSRF_RESPONSE_MATRIX_V238.md` §2.5 (F-005) |

### 1.2 Server actions (the complete public surface)

All seven actions in `site/server/src/actions.ts` (lines 1205–1357):

| Action | What it does | Writes? | SSRF / abuse relevance |
| --- | --- | --- | --- |
| `checkLink` | Fetches a pasted URL server-side, scans HTML + up to 3 scripts, RDAP lookup, scores, **saves one row to `checks`** | Yes (`checks` insert, `runCheck` ~line 616) | **THE SSRF surface (F-001).** See §1.3 |
| `listChecks` | Lists past checks, newest first (limit ≤ 100) | No | Read-only; exposes tester check history |
| `deleteCheck` | Deletes one check row by id | Yes | Unauthenticated destructive write |
| `listProjects` | Lists catalog; **seeds the catalog from the in-code `CATALOG` constant when the table is empty** | Yes (seed insert) | Read-only in effect; seed content is the verified radar |
| `setProjectState` | Sets bookmark / task status per project | Yes (`saved_projects` upsert) | Unauthenticated write; on a shared tester DB, one visitor's state is every visitor's state |
| `addProject` | Adds a catalog row (used by the scheduled auto-discovery job) | Yes | Unauthenticated write; duplicate race (F-004); authorization unclear (F-005) |
| `askGibran` | In-site assistant; answers in Indonesian **strictly from site data** (catalog + last 10 checks + guide content) | No | No external API call (verified: no `fetch(` in its path). Safe to expose only if its data is tester data |

### 1.3 Data-flow diagram (current production shape)

```
                          ┌─────────────────────────────────────────────────┐
                          │  HATCH SPACE RUNTIME (platform v28, Bun)      │
                          │                                                 │
  Visitor browser         │   ┌──────────────┐   POST ./actions            │
  ┌──────────────┐        │   │  Static host │   {action, args}            │
  │ React 19 SPA │───────▶│   │  client/dist │────────▶┌────────────────┐  │
  │ (no secrets, │◀───────│   │  index.html  │◀────────│ defineAction   │  │
  │  no auth)    │  JSON  │   └──────────────┘         │ handlers       │  │
  └──────────────┘        │                              │  (actions.ts)  │  │
                          │                              └──────┬─────────┘  │
                          │                                     │            │
                          │              ┌──────────────────────┼────────────┤
                          │              │ ctx.db (Drizzle)     │ outbound   │
                          │              ▼                      ▼ fetch      │
                          │   ┌──────────────────┐   ┌───────────────────┐ │
                          │   │ app.db (SQLite   │   │ checkLink ONLY:   │ │
                          │   │ file on disk)    │   │ • arbitrary URL   │ │
                          │   │ checks / projects│   │   (≤6 redirects + │ │
                          │   │ / saved_projects │   │   ≤3 scripts)     │ │
                          │   └──────────────────┘   │ • rdap.org lookup │ │
                          │                          └───────────────────┘ │
                          └─────────────────────────────────────────────────┘

  SSRF surface = the checkLink outbound fetch. It is the ONLY place the
  server fetches a URL supplied by a visitor. Everything else is local
  (DB reads/writes) or a fixed-host lookup (rdap.org).
```

### 1.4 Runtime requirements the host must satisfy (the test every option is judged against)

| # | Requirement | Evidence |
| --- | --- | --- |
| R1 | Bun runtime (declared 1.3.10; server built `--target=bun`) | `site/package.json` |
| R2 | Long-lived server process serving static files + `POST ./actions` (Hatch SDK server) | `site/space.json`, `site/client/src/api.ts`, `site/AGENTS.md` ("build/ship only through the web-artifact tools") |
| R3 | Persistent local SQLite file (`app.db`) surviving redeploys, restarts, and idle periods | `site/AGENTS.md`, `site/server/src/schema.ts` (sqlite-core), `site/drizzle/` |
| R4 | Outbound HTTPS fetch to arbitrary visitor URLs + `rdap.org` (only while checkLink exists) | `site/server/src/actions.ts:101–125, 134` |
| R5 | No secrets/env vars needed by the app itself (verified) — but any new host needs its own deploy credentials | grep, §1.1 |
| R6 | No in-app cron, no background worker, no health endpoint | `site/space.json`, §1.1 |

A host that fails R1, R2, or R3 cannot run the full app as-is; it can only
host a subset (usually the static frontend) or a ported version. That
distinction drives the whole comparison in §2.

## §2. Hosting comparison — verified against the actual runtime

Method: each option is judged against R1–R6 above. Free-tier numbers are
from provider documentation as re-read by third-party trackers in
Oct–Nov 2026 (linked per row); where the trackers disagree, the disagreement
is stated, not smoothed over. **No provider is selected.** Prices are in USD.

### 2.1 Comparison matrix

| Option | Bun? (R1) | Long-lived server? (R2) | Persistent SQLite file? (R3) | Free-subdomain? | Verdict for the FULL app |
| --- | --- | --- | --- | --- | --- |
| **0. Second Hatch space** (same runtime) | Yes — by construction | Yes — by construction | Yes — by construction | **NOT VERIFIED** | **Only zero-port option; public exposure unproven (T-01)** |
| **A. Cloudflare Pages + Workers + D1** | No — Workers are V8 isolates, not Bun | No — serverless functions, not a Bun server | No — no local file; D1 is a different Drizzle dialect (`d1`, not `sqlite-core` file DB) | Yes (`*.pages.dev`) | **Frontend-only. Full app requires a rewrite** |
| **B. Vercel Hobby + Bun runtime (beta)** | Yes — since Aug 2026 (`bunVersion` in `vercel.json`, `Bun.serve` entrypoint) | Partial — serverless functions on Fluid compute, not a persistent process | **No — filesystem is ephemeral; `app.db` does not survive** | Yes (`*.vercel.app`) | **Not viable as-is; viable only after a port (external DB + SDK adapter)** |
| **C. Netlify (new accounts, credit-based Free)** | No Bun runtime | No — Lambda-backed functions | No — no persistent disk | Yes (`*.netlify.app`) | **Frontend-only** |
| **D. Render Free (Docker)** | Yes — via Dockerfile | Yes — but spins down after 15 min idle (~1 min wake) | **No on free — filesystem ephemeral; persistent disk is paid-only** | Yes (`*.onrender.com`) | **Not viable free; viable at $7/mo + disk** |
| **E. Railway (Docker)** | Yes — via Dockerfile | Yes | Yes — volumes (0.5 GB Free / 5 GB Hobby) | Yes (`*.up.railway.app`) | **Technically viable, but NOT free beyond the $5 trial** |
| **F. Fly.io (Docker)** | Yes — via Dockerfile | Yes | Yes — volumes | Yes (`*.fly.dev`) | **NOT free for a new account (free tier removed Oct 2024); paid only** |
| **G. Oracle Cloud Always Free VM** | Yes — Bun on ARM64 (install-time verification still required, T-11) | Yes — full VM, always on | Yes — block volume (200 GB) | No — public IP + own DNS/TLS; no free subdomain | **Viable at $0, highest ops burden + reclaim/capacity risk** |

### 2.2 Per-option evidence (free-tier limits, outbound rules, lock-in)

**Option 0 — Second Hatch space.**
The live app already runs on this runtime, so R1–R3 hold by construction.
What is NOT VERIFIED: whether the Hatch platform offers public exposure of
a space on a free subdomain, what its egress/firewall controls are, whether
a second space shares any state with the first, and what the account/quotas
are. There is no Hatch public-hosting documentation in the repo. This is
blocker T-01 and must be answered from the platform itself before Option 0
can be recommended. Creating a second space is also still a deployment: it
needs the owner's explicit approval like any other deploy (§5).

**Option A — Cloudflare Pages + Workers + D1.**
- Pages serves static assets; static requests are unmetered. Workers Free:
  100,000 requests/day, **10 ms CPU time per invocation**, 128 MB memory,
  50 subrequests per invocation; exceeding the daily cap returns Error 1027.
  Sources: Cloudflare Workers limits docs
  (https://developers.cloudflare.com/workers/platform/limits/) as re-read
  Oct–Nov 2026; also https://stacksfree.com/blog/cloudflare-only-free-stack-2026/
  and https://www.budgetforge.dev/tools/cloudflare-workers-pricing-2026.
- D1 Free: 5M rows read/day, 100,000 rows written/day, 5 GB storage per
  account, 500 MB per database, 10 databases per account; queries error
  until the 00:00 UTC reset when a daily cap is hit. Sources:
  https://dev.to/signops/cloudflare-d1-free-tier-limits-what-counts-as-a-row-written-d6e
  (checked 6 Nov 2026); https://stacksfree.com/blog/cloudflare-only-free-stack-2026/.
- Why the full app does not fit: Workers cannot execute a Bun server bundle
  (`bun:sqlite`, Hatch SDK server); D1 speaks the `drizzle-orm/d1` dialect
  and is not a local `app.db` file, so the schema/migration layer would need
  a dialect port; and Workers `fetch()` uses Cloudflare's resolver — there
  is **no custom DNS lookup API**, so the F-001 remediation design (DNS
  resolve + validate + pin, `SSRF_REMEDIATION_DESIGN.md` §D.4.18) **cannot
  run on Workers at all**. A Cloudflare tester would therefore be a
  frontend + rewritten Worker API, not this app.
- Lock-in: Workers/D1/KV APIs are Cloudflare-specific; leaving means
  rewriting the API layer. Paid step: Workers Paid $5/mo (10M requests/mo,
  30M CPU-ms/mo, CPU up to 5 min/invocation).

**Option B — Vercel Hobby + Bun runtime.**
- Bun runtime on Vercel Functions is real and current: announced 10 Aug
  2026, `bunVersion: "1.x"` in `vercel.json`, `Bun.serve()` as entrypoint,
  WebSocket support, public beta. Sources:
  https://bun.com/guides/deployment/vercel;
  https://vercel.com/changelog/bun-runtime-now-supports-large-functions-and-extended-max-duration;
  https://createwith.com/tool/vercel/updates/vercel-adds-bunserve-entrypoint-for-vercel-functions-with-websocket-support.
- Hobby (free) allowances, per Vercel docs as read Oct 2026: 100 GB Fast
  Data Transfer/mo, 10 GB Fast Origin Transfer/mo, 1,000,000 CDN requests/mo,
  1,000,000 function invocations/mo, 4 CPU-hours Active CPU/mo, 360 GB-hours
  provisioned memory/mo, max function duration 300 s, single region,
  100 deployments/day. **Hobby is for non-commercial personal use only** and
  has **no paid overages**: exceeding an allowance pauses the feature, in
  most cases until the 30-day window resets. Sources:
  https://formsubmit.app/blog/vercel-free-plan-limits (checked 14 Oct 2026);
  https://www.stackverdict.org/guides/is-vercel-free/;
  https://convika.com/compare/vercel-hobby-limits/.
- Why the full app does not fit as-is: (1) the serverless filesystem is
  ephemeral — `app.db` would be lost on every redeploy/invocation cycle, so
  R3 fails and the catalog/check history would need an external database;
  (2) `@hatch/space-sdk` is a `file:` tarball at a builder-local absolute
  path that a Vercel build cannot resolve (F-009), so the `defineAction` /
  `ctx.db` server layer needs an adapter or a rewrite — that is a port, i.e.
  implementation; (3) the Hobby non-commercial restriction needs an owner
  judgement for a public tester (assumption A-14). Paid step: Pro
  $20/developer seat/mo (usage-based beyond included amounts).

**Option C — Netlify.**
- New accounts (created on/after 4 Sep 2025) are on a **credit-based Free
  plan: 300 credits/month, hard limit**. Rate card: bandwidth 20 credits/GB,
  production deploy 15 credits, function compute 10 credits/GB-hour
  (functions pinned at 1 GB). 300 credits buys ~15 GB bandwidth OR ~20
  deploys OR ~30 GB-hours of function compute — not all three. When credits
  run out, sites pause until the next cycle. Legacy accounts (before
  4 Sep 2025) keep 100 GB bandwidth/mo + 300 build minutes/mo + 125,000
  function invocations/mo. Sources:
  https://formsubmit.app/blog/netlify-free-plan-limits (checked 14 Oct 2026);
  https://stackwrite.com/blog/netlify-free-tier-pricing-2026/ (verified
  7 Nov 2026); https://supadrop.host/blog/netlify-pricing-free-tier-limits/.
- No Bun runtime; functions are AWS Lambda-backed Node.js/Go. No persistent
  disk. Same verdict as Cloudflare: frontend-only; the server layer would
  need a rewrite and an external database.

**Option D — Render Free (Docker).**
- Free web service: 512 MB RAM / 0.1 CPU; **spins down after 15 minutes
  without inbound traffic; wake takes about one minute** (loading page shown
  meanwhile). 750 free instance hours/month shared per workspace; exhausted
  hours suspend all free services until the next month. **Filesystem is
  ephemeral — any file the app writes (including a SQLite database) is lost
  on every redeploy, restart, or spin-down; persistent disks are paid-only**
  ($0.25/GB/mo) and a service with a disk cannot do zero-downtime deploys
  or scale horizontally. Free Postgres expires **30 days after creation**
  per Render's Deploy for Free docs as read Oct 2026, with a 14-day grace
  period before deletion — older guides say 90 days; the discrepancy is
  flagged, not resolved (blocker T-13). Smallest paid web service: $7/mo
  (0.5 CPU / 512 MB), no spin-down, disk attachable. Sources:
  https://justcreateapp.com/is-render-a-good-hosting-platform (checked
  16 Oct 2026); https://convika.com/compare/render-free-tier-production/
  (read 24 Oct 2026); https://softoraguide.com/blog/railway-vs-render-2026/.
- Verdict: the free tier cannot host the full app (R3 fails by design). The
  paid shape ($7 + $0.25/GB disk) is the cheapest honest Render shape.

**Option E — Railway (Docker).**
- Pricing is usage-based with a minimum, not a capped plan: the subscription
  buys usage credit. Trial: one-time $5 credit, 30 days, no card. After the
  trial it reverts to Free: **$0/mo + $1/mo usage credit** (effectively
  $1/mo), 1 vCPU / 0.5 GB RAM per service, 0.5 GB volume, no custom domains,
  no cron jobs. Hobby: **$5/mo minimum, includes $5 usage**. Rates:
  ~$20/vCPU/mo, ~$10/GB RAM/mo, $0.15/GB/mo volume, $0.05/GB egress.
  A single 0.5 GB service running continuously costs ~$5/mo in memory
  alone — the whole Hobby credit, before CPU. Sources:
  https://temps.sh/blog/railway-pricing-2026;
  https://granite.so/blog/railway-pricing-2026-what-web-worker-postgres-costs
  (checked 1 Oct 2026); https://livemy.app/blog/railway-pricing (verified
  Nov 2026).
- Technically viable (Docker → Bun; persistent volumes exist), but **not
  free beyond the trial**: realistic floor is $5/mo, more if the service
  holds RAM + CPU + egress. Caution, unverified: a third-party tracker
  reported on 22 Oct 2026 that Railway had paused all deployments while
  investigating unauthorized access to stored environment variables
  (https://www.toolbistro.com/radar/railway-pricing). This is **NOT
  VERIFIED against Railway's own status page** — it must be checked there
  before Railway is chosen (blocker T-12). Railway also supports a hard
  usage limit (minimum $10) that takes workloads offline at the cap — a
  useful abuse control if used.

**Option F — Fly.io (Docker).**
- **The free tier is gone for new users.** Fly.io deprecated its Hobby /
  Launch / Scale plans (which included 3 shared-cpu-1x 256 MB VMs, 3 GB
  persistent volumes, 160 GB outbound transfer) in Oct 2024. New
  organizations get a **free trial of 2 VM hours or 7 days, whichever ends
  first**, then pay-as-you-go; the cheapest always-on machine is ~$2–5/mo.
  Legacy organizations on the deprecated plans keep the old allowances.
  Many guides still quote the old free tier — those are stale. Sources:
  https://www.saaspricepulse.com/blog/flyio-free-tier-2026 (verified
  6 Mar 2026); https://www.saaspricepulse.com/blog/flyio-pricing-history;
  https://notes.yxy.ninja/Tools/Fly.io.
- Verdict: not a free option for this project (new account). Technically
  viable paid (Docker → Bun, volumes, private networking), cheapest of the
  paid container options at ~$2–5/mo for a 256 MB machine.

**Option G — Oracle Cloud Always Free VM.**
- Always Free (no expiry): 2 AMD E2.1.Micro VMs + Ampere A1 ARM pool,
  200 GB total block storage, 10 TB outbound transfer/mo. **Allocation
  change, unresolved:** Oracle's own Always Free docs were updated in
  2026 to cut the A1 pool from 4 OCPU / 24 GB (3,000 OCPU-hours +
  18,000 GB-hours/mo) to **2 OCPU / 12 GB** (1,500 + 9,000), with no
  announcement and inconsistent enforcement — existing 4/24 instances
  were still running at $0 at the time of the report. Sources:
  https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/ (Jun 2026);
  https://den.dance/blog/oracle-cloud-arm-free-tier/;
  https://autokaam.com/tutorials/oracle-arm-always-free-tier-2026-real-limits/.
- Operational costs that are not money: card verification at signup; A1
  capacity is frequently unavailable in popular regions ("Out of host
  capacity"); **idle reclaim** — an A1 instance is reclaimed after 7 days
  with p95 CPU/network/memory all below 20%; the operator owns OS patching,
  TLS, firewall, Bun installation, backups, and monitoring. Bun on ARM64
  still needs install-time verification (blocker T-11). No free subdomain:
  the tester would live on a public IP or a domain the owner provides.
- Verdict: the only $0 full-app shape outside Hatch, but with the highest
  operational burden and two live risks (capacity, reclaim) that can take
  the tester down without warning.

### 2.3 The external-database escape hatch (for Options B/C/D)

If the app is ported off the local `app.db` file, the only external database
that keeps the **SQLite dialect** (so `drizzle-orm/sqlite-core` schema and
migrations stay valid) is **Turso (libSQL)**. Free tier, per turso.tech/pricing
as re-read Oct 2026: 100 databases, 5 GB storage, 500M rows read/mo, 10M rows
written/mo, 3 GB syncs/mo, no credit card; **free databases are archived
after 10 days of inactivity** (unarchive via CLI/API); exceeding any single
limit blocks the database (BLOCKED error) until upgrade. Developer plan:
$5.99/mo ($4.99/mo yearly) — 9 GB, 2.5B reads, 25M writes. Note: Turso
announced in Oct 2026 that it is joining Supabase; pricing unchanged so far.
Older write-ups quote 9 GB / 1B reads / 50M writes for the free tier — those
numbers are the paid Developer tier or stale, and are **not** used here.
Sources: https://toolfreebie.com/turso-free-sqlite-database/ (re-read
26 Oct 2026); https://freetier.wiki/services/turso/ (checked 2 Nov 2026);
https://aibizhub.io/articles/turso-pricing/ (verified 11 Oct 2026).
Cloudflare D1 is the other SQLite-semantics option, but it needs the `d1`
dialect and a Workers rewrite (see Option A).

**This does not make Options B/C/D "free and ready":** replacing `ctx.db`
(Hatch-managed) with a libSQL client is a code change — implementation, not
deployment — and it needs its own design, review, and owner approval. It is
listed here so the owner can see the port's shape, not as a shortcut.

### 2.4 Recommendation (not a selection)

No provider is selected in this proposal — that is a decision for the owner
after T-01 is answered. The evidence supports only these two honest shapes:

1. **Free, now, no code changes: static-frontend-only tester** on
   Cloudflare Pages, Vercel, or Netlify (free subdomain, $0), with **all
   seven server actions disabled at the edge** (see §3). It is a **visual
   preview only** — it shows the UI, copy, and layout — **not a functional
   tester**: it cannot browse the live catalog, show check history, or
   answer Gibran questions, because all three need the `./actions`
   endpoint that a static host does not serve (see §2.5 and the corrected
   matrix §3.5). Any catalog-like content shown in this shape must be
   clearly labelled as static sample content, never presented as live
   catalog data.

### 2.5 Client/API request map and the no-backend smoke test (koreksi v2.3.10 — F-011)

**Correction (V3 §5, F-011):** v1 of this proposal (§2.4/§3.5) described
a static frontend with all seven server actions absent while its feature
matrix marked catalog browsing, Gibran Q&A, and `listChecks` as publicly
available. That is incompatible with the current client and is corrected
here. The release in shape 1 is a **visual preview, not a functional
tester**.

**Client/API request map** (verified from the mirror, commit `c68c727`;
no code changed):

| Client call site (`site/client/src/App.tsx`) | Action | Transport | Server effect (`site/server/src/actions.ts`) | Works with no backend? |
| --- | --- | --- | --- | --- |
| Page load, line ~1681 (`projectsQuery`, `queryFn: () => api.listProjects({})`) | `listProjects` | `POST ./actions` `{action, args}` via `createActionClient` (`site/client/src/api.ts`) | Lists catalog; **seeds the catalog from the in-code `CATALOG` constant when the table is empty** (lines 1242–1255) — a write on first call, not strictly read-only | **No** — no response; the projects query fails/empties and the catalog renders empty |
| Page load, line ~1685 (`history`, `queryFn: () => api.listChecks({ limit: 100 })`) | `listChecks` | `POST ./actions` | Lists past checks, newest first | **No** — history renders empty |
| Bookmark/task toggle, line ~1690 (`stateMut`) | `setProjectState` | `POST ./actions` | Upsert into `saved_projects` (write) | **No** — mutation fails |
| Checker submit, line ~1695 (`checkMut`) | `checkLink` | `POST ./actions` | Server-side fetch + scoring + `checks` insert (write) — the SSRF surface (F-001) | **No** — and must stay disabled |
| History delete, line ~1704 (`deleteMut`) | `deleteCheck` | `POST ./actions` | Deletes one check row (destructive write) | **No** — and must stay disabled |
| Gibran chat, line ~1471 (`askMut`, `api.askGibran(payload)`) | `askGibran` | `POST ./actions` | Rebuilds grounding from live DB (all `projects` + last 10 `checks`) + `ctx.inference.complete` | **No** — no grounding data and no inference gateway without the server |
| (No client caller in the mirror) | `addProject` | `POST ./actions` (intended caller: scheduled auto-discovery job) | Catalog insert (write); auth unclear (F-005) | **No** — and must stay disabled |

Every one of the seven actions travels over the same transport
(`createActionClient` POSTs `{action, args}` to `./actions`; there is
no REST/GET fallback and no static-data mode in the reviewed client).
Removing the server therefore removes **all** data-backed features, not
just the writes. A static page can display static guide/about sections
and layout, but it cannot display live catalog data, history, or Gibran
answers.

**No-backend smoke-test specification (for shape 1, static visual
preview — specification only, not implemented):**

1. Serve the built static bundle from the candidate host with no
   `./actions` endpoint configured. Load the page in a clean browser.
2. **Assert zero `POST` requests to `./actions`** in the network log
   (the client will still attempt them on page load — see the map above;
   the test records those attempts and requires that the UI does not
   present their failure as live data).
3. **Assert no empty/broken state is presented as live catalog data:**
   the catalog section must either be absent or carry an explicit label
   such as "Pratinjau visual — data katalog tidak dimuat pada pratinjau
   ini"; it must not render an empty grid/cards as if the catalog were
   empty, and must not render fixture rows as if they were verified
   projects.
4. **Assert disabled features are labelled:** checker submit, Gibran
   chat, bookmarks/task toggles, and history delete must be visibly
   disabled or absent, with a short note that they need the server.
5. **Assert no secrets / wallet fragments / incident narrative** in the
   served bundle (same rescan discipline as F-006).
6. **Assert the version banner** shows the commit SHA + tag of the
   static build (§5.3).
7. **PASS** only if all six assertions hold. Any assertion failing =
   the preview is not publishable as labelled.

**Fixture-backed alternative (NOT specified as buildable here, NOT
authorized):** a static frontend with an explicitly designed, versioned
build-time fixture or a separate safe read-only API would be a different
product (a functional tester) and is implementation work: it needs a
fixture schema + source commit + freshness timestamp + a ban on
personal/check-history data, plus its own owner approval. No fixture is
designed, built, or shipped in this revision.
2. **Full tester: a port + paid/self-managed hosting.** Cheapest honest
   shapes: Fly.io ~$2–5/mo, Railway $5/mo floor, Render $7/mo + disk, or
   OCI $0 with full ops burden — each **after** a port (SDK adapter +
   database externalization or volume) that is itself implementation work
   requiring approval. Option 0 (second Hatch space) would avoid the port
   entirely if public exposure is possible — verify T-01 first, because it
   dominates the decision.

## §3. Environment separation

### 3.1 Separation rules (binding on any tester shape)

| Concern | Production (live) | Tester (proposed) |
| --- | --- | --- |
| Database | Live `app.db` (14 projects, 12 checks, 1 saved row as of 7 Nov 2026) | **Fresh, empty database** created from migrations `0001`–`0005` only. **Never copy the production `app.db` file.** |
| Catalog | Live verified radar | Seeded from migration `0004` only (the same public seed). No production-only rows, no production check history, no bookmarks |
| Credentials / secrets | Live deploy credentials (Hatch) | **Separate account / separate deploy token.** No production credential is ever pasted into the tester |
| Storage / volumes | Live volume | Separate volume / separate database instance. Deleting the tester must be incapable of touching production |
| Deployment secrets | Live | Separate; stored in the provider's secret store, never in the repo |
| Domain | Live site | Separate free subdomain; `robots.txt` disallow + `noindex` so the tester is not indexed as the product |
| Data copied from production | — | **Nothing.** No check rows, no saved-project rows, no wallet data, no incident narrative |

### 3.2 What must never be copied into the tester

Verified: the app code contains **no wallet secrets, no production tokens,
and no API keys** (grep, §1.1). The one sensitive item in the project is
narrative, not code: the original `site/DATA-PLAN.md` (pre-redaction) and
the live artifact's `DATA-PLAN.md` still contain the personal incident
narrative (see `SSRF_RESPONSE_MATRIX_V238.md` §2.6, F-006). The tester
must be seeded **only from the redacted mirror** (`site/DATA-PLAN.md` as
of v2.3.8) and must never copy the live artifact's `DATA-PLAN.md`, any
`app.db` / WAL / SHM file, or any local file outside `site/`.

### 3.3 Test data and reset

- **Test data (full-tester shape ONLY — koreksi v2.3.10, F-011):** 3–5 synthetic catalog rows, clearly marked `TEST —`
  in the name, with fictional contracts and `verified_note: "Synthetic
  tester seed — not a real project"`. Plus 2–3 synthetic check rows so
  `listChecks` and Gibran have something to read. **None of this applies
  to the static-only shape (§2.4 shape 1): a static preview has no
  database, so it has no synthetic rows to read — its catalog/history/
  Gibran are disabled (§3.5), not fed by synthetic data.** Synthetic data is
  created by a seed script that lives in the repo (to be written as
  implementation, not in this proposal) — never by hand-editing the tester
  database.
- **Reset procedure (no production contact):** (1) stop the tester service;
  (2) delete the tester volume / database file (or drop + recreate the
  tester database); (3) re-run migrations `0001`–`0005`; (4) re-run the
  synthetic seed; (5) verify the catalog count equals the synthetic count
  and no production row is present. The reset must be runnable by the
  tester operator without any production credential.
- **Retention:** tester check rows are purged after 7 days (a scheduled
  delete, or volume reset). Tester logs are retained 7 days maximum (see
  §3.4). No user accounts exist, so no account data is retained at all.

### 3.4 Ingress, abuse controls, and retention (applies to any shape)

- **TLS:** provider-managed certificate on the free subdomain (all options
  in §2 provide this). No plain-HTTP serving.
- **Rate limiting / quotas:** the design values already approved in
  `SSRF_REMEDIATION_DESIGN.md` D-4 are **10 checks/minute + 100/hour per
  IP**, with a total deadline of 20 s (D-7) — but those controls **do not
  exist in code yet** (P1-2, blocked behind implementation approval). Until
  they exist, per-IP limiting must come from the provider edge; **no free
  tier verified in §2 documents a usable per-IP rate limit on its free
  plan — NOT VERIFIED per provider** (blocker T-08). The tester therefore
  ships with the safe default below instead of a promised limit.
- **Safe default while limits are unproven:** all write actions disabled
  and `checkLink` disabled (see §3.5) — a read-only tester cannot be
  abused into running the fetcher or writing to the catalog, so the
  missing rate limiter is not load-bearing.
- **Abuse monitoring:** provider access logs (where the free tier keeps
  them — retention varies and is NOT VERIFIED per provider) + a daily
  manual review by the operator during the tester period: request volume,
  4xx/5xx rate, and any `POST ./actions` attempts. Alerting (e.g. a
  volume spike) needs a named operator channel before launch — currently
  **no operator channel is defined** (blocker T-09 in the staging sense;
  see §8 T-09).
- **Request deadlines / concurrency:** no in-app deadline or concurrency
  limit exists yet (F-003, blocked). On a read-only tester the exposure
  is the static host + DB reads only; any future re-enabling of `checkLink`
  requires the F-002/F-003 remediation + harness first (§4).
- **Data retention:** tester DB rows 7 days; access logs per provider
  default (verify at provisioning); no backups of tester data are kept —
  the tester is rebuildable from migrations + seed at any time.

### 3.5 Feature matrix — public / authenticated / allowlisted / disabled

There is **no authentication in the application** (F-005). The
"authenticated" column below is therefore empty by design: any feature
placed there requires building auth, which is implementation. The matrix
is written for the **static-frontend + read-only** tester (shape 1, §2.4);
the full tester (shape 2) would re-derive it after the port.

| Feature | Public | Authenticated | Allowlisted | Disabled (tester) |
| --- | --- | --- | --- | --- |
| Catalog browsing (read-only) | No | — | — | **DISABLED in the static-only shape — needs `listProjects` over `./actions` (§2.5); a static page has no catalog data to browse. (Koreksi v2.3.10 — F-011: v1 wrongly marked this "Yes".)** |
| Guide / About / safety content | **Yes** | — | — | — |
| Gibran Q&A (reads tester catalog + tester check history only) | No | — | — | **DISABLED in the static-only shape — needs `askGibran` over `./actions` plus live DB grounding (§2.5). (Koreksi v2.3.10 — F-011: v1 wrongly marked this "Yes".)** |
| `listChecks` (tester synthetic rows) | No | — | — | **DISABLED in the static-only shape — needs `listChecks` over `./actions` (§2.5); synthetic rows exist only in the full-tester shape (§3.3). (Koreksi v2.3.10 — F-011: v1 wrongly marked this "Yes".)** |
| `checkLink` (Link Scanner) | No | No | No | **DISABLED — until F-001 is fixed and independently verified (§4). Non-negotiable.** |
| `addProject` | No | No | No | **DISABLED — unauthenticated write (F-004/F-005); catalog is seed-only on the tester** |
| `deleteCheck` | No | No | No | **DISABLED — unauthenticated destructive write** |
| `setProjectState` (bookmark / task) | No | No | No | **DISABLED — shared DB makes one visitor's state everyone's state; revisit as client-local state if wanted** |
| Any authenticated feature | — | **None exists** | — | — |
| Allowlist (IP / basic-auth / provider access control) | — | — | **Not implemented — no mechanism exists in code; provider-level control NOT VERIFIED per provider (T-04)** | — |

**How "disabled" is enforced (must be verifiable, not a promise):**
the tester build must not serve the `./actions` endpoint at all (static
hosting has no server to call), or, on a shape with a server, the actions
router must reject `checkLink`/`addProject`/`deleteCheck`/`setProjectState`
before any handler runs. The enforcement mechanism is part of the tester
implementation proposal, not this document — and the audit gate is that
ChatGPT (or any reviewer) can `POST` to the tester and observe a rejection
without any check row being created. Until that probe passes, the tester is
not public.

**Server-side network access denied by default:**
- `169.254.169.254` (cloud metadata), `127.0.0.0/8`, `10.0.0.0/8`,
  `172.16.0.0/12`, `192.168.0.0/16`, `::1`, `fe80::/10`, `fc00::/7`,
  IPv4-mapped IPv6, and any non-global-unicast destination: **deny**.
  These are the same classes the F-001 guard must enforce in code
  (`SSRF_REMEDIATION_DESIGN.md` §D.4.18, harness H-SSRF-01..20).
- Outbound allowlist while `checkLink` is disabled: **nothing except the
  provider's own control plane** (the app makes no outbound calls at all
  when the scanner is off — verified: the only outbound call sites are
  `fetchText` and the RDAP lookup, both inside the `checkLink` path).
- Egress firewall caveat: most free PaaS tiers verified in §2 offer **no
  customer egress firewall** — the deny-by-default must therefore live in
  code (the F-001 guard), not in infrastructure. That is exactly why
  `checkLink` stays disabled until the guard exists and is proven (§4).

## §4. Security acceptance gates

### 4.1 Gate statuses (as of this proposal, 2026-11-08)

Statuses use the protocol vocabulary: **PASS / FAIL / NOT PROVIDED /
NOT VERIFIED**. No gate is marked PASS without an artifact, test output,
or verifiable provider documentation. The F-001..F-009 statuses below are
taken from `SSRF_RESPONSE_MATRIX_V238.md` §1; the tester-specific
additions are new.

| ID | Gate | Status | Evidence required before public exposure |
| --- | --- | --- | --- |
| F-001 | SSRF in `checkLink` (Critical) | **NOT VERIFIED — blocked** | Implementation (stage b) + harness H-SSRF-01..20 ALL PASS **in staging** (not only VM) + independent audit + owner approval. One case FAIL = gate closed. See §4.2 |
| F-002 | Response cap after full buffering (High) | **NOT VERIFIED — blocked** | Implementation + harness H-RES-01..03 in staging |
| F-003 | No total deadline (High) | **NOT VERIFIED — blocked** | Implementation + harness H-RES-04..06 in staging |
| F-004 | `addProject` duplicate race (Medium) | **NOT VERIFIED — blocked** | Unique-constraint migration + harness H-CAT-01..03 in staging |
| F-005 | `addProject` authorization unclear (Medium) | **NOT VERIFIED — blocked** | Owner decision on the authorization mechanism + implementation + harness H-AUTH-01..03 |
| F-006 | Personal narrative in public mirror (Medium) | **Partially addressed — mirror only** | Mirror `site/DATA-PLAN.md` redacted + rescanned (v2.3.8). Source-code narrative (`actions.ts:51`, `GIBRAN_SITE_KNOWLEDGE` ~line 1089) OPEN; live artifact DATA-PLAN cleanup done 2026-11-08 ~00:59 WIB but **reported by Muse, not independently verified**. Split: F-006a/b/c in `SSRF_RESPONSE_MATRIX_V2310.md`. Tester gate: seed the tester ONLY from the redacted mirror; never copy the live artifact's pre-redaction `DATA-PLAN.md` |
| F-007 | v2.3.6 raw logs absent from repo (Medium) | **Partially addressed** | Bundle `evidence/v236/` published (21 files + manifest, SHA-256 verified). Caveat: `su-run4` is a 2-line tail only; the initial failed SU-T5 run and the third OPS-T7 run are NOT PROVIDED (not recoverable). Tester gate: all tester evidence follows the same manifest discipline |
| F-008 | SU-T5 explanation in v2.3.7 inaccurate (Medium) | **PASS** | Correction verified against committed code (`SSRF_RESPONSE_MATRIX_V238.md` §2.8) |
| F-009 | Mirror not reproducible (Medium) | **Partially addressed** | `site/bun.lock` mirrored (SHA verified) + reproducibility manifest. Still NOT VERIFIED: SDK tarball provenance, site test suite / CI, build & typecheck results. Tester gate: a reproducible build from a pinned commit must exist before any tester deploy — **currently NOT VERIFIED for any third-party host** |
| U-46 | Numeric-kill fallback divergence | **OPEN — owner decision pending** | Written owner decision, option (a) or (b), + the acceptance criteria in `SSRF_RESPONSE_MATRIX_V238.md` §3. Blocks worker-signaling implementation, not the tester itself — but any tester that includes the remediation must carry the decision |
| T-G1 | Tester `checkLink` probe | **NOT PROVIDED** | A `POST` probe to the tester `./actions` for `checkLink` returns a rejection and creates no `checks` row (see §3.5) |
| T-G2 | Tester has no production data | **NOT PROVIDED** | Catalog/check counts equal the synthetic seed counts; zero production rows (see §3.3). **Applies to the full-tester shape only** — the static-only shape has no database at all (§2.5) |
| T-G3 | Reproducible tester build | **NOT VERIFIED** | Build from a pinned commit + `bun.lock` succeeds in CI; artifact tagged by commit SHA (see §5) |

**Consequence:** the only tester shape that can pass its gates today is the
static visual preview (§2.4 shape 1, §2.5): F-001..F-005 stay closed
by disabling the features, F-006/F-008 pass at mirror level, F-007/F-009 are documented
caveats, and T-G1/T-G3 are provable without any implementation. A full
tester cannot pass T-G1/T-G3 — let alone F-001 — until the port exists and
the remediation is implemented, staged, and independently audited.

### 4.2 SSRF control checklist (what "fixed and independently verified" means)

Every item maps to the v2.3.8 harness (`SSRF_RESPONSE_MATRIX_V238.md`
§2.1) and to a test level. **A harness pass is not proof of production
safety**: it is evidence about the implementation under test, in staging,
against controlled stubs. Production safety additionally needs the staging
inventory (§D.4.19, ST-01..ST-16), the egress documentation (ST-03/ST-16),
an independent audit of the committed code, and the owner's release
decision (§6).

| Control | Harness | Level | What PASS requires |
| --- | --- | --- | --- |
| Initial URL: scheme + host parsing (incl. non-canonical IP forms, userinfo masking) | H-SSRF-18, H-SSRF-19 | Unit | Every non-canonical form parses to the true IP and is rejected; 0 connections |
| DNS resolution: ALL A/AAAA answers validated; mixed answers rejected as a set | H-SSRF-12 | Integration (stub DNS) | Any single forbidden answer rejects the whole set; 0 connections to forbidden addresses |
| DNS rebinding: destination pinned to the validated address; re-resolution cannot change it | H-SSRF-11, H-SSRF-16 | Integration (stub DNS, TTL 0) | Connections only to the pinned public address; 0 connections to the rebound address |
| IPv4 classes: private (RFC1918), loopback, link-local, metadata, CGNAT (per D-6, blocked by default) | H-SSRF-01..04 | Unit + integration | 0 connections to any address in the class |
| IPv6 classes: loopback, link-local, unique-local, IPv4-mapped, zone-scoped | H-SSRF-05..09 | Unit + integration | 0 connections; mapped/zone-scoped forms treated as their embedded IPv4 address |
| Redirects: re-validation at EVERY hop, chain limit | H-SSRF-10, H-SSRF-15, H-SSRF-20 | Integration (stub servers) | Chain stops at the violating hop; 0 connections to internal hops; hop cap enforced |
| Script fetch: same-origin only, internal script sources never fetched | H-SSRF-13, H-SSRF-14 | Integration | 0 fetches to internal or cross-origin script URLs |
| CNAME to internal | H-SSRF-17 | Integration (stub DNS) | CNAME followed to the final answer and the final answer validated; 0 connections |
| DNS pinning / rebinding resistance in the real stack | ST-14 (H-SSRF-10..12, 16..17 in staging) | Staging | Same verdicts on the staging runtime (not only the VM) |
| Egress / network controls (NAT64/DNS64, NSP prefixes) | ST-03, ST-16, tests S-49/S-50 | Infrastructure | Egress documented in writing (or a written statement that no NAT64/DNS64 exists) + staging tests pass; U-11 stays OPEN until both hold |
| Resource bounds on the fetch path | H-RES-01..06 (F-002/F-003) | Integration + staging | Streamed caps, decompressed caps, one total deadline, bounded concurrency — all within stated budgets |
| Catalog / auth controls | H-CAT-01..03, H-AUTH-01..03 (F-004/F-005) | Integration + staging | Exactly 1 row under concurrent duplicates; unauthorized calls rejected + logged |

## §5. Deployment and rollback

### 5.1 Branch and environment strategy

| Environment | Branch / ref | Deploys from | Data | Public? |
| --- | --- | --- | --- | --- |
| Review / design (repo only) | `main` | — (no deploy) | — | No |
| Tester | **Tag only, e.g. `tester/v1`, cut from a reviewed commit** | The tagged commit, never `main` directly | Fresh tester DB + synthetic seed (§3.3) | Yes, on the free subdomain, read-only (§3.5) |
| Production (live Hatch space) | Live artifact via artifact workflow only | Owner-approved change | Live `app.db` | Yes (existing) |

Rules: no auto-deploy from `main`; no deploy from an unreviewed commit;
the tester tag is cut only after the gates in §4 that apply to that shape
pass; a tester deploy is **opt-in and requires a separate explicit approval
from the project owner** (see §5.4).

### 5.2 CI checks (required before a tester tag is cut)

1. `bun.lock` present and matching `package.json` (F-009 — the lockfile now
   exists in the mirror as of v2.3.8).
2. Typecheck (`bun x tsc --noEmit` for client + server) — **currently NOT
   VERIFIED from the mirror**: no typecheck/build result exists in the repo
   (F-009), and builds are house-ruled to run only via the artifact tools,
   never `bun build` from the VM. CI for a third-party host therefore
   needs a build path that does not yet exist — blocker T-05.
3. Migration dry-run against an empty SQLite file (migrations `0001`–`0005`
   apply cleanly; seed count matches).
4. Static scan of the tester bundle for secrets / wallet fragments /
   incident narrative (same rescan discipline as F-006).
5. The T-G1 probe (§4.1): `checkLink` rejected, no row created.

### 5.3 Immutable artifact / versioning

- One build per tag; the artifact is identified by the commit SHA
  (`tester/v1` → SHA). Rebuilds of the same tag are forbidden — a new
  build gets a new tag.
- The tester serves a version banner (commit SHA + tag) so any visitor or
  reviewer can trace the running code to the repo.

### 5.4 Secrets management

- Deploy tokens / provider credentials live in the provider's secret store
  (or the owner's password manager), never in the repo, never in chat.
- The tester needs no application secrets (verified: the app reads none).
- Rotation: on any suspected exposure, rotate the tester deploy token and
  re-cut the tag; production credentials are never involved.

### 5.5 Health check

- **No health endpoint exists in the app** (§1.1). Until one is added
  (implementation), liveness is the provider's TCP/HTTP check against `/`
  (static index) — which proves the host is up, not that the actions
  layer works. A real readiness check (DB reachable, migrations applied,
  actions router responding with the expected rejection for disabled
  actions) is part of the tester implementation proposal, not this document.

### 5.6 Rollback procedure

1. **Static tester:** redeploy the previous tag (`tester/v0`); the old
   static bundle is immutable, so rollback is a pointer change. Then
   delete the faulty tag.
2. **Container/VM tester:** stop the service, restore the previous image
   tag, restore the tester volume snapshot taken before the deploy (tester
   data is synthetic, so restoring is safe); verify the version banner
   shows the previous SHA.
3. **Data rollback is never needed** on the tester: its database is
   synthetic and rebuildable from migrations + seed in minutes (§3.3).
4. **Emergency kill-switch:** unpublish / suspend the tester at the
   provider (or remove the DNS record) without touching production. The
   kill-switch operator and the exact steps are written into the release
   decision (§6) before launch.

### 5.7 Who may promote a build

Only the project owner (Rama) may authorize a tester deploy or a promotion
to production. Muse proposes (this document, then an implementation
proposal), ChatGPT audits the committed artifact, the owner records the
decision in `docs/deployment/RELEASE_DECISIONS.md` (see §6). Nobody else
— not Muse, not ChatGPT — can promote a build.

## §6. Operating model for the three-party loop

### 6.1 Exact repository paths

| Artifact | Path | Author |
| --- | --- | --- |
| This proposal (V1) | `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md` | Muse |
| Future proposal revisions | `docs/deployment/PUBLIC_TESTER_PROPOSAL_V2.md`, … | Muse |
| Response matrices (per revision) | `SSRF_RESPONSE_MATRIX_V238.md` (v2.3.8), then `SSRF_RESPONSE_MATRIX_V24x.md` | Muse |
| Remediation design (living) | `SSRF_REMEDIATION_DESIGN.md` (currently v2.3.8) | Muse |
| Implementation proposals (when authorized) | `docs/deployment/IMPLEMENTATION_PROPOSAL_<scope>_V1.md` (new) | Muse |
| Test evidence (raw logs + manifest) | `evidence/<run>/` + `evidence/<run>/MANIFEST.md` (pattern set by `evidence/v236/`) | Muse |
| Reproducibility manifest | `SSRF_REPRODUCIBILITY_V238.md` | Muse |
| ChatGPT audits | `SSRF_CODE_SECURITY_AUDIT_V1.md`, `SSRF_INDEPENDENT_AUDIT_V2.md`, then `SSRF_*_AUDIT_V*.md` | ChatGPT |
| Project discussions | `PROJECT_DISCUSSION_PUBLIC_TESTER_20261108.md` (this thread), future `PROJECT_DISCUSSION_*.md` | ChatGPT / Muse |
| Blocker log | **This document §8** (tester blockers T-01..T-14) + the V2 register B-01..B-12 in `SSRF_INDEPENDENT_AUDIT_V2.md` | Muse / ChatGPT |
| Release decisions (owner-signed) | `docs/deployment/RELEASE_DECISIONS.md` (new file, to be created at first release decision) | Owner (Rama) |

### 6.2 How handoffs are acknowledged (no relay)

- **Muse acknowledges a ChatGPT handoff only by publishing a repository
  artifact**: a response matrix, a commit, or a document in the paths
  above. A chat message from Muse is not an acknowledgement.
- **ChatGPT acknowledges Muse's work only by committing an audit** that
  reads the changed files independently (per
  `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md`, commit `73876cf`). It does not
  audit from Muse's messages.
- **The owner never relays.** The repo is the channel; the 30-minute
  `github-commit-watch` cron surfaces new commits to the owner. If a
  handoff has no repo artifact, it has not happened — that is the rule
  both sides already follow (ChatGPT's V2 audit notes the 4-minute gap
  between V1 and V2 and correctly records "no Muse response yet" as a
  repo fact).

### 6.3 Blocker format (applies to §8)

Every blocker carries: **owner, next action, dependency, acceptance
criteria, evidence link**. A blocker is closed only by the evidence its
acceptance criteria names — never by a document edit alone.

## §7. Cost estimate (including upgrade triggers)

All figures USD, from the sources in §2.2, checked Oct–Nov 2026. Free tiers
change; re-check before committing.

| Shape | Monthly cost at tester scale | What triggers an upgrade |
| --- | --- | --- |
| Static-frontend-only tester (Cloudflare Pages / Vercel Hobby / Netlify Free) | **$0** | Traffic >100k req/day (Cloudflare) or >100 GB transfer (Vercel) or 300 credits exhausted (Netlify) → paid plan ($5/mo Cloudflare Workers Paid; $20/seat Vercel Pro; Netlify Pro per usage). Note: the tester is read-only, so these triggers are unlikely at tester scale |
| Second Hatch space (Option 0) | **Unknown — NOT VERIFIED** (T-01) | Unknown until the platform's terms are known |
| Fly.io (full tester, paid) | **~$2–5/mo** (smallest shared-cpu-1x 256 MB machine) | More RAM/CPU, more volume, egress beyond the allowance → usage billing |
| Railway (full tester) | **$5/mo floor** (Hobby minimum, includes $5 usage) | Usage above $5 (RAM ~$10/GB/mo, vCPU ~$20/mo, egress $0.05/GB) → pay the usage |
| Render (full tester) | **$7/mo + $0.25/GB disk** | More RAM/CPU, larger disk, or Postgres instead of a disk → higher instance tier |
| OCI Always Free VM (full tester) | **$0** (if the allocation holds) | Exceeding the Always Free allocation, or the A1 cut being enforced (T-11) → pay-as-you-go rates; or reclaim (7-day idle) → rebuild |
| Turso (if the DB is externalized) | **$0** (Free: 100 DBs, 5 GB, 500M reads / 10M writes / mo) | Writes >10M/mo, storage >5 GB, or a DB archived after 10 days idle → Developer $5.99/mo ($4.99/mo yearly) |
| Cloudflare D1 (if the API is rewritten for Workers) | **$0** (Free: 5M reads / 100k writes per day) | Daily caps exceeded → Workers Paid $5/mo (25B reads / 50M writes per month included) |

**Realistic totals for a full tester:** $0 (OCI, with ops burden and
reclaim risk) to ~$5–10/mo (Fly.io / Railway / Render). There is no
$0 full-tester shape on a managed PaaS free tier — that is the central
finding of §2, and any claim otherwise should be treated as an error
until it is shown against R1–R3.

## §8. Unresolved assumptions and blockers

| ID | Blocker / assumption | Owner | Next action | Dependency | Acceptance criteria | Evidence link |
| --- | --- | --- | --- | --- | --- | --- |
| T-01 | Can a second Hatch space be publicly exposed on a free subdomain? (Option 0 viability) | Owner + platform | Ask/verify from the Hatch platform: public exposure, egress controls, quotas, state isolation | — | Written platform answer or a doc link; then Option 0 is ranked or rejected | (to be added) |
| T-02 | `@hatch/space-sdk` is a builder-local `file:` tarball — unresolvable on any third-party host | Muse | Port/adapter design for the actions layer (implementation proposal) | Owner approval for implementation (stage b) | Adapter design + a build that succeeds off the Hatch builder | `site/package.json`; `SSRF_REPRODUCIBILITY_V238.md` |
| T-03 | `ctx.db` is Hatch-managed SQLite; externalizing the DB (e.g. Turso) is a code change | Muse | DB-externalization design (implementation proposal) | Owner approval (stage b) | Design + migration plan + staging evidence | `site/server/src/schema.ts`; §2.3 |
| T-04 | No auth exists in the app; no provider-level allowlist verified | Owner | Decide: public read-only tester (no auth needed) vs allowlisted tester (needs a mechanism) | Provider docs (per host) | Named mechanism + probe proving non-allowlisted access is rejected | F-005; §3.5 |
| T-05 | No CI, no build/typecheck results from the mirror; builds are house-ruled to artifact tools only | Muse | CI/build-path design for the tester host | Owner approval (stage b) | A green CI run from a pinned commit (T-G3) | F-009; `site/AGENTS.md` |
| T-06 | F-001..F-005 open → `checkLink` and all writes disabled on the tester | — (fact, not a decision) | Remediation implementation + staging harness + independent audit | Owner approval (stage b); U-46 decision (T-07) | §4.1 gates F-001..F-005 PASS in staging | `SSRF_RESPONSE_MATRIX_V238.md` |
| T-07 | U-46 owner decision pending (numeric-kill fallback: option a or b) | **Rama** | Written decision naming the option + date | STAGE-P01/P08 facts (pidfd availability, prod pid_max) | Criteria in `SSRF_RESPONSE_MATRIX_V238.md` §3 | Same |
| T-08 | Per-IP rate limiting does not exist in code; no free-tier edge rate limit verified per provider | Muse | Verify per-provider edge controls at provisioning; implement P1-2 after stage-b approval | Owner approval (stage b) | Named control + probe (429 behavior) | D-4; §3.4 |
| T-09 | No named alert operator / channel for the tester; no staging operator defined (ST-10/ST-12) | Owner | Name operator + channel + on-call hours before launch | — | Name + channel recorded in the release decision | `SSRF_REMEDIATION_DESIGN.md` §D.4.19 |
| T-10 | Who pays, whose account, who holds deploy credentials | **Rama** | Owner decision (account owner + payer + credential holder) | Provider choice | Recorded in `docs/deployment/RELEASE_DECISIONS.md` | — |
| T-11 | OCI A1 allocation cut (4 OCPU/24 GB → 2 OCPU/12 GB) + capacity scarcity + 7-day idle reclaim; Bun on ARM64 unverified at install time | Muse | Re-check Oracle's Always Free page at provisioning; test Bun ARM64 install on the provisioned shape | Provider choice = OCI | Current allocation in writing + successful Bun install + 7-day survival | §2.2 Option G |
| T-12 | Third-party report (22 Oct 2026) that Railway paused deployments during an env-var unauthorized-access investigation | Muse | Verify against Railway's own status page / security disclosure before choosing Railway | Provider choice = Railway | Railway's own statement (all-clear or incident record) | https://www.toolbistro.com/radar/railway-pricing |
| T-13 | Render free Postgres expiry: 30 days (Render docs, Oct 2026) vs 90 days (older guides) | Muse | Read Render's Deploy for Free page at provisioning | Provider choice = Render | Current expiry in writing from Render's docs | §2.2 Option D |
| T-14 | Vercel Hobby is non-commercial personal use only — is a public tester within that? | **Rama** | Owner judgement (the tester is a free public information tool; no revenue) | Provider choice = Vercel | Owner's recorded reading, or Vercel's own terms page at provisioning | §2.2 Option B |

## §9. Answers to the six numbered questions (mapping)

| # | Question (from `PROJECT_DISCUSSION_PUBLIC_TESTER_20261108.md`) | Answered in |
| --- | --- | --- |
| 1 | Hosting/runtime fit — compatible options, static vs backend, free-tier limits, sleep/cold start, execution limits, outbound restrictions, persistent disk/DB, vendor lock-in; do not assume Cloudflare Pages alone suffices | §1.4 (requirements R1–R6), §2.1–§2.3 (comparison + per-option evidence). Cloudflare Pages alone is explicitly insufficient for the full app (§2.2 Option A) |
| 2 | Environment separation — dedicated tester env, separate DB/credentials/storage/catalog/secrets, test-data generation + reset, no sensitive data copied | §3.1–§3.3 |
| 3 | Safe public exposure — feature matrix (public/authenticated/allowlist/disabled), Link Scanner disabled until F-001 fixed + verified, ingress/auth/rate limit/quota/abuse monitoring/deadline/concurrency/retention, server-side network access denied by default | §3.4–§3.5 |
| 4 | Security acceptance gates — F-001..F-009 + U-46 mapped to evidence; SSRF coverage (initial URL, DNS + rebinding, IPv4/IPv6 classes, per-hop redirects, script fetch, DNS pinning/rebinding resistance, egress controls); test levels; harness pass ≠ production safety | §4.1–§4.2 |
| 5 | Deployment and rollback — branch/environment strategy, CI checks, immutable artifact/versioning, secrets, health check, rollback, who may promote; opt-in + separate explicit owner approval | §5.1–§5.7 |
| 6 | Operating model for the three-party loop — exact repo paths, blocker format (owner/next action/dependency/acceptance criteria/evidence link), Muse acknowledgement via repo artifact, no owner relay | §6.1–§6.3, §8 |

## §10. Sources

**Repo (all paths relative to the repo root):**
- `site/package.json` — Bun 1.3.10, build scripts, `file:` SDK tarball
- `site/space.json` — platform v28, slug `cek-link-airdrop`, `managedCronJobs: []`
- `site/server/src/actions.ts` — 7 actions; `normalizeUrl` (69–89), `fetchText`
  (101–125), `lookupRdap` (134), script fetch (~373–386), `runCheck` (~616),
  `addProject` (~959), `Actions` (1205–1357)
- `site/server/src/schema.ts` — `drizzle-orm/sqlite-core`, tables `checks` /
  `projects` / `saved_projects`, no unique constraints
- `site/AGENTS.md` — build/ship only via artifact tools; `app.db` location
- `site/drizzle/0001`–`0005` — migrations; `0004` seed (47 statements)
- `site/client/src/api.ts` — `createActionClient`, POST `./actions`
- `SSRF_RESPONSE_MATRIX_V238.md` — F-001..F-009 statuses, harness
  H-SSRF-01..20 / H-RES-01..06 / H-CAT-01..03 / H-AUTH-01..03, U-46 definition
- `SSRF_REMEDIATION_DESIGN.md` — v2.3.8; §D.4.18 remediation design,
  §D.4.19 staging inventory ST-01..ST-16, §G risks incl. U-46, decisions D-1..D-8
- `SSRF_REPRODUCIBILITY_V238.md` — F-009 manifest (lockfile, SDK provenance,
  Bun versions, no CI/test suite)
- `SSRF_CODE_SECURITY_AUDIT_V1.md` (commit `52724d6`) — F-001..F-006
- `SSRF_INDEPENDENT_AUDIT_V2.md` (commit `789797e`) — F-007..F-009, B-01..B-12
- `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`) — handoff rules
- `evidence/v236/MANIFEST.md` — evidence-bundle discipline

**Provider documentation (as re-read by the linked trackers, Oct–Nov 2026;
re-check before committing — free tiers change):**
- Cloudflare Workers limits — https://developers.cloudflare.com/workers/platform/limits/
  (via https://stacksfree.com/blog/cloudflare-only-free-stack-2026/ and
  https://www.budgetforge.dev/tools/cloudflare-workers-pricing-2026)
- Cloudflare D1 free tier — https://dev.to/signops/cloudflare-d1-free-tier-limits-what-counts-as-a-row-written-d6e
- Vercel Hobby limits — https://formsubmit.app/blog/vercel-free-plan-limits,
  https://www.stackverdict.org/guides/is-vercel-free/,
  https://convika.com/compare/vercel-hobby-limits/
- Vercel Bun runtime — https://bun.com/guides/deployment/vercel,
  https://vercel.com/changelog/bun-runtime-now-supports-large-functions-and-extended-max-duration
- Netlify Free (credit-based) — https://formsubmit.app/blog/netlify-free-plan-limits,
  https://stackwrite.com/blog/netlify-free-tier-pricing-2026/,
  https://supadrop.host/blog/netlify-pricing-free-tier-limits/
- Render free tier — https://justcreateapp.com/is-render-a-good-hosting-platform,
  https://convika.com/compare/render-free-tier-production/,
  https://softoraguide.com/blog/railway-vs-render-2026/
- Railway pricing — https://temps.sh/blog/railway-pricing-2026,
  https://granite.so/blog/railway-pricing-2026-what-web-worker-postgres-costs,
  https://livemy.app/blog/railway-pricing; incident report (unverified):
  https://www.toolbistro.com/radar/railway-pricing
- Fly.io free tier removed — https://www.saaspricepulse.com/blog/flyio-free-tier-2026,
  https://www.saaspricepulse.com/blog/flyio-pricing-history,
  https://notes.yxy.ninja/Tools/Fly.io
- Oracle Always Free — https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/,
  https://den.dance/blog/oracle-cloud-arm-free-tier/,
  https://autokaam.com/tutorials/oracle-arm-always-free-tier-2026-real-limits/
- Turso free tier — https://toolfreebie.com/turso-free-sqlite-database/,
  https://freetier.wiki/services/turso/,
  https://aibizhub.io/articles/turso-pricing/

## §11. What this proposal does NOT do

- It does not deploy anything, anywhere.
- It does not change application code, the database, the catalog, or any
  live service, and it does not activate Link Scanner.
- It does not select a hosting provider — the choice follows the owner's
  answer to T-01 and the decisions in §8.
- It does not claim any security gate PASS that the evidence does not
  support. F-001..F-005 remain NOT VERIFIED / blocked; the only tester
  shape that can go public today is the static visual preview
  (§2.4 shape 1, §2.5) with every server action disabled.
- It does not ask ChatGPT to audit from this message. The next audit, if
  any, reads this committed document from the repo — per the protocol.
