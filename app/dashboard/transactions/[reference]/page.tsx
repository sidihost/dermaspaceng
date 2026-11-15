import type { Metadata } from 'next'
import { Suspense } from 'react'
import TransactionDetailContent from './transaction-detail-content'

export const metadata: Metadata = {
  title: 'Transaction Details',
  description: 'Full details for a single Dermaspace wallet transaction.',
  robots: { index: false, follow: false },
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F4F8] flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7B2D8E] border-t-transparent" />
        </div>
      }
    >
      <TransactionDetailContent reference={reference} />
    </Suspense>
  )
}
