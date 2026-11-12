import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QA_DIR = path.resolve(__dirname, '..', 'qa-premium', 'real-photography');
fs.mkdirSync(QA_DIR, { recursive: true });

async function run() {
  console.log('🚀 Starting Comprehensive Real Photography Visual QA Suite...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // ─────────────────────────────────────────────────────────────
  // 1. PUBLIC MENU ARABIC DESKTOP (1280px)
  // ─────────────────────────────────────────────────────────────
  console.log('📸 1. Capturing Arabic Menu Desktop...');
  await page.goto('http://127.0.0.1:3001/ar');
  await page.locator('.bar').waitFor({ state: 'visible' });

  // Wait for all images in viewport to load
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(QA_DIR, '01-public-ar-hero-food.png') });

  // ─────────────────────────────────────────────────────────────
  // 2. CHECK ALL IMAGES ON THE PAGE ARE VALID (NO BROKEN IMAGES)
  // ─────────────────────────────────────────────────────────────
  console.log('🔍 2. Checking image validity on Food tab...');
  const foodImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.card img'));
    return imgs.map((img) => ({
      src: img.src,
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
    }));
  });

  const brokenFoodImgs = foodImages.filter((i) => i.complete && i.naturalWidth === 0);
  console.log(`Food tab: Total card images rendered = ${foodImages.length}, Broken = ${brokenFoodImgs.length}`);
  if (brokenFoodImgs.length > 0) {
    console.error('Broken images found:', brokenFoodImgs);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. CAPTURE SPECIFIC CATEGORY SECTIONS (FOOD)
  // ─────────────────────────────────────────────────────────────
  // A. Mandi (المندي)
  const mandiSec = page.locator('#mandi, [id*="mandi"]').first();
  if (await mandiSec.count() > 0) {
    await mandiSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await mandiSec.screenshot({ path: path.join(QA_DIR, '02-section-mandi-real-photos.png') });
  }

  // B. Grills (المشويات)
  const grillsSec = page.locator('#grills, [id*="grill"]').first();
  if (await grillsSec.count() > 0) {
    await grillsSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await grillsSec.screenshot({ path: path.join(QA_DIR, '03-section-grills-real-photos.png') });
  }

  // C. Appetizers (المقبلات)
  const startersSec = page.locator('#starters, [id*="starter"]').first();
  if (await startersSec.count() > 0) {
    await startersSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await startersSec.screenshot({ path: path.join(QA_DIR, '04-section-appetizers-real-photos.png') });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. SWITCH TO DRINKS TAB & CAPTURE SECTIONS
  // ─────────────────────────────────────────────────────────────
  console.log('🍹 4. Switching to Drinks Tab...');
  await page.locator('.tab').nth(1).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(QA_DIR, '05-public-ar-drinks-tab.png') });

  console.log('🔍 Checking image validity on Drinks tab...');
  const drinksImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.card img'));
    return imgs.map((img) => ({
      src: img.src,
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
    }));
  });

  const brokenDrinksImgs = drinksImages.filter((i) => i.complete && i.naturalWidth === 0);
  console.log(`Drinks tab: Total card images rendered = ${drinksImages.length}, Broken = ${brokenDrinksImgs.length}`);
  if (brokenDrinksImgs.length > 0) {
    console.error('Broken drinks images found:', brokenDrinksImgs);
  }

  // A. Juices (العصائر)
  const juicesSec = page.locator('#juices, [id*="juice"]').first();
  if (await juicesSec.count() > 0) {
    await juicesSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await juicesSec.screenshot({ path: path.join(QA_DIR, '06-section-juices-real-photos.png') });
  }

  // B. Cocktails (الكوكتيلات)
  const cocktailsSec = page.locator('#cocktails, [id*="cocktail"]').first();
  if (await cocktailsSec.count() > 0) {
    await cocktailsSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await cocktailsSec.screenshot({ path: path.join(QA_DIR, '07-section-cocktails-real-photos.png') });
  }

  // C. Coffee (القهوة)
  const coffeeSec = page.locator('#coffee, [id*="coffee"]').first();
  if (await coffeeSec.count() > 0) {
    await coffeeSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await coffeeSec.screenshot({ path: path.join(QA_DIR, '08-section-coffee-real-photos.png') });
  }

  // D. Desserts (الحلويات)
  const dessertsSec = page.locator('#desserts, [id*="dessert"]').first();
  if (await dessertsSec.count() > 0) {
    await dessertsSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await dessertsSec.screenshot({ path: path.join(QA_DIR, '09-section-desserts-real-photos.png') });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. PRODUCT DETAILS MODAL (FOOD & DRINKS)
  // ─────────────────────────────────────────────────────────────
  console.log('🔍 5. Testing Product Detail Modal...');
  // Click first juice card
  const firstDrinkCard = page.locator('.card--drink').first();
  await firstDrinkCard.click();
  const modal = page.locator('.modal-panel');
  await modal.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(QA_DIR, '10-drink-detail-modal.png') });

  // Add to cart
  await modal.locator('.btn-add-cart').click();
  await page.waitForTimeout(400);

  // Switch back to Food tab to test food modal
  await page.locator('.tab').nth(0).click();
  await page.waitForTimeout(500);
  const firstMandiCard = page.locator('.card--meal').first();
  await firstMandiCard.click();
  await modal.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(QA_DIR, '11-food-detail-modal.png') });

  // Add to cart
  await modal.locator('.btn-add-cart').click();
  await page.waitForTimeout(400);

  // ─────────────────────────────────────────────────────────────
  // 6. CART DRAWER WITH REAL PHOTOGRAPHY THUMBNAILS
  // ─────────────────────────────────────────────────────────────
  console.log('🛒 6. Testing Cart Drawer with real photography...');
  const floatingBtn = page.locator('.floating-cart-btn').first();
  await floatingBtn.click();
  const cartDrawer = page.locator('.cart-panel');
  await cartDrawer.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(QA_DIR, '12-cart-drawer-real-thumbnails.png') });
  await page.locator('.cart-close').click();
  await page.waitForTimeout(300);

  // ─────────────────────────────────────────────────────────────
  // 7. RESPONSIVE BREAKPOINTS (MOBILE TO DESKTOP)
  // ─────────────────────────────────────────────────────────────
  console.log('📱 7. Testing 7 Responsive Viewports...');
  const viewports = [
    { name: '360px', width: 360, height: 740 },
    { name: '390px', width: 390, height: 844 },
    { name: '430px', width: 430, height: 932 },
    { name: '768px', width: 768, height: 1024 },
    { name: '1024px', width: 1024, height: 768 },
    { name: '1366px', width: 1366, height: 768 },
    { name: '1920px', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(200);

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    console.log(`Viewport ${vp.name}: horizontal overflow = ${hasOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);

    if (vp.name === '390px') {
      await page.screenshot({ path: path.join(QA_DIR, '13-mobile-390px-food.png') });
      await page.locator('.tab').nth(1).click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(QA_DIR, '14-mobile-390px-drinks.png') });
      await page.locator('.tab').nth(0).click();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 8. ENGLISH LOCALE (/en)
  // ─────────────────────────────────────────────────────────────
  console.log('🌐 8. Testing English Locale (/en)...');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:3001/en');
  await page.locator('.bar').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(QA_DIR, '15-public-en-desktop.png') });

  // ─────────────────────────────────────────────────────────────
  // 9. ADMIN DASHBOARD COMPATIBILITY
  // ─────────────────────────────────────────────────────────────
  console.log('🔐 9. Testing Admin Dashboard Compatibility...');
  const adminPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  adminPage.on('console', (msg) => console.log('ADMIN CONSOLE:', msg.text()));
  adminPage.on('pageerror', (err) => console.log('ADMIN PAGE ERROR:', err.message));

  await adminPage.goto('http://127.0.0.1:3001/admin/login');
  await adminPage.locator('input[name="email"]').fill('admin@naqer-menu.local');
  await adminPage.locator('input[name="password"]').fill('CHANGE_ME_DEV_ONLY_PASSWORD');
  await adminPage.locator('button[type="submit"]').click();
  await adminPage.waitForURL('**/admin/dashboard', { timeout: 15000 });
  console.log('Logged in to admin! Current URL:', adminPage.url());

  await adminPage.goto('http://127.0.0.1:3001/admin/products');
  console.log('Navigated to products, current URL:', adminPage.url());
  await adminPage.waitForLoadState('networkidle');
  console.log('Network idle on products! Title:', await adminPage.title());

  await adminPage.screenshot({ path: path.join(QA_DIR, '16-admin-products-list.png') });

  // Open first product edit page to inspect image manager
  const editLink = adminPage.locator('tbody tr a:has-text("تعديل")').first();
  if (await editLink.count() > 0) {
    await editLink.click();
    await adminPage.waitForSelector('#nameAr');
    await adminPage.waitForTimeout(500);
    await adminPage.screenshot({ path: path.join(QA_DIR, '17-admin-product-edit-image-manager.png') });
  }

  // Media Library
  await adminPage.goto('http://127.0.0.1:3001/admin/images');
  await adminPage.waitForLoadState('networkidle');
  await adminPage.screenshot({ path: path.join(QA_DIR, '18-admin-media-library.png') });

  await page.close();
  await adminPage.close();
  await browser.close();

  console.log('🎉 REAL PRODUCT PHOTOGRAPHY QA EXECUTED SUCCESSFULLY!');
}

run().catch((e) => {
  console.error('Error during photography QA:', e);
  process.exit(1);
});
