"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthActionState } from "@/lib/actions/auth";
import { ACCENT } from "@/lib/theme";

const initialState: AuthActionState = { error: "" };

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1.5px solid #e4e0d8",
  fontSize: 14.5,
};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <div style={{ animation: "slideUp 0.35s ease-out" }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>Create your account</div>
      <div style={{ fontSize: 14, color: "#77716a", marginBottom: 28 }}>Start organizing your work in minutes.</div>
      <form action={formAction}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Name</label>
          <input name="name" type="text" placeholder="Ada Lovelace" style={fieldStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Email</label>
          <input name="email" type="email" placeholder="you@company.com" style={fieldStyle} />
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Password</label>
            <input name="password" type="password" placeholder="6+ characters" style={fieldStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Confirm</label>
            <input name="confirm" type="password" placeholder="Repeat it" style={fieldStyle} />
          </div>
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
          Create account
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: 22, fontSize: 13.5, color: "#77716a" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: ACCENT, fontWeight: 600, cursor: "pointer" }}>
          Log in
        </Link>
      </div>
    </div>
  );
}
