-- Add welcome_dismissed column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS welcome_dismissed BOOLEAN DEFAULT FALSE;

-- Update existing rows to mark welcome as dismissed if they have any preferences saved
UPDATE user_preferences 
SET welcome_dismissed = true 
WHERE skin_type IS NOT NULL OR concerns IS NOT NULL OR preferred_services IS NOT NULL;
