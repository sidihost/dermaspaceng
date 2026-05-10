-- ===========================================================================
-- Inbound email → ticket pipeline
-- ===========================================================================
-- This migration prepares support_tickets and ticket_responses for the new
-- /api/inbound/email webhook that turns mail sent to hello@dermaspaceng.com
-- into real tickets in our admin queue.
--
-- Why each change:
--   * `user_id` was NOT NULL — but a customer who emails us before they've
--     signed up has no user row yet. We make it nullable and rely on
--     `email` (which has always been required) as the customer identifier.
--   * `source` records where the ticket came from ('app' for the in-app
--     form, 'email' for the inbound webhook, future: 'live_chat'). The
--     admin inbox can use this to render a small badge so staff know
--     they're replying to an email thread, not a logged-in user.
--   * `external_message_id` is the email's RFC 5322 Message-ID. We index
--     it because the webhook MUST be idempotent — if Zepto retries the
--     POST we should not create the same ticket twice.
--   * Mirror columns on ticket_responses so an inbound reply (the
--     customer replying to a notification email) gets attributed
--     correctly and can be deduped on retries.
-- ---------------------------------------------------------------------------

ALTER TABLE support_tickets
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'app';

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(512);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_external_message_id
  ON support_tickets (external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_email
  ON support_tickets (LOWER(email));

ALTER TABLE ticket_responses
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'app';

ALTER TABLE ticket_responses
  ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(512);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_responses_external_message_id
  ON ticket_responses (external_message_id)
  WHERE external_message_id IS NOT NULL;
