// components/todo/TaskList.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { TaskCard } from "./TaskCard";
import { EmptyState } from "./EmptyState";

export function TaskList() {
  const { pageItems, todos } = useTodos();

  if (todos.length === 0) return <EmptyState variant="no-tasks" />;
  if (pageItems.length === 0) return <EmptyState variant="filtered" />;

  return (
    <div>
      {pageItems.map((task, i) => (
        <TaskCard key={task.id} task={task} index={i} />
      ))}
    </div>
  );
}
