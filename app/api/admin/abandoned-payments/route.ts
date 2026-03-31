import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUserById } from '@/lib/auth'
import { getAllAbandonedPayments, formatCurrency } from '@/lib/wallet'

// GET /api/admin/abandoned-payments - Get all abandoned payments (admin only)
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
    
    const abandonedPayments = await getAllAbandonedPayments(limit, offset)
    
    // Get user info for each payment
    const paymentsWithUser = await Promise.all(
      abandonedPayments.map(async (payment) => {
        const paymentUser = await getUserById(payment.user_id)
        return {
          ...payment,
          formattedAmount: formatCurrency(payment.amount, payment.currency),
          formattedDate: new Date(payment.created_at).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          formattedExpiry: new Date(payment.expires_at).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          user: paymentUser ? {
            id: paymentUser.id,
            name: `${paymentUser.first_name} ${paymentUser.last_name}`,
            email: paymentUser.email,
          } : null,
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      abandonedPayments: paymentsWithUser,
    })
  } catch (error) {
    console.error('Get abandoned payments error:', error)
    return NextResponse.json(
      { error: 'Failed to get abandoned payments' },
      { status: 500 }
    )
  }
}
