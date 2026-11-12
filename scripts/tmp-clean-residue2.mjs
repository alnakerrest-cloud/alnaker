import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
import { v2 as cloudinary } from "cloudinary";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
const destroy = async (pid) => {
  if (!pid || pid.startsWith("naqer-menu/products/pdf-") || pid.startsWith("naqer-menu/categories/pdf-")) {
    console.log("  SKIP (pdf-derived, protected):", pid);
    return;
  }
  const r = await cloudinary.uploader.destroy(pid, { resource_type: "image" }).catch((e) => ({ err: String(e) }));
  console.log("  destroyed:", pid, JSON.stringify(r));
};

// ZZ products: destroy their images, then cascade rows.
for (const p of await q(`select id from "Product" where "nameAr" like 'ZZ%'`)) {
  for (const i of await q(`select "publicId" from "ProductImage" where "productId"=$1`, [p.id])) await destroy(i.publicId);
  await pool.query(`delete from "ProductImage" where "productId"=$1`, [p.id]);
  await pool.query(`delete from "ProductVariant" where "productId"=$1`, [p.id]);
  await pool.query(`delete from "Product" where id=$1`, [p.id]);
  console.log("deleted ZZ product", p.id);
}
// ZZ categories: destroy their test image, then sections + category.
for (const c of await q(`select id,"imagePublicId" from "Category" where "nameAr" like 'ZZ%'`)) {
  await destroy(c.imagePublicId);
  await pool.query(`delete from "Section" where "categoryId"=$1`, [c.id]);
  await pool.query(`delete from "Category" where id=$1`, [c.id]);
  console.log("deleted ZZ category", c.id);
}
// ZZ branches.
for (const b of await q(`select id from "Branch" where "nameAr" like 'ZZ%'`)) {
  await pool.query(`delete from "Branch" where id=$1`, [b.id]);
  console.log("deleted ZZ branch", b.id);
}

const after = await q(`select
  (select count(*) from "Product" where "nameAr" like 'ZZ%') p,
  (select count(*) from "Category" where "nameAr" like 'ZZ%') c,
  (select count(*) from "Branch" where "nameAr" like 'ZZ%') b,
  (select count(*) from "Product") products,
  (select count(*) from "Category") categories,
  (select count(*) from "ProductImage") images,
  (select count(*) from "ProductImage" where "publicId" like '%pdf-') pdf_images`);
console.log("AFTER:", JSON.stringify(after[0]));
await pool.end();
