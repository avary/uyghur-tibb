-- Apply once to an existing Supabase deployment after the herb safety gate change.
ALTER TABLE public.herbs
  ADD COLUMN IF NOT EXISTS safety_status text NOT NULL DEFAULT 'unreviewed';

ALTER TABLE public.herb_review_history
  ADD COLUMN IF NOT EXISTS safety_status text NOT NULL DEFAULT 'unreviewed';
