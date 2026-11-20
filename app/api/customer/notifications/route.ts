// app/api/customer/notifications/route.ts
// ==============================================================================
// إدارة إشعارات العميل الحقيقية (Customer Notifications API)
// محمي: يعرض الإشعارات المرتبطة بالأحداث الحقيقية للطلبات مع إمكانية التحديد كمقروء
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
} from "@/lib/customer-session";
import {
  getCustomerNotificationsAsync,
  getUnreadNotificationCountAsync,
  markNotificationAsReadAsync,
  markAllNotificationsAsReadAsync,
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
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const [notifications, unreadCount] = await Promise.all([
      getCustomerNotificationsAsync(customerId, limit),
      getUnreadNotificationCountAsync(customerId),
    ]);

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (err: any) {
    console.error("[customer-notifications-api] GET Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر جلب الإشعارات." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const customerId = await getAuthorizedCustomerId(request);
    if (!customerId) {
      return NextResponse.json({ error: "غير مصرح به." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, notificationId } = body;

    if (action === "mark_all_read") {
      await markAllNotificationsAsReadAsync(customerId);
      return NextResponse.json({ success: true, message: "تم تحديد كل الإشعارات كمقروءة." });
    }

    if (action === "mark_read" && notificationId) {
      const ok = await markNotificationAsReadAsync(customerId, notificationId);
      if (!ok) {
        return NextResponse.json({ error: "الإشعار غير موجود." }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "تم تحديد الإشعار كمقروء." });
    }

    return NextResponse.json({ error: "إجراء غير مدعوم." }, { status: 400 });
  } catch (err: any) {
    console.error("[customer-notifications-api] PATCH Error:", err?.message || err);
    return NextResponse.json({ error: "تعذّر تحديث الإشعار." }, { status: 500 });
  }
}
