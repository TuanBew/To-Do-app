export type Priority = "low" | "medium" | "high";

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  tags: string[];
  subtasks: Subtask[];
  done: boolean;
  order: number;
  createdAt: string;
}

export type ViewKey = "all" | "today" | "upcoming" | "completed";
export type SortKey = "dueDate" | "priority" | "alpha" | "newest" | "manual";
export type PriorityFilter = "all" | Priority;

export interface TodoDraft {
  id: string | null;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  tags: string[];
  subtasks: Subtask[];
  done: boolean;
  order: number;
}

export interface ToastState {
  id: number;
  message: string;
  type: "success" | "danger";
}
