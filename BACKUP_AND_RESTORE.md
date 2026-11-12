# Naqer Menu — Database Backup and Disaster Recovery Guide

This document establishes the official backup policy, export/import procedures, and disaster recovery validation for the Naqer Menu PostgreSQL database.

---

## 1. Backup Strategy & Frequency

- **Automated Managed Backups:** If using Neon PostgreSQL, point-in-time recovery (PITR) is automatically enabled with branching capabilities.
- **Scheduled Logical Dumps:** Recommended **daily** logical SQL dumps before major menu price updates or seasonal changes.
- **Pre-Maintenance Snapshots:** Always execute a logical dump before running any schema migrations or large menu imports.

---

## 2. Backup Execution Procedures

### Option A: Standard PostgreSQL `pg_dump` (Recommended)

Run the following command in terminal or via automated cron job:

```bash
# Set your DATABASE_URL or pass it directly
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="backup-naqer-$(date +%Y%m%d_%H%M%S).dump"
```

To create a plain-text SQL backup:
```bash
pg_dump "$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --file="backup-naqer-$(date +%Y%m%d_%H%M%S).sql"
```

### Option B: JSON Data Export Script

The repository includes a direct relational data export script for menu items:
```bash
node -e "
import('./scripts/verify-final-db-integrity.mjs');
"
```

---

## 3. Disaster Recovery & Restore Procedure

In the event of database corruption, accidental deletion, or hosting migration, follow this procedure:

> [!WARNING]
> Test restore procedures only on an isolated staging database or local instance before restoring into production.

### Step 1: Prepare Clean Target Database
```bash
createdb -h localhost -U postgres naqer_restore
```

### Step 2: Restore from Custom Dump
```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$RESTORE_DATABASE_URL" \
  backup-naqer-latest.dump
```

Or for plain SQL dump:
```bash
psql "$RESTORE_DATABASE_URL" -f backup-naqer-latest.sql
```

---

## 4. Recovery Validation Checklist

Following any restoration, execute the database integrity verification script to confirm exact data parity:

```bash
node scripts/verify-final-db-integrity.mjs
```

Verify the output matches the certified baseline:
- `products`: Exactly 151
- `categories`: Exactly 18
- `sections`: Exactly 27
- `variants`: Exactly 167
- `branches`: Exactly 2
- `orphanedProducts`: 0
- `zzProducts`: 0
- `zzCategories`: 0

