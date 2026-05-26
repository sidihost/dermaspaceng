-- Adds budget + low-balance-threshold columns to wallet_settings.
--
-- Bug: /api/wallet/settings was UPDATEing `monthly_budget`,
-- `budget_alert_threshold`, and `low_balance_alert` (numeric) on
-- `wallet_settings`, but those columns either lived on the `wallets`
-- table (monthly_budget, budget_alert_threshold) or were boolean
-- (low_balance_alert). Saving from /dashboard/settings therefore
-- always returned "Failed to save settings".
--
-- This migration aligns the schema with the rest of the code:
--   * monthly_budget and budget_alert_threshold are owned by
--     wallet_settings (single source of truth for user preferences).
--   * low_balance_threshold (numeric) already existed on
--     wallet_settings — see scripts/001-wallet-system.sql line 80.
--     Code now writes to that column instead of low_balance_alert.

ALTER TABLE wallet_settings
  ADD COLUMN IF NOT EXISTS monthly_budget DECIMAL(12, 2);

ALTER TABLE wallet_settings
  ADD COLUMN IF NOT EXISTS budget_alert_threshold INTEGER DEFAULT 80;

-- Backfill from the legacy wallets columns so existing users keep
-- their previously-set budget. Safe to re-run because the COALESCE
-- check skips rows that already have a wallet_settings value.
UPDATE wallet_settings ws
   SET monthly_budget         = COALESCE(ws.monthly_budget, w.monthly_budget),
       budget_alert_threshold = COALESCE(ws.budget_alert_threshold, w.budget_alert_threshold)
  FROM wallets w
 WHERE w.user_id = ws.user_id
   AND (ws.monthly_budget IS NULL OR ws.budget_alert_threshold IS NULL);
