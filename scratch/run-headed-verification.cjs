const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://127.0.0.1:3001";
const EVIDENCE_DIR = path.resolve(__dirname, "../responsive-audit-evidence/post-fix");

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "small_mobile_320", width: 320, height: 640 },
  { name: "mobile_375", width: 375, height: 812 },
  { name: "mobile_390", width: 390, height: 844 },
  { name: "large_mobile_430", width: 430, height: 932 },
  { name: "tablet_portrait_768", width: 768, height: 1024 },
  { name: "tablet_landscape_1024", width: 1024, height: 768 },
  { name: "desktop_1440", width: 1440, height: 900 },
  { name: "mobile_landscape_844", width: 844, height: 390 },
];

async function checkPageOverflow(page) {
  return await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    );
    const overflowDiff = scrollWidth - docWidth;
    return {
      hasOverflow: overflowDiff > 1,
      docWidth,
      scrollWidth,
      overflowDiff: Math.max(0, overflowDiff),
    };
  });
}

(async () => {
  console.log("=== Launching Chromium in HEADED / VISIBLE mode (headless: false) ===");
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100, // Small delay so actions are visibly noticeable to human observer
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const auditResults = [];

  try {
    // -------------------------------------------------------------
    // PART 1: PUBLIC MENU VERIFICATION
    // -------------------------------------------------------------
    console.log("\n--- Part 1: Public Menu Verification ---");
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ar`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      const overflow = await checkPageOverflow(page);
      console.log(`[Public /ar] Viewport ${vp.name} (${vp.width}x${vp.height}): Overflow = ${overflow.overflowDiff}px (Pass: ${!overflow.hasOverflow})`);

      auditResults.push({
        section: "Public /ar",
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        overflow: overflow.overflowDiff,
        passed: !overflow.hasOverflow,
      });

      // Save screenshot for key viewports
      if (["small_mobile_320", "mobile_375", "desktop_1440"].includes(vp.name)) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, `public_menu_${vp.name}.png`),
          fullPage: false,
        });
      }
    }

    // Public Modal & Cart Flow in Mobile Viewport (375x812)
    console.log("\n--- Testing Public Modal & Cart Drawer on Mobile (375x812) ---");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/ar`, { waitUntil: "networkidle" });

    // Click first product card
    const firstCard = page.locator(".card").first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(400);

      const modalOverflow = await checkPageOverflow(page);
      console.log(`[Product Modal] 375x812: Overflow = ${modalOverflow.overflowDiff}px`);
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `public_modal_mobile_375.png`),
      });

      // Click Add to Cart inside modal
      const addBtn = page.locator(".btn-add-cart");
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Close modal if still open
      const closeBtn = page.locator(".modal-close");
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Verify Floating Cart Bar
    const floatingCart = page.locator(".floating-cart-btn");
    if (await floatingCart.isVisible()) {
      console.log("Floating Cart Bar is visible!");
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `public_floating_cart_mobile_375.png`),
      });

      // Open Cart Drawer
      await floatingCart.click();
      await page.waitForTimeout(400);

      const cartOverflow = await checkPageOverflow(page);
      console.log(`[Cart Drawer] 375x812: Overflow = ${cartOverflow.overflowDiff}px`);
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `public_cart_drawer_mobile_375.png`),
      });

      // Close Cart Drawer
      const cartClose = page.locator(".cart-close");
      if (await cartClose.isVisible()) {
        await cartClose.click();
        await page.waitForTimeout(300);
      }
    }

    // -------------------------------------------------------------
    // PART 2: ADMIN DASHBOARD VERIFICATION
    // -------------------------------------------------------------
    console.log("\n--- Part 2: Admin Dashboard Verification ---");

    // Login on 375px viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, `admin_login_mobile_375.png`),
    });

    await page.fill('input[type="email"]', "qa-owner@naqer-menu.local");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });
    console.log("Successfully logged into Admin Dashboard as QA Owner!");

    // Test Mobile Navigation Drawer
    console.log("\n--- Testing Admin Mobile Navigation Drawer ---");
    const hamburgerBtn = page.locator(".admin-hamburger-btn");
    if (await hamburgerBtn.isVisible()) {
      console.log("Clicking Hamburger button to open Admin Drawer...");
      await hamburgerBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `admin_drawer_open_mobile_375.png`),
      });

      // Click Products link in drawer
      const productsLink = page.locator('.admin-sidebar a[href="/admin/products"]');
      if (await productsLink.isVisible()) {
        console.log("Clicking 'المنتجات' from Drawer...");
        await productsLink.click();
        await page.waitForURL("**/admin/products", { timeout: 10000 });
        await page.waitForTimeout(400);
      }
    }

    // Admin Routes Audit across Viewports
    const ADMIN_ROUTES = [
      "/admin/dashboard",
      "/admin/categories",
      "/admin/products",
      "/admin/products/new",
      "/admin/offers",
      "/admin/addons",
      "/admin/branches",
      "/admin/images",
      "/admin/settings",
      "/admin/audit",
    ];

    for (const route of ADMIN_ROUTES) {
      console.log(`\nAuditing Admin Route: ${route}`);
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(200);

        const overflow = await checkPageOverflow(page);
        console.log(`  ${route} @ ${vp.name} (${vp.width}x${vp.height}): Overflow = ${overflow.overflowDiff}px (Pass: ${!overflow.hasOverflow})`);

        auditResults.push({
          section: route,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          overflow: overflow.overflowDiff,
          passed: !overflow.hasOverflow,
        });

        // Capture evidence screenshots
        if (vp.name === "mobile_375" || vp.name === "desktop_1440") {
          const safeName = route.replace(/\//g, "_").replace(/^_admin_?/, "admin_");
          await page.screenshot({
            path: path.join(EVIDENCE_DIR, `${safeName}_${vp.name}.png`),
          });
        }
      }
    }

    // Save final audit report
    const summaryFile = path.join(EVIDENCE_DIR, "headed_audit_results.json");
    fs.writeFileSync(summaryFile, JSON.stringify(auditResults, null, 2), "utf8");

    const totalTests = auditResults.length;
    const passedTests = auditResults.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log("\n=======================================================");
    console.log(`AUDIT COMPLETE: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log(`Results saved to: ${summaryFile}`);
    console.log("=======================================================\n");

    if (failedTests > 0) {
      console.log("Failed instances:", auditResults.filter((r) => !r.passed));
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
  } finally {
    await browser.close();
    console.log("Browser closed cleanly.");
  }
})();
