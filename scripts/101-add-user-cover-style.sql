-- Adds a per-user profile "cover style" slug.
--
-- Rather than letting users upload images (which we explicitly removed
-- for avatars), we let them pick from a curated set of brand-aligned
-- CSS/SVG cover designs. The column stores the chosen slug (e.g.
-- 'aurora', 'mesh', 'waves'). When NULL we render a deterministic
-- preset picked from the user's id so every profile still gets a
-- unique, beautiful cover out of the box.
--
-- Keeping this as free-form TEXT (rather than an enum) means adding
-- new cover designs later doesn't require another migration — we just
-- ship the new preset in code.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cover_style TEXT;
