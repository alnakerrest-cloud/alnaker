# DATABASE BACKUP AND RESTORE PROCEDURES

This guide outlines the standard operating procedures for backing up and restoring the PostgreSQL database powering Naqer Menu (hosted on Neon Serverless Postgres).

---

## 1. Neon Native Point-in-Time Restore (PITR) & Branching

Neon provides automated continuous backups with point-in-time recovery and instant zero-copy branching.

### Instant Backup / Snapshot (Branch Creation)
Before running schema migrations, bulk imports, or critical updates, create an immediate snapshot branch:
```bash
# Via Neon CLI (if installed)
neon branches create --name pre-release-snapshot-$(date +%Y%m%d)

# Via Neon Web Console
1. Navigate to your Neon Project Dashboard.
2. Go to the "Branches" tab.
3. Click "New Branch" -> Choose the parent branch (e.g. `main` or production branch).
4. Name the branch (e.g. `backup-pre-migration-2026-11-22`).
```

### Point-in-Time Restore (PITR)
If an accidental deletion or data corruption occurs:
1. Go to Neon Web Console -> **Branches**.
2. Click **Create Branch**.
3. Select **Point in Time** restore and choose the timestamp immediately preceding the incident.
4. Update the Vercel Production `DATABASE_URL` environment variable to point to the newly created branch endpoint.

---

## 2. Logical JSON Export / Import (Application-Level)

The application includes an authoritative dataset script that can dump and restore all business entities with relational integrity.

### Logical Dataset File Structure
The full authoritative dataset is stored in:
`CLIENT_DATABASE_IMPORT_DATASET.json`

This file contains:
- `RestaurantSettings` (brand, phone, delivery fee, VAT)
- `Branch` (all active restaurant branches)
- `Category` (menu categories)
- `Section` (sub-sections)
- `Product` (complete item inventory with prices, descriptions, badges)
- `ProductVariant` (variant options with price pills)
- `ProductImage` (local and Cloudinary image mappings)
- `OptionGroup` (modifiers, cooking choices, additions)
- `OptionItem` (choices per modifier group)
- `ProductOptionGroup` (relational bindings)

### Restoring from the Authoritative Dataset
To restore or seed any approved database (staging or production):
```bash
# Set your target DATABASE_URL in your environment, then run:
node scripts/import-authoritative-dataset.mjs
```
The script runs in an atomic Prisma transaction (`$transaction`). If any constraint fails, the entire import rolls back safely without leaving partial data.

---

## 3. Physical / Native PostgreSQL Backups (`pg_dump` and `pg_restore`)

For independent archival outside of Neon's cloud infrastructure:

### Creating a Dump
```bash
# Schema and Data (Plain SQL or Custom format)
pg_dump "postgres://[user]:[password]@[host]/[dbname]?sslmode=require" \
  --format=custom \
  --file=naqer_menu_backup_$(date +%Y%m%d).dump

# Plain text SQL backup
pg_dump "postgres://[user]:[password]@[host]/[dbname]?sslmode=require" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  > naqer_menu_backup_$(date +%Y%m%d).sql
```

### Restoring from a Dump
```bash
# Restoring custom format dump into an empty database
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="postgres://[user]:[password]@[host]/[dbname]?sslmode=require" \
  naqer_menu_backup_20261122.dump

# Restoring plain SQL dump via psql
psql "postgres://[user]:[password]@[host]/[dbname]?sslmode=require" < naqer_menu_backup_20261122.sql
```

---

## 4. Disaster Recovery Checklist

In case of database failure or corrupted records:
1. **Freeze Writes:** Temporarily place the admin panel on maintenance if necessary.
2. **Assess Scope:** Determine if the issue is schema-related, transactional, or an erroneous data modification.
3. **Select Restore Method:**
   - For accidental administrative deletions: Use Neon PITR branch or re-import missing records from `CLIENT_DATABASE_IMPORT_DATASET.json`.
   - For complete database corruption: Spin up a fresh branch from Neon backup or restore via `pg_restore`.
4. **Deploy Schema Migrations:** Ensure `npx prisma migrate deploy` is executed if recovering to a fresh database.
5. **Verify Reconnection:** Verify connectivity with `node scripts/test-db-connection.mjs` before redirecting production traffic.
