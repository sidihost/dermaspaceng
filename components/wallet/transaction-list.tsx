'use client'

import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Wallet,
  Gift,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TransactionDetailSheet,
  type TransactionDetail,
} from './transaction-detail-sheet'
import {
  formatPaymentChannel,
  formatWalletCurrency,
  formatWalletTransactionDate,
  parseTransactionSummary,
} from '@/lib/wallet-ui'

export interface Transaction {
  id: number | string
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  payment_reference?: string | null
  reference?: string | null
  paystack_reference?: string | null
  error_message?: string | null
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
  selectedTransaction?: Transaction | null
  onSelectTransaction?: (tx: Transaction | null) => void
}

export function TransactionList({
  transactions,
  showLoadMore,
  onLoadMore,
  isLoading,
  emptyMessage = 'No transactions yet',
  selectedTransaction,
  onSelectTransaction,
}: TransactionListProps) {
  const [internalSelected, setInternalSelected] = useState<Transaction | null>(
    null,
  )
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = onSelectTransaction !== undefined
  const activeTransaction = isControlled ? selectedTransaction ?? null : internalSelected
  const isSheetOpen = isControlled ? Boolean(selectedTransaction) : internalOpen

  const openDetail = (transaction: Transaction) => {
    if (isControlled) {
      onSelectTransaction(transaction)
    } else {
      setInternalSelected(transaction)
      setInternalOpen(true)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (isControlled) {
        onSelectTransaction(null)
      } else {
        setInternalOpen(false)
      }
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

  const getStatusMeta = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-[#7B2D8E]" />,
          textColor: 'text-[#7B2D8E]',
        }
      case 'pending':
        return {
          label: 'Pending',
          icon: <Clock className="h-3.5 w-3.5 text-amber-600" />,
          textColor: 'text-amber-700',
        }
      case 'failed':
        return {
          label: 'Failed',
          icon: <XCircle className="h-3.5 w-3.5 text-red-600" />,
          textColor: 'text-red-600',
        }
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: <AlertCircle className="h-3.5 w-3.5 text-gray-500" />,
          textColor: 'text-gray-500',
        }
    }
  }

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'credit':
      case 'refund':
        return {
          icon: 'bg-[#F7F2FA] text-[#7B2D8E] border border-[#7B2D8E]/15',
          amount: 'text-[#7B2D8E]',
          prefix: '+',
        }
      case 'debit':
        return {
          icon: 'bg-gray-100 text-gray-700 border border-gray-200/70',
          amount: 'text-gray-900',
          prefix: '−',
        }
      default:
        return {
          icon: 'bg-gray-100 text-gray-600 border border-gray-200/70',
          amount: 'text-gray-900',
          prefix: '',
        }
    }
  }

  if (transactions.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F2FA] border border-[#7B2D8E]/15">
          <Wallet className="h-7 w-7 text-[#7B2D8E]" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-gray-900">
          {emptyMessage}
        </h3>
        <p className="mt-1.5 text-sm text-gray-500 max-w-xs">
          Your transactions will appear here once you fund or use your wallet.
        </p>
      </div>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {transactions.map((transaction) => {
          const styles = getTypeStyles(transaction.type)
          const statusMeta = getStatusMeta(transaction.status)
          const parsed = parseTransactionSummary(
            transaction.description,
            transaction.type,
            transaction.payment_reference || transaction.reference,
          )
          const displayDate =
            transaction.formattedDate ||
            formatWalletTransactionDate(transaction.created_at)

          return (
            <li key={transaction.id} className="min-w-0 max-w-full">
              <button
                type="button"
                onClick={() => openDetail(transaction)}
                className="w-full min-w-0 px-4 sm:px-5 py-3.5 sm:py-4 text-left flex items-center gap-3 sm:gap-4 transition-colors hover:bg-[#F7F2FA]/60 active:bg-[#F7F2FA] cursor-pointer"
                aria-label={`View transaction ${parsed.title}`}
              >
                {/* Leading Icon */}
                <div
                  className={cn(
                    'flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl flex-shrink-0',
                    styles.icon,
                  )}
                >
                  {getTransactionIcon(transaction.type, transaction.description)}
                </div>

                {/* Title & Metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <p className="flex-1 min-w-0 text-sm sm:text-[15px] font-semibold text-gray-900 leading-snug break-words">
                      {parsed.title}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span
                        className={cn(
                          'text-sm sm:text-[15px] font-bold tabular-nums whitespace-nowrap',
                          styles.amount,
                        )}
                      >
                        {styles.prefix}
                        {transaction.formattedAmount ||
                          formatWalletCurrency(
                            transaction.amount,
                            transaction.currency,
                          )}
                      </span>
                      <ChevronRight
                        className="h-4 w-4 text-gray-400 flex-shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-500 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                      <span className="truncate">
                        {formatPaymentChannel(transaction.payment_method)}
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="whitespace-nowrap">{displayDate}</span>
                      {parsed.referenceTag && (
                        <>
                          <span aria-hidden="true" className="hidden sm:inline">
                            &middot;
                          </span>
                          <span className="hidden sm:inline font-mono text-[11px] text-gray-400 truncate max-w-[170px]">
                            {parsed.referenceTag}
                          </span>
                        </>
                      )}
                    </div>

                    <span
                      className={cn(
                        'inline-flex items-center gap-1 font-medium whitespace-nowrap flex-shrink-0',
                        statusMeta.textColor,
                      )}
                    >
                      {statusMeta.icon}
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Loading State */}
      {isLoading && (
        <div className="divide-y divide-gray-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4">
              <div className="h-10 w-10 sm:h-11 sm:w-11 animate-pulse rounded-xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-gray-100 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {showLoadMore && !isLoading && (
        <div className="border-t border-gray-100 p-3 sm:p-4">
          <button
            type="button"
            onClick={onLoadMore}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] cursor-pointer"
          >
            Load more transactions
          </button>
        </div>
      )}

      <TransactionDetailSheet
        transaction={activeTransaction as TransactionDetail | null}
        open={isSheetOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  )
}
