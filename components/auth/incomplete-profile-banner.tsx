'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { logoutAndRedirect } from '@/lib/logout'

const EXCLUDED_PREFIXES = [
  '/complete-profile',
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/logout',
  '/offline',
  '/maintenance',
  '/blocked',
  '/terms',
  '/privacy',
  '/derma-ai-terms',
  '/legal',
  '/admin',
  '/staff',
]

/**
 * Sticky top reminder shown on public pages when a customer who signed up
 * via a social provider (X, Google, or Microsoft) navigated away or closed
 * their tab before completing `/complete-profile`. Uses flat Dermaspace
 * brand purple with zero shadows or gradients.
 */
export function IncompleteProfileBanner() {
  const { user, isLoading } = useAuth()
  const pathname = usePathname() ?? ''

  if (isLoading || !user || !user.needsProfileCompletion) {
    return null
  }

  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Complete your profile"
      className="bg-[#7B2D8E] text-white border-b border-[#5A1D6A] px-4 py-2.5"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <p className="font-medium text-white">
          Finish setting up your Dermaspace profile to unlock your dashboard and bookings.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => logoutAndRedirect('/')}
            className="text-xs font-medium text-white/80 hover:text-white underline underline-offset-2"
          >
            Sign out
          </button>
          <Link
            href="/complete-profile"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#7B2D8E] hover:bg-gray-100 transition-colors"
          >
            Complete profile
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
