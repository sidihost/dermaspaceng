'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Crown,
  Check,
  Sparkles,
  Wallet,
  Lock,
  Loader2,
  AlertCircle,
  CreditCard,
} from 'lucide-react'
import {
  formatNgn,
  formatGlowPoints,
  type MembershipTierId,
} from '@/lib/membership-plans'

/*
 * Order-summary surface for /membership/checkout. Renders an
 * editorial two-column card on desktop (plan summary on the left,
 * itemised totals + payment CTA on the right) that collapses to a
 * single stacked column on mobile.
 *
 * Visual rules followed from the design guidelines + admin feedback:
 *   - Brand-purple #7B2D8E is the only accent. White surface, light
 *     gray hairlines, no gradients, no shadows on the card itself
 *     (rounded-2xl + 1px border is the visual containment).
 *   - Pricing breakdown reads like a real receipt: plan fee + the
 *     reward row (Glow Points for site tiers, wallet credit for
 *     Platinum) and a separate "Amount due today" row in brand purple.
 *   - The CTA is a solid brand-purple pill — a lock icon for the
 *     Paystack flow, a wallet icon for the wallet-pay flow.
 *
 * Submitting POSTs the plan id to /api/membership/subscribe (Paystack
 * flow) or /api/membership/pay-with-wallet (wallet flow); the server
 * re-derives the price from the plan catalog (we never trust
 * client-supplied amounts) and returns an authorization URL or a
 * receipt URL we redirect to.
 */

interface CheckoutClientProps {
  plan: {
    id: MembershipTierId
    name: string
    tagline: string
    price: number
    validityMonths: number
    /** Glow Points granted on signup. Earned reward — never money. */
    glowPointsOnSignup: number
    treatmentDiscountPct: number
    perks: readonly string[] | string[]
    accent: string
    /** True for the site-wide tiers (Silver, Gold) — they grant
     *  Glow Points but do NOT credit money to the user's wallet.
     *  False for the flagship Platinum spa membership. */
    siteWideOnly: boolean
  }
  /** Amount credited to the user's wallet on activation. Zero for
   *  site tiers; equal to the plan price for Platinum. */
  walletCredit: number
  /** Current wallet balance in naira — used to enable / disable the
   *  in-checkout "Pay with wallet" option. */
  walletBalance: number
  customer: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function CheckoutClient({
  plan,
  walletCredit,
  walletBalance,
  customer,
}: CheckoutClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // "paystack" (card / bank / USSD via Paystack) is the default
  // payment option; "wallet" pays straight from the existing
  // Dermaspace wallet balance. We render both as a small radio
  // segmented control above the CTA.
  const [method, setMethod] = useState<'paystack' | 'wallet'>('paystack')

  const canPayWithWallet = walletBalance >= plan.price

  // Validity copy — "12 months" reads more naturally than "1 year"
  // for short subscriptions, so we expand the number explicitly.
  const validityCopy =
    plan.validityMonths === 12 ? '12 months (1 year)' : `${plan.validityMonths} months`

  const handlePay = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (method === 'wallet') {
        // Wallet payment path — debit the user's wallet for the plan
        // price and activate the membership server-side. Lands on
        // the same receipt as the Paystack flow so the post-purchase
        // UX is identical.
        const res = await fetch('/api/membership/pay-with-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan.id }),
        })
        const data = await res.json()
        if (!res.ok || !data?.receiptUrl) {
          setError(
            data?.error ||
              'We could not complete the wallet payment. Please try again.',
          )
          setIsLoading(false)
          return
        }
        window.location.href = data.receiptUrl
        return
      }

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
                  <Check className="w-3 h-3" style={{ color: plan.accent }} />
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

      {/* RIGHT — receipt-style summary + payment CTA. */}
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

          {/* Glow Points reward row — every plan grants points. The
              site tiers stop here; Platinum continues into the
              wallet-credit row below. */}
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-600 flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
              <span>
                Glow Points reward
                <span className="block text-[11px] text-gray-500 mt-0.5">
                  {plan.siteWideOnly
                    ? 'A loyalty reward that unlocks more site features. Not money, not tied to bookings.'
                    : 'Loyalty reward on top of your wallet credit. Not money.'}
                </span>
              </span>
            </dt>
            <dd className="font-semibold text-[#7B2D8E] whitespace-nowrap">
              +{plan.glowPointsOnSignup.toLocaleString('en-NG')} pts
            </dd>
          </div>

          {/* Wallet credit row — Platinum only. We deliberately
              hide this on site tiers so customers never read it as
              an implied refund. */}
          {!plan.siteWideOnly && walletCredit > 0 && (
            <div className="border-t border-dashed border-gray-200 pt-3 flex items-start justify-between gap-3">
              <dt className="text-gray-600 flex items-start gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Credited to your wallet</span>
              </dt>
              <dd className="font-semibold text-gray-900 whitespace-nowrap">
                {formatNgn(walletCredit)}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-4 pt-4 border-t border-gray-200 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-900">
            Amount due today
          </span>
          <span className="text-2xl font-bold text-[#7B2D8E]">
            {formatNgn(plan.price)}
          </span>
        </div>

        {/* Payment method selector — two-option radio segmented
            control. Paystack is the default; the wallet option is
            disabled when the user's balance can't cover the plan
            price so we never let them click into a guaranteed error. */}
        <fieldset className="mt-5">
          <legend className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 mb-2">
            Payment method
          </legend>
          <div className="grid grid-cols-1 gap-2">
            <label
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                method === 'paystack'
                  ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="method"
                value="paystack"
                checked={method === 'paystack'}
                onChange={() => setMethod('paystack')}
                className="mt-1 accent-[#7B2D8E]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <CreditCard className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  Pay with Paystack
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Card, bank transfer &amp; USSD accepted
                </p>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                !canPayWithWallet
                  ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  : method === 'wallet'
                  ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 cursor-pointer'
                  : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
              }`}
            >
              <input
                type="radio"
                name="method"
                value="wallet"
                checked={method === 'wallet'}
                onChange={() => setMethod('wallet')}
                disabled={!canPayWithWallet}
                className="mt-1 accent-[#7B2D8E]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Wallet className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  Pay with wallet
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Balance: {formatNgn(walletBalance)}
                  {!canPayWithWallet && (
                    <span className="block text-[10px] text-gray-500 mt-0.5">
                      Not enough to cover {formatNgn(plan.price)} &mdash; top up or pay with Paystack.
                    </span>
                  )}
                </p>
              </div>
            </label>
          </div>
        </fieldset>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={isLoading || (method === 'wallet' && !canPayWithWallet)}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#7B2D8E] text-white font-semibold rounded-full text-sm hover:bg-[#5A1D6A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {method === 'wallet'
                ? 'Charging your wallet\u2026'
                : 'Starting secure checkout\u2026'}
            </>
          ) : method === 'wallet' ? (
            <>
              <Wallet className="w-4 h-4" />
              Pay {formatNgn(plan.price)} with wallet
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Pay {formatNgn(plan.price)} with Paystack
            </>
          )}
        </button>

        {/* Trust strip — small reassurances under the CTA. */}
        <ul className="mt-4 space-y-2 text-[11px] text-gray-600">
          <li className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
            Card, bank transfer &amp; USSD accepted via Paystack
          </li>
          <li className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
            {formatGlowPoints(plan.glowPointsOnSignup)} land instantly after payment
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
