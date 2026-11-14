// Safe Production OWNER Account Provisioning Script
// Idempotent and non-destructive:
// - If account does not exist: creates it.
// - If account already exists: stops and requires explicit confirmation (ALLOW_OWNER_OVERWRITE=1).
// - NEVER logs or prints passwords or password hashes.

import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local', quiet: true });

async function provisionOwner() {
  const email = (process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD || process.env.ADMIN_PASSWORD || '';
  const displayName = (process.env.OWNER_NAME || process.env.ADMIN_NAME || 'مدير النظام').trim();
  const allowOverwrite = process.env.ALLOW_OWNER_OVERWRITE === '1';

  if (!email || !email.includes('@')) {
    console.error('[PROVISION ERROR] A valid OWNER_EMAIL (or ADMIN_EMAIL) must be provided.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('[PROVISION ERROR] A secure OWNER_PASSWORD (or ADMIN_PASSWORD) of at least 8 characters must be provided.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[PROVISION ERROR] DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: true,
    connectionTimeoutMillis: 10000
  });

  try {
    const existing = await pool.query(
      'SELECT id, email, "isActive", role FROM "AdminUser" WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      if (!allowOverwrite) {
        console.warn(`[PROVISION BLOCKED] Account with email "${email}" already exists.`);
        console.warn('To prevent accidental credential resets, overwrite was aborted.');
        console.warn('To explicitly update credentials for this existing account, re-run with: ALLOW_OWNER_OVERWRITE=1');
        process.exit(0);
      }

      // Additional protection in production: requires explicit CONFIRM_PRODUCTION_OVERWRITE matching email
      if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_PRODUCTION_OVERWRITE !== email) {
        console.error(`[PROVISION REFUSED] In production, overwriting an existing account requires CONFIRM_PRODUCTION_OVERWRITE="${email}"`);
        process.exit(1);
      }

      const mustChange = process.env.MUST_CHANGE_PASSWORD === '1';
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        'UPDATE "AdminUser" SET "passwordHash" = $1, "isActive" = true, role = \'OWNER\', "displayName" = $2, "mustChangePassword" = $3, "updatedAt" = now() WHERE email = $4',
        [passwordHash, displayName, mustChange, email]
      );
      console.log(`[PROVISION SUCCESS] Explicitly updated credentials for existing OWNER account: "${email}" (mustChangePassword=${mustChange}).`);
    } else {
      const mustChange = process.env.MUST_CHANGE_PASSWORD === '1';
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO "AdminUser" (id, email, "passwordHash", "displayName", role, "isActive", "mustChangePassword", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, 'OWNER', true, $4, now(), now())`,
        [email, passwordHash, displayName, mustChange]
      );
      console.log(`[PROVISION SUCCESS] Successfully created new OWNER account: "${email}" (mustChangePassword=${mustChange}).`);
    }

    const totalAdmins = await pool.query('SELECT count(*)::int as cnt FROM "AdminUser"');
    console.log(`[PROVISION] Total administrative accounts in database: ${totalAdmins.rows[0].cnt}`);
  } catch (err) {
    console.error('[PROVISION ERROR] Database operation failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

provisionOwner();

