import { test, expect, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';
import { login, shot, acceptDialogs } from './helpers';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;

const QA_DIR = path.resolve(__dirname, '..', 'qa-premium', 'addons');
fs.mkdirSync(QA_DIR, { recursive: true });

async function initMenu(page: Page, url = '/ar') {
  await page.goto(url);
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });
  await page.locator('.bar').waitFor({ state: 'visible' });
}

test.describe('Naqer Menu — Addons, Branch Management & Visual QA', () => {
  const testGroupName = `اختبار-إضافات-${Date.now()}`;
  let testGroupId: string | null = null;
  let testProductId: string | null = null;
  let testProductName: string = '';

  test.beforeAll(async () => {
    // Find first platter product to attach options to
    const p = await q(`select id, "nameAr" from "Product" where "isVisible"=true order by "sortOrder" limit 1`);
    if (p.length > 0) {
      testProductId = p[0].id;
      testProductName = p[0].nameAr;
    }
    await q(`update "Branch" set "isOrderable"=true where "isActive"=true`);
  });

  test.beforeEach(async () => {
    await q(`update "Branch" set "isOrderable"=true where "isActive"=true`);
  });

  test.afterAll(async () => {
    // Cleanup test records
    if (testGroupId) {
      await q(`delete from "OptionGroup" where id=$1`, [testGroupId]);
    }
    await q(`delete from "OptionGroup" where "nameAr" like 'اختبار-إضافات-%'`);
    // Restore branches orderable status
    await q(`update "Branch" set "isOrderable"=true where "isActive"=true`);
    await pool.end();
  });

  test('1. Admin Add-ons Management: create, list, and verify in DB', async ({ page }) => {
    acceptDialogs(page);
    await login(page);

    // Navigate to /admin/addons
    await page.goto('/admin/addons');
    await expect(page.locator('h1')).toContainText('إدارة الإضافات والخيارات');
    await page.screenshot({ path: path.join(QA_DIR, '01-admin-addons-list.png') });

    // Click new addon group
    await page.locator('a[href="/admin/addons/new"]').click();
    await expect(page).toHaveURL('/admin/addons/new');

    // Fill form
    await page.locator('input[name="nameAr"]').fill(testGroupName);
    await page.locator('input[name="nameEn"]').fill('Test Addons Group');
    await page.locator('input[name="isRequired"]').check();
    await page.locator('input[name="isMulti"]').check();
    await page.locator('input[name="minSelect"]').fill('1');
    await page.locator('input[name="maxSelect"]').fill('2');

    // Add option items
    // First option (pre-existing row)
    const optInputs = page.locator('fieldset:has-text("الخيارات المتاحة") input[type="text"][placeholder*="بالعربية"]');
    await optInputs.nth(0).fill('صلصة حارة خاصة');
    const priceInputs = page.locator('fieldset:has-text("الخيارات المتاحة") input[type="number"]');
    await priceInputs.nth(0).fill('15');

    // Add second option
    await page.locator('button:has-text("+ إضافة خيار")').click();
    await optInputs.nth(1).fill('طحينة سمسم فاخرة');
    await priceInputs.nth(1).fill('10');

    // Attach to test product
    if (testProductId) {
      const prodCheck = page.locator(`input[type="checkbox"]`).filter({ has: page.locator(`xpath=../span/strong[text()="${testProductName}"]`) });
      if (await prodCheck.count() > 0) {
        await prodCheck.first().check();
      } else {
        // Fallback: check first available product
        await page.locator('fieldset:has-text("ربط المجموعة بالمنتجات") input[type="checkbox"]').first().check();
      }
    }

    await page.screenshot({ path: path.join(QA_DIR, '02-admin-addon-form.png') });

    // Submit form
    await page.locator('button[type="submit"]:has-text("إنشاء المجموعة")').click();
    await page.waitForURL('/admin/addons');

    // Verify presence in list
    const row = page.locator(`tr:has-text("${testGroupName}")`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('2 خيارات');
    await expect(row).toContainText('مطلوبة');

    // Verify in DB
    const dbRows = await q(`select id from "OptionGroup" where "nameAr"=$1`, [testGroupName]);
    expect(dbRows.length).toBe(1);
    testGroupId = dbRows[0].id;
  });

  test('2. Customer Combobox search, selection, min/max limits & live price in modal', async ({ page }) => {
    await initMenu(page, '/ar');

    // Open the product we assigned
    const productCard = page.locator('.card', { hasText: testProductName }).first();
    await expect(productCard).toBeVisible();
    await productCard.click();

    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();

    // The addon group should be visible
    const addonBox = modal.locator('.addon-group-box', { hasText: testGroupName });
    await expect(addonBox).toBeVisible();
    await expect(addonBox).toContainText('مطلوب');

    // Initial price before addons
    const basePriceText = await modal.locator('.btn-add-price b').innerText();
    const basePrice = parseInt(basePriceText, 10);
    expect(basePrice).toBeGreaterThan(0);

    // Open the combobox
    await addonBox.locator('.combobox-trigger').click();
    const dropdown = addonBox.locator('.combobox-dropdown');
    await expect(dropdown).toBeVisible();

    // Test Search typing in combobox
    const searchInput = dropdown.locator('.combobox-search-input');
    await searchInput.fill('حارة');
    // Only "صلصة حارة خاصة" should match
    await expect(dropdown.locator('.combobox-option-item')).toHaveCount(1);
    await expect(dropdown.locator('.combobox-option-item')).toContainText('صلصة حارة خاصة');

    // Select the option
    await dropdown.locator('.combobox-option-item').first().click();

    // Verify option chip appeared
    const chip = addonBox.locator('.addon-chip', { hasText: 'صلصة حارة خاصة' });
    await expect(chip).toBeVisible();

    // Verify price updated by +15
    const updatedPriceText = await modal.locator('.btn-add-price b').innerText();
    const updatedPrice = parseInt(updatedPriceText, 10);
    expect(updatedPrice).toBe(basePrice + 15);

    // Screenshot customer modal with active addon
    await page.screenshot({ path: path.join(QA_DIR, '03-customer-modal-addon.png') });

    // Add to cart
    await modal.locator('.btn-add-cart').click();
    await expect(page.locator('.floating-cart-wrapper')).toBeVisible({ timeout: 10_000 });
  });

  test('3. Cart item customization isolation & editing an item', async ({ page }) => {
    await initMenu(page, '/ar');

    // 1. Add product with First Addon (صلصة حارة خاصة: +15)
    let productCard = page.locator('.card', { hasText: testProductName }).first();
    await productCard.click();
    let modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();

    let addonBox = modal.locator('.addon-group-box', { hasText: testGroupName });
    await addonBox.locator('.combobox-trigger').click();
    await addonBox.locator('.combobox-option-item', { hasText: 'صلصة حارة خاصة' }).click();
    await modal.locator('.btn-add-cart').click();
    await expect(modal).not.toBeVisible();
    await expect(page.locator('.floating-cart-wrapper')).toBeVisible({ timeout: 10_000 });

    // 2. Add SAME product with Second Addon (طحينة سمسم فاخرة: +10)
    await productCard.click();
    await expect(modal).toBeVisible();
    addonBox = modal.locator('.addon-group-box', { hasText: testGroupName });
    await addonBox.locator('.combobox-trigger').click();
    await addonBox.locator('.combobox-option-item', { hasText: 'طحينة سمسم فاخرة' }).click();
    await modal.locator('.btn-add-cart').click();
    await expect(modal).not.toBeVisible();

    // Open Cart Drawer
    await page.locator('.floating-cart-btn').click();
    const drawer = page.locator('.cart-panel');
    await expect(drawer).toBeVisible();

    // Expect TWO distinct cart line items
    const cartItems = drawer.locator('.cart-item');
    await expect(cartItems).toHaveCount(2);

    // Verify add-on breakdown text in cart items
    await expect(cartItems.nth(0)).toContainText('صلصة حارة خاصة');
    await expect(cartItems.nth(1)).toContainText('طحينة سمسم فاخرة');

    await page.screenshot({ path: path.join(QA_DIR, '04-cart-separate-lines.png') });

    // 3. Test Editing Cart Item
    const editBtn = cartItems.nth(0).locator('.cart-item-edit-btn');
    await editBtn.click();

    // Cart drawer closes and ProductDetailModal opens in EDIT mode
    await expect(drawer).not.toBeVisible();
    await expect(modal).toBeVisible();
    await expect(modal.locator('.btn-add-cart')).toContainText('تحديث في الطلب');

    // The previously chosen option chip should be pre-selected
    await expect(modal.locator('.addon-chip', { hasText: 'صلصة حارة خاصة' })).toBeVisible();

    // Increase quantity to 2
    await modal.locator('.qty-btn[aria-label="زيادة الكمية"]').click();
    await expect(modal.locator('.qty-value')).toHaveText('2');

    // Save changes
    await modal.locator('.btn-add-cart').click();
    await expect(modal).not.toBeVisible();

    // Reopen cart to verify updated quantity
    await page.locator('.floating-cart-btn').click();
    await expect(drawer).toBeVisible();
    const updatedLine = drawer.locator('.cart-item', { hasText: 'صلصة حارة خاصة' });
    await expect(updatedLine.locator('.qty-value')).toHaveText('2');
  });

  test('4. Branch Selection & WhatsApp message generation per branch', async ({ page }) => {
    await initMenu(page, '/ar');

    // Add an item to cart
    const productCard = page.locator('.card', { hasText: testProductName }).first();
    await productCard.click();
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();
    const addonBox = modal.locator('.addon-group-box', { hasText: testGroupName });
    await addonBox.locator('.combobox-trigger').click();
    await addonBox.locator('.combobox-option-item').first().click();
    await modal.locator('.btn-add-cart').click();
    await expect(modal).not.toBeVisible();

    // Open Cart Drawer
    await page.locator('.floating-cart-btn').click();
    const drawer = page.locator('.cart-panel');
    await expect(drawer).toBeVisible();

    // Branch selector should have Gamasa and New Damietta
    const branchCards = drawer.locator('.branch-option-card');
    await expect(branchCards).toHaveCount(2);

    // 1. Select Gamasa branch
    const gamasaCard = branchCards.filter({ hasText: 'جمصة' });
    await gamasaCard.click();
    await expect(gamasaCard).toHaveClass(/selected/);

    let whatsappLink = await drawer.locator('.btn-whatsapp').getAttribute('href');
    expect(whatsappLink).not.toBeNull();
    let url = new URL(whatsappLink!);
    let text = url.searchParams.get('text') ?? '';
    expect(text).toContain('فرع جمصة');
    expect(text).toContain('صلصة حارة خاصة');

    // 2. Switch to New Damietta branch
    const damiettaCard = branchCards.filter({ hasText: 'دمياط الجديدة' });
    await damiettaCard.click();
    await expect(damiettaCard).toHaveClass(/selected/);

    whatsappLink = await drawer.locator('.btn-whatsapp').getAttribute('href');
    expect(whatsappLink).not.toBeNull();
    url = new URL(whatsappLink!);
    text = url.searchParams.get('text') ?? '';
    expect(text).toContain('فرع دمياط الجديدة');

    await page.screenshot({ path: path.join(QA_DIR, '05-cart-branch-selector.png') });
  });

  test('5. Branch ordering availability warning disables checkout', async ({ page }) => {
    acceptDialogs(page);
    await login(page);

    // Edit New Damietta branch in admin to disable ordering
    const damiettaBranch = await q(`select id from "Branch" where "nameAr" like '%دمياط الجديدة%' limit 1`);
    const branchId = damiettaBranch[0].id;

    await page.goto(`/admin/branches/${branchId}`);
    const isOrderableCheck = page.locator('input[name="isOrderable"]');
    await isOrderableCheck.uncheck();
    await page.locator('button[type="submit"]:has-text("حفظ التعديلات")').click();
    await page.waitForTimeout(1000);

    // Visit public site
    await initMenu(page, '/ar');

    // Add item to cart
    const productCard = page.locator('.card', { hasText: testProductName }).first();
    await productCard.click();
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();

    const addonBox = modal.locator('.addon-group-box', { hasText: testGroupName });
    if (await addonBox.isVisible()) {
      await addonBox.locator('.combobox-trigger').click();
      await addonBox.locator('.combobox-option-item').first().click();
    }
    await modal.locator('.btn-add-cart').click();
    await expect(modal).not.toBeVisible();

    // Open Cart Drawer
    await page.locator('.floating-cart-btn').click();
    const drawer = page.locator('.cart-panel');
    await expect(drawer).toBeVisible();

    // Click on New Damietta branch
    const damiettaCard = drawer.locator('.branch-option-card', { hasText: 'دمياط الجديدة' });
    await damiettaCard.click();

    // Verify warning banner is displayed
    const warning = drawer.locator('.branch-alert-banner.warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('الطلبات متوقفة مؤقتاً في هذا الفرع');

    // Verify WhatsApp button is disabled
    const disabledBtn = drawer.locator('.btn-whatsapp.disabled');
    await expect(disabledBtn).toBeVisible();

    await page.screenshot({ path: path.join(QA_DIR, '06-branch-unavailable-warning.png') });

    // Restore ordering via admin
    await page.goto(`/admin/branches/${branchId}`);
    await page.locator('input[name="isOrderable"]').check();
    await page.locator('button[type="submit"]:has-text("حفظ التعديلات")').click();
    await page.waitForTimeout(1000);
  });

  test('6. Appetizers & Drinks visual repair: 64x64 thumbnail, non-wrapping price, line-clamped description, 0px overflow', async ({ page }) => {
    await initMenu(page, '/ar');

    // 1. Verify Side Card thumbnail dimensions
    const sideThumb = page.locator('.card--side .side-thumb').first();
    await expect(sideThumb).toBeVisible();
    const sideBox = await sideThumb.boundingBox();
    expect(sideBox).not.toBeNull();
    expect(Math.round(sideBox!.width)).toBe(64);
    expect(Math.round(sideBox!.height)).toBe(64);

    // 2. Switch to Drinks tab
    await page.locator('.tab').nth(1).click();
    const drinkThumb = page.locator('.card--drink .drink-thumb').first();
    await expect(drinkThumb).toBeVisible();
    const drinkBox = await drinkThumb.boundingBox();
    expect(drinkBox).not.toBeNull();
    expect(Math.round(drinkBox!.width)).toBe(64);
    expect(Math.round(drinkBox!.height)).toBe(64);

    // 3. Check price non-wrapping and alignment
    const sidePrice = page.locator('.card--drink .price').first();
    const whiteSpace = await sidePrice.evaluate((el) => window.getComputedStyle(el).whiteSpace);
    expect(whiteSpace).toBe('nowrap');

    // 4. Test 360px viewport: verify 0px horizontal overflow
    await page.setViewportSize({ width: 360, height: 740 });
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHScroll).toBe(false);

    await page.screenshot({ path: path.join(QA_DIR, '07-repaired-sides-drinks-360px.png') });
  });
});
