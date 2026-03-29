-- Update consultations table with new columns for admin management
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(36);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_assigned ON consultations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_consultations_user ON consultations(user_id);
