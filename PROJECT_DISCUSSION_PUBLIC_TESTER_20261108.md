# Project Discussion: Public Tester Deployment and Three-Party Workflow

Date: 2026-11-08
Repository: nusasaputrarama-max/Airdrop-Generate
Branch: main
Status: DISCUSSION ONLY — NO DEPLOYMENT OR IMPLEMENTATION AUTHORIZATION

## Participants and communication model

This repository is the shared source of truth for the project owner, Muse, and ChatGPT.

- Muse: proposes architecture, implements only work explicitly authorized by the project owner, and publishes code, tests, CI evidence, and technical responses to this repository.
- ChatGPT: independently reviews committed artifacts, verifies evidence where possible, records findings, and publishes numbered handoffs and decisions here.
- Project owner: makes explicit product, risk, implementation, and deployment decisions. The owner is not expected to copy messages between the two assistants.

GitHub is an asynchronous handoff channel, not a live direct chat. A document or commit addressed to Muse does not prove Muse has read it. A response is recognized only when Muse publishes a response matrix, commit, issue/PR comment, or other verifiable repository artifact.

## Question for Muse

The project owner is considering publishing Airdrop-Generate on a free subdomain as a public tester while the Muse–ChatGPT audit loop continues.

Please provide a technically grounded proposal in a new commit. Do not deploy, change production, activate Link Scanner, or modify application code as part of this discussion.

Address each item:

1. **Hosting/runtime fit**
   - Identify hosting options compatible with the actual repository stack (Bun, server actions, database/Drizzle, persistent state).
   - Distinguish static frontend hosting from backend/runtime hosting.
   - State free-tier limitations, sleeping/cold starts, execution limits, outbound network restrictions, persistent disk/database requirements, and vendor lock-in.
   - Do not assume Cloudflare Pages alone can host the complete application. Verify the actual deployment architecture.

2. **Environment separation**
   - Propose a dedicated tester environment isolated from production, with a separate database, credentials, storage, project catalog, and deployment secrets.
   - Define how test data is generated and reset without touching production data.
   - Ensure no real wallet secrets, personal incident details, production tokens, or sensitive user data are copied into the tester.

3. **Safe public exposure**
   - Give a feature matrix for public, authenticated, allowlisted, and disabled features.
   - Link Scanner must remain disabled until F-001 is fixed and independently verified.
   - Define ingress controls, authentication, rate limits, quotas, abuse monitoring, request deadlines, concurrency limits, and data retention.
   - Identify any server-side network access that must be denied by default.

4. **Security acceptance gates**
   - Map F-001 through F-009 and U-46 to required evidence before public exposure.
   - For SSRF, cover initial URL, DNS resolution and rebinding, IPv4/IPv6 address classes, redirects at every hop, script fetches, DNS pinning/rebinding resistance, and egress/network controls.
   - Specify which tests are unit, integration, staging, or infrastructure-level. Do not describe a harness pass as proof of production safety.

5. **Deployment and rollback**
   - Propose branch and environment strategy, CI checks, immutable artifact/versioning, secrets management, health checks, rollback procedure, and who is authorized to promote a build.
   - Deployment must be opt-in and require a separate explicit approval from the project owner.

6. **Operating model for the three-party loop**
   - Specify exact repository paths for Muse response matrices, implementation proposals, test evidence, ChatGPT audits, blocker logs, and release decisions.
   - Include an owner, next action, dependency, acceptance criteria, and evidence link for every blocker.
   - State how Muse will acknowledge a ChatGPT handoff through a repository artifact. Do not assume the owner will relay it.

## ChatGPT independent position

A public tester may be feasible, but public availability is not a substitute for security readiness. The safer initial option is a public-facing frontend or limited tester with risky server-side features disabled, backed by a separate isolated environment. A public tester with the full scanner enabled is not approved while F-001 remains open.

No hosting provider is selected yet. The choice must follow verification of the actual app runtime and persistence requirements, not the attractiveness of a free domain.

## Required response format from Muse

Create a new versioned document, for example:
`docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md`

Include:
- architecture diagram or data-flow description;
- hosting comparison with verified constraints and source links;
- environment and feature isolation matrix;
- security gate checklist with PASS / FAIL / NOT PROVIDED / NOT VERIFIED;
- deployment and rollback plan;
- cost estimate, including likely upgrade triggers;
- explicit list of unresolved assumptions and blockers;
- response to each numbered question above.

Do not mark a gate PASS without an artifact, test output, or verifiable provider documentation. Do not deploy or alter live services in response to this discussion.

## Current decision

DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.
NO PUBLIC DEPLOYMENT AUTHORIZED.
LINK SCANNER MUST REMAIN DISABLED.
