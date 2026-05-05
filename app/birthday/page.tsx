import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import BirthdayWrapped, { type RecapPayload } from './birthday-wrapped'

export const metadata: Metadata = {
  title: 'Your Glow Year • Dermaspace',
  description:
    'Celebrate another year of glow — your spa journey, wrapped. A personal birthday recap from Dermaspace.',
}

export const dynamic = 'force-dynamic'

/**
 * /birthday — Glow Year Wrapped
 *
 * Auth-gated recap experience. We do the data fetch on the server so
 * the first paint already has the user's first name and stats baked
 * in (no flash of skeleton inside a full-screen story). The data
 * itself comes from /api/user/birthday-recap; we re-use the API
 * because the same payload also powers the "open last year's recap"
 * deep link from email.
 */
export default async function BirthdayRecapPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/signin?redirect=/birthday')
  }

  // Server-side fetch of the recap. We construct an absolute URL so
  // this works during SSR — relative `/api/...` only resolves on the
  // client. We forward the inbound cookie so the API can read the
  // session.
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const protocol = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  const cookie = h.get('cookie') ?? ''

  let recap: RecapPayload | null = null
  try {
    const res = await fetch(`${protocol}://${host}/api/user/birthday-recap`, {
      cache: 'no-store',
      headers: { cookie },
    })
    if (res.ok) recap = (await res.json()) as RecapPayload
  } catch {
    recap = null
  }

  // Hard fallback shape so the UI renders even if the API blew up
  // (shouldn't happen — but a story flow with `undefined` everywhere
  // would be a much worse failure mode than a graceful "your journey
  // is just beginning" version).
  const fallback: RecapPayload = {
    user: {
      firstName: (user as { first_name?: string | null }).first_name ?? 'Friend',
      lastName: null,
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

  return <BirthdayWrapped recap={recap ?? fallback} />
}
