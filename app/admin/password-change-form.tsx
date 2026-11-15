"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction, type ChangePasswordState } from "./actions";

type Props = {
  mode: "forced" | "voluntary";
  onSuccess?: () => void;
};

const initialState: ChangePasswordState = {};

export default function PasswordChangeForm({ mode, onSuccess }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      if (mode === "forced") {
        window.location.href = "/admin/dashboard";
      } else {
        formRef.current?.reset();
        onSuccess?.();
      }
    }
  }, [state.success, mode, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="admin-login-form" style={{ maxWidth: mode === "voluntary" ? "520px" : undefined }}>
      {mode === "forced" ? (
        <div className="admin-flash err" style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.5" }}>
          <strong>تنبيه أمان:</strong> أنت تستخدم كلمة المرور المؤقتة. يجب تعيين كلمة مرور جديدة قوية وخاصة بك لمتابعة استخدام لوحة التحكم.
        </div>
      ) : null}

      {state.success && mode === "voluntary" ? (
        <div className="admin-flash ok" style={{ marginBottom: "12px", fontSize: "14px" }}>
          {state.message || "تم تغيير كلمة المرور بنجاح وتم إبطال أي جلسات مفتوحة أخرى."}
        </div>
      ) : null}

      {state.error ? (
        <p className="admin-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <label>
        كلمة المرور الحالية
        <input
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          dir="ltr"
          placeholder="••••••••"
        />
      </label>

      <label>
        كلمة المرور الجديدة
        <input
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          dir="ltr"
          minLength={8}
          placeholder="8 أحرف على الأقل، تشمل أرقاماً وحروفاً"
        />
      </label>

      <label>
        تأكيد كلمة المرور الجديدة
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          dir="ltr"
          minLength={8}
          placeholder="أعد إدخال كلمة المرور الجديدة"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="admin-btn admin-btn-primary"
        style={{ marginTop: "8px", width: "100%" }}
      >
        {isPending ? "جاري التحديث..." : mode === "forced" ? "حفظ ومتابعة الدخول" : "تغيير كلمة المرور"}
      </button>
    </form>
  );
}
