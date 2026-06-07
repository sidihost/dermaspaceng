/**
 * GET /api/wallet/reconcile
 *
 * On-demand reconciliation for the signed-in user's own pending
 * Paystack fundings. The wallet page calls this on load (and after a
 * checkout redirect) so a customer whose webhook was missed still
 * sees their balance update instead of staring at a stuck "pending".
 *
 * It re-checks each of the user's pending funding transactions
 * directly with Paystack and credits/fails/cancels them to match.
 * All crediting goes through the shared idempotent
 * `finalizeWalletFunding`, so this can never double-credit even if a
 * webhook lands at the same moment.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPendingFundingTransactions } from '@/lib/wallet'
import { reconcileUserPendingFundings } from '@/lib/reconcile-payments'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Grab recent pending fundings, then narrow to this user's rows.
    // We give a small min-age (15s) so we don't race a checkout that's
    // literally mid-flight, and a generous window so older stuck rows
    // still get rescued.
    const pending = await getPendingFundingTransactions(15, 72, 200)
    const mine = pending.filter(
      (tx) => String(tx.user_id) === String(user.id),
    )

    if (mine.length === 0) {
      return NextResponse.json({
        success: true,
        checked: 0,
        credited: 0,
        failed: 0,
        cancelled: 0,
        stillPending: 0,
      })
    }

    const refs = mine
      .map(
        (tx) =>
          tx.payment_reference ||
          (tx as { reference?: string }).reference ||
          '',
      )
      .filter(Boolean)
    const result = await reconcileUserPendingFundings(refs)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[wallet/reconcile] error:', error)
    return NextResponse.json(
      { error: 'Reconciliation failed' },
      { status: 500 },
    )
  }
}
