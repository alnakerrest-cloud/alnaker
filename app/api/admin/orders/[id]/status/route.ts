import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { updateOrderStatus, updateOrderStatusAsync, getOrderById, getOrderByIdAsync, type OrderStatus } from "@/lib/orders-store";
import { logAction } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, reason } = body;

    if (!status) {
      return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
    }

    const currentOrder = await getOrderByIdAsync(id);
    if (!currentOrder) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const actorName = `${admin.role === "OWNER" ? "المالك / المدير العام" : "مشرف"}: ${admin.displayName || admin.email || admin.id.slice(0, 8)}`;
    const result = await updateOrderStatusAsync(id, status as OrderStatus, actorName, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Try to log in audit system if possible
    try {
      await logAction({
        adminId: admin.id,
        action: "update",
        entityType: "Order",
        entityId: id,
        summaryAr: `تغيير حالة الطلب ${currentOrder.orderNumber} من ${currentOrder.status} إلى ${status}${reason ? ` (السبب: ${reason})` : ""}`,
        changes: {
          before: { status: currentOrder.status },
          after: { status, reason },
        },
      });
    } catch (auditErr) {
      console.warn("[admin-orders-status] audit log error:", auditErr);
    }

    return NextResponse.json({ success: true, order: result.order });
  } catch (error: any) {
    console.error("[admin-orders-status] Error:", error);
    return NextResponse.json({ error: "فشل في تحديث حالة الطلب" }, { status: 500 });
  }
}
