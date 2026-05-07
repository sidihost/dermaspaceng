-- ---------------------------------------------------------------------------
-- 440-inventory.sql
-- ---------------------------------------------------------------------------
-- Inventory & Stock Alerts
--
-- Tracks consumables and retail SKUs across spa locations. The schema is
-- intentionally small but expressive enough to power:
--
--   • A list view with on-hand totals, low / out-of-stock pills.
--   • Per-item detail with full movement history (adjust, restock,
--     consume, sale).
--   • A rollup endpoint that the admin sidebar can poll to surface a
--     "low stock" badge (any item where current_stock <= reorder_level).
--
-- Items can optionally be scoped to a single location_id; NULL means the
-- item is shared (admin office supplies, etc.). Movements always carry
-- the actor who made them so the audit trail is meaningful.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  sku             TEXT,
  category        TEXT NOT NULL DEFAULT 'consumable',
  unit            TEXT NOT NULL DEFAULT 'unit',
  current_stock   INTEGER NOT NULL DEFAULT 0,
  reorder_level   INTEGER NOT NULL DEFAULT 5,
  unit_cost_kobo  BIGINT,
  location_id     TEXT,
  notes           TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_restocked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS inventory_items_location_idx
  ON inventory_items (location_id) WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS inventory_items_low_idx
  ON inventory_items (current_stock, reorder_level)
  WHERE is_archived = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_sku_uniq
  ON inventory_items (LOWER(sku))
  WHERE sku IS NOT NULL AND is_archived = FALSE;

-- Every change to current_stock writes a movement row. We never
-- mutate stock without one — makes the history audit-friendly.
CREATE TABLE IF NOT EXISTS inventory_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  -- Positive for additions (restock, return), negative for removals
  -- (sale, consumption, waste). The sign always matches the
  -- direction the on-hand count shifted.
  change_amount INTEGER NOT NULL,
  reason        TEXT NOT NULL DEFAULT 'adjustment',
  note          TEXT,
  -- Resulting on-hand count after this movement applied. Stored so
  -- the timeline UI doesn't need to recompute running totals.
  resulting_stock INTEGER NOT NULL,
  performed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_movements_item_idx
  ON inventory_movements (item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_movements_recent_idx
  ON inventory_movements (created_at DESC);
