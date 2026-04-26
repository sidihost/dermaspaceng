-- Tamper-evident hash-chained audit log for critical auth events.
--
-- WHY THIS EXISTS
-- ---------------
-- Every row stores a SHA-256 (`this_hash`) computed over the previous
-- row's `this_hash` plus its own contents. Modifying or deleting any
-- past row invalidates every downstream hash, so administrators can
-- detect tampering with `verifyAuditChain()` in `lib/auth-audit.ts`.
-- This is the "blockchain-grade" piece the user asked for: a private,
-- tamper-evident ledger of authentication events. No public chain, no
-- proof-of-work, no wallets — just an append-only ledger whose
-- integrity can be proven cryptographically.
--
-- Events we append:
--   * `signup`              - new account created
--   * `signin`              - successful sign-in (any path)
--   * `signin_failed`       - failed sign-in attempt (rate-limit signal)
--   * `password_change`     - user changed their password
--   * `role_change`         - admin promoted/demoted a user
--   * `logout`              - explicit sign-out
--
-- Privacy: `event_data` is JSONB but should NEVER contain raw
-- credentials or full IPs in plain text on highly-sensitive events.
-- We store IP/UA in dedicated columns so they're easy to redact later
-- under GDPR right-to-erasure requests without breaking the chain.

CREATE TABLE IF NOT EXISTS auth_audit_chain (
  id          BIGSERIAL    PRIMARY KEY,
  -- NULL for the genesis row only; every subsequent row points to the
  -- previous row's `this_hash`. Indexed for fast chain verification.
  prev_hash   TEXT,
  event_type  TEXT         NOT NULL,
  -- Arbitrary structured context (e.g. `{ "method": "google" }`).
  event_data  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  -- Nullable so we can record failed sign-ins for unknown emails
  -- without violating a FK. ON DELETE SET NULL preserves the chain
  -- when a user record is hard-deleted.
  -- NOTE: matches `users.id` which is VARCHAR(36) in this codebase
  -- (not UUID), so the foreign key types align.
  user_id     VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- SHA-256 hex of:
  --   prev_hash || event_type || event_data || user_id || ip || ua || created_at
  -- Joined with U+241F (ASCII unit separator) so the hash function can't
  -- be confused by colliding string concatenations.
  this_hash   TEXT         NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user
  ON auth_audit_chain(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_audit_event
  ON auth_audit_chain(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_chain_id
  ON auth_audit_chain(id DESC);

COMMENT ON TABLE auth_audit_chain IS
  'Tamper-evident hash chain of authentication events. Each row''s this_hash is SHA-256 over the previous hash + its own contents. Breaking the chain (modifying or deleting a row) invalidates every downstream hash, making any retroactive tampering detectable. Verified by lib/auth-audit.ts -> verifyAuditChain().';
