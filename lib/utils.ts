import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TAG_PALETTE, PRIORITY_META } from "./theme";
import type { Priority, Todo, ViewKey, SortKey, PriorityFilter } from "./types";

export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
export const MAX_SUBTASKS = 50;
export const MAX_SUBTASK_TEXT_LENGTH = 200;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dueLabel(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const today = todayISO();
  const d = new Date(dueDate + "T00:00:00");
  const t = new Date(today + "T00:00:00");
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function tagStyle(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

export function priorityMeta(p: Priority) {
  return PRIORITY_META[p];
}

export function filterTasks(
  tasks: Todo[],
  opts: { view: ViewKey; search: string; priorityFilter: PriorityFilter; tagFilter: string | null }
): Todo[] {
  const todayStr = todayISO();
  let list = tasks.slice();
  if (opts.view === "today") list = list.filter((t) => !t.done && t.dueDate === todayStr);
  else if (opts.view === "upcoming") list = list.filter((t) => !t.done && !!t.dueDate && t.dueDate > todayStr);
  else if (opts.view === "completed") list = list.filter((t) => t.done);
  const q = opts.search.trim().toLowerCase();
  if (q) list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  if (opts.priorityFilter !== "all") list = list.filter((t) => t.priority === opts.priorityFilter);
  if (opts.tagFilter) list = list.filter((t) => t.tags.includes(opts.tagFilter as string));
  return list;
}

export function sortTasks(tasks: Todo[], sortBy: SortKey): Todo[] {
  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const list = tasks.slice();
  if (sortBy === "manual") list.sort((a, b) => a.order - b.order);
  else if (sortBy === "dueDate")
    list.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  else if (sortBy === "priority") list.sort((a, b) => rank[a.priority] - rank[b.priority]);
  else if (sortBy === "alpha") list.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortBy === "newest")
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

export function computeCounts(tasks: Todo[]) {
  const todayStr = todayISO();
  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.done).length,
    today: tasks.filter((t) => !t.done && t.dueDate === todayStr).length,
    upcoming: tasks.filter((t) => !t.done && !!t.dueDate && t.dueDate > todayStr).length,
  };
}

export function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Give the task a title";
  if (trimmed.length > 200) return "Title must be 200 characters or fewer";
  return null;
}

/** Shared caps for description/tags/subtasks, enforced client-side and again in the data layer. */
export function validateTaskInput(input: {
  description?: string;
  tags?: string[];
  subtasks?: { text: string }[];
}): string | null {
  if (input.description !== undefined && input.description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`;
  }
  if (input.tags !== undefined) {
    if (input.tags.length > MAX_TAGS) return `A task can have at most ${MAX_TAGS} tags`;
    if (input.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      return `Tags must be ${MAX_TAG_LENGTH} characters or fewer`;
    }
  }
  if (input.subtasks !== undefined) {
    if (input.subtasks.length > MAX_SUBTASKS) return `A task can have at most ${MAX_SUBTASKS} subtasks`;
    if (input.subtasks.some((s) => s.text.length > MAX_SUBTASK_TEXT_LENGTH)) {
      return `Subtask text must be ${MAX_SUBTASK_TEXT_LENGTH} characters or fewer`;
    }
  }
  return null;
}
