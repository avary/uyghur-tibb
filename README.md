# ئۇيغۇر تېبابىتى مائارىپ سۇپىسى (Uyghur Traditional Medicine Platform)

Vanilla-JS education app on Vercel (static frontend + Node serverless functions in `api/`),
backed by a remote **MySQL** database. The frontend never touches the database directly:
all DB work flows through `/api/students`.

## Stack
- **Frontend**: `index.html`, `admin.html`, `supabase.js` (a thin API client), `data.js`
- **Backend**: Node serverless functions in `api/` using `mysql2`
- **DB**: remote MySQL (schema in `mysql_setup.sql`)
- **Hosting**: Vercel (static + Node functions)

## Security model
- Clients hold **no DB credentials** and no API keys — `supabase.js` only proxies to `/api/students`.
- Admin auth is **server-side**: login checks `ADMIN_PASSWORD`, returns an 8-hour HMAC-signed
  token stored in `sessionStorage`. Every privileged API action requires that token.
- CORS is restricted to `ALLOWED_ORIGIN`; inputs are validated and rate-limited server-side.
- No hardcoded or default passwords (the previous reset-to-default password backdoors were removed).

## Setup

### 1. MySQL schema
Create your remote MySQL database and tables, then (optionally) seed an admin row:

```bash
cp .env.example .env   # fill in MYSQL_* etc.

npm install            # installs mysql2
node migrate.js        # apply schema (mysql_setup.sql) — creates tables
node migrate.js --seed # also insert an admin row (hashed from ADMIN_PASSWORD)
```

To copy existing data from an old Supabase project into MySQL:

```bash
# set SUPABASE_URL + SUPABASE_ANON_KEY in .env first
node migrate.js --from-supabase
```

> `--from-supabase` currently migrates `students` and `feedback`. `lessons`, `admins`, and
> `exam_logs` start empty in the fresh MySQL DB. Use `--drop` (dangerous) to reset tables first.

### 2. Vercel environment variables
Set these in the Vercel project (Settings → Environment Variables):

| Variable | Purpose |
|----------|---------|
| `MYSQL_HOST` | MySQL host |
| `MYSQL_PORT` | default `3306` |
| `MYSQL_USER` | MySQL app user |
| `MYSQL_PASSWORD` | MySQL app password |
| `MYSQL_DATABASE` | database name, e.g. `uyghur_tibb` |
| `ADMIN_PASSWORD` | the admin login password (also signs tokens) |
| `ALLOWED_ORIGIN` | your app origin, e.g. `https://uyghur-tibb.vercel.app` |

### 3. Verify the migration
After running the migrator, confirm the tables exist and the app user can use them:

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p "$MYSQL_DATABASE" \
  -e "SHOW TABLES; SELECT COUNT(*) FROM students; DESCRIBE students;"
```

> If the migrator reported `You are not allowed to create a user with GRANT`, the `GRANT` at the
> bottom of `mysql_setup.sql` did not apply. That is fine as long as the `MYSQL_USER` already has
> `SELECT`/`INSERT`/`UPDATE`/`DELETE` on the database (e.g. it is the DB owner). Otherwise run the
> GRANT as a superuser, or ask your DB host admin to grant those privileges to the app user.

### 4. Local development
Run the app and the API locally against your MySQL DB (no Vercel needed):

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

### 5. Deploy
Push to GitHub and import into Vercel, or use the Vercel CLI. The `api/` directory is picked up
as serverless functions; the static files are served as-is. Update `ALLOWED_ORIGIN` to match your
deployed URL. When the Vue app replaces the vanilla `index.html`, point Vercel at the `vite/`
project root (`npm run build`, output `dist/`); the API path stays `/api/students`.

## Vue frontend (incremental port)

A Vue 3 + Vite + Pinia + vue-router port lives in `vite/`, being built tab-by-tab while the
vanilla `index.html` remains the deployed app during the transition.

Run it (needs the Node API running for `/api/*` — see section 4, or leave out if you only
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
- Progress storage reuses the same `uytibb_v1` localStorage key as the vanilla app
- Content stays in the root `data.js` (single source of truth)

Not yet ported: `admin.html` (stays vanilla for now), PWA sw/manifest wiring for the build.

## Admin login
- Open `admin.html`.
- Enter the `ADMIN_PASSWORD` value. A short-lived token is issued and stored in the session.

## Model: upstream collaboration
The upstream project (`github.com/avary/uyghur-tibb`) keeps evolving. When new features land
upstream, fetch and integrate them **in our hardened way**: keep diffs minimal and targeted in
the HTML files, and route any new data features through `/api/students` with server-side auth —
never add client-side DB/API keys or password bypasses.


## Future:
Migrate to  Vue 3 + Vite + Pinia
