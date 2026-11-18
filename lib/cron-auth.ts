import { getCurrentUser } from '@/lib/auth'
import { timingSafeEqualStrings } from '@/lib/server-secrets'

/**
 * Authorizes manual GET triggers on `/api/cron/*` endpoints.
 *
 * Fails closed: requests are permitted ONLY when:
 *   1. `CRON_SECRET` is configured AND matches `Authorization: Bearer <secret>`
 *      in constant time, OR
 *   2. The caller holds an active super-admin session (supports the
 *      "Run now" action inside `/admin/schedules`, which already enforces
 *      `requireSuperAdmin()`).
 */
export async function authorizeCronManualGet(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret) {
    const authHeader = request.headers.get('authorization') || ''
    if (authHeader.startsWith('Bearer ')) {
      const provided = authHeader.slice('Bearer '.length).trim()
      if (timingSafeEqualStrings(provided, cronSecret)) {
        return true
      }
    }
  }

  const user = await getCurrentUser()
  if (user && user.role === 'admin' && user.is_super_admin === true) {
    return true
  }

  return false
}
