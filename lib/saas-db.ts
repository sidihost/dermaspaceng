import { neon, NeonQueryFunction } from '@neondatabase/serverless'

// ---------------------------------------------------------------------------
// lib/saas-db.ts
//
// DEDICATED database client for the Derma AI SaaS layer. All SaaS data
// (tenants, sessions, knowledge, conversations) lives in its OWN Neon
// database, fully isolated from the main Dermaspace database. The
// connection string is provided via SAAS_DATABASE_URL.
//
// The canonical DDL lives in scripts/720-derma-saas.sql, but rather than
// force a manual migration step we ensure the tables exist on first use
// (once per server process). Every SaaS API route calls ensureSaasSchema()
// before touching these tables, so the product "just works" the moment
// the database is provisioned — no console step required.
// ---------------------------------------------------------------------------

let _sql: NeonQueryFunction<false, false> | null = null

function getSaasSql(): NeonQueryFunction<false, false> {
  if (!process.env.SAAS_DATABASE_URL) {
    throw new Error(
      'SaaS database is not configured. Set the SAAS_DATABASE_URL environment variable to a dedicated Neon Postgres connection string.',
    )
  }
  if (!_sql) {
    _sql = neon(process.env.SAAS_DATABASE_URL)
  }
  return _sql
}

// Callable proxy so routes can import `saasSql` without eagerly connecting.
function createSaasSqlProxy(): NeonQueryFunction<false, false> {
  const handler = (strings: TemplateStringsArray, ...values: unknown[]) => {
    return getSaasSql()(strings, ...values)
  }
  return handler as NeonQueryFunction<false, false>
}

export const saasSql = createSaasSqlProxy()

let _ensured: Promise<void> | null = null

export function ensureSaasSchema(): Promise<void> {
  if (_ensured) return _ensured
  _ensured = (async () => {
    await saasSql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`

    await saasSql`
      CREATE TABLE IF NOT EXISTS derma_saas_tenants (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name            VARCHAR(255) NOT NULL,
        contact_name            VARCHAR(255) NOT NULL,
        contact_email           VARCHAR(255) NOT NULL UNIQUE,
        password_hash           TEXT NOT NULL,
        public_key              VARCHAR(64) NOT NULL UNIQUE,
        status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
        plan_price_kobo         BIGINT NOT NULL DEFAULT 3500000,
        subscription_expires_at TIMESTAMPTZ,
        brand_name              VARCHAR(120) NOT NULL DEFAULT 'AI Assistant',
        assistant_name          VARCHAR(120) NOT NULL DEFAULT 'Assistant',
        brand_color             VARCHAR(9)   NOT NULL DEFAULT '#7B2D8E',
        welcome_message         TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
        logo_url                TEXT,
        business_context        TEXT,
        launcher_label          VARCHAR(60) NOT NULL DEFAULT 'Chat with us',
        allowed_domains         TEXT,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        activated_at            TIMESTAMPTZ,
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await saasSql`CREATE INDEX IF NOT EXISTS idx_saas_tenants_public_key ON derma_saas_tenants(public_key)`
    await saasSql`CREATE INDEX IF NOT EXISTS idx_saas_tenants_status ON derma_saas_tenants(status)`

    await saasSql`
      CREATE TABLE IF NOT EXISTS derma_saas_sessions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL REFERENCES derma_saas_tenants(id) ON DELETE CASCADE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at  TIMESTAMPTZ NOT NULL
      )
    `
    await saasSql`CREATE INDEX IF NOT EXISTS idx_saas_sessions_tenant ON derma_saas_sessions(tenant_id)`

    await saasSql`
      CREATE TABLE IF NOT EXISTS derma_saas_knowledge (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL REFERENCES derma_saas_tenants(id) ON DELETE CASCADE,
        question    TEXT NOT NULL,
        answer      TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await saasSql`CREATE INDEX IF NOT EXISTS idx_saas_knowledge_tenant ON derma_saas_knowledge(tenant_id)`

    await saasSql`
      CREATE TABLE IF NOT EXISTS derma_saas_conversations (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL REFERENCES derma_saas_tenants(id) ON DELETE CASCADE,
        visitor_id    VARCHAR(64),
        user_message  TEXT NOT NULL,
        ai_reply      TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await saasSql`CREATE INDEX IF NOT EXISTS idx_saas_convos_tenant ON derma_saas_conversations(tenant_id, created_at DESC)`
  })().catch((err) => {
    // Reset so a transient failure doesn't permanently poison the cache.
    _ensured = null
    throw err
  })
  return _ensured
}
