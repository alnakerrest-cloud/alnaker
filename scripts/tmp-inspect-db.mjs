// Read-only DB baseline + image-coverage inspection (PART A). Mutates nothing.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import pg from "pg";
import * as fs from "node:fs";
import * as path from "node:path";

const d = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true, channelBinding: "require" });
await d.connect();

const OUT = path.resolve("pdf-images");
fs.mkdirSync(OUT, { recursive: true });

try {
  const c = (await d.query(`select
    (select count(*) from "Category")::int cats,
    (select count(*) from "Section")::int secs,
    (select count(*) from "Product")::int prods,
    (select count(*) from "ProductVariant")::int vars,
    (select count(*) from "ProductImage")::int imgs,
    (select count(*) from "Branch")::int br,
    (select count(*) from "RestaurantSettings")::int rs,
    (select (count(distinct "productId"))::int from "ProductImage")::int prods_with_img`)).rows[0];
  console.log("BASELINE " + JSON.stringify(c));
  console.log("products WITHOUT image: " + (c.prods - c.prods_with_img));

  const cats = (await d.query(`select slug, "nameAr", "group", layout, "sortOrder",
    ("imageUrl" is not null) as has_img, "imageUrl"
    from "Category" order by "sortOrder" asc`)).rows;
  console.log("\n=== CATEGORIES (" + cats.length + ") ===");
  for (const k of cats) console.log(`  [${k.group}/${k.layout}] ${k.slug} — ${k.nameAr} | img=${k.has_img ? "YES" : "no"}`);

  const imgs = (await d.query(`select pi."productId", p."nameAr", pi.url, pi."publicId", pi."isPrimary", pi."sortOrder"
    from "ProductImage" pi join "Product" p on p.id = pi."productId"
    order by pi."productId", pi."sortOrder"`)).rows;
  console.log("\n=== EXISTING ProductImage rows: " + imgs.length + " ===");
  for (const im of imgs.slice(0, 60)) console.log(`  ${im.nameAr} | primary=${im.isPrimary} | pub=${im.publicId}`);

  // Full product inventory grouped for the image-mapping (PART B).
  const prods = (await d.query(`
    select ct.slug as cat, ct."nameAr" as cat_ar, ct."group" as cat_group, ct.layout as cat_layout, s."titleAr" as sec_ar, p."nameAr" as prod_ar,
      p.id as pid, coalesce(min(v.price), 0)::text as price,
      (exists(select 1 from "ProductImage" x where x."productId" = p.id)) as has_img
    from "Product" p
    join "Section" s on s.id = p."sectionId"
    join "Category" ct on ct.id = s."categoryId"
    left join "ProductVariant" v on v."productId" = p.id
    group by ct.slug, ct."nameAr", ct."group", ct.layout, ct."sortOrder", s."sortOrder", p."sortOrder", s."titleAr", p."nameAr", p.id
    order by ct."sortOrder" asc, s."sortOrder" asc, p."sortOrder" asc`)).rows;
  fs.writeFileSync(path.join(OUT, "products.json"), JSON.stringify(prods, null, 2), "utf8");
  const missing = prods.filter((p) => !p.has_img).length;
  console.log("\nTOTAL products listed: " + prods.length + " | missing image: " + missing);
  console.log("Wrote " + path.join(OUT, "products.json"));

  // Distinct category names + section titles to guide image→category matching.
  const byCat = {};
  for (const p of prods) (byCat[p.cat_ar] ??= []).push(p.prod_ar);
  fs.writeFileSync(path.join(OUT, "by-category.json"), JSON.stringify(byCat, null, 2), "utf8");
} finally {
  await d.end();
}
