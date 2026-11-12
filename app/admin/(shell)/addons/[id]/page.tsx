import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import AddonForm from "../addon-form";
import { updateOptionGroup } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditAddonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin(["OWNER", "EDITOR"]);
  const { id } = await params;

  const [group, products] = await Promise.all([
    prisma.optionGroup.findUnique({
      where: { id },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
        productAssignments: { select: { productId: true } },
      },
    }),
    prisma.product.findMany({
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
    }),
  ]);

  if (!group) notFound();

  const formattedProducts = products.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    categoryName: p.section.category.nameAr,
  }));

  const initial = {
    id: group.id,
    nameAr: group.nameAr,
    nameEn: group.nameEn ?? "",
    isRequired: group.isRequired,
    isMulti: group.isMulti,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
    options: group.options.map((opt) => ({
      id: opt.id,
      nameAr: opt.nameAr,
      nameEn: opt.nameEn ?? "",
      price: Number(opt.price),
      isActive: opt.isActive,
    })),
    productIds: group.productAssignments.map((pa) => pa.productId),
  };

  return (
    <>
      <div className="admin-topbar">
        <h1>تعديل مجموعة الإضافات: {group.nameAr}</h1>
      </div>
      <AddonForm
        action={updateOptionGroup}
        initial={initial}
        products={formattedProducts}
        submitLabel="حفظ التعديلات"
      />
    </>
  );
}

