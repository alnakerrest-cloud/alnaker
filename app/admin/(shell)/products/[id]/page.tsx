import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import ProductForm from "../product-form";
import ProductImageManager from "../image-manager";
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
    },
  });
  if (!p) notFound();

  const sections = await getSectionOptions();

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

      <ProductImageManager productId={p.id} images={p.images} />
    </>
  );
}
