-- Add username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create a function to generate a default username from first_name + random suffix
CREATE OR REPLACE FUNCTION generate_username(first_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  new_username TEXT;
  counter INT := 0;
BEGIN
  -- Sanitize: lowercase, remove spaces, keep only alphanumeric
  base_username := LOWER(REGEXP_REPLACE(first_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Ensure minimum length
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  
  new_username := base_username;
  
  -- Check if username exists and add random suffix if needed
  WHILE EXISTS (SELECT 1 FROM users WHERE username = new_username) LOOP
    counter := counter + 1;
    new_username := base_username || counter::TEXT;
  END LOOP;
  
  RETURN new_username;
END;
$$ LANGUAGE plpgsql;
