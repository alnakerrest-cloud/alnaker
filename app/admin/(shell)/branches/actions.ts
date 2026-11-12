"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { branchSchema, firstIssue } from "@/lib/admin/schemas";
import { fdStr, fdStrOpt, fdBool, fdInt } from "@/lib/admin/form";

export type ActionState = { ok?: boolean; error?: string; id?: string };

// الفروع جزء من إعدادات المطعم →Owner فقط (CRUD المحتوى للأدوارين، لكن الإعدادات للمالك).
function revalidate() {
  revalidatePath("/admin/branches");
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
    nameEn: fdStrOpt(fd, "nameEn"),
    addressAr: fdStr(fd, "addressAr"),
    addressEn: fdStrOpt(fd, "addressEn"),
    cityAr: fdStr(fd, "cityAr"),
    mapQuery: fdStrOpt(fd, "mapQuery"),
    phoneIntl: fdStrOpt(fd, "phoneIntl"),
    whatsappNumber: fdStrOpt(fd, "whatsappNumber"),
    isOrderable: fdBool(fd, "isOrderable"),
    openingHoursAr: fdStrOpt(fd, "openingHoursAr"),
    openingHoursEn: fdStrOpt(fd, "openingHoursEn"),
    isActive: fdBool(fd, "isActive"),
    sortOrder: fdInt(fd, "sortOrder", 0),
  };
}

type Br = {
  nameAr: string;
  nameEn: string | null;
  addressAr: string;
  addressEn: string | null;
  cityAr: string;
  mapQuery: string | null;
  phoneIntl: string | null;
  whatsappNumber: string | null;
  isOrderable: boolean;
  openingHoursAr: string | null;
  openingHoursEn: string | null;
  isActive: boolean;
  sortOrder: number;
};
function pick(b: Br) {
  return {
    nameAr: b.nameAr,
    nameEn: b.nameEn,
    addressAr: b.addressAr,
    addressEn: b.addressEn,
    cityAr: b.cityAr,
    mapQuery: b.mapQuery,
    phoneIntl: b.phoneIntl,
    whatsappNumber: b.whatsappNumber,
    isOrderable: b.isOrderable,
    openingHoursAr: b.openingHoursAr,
    openingHoursEn: b.openingHoursEn,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
  };
}

export async function createBranch(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(["OWNER"]);
  const parsed = branchSchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  const branch = await prisma.branch.create({ data: d });
  await logAction({ adminId: admin.id, action: "create", entityType: "Branch", entityId: branch.id, summaryAr: `إنشاء فرع: ${d.nameAr} (${d.cityAr})`, changes: { after: pick(branch) } });
  revalidate();
  return { ok: true, id: branch.id };
}

export async function updateBranch(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(["OWNER"]);
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "معرّف مفقود" };
  const parsed = branchSchema.safeParse(read(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  const before = await prisma.branch.findUnique({ where: { id } });
  if (!before) return { error: "الفرع غير موجود" };
  const branch = await prisma.branch.update({ where: { id }, data: d });
  await logAction({ adminId: admin.id, action: "update", entityType: "Branch", entityId: id, summaryAr: `تعديل فرع: ${d.nameAr}`, changes: { before: pick(before), after: pick(branch) } });
  revalidate();
  return { ok: true };
}

export async function deleteBranch(fd: FormData): Promise<void> {
  const admin = await requireAdmin(["OWNER"]);
  const id = String(fd.get("id") ?? "");
  const b = await prisma.branch.findUnique({ where: { id }, select: { nameAr: true } });
  if (!b) return;
  await prisma.branch.delete({ where: { id } });
  await logAction({ adminId: admin.id, action: "delete", entityType: "Branch", entityId: id, summaryAr: `حذف فرع: ${b.nameAr}`, changes: { before: { nameAr: b.nameAr } } });
  revalidate();
}

export async function toggleBranchActive(fd: FormData): Promise<void> {
  const admin = await requireAdmin(["OWNER"]);
  const id = String(fd.get("id") ?? "");
  const cur = await prisma.branch.findUnique({ where: { id }, select: { isActive: true, nameAr: true } });
  if (!cur) return;
  const updated = await prisma.branch.update({ where: { id }, data: { isActive: !cur.isActive } });
  await logAction({ adminId: admin.id, action: "update", entityType: "Branch", entityId: id, summaryAr: `${updated.isActive ? "تفعيل" : "تعطيل"} فرع: ${cur.nameAr}` });
  revalidate();
}

export async function moveBranch(fd: FormData): Promise<void> {
  const admin = await requireAdmin(["OWNER"]);
  const id = String(fd.get("id") ?? "");
  const up = String(fd.get("dir")) === "up";
  const cur = await prisma.branch.findUnique({ where: { id } });
  if (!cur) return;
  const neighbor = await prisma.branch.findFirst({
    where: up ? { sortOrder: { lt: cur.sortOrder } } : { sortOrder: { gt: cur.sortOrder } },
    orderBy: { sortOrder: up ? "desc" : "asc" },
  });
  if (!neighbor) return;
  await prisma.$transaction([
    prisma.branch.update({ where: { id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.branch.update({ where: { id: neighbor.id }, data: { sortOrder: cur.sortOrder } }),
  ]);
  await logAction({ adminId: admin.id, action: "update", entityType: "Branch", entityId: id, summaryAr: "إعادة ترتيب فرع" });
  revalidate();
}
