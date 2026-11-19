import { NextRequest, NextResponse } from "next/server";
import { getOrderByVerification } from "@/lib/orders-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || request.headers.get("x-verification-token");

    if (!token) {
      return NextResponse.json(
        { error: "رمز التحقق مطلوب لمتابعة حالة الطلب." },
        { status: 401 }
      );
    }

    const cleanNumber = decodeURIComponent(orderNumber || "").trim();
    const order = getOrderByVerification(cleanNumber, token);

    if (!order) {
      return NextResponse.json(
        { error: "طلب غير موجود أو رمز التحقق غير صالح." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      status: order.status,
      confirmedAt: order.confirmedAt,
      confirmedBy: order.confirmedBy,
      rejectionReason: order.rejectionReason,
      cancellationReason: order.cancellationReason,
      timeline: order.timeline,
      updatedAt: order.updatedAt,
      total: order.total,
      currency: order.currency,
      itemCount: order.items.reduce((acc, i) => acc + i.quantity, 0),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "تعذّر جلب حالة الطلب." },
      { status: 500 }
    );
  }
}
