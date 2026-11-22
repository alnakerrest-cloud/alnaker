import { NextResponse } from "next/server";
import { getMenuSettingsAsync } from "@/lib/orders-store";
import {
  normalizeOrderingMode,
  ORDERING_MODE_FEATURES,
  ORDERING_MODES_META,
} from "@/lib/order-settings-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getMenuSettingsAsync();
    const normalizedMode = normalizeOrderingMode(settings.mode);
    const features = ORDERING_MODE_FEATURES[normalizedMode];
    const meta = ORDERING_MODES_META[normalizedMode];

    return NextResponse.json({
      mode: settings.mode,
      normalizedMode,
      features,
      isOrderable: features.allowOrderCreation,
      meta: {
        titleAr: meta.titleAr,
        titleEn: meta.titleEn,
        badgeAr: meta.badgeAr,
        badgeEn: meta.badgeEn,
      },
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
        mode: "WHATSAPP_DATABASE",
        normalizedMode: "WHATSAPP_DATABASE",
        features: ORDERING_MODE_FEATURES.WHATSAPP_DATABASE,
        isOrderable: true,
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
