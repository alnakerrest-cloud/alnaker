// Phase 1 verification: compares Neon contents against data/menu.ts and writes IMPORT_REPORT.md.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import pg from "pg";
import { writeFileSync } from "node:fs";
import { menu } from "../data/menu.ts";

const parsePrice = (v) => {
  if (typeof v === "number") return { price: v, maxPrice: null };
  const m = String(v).match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (m) return { price: Number(m[1]), maxPrice: Number(m[2]) };
  return { price: Number(String(v).trim()), maxPrice: null };
};
const src = { cats: menu.length, secs: 0, prods: 0, vars: 0, priceSum: 0, maxSum: 0, ing: 0, badges: 0, perCat: [] };
for (const c of menu) {
  let n = 0;
  for (const s of c.sections) { src.secs++; for (const it of s.items) { src.prods++; n++; src.ing += it.parts?.length ?? 0; if (it.badge) src.badges++; for (const p of it.prices) { const { price, maxPrice } = parsePrice(p.value); src.vars++; src.priceSum += price; src.maxSum += maxPrice ?? 0; } } }
  src.perCat.push([c.name.ar, n]);
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true, channelBinding: "require" });
await db.connect();
try {
  const agg = await db.query(`select
    (select count(*) from "Category")::int cats,
    (select count(*) from "Section")::int secs,
    (select count(*) from "Product")::int prods,
    (select count(*) from "ProductVariant")::int vars,
    (select coalesce(sum(price),0)::float from "ProductVariant") "priceSum",
    (select coalesce(sum("maxPrice"),0)::float from "ProductVariant") "maxSum",
    (select coalesce(sum(array_length("ingredientsAr",1)),0)::int from "Product") ing,
    (select count(*)::int from "Product" where badge is not null) badges`);
  const perCatDb = await db.query(`select c."nameAr", count(p.id)::int n from "Category" c
    join "Section" s on s."categoryId"=c.id join "Product" p on p."sectionId"=s.id
    group by c."nameAr", c."sortOrder" order by c."sortOrder"`);
  const spot = await db.query(`select p."nameAr", v."labelAr", v.price::text, v."maxPrice"::text
    from "Product" p join "ProductVariant" v on v."productId"=p.id
    where p."nameAr" in ('صينية الوحوش','كباب (ضاني أو بتلو)','كنافة نابلسية','دقوس') order by p."nameAr", v."sortOrder"`);
  const reviews = await db.query(`select message from "ImportItem" where kind='review' order by "ref"`);

  const d = agg.rows[0];
  const checks = [
    ["Categories", src.cats, d.cats], ["Sections", src.secs, d.secs], ["Products", src.prods, d.prods],
    ["Variants (price pills)", src.vars, d.vars], ["Price sum (EGP)", src.priceSum, d.priceSum],
    ["Range maxPrice sum", src.maxSum, d.maxSum], ["Tray ingredient chips", src.ing, d.ing], ["Badged products", src.badges, d.badges],
  ];
  let allOk = true;
  let report = "# Naqer Menu — Phase 1 Import Integrity Report\n\nSource: `data/menu.ts` -> Neon `neondb` (public schema)\n\n| Metric | Source | Database | Match |\n|---|---|---|---|\n";
  for (const [name, a, b] of checks) { const ok = a === b; allOk = allOk && ok; report += `| ${name} | ${a} | ${b} | ${ok ? "✅" : "❌"} |\n`; }
  report += "\n## Per-category product counts\n\n| Category | Source | DB | Match |\n|---|---|---|---|\n";
  const m = new Map(perCatDb.rows.map((r) => [r.nameAr, r.n]));
  for (const [name, n] of src.perCat) { const b = m.get(name) ?? 0; const ok = n === b; allOk = allOk && ok; report += `| ${name} | ${n} | ${b} | ${ok ? "✅" : "❌"} |\n`; }
  report += "\n## Spot checks (exact rows)\n\n";
  for (const r of spot.rows) report += `- ${r.nameAr}${r.labelAr ? " [" + r.labelAr + "]" : ""} = ${r.price}${r.maxPrice ? " – " + r.maxPrice : ""} EGP\n`;
  report += "\n## Manual-review entries (preserved in ImportItem, nothing invented)\n\n";
  for (const r of reviews.rows) report += `- ⚠️ ${r.message}\n`;
  writeFileSync("IMPORT_REPORT.md", report, "utf8");

  await db.query(`update "ImportJob" set status='SUCCESS', processed=$1, "finishedAt"=now() where status='RUNNING'`, [src.prods]);
  console.log("VERIFY " + (allOk ? "OK — all integrity checks passed" : "MISMATCH DETECTED") + ` | cats=${d.cats} secs=${d.secs} prods=${d.prods} vars=${d.vars} priceSum=${d.priceSum} ing=${d.ing} badges=${d.badges}`);
} finally {
  await db.end();
}