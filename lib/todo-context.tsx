// lib/todo-context.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { fetchTodos, insertTodo, updateTodoRow, deleteTodoRow, maxSortOrder } from "@/lib/supabase/todos";
import { filterTasks, sortTasks, computeCounts, validateTitle, todayISO } from "@/lib/utils";
import type { Priority, SortKey, Subtask, Todo, TodoDraft, ToastState, ViewKey, PriorityFilter } from "@/lib/types";

const PAGE_SIZE = 6;

function uid(): string {
  return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function emptyDraft(): TodoDraft {
  return {
    id: null,
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    tags: [],
    subtasks: [],
    done: false,
    order: 0,
  };
}

interface TodoContextValue {
  todos: Todo[];
  loading: boolean;
  view: ViewKey;
  search: string;
  priorityFilter: PriorityFilter;
  tagFilter: string | null;
  sortBy: SortKey;
  page: number;
  modalOpen: boolean;
  modalMode: "add" | "edit";
  draft: TodoDraft | null;
  newSubtaskText: string;
  newTagText: string;
  expandedIds: Record<string, boolean>;
  deleteConfirmId: string | null;
  mobileNavOpen: boolean;
  toast: ToastState | null;
  dragId: string | null;
  dragOverId: string | null;
  dragOverTagName: string | null;
  tagDropPulse: string | null;

  pageItems: Todo[];
  totalPages: number;
  counts: { total: number; completed: number; today: number; upcoming: number };
  allTags: { name: string; count: number }[];

  setView: (v: ViewKey) => void;
  setSearch: (v: string) => void;
  setPriorityFilter: (v: PriorityFilter) => void;
  setTagFilter: (tag: string) => void;
  setSortBy: (v: SortKey) => void;
  clearFilters: () => void;
  goToPage: (p: number) => void;
  prevPage: () => void;
  nextPage: () => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleExpand: (id: string) => void;
  toggleComplete: (id: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  askDelete: (id: string) => void;
  cancelDelete: () => void;
  confirmDelete: () => void;
  openAdd: () => void;
  openEdit: (task: Todo) => void;
  closeModal: () => void;
  deleteFromModal: () => void;
  setDraftField: <K extends keyof TodoDraft>(field: K, value: TodoDraft[K]) => void;
  toggleDraftTag: (tag: string) => void;
  addCustomTag: () => void;
  setNewTagText: (v: string) => void;
  addSubtask: () => void;
  setNewSubtaskText: (v: string) => void;
  removeSubtask: (id: string) => void;
  toggleDraftSubtask: (id: string) => void;
  saveDraft: (e?: { preventDefault: () => void }) => void;
  dropTaskOnTag: (tagName: string) => void;
  onDragStart: (id: string) => void;
  onDragOverTask: (id: string) => void;
  onDropTask: () => void;
  onDragEnd: () => void;
  onDragOverTag: (tagName: string) => void;
  onDragLeaveTag: (tagName: string) => void;
  onDropTag: (tagName: string) => void;
  showToast: (message: string, type?: "success" | "danger") => void;
}

const TodoContext = createContext<TodoContextValue | null>(null);

export function TodoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setViewState] = useState<ViewKey>("all");
  const [search, setSearchState] = useState("");
  const [priorityFilter, setPriorityFilterState] = useState<PriorityFilter>("all");
  const [tagFilter, setTagFilterState] = useState<string | null>(null);
  const [sortBy, setSortByState] = useState<SortKey>("dueDate");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [draft, setDraft] = useState<TodoDraft | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [newTagText, setNewTagText] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverTagName, setDragOverTagName] = useState<string | null>(null);
  const [tagDropPulse, setTagDropPulse] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTodos(supabase, user.id)
      .then((rows) => {
        if (!cancelled) setTodos(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, user.id]);

  const showToast = useCallback((message: string, type: "success" | "danger" = "success") => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, 2600);
  }, []);

  // ---- filters / nav ----
  const setView = useCallback((v: ViewKey) => {
    setViewState(v);
    setPage(1);
    setMobileNavOpen(false);
  }, []);
  const setSearch = useCallback((v: string) => {
    setSearchState(v);
    setPage(1);
  }, []);
  const setPriorityFilter = useCallback((v: PriorityFilter) => {
    setPriorityFilterState(v);
    setPage(1);
  }, []);
  const setTagFilter = useCallback((tag: string) => {
    setTagFilterState((cur) => (cur === tag ? null : tag));
    setPage(1);
    setMobileNavOpen(false);
  }, []);
  const setSortBy = useCallback((v: SortKey) => {
    setSortByState(v);
    setPage(1);
  }, []);
  const clearFilters = useCallback(() => {
    setSearchState("");
    setPriorityFilterState("all");
    setTagFilterState(null);
    setPage(1);
  }, []);
  const goToPage = useCallback((p: number) => setPage(p), []);

  const filtered = useMemo(
    () => filterTasks(todos, { view, search, priorityFilter, tagFilter }),
    [todos, view, search, priorityFilter, tagFilter]
  );
  const sorted = useMemo(() => sortTasks(filtered, sortBy), [filtered, sortBy]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => sorted.slice((clampedPage - 1) * PAGE_SIZE, (clampedPage - 1) * PAGE_SIZE + PAGE_SIZE),
    [sorted, clampedPage]
  );
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const nextPage = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);

  const counts = useMemo(() => computeCounts(todos), [todos]);

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    todos.forEach((t) => t.tags.forEach((tag) => map.set(tag, (map.get(tag) || 0) + 1)));
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [todos]);

  const openMobileNav = useCallback(() => setMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  // ---- mutations (optimistic local update + persist) ----
  const toggleComplete = useCallback(
    (id: string) => {
      setTodos((cur) => cur.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
      const target = todos.find((t) => t.id === id);
      if (target) void updateTodoRow(supabase, id, { done: !target.done });
    },
    [supabase, todos]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subId: string) => {
      const task = todos.find((t) => t.id === taskId);
      if (!task) return;
      const nextSubtasks = task.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
      setTodos((cur) => cur.map((t) => (t.id === taskId ? { ...t, subtasks: nextSubtasks } : t)));
      void updateTodoRow(supabase, taskId, { subtasks: nextSubtasks });
    },
    [supabase, todos]
  );

  const askDelete = useCallback((id: string) => setDeleteConfirmId(id), []);
  const cancelDelete = useCallback(() => setDeleteConfirmId(null), []);
  const confirmDelete = useCallback(() => {
    const id = deleteConfirmId;
    if (!id) return;
    setTodos((cur) => cur.filter((t) => t.id !== id));
    setDeleteConfirmId(null);
    void deleteTodoRow(supabase, id);
    showToast("Task deleted", "danger");
  }, [deleteConfirmId, supabase, showToast]);

  // ---- modal / draft ----
  const openAdd = useCallback(() => {
    setModalOpen(true);
    setModalMode("add");
    setDraft(emptyDraft());
    setNewSubtaskText("");
    setNewTagText("");
    setMobileNavOpen(false);
  }, []);

  const openEdit = useCallback((task: Todo) => {
    setModalOpen(true);
    setModalMode("edit");
    setDraft({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate || "",
      tags: [...task.tags],
      subtasks: task.subtasks.map((s) => ({ ...s })),
      done: task.done,
      order: task.order,
    });
    setNewSubtaskText("");
    setNewTagText("");
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setDraft(null);
  }, []);

  const deleteFromModal = useCallback(() => {
    if (!draft?.id) return;
    const id = draft.id;
    setModalOpen(false);
    setDraft(null);
    setDeleteConfirmId(id);
  }, [draft]);

  const setDraftField = useCallback(
    <K extends keyof TodoDraft>(field: K, value: TodoDraft[K]) => {
      setDraft((d) => (d ? { ...d, [field]: value } : d));
    },
    []
  );

  const toggleDraftTag = useCallback((tag: string) => {
    setDraft((d) => {
      if (!d) return d;
      const tags = d.tags.includes(tag) ? d.tags.filter((x) => x !== tag) : [...d.tags, tag];
      return { ...d, tags };
    });
  }, []);

  const addCustomTag = useCallback(() => {
    const tag = newTagText.trim();
    if (!tag) return;
    setDraft((d) => (d ? { ...d, tags: d.tags.includes(tag) ? d.tags : [...d.tags, tag] } : d));
    setNewTagText("");
  }, [newTagText]);

  const addSubtask = useCallback(() => {
    const text = newSubtaskText.trim();
    if (!text) return;
    setDraft((d) => (d ? { ...d, subtasks: [...d.subtasks, { id: uid(), text, done: false }] } : d));
    setNewSubtaskText("");
  }, [newSubtaskText]);

  const removeSubtask = useCallback((id: string) => {
    setDraft((d) => (d ? { ...d, subtasks: d.subtasks.filter((s) => s.id !== id) } : d));
  }, []);

  const toggleDraftSubtask = useCallback((id: string) => {
    setDraft((d) =>
      d ? { ...d, subtasks: d.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) } : d
    );
  }, []);

  const saveDraft = useCallback(
    (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      if (!draft) return;
      const titleError = validateTitle(draft.title);
      if (titleError) {
        showToast(titleError, "danger");
        return;
      }
      if (modalMode === "add") {
        (async () => {
          try {
            const nextOrder = (await maxSortOrder(supabase, user.id)) + 1;
            const created = await insertTodo(supabase, user.id, { ...draft, order: nextOrder });
            setTodos((cur) => [created, ...cur]);
          } catch {
            showToast("Failed to add task", "danger");
          }
        })();
      } else if (draft.id) {
        const id = draft.id;
        setTodos((cur) =>
          cur.map((t) =>
            t.id === id
              ? {
                  ...t,
                  title: draft.title.trim(),
                  description: draft.description,
                  priority: draft.priority,
                  dueDate: draft.dueDate || null,
                  tags: draft.tags,
                  subtasks: draft.subtasks,
                  done: draft.done,
                }
              : t
          )
        );
        void updateTodoRow(supabase, id, {
          title: draft.title.trim(),
          description: draft.description,
          priority: draft.priority,
          due_date: draft.dueDate || null,
          tags: draft.tags,
          subtasks: draft.subtasks,
          done: draft.done,
        });
      }
      setModalOpen(false);
      setDraft(null);
      showToast(modalMode === "add" ? "Task added" : "Task updated");
    },
    [draft, modalMode, supabase, user.id, showToast]
  );

  // ---- tag drag-and-drop ----
  const dropTaskOnTag = useCallback(
    (tagName: string) => {
      const id = dragId;
      if (id == null) {
        setDragOverTagName(null);
        return;
      }
      setTodos((cur) => cur.map((t) => (t.id === id ? { ...t, tags: [tagName] } : t)));
      void updateTodoRow(supabase, id, { tags: [tagName] });
      setDragId(null);
      setDragOverId(null);
      setDragOverTagName(null);
      setTagDropPulse(tagName);
      showToast(`Tagged as "${tagName}"`);
      setTimeout(() => setTagDropPulse((cur) => (cur === tagName ? null : cur)), 500);
    },
    [dragId, supabase, showToast]
  );

  const onDragOverTag = useCallback(
    (tagName: string) => {
      if (dragId != null && dragOverTagName !== tagName) setDragOverTagName(tagName);
    },
    [dragId, dragOverTagName]
  );
  const onDragLeaveTag = useCallback(
    (tagName: string) => {
      setDragOverTagName((cur) => (cur === tagName ? null : cur));
    },
    []
  );
  const onDropTag = useCallback((tagName: string) => dropTaskOnTag(tagName), [dropTaskOnTag]);

  // ---- manual reorder ----
  const onDragStart = useCallback((id: string) => setDragId(id), []);
  const onDragOverTask = useCallback(
    (id: string) => {
      if (dragOverId !== id) setDragOverId(id);
    },
    [dragOverId]
  );

  const commitReorder = useCallback(() => {
    if (dragId != null && dragOverId != null && dragId !== dragOverId) {
      const ordered = [...todos].sort((a, b) => a.order - b.order);
      const fromIdx = ordered.findIndex((t) => t.id === dragId);
      const toIdx = ordered.findIndex((t) => t.id === dragOverId);
      if (fromIdx > -1 && toIdx > -1) {
        const moved = ordered.splice(fromIdx, 1)[0];
        ordered.splice(toIdx, 0, moved);
        const reordered = ordered.map((t, i) => ({ ...t, order: i }));
        setTodos(reordered);
        reordered.forEach((t, i) => {
          if (todos.find((orig) => orig.id === t.id)?.order !== i) {
            void updateTodoRow(supabase, t.id, { sort_order: i });
          }
        });
      }
    }
    setDragId(null);
    setDragOverId(null);
    setDragOverTagName(null);
  }, [dragId, dragOverId, todos, supabase]);

  const onDropTask = useCallback(() => commitReorder(), [commitReorder]);
  const onDragEnd = useCallback(() => commitReorder(), [commitReorder]);

  const value: TodoContextValue = {
    todos,
    loading,
    view,
    search,
    priorityFilter,
    tagFilter,
    sortBy,
    page: clampedPage,
    modalOpen,
    modalMode,
    draft,
    newSubtaskText,
    newTagText,
    expandedIds,
    deleteConfirmId,
    mobileNavOpen,
    toast,
    dragId,
    dragOverId,
    dragOverTagName,
    tagDropPulse,
    pageItems,
    totalPages,
    counts,
    allTags,
    setView,
    setSearch,
    setPriorityFilter,
    setTagFilter,
    setSortBy,
    clearFilters,
    goToPage,
    prevPage,
    nextPage,
    openMobileNav,
    closeMobileNav,
    toggleExpand,
    toggleComplete,
    toggleSubtask,
    askDelete,
    cancelDelete,
    confirmDelete,
    openAdd,
    openEdit,
    closeModal,
    deleteFromModal,
    setDraftField,
    toggleDraftTag,
    addCustomTag,
    setNewTagText,
    addSubtask,
    setNewSubtaskText,
    removeSubtask,
    toggleDraftSubtask,
    saveDraft,
    dropTaskOnTag,
    onDragStart,
    onDragOverTask,
    onDropTask,
    onDragEnd,
    onDragOverTag,
    onDragLeaveTag,
    onDropTag,
    showToast,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos(): TodoContextValue {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
}
