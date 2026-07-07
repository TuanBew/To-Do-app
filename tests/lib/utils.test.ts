import { describe, expect, it } from "vitest";
import {
  cn,
  computeCounts,
  dueLabel,
  filterTasks,
  sortTasks,
  todayISO,
  validateTaskInput,
  validateTitle,
} from "@/lib/utils";
import type { Todo } from "@/lib/types";

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "1",
    title: "Task",
    description: "",
    priority: "medium",
    dueDate: null,
    tags: [],
    subtasks: [],
    done: false,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("todayISO", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("dueLabel", () => {
  it("returns null for no due date", () => {
    expect(dueLabel(null)).toBeNull();
  });

  it("labels today, tomorrow, and yesterday relative to now", () => {
    const toISODate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const today = todayISO();
    const d = new Date(today + "T00:00:00");

    const tomorrow = new Date(d);
    tomorrow.setDate(d.getDate() + 1);
    const yesterday = new Date(d);
    yesterday.setDate(d.getDate() - 1);

    expect(dueLabel(today)).toBe("Today");
    expect(dueLabel(toISODate(tomorrow))).toBe("Tomorrow");
    expect(dueLabel(toISODate(yesterday))).toBe("Yesterday");
  });

  it("falls back to a short date for anything further out", () => {
    expect(dueLabel("2099-12-25")).toBe("Dec 25");
  });
});

describe("filterTasks", () => {
  const todayStr = todayISO();
  const tasks: Todo[] = [
    makeTodo({ id: "a", title: "Buy milk", dueDate: todayStr, priority: "high", tags: ["errand"] }),
    makeTodo({ id: "b", title: "Write report", dueDate: "2099-01-01", priority: "low", tags: ["work"] }),
    makeTodo({ id: "c", title: "Old task", done: true, priority: "medium" }),
    makeTodo({ id: "d", title: "No due date item", priority: "medium" }),
  ];

  it("filters by the 'today' view to undone tasks due today", () => {
    const result = filterTasks(tasks, { view: "today", search: "", priorityFilter: "all", tagFilter: null });
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("filters by the 'upcoming' view to undone tasks with a future due date", () => {
    const result = filterTasks(tasks, { view: "upcoming", search: "", priorityFilter: "all", tagFilter: null });
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("filters by the 'completed' view", () => {
    const result = filterTasks(tasks, { view: "completed", search: "", priorityFilter: "all", tagFilter: null });
    expect(result.map((t) => t.id)).toEqual(["c"]);
  });

  it("matches search case-insensitively against title", () => {
    const result = filterTasks(tasks, { view: "all", search: "MILK", priorityFilter: "all", tagFilter: null });
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("filters by priority", () => {
    const result = filterTasks(tasks, { view: "all", search: "", priorityFilter: "low", tagFilter: null });
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("filters by tag", () => {
    const result = filterTasks(tasks, { view: "all", search: "", priorityFilter: "all", tagFilter: "errand" });
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("combines filters", () => {
    const result = filterTasks(tasks, {
      view: "all",
      search: "report",
      priorityFilter: "low",
      tagFilter: "work",
    });
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });
});

describe("sortTasks", () => {
  it("sorts by manual order", () => {
    const tasks = [makeTodo({ id: "a", order: 2 }), makeTodo({ id: "b", order: 1 })];
    expect(sortTasks(tasks, "manual").map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("sorts by due date, pushing tasks with no due date to the end", () => {
    const tasks = [
      makeTodo({ id: "a", dueDate: null }),
      makeTodo({ id: "b", dueDate: "2026-01-01" }),
      makeTodo({ id: "c", dueDate: "2025-06-01" }),
    ];
    expect(sortTasks(tasks, "dueDate").map((t) => t.id)).toEqual(["c", "b", "a"]);
  });

  it("sorts by priority, high before medium before low", () => {
    const tasks = [
      makeTodo({ id: "a", priority: "low" }),
      makeTodo({ id: "b", priority: "high" }),
      makeTodo({ id: "c", priority: "medium" }),
    ];
    expect(sortTasks(tasks, "priority").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts alphabetically by title", () => {
    const tasks = [makeTodo({ id: "a", title: "Zebra" }), makeTodo({ id: "b", title: "Apple" })];
    expect(sortTasks(tasks, "alpha").map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("sorts newest first by createdAt", () => {
    const tasks = [
      makeTodo({ id: "a", createdAt: "2026-01-01T00:00:00.000Z" }),
      makeTodo({ id: "b", createdAt: "2026-06-01T00:00:00.000Z" }),
    ];
    expect(sortTasks(tasks, "newest").map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("does not mutate the input array", () => {
    const tasks = [makeTodo({ id: "a", order: 2 }), makeTodo({ id: "b", order: 1 })];
    const original = [...tasks];
    sortTasks(tasks, "manual");
    expect(tasks).toEqual(original);
  });
});

describe("computeCounts", () => {
  it("tallies total, completed, due-today, and upcoming counts", () => {
    const todayStr = todayISO();
    const tasks = [
      makeTodo({ id: "a", done: true }),
      makeTodo({ id: "b", dueDate: todayStr }),
      makeTodo({ id: "c", dueDate: "2099-01-01" }),
      makeTodo({ id: "d" }),
    ];
    expect(computeCounts(tasks)).toEqual({ total: 4, completed: 1, today: 1, upcoming: 1 });
  });
});

describe("validateTitle", () => {
  it("rejects empty or whitespace-only titles", () => {
    expect(validateTitle("")).toBe("Give the task a title");
    expect(validateTitle("   ")).toBe("Give the task a title");
  });

  it("rejects titles over 200 characters", () => {
    expect(validateTitle("a".repeat(201))).toBe("Title must be 200 characters or fewer");
  });

  it("accepts a normal title", () => {
    expect(validateTitle("Buy milk")).toBeNull();
  });
});

describe("validateTaskInput", () => {
  it("accepts empty input", () => {
    expect(validateTaskInput({})).toBeNull();
  });

  it("rejects a description over 2000 characters", () => {
    expect(validateTaskInput({ description: "a".repeat(2001) })).toMatch(/Description/);
  });

  it("rejects more than 20 tags", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(validateTaskInput({ tags })).toMatch(/at most 20 tags/);
  });

  it("rejects a tag longer than 40 characters", () => {
    expect(validateTaskInput({ tags: ["a".repeat(41)] })).toMatch(/40 characters/);
  });

  it("rejects more than 50 subtasks", () => {
    const subtasks = Array.from({ length: 51 }, () => ({ text: "x" }));
    expect(validateTaskInput({ subtasks })).toMatch(/at most 50 subtasks/);
  });

  it("rejects subtask text longer than 200 characters", () => {
    expect(validateTaskInput({ subtasks: [{ text: "a".repeat(201) }] })).toMatch(/200 characters/);
  });
});
