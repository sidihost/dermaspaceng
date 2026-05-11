-- ---------------------------------------------------------------------------
-- Firewall block log.
--
-- The application firewall in `lib/firewall.ts` runs on every request
-- (page + API) and rejects scanner probes, traversal attempts, SQLi /
-- XSS payloads, and known pen-test user agents. Until now those
-- rejections were dropped on the floor — the admin had no way to see
-- "what's hitting the door and getting blocked". This table captures
-- a compact record of every block so the dashboard Security Log can
-- show IP, attack pattern, and timestamp at a glance.
--
-- Schema notes:
--   * `reason` mirrors the firewall verdict ("bad-path", "sqli",
--     "xss", "traversal", "bad-ua", "oversize-url", etc.) so we can
--     filter by class.
--   * `path` stores the full pathname + query so the operator can
--     see exactly what the scanner was poking at.
--   * `user_agent` is truncated to 255 chars to keep the row narrow
--     while still preserving identifying fingerprints.
--   * `ip` is text (IPv4 / IPv6 both fit) rather than INET so we
--     don't crash on the rare "unknown" header value.
--   * No FK to users — these requests aren't authenticated by
--     definition. A separate column could be added later if we want
--     to record "this happened during a logged-in session".
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS firewall_blocks (
  id           BIGSERIAL PRIMARY KEY,
  ip           TEXT,
  user_agent   TEXT,
  method       TEXT NOT NULL,
  path         TEXT NOT NULL,
  reason       TEXT NOT NULL,
  status_code  INT  NOT NULL DEFAULT 403,
  country      TEXT,
  blocked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recent-first scan — the only access pattern we care about for the
-- Security Log section is "show me the last N blocks". A DESC index
-- on blocked_at makes that O(log n) regardless of table size.
CREATE INDEX IF NOT EXISTS firewall_blocks_blocked_at_idx
  ON firewall_blocks (blocked_at DESC);

-- Optional secondary index for "show me all blocks from this IP"
-- (used when investigating a specific attacker).
CREATE INDEX IF NOT EXISTS firewall_blocks_ip_idx
  ON firewall_blocks (ip);
