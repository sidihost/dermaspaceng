-- Activity log table for tracking all actions in the system
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL, -- User who performed or is affected by the action
  staff_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL, -- Staff/admin who performed the action
  action_type VARCHAR(100) NOT NULL, -- e.g., 'user_registered', 'consultation_created', 'complaint_resolved'
  entity_type VARCHAR(50), -- 'user', 'complaint', 'gift_card', 'consultation', 'survey', etc.
  entity_id VARCHAR(36), -- ID of the affected entity
  description TEXT, -- Human-readable description
  metadata JSONB DEFAULT '{}', -- Additional structured data
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_staff ON activity_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
