// scripts/provision-production-accounts.mjs
// ==============================================================================
// Safe Production Accounts Provisioning Script
// Provisions:
// 1. admin@naqer.com (OWNER)
// 2. manager@naqer.com (ADMIN)
// 3. orders@naqer.com (ORDERS_STAFF)
// 4. cashier@naqer.com (ORDERS_STAFF)
//
// Rules:
// - Idempotent (never duplicates or overwrites without explicit authorization)
// - Bcrypt 12 rounds
// - mustChangePassword: true
// - Zero password logging to console
// - Saves handover credentials to isolated local json
// ==============================================================================

import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';

const DB_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9ruYQlds5vTx@ep-aged-feather-bej8rk3r-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let pwd = '';
  for (let i = 0; i < 16; i++) {
    const byte = crypto.randomBytes(1)[0];
    pwd += chars.charAt(byte % chars.length);
  }
  return pwd;
}

const ACCOUNTS = [
  {
    email: 'admin@naqer.com',
    displayName: 'إبراهيم شعيب (مدير عام المطعم)',
    role: 'OWNER',
    mustChangePassword: true,
  },
  {
    email: 'manager@naqer.com',
    displayName: 'مدير العمليات (Operations Manager)',
    role: 'ADMIN',
    mustChangePassword: true,
  },
  {
    email: 'orders@naqer.com',
    displayName: 'إدارة الطلبات (Orders Supervisor)',
    role: 'ORDERS_STAFF',
    mustChangePassword: true,
  },
  {
    email: 'cashier@naqer.com',
    displayName: 'كاشير المطعم (Cashier Staff)',
    role: 'ORDERS_STAFF',
    mustChangePassword: true,
  },
];

async function main() {
  console.log('[PROVISION] Connecting to production Neon cluster...');
  const pool = new pg.Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const handoverRecords = [];

  try {
    for (const acc of ACCOUNTS) {
      const existing = await pool.query(
        'SELECT id, email, role, "isActive", "mustChangePassword" FROM "AdminUser" WHERE email = $1',
        [acc.email]
      );

      if (existing.rows.length > 0) {
        console.log(`[PROVISION NOTICE] Account "${acc.email}" already exists (Role: ${existing.rows[0].role}). Skipping.`);
        continue;
      }

      const rawPassword = generateSecurePassword();
      const passwordHash = await bcrypt.hash(rawPassword, 12);

      const res = await pool.query(
        `INSERT INTO "AdminUser" (
          id, email, "passwordHash", "displayName", role, "isActive", "mustChangePassword", "createdAt", "updatedAt"
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4::"AdminRole", true, $5, NOW(), NOW())
        RETURNING id, email, "displayName", role, "isActive", "mustChangePassword"`,
        [acc.email, passwordHash, acc.displayName, acc.role, acc.mustChangePassword]
      );

      const created = res.rows[0];
      console.log(`[PROVISION SUCCESS] Created account: ${created.email} | Role: ${created.role} | mustChangePassword: ${created.mustChangePassword}`);

      handoverRecords.push({
        id: created.id,
        email: acc.email,
        displayName: acc.displayName,
        role: acc.role,
        mustChangePassword: acc.mustChangePassword,
        temporaryPassword: rawPassword,
      });
    }

    if (handoverRecords.length > 0) {
      const handoverPath = 'PRODUCTION_ACCOUNTS_HANDOVER.json';
      fs.writeFileSync(handoverPath, JSON.stringify(handoverRecords, null, 2), { mode: 0o600 });
      console.log(`[PROVISION] Handover credentials written to ${handoverPath} (DO NOT COMMIT).`);
    }

    const totalAdmins = await pool.query('SELECT count(*)::int as cnt FROM "AdminUser"');
    console.log(`[PROVISION] Total accounts in database: ${totalAdmins.rows[0].cnt}`);

    // Verify all 4 accounts
    const allUsers = await pool.query('SELECT id, email, "displayName", role, "isActive", "mustChangePassword" FROM "AdminUser" ORDER BY "createdAt" ASC');
    console.log('\n--- VERIFIED PRODUCTION ACCOUNTS ---');
    for (const u of allUsers.rows) {
      console.log(`- ${u.email.padEnd(22)} | Role: ${u.role.padEnd(14)} | Active: ${u.isActive} | MustChange: ${u.mustChangePassword} | Name: ${u.displayName}`);
    }

  } catch (err) {
    console.error('[PROVISION ERROR]', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
