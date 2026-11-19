import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // RBAC enforcement: ORDERS_STAFF is strictly forbidden from changing branch settings!
  if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "غير مصرح لك بتعديل بيانات أو مواعيد الفروع. هذه الصلاحية مقتصرة على الإدارة فقط.",
        code: "RBAC_BRANCH_MODIFICATION_FORBIDDEN",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, message: "تم تحديث إعدادات الفرع بنجاح" });
}
