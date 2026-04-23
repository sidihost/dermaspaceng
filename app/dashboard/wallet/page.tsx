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
  ShieldCheck,
  Droplets,
  Flower2,
  Heart
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

// Onboarding messages for new wallet setup with spa-themed icons
const onboardingMessages = [
  { icon: Wallet, text: "Setting up your wallet...", subtext: "This will only take a moment" },
  { icon: ShieldCheck, text: "Securing your account...", subtext: "Adding encryption layers" },
  { icon: Droplets, text: "Personalizing experience...", subtext: "Almost there" },
  { icon: Flower2, text: "Welcome to Dermaspace Wallet!", subtext: "Your spa wallet is ready" },
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

  // New user onboarding screen — premium, brand-forward
  if (isNewUser) {
    const CurrentIcon = onboardingMessages[onboardingStep].icon
    return (
      <div className="relative min-h-screen overflow-hidden bg-white flex items-center justify-center px-4 py-10">
        {/* Ambient gradient field */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 20%, rgba(123,45,142,0.10) 0%, rgba(123,45,142,0) 70%), radial-gradient(45% 45% at 85% 90%, rgba(255,184,107,0.12) 0%, rgba(255,184,107,0) 70%)',
          }}
        />
        {/* Hairline grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(17,24,39,1) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,1) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative w-full max-w-md">
          {/* Card */}
          <div className="relative rounded-[28px] bg-white/90 backdrop-blur-xl border border-[#7B2D8E]/10 shadow-[0_20px_60px_-20px_rgba(123,45,142,0.25)] p-7 sm:p-10 text-center overflow-hidden">
            {/* Corner glow */}
            <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[#7B2D8E]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[#FFB86B]/10 blur-3xl pointer-events-none" />

            {/* Icon cluster with orbiting halo */}
            <div className="relative mx-auto mb-7 h-28 w-28 sm:h-32 sm:w-32">
              {/* Outer rotating ring */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(123,45,142,0.0), rgba(123,45,142,0.55), rgba(123,45,142,0.0) 60%)',
                  WebkitMask:
                    'radial-gradient(circle, transparent 58%, black 60%)',
                  mask: 'radial-gradient(circle, transparent 58%, black 60%)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />
              {/* Inner softer ring */}
              <div
                aria-hidden="true"
                className="absolute inset-2 rounded-full border border-[#7B2D8E]/15"
              />
              {/* Dotted orbit */}
              <div
                aria-hidden="true"
                className="absolute inset-4 rounded-full border border-dashed border-[#7B2D8E]/20"
              />

              {/* Icon badge */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={onboardingStep}
                  initial={{ scale: 0.7, opacity: 0, y: 6 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: -6 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div
                    className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center shadow-[0_12px_30px_-10px_rgba(123,45,142,0.55)]"
                    style={{
                      background:
                        'linear-gradient(135deg, #9B3FAD 0%, #7B2D8E 55%, #5A1D6A 100%)',
                    }}
                  >
                    {/* Glossy sheen */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                    <CurrentIcon className="relative w-8 h-8 sm:w-9 sm:h-9 text-white" />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Tiny sparkles */}
              <motion.span
                aria-hidden="true"
                className="absolute right-1 top-2 h-1.5 w-1.5 rounded-full bg-[#7B2D8E]"
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.span
                aria-hidden="true"
                className="absolute left-2 bottom-3 h-1 w-1 rounded-full bg-[#FFB86B]"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: 0.4 }}
              />
            </div>

            {/* Step label */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] sm:text-[11px] font-semibold tracking-[0.24em] uppercase text-[#7B2D8E] mb-2"
            >
              Step {onboardingStep + 1} of {onboardingMessages.length}
            </motion.p>

            {/* Headline + subtext */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${onboardingStep}`}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight text-balance">
                  {onboardingMessages[onboardingStep].text}
                </h2>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed text-pretty max-w-xs mx-auto">
                  {onboardingMessages[onboardingStep].subtext}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Smooth progress bar */}
            <div className="mt-7 relative h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                initial={false}
                animate={{
                  width: `${((onboardingStep + 1) / onboardingMessages.length) * 100}%`,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  background:
                    'linear-gradient(90deg, #7B2D8E 0%, #B25FC7 50%, #7B2D8E 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>

            {/* Step dots */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {onboardingMessages.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx <= onboardingStep
                      ? 'w-6 bg-[#7B2D8E]'
                      : 'w-1.5 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Branding */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex items-center justify-center gap-2"
          >
            <div className="h-6 w-6 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-[#7B2D8E]" />
            </div>
            <span className="text-xs text-gray-500 font-medium tracking-wide">
              Dermaspace Wallet
            </span>
          </motion.div>
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
                  ? 'bg-[#7B2D8E]/5 text-[#7B2D8E] border border-[#7B2D8E]/20'
                  : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            }`}>
              {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {notification.type === 'error' && <XCircle className="h-5 w-5 text-[#7B2D8E]" />}
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
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#7B2D8E]/10 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#7B2D8E]" />
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
                <span className="flex h-5 w-5 items-center justify-center text-[#7B2D8E] font-bold text-sm">₦</span>
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
        defaultAmount={10000}
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
