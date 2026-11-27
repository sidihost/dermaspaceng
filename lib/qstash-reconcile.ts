import { CANONICAL_PRODUCTION_HOSTS } from './push-origin'

export interface LiveScheduleLike {
  scheduleId: string
  destination: string
  cron: string
  createdAt: number
  paused: boolean
}

export interface ManifestScheduleLike {
  id: string
  path: string
  cron: string
  label: string
  description: string
}

/**
 * Safely extract and normalize the pathname from a QStash destination URL.
 * Trailing slashes (except `/`) are stripped so `/api/cron/foo/` matches `/api/cron/foo`.
 */
export function extractSchedulePathname(destination: string): string | null {
  if (!destination || typeof destination !== 'string') return null
  try {
    const parsed = new URL(destination.trim())
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
    return pathname
  } catch {
    return null
  }
}

export function normalizeSchedulePath(path: string): string {
  const trimmed = (path || '').trim()
  if (!trimmed) return '/'
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash.replace(/\/+$/, '') || '/'
}

/**
 * Return every live QStash schedule whose destination pathname matches `path`,
 * regardless of whether it was originally created on `www.` or the apex domain
 * or a previous deployment URL.
 */
export function findMatchingSchedulesForPath<T extends LiveScheduleLike>(
  schedules: T[],
  path: string,
): T[] {
  const targetPath = normalizeSchedulePath(path)
  return schedules.filter((s) => extractSchedulePathname(s.destination) === targetPath)
}

/**
 * Build the strict allowlist of URLs that `verifyQStash` should accept for a
 * given request pathname. Always checks the canonical origin first, and when
 * that origin is one of Dermaspace's canonical production hosts (`dermaspaceng.com`
 * or `www.dermaspaceng.com`), also accepts its apex/`www.` counterpart so a
 * `www.` vs non-`www.` QStash destination never breaks cryptographic verification.
 */
export function getAllowedQStashVerifyUrls(
  canonicalOrigin: string,
  pathname: string,
): string[] {
  const cleanOrigin = canonicalOrigin.replace(/\/+$/, '')
  const cleanPath = normalizeSchedulePath(pathname)
  const urls = new Set<string>([`${cleanOrigin}${cleanPath}`])

  try {
    const parsed = new URL(cleanOrigin)
    const host = parsed.hostname.toLowerCase()
    if (CANONICAL_PRODUCTION_HOSTS.has(host)) {
      for (const allowedHost of CANONICAL_PRODUCTION_HOSTS) {
        urls.add(`${parsed.protocol}//${allowedHost}${cleanPath}`)
      }
    }
  } catch {
    // Keep the primary canonical origin entry only
  }

  return Array.from(urls)
}

export interface ReconciledManifestEntry<M extends ManifestScheduleLike>
  extends ManifestScheduleLike {
  registered: boolean
  scheduleId: string | null
  liveCron: string | null
  liveDestination: string | null
  cronInSync: boolean
  originInSync: boolean
  duplicateCount: number
  paused: boolean
  createdAt: number | null
}

/**
 * Join the declarative schedule manifest against live QStash schedules.
 *
 * When multiple live schedules point at the same pathname (for example, an old
 * `www.` schedule and a newer apex schedule), pick the best primary entry
 * (preferring canonical origin + matching cron + newest `createdAt`) and surface
 * any extras in `orphans` so admins can see and clean them up.
 */
export function reconcileManifestWithLiveSchedules<
  M extends ManifestScheduleLike,
  L extends LiveScheduleLike,
>(
  manifest: M[],
  live: L[],
  canonicalOrigin: string,
): {
  manifest: Array<ReconciledManifestEntry<M>>
  orphans: L[]
} {
  const cleanOrigin = canonicalOrigin.replace(/\/+$/, '')
  const byPath = new Map<string, L[]>()
  const knownPaths = new Set(manifest.map((m) => normalizeSchedulePath(m.path)))
  const orphans: L[] = []

  for (const s of live) {
    const pathname = extractSchedulePathname(s.destination)
    if (!pathname || !knownPaths.has(pathname)) {
      orphans.push(s)
      continue
    }
    const list = byPath.get(pathname) ?? []
    list.push(s)
    byPath.set(pathname, list)
  }

  const reconciled = manifest.map((cfg) => {
    const normPath = normalizeSchedulePath(cfg.path)
    const expectedDestination = `${cleanOrigin}${normPath}`
    const matches = byPath.get(normPath) ?? []

    if (matches.length === 0) {
      return {
        ...cfg,
        registered: false,
        scheduleId: null,
        liveCron: null,
        liveDestination: null,
        cronInSync: false,
        originInSync: false,
        duplicateCount: 0,
        paused: false,
        createdAt: null,
      }
    }

    // Score matches so the healthiest canonical schedule is chosen as primary:
    //   1. Exact destination match + exact cron match
    //   2. Exact destination match
    //   3. Exact cron match
    //   4. Most recently created
    const sorted = [...matches].sort((a, b) => {
      const aDest = a.destination.replace(/\/+$/, '') === expectedDestination ? 1 : 0
      const bDest = b.destination.replace(/\/+$/, '') === expectedDestination ? 1 : 0
      const aCron = a.cron === cfg.cron ? 1 : 0
      const bCron = b.cron === cfg.cron ? 1 : 0
      const aScore = aDest * 2 + aCron
      const bScore = bDest * 2 + bCron
      if (aScore !== bScore) return bScore - aScore
      return (b.createdAt || 0) - (a.createdAt || 0)
    })

    const primary = sorted[0]
    const extras = sorted.slice(1)
    for (const extra of extras) {
      orphans.push(extra)
    }

    return {
      ...cfg,
      registered: true,
      scheduleId: primary.scheduleId,
      liveCron: primary.cron,
      liveDestination: primary.destination,
      cronInSync: primary.cron === cfg.cron,
      originInSync: primary.destination.replace(/\/+$/, '') === expectedDestination,
      duplicateCount: extras.length,
      paused: primary.paused,
      createdAt: primary.createdAt,
    }
  })

  return { manifest: reconciled, orphans }
}
