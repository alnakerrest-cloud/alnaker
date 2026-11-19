import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type OrderStatus =
  | "DRAFT"
  | "PENDING_WHATSAPP"
  | "CUSTOMER_CONFIRMED_SENT"
  | "RECEIVED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type OrderType = "DELIVERY" | "TAKEAWAY";
export type PaymentMethod = "CASH" | "CARD";
export type MenuMode = "VIEW_AND_ORDER" | "VIEW_ONLY" | "TEMPORARILY_CLOSED";

export interface SelectedOptionSnapshot {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  price: number;
}

export interface AppliedOfferSnapshot {
  id: string;
  title: string;
  discountPerUnit: number;
}

export interface OrderItemRecord {
  id: string;
  productId: string;
  productName: string;
  variantIndex: number;
  variantLabel?: string;
  baseUnitPrice: number;
  selectedOptions?: SelectedOptionSnapshot[];
  removedIngredients?: string[];
  appliedOffer?: AppliedOfferSnapshot;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  notes?: string;
}

export interface OrderAuditEntry {
  timestamp: string;
  actor: string; // "customer" | "admin" | "system"
  action: string;
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  note?: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  verificationToken: string;
  verificationCode: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  confirmedAt?: string;
  confirmedBy?: string;

  status: OrderStatus;
  type: OrderType;
  paymentMethod: PaymentMethod;

  // Customer info
  customerName?: string;
  customerPhone: string;
  customerPhoneNormalized: string;
  customerNotes?: string;

  // Delivery info
  deliveryAddress?: string;
  deliveryFee: number;

  // Branch info
  branchId: string;
  branchNameAr: string;
  branchNameEn?: string;
  branchAddressAr?: string;
  branchAddressEn?: string;
  branchPhoneIntl?: string;
  branchWhatsappNumber?: string;

  // Financial snapshot
  currency: string;
  items: OrderItemRecord[];
  subtotal: number;
  totalDiscount: number;
  serviceCharge: number;
  vatNote?: string;
  total: number;

  // Metadata & Security
  idempotencyKey?: string;
  clientIp?: string;
  whatsappMessage: string;
  whatsappUrl: string;
  rejectionReason?: string;
  cancellationReason?: string;

  // Audit timeline
  timeline: OrderAuditEntry[];
}

export {
  type OrderSuspensionReason,
  type BranchOverrideSettings,
  type MenuModeSettings,
  REASON_PRESETS,
  DEFAULT_SETTINGS,
} from "./order-settings-types";

import { DEFAULT_SETTINGS, type MenuModeSettings } from "./order-settings-types";

const ORDERS_DIR = path.join(process.cwd(), "data", "orders");
const ORDERS_FILE = path.join(ORDERS_DIR, "orders-store.json");
const SETTINGS_FILE = path.join(ORDERS_DIR, "settings.json");

function ensureStorageDir() {
  if (!fs.existsSync(ORDERS_DIR)) {
    fs.mkdirSync(ORDERS_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    ensureStorageDir();
    if (!fs.existsSync(filePath)) {
      writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`[orders-store] Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureStorageDir();
  const tmpFile = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpFile, filePath);
}

function loadOrders(): OrderRecord[] {
  return readJsonFile<OrderRecord[]>(ORDERS_FILE, []);
}

function saveOrders(orders: OrderRecord[]): void {
  writeJsonFile(ORDERS_FILE, orders);
}

/** Check and expire orders that remained in PENDING_WHATSAPP past expiresAt */
function checkOrderExpirations(orders: OrderRecord[]): boolean {
  let changed = false;
  const now = new Date();
  for (const o of orders) {
    if (o.status === "PENDING_WHATSAPP") {
      const exp = new Date(o.expiresAt);
      if (now > exp) {
        o.status = "EXPIRED";
        o.updatedAt = now.toISOString();
        o.timeline.push({
          timestamp: now.toISOString(),
          actor: "system",
          action: "expire_unconfirmed_order",
          fromStatus: "PENDING_WHATSAPP",
          toStatus: "EXPIRED",
          note: "Order unconfirmed by customer within TTL period",
        });
        changed = true;
      }
    }
  }
  return changed;
}

export function getMenuSettings(): MenuModeSettings {
  return readJsonFile<MenuModeSettings>(SETTINGS_FILE, DEFAULT_SETTINGS);
}

export function updateMenuSettings(partial: Partial<MenuModeSettings>): MenuModeSettings {
  const current = getMenuSettings();
  const updated: MenuModeSettings = {
    ...current,
    ...partial,
    branchOverrides: {
      ...current.branchOverrides,
      ...(partial.branchOverrides || {}),
    },
  };
  writeJsonFile(SETTINGS_FILE, updated);
  return updated;
}

export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dateStr = `${y}${m}${d}`;
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${dateStr}-${rand}`;
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateVerificationCode(): string {
  const code = Math.floor(1000 + Math.random() * 9000);
  return `NQR-${code}`;
}

export interface CreateOrderParams {
  orderNumber?: string;
  type: OrderType;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone: string;
  customerPhoneNormalized: string;
  customerNotes?: string;
  deliveryAddress?: string;
  deliveryFee: number;
  branchId: string;
  branchNameAr: string;
  branchNameEn?: string;
  branchAddressAr?: string;
  branchAddressEn?: string;
  branchPhoneIntl?: string;
  branchWhatsappNumber?: string;
  currency: string;
  items: OrderItemRecord[];
  subtotal: number;
  totalDiscount: number;
  serviceCharge?: number;
  vatNote?: string;
  total: number;
  idempotencyKey?: string;
  clientIp?: string;
  whatsappMessage: string;
  whatsappUrl: string;
}

export function createOrder(params: CreateOrderParams): OrderRecord {
  const orders = loadOrders();
  const now = new Date();
  const settings = getMenuSettings();

  // Idempotency check
  if (params.idempotencyKey) {
    const existing = orders.find((o) => o.idempotencyKey === params.idempotencyKey);
    if (existing) {
      return existing;
    }
  }

  const ttlMinutes = settings.orderTtlMinutes || 30;
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  const orderNumber = params.orderNumber || generateOrderNumber();
  const verificationToken = generateVerificationToken();
  const verificationCode = generateVerificationCode();

  const newOrder: OrderRecord = {
    id: crypto.randomUUID(),
    orderNumber,
    verificationToken,
    verificationCode,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "PENDING_WHATSAPP",
    type: params.type,
    paymentMethod: params.paymentMethod,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    customerPhoneNormalized: params.customerPhoneNormalized,
    customerNotes: params.customerNotes,
    deliveryAddress: params.deliveryAddress,
    deliveryFee: params.deliveryFee,
    branchId: params.branchId,
    branchNameAr: params.branchNameAr,
    branchNameEn: params.branchNameEn,
    branchAddressAr: params.branchAddressAr,
    branchAddressEn: params.branchAddressEn,
    branchPhoneIntl: params.branchPhoneIntl,
    branchWhatsappNumber: params.branchWhatsappNumber,
    currency: params.currency,
    items: params.items,
    subtotal: params.subtotal,
    totalDiscount: params.totalDiscount,
    serviceCharge: params.serviceCharge || 0,
    vatNote: params.vatNote,
    total: params.total,
    idempotencyKey: params.idempotencyKey,
    clientIp: params.clientIp,
    whatsappMessage: params.whatsappMessage,
    whatsappUrl: params.whatsappUrl,
    timeline: [
      {
        timestamp: now.toISOString(),
        actor: "customer",
        action: "created_order",
        toStatus: "PENDING_WHATSAPP",
        note: "Order created, waiting for customer to dispatch WhatsApp message",
      },
    ],
  };

  orders.unshift(newOrder);
  saveOrders(orders);
  return newOrder;
}

export function getOrderByNumber(orderNumber: string): OrderRecord | null {
  const orders = loadOrders();
  if (checkOrderExpirations(orders)) {
    saveOrders(orders);
  }
  return orders.find((o) => o.orderNumber === orderNumber) || null;
}

export function getOrderById(id: string): OrderRecord | null {
  const orders = loadOrders();
  if (checkOrderExpirations(orders)) {
    saveOrders(orders);
  }
  return orders.find((o) => o.id === id) || null;
}

export function getOrderByVerification(orderNumber: string, token: string): OrderRecord | null {
  const orders = loadOrders();
  if (checkOrderExpirations(orders)) {
    saveOrders(orders);
  }
  const order = orders.find((o) => o.orderNumber === orderNumber);
  if (!order) return null;
  if (order.verificationToken !== token) return null;
  return order;
}

/** Customer clicks "لقد أرسلت الطلب" */
export function confirmCustomerSent(orderNumber: string): OrderRecord | null {
  const orders = loadOrders();
  const order = orders.find((o) => o.orderNumber === orderNumber);
  if (!order) return null;

  if (order.status === "PENDING_WHATSAPP") {
    const now = new Date().toISOString();
    order.status = "CUSTOMER_CONFIRMED_SENT";
    order.updatedAt = now;
    order.timeline.push({
      timestamp: now,
      actor: "customer",
      action: "customer_confirmed_sent",
      fromStatus: "PENDING_WHATSAPP",
      toStatus: "CUSTOMER_CONFIRMED_SENT",
      note: "Customer confirmed sending the order details via WhatsApp",
    });
    saveOrders(orders);
  }

  return order;
}

/** Valid transitions for state machine */
export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING_WHATSAPP", "CANCELLED"],
  PENDING_WHATSAPP: ["CUSTOMER_CONFIRMED_SENT", "RECEIVED", "CONFIRMED", "CANCELLED", "EXPIRED"],
  CUSTOMER_CONFIRMED_SENT: ["RECEIVED", "CONFIRMED", "REJECTED", "CANCELLED"],
  RECEIVED: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED", "REJECTED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function updateOrderStatus(
  identifier: string, // id or orderNumber
  newStatus: OrderStatus,
  actor: string = "admin",
  reasonOrNote?: string
): { success: boolean; order?: OrderRecord; error?: string } {
  const orders = loadOrders();
  const order = orders.find((o) => o.id === identifier || o.orderNumber === identifier);
  if (!order) {
    return { success: false, error: "الطلب غير موجود" };
  }

  const allowed = VALID_STATUS_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `لا يمكن تحويل الطلب من حالة ${order.status} إلى ${newStatus}`,
    };
  }

  // Delivery-only status check
  if (order.type === "TAKEAWAY" && newStatus === "OUT_FOR_DELIVERY") {
    return {
      success: false,
      error: "طلبات الاستلام من الفرع لا تدعم حالة خرج للتوصيل",
    };
  }

  const now = new Date().toISOString();
  const prevStatus = order.status;
  order.status = newStatus;
  order.updatedAt = now;

  if (newStatus === "CONFIRMED") {
    order.confirmedAt = now;
    order.confirmedBy = actor;
  }
  if (newStatus === "REJECTED") {
    order.rejectionReason = reasonOrNote;
  }
  if (newStatus === "CANCELLED") {
    order.cancellationReason = reasonOrNote;
  }

  order.timeline.push({
    timestamp: now,
    actor,
    action: `status_change_to_${newStatus.toLowerCase()}`,
    fromStatus: prevStatus,
    toStatus: newStatus,
    note: reasonOrNote,
  });

  saveOrders(orders);
  return { success: true, order };
}

export interface ListOrdersQuery {
  q?: string;
  status?: string;
  type?: string;
  branchId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "newest" | "oldest" | "totalDesc" | "totalAsc" | string;
  page?: number;
  pageSize?: number;
}

export interface ListOrdersResult {
  orders: OrderRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function listOrders(query: ListOrdersQuery = {}): ListOrdersResult {
  const orders = loadOrders();
  if (checkOrderExpirations(orders)) {
    saveOrders(orders);
  }

  let filtered = [...orders];

  if (query.q && query.q.trim()) {
    const q = query.q.trim().toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        o.customerPhone.includes(q) ||
        o.customerPhoneNormalized.includes(q) ||
        o.verificationCode.toLowerCase().includes(q)
    );
  }

  if (query.status && query.status !== "ALL") {
    filtered = filtered.filter((o) => o.status === query.status);
  }

  if (query.type && query.type !== "ALL") {
    filtered = filtered.filter((o) => o.type === query.type);
  }

  if (query.branchId && query.branchId !== "ALL") {
    filtered = filtered.filter((o) => o.branchId === query.branchId);
  }

  if (query.paymentMethod && query.paymentMethod !== "ALL") {
    filtered = filtered.filter((o) => o.paymentMethod === query.paymentMethod);
  }

  if (query.dateFrom) {
    const from = new Date(query.dateFrom);
    filtered = filtered.filter((o) => new Date(o.createdAt) >= from);
  }

  if (query.dateTo) {
    const to = new Date(query.dateTo);
    filtered = filtered.filter((o) => new Date(o.createdAt) <= to);
  }

  // Sorting
  if (query.sortBy === "oldest") {
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (query.sortBy === "totalDesc") {
    filtered.sort((a, b) => b.total - a.total);
  } else if (query.sortBy === "totalAsc") {
    filtered.sort((a, b) => a.total - b.total);
  } else {
    // Default: newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = filtered.length;
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.max(1, Math.min(100, query.pageSize || 20));
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return {
    orders: pageItems,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export interface OrdersStats {
  totalOrders: number;
  newOrders: number; // PENDING_WHATSAPP, CUSTOMER_CONFIRMED_SENT, RECEIVED
  inProgressOrders: number; // CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY
  completedOrders: number; // COMPLETED
  cancelledOrRejectedOrders: number; // REJECTED, CANCELLED, EXPIRED
  confirmedOrders: number;
  pendingReviewOrders: number;
  totalRevenue: number; // Strictly only from CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, COMPLETED
  avgOrderValue: number;
  ordersToday: number;
  revenueToday: number;
}

export function getOrdersStats(): OrdersStats {
  const orders = loadOrders();
  if (checkOrderExpirations(orders)) {
    saveOrders(orders);
  }

  const validRevenueStatuses: OrderStatus[] = [
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "COMPLETED",
  ];

  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);

  let totalOrders = 0;
  let newOrders = 0;
  let inProgressOrders = 0;
  let completedOrders = 0;
  let cancelledOrRejectedOrders = 0;
  let confirmedOrders = 0;
  let pendingReviewOrders = 0;
  let totalRevenue = 0;
  let ordersToday = 0;
  let revenueToday = 0;

  for (const o of orders) {
    totalOrders++;
    const isToday = o.createdAt.slice(0, 10) === todayDateStr;
    if (isToday) {
      ordersToday++;
    }

    if (
      o.status === "PENDING_WHATSAPP" ||
      o.status === "CUSTOMER_CONFIRMED_SENT" ||
      o.status === "RECEIVED"
    ) {
      newOrders++;
      pendingReviewOrders++;
    } else if (
      o.status === "CONFIRMED" ||
      o.status === "PREPARING" ||
      o.status === "READY" ||
      o.status === "OUT_FOR_DELIVERY"
    ) {
      inProgressOrders++;
    } else if (o.status === "COMPLETED") {
      completedOrders++;
    } else if (
      o.status === "REJECTED" ||
      o.status === "CANCELLED" ||
      o.status === "EXPIRED"
    ) {
      cancelledOrRejectedOrders++;
    }

    if (validRevenueStatuses.includes(o.status)) {
      confirmedOrders++;
      totalRevenue += o.total;
      if (isToday) {
        revenueToday += o.total;
      }
    }
  }

  const avgOrderValue = confirmedOrders > 0 ? Math.round(totalRevenue / confirmedOrders) : 0;

  return {
    totalOrders,
    newOrders,
    inProgressOrders,
    completedOrders,
    cancelledOrRejectedOrders,
    confirmedOrders,
    pendingReviewOrders,
    totalRevenue,
    avgOrderValue,
    ordersToday,
    revenueToday,
  };
}

/**
 * Calculates real product popularity (order counts and quantities) from all confirmed/completed orders.
 * Strictly based on actual customer orders in orders-store.json (no fake numbers).
 */
export function getMostOrderedProductStats(): Record<string, { count: number; totalQty: number; name: string }> {
  const orders = loadOrders();
  const confirmedStatuses: OrderStatus[] = [
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "COMPLETED",
  ];

  const stats: Record<string, { count: number; totalQty: number; name: string }> = {};

  for (const o of orders) {
    if (!confirmedStatuses.includes(o.status)) continue;
    for (const item of o.items) {
      if (!stats[item.productId]) {
        stats[item.productId] = { count: 0, totalQty: 0, name: item.productName };
      }
      stats[item.productId].count += 1;
      stats[item.productId].totalQty += item.quantity;
    }
  }

  return stats;
}
