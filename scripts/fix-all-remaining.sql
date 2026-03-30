-- Fix survey_responses table - add all survey fields
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS aesthetics VARCHAR(50);
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS ambiance VARCHAR(50);
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS front_desk VARCHAR(50);
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS staff_professional VARCHAR(50);
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS visit_again VARCHAR(50);
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Fix gift_card_requests table - add all gift card fields
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS design VARCHAR(100);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS design_name VARCHAR(100);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS design_gradient VARCHAR(255);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS occasion VARCHAR(100);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS font VARCHAR(100);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS font_name VARCHAR(100);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS personal_message TEXT;
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Fix contact_messages table - add complaint handling fields
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Fix consultations table - add concern_type for consultation categories
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS concern_type VARCHAR(100);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Fix admin_replies table - add all required fields
ALTER TABLE admin_replies ADD COLUMN IF NOT EXISTS request_type VARCHAR(50);
ALTER TABLE admin_replies ADD COLUMN IF NOT EXISTS request_id INTEGER;
ALTER TABLE admin_replies ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
ALTER TABLE admin_replies ADD COLUMN IF NOT EXISTS staff_id UUID;
ALTER TABLE admin_replies ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- Fix user_notifications table - add all required fields
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON contact_messages(category);
CREATE INDEX IF NOT EXISTS idx_contact_messages_priority ON contact_messages(priority);
CREATE INDEX IF NOT EXISTS idx_gift_card_requests_status ON gift_card_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_replies_request ON admin_replies(request_type, request_id);
