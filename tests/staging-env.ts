import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const ROOT = process.cwd();
const STAGING_PROJECT_ID = 'ep-ancient-hill-beec491j';
const FORBIDDEN_TARGETS = [
  'ep-soft-dawn-bdu5de43',     // Production menu data
  'ep-withered-bread-bemwq8ns' // Retired/suspended cluster
];
let loaded = false;
let loadedDatabaseUrl = '';

export function sanitizeUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      provider: 'Neon',
      hostPrefix: (u.hostname.split('.')[0] || '').slice(0, 40),
      database: u.pathname.replace(/^\//, '') || '(none)',
      sslmode: u.searchParams.get('sslmode') || '(unset)',
    };
  } catch {
    return { provider: 'unknown', hostPrefix: '(invalid)', database: '(invalid)', sslmode: '(unset)' };
  }
}

export function hasCloudinary() {
  if (process.env.NAQER_TEST_ENV === 'staging' && process.env.STAGING_CLOUDINARY_ENABLED !== '1') return false;
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function loadStagingEnv(opts: { requireCloudinary?: boolean } = {}) {
  const stagingPath = path.join(ROOT, '.env.staging.local');
  const basePath = path.join(ROOT, '.env.local');

  if (!fs.existsSync(stagingPath)) {
    throw new Error('STAGING ENV MISSING: .env.staging.local is required for staging/E2E execution. Refusing to fall back to production/local env.');
  }
  const staging = dotenv.parse(fs.readFileSync(stagingPath));
  if (staging.NAQER_TEST_ENV !== 'staging' || staging.STAGING_MODE !== '1') {
    throw new Error('STAGING ENV INVALID: explicit NAQER_TEST_ENV=staging and STAGING_MODE=1 are required in .env.staging.local');
  }

  const dbUrl = staging.DATABASE_URL || '';
  if (!dbUrl) throw new Error('STAGING ENV INVALID: DATABASE_URL missing in .env.staging.local');
  let host = '';
  try { host = new URL(dbUrl).hostname; } catch { throw new Error('STAGING ENV INVALID: DATABASE_URL is not parseable'); }

  if (!host.endsWith('.neon.tech') || !host.startsWith(`${STAGING_PROJECT_ID}-`)) {
    throw new Error('STAGING GUARD REFUSAL: configured database host is not the approved staging Neon project');
  }
  for (const forbidden of FORBIDDEN_TARGETS) {
    if (host.includes(forbidden)) {
      throw new Error(`STAGING GUARD REFUSAL: configured database host matches forbidden target: ${forbidden}`);
    }
  }

  const stagingUrl = new URL(dbUrl);
  if (fs.existsSync(basePath)) {
    const production = dotenv.parse(fs.readFileSync(basePath));
    if (production.DATABASE_URL) {
      let productionUrl: URL;
      try { productionUrl = new URL(production.DATABASE_URL); } catch { throw new Error('STAGING GUARD REFUSAL: local production database target is invalid'); }
      if (stagingUrl.hostname === productionUrl.hostname) {
        throw new Error('STAGING GUARD REFUSAL: staging database target matches the local production target');
      }
    }
    const cloudEnabled = staging.STAGING_CLOUDINARY_ENABLED === '1';
    const cloudKeysPresent = Boolean(staging.CLOUDINARY_CLOUD_NAME || staging.CLOUDINARY_API_KEY || staging.CLOUDINARY_API_SECRET);
    if (cloudEnabled && (!staging.CLOUDINARY_CLOUD_NAME || !staging.CLOUDINARY_API_KEY ||
        !staging.CLOUDINARY_API_SECRET || !staging.CLOUDINARY_SECURE_FOLDER)) {
      throw new Error('STAGING ENV INVALID: complete Cloudinary credentials and an explicit staging folder are required');
    }
    if (cloudKeysPresent && !cloudEnabled) {
      throw new Error('STAGING ENV INVALID: Cloudinary credentials require STAGING_CLOUDINARY_ENABLED=1');
    }
    if (cloudEnabled && staging.CLOUDINARY_CLOUD_NAME === production.CLOUDINARY_CLOUD_NAME &&
        (!production.CLOUDINARY_SECURE_FOLDER ||
         staging.CLOUDINARY_SECURE_FOLDER === production.CLOUDINARY_SECURE_FOLDER)) {
      throw new Error('STAGING GUARD REFUSAL: staging Cloudinary folder is not distinct from the production folder');
    }
  }

  if (!staging.SESSION_SECRET) throw new Error('STAGING ENV INVALID: SESSION_SECRET missing in .env.staging.local');
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== dbUrl) {
    throw new Error('STAGING GUARD REFUSAL: process DATABASE_URL conflicts with .env.staging.local');
  }
  if (process.env.NAQER_TEST_ENV && process.env.NAQER_TEST_ENV !== 'staging' ||
      process.env.STAGING_MODE && process.env.STAGING_MODE !== '1') {
    throw new Error('STAGING GUARD REFUSAL: process staging markers conflict with .env.staging.local');
  }
  if (loaded && loadedDatabaseUrl !== dbUrl) {
    throw new Error('STAGING GUARD REFUSAL: staging database target changed after initialization');
  }

  for (const [k, v] of Object.entries(staging)) process.env[k] = v;
  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    process.env[key] = staging[key] || '';
  }
  process.env.CLOUDINARY_SECURE_FOLDER = staging.CLOUDINARY_SECURE_FOLDER || 'naqer-menu-staging';
  process.env.STAGING_CLOUDINARY_ENABLED = staging.STAGING_CLOUDINARY_ENABLED === '1' ? '1' : '0';
  process.env.DATABASE_URL = dbUrl;
  process.env.NAQER_TEST_ENV = 'staging';
  process.env.STAGING_MODE = '1';
  loaded = true;
  loadedDatabaseUrl = dbUrl;
  if (opts.requireCloudinary && !hasCloudinary()) {
    throw new Error('STAGING BLOCKED: dedicated Cloudinary credentials are not configured in .env.staging.local');
  }
  return { meta: sanitizeUrl(dbUrl), cloudinary: hasCloudinary() };
}
