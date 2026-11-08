# SSRF INDEPENDENT AUDIT V15 — Free-Beta Feasibility and Repository Readiness

**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Branch reviewed:** `main`  
**Audit date:** 8 November 2026, 13:30 WIB  
**Previous audit:** V14, commit `f74f0bd6c89a4232c88545a57f4096c563329073`  
**Latest Muse technical revision found:** v2.3.20, commit `b543eca09655c1af523d3d44e228d6d1bc5b241b`  
**Decision:** **NOT READY FOR COMMUNITY BETA — DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**

---

## 1. Executive decision

The repository has not received a new Muse technical revision after v2.3.20. The newer commits are owner/audit instructions, not a Muse response. No public beta URL, deployment record, health-check evidence, provider configuration, or beta readiness package was found.

This audit identifies a new release blocker for the requested free-tier URL: the checked-in application is coupled to the Hatch Space SDK/runtime and does not currently present a verified, provider-independent web deployment target. A GitHub-to-Vercel connection alone is not enough to make this application deployable. The repository README also contains contradictory deployment-state statements and must be reconciled before it is used as an operator guide.

Do not invite community testers to the current Link Scanner. The actual action remains exported in the source, the SSRF/resource protections are not implemented, and user-history isolation is not established. A separate static landing page could be published for project information, but that would not be an application beta and must not be represented as a working scanner.

## 2. Commit and handoff reconciliation

Recent `main` commits, newest first:

| Commit | Meaning | Audit interpretation |
|---|---|---|
| `8a02d13628b81a8410efd0f55040a40484dce3e8` | Owner-authored addition requiring parallel product development | New owner instruction; not a Muse response |
| `ba78b0b7675e740424ca3e3bcf29e7588b2b3371` | Free-tier closed-beta directive | ChatGPT handoff; not a Muse response |
| `48c3f9432c1507bff77621a207f6dcf0eb8383f4` | V14 execution directive | ChatGPT handoff; not a Muse response |
| `f74f0bd6c89a4232c88545a57f4096c563329073` | Independent V14 audit | Prior audit |
| `b543eca09655c1af523d3d44e228d6d1bc5b241b` | Muse v2.3.20 | Latest Muse technical response located |

Commit `8a02d136...` changes only `CLOSED_BETA_FREE_TIER_DIRECTIVE.md`; its author is the repository owner. It adds a requirement that safe product development continue in parallel on an isolated development branch. The only branch returned by repository branch search was `main`; no development branch currently exists.

### Response to Previous Handoff

**V14 directive (`MUSE_DIRECTIVE_V14_ACTION_REQUIRED.md`, commit `48c3f943...`): NO RESPONSE FOUND.** No Muse-authored commit after v2.3.20 was present at audit time. F-044, F-045, and F-046 therefore remain open. There is no evidence Muse read the directive.

**Free-tier directive (`CLOSED_BETA_FREE_TIER_DIRECTIVE.md`, commit `ba78b0b...`): NO RESPONSE FOUND.** No `CLOSED_BETA_READINESS.md`, `CLOSED_BETA_TEST_PLAN.md`, `DEPLOYMENT_FREE_TIER.md`, `TESTER_QUICKSTART.md`, or `RELEASE_EVIDENCE.md` was present at the inspected paths. No URL or deployment evidence was provided.

**Owner instruction to continue development (`8a02d136...`): NOT YET ACTIONED IN REPOSITORY.** Only `main` was listed; no isolated development branch or concrete development backlog was found. This is an operational gap, not evidence that Muse has ignored an instruction it may not yet have read.

## 3. New repository and deployment-feasibility review

### 3.1 Files inspected

| File | Blob SHA | Relevant evidence |
|---|---|---|
| `site/package.json` | `0381230ed239101d140981dcbc0edf5dd0c4ef7f` | Bun 1.3.10; build scripts; local Hatch SDK dependency |
| `site/bun.lock` | `a571381ee62ef416fec62da58b1b5f1710f0df86` | Lockfile resolves Hatch SDK from `/opt/hatch/...` |
| `site/client/build.mjs` | `2923b0efc687b3fb67eb2ebadaf00400ed3fe63e` | Client build delegates to `@hatch/space-sdk/build` |
| `site/server/src/actions.ts` | `0796f4d61e07670b0a1fecfa9d5a6bff7cefb86b` | Hatch `defineAction`, `Ctx`, `ctx.db`, `ctx.inference`; SSRF and ownership paths |
| `site/server/src/schema.ts` | `3269630bdf7a07bfbf45118419c311e6a330050a` | SQLite schema has no `checks.owner_user_id`; `saved_projects` key is only `project_id` |
| `README.md` | `94b4d47b8f5e498252e3f3e763a500f56d4878e4` | Conflicting statements about repository, live artifact, and deployment state |

### 3.2 Runtime and build coupling

`site/package.json:5` pins `packageManager` to `bun@1.3.10`. Lines 8–10 build the server by bundling `./src/actions.ts` to `./dist/actions.js` with Bun and then call `bun ./client/build.mjs`. Line 13 declares `@hatch/space-sdk` as `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`.

`site/bun.lock` records the same machine-local SDK path. `site/client/build.mjs:8–10` imports `buildClient` from `@hatch/space-sdk/build` and invokes it. The server source imports `defineAction`, `ActionsModule`, and `Ctx` from the same SDK; handlers depend on `ctx.db` and `ctx.inference`.

The inspected build scripts produce an SDK action bundle and invoke an SDK-owned client build. They do not show a generic HTTP server/route adapter, a Vercel function entry point, or a Cloudflare Worker entry point. The SDK's package contents and provider/runtime contract are not available in the repository. A clean external builder cannot be assumed to possess `/opt/hatch/...`.

**Conclusion:** a direct deploy of the current repository to Vercel, Cloudflare, or another generic host is **NOT VERIFIED and presently BLOCKED by build/runtime portability**. This is consistent with the earlier F-030 external-builder blocker, but it is now a direct blocker to the owner's free-beta URL objective. Do not invent a deploy URL or treat a static GitHub page as the application.

### F-047 — High — Free-tier deployment portability is not established

**Classification:** design / deployment-readiness gap (not a confirmed vulnerability).  
**Confidence:** High.  
**Evidence locations:** `site/package.json:5,8–13`; `site/bun.lock` workspace dependency; `site/client/build.mjs:8–10`; `site/server/src/actions.ts:12–14` and action handlers using `ctx.db` / `ctx.inference`.

**Scenario and impact:** an external CI/deployment builder checks out the repository but cannot resolve the machine-local Hatch SDK tarball or reproduce the SDK-owned build/runtime. Even if the client bundle were produced, the server actions require the Hatch action invocation/context contract. The project therefore cannot yet be called deployable to Vercel Hobby or Cloudflare Workers merely because those providers offer free HTTPS hosting.

**Preconditions:** deployment is attempted outside the existing Hatch runtime without a portable SDK artifact and documented adapter.

**Required mitigation:** obtain an authorized, redistributable SDK package or a provider/runtime statement and exact build contract; alternatively design a supported adapter/port for the target host and database. Build from a clean clone in a clean runner with no `/opt/hatch` mount. Prove server action routing, auth, database persistence, inference fallback, health check, and rollback in an isolated environment.

**Regression/acceptance tests:** clean clone + frozen install succeeds; build produces all required artifacts; deployment starts from the documented entry point; health endpoint returns expected status; database survives instance restart; unauthorized requests are denied; logs show no secrets; teardown/rollback is reproducible. Until then, deployment remains BLOCKED.

### 3.3 README consistency

`README.md:15–17` says the GitHub repository, Supabase project, and Vercel account do not yet exist. The repository is in fact public and has an active `main` branch. `README.md:37–42` says a full-stack web artifact is already live and lists Link Scanner, Explorer, Gibran, and automation. `README.md:73–75` then says the package is documentation plus a framework skeleton, not a deployed application. Lines 95–112 describe Supabase/Vercel as a target stack and owner prerequisites.

These statements cannot all serve as a current deployment-status description. The README may combine a hosted Hatch artifact with a separate migration foundation package, but it does not explain the boundary.

### F-048 — Medium — README contradicts repository and deployment state

**Classification:** documentation / operational design gap.  
**Confidence:** High.  
**Evidence:** `README.md:15–17, 37–42, 73–75, 95–112`.

**Scenario and impact:** an operator or contributor follows the wrong deployment instructions, believes a deployable app exists in the repository when only an SDK-bound action package is present, or believes the GitHub repository does not exist. This creates false readiness and can waste time or expose the wrong artifact.

**Mitigation:** rewrite the status section to distinguish (1) current Hatch-hosted artifact, (2) source mirror/repository, (3) migration foundation package, and (4) future standalone deployment. Every statement must include verification date and evidence. Remove stale claims that GitHub does not exist. Do not claim Supabase/Vercel are provisioned unless proven.

**Regression test:** a reviewer can answer from README alone which artifact is live, where its source is, what runtime it needs, what is not deployed, and which exact owner actions remain.

## 4. Security baseline carried forward from actual source

No application source, schema, migration, package manifest, lockfile, CI workflow, deployment configuration, or live artifact changed in commits after V14. The V14 source review therefore remains applicable. This audit independently re-fetched the current action/schema/package files and confirmed the following relevant facts:

- `site/server/src/actions.ts:70` `normalizeUrl()` only enforces HTTP/HTTPS. It does not reject private, loopback, link-local, reserved, or IPv6 local destinations.
- `site/server/src/actions.ts:170–205` `fetchTextOnce()` follows manual redirects but does not validate each redirect destination before fetching; it calls `res.text()` before slicing to the cap.
- `site/server/src/actions.ts:231` `lookupRdapOnce()` uses ordinary `fetch` with `redirect: "follow"`.
- `site/server/src/actions.ts:369–378` still sets a 30-second total deadline, while the v2.3.20 design decision says 20 seconds.
- `site/server/src/actions.ts:1364–1371` still exports `checkLink` in the `Actions` map. This proves it remains registered in source; it does not prove runtime invocation or live deployment status. Link Scanner disabled state remains NOT VERIFIED.
- `site/server/src/schema.ts:3–29` defines `checks` without `owner_user_id`. `site/server/src/schema.ts:54–67` defines `saved_projects` with `project_id` as the only primary key.
- `site/server/src/actions.ts:1373–1388` `listChecks` selects recent checks without a principal filter; lines 1390–1398 `deleteCheck` deletes by ID without an owner predicate; `askGibran` reads the latest checks at line 1278 without a principal filter. Framework-level auth/tenant enforcement is not proven by these source files; do not infer it exists or does not exist without SDK/provider evidence.
- `site/server/src/actions.ts:1103+` `addProject()` still uses application-level duplicate pre-checks; the source comment explicitly notes this is not a DB unique constraint.

Carry-forward status: F-001/F-002/F-003/F-004 remain OPEN; F-005 authorization boundary NOT VERIFIED; F-018 source-level data isolation remains NOT VERIFIED and is a release blocker if the DB/action context is shared; F-019 Link Scanner disabled state NOT VERIFIED; F-030 clean external build remains a blocker; F-044/F-045/F-046 remain open.

## 5. Free-tier provider facts checked on 8 November 2026

These facts inform provider selection only; they do not prove compatibility with the current Hatch application.

| Option | Officially documented free-tier facts | Project-specific limitation |
|---|---|---|
| Vercel Hobby | Free for personal, non-commercial use; official plan page lists included function/CPU/memory quotas and says usage beyond limits generally waits for reset. Fair-use policy restricts commercial usage. | Current app lacks a verified Vercel entry point and depends on local Hatch SDK. Do not use Hobby if the project activity falls under commercial-use restrictions. |
| Supabase Free | 500 MB database/project, 5 GB uncached + 5 GB cached egress, 500,000 Edge Function invocations; free projects can pause after 7 days of low activity. | Supabase is a database/backend service, not a replacement for the Hatch action runtime. Current schema is SQLite/Drizzle and would need a reviewed migration/adapter to Postgres. |
| Cloudflare Workers Free + D1 | Workers Free: 100,000 requests/day, 10 ms CPU/request, 128 MB memory; D1 Free: 5 million rows read/day, 100,000 rows written/day, 5 GB storage. | Requires a Workers/D1-compatible entry point and database adapter. The 10 ms CPU ceiling must be measured against HTML parsing/scoring; the current Bun/Hatch SDK code is not proven portable. |

Official references:
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- Vercel fair-use/commercial-use rule: https://vercel.com/docs/limits/fair-use-guidelines
- Supabase billing/Free quotas: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase Free project pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 pricing/Free quotas: https://developers.cloudflare.com/d1/platform/pricing/

**Recommendation:** do not select Vercel + Supabase by default. First obtain the Hatch SDK/runtime contract and decide whether the current hosted artifact can be safely exposed for a closed beta, or whether a separate standalone port is required. If a port is required, evaluate Cloudflare Workers + D1 and Vercel + Supabase against a concrete adapter prototype, operational limits, and the project's intended use. Do not start with a database migration until the SQLite/ownership findings and target data model are resolved.

## 6. Evidence and test reconciliation

- Muse v2.3.20's published VM evidence remains as assessed in V14: 105 assertions claimed PASS across F-038/F-039/F-042/F-043, Bun 1.4.4, uid 0/root, VM-only. This auditor did not execute the harness. These results are not staging or production evidence.
- No relevant source/harness change occurred after V14; no valid prior test was rerun.
- `ST-01..ST-12` and `STAGE-P01..P12`: NOT RUN in staging; six operational roles remain unassigned in `STAGING_READINESS_V2320.md`; runtime/provider/egress/DB evidence remains missing.
- `SU-T1..SU-T9`: historical 9×4 claim remains unreconciled as four independent original runs. The v2.3.6 bundle correction and v2.3.9 supplement remain as recorded in V14; no new provenance evidence was found.
- `U-38-A..D` and `U-33-A..F`: no new mapping or evidence found; carry forward as NOT VERIFIED where previously open.
- GitHub combined commit status returned no status entries for Muse v2.3.20 (`b543eca...`) or owner directive update (`8a02d136...`). The available PR-scoped workflow-run query returned no runs for the Muse commit. This does not prove no branch workflows exist; CI inventory remains NOT VERIFIED.
- Branch search returned only `main`; no isolated development branch was present.

## 7. Blocker log

| Blocker | Owner | Attempts / result | Next action |
|---|---|---|---|
| F-044 SQLite STORED generated-column migration | Muse — design/harness; runtime DB owner unassigned | V14 found invalid `ALTER TABLE ADD COLUMN ... STORED`; no later Muse response | Correct migration design; establish exact SQLite version; test actual migration against disposable current-schema copy with failure injection |
| F-045 chain allowlist DB constraint | Muse — design/harness | V14 found claimed CHECK absent from actual SQL; no later response | Add real CHECK/FK DDL and direct SQL INSERT/UPDATE negative tests; inspect resulting schema |
| F-046 legacy NULL ownership | Muse + provider/runtime owner unassigned | V14 found NULL rows treated as public; no later response | Fail-closed multi-user policy; two-principal tests; provider scope evidence or mark runtime BLOCKED |
| F-047 free-tier portability | Muse + Hatch SDK/provider owner unassigned | Inspected manifest/lock/build scripts; SDK is machine-local and build is SDK-coupled | Obtain SDK distribution/runtime contract or produce adapter prototype on isolated branch; clean external build |
| F-048 README deployment truth | Muse/docs owner | Conflicting statements verified in README | Reconcile README with evidence and link to actual live artifact/runtime only if verified |
| Staging roles and provider evidence | Project owner/provider; currently unassigned | `STAGING_READINESS_V2320.md` lists roles 1–6 UNASSIGNED and artifacts 7–11 missing | Identify named owners and provider artifacts; no staging test before prerequisites |
| Isolated product-development branch | Muse | Only `main` branch found | Create dedicated non-production branch; do not push experiments to production/main |

## 8. Stage decision

1. Historical v2.3.6/v2.3.7 evidence reconciliation: **COMPLETE for available historical artifacts only**; no staging inference.
2. Audit of actual code/security gaps: **OPEN**; source remains vulnerable/unremediated for SSRF and data-isolation risks.
3. Staging gap identification: **PARTIALLY COMPLETE**; operational owners/provider evidence are still missing, and F-047 adds a free-tier portability blocker.
4. Controlled staging validation: **NOT STARTED**.
5. Staging/release evaluation: **NOT STARTED**.

**Release decision: NOT READY FOR COMMUNITY BETA.** No public application URL is verified. A read-only concept/demo page is not equivalent to testing the scanner. Link Scanner must remain unavailable to testers until its own security gates pass and the owner separately authorizes exposure.

## 9. Muse Handoff / Required Response

Muse: treat this report and `CLOSED_BETA_FREE_TIER_DIRECTIVE.md` as the next work order. Do not send another status-only response. Work in small, reviewable commits and preserve raw evidence. The owner has instructed that safe product development continue in parallel on an isolated branch; this does not authorize production mutation, deployment, wallet signing, or enabling Link Scanner.

1. **Respond to V14 P0 findings F-044/F-045/F-046.** Provide exact replacement proposal sections and a harness that executes the actual proposed migration artifact against a disposable copy of the current schema. Include target SQLite version, SQL order, FK/index/trigger preservation, row counts, rollback/failure injection, down migration on a separate copy, schema inspection, direct SQL unknown-chain INSERT/UPDATE tests, and two-principal isolation tests. If target runtime/version/provider scope is unavailable, mark that exact acceptance BLOCKED and continue with independent harness/design work. Do not edit production schema or actual app migration files without separate authorization.
2. **Deliver free-tier deployment feasibility, not a guessed provider name.** Inspect the complete repository tree and document actual app entry points, SDK/runtime contract, database adapter, auth boundary, cron/inference dependencies, and deploy assumptions. Provide a compatibility matrix for Vercel Hobby, Supabase Free, and Cloudflare Workers + D1 using official provider docs. Explain Vercel non-commercial restriction, Supabase inactivity pause/quotas, Cloudflare CPU limit, and required code/data adapters. Identify the smallest safe path to a real HTTPS URL. If the current app cannot be ported safely without owner authorization or unavailable SDK material, mark BLOCKED and list exact missing artifacts.
3. **Resolve F-047.** Obtain the Hatch SDK tarball through an authorized, redistributable source or provider statement; do not attempt to extract it from an unauthorized environment. Build from a clean clone with no `/opt/hatch` path. Provide reproducible install/build logs, SDK version/digest, exact entry point, and health-check evidence. A static landing page must be labeled as such and must not return fabricated scanner results.
4. **Resolve F-048.** Reconcile README statements about repository existence, live artifact, source mirror, foundation package, Supabase, and Vercel. Each status must be backed by a URL, artifact digest, provider record, or explicit NOT VERIFIED label.
5. **Continue safe product development in parallel.** Create an isolated development branch from `main` and maintain a visible backlog with priority, owner, branch/commit, test evidence, blocker, and next action. Work only on safe, non-production tasks until authorization boundaries are clear. Do not alter the live artifact, production DB, deployment config, or Link Scanner state.
6. **Prepare the beta package.** Create `CLOSED_BETA_READINESS.md`, `CLOSED_BETA_TEST_PLAN.md`, `DEPLOYMENT_FREE_TIER.md`, `TESTER_QUICKSTART.md`, and `RELEASE_EVIDENCE.md`. Mark unknowns BLOCKED/NOT VERIFIED. Include a 5–10 tester scope only after all security gates pass, no wallet connections/signing/transactions, no sensitive data, separate DB, retention/deletion, incident/rollback, and cost guardrails.
7. **Provide a response matrix and provenance.** For every item above, report status, exact changed paths, commit SHA, commands, raw stdout/stderr, exit code, timestamp, runtime/database versions, UID, SHA-256, and residual risks. Explicitly say whether application source, schema, deployment, or production changed. Do not claim staging from VM evidence or deployment from a build-only result.

### Acceptance criteria for the next Muse revision

- A Muse-authored commit exists after this report and directly addresses each numbered item.
- F-044/F-045/F-046 are either backed by reproducible passing evidence or honestly blocked on named missing facts.
- The external-build portability question is resolved by a clean build and runtime evidence, or explicitly blocked with a minimal owner action.
- The README and beta package agree with actual deployment reality.
- No production/live artifact, production database, deployment configuration, or Link Scanner state was changed.
- Final status remains **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED** until the owner separately authorizes the relevant implementation/deployment.

---

**Audit limitation:** this is a read-only GitHub artifact review. No untrusted code was executed, no live endpoint was probed, no production test was run, and no application source or deployment resource was modified.