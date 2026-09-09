# ئۇيغۇر تېبابىتى مائارىپ سۇپىسى (Uyghur Traditional Medicine Platform)

Vanilla-JS education app on Vercel (static frontend + Node serverless functions in `api/`),
backed by a database you can **choose at deploy time**: **MySQL** or **Supabase (Postgres)**.
The frontend never touches the database directly: all DB work flows through `/api/students`,
and the browser clients don't know (or care) which backend is running.

## Stack
- **Frontend**: `index.html`, `admin.html`, `supabase.js` (a thin API client), `data.js`
  (plus the Vue port in `vite/`)
- **Backend**: Node serverless functions in `api/`; `api/students.js` is a driver-agnostic
  dispatcher that delegates DB work to a driver chosen by the `DB_DRIVER` env var:
  - `api/lib/db-mysql.js` — MySQL (mysql2)
  - `api/lib/db-supabase.js` — Supabase PostgREST (server-side Service Role key)
- **DB**: remote MySQL (schema in `mysql_setup.sql`) **or** Supabase (schema in `supabase_setup.sql`)
- **Hosting**: Vercel (static + Node functions)

## Security model
- Clients hold **no DB credentials** and no API keys — `supabase.js` only proxies to `/api/students`.
- The Supabase **Service Role key is server-side only** (loaded from `SUPABASE_SERVICE_ROLE_KEY`),
  never shipped to the browser.
- Admin auth is **server-side**: login checks `ADMIN_PASSWORD`, returns an 8-hour HMAC-signed
  token stored in `sessionStorage`. Every privileged API action requires that token (both drivers).
- **Fail closed everywhere**: an explicit `DB_DRIVER` without its credentials errors at startup,
  a Supabase backend outage surfaces as a 500 (never an empty-but-successful admin list), and
  disallowed CORS origins get a 403.
- CORS is restricted to `ALLOWED_ORIGIN`; inputs are validated and rate-limited server-side.
- No hardcoded or default passwords (the previous reset-to-default password backdoors were removed).

## Setup

### 0. Choose your backend

One `DB_DRIVER` env var switches everything — the API code, the admin panel, and the Vue app
are identical either way:

| `DB_DRIVER` | Database | Schema file | Env vars |
|---|---|---|---|
| `mysql` (default) | remote MySQL | `mysql_setup.sql` | `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` |
| `supabase` | Supabase (Postgres) | `supabase_setup.sql` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

- **Explicit `DB_DRIVER=mysql` or `DB_DRIVER=supabase` fails closed**: if that driver's
  credentials are missing the API errors on startup instead of pretending to work.
- If `DB_DRIVER` is unset, the API auto-detects: it uses Supabase only when `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` are set **and** no `MYSQL_*` are configured; otherwise MySQL
  (and, with no credentials at all, it serves read-only/offline to make local prototyping easy).

Which one to pick? **Supabase** is the easiest to spin up from scratch (browser console, no
external host); **MySQL** is what this deployment historically ran on. Both store the same
schema, so live data can be moved either way (see §3).

> The `SUPABASE_ANON_KEY` in `.env` is a **legacy leftover**. It is only used as a last-resort
> fallback by `--from-supabase` when reading an **old** source project; the deployed API and
> `--to-supabase` use the Service Role key only.

### 1. Option A — MySQL backend

Create your remote MySQL database and tables, then (optionally) seed an admin row:

```bash
cp .env.example .env   # fill in MYSQL_* (non-empty password) + ADMIN_PASSWORD; DB_DRIVER=mysql

npm install            # installs mysql2
node migrate.js        # apply schema (mysql_setup.sql) — creates tables
node migrate.js --seed # also insert an admin row (hashed from ADMIN_PASSWORD)
```

### 2. Option B — Supabase backend

1. Create a Supabase project, then open **SQL Editor** and run `supabase_setup.sql`
   (creates `students`, `feedback`, `admins`, `lessons`, `exam_logs` + an RLS safety net).
2. Copy `SUPABASE_URL` and the **Service Role key** from Project Settings → API into
   `.env` / Vercel env vars:
   ```bash
   DB_DRIVER=supabase
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-side only — never ship this to the browser
   ```
3. Optional — bring existing MySQL data into Supabase:
   ```bash
   # .env has MYSQL_* (source) + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (target)
   npm run migrate:to-supabase        # students/feedback/exam_logs (students upsert by phone)
   ```

### 3. Moving data between backends

**MySQL → Supabase** (`npm run migrate:to-supabase`): students upsert by phone (safe to
re-run). **`feedback`/`exam_logs` are ONE-SHOT** — they get fresh UUIDs on the target and
re-running duplicates them; only re-run after truncating the target tables.

**Supabase → MySQL** (`node migrate.js --from-supabase`): reads the source with the
**Service Role key** first (it bypasses RLS so even a fresh `supabase_setup.sql` project can
be read; falls back to `SUPABASE_ANON_KEY` for old projects, warning if their RLS hides data):

```bash
# set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env first
node migrate.js --from-supabase
```

> Migration copies `students` and `feedback` today. `lessons`, `admins`, and `exam_logs` start
> empty in a fresh MySQL DB, and `feedback`/`exam_logs` get new IDs on the target side.
> Use `--drop` (dangerous) to reset MySQL tables first.

### 4. Vercel environment variables
Set these in the Vercel project (Settings → Environment Variables):

| Variable | Purpose |
|----------|---------|
| `DB_DRIVER` | `mysql` (default) or `supabase` — should match the DB you configured in §1/§2 |
| `MYSQL_HOST` | MySQL host (driver `mysql` only) |
| `MYSQL_PORT` | default `3306` (driver `mysql` only) |
| `MYSQL_USER` | MySQL app user (driver `mysql` only) |
| `MYSQL_PASSWORD` | MySQL app password, **non-empty** (driver `mysql` only) |
| `MYSQL_DATABASE` | database name, e.g. `uyghur_tibb` (driver `mysql` only) |
| `SUPABASE_URL` | e.g. `https://<ref>.supabase.co` (driver `supabase` only) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-side** only (driver `supabase` only) |
| `ADMIN_PASSWORD` | the admin login password (also signs tokens) — both drivers |
| `ALLOWED_ORIGIN` | your app origin, e.g. `https://uyghur-tibb.vercel.app` |

> An explicit `DB_DRIVER` with missing credentials makes the API **fail closed** (500s on
> startup) rather than silently reporting empties — the env var table above must match the
> chosen backend.

### 5. Verify the configured backend

**MySQL** — confirm the tables exist and the app user can use them:

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p "$MYSQL_DATABASE" \
  -e "SHOW TABLES; SELECT COUNT(*) FROM students; DESCRIBE students;"
```

**Supabase** — poke the tables with the Service Role key (bypasses RLS):

```bash
curl -s "https://<ref>.supabase.co/rest/v1/students?select=count" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

> If the MySQL migrator reported `You are not allowed to create a user with GRANT`, the `GRANT` at the
> bottom of `mysql_setup.sql` did not apply. That is fine as long as the `MYSQL_USER` already has
> `SELECT`/`INSERT`/`UPDATE`/`DELETE` on the database (e.g. it is the DB owner). Otherwise run the
> GRANT as a superuser, or ask your DB host admin to grant those privileges to the app user.

### 6. Local development
Run the app and the API locally against whichever backend `DB_DRIVER` selects in `.env`
(MySQL or Supabase — no Vercel needed):

```bash
npm run dev          # == node dev.js  (default port 8080)
# optional custom port:
PORT=3000 npm run dev
```

`dev.js` serves the static frontend (`index.html`, `admin.html`, …) **and** the `/api/students`
serverless function from the same origin, so everything works end-to-end on localhost. Set
`PORT` in `.env` or on the command line (default `8080`). `ALLOWED_ORIGIN` defaults to the
local origin when unset, so browser POSTs work locally too.

Then exercise the endpoints:

```bash
# scoped student status (public)
curl "http://localhost:8080/api/students?phone=13800138000"

# register (public)
curl -X POST http://localhost:8080/api/students -H "Content-Type: application/json" \
  -d '{"action":"register","user":{"name":"سىناق","phone":"13800138000","status":"pending"}}'

# login -> returns token (admin)
curl -X POST http://localhost:8080/api/students -H "Content-Type: application/json" \
  -d '{"action":"login","username":"admin","password":"<ADMIN_PASSWORD>"}'

# admin action with token (approve)
curl -X POST http://localhost:8080/api/students -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"update_status","phone":"13800138000","status":"approved"}'

# full student list (admin only)
curl http://localhost:8080/api/students -H "Authorization: Bearer <TOKEN>"
```

### 7. Deploy to Vercel

**Frontend root** — the repo can be deployed either as the vanilla app or the Vue app:

| App | Vercel Root Directory | Build command | Output |
|---|---|---|---|
| Vanilla (current `index.html`/`admin.html`) | repo root | *none* | committed files |
| Vue port (`vite/`) | `vite` | `npm run build` | `vite/dist` |

In both cases the API path stays `/api/students` (the `api/` directory is always picked up as
serverless functions — keep it **outside** the Vue root directory).

**Steps:**

1. Push the repository to GitHub and import it into Vercel (or use the Vercel CLI):
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod    # run from the root (or `vercel --prod <vite>` if deploying the Vue app)
   ```
2. In **Project → Settings → Environment Variables**, set exactly the block from §4 that
   matches your backend — e.g. for Supabase:
   `DB_DRIVER=supabase`, `SUPABASE_URL=...`, `SUPABASE_SERVICE_ROLE_KEY=...`,
   `ADMIN_PASSWORD=...` (and everything for MySQL instead if you picked `mysql`).
   Do this in the **Production** (and any Preview) environments.
3. Set **`ALLOWED_ORIGIN`** to the deployed URL, e.g. `https://uyghur-tibb.vercel.app`.
   Requests from any other origin are rejected with `403`; if it is left unset, cross-origin
   requests fail closed (`503`). Same-origin requests (an admin panel hosted on the same
   domain) always work.
4. Redeploy, then check the API responds (`curl https://<your-app>.vercel.app/api/students`,
   expect `401` without a token; `?phone=...` works publicly). Admin login uses `ADMIN_PASSWORD`.
5. Switching databases later is just a matter of changing `DB_DRIVER` + env vars and re-applying
   §3 to move the data — no code or frontend changes needed.

## Vue frontend (incremental port)

A Vue 3 + Vite + Pinia + vue-router port lives in `vite/`, being built tab-by-tab while the
vanilla `index.html` remains the deployed app during the transition.

Run it (needs the Node API running for `/api/*` — see §6, or leave out if you only
browse static data):

```bash
npm --prefix vite install     # once
npm run vite:dev              # Vite dev server on :5173, proxies /api -> :8080
npm run vite:build            # production build -> vite/dist
npm run vite:preview          # serve the build locally
```

Ported so far:
- App shell (appbar, tabbar, light/dark theme, toasts) + hash router
- Home, Lessons list, Lesson reader (sections, goals, mind map, PDF), lesson Quiz
- Books (PDF), Teachers, Exam (timed), Me (progress/wrong answers), AI assistant, Install
- Admin (`/admin`, auth-gated): login, dashboard stats, student approve/block/delete,
  feedback reply/dismiss, CSV export; server API is the source of truth, localStorage
  keys stay shared with the vanilla app
- Content-editing-heavy admin features (lesson/question/teacher editors, PDF upload,
  backup/restore, multi-admin) still live in the vanilla `admin.html` (linked from the
  Vue admin's "مەزمۇن" tab)
- Progress storage reuses the same `uytibb_v1` localStorage key as the vanilla app
- Content stays in the root `data.js` (single source of truth); `uytibb_custom_lessons` /
  `uytibb_custom_teachers` overrides are applied like in the vanilla learner app
- PWA: `vite/public/sw.js` + manifest are copied into the build; the service worker is
  registered from `src/main.js` on production/secure contexts

Not yet ported: content editor flows above (kept in vanilla `admin.html` for now).

## Admin login
- Open `admin.html`.
- Enter the `ADMIN_PASSWORD` value. A short-lived token is issued and stored in the session.

## Model: upstream collaboration
The upstream project (`github.com/avary/uyghur-tibb`) keeps evolving. When new features land
upstream, fetch and integrate them **in our hardened way**: keep diffs minimal and targeted in
the HTML files, and route any new data features through `/api/students` with server-side auth —
never add client-side DB/API keys or password bypasses.


