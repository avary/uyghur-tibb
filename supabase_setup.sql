-- =========================================================================
-- «ئۇيغۇر تېبابىتى مائارىپ سۇپىسى» — Supabase PostgreSQL ساندان لايىھەسى
-- بۇ كودنى Supabase تۈرىڭىزدىكى SQL Editor غا چاپلاپ «RUN» كۇنۇپكىسىنى باسسىڭىزلا پۈتىدۇ.
-- =========================================================================

-- 1. ئوقۇغۇچىلار جەدۋىلى (Students & Approvals)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' (كۈتۈۋاتىدۇ), 'approved' (تەستىقلاندى), 'blocked' (چەكلەندى)
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 2. سوئال-جاۋاب ۋە ئوقۇغۇچى پىكىرلىرى (Q&A & Feedback)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    student_phone TEXT,
    question TEXT NOT NULL,
    reply TEXT,
    reply_at TIMESTAMPTZ,
    replied_by TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. باشقۇرغۇچى ھېساباتلىرى (Admin Accounts)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'teacher', -- 'super' (ئالىي باشقۇرغۇچى), 'teacher' (ئوقۇتۇش مەسئۇلى)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- دەسلەپكى ئاساسىي باشقۇرغۇچىنى قىستۇرۇش (ئەگەر بولمىسا)
INSERT INTO public.admins (username, full_name, password_hash, role)
VALUES ('admin', 'ئاساسىي باشقۇرغۇچى', 'tibb2026', 'super')
ON CONFLICT (username) DO NOTHING;

-- 4. دەرسلىك ۋە PDF كىتابلار جەدۋىلى (Lessons & PDFs)
CREATE TABLE IF NOT EXISTS public.lessons (
    id INT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    short_title TEXT,
    description TEXT,
    pdf_url TEXT,
    pdf_title TEXT,
    data JSONB, -- پۈتۈن دەرس بۆلەكلىرى ۋە سوئاللىرى
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ئىمتىھان ۋە سىناق خاتىرىلىرى (Exams)
CREATE TABLE IF NOT EXISTS public.exam_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_phone TEXT REFERENCES public.students(phone) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    duration_seconds INT,
    passed BOOLEAN DEFAULT FALSE,
    taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) كاپالىتى
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- ھەممە ئادەم ئوقۇيالايدىغان ۋە سوئال يوللىيالايدىغان قائىدە
CREATE POLICY "Public Read Lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Public Read Approved Feedback" ON public.feedback FOR SELECT USING (is_public = true);
CREATE POLICY "Public Insert Feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Student" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Students Status" ON public.students FOR SELECT USING (true);

COMMENT ON TABLE public.students IS 'ئۇيغۇر تېبابىتى تىزىملاتقان ئوقۇغۇچىلار ۋە تەستىقلاش ھالىتى';
COMMENT ON TABLE public.feedback IS 'ئوقۇغۇچىلارنىڭ سوئال-جاۋاب ۋە پىكىرلىرى';
