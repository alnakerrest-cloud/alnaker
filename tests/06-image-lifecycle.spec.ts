import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
import { v2 as cloudinary } from "cloudinary";
import { login, shot, acceptDialogs, IMG, EVIDENCE_DIR } from "./helpers";

// Authoritative DB access.
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
async function cldAssetExists(publicId: string): Promise<boolean> {
  try {
    await cloudinary.api.resource(publicId);
    return true;
  } catch {
    return false;
  }
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;

// Real product that currently carries a temporary PDF-derived image.
const PID = "8cd30623-2fcf-4ef5-bc59-fff32b7315e0"; // صينية مشاوي
const PDF_PUBLIC_ID = "naqer-menu/products/pdf-tray-mashawi";
const PDF_SEG = "pdf-tray-mashawi";
const INVALID = path.join(EVIDENCE_DIR, "_invalid-upload.txt");

async function imagesOf(id: string) {
  return q(`select id,url,"publicId","isPrimary","sortOrder" from "ProductImage" where "productId"=$1 order by "isPrimary" desc,"sortOrder" asc`, [id]);
}
const seg = (publicId: string) => publicId.split("/").pop()!;
const headOk = async (url: string) => {
  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
};

test.describe("6) Temporary image lifecycle safety (real PDF asset preserved)", () => {
  test.afterAll(async () => { await pool.end(); });

  test("failed upload keeps old · successful upload does not disturb old · public reflects primary · delete cleans Cloudinary (no orphan)", async ({ page }) => {
    test.setTimeout(240_000);
    acceptDialogs(page);
    fs.writeFileSync(INVALID, "this is definitely not an image");
    const lat: Record<string, number> = {};
    await login(page);

    // ---- BASELINE: exactly the PDF image, primary, reachable ----
    let imgs = await imagesOf(PID);
    expect(imgs.length, "baseline: product has exactly its PDF image").toBe(1);
    const pdf = imgs[0];
    expect(pdf.publicId).toBe(PDF_PUBLIC_ID);
    expect(pdf.isPrimary).toBe(true);
    expect(await headOk(pdf.url), "baseline PDF reachable").toBe(true);

    await page.goto(`/admin/products/${PID}`);

    // ---- (1) UPLOAD FAILURE: invalid file rejected client-side; old image must remain untouched ----
    let s = Date.now();
    await page.locator('input[type="file"][name="file"]').setInputFiles(INVALID);
    await expect(page.locator(".admin-flash.err", { hasText: "صيغة الملف غير مسموحة" }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button:has-text("رفع صورة")')).toBeDisabled();
    imgs = await imagesOf(PID);
    expect(imgs.length, "failed upload added/removed nothing").toBe(1);
    expect(imgs[0].publicId, "old PDF still the only image after failed upload").toBe(PDF_PUBLIC_ID);
    expect(await headOk(pdf.url), "old PDF still reachable after failed upload").toBe(true);
    lat.failedUpload = Date.now() - s;

    // ---- (2) SUCCESSFUL UPLOAD: new saved; old must NOT be deleted even though new saved ----
    s = Date.now();
    await page.locator('input[type="file"][name="file"]').setInputFiles(IMG.productA);
    await page.locator('button:has-text("رفع صورة")').click();
    await expect(page.locator("text=تم رفع الصورة بنجاح")).toBeVisible({ timeout: 40_000 });
    await page.reload();
    imgs = await imagesOf(PID);
    expect(imgs.length, "new image added alongside old (old not auto-deleted on upload)").toBe(2);
    const pdfStill = imgs.find((i) => i.publicId === PDF_PUBLIC_ID)!;
    const newImg = imgs.find((i) => i.publicId !== PDF_PUBLIC_ID)!;
    expect(newImg, "new test image present").toBeTruthy();
    expect(pdfStill.isPrimary, "old PDF stays primary after new upload").toBe(true);
    expect(newImg.isPrimary, "new image is secondary").toBe(false);
    expect(await headOk(newImg.url), "new image saved & reachable").toBe(true);
    lat.upload = Date.now() - s;
    const newSeg = seg(newImg.publicId);

    // ---- (3) REPLACE IN PUBLIC MENU: make the new image primary -> public shows new, not PDF ----
    s = Date.now();
    await page.locator('button:has-text("تعيين كأساسية")').click(); // unique: only the secondary (new) card has it
    await expect.poll(async () => (await imagesOf(PID)).find((i) => i.publicId === newImg.publicId)?.isPrimary, { timeout: 20_000 }).toBe(true);
    await page.reload();
    let arHtml = await (await page.request.get("/ar")).text();
    expect(arHtml, "public menu reflects the NEW primary image").toContain(newSeg);
    expect(arHtml, "public menu no longer renders the PDF image").not.toContain(PDF_SEG);
    lat.replaceToPublic = Date.now() - s;

    // ---- (4) REVERT primary to the PDF (proves public tracks primary both ways; keeps PDF intact) ----
    await page.locator('button:has-text("تعيين كأساسية")').click(); // now the PDF card is the secondary one
    await expect.poll(async () => (await imagesOf(PID)).find((i) => i.publicId === PDF_PUBLIC_ID)?.isPrimary, { timeout: 20_000 }).toBe(true);
    await page.reload();
    arHtml = await (await page.request.get("/ar")).text();
    expect(arHtml, "public menu reflects the PDF primary again").toContain(PDF_SEG);
    expect(arHtml, "public menu no longer renders the new image").not.toContain(newSeg);

    // ---- (5) DELETE the new test image -> Cloudinary asset destroyed (no orphan); PDF preserved ----
    s = Date.now();
    const newTestUrl = newImg.url;
    // the secondary (new) card is the one that currently has "تعيين كأساسية"; its delete button is the following sibling
    await page.locator('button:has-text("تعيين كأساسية")').locator('xpath=following-sibling::button').click();
    await expect.poll(async () => (await imagesOf(PID)).length, { timeout: 20_000 }).toBe(1);
    const remaining = await imagesOf(PID);
    expect(remaining[0].publicId, "only the PDF image remains").toBe(PDF_PUBLIC_ID);
    expect(remaining[0].isPrimary, "PDF is primary").toBe(true);
    expect(await headOk(pdf.url), "real PDF asset NEVER destroyed").toBe(true);
    await expect.poll(async () => cldAssetExists(newImg.publicId), { timeout: 15_000 }).toBe(false);
    lat.delete = Date.now() - s;

    // ---- FINAL: state identical to baseline ----
    arHtml = await (await page.request.get("/ar")).text();
    expect(arHtml).toContain(PDF_SEG);
    await shot(page, "imglifecycle-final");
    fs.writeFileSync(path.join(EVIDENCE_DIR, "latency-img-lifecycle.json"), JSON.stringify(lat, null, 2));
  });
});
