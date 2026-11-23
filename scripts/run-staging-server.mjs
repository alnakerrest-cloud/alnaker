// scripts/run-staging-server.mjs
// Launches the Next.js app connected to the approved Staging database on port 3001.
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stagingPath = path.join(root, ".env.staging.local");
if (!fs.existsSync(stagingPath)) {
  console.error("[staging-server] Missing .env.staging.local");
  process.exit(1);
}

const stagingEnv = dotenv.parse(fs.readFileSync(stagingPath));
const dbUrl = stagingEnv.DATABASE_URL || "";
const APPROVED_STAGING_PREFIX = "ep-ancient-hill-beec491j";
const FORBIDDEN_TARGETS = ["ep-soft-dawn-bdu5de43", "ep-withered-bread-bemwq8ns"];

if (!dbUrl.includes(APPROVED_STAGING_PREFIX)) {
  console.error(`[staging-server] SAFETY REFUSAL: DATABASE_URL is not the approved staging project (${APPROVED_STAGING_PREFIX})`);
  process.exit(2);
}
for (const forbidden of FORBIDDEN_TARGETS) {
  if (dbUrl.includes(forbidden)) {
    console.error(`[staging-server] CRITICAL REFUSAL: matches forbidden database target: ${forbidden}`);
    process.exit(2);
  }
}

// Override environment for staging run
const env = {
  ...process.env,
  ...stagingEnv,
  DATABASE_URL: dbUrl,
  USE_BACKUP_DATA: "false", // Test direct database flow
  NODE_ENV: "development",
  PORT: "3002",
};

console.log(`[staging-server] Starting production Next.js server on port 3002 against verified staging Neon database...`);

const child = spawn("npx", ["next", "start", "--hostname", "127.0.0.1", "--port", "3002"], {
  stdio: "inherit",
  env,
  shell: true,
});

child.on("exit", (code) => {
  console.log(`[staging-server] Server exited with code ${code}`);
  process.exit(code ?? 0);
});
