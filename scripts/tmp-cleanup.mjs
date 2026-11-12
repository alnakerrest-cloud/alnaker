// تنظيف بقايا بيانات الاختبار ONLY (nameAr LIKE 'ZZ%') — لا يمس المنيو الأصلي.
// يحذف صور المنتج (مع تدميرها من Cloudinary إن وُجدت) ثم الأسعار ثم المنتجات/الفئات/الفروع ZZ.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import pg from "pg";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true, channelBinding: "require" });
await db.connect();

async function before(label) {
  const r = await db.query(`select
    (select count(*) from "Product" where "nameAr" like 'ZZ%')::int zz_products,
    (select count(*) from "Category" where "nameAr" like 'ZZ%')::int zz_cats,
    (select count(*) from "Branch" where "nameAr" like 'ZZ%')::int zz_branches,
    (select count(*) from "Product")::int total_products,
    (select count(*) from "ProductImage")::int total_images`);
  console.log(`${label}:`, JSON.stringify(r.rows[0]));
  return r.rows[0];
}

try {
  await before("BEFORE");

  // 1) صور منتجات ZZ → دمر من Cloudinary ثم احذف السجل.
  const imgs = await db.query(
    `select pi.id, pi."publicId" from "ProductImage" pi
       join "Product" p on p.id = pi."productId"
      where p."nameAr" like 'ZZ%'`
  );
  for (const im of imgs.rows) {
    if (im.publicId) {
      try { await cloudinary.uploader.destroy(im.publicId); console.log("destroyed", im.publicId); }
      catch (e) { console.log("cloudinary-destroy-failed", im.publicId, e.message); }
    }
    await db.query(`delete from "ProductImage" where id=$1`, [im.id]);
  }

  // 2) أسعار منتجات ZZ.
  await db.query(
    `delete from "ProductVariant" where "productId" in (select id from "Product" where "nameAr" like 'ZZ%')`
  );
  // 3) منتجات ZZ.
  const dp = await db.query(`delete from "Product" where "nameAr" like 'ZZ%' returning id`);
  console.log("deleted_products:", dp.rowCount);

  // 4) فئات/أقسام ZZ (احترازي؛ لا يوجد عادة).
  await db.query(
    `delete from "Section" where "categoryId" in (select id from "Category" where "nameAr" like 'ZZ%')`
  );
  const dc = await db.query(`delete from "Category" where "nameAr" like 'ZZ%' returning id`);
  if (dc.rowCount) console.log("deleted_categories:", dc.rowCount);

  // 5) فروع ZZ.
  const db2 = await db.query(`delete from "Branch" where "nameAr" like 'ZZ%' returning id`);
  if (db2.rowCount) console.log("deleted_branches:", db2.rowCount);

  const after = await before("AFTER");
  if (after.zz_products === 0 && after.zz_cats === 0 && after.zz_branches === 0) {
    console.log("CLEANUP_OK: no ZZ residue remains.");
  } else {
    console.log("CLEANUP_INCOMPLETE: ZZ residue still present.");
  }
} finally {
  await db.end();
}
