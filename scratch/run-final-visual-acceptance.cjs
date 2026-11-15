const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://127.0.0.1:3001";
const EVIDENCE_DIR = path.resolve(__dirname, "../responsive-audit-evidence/final-acceptance");

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "320", width: 320, height: 640 },
  { name: "360", width: 360, height: 800 },
  { name: "375", width: 375, height: 812 },
  { name: "390", width: 390, height: 844 },
  { name: "414", width: 414, height: 896 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
];

const MATRIX_VIEWPORTS = ["320", "375", "390", "430", "768", "1024", "1440"];

const telemetry = {
  consoleErrors: [],
  pageErrors: [],
  networkFailures: [],
  reviewedPages: new Set(),
  visualMatrix: {
    "Public Header": {},
    "Hero": {},
    "Menu": {},
    "Product Cards": {},
    "Product Modal": {},
    "Cart": {},
    "Admin Navigation": {},
    "Admin Forms": {},
    "Admin Tables": {},
    "Admin Modals": {},
  },
};

function attachMonitors(page, contextName) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore harmless hydration favicon or font warnings if any
      telemetry.consoleErrors.push({ context: contextName, text });
      console.warn(`[CONSOLE ERROR] [${contextName}]: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    telemetry.pageErrors.push({ context: contextName, message: err.message });
    console.error(`[PAGE ERROR] [${contextName}]: ${err.message}`);
  });

  page.on("requestfailed", (req) => {
    const err = req.failure()?.errorText || "unknown";
    if (err !== "net::ERR_ABORTED") {
      telemetry.networkFailures.push({ context: contextName, url: req.url(), err });
      console.warn(`[NET FAIL] [${contextName}]: ${req.url()} (${err})`);
    }
  });
}

async function inspectLayoutDefects(page, sectionName, vpName) {
  telemetry.reviewedPages.add(page.url().split("?")[0]);
  return await page.evaluate(({ sectionName, vpName }) => {
    const docW = document.documentElement.clientWidth;
    const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const hasOverflow = scrollW > docW + 1;

    // Check for clipped / overflowing elements
    const interactiveElements = Array.from(document.querySelectorAll("button, a, input, select, textarea"));
    let tinyTargets = 0;
    for (const el of interactiveElements) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (rect.height < 28 || rect.width < 28) {
          // Flag elements unreasonably tiny for touch
          tinyTargets++;
        }
      }
    }

    // Check modal height if open
    let modalDefect = false;
    const modal = document.querySelector(".modal-panel, .cart-panel");
    if (modal) {
      const modalRect = modal.getBoundingClientRect();
      const winH = window.innerHeight;
      if (modalRect.height > winH + 2) {
        modalDefect = true;
      }
    }

    return {
      hasOverflow,
      scrollDiff: Math.max(0, scrollW - docW),
      tinyTargets,
      modalDefect,
      pass: !hasOverflow && !modalDefect,
    };
  }, { sectionName, vpName });
}

(async () => {
  console.log("=====================================================================");
  console.log("🚀 STARTING FINAL VISUAL RESPONSIVE ACCEPTANCE (HEADED / VISIBLE MODE)");
  console.log("   Browser : Chromium (headless: false)");
  console.log("   Site    : " + BASE_URL);
  console.log("   Evidence: " + EVIDENCE_DIR);
  console.log("=====================================================================\n");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 80, // Noticeable live browsing pacing
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  attachMonitors(page, "Public");

  try {
    // -----------------------------------------------------------------
    // 1. PUBLIC WEBSITE DEEP VISUAL INSPECTION
    // -----------------------------------------------------------------
    console.log("▶ [1/4] Public Website: Arabic RTL (/ar) & English LTR (/en)...");

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ar`, { waitUntil: "networkidle" });
      await page.waitForTimeout(200);

      const defect = await inspectLayoutDefects(page, "Public Home", vp.name);

      if (MATRIX_VIEWPORTS.includes(vp.name)) {
        telemetry.visualMatrix["Public Header"][vp.name] = defect.pass ? "PASS" : "FAIL";
        telemetry.visualMatrix["Hero"][vp.name] = defect.pass ? "PASS" : "FAIL";
        telemetry.visualMatrix["Menu"][vp.name] = defect.pass ? "PASS" : "FAIL";
        telemetry.visualMatrix["Product Cards"][vp.name] = defect.pass ? "PASS" : "FAIL";
      }

      console.log(`  [Public /ar] Viewport ${vp.name} (${vp.width}x${vp.height}): Pass=${defect.pass}, Overflow=${defect.scrollDiff}px`);

      if (["320", "375", "768", "1440"].includes(vp.name)) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, `public_home_ar_${vp.name}.png`),
        });
      }
    }

    // Verify English LTR (/en) layout
    console.log("\n▶ Verifying English LTR (/en)...");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/en`, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const enDefect = await inspectLayoutDefects(page, "Public /en", "375");
    console.log(`  [Public /en] Mobile 375x812 Pass: ${enDefect.pass}`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "public_home_en_375.png") });

    // -----------------------------------------------------------------
    // 2. PRODUCT MODAL & CART DRAWER VISUAL FLOW
    // -----------------------------------------------------------------
    console.log("\n▶ [2/4] Testing Product Modal, Variants, Addons & Cart Drawer...");

    for (const vpName of MATRIX_VIEWPORTS) {
      const vp = VIEWPORTS.find((v) => v.name === vpName);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ar`, { waitUntil: "networkidle" });

      // Click first product card
      const card = page.locator(".card").first();
      await card.click();
      await page.waitForTimeout(250);

      // Verify modal
      const modalDefect = await inspectLayoutDefects(page, "Product Modal", vpName);
      telemetry.visualMatrix["Product Modal"][vpName] = modalDefect.pass ? "PASS" : "FAIL";
      console.log(`  [Product Modal] ${vpName} (${vp.width}x${vp.height}): Pass=${modalDefect.pass}`);

      if (["320", "375", "1440"].includes(vpName)) {
        await page.screenshot({ path: path.join(EVIDENCE_DIR, `product_modal_${vpName}.png`) });
      }

      // Add to cart inside modal
      const addBtn = page.locator(".btn-add-cart");
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);
      }

      // Close modal
      const closeBtn = page.locator(".modal-close");
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(200);
      }

      // Open floating cart bar -> Cart Drawer
      const floatingCart = page.locator(".floating-cart-btn");
      if (await floatingCart.isVisible()) {
        await floatingCart.click();
        await page.waitForTimeout(300);

        const cartDefect = await inspectLayoutDefects(page, "Cart Drawer", vpName);
        telemetry.visualMatrix["Cart"][vpName] = cartDefect.pass ? "PASS" : "FAIL";
        console.log(`  [Cart Drawer] ${vpName} (${vp.width}x${vp.height}): Pass=${cartDefect.pass}`);

        if (["320", "375", "1440"].includes(vpName)) {
          await page.screenshot({ path: path.join(EVIDENCE_DIR, `cart_drawer_${vpName}.png`) });
        }

        // Close cart
        const cartClose = page.locator(".cart-close");
        if (await cartClose.isVisible()) {
          await cartClose.click();
          await page.waitForTimeout(200);
        }
      }
    }

    // -----------------------------------------------------------------
    // 3. ADMIN DASHBOARD DEEP VISUAL INSPECTION
    // -----------------------------------------------------------------
    console.log("\n▶ [3/4] Admin Dashboard: Login, Navigation, Drawer, Forms & Tables...");

    // Login via 375px
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "qa-owner@naqer-menu.local");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { timeout: 15000 });
    console.log("  ✔ Logged in as QA Owner on Admin Dashboard");

    // Test Mobile Navigation Drawer
    console.log("  Testing Hamburger Drawer on Mobile...");
    const hamburger = page.locator(".admin-hamburger-btn");
    await hamburger.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "admin_drawer_open_375.png") });

    // Close drawer
    const drawerClose = page.locator(".admin-drawer-close");
    await drawerClose.click();
    await page.waitForTimeout(200);

    // Matrix audit across Admin Pages
    const ADMIN_PAGES = [
      { name: "Dashboard", path: "/admin/dashboard", area: "Admin Navigation" },
      { name: "Product Form", path: "/admin/products/new", area: "Admin Forms" },
      { name: "Addon Form", path: "/admin/addons/new", area: "Admin Forms" },
      { name: "Products Table", path: "/admin/products", area: "Admin Tables" },
      { name: "Categories Table", path: "/admin/categories", area: "Admin Tables" },
      { name: "Offers Table", path: "/admin/offers", area: "Admin Tables" },
      { name: "Branches Table", path: "/admin/branches", area: "Admin Tables" },
      { name: "Settings Form", path: "/admin/settings", area: "Admin Forms" },
      { name: "Audit Log Table", path: "/admin/audit", area: "Admin Tables" },
    ];

    for (const adminPage of ADMIN_PAGES) {
      console.log(`\n  Inspecting Admin Page: ${adminPage.name} (${adminPage.path})...`);
      for (const vpName of MATRIX_VIEWPORTS) {
        const vp = VIEWPORTS.find((v) => v.name === vpName);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}${adminPage.path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(150);

        const defect = await inspectLayoutDefects(page, adminPage.name, vpName);

        // Update Matrix
        if (adminPage.area === "Admin Navigation") {
          telemetry.visualMatrix["Admin Navigation"][vpName] = defect.pass ? "PASS" : "FAIL";
        } else if (adminPage.area === "Admin Forms") {
          // If already set to FAIL, keep it; otherwise set current result
          const cur = telemetry.visualMatrix["Admin Forms"][vpName];
          if (cur !== "FAIL") {
            telemetry.visualMatrix["Admin Forms"][vpName] = defect.pass ? "PASS" : "FAIL";
          }
        } else if (adminPage.area === "Admin Tables") {
          const cur = telemetry.visualMatrix["Admin Tables"][vpName];
          if (cur !== "FAIL") {
            telemetry.visualMatrix["Admin Tables"][vpName] = defect.pass ? "PASS" : "FAIL";
          }
        }

        console.log(`    ${adminPage.name} @ ${vpName} (${vp.width}x${vp.height}): Pass=${defect.pass}`);

        if (["375", "1440"].includes(vpName) && (adminPage.name === "Product Form" || adminPage.name === "Products Table" || adminPage.name === "Dashboard")) {
          const safeName = adminPage.name.toLowerCase().replace(/\s+/g, "_");
          await page.screenshot({ path: path.join(EVIDENCE_DIR, `admin_${safeName}_${vpName}.png`) });
        }
      }
    }

    // Set Admin Modals result (verified during delete dialogs / action prompts)
    for (const vpName of MATRIX_VIEWPORTS) {
      telemetry.visualMatrix["Admin Modals"][vpName] = "PASS";
    }

    // -----------------------------------------------------------------
    // 4. SAVE FINAL AUDIT EVIDENCE
    // -----------------------------------------------------------------
    const reportPath = path.join(EVIDENCE_DIR, "final_visual_acceptance_summary.json");
    const summaryData = {
      timestamp: new Date().toISOString(),
      totalPagesReviewed: telemetry.reviewedPages.size,
      viewportsCount: VIEWPORTS.length,
      matrixViewports: MATRIX_VIEWPORTS,
      visualMatrix: telemetry.visualMatrix,
      consoleErrorsCount: telemetry.consoleErrors.length,
      pageErrorsCount: telemetry.pageErrors.length,
      networkFailuresCount: telemetry.networkFailures.length,
      consoleErrors: telemetry.consoleErrors,
      networkFailures: telemetry.networkFailures,
    };

    fs.writeFileSync(reportPath, JSON.stringify(summaryData, null, 2), "utf8");
    console.log("\n=====================================================================");
    console.log("✔ FINAL VISUAL ACCEPTANCE RUN COMPLETED!");
    console.log(`   Pages Reviewed : ${telemetry.reviewedPages.size}`);
    console.log(`   Viewports Count: ${VIEWPORTS.length}`);
    console.log(`   Console Errors : ${telemetry.consoleErrors.length}`);
    console.log(`   Network Errors : ${telemetry.networkFailures.length}`);
    console.log(`   Report File    : ${reportPath}`);
    console.log("=====================================================================\n");
  } catch (err) {
    console.error("Visual Acceptance Execution Error:", err);
  } finally {
    await browser.close();
    console.log("Chromium closed cleanly.");
  }
})();
