-- ---------------------------------------------------------------------------
-- 420 — Track partial signup progress on the users table.
--
-- The admin console needs to see *where* a user dropped off during the
-- 4-step "complete profile" flow (Photo → About → Username → Polish),
-- not just whether they finished. Without this column we could only
-- derive "done / not done" from `profile_complete` — the team kept
-- asking "they signed up, what step are they on?" and we couldn't say.
--
-- Step contract:
--   0 — just signed up, hasn't entered the wizard
--   1 — past Photo step (saw / skipped avatar selection)
--   2 — past About step (entered first name + phone)
--   3 — past Username step (claimed a handle)
--   4 — finished Polish step → profile_complete is also flipped to true
--
-- Backfill rule: anyone with `profile_complete = true` gets step 4 so
-- the admin list reads correctly for users who signed up before this
-- column existed.
-- ---------------------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_step SMALLINT NOT NULL DEFAULT 0;

UPDATE users
   SET signup_step = 4
 WHERE profile_complete = TRUE
   AND signup_step < 4;

-- Best-effort backfill for users who started but never finished — based
-- on the actual data we already have. Order matters: progressively
-- broader conditions, so the *highest* matching step wins.
UPDATE users
   SET signup_step = GREATEST(signup_step, 3)
 WHERE profile_complete = FALSE
   AND username IS NOT NULL
   AND username <> '';

UPDATE users
   SET signup_step = GREATEST(signup_step, 2)
 WHERE profile_complete = FALSE
   AND phone IS NOT NULL
   AND phone <> ''
   AND first_name IS NOT NULL
   AND first_name <> '';

UPDATE users
   SET signup_step = GREATEST(signup_step, 1)
 WHERE profile_complete = FALSE
   AND avatar_url IS NOT NULL
   AND avatar_url <> '';
