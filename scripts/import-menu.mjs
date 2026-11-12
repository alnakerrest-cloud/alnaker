// Phase 1 one-shot importer: data/menu.ts -> Neon PostgreSQL.
// Uses the already-installed `pg` driver (no extra deps). Non-destructive:
// aborts if Category table already has rows (unless --force). Public menu untouched.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import pg from "pg";
import { writeFileSync } from "node:fs";
import { menu } from "../data/menu.ts";
import { branches, PHONE_DISPLAY, PHONE_INTL } from "../lib/site.ts";
import { ui } from "../lib/i18n.ts";

const badgeOf = (b) => (!b ? null : b.en === "Offer" ? "OFFER" : b.en === "Signature" ? "SIGNATURE" : null);
const parsePrice = (v) => {
  if (typeof v === "number") return { price: v, maxPrice: null };
  const m = String(v).match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (m) return { price: Number(m[1]), maxPrice: Number(m[2]) };
  const n = Number(String(v).trim());
  if (!Number.isFinite(n)) throw new Error("Unparseable price: " + JSON.stringify(v));
  return { price: n, maxPrice: null };
};

// source-side aggregates (for the comparison report)
const src = { cats: menu.length, secs: 0, prods: 0, vars: 0, priceSum: 0, maxSum: 0, ing: 0, badges: 0, perCat: [] };
for (const c of menu) {
  let n = 0;
  for (const s of c.sections) {
    src.secs++;
    for (const it of s.items) {
      src.prods++; n++;
      src.ing += it.parts?.length ?? 0;
      if (it.badge) src.badges++;
      for (const p of it.prices) { const { price, maxPrice } = parsePrice(p.value); src.vars++; src.priceSum += price; src.maxSum += maxPrice ?? 0; }
    }
  }
  src.perCat.push([c.name.ar, n]);
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true, channelBinding: "require" });
await db.connect();
const pre = await db.query('select count(*)::int as n from "Category"');
if (pre.rows[0].n > 0 && !process.argv.includes("--force")) {
  console.error("ABORT: Category already has " + pre.rows[0].n + " rows (no destructive reset performed).");
  process.exit(1);
}

const items = [];
const job = await db.query("insert into \"ImportJob\" (id, source, status, \"startedAt\", \"totalItems\") values (gen_random_uuid(), 'data/menu.ts', 'RUNNING', now(), $1) returning id", [src.prods]);
const jobId = job.rows[0].id;

await db.query("begin");
try {
  for (const [ci, c] of menu.entries()) {
    const cat = await db.query(
      `insert into "Category" (id, slug, "nameAr", icon, "group", layout, "noteAr", "sortOrder", "updatedAt")
       values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now()) returning id`,
      [c.id, c.name.ar, c.icon, c.group === "food" ? "FOOD" : "DRINKS", c.layout === "trays" ? "TRAYS" : "LIST", c.note?.ar ?? null, ci]);
    for (const [si, s] of c.sections.entries()) {
      const sec = await db.query(
        `insert into "Section" (id, "categoryId", "titleAr", "sortOrder", "updatedAt") values (gen_random_uuid(), $1, $2, $3, now()) returning id`,
        [cat.rows[0].id, s.title?.ar ?? null, si]);
      for (const [ii, it] of s.items.entries()) {
        const prod = await db.query(
          `insert into "Product" (id, "sectionId", "nameAr", "descAr", badge, "ingredientsAr", "isFeatured", "sortOrder", "updatedAt")
           values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now()) returning id`,
          [sec.rows[0].id, it.name.ar, it.desc?.ar ?? null, badgeOf(it.badge),
           (it.parts ?? []).map((p) => p.ar), it.badge?.en === "Signature", ii]);
        for (const [pi, p] of it.prices.entries()) {
          const { price, maxPrice } = parsePrice(p.value);
          await db.query(
            `insert into "ProductVariant" (id, "productId", "labelAr", price, "maxPrice", "sortOrder")
             values (gen_random_uuid(), $1, $2, $3, $4, $5)`,
            [prod.rows[0].id, p.label?.ar ?? null, price, maxPrice, pi]);
        }
        items.push(["product", c.name.ar + " > " + (s.title?.ar ?? "-") + " > " + it.name.ar, "OK", null]);
      }
    }
  }

  await db.query(
    `insert into "RestaurantSettings" (id, "brandNameAr", "taglineAr", "phoneDisplay", "phoneIntl", "vatNoteAr", "serviceNoteAr", "serviceChargePct", "currencyAr", "updatedAt")
     values ('default', $1, $2, $3, $4, $5, $6, 12, $7, now())`,
    [ui.ar.brand, ui.ar.tagline, PHONE_DISPLAY, PHONE_INTL, ui.ar.vat, ui.ar.service, ui.ar.currency]);
  for (const [bi, b] of branches.entries()) {
    await db.query(
      `insert into "Branch" (id, "nameAr", "addressAr", "cityAr", "mapQuery", "sortOrder", "updatedAt")
       values (gen_random_uuid(), $1, $2, $3, $4, $5, now())`,
      [b.name.ar, b.address.ar, b.city.ar, b.mapQuery, bi]);
  }

  const REVIEWS = [
    "ريد بانانا (٨٠ ج.م) موجود في data/menu.ts لكنه لم يعثر عليه بوضوح في PDF — مراجعة بشرية",
    "اسم الكنافة في PDF غير واضح مقابل 'كنافة نابلسية' في التطبيق — هاجر اسم التطبيق",
    "PDF: 'ميكي تارت' مقابل التطبيق: 'ميني تارت' — هاجر اسم التطبيق",
    "PDF: 'بيز جولد' مقابل التطبيق: 'بريز جولد' — هاجر اسم التطبيق",
    "PDF: شوربة كريمة '(شورب او فراخ)' مقابل التطبيق 'مشروم أو فراخ' — هاجر وصف التطبيق",
    "الترجمات الإنجليزية لم تهاجر عمدا (قرار معتمد: عربي فقط)",
  ];
  for (const r of REVIEWS) items.push(["review", "50500.pdf", "SKIPPED", r]);

  for (const [kind, ref, status, message] of items) {
    await db.query("insert into \"ImportItem\" (id, \"jobId\", kind, \"ref\", status, message) values (gen_random_uuid(), $1, $2, $3, $4, $5)",
      [jobId, kind, ref, status, message]);
  }
  await db.query(
    `insert into "AuditLog" (id, action, "entityType", summary, changes)
     values (gen_random_uuid(), 'import', 'Menu', 'استيراد أولي من data/menu.ts', $1::jsonb)`,
    [JSON.stringify({ src })]);
  await db.query("commit");
} catch (e) {
  await db.query("rollback");
  await db.query("update \"ImportJob\" set status='FAILED', error=$1, \"finishedAt\"=now() where id=$2", [String(e.message ?? e), jobId]);
  console.error("IMPORT FAILED (rolled back):", e.message);
  process.exit(1);
}

const agg = await db.query(`select
  (select count(*) from "Category")::int        as cats,
  (select count(*) from "Section")::int         as secs,
  (select count(*) from "Product")::int         as prods,
  (select count(*) from "ProductVariant")::int  as vars,
  (select coalesce(sum(price),0)::float from "ProductVariant")     as "priceSum",
  (select coalesce(sum("maxPrice"),0)::float from "ProductVariant") as "maxSum",
  (select coalesce(sum(array_length("ingredientsAr",1)),0)::int from "Product") as ing,
  (select count(*)::int from "Product" where badge is not null)    as badges`);
const perCatDb = await db.query(`select c."nameAr", count(p.id)::int as n from "Category" c
  join "Section" s on s."categoryId"=c.id join "Product" p on p."sectionId"=s.id
  group by c."nameAr", c."sortOrder" order by c."sortOrder"`);
const spot = await db.query(`select p."nameAr", v."labelAr", v.price::text, v."maxPrice"::text
  from "Product" p join "ProductVariant" v on v."productId"=p.id
  where p."nameAr" in ('صينية الوحوش','كباب (ضاني أو بتلو)','كنافة نابلسية','دقوس') order by p."nameAr", v."sortOrder"`);

const d = agg.rows[0];
const checks = [
  ["Categories", src.cats, d.cats], ["Sections", src.secs, d.secs], ["Products", src.prods, d.prods],
  ["Variants (price pills)", src.vars, d.vars], ["Price sum (EGP)", src.priceSum, d.priceSum],
  ["Range maxPrice sum", src.maxSum, d.maxSum], ["Tray ingredient chips", src.ing, d.ing], ["Badged products", src.badges, d.badges],
];
let report = "# Naqer Menu — Phase 1 Import Integrity Report\n\nSource: `data/menu.ts` -> Neon `neondb` (public schema)\n\n| Metric | Source | Database | Match |\n|---|---|---|---|\n";
let allOk = true;
for (const [name, a, b] of checks) { const ok = a === b; allOk = allOk && ok; report += `| ${name} | ${a} | ${b} | ${ok ? "✅" : "❌"} |\n`; }
report += "\n## Per-category product counts\n\n| Category | Source | DB | Match |\n|---|---|---|---|\n";
const dbMap = new Map(perCatDb.rows.map((r) => [r.nameAr, r.n]));
for (const [name, n] of src.perCat) { const b = dbMap.get(name) ?? 0; const ok = n === b; allOk = allOk && ok; report += `| ${name} | ${n} | ${b} | ${ok ? "✅" : "❌"} |\n`; }
report += "\n## Spot checks (exact rows)\n\n";
for (const r of spot.rows) report += `- ${r.nameAr}${r.labelAr ? " [" + r.labelAr + "]" : ""} = ${r.price}${r.maxPrice ? " – " + r.maxPrice : ""} EGP\n`;
report += "\n## Manual-review entries (preserved, not invented)\n\n";
for (const r of REVIEWS) report += `- ⚠️ ${r}\n`;
writeFileSync("IMPORT_REPORT.md", report, "utf8");

await db.query("update \"ImportJob\" set status='SUCCESS', processed=$1, \"finishedAt\"=now() where id=$2", [src.prods, jobId]);
console.log("IMPORT " + (allOk ? "OK — all integrity checks passed" : "MISMATCH DETECTED") +
  ` | cats=${d.cats} secs=${d.secs} prods=${d.prods} vars=${d.vars} priceSum=${d.priceSum}`);
await db.end();