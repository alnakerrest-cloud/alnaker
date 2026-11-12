import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const counts = await q(`select
  (select count(*) from "Product") products,
  (select count(*) from "Category") categories,
  (select count(*) from "ProductVariant") variants,
  (select count(*) from "ProductImage") product_images,
  (select count(*) from "Category" where "imageUrl" is not null) cat_with_image,
  (select count(*) from "Branch") branches,
  (select count(*) from "Product" where "nameAr" like 'ZZ%') zz_products,
  (select count(*) from "Category" where "nameAr" like 'ZZ%') zz_categories,
  (select count(*) from "Branch" where "nameAr" like 'ZZ%') zz_branches`);
console.log("COUNTS:", JSON.stringify(counts[0]));

// Any non-pdf image refs would indicate a leaked test upload.
const strayProd = await q(`select "publicId","productId" from "ProductImage" where "publicId" is null or "publicId" not like '%/pdf-%'`);
console.log("STRAY product images (non pdf-):", JSON.stringify(strayProd));
const strayCat = await q(`select slug,"imagePublicId" from "Category" where "imagePublicId" is not null and "imagePublicId" not like '%/pdf-%'`);
console.log("STRAY category images (non pdf-):", JSON.stringify(strayCat));

// Sessions from test logins (cleanup sanity, informational only)
const sess = await q(`select count(*) from "Session"`);
console.log("sessions:", sess[0].count);
await pool.end();
