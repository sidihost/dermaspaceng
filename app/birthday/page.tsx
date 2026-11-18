import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { getBirthdayRecapForUser } from '@/lib/birthday-recap'
import type { RecapPayload } from '@/lib/birthday'
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
 * Auth-gated recap experience. Reads directly from getBirthdayRecapForUser()
 * on the server so SSR renders immediately with real member metrics without
 * making a loopback HTTP request.
 */
export default async function BirthdayRecapPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/signin?redirect=/birthday')
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

  return <BirthdayWrapped recap={recap} />
}
