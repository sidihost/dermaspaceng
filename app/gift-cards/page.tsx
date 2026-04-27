/**
 * /gift-cards — server-side feature gate.
 *
 * The actual purchase flow lives in `gift-cards-client.tsx` (client
 * component, large bundle). This thin server wrapper checks the
 * `gift_cards` flag in `feature_flags` BEFORE we ever ship the
 * client chunk. When the flag is OFF visitors get the friendly
 * "Currently unavailable" screen instead of a half-broken page.
 *
 * This is the pattern that finally makes the admin "Gift cards"
 * toggle in /admin/features have a visible effect — previously the
 * flag was persisted but nothing read it on this route.
 */

import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { FeatureUnavailable } from '@/components/shared/feature-unavailable'
import GiftCardsClient from './gift-cards-client'

export default async function GiftCardsPage() {
  const enabled = await isFeatureEnabled('gift_cards')
  if (!enabled) {
    return (
      <>
        <Header />
        <FeatureUnavailable
          title="Gift cards are paused"
          body="Our gift card flow is temporarily turned off while we update it. You can still call us to arrange a gift in person, or check back soon."
        />
        <Footer />
      </>
    )
  }
  return <GiftCardsClient />
}
