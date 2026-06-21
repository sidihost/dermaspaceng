-- ---------------------------------------------------------------------------
-- 660-onboarding-reminder-columns.sql
--
-- Tracking columns for the "pick up where you left off" onboarding reminder
-- (see /api/cron/onboarding-reminders). Mirrors the existing
-- security_reminder_sent / security_reminder_sent_at pair so the cron can
-- email each unverified / half-onboarded user exactly once.
--
--   • onboarding_reminder_sent     — true once we've emailed the nudge,
--                                     so the daily sweep never double-sends.
--   • onboarding_reminder_sent_at  — when we sent it (audit / debugging).
--
-- Idempotent: safe to run repeatedly.
-- ---------------------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_reminder_sent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_reminder_sent_at TIMESTAMPTZ;
