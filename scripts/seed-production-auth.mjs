import fs from 'node:fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const ROUNDS = 12;

function getDbUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const files = ['.env.prod.bak', '.env.local', '.env'];
  for (const f of files) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('DATABASE_URL')) {
          const parts = trimmed.split('=');
          if (parts.length >= 2) {
            let val = parts.slice(1).join('=').trim();
            val = val.replace(/^["']/, '').replace(/["']$/, '');
            return val;
          }
        }
      }
    }
  }
  return null;
}

const ACCOUNTS = [
  {
    id: 'usr-admin-owner-001',
    email: 'admin@naqer-restaurant.local',
    plainPassword: 'NaqerOwner#2026!94',
    displayName: 'إبراهيم شعيب (مدير عام المطعم)',
    role: 'OWNER',
  },
  {
    id: 'usr-admin-ibrahim-003',
    email: 'ibrahimshoeib255@gmail.com',
    plainPassword: 'Test1234',
    displayName: 'إبراهيم شعيب',
    role: 'OWNER',
  },
  {
    id: 'usr-admin-staff-002',
    email: 'orders-staff@naqer-restaurant.local',
    plainPassword: 'NaqerStaff#2026!OrdZ',
    displayName: 'موظف استقبال وتجهيز الطلبات',
    role: 'ORDERS_STAFF',
  },
];

async function seed() {
  console.log('🚀 Starting Idempotent Production Auth Seed...');

  const dbUrl = getDbUrl();
  if (!dbUrl) {
    console.error('❌ FATAL: No DATABASE_URL found.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  const results = [];

  try {
    // 1. Ensure AdminRole enum has all required roles
    await pool.query(`ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'OWNER';`);
    await pool.query(`ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'ADMIN';`);
    await pool.query(`ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'EDITOR';`);
    await pool.query(`ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'ORDERS_STAFF';`);

    for (const acc of ACCOUNTS) {
      const normalizedEmail = acc.email.trim().toLowerCase();
      const passwordHash = await bcrypt.hash(acc.plainPassword, ROUNDS);

      // Check if user exists by email (case-insensitive)
      const existing = await pool.query(
        `SELECT id, email, role, "isActive" FROM "AdminUser" WHERE LOWER(email) = $1`,
        [normalizedEmail]
      );

      if (existing.rows.length > 0) {
        const user = existing.rows[0];
        await pool.query(
          `UPDATE "AdminUser" 
           SET "passwordHash" = $1, 
               role = $2::"AdminRole", 
               "isActive" = true, 
               "mustChangePassword" = false, 
               "displayName" = $3,
               "updatedAt" = NOW()
           WHERE id = $4`,
          [passwordHash, acc.role, acc.displayName, user.id]
        );
        results.push({ email: acc.email, role: acc.role, status: 'updated' });
      } else {
        await pool.query(
          `INSERT INTO "AdminUser" (id, email, "passwordHash", "displayName", role, "isActive", "mustChangePassword", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5::"AdminRole", true, false, NOW(), NOW())`,
          [acc.id, normalizedEmail, passwordHash, acc.displayName, acc.role]
        );
        results.push({ email: acc.email, role: acc.role, status: 'created' });
      }
    }

    // 2. Also keep local data/users/users.json in sync for offline resilience
    const usersJsonPath = 'data/users/users.json';
    try {
      const usersDir = 'data/users';
      if (!fs.existsSync(usersDir)) fs.mkdirSync(usersDir, { recursive: true });
      let localUsers = [];
      if (fs.existsSync(usersJsonPath)) {
        try {
          localUsers = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
        } catch {}
      }
      for (const acc of ACCOUNTS) {
        const normalizedEmail = acc.email.trim().toLowerCase();
        const hash = await bcrypt.hash(acc.plainPassword, ROUNDS);
        const idx = localUsers.findIndex(u => u.email.toLowerCase() === normalizedEmail);
        if (idx >= 0) {
          localUsers[idx].passwordHash = hash;
          localUsers[idx].role = acc.role;
          localUsers[idx].isActive = true;
          localUsers[idx].mustChangePassword = false;
          localUsers[idx].displayName = acc.displayName;
          localUsers[idx].updatedAt = new Date().toISOString();
        } else {
          localUsers.push({
            id: acc.id,
            email: normalizedEmail,
            passwordHash: hash,
            displayName: acc.displayName,
            role: acc.role,
            isActive: true,
            mustChangePassword: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      fs.writeFileSync(usersJsonPath, JSON.stringify(localUsers, null, 2), 'utf8');
      console.log('✅ Local data/users/users.json synchronized.');
    } catch (e) {
      console.warn('Warning: Could not sync local users.json:', e.message);
    }

    console.log('🎉 Seed execution finished successfully:');
    for (const r of results) {
      console.log(`- ${r.role} (${r.email}): ${r.status}`);
    }

  } catch (err) {
    console.error('❌ Seed execution failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
