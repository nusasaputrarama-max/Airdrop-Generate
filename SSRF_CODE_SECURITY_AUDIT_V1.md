# Independent Code Security Audit V1 — AIRDROP GENERATE Source Mirror

**Date:** 2026-11-07  
**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Branch reviewed:** `main`  
**Source mirror commit:** [c68c7276e0b11f72b2517017469454a53957b67c](https://github.com/nusasaputrarama-max/Airdrop-Generate/commit/c68c7276e0b11f72b2517017469454a53957b67c)  
**Primary files reviewed:** `site/server/src/actions.ts`, `site/server/src/schema.ts`, `site/package.json`, `site/README.md`, `site/DATA-PLAN.md`, and the v2.3.7 design/reconciliation references.  
**Review type:** Static source review of the committed mirror. No code was executed and no live artifact/database was accessed.

## Executive decision

**BLOCKED — DO NOT ENABLE OR EXPOSE THE LINK CHECKER SERVER ACTION IN PRODUCTION.**

The source mirror makes the actual implementation reviewable. The first critical issue is that the server-side link checker fetches attacker-controlled URLs without validating resolved destination IP addresses, and it repeats that behavior for redirect destinations and page-referenced scripts. This is a server-side request forgery (SSRF) attack surface. The current redirect and script logic makes the issue broader than a single initial URL check.

This is a static-review finding based on the code paths cited below. Exploitability against a specific internal service depends on the runtime network topology and egress controls, which have not been verified. Therefore the finding is **Critical / high confidence as an unsafe SSRF design; runtime exploitability not yet verified**.

The source mirror is explicitly a read-only review surface. No production change, code change, deployment, or destructive test was performed.

## Findings

### F-001 — Critical: SSRF through user URL, redirect hops, and script fetches

**Location**
- `site/server/src/actions.ts`, `normalizeUrl()` around lines 69–89.
- `fetchText()` around lines 101–125.
- `analyze()` around lines 236–257.
- Script URL fetch around lines 373–386.
- `checkLink` action around lines 1204–1210.

**Evidence**
- `normalizeUrl` checks that the URL scheme is HTTP or HTTPS, but does not reject loopback, private, link-local, unique-local, IPv4-mapped IPv6, unspecified, multicast, reserved, or otherwise non-public destination addresses.
- `fetchText` passes the URL directly to server-side `fetch()`.
- Redirects are manually followed by parsing `Location` and assigning `current = new URL(loc, current).toString()`; the new destination is not subjected to any host/IP policy before the next fetch.
- Up to three script URLs are extracted from attacker-controlled HTML, resolved against the page URL, and fetched through the same `fetchText` path. No same-origin restriction or public-IP validation is applied.
- The `checkLink` action accepts a user-supplied URL and invokes `runCheck`, which reaches this fetch path.

**Impact / attack path**
An attacker can submit a URL that points to a server-reachable internal address, or submit a public URL that redirects to an internal address. A malicious page can also reference script URLs that target internal services. Depending on the deployment network and metadata-service protections, this can enable requests to localhost services, private network services, cloud metadata endpoints, or other infrastructure-only HTTP endpoints. Even if response bodies are not returned verbatim to the caller, internal requests can still trigger side effects and response-derived data is parsed and stored as scan output.

**Confidence**
High that the source lacks the necessary SSRF destination controls. Runtime exploitability and reachable targets are not verified.

**Required remediation**
1. Resolve every hostname and validate every returned A and AAAA address before connecting. Reject all non-global-unicast destinations, including loopback, private, link-local, unique-local, unspecified, multicast, reserved, IPv4-mapped IPv6, and IPv6 zone-scoped addresses.
2. Pin the validated destination for the actual connection or use a transport/egress layer that prevents DNS rebinding between validation and connect. A preflight DNS lookup followed by an unconstrained fetch is insufficient.
3. Re-run the full destination validation on every redirect hop before making the next request. Reject redirects that change to a prohibited destination.
4. Do not fetch arbitrary script origins. Prefer same-origin scripts only; if cross-origin scripts are essential, enforce an explicit allow policy and apply the same destination validation.
5. Apply the same SSRF policy to all server-side network fetches, including RDAP redirects if the implementation ever allows user-controlled RDAP destinations.
6. Add tests for IPv4/IPv6 loopback, RFC1918, link-local, cloud metadata IPs, IPv4-mapped IPv6, DNS answers that mix public and private addresses, DNS rebinding, redirect-to-private, redirect chains, and malicious script src targets.
7. Enforce network-level egress restrictions as defense in depth. Do not treat them as a replacement for application-layer destination validation.

**Acceptance criteria**
- Every outbound request destination is proven public and policy-allowed at connection time.
- Every redirect and script request repeats the policy check.
- Tests demonstrate prohibited destinations receive zero outbound connections.
- Test evidence includes DNS answers, resolved/pinned destination, attempted request count, and expected rejection.
- Staging evidence is collected separately from VM/local evidence.

### F-002 — High: response size cap is applied after full body buffering

**Location:** `site/server/src/actions.ts`, `fetchText()` around line 118; callers pass 400,000 and 300,000 byte/character caps.

**Evidence**
The implementation executes `await res.text()` and only then calls `.slice(0, cap)`. The cap limits the string passed to the scanner, but it does not limit bytes downloaded or buffered before slicing.

**Impact**
A remote endpoint can return a very large response and cause excessive memory use and bandwidth consumption. Multiple concurrent checks can amplify resource exhaustion.

**Confidence:** High for the buffering behavior; operational impact depends on concurrency and runtime limits.

**Required remediation**
Read the response body as a stream, enforce a byte counter while reading, cancel immediately once the configured cap is exceeded, and define explicit behavior for oversized responses. Also cap decompressed bytes where content decoding is performed by the runtime, and enforce a global concurrency/rate limit for outbound scans.

**Acceptance criteria**
A test server streams an oversized body; the client cancels after the configured byte ceiling and memory/bandwidth consumption remains bounded. Test concurrent oversized requests and document the global concurrency ceiling.

### F-003 — High: no explicit per-request total deadline across redirects and script fetches

**Location:** `fetchText()` around lines 101–125; script loop around lines 373–386; `analyze()` around lines 236–257.

**Evidence**
Each individual fetch has `AbortSignal.timeout(12000)`, but a check can perform multiple sequential requests: up to seven redirect attempts for the page, followed by up to three script fetches, in addition to RDAP. There is no single overall deadline or shared cancellation budget for the whole check.

**Impact**
A crafted URL with slow redirects/scripts can hold resources for a long time per check. Concurrent requests can consume worker capacity and degrade availability.

**Confidence:** High for absence of a total budget in the reviewed path.

**Required remediation**
Create one overall deadline/cancellation budget per check; pass the remaining budget to every page, redirect, RDAP, and script request. Combine with concurrency limits and streaming byte limits.

**Acceptance criteria**
A deterministic slow-response harness proves the whole check terminates within the configured total deadline and releases all outstanding requests.

### F-004 — Medium: project catalog duplicate prevention is race-prone and not backed by unique constraints

**Location:** `site/server/src/actions.ts`, `addProject()` around lines 1019–1046; `site/server/src/schema.ts` projects table.

**Evidence**
The action reads all existing projects, checks duplicate name/address in application code, then inserts. The reviewed schema does not declare unique constraints for normalized project name or contract address.

**Impact**
Two concurrent addProject calls can both pass the duplicate checks and insert duplicate catalog entries. This can undermine the claimed strict catalog intake rules.

**Confidence:** High for the check-then-insert race in source; whether the action is callable by an untrusted client or only a trusted scheduler is not established by this mirror.

**Required remediation**
Enforce uniqueness in the database with suitable normalized keys/indexes and handle unique-constraint conflicts. If the action is scheduler-only, enforce and document authorization at the action boundary; do not rely on an undocumented caller convention.

**Acceptance criteria**
Concurrent duplicate requests result in exactly one inserted row. Unauthorized callers cannot invoke catalog mutation.

### F-005 — Medium: project official URL validation permits arbitrary HTTP destinations and does not establish source authenticity

**Location:** `site/server/src/actions.ts`, `addProject()` around lines 987–1007.

**Evidence**
The action validates only URL parsing and HTTP/HTTPS scheme. It does not verify domain ownership, official-source provenance, or whether the URL points to a private/internal destination. It also does not normalize/validate X handles beyond string rewriting.

**Impact**
If addProject can be invoked by an untrusted caller or a weakly controlled scheduler, false or malicious project URLs and metadata can enter the supposedly verified catalog. If those URLs are later fetched server-side, the same SSRF policy must apply.

**Confidence:** High that source validation is syntactic only; caller authorization is not verified.

**Required remediation**
Establish action authorization, require evidence/provenance for catalog additions, validate URL destinations under the SSRF policy if fetched, and distinguish user-submitted metadata from independently verified metadata.

**Acceptance criteria**
Only authorized ingestion can add catalog rows; every row records verifiable source evidence and validation timestamp; malicious or internal URLs are rejected where applicable.

### F-006 — Medium: the public source mirror contains incident-specific personal context

**Location:** `site/DATA-PLAN.md`.

**Evidence**
The file includes a detailed account of a personal wallet-drain incident and a partially masked wallet address from project history. The repository mirror is described as public in `site/README.md`.

**Impact**
This unnecessarily publishes personal incident context and wallet-identifying fragments. It is not a credential, but it increases privacy and correlation risk.

**Required remediation**
Replace the detailed incident narrative with a generic threat-model statement. Remove wallet address fragments and any personal history not essential to the code review. Keep only the minimum generic evidence required to explain why the known-bad domain indicators exist.

**Acceptance criteria**
The public mirror contains no personal wallet identifiers or detailed personal incident narrative; the security rationale remains documented generically.

## Important limitations and unverified areas

- This was static review only. No source code was executed, no typecheck/build/test suite was run, and no production artifact was accessed.
- The source mirror's `README.md` says edits to the mirror do not change the live site and must be applied by Muse through artifact tools. This report therefore requests changes; it does not apply them.
- The review did not verify the runtime action authorization model, network egress policy, DNS resolver behavior, runtime fetch implementation, rate limits, or staging topology.
- No claim is made that the Link Scanner is currently enabled. The design guardrail remains: keep it inactive until SSRF remediation gates pass.
- The design review v2.3.7 and its reconciliation evidence do not close the code-level SSRF issue. A passing VM harness for process locking/pidfd is not evidence that this URL-fetch implementation is safe.

## Response to Previous Handoff

The repository now contains the source mirror commit `c68c727`, which directly addresses the earlier request to provide actual code artifacts for review. This is verified by the committed paths under `site/client/`, `site/server/`, and `site/drizzle/`.

Muse's response to the newly established handoff protocol is not yet established by a subsequent response matrix or explicit acknowledgement. Do not infer that Muse has read this report until a later commit demonstrates it.

## Muse Handoff / Required Response

1. **Remediate F-001 SSRF before any Link Scanner enablement.** Provide exact changed paths and a threat-model note covering initial URLs, DNS resolution/pinning, every redirect, and script fetches. Acceptance: all outbound requests are blocked unless their actual connected destination is public and allowed; redirects and script URLs cannot bypass policy.
2. **Provide a deterministic SSRF harness.** Include IPv4/IPv6 private/loopback/link-local/metadata cases, mixed DNS answers, rebinding, redirect-to-private, and script-src-to-private cases. Acceptance: prohibited targets receive zero connections. Include test IDs, raw logs, environment, runtime version, and commit SHA. Do not test against real metadata services or production infrastructure.
3. **Fix F-002 and F-003 resource controls.** Implement streamed byte caps, a total request deadline, cancellation, and a bounded concurrency policy. Acceptance: oversized and slow-response harnesses prove bounded resource use.
4. **Fix F-004 catalog atomicity and verify F-005 action authorization.** Add database uniqueness guarantees and concurrency tests; document the trust boundary and authorization policy for addProject. Acceptance: concurrent duplicate submissions create one row, and untrusted callers cannot mutate the catalog.
5. **Clean F-006 public mirror privacy exposure.** Remove wallet fragments and detailed personal incident context from public documentation while retaining generic threat rationale. Acceptance: scan the mirror for wallet/address-like identifiers and personal incident narrative; report results without disclosing any sensitive values.
6. **Return a response matrix** for F-001..F-006 with addressed/partial/rejected/blocked status, evidence references, residual risk, and next action. Do not claim PASS based on code edits alone.

## Next independent audit gate

Re-review the next Muse commit and the changed source files. Verify the SSRF controls and harness evidence independently. Until F-001 is closed with staging-appropriate evidence, the implementation decision remains:

**DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**
