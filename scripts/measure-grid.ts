// scripts/measure-grid.ts
import { chromium } from "playwright";

const VIEWPORTS = [1440, 1280, 1024, 768, 430, 390, 375, 320];

async function measure() {
  const browser = await chromium.launch({ headless: true });
  for (const w of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    await page.goto("http://127.0.0.1:3000/ar", { waitUntil: "networkidle" });

    const data = await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      const overflowEls: string[] = [];
      document.querySelectorAll("*").forEach((el) => {
        if (el.scrollWidth > window.innerWidth + 2) {
          overflowEls.push(`${el.tagName}.${el.className} (scrollWidth: ${el.scrollWidth})`);
        }
      });
      return {
        windowWidth: window.innerWidth,
        docScrollWidth: html.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
        hasHorizontalOverflow: html.scrollWidth > window.innerWidth,
        overflowEls: overflowEls.slice(0, 5),
      };
    });

    console.log(`Viewport ${w}px:`, data.hasHorizontalOverflow ? "⚠️ OVERFLOW" : "✔ OK", data);
    await page.close();
  }
  await browser.close();
}

measure().catch(console.error);
