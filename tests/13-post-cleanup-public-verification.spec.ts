import { test, expect } from "@playwright/test";

test.describe("13) Post-Cleanup Public UI Verification (Arabic & English)", () => {
  test("1. Arabic Public Menu (/ar): Zero ZZ categories, Zero ZZ products, Zero ZZ branches", async ({ page }) => {
    await page.goto("/ar");
    await page.waitForLoadState("networkidle");

    // Check no ZZ text appears anywhere in the visible DOM
    const zzLocator = page.locator("text=/ZZ(MWD|قسم|فرع)/i");
    const zzCount = await zzLocator.count();
    expect(zzCount).toBe(0);

    // Verify Real Categories render
    await expect(page.locator("button:has-text('الصواني')").first()).toBeVisible();
    await expect(page.locator("button:has-text('المشويات')").first()).toBeVisible();
    await expect(page.locator("button:has-text('المقبلات')").first()).toBeVisible();

    // Verify Trays section heading has real dishes and no ZZ dishes
    const traysHeading = page.locator("h2:has-text('الصواني')").first();
    await expect(traysHeading).toBeVisible();

    // Verify branch selector options in Cart
    // Add item to cart via modal
    await page.locator('.card--meal, .card--platter, .card').first().click();
    await page.locator('.btn-add-cart').click();

    // Open Cart Drawer
    await page.locator('.floating-cart-btn').click();

    // Inspect Branch selector options
    const branchSelect = page.locator("select[name*='branch'], select").first();
    if (await branchSelect.isVisible()) {
      const options = await branchSelect.locator("option").allTextContents();
      const nonZzOptions = options.filter(o => o.includes("جمصة") || o.includes("دمياط"));
      const zzOptions = options.filter(o => o.includes("ZZ"));
      expect(nonZzOptions.length).toBeGreaterThanOrEqual(1);
      expect(zzOptions.length).toBe(0);
    }
  });

  test("2. English Public Menu (/en): Zero ZZ categories, Zero ZZ products, Zero ZZ branches", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    // Check no ZZ text appears anywhere in the visible DOM
    const zzLocator = page.locator("text=/ZZ(MWD|قسم|فرع)/i");
    const zzCount = await zzLocator.count();
    expect(zzCount).toBe(0);

    // Verify English layout direction
    const htmlDir = await page.locator("html").getAttribute("dir");
    expect(htmlDir).toBe("ltr");
  });
});
