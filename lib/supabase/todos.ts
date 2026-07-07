import type { SupabaseClient } from "@supabase/supabase-js";
import type { Todo, TodoDraft } from "@/lib/types";
import { validateTaskInput } from "@/lib/utils";

interface TodoRow {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  tags: string[];
  subtasks: { id: string; text: string; done: boolean }[];
  done: boolean;
  sort_order: number;
  created_at: string;
}

const COLUMNS = "id,title,description,priority,due_date,tags,subtasks,done,sort_order,created_at";

function assertValidTodoInput(input: {
  description?: string;
  tags?: string[];
  subtasks?: { text: string }[];
}): void {
  const error = validateTaskInput(input);
  if (error) throw new Error(error);
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    priority: row.priority,
    dueDate: row.due_date,
    tags: row.tags ?? [],
    subtasks: row.subtasks ?? [],
    done: row.done,
    order: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function fetchTodos(supabase: SupabaseClient, userId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as TodoRow[]).map(rowToTodo);
}

export async function insertTodo(supabase: SupabaseClient, userId: string, draft: TodoDraft): Promise<Todo> {
  assertValidTodoInput(draft);
  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: userId,
      title: draft.title.trim(),
      description: draft.description,
      priority: draft.priority,
      due_date: draft.dueDate || null,
      tags: draft.tags,
      subtasks: draft.subtasks,
      done: draft.done,
      sort_order: draft.order,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return rowToTodo(data as TodoRow);
}

export async function updateTodoRow(
  supabase: SupabaseClient,
  id: string,
  patch: {
    title?: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    due_date?: string | null;
    tags?: string[];
    subtasks?: { id: string; text: string; done: boolean }[];
    done?: boolean;
    sort_order?: number;
  }
) {
  assertValidTodoInput({
    description: patch.description,
    tags: patch.tags,
    subtasks: patch.subtasks,
  });
  const { error } = await supabase.from("todos").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTodoRow(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw error;
}

export async function maxSortOrder(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("todos")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length ? data[0].sort_order : -1;
}
