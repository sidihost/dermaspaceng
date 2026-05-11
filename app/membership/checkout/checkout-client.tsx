'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Crown,
  Check,
  Gift,
  Wallet,
  Lock,
  Loader2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
} from 'lucide-react'
import { formatNgn, type MembershipTierId } from '@/lib/membership-plans'

/*
 * Order-summary surface for /membership/checkout. Renders an
 * editorial two-column card on desktop (plan summary on the left,
 * itemised totals + Paystack CTA on the right) that collapses to a
 * single stacked column on mobile.
 *
 * Visual rules followed from the design guidelines + admin feedback:
 *   - Brand-purple #7B2D8E is the only accent. White surface, light
 *     gray hairlines, no gradients, no shadows on the card itself
 *     (rounded-2xl + 1px border is the visual containment).
 *   - Pricing breakdown reads like a real receipt: plan fee + bonus
 *     credit -> wallet credit, then a separate &quot;Amount due today&quot;
 *     row in the brand colour.
 *   - The CTA is a solid brand-purple pill with a lock icon to
 *     reinforce that we&apos;re handing off to a real PSP (Paystack).
 *
 * Submitting POSTs the plan id to /api/membership/subscribe; the
 * server re-derives the price + bonus from the plan catalog (we
 * never trust client-supplied amounts) and returns a Paystack
 * authorization URL we redirect to.
 */

interface CheckoutClientProps {
  plan: {
    id: MembershipTierId
    name: string
    tagline: string
    price: number
    validityMonths: number
    bonusCreditPct: number
    treatmentDiscountPct: number
    perks: readonly string[] | string[]
    accent: string
  }
  bonusCredit: number
  totalWalletCredit: number
  customer: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function CheckoutClient({
  plan,
  bonusCredit,
  totalWalletCredit,
  customer,
}: CheckoutClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validity copy — &quot;12 months&quot; reads more naturally than &quot;1 year&quot;
  // for short subscriptions, so we expand the number explicitly.
  const validityCopy = plan.validityMonths === 12
    ? '12 months (1 year)'
    : `${plan.validityMonths} months`

  const handlePay = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/membership/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      })
      const data = await res.json()
      if (!res.ok || !data?.authorization_url) {
        setError(data?.error || 'We could not start your payment. Please try again.')
        setIsLoading(false)
        return
      }
      // Hand off to Paystack — same redirect pattern as the wallet
      // funding flow so the customer sees the familiar Paystack
      // hosted checkout, then comes back to /api/membership/verify
      // which lands them on /membership/receipt/<ref>.
      window.location.href = data.authorization_url
    } catch (err) {
      console.error('[v0] membership subscribe error', err)
      setError('Something went wrong. Please try again in a moment.')
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5 items-start">
      {/* LEFT — plan summary card.
          The visual feel matches the marketing membership grid (icon
          tile, name, tagline, perk list with brand-purple checks) so
          the customer recognises exactly what they picked. */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${plan.accent}1A` }}
          >
            <Crown className="w-5 h-5" style={{ color: plan.accent }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {plan.name}
              </h2>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${plan.accent}1A`,
                  color: plan.accent,
                }}
              >
                Annual
              </span>
            </div>
            <p
              className="text-xs text-gray-600 leading-snug mt-0.5"
              // Plan taglines may contain &amp; entities — render verbatim.
              dangerouslySetInnerHTML={{ __html: plan.tagline }}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
            What&rsquo;s included
          </p>
          <ul className="space-y-2.5">
            {plan.perks.map((perk, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${plan.accent}1A` }}
                >
                  <Check
                    className="w-3 h-3"
                    style={{ color: plan.accent }}
                  />
                </span>
                <span
                  className="text-sm text-gray-700 leading-relaxed"
                  // Perks may include &amp; entities — render verbatim.
                  dangerouslySetInnerHTML={{ __html: perk }}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Customer block — confirms who&apos;s buying. Lets the
            customer notice immediately if they&apos;re signed in to the
            wrong account before they hand over their card. */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
            Billed to
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {customer.firstName} {customer.lastName}
          </p>
          <p className="text-xs text-gray-600 mt-0.5 break-all">
            {customer.email}
          </p>
        </div>
      </div>

      {/* RIGHT — receipt-style summary + Paystack CTA. */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 md:p-6 lg:sticky lg:top-24">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
          Order summary
        </h3>

        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-600">
              {plan.name} membership
              <span className="block text-[11px] text-gray-500 mt-0.5">
                Valid for {validityCopy}
              </span>
            </dt>
            <dd className="font-semibold text-gray-900 whitespace-nowrap">
              {formatNgn(plan.price)}
            </dd>
          </div>

          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-600 flex items-start gap-1.5">
              <Gift className="w-3.5 h-3.5 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
              <span>
                Bonus wallet credit
                <span className="block text-[11px] text-gray-500 mt-0.5">
                  {plan.bonusCreditPct}% bonus on signup
                </span>
              </span>
            </dt>
            <dd className="font-semibold text-[#7B2D8E] whitespace-nowrap">
              +{formatNgn(bonusCredit)}
            </dd>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 flex items-start justify-between gap-3">
            <dt className="text-gray-600 flex items-start gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <span>Credited to your wallet</span>
            </dt>
            <dd className="font-semibold text-gray-900 whitespace-nowrap">
              {formatNgn(totalWalletCredit)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 pt-4 border-t border-gray-200 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-900">
            Amount due today
          </span>
          <span className="text-2xl font-bold text-[#7B2D8E]">
            {formatNgn(plan.price)}
          </span>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={isLoading}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#7B2D8E] text-white font-semibold rounded-full text-sm hover:bg-[#5A1D6A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting secure checkout&hellip;
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Pay {formatNgn(plan.price)} with Paystack
            </>
          )}
        </button>

        {/* Trust strip — three tiny reassurances under the CTA, the
            same shape e-commerce checkouts use to dial down payment
            anxiety. Brand-purple icons, gray text, no shadow. */}
        <ul className="mt-4 space-y-2 text-[11px] text-gray-600">
          <li className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
            Secured by Paystack &mdash; PCI-DSS compliant
          </li>
          <li className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
            Card, bank transfer &amp; USSD accepted
          </li>
          <li className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
            Wallet credit appears instantly after payment
          </li>
        </ul>

        <button
          type="button"
          onClick={() => router.back()}
          disabled={isLoading}
          className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-700 transition-colors py-1.5 disabled:opacity-50"
        >
          Change plan
        </button>
      </div>
    </div>
  )
}
