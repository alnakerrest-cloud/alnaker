import { expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

// ---- Around the environment ----
export const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3001";
// Test-only credentials. Never set these to production values; E2E_* env vars override.
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@naqer-menu.local",
  password: process.env.E2E_ADMIN_PASSWORD ?? "test-only-admin-password",
};
export const EDITOR = {
  email: process.env.E2E_EDITOR_EMAIL ?? "editor@naqer-menu.local",
  password: process.env.E2E_EDITOR_PASSWORD ?? "test-only-editor-password",
};

// مجلد الأدلة المرئية (لقطات لكل مرحلة) — يبقى خارج test-results حتى لا يُمسح مع كل تشغيل.
export const EVIDENCE_DIR = path.resolve(__dirname, "..", "qa-final");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

// ملفات الصور الاختبارية الجاهزة (PNG صغيرة) لرفعها إلى Cloudinary.
const ROOT = path.resolve(__dirname, "..");
export const IMG = {
  productA: path.join(ROOT, "e2e-product-orange.png"),
  productB: path.join(ROOT, "e2e-product-blue.png"),
  category: path.join(ROOT, "e2e-category.png"),
  logo: path.join(ROOT, "e2e-logo.png"),
};

/** لقطة صفحة كاملة باسم مميّز داخل مجلد الأدلة. */
export async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(EVIDENCE_DIR, `${name}.png`), fullPage: true });
}

/** تسجيل ملاحظة زمنية في ملف الأحداث (يُرفق بالتقرير). */
const EVENTS_FILE = path.join(EVIDENCE_DIR, "timeline.log");
export function logEvent(msg: string): void {
  const line = `${new Date().toISOString()}  ${msg}\n`;
  fs.appendFileSync(EVENTS_FILE, line, "utf8");
  console.log(`[accept] ${msg}`);
}

export type Diagnostics = { console: string[]; net: string[] };

/** يجمّع أخطاء الـ console والطلبات الفاشلة في صفحة، ويكتبها في ملف أدلة عند الإغلاق. */
export function attachDiagnostics(page: Page, label: string): Diagnostics {
  const sink: Diagnostics = { console: [], net: [] };
  page.on("console", (m) => {
    if (m.type() === "error") sink.console.push(`[${label}][console.error] ${m.text()}`);
  });
  page.on("pageerror", (e) => sink.console.push(`[${label}][pageerror] ${e.message}`));
  page.on("requestfailed", (r) => sink.net.push(`[${label}][requestfailed] ${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes(".ico")) sink.net.push(`[${label}][http${res.status()}] ${res.url()}`);
  });
  return sink;
}

export function writeDiagnostics(label: string, sinks: Diagnostics[]): void {
  const lines = sinks.flatMap((s) => [...s.console, ...s.net]);
  const body = lines.length ? lines.join("\n") : "لا أخطاء console ولا طلبات فاشلة مسجّلة.\n";
  fs.writeFileSync(path.join(EVIDENCE_DIR, `console-net-${label}.log`), body, "utf8");
  console.log(`[accept] diagnostics(${label}): console=${sinks.reduce((a, s) => a + s.console.length, 0)} net=${sinks.reduce((a, s) => a + s.net.length, 0)}`);
}

/** زر إرسال نموذج المحتوى الرئيسي — مستهدف عمداً إلى <main> لتفادي زر «تسجيل الخروج» في الشريط الجانبي */
export function mainSubmit(page: Page, index = 0) {
  return page.locator('main form button[type="submit"]').nth(index);
}

/** تسجيل دخول عبر واجهة الدخول الحقيقية (Server Action + كوكي httpOnly). */
export async function login(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/admin\/login$/, { timeout: 20_000 });
  // نتأكد أننا داخل القشرة عبر ظهور رابط لوحة التحكم في التنقّل.
  await expect(page.locator('a[href="/admin/products"]').first()).toBeVisible({ timeout: 20_000 });
}

/** قبول أي نافذة تأكيد (window.confirm) تلقائيًا لخطوات الحذف. */
export function acceptDialogs(page: Page): void {
  page.on("dialog", (d) => d.accept());
}

/** الوصول لمعرّف منتج عبر البحث بالاسم ثم قراءة رابط «تعديل». */
export async function openProductEditByName(page: Page, nameAr: string): Promise<void> {
  await page.goto("/admin/products");
  await page.locator('main input[name="q"]').fill(nameAr);
  await page.locator('main form[method="GET"] button[type="submit"]').click();
  const row = page.locator("tbody tr", { hasText: nameAr }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.locator('a:has-text("تعديل")').click();
  await expect(page).toHaveURL(/\/admin\/products\/[^/]+$/, { timeout: 20_000 });
}

/** الوصول لمعرّف قسم عبر البحث بالاسم ثم رابط «تعديل». */
export async function openCategoryEditByName(page: Page, nameAr: string): Promise<void> {
  await page.goto("/admin/categories");
  await page.locator('main input[name="q"]').fill(nameAr);
  await page.locator('main form[method="GET"] button[type="submit"]').click();
  const row = page.locator("tbody tr", { hasText: nameAr }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.locator('a:has-text("تعديل")').click();
  await expect(page).toHaveURL(/\/admin\/categories\/[^/]+$/, { timeout: 20_000 });
}

/** صف المنتج في القائمة بالاسم. */
export function productRow(page: Page, nameAr: string) {
  return page.locator("tbody tr", { hasText: nameAr }).first();
}
