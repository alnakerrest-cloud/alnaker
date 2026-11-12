import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

// Only ZZ-prefixed TEST records. Never touch real menu or pdf-derived images.
const zzProducts = await q(`select id from "Product" where "nameAr" like 'ZZ%'`);
for (const p of zzProducts) {
  const imgs = await q(`select "publicId" from "ProductImage" where "productId"=$1`, [p.id]);
  console.log("product", p.id, "images:", imgs.map((i) => i.publicId));
  await pool.query(`delete from "ProductImage" where "productId"=$1`, [p.id]);
  await pool.query(`delete from "ProductVariant" where "productId"=$1`, [p.id]);
  await pool.query(`delete from "Product" where id=$1`, [p.id]);
}
const zzCats = await q(`select id from "Category" where "nameAr" like 'ZZ%'`);
for (const c of zzCats) {
  // These test categories have no image (failed before image step). Guard anyway: refuse if pdf- image.
  const cat = await q(`select "imagePublicId" from "Category" where id=$1`, [c.id]);
  console.log("category", c.id, "imagePublicId:", cat[0]?.imagePublicId);
  await pool.query(`delete from "Section" where "categoryId"=$1`, [c.id]);
  await pool.query(`delete from "Category" where id=$1`, [c.id]);
}
const zzBranches = await q(`select id from "Branch" where "nameAr" like 'ZZ%'`);
for (const b of zzBranches) await pool.query(`delete from "Branch" where id=$1`, [b.id]);

const after = await q(`select
  (select count(*) from "Product" where "nameAr" like 'ZZ%') p,
  (select count(*) from "Category" where "nameAr" like 'ZZ%') c,
  (select count(*) from "Branch" where "nameAr" like 'ZZ%') b`);
console.log("remaining ZZ:", JSON.stringify(after[0]));
await pool.end();
