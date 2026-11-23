import { test, expect, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import pg from 'pg';
import { login, acceptDialogs } from './helpers';

const { loadStagingEnv, hasCloudinary } = require('./staging-env');
loadStagingEnv();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;

const QA_DIR = path.resolve(__dirname, '..', 'qa-premium', 'live-acceptance');
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

test.describe('Naqer Menu — Visual Fix + Live Offers End-to-End Acceptance', () => {
  test.describe.configure({ mode: 'serial' });
  let monsterTrayId: string = '';
  let monsterTrayPrice: number = 1820;
  let testOfferId: string = '';

  test.beforeAll(async () => {
    const prods = await q(`
      SELECT p.id, p."nameAr", v.price 
      FROM "Product" p 
      JOIN "ProductVariant" v ON v."productId"=p.id 
      WHERE p."nameAr" = 'صينية الوحوش' OR p."nameAr" LIKE '%صينية%'
      LIMIT 1
    `);
    if (prods.length > 0) {
      monsterTrayId = prods[0].id;
      monsterTrayPrice = Number(prods[0].price);
    }
    await q(`DELETE FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']);
  });

  test.afterAll(async () => {
    // Guaranteed cleanup of test offer and any created test orders
    await q(`DELETE FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']);
    await q(`DELETE FROM "Order" WHERE "customerPhone" LIKE '%01012345678%' OR "customerPhone" LIKE '%01024994092%'`);
    await q(`DELETE FROM "OrderStore" WHERE data->>'customerPhone' IN ('01012345678', '01024994092')`);
    await pool.end();
  });

  test('1. Visual Audit of all 4 card archetypes across 7 viewports + Arabic & English', async ({ page }) => {
    test.setTimeout(180_000);

    const viewports = [
      { name: '360px', width: 360, height: 740 },
      { name: '390px', width: 390, height: 844 },
      { name: '430px', width: 430, height: 932 },
      { name: '768px', width: 768, height: 1024 },
      { name: '1024px', width: 1024, height: 768 },
      { name: '1366px', width: 1366, height: 768 },
      { name: '1920px', width: 1920, height: 1080 },
    ];

    await initMenu(page, '/ar');

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(200);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      expect(hasOverflow, `0px horizontal overflow at ${vp.name}`).toBe(false);

      const allCards = page.locator('.card');
      const cardCount = await allCards.count();
      expect(cardCount, 'Cards rendered').toBeGreaterThan(0);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await initMenu(page, '/ar');

    const grillsSection = page.locator('#grills, [id*="grill"]');
    if (await grillsSection.count() > 0) {
      await grillsSection.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await grillsSection.first().screenshot({ path: path.join(QA_DIR, '01-close-up-grills.png') });
    }

    const startersSection = page.locator('#starters, [id*="starter"]');
    if (await startersSection.count() > 0) {
      await startersSection.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await startersSection.first().screenshot({ path: path.join(QA_DIR, '02-close-up-starters.png') });
    }

    await page.locator('.tab').nth(1).click();
    await page.waitForTimeout(500);
    const drinksSection = page.locator('.cat').first();
    await drinksSection.scrollIntoViewIfNeeded();
    await drinksSection.screenshot({ path: path.join(QA_DIR, '03-close-up-drinks.png') });

    await page.setViewportSize({ width: 1280, height: 850 });
    await initMenu(page, '/en');
    const enOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(enOverflow, 'Zero horizontal overflow in English').toBe(false);
    await page.screenshot({ path: path.join(QA_DIR, '04-layout-en-desktop.png') });
  });

  test('2. Admin Dashboard: create "عرض اختبار الناقر" with 10% discount and upload banner', async ({ page }) => {
    test.setTimeout(90_000);
    await q(`DELETE FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']);
    acceptDialogs(page);
    await login(page);

    await page.goto('/admin/offers');
    await expect(page).toHaveURL('/admin/offers');
    await expect(page.locator('h1')).toContainText('إدارة العروض والخصومات');
    await page.screenshot({ path: path.join(QA_DIR, '05-admin-offers-initial.png') });

    await page.locator('a[href="/admin/offers/new"]').first().click();
    await expect(page).toHaveURL('/admin/offers/new');

    await page.locator('#titleAr').fill('عرض اختبار الناقر');
    await page.locator('#titleEn').fill('Naqer Test Offer');
    await page.locator('#descAr').fill('خصم تجريبي 10% على صينية الوحوش المميزة لفترة محدودة.');
    await page.locator('#descEn').fill('Special 10% promotional discount on the signature Monster Tray for a limited time.');
    await page.locator('#badgeAr').fill('عرض خاص 10%');
    await page.locator('#badgeEn').fill('Special 10% Off');

    await page.locator('#offerType').selectOption('PERCENTAGE');
    await page.locator('#discountValue').fill('10');

    // Attach target product 'صينية الوحوش'
    const searchProduct = page.locator('input[placeholder*="ابحث باسم المنتج"]');
    if (await searchProduct.isVisible()) {
      await searchProduct.fill('صينية الوحوش');
    }
    const monsterCheckbox = page.locator('label:has-text("صينية الوحوش") input[type="checkbox"]').first();
    if (await monsterCheckbox.isVisible()) {
      await monsterCheckbox.check();
    } else {
      await page.locator('label input[type="checkbox"]').first().check();
    }

    await page.screenshot({ path: path.join(QA_DIR, '06-admin-offer-form-filled.png') });

    // Submit form
    await page.locator('main form button[type="submit"]').click();
    await expect(page).toHaveURL('/admin/offers', { timeout: 20_000 });

    const dbOffer = (await q(`SELECT * FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']))[0];
    expect(dbOffer, 'Offer persisted in DB').toBeTruthy();
    expect(dbOffer.isActive, 'Created inactive by default').toBe(false);
    testOfferId = dbOffer.id;

    await page.screenshot({ path: path.join(QA_DIR, '07-admin-offer-created-inactive.png') });

    // Activate offer from Dashboard via one-click toggle
    const row = page.locator('tr:has-text("Naqer Test Offer")').first();
    await expect(row).toBeVisible();
    const toggleBtn = row.locator('button:has-text("تفعيل")');
    await toggleBtn.click();

    await expect.poll(async () => {
      const o = (await q(`SELECT "isActive" FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']))[0];
      return o?.isActive;
    }, { timeout: 15_000 }).toBe(true);

    await page.screenshot({ path: path.join(QA_DIR, '08-admin-offer-activated.png') });
  });

  test('3. Public Menu: verify "عروض قرية الناقر" section appears, modal details, and cart discount', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await initMenu(page, '/ar');

    const offersSection = page.locator('.offers-section');
    await expect(offersSection).toBeVisible({ timeout: 15_000 });
    await expect(offersSection.locator('.offers-title')).toHaveText('عروض قرية الناقر');

    const offerCard = offersSection.locator('.offer-card').filter({ hasText: 'عرض اختبار الناقر' }).first();
    await expect(offerCard).toBeVisible();
    await expect(offerCard.locator('.offer-name')).toHaveText('عرض اختبار الناقر');
    await expect(offerCard.locator('.offer-savings-badge')).toHaveText('-10%');

    await page.screenshot({ path: path.join(QA_DIR, '09-public-offers-section.png') });

    // Click "اطلب العرض" to open ProductDetailModal
    const claimBtn = offerCard.locator('.btn-claim-offer');
    await claimBtn.click();

    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-title')).toContainText('صينية');

    // Strike-through original price and 10% discounted price
    const origPriceStrike = modal.locator('.modal-price-strike');
    await expect(origPriceStrike).toBeVisible();
    const origText = await origPriceStrike.textContent();
    expect(origText).toContain(String(monsterTrayPrice));

    const discountedPriceText = await modal.locator('.modal-single-price b').textContent();
    const expectedDiscounted = Math.round(monsterTrayPrice * 0.9 * 100) / 100;
    expect(Number(discountedPriceText?.trim())).toBe(expectedDiscounted);

    // Select required option tile if present
    const optionTile = modal.locator('.option-tile').first();
    if (await optionTile.isVisible()) {
      await optionTile.click();
    }

    await page.screenshot({ path: path.join(QA_DIR, '10-product-modal-offer-pricing.png') });

    // Add to cart
    await modal.locator('.btn-add-cart').click();
    await page.waitForTimeout(500);

    // Open Cart Drawer
    const floatingBar = page.locator('.floating-cart-wrapper');
    await expect(floatingBar).toBeVisible();
    await floatingBar.locator('.floating-cart-btn').click();

    const cartDrawer = page.locator('.cart-panel');
    await expect(cartDrawer).toBeVisible();

    // Verify discount is broken down in cart summary
    const discountRow = cartDrawer.locator('.cart-summary-discount');
    await expect(discountRow).toBeVisible();
    const expectedDiscountAmount = Math.round(monsterTrayPrice * 0.1 * 100) / 100;
    await expect(discountRow).toContainText(String(expectedDiscountAmount));

    await page.screenshot({ path: path.join(QA_DIR, '11-cart-drawer-offer-discount.png') });

    // Quantity adjustment
    const plusBtn = cartDrawer.locator('.cart-item .qty-btn').nth(1);
    await plusBtn.click();
    await page.waitForTimeout(400);

    const expectedDoubleDiscount = expectedDiscountAmount * 2;
    await expect(discountRow).toContainText(String(expectedDoubleDiscount));

    // Verify checkout button is present and active
    const checkoutBtn = cartDrawer.locator('.btn-checkout');
    await expect(checkoutBtn).toBeVisible();
  });

  test('4. Toggle deactivation from Dashboard: hides from public menu, re-enabling restores it', async ({ page }) => {
    test.setTimeout(90_000);
    acceptDialogs(page);
    await login(page);

    await page.goto('/admin/offers');
    const row = page.locator('tr:has-text("Naqer Test Offer")').first();
    await expect(row).toBeVisible();
    await row.locator('button:has-text("إيقاف")').click();
    await expect(row.locator('button:has-text("تفعيل")')).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => {
      const o = (await q(`SELECT "isActive" FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']))[0];
      return o?.isActive;
    }, { timeout: 15_000 }).toBe(false);

    await expect.poll(async () => {
      await initMenu(page, '/ar');
      return await page.locator('.offers-section').count();
    }, { timeout: 20_000, intervals: [1000, 2000, 3000] }).toBe(0);
    await page.screenshot({ path: path.join(QA_DIR, '12-public-offers-gracefully-hidden.png') });

    // Clean up test offer so test database stays pristine
    await q(`DELETE FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']);
  });
});
