'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, CreditCard, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
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
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  description: string
  itemType: 'booking' | 'gift_card' | 'service'
  itemDetails?: Record<string, unknown>
  walletBalance: number
  onWalletPayment: () => Promise<{ success: boolean; error?: string }>
  onPaystackPayment: () => Promise<{ success: boolean; authorization_url?: string; error?: string }>
}

type PaymentMethod = 'wallet' | 'paystack' | null

export function PaymentMethodModal({
  open,
  onOpenChange,
  amount,
  description,
  itemType,
  walletBalance,
  onWalletPayment,
  onPaystackPayment,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
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
  
  const handlePayment = async () => {
    if (!selectedMethod) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      if (selectedMethod === 'wallet') {
        const result = await onWalletPayment()
        if (result.success) {
          setSuccess(true)
          setTimeout(() => {
            onOpenChange(false)
            setSuccess(false)
            setSelectedMethod(null)
          }, 2000)
        } else {
          setError(result.error || 'Payment failed')
        }
      } else if (selectedMethod === 'paystack') {
        const result = await onPaystackPayment()
        if (result.success && result.authorization_url) {
          // Redirect to Paystack
          window.location.href = result.authorization_url
        } else {
          setError(result.error || 'Failed to initialize payment')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }
  
  const resetState = () => {
    setSelectedMethod(null)
    setError(null)
    setSuccess(false)
    setIsProcessing(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetState()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Choose Payment Method</DialogTitle>
          <DialogDescription>
            Select how you&apos;d like to pay for your {itemType.replace('_', ' ')}
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
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
              
              {/* Payment Methods */}
              <div className="space-y-3">
                {/* Wallet Option */}
                <button
                  type="button"
                  onClick={() => canUseWallet && setSelectedMethod('wallet')}
                  disabled={!canUseWallet || isProcessing}
                  className={cn(
                    'relative w-full rounded-lg border-2 p-4 text-left transition-all',
                    selectedMethod === 'wallet'
                      ? 'border-primary bg-primary/5'
                      : canUseWallet
                        ? 'border-border hover:border-primary/50 hover:bg-muted/50'
                        : 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full',
                      canUseWallet ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <Wallet className={cn(
                        'h-6 w-6',
                        canUseWallet ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">Pay with Wallet</h4>
                        {selectedMethod === 'wallet' && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Balance: {formatCurrency(walletBalance)}
                      </p>
                      {!canUseWallet && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
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
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
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
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
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
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}
              
              {/* Fund Wallet Suggestion */}
              {!canUseWallet && (
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                  <p className="text-sm text-muted-foreground">
                    Want to use your wallet?{' '}
                    <a href="/dashboard/wallet" className="font-medium text-primary hover:underline">
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
                className="w-full gap-2"
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
