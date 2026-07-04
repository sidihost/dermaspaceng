-- ---------------------------------------------------------------------------
-- 720-derma-saas.sql
--
-- Derma AI SaaS — multi-tenant layer that lets other companies license
-- the Dermaspace Derma AI assistant for a flat annual fee (₦35,000/yr),
-- rebrand it, embed it on their own website with a single <script> tag,
-- and train it on their own Q&A knowledge — all running on OUR pooled
-- AI credits (no per-tenant API keys required).
--
-- Tables
-- ------
--   derma_saas_tenants       → one row per licensed company (the account)
--   derma_saas_sessions      → login sessions for the tenant dashboard
--   derma_saas_knowledge     → per-tenant Q&A training entries
--   derma_saas_conversations → widget chat transcripts (analytics/audit)
--
-- Vector data (the actual trained embeddings) lives in Upstash Vector,
-- partitioned by a per-tenant namespace of the form `saas_<tenant_id>`
-- so one company's knowledge can never leak into another's answers.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS derma_saas_tenants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name         VARCHAR(255) NOT NULL,
  contact_name         VARCHAR(255) NOT NULL,
  contact_email        VARCHAR(255) NOT NULL UNIQUE,
  password_hash        TEXT NOT NULL,

  -- Public, non-secret key used by the embed <script> to identify the
  -- tenant. Safe to expose in client HTML. Rotatable.
  public_key           VARCHAR(64) NOT NULL UNIQUE,

  -- Lifecycle: 'pending' (signed up, awaiting activation), 'active'
  -- (paid + live), 'suspended' (disabled by platform admin).
  status               VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Billing (flat annual plan). Stored in kobo for parity with the rest
  -- of the app's money handling. 3,500,000 kobo = ₦35,000.
  plan_price_kobo      BIGINT NOT NULL DEFAULT 3500000,
  subscription_expires_at TIMESTAMPTZ,

  -- Branding (the "rebrand it to their taste" surface).
  brand_name           VARCHAR(120) NOT NULL DEFAULT 'AI Assistant',
  assistant_name       VARCHAR(120) NOT NULL DEFAULT 'Assistant',
  brand_color          VARCHAR(9)   NOT NULL DEFAULT '#7B2D8E',
  welcome_message      TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
  logo_url             TEXT,
  business_context     TEXT,   -- free-form "about us" the AI always knows
  launcher_label       VARCHAR(60) NOT NULL DEFAULT 'Chat with us',
  allowed_domains      TEXT,   -- comma-separated allowlist (empty = any)

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_tenants_public_key ON derma_saas_tenants(public_key);
CREATE INDEX IF NOT EXISTS idx_saas_tenants_status ON derma_saas_tenants(status);

-- Dashboard login sessions for tenant owners.
CREATE TABLE IF NOT EXISTS derma_saas_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES derma_saas_tenants(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saas_sessions_tenant ON derma_saas_sessions(tenant_id);

-- Per-tenant training knowledge (paste-text Q&A entries). The canonical
-- copy lives here; embeddings are mirrored into Upstash Vector under the
-- tenant namespace whenever a row is created/updated/deleted.
CREATE TABLE IF NOT EXISTS derma_saas_knowledge (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES derma_saas_tenants(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_knowledge_tenant ON derma_saas_knowledge(tenant_id);

-- Widget chat transcripts — one row per end-user message/answer pair.
-- Lightweight analytics + audit trail so tenants can see what their
-- visitors ask. No PII beyond what the visitor types.
CREATE TABLE IF NOT EXISTS derma_saas_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES derma_saas_tenants(id) ON DELETE CASCADE,
  visitor_id    VARCHAR(64),
  user_message  TEXT NOT NULL,
  ai_reply      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_convos_tenant ON derma_saas_conversations(tenant_id, created_at DESC);
