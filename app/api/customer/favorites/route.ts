// app/api/customer/favorites/route.ts
// ==============================================================================
// إدارة المنتجات المفضلة للعميل (Customer Favorites API)
// محمي: يربط الـ customerId بمنتجات المنيو الحقيقية ويمنع التكرار
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
} from "@/lib/customer-session";
import {
  getCustomerFavoritesAsync,
  getCustomerFavoriteProductIdsAsync,
  addCustomerFavoriteAsync,
  removeCustomerFavoriteAsync,
} from "@/lib/customer-hub-store";

export const dynamic = "force-dynamic";

async function getAuthorizedCustomerId(request: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const token = cookieToken || bearerToken;
  const session = verifyCustomerSession(token);
  return session ? session.customerId : null;
}

export async function GET(request: NextRequest) {
  try {
    const customerId = await getAuthorizedCustomerId(request);
    if (!customerId) {
      return NextResponse.json({ error: "غير مصرح به." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsOnly = searchParams.get("idsOnly") === "true";

    if (idsOnly) {
      const productIds = await getCustomerFavoriteProductIdsAsync(customerId);
      return NextResponse.json({ success: true, productIds });
    }

    const favorites = await getCustomerFavoritesAsync(customerId);
    return NextResponse.json({ success: true, favorites });
  } catch (err: any) {
    console.error("[customer-favorites-api] GET Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر جلب المفضلة." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const customerId = await getAuthorizedCustomerId(request);
    if (!customerId) {
      return NextResponse.json({ error: "غير مصرح به." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { productId } = body;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "معرّف المنتج مطلوب." }, { status: 400 });
    }

    const added = await addCustomerFavoriteAsync(customerId, productId);
    if (!added) {
      return NextResponse.json({ error: "المنتج غير موجود أو تعذّرت إضافته." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "تمت إضافة المنتج إلى المفضلة." });
  } catch (err: any) {
    console.error("[customer-favorites-api] POST Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر حفظ المفضلة." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const customerId = await getAuthorizedCustomerId(request);
    if (!customerId) {
      return NextResponse.json({ error: "غير مصرح به." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "معرّف المنتج مطلوب." }, { status: 400 });
    }

    await removeCustomerFavoriteAsync(customerId, productId);
    return NextResponse.json({ success: true, message: "تمت إزالة المنتج من المفضلة." });
  } catch (err: any) {
    console.error("[customer-favorites-api] DELETE Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر حذف المفضلة." }, { status: 500 });
  }
}
