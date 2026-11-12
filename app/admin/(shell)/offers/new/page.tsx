import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import OfferForm from "../offer-form";
import { createOffer } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  await requireAdmin(["OWNER", "EDITOR"]);

  const [productsRaw, categories, branches] = await Promise.all([
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

  const products = productsRaw.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    categoryNameAr: p.section?.category?.nameAr,
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
        categories={categories}
        branches={branches}
        submitLabel="إنشاء وحفظ العرض"
      />
    </div>
  );
}

