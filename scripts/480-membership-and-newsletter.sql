-- ---------------------------------------------------------------------------
-- 480-membership-and-newsletter.sql
--
-- Two-in-one migration that stands up the data model behind the new
-- "membership-personalized profile" experience and the admin
-- newsletter console:
--
--   1. Extend `users` with the columns we need to track Platinum
--      membership state (tier, lifecycle dates, funded amount, current
--      wallet balance). All columns are nullable / default-safe so
--      legacy customer rows keep loading exactly the way they used
--      to — they simply read as "not a member" until an admin (or a
--      future self-serve signup) flips them.
--
--   2. Extend `newsletter_subscribers` with the metadata that makes
--      the admin list useful (name capture, source, lifecycle status,
--      last-sent timestamp) and create the campaign tables that back
--      the admin email composer + per-recipient delivery log.
--
-- Idempotent — safe to run repeatedly. Every ALTER uses IF NOT EXISTS
-- and every CREATE TABLE uses IF NOT EXISTS so re-applying the script
-- on a database that already has the columns is a no-op.
-- ---------------------------------------------------------------------------

-- 1. MEMBERSHIP COLUMNS ON `users` -------------------------------------------

-- Tier is a free-form short string ('platinum' for now, but leaving
-- room for 'gold' / 'silver' tiers later without a schema bump).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_tier        VARCHAR(32);

-- Lifecycle status — `active` while the membership is in force,
-- `expired` once the term lapses, `cancelled` if an admin revoked it.
-- NULL means "never been a member", which is the legacy default.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_status      VARCHAR(16);

-- When the customer signed up + when the term ends. A 1-year
-- subscription is the standard product so most members will have
-- `expires_at = started_at + INTERVAL '1 year'`, but we store both
-- explicitly so future tiers with different durations don't need a
-- migration.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_started_at  TIMESTAMP;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_expires_at  TIMESTAMP;

-- Capital funded by the member at sign-up (Platinum minimum N500,000)
-- and the live balance that gets debited as they redeem treatments.
-- NUMERIC(14,2) handles every plausible amount; we never use floats
-- for currency in this codebase.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_funded_amount  NUMERIC(14,2) DEFAULT 0;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_balance        NUMERIC(14,2) DEFAULT 0;

-- Quick-lookup index for the admin list and any future "send to
-- members only" newsletter segment.
CREATE INDEX IF NOT EXISTS idx_users_membership_status
  ON users(membership_status)
  WHERE membership_status IS NOT NULL;

-- 2. NEWSLETTER SUBSCRIBER METADATA ------------------------------------------

-- Optional first/last name captured if the subscribe form ever asks
-- for it (or copied from the matching user row when one exists).
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS first_name      VARCHAR(120);
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS last_name       VARCHAR(120);

-- Where the email came from — `homepage`, `footer`, `signup`,
-- `import`, etc. Useful for measuring which surface is converting
-- without introducing a separate analytics table.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS source          VARCHAR(40) DEFAULT 'homepage';

-- Lifecycle. `active` — happily on the list. `unsubscribed` — opted
-- out via the unsubscribe link in any campaign email. `bounced` —
-- mailer rejected the address (we'll wire this up when Zepto's
-- bounce webhook lands; the column is here so we don't need a
-- second migration when it does).
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS status          VARCHAR(16) DEFAULT 'active';

-- Audit timestamps for last sent + last unsubscribed. Both are
-- nullable so existing rows keep loading.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS last_sent_at    TIMESTAMP;
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP;

-- Index the subset that actually receives mail; the admin list and
-- campaign sender both filter on `status = 'active'` so this keeps
-- the queue fast even at 100k+ subscribers.
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status
  ON newsletter_subscribers(status);

-- 3. NEWSLETTER CAMPAIGNS ----------------------------------------------------
--
-- One row per email blast. The admin composes a draft, optionally
-- sends a test to themselves, and then "Send" promotes it to
-- `sending` while we walk the subscriber list. Once every recipient
-- has a row in `newsletter_campaign_logs` the status flips to
-- `sent` and `sent_at` is stamped.

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Inbox subject line. Required. We cap at 200 chars to match
  -- typical email-client truncation thresholds.
  subject         VARCHAR(200) NOT NULL,

  -- Hidden inbox preview text (Gmail / Apple Mail "preheader"). 200
  -- chars is enough for every real-world preview pane.
  preheader       VARCHAR(200),

  -- Optional uppercase eyebrow chip rendered above the body, e.g.
  -- "MAY ISSUE", "MEMBER OFFER". Mirrors the transactional templates
  -- so the same visual language carries across the brand.
  eyebrow         VARCHAR(60),

  -- Plain-text headline rendered as an <h2> at the top of the body.
  headline        VARCHAR(200),

  -- HTML body (rendered as-is inside the brand template). Plain
  -- text is generated automatically by stripping tags when we send.
  body_html       TEXT NOT NULL,

  -- Optional CTA button — the admin can drop in a URL + label and
  -- the template renders a brand-purple pill at the bottom of the
  -- email. Both columns are nullable; if either is missing the CTA
  -- block is skipped entirely.
  cta_label       VARCHAR(60),
  cta_url         TEXT,

  -- Lifecycle. `draft` -> admin is still composing.
  -- `sending` -> the send job is walking the subscriber list.
  -- `sent` -> every recipient processed, `sent_at` populated.
  -- `failed` -> the send job aborted; check `last_error`.
  status          VARCHAR(16) NOT NULL DEFAULT 'draft',

  -- Recipient counters used by the admin list. `recipient_count` is
  -- the snapshot of active subscribers at send time; `sent_count`
  -- and `failed_count` tick up as we walk the list. Both default
  -- to 0 so the UI never has to null-check.
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,

  -- Last error string from the send job, surfaced in the admin
  -- detail view so we can debug a failed campaign without
  -- ssh-ing into the logs.
  last_error      TEXT,

  -- Audit. `created_by` is the admin's user id; SET NULL keeps the
  -- campaign row alive if the admin user is later deleted.
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMP,

  -- Last test-send recipient + timestamp so the admin can see at a
  -- glance that they QA'd the email before the real blast. Tiny
  -- nicety but matches what big-tech ESPs (Klaviyo, Mailchimp)
  -- show in their list views.
  last_test_email VARCHAR(255),
  last_test_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status
  ON newsletter_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created_at
  ON newsletter_campaigns(created_at DESC);

-- 4. PER-RECIPIENT DELIVERY LOG ----------------------------------------------
--
-- One row per (campaign × subscriber). Lets the admin drill into a
-- campaign and see exactly which addresses we attempted, succeeded,
-- or failed for. We keep the subscriber email denormalised in the
-- row so deleting a subscriber later doesn't blow up the audit
-- trail (the campaign log is the historical record).

CREATE TABLE IF NOT EXISTS newsletter_campaign_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id INTEGER REFERENCES newsletter_subscribers(id) ON DELETE SET NULL,
  email         VARCHAR(255) NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending',
  error         TEXT,
  sent_at       TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),

  -- A single subscriber should appear at most once per campaign.
  -- The admin send job uses ON CONFLICT DO NOTHING to make
  -- retries idempotent.
  UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaign_logs_campaign
  ON newsletter_campaign_logs(campaign_id);
