-- Gift card requests table (create if not exists, add new columns if exists)
CREATE TABLE IF NOT EXISTS gift_card_requests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  design VARCHAR(50),
  design_name VARCHAR(100),
  design_gradient VARCHAR(100),
  occasion VARCHAR(50),
  font VARCHAR(50),
  font_name VARCHAR(100),
  recipient_name VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),
  personal_message TEXT,
  delivery_method VARCHAR(50) DEFAULT 'email',
  delivery_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_to VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add columns if table already exists
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(36);
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gift_card_requests_status ON gift_card_requests(status);
CREATE INDEX IF NOT EXISTS idx_gift_card_requests_assigned ON gift_card_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_gift_card_requests_created ON gift_card_requests(created_at DESC);
