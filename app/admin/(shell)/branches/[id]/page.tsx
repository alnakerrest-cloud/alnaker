import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import BranchForm from "../branch-form";
import { updateBranch } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") redirect("/admin/branches");
  const { id } = await params;
  const b = await prisma.branch.findUnique({ where: { id } });
  if (!b) notFound();

  return (
    <>
      <div className="admin-topbar">
        <h1>تعديل: {b.nameAr}</h1>
        <Link href="/admin/branches" className="admin-btn">عودة</Link>
      </div>
      <BranchForm
        action={updateBranch}
        submitLabel="حفظ التعديلات"
        initial={{
          id: b.id,
          nameAr: b.nameAr,
          nameEn: b.nameEn ?? "",
          addressAr: b.addressAr,
          addressEn: b.addressEn ?? "",
          cityAr: b.cityAr,
          mapQuery: b.mapQuery ?? "",
          phoneIntl: b.phoneIntl ?? "",
          whatsappNumber: b.whatsappNumber ?? "",
          isOrderable: b.isOrderable,
          openingHoursAr: b.openingHoursAr ?? "",
          openingHoursEn: b.openingHoursEn ?? "",
          isActive: b.isActive,
          sortOrder: b.sortOrder,
        }}
      />
    </>
  );
}
