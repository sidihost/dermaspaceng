'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Eye, EyeOff, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FundWalletModal } from './fund-wallet-modal'
import { cn } from '@/lib/utils'

interface WalletCardProps {
  balance: number
  currency?: string
  userName?: string
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
  userName,
  lastTransaction,
  className 
}: WalletCardProps) {
  const [showBalance, setShowBalance] = useState(true)
  const [fundModalOpen, setFundModalOpen] = useState(false)
  
  const formatCurrency = (value: number) => {
    // Handle NaN, undefined, or null values
    if (value === null || value === undefined || isNaN(value)) {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(0)
    }
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
          'relative overflow-hidden rounded-2xl sm:rounded-3xl',
          className
        )}
      >
        {/* Modern Gradient Background */}
        <div className="absolute inset-0 bg-[#7B2D8E]" />
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />
          
          {/* Large decorative circle - top right */}
          <div className="absolute -top-20 -right-20 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-white/5" />
          
          {/* Medium circle - bottom left */}
          <div className="absolute -bottom-16 -left-16 w-40 h-40 sm:w-52 sm:h-52 rounded-full bg-white/5" />
          
          {/* Small accent circle */}
          <div className="absolute top-1/2 right-1/4 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/3" />
          
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
              backgroundSize: '24px 24px'
            }}
          />
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 p-5 sm:p-6 text-white">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                {userName ? (
                  <p className="text-sm sm:text-base font-semibold text-white">
                    Hi, {userName.split(' ')[0]}
                  </p>
                ) : (
                  <p className="text-sm sm:text-base font-semibold text-white">Dermaspace Wallet</p>
                )}
                <p className="text-xs sm:text-sm text-white/60">Available Balance</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/20 active:scale-95"
              aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            >
              {showBalance ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>
          
          {/* Balance Display */}
          <div className="mb-6 sm:mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={showBalance ? 'visible' : 'hidden'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {showBalance ? (
                  <p className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    {formatCurrency(balance)}
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white/40" />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Last Transaction */}
          {lastTransaction && (
            <div className="mb-5 sm:mb-6">
              <div className="inline-flex items-center gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                <div className={cn(
                  "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg",
                  lastTransaction.type === 'credit' ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                )}>
                  {lastTransaction.type === 'credit' ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-white/50 leading-none mb-0.5">Last Transaction</span>
                  <span className="text-sm sm:text-base font-medium">
                    {lastTransaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(lastTransaction.amount)}
                  </span>
                </div>
                <span className="ml-2 text-xs text-white/40">{lastTransaction.date}</span>
              </div>
            </div>
          )}
          
          {/* Fund Button */}
          <Button
            onClick={() => setFundModalOpen(true)}
            className="w-full h-12 sm:h-14 gap-2.5 bg-white text-[#7B2D8E] hover:bg-white/95 font-semibold text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-lg shadow-black/10 transition-all active:scale-[0.98]"
            size="lg"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7B2D8E]/10">
              <Plus className="h-4 w-4" />
            </div>
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
