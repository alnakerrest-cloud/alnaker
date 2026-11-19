import { NextRequest, NextResponse } from "next/server";
import { confirmCustomerSent, confirmCustomerSentAsync, getOrderByNumber } from "@/lib/orders-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    if (!orderNumber) {
      return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const order = await confirmCustomerSentAsync(orderNumber);
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: order.status,
      orderNumber: order.orderNumber,
      message: "تم تسجيل تأكيد إرسال الطلب عبر واتساب بنجاح. الطلب الآن قيد مراجعة المطعم.",
    });
  } catch (error) {
    console.error("[confirm-sent] Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تأكيد الإرسال" }, { status: 500 });
  }
}
