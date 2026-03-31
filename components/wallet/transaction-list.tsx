'use client'

import { motion } from 'framer-motion'
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  RotateCcw, 
  Wallet,
  Gift,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface TransactionListProps {
  transactions: Transaction[]
  showLoadMore?: boolean
  onLoadMore?: () => void
  isLoading?: boolean
  emptyMessage?: string
}

export function TransactionList({
  transactions,
  showLoadMore,
  onLoadMore,
  isLoading,
  emptyMessage = 'No transactions yet',
}: TransactionListProps) {
  const formatCurrency = (value: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-NG', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
    }
  }
  
  const getTransactionIcon = (type: string, description: string | null) => {
    const lowerDesc = description?.toLowerCase() || ''
    
    if (lowerDesc.includes('wallet funding')) {
      return <Wallet className="h-5 w-5" />
    }
    if (lowerDesc.includes('gift card')) {
      return <Gift className="h-5 w-5" />
    }
    if (lowerDesc.includes('booking') || lowerDesc.includes('appointment')) {
      return <Calendar className="h-5 w-5" />
    }
    
    switch (type) {
      case 'credit':
        return <ArrowDownLeft className="h-5 w-5" />
      case 'debit':
        return <ArrowUpRight className="h-5 w-5" />
      case 'refund':
        return <RotateCcw className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
      default:
        return null
    }
  }
  
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'credit':
      case 'refund':
        return {
          icon: 'bg-green-100 text-green-600',
          amount: 'text-green-600',
          prefix: '+',
        }
      case 'debit':
        return {
          icon: 'bg-red-100 text-red-600',
          amount: 'text-red-600',
          prefix: '-',
        }
      default:
        return {
          icon: 'bg-muted text-muted-foreground',
          amount: 'text-foreground',
          prefix: '',
        }
    }
  }
  
  if (transactions.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Wallet className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">{emptyMessage}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your transactions will appear here once you start using your wallet.
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {transactions.map((transaction, index) => {
        const styles = getTypeStyles(transaction.type)
        
        return (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            {/* Icon */}
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', styles.icon)}>
              {getTransactionIcon(transaction.type, transaction.description)}
            </div>
            
            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground truncate">
                  {transaction.description || `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} Transaction`}
                </p>
                {getStatusIcon(transaction.status)}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="capitalize">{transaction.payment_method.replace('_', ' ')}</span>
                <span>•</span>
                <span>{transaction.formattedDate || formatDate(transaction.created_at)}</span>
              </div>
            </div>
            
            {/* Amount */}
            <div className="text-right">
              <p className={cn('font-semibold', styles.amount)}>
                {styles.prefix}{transaction.formattedAmount || formatCurrency(transaction.amount, transaction.currency)}
              </p>
              {transaction.status !== 'completed' && (
                <p className="text-xs capitalize text-muted-foreground">{transaction.status}</p>
              )}
            </div>
          </motion.div>
        )
      })}
      
      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}
      
      {/* Load More */}
      {showLoadMore && !isLoading && (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full rounded-lg border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Load More Transactions
        </button>
      )}
    </div>
  )
}
