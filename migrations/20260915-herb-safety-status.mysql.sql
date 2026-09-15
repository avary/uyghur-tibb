-- Apply once to an existing MySQL deployment after the herb safety gate change.
ALTER TABLE herbs
  ADD COLUMN IF NOT EXISTS safety_status VARCHAR(30) NOT NULL DEFAULT 'unreviewed' AFTER review_status;

ALTER TABLE herb_review_history
  ADD COLUMN IF NOT EXISTS safety_status VARCHAR(30) NOT NULL DEFAULT 'unreviewed' AFTER review_status;
