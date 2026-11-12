import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import AddonForm from "../addon-form";
import { createOptionGroup } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewAddonPage() {
  await requireAdmin(["OWNER", "EDITOR"]);

  const products = await prisma.product.findMany({
    select: {
      id: true,
      nameAr: true,
      section: {
        select: {
          category: {
            select: { nameAr: true },
          },
        },
      },
    },
    orderBy: [
      { section: { category: { sortOrder: "asc" } } },
      { sortOrder: "asc" },
      { nameAr: "asc" },
    ],
  });

  const formattedProducts = products.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    categoryName: p.section.category.nameAr,
  }));

  return (
    <>
      <div className="admin-topbar">
        <h1>إضافة مجموعة إضافات وخيارات جديدة</h1>
      </div>
      <AddonForm
        action={createOptionGroup}
        products={formattedProducts}
        submitLabel="إنشاء المجموعة"
      />
    </>
  );
}

