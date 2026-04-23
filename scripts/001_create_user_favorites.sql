-- Per-item favorites for the logged-in member.
--
-- The existing user_preferences.preferred_services column stores broad
-- *category* preferences (e.g. "Facials", "Waxing") and is owned by the
-- onboarding flow. This table is a complement to that — it stores the
-- individual things a member has tapped the heart on: a specific
-- treatment ("Hydra Facial"), a package ("Gold Experience · Couple"),
-- or a service category they want to pin ("Body Treatments").
--
-- `item_type` gives us a namespace so we can reuse the same item_id
-- values across different kinds of things without collisions.
--   - 'treatment' : slug-based id like "body-treatments:hydra-facial"
--   - 'package'   : slug-based id like "package:gold-couple"
--   - 'category'  : slug-based id like "category:body-treatments"
--
-- We keep the composite UNIQUE (user_id, item_type, item_id) so the
-- same user can't double-favorite the same thing, and we delete rather
-- than toggle a flag — it keeps the table small and the queries simple.
CREATE TABLE IF NOT EXISTS user_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type VARCHAR(32) NOT NULL,
  item_id VARCHAR(128) NOT NULL,
  item_label VARCHAR(255),
  item_href VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, item_type, item_id)
);

-- Fast lookup for "what has this user favorited" on every page load.
CREATE INDEX IF NOT EXISTS user_favorites_user_idx
  ON user_favorites (user_id);

-- Secondary index for admin / popularity reporting ("most-loved
-- treatments this month") — cheap to maintain, very useful later.
CREATE INDEX IF NOT EXISTS user_favorites_item_idx
  ON user_favorites (item_type, item_id);
