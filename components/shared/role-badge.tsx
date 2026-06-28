'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, ShieldCheck, ArrowUpRight, X } from 'lucide-react'
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
      // Anchored bottom-LEFT on every breakpoint. The two corners we
      // can't use: the top edge is owned by the `sticky top-0 z-50`
      // site header (logo + account chrome), so a top-anchored badge
      // collided with it on desktop; the bottom-RIGHT holds the
      // floating Derma AI launcher. Bottom-left is the only corner
      // clear of both. The larger `bottom-20` offset on phones lifts
      // it above the mobile bottom nav + iOS home indicator, and on
      // md+ there's no bottom nav so it tucks into the corner with
      // `bottom-4`. Sits above the launcher (z-50) but below modal
      // overlays (z-[60]+).
      className="fixed z-50 left-3 bottom-20 md:bottom-4 pointer-events-none"
      role="status"
      aria-label={`${label} — you are signed in with a privileged account`}
    >
      <div className="pointer-events-auto inline-flex items-stretch overflow-hidden rounded-full border border-[#7B2D8E]/25 bg-white">
        {/* Status segment: the icon + label that reads "you are an
            admin". Non-interactive, clearly separated from the action
            by a hairline divider. */}
        <span className="flex items-center gap-1.5 py-1 pl-2 pr-2.5">
          <span
            className={
              'inline-flex h-4 w-4 items-center justify-center rounded-full flex-shrink-0 ' +
              (isAdmin ? 'bg-[#7B2D8E] text-white' : 'bg-[#7B2D8E]/15 text-[#7B2D8E]')
            }
            aria-hidden="true"
          >
            <Icon className="h-2.5 w-2.5" />
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-900 leading-none">
            {label}
          </span>
        </span>

        {/* Action segment: jump back to the dashboard. */}
        <Link
          href={dashboardHref}
          className="flex items-center gap-1 border-l border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.04] px-2.5 text-[10.5px] font-semibold text-[#7B2D8E] transition-colors hover:bg-[#7B2D8E]/10"
        >
          Dashboard
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>

        {/* Dismiss for the session. */}
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
          className="flex w-7 items-center justify-center border-l border-[#7B2D8E]/15 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
