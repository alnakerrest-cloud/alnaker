// app/api/customer/auth/route.ts
// ==============================================================================
// إدارة جلسة العميل والتحقق برقم الهاتف للأجهزة المتعددة (Multi-device OTP Auth)
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { activeOtpProvider } from "@/lib/otp-provider";
import {
  signCustomerSession,
  CUSTOMER_COOKIE_NAME,
} from "@/lib/customer-session";
import { getOrCreateCustomerByPhoneAsync, normalizeEgyptianPhone } from "@/lib/customer-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawAction = String(body.action || "").toLowerCase().trim();
    const rawPhone = body.phone || body.phoneNumber || body.mobile || body.customerPhone;
    const rawCode = body.code || body.otp || body.verificationCode;

    if (rawAction === "logout") {
      const res = NextResponse.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
      res.cookies.set({
        name: CUSTOMER_COOKIE_NAME,
        value: "",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    if (!rawPhone || typeof rawPhone !== "string" || !rawPhone.trim()) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }

    const phoneCheck = normalizeEgyptianPhone(rawPhone);
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }
    const normalizedPhone = phoneCheck.normalized;

    const isVerify =
      rawAction === "verify_code" ||
      rawAction === "verify_otp" ||
      rawAction === "verify" ||
      Boolean(rawCode && typeof rawCode === "string" && rawCode.trim());

    if (isVerify) {
      if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
        return NextResponse.json({ error: "رمز التحقق مطلوب" }, { status: 400 });
      }

      const verifyRes = await activeOtpProvider.verifyOtp(normalizedPhone, rawCode.trim());
      if (!verifyRes.success) {
        return NextResponse.json({ error: verifyRes.error || "رمز غير صالح" }, { status: 400 });
      }

      const customer = await getOrCreateCustomerByPhoneAsync(normalizedPhone);
      const customerId = customer.id;
      const sessionToken = signCustomerSession(customerId, normalizedPhone, customer.name);

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

    // Default or explicitly requested OTP dispatch
    const otpRes = await activeOtpProvider.sendOtp(normalizedPhone);
    return NextResponse.json({
      success: otpRes.success,
      message: otpRes.message,
      debugCode: otpRes.debugCode,
    });
  } catch (err: any) {
    const errorId = `err_${crypto.randomUUID().slice(0, 8)}`;
    console.error(`[customer-auth][${errorId}] Error:`, err?.message || err);
    return NextResponse.json({ error: "حدث خطأ أثناء معالجة الطلب", errorId }, { status: 500 });
  }
}
