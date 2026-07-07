// components/todo/MobileTopBar.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { VIEW_TITLES } from "@/lib/theme";

export function MobileTopBar() {
  const { view, openMobileNav } = useTodos();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderBottom: "1px solid #ece8e0",
        position: "sticky",
        top: 0,
        background: "#faf9f6",
        zIndex: 20,
      }}
    >
      <div
        onClick={openMobileNav}
        style={{
          cursor: "pointer",
          width: 36,
          height: 36,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #e4e0d8",
          flexShrink: 0,
        }}
      >
        <svg width="16" height="12" viewBox="0 0 16 12">
          <rect width="16" height="2" fill="#4a453e" />
          <rect y="5" width="16" height="2" fill="#4a453e" />
          <rect y="10" width="16" height="2" fill="#4a453e" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{VIEW_TITLES[view] || "All Tasks"}</div>
    </div>
  );
}
