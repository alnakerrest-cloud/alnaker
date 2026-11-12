import { chromium } from "@playwright/test";

const WIDTHS = [360, 390, 430, 768, 1024, 1366, 1920];
const browser = await chromium.launch();
let bad = 0;
for (const route of ["/ar", "/en"]) {
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto("http://127.0.0.1:3001" + route, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.locator(".cat-title").first().waitFor({ state: "visible", timeout: 30000 });
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const sw = de.scrollWidth, cw = de.clientWidth;
      const culprits = [];
      if (sw > cw + 1) {
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          const r = el.getBoundingClientRect();
          if (r.width <= 0) continue;
          if (r.right > cw + 1) {
            let p = el.parentElement, inScroller = false;
            while (p) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX)) { inScroller = true; break; } p = p.parentElement; }
            if (!inScroller) culprits.push(`${el.tagName}.${el.className}`.slice(0, 60));
          }
        }
      }
      return { sw, cw, culprits: culprits.slice(0, 6) };
    });
    const ok = m.culprits.length === 0;
    if (!ok) bad++;
    console.log(`${route} @${w}: ${ok ? "OK" : "OVERFLOW"} (${m.sw}>${m.cw})`, ok ? "" : JSON.stringify(m.culprits));
    await page.close();
  }
}
console.log(bad === 0 ? "ALL CLEAR — no horizontal overflow" : `${bad} overflow cases`);
await browser.close();
