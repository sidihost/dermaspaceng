/**
 * /dashboard/wallet/bank-transfer/[reference]
 *
 * "Pay With Bank Transfer" verification screen.
 *
 * Receives bank details (passed through query params from the
 * Fund Wallet modal) and renders the canonical waiting-for-
 * confirmation card: bank name, account name, account number with
 * copy button, amount with copy button, expiry countdown, and a
 * dual-state "Sending → Receiving" progress indicator.
 *
 * Background poll every 5 seconds hits
 * /api/wallet/fund/status/[reference]. The page also has an
 * explicit "I have paid" button that triggers an immediate poll
 * for impatient customers.
 *
 * Brand palette only: white background, brand purple (#7B2D8E)
 * accents, neutral gray text. No gradients, no glows. The
 * reference screenshot's dark/yellow theme was for layout
 * inspiration only — colours were never on the table.
 *
 * SSR is disabled because the page is entirely interactive and
 * needs `searchParams` at runtime for the bank details that the
 * modal handed off.
 */

import { Suspense } from 'react'
import PageLoader from '@/components/shared/page-loader'
import { BankTransferVerifyClient } from './verify-client'

type Search = {
  bank?: string
  accountName?: string
  accountNumber?: string
  amount?: string
  expiresAt?: string
}

interface PageProps {
  params: Promise<{ reference: string }>
  searchParams: Promise<Search>
}

export default async function BankTransferVerifyPage({ params, searchParams }: PageProps) {
  const { reference } = await params
  const sp = await searchParams

  return (
    <Suspense fallback={<PageLoader label="Loading transfer details..." />}>
      <BankTransferVerifyClient
        reference={reference}
        bank={sp.bank || ''}
        accountName={sp.accountName || ''}
        accountNumber={sp.accountNumber || ''}
        // Amount is a string in the URL; the client coerces.
        amount={sp.amount || '0'}
        expiresAt={sp.expiresAt || ''}
      />
    </Suspense>
  )
}
