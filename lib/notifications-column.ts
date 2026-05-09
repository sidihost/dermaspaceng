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
