'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Plus, Minus, Loader2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FundWalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
  defaultAmount?: number
}

const PRESET_AMOUNTS = [5000, 10000, 20000, 50000, 100000]

export function FundWalletModal({
  open,
  onOpenChange,
  currentBalance,
  defaultAmount,
}: FundWalletModalProps) {
  const [amount, setAmount] = useState(defaultAmount || 10000)
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setAmount(defaultAmount || 10000)
      setCustomAmount('')
      setIsCustom(false)
      setError(null)
    }
  }, [open, defaultAmount])
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  
  const handlePresetSelect = (presetAmount: number) => {
    setAmount(presetAmount)
    setIsCustom(false)
    setCustomAmount('')
    setError(null)
  }
  
  const handleCustomAmountChange = (value: string) => {
    const numValue = parseInt(value.replace(/\D/g, ''), 10)
    setCustomAmount(value)
    if (!isNaN(numValue)) {
      setAmount(numValue)
    }
    setIsCustom(true)
    setError(null)
  }
  
  const adjustAmount = (delta: number) => {
    const newAmount = Math.max(100, amount + delta)
    setAmount(newAmount)
    setIsCustom(true)
    setCustomAmount(newAmount.toString())
    setError(null)
  }
  
  const handleFundWallet = async () => {
    if (amount < 100) {
      setError('Minimum amount is N100')
      return
    }
    
    if (amount > 10000000) {
      setError('Maximum amount is N10,000,000')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      
      const data = await response.json()
      
      if (data.success && data.authorization_url) {
        // Redirect to Paystack
        window.location.href = data.authorization_url
      } else {
        setError(data.error || 'Failed to initialize payment')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-5 w-5 text-primary" />
            Fund Your Wallet
          </DialogTitle>
          <DialogDescription>
            Add money to your Dermaspace wallet to make quick payments
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Balance */}
          <div className="rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-4">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(currentBalance)}</p>
          </div>
          
          {/* Amount Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Select Amount</label>
            
            {/* Preset Amounts */}
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    'rounded-lg border-2 py-3 text-sm font-medium transition-all',
                    amount === preset && !isCustom
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50 text-foreground'
                  )}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={cn(
                  'rounded-lg border-2 py-3 text-sm font-medium transition-all',
                  isCustom
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50 text-foreground'
                )}
              >
                Custom
              </button>
            </div>
            
            {/* Custom Amount Input */}
            {isCustom && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustAmount(-1000)}
                    disabled={amount <= 100}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">N</span>
                    <Input
                      type="text"
                      value={customAmount || amount.toString()}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      className="pl-8 text-center text-lg font-semibold"
                      placeholder="Enter amount"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustAmount(1000)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Min: N100 | Max: N10,000,000
                </p>
              </motion.div>
            )}
          </div>
          
          {/* New Balance Preview */}
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">New Balance After Funding</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(currentBalance + amount)}
              </span>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
          )}
          
          {/* Fund Button */}
          <Button
            onClick={handleFundWallet}
            disabled={isLoading || amount < 100}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Fund {formatCurrency(amount)}
              </>
            )}
          </Button>
          
          {/* Security Note */}
          <p className="text-center text-xs text-muted-foreground">
            Secured by Paystack. Your payment information is encrypted and secure.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
