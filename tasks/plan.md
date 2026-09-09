# Implementation Plan: Security Remediation + Supabase → MySQL Migration

## Overview
Harden the Uyghur Traditional Medicine education platform (from the security audit) and
migrate its backend from Supabase/PostgreSQL to the user's remote MySQL database. The app
is a vanilla-JS static frontend on Vercel with Node serverless functions in `/api`.

## Architecture Decisions
- **All-in on Node, no Python.** The Vercel deploy is static + Node functions that already
  coexist with the frontend. Vercel's Python runtime is Beta and conflicts with static
  hosting, so the MySQL backend uses Node + `mysql2`.
- **MySQL is remote** and accessed ONLY by the serverless functions via environment
  variables (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_PORT`).
  No DB credentials ever reach the browser.
- **No client-side DB access.** `supabase.js` (which did direct Supabase REST calls with a
  key) is reworked into a thin client that proxies all DB work through `/api/students`.
  The client holds no key.
- **Admin auth is server-side**: login verifies against an env `ADMIN_PASSWORD`, returns a
  short-lived HMAC-signed token. Client kept it out of localStorage keys; the reset-to-default
  password backdoors are removed. Privileged API actions require the token.
- **CORS restricted** to the app origin (env `ALLOWED_ORIGIN`), rate limiting added,
  inputs validated server-side.

## Task List

### Task 1: MySQL schema (mysql_setup.sql)
- [x] CREATE DATABASE guidance + tables: students, feedback, admins, lessons, exam_logs
- [x] No plaintext default admin password in schema; admin auth via env ADMIN_PASSWORD
- [x] Add migration note replacing supabase_setup.sql

### Task 2: Rewrite api/students.js (Node + mysql2)
- [x] Env-driven mysql2 pool/connection
- [x] action=login -> verify ADMIN_PASSWORD (timing-safe), return HMAC token (8h)
- [x] GET ?phone= -> scoped student status (public)
- [x] GET (authenticated) -> full students/feedback/exams for admin
- [x] POST action=register (public, validated)
- [x] POST action=update_status / delete_student / reply_feedback / admin_update (ADMIN ONLY)
- [x] POST action=exam / feedback (public, validated)
- [x] CORS restricted, rate limiting, JSON error handling

### Task 3: Remove api/config.js + rework supabase.js
- [x] Delete api/config.js (no client key to serve)
- [x] supabase.js becomes a proxy wrapper around /api/students; no hardcoded creds
- [x] Connected-detection simplified (app always uses API; DB presence reported by API)

### Task 4: admin.html
- [x] Login posts action=login; store token in sessionStorage
- [x] checkAuth validates token shape (server enforces real auth)
- [x] Remove resetAdminPassPrompt reset-to-default backdoor, plaintext localStorage admin pass
- [x] Approve/block/delete/reply/admin-update route through API with Authorization header

### Task 5: index.html
- [x] Registration -> API; status check -> scoped API; feedback -> API
- [x] Remove direct supabase.js DB calls

### Task 6: Env config + docs
- [x] .env.example with MYSQL_* + ADMIN_PASSWORD + ALLOWED_ORIGIN
- [x] README / setup notes for Vercel env vars + MySQL schema
- [x] .vercelignore / vercel.json if needed

### Task 7: Final verification
- [x] grep repo for leaked supabase key / default secrets / reset-to-default backdoors
- [x] node syntax check on api files (node --check)
- [x] update plan file

## Checkpoints
- Checkpoint 1 (Task 2/3): no leaked creds; api/* syntax-valid
- Checkpoint 2 (Task 4): admin login not bypassable by editing sessionStorage alone
- Checkpoint 3 (Task 5): register/status/feedback flows call API

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| mysql2 not bundled on Vercel | High | Add mysql2 to a package.json + install; or leave in node_modules via git |
| MySQL connection pooling on serverless | Med | Use a connection per request (or short pool) with error handling; document provider (e.g. PlanetScale/ Aiven) |
| Breaking admin login UX | High | Keep simple token model; document ADMIN_PASSWORD + ALLOWED_ORIGIN env |
| Static file serving broken by adding backend | Low | Keep Node functions pattern (already proven); no Python framework takeover |
