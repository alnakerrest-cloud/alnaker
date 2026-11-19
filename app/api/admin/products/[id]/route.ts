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

  // RBAC enforcement: ORDERS_STAFF is strictly forbidden from modifying products or prices!
  if (admin.role !== "OWNER" && admin.role !== "ADMIN" && admin.role !== "EDITOR") {
    return NextResponse.json(
      {
        error: "غير مصرح لك بتعديل المنتجات أو الأسعار. هذه الصلاحية مقتصرة على الإدارة فقط.",
        code: "RBAC_PRODUCT_MODIFICATION_FORBIDDEN",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, message: "تم تحديث المنتج بنجاح" });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // RBAC enforcement: Only OWNER / ADMIN can delete products!
  if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "غير مصرح لك بحذف المنتجات. صلاحية الحذف مقتصرة على مالك ومدير النظام فقط.",
        code: "RBAC_PRODUCT_DELETION_FORBIDDEN",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, message: "تم حذف المنتج بنجاح" });
}
