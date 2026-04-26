-- ---------------------------------------------------------------------------
-- 110-admin-platform-controls.sql
--
-- Adds the four pillars of the new admin "platform controls" surface:
--
--   1. feature_flags          — toggle features (booking, AI, gift cards…)
--                                on/off site-wide from the admin console.
--   2. notification_banners   — editable announcement / promo bars shown
--                                across the public site and dashboard.
--   3. vouchers + redemptions — coupon/voucher codes the admin can mint
--                                and customers can redeem at checkout.
--   4. push_subscriptions     — Web Push (VAPID) subscriptions so admins
--                                can broadcast notifications to users.
--
-- All tables use IF NOT EXISTS so re-running the script is a no-op.
-- ---------------------------------------------------------------------------

-- 1. Feature flags ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS feature_flags (
  key          VARCHAR(80) PRIMARY KEY,
  label        VARCHAR(160) NOT NULL,
  description  TEXT,
  -- Some features are user-facing (booking, AI), some are admin-facing
  -- (broadcast, vouchers). Scope just lets the admin filter the list.
  scope        VARCHAR(40) NOT NULL DEFAULT 'site', -- 'site' | 'dashboard' | 'admin'
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by   VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed the canonical feature set. ON CONFLICT keeps existing values, so
-- toggling a flag off and re-running the migration won't reset it.
INSERT INTO feature_flags (key, label, description, scope, enabled) VALUES
  ('booking',        'Online booking',         'Allow customers to book appointments online',                  'site',      TRUE),
  ('ai_chat',        'Derma AI chat',          'Floating AI assistant on every page',                          'site',      TRUE),
  ('ai_voice',       'Derma AI voice',         'Voice / Live mode inside Derma AI',                            'site',      TRUE),
  ('gift_cards',     'Gift cards',             'Public gift card purchase + redemption flow',                  'site',      TRUE),
  ('vouchers',       'Vouchers & coupons',     'Voucher code redemption at checkout',                          'site',      TRUE),
  ('newsletter',     'Newsletter signup',      'Footer newsletter capture + welcome email',                    'site',      TRUE),
  ('referrals',      'Referral program',       'User referral codes and rewards',                              'site',      FALSE),
  ('wallet',         'Customer wallet',        'In-app wallet with funding and payments',                      'dashboard', TRUE),
  ('push_notifs',    'Push notifications',     'Web Push notifications for replies, promos and reminders',    'dashboard', TRUE),
  ('live_chat',      'Live agent chat',        'WhatsApp / live agent buttons in support',                     'dashboard', TRUE),
  ('signups',        'New account signups',    'Whether new users can register an account',                    'site',      TRUE),
  ('reviews',        'Public reviews',         'Public reviews shown on service & location pages',             'site',      TRUE),
  ('maintenance',    'Maintenance mode',       'When ON, the public site shows a maintenance banner',          'site',      FALSE)
ON CONFLICT (key) DO NOTHING;


-- 2. Notification banners ---------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message     TEXT NOT NULL,
  link_url    TEXT,
  link_text   VARCHAR(80),
  -- Visual variant: info (purple), success (emerald), warning (amber),
  -- danger (rose), promo (purple solid). Kept as a free string so we
  -- never have to migrate to add new variants.
  variant     VARCHAR(20) NOT NULL DEFAULT 'info',
  -- Where to render: 'site' = whole public site, 'dashboard' = user
  -- dashboard, 'admin' = admin console, 'all' = everywhere.
  scope       VARCHAR(20) NOT NULL DEFAULT 'site',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Optional schedule. If both are NULL the banner is permanent until
  -- toggled off.
  starts_at   TIMESTAMP,
  ends_at     TIMESTAMP,
  -- Whether users can dismiss it. Dismissals are tracked client-side
  -- in localStorage keyed by banner id.
  dismissible BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_banners_active
  ON notification_banners (is_active, scope);


-- 3. Vouchers & redemptions -------------------------------------------------

CREATE TABLE IF NOT EXISTS vouchers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40) UNIQUE NOT NULL,
  label         VARCHAR(160),
  description   TEXT,
  -- 'percent' (value is 1-100) or 'fixed' (value is naira amount)
  type          VARCHAR(10) NOT NULL DEFAULT 'percent',
  value         NUMERIC(12,2) NOT NULL,
  -- Optional cap on percent discounts (e.g. 20% off but max ₦5,000)
  max_discount  NUMERIC(12,2),
  min_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Total uses allowed across all customers. NULL = unlimited.
  max_uses      INTEGER,
  used_count    INTEGER NOT NULL DEFAULT 0,
  -- Per-user cap. NULL = unlimited.
  per_user_limit INTEGER DEFAULT 1,
  -- Optional scope: which products/services this applies to. Free-text
  -- so we don't have to migrate when new categories appear.
  applies_to    VARCHAR(40) NOT NULL DEFAULT 'all',
  starts_at     TIMESTAMP,
  expires_at    TIMESTAMP,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code      ON vouchers (LOWER(code));
CREATE INDEX IF NOT EXISTS idx_vouchers_active    ON vouchers (is_active);
CREATE INDEX IF NOT EXISTS idx_vouchers_expires   ON vouchers (expires_at);

CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id      UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  user_id         VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  user_email      VARCHAR(255),
  amount_before   NUMERIC(12,2),
  amount_discount NUMERIC(12,2),
  -- Free-text reference (booking id, order id, transaction ref…).
  reference       VARCHAR(120),
  redeemed_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_voucher ON voucher_redemptions (voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user    ON voucher_redemptions (user_id);


-- 4. Push subscriptions -----------------------------------------------------

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  endpoint     TEXT UNIQUE NOT NULL,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);


-- 5. Notification preferences (per-user opt-out) ----------------------------
-- Adds two columns to user_notifications-related preferences so users can
-- mute push or in-app channels independently of the global feature flag.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id     VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  inapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);


-- 6. Extend user_notifications with a few extras the broadcast system needs
-- (priority + an action url). Wrapped in DO blocks so re-runs don't error
-- if the columns already exist.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='user_notifications' AND column_name='action_url'
  ) THEN
    ALTER TABLE user_notifications ADD COLUMN action_url TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='user_notifications' AND column_name='priority'
  ) THEN
    ALTER TABLE user_notifications ADD COLUMN priority VARCHAR(10) NOT NULL DEFAULT 'normal';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='user_notifications' AND column_name='broadcast_id'
  ) THEN
    ALTER TABLE user_notifications ADD COLUMN broadcast_id UUID;
  END IF;
END $$;
