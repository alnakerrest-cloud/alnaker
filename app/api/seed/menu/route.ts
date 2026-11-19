import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { menu, type Category as MenuCategory } from "@/data/menu";

// Option group definitions for common product types
const optionGroupDefs = [
  // Mandi portion options
  {
    nameAr: "حجم المندي",
    nameEn: "Mandi Portion",
    isRequired: true,
    sortOrder: 1,
    options: [
      { nameAr: "ثلث كيلو", nameEn: "⅓ kg", price: 0, sortOrder: 1 },
      { nameAr: "نصف كيلو", nameEn: "½ kg", price: 45, sortOrder: 2 },
      { nameAr: "كيلو", nameEn: "1 kg", price: 90, sortOrder: 3 },
    ],
  },
  // Grill size options
  {
    nameAr: "حجم المشويات",
    nameEn: "Grill Size",
    isRequired: true,
    sortOrder: 1,
    options: [
      { nameAr: "سنجل (شخص واحد)", nameEn: "Single (1 person)", price: 0, sortOrder: 1 },
      { nameAr: "ميديام (شخصين)", nameEn: "Medium (2 persons)", price: 35, sortOrder: 2 },
      { nameAr: "عائلة (٤ أشخاص)", nameEn: "Family (4 persons)", price: 70, sortOrder: 3 },
    ],
  },
  // Tray choice options
  {
    nameAr: "نوع الصينية",
    nameEn: "Tray Type",
    isRequired: false,
    sortOrder: 2,
    options: [
      { nameAr: "عادية", nameEn: "Regular", price: 0, sortOrder: 1 },
      { nameAr: "مميزة (إضافات)", nameEn: "Special (with extras)", price: 50, sortOrder: 2 },
    ],
  },
  // Rice type options
  {
    nameAr: "نوع الأرز",
    nameEn: "Rice Type",
    isRequired: false,
    sortOrder: 2,
    options: [
      { nameAr: "بسمتي أبيض", nameEn: "White Basmati", price: 0, sortOrder: 1 },
      { nameAr: "بسمتي مع زعفران", nameEn: "Saffron Basmati", price: 15, sortOrder: 2 },
      { nameAr: "مندي (مع زيت)", nameEn: "Mandi Style", price: 10, sortOrder: 3 },
    ],
  },
  // Drink size options
  {
    nameAr: "الحجم",
    nameEn: "Size",
    isRequired: true,
    sortOrder: 1,
    options: [
      { nameAr: "صغير", nameEn: "Small", price: 0, sortOrder: 1 },
      { nameAr: "وسط", nameEn: "Medium", price: 5, sortOrder: 2 },
      { nameAr: "كبير", nameEn: "Large", price: 10, sortOrder: 3 },
    ],
  },
  // Spice level
  {
    nameAr: "درجة الحرارة",
    nameEn: "Spice Level",
    isRequired: false,
    sortOrder: 3,
    options: [
      { nameAr: "عادية", nameEn: "Regular", price: 0, sortOrder: 1 },
      { nameAr: "حارة", nameEn: "Spicy", price: 0, sortOrder: 2 },
      { nameAr: "حارة جداً", nameEn: "Extra Spicy", price: 0, sortOrder: 3 },
    ],
  },
  // Extra bread
  {
    nameAr: "إضافات",
    nameEn: "Extras",
    isRequired: false,
    sortOrder: 4,
    options: [
      { nameAr: "خبز إضافي", nameEn: "Extra Bread", price: 5, sortOrder: 1 },
      { nameAr: "سلطة إضافية", nameEn: "Extra Salad", price: 10, sortOrder: 2 },
      { nameAr: "مخللات", nameEn: "Pickles", price: 5, sortOrder: 3 },
    ],
  },
];

// Map category slugs to appropriate option groups
const categoryOptionGroupMap: Record<string, string[]> = {
  trays: ["نوع الصينية", "نوع الأرز", "إضافات"],
  mandi: ["حجم المندي", "نوع الأرز", "درجة الحرارة", "إضافات"],
  grills: ["حجم المشويات", "نوع الأرز", "درجة الحرارة", "إضافات"],
  sandwiches: ["نوع الخبز", "إضافات"],
  appetizers: ["إضافات"],
  soups: ["إضافات"],
  sides: ["إضافات"],
  drinks: ["الحجم"],
  desserts: ["إضافات"],
};

export async function GET() {
  try {
    // 1. Create option groups
    const createdOptionGroups: Record<string, string> = {};
    for (const def of optionGroupDefs) {
      const existing = await prisma.optionGroup.findFirst({
        where: { nameAr: def.nameAr },
      });
      if (existing) {
        createdOptionGroups[def.nameAr] = existing.id;
      } else {
        const created = await prisma.optionGroup.create({
          data: {
            nameAr: def.nameAr,
            nameEn: def.nameEn,
            isRequired: def.isRequired,
            isActive: true,
            sortOrder: def.sortOrder,
            options: {
              create: def.options.map((opt) => ({
                nameAr: opt.nameAr,
                nameEn: opt.nameEn,
                price: opt.price,
                isActive: true,
                sortOrder: opt.sortOrder,
              })),
            },
          },
        });
        createdOptionGroups[def.nameAr] = created.id;
      }
    }

    // 2. Create categories and sections
    const categorySlugToId: Record<string, string> = {};
    const sectionTitleToId: Record<string, string> = {};

    for (const cat of menu as MenuCategory[]) {
      // Create category
      let category = await prisma.category.findUnique({
        where: { slug: cat.id },
      });
      if (!category) {
        category = await prisma.category.create({
          data: {
            slug: cat.id,
            nameAr: cat.name.ar,
            icon: cat.icon,
            group: cat.group.toUpperCase() as "FOOD" | "DRINKS",
            layout: cat.layout.toUpperCase() as "TRAYS" | "LIST",
            noteAr: cat.note?.ar,
            isVisible: true,
            sortOrder: 0,
          },
        });
      }
      categorySlugToId[cat.id] = category.id;

      // Create sections
      for (let si = 0; si < cat.sections.length; si++) {
        const sec = cat.sections[si];
        const sectionKey = `${cat.id}|||${sec.title?.ar ?? "main"}`;
        let section = await prisma.section.findFirst({
          where: { categoryId: category.id, titleAr: sec.title?.ar ?? null },
        });
        if (!section) {
          section = await prisma.section.create({
            data: {
              categoryId: category.id,
              titleAr: sec.title?.ar,
              sortOrder: si,
            },
          });
        }
        sectionTitleToId[sectionKey] = section.id;
      }
    }

    // 3. Create products
    let productCount = 0;
    for (const cat of menu as MenuCategory[]) {
      const categoryId = categorySlugToId[cat.id];
      const optionGroupNames = categoryOptionGroupMap[cat.id] || [];

      for (let si = 0; si < cat.sections.length; si++) {
        const sec = cat.sections[si];
        const sectionKey = `${cat.id}|||${sec.title?.ar ?? "main"}`;
        const sectionId = sectionTitleToId[sectionKey];

        for (let pi = 0; pi < sec.items.length; pi++) {
          const item = sec.items[pi];
          
          // Check if product exists
          let product = await prisma.product.findFirst({
            where: { sectionId, nameAr: item.name.ar },
          });
          
          if (!product) {
            product = await prisma.product.create({
              data: {
                sectionId,
                nameAr: item.name.ar,
                descAr: item.desc?.ar,
                badge: item.badge?.ar === "مميز" ? "SIGNATURE" : item.badge?.ar === "عرض" ? "OFFER" : null,
                ingredientsAr: item.parts?.map(p => p.ar) ?? [],
                isAvailable: true,
                isVisible: true,
                isFeatured: false,
                sortOrder: pi,
                variants: {
                  create: item.prices.map((p, vi) => ({
                    labelAr: p.label?.ar,
                    price: typeof p.value === "number" ? p.value : parseFloat(String(p.value).split(/[\u2013\-]/)[0]),
                    maxPrice: typeof p.value === "string" && p.value.includes("–") ? parseFloat(p.value.split("–")[1].trim()) : null,
                    sortOrder: vi,
                    isAvailable: true,
                  })),
                },
              },
            });
            productCount++;
          }

          // Assign option groups to product
          for (const ogName of optionGroupNames) {
            const ogId = createdOptionGroups[ogName];
            if (ogId) {
              await prisma.productOptionGroup.upsert({
                where: {
                  productId_groupId: {
                    productId: product.id,
                    groupId: ogId,
                  },
                },
                update: { sortOrder: 0 },
                create: {
                  productId: product.id,
                  groupId: ogId,
                  sortOrder: 0,
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      optionGroupsCreated: Object.keys(createdOptionGroups).length,
      productsCreated: productCount,
      categories: Object.keys(categorySlugToId).length,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}