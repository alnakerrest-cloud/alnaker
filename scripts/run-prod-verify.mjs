import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env.prod-verify.local");
if (!existsSync(envPath)) {
  console.error("[dev:prod-verify] Missing .env.prod-verify.local");
  process.exit(1);
}
const r = dotenv.config({ path: envPath, override: true });
if (r.error) {
  console.error("[dev:prod-verify] Failed to load .env.prod-verify.local:", r.error.message);
  process.exit(1);
}

const db = process.env.DATABASE_URL || "";
const EXPECTED_HOST = "ep-withered-bread-bemwq8ns-pooler.c-9.us-east-2.aws.neon.tech";

let host = "";
try {
  host = new URL(db).host;
} catch (e) {
  console.error("[dev:prod-verify] Invalid DATABASE_URL URL format.");
  process.exit(1);
}

if (host !== EXPECTED_HOST) {
  console.error(`[dev:prod-verify] Host mismatch: expected ${EXPECTED_HOST}, got ${host}`);
  process.exit(2);
}

console.log(`[dev:prod-verify] Starting Next.js configured with Primary Production Neon Host: ${host}`);
console.log(`[dev:prod-verify] Port: 3001 | Hostname: 127.0.0.1`);

const child = spawn("npx", ["next", "dev", "--hostname", "127.0.0.1", "--port", "3001"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 1));
