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
