'use client';

import React, { useState } from 'react';
import type { SanitizedUser, AdminRole } from '@/lib/users-store';

interface UserManagementClientProps {
  initialUsers: SanitizedUser[];
  currentAdminId: string;
  currentAdminRole: string;
}

export default function UserManagementClient({
  initialUsers,
  currentAdminId,
  currentAdminRole,
}: UserManagementClientProps) {
  const [users, setUsers] = useState<SanitizedUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create User Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('ORDERS_STAFF');
  const [newMustChange, setNewMustChange] = useState(true);

  // Edit User Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SanitizedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<AdminRole>('ORDERS_STAFF');
  const [editActive, setEditActive] = useState(true);

  // Reset Password Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<SanitizedUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          displayName: newName,
          role: newRole,
          mustChangePassword: newMustChange,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في إنشاء المستخدم');

      showNotification('success', `تم إنشاء الحساب بنجاح: ${data.user.displayName}`);
      setCreateModalOpen(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      await refreshUsers();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editName,
          role: editRole,
          isActive: editActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في تحديث المستخدم');

      showNotification('success', 'تم تحديث بيانات المستخدم بنجاح');
      setEditModalOpen(false);
      await refreshUsers();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: tempPassword,
          mustChangePassword: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في إعادة تعيين كلمة المرور');

      showNotification('success', `تم تعيين كلمة مرور جديدة لحساب ${resetPasswordUser.email}`);
      setResetModalOpen(false);
      setTempPassword('');
      await refreshUsers();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSessions = async (userId: string, email: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في إلغاء كافة الجلسات النشطة للمستخدم ${email}؟`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/revoke-sessions`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في إلغاء الجلسات');
      showNotification('success', data.message || 'تم إلغاء الجلسات بنجاح');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`تحذير: هل أنت متأكد من حذف الحساب ${email} نهائياً؟`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في حذف المستخدم');

      showNotification('success', 'تم حذف المستخدم بنجاح');
      await refreshUsers();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>إدارة المستخدمين والصلاحيات (RBAC)</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            التحكم في أدوار المشرفين وموظفي الطلبات وتعيين كلمات المرور والجلسات
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewPassword(generateRandomPassword());
            setCreateModalOpen(true);
          }}
          style={{
            padding: '9px 18px',
            background: '#b8860b',
            color: '#fff',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>➕</span> إضافة مستخدم جديد
        </button>
      </div>

      {notification && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            background: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: notification.type === 'success' ? '#166534' : '#991b1b',
            border: notification.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
          }}
        >
          {notification.type === 'success' ? '✅ ' : '⚠️ '}
          {notification.message}
        </div>
      )}

      {/* Users Table */}
      <div className="admin-table-wrap" style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <table className="admin-table admin-table-cards">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>الدور (Role)</th>
              <th>الحالة</th>
              <th>تاريخ الإنشاء</th>
              <th>آخر تسجيل دخول</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="cell-primary" data-label="المستخدم">
                  <strong>{u.displayName}</strong>
                  {u.id === currentAdminId && (
                    <span style={{ fontSize: '11px', color: '#2563eb', marginRight: '6px' }}>(أنت)</span>
                  )}
                </td>
                <td data-label="البريد الإلكتروني" dir="ltr" style={{ textAlign: 'right' }}>
                  {u.email}
                </td>
                <td data-label="الدور">
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background:
                        u.role === 'OWNER'
                          ? '#fef3c7'
                          : u.role === 'ADMIN'
                          ? '#e0e7ff'
                          : u.role === 'ORDERS_STAFF'
                          ? '#dcfce7'
                          : '#f3f4f6',
                      color:
                        u.role === 'OWNER'
                          ? '#92400e'
                          : u.role === 'ADMIN'
                          ? '#3730a3'
                          : u.role === 'ORDERS_STAFF'
                          ? '#166534'
                          : '#4b5563',
                    }}
                  >
                    {u.role === 'OWNER'
                      ? 'المالك (Owner)'
                      : u.role === 'ADMIN'
                      ? 'مدير (Admin)'
                      : u.role === 'ORDERS_STAFF'
                      ? 'موظف طلبات (Staff)'
                      : u.role}
                  </span>
                </td>
                <td data-label="الحالة">
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: u.isActive ? '#dcfce7' : '#fee2e2',
                      color: u.isActive ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {u.isActive ? '● نشط' : '○ معطل'}
                  </span>
                </td>
                <td data-label="تاريخ الإنشاء" style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                </td>
                <td data-label="آخر تسجيل دخول" style={{ fontSize: '12px', color: '#64748b' }}>
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ar-EG') : 'لم يدخل بعد'}
                </td>
                <td data-label="الإجراءات">
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setEditName(u.displayName);
                        setEditRole(u.role);
                        setEditActive(u.isActive);
                        setEditModalOpen(true);
                      }}
                      style={{
                        padding: '4px 8px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetPasswordUser(u);
                        setTempPassword(generateRandomPassword());
                        setResetModalOpen(true);
                      }}
                      style={{
                        padding: '4px 8px',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      🔑 كلمة المرور
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeSessions(u.id, u.email)}
                      style={{
                        padding: '4px 8px',
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        color: '#991b1b',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      🚪 إلغاء الجلسات
                    </button>
                    {u.id !== currentAdminId && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        style={{
                          padding: '4px 8px',
                          background: '#fff',
                          border: '1px solid #dc2626',
                          color: '#dc2626',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️ حذف
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0f172a' }}>إنشاء حساب مستخدم جديد</h3>
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="محمد أحمد"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="staff@naqer.local"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>الدور والصلاحيات *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AdminRole)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="ORDERS_STAFF">ORDERS_STAFF (إدارة الطلبات فقط - بدون تعديل المنيو)</option>
                  <option value="ADMIN">ADMIN (مدير النظام - كامل الصلاحيات)</option>
                  <option value="OWNER">OWNER (المالك - كامل الصلاحيات)</option>
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>كلمة المرور المؤقتة *</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    توليد كلمة عشوائية
                  </button>
                </div>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newMustChange}
                    onChange={(e) => setNewMustChange(e.target.checked)}
                  />
                  إلزام المستخدم بتغيير كلمة المرور عند أول تسجيل دخول
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#b8860b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {loading ? 'جاري الحفظ...' : 'إنشاء الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0f172a' }}>تعديل حساب: {selectedUser.email}</h3>
            <form onSubmit={handleUpdateUser}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>الدور والصلاحيات</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as AdminRole)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="ORDERS_STAFF">ORDERS_STAFF (إدارة الطلبات فقط)</option>
                  <option value="ADMIN">ADMIN (مدير النظام)</option>
                  <option value="OWNER">OWNER (المالك)</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                  />
                  الحساب نشط ومفعّل (إلغاء التفعيل يمنع تسجيل الدخول ويلغي الجلسات فوراً)
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {loading ? 'جاري التحديث...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && resetPasswordUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#0f172a' }}>تعيين كلمة مرور جديدة</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              للمستخدم: <strong>{resetPasswordUser.email}</strong>
            </p>
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>كلمة المرور الجديدة</label>
                  <button
                    type="button"
                    onClick={() => setTempPassword(generateRandomPassword())}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    توليد كلمة عشوائية
                  </button>
                </div>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {loading ? 'جاري الحفظ...' : 'تأكيد التغيير'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
