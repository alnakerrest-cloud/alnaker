import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const cov = await q(`select
  (select count(*) from "Product") total_products,
  (select count(distinct "productId") from "ProductImage") products_with_image,
  (select count(*) from "Product" p where not exists (select 1 from "ProductImage" i where i."productId"=p.id)) products_without_image,
  (select count(*) from "Category") total_categories,
  (select count(*) from "Category" where "imageUrl" is not null) categories_with_image`);
console.log("COVERAGE:", JSON.stringify(cov[0]));

// The 14 pdf-derived product images with their product names + category
const imgs = await q(`select p."nameAr", c."nameAr" as cat, i."publicId"
  from "ProductImage" i join "Product" p on p.id=i."productId"
  join "Section" s on s.id=p."sectionId" join "Category" c on c.id=s."categoryId"
  where i."publicId" like '%/pdf-%' order by c."nameAr", p."nameAr"`);
console.log("PDF PRODUCT IMAGES:");
for (const r of imgs) console.log("  -", r.cat, "|", r.nameAr, "|", r.publicId);
const catimg = await q(`select "nameAr","imagePublicId" from "Category" where "imagePublicId" like '%/pdf-%'`);
console.log("PDF CATEGORY IMAGES:", JSON.stringify(catimg));
await pool.end();
