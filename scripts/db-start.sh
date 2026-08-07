#!/usr/bin/env bash
#
# Idempotently initialize and start a local PostgreSQL cluster owned by the
# current user (no sudo needed at boot). Safe to run on every environment
# start: it initializes the data dir only if missing, starts the server only if
# not already running, and ensures the app role + database exist.
set -euo pipefail

PGVER="$(ls /usr/lib/postgresql 2>/dev/null | sort -n | tail -1 || true)"
if [ -z "${PGVER}" ]; then
  echo "[db] PostgreSQL is not installed (expected under /usr/lib/postgresql)." >&2
  exit 1
fi
PGBIN="/usr/lib/postgresql/${PGVER}/bin"
export PGDATA="${PGDATA:-$HOME/pgdata}"
PGPORT="${PGPORT:-5432}"

if [ ! -d "${PGDATA}/base" ]; then
  echo "[db] initializing cluster at ${PGDATA}"
  "${PGBIN}/initdb" -D "${PGDATA}" -U postgres --auth=trust >/tmp/initdb.log 2>&1
  sed -i "s/^#listen_addresses.*/listen_addresses = 'localhost'/" "${PGDATA}/postgresql.conf"
  grep -q "^port = ${PGPORT}" "${PGDATA}/postgresql.conf" \
    || echo "port = ${PGPORT}" >> "${PGDATA}/postgresql.conf"
fi

if ! "${PGBIN}/pg_isready" -h localhost -p "${PGPORT}" -q; then
  echo "[db] starting postgres on localhost:${PGPORT}"
  "${PGBIN}/pg_ctl" -D "${PGDATA}" -l "${HOME}/pg.log" -o "-k /tmp" -w start
else
  echo "[db] postgres already running on localhost:${PGPORT}"
fi

psql_su() { "${PGBIN}/psql" -h localhost -U postgres -p "${PGPORT}" "$@"; }

if ! psql_su -tAc "SELECT 1 FROM pg_roles WHERE rolname='trader'" | grep -q 1; then
  echo "[db] creating role 'trader'"
  psql_su -c "CREATE ROLE trader LOGIN PASSWORD 'trader';"
fi

if ! psql_su -tAc "SELECT 1 FROM pg_database WHERE datname='traderdb'" | grep -q 1; then
  echo "[db] creating database 'traderdb'"
  psql_su -c "CREATE DATABASE traderdb OWNER trader;"
fi

echo "[db] ready on localhost:${PGPORT} (db=traderdb user=trader)"
