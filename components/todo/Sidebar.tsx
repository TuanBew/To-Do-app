// components/todo/Sidebar.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { useAuth } from "@/lib/auth-context";
import { tagStyle } from "@/lib/utils";
import { ACCENT } from "@/lib/theme";
import type { ViewKey } from "@/lib/types";

const NAV_ITEMS: { key: ViewKey; label: string }[] = [
  { key: "all", label: "All Tasks" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView, counts } = useTodos();
  const countFor = (key: ViewKey) =>
    key === "all" ? counts.total : key === "today" ? counts.today : key === "upcoming" ? counts.upcoming : counts.completed;

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = view === item.key;
        return (
          <div
            key={item.key}
            onClick={() => {
              setView(item.key);
              onNavigate?.();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: 7,
              cursor: "pointer",
              marginBottom: 2,
              background: active ? ACCENT + "17" : "transparent",
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? ACCENT : "#4a453e" }}>
              {item.label}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9a9488" }}>{countFor(item.key)}</span>
          </div>
        );
      })}
    </>
  );
}

function TagList() {
  const { allTags, tagFilter, setTagFilter, dragOverTagName, tagDropPulse, onDragOverTag, onDragLeaveTag, onDropTag } =
    useTodos();

  if (allTags.length === 0) {
    return <div style={{ fontSize: 12, color: "#9a9488", padding: "4px 10px" }}>No tags yet</div>;
  }

  return (
    <>
      {allTags.map((tg) => {
        const style = tagStyle(tg.name);
        const active = tagFilter === tg.name;
        const isDragTarget = dragOverTagName === tg.name;
        const isPulse = tagDropPulse === tg.name;
        let bg = active ? style.bg : "transparent";
        if (isDragTarget) bg = ACCENT + "22";
        if (isPulse) bg = ACCENT + "38";
        return (
          <div
            key={tg.name}
            onClick={() => setTagFilter(tg.name)}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOverTag(tg.name);
            }}
            onDragLeave={() => onDragLeaveTag(tg.name)}
            onDrop={(e) => {
              e.preventDefault();
              onDropTag(tg.name);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 7,
              cursor: "pointer",
              background: bg,
              boxShadow: isDragTarget ? `0 0 0 2px ${ACCENT}` : "none",
              transform: isDragTarget ? "scale(1.035)" : "scale(1)",
              animation: isPulse ? "tagPulse 0.45s ease-out" : "none",
              transition: "background .12s ease, transform .12s ease, box-shadow .12s ease",
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: style.fg, flexShrink: 0 }} />
            <span
              style={{
                fontSize: 13,
                color: "#4a453e",
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {tg.name}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#9a9488" }}>{tg.count}</span>
          </div>
        );
      })}
    </>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px 20px" }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${ACCENT}`, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: ACCENT, top: 5, left: 5 }} />
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Loop</span>
    </div>
  );
}

function NewTaskButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "9px 0",
        borderRadius: 8,
        background: ACCENT,
        color: "#ffffff",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
        marginBottom: 18,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12">
        <rect x="5" y="0" width="2" height="12" fill="#ffffff" />
        <rect x="0" y="5" width="12" height="2" fill="#ffffff" />
      </svg>
      New Task
    </div>
  );
}

function UserFooter() {
  const { user, logout } = useAuth();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 8px 4px", borderTop: "1px solid #e7e3da", marginTop: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: ACCENT,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.name}
        </div>
        <div style={{ fontSize: 11.5, color: "#9a9488", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.email}
        </div>
      </div>
      <div
        onClick={() => void logout()}
        title="Log out"
        style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13">
          <path
            d="M5 1H2C1.5 1 1 1.5 1 2V11C1 11.5 1.5 12 2 12H5M8.5 9L12 5.5M12 5.5L8.5 2M12 5.5H4.5"
            stroke="#77716a"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { openAdd } = useTodos();
  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: "#f3f1ec",
        borderRight: "1px solid #e7e3da",
        display: "flex",
        flexDirection: "column",
        padding: "18px 12px 14px",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      <Logo />
      <NewTaskButton onClick={openAdd} />
      <NavList />
      <div style={{ height: 1, background: "#e7e3da", margin: "14px 4px" }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "#9a9488",
          padding: "0 10px 8px",
          textTransform: "uppercase",
        }}
      >
        Tags
      </div>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <TagList />
      </div>
      <UserFooter />
    </div>
  );
}

export function MobileDrawer() {
  const { openAdd, closeMobileNav } = useTodos();
  return (
    <>
      <div
        onClick={closeMobileNav}
        style={{ position: "fixed", inset: 0, background: "rgba(20,18,14,0.35)", zIndex: 40, animation: "fadeIn 0.2s ease" }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          background: "#f3f1ec",
          zIndex: 41,
          padding: "18px 12px 14px",
          display: "flex",
          flexDirection: "column",
          animation: "drawerIn 0.22s ease-out",
          boxShadow: "8px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        <Logo />
        <NewTaskButton onClick={openAdd} />
        <NavList onNavigate={closeMobileNav} />
        <div style={{ height: 1, background: "#e7e3da", margin: "14px 4px" }} />
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "#9a9488",
            padding: "0 10px 8px",
            textTransform: "uppercase",
          }}
        >
          Tags
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <TagList />
        </div>
        <UserFooter />
      </div>
    </>
  );
}
