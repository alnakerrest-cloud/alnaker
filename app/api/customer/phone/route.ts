// app/api/customer/phone/route.ts
// ==============================================================================
// إدارة وتغيير رقم هاتف العميل (Customer Phone Change Management API)
// محمي بالكامل: يتطلب جلسة عميل موقعة + تحقق OTP للرقم الجديد + منع الازدواجية
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
  signCustomerSession,
} from "@/lib/customer-session";
import {
  normalizeEgyptianPhone,
  checkPhoneAvailabilityAsync,
  updateCustomerPhoneAsync,
  getCustomerByIdAsync,
} from "@/lib/customer-store";
import { activeOtpProvider } from "@/lib/otp-provider";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const token = cookieToken || bearerToken;
    const session = verifyCustomerSession(token);

    if (!session) {
      return NextResponse.json({ error: "لا يمكن تنفيذ العملية: الجلسة غير مصرح بها." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, newPhone, code } = body;

    if (!newPhone || typeof newPhone !== "string") {
      return NextResponse.json({ error: "رقم الهاتف الجديد مطلوب." }, { status: 400 });
    }

    const phoneCheck = normalizeEgyptianPhone(newPhone);
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error || "رقم الهاتف غير صحيح." }, { status: 400 });
    }
    const newNormalized = phoneCheck.normalized;

    if (newNormalized === session.phoneNormalized) {
      return NextResponse.json({ error: "الرقم الجديد مطابق لرقمك الحالي المسجل." }, { status: 400 });
    }

    // فحص توفر الرقم (Duplicate Phone Protection)
    const availability = await checkPhoneAvailabilityAsync(newNormalized, session.customerId);
    if (!availability.available) {
      return NextResponse.json({ error: availability.error || "رقم الهاتف مستخدم بالفعل لحساب عميل آخر." }, { status: 409 });
    }

    // 1. طلب إرسال رمز التحقق للرقم الجديد
    if (action === "request_otp") {
      const otpRes = await activeOtpProvider.sendOtp(newNormalized);
      if (!otpRes.success) {
        return NextResponse.json({ error: "فشل إرسال رمز التحقق للرقم الجديد." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى الرقم الجديد بنجاح.",
        debugCode: otpRes.debugCode,
      });
    }

    // 2. تأكيد الرمز وتحديث الرقم
    if (action === "verify_and_update") {
      if (!code || typeof code !== "string") {
        return NextResponse.json({ error: "رمز التحقق مطلوب." }, { status: 400 });
      }

      const verifyRes = await activeOtpProvider.verifyOtp(newNormalized, code);
      if (!verifyRes.success) {
        return NextResponse.json({ error: verifyRes.error || "رمز التحقق غير صحيح." }, { status: 400 });
      }

      // تحديث رقم الهاتف في قاعدة البيانات دون المساس بالـ customerId
      const updateResult = await updateCustomerPhoneAsync(session.customerId, newNormalized);
      if (!updateResult.success || !updateResult.customer) {
        return NextResponse.json({ error: updateResult.error || "تعذّر تحديث رقم الهاتف." }, { status: 500 });
      }

      // تجديد الجلسة بالرقم الجديد ونفس الـ customerId الثابت
      const newSessionToken = signCustomerSession(
        session.customerId,
        newNormalized,
        updateResult.customer.name || session.customerName
      );

      const response = NextResponse.json({
        success: true,
        message: "تم تغيير رقم الهاتف بنجاح.",
        customer: {
          id: session.customerId,
          phone: newNormalized,
          name: updateResult.customer.name || session.customerName,
        },
      });

      response.cookies.set({
        name: CUSTOMER_COOKIE_NAME,
        value: newSessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 60, // 60 days
      });

      return response;
    }

    return NextResponse.json({ error: "إجراء غير مدعوم." }, { status: 400 });
  } catch (err: any) {
    console.error("[customer-phone-api] Error:", err?.message || err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء معالجة الطلب." }, { status: 500 });
  }
}
