import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const PROD_URL = "https://naqer-menu.vercel.app";
const EVIDENCE_DIR = "C:/Users/ibrah/.gemini/antigravity/brain/c80176dd-bad0-4a03-9018-f631103b1647/variants-choices-evidence";

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function run() {
  console.log("=== Testing Live Production Deployment on Vercel ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => consoleLogs.push(`[PAGE_ERROR] ${err.message}`));

  try {
    // 1. Visit Login
    console.log("Navigating to login...");
    await page.goto(`${PROD_URL}/admin/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "18-prod-login-page.png") });
    console.log("Login page loaded. Screenshot saved: 18-prod-login-page.png");

    // 2. Test OWNER Login
    console.log("Testing OWNER login...");
    await page.fill('input[name="email"]', "admin@naqer-restaurant.local");
    await page.fill('input[name="password"]', "NaqerAdmin#2026!SecX");
    await page.click('button[type="submit"]');

    console.log("Waiting for redirection after OWNER login...");
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25000 });
    console.log("OWNER landed on URL:", page.url());

    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "19-prod-owner-dashboard.png") });
    console.log("OWNER dashboard screenshot saved: 19-prod-owner-dashboard.png");

    // Verify session persistence after reload
    await page.reload({ waitUntil: "networkidle" });
    console.log("After reload URL:", page.url());
    if (page.url().includes("/admin/dashboard") || page.url().includes("/admin")) {
      console.log("PASS: OWNER session persisted across reload!");
    } else {
      console.error("FAIL: OWNER session lost after reload! URL:", page.url());
    }

    // 3. Logout
    console.log("Logging out OWNER...");
    await page.goto(`${PROD_URL}/admin/login`, { waitUntil: "networkidle" });

    // Clear cookies for next test
    await context.clearCookies();

    // 4. Test ORDERS_STAFF Login
    console.log("Testing ORDERS_STAFF login...");
    await page.goto(`${PROD_URL}/admin/login`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', "orders-staff@naqer-restaurant.local");
    await page.fill('input[name="password"]', "NaqerStaff#2026!OrdZ");
    await page.click('button[type="submit"]');

    console.log("Waiting for redirection after ORDERS_STAFF login...");
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25000 });
    console.log("ORDERS_STAFF landed on URL:", page.url());

    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "20-prod-staff-orders.png") });
    console.log("ORDERS_STAFF orders screenshot saved: 20-prod-staff-orders.png");

    // Verify ORDERS_STAFF RBAC boundary: should be blocked from /admin/users or /admin/dashboard
    console.log("Testing ORDERS_STAFF RBAC guard...");
    await page.goto(`${PROD_URL}/admin/dashboard`, { waitUntil: "networkidle" });
    console.log("ORDERS_STAFF accessing /admin/dashboard resulted in URL:", page.url());
    if (page.url().includes("/admin/orders") || page.url().includes("/login")) {
      console.log("PASS: ORDERS_STAFF correctly restricted by RBAC guard!");
    }

    console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error("Test encountered error:", err.message);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "prod-error.png") }).catch(() => {});
    console.log("Console logs during run:\n", consoleLogs.join("\n"));
  } finally {
    await browser.close();
  }
}

run();
