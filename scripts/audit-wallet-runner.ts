// scripts/audit-wallet-runner.ts
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT_DIR = path.resolve("C:/Users/ibrah/.gemini/antigravity/brain/c80176dd-bad0-4a03-9018-f631103b1647/ui-audit");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1280", width: 1280, height: 850 },
  { name: "1024", width: 1024, height: 800 },
  { name: "768", width: 768, height: 800 },
  { name: "430", width: 430, height: 800 },
  { name: "390", width: 390, height: 800 },
  { name: "375", width: 375, height: 667 },
  { name: "320", width: 320, height: 600 },
];

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: false, slowMo: 80 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ar-EG",
  });

  const page = await context.newPage();

  console.log("Navigating to /ar/account?tab=wallet...");
  await page.goto("http://127.0.0.1:3000/ar/account?tab=wallet", { waitUntil: "networkidle" });

  const phoneInput = page.locator("input#loginPhoneInput");
  if (await phoneInput.isVisible()) {
    console.log("Submitting login phone 01024994092...");
    await phoneInput.fill("01024994092");
    await page.locator("button[type='submit']").click();
    const codeInput = page.locator("input#loginCodeInput");
    await codeInput.waitFor({ state: "visible", timeout: 8000 });
    const hint = await page.locator(".hub-otp-hint strong").textContent();
    console.log("OTP code is:", hint);
    await codeInput.fill(hint?.trim() || "1234");
    await page.locator("button[type='submit']").click();
    await page.waitForTimeout(1000);
  }

  // Wait for tabs bar to be visible
  await page.waitForSelector(".hub-tabs-bar", { timeout: 10000 });
  console.log("✔ Customer Hub authenticated and tabs bar visible");

  // Ensure wallet tab is active
  const walletTab = page.locator("button.hub-tab-btn:has-text('المحفظة')");
  if (await walletTab.isVisible()) {
    await walletTab.click();
    await page.waitForTimeout(400);
  }

  // Capture all Arabic viewports
  for (const vp of VIEWPORTS) {
    console.log(`Capturing Arabic at ${vp.width}px...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `wallet-ar-${vp.name}.png`), fullPage: false });
  }

  // Test English LTR
  console.log("\nTesting English LTR at /en/account?tab=wallet...");
  await page.goto("http://127.0.0.1:3000/en/account?tab=wallet", { waitUntil: "networkidle" });
  await page.waitForSelector(".hub-tabs-bar", { timeout: 10000 });
  const enWalletTab = page.locator("button.hub-tab-btn:has-text('Wallet')");
  if (await enWalletTab.isVisible()) {
    await enWalletTab.click();
    await page.waitForTimeout(400);
  }

  for (const vp of [
    { name: "1440", width: 1440, height: 900 },
    { name: "768", width: 768, height: 800 },
    { name: "375", width: 375, height: 667 },
  ]) {
    console.log(`Capturing English at ${vp.width}px...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `wallet-en-${vp.name}.png`), fullPage: false });
  }

  await browser.close();
  console.log("All wallet & dashboard tabs screenshots completed successfully!");
}

run().catch(console.error);
