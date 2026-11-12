import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import pg from "pg";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const rows = await q(`
  select c."nameAr" as cat, p."nameAr" as prod
  from "Product" p
  join "Section" s on s.id = p."sectionId"
  join "Category" c on c.id = s."categoryId"
  where not exists (select 1 from "ProductImage" i where i."productId" = p.id)
  order by c."sortOrder", p."sortOrder", p."nameAr"`);

const byCat = new Map();
for (const r of rows) {
  if (!byCat.has(r.cat)) byCat.set(r.cat, []);
  byCat.get(r.cat).push(r.prod);
}
let out = `# Products Still Without Images (need dedicated photography)\n\nTotal: ${rows.length} of 151 products across ${byCat.size} categories.\n\n`;
for (const [cat, items] of byCat) {
  out += `\n## ${cat} (${items.length})\n`;
  for (const it of items) out += `- ${it}\n`;
}
fs.writeFileSync(path.resolve(process.cwd(), "pdf-images", "PRODUCTS_NEEDING_PHOTOS.md"), out.trimEnd() + "\n");
console.log(`Wrote ${rows.length} products across ${byCat.size} categories to pdf-images/PRODUCTS_NEEDING_PHOTOS.md`);
// also print category summary
const summary = await q(`
  select c."nameAr" cat,
    count(*) total,
    count(*) filter (where exists (select 1 from "ProductImage" i where i."productId"=p.id)) with_img
  from "Product" p join "Section" s on s.id=p."sectionId" join "Category" c on c.id=s."categoryId"
  group by c."nameAr", c."sortOrder" order by c."sortOrder"`);
console.log("CATEGORY SUMMARY (name | with_img/total):");
for (const s of summary) console.log(`  ${s.cat}: ${s.with_img}/${s.total}`);
await pool.end();
