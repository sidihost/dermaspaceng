import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserTransactions, formatCurrency } from '@/lib/wallet'

// GET /api/wallet/transactions - Get user's transaction history
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
    const transactions = await getUserTransactions(user.id, limit, offset)
    
    // Format transactions for display
    const formattedTransactions = transactions.map(tx => ({
      ...tx,
      formattedAmount: formatCurrency(tx.amount, tx.currency),
      formattedDate: new Date(tx.created_at).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }))
    
    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json(
      { error: 'Failed to get transactions' },
      { status: 500 }
    )
  }
}
