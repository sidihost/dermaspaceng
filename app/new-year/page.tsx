import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { getBirthdayRecapForUser } from '@/lib/birthday-recap'
import type { RecapPayload } from '@/lib/birthday'
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
 * Auth-gated New Year celebration & year-in-review story backed by live
 * user + booking metrics from getBirthdayRecapForUser().
 */
export default async function NewYearCelebrationPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/signin?redirect=/new-year')
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
