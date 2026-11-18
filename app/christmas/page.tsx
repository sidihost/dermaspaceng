import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { getBirthdayRecapForUser } from '@/lib/birthday-recap'
import type { RecapPayload } from '@/lib/birthday'
import { getFestiveState } from '@/lib/feature-flags'
import { evaluateCelebrationAccess } from '@/lib/celebration-tokens'
import CelebrationLocked from '@/components/celebrations/celebration-locked'
import CelebrationWrapped from '@/components/celebrations/celebration-wrapped'

export const metadata: Metadata = {
  title: 'Christmas Glow • Dermaspace',
  description:
    'Celebrate the festive season — revisit your year of calm, glow, and self-care rituals at Dermaspace.',
}

export const dynamic = 'force-dynamic'

/**
 * /christmas — Holiday Glow Story
 *
 * Auth-gated & token-enforced festive recap experience. Only unlocked
 * during Christmas season (Dec 1–26 Africa/Lagos) while Festive mode is
 * active for the viewer, with a unique user-bound HMAC token.
 */
export default async function ChristmasCelebrationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const sp = await searchParams
  const rawToken =
    typeof sp?.token === 'string'
      ? sp.token
      : Array.isArray(sp?.token)
        ? sp.token[0]
        : undefined

  const user = await getCurrentUser()
  if (!user) {
    const nextPath = rawToken
      ? `/christmas?token=${encodeURIComponent(rawToken)}`
      : '/christmas'
    redirect(`/signin?redirect=${encodeURIComponent(nextPath)}`)
  }

  let festiveEnabled = false
  try {
    const festive = await getFestiveState()
    festiveEnabled = festive.enabled === true
  } catch {
    festiveEnabled = false
  }

  const access = evaluateCelebrationAccess({
    occasion: 'christmas',
    userId: user.id,
    festiveEnabled,
    token: rawToken,
  })

  if (!access.allowed) {
    return (
      <CelebrationLocked
        occasion="christmas"
        reason={access.reason}
        firstName={user.first_name}
      />
    )
  }

  if (access.needsTokenRedirect) {
    redirect(`/christmas?token=${encodeURIComponent(access.mintedToken)}`)
  }

  let recap: RecapPayload
  try {
    recap = await getBirthdayRecapForUser(user)
  } catch {
    recap = {
      user: {
        firstName: user.first_name ?? 'Friend',
        lastName: user.last_name ?? null,
      },
      isBirthdayToday: false,
      birthday: null,
      joinedOn: null,
      daysWithUs: 1,
      stats: {
        totalBookings: 0,
        totalSpentNaira: 0,
        topTreatment: null,
        topTreatmentCount: 0,
        topLocation: null,
        topLocationCount: 0,
        busiestMonth: null,
      },
    }
  }

  return <CelebrationWrapped recap={recap} occasion="christmas" />
}
