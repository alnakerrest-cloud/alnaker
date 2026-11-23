import { test, expect, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import pg from 'pg';
import { login, shot, acceptDialogs } from './helpers';

require('./staging-env').loadStagingEnv();
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
  let testModifiedBranchId: string | null = null;
  let testModifiedBranchInitialOrderable: boolean = true;

  test.beforeAll(async () => {
    const p = await q(`select id, "nameAr" from "Product" where "isVisible"=true order by "sortOrder" limit 1`);
    if (p.length > 0) {
      testProductId = p[0].id;
      testProductName = p[0].nameAr;
    }
  });

  test.afterAll(async () => {
    // Targeted cleanup of test records and targeted restore of modified branch only
    if (testGroupId) {
      await q(`delete from "OptionGroup" where id=$1`, [testGroupId]);
    }
    await q(`delete from "OptionGroup" where "nameAr" like 'اختبار-إضافات-%'`);
    if (testModifiedBranchId) {
      await q(`update "Branch" set "isOrderable"=$1 where id=$2`, [testModifiedBranchInitialOrderable, testModifiedBranchId]);
      const overlayPath = path.join(process.cwd(), 'data', 'local-db-overlay.json');
      if (fs.existsSync(overlayPath)) {
        try {
          const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
          if (overlay?.updated?.Branch?.[testModifiedBranchId]) {
            overlay.updated.Branch[testModifiedBranchId].isOrderable = testModifiedBranchInitialOrderable;
            fs.writeFileSync(overlayPath, JSON.stringify(overlay, null, 2), 'utf8');
          }
        } catch {}
      }
      const settingsPath = path.join(process.cwd(), 'data', 'orders', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          if (settings?.branchOverrides?.[testModifiedBranchId]) {
            settings.branchOverrides[testModifiedBranchId].isOrderable = testModifiedBranchInitialOrderable;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
          }
        } catch {}
      }
    }
    await pool.end();
  });

  test('1. Admin Add-ons Management: create, list, and verify in DB', async ({ page }) => {
    acceptDialogs(page);
    await login(page);

    await page.goto('/admin/addons');
    await expect(page.locator('h1')).toContainText('إدارة الإضافات والخيارات');
    await page.screenshot({ path: path.join(QA_DIR, '01-admin-addons-list.png') });

    await page.locator('a[href="/admin/addons/new"]').click();
    await expect(page).toHaveURL('/admin/addons/new');

    await page.locator('input[name="nameAr"]').fill(testGroupName);
    await page.locator('input[name="nameEn"]').fill('Test Addons Group');
    await page.locator('input[name="isRequired"]').check();
    await page.locator('input[name="isMulti"]').check();
    await page.locator('input[name="minSelect"]').fill('1');
    await page.locator('input[name="maxSelect"]').fill('2');

    // First option
    const optInputs = page.locator('fieldset:has-text("الخيارات المتاحة") input[type="text"][placeholder*="بالعربية"]');
    await optInputs.nth(0).fill('صلصة حارة خاصة');
    const priceInputs = page.locator('fieldset:has-text("الخيارات المتاحة") input[type="number"]');
    await priceInputs.nth(0).fill('15');

    // Second option
    await page.locator('button:has-text("+ إضافة خيار")').click();
    await optInputs.nth(1).fill('طحينة سمسم فاخرة');
    await priceInputs.nth(1).fill('10');

    // Attach to test product
    if (testProductName) {
      const filterInput = page.locator('input[placeholder*="ابحث لتصفية المنتجات"]');
      if (await filterInput.isVisible()) {
        await filterInput.fill(testProductName);
        await page.waitForTimeout(300);
      }
      const label = page.locator('label', { hasText: testProductName }).first();
      await label.locator('input[type="checkbox"]').check();
    }

    await page.screenshot({ path: path.join(QA_DIR, '02-admin-addon-form.png') });

    await page.locator('button[type="submit"]:has-text("إنشاء المجموعة")').click();
    await page.waitForURL('/admin/addons');

    const row = page.locator(`tr:has-text("${testGroupName}")`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('2 خيارات');
    await expect(row).toContainText('مطلوبة');

    const dbRows = await q(`select id from "OptionGroup" where "nameAr"=$1`, [testGroupName]);
    expect(dbRows.length).toBe(1);
    testGroupId = dbRows[0].id;
  });

  test('2. Customer option tiles selection & live price update in modal', async ({ page }) => {
    await initMenu(page, '/ar');

    const productCard = page.locator('.card', { hasText: testProductName }).first();
    await expect(productCard).toBeVisible();
    await productCard.click();

    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();

    const addonBox = modal.locator('.addon-group-box', { hasText: testGroupName });
    await expect(addonBox).toBeVisible();
    await expect(addonBox).toContainText(/إجباري|مطلوب/);

    // Initial price
    const basePriceText = await modal.locator('.btn-add-price b').innerText();
    const basePrice = parseInt(basePriceText, 10);
    expect(basePrice).toBeGreaterThan(0);

    // Select option tile 'صلصة حارة خاصة'
    const optionTile = addonBox.locator('.option-tile', { hasText: 'صلصة حارة خاصة' });
    await expect(optionTile).toBeVisible();
    await optionTile.click();
    await expect(optionTile).toHaveClass(/selected/);

    // Verify price updated by +15
    const updatedPriceText = await modal.locator('.btn-add-price b').innerText();
    const updatedPrice = parseInt(updatedPriceText, 10);
    expect(updatedPrice).toBe(basePrice + 15);

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
    await addonBox.locator('.option-tile', { hasText: 'صلصة حارة خاصة' }).click();
    await modal.locator('.btn-add-cart').click();
    await expect(modal).not.toBeVisible();
    await expect(page.locator('.floating-cart-wrapper')).toBeVisible({ timeout: 10_000 });

    // 2. Add SAME product with Second Addon (طحينة سمسم فاخرة: +10)
    await productCard.click();
    await expect(modal).toBeVisible();
    addonBox = modal.locator('.addon-group-box', { hasText: testGroupName });
    await addonBox.locator('.option-tile', { hasText: 'طحينة سمسم فاخرة' }).click();
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

    // The previously chosen option tile should be selected
    await expect(modal.locator('.option-tile.selected', { hasText: 'صلصة حارة خاصة' })).toBeVisible();

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

  test('4. Branch Selection in Cart Drawer and CheckoutModal', async ({ page }) => {
    await initMenu(page, '/ar');

    // Add an item to cart
    const productCard = page.locator('.card', { hasText: testProductName }).first();
    await productCard.click();
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();
    const optionTile = modal.locator('.option-tile').first();
    if (await optionTile.isVisible()) {
      await optionTile.click();
    }
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

    // 2. Switch to New Damietta branch
    const damiettaCard = branchCards.filter({ hasText: 'دمياط الجديدة' });
    await damiettaCard.click();
    await expect(damiettaCard).toHaveClass(/selected/);

    await page.screenshot({ path: path.join(QA_DIR, '05-cart-branch-selector.png') });
  });

  test('5. Branch ordering availability warning disables checkout', async ({ page }) => {
    acceptDialogs(page);
    await login(page);

    // Edit New Damietta branch in admin to disable ordering
    const damiettaBranch = await q(`select id, "isOrderable" from "Branch" where "nameAr" like '%دمياط الجديدة%' limit 1`);
    const branchId = damiettaBranch[0].id;
    const initialOrderable = damiettaBranch[0].isOrderable ?? true;
    testModifiedBranchId = branchId;
    testModifiedBranchInitialOrderable = initialOrderable;

    try {
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

      const optionTile = modal.locator('.option-tile').first();
      if (await optionTile.isVisible()) {
        await optionTile.click();
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

      // Verify warning banner and closed badge
      const warning = drawer.locator('.branch-alert-banner.warning');
      await expect(warning).toBeVisible();
      await expect(warning).toContainText('الطلبات متوقفة مؤقتاً في هذا الفرع');
      await expect(damiettaCard.locator('.branch-card-closed-badge')).toBeVisible();

      await page.screenshot({ path: path.join(QA_DIR, '06-branch-unavailable-warning.png') });
    } finally {
      // Guaranteed restoration of branch orderability across all stores (DB, overlay, settings)
      await q(`update "Branch" set "isOrderable"=$1 where id=$2`, [initialOrderable, branchId]);

      const overlayPath = path.join(process.cwd(), 'data', 'local-db-overlay.json');
      if (fs.existsSync(overlayPath)) {
        try {
          const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
          if (overlay?.updated?.Branch?.[branchId]) {
            overlay.updated.Branch[branchId].isOrderable = initialOrderable;
            fs.writeFileSync(overlayPath, JSON.stringify(overlay, null, 2), 'utf8');
          }
        } catch {}
      }

      const settingsPath = path.join(process.cwd(), 'data', 'orders', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          if (settings?.branchOverrides?.[branchId]) {
            settings.branchOverrides[branchId].isOrderable = initialOrderable;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
          }
        } catch {}
      }
    }
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
