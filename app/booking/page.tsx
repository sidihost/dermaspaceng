/**
 * /booking — server-side feature gate.
 *
 * Wraps the client `booking-client.tsx` in an `isFeatureEnabled`
 * check against the `booking` flag. When OFF, visitors land on the
 * friendly "currently unavailable" screen instead of the waitlist
 * UI. This is the same pattern used for /gift-cards and ensures
 * the admin toggle has a real, visible effect.
 */

import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { FeatureUnavailable } from '@/components/shared/feature-unavailable'
import BookingClient from './booking-client'

export default async function BookingPage() {
  const enabled = await isFeatureEnabled('booking')
  if (!enabled) {
    return (
      <>
        <Header />
        <FeatureUnavailable
          title="Online booking is paused"
          body="We're not taking online appointments right now. Please call us to schedule, or check back in a bit — we'll have it open again soon."
        />
        <Footer />
      </>
    )
  }
  return <BookingClient />
}
