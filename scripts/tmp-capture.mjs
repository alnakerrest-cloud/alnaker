import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const outDir = process.argv[2] || "qa-premium/before";
fs.mkdirSync(outDir, { recursive: true });
const base = "http://127.0.0.1:3001";
const browser = await chromium.launch();

const shots = [
  { route: "/ar", slug: "ar", w: 1366, h: 900, ds: true },
  { route: "/en", slug: "en", w: 1366, h: 900, ds: true },
  { route: "/ar", slug: "ar", w: 390, h: 844, ds: false },
  { route: "/en", slug: "en", w: 390, h: 844, ds: false },
];

for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.ds ? 1 : 2 });
  await page.goto(base + s.route, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const name = path.join(outDir, `${s.slug}-${s.w}.png`);
  await page.screenshot({ path: name, fullPage: true });
  console.log("saved", name);
  await page.close();
}
await browser.close();
