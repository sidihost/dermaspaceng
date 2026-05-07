import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

const statements = [
  `ALTER TABLE bookings
     ADD COLUMN IF NOT EXISTS assigned_staff_id VARCHAR REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE bookings
     ADD COLUMN IF NOT EXISTS price_override_kobo INTEGER`,
  `ALTER TABLE bookings
     ADD COLUMN IF NOT EXISTS price_override_reason TEXT`,
  `ALTER TABLE bookings
     ADD COLUMN IF NOT EXISTS price_override_at TIMESTAMPTZ`,
  `ALTER TABLE bookings
     ADD COLUMN IF NOT EXISTS price_override_by VARCHAR REFERENCES users(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_assigned_staff ON bookings(assigned_staff_id)`,
  `CREATE TABLE IF NOT EXISTS staff_booking_access (
     id           VARCHAR PRIMARY KEY DEFAULT ('sba_' || replace(gen_random_uuid()::text, '-', '')),
     booking_id   VARCHAR NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
     staff_id     VARCHAR NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
     granted_by   VARCHAR REFERENCES users(id) ON DELETE SET NULL,
     granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     CONSTRAINT staff_booking_access_unique UNIQUE (booking_id, staff_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_staff_booking_access_staff ON staff_booking_access(staff_id)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_policy_accepted_version TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_policy_accepted_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS user_notifications (
     id              VARCHAR PRIMARY KEY DEFAULT ('ntf_' || replace(gen_random_uuid()::text, '-', '')),
     user_id         VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     title           TEXT NOT NULL,
     message         TEXT NOT NULL,
     type            VARCHAR(32) NOT NULL DEFAULT 'system',
     reference_type  VARCHAR(32),
     reference_id    VARCHAR(64),
     action_url      TEXT,
     priority        VARCHAR(16) NOT NULL DEFAULT 'normal',
     broadcast_id    VARCHAR(64),
     "read"          BOOLEAN NOT NULL DEFAULT FALSE,
     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
     ON user_notifications(user_id, "read", created_at DESC)`,
]

for (const stmt of statements) {
  console.log('> Running:', stmt.split('\n')[0].slice(0, 80))
  await sql.query(stmt)
}

console.log('\nMigration 350 complete.')

const cols = await sql`
  SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='bookings'
     AND column_name IN ('assigned_staff_id','price_override_kobo','price_override_reason','price_override_at','price_override_by')
   ORDER BY column_name
`
console.log('bookings new cols:', cols.map((c) => c.column_name))

const tbls = await sql`
  SELECT table_name FROM information_schema.tables
   WHERE table_schema='public'
     AND table_name IN ('staff_booking_access','user_notifications')
   ORDER BY table_name
`
console.log('tables present:', tbls.map((t) => t.table_name))
