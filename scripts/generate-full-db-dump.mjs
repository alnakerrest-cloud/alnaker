import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function generateFullDump() {
  console.log('=== GENERATING FULL-FIDELITY POSTGRESQL DUMP ===\n');

  let sql = `-- NAQER MENU FULL-FIDELITY DATABASE DUMP\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Engine: PostgreSQL (Neon Cloud DB)\n\n`;
  sql += `SET statement_timeout = 0;\n`;
  sql += `SET client_encoding = 'UTF8';\n`;
  sql += `SET standard_conforming_strings = on;\n\n`;

  // 1. Enums
  console.log('[1/5] Extracting ENUM types...');
  const enumsRes = await pool.query(`
    SELECT t.typname as name, e.enumlabel as label
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `);

  const enumsMap = {};
  for (const row of enumsRes.rows) {
    enumsMap[row.name] = enumsMap[row.name] || [];
    enumsMap[row.name].push(row.label);
  }

  for (const [name, values] of Object.entries(enumsMap)) {
    const valStr = values.map(v => `'${v}'`).join(', ');
    sql += `DO $$ BEGIN\n  CREATE TYPE "${name}" AS ENUM (${valStr});\nEXCEPTION WHEN duplicate_object THEN NULL; END $$;\n\n`;
  }

  // 2. Tables in dependency order
  console.log('[2/5] Extracting Table DDL...');
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const tables = tablesRes.rows.map(r => r.table_name);

  for (const t of tables) {
    // Columns
    const colsRes = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [t]);

    sql += `CREATE TABLE IF NOT EXISTS "${t}" (\n`;
    const colDefs = colsRes.rows.map(c => {
      let type = c.udt_name;
      if (c.data_type === 'USER-DEFINED') {
        type = `"${c.udt_name}"`;
      } else if (c.data_type === 'character varying') {
        type = c.character_maximum_length ? `VARCHAR(${c.character_maximum_length})` : 'TEXT';
      } else if (c.data_type === 'numeric') {
        type = c.numeric_precision ? `DECIMAL(${c.numeric_precision}, ${c.numeric_scale || 0})` : 'NUMERIC';
      } else if (c.data_type === 'timestamp without time zone') {
        type = 'TIMESTAMP(3)';
      } else if (c.data_type === 'ARRAY') {
        type = `${c.udt_name.replace(/^_/, '')}[]`;
      } else if (c.data_type === 'jsonb' || c.data_type === 'json') {
        type = 'JSONB';
      } else if (c.data_type === 'boolean') {
        type = 'BOOLEAN';
      } else if (c.data_type === 'integer') {
        type = 'INTEGER';
      } else if (c.data_type === 'text') {
        type = 'TEXT';
      }

      let def = `  "${c.column_name}" ${type}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default !== null) def += ` DEFAULT ${c.column_default}`;
      return def;
    });

    // Primary key
    const pkRes = await pool.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1 AND tc.table_schema = 'public'
      ORDER BY kcu.ordinal_position
    `, [t]);

    if (pkRes.rows.length > 0) {
      const pkCols = pkRes.rows.map(r => `"${r.column_name}"`).join(', ');
      colDefs.push(`  CONSTRAINT "${t}_pkey" PRIMARY KEY (${pkCols})`);
    }

    sql += colDefs.join(',\n') + '\n);\n\n';
  }

  // 3. Foreign Keys
  console.log('[3/5] Extracting Foreign Key Constraints...');
  const fkRes = await pool.query(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `);

  for (const fk of fkRes.rows) {
    sql += `ALTER TABLE "${fk.table_name}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}";\n`;
    sql += `ALTER TABLE "${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES "${fk.foreign_table_name}" ("${fk.foreign_column_name}") ON DELETE ${fk.delete_rule};\n`;
  }
  sql += '\n';

  // 4. Indexes
  console.log('[4/5] Extracting Indexes...');
  const idxRes = await pool.query(`
    SELECT indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
  `);
  for (const idx of idxRes.rows) {
    // Strip hardcoded "public." so the index builds in the active search_path
    const cleaned = idx.indexdef.replace(/\bpublic\./g, '');
    sql += `${cleaned};\n`;
  }
  sql += '\n';

  // 5. Data rows
  console.log('[5/5] Extracting Data Rows for all 20 tables...');
  // Dependency order for data insertion:
  const orderedTables = [
    'RestaurantSettings',
    'Branch',
    'Category',
    'Section',
    'Product',
    'ProductVariant',
    'ProductImage',
    'OptionGroup',
    'OptionItem',
    'ProductOptionGroup',
    'Offer',
    'OfferProductTarget',
    'OfferCategoryTarget',
    'OfferLocationTarget',
    'AdminUser',
    'Session',
    'ImportJob',
    'ImportItem',
    'AuditLog',
    '_prisma_migrations'
  ];

  for (const t of orderedTables) {
    const dataRes = await pool.query(`SELECT * FROM public."${t}"`);
    if (dataRes.rows.length === 0) continue;

    const cols = Object.keys(dataRes.rows[0]);
    const colList = cols.map(c => `"${c}"`).join(', ');

    for (const row of dataRes.rows) {
      const valList = cols.map(c => {
        const val = row[c];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean' || typeof val === 'number') return val;
        if (val instanceof Date) return `'${val.toISOString()}'`;
        if (Array.isArray(val)) {
          const escArr = val.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
          return `'{${escArr}}'`;
        }
        if (typeof val === 'object') {
          return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
        }
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');

      sql += `INSERT INTO "${t}" (${colList}) VALUES (${valList}) ON CONFLICT DO NOTHING;\n`;
    }
    console.log(`  - Exported ${t}: ${dataRes.rows.length} rows`);
  }

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const dumpFilePath = path.join(backupDir, 'naqer-full-production-backup.sql');
  fs.writeFileSync(dumpFilePath, sql, 'utf8');

  const sizeKb = (fs.statSync(dumpFilePath).size / 1024).toFixed(1);
  console.log(`\n[FULL DUMP CREATED] Saved to ${dumpFilePath} (${sizeKb} KB)`);
  await pool.end();
}

generateFullDump().catch(err => {
  console.error('[FATAL DUMP ERROR]:', err);
  process.exit(1);
});
