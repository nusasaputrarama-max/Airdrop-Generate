# SSRF Independent Audit V6 — Review of Muse v2.3.12

**Repository:** nusasaputrarama-max/Airdrop-Generate  
**Branch:** main  
**Audit date:** 2026-11-08  
**Previous independent audit:** SSRF_INDEPENDENT_AUDIT_V5.md (commit 854d3fc09eb646e8c97a187b5868fc3f0321fa91)  
**Latest Muse revision reviewed:** v2.3.12 (commit 9f4e2d31ba077b2f234ae110d5bf72882cb7fd3f)  
**Decision:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED

## 1. Executive summary

Muse responded to V5 with a documentation-and-evidence revision, v2.3.12. The revision is materially useful: it publishes the raw read-only artifact responses, makes the preferred cache-removal design explicit, corrects several byte-cap test concepts, publishes the minimal SDK declaration excerpts, records a Bun version decision, and adds alert-latency criteria.

The evidence package for F-021 is independently inspectable. The SHA-256 values declared in its README match the fetched UTF-8 file contents for both JSON responses. The package confirms that the published action list still contains checklink, that no build is running, and that the artifact is not publicly shared. It does not prove that the scanner is disabled, that the action cannot be invoked by an owner or agent, or which exact artifact version was inspected.

The F-022 design response is only partially adequate. Three defects remain in the new H-RES oracle:
- H-RES-02 asks for a UTF-8 fixture that is mathematically impossible in one of its two requested directions.
- H-RES-03 does not unambiguously distinguish compressed wire bytes from decompressed response-body bytes.
- H-RES-05 requires an aggregate per-scan limit but does not state its numeric value or define the shared budget across concurrent fetches.

No application source changed in v2.3.12. A comparison from the last source-changing commit d85a1e2078874acc7ca01d5855360e00de2af241 to main shows four later commits and only audit/design/evidence files changed. The reviewed source therefore remains the d85a1e2 implementation. Its SSRF, full-body buffering, cache-failure, authorization, and privacy findings remain open.

No tests were run in this audit. No untrusted code was executed. No staging environment or staging evidence was found. The hard gate remains unchanged.

## 2. Scope and method

This was a read-only repository review. The audit:
1. Read MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md and the V5 independent report.
2. Fetched the latest commit metadata and patch for v2.3.12.
3. Compared d85a1e2 with main to establish whether application source changed after V5.
4. Read the complete v2.3.12 response matrix and the new F-021 evidence files.
5. Read the v2.3.12 addition to SSRF_REMEDIATION_DESIGN.md.
6. Rechecked the relevant source, package manifest, and lockfile.
7. Reconciled the new material against the previous findings and the existing staging/evidence register.

The protocol requirements were followed: Muse responses were checked against repository artifacts, unresolved findings were carried forward, and this report is the next durable repository handoff. This is not a real-time agent-to-agent channel; a commit proves that a response artifact exists, not that another agent has read it.

## 3. Changes since V5

### 3.1 Latest Muse commit

Commit 9f4e2d31ba077b2f234ae110d5bf72882cb7fd3f:
- SSRF_REMEDIATION_DESIGN.md — v2.3.12 revision and new D.4.23 response.
- SSRF_RESPONSE_MATRIX_V2312.md — new 744-line response matrix.
- evidence/f021-artifact-state-20261108/README.md — capture metadata and limitations.
- evidence/f021-artifact-state-20261108/list_actions.json — raw read-only action-list response.
- evidence/f021-artifact-state-20261108/status.json — raw read-only artifact-status response.

The commit contains no application code, schema, migration, package manifest, lockfile, build, or deployment changes.

### 3.2 Source-change comparison

The comparison from d85a1e2078874acc7ca01d5855360e00de2af241 to main reports four commits ahead and no commits behind. The changed files in that range are:
- SSRF_INDEPENDENT_AUDIT_V4.md
- SSRF_INDEPENDENT_AUDIT_V5.md
- SSRF_REMEDIATION_DESIGN.md
- SSRF_RESPONSE_MATRIX_V2311.md
- SSRF_RESPONSE_MATRIX_V2312.md
- evidence/f021-artifact-state-20261108/README.md
- evidence/f021-artifact-state-20261108/list_actions.json
- evidence/f021-artifact-state-20261108/status.json

No site source file appears in that comparison. The last source-changing commit remains d85a1e2. The v2.3.12 HOLD on further source changes was observed.

## 4. Reviewed artifacts

| Artifact | Review result |
|---|---|
| MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md | Read. Requires evidence-backed response matrices, numbered handoffs, and strict separation of VM/staging/production. |
| SSRF_INDEPENDENT_AUDIT_V5.md | Read as the previous independent handoff. |
| SSRF_REMEDIATION_DESIGN.md | Read the v2.3.12 changelog and D.4.23 response, including the cache branch, byte-cap oracle, tenancy, reproducibility, staging, and hard gates. |
| SSRF_RESPONSE_MATRIX_V2312.md | Read in full. Relevant sections include F-021, F-022, F-018, F-019, F-020, previous-handoff response, risk register, hard gates, and next gates. |
| evidence/f021-artifact-state-20261108/README.md | Read in full. |
| evidence/f021-artifact-state-20261108/list_actions.json | Read in full; SHA-256 independently recomputed and matched the declared digest. |
| evidence/f021-artifact-state-20261108/status.json | Read in full; SHA-256 independently recomputed and matched the declared digest. |
| site/server/src/actions.ts | Rechecked fetch/cache, redirect, page-fetch, script-fetch, and residual incident-string locations. |
| site/client/src/App.tsx | Rechecked the check mutation and UI call path; no post-d85 change was found. |
| site/package.json | Rechecked scripts, packageManager, and local SDK dependency. |
| site/bun.lock | Rechecked the local SDK path and lockfile entry. |

## 5. Response to Previous Handoff

### 5.1 F-021 — raw artifact-state evidence

**Assessment: PARTIALLY ADDRESSED; provenance gap closed for the two captured responses, but F-019 remains BLOCKED.**

The v2.3.12 evidence package is now present in the repository. Independent SHA-256 recomputation over the fetched UTF-8 contents matched:
- list_actions.json: dbe989b520de47bc031602e164096ef75b3805d35968a0b6f9e1343fca4436d9
- status.json: 3b343a27720ef3aa156845a98c7c8cb26ded566de5808fdbaae950ce3d230019

The action-list response includes checklink in available_actions. The status response reports build=null, share.shared=false, and share.url=null.

This proves what those captured responses contain. It does not prove that checklink was successfully invoked, that it is callable from a public endpoint, or that it is disabled for owner/agent dispatch. The package still lacks artifact version/digest, tool/API version, and request/response IDs. The absence of a public share is not equivalent to a disabled action.

F-021 is therefore addressed as an evidence-provenance gap for the two responses. F-019 is not closed.

### 5.2 F-022 — cache branch and byte-cap oracle

**Assessment: PARTIALLY ADDRESSED; design branch is clearer, but the new test oracle has defects.**

Muse explicitly prefers removing fetch-result caching from all security-scan fetch paths: the main page and referenced scripts. Under that branch, F-017 and H-CACHE-05/06 are not applicable to those scan paths. F-002 remains a separate streamed-byte-limit requirement. This is a coherent design direction.

However, the preferred branch is not an owner implementation authorization. Matrix §9 still makes G-F an owner decision gate. The report must not treat the design preference as approval to change source.

The revised H-RES tests are not ready for acceptance:
- H-RES-02 contains an impossible UTF-8 test condition; see F-023.
- H-RES-03 leaves the byte-counting layer ambiguous; see F-024.
- H-RES-05 does not specify the numeric aggregate budget; see F-025.

No implementation or staging test has been supplied for the selected branch. The current source still uses the fetch cache, including URL-only lookup and caching null after failed retries. The source still reads the complete response with res.text() before slicing the resulting string.

### 5.3 F-018 — SDK declarations and tenancy

**Assessment: PARTIALLY ADDRESSED; runtime tenancy remains NOT VERIFIED.**

The response matrix now contains the minimal PortableCtx, Viewer, LocalViewer, and CloudflareViewer declarations. The declarations establish that viewer is optional and that db is a per-invocation accessor. They do not establish whether the underlying database is per-user, per-space, or shared per artifact.

The SDK tarball remains builder-local at an absolute /opt/hatch path. No independently retrievable source or official provider statement about database scope was supplied. The proposed principal keys and fail-closed behavior are design proposals, not runtime evidence. H-TEN-01..05 remain staging tests.

### 5.4 F-019 — Link Scanner disabled state

**Assessment: BLOCKED / NOT VERIFIED.**

The new raw evidence still lists checklink as a published action. The artifact is not publicly shared and no build is running, but neither fact proves that the action is disabled for owner/agent execution or blocked before handler dispatch.

No artifact version/digest, disabled dispatch evidence, UI feature-gate evidence, public invocation denial evidence, or egress observation log was supplied. No checkLink action was invoked in this audit.

Link Scanner must remain disabled. Do not infer disabled state from a document, a non-public share setting, or the absence of a running build.

### 5.5 F-020 — source-change scope

**Assessment: HOLD PRESERVED; owner approval remains NOT PROVIDED.**

The v2.3.12 commit changed only design, matrix, and evidence files. The d85a1e2 source refactor was not reverted. No separate approval artifact for further source changes exists in the repository. No new source changes are authorized by this audit.

### 5.6 F-001..F-005 — carried source findings

**Assessment: OPEN / BLOCKED; no source remediation was committed.**

The reviewed source remains unchanged after d85a1e2:
- F-001 Critical — initial URL validation, redirect destination validation, DNS/IP policy, and connection pinning are not demonstrated. The redirect loop follows a Location by resolving it against the current URL and fetching it without a destination security check (actions.ts:178–192). Script URLs are resolved and fetched through the same helper (actions.ts:520–525).
- F-002 High — the response body is fully buffered by res.text() before string slicing (actions.ts:194). This is not a streamed byte or memory cap.
- F-003 High — a 30-second total deadline is a partial mitigation, not a closure proof. No relevant staging test was supplied.
- F-004 Medium — application-level duplicate checks still require database-enforced atomic uniqueness; no migration or unique constraint was committed.
- F-005 Medium — action authorization and runtime endpoint scoping remain unverified.

No finding is closed by the v2.3.12 design document.

### 5.7 F-006b/F-006c — privacy residue

**Assessment: F-006b OPEN; F-006c NOT VERIFIED.**

The response matrix identifies residual source locations at actions.ts lines 52, 483, and 1245 without reproducing sensitive narrative. No source cleanup was committed. The reported live DATA-PLAN redaction still lacks an independently reviewable artifact version/digest, before/after content hash or diff, and capture timestamp.

This report does not reproduce the incident narrative or any wallet detail.

### 5.8 F-009/F-013/F-014 — reproducibility and staging ownership

**Assessment: NOT SATISFIED.**

The current package manifest declares Bun 1.3.10, while previous VM evidence used Bun 1.4.4. The v2.3.12 decision to treat 1.3.10 as canonical is a design decision, not a clean-build result. The SDK dependency remains an absolute local file path in both package.json and bun.lock. A clean external builder cannot retrieve that dependency from the repository alone.

site/package.json has typecheck and build scripts but no test script. Repository search found no workflow evidence; the response matrix also records no .github/workflows CI. No CI run or clean external build result was supplied.

Staging operator, alert channel, egress policy, and staging DB/runtime remain UNASSIGNED/BLOCKED.

## 6. New findings

### F-023 — Medium — H-RES-02 contains an impossible UTF-8 fixture condition

**Type:** Design gap / test-oracle defect  
**Affected files:** SSRF_RESPONSE_MATRIX_V2312.md:224; SSRF_REMEDIATION_DESIGN.md §D.4.23  
**Confidence:** High.

H-RES-02 asks for malicious content positioned after the boundary of 300,000 UTF-16 code units but before 300,000 raw UTF-8 bytes, and then asks for the reverse. The first direction is impossible for valid Unicode text.

For every valid Unicode scalar sequence, UTF-8 byte length is greater than or equal to UTF-16 code-unit length:
- ASCII uses one byte and one UTF-16 code unit.
- Non-ASCII BMP characters use two or three UTF-8 bytes for one UTF-16 code unit.
- Supplementary characters use four UTF-8 bytes for two UTF-16 code units.

Therefore a string cannot have more than 300,000 UTF-16 code units while still containing fewer than 300,000 UTF-8 bytes. A test fixture requiring that relationship cannot be constructed.

**Impact:** The test specification is not executable as written. A harness author may silently change the fixture, weaken the assertion, or claim a PASS against an impossible case. That would undermine confidence in the byte-cap regression test.

**Recommendation:** Replace the bidirectional requirement with a feasible discriminating fixture. For example, 150,001 repetitions of U+00E9 have 150,001 UTF-16 code units and 300,002 UTF-8 bytes. Place a malicious marker immediately after the 300,000-byte boundary. A correct 300,000-byte stream cap must exclude the marker; a faulty 300,000-code-unit string cap would include it. Add a supplementary-plane fixture, document the exact byte and code-unit counts, and remove the impossible reverse-direction assertion.

**Regression acceptance:** The committed test fixture must state the exact input code points, UTF-8 byte length, UTF-16 code-unit length, marker byte offset, configured cap, and expected verdict. The test must distinguish byte counting from string.length. No test was run in this audit.

### F-024 — Medium — H-RES-03 does not define which byte layer is capped

**Type:** Design gap / resource-limit ambiguity  
**Affected files:** SSRF_RESPONSE_MATRIX_V2312.md:199–203, 225; SSRF_REMEDIATION_DESIGN.md §D.4.23  
**Confidence:** High that the specification is ambiguous; runtime behavior is NOT VERIFIED.

The matrix defines the cap as raw bytes on the response stream before string decoding and says it is measured before decompression is fully read into memory. H-RES-03 separately requires a decompressed-size limit for gzip/br payloads.

Those statements do not identify whether the counted stream is:
1. compressed bytes transferred over the network;
2. bytes exposed by the Fetch Response.body after any transparent decompression performed by the runtime; or
3. bytes after application-controlled decompression.

A cap on compressed bytes alone does not prevent a decompression bomb. A cap on a transparently decompressed body stream can limit decoded memory, but it does not prove a separate wire-byte limit. The design must not assume Bun's exact Fetch decompression behavior without staging evidence.

**Impact:** A test could report that a compressed response is below the raw-byte cap while the decoded body expands far beyond the intended memory budget, or could count only decoded bytes while claiming to enforce a network transfer cap.

**Recommendation:** Define the resource budgets separately:
- encoded/wire-byte budget, if required and observable at the selected transport layer;
- decoded response-body byte budget, enforced while reading the post-decompression stream and before text decoding;
- aggregate per-scan budget shared by the page and all script fetches.

State which layer Bun exposes through Response.body in the selected runtime, how content-encoding is handled, and how cancellation propagates. Do not rely on Content-Length alone. If the runtime cannot expose wire bytes, state that limitation and enforce the decoded-body budget plus an infrastructure egress limit.

**Regression acceptance:** A compressed fixture must demonstrate that the decoded-body counter aborts before the decompressed payload exceeds its configured budget. If a wire-byte cap is claimed, the test must separately measure it at a layer that actually observes encoded bytes. Record runtime/Bun version and raw instrumentation. No test was run in this audit.

### F-025 — Medium — H-RES-05 has no measurable aggregate budget

**Type:** Design gap / incomplete acceptance criterion  
**Affected files:** SSRF_RESPONSE_MATRIX_V2312.md:226–227; SSRF_REMEDIATION_DESIGN.md §D.4.23  
**Confidence:** High.

H-RES-05 requires total bytes buffered per scan to remain below an aggregate limit, but the document does not provide the numeric limit, the exact scope of counted bytes, or a concurrency-safe accounting rule. It refers to a page cap of 400,000 bytes plus N script caps of 300,000 bytes each. The current source selects up to three scripts and fetches them concurrently with Promise.all (actions.ts:512–525), but the design does not say whether the aggregate limit is 1,300,000 bytes, a lower shared budget, or another value.

**Impact:** Without a numeric limit and precise accounting scope, the harness cannot produce an objective PASS/FAIL result. Concurrent fetches may each remain under their individual caps while their combined consumption exceeds an intended per-scan budget.

**Recommendation:** Declare a numeric aggregate decoded-body budget per scan, maximum script count, per-request limits, and whether redirect bodies count. Use one shared per-scan budget across the main page and all concurrent script streams. Budget reservation/accounting must be concurrency-safe; when the shared budget is exhausted, cancel outstanding streams and fail closed. Redirect response bodies must be explicitly canceled or accounted for rather than left implicit.

**Regression acceptance:** The test must run the page and maximum number of scripts concurrently with payloads that each remain below their individual limits but collectively exceed the aggregate limit. The shared budget must abort the scan, cancel remaining reads, and produce no partial trusted verdict. The numeric limit and permitted overhead must be stated before the test is run.

## 7. Carried implementation findings — source remains unchanged

The following code observations remain current because the source comparison found no post-d85a1e2 source changes:

| Finding | Current source evidence | Status |
|---|---|---|
| F-001 SSRF | Redirect target is followed without a destination guard (actions.ts:178–192); script URLs are fetched through the same helper (520–525). | OPEN / Critical |
| F-002 body cap | Entire response is read before slicing (actions.ts:194). | OPEN / High |
| F-003 deadline | Total deadline is present, but staging regression evidence is absent. | PARTIAL / OPEN |
| F-004 catalog race | No database-level unique constraint or atomic duplicate guarantee was added. | OPEN / Medium |
| F-005 authorization | Runtime endpoint scope and owner enforcement remain unverified. | OPEN / Medium |
| F-016 cache freshness | URL-keyed fetch cache remains in source (actions.ts:152); failed results are cached as null after retries (166). | OPEN |
| F-017 cache key | Current lookup is keyed by URL, not cap/policy; preferred design now removes the scan cache instead. | NOT APPLICABLE only after that branch is implemented; current source remains unchanged |
| F-018 tenancy | SDK declarations do not establish database scope; ownership isolation remains unverified. | NOT VERIFIED |
| F-019 scanner disabled | Raw action list still includes checklink; no disabled dispatch/UI/egress proof. | BLOCKED / NOT VERIFIED |
| F-006b privacy residue | Residual locations remain at actions.ts:52, 483, 1245. | OPEN / Medium |
| F-006c live DATA-PLAN | No independently auditable live version/diff/hash package. | NOT VERIFIED |

The presence of a 30-second deadline and parallel script fetching does not close SSRF or resource-exhaustion findings.

## 8. Evidence and test reconciliation

### 8.1 SU-T1..SU-T9 and the original 9/9 × 4 claim

No new SU tests were run.

The original v2.3.6 bundle remains corrected as follows:
- su-run1, su-run2, and su-run3 are byte-identical and labeled RUN=1.
- su-run4 is only a two-line tail.
- The original bundle therefore does not prove four independent complete runs.

The v2.3.9 supplement contains four complete, consistently labeled VM runs. It remains supplementary VM evidence; it does not reconstruct the original bundle and is not staging evidence.

### 8.2 ST-01..ST-16 and STAGE-P01..P12

The v2.3.12 matrix reports ST-01..ST-16 and the historical STAGE-P01..P12 aliases as BLOCKED. No staging tests were run. The new ST-12-LAT-01..03 criteria are design-only:
- alert delivery within five minutes;
- required timestamp, lock path, and process identity in the alert;
- missing alert channel means NOT RUN, not PASS.

The alert channel remains UNASSIGNED, so these criteria cannot currently be tested.

### 8.3 U-38-A..D and U-33-A..F

The v2.3.12 risk register preserves the prior statuses:
- U-38-A: answered in VM evidence only; U-41 residual remains.
- U-38-B: partial; namespace and PID identity staging proof remains.
- U-38-C: open; Bun FFI/syscall behavior in the artifact sandbox is not established.
- U-38-D: partial; FFI ABI/symbol/errno implementation and staging proof remain.
- U-33-A: partial; privileged unlink/replacement residual remains.
- U-33-B: partial; U-45 detection-latency residual remains.
- U-33-C: open; non-cooperative processes can ignore advisory flock absent an enforcement design.
- U-33-D: open; filesystem/flock/NFS semantics remain unverified on the target environment.
- U-33-E: partial; privileged operator/runbook residual remains.
- U-33-F: open; actual supervisor/process-group lifecycle is not established.

U-41, U-43, U-44, and U-45 remain open residuals. U-46 remains an owner decision and is not resolved by this audit. No VM result is promoted to staging or production.

### 8.4 Build, test suite, and CI

The current site/package.json declares Bun 1.3.10 and contains typecheck/build scripts but no test script. The SDK remains an absolute builder-local dependency in package.json and bun.lock. The previously reported VM install/typecheck used Bun 1.4.4, not the declared 1.3.10. No clean external builder result or CI run evidence was found.

No build, typecheck, or test command was run in this audit. No workflow was triggered.

## 9. Staging blockers and next safe work

| Blocker | Owner/role | Verified state | Next safe action |
|---|---|---|---|
| Runtime artifact identity and scanner-disabled proof | Artifact operator / provider | checklink remains listed; artifact version/digest and disabled controls are not exposed | Provide a read-only versioned artifact inspection path and evidence for dispatch, UI gate, invocation denial, and egress. Do not invoke checkLink. |
| Staging environment/operator | Platform/provider + project operations | UNASSIGNED / BLOCKED | Name the operator and publish runtime, Bun, kernel, filesystem, DB, namespace, supervisor, and rollback inventory. |
| Egress policy and alert channel | Platform/provider + staging operator | UNASSIGNED / BLOCKED | Specify DNS/IP egress restrictions, deny logs, named alert channel, owner, and a non-production delivery test plan. |
| Clean external SDK/build provenance | Muse + runtime provider | Local absolute SDK path; provenance NOT VERIFIED | Provide a retrievable package/source or signed artifact and reproduce frozen install/typecheck using canonical Bun 1.3.10. |
| Tenancy semantics | Runtime provider + Muse | SDK declarations available; database scope NOT VERIFIED | Obtain an official provider statement for ctx.db scope and stable principal semantics. |
| F-001..F-005 implementation | Muse design owner; source changes on HOLD | No approved implementation | Continue design and test-oracle correction only; do not edit source until separate owner authorization. |
| H-RES-02/03/05 oracle defects | Muse | New test-oracle gaps identified in V6 | Correct the fixture, byte layers, and numeric aggregate budget before any harness execution. |
| Privacy residue | Muse / artifact operator | F-006b OPEN; F-006c NOT VERIFIED | Provide safe location/version evidence; do not copy sensitive narrative into reports. |
| U-46 fallback decision | Project decision owner | OPEN | Preserve both alternatives and trade-offs; do not select or implement one on the owner's behalf. |

Staging validation must not begin until the environment is isolated, a named operator and rollback owner exist, the test DB is separate, egress controls and alerting are available, artifact identity is known, and the test plan is approved. The validation sequence remains runtime/Bun/kernel, filesystem and locks, supervisor/process lifecycle, permissions and namespaces, DNS/IP pinning and streamed limits, tenancy, alerting, backup/restore, and rollback.

## 10. Muse Handoff / Required Response

This report is the repository handoff. The project owner is not a courier. No source-code or deployment work is authorized by these requests.

1. **Correct H-RES-02.** Remove the impossible UTF-16-units-before-UTF-8-bytes fixture direction. Supply exact feasible fixtures with code points, UTF-8 byte counts, UTF-16 code-unit counts, marker offsets, and expected results. Acceptance: a reviewer can calculate the fixture lengths and see that the byte-cap oracle rejects content beyond the configured raw-byte boundary while a string.length-based implementation would not.

2. **Define compressed and decompressed byte accounting for H-RES-03.** State whether Bun Response.body exposes compressed or transparently decompressed bytes in the selected runtime. Define the decoded-body cap and any separate wire-byte cap. Acceptance: compressed expansion tests prove the decoded-body limit aborts before memory exceeds the stated budget; any claimed wire-byte limit is measured at a layer that can observe wire bytes. Do not use Content-Length as the sole oracle.

3. **Set a numeric aggregate per-scan budget for H-RES-05.** State the maximum script count, per-request caps, aggregate cap, overhead, redirect-body policy, and cancellation behavior. Acceptance: a concurrency test with individually under-cap responses but aggregate over-cap consumption aborts the scan and cancels remaining streams. No partial trusted verdict may be returned.

4. **Clarify G-F ownership semantics.** The matrix says the preferred cache-removal branch is the current design direction while G-F still requires an owner choice between branches. State explicitly that the preferred branch is a recommendation awaiting owner acceptance, not owner authorization. Acceptance: no source change occurs until a separate written approval exists; F-017/H-CACHE-05/06 are marked not applicable only for the implemented scan-cache-removal branch, not before implementation.

5. **Preserve the source-change HOLD.** Do not change .ts/.tsx files, schema, migrations, client, build output, deployment configuration, or live artifact without a separate written scope decision and implementation authorization. Do not revert d85a1e2 through this audit.

6. **Keep F-019 blocked until runtime controls are evidenced.** Provide artifact version/digest and read-only evidence for dispatch denial or pre-handler rejection, UI feature gating, public invocation denial, and egress observations. The published action list currently includes checklink. Do not invoke it, do not create a public share, and do not alter runtime state.

7. **Keep F-001..F-005 mapped to implementation and staging tests.** Preserve URL validation at initial input, every redirect, and every script URL; DNS/IP policy and connection pinning; streamed decoded-byte limits; total deadline; atomic database uniqueness; and action authorization. Provide exact test IDs and raw staging outputs only after implementation authorization and staging prerequisites are satisfied.

8. **Resolve F-018 and F-009/F-014 evidence gaps.** Obtain an official provider statement on ctx.db scope and a retrievable SDK provenance path. Reproduce frozen install/typecheck in a clean external builder using Bun 1.3.10, or submit a separate explicit decision to change the canonical version. Acceptance: no local absolute dependency path is required by the clean builder, and the runtime/version is recorded with raw output.

9. **Keep staging owners and operational gates explicit.** Name the staging operator, alert channel, egress-policy owner, DB/runtime owner, and rollback owner. Acceptance: ST-01..ST-16 are not marked READY while any required role or environment component is UNASSIGNED. Add the ST-12 five-minute alert test only after a real channel and owner exist.

10. **Preserve evidence provenance and the historical test correction.** Keep the original SU bundle correction visible. Keep supplement VM logs distinct from staging. Acceptance: every future test record includes exact commit, artifact digest, environment, runtime, operator, timestamp, test ID, raw output, and PASS/FAIL/NOT RUN. Never convert missing evidence to PASS.

11. **Carry forward F-006b/F-006c and U-38/U-33/U-45/U-46.** Do not reproduce sensitive incident narrative or wallet details. Acceptance: residual privacy locations are either addressed under separate approval or remain OPEN; live redaction is not closed without independently reviewable version/diff/hash evidence; risk-register statuses change only when their specified evidence or owner decision exists.

## 11. Stage decision

| Stage | Status | Decision |
|---|---|---|
| 1. Reconcile v2.3.6/v2.3.7 evidence | PARTIALLY COMPLETE | Original SU bundle correction is established; supplement provides better-labeled VM evidence only. Staging gates remain open. |
| 2. Audit code artifacts and security gaps | OPEN | No new application code arrived. Source findings F-001..F-005 and F-016..F-020 remain open or unverified. New design/test-oracle findings F-023..F-025 are added. |
| 3. Identify staging gaps and owners | PARTIALLY COMPLETE | Gaps and required roles are specific, but staging operator, alert channel, egress policy, DB/runtime, and rollback owner remain UNASSIGNED/BLOCKED. |
| 4. Controlled staging validation | NOT STARTED | No staging environment, no required operator assignments, and no implementation authorization. |
| 5. Evaluate staging and release gates | NOT STARTED | No staging results; no release decision. |

**Final decision: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**  
**Link Scanner must remain disabled. Public tester and production deployment remain on hold.**

No application code, database/catalog, build output, deployment configuration, or live artifact was changed. No untrusted code was executed. No production or destructive test was run.