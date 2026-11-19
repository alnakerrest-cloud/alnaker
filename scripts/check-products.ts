import { prisma } from "../lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    take: 20,
    select: { id: true, nameAr: true, sectionId: true },
  });
  console.log(JSON.stringify(products, null, 2));

  const optionGroups = await prisma.optionGroup.findMany({ take: 50 });
  console.log("OptionGroups:", JSON.stringify(optionGroups, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
