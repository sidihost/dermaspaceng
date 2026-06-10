import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { 
  getOrCreateWallet, 
  getUserTransactions, 
  getOrCreateWalletSettings,
  formatCurrency 
} from '@/lib/wallet'

// GET /api/wallet - Get wallet balance and recent transactions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const wallet = await getOrCreateWallet(user.id)
    const transactions = await getUserTransactions(user.id, 10)
    const settings = await getOrCreateWalletSettings(user.id)
    
    // Postgres NUMERIC columns come back as strings from the driver.
    // Normalise to real numbers so client-side math (totals, budget
    // progress) never silently concatenates strings.
    const balance = Number(wallet.balance) || 0

    return NextResponse.json({
      success: true,
      wallet: {
        ...wallet,
        balance,
        formattedBalance: formatCurrency(balance, wallet.currency),
      },
      transactions: transactions.map((tx) => ({
        ...tx,
        amount: Number(tx.amount) || 0,
      })),
      settings: {
        ...settings,
        monthly_budget:
          settings.monthly_budget == null
            ? null
            : Number(settings.monthly_budget),
      },
    })
  } catch (error) {
    console.error('Get wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to get wallet' },
      { status: 500 }
    )
  }
}
