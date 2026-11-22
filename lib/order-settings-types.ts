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

export type OrderingMode =
  | "FULL_ORDERING"
  | "WHATSAPP_DATABASE"
  | "DISPLAY_ONLY"
  | "TEMPORARILY_CLOSED";

// Backward compatibility alias
export type MenuMode = OrderingMode | "VIEW_AND_ORDER" | "VIEW_ONLY";

export function normalizeOrderingMode(mode?: string | null): OrderingMode {
  if (!mode) return "WHATSAPP_DATABASE";
  if (mode === "VIEW_AND_ORDER" || mode === "FULL_ORDERING") return "FULL_ORDERING";
  if (mode === "WHATSAPP_DATABASE") return "WHATSAPP_DATABASE";
  if (mode === "VIEW_ONLY" || mode === "DISPLAY_ONLY") return "DISPLAY_ONLY";
  if (mode === "TEMPORARILY_CLOSED") return "TEMPORARILY_CLOSED";
  return "WHATSAPP_DATABASE";
}

export interface OrderingModeFeatures {
  allowOrderCreation: boolean;
  orderBackendStorage: boolean;
  customerVerification: boolean;
  customerLiveTracking: boolean;
  customerPolling: boolean;
  whatsappRedirection: boolean;
  adminLiveSync: boolean;
  customerHistory: boolean;
}

export const ORDERING_MODE_FEATURES: Record<OrderingMode, OrderingModeFeatures> = {
  FULL_ORDERING: {
    allowOrderCreation: true,
    orderBackendStorage: true,
    customerVerification: true,
    customerLiveTracking: true,
    customerPolling: true,
    whatsappRedirection: true,
    adminLiveSync: true,
    customerHistory: true,
  },
  WHATSAPP_DATABASE: {
    allowOrderCreation: true,
    orderBackendStorage: true,
    customerVerification: false,
    customerLiveTracking: false,
    customerPolling: false,
    whatsappRedirection: true,
    adminLiveSync: false,
    customerHistory: true,
  },
  DISPLAY_ONLY: {
    allowOrderCreation: false,
    orderBackendStorage: false,
    customerVerification: false,
    customerLiveTracking: false,
    customerPolling: false,
    whatsappRedirection: false,
    adminLiveSync: false,
    customerHistory: true,
  },
  TEMPORARILY_CLOSED: {
    allowOrderCreation: false,
    orderBackendStorage: false,
    customerVerification: false,
    customerLiveTracking: false,
    customerPolling: false,
    whatsappRedirection: false,
    adminLiveSync: false,
    customerHistory: true,
  },
};

export interface OrderingModeMeta {
  code: OrderingMode;
  letter: "A" | "B" | "C" | "D";
  titleAr: string;
  titleEn: string;
  badgeAr: string;
  badgeEn: string;
  descriptionAr: string;
  descriptionEn: string;
  bulletPointsAr: string[];
  bulletPointsEn: string[];
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const ORDERING_MODES_META: Record<OrderingMode, OrderingModeMeta> = {
  FULL_ORDERING: {
    code: "FULL_ORDERING",
    letter: "A",
    titleAr: "نظام الطلبات المتكامل",
    titleEn: "Full Ordering System",
    badgeAr: "موصى به للتشغيل اليومي",
    badgeEn: "Recommended for Daily Ops",
    descriptionAr: "تجربة طلب إلكترونية كاملة متصلة بقاعدة البيانات مع تتبع حي للطلب وتزامن مباشر للمطعم.",
    descriptionEn: "Complete digital ordering journey connected to database with live customer tracking and instant admin sync.",
    bulletPointsAr: [
      "حفظ الطلب مباشرة في قاعدة البيانات",
      "التحقق من العميل وتوثيق الجلسة وحفظ العناوين",
      "صفحة 'طلباتي' وتتبع مراحل الطلب الحية لحظياً",
      "تزامن تلقائي فوري مع لوحة إدارة المطبخ والطلبات",
    ],
    bulletPointsEn: [
      "Immediate database order creation & persistence",
      "Customer verification session & saved addresses",
      "Customer 'My Orders' with live multi-stage tracking",
      "Automatic LiveSync with Kitchen & Admin Dashboard",
    ],
    icon: "⚡",
    color: "#16a34a",
    bgColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  WHATSAPP_DATABASE: {
    code: "WHATSAPP_DATABASE",
    letter: "B",
    titleAr: "طلبات واتساب وقاعدة البيانات",
    titleEn: "WhatsApp + Database Orders",
    badgeAr: "تشغيل خفيف وسريع",
    badgeEn: "Lightweight & Fast Ops",
    descriptionAr: "إنشاء الطلب وحفظه في لوحة التحكم وتوجيه العميل لواتساب الفرع مباشرة، دون تتبع حي أو استعلام دوري للعميل.",
    descriptionEn: "Creates & persists orders in DB/Admin with WhatsApp redirection; disables live customer polling and tracking.",
    bulletPointsAr: [
      "تسجيل الطلب رسمياً في قاعدة البيانات وظهوره في لوحة الإدارة",
      "توليد رسالة واتساب منسقة وتحويل العميل لمحادثة الفرع",
      "إيقاف تتبع العميل الحي والاستعلام الدوري لتوفير الموارد",
      "إدارة وتحديث يدوي للطلبات من لوحة الإدارة بدون بولينج تلقائي",
    ],
    bulletPointsEn: [
      "Persists order in DB & displays in Admin Dashboard",
      "Formats WhatsApp message & redirects customer to branch",
      "Disables customer live tracking polling to save bandwidth",
      "Manual admin order refresh without auto-polling load",
    ],
    icon: "💬",
    color: "#0284c7",
    bgColor: "#f0f9ff",
    borderColor: "#7dd3fc",
  },
  DISPLAY_ONLY: {
    code: "DISPLAY_ONLY",
    letter: "C",
    titleAr: "عرض المنيو فقط",
    titleEn: "Display Only",
    badgeAr: "تصفح بدون استقبال طلبات",
    badgeEn: "Browse Without Ordering",
    descriptionAr: "إتاحة تصفح قائمة الطعام والأسعار والإضافات والفروع دون استقبال أي طلبات جديدة مع شريط تنبيه.",
    descriptionEn: "Browse menu, prices, branches and items with ordering disabled and an informative banner.",
    bulletPointsAr: [
      "المنيو متاح بالكامل للتصفح والاطلاع على الأسعار والفروع",
      "حظر إنشاء أو إرسال أي طلبات في الواجهة والخادم (403)",
      "شريط تنبيه علوي مخصص يشرح سبب التوقف وموعد الاستئناف",
      "الحفاظ الكامل على بيانات العملاء والطلبات السابقة دون أي تأثير",
    ],
    bulletPointsEn: [
      "Complete menu browsing with prices, branches and details",
      "Blocks order submission on UI & backend (403)",
      "Custom top banner with suspension reason and resume time",
      "Zero impact on existing customers and historical orders",
    ],
    icon: "👁️",
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  TEMPORARILY_CLOSED: {
    code: "TEMPORARILY_CLOSED",
    letter: "D",
    titleAr: "إغلاق مؤقت للمطعم",
    titleEn: "Temporarily Closed",
    badgeAr: "توقف مؤقت شامل",
    badgeEn: "Full Temporary Suspension",
    descriptionAr: "إشعار العميل بأن المطعم مغلق مؤقتًا مع حجب استقبال الطلبات تماماً على الخادم والواجهة.",
    descriptionEn: "Notifies customer that restaurant is closed, blocking ordering both in UI and backend.",
    bulletPointsAr: [
      "عرض شاشة أو شريط إغلاق المطعم المخصص ثنائي اللغة",
      "حظر إنشاء أي طلبات من أي واجهة برمجية برمز 403",
      "إمكانية تحديد وقت متوقع لمعاودة الفتح واستقبال الطلبات",
      "حماية كاملة لكافة البيانات السابقة وسجلات التدقيق",
    ],
    bulletPointsEn: [
      "Bilingual customized restaurant closure screen / banner",
      "Strict backend & frontend blocking of new orders (403)",
      "Optional expected resume date/time display",
      "Total protection of existing orders and audit records",
    ],
    icon: "🛑",
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
};

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
  mode: "WHATSAPP_DATABASE",
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
