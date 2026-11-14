/**
 * GET /api/wallet/reconcile
 *
 * On-demand reconciliation for the signed-in user's own pending
 * Paystack fundings. Accepts an optional `?reference=` query param for
 * zero-delay single-reference reconciliation from the payment-status page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getPendingFundingTransactions,
  expireStalePendingFundings,
} from '@/lib/wallet'
import {
  reconcileUserPendingFundings,
  reconcileUserReference,
} from '@/lib/reconcile-payments'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const targetRef = request.nextUrl.searchParams.get('reference')?.trim() || ''

    let result = {
      checked: 0,
      credited: 0,
      failed: 0,
      cancelled: 0,
      stillPending: 0,
      errors: 0,
      noticesRecovered: 0,
    }

    if (targetRef) {
      const targetOutcome = await reconcileUserReference(user.id, targetRef)
      result = { ...result, ...targetOutcome }
    }

    const pending = await getPendingFundingTransactions(15, 24 * 30, 200)
    const mine = pending.filter(
      (tx) => String(tx.user_id) === String(user.id),
    )

    const refs = mine
      .map(
        (tx) =>
          tx.payment_reference ||
          (tx as { reference?: string }).reference ||
          '',
      )
      .filter((r) => Boolean(r) && r !== targetRef)

    const batchOutcome = await reconcileUserPendingFundings(refs, user.id)
    result = {
      checked: result.checked + batchOutcome.checked,
      credited: result.credited + batchOutcome.credited,
      failed: result.failed + batchOutcome.failed,
      cancelled: result.cancelled + batchOutcome.cancelled,
      stillPending: result.stillPending + batchOutcome.stillPending,
      errors: result.errors + batchOutcome.errors,
      noticesRecovered:
        result.noticesRecovered + (batchOutcome.noticesRecovered ?? 0),
    }

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
