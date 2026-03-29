-- Survey responses table
CREATE TABLE IF NOT EXISTS survey_responses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  aesthetics VARCHAR(50),
  ambiance VARCHAR(50),
  front_desk VARCHAR(50),
  staff_professional VARCHAR(50),
  appointment_delay VARCHAR(50),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  visit_again VARCHAR(50),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_rating ON survey_responses(overall_rating);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created ON survey_responses(created_at DESC);
