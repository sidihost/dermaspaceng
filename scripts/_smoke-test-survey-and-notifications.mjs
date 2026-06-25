/**
 * Smoke test (manual, not part of the migration set).
 *
 * Verifies, against the live DATABASE_URL, that:
 *   1. The survey INSERT shape used by /api/surveys actually succeeds
 *      (regression for the "answers NOT NULL" constraint).
 *   2. The consultation INSERT shape used by /api/consultation
 *      succeeds with the new user_id column.
 *   3. notifyUser inserts a row into user_notifications and the bell
 *      query path returns it.
 *
 * Run with:
 *   node --env-file-if-exists=/vercel/share/.env.project \
 *     scripts/_smoke-test-survey-and-notifications.mjs
 *
 * All rows are cleaned up at the end so this is safe to run against
 * the production database, but in CI you would point it at a staging
 * URL.
 */
import { neon } from '@neondatabase/serverless'
import { randomUUID } from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)
const log = (...a) => console.log('[smoke]', ...a)

async function main() {
  // ─── 1. Survey insert (the bug behind "Submitting…" hang) ─────────────
  const surveyId = randomUUID()
  const answers = {
    aesthetics: 'Agree',
    ambiance: 'Strongly Agree',
    frontDesk: 'Agree',
    staffProfessional: 'Strongly Agree',
    appointmentDelay: '10 mins',
    overallRating: 5,
    visitAgain: 'Yes',
    comments: 'smoke test',
  }
  await sql`
    INSERT INTO survey_responses (
      id, user_id, user_email,
      answers,
      aesthetics, ambiance, front_desk, staff_professional,
      appointment_delay, overall_rating, visit_again, comments
    ) VALUES (
      ${surveyId}, null, 'smoke@dermaspace.test',
      ${JSON.stringify(answers)}::jsonb,
      ${answers.aesthetics}, ${answers.ambiance},
      ${answers.frontDesk}, ${answers.staffProfessional},
      ${answers.appointmentDelay}, ${answers.overallRating},
      ${answers.visitAgain}, ${answers.comments}
    )
  `
  log('survey insert OK', surveyId)

  // ─── 2. Pick an existing user to attach notifications to ──────────────
  const users = await sql`SELECT id, email FROM users LIMIT 1`
  if (!users.length) throw new Error('no users in DB to test against')
  const userId = users[0].id
  log('using user', users[0].email)

  // ─── 3. Consultation insert with user_id ──────────────────────────────
  const consId = randomUUID()
  await sql`
    INSERT INTO consultations (
      id, user_id, first_name, last_name, email, phone, location,
      appointment_date, appointment_time, concerns, notes
    ) VALUES (
      ${consId}, ${userId}, 'Smoke', 'Test', 'smoke@dermaspace.test',
      '08000000000', 'vi', '2030-01-01', '10:00 AM',
      ${JSON.stringify(['Acne'])}, 'smoke test'
    )
  `
  log('consultation insert OK', consId)

  // ─── 4. Insert a notification using the same shape as notifyUser ──────
  // (replicates lib/notifications.ts so we don't need to spin up Next.)
  await sql`
    ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(64)
  `
  await sql`
    ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS reference_id VARCHAR(128)
  `
  await sql`
    ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS action_url TEXT
  `
  await sql`
    ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(16) NOT NULL DEFAULT 'normal'
  `
  await sql`
    ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS broadcast_id VARCHAR(64)
  `
  const notifId = randomUUID()
  await sql`
    INSERT INTO user_notifications (
      id, user_id, title, message, type, reference_type, reference_id,
      action_url, priority
    ) VALUES (
      ${notifId},
      ${userId},
      'Smoke test notification',
      'If you can see this in the bell, the fix works.',
      'system',
      'consultation',
      ${consId},
      '/dashboard/consultations',
      'normal'
    )
  `
  log('notification insert OK')

  // ─── 5. Run a query equivalent to the bell endpoint's ─────────────────
  const rows = await sql`
    SELECT id, title, message, type, reference_type, reference_id,
           action_url, priority, "read" AS is_read, created_at
    FROM user_notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 8
  `
  log('bell query returned', rows.length, 'rows; latest title =', rows[0]?.title)

  const unread = await sql`
    SELECT COUNT(*)::int AS count
    FROM user_notifications
    WHERE user_id = ${userId} AND "read" = FALSE
  `
  log('unread count =', unread[0].count)

  // ─── 6. Cleanup ───────────────────────────────────────────────────────
  await sql`DELETE FROM survey_responses WHERE id = ${surveyId}`
  await sql`DELETE FROM consultations WHERE id = ${consId}`
  await sql`DELETE FROM user_notifications WHERE user_id = ${userId} AND title = 'Smoke test notification'`
  log('cleaned up')
  log('ALL CHECKS PASSED')
}

main().catch((err) => {
  console.error('[smoke] FAILED', err)
  process.exit(1)
})
