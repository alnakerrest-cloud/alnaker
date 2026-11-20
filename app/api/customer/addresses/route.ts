// app/api/customer/addresses/route.ts
// ==============================================================================
// إدارة عناوين العميل المحفوظة (Customer Addresses API)
// محمي: يتطلب جلسة عميل موقعة ويتحقق من ملكية الـ customerId لكل عملية
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
} from "@/lib/customer-session";
import {
  ensureCustomerSessionRecordAsync,
} from "@/lib/customer-store";
import {
  getCustomerAddressesAsync,
  createCustomerAddressAsync,
  updateCustomerAddressAsync,
  setDefaultCustomerAddressAsync,
  deleteCustomerAddressAsync,
} from "@/lib/customer-hub-store";

export const dynamic = "force-dynamic";

function getAuthorizedCustomer(request: NextRequest): { customerId: string; phoneNormalized: string; customerName?: string } | null {
  const cookieToken = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const token = cookieToken || bearerToken;
  const session = verifyCustomerSession(token);
  if (!session) return null;

  return { customerId: session.customerId, phoneNormalized: session.phoneNormalized, customerName: session.customerName };
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthorizedCustomer(request);
    if (!auth) {
      // Guest or anonymous visitor without session: gracefully return empty addresses with 200 OK
      return NextResponse.json({ success: true, addresses: [] }, { status: 200 });
    }

    // Ensure customer DB record exists in background
    ensureCustomerSessionRecordAsync(auth).catch(() => {});

    const addresses = await getCustomerAddressesAsync(auth.customerId);
    return NextResponse.json({ success: true, addresses });
  } catch (err: any) {
    console.error("[customer-addresses-api] GET Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر جلب العناوين." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthorizedCustomer(request);
    if (!auth) {
      return NextResponse.json({ error: "غير مصرح به." }, { status: 401 });
    }

    const cust = await ensureCustomerSessionRecordAsync(auth);

    const body = await request.json().catch(() => ({}));
    const { label, city, area, street, building, floor, apartment, notes, isDefault } = body;

    if (!label || typeof label !== "string" || !label.trim()) {
      return NextResponse.json({ error: "اسم العنوان مطلوب (مثال: المنزل، العمل)." }, { status: 400 });
    }
    if (!street || typeof street !== "string" || !street.trim()) {
      return NextResponse.json({ error: "تفاصيل الشارع والمنطقة مطلوبة." }, { status: 400 });
    }

    const address = await createCustomerAddressAsync(cust.id, {
      label: label.slice(0, 50),
      city: typeof city === "string" ? city.slice(0, 100) : undefined,
      area: typeof area === "string" ? area.slice(0, 100) : undefined,
      street: street.slice(0, 200),
      building: typeof building === "string" ? building.slice(0, 50) : undefined,
      floor: typeof floor === "string" ? floor.slice(0, 20) : undefined,
      apartment: typeof apartment === "string" ? apartment.slice(0, 20) : undefined,
      notes: typeof notes === "string" ? notes.slice(0, 300) : undefined,
      isDefault: Boolean(isDefault),
    });

    return NextResponse.json({ success: true, address, message: "تم حفظ العنوان بنجاح." }, { status: 201 });
  } catch (err: any) {
    console.error("[customer-addresses-api] POST Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر إضافة العنوان." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthorizedCustomer(request);
    if (!auth) {
      return NextResponse.json({ error: "غير مصرح به." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { addressId, action, ...updates } = body;

    if (!addressId || typeof addressId !== "string") {
      return NextResponse.json({ error: "معرّف العنوان مطلوب." }, { status: 400 });
    }

    if (action === "set_default") {
      const updated = await setDefaultCustomerAddressAsync(auth.customerId, addressId);
      if (!updated) {
        return NextResponse.json({ error: "العنوان غير موجود أو لا تملك صلاحية تعديله." }, { status: 404 });
      }
      return NextResponse.json({ success: true, address: updated, message: "تم تعيين العنوان كافتراضي." });
    }

    const updated = await updateCustomerAddressAsync(auth.customerId, addressId, updates);
    if (!updated) {
      return NextResponse.json({ error: "العنوان غير موجود أو لا تملك صلاحية تعديله." }, { status: 404 });
    }

    return NextResponse.json({ success: true, address: updated, message: "تم تحديث العنوان بنجاح." });
  } catch (err: any) {
    console.error("[customer-addresses-api] PATCH Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر تحديث العنوان." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = getAuthorizedCustomer(request);
    if (!auth) {
      return NextResponse.json({ error: "غير مصرح به." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const addressId = searchParams.get("id") || body?.id || body?.addressId;

    if (!addressId) {
      return NextResponse.json({ error: "معرّف العنوان مطلوب." }, { status: 400 });
    }

    const deleted = await deleteCustomerAddressAsync(auth.customerId, addressId);
    if (!deleted) {
      return NextResponse.json({ error: "تعذّر حذف العنوان أو أنه غير موجود." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "تم حذف العنوان بنجاح." });
  } catch (err: any) {
    console.error("[customer-addresses-api] DELETE Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر حذف العنوان." }, { status: 500 });
  }
}
