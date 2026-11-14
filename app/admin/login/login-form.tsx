"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction, type LoginState } from "../actions";

const initialState: LoginState = {};

function SubmitButton() {
  return (
    <button type="submit" className="admin-btn admin-btn-primary" style={{ width: "100%" }}>
      دخول
    </button>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, initialState);

  useEffect(() => {
    if (state.success) {
      if (state.mustChangePassword) {
        router.replace("/admin/change-password");
      } else {
        router.replace("/admin/dashboard");
      }
    }
  }, [state.success, state.mustChangePassword, router]);

  return (
    <form action={formAction} className="admin-login-form">
      <label>
        البريد الإلكتروني
        <input type="email" name="email" autoComplete="username" required dir="ltr" />
      </label>
      <label>
        كلمة المرور
        <input type="password" name="password" autoComplete="current-password" required dir="ltr" />
      </label>
      {state.error ? <p className="admin-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
