// app/api/customer/hub/route.ts
// ==============================================================================
// لوحة مركز العميل الموحد (Customer Hub Unified Overview API)
// مصدر وحيد للبيانات: يجمع إحصائيات الطلبات والعناوين والمفضلة والإشعارات الحقيقية
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
  signCustomerSession,
} from "@/lib/customer-session";
import {
  getCustomerByIdAsync,
  ensureCustomerSessionRecordAsync,
  updateCustomerNameAsync,
} from "@/lib/customer-store";
import {
  getCustomerAddressesAsync,
  getCustomerFavoriteProductIdsAsync,
  getUnreadNotificationCountAsync,
} from "@/lib/customer-hub-store";
import {
  getOrdersByCustomerPhoneAsync,
  type OrderRecord,
  type OrderStatus,
} from "@/lib/orders-store";

export const dynamic = "force-dynamic";

const TERMINAL_STATUSES: OrderStatus[] = ["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED"];

export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const token = cookieToken || bearerToken;
    const session = verifyCustomerSession(token);

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        customer: null,
        overview: null,
      });
    }

    // استرجاع وضمان وجود بيانات العميل الدائمة في Neon DB
    let customerRecord = await ensureCustomerSessionRecordAsync(session).catch(() => null);
    if (!customerRecord) {
      customerRecord = await getCustomerByIdAsync(session.customerId);
    }

    const [orders, addresses, favoriteIds, unreadCount] = await Promise.all([
      getOrdersByCustomerPhoneAsync(session.phoneNormalized, session.customerId, 50),
      getCustomerAddressesAsync(customerRecord?.id || session.customerId),
      getCustomerFavoriteProductIdsAsync(customerRecord?.id || session.customerId),
      getUnreadNotificationCountAsync(customerRecord?.id || session.customerId),
    ]);

    // استرجاع الاسم الموثق: من قاعدة البيانات -> أو الجلسة -> أو أحدث طلب سابق
    let resolvedName = customerRecord?.name || session.customerName;
    if (!resolvedName && orders.length > 0) {
      const orderWithName = orders.find((o) => o.customerName && o.customerName.trim());
      if (orderWithName && orderWithName.customerName) {
        resolvedName = orderWithName.customerName.trim();
        if (customerRecord) {
          await updateCustomerNameAsync(customerRecord.id, resolvedName);
          customerRecord.name = resolvedName;
        }
      }
    }

    const activeOrders = orders.filter((o) => !TERMINAL_STATUSES.includes(o.status));
    const completedOrders = orders.filter((o) => o.status === "COMPLETED");
    const latestActiveOrder = activeOrders.length > 0 ? activeOrders[0] : null;
    const defaultAddress = addresses.find((a) => a.isDefault) || (addresses.length > 0 ? addresses[0] : null);

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: customerRecord?.id || session.customerId,
        phone: customerRecord?.phone || session.phoneNormalized,
        name: resolvedName || undefined,
        createdAt: customerRecord?.createdAt || new Date(session.expiresAt - 60 * 24 * 3600 * 1000).toISOString(),
      },
      overview: {
        activeOrdersCount: activeOrders.length,
        completedOrdersCount: completedOrders.length,
        totalOrdersCount: orders.length,
        lastOrderDate: orders.length > 0 ? orders[0].createdAt : null,
        addressesCount: addresses.length,
        defaultAddress,
        favoritesCount: favoriteIds.length,
        unreadNotificationsCount: unreadCount,
        latestActiveOrder: latestActiveOrder
          ? {
              orderNumber: latestActiveOrder.orderNumber,
              status: latestActiveOrder.status,
              type: latestActiveOrder.type,
              total: latestActiveOrder.total,
              currency: latestActiveOrder.currency || "ج.م",
              createdAt: latestActiveOrder.createdAt,
              branchNameAr: latestActiveOrder.branchNameAr,
              branchNameEn: latestActiveOrder.branchNameEn,
              verificationToken: latestActiveOrder.verificationToken,
              itemsCount: latestActiveOrder.items.reduce((acc, i) => acc + i.quantity, 0),
            }
          : null,
      },
    });
  } catch (err: any) {
    console.error("[customer-hub-api] Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر جلب بيانات مركز العميل." }, { status: 500 });
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
    console.error("[customer-hub-api] PATCH Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر تحديث الاسم." }, { status: 500 });
  }
}
