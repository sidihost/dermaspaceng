import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { getCurrentUser } from '@/lib/auth'
import { getMembershipPlan } from '@/lib/membership-plans'
import { getWalletBalance } from '@/lib/wallet'
import CheckoutClient from './checkout-client'

export const metadata: Metadata = {
  title: 'Complete your membership | Dermaspace',
  description:
    'Review your Dermaspace membership plan and complete checkout securely with Paystack.',
  // The checkout page surfaces the signed-in user&apos;s name + email
  // — we deliberately keep search engines off it so a public bot
  // doesn&apos;t index a personalised order-summary.
  robots: { index: false, follow: false },
}

/*
 * /membership/checkout?plan=<silver|gold|platinum>
 *
 * The dedicated checkout step the membership grid links into.
 * Previously the &quot;Get {plan}&quot; CTA pointed at /contact?plan=… which
 * routed the customer to the support / ticket page — admin feedback
 * was that this isn&apos;t a real checkout, just a contact form. This
 * page is the proper checkout:
 *
 *   1. Authenticates the user server-side. If not signed in we kick
 *      them to /signin?next=/membership/checkout?plan=… so they come
 *      back to the same screen post-login.
 *
 *   2. Validates the requested plan against the plan catalog. Any
 *      unknown / stale plan id bounces back to /membership.
 *
 *   3. Renders an order-summary card — plan name, included perks,
 *      itemised pricing (plan fee + bonus wallet credit + total
 *      credited to wallet) and a &quot;Pay with Paystack&quot; CTA that hands
 *      off to /api/membership/subscribe.
 *
 * The actual payment + verification + receipt flow lives in the
 * sibling API routes and `/membership/receipt/[reference]` — this
 * page only handles the read-only summary.
 */
export default async function MembershipCheckoutPage({
  searchParams,
}: {
  // Next 15+: searchParams is a Promise that must be awaited before
  // we can read individual keys off it.
  searchParams: Promise<{ plan?: string }>
}) {
  const params = await searchParams
  const planId = params.plan?.toLowerCase() ?? ''
  const plan = getMembershipPlan(planId)

  // Unknown plan -> bounce back to the marketing page. This is the
  // friendliest failure mode: the customer either tweaked the URL
  // by hand or followed a stale link from elsewhere, and the
  // membership grid is the right surface to re-pick from.
  if (!plan) {
    redirect('/membership')
  }

  const user = await getCurrentUser()

  // Not signed in -> /signin with a `next` param so we return them
  // here. We URL-encode the destination so the plan query param
  // survives the round-trip without being eaten by Next&apos;s router.
  if (!user) {
    const next = encodeURIComponent(`/membership/checkout?plan=${plan.id}`)
    redirect(`/signin?next=${next}`)
  }

  // Pre-compute the math the order-summary surface needs. Doing it
  // server-side keeps the client component dumb (presentation only)
  // and means a curious user opening DevTools never sees a path
  // where they could tamper with the totals — the server-side
  // subscribe endpoint re-validates everything from the plan id.
  //
  // Wallet credit only applies to the flagship Platinum spa
  // membership. Silver / Gold are site-wide tiers — they grant
  // Glow Points (a reward, not money) and never credit the wallet.
  const walletCredit = plan.siteWideOnly ? 0 : plan.price
  // Wallet balance for the in-checkout wallet payment option. We
  // read this server-side so the client never has to call
  // /api/wallet — keeps the page fast and avoids a loading flash.
  const walletBalance = await getWalletBalance(
    user.id as unknown as number,
  ).catch(() => 0)

  return (
    <main className="bg-gray-50 min-h-screen flex flex-col">
      <Header />

      {/* Back link — minimal, no chrome, just a quiet way back to
          the grid in case the customer wants to re-pick. */}
      <div className="max-w-3xl w-full mx-auto px-4 pt-6">
        <Link
          href="/membership"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to plans
        </Link>
      </div>

      <section className="flex-1 py-6 md:py-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-6 md:mb-8">
            <p className="text-xs font-medium text-[#7B2D8E] uppercase tracking-widest mb-1.5">
              Checkout
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance">
              Confirm your membership
            </h1>
            <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
              Review your plan and complete payment securely. Your
              Glow Points land in your account the moment we receive
              confirmation.
            </p>
          </div>

          <CheckoutClient
            plan={{
              id: plan.id,
              name: plan.name,
              tagline: plan.tagline,
              price: plan.price,
              validityMonths: plan.validityMonths,
              glowPointsOnSignup: plan.glowPointsOnSignup,
              treatmentDiscountPct: plan.treatmentDiscountPct,
              perks: plan.perks,
              accent: plan.accent,
              siteWideOnly: plan.siteWideOnly,
            }}
            walletCredit={walletCredit}
            walletBalance={walletBalance}
            customer={{
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.email,
            }}
          />
        </div>
      </section>

      <Footer />
    </main>
  )
}
