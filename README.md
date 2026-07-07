# Loop

A todo app built with Next.js and Supabase. The design is a direct port of an existing HTML/CSS mockup — same layout, same colors, same spacing, no reinterpretation.

Live: https://loop-todo-app.vercel.app

## Stack

- Next.js 15, React 19, App Router
- Tailwind CSS v4 for layout only — colors, spacing, and typography come from inline styles copied from the source design, not a Tailwind theme
- Supabase for auth and Postgres, using `@supabase/ssr` and `@supabase/supabase-js`
- Radix UI for the dialog and dropdown menu (handles focus and keyboard behavior so we didn't have to)

## Getting started

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run everything in `supabase/schema.sql`. This creates the `todos` table and its row-level security policies.
3. Go to Authentication → Providers → Email and turn off "Confirm email." Without this, signing up won't log the user in right away — Supabase will wait for them to click a confirmation link first, which the UI doesn't have a screen for.
4. Copy the env file and fill in your project's URL and anon key (Settings → API):
   ```bash
   cp .env.example .env.local
   ```
5. Install and run:
   ```bash
   npm install
   npm run dev
   ```

Then open `http://localhost:3000`.

## Environment variables

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |

Both are safe to expose to the browser. There's no service-role key anywhere in this project — every request goes through the anon key, and row-level security in Postgres decides what it can actually see or touch.

## Running with Docker

```bash
docker compose up --build
```

You'll need a `.env` file next to `docker-compose.yml` with the same two variables as `.env.local`.

## Deploying

The live version runs on Vercel, connected to this repo's `main` branch. To deploy your own:

1. Import the repo in the Vercel dashboard.
2. Add the two environment variables above under Production and Preview.
3. Deploy — Vercel picks up the Next.js build automatically, nothing else to configure.

## What's different from the original mockup

The mockup stored everything in `localStorage` and had no real backend. Two things changed to make it a real app:

- Auth and tasks are now backed by Supabase instead of `localStorage`. Row-level security means each user only ever sees their own tasks — this isn't just hidden in the UI, it's enforced by Postgres, and it was tested with two separate accounts to confirm one couldn't see the other's data.
- Closing a modal with Escape or a click outside is handled by Radix's `Dialog` component instead of a manual keydown listener. Same behavior, fewer moving parts.

Everything else — colors, spacing, font sizes, animations — is copied straight from the original design.

## Testing

There's no automated test suite. Everything was verified by hand: signup and login, creating/editing/deleting tasks, toggling completion, searching and filtering, drag-to-reorder, and the two-account isolation check mentioned above. If you're changing something, the safest bet is to run through those flows again in the browser before calling it done.
