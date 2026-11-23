import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env.test.local");
if (!existsSync(envPath)) {
  console.error("[dev:test] Missing .env.test.local in project root. Create it from the provided testing branch URL (do not commit).");
  process.exit(1);
}
const r = dotenv.config({ path: envPath, override: true });
if (r.error) {
  console.error("[dev:test] Failed to load .env.test.local:", r.error.message);
  process.exit(1);
}
// Safety: refuse production hosts and require verified test branch
const db = process.env.DATABASE_URL || "";
const FORBIDDEN_TARGETS = ['ep-soft-dawn-bdu5de43', 'ep-withered-bread-bemwq8ns'];
for (const forbidden of FORBIDDEN_TARGETS) {
  if (db.includes(forbidden)) {
    console.error(`[dev:test] CRITICAL REFUSAL: DATABASE_URL in .env.test.local points to forbidden/production host: ${forbidden}`);
    process.exit(2);
  }
}
console.error("[dev:test] SAFETY STOP: .env.test.local is currently DISABLED for database testing until an isolated test branch is verified. Use .env.staging.local for staging verification.");
process.exit(2);
console.log("[dev:test] Loaded .env.test.local (DATABASE_URL host: ep-sparkling-glitter-bdwqquhi). This is a LOCAL TEST RUN against the configured test branch only — do not use for production.");
const child = spawn("npx", ["next", "dev", "--hostname", "127.0.0.1", "--port", "3001"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 1));
