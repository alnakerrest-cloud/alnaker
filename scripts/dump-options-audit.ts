import { prisma } from "../lib/prisma";
async function main() {
  const products = await prisma.product.findMany({
    orderBy: [
      { section: { category: { sortOrder: "asc" } } },
      { section: { sortOrder: "asc" } },
      { sortOrder: "asc" },
    ],
    include: {
      section: { include: { category: true } },
      variants: { orderBy: { sortOrder: "asc" } },
      optionGroups: {
        include: { group: { include: { options: { orderBy: { sortOrder: "asc" } } } } },
        orderBy: { sortOrder: "asc" },
      },
      images: true,
    },
  });
  const out = products.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    descAr: p.descAr,
    category: { id: p.section.category.id, nameAr: p.section.category.nameAr, slug: p.section.category.slug },
    section: { titleAr: p.section.titleAr },
    variants: p.variants.map((v) => ({ labelAr: v.labelAr, price: String(v.price), maxPrice: v.maxPrice ? String(v.maxPrice) : null })),
    optionGroups: p.optionGroups.map((og) => ({
      groupId: og.group.id,
      nameAr: og.group.nameAr,
      isRequired: og.group.isRequired,
      isMulti: og.group.isMulti,
      minSelect: og.group.minSelect,
      maxSelect: og.group.maxSelect,
      options: og.group.options.map((o) => ({ nameAr: o.nameAr, price: String(o.price) })),
    })),
    imagesCount: p.images.length,
    ingredientsAr: p.ingredientsAr,
    isAvailable: p.isAvailable,
    isVisible: p.isVisible,
  }));
  console.log(JSON.stringify(out, null, 2));
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
