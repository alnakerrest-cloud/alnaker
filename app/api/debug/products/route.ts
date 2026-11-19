import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({ 
    take: 50, 
    select: { id: true, nameAr: true, sectionId: true } 
  });
  
  const optionGroups = await prisma.optionGroup.findMany({
    include: {
      options: true,
    }
  });
  
  const productOptionGroups = await prisma.productOptionGroup.findMany({
    include: {
      group: true,
    }
  });

  return NextResponse.json({ products, optionGroups, productOptionGroups });
}