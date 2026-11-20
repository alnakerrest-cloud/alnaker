// lib/customer-store.ts
// ==============================================================================
// إدارة هوية العملاء الدائمة (Persistent Customer Identity & Phone Management)
// customerId هو الهوية الأساسية الثابتة - رقم الهاتف قابل للتغيير بدون فقدان البيانات
// ==============================================================================

import crypto from "node:crypto";
import pg from "pg";
import { getConfiguredDatabaseUrl, pgSslConfig } from "./database-url";

export interface CustomerRecord {
  id: string; // المعرف الثابت الدائم (e.g. cust_xxxxxxxx)
  phone: string; // رقم الهاتف المصري المعياري (e.g. 201012345678)
  name?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory / local fallback store for environments without DB
const memoryCustomerMap = new Map<string, CustomerRecord>(); // id -> CustomerRecord
const memoryPhoneIndex = new Map<string, string>(); // phone -> id

function getPgPool(): pg.Pool | null {
  let connectionString: string | null;
  try {
    connectionString = getConfiguredDatabaseUrl();
  } catch {
    return null;
  }
  if (!connectionString) return null;

  const globalObj = globalThis as unknown as { __pgCustomerPool?: pg.Pool };
  if (!globalObj.__pgCustomerPool) {
    globalObj.__pgCustomerPool = new pg.Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      ssl: pgSslConfig(connectionString),
    });
  }
  return globalObj.__pgCustomerPool;
}

let tableInitPromise: Promise<void> | null = null;

export async function ensureCustomerTableAsync(): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;

  if (!tableInitPromise) {
    tableInitPromise = (async () => {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Customer" (
            "id" TEXT PRIMARY KEY,
            "phone" TEXT UNIQUE NOT NULL,
            "name" TEXT,
            "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS "idx_customer_phone" ON "Customer"("phone");
        `);
      } catch (err: any) {
        console.warn("[customer-store] Table init warning:", err.message);
      }
    })();
  }
  await tableInitPromise;
}

export function convertArabicIndicDigits(str: string): string {
  if (!str) return "";
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return str.replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
}

export function normalizeEgyptianPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone || typeof phone !== "string") {
    return { valid: false, normalized: "", error: "رقم الهاتف مطلوب" };
  }
  const cleanPhone = convertArabicIndicDigits(phone.trim());
  const digits = cleanPhone.replace(/\D/g, "");

  if (digits.startsWith("20")) {
    const national = digits.slice(2);
    if (national.length === 10 && /^1[0-25]\d{8}$/.test(national)) {
      return { valid: true, normalized: digits };
    }
  }

  if (digits.length === 11 && digits.startsWith("01")) {
    if (/^01[0-25]\d{8}$/.test(digits)) {
      return { valid: true, normalized: "2" + digits };
    }
  }

  if (digits.length === 10 && /^1[0-25]\d{8}$/.test(digits)) {
    return { valid: true, normalized: "20" + digits };
  }

  return {
    valid: false,
    normalized: digits,
    error: "يجب إدخال رقم هاتف مصري صحيح (مثال: 01024994092)",
  };
}

export function generatePersistentCustomerId(): string {
  const rand = crypto.randomBytes(8).toString("hex");
  return `cust_${rand}`;
}

/**
 * استرجاع العميل بالـ ID الدائم
 */
export async function getCustomerByIdAsync(customerId: string): Promise<CustomerRecord | null> {
  if (!customerId) return null;

  await ensureCustomerTableAsync();
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT "id", "phone", "name", "createdAt", "updatedAt" FROM "Customer" WHERE "id" = $1 LIMIT 1`,
        [customerId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          phone: row.phone,
          name: row.name || undefined,
          createdAt: new Date(row.createdAt).toISOString(),
          updatedAt: new Date(row.updatedAt).toISOString(),
        };
      }
    } catch (err: any) {
      console.warn("[customer-store] getCustomerById error:", err.message);
    }
  }

  return memoryCustomerMap.get(customerId) || null;
}

/**
 * استرجاع العميل برقم الهاتف
 */
export async function getCustomerByPhoneAsync(phoneOrNormalized: string): Promise<CustomerRecord | null> {
  const check = normalizeEgyptianPhone(phoneOrNormalized);
  const normalized = check.valid ? check.normalized : phoneOrNormalized.replace(/\D/g, "");
  if (!normalized) return null;

  await ensureCustomerTableAsync();
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT "id", "phone", "name", "createdAt", "updatedAt" FROM "Customer" WHERE "phone" = $1 LIMIT 1`,
        [normalized]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          phone: row.phone,
          name: row.name || undefined,
          createdAt: new Date(row.createdAt).toISOString(),
          updatedAt: new Date(row.updatedAt).toISOString(),
        };
      }
    } catch (err: any) {
      console.warn("[customer-store] getCustomerByPhone error:", err.message);
    }
  }

  const memId = memoryPhoneIndex.get(normalized);
  if (memId) {
    return memoryCustomerMap.get(memId) || null;
  }
  return null;
}

/**
 * استرجاع العميل الحالي أو إنشاء عميل جديد برقم الهاتف (Idempotent)
 */
export async function getOrCreateCustomerByPhoneAsync(
  phoneOrNormalized: string,
  name?: string,
  preferredId?: string
): Promise<CustomerRecord> {
  const check = normalizeEgyptianPhone(phoneOrNormalized);
  const normalized = check.valid ? check.normalized : phoneOrNormalized.replace(/\D/g, "");

  // 1. فحص إذا كان موجوداً بالفعل بالهاتف
  const existing = await getCustomerByPhoneAsync(normalized);
  if (existing) {
    // تحديث الاسم إذا تم تقديمه ولم يكن مسجلاً
    if (name && (!existing.name || existing.name !== name)) {
      await updateCustomerNameAsync(existing.id, name);
      existing.name = name;
    }
    return existing;
  }

  // 2. فحص إذا كان موجوداً بالـ preferredId ومطابق لنفس الهاتف
  if (preferredId) {
    const existingById = await getCustomerByIdAsync(preferredId);
    if (existingById && existingById.phone === normalized) {
      if (name && (!existingById.name || existingById.name !== name)) {
        await updateCustomerNameAsync(existingById.id, name);
        existingById.name = name;
      }
      return existingById;
    }
  }

  // 3. إنشاء عميل جديد بهوية دائمة ثابتة
  const now = new Date().toISOString();
  const newId = generatePersistentCustomerId();
  const newRecord: CustomerRecord = {
    id: newId,
    phone: normalized,
    name: name?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await ensureCustomerTableAsync();
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `INSERT INTO "Customer" ("id", "phone", "name", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("phone") DO UPDATE SET "name" = COALESCE(EXCLUDED."name", "Customer"."name"), "updatedAt" = NOW()
         RETURNING "id", "phone", "name", "createdAt", "updatedAt"`,
        [newRecord.id, newRecord.phone, newRecord.name || null, newRecord.createdAt, newRecord.updatedAt]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          phone: row.phone,
          name: row.name || undefined,
          createdAt: new Date(row.createdAt).toISOString(),
          updatedAt: new Date(row.updatedAt).toISOString(),
        };
      }
    } catch (err: any) {
      console.warn("[customer-store] getOrCreate insert warning:", err.message);
    }
  }

  memoryCustomerMap.set(newRecord.id, newRecord);
  memoryPhoneIndex.set(newRecord.phone, newRecord.id);
  return newRecord;
}

/**
 * ضمان وجود سجل العميل في جدول Customer استناداً إلى جلسة العميل الموثقة
 * يضمن تماماً عدم حدوث أي انتهاك للمفاتيح الأجنبية (Foreign Key)
 */
export async function ensureCustomerSessionRecordAsync(session: {
  customerId: string;
  phoneNormalized: string;
  customerName?: string;
}): Promise<CustomerRecord> {
  if (!session || !session.customerId) {
    throw new Error("جلسة غير صالحة");
  }

  // 1. فحص الـ Customer بالـ ID
  const existingById = await getCustomerByIdAsync(session.customerId);
  if (existingById) {
    return existingById;
  }

  // 2. إذا لم يكن موجوداً بالـ ID، جلبه أو إنشاؤه بالهاتف مع تفضيل session.customerId
  const cust = await getOrCreateCustomerByPhoneAsync(
    session.phoneNormalized,
    session.customerName,
    session.customerId
  );
  return cust;
}

export async function updateCustomerNameAsync(customerId: string, name: string): Promise<void> {
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `UPDATE "Customer" SET "name" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        [name, customerId]
      );
    } catch {}
  }
  const mem = memoryCustomerMap.get(customerId);
  if (mem) {
    mem.name = name;
    mem.updatedAt = new Date().toISOString();
  }
}

/**
 * فحص توفر الرقم الجديد (Duplicate Phone Protection)
 * يمنع سرقة الحسابات أو ازدواجية الأرقام
 */
export async function checkPhoneAvailabilityAsync(
  newPhoneNormalized: string,
  currentCustomerId: string
): Promise<{ available: boolean; error?: string }> {
  await ensureCustomerTableAsync();
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT "id" FROM "Customer" WHERE "phone" = $1 AND "id" != $2 LIMIT 1`,
        [newPhoneNormalized, currentCustomerId]
      );
      if (res.rows.length > 0) {
        return { available: false, error: "رقم الهاتف مستخدم بالفعل لحساب عميل آخر." };
      }
    } catch (err: any) {
      console.warn("[customer-store] checkPhoneAvailability error:", err.message);
    }
  }

  const existingMemId = memoryPhoneIndex.get(newPhoneNormalized);
  if (existingMemId && existingMemId !== currentCustomerId) {
    return { available: false, error: "رقم الهاتف مستخدم بالفعل لحساب عميل آخر." };
  }

  return { available: true };
}

/**
 * تغيير رقم هاتف العميل مع الحفاظ التام على Customer ID وكل الـ Order History
 */
export async function updateCustomerPhoneAsync(
  customerId: string,
  newPhoneOrNormalized: string
): Promise<{ success: boolean; customer?: CustomerRecord; error?: string }> {
  const phoneCheck = normalizeEgyptianPhone(newPhoneOrNormalized);
  if (!phoneCheck.valid) {
    return { success: false, error: phoneCheck.error || "رقم الهاتف غير صحيح." };
  }
  const newNormalized = phoneCheck.normalized;

  // 1. فحص وجود العميل الحالي
  const customer = await getCustomerByIdAsync(customerId);
  if (!customer) {
    return { success: false, error: "لا يمكن تنفيذ العملية: حساب العميل غير موجود." };
  }

  if (customer.phone === newNormalized) {
    return { success: true, customer };
  }

  // 2. التحقق من عدم استخدام الرقم بواسطة عميل آخر
  const availability = await checkPhoneAvailabilityAsync(newNormalized, customerId);
  if (!availability.available) {
    return { success: false, error: availability.error || "رقم الهاتف مستخدم بالفعل لحساب عميل آخر." };
  }

  const oldPhone = customer.phone;
  const now = new Date().toISOString();

  await ensureCustomerTableAsync();
  const pool = getPgPool();

  if (pool) {
    try {
      // 3. تحديث جدول Customer دون تغيير الـ id
      const updateRes = await pool.query(
        `UPDATE "Customer" 
         SET "phone" = $1, "updatedAt" = $2 
         WHERE "id" = $3 
         RETURNING "id", "phone", "name", "createdAt", "updatedAt"`,
        [newNormalized, now, customerId]
      );

      // 4. ربط وتحديث الطلبات السابقة في OrderStore لضمان مطابقة الـ customerId
      await pool.query(
        `UPDATE "OrderStore"
         SET "data" = jsonb_set(
           jsonb_set("data", '{customerId}', to_jsonb($1::text)),
           '{customerPhoneNormalized}', to_jsonb($2::text)
         ),
         "updatedAt" = NOW()
         WHERE "data"->>'customerId' = $1
            OR "data"->>'customerPhoneNormalized' = $3
            OR "data"->>'customerPhone' = $3`,
        [customerId, newNormalized, oldPhone]
      );

      const row = updateRes.rows[0];
      const updatedCustomer: CustomerRecord = {
        id: row.id,
        phone: row.phone,
        name: row.name || undefined,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      };

      // تحديث الذاكرة المحلية
      memoryCustomerMap.set(customerId, updatedCustomer);
      memoryPhoneIndex.delete(oldPhone);
      memoryPhoneIndex.set(newNormalized, customerId);

      // تحديث كاش الطلبات في الذاكرة
      try {
        const globalObj = globalThis as unknown as { __cachedOrders?: any[] };
        if (Array.isArray(globalObj.__cachedOrders)) {
          for (const o of globalObj.__cachedOrders) {
            if (o.customerId === customerId || o.customerPhoneNormalized === oldPhone) {
              o.customerId = customerId;
              o.customerPhoneNormalized = newNormalized;
            }
          }
        }
      } catch {}

      return { success: true, customer: updatedCustomer };
    } catch (err: any) {
      console.error("[customer-store] DB update phone error:", err);
      return { success: false, error: "تعذّر حفظ رقم الهاتف الجديد في قاعدة البيانات." };
    }
  }

  // Memory fallback
  customer.phone = newNormalized;
  customer.updatedAt = now;
  memoryCustomerMap.set(customerId, customer);
  memoryPhoneIndex.delete(oldPhone);
  memoryPhoneIndex.set(newNormalized, customerId);

  return { success: true, customer };
}
