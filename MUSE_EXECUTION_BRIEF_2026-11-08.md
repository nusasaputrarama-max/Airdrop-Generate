# Muse Execution Brief — 8 November 2026

**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Branch:** `main`  
**Audience:** Muse  
**Issued by:** ChatGPT independent audit  
**Baseline:** `SSRF_INDEPENDENT_AUDIT_V11.md` (audit commit `c69af0686f49939cc00e147d4909aa11e0fa7881`)  
**Muse baseline:** v2.3.17 (commit `77d5dcdcc6c9f870a8c86e43389ea83aaa47b642`)

## Purpose

Stop spending the next cycle on another broad status-only audit. Deliver the smallest verifiable engineering outputs against the open blockers. This brief is a repository handoff; the project owner does not need to relay it.

This is **not** authorization to modify application source, database/schema/catalog, package manifests or lockfiles, deployment configuration, production/staging runtime, or any live artifact. The project decision remains **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**. Do not invoke `checkLink`, enable Link Scanner, deploy, publish a public tester, or run production/destructive tests.

## Required work — execute in this order

### 1. Close the harness defects F-034, F-035, and U-72

These are the narrowest actionable items and should not be buried under another memory benchmark.

**F-034 — PID liveness oracle**
- Change the oracle so only `error.code === "ESRCH"` means the PID is absent.
- A live PID, `EPERM`, `EINVAL`, malformed input, or any other exception must fail closed.
- Validate PIDs as positive safe integers; reject empty, malformed, duplicate, and unexpected PID sets before checking liveness.
- Add explicit negative tests for EPERM, EINVAL, malformed/duplicate PID values, and a still-live process.
- Acceptance: none of those negative cases can produce PASS; raw output records the error class and exits non-zero.

**F-035 — PID file isolation**
- Replace the predictable shared `/tmp/f032-hang-child.pid` path with a unique private per-run directory (0700) and exclusively created PID file (0600), using no-follow semantics where supported.
- Ensure parallel invocations cannot share, unlink, or mix PID files. Clean up in a finally path after child handling.
- Add tests for a pre-created symlink, two concurrent invocations, isolation of PID records, and cleanup.
- Acceptance: symlink target remains untouched; each invocation observes only its own child PIDs; both parallel runs produce deterministic, independently verifiable results.

**U-72 — child-script override**
- Reject `F029_CHILD_SCRIPT` unless an explicit test-only mode is enabled.
- Resolve and validate the real path against a narrow allowlist of repository-owned test fixtures; reject arbitrary paths and symlinks escaping the allowed fixture directory.
- Add negative tests proving arbitrary external paths are rejected and normal benchmark mode cannot silently accept the override.
- Acceptance: no environment value can cause the harness to execute an arbitrary script outside the approved test fixture set.

For all three: publish exact changed paths, concise rationale, test IDs, full raw logs, commands, runtime versions, exit codes, and commit SHA. Do not claim closure based on edited documentation alone. Keep these changes limited to test harness/evidence files; do not touch application source or deployment artifacts.

### 2. Produce an implementation-ready remediation proposal for F-001 through F-005

The application source has not changed since the audited baseline. Do not spend another cycle restating that fact. Prepare a separate proposal, but do not implement it yet.

For each finding, include:
- exact current file/function/line references verified against current `main`;
- proposed file list and minimal diff or pseudodiff;
- threat model and concrete attack path being blocked;
- redirect-by-redirect and DNS/IP destination validation strategy, including IPv4, IPv6, mapped IPv6, loopback, private, link-local, and cloud metadata ranges;
- connection-time DNS rebinding considerations (validation must bind to the actual destination used by the connection, not only a prior lookup);
- bounded streaming response reads, decompression considerations, and a hard aggregate byte budget;
- one end-to-end deadline covering redirects, scripts, and RDAP work, with cancellation behavior;
- database uniqueness/atomicity strategy for duplicate project insertion;
- authentication/authorization and tenant-scoping evidence required to establish the action boundary;
- regression test matrix, negative cases, expected results, and safe test environment;
- migration/rollback implications, operational dependencies, and residual risks.

**Acceptance:** a reviewer can assess the proposed changes without guessing missing files, behaviors, tests, or rollout steps. Explicitly distinguish verified facts from assumptions. Do not report any F-001..F-005 finding as fixed or closed.

### 3. Make staging readiness a decision, not an endless checklist

Provide a one-page staging readiness table with each required role/control, current owner, evidence needed, and blocker. Required roles include staging operator, runtime provider, egress owner, DB/runtime owner, alert recipient, and rollback owner.

If names or access are not available, write **UNASSIGNED / BLOCKED**. Do not invent owners or imply staging exists. Specify the minimum read-only evidence needed to verify artifact identity and that Link Scanner remains disabled across every invocation path. Do not invoke the action to test it.

**Acceptance:** the project owner can see exactly which external assignments or evidence are missing before staging validation can start.

## Response format for the next Muse commit

Add a response matrix with one row each for F-034, F-035, U-72, F-001, F-002, F-003, F-004, F-005, F-019, F-028, and staging ownership. Each row must state:
- status: ADDRESSED / PARTIALLY ADDRESSED / BLOCKED / NOT STARTED;
- exact paths and line/function references;
- commit SHA and test/log IDs where applicable;
- acceptance criteria passed and not passed;
- remaining risk and next action.

Include a short **What materially changed** section. Do not publish another broad benchmark-only revision. Do not rerun valid F-029 experiments unless a material harness/runtime change makes that necessary. Preserve VM/staging/production separation.

## Stop conditions

- No application source, database, package/lockfile, deployment, or runtime changes without separate explicit owner approval.
- No staging or production tests without a defined authorized environment and operator.
- No invocation or re-enabling of Link Scanner.
- If a required dependency is unavailable, record the blocker and continue with independent work that can be completed safely.

**Required next outcome:** a verified harness-fix commit, an implementation-ready (not implemented) F-001..F-005 remediation proposal, and a concise staging ownership/gap decision. The goal is evidence-backed movement, not another version number.
