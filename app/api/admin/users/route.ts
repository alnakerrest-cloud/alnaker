import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import {
  listSanitizedUsers,
  createUser,
  type AdminRole,
} from "@/lib/users-store";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // RBAC: Only OWNER / ADMIN can list users and permissions
  if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
    return NextResponse.json(
      { error: "غير مصرح لك باستعراض بيانات المستخدمين والصلاحيات", code: "RBAC_USER_MANAGEMENT_FORBIDDEN" },
      { status: 403 }
    );
  }

  const users = await listSanitizedUsers();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // RBAC: Only OWNER / ADMIN can create users
    if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "غير مصرح لك بإنشاء مستخدمين جدد", code: "RBAC_USER_CREATION_FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, displayName, role, mustChangePassword } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "كلمة المرور يجب ألا تقل عن 8 أحرف" }, { status: 400 });
    }
    if (!displayName || !displayName.trim()) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }

    const validRoles: AdminRole[] = ["OWNER", "ADMIN", "EDITOR", "ORDERS_STAFF"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "الدور المحدد غير صالح" }, { status: 400 });
    }

    const newUser = await createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName.trim(),
      role,
      mustChangePassword: mustChangePassword !== false,
    });

    try {
      await logAction({
        adminId: admin.id,
        action: "create",
        entityType: "AdminUser",
        entityId: newUser.id,
        summaryAr: `إنشاء حساب مستخدم جديد: ${newUser.displayName} (${newUser.email}) بدور ${newUser.role}`,
      });
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إنشاء المستخدم" },
      { status: 400 }
    );
  }
}
