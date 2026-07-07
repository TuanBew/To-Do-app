# Loop Todo App — Next.js/Supabase Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the "Loop" todo app design (`Loop Todo App.dc.html`) pixel-faithfully into Next.js 15 / React 19 at the repo root, backed by Supabase (Postgres + Auth with RLS), deployable to Vercel, with a Dockerfile for local/parity use.

**Architecture:** App Router with Server Actions for auth (sign up / sign in / sign out via `@supabase/ssr`, cookie-based sessions, `middleware.ts` for session refresh + route protection). All todo CRUD happens client-side directly against Supabase via `supabase-js` (RLS is the real security boundary, so no custom backend is needed). Visual fidelity is achieved with inline `style` objects carrying the exact hex/px values from the source design (Tailwind utility classes are used only for layout primitives like `flex`), rather than reskinning through default shadcn/Tailwind theme tokens.

**Tech Stack:** Next.js 15 (React 19, App Router), TypeScript, Tailwind CSS v4, `@supabase/ssr` + `@supabase/supabase-js`, Radix primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`) already in `package.json`, `lucide-react` for icons where the source uses inline SVG icons that are simple to swap 1:1.

## Global Constraints

- Design is locked: no visual/layout/copy change beyond what `Loop Todo App.dc.html` specifies. Any gap must be flagged, not improvised (see Constraint 1 in the brief).
- Every `todos` row is scoped by `user_id`; Supabase RLS policies (`auth.uid() = user_id`) are the enforcement mechanism, never client-side filtering alone (Constraint 2).
- Work directly on `main`, commit incrementally with clear messages (Constraint 3).
- No automated test suite. Every task ends with a **manual verification** step (run the dev server, exercise the flow in the browser) instead of a test-run step (Constraint 4).
- `SUPABASE_SERVICE_ROLE_KEY` (if ever introduced) must never reach client code or the repo. This build does not need it — all access goes through the anon key + RLS.
- Accent color fixed at `#ea580c` (the design's declared default prop value), no theme switcher in scope.
- Docker is included per explicit user decision (Dockerfile + docker-compose for local parity), even though the deploy target is Vercel.
- Supabase project URL + anon key are supplied by the user into `.env.local` (not created by the agent).

---

## File Structure

```
/ (repo root — existing next.config.mjs, package.json, tsconfig.json stay here)
  middleware.ts
  Dockerfile
  docker-compose.yml
  .dockerignore
  .env.example
  supabase/schema.sql
  app/
    layout.tsx
    globals.css
    page.tsx
    login/page.tsx
    signup/page.tsx
    dashboard/page.tsx
  lib/
    types.ts
    theme.ts
    utils.ts
    use-is-mobile.ts
    auth-context.tsx
    todo-context.tsx
    actions/auth.ts
    supabase/client.ts
    supabase/server.ts
    supabase/middleware.ts
    supabase/todos.ts
  components/
    ui/
      button.tsx
      input.tsx
      textarea.tsx
      dialog.tsx
      dropdown-menu.tsx
    auth/
      AuthShell.tsx
      LoginForm.tsx
      SignupForm.tsx
    todo/
      DashboardShell.tsx
      Sidebar.tsx
      MobileTopBar.tsx
      StatsBar.tsx
      FilterBar.tsx
      SortMenu.tsx
      TaskList.tsx
      TaskCard.tsx
      EmptyState.tsx
      Pagination.tsx
      Fab.tsx
      Toast.tsx
      TaskModal.tsx
      DeleteDialog.tsx
  README.md
```

---

## Task 1: Dependencies, env, gitignore

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Modify: `.gitignore` (create if absent)

**Interfaces:**
- Produces: `@supabase/ssr`, `@supabase/supabase-js` available to all later tasks.

- [ ] **Step 1: Add Supabase dependencies to `package.json`**

Add to `"dependencies"`:

```json
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.10",
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: lockfile updated, no errors.

- [ ] **Step 3: Create `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
.next/
.env
.env.local
.env*.local
npm-debug.log*
.DS_Store
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 5: Manual verification**

Run: `npm install` succeeds and `node_modules/@supabase/ssr` exists.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore
git commit -m "chore: add Supabase dependencies and env scaffolding"
```

---

## Task 2: Supabase schema + RLS

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: `public.todos` table with columns `id, user_id, title, description, priority, due_date, tags, subtasks, done, sort_order, created_at, updated_at` — this exact column set is what `lib/supabase/todos.ts` (Task 4) selects/writes against.

- [ ] **Step 1: Write the schema + RLS script**

```sql
-- supabase/schema.sql
-- Run this once in the Supabase SQL editor (or via `supabase db execute`).

create extension if not exists "pgcrypto";

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 200),
  description text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  tags text[] not null default '{}',
  subtasks jsonb not null default '[]',
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todos_user_id_idx on public.todos (user_id);
create index if not exists todos_user_sort_idx on public.todos (user_id, sort_order);

alter table public.todos enable row level security;

drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own" on public.todos
  for select using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own" on public.todos
  for insert with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own" on public.todos
  for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Manual verification**

Paste into the Supabase project's SQL editor and run it. Expected: "Success. No rows returned." Then in Supabase dashboard → Authentication → Providers → Email, turn **off** "Confirm email" (so sign-up logs the user in immediately, matching the mock's behavior of no email-verification screen).

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add todos table schema with per-user RLS policies"
```

---

## Task 3: Supabase client/server/middleware helpers

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local` (Task 1).
- Produces: `createClient()` (browser, from `lib/supabase/client.ts`) used by Task 6 (todo-context) and Task 7 (auth-context). `createClient()` (server, from `lib/supabase/server.ts`) used by Task 5 (auth actions) and `app/dashboard/page.tsx` (Task 15). `updateSession(request)` used by root `middleware.ts`.

- [ ] **Step 1: Browser client**

```ts
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Server client**

```ts
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component render; middleware refreshes the session instead
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Middleware session-refresh helper**

```ts
// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isDashboard = pathname.startsWith("/dashboard");

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **Step 4: Root middleware**

```ts
// middleware.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 5: Manual verification**

Add real values to `.env.local` (copy from `.env.example`), run `npm run dev`, visit `http://localhost:3000/dashboard` while logged out. Expected: redirected to `/login` (confirms middleware runs; the page itself doesn't exist yet, that's fine — a 404-after-redirect or redirect loop would indicate a bug, but a clean redirect to `/login` is the pass condition).

- [ ] **Step 6: Commit**

```bash
git add lib/supabase middleware.ts
git commit -m "feat: add Supabase client/server helpers and route-protection middleware"
```

---

## Task 4: Core types, theme tokens, domain utils, mobile hook, todos data layer

**Files:**
- Create: `lib/types.ts`
- Create: `lib/theme.ts`
- Create: `lib/utils.ts`
- Create: `lib/use-is-mobile.ts`
- Create: `lib/supabase/todos.ts`

**Interfaces:**
- Produces: `Priority`, `Subtask`, `Todo`, `TodoDraft`, `ViewKey`, `SortKey`, `PriorityFilter`, `ToastState` types (Task 6+ import these everywhere). `ACCENT`, `ACCENT_SOFT`, `TAG_PALETTE`, `PRIORITY_META`, `SORT_OPTIONS`, `PRESET_TAGS` constants. `cn()`, `todayISO()`, `dueLabel()`, `tagStyle()`, `priorityMeta()`, `filterTasks()`, `sortTasks()`, `computeCounts()`, `validateTitle()` pure functions. `useIsMobile()` hook. `fetchTodos`, `insertTodo`, `updateTodoRow`, `deleteTodoRow`, `maxSortOrder` data-access functions — these are what `todo-context.tsx` (Task 10) calls for every mutation.

- [ ] **Step 1: Domain types**

```ts
// lib/types.ts
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
```

- [ ] **Step 2: Theme tokens (exact values from the source `.dc.html`)**

```ts
// lib/theme.ts
import type { SortKey } from "./types";

export const ACCENT = "#ea580c";
export const ACCENT_SOFT = ACCENT + "0c";

export const INK = "#22201c";
export const INK_MUTED = "#77716a";
export const INK_FAINT = "#9a9488";
export const INK_QUIET = "#8a8478";
export const BORDER = "#e4e0d8";
export const BORDER_SOFT = "#ece8e0";
export const SIDEBAR_BORDER = "#e7e3da";
export const SIDEBAR_BG = "#f3f1ec";
export const CANVAS_BG = "#faf9f6";
export const DANGER = "#c0392b";
export const DANGER_SOFT = "#fbe9e6";

export const TAG_PALETTE = [
  { bg: "#e7edfb", fg: "#3555a8" },
  { bg: "#f2e9fb", fg: "#7440ab" },
  { bg: "#e5f4ea", fg: "#2f7d4c" },
  { bg: "#faeee2", fg: "#a15b25" },
  { bg: "#e3f3f4", fg: "#2a7d84" },
  { bg: "#fbe9f1", fg: "#a34472" },
] as const;

export const PRIORITY_META = {
  high: { label: "High", color: "#dc4b34", bg: "#dc4b3414" },
  medium: { label: "Medium", color: "#c07d1f", bg: "#c07d1f14" },
  low: { label: "Low", color: "#3b82c4", bg: "#3b82c414" },
} as const;

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "dueDate", label: "Due date" },
  { key: "priority", label: "Priority" },
  { key: "alpha", label: "A–Z" },
  { key: "newest", label: "Newest" },
  { key: "manual", label: "Manual" },
];

export const PRESET_TAGS = ["Work", "Personal", "Design", "Marketing", "Learning", "Health", "Home"];
```

- [ ] **Step 3: Domain utils (mirrors the mock's `getVisibleTasks`/`computeCounts`/`decorate` logic exactly)**

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TAG_PALETTE, PRIORITY_META } from "./theme";
import type { Priority, Todo, ViewKey, SortKey, PriorityFilter } from "./types";

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
```

- [ ] **Step 4: Mobile breakpoint hook (matches the mock's `window.innerWidth < 880` check)**

```ts
// lib/use-is-mobile.ts
"use client";

import { useEffect, useState } from "react";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 879px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
```

- [ ] **Step 5: Todos data-access layer (thin wrapper over supabase-js, used by `todo-context.tsx`)**

```ts
// lib/supabase/todos.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Todo, TodoDraft } from "@/lib/types";

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
```

- [ ] **Step 6: Manual verification**

Run `npx tsc --noEmit`. Expected: no errors referencing these five files (unrelated pre-existing errors, if any, are out of scope for this task).

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/theme.ts lib/utils.ts lib/use-is-mobile.ts lib/supabase/todos.ts
git commit -m "feat: add domain types, theme tokens, utils, and todos data layer"
```

---

## Task 5: Global styles + root layout (fonts, keyframes, canvas background)

**Files:**
- Create: `app/globals.css`
- Create: `app/layout.tsx`

**Interfaces:**
- Produces: the `fadeIn`, `scaleIn`, `slideUp`, `toastIn`, `drawerIn`, `popCheck`, `tagPulse` CSS keyframes (used by inline `animation` styles in Tasks 8, 11–14) and the Plus Jakarta Sans / IBM Plex Mono font CSS variables `--font-sans` / `--font-mono` (used as the base `font-family` in every component).

- [ ] **Step 1: `app/globals.css` — exact keyframes and base rules from the source `.dc.html`**

```css
/* app/globals.css */
@import "tailwindcss";

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #faf9f6;
  color: #22201c;
}

body {
  font-family: var(--font-sans), system-ui, sans-serif;
}

input,
textarea,
select,
button {
  font-family: var(--font-sans), system-ui, sans-serif;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes drawerIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes popCheck {
  0% {
    transform: scale(0.5);
  }
  55% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes tagPulse {
  0% {
    transform: scale(1.08);
  }
  60% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
  }
}
```

- [ ] **Step 2: Root layout with fonts loaded via `next/font/google`**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Loop — Task management, refined",
  description: "Plan your day. Track what matters. Finish what you start.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} ${ibmPlexMono.variable}`}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, visit `http://localhost:3000`. Expected: page renders (still just the default Next.js 404/blank until Task 9's `app/page.tsx` lands), background is `#faf9f6`, no console errors about missing fonts.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add global styles, keyframes, and font loading"
```

---

## Task 6: UI primitives (button, input, textarea, dialog, dropdown-menu)

**Files:**
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/textarea.tsx`
- Create: `components/ui/dialog.tsx`
- Create: `components/ui/dropdown-menu.tsx`

**Interfaces:**
- Produces: `Button`, `Input`, `Textarea` (unstyled-by-default passthroughs — every caller supplies exact inline `style` from the design, so these never fight visual fidelity). `Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogClose` (Radix wrapper — used by Task 14's `TaskModal` and `DeleteDialog`; Radix's built-in Escape-to-close and outside-click-to-close replace the mock's manual `handleKeyDown` modal-closing logic). `DropdownMenu, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem` (Radix wrapper — used by Task 12's `SortMenu`; replaces the mock's manual `sortMenuOpen`/`toggleSortMenu`/`closeSortMenu` state with Radix's native open/close + outside-click handling).

- [ ] **Step 1: Button — thin passthrough, no default visual theme**

```tsx
// components/ui/button.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(className)} {...props} />
  )
);
Button.displayName = "Button";
```

- [ ] **Step 2: Input**

```tsx
// components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(className)} {...props} />
);
Input.displayName = "Input";
```

- [ ] **Step 3: Textarea**

```tsx
// components/ui/textarea.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(className)} {...props} />
);
Textarea.displayName = "Textarea";
```

- [ ] **Step 4: Dialog (Radix wrapper — behavior only, no imposed visual style)**

```tsx
// components/ui/dialog.tsx
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>((props, ref) => <DialogPrimitive.Overlay ref={ref} {...props} />);
DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>((props, ref) => <DialogPrimitive.Content ref={ref} {...props} />);
DialogContent.displayName = "DialogContent";
```

- [ ] **Step 5: DropdownMenu (Radix wrapper)**

```tsx
// components/ui/dropdown-menu.tsx
"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Content ref={ref} sideOffset={sideOffset} {...props} />
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>((props, ref) => <DropdownMenuPrimitive.Item ref={ref} {...props} />);
DropdownMenuItem.displayName = "DropdownMenuItem";
```

- [ ] **Step 6: Manual verification**

Run `npx tsc --noEmit`. Expected: no errors in `components/ui/*`.

- [ ] **Step 7: Commit**

```bash
git add components/ui
git commit -m "feat: add unstyled UI primitives (button, input, textarea, dialog, dropdown-menu)"
```

---

## Task 7: Auth server actions

**Files:**
- Create: `lib/actions/auth.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 3).
- Produces: `signInAction`, `signUpAction`, `signOutAction`, `AuthActionState` — consumed by `LoginForm`/`SignupForm` (Task 8) and `auth-context.tsx` (Task 8).

- [ ] **Step 1: Write the actions (validation rules copied verbatim from the mock's `submitLogin`/`submitSignup`)**

```ts
// lib/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error: string;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (!password) return { error: "Enter your password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!name) return { error: "Enter your name." };
  if (!email || !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { error: error.message };
  if (!data.session) {
    return { error: "Check your inbox to confirm your account, then log in." };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 2: Manual verification**

Run `npx tsc --noEmit`. Expected: no errors in `lib/actions/auth.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/auth.ts
git commit -m "feat: add sign-in/sign-up/sign-out server actions"
```

---

## Task 8: Auth context, AuthShell, LoginForm, SignupForm, login/signup pages

**Files:**
- Create: `lib/auth-context.tsx`
- Create: `components/auth/AuthShell.tsx`
- Create: `components/auth/LoginForm.tsx`
- Create: `components/auth/SignupForm.tsx`
- Create: `app/login/page.tsx`
- Create: `app/signup/page.tsx`

**Interfaces:**
- Consumes: `signInAction`, `signUpAction`, `signOutAction`, `AuthActionState` (Task 7); `createClient()` browser client (Task 3); `ACCENT` (Task 4).
- Produces: `AuthProvider`, `useAuth()` returning `{ user: { name, email }, logout }` — consumed by `DashboardShell`/`Sidebar` (Task 11) and `app/dashboard/page.tsx` (Task 15).

- [ ] **Step 1: Auth context (client-side session sync + logout)**

```tsx
// lib/auth-context.tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOutAction } from "@/lib/actions/auth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ initialUser, children }: { initialUser: AuthUser; children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(initialUser);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: (session.user.user_metadata?.name as string) || session.user.email!.split("@")[0],
          email: session.user.email!,
        });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await signOutAction();
  };

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: AuthShell — the split-screen layout, identical for login and signup**

```tsx
// components/auth/AuthShell.tsx
import type { ReactNode } from "react";
import { ACCENT } from "@/lib/theme";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#faf9f6", color: "#22201c", position: "relative", overflowX: "hidden" }}>
      <div style={{ display: "flex", minHeight: "100vh", flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 420px",
            maxWidth: 560,
            background: ACCENT,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            color: "#ffffff",
            overflow: "hidden",
            minHeight: 320,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(rgba(255,255,255,0.16) 1.5px, transparent 1.5px)",
              backgroundSize: "22px 22px",
              opacity: 0.6,
            }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", border: "2.5px solid #ffffff", position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", width: 15, height: 15, borderRadius: "50%", background: ACCENT, border: "2.5px solid #ffffff", top: 8, left: 8 }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>Loop</span>
          </div>
          <div style={{ position: "relative", maxWidth: 420 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.8, marginBottom: 14 }}>
              Task management, refined
            </div>
            <div style={{ fontSize: 34, lineHeight: 1.28, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Plan your day. Track what matters. Finish what you start.
            </div>
          </div>
          <div style={{ position: "relative", fontFamily: "var(--font-mono)", fontSize: 12, opacity: 0.7 }}>© 2026 Loop</div>
        </div>
        <div style={{ flex: "1 1 420px", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
          <div style={{ width: "100%", maxWidth: 380 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: LoginForm**

```tsx
// components/auth/LoginForm.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthActionState } from "@/lib/actions/auth";
import { ACCENT } from "@/lib/theme";

const initialState: AuthActionState = { error: "" };

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1.5px solid #e4e0d8",
  fontSize: 14.5,
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <div style={{ animation: "slideUp 0.35s ease-out" }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>Welcome back</div>
      <div style={{ fontSize: 14, color: "#77716a", marginBottom: 32 }}>Log in to continue to your workspace.</div>
      <form action={formAction}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Email</label>
          <input name="email" type="email" placeholder="you@company.com" style={fieldStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Password</label>
          <input name="password" type="password" placeholder="••••••••" style={fieldStyle} />
        </div>
        {state.error && <div style={{ fontSize: 13, color: "#c0392b", margin: "10px 0 4px" }}>{state.error}</div>}
        <button
          type="submit"
          disabled={pending}
          style={{
            width: "100%",
            marginTop: 18,
            padding: 12,
            borderRadius: 8,
            border: "none",
            background: ACCENT,
            color: "#ffffff",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          Log in
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: 22, fontSize: 13.5, color: "#77716a" }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" style={{ color: ACCENT, fontWeight: 600, cursor: "pointer" }}>
          Sign up
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: SignupForm**

```tsx
// components/auth/SignupForm.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthActionState } from "@/lib/actions/auth";
import { ACCENT } from "@/lib/theme";

const initialState: AuthActionState = { error: "" };

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1.5px solid #e4e0d8",
  fontSize: 14.5,
};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <div style={{ animation: "slideUp 0.35s ease-out" }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>Create your account</div>
      <div style={{ fontSize: 14, color: "#77716a", marginBottom: 28 }}>Start organizing your work in minutes.</div>
      <form action={formAction}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Name</label>
          <input name="name" type="text" placeholder="Ada Lovelace" style={fieldStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Email</label>
          <input name="email" type="email" placeholder="you@company.com" style={fieldStyle} />
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Password</label>
            <input name="password" type="password" placeholder="6+ characters" style={fieldStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a453e", marginBottom: 6 }}>Confirm</label>
            <input name="confirm" type="password" placeholder="Repeat it" style={fieldStyle} />
          </div>
        </div>
        {state.error && <div style={{ fontSize: 13, color: "#c0392b", margin: "10px 0 4px" }}>{state.error}</div>}
        <button
          type="submit"
          disabled={pending}
          style={{
            width: "100%",
            marginTop: 18,
            padding: 12,
            borderRadius: 8,
            border: "none",
            background: ACCENT,
            color: "#ffffff",
            fontSize: 14.5,
            fontWeight: 600,
            cursor: "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          Create account
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: 22, fontSize: 13.5, color: "#77716a" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: ACCENT, fontWeight: 600, cursor: "pointer" }}>
          Log in
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Pages**

```tsx
// app/login/page.tsx
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
```

```tsx
// app/signup/page.tsx
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
```

- [ ] **Step 6: Manual verification**

Run `npm run dev`, visit `/signup`, create an account with a valid email + 6-char password. Expected: redirected to `/dashboard` (which 404s until Task 15 — that's fine, confirms the action + redirect worked). Then visit `/login` in an incognito window with the same credentials. Expected: also redirects to `/dashboard`. Try submitting the login form with no password — expected inline error "Enter your password." with no page crash.

- [ ] **Step 7: Commit**

```bash
git add lib/auth-context.tsx components/auth app/login app/signup
git commit -m "feat: add auth context, login/signup forms, and auth pages"
```

---

## Task 9: Root page redirect

**Files:**
- Create: `app/page.tsx`

**Interfaces:**
- Consumes: `createClient()` server client (Task 3).

- [ ] **Step 1: Redirect based on session**

```tsx
// app/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
```

- [ ] **Step 2: Manual verification**

Visit `http://localhost:3000/` logged out → redirects to `/login`. Log in, then visit `/` again → redirects to `/dashboard` (404 until Task 15, which is expected at this point).

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add root page session-based redirect"
```

---

## Task 10: `todo-context.tsx` — core state and actions

**Files:**
- Create: `lib/todo-context.tsx`

**Interfaces:**
- Consumes: `useAuth()` for `user.id` (Task 8); `fetchTodos`, `insertTodo`, `updateTodoRow`, `deleteTodoRow`, `maxSortOrder` (Task 4); `filterTasks`, `sortTasks`, `computeCounts`, `validateTitle`, `todayISO` (Task 4); `createClient()` browser client (Task 3).
- Produces: `TodoProvider`, `useTodos()` returning the full state + action surface below — every component in Tasks 11–14 (`Sidebar`, `StatsBar`, `FilterBar`, `SortMenu`, `TaskList`, `TaskCard`, `Pagination`, `Fab`, `Toast`, `TaskModal`, `DeleteDialog`) consumes this hook exclusively; none of them talk to Supabase directly.
  - State: `todos, loading, view, search, priorityFilter, tagFilter, sortBy, page, modalOpen, modalMode, draft, newSubtaskText, newTagText, expandedIds, deleteConfirmId, mobileNavOpen, toast, dragId, dragOverId, dragOverTagName, tagDropPulse`
  - Derived: `pageItems: Todo[], totalPages: number, counts: {total,completed,today,upcoming}, allTags: {name,count}[]`
  - Actions: `setView, setSearch, setPriorityFilter, setTagFilter, setSortBy, clearFilters, goToPage, prevPage, nextPage, openMobileNav, closeMobileNav, toggleExpand, toggleComplete(id), toggleSubtask(taskId, subId), askDelete(id), cancelDelete, confirmDelete, openAdd, openEdit(task), closeModal, deleteFromModal, setDraftField(field, value), toggleDraftTag(tag), addCustomTag, addSubtask, removeSubtask(id), toggleDraftSubtask(id), saveDraft(e), dropTaskOnTag(tagName), onDragStart(id), onDragOverTask(id), onDropTask, onDragEnd, onDragOverTag(tagName), onDragLeaveTag, onDropTag(tagName), showToast(message, type)`

- [ ] **Step 1: Write the full context**

```tsx
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
      let nextSubtasks: Subtask[] = [];
      setTodos((cur) =>
        cur.map((t) => {
          if (t.id !== taskId) return t;
          nextSubtasks = t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
          return { ...t, subtasks: nextSubtasks };
        })
      );
      void updateTodoRow(supabase, taskId, { subtasks: nextSubtasks });
    },
    [supabase]
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
          const nextOrder = (await maxSortOrder(supabase, user.id)) + 1;
          const created = await insertTodo(supabase, user.id, { ...draft, order: nextOrder });
          setTodos((cur) => [created, ...cur]);
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
```

- [ ] **Step 2: Manual verification**

Run `npx tsc --noEmit`. Expected: no errors in `lib/todo-context.tsx` (this file has no UI yet — full behavioral verification happens once Tasks 11–15 wire it to visible components).

- [ ] **Step 3: Commit**

```bash
git add lib/todo-context.tsx
git commit -m "feat: add TodoProvider with full CRUD/filter/sort/drag/tag state"
```

---

## Task 11: DashboardShell, Sidebar (+ MobileDrawer), MobileTopBar

**Files:**
- Modify: `lib/theme.ts` (add `VIEW_TITLES`)
- Create: `components/todo/Sidebar.tsx`
- Create: `components/todo/MobileTopBar.tsx`
- Create: `components/todo/DashboardShell.tsx`

**Interfaces:**
- Consumes: `useTodos()` (Task 10), `useAuth()` (Task 8), `useIsMobile()` (Task 4), `tagStyle`, `ACCENT` (Task 4).
- Produces: `Sidebar`, `MobileDrawer` (both exported from `Sidebar.tsx` since they share the nav-list/tag-list markup — a file-list deviation made for DRY, not a visual one), `MobileTopBar`, `DashboardShell` — `DashboardShell` is the single top-level component `app/dashboard/page.tsx` (Task 15) renders.

- [ ] **Step 1: Add `VIEW_TITLES` to `lib/theme.ts`**

Append to the file:

```ts
export const VIEW_TITLES: Record<string, string> = {
  all: "All Tasks",
  today: "Today",
  upcoming: "Upcoming",
  completed: "Completed",
};
```

- [ ] **Step 2: `components/todo/Sidebar.tsx`**

```tsx
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
```

- [ ] **Step 3: `components/todo/MobileTopBar.tsx`**

```tsx
// components/todo/MobileTopBar.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { VIEW_TITLES } from "@/lib/theme";

export function MobileTopBar() {
  const { view, openMobileNav } = useTodos();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderBottom: "1px solid #ece8e0",
        position: "sticky",
        top: 0,
        background: "#faf9f6",
        zIndex: 20,
      }}
    >
      <div
        onClick={openMobileNav}
        style={{
          cursor: "pointer",
          width: 36,
          height: 36,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #e4e0d8",
          flexShrink: 0,
        }}
      >
        <svg width="16" height="12" viewBox="0 0 16 12">
          <rect width="16" height="2" fill="#4a453e" />
          <rect y="5" width="16" height="2" fill="#4a453e" />
          <rect y="10" width="16" height="2" fill="#4a453e" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{VIEW_TITLES[view] || "All Tasks"}</div>
    </div>
  );
}
```

- [ ] **Step 4: `components/todo/DashboardShell.tsx`**

```tsx
// components/todo/DashboardShell.tsx
"use client";

import { useIsMobile } from "@/lib/use-is-mobile";
import { useTodos } from "@/lib/todo-context";
import { Sidebar, MobileDrawer } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { StatsBar } from "./StatsBar";
import { FilterBar } from "./FilterBar";
import { TaskList } from "./TaskList";
import { Pagination } from "./Pagination";
import { Fab } from "./Fab";
import { TaskModal } from "./TaskModal";
import { DeleteDialog } from "./DeleteDialog";
import { Toast } from "./Toast";
import { ACCENT, VIEW_TITLES } from "@/lib/theme";

export function DashboardShell() {
  const isMobile = useIsMobile();
  const { view, mobileNavOpen, sortBy, openAdd } = useTodos();
  const viewTitle = VIEW_TITLES[view] || "All Tasks";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {!isMobile && <Sidebar />}
      {isMobile && mobileNavOpen && <MobileDrawer />}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {isMobile && <MobileTopBar />}

        <div
          style={{
            flex: 1,
            padding: isMobile ? "20px 16px 110px" : "36px 40px 48px",
            maxWidth: 920,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {!isMobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{viewTitle}</div>
              <div
                onClick={openAdd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 18px",
                  borderRadius: 9,
                  background: ACCENT,
                  color: "#ffffff",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <rect x="5" width="2" height="12" fill="#ffffff" />
                  <rect y="5" width="12" height="2" fill="#ffffff" />
                </svg>
                New Task
              </div>
            </div>
          )}

          <StatsBar />
          <FilterBar />
          {sortBy === "manual" && (
            <div style={{ fontSize: 12, color: "#9a9488", marginBottom: 14 }}>Drag the handles to reorder tasks.</div>
          )}

          <div style={{ marginTop: 14 }}>
            <TaskList />
          </div>

          <Pagination />
        </div>

        {isMobile && <Fab />}
      </div>

      <TaskModal />
      <DeleteDialog />
      <Toast />
    </div>
  );
}
```

- [ ] **Step 5: Manual verification**

Run `npx tsc --noEmit` — expect errors only about the not-yet-created `StatsBar`, `FilterBar`, `TaskList`, `Pagination`, `Fab`, `TaskModal`, `DeleteDialog`, `Toast` modules (created in Tasks 12–14); no errors in `Sidebar.tsx`, `MobileTopBar.tsx`, or the parts of `DashboardShell.tsx` unrelated to those imports.

- [ ] **Step 6: Commit**

```bash
git add lib/theme.ts components/todo/Sidebar.tsx components/todo/MobileTopBar.tsx components/todo/DashboardShell.tsx
git commit -m "feat: add dashboard shell, sidebar, and mobile top bar"
```

---

## Task 12: StatsBar, FilterBar, SortMenu

**Files:**
- Create: `components/todo/StatsBar.tsx`
- Create: `components/todo/FilterBar.tsx`
- Create: `components/todo/SortMenu.tsx`

**Interfaces:**
- Consumes: `useTodos()` (Task 10); `DropdownMenu*` primitives (Task 6); `ACCENT`, `SORT_OPTIONS` (Task 4).
- Produces: `StatsBar`, `FilterBar`, `SortMenu` — consumed by `DashboardShell` (Task 11, `FilterBar` renders `SortMenu` internally).

- [ ] **Step 1: `components/todo/StatsBar.tsx`**

```tsx
// components/todo/StatsBar.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function StatsBar() {
  const { counts } = useTodos();
  const percent = counts.total ? Math.round((counts.completed / counts.total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0 22px" }}>
      <div style={{ fontSize: 12.5, color: "#77716a", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
        {counts.completed}/{counts.total} done
      </div>
      <div style={{ flex: 1, height: 5, background: "#ece8e0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, background: ACCENT, borderRadius: 3, transition: "width .3s ease" }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `components/todo/FilterBar.tsx`**

```tsx
// components/todo/FilterBar.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { SortMenu } from "./SortMenu";
import type { PriorityFilter } from "@/lib/types";

const PRIORITY_OPTIONS: { key: PriorityFilter; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#22201c" },
  { key: "low", label: "Low", color: "#3b82c4" },
  { key: "medium", label: "Medium", color: "#c07d1f" },
  { key: "high", label: "High", color: "#dc4b34" },
];

export function FilterBar() {
  const { search, setSearch, priorityFilter, setPriorityFilter } = useTodos();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
      <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        >
          <circle cx="6" cy="6" r="5" stroke="#9a9488" strokeWidth="1.3" fill="none" />
          <path d="M9.5 9.5L13 13" stroke="#9a9488" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1.5px solid #e4e0d8", fontSize: 13.5 }}
        />
      </div>
      <div style={{ display: "flex", background: "#f0ede6", borderRadius: 8, padding: 3, gap: 2 }}>
        {PRIORITY_OPTIONS.map((po) => {
          const active = priorityFilter === po.key;
          return (
            <div
              key={po.key}
              onClick={() => setPriorityFilter(po.key)}
              style={{
                padding: "7px 12px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                background: active ? "#ffffff" : "transparent",
                color: active ? po.color : "#8a8478",
                boxShadow: active ? "0 1px 3px rgba(20,18,14,0.10)" : "none",
                transition: "all .12s ease",
                whiteSpace: "nowrap",
              }}
            >
              {po.label}
            </div>
          );
        })}
      </div>
      <SortMenu />
    </div>
  );
}
```

- [ ] **Step 3: `components/todo/SortMenu.tsx`**

```tsx
// components/todo/SortMenu.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useTodos } from "@/lib/todo-context";
import { ACCENT, SORT_OPTIONS } from "@/lib/theme";

export function SortMenu() {
  const { sortBy, setSortBy } = useTodos();
  const current = SORT_OPTIONS.find((o) => o.key === sortBy);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 12px",
            borderRadius: 8,
            border: "1.5px solid #e4e0d8",
            fontSize: 13,
            fontWeight: 500,
            background: "#ffffff",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="12" height="10" viewBox="0 0 12 10">
            <path d="M1 2H8M1 5H6M1 8H4" stroke="#8a8478" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span style={{ color: "#4a453e" }}>
            Sort: <span style={{ fontWeight: 600, color: "#22201c" }}>{current?.label ?? "Due date"}</span>
          </span>
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path d="M1 3L4.5 6.5L8 3" stroke="#8a8478" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          style={{
            zIndex: 30,
            background: "#ffffff",
            border: "1px solid #e7e3da",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(20,18,14,0.12)",
            padding: 6,
            minWidth: 168,
            animation: "scaleIn 0.14s ease-out",
          }}
        >
          {SORT_OPTIONS.map((so) => {
            const active = sortBy === so.key;
            return (
              <DropdownMenuItem
                key={so.key}
                onSelect={() => setSortBy(so.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? ACCENT : "#4a453e",
                  background: active ? ACCENT + "10" : "transparent",
                  outline: "none",
                }}
              >
                {so.label}
                {active && (
                  <svg width="10" height="8" viewBox="0 0 10 8">
                    <path d="M1 4L3.5 6.5L9 1" stroke={ACCENT} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Manual verification**

Run `npx tsc --noEmit` — expect no errors in these three files.

- [ ] **Step 5: Commit**

```bash
git add components/todo/StatsBar.tsx components/todo/FilterBar.tsx components/todo/SortMenu.tsx
git commit -m "feat: add stats bar, filter bar, and sort menu"
```

---

## Task 13: TaskList, TaskCard, EmptyState, Pagination, Fab

**Files:**
- Create: `components/todo/TaskCard.tsx`
- Create: `components/todo/EmptyState.tsx`
- Create: `components/todo/TaskList.tsx`
- Create: `components/todo/Pagination.tsx`
- Create: `components/todo/Fab.tsx`

**Interfaces:**
- Consumes: `useTodos()` (Task 10); `dueLabel`, `priorityMeta`, `tagStyle`, `todayISO` (Task 4); `ACCENT` (Task 4).
- Produces: `TaskCard`, `EmptyState`, `TaskList`, `Pagination`, `Fab` — `TaskList` and `Pagination` are consumed directly by `DashboardShell` (Task 11); `Fab` is consumed by `DashboardShell` in the mobile branch.

- [ ] **Step 1: `components/todo/TaskCard.tsx`**

```tsx
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
```

- [ ] **Step 2: `components/todo/EmptyState.tsx`**

```tsx
// components/todo/EmptyState.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function EmptyState({ variant }: { variant: "no-tasks" | "filtered" }) {
  const { openAdd, clearFilters } = useTodos();

  if (variant === "no-tasks") {
    return (
      <div style={{ textAlign: "center", padding: "64px 20px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2.5px dashed #d8d3c8", margin: "0 auto 18px" }} />
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>You&apos;re all caught up</div>
        <div style={{ fontSize: 13.5, color: "#9a9488", marginBottom: 20 }}>Add your first task to get started.</div>
        <div
          onClick={openAdd}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 9, background: ACCENT, color: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
        >
          + New Task
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "64px 20px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No matching tasks</div>
      <div style={{ fontSize: 13.5, color: "#9a9488", marginBottom: 20 }}>Try a different search or filter.</div>
      <div
        onClick={clearFilters}
        style={{ display: "inline-flex", padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e4e0d8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        Clear filters
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `components/todo/TaskList.tsx`**

```tsx
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
```

- [ ] **Step 4: `components/todo/Pagination.tsx`**

```tsx
// components/todo/Pagination.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function Pagination() {
  const { totalPages, page, goToPage, prevPage, nextPage } = useTodos();
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 26 }}>
      <div
        onClick={prevPage}
        style={{ width: 32, height: 32, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: page <= 1 ? 0.35 : 1, border: "1.5px solid #e4e0d8" }}
      >
        <svg width="7" height="11" viewBox="0 0 7 11">
          <path d="M6 1L1.5 5.5L6 10" stroke="#4a453e" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          onClick={() => goToPage(n)}
          style={{
            minWidth: 32,
            height: 32,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            background: n === page ? ACCENT : "transparent",
            color: n === page ? "#ffffff" : "#4a453e",
            padding: "0 4px",
          }}
        >
          {n}
        </div>
      ))}
      <div
        onClick={nextPage}
        style={{ width: 32, height: 32, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: page >= totalPages ? 0.35 : 1, border: "1.5px solid #e4e0d8" }}
      >
        <svg width="7" height="11" viewBox="0 0 7 11">
          <path d="M1 1L5.5 5.5L1 10" stroke="#4a453e" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `components/todo/Fab.tsx`**

```tsx
// components/todo/Fab.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function Fab() {
  const { openAdd } = useTodos();
  return (
    <div
      onClick={openAdd}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: ACCENT,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
        cursor: "pointer",
        zIndex: 15,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22">
        <rect x="10" y="3" width="2" height="16" fill="#ffffff" />
        <rect x="3" y="10" width="16" height="2" fill="#ffffff" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 6: Manual verification**

Run `npx tsc --noEmit` — expect no errors in these five files (errors about `TaskModal`, `DeleteDialog`, `Toast` not existing yet are expected until Task 14).

- [ ] **Step 7: Commit**

```bash
git add components/todo/TaskCard.tsx components/todo/EmptyState.tsx components/todo/TaskList.tsx components/todo/Pagination.tsx components/todo/Fab.tsx
git commit -m "feat: add task list, task card, empty states, pagination, and mobile FAB"
```

---

## Task 14: TaskModal, DeleteDialog, Toast

**Files:**
- Create: `components/todo/TaskModal.tsx`
- Create: `components/todo/DeleteDialog.tsx`
- Create: `components/todo/Toast.tsx`

**Interfaces:**
- Consumes: `useTodos()` (Task 10); `Dialog, DialogPortal, DialogOverlay, DialogContent` (Task 6); `tagStyle` (Task 4); `ACCENT`, `PRESET_TAGS` (Task 4). Radix `Dialog`'s built-in Escape/outside-click handling replaces the mock's manual `handleKeyDown` modal-closing effect.
- Produces: `TaskModal`, `DeleteDialog`, `Toast` — consumed by `DashboardShell` (Task 11).

- [ ] **Step 1: `components/todo/TaskModal.tsx`**

```tsx
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
```

- [ ] **Step 2: `components/todo/DeleteDialog.tsx`**

```tsx
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
```

- [ ] **Step 3: `components/todo/Toast.tsx`**

```tsx
// components/todo/Toast.tsx
"use client";

import { useTodos } from "@/lib/todo-context";
import { ACCENT } from "@/lib/theme";

export function Toast() {
  const { toast } = useTodos();
  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 70,
        background: "#22201c",
        color: "#ffffff",
        padding: "13px 18px",
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "toastIn 0.25s ease-out",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: toast.type === "danger" ? "#e57373" : ACCENT, flexShrink: 0 }} />
      {toast.message}
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

Run `npx tsc --noEmit` — expect no errors in these three files.

- [ ] **Step 5: Commit**

```bash
git add components/todo/TaskModal.tsx components/todo/DeleteDialog.tsx components/todo/Toast.tsx
git commit -m "feat: add task modal, delete confirmation dialog, and toast"
```

---

## Task 15: Dashboard page assembly

**Files:**
- Create: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createClient()` server client (Task 3); `AuthProvider` (Task 8); `TodoProvider` (Task 10); `DashboardShell` (Task 11).

- [ ] **Step 1: Wire the server-fetched user into the client provider tree**

```tsx
// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/lib/auth-context";
import { TodoProvider } from "@/lib/todo-context";
import { DashboardShell } from "@/components/todo/DashboardShell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const authUser = {
    id: user.id,
    name: (user.user_metadata?.name as string) || user.email!.split("@")[0],
    email: user.email!,
  };

  return (
    <AuthProvider initialUser={authUser}>
      <TodoProvider>
        <DashboardShell />
      </TodoProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`, log in, land on `/dashboard`. Expected: sidebar with "All Tasks / Today / Upcoming / Completed" (all counts 0), empty state "You're all caught up", working "New Task" button that opens the modal. Create a task with a title, a due date of today, priority "High", and one subtask. Expected: task appears in the list, "Today" nav count becomes 1, stats bar shows "0/1 done". Toggle it complete — checkbox fills in with the pop-check animation, title gets a strikethrough. Edit it, change priority to "Low" — chip color updates. Delete it via the trash icon — confirmation dialog appears, confirming removes it and shows a "Task deleted" toast. Resize the browser below 880px width — layout switches to the mobile top bar + FAB; tapping the hamburger opens the drawer.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: assemble dashboard page with auth and todo providers"
```

---

## Task 16: Docker (Dockerfile, docker-compose, standalone output)

**Files:**
- Modify: `next.config.mjs` (add `output: "standalone"`)
- Create: `public/.gitkeep` (Next.js standalone output copies `public/`; Docker's `COPY` fails on a missing directory, so the folder must exist even if empty)
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Interfaces:**
- Produces: a container image runnable via `docker compose up` for local parity with the Vercel deployment target.

- [ ] **Step 1: Enable standalone output**

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Ensure `public/` exists**

Create an empty file `public/.gitkeep` (content: empty).

- [ ] **Step 3: Multi-stage `Dockerfile`**

```dockerfile
# Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: `docker-compose.yml`**

```yaml
# docker-compose.yml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
```

- [ ] **Step 5: `.dockerignore`**

```
node_modules
.next
.git
.env
.env.local
npm-debug.log*
Dockerfile
docker-compose.yml
```

- [ ] **Step 6: Manual verification**

Run `docker compose up --build` (with `.env.local`'s values exported in the shell, or a `.env` file next to `docker-compose.yml` containing the same two `NEXT_PUBLIC_*` keys — `docker compose` reads `.env` automatically). Expected: image builds, container starts, `http://localhost:3000` serves the login page identically to `npm run dev`.

- [ ] **Step 7: Commit**

```bash
git add next.config.mjs public/.gitkeep Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: add Docker build for local parity with Vercel deployment"
```

---

## Task 17: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

```markdown
# Loop — Todo List App

A pixel-faithful Next.js/React port of the "Loop" task manager design, backed by Supabase (Postgres + Auth with row-level security).

## Stack

- Next.js 15 (React 19, App Router)
- Tailwind CSS v4 (layout utilities only — visual fidelity comes from inline styles matching the source design)
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`) for Auth and Postgres
- Radix UI primitives (`Dialog`, `DropdownMenu`) for accessible modal/menu behavior

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (or use an existing one).
2. **Run the schema**: open the SQL editor in your Supabase project and run `supabase/schema.sql`. This creates the `todos` table and its row-level security policies.
3. **Disable email confirmation** (Authentication → Providers → Email → turn off "Confirm email"). This makes sign-up log the user in immediately, matching the app's design (there is no "check your email" screen in the mock).
4. **Copy environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project's Settings → API page.
5. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Environment variables

| Variable | Where to find it | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Public, safe in client code |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Public, RLS is the real security boundary |

No service-role key is used anywhere in this app — all data access goes through the anon key and is enforced by Postgres row-level security.

## Docker (local parity)

```bash
docker compose up --build
```

Requires a `.env` file (or exported shell variables) with the same two `NEXT_PUBLIC_*` values as `.env.local`.

## Deploying to Vercel

1. Push this repository to GitHub (already done if you're reading this from the repo).
2. In the Vercel dashboard, import the repository.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as Environment Variables (Production + Preview).
4. Deploy. Vercel builds with `next build` automatically; no extra configuration is required.

## Design fidelity

The UI is a 1:1 port of `Loop Todo App.dc.html` — colors, spacing, font sizes, and animations are copied verbatim as inline styles rather than reinterpreted through Tailwind/shadcn defaults. Two intentional behavior changes from the original mock (which stored everything in `localStorage`):

- Auth and task data are now backed by Supabase instead of `localStorage`, with per-user isolation enforced by RLS.
- Modal/dialog Escape-to-close and outside-click-to-close are handled by Radix UI primitives instead of a manual `keydown` listener — same user-visible behavior, less code.

## Manual verification

There is no automated test suite in this project (by design — see the implementation plan). Before considering a change complete, manually verify in the browser:

- Sign up, log in, log out
- Add / edit / delete a task
- Toggle complete/incomplete on a task and a subtask
- Search and filter by status/priority/tag
- Confirm a second account cannot see the first account's tasks (see the plan's Task 18 for the exact steps)
```

- [ ] **Step 2: Manual verification**

Follow the README's Setup steps literally on a clean checkout (or mentally trace them) — confirm every command and file path mentioned actually exists at this point in the plan.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, env vars, Docker, and deploy instructions"
```

---

## Task 18: Manual end-to-end verification (RLS + full flow)

**Files:** none (verification only)

- [ ] **Step 1: Two-account RLS check**

1. Sign up as `user-a@example.com`, create 2–3 tasks with distinct titles.
2. Log out. Sign up as `user-b@example.com`.
3. Expected: User B's dashboard shows the empty state ("You're all caught up") — **zero** of User A's tasks are visible.
4. In the Supabase dashboard's Table Editor, open `todos` — confirm rows exist for both users with different `user_id` values, proving isolation is real (not just hidden client-side).
5. As an extra RLS check: in the Supabase SQL editor, run `select * from todos;` as the `postgres` role (bypasses RLS by default for the dashboard's SQL editor — this is expected and fine, it does not indicate a security bug) versus confirming via the app itself that each logged-in user's `/dashboard` never renders the other's rows.

- [ ] **Step 2: Full flow checklist**

Run through each and confirm the expected behavior:

- [ ] Sign up with an invalid email → inline error "Enter a valid email address."
- [ ] Sign up with a 5-character password → inline error "Password must be at least 6 characters."
- [ ] Sign up with mismatched confirm password → inline error "Passwords do not match."
- [ ] Log in with a wrong password → inline error from Supabase (e.g. "Invalid login credentials")
- [ ] Add a task with only whitespace in the title → toast "Give the task a title", modal stays open
- [ ] Add a task with a 250-character title → rejected (DB check constraint fires; confirm the app surfaces a toast rather than a raw 500 — if it doesn't, add a client-side `validateTitle` check on submit before calling `insertTodo`, since Task 4 already exports this helper but Task 10's `saveDraft` currently only checks emptiness — extend it to call `validateTitle` and show its returned message)
- [ ] Add a task with a due date of today, priority High, two tags, one subtask → appears correctly decorated in the list, "Today" nav count increments
- [ ] Toggle the task complete → strikethrough + checkbox fill animate, "Completed" nav count increments, stats bar percentage updates
- [ ] Expand/collapse subtasks, toggle a subtask done
- [ ] Edit the task, change priority and tags → list reflects changes immediately
- [ ] Search by a partial title match → list filters correctly; clear search → list restores
- [ ] Filter by priority segmented control → list filters; select "All" → restores
- [ ] Switch sort to "Manual", drag one task above another → order persists after a page reload
- [ ] Drag a task onto a sidebar tag chip → task's tags replace with that one tag, toast "Tagged as "X"", chip pulses
- [ ] Delete a task → confirmation dialog, confirm removes it and shows "Task deleted" toast
- [ ] Paginate when there are more than 6 tasks → page buttons work, prev/next disable at the edges
- [ ] Resize below 880px width → mobile top bar + FAB appear, sidebar disappears, hamburger opens the drawer, drawer closes on backdrop click or selecting a nav item
- [ ] Log out → redirected to `/login`; visiting `/dashboard` directly while logged out redirects to `/login`

- [ ] **Step 3: Fix any failures found**

If Step 2's title-length check surfaces a raw Postgres error instead of a friendly toast, patch `saveDraft` in `lib/todo-context.tsx` (Task 10) to call `validateTitle(draft.title)` (already exported from `lib/utils.ts`, Task 4) instead of only checking `!draft.title.trim()`, and show `showToast(titleError, "danger")` when it returns a message.

- [ ] **Step 4: Commit** (only if Step 3 required a fix)

```bash
git add lib/todo-context.tsx
git commit -m "fix: surface title-length validation before hitting the DB constraint"
```

---

## Task 19: Deploy to Vercel

**Files:** none (deployment only — requires the user's own Vercel account/login, so this is a manual, user-executed task, not something the agent runs autonomously)

- [ ] **Step 1: Push to GitHub** (if not already pushed — see the top-level commit/push step)

- [ ] **Step 2: Import into Vercel**

In the Vercel dashboard: "Add New… → Project" → select the `To-Do-app` GitHub repository → Vercel auto-detects Next.js, no build command changes needed.

- [ ] **Step 3: Add environment variables**

In the Vercel project's Settings → Environment Variables, add for **Production**, **Preview**, and **Development**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 4: Deploy and verify**

Click Deploy. Once live, visit the generated `*.vercel.app` URL and repeat a subset of Task 18's checklist (sign up, add a task, log out, log back in) against the production deployment.

- [ ] **Step 5: Record the live link**

Add the live Vercel URL to the top of `README.md` once known.

```bash
git add README.md
git commit -m "docs: add live Vercel deployment link"
git push
```

---

## Self-Review

**Spec coverage:**
- Design port (auth screens, sidebar, task list, modal, delete dialog, toast, pagination, mobile drawer/FAB) → Tasks 5, 8, 11–14.
- Supabase schema + RLS → Task 2.
- Supabase Auth (signup/login/logout, route protection) → Tasks 3, 7, 8, 9.
- Todo CRUD, toggle, search, filter, sort, tags, subtasks, drag-reorder → Task 10 (state/actions) + Tasks 11–14 (UI).
- Per-user isolation via RLS, verified with two accounts → Task 2 (policies) + Task 18 Step 1.
- Invalid input handling (empty/whitespace/over-length titles) → `validateTitle` in Task 4, wired in Task 10's `saveDraft`, explicitly re-checked in Task 18.
- README (setup, env vars, local run, deploy) → Task 17.
- Docker → Task 16.
- Vercel deployment → Task 19.
- No automated tests, manual verification instead → every task's final step, plus the dedicated Task 18 checklist.

**Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code or a fully specified manual action.

**Type consistency:** `Todo`, `TodoDraft`, `Subtask`, `ViewKey`, `SortKey`, `PriorityFilter`, `ToastState` (Task 4) are used with identical shapes across Tasks 10–15; `AuthUser` (Task 8, patched to include `id`) is consistent between `auth-context.tsx` and `app/dashboard/page.tsx` (Task 15); `TodoContextValue`'s action names match exactly what Tasks 11–14's components destructure from `useTodos()`.

