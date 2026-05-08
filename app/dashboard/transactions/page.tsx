import type { Metadata } from 'next'
import TransactionsContent from './transactions-content'

export const metadata: Metadata = {
  title: 'Transaction History',
  description:
    'Your Dermaspace wallet transaction history — every credit, debit, and refund in one place.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/dashboard/transactions' },
}

export default function TransactionsPage() {
  return <TransactionsContent />
}
