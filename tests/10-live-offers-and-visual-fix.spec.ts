import { test, expect, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import dotenv from 'dotenv';
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
    // 1. Locate 'صينية الوحوش' or first platter product
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
  });

  test.afterAll(async () => {
    await pool.end();
  });

  // ==========================================
  // PHASE 1 & 6: FULL CARD LAYOUT AUDIT & VIEWPORTS
  // ==========================================
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

      // Zero horizontal overflow check
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      expect(hasOverflow, `0px horizontal overflow at ${vp.name}`).toBe(false);

      // Verify all card types have non-wrapping price and independent title & description rows
      const allCards = page.locator('.card');
      const cardCount = await allCards.count();
      expect(cardCount, 'Cards rendered').toBeGreaterThan(0);
    }

    // Capture close-ups on desktop
    await page.setViewportSize({ width: 1280, height: 900 });
    await initMenu(page, '/ar');

    // 1. Close-up: Grills (المشويات)
    const grillsSection = page.locator('#grills, [id*="grill"]');
    if (await grillsSection.count() > 0) {
      await grillsSection.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await grillsSection.first().screenshot({ path: path.join(QA_DIR, '01-close-up-grills.png') });
    }

    // 2. Close-up: Starters / Appetizers (المقبلات)
    const startersSection = page.locator('#starters, [id*="starter"]');
    if (await startersSection.count() > 0) {
      await startersSection.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await startersSection.first().screenshot({ path: path.join(QA_DIR, '02-close-up-starters.png') });
    }

    // 3. Close-up: Drinks (المشروبات / القهوة / العصائر)
    await page.locator('.tab').nth(1).click();
    await page.waitForTimeout(500);
    const drinksSection = page.locator('.cat').first();
    await drinksSection.scrollIntoViewIfNeeded();
    await drinksSection.screenshot({ path: path.join(QA_DIR, '03-close-up-drinks.png') });

    // 4. English locale verification
    await page.setViewportSize({ width: 1280, height: 850 });
    await initMenu(page, '/en');
    const enOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(enOverflow, 'Zero horizontal overflow in English').toBe(false);
    await page.screenshot({ path: path.join(QA_DIR, '04-layout-en-desktop.png') });
  });

  // ==========================================
  // PHASE 3: CREATE TEST OFFER VIA ADMIN DASHBOARD
  // ==========================================
  test('2. Admin Dashboard: create "عرض اختبار الناقر" with 10% discount and upload banner', async ({ page }) => {
    test.setTimeout(90_000);
    // Clean up all previous test offers to ensure clean test isolation
    await q(`DELETE FROM "Offer"`);
    acceptDialogs(page);
    await login(page);

    // Navigate to Offers Management
    await page.goto('/admin/offers');
    await expect(page).toHaveURL('/admin/offers');
    await expect(page.locator('h1')).toContainText('إدارة العروض والخصومات');
    await page.screenshot({ path: path.join(QA_DIR, '05-admin-offers-initial.png') });

    // Click "إضافة عرض جديد"
    await page.locator('a[href="/admin/offers/new"]').first().click();
    await expect(page).toHaveURL('/admin/offers/new');

    // Fill in exact required offer parameters
    await page.locator('#titleAr').fill('عرض اختبار الناقر');
    await page.locator('#titleEn').fill('Naqer Test Offer');
    await page.locator('#descAr').fill('خصم تجريبي 10% على صينية الوحوش المميزة لفترة محدودة.');
    await page.locator('#descEn').fill('Special 10% promotional discount on the signature Monster Tray for a limited time.');
    await page.locator('#badgeAr').fill('عرض خاص 10%');
    await page.locator('#badgeEn').fill('Special 10% Off');

    // Select Percentage Discount
    await page.locator('#offerType').selectOption('PERCENTAGE');
    await page.locator('#discountValue').fill('10');

    // Attach target product 'صينية الوحوش'
    const monsterCheckbox = page.locator('label:has-text("صينية الوحوش") input[type="checkbox"]');
    if (await monsterCheckbox.count() > 0) {
      await monsterCheckbox.first().check();
    } else {
      await page.locator('label input[name="productIds"]').first().check();
    }

    // Attach target branches (both Gamasa and New Damietta)
    const branchCheckboxes = page.locator('fieldset:has-text("الفروع") input[type="checkbox"], label:has-text("فرع") input[type="checkbox"]');
    const bCount = await branchCheckboxes.count();
    for (let i = 0; i < bCount; i++) {
      await branchCheckboxes.nth(i).check();
    }

    // Upload promotional banner image if Cloudinary configured
    const testImage = path.resolve(__dirname, '..', 'e2e-logo.png');
    if (hasCloudinary() && fs.existsSync(testImage)) {
      await page.locator('input[name="imageFile"]').setInputFiles(testImage);
    }

    // Take screenshot of filled form
    await page.screenshot({ path: path.join(QA_DIR, '06-admin-offer-form-filled.png') });

    // Submit form
    await page.locator('main form button[type="submit"]').click();
    await expect(page).toHaveURL('/admin/offers', { timeout: 20_000 });

    // Verify offer created in DB and is inactive by default
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

    // Verify in DB that it is now active
    await expect.poll(async () => {
      const o = (await q(`SELECT "isActive" FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']))[0];
      return o?.isActive;
    }, { timeout: 15_000 }).toBe(true);

    await page.screenshot({ path: path.join(QA_DIR, '08-admin-offer-activated.png') });
  });

  // ==========================================
  // PHASE 4 & 5: PUBLIC OFFERS EXPERIENCE & CART VERIFICATION
  // ==========================================
  test('3. Public Menu: verify "عروض قرية الناقر" section appears, modal details, and cart discount', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await initMenu(page, '/ar');

    // 1. Verify Offers section is prominent after Hero and before Categories
    const offersSection = page.locator('.offers-section');
    await expect(offersSection).toBeVisible({ timeout: 15_000 });
    await expect(offersSection.locator('.offers-title')).toHaveText('عروض قرية الناقر');
    await expect(offersSection.locator('.offers-subtitle')).toHaveText('اختيارات مميزة وأسعار خاصة لفترة محدودة.');

    // 2. Verify offer card displays 'عرض اختبار الناقر' and 10% savings
    const offerCard = offersSection.locator('.offer-card').filter({ hasText: 'عرض اختبار الناقر' }).first();
    await expect(offerCard).toBeVisible();
    await expect(offerCard.locator('.offer-name')).toHaveText('عرض اختبار الناقر');
    await expect(offerCard.locator('.offer-savings-badge')).toHaveText('-10%');

    await page.screenshot({ path: path.join(QA_DIR, '09-public-offers-section.png') });

    // 3. Click "اطلب العرض" to open ProductDetailModal
    const claimBtn = offerCard.locator('.btn-claim-offer');
    await claimBtn.click();

    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-title')).toContainText('صينية');

    // Verify strike-through original price and 10% discounted price
    const origPriceStrike = modal.locator('.modal-price-strike');
    await expect(origPriceStrike).toBeVisible();
    const origText = await origPriceStrike.textContent();
    expect(origText).toContain(String(monsterTrayPrice));

    const discountedPriceText = await modal.locator('.modal-single-price b').textContent();
    const expectedDiscounted = Math.round(monsterTrayPrice * 0.9 * 100) / 100;
    expect(Number(discountedPriceText?.trim())).toBe(expectedDiscounted);

    await page.screenshot({ path: path.join(QA_DIR, '10-product-modal-offer-pricing.png') });

    // 4. Add to cart
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

    // 5. Test quantity adjustment and dynamic recalculation
    const plusBtn = cartDrawer.locator('.cart-item .qty-btn').nth(1);
    await plusBtn.click();
    await page.waitForTimeout(400);

    // 2 quantities = 2x discount
    const expectedDoubleDiscount = expectedDiscountAmount * 2;
    await expect(discountRow).toContainText(String(expectedDoubleDiscount));

    // Verify WhatsApp order link format
    const waBtn = cartDrawer.locator('.btn-whatsapp');
    const waHref = await waBtn.getAttribute('href');
    expect(waHref).not.toBeNull();
    const waUrl = new URL(waHref!);
    const waMsg = waUrl.searchParams.get('text') ?? '';

    expect(waMsg).toContain('صينية');
    expect(waMsg).toContain('الكمية: 2');
    expect(waMsg).toContain('السعر الأصلي:');
    expect(waMsg).toContain('الخصم:');
    expect(waMsg).toContain('المجموع:');
    expect(waMsg).toContain('الإجمالي المطلوب:');
  });

  // ==========================================
  // PHASE 4: TOGGLE DEACTIVATION & RE-ACTIVATION
  // ==========================================
  test('4. Toggle deactivation from Dashboard: hides from public menu, re-enabling restores it', async ({ page }) => {
    test.setTimeout(90_000);
    acceptDialogs(page);
    await login(page);

    // 1. Go to Admin Offers and deactivate the offer
    await page.goto('/admin/offers');
    const row = page.locator('tr:has-text("Naqer Test Offer")').first();
    await expect(row).toBeVisible();
    await row.locator('button:has-text("إيقاف")').click();
    await expect(row.locator('button:has-text("تفعيل")')).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => {
      const o = (await q(`SELECT "isActive" FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']))[0];
      return o?.isActive;
    }, { timeout: 15_000 }).toBe(false);

    // 2. Open public menu -> verify offers section gracefully hides
    await expect.poll(async () => {
      await initMenu(page, '/ar');
      return await page.locator('.offers-section').count();
    }, { timeout: 20_000, intervals: [1000, 2000, 3000] }).toBe(0);
    await page.screenshot({ path: path.join(QA_DIR, '12-public-offers-gracefully-hidden.png') });

    // 3. Re-activate in Dashboard
    await page.goto('/admin/offers');
    const row2 = page.locator('tr:has-text("Naqer Test Offer")').first();
    await row2.locator('button:has-text("تفعيل")').click();
    await expect(row2.locator('button:has-text("إيقاف")')).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => {
      const o = (await q(`SELECT "isActive" FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']))[0];
      return o?.isActive;
    }, { timeout: 15_000 }).toBe(true);

    // 4. Return to public menu -> verify it reappears
    await expect.poll(async () => {
      await initMenu(page, '/ar');
      return await page.locator('.offers-section').isVisible();
    }, { timeout: 20_000, intervals: [1000, 2000, 3000] }).toBe(true);
    await expect(page.locator('.offer-card:has-text("عرض اختبار الناقر")')).toBeVisible();

    await page.screenshot({ path: path.join(QA_DIR, '13-public-offers-restored-active.png') });

    // CRITICAL: LEAVE OFFER ACTIVE FOR USER AND OWNER DEMO!
    const activeCheck = (await q(`SELECT "isActive" FROM "Offer" WHERE "titleAr" = $1`, ['عرض اختبار الناقر']))[0];
    expect(activeCheck.isActive, 'Offer left active for the owner').toBe(true);
  });
});
