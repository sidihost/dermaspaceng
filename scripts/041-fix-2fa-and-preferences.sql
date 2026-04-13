-- Migration: Fix 2FA, preferences, and user profile issues

-- 1. Ensure welcome_dismissed column exists in user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS welcome_dismissed BOOLEAN DEFAULT FALSE;

-- 2. Ensure user_2fa_settings table has proper structure
-- Check if the table exists and has all required columns
DO $$
BEGIN
  -- Make sure totp_enabled defaults to false and is not null
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_2fa_settings') THEN
    -- Update any null totp_enabled to false
    UPDATE user_2fa_settings SET totp_enabled = false WHERE totp_enabled IS NULL;
    
    -- Ensure backup_codes column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_2fa_settings' AND column_name = 'backup_codes') THEN
      ALTER TABLE user_2fa_settings ADD COLUMN backup_codes TEXT;
    END IF;
  END IF;
END $$;

-- 3. Ensure username column exists and is properly indexed in users table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE users ADD COLUMN username VARCHAR(50);
  END IF;
END $$;

-- Create unique index on username (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL;

-- 4. Ensure requires_2fa column exists on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_2fa BOOLEAN DEFAULT FALSE;

-- 5. Add index for faster 2FA lookups
CREATE INDEX IF NOT EXISTS idx_user_2fa_user_enabled ON user_2fa_settings(user_id, totp_enabled);

-- 6. Verify and fix any orphaned 2FA settings
-- If a user has 2FA enabled in user_2fa_settings, make sure users.requires_2fa is also true
UPDATE users u
SET requires_2fa = true
WHERE EXISTS (
  SELECT 1 FROM user_2fa_settings s 
  WHERE s.user_id = u.id AND s.totp_enabled = true
)
AND (u.requires_2fa IS NULL OR u.requires_2fa = false);

-- Debug: Show 2FA status for verification
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== 2FA Settings Status ===';
  FOR rec IN 
    SELECT u.email, u.requires_2fa, s.totp_enabled, s.backup_codes IS NOT NULL as has_backup_codes
    FROM users u
    LEFT JOIN user_2fa_settings s ON u.id = s.user_id
    WHERE s.totp_enabled = true OR u.requires_2fa = true
    LIMIT 10
  LOOP
    RAISE NOTICE 'User: %, requires_2fa: %, totp_enabled: %, has_backup: %', 
      rec.email, rec.requires_2fa, rec.totp_enabled, rec.has_backup_codes;
  END LOOP;
END $$;
