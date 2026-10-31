#!/usr/bin/env bash
# Applies the migrations to a throw-away PostgreSQL cluster and runs the security tests.
# Requires PostgreSQL 15+ binaries (initdb, pg_ctl, psql) on PATH or in PG_BIN.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")}"
TMP="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"
trap '"$PG_BIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

"$PG_BIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PG_BIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null

PSQL=("$PG_BIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migration: $(basename "$f")"
  "${PSQL[@]}" -f "$f" 2> >(grep -v "already exists, skipping" >&2)
done
"${PSQL[@]}" -t -A -f "$ROOT/supabase/tests/10_security_test.sql" 2>&1 >/dev/null | sed -n "s/.*NOTICE:  //p; /ERROR/p; /FAIL/p"
echo "ALL DATABASE TESTS PASSED"
