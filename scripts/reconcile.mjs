// تسوية المصادر الثلاثة: data/menu.ts  vs  Neon  (المصدر الثالث PDF يُقارن يدويًا عبر هذا الملخص).
// قراءة فقط: لا يكتب ولا يعدّل شيئًا في القاعدة. يطبع جدولًا + يكتب PDF_RECONCILIATION.md.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import pg from "pg";
import { writeFileSync } from "node:fs";
import { menu } from "../data/menu.ts";

// ---- ملخص data/menu.ts لكل قسم ----
const src = menu.map((c) => {
  const prods = [];
  for (const s of c.sections) for (const it of s.items) {
    const prices = it.prices.map((p) => (typeof p.value === "number" ? p.value : Number(String(p.value).match(/\d+/)?.[0] ?? 0)));
    prods.push({ cat: c.name.ar, section: s.title?.ar ?? "", name: it.name.ar, min: Math.min(...prices), max: Math.max(...prices), nPrices: it.prices.length, hasDesc: !!it.desc, hasParts: !!it.parts?.length, hasBadge: !!it.badge });
  }
  return { id: c.id, name: c.name.ar, group: c.group, layout: c.layout, icon: c.icon, prods };
});

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true, channelBinding: "require" });
await db.connect();
try {
  // ---- ملخص Neon لكل قسم ----
  const dbRows = await db.query(`
    select c.id, c.slug, c."nameAr" as name, c."group" as group, c.layout, c.icon,
      count(distinct p.id)::int as prods,
      count(v.id)::int as variants,
      sum(array_length(p."ingredientsAr",1)) filter (where p."ingredientsAr" <> '{}') as ingredient_rows,
      count(p.id) filter (where p.badge is not null) as badged,
      count(p.id) filter (where p."descAr" is not null) as described,
      count(v."maxPrice") as range_prices
    from "Category" c
    left join "Section" s on s."categoryId"=c.id
    left join "Product" p on p."sectionId"=s.id
    left join "ProductVariant" v on v."productId"=p.id
    group by c.id, c.slug, c."nameAr", c."group", c.layout, c.icon
    order by c."sortOrder"`);

  const imgs = await db.query(`select count(*)::int n from "ProductImage"`);
  const dbCatByName = new Map(dbRows.rows.map((r) => [r.name, r]));

  let report = `# Naqer Menu — Reconciliation Report (PDF × data/menu.ts × Neon)\n\n`;
  report += `تاريخ: 2026-11-03 — قراءة فقط، بلا أي كتابة على القاعدة.\n\n`;
  report += `## 1) على مستوى الأقسام (data/menu.ts مقابل Neon)\n\n`;
  report += `| القسم (AR) | م.ت: منتجات | Neon: منتجات | م.ت: أسعار | Neon: variants | تطابق |\n|---|---|---|---|---|---|\n`;
  let srcTotP = 0, dbTotP = 0, mismatches = [];
  for (const c of src) {
    const d = dbCatByName.get(c.name);
    const srcP = c.prods.length;
    const srcV = c.prods.reduce((a, p) => a + p.nPrices, 0);
    const dbP = d?.prods ?? 0;
    const dbV = d?.variants ?? 0;
    srcTotP += srcP; dbTotP += dbP;
    const ok = srcP === dbP;
    if (!ok) mismatches.push(c.name);
    report += `| ${c.name} | ${srcP} | ${dbP} | ${srcV} | ${dbV} | ${ok ? "✅" : "❌"} |\n`;
    dbCatByName.delete(c.name);
  }
  report += `\n**الإجمالي:** data/menu.ts = ${srcTotP} منتج — Neon = ${dbTotP} منتج.\n`;
  if (mismatches.length) report += `\nأقسام غير متطابقة: ${mismatches.join("، ")}\n`;
  const extra = [...dbCatByName.values()].map((r) => r.name);
  if (extra.length) report += `\nأقسام في Neon غير موجودة في data/menu.ts: ${extra.join("، ")}\n`;

  report += `\n## 2) الفجوة الأهم: الصور\n\n`;
  report += `- ProductImage في Neon = **${imgs.rows[0].n}** صورة. المنيو العام يعرض أيقونة emoji فقط (بدون صور أطباق فعلية من الـ PDF).\n`;
  report += `- استخراج صور المنتجات من الـ PDF = مطلوبة لكن **معلّقة** على: (1) مفتاح Cloudinary الرقمي، (2) صلاحية فحص الـ PDF بصريًا وأداة استخراج الصور.\n`;

  report += `\n## 3) تغطية الحقول في Neon (تطابق data/menu.ts)\n\n`;
  report += `| المقياس | Neon |\n|---|---|\n`;
  for (const r of dbRows.rows) {
    // aggregate totals below instead
  }
  const tot = await db.query(`select
    (select count(*) from "Product" where "descAr" is not null)::int described,
    (select count(*) from "Product" where badge is not null)::int badged,
    (select count(*) from "Product" where "ingredientsAr" <> '{}')::int with_ingredients,
    (select count(*) from "ProductVariant" where "maxPrice" is not null)::int range_variants,
    (select count(*) from "ProductVariant" where "labelAr" is not null)::int labelled_variants`);
  report += `| منتجات بوصف | ${tot.rows[0].described} |\n| منتجات بشارة (مميز/عرض) | ${tot.rows[0].badged} |\n`;
  report += `| أطباق بصواني (ingredients) | ${tot.rows[0].with_ingredients} |\n| أسعار نطاق (60–95) | ${tot.rows[0].range_variants} |\n| variants بملصق حجم/وزن | ${tot.rows[0].labelled_variants} |\n`;

  writeFileSync("PDF_RECONCILIATION.md", report, "utf8");
  console.log(report);
  console.log("\nRECON_DONE");
} finally {
  await db.end();
}
