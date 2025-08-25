# mini-project

## Postgres Switch & Migrate

To switch Prisma from SQLite to PostgreSQL and create/apply a fresh migration:

1. Ensure a PostgreSQL database is available and accessible.
2. Set a `DATABASE_URL` or provide PG variables, then run:

```bash
# Option A: provide full URL
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname?schema=public" npm run db:pg:switch

# Option B: provide parts
PGUSER=user PGPASSWORD=pass PGHOST=localhost PGPORT=5432 PGDATABASE=dbname npm run db:pg:switch
```

The script will:
- Update `prisma/schema.prisma` datasource provider to `postgresql`
- Backup existing SQLite migrations under `prisma/migrations_sqlite_backup_*`
- Generate Prisma client and create an initial `init-postgres` migration
- Apply the migration to the configured database

After switching, start the dev server normally:

```bash
npm run dev
```