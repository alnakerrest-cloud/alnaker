import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env.test.local");
if (!existsSync(envPath)) {
  console.error("[build:test] Missing .env.test.local");
  process.exit(1);
}
const r = dotenv.config({ path: envPath, override: true });
if (r.error) {
  console.error("[build:test]", r.error.message);
  process.exit(1);
}
const db = process.env.DATABASE_URL || "";
const FORBIDDEN_TARGETS = ['ep-soft-dawn-bdu5de43', 'ep-withered-bread-bemwq8ns'];
for (const forbidden of FORBIDDEN_TARGETS) {
  if (db.includes(forbidden)) {
    console.error(`[build:test] CRITICAL REFUSAL: DATABASE_URL in .env.test.local points to forbidden/production host: ${forbidden}`);
    process.exit(2);
  }
}
console.error("[build:test] SAFETY STOP: .env.test.local is currently DISABLED for database testing until an isolated test branch is verified.");
process.exit(2);
console.log("[build:test] Using .env.test.local (test branch host).");
const child = spawn("npx", ["next", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 1));
