import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import pg from "pg";
import { v2 as cloudinary } from "cloudinary";
import { login, shot, acceptDialogs, IMG, EVIDENCE_DIR } from "./helpers";

// Staging-only, isolated DB/Cloudinary context.
const { loadStagingEnv, hasCloudinary } = require("./staging-env") as typeof import("./staging-env");
loadStagingEnv();

const hasStagingCloudinary = hasCloudinary();
if (hasStagingCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

async function cldAssetExists(publicId: string): Promise<boolean> {
  try { await cloudinary.api.resource(publicId); return true; } catch { return false; }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;

const INVALID = path.join(EVIDENCE_DIR, "_invalid-upload.txt");
let PID = "";
let BASE_PUBLIC_ID = "";
let BASE_SEG = "";
let BASE_URL = "";
let CREATED_PRODUCT = false;

async function imagesOf(id: string) {
  return q(`select id,url,"publicId","isPrimary","sortOrder" from "ProductImage" where "productId"=$1 order by "isPrimary" desc,"sortOrder" asc`, [id]);
}
const seg = (publicId: string) => publicId.split("/").pop()!;
const headOk = async (url: string) => {
  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch { return false; }
};

test.describe("6) Image lifecycle safety on staging (upload/replace/delete)", () => {
  test.skip(!hasStagingCloudinary, "BLOCKED: dedicated staging Cloudinary credentials and folder are not configured.");

  test.beforeAll(async () => {
    // Pick a visible product and establish a staging-owned baseline primary image.
    const rows = await q(`
      select p.id, p."nameAr"
      from "Product" p
      join "Section" s on s.id=p."sectionId"
      join "Category" c on c.id=s."categoryId"
      where p."isVisible"=true and c."isVisible"=true
      order by c."sortOrder", s."sortOrder", p."sortOrder" limit 1
    `);
    if (!rows.length) throw new Error("STAGING SETUP: no visible product available for image lifecycle test");
    PID = rows[0].id;
    // Remove any pre-existing images from this staging product so baseline is deterministic and cleanup is safe.
    await q(`delete from "ProductImage" where "productId"=$1`, [PID]);
    // Upload a staging baseline image directly to Cloudinary in the app's secure folder scope.
    const folder = process.env.CLOUDINARY_SECURE_FOLDER || "naqer-menu";
    const up = await cloudinary.uploader.upload(IMG.productB, {
      folder: `${folder}/products`,
      resource_type: "image",
      overwrite: false,
    });
    BASE_PUBLIC_ID = up.public_id;
    BASE_SEG = seg(BASE_PUBLIC_ID);
    BASE_URL = up.secure_url;
    await q(`insert into "ProductImage"(id,"productId",url,"publicId","altAr","isPrimary","sortOrder","createdAt") values (gen_random_uuid(),$1,$2,$3,$4,true,0,now())`, [PID, BASE_URL, BASE_PUBLIC_ID, rows[0].nameAr]);
  });

  test.afterAll(async () => {
    // Cleanup staging test artifacts only.
    try {
      const imgs = PID ? await imagesOf(PID) : [];
      for (const img of imgs) {
        if (img.publicId && img.publicId !== BASE_PUBLIC_ID) {
          try { await cloudinary.uploader.destroy(img.publicId, { resource_type: "image" }); } catch {}
        }
      }
      if (BASE_PUBLIC_ID) {
        try { await cloudinary.uploader.destroy(BASE_PUBLIC_ID, { resource_type: "image" }); } catch {}
      }
      if (PID) await q(`delete from "ProductImage" where "productId"=$1`, [PID]);
    } finally {
      await pool.end();
    }
  });

  test("failed upload keeps old · successful upload does not disturb old · public reflects primary · delete cleans Cloudinary (no orphan)", async ({ page }) => {
    test.setTimeout(240_000);
    acceptDialogs(page);
    fs.writeFileSync(INVALID, "this is definitely not an image");
    const lat: Record<string, number> = {};
    await login(page);

    // ---- BASELINE: exactly the staging baseline image, primary, reachable ----
    let imgs = await imagesOf(PID);
    expect(imgs.length, "baseline: product has exactly its staging baseline image").toBe(1);
    const baseline = imgs[0];
    expect(baseline.publicId).toBe(BASE_PUBLIC_ID);
    expect(baseline.isPrimary).toBe(true);
    expect(await headOk(baseline.url), "baseline image reachable").toBe(true);

    await page.goto(`/admin/products/${PID}`);

    // ---- (1) UPLOAD FAILURE: invalid file rejected; old image must remain untouched ----
    let s = Date.now();
    await page.locator('input[type="file"][name="file"]').setInputFiles(INVALID);
    // client-side or server-side validation should reject and not allow successful upload
    const errFlash = page.locator(".admin-flash.err").first();
    await expect(errFlash).toBeVisible({ timeout: 15_000 });
    imgs = await imagesOf(PID);
    expect(imgs.length, "failed upload added/removed nothing").toBe(1);
    expect(imgs[0].publicId, "baseline still only image after failed upload").toBe(BASE_PUBLIC_ID);
    expect(await headOk(baseline.url), "baseline still reachable after failed upload").toBe(true);
    lat.failedUpload = Date.now() - s;

    // ---- (2) SUCCESSFUL UPLOAD: new saved; old must NOT be deleted on upload ----
    s = Date.now();
    await page.locator('input[type="file"][name="file"]').setInputFiles(IMG.productA);
    await page.locator('button:has-text("رفع صورة")').click();
    await expect(page.locator("text=تم رفع الصورة بنجاح")).toBeVisible({ timeout: 40_000 });
    await page.reload();
    imgs = await imagesOf(PID);
    expect(imgs.length, "new image added alongside old").toBe(2);
    const baseStill = imgs.find((i) => i.publicId === BASE_PUBLIC_ID)!;
    const newImg = imgs.find((i) => i.publicId !== BASE_PUBLIC_ID)!;
    expect(newImg, "new test image present").toBeTruthy();
    expect(baseStill.isPrimary, "baseline stays primary after new upload").toBe(true);
    expect(newImg.isPrimary, "new image is secondary").toBe(false);
    expect(await headOk(newImg.url), "new image reachable").toBe(true);
    lat.upload = Date.now() - s;
    const newSeg = seg(newImg.publicId!);

    // ---- (3) REPLACE IN PUBLIC MENU: make new image primary -> public shows new, not baseline ----
    s = Date.now();
    await page.locator('button:has-text("تعيين كأساسية")').click();
    await expect.poll(async () => (await imagesOf(PID)).find((i) => i.publicId === newImg.publicId)?.isPrimary, { timeout: 20_000 }).toBe(true);
    await page.reload();
    let arHtml = await (await page.request.get("/ar")).text();
    expect(arHtml, "public menu reflects NEW primary").toContain(newSeg);
    expect(arHtml, "public menu no longer renders baseline image").not.toContain(BASE_SEG);
    lat.replaceToPublic = Date.now() - s;

    // ---- (4) REVERT primary to baseline ----
    await page.locator('button:has-text("تعيين كأساسية")').click();
    await expect.poll(async () => (await imagesOf(PID)).find((i) => i.publicId === BASE_PUBLIC_ID)?.isPrimary, { timeout: 20_000 }).toBe(true);
    await page.reload();
    arHtml = await (await page.request.get("/ar")).text();
    expect(arHtml, "public menu reflects baseline primary again").toContain(BASE_SEG);
    expect(arHtml, "public menu no longer renders new image").not.toContain(newSeg);

    // ---- (5) DELETE new test image -> Cloudinary asset destroyed; baseline preserved ----
    s = Date.now();
    await page.locator('button:has-text("تعيين كأساسية")').locator('xpath=following-sibling::button').click();
    await expect.poll(async () => (await imagesOf(PID)).length, { timeout: 20_000 }).toBe(1);
    const remaining = await imagesOf(PID);
    expect(remaining[0].publicId, "only baseline remains").toBe(BASE_PUBLIC_ID);
    expect(remaining[0].isPrimary, "baseline primary").toBe(true);
    expect(await headOk(baseline.url), "baseline asset still reachable").toBe(true);
    await expect.poll(async () => cldAssetExists(newImg.publicId!), { timeout: 20_000 }).toBe(false);
    lat.delete = Date.now() - s;

    arHtml = await (await page.request.get("/ar")).text();
    expect(arHtml).toContain(BASE_SEG);
    await shot(page, "imglifecycle-final");
    fs.writeFileSync(path.join(EVIDENCE_DIR, "latency-img-lifecycle.json"), JSON.stringify(lat, null, 2));
  });
});
