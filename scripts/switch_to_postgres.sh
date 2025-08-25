#!/usr/bin/env bash
set -euo pipefail

# Auto-switch Prisma to PostgreSQL and create/apply a fresh migration
# Usage:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/dbname bash scripts/switch_to_postgres.sh
# Or provide parts and the script will assemble DATABASE_URL:
#   PGUSER=user PGPASSWORD=pass PGHOST=localhost PGPORT=5432 PGDATABASE=dbname bash scripts/switch_to_postgres.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
PRISMA_SCHEMA="$ROOT_DIR/prisma/schema.prisma"
MIGRATIONS_DIR="$ROOT_DIR/prisma/migrations"

echo "[switch-to-postgres] Working directory: $ROOT_DIR"

# Build DATABASE_URL if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  PGUSER_DEFAULT="postgres"
  PGPORT_DEFAULT="5432"
  if [[ -z "${PGDATABASE:-}" ]]; then
    echo "Error: DATABASE_URL or PGDATABASE must be provided" >&2
    echo "Example: DATABASE_URL=postgresql://user:pass@localhost:5432/db bash scripts/switch_to_postgres.sh" >&2
    exit 1
  fi
  PGUSER="${PGUSER:-$PGUSER_DEFAULT}"
  PGHOST="${PGHOST:-localhost}"
  PGPORT="${PGPORT:-$PGPORT_DEFAULT}"
  PGPASSWORD_PART=""
  if [[ -n "${PGPASSWORD:-}" ]]; then
    PGPASSWORD_PART=":${PGPASSWORD}"
  fi
  DATABASE_URL="postgresql://${PGUSER}${PGPASSWORD_PART}@${PGHOST}:${PGPORT}/${PGDATABASE}?schema=public"
  export DATABASE_URL
fi

echo "[switch-to-postgres] DATABASE_URL set to: ${DATABASE_URL%%:*}://***@${DATABASE_URL#*@}" | sed 's/\?.*/?…/'

# Ensure dependencies are installed
if ! command -v npx >/dev/null 2>&1; then
  echo "Error: Node.js/npm tooling not found in PATH" >&2
  exit 1
fi

echo "[switch-to-postgres] Ensuring Prisma CLI is available..."
npx prisma -v >/dev/null

# Update provider in schema.prisma from sqlite to postgresql
if [[ ! -f "$PRISMA_SCHEMA" ]]; then
  echo "Error: Prisma schema not found at $PRISMA_SCHEMA" >&2
  exit 1
fi

if grep -q 'provider\s*=\s*"sqlite"' "$PRISMA_SCHEMA"; then
  echo "[switch-to-postgres] Switching provider in schema.prisma to postgresql"
  cp "$PRISMA_SCHEMA" "$PRISMA_SCHEMA.bak"
  sed -E -i "s/provider\s*=\s*\"sqlite\"/provider = \"postgresql\"/" "$PRISMA_SCHEMA"
else
  echo "[switch-to-postgres] Provider already set to postgresql (or different). Skipping provider edit."
fi

# Backup existing migrations created for SQLite (not portable to PostgreSQL)
if [[ -d "$MIGRATIONS_DIR" ]] && [[ -n "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null || true)" ]]; then
  BACKUP_DIR="$ROOT_DIR/prisma/migrations_sqlite_backup_$(date +%Y%m%d_%H%M%S)"
  echo "[switch-to-postgres] Backing up existing migrations to $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  # move only if they look like sqlite-origin migrations (heuristic: contain .sql files referencing sqlite or created earlier)
  # Simpler: move all and start fresh for Postgres
  mv "$MIGRATIONS_DIR" "$BACKUP_DIR"
  mkdir -p "$MIGRATIONS_DIR"
fi

echo "[switch-to-postgres] Generating Prisma client"
npx prisma generate

echo "[switch-to-postgres] Creating initial Postgres migration"
npx prisma migrate dev --name init-postgres --create-only

echo "[switch-to-postgres] Applying migration to database"
npx prisma migrate deploy

echo "[switch-to-postgres] Done. Provider set to postgresql and database migrated."

