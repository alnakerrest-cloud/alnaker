"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { categorySchema, firstIssue } from "@/lib/admin/schemas";
import { fdStr, fdStrOpt, fdBool, fdInt } from "@/lib/admin/form";
import { uploadImage, destroyImage, verifyCloudinaryAccess, UploadError } from "@/lib/cloudinary";

export type ActionState = { ok?: boolean; error?: string; id?: string };

/** يحدّث كل الواجهات المتأثرة: اللوحة + المنيو العام (تحضيرًا للربط بقاعدة البيانات). */
function revalidateAdmin(listPaths: string[]) {
  for (const p of listPaths) revalidatePath(p);
  revalidatePath("/admin/dashboard");
  revalidatePath("/ar", "page");
  revalidatePath("/en", "page");
  revalidatePath("/ar");
  revalidatePath("/en");
  revalidatePath("/[locale]", "page");
  revalidatePath("/", "layout");
}

function read(fd: FormData) {
  return {
    nameAr: fdStr(fd, "nameAr"),
    slug: fdStrOpt(fd, "slug"),
    icon: fdStrOpt(fd, "icon"),
    group: fdStr(fd, "group"),
    layout: fdStr(fd, "layout"),
    noteAr: fdStrOpt(fd, "noteAr"),
    isVisible: fdBool(fd, "isVisible"),
    sortOrder: fdInt(fd, "sortOrder", 0),
  };
}

type Cat = { nameAr: string; slug: string; group: string; layout: string; isVisible: boolean; sortOrder: number; icon: string | null; noteAr: string | null };
function pick(c: Cat) {
  return { nameAr: c.nameAr, slug: c.slug, group: c.group, layout: c.layout, isVisible: c.isVisible, sortOrder: c.sortOrder, icon: c.icon, noteAr: c.noteAr };
}

export async function createCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(); // أي دور (OWNER/EDITOR)
  const parsed = categorySchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const slug = d.slug ?? `cat-${Date.now().toString(36)}`;
  const dup = await prisma.category.findUnique({ where: { slug } });
  if (dup) return { error: "المعرّف (slug) مستخدم بالفعل في قسم آخر" };

  const cat = await prisma.category.create({
    data: {
      nameAr: d.nameAr,
      slug,
      icon: d.icon ?? null,
      group: d.group,
      layout: d.layout,
      noteAr: d.noteAr ?? null,
      isVisible: d.isVisible,
      sortOrder: d.sortOrder,
      sections: { create: [{ titleAr: null, sortOrder: 0 }] }, // عنبر افتراضي لإتاحة إضافة منتجات
    },
  });
  await logAction({ adminId: admin.id, action: "create", entityType: "Category", entityId: cat.id, summaryAr: `إنشاء قسم: ${d.nameAr}`, changes: { after: pick(cat) } });
  revalidateAdmin(["/admin/categories"]);
  return { ok: true, id: cat.id };
}

export async function updateCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = categorySchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) return { error: "القسم غير موجود" };
  const slug = d.slug ?? before.slug;
  if (slug !== before.slug) {
    const dup = await prisma.category.findFirst({ where: { slug, NOT: { id } } });
    if (dup) return { error: "المعرّف (slug) مستخدم بالفعل" };
  }
  const cat = await prisma.category.update({
    where: { id },
    data: {
      nameAr: d.nameAr,
      slug,
      icon: d.icon ?? null,
      group: d.group,
      layout: d.layout,
      noteAr: d.noteAr ?? null,
      isVisible: d.isVisible,
      sortOrder: d.sortOrder,
    },
  });
  await logAction({ adminId: admin.id, action: "update", entityType: "Category", entityId: id, summaryAr: `تعديل قسم: ${d.nameAr}`, changes: { before: pick(before), after: pick(cat) } });
  revalidateAdmin(["/admin/categories"]);
  return { ok: true };
}

export async function deleteCategory(fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(["OWNER"]); // الحذف للمالك فقط
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "معرّف مفقود" };
  const cat = await prisma.category.findUnique({ where: { id }, include: { sections: { include: { _count: { select: { products: true } } } } } });
  if (!cat) return { error: "القسم غير موجود" };
  const productCount = cat.sections.reduce((a, s) => a + s._count.products, 0);
  // حماية: لا نحذف قسمًا يحوي منتجات دون تأكيد صريح عبر الحقل force=1
  if (productCount > 0 && fd.get("force") !== "1") {
    return { error: `القسم يحوي ${productCount} منتجًا. احذف المنتجات أولًا أو استخدم الحذف القسري.` };
  }
  await prisma.category.delete({ where: { id } }); // Cascade يحذف الأقسام/المنتجات/المتغيّرات/الصور
  await logAction({ adminId: admin.id, action: "delete", entityType: "Category", entityId: id, summaryAr: `حذف قسم: ${cat.nameAr} (${productCount} منتج)`, changes: { before: pick(cat) } });
  revalidateAdmin(["/admin/categories", "/admin/products"]);
  return { ok: true };
}

export async function toggleCategoryVisible(fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const cur = await prisma.category.findUnique({ where: { id }, select: { isVisible: true, nameAr: true } });
  if (!cur) return { error: "غير موجود" };
  const updated = await prisma.category.update({ where: { id }, data: { isVisible: !cur.isVisible } });
  await logAction({ adminId: admin.id, action: "update", entityType: "Category", entityId: id, summaryAr: `${updated.isVisible ? "إظهار" : "إخفاء"} قسم: ${cur.nameAr}` });
  revalidateAdmin(["/admin/categories"]);
  return { ok: true };
}

/** تحريك الترتيب لأعلى/أسفل بتبديل sortOrder مع الجار. */
export async function moveCategory(fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const up = String(fd.get("dir")) === "up";
  const cur = await prisma.category.findUnique({ where: { id } });
  if (!cur) return { error: "غير موجود" };
  const neighbor = await prisma.category.findFirst({
    where: up ? { sortOrder: { lt: cur.sortOrder } } : { sortOrder: { gt: cur.sortOrder } },
    orderBy: { sortOrder: up ? "desc" : "asc" },
  });
  if (!neighbor) return { ok: true }; // لا مجاور — لا حركة
  await prisma.$transaction([
    prisma.category.update({ where: { id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.category.update({ where: { id: neighbor.id }, data: { sortOrder: cur.sortOrder } }),
  ]);
  await logAction({ adminId: admin.id, action: "update", entityType: "Category", entityId: id, summaryAr: `إعادة ترتيب قسم` });
  revalidateAdmin(["/admin/categories"]);
  return { ok: true };
}

/* ---------------- صورة القسم (Cloudinary) ---------------- */
export type ImageActionState = { ok?: boolean; error?: string };

/** يرفع/يستبدل صورة القسم. عند الاستبدال نحذف الأصل من Cloudinary بعد نجاح الحفظ فقط. */
export async function uploadCategoryImage(_prev: ImageActionState, fd: FormData): Promise<ImageActionState> {
  const admin = await requireAdmin();
  const id = fdStr(fd, "id");
  const file = fd.get("file");
  if (!id) return { error: "معرّف القسم مفقود" };
  if (!(file instanceof File)) return { error: "لم يتم اختيار ملف صورة." };
  const cat = await prisma.category.findUnique({ where: { id }, select: { id: true, nameAr: true, imagePublicId: true } });
  if (!cat) return { error: "القسم غير موجود" };

  const access = await verifyCloudinaryAccess();
  if (!access.ok) return { error: access.reason ?? "Cloudinary غير متاح حاليًا." };

  let uploaded: { url: string; publicId: string };
  try {
    uploaded = await uploadImage(file, "categories");
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    return { error: "فشل رفع الصورة." };
  }

  await prisma.category.update({ where: { id }, data: { imageUrl: uploaded.url, imagePublicId: uploaded.publicId } });
  // الاستبدال ناجح → حذف الأصل القديم لتجنّب الأصول اليتيمة.
  if (cat.imagePublicId && cat.imagePublicId !== uploaded.publicId) await destroyImage(cat.imagePublicId);
  await logAction({ adminId: admin.id, action: "update", entityType: "Category", entityId: id, summaryAr: `رفع صورة قسم: ${cat.nameAr}`, changes: { after: { publicId: uploaded.publicId } } });
  revalidateAdmin(["/admin/categories", `/admin/categories/${id}`]);
  return { ok: true };
}

/** يزيل صورة القسم من القاعدة ومن Cloudinary. */
export async function removeCategoryImage(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = fdStr(fd, "id");
  if (!id) return;
  const cat = await prisma.category.findUnique({ where: { id }, select: { imagePublicId: true, nameAr: true } });
  if (!cat) return;
  await prisma.category.update({ where: { id }, data: { imageUrl: null, imagePublicId: null } });
  if (cat.imagePublicId) await destroyImage(cat.imagePublicId);
  await logAction({ adminId: admin.id, action: "update", entityType: "Category", entityId: id, summaryAr: `حذف صورة قسم: ${cat.nameAr}` });
  revalidateAdmin(["/admin/categories", `/admin/categories/${id}`]);
}
