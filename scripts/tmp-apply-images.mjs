// PART B Step 4 — upload approved HIGH-confidence PDF images to Cloudinary and
// store references in the existing DB fields. Server-side only (secrets from env).
// Uses the SAME folder prefixes as lib/cloudinary.ts (naqer-menu/products|categories)
// but adds STABLE public_ids (pdf-*) for idempotency + traceability.
// SAFETY: never overwrites a product that already has a non-PDF image; skips rows
// already applied (idempotent). DRY_RUN=1 previews without uploading/writing.
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { v2 as cloudinary } from "cloudinary";

dotenv.config({ path: path.resolve(".env.local") });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
const DRY = process.env.DRY_RUN === "1";

const PREFIX = { products: "naqer-menu/products", categories: "naqer-menu/categories" };
const map = JSON.parse(fs.readFileSync(path.resolve("pdf-images", "mapping.json"), "utf8"));
const UP = path.resolve("pdf-images", "upload");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true });
await client.connect();

async function productHasRealImage(pid) {
  const r = await client.query(`select "publicId" from "ProductImage" where "productId"=$1`, [pid]);
  // "real" = any existing image whose publicId is NOT one of our pdf- keys
  return r.rows.some((x) => x.publicId && !String(x.publicId).includes("/pdf-"));
}
async function alreadyApplied(publicId) {
  const r = await client.query(`select 1 from "ProductImage" where "publicId"=$1 limit 1`, [publicId]);
  return r.rowCount > 0;
}

const results = [];
async function applyOne(item, bucket) {
  const publicId = `${PREFIX[bucket]}/${item.key}`;
  const file = path.join(UP, `${item.key}.jpg`);
  if (!fs.existsSync(file)) { results.push({ key: item.key, status: "MISSING_FILE" }); return; }
  if (bucket === "products" && await productHasRealImage(item.pid)) {
    results.push({ key: item.key, name: item.name, status: "SKIP_HAS_REAL_IMAGE" }); return;
  }
  if (await alreadyApplied(publicId)) { results.push({ key: item.key, status: "SKIP_ALREADY_APPLIED" }); return; }
  if (DRY) { results.push({ key: item.key, name: item.name, status: "DRY_WOULD_APPLY" }); return; }

  const res = await cloudinary.uploader.upload(file, { public_id: publicId, resource_type: "image", overwrite: true });
  if (bucket === "products") {
    await client.query(
      `insert into "ProductImage" ("id","productId","url","publicId","altAr","isPrimary","sortOrder") values ($1,$2,$3,$4,$5,true,0)`,
      [crypto.randomUUID(), item.pid, res.secure_url, res.public_id, item.name],
    );
  } else {
    await client.query(`update "Category" set "imageUrl"=$1,"imagePublicId"=$2 where "slug"=$3`, [res.secure_url, res.public_id, item.slug]);
  }
  results.push({ key: item.key, name: item.name, status: "APPLIED", url: res.secure_url, publicId: res.public_id, w: res.width, h: res.height });
  console.log(`  APPLIED ${item.key} -> ${res.public_id}`);
}

for (const p of map.products) await applyOne(p, "products");
for (const c of map.categories.filter((x) => x.apply)) await applyOne(c, "categories");

// verification snapshot
const v = await client.query(`select count(*)::int as n from "ProductImage" where "publicId" like '%/pdf-%'`);
const vc = await client.query(`select count(*)::int as n from "Category" where "imagePublicId" like '%/pdf-%'`);
console.log("\nDB pdf-derived product images:", v.rows[0].n, "| category images:", vc.rows[0].n);
fs.writeFileSync(path.resolve("pdf-images", "applied-report.json"), JSON.stringify({ dry: DRY, results, verify: { productImages: v.rows[0].n, categoryImages: vc.rows[0].n } }, null, 2), "utf8");
await client.end();
console.log(DRY ? "DRY RUN complete (no uploads/writes)." : "APPLY complete.");
