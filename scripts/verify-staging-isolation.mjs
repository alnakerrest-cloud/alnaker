import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const ROOT = process.cwd();
const prodPath = path.join(ROOT, '.env.local');
const stagingPath = path.join(ROOT, '.env.staging.local');

if (!fs.existsSync(stagingPath)) {
  console.error('ISOLATION CHECK FAILED: .env.staging.local does not exist.');
  process.exit(1);
}

const prodEnv = fs.existsSync(prodPath) ? dotenv.parse(fs.readFileSync(prodPath)) : {};
const stagingEnv = dotenv.parse(fs.readFileSync(stagingPath));

const stagingDbUrl = stagingEnv.DATABASE_URL;
if (!stagingDbUrl) {
  console.error('ISOLATION CHECK FAILED: DATABASE_URL missing in .env.staging.local.');
  process.exit(1);
}

const prodDbUrl = prodEnv.DATABASE_URL || '';

let stagingParsed, prodParsed;
try {
  stagingParsed = new URL(stagingDbUrl);
} catch (e) {
  console.error('ISOLATION CHECK FAILED: Invalid staging DATABASE_URL format.');
  process.exit(1);
}

if (prodDbUrl) {
  try {
    prodParsed = new URL(prodDbUrl);
  } catch (e) {}
}

const stagingHost = stagingParsed.hostname;
const prodHost = prodParsed ? prodParsed.hostname : '';

const stagingProject = stagingHost.split('.')[0] || '';
const prodProject = prodHost.split('.')[0] || '';

const APPROVED_STAGING_PREFIX = 'ep-ancient-hill-beec491j';
const FORBIDDEN_TARGETS = [
  'ep-soft-dawn-bdu5de43',     // Production menu data
  'ep-withered-bread-bemwq8ns' // Retired/suspended cluster
];

// Hard refusal rules:
if (prodHost && stagingHost === prodHost) {
  console.error('CRITICAL ISOLATION REFUSAL: Staging host matches production host exactly!');
  process.exit(1);
}

if (prodProject && stagingProject === prodProject) {
  console.error('CRITICAL ISOLATION REFUSAL: Staging project matches production project identifier!');
  process.exit(1);
}

for (const forbidden of FORBIDDEN_TARGETS) {
  if (stagingHost.includes(forbidden)) {
    console.error(`CRITICAL ISOLATION REFUSAL: Staging host matches forbidden production target: ${forbidden}`);
    process.exit(1);
  }
}

if (!stagingHost.endsWith('.neon.tech') || (!stagingHost.startsWith(`${APPROVED_STAGING_PREFIX}-`) && !stagingHost.startsWith(APPROVED_STAGING_PREFIX))) {
  console.error(`CRITICAL ISOLATION REFUSAL: Staging host is not the approved staging project (${APPROVED_STAGING_PREFIX})!`);
  process.exit(1);
}

// Connect to staging DB to verify live connectivity
const pool = new pg.Pool({ connectionString: stagingDbUrl, ssl: true, connectionTimeoutMillis: 10000 });

async function verifyLive() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT current_database() as db, current_user as usr, version() as ver');
    const dbName = res.rows[0].db;
    
    // Check existing tables in staging
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tableCount = tablesRes.rows.length;

    console.log('Environment: STAGING');
    console.log('Provider: Neon');
    console.log('Host identifier: ' + stagingProject.slice(0, 15) + '... (verified staging project)');
    console.log('Database identifier: ' + dbName);
    console.log('Production match: NO');
    console.log('Staging live connectivity: YES');
    console.log('Existing staging public tables count: ' + tableCount);
    console.log('Isolation verified: YES');
  } finally {
    client.release();
    await pool.end();
  }
}

verifyLive().catch(err => {
  console.error('STAGING CONNECTION FAILED:', err.message);
  process.exit(1);
});

