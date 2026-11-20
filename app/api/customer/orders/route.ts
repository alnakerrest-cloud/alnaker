// app/api/customer/orders/route.ts
// ==============================================================================
// استرجاع ومتابعة طلبات العميل المصرح له فقط (Protected Customer Orders API)
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
  type CustomerSessionPayload,
} from "@/lib/customer-session";
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
    const session: CustomerSessionPayload | null = verifyCustomerSession(token);

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        activeOrders: [],
        previousOrders: [],
        totalOrders: 0,
        message: "لا توجد جلسة عميل نشطة.",
      });
    }

    // استرجاع طلبات العميل المرتبطة برقم هاتفه مع حد أقصى
    const orders: OrderRecord[] = await getOrdersByCustomerPhoneAsync(
      session.phoneNormalized,
      session.customerId,
      30
    );

    const activeOrders: OrderRecord[] = [];
    const previousOrders: OrderRecord[] = [];

    for (const ord of orders) {
      if (TERMINAL_STATUSES.includes(ord.status)) {
        previousOrders.push(ord);
      } else {
        activeOrders.push(ord);
      }
    }

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: session.customerId,
        phone: session.phoneNormalized,
        name: session.customerName,
      },
      activeOrders,
      previousOrders,
      totalOrders: orders.length,
      activeCount: activeOrders.length,
    });
  } catch (error: any) {
    console.error("[customer-orders-api] Error:", error?.message || error);
    return NextResponse.json(
      { error: "تعذّر جلب طلبات العميل." },
      { status: 500 }
    );
  }
}
