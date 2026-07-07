// components/todo/Toast.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function Toast() {
  const { toast } = useTodos();
  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 70,
        background: "#22201c",
        color: "#ffffff",
        padding: "13px 18px",
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "toastIn 0.25s ease-out",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: toast.type === "danger" ? "#e57373" : ACCENT, flexShrink: 0 }} />
      {toast.message}
    </div>
  );
}
