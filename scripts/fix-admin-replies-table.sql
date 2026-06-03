-- Fix admin_replies so consultation / complaint / gift-card admin replies
-- actually persist.
--
-- Root cause of "my reply never shows on the admin side":
--   1. The API writes the body to `reply_text` but the table also had legacy
--      NOT NULL columns (`id`, `message_type`, `message_id`) with no defaults,
--      so every INSERT threw a constraint violation, the POST 500'd, and the
--      optimistic row rolled back — the admin saw nothing.
--   2. `admin_replies.id` had no default, so the app couldn't omit it.
--
-- This migration gives `id` a UUID default and relaxes the unused legacy
-- columns so the existing INSERT (id-less) succeeds.

ALTER TABLE admin_replies ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE admin_replies ALTER COLUMN message_type DROP NOT NULL;
ALTER TABLE admin_replies ALTER COLUMN message_id DROP NOT NULL;
