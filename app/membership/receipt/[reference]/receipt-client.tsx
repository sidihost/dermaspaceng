'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Check,
  Printer,
  ArrowRight,
  Crown,
  Calendar,
  Wallet,
  Sparkles,
  Receipt as ReceiptIcon,
} from 'lucide-react'

/*
 * Membership receipt — the polished landing page after a successful
 * Paystack (or wallet) payment. Designed as a real printable
 * document, not a "thanks for your purchase" toast:
 *
 *   - Centered max-w-2xl card with hairline border, no shadow.
 *   - Brand wordmark + a small "Receipt" eyebrow at the top so the
 *     printed page reads like a Dermaspace document.
 *   - Hero success row: brand-purple check disc, "Payment received",
 *     amount, plan + validity. No emoji, no sparkle decorations.
 *   - Itemised line items table reading like a real receipt.
 *   - Meta grid (reference, invoice number, date, payment method,
 *     billed-to).
 *   - Two-action footer: Print receipt + Go to dashboard.
 *
 * Print styling: an embedded `@media print` block hides the header
 * navigation + buttons so window.print() yields a clean receipt
 * the customer can save as PDF.
 *
 * Loyalty reward: site tiers (Silver, Gold) grant Glow Points
 * instead of crediting the wallet. Platinum credits the plan price
 * to the wallet AND grants points. The receipt always shows the
 * points row; the wallet-credit row only renders for Platinum.
 */

interface ReceiptClientProps {
  reference: string
  txCreatedAt: string
  txStatus: string
  alreadyProcessed: boolean
  plan: {
    id: string
    name: string
    tagline: string
    accent: string
    /** Glow Points granted on signup — surfaced on the receipt as
     *  a non-monetary reward row. Always non-zero for any tier. */
    glowPointsOnSignup: number
    validityMonths: number
    /** True for the site-wide tiers (Silver, Gold). They earn Glow
     *  Points but do NOT credit money to the user's wallet — the
     *  receipt hides the wallet-credit row entirely. */
    siteWideOnly: boolean
  }
  amounts: {
    planPrice: number
    /** Plan price credited to wallet (Platinum only). Zero for
     *  site tiers — the corresponding row is hidden. */
    walletCredit: number
  }
  buyer: {
    firstName: string
    lastName: string
    email: string
    membershipStartedAt: string | null
    membershipExpiresAt: string | null
  }
  /** "Paystack" or "Wallet" — displayed in the payment-method meta cell. */
  paymentMethod: string
  invoiceNumber: string | null
}

function formatNaira(amount: number): string {
  if (!Number.isFinite(amount)) return '\u20A60'
  return `\u20A6${Math.round(amount).toLocaleString('en-NG')}`
}

function formatPoints(amount: number): string {
  if (!Number.isFinite(amount)) return '0 pts'
  return `${Math.round(amount).toLocaleString('en-NG')} pts`
}

function formatDate(iso: string | null): string {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ReceiptClient({
  reference,
  txCreatedAt,
  txStatus,
  alreadyProcessed,
  plan,
  amounts,
  buyer,
  paymentMethod,
  invoiceNumber,
}: ReceiptClientProps) {
  const validityCopy =
    plan.validityMonths === 12 ? '12 months (1 year)' : `${plan.validityMonths} months`

  return (
    <main className="bg-gray-50 min-h-screen py-6 md:py-10 print:bg-white print:py-0">
      <style jsx global>{`
        @media print {
          @page { margin: 12mm; }
          body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .print-flat {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-4">
        <div className="no-print flex items-center justify-between mb-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
          >
            &larr; Back to dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7B2D8E] border border-[#7B2D8E]/30 rounded-full hover:bg-[#7B2D8E]/5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print receipt
          </button>
        </div>

        {alreadyProcessed && (
          <div className="no-print mb-4 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
            This receipt was generated earlier &mdash; your membership is already active.
          </div>
        )}

        <article className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 print-flat">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-100">
            <Image
              src="/images/dermaspace-logo.png"
              alt="Dermaspace Esthetic & Wellness Centre"
              width={140}
              height={40}
              priority
              className="h-9 w-auto"
            />
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7B2D8E]">
                Receipt
              </p>
              <p className="mt-1 text-xs font-mono text-gray-600 break-all">
                {reference}
              </p>
            </div>
          </header>

          <div className="pt-6 pb-2 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Check className="w-7 h-7 text-[#7B2D8E]" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance">
              Payment received
            </h1>
            <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
              Thank you, {buyer.firstName}. Your{' '}
              <span className="font-semibold text-gray-900">{plan.name}</span>{' '}
              membership is now active
              {plan.siteWideOnly
                ? ' and your Glow Points have been added to your account.'
                : ' \u2014 your wallet is funded and Glow Points have been added.'}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: `${plan.accent}1A`,
                color: plan.accent,
              }}
            >
              <Crown className="w-3.5 h-3.5" />
              {plan.name} membership
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-gray-700 bg-gray-100">
              <Calendar className="w-3.5 h-3.5" />
              Valid for {validityCopy}
            </span>
          </div>

          <section className="mt-7 pt-6 border-t border-gray-100">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
              Details
            </h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="align-top">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-gray-900">
                      {plan.name} Membership
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Annual subscription &middot; {validityCopy}
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {formatNaira(amounts.planPrice)}
                  </td>
                </tr>
                {/* Glow Points row — shown for every tier. Non-monetary
                    reward; we render the value as "pts" + an explanatory
                    sub-label so it never reads as money. */}
                <tr className="align-top">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-1.5 font-medium text-gray-900">
                      <Sparkles className="w-3.5 h-3.5 text-[#7B2D8E]" />
                      Glow Points earned
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Unlocks more features across Dermaspace &mdash; not money, not tied to bookings
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-[#7B2D8E] whitespace-nowrap">
                    +{formatPoints(plan.glowPointsOnSignup)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                {/* Wallet credit row — Platinum only. Site tiers never
                    credit money so this whole sub-total is hidden. */}
                {!plan.siteWideOnly && amounts.walletCredit > 0 && (
                  <tr className="border-t border-dashed border-gray-200">
                    <td className="pt-3 pr-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700">
                        <Wallet className="w-3.5 h-3.5" />
                        Credited to wallet
                      </div>
                    </td>
                    <td className="pt-3 text-right text-base font-bold text-gray-900 whitespace-nowrap">
                      {formatNaira(amounts.walletCredit)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="pt-4 pr-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-900">
                      Amount paid
                    </div>
                  </td>
                  <td className="pt-4 text-right text-2xl font-bold text-[#7B2D8E] whitespace-nowrap">
                    {formatNaira(amounts.planPrice)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="mt-7 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div>
              <dt className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Billed to
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {buyer.firstName} {buyer.lastName}
              </dd>
              <dd className="text-xs text-gray-600 break-all">
                {buyer.email}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Date
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {formatDateTime(txCreatedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Payment method
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {paymentMethod}
              </dd>
              <dd className="text-xs text-gray-500">
                {paymentMethod === 'Wallet'
                  ? 'Paid from Dermaspace wallet balance'
                  : 'Card / bank transfer / USSD'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Reference
              </dt>
              <dd className="mt-0.5 text-xs font-mono text-gray-900 break-all">
                {reference}
              </dd>
              {invoiceNumber && (
                <dd className="text-xs font-mono text-gray-500 break-all mt-0.5">
                  Invoice: {invoiceNumber}
                </dd>
              )}
            </div>
            <div>
              <dt className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Membership starts
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {formatDate(buyer.membershipStartedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Valid until
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {formatDate(buyer.membershipExpiresAt)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Status
              </dt>
              <dd className="mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-100">
                  <Check className="w-3 h-3" />
                  {txStatus === 'completed' ? 'Paid' : txStatus}
                </span>
              </dd>
            </div>
          </section>

          <footer className="mt-7 pt-6 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
            <p>
              This document is your official receipt for membership purchase.
              Keep it for your records. If you have any questions, reply to
              your confirmation email or contact{' '}
              <a
                href="mailto:hello@dermaspaceng.com"
                className="text-[#7B2D8E] font-semibold hover:underline"
              >
                hello@dermaspaceng.com
              </a>
              .
            </p>
            <p className="mt-3 text-[11px] text-gray-500">
              Dermaspace Esthetic &amp; Wellness Centre &middot;
              Victoria Island: 237b Muri Okunola St, Lagos &middot;
              Ikoyi: 9 Agbeke Rotinwa Cl, Dolphin Extension Estate, Lagos
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              &copy; {new Date().getFullYear()} Dermaspace. All rights reserved.
            </p>
          </footer>
        </article>

        <div className="no-print mt-5 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white font-semibold rounded-full text-sm hover:bg-[#5A1D6A] transition-colors"
          >
            Go to dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#7B2D8E] border border-[#7B2D8E] font-semibold rounded-full text-sm hover:bg-[#7B2D8E]/5 transition-colors"
          >
            <ReceiptIcon className="w-4 h-4" />
            View all transactions
          </Link>
        </div>
      </div>
    </main>
  )
}
