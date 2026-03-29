-- Update contact_messages table with new columns for admin management
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open';
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(36);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS category VARCHAR(50); -- 'complaint', 'inquiry', 'feedback', 'other'

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_priority ON contact_messages(priority);
CREATE INDEX IF NOT EXISTS idx_contact_messages_assigned ON contact_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON contact_messages(category);
