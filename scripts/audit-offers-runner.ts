import { config } from "dotenv";
config({ path: ".env.local" });
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { generateSessionToken } from "../lib/auth";
import { createStoreSession } from "../lib/users-store";

const OUT_DIR = path.resolve("C:/Users/ibrah/.gemini/antigravity/brain/c80176dd-bad0-4a03-9018-f631103b1647/ui-audit");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: false, slowMo: 60 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ar-EG",
  });

  const adminId = "usr-admin-owner-001";
  const { rawToken, tokenHash, expiresAt } = generateSessionToken(adminId);
  await createStoreSession(adminId, tokenHash, expiresAt);

  await context.addCookies([
    {
      name: "naqer_admin",
      value: rawToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  console.log("1. Navigating to /admin/offers/new in visible Edge...");
  await page.goto("http://127.0.0.1:3000/admin/offers/new", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, "admin-offers-new-desktop.png"), fullPage: false });

  console.log("2. Navigating to /admin/offers (offers list)...");
  await page.goto("http://127.0.0.1:3000/admin/offers", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, "admin-offers-list-desktop.png"), fullPage: false });

  // Mobile viewport for /admin/offers/new
  console.log("3. Capturing mobile viewport (375px)...");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("http://127.0.0.1:3000/admin/offers/new", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, "admin-offers-new-mobile-375.png"), fullPage: false });

  await browser.close();
  console.log("✔ Edge visual verification completed!");
}

run().catch(console.error);
