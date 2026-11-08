#!/bin/sh
# run-mig-sqlite3451.sh — H-MIG-09: jalankan ARTEFAK MIGRASI YANG SAMA
# (0006_unified_ownership_and_uniqueness_v2321.sql + down) dengan
# sqlite3 CLI 3.45.1 terhadap salinan disposable dari schema saat
# ini (migrasi repo 0001-0005), lalu verifikasi hasilnya.
#
# BUKTI VM SAJA — bukan staging/produksi. Semua DB disposable di
# direktori temp; DB/katalog live TIDAK disentuh.
#
# Usage (dari evidence/v2321/):
#   sh run-mig-sqlite3451.sh > test-f044-f045-f046-migration-v2321-sqlite3451.txt 2>&1
# Exit 0 = semua pemeriksaan lolos; exit 1 = ada yang gagal.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
EV="$REPO/evidence/v2321"
WORK="$(mktemp -d /tmp/v2321-cli-XXXXXX)"
echo "=== H-MIG-09 cross-version SQLite 3.45.1 ==="
echo "date: $(TZ=Asia/Jakarta date '+%Y-%m-%d %H:%M:%S') WIB"
echo "sqlite3: $(sqlite3 --version)"
echo "uid: $(id -u)"
echo "work dir: $WORK"
echo "migration artifact: $EV/0006_unified_ownership_and_uniqueness_v2321.sql"
echo "  sha256: $(sha256sum "$EV/0006_unified_ownership_and_uniqueness_v2321.sql" | cut -d' ' -f1)"
echo "down artifact: $EV/0006_down_v2321.sql"
echo "  sha256: $(sha256sum "$EV/0006_down_v2321.sql" | cut -d' ' -f1)"
FAIL=0
ok() { # ok <label> <cond-true-command...>
  label="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "PASS $label"; else echo "FAIL $label"; FAIL=1; fi
}
eq() { # eq <label> <expected> <actual>
  if [ "$2" = "$3" ]; then echo "PASS $1 (=$2)"; else echo "FAIL $1 — expected [$2] got [$3]"; FAIL=1; fi
}

# 1. Bangun DB dasar dari migrasi repo 0001-0005 (file yang sama
#    seperti yang dibaca harness Bun — read-only terhadap repo).
BASE="$WORK/base.db"
for f in 0001_initial 0002_checks_table_replaces_entries 0003_add_projects_catalog_and_saved_projects 0004_seed_projects_catalog_permanently 0005_translate_catalog_text_to_bahasa_indonesia; do
  # Baris "--> statement-breakpoint" adalah komentar SQL yang valid,
  # jadi sqlite3 mengeksekusi file apa adanya, statement demi statement.
  sqlite3 -bail "$BASE" < "$REPO/site/drizzle/$f.sql" || { echo "FAIL build base pada $f"; FAIL=1; }
done
eq "BASE projects = 12 (koreksi U-87)" "12" "$(sqlite3 "$BASE" 'SELECT count(*) FROM projects;')"
eq "BASE checks table ada" "checks" "$(sqlite3 "$BASE" "SELECT name FROM sqlite_master WHERE type='table' AND name='checks';")"

# 2. H-MIG-00 lintas versi: ALTER ADD STORED harus GAGAL di 3.45.1
#    pada tabel yang BERISI baris (kasus nyata: projects berisi 12
#    baris). NUANSA (U-96): pada tabel KOSONG statement itu BERHASIL
#    — diuji terpisah di bawah — jadi probe di sini WAJIB berisi baris.
if sqlite3 -bail "$WORK/probe.db" "CREATE TABLE t (id INTEGER PRIMARY KEY, a TEXT); INSERT INTO t (a) VALUES ('x'); ALTER TABLE t ADD COLUMN c TEXT GENERATED ALWAYS AS (lower(a)) STORED;" 2>"$WORK/stored-err.txt"; then
  echo "FAIL H-MIG-00-cli ALTER ADD STORED tidak gagal di 3.45.1 pada tabel berisi (tak terduga)"; FAIL=1
else
  echo "PASS H-MIG-00-cli ALTER ADD STORED gagal di 3.45.1 pada tabel berisi: $(cat "$WORK/stored-err.txt" | head -1)"
fi
if sqlite3 -bail "$WORK/probe-empty.db" "CREATE TABLE t (id INTEGER PRIMARY KEY, a TEXT); ALTER TABLE t ADD COLUMN c TEXT GENERATED ALWAYS AS (lower(a)) STORED; INSERT INTO t (a) VALUES ('AbC'); SELECT c FROM t;" 2>"$WORK/stored-empty-err.txt" | grep -q "^abc$"; then
  echo "PASS H-MIG-00-cli tabel KOSONG + STORED ADD berhasil di 3.45.1 (nuansa U-96)"
else
  echo "FAIL H-MIG-00-cli tabel kosong + STORED ADD di 3.45.1"; cat "$WORK/stored-empty-err.txt"; FAIL=1
fi
# VIRTUAL ADD harus berhasil di 3.45.1.
sqlite3 -bail "$WORK/probe2.db" "CREATE TABLE t (id INTEGER PRIMARY KEY, a TEXT); ALTER TABLE t ADD COLUMN c TEXT GENERATED ALWAYS AS (lower(a)) VIRTUAL; CREATE UNIQUE INDEX i ON t (c);" \
  && echo "PASS H-MIG-00-cli VIRTUAL ADD + index berhasil di 3.45.1" \
  || { echo "FAIL H-MIG-00-cli VIRTUAL ADD di 3.45.1"; FAIL=1; }

# 3. Jalankan migrasi v3 pada salinan.
MIG="$WORK/migrated.db"
cp "$BASE" "$MIG"
# Fixture checks legacy (2 baris) + saved_projects (2 baris) — sama
# seperti harness Bun, agar jumlah baris sebanding.
sqlite3 -bail "$MIG" "INSERT INTO checks (url, domain, verdict, score, signals, contracts, created_at) VALUES ('https://example-legacy-1.test/claim','example-legacy-1.test','waspada',55,'[]','[]',1780000000000),('https://example-legacy-2.test/airdrop','example-legacy-2.test','lebih_aman',10,'[]','[]',1780000000000); INSERT INTO saved_projects (project_id, bookmarked, task_status, updated_at) VALUES (1,1,'not_started',1780000000000),(2,1,'in_progress',1780000000000);"
BEFORE_SHA="$(sha256sum "$MIG" | cut -d' ' -f1)"
# Validasi pre-check di file mengembalikan 0 baris: jalankan file;
# bila ada VALIDATION yang mengembalikan baris, output-nya tidak
# kosong — tetapi file ini juga berisi VALIDATION di dalam transaksi
# yang harus 0 baris. sqlite3 mengeksekusi semuanya; kegagalan
# statement akan terlihat dari exit code dengan -bail.
if sqlite3 -bail "$MIG" < "$EV/0006_unified_ownership_and_uniqueness_v2321.sql" > "$WORK/mig-out.txt" 2> "$WORK/mig-err.txt"; then
  echo "PASS H-MIG-01-cli migrasi v3 sukses di SQLite 3.45.1 (exit 0)"
else
  echo "FAIL H-MIG-01-cli migrasi v3 gagal di 3.45.1"; cat "$WORK/mig-err.txt"; FAIL=1
fi
# Output validasi harus kosong (semua VALIDATION 0 baris; PRAGMA
# integrity_check mencetak 'ok' — satu baris yang diharapkan).
echo "--- output migrasi (harus hanya 'ok' dari integrity_check) ---"
cat "$WORK/mig-out.txt"
if [ "$(cat "$WORK/mig-out.txt" | tr -d '\n')" = "ok" ]; then
  echo "PASS H-MIG-01-cli output validasi hanya 'ok'"
else
  echo "FAIL H-MIG-01-cli output validasi tidak hanya 'ok'"; FAIL=1
fi
eq "H-MIG-01-cli projects tetap 12" "12" "$(sqlite3 "$MIG" 'SELECT count(*) FROM projects;')"
eq "H-MIG-01-cli checks tetap 2" "2" "$(sqlite3 "$MIG" 'SELECT count(*) FROM checks;')"
eq "H-MIG-01-cli saved_projects tetap 2" "2" "$(sqlite3 "$MIG" 'SELECT count(*) FROM saved_projects;')"
eq "H-MIG-01-cli foreign_key_check 0 baris" "" "$(sqlite3 "$MIG" 'PRAGMA foreign_key_check;')"
eq "H-MIG-01-cli integrity_check ok" "ok" "$(sqlite3 "$MIG" 'PRAGMA integrity_check;')"
echo "H-MIG-02-cli schema projects:"
sqlite3 "$MIG" "SELECT sql FROM sqlite_master WHERE type='table' AND name='projects';" | grep -o "GENERATED ALWAYS AS" | head -1
sqlite3 "$MIG" "SELECT sql FROM sqlite_master WHERE type='table' AND name='projects';" | grep -q "projects_chain_allowlist_ck" \
  && echo "PASS H-MIG-02-cli CHECK chain bernama ada" || { echo "FAIL H-MIG-02-cli CHECK chain"; FAIL=1; }
sqlite3 "$MIG" "SELECT sql FROM sqlite_master WHERE type='table' AND name='projects';" | grep -q "projects_contract_format_ck" \
  && echo "PASS H-MIG-02-cli CHECK format bernama ada" || { echo "FAIL H-MIG-02-cli CHECK format"; FAIL=1; }
sqlite3 "$MIG" "SELECT sql FROM sqlite_master WHERE type='table' AND name='projects';" | grep -q "STORED" \
  && echo "PASS H-MIG-02-cli generated column STORED ada" || { echo "FAIL H-MIG-02-cli STORED"; FAIL=1; }
eq "H-MIG-02-cli unique index alamat ada" "projects_contract_normalized_unique" "$(sqlite3 "$MIG" "SELECT name FROM sqlite_master WHERE type='index' AND name='projects_contract_normalized_unique';")"
eq "H-MIG-02-cli unique index nama ada" "projects_name_normalized_unique" "$(sqlite3 "$MIG" "SELECT name FROM sqlite_master WHERE type='index' AND name='projects_name_normalized_unique';")"

# 4. F-045 direct SQL di 3.45.1: chain tak dikenal DITOLAK (termasuk NULL contract).
if sqlite3 -bail "$MIG" "INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address) VALUES ('X1','Fake Chain','DeFi','live','x','x','Easy','2026-11-08','x',60,'0x3333333333333333333333333333333333333333');" 2>"$WORK/neg1.txt"; then
  echo "FAIL H-CAT-11-cli INSERT Fake Chain lolos di 3.45.1"; FAIL=1
else
  echo "PASS H-CAT-11-cli INSERT Fake Chain ditolak di 3.45.1: $(head -1 "$WORK/neg1.txt")"
fi
if sqlite3 -bail "$MIG" "INSERT INTO projects (name, chain, category, segment, status_label, description, difficulty, verified_at, verified_note, sort, contract_address) VALUES ('X2','Fake Chain','DeFi','live','x','x','Easy','2026-11-08','x',61,NULL);" 2>"$WORK/neg2.txt"; then
  echo "FAIL H-CAT-11-cli INSERT Fake Chain + NULL contract lolos di 3.45.1"; FAIL=1
else
  echo "PASS H-CAT-11-cli INSERT Fake Chain + NULL contract ditolak di 3.45.1: $(head -1 "$WORK/neg2.txt")"
fi
eq "H-CAT-11-cli jumlah projects tetap 12" "12" "$(sqlite3 "$MIG" 'SELECT count(*) FROM projects;')"

# 5. Down migration pada salinan terpisah (3.45.1).
DOWN="$WORK/down.db"
cp "$MIG" "$DOWN"
if sqlite3 -bail "$DOWN" < "$EV/0006_down_v2321.sql" > "$WORK/down-out.txt" 2> "$WORK/down-err.txt"; then
  echo "PASS H-MIG-08-cli down migration sukses di SQLite 3.45.1 (exit 0)"
else
  echo "FAIL H-MIG-08-cli down migration gagal di 3.45.1"; cat "$WORK/down-err.txt"; FAIL=1
fi
if [ "$(cat "$WORK/down-out.txt" | tr -d '\n')" = "ok" ]; then
  echo "PASS H-MIG-08-cli output validasi down hanya 'ok'"
else
  echo "FAIL H-MIG-08-cli output validasi down tidak hanya 'ok'"; cat "$WORK/down-out.txt"; FAIL=1
fi
eq "H-MIG-08-cli projects tetap 12 setelah down" "12" "$(sqlite3 "$DOWN" 'SELECT count(*) FROM projects;')"
if sqlite3 "$DOWN" "SELECT sql FROM sqlite_master WHERE type='table' AND name='projects';" | grep -q "contract_address_canonical"; then
  echo "FAIL H-MIG-08-cli kolom kanonik masih ada setelah down"; FAIL=1
else
  echo "PASS H-MIG-08-cli kolom kanonik hilang setelah down"
fi
eq "H-MIG-08-cli checks tanpa owner_user_id" "" "$(sqlite3 "$DOWN" "SELECT name FROM pragma_table_info('checks') WHERE name='owner_user_id';")"

echo "=== RESULT H-MIG-09 (sqlite3 CLI 3.45.1): $([ "$FAIL" = 0 ] && echo 'ALL PASS' || echo 'ADA FAIL') ==="
echo "work dir (DB disposable, tidak di-commit): $WORK"
exit "$FAIL"
