export interface SeenBaselineRecord {
  count: number
  date?: string
}

/**
 * Surfaces whose underlying count resets at midnight Africa/Lagos.
 * Baselines stamped on an earlier Lagos calendar day automatically expire.
 */
export const DATED_ADMIN_SURFACES = new Set(['users', 'newsletter'])

/**
 * Current YYYY-MM-DD calendar date in `Africa/Lagos` (UTC+1, no DST).
 * Keeps client sidebar badge baselines aligned with the server's
 * `Africa/Lagos` day boundaries in `/api/admin/stats`.
 */
export function getLagosDateStamp(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * Resolve the effective seen baseline for a surface on `todayDate`.
 * For dated surfaces (`users`, `newsletter`), baselines from prior days
 * return 0 so yesterday's seen count never hides today's new signups.
 */
export function getEffectiveSeenBaseline(args: {
  surface: string
  baseline: SeenBaselineRecord | undefined
  todayDate: string
}): number {
  const { surface, baseline, todayDate } = args
  if (!baseline || !Number.isFinite(baseline.count) || baseline.count <= 0) {
    return 0
  }
  if (DATED_ADMIN_SURFACES.has(surface) && baseline.date !== todayDate) {
    return 0
  }
  return Math.floor(baseline.count)
}

/**
 * Compute the unread/unseen badge count for an admin sidebar surface.
 */
export function computeUnseenBadgeCount(args: {
  surface: string
  currentCount: number
  baseline: SeenBaselineRecord | undefined
  todayDate: string
}): number {
  const safeCurrent = Math.max(0, Math.floor(Number(args.currentCount) || 0))
  const seen = getEffectiveSeenBaseline({
    surface: args.surface,
    baseline: args.baseline,
    todayDate: args.todayDate,
  })
  return Math.max(0, safeCurrent - seen)
}

/**
 * If the live server count drops below a stored baseline (for example, a test
 * user created today was archived/deleted, or a ticket was resolved), clamp
 * the stored baseline down to `currentCount` so the next genuinely new item
 * immediately increments the badge instead of being swallowed by a stale high
 * watermark.
 */
export function clampBaselineToCurrentCount(args: {
  surface: string
  currentCount: number
  baseline: SeenBaselineRecord | undefined
  todayDate: string
}): SeenBaselineRecord | undefined {
  const { surface, baseline, todayDate } = args
  if (!baseline) return undefined
  const safeCurrent = Math.max(0, Math.floor(Number(args.currentCount) || 0))

  if (DATED_ADMIN_SURFACES.has(surface) && baseline.date !== todayDate) {
    return undefined
  }

  if (baseline.count > safeCurrent) {
    return {
      count: safeCurrent,
      ...(DATED_ADMIN_SURFACES.has(surface) ? { date: todayDate } : {}),
    }
  }

  return baseline
}
