-- Dedicated waitlist for the online booking launch.
-- Kept separate from newsletter_subscribers so marketing and product
-- launch lists are never conflated.

CREATE TABLE IF NOT EXISTS booking_waitlist (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'booking_page',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_waitlist_email ON booking_waitlist (email);
CREATE INDEX IF NOT EXISTS idx_booking_waitlist_user_id ON booking_waitlist (user_id);
