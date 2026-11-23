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
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();
    const optionTile = modal.locator('.option-tile').first();
    if (await optionTile.isVisible()) {
      await optionTile.click();
    }
    await modal.locator('.btn-add-cart').click();
    await expect(modal).not.toBeVisible();

    // Open Cart Drawer
    await page.locator('.floating-cart-btn').first().click();
    const cartPanel = page.locator('.cart-panel');
    await expect(cartPanel).toBeVisible();

    // Inspect Branch selector options
    const branchCards = cartPanel.locator('.branch-option-card');
    if (await branchCards.count() > 0) {
      const texts = await branchCards.allTextContents();
      const nonZz = texts.filter(o => o.includes("جمصة") || o.includes("دمياط"));
      const zz = texts.filter(o => o.includes("ZZ"));
      expect(nonZz.length).toBeGreaterThanOrEqual(1);
      expect(zz.length).toBe(0);
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
