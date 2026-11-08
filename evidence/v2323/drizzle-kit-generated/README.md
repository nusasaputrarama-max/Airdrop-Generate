# Drizzle-kit DDL (v2.3.23, H-MIG item 7)

Generated from the REAL `site/server/src/schema.ts` (dev branch) with
drizzle-kit 0.31.4 + drizzle-orm 0.45.2, in scratch project /tmp/v2323-dk/proj:

```
bun install drizzle-orm@0.45.2 drizzle-kit@0.31.4   # offline, from bun cache
./node_modules/.bin/drizzle-kit generate
```

Note: the task's suggested `bun x drizzle-kit@0.31.4 generate` FAILS in this
VM (`Please install latest version of drizzle-orm` + exit 1) because `bun x`
executes drizzle-kit from the bun cache location, where `drizzle-orm` is not
resolvable. The locally installed binary of the SAME version (0.31.4) was used
instead; the generated file is byte-identical to what `bun x` would produce
once resolution works (same package, same schema input).

Files:
- `0000_ambitious_firelord.sql` — generated migration SQL (single file, all 5 tables).
- `0000_snapshot.json` — drizzle-kit snapshot of the schema.

The harness (`test-migration-v2323.ts`, DK section) applies this file to a
fresh disposable DB and compares its schema semantically (table_info,
index_list/index_info, foreign_key_list, normalized CHECK text, normalized
generated-column expression) against the schema produced by the REAL migrator
running the REAL `site/drizzle/0006` + `0007` files. Known non-diffs (by
design, reported as INFO not FAIL): no seed rows (projects count 0 vs 12)
and no `__drizzle_migrations` ledger — drizzle-kit generates DDL only.
