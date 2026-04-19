'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'

// DermaAI brings a lot of client-only state (speech recognition, audio
// context, localStorage, voice chime etc.), so we dynamic-import it with SSR
// off. That also keeps the main shell bundle slim for visitors who never
// see the assistant (guests and users on admin/staff surfaces).
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
  // Full-page Derma AI already renders the chat itself — no need to
  // double-mount the floating launcher on top of it.
  '/derma-ai',
]

const authFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

/**
 * Renders the Derma AI floating assistant + chat on every public / member
 * surface for signed-in users. We gate on auth rather than rendering for
 * everyone because the assistant's hero features (wallet balance, booking
 * lookup, profile updates, etc.) only make sense for logged-in users — and
 * surfacing a disabled button on marketing pages would be noise.
 */
export default function DermaAIMount() {
  const pathname = usePathname() || ''

  // Never mount on auth / admin / staff surfaces.
  if (BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
    return null
  }

  return <DermaAIGate />
}

/**
 * Actual auth check — split out so the SWR hook is only instantiated on
 * routes where the assistant is allowed. /api/auth/me returns 401 when
 * there's no session, which our fetcher maps to `null`.
 */
function DermaAIGate() {
  const { data } = useSWR('/api/auth/me', authFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  // Only render the assistant once we have a confirmed user. During the
  // initial hydration `data` is `undefined`; we keep the UI quiet until
  // we know (prevents a flash of the floating button for guests).
  if (!data?.user) return null

  return <DermaAI />
}
