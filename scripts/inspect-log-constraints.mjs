import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

const cols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='newsletter_campaign_logs'
  ORDER BY ordinal_position
`
console.log('[v0] newsletter_campaign_logs columns:')
for (const c of cols) console.log('  -', c.column_name, c.data_type, c.is_nullable)

const cons = await sql`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'newsletter_campaign_logs'::regclass
`
console.log('[v0] constraints:')
for (const c of cons) console.log('  -', c.conname, '=>', c.def)
