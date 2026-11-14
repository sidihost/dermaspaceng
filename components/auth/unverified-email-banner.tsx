'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  getVisibleEmail,
  shouldPromptEmailVerification,
} from '@/lib/auth-onboarding'

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
 * Sticky top reminder shown when a signed-in user has not verified their
 * email address yet. Uses flat Dermaspace brand purple with zero shadows
 * or gradients.
 */
export function UnverifiedEmailBanner() {
  const { user, isLoading } = useAuth()
  const pathname = usePathname() ?? ''

  if (isLoading || !shouldPromptEmailVerification(user)) {
    return null
  }

  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  const visibleEmail = getVisibleEmail(user)
  if (!visibleEmail) return null

  const verifyHref = `/verify-email?email=${encodeURIComponent(visibleEmail)}&send=1`

  return (
    <div
      role="region"
      aria-label="Verify your email"
      className="bg-[#7B2D8E] text-white border-b border-[#5A1D6A] px-4 py-2.5"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
          <p className="font-medium text-white leading-snug">
            Verify your email ({visibleEmail}) to secure your Dermaspace account.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={verifyHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#7B2D8E] hover:bg-gray-100 transition-colors"
          >
            Verify your email
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
