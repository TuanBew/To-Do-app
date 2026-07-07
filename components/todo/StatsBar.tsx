// components/todo/StatsBar.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function StatsBar() {
  const { counts } = useTodos();
  const percent = counts.total ? Math.round((counts.completed / counts.total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0 22px" }}>
      <div style={{ fontSize: 12.5, color: "#77716a", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
        {counts.completed}/{counts.total} done
      </div>
      <div style={{ flex: 1, height: 5, background: "#ece8e0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, background: ACCENT, borderRadius: 3, transition: "width .3s ease" }} />
      </div>
    </div>
  );
}
