-- Full Database Migration for DermaSpace
-- This script safely creates all tables with proper handling for existing structures

-- Drop existing tables in reverse dependency order (to start fresh)
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS gift_card_requests CASCADE;
DROP TABLE IF EXISTS admin_replies CASCADE;
DROP TABLE IF EXISTS staff_invitations CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  wallet_onboarding_seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. User sessions table
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- 3. User preferences table
CREATE TABLE user_preferences (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  skin_type VARCHAR(50),
  skin_concerns TEXT[],
  allergies TEXT[],
  current_routine TEXT,
  budget_range VARCHAR(50),
  notification_emails BOOLEAN DEFAULT TRUE,
  notification_sms BOOLEAN DEFAULT FALSE,
  notification_promotions BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Consultations table
CREATE TABLE consultations (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  location VARCHAR(100) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time VARCHAR(20) NOT NULL,
  concerns JSONB DEFAULT '[]',
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Contact messages table
CREATE TABLE contact_messages (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'unread',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Newsletter subscribers table
CREATE TABLE newsletter_subscribers (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Staff invitations table
CREATE TABLE staff_invitations (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staff',
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Admin replies table
CREATE TABLE admin_replies (
  id VARCHAR(36) PRIMARY KEY,
  message_type VARCHAR(20) NOT NULL,
  message_id VARCHAR(36) NOT NULL,
  admin_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Activity log table
CREATE TABLE activity_log (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(36),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Gift card requests table
CREATE TABLE gift_card_requests (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  sender_name VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  message TEXT,
  delivery_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. Surveys table
CREATE TABLE surveys (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  target_audience VARCHAR(50) DEFAULT 'all',
  created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. Survey responses table
CREATE TABLE survey_responses (
  id VARCHAR(36) PRIMARY KEY,
  survey_id VARCHAR(36) REFERENCES surveys(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 13. User notifications table
CREATE TABLE user_notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_consultations_email ON consultations(email);
CREATE INDEX idx_consultations_date ON consultations(appointment_date);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_email ON contact_messages(email);
CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);
CREATE INDEX idx_gift_card_status ON gift_card_requests(status);
CREATE INDEX idx_surveys_active ON surveys(is_active);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_read ON user_notifications(read);
