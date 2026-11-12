import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const rows = await pool.query(`select
  (select count(*) from "Product") as products,
  (select count(*) from "Category") as categories,
  (select count(*) from "ProductVariant") as variants,
  (select count(*) from "ProductImage") as product_images,
  (select count(*) from "Category" where "imageUrl" is not null) as cat_with_image,
  (select count(*) from "Branch") as branches,
  (select count(*) from "Product" where "nameAr" like 'ZZ%') as zz_products,
  (select count(*) from "Category" where "nameAr" like 'ZZ%') as zz_categories,
  (select count(*) from "Branch" where "nameAr" like 'ZZ%') as zz_branches`);
console.log(JSON.stringify(rows.rows[0], null, 2));
await pool.end();
