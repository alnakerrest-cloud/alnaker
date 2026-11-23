import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.staging.local', quiet: true });

const APPROVED_STAGING_PREFIX = 'ep-ancient-hill-beec491j';
const FORBIDDEN_TARGETS = ['ep-soft-dawn-bdu5de43', 'ep-withered-bread-bemwq8ns'];
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.includes(APPROVED_STAGING_PREFIX)) {
  console.error(`[FATAL] Script must strictly run on approved Staging database (${APPROVED_STAGING_PREFIX})!`);
  process.exit(1);
}
for (const forbidden of FORBIDDEN_TARGETS) {
  if (databaseUrl.includes(forbidden)) {
    console.error(`[FATAL] Script refused: database matches forbidden target: ${forbidden}`);
    process.exit(1);
  }
}

const pool = new pg.Pool({ connectionString: databaseUrl, ssl: true });

export const QA_USERS = {
  activeOwner: {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'qa-owner@naqer-menu.local',
    password: 'Password123!',
    displayName: 'QA Active Owner',
    role: 'OWNER',
    isActive: true,
    mustChangePassword: false,
  },
  mustChangeOwner: {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'qa-mustchange@naqer-menu.local',
    password: 'TempPassword123!',
    newPassword: 'NewSecurePassword456!',
    displayName: 'QA Must Change Owner',
    role: 'OWNER',
    isActive: true,
    mustChangePassword: true,
  },
  disabledOwner: {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'qa-disabled@naqer-menu.local',
    password: 'Password123!',
    displayName: 'QA Disabled Owner',
    role: 'OWNER',
    isActive: false,
    mustChangePassword: false,
  },
  activeEditor: {
    id: 'a0000000-0000-0000-0000-000000000004',
    email: 'qa-editor@naqer-menu.local',
    password: 'Password123!',
    displayName: 'QA Active Editor',
    role: 'EDITOR',
    isActive: true,
    mustChangePassword: false,
  },
};

export async function setupQaUsers() {
  console.log(`[QA SETUP] Provisioning test users on Staging: ${APPROVED_STAGING_PREFIX}...`);
  for (const u of Object.values(QA_USERS)) {
    await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [u.id]);
    await pool.query('DELETE FROM "AdminUser" WHERE id = $1 OR email = $2', [u.id, u.email]);
    const pHash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO "AdminUser" (id, email, "displayName", role, "isActive", "mustChangePassword", "passwordHash", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [u.id, u.email, u.displayName, u.role, u.isActive, u.mustChangePassword, pHash]
    );
    console.log(`  Provisioned: ${u.email} (Role: ${u.role}, Active: ${u.isActive}, MustChange: ${u.mustChangePassword})`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('qa-setup-staging-users.mjs')) {
  setupQaUsers()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
      process.exit(1);
    });
}
