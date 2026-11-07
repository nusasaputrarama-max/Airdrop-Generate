# ChatGPT Independent Audit — Handoff to Muse

**Repository:** `nusasaputrarama-max/Airdrop-Generate`  
**Branch:** `main`  
**Purpose:** Establish a direct working handoff between Muse and the independent ChatGPT audit process. The repository is the shared source of truth; the project owner should not be required to relay messages between agents.

## Instructions to Muse

When preparing each new project revision or evaluation:

1. Read the latest `SSRF_EVALUATION_*.md` independent audit and this handoff protocol before starting a new evaluation.
2. Treat the latest independent audit's **Muse Handoff / Required Response** section as an actionable review request. Address each item explicitly in the next revision.
3. In the next evaluation document, include a response matrix with:
   - audit finding / request ID;
   - Muse's response: addressed, partially addressed, rejected, or blocked;
   - exact file paths, test IDs, log IDs, commit SHA, and run date supporting the response;
   - remaining risk and next action.
4. Do not mark an item closed merely because documentation was edited. Closure requires traceable evidence and criteria that actually pass.
5. If disagreeing with an audit finding, explain the technical basis and provide reproducible evidence. Do not silently omit it.
6. Do not repeat tests that already have valid evidence unless the implementation, environment, harness, or risk has materially changed. Explain any rerun.
7. Keep local/VM, staging, and production evidence strictly separated. VM evidence is not staging evidence; staging evidence is not production evidence.
8. Identify the next concrete project gate and its prerequisites. Avoid producing another version that only restates the previous status.
9. Preserve all project safety constraints: no production destructive testing, no re-enabling Link Scanner, and no implementation/deployment approval without the required staging evidence and separate explicit authorization.

## Instructions to ChatGPT's independent audit

For every materially new Muse revision:

1. Read the changed files and evidence independently; do not rely on Muse's summary or commit message alone.
2. Reconcile every previous audit finding against Muse's response matrix. Carry forward unresolved or inadequately evidenced items.
3. Add a clearly labeled **Muse Handoff / Required Response** section to the new audit report. It must contain numbered, specific actions Muse should take in its next revision, each with an acceptance criterion and required evidence.
4. Include a **Response to Previous Handoff** section that records whether Muse addressed the previous requests, with file/test/log references.
5. Commit the new independent audit report to `main` when there is genuinely new material. Do not create duplicate reports when no relevant changes exist.
6. The audit report itself is the durable handoff message to Muse in the shared repository. Do not ask the project owner to copy, forward, or summarize it.

## Operational boundary

This protocol creates a repository-based handoff, not a guaranteed real-time agent-to-agent messaging channel. ChatGPT can inspect and write to the repository when its scheduled audit runs and connected GitHub access is available. Muse must independently read the latest audit/handoff from the repository. Do not claim Muse has received, read, or acted on a report until repository evidence confirms that.

**Decision status remains: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**
