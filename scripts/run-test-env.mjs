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
// Safety: refuse obvious production-style host if user pastes wrong file (warn only; cannot prove branch from URL)
const db = process.env.DATABASE_URL || "";
if (!db.includes("ep-sparkling-glitter-bdwqquhi")) {
  console.error("[dev:test] SAFETY STOP: DATABASE_URL host does not match expected testing branch host (ep-sparkling-glitter-bdwqquhi). Refusing to start. Update .env.test.local to the testing branch connection only.");
  process.exit(2);
}
console.log("[dev:test] Loaded .env.test.local (DATABASE_URL host: ep-sparkling-glitter-bdwqquhi). This is a LOCAL TEST RUN against the configured test branch only — do not use for production.");
const child = spawn("npx", ["next", "dev", "--hostname", "127.0.0.1", "--port", "3001"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 1));
