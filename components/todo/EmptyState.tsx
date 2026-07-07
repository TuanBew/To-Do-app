// components/todo/EmptyState.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function EmptyState({ variant }: { variant: "no-tasks" | "filtered" }) {
  const { openAdd, clearFilters } = useTodos();

  if (variant === "no-tasks") {
    return (
      <div style={{ textAlign: "center", padding: "64px 20px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2.5px dashed #d8d3c8", margin: "0 auto 18px" }} />
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>You&apos;re all caught up</div>
        <div style={{ fontSize: 13.5, color: "#9a9488", marginBottom: 20 }}>Add your first task to get started.</div>
        <div
          onClick={openAdd}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 9, background: ACCENT, color: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
        >
          + New Task
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "64px 20px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No matching tasks</div>
      <div style={{ fontSize: 13.5, color: "#9a9488", marginBottom: 20 }}>Try a different search or filter.</div>
      <div
        onClick={clearFilters}
        style={{ display: "inline-flex", padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e4e0d8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        Clear filters
      </div>
    </div>
  );
}
