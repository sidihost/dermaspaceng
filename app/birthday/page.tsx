import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getBirthdayRecapForUser } from '@/lib/birthday-recap'
import type { RecapPayload } from '@/lib/birthday'
import { evaluateCelebrationAccess } from '@/lib/celebration-tokens'
import CelebrationLocked from '@/components/celebrations/celebration-locked'
import BirthdayWrapped from './birthday-wrapped'

export const metadata: Metadata = {
  title: 'Your Glow Year • Dermaspace',
  description:
    'Celebrate another year of glow — your spa journey, wrapped. A personal birthday recap from Dermaspace.',
}

export const dynamic = 'force-dynamic'

/**
 * /birthday — Glow Year Wrapped
 *
 * Auth-gated & token-enforced recap experience. Only unlocked on the
 * member's actual birthday (Africa/Lagos) or with a valid, non-expired,
 * user-bound HMAC token originally issued on their birthday.
 */
export default async function BirthdayRecapPage({
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
      ? `/birthday?token=${encodeURIComponent(rawToken)}`
      : '/birthday'
    redirect(`/signin?redirect=${encodeURIComponent(nextPath)}`)
  }

  let dobIso: string | null = null
  try {
    const rows = await sql`
      SELECT TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS dob
      FROM users
      WHERE id = ${user.id}
      LIMIT 1
    `
    dobIso = (rows[0]?.dob as string | null) ?? null
  } catch {
    dobIso = null
  }

  const access = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: user.id,
    dobIso,
    token: rawToken,
  })

  if (!access.allowed) {
    return (
      <CelebrationLocked
        occasion="birthday"
        reason={access.reason}
        firstName={user.first_name}
        dobIso={dobIso}
      />
    )
  }

  if (access.needsTokenRedirect) {
    redirect(`/birthday?token=${encodeURIComponent(access.mintedToken)}`)
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
      birthday: dobIso,
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

  return <BirthdayWrapped recap={recap} />
}
