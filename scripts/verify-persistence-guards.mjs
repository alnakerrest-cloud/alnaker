// scripts/verify-persistence-guards.mjs
// Test suite verifying production persistence invariants and runtime guards.

import assert from "node:assert";

// Test 1: In production mode (VERCEL="1" or NODE_ENV="production")
process.env.VERCEL = "1";
process.env.NODE_ENV = "production";

// Dynamically import persistence-mode
const { isProductionEnvironment, shouldUseLocalBackup, assertNotProduction } = await import("../lib/persistence-mode.ts");

console.log("Testing isProductionEnvironment()...");
assert.strictEqual(isProductionEnvironment(), true, "isProductionEnvironment() must return true when VERCEL=1");

console.log("Testing shouldUseLocalBackup() in production...");
assert.strictEqual(shouldUseLocalBackup(), false, "shouldUseLocalBackup() must return false in production even if unset");

process.env.USE_BACKUP_DATA = "true";
assert.strictEqual(shouldUseLocalBackup(), false, "shouldUseLocalBackup() must return false in production even if USE_BACKUP_DATA=true");

console.log("Testing assertNotProduction() throws in production...");
let thrown = false;
try {
  assertNotProduction("TestOperation");
} catch (err) {
  thrown = true;
  assert.ok(err.message.includes("FATAL: \"TestOperation\" attempted local filesystem mutation"));
}
assert.strictEqual(thrown, true, "assertNotProduction must throw in production");

// Test 2: In development mode (NODE_ENV="development", VERCEL="")
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;
process.env.NODE_ENV = "development";

console.log("Testing isProductionEnvironment() in development...");
assert.strictEqual(isProductionEnvironment(), false, "isProductionEnvironment() must return false in dev");

console.log("Testing shouldUseLocalBackup() in development...");
delete process.env.USE_BACKUP_DATA;
assert.strictEqual(shouldUseLocalBackup(), true, "shouldUseLocalBackup() defaults to true in development");

process.env.USE_BACKUP_DATA = "false";
assert.strictEqual(shouldUseLocalBackup(), false, "shouldUseLocalBackup() returns false in dev when USE_BACKUP_DATA=false");

process.env.USE_BACKUP_DATA = "true";
assert.strictEqual(shouldUseLocalBackup(), true, "shouldUseLocalBackup() returns true in dev when USE_BACKUP_DATA=true");

console.log("All persistence mode invariant assertions passed successfully!");
