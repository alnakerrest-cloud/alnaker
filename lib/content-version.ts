// بصمة نسخة المحتوى — تُشتق من تجميعات خفيفة ودقيقة في القاعدة.
// الهدف: اكتشاف أي تعديل من الداشبورد (اسم/سعر/variants/صورة/فئة/ترتيب/إخفاء/فروع/إعدادات/عروض) دون
// تحميل المنيو كاملًا. لا تُكشف أي بيانات حسّاسة — فقط بصمة لا تحمل معنى بحد ذاتها.
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getBackupContentVersion } from "@/lib/backup-menu-db";

export async function getContentVersion(): Promise<string> {
  if (process.env.USE_BACKUP_DATA !== "false") {
    return getBackupContentVersion();
  }

  try {
    const [products, variants, categories, settings, branches, images, offers] = await Promise.all([
      prisma.product.findMany({
        select: { id: true, nameAr: true, updatedAt: true, isVisible: true, isAvailable: true, sortOrder: true },
        orderBy: { id: "asc" },
      }),
      prisma.productVariant.findMany({
        select: { id: true, price: true, maxPrice: true, isAvailable: true },
        orderBy: { id: "asc" },
      }),
      prisma.category.findMany({
        select: { id: true, nameAr: true, updatedAt: true, isVisible: true, sortOrder: true },
        orderBy: { id: "asc" },
      }),
      prisma.restaurantSettings.findFirst({
        select: { updatedAt: true, taglineAr: true, brandNameAr: true },
      }),
      prisma.branch.findMany({
        select: { id: true, isActive: true, updatedAt: true },
        orderBy: { id: "asc" },
      }),
      prisma.productImage.findMany({
        where: { isPrimary: true },
        select: { id: true, url: true },
        orderBy: { id: "asc" },
      }),
      prisma.offer.findMany({
        select: { id: true, isActive: true, updatedAt: true },
        orderBy: { id: "asc" },
      }),
    ]);

    const hash = createHash("sha1");
    for (const p of products) {
      hash.update(`${p.id}:${p.nameAr}:${p.updatedAt.getTime()}:${p.isVisible}:${p.isAvailable}:${p.sortOrder};`);
    }
    for (const v of variants) {
      hash.update(`${v.id}:${v.price}:${v.maxPrice}:${v.isAvailable};`);
    }
    for (const c of categories) {
      hash.update(`${c.id}:${c.nameAr}:${c.updatedAt.getTime()}:${c.isVisible}:${c.sortOrder};`);
    }
    if (settings) {
      hash.update(`${settings.updatedAt.getTime()}:${settings.taglineAr ?? ""}:${settings.brandNameAr ?? ""};`);
    }
    for (const b of branches) {
      hash.update(`${b.id}:${b.isActive}:${b.updatedAt.getTime()};`);
    }
    for (const img of images) {
      hash.update(`${img.id}:${img.url};`);
    }
    for (const o of offers) {
      hash.update(`${o.id}:${o.isActive}:${o.updatedAt.getTime()};`);
    }
    return hash.digest("hex").slice(0, 16);
  } catch {
    // عند أي خلل مؤقت لا نحدث عاصفة تحديث؛ القيمة الثابتة تجعل العميل يتجاهل الجلب.
    return "unavailable";
  }
}
