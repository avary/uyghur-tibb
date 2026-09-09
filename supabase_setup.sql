-- =========================================================================
-- «ئۇيغۇر تېبابىتى مائارىپ سۇپىسى» — Supabase (PostgreSQL) schema
-- Alternate backend to MySQL: pick it by setting DB_DRIVER=supabase on deploy.
--
-- HOW TO APPLY: open your Supabase project -> SQL Editor -> paste this file
-- and press RUN. Then set these Vercel env vars:
--   DB_DRIVER=supabase
--   SUPABASE_URL=https://<project>.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY=<service role key>   (server-side ONLY, never in
--                                                    the browser / repo)
--
-- SECURITY NOTES:
--  * The API (api/students.js -> api/lib/db-supabase.js) talks to PostgREST
--    with the SERVICE ROLE key, which bypasses RLS. RLS below is therefore a
--    defensive safety net for the (optional) anon key, not an auth boundary.
--  * Admin accounts here store only DISPLAY metadata (full_name, role). Real
--    admin authentication is server-side via the ADMIN_PASSWORD env var, the
--    same as the MySQL backend.
--  * No default/plaintext passwords are seeded anywhere.
-- =========================================================================

create table if not exists public.students (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text not null unique,
    status text not null default 'pending', -- 'pending' (كۈتۈۋاتىدۇ), 'approved' (تەستىقلاندى), 'blocked' (چەكلەندى)
    registered_at timestamptz default now(),
    last_active timestamptz default now(),
    notes text
);

create index if not exists idx_students_phone on public.students (phone);
create index if not exists idx_students_status on public.students (status);

create table if not exists public.feedback (
    id uuid primary key default gen_random_uuid(),
    student_name text not null,
    student_phone text,
    question text not null,
    reply text,
    reply_at timestamptz,
    replied_by text,
    is_public boolean default true,
    created_at timestamptz default now()
);

create index if not exists idx_feedback_created on public.feedback (created_at desc);

create table if not exists public.admins (
    id uuid primary key default gen_random_uuid(),
    username text not null unique,
    full_name text not null,
    password_hash text,
    role text not null default 'teacher', -- 'super' (ئالىي باشقۇرغۇچى), 'teacher' (ئوقۇتۇش مەسئۇلى)
    created_at timestamptz default now()
);

create table if not exists public.lessons (
    id int primary key,
    title text not null,
    subtitle text,
    short_title text,
    description text,
    pdf_url text,
    pdf_title text,
    data jsonb, -- پۈتۈن دەرس بۆلەكلىرى ۋە سوئاللىرى
    updated_at timestamptz default now()
);

create table if not exists public.exam_logs (
    id uuid primary key default gen_random_uuid(),
    student_phone text references public.students(phone) on delete cascade,
    scope text not null,
    score int not null,
    total_questions int not null,
    duration_seconds int,
    passed boolean default false,
    taken_at timestamptz default now()
);

create index if not exists idx_exam_student on public.exam_logs (student_phone);
create index if not exists idx_exam_taken on public.exam_logs (taken_at desc);

-- -------------------------------------------------------------------------
-- RLS (safety net; the API uses the service role so these never gate it)
-- -------------------------------------------------------------------------
alter table public.students enable row level security;
alter table public.feedback enable row level security;

-- Anyone may register. They may NOT read other students (no public select).
create policy "Public Insert Student" on public.students for insert with check (true);

-- Feedback: public may submit; only answered + public items are readable.
create policy "Public Insert Feedback" on public.feedback for insert with check (true);
create policy "Public Read Answered Feedback" on public.feedback
    for select using (is_public = true and reply is not null);

-- lessons: created for content sync; public reads are allowed.
alter table public.lessons enable row level security;
create policy "Public Read Lessons" on public.lessons for select using (true);

comment on table public.students is 'ئۇيغۇر تېبابىتى تىزىملاتقان ئوقۇغۇچىلار ۋە تەستىقلاش ھالىتى';
comment on table public.feedback is 'ئوقۇغۇچىلارنىڭ سوئال-جاۋاب ۋە پىكىرلىرى';
comment on table public.exam_logs is 'ئىمتىھان نەتىجە خاتىرىلىرى';