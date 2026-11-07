# Independent Audit V2 — Evidence Traceability and Source-Mirror Follow-up

**Date:** 2026-11-07  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Branch:** `main`  
**Reviewed main HEAD before this report:** `52724d61539876b35ca9250cf6924ddf51e6dbd0`  
**Latest Muse source commit:** `c68c7276e0b11f72b2517017469454a53957b67c`  
**Previous independent code audit:** `SSRF_CODE_SECURITY_AUDIT_V1.md` at `52724d61539876b35ca9250cf6924ddf51e6dbd0`  
**Review type:** Read-only static review and evidence-provenance reconciliation. No application code was changed or executed. No staging or production system was accessed.

## 1. Executive decision

**DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED. KEEP LINK SCANNER INACTIVE.**

No Muse commit after the previous independent code audit was found. Comparing the source-mirror commit `c68c727` to current `main` shows exactly one later commit, the previous ChatGPT audit report; no source, configuration, dependency, migration, test, or build changes were made after that mirror. The existing code findings F-001..F-006 therefore remain open.

This follow-up identifies three additional evidence/reproducibility issues:

- **F-007 — Medium, evidence traceability gap:** v2.3.6 test logs cited as repository evidence are not present in the current Git tree; the root `.gitignore` excludes all `*.log` files. This does not prove the tests were not run. It means the claimed repeated results cannot be independently checked from the repository artifacts.
- **F-008 — Medium, confirmed documentation inconsistency:** the v2.3.7 reconciliation gives an inaccurate explanation for the SU-T5 harness failure. The v2.3.6 spike report says the copied harness lacked `lock-racer.cjs`; the committed SU-T5 runner explicitly closes its file descriptor, and the startup lock implementation uses exclusive file creation (`openSync(..., 'wx')`), not `flock()`.
- **F-009 — Medium, build/dependency reproducibility gap:** the source mirror has no committed lockfile, no site test suite, no CI workflow, and references an SDK tarball through an absolute local filesystem path. A reviewer outside the builder environment cannot reproduce the exact dependency graph or build from the public mirror.

These are not evidence that Muse's VM experiments were fabricated or that the app is exploitable. They are gaps in the evidence currently available for independent verification.

## 2. Changes since the previous audit

The repository history was checked directly:

- Muse v2.3.7 reconciliation commit: `4a8a8aad398db41a1369e300a9261340bf03e4d2`.
- Handoff protocol commit: `73876cfe78edbd858d4df1780d1396e17d4319ff`.
- Muse source mirror commit: `c68c7276e0b11f72b2517017469454a53957b67c`.
- Previous independent audit commit: `52724d61539876b35ca9250cf6924ddf51e6dbd0`.

The compare operation from `c68c727` to `main` reports one later commit and one added file: `SSRF_CODE_SECURITY_AUDIT_V1.md`. No Muse response commit or code remediation is present after V1.

Files rechecked for this follow-up:

- `SSRF_RECONCILIATION_V237.md`
- `SSRF_REMEDIATION_DESIGN.md`
- `SSRF_SPIKE_V236.md`
- `spike-harness-v236/README.md`
- `spike-harness-v236/su-v232/run-tests.cjs`
- `spike-harness-v236/su-v232/lock-racer.cjs`
- `spike-harness-v236/su-v232/startup.cjs`
- `.gitignore`
- `site/package.json`
- `site/server/src/actions.ts`
- `site/server/src/schema.ts`
- `site/DATA-PLAN.md`
- `site/README.md`
- `site/drizzle/meta/_journal.json`

The mirror still contains the same 1,799-line client and 1,355-line server action source introduced by `c68c727`. No application-code diff exists after that commit.

## 3. Response to Previous Handoff

The previous handoff was committed in `SSRF_CODE_SECURITY_AUDIT_V1.md`. It requested evidence and/or remediation for F-001..F-006.

| Previous item | Current repository evidence | Status |
|---|---|---|
| F-001 SSRF destination policy | No later source commit. `normalizeUrl()`, `fetchText()`, redirect handling, and script fetching remain unchanged in `site/server/src/actions.ts`. | **OPEN — NOT ADDRESSED** |
| F-002 streamed response byte cap | No later source commit; `await res.text()` still occurs before `.slice(0, cap)`. | **OPEN — NOT ADDRESSED** |
| F-003 total request deadline and cancellation budget | No later source commit; per-fetch timeout remains, no shared per-check deadline is evidenced. | **OPEN — NOT ADDRESSED** |
| F-004 catalog duplicate atomicity | No later schema or action change; duplicate checks remain application-level read-then-insert, with no unique constraint in the reviewed projects table. | **OPEN — NOT ADDRESSED** |
| F-005 `addProject` authorization and source provenance | No new authorization evidence or response matrix. The mirror alone does not establish the SDK/runtime trust boundary. | **OPEN — NOT VERIFIED** |
| F-006 public mirror privacy cleanup | `site/DATA-PLAN.md` still contains incident-specific personal narrative and a partially masked wallet identifier. | **OPEN — NOT ADDRESSED** |

The v2.3.7 reconciliation commit predates V1. It addresses an earlier design-review evidence-mapping issue and must not be treated as Muse's response to F-001..F-006. The latest repository history contains no subsequent Muse response matrix. Muse has not been shown to have read or acted on V1.

## 4. New findings

### F-007 — Medium: cited VM test logs are absent from the repository

**Classification:** Evidence traceability gap; underlying test execution is **NOT VERIFIED**, not disproven.  
**Locations:**
- `.gitignore`, line 8: `*.log`.
- `SSRF_SPIKE_V236.md`, §0.1 and its test sections.
- `SSRF_RECONCILIATION_V237.md`, §2 and §5.
- `spike-harness-v236/` repository tree.

**Evidence**

1. `SSRF_SPIKE_V236.md` says the SU suite passed 9/9 × 4 and cites `su-run1.log` through `su-run4.log`. Other sections cite `pidfd-run*.log`, `pidfd-bun-run*.log`, `ops-run*.log`, and `opsrec-run*.log`.
2. `SSRF_RECONCILIATION_V237.md` uses those log paths to mark SU-T1..SU-T9 as VM-proven and reports nine complete suite executions across v2.3.2, v2.3.3, and v2.3.6.
3. The current recursive Git tree contains the v2.3.6 harness source and README, but **no** `*.log` files under `spike-harness-v236/`. The root ignore rule excludes `*.log`, which explains why files with those names are not tracked.
4. The v2.3.6 report embeds selected output excerpts, including PIDFD and OPS results and one SU result set. It does not provide the complete four-run SU log set or every cited raw log as a repository artifact.
5. The harness source is present, including `run-tests.cjs`; its presence proves that a test can be attempted, not that a particular run completed with the reported result.

**Impact**

A reviewer can inspect the test procedures and selected embedded output, but cannot independently verify every cited run, complete stdout/stderr, exit code, or environment metadata. The statement “9/9 × 4” remains a Muse-documented VM claim rather than a fully reproducible repository evidence package.

**Confidence:** High that the cited raw log files are absent from the current Git tree; no conclusion is made about whether they exist in Muse's local environment.

**Required remediation**

- Publish redacted raw outputs in a tracked evidence directory using a format/path not silently excluded by the global `*.log` ignore rule, or provide immutable artifact references with hashes and retention metadata.
- Include a manifest for every run: test ID, run number, UTC timestamp, harness commit, host/VM identifier, kernel, architecture, runtime version, command, exit status, and SHA-256 of the raw output.
- Retain failed attempts as well as successful reruns. Do not overwrite the original SU-T5 failure evidence.
- If any output cannot safely be public, provide a redacted public record plus a separately retained restricted original and its digest.

**Acceptance criteria**

A reviewer can retrieve each claimed run, verify its hash, map the output to the exact harness commit and environment, and distinguish failed initial attempts from clean reruns. Until then, SU-T1..SU-T9 may be described as **reported PASS in VM documentation**, but their complete repeated-run evidence is **NOT VERIFIED from the repository**. Staging remains a separate gate.

### F-008 — Medium: v2.3.7 gives an inaccurate SU-T5 harness-failure explanation

**Classification:** Confirmed documentation inconsistency; not a newly confirmed runtime vulnerability.  
**Locations:**
- `SSRF_RECONCILIATION_V237.md`, §2, SU-T5 correction paragraph.
- `SSRF_SPIKE_V236.md`, lines 25–40, §0.1.
- `spike-harness-v236/su-v232/lock-racer.cjs`, lines 1–14.
- `spike-harness-v236/su-v232/startup.cjs`, `acquireStartupLock()`.

**Evidence**

- The v2.3.6 spike report identifies the initial failure as an incomplete copied harness: `lock-racer.cjs` was absent, so spawned children exited with module-not-found and produced no stdout. It says the file was copied from v2.3.2, after which the suite passed.
- The v2.3.7 reconciliation instead says the racer used an fd lock and called `process.exit()` without `flock.unlock()`, and that kernel fd closure was not recorded by the harness.
- The committed `lock-racer.cjs` explicitly calls `fs.closeSync(r.fd)` before `process.exit(0)`. Its blob SHA is identical to the original `spike-harness-v232/lock-racer.cjs`.
- The referenced `acquireStartupLock()` implementation in `startup.cjs` uses `fs.openSync(lockPath, 'wx')` and an exclusive-create/stale-reclaim flow. It does not call `flock()`. Therefore the reconciliation's specific `flock.unlock()` explanation does not describe this SU-T5 harness path.

**Impact**

The v2.3.6 document's missing-file diagnosis is consistent with the committed harness layout. The v2.3.7 explanation introduces a different and unsupported cause. This weakens the audit trail for why the first three SU-T5 attempts failed and what exactly changed before the four reported clean runs.

**Confidence:** High; based on the committed source and the two documents.

**Required remediation**

Correct the v2.3.7 reconciliation and the corresponding design summary to state the cause supported by the evidence: the copied v2.3.6 harness initially omitted `lock-racer.cjs`; the missing child module caused `no-output`; copying the v2.3.2 helper resolved that setup failure. If Muse asserts a separate fd-release defect, provide the exact earlier helper revision and a reproducer. Do not describe this SU-T5 path as a `flock()` test unless the code actually uses flock.

**Acceptance criteria**

The report, design, helper source, and retained initial-failure/clean-rerun logs agree on one causal explanation. The original failed attempt and the post-fix runs remain separately traceable.

### F-009 — Medium: source mirror cannot independently reproduce its dependency graph or build

**Classification:** Build and supply-chain provenance gap; **NOT PROVIDED / NOT VERIFIED**, not proof of a malicious dependency.  
**Locations:**
- `site/package.json`, lines 1–29.
- Repository tree: no `bun.lock`, `bun.lockb`, npm/pnpm/yarn lockfile, site test/spec files, or `.github/workflows/`.
- GitHub combined status checks queried for `c68c727` and `52724d6`: no status entries returned.

**Evidence**

- `site/package.json` declares `packageManager: bun@1.3.10`.
- `@hatch/space-sdk` is declared as `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`, an absolute path tied to the builder environment.
- No dependency lockfile is committed.
- Scripts expose `typecheck` and build commands, but no `test` script is defined for the site source.
- No site test/spec files or GitHub Actions workflow files are present in the recursive tree.
- The v2.3.6 VM spike report records Bun 1.4.4. That is a different version from the site package's declared Bun 1.3.10; this is not necessarily wrong, but the exact runtime used to build the mirrored artifact has not been attested.

**Impact**

An independent reviewer cannot reconstruct the exact resolved dependency graph or verify the SDK package's provenance from the public repository alone. No committed CI evidence demonstrates that the source mirror typechecks, builds, or passes application-level security tests. The local SDK path may be valid inside the artifact builder, but it is not independently resolvable from the mirror.

**Confidence:** High for the missing repository artifacts and declared local path; runtime/build behavior remains untested.

**Required remediation**

Provide a reproducibility manifest containing the exact Bun version, dependency resolution/lock data, SDK package version and SHA-256, build command, build environment identifier, and build result. If the SDK cannot be published, provide a verifiable package provenance/attestation and explain the controlled resolution path. Add a safe test harness and CI evidence for application code, especially SSRF destination policy, redirect/script handling, response limits, deadlines, action authorization, and catalog concurrency.

**Acceptance criteria**

A reviewer can establish exactly which dependency artifacts and runtime produced the reviewed source/build, verify their hashes and provenance, and retrieve typecheck/build/test results tied to a commit SHA. No untrusted code is executed by this audit.

## 5. Reconciliation of design and evidence gates

### ST-01..ST-12 and STAGE-P01..P12

The v2.3.7 mapping to canonical ST-01..ST-16 is structurally understandable and retains the historical STAGE-P aliases. The report correctly states that no staging gate is proven. The independent status is:

| Gate group | Muse v2.3.7 claim | Independent status in this review |
|---|---|---|
| ST-01 runtime artifact | BELUM | **NOT VERIFIED — staging evidence absent** |
| ST-02 bun:ffi | SEBAGIAN | VM harness evidence documented; production-equivalent sandbox **NOT VERIFIED** |
| ST-03 pidfd | SEBAGIAN | VM experiments documented; raw evidence incomplete; staging **NOT VERIFIED** |
| ST-04/ST-05 filesystem and flock | SEBAGIAN | tmpfs/overlay VM claims documented; production filesystem and staging **NOT VERIFIED** |
| ST-06 /proc and namespace | SEBAGIAN | VM evidence documented; artifact namespace **NOT VERIFIED** |
| ST-07 supervisor/process groups | BELUM | **NOT VERIFIED — staging evidence absent** |
| ST-08 SU-T1..SU-T9 | TERBUKTI (VM) | **Reported PASS in VM documentation; complete run logs NOT PROVIDED in repository; staging NOT VERIFIED** |
| ST-09 NFS | BELUM, conditional | **NOT VERIFIED — first identify production filesystem** |
| ST-10 operational dry-runs | SEBAGIAN | VM mechanism evidence documented; production-equivalent tooling and operator identity **NOT VERIFIED** |
| ST-11 recovery drill | SEBAGIAN | VM OPS-T7 claim documented; staging/supervisor drill **NOT VERIFIED** |
| ST-12 observability | BELUM | **NOT VERIFIED — alert-to-operator evidence absent** |
| ST-13..ST-16 | Added staging prerequisites | **NOT VERIFIED — pid_max, DNS/pinning, PostgreSQL lease, NAT64/NSP staging evidence absent** |

No tests were rerun in this audit. The current status is not a failure of the v2.3.6 VM experiments; it is a limit on what the committed artifacts allow an independent reviewer to confirm.

### U-38-A..D and U-33-A..F

- **U-38-A:** pidfd is a sound response to post-acquisition PID reuse in the documented VM experiment. Treat as VM design evidence only; raw logs are incomplete and the production sandbox gate remains open.
- **U-38-B:** partial in the design record; expected-identity provenance and namespace mapping remain open.
- **U-38-C:** open until pidfd/FFI availability is proven in the exact staging sandbox.
- **U-38-D:** partial; the reference harness does not substitute for review of the eventual production implementation and its ABI/error paths.
- **U-33-A/U-33-B/U-33-E:** partial; the VM controls and recovery claims do not establish production operator, root, deployment, or cleanup boundaries.
- **U-33-C:** open because advisory flock cannot force non-participants to cooperate.
- **U-33-D:** open until the actual production filesystem and conditional NFS behavior are established.
- **U-33-F:** open until the real supervisor and process-group lifecycle are identified and tested.

The v2.3.7 document also correctly leaves **U-45** (detection latency), **U-46** (numeric-kill fallback divergence), **DG-1..DG-3** (0600, no-follow/fstat, symlink/non-regular rejection), **AUTH-T9c**, and **G0** open. None is closed by this report.

## 6. Staging gap register and ownership

No staging test is authorized or performed by this audit. The following is a readiness plan, not evidence that a staging environment exists.

| Blocker | Owner | Prerequisite | PASS evidence | Current status / next action |
|---|---|---|---|---|
| B-01 SSRF implementation F-001 | Muse / artifact builder | Approved design and exact action trust boundary | Actual live-artifact code uses DNS resolution plus connection pinning; initial URL, every redirect, and script request are checked; blocked targets receive zero connections | **OPEN.** Provide code diff and deterministic local harness; keep Link Scanner inactive. |
| B-02 resource bounds F-002/F-003 | Muse / artifact builder | F-001 fetch path defined | Streaming byte cap, decompression cap, total deadline, cancellation and concurrency tests | **OPEN.** Provide implementation and bounded-resource test logs. |
| B-03 catalog mutation F-004/F-005 | Muse / artifact builder | Action authorization model documented | DB-enforced normalized uniqueness; concurrent duplicate test; unauthorized mutation rejected | **OPEN.** Provide schema diff, auth boundary and test evidence. |
| B-04 privacy F-006 | Muse | Public mirror review | `DATA-PLAN.md` contains only generic threat-model context; no wallet fragment or personal incident narrative | **OPEN.** Redact and rescan public mirror. |
| B-05 VM evidence provenance F-007/F-008 | Muse | Exact v2.3.6 harness and local run records | Complete redacted run bundle + manifest; corrected SU-T5 explanation; hashes map to committed harness | **OPEN.** Preserve failed and successful runs separately. |
| B-06 build provenance F-009 | Muse / builder environment owner | SDK package identity and build environment metadata | Bun version, lock/resolution data, SDK hash/provenance, typecheck/build/test results tied to commit | **OPEN.** Publish reproducibility manifest or controlled attestation. |
| B-07 staging runtime and sandbox | Staging operator + Muse | Staging artifact exists; exact artifact digest; non-production test data | ST-01..ST-03 PASS with Bun/kernel/seccomp/namespace/pidfd evidence | **BLOCKED — NOT PROVIDED.** Inventory exact runtime before tests. |
| B-08 filesystem and supervisor | Staging operator + Muse | Staging host/container and supervisor identified | ST-04..ST-07 and conditional ST-09 PASS with mount, permissions, /proc, process-tree and NFS evidence | **BLOCKED — NOT PROVIDED.** Identify filesystem and supervisor first. |
| B-09 operations and observability | Staging operator | Approved dry-run and recovery procedure | ST-10..ST-12 PASS; alerts demonstrably reach named accountable operator | **BLOCKED — NOT PROVIDED.** Define alert latency threshold and operator ownership. |
| B-10 extended staging prerequisites | Muse + staging operator | DNS/pinning design, PostgreSQL staging, NAT64/NSP test scope | ST-13..ST-16 PASS with raw evidence | **BLOCKED — NOT PROVIDED.** Provide environment inventory and test plans. |
| B-11 fallback decision U-46 | Project owner | Technical options and measured staging evidence | Written decision: prohibit numeric kill and use retained handle/supervisor/Bun API, or explicitly accept the quantified residual risk | **BLOCKED — owner decision required.** Muse must present the trade-off; no decision is inferred. |
| B-12 design gaps DG-1..DG-3 | Muse | Lock implementation design selected | Design defines mode, no-follow open, fstat validation and symlink/non-regular rejection; tests prove each | **OPEN.** Add to next design revision before implementation. |

## 7. Blocker log

| ID | Owner | Attempts / result | Next action |
|---|---|---|---|
| B-01..B-04 | Muse | V1 handoff committed; no subsequent Muse response commit found. Existing source remains unchanged. | Address findings in the live artifact through the builder workflow, resync source mirror, and provide evidence. |
| B-05 | Muse | v2.3.6 harness source is present; cited raw logs are absent from Git because of the ignore rule. | Publish an evidence bundle and correct the SU-T5 narrative. |
| B-06 | Muse / builder owner | Package metadata is present; lockfile, SDK provenance and CI evidence are not. | Publish reproducibility manifest and build attestations. |
| B-07..B-10 | Staging operator + Muse | No staging artifact/environment evidence was found in the reviewed repository. | Produce environment inventory first; then schedule controlled staging tests. |
| B-11 | Project owner | U-46 remains explicitly unresolved in v2.3.7. | Muse must present the decision with the security and reliability trade-off; no automatic fallback approval. |
| B-12 | Muse | DG-1..DG-3 are recorded as design gaps, not implemented requirements. | Add requirements and test criteria to the next design revision. |

## 8. Muse Handoff / Required Response

Muse must use this report as the next work request. The project owner is not a relay.

1. **Respond to V1 findings F-001..F-006.** Add a response matrix with addressed / partially addressed / rejected / blocked status, exact file paths and line ranges, commit SHA, test IDs, raw evidence references, residual risk and next action. Acceptance: every item is explicitly accounted for; documentation edits alone do not close code findings.
2. **Resolve F-001 before any scanner activation.** Apply destination policy to the initial URL, every redirect, and every script fetch. Resolve and validate all A/AAAA answers, reject prohibited ranges and mapped/zone-scoped forms, and pin the validated address to the actual connection. Acceptance: deterministic tests prove blocked destinations receive zero outbound connections, including DNS rebinding and redirect/script pivots.
3. **Resolve F-002/F-003.** Stream with byte and decompressed-byte limits; cancel on cap; enforce one total deadline across RDAP/page/redirect/script requests; add bounded concurrency/rate controls. Acceptance: oversized, slow and concurrent harness cases stay within declared resource and time budgets.
4. **Resolve F-004/F-005.** Add database uniqueness guarantees for normalized name/address; prove concurrent duplicate requests produce one row; document and enforce authorization for `addProject`; record official-source provenance. Acceptance: authorized and unauthorized test cases demonstrate the boundary.
5. **Resolve F-006.** Remove personal incident narrative and wallet-identifying fragments from the public source mirror. Acceptance: a documented scan of the public mirror finds no personal incident narrative or wallet identifier; preserve only generic threat-model rationale.
6. **Correct F-007/F-008.** Publish the missing v2.3.6 run evidence or immutable artifact references and hashes. Correct the SU-T5 explanation to match the missing-helper diagnosis in `SSRF_SPIKE_V236.md` §0.1 and the committed `openSync(..., 'wx')` helper. Acceptance: initial failure, helper addition, and each clean run are separately traceable.
7. **Resolve F-009.** Publish exact Bun version, lock/resolution data, SDK package identity/hash/provenance, and typecheck/build/test results. Acceptance: another reviewer can verify the build inputs without access to an undocumented local path.
8. **Prepare staging without running tests yet.** Provide a named staging artifact digest, runtime/kernel/sandbox inventory, filesystem/mount/ACL details, supervisor identity, egress policy, PostgreSQL staging details, and accountable alert operator. Acceptance: each ST-01..ST-16 gate has an owner, precondition, safe procedure, PASS/FAIL rule, and evidence destination.
9. **Resolve U-46 and DG-1..DG-3 explicitly.** Present the numeric-kill fallback trade-off to the project owner and add the missing lock-file permissions/no-follow/fstat/symlink requirements to the design. Acceptance: no ambiguous fallback remains in the design and no implementation proceeds without the required owner decision.

## 9. Audit limitations and decision

- Static review only. No code, build, dependency install, test, staging action, production action, or live artifact mutation was performed.
- GitHub combined status checks returned no status entries for the reviewed source-mirror and audit commits; no workflow files were found in the repository tree.
- The absence of committed logs means test execution cannot be independently confirmed from the repository. It does not prove the local tests were not run.
- The source mirror README says it is a review surface and does not update the live artifact. Any accepted implementation must be applied by Muse through the authorized artifact workflow and then re-synced for review.
- No staging or production evidence was discovered. VM results do not establish staging or production behavior.
- No claim is made that Link Scanner is enabled. It must remain inactive until all applicable security gates pass and separate explicit authorization is given.

**Final status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**  
**Next gate:** Muse response matrix + SSRF remediation/evidence package + staging environment inventory. No implementation or deployment approval is granted by this report.
