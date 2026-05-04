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

// `isFeatureEnabled` reads the `gift_cards` flag through Upstash
// Redis (REST + `cache: 'no-store'`), which Next.js sees as dynamic
// during prerender. Without this declaration the build emits a
// stream of "Dynamic server usage: Route /gift-cards couldn't be
// rendered statically" warnings on every deploy. We genuinely WANT
// this route to be dynamic — admins must be able to toggle the
// flag and have visitors see the change within 60s — so opt out
// of static prerender explicitly. (Aligned with the same pattern
// used for `/admin/*` and other flag-gated routes.)
export const dynamic = 'force-dynamic'

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
