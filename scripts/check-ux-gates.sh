#!/usr/bin/env bash
# UX gates for WEB-001 (read-only assertions on the repo mirror).
# Fails (exit 1) if the disabled Link Scanner still looks actionable, if the
# misleading "Hubungkan Wallet" CTA is present, or if the server kill switch
# was touched. Run from the repo root: bash scripts/check-ux-gates.sh
set -u
FAIL=0
check() { # check <name> <expected-count> <actual-count>
  if [ "$2" = "$3" ]; then echo "PASS: $1 (count=$3)"; else echo "FAIL: $1 (expected $2, got $3)"; FAIL=1; fi
}
APP="site/client/src/App.tsx"
ACT="site/server/src/actions.ts"
check "no Hubungkan Wallet CTA" 0 "$(grep -c "Hubungkan Wallet" "$APP" || true)"
check "no actionable submit CEK LINK INI" 0 "$(grep -c "CEK LINK INI" "$APP" || true)"
check "no checker input id" 0 "$(grep -c 'id="link-input"' "$APP" || true)"
check "no onRecheck path" 0 "$(grep -c "onRecheck" "$APP" || true)"
check "no client checkLink call" 0 "$(grep -c "api.checkLink" "$APP" || true)"
check "no checkMut" 0 "$(grep -c "checkMut" "$APP" || true)"
check "no WalletModal" 0 "$(grep -c "WalletModal" "$APP" || true)"
check "nav labels Cek Link (Nonaktif)" 2 "$(grep -c "Cek Link (Nonaktif)" "$APP" || true)"
check "kill switch still false" 1 "$(grep -c "let CHECKLINK_ENABLED = false" "$ACT" || true)"
if [ "$FAIL" -eq 0 ]; then echo "ALL UX GATES PASS"; else echo "UX GATES FAILED"; fi
exit "$FAIL"
