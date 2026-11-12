// PART B Step 5 — verify the public AR/EN menu renders the newly assigned PDF
// images correctly (loaded, in the right cards, no broken URLs). Captures
// desktop + mobile screenshots to qa-final/. Read-only (no data changes).
import { chromium } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const OUT = path.resolve("qa-final");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const summary = [];

async function check(locale, width, height, tag) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale });
  const page = await ctx.newPage();
  const failed = [];
  page.on("requestfailed", (r) => { if (r.url().includes("cloudinary") || r.url().includes("_next/image")) failed.push(r.url()); });
  await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle" });
  // scroll through to trigger lazy next/image loads
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  const stats = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    const cloud = imgs.filter((i) => (i.currentSrc || i.src).includes("cloudinary") || (i.currentSrc || i.src).includes("_next/image"));
    const loaded = cloud.filter((i) => i.naturalWidth > 0);
    const broken = cloud.filter((i) => i.complete && i.naturalWidth === 0);
    return { totalImg: imgs.length, cloud: cloud.length, loaded: loaded.length, broken: broken.length };
  });
  const shot = path.join(OUT, `public-${locale}-${tag}.png`);
  await page.screenshot({ path: shot, fullPage: false });
  summary.push({ locale, tag, ...stats, failedReq: failed.length, shot: path.basename(shot) });
  console.log(`  /${locale} ${tag} ${width}x${height}: cloudImgs=${stats.cloud} loaded=${stats.loaded} broken=${stats.broken} failedReq=${failed.length}`);
  await ctx.close();
}

for (const loc of ["ar", "en"]) {
  await check(loc, 1366, 900, "desktop");
  await check(loc, 390, 844, "mobile");
}
await browser.close();
fs.writeFileSync(path.join(OUT, "public-verify.json"), JSON.stringify(summary, null, 2), "utf8");
const totBroken = summary.reduce((a, s) => a + s.broken + s.failedReq, 0);
console.log(`\nDONE. broken+failed across all views = ${totBroken}`);
