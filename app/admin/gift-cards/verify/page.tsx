import Link from 'next/link'
import { ArrowLeft, FileSearch, ShieldCheck } from 'lucide-react'
import { GiftCardVerifyClient } from '@/components/gift-cards/gift-card-verify-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin Gift Card Verification | Dermaspace Admin',
  description:
    'Administrator gift card signature verification, order lookup, and audit console.',
}

export default async function AdminGiftCardVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const resolved = await searchParams
  const initialCode = typeof resolved.code === 'string' ? resolved.code : ''

  return (
    <div className="max-w-4xl space-y-5">
      {/* Admin Audit Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Admin Audit &amp; Verification</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
            Gift Card Verification &amp; Order Audit
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Validate gift card signatures, inspect payment and invoice records, and jump directly to full order controls.
          </p>
        </div>

        <Link
          href="/admin/gift-cards"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Gift Cards</span>
        </Link>
      </header>

      {/* Admin Audit Scope Notice */}
      <div className="rounded-xl border border-[#7B2D8E]/20 bg-[#FAF6FB] px-4 py-3 flex items-start gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#7B2D8E] text-white shrink-0">
          <FileSearch className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900">
            Full Administrator Verification View
          </p>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            Verified cards include order IDs, invoice references, and direct access to the CR80 print studio and recipient email delivery controls.
          </p>
        </div>
      </div>

      <GiftCardVerifyClient
        initialCode={initialCode}
        userRole="admin"
        embedded
      />
    </div>
  )
}
