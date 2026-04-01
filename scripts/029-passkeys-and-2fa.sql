-- Migration: Passkeys (WebAuthn) and TOTP 2FA
-- This migration adds support for:
-- 1. Passkey credentials (WebAuthn) for passwordless authentication
-- 2. TOTP 2FA settings for Google/Microsoft Authenticator

-- Passkey credentials table (without foreign key constraint for flexibility)
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_type TEXT, -- 'platform' (built-in) or 'cross-platform' (security key)
  backed_up BOOLEAN DEFAULT false,
  transports TEXT[], -- Array of transports: 'usb', 'nfc', 'ble', 'internal'
  name TEXT, -- User-friendly name for the passkey (e.g., "iPhone", "MacBook")
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User 2FA settings table (without foreign key constraint for flexibility)
CREATE TABLE IF NOT EXISTS user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- TOTP settings
  totp_enabled BOOLEAN DEFAULT false,
  totp_secret TEXT, -- Encrypted TOTP secret
  totp_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Backup codes (encrypted, comma-separated)
  backup_codes TEXT,
  backup_codes_generated_at TIMESTAMP WITH TIME ZONE,
  backup_codes_used INTEGER DEFAULT 0,
  
  -- Passkey settings
  passkey_enabled BOOLEAN DEFAULT false,
  passkey_only BOOLEAN DEFAULT false, -- If true, only allow passkey login (no password)
  
  -- WebAuthn challenge storage (temporary, for registration/auth flow)
  current_challenge TEXT,
  challenge_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  last_2fa_prompt_at TIMESTAMP WITH TIME ZONE, -- For reminder system
  security_setup_dismissed_at TIMESTAMP WITH TIME ZONE, -- If user dismissed setup prompt
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add 2FA requirement column to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'requires_2fa'
  ) THEN
    ALTER TABLE users ADD COLUMN requires_2fa BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id ON passkey_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_credential_id ON passkey_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_user_id ON user_2fa_settings(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_passkey_credentials_updated_at ON passkey_credentials;
CREATE TRIGGER update_passkey_credentials_updated_at
  BEFORE UPDATE ON passkey_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_2fa_settings_updated_at ON user_2fa_settings;
CREATE TRIGGER update_user_2fa_settings_updated_at
  BEFORE UPDATE ON user_2fa_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
