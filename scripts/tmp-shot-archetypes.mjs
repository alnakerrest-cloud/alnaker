import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 1000 }, deviceScaleFactor: 1 });
await page.goto("http://127.0.0.1:3001/ar", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);
// force all lazy images to load by scrolling through the whole page
await page.evaluate(async () => {
  await new Promise((res) => {
    let y = 0;
    const step = () => {
      y += 600;
      window.scrollTo(0, y);
      if (y < document.body.scrollHeight) setTimeout(step, 60);
      else { window.scrollTo(0, 0); setTimeout(res, 500); }
    };
    step();
  });
});
await page.waitForTimeout(800);

for (const id of ["trays", "starters", "soups"]) {
  const el = await page.$(`#${id}`);
  if (el) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); await el.screenshot({ path: `qa-premium/food-${id}.png` }); console.log("food", id); }
}

// switch to drinks tab
await page.locator('.tab:has-text("المشروبات")').click();
await page.waitForTimeout(1500);
await page.evaluate(async () => {
  await new Promise((res) => { let y=0; const s=()=>{ y+=600; window.scrollTo(0,y); if(y<document.body.scrollHeight) setTimeout(s,60); else {window.scrollTo(0,0); setTimeout(res,400);} }; s(); });
});
for (const id of ["coffee", "cocktails", "desserts", "soft"]) {
  const el = await page.$(`#${id}`);
  if (el) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); await el.screenshot({ path: `qa-premium/drink-${id}.png` }); console.log("drink", id); }
}
await browser.close();
