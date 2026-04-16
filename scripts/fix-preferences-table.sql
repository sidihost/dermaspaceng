-- Ensure welcome_dismissed column exists in user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS welcome_dismissed BOOLEAN DEFAULT FALSE;

-- Ensure concerns and preferred_services are TEXT[] arrays
-- If they were created as VARCHAR or TEXT, we need to alter them
DO $$
BEGIN
    -- Check if concerns column is not TEXT[] and alter it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'concerns' 
        AND data_type != 'ARRAY'
    ) THEN
        ALTER TABLE user_preferences ALTER COLUMN concerns TYPE TEXT[] USING CASE WHEN concerns IS NULL THEN NULL ELSE ARRAY[concerns::TEXT] END;
    END IF;

    -- Check if preferred_services column is not TEXT[] and alter it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'preferred_services' 
        AND data_type != 'ARRAY'
    ) THEN
        ALTER TABLE user_preferences ALTER COLUMN preferred_services TYPE TEXT[] USING CASE WHEN preferred_services IS NULL THEN NULL ELSE ARRAY[preferred_services::TEXT] END;
    END IF;
END $$;

-- Show current table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;
