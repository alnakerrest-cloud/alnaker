import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("requestfailed", (r) => errors.push("REQFAIL " + r.url()));
await page.goto("http://127.0.0.1:3001/ar", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);

for (const id of ["trays", "homestyle", "mandi"]) {
  const el = await page.$(`#${id}`);
  if (el) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await el.screenshot({ path: `qa-premium/sec-${id}.png` });
    console.log("captured", id);
  } else console.log("MISSING section", id);
}

// report which product images actually rendered (natural size) vs placeholder
const imgInfo = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("article.card img").forEach((im) => {
    out.push({ complete: im.complete, nw: im.naturalWidth, src: (im.currentSrc || im.src).slice(0, 80) });
  });
  return out;
});
console.log("rendered imgs:", JSON.stringify(imgInfo, null, 1));
console.log("errors:", JSON.stringify(errors.slice(0, 12), null, 1));
await browser.close();
