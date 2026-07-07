// components/todo/Fab.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function Fab() {
  const { openAdd } = useTodos();
  return (
    <div
      onClick={openAdd}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: ACCENT,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
        cursor: "pointer",
        zIndex: 15,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22">
        <rect x="10" y="3" width="2" height="16" fill="#ffffff" />
        <rect x="3" y="10" width="16" height="2" fill="#ffffff" />
      </svg>
    </div>
  );
}
