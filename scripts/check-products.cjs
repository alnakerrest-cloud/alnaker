const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({ 
    take: 20, 
    select: { id: true, name: true, categoryId: true } 
  });
  console.log('Items:', JSON.stringify(items, null, 2));
  
  const optionGroups = await prisma.optionGroup.findMany();
  console.log('OptionGroups:', JSON.stringify(optionGroups, null, 2));
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });