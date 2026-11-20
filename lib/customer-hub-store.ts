// lib/customer-hub-store.ts
// ==============================================================================
// إدارة موديولات مركز العميل الموحد (Unified Customer Hub Store)
// مصدر الحقيقة الوحيد: قاعدة بيانات Neon PostgreSQL مع حماية الصلاحيات بالـ customerId
// ==============================================================================

import crypto from "node:crypto";
import pg from "pg";
import { getCustomerByIdAsync } from "./customer-store";

export interface CustomerAddressRecord {
  id: string;
  customerId: string;
  label: string; // e.g., 'المنزل', 'العمل', 'أخرى'
  city?: string;
  area?: string;
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  notes?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFavoriteItem {
  id: string;
  customerId: string;
  productId: string;
  createdAt: string;
  product?: {
    id: string;
    nameAr: string;
    badge?: string;
    isAvailable: boolean;
    isVisible: boolean;
  };
}

export interface CustomerNotificationRecord {
  id: string;
  customerId: string;
  orderNumber?: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function getPgPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL || process.env["DATABASE_URL "];
  if (!connectionString) return null;

  const globalObj = globalThis as unknown as { __pgCustomerHubPool?: pg.Pool };
  if (!globalObj.__pgCustomerHubPool) {
    globalObj.__pgCustomerHubPool = new pg.Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    });
  }
  return globalObj.__pgCustomerHubPool;
}

// Memory fallbacks for test/local environments
const memoryAddresses = new Map<string, CustomerAddressRecord[]>(); // customerId -> addresses
const memoryFavorites = new Map<string, Set<string>>(); // customerId -> Set of productIds
const memoryNotifications = new Map<string, CustomerNotificationRecord[]>(); // customerId -> notifications

// ==============================================================================
// 1. إدارة العناوين (ADDRESS MANAGEMENT)
// ==============================================================================

export async function getCustomerAddressesAsync(customerId: string): Promise<CustomerAddressRecord[]> {
  if (!customerId) return [];
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT "id", "customerId", "label", "city", "area", "street", "building", "floor", "apartment", "notes", "isDefault", "createdAt", "updatedAt"
         FROM "CustomerAddress"
         WHERE "customerId" = $1
         ORDER BY "isDefault" DESC, "createdAt" DESC`,
        [customerId]
      );
      return res.rows.map((r) => ({
        id: r.id,
        customerId: r.customerId,
        label: r.label,
        city: r.city || undefined,
        area: r.area || undefined,
        street: r.street,
        building: r.building || undefined,
        floor: r.floor || undefined,
        apartment: r.apartment || undefined,
        notes: r.notes || undefined,
        isDefault: Boolean(r.isDefault),
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      }));
    } catch (err: any) {
      console.warn("[customer-hub-store] getCustomerAddresses error:", err.message);
    }
  }

  return memoryAddresses.get(customerId) || [];
}

export async function createCustomerAddressAsync(
  customerId: string,
  data: {
    label: string;
    city?: string;
    area?: string;
    street: string;
    building?: string;
    floor?: string;
    apartment?: string;
    notes?: string;
    isDefault?: boolean;
  }
): Promise<CustomerAddressRecord> {
  const now = new Date().toISOString();
  const addressId = `addr_${crypto.randomBytes(8).toString("hex")}`;
  const pool = getPgPool();

  const cleanStreet = data.street.trim();
  const cleanBuilding = data.building?.trim() || null;
  const cleanFloor = data.floor?.trim() || null;
  const cleanApartment = data.apartment?.trim() || null;
  const cleanCity = data.city?.trim() || null;
  const cleanArea = data.area?.trim() || null;
  const cleanLabel = data.label?.trim() || "المنزل";
  const cleanNotes = data.notes?.trim() || null;

  if (pool) {
    // 1. فحص وجود عنوان متطابق لنفس العميل لمنع التكرار (Idempotent Deduping)
    try {
      const dupRes = await pool.query(
        `SELECT "id", "customerId", "label", "city", "area", "street", "building", "floor", "apartment", "notes", "isDefault", "createdAt", "updatedAt"
         FROM "CustomerAddress"
         WHERE "customerId" = $1
           AND LOWER(TRIM("street")) = LOWER($2)
           AND COALESCE("building", '') = COALESCE($3, '')
           AND COALESCE("apartment", '') = COALESCE($4, '')
         LIMIT 1`,
        [customerId, cleanStreet, cleanBuilding, cleanApartment]
      );
      if (dupRes.rows.length > 0) {
        const existingRow = dupRes.rows[0];
        // إذا طُلب تعيينه كافتراضي وهو ليس كذلك
        if (data.isDefault && !existingRow.isDefault) {
          await setDefaultCustomerAddressAsync(customerId, existingRow.id);
          existingRow.isDefault = true;
        }
        return {
          id: existingRow.id,
          customerId: existingRow.customerId,
          label: existingRow.label,
          city: existingRow.city || undefined,
          area: existingRow.area || undefined,
          street: existingRow.street,
          building: existingRow.building || undefined,
          floor: existingRow.floor || undefined,
          apartment: existingRow.apartment || undefined,
          notes: existingRow.notes || undefined,
          isDefault: Boolean(existingRow.isDefault),
          createdAt: new Date(existingRow.createdAt).toISOString(),
          updatedAt: new Date(existingRow.updatedAt).toISOString(),
        };
      }
    } catch {}

    // 2. إذا كان هذا أول عنوان للعميل، يصبح تلقائياً افتراضياً
    let shouldBeDefault = Boolean(data.isDefault);
    try {
      const countRes = await pool.query(
        `SELECT count(*)::int as count FROM "CustomerAddress" WHERE "customerId" = $1`,
        [customerId]
      );
      if ((countRes.rows[0]?.count ?? 0) === 0) {
        shouldBeDefault = true;
      }
    } catch {}

    // إذا كان العنوان الافتراضي، يتم إلغاء الافتراضي عن باقي العناوين
    if (shouldBeDefault) {
      try {
        await pool.query(
          `UPDATE "CustomerAddress" SET "isDefault" = false WHERE "customerId" = $1`,
          [customerId]
        );
      } catch {}
    }

    try {
      const res = await pool.query(
        `INSERT INTO "CustomerAddress" ("id", "customerId", "label", "city", "area", "street", "building", "floor", "apartment", "notes", "isDefault", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          addressId,
          customerId,
          cleanLabel,
          cleanCity,
          cleanArea,
          cleanStreet,
          cleanBuilding,
          cleanFloor,
          cleanApartment,
          cleanNotes,
          shouldBeDefault,
          now,
          now,
        ]
      );
      const r = res.rows[0];
      return {
        id: r.id,
        customerId: r.customerId,
        label: r.label,
        city: r.city || undefined,
        area: r.area || undefined,
        street: r.street,
        building: r.building || undefined,
        floor: r.floor || undefined,
        apartment: r.apartment || undefined,
        notes: r.notes || undefined,
        isDefault: Boolean(r.isDefault),
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      };
    } catch (err: any) {
      console.error("[customer-hub-store] createCustomerAddress error:", err);
      throw new Error("تعذّر حفظ العنوان في قاعدة البيانات.");
    }
  }

  const newRec: CustomerAddressRecord = {
    id: addressId,
    customerId,
    label: cleanLabel,
    city: cleanCity || undefined,
    area: cleanArea || undefined,
    street: cleanStreet,
    building: cleanBuilding || undefined,
    floor: cleanFloor || undefined,
    apartment: cleanApartment || undefined,
    notes: cleanNotes || undefined,
    isDefault: Boolean(data.isDefault),
    createdAt: now,
    updatedAt: now,
  };

  const list = memoryAddresses.get(customerId) || [];
  if (list.length === 0) newRec.isDefault = true;
  if (newRec.isDefault) {
    list.forEach((a) => (a.isDefault = false));
  }
  list.unshift(newRec);
  memoryAddresses.set(customerId, list);
  return newRec;
}

export async function updateCustomerAddressAsync(
  customerId: string,
  addressId: string,
  data: Partial<Omit<CustomerAddressRecord, "id" | "customerId" | "createdAt">>
): Promise<CustomerAddressRecord | null> {
  const pool = getPgPool();
  const now = new Date().toISOString();

  if (pool) {
    if (data.isDefault) {
      await pool.query(
        `UPDATE "CustomerAddress" SET "isDefault" = false WHERE "customerId" = $1`,
        [customerId]
      );
    }

    const updates: string[] = ['"updatedAt" = $1'];
    const values: any[] = [now, customerId, addressId];
    let idx = 4;

    if (data.label !== undefined) {
      updates.push(`"label" = $${idx++}`);
      values.push(data.label.trim());
    }
    if (data.city !== undefined) {
      updates.push(`"city" = $${idx++}`);
      values.push(data.city?.trim() || null);
    }
    if (data.area !== undefined) {
      updates.push(`"area" = $${idx++}`);
      values.push(data.area?.trim() || null);
    }
    if (data.street !== undefined) {
      updates.push(`"street" = $${idx++}`);
      values.push(data.street.trim());
    }
    if (data.building !== undefined) {
      updates.push(`"building" = $${idx++}`);
      values.push(data.building?.trim() || null);
    }
    if (data.floor !== undefined) {
      updates.push(`"floor" = $${idx++}`);
      values.push(data.floor?.trim() || null);
    }
    if (data.apartment !== undefined) {
      updates.push(`"apartment" = $${idx++}`);
      values.push(data.apartment?.trim() || null);
    }
    if (data.notes !== undefined) {
      updates.push(`"notes" = $${idx++}`);
      values.push(data.notes?.trim() || null);
    }
    if (data.isDefault !== undefined) {
      updates.push(`"isDefault" = $${idx++}`);
      values.push(Boolean(data.isDefault));
    }

    const res = await pool.query(
      `UPDATE "CustomerAddress"
       SET ${updates.join(", ")}
       WHERE "customerId" = $2 AND "id" = $3
       RETURNING *`,
      values
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      customerId: r.customerId,
      label: r.label,
      city: r.city || undefined,
      area: r.area || undefined,
      street: r.street,
      building: r.building || undefined,
      floor: r.floor || undefined,
      apartment: r.apartment || undefined,
      notes: r.notes || undefined,
      isDefault: Boolean(r.isDefault),
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  const list = memoryAddresses.get(customerId) || [];
  const item = list.find((a) => a.id === addressId);
  if (!item) return null;
  if (data.isDefault) list.forEach((a) => (a.isDefault = false));
  Object.assign(item, data, { updatedAt: now });
  return item;
}

export async function setDefaultCustomerAddressAsync(customerId: string, addressId: string): Promise<CustomerAddressRecord | null> {
  const pool = getPgPool();
  if (pool) {
    await pool.query(`UPDATE "CustomerAddress" SET "isDefault" = false WHERE "customerId" = $1`, [customerId]);
    const res = await pool.query(
      `UPDATE "CustomerAddress" SET "isDefault" = true, "updatedAt" = NOW() WHERE "customerId" = $1 AND "id" = $2 RETURNING *`,
      [customerId, addressId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      customerId: r.customerId,
      label: r.label,
      city: r.city || undefined,
      area: r.area || undefined,
      street: r.street,
      building: r.building || undefined,
      floor: r.floor || undefined,
      apartment: r.apartment || undefined,
      notes: r.notes || undefined,
      isDefault: true,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }
  const list = memoryAddresses.get(customerId) || [];
  list.forEach((a) => (a.isDefault = a.id === addressId));
  return list.find((a) => a.id === addressId) || null;
}

export async function deleteCustomerAddressAsync(customerId: string, addressId: string): Promise<boolean> {
  const pool = getPgPool();
  if (pool) {
    // افحص هل كان هذا العنوان هو الافتراضي
    const checkRes = await pool.query(
      `SELECT "isDefault" FROM "CustomerAddress" WHERE "customerId" = $1 AND "id" = $2`,
      [customerId, addressId]
    );
    const wasDefault = Boolean(checkRes.rows[0]?.isDefault);

    const res = await pool.query(
      `DELETE FROM "CustomerAddress" WHERE "customerId" = $1 AND "id" = $2`,
      [customerId, addressId]
    );
    const deleted = (res.rowCount ?? 0) > 0;

    // إذا كان افتراضياً وتم حذفه، رقّي أحدث عنوان متبقٍ ليصبح افتراضياً
    if (deleted && wasDefault) {
      await pool.query(
        `UPDATE "CustomerAddress"
         SET "isDefault" = true
         WHERE "id" = (
           SELECT "id" FROM "CustomerAddress" WHERE "customerId" = $1 ORDER BY "createdAt" DESC LIMIT 1
         )`,
        [customerId]
      );
    }

    return deleted;
  }
  const list = memoryAddresses.get(customerId) || [];
  const idx = list.findIndex((a) => a.id === addressId);
  if (idx !== -1) {
    const wasDefault = list[idx].isDefault;
    list.splice(idx, 1);
    if (wasDefault && list.length > 0) list[0].isDefault = true;
    return true;
  }
  return false;
}

// ==============================================================================
// 2. إدارة المفضلة (FAVORITES MANAGEMENT)
// ==============================================================================

export async function getCustomerFavoritesAsync(customerId: string): Promise<CustomerFavoriteItem[]> {
  if (!customerId) return [];
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT f."id", f."customerId", f."productId", f."createdAt",
                p."id" as prod_id, p."nameAr", p."badge", p."isAvailable", p."isVisible"
         FROM "CustomerFavorite" f
         JOIN "Product" p ON f."productId" = p."id"
         WHERE f."customerId" = $1 AND p."isVisible" = true
         ORDER BY f."createdAt" DESC`,
        [customerId]
      );
      return res.rows.map((r) => ({
        id: r.id,
        customerId: r.customerId,
        productId: r.productId,
        createdAt: new Date(r.createdAt).toISOString(),
        product: {
          id: r.prod_id,
          nameAr: r.nameAr,
          badge: r.badge || undefined,
          isAvailable: Boolean(r.isAvailable),
          isVisible: Boolean(r.isVisible),
        },
      }));
    } catch (err: any) {
      console.warn("[customer-hub-store] getCustomerFavorites error:", err.message);
    }
  }

  const set = memoryFavorites.get(customerId) || new Set();
  return Array.from(set).map((pid) => ({
    id: `fav_${pid}`,
    customerId,
    productId: pid,
    createdAt: new Date().toISOString(),
  }));
}

export async function getCustomerFavoriteProductIdsAsync(customerId: string): Promise<string[]> {
  if (!customerId) return [];
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT "productId" FROM "CustomerFavorite" WHERE "customerId" = $1`,
        [customerId]
      );
      return res.rows.map((r) => r.productId);
    } catch {}
  }
  const set = memoryFavorites.get(customerId) || new Set();
  return Array.from(set);
}

export async function addCustomerFavoriteAsync(customerId: string, productId: string): Promise<boolean> {
  if (!customerId || !productId) return false;
  const pool = getPgPool();

  if (pool) {
    try {
      // التحقق من وجود المنتج أولاً
      const prodCheck = await pool.query(`SELECT "id" FROM "Product" WHERE "id" = $1 LIMIT 1`, [productId]);
      if (prodCheck.rows.length === 0) {
        return false; // المنتج غير موجود
      }

      const favId = `fav_${crypto.randomBytes(8).toString("hex")}`;
      await pool.query(
        `INSERT INTO "CustomerFavorite" ("id", "customerId", "productId")
         VALUES ($1, $2, $3)
         ON CONFLICT ("customerId", "productId") DO NOTHING`,
        [favId, customerId, productId]
      );
      return true;
    } catch (err: any) {
      console.warn("[customer-hub-store] addCustomerFavorite error:", err.message);
      return false;
    }
  }

  let set = memoryFavorites.get(customerId);
  if (!set) {
    set = new Set();
    memoryFavorites.set(customerId, set);
  }
  set.add(productId);
  return true;
}

export async function removeCustomerFavoriteAsync(customerId: string, productId: string): Promise<boolean> {
  if (!customerId || !productId) return false;
  const pool = getPgPool();

  if (pool) {
    try {
      await pool.query(
        `DELETE FROM "CustomerFavorite" WHERE "customerId" = $1 AND "productId" = $2`,
        [customerId, productId]
      );
      return true;
    } catch (err: any) {
      console.warn("[customer-hub-store] removeCustomerFavorite error:", err.message);
      return false;
    }
  }

  const set = memoryFavorites.get(customerId);
  if (set) {
    set.delete(productId);
    return true;
  }
  return false;
}

// ==============================================================================
// 3. إدارة الإشعارات الحقيقية (NOTIFICATIONS MANAGEMENT)
// ==============================================================================

export async function getCustomerNotificationsAsync(
  customerId: string,
  limit: number = 25
): Promise<CustomerNotificationRecord[]> {
  if (!customerId) return [];
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT "id", "customerId", "orderNumber", "title", "message", "type", "isRead", "createdAt"
         FROM "CustomerNotification"
         WHERE "customerId" = $1
         ORDER BY "createdAt" DESC
         LIMIT $2`,
        [customerId, limit]
      );
      return res.rows.map((r) => ({
        id: r.id,
        customerId: r.customerId,
        orderNumber: r.orderNumber || undefined,
        title: r.title,
        message: r.message,
        type: r.type,
        isRead: Boolean(r.isRead),
        createdAt: new Date(r.createdAt).toISOString(),
      }));
    } catch (err: any) {
      console.warn("[customer-hub-store] getCustomerNotifications error:", err.message);
    }
  }

  return (memoryNotifications.get(customerId) || []).slice(0, limit);
}

export async function getUnreadNotificationCountAsync(customerId: string): Promise<number> {
  if (!customerId) return 0;
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT count(*)::int as unread FROM "CustomerNotification" WHERE "customerId" = $1 AND "isRead" = false`,
        [customerId]
      );
      return res.rows[0]?.unread || 0;
    } catch {}
  }

  const list = memoryNotifications.get(customerId) || [];
  return list.filter((n) => !n.isRead).length;
}

export async function markNotificationAsReadAsync(customerId: string, notificationId: string): Promise<boolean> {
  const pool = getPgPool();
  if (pool) {
    const res = await pool.query(
      `UPDATE "CustomerNotification" SET "isRead" = true WHERE "customerId" = $1 AND "id" = $2`,
      [customerId, notificationId]
    );
    return (res.rowCount ?? 0) > 0;
  }
  const list = memoryNotifications.get(customerId) || [];
  const item = list.find((n) => n.id === notificationId);
  if (item) {
    item.isRead = true;
    return true;
  }
  return false;
}

export async function markAllNotificationsAsReadAsync(customerId: string): Promise<boolean> {
  const pool = getPgPool();
  if (pool) {
    await pool.query(
      `UPDATE "CustomerNotification" SET "isRead" = true WHERE "customerId" = $1 AND "isRead" = false`,
      [customerId]
    );
    return true;
  }
  const list = memoryNotifications.get(customerId) || [];
  list.forEach((n) => (n.isRead = true));
  return true;
}

/**
 * إنشاء إشعار طلب حقيقي بطريقة Idempotent تمنع التكرار نهائياً
 */
export async function createOrderNotificationAsync(params: {
  customerId: string;
  orderNumber: string;
  title: string;
  message: string;
  type?: string;
}): Promise<void> {
  if (!params.customerId) return;
  const pool = getPgPool();
  const notifId = `notif_${crypto.randomBytes(8).toString("hex")}`;
  const now = new Date().toISOString();
  const notifType = params.type || "ORDER_STATUS";

  if (pool) {
    try {
      // فحص عدم التكرار لنفس الطلب ونفس العنوان
      const check = await pool.query(
        `SELECT "id" FROM "CustomerNotification"
         WHERE "customerId" = $1 AND "orderNumber" = $2 AND "title" = $3 LIMIT 1`,
        [params.customerId, params.orderNumber, params.title]
      );
      if (check.rows.length > 0) return; // تم إرسال هذا الإشعار من قبل

      await pool.query(
        `INSERT INTO "CustomerNotification" ("id", "customerId", "orderNumber", "title", "message", "type", "isRead", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
        [notifId, params.customerId, params.orderNumber, params.title, params.message, notifType, now]
      );
      return;
    } catch (err: any) {
      console.warn("[customer-hub-store] createOrderNotification error:", err.message);
    }
  }

  const list = memoryNotifications.get(params.customerId) || [];
  const exists = list.some((n) => n.orderNumber === params.orderNumber && n.title === params.title);
  if (!exists) {
    list.unshift({
      id: notifId,
      customerId: params.customerId,
      orderNumber: params.orderNumber,
      title: params.title,
      message: params.message,
      type: notifType,
      isRead: false,
      createdAt: now,
    });
    memoryNotifications.set(params.customerId, list);
  }
}
