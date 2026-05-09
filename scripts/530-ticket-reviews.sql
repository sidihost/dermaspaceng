-- Ticket reviews
-- ----------------------------------------------------------------------------
-- Mirrors the "How did we do?" prompt big-tech support tools (Apple, Google,
-- Intercom, Zendesk) drop in once a ticket is resolved or closed. The
-- customer-facing ticket detail page renders an inline review card under the
-- thread so we can capture CSAT (1–5 stars), an optional helpfulness flag,
-- and a free-text comment WITHOUT forcing the user out to a separate survey.
--
-- One review per ticket — re-submitting overwrites the previous one (the
-- API uses ON CONFLICT (ticket_id) DO UPDATE), which matches how Apple's
-- own support flow lets you change your rating until the ticket is archived.
CREATE TABLE IF NOT EXISTS ticket_reviews (
  id           SERIAL PRIMARY KEY,
  ticket_id    VARCHAR(20) NOT NULL UNIQUE
                 REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  user_id      VARCHAR(255) NOT NULL,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  was_helpful  BOOLEAN,
  body         TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_reviews_ticket_id ON ticket_reviews(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reviews_user_id  ON ticket_reviews(user_id);
