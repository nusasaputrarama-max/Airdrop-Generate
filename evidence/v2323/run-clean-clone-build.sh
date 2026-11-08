#!/bin/sh
# Clean-clone build experiment driver v2.3.23 (F-047 / F-030).
#
# Replaces evidence/v2322/run-clean-clone-build.sh (SHA-256 6912b8fd…,
# U-103 NOT PORTABLE — left untouched as historical evidence).
#
# U-103 fixes in THIS driver (v2.3.23):
#   (1) Repo URL + ref are arguments (--repo/--ref); the default is the
#       REMOTE repo, not a hardcoded local worktree path.
#   (2) All scratch space comes from ONE mktemp -d directory; a trap
#       removes ONLY that directory on exit — no rm -rf of fixed /tmp
#       paths, no cleanup of anything the run did not create.
#   (3) Output paths are derived from the SCRIPT's own location
#       (SCRIPT_DIR), not from the caller's CWD or $OLDPWD.
#   (4) Setup status is propagated: clone failure or unshare failure
#       exits 2 (SETUP_FAILED) and is logged; a build failure inside a
#       completed experiment is a RESULT (recorded as INSTALL_EXIT /
#       BUILD_EXIT in the log) and the driver exits 0.
#
# Usage (from anywhere):
#   sh evidence/v2323/run-clean-clone-build.sh [--repo URL] [--ref REF]
#       [--out-dir DIR] {hidden|visible} [--check-setup-only]
#   sh evidence/v2323/run-clean-clone-build.sh --help
#
# Modes:
#   hidden  — /opt/hatch hidden via a user+mount namespace (unshare -rm)
#             binding an empty dir over it: simulates a clean external
#             builder without the machine-local Hatch SDK tarball.
#   visible — control: /opt/hatch present.
#   --check-setup-only — do NOT run the build experiment: clone the repo
#             (shallow, given ref), verify site/ exists, verify unshare
#             works, then clean up. Proves the driver mechanics
#             (U-103 fixes) without re-running the F-047 build.
#
# The clone is disposable; the repo itself is untouched. Nothing is
# copied out of /opt/hatch; no SDK file is extracted or redistributed.
# Exit codes: 0 = experiment (or setup check) completed; 1 = usage
# error; 2 = setup failure (clone/unshare/namespace unavailable).
set -u

DEFAULT_REPO="https://github.com/nusasaputrarama-max/Airdrop-Generate.git"
DEFAULT_REF="dev"

REPO_URL="$DEFAULT_REPO"
REF="$DEFAULT_REF"
OUT_DIR=""
MODE=""
CHECK_SETUP_ONLY=0

usage() {
  echo "Usage: $0 [--repo URL] [--ref REF] [--out-dir DIR] {hidden|visible} [--check-setup-only]"
  echo "Defaults: --repo $DEFAULT_REPO --ref $DEFAULT_REF"
  echo "Output defaults to the directory containing this script."
}

while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO_URL="$2"; shift 2 ;;
    --ref) REF="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --check-setup-only) CHECK_SETUP_ONLY=1; shift ;;
    hidden|visible) MODE="$1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [ -z "$MODE" ]; then echo "Missing mode: hidden or visible" >&2; usage >&2; exit 1; fi

# (3) Output based on the detected script location, never on CWD.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -z "$OUT_DIR" ]; then OUT_DIR="$SCRIPT_DIR"; fi
OUT="$OUT_DIR/clean-clone-build-$MODE.txt"
if [ "$CHECK_SETUP_ONLY" = "1" ]; then OUT="$OUT_DIR/check-setup-$MODE.txt"; fi

# (2) ONE mktemp scratch dir; trap removes ONLY what this run created.
WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/v2323-clean-clone.XXXXXX") || {
  echo "SETUP_FAILED: mktemp failed" >&2; exit 2; }
CLONE_DIR="$WORK_DIR/clone"
EMPTY_HATCH="$WORK_DIR/empty-hatch"
cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

# The experiment runs in a SUBSHELL (so a setup `exit 2` inside it only
# ends the subshell — the parent still prints the summary + SHA below).
(
echo "=== v2.3.23 clean-clone driver ==="
echo "repo=$REPO_URL ref=$REF mode=$MODE check_setup_only=$CHECK_SETUP_ONLY"
echo "work_dir=$WORK_DIR (mktemp; trap removes only this dir)"
echo "out=$OUT"
echo "--- git clone (shallow, --branch $REF) ---"
if ! git clone --quiet --depth 1 --branch "$REF" "$REPO_URL" "$CLONE_DIR" 2>&1; then
  echo "SETUP_FAILED: git clone failed (repo=$REPO_URL ref=$REF)"
  exit 2
fi
echo "Cloned $REPO_URL @ $(git -C "$CLONE_DIR" rev-parse --short HEAD)"
if [ ! -d "$CLONE_DIR/site" ]; then
  echo "SETUP_FAILED: cloned repo has no site/ directory"
  exit 2
fi
mkdir -p "$EMPTY_HATCH"

if [ "$CHECK_SETUP_ONLY" = "1" ]; then
  echo "--- setup check: unshare -rm sanity ---"
  if ! unshare -rm sh -c 'mount --bind "$1" /opt/hatch && ls -A /opt/hatch' _ "$EMPTY_HATCH" 2>&1; then
    echo "SETUP_FAILED: unshare -rm (user+mount namespace) unavailable"
    exit 2
  fi
  echo "--- setup check: /opt/hatch visible in this shell ---"
  ls /opt/hatch | head -5
  echo "SETUP_OK: clone + site/ + unshare all work; no build run (check-setup-only)"
  exit 0
fi

if [ "$MODE" = "hidden" ]; then
  (cd "$CLONE_DIR/site" && unshare -rm sh -c '
    mount --bind "$1" /opt/hatch
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
  ' _ "$EMPTY_HATCH") || {
    echo "SETUP_FAILED: unshare -rm run failed (namespace/mount unavailable)"
    exit 2
  }
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
  }) || {
    echo "SETUP_FAILED: visible-mode run failed"
    exit 2
  }
fi
echo "EXPERIMENT_DONE: read INSTALL_EXIT / BUILD_EXIT above for the result"
) > "$OUT" 2>&1
DRIVER_EXIT=$?

echo "Log written to $OUT"
sha256sum "$OUT"
grep -E "SETUP_FAILED|SETUP_OK|INSTALL_EXIT|BUILD_EXIT|EXPERIMENT_DONE" "$OUT" || true
# (4) Propagate setup status: 2 on setup failure, 0 when the experiment
# ran to completion (a failing build is a result, not a driver failure).
exit "$DRIVER_EXIT"
