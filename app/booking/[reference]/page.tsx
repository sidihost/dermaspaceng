'use client'

/**
 * Booking receipt — public page customers land on after a successful
 * payment, and revisit any time from "View all bookings" or the
 * confirmation email.
 *
 * Design goals
 * ------------
 *   • Reads like a real receipt — branded letterhead, monospaced
 *     references, itemised line-items, total in big numbers.
 *   • One brand colour (#7B2D8E) + neutrals + one semantic emerald
 *     for "completed / paid" affirmations. No gradients.
 *   • Print-friendly: window.print() produces a clean A4-ish page
 *     thanks to the inline `@media print` rules at the bottom.
 *   • Share-friendly: native share sheet on mobile, fallback to a
 *     copy-link button on desktop.
 */

import { use, useCallback, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  XCircle,
  Loader2,
  Receipt as ReceiptIcon,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  Ticket,
} from 'lucide-react'

import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { BookingReviewSection } from '@/components/booking/booking-review'
import { BookingJourneyTracker } from '@/components/booking/booking-tracker'
import { AddToCalendar } from '@/components/booking/add-to-calendar'
import {
  downloadBookingReceiptImage,
  downloadBookingReceiptPdf,
} from '@/lib/receipt-pdf'
import {
  RECEIPT_MASTHEAD_PATTERN_STYLE,
  RECEIPT_TOTAL_PATTERN_STYLE,
  ReceiptActionButtons,
  ReceiptCornerMarks,
  ReceiptCrownBand,
  ReceiptTearDivider,
} from '@/components/receipt/receipt-chrome'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const BRAND_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100)

interface Booking {
  id: string
  booking_reference: string
  location_name: string
  location_address: string | null
  appointment_date: string
  appointment_time: string
  total_duration: number
  /** Sum of line items before voucher (kobo). Falls back to total. */
  subtotal_kobo?: number | null
  /** Voucher discount applied at booking time (kobo). 0 if none. */
  discount_kobo?: number | null
  /** Code the customer redeemed, e.g. "WELCOME20". */
  voucher_code?: string | null
  total_price_kobo: number
  customer_name: string
  customer_email: string
  customer_phone: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'failed'
  payment_method: 'wallet' | 'paystack' | null
  payment_reference?: string | null
  notes: string | null
  created_at?: string
  /** ISO timestamp the appointment was actually completed (admin
      action). Drives the "Completed" tick on the journey tracker
      and gates the post-visit review prompt. */
  completed_at?: string | null
  services: Array<{
    treatmentName: string
    categoryName: string
    duration: number
    priceKobo: number
  }>
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = use(params)
  const search = useSearchParams()
  const showSuccess = search.get('status') === 'success'

  const { data, isLoading, error, mutate } = useSWR<{
    booking?: Booking
    error?: string
  }>(`/api/bookings/${encodeURIComponent(reference)}`, fetcher, {
    revalidateOnFocus: false,
  })

  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const booking = data?.booking

  // We piggy-back on the existing review endpoint to know whether
  // the customer has already submitted feedback for this booking. The
  // value is fed into the journey tracker so the final "Rated" node
  // lights up after the review is saved — and it stays in sync if
  // the customer edits or removes the review later. We deliberately
  // skip this fetch until the booking is actually completed, both
  // because the endpoint is gated by booking ownership and to avoid
  // a needless round-trip on every receipt view.
  const reviewKey =
    booking && booking.status === 'completed'
      ? `/api/bookings/${encodeURIComponent(booking.booking_reference)}/review`
      : null
  const { data: reviewData } = useSWR<{
    review: { id: string } | null
  }>(reviewKey, fetcher, { revalidateOnFocus: false })
  const hasReview = Boolean(reviewData?.review)

  const onCancel = async () => {
    if (!booking) return
    if (!confirm('Cancel this appointment? Wallet payments are refunded automatically.')) return
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.booking_reference}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer cancellation' }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCancelError(json.error || 'Could not cancel.')
      } else {
        await mutate()
      }
    } catch (err: any) {
      setCancelError(err?.message || 'Network error.')
    } finally {
      setCancelling(false)
    }
  }

  const onPrint = useCallback(() => {
    window.print()
  }, [])

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingImage, setDownloadingImage] = useState(false)

  const onDownloadPdf = useCallback(async () => {
    if (!booking || downloadingPdf) return
    setDownloadingPdf(true)
    try {
      await downloadBookingReceiptPdf(booking)
    } catch (err) {
      console.error('[receipt.pdf] download failed', err)
    } finally {
      setDownloadingPdf(false)
    }
  }, [booking, downloadingPdf])

  const onDownloadImage = useCallback(async () => {
    if (!booking || downloadingImage) return
    setDownloadingImage(true)
    try {
      await downloadBookingReceiptImage(booking)
    } catch (err) {
      console.error('[receipt.png] download failed', err)
    } finally {
      setDownloadingImage(false)
    }
  }, [booking, downloadingImage])

  const onShare = useCallback(async () => {
    if (!booking) return
    const url = window.location.href
    const title = `Dermaspace · ${booking.booking_reference}`
    const text = `Your Dermaspace appointment receipt`
    try {
      // `'share' in navigator` narrows the else-branch to `never` in
      // TS 5+ because the lib doesn't model the optional Web Share
      // API. Cast once so both branches type-check cleanly.
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>
        clipboard?: { writeText: (s: string) => Promise<void> }
      }
      if (typeof nav.share === 'function') {
        await nav.share({ title, text, url })
      } else if (nav.clipboard) {
        await nav.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* user dismissed or clipboard unavailable — silent */
    }
  }, [booking])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FBF9FC]">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#7B2D8E]" />
        </div>
        <Footer />
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-[#FBF9FC]">
        <Header />
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <XCircle className="mx-auto h-10 w-10 text-gray-300" />
          <h1 className="mt-3 text-lg font-bold text-gray-900">Booking not found</h1>
          <p className="mt-1 text-sm text-gray-600">
            {data?.error || 'We could not find that booking under your account.'}
          </p>
          <Link
            href="/booking"
            className="mt-4 inline-flex rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5A1D6A]"
          >
            Back to booking
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  const dateLabel = new Date(`${booking.appointment_date}T00:00:00.000Z`).toLocaleDateString(
    'en-NG',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    },
  )

  const issueDate = booking.created_at
    ? new Date(booking.created_at).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })

  const isCancellable = booking.status === 'confirmed' || booking.status === 'pending'
  const isPaid = booking.payment_status === 'paid'

  return (
    <main className="min-h-screen bg-[#F7F5F9] print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>

      <section className="mx-auto max-w-lg px-4 py-6 print:py-0 print:px-0 print:max-w-none">
        {showSuccess && booking.status === 'confirmed' ? (
          <div className="mb-3.5 flex items-start gap-2.5 rounded-xl border border-[#7B2D8E]/20 bg-[#F7F2FA] px-3.5 py-2.5 print:hidden">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7B2D8E]" />
            <div>
              <p className="text-xs font-semibold text-[#5A1D6A]">
                You&apos;re booked in!
              </p>
              <p className="mt-0.5 text-[11px] text-[#7B2D8E]">
                A copy has been sent to {booking.customer_email}. See you on{' '}
                {dateLabel} at {booking.appointment_time}.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mb-3.5 print:hidden">
          <BookingJourneyTracker
            status={booking.status}
            paymentStatus={booking.payment_status}
            appointmentDate={booking.appointment_date}
            appointmentTime={booking.appointment_time}
            createdAt={booking.created_at ?? null}
            completedAt={booking.completed_at ?? null}
            hasReview={hasReview}
          />
        </div>

        {/* Toolbar — print-hidden */}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-7 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-semibold text-gray-700 border border-[#7B2D8E]/20">
              <ReceiptIcon className="h-3 w-3 text-[#7B2D8E]" />
              {booking.booking_reference}
            </span>
            <StatusPill status={booking.status} payment={booking.payment_status} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {(booking.status === 'pending' || booking.status === 'confirmed') &&
            booking.appointment_date &&
            booking.appointment_time ? (
              <AddToCalendar
                event={{
                  reference: booking.booking_reference,
                  date: booking.appointment_date,
                  time: booking.appointment_time,
                  durationMinutes: booking.total_duration,
                  locationName: booking.location_name,
                  locationAddress: booking.location_address,
                  description:
                    `Your Dermaspace appointment` +
                    (booking.services?.length
                      ? `\n\nTreatments:\n` +
                        booking.services.map((s) => `• ${s.treatmentName}`).join('\n')
                      : '') +
                    `\n\nReference: ${booking.booking_reference}\nReschedule up to 24h before your slot.`,
                }}
              />
            ) : null}
            <ReceiptActionButtons
              onDownloadPdf={onDownloadPdf}
              onDownloadImage={onDownloadImage}
              onPrint={onPrint}
              onShare={onShare}
              downloadingPdf={downloadingPdf}
              downloadingImage={downloadingImage}
              shared={copied}
            />
          </div>
        </div>

        {/* Patterned Single-Color Booking Receipt */}
        <article
          className="receipt relative overflow-hidden rounded-2xl border border-[#7B2D8E]/20 bg-white print:rounded-none print:border-0"
          aria-label="Booking receipt"
        >
          <ReceiptCrownBand />

          {/* Letterhead */}
          <header
            className="relative px-5 sm:px-6 pt-5 pb-4 bg-[#F7F2FA] border-b border-[#7B2D8E]/15"
            style={RECEIPT_MASTHEAD_PATTERN_STYLE}
          >
            <ReceiptCornerMarks inset="inset-2" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <Image
                  src={BRAND_LOGO}
                  alt="Dermaspace"
                  width={126}
                  height={32}
                  priority
                  className="h-8 w-auto object-contain"
                />
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Esthetic &amp; Wellness Centre · Lagos
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
                  Official Receipt
                </p>
                <p className="mt-0.5 text-xs font-bold text-gray-900">Booking</p>
                <p className="text-[11px] text-gray-500 mt-0.5 tabular-nums">
                  Issued {issueDate}
                </p>
              </div>
            </div>
          </header>

          {/* Reference + status row */}
          <div className="px-5 sm:px-6 pt-3.5 pb-0.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Booking reference
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-[#7B2D8E] tracking-tight">
                {booking.booking_reference}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Status
              </p>
              <div className="mt-0.5">
                <StatusPill status={booking.status} payment={booking.payment_status} />
              </div>
            </div>
          </div>

          <ReceiptTearDivider notchBgClass="bg-[#F7F5F9]" />

          {/* Customer salute */}
          <div className="px-5 sm:px-6 pt-1 pb-3">
            <p className="text-xs text-gray-500">
              Hi {booking.customer_name.split(' ')[0]},
            </p>
            <h1 className="mt-0.5 text-base font-semibold tracking-tight text-gray-900">
              {booking.status === 'completed'
                ? 'Thank you for visiting us.'
                : booking.status === 'cancelled'
                  ? 'This appointment was cancelled.'
                  : 'Your appointment is confirmed.'}
            </h1>
            <p className="mt-1 text-xs text-gray-600 leading-relaxed">
              {booking.status === 'completed'
                ? 'We hope you enjoyed the experience. Here is a copy of your receipt for your records.'
                : booking.status === 'cancelled'
                  ? booking.payment_status === 'refunded'
                    ? 'Your refund has been processed. We hope to see you again soon.'
                    : 'Hope to see you again soon — book another visit whenever you’re ready.'
                  : 'Save or download this receipt — arrive 10 minutes before your slot.'}
            </p>
          </div>

          {/* Appointment grid */}
          <div className="px-5 sm:px-6 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <DetailRow icon={<Calendar />} title={dateLabel} subtitle={`at ${booking.appointment_time}`} />
            <DetailRow icon={<Clock />} title={`${booking.total_duration} minutes`} subtitle="Total session length" />
            <DetailRow icon={<MapPin />} title={booking.location_name} subtitle={booking.location_address ?? undefined} />
            <DetailRow icon={<Phone />} title={booking.customer_phone} subtitle={booking.customer_email} />
          </div>

          {/* Itemised services */}
          <section className="mt-1 mx-5 sm:mx-6 mb-2.5 rounded-xl border border-[#7B2D8E]/15 overflow-hidden">
            <header className="flex items-center justify-between gap-3 px-3.5 py-2 bg-[#F7F2FA] border-b border-[#7B2D8E]/15">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Treatments
              </h2>
              <span className="text-[10.5px] font-semibold text-gray-500">
                {booking.services.length} {booking.services.length === 1 ? 'item' : 'items'}
              </span>
            </header>
            <ul className="divide-y divide-gray-100">
              {booking.services.map((s, i) => (
                <li
                  key={i}
                  className={`flex items-start justify-between gap-3 px-3.5 py-2.5 ${
                    i % 2 === 1 ? 'bg-[#FBF9FD]' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-[13px] font-semibold text-gray-900 truncate">{s.treatmentName}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                      {s.categoryName} · {s.duration} min
                    </p>
                  </div>
                  <span className="shrink-0 text-xs sm:text-[13px] font-semibold text-gray-900 tabular-nums">
                    {formatNaira(s.priceKobo)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {Number(booking.discount_kobo ?? 0) > 0 ? (
            <div className="mx-5 sm:mx-6 mb-3 rounded-xl border border-gray-100 bg-[#FBF9FD] px-3.5 py-2.5 text-xs">
              <div className="flex items-center justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700 tabular-nums">
                  {formatNaira(
                    Number(booking.subtotal_kobo ?? booking.total_price_kobo),
                  )}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[#7B2D8E]">
                  <Ticket className="h-3.5 w-3.5" />
                  Voucher{booking.voucher_code ? ` · ${booking.voucher_code}` : ''}
                </span>
                <span className="font-semibold text-[#7B2D8E] tabular-nums">
                  − {formatNaira(Number(booking.discount_kobo ?? 0))}
                </span>
              </div>
            </div>
          ) : null}

          {/* Total */}
          <div
            className="mx-5 sm:mx-6 mb-2 rounded-xl bg-[#7B2D8E] text-white px-4 py-3 flex items-center justify-between border border-[#7B2D8E]"
            style={RECEIPT_TOTAL_PATTERN_STYLE}
          >
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/75">
                {isPaid ? 'Total paid' : 'Total due'}
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums">
                {formatNaira(booking.total_price_kobo)}
              </p>
            </div>
            <div className="text-right">
              {booking.payment_method && (
                <p className="text-[11px] text-white/85 uppercase tracking-wider font-semibold">
                  via {booking.payment_method}
                </p>
              )}
              {booking.payment_reference && (
                <p className="text-[10px] font-mono text-white/70 mt-0.5 truncate max-w-[160px]">
                  {booking.payment_reference}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          {booking.notes ? (
            <div className="mx-5 sm:mx-6 mt-3 mb-2 rounded-xl border border-[#7B2D8E]/15 bg-[#F7F2FA] px-3.5 py-2.5">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Your notes
              </p>
              <p className="mt-1 text-xs text-gray-700 leading-relaxed">{booking.notes}</p>
            </div>
          ) : null}

          <ReceiptTearDivider notchBgClass="bg-[#F7F5F9]" className="mt-2" />

          {/* Reassurance footer */}
          <footer className="px-5 sm:px-6 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 print:bg-white">
            <Reassure
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              title="Verified booking"
              hint="Tied to your account"
            />
            <Reassure
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              title="Reschedule anytime"
              hint="Up to 24h before slot"
            />
            <Reassure
              icon={<Mail className="h-3.5 w-3.5" />}
              title="Need help?"
              hint="hello@dermaspaceng.com"
            />
          </footer>
        </article>

        <BookingReviewSection bookingReference={booking.booking_reference} />

        {/* Secondary actions */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 print:hidden">
          <a
            href="tel:+2349061836625"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            Call studio
          </a>
          {isCancellable ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Cancel appointment
            </button>
          ) : (
            <Link
              href="/booking"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#7B2D8E] px-3 text-xs font-semibold text-white hover:bg-[#5A1D6A]"
            >
              Book another visit
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {cancelError ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#7B2D8E]/20 bg-[#F7F2FA] p-2.5 text-xs text-[#5A1D6A] print:hidden">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{cancelError}</span>
          </div>
        ) : null}

        <p className="mt-4 text-center text-[11px] text-gray-500 print:hidden">
          <Link href="/dashboard" className="font-semibold text-[#7B2D8E] hover:underline">
            View all bookings
          </Link>
          {' · '}
          <Link href="/contact" className="hover:underline">
            Contact support
          </Link>
        </p>
      </section>

      <div className="print:hidden">
        <Footer />
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 14mm 12mm;
            size: A4;
          }
          html,
          body {
            background: #fff !important;
          }
          .receipt {
            border: 0 !important;
            margin: 0 !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  )
}

function DetailRow({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 truncate">{title}</p>
        {subtitle ? <p className="mt-0.5 text-[11.5px] text-gray-500 truncate">{subtitle}</p> : null}
      </div>
    </div>
  )
}

function Reassure({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-[11px] text-gray-500 truncate">{hint}</p>
      </div>
    </div>
  )
}

function StatusPill({
  status,
  payment,
}: {
  status: Booking['status']
  payment: Booking['payment_status']
}) {
  const tone =
    status === 'cancelled' || status === 'no_show'
      ? 'brand-muted'
      : status === 'completed' || status === 'confirmed'
        ? 'solid'
        : 'soft'
  const label = (() => {
    if (status === 'cancelled') {
      return payment === 'refunded' ? 'Cancelled · Refunded' : 'Cancelled'
    }
    if (status === 'completed') return 'Completed'
    if (status === 'no_show') return 'No-show'
    if (status === 'confirmed') return 'Confirmed'
    return payment === 'unpaid' ? 'Awaiting payment' : 'Pending'
  })()
  const cls =
    tone === 'brand-muted'
      ? 'bg-gray-100 text-gray-700 ring-gray-200'
      : tone === 'solid'
        ? 'bg-[#7B2D8E] text-white ring-[#7B2D8E]'
        : 'bg-[#F7F2FA] text-[#7B2D8E] ring-[#7B2D8E]/25'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${cls}`}
    >
      {label}
    </span>
  )
}
