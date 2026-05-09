-- ---------------------------------------------------------------------------
-- 470-service-catalog-extensions.sql
--
-- Admin-managed extensions to the services catalog.
--
-- Architecture
-- ------------
-- The base catalog still ships in `lib/services-catalog.ts` (code is the
-- fastest, most cache-friendly source for ~40 stable treatments). This
-- table layer sits ON TOP and lets admins:
--
--   1. Add brand-new categories without a deploy (e.g. "Skin Coaching").
--   2. Add brand-new treatments to existing categories
--      (e.g. add "Carbon Peel" to Facial Treatments).
--   3. Override any field on a code-defined entry — set
--      `override_for_slug` to the existing slug to mark this row as
--      a replacement. The merger function picks the override over the
--      code entry.
--   4. Disable a code-defined treatment by inserting a stub row with
--      `override_for_slug = '<slug>'` and `is_active = FALSE`.
--
-- Read path
-- ---------
-- `lib/services-catalog-db.ts` ⇒ `getMergedCatalog()` reads both tables,
-- merges with the code catalog, and returns the same shape callers
-- already expect from `SERVICES_CATALOG`. Booking, /services, and the
-- chatbot can all switch over piecemeal.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_categories_ext (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  tagline VARCHAR(280) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- When non-null, this row is an OVERRIDE for the code-defined
  -- category with the same slug. A row with override_for_slug NULL
  -- and a slug that doesn't match any code category is treated as a
  -- brand-new category.
  override_for_slug VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(36),
  updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS service_treatments_ext (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The category this treatment belongs to. We reference by slug so
  -- admins can drop a new treatment into a code-defined category
  -- (e.g. category_slug = 'facial-treatments') as easily as into a
  -- DB-defined one.
  category_slug VARCHAR(120) NOT NULL,
  -- Treatment slug (kebab-case). Unique within a category. Used as
  -- the canonical anchor for permalinks and as the override key.
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(200) NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  price_naira INT NOT NULL CHECK (price_naira >= 0),
  description TEXT NOT NULL DEFAULT '',
  popular BOOLEAN NOT NULL DEFAULT FALSE,
  -- Free-form tags. We normalise to a JSONB array of strings so
  -- callers don't need to deal with TEXT[] driver quirks.
  concerns JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 100,
  -- When non-null, this row is an OVERRIDE for a code treatment with
  -- the same (category_slug, override_for_slug) pair.
  override_for_slug VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(36),
  updated_by VARCHAR(36),
  UNIQUE (category_slug, slug)
);

CREATE INDEX IF NOT EXISTS idx_treatments_ext_category
  ON service_treatments_ext (category_slug)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_categories_ext_active
  ON service_categories_ext (display_order)
  WHERE is_active = TRUE;
