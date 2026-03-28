-- Create gift card payments table
CREATE TABLE IF NOT EXISTS gift_card_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  design VARCHAR(50) NOT NULL,
  occasion VARCHAR(100) NOT NULL,
  font VARCHAR(50) NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(50),
  sender_name VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  personal_message TEXT,
  delivery_method VARCHAR(20) NOT NULL,
  delivery_date DATE,
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_reference VARCHAR(100) UNIQUE NOT NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gift_card_payments_reference ON gift_card_payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_gift_card_payments_status ON gift_card_payments(payment_status);