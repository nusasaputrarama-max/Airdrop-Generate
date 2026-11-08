# MUSE DIRECTIVE V14 — ACTION REQUIRED, NO STATUS-ONLY RESPONSE

**Issued:** 8 November 2026  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Branch:** `main`  
**Baseline Muse:** v2.3.20, commit `b543eca09655c1af523d3d44e228d6d1bc5b241b`  
**Audit requiring response:** `SSRF_INDEPENDENT_AUDIT_V14.md`, audit commit `f74f0bd6c89a4232c88545a57f4096c563329073`  
**Authority boundary:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.

---

## 0. Read this first. This is an execution directive, not an invitation to write another progress summary.

Muse: read this entire directive, `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md`, and `SSRF_INDEPENDENT_AUDIT_V14.md` before doing anything else.

The next response must materially resolve the open items below. Do not produce another broad status document, another changelog-only release, or a polished proposal that leaves the identified defects intact. Do not mark an item addressed because you added explanatory prose. Make the smallest technically correct changes to the **design/proposal and isolated test harness only**, then prove them with reproducible tests and raw logs.

**Do not modify application source, database/schema, actual migration files, package manifests/lockfiles, CI workflows, deployment configuration, staging/production runtime, catalog, or live artifacts.** No implementation authorization has been granted. Do not invoke `checkLink`; do not enable Link Scanner; do not run production or destructive tests.

If a required fact depends on provider/runtime behavior and cannot be verified, say **BLOCKED**, identify the exact evidence owner and requested artifact, and continue with the other tasks. Do not invent a provider answer, owner, environment, test result, or approval.

## 1. Required order of work

### P0 — F-044: Fix the SQLite migration design

The v2.3.20 proposal uses:

```sql
ALTER TABLE projects ADD COLUMN contract_address_canonical TEXT
  GENERATED ALWAYS AS (...) STORED;
```

This is not a valid SQLite ALTER TABLE ADD COLUMN strategy for a STORED generated column. Do not repeat this DDL.

Deliver:
1. A corrected migration design compatible with the **actual SQLite version used by the target runtime**. If that version is unknown, identify it as a hard prerequisite and do not pretend compatibility is established.
2. Choose one concrete approach:
   - rebuild `projects` using create/copy/validate/swap to add a STORED generated column; or
   - use a VIRTUAL generated column only after proving generated-column/index/Drizzle/runtime compatibility; or
   - use an ordinary canonical column only with a transactionally enforced single source of truth and explicit repair/integrity controls.
3. Specify exact SQL/order, transaction boundaries, foreign-key handling, preservation/recreation of indexes/triggers, row-count checks, rollback, backup/restore, and failure recovery. “Drizzle handles rebuild” is not an implementation plan.
4. Test the corrected DDL against a disposable copy of the **current schema**, not a hand-written approximation. Preserve the original database untouched.
5. Inject failure at each migration phase and prove atomic rollback or a documented recoverable state. Test down migration on a separate disposable copy.

Acceptance:
- Migration succeeds on the exact supported SQLite version.
- All existing project rows, values, IDs, references, indexes, and triggers are preserved as specified.
- Failure injection does not silently lose or partially rewrite catalog data.
- Raw logs, exact commands, SQLite version, runtime version, exit codes, and SHA-256 hashes are committed.
- If target SQLite version cannot be established, F-044 remains BLOCKED and the proposal must explicitly say so.

### P0 — F-045: Make unknown chain values impossible at the database boundary

v2.3.20 claims a fail-closed DB CHECK constraint but does not actually provide the constraint SQL. A comment or application-side validation is not a database constraint.

Deliver:
1. Exact DDL implementing the allowlist of supported chains, integrated with the corrected F-044 migration strategy.
2. Ensure both INSERT and UPDATE reject unknown chain values at the database layer.
3. Ensure canonicalization behavior is correct for EVM vs Solana and that unknown chains cannot become NULL canonical values and bypass the unique index.
4. Include direct SQL negative tests, not only calls through application helper functions.
5. Inspect the post-migration schema to prove the constraint exists.

Acceptance:
- Direct SQL INSERT and UPDATE with an unknown chain fail.
- Every explicitly supported chain passes.
- EVM case/prefix/whitespace duplicates are rejected according to the agreed canonical form.
- Distinct valid Solana base58 addresses that differ by case remain distinct.
- The tests execute the actual proposed migration artifact; they do not copy/paste a second “test-only” version of the SQL.

### P0 — F-046: Stop treating NULL ownership as public by default

v2.3.20 proposes that every legacy `checks.owner_user_id IS NULL` row is visible to every principal. This is not an acceptable default for an unverified shared runtime.

Deliver:
1. State plainly whether database/action scope is verified single-user or may be multi-user. Cite provider documentation or a provider response. If unavailable, mark it **NOT VERIFIED**.
2. Replace the default `owner_user_id = principal OR owner_user_id IS NULL` policy with a fail-closed policy for multi-user deployments.
3. Define a safe legacy-data policy. Options may include a non-login legacy principal isolated from ordinary users, explicit owner mapping supported by evidence, or a confirmed single-user deployment with a documented migration path. Do not guess owners or expose legacy rows to all users.
4. Apply the same policy consistently to `listChecks`, `deleteCheck`, `askGibran`, and any other read/write path.
5. Provide two-principal tests against the same database, including attempts to enumerate and delete another principal's history.

Acceptance:
- Principal B cannot read, infer, or delete principal A's history.
- Unknown-owner legacy rows are not visible to ordinary users in a multi-user configuration.
- No test may claim provider isolation unless it uses provider-backed evidence.
- If provider scope is unavailable, clearly mark runtime acceptance BLOCKED; still provide the safe fail-closed design.

## 2. Required technical quality bar

For each of F-044, F-045, and F-046, provide:
- exact affected proposal section and replacement text/diff;
- assumptions and which ones are verified vs unverified;
- threat/failure scenario;
- implementation-independent test harness source;
- positive and negative test cases;
- raw stdout/stderr, command, exit code, timestamp, runtime/database versions, UID, and SHA-256;
- residual risks and evidence still required from provider/staging;
- a concise acceptance table mapping each requirement to a test/log/path.

Do not hide failed attempts. Preserve each failed run and each corrected rerun as separate files. Never overwrite the failed log with a successful rerun. A green exit code with unhandled rejection, skipped assertions, or an invalid fixture is not a pass.

Do not rerun unrelated old tests without a material reason. The work in this directive is limited to the defects above and the tests necessary to validate them.

## 3. Required response format in the next Muse commit

Create one coherent revision, not scattered partial replies. Include:
1. `Response to V14 Handoff` — table with F-044/F-045/F-046, status, exact evidence, and remaining gaps.
2. `Decision Log` — each design choice, alternatives rejected, reason, and owner decision still needed.
3. `Changed Files` — exact path and purpose for every changed file.
4. `Test Evidence` — test ID, exact command, runtime/database version, timestamp, UID, exit code, log path, SHA-256.
5. `Unresolved Blockers` — owner needed, evidence requested, attempts, outcomes, next action.
6. `No Implementation Confirmation` — explicitly confirm no app source, migration, DB, deployment, CI, or live artifact was changed.

Commit the corrected proposal and isolated harness/evidence under clearly versioned filenames. Do not overwrite v2.3.20 historical files. Use one commit whose message identifies the actual technical work, not just “docs update”.

## 4. Stop conditions

Stop and report BLOCKED only for the specific item whose required external evidence is unavailable. Do not stop the other independent tasks.

Do not:
- call F-044/F-045/F-046 fixed merely because pseudodiff changed;
- call a SQLite in-memory mirror test proof that a migration file works unless the actual migration file is executed;
- treat VM tests as staging or production evidence;
- mark F-001..F-005 closed;
- imply that the Link Scanner is disabled unless the runtime controls and all invocation paths are verified;
- interpret this directive as approval to implement or deploy.

## 5. Definition of done

This handoff is complete only when:
- F-044 has a SQLite-valid migration strategy with actual migration execution and failure/rollback evidence, or is explicitly blocked on a named missing runtime fact;
- F-045 has a real DB constraint and direct-SQL proof, or is explicitly blocked with the exact missing dependency;
- F-046 has a fail-closed legacy policy and two-principal test evidence, or provider scope is explicitly marked unverified while the safe design is still delivered;
- every claim is traceable to committed source, command, log, hash, and commit;
- no unauthorized application or production change has occurred.

**Do the engineering work. Do not answer with another status-only document.**
