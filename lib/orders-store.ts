import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import { getConfiguredDatabaseUrl, pgSslConfig } from "./database-url";

import { generateCustomerId } from "./customer-session";
import { createOrderNotificationAsync } from "./customer-hub-store";

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
  customerId?: string;
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

const DEFAULT_ORDERS_DIR = path.join(process.cwd(), "data", "orders");
const FALLBACK_TMP_DIR = path.join("/tmp", "naqer-orders");

function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
}

function getOrdersDir(): string {
  if (isServerless()) {
    return FALLBACK_TMP_DIR;
  }
  return DEFAULT_ORDERS_DIR;
}

// In-memory cache for lambdas across invocations
const globalForOrders = globalThis as unknown as {
  __cachedOrders?: OrderRecord[];
  __cachedSettings?: MenuModeSettings;
  __pgPool?: pg.Pool;
};

function getPgPool(): pg.Pool | null {
  const connectionString = getConfiguredDatabaseUrl();
  if (!connectionString) return null;
  if (!globalForOrders.__pgPool) {
    globalForOrders.__pgPool = new pg.Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      keepAlive: true,
      ssl: pgSslConfig(connectionString),
    });
    globalForOrders.__pgPool.on("error", (err) => {
      console.warn("[orders-store] PG pool idle note:", err.message);
    });
  }
  return globalForOrders.__pgPool;
}

export async function persistOrderToDb(order: OrderRecord): Promise<void> {
  const pool = getPgPool();
  if (!pool) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      throw new Error("DATABASE_URL is not configured - unable to persist order to database");
    }
    return;
  }

  const query = `
    INSERT INTO "OrderStore" ("id", "orderNumber", "verificationToken", "data", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT ("id") DO UPDATE SET 
      "orderNumber" = EXCLUDED."orderNumber",
      "verificationToken" = EXCLUDED."verificationToken",
      "data" = EXCLUDED."data", 
      "updatedAt" = EXCLUDED."updatedAt"
  `;
  const values = [
    order.id,
    order.orderNumber,
    order.verificationToken,
    JSON.stringify(order),
    order.createdAt,
    order.updatedAt,
  ];

  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await pool.query(query, values);
      return;
    } catch (err: any) {
      lastError = err;
      console.warn(`[orders-store] DB persist attempt ${attempt} warning:`, err.message);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 500));
      }
    }
  }

  throw new Error(`Failed to commit order ${order.orderNumber} to database after 3 attempts: ${lastError?.message || lastError}`);
}

function ensureStorageDir(dir: string): boolean {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function readJsonFile<T>(fileName: string, defaultValue: T): T {
  // 1. If in-memory cache has it (for orders/settings in active lambda)
  if (fileName === "orders-store.json" && Array.isArray(globalForOrders.__cachedOrders)) {
    return globalForOrders.__cachedOrders as unknown as T;
  }
  if (fileName === "settings.json" && globalForOrders.__cachedSettings) {
    return globalForOrders.__cachedSettings as unknown as T;
  }

  // 2. Check /tmp on serverless or custom orders dir
  const currentDir = getOrdersDir();
  const filePath = path.join(currentDir, fileName);
  const seedPath = path.join(DEFAULT_ORDERS_DIR, fileName);

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content) as T;
      if (fileName === "orders-store.json") globalForOrders.__cachedOrders = parsed as unknown as OrderRecord[];
      if (fileName === "settings.json") globalForOrders.__cachedSettings = parsed as unknown as MenuModeSettings;
      return parsed;
    }
  } catch {}

  // 3. Fallback to bundled seed file in data/orders/
  try {
    if (fs.existsSync(seedPath)) {
      const content = fs.readFileSync(seedPath, "utf8");
      const parsed = JSON.parse(content) as T;
      if (fileName === "orders-store.json") globalForOrders.__cachedOrders = parsed as unknown as OrderRecord[];
      if (fileName === "settings.json") globalForOrders.__cachedSettings = parsed as unknown as MenuModeSettings;
      try {
        ensureStorageDir(currentDir);
        fs.writeFileSync(filePath, content, "utf8");
      } catch {}
      return parsed;
    }
  } catch {}

  return defaultValue;
}

function writeJsonFile<T>(fileName: string, data: T): void {
  // Update in-memory cache immediately
  if (fileName === "orders-store.json") globalForOrders.__cachedOrders = data as unknown as OrderRecord[];
  if (fileName === "settings.json") globalForOrders.__cachedSettings = data as unknown as MenuModeSettings;

  const currentDir = getOrdersDir();
  const filePath = path.join(currentDir, fileName);

  try {
    ensureStorageDir(currentDir);
    const tmpFile = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmpFile, filePath);
  } catch (err: any) {
    // If writing to default directory failed (EROFS on Vercel), write to /tmp
    try {
      ensureStorageDir(FALLBACK_TMP_DIR);
      const fallbackFile = path.join(FALLBACK_TMP_DIR, fileName);
      const tmpFile = `${fallbackFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
      fs.renameSync(tmpFile, fallbackFile);
    } catch (fallbackErr: any) {
      console.warn(`[orders-store] Storage write warning (memory cache active):`, fallbackErr?.message || fallbackErr);
    }
  }
}

export function loadOrders(): OrderRecord[] {
  return readJsonFile<OrderRecord[]>("orders-store.json", []);
}

export function saveOrders(orders: OrderRecord[]): void {
  writeJsonFile("orders-store.json", orders);
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
  return readJsonFile<MenuModeSettings>("settings.json", DEFAULT_SETTINGS);
}

export async function getMenuSettingsAsync(forceFresh = false): Promise<MenuModeSettings> {
  if (!forceFresh && globalForOrders.__cachedSettings) {
    return globalForOrders.__cachedSettings;
  }
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT "data" FROM "OrderStore" WHERE "id" = 'settings_menu_mode' LIMIT 1`
      );
      if (res.rows[0]?.data) {
        const rawData = res.rows[0].data;
        const dbSettings = (typeof rawData === "string" ? JSON.parse(rawData) : rawData) as MenuModeSettings;
        globalForOrders.__cachedSettings = dbSettings;
        return dbSettings;
      }
    } catch (err: any) {
      console.warn("[orders-store] DB getMenuSettings error:", err.message);
    }
  }
  return getMenuSettings();
}

export async function updateMenuSettingsAsync(partial: Partial<MenuModeSettings>): Promise<MenuModeSettings> {
  const current = await getMenuSettingsAsync();
  const updated: MenuModeSettings = {
    ...current,
    ...partial,
    branchOverrides: {
      ...current.branchOverrides,
      ...(partial.branchOverrides || {}),
    },
  };
  writeJsonFile("settings.json", updated);

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO "OrderStore" ("id", "orderNumber", "verificationToken", "data", "createdAt", "updatedAt")
         VALUES ('settings_menu_mode', 'SETTINGS', 'settings_token', $1, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = NOW()`,
        [JSON.stringify(updated)]
      );
    } catch (err: any) {
      console.warn("[orders-store] DB settings save warning:", err.message);
    }
  }

  globalForOrders.__cachedSettings = updated;
  return updated;
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
  writeJsonFile("settings.json", updated);

  const pool = getPgPool();
  if (pool) {
    pool.query(
      `INSERT INTO "OrderStore" ("id", "orderNumber", "verificationToken", "data", "createdAt", "updatedAt")
       VALUES ('settings_menu_mode', 'SETTINGS', 'settings_token', $1, NOW(), NOW())
       ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = NOW()`,
      [JSON.stringify(updated)]
    ).catch((err: any) => {
      console.warn("[orders-store] DB settings save warning:", err.message);
    });
  }

  globalForOrders.__cachedSettings = updated;
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
  id?: string;
  orderNumber?: string;
  verificationToken?: string;
  verificationCode?: string;
  customerId?: string;
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

export async function createOrder(params: CreateOrderParams): Promise<OrderRecord> {
  const settings = getMenuSettings();
  const now = new Date();

  // 1. Idempotency check: memory + Neon DB
  if (params.idempotencyKey) {
    const orders = loadOrders();
    const existingMem = orders.find((o) => o.idempotencyKey === params.idempotencyKey);
    if (existingMem) {
      return existingMem;
    }

    const pool = getPgPool();
    if (pool) {
      try {
        const idempRes = await pool.query(
          `SELECT "data" FROM "OrderStore" WHERE "data"->>'idempotencyKey' = $1 LIMIT 1`,
          [params.idempotencyKey]
        );
        if (idempRes.rows[0]?.data) {
          const existingDb = idempRes.rows[0].data as OrderRecord;
          orders.unshift(existingDb);
          saveOrders(orders);
          return existingDb;
        }
      } catch (err: any) {
        console.warn("[orders-store] Idempotency DB check note:", err.message);
      }
    }
  }

  const ttlMinutes = settings.orderTtlMinutes || 30;
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  const orderNumber = params.orderNumber || generateOrderNumber();
  const verificationToken = params.verificationToken || generateVerificationToken();
  const verificationCode = params.verificationCode || generateVerificationCode();

  const newOrder: OrderRecord = {
    id: params.id || crypto.randomUUID(),
    orderNumber,
    verificationToken,
    verificationCode,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "PENDING_WHATSAPP",
    type: params.type,
    paymentMethod: params.paymentMethod,
    customerId: params.customerId || generateCustomerId(params.customerPhoneNormalized),
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

  // 2. Await durable commit to authoritative PostgreSQL database BEFORE returning
  await persistOrderToDb(newOrder);

  // 3. Update memory/filesystem caches
  const orders = loadOrders();
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
    persistOrderToDb(order).catch(() => {});
  }

  return order;
}

export async function getOrderByNumberAsync(orderNumber: string): Promise<OrderRecord | null> {
  const clean = decodeURIComponent(orderNumber || "").trim();
  if (!clean) return null;

  const local = getOrderByNumber(clean);
  if (local) return local;

  const pool = getPgPool();
  if (!pool) return null;
  try {
    const res = await pool.query(
      `SELECT "data" FROM "OrderStore" 
       WHERE "orderNumber" = $1 OR UPPER("orderNumber") = UPPER($1) 
       LIMIT 1`,
      [clean]
    );
    if (res.rows[0]?.data) {
      const order = res.rows[0].data as OrderRecord;
      const orders = loadOrders();
      if (!orders.some((o) => o.orderNumber === order.orderNumber)) {
        orders.unshift(order);
        saveOrders(orders);
      }
      return order;
    }
  } catch (err: any) {
    console.warn("[orders-store] DB fetch note:", err.message);
  }
  return null;
}

export async function getOrderByVerificationAsync(orderNumber: string, token: string): Promise<OrderRecord | null> {
  const cleanNumber = decodeURIComponent(orderNumber || "").trim();
  const cleanToken = decodeURIComponent(token || "").trim();
  if (!cleanNumber || !cleanToken) return null;

  const local = getOrderByVerification(cleanNumber, cleanToken);
  if (local) return local;

  const pool = getPgPool();
  if (!pool) return null;
  try {
    const res = await pool.query(
      `SELECT "data" FROM "OrderStore" 
       WHERE ("orderNumber" = $1 OR UPPER("orderNumber") = UPPER($1))
         AND ("verificationToken" = $2 OR TRIM("verificationToken") = $2)
       LIMIT 1`,
      [cleanNumber, cleanToken]
    );
    if (res.rows[0]?.data) {
      const order = res.rows[0].data as OrderRecord;
      const orders = loadOrders();
      if (!orders.some((o) => o.orderNumber === order.orderNumber)) {
        orders.unshift(order);
        saveOrders(orders);
      }
      return order;
    }
  } catch (err: any) {
    console.warn("[orders-store] DB fetch by verification note:", err.message);
  }
  return null;
}

export async function getOrderByIdAsync(id: string): Promise<OrderRecord | null> {
  const cleanId = decodeURIComponent(id || "").trim();
  if (!cleanId) return null;

  const local = getOrderById(cleanId);
  if (local) return local;

  const pool = getPgPool();
  if (!pool) return null;
  try {
    const res = await pool.query(
      `SELECT "data" FROM "OrderStore" 
       WHERE "id" = $1 OR "orderNumber" = $1 OR UPPER("orderNumber") = UPPER($1) 
       LIMIT 1`,
      [cleanId]
    );
    if (res.rows[0]?.data) {
      const order = res.rows[0].data as OrderRecord;
      const orders = loadOrders();
      if (!orders.some((o) => o.id === order.id)) {
        orders.unshift(order);
        saveOrders(orders);
      }
      return order;
    }
  } catch (err: any) {
    console.warn("[orders-store] DB fetch by id note:", err.message);
  }
  return null;
}

export async function getOrdersByCustomerPhoneAsync(
  phoneOrNormalized: string,
  customerId?: string,
  limit: number = 25
): Promise<OrderRecord[]> {
  const cleanPhone = phoneOrNormalized.replace(/\D/g, "");
  const orderMap = new Map<string, OrderRecord>();

  // 1. Check local / memory cache first
  const localOrders = loadOrders();
  for (const o of localOrders) {
    const oPhone = (o.customerPhoneNormalized || o.customerPhone || "").replace(/\D/g, "");
    if ((cleanPhone && (oPhone === cleanPhone || oPhone.endsWith(cleanPhone) || cleanPhone.endsWith(oPhone))) ||
        (customerId && o.customerId === customerId)) {
      orderMap.set(o.orderNumber, o);
    }
  }

  // 2. Query Neon PostgreSQL database
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT "data" FROM "OrderStore" 
         WHERE ("data"->>'customerPhoneNormalized' = $1 
            OR "data"->>'customerPhone' = $1
            OR "data"->>'customerPhoneNormalized' LIKE '%' || $2
            OR ($3::text IS NOT NULL AND "data"->>'customerId' = $3))
         ORDER BY "createdAt" DESC
         LIMIT $4`,
        [cleanPhone, cleanPhone.slice(-9), customerId || null, limit]
      );

      for (const row of res.rows) {
        if (row.data) {
          const ord = row.data as OrderRecord;
          orderMap.set(ord.orderNumber, ord);
        }
      }
    } catch (err: any) {
      console.warn("[orders-store] DB fetch by customer phone note:", err.message);
    }
  }

  // Sort by createdAt descending
  return Array.from(orderMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function confirmCustomerSentAsync(orderNumber: string): Promise<OrderRecord | null> {
  let order = await getOrderByNumberAsync(orderNumber);
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
    const orders = loadOrders();
    const idx = orders.findIndex((o) => o.orderNumber === orderNumber);
    if (idx !== -1) {
      orders[idx] = order;
      saveOrders(orders);
    }
    await persistOrderToDb(order);
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
  persistOrderToDb(order).catch(() => {});
  return { success: true, order };
}

const STATUS_NOTIFICATIONS: Partial<Record<OrderStatus, { title: string; message: string }>> = {
  RECEIVED: { title: "تم استلام طلبك", message: "تم استلام تفاصيل طلبك وهو بانتظار المراجعة والتأكيد." },
  CONFIRMED: { title: "تم تأكيد طلبك ✅", message: "تم تأكيد طلبك بنجاح من المطعم وجاري إدراجه بجدول العمل." },
  PREPARING: { title: "بدأ تحضير وجبتك 🍳", message: "فريق المطبخ بدأ الآن في تجهيز طلبك بعناية." },
  READY: { title: "طلبك جاهز ✨", message: "طلبك جاهز للاستلام أو الخروج مع مندوب التوصيل." },
  OUT_FOR_DELIVERY: { title: "الطلب في الطريق إليك 🚚", message: "مندوب التوصيل في طريقه إليك الآن بوجبتك الساخنة." },
  COMPLETED: { title: "تم تسليم الطلب بنجاح 🎉", message: "نتمنى لك وجبة شهية وتجربة مميزة مع قرية الناقر!" },
  REJECTED: { title: "تحديث بشأن الطلب ❌", message: "نعتذر عن عدم إمكانية تنفيذ الطلب حالياً." },
  CANCELLED: { title: "تم إلغاء الطلب 🚫", message: "تم إلغاء الطلب بناءً على رغبتك أو رغبة الفرع." },
};

export async function updateOrderStatusAsync(
  identifier: string,
  newStatus: OrderStatus,
  actor: string = "admin",
  reasonOrNote?: string
): Promise<{ success: boolean; order?: OrderRecord; error?: string }> {
  // First ensure loaded from DB if not in memory
  let order = await getOrderByIdAsync(identifier);
  if (!order) {
    return { success: false, error: "الطلب غير موجود" };
  }

  const result = updateOrderStatus(identifier, newStatus, actor, reasonOrNote);
  if (result.success && result.order) {
    try {
      await persistOrderToDb(result.order);
    } catch (e: any) {
      console.warn("[orders-store] updateOrderStatusAsync DB persist note:", e.message);
    }

    // إنشاء إشعار حقيقي للعميل صاحب الطلب
    if (result.order.customerId && STATUS_NOTIFICATIONS[newStatus]) {
      const notifMeta = STATUS_NOTIFICATIONS[newStatus]!;
      createOrderNotificationAsync({
        customerId: result.order.customerId,
        orderNumber: result.order.orderNumber,
        title: notifMeta.title,
        message: `${notifMeta.message} (طلب #${result.order.orderNumber})`,
        type: "ORDER_STATUS",
      }).catch((err) => console.warn("[orders-store] Notification creation note:", err.message));
    }
  }
  return result;
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

export async function listOrdersAsync(query: ListOrdersQuery = {}): Promise<ListOrdersResult> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT "data" FROM "OrderStore" ORDER BY "createdAt" DESC LIMIT 500');
      if (res.rows.length > 0) {
        const dbOrders: OrderRecord[] = res.rows.map((r) => r.data);
        const orders = loadOrders();
        const map = new Map<string, OrderRecord>();
        for (const o of orders) map.set(o.id, o);
        for (const o of dbOrders) map.set(o.id, o);
        globalForOrders.__cachedOrders = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err: any) {
      console.warn("[orders-store] DB listOrders note:", err.message);
    }
  }
  return listOrders(query);
}

export async function getOrdersStatsAsync(): Promise<OrdersStats> {
  await listOrdersAsync({ pageSize: 1 });
  return getOrdersStats();
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
