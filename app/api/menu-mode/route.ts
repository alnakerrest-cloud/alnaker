import { NextResponse } from "next/server";
import { getMenuSettings } from "@/lib/orders-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = getMenuSettings();
    return NextResponse.json({
      mode: settings.mode,
      closureMessageAr: settings.closureMessageAr,
      closureMessageEn: settings.closureMessageEn,
      allowDelivery: settings.allowDelivery,
      allowTakeaway: settings.allowTakeaway,
      enableNotice: settings.enableNotice ?? true,
      noticeTitleAr: settings.noticeTitleAr || "الطلبات متوقفة مؤقتًا",
      noticeTitleEn: settings.noticeTitleEn || "Ordering is temporarily unavailable",
      noticeMessageAr: settings.noticeMessageAr || "يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا.",
      noticeMessageEn: settings.noticeMessageEn || "You can browse our menu and prices, but orders are not being accepted right now.",
      reasonCode: settings.reasonCode || "HIGH_ORDER_VOLUME",
      expectedResumeAt: settings.expectedResumeAt || "",
      displayPosition: settings.displayPosition || "TOP_BANNER",
      branchOverrides: settings.branchOverrides,
    });
  } catch (error) {
    console.error("[menu-mode] Error:", error);
    return NextResponse.json(
      {
        mode: "VIEW_AND_ORDER",
        closureMessageAr: "",
        closureMessageEn: "",
        allowDelivery: true,
        allowTakeaway: true,
        enableNotice: false,
        noticeTitleAr: "",
        noticeTitleEn: "",
        noticeMessageAr: "",
        noticeMessageEn: "",
        reasonCode: "CUSTOM",
        expectedResumeAt: "",
        displayPosition: "TOP_BANNER",
        branchOverrides: {},
      },
      { status: 200 }
    );
  }
}
