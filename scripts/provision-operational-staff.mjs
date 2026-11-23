// scripts/provision-operational-staff.mjs
// ==============================================================================
// Safe Production Provisioning Script for Operational Staff Accounts
// ==============================================================================
// Target Accounts:
// 1. manager@naqer.com -> Role: ADMIN (Operations supervision / store management)
// 2. orders@naqer.com  -> Role: ORDERS_STAFF (Orders processing & fulfillment)
// 3. cashier@naqer.com -> Role: ORDERS_STAFF (Front-counter cashier & payments)
// ==============================================================================
// Safeguards:
// - Atomic PostgreSQL Transaction.
// - Strict Duplicate Check (aborts if any account already exists).
// - Unique cryptographically random temporary password per account.
// - Password hashing using bcrypt (rounds = 12).
// - mustChangePassword = true enforced.
// - Redundant sync with data/users/users.json.
// - ZERO passwords or password hashes printed to logs/console.
// - Credentials saved securely to private credentials file for owner handoff.
// ==============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ACCOUNTS_TO_PROVISION = [
  {
    email: 'manager@naqer.com',
    role: 'ADMIN',
    displayName: 'مشرف العمليات والتشغيل',
    description: 'إشراف العمليات والمطعم ومتابعة الطلبات وتعيين حالات التشغيل'
  },
  {
    email: 'orders@naqer.com',
    role: 'ORDERS_STAFF',
    displayName: 'إدارة وتجهيز الطلبات',
    description: 'استقبال وتأكيد وتجهيز الطلبات ومتابعة التوصيل'
  },
  {
    email: 'cashier@naqer.com',
    role: 'ORDERS_STAFF',
    displayName: 'أمين الصندوق (الكاشير)',
    description: 'محاسبة الكاونتر، التحقق من أكواد الاستلام، وتأكيد تحصيل المدفوعات'
  }
];

function generateSecurePassword(length = 20) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()-_=+';
  const allChars = upper + lower + digits + symbols;

  let pwd = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  for (let i = pwd.length; i < length; i++) {
    pwd.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Shuffle array securely
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  return pwd.join('');
}

async function main() {
  console.log('================================================================');
  console.log('[PROVISIONING] Starting Operational Staff Accounts Setup');
  console.log('================================================================');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[ERROR] DATABASE_URL is missing in environment.');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();

  try {
    // 1. Check for duplicate accounts in PostgreSQL
    console.log('[1/5] Verifying existing accounts to prevent duplicates...');
    const targetEmails = ACCOUNTS_TO_PROVISION.map(a => a.email.toLowerCase());
    const existingCheck = await client.query(
      `SELECT id, email, role FROM "AdminUser" WHERE email = ANY($1::text[])`,
      [targetEmails]
    );

    if (existingCheck.rows.length > 0) {
      const existingList = existingCheck.rows.map(r => `${r.email} (${r.role})`).join(', ');
      console.error(`[ABORT] Cannot proceed: Duplicate accounts already exist: ${existingList}`);
      process.exit(1);
    }
    console.log('  - Pre-check verified: 0 conflicting accounts found.');

    // 2. Prepare credentials and hashes in memory
    console.log('[2/5] Generating unique strong credentials and bcrypt hashes...');
    const provisionData = [];
    for (const acc of ACCOUNTS_TO_PROVISION) {
      const plainPassword = generateSecurePassword(20);
      const passwordHash = await bcrypt.hash(plainPassword, 12);
      const id = `usr-staff-${crypto.randomUUID()}`;
      
      provisionData.push({
        id,
        email: acc.email.toLowerCase(),
        role: acc.role,
        displayName: acc.displayName,
        description: acc.description,
        passwordHash,
        plainPassword, // Kept in memory only, saved to secure credentials file, never logged
      });
    }
    console.log(`  - Generated secure credentials and hashes for ${provisionData.length} accounts.`);

    // 3. Execute atomic transaction in PostgreSQL
    console.log('[3/5] Executing atomic PostgreSQL provisioning transaction...');
    await client.query('BEGIN');

    for (const item of provisionData) {
      await client.query(
        `INSERT INTO "AdminUser" (id, email, "passwordHash", "displayName", role, "isActive", "mustChangePassword", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, true, now(), now())`,
        [item.id, item.email, item.passwordHash, item.displayName, item.role]
      );
      console.log(`  - Inserted account: ${item.email} (Role: ${item.role}, mustChangePassword: true)`);
    }

    await client.query('COMMIT');
    console.log('  - Transaction committed successfully.');

    // 4. Update data/users/users.json for local redundancy
    console.log('[4/5] Synchronizing local file backup (data/users/users.json)...');
    const usersJsonPath = path.join(process.cwd(), 'data', 'users', 'users.json');
    let localUsers = [];
    if (fs.existsSync(usersJsonPath)) {
      try {
        localUsers = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
      } catch (e) {
        localUsers = [];
      }
    }

    const nowIso = new Date().toISOString();
    for (const item of provisionData) {
      const existsInFile = localUsers.some(u => u.email.toLowerCase() === item.email);
      if (!existsInFile) {
        localUsers.push({
          id: item.id,
          email: item.email,
          passwordHash: item.passwordHash,
          displayName: item.displayName,
          role: item.role,
          isActive: true,
          mustChangePassword: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    fs.mkdirSync(path.dirname(usersJsonPath), { recursive: true });
    fs.writeFileSync(usersJsonPath, JSON.stringify(localUsers, null, 2), 'utf8');
    console.log(`  - local users.json updated (total users: ${localUsers.length}).`);

    // 5. Save secure credentials file for owner handoff (strictly gitignored)
    console.log('[5/5] Writing private credentials file for owner handoff...');
    const credsDir = path.join(process.cwd(), 'credentials');
    if (!fs.existsSync(credsDir)) {
      fs.mkdirSync(credsDir, { recursive: true });
    }

    const credsFilePath = path.join(credsDir, 'production-staff-credentials.json');
    const credsFileContent = {
      generatedAt: new Date().toISOString(),
      warning: 'CONFIDENTIAL: Initial temporary operational staff credentials. Keep secure and distribute through authorized channels.',
      accounts: provisionData.map(item => ({
        id: item.id,
        email: item.email,
        displayName: item.displayName,
        assignedRole: item.role,
        mustChangePassword: true,
        temporaryPassword: item.plainPassword,
      }))
    };

    fs.writeFileSync(credsFilePath, JSON.stringify(credsFileContent, null, 2), 'utf8');
    console.log(`  - Credentials file securely generated at: ${credsFilePath}`);
    console.log('  - Note: Password hashes and raw passwords were NOT printed to console logs.');

    console.log('================================================================');
    console.log('[PROVISIONING SUCCESS] All 3 operational accounts successfully created.');
    console.log('================================================================');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PROVISIONING FAILED] Transaction rolled back due to error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
