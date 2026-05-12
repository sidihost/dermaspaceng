/**
 * Notifications "read" column resolver.
 *
 * The `user_notifications` table has shipped with two different
 * physical column names over the project's lifetime:
 *
 *   • `is_read`  — script 028-user-notifications.sql (older databases)
 *   • `read`     — scripts 350, full-migration, and the broadcast
 *                  dispatcher (current canonical name)
 *
 * That mismatch is why the header bell renders "You're all caught up"
 * for users who *do* have unread notifications: every query in
 * `lib/notifications.ts` and the `/api/notifications/*` routes quotes
 * `"read"`, which throws `column "read" does not exist` on any DB
 * still on the original 028 schema. SWR catches the error, falls back
 * to no data, and the UI shows the empty state.
 *
 * Rather than force every operator to run a migration before the bell
 * works, we detect the column name *once* at process start and feed
 * it back into the SQL helpers via the safe `Identifier` wrapper that
 * `@neondatabase/serverless` exposes. This module is the single
 * source of truth for that lookup so no caller has to think about it.
 *
 * The detection runs lazily and is cached for the lifetime of the
 * Node process — column renames are extraordinarily rare and we
 * never need to invalidate. If the lookup ever fails (e.g. the table
 * doesn't exist yet) we default to `"read"` because that's what the
 * canonical migration creates and every new database will have.
 */

import { sql } from './db'

let cached: 'read' | 'is_read' | null = null
let inflight: Promise<'read' | 'is_read'> | null = null

// One-shot idempotent schema patch. The /api/admin/reply +
// lib/notifications.ts paths INSERT into columns (action_url,
// priority, broadcast_id, reference_type, reference_id) that some
// older databases — those still on script 028 or scripts/full-
// migration.sql — never received. When the column is missing,
// Postgres raises `column "action_url" does not exist`, the INSERT
// fails, the surrounding try/catch swallows it, and the customer
// silently never gets a bell entry. That's exactly the "notifications
// have never worked" symptom the operator reported.
//
// Rather than make every operator run a migration before the bell
// starts working, we ensure the columns exist on first use and cache
// the result. `ADD COLUMN IF NOT EXISTS` is idempotent and cheap.
let schemaPatched = false
let schemaPatchInflight: Promise<void> | null = null

export async function ensureNotificationsSchema(): Promise<void> {
  if (schemaPatched) return
  if (schemaPatchInflight) return schemaPatchInflight

  schemaPatchInflight = (async () => {
    try {
      // We use a single multi-statement DDL block so it's one
      // round-trip on cold start instead of one per column.
      await sql`ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(64)`
      await sql`ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS reference_id VARCHAR(128)`
      await sql`ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS action_url TEXT`
      await sql`ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(16) NOT NULL DEFAULT 'normal'`
      await sql`ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS broadcast_id VARCHAR(64)`
      // Both column names co-exist on different historic schemas — we
      // never drop the one the operator already has, we just make sure
      // BOTH paths can satisfy the INSERTs.
      await sql`ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS "read" BOOLEAN NOT NULL DEFAULT FALSE`
      // The original 028 migration created `id` as NOT NULL with NO
      // default, so every `INSERT INTO user_notifications (user_id,
      // title, …)` from lib/notifications.ts fails with
      //   "null value in column "id" of relation "user_notifications"
      //    violates not-null constraint"
      // — and because the surrounding try/catch swallows the error, the
      // operator sees an empty bell and never knows why. Attaching the
      // gen_random_uuid() default makes the inserts succeed on any
      // schema variant. ALTER COLUMN ... SET DEFAULT is idempotent and
      // costs nothing.
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`
      await sql`ALTER TABLE user_notifications ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`
      schemaPatched = true
    } catch (err) {
      // If the table itself doesn't exist (very fresh DB), we leave
      // schemaPatched false so the next call retries. Subsequent
      // inserts will surface the underlying error in their own
      // try/catch and the operator will see exactly which migration
      // is missing.
      console.error('[notifications-column] schema patch failed', err)
    } finally {
      schemaPatchInflight = null
    }
  })()

  return schemaPatchInflight
}

export async function resolveReadColumn(): Promise<'read' | 'is_read'> {
  if (cached) return cached
  if (inflight) return inflight

  inflight = (async () => {
    try {
      // information_schema.columns gives us a portable, side-effect-free
      // way to ask Postgres which column name the table actually uses.
      // We pick `read` first because it's the canonical name; only fall
      // back to `is_read` if `read` isn't present.
      const rows = (await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user_notifications'
          AND column_name IN ('read', 'is_read')
      `) as unknown as Array<{ column_name: string }>

      const names = new Set(rows.map((r) => r.column_name))
      const resolved: 'read' | 'is_read' = names.has('read')
        ? 'read'
        : names.has('is_read')
          ? 'is_read'
          : 'read'
      cached = resolved
      return resolved
    } catch (err) {
      // Logged once at startup; subsequent calls return the default.
      console.error('[notifications-column] resolve failed, defaulting to "read"', err)
      cached = 'read'
      return cached
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/**
 * Returns the column name wrapped in double quotes so it can be
 * spliced into a `sql.unsafe(...)` fragment. We keep the wrapper
 * tiny and well-named so callers can grep for it and understand
 * exactly why a query is using string concatenation instead of a
 * parameter binding.
 *
 * Example:
 *   const col = await readColumnIdentifier()
 *   await sql.unsafe(`UPDATE user_notifications SET ${col} = TRUE ...`)
 *
 * The output is always one of `"read"` or `"is_read"` — both safe
 * identifiers, never user-supplied — so there is no SQL-injection
 * surface here.
 */
export async function readColumnIdentifier(): Promise<string> {
  const name = await resolveReadColumn()
  return `"${name}"`
}
