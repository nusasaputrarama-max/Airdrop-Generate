# CLOSED BETA READINESS + FREE PUBLIC DEMO DIRECTIVE — ACTION REQUIRED

Date: 2026-11-08
Repository: nusasaputrarama-max/Airdrop-Generate
Branch: main
Owner decision: prepare a community-facing closed beta, with a usable public URL, using free tiers only at first.

## Objective

Prepare the project for a small, controlled community trial and deliver a real HTTPS URL that testers can open. Do not confuse a documentation preview, GitHub repository URL, local development URL, or mockup with a working deployed application.

The desired outcome is a working public demo / closed-beta endpoint, not another status-only report. Start with 5–10 invited testers after all release gates below pass. Do not open unrestricted public access.

## Non-negotiable constraints

1. Free tier only for the initial trial. Do not purchase a domain, subscription, paid API, or hosting plan. Prefer a free provider subdomain.
2. Do not ask the owner to paste secrets into chat, commits, issues, or source files. Use provider secret/environment-variable settings. Never expose service-role keys, PATs, wallet secrets, or other credentials.
3. Do not deploy the current app or enable Link Scanner until the security and staging gates pass.
4. Do not claim a deployment exists until you provide the actual reachable HTTPS URL and evidence of a successful deployment/build/health check.
5. Do not silently migrate or replace the existing live artifact, production database, schema, runtime, or deployment. Treat the new beta as an isolated environment with separate data.
6. No production data, real wallet connections, signing, transactions, or sensitive personal data in beta. Never request seed phrases/private keys.
7. Keep the status honest: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED until the owner explicitly approves implementation. This directive requests preparation, evidence, and a deployment plan; it is not permission to alter production or enable risky features.
8. If a required owner action is unavoidable (provider account authorization, environment variable entry, OAuth connection), identify the exact action and why. Do not pretend you can complete it yourself.

## Required work — in order

### A. Inspect reality before proposing a stack
- Inspect the actual current repository tree, app entry points, package manifests, runtime requirements, build scripts, DB adapter, server actions, environment variables, cron/jobs, and deployment assumptions.
- Reconcile contradictory/stale README statements with the actual repository. Do not infer that the old artifact runtime is exportable or that a README describes the current app.
- Identify whether the current code can run on a free hosting provider without changing architecture.
- Provide a concise compatibility matrix for at least two viable free-tier options, with current limits/risks checked from official provider documentation. No paid-only service.

### B. Security and correctness release gates
Must be resolved and evidenced before any community tester receives access:
- SSRF protections: reject loopback/private/link-local/reserved IPv4 and IPv6 destinations; validate DNS resolution and every redirect hop; prevent DNS rebinding/TOCTOU where applicable; validate script resource fetches; cap bytes while streaming; enforce total deadline and concurrency limits.
- Tenant isolation: enforce principal ownership on every read/update/delete/action; default-deny legacy rows with NULL owner; prove with two-principal tests.
- Database: resolve V14 F-044 SQLite migration flaw, F-045 actual chain allowlist DB constraint, F-046 legacy NULL owner exposure. Test actual SQL against target DB engine/version, including rollback/failure injection.
- Auth/session/authorization: verify framework boundary and every server action; no assumption that SDK implicitly protects endpoints without evidence.
- Secrets: scan repository history/current tree safely; no secrets in client bundle or logs. If a credential is found, report its path safely and recommend rotation without reproducing it.
- Resource abuse: request/body/response limits, timeout, rate limiting, concurrency, cache behavior, and safe error handling.
- Tests: unit/integration/negative/regression tests with raw logs, commands, exit codes, runtime/database versions, and reproducible instructions.
- Link Scanner remains disabled until specifically cleared after security validation.

### C. Closed-beta readiness package
Create/update these documents with repo-specific, actionable content:
- CLOSED_BETA_READINESS.md: release gates, owner, evidence, pass/fail/blocker, tester scope, rollback/kill switch.
- CLOSED_BETA_TEST_PLAN.md: 5–10 tester protocol, scenarios, expected outcomes, prohibited inputs/actions, data retention/deletion, bug severity definitions.
- DEPLOYMENT_FREE_TIER.md: exact provider recommendation, free-tier caveats, build/deploy steps, environment variable names (never values), health-check URL/path, isolated database, rollback procedure, and cost guardrails.
- TESTER_QUICKSTART.md: short Indonesian instructions, known limitations, responsible-use warnings, bug-report format, support channel placeholder only if owner must supply it.
- RELEASE_EVIDENCE.md: commit SHA, build logs, test logs, deploy ID, provider, URL, health-check result, timestamp, environment identity, and outstanding risks. Mark unknowns NOT VERIFIED.

Do not fabricate owners, provider accounts, keys, test results, URLs, or evidence. Use explicit BLOCKED / OWNER ACTION REQUIRED where appropriate.

### D. Free deployment recommendation
- Prefer a free provider subdomain and an isolated beta environment.
- Evaluate Vercel Hobby + Supabase Free only if the actual application is compatible and provider terms allow the intended use. Check official limits and note sleeping/pausing, storage, bandwidth, function duration, build, and database constraints.
- If the actual app needs persistent local SQLite or a long-running server incompatible with free serverless hosting, do not force a fragile deployment. Recommend a technically sound free alternative or mark deployment BLOCKED and explain the smallest necessary adaptation.
- Never use a free host with ephemeral filesystem as if it were durable storage.
- No custom domain purchase. No paid API dependency. If AI features require a paid API, disable them in beta or use a clearly disclosed non-AI fallback; never fake AI results.

### E. Delivery and response
- Commit the readiness package and any safe, non-production preparation changes on a dedicated branch or docs-only commit. Do not modify production app code until separately authorized.
- Respond with a concise decision: READY / NOT READY / BLOCKED.
- Include direct GitHub links to each document and commit.
- If actually deployed, include the exact public HTTPS URL and proof it responds. If not deployed, say so plainly and list only the precise owner actions or blockers preventing it.
- Include a response matrix to this directive, changed-file list, evidence links, test results, unresolved blockers, and explicit statement whether any application code or production resource changed.
- Do not respond with generic status, a speculative URL, or another proposal that merely restates previous documents.

## Definition of done

The owner can click a real public HTTPS beta URL and use the intended safe subset of the product without paying, OR receives a precise, evidence-backed BLOCKED report that identifies the minimum remaining work and owner actions. Security gates must pass before testers are invited.

Final status remains DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED unless the owner separately grants implementation approval.