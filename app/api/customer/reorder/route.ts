// app/api/customer/reorder/route.ts
// ==============================================================================
// إعادة الطلب الذكية (Smart Reorder API)
// يتحقق من الأصناف التاريخية ومطابقتها للمنيو الحالي والأسعار والخيارات القائمة
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
} from "@/lib/customer-session";
import { getOrderByNumberAsync } from "@/lib/orders-store";
import { prisma } from "@/lib/prisma";
import type { CartItem, SelectedOption } from "@/lib/cart";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const token = cookieToken || bearerToken;
    const session = verifyCustomerSession(token);

    if (!session) {
      return NextResponse.json({ error: "لا يمكن تنفيذ العملية: الجلسة غير مصرح بها." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { orderNumber } = body;

    if (!orderNumber || typeof orderNumber !== "string") {
      return NextResponse.json({ error: "رقم الطلب مطلوب." }, { status: 400 });
    }

    const order = await getOrderByNumberAsync(orderNumber);
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    // التحقق الصارم من ملكية العميل للطلب
    const cleanPhone = session.phoneNormalized.replace(/\D/g, "");
    const ordPhone = (order.customerPhoneNormalized || order.customerPhone || "").replace(/\D/g, "");
    const isOwner =
      order.customerId === session.customerId ||
      (cleanPhone && (ordPhone === cleanPhone || ordPhone.endsWith(cleanPhone) || cleanPhone.endsWith(ordPhone)));

    if (!isOwner) {
      return NextResponse.json({ error: "غير مصرح لك بإعادة هذا الطلب." }, { status: 403 });
    }

    // فحص منتجات الطلب مقابل قاعدة البيانات الحالية
    const availableItems: CartItem[] = [];
    const unavailableItems: { productName: string; reason: string }[] = [];
    const priceChanges: { productName: string; oldPrice: number; currentPrice: number }[] = [];

    for (const item of order.items) {
      try {
        const product: any = await prisma.product.findUnique({
          where: { id: item.productId },
          include: {
            variants: { orderBy: { sortOrder: "asc" } },
            optionGroups: {
              include: {
                group: {
                  include: {
                    options: { orderBy: { sortOrder: "asc" } },
                  },
                },
              },
            },
          },
        });

        if (!product || !product.isVisible) {
          unavailableItems.push({
            productName: item.productName,
            reason: "لم يعد متوفراً في قائمة الطعام الحالية",
          });
          continue;
        }

        if (!product.isAvailable) {
          unavailableItems.push({
            productName: item.productName,
            reason: "غير متاح للطلب مؤقتاً بالفرع",
          });
          continue;
        }

        // تحديد السعر الأساسي الحالي للمنتج
        let currentBasePrice = item.baseUnitPrice;
        let variantIndex = item.variantLabel ? 0 : 0;

        if (product.variants && product.variants.length > 0) {
          const matchedVariantIdx = product.variants.findIndex(
            (v: any) => v.nameAr === item.variantLabel || v.price === item.baseUnitPrice
          );
          if (matchedVariantIdx !== -1) {
            variantIndex = matchedVariantIdx;
            currentBasePrice = Number(product.variants[matchedVariantIdx].price);
          } else {
            variantIndex = 0;
            currentBasePrice = Number(product.variants[0].price);
          }
        }

        // فحص تغير السعر
        if (Number(currentBasePrice) !== Number(item.baseUnitPrice)) {
          priceChanges.push({
            productName: item.productName,
            oldPrice: item.baseUnitPrice,
            currentPrice: Number(currentBasePrice),
          });
        }

        // التحقق من الخيارات المحددة
        const currentSelectedOptions: SelectedOption[] = [];
        let optionsTotal = 0;

        if (item.selectedOptions && Array.isArray(item.selectedOptions)) {
          for (const opt of item.selectedOptions) {
            // البحث عن الخيار في مجموعات خيارات المنتج الحالية
            let matchedCurrentOption: any = null;
            for (const pog of product.optionGroups || []) {
              const found = (pog as any).group?.options?.find(
                (o: any) => o.id === opt.id || o.nameAr === opt.name
              );
              if (found) {
                matchedCurrentOption = found;
                break;
              }
            }

            if (matchedCurrentOption) {
              const optPrice = Number(matchedCurrentOption.price || 0);
              currentSelectedOptions.push({
                id: matchedCurrentOption.id,
                groupId: opt.groupId,
                groupName: opt.groupName,
                name: matchedCurrentOption.nameAr || opt.name,
                price: optPrice,
              });
              optionsTotal += optPrice;
            }
          }
        }

        const unitPrice = Number(currentBasePrice) + optionsTotal;
        const cartItemId = `${item.productId}__${variantIndex}${
          currentSelectedOptions.length > 0
            ? "__" + currentSelectedOptions.map((o) => o.id).sort().join(",")
            : ""
        }`;

        availableItems.push({
          id: cartItemId,
          productId: item.productId,
          name: product.nameAr || item.productName,
          variantIndex,
          variantLabel: item.variantLabel,
          baseUnitPrice: Number(currentBasePrice),
          selectedOptions: currentSelectedOptions.length > 0 ? currentSelectedOptions : undefined,
          unitPrice,
          quantity: item.quantity,
          notes: item.notes,
        });
      } catch (prodErr: any) {
        console.warn("[reorder] Product lookup error:", prodErr.message);
        unavailableItems.push({
          productName: item.productName,
          reason: "تعذّر التحقق من المنتج حالياً",
        });
      }
    }

    return NextResponse.json({
      success: true,
      availableItems,
      unavailableItems,
      priceChanges,
      branchId: order.branchId,
      branchNameAr: order.branchNameAr,
    });
  } catch (err: any) {
    console.error("[customer-reorder-api] Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر تحضير إعادة الطلب." }, { status: 500 });
  }
}
