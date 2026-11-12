import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import OfferForm, { type OfferFormValues } from "../offer-form";
import { updateOffer } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin(["OWNER", "EDITOR"]);
  const { id } = await params;

  const [offer, productsRaw, categories, branches] = await Promise.all([
    prisma.offer.findUnique({
      where: { id },
      include: {
        productTargets: { select: { productId: true } },
        categoryTargets: { select: { categoryId: true } },
        locationTargets: { select: { targetLocationId: true } },
      },
    }),
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

  if (!offer) notFound();

  const products = productsRaw.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    categoryNameAr: p.section?.category?.nameAr,
  }));

  const initial: OfferFormValues = {
    id: offer.id,
    titleAr: offer.titleAr,
    titleEn: offer.titleEn,
    descAr: offer.descAr,
    descEn: offer.descEn,
    offerType: offer.offerType as any,
    discountValue: offer.discountValue ? Number(offer.discountValue) : null,
    promoPrice: offer.promoPrice ? Number(offer.promoPrice) : null,
    buyQty: offer.buyQty,
    getQty: offer.getQty,
    minOrderAmount: offer.minOrderAmount ? Number(offer.minOrderAmount) : null,
    minQuantity: offer.minQuantity,
    startDate: offer.startDate?.toISOString() ?? null,
    endDate: offer.endDate?.toISOString() ?? null,
    isActive: offer.isActive,
    sortOrder: offer.sortOrder,
    imageUrl: offer.imageUrl,
    imagePublicId: offer.imagePublicId,
    badgeAr: offer.badgeAr,
    badgeEn: offer.badgeEn,
    productIds: offer.productTargets.map((pt) => pt.productId),
    categoryIds: offer.categoryTargets.map((ct) => ct.categoryId),
    locationIds: offer.locationTargets.map((lt) => lt.targetLocationId),
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">تعديل العرض: {offer.titleAr}</h1>
          <p className="admin-page-sub">تحديث تفاصيل العرض والخصم أو الفروع المستهدفة.</p>
        </div>
      </div>
      <OfferForm
        action={updateOffer}
        initial={initial}
        products={products}
        categories={categories}
        branches={branches}
        submitLabel="حفظ التعديلات"
      />
    </div>
  );
}

