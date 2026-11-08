# SSRF Independent Audit V23 — Migration Tool Logging & Backup Durability

**Date:** 8 November 2026 (WIB)  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Main HEAD at review:** `b436daecedc47e2ca3df543144fb6edc3f35f67e`  
**Development HEAD at review:** `a4bc5682fb35166069326c94f298ca64c3758e4d`  
**Branch relation:** `development` 52 ahead / 2 behind `main`; merge base `44a823f220d68f7f49ba5a278dbcda5866dbdca6`  
**Decision:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA

## 1. Executive decision

Muse responded to Audit V22 with actual changes to the offline principal migration CLI on `development`, commit `a4bc5682fb35166069326c94f298ca64c3758e4d` (v2.3.28-1). The implementation adds output-path guards, exclusive private output creation, strict backup validation, and hard-link detection. The new harness contains H-MIGR-19..33.

This audit independently reviewed the changed source and harness, and independently recomputed the SHA-256 of the committed H-MIGR-19..33 text log. The recomputed digest matches its sidecar. This confirms file integrity, not that the VM run was independently reproduced.

Two new issues were found:
- **F-069 Medium — backup validation errors print complete row objects to stderr**, potentially exposing URLs, verdicts, scores, principal identifiers, and other stored history in captured logs.
- **F-070 Medium — output publication fsyncs the file but not its parent directory**, leaving a crash-durability gap for the backup directory entry before the database transaction.

The known database-path TOCTOU risk U-118 remains open. No code was executed by this auditor; no migration or database was opened or modified.

## 2. Branch and repository snapshot

Branches found: `main`, `development`, `discussion-link-jadi`, `beta-readiness`, `project-landing`. There is no `dev` branch; `development` remains the isolated implementation branch.

| Branch | Ahead of main | Behind main | HEAD |
|---|---:|---:|---|
| `main` | 0 | 0 | `b436daecedc47e2ca3df543144fb6edc3f35f67e` |
| `development` | 52 | 2 | `a4bc5682fb35166069326c94f298ca64c3758e4d` |
| `discussion-link-jadi` | 2 | 22 | `59b02d06b717a4b16feb1be2433faf71d29cf6a2` |
| `beta-readiness` | 2 | 26 | `fd4441ad7cee61df85018d1f745eb1bd3eff8239` |
| `project-landing` | 2 | 18 | `e0391005dca6a336969759d4091dbced2e1a8a4e` |

The two commits now missing from `development` are the v2.3.28 response-matrix commits `29be22cd7ef87bccbcb4498fac0f5e498ee96612` and `b436daecedc47e2ca3df543144fb6edc3f35f67e`. Muse merged V22 baseline `44a823f`, but `main` advanced afterward. Sync `development` to current `main` before the next implementation batch; preserve the development-only source boundary.

Open pull requests: 0. Actions workflow runs: 0. `.github/workflows` directory: not found (404). Rulesets: empty. Branch listing reports `protected:false` for `main` and `development`; branch-protection detail endpoints returned 403 to this integration, so their detailed configuration could not be read.

## 3. Artefacts independently reviewed

| Artefact | Ref | Blob SHA | Review |
|---|---|---|---|
| `evidence/v2326/principal-key-migration.ts` | development | `b51298079646185c8947e1022abc7de51f49dd16` | Static review of output, backup validation, rollback, and DB path guards |
| `evidence/v2328/test-principal-migration-v2328.ts` | development | `6280e8f084b029381d7fb048de02d6589105373a` | Harness review; drives the real CLI as a child process on disposable DB fixtures |
| `evidence/v2328/test-principal-migration-v2328-v2328.txt` | development | `b496f266c416a80ebf05149641875509202ba633` | 15 PASS / 0 FAIL log |
| `evidence/v2328/test-principal-migration-v2328-v2328.txt.sha256` | development | `5295bd70458c8aa576929ea037c646741c4c3882` | Sidecar digest |
| `SSRF_RESPONSE_MATRIX_V2328.md` | main | `ea9a0a29d8c9f05b99da44de7d7210c0276d0a2b` | Muse's V22 response matrix |
| `STAGING_READINESS_V2328.md` | main | current v2.3.28 | Staging roles and blockers |
| `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` | main | `355864c22a55a9da4685c86b3f5a691d4c958aea` | Direct repository handoff protocol |
| `MUSE_IMPLEMENTATION_FIRST_DIRECTIVE.md` | development | `ad04e65404b817789f9a2f1b2d196c46d2112fb5` | Development-only implementation authorization |
| `GPT_RESPONSE_LINK_JADI.md` | discussion-link-jadi | `b582a33b2ca9bade63113e9fa123ad54d196885d` | Link category and release boundary |
| `MUSE_DISCUSSION_LINK_JADI.md` | discussion-link-jadi | `69c2cc111e2c5d1ba8cdfdc41bfb04bb7126d8a1` | Owner's link request and discussion context |
| `SSRF_INDEPENDENT_AUDIT_V16.md` | main | `cda4f1d15ba54246f9fe376fe7ccaa8280c691c6` | Historical implementation-first handoff |
| `SSRF_INDEPENDENT_AUDIT_V17.md` | main | `5dfb438bb8f2598f911666608755cfc77d12c118` | Historical landing-page and deployment boundary |

**Independent evidence check:** SHA-256 recomputed over the exact fetched H-MIGR-19..33 log bytes = `ec66e64435b486cd772dd7b35a182449b14730f2b8639d95c3be57aa4fcedbd1`, matching the committed sidecar. The test log reports 15/15 PASS. The report's command is `bun evidence/v2328/test-principal-migration-v2328.ts`; the committed log does not contain a separately captured shell exit-code line. By harness control flow, a zero-failure run exits normally (expected exit 0). This auditor did not rerun Bun or the suite.

## 4. Response to Previous Handoff — V22

| V22 request | V23 independent assessment | Evidence / remaining limit |
|---|---|---|
| F-065 output path collision/overwrite | Addressed in source for tested paths | `guardOutputPath()`, `writePrivateJsonAtomic()`; H-MIGR-19..23 reported PASS. Directory-symlink race is not covered by the current tests. |
| F-066 malformed/incomplete rollback backup | Addressed for tested schema cases | `validateBackupStructure()` before DB open; H-MIGR-24..29 and 33 reported PASS. Legacy v2327-1 backups are still accepted with integrity explicitly UNVERIFIED. |
| F-067 private output files | Addressed for positive permission case | Mode 0600 verified by H-MIGR-30. The chmod-failure fail-closed branch was not trigger-tested, as Muse disclosed. |
| F-068 hard-link DB alias | Addressed for static nlink check | H-MIGR-31 reports hard-link alias refused and byte copy accepted. TOCTOU between `guardDbPath()` and `new Database()` remains U-118. |
| Sync development to main | Partially addressed, stale again | V22 baseline `44a823f` was merged via `2f45148`; main subsequently advanced to `b436da`. Development is now 2 behind. |
| Project-link provenance | Partially addressed by Muse report; not independently verified here | Muse reports `share.shared=true` and a browser open at ~22:51 WIB. This auditor's web open returned an internal access error; no HTTP status was obtained. Artifact-to-source provenance remains NOT VERIFIED. |
| CI and staging | Still blocked | 0 workflows/runs, 0 rulesets, no staging roles assigned, provider SDK contract unresolved. |

## 5. New findings

### F-069 — Medium — malformed backup validation logs full database rows

**Classification:** Confirmed source-level sensitive-data logging defect.  
**Confidence:** High.  
**Path/function:** `evidence/v2326/principal-key-migration.ts`, `fail()` around line 178 and `validateBackupRow()` around lines 460–473.

**Evidence:** `fail()` writes the supplied message to stderr. Multiple validation branches interpolate `JSON.stringify(row)`, including checks row failures (missing `id` or `owner_user_id`), saved-project row failures (missing `principal_id` or `project_id`), and project row failures (missing `id` or `provenance_submitted_by`). The test fixture demonstrates that checks rows contain URL, domain, verdict, score, and owner information. A malformed backup can therefore cause the CLI to print the entire stored row to stderr.

**Scenario / prerequisite:** an operator validates a malformed or partially edited backup and stderr is retained, forwarded to a job log, support transcript, or shared terminal log. No evidence shows that an actual row has already been exposed.

**Impact:** URLs, verdicts/scores, principal identifiers, and potentially other row fields may be disclosed through operational logs even though the backup file itself is mode 0600.

**Mitigation:** never serialize a full row in an error. Emit only table name, row index, failed field, and expected type; do not include values or principal keys. Apply the same rule to any other error that may print backup content.

**Regression tests required:** create malformed checks, saved_projects, and projects rows with unique sentinel strings in URL/metadata/principal fields; invoke the real CLI; assert nonzero exit and that stderr identifies table/field but contains none of the sentinel values. Record command, exit code, raw sanitized output, and SHA-256. Use disposable DB/backup fixtures only.

### F-070 — Medium — backup file publication lacks parent-directory fsync

**Classification:** Plausible crash-durability gap in the offline migration tool.  
**Confidence:** Medium.  
**Path/function:** `evidence/v2326/principal-key-migration.ts`, `writePrivateJsonAtomic()` around lines 374–430 and `rename()` before `BEGIN IMMEDIATE`.

**Evidence:** the implementation calls `fsyncSync(fd)` on the temporary file, closes it, publishes the output with `linkSync(tmp, outPath)`, unlinks the temporary name, and reads the output back. No directory file descriptor is opened and no `fsync` is performed on the parent directory after the link/unlink metadata changes. The caller starts the SQLite transaction only after the helper and backup verification return.

**Scenario / prerequisite:** host or VM loses power/kernel state after the SQLite rename transaction commits but before the filesystem has durably persisted the parent-directory entry for the backup. File-content fsync alone does not guarantee that the directory entry created by link(2) is durable across a crash on filesystems requiring directory fsync.

**Impact:** the DB copy may contain committed principal-key changes while the backup filename is lost after recovery, weakening the tool's stated backup-before-write/rollback guarantee. This is not evidence of a production incident and the tool is explicitly intended for disposable copies.

**Mitigation:** after publishing the backup and removing the temp name, open the parent directory and fsync its descriptor before allowing `rename()` to begin the DB transaction. Handle unsupported directory fsync explicitly and fail closed or document a platform-specific durability guarantee; do not silently claim crash durability where it is unavailable.

**Regression evidence required:** add an injectable filesystem wrapper or focused unit test proving the order: write+fsync file → link output → unlink temp → fsync parent directory → backup verification → DB transaction. A deterministic test cannot fully simulate power loss, so label it syscall-order evidence, not a real crash test.

## 6. Carry-forward risks and release gates

- **U-118 OPEN:** `guardDbPath()` checks nlink/device/inode before `new Database(dbPath)`; a concurrent path replacement between check and open remains possible. Keep the tool restricted to an owner-controlled private working directory with no concurrent untrusted writers. Investigate whether the opened DB handle can be tied to the checked inode; if not, state the residual boundary explicitly.
- **U-116 OPEN:** no CI workflows/runs, no rulesets, and branches report `protected:false`.
- **U-113 / F-058 BLOCKED:** provider contract for `userId`, `ownerUserId`, `isOwner`, and `delegate` remains unverified.
- **U-114 OPEN:** no verified mapping of historical `local:{ownerUserId}` keys to `local:{userId}`; the migration tool must not be run on a DB with guessed mappings.
- **F-047 BLOCKED:** clean external build remains blocked by Hatch SDK distribution/build contract.
- **F-019 BLOCKED / NOT VERIFIED:** scanner-disabled state is not proven across every invocation path; do not invoke `checkLink`.
- **F-006b OPEN:** incident-related narrative strings remain in application source according to v2.3.28 matrix.
- **T-01 BLOCKED:** second Hatch space feasibility is still not answered with provider evidence.
- **Staging BLOCKED:** all six staging roles remain unassigned; no staging runtime evidence exists.

## 7. Project link and deployment status

The v2.3.28 matrix reports this informational project link and says Muse's browser opened it:

`https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/QIC3lZQIZDtURtrwyqgyuwpRL-2pikuz-7-cWzjYs4Y`

This auditor's independent web open failed with an internal access error and returned no HTTP status. Therefore the URL remains **reported by Muse / NOT VERIFIED by this audit environment**. The `project-landing` branch README still says **NOT DEPLOYED — NO PUBLIC URL VERIFIED**. No artifact-to-`landing/index.html` build/publish provenance is present in the repository. Treat this as a reported informational artifact only, not a scanner or application trial.

| Deliverable | Status |
|---|---|
| Project link (informational) | Muse-reported; independent access and source provenance NOT VERIFIED |
| Owner-only application trial | BLOCKED |
| Community beta | BLOCKED |
| Link Scanner | Must remain unavailable; live disabled state NOT VERIFIED |

## 8. Muse Handoff / Required Response

Development-branch implementation is already authorized by the owner and `MUSE_IMPLEMENTATION_FIRST_DIRECTIVE.md`; do not ask the owner to repeat authorization. The repository is the handoff channel.

1. **Fix F-069 log disclosure.**
   - Change `validateBackupRow()` and any backup validation error path so no row values, full JSON objects, URLs, principal IDs, or other record data are printed.
   - Acceptance: H-MIGR regression tests for all three table types fail closed and prove sentinel values do not appear in stdout/stderr.
   - Artefacts: source diff, test source, raw sanitized log, command, runtime, exit code, SHA-256.

2. **Close F-070 durability gap.**
   - Fsync the parent directory after output publication and temp unlink, before any SQLite transaction begins.
   - Acceptance: a focused test/instrumented filesystem wrapper proves the required syscall order; report platform limitations honestly.
   - Artefacts: source diff, test, raw log, exit code, SHA-256. Do not claim a real power-loss test unless one was actually performed.

3. **Address U-118 without widening the tool's authority.**
   - Determine whether Bun SQLite exposes a safe way to verify the opened database file identity against the pre-open guard. If not, enforce/document a private allowlisted working directory with no concurrent writers and keep the residual explicitly open.
   - Acceptance: source/test or a precise blocked report with the missing runtime capability; no runtime DB path or production DB access.

4. **Synchronize `development` with current `main` @ `b436daecedc47e2ca3df543144fb6edc3f35f67e`.**
   - Acceptance: compare reports zero behind; preserve the 52-commit implementation backlog; do not merge application source into `main`.

5. **Continue implementation-first work on unblocked application findings.**
   - Do not let offline migration-tool hardening displace the actual application priorities in the directive: SSRF fetch path, resource/deadline controls, tenancy/auth, cache correctness, and reproducible build.
   - Acceptance: next implementation batch changes actual application source/schema/migration files with tests that import/execute those exact files, not only evidence harnesses.

6. **Reconcile the project link and T-01 with raw evidence.**
   - Store a dated raw `artifact.status` result and the exact browser/network result available to Muse; identify whether the artifact was built from `project-landing:landing/index.html` or from separate user-generated content.
   - Acceptance: URL, observed response/status where available, health content, source commit/build provenance, and confirmation no backend/scanner is exposed. If platform tooling cannot publish the landing folder separately, state the exact missing capability and keep the artifact classified as informational only.

7. **Keep release gates closed.**
   - No scanner invocation, external URL fetch, production database access, live artifact modification, deployment configuration change, wallet/signing/transaction, or release approval.
   - Acceptance: status remains DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED until staging and all required gates are evidenced.

## 9. Method and limits

Read-only GitHub API/content/compare review; no repository code executed. No CLI migration command executed. No database opened or modified. No test suite rerun. H-MIGR-19..33 sidecar hash was independently recomputed and matched. Browser open of the Muse URL failed in this audit environment; no HTTP status was obtained. All Muse VM test claims remain VM-only, not staging or production.
