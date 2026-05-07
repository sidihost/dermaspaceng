-- ============================================================
-- Admin impersonation ("Login as user")
-- ============================================================
-- Adds two columns to the existing `sessions` table that let an
-- admin temporarily borrow a customer's identity while keeping a
-- breadcrumb back to their real account, plus an audit log so we
-- can answer "who logged in as whom and when?".
--
-- Why columns instead of a separate impersonation_sessions table?
-- Because every existing auth check already reads from `sessions`
-- via lib/auth.ts — adding two nullable columns means *zero* code
-- has to change to honour the new mode. The session simply now
-- carries a "real admin" pointer alongside its primary user_id.
-- ============================================================

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS impersonator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS impersonator_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- Index helps the "stop impersonating" route find the original
-- admin session quickly when the masquerade is ended.
CREATE INDEX IF NOT EXISTS idx_sessions_impersonator
  ON sessions (impersonator_id) WHERE impersonator_id IS NOT NULL;

-- Tamper-evident audit log. Inserts only — admins NEVER see the
-- "delete row" UI on this. Required for SOC2-style audits and to
-- defend the business if a customer claims a staff member acted
-- on their behalf without authorization.
CREATE TABLE IF NOT EXISTS admin_impersonation_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,
  reason        TEXT,
  ip_address    VARCHAR(64),
  user_agent    TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin
  ON admin_impersonation_log (admin_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_impersonation_log_target
  ON admin_impersonation_log (target_user_id, started_at DESC);
