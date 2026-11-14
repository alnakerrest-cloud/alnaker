import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pg from "pg";

const root = process.cwd();
const stagingPath = path.join(root, ".env.staging.local");
const productionPath = path.join(root, ".env.local");
const stagingProjectId = "ep-soft-dawn-bdu5de43";
const productionProjectId = "ep-withered-bread-bemwq8ns";

if (!fs.existsSync(stagingPath)) {
  throw new Error("STAGING ENV MISSING: .env.staging.local is required.");
}
execFileSync("git", ["check-ignore", "-q", ".env.staging.local"], { cwd: root });

const staging = dotenv.parse(fs.readFileSync(stagingPath));
if (staging.NAQER_TEST_ENV !== "staging" || staging.STAGING_MODE !== "1") {
  throw new Error("STAGING ENV INVALID: explicit staging markers are required.");
}
if (!staging.DATABASE_URL || !staging.SESSION_SECRET) {
  throw new Error("STAGING ENV INVALID: staging database and session configuration are required.");
}

const stagingUrl = new URL(staging.DATABASE_URL);
if (!stagingUrl.hostname.endsWith(".neon.tech") || !stagingUrl.hostname.startsWith(`${stagingProjectId}-`) ||
    stagingUrl.hostname.includes(productionProjectId)) {
  throw new Error("STAGING GUARD REFUSAL: database target is not the approved staging Neon project.");
}

if (fs.existsSync(productionPath)) {
  const production = dotenv.parse(fs.readFileSync(productionPath));
  if (production.DATABASE_URL) {
    const productionUrl = new URL(production.DATABASE_URL);
    if (stagingUrl.hostname === productionUrl.hostname) {
      throw new Error("STAGING GUARD REFUSAL: database host matches the local production target.");
    }
  }
}

const adminEmail = staging.E2E_ADMIN_EMAIL || "admin@naqer-menu.local";
const editorEmail = staging.E2E_EDITOR_EMAIL || "editor@naqer-menu.local";
const hasAdminPassword = Boolean(staging.E2E_ADMIN_PASSWORD);
const hasEditorPassword = Boolean(staging.E2E_EDITOR_PASSWORD);
if (hasAdminPassword !== hasEditorPassword) {
  throw new Error("STAGING ENV INVALID: OWNER and EDITOR credentials must be configured together.");
}

const adminPassword = staging.E2E_ADMIN_PASSWORD || randomBytes(32).toString("hex");
const editorPassword = staging.E2E_EDITOR_PASSWORD || randomBytes(32).toString("hex");
if (!hasAdminPassword) {
  const lines = fs.readFileSync(stagingPath, "utf8").replace(/\r?\n?$/, "\n");
  fs.writeFileSync(stagingPath, `${lines}E2E_ADMIN_EMAIL=${adminEmail}\nE2E_ADMIN_PASSWORD=${adminPassword}\nE2E_EDITOR_EMAIL=${editorEmail}\nE2E_EDITOR_PASSWORD=${editorPassword}\n`, "utf8");
}

const adminHash = await bcrypt.hash(adminPassword, 12);
const editorHash = await bcrypt.hash(editorPassword, 12);
const pool = new pg.Pool({
  connectionString: staging.DATABASE_URL,
  ssl: true,
  connectionTimeoutMillis: 10000,
  max: 1,
});

try {
  const identity = await pool.query("SELECT current_database() AS database, current_schema() AS schema");
  if (identity.rows[0].database !== stagingUrl.pathname.substring(1) ||
      identity.rows[0].schema !== "public") {
    throw new Error("STAGING GUARD REFUSAL: connected database identity differs from the configured staging target.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "AdminUser" (id, email, "passwordHash", "displayName", role, "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'OWNER', true, now(), now())
       ON CONFLICT (email) DO UPDATE
       SET "passwordHash" = EXCLUDED."passwordHash", "displayName" = EXCLUDED."displayName",
           role = 'OWNER', "isActive" = true, "updatedAt" = now()`,
      [adminEmail, adminHash, "Staging E2E Owner"],
    );
    await client.query(
      `INSERT INTO "AdminUser" (id, email, "passwordHash", "displayName", role, "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'EDITOR', true, now(), now())
       ON CONFLICT (email) DO UPDATE
       SET "passwordHash" = EXCLUDED."passwordHash", "displayName" = EXCLUDED."displayName",
           role = 'EDITOR', "isActive" = true, "updatedAt" = now()`,
      [editorEmail, editorHash, "Staging E2E Editor"],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  console.log("STAGING TEST USERS: OWNER and EDITOR provisioned on the isolated staging database.");
} finally {
  await pool.end();
}
