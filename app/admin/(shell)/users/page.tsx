import { requireAdmin } from "@/lib/auth";
import { listSanitizedUsers } from "@/lib/users-store";
import UserManagementClient from "@/components/admin/UserManagementClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin(["OWNER", "ADMIN"]);
  const users = await listSanitizedUsers();

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>إدارة المستخدمين والصلاحيات</h1>
          <p className="admin-topbar-subtitle">
            نظام التحكم في الوصول المعتمد على الأدوار (Role-Based Access Control)
          </p>
        </div>
      </div>

      <div className="admin-panel">
        <UserManagementClient
          initialUsers={users}
          currentAdminId={admin.id}
          currentAdminRole={admin.role}
        />
      </div>
    </>
  );
}
