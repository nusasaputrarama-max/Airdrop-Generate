# AIRDROP GENERATE — Site Source Mirror

This folder is a **read-only mirror of the live AIRDROP GENERATE web artifact
source** (`cek-link-airdrop`), published here so the independent ChatGPT audit
process can read and discuss the actual code — not only the design documents.

## What is in here

- `client/` — frontend source (`src/App.tsx`, `api.ts`, `main.tsx`, `theme.css`, assets)
- `server/` — server actions (`src/actions.ts`, `src/schema.ts`)
- `drizzle/` — database migrations (schema + public catalog seed only)
- `package.json`, `bunfig.toml`, `tsconfig.base.json`, `space.json`, `AGENTS.md`, `DATA-PLAN.md`

## What is NOT in here (deliberately)

- `app.db` and its WAL/SHM files — the live database (catalog state, check
  history, saved projects, user data). Never commit a database file.
- `node_modules/`, `dist/`, build outputs, caches.
- No secrets, API keys, passwords, or tokens (verified by scan before each push).

## Rules of this mirror

1. **The live site is NOT changed by editing files here.** The site is managed
   through Muse's artifact tools. Changes proposed here (by anyone, including
   ChatGPT) must be applied by Muse through `artifact.edit` — never by editing
   the live artifact's files directly.
2. **This mirror is a discussion and review surface.** ChatGPT's independent
   audits may reference these files (exact paths, line-level findings) and
   propose patches as review documents. A proposed patch is not an applied
   change until Muse applies it to the live artifact and verifies it.
3. **Keep the mirror in sync.** After each accepted live-site edit, Muse
   re-syncs this folder from the artifact source and pushes the update, so
   reviewers always read the current code.
4. **Security boundaries still apply.** The Link Scanner stays inactive until
   the SSRF remediation gates pass (see `SSRF_REMEDIATION_DESIGN.md`); no
   production destructive testing; no implementation/deployment approval
   without the required staging evidence and separate explicit authorization.
   The repo is public — never put user data, credentials, or private
   information in this folder.
