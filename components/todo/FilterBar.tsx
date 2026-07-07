// components/todo/FilterBar.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { SortMenu } from "./SortMenu";
import type { PriorityFilter } from "@/lib/types";

const PRIORITY_OPTIONS: { key: PriorityFilter; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#22201c" },
  { key: "low", label: "Low", color: "#3b82c4" },
  { key: "medium", label: "Medium", color: "#c07d1f" },
  { key: "high", label: "High", color: "#dc4b34" },
];

export function FilterBar() {
  const { search, setSearch, priorityFilter, setPriorityFilter } = useTodos();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
      <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        >
          <circle cx="6" cy="6" r="5" stroke="#9a9488" strokeWidth="1.3" fill="none" />
          <path d="M9.5 9.5L13 13" stroke="#9a9488" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1.5px solid #e4e0d8", fontSize: 13.5 }}
        />
      </div>
      <div style={{ display: "flex", background: "#f0ede6", borderRadius: 8, padding: 3, gap: 2 }}>
        {PRIORITY_OPTIONS.map((po) => {
          const active = priorityFilter === po.key;
          return (
            <div
              key={po.key}
              onClick={() => setPriorityFilter(po.key)}
              style={{
                padding: "7px 12px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                background: active ? "#ffffff" : "transparent",
                color: active ? po.color : "#8a8478",
                boxShadow: active ? "0 1px 3px rgba(20,18,14,0.10)" : "none",
                transition: "all .12s ease",
                whiteSpace: "nowrap",
              }}
            >
              {po.label}
            </div>
          );
        })}
      </div>
      <SortMenu />
    </div>
  );
}
