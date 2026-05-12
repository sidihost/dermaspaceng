import { neon } from '@neondatabase/serverless'
import { randomUUID } from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)

const users = await sql`
  SELECT id, email, first_name FROM users
  WHERE email = 'sidihostdev@gmail.com'
  LIMIT 1
`
if (!users.length) {
  console.log('user not found')
  process.exit(0)
}
const u = users[0]
const firstName = u.first_name || 'there'
const message = `Hi ${firstName} — this notification confirms the header bell is now working. New survey and consultation events will show up here too.`

await sql`
  INSERT INTO user_notifications (id, user_id, title, message, type, action_url, priority)
  VALUES (
    ${randomUUID()},
    ${u.id},
    'Notifications are live',
    ${message},
    'system',
    '/dashboard/notifications',
    'normal'
  )
`

const n = await sql`
  SELECT COUNT(*)::int AS unread
  FROM user_notifications
  WHERE user_id = ${u.id} AND "read" = FALSE
`
console.log('seed OK; unread for', u.email, '=', n[0].unread)
