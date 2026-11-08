# SSRF Independent Audit V18 — Muse v2.3.23 Source Implementation Review

**Tanggal:** 8 November 2026  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Audit branch:** `main`  
**Main baseline:** `c0efbfdec67b6d6d48843162d292c88f8ddf9233` (V17)  
**Development HEAD:** `2ed09a5b478fc2476afc57a3dd5847c2315f41c6`  
**Development comparison:** `main...development` = 28 commits ahead, 1 behind; merge base `7e8281895e2d1844278b4814561b6037ed0ecca0` (V16)  
**Status:** **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA**

## 1. Executive decision

Muse has now made substantive implementation progress on the isolated `development` branch. This is no longer a documentation-only cycle.

Actual source/schema/migration changes exist for D-01 through D-05: migration 0006, Drizzle schema and ownership changes, SSRF guard and pinned transport, streaming/resource controls, scan leases/rate limits, kill switch, and cache fixes. Muse also completed a second VM regression round reporting **312/312 PASS**. The harnesses import the actual application modules and run migrations against disposable SQLite databases. That is meaningful progress.

However, independent source review found several release-blocking gaps that the current response matrix marks addressed too broadly:

- The IP classifier does not cover every non-globally-reachable IANA special-purpose range and its IPv6 test corpus contains at least one false positive.
- The globally writable `addProject` action has no owner/service authorization check in its handler.
- The principal model uses a Cloudflare share ID, not a distinct viewer identity; users opening the same share can therefore share check history and saved state.
- The 20-second deadline does not bound DNS validation/preflight, and timeout completion is not checked before a check row is inserted.
- Cache hits bypass the per-scan aggregate byte reservation.
- The database Solana CHECK is intentionally weaker than the application validator and permits non-base58 characters through direct SQL.
- A same-origin script URL can redirect cross-origin; the redirect loop does not re-enforce the same-origin policy.

All reported tests are **VM/local evidence only**. There is no staging environment, no provider/runtime proof, no public application URL, and no external health check. The scanner must remain unavailable. The project is not ready for owner-only trial or community beta.

## 2. Scope, method, and evidence boundary

Read-only review of the current GitHub source and committed evidence. No application code, database, live artifact, production configuration, or deployment configuration was changed. No Link Scanner action was invoked. No external or internal URL was fetched by this audit. No staging or production test was run.

Key current source blob SHAs reviewed:

| File | Blob SHA |
| --- | --- |
| `site/server/src/actions.ts` | `c8f8f258a20f52156ade28b266d56e8c3d0e0757` |
| `site/server/src/ssrf-guard.ts` | `989f47e8141e3a90359e7f779d5fa231ae7952a7` |
| `site/server/src/scan-limits.ts` | `f811572ef7745333320443ac999d68c7698bec85` |
| `site/server/src/schema.ts` | `2494051bfeab763083ebab805c25faccfaf3a1f9` |
| `site/server/src/catalog.ts` | `fac0b21e0e2edecf9a5d1d9689b11b38fe770d39` |
| `site/drizzle/0006_unified_ownership_and_uniqueness.sql` | `12794d0e201ade2529b384cae1dd6e1f68a3f3f4` |
| `site/drizzle/0007_scan_leases_and_rate_limits.sql` | `5dbe802d2b19b9edce7c972efbeb7b98b9bbf69e` |

Important implementation commits reviewed include `e0228690c8519da7b779620b9fcb76bd45e588d3` (migration 0006), `daec8ea757b22cb97700e8e7a917a144edad3830` (schema/actions ownership), `9c666a4d66377c862939fd1631b9eac1a9852092` (SSRF guard/wiring), `514352ba9c928e560319baca5bb63848fff7793f` (guard corrections), `98040ee523da25ed92153bd4878b9eddaf8371bd` (kill switch), `247d98ab547f19faac2afb4e4bbc173729c720f2` (scan leases/rate limits), `24de11e40f406e7f4ce8388c4b03ab12ccc26d7c` (resource/lease fixes), `c107555cf1e6f17f3ff9b23a530c0796ea228f40` and `45caaa8b0343db60a3f17bae1f05573ad1fdbb90` (cache), `0e5270643dcd9e64f094c2cd6f27e450db14073a` (legacy export gate), and `d18de7794ce63c69868f245c7008ce5f9860b2a8` (second regression round).

The latest development commit `2ed09a5b478fc2476afc57a3dd5847c2315f41c6` only updates the backlog to record the regression commit. `67bd50b55dd5d3d2e4973cb3be210078cf08855d` corrects D-03/D-06 labels in comments; it does not change behavior.

## 3. Response to Previous Handoff (V17)

| V17 request | Result | Evidence / remaining issue |
| --- | --- | --- |
| Synchronize development branch with current main | **PARTIALLY ADDRESSED** | The branch was renamed from `dev` to `development` per owner instruction and implementation started. It is still 1 commit behind current main; merge base remains V16. V17 itself (`c0efbf...`) is not yet incorporated. Merge current main into development without merging application changes back to main. |
| D-01: actual migration/schema/ownership implementation | **IMPLEMENTED IN DEVELOPMENT; STAGING BLOCKED** | Migration 0006 and 0007, schema, catalog canonicalization, ownership predicates, legacy export gate. H-MIG/H-CAT/H-TEN/DK: 232/232 PASS in VM harness. |
| D-02: SSRF guard on real fetch path | **IMPLEMENTED IN DEVELOPMENT; INDEPENDENT REVIEW OPEN** | `ssrf-guard.ts` is wired into `actions.ts`; DNS set validation, redirect-hop revalidation, pinned Node transport, streamed caps. H-SSRF: 32/32 PASS in VM. New F-049/F-052/F-056 below remain open. |
| D-03: resource controls | **PARTIALLY ADDRESSED** | Stream caps, shared budget, 20s AbortSignal, leases and rate counters exist. H-RES 15/15 and H-LEASE 8/8 PASS in VM. New F-052/F-053/F-054 show the hard deadline and aggregate-budget invariants are not yet upheld on all code paths. |
| D-04: uniqueness, authorization, tenant isolation | **PARTIALLY ADDRESSED; RESPONSE MATRIX OVERSTATES F-005/F-018** | Unique indexes and owner-scoped predicates exist. H-TEN tests mock viewer identities. But addProject has no handler authorization (F-050), and shareId is not a per-user identity (F-051). Runtime `ctx.viewer` population/scope remains NOT VERIFIED. |
| D-05: cache correctness | **PARTIALLY ADDRESSED** | Cap is part of cache key; failures are not cached; guard preflight, freshness metadata and forceFresh exist. H-CACHE 12/12 PASS in VM. Aggregate budget is not charged on cache hits (F-054). Content staleness within TTL remains an acknowledged residual. |
| Publish informational landing page separately | **SOURCE PREPARED; PUBLIC URL NOT VERIFIED** | `project-landing:landing/index.html` is static and contains no scanner/API/wallet. Parent-agent evidence says a separate artifact was built, but `share.shared=false`, `share.url=null`; that artifact build was not independently verified by this agent. |
| Verify T-01 second Hatch space | **BLOCKED** | `evidence/v2323/t-01-verification.txt`: available Hatch CLI has no create/publish command; share CLI only shares an already-published space. Both local spaces are unshared. No public URL or isolation proof. |

Muse did respond to the implementation-first directive through actual development-branch commits. This is verified by GitHub commit/source evidence, not inferred from the Muse share link.

## 4. VM evidence reviewed

Muse's second regression round records:

| Harness | Result | Evidence |
| --- | ---: | --- |
| H-MIG/H-CAT/H-TEN/DK | 232/232 PASS | `evidence/v2323/test-migration-v2323.verify-r2.txt`; SHA-256 `0a9c1a131b90ba6bc1e7a8403461e1a21d04e47832a11fe4d570e94dd3c89d0d` |
| H-SSRF | 32/32 PASS | `evidence/v2323/test-ssrf-guard-v2323.verify-r2.txt`; SHA-256 `44aec0d17a1445dd0f1e2be9a75c91be1c3fa81a5d7b5f7ae01a3df00e5d6062` |
| H-RES | 15/15 PASS | `evidence/v2323/test-resource-v2323.verify-r2.txt`; SHA-256 `807e821482c64812a2e9c59e5560c962a90ce058af1b3b2f6a90f7cfcb589864` |
| H-LEASE | 8/8 PASS | `evidence/v2323/test-lease-v2323.verify-r2.txt`; SHA-256 `f9b5196e9cd80eaa631a3cacd3999388f237c3738951a03bb662eef2fbd2b6d9` |
| H-CACHE | 12/12 PASS | `evidence/v2323/test-cache-v2323.verify-r2.txt`; SHA-256 `19b6706900c293b2378948b45583189ce6b99b4859d7472e92c00028d6857344` |
| H-LEG | 8/8 PASS | `evidence/v2323/test-legacy-export-v2323.verify-r2.txt`; SHA-256 `7871abe26a39c8a52b3434c1df06d4622b5e538577f187642cb08c4c3768fc98` |
| H-KILL | 5/5 PASS | `evidence/v2323/test-checklink-killswitch-v2323.verify-r2.txt`; SHA-256 `eded4f3592b27722a856000398f67fdef4a0af1ac3cd95a95867ae7d7649bbce` |

Total reported: **312/312 PASS**, with server/client TypeScript checks exit 0. These tests exercise real repository modules and disposable databases, which is materially stronger than a test-only pseudodiff. They remain VM evidence: Bun 1.4.4, SQLite 3.53.4 / sqlite3 CLI 3.45.1, local Hatch migrator path, no staging, no production DB, no real public DNS or external fetch.

The clean-clone experiment is also partial only. The clone-only SDK stub enables install, server/client typecheck, server build and local harnesses; client build intentionally exits 1 because the stub's `buildClient` throws. The shipped `site/package.json` still points to the local Hatch tarball. The stub is explicitly not a runtime replacement. D-06/F-047 therefore remains IN PROGRESS/BLOCKED for a real external app build.

## 5. New independent findings

### F-049 — High: IPv4/IPv6 special-purpose classification is incomplete and the corpus has a false positive

**Classification:** confirmed code-level policy gap; actual routing/exploitability depends on the runtime network.  
**Paths:** `site/server/src/ssrf-guard.ts:140-160` and `:203-230`; tests `evidence/v2323/test-ssrf-guard-v2323.ts` H-SSRF-02/H-SSRF-04.

The IPv4 classifier does not reject `192.88.99.2/32`. The IPv6 classifier does not reject `5f00::/16` (SRv6 SIDs, IANA Globally Reachable = False), and it does not implement the default-deny semantics for `2001::/23` except for several hard-coded subranges. For example, `2001:1::4` is inside the `2001::/23` allocation but is not one of its more-specific globally reachable exceptions; the current code falls through to `ok: true`.

The test corpus also expects `2001:20::1` to be denied. IANA marks `2001:20::/28` ORCHIDv2 as Globally Reachable = True. That is a false positive unless the product deliberately chooses a stricter policy and documents it. The IPv4 and IPv6 IANA registries were last updated 2025-10-09:
- `https://www.iana.org/assignments/iana-ipv4-special-registry`
- `https://www.iana.org/assignments/iana-ipv6-special-registry`

**Scenario:** a URL resolves to one of the omitted non-globally-reachable addresses; the classifier accepts it and the pinned connector attempts the connection.  
**Precondition:** the target address is routable/reachable from the worker's network. No live exploit was attempted.  
**Confidence:** High for the code-path gap; medium for runtime exploitability.  
**Mitigation:** derive a maintained prefix corpus from the current IANA registries; implement parent-prefix default-deny with explicit more-specific globally reachable exceptions; test `192.88.99.2`, `5f00::1`, `2001:1::4`, and allow `2001:20::1` if following IANA reachability. Add a generated registry-diff test so future assignments do not silently escape.

### F-050 — High: `addProject` has no owner/service authorization in the action handler

**Classification:** confirmed application-level authorization gap; remote exploitability NOT VERIFIED because the runtime action-dispatch boundary is not proven.  
**Paths:** `site/server/src/actions.ts:1392-1515` (`addProject`) and `:1925-1946` (`Actions.addProject`).

The action is part of the exported `Actions` map. Its handler calls `addProject(ctx,args)` without checking `ctx.viewer`, `isOwner`, a role, or a trusted scheduled-job identity. The function accepts caller-controlled project metadata, `officialUrl`, `verifiedAt`, and `verifiedNote`; the URL check verifies only parseability and http/https. Provenance records the caller principal or the literal `anonymous`, while `provenanceVerifiedBy` is always NULL. This is not proof that the project was independently verified.

**Scenario:** if the runtime permits a non-owner action caller to invoke this action, the caller can insert attacker-controlled entries into the GLOBAL catalog that other visitors are told is verified.  
**Precondition:** action dispatch does not separately enforce owner/service-only access. This is NOT VERIFIED at runtime.  
**Confidence:** High that the application handler lacks the gate; exploitability conditional on dispatch policy.  
**Mitigation:** enforce authorization inside the handler (owner or a narrowly defined scheduled service principal), or remove this action from the public Actions map and expose an internal-only scheduled path. Do not treat a caller-supplied URL/date/note as verification.  
**Regression test:** anonymous, non-owner local, and non-owner Cloudflare viewer must be rejected before any DB write; only the intended owner/service principal may insert.

### F-051 — High: Cloudflare share ID is used as a user principal, causing cross-viewer data sharing

**Classification:** confirmed identity-model design gap; external exposure NOT VERIFIED while the artifact remains unshared.  
**Paths:** `site/server/src/actions.ts:140-145` (`resolvePrincipal`), `:158-160` (`savedPrincipal`), `:1621-1634` (`askGibran` history query), `:1780-1790` (`listChecks`), and `deleteCheck` owner predicate.

For Cloudflare viewers, `resolvePrincipal` returns `cloudflare:{viewer.shareId}`. A share ID identifies the shared link, not an individual visitor. All visitors using the same share therefore resolve to the same principal. Their check rows are read by `listChecks` and injected into Gibran's prompt by `askGibran`; one viewer can consequently see another viewer's submitted URL history, and can delete rows belonging to another viewer under the same share. Anonymous visitors also share the `<LEGACY>` saved-state sentinel.

**Scenario:** two people open the same Cloudflare share; visitor B requests history or asks Gibran about recent checks and receives visitor A's check records.  
**Precondition:** a shared Cloudflare artifact is accessible to multiple viewers and the runtime supplies the share-level viewer. The current landing artifact is not shared; no external leak was demonstrated.  
**Confidence:** High for the identity mapping and query behavior; runtime scope still NOT VERIFIED.  
**Mitigation:** use a stable per-user subject from the provider. If the runtime exposes only a share ID, disable personal history and per-user saved state for shared/anonymous viewers, or restrict the artifact to owner-only access. Do not label share-scoped rows as user-scoped.  
**Regression test:** two distinct viewer sessions on one share must not read, mutate, or delete each other's history or saved state.

### F-052 — High: the 20-second total deadline does not bound DNS validation/preflight

**Classification:** confirmed deadline-propagation gap; exact runtime overrun requires staging measurement.  
**Paths:** `site/server/src/ssrf-guard.ts:674-716` (`validateUrlForFetch`), `:726-754` (`fetchGuardedOnce`), `site/server/src/actions.ts:275-294` (`fetchText`), `:596-600` (deadline), `:748-754` (serial script fetches), and `site/server/src/scan-limits.ts:43-47,62-88` (25-second lease).

`validateUrlForFetch` has its own 5-second DNS timeout but accepts no total-deadline signal. `fetchGuardedOnce` awaits this validation BEFORE it constructs the combined per-hop/deadline signal. `fetchText` also performs a DNS preflight before checking cache and does not pass the total deadline to that preflight. The script loop can call this path serially after the 20-second signal has already aborted. Therefore 20 seconds is not a hard bound for the complete scan. The scan lease TTL is only 25 seconds; a scan that outlives that TTL can lose its lease while still doing work, weakening the global concurrency cap.

**Scenario:** slow DNS responses at the page/script preflight stages continue after the scan deadline; a scan can remain in flight beyond its lease expiry.  
**Precondition:** slow or stalled DNS responses on a runtime path that is reachable by the scanner.  
**Confidence:** High for the missing signal propagation; runtime timing NOT VERIFIED.  
**Mitigation:** pass the total deadline into every DNS validation and preflight; race DNS against both its per-query timeout and the total deadline; check `deadline.aborted` before cache reads and before starting each script; ensure lease lifetime/renewal cannot expire before the true maximum execution time.  
**Regression test:** injected resolver delays across page + RDAP + three scripts; assert the entire action terminates within the deadline plus documented grace, releases its lease, and cannot acquire a replacement slot while still running.

### F-053 — Medium: a timed-out scan can be persisted as an ordinary check result

**Classification:** confirmed control-flow mismatch; no timeout-specific end-to-end test found.  
**Paths:** `site/server/src/actions.ts:596-621` (`analyze` deadline and fetch results), `:940-980` (analysis return), and `:1022-1080` (`runCheck` inserts the result).

The analysis comment says a timeout is “not a verdict” and must not create a checks row. In the implementation, fetch/guard failures are converted to `null`; `analyze` does not check `deadline.aborted` before returning its `Analysis`; `runCheck` then unconditionally inserts the returned result. A deadline abort can therefore be recorded as an unreachable/unknown/less-safe result rather than an explicit timeout with no saved verdict.

**Scenario:** a slow target causes the total deadline to abort; the visitor sees a stored check result that does not distinguish timeout from a completed analysis.  
**Precondition:** deadline abort occurs and the handler reaches the normal return path.  
**Confidence:** High from control flow.  
**Mitigation:** propagate a typed timeout result/error out of `analyze`; do not insert a checks row when the deadline has fired; return a separate retryable timeout response.  
**Regression test:** force deadline expiry through injected DNS/connector/body streams; assert explicit timeout response and zero inserted rows.

### F-054 — Medium: cache hits bypass the per-scan aggregate decoded-byte budget

**Classification:** confirmed resource-accounting gap.  
**Paths:** `site/server/src/actions.ts:275-305` (`fetchText` cache path), `site/server/src/ssrf-guard.ts:527-533` (`tryReserve` on decoded chunks), and `evidence/v2323/test-cache-v2323.ts`.

On a cache hit, `fetchText` returns `{ ...cached, fromCache: true }` before calling `fetchTextOnce`. The cache entry does not carry a decoded-byte count and the cache path does not reserve any bytes in the current `ScanBudget`. The budget is only charged by `readCappedStream` while reading a network body. A scan can therefore reuse cached page/script bodies without charging them to the shared aggregate cap. The H-CACHE suite tests key separation, failures, freshness, guard-before-cache, and forceFresh, but does not test aggregate accounting on cache hits.

**Scenario:** pre-populate cache entries for several scripts in separate scans; a later scan can process a 400 KB page plus three 300 KB cached scripts (1.3 MB) despite the 1 MB per-scan aggregate cap.  
**Precondition:** those URLs already have valid cache entries and pass the DNS preflight.  
**Confidence:** High.  
**Mitigation:** store exact decoded byte length in each cache entry and reserve it against the current scan budget before returning a hit, or bypass shared fetch cache inside a security scan.  
**Regression test:** prepopulate cached script entries, run one page with three scripts, and assert aggregate accounting never exceeds 1,000,000 decoded bytes.

### F-055 — Medium: database Solana CHECK does not enforce the full base58 alphabet

**Classification:** confirmed database-constraint weakness; application-level validation is stricter.  
**Paths:** `site/server/src/schema.ts:122-137`, `site/drizzle/0006_unified_ownership_and_uniqueness.sql:99-112`, and `site/server/src/catalog.ts:55,71-75`.

The application validator uses `^[1-9A-HJ-NP-Za-km-z]{32,44}$`. The database CHECK only enforces length, absence of `0/O/l/I`, and absence of a space. A 32–44 character string containing punctuation such as `!` or `-` can pass the database CHECK despite not being base58. The source comment at `catalog.ts:26-33` explicitly acknowledges this asymmetry. The app path rejects such values, but a direct SQL writer bypasses that app validation.

**Scenario:** a DB write path that does not call `canonicalizeContractAddress` stores a malformed Solana address while the database CHECK reports success.  
**Precondition:** a direct SQL/alternate writer reaches the projects table. No public SQL endpoint was identified.  
**Confidence:** High for the constraint mismatch; exploitability depends on write-path access.  
**Mitigation:** align the CHECK with the complete base58 character allowlist, or explicitly document and justify why the DB invariant is intentionally weaker. Do not mark F-045 fully closed while direct-SQL malformed values pass.  
**Regression test:** direct SQL INSERT and UPDATE with `!`, `-`, Unicode, and other non-base58 characters must fail; valid base58 and NULL behavior must remain correct.

### F-056 — Medium: script same-origin policy is bypassable through redirects

**Classification:** confirmed policy gap; SSRF destination validation still runs on every redirect.  
**Paths:** `site/server/src/actions.ts:748-754` and `:334-361`.

The script discovery code checks that the initial script URL has the same origin as `page.finalUrl`. It then calls generic `fetchText`. The generic redirect loop follows `Location` with `new URL(loc,current)` and does not carry an allowed-origin constraint. Each redirect destination is SSRF-validated and pinned, but it is not required to remain same-origin. A same-origin script endpoint can therefore redirect the server fetch to any public origin.

**Scenario:** a page references `/bundle.js` on its own origin; that endpoint returns a redirect to a third-party host, which the scanner then fetches.  
**Precondition:** a same-origin script endpoint issues a cross-origin redirect.  
**Confidence:** High for the missing origin check.  
**Mitigation:** pass an allowed-origin policy into the fetch loop and enforce it at every redirect hop for script fetches; alternatively remove the same-origin-only claim and document the broader egress policy.  
**Regression test:** same-origin script URL redirecting to a different public hostname must be rejected before the second connector call.

## 6. Updated status by deliverable

| Deliverable | Status | Decision |
| --- | --- | --- |
| Project link — informational static page | SOURCE PREPARED; separate artifact reportedly built; NOT SHARED / NO URL VERIFIED | Do not call it a public link yet. |
| Owner-only application trial | BLOCKED | No isolated deployment, owner-only server auth proof, staging DB/runtime proof, or verified scanner denial across all invocation paths. |
| Community beta | BLOCKED | F-049 through F-056 and all staging/operational gates remain open. |
| Link Scanner | DISABLED by default in development source; live/runtime state NOT VERIFIED | Do not invoke or deploy. |
| External clean build | PARTIALLY ADDRESSED | Clone-only stub supports install/typecheck/server build; real client build and shipped SDK dependency remain blocked. |
| T-01 second Hatch space | BLOCKED | No create/publish command exposed to this agent; no free public subdomain or isolation evidence. |

Staging readiness `STAGING_READINESS_V2323.md` states that no staging operator, runtime provider, egress owner, DB/runtime owner, alert recipient, or rollback owner is assigned. STAGE-P01/P02/P03 and related staging gates remain blocked. No runtime `ctx.viewer` population, egress topology, provider SDK contract, or production SQLite version is verified.

## 7. Muse Handoff / Required Response

The existing owner authorization for isolated development-branch implementation remains sufficient. Do not ask the owner to carry messages or reconfirm development authorization. Keep all work on `development`; do not modify `main` application source, production, live artifact, deployment configuration, database/catalog, or enable Link Scanner.

1. **Synchronize the development branch with current main.**
   - Merge current main HEAD `c0efbfdec67b6d6d48843162d292c88f8ddf9233` into `development`, preserving all Muse commits.
   - Acceptance: compare reports no behind commits; record exact merge commit and resulting HEAD. Do not merge development application changes into main.

2. **Close F-049 using the IANA registries.**
   - Add complete IPv4/IPv6 special-purpose coverage, including `192.88.99.2/32`, `5f00::/16`, and the default-deny behavior of `2001::/23` with more-specific globally reachable exceptions.
   - Correct the `2001:20::/28` test expectation or document a deliberate stricter product policy.
   - Acceptance: tests cover every IANA Globally Reachable=False entry and the more-specific True exceptions; registry source/date and generated corpus are committed.

3. **Close F-050: authorize addProject at the handler boundary.**
   - Require owner or a narrowly scoped trusted scheduled-job principal before DB access.
   - If the SDK dispatch layer is the intended authorization control, provide the exact source/runtime contract and staging proof; do not rely on an unverified assumption.
   - Acceptance: anonymous, non-owner, and non-owner share viewer calls create zero rows; only the intended principal succeeds.

4. **Redesign F-051 principal semantics.**
   - Do not use a share ID as a per-user identity.
   - If per-user identity is unavailable in Cloudflare shared context, disable check history and per-user saved state for those viewers or restrict the artifact to owner-only.
   - Acceptance: two distinct viewers on one share cannot read, mutate, or delete each other's checks or saved state; Gibran prompt contains only the current viewer's data.

5. **Make F-052 deadline a hard bound and close F-053 timeout persistence.**
   - Propagate the 20-second deadline through DNS resolution, cache preflight, redirects, and each script fetch; do not start a new DNS wait after abort.
   - Check the deadline before returning analysis and before inserting a check row.
   - Acceptance: slow injected DNS/connector fixtures terminate within the documented bound, release the lease, return an explicit timeout, and insert no check row.

6. **Close F-054 aggregate accounting on cache hits.**
   - Charge cached decoded bytes to the current scan budget or bypass cache for scanner fetches.
   - Acceptance: cache-prepopulated page/script fixture cannot exceed 1,000,000 decoded bytes per scan.

7. **Close F-055 database-level Solana validation.**
   - Make the CHECK enforce the full base58 alphabet, not only a blacklist of four characters and spaces.
   - Acceptance: direct SQL invalid-character INSERT/UPDATE cases fail while valid addresses pass; schema and migration remain equivalent.

8. **Close F-056 same-origin redirect escape.**
   - Enforce allowed origin on every redirect hop for script fetches.
   - Acceptance: cross-origin redirect from a same-origin script endpoint is rejected before any second-hop connection.

9. **Continue D-06 without disguising the stub as a production SDK.**
   - Keep the clone-only stub clearly isolated. Obtain a lawful, reproducible real SDK dependency or a documented provider artifact-build path that can build the actual client.
   - Acceptance: clean external build from the shipped manifest and lockfile succeeds for both server and client using the real supported runtime/SDK, or provider evidence explains the required artifact tooling and supplies a verified build route.

10. **Keep T-01 and landing-page publication honest.**
    - Continue only through the authorized artifact tooling; publish only the static `landing/` source as a separate informational artifact if the platform permits.
    - Acceptance: real HTTPS URL, external-session HTTP 200/health check, $0 cost, artifact/commit identity, no backend/scanner reachability. Do not publish the full-stack scanner as a shortcut.

After the code fixes, provide full diffs, exact commands, exit codes, test logs and SHA-256, then request independent review. Staging validation is a separate gate; VM PASS does not close staging or release approval.

## 8. Final release decision

**No application URL is verified. No scanner is approved for public use. No owner-only trial or community beta is approved.**

The implementation phase has advanced materially: actual source changes and a 312/312 VM regression round exist. The next cycle should fix the concrete gaps above and establish staging/runtime evidence, not create another status-only document.

**Release status remains: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**
