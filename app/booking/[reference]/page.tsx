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
  Download,
  Ticket,
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

  // Generate a real downloadable A4 PDF receipt using jsPDF.
  //
  // Why a fully redesigned receipt
  // ------------------------------
  // Customers asked for a "real" receipt that reads like something
  // from a brand they trust — not just a wall of text with the word
  // DERMASPACE in caps at the top. The previous version literally
  // typeset the brand name, which felt cheap on print.
  //
  // The new layout
  //   1. Loads the actual brand wordmark via fetch → base64 → jsPDF
  //      addImage at its NATURAL aspect ratio so the logo never looks
  //      squished. Fails soft to a typeset fallback so the customer
  //      always gets *some* receipt even if the CDN hiccups.
  //   2. Hero band at the top — soft purple tint with the logo on
  //      the left and the word RECEIPT + issue date on the right.
  //   3. A hand-drawn floral bloom mark next to the customer salute —
  //      vector petals in the brand purple, drawn natively so we
  //      never depend on emoji fonts (which jsPDF can't embed) and
  //      the receipt feels like it was made by the same studio that
  //      designed the spa, not a template engine.
  //   4. Treatments rendered as a striped table — easier to scan
  //      than the previous flat list.
  //   5. The total card now lives in its own framed pill with a
  //      subtle "thank-you" callout underneath.
  //
  // We deliberately render text natively (not an html2canvas
  // screenshot) so the PDF stays crisp at any zoom level, light on
  // bandwidth, and selectable / searchable. jsPDF is dynamic-imported
  // so it isn't shipped to users who never click "Download PDF".
  const [downloading, setDownloading] = useState(false)
  const onDownloadPdf = useCallback(async () => {
    if (!booking) return
    setDownloading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 40
      const contentW = pageWidth - margin * 2
      // Brand palette — exact same values used across the product
      // (#7B2D8E primary, soft tint for the hero band, neutral grays
      // for body copy + dividers).
      const brandPurple: [number, number, number] = [123, 45, 142]
      const brandPurpleSoft: [number, number, number] = [243, 233, 248]
      const textDark: [number, number, number] = [24, 24, 27]
      const textGray: [number, number, number] = [55, 65, 81]
      const mutedGray: [number, number, number] = [120, 122, 130]
      const lineGray: [number, number, number] = [232, 232, 238]
      const stripeGray: [number, number, number] = [251, 250, 253]

      // Recompute the same labels the on-screen receipt uses so the
      // PDF stays bit-for-bit identical even if the UI render path
      // ever drifts.
      const dateLabel = new Date(
        `${booking.appointment_date}T00:00:00.000Z`,
      ).toLocaleDateString('en-NG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
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
      const isPaid = booking.payment_status === 'paid'

      // -------------------------------------------------------------
      // Logo loader — fetch the brand wordmark and convert to a
      // base64 PNG so jsPDF can embed it. The CDN serves a webp,
      // but jsPDF only accepts PNG/JPEG/GIF — we paint the webp onto
      // a hidden canvas and re-encode as PNG. Fails soft so a
      // network blip doesn't block the whole receipt.
      // -------------------------------------------------------------
      // We also capture the intrinsic aspect ratio so the addImage
      // call below can render the wordmark at its true proportions.
      // The previous version forced a fixed 130×32 box which squashed
      // the logo (the source webp is wider-than-tall but not THAT
      // wide), so the embedded image looked compressed on every PDF.
      let logoDataUrl: string | null = null
      let logoAspect = 130 / 32 // sensible fallback if the load fails
      try {
        const blob = await fetch(BRAND_LOGO, { mode: 'cors' }).then((r) =>
          r.ok ? r.blob() : null,
        )
        if (blob) {
          const bitmap = await createImageBitmap(blob)
          const canvas = document.createElement('canvas')
          // Cap the rendered bitmap so the embedded image stays
          // light. The receipt only needs ~160pt wide at 1x, but we
          // render at 3x for crisp print on retina displays.
          const targetW = Math.min(bitmap.width, 600)
          const targetH = Math.round((bitmap.height / bitmap.width) * targetW)
          canvas.width = targetW
          canvas.height = targetH
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0, targetW, targetH)
            logoDataUrl = canvas.toDataURL('image/png')
            // Store the *real* aspect from the source so the embed
            // call can size the on-page image correctly.
            logoAspect = bitmap.width / bitmap.height
          }
        }
      } catch (err) {
        // Silent fallback — we'll typeset the brand instead.
        console.warn('[receipt.pdf] logo fetch failed, falling back to text', err)
      }

      // -------------------------------------------------------------
      // Hero band — soft purple background with the logo on the left
      // and a RECEIPT chip on the right. Fills edge-to-edge for a
      // proper "letterhead" look.
      // -------------------------------------------------------------
      const heroH = 110
      doc.setFillColor(...brandPurpleSoft)
      doc.rect(0, 0, pageWidth, heroH, 'F')

      // Logo (or typeset fallback)
      if (logoDataUrl) {
        // Aspect-correct render. We size by HEIGHT (44pt sits nicely
        // inside the 110pt hero band) and let the width derive from
        // the captured aspect ratio so the wordmark never looks
        // squished — the previous fixed 130×32 box was the bug.
        const logoH = 44
        const logoW = Math.min(logoH * logoAspect, contentW * 0.55)
        // Vertically center inside the hero band.
        const logoY = (heroH - logoH) / 2
        doc.addImage(
          logoDataUrl,
          'PNG',
          margin,
          logoY,
          logoW,
          logoH,
          undefined,
          'FAST',
        )
      } else {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(22)
        doc.setTextColor(...brandPurple)
        doc.text('Dermaspace', margin, 60)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...mutedGray)
        doc.text('Esthetic & Wellness Centre', margin, 76)
      }

      // RECEIPT pill on the right
      const pillW = 92
      const pillH = 26
      const pillX = pageWidth - margin - pillW
      const pillY = 38
      doc.setFillColor(...brandPurple)
      doc.roundedRect(pillX, pillY, pillW, pillH, 13, 13, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      doc.text('RECEIPT', pillX + pillW / 2, pillY + 17, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...mutedGray)
      doc.text(`Issued ${issueDate}`, pageWidth - margin, pillY + pillH + 14, {
        align: 'right',
      })

      let y = heroH + 28

      // -------------------------------------------------------------
      // Reference + status row — courier reference for that "real
      // receipt" feel, status as a soft pill on the right.
      // -------------------------------------------------------------
      doc.setFontSize(7.5)
      doc.setTextColor(...mutedGray)
      doc.text('BOOKING REFERENCE', margin, y)
      doc.text('STATUS', pageWidth - margin, y, { align: 'right' })
      y += 14
      doc.setFont('courier', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(...brandPurple)
      doc.text(booking.booking_reference, margin, y)
      // Status pill
      const statusLabel =
        booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      const statusW = doc.getTextWidth(statusLabel) + 18
      const statusBgX = pageWidth - margin - statusW
      doc.setFillColor(...brandPurpleSoft)
      doc.roundedRect(statusBgX, y - 11, statusW, 16, 8, 8, 'F')
      doc.setTextColor(...brandPurple)
      doc.text(statusLabel, pageWidth - margin - 9, y + 0.5, { align: 'right' })

      y += 28
      doc.setDrawColor(...lineGray)
      doc.line(margin, y, pageWidth - margin, y)
      y += 22

      // -------------------------------------------------------------
      // Customer salute with a hand-drawn bloom mark. Drawing the
      // mark natively (six soft purple petals fanning out from a
      // golden center) avoids the emoji-font headache jsPDF has —
      // emojis silently render as garbled boxes in 99% of fonts —
      // and reads as a tasteful botanical stamp that fits a derma
      // & wellness brand far better than a plain monogram. The mark
      // is reused on the closing divider so the document feels
      // hand-finished from top to bottom.
      // -------------------------------------------------------------
      const drawBloom = (cx: number, cy: number, size: number) => {
        const prevLineWidth = (doc as any).getLineWidth?.() ?? 0.2
        const petalCount = 6
        // Petal geometry — long ellipses orbiting the center point.
        // We fill them with the soft brand tint and stroke in the
        // primary purple at a hairline weight so the bloom reads as
        // delicate even at 16pt.
        const petalLen = size * 0.46
        const petalWid = size * 0.22
        const petalOffset = size * 0.24 // distance from center to petal middle
        doc.setFillColor(...brandPurpleSoft)
        doc.setDrawColor(...brandPurple)
        doc.setLineWidth(0.35)
        // We use the internal transform matrix to rotate each petal
        // around the center. jsPDF doesn't expose `save/restore`
        // helpers consistently across versions, so we compute the
        // rotated bounding box per petal and call ellipse with the
        // (rx, ry) sized along the page axes. To get an accurate
        // rotated petal, we draw via the curve helpers using a
        // 4-point Bezier approximation of an ellipse. That keeps
        // strokes aligned with the rotation rather than the page.
        for (let i = 0; i < petalCount; i++) {
          const theta = (Math.PI * 2 * i) / petalCount - Math.PI / 2
          const ax = Math.cos(theta)
          const ay = Math.sin(theta)
          const bx = -ay
          const by = ax
          const mid = {
            x: cx + ax * petalOffset,
            y: cy + ay * petalOffset,
          }
          // Petal endpoints (along the major axis).
          const tip = {
            x: mid.x + ax * petalLen,
            y: mid.y + ay * petalLen,
          }
          const base = {
            x: mid.x - ax * petalLen,
            y: mid.y - ay * petalLen,
          }
          // Side handles (along the minor axis), tuned for a soft
          // teardrop curve — closer to a lily petal than a circle.
          const k = 0.55 // bezier weight for ellipse approximation
          const handleLen = petalLen * k
          const handleWid = petalWid
          // Bezier control points: from `base` curving out through
          // the side handle to `tip`, then back through the other
          // side. We approximate with two cubic curves.
          const sideA = {
            x: mid.x + bx * handleWid,
            y: mid.y + by * handleWid,
          }
          const sideB = {
            x: mid.x - bx * handleWid,
            y: mid.y - by * handleWid,
          }
          const baseCtrl1 = {
            x: base.x + bx * handleWid,
            y: base.y + by * handleWid,
          }
          const tipCtrl1 = {
            x: tip.x + bx * handleWid,
            y: tip.y + by * handleWid,
          }
          const baseCtrl2 = {
            x: base.x - bx * handleWid,
            y: base.y - by * handleWid,
          }
          const tipCtrl2 = {
            x: tip.x - bx * handleWid,
            y: tip.y - by * handleWid,
          }
          // Suppress unused — jsPDF's `lines` helper takes a
          // start point and an array of relative beziers, so we
          // only feed it the curves we actually need.
          void sideA
          void sideB
          void handleLen
          // Build the petal as a closed path using `lines`. The
          // path goes: base → bezier through tipCtrl1 → tip →
          // bezier through tipCtrl2 → back to base.
          const path: Array<[number, number, number, number, number, number]> = [
            [
              baseCtrl1.x - base.x, baseCtrl1.y - base.y,
              tipCtrl1.x - base.x,  tipCtrl1.y - base.y,
              tip.x - base.x,       tip.y - base.y,
            ],
            [
              tipCtrl2.x - tip.x,   tipCtrl2.y - tip.y,
              baseCtrl2.x - tip.x,  baseCtrl2.y - tip.y,
              base.x - tip.x,       base.y - tip.y,
            ],
          ]
          ;(doc as any).lines(path, base.x, base.y, [1, 1], 'FD', true)
        }
        // Golden inner disc — picks up the warm accent used on the
        // brand's signage so the bloom reads as a pressed-foil
        // stamp rather than a flat icon.
        doc.setFillColor(214, 175, 99) // warm gold
        doc.setDrawColor(...brandPurple)
        doc.setLineWidth(0.25)
        doc.circle(cx, cy, size * 0.16, 'FD')
        // Tiny purple pip at the very center for depth.
        doc.setFillColor(...brandPurple)
        doc.circle(cx, cy, size * 0.05, 'F')
        doc.setLineWidth(prevLineWidth)
      }
      drawBloom(margin + 10, y - 7, 18)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.setTextColor(...textDark)
      doc.text(
        `Hi ${booking.customer_name.split(' ')[0]},`,
        margin + 28,
        y,
      )
      y += 18
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(...textGray)
      const headline =
        booking.status === 'completed'
          ? 'Thank you for visiting us — it was a pleasure to host you.'
          : booking.status === 'cancelled'
            ? 'This appointment was cancelled. Hope to see you soon.'
            : isPaid
              ? 'Your appointment is confirmed. We can\u2019t wait to see you.'
              : 'Your appointment is reserved. Complete payment to confirm.'
      doc.text(headline, margin, y, { maxWidth: contentW })
      y += 28

      // -------------------------------------------------------------
      // Appointment details — 2-column grid in a soft framed card
      // for separation from the body copy.
      // -------------------------------------------------------------
      const gridRows: Array<[string, string]> = [
        ['Date', dateLabel],
        ['Time', booking.appointment_time],
        ['Duration', `${booking.total_duration} minutes`],
        ['Location', booking.location_name],
        ['Phone', booking.customer_phone],
        ['Email', booking.customer_email],
      ]
      const gridRowsCount = Math.ceil(gridRows.length / 2)
      const gridH = gridRowsCount * 36 + 16
      doc.setDrawColor(...lineGray)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margin, y, contentW, gridH, 10, 10, 'FD')

      const colW = contentW / 2
      let gy = y + 18
      doc.setFontSize(8)
      for (let i = 0; i < gridRows.length; i += 2) {
        const [labelL, valueL] = gridRows[i]
        const right = gridRows[i + 1]
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...mutedGray)
        doc.text(labelL.toUpperCase(), margin + 14, gy)
        if (right) {
          doc.text(right[0].toUpperCase(), margin + colW + 6, gy)
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(...textDark)
        doc.text(valueL, margin + 14, gy + 14, { maxWidth: colW - 24 })
        if (right) {
          doc.text(right[1], margin + colW + 6, gy + 14, {
            maxWidth: colW - 24,
          })
        }
        doc.setFontSize(8)
        gy += 36
      }
      y += gridH + 22

      // -------------------------------------------------------------
      // Treatments — striped rows for scanability.
      // -------------------------------------------------------------
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...brandPurple)
      doc.text('TREATMENTS', margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...mutedGray)
      doc.text(
        `${booking.services.length} ${booking.services.length === 1 ? 'item' : 'items'}`,
        pageWidth - margin,
        y,
        { align: 'right' },
      )
      y += 10
      doc.setDrawColor(...lineGray)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6

      const rowH = 36
      booking.services.forEach((s, idx) => {
        if (y > pageHeight - 200) {
          doc.addPage()
          y = margin
        }
        // Striped background
        if (idx % 2 === 1) {
          doc.setFillColor(...stripeGray)
          doc.rect(margin, y, contentW, rowH, 'F')
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...textDark)
        doc.text(s.treatmentName, margin + 8, y + 16, {
          maxWidth: contentW * 0.62,
        })
        doc.text(formatNaira(s.priceKobo), pageWidth - margin - 8, y + 16, {
          align: 'right',
        })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...mutedGray)
        doc.text(
          `${s.categoryName} \u00B7 ${s.duration} min`,
          margin + 8,
          y + 28,
        )
        y += rowH
      })

      y += 10

      // -------------------------------------------------------------
      // Subtotal / voucher break-down (only when there's actually a
      // discount — otherwise we go straight to the total card).
      // -------------------------------------------------------------
      const sub = Number(booking.subtotal_kobo ?? booking.total_price_kobo)
      const disc = Number(booking.discount_kobo ?? 0)
      if (disc > 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...mutedGray)
        doc.text('Subtotal', margin, y)
        doc.setTextColor(...textGray)
        doc.text(formatNaira(sub), pageWidth - margin, y, { align: 'right' })
        y += 16
        doc.setTextColor(...brandPurple)
        doc.text(
          `Voucher${booking.voucher_code ? ` \u00B7 ${booking.voucher_code}` : ''}`,
          margin,
          y,
        )
        doc.text(`- ${formatNaira(disc)}`, pageWidth - margin, y, {
          align: 'right',
        })
        y += 18
      }

      // -------------------------------------------------------------
      // Total card — purple framed pill, total amount in big numbers,
      // payment metadata stacked on the right.
      // -------------------------------------------------------------
      const totalCardH = 64
      doc.setFillColor(...brandPurple)
      doc.roundedRect(margin, y, contentW, totalCardH, 12, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.text(isPaid ? 'TOTAL PAID' : 'TOTAL DUE', margin + 18, y + 22)
      doc.setFontSize(22)
      doc.text(formatNaira(booking.total_price_kobo), margin + 18, y + 48)
      if (booking.payment_method) {
        doc.setFontSize(9)
        doc.text(
          `via ${booking.payment_method}`,
          pageWidth - margin - 18,
          y + 22,
          { align: 'right' },
        )
      }
      if (booking.payment_reference) {
        doc.setFont('courier', 'normal')
        doc.setFontSize(8.5)
        doc.text(
          booking.payment_reference,
          pageWidth - margin - 18,
          y + 44,
          { align: 'right' },
        )
      }
      y += totalCardH + 14

      // -------------------------------------------------------------
      // Closing signature — a hairline divider with the brand seal
      // centered on it and a single line of micro-copy beneath.
      // Replaces the previous trio of hearts which read more like a
      // greeting card than a financial document.
      // -------------------------------------------------------------
      const dividerY = y
      doc.setDrawColor(...lineGray)
      doc.setLineWidth(0.4)
      doc.line(margin + 30, dividerY, margin + contentW / 2 - 14, dividerY)
      doc.line(margin + contentW / 2 + 14, dividerY, pageWidth - margin - 30, dividerY)
      drawBloom(margin + contentW / 2, dividerY, 18)
      y += 22
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...brandPurple)
      doc.text('Crafted with care at Dermaspace', pageWidth / 2, y, {
        align: 'center',
      })
      y += 14
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...mutedGray)
      doc.text(
        '237B Muri Okunola St, Victoria Island \u00B7 9 Agbeke Rotinwa Cl, Ikoyi',
        pageWidth / 2,
        y,
        { align: 'center' },
      )
      y += 22

      // -------------------------------------------------------------
      // Notes (if any) — kept towards the bottom because they're
      // contextual rather than essential.
      // -------------------------------------------------------------
      if (booking.notes) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...brandPurple)
        doc.text('YOUR NOTES', margin, y)
        y += 13
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...textGray)
        const lines = doc.splitTextToSize(booking.notes, contentW)
        doc.text(lines, margin, y)
        y += lines.length * 13 + 14
      }

      // -------------------------------------------------------------
      // Footer — perforated divider + reassurance copy. Glued to
      // the page bottom so the receipt always feels intentionally
      // composed instead of "and then it ended".
      // -------------------------------------------------------------
      const footerY = Math.max(y, pageHeight - 60)
      doc.setDrawColor(...lineGray)
      doc.setLineDashPattern([3, 3], 0)
      doc.line(margin, footerY, pageWidth - margin, footerY)
      doc.setLineDashPattern([], 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...mutedGray)
      doc.text(
        'Reschedule up to 24 hours before your slot \u00B7 hello@dermaspaceng.com',
        pageWidth / 2,
        footerY + 18,
        { align: 'center' },
      )

      doc.save(`Dermaspace-Receipt-${booking.booking_reference}.pdf`)
    } catch (err) {
      console.error('[receipt.pdf] download failed', err)
    } finally {
      setDownloading(false)
    }
  }, [booking])

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
              onClick={onDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors"
              aria-label="Download receipt as PDF"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
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
                ? 'We hope you enjoyed the experience. Here is a copy of your receipt for the record.'
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

          {/* Voucher / subtotal breakdown — only rendered when the
              customer redeemed a code at booking time. We show
              "Subtotal · Voucher · Total" so the math is auditable
              on the receipt itself, mirroring how Stripe / Paystack
              receipts present discounts. The total card below is the
              same amount in either case (subtotal − discount). */}
          {Number(booking.discount_kobo ?? 0) > 0 ? (
            <div className="mx-6 sm:mx-8 mb-3 rounded-2xl border border-gray-100 bg-[#FBF9FC] px-4 py-3 text-sm">
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
