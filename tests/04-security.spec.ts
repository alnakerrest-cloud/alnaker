import { test, expect } from "@playwright/test";
import { shot, ADMIN } from "./helpers";
import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

// نقرأ الأسرار من .env.local وقت التشغيل فقط — لا تُكتب داخل ملف الاختبار ولا تُطبع.
require('./staging-env').loadStagingEnv();
require('./staging-env').loadStagingEnv();
const env = process.env as Record<string, string | undefined>;
const SECRET_VALUES = Object.entries(env)
  .filter(([k, v]) => /SECRET|KEY|TOKEN|DATABASE_URL|PASSWORD|-uri/i.test(k) && v && String(v).length > 8)
  .map(([, v]) => String(v));

const PROTECTED = [
  "/admin/dashboard",
  "/admin/products",
  "/admin/categories",
  "/admin/branches",
  "/admin/settings",
  "/admin/audit",
  "/admin/images",
  "/admin/import",
];

test.describe("4) Security & Guardrails", () => {
  test("صفحات الإدارة محميّة: تحويل إلى صفحة الدخول بدون جلسة", async ({ page }) => {
    for (const url of PROTECTED) {
      await page.goto(url);
      await expect(page, `لا بد أن تُحمى ${url}`).toHaveURL(/\/admin\/login/, { timeout: 15_000 });
    }
    await shot(page, "sec-01-admin-redirect-login");
  });

  test("دخول ببيانات خاطئة: رسالة خطأ بلا جلسة", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('input[name="email"]').fill(ADMIN.email);
    await page.locator('input[name="password"]').fill("wrong-password-xyz");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".admin-error")).toContainText("غير صحيحة", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin\/login/);
    await shot(page, "sec-02-login-invalid");
  });

  test("نقطة content-version لا تكشف إلا بصمة بلا معنى", async ({ request }) => {
    const res = await request.get("/api/content-version");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Object.keys(json).sort()).toEqual(["v"]);
    expect(json.v).toMatch(/^([0-9a-f]{16}|unavailable)$/);
  });

  test("لا أسرار في HTML العام أو صفحة الدخول أو الحزمة", async ({ page }) => {
    expect(SECRET_VALUES.length, "تعذّر قراءة أسرار من .env.local للتحقق").toBeGreaterThan(0);
    for (const url of ["/ar", "/en", "/admin/login"]) {
      await page.goto(url);
      const html = await page.content();
      for (const s of SECRET_VALUES) {
        expect(html, `تسريب محتمل في ${url}`).not.toContain(s);
      }
    }
    await shot(page, "sec-03-no-secret-in-html");
  });
});
