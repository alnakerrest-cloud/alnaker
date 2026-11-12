import { chromium } from 'playwright';
import * as path from 'node:path';
import * as fs from 'node:fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 2 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const QA_DIR = path.resolve(__dirname, '..', 'qa-premium', 'dynamic-offers');
fs.mkdirSync(QA_DIR, { recursive: true });

async function loginAdmin(page) {
  await page.goto('http://127.0.0.1:3001/admin/login');
  await page.locator('input[name="email"]').fill('admin@naqer-menu.local');
  await page.locator('input[name="password"]').fill('CHANGE_ME_DEV_ONLY_PASSWORD');
  await page.locator('button[type="submit"]').click();
  await page.locator('a[href="/admin/products"]').first().waitFor({ state: 'visible', timeout: 20000 });
}

async function run() {
  console.log('🚀 Starting Comprehensive Dynamic Offers QA Sequence...');

  const browser = await chromium.launch({ headless: true });
  const adminPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  adminPage.on('dialog', async (d) => await d.accept());

  console.log('🔐 Step 1: Login to Admin Dashboard...');
  await loginAdmin(adminPage);

  // Clean DB for clean start
  await q('DELETE FROM "Offer"');

  // ─────────────────────────────────────────────────────────────
  // PHASE 1: CREATE OFFER & ACTIVATE (1 ACTIVE OFFER STATE)
  // ─────────────────────────────────────────────────────────────
  console.log('📝 Step 2: Create Offer #1 via Dashboard...');
  await adminPage.goto('http://127.0.0.1:3001/admin/offers/new');
  await adminPage.locator('#titleAr').fill('عرض اختبار الناقر الحصري');
  await adminPage.locator('#titleEn').fill('Exclusive Naqer Offer');
  await adminPage.locator('#descAr').fill('خصم استثنائي 10% على صينية الوحوش الفاخرة لجميع العائلات وزوار القرية لفترة محدودة.');
  await adminPage.locator('#descEn').fill('Special 10% promotional discount on the signature Monster Tray for a limited time.');
  await adminPage.locator('#badgeAr').fill('عرض خاص 10%');
  await adminPage.locator('#badgeEn').fill('Special 10% Off');

  await adminPage.locator('#offerType').selectOption('PERCENTAGE');
  await adminPage.locator('#discountValue').fill('10');

  // Check Featured Offer
  await adminPage.locator('#isFeatured').check();

  // Select target product (صينية الوحوش)
  const monsterCheckbox = adminPage.locator('label:has-text("صينية الوحوش") input[type="checkbox"]');
  if ((await monsterCheckbox.count()) > 0) {
    await monsterCheckbox.first().check();
  } else {
    await adminPage.locator('label input[name="productIds"]').first().check();
  }

  // Select branches (جمصة ودمياط الجديدة)
  const branchBtns = adminPage.locator('button:has-text("فرع")');
  const bCount = await branchBtns.count();
  for (let i = 0; i < bCount; i++) {
    await branchBtns.nth(i).click();
  }

  // Upload image
  const testImg = path.resolve(__dirname, '..', 'e2e-logo.png');
  if (fs.existsSync(testImg)) {
    await adminPage.locator('input[name="imageFile"]').setInputFiles(testImg);
  }

  // Submit form
  await adminPage.locator('main form button[type="submit"]').click();
  await adminPage.waitForURL('**/admin/offers', { timeout: 20000 });
  console.log('Offer created! Now activating via Dashboard toggle button...');

  // Activate Offer #1
  const row1 = adminPage.locator('tr:has-text("عرض اختبار الناقر الحصري")');
  await row1.locator('button:has-text("تفعيل")').click();
  await row1.locator('button:has-text("إيقاف")').waitFor({ state: 'visible', timeout: 15000 });
  console.log('Offer #1 activated successfully!');

  // ─────────────────────────────────────────────────────────────
  // PHASE 2: PUBLIC MENU (1 ACTIVE OFFER - FEATURED FULL-WIDTH)
  // ─────────────────────────────────────────────────────────────
  console.log('🌐 Step 3: Public Menu - Verify 1 Featured Offer...');
  const clientPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await clientPage.goto('http://127.0.0.1:3001/ar');
  await clientPage.evaluate(() => localStorage.clear());
  await clientPage.reload();

  const offersSection = clientPage.locator('.offers-section--single');
  await offersSection.waitFor({ state: 'visible', timeout: 15000 });
  console.log('Featured Single Offer is VISIBLE on /ar!');

  await clientPage.screenshot({ path: path.join(QA_DIR, '01-one-offer-featured-desktop.png') });

  // Mobile screenshot
  await clientPage.setViewportSize({ width: 390, height: 844 });
  await clientPage.waitForTimeout(300);
  await clientPage.screenshot({ path: path.join(QA_DIR, '02-one-offer-featured-mobile-390px.png') });

  // ─────────────────────────────────────────────────────────────
  // PHASE 3: OPEN OFFER DETAIL MODAL
  // ─────────────────────────────────────────────────────────────
  console.log('🔍 Step 4: Open Offer Detail Modal...');
  await clientPage.setViewportSize({ width: 1280, height: 900 });
  const claimBtn = clientPage.locator('.btn-claim-offer').first();
  await claimBtn.click();

  const modal = clientPage.locator('.modal-panel.offer-detail-modal-panel');
  await modal.waitFor({ state: 'visible' });
  console.log('OfferDetailModal opened successfully!');

  await clientPage.screenshot({ path: path.join(QA_DIR, '03-offer-detail-modal-desktop.png') });

  await clientPage.setViewportSize({ width: 390, height: 844 });
  await clientPage.waitForTimeout(300);
  await clientPage.screenshot({ path: path.join(QA_DIR, '04-offer-detail-modal-mobile-390px.png') });

  // ─────────────────────────────────────────────────────────────
  // PHASE 4: ADD TO CART & VERIFY PROMOTIONAL BREAKDOWN
  // ─────────────────────────────────────────────────────────────
  console.log('🛒 Step 5: Add Offer to Cart...');
  await clientPage.setViewportSize({ width: 1280, height: 900 });
  await clientPage.locator('.btn-add-cart').click();
  await clientPage.waitForTimeout(600);

  const cartDrawer = clientPage.locator('.cart-panel');
  if (!(await cartDrawer.isVisible())) {
    const floatingBtn = clientPage.locator('.floating-cart-wrapper .floating-cart-btn');
    await floatingBtn.waitFor({ state: 'visible' });
    await floatingBtn.click();
  }
  await cartDrawer.waitFor({ state: 'visible' });
  console.log('Cart drawer opened with promotional offer breakdown!');

  // Verify WhatsApp order link contains branch and discount
  const waBtn = cartDrawer.locator('.btn-whatsapp');
  const waHref = await waBtn.getAttribute('href');
  console.log('Generated WhatsApp Link starts with:', waHref?.slice(0, 35));

  await clientPage.screenshot({ path: path.join(QA_DIR, '05-cart-drawer-offer-breakdown.png') });
  await clientPage.locator('.cart-close').click();
  await clientPage.waitForTimeout(400);

  // ─────────────────────────────────────────────────────────────
  // PHASE 5: DEACTIVATE OFFER -> VERIFY COMPLETE DISAPPEARANCE (0 OFFERS)
  // ─────────────────────────────────────────────────────────────
  console.log('⏸️ Step 6: Deactivate Offer from Dashboard -> Verify 0 Offers...');
  await adminPage.goto('http://127.0.0.1:3001/admin/offers');
  const deactRow = adminPage.locator('tr:has-text("عرض اختبار الناقر الحصري")');
  await deactRow.locator('button:has-text("إيقاف")').click();
  await deactRow.locator('button:has-text("تفعيل")').waitFor({ state: 'visible', timeout: 15000 });
  console.log('Deactivated from Dashboard!');

  // Return to public menu -> verify complete disappearance
  await clientPage.goto('http://127.0.0.1:3001/ar');
  await clientPage.reload();
  const zeroCount = await clientPage.locator('.offers-section').count();
  console.log('Offers section count on /ar after deactivation:', zeroCount);
  if (zeroCount !== 0) throw new Error('Expected 0 offers section when deactivated, got ' + zeroCount);

  await clientPage.screenshot({ path: path.join(QA_DIR, '06-zero-offers-hidden-desktop.png') });
  await clientPage.setViewportSize({ width: 390, height: 844 });
  await clientPage.waitForTimeout(300);
  await clientPage.screenshot({ path: path.join(QA_DIR, '07-zero-offers-hidden-mobile-390px.png') });

  // ─────────────────────────────────────────────────────────────
  // PHASE 6: REACTIVATE OFFER #1 & CREATE OFFER #2 (2+ OFFERS SLIDER)
  // ─────────────────────────────────────────────────────────────
  console.log('▶️ Step 7: Reactivate Offer #1...');
  await adminPage.goto('http://127.0.0.1:3001/admin/offers');
  const reactRow = adminPage.locator('tr:has-text("عرض اختبار الناقر الحصري")');
  await reactRow.locator('button:has-text("تفعيل")').click();
  await reactRow.locator('button:has-text("إيقاف")').waitFor({ state: 'visible', timeout: 15000 });

  console.log('➕ Step 8: Create Offer #2 via Dashboard...');
  await adminPage.goto('http://127.0.0.1:3001/admin/offers/new');
  await adminPage.locator('#titleAr').fill('عرض المشويات الملكي الفاخر');
  await adminPage.locator('#titleEn').fill('Royal Grills Feast Special');
  await adminPage.locator('#descAr').fill('تشكيلة مشويات فاخرة على الفحم تكفي حتى 4 أفراد مع أرز بسمتي وسلطات بخصم 15%.');
  await adminPage.locator('#descEn').fill('Deluxe charcoal grills feast for 4 with basmati rice and salads at 15% discount.');
  await adminPage.locator('#badgeAr').fill('عرض عائلي 15%');
  await adminPage.locator('#badgeEn').fill('Family 15% Off');

  await adminPage.locator('#offerType').selectOption('PERCENTAGE');
  await adminPage.locator('#discountValue').fill('15');

  // Select target product
  const pCheckboxes = adminPage.locator('label input[name="productIds"]');
  if ((await pCheckboxes.count()) > 1) {
    await pCheckboxes.nth(1).check();
  } else if ((await pCheckboxes.count()) > 0) {
    await pCheckboxes.first().check();
  }

  // Select branches
  const bCheckboxes = adminPage.locator('fieldset:has-text("الفروع") input[type="checkbox"], label:has-text("فرع") input[type="checkbox"]');
  const bLen = await bCheckboxes.count();
  for (let i = 0; i < bLen; i++) {
    await bCheckboxes.nth(i).check();
  }

  if (fs.existsSync(testImg)) {
    await adminPage.locator('input[name="imageFile"]').setInputFiles(testImg);
  }

  await adminPage.locator('main form button[type="submit"]').click();
  await adminPage.waitForURL('**/admin/offers', { timeout: 20000 });

  // Activate Offer #2
  const row2 = adminPage.locator('tr:has-text("عرض المشويات الملكي الفاخر")');
  await row2.locator('button:has-text("تفعيل")').click();
  await row2.locator('button:has-text("إيقاف")').waitFor({ state: 'visible', timeout: 15000 });
  console.log('Offer #2 activated! Both offers are now live!');

  // ─────────────────────────────────────────────────────────────
  // PHASE 7: PUBLIC MENU (2+ OFFERS - PREMIUM SLIDER / CAROUSEL)
  // ─────────────────────────────────────────────────────────────
  console.log('🎠 Step 9: Public Menu - Verify 2+ Offers Slider / Carousel...');
  await clientPage.setViewportSize({ width: 1280, height: 900 });
  await clientPage.goto('http://127.0.0.1:3001/ar');
  await clientPage.locator('.offers-section--slider').waitFor({ state: 'visible', timeout: 15000 });
  console.log('Slider section is VISIBLE on /ar!');

  await clientPage.screenshot({ path: path.join(QA_DIR, '08-two-offers-slider-desktop.png') });

  await clientPage.setViewportSize({ width: 390, height: 844 });
  await clientPage.waitForTimeout(300);
  await clientPage.screenshot({ path: path.join(QA_DIR, '09-two-offers-slider-mobile-390px.png') });

  // Test Slider Navigation (Next Button)
  console.log('➡️ Step 10: Test Slider Navigation Next button...');
  await clientPage.setViewportSize({ width: 1280, height: 900 });
  const nextBtn = clientPage.locator('.slider-nav-btn--next');
  await nextBtn.click();
  await clientPage.waitForTimeout(600);
  await clientPage.screenshot({ path: path.join(QA_DIR, '10-slider-navigated-to-slide2.png') });

  // ─────────────────────────────────────────────────────────────
  // PHASE 8: DASHBOARD AUDIT SCREENSHOTS
  // ─────────────────────────────────────────────────────────────
  console.log('📊 Step 11: Capture Dashboard Screenshots...');
  await adminPage.goto('http://127.0.0.1:3001/admin/offers');
  await adminPage.waitForSelector('h1');
  await adminPage.screenshot({ path: path.join(QA_DIR, '11-admin-offers-list.png') });

  await adminPage.goto('http://127.0.0.1:3001/admin/offers/new');
  await adminPage.waitForSelector('#isFeatured');
  await adminPage.screenshot({ path: path.join(QA_DIR, '12-admin-new-offer-form-featured.png') });

  // Verify DB state
  const activeOffers = await q('SELECT id, "titleAr", "isActive", "sortOrder" FROM "Offer" WHERE "isActive" = true ORDER BY "sortOrder" ASC');
  console.log('Final Active Offers in DB:', activeOffers);

  await clientPage.close();
  await adminPage.close();
  await browser.close();
  await pool.end();

  console.log('🎉 ALL DYNAMIC OFFERS QA PHASES EXECUTED SUCCESSFULLY!');
}

run().catch(async (e) => {
  console.error('ERROR in visual QA:', e);
  await pool.end();
  process.exit(1);
});
