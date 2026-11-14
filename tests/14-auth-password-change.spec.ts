import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import pg from "pg";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stagingPath = path.join(root, ".env.staging.local");
const localPath = path.join(root, ".env.local");
const envFile = fs.existsSync(stagingPath) ? stagingPath : localPath;
const envConfig = dotenv.parse(fs.readFileSync(envFile));
const databaseUrl = envConfig.DATABASE_URL;

test.describe.serial("14) Default OWNER & Password Change Flow E2E", () => {
  const TEST_EMAIL = `e2e-owner-${Date.now()}@test-naqer.local`;
  const INITIAL_PASS = "test1234";
  const NEW_PASS = "NewOwnerPass2026!";
  let pool: pg.Pool;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    pool = new pg.Pool({ connectionString: databaseUrl, ssl: true });
    const hash = await bcrypt.hash(INITIAL_PASS, 12);
    // Insert test owner with mustChangePassword = true
    await pool.query(
      `INSERT INTO "AdminUser" (id, email, "passwordHash", "displayName", role, "isActive", "mustChangePassword", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'مدير اختباري E2E', 'OWNER', true, true, now(), now())`,
      [TEST_EMAIL, hash]
    );

    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    if (context) await context.close();
    if (pool) {
      await pool.query('DELETE FROM "Session" WHERE "adminId" IN (SELECT id FROM "AdminUser" WHERE email = $1)', [TEST_EMAIL]);
      await pool.query('DELETE FROM "AdminUser" WHERE email = $1', [TEST_EMAIL]);
      await pool.end();
    }
  });

  test("1. Login with temporary password forces redirect to /admin/change-password", async () => {
    await page.goto("/admin/login");
    await page.locator('input[name="email"]').fill(TEST_EMAIL);
    await page.locator('input[name="password"]').fill(INITIAL_PASS);
    await page.locator('form.admin-login-form button[type="submit"]').click();

    // Must be redirected to /admin/change-password
    await expect(page).toHaveURL(/\/admin\/change-password/, { timeout: 20_000 });
    await expect(page.locator("h1")).toContainText("تعيين كلمة مرور جديدة");
  });

  test("2. Direct navigation to dashboard pages is blocked while mustChangePassword is true", async () => {
    // Attempt direct navigation to products
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/change-password/, { timeout: 20_000 });

    // Attempt direct navigation to categories
    await page.goto("/admin/categories");
    await expect(page).toHaveURL(/\/admin\/change-password/, { timeout: 20_000 });
  });

  test("3. Validation rejects wrong current password and mismatched confirmation", async () => {
    await page.goto("/admin/change-password");

    // Try wrong current password
    await page.locator('input[name="currentPassword"]').fill("WrongCurrent123");
    await page.locator('input[name="newPassword"]').fill(NEW_PASS);
    await page.locator('input[name="confirmPassword"]').fill(NEW_PASS);
    await page.locator('form.admin-login-form button[type="submit"]').click();

    await expect(page.locator(".admin-error")).toContainText("كلمة المرور الحالية غير صحيحة", { timeout: 15_000 });

    // Try mismatched confirmation
    await page.locator('input[name="currentPassword"]').fill(INITIAL_PASS);
    await page.locator('input[name="newPassword"]').fill(NEW_PASS);
    await page.locator('input[name="confirmPassword"]').fill("Mismatch1234!");
    await page.locator('form.admin-login-form button[type="submit"]').click();

    await expect(page.locator(".admin-error")).toContainText("غير متطابقين", { timeout: 15_000 });
  });

  test("4. Successful password change allows full access to dashboard and settings", async () => {
    await page.goto("/admin/change-password");

    // Enter valid current password and matching new password
    await page.locator('input[name="currentPassword"]').fill(INITIAL_PASS);
    await page.locator('input[name="newPassword"]').fill(NEW_PASS);
    await page.locator('input[name="confirmPassword"]').fill(NEW_PASS);
    await page.locator('form.admin-login-form button[type="submit"]').click();

    // Upon success, user is redirected to /admin/dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 20_000 });

    // User can now navigate freely to settings
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 20_000 });
    await expect(page.locator("h1")).toContainText("إعدادات المطعم");
    await expect(page.locator("h2:has-text('إدارة أمان الحساب وكلمة المرور')")).toBeVisible();
  });

  test("5. Old temporary password is permanently rejected on subsequent login", async () => {
    // Open a fresh page without session to test login
    const freshPage = await context.newPage();
    // Clear cookies
    await context.clearCookies();

    await freshPage.goto("/admin/login");
    await freshPage.locator('input[name="email"]').fill(TEST_EMAIL);
    await freshPage.locator('input[name="password"]').fill(INITIAL_PASS);
    await freshPage.locator('form.admin-login-form button[type="submit"]').click();

    await expect(freshPage.locator(".admin-error")).toContainText("بيانات الدخول غير صحيحة", { timeout: 15_000 });
    await freshPage.close();
  });

  test("6. New password logs in smoothly and lands directly on dashboard", async () => {
    await page.goto("/admin/login");
    await page.locator('input[name="email"]').fill(TEST_EMAIL);
    await page.locator('input[name="password"]').fill(NEW_PASS);
    await page.locator('form.admin-login-form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 20_000 });
  });
});
