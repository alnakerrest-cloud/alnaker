import { test, expect, type Page } from "@playwright/test";
import { login, shot, acceptDialogs, IMG, openProductEditByName, openCategoryEditByName, productRow, mainSubmit } from "./helpers";

const token = Date.now().toString(36).toUpperCase();

/** قيمة ترتيب القسم (عمود «ترتيب») كرقم. */
async function categorySortOrder(page: Page, name: string): Promise<number> {
  const cell = page.locator("tbody tr", { hasText: name }).first().locator("td").nth(7);
  return parseInt((await cell.innerText()).trim(), 10);
}

test.describe("2) Full CRUD Browser Tests", () => {
  test("منتج: إنشاء/تعديل/variants/إخفاء/إظهار/حذف", async ({ page }) => {
    test.setTimeout(120_000);
    acceptDialogs(page);
    await login(page);

    const name = `ZZمنتج${token}`;
    await page.goto("/admin/products/new");
    await page.locator("#nameAr").fill(name);
    await page.locator('input[placeholder="السعر"]').first().fill("50");
    await mainSubmit(page).click();
    await expect(page.locator("text=تم الإنشاء")).toBeVisible({ timeout: 20_000 });
    await shot(page, "crud-01-product-created");

    // تعديل الاسم/الوصف/الشارة + إضافة variant ثانٍ
    const name2 = `ZZمنتجB${token}`;
    await openProductEditByName(page, name);
    await page.locator("#nameAr").fill(name2);
    await page.locator("#descAr").fill("وصف اختباري ZZ");
    await page.locator("#badge").selectOption("OFFER");
    await page.locator('button:has-text("+ إضافة سعر")').click();
    await page.locator('input[placeholder="السعر"]').nth(1).fill("75");
    await mainSubmit(page).click();
    await expect(page.locator("text=تم حفظ التعديلات")).toBeVisible({ timeout: 20_000 });

    // التحقّق في القائمة: عدّد variants = 2 والشارة «عرض»
    await page.goto("/admin/products");
    await page.locator('main input[name="q"]').fill(name2);
    await page.locator('main form[method="GET"] button[type="submit"]').click();
    await expect(productRow(page, name2)).toBeVisible();
    await expect(productRow(page, name2).locator("td").nth(3)).toHaveText("2");
    await expect(productRow(page, name2).locator("td").nth(4)).toContainText("عرض");
    await shot(page, "crud-02-product-edited");

    // إخفاء ثم إظهار
    await productRow(page, name2).locator('button:has-text("إخفاء")').click();
    await expect(productRow(page, name2).locator('button:has-text("إظهار")')).toBeVisible({ timeout: 20_000 });
    await shot(page, "crud-03-product-hidden");
    await productRow(page, name2).locator('button:has-text("إظهار")').click();
    await expect(productRow(page, name2).locator('button:has-text("إخفاء")')).toBeVisible({ timeout: 20_000 });

    // حذف
    await productRow(page, name2).locator('button:has-text("حذف")').click();
    await expect(page.locator("text=لا منتجات مطابقة")).toBeVisible({ timeout: 20_000 });
    await shot(page, "crud-04-product-deleted");
  });

  test("فئة: إنشاء/تعديل/ترتيب/إخفاء/صورة/حذف", async ({ page }) => {
    test.setTimeout(150_000);
    acceptDialogs(page);
    await login(page);

    const cname = `ZZقسم${token}`;
    await page.goto("/admin/categories/new");
    await page.locator("#nameAr").fill(cname);
    await page.locator("#icon").fill("🧪");
    await page.locator("#sortOrder").fill("9999"); // ليكون في النهاية فنختبر التحريك لأعلى
    await mainSubmit(page).click();
    await expect(page.locator("text=تم الإنشاء بنجاح")).toBeVisible({ timeout: 20_000 });

    await page.goto("/admin/categories");
    await page.locator('main input[name="q"]').fill(cname);
    await page.locator('main form[method="GET"] button[type="submit"]').click();
    await expect(page.locator("tbody tr", { hasText: cname }).first()).toBeVisible();
    await shot(page, "crud-05-category-created");

    // تعديل الاسم
    const cname2 = `ZZقسمB${token}`;
    await openCategoryEditByName(page, cname);
    await page.locator("#nameAr").fill(cname2);
    await mainSubmit(page).click();
    await expect(page.locator("text=تم حفظ التعديلات")).toBeVisible({ timeout: 20_000 });

    // ترتيب: القائمة الكاملة ثم «تحريك لأعلى» يقلّل قيمة الترتيب (تبديل مع الجار)
    await page.goto("/admin/categories");
    const before = await categorySortOrder(page, cname2);
    expect(before).toBe(9999);
    await page.locator("tbody tr", { hasText: cname2 }).first().locator('button[title="تحريك لأعلى"]').click();
    await expect.poll(() => categorySortOrder(page, cname2), { timeout: 20_000 }).toBeLessThan(before);
    await shot(page, "crud-06-category-reordered");

    // إخفاء ثم إظهار (الحالة في العمود 6)
    await page.locator("tbody tr", { hasText: cname2 }).first().locator('button:has-text("إخفاء")').click();
    await expect(page.locator("tbody tr", { hasText: cname2 }).first().locator("td").nth(6)).toContainText("مخفي", { timeout: 20_000 });
    await page.locator("tbody tr", { hasText: cname2 }).first().locator('button:has-text("إظهار")').click();
    await expect(page.locator("tbody tr", { hasText: cname2 }).first().locator("td").nth(6)).toContainText("ظاهر", { timeout: 20_000 });

    // صورة الفئة: رفع ← استبدال ← إزالة (صفحة التعديل)
    await openCategoryEditByName(page, cname2);
    await page.locator('input[type="file"][name="file"]').setInputFiles(IMG.category);
    await page.locator('button:has-text("رفع صورة")').click();
    await expect(page.locator("text=تم حفظ الصورة")).toBeVisible({ timeout: 40_000 });
    await page.reload();
    await expect(page.locator('button:has-text("استبدال الصورة")')).toBeVisible({ timeout: 20_000 });
    await shot(page, "crud-07-category-image");
    await page.locator('input[type="file"][name="file"]').setInputFiles(IMG.category);
    await page.locator('button:has-text("استبدال الصورة")').click();
    await expect(page.locator("text=تم حفظ الصورة")).toBeVisible({ timeout: 40_000 });
    await page.reload();
    await page.locator('button:has-text("إزالة")').click();
    // أنتظر تحديث الواجهة عبر router.refresh() في المكون قبل المتابعة
    await expect(page.locator('button:has-text("رفع صورة")')).toBeVisible({ timeout: 20_000 });

    // حذف الفئة
    await page.goto("/admin/categories");
    await page.locator('main input[name="q"]').fill(cname2);
    await page.locator('main form[method="GET"] button[type="submit"]').click();
    await page.locator("tbody tr", { hasText: cname2 }).first().locator('button:has-text("حذف")').click();
    await expect(page.locator("text=لا أقسام مطابقة")).toBeVisible({ timeout: 20_000 });
    await shot(page, "crud-08-category-deleted");
  });

  test("فرع: إنشاء/تعديل/حذف", async ({ page }) => {
    test.setTimeout(120_000);
    acceptDialogs(page);
    await login(page);

    const bname = `ZZفرع${token}`;
    await page.goto("/admin/branches/new");
    await page.locator("#nameAr").fill(bname);
    await page.locator("#cityAr").fill("مدينة اختبار");
    await page.locator("#addressAr").fill("عنوان اختبار ZZ");
    await mainSubmit(page).click();
    await expect(page.locator("text=تم الإنشاء")).toBeVisible({ timeout: 20_000 });

    await page.goto("/admin/branches");
    await page.locator('main input[name="q"]').fill(bname);
    await page.locator('main form[method="GET"] button[type="submit"]').click();
    const row = page.locator("tbody tr", { hasText: bname }).first();
    await expect(row).toBeVisible();
    await shot(page, "crud-09-branch-created");

    const bname2 = `ZZفرعB${token}`;
    await row.locator('a:has-text("تعديل")').click();
    await page.locator("#nameAr").fill(bname2);
    await mainSubmit(page).click();
    await expect(page.locator("text=تم حفظ التعديلات")).toBeVisible({ timeout: 20_000 });

    await page.goto("/admin/branches");
    await page.locator('main input[name="q"]').fill(bname2);
    await page.locator('main form[method="GET"] button[type="submit"]').click();
    const row2 = page.locator("tbody tr", { hasText: bname2 }).first();
    await expect(row2).toBeVisible({ timeout: 20_000 });
    await row2.locator('button:has-text("حذف")').click();
    await expect(row2).toHaveCount(0, { timeout: 20_000 });
    await shot(page, "crud-10-branch-deleted");
  });

  test("إعدادات + شعار: تعديل حقل (مع الإعادة) ورفع/استبدال/إزالة الشعار", async ({ page }) => {
    test.setTimeout(150_000);
    acceptDialogs(page);
    await login(page);

    await page.goto("/admin/settings");
    const orig = await page.locator("#currencyAr").inputValue();
    await page.locator("#currencyAr").fill("و.ز.اختبار");
    await page.locator('button:has-text("حفظ الإعدادات")').click();
    await expect(page.locator("text=تم حفظ الإعدادات")).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.locator("#currencyAr")).toHaveValue("و.ز.اختبار");
    await shot(page, "crud-11-settings-saved");
    // إعادة لأصلها
    await page.locator("#currencyAr").fill(orig);
    await page.locator('button:has-text("حفظ الإعدادات")').click();
    await expect(page.locator("text=تم حفظ الإعدادات")).toBeVisible({ timeout: 20_000 });

    // الشعار: زر واحد نشيط (رفع/استبدال) يحمل «الشعار» في تسميته
    await page.reload();
    await page.locator('input[type="file"][name="file"]').setInputFiles(IMG.logo);
    await page.locator('button:has-text("الشعار")').first().click();
    await expect(page.locator("text=تم حفظ الشعار")).toBeVisible({ timeout: 40_000 });
    await page.reload();
    await expect(page.locator('button:has-text("استبدال الشعار")')).toBeVisible({ timeout: 20_000 });
    await shot(page, "crud-12-logo-uploaded");

    // استبدال
    await page.locator('input[type="file"][name="file"]').setInputFiles(IMG.logo);
    await page.locator('button:has-text("استبدال الشعار")').click();
    await expect(page.locator("text=تم حفظ الشعار")).toBeVisible({ timeout: 40_000 });

    // إزالة (تنظيف — إعادة لحالة بلا شعار مخصّص)
    await page.reload();
    await page.locator('button:has-text("إزالة")').click();
    // أنتظر تحديث الواجهة عبر router.refresh() في المكون قبل المتابعة
    await expect(page.locator('button:has-text("رفع الشعار")')).toBeVisible({ timeout: 20_000 });
    await shot(page, "crud-13-logo-removed");
  });
});
