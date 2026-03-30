-- Fix consultations table to match API expectations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS appointment_time VARCHAR(50);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS concerns JSONB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consultations_email ON consultations(email);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment_date ON consultations(appointment_date);
