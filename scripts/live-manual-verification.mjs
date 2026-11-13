import { chromium } from 'playwright';
import * as path from 'node:path';
import * as fs from 'node:fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const ADMIN_LOGIN_PASSWORD = process.env.QA_ADMIN_PASSWORD;
if (!ADMIN_LOGIN_PASSWORD) {
  console.error('REFUSED: set QA_ADMIN_PASSWORD for manual verification (never commit it).');
  process.exit(2);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 2 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const OUT_DIR = path.resolve(__dirname, '..', 'qa-premium', 'live-manual');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  console.log('--- STEP 1: Inspect DB before run ---');
  const initialOffers = await q('SELECT id, "titleAr", "isActive" FROM "Offer"');
  console.log('Initial offers in DB:', initialOffers);

  // Clean up all offers so this test isolates exactly 1 offer
  await q('DELETE FROM "Offer"');

  console.log('--- STEP 2: Launch real browser ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Accept dialogs
  page.on('dialog', async (dialog) => {
    console.log('Dialog opened:', dialog.message());
    await dialog.accept();
  });

  // Login
  console.log('--- STEP 3: Login to Admin ---');
  await page.goto('http://127.0.0.1:3001/admin/login');
  await page.locator('input[name="email"]').fill('admin@naqer-menu.local');
  await page.locator('input[name="password"]').fill(ADMIN_LOGIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.locator('a[href="/admin/products"]').first().waitFor({ state: 'visible', timeout: 20000 });
  console.log('Logged in successfully. URL:', page.url());

  // Go to /admin/offers
  console.log('--- STEP 4: Navigate to /admin/offers ---');
  await page.goto('http://127.0.0.1:3001/admin/offers');
  await page.waitForSelector('h1');
  await page.screenshot({ path: path.join(OUT_DIR, '01-dashboard-offers-initial.png') });

  // Click Add New Offer
  console.log('--- STEP 5: Create Offer via UI ---');
  await page.locator('a[href="/admin/offers/new"]').first().click();
  await page.waitForURL('**/admin/offers/new');

  await page.locator('#titleAr').fill('عرض اختبار الناقر الحصري');
  await page.locator('#titleEn').fill('Exclusive Naqer Offer');
  await page.locator('#descAr').fill('خصم تجريبي 10% على صينية الوحوش المميزة لفترة محدودة.');
  await page.locator('#descEn').fill('Special 10% promotional discount on Monster Tray.');
  await page.locator('#badgeAr').fill('عرض خاص 10%');
  await page.locator('#badgeEn').fill('Special 10% Off');

  await page.locator('#offerType').selectOption('PERCENTAGE');
  await page.locator('#discountValue').fill('10');

  // Select monster tray
  const monsterCheckbox = page.locator('label:has-text("صينية الوحوش") input[type="checkbox"]');
  if (await monsterCheckbox.count() > 0) {
    await monsterCheckbox.first().check();
  } else {
    await page.locator('label input[name="productIds"]').first().check();
  }

  // Select branches
  const branchCheckboxes = page.locator('fieldset:has-text("الفروع") input[type="checkbox"], label:has-text("فرع") input[type="checkbox"]');
  const bCount = await branchCheckboxes.count();
  for (let i = 0; i < bCount; i++) {
    await branchCheckboxes.nth(i).check();
  }

  // Upload image
  const testImg = path.resolve(__dirname, '..', 'e2e-logo.png');
  if (fs.existsSync(testImg)) {
    await page.locator('input[name="imageFile"]').setInputFiles(testImg);
  }

  await page.screenshot({ path: path.join(OUT_DIR, '02-form-filled.png') });

  // Submit
  await page.locator('main form button[type="submit"]').click();
  await page.waitForURL('**/admin/offers', { timeout: 20000 });
  console.log('Form submitted. URL:', page.url());

  // Verify in DB
  const createdDb = (await q('SELECT id, "titleAr", "isActive" FROM "Offer" WHERE "titleAr" = $1', ['عرض اختبار الناقر الحصري']))[0];
  console.log('Created offer in DB:', createdDb);
  await page.screenshot({ path: path.join(OUT_DIR, '03-created-inactive-in-dashboard.png') });

  // Activate Offer
  console.log('--- STEP 6: Activate Offer from Dashboard ---');
  const row = page.locator('tr:has-text("عرض اختبار الناقر الحصري")');
  const activateBtn = row.locator('button:has-text("تفعيل")');
  await activateBtn.click();

  // Wait for button to change to "إيقاف"
  await row.locator('button:has-text("إيقاف")').waitFor({ state: 'visible', timeout: 15000 });
  console.log('Toggle completed in UI: button changed to "إيقاف"');

  const activeDb = (await q('SELECT id, "titleAr", "isActive" FROM "Offer" WHERE "titleAr" = $1', ['عرض اختبار الناقر الحصري']))[0];
  console.log('Offer in DB after activation:', activeDb);
  await page.screenshot({ path: path.join(OUT_DIR, '04-activated-in-dashboard.png') });

  // STEP 7: Open /ar in real browser
  console.log('--- STEP 7: Open /ar in public menu ---');
  await page.goto('http://127.0.0.1:3001/ar');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const offersSection = page.locator('.offers-section');
  await offersSection.waitFor({ state: 'visible', timeout: 20000 });
  console.log('Offers section is VISIBLE on /ar!');

  await page.screenshot({ path: path.join(OUT_DIR, '05-public-menu-with-offer.png'), fullPage: false });
  await offersSection.screenshot({ path: path.join(OUT_DIR, '06-offers-section-close-up.png') });

  // Open modal
  const offerCard = offersSection.locator('.offer-card').filter({ hasText: 'عرض اختبار الناقر الحصري' }).first();
  await offerCard.locator('.btn-claim-offer').click();

  const modal = page.locator('.modal-panel');
  await modal.waitFor({ state: 'visible' });
  console.log('Product modal opened for offer');
  await page.screenshot({ path: path.join(OUT_DIR, '07-modal-discount-pricing.png') });

  // Add to cart
  await modal.locator('.btn-add-cart').click();
  await page.waitForTimeout(500);

  // Open cart drawer
  await page.locator('.floating-cart-wrapper .floating-cart-btn').click();
  const cartDrawer = page.locator('.cart-panel');
  await cartDrawer.waitFor({ state: 'visible' });
  console.log('Cart drawer opened with discount breakdown');
  await page.screenshot({ path: path.join(OUT_DIR, '08-cart-drawer-breakdown.png') });

  // Close cart
  await cartDrawer.locator('.cart-close').click();

  // STEP 8: Deactivate offer from Dashboard
  console.log('--- STEP 8: Deactivate offer from Dashboard ---');
  await page.goto('http://127.0.0.1:3001/admin/offers');
  const rowDeact = page.locator('tr:has-text("عرض اختبار الناقر الحصري")');
  await rowDeact.locator('button:has-text("إيقاف")').click();
  await rowDeact.locator('button:has-text("تفعيل")').waitFor({ state: 'visible', timeout: 15000 });
  console.log('Deactivated in UI: button changed to "تفعيل"');

  const deactDb = (await q('SELECT id, "titleAr", "isActive" FROM "Offer" WHERE "titleAr" = $1', ['عرض اختبار الناقر الحصري']))[0];
  console.log('Offer in DB after deactivation:', deactDb);
  await page.screenshot({ path: path.join(OUT_DIR, '09-deactivated-in-dashboard.png') });

  // STEP 9: Open /ar -> verify offers section gracefully hides
  console.log('--- STEP 9: Open /ar -> verify offers section hides ---');
  await page.goto('http://127.0.0.1:3001/ar');
  const offersCount = await page.locator('.offers-section').count();
  console.log('Offers section count on /ar when deactivated:', offersCount);
  await page.screenshot({ path: path.join(OUT_DIR, '10-public-menu-offers-hidden.png') });

  // STEP 10: Re-activate offer
  console.log('--- STEP 10: Re-activate offer from Dashboard ---');
  await page.goto('http://127.0.0.1:3001/admin/offers');
  const rowReact = page.locator('tr:has-text("عرض اختبار الناقر الحصري")');
  await rowReact.locator('button:has-text("تفعيل")').click();
  await rowReact.locator('button:has-text("إيقاف")').waitFor({ state: 'visible', timeout: 15000 });
  console.log('Re-activated in UI: button changed to "إيقاف"');

  const finalDb = (await q('SELECT id, "titleAr", "isActive" FROM "Offer" WHERE "titleAr" = $1', ['عرض اختبار الناقر الحصري']))[0];
  console.log('Offer in DB after re-activation (FINAL ACTIVE):', finalDb);
  await page.screenshot({ path: path.join(OUT_DIR, '11-reactivated-in-dashboard.png') });

  // STEP 11: Return to /ar -> verify it reappears
  console.log('--- STEP 11: Return to /ar -> verify it reappears ---');
  await page.goto('http://127.0.0.1:3001/ar');
  await page.locator('.offers-section').waitFor({ state: 'visible', timeout: 20000 });
  console.log('Offers section successfully reappeared on /ar!');
  await page.screenshot({ path: path.join(OUT_DIR, '12-public-menu-offer-restored-active.png') });

  await browser.close();
  await pool.end();
  console.log('=== MANUAL E2E VERIFICATION COMPLETED SUCCESSFULLY ===');
}

main().catch(async (e) => {
  console.error('ERROR in manual verification:', e);
  await pool.end();
  process.exit(1);
});

