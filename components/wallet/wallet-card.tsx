'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Gift,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FundWalletModal } from './fund-wallet-modal'
import { cn } from '@/lib/utils'
import {
  formatPaymentChannel,
  formatWalletCurrency,
  parseTransactionSummary,
} from '@/lib/wallet-ui'

export interface WalletLastTransaction {
  type: 'credit' | 'debit' | 'refund'
  amount: number
  date: string
  description?: string | null
  paymentMethod?: string | null
  status?: 'pending' | 'completed' | 'failed' | 'cancelled'
}

interface WalletCardProps {
  balance: number
  currency?: string
  userName?: string
  lastTransaction?: WalletLastTransaction
  onInspectLastTransaction?: () => void
  className?: string
}

function LastTransactionIcon({
  type,
  description,
}: {
  type: WalletLastTransaction['type']
  description?: string | null
}) {
  const lowerDesc = (description || '').toLowerCase()
  if (lowerDesc.includes('wallet funding')) {
    return <Wallet className="h-4 w-4 text-white" />
  }
  if (lowerDesc.includes('gift card')) {
    return <Gift className="h-4 w-4 text-white" />
  }
  if (lowerDesc.includes('booking') || lowerDesc.includes('appointment')) {
    return <Calendar className="h-4 w-4 text-white" />
  }
  if (type === 'credit') {
    return <ArrowDownLeft className="h-4 w-4 text-white" />
  }
  if (type === 'refund') {
    return <RotateCcw className="h-4 w-4 text-white" />
  }
  return <ArrowUpRight className="h-4 w-4 text-white" />
}

export function WalletCard({
  balance,
  currency = 'NGN',
  userName,
  lastTransaction,
  onInspectLastTransaction,
  className,
}: WalletCardProps) {
  const [showBalance, setShowBalance] = useState(true)
  const [fundModalOpen, setFundModalOpen] = useState(false)

  const firstName = userName?.trim().split(' ')[0]
  const parsedLast = lastTransaction
    ? parseTransactionSummary(lastTransaction.description, lastTransaction.type)
    : null
  const isIncomingLast =
    lastTransaction?.type === 'credit' || lastTransaction?.type === 'refund'

  const lastTransactionFooter = lastTransaction && parsedLast && (
    <div className="w-full space-y-2">
      {/* Top metadata line: keeps labels from squishing on narrow mobile */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-white/75">
        <span className="whitespace-nowrap">Last transaction</span>
        <span className="whitespace-nowrap truncate">
          {lastTransaction.date}
          {lastTransaction.paymentMethod
            ? ` · ${formatPaymentChannel(lastTransaction.paymentMethod)}`
            : ''}
        </span>
      </div>

      {/* Main row: icon + title + amount */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white/15 border border-white/15 flex-shrink-0">
          <LastTransactionIcon
            type={lastTransaction.type}
            description={lastTransaction.description}
          />
        </div>

        <p className="min-w-0 flex-1 text-left text-[13.5px] sm:text-[15px] font-semibold text-white truncate">
          {parsedLast.title}
        </p>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[13.5px] sm:text-base font-bold text-white tabular-nums whitespace-nowrap">
            {showBalance
              ? `${isIncomingLast ? '+' : '−'}${formatWalletCurrency(lastTransaction.amount, currency)}`
              : '••••••'}
          </span>
          {onInspectLastTransaction && (
            <ChevronRight
              className="h-4 w-4 text-white/75 flex-shrink-0"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative w-full max-w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-[#7B2D8E] border border-[#5A1D6A]',
          className,
        )}
      >
        {/* Flat geometric architectural accents (no gradients, no shadows) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-24 -right-20 h-56 w-56 sm:h-72 sm:w-72 rounded-full border border-white/10" />
          <div className="absolute -top-12 -right-8 h-36 w-36 sm:h-48 sm:w-48 rounded-full bg-white/[0.04]" />
        </div>

        {/* Upper Card Body */}
        <div className="relative z-10 p-5 sm:p-6 md:p-7 text-white">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-white/15 border border-white/15 flex-shrink-0">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-white truncate">
                  {firstName ? `${firstName}'s Wallet` : 'Dermaspace Wallet'}
                </p>
                <p className="text-xs text-white/75 truncate">
                  Available balance &middot; {currency}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBalance((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white transition-colors hover:bg-white/20 active:scale-95 flex-shrink-0 cursor-pointer"
              aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            >
              {showBalance ? (
                <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </div>

          {/* Balance + Primary Action */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/75 mb-1">
                Wallet balance
              </p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={showBalance ? 'visible' : 'hidden'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="min-h-[2.5rem] sm:min-h-[3rem] flex items-center"
                >
                  {showBalance ? (
                    <p className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight break-words tabular-nums text-white">
                      {formatWalletCurrency(balance, currency)}
                    </p>
                  ) : (
                    <div
                      className="flex items-center gap-2"
                      aria-label="Balance hidden"
                    >
                      {[0, 1, 2, 3, 4, 5].map((dot) => (
                        <span
                          key={dot}
                          className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-white/45"
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <Button
              type="button"
              onClick={() => setFundModalOpen(true)}
              className="w-full md:w-auto h-12 px-6 gap-2 bg-white text-[#7B2D8E] hover:bg-[#F7F2FA] font-semibold text-sm sm:text-base rounded-xl border border-white transition-colors active:scale-[0.98] flex-shrink-0 cursor-pointer"
              size="lg"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Fund Wallet
            </Button>
          </div>
        </div>

        {/* Seamless Edge-to-Edge Last Transaction Footer */}
        {lastTransaction && parsedLast ? (
          onInspectLastTransaction ? (
            <button
              type="button"
              onClick={onInspectLastTransaction}
              className="relative z-10 block w-full bg-[#5A1D6A] border-t border-white/15 px-4 sm:px-6 md:px-7 py-3.5 sm:py-4 transition-colors hover:bg-[#4B1659] cursor-pointer"
              aria-label={`Inspect last transaction: ${parsedLast.title}`}
            >
              {lastTransactionFooter}
            </button>
          ) : (
            <div className="relative z-10 w-full bg-[#5A1D6A] border-t border-white/15 px-4 sm:px-6 md:px-7 py-3.5 sm:py-4">
              {lastTransactionFooter}
            </div>
          )
        ) : (
          <div className="relative z-10 flex items-center justify-between gap-2 w-full bg-[#5A1D6A] border-t border-white/15 px-4 sm:px-6 md:px-7 py-3 text-xs text-white/80">
            <span>No transactions yet</span>
            <span className="text-white/65">Fund wallet to get started</span>
          </div>
        )}
      </motion.div>

      <FundWalletModal
        open={fundModalOpen}
        onOpenChange={setFundModalOpen}
        currentBalance={balance}
      />
    </>
  )
}
