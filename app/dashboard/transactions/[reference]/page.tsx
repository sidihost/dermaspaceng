import type { Metadata } from 'next'
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
  return <TransactionDetailContent reference={reference} />
}
