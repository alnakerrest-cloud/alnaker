import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const rows = await q(`
  select c.slug, c."nameAr" as name, c.icon, c.group, c.layout,
    (c."imageUrl" is not null) as cat_img,
    c."sortOrder",
    count(distinct s.id) as sections,
    count(p.id) as products,
    count(distinct case when pi.id is not null then p.id end) as with_image,
    count(distinct case when p.badge is not null then p.id end) as with_badge,
    count(distinct case when array_length(p."ingredientsAr",1) > 0 then p.id end) as with_parts
  from "Category" c
  left join "Section" s on s."categoryId" = c.id
  left join "Product" p on p."sectionId" = s.id and p."isVisible" = true and p."isAvailable" = true
  left join "ProductImage" pi on pi."productId" = p.id
  where c."isVisible" = true
  group by c.id
  order by c.group, c."sortOrder"`);

console.log("slug | name | icon | group | layout | catImg | sections | products | withImg | badge | parts");
for (const r of rows) {
  console.log([r.slug, r.name, r.icon, r.group, r.layout, r.cat_img ? "Y" : "-", r.sections, r.products, r.with_image, r.with_badge, r.with_parts].join(" | "));
}
console.log("TOTAL categories:", rows.length, "products:", rows.reduce((n,r)=>n+Number(r.products),0), "withImage:", rows.reduce((n,r)=>n+Number(r.with_image),0));
await pool.end();
