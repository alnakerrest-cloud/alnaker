"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { settingsSchema, firstIssue } from "@/lib/admin/schemas";
import { fdStr, fdStrOpt, fdNumOrNull } from "@/lib/admin/form";
import { uploadImage, destroyImage, verifyCloudinaryAccess, UploadError } from "@/lib/cloudinary";

export type ActionState = { ok?: boolean; error?: string };

// إعدادات المطعم = Owner فقط.
function revalidate() {
  revalidatePath("/admin/settings");
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
    brandNameAr: fdStr(fd, "brandNameAr"),
    taglineAr: fdStrOpt(fd, "taglineAr"),
    phoneDisplay: fdStrOpt(fd, "phoneDisplay"),
    phoneIntl: fdStrOpt(fd, "phoneIntl"),
    logoUrl: fdStrOpt(fd, "logoUrl"), // يُستخدم فقط لو جاء من وحدة الصور؛ النموذج لا يعرضه
    vatNoteAr: fdStrOpt(fd, "vatNoteAr"),
    serviceNoteAr: fdStrOpt(fd, "serviceNoteAr"),
    serviceChargePct: fdNumOrNull(fd, "serviceChargePct"),
    currencyAr: fdStr(fd, "currencyAr") || "ج.م",
    deliveryFee: fdNumOrNull(fd, "deliveryFee"),
  };
}

type Snapshot = {
  brandNameAr: string; taglineAr: string | null; phoneDisplay: string | null; phoneIntl: string | null;
  vatNoteAr: string | null; serviceNoteAr: string | null; serviceChargePct: unknown; currencyAr: string;
  deliveryFee: unknown;
};
/** لقطة نظيفة للسجل: Decimal → number، ونستثني الحقول الحسّاسة/غير المهمة. */
function snapshot(o: Snapshot) {
  return {
    brandNameAr: o.brandNameAr,
    taglineAr: o.taglineAr,
    phoneDisplay: o.phoneDisplay,
    phoneIntl: o.phoneIntl,
    vatNoteAr: o.vatNoteAr,
    serviceNoteAr: o.serviceNoteAr,
    serviceChargePct: o.serviceChargePct == null ? null : Number(o.serviceChargePct),
    currencyAr: o.currencyAr,
    deliveryFee: o.deliveryFee == null ? null : Number(o.deliveryFee),
  };
}

export async function updateSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(["OWNER"]);
  const parsed = settingsSchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const before = await prisma.restaurantSettings.findUnique({ where: { id: "default" } });
  const data = {
    brandNameAr: d.brandNameAr,
    taglineAr: d.taglineAr ?? null,
    phoneDisplay: d.phoneDisplay ?? null,
    phoneIntl: d.phoneIntl ?? null,
    vatNoteAr: d.vatNoteAr ?? null,
    serviceNoteAr: null,
    serviceChargePct: null,
    currencyAr: d.currencyAr,
    deliveryFee: d.deliveryFee,
  };
  const after = await prisma.restaurantSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  await logAction({
    adminId: admin.id,
    action: "update",
    entityType: "Settings",
    entityId: "default",
    summaryAr: `تحديث إعدادات المطعم: ${d.brandNameAr}`,
    changes: { before: before ? snapshot(before) : null, after: snapshot(after) },
  });
  revalidate();
  return { ok: true };
}

/* ---------------- الشعار (Cloudinary — branding) ---------------- */
export type LogoActionState = { ok?: boolean; error?: string };

/** يرفع/يستبدل شعار المطعم. المحفوظ في RestaurantSettings.logoUrl + logoPublicId. */
export async function uploadLogo(_prev: LogoActionState, fd: FormData): Promise<LogoActionState> {
  const admin = await requireAdmin(["OWNER"]);
  const file = fd.get("file");
  if (!(file instanceof File)) return { error: "لم يتم اختيار ملف صورة." };

  const access = await verifyCloudinaryAccess();
  if (!access.ok) return { error: access.reason ?? "Cloudinary غير متاح حاليًا." };

  const before = await prisma.restaurantSettings.findUnique({ where: { id: "default" }, select: { logoPublicId: true } });

  let uploaded: { url: string; publicId: string };
  try {
    uploaded = await uploadImage(file, "branding");
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    return { error: "فشل رفع الشعار." };
  }

  await prisma.restaurantSettings.upsert({
    where: { id: "default" },
    create: { id: "default", brandNameAr: before ? "" : "قرية الناقر", logoUrl: uploaded.url, logoPublicId: uploaded.publicId },
    update: { logoUrl: uploaded.url, logoPublicId: uploaded.publicId },
  });
  if (before?.logoPublicId && before.logoPublicId !== uploaded.publicId) await destroyImage(before.logoPublicId);
  await logAction({ adminId: admin.id, action: "update", entityType: "Settings", entityId: "default", summaryAr: "تحديث شعار المطعم", changes: { after: { publicId: uploaded.publicId } } });
  revalidate();
  return { ok: true };
}

/** يزيل الشعار من القاعدة ومن Cloudinary. */
export async function removeLogo(): Promise<LogoActionState> {
  const admin = await requireAdmin(["OWNER"]);
  const cur = await prisma.restaurantSettings.findUnique({ where: { id: "default" }, select: { logoPublicId: true } });
  if (!cur) return { ok: true };
  await prisma.restaurantSettings.update({ where: { id: "default" }, data: { logoUrl: null, logoPublicId: null } });
  if (cur.logoPublicId) await destroyImage(cur.logoPublicId);
  await logAction({ adminId: admin.id, action: "update", entityType: "Settings", entityId: "default", summaryAr: "حذف شعار المطعم" });
  revalidate();
  return { ok: true };
}
