// lib/customer-session.ts
// ==============================================================================
// إدارة هوية وجلسات العملاء الخفيفة والآمنة (Lightweight Secure Customer Session)
// مصممة للعمل بدون حساب تقليدي (No Email / No Password)
// ==============================================================================

import { createHmac, randomBytes } from "node:crypto";

export const CUSTOMER_COOKIE_NAME = "naqer_customer";
const CUSTOMER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 60; // 60 يوماً

export interface CustomerSessionPayload {
  customerId: string;
  phoneNormalized: string;
  customerName?: string;
  expiresAt: number;
}

function getSecret(): string {
  return process.env.SESSION_SECRET || "naqer-customer-session-secret-2026";
}

/**
 * توقيع جلسة العميل رقمياً باستخدام HMAC-SHA256
 */
export function signCustomerSession(customerId: string, phoneNormalized: string, customerName?: string): string {
  const expiresAt = Date.now() + CUSTOMER_SESSION_TTL_MS;
  const safeName = customerName ? Buffer.from(customerName.slice(0, 50)).toString("base64url") : "";
  const payload = `${customerId}:${phoneNormalized}:${expiresAt}:${safeName}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

/**
 * التحقق من صحة توقيع جلسة العميل وتاريخ الصلاحية
 */
export function verifyCustomerSession(token: string | undefined | null): CustomerSessionPayload | null {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, receivedSig] = parts;
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const [customerId, phoneNormalized, expiresAtStr, safeName] = payload.split(":");

    if (!customerId || !phoneNormalized || !expiresAtStr) return null;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;

    const expectedSig = createHmac("sha256", getSecret()).update(payload).digest("hex");
    if (receivedSig !== expectedSig) return null;

    let customerName: string | undefined;
    if (safeName) {
      try {
        customerName = Buffer.from(safeName, "base64url").toString("utf8");
      } catch {}
    }

    return {
      customerId,
      phoneNormalized,
      customerName,
      expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * توليد معرّف عميل ثابت أو مشتق
 */
export function generateCustomerId(phoneNormalized: string): string {
  const hash = createHmac("sha256", getSecret()).update(`cust_${phoneNormalized}`).digest("hex").slice(0, 16);
  return `cust_${hash}`;
}
