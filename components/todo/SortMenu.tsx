// components/todo/SortMenu.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useTodos } from "@/lib/todo-context";
import { ACCENT, SORT_OPTIONS } from "@/lib/theme";

export function SortMenu() {
  const { sortBy, setSortBy } = useTodos();
  const current = SORT_OPTIONS.find((o) => o.key === sortBy);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 12px",
            borderRadius: 8,
            border: "1.5px solid #e4e0d8",
            fontSize: 13,
            fontWeight: 500,
            background: "#ffffff",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="12" height="10" viewBox="0 0 12 10">
            <path d="M1 2H8M1 5H6M1 8H4" stroke="#8a8478" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span style={{ color: "#4a453e" }}>
            Sort: <span style={{ fontWeight: 600, color: "#22201c" }}>{current?.label ?? "Due date"}</span>
          </span>
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path d="M1 3L4.5 6.5L8 3" stroke="#8a8478" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          style={{
            zIndex: 30,
            background: "#ffffff",
            border: "1px solid #e7e3da",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(20,18,14,0.12)",
            padding: 6,
            minWidth: 168,
            animation: "scaleIn 0.14s ease-out",
          }}
        >
          {SORT_OPTIONS.map((so) => {
            const active = sortBy === so.key;
            return (
              <DropdownMenuItem
                key={so.key}
                onSelect={() => setSortBy(so.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? ACCENT : "#4a453e",
                  background: active ? ACCENT + "10" : "transparent",
                  outline: "none",
                }}
              >
                {so.label}
                {active && (
                  <svg width="10" height="8" viewBox="0 0 10 8">
                    <path d="M1 4L3.5 6.5L9 1" stroke={ACCENT} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
