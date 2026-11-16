"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/dashboard", label: "الرئيسية" },
  { href: "/admin/categories", label: "الأقسام" },
  { href: "/admin/products", label: "المنتجات" },
  { href: "/admin/offers", label: "العروض والخصومات" },
  { href: "/admin/addons", label: "الإضافات" },
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/branches", label: "الفروع" },
  { href: "/admin/images", label: "إدارة الصور" },
  { href: "/admin/import", label: "استيراد المنيو" },
  { href: "/admin/settings", label: "إعدادات المطعم" },
  { href: "/admin/audit", label: "سجل التعديلات" },
];

export default function AdminNav({ fullName }: { fullName: string }) {
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label="التنقل الرئيسي">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`admin-nav-link${pathname === l.href || pathname.startsWith(l.href + "/") ? " active" : ""}`}
        >
          {l.label}
        </Link>
      ))}
      <div className="admin-nav-sep" />
      <a className="admin-nav-link" href="/ar" target="_blank" rel="noopener noreferrer">
        فتح الموقع العام ↗
      </a>
      <span className="admin-nav-user">{fullName}</span>
    </nav>
  );
}
