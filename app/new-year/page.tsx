import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { getBirthdayRecapForUser } from '@/lib/birthday-recap'
import type { RecapPayload } from '@/lib/birthday'
import { evaluateCelebrationAccess } from '@/lib/celebration-tokens'
import CelebrationLocked from '@/components/celebrations/celebration-locked'
import CelebrationWrapped from '@/components/celebrations/celebration-wrapped'

export const metadata: Metadata = {
  title: 'New Year Wrap • Dermaspace',
  description:
    'Celebrate a new chapter of radiant skin — your Dermaspace Year in Review & New Year Wrap.',
}

export const dynamic = 'force-dynamic'

/**
 * /new-year — New Year Wrap Story
 *
 * Auth-gated & token-enforced New Year celebration. Only unlocked during
 * the New Year window (Dec 31 – Jan 7 Africa/Lagos) with a unique
 * user-bound HMAC token.
 */
export default async function NewYearCelebrationPage({
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
      ? `/new-year?token=${encodeURIComponent(rawToken)}`
      : '/new-year'
    redirect(`/signin?redirect=${encodeURIComponent(nextPath)}`)
  }

  const access = evaluateCelebrationAccess({
    occasion: 'new-year',
    userId: user.id,
    token: rawToken,
  })

  if (!access.allowed) {
    return (
      <CelebrationLocked
        occasion="new-year"
        reason={access.reason}
        firstName={user.first_name}
      />
    )
  }

  if (access.needsTokenRedirect) {
    redirect(`/new-year?token=${encodeURIComponent(access.mintedToken)}`)
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

  return <CelebrationWrapped recap={recap} occasion="new-year" />
}
