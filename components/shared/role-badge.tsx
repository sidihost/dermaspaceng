'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, ShieldCheck, ArrowUpRight } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

// Persistent role indicator pill, rendered globally on PUBLIC pages
// when the current viewer is an admin or staff member. This is the
// "you are logged in with a privileged account" affordance the big
// platforms use (GitHub's "Staff" badge in the global nav, Vercel's
// internal-tools indicator, Shopify's admin-mode chip). It removes
// the ambiguity of an operator browsing the customer site without
// realising they're authenticated as staff/admin — the source of
// many "but it works for me!" support tickets.
//
// Visibility rules:
//   - Only renders for role === 'admin' or 'staff'.
//   - Suppressed on /admin/* and /staff/* (those surfaces have their
//     own sidebar that already communicates the role).
//   - Suppressed on /signin, /signup, and other auth screens to
//     avoid covering form copy.
//   - Suppressed for guests and regular customers (no badge at all
//     for them — this is for privileged accounts only).
//
// The pill is dismissible per-session via the X. We persist the
// dismiss flag in sessionStorage so it pops back on the next tab
// open (we *want* the admin to remember the next session). The
// click target itself jumps straight to /admin or /staff so it
// doubles as a quick "back to dashboard" shortcut.

function isSuppressedRoute(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/blocked') ||
    pathname.startsWith('/maintenance')
  )
}

export function RoleBadge() {
  const { user, isLoading } = useAuth()
  const pathname = usePathname() || '/'
  const [dismissed, setDismissed] = useState(false)

  // Read the dismiss flag once on mount. We use sessionStorage (not
  // localStorage) so the badge comes back on the next browser session
  // — admins should be reminded of their elevated status each time
  // they open a fresh window.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('ds.role-badge.dismissed') === '1') {
        setDismissed(true)
      }
    } catch {
      /* sessionStorage unavailable — show the badge */
    }
  }, [])

  if (isLoading || !user) return null
  const role = (user as { role?: string }).role
  if (role !== 'admin' && role !== 'staff') return null
  if (dismissed) return null
  if (isSuppressedRoute(pathname)) return null

  const isAdmin = role === 'admin'
  const dashboardHref = isAdmin ? '/admin' : '/staff'
  const Icon = isAdmin ? ShieldCheck : Shield
  const label = isAdmin ? 'Admin mode' : 'Staff mode'

  return (
    <div
      // The pill sits above the floating Derma AI launcher (z-50) but
      // below modal overlays (z-[60]+). Bottom-left on phones and
      // tablets so it never overlaps the bottom-right Derma AI bubble
      // or the iOS Safari home indicator. On md+ we move it to the
      // top-right where there's empty header chrome.
      className="fixed z-50 left-3 bottom-20 md:left-auto md:right-4 md:top-4 md:bottom-auto pointer-events-none"
      role="status"
      aria-label={`${label} — you are signed in with a privileged account`}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[#7B2D8E]/30 bg-white pl-2 pr-1 py-1 shadow-sm">
        <span
          className={
            'inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 ' +
            (isAdmin ? 'bg-[#7B2D8E] text-white' : 'bg-[#7B2D8E]/15 text-[#7B2D8E]')
          }
          aria-hidden="true"
        >
          <Icon className="w-3 h-3" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-900 leading-none">
          {label}
        </span>
        <Link
          href={dashboardHref}
          className="ml-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-[#7B2D8E] hover:text-[#5d2069] transition-colors rounded-full px-2 py-0.5 hover:bg-[#7B2D8E]/5"
        >
          Dashboard
          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem('ds.role-badge.dismissed', '1')
            } catch {
              /* noop */
            }
            setDismissed(true)
          }}
          aria-label="Dismiss role indicator"
          className="ml-0.5 mr-0.5 w-5 h-5 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xs leading-none"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  )
}
