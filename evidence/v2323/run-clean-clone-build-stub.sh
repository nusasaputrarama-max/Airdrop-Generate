#!/bin/sh
# Clean-clone build experiment v2.3.24 (D-06, F-030/F-047) — with the
# space-sdk stub.
#
# Same shape as evidence/v2322/run-clean-clone-build.sh, but the clone's
# site/package.json is patched (TEMP-CLONE ONLY) so @hatch/space-sdk
# resolves to file:../tools/space-sdk-stub instead of the /opt/hatch
# tarball. The shipped package.json is NEVER modified.
#
# Usage (from the repository root):
#   sh evidence/v2323/run-clean-clone-build-stub.sh
#
# The run hides /opt/hatch in a user+mount namespace (unshare -rm),
# simulating a clean external builder that does not possess the
# machine-local Hatch SDK tarball. Nothing is copied out of /opt/hatch;
# no SDK file is extracted or redistributed. The clone lives in /tmp and
# is disposable; the repo itself is untouched.
#
# Expected outcome (see tools/space-sdk-stub/README.md):
#   INSTALL_EXIT=0, TSC_SERVER_EXIT=0, TSC_CLIENT_EXIT=0,
#   BUILD_SERVER_EXIT=0, HARNESS_EXIT=0, BUILD_CLIENT_EXIT=1 (by design:
#   the stub's buildClient throws, preserving the real SDK's refusal).
# Exit code of this driver is 0; read the *_EXIT values inside the log.
set -u
CLONE_DIR="/tmp/v2324-clean-clone-stub"
EMPTY_HATCH="/tmp/v2324-empty-hatch"
REPO_URL="file://$HOME/workspace/airdrop-generate-foundation"
OUT="evidence/v2323/clean-clone-build-stub.txt"

rm -rf "$CLONE_DIR" "$EMPTY_HATCH"
mkdir -p "$EMPTY_HATCH"
git clone --quiet --branch development "$REPO_URL" "$CLONE_DIR"
echo "Cloned $REPO_URL @ $(git -C "$CLONE_DIR" rev-parse --short HEAD) (branch development)"

(cd "$CLONE_DIR/site" && unshare -rm sh -c '
  set -u
  mount --bind /tmp/v2324-empty-hatch /opt/hatch
  echo "--- sanity: /opt/hatch contents (must be empty) ---"
  ls -A /opt/hatch; echo "(empty)"
  echo "--- bun version ---"; bun --version
  echo "--- node version ---"; node --version
  echo "--- shipped site/package.json SDK dep (before patch) ---"
  grep "@hatch/space-sdk" package.json
  echo "=== patch CLONE ONLY: @hatch/space-sdk -> file:../tools/space-sdk-stub ==="
  sed -i "s|\"@hatch/space-sdk\": \"file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz\"|\"@hatch/space-sdk\": \"file:../tools/space-sdk-stub\"|" package.json
  grep "@hatch/space-sdk" package.json
  echo "--- clone git status (only the clone is dirty) ---"
  git -C .. status --short | head -5
  echo "=== bun install (plain: lockfile is regenerated in the clone) ==="
  bun install; echo "INSTALL_EXIT=$?"
  echo "=== resolved @hatch/space-sdk ==="
  ls -la node_modules/@hatch/space-sdk/ | head -5
  cat node_modules/@hatch/space-sdk/package.json | grep -E "\"(name|version)\""
  echo "=== tsc server ==="
  bun x tsc --noEmit -p server/tsconfig.json; echo "TSC_SERVER_EXIT=$?"
  echo "=== tsc client ==="
  bun x tsc --noEmit -p client/tsconfig.json; echo "TSC_CLIENT_EXIT=$?"
  echo "=== bun run build:server ==="
  bun run build:server; echo "BUILD_SERVER_EXIT=$?"
  ls -la server/dist/ 2>&1 || true
  echo "=== round-2 harnesses (H-CACHE / H-LEG / H-KILL) ==="
  bun ../evidence/v2323/test-cache-v2323.ts > /tmp/v2324-harness-cache.txt 2>&1; echo "H_CACHE_EXIT=$?"
  tail -2 /tmp/v2324-harness-cache.txt
  bun ../evidence/v2323/test-legacy-export-v2323.ts > /tmp/v2324-harness-leg.txt 2>&1; echo "H_LEG_EXIT=$?"
  tail -2 /tmp/v2324-harness-leg.txt
  bun ../evidence/v2323/test-checklink-killswitch-v2323.ts > /tmp/v2324-harness-kill.txt 2>&1; echo "H_KILL_EXIT=$?"
  tail -2 /tmp/v2324-harness-kill.txt
  echo "=== bun run build:client (EXPECTED FAIL: stub buildClient throws) ==="
  bun run build:client; echo "BUILD_CLIENT_EXIT=$?"
  echo "=== build outputs ==="
  ls -la server/dist/ client/dist/ 2>&1 || true
' > "$OLDPWD/$OUT" 2>&1) || true

echo "Log written to $OUT"
sha256sum "$OUT"
grep -E "INSTALL_EXIT|TSC_SERVER_EXIT|TSC_CLIENT_EXIT|BUILD_SERVER_EXIT|H_CACHE_EXIT|H_LEG_EXIT|H_KILL_EXIT|BUILD_CLIENT_EXIT" "$OUT" || true
