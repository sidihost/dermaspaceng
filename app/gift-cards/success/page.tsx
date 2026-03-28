'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Check, Gift, ChevronRight } from 'lucide-react'

export default function GiftCardSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const reference = searchParams.get('reference')
  const [isLoading, setIsLoading] = useState(true)
  const [giftCardData, setGiftCardData] = useState<any>(null)

  useEffect(() => {
    // Verify the payment status with the server
    const verifyPayment = async () => {
      if (!reference) {
        router.push('/gift-cards')
        return
      }

      try {
        const res = await fetch(`/api/gift-card-verify?reference=${reference}`)
        const data = await res.json()
        
        if (data.success && data.giftCard) {
          setGiftCardData(data.giftCard)
        }
      } catch (error) {
        console.error('Error verifying payment:', error)
      } finally {
        setIsLoading(false)
      }
    }

    verifyPayment()
  }, [reference, router])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#7B2D8E] to-[#5A1D6A] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-[#7B2D8E] to-[#5A1D6A] flex items-center justify-center px-4 pt-24 pb-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Successful!</h2>
          <p className="text-gray-600 mb-8">
            Thank you for your payment! Your gift card is being processed and will be delivered as requested.
          </p>
          
          {giftCardData && (
            <div className="bg-[#7B2D8E]/5 rounded-2xl p-6 mb-8 text-left">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-5 h-5 text-[#7B2D8E]" />
                <span className="font-semibold text-gray-900">Order Details</span>
              </div>
              <div className="space-y-2">
                <p className="text-gray-700"><strong>Amount:</strong> N{giftCardData.amount?.toLocaleString()}</p>
                <p className="text-gray-700"><strong>For:</strong> {giftCardData.recipient_name}</p>
                <p className="text-gray-700"><strong>Occasion:</strong> {giftCardData.occasion}</p>
                <p className="text-gray-700"><strong>Reference:</strong> {reference}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              Back to Home
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}