// تحقّق من جهة العميل قبل الإرسال، مطابق لسياسة lib/cloudinary.ts.
// لا يستورد أي شيء خاص بالخادم (cloudinary/SDK) حتى لا يدخل في حزمة المتصفح.
"use client";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — نفس حد الخادم

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

function getExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > -1 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/** يفحص النوع/الامتداد/الحجم/الفراغ. يُرجع رسالة عربية أو null إن كان سليمًا. */
export function validateClientImage(file: File | null | undefined): string | null {
  if (!file) return "لم يتم إرفاق ملف.";

  const mime = file.type?.toLowerCase() ?? "";
  const ext = getExt(file.name);
  const hasAllowedMime = ALLOWED_MIME.includes(mime);
  const hasAllowedExt = ALLOWED_EXT.has(ext);

  if (!hasAllowedMime && !hasAllowedExt) {
    return "صيغة الملف غير مسموحة. المسموح: JPG / PNG / WEBP / GIF / AVIF.";
  }

  if (ext === "svg" || ext === "html" || ext === "htm" || ext === "js") {
    return "صيغة الملف غير مسموحة لأسباب أمنية.";
  }
  if (file.size === 0) return "الملف فارغ.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `حجم الملف يتجاوز الحد المسموح (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB).`;
  }
  return null;
}
