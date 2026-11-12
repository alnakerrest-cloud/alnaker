import { test, expect, type Page } from "@playwright/test";
import { login, shot, EVIDENCE_DIR } from "./helpers";
import * as fs from "node:fs";
import * as path from "node:path";

const VIEWPORTS = [
  { w: 360, h: 800, slug: "360x800" },
  { w: 390, h: 844, slug: "390x844" },
  { w: 430, h: 932, slug: "430x932" },
  { w: 768, h: 1024, slug: "768x1024" },
  { w: 1024, h: 768, slug: "1024x768" },
  { w: 1366, h: 768, slug: "1366x768" },
  { w: 1920, h: 1080, slug: "1920x1080" },
];

type Metric = { screen: string; slug: string; w: number; h: number; sw: number; cw: number; overflow: boolean; culprits: string[] };
const results: Metric[] = [];

// لا نستخدم networkidle لأن LiveSync يستعلم كل 4 ثوانٍ (لا خمول شبكة أبدًا).
async function measure(page: Page): Promise<{ sw: number; cw: number; culprits: string[] }> {
  return page.evaluate(() => {
    const de = document.documentElement;
    const sw = de.scrollWidth;
    const cw = de.clientWidth;
    let culprits: string[] = [];
    if (sw > cw + 1) {
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0) continue;
        if (r.right > cw + 1) {
          let p: HTMLElement | null = el.parentElement;
          let inScroller = false;
          while (p) {
            const s = getComputedStyle(p);
            if (/(auto|scroll)/.test(s.overflowX)) { inScroller = true; break; }
            p = p.parentElement;
          }
          if (!inScroller) culprits.push(`${el.tagName}.${el.className}`.toString().slice(0, 50));
        }
      }
      culprits = culprits.slice(0, 6);
    }
    return { sw, cw, culprits };
  });
}

function record(screen: string, v: { w: number; h: number; slug: string }, m: { sw: number; cw: number; culprits: string[] }) {
  results.push({ screen, slug: v.slug, w: v.w, h: v.h, sw: m.sw, cw: m.cw, overflow: m.sw > m.cw + 1, culprits: m.culprits });
}

test.describe("3) Responsive Final Pass", () => {
  test.afterAll(async () => {
    fs.writeFileSync(path.join(EVIDENCE_DIR, "responsive.json"), JSON.stringify(results, null, 2), "utf8");
  });

  test("المنيو العام + صفحة الدخول عبر كل المقاسات", async ({ page }) => {
    test.setTimeout(240_000);
    for (const v of VIEWPORTS) {
      await page.setViewportSize({ width: v.w, height: v.h });

      await page.goto("/admin/login");
      await page.locator('input[name="email"]').waitFor({ state: "visible" });
      const lm = await measure(page);
      record("login", v, lm);
      await shot(page, `resp-${v.slug}-login`);
      expect(lm.culprits, `overflow غير مقصود في الدخول @${v.slug} (${lm.sw}>${lm.cw})`).toEqual([]);

      await page.goto("/ar");
      await page.locator(".cat-title").first().waitFor({ state: "visible" });
      const pm = await measure(page);
      record("public-ar", v, pm);
      await shot(page, `resp-${v.slug}-public-ar`);
      expect(pm.culprits, `overflow غير مقصود في المنيو @${v.slug} (${pm.sw}>${pm.cw})`).toEqual([]);
    }
  });

  test("لوحة التحكم عبر كل المقاسات", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page);
    await page.goto("/admin/dashboard");

    for (const v of VIEWPORTS) {
      await page.setViewportSize({ width: v.w, height: v.h });
      await page.reload();
      await page.locator(".admin-topbar h1, h1").first().waitFor({ state: "visible" });
      const m = await measure(page);
      record("admin-dashboard", v, m);
      await shot(page, `resp-${v.slug}-admin`);
      expect(m.culprits, `overflow غير مقصود في اللوحة @${v.slug} (${m.sw}>${m.cw})`).toEqual([]);
    }
  });
});
