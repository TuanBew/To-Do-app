# Loop

[![CI](https://github.com/TuanBew/To-Do-app/actions/workflows/ci.yml/badge.svg)](https://github.com/TuanBew/To-Do-app/actions/workflows/ci.yml)

> A todo app with real auth and real data isolation, built as a Next.js/Supabase port of an existing HTML/CSS mockup.

Live: **https://loop-todo-app.vercel.app**

---

## Overview

Loop is a task manager — priorities, due dates, tags, subtasks, drag-to-reorder, search and filtering. The design is a direct port of a static HTML mockup: same layout, colors, and spacing, no reinterpretation. What changed underneath is everything that makes it a real multi-user app instead of a demo:

- **Supabase Auth** for sign-up/login/session handling
- **Postgres row-level security** so each user's tasks are enforced as private at the database level, not just hidden in the UI
- **Server Actions** for auth, with rate limiting and input validation on every write path

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router, React 19, TypeScript |
| Styling | Tailwind CSS v4 for layout; colors/spacing/typography come from inline styles copied from the source design, not a Tailwind theme |
| Auth & data | Supabase (Postgres + Auth) via `@supabase/ssr` |
| UI primitives | Radix UI (`Dialog`, `DropdownMenu`) for accessible focus/keyboard handling |
| Testing | Vitest (unit) |
| Deployment | Vercel (primary), Docker (self-hosted) |

---

## Security

Basic, standard-issue hardening rather than anything exotic:

| Area | What's in place |
|---|---|
| Data isolation | Postgres row-level security — every `todos` query is scoped to `auth.uid()` at the database layer. Verified with two separate test accounts, both through the UI and with a direct query against the table. |
| Auth | Supabase-issued JWTs in httpOnly cookies via `@supabase/ssr`; passwords require 8+ characters; login/signup are rate-limited (10 attempts/minute per IP+email) to slow down brute-forcing |
| Input validation | Task titles, descriptions, tags, and subtasks are length-capped both in the app and as Postgres `check` constraints, so a bypassed client can't push oversized payloads into the database |
| HTTP headers | CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, and a locked-down `Permissions-Policy` on every response |
| Secrets | No service-role key anywhere in the app — every request goes through the anon key, and RLS decides what it can actually touch |
| CSRF | Handled by Next.js Server Actions' built-in origin checks; no custom token needed |

Two things worth being upfront about: the CSP allows `'unsafe-inline'` for scripts and styles (a nonce-based policy would close that gap but adds real complexity for a small app), and the rate limiter is in-memory per server instance — on Vercel's serverless runtime that means it resets across instances, so it's a speed bump, not a hard limit. Supabase's own backend throttling is the actual backstop.

---

## Getting started

### 1. Create a Supabase project

Sign up at [supabase.com](https://supabase.com) and create a project.

### 2. Apply the schema

Open the SQL editor and run everything in [`supabase/schema.sql`](supabase/schema.sql). This creates the `todos` table, its indexes, the row-level security policies, and the size-limit check constraints.

### 3. Turn off email confirmation (for local dev)

Authentication → Providers → Email → disable "Confirm email." Without this, sign-up won't log the user in immediately — Supabase waits for an email click first, and there's no screen for that in this UI.

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the two values from Settings → API:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |

Both are safe to expose to the browser — there's no service-role key in this project.

### 5. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Testing

```bash
npm test              # unit tests (Vitest)
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

Unit tests cover the pure logic — task filtering/sorting, validation, rate limiting. Everything that needs a browser or a live database (auth flows, drag-and-drop, RLS isolation between two accounts) is a manual checklist instead. Both the test plan and the full manual checklist live in [`TESTING.md`](TESTING.md).

CI runs type-checking, the unit suite, and a production build on every push to `main`.

---

## Running with Docker

```bash
docker compose up --build
```

You'll need a `.env` file next to `docker-compose.yml` with the same two Supabase variables as `.env.local`.

---

## Deploying

The live version runs on Vercel, connected to this repo's `main` branch — every push redeploys automatically. To deploy your own copy:

1. Import the repo in the Vercel dashboard.
2. Add the two Supabase environment variables under Production and Preview.
3. Deploy. Vercel picks up the Next.js build with no extra configuration.

---

## What's different from the original mockup

The mockup stored everything in `localStorage` with no backend. Two things changed to make it a real app:

- Auth and tasks are now backed by Supabase instead of `localStorage`, with row-level security enforcing per-user isolation at the database layer.
- Closing a modal with Escape or a click outside is handled by Radix's `Dialog` component instead of a manual keydown listener.

Colors, spacing, font sizes, and animations are copied straight from the original design.

---

## License

Personal project — no license specified.
