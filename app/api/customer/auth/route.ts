// app/api/customer/auth/route.ts
// ==============================================================================
// إدارة جلسة العميل والتحقق برقم الهاتف للأجهزة المتعددة (Multi-device OTP Auth)
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { activeOtpProvider } from "@/lib/otp-provider";
import {
  signCustomerSession,
  generateCustomerId,
  CUSTOMER_COOKIE_NAME,
} from "@/lib/customer-session";

function normalizeEgyptianPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  const digits = phone.replace(/\D/g, "");

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phone, code } = body;

    if (action === "logout") {
      const res = NextResponse.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
      res.cookies.set({
        name: CUSTOMER_COOKIE_NAME,
        value: "",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }

    const phoneCheck = normalizeEgyptianPhone(phone);
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }
    const normalizedPhone = phoneCheck.normalized;

    if (action === "request_code") {
      const otpRes = await activeOtpProvider.sendOtp(normalizedPhone);
      return NextResponse.json({
        success: otpRes.success,
        message: otpRes.message,
        debugCode: otpRes.debugCode,
      });
    }

    if (action === "verify_code") {
      if (!code || typeof code !== "string") {
        return NextResponse.json({ error: "رمز التحقق مطلوب" }, { status: 400 });
      }

      const verifyRes = await activeOtpProvider.verifyOtp(normalizedPhone, code);
      if (!verifyRes.success) {
        return NextResponse.json({ error: verifyRes.error || "رمز غير صالح" }, { status: 400 });
      }

      const customerId = generateCustomerId(normalizedPhone);
      const sessionToken = signCustomerSession(customerId, normalizedPhone);

      const response = NextResponse.json({
        success: true,
        customerId,
        customerSessionToken: sessionToken,
        message: "تم التحقق بنجاح",
      });

      response.cookies.set({
        name: CUSTOMER_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 60, // 60 days
      });

      return response;
    }

    return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
  } catch (err: any) {
    console.error("[customer-auth] Error:", err?.message || err);
    return NextResponse.json({ error: "حدث خطأ أثناء معالجة الطلب" }, { status: 500 });
  }
}
