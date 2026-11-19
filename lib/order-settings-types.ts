// Shared types and constants for Menu Mode & Order Suspension Notice
// Safe to import in both Client Components and Server Components (NO node:fs or Node builtins)

export type OrderSuspensionReason =
  | "TEMPORARILY_CLOSED"
  | "OUTSIDE_WORKING_HOURS"
  | "HIGH_ORDER_VOLUME"
  | "MAINTENANCE"
  | "CUSTOM";

export const REASON_PRESETS: Record<
  OrderSuspensionReason,
  {
    labelAr: string;
    labelEn: string;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
  }
> = {
  HIGH_ORDER_VOLUME: {
    labelAr: "ضغط كبير على الطلبات",
    labelEn: "High order volume",
    titleAr: "الطلبات متوقفة مؤقتًا",
    titleEn: "Ordering is temporarily unavailable",
    descAr: "يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا بسبب الضغط الكبير على الطلبات لضمان جودة الخدمة.",
    descEn: "You can browse our menu and prices, but orders are not being accepted right now due to high order volume.",
  },
  TEMPORARILY_CLOSED: {
    labelAr: "إغلاق مؤقت للمطعم",
    labelEn: "Temporarily closed",
    titleAr: "المطعم مغلق مؤقتًا",
    titleEn: "Restaurant is temporarily closed",
    descAr: "يمكنكم تصفح المنيو والأسعار، ونعتذر عن استقبال الطلبات في الوقت الحالي وسنعاود الخدمة قريباً.",
    descEn: "Our menu is available for browsing, but we are not accepting orders at this time. We will resume shortly.",
  },
  OUTSIDE_WORKING_HOURS: {
    labelAr: "خارج ساعات العمل الرسمية",
    labelEn: "Outside operating hours",
    titleAr: "نحن خارج أوقات العمل الرسمية",
    titleEn: "Outside operating hours",
    descAr: "نرحب بكم لتصفح قائمة الطعام، وسنبدأ في استقبال طلباتكم مع بداية ساعات العمل الرسمية للمطعم.",
    descEn: "You can browse our menu. Order taking will resume at the start of our regular operating hours.",
  },
  MAINTENANCE: {
    labelAr: "أعمال صيانة وتحديث",
    labelEn: "Maintenance and updates",
    titleAr: "أعمال صيانة وتحديث للأنظمة",
    titleEn: "System maintenance in progress",
    descAr: "يجري حالياً تحديث أنظمة الطلبات لخدمتكم بشكل أفضل، وسنعود لاستقبال طلباتكم في أقرب وقت.",
    descEn: "We are upgrading our ordering systems to serve you better. Ordering will resume shortly.",
  },
  CUSTOM: {
    labelAr: "سبب مخصص",
    labelEn: "Custom reason",
    titleAr: "الطلبات متوقفة مؤقتًا",
    titleEn: "Orders temporarily suspended",
    descAr: "المنيو متاح للتصفح حالياً، واستقبال الطلبات متوقف مؤقتاً.",
    descEn: "Menu is available for browsing. Orders are temporarily suspended.",
  },
};

export interface BranchOverrideSettings {
  isOrderable: boolean;
  isOpen: boolean;
  workingDaysAr?: string;
  workingHoursAr?: string;
  allowDelivery?: boolean;
  allowTakeaway?: boolean;
  allowDineIn?: boolean;
  customMessageAr?: string;
  customMessageEn?: string;
}

export type MenuMode = "VIEW_AND_ORDER" | "VIEW_ONLY" | "TEMPORARILY_CLOSED";

export interface MenuModeSettings {
  mode: MenuMode;
  closureMessageAr: string;
  closureMessageEn: string;
  allowDelivery: boolean;
  allowTakeaway: boolean;
  allowDineIn?: boolean;
  orderTtlMinutes: number;

  // Independent View-Only Notice Settings
  enableNotice?: boolean;
  noticeTitleAr?: string;
  noticeTitleEn?: string;
  noticeMessageAr?: string;
  noticeMessageEn?: string;
  reasonCode?: OrderSuspensionReason;
  expectedResumeAt?: string;
  displayPosition?: "TOP_BANNER" | "STICKY_HEADER";

  updatedAt?: string;
  updatedBy?: string;
  branchOverrides: Record<string, BranchOverrideSettings>;
}

export const DEFAULT_SETTINGS: MenuModeSettings = {
  mode: "VIEW_AND_ORDER",
  closureMessageAr: "نستقبل طلباتكم يومياً. أوقات العمل من 12:00 ظهراً حتى 02:00 صباحاً.",
  closureMessageEn: "We accept orders daily. Working hours: 12:00 PM to 02:00 AM.",
  allowDelivery: true,
  allowTakeaway: true,
  orderTtlMinutes: 30,
  enableNotice: true,
  reasonCode: "HIGH_ORDER_VOLUME",
  noticeTitleAr: "الطلبات متوقفة مؤقتًا",
  noticeTitleEn: "Ordering is temporarily unavailable",
  noticeMessageAr: "يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا.",
  noticeMessageEn: "You can browse our menu and prices, but orders are not being accepted right now.",
  expectedResumeAt: "",
  displayPosition: "TOP_BANNER",
  branchOverrides: {
    "7fa2be20-67bd-4060-a83a-81ded2550018": {
      isOrderable: true,
      isOpen: true,
    },
    "6d6528bd-dbd4-4672-aa5f-953063d3a36e": {
      isOrderable: true,
      isOpen: true,
    },
  },
};
