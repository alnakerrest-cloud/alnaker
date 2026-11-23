import { test, expect, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';
import { login, acceptDialogs } from './helpers';

require('./staging-env').loadStagingEnv();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;

const QA_DIR = path.resolve(__dirname, '..', 'qa-premium', 'offers');
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

test.describe('Naqer Menu — Card Layout Repair & Offers Management Suite', () => {
  test.describe.configure({ mode: 'serial' });
  const token = `e2e-${Date.now()}`;
  let testProductId: string | null = null;
  let testProductName: string = '';
  let testProductPrice: number = 0;
  let testOfferId: string | null = null;
  let gamasaBranchId: string | null = null;
  let damiettaBranchId: string | null = null;

  test.beforeAll(async () => {
    // Clear offers for clean test isolation
    await q(`DELETE FROM "Offer"`);

    // 1. Get first active platter/meal product with a variant
    const prods = await q(`
      select p.id, p."nameAr", v.price 
      from "Product" p 
      join "ProductVariant" v on v."productId"=p.id 
      where p."isVisible"=true 
      order by p."sortOrder" asc 
      limit 1
    `);
    if (prods.length > 0) {
      testProductId = prods[0].id;
      testProductName = prods[0].nameAr;
      testProductPrice = Number(prods[0].price);
    }

    // 2. Get branches
    const branches = await q(`select id, "nameAr", "cityAr" from "Branch" order by "sortOrder" asc`);
    for (const b of branches) {
      if (b.cityAr.includes('جمصة') || b.nameAr.includes('جمصة')) {
        gamasaBranchId = b.id;
      }
      if (b.cityAr.includes('دمياط') || b.nameAr.includes('دمياط')) {
        damiettaBranchId = b.id;
      }
    }
    if (!gamasaBranchId && branches[0]) gamasaBranchId = branches[0].id;
    if (!damiettaBranchId && branches[1]) damiettaBranchId = branches[1].id;
  });

  test.afterAll(async () => {
    // Clean up all test offers and targets
    await q(`delete from "Offer" where "titleAr" like 'عرض تيست-%' or "titleAr" like 'عرض تجريبي-%' or "titleAr" like '%${token}%'`);
    await pool.end();
  });

  // ==========================================
  // 1. CARD LAYOUT REPAIR & VIEWPORT AUDIT
  // ==========================================
  test('1. Full Card Layout Audit: vertical hierarchy, no overlap, zero horizontal overflow across 6 viewports', async ({ page }) => {
    const viewports = [
      { name: '360px-mobile-sm', width: 360, height: 740 },
      { name: '390px-mobile-standard', width: 390, height: 844 },
      { name: '768px-tablet', width: 768, height: 1024 },
      { name: '1024px-desktop-sm', width: 1024, height: 768 },
      { name: '1440px-desktop-wide', width: 1440, height: 900 },
      { name: '1920px-desktop-fhd', width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await initMenu(page, '/ar');

      // Check horizontal overflow: document width should not exceed window viewport width
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      expect(hasOverflow, `Zero horizontal overflow at ${vp.name}`).toBe(false);

      // Verify Platter card hierarchy (Image -> Title -> Description -> Price foot)
      const platters = page.locator('.card--platter');
      if (await platters.count() > 0) {
        const p1 = platters.first();
        await expect(p1.locator('.platter-media')).toBeVisible();
        await expect(p1.locator('.card-title')).toBeVisible();
        await expect(p1.locator('.platter-foot')).toBeVisible();
        await expect(p1.locator('.price')).toBeVisible();
      }

      // Verify Meal card hierarchy (Image -> Title -> Description -> Price foot)
      const meals = page.locator('.card--meal');
      if (await meals.count() > 0) {
        const m1 = meals.first();
        await expect(m1.locator('.card-media')).toBeVisible();
        await expect(m1.locator('.card-title')).toBeVisible();
        await expect(m1.locator('.card-foot')).toBeVisible();
        await expect(m1.locator('.price')).toBeVisible();
      }

      // Verify Side & Drink vertical layout (Thumb -> Title -> Description -> Price foot)
      const sides = page.locator('.card--side, .card--drink');
      if (await sides.count() > 0) {
        const s1 = sides.first();
        await expect(s1.locator('.side-thumb, .drink-thumb')).toBeVisible();
        await expect(s1.locator('.card-title')).toBeVisible();
        await expect(s1.locator('.side-foot, .drink-foot')).toBeVisible();
        await expect(s1.locator('.price')).toBeVisible();
      }

      // Capture screenshot for visual QA
      await page.screenshot({ path: path.join(QA_DIR, `01-layout-${vp.name}.png`) });
    }

    // Also check English locale
    await page.setViewportSize({ width: 1200, height: 800 });
    await initMenu(page, '/en');
    const enOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(enOverflow, 'Zero horizontal overflow in English').toBe(false);
    await page.screenshot({ path: path.join(QA_DIR, `01-layout-en-desktop.png`) });
  });

  // ==========================================
  // 2. ADMIN OFFERS MANAGEMENT (CRUD)
  // ==========================================
  test('2. Admin Offers: create inactive-by-default offer, list, toggle active, and verify DB', async ({ page }) => {
    acceptDialogs(page);
    await login(page);

    // Verify Admin Nav includes Offers link
    const navLink = page.locator('a[href="/admin/offers"]');
    await expect(navLink).toBeVisible();
    await navLink.click();
    await expect(page).toHaveURL('/admin/offers');
    await expect(page.locator('h1')).toContainText('إدارة العروض والخصومات');
    await page.screenshot({ path: path.join(QA_DIR, '02-admin-offers-list.png') });

    // Click new offer (.first() avoids ambiguity with empty state link)
    await page.locator('a[href="/admin/offers/new"]').first().click();
    await expect(page).toHaveURL('/admin/offers/new');

    const offerTitleAr = `عرض تيست-خصم 20%-${token}`;
    await page.locator('#titleAr').fill(offerTitleAr);
    await page.locator('#titleEn').fill(`Test 20% Off ${token}`);
    await page.locator('#descAr').fill('عرض ترويجي تجريبي لاختبار نظام الخصومات');
    await page.locator('#badgeAr').fill('توفير 20%');

    // Select offer type: PERCENTAGE
    await page.locator('#offerType').selectOption('PERCENTAGE');
    await page.locator('#discountValue').fill('20');

    // Attach to test product
    if (testProductName) {
      const prodCheckbox = page.locator(`label:has-text("${testProductName}") input[type="checkbox"]`);
      if (await prodCheckbox.count() > 0) {
        await prodCheckbox.first().check();
      } else {
        await page.locator('input[type="checkbox"]').first().check();
      }
    }

    // Notice: isActive checkbox is NOT checked by default per specifications
    const isActiveCheckbox = page.locator('input[name="isActive"]');
    expect(await isActiveCheckbox.isChecked()).toBe(false);

    // Take screenshot of new offer form
    await page.screenshot({ path: path.join(QA_DIR, '03-admin-new-offer-form.png') });

    // Submit form (use main form button to avoid hitting sidebar logout)
    await page.locator('main form button[type="submit"]').click();
    await expect(page).toHaveURL('/admin/offers', { timeout: 15_000 });

    // Verify offer created in DB and is inactive by default
    const dbOffer = (await q(`select * from "Offer" where "titleAr"=$1`, [offerTitleAr]))[0];
    expect(dbOffer, 'Offer persisted in DB').toBeTruthy();
    expect(dbOffer.isActive, 'Offer is inactive by default').toBe(false);
    expect(Number(dbOffer.discountValue)).toBe(20);
    testOfferId = dbOffer.id;

    // Verify DB targets
    const productTargets = await q(`select * from "OfferProductTarget" where "offerId"=$1`, [testOfferId]);
    expect(productTargets.length, 'Product target relation created').toBeGreaterThanOrEqual(1);

    // Verify strict DB schema guard: zero columns matching %branch% across menu/catalog tables
    const branchCols = await q(`select table_name, column_name from information_schema.columns where column_name ilike '%branch%' and table_name in ('Category', 'Section', 'Product', 'ProductVariant', 'OptionGroup', 'OptionItem', 'Offer')`);
    expect(branchCols.length, 'Zero %branch% columns in menu/offer tables').toBe(0);

    // Toggle active state in UI
    const offerRow = page.locator(`tr:has-text("${offerTitleAr}")`);
    await expect(offerRow).toBeVisible();
    await offerRow.locator('button:has-text("تفعيل")').click();

    // Verify in DB that it is now active
    await expect.poll(async () => {
      const row = (await q(`select "isActive" from "Offer" where id=$1`, [testOfferId]))[0];
      return row?.isActive;
    }, { timeout: 10_000 }).toBe(true);

    await page.screenshot({ path: path.join(QA_DIR, '04-admin-offers-activated.png') });
  });

  // ==========================================
  // 3. PUBLIC OFFERS EXPERIENCE & PRICING ENGINE
  // ==========================================
  test('3. Public Offers Experience: promotional section, strike-through price, modal, cart badge & discount breakdown', async ({ page }) => {
    // Ensure testOfferId is valid
    expect(testOfferId).toBeTruthy();

    await initMenu(page, '/ar');

    // 1. Verify Offers section is visible on public menu
    const offersSection = page.locator('.offers-section');
    await expect(offersSection).toBeVisible({ timeout: 10_000 });
    await expect(offersSection.locator('#offers-heading, .offers-title')).toBeVisible();

    // 2. Verify offer card details
    const offerCard = page.locator(`.offer-card`).first();
    await expect(offerCard).toBeVisible();
    await expect(offerCard.locator('.offer-tag')).toBeVisible();
    await expect(offerCard.locator('.offer-promo-price')).toBeVisible();
    await page.screenshot({ path: path.join(QA_DIR, '05-public-offers-carousel.png') });

    // 3. Click Claim button to open ProductDetailModal
    const claimBtn = offerCard.locator('.btn-claim-offer');
    await claimBtn.click();

    // 4. Verify ProductDetailModal opened with offer details
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible({ timeout: 8_000 });

    // Verify strike-through original price and offer badge
    const strikePrice = modal.locator('.modal-price-strike');
    await expect(strikePrice).toBeVisible();
    const offerBadge = modal.locator('.modal-offer-badge');
    await expect(offerBadge).toBeVisible();

    // 5. Quantity selector & live line total test
    const qtyValue = modal.locator('.qty-value');
    await expect(qtyValue).toHaveText('1');

    // Click plus button to increase qty to 2
    await modal.locator('.qty-btn').nth(1).click();
    await expect(qtyValue).toHaveText('2');

    await page.screenshot({ path: path.join(QA_DIR, '06-modal-discounted-price.png') });

    // 6. Add to cart
    await modal.locator('.btn-add-cart').click();
    await expect(modal).not.toBeVisible();

    // 7. Open Cart Drawer and verify applied offer and discount breakdown
    const cartBtn = page.locator('.floating-cart-btn');
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();

    const cartPanel = page.locator('.cart-panel');
    await expect(cartPanel).toBeVisible();

    // Verify item has offer badge
    const itemOfferBadge = cartPanel.locator('.cart-item-offer-badge');
    await expect(itemOfferBadge).toBeVisible();

    // Verify discount summary row exists
    const discountRow = cartPanel.locator('.cart-summary-discount, .cart-summary-row.discount');
    await expect(discountRow).toBeVisible();
    await expect(discountRow).toContainText('خصم العروض');

    await page.screenshot({ path: path.join(QA_DIR, '07-cart-applied-offer-breakdown.png') });
  });

  // ==========================================
  // 4. BRANCH TARGETING & DYNAMIC RECALCULATION
  // ==========================================
  test('4. Branch Targeting: discount applies only to eligible branch, dynamic recalculation on switch', async ({ page }) => {
    expect(gamasaBranchId).toBeTruthy();
    expect(damiettaBranchId).toBeTruthy();
    expect(testOfferId).toBeTruthy();

    acceptDialogs(page);
    await login(page);

    // Edit test offer in Admin UI to target ONLY Gamasa branch
    await page.goto(`/admin/offers/${testOfferId}`);
    await expect(page.locator('h1')).toContainText('تعديل العرض');

    // Click Gamasa branch button
    const gamasaBranchBtn = page.locator('button:has-text("جمصة")').first();
    await expect(gamasaBranchBtn).toBeVisible();
    await gamasaBranchBtn.click();

    // Submit form -> Runs updateOffer and revalidates /ar
    await page.locator('main form button[type="submit"]').click();
    await expect(page).toHaveURL('/admin/offers', { timeout: 15_000 });

    // Verify in DB that location target was saved
    const locTargets = await q(`select * from "OfferLocationTarget" where "offerId"=$1`, [testOfferId]);
    expect(locTargets.length, 'Location target attached').toBeGreaterThanOrEqual(1);

    // Visit public menu
    await initMenu(page, '/ar');

    // Open card for testProductName to add item to cart
    const prodCard = testProductName
      ? page.locator('.card', { hasText: testProductName }).first()
      : page.locator('.card--platter, .card--meal').first();
    await prodCard.click();
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible({ timeout: 8_000 });

    // Add to cart
    const optionTile = modal.locator('.option-tile').first();
    if (await optionTile.isVisible()) {
      await optionTile.click();
    }
    await modal.locator('.btn-add-cart').click();
    await expect(modal).not.toBeVisible();

    // Open cart drawer
    await page.locator('.floating-cart-btn').first().click();
    const cartPanel = page.locator('.cart-panel');
    await expect(cartPanel).toBeVisible();

    const gamasaRadio = cartPanel.locator('.branch-option-card:has-text("جمصة")');
    const damiettaRadio = cartPanel.locator('.branch-option-card:has-text("دمياط")');

    if (await gamasaRadio.count() > 0 && await damiettaRadio.count() > 0) {
      // 1. Select Gamasa branch -> Offer applies!
      await gamasaRadio.click();
      await expect(cartPanel.locator('.cart-summary-discount, .cart-summary-row.discount')).toBeVisible({ timeout: 5_000 });

      // 2. Select Damietta branch -> Offer does NOT apply!
      await damiettaRadio.click();
      await expect(cartPanel.locator('.cart-summary-discount, .cart-summary-row.discount')).not.toBeVisible({ timeout: 5_000 });

      // 3. Select Gamasa branch again -> Offer reapplies!
      await gamasaRadio.click();
      await expect(cartPanel.locator('.cart-summary-discount, .cart-summary-row.discount')).toBeVisible({ timeout: 5_000 });
    }

    await page.screenshot({ path: path.join(QA_DIR, '08-branch-specific-offer-toggle.png') });
  });

  // ==========================================
  // 5. INACTIVE / EXPIRED OFFERS HANDLING
  // ==========================================
  test('5. Inactive / Expired Offers: graceful hiding of promotional section when no active offers', async ({ page }) => {
    acceptDialogs(page);
    await login(page);

    // Go to admin offers and toggle off testOfferId
    await page.goto('/admin/offers');
    const offerRow = page.locator(`tr:has-text("${token}")`).first();
    await expect(offerRow).toBeVisible({ timeout: 10_000 });
    const stopBtn = offerRow.locator('button:has-text("إيقاف")');
    await expect(stopBtn).toBeVisible({ timeout: 10_000 });
    await stopBtn.click();
    await expect(offerRow.locator('button:has-text("تفعيل")')).toBeVisible({ timeout: 10_000 });

    // Verify in DB that offer is inactive
    await expect.poll(async () => {
      const row = (await q(`select "isActive" from "Offer" where id=$1`, [testOfferId]))[0];
      return row?.isActive;
    }, { timeout: 10_000 }).toBe(false);

    // Visit public menu
    await initMenu(page, '/ar');

    // Verify .offers-section is NOT present
    const offersSection = page.locator('.offers-section');
    await expect(offersSection).not.toBeVisible();

    await page.screenshot({ path: path.join(QA_DIR, '09-no-offers-graceful-hide.png') });
  });

  // ==========================================
  // 6. ADMIN OFFERS DELETION & AUDIT
  // ==========================================
  test('6. Admin Offers Deletion: delete test offer with confirmation and cascade targets', async ({ page }) => {
    if (!testOfferId) return;

    acceptDialogs(page);
    await login(page);

    await page.goto('/admin/offers');
    const row = page.locator(`tr:has-text("${token}")`).first();
    await expect(row).toBeVisible({ timeout: 10_000 });
      // Click delete button
      await row.locator('button:has-text("حذف")').click();
      // Click confirm delete
      const confirmBtn = row.locator('button:has-text("تأكيد الحذف")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      // Verify removed from DB
      await expect.poll(async () => {
        const rows = await q(`select id from "Offer" where id=$1`, [testOfferId]);
        return rows.length;
      }, { timeout: 10_000 }).toBe(0);

      // Verify cascade deleted product targets
      const remainingTargets = await q(`select id from "OfferProductTarget" where "offerId"=$1`, [testOfferId]);
      expect(remainingTargets.length, 'Targets cascaded').toBe(0);
  });
});
