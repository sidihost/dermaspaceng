/**
 * POST /api/admin/transactions/reconcile
 *
 * Admin-triggered reconciliation for a single transaction. Lets an
 * admin re-check a stuck pending charge with Paystack on demand
 * (from the transaction detail page) instead of waiting for the
 * cron sweep. Reuses the same idempotent single-transaction path as
 * the cron and the user-facing reconcile, so it can never double-credit.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTransactionById } from '@/lib/wallet'
import { reconcileOnePending } from '@/lib/reconcile-payments'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    // Transaction ids are VARCHAR(36)/UUID strings, not numbers.
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) {
      return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 })
    }

    // getTransactionById binds the id straight into the query, so a
    // string UUID works at runtime even though the type says number.
    const tx = await getTransactionById(id as unknown as number)
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (tx.status !== 'pending') {
      return NextResponse.json({ success: true, outcome: 'pending', note: 'Already finalized' })
    }

    const outcome = await reconcileOnePending(tx)
    return NextResponse.json({ success: true, outcome })
  } catch (error) {
    console.error('[admin/transactions/reconcile] error:', error)
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
