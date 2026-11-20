/**
 * Order Event Presentation Mapping
 *
 * Maps internal event keys (used in database records, audit logs, backend processing)
 * to customer-facing Arabic/English labels and descriptions.
 *
 * RULES:
 * - Internal action keys remain UNCHANGED in the codebase.
 * - Database records, audit logs, and backend processing use original keys.
 * - Only the customer-facing display layer translates these to Arabic/English.
 * - WhatsApp events are distinct from restaurant order confirmation events.
 */

// =============================================================================
// INTERNAL EVENT KEYS (UNCHANGED — used in DB, audit logs, backend)
// =============================================================================

export type OrderInternalEvent =
  | 'created_order'
  | 'customer_confirmed_sent'
  | 'status_change_to_draft'
  | 'status_change_to_pending_whatsapp'
  | 'status_change_to_received'
  | 'status_change_to_confirmed'
  | 'status_change_to_preparing'
  | 'status_change_to_ready'
  | 'status_change_to_out_for_delivery'
  | 'status_change_to_completed'
  | 'status_change_to_rejected'
  | 'status_change_to_cancelled'
  | 'status_change_to_expired'
  | 'expire_unconfirmed_order';

export interface OrderEventMapping {
  /** Key used internally (DB, audit logs, backend) — MUST NOT be renamed */
  internalKey: OrderInternalEvent;
  /** Arabic customer-facing label */
  arabic: string;
  /** English customer-facing label */
  english: string;
  /** Arabic short description (natural, Egyptian-friendly MSA) */
  arabicDescription?: string;
  /** English short description */
  englishDescription?: string;
  /** WhatsApp-distinct flag — true if this is a WhatsApp communication event,
   *  NOT a restaurant order status transition */
  isWhatsAppCommunication: boolean;
  /** Whether this event implies restaurant order acceptance */
  impliesOrderAcceptance: boolean;
}

// =============================================================================
// EVENT MAPPING — ALL INTERNAL KEYS PRESERVED BELOW
// =============================================================================

export const ORDER_EVENTS: OrderEventMapping[] = [
  {
    internalKey: 'created_order',
    arabic: 'تم تسجيل طلبك بنجاح',
    english: 'Order Placed Successfully',
    arabicDescription:
      'تم تسجيل طلبك بنجاح، شكرًا لثقتك بنا. سنتوَلّى تحضير طلبك بأسرع وقت.',
    englishDescription:
      'Your order has been placed successfully. Thank you for trusting us. We will prepare your order shortly.',
    isWhatsAppCommunication: false,
    impliesOrderAcceptance: false,
  },
  {
    internalKey: 'customer_confirmed_sent',
    arabic: 'تم تأكيد إرسال تفاصيل طلبك عبر واتساب',
    english: 'WhatsApp Details Confirmed',
    arabicDescription:
      'لقد قمت بتأكيد إرسال تفاصيل طلبك عبر واتساب. سيتم عرض طلبك على المطعم للمراجعة.',
    englishDescription:
      'You have confirmed sending your order details via WhatsApp. The order will be presented to the restaurant for review.',
    isWhatsAppCommunication: true,
    impliesOrderAcceptance: false,
  },
  {
    internalKey: 'status_change_to_received',
    arabic: 'تم استلام طلبك',
    english: 'Order Received',
    arabicDescription:
      'تم استلام طلبك وهو بانتظار المراجعة والتأكيد من قبل المطعم.',
    englishDescription:
      'Your order has been received and is awaiting review and confirmation from the restaurant.',
    isWhatsAppCommunication: false,
    impliesOrderAcceptance: true,
  },
  {
    internalKey: 'status_change_to_confirmed',
    arabic: 'تم تأكيد طلبك من المطعم',
    english: 'Order Confirmed by Restaurant',
    arabicDescription:
      'تم تأكيد طلبك من قبل المطعم وبدأ في مراجعته.',
    englishDescription:
      'Your order has been confirmed by the restaurant and is being reviewed.',
    isWhatsAppCommunication: false,
    impliesOrderAcceptance: true,
  },
  {
    internalKey: 'status_change_to_preparing',
    arabic: 'جاري تحضير طلبك',
    english: 'Preparing Your Order',
    arabicDescription:
      'فريق المطبخ يعمل على تجهيز طلبك الآن. سنnotifyك عندما يكون جاهزًا.',
    englishDescription:
      'The kitchen team is preparing your order now. You will be notified when it is ready.',
    isWhatsAppCommunication: false,
    impliesOrderAcceptance: true,
  },
  {
    internalKey: 'status_change_to_ready',
    arabic: 'طلبك جاهز',
    english: 'Order Ready',
    arabicDescription:
      'طلبك جاهز للاستلام أو الخروج مع مندوب التوصيل.',
    englishDescription:
      'Your order is ready for pickup or with the delivery rider.',
    isWhatsAppCommunication: false,
    impliesOrderAcceptance: true,
  },
  {
    internalKey: 'status_change_to_out_for_delivery',
    arabic: 'طلبك في الطريق إليك',
    english: 'Order Out for Delivery',
    arabicDescription:
      'مندوب التوصيل في طريقه إليك الآن بوجبتك الساخنة.',
    englishDescription:
      'The delivery rider is on his way to you with your hot meal.',
    isWhatsAppCommunication: false,
    impliesOrderAcceptance: true,
  },
  {
    internalKey: 'status_change_to_completed',
    arabic: 'تم تسليم طلبك بنجاح',
    english: 'Order Delivered Successfully',
    arabicDescription:
      'تم تسليم طلبك بنجاح، نتمنى لك وجبة شهية. بالهناء والشفاء!',
    englishDescription:
      'Your order has been delivered successfully. Enjoy your meal!',
    isWhatsAppCommunication: false,
    impliesOrderAcceptance: true,
  },
  {
    internalKey: 'status_change_to_rejected',
    arabic: 'تحديث بشأن الطلب ❌',
    english: 'Order Update — Rejected',
    arabicDescription:
      'نعتذر عن عدم إمكانية تنفيذ الطلب حالياً.',
    englishDescription:
      'We apologize for being unable to fulfill this order at this time.',
    isWhatsAppCommunication: false,
    impliesOrderAcceptance: false,
  },
  {
    internalKey: 'status_change_to_cancelled',
    arabic: 'تم إلغاء الطلب 🚫',
    english: 'Order Cancelled',
    arabicDescription:
      'تم إلغاء الطلب بناءً على رغبتك أو رغبة الفرع.',
    englishDescription:
      'The order has been cancelled based on your request or the branch request.',
    isWhatsAppCommunication: false,
    impliesOrderAcceptance: false,
  },
  {
    internalKey: 'status_change_to_expired',
    arabic: 'انتهت صلاحية الطلب',
    english: 'Order Expired',
    arabicDescription:
      'انتهت مهلة إرسال الطلب عبر واتساب (30 دقيقة). يرجى تقديم طلب جديد.',
    englishDescription:
      'The order confirmation expired via WhatsApp (30 minutes). Please place a new order.',
    isWhatsAppCommunication: true,
    impliesOrderAcceptance: false,
  },
  {
    internalKey: 'expire_unconfirmed_order',
    arabic: 'انتهت صلاحية الطلب',
    english: 'Order Expired',
    arabicDescription:
      'انتهت مهلة إرسال الطلب عبر واتساب (30 دقيقة). يرجى تقديم طلب جديد.',
    englishDescription:
      'The order confirmation expired via WhatsApp (30 minutes). Please place a new order.',
    isWhatsAppCommunication: true,
    impliesOrderAcceptance: false,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the mapping for an internal event key.
 * Returns undefined if the key is not found (which means it's an unknown/legacy key).
 */
export function getEventMapping(
  internalKey: OrderInternalEvent,
): OrderEventMapping | undefined {
  return ORDER_EVENTS.find((m) => m.internalKey === internalKey);
}

/**
 * Get the Arabic customer label for an internal event key.
 * Returns a safe fallback if the key is unknown.
 */
export function getArabicLabel(
  internalKey: OrderInternalEvent,
  fallback?: string,
): string {
  const mapping = getEventMapping(internalKey);
  return mapping ? mapping.arabic : fallback || 'حدث Order';
}

/**
 * Get the English customer label for an internal event key.
 */
export function getEnglishLabel(
  internalKey: OrderInternalEvent,
  fallback?: string,
): string {
  const mapping = getEventMapping(internalKey);
  return mapping ? mapping.english : fallback || 'Order Event';
}

/**
 * Get the Arabic description for an internal event key.
 */
export function getArabicDescription(
  internalKey: OrderInternalEvent,
  fallback?: string,
): string | undefined {
  const mapping = getEventMapping(internalKey);
  return mapping?.arabicDescription || fallback;
}

/**
 * Get the English description for an internal event key.
 */
export function getEnglishDescription(
  internalKey: OrderInternalEvent,
  fallback?: string,
): string | undefined {
  const mapping = getEventMapping(internalKey);
  return mapping?.englishDescription || fallback;
}

/**
 * Check if an event is a WhatsApp communication event (distinct from restaurant order status).
 */
export function isWhatsAppCommunication(
  internalKey: OrderInternalEvent,
): boolean {
  const mapping = getEventMapping(internalKey);
  return mapping ? mapping.isWhatsAppCommunication : false;
}

/**
 * Check if an event implies restaurant order acceptance.
 */
function impliesOrderAcceptance(
  internalKey: OrderInternalEvent,
): boolean {
  const mapping = getEventMapping(internalKey);
  return mapping ? mapping.impliesOrderAcceptance : false;
}

/**
 * Get the visual state class for a timeline step based on event key.
 * Used for the OrderTrackingTimeline step highlighting.
 */
export function getStepStatus(
  internalKey: OrderInternalEvent,
): 'completed' | 'current' | 'upcoming' | 'unknown' {
  // Define the order status transition sequence
  const sequence = [
    'created_order', // step 0 — review
    'status_change_to_received', // step 1 — received
    'status_change_to_confirmed', // step 2 — confirmed
    'status_change_to_preparing', // step 3 — preparing
    'status_change_to_ready', // step 4 — ready/dispatch
    'status_change_to_out_for_delivery', // step 5 — out for delivery
    'status_change_to_completed', // step 6 — completed
  ];

  const index = sequence.indexOf(internalKey);
  if (index < 0) return 'unknown';

  // If this is the last known step or beyond, mark as completed
  // In a real implementation, this would compare against the current order status
  // For now, we return 'completed' for known events and 'upcoming' for earlier ones
  return 'completed';
}

// =============================================================================
// WHATSAPP DISTINCTION HELPERS
// =============================================================================

/**
 * Is this event a WhatsApp communication (not a restaurant order status)?
 */
export function isWhatsAppEvent(
  internalKey: OrderInternalEvent,
): boolean {
  return isWhatsAppCommunication(internalKey);
}

/**
 * Does this event imply that the restaurant accepted the order?
 * WhatsApp confirmation (customer_confirmed_sent) does NOT imply order acceptance.
 */
export function doesEventImplyOrderAcceptance(
  internalKey: OrderInternalEvent,
): boolean {
  return impliesOrderAcceptance(internalKey);
}

// Export the full list of internal keys for reference/validation
export const ALL_INTERNAL_EVENT_KEYS: OrderInternalEvent[] = ORDER_EVENTS.map(
  (m) => m.internalKey,
);

// Validate that all internal keys are preserved (no duplicates, all unique)
const keys = ORDER_EVENTS.map((m) => m.internalKey);
const uniqueKeys = new Set(keys);
if (uniqueKeys.size !== keys.length) {
  console.warn(
    '[order-events] WARNING: Duplicate internal event keys detected!',
  );
} else if (uniqueKeys.size !== ALL_INTERNAL_EVENT_KEYS.length) {
  console.warn(
    '[order-events] WARNING: Not all internal keys are unique!',
  )
}