import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { 
  getOrCreateWallet, 
  getUserTransactions, 
  getOrCreateWalletSettings,
  formatCurrency 
} from '@/lib/wallet'

// GET /api/wallet - Get wallet balance and recent transactions
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const wallet = await getOrCreateWallet(user.id)
    const transactions = await getUserTransactions(user.id, 10)
    const settings = await getOrCreateWalletSettings(user.id)
    
    return NextResponse.json({
      success: true,
      wallet: {
        ...wallet,
        formattedBalance: formatCurrency(wallet.balance, wallet.currency),
      },
      transactions,
      settings,
    })
  } catch (error) {
    console.error('Get wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to get wallet' },
      { status: 500 }
    )
  }
}
