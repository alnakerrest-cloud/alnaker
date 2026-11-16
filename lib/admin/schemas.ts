// مخططات التحقق (Zod) المشتركة لكل عمليات الكتابة في لوحة الإدارة.
// تُستخدم على الخادم داخل كل Server Action بعد التحقق من الجلسة/الدور.
// ملاحظة: التحويل من FormData يتم عبر lib/admin/form.ts قبل safeParse، لذا المخططات نقية.
import { z } from "zod/v3";

/* ---------- Category ---------- */
export const categorySchema = z.object({
  nameAr: z.string().trim().min(1, "اسم القسم مطلوب").max(120),
  slug: z.string().trim().max(80).optional(),
  icon: z.string().trim().max(16).optional(),
  group: z.enum(["FOOD", "DRINKS"], { errorMap: () => ({ message: "المجموعة غير صالحة" }) }),
  layout: z.enum(["TRAYS", "LIST"], { errorMap: () => ({ message: "نوع العرض غير صالح" }) }),
  noteAr: z.string().trim().max(1000).optional(),
  isVisible: z.boolean(),
  sortOrder: z.number().int(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

/* ---------- Section ---------- */
export const sectionSchema = z.object({
  categoryId: z.string().min(1, "القسم مطلوب"),
  titleAr: z.string().trim().max(200).optional(),
  sortOrder: z.number().int(),
});

/* ---------- Variant (سعر واحد) ---------- */
export const variantSchema = z.object({
  id: z.string().optional(),
  labelAr: z.string().trim().max(80).optional(),
  price: z.number({ invalid_type_error: "السعر رقمي مطلوب" }).positive("السعر يجب أن يكون أكبر من صفر"),
  maxPrice: z.number().positive().nullable(),
  sortOrder: z.number().int(),
  isAvailable: z.boolean(),
});

/* ---------- Product ---------- */
export const productSchema = z.object({
  sectionId: z.string().min(1, "القسم/العنبر مطلوب"),
  nameAr: z.string().trim().min(1, "اسم المنتج مطلوب").max(200),
  descAr: z.string().trim().max(2000).optional(),
  badge: z.enum(["SIGNATURE", "OFFER"]).nullable(),
  ingredientsAr: z.array(z.string().trim().min(1)).max(40).default([]),
  isAvailable: z.boolean(),
  isVisible: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int(),
  variants: z
    .array(variantSchema)
    .min(1, "أضف سعرًا واحدًا على الأقل")
    .max(30)
    .refine((vs) => vs.every((x) => x.maxPrice == null || x.maxPrice >= x.price), "الحد الأقصى للنطاق يجب ألا يقل عن السعر"),
});
export type ProductInput = z.infer<typeof productSchema>;

/* ---------- Branch ---------- */
export const branchSchema = z.object({
  nameAr: z.string().trim().min(1, "اسم الفرع مطلوب").max(120),
  nameEn: z.string().trim().max(120).optional(),
  addressAr: z.string().trim().min(1, "العنوان مطلوب").max(300),
  addressEn: z.string().trim().max(300).optional(),
  cityAr: z.string().trim().min(1, "المدينة مطلوبة").max(120),
  mapQuery: z.string().trim().max(400).optional(),
  phoneIntl: z.string().trim().max(24).optional(),
  whatsappNumber: z.string().trim().max(24).optional(),
  isOrderable: z.boolean().default(true),
  openingHoursAr: z.string().trim().max(120).optional(),
  openingHoursEn: z.string().trim().max(120).optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});
export type BranchInput = z.infer<typeof branchSchema>;

/* ---------- Option Item (خيار مفرد داخل مجموعة إضافات) ---------- */
export const optionItemSchema = z.object({
  id: z.string().optional(),
  nameAr: z.string().trim().min(1, "اسم الخيار مطلوب").max(120),
  nameEn: z.string().trim().max(120).optional(),
  price: z.number({ invalid_type_error: "السعر رقمي مطلوب" }).min(0, "السعر لا يمكن أن يكون سالباً"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type OptionItemInput = z.infer<typeof optionItemSchema>;

/* ---------- Option Group (مجموعة خيارات / إضافات) ---------- */
export const optionGroupSchema = z.object({
  nameAr: z.string().trim().min(1, "اسم المجموعة مطلوب").max(120),
  nameEn: z.string().trim().max(120).optional(),
  isRequired: z.boolean().default(false),
  isMulti: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  options: z.array(optionItemSchema).min(1, "أضف خياراً واحداً على الأقل للمجموعة"),
  productIds: z.array(z.string()).default([]),
});
export type OptionGroupInput = z.infer<typeof optionGroupSchema>;

/* ---------- Offer & Promotion (العروض والخصومات) ---------- */
export const offerSchema = z.object({
  titleAr: z.string().trim().min(1, "اسم أو عنوان العرض مطلوب").max(200),
  titleEn: z.string().trim().max(200).optional(),
  descAr: z.string().trim().max(1000).optional(),
  descEn: z.string().trim().max(1000).optional(),
  offerType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "SPECIAL_PRICE", "BUNDLE", "BUY_X_GET_Y"]).default("PERCENTAGE"),
  discountValue: z.number().min(0).optional().nullable(),
  promoPrice: z.number().min(0).optional().nullable(),
  buyQty: z.number().int().min(1).default(1),
  getQty: z.number().int().min(1).default(1),
  minOrderAmount: z.number().min(0).optional().nullable(),
  minQuantity: z.number().int().min(1).default(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  imageUrl: z.string().trim().max(600).optional().nullable(),
  imagePublicId: z.string().trim().max(300).optional().nullable(),
  badgeAr: z.string().trim().max(50).default("عرض خاص"),
  badgeEn: z.string().trim().max(50).default("Special Offer"),
  productIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  locationIds: z.array(z.string()).default([]),
});
export type OfferInput = z.infer<typeof offerSchema>;

/* ---------- Restaurant settings ---------- */
export const settingsSchema = z.object({
  brandNameAr: z.string().trim().min(1, "اسم المطعم مطلوب").max(120),
  taglineAr: z.string().trim().max(240).optional(),
  phoneDisplay: z.string().trim().max(32).optional(),
  phoneIntl: z.string().trim().max(32).optional(),
  logoUrl: z.string().trim().max(600).optional(),
  vatNoteAr: z.string().trim().max(400).optional(),
  currencyAr: z.string().trim().min(1, "العملة مطلوبة").max(16),
  deliveryFee: z.number().min(0).nullable(),
});

/* ---------- Import (استيراد نصي — إنشاء فقط، بلا دمج تلقائي) ---------- */
export const importPriceSchema = z.object({
  labelAr: z.string().trim().max(80).optional(),
  price: z.number({ invalid_type_error: "السعر رقمي مطلوب" }).positive("السعر يجب أن يكون أكبر من صفر"),
  maxPrice: z.number().positive().nullable(),
});
export const importItemSchema = z.object({
  categoryAr: z.string().trim().min(1, "القسم مطلوب").max(120),
  sectionAr: z.string().trim().max(200).optional(),
  nameAr: z.string().trim().min(1, "اسم المنتج مطلوب").max(200),
  descAr: z.string().trim().max(2000).optional(),
  badge: z.enum(["SIGNATURE", "OFFER"]).nullable(),
  ingredientsAr: z.array(z.string().trim().min(1)).max(40).default([]),
  sourcePage: z.number().int().positive().nullable(),
  prices: z
    .array(importPriceSchema)
    .min(1, "سعر واحد على الأقل")
    .max(30)
    .refine((vs) => vs.every((x) => x.maxPrice == null || x.maxPrice >= x.price), "الحد الأقصى للنطاق يجب ألا يقل عن السعر"),
});
export type ImportItemInput = z.infer<typeof importItemSchema>;

/* ---------- helpers ---------- */
export function splitList(v: string): string[] {
  return v
    .split(/[,،\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function safeJsonArray(v: string): unknown[] {
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** يحوّل نتائج zod إلى رسالة عربية واحدة للعرض. */
export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "بيانات غير صالحة";
}
