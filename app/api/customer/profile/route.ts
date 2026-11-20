// app/api/customer/profile/route.ts
// ==============================================================================
// إدارة الملف الشخصي للعميل (Customer Profile API)
// يدعم استرجاع وتحديث اسم العميل وتجديد الجلسة
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
  signCustomerSession,
} from "@/lib/customer-session";
import {
  ensureCustomerSessionRecordAsync,
  updateCustomerNameAsync,
} from "@/lib/customer-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const token = cookieToken || bearerToken;
    const session = verifyCustomerSession(token);

    if (!session) {
      return NextResponse.json({ authenticated: false, customer: null }, { status: 401 });
    }

    const customer = await ensureCustomerSessionRecordAsync(session);
    return NextResponse.json({
      authenticated: true,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name || session.customerName,
        createdAt: customer.createdAt,
      },
    });
  } catch (err: any) {
    console.error("[customer-profile-api] GET Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر جلب بيانات الملف الشخصي." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const token = cookieToken || bearerToken;
    const session = verifyCustomerSession(token);

    if (!session) {
      return NextResponse.json({ error: "غير مصرح به." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "الاسم مطلوب ولا يمكن أن يكون فارغاً." }, { status: 400 });
    }

    const trimmedName = name.trim().slice(0, 100);
    const customer = await ensureCustomerSessionRecordAsync(session);
    await updateCustomerNameAsync(customer.id, trimmedName);

    // تجديد الجلسة بالاسم الجديد
    const newSessionToken = signCustomerSession(customer.id, session.phoneNormalized, trimmedName);

    const response = NextResponse.json({
      success: true,
      message: "تم تحديث الاسم بنجاح.",
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: trimmedName,
      },
    });

    response.cookies.set({
      name: CUSTOMER_COOKIE_NAME,
      value: newSessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("[customer-profile-api] PATCH Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر تحديث الاسم." }, { status: 500 });
  }
}
