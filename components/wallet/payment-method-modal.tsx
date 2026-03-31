'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, CreditCard, Check, AlertCircle, Loader2, ArrowRight, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  description: string
  paymentType: 'booking' | 'gift_card' | 'service'
  itemDetails?: Record<string, unknown>
  onSuccess?: () => void
  onCancel?: () => void
}

type PaymentMethod = 'wallet' | 'paystack' | null

export function PaymentMethodModal({
  isOpen,
  onClose,
  amount,
  description,
  paymentType,
  itemDetails,
  onSuccess,
  onCancel,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [isLoadingWallet, setIsLoadingWallet] = useState(true)
  
  // Fetch wallet balance when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchWalletBalance()
    }
  }, [isOpen])
  
  const fetchWalletBalance = async () => {
    setIsLoadingWallet(true)
    try {
      const res = await fetch('/api/wallet')
      if (res.ok) {
        const data = await res.json()
        setWalletBalance(data.balance || 0)
      }
    } catch {
      setWalletBalance(0)
    } finally {
      setIsLoadingWallet(false)
    }
  }
  
  const canUseWallet = walletBalance >= amount
  const shortfall = amount - walletBalance
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  
  const handleWalletPayment = async () => {
    setIsProcessing(true)
    setError(null)
    
    try {
      const res = await fetch('/api/wallet/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentType,
          description,
          itemDetails
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          resetState()
          onClose()
        }, 2000)
      } else {
        setError(data.error || 'Payment failed')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handlePaystackPayment = async () => {
    setIsProcessing(true)
    setError(null)
    
    try {
      const res = await fetch('/api/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentType,
          description,
          itemDetails,
          callbackUrl: `${window.location.origin}/api/wallet/verify?type=${paymentType}&redirect=${encodeURIComponent(window.location.pathname)}`
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.authorization_url) {
        // Redirect to Paystack
        window.location.href = data.authorization_url
      } else {
        setError(data.error || 'Failed to initialize payment')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handlePayment = async () => {
    if (!selectedMethod) return
    
    if (selectedMethod === 'wallet') {
      await handleWalletPayment()
    } else if (selectedMethod === 'paystack') {
      await handlePaystackPayment()
    }
  }
  
  const resetState = () => {
    setSelectedMethod(null)
    setError(null)
    setSuccess(false)
    setIsProcessing(false)
  }
  
  const handleClose = () => {
    if (!isProcessing) {
      resetState()
      onCancel?.()
      onClose()
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Choose Payment Method</DialogTitle>
          <DialogDescription>
            Select how you&apos;d like to pay for your {paymentType.replace('_', ' ')}
          </DialogDescription>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Payment Successful!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatCurrency(amount)} has been deducted from your wallet
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Amount Display */}
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Amount to Pay</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(amount)}</p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
              </div>
              
              {/* Payment Methods */}
              <div className="space-y-3">
                {/* Wallet Option */}
                <button
                  type="button"
                  onClick={() => canUseWallet && setSelectedMethod('wallet')}
                  disabled={!canUseWallet || isProcessing || isLoadingWallet}
                  className={cn(
                    'relative w-full rounded-lg border-2 p-4 text-left transition-all',
                    selectedMethod === 'wallet'
                      ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                      : canUseWallet
                        ? 'border-border hover:border-[#7B2D8E]/50 hover:bg-muted/50'
                        : 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full',
                      canUseWallet ? 'bg-[#7B2D8E]/10' : 'bg-muted'
                    )}>
                      <Wallet className={cn(
                        'h-6 w-6',
                        canUseWallet ? 'text-[#7B2D8E]' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">Pay with Wallet</h4>
                        {selectedMethod === 'wallet' && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7B2D8E]">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isLoadingWallet ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading balance...
                          </span>
                        ) : (
                          <>Balance: {formatCurrency(walletBalance)}</>
                        )}
                      </p>
                      {!isLoadingWallet && !canUseWallet && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          Insufficient balance. You need {formatCurrency(shortfall)} more.
                        </p>
                      )}
                    </div>
                  </div>
                </button>
                
                {/* Paystack Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('paystack')}
                  disabled={isProcessing}
                  className={cn(
                    'relative w-full rounded-lg border-2 p-4 text-left transition-all',
                    selectedMethod === 'paystack'
                      ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                      : 'border-border hover:border-[#7B2D8E]/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00C3F7]/10">
                      <CreditCard className="h-6 w-6 text-[#00C3F7]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">Pay with Card</h4>
                        {selectedMethod === 'paystack' && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7B2D8E]">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pay securely via Paystack
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Visa</span>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Mastercard</span>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Bank Transfer</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
              
              {/* Fund Wallet Suggestion */}
              {!isLoadingWallet && !canUseWallet && (
                <div className="rounded-lg border border-dashed border-[#7B2D8E]/30 bg-[#7B2D8E]/5 p-3">
                  <p className="text-sm text-muted-foreground">
                    Want to use your wallet?{' '}
                    <a href="/dashboard/wallet" className="font-medium text-[#7B2D8E] hover:underline">
                      Fund your wallet
                    </a>{' '}
                    with at least {formatCurrency(shortfall)} to continue.
                  </p>
                </div>
              )}
              
              {/* Action Button */}
              <Button
                onClick={handlePayment}
                disabled={!selectedMethod || isProcessing}
                className="w-full gap-2 bg-[#7B2D8E] hover:bg-[#5A1D6A]"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay {formatCurrency(amount)}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
