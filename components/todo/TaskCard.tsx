// components/todo/TaskCard.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { dueLabel, priorityMeta, tagStyle, todayISO } from "@/lib/utils";
import { ACCENT } from "@/lib/theme";
import type { Todo } from "@/lib/types";

export function TaskCard({ task, index }: { task: Todo; index: number }) {
  const {
    sortBy,
    dragId,
    expandedIds,
    toggleExpand,
    toggleComplete,
    openEdit,
    askDelete,
    toggleSubtask,
    onDragStart,
    onDragOverTask,
    onDropTask,
    onDragEnd,
  } = useTodos();

  const dragEnabled = sortBy === "manual";
  const expanded = !!expandedIds[task.id];
  const pm = priorityMeta(task.priority);
  const due = dueLabel(task.dueDate);
  const today = todayISO();
  const overdue = !!(task.dueDate && task.dueDate < today && !task.done);
  const isToday = task.dueDate === today;
  let dueBg = "#f0ede6";
  let dueColor = "#77716a";
  if (overdue) {
    dueBg = "#fbe9e6";
    dueColor = "#c0392b";
  } else if (isToday) {
    dueBg = "#fdf1de";
    dueColor = "#a15b25";
  }

  return (
    <div
      draggable={dragEnabled}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverTask(task.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropTask();
      }}
      onDragEnd={onDragEnd}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        border: "1px solid #e7e3da",
        borderRadius: 10,
        marginBottom: 10,
        padding: "14px 16px",
        opacity: dragId === task.id ? 0.45 : 1,
        animation: `slideUp 0.3s ease-out ${(index % 8) * 0.03}s both`,
        transition: "border-color .15s ease, box-shadow .15s ease, opacity .15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div title="Drag to reorder" style={{ cursor: dragEnabled ? "grab" : "default", paddingTop: 3, opacity: dragEnabled ? 1 : 0.3, flexShrink: 0 }}>
          <svg width="10" height="16" viewBox="0 0 10 16">
            <circle cx="2" cy="2" r="1.6" fill="#c7c2b8" />
            <circle cx="8" cy="2" r="1.6" fill="#c7c2b8" />
            <circle cx="2" cy="8" r="1.6" fill="#c7c2b8" />
            <circle cx="8" cy="8" r="1.6" fill="#c7c2b8" />
            <circle cx="2" cy="14" r="1.6" fill="#c7c2b8" />
            <circle cx="8" cy="14" r="1.6" fill="#c7c2b8" />
          </svg>
        </div>
        <div
          onClick={() => toggleComplete(task.id)}
          style={{
            width: 21,
            height: 21,
            borderRadius: "50%",
            flexShrink: 0,
            marginTop: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${task.done ? ACCENT : "#d6d2c7"}`,
            background: task.done ? ACCENT : "#ffffff",
            transition: "all .15s ease",
          }}
        >
          {task.done && (
            <svg width="11" height="9" viewBox="0 0 11 9" style={{ animation: "popCheck 0.25s ease-out" }}>
              <path d="M1 4.5L4 7.5L10 1" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                textDecoration: task.done ? "line-through" : "none",
                color: task.done ? "#a39d90" : "#22201c",
                transition: "color .2s ease",
              }}
            >
              {task.title}
            </div>
            {task.subtasks.length > 0 && (
              <div
                onClick={() => toggleExpand(task.id)}
                style={{
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "#8a8478",
                  background: "#f3f1ec",
                  padding: "2px 7px",
                  borderRadius: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s ease" }}
                >
                  <path d="M1 2.5L4 5.5L7 2.5" stroke="#8a8478" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
          {task.description.trim() && (
            <div style={{ fontSize: 13, color: "#8a8478", marginTop: 3, lineHeight: 1.4 }}>{task.description}</div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {due && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, padding: "3px 8px", borderRadius: 5, background: dueBg, color: dueColor }}>
                {due}
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5, background: pm.bg, color: pm.color }}>
              {pm.label}
            </div>
            {task.tags.map((tag) => {
              const s = tagStyle(tag);
              return (
                <div key={tag} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 5, background: s.bg, color: s.fg }}>
                  {tag}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div
            onClick={() => openEdit(task)}
            style={{ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.55 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" stroke="#77716a" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
            </svg>
          </div>
          <div
            onClick={() => askDelete(task.id)}
            style={{ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.55 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path
                d="M2.5 3.5H11.5M5 3.5V2C5 1.5 5.5 1 6 1H8C8.5 1 9 1.5 9 2V3.5M5.5 6V10.5M8.5 6V10.5M3.5 3.5L4 12C4 12.5 4.5 13 5 13H9C9.5 13 10 12.5 10 12L10.5 3.5"
                stroke="#c0392b"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
      {expanded && (
        <div
          style={{
            marginLeft: 45,
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px dashed #e7e3da",
            display: "flex",
            flexDirection: "column",
            gap: 7,
            animation: "fadeIn 0.2s ease",
          }}
        >
          {task.subtasks.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div
                onClick={() => toggleSubtask(task.id, s.id)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  border: `1.6px solid ${s.done ? ACCENT : "#d6d2c7"}`,
                  background: s.done ? ACCENT : "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {s.done && (
                  <svg width="8" height="7" viewBox="0 0 8 7">
                    <path d="M1 3.5L3 5.5L7 1" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div style={{ fontSize: 13, color: s.done ? "#a39d90" : "#4a453e", textDecoration: s.done ? "line-through" : "none" }}>
                {s.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
