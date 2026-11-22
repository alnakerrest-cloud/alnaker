import { prisma, withDbRetry } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import OfferForm from "../offer-form";
import { createOffer } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);

  const [productsRaw, categories, branches] = await withDbRetry(async () => {
    return Promise.all([
      prisma.product.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          nameAr: true,
          section: { select: { category: { select: { nameAr: true } } } },
        },
      }),
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, nameAr: true },
      }),
      prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, nameAr: true, cityAr: true },
      }),
    ]);
  });

  const products = (productsRaw ?? [])
    .filter((p) => p && p.id && p.nameAr)
    .map((p) => ({
      id: p.id,
      nameAr: p.nameAr,
      categoryNameAr: p.section?.category?.nameAr ?? undefined,
    }));

  const safeCategories = (categories ?? []).filter((c) => c && c.id && c.nameAr);
  const safeBranches = (branches ?? [])
    .filter((b) => b && b.id && b.nameAr)
    .map((b) => ({
      id: b.id,
      nameAr: b.nameAr,
      cityAr: b.cityAr ?? "",
    }));

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">إنشاء عرض جديد</h1>
          <p className="admin-page-sub">
            أضف خصماً أو عرضاً خاصاً وحدد الأصناف والفروع ومواعيد السريان.
          </p>
        </div>
      </div>
      <OfferForm
        action={createOffer}
        products={products}
        categories={safeCategories}
        branches={safeBranches}
        submitLabel="إنشاء وحفظ العرض"
      />
    </div>
  );
}
