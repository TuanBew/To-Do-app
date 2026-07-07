# Test plan

Loop has two layers of testing: an automated unit suite for the pure logic
(filtering, sorting, validation, rate limiting), and a manual checklist for
everything that touches the browser or a live Supabase project — auth flows,
RLS isolation, drag-and-drop, and the Docker/Vercel deployments themselves.

There's no automated E2E suite. The app is small enough that a manual pass
before each release is cheap, and the parts most worth automating (query
logic, validation, rate limiting) already have unit coverage.

## Automated unit tests

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with a v8 coverage report
```

32 tests across two files, all pure functions with no I/O:

| File under test | What's covered |
|---|---|
| `lib/utils.ts` | `filterTasks` (view/search/priority/tag filters, combined), `sortTasks` (all five sort modes, non-mutation), `computeCounts`, `dueLabel` (today/tomorrow/yesterday/far-future), `validateTitle`, `validateTaskInput` (description/tags/subtasks size caps), `cn`, `todayISO` |
| `lib/rate-limit.ts` | Allows up to the limit, blocks past it, separate keys don't interfere, window expiry resets the count (via fake timers) |

`lib/supabase/todos.ts` and the auth Server Actions aren't unit tested directly — they're thin wrappers around Supabase network calls, and the validation logic they call (`validateTaskInput`) is already covered where it's defined. Exercising them for real is what the manual checklist below is for.

## Manual test checklist

Run through this after any change to auth, the todos data layer, or middleware — and always before a release.

### Auth

- [ ] Sign up with a new email + password ≥ 8 characters → redirected to `/dashboard`
- [ ] Sign up with a password under 8 characters → inline error, no request sent
- [ ] Sign up with mismatched confirm-password → inline error
- [ ] Sign up with an already-registered email → Supabase error surfaced inline
- [ ] Log in with correct credentials → redirected to `/dashboard`
- [ ] Log in with a wrong password → generic "Invalid login credentials" (no hint about which field was wrong)
- [ ] Submit the login form 10+ times in under a minute with the same email/IP → "Too many attempts" instead of hitting Supabase again
- [ ] Log out → redirected to `/login`, and `/dashboard` now redirects to `/login` if visited directly
- [ ] Visit `/login` or `/signup` while already authenticated → redirected to `/dashboard`

### Todos (as a logged-in user)

- [ ] Create a task with a title only → appears in the list
- [ ] Create a task with description, due date, tags, priority, and subtasks → all fields persist after a page refresh
- [ ] Try to save a task with an empty title → inline error, nothing sent
- [ ] Try to save a task with a description over 2000 characters → inline error, nothing sent
- [ ] Edit a task and change its priority/tags/subtasks → changes persist after refresh
- [ ] Toggle a task complete/incomplete → updates immediately and survives refresh
- [ ] Toggle a subtask → same
- [ ] Delete a task → removed from the list and from Supabase
- [ ] Drag a task onto a sidebar tag → task's tags update to that single tag
- [ ] Drag-reorder two tasks under the "Manual" sort → order persists after refresh
- [ ] Search, priority filter, and tag filter all narrow the list correctly, individually and combined
- [ ] Switch between Today / Upcoming / Completed / All views

### Row-level security (requires two test accounts)

- [ ] Log in as user A, create a task, note its id
- [ ] Log in as user B → user A's task is not visible anywhere in the UI
- [ ] Query `public.todos` directly with user B's session/anon key for user A's task id → zero rows returned (confirms RLS, not just UI filtering)

### Security headers

- [ ] `curl -I https://<deployment-url>/` → response includes `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`

### Docker

- [ ] `docker compose up --build` succeeds
- [ ] `/login` returns 200 inside the container
- [ ] `/` redirects to `/login` when logged out (307)

### Deployment

- [ ] Production Vercel URL loads and auth/todos work against the live Supabase project
- [ ] Preview/local `.env.local` never gets committed (`git status` clean after any env change)
