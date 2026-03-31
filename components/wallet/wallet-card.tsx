'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Eye, EyeOff, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FundWalletModal } from './fund-wallet-modal'
import { cn } from '@/lib/utils'

interface WalletCardProps {
  balance: number
  currency?: string
  lastTransaction?: {
    type: 'credit' | 'debit'
    amount: number
    date: string
  }
  className?: string
}

export function WalletCard({ 
  balance, 
  currency = 'NGN',
  lastTransaction,
  className 
}: WalletCardProps) {
  const [showBalance, setShowBalance] = useState(true)
  const [fundModalOpen, setFundModalOpen] = useState(false)
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-xl',
          className
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="wallet-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wallet-pattern)" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium opacity-80">Dermaspace Wallet</p>
                <p className="text-xs opacity-60">Available Balance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="rounded-full p-2 transition-colors hover:bg-white/10"
              aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            >
              {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          
          {/* Balance */}
          <div className="mt-6">
            <motion.p
              key={showBalance ? 'visible' : 'hidden'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold tracking-tight"
            >
              {showBalance ? formatCurrency(balance) : '******'}
            </motion.p>
          </div>
          
          {/* Last Transaction */}
          {lastTransaction && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
              {lastTransaction.type === 'credit' ? (
                <TrendingUp className="h-4 w-4 text-green-300" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-300" />
              )}
              <span className="text-sm">
                {lastTransaction.type === 'credit' ? '+' : '-'}
                {formatCurrency(lastTransaction.amount)}
              </span>
              <span className="ml-auto text-xs opacity-60">{lastTransaction.date}</span>
            </div>
          )}
          
          {/* Fund Button */}
          <Button
            onClick={() => setFundModalOpen(true)}
            className="mt-6 w-full gap-2 bg-white text-primary hover:bg-white/90"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            Fund Wallet
          </Button>
        </div>
      </motion.div>
      
      <FundWalletModal
        open={fundModalOpen}
        onOpenChange={setFundModalOpen}
        currentBalance={balance}
      />
    </>
  )
}
