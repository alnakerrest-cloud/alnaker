import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
import { v2 as cloudinary } from "cloudinary";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const PID = "8cd30623-2fcf-4ef5-bc59-fff32b7315e0"; // صينية مشاوي
const PDF_PUBLIC_ID = "naqer-menu/products/pdf-tray-mashawi";

const before = await q(`select id,url,"publicId","isPrimary" from "ProductImage" where "productId"=$1`, [PID]);
console.log("BEFORE:", JSON.stringify(before, null, 2));

// Remove any non-pdf test images left by an aborted run: destroy Cloudinary asset, then DB row.
for (const img of before) {
  if (img.publicId === PDF_PUBLIC_ID) continue;
  try {
    const res = await cloudinary.uploader.destroy(img.publicId);
    console.log("destroyed Cloudinary", img.publicId, "->", res.result);
  } catch (e) {
    console.log("destroy error", img.publicId, e.message);
  }
  await pool.query(`delete from "ProductImage" where id=$1`, [img.id]);
}

// Ensure the PDF image is primary.
const pdfRow = await q(`select id from "ProductImage" where "productId"=$1 and "publicId"=$2`, [PID, PDF_PUBLIC_ID]);
if (pdfRow[0]) {
  await pool.query(`update "ProductImage" set "isPrimary"=false where "productId"=$1`, [PID]);
  await pool.query(`update "ProductImage" set "isPrimary"=true where id=$1`, [pdfRow[0].id]);
} else {
  console.log("WARNING: PDF image row missing for", PID, "— needs re-apply");
}

const after = await q(`select id,url,"publicId","isPrimary" from "ProductImage" where "productId"=$1`, [PID]);
console.log("AFTER:", JSON.stringify(after, null, 2));
const total = await q(`select count(*)::int n from "ProductImage"`);
console.log("total product_images:", total[0].n);
await pool.end();
