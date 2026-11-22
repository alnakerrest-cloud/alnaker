// scripts/audit-menu-runner.ts
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT_DIR = path.resolve("C:/Users/ibrah/.gemini/antigravity/brain/c80176dd-bad0-4a03-9018-f631103b1647/ui-audit");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1280", width: 1280, height: 850 },
  { name: "1024", width: 1024, height: 800 },
  { name: "768", width: 768, height: 900 },
  { name: "430", width: 430, height: 850 },
  { name: "390", width: 390, height: 844 },
  { name: "375", width: 375, height: 667 },
  { name: "320", width: 320, height: 568 },
];

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: false, slowMo: 50 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ar-EG",
  });

  const page = await context.newPage();

  console.log("Navigating to /ar...");
  await page.goto("http://127.0.0.1:3000/ar", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Capture all Arabic viewports for menu
  for (const vp of VIEWPORTS) {
    console.log(`Capturing Arabic Menu at ${vp.width}px...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    
    // Scroll to the first section (e.g. platters or first category)
    await page.evaluate(() => {
      const section = document.querySelector(".section, .menu-section, .grid");
      if (section) {
        section.scrollIntoView({ behavior: "instant", block: "start" });
      }
    });
    await page.waitForTimeout(400);

    await page.screenshot({ path: path.join(OUT_DIR, `menu-ar-${vp.name}-top.png`), fullPage: false });

    // Scroll slightly down to capture cards and buttons clearly
    await page.evaluate(() => {
      window.scrollBy({ top: 350, behavior: "instant" });
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `menu-ar-${vp.name}-grid.png`), fullPage: false });
  }

  // English LTR test
  console.log("\nNavigating to /en...");
  await page.goto("http://127.0.0.1:3000/en", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  for (const vp of [
    { name: "1440", width: 1440, height: 900 },
    { name: "768", width: 768, height: 900 },
    { name: "375", width: 375, height: 667 },
  ]) {
    console.log(`Capturing English Menu at ${vp.width}px...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.evaluate(() => {
      const section = document.querySelector(".section, .menu-section, .grid");
      if (section) section.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, `menu-en-${vp.name}-grid.png`), fullPage: false });
  }

  await browser.close();
  console.log("✔ All menu grid screenshots captured successfully!");
}

run().catch(console.error);
