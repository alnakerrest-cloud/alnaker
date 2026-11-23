import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import ProductForm from "../product-form";
import ProductImageManager from "../image-manager";
import ProductOptionGroupsManager from "./option-groups-manager";
import { updateProduct } from "../actions";
import { getSectionOptions } from "../section-options";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], select: { id: true, url: true, altAr: true, isPrimary: true } },
      optionGroups: {
        include: {
          group: {
            include: {
              options: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!p) notFound();

  const [sections, allOptionGroups] = await Promise.all([
    getSectionOptions(),
    prisma.optionGroup.findMany({
      where: { isActive: true },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <>
      <div className="admin-topbar">
        <h1>تعديل: {p.nameAr}</h1>
        <div className="row-actions">
          <span className="admin-user-chip">{p.variants.length} سعر</span>
          <Link href="/admin/products" className="admin-btn">عودة</Link>
        </div>
      </div>

      <ProductForm
        action={updateProduct}
        sections={sections}
        submitLabel="حفظ التعديلات"
        initial={{
          id: p.id,
          nameAr: p.nameAr,
          descAr: p.descAr ?? "",
          sectionId: p.sectionId,
          badge: p.badge ?? "",
          ingredientsAr: p.ingredientsAr.join("\n"),
          isAvailable: p.isAvailable,
          isVisible: p.isVisible,
          isFeatured: p.isFeatured,
          sortOrder: p.sortOrder,
          variants: p.variants.map((v) => ({
            id: v.id,
            labelAr: v.labelAr ?? "",
            price: String(Number(v.price)),
            maxPrice: v.maxPrice == null ? "" : String(Number(v.maxPrice)),
            isAvailable: v.isAvailable,
          })),
        }}
      />

      <ProductOptionGroupsManager
        productId={p.id}
        assignedGroups={(p.optionGroups || []).map((pog) => ({
          id: pog.id,
          groupId: pog.groupId,
          group: pog.group
            ? {
                id: pog.group.id,
                nameAr: pog.group.nameAr,
                nameEn: pog.group.nameEn,
                isRequired: pog.group.isRequired,
                isMulti: pog.group.isMulti,
                minSelect: pog.group.minSelect,
                maxSelect: pog.group.maxSelect,
                options: pog.group.options.map((o) => ({
                  id: o.id,
                  nameAr: o.nameAr,
                  nameEn: o.nameEn,
                  price: Number(o.price),
                })),
              }
            : null,
        }))}
        availableGroups={allOptionGroups.map((g) => ({
          id: g.id,
          nameAr: g.nameAr,
          nameEn: g.nameEn,
          isRequired: g.isRequired,
          isMulti: g.isMulti,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options: g.options.map((o) => ({
            id: o.id,
            nameAr: o.nameAr,
            nameEn: o.nameEn,
            price: Number(o.price),
          })),
        }))}
      />

      <ProductImageManager productId={p.id} images={p.images} />
    </>
  );
}
