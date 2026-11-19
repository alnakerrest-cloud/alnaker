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
if (!db.includes("ep-sparkling-glitter-bdwqquhi")) {
  console.error("[build:test] SAFETY STOP: wrong DB host for test build.");
  process.exit(2);
}
console.log("[build:test] Using .env.test.local (test branch host).");
const child = spawn("npx", ["next", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 1));
