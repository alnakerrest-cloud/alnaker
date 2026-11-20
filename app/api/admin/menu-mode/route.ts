import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getMenuSettingsAsync, updateMenuSettingsAsync, type MenuMode } from "@/lib/orders-store";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح لك بالوصول إلى إعدادات المنيو" }, { status: 403 });
  }
  const settings = await getMenuSettingsAsync();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح لك بتعديل أوضاع تشغيل المنيو" }, { status: 403 });
    }

    const body = await request.json();
    const { mode, closureMessageAr, closureMessageEn, allowDelivery, allowTakeaway, branchOverrides } = body;

    const current = await getMenuSettingsAsync();
    const updated = await updateMenuSettingsAsync({
      ...(mode && { mode: mode as MenuMode }),
      ...(closureMessageAr !== undefined && { closureMessageAr }),
      ...(closureMessageEn !== undefined && { closureMessageEn }),
      ...(allowDelivery !== undefined && { allowDelivery: Boolean(allowDelivery) }),
      ...(allowTakeaway !== undefined && { allowTakeaway: Boolean(allowTakeaway) }),
      ...(branchOverrides && { branchOverrides }),
    });

    try {
      await logAction({
        adminId: admin.id,
        action: "update",
        entityType: "RestaurantSettings",
        entityId: "menu_mode",
        summaryAr: `تحديث وضع تشغيل المنيو إلى ${updated.mode}`,
        changes: { before: current, after: updated },
      });
    } catch (e) {
      // ignore audit log error
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("[admin-menu-mode] Error:", error);
    return NextResponse.json({ error: "فشل في تحديث إعدادات المنيو" }, { status: 500 });
  }
}
