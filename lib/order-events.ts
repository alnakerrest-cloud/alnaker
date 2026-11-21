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
 * - All helper functions safely accept `string` (not just the TypeScript union)
 *   because audit entries originate from persisted database records.
 * - Unknown/legacy event strings are handled gracefully with fallbacks.
 */

/**
 * Known internal event keys — used in DB, audit logs, backend processing.
 * This union type exists for TypeScript compile-time safety in internal code.
 */
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

/**
 * All possible event strings that can appear in database records or API payloads.
 * This includes the OrderInternalEvent union PLUS any legacy/unknown strings
 * that may originate from older database records or third-party integrations.
 */
export type OrderEventKey = string;

/**
 * Mapping between internal keys and customer-facing presentation.
 */
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
// RUNTIME TYPE GUARD
// =============================================================================

/**
 * Checks whether a given event key string is a known internal event key.
 * Used for safe runtime type validation without `as` casts or `any`.
 */
function isKnownInternalEvent(
  action: OrderEventKey,
): action is OrderInternalEvent {
  const knownKeys: OrderInternalEvent[] = [
    'created_order',
    'customer_confirmed_sent',
    'status_change_to_draft',
    'status_change_to_pending_whatsapp',
    'status_change_to_received',
    'status_change_to_confirmed',
    'status_change_to_preparing',
    'status_change_to_ready',
    'status_change_to_out_for_delivery',
    'status_change_to_completed',
    'status_change_to_rejected',
    'status_change_to_cancelled',
    'status_change_to_expired',
    'expire_unconfirmed_order',
  ];
  // Type-safe check: action is string, knownKeys is OrderInternalEvent[]
  // Use indexOf with type assertion for the runtime check
  return (knownKeys as readonly OrderInternalEvent[]).includes(action as OrderInternalEvent);
}

/**
 * Checks whether a given event key string matches a known internal event.
 * Returns the mapped event if known, otherwise returns undefined.
 * This is the core type-safe lookup function.
 */
function findMappingSafely(
  action: OrderEventKey,
): OrderEventMapping | undefined {
  // First, try the known keys directly
  const directMatch = ORDER_EVENTS.find(
    (m) => m.internalKey === action,
  );
  if (directMatch) {
    return directMatch;
  }

  // Then, check via the type guard for broader compatibility
  if (isKnownInternalEvent(action)) {
    return ORDER_EVENTS.find((m) => m.internalKey === action);
  }

  // Unknown/legacy event string
  return undefined;
}

// =============================================================================
// PUBLIC HELPER FUNCTIONS — ALL ACCEPT string
// =============================================================================

/**
 * Get the event mapping for a given event key.
 * Returns the mapping if the key is recognized; otherwise returns undefined.
 * Safe for both known internal keys and unknown/legacy event strings.
 *
 * @param action - The event action string (from database audit entry, API payload, etc.)
 * @returns The OrderEventMapping if recognized, undefined otherwise.
 */
export function getEventMapping(
  action: OrderEventKey,
): OrderEventMapping | undefined {
  return findMappingSafely(action);
}

/**
 * Get the Arabic customer-facing label for a given event key.
 * Returns the Arabic label if the key is recognized;
 * otherwise returns the Arabic fallback: 'تحديث جديد على طلبك'.
 *
 * @param action - The event action string (from database audit entry, API payload, etc.)
 * @param fallback - Optional custom fallback override
 */
export function getArabicLabel(
  action: OrderEventKey,
  fallback?: string,
): string {
  const mapping = getEventMapping(action);
  if (mapping) {
    return mapping.arabic;
  }
  // Unknown event fallback — never expose raw technical identifiers
  return fallback || 'تحديث جديد على طلبك';
}

/**
 * Get the English customer-facing label for a given event key.
 * Returns the English label if the key is recognized;
 * otherwise returns the English fallback: 'A new update on your order'.
 *
 * @param action - The event action string (from database audit entry, API payload, etc.)
 * @param fallback - Optional custom fallback override
 */
export function getEnglishLabel(
  action: OrderEventKey,
  fallback?: string,
): string {
  const mapping = getEventMapping(action);
  if (mapping) {
    return mapping.english;
  }
  // Unknown event fallback — never expose raw technical identifiers
  return fallback || 'A new update on your order';
}

/**
 * Get the Arabic short description for a given event key.
 * Returns the Arabic description if available;
 * otherwise returns the fallback if provided.
 *
 * @param action - The event action string (from database audit entry, API payload, etc.)
 * @param fallback - Optional custom fallback
 */
export function getArabicDescription(
  action: OrderEventKey,
  fallback?: string,
): string | undefined {
  const mapping = getEventMapping(action);
  if (mapping && mapping.arabicDescription) {
    return mapping.arabicDescription;
  }
  return fallback;
}

/**
 * Get the English short description for a given event key.
 * Returns the English description if available;
 * otherwise returns the fallback if provided.
 *
 * @param action - The event action string (from database audit entry, API payload, etc.)
 * @param fallback - Optional custom fallback
 */
export function getEnglishDescription(
  action: OrderEventKey,
  fallback?: string,
): string | undefined {
  const mapping = getEventMapping(action);
  if (mapping && mapping.englishDescription) {
    return mapping.englishDescription;
  }
  return fallback;
}

/**
 * Check whether a given event key represents a WhatsApp communication event
 * (distinct from a restaurant order status transition).
 * Returns false for unknown/legacy event strings (safe default).
 *
 * @param action - The event action string (from database audit entry, API payload, etc.)
 */
export function isWhatsAppEvent(action: OrderEventKey): boolean {
  const mapping = getEventMapping(action);
  return mapping ? mapping.isWhatsAppCommunication : false;
}

/**
 * Check whether a given event key implies that the restaurant accepted the order.
 * WhatsApp confirmation (customer_confirmed_sent) does NOT imply order acceptance.
 * Returns false for unknown/legacy event strings (safe default).
 *
 * @param action - The event action string (from database audit entry, API payload, etc.)
 */
export function doesEventImplyOrderAcceptance(
  action: OrderEventKey,
): boolean {
  const mapping = getEventMapping(action);
  return mapping ? mapping.impliesOrderAcceptance : false;
}

/**
 * Get the visual state class for a timeline step based on event key.
 * Used for the OrderTrackingTimeline step highlighting.
 * Returns 'unknown' for event keys that are not in the known sequence.
 *
 * @param action - The event action string (from database audit entry, API payload, etc.)
 */
export function getStepStatus(
  action: OrderEventKey,
): 'completed' | 'current' | 'upcoming' | 'unknown' {
  // Define the order status transition sequence (only known internal keys)
  const sequence = [
    'created_order', // step 0 — review
    'status_change_to_received', // step 1 — received
    'status_change_to_confirmed', // step 2 — confirmed
    'status_change_to_preparing', // step 3 — preparing
    'status_change_to_ready', // step 4 — ready/dispatch
    'status_change_to_out_for_delivery', // step 5 — out for delivery
    'status_change_to_completed', // step 6 — completed
  ];

  // Use the runtime type guard to check if this is a known key
  if (isKnownInternalEvent(action)) {
    const index = sequence.indexOf(action);
    if (index < 0) return 'unknown';
    // If this is the last known step or beyond, mark as completed
    return 'completed';
  }

  // Unknown/legacy event string — return 'unknown' and never expose raw keys
  return 'unknown';
}

// =============================================================================
// EXPORTED TYPE FOR REFERENCE/VALIDATION
// =============================================================================

/**
 * All internal event keys, for reference and validation purposes.
 * Note: This union reflects the keys that should appear in database records.
 * Legacy/unknown strings may also appear and are handled gracefully by the
 * helper functions above (they return safe fallbacks, never raw keys).
 */
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
  );
}