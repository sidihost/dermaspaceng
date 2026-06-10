import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTransactionByReference, formatCurrency } from '@/lib/wallet'

export const dynamic = 'force-dynamic'

// GET /api/wallet/transactions/[reference]
// Returns a single transaction (by our reference OR Paystack's),
// strictly scoped to the signed-in user. Powers the payment status
// page and the transaction detail sheet.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reference } = await params
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    const tx = await getTransactionByReference(reference)

    // Never leak another user's transaction through reference guessing.
    if (!tx || String(tx.user_id) !== String(user.id)) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const amount = Number(tx.amount) || 0

    return NextResponse.json({
      success: true,
      transaction: {
        ...tx,
        amount,
        formattedAmount: formatCurrency(amount, tx.currency),
      },
    })
  } catch (error) {
    console.error('Get transaction by reference error:', error)
    return NextResponse.json(
      { error: 'Failed to load transaction' },
      { status: 500 },
    )
  }
}
