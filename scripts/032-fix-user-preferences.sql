-- Ensure user_preferences table exists with all required columns
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skin_type VARCHAR(50),
  concerns TEXT[],
  preferred_services TEXT[],
  preferred_location VARCHAR(100),
  notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add concerns column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'concerns') THEN
    ALTER TABLE user_preferences ADD COLUMN concerns TEXT[];
  END IF;
  
  -- Add preferred_services column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'preferred_services') THEN
    ALTER TABLE user_preferences ADD COLUMN preferred_services TEXT[];
  END IF;
  
  -- Add preferred_location column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'preferred_location') THEN
    ALTER TABLE user_preferences ADD COLUMN preferred_location VARCHAR(100);
  END IF;
  
  -- Add notifications column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'notifications') THEN
    ALTER TABLE user_preferences ADD COLUMN notifications BOOLEAN DEFAULT true;
  END IF;
  
  -- Add skin_type column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'skin_type') THEN
    ALTER TABLE user_preferences ADD COLUMN skin_type VARCHAR(50);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
