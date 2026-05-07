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
  Printer,
  Share2,
  Copy,
  Check,
  Receipt as ReceiptIcon,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'

import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { BookingReviewSection } from '@/components/booking/booking-review'

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

  const onShare = useCallback(async () => {
    if (!booking) return
    const url = window.location.href
    const title = `Dermaspace · ${booking.booking_reference}`
    const text = `Your Dermaspace appointment receipt`
    try {
      if ('share' in navigator) {
        await navigator.share({ title, text, url })
      } else {
        await navigator.clipboard.writeText(url)
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
    <main className="min-h-screen bg-[#FBF9FC] print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>

      <section className="mx-auto max-w-2xl px-4 py-6 print:py-0 print:px-0 print:max-w-none">
        {/* Success ribbon — only right after a successful payment */}
        {showSuccess && booking.status === 'confirmed' ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 print:hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                You&apos;re booked in!
              </p>
              <p className="mt-0.5 text-[12px] text-emerald-800">
                A copy has been sent to {booking.customer_email}. See you on{' '}
                {dateLabel} at {booking.appointment_time}.
              </p>
            </div>
          </div>
        ) : null}

        {/* Toolbar — print-hidden */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 shadow-sm ring-1 ring-gray-200">
              <ReceiptIcon className="h-3 w-3 text-[#7B2D8E]" />
              {booking.booking_reference}
            </span>
            <StatusPill status={booking.status} payment={booking.payment_status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  {typeof navigator !== 'undefined' && 'share' in navigator ? (
                    <Share2 className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Share
                </>
              )}
            </button>
          </div>
        </div>

        {/* The receipt — wrapped in a single .receipt root the print
            stylesheet targets. */}
        <article
          className="receipt overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_24px_60px_-30px_rgba(123,45,142,0.18)] print:rounded-none print:shadow-none print:border-0"
          aria-label="Booking receipt"
        >
          {/* Letterhead */}
          <header className="relative px-6 sm:px-8 pt-7 pb-5 bg-gradient-to-b from-[#7B2D8E]/[0.06] to-transparent">
            <div className="flex items-start justify-between gap-4">
              <Image
                src={BRAND_LOGO}
                alt="Dermaspace"
                width={140}
                height={36}
                priority
                className="h-9 w-auto object-contain"
              />
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]/80">
                  Receipt
                </p>
                <p className="text-[11.5px] text-gray-500 mt-0.5 tabular-nums">
                  Issued {issueDate}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] text-gray-500 max-w-[28ch] sm:max-w-none">
              Dermaspace Esthetic & Wellness Centre · 237B Muri Okunola St, VI · Lagos, NG
            </p>

            {/* Tear-strip — purely decorative, mimics the perforated
                top of a paper receipt. Hidden in print. */}
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 right-0 h-2 bg-[radial-gradient(circle_at_4px_4px,_white_2px,_transparent_2.5px)] bg-[length:8px_8px] print:hidden"
            />
          </header>

          {/* Reference + status row */}
          <div className="px-6 sm:px-8 py-4 border-t border-dashed border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-gray-500">
                Booking reference
              </p>
              <p className="mt-0.5 font-mono text-base font-semibold text-[#7B2D8E] tracking-tight">
                {booking.booking_reference}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-gray-500">
                Status
              </p>
              <div className="mt-1">
                <StatusPill status={booking.status} payment={booking.payment_status} />
              </div>
            </div>
          </div>

          {/* Customer salute + appointment details */}
          <div className="px-6 sm:px-8 pt-5 pb-3">
            <p className="text-sm text-gray-500">
              Hi {booking.customer_name.split(' ')[0]},
            </p>
            <h1 className="mt-0.5 text-lg sm:text-xl font-semibold text-gray-900 tracking-tight text-balance">
              {booking.status === 'completed'
                ? 'Thank you for visiting us.'
                : booking.status === 'cancelled'
                  ? 'This appointment was cancelled.'
                  : 'Your appointment is confirmed.'}
            </h1>
            <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
              {booking.status === 'completed'
                ? 'We hope you loved the experience. Here is a copy of your receipt for the record.'
                : 'Save this page or print it — bring nothing but yourself on the day.'}
            </p>
          </div>

          {/* Appointment grid */}
          <div className="px-6 sm:px-8 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow icon={<Calendar />} title={dateLabel} subtitle={`at ${booking.appointment_time}`} />
            <DetailRow icon={<Clock />} title={`${booking.total_duration} minutes`} subtitle="Total session length" />
            <DetailRow icon={<MapPin />} title={booking.location_name} subtitle={booking.location_address ?? undefined} />
            <DetailRow icon={<Phone />} title={booking.customer_phone} subtitle={booking.customer_email} />
          </div>

          {/* Itemised services */}
          <section className="mt-2 mx-6 sm:mx-8 mb-2 rounded-2xl border border-gray-100 overflow-hidden">
            <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[#7B2D8E]/[0.04] border-b border-gray-100">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Treatments
              </h2>
              <span className="text-[11px] font-semibold text-gray-500">
                {booking.services.length} {booking.services.length === 1 ? 'item' : 'items'}
              </span>
            </header>
            <ul className="divide-y divide-gray-100">
              {booking.services.map((s, i) => (
                <li key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.treatmentName}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                      {s.categoryName} · {s.duration} min
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums">
                    {formatNaira(s.priceKobo)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Total */}
          <div className="mx-6 sm:mx-8 mb-4 rounded-2xl bg-[#7B2D8E] text-white px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/70">
                {isPaid ? 'Total paid' : 'Total due'}
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                {formatNaira(booking.total_price_kobo)}
              </p>
            </div>
            <div className="text-right">
              {booking.payment_method && (
                <p className="text-[11px] text-white/70 uppercase tracking-wider">
                  via {booking.payment_method}
                </p>
              )}
              {booking.payment_reference && (
                <p className="text-[10.5px] font-mono text-white/60 mt-0.5 truncate max-w-[180px]">
                  {booking.payment_reference}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          {booking.notes ? (
            <div className="mx-6 sm:mx-8 mb-4 rounded-2xl border border-gray-100 bg-[#FBF9FC] p-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Your notes
              </p>
              <p className="mt-1.5 text-[13px] text-gray-700 leading-relaxed">{booking.notes}</p>
            </div>
          ) : null}

          {/* Reassurance footer */}
          <footer className="border-t border-dashed border-gray-200 px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 print:bg-white">
            <Reassure
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Verified booking"
              hint="Tied to your account & encrypted"
            />
            <Reassure
              icon={<RefreshCw className="h-4 w-4" />}
              title="Reschedule anytime"
              hint="Up to 24h before your slot"
            />
            <Reassure
              icon={<Mail className="h-4 w-4" />}
              title="Need help?"
              hint="hello@dermaspaceng.com"
            />
          </footer>
        </article>

        {/* Customer review — appears under the receipt once the booking
            is in a "completed" state. The component handles its own
            empty / form / read-only states and is print-hidden. */}
        <BookingReviewSection bookingReference={booking.booking_reference} />

        {/* Actions — hidden when printing */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 print:hidden">
          <a
            href="tel:+2349017972919"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Need to talk to us?
          </a>
          {isCancellable ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel appointment
            </button>
          ) : (
            <Link
              href="/booking"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5A1D6A]"
            >
              Book another visit
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {cancelError ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[12px] text-rose-700 print:hidden">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
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

      {/* Print stylesheet — strips chrome and gives the receipt full
          width on paper. */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 16mm 12mm;
            size: A4;
          }
          html,
          body {
            background: #fff !important;
          }
          .receipt {
            box-shadow: none !important;
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
      ? 'red'
      : status === 'completed' || status === 'confirmed'
        ? 'green'
        : 'amber'
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
    tone === 'red'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : tone === 'green'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : 'bg-amber-50 text-amber-800 ring-amber-200'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider ring-1 ${cls}`}
    >
      {label}
    </span>
  )
}
