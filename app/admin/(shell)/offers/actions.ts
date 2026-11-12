"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { offerSchema, firstIssue, safeJsonArray } from "@/lib/admin/schemas";
import { fdStr, fdStrOpt, fdBool, fdInt, fdNumOrNull } from "@/lib/admin/form";
import { uploadImage, destroyImage } from "@/lib/cloudinary";

export type OfferActionState = { ok?: boolean; error?: string; id?: string };

function revalidate() {
  revalidatePath("/admin/offers");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/products");
  revalidatePath("/ar", "page");
  revalidatePath("/en", "page");
  revalidatePath("/ar");
  revalidatePath("/en");
  revalidatePath("/[locale]", "page");
  revalidatePath("/", "layout");
}

function parseIds(fd: FormData, key: string): string[] {
  const raw = fdStr(fd, key);
  const arr = safeJsonArray(raw);
  if (Array.isArray(arr)) {
    return arr.map(String).filter((id) => id.length > 0);
  }
  return fd.getAll(key).map(String).filter((id) => id.length > 0);
}

function read(fd: FormData) {
  const startDateRaw = fdStrOpt(fd, "startDate");
  const endDateRaw = fdStrOpt(fd, "endDate");

  const isFeatured = fdBool(fd, "isFeatured");
  const rawSort = fdInt(fd, "sortOrder", 0);
  const computedSort = isFeatured ? (rawSort > 0 ? -rawSort : -1) : rawSort;
  let badgeAr = fdStr(fd, "badgeAr") || "عرض خاص";
  let badgeEn = fdStr(fd, "badgeEn") || "Special Offer";
  if (isFeatured && !badgeAr.includes("مميز")) {
    badgeAr = `⭐ عرض مميز`;
    badgeEn = `⭐ Featured Offer`;
  }

  return {
    titleAr: fdStr(fd, "titleAr"),
    titleEn: fdStrOpt(fd, "titleEn"),
    descAr: fdStrOpt(fd, "descAr"),
    descEn: fdStrOpt(fd, "descEn"),
    offerType: (fdStr(fd, "offerType") || "PERCENTAGE") as any,
    discountValue: fdNumOrNull(fd, "discountValue"),
    promoPrice: fdNumOrNull(fd, "promoPrice"),
    buyQty: fdInt(fd, "buyQty", 1),
    getQty: fdInt(fd, "getQty", 1),
    minOrderAmount: fdNumOrNull(fd, "minOrderAmount"),
    minQuantity: fdInt(fd, "minQuantity", 1),
    startDate: startDateRaw ? new Date(startDateRaw).toISOString() : undefined,
    endDate: endDateRaw ? new Date(endDateRaw).toISOString() : undefined,
    isActive: fdBool(fd, "isActive"),
    sortOrder: computedSort,
    imageUrl: fdStrOpt(fd, "imageUrl"),
    imagePublicId: fdStrOpt(fd, "imagePublicId"),
    badgeAr,
    badgeEn,
    productIds: parseIds(fd, "productIds"),
    categoryIds: parseIds(fd, "categoryIds"),
    locationIds: parseIds(fd, "locationIds"),
  };
}

export async function createOffer(_prev: OfferActionState, fd: FormData): Promise<OfferActionState> {
  const admin = await requireAdmin(["OWNER", "EDITOR"]);
  const parsed = offerSchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  // Handle promotional image upload if provided
  let imageUrl = d.imageUrl ?? null;
  let imagePublicId = d.imagePublicId ?? null;
  const imageFile = fd.get("imageFile");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      const up = await uploadImage(imageFile, "offers");
      imageUrl = up.url;
      imagePublicId = up.publicId;
    } catch (err: any) {
      return { error: `فشل رفع صورة العرض: ${err?.message || err}` };
    }
  }

  const offer = await prisma.offer.create({
    data: {
      titleAr: d.titleAr,
      titleEn: d.titleEn ?? null,
      descAr: d.descAr ?? null,
      descEn: d.descEn ?? null,
      offerType: d.offerType,
      discountValue: d.discountValue != null ? d.discountValue : null,
      promoPrice: d.promoPrice != null ? d.promoPrice : null,
      buyQty: d.buyQty,
      getQty: d.getQty,
      minOrderAmount: d.minOrderAmount != null ? d.minOrderAmount : null,
      minQuantity: d.minQuantity,
      startDate: d.startDate ? new Date(d.startDate) : null,
      endDate: d.endDate ? new Date(d.endDate) : null,
      isActive: d.isActive,
      sortOrder: d.sortOrder,
      imageUrl,
      imagePublicId,
      badgeAr: d.badgeAr,
      badgeEn: d.badgeEn,
      productTargets: {
        create: d.productIds.map((pid) => ({ productId: pid })),
      },
      categoryTargets: {
        create: d.categoryIds.map((cid) => ({ categoryId: cid })),
      },
      locationTargets: {
        create: d.locationIds.map((lid) => ({ targetLocationId: lid })),
      },
    },
  });

  await logAction({
    adminId: admin.id,
    action: "create",
    entityType: "Offer",
    entityId: offer.id,
    summaryAr: `إنشاء عرض جديد: ${d.titleAr} (${d.offerType})`,
    changes: {
      after: {
        titleAr: d.titleAr,
        offerType: d.offerType,
        discountValue: d.discountValue,
        promoPrice: d.promoPrice,
        isActive: d.isActive,
      },
    },
  });

  revalidate();
  return { ok: true, id: offer.id };
}

export async function updateOffer(_prev: OfferActionState, fd: FormData): Promise<OfferActionState> {
  const admin = await requireAdmin(["OWNER", "EDITOR"]);
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "معرّف العرض مفقود" };

  const parsed = offerSchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const before = await prisma.offer.findUnique({
    where: { id },
    include: {
      productTargets: true,
      categoryTargets: true,
      locationTargets: true,
    },
  });
  if (!before) return { error: "العرض غير موجود" };

  let imageUrl = before.imageUrl;
  let imagePublicId = before.imagePublicId;

  const removeImage = fdBool(fd, "removeImage");
  if (removeImage && imagePublicId) {
    try {
      await destroyImage(imagePublicId);
      imageUrl = null;
      imagePublicId = null;
    } catch (err) {
      console.error("Failed to delete Cloudinary offer image:", err);
    }
  }

  const imageFile = fd.get("imageFile");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      if (imagePublicId) {
        await destroyImage(imagePublicId).catch(() => null);
      }
      const up = await uploadImage(imageFile, "offers");
      imageUrl = up.url;
      imagePublicId = up.publicId;
    } catch (err: any) {
      return { error: `فشل تحديث صورة العرض: ${err?.message || err}` };
    }
  }

  // Update offer and targets in transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Replace product targets
    await tx.offerProductTarget.deleteMany({ where: { offerId: id } });
    if (d.productIds.length > 0) {
      await tx.offerProductTarget.createMany({
        data: d.productIds.map((pid) => ({ offerId: id, productId: pid })),
      });
    }

    // Replace category targets
    await tx.offerCategoryTarget.deleteMany({ where: { offerId: id } });
    if (d.categoryIds.length > 0) {
      await tx.offerCategoryTarget.createMany({
        data: d.categoryIds.map((cid) => ({ offerId: id, categoryId: cid })),
      });
    }

    // Replace location targets
    await tx.offerLocationTarget.deleteMany({ where: { offerId: id } });
    if (d.locationIds.length > 0) {
      await tx.offerLocationTarget.createMany({
        data: d.locationIds.map((lid) => ({ offerId: id, targetLocationId: lid })),
      });
    }

    return tx.offer.update({
      where: { id },
      data: {
        titleAr: d.titleAr,
        titleEn: d.titleEn ?? null,
        descAr: d.descAr ?? null,
        descEn: d.descEn ?? null,
        offerType: d.offerType,
        discountValue: d.discountValue != null ? d.discountValue : null,
        promoPrice: d.promoPrice != null ? d.promoPrice : null,
        buyQty: d.buyQty,
        getQty: d.getQty,
        minOrderAmount: d.minOrderAmount != null ? d.minOrderAmount : null,
        minQuantity: d.minQuantity,
        startDate: d.startDate ? new Date(d.startDate) : null,
        endDate: d.endDate ? new Date(d.endDate) : null,
        isActive: d.isActive,
        sortOrder: d.sortOrder,
        imageUrl,
        imagePublicId,
        badgeAr: d.badgeAr,
        badgeEn: d.badgeEn,
      },
    });
  });

  await logAction({
    adminId: admin.id,
    action: "update",
    entityType: "Offer",
    entityId: id,
    summaryAr: `تعديل العرض: ${d.titleAr}`,
    changes: {
      before: {
        titleAr: before.titleAr,
        offerType: before.offerType,
        isActive: before.isActive,
      },
      after: {
        titleAr: updated.titleAr,
        offerType: updated.offerType,
        isActive: updated.isActive,
      },
    },
  });

  revalidate();
  return { ok: true, id };
}

export async function deleteOffer(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const admin = await requireAdmin(["OWNER"]);
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "معرّف العرض مفقود" };

  const before = await prisma.offer.findUnique({
    where: { id },
    select: { titleAr: true, imagePublicId: true },
  });
  if (!before) return { error: "العرض غير موجود" };

  if (before.imagePublicId) {
    try {
      await destroyImage(before.imagePublicId);
    } catch (err) {
      console.error("Cloudinary cleanup error on offer deletion:", err);
    }
  }

  await prisma.offer.delete({ where: { id } });

  await logAction({
    adminId: admin.id,
    action: "delete",
    entityType: "Offer",
    entityId: id,
    summaryAr: `حذف العرض: ${before.titleAr}`,
    changes: { before: { titleAr: before.titleAr } },
  });

  revalidate();
  return { ok: true };
}

export async function toggleOfferActive(id: string, currentState: boolean): Promise<{ ok: boolean }> {
  const admin = await requireAdmin(["OWNER", "EDITOR"]);
  const updated = await prisma.offer.update({
    where: { id },
    data: { isActive: !currentState },
    select: { id: true, titleAr: true, isActive: true },
  });

  await logAction({
    adminId: admin.id,
    action: "update",
    entityType: "Offer",
    entityId: id,
    summaryAr: `${updated.isActive ? "تفعيل" : "إيقاف"} العرض: ${updated.titleAr}`,
    changes: { before: { isActive: currentState }, after: { isActive: updated.isActive } },
  });

  revalidate();
  return { ok: true };
}
