import Link from 'next/link'
import { ArrowLeft, ClipboardCheck, QrCode, ShieldCheck } from 'lucide-react'
import { GiftCardVerifyClient } from '@/components/gift-cards/gift-card-verify-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Reception Gift Card Verifier | Dermaspace Staff',
  description:
    'Front-desk staff gift card QR scanner and guest redemption check.',
}

export default async function StaffGiftCardVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const resolved = await searchParams
  const initialCode = typeof resolved.code === 'string' ? resolved.code : ''

  return (
    <div className="max-w-4xl space-y-5">
      {/* Staff Reception Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
            <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Staff Reception Desk</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
            Verify Guest Gift Card
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Scan the QR code on the guest&apos;s card or enter the serial code before redeeming a treatment.
          </p>
        </div>

        <Link
          href="/staff/gift-cards"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Gift Card Requests</span>
        </Link>
      </header>

      {/* Reception Quick Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-start gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FAF6FB] border border-[#7B2D8E]/15 text-[#7B2D8E] shrink-0">
            <QrCode className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">1. Scan or enter code</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
              Use camera scan, upload a photo, or type the DSGC code.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-start gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FAF6FB] border border-[#7B2D8E]/15 text-[#7B2D8E] shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">2. Confirm active &amp; paid</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
              Only redeem cards verified as valid with paid status.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-start gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FAF6FB] border border-[#7B2D8E]/15 text-[#7B2D8E] shrink-0">
            <ClipboardCheck className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">3. Match guest &amp; value</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
              Confirm recipient name and card value before check-in.
            </p>
          </div>
        </div>
      </div>

      <GiftCardVerifyClient
        initialCode={initialCode}
        userRole="staff"
        embedded
      />
    </div>
  )
}
