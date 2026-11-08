#!/bin/sh
# Clean-clone build experiment v2.3.22 (F-047 / F-030).
#
# Reproduces the two runs whose raw logs are stored next to this script:
#   clean-clone-build-no-hatch.txt           (install FAIL exit 1, build FAIL exit 1)
#   clean-clone-build-with-hatch-control.txt (install OK exit 0, build:server OK,
#                                             build:client FAIL exit 1 — SDK policy)
#
# Usage (from the repository root):
#   sh evidence/v2322/run-clean-clone-build.sh hidden   # no /opt/hatch
#   sh evidence/v2322/run-clean-clone-build.sh visible  # control, /opt/hatch present
#
# The "hidden" run uses a user+mount namespace (unshare -rm) to bind an
# empty directory over /opt/hatch, simulating a clean external builder
# that does not possess the machine-local Hatch SDK tarball. Nothing is
# copied out of /opt/hatch; no SDK file is extracted or redistributed.
# The clone lives in /tmp and is disposable; the repo itself is untouched.
# Exit code of this driver is 0 in both modes; read INSTALL_EXIT /
# BUILD_EXIT inside the produced log for the experiment result.
set -u
MODE="${1:-hidden}"
CLONE_DIR="/tmp/v2322-clean-clone"
EMPTY_HATCH="/tmp/v2322-empty-hatch"
REPO_URL="file://$HOME/workspace/airdrop-generate-foundation"
OUT="evidence/v2322/clean-clone-build-no-hatch.txt"
if [ "$MODE" = "visible" ]; then OUT="evidence/v2322/clean-clone-build-with-hatch-control.txt"; fi

rm -rf "$CLONE_DIR" "$EMPTY_HATCH"
mkdir -p "$EMPTY_HATCH"
git clone --quiet "$REPO_URL" "$CLONE_DIR"
echo "Cloned $REPO_URL @ $(git -C "$CLONE_DIR" rev-parse --short HEAD)"

if [ "$MODE" = "hidden" ]; then
  (cd "$CLONE_DIR/site" && unshare -rm sh -c '
    mount --bind /tmp/v2322-empty-hatch /opt/hatch
    echo "--- sanity: /opt/hatch contents (must be empty) ---"
    ls -A /opt/hatch; echo "(empty)"
    echo "--- bun version ---"; bun --version
    echo "--- node version ---"; node --version
    echo "=== bun install --frozen-lockfile ==="
    bun install --frozen-lockfile; echo "INSTALL_EXIT=$?"
    echo "=== bun run build ==="
    bun run build; echo "BUILD_EXIT=$?"
    echo "=== build outputs ==="
    ls -la server/dist/ client/dist/ 2>&1 || true
  ' > "$OLDPWD/$OUT" 2>&1) || true
else
  (cd "$CLONE_DIR/site" && {
    echo "--- sanity: /opt/hatch contents (must be VISIBLE) ---"
    ls /opt/hatch | head -5
    echo "--- bun version ---"; bun --version
    echo "=== bun install --frozen-lockfile ==="
    bun install --frozen-lockfile; echo "INSTALL_EXIT=$?"
    echo "=== bun run build ==="
    bun run build; echo "BUILD_EXIT=$?"
    echo "=== build outputs ==="
    ls -la server/dist/ client/dist/ 2>&1 || true
  } > "$OLDPWD/$OUT" 2>&1) || true
fi

echo "Log written to $OUT"
sha256sum "$OUT"
grep -E "INSTALL_EXIT|BUILD_EXIT" "$OUT" || true
