-- Fix survey_responses table columns
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS overall_rating INTEGER;

-- Fix gift_card_requests table columns  
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS message TEXT;

-- Fix contact_messages status column to use proper enum-like values
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Create indexes for better query performance on stats
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_gift_card_requests_status ON gift_card_requests(status);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at);
