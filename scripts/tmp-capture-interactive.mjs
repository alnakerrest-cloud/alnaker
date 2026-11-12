import { chromium } from 'playwright';
import fs from 'node:fs';

const outDir = 'qa-premium/interactive';
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Desktop Arabic Modal
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:3001/ar');
  await page.locator('.bar').waitFor({ state: 'visible' });
  await page.locator('.card--platter').first().click();
  await page.locator('.modal-panel').waitFor({ state: 'visible' });
  await page.screenshot({ path: `${outDir}/01-desktop-modal-ar.png` });
  console.log('Saved 01-desktop-modal-ar.png');

  // Close modal and add to cart
  await page.locator('.modal-close').click();
  await page.waitForTimeout(300);

  // Add 2 items
  await page.locator('.card--meal').first().click();
  await page.locator('.qty-btn').nth(1).click();
  await page.locator('.btn-add-cart').click();
  await page.waitForTimeout(500);

  await page.locator('.card--side').first().click();
  await page.locator('.btn-add-cart').click();
  await page.waitForTimeout(500);

  // 2. Floating Cart Bar in action
  await page.screenshot({ path: `${outDir}/02-desktop-floating-bar-ar.png` });
  console.log('Saved 02-desktop-floating-bar-ar.png');

  // 3. Desktop Cart Drawer
  await page.locator('.floating-cart-btn').click();
  await page.locator('.cart-panel').waitFor({ state: 'visible' });
  await page.locator('#order-general-notes').fill('توصيل فرع دمياط الجديدة - الساعة 8 مساءً');
  await page.screenshot({ path: `${outDir}/03-desktop-cart-drawer-ar.png` });
  console.log('Saved 03-desktop-cart-drawer-ar.png');

  // 4. Mobile 390px Bottom Sheet Modal
  const mContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mContext.newPage();
  await mPage.goto('http://127.0.0.1:3001/ar');
  await mPage.locator('.bar').waitFor({ state: 'visible' });
  await mPage.locator('.card--meal').first().click();
  await mPage.locator('.modal-panel').waitFor({ state: 'visible' });
  await mPage.screenshot({ path: `${outDir}/04-mobile-sheet-ar.png` });
  console.log('Saved 04-mobile-sheet-ar.png');

  // Close and add item to cart on mobile
  await mPage.locator('.modal-close').click();
  await mPage.waitForTimeout(300);
  await mPage.locator('.card--platter').first().click();
  await mPage.locator('.btn-add-cart').click();
  await mPage.waitForTimeout(500);

  // 5. Mobile Cart Bottom Sheet
  await mPage.locator('.floating-cart-btn').click();
  await mPage.locator('.cart-panel').waitFor({ state: 'visible' });
  await mPage.screenshot({ path: `${outDir}/05-mobile-cart-sheet-ar.png` });
  console.log('Saved 05-mobile-cart-sheet-ar.png');

  // 6. English Desktop Cart Drawer
  const enContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const enPage = await enContext.newPage();
  await enPage.goto('http://127.0.0.1:3001/en');
  await enPage.locator('.bar').waitFor({ state: 'visible' });
  await enPage.locator('.card--meal').first().click();
  await enPage.locator('.btn-add-cart').click();
  await enPage.waitForTimeout(500);
  await enPage.locator('.floating-cart-btn').click();
  await enPage.locator('.cart-panel').waitFor({ state: 'visible' });
  await enPage.screenshot({ path: `${outDir}/06-desktop-cart-en.png` });
  console.log('Saved 06-desktop-cart-en.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch(console.error);

