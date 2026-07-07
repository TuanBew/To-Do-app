// components/todo/Pagination.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function Pagination() {
  const { totalPages, page, goToPage, prevPage, nextPage } = useTodos();
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 26 }}>
      <div
        onClick={prevPage}
        style={{ width: 32, height: 32, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: page <= 1 ? 0.35 : 1, border: "1.5px solid #e4e0d8" }}
      >
        <svg width="7" height="11" viewBox="0 0 7 11">
          <path d="M6 1L1.5 5.5L6 10" stroke="#4a453e" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          onClick={() => goToPage(n)}
          style={{
            minWidth: 32,
            height: 32,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            background: n === page ? ACCENT : "transparent",
            color: n === page ? "#ffffff" : "#4a453e",
            padding: "0 4px",
          }}
        >
          {n}
        </div>
      ))}
      <div
        onClick={nextPage}
        style={{ width: 32, height: 32, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: page >= totalPages ? 0.35 : 1, border: "1.5px solid #e4e0d8" }}
      >
        <svg width="7" height="11" viewBox="0 0 7 11">
          <path d="M1 1L5.5 5.5L1 10" stroke="#4a453e" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
