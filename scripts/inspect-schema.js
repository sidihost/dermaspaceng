import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

const tables = ['bookings', 'users', 'booking_services', 'notifications', 'activity_log']
for (const t of tables) {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ${t}
     ORDER BY ordinal_position
  `
  console.log(`\n=== ${t} (${cols.length} cols) ===`)
  for (const c of cols) console.log(`  ${c.column_name} :: ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}`)
}
