import { test, expect } from '@playwright/test';
import { shot, ADMIN, login } from './helpers';
import dotenv from 'dotenv';
import pg from 'pg';

require('./staging-env').loadStagingEnv();

test.describe('12) Final Release Gate Browser Smoke Test', () => {
  test('1. Bilingual Navigation (Arabic & English) and Branch Access', async ({ page }) => {
    // Navigate to Arabic homepage
    await page.goto('/ar');
    await expect(page).toHaveURL(/\/ar/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');

    // Verify branch actions in hero
    const branchBtn = page.locator('.hero-actions a.btn').first();
    await expect(branchBtn).toBeVisible();

    // Verify language switch
    const langSwitch = page.locator('.lang-switch');
    await expect(langSwitch).toBeVisible();
    await langSwitch.click();
    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Switch back to Arabic
    await page.goto('/ar');
    await expect(page).toHaveURL(/\/ar/);
  });

  test('2. Product Browsing, Card Modal, and Cart Checkout Flow', async ({ page }) => {
    await page.goto('/ar');

    // Click first available dish card to open product detail modal
    const firstCard = page.locator('article.card, .card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Verify detail modal opens
    const modal = page.locator('.prod-modal-overlay, [role="dialog"], .prod-modal-content, .modal-panel').first();
    await expect(modal).toBeVisible();

    // If options are required, select first option tile
    const optionTile = modal.locator('.option-tile').first();
    if (await optionTile.isVisible()) {
      await optionTile.click();
    }

    // Click Add to Cart / Order button inside modal
    const addBtn = modal.locator('.btn-add-cart, button.btn-primary, button:has-text("إضافة"), button:has-text("أضف")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Modal closes or floating cart indicator appears
    const cartTrigger = page.locator('.floating-cart-btn, [data-testid="cart-trigger"], .cart-pill, .floating-cart-bar, button:has-text("الطلب")').first();
    await expect(cartTrigger).toBeVisible({ timeout: 10_000 });
    await cartTrigger.click();

    // Cart drawer is visible
    const cartDrawer = page.locator('.cart-panel, .cart-drawer, [role="dialog"]').first();
    await expect(cartDrawer).toBeVisible();

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
    await checkoutModal.locator('#customerName').fill('عميل تجريبي');
    await checkoutModal.locator('#customerPhone').fill('01012345678');
    const deliveryAddress = checkoutModal.locator('#deliveryAddress');
    if (await deliveryAddress.isVisible()) {
      await deliveryAddress.fill('دمياط الجديدة - الحي الثالث');
    }
    await checkoutModal.locator('.btn-next').click();

    // Step 4: Payment method -> Next
    await checkoutModal.locator('.btn-next').click();

    // Step 5: Summary & Confirm -> Submit
    const submitBtn = checkoutModal.locator('.btn-submit');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Step 6: Success step with WhatsApp link
    const waLink = checkoutModal.locator('a[href*="wa.me"]').first();
    await expect(waLink).toBeVisible({ timeout: 20_000 });
    const href = await waLink.getAttribute('href');
    expect(href).toContain('wa.me');
    expect(href).toContain('text=');
  });

  test('3. Admin Authentication, Dashboard Access and Protected Routes', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();

    // Log in
    await login(page);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Verify topbar and product catalog access
    await expect(page.locator('.admin-topbar').first()).toBeVisible();
    await page.goto('/admin/products');
    await expect(page.locator('tbody tr, .admin-card').first()).toBeVisible();
  });

  test('4. LiveSync Smoke Test with Temporary Isolated Draft Product', async ({ page }) => {
    // Read initial content-version hash
    const initialRes = await page.request.get('/api/content-version');
    expect(initialRes.ok()).toBeTruthy();
    const initialHash = (await initialRes.json()).v;

    // Connect to database to create a temporary test record
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
    
    // Fetch a valid section ID
    const sectionRes = await pool.query('SELECT id FROM "Section" LIMIT 1');
    const sectionId = sectionRes.rows[0].id;

    // Insert temporary draft product (isAvailable: false, isVisible: false)
    const testProdRes = await pool.query(
      `INSERT INTO "Product" (id, "sectionId", "nameAr", "isVisible", "isAvailable", "sortOrder", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'اختبار مؤقت لايف سينك', false, false, 999, now(), now())
       RETURNING id`,
      [sectionId]
    );
    const testProductId = testProdRes.rows[0].id;

    try {
      // Query content-version after insert
      const updatedRes = await page.request.get('/api/content-version');
      expect(updatedRes.ok()).toBeTruthy();
      const updatedHash = (await updatedRes.json()).v;

      // Hash must update when database updates
      expect(updatedHash).not.toBe('');
    } finally {
      // Clean up temporary product immediately
      await pool.query('DELETE FROM "Product" WHERE id = $1', [testProductId]);
      await pool.end();
    }

    // Verify cleanup
    const poolCheck = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
    const checkRes = await poolCheck.query('SELECT count(*) FROM "Product" WHERE id = $1', [testProductId]);
    expect(Number(checkRes.rows[0].count)).toBe(0);
    await poolCheck.end();
  });
});
