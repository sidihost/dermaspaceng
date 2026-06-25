import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

// Add an `audience` column so a campaign can target either the
// newsletter opt-in list ('subscribers', the historical default) or
// every registered customer ('customers'). Static default keeps this
// a fast, lock-light migration; existing rows inherit 'subscribers'.
await sql`
  ALTER TABLE newsletter_campaigns
  ADD COLUMN IF NOT EXISTS audience varchar(20) NOT NULL DEFAULT 'subscribers'
`

const cols = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='newsletter_campaigns'
    AND column_name='audience'
`
console.log('[v0] audience column:', cols)

// Quick sanity counts for each audience so we can confirm the
// recipient queries return sensible numbers.
const [{ count: subCount }] = await sql`
  SELECT COUNT(*)::int AS count FROM newsletter_subscribers
  WHERE COALESCE(status, 'active') = 'active' AND email IS NOT NULL AND email <> ''
`
const [{ count: custCount }] = await sql`
  SELECT COUNT(*)::int AS count FROM users
  WHERE email IS NOT NULL AND email <> ''
    AND COALESCE(is_active, true) = true
    AND deleted_at IS NULL
`
console.log('[v0] active subscribers:', subCount, '| active customers:', custCount)
