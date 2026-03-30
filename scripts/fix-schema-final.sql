-- Add missing columns to contact_messages table
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add missing columns to gift_card_requests table
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add missing columns to activity_log table
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_staff_id ON activity_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_assigned ON contact_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_consultations_assigned ON consultations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_gift_card_requests_assigned ON gift_card_requests(assigned_to);
