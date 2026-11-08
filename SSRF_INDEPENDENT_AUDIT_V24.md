# SSRF Independent Audit V24 — U-118 Allowlist Does Not Enforce a Private Working Directory

**Date:** 9 November 2026 (WIB)  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Main HEAD at review:** `cfa8b394697cdbec7c539bf52a424f850a4a6579`  
**Development HEAD after sync:** `3b3d1268cce41f6cb35e8cb81296d90ab7ae7a3d`  
**Branch relation:** `development` is 55 commits ahead / 0 behind `main`; merge base is current `main`.  
**Decision:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA.

## 1. Scope and method

This review inspected the V23 response, the v2.3.29 source and test artifacts, the project-link snapshot, branch relations, and the development/main synchronization. The review was static and read-only. No application code was executed, no URL was submitted to Link Scanner, no external URL was fetched by the application, and no live or staging database was opened.

Relevant reviewed artifacts:

- `SSRF_RESPONSE_MATRIX_V2329.md` and `STAGING_READINESS_V2329.md` on `main`.
- Development implementation commit `291e25d5ca20190095525830417e3a2757b7596e`.
- Sync merge commit `3b3d1268cce41f6cb35e8cb81296d90ab7ae7a3d`.
- `evidence/v2326/principal-key-migration.ts`.
- `evidence/v2329/test-principal-migration-v2329.ts` and its output log.
- `evidence/v2329/test-f006b-narrative-v2329.ts` and output log.
- `evidence/v2329/test-checklink-killswitch-v2329.txt`.
- `evidence/v2329/u118-bun-sqlite-probe.txt`.
- `evidence/v2329/artifact-status-airdrop-generate-20261109/`.

## 2. Response to Previous Handoff — V23

| V23 request/finding | V24 review result |
| --- | --- |
| F-069 — remove row contents from backup-validation errors | **Addressed for tested paths in development + VM.** The v2329-1 CLI reports table, row index, field, and expected type rather than serializing malformed rows. H-MIGR-34..38 are recorded PASS. This review did not rerun the CLI. |
| F-070 — fsync parent directory before the database transaction | **Addressed for tested syscall order in development + Linux VM.** The source fsyncs the parent directory after link/unlink and before returning to the transaction caller. H-MIGR-39 and the strace artifact support ordering. This is not a power-loss/crash test. |
| U-118 — guard-to-open database path TOCTOU | **OPEN.** The Bun SQLite probe supports the conclusion that the opened inode cannot be compared through the exposed Bun API. The allowlist is a mitigation, not proof that the working directory is private; see new U-120 below. |
| F-006b — incident narrative strings in application source | **Addressed for the checked strings in development + VM.** H-NAR-01..05 reads the actual `actions.ts` and `App.tsx` files; H-KILL-01..05 imports the actual action handler and uses hermetic stubs. These are VM results, not staging evidence. |
| Synchronize development with latest main | **Addressed.** Draft PR #1 was reviewed and merged as `3b3d1268cce41f6cb35e8cb81296d90ab7ae7a3d`. The incoming PR contained only `SSRF_REMEDIATION_DESIGN.md`, `SSRF_RESPONSE_MATRIX_V2329.md`, and `STAGING_READINESS_V2329.md`. Current compare: 55 ahead / 0 behind. No merge from development to main occurred. |
| Project-link provenance and T-01 | **Still partial / blocked.** The artifact snapshot records `share.shared=true` and a URL, but artifact-to-source provenance is absent; `artifact.list_actions` returned HTTP 405; separate publication of `landing/` with provenance is not available through the inspected tooling. T-01 remains BLOCKED. |
| CI and staging | **Still blocked.** No staging roles are assigned in the readiness matrix. The runs endpoint returned zero workflow runs and rulesets returned an empty list in this review; branch-protection read returned 403 and the workflows endpoint was not available through this connector, so those two details are NOT independently verified here. |

The v2.3.29 logs for H-MIGR, H-NAR, and H-KILL have SHA-256 sidecars. The auditor recomputed the log hashes for the three logs below and matched their sidecars:

- H-MIGR-34..41: `b82550f6f0b1099f297bf000466708981e7eaa63274dd30b7eb9f2eb39ca707c`.
- H-NAR-01..05: `5f141d9ee61bc39546b95624696183146df478cbd599b4c7744901cb7c89b057`.
- H-KILL-01..05: `90cf620bdbe236b4eb9a5c4920914e7f78e1925379af829658ee221bb35b02af`.

Hash agreement establishes log integrity against the sidecars, not independent reproduction of the tests.

## 3. New finding U-120 — allowlist does not enforce private-directory conditions

**Severity:** Medium  
**Classification:** Confirmed design gap; plausible TOCTOU exploitation scenario  
**Confidence:** High that the enforcement gap exists; medium that it is exploitable in a given deployment because a concurrent writer is a prerequisite.

**Affected source:**

- `evidence/v2326/principal-key-migration.ts:329-345`, `guardDbPath()`.
- `evidence/v2326/principal-key-migration.ts:1076-1083`, `main()`.
- `evidence/v2329/test-principal-migration-v2329.ts:444-470`, H-MIGR-40/41.

**Evidence:**

1. When `PRINCIPAL_MIGRATION_ALLOWED_DIR` is set, `guardDbPath()` resolves each configured string and checks only whether the resolved database path is equal to or a child of that path.
2. It does not check the allowlisted directory's owner, mode, group/world write permissions, sticky-bit semantics, or the security of writable ancestors.
3. When the variable is unset, `main()` prints a U-118 warning but continues. H-MIGR-41 explicitly asserts that the command exits 0 without an allowlist.
4. H-MIGR-40 tests only path containment (outside refused, inside accepted). It does not test that an accepted directory is private or protected against another writer.

**Scenario and impact:**

An operator can configure a shared or group-writable directory as the allowlist, or omit the variable entirely. If another local process can modify that directory, it may replace the database path after `guardDbPath()` completes but before `new Database(dbPath)` opens it. The pre-open symlink, hard-link, realpath, and runtime-path checks then apply to the old path state, not necessarily the file SQLite opens. In a worst-case race, a mutating mode could operate on a different database than the one that passed the guard.

**Prerequisites and limitations:**

- A concurrent process must have permission to alter the relevant directory entry.
- This review did not reproduce the race.
- No staging or production exploitation is claimed.
- U-118 remains OPEN; U-120 does not convert the residual into a confirmed production vulnerability.

**Required mitigation:**

1. Fail closed when `PRINCIPAL_MIGRATION_ALLOWED_DIR` is unset. At minimum, all modes that write, export, rename, or roll back must refuse to run without it; the safer default is to require it for every mode because even `inventory` reads sensitive principal data.
2. Validate the allowlisted directory itself and its writable ancestors. Resolve the directory to its real path, verify ownership, and reject group/world-writable directories unless a narrowly documented and tested trusted-group policy applies. Do not treat path containment alone as proof of privacy.
3. Keep the operator workflow on a fresh copy in a private per-run directory, verify the copy and `nlink == 1`, and prohibit concurrent untrusted writers. This is defense in depth, not a replacement for the directory checks.
4. If the runtime API cannot bind the guard to the opened inode, document the remaining OS-level limitation and keep U-118 OPEN rather than claiming it is closed.

**Required regression tests:**

- Unset allowlist: mutating modes refuse before opening the database.
- A shared/group-writable allowlist is rejected.
- A private owner-controlled directory is accepted.
- Writable-ancestor and symlinked-directory cases are covered.
- A disposable path-swap race test demonstrates that a replacement database cannot be opened after the guard, or explicitly records the remaining limitation if the runtime cannot prevent it.
- Every test uses disposable databases only; no live or production path is used.

## 4. Project-link classification

The v2.3.29 snapshot records a shared Muse artifact at:

`https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`

The stored `browser-open.txt` says the platform browser fetched minimal text headed “Airdrop Generate” and “Content is user generated and unverified”; it does not expose an HTTP status. In this audit session, an independent web open returned an internal access error, so current external reachability is not independently reconfirmed here.

The artifact is **informational only**, not an owner-only trial and not a scanner application. Its source commit/build provenance is not exposed; the `landing/README.md` on `project-landing` still says NOT DEPLOYED / NO PUBLIC URL VERIFIED. The artifact title also differs from the static landing source title. No scanner invocation or wallet operation was performed.

## 5. Current branch and release state

| Branch | Relation to current main |
| --- | --- |
| `main` | base |
| `development` | 55 ahead / 0 behind |
| `discussion-link-jadi` | 2 ahead / 25 behind |
| `beta-readiness` | 2 ahead / 29 behind |
| `project-landing` | 2 ahead / 21 behind |

There is no `dev` branch; `development` is the active isolated implementation branch.

| Deliverable | Status |
| --- | --- |
| Informational project link | PARTIALLY VERIFIED through platform artifact evidence; source provenance and independent current reachability remain NOT VERIFIED |
| Separate static publication of `landing/` | BLOCKED / NOT VERIFIED |
| Owner-only trial | BLOCKED |
| Community beta | BLOCKED |
| Staging | BLOCKED; roles unassigned |
| Link Scanner | Must remain disabled; all invocation paths are not independently verified in staging |
| Release approval | NOT GRANTED |

## 6. Muse Handoff / Required Response

1. **U-120 — enforce the private-directory precondition.** Implement fail-closed behavior for an unset allowlist and validate ownership/permissions of the allowlisted directory and relevant ancestors. Keep the implementation on `development` only.
2. Add the regression tests listed in §3. Include exact commands, exit codes, runtime versions, raw stdout/stderr, and SHA-256 sidecars.
3. Reassess U-118 after the changes. Do not mark it closed solely because an environment variable is present; prove the directory cannot be modified by an untrusted concurrent writer or document the remaining residual.
4. Update the v2.3.30 response matrix and backlog with U-120, owner, status, evidence, and next action.
5. Keep F-069/F-070 claims scoped to the tested VM scenarios. Do not claim a real power-loss test.
6. Do not modify `main` application source, production DB/catalog, live artifact, deployment configuration, or scanner state. Do not deploy, fetch external URLs through the scanner, or perform wallet signing/transactions.
7. Continue implementation-first work on `development` where safe; staging, owner-only trial, community beta, and release gates remain closed.

**Final decision:** V23's F-069/F-070 and F-006b work is a measurable development-branch improvement, but all evidence remains VM-level. U-118 remains OPEN, with U-120 added. **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA.**
