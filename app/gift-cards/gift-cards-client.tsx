'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import {
  Gift,
  Heart,
  Send,
  Download,
  Check,
  ChevronRight,
  Palette,
  User,
  Lock,
  Mail,
  Phone,
  Calendar,
  Type,
  ChevronLeft,
  Wallet,
  Receipt,
  Printer,
  Loader2,
  FlipHorizontal2,
} from 'lucide-react'
import { useGeo } from '@/lib/geo-context'
import { PaymentMethodModal } from '@/components/wallet/payment-method-modal'
import { downloadGiftCardReceiptPdf } from '@/lib/receipt-pdf'
import {
  GiftCardBackPreview,
  GiftCardPreview,
  getOccasionBadgeIcon,
} from '@/components/gift-cards/gift-card-preview'
import {
  CHRISTMAS_GIFT_CARD_DESIGN,
  CHRISTMAS_OCCASION,
  GIFT_CARD_AMOUNTS,
  GIFT_CARD_FONTS,
  INITIAL_GIFT_CARD_DESIGNS,
  INITIAL_GIFT_CARD_OCCASIONS,
  findGiftCardDesignById,
  findGiftCardFontById,
  getDefaultGiftCardDesign,
  getDefaultGiftCardOccasion,
  getGiftCardDesigns,
  getGiftCardOccasionMeta,
  getGiftCardOccasions,
  isChristmasTemplateAvailable,
  syncDesignForOccasion,
  syncOccasionForDesign,
  type GiftCardDesign,
} from '@/lib/gift-card-templates'

const festiveFetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json())

export default function GiftCardsClient() {
  const { formatPrice } = useGeo()
  const { data: festiveData } = useSWR<{ enabled: boolean }>('/api/festive', festiveFetcher, {
    revalidateOnFocus: true,
    revalidateOnMount: true,
    dedupingInterval: 2_000,
  })
  const festiveEnabled = festiveData ? festiveData.enabled !== false : true

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAmount, setSelectedAmount] = useState<number>(25000)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedDesign, setSelectedDesign] = useState<GiftCardDesign>(() =>
    getDefaultGiftCardDesign({ festiveEnabled: true, userRemovedChristmas: false }),
  )
  const [selectedOccasion, setSelectedOccasion] = useState<string>(() =>
    getDefaultGiftCardOccasion({ festiveEnabled: true, userRemovedChristmas: false }),
  )
  const [hasCustomColor, setHasCustomColor] = useState(false)
  const [selectedFont, setSelectedFont] = useState(GIFT_CARD_FONTS[0])
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [senderName, setSenderName] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'download'>('email')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front')
  const [completedReceiptRef, setCompletedReceiptRef] = useState('')
  const [completedInvoiceNumber, setCompletedInvoiceNumber] = useState<string | null>(null)
  const [completedPaymentMethod, setCompletedPaymentMethod] = useState<string>('')
  const [completedDetails, setCompletedDetails] = useState<{
    amount: number
    recipientName: string
    recipientEmail?: string | null
    senderName?: string | null
    occasion: string
    designName: string
    designId?: string
    fontId?: string
    fontName?: string
    deliveryMethod?: string | null
    deliveryDate?: string | null
    personalMessage?: string | null
  } | null>(null)

  const christmasActive = isChristmasTemplateAvailable({
    festiveEnabled,
    userRemovedChristmas: false,
  })
  const cardDesigns = getGiftCardDesigns({ festiveEnabled, userRemovedChristmas: false })
  const occasions = getGiftCardOccasions({ festiveEnabled, userRemovedChristmas: false })
  const occasionMeta = getGiftCardOccasionMeta(selectedOccasion)

  // If the admin disables /api/festive while the user had the seasonal
  // template selected, automatically revert to the initial Royal Purple state.
  useEffect(() => {
    if (!christmasActive) {
      if (selectedDesign.id === CHRISTMAS_GIFT_CARD_DESIGN.id) {
        setSelectedDesign(INITIAL_GIFT_CARD_DESIGNS[0])
      }
      if (selectedOccasion === CHRISTMAS_OCCASION) {
        setSelectedOccasion(INITIAL_GIFT_CARD_OCCASIONS[0])
      }
    }
  }, [christmasActive, selectedDesign.id, selectedOccasion])

  const handleSelectOccasion = (nextOccasion: string) => {
    setSelectedOccasion(nextOccasion)
    const syncedDesign = syncDesignForOccasion(nextOccasion, selectedDesign, {
      festiveEnabled,
      userRemovedChristmas: false,
      preserveCustomColor: hasCustomColor,
    })
    setSelectedDesign(syncedDesign)
  }

  const handleSelectDesign = (nextDesign: GiftCardDesign) => {
    setSelectedDesign(nextDesign)
    const syncedOccasion = syncOccasionForDesign(nextDesign, selectedOccasion, {
      festiveEnabled,
      userRemovedChristmas: false,
    })
    setSelectedOccasion(syncedOccasion)
    setHasCustomColor(true)
  }

  useEffect(() => {
    checkAuth()

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const paymentOutcome = params.get('payment')
      const ref = params.get('reference')

      if (paymentOutcome) {
        window.history.replaceState({}, '', window.location.pathname)
      }

      if (paymentOutcome === 'success' && ref) {
        hydratePaystackOrder(ref)
      } else if (paymentOutcome === 'failed') {
        setPaymentError('Your card payment could not be completed. No funds were charged.')
      } else if (paymentOutcome === 'cancelled') {
        setPaymentError('Payment was cancelled before completion.')
      }
    }
  }, [])

  const hydratePaystackOrder = async (ref: string) => {
    try {
      let res = await fetch(`/api/wallet/transactions/${encodeURIComponent(ref)}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (res.status === 404) {
        await fetch('/api/wallet/reconcile', { credentials: 'include' }).catch(() => {})
        res = await fetch(`/api/wallet/transactions/${encodeURIComponent(ref)}`, {
          cache: 'no-store',
          credentials: 'include',
        })
      }
      if (res.ok) {
        const data = await res.json()
        const tx = data.transaction
        if (tx && tx.status === 'completed') {
          const gc = tx.giftCard
          const metaDetails = (tx.metadata?.itemDetails || {}) as Record<string, unknown>
          setCompletedReceiptRef(tx.payment_reference || tx.reference || ref)
          setCompletedInvoiceNumber(tx.invoice?.invoice_number || gc?.invoice_number || null)
          setCompletedPaymentMethod(tx.payment_method === 'wallet' ? 'Wallet' : 'Card / Paystack')
          setCompletedDetails({
            amount: Number(tx.amount) || 0,
            recipientName: String(gc?.recipient_name || metaDetails.recipientName || 'Recipient'),
            recipientEmail: gc?.recipient_email || (metaDetails.recipientEmail ? String(metaDetails.recipientEmail) : null),
            senderName: gc?.sender_name || (metaDetails.senderName ? String(metaDetails.senderName) : senderName || null),
            occasion: String(gc?.occasion || metaDetails.occasion || 'Special Occasion'),
            designName: String(gc?.design_name || metaDetails.designName || 'Custom Design'),
            designId: String(gc?.design || metaDetails.design || 'royal'),
            fontId: String(gc?.font || metaDetails.font || 'elegant'),
            fontName: String(gc?.font_name || metaDetails.fontName || 'Elegant'),
            deliveryMethod: gc?.delivery_method || (metaDetails.deliveryMethod ? String(metaDetails.deliveryMethod) : null),
            deliveryDate: gc?.delivery_date || (metaDetails.deliveryDate ? String(metaDetails.deliveryDate) : null),
            personalMessage: gc?.personal_message || (metaDetails.personalMessage ? String(metaDetails.personalMessage) : null),
          })
          setIsSubmitted(true)
          return
        }
      }
      // Fallback: show confirmation shell with reference link so user can verify receipt
      setCompletedReceiptRef(ref)
      setCompletedPaymentMethod('Card / Paystack')
      setIsSubmitted(true)
    } catch {
      setCompletedReceiptRef(ref)
      setCompletedPaymentMethod('Card / Paystack')
      setIsSubmitted(true)
    }
  }

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setIsLoggedIn(true)
          setSenderName(`${data.user.firstName || data.user.first_name || ''} ${data.user.lastName || data.user.last_name || ''}`.trim())
        }
      }
    } catch {
      setIsLoggedIn(false)
    } finally {
      setIsLoading(false)
    }
  }

  const finalAmount = customAmount ? parseInt(customAmount) : selectedAmount

  const handleProceedToPayment = () => {
    if (!isLoggedIn) return
    if (!recipientName || !recipientEmail) {
      setPaymentError('Please fill in recipient name and email')
      return
    }
    setPaymentError('')
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (paymentResult?: {
    transactionReference?: string
    invoiceNumber?: string | null
    paymentMethod?: 'wallet' | 'paystack'
  }) => {
    setShowPaymentModal(false)
    const txRef = paymentResult?.transactionReference
    if (!txRef) {
      setPaymentError('Missing payment reference. Please check your transaction history.')
      return
    }

    setIsSubmitting(true)
    setPaymentError('')

    try {
      // Persist the paid gift card request after verified wallet debit
      const res = await fetch('/api/gift-card-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          design: selectedDesign.id,
          designName: selectedDesign.name,
          designGradient: selectedDesign.gradient,
          occasion: selectedOccasion,
          font: selectedFont.id,
          fontName: selectedFont.name,
          recipientName,
          recipientEmail,
          recipientPhone,
          senderName,
          personalMessage,
          deliveryMethod,
          deliveryDate,
          isPaid: true,
          transactionReference: txRef,
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setPaymentError(data.error || 'Payment succeeded, but saving your gift card order failed. Contact support with reference ' + txRef)
        return
      }

      setCompletedReceiptRef(txRef)
      setCompletedInvoiceNumber(data.invoiceNumber || paymentResult?.invoiceNumber || null)
      setCompletedPaymentMethod('Wallet')
      setCompletedDetails({
        amount: finalAmount,
        recipientName,
        recipientEmail: recipientEmail || null,
        senderName: senderName || null,
        occasion: selectedOccasion,
        designName: selectedDesign.name,
        designId: selectedDesign.id,
        fontId: selectedFont.id,
        fontName: selectedFont.name,
        deliveryMethod,
        deliveryDate: deliveryDate || null,
        personalMessage: personalMessage || null,
      })
      setIsSubmitted(true)
    } catch {
      setPaymentError('Failed to finalize gift card order. Please contact support with reference ' + txRef)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentCancel = () => {
    setShowPaymentModal(false)
  }

  const resetOrderForm = () => {
    setIsSubmitted(false)
    setCompletedReceiptRef('')
    setCompletedInvoiceNumber(null)
    setCompletedPaymentMethod('')
    setCompletedDetails(null)
    setRecipientName('')
    setRecipientEmail('')
    setRecipientPhone('')
    setPersonalMessage('')
    setDeliveryDate('')
    setPaymentError('')
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#7B2D8E] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </main>
    )
  }

  if (isSubmitted) {
    const summaryAmount = completedDetails?.amount ?? finalAmount
    const summaryRecipient = completedDetails?.recipientName || recipientName || 'Recipient'
    const summaryRecipientEmail = completedDetails?.recipientEmail ?? (recipientEmail || null)
    const summarySender = completedDetails?.senderName ?? (senderName || null)
    const summaryOccasion = completedDetails?.occasion || selectedOccasion
    const summaryDesign = completedDetails?.designName || selectedDesign.name
    const summaryDesignObj = findGiftCardDesignById(completedDetails?.designId || selectedDesign.id)
    const summaryFontObj = findGiftCardFontById(completedDetails?.fontId || selectedFont.id)
    const summaryOccasionMeta = getGiftCardOccasionMeta(summaryOccasion)
    const summaryDeliveryMethod = completedDetails?.deliveryMethod ?? deliveryMethod
    const summaryDeliveryDate = completedDetails?.deliveryDate ?? (deliveryDate || null)
    const summaryMessage = completedDetails?.personalMessage ?? (personalMessage || null)

    const handleDownloadGiftCardReceipt = async () => {
      if (downloadingReceipt) return
      setDownloadingReceipt(true)
      try {
        await downloadGiftCardReceiptPdf({
          amount: summaryAmount,
          amountFormatted: formatPrice(summaryAmount),
          recipientName: summaryRecipient,
          recipientEmail: summaryRecipientEmail,
          senderName: summarySender,
          occasion: summaryOccasion,
          designId: summaryDesignObj.id,
          designName: summaryDesign,
          fontName: completedDetails?.fontName || summaryFontObj.name,
          deliveryMethod: summaryDeliveryMethod,
          deliveryDate: summaryDeliveryDate,
          personalMessage: summaryMessage,
          paymentMethod: completedPaymentMethod || 'Wallet / Paystack',
          invoiceNumber: completedInvoiceNumber,
          receiptRef: completedReceiptRef,
        })
      } catch {
        // best effort
      } finally {
        setDownloadingReceipt(false)
      }
    }

    return (
      <>
        <div className="print:hidden">
          <Header />
        </div>
        <main className="min-h-screen bg-[#7B2D8E] flex items-center justify-center px-4 pt-24 pb-12 print:min-h-0 print:bg-white print:p-0 print:block">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 text-center border border-white/20 print:max-w-xl print:mx-auto print:border-0 print:rounded-none print:p-2">
            {/* Print-only official receipt letterhead */}
            <header className="hidden print:flex items-start justify-between gap-4 border-b border-gray-200 pb-4 mb-5 text-left">
              <div>
                <p className="text-lg font-bold tracking-tight text-[#7B2D8E]">Dermaspace</p>
                <p className="text-[11px] text-gray-500">Esthetic &amp; Wellness Centre · Lagos, NG</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
                  Gift Card Receipt
                </p>
                {completedReceiptRef && (
                  <p className="text-[11px] font-mono text-gray-600 mt-0.5">{completedReceiptRef}</p>
                )}
              </div>
            </header>

            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center print:hidden">
              <Check className="w-7 h-7 text-[#7B2D8E]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Gift Card Order Confirmed!</h2>
            <p className="text-sm text-gray-600 mb-5">
              Your payment is confirmed and your gift card is being prepared. A receipt has been sent to your email.
            </p>
            <GiftCardPreview
              design={summaryDesignObj}
              amountText={formatPrice(summaryAmount)}
              recipientName={summaryRecipient}
              senderName={summarySender || senderName}
              occasion={summaryOccasion}
              fontClassName={summaryFontObj.className}
              showStack={false}
              className="mb-5 text-left"
            />
            <div className="bg-[#7B2D8E]/5 rounded-xl p-4 mb-6 text-left text-sm border border-[#7B2D8E]/10 print:bg-white print:border-gray-200">
              <div className="space-y-2">
                {summaryAmount > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-semibold text-gray-900">{formatPrice(summaryAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">For</span>
                  <span className="font-medium text-gray-900 text-right">{summaryRecipient}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Occasion</span>
                  <span className="text-gray-900 text-right">
                    {summaryOccasion} ({summaryOccasionMeta.editionLabel})
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Card Style</span>
                  <span className="inline-flex items-center gap-1.5 text-gray-900 text-right">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full border border-black/15"
                      style={{ backgroundColor: summaryDesignObj.surfaceHex }}
                    />
                    {summaryDesign} · {completedDetails?.fontName || summaryFontObj.name}
                  </span>
                </div>
                {completedPaymentMethod && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Paid via</span>
                    <span className="text-gray-900 text-right">{completedPaymentMethod}</span>
                  </div>
                )}
                {completedInvoiceNumber && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Invoice</span>
                    <span className="font-mono text-xs text-gray-900 text-right">{completedInvoiceNumber}</span>
                  </div>
                )}
                {completedReceiptRef && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Reference</span>
                    <span className="font-mono text-xs text-gray-900 text-right truncate max-w-[180px]">{completedReceiptRef}</span>
                  </div>
                )}
                {summaryMessage && (
                  <div className="pt-2 mt-2 border-t border-[#7B2D8E]/10 text-xs text-gray-600 italic">
                    &ldquo;{summaryMessage}&rdquo;
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2.5 print:hidden">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadGiftCardReceipt}
                  disabled={downloadingReceipt}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors text-sm disabled:opacity-60"
                >
                  {downloadingReceipt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadingReceipt ? 'Saving…' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[#7B2D8E]/25 text-[#7B2D8E] font-semibold rounded-xl hover:bg-[#7B2D8E]/5 transition-colors text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
              </div>
              {completedReceiptRef && (
                <Link
                  href={`/dashboard/transactions/${encodeURIComponent(completedReceiptRef)}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  <Receipt className="w-4 h-4" />
                  Full Receipt &amp; Invoice
                </Link>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={resetOrderForm}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  Order Another
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  Back to Home
                </Link>
              </div>
            </div>

            <footer className="hidden print:block mt-6 pt-4 border-t border-dashed border-gray-200 text-center text-[11px] text-gray-500">
              Dermaspace Esthetic &amp; Wellness Centre · 237B Muri Okunola St, Victoria Island · 9 Agbeke Rotinwa Cl, Ikoyi · hello@dermaspaceng.com
            </footer>
          </div>
        </main>
        <div className="print:hidden">
          <Footer />
        </div>
        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 14mm 12mm;
            }
            html,
            body {
              background: #fff !important;
            }
          }
        `}</style>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#7B2D8E]">
        {/* Compact app-style top bar.
            Sits flush against the fixed global Header (56px mobile /
            64px desktop). Previously used `pt-20 md:pt-24` which left
            ~24-32px of empty purple band above the title and made
            this band feel like a hero. We now clear the header by
            exactly its own height, with a tiny breathing room (8px),
            and shrink the bottom padding so the next section sits
            right under the title row. */}
        <section className="pt-[64px] md:pt-[72px] pb-3 px-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <Link
              href="/dashboard"
              aria-label="Back"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/15 text-white transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden />
            </Link>
            <div className="text-center min-w-0 leading-none">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/55 mb-0.5">
                Custom
              </p>
              <h1 className="text-[15px] md:text-base font-bold text-white leading-none">
                Gift Cards
              </h1>
            </div>
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white flex-shrink-0"
            >
              <Gift className="w-4 h-4" />
            </span>
          </div>
        </section>

        {/* Login Required — compact inline notice */}
        {!isLoggedIn && (
          <section className="px-4 mt-4">
            <div className="max-w-sm mx-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3.5 border border-white/15 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-white" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white leading-tight">
                    Sign in to design your card
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[12px] font-semibold">
                    <Link href="/signin" className="text-white hover:underline">
                      Sign in
                    </Link>
                    <span className="text-white/40" aria-hidden>·</span>
                    <Link href="/signup" className="text-white/80 hover:text-white hover:underline">
                      Create account
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main Content */}
        <section className="pt-5 pb-12 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-6 items-start">

              {/* Left Side - Gift Card Preview (2 cols) */}
              <div className="lg:col-span-2 lg:sticky lg:top-24">
                <div className="max-w-xs mx-auto lg:mx-0">
                  {previewSide === 'front' ? (
                    <GiftCardPreview
                      design={selectedDesign}
                      amountText={formatPrice(finalAmount)}
                      recipientName={recipientName}
                      senderName={senderName}
                      occasion={selectedOccasion}
                      fontClassName={selectedFont.className}
                    />
                  ) : (
                    <GiftCardBackPreview
                      design={selectedDesign}
                      verificationCode="DSGC-00000-SPECIMEN"
                      verificationUrl="https://dermaspaceng.com/gift-cards/verify"
                      senderName={senderName}
                      personalMessage={personalMessage}
                      fontClassName={selectedFont.className}
                    />
                  )}
                  <div className="mt-4 flex justify-center lg:justify-start">
                    <button
                      type="button"
                      onClick={() => setPreviewSide((s) => (s === 'front' ? 'back' : 'front'))}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <FlipHorizontal2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{previewSide === 'front' ? 'Preview Card Back (QR)' : 'Preview Card Front'}</span>
                    </button>
                  </div>
                  {/* Active Style Summary */}
                  <div className="mt-3 rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5 text-white">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-white truncate">
                        {occasionMeta.editionLabel}
                      </span>
                      <span className="text-white/75 flex-shrink-0">{selectedFont.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-white/80">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full border border-white/40 flex-shrink-0"
                        style={{ backgroundColor: selectedDesign.surfaceHex }}
                      />
                      <span className="truncate">
                        {selectedDesign.name} · {occasionMeta.tagline}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message preview */}
                {personalMessage && (
                  <div className="mt-3 pt-3 border-t border-white/15 max-w-xs mx-auto lg:mx-0">
                    <p className={`text-white/90 text-xs italic leading-relaxed ${selectedFont.className}`}>&ldquo;{personalMessage}&rdquo;</p>
                    {senderName && <p className="text-white/75 mt-1 text-xs font-medium">— {senderName}</p>}
                  </div>
                )}
              </div>

              {/* Right Side - Form (3 cols) */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* Amount Selection */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 relative overflow-hidden">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                      <Gift className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                    </span>
                    Select Amount
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {GIFT_CARD_AMOUNTS.map((item) => (
                      <button
                        key={item.amount}
                        type="button"
                        onClick={() => { setSelectedAmount(item.amount); setCustomAmount('') }}
                        className={`py-2.5 px-2.5 rounded-lg text-left transition-colors ${
                          selectedAmount === item.amount && !customAmount
                            ? 'bg-[#7B2D8E] text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-sm font-bold block whitespace-nowrap tabular-nums">{formatPrice(item.amount)}</span>
                        <span className={`text-[10px] block ${selectedAmount === item.amount && !customAmount ? 'text-white/75' : 'text-gray-500'}`}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Or enter custom amount (in NGN)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">₦</span>
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                      />
                    </div>
                  </div>
                </div>

                {/* Occasion Selection (drives card illustration theme) */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                        <Heart className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                      </span>
                      Occasion &amp; Card Theme
                    </h3>
                    <span className="text-[11px] font-medium text-[#7B2D8E]">
                      {occasionMeta.editionLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {occasions.map((occasion) => {
                      const meta = getGiftCardOccasionMeta(occasion)
                      const Icon = getOccasionBadgeIcon(meta.id)
                      const isSelected = selectedOccasion === occasion
                      return (
                        <button
                          key={occasion}
                          type="button"
                          onClick={() => handleSelectOccasion(occasion)}
                          aria-pressed={isSelected}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-[#7B2D8E] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="w-3 h-3" aria-hidden />
                          {occasion}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Design Color Selection */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                        <Palette className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                      </span>
                      Choose Card Colour
                    </h3>
                    <span className="text-[11px] text-gray-500">
                      {selectedDesign.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {cardDesigns.map((design) => {
                      const isSelected = selectedDesign.id === design.id
                      return (
                        <button
                          key={design.id}
                          type="button"
                          onClick={() => handleSelectDesign(design)}
                          aria-pressed={isSelected}
                          className={`relative p-1.5 rounded-lg transition-colors text-center cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-[#7B2D8E] bg-[#7B2D8E]/5'
                              : 'hover:bg-gray-50 border border-gray-100'
                          }`}
                        >
                          <div
                            className="relative h-8 rounded overflow-hidden flex items-center justify-center border border-black/10"
                            style={{ backgroundColor: design.surfaceHex }}
                          >
                            <div
                              aria-hidden="true"
                              className="absolute top-0 right-0 bottom-0 w-2/5 rounded-l-[12px] opacity-65"
                              style={{ backgroundColor: design.accentHex }}
                            />
                            {isSelected && (
                              <span className="relative w-4 h-4 rounded-full bg-white/25 border border-white/50 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.75} aria-hidden />
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] leading-[1.2] text-gray-700 font-medium mt-1 text-center line-clamp-2">
                            {design.name}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Font Style */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 relative overflow-hidden">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                      <Type className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                    </span>
                    Font Style
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {GIFT_CARD_FONTS.map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setSelectedFont(font)}
                        aria-pressed={selectedFont.id === font.id}
                        className={`py-2.5 rounded-lg text-xs font-medium transition-colors ${font.className} ${
                          selectedFont.id === font.id
                            ? 'bg-[#7B2D8E] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Checkout / Recipient section (requires sign-in) */}
                <div className={`space-y-4 ${!isLoggedIn ? 'opacity-60 pointer-events-none' : ''}`}>

                {/* Recipient Details */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 relative overflow-hidden">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                    </span>
                    Recipient Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Recipient's name"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="tel"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="+234 xxx xxx xxxx"
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Delivery Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Message */}
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Personal Message</h3>
                  <textarea
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="Write a heartfelt message..."
                    rows={2}
                    maxLength={200}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 text-right">{personalMessage.length}/200</p>
                </div>

                {/* Delivery Method */}
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Delivery Method</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('email')}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        deliveryMethod === 'email'
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Send className={`w-4 h-4 ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`font-semibold text-xs ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                          Email
                        </p>
                        <p className="text-[10px] text-gray-500">Send directly</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('download')}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        deliveryMethod === 'download'
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Download className={`w-4 h-4 ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`font-semibold text-xs ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                          Download
                        </p>
                        <p className="text-[10px] text-gray-500">Print yourself</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {paymentError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {paymentError}
                  </div>
                )}

                {/* Pay Now Button — copy makes wallet a first-class
                    option so users know they can pay from their
                    Dermaspace balance without opening the modal first. */}
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={!recipientName || !recipientEmail || isSubmitting || !isLoggedIn}
                  className="w-full py-3 bg-white text-[#7B2D8E] text-sm font-bold rounded-xl border border-white/25 hover:bg-white/95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#7B2D8E]/30 border-t-[#7B2D8E] rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Pay {formatPrice(finalAmount)} with Wallet or Card
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Method Modal */}
        <PaymentMethodModal
          isOpen={showPaymentModal}
          onClose={handlePaymentCancel}
          amount={finalAmount}
          description={`Gift Card for ${recipientName} - ${selectedOccasion}`}
          paymentType="gift_card"
          itemDetails={{
            recipientName,
            recipientEmail,
            recipientPhone,
            senderName,
            personalMessage,
            design: selectedDesign.id,
            designName: selectedDesign.name,
            designGradient: selectedDesign.gradient,
            occasion: selectedOccasion,
            font: selectedFont.id,
            fontName: selectedFont.name,
            deliveryMethod,
            deliveryDate
          }}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      </main>
      <Footer />
    </>
  )
}
