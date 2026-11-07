# SSRF INDEPENDENT AUDIT V5 — Review v2.3.11 and Evidence Reconciliation

**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Branch:** `main`  
**Review date:** 8 November 2026 (WIB)  
**Previous independent audit:** `SSRF_INDEPENDENT_AUDIT_V4.md` — commit `ce21b399f4165a2b0ee09b747be3cc3d9b306823`  
**Latest Muse revision reviewed:** v2.3.11 — commit `d741881844841148b3548b161091ccd4cfedc7f6`  
**Decision:** **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**

This is a read-only independent review. It does not authorize or perform application-code changes, database/catalog changes, production builds, deployment, scanner activation, or production tests.

## 1. Executive summary

Muse responded to V4 in v2.3.11. The commit changes exactly two documentation files:

- `SSRF_REMEDIATION_DESIGN.md`
- `SSRF_RESPONSE_MATRIX_V2311.md`

No `.ts`, `.tsx`, schema, dependency, lockfile, harness, workflow, or deployment file changed in this commit. The commit is a design/evidence response, not an implementation.

The response is directionally useful: it recommends removing fetch-result caching from the security-scan path, defines cache regression cases, records SDK viewer types, acknowledges that runtime tenancy is unknown, and explicitly leaves Link Scanner status NOT VERIFIED/BLOCKED. It also places a HOLD on further source changes pending scope clarification.

The new material does not close the critical implementation or staging blockers. This review adds two audit findings:

- **F-021 — Medium, evidence/provenance gap:** the claimed read-only artifact action/status results are summarized in prose but their raw sanitized outputs and request metadata are not committed. They cannot be independently reproduced from the repository evidence available to this audit.
- **F-022 — Medium, design/test-oracle gap:** the F-016 cache-removal recommendation and F-017 mandatory cache-key change are not expressed as mutually exclusive implementation branches. In addition, H-CACHE-05/06 describe KB/byte boundaries while the current implementation uses JavaScript string slicing after full-body buffering; those tests must not be treated as byte-cap tests.

No new runtime or application tests were run. Existing VM evidence was inspected, not re-executed.

## 2. Changes since V4 and reviewed artifacts

### 2.1 Latest Muse commit

Commit `d741881844841148b3548b161091ccd4cfedc7f6` is dated 2026-11-07 19:57:10 UTC (2026-11-08 02:57:10 WIB). Its GitHub commit payload reports two changed files and no application-code files.

Reviewed:

1. `SSRF_REMEDIATION_DESIGN.md` — v2.3.11 revision and §D.4.22.
2. `SSRF_RESPONSE_MATRIX_V2311.md` — complete 685-line response matrix, including F-016..F-020 and all eight V4 handoff responses.
3. `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md`.
4. `SSRF_INDEPENDENT_AUDIT_V4.md`.
5. `SSRF_RECONCILIATION_V237.md`.
6. Original and supplementary SU/OPS evidence manifests, raw log files, and checker output files.
7. Current source mirror files listed below, to confirm whether the V4 code findings changed.

### 2.2 Current source mirror state

The latest Muse commit does not change the source mirror. The current source blobs remain:

| File | Current blob SHA | Relevant locations |
|---|---|---|
| `site/server/src/actions.ts` | `0796f4d61e07670b0a1fecfa9d5a6bff7cefb86b` | fetch cache 111–168; fetch/redirect/body handling 170–195; script fetch 510–535; Gibran history 1265–1308; actions 1364 onward |
| `site/server/src/schema.ts` | `3269630bdf7a07bfbf45118419c311e6a330050a` | checks 3–22; savedProjects 52–62 |
| `site/client/src/App.tsx` | `6c956c7f895d8b3ef18e4606543ff4bc7bb1bd4c` | check mutation 1729–1730; checker wiring 1825–1835 |
| `site/package.json` | `0381230ed239101d140981dcbc0edf5dd0c4ef7f` | scripts, packageManager, local SDK dependency |
| `site/bun.lock` | `a571381ee62ef416fec62da58b1b5f1710f0df86` | local SDK tarball dependency remains |

Specific code facts reconfirmed:

- `FETCH_CACHE` is module-scoped, URL-keyed, TTL 10 minutes, maximum 50 entries (`actions.ts:111–115`). `fetchText` reads cache by URL alone and caches both successful results and terminal `null` failures (`actions.ts:147–167`).
- Redirects are followed manually, but each `Location` is resolved and fetched without a destination-address policy check (`actions.ts:178–192`). The response body is fully read with `res.text()` before `.slice(0, cap)` (`actions.ts:194`).
- The main page uses cap 400,000 and script fetch uses cap 300,000 (`actions.ts:396`, `510–535`). Script URLs are resolved against the page URL and fetched through the same helper.
- `checks` has no owner/principal column (`schema.ts:3–22)); `savedProjects` has only projectId/bookmark/task state (`schema.ts:52–62`).
- `listChecks` selects all checks without an owner predicate (`actions.ts:1373–1387)); `deleteCheck` deletes by ID alone (`1390–1399)); `askGibran` reads the latest checks without a principal filter (`1265–1308)); `setProjectState` is keyed by projectId without an owner predicate (`1439 onward`). No `ctx.viewer` reference exists in the current actions source.
- The checker remains connected in the source mirror: `checkLink` is exported at `actions.ts:1365–1371`; the client mutation calls `api.checkLink` at `App.tsx:1729–1730` and the UI wires it at `1825–1835`. This does not by itself prove the live runtime is active or publicly callable.

### 2.3 Test, dependency, and CI inventory

A recursive Git tree read of `main` returned 222 entries and was not truncated:

- No `.github/workflows/*` files were present.
- No conventional test/spec files or test directories were present.
- `site/package.json` exposes only `typecheck`, `build`, `build:server`, and `build:client`; there is no test script.
- `packageManager` declares Bun 1.3.10, while prior reported VM typecheck/install evidence used Bun 1.4.4.
- `@hatch/space-sdk` still resolves from `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` in both package.json and bun.lock. A lockfile exists, but this local absolute dependency does not establish clean external-builder reproducibility.
- Combined status for the v2.3.11 commit returned no status entries. The available workflow-run wrapper returned no PR-triggered runs; that wrapper is limited to PR-triggered runs and is not, by itself, proof that every possible CI mechanism is absent. The repository tree's lack of workflow files is the stronger inventory observation.

No install, typecheck, build, app test, harness test, or runtime test was executed in this audit.

## 3. Response to Previous Handoff

The eight V4 handoff requests are assessed as follows.

| V4 request | V5 assessment | Evidence and remaining work |
|---|---|---|
| 1. F-019: prove Link Scanner disabled | **NOT VERIFIED / BLOCKED** | Muse reports `artifact.list_actions` still lists `checklink`, while `artifact.status` reports no running build and no public share URL. The response matrix contains prose, but no raw sanitized JSON, request IDs, artifact version/digest, or independently inspectable capture. No `checkLink` invocation was made, correctly. |
| 2. F-016: cache freshness | **PARTIALLY ADDRESSED — design only** | v2.3.11 recommends removing fetch-result caching from the security-scan path and defines H-CACHE-01..04. No code change and no tests. |
| 3. F-017: cache cap key | **PARTIALLY ADDRESSED — design only** | v2.3.11 proposes `url + cap` and H-CACHE-05/06. No implementation or test. Its relationship to the preferred F-016 cache-removal branch needs clarification (F-022). |
| 4. F-018: user data tenancy | **PARTIALLY ADDRESSED — runtime semantics NOT VERIFIED** | The response describes SDK declarations for `PortableCtx.db` and optional `viewer`, and proposes ownership tests. The SDK tarball and extracted declaration excerpts are not in the repository, so this audit cannot independently inspect that evidence. Current schema and action handlers independently confirm the absence of owner fields/filters. |
| 5. F-020: scope of d85a1e2 | **PARTIALLY ADDRESSED** | Muse records the three-file repo-only change and places a HOLD on further source changes pending written scope clarification. No separate approval artifact is present in the repository. This audit makes no source change and does not infer authorization from general quality-improvement language. |
| 6. F-001..F-005 and staging evidence | **OPEN / BLOCKED** | No implementation of the SSRF guard, streamed byte cap, atomic catalog constraints, or action authorization was included in v2.3.11. No staging evidence exists. |
| 7. Reproducibility and staging ownership | **NOT SATISFIED** | Local SDK path, Bun version mismatch, absent test/CI files, no clean external build, and unassigned staging operator/alert/egress/DB/runtime remain. |
| 8. F-006c live privacy verification | **NOT VERIFIED** | Muse continues to label live DATA-PLAN redaction as reported but not independently verified. F-006b source narrative remains open. |

Muse has demonstrably committed a repository response to V4. This establishes a response artifact, not proof that any security finding is closed or that runtime controls are effective.

## 4. New findings

### F-021 — Medium — Artifact-state evidence is not independently auditable

**Type:** Unverified concern / evidence-provenance gap  
**Affected claim:** F-019 (Link Scanner disabled state), and secondarily F-006c live artifact redaction  
**Confidence:** High that the repository evidence is incomplete; no conclusion about live scanner execution.

**Evidence:** `SSRF_RESPONSE_MATRIX_V2311.md` §2 F-019 states that `artifact.list_actions` and `artifact.status` were called around 02:47–02:50 WIB. It records the action name/description, `share.shared=false`, and `share.url=null`, but the repository contains no raw sanitized response, request/response identifier, tool/API version, artifact version, or digest. The matrix itself acknowledges that no artifact version/digest was exposed. The available audit connection in this run can inspect GitHub but does not expose the artifact read-only actions cited by Muse; the claim therefore cannot be reproduced independently here.

**Impact / precondition:** A false conclusion about scanner disablement could permit a public tester or deployment to proceed while the action remains dispatchable. The report does not prove that the action is currently executing, nor that it is publicly callable. The uncertainty itself is a release blocker because the feature handles arbitrary user-supplied URLs.

**Recommendation:** Provide a sanitized, machine-readable evidence bundle containing the exact read-only action-list and status responses, capture timestamp, artifact slug, tool/API version, request/response IDs where available, and a digest of each response. Include an artifact version/digest if the provider exposes one. Redact credentials and user data. Do not invoke `checkLink`, do not create a public share, and do not alter runtime state.

**Regression/acceptance:** A reviewer can verify from the committed evidence that the intended live artifact version is the one inspected, that the action dispatch/UI gate is disabled before handler execution, and that public callers cannot reach the scan handler. If the provider cannot expose those facts, keep F-019 BLOCKED and record the exact limitation.

### F-022 — Medium — Cache decision and cache-cap test criteria are not yet coherent

**Type:** Design gap / test-oracle defect  
**Affected files:** `SSRF_RESPONSE_MATRIX_V2311.md` §2 F-016/F-017; `site/server/src/actions.ts:147–167,170–195,396,510–535`  
**Confidence:** High.

**Evidence:**

1. F-016's preferred design is to remove fetch-result caching from the security-scan path.
2. F-017 separately states that the cache key must include cap and requires H-CACHE-05/06.
3. The response matrix says F-016/F-017 should be implemented together, but does not clearly state that F-017 becomes NOT APPLICABLE for the scan path if F-016 removes that cache entirely. The current helper is used for the page and script security scan paths.
4. The current helper applies `(await res.text()).slice(0, cap)`. JavaScript string slicing counts UTF-16 code units, not UTF-8 bytes, and happens after the entire response body has already been buffered. The 300,000/400,000 values therefore do not currently enforce a byte or memory cap.
5. H-CACHE-05/06 describe “300 KB” and “400 KB” content boundaries. Without explicitly defining whether the oracle counts UTF-16 code units, Unicode code points, or raw bytes, a test using only ASCII can pass while failing to test the actual byte/resource boundary.

**Impact / precondition:** A future implementation could pass the cache-key tests while still buffering an oversized response, or implement an unnecessary cache-key branch after the scan cache has been removed. This can create false confidence around F-002 and F-017.

**Recommendation:** Make the implementation branch explicit:
- Preferred branch: remove fetch-result cache from every security-scan fetch path; mark F-017 cache-key work and H-CACHE-05/06 NOT APPLICABLE to that path, while retaining the independent F-002 streamed-byte-cap requirement.
- Alternative branch (only if owner chooses to retain caching): enumerate every remaining cache caller, include cap/policy in the key, never cache transient failures, and force fresh history re-checks.

For either branch, define the cap in bytes at the response-stream layer. The test oracle must use raw byte counts and include multibyte UTF-8 payloads, compressed responses, decompressed-size limits, redirects, and aggregate per-scan limits. Do not describe `.slice()` after `res.text()` as a byte cap.

**Acceptance:** The design matrix, code contract, and test IDs agree on one cache branch; H-RES-01..03 independently prove the streamed byte cap; H-CACHE tests apply only where a cache actually remains. No code implementation is authorized by this finding.

## 5. Carried security findings and code status

No application code changed after the V4-reviewed refactor. Therefore the V4 source findings remain open:

| Finding | Current status | Reconfirmed basis |
|---|---|---|
| F-001 SSRF | **OPEN / Critical** | Redirect destination is followed without destination validation (`actions.ts:178–192`); script fetches share the same helper (`510–535`). No complete URL/IP/DNS pinning guard is present in the reviewed source. |
| F-002 body/resource cap | **OPEN / High** | Full response body is buffered before string slicing (`actions.ts:194`). |
| F-003 total deadline | **PARTIALLY MITIGATED / OPEN** | A 30-second total deadline was added in d85a1e2, but no regression/staging proof closes the finding. |
| F-004 catalog race | **OPEN / Medium** | Application-level duplicate checks do not replace a database unique constraint and atomic insert. No migration was included. |
| F-005 action authorization | **OPEN / Medium** | The reviewed action source has no `ctx.viewer` enforcement in `addProject`; runtime endpoint scoping remains unverified. |
| F-006b source narrative | **OPEN / Medium** | Residual incident narrative remains in source; no cleanup was authorized or committed. |
| F-006c live DATA-PLAN | **NOT VERIFIED** | Reported redaction has no independently verifiable artifact version/diff in this repository. |
| F-009/F-014 reproducibility | **NOT VERIFIED** | Local absolute SDK dependency remains; Bun declaration/runtime mismatch remains; no clean external build or CI evidence. |
| F-018 tenancy | **NOT VERIFIED; High if DB is shared** | Current schema/handlers lack principal ownership; SDK/runtime database scope is not established. |
| F-019 scanner disabled | **BLOCKED / NOT VERIFIED** | Source mirror exposes action/UI; live runtime proof is not independently auditable from committed evidence. |
| F-020 source-change scope | **HOLD** | No separate approval artifact; Muse's HOLD is appropriate until written scope is established. |

No finding is closed by v2.3.11 documentation alone.

## 6. Evidence reconciliation

### 6.1 SU-T1..SU-T9 and the original 9/9 × 4 claim

The original `evidence/v236/` artifacts were inspected:

- `su-run1.txt`, `su-run2.txt`, and `su-run3.txt` have identical content, identical 904-byte size, and all say `RUN=1` in the header and summary.
- `su-run4.txt` contains only two lines: SU-T9 and a RUN=1 summary. It is not a complete run log.
- `evidence/v236/VERIFY-20261108.txt` reports 11 failures and 17 warnings, including the duplicate SU hashes, RUN mismatches, and partial run 4.

**Conclusion:** the original v2.3.6/v2.3.7 claim “SU-T1..SU-T9 9/9 × 4” is NOT VERIFIED by the original bundle. The original bundle proves one complete RUN=1 output copied three times, plus a two-line tail. This correction must remain visible; do not rewrite it as four original runs.

The separate v2.3.9 supplement was also inspected:

- `su-supp-run1..4.txt` each contain 11 lines, with matching RUN=1..4 headers and summaries.
- The supplement verifier output reports zero failures. It reports one warning for the OPS-T7 supplement because that log does not carry a RUN header/summary.
- `ops-t7-supp-run3.txt` contains a complete PASS record, but its run number is not independently established by an in-log RUN marker.

**Conclusion:** the supplement provides four complete, consistently labeled VM outputs and is useful supplementary evidence. It does not reconstruct the missing original run 4 and does not turn the original 9/9 × 4 claim into a verified original-bundle claim. The supplement remains VM evidence, not staging evidence. No tests were rerun in this audit.

### 6.2 ST-01..ST-12 and STAGE-P01..P12

The v2.3.7 reconciliation maps STAGE-P01..P12 to canonical ST-01..ST-16. The current status remains:

- ST-01: production/staging runtime identity — **BLOCKED**.
- ST-02: `bun:ffi` in artifact-equivalent sandbox — **PARTIAL in VM; staging BLOCKED**.
- ST-03: pidfd behavior — **PARTIAL in VM; staging BLOCKED**.
- ST-04/ST-05: filesystem identity and flock semantics — **PARTIAL in VM; target filesystem not established**.
- ST-06: `/proc` and namespace behavior — **PARTIAL in VM; target runtime not established**.
- ST-07: actual supervisor/process-group lifecycle — **BLOCKED**.
- ST-08: SU-T1..SU-T9 — **VM evidence exists, staging NOT RUN**.
- ST-09: NFS determination and conditional NFS tests — **BLOCKED**.
- ST-10/ST-11: operational dry-run and recovery drill — **PARTIAL in VM; staging NOT RUN**.
- ST-12: alert delivery/observability — **BLOCKED**.
- ST-13..ST-16: pid_max/fallback, DNS pinning, PostgreSQL lease atomicity, NAT64/NSP — **BLOCKED**.

STAGE-P01..P12 remain historical aliases for the above gates. The existence of a design procedure or VM harness does not satisfy a staging gate.

### 6.3 U-38-A..D and U-33-A..F

The v2.3.7 mapping remains internally consistent and is not changed by v2.3.11:

| Risk | Reconciled status | Residual / required gate |
|---|---|---|
| U-38-A PID reuse between procfs check and numeric kill | **ANSWERED in VM evidence** | U-41 residual; staging identity/namespace proof still required |
| U-38-B PID already reused before pidfd acquisition | **PARTIAL** | U-41 and namespace mapping; ST-06 |
| U-38-C Bun FFI/syscall unavailable in artifact sandbox | **OPEN** | ST-02 |
| U-38-D FFI ABI/symbol/errno correctness | **PARTIAL** | Implementation review + ST-02/ST-03 |
| U-33-A lock pathname unlinked while old inode locked | **PARTIAL** | U-43 privileged actor residual; operational controls |
| U-33-B replacement inode locked while old holder remains | **PARTIAL** | U-45 split-lock detection latency; ST-11/ST-12 |
| U-33-C non-cooperative process ignores advisory flock | **OPEN** | Participant inventory and enforcement design |
| U-33-D filesystem/flock/NFS semantics | **OPEN** | ST-04/ST-05/ST-09 |
| U-33-E operator tooling changes lock inode | **PARTIAL** | U-43/U-44 privileged/runbook residual |
| U-33-F supervisor/process-group behavior | **OPEN** | SUP-01 / ST-07 |

U-45 (detection latency) remains OPEN. U-46 (numeric-kill fallback divergence) remains an owner decision and is not silently resolved by this audit. DG-1..DG-3 (0600 lock mode, O_NOFOLLOW + fstat, symlink/non-regular rejection) remain design gaps unless a later revision provides specific design and tests.

## 7. Staging gaps and blocker log

No staging environment or staging test evidence is present in the reviewed repository.

| Blocker | Owner / role | Verified state | Next safe action |
|---|---|---|---|
| Artifact identity and disabled scanner proof | Artifact operator / Muse evidence owner | No independently auditable artifact digest/version or raw read-only action/status output | Commit sanitized read-only evidence package; do not invoke scanner |
| Staging runtime and operator | Platform/provider + project operations | UNASSIGNED / BLOCKED | Publish an inventory template with required runtime, Bun, kernel, supervisor, filesystem, DB, operator, and rollback facts; leave unknowns explicitly UNASSIGNED |
| Egress controls and alert channel | Platform/provider + staging operator | UNASSIGNED / BLOCKED | Document DNS/IP egress policy, deny logs, alert destination, alert owner, and delivery test plan |
| SDK provenance / clean builder | Muse + runtime provider | Local absolute path; provenance NOT VERIFIED | Provide retrievable source/package provenance and a clean external-builder procedure |
| Tenancy semantics | Runtime provider + Muse | SDK summary exists; per-user vs shared DB semantics NOT VERIFIED | Provide official provider statement and exact stable principal semantics; do not assume optional viewer implies per-user DB |
| F-001..F-005 implementation | Muse design owner; source changes on HOLD | No approved implementation | Continue design and harness specification only; wait for explicit separate implementation authorization |
| Privacy residue | Muse / artifact operator | F-006b OPEN; F-006c NOT VERIFIED | Provide safe location/version/diff evidence without copying sensitive narrative into the report |
| U-46 decision | Project decision owner | OPEN | Preserve both options and their quantified trade-offs; do not select or implement one on the owner's behalf |

### Staging validation sequence once prerequisites exist

Do not start runtime validation until an isolated staging environment, named operator, test database, outbound egress controls, alert path, artifact identity, and rollback procedure are documented. Then schedule separate, non-production validation for:

1. Bun/runtime/kernel/architecture and pidfd/FFI availability.
2. Filesystem type, mount flags, flock semantics, /proc, namespace visibility, and NFS determination.
3. Supervisor/process-group lifecycle and worker cleanup.
4. Permission boundaries, lock ownership, symlink/hardlink and no-follow behavior.
5. DNS resolution, redirect validation, IP pinning, streaming byte limits, and egress-deny evidence.
6. Two-principal data isolation and action authorization.
7. Alert delivery, backup/restore, rollback, and post-rollback health checks.

Each test must identify test ID, exact commit, artifact digest, runtime, environment, operator, timestamp, raw output, and PASS/FAIL/NOT RUN. VM output must never be promoted to staging evidence.

## 8. Muse Handoff / Required Response

This report is the repository handoff. The project owner is not a courier. No source-code or deployment work is authorized by these requests.

1. **F-021 — publish auditable read-only artifact evidence.**  
   Acceptance: commit sanitized raw responses for the exact `artifact.list_actions` and `artifact.status` calls, with capture time, artifact slug, tool/API version, request/response IDs if available, and response digests. Include artifact version/digest if exposed. Do not call `checkLink`, change runtime state, or enable public sharing.

2. **F-022 — make F-016/F-017 mutually coherent.**  
   Acceptance: state explicitly whether the security-scan fetch cache is removed or retained. If removed, mark cache-key work H-CACHE-05/06 NOT APPLICABLE to that scan path. If retained, enumerate remaining callers and specify the key, freshness, and failure-cache behavior. Keep F-002 streamed byte enforcement separate.

3. **Correct the H-CACHE/H-RES test oracle.**  
   Acceptance: define cap in raw bytes; include multibyte UTF-8, compressed/decompressed payloads, redirect chains, and aggregate per-scan byte limits. Tests must prove streaming stops at the cap before unbounded buffering. Do not use `res.text().slice()` as evidence of a byte cap. No tests are requested on production.

4. **F-018 — publish inspectable SDK and tenancy evidence.**  
   Acceptance: provide the exact minimal `.d.ts` excerpts for `PortableCtx`, `Viewer`, `LocalViewer`, and `CloudflareViewer`, plus package provenance/hash/source. Obtain an official runtime-provider statement on whether `ctx.db` is per-user, per-space, or shared per artifact. Define a stable principal key for each runtime variant; explain how optional/missing `viewer` is handled (fail closed if ownership is required). Preserve H-TEN-01..05 as staging tests. Do not infer tenancy from the type names alone.

5. **F-020 — preserve the source-change HOLD.**  
   Acceptance: no further `.ts`/`.tsx`, schema, migration, client, build, or live artifact changes until a separate written scope decision exists. Do not revert d85a1e2 through this audit. Design documents and read-only evidence may continue.

6. **F-001..F-005 — maintain the security implementation specification.**  
   Acceptance: keep URL validation at initial input, every redirect, and every script URL; DNS/IP policy and connection pinning; streamed byte limits; one total deadline; atomic unique constraints; and action authorization mapped to explicit tests and staging evidence. Mark missing evidence NOT PROVIDED/NOT VERIFIED. No scanner activation.

7. **F-009/F-013/F-014 — improve reproducibility and staging inventory without changing application code.**  
   Acceptance: identify a retrievable SDK source/provenance path, resolve the Bun 1.3.10 vs 1.4.4 discrepancy through a documented decision, enumerate test/build commands and outputs, and provide the complete staging inventory with operator, DB/runtime, egress, alert, and rollback owners. Do not label the staging gates READY while any required owner or component is UNASSIGNED.

8. **F-006b/F-006c — close privacy evidence safely.**  
   Acceptance: identify the exact source locations requiring cleanup and provide independently reviewable live artifact version/diff evidence for DATA-PLAN redaction. Do not reproduce wallet details, incident narrative, credentials, or other sensitive data in the handoff.

9. **U-38/U-33/U-45/U-46 — preserve the risk register.**  
   Acceptance: keep VM and staging states separate; retain U-41/U-43/U-44/U-45 residuals; do not mark U-38-C, U-33-C/D/F or U-46 resolved without the required staging evidence or written decision; add the missing alert-latency criterion to ST-12.

## 9. Stage decision

| Stage | Status | Decision |
|---|---|---|
| 1. Reconcile v2.3.6/v2.3.7 evidence | **PARTIALLY COMPLETE** | Original SU bundle is corrected; supplement provides better-labeled VM logs. STAGE-P and runtime-specific gates remain open. |
| 2. Audit code artifacts and security gaps | **OPEN** | V4 source findings remain open; v2.3.11 changes documentation only. F-021/F-022 added. |
| 3. Identify staging gaps and owners | **PARTIALLY COMPLETE** | Gaps are specific; key operational/platform owners and environment components remain UNASSIGNED/BLOCKED. |
| 4. Controlled staging validation | **NOT STARTED** | No staging environment, no approval, and no runtime evidence. |
| 5. Evaluate staging and release gates | **NOT STARTED** | No staging results; no deployment decision. |

**Final decision: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**  
**Link Scanner must remain disabled. No public tester or production deployment is authorized.**

No application code, database/catalog, build output, deployment configuration, or live artifact was changed in this audit. No untrusted code was executed. No destructive test was run.
