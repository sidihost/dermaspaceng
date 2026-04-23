'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

// DermaAI brings a lot of client-only state (speech recognition, audio
// context, localStorage, voice chime etc.), so we dynamic-import it with SSR
// off. That also keeps the main shell bundle slim for visitors who never
// see the assistant (users on admin/staff surfaces).
const DermaAI = dynamic(() => import('@/components/shared/derma-ai'), {
  ssr: false,
})

// Paths where the assistant should NOT mount. We keep it out of:
//   - Auth surfaces (sign-in flows, complete-profile, verify-email) so the
//     floating button never competes with onboarding CTAs.
//   - Admin / staff consoles (those have their own tooling and don't need
//     the customer concierge).
//   - The /offline and /blocked fallback pages (nothing to do there).
const BLOCKED_PREFIXES = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/complete-profile',
  '/accept-invite',
  '/admin',
  '/staff',
  '/offline',
  '/blocked',
]

/**
 * Renders the Derma AI floating assistant + chat on every public / member
 * surface. Guests get general help (services, pricing, locations) and a
 * soft prompt to log in for the personalized tools (wallet balance,
 * booking lookup, profile updates). DermaAI itself already handles the
 * guest-vs-member state internally, so we just need to mount it.
 */
export default function DermaAIMount() {
  const pathname = usePathname() || ''

  // Never mount on auth / admin / staff surfaces.
  if (BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
    return null
  }

  return <DermaAI />
}
