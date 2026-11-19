import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { revokeAllUserSessions } from "@/lib/users-store";
import { logAction } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // RBAC: Only OWNER / ADMIN can revoke sessions of other users
    if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "غير مصرح لك بإلغاء جلسات المستخدمين", code: "RBAC_REVOKE_SESSIONS_FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const count = revokeAllUserSessions(id);

    try {
      await logAction({
        adminId: admin.id,
        action: "update",
        entityType: "AdminUser",
        entityId: id,
        summaryAr: `إلغاء جميع الجلسات النشطة للمستخدم (${count} جلسة)`,
      });
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ success: true, count, message: `تم إلغاء ${count} جلسة نشطة للمستخدم بنجاح` });
  } catch (error: any) {
    return NextResponse.json({ error: "حدث خطأ أثناء إلغاء الجلسات" }, { status: 500 });
  }
}
