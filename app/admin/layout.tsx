// Root layout لمنطقة الإدارة (/admin) — عربية RTL بالكامل، مستقلة عن layout المنيو العام.
// لا تغيّر أي شيء في مسار [/locale] العام.
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "لوحة تحكم قرية الناقر",
  robots: { index: false, follow: false }, // لا نفهرس الإدارة
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5C2A26",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
