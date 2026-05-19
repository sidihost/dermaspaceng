-- Persistent sink for client-side errors so the admin can see what
-- went wrong on a specific user's session without trawling Vercel
-- logs. The /api/client-errors route still logs `[CLIENT-ERROR]`
-- lines for ops, but it now ALSO inserts a row here so the admin
-- user-detail page can render a "Recent errors" panel scoped to that
-- user.
--
-- user_id is best-effort: anonymous visitors hitting an error before
-- they sign in still get a row (with NULL user_id) so we don't lose
-- the report.
CREATE TABLE IF NOT EXISTS client_errors (
  id           BIGSERIAL PRIMARY KEY,
  user_id      VARCHAR(36)  NULL,
  source       VARCHAR(64)  NULL,
  message      TEXT         NOT NULL,
  stack        TEXT         NULL,
  digest       VARCHAR(128) NULL,
  url          TEXT         NULL,
  user_agent   TEXT         NULL,
  ip           VARCHAR(64)  NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_errors_user_created
  ON client_errors(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_created
  ON client_errors(created_at DESC);

-- Self-heal admin_replies.request_id in case the older 030 migration
-- hasn't been applied yet on this environment. Without TEXT here,
-- consultation replies (UUID request_ids) silently fail the implicit
-- INTEGER cast — exactly the "I send a reply on a consultation, the
-- admin's message vanishes after refresh" bug. Idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_replies'
      AND column_name = 'request_id'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE admin_replies ALTER COLUMN request_id TYPE TEXT USING request_id::text;
  END IF;
END$$;
