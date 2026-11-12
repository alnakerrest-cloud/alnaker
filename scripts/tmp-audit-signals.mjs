import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const rows = await q(`
  select c.slug, c."nameAr" as name, c.group, c.layout,
    count(p.id) as products,
    count(case when p."descAr" is not null and trim(p."descAr") <> '' then 1 end) as with_desc,
    count(case when array_length(p."ingredientsAr",1) > 0 then 1 end) as with_ing,
    count(case when p."isFeatured" then 1 end) as featured,
    count(distinct case when pi.id is not null then p.id end) as with_img,
    round(avg(v.price)) as avg_price,
    min(v.price) as min_price, max(v.price) as max_price,
    count(case when v."labelAr" is not null then 1 end) as labelled_variants
  from "Category" c
  join "Section" s on s."categoryId" = c.id
  join "Product" p on p."sectionId" = s.id and p."isVisible" = true and p."isAvailable" = true
  left join "ProductVariant" v on v."productId" = p.id
  left join "ProductImage" pi on pi."productId" = p.id
  where c."isVisible" = true
  group by c.id
  order by c.group, c."sortOrder"`);

console.log("slug | group | layout | prod | desc | ing | feat | img | avgP | minP | maxP | lblVar | name");
for (const r of rows) {
  console.log([r.slug, r.group, r.layout, r.products, r.with_desc, r.with_ing, r.featured, r.with_img, r.avg_price, r.min_price, r.max_price, r.labelled_variants, r.name].join(" | "));
}
await pool.end();
