# MUSE IMPLEMENTATION-FIRST DIRECTIVE — DEVELOPMENT BRANCH

Owner instruction (2026-11-08): Stop treating beta deployment preparation as the next primary task. IMPLEMENT THE PRODUCT FIRST. Closed Beta is downstream of working, reviewed implementation. Product development must not pause.

Repository: nusasaputrarama-max/Airdrop-Generate
Base: main

## 1. Immediate priority

Create/use a dedicated non-production branch named `development` (or a clearly named feature branch from current main). Do not commit application changes directly to main. Work in small, reviewable commits.

Implement the outstanding security and correctness work in actual application code, not just proposals, pseudodiffs, or harness-only simulations.

## 2. Required implementation order

1. F-044/F-045/F-046: implement the reviewed SQLite migration and schema constraints in the actual migration/schema files; enforce fail-closed legacy ownership in every affected action. Before coding, reconcile Muse v2.3.21 evidence and the exact target SQLite runtime. Add migration/up/down tests and two-principal authorization tests.
2. F-001: implement SSRF defenses in the real URL-fetch path: strict IP-range rejection for IPv4/IPv6, DNS resolution validation, redirect-hop revalidation, DNS rebinding/TOCTOU-aware connection strategy, and validation for script/resource fetches.
3. F-002/F-003/F-022/F-025/F-026/F-027: enforce streamed byte limits before buffering, consistent byte accounting, aggregate scan budget, total deadline, cancellation, and concurrency/resource limits. Do not claim memory bounded merely because application code slices after `res.text()`.
4. F-004/F-005/F-018 and related authorization: enforce database uniqueness transactionally, validate official URLs consistently, and prove owner-scoped reads/writes/deletes across all actions. Verify the actual auth boundary rather than assuming framework protection.
5. F-016/F-017 and other confirmed regressions: fix cache correctness/isolation only where code review confirms the issue and add regression tests.
6. Add/update the actual build/test scripts, dependency manifest/lockfile, and CI needed to reproduce builds outside the Hatch-only SDK environment. Do not remove or replace the existing runtime integration without a tested compatibility plan.

## 3. Evidence required per implementation commit

- Exact changed file list and unified diff.
- Finding IDs addressed and mapping from finding to code path.
- Tests added/changed, exact commands, runtime and SQLite versions, exit codes, raw stdout/stderr, and SHA-256 of evidence files.
- Positive, negative, boundary, concurrency, and failure/rollback tests as applicable.
- Explicit distinction between local/VM evidence and staging evidence.
- Remaining risks and findings not addressed.
- No secrets in code, logs, commits, or reports.

## 4. Hard boundaries

- This is authorization to implement in an isolated development branch only. It is NOT authorization to alter main, production database/catalog, production build/deployment/configuration, existing live artifact, or enable Link Scanner.
- Do not deploy while security gates remain open. Do not expose wallet connection, signing, transaction, or unsafe external-fetch functionality.
- Do not run destructive tests on production or execute untrusted code.
- Keep existing product development moving. If one finding is blocked, work on another safe implementation task and record the blocker.
- Keep the closed-beta workstream limited to a plan/compatibility check until actual application code is ready. Do not spend cycles polishing deployment docs while implementation defects remain.

## 5. Immediate response requested

Within the next Muse commit, provide:
1. The development branch name and base SHA.
2. A ranked implementation plan with concrete files/functions and acceptance criteria.
3. The first actual application-code change addressing one bounded finding, with regression tests and evidence, if the repository/runtime facts are sufficient.
4. If implementation is blocked, state the exact missing fact and continue with other unblocked code tasks.
5. A response matrix for this directive.

## Definition of done for this phase

Actual application source/schema/migrations contain the fixes, tests exercise those exact files, and independent review can verify the diff. Documentation-only proposals and VM harness evidence do not count as application implementation.

Status remains DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED for production/release. Development-branch implementation is authorized; production release is not.