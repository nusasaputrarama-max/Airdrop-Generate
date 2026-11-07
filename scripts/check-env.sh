#!/usr/bin/env bash
# check-env.sh — AIRDROP GENERATE (AG-001)
# Memeriksa environment yang dibutuhkan untuk pengembangan.
# Tidak membuat akun, tidak menyimpan kredensial, tidak mengubah apa pun.
set -u

ok()   { echo "OK   $1"; }
warn() { echo "WARN $1"; }
fail() { echo "FAIL $1"; }

echo "== AIRDROP GENERATE — environment check =="
echo "Tanggal: $(date -Iseconds)"

if command -v node >/dev/null 2>&1; then ok "node $(node --version)"; else fail "node tidak ditemukan"; fi
if command -v npm >/dev/null 2>&1; then ok "npm $(npm --version)"; else fail "npm tidak ditemukan"; fi
if command -v git >/dev/null 2>&1; then ok "git $(git --version)"; else fail "git tidak ditemukan"; fi
if command -v python3 >/dev/null 2>&1; then ok "python3 $(python3 --version)"; else warn "python3 tidak ditemukan (opsional)"; fi
if command -v vercel >/dev/null 2>&1; then ok "vercel CLI tersedia ($(command -v vercel)) — login AKUN belum dilakukan"; else warn "vercel CLI tidak ditemukan (opsional sampai M1)"; fi
if command -v supabase >/dev/null 2>&1; then ok "supabase CLI tersedia"; else warn "supabase CLI tidak ditemukan (opsional sampai M2)"; fi

if curl -sI --max-time 10 https://registry.npmjs.org/ >/dev/null 2>&1; then
  ok "internet: registry.npmjs.org terjangkau"
else
  fail "internet: registry.npmjs.org TIDAK terjangkau"
fi

echo "== selesai =="
