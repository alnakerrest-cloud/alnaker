import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getOrderById, getOrderByIdAsync } from "@/lib/orders-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderByIdAsync(id);
  if (!order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // Strict compliance: Orders can NEVER be permanently deleted, especially by staff!
  return NextResponse.json(
    {
      error: "حذف الطلبات نهائياً محظور أمنياً في النظام للحفاظ على سجلات المعاملات والتدقيق المالي. يمكنك تغيير حالة الطلب إلى ملغي (CANCELLED) مع تسجيل السبب.",
      code: "PERMANENT_ORDER_DELETION_FORBIDDEN",
    },
    { status: 403 }
  );
}
