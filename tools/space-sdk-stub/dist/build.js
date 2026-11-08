// STUB — NOT the real @hatch/space-sdk/build (see ../README.md).
//
// The real SDK refuses hand builds of the client ("cannot be built by
// hand" — U-97, layer 2); the client bundle is produced by the artifact
// tooling only. This stub preserves that refusal instead of faking a
// build: any caller gets a clear error, never a silently wrong bundle.
// A full `bun run build` therefore still FAILS with the stub — the
// expected, honest outcome (D-06).
export async function buildClient(_options) {
  throw new Error(
    "space-sdk-stub: buildClient is not available outside the artifact tooling. " +
      "The real @hatch/space-sdk refuses hand builds of the client (U-97); " +
      "this stub preserves that refusal. Use the artifact tools to build the client.",
  );
}
