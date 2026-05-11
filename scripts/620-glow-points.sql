-- ---------------------------------------------------------------------------
-- 620-glow-points.sql
--
-- Introduces "Glow Points" — the loyalty-style reward currency that
-- replaces the old "bonus wallet credit" framing on site memberships.
-- Glow Points are NOT money:
--
--   * They never appear in the wallet ledger.
--   * They never settle to naira.
--   * They unlock website features (priority booking, early access
--     to partner listings, member-only seasonal offers, etc.) and
--     give members a visible badge of their tier.
--
-- This separation matters because Silver / Gold memberships are
-- site-wide tiers that are NOT tied to the Dermaspace spa service.
-- The old "5% / 8% bonus" copy implied a refund — Glow Points
-- reframe the reward as something earned, not paid back.
--
-- The flagship Platinum spa membership still funds the user's
-- wallet (see /api/membership/verify) AND grants the largest Glow
-- Points award — points are an *additional* benefit on Platinum,
-- not a substitute for the wallet credit.
--
-- Idempotent: every ALTER / CREATE uses IF NOT EXISTS so re-running
-- the script is a no-op.
-- ---------------------------------------------------------------------------

-- 1. RUNNING POINTS BALANCE ON `users` ---------------------------------------
--
-- INTEGER is plenty: even the most generous Platinum award (10,000
-- points per year) needs only 14 bits. DEFAULT 0 so legacy customer
-- rows simply read as "no points yet" — no backfill required.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS glow_points INTEGER NOT NULL DEFAULT 0;

-- Quick-lookup index so future "top earners" / "members above N
-- points" admin queries don't scan the whole users table. Partial
-- index keeps it small — we only care about rows that actually have
-- points, which is the membership subset.
CREATE INDEX IF NOT EXISTS idx_users_glow_points
  ON users (glow_points DESC)
  WHERE glow_points > 0;


-- 2. POINTS LEDGER -----------------------------------------------------------
--
-- One row per points event. The membership signup flow inserts a
-- single "earn" row per subscription; future flows (referral
-- bonuses, birthday gifts, redemption against a perk) write
-- their own rows so we always have the full history.
--
-- We deliberately do NOT debit `users.glow_points` when a perk is
-- "unlocked" — perks are *threshold-gated*, not point-spent. The
-- column is the lifetime balance and the ledger is the audit trail.

CREATE TABLE IF NOT EXISTS glow_points_log (
  id            BIGSERIAL PRIMARY KEY,

  -- User the points belong to. CASCADE matches the rest of the
  -- wallet / transaction tables so a hard-deleted user takes their
  -- ledger with them.
  user_id       VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Positive on "earn" events, negative on (hypothetical, future)
  -- redemptions. INTEGER mirrors the column on `users`.
  delta         INTEGER NOT NULL,

  -- Short machine-readable reason. Examples: `membership_signup`,
  -- `referral_bonus`, `birthday_gift`, `manual_adjustment`. The
  -- admin console can pivot on this without parsing free-text.
  reason        VARCHAR(48) NOT NULL,

  -- Free-text description displayed in the user's "Glow Points
  -- history" panel. Optional — when omitted the UI falls back to
  -- a label derived from `reason`.
  description   TEXT,

  -- Optional reference to a related transaction (e.g. the
  -- membership payment) so the receipt + ledger can cross-link
  -- without an opaque join. Nullable because some future event
  -- types (admin nudges, anniversary gifts) won't have one.
  reference     VARCHAR(64),

  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Per-user reverse-chronological index — the dashboard "recent
-- activity" list reads `ORDER BY created_at DESC LIMIT 20` so this
-- is the read path we need to keep fast.
CREATE INDEX IF NOT EXISTS idx_glow_points_log_user_created
  ON glow_points_log (user_id, created_at DESC);

-- Idempotency guard for membership signups — never award points
-- twice for the same Paystack reference, even if the verify route
-- runs twice. The membership-signup award path inserts with
-- ON CONFLICT DO NOTHING using (user_id, reason, reference).
CREATE UNIQUE INDEX IF NOT EXISTS idx_glow_points_log_unique_ref
  ON glow_points_log (user_id, reason, reference)
  WHERE reference IS NOT NULL;
