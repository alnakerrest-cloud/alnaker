# Naqer Menu — Database Import Safety Report
## Script Audit, Safety Assessment & Safe Destination Import Plan

**Date:** 2026-11-22  
**Status:** AUDIT COMPLETE — EXECUTION GATED  
**Classification:** VERIFIED & DOCUMENTED  

---

## 1. Safety Audit of Existing Repository Scripts

| Script Name | Purpose | Verdict | Critical Safety Issues / Deficiencies |
| :--- | :--- | :---: | :--- |
| `scripts/generate-full-db-dump.mjs` | Dumps current Neon database to SQL | ⚠️ **INCOMPLETE FOR MIGRATION** | Dumps **only** what is in the live database. Running it against Neon today will export only 42 products, 17 categories, and 1 branch, completely missing 109 products and all `ProductImage` rows. |
| `scripts/import-menu.mjs` | Imports `data/menu.ts` to DB | ❌ **UNSAFE & INCOMPLETE** | 1. Generates new random UUIDs (`gen_random_uuid()`), breaking stable ID links.<br>2. Does not insert `ProductImage` records.<br>3. Does not import `OptionGroup`, `OptionItem`, or `ProductOptionGroup` (modifiers).<br>4. Hardcodes `serviceChargePct = 12` in settings.<br>5. Does not populate branch phones or whatsapp numbers. |
| `scripts/verify-backup-and-restore.mjs` | Clones backup JSON into test schema | ⚠️ **SAFE FOR AUDIT, BUT INCOMPLETE** | Validates schema restoration into `isolated_restore_test`, but its base JSON (`backup-naqer-verified.json`) has 0 records in `OptionGroup`, `OptionItem`, and `ProductOptionGroup`. |
| `scripts/verify-final-db-integrity.mjs` | Read-only integrity check | ✅ **SAFE & EFFECTIVE** | 100% read-only (`SELECT COUNT(*)`). Perfect for post-import validation. |
| `scripts/provision-owner.mjs` | Creates/updates OWNER account | ✅ **SAFE & RECOMMENDED** | Uses `bcrypt` (12 rounds), respects existing records, does not print passwords, and enforces `MUST_CHANGE_PASSWORD`. |

---

## 2. Technical Requirements for Safe Destination Database Import

### A. Schema Compatibility & Enum Creation
- The PostgreSQL schema relies on 10 custom ENUM types:
  - `AdminRole`: `('OWNER', 'ADMIN', 'EDITOR', 'ORDERS_STAFF')`
  - `MenuGroup`: `('FOOD', 'DRINKS')`
  - `CategoryLayout`: `('TRAYS', 'LIST')`
  - `ProductBadge`: `('SIGNATURE', 'OFFER')`
  - `OfferType`: `('PERCENTAGE', 'FIXED_AMOUNT', 'SPECIAL_PRICE', 'BUNDLE', 'BUY_X_GET_Y')`
  - `OrderType`: `('DELIVERY', 'TAKEAWAY')`
  - `OrderStatus`: `('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')`
  - `PaymentMethod`: `('CASH', 'CARD')`
  - `ImportJobStatus`: `('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED')`
  - `ImportItemStatus`: `('OK', 'SKIPPED', 'FAILED')`
- **Safety Rule:** Types must be created using `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` to prevent fatal aborts on existing schemas.

### B. Foreign Key Dependency Ordering
To prevent foreign key constraint violations (`violates foreign key constraint`), tables must be populated in strict dependency order:
```
1. RestaurantSettings
2. Branch
3. Category (excluding test 'سبانخ')
4. Section (excluding section for 'سبانخ')
5. Product (151 items)
6. ProductVariant (167 price pills)
7. ProductImage (151 images)
8. OptionGroup (7 groups)
9. OptionItem (20 items)
10. ProductOptionGroup (104 product mappings)
11. AdminUser (New client OWNER account)
12. _prisma_migrations (Base migrations tracking)
```

### C. ID Preservation & Integrity
- All Product IDs, Variant IDs, OptionGroup IDs, and Category slugs must match the exact IDs from `backups/backup-naqer-verified.json` and `PRODUCT_IMAGE_MAPPING.csv`.
- Never generate random UUIDs during migration, because the image mappings and modifier relationships rely on fixed identifiers.

### D. Transaction & Rollback Guarantees
- The entire import must execute inside a single atomic transaction (`BEGIN ... COMMIT`).
- If any table insertion fails, the transaction must roll back cleanly (`ROLLBACK`), leaving the destination database empty rather than partially populated.

---

## 3. Safe Execution Plan (Gated for Phase 9)

When authorized, the migration will execute using an orchestrated, zero-code-change runner that:
1. Connects to the **destination** database only.
2. Runs Prisma migrations or DDL generation to build the clean schema.
3. Injects the authoritative 151 products, 17 categories, 2 branches, 167 variants, 151 product images, and 104 modifier links.
4. Invokes `scripts/provision-owner.mjs` to create the client's fresh `OWNER` administrative account.
5. Runs `scripts/verify-final-db-integrity.mjs` against the destination database to prove 100% record matching.
