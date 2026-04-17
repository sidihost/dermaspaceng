-- Widen admin_replies.request_id from INTEGER → TEXT.
--
-- The consultations table uses UUIDs (VARCHAR(36)) for its primary key in
-- production. Earlier migrations declared admin_replies.request_id as
-- INTEGER (see fix-all-remaining.sql), which means when an admin posts a
-- reply against a consultation, the UUID string silently fails to cast
-- and the reply never persists. From the admin UI this looks like
-- "I sent a reply but it doesn't show".
--
-- Complaint / gift-card / contact / ticket ids are numeric but storing
-- them as text in this cross-reference column is perfectly fine — the
-- API already `.toString()`s the value for GETs and it's never joined
-- back as a number. Widening to TEXT is the minimal change that makes
-- replies work for every request type.

ALTER TABLE admin_replies
  ALTER COLUMN request_id TYPE TEXT USING request_id::text;

-- Recreate the composite index so lookups stay fast after the type change.
DROP INDEX IF EXISTS idx_admin_replies_request;
CREATE INDEX IF NOT EXISTS idx_admin_replies_request
  ON admin_replies(request_type, request_id);
