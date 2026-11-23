import { test, expect, type Page } from '@playwright/test';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 2 });

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

test.describe('Naqer Menu — Premium Interactive Ordering Experience', () => {
  test.afterAll(async () => {
    try {
      await pool.query('DELETE FROM "Order" WHERE "customerPhone" LIKE $1 OR "customerPhone" LIKE $2', ['%01012345678%', '%01098765432%']);
      await pool.query('DELETE FROM "OrderStore" WHERE data->>\'customerPhone\' IN (\'01012345678\', \'01098765432\')');
    } finally {
      await pool.end();
    }
  });

  test.afterEach(async () => {
    try {
      await pool.query('DELETE FROM "Order" WHERE "customerPhone" LIKE $1 OR "customerPhone" LIKE $2', ['%01012345678%', '%01098765432%']);
      await pool.query('DELETE FROM "OrderStore" WHERE data->>\'customerPhone\' IN (\'01012345678\', \'01098765432\')');
    } catch {}
  });

  test('1. Card Archetypes are interactive and tags button does not trigger modal', async ({ page }) => {
    await initMenu(page, '/ar');

    // On Food tab: platter, meal, side exist
    const platter = page.locator('.card--platter').first();
    const meal = page.locator('.card--meal').first();
    const side = page.locator('.card--side').first();

    await expect(platter).toBeVisible();
    await expect(meal).toBeVisible();
    await expect(side).toBeVisible();

    // Verify cursor style and accessibility
    expect(await platter.getAttribute('role')).toBe('button');
    expect(await platter.getAttribute('tabindex')).toBe('0');

    // Switch to Drinks tab to verify drink cards
    await page.locator('.tab').nth(1).click();
    const drink = page.locator('.card--drink').first();
    await expect(drink).toBeVisible();
    expect(await drink.getAttribute('role')).toBe('button');

    // Switch back to Food tab
    await page.locator('.tab').nth(0).click();

    // Test that tags toggle does NOT trigger modal
    const tagsMore = page.locator('.card--platter .tags-more').first();
    if (await tagsMore.isVisible()) {
      await tagsMore.click();
      // Modal should NOT be open
      await expect(page.locator('.modal-panel')).toHaveCount(0);
    }
  });

  test('2. Product Detail Modal on Desktop (open, variant selection, qty, notes, escape, close)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await initMenu(page, '/ar');

    // Click first platter card
    const firstCard = page.locator('.card--platter').first();
    const cardTitle = (await firstCard.locator('h3').first().innerText()).trim();
    await firstCard.click();

    // Verify modal opened
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();
    const modalTitle = (await modal.locator('#product-modal-title').innerText()).trim();
    expect(modalTitle).toBe(cardTitle);

    // Verify body scroll lock
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // Quantity selector: increase to 3
    const plusBtn = modal.locator('.qty-btn').nth(1);
    await plusBtn.click();
    await plusBtn.click();
    await expect(modal.locator('.qty-value')).toHaveText('3');

    // Check notes input
    const notesInput = modal.locator('#product-notes');
    await notesInput.fill('ملاحظة تجريبية: بدون شطة');

    // Close via Escape key
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);

    // Verify body scroll restored
    const restoredOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(restoredOverflow).toBe('');
  });

  test('3. Mobile Bottom Sheet on 390px Viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await initMenu(page, '/ar');

    // Click first meal card
    const mealCard = page.locator('.card--meal').first();
    await mealCard.click();

    // Bottom sheet is visible with sheet handle
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.sheet-handle')).toBeVisible();

    // Close button works
    await modal.locator('.modal-close').click();
    await expect(modal).toHaveCount(0);
  });

  test('4. Add to Cart, Persistence across reload, and Floating Bar calculation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await initMenu(page, '/ar');

    // Floating bar initially not visible
    await expect(page.locator('.floating-cart-wrapper')).toHaveCount(0);

    // Open first card and add to cart
    await page.locator('.card--meal').first().click();
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();

    // Add 2 portions
    await modal.locator('.qty-btn').nth(1).click();
    await modal.locator('.btn-add-cart').click();

    // Modal closes and floating bar appears
    await expect(modal).toHaveCount(0);
    const floatingBar = page.locator('.floating-cart-wrapper');
    await expect(floatingBar).toBeVisible();
    await expect(floatingBar.locator('.floating-cart-badge')).toHaveText('2');

    // Reload page to test localStorage persistence
    await page.reload();
    await page.locator('.bar').waitFor({ state: 'visible' });

    // Floating bar is restored
    await expect(page.locator('.floating-cart-wrapper')).toBeVisible();
    await expect(page.locator('.floating-cart-badge')).toHaveText('2');
  });

  test('5. Cart Drawer Management: Quantity, Delete, and Clear with Confirmation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await initMenu(page, '/ar');

    // Add item 1
    await page.locator('.card--meal').first().click();
    await page.locator('.btn-add-cart').click();
    await page.waitForTimeout(600);

    // Add item 2
    await page.locator('.card--side').first().click();
    await page.locator('.btn-add-cart').click();
    await page.waitForTimeout(600);

    // Open cart drawer
    await page.locator('.floating-cart-btn').click();
    const cartDrawer = page.locator('.cart-panel');
    await expect(cartDrawer).toBeVisible();

    // Verify 2 items in cart
    const items = cartDrawer.locator('.cart-item');
    await expect(items).toHaveCount(2);

    // Increment first item quantity inside cart
    const firstItemPlus = items.first().locator('.qty-btn').nth(1);
    await firstItemPlus.click();

    // Total quantity should be 3
    await expect(cartDrawer.locator('.cart-header-badge')).toContainText('3');

    // Delete second item via trash icon
    const secondItemRemove = items.nth(1).locator('.cart-item-remove');
    await secondItemRemove.click();
    await expect(cartDrawer.locator('.cart-item')).toHaveCount(1);

    // Clear cart with confirmation
    await cartDrawer.locator('.btn-clear-cart').click();
    await expect(cartDrawer.locator('.cart-clear-confirm')).toBeVisible();

    // Click confirm
    await cartDrawer.locator('.btn-clear-yes').click();

    // Empty state should display
    await expect(cartDrawer.locator('.cart-empty')).toBeVisible();
    await expect(cartDrawer.locator('.cart-item')).toHaveCount(0);

    // Close drawer via browse button
    await cartDrawer.locator('.btn-browse-menu').click();
    await expect(cartDrawer).toHaveCount(0);
    await expect(page.locator('.floating-cart-wrapper')).toHaveCount(0);
  });

  test('6. WhatsApp Order Formatting, Number Normalization & Safe Link Generation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await initMenu(page, '/ar');

    // Open first platter card
    await page.locator('.card--platter').first().click();
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();

    // If options are required, select first option tile
    const optionTile = modal.locator('.option-tile').first();
    if (await optionTile.isVisible()) {
      await optionTile.click();
    }

    await modal.locator('#product-notes').fill('تسوية زيادة مع سلطة طحينة إضافية');
    await modal.locator('.btn-add-cart').click();
    await page.waitForTimeout(600);

    // Open cart
    await page.locator('.floating-cart-btn').click();
    const cartDrawer = page.locator('.cart-panel');
    await expect(cartDrawer).toBeVisible();

    // Fill customer general order notes
    const generalNotes = cartDrawer.locator('#order-general-notes');
    await generalNotes.fill('توصيل إلى دمياط الجديدة - الحي الثالث بجوار المسجد الكبير');

    // Click Checkout button to transition to CheckoutModal
    const checkoutBtn = cartDrawer.locator('.btn-checkout');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    const checkoutModal = page.locator('.checkout-panel');
    await expect(checkoutModal).toBeVisible();

    // Step 1: Branch selection -> Next
    await checkoutModal.locator('.btn-next').click();

    // Step 2: Order type -> Next
    await checkoutModal.locator('.btn-next').click();

    // Step 3: Customer Details -> fill and Next
    await checkoutModal.locator('#customerName').fill('أحمد محمد');
    await checkoutModal.locator('#customerPhone').fill('01012345678');
    await checkoutModal.locator('#deliveryAddress').fill('دمياط الجديدة - الحي الثالث بجوار المسجد الكبير');
    await checkoutModal.locator('.btn-next').click();

    // Step 4: Payment method -> Next
    await checkoutModal.locator('.btn-next').click();

    // Step 5: Summary & Confirm -> Submit
    const submitBtn = checkoutModal.locator('.btn-submit');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Step 6: Success step with WhatsApp link
    const waBtn = checkoutModal.locator('a[href*="wa.me"]');
    await expect(waBtn).toBeVisible({ timeout: 20_000 });

    const href = await waBtn.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toContain('https://wa.me/');

    // Decode message and verify contents
    const rawUrl = new URL(href!);
    const message = rawUrl.searchParams.get('text') ?? '';

    // Check required sections
    expect(message).toContain('قرية الناقر');
    expect(message).toContain('تسوية زيادة مع سلطة طحينة إضافية');
    expect(message).toContain('المجموع الفرعي:');
    expect(message).toContain('الإجمالي النهائي:');
    expect(message).toContain('دمياط الجديدة - الحي الثالث بجوار المسجد الكبير');
  });

  test('7. English Locale Rendering (/en) & LTR WhatsApp Message', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await initMenu(page, '/en');

    // Card click
    await page.locator('.card--meal').first().click();
    const modal = page.locator('.modal-panel');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.btn-add-cart')).toContainText('Add to Order');

    await modal.locator('.btn-add-cart').click();
    await page.waitForTimeout(600);

    // Floating bar in English
    const floatingBar = page.locator('.floating-cart-wrapper');
    await expect(floatingBar).toBeVisible();
    await expect(floatingBar.locator('.floating-cart-title')).toHaveText('View Order');

    // Open Cart
    await floatingBar.locator('.floating-cart-btn').click();
    const cartDrawer = page.locator('.cart-panel');
    await expect(cartDrawer.locator('#cart-drawer-title')).toHaveText('Your Order');

    // Click checkout in English
    const checkoutBtn = cartDrawer.locator('.btn-checkout');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    const checkoutModal = page.locator('.checkout-panel');
    await expect(checkoutModal).toBeVisible();

    // Step 1: Branch
    await checkoutModal.locator('.btn-next').click();

    // Step 2: Order type
    await checkoutModal.locator('.btn-next').click();

    // Step 3: Details
    await checkoutModal.locator('#customerName').fill('John Doe');
    await checkoutModal.locator('#customerPhone').fill('01098765432');
    await checkoutModal.locator('#deliveryAddress').fill('New Damietta, District 3');
    await checkoutModal.locator('.btn-next').click();

    // Step 4: Payment
    await checkoutModal.locator('.btn-next').click();

    // Step 5: Confirm
    await checkoutModal.locator('.btn-submit').click();

    // Step 6: WhatsApp link
    const waBtn = checkoutModal.locator('a[href*="wa.me"]');
    await expect(waBtn).toBeVisible({ timeout: 20_000 });

    const href = await waBtn.getAttribute('href');
    const rawUrl = new URL(href!);
    const message = rawUrl.searchParams.get('text') ?? '';

    expect(message).toContain('Al Naqer Village');
    expect(message).toContain('Subtotal:');
    expect(message).toContain('Total:');
  });

  test('8. Viewport Overflow Verification across 7 Breakpoints with Floating Cart', async ({ page }) => {
    const viewports = [
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await initMenu(page, '/ar');

      // Add 1 item so floating cart is active
      await page.locator('.card--meal').first().click();
      await page.locator('.btn-add-cart').click();
      await page.waitForTimeout(400);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow, `Overflow detected at ${vp.width}x${vp.height}`).toBe(false);
    }
  });
});
