/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // prisma-client (ESM) + pg use Node-only APIs; keep them external so bundling doesn't break them.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "cloudinary"],
  // رفع الصور يمر عبر Server Actions؛ الحد الافتراضي (~1MB) كان يُسقط الطلب قبل
  // فحص lib/cloudinary (حد 5MB) فيظهر خطأ إطار العمل بدل رسالة الحجم. نربعه أعلى من
  // حد المنطق ليصل الطلب إلى validateImage وترجع الرسالة العربية الصحيحة.
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  images: {
    // Cloudinary-hosted product/branding images.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
