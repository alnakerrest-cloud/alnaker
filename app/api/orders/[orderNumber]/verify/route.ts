import { NextRequest, NextResponse } from "next/server";
import { getOrderByNumber, getOrderByVerification } from "@/lib/orders-store";

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return "***";
  const start = phone.slice(0, 3);
  const end = phone.slice(-3);
  return `${start}****${end}`;
}

function maskName(name?: string): string {
  if (!name) return "عميل ناير";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!orderNumber) {
      return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const order = getOrderByNumber(orderNumber);
    if (!order) {
      return NextResponse.json({ error: "لم يتم العثور على طلب بهذا الرقم", verified: false }, { status: 404 });
    }

    const isTokenValid = Boolean(token && token === order.verificationToken);
    const isOfficiallyConfirmed = [
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "COMPLETED",
    ].includes(order.status);

    // Return sanitized public verification summary
    return NextResponse.json({
      verified: isOfficiallyConfirmed && isTokenValid,
      isOfficiallyConfirmed,
      orderNumber: order.orderNumber,
      verificationCode: order.verificationCode,
      status: order.status,
      type: order.type,
      branchName: order.branchNameAr,
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
      confirmedBy: order.confirmedBy ? "إدارة قرية الناقر" : undefined,
      customerNameMasked: maskName(order.customerName),
      customerPhoneMasked: maskPhone(order.customerPhone),
      itemCount: order.items.reduce((sum, it) => sum + it.quantity, 0),
      itemsSummary: order.items.map((it) => ({
        name: it.productName,
        variant: it.variantLabel,
        quantity: it.quantity,
      })),
      total: order.total,
      currency: order.currency,
      tier: isOfficiallyConfirmed ? "OFFICIAL_RECEIPT" : "PRE_ACCEPTANCE_SUMMARY",
    });
  } catch (error) {
    console.error("[verify] Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء التحقق من الطلب" }, { status: 500 });
  }
}
