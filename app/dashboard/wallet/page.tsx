'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { WalletCard, TransactionList, FundWalletModal } from '@/components/wallet'
import { 
  ArrowLeft, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Receipt,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Wallet {
  id: number
  balance: number
  currency: string
  formattedBalance: string
}

interface Transaction {
  id: number
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  description: string | null
  created_at: string
  formattedAmount?: string
  formattedDate?: string
}

interface WalletSettings {
  monthly_budget: number | null
  budget_alert_threshold: number
  low_balance_alert: number
  email_notifications: boolean
}

function WalletDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [settings, setSettings] = useState<WalletSettings | null>(null)
  const [fundModalOpen, setFundModalOpen] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning'
    message: string
  } | null>(null)

  useEffect(() => {
    // Check for URL params from payment callbacks
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const amount = searchParams.get('amount')
    const fundAmount = searchParams.get('fund')
    
    if (success === 'true') {
      setNotification({
        type: 'success',
        message: amount ? `Successfully funded N${parseInt(amount).toLocaleString()} to your wallet!` : 'Payment successful!'
      })
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_reference: 'Payment reference not found',
        verification_failed: 'Payment verification failed',
        transaction_not_found: 'Transaction not found',
        payment_failed: searchParams.get('message') || 'Payment failed',
        payment_abandoned: 'Payment was cancelled',
        unknown_status: 'Unknown payment status',
        verification_error: 'Error verifying payment',
      }
      setNotification({
        type: 'error',
        message: errorMessages[error] || 'An error occurred'
      })
    }
    
    // Open fund modal if fund param is present
    if (fundAmount) {
      setFundModalOpen(true)
    }
    
    // Clear URL params
    if (success || error || fundAmount) {
      window.history.replaceState({}, '', '/dashboard/wallet')
    }
  }, [searchParams])

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const res = await fetch('/api/wallet')
        if (res.ok) {
          const data = await res.json()
          setWallet(data.wallet)
          setTransactions(data.transactions)
          setSettings(data.settings)
        } else if (res.status === 401) {
          router.push('/signin')
        }
      } catch (error) {
        console.error('Failed to fetch wallet data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchWalletData()
  }, [router])

  const loadMoreTransactions = async () => {
    try {
      const res = await fetch(`/api/wallet/transactions?offset=${transactions.length}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions([...transactions, ...data.transactions])
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error)
    }
  }

  // Calculate stats
  const totalCredits = transactions
    .filter(t => t.type === 'credit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalDebits = transactions
    .filter(t => t.type === 'debit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const lastTransaction = transactions[0]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <Header />
      
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 z-50 -translate-x-1/2"
          >
            <div className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
              notification.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200'
                : notification.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            }`}>
              {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {notification.type === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
              {notification.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
              <span className="text-sm font-medium">{notification.message}</span>
              <button 
                onClick={() => setNotification(null)}
                className="ml-2 text-current opacity-60 hover:opacity-100"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="py-6 md:py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">My Wallet</h1>
                <p className="text-sm text-muted-foreground">Manage your Dermaspace balance</p>
              </div>
            </div>
            <Link href="/dashboard/settings">
              <Button variant="outline" size="icon" title="Wallet Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Wallet Card */}
          {wallet && (
            <WalletCard 
              balance={wallet.balance}
              currency={wallet.currency}
              lastTransaction={lastTransaction ? {
                type: lastTransaction.type === 'refund' ? 'credit' : lastTransaction.type,
                amount: lastTransaction.amount,
                date: new Date(lastTransaction.created_at).toLocaleDateString('en-NG', {
                  month: 'short',
                  day: 'numeric'
                })
              } : undefined}
              className="mb-6"
            />
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-background border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Funded</p>
                  <p className="text-lg font-bold text-foreground">
                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(totalCredits)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-background border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-bold text-foreground">
                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(totalDebits)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Progress (if set) */}
          {settings?.monthly_budget && (
            <div className="rounded-xl bg-background border border-border p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Monthly Budget</h3>
                <span className="text-sm text-muted-foreground">
                  {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(totalDebits)} / {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(settings.monthly_budget)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    (totalDebits / settings.monthly_budget) >= 0.9 
                      ? 'bg-red-500' 
                      : (totalDebits / settings.monthly_budget) >= 0.75 
                        ? 'bg-yellow-500' 
                        : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min((totalDebits / settings.monthly_budget) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {Math.round((totalDebits / settings.monthly_budget) * 100)}% of budget used this month
              </p>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="rounded-xl bg-background border border-border p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Recent Transactions</h2>
              </div>
              {transactions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {transactions.length} transactions
                </span>
              )}
            </div>
            
            <TransactionList 
              transactions={transactions}
              showLoadMore={transactions.length >= 10}
              onLoadMore={loadMoreTransactions}
              emptyMessage="No transactions yet"
            />
          </div>
        </div>
      </div>
      
      <Footer />
      
      <FundWalletModal
        open={fundModalOpen}
        onOpenChange={setFundModalOpen}
        currentBalance={wallet?.balance || 0}
      />
    </main>
  )
}

export default function WalletDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading wallet...</p>
        </div>
      </div>
    }>
      <WalletDashboardContent />
    </Suspense>
  )
}
