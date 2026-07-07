// components/todo/TaskModal.tsx
"use client";

import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";
import { useTodos } from "@/lib/todo-context";
import { ACCENT, PRESET_TAGS } from "@/lib/theme";
import { tagStyle } from "@/lib/utils";

const PRIORITY_DRAFT_OPTIONS = [
  { key: "low" as const, label: "Low", color: "#3b82c4" },
  { key: "medium" as const, label: "Medium", color: "#c07d1f" },
  { key: "high" as const, label: "High", color: "#dc4b34" },
];

export function TaskModal() {
  const {
    modalOpen,
    modalMode,
    draft,
    closeModal,
    deleteFromModal,
    setDraftField,
    toggleDraftTag,
    addCustomTag,
    newTagText,
    setNewTagText,
    addSubtask,
    newSubtaskText,
    setNewSubtaskText,
    removeSubtask,
    toggleDraftSubtask,
    saveDraft,
    todos,
  } = useTodos();

  if (!draft) return null;

  const usedTags = Array.from(new Set(todos.flatMap((t) => t.tags)));
  const tagOptions = Array.from(new Set([...PRESET_TAGS, ...usedTags])).sort();

  return (
    <Dialog
      open={modalOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogPortal>
        <DialogOverlay style={{ position: "fixed", inset: 0, background: "rgba(20,18,14,0.4)", zIndex: 50, animation: "fadeIn 0.15s ease" }} />
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 51,
            width: "100%",
            maxWidth: 560,
            maxHeight: "88vh",
            overflowY: "auto",
            background: "#ffffff",
            borderRadius: 14,
            padding: "28px 30px 26px",
            animation: "scaleIn 0.2s ease-out",
            boxShadow: "0 20px 60px rgba(20,18,14,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{modalMode === "add" ? "New task" : "Edit task"}</div>
            <div
              onClick={closeModal}
              style={{ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M1 1L13 13M13 1L1 13" stroke="#77716a" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <form onSubmit={saveDraft}>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraftField("title", e.target.value)}
              placeholder="Task title"
              style={{ width: "100%", fontSize: 18, fontWeight: 600, border: "none", padding: "8px 0", marginBottom: 4 }}
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraftField("description", e.target.value)}
              placeholder="Add a description..."
              rows={2}
              style={{
                width: "100%",
                border: "none",
                resize: "none",
                fontSize: 14,
                color: "#5c574e",
                padding: "2px 0 14px",
                borderBottom: "1px solid #ece8e0",
                marginBottom: 18,
              }}
            />

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 18 }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#77716a", marginBottom: 8 }}>DUE DATE</div>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraftField("dueDate", e.target.value)}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: "1.5px solid #e4e0d8", fontSize: 13.5 }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#77716a", marginBottom: 8 }}>PRIORITY</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {PRIORITY_DRAFT_OPTIONS.map((o) => {
                    const active = draft.priority === o.key;
                    return (
                      <div
                        key={o.key}
                        onClick={() => setDraftField("priority", o.key)}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          padding: "8px 0",
                          borderRadius: 7,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: active ? o.color + "1a" : "#f7f5f0",
                          color: active ? o.color : "#9a9488",
                          border: `1.5px solid ${active ? o.color : "#e4e0d8"}`,
                          transition: "all .12s ease",
                        }}
                      >
                        {o.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#77716a", marginBottom: 8 }}>TAGS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {tagOptions.map((name) => {
                  const selected = draft.tags.includes(name);
                  const style = tagStyle(name);
                  return (
                    <div
                      key={name}
                      onClick={() => toggleDraftTag(name)}
                      style={{
                        fontSize: 12.5,
                        padding: "5px 11px",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: selected ? style.bg : "#f0ede6",
                        color: selected ? style.fg : "#77716a",
                        border: `1.5px solid ${selected ? style.fg : "transparent"}`,
                        transition: "all .12s ease",
                      }}
                    >
                      {name}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  placeholder="Add custom tag"
                  style={{ flex: 1, padding: "8px 11px", borderRadius: 7, border: "1.5px solid #e4e0d8", fontSize: 13 }}
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  style={{ padding: "8px 14px", borderRadius: 7, border: "1.5px solid #e4e0d8", background: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Add
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#77716a", marginBottom: 8 }}>SUBTASKS</div>
              {draft.subtasks.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                  <div
                    onClick={() => toggleDraftSubtask(s.id)}
                    style={{
                      width: 17,
                      height: 17,
                      borderRadius: 5,
                      border: `1.6px solid ${s.done ? ACCENT : "#d6d2c7"}`,
                      background: s.done ? ACCENT : "#ffffff",
                      cursor: "pointer",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {s.done && (
                      <svg width="8" height="7" viewBox="0 0 8 7">
                        <path d="M1 3.5L3 5.5L7 1" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: 13.5, textDecoration: s.done ? "line-through" : "none", color: s.done ? "#a39d90" : "#4a453e" }}>
                    {s.text}
                  </div>
                  <div
                    onClick={() => removeSubtask(s.id)}
                    style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.5 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M1 1L9 9M9 1L1 9" stroke="#c0392b" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  placeholder="Add a subtask"
                  style={{ flex: 1, padding: "8px 11px", borderRadius: 7, border: "1.5px solid #e4e0d8", fontSize: 13 }}
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  style={{ padding: "8px 14px", borderRadius: 7, border: "1.5px solid #e4e0d8", background: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Add
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #ece8e0" }}>
              {modalMode === "edit" ? (
                <div onClick={deleteFromModal} style={{ fontSize: 13, fontWeight: 600, color: "#c0392b", cursor: "pointer", padding: "9px 6px" }}>
                  Delete task
                </div>
              ) : (
                <div />
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ padding: "10px 18px", borderRadius: 8, border: "1.5px solid #e4e0d8", background: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: ACCENT, color: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                >
                  {modalMode === "add" ? "Add task" : "Save changes"}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
