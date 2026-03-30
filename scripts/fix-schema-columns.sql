-- Fix missing columns in consultations table
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;

-- Fix activity_log columns to match API expectations
-- The API uses staff_id, action_type instead of user_id, action
ALTER TABLE activity_log
ADD COLUMN IF NOT EXISTS staff_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE activity_log
ADD COLUMN IF NOT EXISTS action_type VARCHAR(100);

ALTER TABLE activity_log
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for assigned_to
CREATE INDEX IF NOT EXISTS idx_consultations_assigned ON consultations(assigned_to);

-- Create index for staff_id
CREATE INDEX IF NOT EXISTS idx_activity_log_staff ON activity_log(staff_id);
