/**
 * POST /api/admin/transactions/reconcile
 *
 * Admin-triggered reconciliation for a single transaction OR all
 * pending Paystack/bank-transfer transactions (`{ action: 'reconcile_all' }`).
 * Reuses the exact same idempotent reconciliation path as the cron
 * sweep so it can never double-credit or duplicate gift cards/invoices.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTransactionById } from '@/lib/wallet'
import {
  reconcileOnePending,
  reconcilePendingFundings,
} from '@/lib/reconcile-payments'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const body = await request.json().catch(() => ({}))

    if (body.action === 'reconcile_all') {
      const result = await reconcilePendingFundings({
        minAgeSeconds: 30,
        maxAgeHours: 24 * 365,
        limit: 200,
        expireOlderThanHours: 24 * 30,
      })
      return NextResponse.json({ success: true, ...result })
    }

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
    const txType = (tx.metadata as { type?: string } | null)?.type
    return NextResponse.json({ success: true, outcome, txType: txType || tx.type })
  } catch (error) {
    console.error('[admin/transactions/reconcile] error:', error)
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
