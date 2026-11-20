import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getMenuSettingsAsync, updateMenuSettingsAsync, type MenuModeSettings } from "@/lib/orders-store";
import { getSiteData } from "@/lib/site-db";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin(["OWNER", "ADMIN"]);
    const settings = await getMenuSettingsAsync();
    const siteData = await getSiteData("ar");

    return NextResponse.json({
      settings,
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

    if (body.mode && !["VIEW_AND_ORDER", "VIEW_ONLY", "TEMPORARILY_CLOSED"].includes(body.mode)) {
      return NextResponse.json({ error: "وضع تشغيل غير صالح." }, { status: 400 });
    }

    const updated = await updateMenuSettingsAsync({
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.displayName || admin.email,
    });

    try {
      revalidatePath("/ar");
      revalidatePath("/en");
    } catch (e) {
      // ignore revalidate errors
    }

    try {
      await logAction({
        adminId: admin.id,
        action: "update",
        entityType: "OrderSettings",
        entityId: "global-orders-settings",
        summaryAr: `تحديث إعدادات الطلبات بواسطة ${admin.displayName}: الوضع ${updated.mode}`,
        changes: { after: updated },
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
