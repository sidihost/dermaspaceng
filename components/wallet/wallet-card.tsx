'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Eye, EyeOff, Plus, ArrowUpRight, ArrowDownLeft, Sparkles } from 'lucide-react'
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
        {/* Deep brand base with layered mesh for a premium, dimensional feel */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 120% at 0% 0%, #9B3FAD 0%, #7B2D8E 38%, #4B1A5C 100%)',
          }}
        />

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Soft highlight from the top-left */}
          <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          {/* Warm accent glow from the bottom-right */}
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-[#FFB86B]/20 blur-3xl" />
          {/* Edge vignette so text stays crisp */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/30" />

          {/* Concentric guilloché rings on the right — etched luxury detail */}
          <svg
            aria-hidden="true"
            className="absolute -right-16 -top-10 h-[140%] w-auto opacity-[0.14] pointer-events-none"
            viewBox="0 0 400 400"
            fill="none"
          >
            {[...Array(9)].map((_, i) => (
              <circle
                key={i}
                cx="260"
                cy="200"
                r={40 + i * 18}
                stroke="white"
                strokeWidth="0.7"
              />
            ))}
          </svg>

          {/* Hairline diagonal lines across the whole card */}
          <div
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(125deg, rgba(255,255,255,0.9) 0 1px, transparent 1px 10px)',
            }}
          />

          {/* Noise/grain for tactile finish */}
          <div
            className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
              backgroundSize: '160px 160px',
            }}
          />

          {/* Glossy top sheen */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/15 to-transparent" />
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
                  <div className="space-y-3 sm:space-y-4">
                    {/* Dotted masked amount with a trailing currency tag */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm border border-white/15">
                        {[...Array(3)].map((_, g) => (
                          <div key={g} className="flex items-center gap-1">
                            {[...Array(4)].map((_, i) => (
                              <span
                                key={i}
                                className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white/75"
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-white/80 px-2 py-1 rounded-md bg-white/10 border border-white/10">
                        {currency}
                      </span>
                    </div>

                    {/* Meta row — faux cardholder strip for that "back of card" feel */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-white/70">
                        <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/80" />
                        <span className="tracking-[0.18em] uppercase">Privacy Mode</span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-white/60 font-mono tracking-wider">
                        •••• •••• •••• 2025
                      </span>
                    </div>
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
