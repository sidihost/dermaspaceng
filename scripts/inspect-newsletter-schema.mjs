import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public'
    AND table_name IN ('newsletter_campaigns','newsletter_campaign_logs','newsletter_subscribers','users')
  ORDER BY table_name
`
console.log('[v0] relevant tables:', tables.map((t) => t.table_name))

const campaignCols = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='newsletter_campaigns'
  ORDER BY ordinal_position
`
console.log('[v0] newsletter_campaigns columns:')
for (const c of campaignCols) {
  console.log('  -', c.column_name, c.data_type, c.is_nullable, c.column_default ?? '')
}

const logCols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='newsletter_campaign_logs'
  ORDER BY ordinal_position
`
console.log('[v0] newsletter_campaign_logs columns:')
for (const c of logCols) {
  console.log('  -', c.column_name, c.data_type, c.is_nullable)
}

const userCols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='users'
  ORDER BY ordinal_position
`
console.log('[v0] users columns:')
for (const c of userCols) {
  console.log('  -', c.column_name, c.data_type, c.is_nullable)
}
