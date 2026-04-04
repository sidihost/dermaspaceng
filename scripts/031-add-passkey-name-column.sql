-- Migration: Add name column to passkey_credentials if it doesn't exist
-- This ensures the passkey naming feature works correctly

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'passkey_credentials' AND column_name = 'name'
  ) THEN
    ALTER TABLE passkey_credentials ADD COLUMN name TEXT;
  END IF;
END $$;
