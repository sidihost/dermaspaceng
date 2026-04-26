-- ---------------------------------------------------------------------------
-- 111-notification-broadcasts.sql
--
-- Adds the notification_broadcasts table used by /admin/broadcast to:
--   • record every broadcast (scheduled, sent, draft) for audit + history,
--   • drive scheduled delivery via a cron worker that picks up rows
--     where status='scheduled' AND scheduled_at <= NOW().
--
-- Idempotent — safe to re-run.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_broadcasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Internal label so admins can scan a list of past sends. Optional.
  name            VARCHAR(120),
  title           VARCHAR(200) NOT NULL,
  message         TEXT NOT NULL,
  image_url       TEXT,
  action_url      TEXT,
  priority        VARCHAR(10) NOT NULL DEFAULT 'normal',
  -- Audience selector. We persist the full descriptor so a scheduled
  -- broadcast resolves the audience at SEND time, not creation time —
  -- a user added between creation and send still receives it when
  -- audience='all' or audience='role'.
  audience        VARCHAR(10) NOT NULL DEFAULT 'all', -- 'all' | 'role' | 'user'
  role            VARCHAR(20),
  user_id         VARCHAR(36),
  -- Channel mix. Both default true; the page exposes "push only" /
  -- "in-app only" toggles.
  push_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  inapp_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Lifecycle. 'scheduled' rows are picked up by the cron worker.
  -- 'draft' rows are saved-but-unscheduled and skipped by the cron.
  status          VARCHAR(20) NOT NULL DEFAULT 'sent',
                  -- 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
  scheduled_at    TIMESTAMP,
  sent_at         TIMESTAMP,
  -- Delivery counters populated when the broadcast actually fans out.
  recipients      INTEGER NOT NULL DEFAULT 0,
  push_sent       INTEGER NOT NULL DEFAULT 0,
  push_removed    INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  -- Audit
  created_by      VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status_scheduled
  ON notification_broadcasts (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at
  ON notification_broadcasts (created_at DESC);
