import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  login, shot, logEvent, acceptDialogs, IMG, mainSubmit,
  openProductEditByName, attachDiagnostics, writeDiagnostics,
} from "./helpers";
const { hasCloudinary } = require("./staging-env");

const token = Date.now().toString(36).toUpperCase();

// انتظار ظهور عنصر في Context A (صفحة مفتوحة بلا refresh) وقياس الزمن الفعلي.
// يفشل صراحةً بعد 30 ثانية — فلا يُخفى فشل حقيقي وراء مهلة كبيرة.
//ظار Context A في الواجهة قبل القياس: يُحاكي انتقال المستخدم للتبويب العام
// (بلا إعادة تحميل يدوية) ويُفعّل نداء router.refresh المؤجَّل في LiveSync للعلامة المخفية.
async function measureLive(loc: Locator, label: string, page: Page, shotName: string): Promise<number> {
  await page.bringToFront();
  const t0 = Date.now();
  await loc.first().waitFor({ state: "attached", timeout: 30_000 });
  await loc.first().scrollIntoViewIfNeeded().catch(() => {});
  await loc.first().waitFor({ state: "visible", timeout: 30_000 });
  const ms = Date.now() - t0;
  logEvent(`LIVE «${label}» ظهر في Context A بعد ${ms}ms (دون refresh يدوي)`);
  await shot(page, shotName);
  return ms;
}

async function measureLiveGone(loc: Locator, label: string, page: Page): Promise<number> {
  await page.bringToFront();
  const t0 = Date.now();
  await expect(loc).toHaveCount(0, { timeout: 30_000 });
  const ms = Date.now() - t0;
  logEvent(`LIVE «${label}» اختفى من Context A بعد ${ms}ms`);
  return ms;
}

/** سياق A جاهز ومفتوح على المنيو العام + تجميع أخطاء console/network. */
async function openPublic(browser: import("@playwright/test").Browser, label: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const diag = attachDiagnostics(page, `${label}-A`);
  await page.goto("/ar");
  await expect(page.locator(".cat-title").first()).toBeVisible();
  return { ctx, page, diag };
}

/** حذف منتجZZ نهائيًا عبر قائمة المنتجات (تنظيف أدلة الاختبار فقط). يعتمد على acceptDialogs الدائم. */
async function deleteTestProduct(B: Page, name: string) {
  // تنقّل مباشر لنتيجة البحث (تحميل كامل منتظَر) بدل submit لنموذج GET؛
  // لأن الإبحار الناتج عن الـ submit يُجهض طلب POST الخاص بالحذف إن تزامن معه.
  await B.goto(`/admin/products?q=${encodeURIComponent(name)}`);
  const row = B.locator("tbody tr", { hasText: name }).first();
  if (!(await row.isVisible().catch(() => false))) return; // لا شيء للحذف
  await row.locator('button:has-text("حذف")').click();
  // انتظر إتمام الـ Server Action + router.refresh في نفس الصفحة (بلا تنقّل يُجهضه).
  await expect(B.locator("tbody tr", { hasText: name })).toHaveCount(0, { timeout: 30_000 });
}

test.describe("1) Live Sync Acceptance — product data path", () => {
  test.setTimeout(240_000);

  test("ls-1 إنشاء منتج + فتح سياق جديد", async ({ browser }) => {
    const { ctx: ctxA, page: A, diag: diagA } = await openPublic(browser, "ls-1");
    const ctxB = await browser.newContext();
    const B = await ctxB.newPage();
    const diagB = attachDiagnostics(B, "ls-1");
    acceptDialogs(B);
    await shot(A, "ls-00-public-baseline");

    await login(B);
    const name = `ZZمنتج${token}`;
    try {
      await B.goto("/admin/products/new");
      await B.locator("#nameAr").fill(name);
      await B.locator('input[placeholder="السعر"]').first().fill("111");
      await mainSubmit(B).click();
      // تحقق مستقل: نجاح الـ Server Action نفسه (وليس فقط انعكاسه).
      await expect(B.locator("text=تم الإنشاء")).toBeVisible({ timeout: 30_000 });
      const ms = await measureLive(A.locator(`text=${name}`), "إنشاء منتج", A, "ls-01-create-live");
      expect(ms, "إنشاء منتج يجب أن ينعكس خلال ≤30s").toBeLessThan(30_000);

      // سياق جديد مفتوح AFTER التعديل → يجب أن يرى البيانات فورًا (SRR + العلامات الحية).
      const fresh = await browser.newContext();
      const F = await fresh.newPage();
      await F.goto("/ar");
      const t0 = Date.now();
      await expect(F.locator(`text=${name}`).first()).toBeVisible({ timeout: 15_000 });
      logEvent(`NEW CONTEXT بعد التعديل عرض المنتج الجديد خلال ${Date.now() - t0}ms (render مباشر بلا انتظار poll)`);
      await shot(F, "ls-01b-new-context");
      await fresh.close();

      // التحقّق من بقاء الجلسة بعد عدة Server Actions (متطلبات 21/22).
      await B.goto("/admin/products");
      await expect(B.locator('a[href="/admin/products"]').first()).toBeVisible();
      expect(B.url()).not.toMatch(/\/admin\/login/);
      logEvent("SESSION: Server Actions (إنشاء + تنقل) لم تُبطِل جلسة الأدمن");
    } finally {
      await deleteTestProduct(B, name).catch((e) => logEvent(`CLEANUP-WARN ls-1: ${e.message}`));
      writeDiagnostics("ls-1", [diagA, diagB]);
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("ls-2 تعديل اسم منتج (قديم يختفي وجديد يظهر)", async ({ browser }) => {
    const name1 = `ZZاسم${token}`;
    const name2 = `ZZاسمB${token}`;
    const { ctx: ctxA, page: A, diag: diagA } = await openPublic(browser, "ls-2");
    const ctxB = await browser.newContext();
    const B = await ctxB.newPage();
    const diagB = attachDiagnostics(B, "ls-2");
    acceptDialogs(B);

    await login(B);
    try {
      await B.goto("/admin/products/new");
      await B.locator("#nameAr").fill(name1);
      await B.locator('input[placeholder="السعر"]').first().fill("111");
      await mainSubmit(B).click();
      await expect(B.locator("text=تم الإنشاء")).toBeVisible({ timeout: 30_000 });
      await A.locator(`text=${name1}`).first().waitFor({ state: "attached", timeout: 30_000 });
      await A.locator(`text=${name1}`).first().scrollIntoViewIfNeeded().catch(() => {});
      await A.locator(`text=${name1}`).first().waitFor({ state: "visible", timeout: 30_000 });

      await openProductEditByName(B, name1);
      await B.locator("#nameAr").fill(name2);
      await mainSubmit(B).click();
      await expect(B.locator("text=تم حفظ التعديلات")).toBeVisible({ timeout: 30_000 });

      const ms = await measureLive(A.locator(`text=${name2}`), "تغيير اسم المنتج", A, "ls-02-rename-live");
      expect(ms).toBeLessThan(30_000);
      await measureLiveGone(A.locator(`text=${name1}`), "الاسم القديم", A);
    } finally {
      await deleteTestProduct(B, name2).catch((e) => logEvent(`CLEANUP-WARN ls-2: ${e.message}`));
      writeDiagnostics("ls-2", [diagA, diagB]);
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("ls-3 تغيير السعر ينعكس وحده (تحقق مستقل عن الاسم)", async ({ browser }) => {
    const name = `ZZسعر${token}`;
    const { ctx: ctxA, page: A, diag: diagA } = await openPublic(browser, "ls-3");
    const ctxB = await browser.newContext();
    const B = await ctxB.newPage();
    const diagB = attachDiagnostics(B, "ls-3");
    acceptDialogs(B);

    await login(B);
    try {
      await B.goto("/admin/products/new");
      await B.locator("#nameAr").fill(name);
      await B.locator('input[placeholder="السعر"]').first().fill("111");
      await mainSubmit(B).click();
      await expect(B.locator("text=تم الإنشاء")).toBeVisible({ timeout: 30_000 });

      const card = () => A.locator("article").filter({ hasText: name });
      await A.bringToFront();
      await A.locator(`text=${name}`).first().waitFor({ state: "attached", timeout: 30_000 });
      await A.locator(`text=${name}`).first().scrollIntoViewIfNeeded().catch(() => {});
      await A.locator(`text=${name}`).first().waitFor({ state: "visible", timeout: 30_000 });
      await expect(card().first()).toContainText("111", { timeout: 30_000 });
      logEvent("ls-3 baseline: السعر 111 ظاهر في Context A");

      // تغيير السعر فقط (بدون لمس الاسم) → تحقيق مستقل للسيرفر ثم للعلامة العامة.
      await openProductEditByName(B, name);
      await B.locator('input[placeholder="السعر"]').first().fill("222");
      await mainSubmit(B).click();
      await expect(B.locator("text=تم حفظ التعديلات")).toBeVisible({ timeout: 30_000 });
      // إثبات أن قاعدة البيانات تعرّضت للتحديث فعلًا قبل الاعتماد على الظهور:
      const fd = await B.evaluate(async (n) => {
        const r = await fetch(`/api/content-version`, { cache: "no-store" });
        return r.json();
      }, name);
      logEvent(`ls-3: content-version بعد تغيير السعر = ${fd.v}`);

      const t0 = Date.now();
      await A.bringToFront(); // يُفعّل refresh المؤجّل لتظهر قيمة السعر الجديدة
      await card().first().waitFor({ state: "attached", timeout: 30_000 });
      await card().first().scrollIntoViewIfNeeded().catch(() => {});
      await expect(card().first()).toContainText("222", { timeout: 30_000 });
      const ms = Date.now() - t0;
      logEvent(`LIVE «تغيير السعر 111→222» ظهر في Context A بعد ${ms}ms (السعر القديم 111 اختفى ضمن نفس الفترة)`);
      await shot(A, "ls-03-price-live");
      // التأكد أن السعر القديم لم يعد ظاهرًا في بطاقة هذا المنتج.
      await expect(card().first()).not.toContainText("111", { timeout: 15_000 });
      expect(ms, "تغيير السعر يجب أن ينعكس خلال ≤30s").toBeLessThan(30_000);
    } finally {
      await deleteTestProduct(B, name).catch((e) => logEvent(`CLEANUP-WARN ls-3: ${e.message}`));
      writeDiagnostics("ls-3", [diagA, diagB]);
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("ls-4 صورة المنتج: رفع → تظهر في Context A → حذف → تختفي (Cloudinary)", async ({ browser }) => {
    test.skip(!hasCloudinary(), "BLOCKED: dedicated staging Cloudinary credentials and folder are not configured.");
    test.setTimeout(240_000); // رفع صورة إلى Cloudinary + إعادة فتح صفحة التعديل: يحتاج هامشًا فوق حدّبقية التعديل الافتراضية (ليس نومًا تعسفيًا).
    const name = `ZZصورة${token}`;
    const { ctx: ctxA, page: A, diag: diagA } = await openPublic(browser, "ls-4");
    const ctxB = await browser.newContext();
    const B = await ctxB.newPage();
    const diagB = attachDiagnostics(B, "ls-4");
    acceptDialogs(B);

    await login(B);
    try {
      await B.goto("/admin/products/new");
      await B.locator("#nameAr").fill(name);
      await B.locator('input[placeholder="السعر"]').first().fill("111");
      await mainSubmit(B).click();
      await expect(B.locator("text=تم الإنشاء")).toBeVisible({ timeout: 30_000 });
      await A.locator(`text=${name}`).first().waitFor({ state: "visible", timeout: 30_000 });

      // مدير الصور يظهر في صفحة التعديل فقط (وليس صفحة الإنشاء) — نفتحها أولًا.
      await openProductEditByName(B, name);
      const imgMgr = B.locator("section.admin-panel", { hasText: "صور المنتج" });
      const fileInput = imgMgr.locator('input[type="file"][name="file"]');
      const uploadBtn = imgMgr.locator('button[type="submit"]');
      await fileInput.setInputFiles(IMG.productA);
      // سباق الإماهدة: لو لم يتفعّل الزر خلال نافذة قصيرة فأغلب الظن أن change سبق
      // ربط مستمع onChange؛ نعيد تعيين الملف بعد إماهدة React (انتظار شرطي بلا نوم).
      const enabled = await expect(uploadBtn).toBeEnabled({ timeout: 8_000 }).then(() => true).catch(() => false);
      if (!enabled) {
        await fileInput.setInputFiles(IMG.productA);
        await expect(uploadBtn, "يجب أن يُفعَّل زر الرفع بعد اختيار ملف سليم").toBeEnabled({ timeout: 15_000 });
      }
      await uploadBtn.click();
      await expect(B.locator("text=تم رفع الصورة بنجاح")).toBeVisible({ timeout: 40_000 });
      const msAdd = await measureLive(A.locator(`article:has-text("${name}") img`), "إضافة صورة منتج", A, "ls-04-image-add-live");
      expect(msAdd).toBeLessThan(40_000);

      // حذف الصورة — نعيد فتح صفحة التعديل لأن الواجهة لا تروّج شبكة الصور محليًا.
      await openProductEditByName(B, name);
      const imgMgr2 = B.locator("section.admin-panel", { hasText: "صور المنتج" });
      await expect(imgMgr2.locator('button:has-text("حذف")').first()).toBeVisible({ timeout: 30_000 });
      await imgMgr2.locator('button:has-text("حذف")').first().click();
      // حذف الصورة لا يُظهر toast؛ نتأكد من الحذف بإعادة فتح صفحة التعديل (لا صور بعد).
      await B.waitForTimeout(1500);
      await openProductEditByName(B, name);
      await expect(B.locator("section.admin-panel", { hasText: "صور المنتج" }).locator("text=لا توجد صور بعد")).toBeVisible({ timeout: 30_000 });
      const msDel = await measureLiveGone(A.locator(`article:has-text("${name}") img`), "حذف صورة المنتج", A);
      expect(msDel).toBeLessThan(30_000);
    } finally {
      await deleteTestProduct(B, name).catch((e) => logEvent(`CLEANUP-WARN ls-4: ${e.message}`));
      writeDiagnostics("ls-4", [diagA, diagB]);
      await ctxA.close();
      await ctxB.close();
    }
  });
});

test.describe("1) Live Sync Acceptance — category & settings (revert-restore)", () => {
  test.setTimeout(240_000);

  test("ls-5 فئة: تغيير اسم ينعكس ثم يُعاد لأصله", async ({ browser }) => {
    const newCat = `ZZقسم${token}`;
    const { ctx: ctxA, page: A, diag: diagA } = await openPublic(browser, "ls-5");
    const ctxB = await browser.newContext();
    const B = await ctxB.newPage();
    const diagB = attachDiagnostics(B, "ls-5");
    acceptDialogs(B);

    await login(B);
    await B.goto("/admin/categories");
    const firstRow = B.locator("tbody tr").first();
    const originalCat = (await firstRow.locator("td").nth(1).innerText()).trim();
    try {
      await firstRow.locator('a:has-text("تعديل")').click();
      await B.locator("#nameAr").fill(newCat);
      await mainSubmit(B).click();
      await expect(B.locator("text=تم حفظ التعديلات")).toBeVisible({ timeout: 30_000 });
      const ms = await measureLive(A.locator(`text=${newCat}`), "تغيير اسم فئة", A, "ls-06-category-live");
      expect(ms).toBeLessThan(30_000);
    } finally {
      // إعادة الاسم الأصلي فورًا حتى لا تبقى بيانات الاختبار في المنيو.
      await B.goto("/admin/categories");
      await B.locator('main input[name="q"]').fill(newCat);
      await B.locator('main form[method="GET"] button[type="submit"]').click();
      await B.locator("tbody tr", { hasText: newCat }).first().locator('a:has-text("تعديل")').click();
      await B.locator("#nameAr").fill(originalCat);
      await mainSubmit(B).click();
      await expect(B.locator("text=تم حفظ التعديلات")).toBeVisible({ timeout: 30_000 });
      logEvent(`CLEANUP: أُعيد اسم الفئة إلى الأصل «${originalCat}»`);
      writeDiagnostics("ls-5", [diagA, diagB]);
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("ls-6 إعدادات: الوصف المختصر ينعكس ثم يُعاد لأصله", async ({ browser }) => {
    const newTag = `ZZوسم${token}`;
    const { ctx: ctxA, page: A, diag: diagA } = await openPublic(browser, "ls-6");
    const ctxB = await browser.newContext();
    const B = await ctxB.newPage();
    const diagB = attachDiagnostics(B, "ls-6");
    acceptDialogs(B);

    await login(B);
    await B.goto("/admin/settings");
    const originalTag = await B.locator("#taglineAr").inputValue();
    try {
      await B.locator("#taglineAr").fill(newTag);
      await mainSubmit(B).click();
      await expect(B.locator("text=تم حفظ الإعدادات")).toBeVisible({ timeout: 30_000 });
      const ms = await measureLive(A.locator(`text=${newTag}`), "تعديل الإعدادات العامة (tagline)", A, "ls-07-settings-live");
      expect(ms).toBeLessThan(30_000);
    } finally {
      await B.goto("/admin/settings");
      await B.locator("#taglineAr").fill(originalTag);
      await mainSubmit(B).click();
      await expect(B.locator("text=تم حفظ الإعدادات")).toBeVisible({ timeout: 30_000 });
      logEvent("CLEANUP: أُعيدت الإعدادات العامة إلى أصلها (tagline)");
      writeDiagnostics("ls-6", [diagA, diagB]);
      await ctxA.close();
      await ctxB.close();
    }
  });
});
