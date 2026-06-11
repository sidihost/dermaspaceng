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
import {
  getPendingFundingTransactions,
  expireStalePendingFundings,
} from '@/lib/wallet'
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
    // literally mid-flight, and a 30-day window so older stuck rows
    // (the ones the old 72h limit stranded forever) still get rescued.
    const pending = await getPendingFundingTransactions(15, 24 * 30, 200)
    const mine = pending.filter(
      (tx) => String(tx.user_id) === String(user.id),
    )

    let result = {
      checked: 0,
      credited: 0,
      failed: 0,
      cancelled: 0,
      stillPending: 0,
      errors: 0,
    }

    if (mine.length > 0) {
      const refs = mine
        .map(
          (tx) =>
            tx.payment_reference ||
            (tx as { reference?: string }).reference ||
            '',
        )
        .filter(Boolean)
      result = { ...result, ...(await reconcileUserPendingFundings(refs)) }
    }

    // Retire this user's pending fundings that are too old to ever
    // complete. Verification ran first, so a real success is already
    // credited and safe from expiry.
    const expired = await expireStalePendingFundings(24, user.id)

    return NextResponse.json({ success: true, ...result, expired })
  } catch (error) {
    console.error('[wallet/reconcile] error:', error)
    return NextResponse.json(
      { error: 'Reconciliation failed' },
      { status: 500 },
    )
  }
}
