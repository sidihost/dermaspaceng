-- Admin replies table for tracking all responses to user requests
CREATE TABLE IF NOT EXISTS admin_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type VARCHAR(50) NOT NULL, -- 'complaint', 'consultation', 'gift_card', 'contact'
  request_id INTEGER NOT NULL, -- References the ID in respective table
  user_email VARCHAR(255) NOT NULL, -- Email of the user who submitted the request
  staff_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL, -- Admin/staff who replied
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes vs user-visible replies
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_replies_request ON admin_replies(request_type, request_id);
CREATE INDEX IF NOT EXISTS idx_admin_replies_staff ON admin_replies(staff_id);
CREATE INDEX IF NOT EXISTS idx_admin_replies_created ON admin_replies(created_at DESC);
