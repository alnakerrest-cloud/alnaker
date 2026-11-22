import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  getMenuSettingsAsync,
  updateMenuSettingsAsync,
  invalidateMenuSettingsCache,
  type MenuModeSettings,
} from "@/lib/orders-store";
import {
  normalizeOrderingMode,
  ORDERING_MODES_META,
  type OrderingMode,
} from "@/lib/order-settings-types";
import { getSiteData } from "@/lib/site-db";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin(["OWNER", "ADMIN"]);
    const settings = await getMenuSettingsAsync(true);
    const siteData = await getSiteData("ar");
    const normalizedMode = normalizeOrderingMode(settings.mode);

    return NextResponse.json({
      settings: {
        ...settings,
        mode: normalizedMode,
      },
      branches: siteData.branches.map((b) => ({
        id: b.id,
        nameAr: b.nameAr,
        nameEn: b.nameEn,
        addressAr: b.addressAr,
        isOrderable: b.isOrderable,
        isActive: b.isActive,
        openingHoursAr: b.openingHoursAr,
        openingHoursEn: b.openingHoursEn,
      })),
      userRole: admin.role,
    });
  } catch (err: any) {
    if (err.message?.includes("FORBIDDEN") || err.message?.includes("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "غير مصرح لك بالوصول لإعدادات الطلبات." }, { status: 403 });
    }
    return NextResponse.json({ error: "تعذّر جلب إعدادات الطلبات." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(["OWNER", "ADMIN"]);
    const body = (await request.json()) as Partial<MenuModeSettings>;

    const ALLOWED_MODES = [
      "FULL_ORDERING",
      "WHATSAPP_DATABASE",
      "DISPLAY_ONLY",
      "TEMPORARILY_CLOSED",
      "VIEW_AND_ORDER",
      "VIEW_ONLY",
    ];

    if (body.mode && !ALLOWED_MODES.includes(body.mode)) {
      return NextResponse.json({ error: "وضع تشغيل غير صالح." }, { status: 400 });
    }

    const current = await getMenuSettingsAsync(true);
    const previousMode = normalizeOrderingMode(current.mode);
    const newMode = body.mode ? normalizeOrderingMode(body.mode) : previousMode;

    const updated = await updateMenuSettingsAsync({
      ...body,
      ...(body.mode ? { mode: newMode } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: admin.displayName || admin.email,
    });

    invalidateMenuSettingsCache();

    try {
      revalidatePath("/ar");
      revalidatePath("/en");
      revalidatePath("/admin/orders");
      revalidatePath("/admin/order-settings");
    } catch (e) {
      // ignore revalidate errors
    }

    try {
      const prevMeta = ORDERING_MODES_META[previousMode]?.titleAr || previousMode;
      const newMeta = ORDERING_MODES_META[newMode]?.titleAr || newMode;
      const modeChanged = previousMode !== newMode;

      await logAction({
        adminId: admin.id,
        action: "update",
        entityType: "OrderSettings",
        entityId: "global-orders-settings",
        summaryAr: modeChanged
          ? `تبديل وضع تشغيل المنيو من [${prevMeta}] إلى [${newMeta}] بواسطة ${admin.displayName || admin.email}`
          : `تحديث إعدادات الطلبات بواسطة ${admin.displayName || admin.email} (الوضع الحالي: ${newMeta})`,
        changes: {
          before: { mode: previousMode },
          after: updated,
        },
      });
    } catch (e) {
      // ignore audit logging failures
    }

    return NextResponse.json({
      success: true,
      settings: updated,
      message: "تم حفظ إعدادات الطلبات بنجاح.",
    });
  } catch (err: any) {
    if (err.message?.includes("FORBIDDEN") || err.message?.includes("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "غير مصرح لك بتعديل إعدادات الطلبات." }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "فشل في حفظ إعدادات الطلبات." }, { status: 500 });
  }
}
