-- Adds `transaction_alerts` to wallet_settings.
--
-- The /dashboard/settings UI exposes four toggles in the Notification
-- Preferences card:
--   - Email Notifications     (wallet_settings.email_notifications)
--   - Transaction Alerts      (wallet_settings.transaction_alerts)  <-- missing
--   - Budget Alerts           (wallet_settings.budget_alerts)
--   - Promotional Emails      (wallet_settings.promotional_emails)
--
-- Scripts 001 + 002 added every column EXCEPT `transaction_alerts`, so
-- saving the toggle returned "Failed to update settings" because the
-- UPDATE referenced a column that didn't exist. This migration plugs
-- the gap with a sensible default (alerts ON), matching the other
-- transaction-related toggle the legacy schema shipped with
-- (`transaction_notifications`, kept for backward compatibility).

ALTER TABLE wallet_settings
  ADD COLUMN IF NOT EXISTS transaction_alerts BOOLEAN DEFAULT true;
