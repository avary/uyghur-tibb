CREATE TABLE IF NOT EXISTS public.book_topic_reviews (
  topic_id text PRIMARY KEY,
  book_id text NOT NULL,
  title text,
  summary text,
  review_status text NOT NULL DEFAULT 'needs_review',
  reviewer text,
  reviewed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
