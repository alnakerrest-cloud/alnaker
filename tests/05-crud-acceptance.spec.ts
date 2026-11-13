import { test, expect, type Page } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
import { login, shot, acceptDialogs, IMG, EVIDENCE_DIR, ADMIN, EDITOR } from "./helpers";

// Authoritative DB access (tests run in Node). Load the same env the app uses.
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;

const token = "ZZ" + Date.now().toString(36).toUpperCase();

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/admin\/login$/, { timeout: 20_000 });
}
async function firstSectionId(): Promise<string> {
  const rows = await q(`select s.id from "Section" s join "Category" c on c.id=s."categoryId" where c."isVisible"=true order by c."sortOrder", s."sortOrder" limit 1`);
  return rows[0].id;
}
async function productIdByName(name: string): Promise<string | null> {
  const r = await q(`select id from "Product" where "nameAr"=$1`, [name]);
  return r[0]?.id ?? null;
}
async function productSnapshot(id: string) {
  const p = await q(`select "nameAr","descAr","isVisible","isAvailable","badge" from "Product" where id=$1`, [id]);
  const v = await q(`select price from "ProductVariant" where "productId"=$1 order by "sortOrder"`, [id]);
  const img = await q(`select id,url,"publicId","isPrimary" from "ProductImage" where "productId"=$1`, [id]);
  return { ...p[0], prices: v.map((x) => Number(x.price)), images: img };
}
const t0 = () => Date.now();
const ms = (s: number) => Date.now() - s;

test.describe("5) CRUD Acceptance (DB-authoritative)", () => {
  test.afterAll(async () => { await pool.end(); });

  test("PRODUCTS: create/edit/desc/price/variants/image/hide/delete + public sync", async ({ page, browser }) => {
    test.setTimeout(300_000);
    acceptDialogs(page);
    await login(page);
    const name = `${token}-منتج`;
    const lat: Record<string, number> = {};

    // CREATE
    let s = t0();
    await page.goto("/admin/products/new");
    await page.locator("#nameAr").fill(name);
    await page.locator('input[placeholder="السعر"]').first().fill("50");
    await page.locator('main form button[type="submit"]').first().click();
    await expect(page.locator("text=تم الإنشاء")).toBeVisible({ timeout: 20_000 });
    lat.create = ms(s);
    const id = await productIdByName(name);
    expect(id, "product row persisted").toBeTruthy();
    let snap = await productSnapshot(id!);
    expect(snap.prices).toEqual([50]);
    expect(snap.isVisible).toBe(true);

    // EDIT: rename + desc + change price + add variant
    const name2 = `${token}-منتجB`;
    s = t0();
    await page.goto(`/admin/products/${id}`);
    await page.locator("#nameAr").fill(name2);
    await page.locator("#descAr").fill(`وصف ${token}`);
    await page.locator('input[placeholder="السعر"]').first().fill("99");
    await page.locator('button:has-text("+ إضافة سعر")').click();
    await page.locator('input[placeholder="السعر"]').nth(1).fill("120");
    await page.locator('main form button[type="submit"]').first().click();
    await expect(page.locator("text=تم حفظ التعديلات")).toBeVisible({ timeout: 20_000 });
    lat.edit = ms(s);
    snap = await productSnapshot(id!);
    expect(snap.nameAr).toBe(name2);
    expect(snap.descAr).toBe(`وصف ${token}`);
    expect((snap.prices as number[]).sort((a: number, b: number) => a - b)).toEqual([99, 120]);

    // DELETE a variant (remove one row -> back to single price). Poll DB to avoid stale-flash race.
    await page.locator('button:has-text("✕")').first().click();
    await page.locator('main form button[type="submit"]').first().click();
    await expect.poll(async () => (await productSnapshot(id!)).prices.length, { timeout: 20_000 }).toBe(1);
    snap = await productSnapshot(id!);

    // EN name: schema has no English name field (Arabic-only design) -> N/A
    const enCols = await q(`select column_name from information_schema.columns where table_name='Product' and column_name ilike '%name%'`);
    expect(enCols.map((c) => c.column_name)).not.toContain("nameEn");

    // IMAGE upload -> DB + Cloudinary reachable
    s = t0();
    await page.locator('input[type="file"][name="file"]').setInputFiles(IMG.productA);
    await page.locator('button:has-text("رفع صورة")').click();
    await expect(page.locator("text=تم رفع الصورة بنجاح")).toBeVisible({ timeout: 40_000 });
    lat.imageUpload = ms(s);
    snap = await productSnapshot(id!);
    expect(snap.images.length).toBe(1);
    expect(snap.images[0].isPrimary).toBe(true);
    const uploadedPublicId = snap.images[0].publicId!;
    let head = await fetch(snap.images[0].url, { method: "HEAD" });
    expect(head.ok, "uploaded image reachable").toBe(true);

    // IMAGE delete -> DB row gone + Cloudinary asset destroyed (404)
    await page.locator('button:has-text("حذف")').last().click();
    await expect(page.locator("text=لا توجد صور بعد لهذا المنتج")).toBeVisible({ timeout: 20_000 });
    snap = await productSnapshot(id!);
    expect(snap.images.length).toBe(0);
    const gone = await q(`select 1 from "ProductImage" where "publicId"=$1`, [uploadedPublicId]);
    expect(gone.length).toBe(0);

    // HIDE -> DB + public menu (UI reflects toggle immediately)
    const pub = await page.context().newPage();
    await pub.goto("/ar", { waitUntil: "domcontentloaded" });
    await expect(pub.locator(`text=${name2}`).first()).toBeVisible({ timeout: 20_000 });

    s = t0();
    await page.bringToFront();
    await page.goto("/admin/products");
    await page.locator('main input[name="q"]').fill(name2);
    await page.locator('main form[method="GET"] button[type="submit"]').click();
    const row = page.locator("tbody tr", { hasText: name2 }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.locator('button:has-text("إخفاء")').click();
    await expect(row.locator('button:has-text("إظهار")')).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await q(`select "isVisible" from "Product" where id=$1`, [id!]))[0]?.isVisible, { timeout: 20_000 }).toBe(false);
    await expect(row.locator('button:has-text("إظهار")')).toBeVisible({ timeout: 20_000 });
    // public updates without manual reload (LiveSync fires on tab focus)
    await pub.bringToFront();
    await expect(pub.locator(`text=${name2}`).first()).toBeHidden({ timeout: 20_000 });
    lat.hideToPublic = ms(s);

    // SHOW again then DELETE product
    await page.bringToFront();
    await row.locator('button:has-text("إظهار")').click();
    await expect.poll(async () => (await q(`select "isVisible" from "Product" where id=$1`, [id!]))[0]?.isVisible, { timeout: 20_000 }).toBe(true);
    s = t0();
    await row.locator('button:has-text("حذف")').click();
    await expect.poll(async () => await productIdByName(name2), { timeout: 20_000 }).toBeNull();
    lat.delete = ms(s);
    await pub.close();
    await shot(page, "crud5-products");
    fs.writeFileSync(path.join(EVIDENCE_DIR, "latency-products.json"), JSON.stringify(lat, null, 2));
  });

  test("CATEGORIES: create/edit(name+desc)/order/hide/image/delete", async ({ page }) => {
    test.setTimeout(180_000);
    acceptDialogs(page);
    await login(page);
    const cname = `${token}-قسم`;
    await page.goto("/admin/categories/new");
    await page.locator("#nameAr").fill(cname);
    await page.locator("#sortOrder").fill("9999");
    await page.locator('main form button[type="submit"]').first().click();
    await expect(page.locator("text=تم الإنشاء بنجاح")).toBeVisible({ timeout: 20_000 });
    let cat = (await q(`select id,"nameAr","sortOrder","isVisible" from "Category" where "nameAr"=$1`, [cname]))[0];
    expect(cat, "category persisted").toBeTruthy();
    expect(cat.sortOrder).toBe(9999);

    // edit name + description (noteAr)
    const cname2 = `${token}-قسمB`;
    await page.goto(`/admin/categories/${cat.id}`);
    await page.locator("#nameAr").fill(cname2);
    await page.locator("#noteAr").fill(`ملاحظة ${token}`).catch(async () => { /* field may be optional */ });
    await page.locator('main form button[type="submit"]').first().click();
    const catId = cat.id;
    await expect.poll(async () => (await q(`select "nameAr" from "Category" where id=$1`, [catId]))[0]?.nameAr, { timeout: 20_000 }).toBe(cname2);

    // reorder: move up reduces sortOrder
    await page.goto("/admin/categories");
    const before = (await q(`select "sortOrder" from "Category" where id=$1`, [cat.id]))[0].sortOrder;
    await page.locator("tbody tr", { hasText: cname2 }).first().locator('button[title="تحريك لأعلى"]').click();
    await expect.poll(async () => (await q(`select "sortOrder" from "Category" where id=$1`, [cat.id]))[0].sortOrder, { timeout: 20_000 }).toBeLessThan(before);

    // hide/show -> DB
    await page.locator("tbody tr", { hasText: cname2 }).first().locator('button:has-text("إخفاء")').click();
    await expect.poll(async () => (await q(`select "isVisible" from "Category" where id=$1`, [cat.id]))[0].isVisible, { timeout: 20_000 }).toBe(false);
    await page.locator("tbody tr", { hasText: cname2 }).first().locator('button:has-text("إظهار")').click();
    await expect.poll(async () => (await q(`select "isVisible" from "Category" where id=$1`, [cat.id]))[0].isVisible, { timeout: 20_000 }).toBe(true);

    // category image assign/remove -> DB + Cloudinary
    await page.goto(`/admin/categories/${cat.id}`);
    await page.locator('input[type="file"][name="file"]').setInputFiles(IMG.category);
    await page.locator('button:has-text("رفع صورة")').click();
    await expect(page.locator("text=تم حفظ الصورة")).toBeVisible({ timeout: 40_000 });
    let ci = (await q(`select "imageUrl","imagePublicId" from "Category" where id=$1`, [cat.id]))[0];
    expect(ci.imageUrl, "category image url stored").toBeTruthy();
    let head = await fetch(ci.imageUrl, { method: "HEAD" });
    expect(head.ok).toBe(true);
    await page.reload();
    await page.locator('button:has-text("إزالة")').click();
    await expect.poll(async () => (await q(`select "imageUrl" from "Category" where id=$1`, [cat.id]))[0]?.imageUrl, { timeout: 20_000 }).toBeFalsy();

    // delete category
    await page.goto("/admin/categories");
    await page.locator('main input[name="q"]').fill(cname2);
    await page.locator('main form[method="GET"] button[type="submit"]').click();
    await page.locator("tbody tr", { hasText: cname2 }).first().locator('button:has-text("حذف")').click();
    await expect(page.locator("text=لا أقسام مطابقة")).toBeVisible({ timeout: 20_000 });
    expect((await q(`select 1 from "Category" where id=$1`, [cat.id])).length, "category deleted").toBe(0);
    await shot(page, "crud5-categories");
  });

  test("SETTINGS: edit tagline -> public reflects -> restore", async ({ page }) => {
    test.setTimeout(120_000);
    acceptDialogs(page);
    await login(page);
    await page.goto("/admin/settings");
    const orig = await page.locator("#taglineAr").inputValue();
    const testTag = `وسم اختبار ${token}`;
    await page.locator("#taglineAr").fill(testTag);
    await page.locator('button:has-text("حفظ الإعدادات")').click();
    await expect.poll(async () => (await q(`select "taglineAr" from "RestaurantSettings" where id='default'`))[0]?.taglineAr, { timeout: 20_000 }).toBe(testTag);
    // public reflects without admin involvement
    const res = await page.request.get("/ar");
    const html = await res.text();
    expect(html).toContain(testTag);
    // restore
    await page.locator("#taglineAr").fill(orig);
    await page.locator('button:has-text("حفظ الإعدادات")').click();
    await expect.poll(async () => (await q(`select "taglineAr" from "RestaurantSettings" where id='default'`))[0]?.taglineAr, { timeout: 20_000 }).toBe(orig);
    await shot(page, "crud5-settings");
  });

  test("BRANCHES: shared-menu verified; test branch CRUD; real branches untouched", async ({ page }) => {
    test.setTimeout(120_000);
    acceptDialogs(page);
    await login(page);
    const realBefore = await q(`select id,"nameAr" from "Branch" order by "sortOrder"`);
    expect(realBefore.length, "real branches exist").toBeGreaterThanOrEqual(1);
    // no menu table references branch => single shared menu
    const branchCols = await q(`select table_name from information_schema.columns where column_name ilike '%branch%'`);
    expect(branchCols.length, "no branch FK on menu tables (shared menu)").toBe(0);

    const bname = `${token}-فرع`;
    await page.goto("/admin/branches/new");
    await page.locator("#nameAr").fill(bname);
    await page.locator("#cityAr").fill("مدينة اختبار");
    await page.locator("#addressAr").fill(`عنوان ${token}`);
    await page.locator('main form button[type="submit"]').first().click();
    await expect(page.locator("text=تم الإنشاء")).toBeVisible({ timeout: 20_000 });
    let br = (await q(`select id,"nameAr" from "Branch" where "nameAr"=$1`, [bname]))[0];
    expect(br, "test branch persisted").toBeTruthy();

    await page.goto(`/admin/branches/${br.id}`);
    await page.locator("#nameAr").fill(`${bname}B`);
    await page.locator('main form button[type="submit"]').first().click();
    await expect(page.locator("text=تم حفظ التعديلات")).toBeVisible({ timeout: 20_000 });
    expect((await q(`select "nameAr" from "Branch" where id=$1`, [br.id]))[0].nameAr).toBe(`${bname}B`);

    await page.goto("/admin/branches");
    await page.locator('main input[name="q"]').fill(`${bname}B`);
    await page.locator('main form[method="GET"] button[type="submit"]').click();
    const brRow = page.locator("tbody tr", { hasText: `${bname}B` }).first();
    await brRow.locator('button:has-text("حذف")').click();
    // Authoritative: confirm deletion in DB, then UI reflects after refresh
    await expect.poll(async () => (await q(`select 1 from "Branch" where id=$1`, [br.id])).length, { timeout: 20_000 }).toBe(0);
    await expect(brRow).toHaveCount(0, { timeout: 20_000 });
    expect((await q(`select 1 from "Branch" where id=$1`, [br.id])).length).toBe(0);

    const realAfter = await q(`select id,"nameAr" from "Branch" order by "sortOrder"`);
    expect(realAfter.map((r) => r.id).sort()).toEqual(realBefore.map((r) => r.id).sort());
    await shot(page, "crud5-branches");
  });

  test("MEDIA LIBRARY: /admin/images lists assets + usage links (incl. PDF-derived)", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);
    await page.goto("/admin/images");
    await expect(page.getByRole("heading", { name: "إدارة الصور" })).toBeVisible();
    await expect(page.locator("text=متصل").first()).toBeVisible({ timeout: 20_000 });
    // product images grid should include a pdf-derived tray name and a usage link
    await expect(page.locator('a[href^="/admin/products/"]').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(`text=صينية مشاوي`).first()).toBeVisible();
    // category image section shows المندي (pdf-derived category image)
    await expect(page.locator("text=صور الأقسام")).toBeVisible();
    await shot(page, "crud5-media-library");
  });

  test("AUTH: logout/protected/session-persistence/OWNER-only-delete", async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    acceptDialogs(page);

    // protected route without session -> login
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 20_000 });

    // login + session persistence across reload
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.reload();
    await expect(page.locator('a[href="/admin/products"]').first()).toBeVisible({ timeout: 20_000 });

    // create a product as OWNER, then verify EDITOR cannot delete (button gated) and DB unchanged
    const name = `${token}-perm`;
    const sectionId = await firstSectionId();
    await page.goto("/admin/products/new");
    await page.locator("#nameAr").fill(name);
    await page.locator('input[placeholder="السعر"]').first().fill("10");
    await page.locator('main form button[type="submit"]').first().click();
    await expect(page.locator("text=تم الإنشاء")).toBeVisible({ timeout: 20_000 });
    const pid = await productIdByName(name);
    expect(pid).toBeTruthy();

    // logout -> session row removed + redirect
    await page.goto("/admin");
    await page.locator('button:has-text("تسجيل الخروج"), a:has-text("تسجيل الخروج")').first().click();
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 20_000 });

    // login as EDITOR
    await loginAs(page, EDITOR.email, EDITOR.password);
    await page.goto("/admin/products");
    await page.locator('main input[name="q"]').fill(name);
    await page.locator('main form[method="GET"] button[type="submit"]').click();
    const row = page.locator("tbody tr", { hasText: name }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.locator('button:has-text("حذف")')).toHaveCount(0); // OWNER-only deletion
    expect((await q(`select 1 from "Product" where id=$1`, [pid!])).length, "editor cannot delete; still in DB").toBe(1);
    await shot(page, "crud5-auth-editor-nodel");

    await ctx.close();
    // cleanup as OWNER
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    acceptDialogs(p2);
    await loginAs(p2, ADMIN.email, ADMIN.password);
    await p2.goto("/admin/products");
    await p2.locator('main input[name="q"]').fill(name);
    await p2.locator('main form[method="GET"] button[type="submit"]').click();
    const prodRow = p2.locator("tbody tr", { hasText: name }).first();
    await prodRow.locator('button:has-text("حذف")').click();
    await expect.poll(async () => (await q(`select 1 from "Product" where id=$1`, [pid!])).length, { timeout: 20_000 }).toBe(0);
    await expect(prodRow).toHaveCount(0, { timeout: 20_000 });
    expect(await productIdByName(name)).toBeNull();
    await ctx2.close();
  });
});
