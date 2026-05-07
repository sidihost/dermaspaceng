'use client'

/**
 * <StaffTopBar />
 * --------------------------------------------------------------
 * Personalised top bar shared by every page under /staff/*.
 *
 * What's on it:
 *   - Time-of-day greeting ("Good morning, Franca") — gives the
 *     console a "your console" feel rather than "the staff app".
 *   - Pending-tasks chip pulled from /api/staff/dashboard so the
 *     header carries a real-time triage signal across pages, not
 *     just the dashboard.
 *   - Notification bell wired to the same /api/notifications
 *     surface admins use, so any in-app push from a customer reply
 *     or a system alert lights up here too.
 *   - Avatar + role pill so the operator can confirm at a glance
 *     who they're signed in as (helps when the same browser is
 *     shared between team members).
 */

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { CalendarDays, Bell, ChevronDown } from 'lucide-react'
import { NotificationBell } from '@/components/shared/notification-bell'

interface Props {
  firstName: string
  lastName: string
  role: 'staff' | 'admin' | 'user'
}

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null))

function timeGreeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Wrapping up'
}

interface DashboardStats {
  stats?: {
    pendingGiftCards: number
    pendingComplaints: number
    pendingConsultations: number
    recentSurveys: number
  }
}

export function StaffTopBar({ firstName, lastName, role }: Props) {
  const [now, setNow] = React.useState<Date | null>(null)

  // Time-aware greeting refreshes every minute so a staff member
  // who comes back from a break sees the right "Good evening" copy.
  React.useEffect(() => {
    setNow(new Date())
    const t = window.setInterval(() => setNow(new Date()), 60 * 1000)
    return () => window.clearInterval(t)
  }, [])

  const { data } = useSWR<DashboardStats>('/api/staff/dashboard', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  })

  const pending =
    (data?.stats?.pendingGiftCards ?? 0) +
    (data?.stats?.pendingComplaints ?? 0) +
    (data?.stats?.pendingConsultations ?? 0)

  const greeting = now ? timeGreeting(now) : 'Welcome back'
  const dateLabel = now
    ? now.toLocaleDateString('en-NG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : ''

  const initials = `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase() || 'S'

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100">
      {/* Mobile spacing — leaves room for the fixed hamburger header
          rendered by <StaffSidebar /> at h-14 on screens < lg. */}
      <div className="px-4 sm:px-6 lg:px-8 pt-[68px] lg:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 lg:py-4">
          {/* Greeting */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]/80">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-[#7B2D8E]"
                aria-hidden
              />
              {role === 'admin' ? 'Admin · Staff console' : 'Staff console'}
            </div>
            <h1 className="mt-0.5 text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
              {greeting}, {firstName}
            </h1>
            {dateLabel && (
              <p className="text-[12px] text-gray-500 inline-flex items-center gap-1.5 mt-0.5">
                <CalendarDays className="w-3.5 h-3.5" aria-hidden />
                {dateLabel}
              </p>
            )}
          </div>

          {/* Action cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {pending > 0 ? (
              <Link
                href="/staff"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E]/8 hover:bg-[#7B2D8E]/12 text-[#7B2D8E] text-[12px] font-semibold px-3 py-1.5 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                {pending} pending {pending === 1 ? 'task' : 'tasks'}
              </Link>
            ) : null}

            <NotificationBell />

            {/* Identity chip — purely informational (the sidebar has
                the actual sign-out). Adds the "you're signed in as
                Franca" reassurance the user asked for. */}
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white border border-gray-200 pl-1 pr-2 py-1 text-xs">
              <span className="w-7 h-7 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold flex items-center justify-center">
                {initials}
              </span>
              <span className="font-medium text-gray-900 truncate max-w-[120px]">
                {firstName} {lastName}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
