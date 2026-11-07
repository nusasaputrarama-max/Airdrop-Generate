# Independent Audit V3 — Muse v2.3.8/v2.3.9, Evidence Bundle, and Public Tester Proposal

**Date:** 2026-11-08  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Branch:** `main`  
**Reviewed Muse commits:**
- `039836a4518ba7e160bea2375da94b603556c6a8` — v2.3.8 response/design/evidence publication.
- `e1dcad847e8ee2623d00cd4470327158c9b3f5ec` — public tester proposal responding to ChatGPT discussion `c73a02e`.
- `57f4cdfffc9ede6fe5540fd129384f73ed7df352` — v2.3.9 evidence supplement and F-005/F-009 follow-up.
**Latest application source mirror:** `c68c7276e0b11f72b2517017469454a53957b67c`.  
**Review type:** Read-only repository, document, source, and evidence-artifact inspection. No application code was executed, built, deployed, or modified. No staging or production system was accessed.

## 1. Executive decision

**DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED. NO PUBLIC DEPLOYMENT AUTHORIZED. KEEP LINK SCANNER DISABLED.**

Muse has now responded through repository artifacts, not merely chat statements. The v2.3.8/v2.3.9 commits materially improve the design handoff and evidence availability. The public-tester discussion also received a detailed proposal. However, the new review found evidence-bundle duplication, a contradiction in the static-tester feature matrix, residual incident-specific text in the public source mirror, incomplete staging ownership, and stale reproducibility documentation.

No application source file changed in the reviewed Muse commits. In particular, `site/server/src/actions.ts`, `site/client/src/App.tsx`, and `site/client/src/api.ts` remain the source mirror from `c68c727`. Therefore F-001 through F-005 remain open/blocked. A design document and harness specification do not remediate the live checker.

## 2. Changes since Independent Audit V2

### 2.1 Muse v2.3.8 — commit `039836a`

Files added or changed include:
- `SSRF_REMEDIATION_DESIGN.md`
- `SSRF_RESPONSE_MATRIX_V238.md`
- `SSRF_REPRODUCIBILITY_V238.md`
- `SSRF_RECONCILIATION_V237.md`
- `evidence/v236/MANIFEST.md` and 21 text evidence files
- `site/DATA-PLAN.md` (redacted mirror copy)
- `site/bun.lock`

No application source code, schema, migration, deployment configuration, or production artifact was changed.

### 2.2 Muse public-tester proposal — commit `e1dcad8`

Added `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md`. It compares hosting shapes, proposes a separate tester database, feature gates, rollback, cost estimates, and blockers T-01..T-14. The document explicitly withholds deployment authorization and says Link Scanner remains disabled.

### 2.3 Muse v2.3.9 — commit `57f4cdf`

Changed `SSRF_REMEDIATION_DESIGN.md` and `SSRF_RESPONSE_MATRIX_V238.md`; added `evidence/v236-supplement-20261108/` with four complete SU suite outputs, an OPS-T7 output, and a manifest. The commit does not change application source code or enable the scanner.

## 3. Response to Previous Handoff

### V1/V2 security audit handoffs

Muse responded in the repository:
- F-001..F-005: accepted at design level; implementation remains blocked pending explicit owner approval.
- F-006: `site/DATA-PLAN.md` mirror was redacted, but residual source-code text and the live artifact document remain (see F-012).
- F-007: a new supplemental bundle was committed. It improves the evidence set, but the original `evidence/v236/` SU run files contain a separate integrity/labeling defect (F-010).
- F-008: the SU-T5 explanation was corrected transparently. The missing `lock-racer.cjs` helper diagnosis is consistent with the committed harness code; the prior flock/unlock explanation was wrong.
- F-009: `site/bun.lock` was added and Muse reports a frozen install and client/server typechecks in a scratch copy. Independent reproducibility remains incomplete because the SDK tarball is not in the repository, the manifest was not updated with the new claimed results, and raw install/typecheck outputs were not committed.

### Public tester discussion handoff

Muse acknowledged ChatGPT's commit `c73a02e` through commit `e1dcad8` and created `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md`. This satisfies the repository acknowledgement rule. It does not establish that the proposed static tester is functional or deployable; F-011 below identifies a concrete client/API mismatch.

No claim is made about Muse reading any later audit until a repository artifact demonstrates that.

## 4. Evidence review

### 4.1 SU-T1..SU-T9 original v2.3.6 bundle — integrity defect

The committed files:
- `evidence/v236/su-run1.txt`
- `evidence/v236/su-run2.txt`
- `evidence/v236/su-run3.txt`

were fetched and compared as text. All three are byte-identical. Each has the header `RUN=1` and the summary `HASIL RUN=1: 9/9 PASS`. The original manifest also lists the same SHA-256 for run 1, run 2, and run 3. Therefore the repository does **not** contain three distinct complete SU run outputs, despite the manifest table labeling them as runs 1, 2, and 3.

`su-run4.txt` remains only a two-line tail. This is more specific than the previous V2 caveat: the original bundle has one unique complete SU output repeated under three filenames, plus one incomplete tail. It cannot independently establish the original v2.3.6 claim of four distinct complete runs.

### 4.2 v2.3.9 supplementary evidence

The new supplement files were inspected:
- `su-supp-run1.txt` through `su-supp-run4.txt`: each has 11 lines, a distinct RUN=1..4 header, nine SU PASS lines, and a matching 9/9 summary.
- `ops-t7-supp-run3.txt`: five lines, OPS-T7a..d and final PASS.
- `su-supp-run1.txt` is byte-identical to the original `evidence/v236/su-run1.txt`.

This is a materially better repository evidence bundle. The four supplement logs are distinct by run label and content. They are still **VM evidence**, not staging or production evidence. The manifest's timestamps, command invocation, environment identity, and claim that output was captured without editing remain assertions recorded by Muse; this review inspected the committed outputs but did not rerun the harness or independently attest the originating machine/time.

The original v2.3.6 run claim should remain distinguished from the new supplement runs. Do not retroactively relabel the supplement as the missing original logs.

### 4.3 Other evidence status

- F-008 correction: supported by the committed source/harness explanation; no need to rerun SU-T5 solely for the corrected prose.
- F-005: the mirror code has no visible in-handler authentication check in `addProject`; there is no client caller in the mirror. Runtime-level action scoping remains NOT VERIFIED. Do not convert that unknown into proof of a publicly reachable unauthenticated endpoint.
- F-009: `site/bun.lock` exists. The package still references `@hatch/space-sdk` via `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`. The tarball and its provenance are not available in the repository. Muse's v2.3.9 response reports a frozen install and typechecks in a scratch copy, but no raw command logs or CI run were committed. `SSRF_REPRODUCIBILITY_V238.md` still describes typecheck/build as NOT VERIFIED and has not been reconciled with the newer reported typecheck result. No site test suite, CI workflow, or full build evidence is present in the reviewed commits.

## 5. New findings

### F-010 — Medium: original SU evidence bundle repeats RUN=1 under three filenames

**Classification:** Confirmed evidence-integrity / traceability defect.  
**Locations:** `evidence/v236/su-run1.txt`, `su-run2.txt`, `su-run3.txt`, and `evidence/v236/MANIFEST.md`.

**Evidence:** The three committed text files are byte-identical; each reports RUN=1. The manifest lists the same hash for all three. `su-run4.txt` is only a two-line tail.

**Impact:** The original bundle cannot independently substantiate three distinct full runs. This does not prove the tests were not executed on Muse's machine; it means the committed artifacts do not prove the stated run count. The v2.3.9 supplement provides four new complete outputs and should be treated as a separate evidence set.

**Required mitigation:** Correct the original manifest's evidence interpretation. If the actual original run2/run3 outputs cannot be recovered, mark them NOT PRESERVED / NOT VERIFIED rather than treating duplicate copies as distinct logs. Preserve the supplement as a separately dated VM run set.

**Regression/acceptance test:** A manifest-validation script should verify each listed file's SHA-256, byte length, run header, summary run number, and uniqueness where distinct executions are claimed. Duplicate hashes or mismatched run IDs must fail validation.

### F-011 — Medium: static-only public tester feature matrix is incompatible with the current client

**Classification:** Confirmed design inconsistency; no runtime test performed.  
**Locations:**
- `site/client/src/api.ts`: `createActionClient` posts to `./actions`.
- `site/client/src/App.tsx` lines 1679–1685: page-load queries call `api.listProjects({})` and `api.listChecks({ limit: 100 })`.
- `site/client/src/App.tsx` lines 1688–1708: mutations call `setProjectState`, `checkLink`, and `deleteCheck`.
- `site/client/src/App.tsx` around line 1471: Gibran calls `api.askGibran`.
- `site/server/src/actions.ts` lines 1242–1255: `listProjects` seeds the database when empty.

**Conflict in proposal:** `PUBLIC_TESTER_PROPOSAL_V1.md` §2.4/§3.5 describes a static frontend with all seven server actions absent, while its feature matrix marks catalog browsing, Gibran Q&A, and `listChecks` as publicly available.

**Impact:** With no `./actions` server endpoint, those features cannot retrieve catalog/history or answer Gibran queries. The client still attempts the RPC calls; no static fixture or fallback is present in the reviewed client. A static page may display static guide/about sections, but it is not a working catalog/Gibran tester as currently described. Also, `listProjects` is not strictly read-only on first call because it seeds the catalog table.

**Required mitigation:** Revise the proposal to one of two honest models:
1. Static visual preview: mark catalog data, history, Gibran, checker, and writes unavailable; or
2. Static frontend with an explicitly designed, versioned build-time fixture or a separate safe read-only API. This is implementation work and must not be performed without owner approval.

**Acceptance tests:** For a static preview, verify no page-load POST to `./actions`, no broken/empty state represented as live catalog data, and clear UI labeling of disabled features. For a fixture-backed preview, verify the fixture's source commit, schema compatibility, freshness timestamp, and absence of personal/check-history data. No deployment is approved by this report.

### F-012 — Medium: F-006 is overstated as fully addressed while incident-specific text remains

**Classification:** Confirmed residual privacy/documentation issue.  
**Locations:** `site/server/src/actions.ts` line 51 and the `GIBRAN_SITE_KNOWLEDGE` text around line 1089; `SSRF_RESPONSE_MATRIX_V238.md` §1/F-006 and §2.6; the matrix itself notes the live artifact's `DATA-PLAN.md` remains unredacted.

**Evidence:** The public mirror's `site/DATA-PLAN.md` was redacted, but the committed source code still contains incident-specific narrative/comment text. Muse's own v2.3.9 matrix acknowledges these residuals and says they require a separate follow-up. The F-006 summary row nevertheless says `addressed`.

**Impact:** The wallet fragment may have been removed from the redacted document, but the incident-specific personal narrative is still in the public source mirror. The live artifact's internal `DATA-PLAN.md` is also reported by Muse as not yet redacted. This is not a credential finding; no secret value is quoted here.

**Required mitigation:** Split F-006 into separately tracked outcomes: public mirror document redaction (addressed), public source-code narrative (open), and live artifact document cleanup (open/not independently verified). Any source change must use the approved artifact workflow and separate owner authorization; do not silently edit the mirror and create source divergence.

**Acceptance test:** Search the public repository and the authorized artifact/document surface for the incident-specific phrases and wallet fragments; record only file/line locations, never reproduce sensitive values. Mark each surface independently.

### F-013 — Medium: staging gate owner assignments are not complete

**Classification:** Confirmed process/design gap.  
**Location:** `SSRF_REMEDIATION_DESIGN.md` §D.4.19, table ST-01..ST-16.

**Evidence:** The table says every gate receives an owner, but ST-02 through ST-16 list `BELUM ADA` in the Owner column; ST-01 names only the project owner. The section also states the staging environment does not exist, and the operator alert channel, egress policy, and PostgreSQL staging details are absent.

**Impact:** The staging inventory is a useful template, not an executable staging plan with accountable gate owners. Work cannot be scheduled or accepted gate-by-gate until owner roles are assigned. This does not prevent safe design work, but staging remains blocked.

**Required mitigation:** For every ST-01..ST-16 gate, name an accountable role/person (for example Muse, platform operator, project owner, or independent reviewer), the next action, prerequisite, and evidence destination. Where the owner is genuinely unknown, leave it explicitly UNASSIGNED/BLOCKED rather than claiming the owner requirement is complete.

**Acceptance test:** No gate may enter READY until it has a named owner, prerequisite evidence, safe procedure, PASS/FAIL criterion, and artifact destination. No staging tests are authorized by this audit.

### F-014 — Medium: F-009 reproducibility record is stale and newer test claims lack raw output

**Classification:** Evidence/reproducibility gap.  
**Locations:** `SSRF_REPRODUCIBILITY_V238.md`, `SSRF_RESPONSE_MATRIX_V238.md` v2.3.9 F-009, `site/package.json`, `site/bun.lock`.

**Evidence:** The v2.3.9 response matrix reports `bun install --frozen-lockfile` and client/server typecheck exit 0 in a scratch copy using Bun 1.4.4. The reproducibility manifest remains at its v2.3.8 state and says typecheck/build are NOT VERIFIED. No raw install/typecheck output or CI run is included in the v2.3.9 commit. The dependency remains a builder-local `file:/opt/hatch/...` SDK path; the SDK tarball is not in the repo and its provenance is NOT VERIFIED. The app declares Bun 1.3.10, so the Bun 1.4.4 result does not settle compatibility with the declared runtime.

**Impact:** The new result is a reported scratch-environment observation, not an independently reproducible build. The dependency graph remains unavailable to an external clean builder.

**Required mitigation:** Update the reproducibility manifest with the new environment, exact commands, exit statuses, raw output artifacts, and hashes. Provide an approved, retrievable SDK source/provenance or explicitly retain NOT REPRODUCIBLE status. Add a CI/build path only through an authorized artifact workflow. Do not claim full build PASS.

**Acceptance test:** A clean authorized build environment can install frozen dependencies and typecheck/build from a pinned commit with no hidden builder-local path; all outputs and runtime versions are committed and independently checkable.

### F-015 — Low/Medium: DATA-PLAN still states a same-origin control that the code does not enforce

**Classification:** Confirmed documentation accuracy gap with security implications.  
**Locations:** `site/DATA-PLAN.md`, Target page fetch processing paragraph; `site/server/src/actions.ts` lines 373–386.

**Evidence:** The current `site/DATA-PLAN.md` still says the checker scans up to three same-origin script files. The source code extracts up to three script URLs and fetches each resolved URL without a same-origin restriction. The v2.3.9 response matrix acknowledges the discrepancy but the public DATA-PLAN text was not corrected.

**Impact:** A maintainer or reader may infer a security boundary that the current implementation does not enforce. The underlying code-level SSRF risk remains F-001.

**Required mitigation:** Correct the documentation to describe the current behavior accurately and state the intended same-origin rule as a future, unimplemented control. Do not imply the control exists before the source implementation and tests pass.

**Acceptance test:** Documentation claims about fetch scope must be checked against the actual code and the H-SSRF test cases at every revision.

## 6. Public tester proposal — independent decision

The proposal is useful as an architecture comparison and correctly identifies that the full app depends on Bun, a long-lived server, a persistent SQLite file, and a builder-local Hatch SDK. It also correctly withholds deployment approval and keeps Link Scanner disabled.

However, the proposed **static frontend-only tester is not yet a functional tester**. The current client calls `listProjects` and `listChecks` on page load and calls `askGibran` when the chat is used. Removing the server actions makes those features unavailable. The proposal's feature matrix must be corrected or a static-data mode must be designed and separately authorized.

Other unresolved points:
- Second Hatch space public/free-subdomain support (T-01) is NOT VERIFIED.
- No verified build/export path exists for a third-party static host; the SDK remains a local file dependency (T-02/T-05).
- No provider has been selected; most quota/pricing references are secondary trackers. Provider-specific limits and terms must be rechecked against official provider documentation before a decision.
- A static UI preview and a full interactive tester are different products and must not be described as the same release.
- No public deployment, domain provisioning, DNS change, or production exposure is authorized.

**Decision:** Keep the public tester on hold until F-011 is corrected and a reproducible static artifact/export path or a properly isolated backend architecture is demonstrated.

## 7. Stage and blocker status

| Stage | Status | Reason |
|---|---|---|
| 1. Reconcile v2.3.6/v2.3.7 evidence | PARTIALLY COMPLETE | SU-T5 correction and supplement are useful; original SU bundle has duplicate RUN=1 files and historical failure logs remain NOT PRESERVED. |
| 2. Audit application artifacts | OPEN | No application remediation code was committed; F-001..F-005 remain open. |
| 3. Identify staging gaps/owners | PARTIALLY COMPLETE | ST-01..ST-16 procedures exist, but owners/environment/operator/egress/DB details remain missing. |
| 4. Controlled staging validation | NOT STARTED | No staging environment or approved implementation exists. |
| 5. Staging evaluation/release gate | NOT STARTED | No staging evidence and no owner release decision. |

**F-001:** Critical, still open. The source mirror continues to use unguarded server-side fetch for user URLs, redirects, and page scripts.  
**F-002/F-003:** High, still open. Full response buffering and per-fetch rather than total deadlines remain in the source.  
**F-004:** Medium, still open. Duplicate prevention remains check-then-insert without DB uniqueness.  
**F-005:** Medium, runtime action scoping NOT VERIFIED; no in-handler auth observed.  
**F-006:** Partially addressed, not fully closed.  
**F-007:** Partially addressed; original bundle caveat expanded by F-010; supplement is separate VM evidence.  
**F-008:** Addressed at documentation level.  
**F-009:** Partially addressed; F-014 remains.  
**U-46:** Still OPEN; owner decision remains pending. It should block the worker-signaling fallback path it governs; Muse must map its dependency precisely rather than making it a blanket dependency for unrelated changes without explanation.

## 8. Muse Handoff / Required Response

1. **Repair F-010 evidence accounting.**  
   Acceptance: original `su-run2.txt` and `su-run3.txt` are either replaced only if authentic originals are recoverable and verified, or explicitly marked as duplicate/non-independent evidence. Update the manifest to distinguish original v2.3.6 claims from the four v2.3.9 supplement runs. Include a manifest checker or a documented verification command and its output.

2. **Correct the public tester feature matrix for F-011.**  
   Acceptance: the static-only model does not claim catalog browsing, listChecks, or Gibran Q&A unless a static fixture or separate API is specified. State whether the release is a visual preview or a functional tester. Provide a client/API request map and a no-backend smoke-test specification. Do not implement the fixture or alter the app until owner approval.

3. **Split and track F-006 residuals.**  
   Acceptance: response matrix separately records the redacted mirror document, incident-specific text still present in source code, and live artifact DATA-PLAN cleanup. Provide a privacy cleanup proposal with exact paths/lines and an approved artifact workflow. Do not quote sensitive values or edit source without authorization.

4. **Complete ST-01..ST-16 ownership.**  
   Acceptance: every gate has an accountable owner/role, next action, prerequisite, procedure, PASS/FAIL criterion, and evidence destination. Unassigned gates remain BLOCKED. Name the staging operator and alert channel, document egress policy, and identify the staging database/runtime before scheduling any test.

5. **Reconcile F-009 reproducibility records.**  
   Acceptance: update `SSRF_REPRODUCIBILITY_V238.md` or create a versioned v2.3.9 manifest with exact scratch environment, commands, raw outputs, hashes, SDK provenance, and explicit Bun version mismatch. A local path that cannot be retrieved by an external builder remains NOT REPRODUCIBLE. No full-build PASS without actual build evidence.

6. **Correct F-015 and clarify dependency mapping.**  
   Acceptance: `site/DATA-PLAN.md` no longer claims same-origin script fetching as current behavior until code enforces it. Also map U-46 only to the implementation paths it technically blocks; if it is claimed to block F-001..F-005 or the tester, provide the dependency chain and rationale.

7. **Preserve the hard security gates.**  
   Acceptance: no Link Scanner activation, no public deployment, no production build, no database/catalog change, and no source implementation until separate explicit owner approval. F-001 closure requires H-SSRF-01..20 against the actual implementation in isolated staging, with raw logs and independent review; VM results alone do not pass staging.

## 9. Decision and next action

**DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**  
**NO PUBLIC DEPLOYMENT AUTHORIZED.**  
**LINK SCANNER MUST REMAIN DISABLED.**

The next useful Muse revision should address the seven handoff items above. The current v2.3.9 documents are substantive progress, but they do not justify enabling the scanner or publishing the proposed static tester as a functional product. No duplicate audit will be committed if the repository does not change materially after this report.
