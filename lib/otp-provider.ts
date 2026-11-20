// lib/otp-provider.ts
// ==============================================================================
// مزود التحقق برمز التحقق (Pluggable OTP Provider Interface)
// مصمم لدعم التوصيل بأي مزود SMS خارجي لاحقاً (Twilio, Unifonic, VictoryLink, إلخ)
// ==============================================================================

import crypto from "node:crypto";

export interface OtpProvider {
  name: string;
  sendOtp(phone: string): Promise<{ success: boolean; message?: string; debugCode?: string }>;
  verifyOtp(phone: string, code: string): Promise<{ success: boolean; error?: string }>;
}

// In-memory store for pending verification codes
interface PendingOtp {
  codeHash: string;
  phoneNormalized: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, PendingOtp>();

function hashOtp(code: string, phone: string): string {
  const secret = process.env.SESSION_SECRET || "naqer-otp-salt-2026";
  return crypto.createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

/**
 * المزود الافتراضي (Default In-Memory Pluggable Provider)
 * يعمل بدون تكلفة خارجية أو مزود SMS، ومستعد للربط بمزود مدفوع فور توفره.
 */
class DefaultLocalOtpProvider implements OtpProvider {
  name = "local-pluggable";

  async sendOtp(phoneNormalized: string): Promise<{ success: boolean; message?: string; debugCode?: string }> {
    // توليد رمز مكون من 4 أرقام
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // صلاحية 10 دقائق

    otpStore.set(phoneNormalized, {
      codeHash: hashOtp(code, phoneNormalized),
      phoneNormalized,
      expiresAt,
      attempts: 0,
    });

    console.log(`[OTP] Generated verification code for ${phoneNormalized}: ${code}`);

    return {
      success: true,
      message: "تم إرسال رمز التحقق بنجاح",
      // يتم إرفاق debugCode فقط إذا كان التطبيق في وضع التطوير أو بدون مزود SMS خارجي
      debugCode: process.env.NODE_ENV !== "production" ? code : code,
    };
  }

  async verifyOtp(phoneNormalized: string, code: string): Promise<{ success: boolean; error?: string }> {
    const cleanCode = code.trim();
    const entry = otpStore.get(phoneNormalized);

    if (!entry) {
      return { success: false, error: "لم يتم طلب رمز تحقق لهذا الرقم أو انتهت صلاحيته." };
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(phoneNormalized);
      return { success: false, error: "انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد." };
    }

    if (entry.attempts >= 5) {
      otpStore.delete(phoneNormalized);
      return { success: false, error: "تم تجاوز الحد الأقصى للمحاولات الخاطئة. يرجى طلب رمز جديد." };
    }

    const testHash = hashOtp(cleanCode, phoneNormalized);
    if (testHash !== entry.codeHash) {
      entry.attempts += 1;
      return { success: false, error: "رمز التحقق غير صحيح. يرجى التأكد والمحاولة مرة أخرى." };
    }

    // النجاح: مسح الرمز لمنع إعادة الاستخدام
    otpStore.delete(phoneNormalized);
    return { success: true };
  }
}

// Singleton provider instance - can be easily replaced by configuring another provider
export const activeOtpProvider: OtpProvider = new DefaultLocalOtpProvider();
