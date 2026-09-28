-- ---------------------------------------------------------------------------
-- 730-newsletter-broadcast-all-users.sql
--
-- Makes the "send a campaign to every registered user" audience actually
-- work end-to-end. The feature shipped in code (send route + audience
-- counts + composer) but two of the columns it depends on were never
-- created by a migration the build runner executes:
--
--   1. newsletter_campaigns.audience — the composer writes it and both
--      the list and detail APIs SELECT it. It was only ever added by
--      `scripts/add-campaign-audience.mjs`, which the build-time runner
--      ignores (it only reads *.sql). On a clean production database the
--      column therefore does not exist and every campaign request 500s.
--
--   2. user_preferences.notification_promotions — the recipient query for
--      the 'customers' audience filters on it, so the query raises
--      "column p.notification_promotions does not exist" and neither the
--      live audience count nor the send itself can resolve.
--
-- It also back-fills the subscriber metadata + campaign/log tables from
-- script 480 idempotently, so a database that was bootstrapped (runner
-- marks existing files applied without executing them) still ends up with
-- the schema the newsletter console expects.
--
-- Ordering matters: the campaign table is created (or confirmed) BEFORE
-- the `audience` column is ALTERed onto it, so a database where 480 never
-- ran doesn't fail on "relation does not exist".
--
-- Idempotent — safe to re-run. Every CREATE is IF NOT EXISTS and every
-- ALTER uses ADD COLUMN IF NOT EXISTS.
-- ---------------------------------------------------------------------------

-- 1. CAMPAIGN TABLES (self-heal) ---------------------------------------------
-- Re-declared here so a database where 480 never ran still gets the pair
-- the composer + sender need. `created_by` and `subscriber_id` are TEXT
-- rather than a typed FK to avoid a cross-type "cannot be implemented"
-- failure when `users.id` / `newsletter_subscribers.id` are integer on
-- older databases — the app writes string ids and never relies on the FK
-- for correctness (the per-recipient log keys on email).
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         VARCHAR(200) NOT NULL,
  preheader       VARCHAR(200),
  eyebrow         VARCHAR(60),
  headline        VARCHAR(200),
  body_html       TEXT NOT NULL,
  cta_label       VARCHAR(60),
  cta_url         TEXT,
  audience        VARCHAR(20) NOT NULL DEFAULT 'subscribers',
  status          VARCHAR(16) NOT NULL DEFAULT 'draft',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_by      VARCHAR(36),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMP,
  last_test_email VARCHAR(255),
  last_test_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status
  ON newsletter_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created_at
  ON newsletter_campaigns(created_at DESC);

CREATE TABLE IF NOT EXISTS newsletter_campaign_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id TEXT,
  email         VARCHAR(255) NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending',
  error         TEXT,
  sent_at       TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaign_logs_campaign
  ON newsletter_campaign_logs(campaign_id);

-- 2. CAMPAIGN AUDIENCE -------------------------------------------------------
-- 'subscribers' — the marketing opt-in list (historical default).
-- 'customers'   — every active, non-deleted registered account, minus
--                 anyone who opted out of promotional email.
ALTER TABLE newsletter_campaigns
  ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'subscribers';

CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_audience
  ON newsletter_campaigns(audience);

-- 3. PROMOTIONAL EMAIL OPT-OUT ----------------------------------------------
-- Authoritative marketing opt-out for the 'customers' audience. Defaults
-- TRUE so a brand-new registration is reachable until they say otherwise,
-- matching the "members-only offers" intent of the broadcast feature.
--
-- The CREATE guard means this file is self-sufficient even on a database
-- where the preferences table's original migration was bootstrapped
-- (recorded as applied without executing). `user_id` deliberately carries
-- no FK: the app already joins `user_preferences.user_id = users.id` in
-- code and never relies on the constraint, and the historical migrations
-- disagree on whether `users.id` is UUID or VARCHAR — a typed FK here
-- would abort the whole file (and its transaction) with "cannot be
-- implemented" on the mismatched schema. The UNIQUE keeps it 1:1.
CREATE TABLE IF NOT EXISTS user_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(36) UNIQUE,
  skin_type            VARCHAR(50),
  concerns             TEXT[],
  preferred_services   TEXT[],
  preferred_location   VARCHAR(100),
  notifications             BOOLEAN DEFAULT TRUE,
  welcome_dismissed         BOOLEAN DEFAULT FALSE,
  avatar_intro_dismissed    BOOLEAN DEFAULT FALSE,
  notification_promotions   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Belt-and-braces column guards, in case a narrower `user_preferences`
-- (e.g. from a very early schema) is already present.
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS skin_type    VARCHAR(50);
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS concerns     TEXT[];
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preferred_services TEXT[];
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preferred_location VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON user_preferences(user_id);

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notification_promotions BOOLEAN DEFAULT TRUE;

-- 4. NEWSLETTER SUBSCRIBER METADATA (self-heal) ------------------------------
-- Mirrors script 480. If the table predates 480 (or 480 was bootstrapped
-- without executing) these columns are missing and the admin subscriber
-- list 500s on `SELECT status, first_name, ...`.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS first_name      VARCHAR(120);
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS last_name       VARCHAR(120);
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS source          VARCHAR(40) DEFAULT 'homepage';
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS status          VARCHAR(16) DEFAULT 'active';
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS last_sent_at    TIMESTAMP;
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status
  ON newsletter_subscribers(status);
