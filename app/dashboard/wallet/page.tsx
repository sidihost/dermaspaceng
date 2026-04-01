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
  AlertCircle,
  Plus,
  Wallet,
  Sparkles,
  ShieldCheck,
  Gift
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

// Onboarding messages for new wallet setup
const onboardingMessages = [
  { icon: Wallet, text: "Setting up your wallet...", subtext: "This will only take a moment" },
  { icon: ShieldCheck, text: "Securing your account...", subtext: "Adding encryption layers" },
  { icon: Sparkles, text: "Personalizing experience...", subtext: "Almost there" },
  { icon: Gift, text: "Welcome to Dermaspace Wallet!", subtext: "Your wallet is ready" },
]

function WalletDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isNewUser, setIsNewUser] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [settings, setSettings] = useState<WalletSettings | null>(null)
  const [fundModalOpen, setFundModalOpen] = useState(false)
  const [userName, setUserName] = useState<string>('')
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
        // Fetch user data
        const authRes = await fetch('/api/auth/me')
        if (authRes.ok) {
          const authData = await authRes.json()
          if (authData.user) {
            setUserName(`${authData.user.firstName} ${authData.user.lastName}`)
          }
        }
        
        // Check if user has already seen wallet onboarding from database
        const onboardingRes = await fetch('/api/wallet/onboarding')
        const onboardingData = onboardingRes.ok ? await onboardingRes.json() : { hasSeenOnboarding: true }
        
        if (!onboardingData.hasSeenOnboarding) {
          // Check if this is a new user (no wallet transactions)
          const checkRes = await fetch('/api/wallet/transactions?limit=1')
          const checkData = checkRes.ok ? await checkRes.json() : { transactions: [] }
          const isFirstTime = !checkData.transactions || checkData.transactions.length === 0
          
          if (isFirstTime) {
            // Show onboarding for new users
            setIsNewUser(true)
            setIsLoading(false)
            
            // Progress through onboarding steps
            for (let i = 0; i < onboardingMessages.length; i++) {
              await new Promise(resolve => setTimeout(resolve, i === 0 ? 600 : 900))
              setOnboardingStep(i)
            }
            
            // Wait a moment on the final step
            await new Promise(resolve => setTimeout(resolve, 1000))
            setIsNewUser(false)
            
            // Mark onboarding as seen in database
            await fetch('/api/wallet/onboarding', { method: 'POST' })
          }
        }
        
        // Fetch wallet data
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

  // New user onboarding screen
  if (isNewUser) {
    const CurrentIcon = onboardingMessages[onboardingStep].icon
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center px-6">
          {/* Animated icon container */}
          <motion.div
            key={onboardingStep}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative mx-auto mb-6"
          >
            {/* Icon container */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#7B2D8E] flex items-center justify-center">
              <CurrentIcon className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          
          {/* Text content */}
          <motion.div
            key={`text-${onboardingStep}`}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {onboardingMessages[onboardingStep].text}
            </h2>
            <p className="text-sm text-gray-500">
              {onboardingMessages[onboardingStep].subtext}
            </p>
          </motion.div>
          
          {/* Progress bar */}
          <div className="w-48 mx-auto mt-6">
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((onboardingStep + 1) / onboardingMessages.length) * 100}%` }}
                transition={{ duration: 0.4 }}
                className="h-full bg-[#7B2D8E] rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading wallet...</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-gray-900" />
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">My Wallet</h1>
                <p className="text-xs sm:text-sm text-gray-500">Manage your Dermaspace balance</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <Button 
                onClick={() => setFundModalOpen(true)}
                className="gap-2 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden xs:inline">Fund Wallet</span>
                <span className="xs:hidden">Fund</span>
              </Button>
              <Link href="/dashboard/settings?tab=wallet">
                <Button variant="outline" size="icon" title="Wallet Settings" className="border-gray-200">
                  <Settings className="h-5 w-5 text-gray-600" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Wallet Card */}
          {wallet && (
            <WalletCard 
              balance={wallet.balance}
              currency={wallet.currency}
              userName={userName}
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="rounded-xl bg-white border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500">Total Funded</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(totalCredits)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-red-100 flex-shrink-0">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500">Total Spent</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(totalDebits)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Progress (if set) */}
          {settings?.monthly_budget && (
            <div className="rounded-xl bg-white border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                <h3 className="font-semibold text-gray-900">Monthly Budget</h3>
                <span className="text-xs sm:text-sm text-gray-500">
                  {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(totalDebits)} / {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(settings.monthly_budget)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    (totalDebits / settings.monthly_budget) >= 0.9 
                      ? 'bg-red-500' 
                      : (totalDebits / settings.monthly_budget) >= 0.75 
                        ? 'bg-yellow-500' 
                        : 'bg-[#7B2D8E]'
                  }`}
                  style={{ width: `${Math.min((totalDebits / settings.monthly_budget) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {Math.round((totalDebits / settings.monthly_budget) * 100)}% of budget used this month
              </p>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="rounded-xl bg-white border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#7B2D8E]" />
                <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
              </div>
              {transactions.length > 0 && (
                <span className="text-xs sm:text-sm text-gray-500">
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading wallet...</p>
        </div>
      </div>
    }>
      <WalletDashboardContent />
    </Suspense>
  )
}
