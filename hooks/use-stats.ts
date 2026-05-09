// ---------------------------------------------------------------------------
// Tiny SWR helpers for the four stats endpoints.
//
// Why this exists
// ---------------
// Every dashboard now needs the same three behaviours:
//   1. Render with cached data instantly on mount.
//   2. Re-fetch when the user comes back to the tab.
//   3. Re-fetch on a 30s interval so the bar chart breathes between
//      manual refreshes — the server-side Upstash invalidations from
//      `lib/stats-cache.ts` make sure the data we get back is fresh.
//
// Wrapping these into a single hook per endpoint keeps the dashboards
// concise and makes "how often does this poll?" a one-line change.
// ---------------------------------------------------------------------------

'use client'

import useSWR, { type SWRConfiguration } from 'swr'

export type AdminStatsPayload = {
  stats: {
    users: { total: number; recent: number; todayNew?: number; growth: number }
    consultations: { total: number; pending: number; thisWeek: number }
    complaints: { total: number; open: number; resolved: number }
    giftCards: { total: number; pending: number; totalValue: number }
    surveys: { total: number; avgRating: number; thisWeek: number }
    staff: { total: number }
    liveChat?: { waiting: number; active: number }
    bookings?: { pending: number; upcoming: number }
  }
  charts: {
    userTrend: Array<{ date: string; count: number }>
    bookingsTrend?: Array<{
      week: string
      completed: number
      upcoming: number
      cancelled: number
    }>
  }
}

export type UserStatsPayload = {
  totals: {
    bookings: number
    completed: number
    spendKobo: number
    upcoming: number
    points: number
  }
  charts: {
    bookingsByMonth: Array<{
      month: string
      label: string
      count: number
      spendKobo: number
    }>
  }
}

export type StaffTrendPayload = {
  totals: { completed: number; upcoming: number; thisWeek: number }
  charts: {
    weekly: Array<{
      week: string
      label: string
      completed: number
      upcoming: number
    }>
  }
}

export type HomeStatsPayload = {
  clients: number
  treatments: number
  rating: number
  years: number
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${url} ${res.status} ${text}`)
  }
  return (await res.json()) as T
}

// 30s poll matches the server-side Upstash TTL on every per-user
// scope, so polling more often would just double the work without
// returning fresher data.
const LIVE_CONFIG: SWRConfiguration = {
  refreshInterval: 30_000,
  revalidateOnFocus: true,
  dedupingInterval: 5_000,
  keepPreviousData: true,
}

export function useAdminStats() {
  return useSWR<AdminStatsPayload>('/api/admin/stats', fetcher, LIVE_CONFIG)
}

export function useUserStats() {
  return useSWR<UserStatsPayload>('/api/user/stats', fetcher, LIVE_CONFIG)
}

export function useStaffTrend() {
  return useSWR<StaffTrendPayload>(
    '/api/staff/stats/trend',
    fetcher,
    LIVE_CONFIG,
  )
}

export function useHomeStats() {
  // Home stats refresh less often — they're already edge-cached for
  // 60s on Vercel, so polling the page every 30s would just hit the
  // edge cache without learning anything new. 2 minutes feels live
  // without being wasteful.
  return useSWR<HomeStatsPayload>('/api/home/stats', fetcher, {
    ...LIVE_CONFIG,
    refreshInterval: 120_000,
  })
}
