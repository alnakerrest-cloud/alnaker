"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { productSchema, firstIssue, safeJsonArray, splitList } from "@/lib/admin/schemas";
import { fdStr, fdStrOpt, fdBool, fdInt, fdEnumOrNull } from "@/lib/admin/form";
import { uploadImage, destroyImage, verifyCloudinaryAccess, UploadError } from "@/lib/cloudinary";

export type ProductActionState = { ok?: boolean; error?: string; id?: string };

function revalidate(listPaths: string[]) {
  for (const p of listPaths) revalidatePath(p);
  revalidatePath("/admin/dashboard");
  revalidatePath("/ar", "page");
  revalidatePath("/en", "page");
  revalidatePath("/ar");
  revalidatePath("/en");
  revalidatePath("/[locale]", "page");
  revalidatePath("/", "layout");
}

type VariantInput = { labelAr?: string; price: number; maxPrice: number | null; sortOrder: number; isAvailable: boolean };

/** يحوّل مصفوفة الـ variants القادمة كـ JSON إلى مُدخلات نظيفة قبل التحقق. */
function readVariants(fd: FormData): VariantInput[] {
  const arr = safeJsonArray(fdStr(fd, "variants")) as Record<string, unknown>[];
  return arr.map((v, i) => ({
    labelAr: String(v.labelAr ?? "").trim() || undefined,
    price: Number(v.price),
    maxPrice: v.maxPrice == null || String(v.maxPrice).trim() === "" ? null : Number(v.maxPrice),
    sortOrder: Number.isFinite(Number(v.sortOrder)) ? Math.trunc(Number(v.sortOrder)) : i,
    isAvailable: v.isAvailable !== false && v.isAvailable !== "false",
  }));
}

function read(fd: FormData) {
  return {
    sectionId: fdStr(fd, "sectionId"),
    nameAr: fdStr(fd, "nameAr"),
    descAr: fdStrOpt(fd, "descAr"),
    badge: fdEnumOrNull(fd, "badge") as "SIGNATURE" | "OFFER" | null,
    ingredientsAr: splitList(fdStr(fd, "ingredientsAr")),
    isAvailable: fdBool(fd, "isAvailable"),
    isVisible: fdBool(fd, "isVisible"),
    isFeatured: fdBool(fd, "isFeatured"),
    sortOrder: fdInt(fd, "sortOrder", 0),
    variants: readVariants(fd),
  };
}

async function sectionInfo(sectionId: string) {
  const s = await prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, titleAr: true, category: { select: { nameAr: true } } } });
  return s ? `${s.category.nameAr}${s.titleAr ? " › " + s.titleAr : ""}` : sectionId;
}

export async function createProduct(_prev: ProductActionState, fd: FormData): Promise<ProductActionState> {
  const admin = await requireAdmin();
  const parsed = productSchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const product = await prisma.product.create({
    data: {
      sectionId: d.sectionId,
      nameAr: d.nameAr,
      descAr: d.descAr ?? null,
      badge: d.badge ?? null,
      ingredientsAr: d.ingredientsAr,
      isAvailable: d.isAvailable,
      isVisible: d.isVisible,
      isFeatured: d.isFeatured,
      sortOrder: d.sortOrder,
      variants: {
        create: d.variants.map((v) => ({ labelAr: v.labelAr ?? null, price: v.price, maxPrice: v.maxPrice, sortOrder: v.sortOrder, isAvailable: v.isAvailable })),
      },
    },
    include: { section: true },
  });
  await logAction({ adminId: admin.id, action: "create", entityType: "Product", entityId: product.id, summaryAr: `إنشاء منتج: ${d.nameAr} (${d.variants.length} سعر)`, changes: { after: { nameAr: d.nameAr, prices: d.variants.map((v) => v.price) } } });
  revalidate(["/admin/products", `/admin/products/${product.id}`]);
  return { ok: true, id: product.id };
}

export async function updateProduct(_prev: ProductActionState, fd: FormData): Promise<ProductActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "معرّف مفقود" };
  const parsed = productSchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  const before = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!before) return { error: "المنتج غير موجود" };

  // سعر النطاق (maxPrice < price) يُرفض في Zod؛ هنا نستبدل كل الأسعار داخل معاملة واحدة.
  await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: {
        sectionId: d.sectionId,
        nameAr: d.nameAr,
        descAr: d.descAr ?? null,
        badge: d.badge ?? null,
        ingredientsAr: d.ingredientsAr,
        isAvailable: d.isAvailable,
        isVisible: d.isVisible,
        isFeatured: d.isFeatured,
        sortOrder: d.sortOrder,
      },
    }),
    prisma.productVariant.deleteMany({ where: { productId: id } }),
    prisma.productVariant.createMany({
      data: d.variants.map((v) => ({ productId: id, labelAr: v.labelAr ?? null, price: v.price, maxPrice: v.maxPrice, sortOrder: v.sortOrder, isAvailable: v.isAvailable })),
    }),
  ]);
  await logAction({
    adminId: admin.id,
    action: "update",
    entityType: "Product",
    entityId: id,
    summaryAr: `تعديل منتج: ${d.nameAr}`,
    changes: { before: { nameAr: before.nameAr, prices: before.variants.map((v) => Number(v.price)) }, after: { nameAr: d.nameAr, prices: d.variants.map((v) => v.price) } },
  });
  revalidate(["/admin/products", `/admin/products/${id}`]);
  return { ok: true };
}

export async function deleteProduct(fd: FormData): Promise<void> {
  const admin = await requireAdmin(["OWNER"]);
  const id = String(fd.get("id") ?? "");
  const p = await prisma.product.findUnique({ where: { id }, select: { nameAr: true, sectionId: true } });
  if (!p) return;
  await prisma.product.delete({ where: { id } });
  await logAction({ adminId: admin.id, action: "delete", entityType: "Product", entityId: id, summaryAr: `حذف منتج: ${p.nameAr}` });
  revalidate(["/admin/products"]);
}

/** تبديل حالة عامة للمنتج (إخفاء/توفر/مميز) + ترتيب. */
export async function setProductFlags(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const flag = String(fd.get("flag") ?? "");
  const p = await prisma.product.findUnique({ where: { id }, select: { nameAr: true, isVisible: true, isAvailable: true, isFeatured: true } });
  if (!p) return;
  let data: { isVisible?: boolean } | { isAvailable?: boolean } | { isFeatured?: boolean } | null = null;
  let label = "";
  let next = false;
  if (flag === "isVisible") {
    next = !p.isVisible;
    data = { isVisible: next };
    label = "الظهور";
  } else if (flag === "isAvailable") {
    next = !p.isAvailable;
    data = { isAvailable: next };
    label = "التوفر";
  } else if (flag === "isFeatured") {
    next = !p.isFeatured;
    data = { isFeatured: next };
    label = "التمييز";
  } else {
    return;
  }
  await prisma.product.update({ where: { id }, data });
  await logAction({ adminId: admin.id, action: "update", entityType: "Product", entityId: id, summaryAr: `${label}: ${p.nameAr} → ${next ? "نعم" : "لا"}`, changes: { after: { [flag]: next } } });
  revalidate(["/admin/products", `/admin/products/${id}`]);
}

export async function moveProduct(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const up = String(fd.get("dir")) === "up";
  const cur = await prisma.product.findUnique({ where: { id } });
  if (!cur) return;
  const neighbor = await prisma.product.findFirst({
    where: { sectionId: cur.sectionId, ...(up ? { sortOrder: { lt: cur.sortOrder } } : { sortOrder: { gt: cur.sortOrder } }) },
    orderBy: { sortOrder: up ? "desc" : "asc" },
  });
  if (!neighbor) return;
  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.product.update({ where: { id: neighbor.id }, data: { sortOrder: cur.sortOrder } }),
  ]);
  await logAction({ adminId: admin.id, action: "update", entityType: "Product", entityId: id, summaryAr: "إعادة ترتيب منتج" });
  revalidate(["/admin/products"]);
}

/* ---------------- صور المنتجات (Cloudinary) ---------------- */
export type ImageActionState = { ok?: boolean; error?: string };

/** يرفع صورة ويضيفها للمنتج. لو كانت أول صورة تُصبح أساسية. لا يفقد القديمة عند الفشل. */
export async function uploadProductImage(_prev: ImageActionState, fd: FormData): Promise<ImageActionState> {
  const admin = await requireAdmin();
  const productId = fdStr(fd, "productId");
  const file = fd.get("file");
  if (!productId) return { error: "معرّف المنتج مفقود" };
  if (!(file instanceof File)) return { error: "لم يتم اختيار ملف صورة." };

  const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, nameAr: true } });
  if (!exists) return { error: "المنتج غير موجود" };

  const access = await verifyCloudinaryAccess();
  if (!access.ok) return { error: access.reason ?? "Cloudinary غير متاح حاليًا." };

  let uploaded: { url: string; publicId: string };
  try {
    uploaded = await uploadImage(file, "products");
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    return { error: "فشل رفع الصورة." };
  }

  const count = await prisma.productImage.count({ where: { productId } });
  await prisma.productImage.create({
    data: { productId, url: uploaded.url, publicId: uploaded.publicId, altAr: exists.nameAr, isPrimary: count === 0 },
  });
  await logAction({ adminId: admin.id, action: "update", entityType: "Product", entityId: productId, summaryAr: `رفع صورة منتج: ${exists.nameAr}`, changes: { after: { publicId: uploaded.publicId } } });
  revalidate([`/admin/products/${productId}`]);
  return { ok: true };
}

/** يجعل الصورة الأساسية المحدّدة (ويلغي الأساسية الأخرى). */
export async function setPrimaryProductImage(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const productId = fdStr(fd, "productId");
  const imageId = fdStr(fd, "imageId");
  if (!productId || !imageId) return;
  const img = await prisma.productImage.findFirst({ where: { id: imageId, productId }, select: { id: true } });
  if (!img) return;
  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);
  await logAction({ adminId: admin.id, action: "update", entityType: "Product", entityId: productId, summaryAr: "تحديد صورة أساسية" });
  revalidate([`/admin/products/${productId}`]);
}

/** يحذف سجل الصورة من القاعدة ثم أصli Cloudinary (بعد نجاح الحذف) لتجنّب اليُتم. */
export async function deleteProductImage(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const productId = fdStr(fd, "productId");
  const imageId = fdStr(fd, "imageId");
  if (!productId || !imageId) return;
  const img = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!img) return;
  await prisma.productImage.delete({ where: { id: imageId } });
  // لو حذفنا الأساسية، رقِّي أقدم صورة متبقية لتصبح أساسية.
  if (img.isPrimary) {
    const next = await prisma.productImage.findFirst({ where: { productId }, orderBy: { sortOrder: "asc" } });
    if (next) await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  if (img.publicId) await destroyImage(img.publicId);
  await logAction({ adminId: admin.id, action: "update", entityType: "Product", entityId: productId, summaryAr: "حذف صورة منتج" });
  revalidate([`/admin/products/${productId}`]);
}

/** ربط مجموعة خيارات بالمنتج */
export async function attachProductOptionGroup(productId: string, groupId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (!productId || !groupId) return { ok: false, error: "معرف المنتج والمجموعة مطلوبان" };

  const existing = await prisma.productOptionGroup.findFirst({
    where: { productId, groupId },
  });
  if (existing) return { ok: true };

  await prisma.productOptionGroup.create({
    data: {
      productId,
      groupId,
      sortOrder: 0,
    },
  });

  await logAction({
    adminId: admin.id,
    action: "update",
    entityType: "Product",
    entityId: productId,
    summaryAr: `ربط مجموعة خيارات بالمنتج: ${groupId}`,
  });

  revalidate([`/admin/products/${productId}`]);
  return { ok: true };
}

/** فصل مجموعة خيارات عن المنتج */
export async function detachProductOptionGroup(productId: string, groupId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (!productId || !groupId) return { ok: false, error: "معرف المنتج والمجموعة مطلوبان" };

  await prisma.productOptionGroup.deleteMany({
    where: { productId, groupId },
  });

  await logAction({
    adminId: admin.id,
    action: "update",
    entityType: "Product",
    entityId: productId,
    summaryAr: `فصل مجموعة خيارات عن المنتج: ${groupId}`,
  });

  revalidate([`/admin/products/${productId}`]);
  return { ok: true };
}
