# space-sdk-stub — NOT the real `@hatch/space-sdk`

Version `0.14.0-stub.1`. A minimal, original re-implementation of the
small SDK surface that AIRDROP GENERATE actually uses, written from
observed usage in `site/` plus the public `.d.ts` signatures of the
installed SDK 0.14.0. **No SDK file was copied.** Its purpose is one
experiment only: prove that `bun install`, `tsc`, `build:server`, and
the harnesses can run on a clean clone that has no `/opt/hatch`
(D-06, F-030/F-047).

## What it covers (and only this)

| Entry | Covered |
| --- | --- |
| `@hatch/space-sdk` | `defineAction` (returns spec + `__brand`), `z` (re-export from zod), `isAction`, `actionDescription`, `ACTION_BRAND`; types `Ctx`, `PortableCtx`, `ActionsModule`, `SpaceDb`, `SpaceDbAccessor`, `Viewer`, `LocalViewer`, `CloudflareViewer`, `JsonValue` |
| `@hatch/space-sdk/client` | `createActionClient` (POSTs `{action, args}` to `./actions`), `spaceQueryClient` (a plain TanStack QueryClient), `SafeAreaTopScrim` (minimal div with safe-area top padding), `SpaceActionError`, retry helpers; types `ApiRequest`, `ApiResponse`, `ActionClient` |
| `@hatch/space-sdk/build` | `buildClient` — **throws, by design** (see below) |

## What it deliberately does NOT do

> Note on `@libsql/client` (declared as a dependency although the stub
> never calls it at runtime): the real SDK's install provides it into
> `site/node_modules` (SDK 0.14.0 lists it in devDependencies), and the
> repo's harnesses import it from there
> (`evidence/v2323/harness-helpers.ts` builds real drizzle libsql
> instances over disposable DBs). The stub declares the same package so
> a clean-clone `bun install` provides it too and the harnesses keep
> resolving. If the harnesses ever stop needing it, drop the dep.

- **No runtime.** There is no daemon, no `ctx.db`, no `ctx.inference`,
  no `ctx.agent`, no `ctx.tool`, no privileged execution, no worker
  dispatch. A space built against the stub cannot serve real actions;
  the stub only lets the code **typecheck, bundle the server, and run
  the hermetic harnesses** (which inject their own mock ctx).
- **No client build.** `buildClient()` throws a clear error instead of
  producing a bundle. The real SDK also refuses hand builds of the
  client ("cannot be built by hand" — U-97, layer 2); the client bundle
  is produced by the artifact tooling only. The stub preserves that
  refusal instead of faking a build. A full `bun run build` therefore
  still FAILS with the stub — the expected, honest outcome.
- **No privileged contracts, no PDF, no icons, no styles.css.**
  Those exports do not exist in the stub; importing them fails loudly
  rather than silently resolving to a fake.
- **No fidelity claim.** Retry defaults, the QueryClient defaults, and
  the scrim rendering are reasonable minimal approximations, NOT
  verified copies of the real SDK's behavior. Production parity is
  NOT claimed and NOT needed for this experiment.

## How it is used (temp-clone only — never shipped)

The shipped `site/package.json` still points at
`file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`; the
runtime integration is untouched. The experiment script
`evidence/v2323/run-clean-clone-build-stub.sh` clones the repo,
hides `/opt/hatch` in a user+mount namespace, and patches **the
clone's copy only** of `site/package.json` to
`"@hatch/space-sdk": "file:../tools/space-sdk-stub"`, then runs
`bun install`, server+client `tsc`, `build:server`, the round-2
harnesses, and `build:client` (expected FAIL). The clone is disposable;
nothing in the worktree is modified by the run.

## Expected outcome

- `bun install` — OK (all other deps are public registry packages)
- `tsc` server + client — OK
- `build:server` — OK (bundles `actions.ts` against the stub)
- H-CACHE / H-LEG / H-KILL harnesses — PASS (they inject a mock ctx;
  the stub only has to resolve the import)
- `build:client` — FAIL exit 1, stub `buildClient` throws (by design)
