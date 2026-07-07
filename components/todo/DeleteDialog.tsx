// components/todo/DeleteDialog.tsx
"use client";

import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";
import { useTodos } from "@/lib/todo-context";

export function DeleteDialog() {
  const { deleteConfirmId, cancelDelete, confirmDelete } = useTodos();

  return (
    <Dialog
      open={!!deleteConfirmId}
      onOpenChange={(open) => {
        if (!open) cancelDelete();
      }}
    >
      <DialogPortal>
        <DialogOverlay style={{ position: "fixed", inset: 0, background: "rgba(20,18,14,0.4)", zIndex: 60, animation: "fadeIn 0.15s ease" }} />
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 61,
            width: "100%",
            maxWidth: 360,
            background: "#ffffff",
            borderRadius: 14,
            padding: 24,
            animation: "scaleIn 0.18s ease-out",
            boxShadow: "0 20px 60px rgba(20,18,14,0.2)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete this task?</div>
          <div style={{ fontSize: 13.5, color: "#77716a", marginBottom: 20, lineHeight: 1.5 }}>This can&apos;t be undone.</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={cancelDelete}
              style={{ padding: "9px 16px", borderRadius: 8, border: "1.5px solid #e4e0d8", background: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#c0392b", color: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
