"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthActionState } from "@/lib/actions/auth";
import { ACCENT } from "@/lib/theme";

const initialState: AuthActionState = { error: "" };

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1.5px solid #e4e0d8",
  fontSize: 14.5,
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <div style={{ animation: "slideUp 0.35s ease-out" }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>Welcome back</div>
      <div style={{ fontSize: 14, color: "#77716a", marginBottom: 32 }}>Log in to continue to your workspace.</div>
      <form action={formAction}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Email</label>
          <input name="email" type="email" placeholder="you@company.com" style={fieldStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Password</label>
          <input name="password" type="password" placeholder="••••••••" style={fieldStyle} />
        </div>
        {state.error && <div style={{ fontSize: 13, color: "#c0392b", margin: "10px 0 4px" }}>{state.error}</div>}
        <button
          type="submit"
          disabled={pending}
          style={{
            width: "100%",
            marginTop: 18,
            padding: 12,
            borderRadius: 8,
            border: "none",
            background: ACCENT,
            color: "#ffffff",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          Log in
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: 22, fontSize: 13.5, color: "#77716a" }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" style={{ color: ACCENT, fontWeight: 600, cursor: "pointer" }}>
          Sign up
        </Link>
      </div>
    </div>
  );
}
