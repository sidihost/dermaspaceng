'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { 
  ShoppingBag, 
  Gift, 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Wallet,
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AbandonedPayment {
  id: number
  user_id: string
  payment_type: 'booking' | 'gift_card' | 'wallet_funding' | 'product'
  amount: number
  currency: string
  item_details: {
    serviceName?: string
    giftCardAmount?: string
    bookingDate?: string
    bookingTime?: string
    productName?: string
    quantity?: number
  }
  paystack_reference: string | null
  status: string
  expires_at: string
  created_at: string
}

interface WalletData {
  balance: number
  currency: string
}

function ContinuePaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [payment, setPayment] = useState<AbandonedPayment | null>(null)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>('paystack')

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!token) {
        setError('Invalid recovery link')
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/payments/recover?token=${token}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to load payment details')
          return
        }

        setPayment(data.payment)
        
        // Fetch wallet balance if user is logged in
        const walletRes = await fetch('/api/wallet')
        if (walletRes.ok) {
          const walletData = await walletRes.json()
          setWallet(walletData.wallet || walletData)
        }
      } catch {
        setError('Failed to load payment details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPaymentDetails()
  }, [token])

  const handleContinuePayment = async () => {
    if (!payment) return
    
    setIsProcessing(true)
    
    try {
      if (paymentMethod === 'wallet') {
        // Pay with wallet
        const res = await fetch('/api/wallet/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: payment.amount,
            paymentType: payment.payment_type,
            description: getPaymentDescription(),
            recoveryToken: token
          })
        })

        const data = await res.json()
        
        if (res.ok) {
          router.push(`/payment-success?type=${payment.payment_type}`)
        } else {
          setError(data.error || 'Payment failed')
        }
      } else {
        // Pay with Paystack
        const res = await fetch('/api/wallet/fund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: payment.amount,
            paymentType: payment.payment_type,
            recoveryToken: token,
            callbackUrl: `${window.location.origin}/api/wallet/verify`
          })
        })

        const data = await res.json()
        
        if (res.ok && data.authorization_url) {
          window.location.href = data.authorization_url
        } else {
          setError(data.error || 'Failed to initialize payment')
        }
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const getPaymentDescription = () => {
    if (!payment) return ''
    
    switch (payment.payment_type) {
      case 'booking':
        return `Booking: ${payment.item_details.serviceName || 'Service appointment'}`
      case 'gift_card':
        return `Gift Card: ${payment.item_details.giftCardAmount || payment.amount}`
      case 'wallet_funding':
        return 'Wallet Top-up'
      case 'product':
        return `Product: ${payment.item_details.productName || 'Purchase'}`
      default:
        return 'Payment'
    }
  }

  const getPaymentIcon = () => {
    if (!payment) return <ShoppingBag className="h-6 w-6" />
    
    switch (payment.payment_type) {
      case 'booking':
        return <Calendar className="h-6 w-6" />
      case 'gift_card':
        return <Gift className="h-6 w-6" />
      case 'wallet_funding':
        return <Wallet className="h-6 w-6" />
      default:
        return <ShoppingBag className="h-6 w-6" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const isExpired = payment && new Date(payment.expires_at) < new Date()
  const canPayWithWallet = wallet && wallet.balance >= (payment?.amount || 0)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="py-12 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Continue</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (isExpired) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="py-12 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h1>
            <p className="text-gray-600 mb-6">
              This payment recovery link has expired. Please start a new transaction.
            </p>
            <div className="flex flex-col gap-3">
              {payment?.payment_type === 'booking' && (
                <Link href="/booking">
                  <Button className="w-full">Book New Appointment</Button>
                </Link>
              )}
              {payment?.payment_type === 'gift_card' && (
                <Link href="/gift-cards">
                  <Button className="w-full">Browse Gift Cards</Button>
                </Link>
              )}
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-4 text-[#7B2D8E]">
              {getPaymentIcon()}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Continue Your Payment</h1>
            <p className="text-gray-600">Complete your pending transaction</p>
          </div>

          {/* Payment Details Card */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3">
                {payment?.payment_type === 'booking' && payment.item_details && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Service</span>
                      <span className="text-gray-900 font-medium">{payment.item_details.serviceName || 'Appointment'}</span>
                    </div>
                    {payment.item_details.bookingDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Date</span>
                        <span className="text-gray-900">{payment.item_details.bookingDate}</span>
                      </div>
                    )}
                    {payment.item_details.bookingTime && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Time</span>
                        <span className="text-gray-900">{payment.item_details.bookingTime}</span>
                      </div>
                    )}
                  </>
                )}

                {payment?.payment_type === 'gift_card' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Gift Card</span>
                    <span className="text-gray-900 font-medium">
                      {payment.item_details.giftCardAmount || formatCurrency(payment.amount)}
                    </span>
                  </div>
                )}

                {payment?.payment_type === 'wallet_funding' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Wallet Top-up</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(payment.amount)}</span>
                  </div>
                )}

                {payment?.payment_type === 'product' && payment.item_details && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Product</span>
                      <span className="text-gray-900 font-medium">{payment.item_details.productName}</span>
                    </div>
                    {payment.item_details.quantity && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Quantity</span>
                        <span className="text-gray-900">{payment.item_details.quantity}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total Amount</span>
                <span className="text-2xl font-bold text-[#7B2D8E]">
                  {payment && formatCurrency(payment.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Select Payment Method</h3>
            
            <div className="space-y-3">
              {/* Wallet Option */}
              <button
                onClick={() => setPaymentMethod('wallet')}
                disabled={!canPayWithWallet}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'wallet' && canPayWithWallet
                    ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                    : canPayWithWallet
                      ? 'border-gray-200 hover:border-gray-300'
                      : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    canPayWithWallet ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Wallet Balance</p>
                    <p className="text-sm text-gray-500">
                      {wallet ? formatCurrency(wallet.balance) : 'Not available'}
                      {!canPayWithWallet && wallet && ' (Insufficient balance)'}
                    </p>
                  </div>
                </div>
                {paymentMethod === 'wallet' && canPayWithWallet && (
                  <CheckCircle className="h-5 w-5 text-[#7B2D8E]" />
                )}
              </button>

              {/* Paystack Option */}
              <button
                onClick={() => setPaymentMethod('paystack')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'paystack'
                    ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Pay with Paystack</p>
                    <p className="text-sm text-gray-500">Card, Bank Transfer, USSD</p>
                  </div>
                </div>
                {paymentMethod === 'paystack' && (
                  <CheckCircle className="h-5 w-5 text-[#7B2D8E]" />
                )}
              </button>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleContinuePayment}
            disabled={isProcessing}
            className="w-full py-6 text-base"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>

          {/* Time Warning */}
          {payment && (
            <p className="text-center text-sm text-gray-500 mt-4">
              <Clock className="inline-block h-4 w-4 mr-1" />
              This link expires on {new Date(payment.expires_at).toLocaleDateString('en-NG', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>
      </div>
      
      <Footer />
    </main>
  )
}

export default function ContinuePaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ContinuePaymentContent />
    </Suspense>
  )
}
