import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUserById } from '@/lib/auth'
import { 
  getAllTransactions, 
  getTransactionStats,
  formatCurrency 
} from '@/lib/wallet'
import { query } from '@/lib/db'

// GET /api/admin/transactions - Get all transactions (admin only)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = await getUserById(tokenData.id)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!, 10) : undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const search = searchParams.get('search') || undefined
    
    const { transactions, total } = await getAllTransactions(
      { status, type, userId, startDate, endDate, search },
      limit,
      offset
    )
    
    // Get user info for each transaction
    const transactionsWithUser = await Promise.all(
      transactions.map(async (tx) => {
        const txUser = await getUserById(tx.user_id)
        return {
          ...tx,
          formattedAmount: formatCurrency(tx.amount, tx.currency),
          formattedDate: new Date(tx.created_at).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          user: txUser ? {
            id: txUser.id,
            name: `${txUser.first_name} ${txUser.last_name}`,
            email: txUser.email,
          } : null,
        }
      })
    )
    
    // Get stats
    const stats = await getTransactionStats()
    
    return NextResponse.json({
      success: true,
      transactions: transactionsWithUser,
      total,
      stats: {
        ...stats,
        formattedTotalRevenue: formatCurrency(stats.totalRevenue),
        formattedPendingAmount: formatCurrency(stats.pendingAmount),
        formattedTodayRevenue: formatCurrency(stats.todayRevenue),
      },
      pagination: {
        limit,
        offset,
        hasMore: offset + transactions.length < total,
      },
    })
  } catch (error) {
    console.error('Get admin transactions error:', error)
    return NextResponse.json(
      { error: 'Failed to get transactions' },
      { status: 500 }
    )
  }
}
