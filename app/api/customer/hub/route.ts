// app/api/customer/hub/route.ts
// ==============================================================================
// لوحة مركز العميل الموحد (Customer Hub Unified Overview API)
// مصدر وحيد للبيانات: يجمع إحصائيات الطلبات والعناوين والمفضلة والإشعارات الحقيقية
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
} from "@/lib/customer-session";
import { getCustomerByIdAsync } from "@/lib/customer-store";
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
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;
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

    // استرجاع بيانات العميل الدائمة
    const [customerRecord, orders, addresses, favoriteIds, unreadCount] = await Promise.all([
      getCustomerByIdAsync(session.customerId),
      getOrdersByCustomerPhoneAsync(session.phoneNormalized, session.customerId, 50),
      getCustomerAddressesAsync(session.customerId),
      getCustomerFavoriteProductIdsAsync(session.customerId),
      getUnreadNotificationCountAsync(session.customerId),
    ]);

    const activeOrders = orders.filter((o) => !TERMINAL_STATUSES.includes(o.status));
    const completedOrders = orders.filter((o) => o.status === "COMPLETED");
    const latestActiveOrder = activeOrders.length > 0 ? activeOrders[0] : null;
    const defaultAddress = addresses.find((a) => a.isDefault) || (addresses.length > 0 ? addresses[0] : null);

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: session.customerId,
        phone: customerRecord?.phone || session.phoneNormalized,
        name: customerRecord?.name || session.customerName,
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
