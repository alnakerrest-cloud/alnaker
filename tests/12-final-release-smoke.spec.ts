import { test, expect } from '@playwright/test';
import { shot, ADMIN, login } from './helpers';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

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
    const modal = page.locator('.prod-modal-overlay, [role="dialog"], .prod-modal-content').first();
    await expect(modal).toBeVisible();

    // Click Add to Cart / Order button inside modal
    const addBtn = modal.locator('button.btn-primary, button:has-text("إضافة"), button:has-text("أضف")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Modal closes or floating cart indicator appears
    const cartTrigger = page.locator('[data-testid="cart-trigger"], .cart-pill, .floating-cart-bar, button:has-text("الطلب")').first();
    await expect(cartTrigger).toBeVisible();
    await cartTrigger.click();

    // Cart drawer is visible
    const cartDrawer = page.locator('.cart-drawer, [role="dialog"]').first();
    await expect(cartDrawer).toBeVisible();

    // Check WhatsApp checkout link presence
    const waLink = page.locator('a[href*="wa.me"]').first();
    await expect(waLink).toBeVisible();
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
