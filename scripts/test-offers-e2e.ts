import { config } from "dotenv";
config({ path: ".env.local" });
import { chromium } from "playwright";
import { generateSessionToken } from "../lib/auth";
import { createStoreSession } from "../lib/users-store";
import { prisma, withDbRetry } from "../lib/prisma";

async function run() {
  console.log("=================================================");
  console.log("   E2E ACCEPTANCE TEST: ADMIN OFFERS WORKFLOW    ");
  console.log("=================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const errors: string[] = [];
  const consoleLogs: string[] = [];

  // 1. Authenticate as OWNER
  const ownerId = "usr-admin-owner-001";
  const { rawToken, tokenHash, expiresAt } = generateSessionToken(ownerId);
  await createStoreSession(ownerId, tokenHash, expiresAt);
  console.log("✔ Created OWNER session token");

  await context.addCookies([
    {
      name: "naqer_admin",
      value: rawToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  page.on("pageerror", (err) => {
    console.error("PAGE ERROR:", err);
    errors.push(err.message);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleLogs.push(msg.text());
    }
  });

  // 2. Open /admin/offers/new
  console.log("\n--- STEP 1: OPEN /admin/offers/new ---");
  const newOfferRes = await page.goto("http://127.0.0.1:3000/admin/offers/new", {
    waitUntil: "networkidle",
  });
  console.log("Status:", newOfferRes?.status());
  console.log("URL:", page.url());

  if (newOfferRes?.status() !== 200 || !page.url().includes("/admin/offers/new")) {
    throw new Error(`Failed to load /admin/offers/new, status: ${newOfferRes?.status()}`);
  }

  // 3. Verify form fields rendered
  console.log("\n--- STEP 2: VERIFY FORM FIELDS ---");
  const pageTitle = await page.textContent(".admin-page-title");
  console.log("Page Title:", pageTitle?.trim());

  await page.waitForSelector("input#titleAr", { timeout: 5000 });
  await page.waitForSelector("select#offerType", { timeout: 5000 });
  await page.waitForSelector("input#discountValue", { timeout: 5000 });
  console.log("✔ Basic inputs present");

  // 4. Fill and submit the form to create a new offer
  console.log("\n--- STEP 3: CREATE NEW OFFER ---");
  const testTitle = `عرض تجريبي E2E ${Date.now()}`;
  await page.fill("input#titleAr", testTitle);
  await page.fill("input#titleEn", "E2E Test Special Offer");
  await page.fill("textarea#descAr", "خصم تجريبي للتحقق من سلامة النظام وحفظ العروض");
  await page.fill("input#discountValue", "25");

  // Select first branch if available
  const branchBtn = page.locator(".admin-panel button.admin-btn").first();
  if (await branchBtn.isVisible()) {
    await branchBtn.click();
    console.log("✔ Selected target branch");
  }

  // Submit form
  console.log("Submitting offer creation form...");
  await page.locator("form.admin-panel button[type='submit']").click();
  await page.waitForTimeout(2500);

  // 5. Verify redirect to /admin/offers
  console.log("\n--- STEP 4: VERIFY PERSISTENCE & OFFERS LIST ---");
  console.log("Current URL:", page.url());
  await page.goto("http://127.0.0.1:3000/admin/offers", { waitUntil: "networkidle" });

  const offersPageText = await page.innerText("body");
  const isCreated = offersPageText.includes(testTitle);
  console.log(`✔ Offer "${testTitle}" found on /admin/offers:`, isCreated);

  if (!isCreated) {
    throw new Error(`Offer "${testTitle}" was not found in the offers list!`);
  }

  // 6. Verify record in database
  const createdRecord = await withDbRetry(() =>
    prisma.offer.findFirst({
      where: { titleAr: testTitle },
      include: {
        locationTargets: true,
      },
    })
  );

  console.log("✔ Persisted DB Record ID:", createdRecord?.id);
  console.log("✔ Offer Type:", createdRecord?.offerType);
  console.log("✔ Discount Value:", Number(createdRecord?.discountValue));
  console.log("✔ Location Targets Count:", createdRecord?.locationTargets.length);

  if (!createdRecord) {
    throw new Error("Persisted offer record not found in database!");
  }

  // 7. Verify /admin/offers/[id] (Edit Offer Page)
  console.log("\n--- STEP 5: VERIFY EDIT OFFER PAGE /admin/offers/[id] ---");
  const editRes = await page.goto(`http://127.0.0.1:3000/admin/offers/${createdRecord.id}`, {
    waitUntil: "networkidle",
  });
  console.log("Edit Page Status:", editRes?.status());
  console.log("Edit Page URL:", page.url());

  const editTitleVal = await page.inputValue("input#titleAr");
  console.log("Loaded title in input:", editTitleVal);
  if (editTitleVal !== testTitle) {
    throw new Error(`Edit form input value mismatch: expected "${testTitle}", got "${editTitleVal}"`);
  }

  // 8. Test Role-Based Access Control: ORDERS_STAFF blocked
  console.log("\n--- STEP 6: VERIFY ORDERS_STAFF IS BLOCKED ---");
  const staffContext = await browser.newContext();
  const staffId = "usr-admin-staff-002";
  const staffSession = generateSessionToken(staffId);
  await createStoreSession(staffId, staffSession.tokenHash, staffSession.expiresAt);

  await staffContext.addCookies([
    {
      name: "naqer_admin",
      value: staffSession.rawToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const staffPage = await staffContext.newPage();
  await staffPage.goto("http://127.0.0.1:3000/admin/offers/new", { waitUntil: "networkidle" });
  console.log("Staff Redirected URL:", staffPage.url());

  if (staffPage.url().includes("/admin/offers/new")) {
    throw new Error("SECURITY FAILURE: ORDERS_STAFF was able to access /admin/offers/new!");
  }
  console.log("✔ ORDERS_STAFF was safely blocked and redirected to:", staffPage.url());

  // Clean up created test offer
  console.log("\n--- CLEANUP ---");
  await withDbRetry(() => prisma.offer.delete({ where: { id: createdRecord.id } }));
  console.log("✔ Cleaned up test offer record from database");

  await browser.close();
  console.log("\n=================================================");
  console.log("   ALL E2E ACCEPTANCE TESTS PASSED (100% OK)    ");
  console.log("=================================================");
}

run().catch((err) => {
  console.error("FATAL E2E FAILURE:", err);
  process.exit(1);
});
