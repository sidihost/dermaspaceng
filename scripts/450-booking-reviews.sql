-- 450-booking-reviews.sql
-- ----------------------------------------------------------------------------
-- Customer reviews for completed bookings.
--
-- One review per booking (UNIQUE on booking_id) so a client can edit
-- their entry but never rate the same visit twice. The review is only
-- writable by the booking's owner, and only when the booking has been
-- marked `completed` — both invariants live in the API layer.
--
-- We keep the schema slightly richer than a single 1–5 star value so
-- the staff console can show actionable feedback (clean facility?
-- friendly staff? felt like good value?) without forcing the client
-- to fill all of them.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking_reviews (
  id                 VARCHAR PRIMARY KEY DEFAULT (
                       'rev_' || replace(gen_random_uuid()::text, '-', '')
                     ),
  booking_id         VARCHAR NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id            VARCHAR REFERENCES users(id) ON DELETE SET NULL,

  -- Mandatory headline rating (1..5 stars). The other three are
  -- optional facets so the form stays short on mobile but power
  -- reviewers can still give us granular feedback.
  rating             INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  staff_rating       INTEGER CHECK (staff_rating BETWEEN 1 AND 5),
  value_rating       INTEGER CHECK (value_rating BETWEEN 1 AND 5),

  body               TEXT,
  would_recommend    BOOLEAN,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT booking_reviews_unique_per_booking UNIQUE (booking_id)
);

-- Recent reviews per user (the client's "my reviews" page if we ever
-- build one, plus the dashboard activity feed).
CREATE INDEX IF NOT EXISTS idx_booking_reviews_user
  ON booking_reviews (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Already covered by the UNIQUE constraint, but spelt out for the
-- staff appointment detail join which filters by booking_id only.
CREATE INDEX IF NOT EXISTS idx_booking_reviews_booking
  ON booking_reviews (booking_id);
