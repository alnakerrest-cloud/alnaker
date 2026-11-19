"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const LINKS = [
  { href: "/admin/dashboard", label: "الرئيسية", icon: "📊" },
  { href: "/admin/orders", label: "الطلبات", icon: "🧾" },
  { href: "/admin/order-settings", label: "إعدادات الطلبات", icon: "🛠️" },
  { href: "/admin/categories", label: "الأقسام", icon: "📂" },
  { href: "/admin/products", label: "المنتجات", icon: "🍲" },
  { href: "/admin/offers", label: "العروض والخصومات", icon: "🏷️" },
  { href: "/admin/addons", label: "الإضافات", icon: "➕" },
  { href: "/admin/branches", label: "الفروع", icon: "📍" },
  { href: "/admin/images", label: "إدارة الصور", icon: "🖼️" },
  { href: "/admin/import", label: "استيراد المنيو", icon: "📥" },
  { href: "/admin/users", label: "المستخدمون والصلاحيات", icon: "👥" },
  { href: "/admin/settings", label: "إعدادات المطعم", icon: "⚙️" },
  { href: "/admin/audit", label: "سجل التعديلات", icon: "📋" },
];

interface AdminSidebarProps {
  adminName: string;
  adminRole?: string;
  logoutAction: () => Promise<void>;
}

export default function AdminSidebar({
  adminName,
  adminRole = "OWNER",
  logoutAction,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close drawer when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Top Header Bar (< 860px) */}
      <header className="admin-mobile-header" aria-label="شريط لوحة التحكم">
        <div className="admin-mobile-brand">
          <Logo size={26} variant="gold" emblemOnly />
          <span className="admin-mobile-brand-name">قرية الناقر</span>
          <span className="admin-mobile-brand-badge">لوحة التحكم</span>
        </div>
        <div className="admin-mobile-header-actions">
          <span className="admin-mobile-user">{adminName}</span>
          <button
            type="button"
            className="admin-hamburger-btn"
            aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span className="admin-hamburger-icon" aria-hidden="true">
              {isOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </header>

      {/* Backdrop for Mobile Drawer */}
      {isOpen && (
        <div
          className="admin-drawer-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Permanent on >= 860px, Slide Drawer on < 860px */}
      <aside
        className={`admin-sidebar${isOpen ? " drawer-open" : ""}`}
        aria-label="القائمة الجانبية للوحة التحكم"
      >
        <div className="admin-sidebar-header">
          <div className="admin-brand" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Logo size={32} variant="gold" emblemOnly />
            <span>قرية الناقر</span>
          </div>
          <button
            type="button"
            className="admin-drawer-close"
            aria-label="إغلاق القائمة"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="admin-sidebar-profile">
          <div className="admin-sidebar-avatar" aria-hidden="true">
            👤
          </div>
          <div className="admin-sidebar-user-details">
            <span className="admin-sidebar-name">{adminName}</span>
            <span className="admin-sidebar-role">
              {adminRole === "ORDERS_STAFF"
                ? "موظف طلبات (Staff)"
                : adminRole === "OWNER"
                ? "المالك (Owner)"
                : "مشرف النظام (Admin)"}
            </span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="روابط لوحة التحكم">
          {(adminRole === "ORDERS_STAFF"
            ? [{ href: "/admin/orders", label: "الطلبات", icon: "🧾" }]
            : LINKS
          ).map((l) => {
            const isActive =
              pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`admin-nav-link${isActive ? " active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="admin-nav-icon" aria-hidden="true">
                  {l.icon}
                </span>
                <span>{l.label}</span>
              </Link>
            );
          })}
          <div className="admin-nav-sep" />
          <a
            className="admin-nav-link admin-nav-public-link"
            href="/ar"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="admin-nav-icon" aria-hidden="true">
              ↗
            </span>
            <span>فتح الموقع العام</span>
          </a>
        </nav>

        <div className="admin-sidebar-footer">
          <form action={logoutAction}>
            <button
              type="submit"
              className="admin-btn admin-nav-logout"
              style={{ width: "100%" }}
            >
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
