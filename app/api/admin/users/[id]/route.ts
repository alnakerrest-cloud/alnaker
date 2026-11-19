import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import {
  findUserById,
  updateUser,
  deleteUser,
  type AdminRole,
} from "@/lib/users-store";
import { logAction } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // RBAC: Only OWNER / ADMIN can update users
    if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "غير مصرح لك بتعديل بيانات المستخدمين", code: "RBAC_USER_UPDATE_FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { displayName, role, isActive, mustChangePassword, newPassword } = body;

    const existing = findUserById(id);
    if (!existing) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    // Prevent staff from changing Admin password or upgrading themselves
    if (admin.role !== "OWNER" && (existing.role === "OWNER" || existing.role === "ADMIN") && existing.id !== admin.id) {
      return NextResponse.json(
        { error: "لا يمكن تعديل حساب المالك أو المدير العام من قبل مسؤول آخر" },
        { status: 403 }
      );
    }

    if (newPassword && newPassword.length < 8) {
      return NextResponse.json({ error: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف" }, { status: 400 });
    }

    const updated = await updateUser(id, {
      displayName,
      role: role as AdminRole,
      isActive,
      mustChangePassword,
      newPassword,
    });

    try {
      await logAction({
        adminId: admin.id,
        action: "update",
        entityType: "AdminUser",
        entityId: id,
        summaryAr: `تحديث بيانات المستخدم: ${updated.displayName} (${updated.email})`,
      });
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء تحديث المستخدم" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // RBAC: Only OWNER / ADMIN can delete users
    if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "غير مصرح لك بحذف المستخدمين", code: "RBAC_USER_DELETION_FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Cannot delete self
    if (id === admin.id) {
      return NextResponse.json({ error: "لا يمكنك حذف حسابك الشخصي الحالي" }, { status: 400 });
    }

    const result = deleteUser(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    try {
      await logAction({
        adminId: admin.id,
        action: "delete",
        entityType: "AdminUser",
        entityId: id,
        summaryAr: `حذف حساب المستخدم: ${id}`,
      });
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ success: true, message: "تم حذف المستخدم بنجاح" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء حذف المستخدم" },
      { status: 400 }
    );
  }
}
