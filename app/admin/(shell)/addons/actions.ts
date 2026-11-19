"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { optionGroupSchema, firstIssue, safeJsonArray } from "@/lib/admin/schemas";
import { fdStr, fdStrOpt, fdBool, fdInt } from "@/lib/admin/form";

export type AddonActionState = { ok?: boolean; error?: string; id?: string };

function revalidate() {
  revalidatePath("/admin/addons");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/products");
  revalidatePath("/ar");
  revalidatePath("/en");
}

type RawOption = {
  id?: string;
  nameAr?: string;
  nameEn?: string;
  price?: number | string;
  isActive?: boolean | string;
  sortOrder?: number | string;
};

function readOptions(fd: FormData) {
  const arr = safeJsonArray(fdStr(fd, "options")) as RawOption[];
  return arr.map((opt, i) => ({
    id: opt.id ? String(opt.id).trim() : undefined,
    nameAr: String(opt.nameAr ?? "").trim(),
    nameEn: opt.nameEn ? String(opt.nameEn).trim() : undefined,
    price: Number(opt.price ?? 0),
    isActive: opt.isActive !== false && opt.isActive !== "false",
    sortOrder: Number.isFinite(Number(opt.sortOrder)) ? Math.trunc(Number(opt.sortOrder)) : i,
  }));
}

function readProductIds(fd: FormData): string[] {
  const raw = fdStr(fd, "productIds");
  const arr = safeJsonArray(raw);
  if (Array.isArray(arr)) {
    return arr.map(String).filter((id) => id.length > 0);
  }
  return fd.getAll("productIds").map(String).filter((id) => id.length > 0);
}

function read(fd: FormData) {
  const isMulti = fdBool(fd, "isMulti");
  const minSelect = isMulti ? fdInt(fd, "minSelect", 0) : (fdBool(fd, "isRequired") ? 1 : 0);
  const maxSelect = isMulti ? Math.max(1, fdInt(fd, "maxSelect", 1)) : 1;

  return {
    nameAr: fdStr(fd, "nameAr"),
    nameEn: fdStrOpt(fd, "nameEn"),
    isRequired: fdBool(fd, "isRequired"),
    isMulti,
    minSelect,
    maxSelect,
    sortOrder: fdInt(fd, "sortOrder", 0),
    isActive: fdBool(fd, "isActive"),
    options: readOptions(fd),
    productIds: readProductIds(fd),
  };
}

export async function createOptionGroup(_prev: AddonActionState, fd: FormData): Promise<AddonActionState> {
  const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  const parsed = optionGroupSchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const group = await prisma.optionGroup.create({
    data: {
      nameAr: d.nameAr,
      nameEn: d.nameEn ?? null,
      isRequired: d.isRequired,
      isMulti: d.isMulti,
      minSelect: d.minSelect,
      maxSelect: d.maxSelect,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
      options: {
        create: d.options.map((opt, i) => ({
          nameAr: opt.nameAr,
          nameEn: opt.nameEn ?? null,
          price: opt.price,
          isActive: opt.isActive,
          sortOrder: opt.sortOrder ?? i,
        })),
      },
      productAssignments: {
        create: d.productIds.map((pId, i) => ({
          productId: pId,
          sortOrder: i,
        })),
      },
    },
  });

  await logAction({
    adminId: admin.id,
    action: "create",
    entityType: "OptionGroup",
    entityId: group.id,
    summaryAr: `إنشاء مجموعة إضافات: ${d.nameAr} (${d.options.length} خيار، ${d.productIds.length} منتج)`,
    changes: { after: { nameAr: d.nameAr, optionsCount: d.options.length, productsCount: d.productIds.length } },
  });

  revalidate();
  return { ok: true, id: group.id };
}

export async function updateOptionGroup(_prev: AddonActionState, fd: FormData): Promise<AddonActionState> {
  const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  const id = String(fd.get("id") ?? "").trim();
  if (!id) return { error: "معرّف المجموعة مفقود" };

  const parsed = optionGroupSchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const existing = await prisma.optionGroup.findUnique({
    where: { id },
    include: { options: true, productAssignments: true },
  });
  if (!existing) return { error: "المجموعة غير موجودة" };

  // Transaction: update group info, sync options, sync assignments
  await prisma.$transaction(async (tx) => {
    // 1. Update group fields
    await tx.optionGroup.update({
      where: { id },
      data: {
        nameAr: d.nameAr,
        nameEn: d.nameEn ?? null,
        isRequired: d.isRequired,
        isMulti: d.isMulti,
        minSelect: d.minSelect,
        maxSelect: d.maxSelect,
        sortOrder: d.sortOrder,
        isActive: d.isActive,
      },
    });

    // 2. Options sync
    const incomingIds = new Set(d.options.map((o) => o.id).filter(Boolean));
    // Delete options no longer in incoming list
    await tx.optionItem.deleteMany({
      where: {
        groupId: id,
        id: { notIn: Array.from(incomingIds as Set<string>) },
      },
    });

    // Update existing or create new
    for (let i = 0; i < d.options.length; i++) {
      const opt = d.options[i];
      if (opt.id && existing.options.some((eo) => eo.id === opt.id)) {
        await tx.optionItem.update({
          where: { id: opt.id },
          data: {
            nameAr: opt.nameAr,
            nameEn: opt.nameEn ?? null,
            price: opt.price,
            isActive: opt.isActive,
            sortOrder: opt.sortOrder ?? i,
          },
        });
      } else {
        await tx.optionItem.create({
          data: {
            groupId: id,
            nameAr: opt.nameAr,
            nameEn: opt.nameEn ?? null,
            price: opt.price,
            isActive: opt.isActive,
            sortOrder: opt.sortOrder ?? i,
          },
        });
      }
    }

    // 3. Product assignments sync
    await tx.productOptionGroup.deleteMany({ where: { groupId: id } });
    if (d.productIds.length > 0) {
      await tx.productOptionGroup.createMany({
        data: d.productIds.map((pId, i) => ({
          groupId: id,
          productId: pId,
          sortOrder: i,
        })),
      });
    }
  });

  await logAction({
    adminId: admin.id,
    action: "update",
    entityType: "OptionGroup",
    entityId: id,
    summaryAr: `تعديل مجموعة إضافات: ${d.nameAr}`,
    changes: {
      before: { nameAr: existing.nameAr, optionsCount: existing.options.length },
      after: { nameAr: d.nameAr, optionsCount: d.options.length, productsCount: d.productIds.length },
    },
  });

  revalidate();
  return { ok: true, id };
}

export async function deleteOptionGroup(fd: FormData): Promise<void> {
  const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  const id = String(fd.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.optionGroup.findUnique({
    where: { id },
    select: { nameAr: true },
  });
  if (!existing) return;

  await prisma.optionGroup.delete({ where: { id } });

  await logAction({
    adminId: admin.id,
    action: "delete",
    entityType: "OptionGroup",
    entityId: id,
    summaryAr: `حذف مجموعة إضافات: ${existing.nameAr}`,
  });

  revalidate();
}

export async function toggleOptionGroupActive(fd: FormData): Promise<void> {
  const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  const id = String(fd.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.optionGroup.findUnique({
    where: { id },
    select: { id: true, nameAr: true, isActive: true },
  });
  if (!existing) return;

  const nextActive = !existing.isActive;
  await prisma.optionGroup.update({
    where: { id },
    data: { isActive: nextActive },
  });

  await logAction({
    adminId: admin.id,
    action: "update",
    entityType: "OptionGroup",
    entityId: id,
    summaryAr: `${nextActive ? "تفعيل" : "تعطيل"} مجموعة إضافات: ${existing.nameAr}`,
    changes: { before: { isActive: existing.isActive }, after: { isActive: nextActive } },
  });

  revalidate();
}

