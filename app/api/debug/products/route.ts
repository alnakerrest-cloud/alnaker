import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let dbStatus = "unknown";
  let dbError = null;
  let adminUsersCount = 0;
  let dbHost = "none";

  try {
    const rawUrl = process.env.DATABASE_URL || process.env["DATABASE_URL "];
    if (rawUrl) {
      const match = rawUrl.match(/@([^/:]+)/);
      if (match) dbHost = match[1];
    }
    adminUsersCount = await prisma.adminUser.count();
    dbStatus = "connected";
  } catch (e: any) {
    dbStatus = "failed";
    dbError = e?.message || String(e);
  }

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
  
  const envKeys = Object.keys(process.env).filter(
    k => !k.toLowerCase().includes('secret') && !k.toLowerCase().includes('key') && !k.toLowerCase().includes('token') && !k.toLowerCase().includes('pass')
  );

  return NextResponse.json({
    dbStatus,
    dbHost,
    adminUsersCount,
    dbError,
    envKeys,
    products,
    optionGroups,
    productOptionGroups,
  });
}