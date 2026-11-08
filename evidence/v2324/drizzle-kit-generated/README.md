# Drizzle-kit DDL (v2.3.24, F-055)

Generated from the REAL `site/server/src/schema.ts` (development branch,
after the F-055 CHECK change) with drizzle-kit 0.31.4 + drizzle-orm
0.45.2, in scratch project /tmp/v2324-dk/proj:

```sh
bun install drizzle-orm@0.45.2 drizzle-kit@0.31.4
./node_modules/.bin/drizzle-kit generate
```

Files:

- `0000_amused_dorian_gray.sql` — generated migration SQL (single file,
  all 5 tables).
- `0000_snapshot.json` — drizzle-kit snapshot of the schema.

Diff vs v2.3.23 (`evidence/v2323/drizzle-kit-generated/`): EXACTLY ONE
change — the Solana branch of `projects_contract_format_ck` now reads
`trim("projects"."contract_address") NOT GLOB '*[^1-9A-HJ-NP-Za-km-z]*'`
(full base58 allowlist) instead of the two old GLOBs (`*[0OlI]*` and
`* *`). Nothing else changed.

The harness (`test-migration-v2323.ts`, DK section) applies this file to
a fresh disposable DB and compares its schema semantically against the
schema produced by the REAL migrator running the REAL `site/drizzle/`
files (now 0001–0008). Known non-diffs (by design, reported as INFO not
FAIL): no seed rows (projects count 0 vs 12) and no `__drizzle_migrations`
ledger — drizzle-kit generates DDL only.
