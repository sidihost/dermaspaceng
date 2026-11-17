'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Crown,
  Calendar,
  Wallet,
  Award,
  Receipt as ReceiptIcon,
} from 'lucide-react'
import {
  downloadMembershipReceiptImage,
  downloadMembershipReceiptPdf,
  type MembershipReceiptInput,
} from '@/lib/receipt-pdf'
import {
  RECEIPT_MASTHEAD_PATTERN_STYLE,
  RECEIPT_TOTAL_PATTERN_STYLE,
  ReceiptActionButtons,
  ReceiptCornerMarks,
  ReceiptCrownBand,
  ReceiptTearDivider,
} from '@/components/receipt/receipt-chrome'

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
    glowPointsOnSignup: number
    validityMonths: number
    siteWideOnly: boolean
  }
  amounts: {
    planPrice: number
    walletCredit: number
  }
  buyer: {
    firstName: string
    lastName: string
    email: string
    membershipStartedAt: string | null
    membershipExpiresAt: string | null
  }
  paymentMethod: string
  invoiceNumber: string | null
  isTeamViewer?: boolean
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
    month: 'short',
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
  isTeamViewer = false,
}: ReceiptClientProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingImage, setDownloadingImage] = useState(false)

  const validityCopy =
    plan.validityMonths === 12
      ? '12 months (1 year)'
      : `${plan.validityMonths} months`

  const receiptInput: MembershipReceiptInput = {
    reference,
    txCreatedAt,
    txStatus,
    planName: plan.name,
    validityMonths: plan.validityMonths,
    glowPointsOnSignup: plan.glowPointsOnSignup,
    siteWideOnly: plan.siteWideOnly,
    planPrice: amounts.planPrice,
    walletCredit: amounts.walletCredit,
    buyerFirstName: buyer.firstName,
    buyerLastName: buyer.lastName,
    buyerEmail: buyer.email,
    membershipStartedAt: buyer.membershipStartedAt,
    membershipExpiresAt: buyer.membershipExpiresAt,
    paymentMethod,
    invoiceNumber,
  }

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return
    setDownloadingPdf(true)
    try {
      await downloadMembershipReceiptPdf(receiptInput)
    } catch {
      // best effort
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDownloadImage = async () => {
    if (downloadingImage) return
    setDownloadingImage(true)
    try {
      await downloadMembershipReceiptImage(receiptInput)
    } catch {
      // best effort
    } finally {
      setDownloadingImage(false)
    }
  }

  return (
    <main className="bg-[#F7F5F9] min-h-screen py-5 md:py-8 print:bg-white print:py-0">
      <style jsx global>{`
        @media print {
          @page { margin: 12mm; }
          body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .print-flat {
            border: 1px solid #e4e4e7 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div className="max-w-lg mx-auto px-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-3.5">
          <Link
            href={isTeamViewer ? '/staff/money' : '/dashboard'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {isTeamViewer ? 'Back to Staff' : 'Dashboard'}
          </Link>
          <ReceiptActionButtons
            onDownloadPdf={handleDownloadPdf}
            onDownloadImage={handleDownloadImage}
            onPrint={() => window.print()}
            downloadingPdf={downloadingPdf}
            downloadingImage={downloadingImage}
          />
        </div>

        {alreadyProcessed && (
          <div className="no-print mb-3.5 px-3 py-2 rounded-lg border border-[#7B2D8E]/20 bg-[#F7F2FA] text-xs text-[#5A1D6A]">
            This receipt was generated earlier &mdash; your membership is already active.
          </div>
        )}

        <article className="relative overflow-hidden bg-white rounded-2xl border border-[#7B2D8E]/20 print-flat">
          <ReceiptCrownBand />

          {/* Patterned Masthead */}
          <header
            className="relative px-5 sm:px-6 pt-5 pb-4 bg-[#F7F2FA] border-b border-[#7B2D8E]/15"
            style={RECEIPT_MASTHEAD_PATTERN_STYLE}
          >
            <ReceiptCornerMarks inset="inset-2" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <Image
                  src="/images/dermaspace-logo.png"
                  alt="Dermaspace Esthetic & Wellness Centre"
                  width={130}
                  height={36}
                  priority
                  className="h-8 w-auto object-contain"
                />
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Esthetic &amp; Wellness Centre &middot; Lagos
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
                  Official Receipt
                </p>
                <p className="mt-0.5 text-xs font-bold text-gray-900">
                  Membership
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500 tabular-nums">
                  {formatDateTime(txCreatedAt)}
                </p>
              </div>
            </div>
          </header>

          {/* Reference & Status Strip */}
          <div className="px-5 sm:px-6 pt-4 pb-1 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Reference
              </p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-[#7B2D8E] break-all">
                {reference}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#7B2D8E] text-white">
              <Check className="w-3 h-3" />
              {txStatus === 'completed' ? 'Paid' : txStatus}
            </span>
          </div>

          <ReceiptTearDivider notchBgClass="bg-[#F7F5F9]" />

          {/* Summary Hero */}
          <div className="px-5 sm:px-6 pb-4 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#F7F2FA] border border-[#7B2D8E]/20 mb-2.5">
              <Check className="w-5 h-5 text-[#7B2D8E]" strokeWidth={2.5} />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 text-balance">
              Payment received
            </h1>
            <p className="mt-1 text-xs sm:text-[13px] text-gray-600 max-w-sm mx-auto leading-relaxed">
              Thank you, {buyer.firstName}. Your{' '}
              <span className="font-semibold text-gray-900">{plan.name}</span>{' '}
              membership is active
              {plan.siteWideOnly
                ? ' with Glow Points added.'
                : ' — wallet funded & Glow Points added.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F7F2FA] text-[#7B2D8E] border border-[#7B2D8E]/20">
                <Crown className="w-3 h-3" />
                {plan.name} Tier
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-700 bg-gray-100">
                <Calendar className="w-3 h-3 text-[#7B2D8E]" />
                {validityCopy}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <section className="mx-5 sm:mx-6 rounded-xl border border-[#7B2D8E]/15 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#F7F2FA] border-b border-[#7B2D8E]/15 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
              <span>Item Description</span>
              <span>Amount</span>
            </div>
            <div className="divide-y divide-gray-100 text-xs sm:text-[13px]">
              <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                <div>
                  <p className="font-semibold text-gray-900">
                    {plan.name} Membership
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Annual subscription &middot; {validityCopy}
                  </p>
                </div>
                <span className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                  {formatNaira(amounts.planPrice)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 px-3.5 py-2.5 bg-[#FBF9FD]">
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-gray-900">
                    <Award className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    Glow Points earned
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Loyalty reward unlocked across Dermaspace
                  </p>
                </div>
                <span className="font-semibold text-[#7B2D8E] tabular-nums whitespace-nowrap">
                  +{formatPoints(plan.glowPointsOnSignup)}
                </span>
              </div>

              {!plan.siteWideOnly && amounts.walletCredit > 0 && (
                <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                    <Wallet className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    Credited to wallet
                  </div>
                  <span className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    {formatNaira(amounts.walletCredit)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Total Banner */}
          <div
            className="mx-5 sm:mx-6 mt-4 rounded-xl bg-[#7B2D8E] text-white px-4 py-3 flex items-center justify-between border border-[#7B2D8E]"
            style={RECEIPT_TOTAL_PATTERN_STYLE}
          >
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/75">
                Amount Paid
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums">
                {formatNaira(amounts.planPrice)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-white">
                {paymentMethod}
              </p>
              {invoiceNumber && (
                <p className="mt-0.5 font-mono text-[10px] text-white/80">
                  {invoiceNumber}
                </p>
              )}
            </div>
          </div>

          {/* Compact Meta Grid */}
          <section className="mx-5 sm:mx-6 mt-4 rounded-xl border border-gray-100 bg-[#FBF9FD] px-3.5 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <div>
              <dt className="text-gray-400 uppercase tracking-wider text-[9.5px] font-bold">
                Billed To
              </dt>
              <dd className="mt-0.5 font-semibold text-gray-900 truncate">
                {buyer.firstName} {buyer.lastName}
              </dd>
              <dd className="text-[11px] text-gray-500 truncate">{buyer.email}</dd>
            </div>
            <div>
              <dt className="text-gray-400 uppercase tracking-wider text-[9.5px] font-bold">
                Payment Method
              </dt>
              <dd className="mt-0.5 font-semibold text-gray-900">
                {paymentMethod}
              </dd>
              <dd className="text-[11px] text-gray-500">
                {paymentMethod === 'Wallet' ? 'Dermaspace wallet' : 'Online checkout'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 uppercase tracking-wider text-[9.5px] font-bold">
                Starts
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900 tabular-nums">
                {formatDate(buyer.membershipStartedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 uppercase tracking-wider text-[9.5px] font-bold">
                Valid Until
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900 tabular-nums">
                {formatDate(buyer.membershipExpiresAt)}
              </dd>
            </div>
          </section>

          <ReceiptTearDivider notchBgClass="bg-[#F7F5F9]" className="mt-2" />

          <footer className="px-5 sm:px-6 pb-5 pt-1 text-center text-[11px] text-gray-500 leading-relaxed">
            <p className="font-semibold text-[#7B2D8E]">
              Crafted with care at Dermaspace
            </p>
            <p className="mt-1">
              237B Muri Okunola St, Victoria Island &middot; 9 Agbeke Rotinwa Cl, Ikoyi
            </p>
            <p className="mt-0.5 text-[10.5px] text-gray-400">
              <a
                href="mailto:info@dermaspaceng.com"
                className="text-[#7B2D8E] font-medium hover:underline"
              >
                info@dermaspaceng.com
              </a>{' '}
              &middot; &copy; {new Date().getFullYear()} Dermaspace
            </p>
          </footer>
        </article>

        <div className="no-print mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={isTeamViewer ? '/staff' : '/dashboard'}
            className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 bg-[#7B2D8E] text-white font-semibold rounded-lg text-xs hover:bg-[#5A1D6A] transition-colors"
          >
            {isTeamViewer ? 'Staff Console' : 'Dashboard'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={isTeamViewer ? '/staff/money' : '/dashboard/transactions'}
            className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 bg-white text-[#7B2D8E] border border-[#7B2D8E]/30 font-semibold rounded-lg text-xs hover:bg-[#F7F2FA] transition-colors"
          >
            <ReceiptIcon className="w-3.5 h-3.5" />
            {isTeamViewer ? 'Money & Ledger' : 'All Transactions'}
          </Link>
        </div>
      </div>
    </main>
  )
}
