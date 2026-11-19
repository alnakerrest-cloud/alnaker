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

  // Auto-reload on deployment skew (UnrecognizedActionError / 409 Conflict)
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = event?.reason?.message || String(event?.reason || "");
      if (
        msg.includes("Server Action") ||
        msg.includes("was not found") ||
        msg.includes("409") ||
        msg.includes("Failed to fetch")
      ) {
        console.warn("[login] Deployment skew detected, refreshing to fetch latest build manifest...");
        window.location.reload();
      }
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  useEffect(() => {
    if (state.success) {
      if (state.mustChangePassword) {
        window.location.href = "/admin/change-password";
      } else if (state.role === "ORDERS_STAFF") {
        window.location.href = "/admin/orders";
      } else {
        window.location.href = "/admin/dashboard";
      }
    }
  }, [state.success, state.mustChangePassword, state.role]);

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
