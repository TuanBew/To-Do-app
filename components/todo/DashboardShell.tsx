// components/todo/DashboardShell.tsx
"use client";

import { useIsMobile } from "@/lib/use-is-mobile";
import { useTodos } from "@/lib/todo-context";
import { Sidebar, MobileDrawer } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { StatsBar } from "./StatsBar";
import { FilterBar } from "./FilterBar";
import { TaskList } from "./TaskList";
import { Pagination } from "./Pagination";
import { Fab } from "./Fab";
import { TaskModal } from "./TaskModal";
import { DeleteDialog } from "./DeleteDialog";
import { Toast } from "./Toast";
import { ACCENT, VIEW_TITLES } from "@/lib/theme";

export function DashboardShell() {
  const isMobile = useIsMobile();
  const { view, mobileNavOpen, sortBy, openAdd } = useTodos();
  const viewTitle = VIEW_TITLES[view] || "All Tasks";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {!isMobile && <Sidebar />}
      {isMobile && mobileNavOpen && <MobileDrawer />}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {isMobile && <MobileTopBar />}

        <div
          style={{
            flex: 1,
            padding: isMobile ? "20px 16px 110px" : "36px 40px 48px",
            maxWidth: 920,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {!isMobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{viewTitle}</div>
              <div
                onClick={openAdd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 18px",
                  borderRadius: 9,
                  background: ACCENT,
                  color: "#ffffff",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <rect x="5" width="2" height="12" fill="#ffffff" />
                  <rect y="5" width="12" height="2" fill="#ffffff" />
                </svg>
                New Task
              </div>
            </div>
          )}

          <StatsBar />
          <FilterBar />
          {sortBy === "manual" && (
            <div style={{ fontSize: 12, color: "#9a9488", marginBottom: 14 }}>Drag the handles to reorder tasks.</div>
          )}

          <div style={{ marginTop: 14 }}>
            <TaskList />
          </div>

          <Pagination />
        </div>

        {isMobile && <Fab />}
      </div>

      <TaskModal />
      <DeleteDialog />
      <Toast />
    </div>
  );
}
