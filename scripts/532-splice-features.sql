-- 532-splice-features.sql
--
-- Salon-management ("Splice") feature schema:
--   * loyalty_programs        — admin-configurable rewards programme
--   * loyalty_redemptions     — actual redemptions, drives the donut
--   * salon_expenses          — operating expenses for Money > Expense
--   * salon_settings          — single-row config (virtual NUBAN, brand)
--
-- All FKs to users.id stay VARCHAR(36) to match the existing users
-- schema (see scripts/002-create-users.sql) — declaring them UUID
-- would crash the migration runner (lesson from 531-search-history).

-- 1. Loyalty programme config (single active row at a time) ---------
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id                 VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name               VARCHAR(120) NOT NULL DEFAULT 'Default loyalty programme',
  active             BOOLEAN      NOT NULL DEFAULT TRUE,
  reward_label       VARCHAR(60)  NOT NULL DEFAULT '10% off',
  reward_percent     INTEGER      NOT NULL DEFAULT 10  CHECK (reward_percent BETWEEN 0 AND 100),
  reward_threshold   INTEGER      NOT NULL DEFAULT 100000, -- naira spent to unlock
  points_per_naira   NUMERIC(8,4) NOT NULL DEFAULT 0.001,  -- 1 pt per ₦1,000
  card_title         VARCHAR(60)  NOT NULL DEFAULT 'LOYALTY CARD',
  brand_subtitle     VARCHAR(120) NOT NULL DEFAULT 'powered by Dermaspace',
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed one row so the dashboard has something to render on a fresh
-- database. ON CONFLICT keeps reruns idempotent.
INSERT INTO loyalty_programs (id, name)
VALUES ('default', 'Default loyalty programme')
ON CONFLICT (id) DO NOTHING;

-- 2. Issued points + redemptions ------------------------------------
-- We *issue* by computing from spend at read time (cheap, accurate),
-- but redemptions are real events and must be persisted.
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id      VARCHAR(36) NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  points_redeemed INTEGER     NOT NULL CHECK (points_redeemed > 0),
  reward_value    INTEGER     NOT NULL DEFAULT 0, -- naira value of reward
  booking_id      VARCHAR(36) REFERENCES bookings(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS loyalty_redemptions_user_idx
  ON loyalty_redemptions (user_id, created_at DESC);

-- 3. Operating expenses ---------------------------------------------
-- Drives Money > Expense. Categories are open strings (we do not
-- enum-lock so non-engineers can add categories without a migration).
CREATE TABLE IF NOT EXISTS salon_expenses (
  id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category        VARCHAR(60) NOT NULL,
  description     TEXT        NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by     VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  receipt_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS salon_expenses_paid_at_idx
  ON salon_expenses (paid_at DESC);

-- 4. Salon settings (single-row config) -----------------------------
-- Virtual NUBAN displayed on the Money page. The single-row pattern
-- (id='singleton') keeps lookup trivial and avoids accidentally
-- shipping a multi-tenant API before we're ready for one.
CREATE TABLE IF NOT EXISTS salon_settings (
  id                       VARCHAR(36) PRIMARY KEY DEFAULT 'singleton',
  business_name            VARCHAR(120) NOT NULL DEFAULT 'Dermaspace',
  virtual_account_bank     VARCHAR(60)  NOT NULL DEFAULT 'Wema Bank',
  virtual_account_name     VARCHAR(120) NOT NULL DEFAULT 'Dermaspace Operations',
  virtual_account_number   VARCHAR(20)  NOT NULL DEFAULT '',
  default_branch_label     VARCHAR(60)  NOT NULL DEFAULT 'Lekki Branch',
  vat_percent              NUMERIC(5,2) NOT NULL DEFAULT 7.50,
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
INSERT INTO salon_settings (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;
