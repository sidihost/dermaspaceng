import {
  findGiftCardDesignById,
  getDesignMedallionHex,
  getGiftCardOccasionMeta,
} from './gift-card-templates'

const LOCAL_BRAND_LOGO = '/images/dermaspace-header-logo.png'
const REMOTE_BRAND_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

/**
 * Single brand-color receipt palette (#7B2D8E + tonal plum-gray neutrals).
 * Strictly zero second accent colors, zero gradients, zero shadows.
 */
export const RECEIPT_PALETTE = {
  brandHex: '#7B2D8E',
  brandRgb: [123, 45, 142] as [number, number, number],
  brandTintRgb: [247, 242, 250] as [number, number, number],
  brandPatternRgb: [232, 217, 240] as [number, number, number],
  brandBorderRgb: [218, 198, 229] as [number, number, number],
  textDarkRgb: [24, 24, 27] as [number, number, number],
  textBodyRgb: [63, 63, 70] as [number, number, number],
  mutedRgb: [113, 113, 122] as [number, number, number],
  lineRgb: [228, 228, 231] as [number, number, number],
  stripeRgb: [251, 249, 253] as [number, number, number],
} as const

export interface ReceiptDetailRow {
  label: string
  value: string
}

export interface ReceiptLineItem {
  title: string
  subtitle?: string
  amount: string
}

export interface ReceiptGiftCardVisual {
  recipientName: string
  senderName?: string | null
  amountFormatted: string
  occasion: string
  editionLabel: string
  designName: string
  fontName?: string | null
  surfaceHex: string
  accentHex: string
  medallionHex: string
  deliveryMethod?: string | null
}

export interface ReceiptDocumentData {
  documentTitle: string
  statusLabel: string
  reference: string
  invoiceNumber?: string | null
  issueDate: string
  headline: string
  subheadline?: string | null
  amountFormatted: string
  amountLabel: string
  paymentMethodLabel?: string
  summaryRows: ReceiptDetailRow[]
  lineItems?: ReceiptLineItem[]
  subtotalFormatted?: string | null
  discountLabel?: string | null
  discountFormatted?: string | null
  giftCardVisual?: ReceiptGiftCardVisual | null
  note?: string | null
  noteTitle?: string | null
  footerNote?: string | null
  filename: string
  imageFilename?: string
}

export interface TransactionReceiptInput {
  id: number | string
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency?: string | null
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  payment_reference?: string | null
  reference?: string | null
  paystack_reference?: string | null
  description?: string | null
  created_at: string
  formattedAmount?: string
  metadata?: Record<string, unknown> | null
  invoice?: {
    invoice_number?: string | null
  } | null
  giftCard?: {
    recipient_name?: string | null
    recipient_email?: string | null
    sender_name?: string | null
    occasion?: string | null
    design?: string | null
    design_name?: string | null
    font?: string | null
    font_name?: string | null
    delivery_method?: string | null
    delivery_date?: string | null
    personal_message?: string | null
    invoice_number?: string | null
  } | null
  booking?: {
    booking_reference: string
    location_name: string
    appointment_date: string
    appointment_time: string
    total_duration: number
    services?: { treatment_name: string; duration: number }[]
  } | null
}

export interface GiftCardReceiptInput {
  amount: number
  amountFormatted: string
  recipientName: string
  recipientEmail?: string | null
  senderName?: string | null
  occasion: string
  designId?: string | null
  designName: string
  fontName?: string | null
  deliveryMethod?: string | null
  deliveryDate?: string | null
  personalMessage?: string | null
  paymentMethod?: string | null
  invoiceNumber?: string | null
  receiptRef?: string | null
  issuedAt?: string
}

export interface BookingReceiptInput {
  booking_reference: string
  location_name: string
  location_address?: string | null
  appointment_date: string
  appointment_time: string
  total_duration: number
  subtotal_kobo?: number | null
  discount_kobo?: number | null
  voucher_code?: string | null
  total_price_kobo: number
  customer_name: string
  customer_email: string
  customer_phone: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'failed'
  payment_method: 'wallet' | 'paystack' | null
  payment_reference?: string | null
  notes?: string | null
  created_at?: string
  services: Array<{
    treatmentName: string
    categoryName: string
    duration: number
    priceKobo: number
  }>
}

export interface MembershipReceiptInput {
  reference: string
  txCreatedAt: string
  txStatus: string
  planName: string
  validityMonths: number
  glowPointsOnSignup: number
  siteWideOnly: boolean
  planPrice: number
  walletCredit: number
  buyerFirstName: string
  buyerLastName: string
  buyerEmail: string
  membershipStartedAt: string | null
  membershipExpiresAt: string | null
  paymentMethod: string
  invoiceNumber: string | null
}

function sanitizeRefBase(rawRef?: string | null): string {
  const cleaned = (rawRef || 'Dermaspace')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return cleaned || 'Order'
}

export function sanitizeReceiptFilename(rawRef?: string | null): string {
  return `Dermaspace-Receipt-${sanitizeRefBase(rawRef)}.pdf`
}

export function sanitizeReceiptImageFilename(rawRef?: string | null): string {
  return `Dermaspace-Receipt-${sanitizeRefBase(rawRef)}.png`
}

export function hexToRgb(
  hex?: string | null,
  fallback: [number, number, number] = [123, 45, 142],
): [number, number, number] {
  if (!hex || typeof hex !== 'string') return fallback
  const cleaned = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return [
      parseInt(cleaned.slice(0, 2), 16),
      parseInt(cleaned.slice(2, 4), 16),
      parseInt(cleaned.slice(4, 6), 16),
    ]
  }
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return [
      parseInt(cleaned[0] + cleaned[0], 16),
      parseInt(cleaned[1] + cleaned[1], 16),
      parseInt(cleaned[2] + cleaned[2], 16),
    ]
  }
  return fallback
}

function formatNairaPlain(amount: number, currency = 'NGN'): string {
  try {
    const formatted = new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount || 0))
    return currency.toUpperCase() === 'NGN'
      ? `NGN ${formatted}`
      : `${currency.toUpperCase()} ${formatted}`
  } catch {
    return `NGN ${Math.round(amount || 0)}`
  }
}

function formatReceiptDate(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date()
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateOnly(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function paymentMethodDisplay(
  method: TransactionReceiptInput['payment_method'],
): string {
  switch (method) {
    case 'paystack':
      return 'Card / Paystack'
    case 'bank_transfer':
      return 'Bank Transfer'
    case 'wallet':
      return 'Dermaspace Wallet'
    case 'cash':
      return 'Cash'
    default:
      return String(method)
  }
}

function statusDisplay(status: TransactionReceiptInput['status']): string {
  switch (status) {
    case 'completed':
      return 'Successful'
    case 'pending':
      return 'Pending'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return String(status)
  }
}

export function buildTransactionReceiptData(
  tx: TransactionReceiptInput,
): ReceiptDocumentData {
  const ref = tx.payment_reference || tx.reference || `TX-${tx.id}`
  const currency = tx.currency || 'NGN'
  const amountFormatted = formatNairaPlain(Number(tx.amount) || 0, currency)
  const isIncoming = tx.type === 'credit' || tx.type === 'refund'
  const invoiceNo = tx.invoice?.invoice_number || tx.giftCard?.invoice_number || null

  const title =
    tx.description ||
    (tx.giftCard
      ? `Gift Card for ${tx.giftCard.recipient_name || 'Recipient'}`
      : tx.booking
        ? `Spa Booking ${tx.booking.booking_reference}`
        : tx.type === 'credit'
          ? 'Wallet Funding'
          : tx.type === 'refund'
            ? 'Wallet Refund'
            : 'Spa Payment')

  const summaryRows: ReceiptDetailRow[] = [
    {
      label: 'Transaction Type',
      value: tx.giftCard
        ? 'Gift Card Purchase'
        : tx.booking
          ? 'Appointment Booking'
          : tx.type === 'credit'
            ? 'Wallet Deposit'
            : tx.type === 'refund'
              ? 'Refund'
              : 'Payment',
    },
    { label: 'Payment Method', value: paymentMethodDisplay(tx.payment_method) },
    { label: 'Reference', value: ref },
    { label: 'Date & Time', value: formatReceiptDate(tx.created_at) },
  ]

  if (tx.paystack_reference && tx.paystack_reference !== ref) {
    summaryRows.push({ label: 'Processor Ref', value: tx.paystack_reference })
  }
  if (invoiceNo) {
    summaryRows.push({ label: 'Invoice Number', value: invoiceNo })
  }

  let lineItems: ReceiptLineItem[] | undefined
  let giftCardVisual: ReceiptGiftCardVisual | null = null
  let note: string | null = null

  if (tx.giftCard) {
    const occasionMeta = getGiftCardOccasionMeta(tx.giftCard.occasion)
    const resolvedDesign = findGiftCardDesignById(
      tx.giftCard.design || tx.giftCard.design_name,
    )
    const metaDetails = (tx.metadata as { itemDetails?: Record<string, unknown> } | null)
      ?.itemDetails
    const senderName =
      tx.giftCard.sender_name ||
      (metaDetails?.senderName ? String(metaDetails.senderName) : null)
    const resolvedDesignName = tx.giftCard.design_name || resolvedDesign.name

    summaryRows.push({
      label: 'Recipient',
      value: tx.giftCard.recipient_name || 'Recipient',
    })
    if (tx.giftCard.recipient_email) {
      summaryRows.push({
        label: 'Recipient Email',
        value: tx.giftCard.recipient_email,
      })
    }
    if (senderName) {
      summaryRows.push({
        label: 'From',
        value: senderName,
      })
    }
    if (tx.giftCard.occasion) {
      summaryRows.push({
        label: 'Occasion & Theme',
        value: `${tx.giftCard.occasion} (${occasionMeta.editionLabel})`,
      })
    }
    if (resolvedDesignName || tx.giftCard.font_name) {
      summaryRows.push({
        label: 'Card Style',
        value: [
          resolvedDesignName,
          tx.giftCard.font_name ? `${tx.giftCard.font_name} font` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      })
    }
    if (tx.giftCard.delivery_method) {
      summaryRows.push({
        label: 'Delivery',
        value: tx.giftCard.delivery_date
          ? `${tx.giftCard.delivery_method} (${tx.giftCard.delivery_date})`
          : tx.giftCard.delivery_method,
      })
    }
    lineItems = [
      {
        title: `Dermaspace Gift Card — ${occasionMeta.editionLabel}`,
        subtitle: `For ${tx.giftCard.recipient_name || 'Recipient'} · ${resolvedDesignName}`,
        amount: amountFormatted,
      },
    ]
    giftCardVisual = {
      recipientName: tx.giftCard.recipient_name || 'Recipient',
      senderName,
      amountFormatted,
      occasion: tx.giftCard.occasion || 'Gift Card',
      editionLabel: occasionMeta.editionLabel,
      designName: resolvedDesignName,
      fontName: tx.giftCard.font_name || 'Elegant',
      surfaceHex: resolvedDesign.surfaceHex,
      accentHex: resolvedDesign.accentHex,
      medallionHex: getDesignMedallionHex(resolvedDesign),
      deliveryMethod: tx.giftCard.delivery_method || 'Email',
    }
    note = tx.giftCard.personal_message || null
  } else if (tx.booking) {
    summaryRows.push({
      label: 'Booking Ref',
      value: tx.booking.booking_reference,
    })
    summaryRows.push({
      label: 'Branch',
      value: tx.booking.location_name,
    })
    summaryRows.push({
      label: 'Appointment',
      value: `${tx.booking.appointment_date} at ${tx.booking.appointment_time}`,
    })
    if (tx.booking.services && tx.booking.services.length > 0) {
      lineItems = tx.booking.services.map((s) => ({
        title: s.treatment_name,
        subtitle: `${s.duration} min`,
        amount: '',
      }))
    }
  } else {
    lineItems = [
      {
        title,
        subtitle: `${paymentMethodDisplay(tx.payment_method)} · ${statusDisplay(tx.status)}`,
        amount: amountFormatted,
      },
    ]
  }

  return {
    documentTitle: 'TRANSACTION RECEIPT',
    statusLabel: statusDisplay(tx.status),
    reference: ref,
    invoiceNumber: invoiceNo,
    issueDate: formatReceiptDate(tx.created_at),
    headline: title,
    amountFormatted,
    amountLabel:
      tx.status === 'completed'
        ? isIncoming
          ? 'TOTAL CREDITED'
          : 'TOTAL PAID'
        : 'AMOUNT',
    paymentMethodLabel: paymentMethodDisplay(tx.payment_method),
    summaryRows,
    lineItems,
    giftCardVisual,
    note,
    noteTitle: 'PERSONAL MESSAGE',
    filename: sanitizeReceiptFilename(ref),
    imageFilename: sanitizeReceiptImageFilename(ref),
  }
}

export function buildGiftCardReceiptData(
  input: GiftCardReceiptInput,
): ReceiptDocumentData {
  const occasionMeta = getGiftCardOccasionMeta(input.occasion)
  const resolvedDesign = findGiftCardDesignById(
    input.designId || input.designName,
  )
  const resolvedDesignName = input.designName || resolvedDesign.name
  const ref = input.receiptRef || input.invoiceNumber || `GC-${Date.now()}`
  const amountText = formatNairaPlain(input.amount, 'NGN')

  const summaryRows: ReceiptDetailRow[] = [
    { label: 'Recipient', value: input.recipientName || 'Recipient' },
    ...(input.recipientEmail
      ? [{ label: 'Recipient Email', value: input.recipientEmail }]
      : []),
    ...(input.senderName ? [{ label: 'From', value: input.senderName }] : []),
    {
      label: 'Occasion & Theme',
      value: `${input.occasion} (${occasionMeta.editionLabel})`,
    },
    {
      label: 'Card Style',
      value: [
        resolvedDesignName,
        input.fontName ? `${input.fontName} font` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    },
    ...(input.deliveryMethod
      ? [
          {
            label: 'Delivery Method',
            value: input.deliveryDate
              ? `${input.deliveryMethod} (${input.deliveryDate})`
              : input.deliveryMethod,
          },
        ]
      : []),
    ...(input.paymentMethod
      ? [{ label: 'Paid Via', value: input.paymentMethod }]
      : []),
    ...(input.invoiceNumber
      ? [{ label: 'Invoice Number', value: input.invoiceNumber }]
      : []),
    { label: 'Reference', value: ref },
  ]

  return {
    documentTitle: 'GIFT CARD RECEIPT',
    statusLabel: 'Confirmed',
    reference: ref,
    invoiceNumber: input.invoiceNumber ?? null,
    issueDate: formatReceiptDate(input.issuedAt),
    headline: `Gift Card for ${input.recipientName || 'Recipient'}`,
    amountFormatted: amountText,
    amountLabel: 'TOTAL PAID',
    paymentMethodLabel: input.paymentMethod || undefined,
    summaryRows,
    lineItems: [
      {
        title: `Dermaspace Gift Card — ${occasionMeta.editionLabel}`,
        subtitle: `${resolvedDesignName}${input.fontName ? ` · ${input.fontName} font` : ''}`,
        amount: amountText,
      },
    ],
    giftCardVisual: {
      recipientName: input.recipientName || 'Recipient',
      senderName: input.senderName,
      amountFormatted: amountText,
      occasion: input.occasion,
      editionLabel: occasionMeta.editionLabel,
      designName: resolvedDesignName,
      fontName: input.fontName || 'Elegant',
      surfaceHex: resolvedDesign.surfaceHex,
      accentHex: resolvedDesign.accentHex,
      medallionHex: getDesignMedallionHex(resolvedDesign),
      deliveryMethod: input.deliveryMethod || 'Email',
    },
    note: input.personalMessage || null,
    noteTitle: 'PERSONAL MESSAGE',
    filename: sanitizeReceiptFilename(ref),
    imageFilename: sanitizeReceiptImageFilename(ref),
  }
}

export function buildBookingReceiptData(
  booking: BookingReceiptInput,
): ReceiptDocumentData {
  const dateLabel = new Date(
    `${booking.appointment_date}T00:00:00.000Z`,
  ).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const issueDate = booking.created_at
    ? formatReceiptDate(booking.created_at)
    : formatReceiptDate(null)

  const isPaid = booking.payment_status === 'paid'
  const firstName = booking.customer_name.split(' ')[0] || booking.customer_name

  const statusLabel = (() => {
    if (booking.status === 'cancelled') {
      return booking.payment_status === 'refunded'
        ? 'Cancelled · Refunded'
        : 'Cancelled'
    }
    if (booking.status === 'completed') return 'Completed'
    if (booking.status === 'no_show') return 'No-show'
    if (booking.status === 'confirmed') return 'Confirmed'
    return booking.payment_status === 'unpaid' ? 'Awaiting Payment' : 'Pending'
  })()

  const headline =
    booking.status === 'completed'
      ? `Thank you for visiting us, ${firstName}`
      : booking.status === 'cancelled'
        ? 'This appointment was cancelled'
        : isPaid
          ? `Appointment confirmed for ${firstName}`
          : `Appointment reserved for ${firstName}`

  const subheadline =
    booking.status === 'completed'
      ? 'We hope you enjoyed your experience at Dermaspace.'
      : booking.status === 'cancelled'
        ? booking.payment_status === 'refunded'
          ? 'Your refund has been processed.'
          : 'Book another visit whenever you are ready.'
        : 'Reschedule anytime up to 24 hours before your slot.'

  const subtotal = Number(booking.subtotal_kobo ?? booking.total_price_kobo) / 100
  const discount = Number(booking.discount_kobo ?? 0) / 100
  const total = Number(booking.total_price_kobo) / 100

  const methodLabel =
    booking.payment_method === 'wallet'
      ? 'Dermaspace Wallet'
      : booking.payment_method === 'paystack'
        ? 'Card / Paystack'
        : 'Online'

  const summaryRows: ReceiptDetailRow[] = [
    { label: 'Date', value: dateLabel },
    { label: 'Time', value: booking.appointment_time },
    { label: 'Duration', value: `${booking.total_duration} minutes` },
    { label: 'Location', value: booking.location_name },
    { label: 'Phone', value: booking.customer_phone },
    { label: 'Email', value: booking.customer_email },
  ]
  if (booking.payment_reference) {
    summaryRows.push({
      label: 'Payment Ref',
      value: booking.payment_reference,
    })
  }

  return {
    documentTitle: 'BOOKING RECEIPT',
    statusLabel,
    reference: booking.booking_reference,
    invoiceNumber: null,
    issueDate,
    headline,
    subheadline,
    amountFormatted: formatNairaPlain(total, 'NGN'),
    amountLabel: isPaid ? 'TOTAL PAID' : 'TOTAL DUE',
    paymentMethodLabel: methodLabel,
    summaryRows,
    lineItems: booking.services.map((s) => ({
      title: s.treatmentName,
      subtitle: `${s.categoryName} · ${s.duration} min`,
      amount: formatNairaPlain(s.priceKobo / 100, 'NGN'),
    })),
    subtotalFormatted: discount > 0 ? formatNairaPlain(subtotal, 'NGN') : null,
    discountLabel:
      discount > 0
        ? `Voucher${booking.voucher_code ? ` · ${booking.voucher_code}` : ''}`
        : null,
    discountFormatted:
      discount > 0 ? `- ${formatNairaPlain(discount, 'NGN')}` : null,
    note: booking.notes || null,
    noteTitle: 'APPOINTMENT NOTES',
    footerNote: 'Reschedule up to 24 hours before your slot · hello@dermaspaceng.com',
    filename: sanitizeReceiptFilename(booking.booking_reference),
    imageFilename: sanitizeReceiptImageFilename(booking.booking_reference),
  }
}

export function buildMembershipReceiptData(
  input: MembershipReceiptInput,
): ReceiptDocumentData {
  const validityCopy =
    input.validityMonths === 12
      ? '12 months (1 year)'
      : `${input.validityMonths} months`
  const pointsFormatted = `${Math.round(input.glowPointsOnSignup || 0).toLocaleString('en-NG')} pts`
  const planPriceFormatted = formatNairaPlain(input.planPrice, 'NGN')

  const lineItems: ReceiptLineItem[] = [
    {
      title: `${input.planName} Membership`,
      subtitle: `Annual subscription · ${validityCopy}`,
      amount: planPriceFormatted,
    },
    {
      title: 'Glow Points earned',
      subtitle: 'Non-monetary loyalty reward added to your account',
      amount: `+${pointsFormatted}`,
    },
  ]

  if (!input.siteWideOnly && input.walletCredit > 0) {
    lineItems.push({
      title: 'Credited to Wallet',
      subtitle: 'Available immediately for spa bookings',
      amount: formatNairaPlain(input.walletCredit, 'NGN'),
    })
  }

  return {
    documentTitle: 'MEMBERSHIP RECEIPT',
    statusLabel: input.txStatus === 'completed' ? 'Paid' : input.txStatus,
    reference: input.reference,
    invoiceNumber: input.invoiceNumber,
    issueDate: formatReceiptDate(input.txCreatedAt),
    headline: `${input.planName} Membership Activated`,
    subheadline: `Thank you, ${input.buyerFirstName}. Valid for ${validityCopy}.`,
    amountFormatted: planPriceFormatted,
    amountLabel: 'AMOUNT PAID',
    paymentMethodLabel: input.paymentMethod,
    summaryRows: [
      {
        label: 'Billed To',
        value: `${input.buyerFirstName} ${input.buyerLastName}`.trim(),
      },
      { label: 'Email', value: input.buyerEmail },
      { label: 'Payment Method', value: input.paymentMethod },
      { label: 'Validity', value: validityCopy },
      {
        label: 'Membership Starts',
        value: formatDateOnly(input.membershipStartedAt),
      },
      {
        label: 'Valid Until',
        value: formatDateOnly(input.membershipExpiresAt),
      },
    ],
    lineItems,
    filename: sanitizeReceiptFilename(input.reference),
    imageFilename: sanitizeReceiptImageFilename(input.reference),
  }
}

async function fetchImageBlobWithTimeout(
  url: string,
  timeoutMs = 1500,
): Promise<Blob | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      mode: url.startsWith('http') ? 'cors' : 'same-origin',
      signal: controller.signal,
    })
    return res.ok ? await res.blob() : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function loadLogoPngDataUrl(): Promise<{
  dataUrl: string | null
  aspect: number
}> {
  let logoDataUrl: string | null = null
  let logoAspect = 130 / 32
  try {
    const blob =
      (await fetchImageBlobWithTimeout(LOCAL_BRAND_LOGO, 1500)) ??
      (await fetchImageBlobWithTimeout(REMOTE_BRAND_LOGO, 1800))
    if (blob && typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob)
      const canvas = document.createElement('canvas')
      const targetW = Math.min(bitmap.width, 600)
      const targetH = Math.round((bitmap.height / bitmap.width) * targetW)
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, targetW, targetH)
        logoDataUrl = canvas.toDataURL('image/png')
        logoAspect = bitmap.width / bitmap.height
      }
    }
  } catch {
    // Graceful fallback to typeset wordmark
  }
  return { dataUrl: logoDataUrl, aspect: logoAspect }
}

function pdfFontFamilyForGiftCard(
  fontName?: string | null,
): 'times' | 'helvetica' | 'courier' {
  const lower = (fontName || '').toLowerCase()
  if (lower.includes('modern') || lower.includes('sans')) return 'helvetica'
  if (lower.includes('playful') || lower.includes('mono')) return 'courier'
  return 'times'
}

/**
 * Draws the repeating geometric diamond trellis band in jsPDF (single brand color).
 */
function drawPdfCrownPattern(
  doc: import('jspdf').jsPDF,
  pageWidth: number,
): void {
  const { brandRgb, brandTintRgb, brandBorderRgb } = RECEIPT_PALETTE
  // Solid top rule + patterned guilloché band
  doc.setFillColor(...brandRgb)
  doc.rect(0, 0, pageWidth, 4, 'F')

  doc.setFillColor(...brandTintRgb)
  doc.rect(0, 4, pageWidth, 12, 'F')

  doc.setDrawColor(...brandBorderRgb)
  doc.setLineWidth(0.55)
  const step = 12
  for (let x = 0; x <= pageWidth + step; x += step) {
    const cx = x
    const cy = 10
    doc.line(cx - 4, cy, cx, cy - 3.5)
    doc.line(cx, cy - 3.5, cx + 4, cy)
    doc.line(cx + 4, cy, cx, cy + 3.5)
    doc.line(cx, cy + 3.5, cx - 4, cy)
  }

  doc.setFillColor(...brandRgb)
  doc.rect(0, 16, pageWidth, 1.5, 'F')
}

export async function downloadReceiptPdf(
  data: ReceiptDocumentData,
): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 42
  const contentW = pageWidth - margin * 2

  const {
    brandRgb: brandPurple,
    brandTintRgb: brandSoft,
    brandPatternRgb,
    brandBorderRgb: lavenderBorder,
    textDarkRgb: textDark,
    textBodyRgb: textGray,
    mutedRgb: mutedGray,
    lineRgb: lineGray,
    stripeRgb,
  } = RECEIPT_PALETTE

  const ensureSpace = (neededHeight: number, currentY: number): number => {
    if (currentY + neededHeight > pageHeight - 78) {
      doc.addPage()
      drawPdfCrownPattern(doc, pageWidth)
      return 36
    }
    return currentY
  }

  const { dataUrl: logoDataUrl, aspect: logoAspect } = await loadLogoPngDataUrl()

  drawPdfCrownPattern(doc, pageWidth)

  // Editorial Masthead Band with subtle micro-dot pattern (zero gradients, single color)
  const heroTop = 17.5
  const heroH = 82
  doc.setFillColor(...brandSoft)
  doc.rect(0, heroTop, pageWidth, heroH, 'F')

  doc.setFillColor(...brandPatternRgb)
  for (let px = 14; px < pageWidth - 10; px += 14) {
    for (let py = heroTop + 10; py < heroTop + heroH - 6; py += 14) {
      doc.circle(px, py, 0.75, 'F')
    }
  }

  doc.setDrawColor(...lavenderBorder)
  doc.setLineWidth(0.75)
  doc.line(0, heroTop + heroH, pageWidth, heroTop + heroH)

  if (logoDataUrl) {
    const logoH = 34
    const logoW = Math.min(logoH * logoAspect, contentW * 0.44)
    doc.addImage(
      logoDataUrl,
      'PNG',
      margin,
      heroTop + 18,
      logoW,
      logoH,
      undefined,
      'FAST',
    )
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(...mutedGray)
    doc.text('ESTHETIC & WELLNESS CENTRE  ·  LAGOS', margin, heroTop + 65)
  } else {
    doc.setFont('times', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...brandPurple)
    doc.text('Dermaspace', margin, heroTop + 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...mutedGray)
    doc.text('ESTHETIC & WELLNESS CENTRE  ·  LAGOS', margin, heroTop + 58)
  }

  // Right masthead block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...brandPurple)
  doc.text('OFFICIAL RECEIPT', pageWidth - margin, heroTop + 28, {
    align: 'right',
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...textDark)
  doc.text(data.documentTitle, pageWidth - margin, heroTop + 45, {
    align: 'right',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.2)
  doc.setTextColor(...mutedGray)
  doc.text(`Issued ${data.issueDate}`, pageWidth - margin, heroTop + 61, {
    align: 'right',
  })

  let y = heroTop + heroH + 18

  // Reference / Invoice / Status Bar with corner registration brackets
  const metaBarH = 42
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...lavenderBorder)
  doc.setLineWidth(0.75)
  doc.roundedRect(margin, y, contentW, metaBarH, 6, 6, 'FD')

  // Subtle corner ticks on meta bar
  doc.setDrawColor(...brandPurple)
  doc.setLineWidth(1.2)
  doc.line(margin, y + 8, margin, y)
  doc.line(margin, y, margin + 8, y)
  doc.line(margin + contentW - 8, y + metaBarH, margin + contentW, y + metaBarH)
  doc.line(margin + contentW, y + metaBarH - 8, margin + contentW, y + metaBarH)

  const col1X = margin + 12
  const col2X = margin + contentW * 0.44
  const col3X = pageWidth - margin - 12

  doc.setDrawColor(...lineGray)
  doc.setLineWidth(0.6)
  doc.line(col2X - 12, y + 8, col2X - 12, y + metaBarH - 8)
  doc.line(margin + contentW * 0.76, y + 8, margin + contentW * 0.76, y + metaBarH - 8)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...mutedGray)
  doc.text('REFERENCE', col1X, y + 14)
  doc.text(data.invoiceNumber ? 'INVOICE NO.' : 'PAYMENT METHOD', col2X, y + 14)
  doc.text('STATUS', col3X, y + 14, { align: 'right' })

  doc.setFont('courier', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...brandPurple)
  doc.text(data.reference, col1X, y + 29, { maxWidth: contentW * 0.38 })

  doc.setFont(data.invoiceNumber ? 'courier' : 'helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...textDark)
  doc.text(
    data.invoiceNumber || data.paymentMethodLabel || 'Online',
    col2X,
    y + 29,
    { maxWidth: contentW * 0.28 },
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...brandPurple)
  const statusTextW = doc.getTextWidth(data.statusLabel)
  doc.setFillColor(...brandPurple)
  doc.circle(col3X - statusTextW - 7, y + 25.5, 2.5, 'F')
  doc.text(data.statusLabel, col3X, y + 29, { align: 'right' })

  y += metaBarH + 16

  // Perforated tear divider with centered diamond mark
  doc.setDrawColor(...lavenderBorder)
  doc.setLineWidth(0.75)
  doc.setLineDashPattern([3, 3], 0)
  doc.line(margin, y, margin + contentW / 2 - 10, y)
  doc.line(margin + contentW / 2 + 10, y, pageWidth - margin, y)
  doc.setLineDashPattern([], 0)
  const midX = pageWidth / 2
  doc.setFillColor(...brandPurple)
  doc.triangle(midX, y - 3.5, midX - 3.5, y, midX + 3.5, y, 'F')
  doc.triangle(midX, y + 3.5, midX - 3.5, y, midX + 3.5, y, 'F')

  y += 16

  // Headline & optional subheadline
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13.5)
  doc.setTextColor(...textDark)
  const headlineLines = doc.splitTextToSize(data.headline, contentW)
  doc.text(headlineLines, margin, y)
  y += headlineLines.length * 16

  if (data.subheadline) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.2)
    doc.setTextColor(...mutedGray)
    const subLines = doc.splitTextToSize(data.subheadline, contentW)
    doc.text(subLines, margin, y + 2)
    y += subLines.length * 12 + 4
  }
  y += 8

  // Gift Card Specimen Visual (strictly single-color chrome around the chosen specimen)
  if (data.giftCardVisual) {
    const gc = data.giftCardVisual
    const visualH = 148
    y = ensureSpace(visualH + 20, y)

    const cardW = 256
    const cardH = visualH
    const specX = margin + cardW + 12
    const specW = contentW - cardW - 12

    const surfaceRgb = hexToRgb(gc.surfaceHex, brandPurple)
    const accentRgb = hexToRgb(gc.accentHex, brandPurple)
    const medallionRgb = hexToRgb(gc.medallionHex, brandPurple)
    const gcFont = pdfFontFamilyForGiftCard(gc.fontName)

    doc.setFillColor(...surfaceRgb)
    doc.roundedRect(margin, y, cardW, cardH, 10, 10, 'F')

    doc.setFillColor(...accentRgb)
    doc.roundedRect(margin + cardW * 0.58, y + 10, cardW * 0.38, cardH - 20, 8, 8, 'F')

    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.6)
    doc.roundedRect(margin + 6, y + 6, cardW - 12, cardH - 12, 7, 7, 'S')

    const medX = margin + cardW - 48
    const medY = y + cardH / 2 + 2
    doc.setFillColor(...medallionRgb)
    doc.setDrawColor(245, 236, 248)
    doc.setLineWidth(0.9)
    doc.circle(medX, medY, 25, 'FD')
    doc.setLineWidth(0.5)
    doc.circle(medX, medY, 18, 'S')

    doc.setFillColor(255, 255, 255)
    doc.triangle(medX, medY - 12, medX - 3.5, medY, medX + 3.5, medY, 'F')
    doc.triangle(medX, medY + 12, medX - 3.5, medY, medX + 3.5, medY, 'F')
    doc.triangle(medX - 12, medY, medX, medY - 3.5, medX, medY + 3.5, 'F')
    doc.triangle(medX + 12, medY, medX, medY - 3.5, medX, medY + 3.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('DERMASPACE', margin + 16, y + 24)
    doc.setFontSize(6.5)
    doc.text('GIFT CARD', margin + cardW - 16, y + 24, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(240, 235, 245)
    doc.text('FOR', margin + 16, y + 48)
    doc.setFont(gcFont, 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text(gc.recipientName, margin + 16, y + 62, { maxWidth: 140 })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(240, 235, 245)
    doc.text('VALUE', margin + 16, y + 83)
    doc.setFont(gcFont, 'bold')
    doc.setFontSize(17)
    doc.setTextColor(255, 255, 255)
    doc.text(gc.amountFormatted, margin + 16, y + 101, { maxWidth: 145 })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(245, 238, 250)
    doc.text(gc.editionLabel, margin + 16, y + cardH - 16, { maxWidth: 118 })
    if (gc.senderName) {
      doc.setFontSize(7.2)
      doc.text(`From: ${gc.senderName}`, margin + cardW - 16, y + cardH - 16, {
        align: 'right',
        maxWidth: 102,
      })
    }

    doc.setFillColor(...brandSoft)
    doc.setDrawColor(...lavenderBorder)
    doc.setLineWidth(0.75)
    doc.roundedRect(specX, y, specW, cardH, 8, 8, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(...brandPurple)
    doc.text('CARD SPECIFICATION', specX + 12, y + 19)
    doc.setDrawColor(...lavenderBorder)
    doc.line(specX + 12, y + 25, specX + specW - 12, y + 25)

    doc.setFillColor(...surfaceRgb)
    doc.rect(specX + 12, y + 34, 11, 11, 'F')
    doc.setFillColor(...accentRgb)
    doc.rect(specX + 23, y + 34, 6, 11, 'F')
    doc.setDrawColor(...lavenderBorder)
    doc.rect(specX + 12, y + 34, 17, 11, 'S')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...mutedGray)
    doc.text('STYLE THEME', specX + 36, y + 39)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...textDark)
    doc.text(gc.designName, specX + 36, y + 49, { maxWidth: specW - 48 })

    const specItems: Array<[string, string]> = [
      ['EDITION', gc.editionLabel],
      ['TYPOGRAPHY', `${gc.fontName || 'Elegant'} Font`],
      ['VALIDITY', 'VI & Ikoyi · Never Expires'],
    ]
    let sy = y + 70
    for (const [lbl, val] of specItems) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...mutedGray)
      doc.text(lbl, specX + 12, sy)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...textDark)
      doc.text(val, specX + 12, sy + 10, { maxWidth: specW - 24 })
      sy += 26
    }

    y += visualH + 16
  }

  // Two-column metadata summary grid
  const rowCount = Math.ceil(data.summaryRows.length / 2)
  const rowHeight = 33
  const gridH = rowCount * rowHeight + 12
  y = ensureSpace(gridH + 18, y)

  doc.setDrawColor(...lavenderBorder)
  doc.setFillColor(255, 255, 255)
  doc.setLineWidth(0.75)
  doc.roundedRect(margin, y, contentW, gridH, 7, 7, 'FD')

  const colW = contentW / 2
  doc.setDrawColor(...lineGray)
  doc.setLineWidth(0.5)
  doc.line(margin + colW, y + 8, margin + colW, y + gridH - 8)

  let gy = y + 17
  for (let i = 0; i < data.summaryRows.length; i += 2) {
    const left = data.summaryRows[i]
    const right = data.summaryRows[i + 1]

    if (i > 0) {
      doc.setDrawColor(244, 242, 247)
      doc.line(margin + 10, gy - 10, pageWidth - margin - 10, gy - 10)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...mutedGray)
    doc.text(left.label.toUpperCase(), margin + 12, gy)
    if (right) {
      doc.text(right.label.toUpperCase(), margin + colW + 12, gy)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...textDark)
    doc.text(left.value, margin + 12, gy + 11.5, { maxWidth: colW - 22 })
    if (right) {
      doc.text(right.value, margin + colW + 12, gy + 11.5, {
        maxWidth: colW - 22,
      })
    }
    gy += rowHeight
  }
  y += gridH + 16

  // Itemized Summary Table
  if (data.lineItems && data.lineItems.length > 0) {
    y = ensureSpace(62, y)

    doc.setFillColor(...brandSoft)
    doc.setDrawColor(...lavenderBorder)
    doc.setLineWidth(0.6)
    doc.roundedRect(margin, y, contentW, 21, 5, 5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(...brandPurple)
    doc.text('ITEM DESCRIPTION', margin + 10, y + 13.5)
    doc.text('AMOUNT', pageWidth - margin - 10, y + 13.5, { align: 'right' })
    y += 24

    const rowH = 34
    data.lineItems.forEach((item, idx) => {
      y = ensureSpace(rowH + 10, y)
      if (idx % 2 === 1) {
        doc.setFillColor(...stripeRgb)
        doc.rect(margin, y, contentW, rowH - 2, 'F')
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...textDark)
      doc.text(item.title, margin + 10, y + 13, { maxWidth: contentW * 0.68 })
      if (item.amount) {
        doc.setTextColor(...brandPurple)
        doc.text(item.amount, pageWidth - margin - 10, y + 13, {
          align: 'right',
        })
      }
      if (item.subtitle) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...mutedGray)
        doc.text(item.subtitle, margin + 10, y + 25, {
          maxWidth: contentW * 0.84,
        })
      }
      doc.setDrawColor(...lineGray)
      doc.setLineWidth(0.5)
      doc.line(margin, y + rowH - 2, pageWidth - margin, y + rowH - 2)
      y += rowH
    })
    y += 10
  }

  // Subtotal & Discount breakdown (single color)
  if (data.subtotalFormatted && data.discountFormatted) {
    y = ensureSpace(38, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...mutedGray)
    doc.text('Subtotal', margin + 8, y + 10)
    doc.setTextColor(...textDark)
    doc.text(data.subtotalFormatted, pageWidth - margin - 8, y + 10, {
      align: 'right',
    })

    doc.setTextColor(...brandPurple)
    doc.text(data.discountLabel || 'Voucher', margin + 8, y + 25)
    doc.setFont('helvetica', 'bold')
    doc.text(data.discountFormatted, pageWidth - margin - 8, y + 25, {
      align: 'right',
    })
    y += 34
  }

  // Total Paid Banner (Strictly Single Brand Color #7B2D8E + subtle geometric border motif)
  const totalCardH = 56
  y = ensureSpace(totalCardH + 18, y)

  doc.setFillColor(...brandPurple)
  doc.roundedRect(margin, y, contentW, totalCardH, 8, 8, 'F')

  // Subtle decorative inset hairline inside the total card
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.35)
  doc.roundedRect(margin + 4, y + 4, contentW - 8, totalCardH - 8, 5, 5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(236, 223, 244)
  doc.text(data.amountLabel, margin + 16, y + 19)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19.5)
  doc.setTextColor(255, 255, 255)
  doc.text(data.amountFormatted, margin + 16, y + 42)

  if (data.paymentMethodLabel) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(data.paymentMethodLabel, pageWidth - margin - 16, y + 23, {
      align: 'right',
    })
  }
  if (data.invoiceNumber) {
    doc.setFont('courier', 'normal')
    doc.setFontSize(8.2)
    doc.setTextColor(236, 223, 244)
    doc.text(data.invoiceNumber, pageWidth - margin - 16, y + 39, {
      align: 'right',
    })
  }
  y += totalCardH + 16

  // Personal Message / Notes Quote Card
  if (data.note) {
    const noteLines = doc.splitTextToSize(`"${data.note}"`, contentW - 28)
    const noteBoxH = noteLines.length * 12 + 28
    y = ensureSpace(noteBoxH + 14, y)

    doc.setFillColor(...brandSoft)
    doc.setDrawColor(...lavenderBorder)
    doc.setLineWidth(0.75)
    doc.roundedRect(margin, y, contentW, noteBoxH, 7, 7, 'FD')
    doc.setFillColor(...brandPurple)
    doc.rect(margin, y + 5, 3, noteBoxH - 10, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...brandPurple)
    doc.text(data.noteTitle || 'PERSONAL MESSAGE', margin + 12, y + 16)

    doc.setFont('times', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...textGray)
    doc.text(noteLines, margin + 12, y + 29)
    y += noteBoxH + 14
  }

  // Closing Stamp + Footer
  y = ensureSpace(60, y)
  const footerY = Math.max(y + 12, pageHeight - 66)
  doc.setDrawColor(...lavenderBorder)
  doc.setLineDashPattern([3, 3], 0)
  doc.line(margin, footerY, pageWidth - margin, footerY)
  doc.setLineDashPattern([], 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...brandPurple)
  doc.text('Crafted with care at Dermaspace', pageWidth / 2, footerY + 16, {
    align: 'center',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  doc.setTextColor(...mutedGray)
  doc.text(
    data.footerNote ||
      '237B Muri Okunola St, Victoria Island  ·  9 Agbeke Rotinwa Cl, Ikoyi',
    pageWidth / 2,
    footerY + 29,
    { align: 'center' },
  )
  doc.text(
    'dermaspaceng.com  ·  hello@dermaspaceng.com  ·  09013134945 / 09061836625',
    pageWidth / 2,
    footerY + 41,
    { align: 'center' },
  )

  doc.save(data.filename)
  return data.filename
}

/**
 * Helper to wrap text safely on HTML5 2D Canvas.
 */
function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function triggerCanvasPngDownload(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<void> {
  return new Promise((resolve) => {
    const doAnchorDownload = (href: string, revokeAfter = false) => {
      const a = document.createElement('a')
      a.href = href
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      if (revokeAfter) {
        setTimeout(() => URL.revokeObjectURL(href), 2000)
      }
      resolve()
    }

    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          doAnchorDownload(url, true)
        } else {
          doAnchorDownload(canvas.toDataURL('image/png'))
        }
      }, 'image/png')
    } else {
      doAnchorDownload(canvas.toDataURL('image/png'))
    }
  })
}

/**
 * Generates and downloads a crisp, high-resolution, compact PNG receipt image
 * matching the single-color (#7B2D8E) patterned Dermaspace receipt design.
 */
export async function downloadReceiptImage(
  data: ReceiptDocumentData,
): Promise<string> {
  const scale = 2
  const width = 520
  const padX = 28
  const cardMargin = 20
  const cardX = cardMargin
  const cardW = width - cardMargin * 2
  const innerX = cardX + padX
  const innerW = cardW - padX * 2

  const brandHex = RECEIPT_PALETTE.brandHex
  const tintBg = '#F7F2FA'
  const outerBg = '#F4EFF7'
  const borderHex = '#DECFE7'
  const lineHex = '#ECE7F0'
  const textDark = '#18181B'
  const textMuted = '#71717A'

  // Preload logo bitmap if available
  let logoBitmap: ImageBitmap | null = null
  try {
    const blob =
      (await fetchImageBlobWithTimeout(LOCAL_BRAND_LOGO, 1400)) ??
      (await fetchImageBlobWithTimeout(REMOTE_BRAND_LOGO, 1600))
    if (blob && typeof createImageBitmap === 'function') {
      logoBitmap = await createImageBitmap(blob)
    }
  } catch {
    logoBitmap = null
  }

  // Measure dynamic height with a temporary 2D context
  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')!
  mctx.font = '700 17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  const headlineLines = wrapCanvasLines(mctx, data.headline, innerW)
  mctx.font = '400 12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  const subLines = data.subheadline
    ? wrapCanvasLines(mctx, data.subheadline, innerW)
    : []
  mctx.font = 'italic 12px Georgia, serif'
  const noteLines = data.note
    ? wrapCanvasLines(mctx, `"${data.note}"`, innerW - 28)
    : []

  const mastheadH = 92
  const metaH = 54
  const tearH = 26
  const headlineH =
    headlineLines.length * 22 + (subLines.length ? subLines.length * 17 + 4 : 0) + 14
  const summaryRowsCount = Math.ceil(data.summaryRows.length / 2)
  const summaryH = summaryRowsCount * 42 + 16
  const lineItemsCount = data.lineItems?.length ?? 0
  const itemsH = lineItemsCount > 0 ? 32 + lineItemsCount * 44 + 14 : 0
  const discountH = data.subtotalFormatted && data.discountFormatted ? 44 : 0
  const totalH = 74
  const noteH = data.note ? noteLines.length * 16 + 38 + 14 : 0
  const footerH = 74

  const cardH =
    14 +
    mastheadH +
    16 +
    metaH +
    tearH +
    headlineH +
    summaryH +
    16 +
    itemsH +
    discountH +
    totalH +
    16 +
    noteH +
    footerH

  const totalHeight = cardMargin * 2 + cardH

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = totalHeight * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  // Outer canvas background
  ctx.fillStyle = outerBg
  ctx.fillRect(0, 0, width, totalHeight)

  // Receipt card body (zero shadow, crisp hairline border)
  drawRoundedRectPath(ctx, cardX, cardMargin, cardW, cardH, 16)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = borderHex
  ctx.stroke()

  // Clip interior to rounded card for clean crown pattern
  ctx.save()
  drawRoundedRectPath(ctx, cardX, cardMargin, cardW, cardH, 16)
  ctx.clip()

  let y = cardMargin

  // 1. Crown geometric diamond trellis band (14px)
  ctx.fillStyle = brandHex
  ctx.fillRect(cardX, y, cardW, 4)
  ctx.fillStyle = tintBg
  ctx.fillRect(cardX, y + 4, cardW, 10)
  ctx.strokeStyle = borderHex
  ctx.lineWidth = 0.8
  for (let dx = cardX; dx <= cardX + cardW + 12; dx += 12) {
    ctx.beginPath()
    ctx.moveTo(dx - 4, y + 9)
    ctx.lineTo(dx, y + 5.5)
    ctx.lineTo(dx + 4, y + 9)
    ctx.lineTo(dx, y + 12.5)
    ctx.closePath()
    ctx.stroke()
  }
  ctx.fillStyle = brandHex
  ctx.fillRect(cardX, y + 14, cardW, 1.5)
  y += 15.5

  // 2. Masthead band with micro-dot pattern
  ctx.fillStyle = tintBg
  ctx.fillRect(cardX, y, cardW, mastheadH)
  ctx.fillStyle = '#E5D5EF'
  for (let px = cardX + 12; px < cardX + cardW - 8; px += 14) {
    for (let py = y + 10; py < y + mastheadH - 6; py += 14) {
      ctx.beginPath()
      ctx.arc(px, py, 0.9, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.strokeStyle = borderHex
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cardX, y + mastheadH)
  ctx.lineTo(cardX + cardW, y + mastheadH)
  ctx.stroke()

  if (logoBitmap) {
    const logoH = 30
    const logoW = Math.min(logoH * (logoBitmap.width / logoBitmap.height), 170)
    ctx.drawImage(logoBitmap, innerX, y + 20, logoW, logoH)
    ctx.fillStyle = textMuted
    ctx.font = '700 8.5px system-ui, -apple-system, sans-serif'
    ctx.fillText('ESTHETIC & WELLNESS CENTRE  ·  LAGOS', innerX, y + 66)
  } else {
    ctx.fillStyle = brandHex
    ctx.font = '700 22px Georgia, serif'
    ctx.fillText('Dermaspace', innerX, y + 44)
    ctx.fillStyle = textMuted
    ctx.font = '700 8.5px system-ui, -apple-system, sans-serif'
    ctx.fillText('ESTHETIC & WELLNESS CENTRE  ·  LAGOS', innerX, y + 64)
  }

  ctx.textAlign = 'right'
  ctx.fillStyle = brandHex
  ctx.font = '700 9px system-ui, -apple-system, sans-serif'
  ctx.fillText('OFFICIAL RECEIPT', innerX + innerW, y + 30)
  ctx.fillStyle = textDark
  ctx.font = '700 13px system-ui, -apple-system, sans-serif'
  ctx.fillText(data.documentTitle, innerX + innerW, y + 48)
  ctx.fillStyle = textMuted
  ctx.font = '400 10px system-ui, -apple-system, sans-serif'
  ctx.fillText(`Issued ${data.issueDate}`, innerX + innerW, y + 65)
  ctx.textAlign = 'left'

  y += mastheadH + 16

  // 3. Reference / Status Bar + Corner Registration Brackets
  drawRoundedRectPath(ctx, innerX, y, innerW, metaH, 8)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.strokeStyle = borderHex
  ctx.lineWidth = 1
  ctx.stroke()

  // Corner registration ticks
  ctx.strokeStyle = brandHex
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(innerX, y + 9)
  ctx.lineTo(innerX, y)
  ctx.lineTo(innerX + 9, y)
  ctx.moveTo(innerX + innerW - 9, y + metaH)
  ctx.lineTo(innerX + innerW, y + metaH)
  ctx.lineTo(innerX + innerW, y + metaH - 9)
  ctx.stroke()

  const colSplit = innerX + innerW * 0.62
  ctx.strokeStyle = lineHex
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(colSplit, y + 10)
  ctx.lineTo(colSplit, y + metaH - 10)
  ctx.stroke()

  ctx.fillStyle = textMuted
  ctx.font = '700 8.5px system-ui, -apple-system, sans-serif'
  ctx.fillText('REFERENCE', innerX + 12, y + 18)
  ctx.textAlign = 'right'
  ctx.fillText('STATUS', innerX + innerW - 12, y + 18)

  ctx.textAlign = 'left'
  ctx.fillStyle = brandHex
  ctx.font = '700 12.5px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(data.reference, innerX + 12, y + 38, innerW * 0.56)

  ctx.textAlign = 'right'
  ctx.fillStyle = brandHex
  ctx.font = '700 11.5px system-ui, -apple-system, sans-serif'
  const stWidth = ctx.measureText(data.statusLabel).width
  ctx.beginPath()
  ctx.arc(innerX + innerW - 12 - stWidth - 8, y + 34, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillText(data.statusLabel, innerX + innerW - 12, y + 38)
  ctx.textAlign = 'left'

  y += metaH

  // 4. Perforated Tear Divider with Side Notches & Centered Diamond
  const tearY = y + tearH / 2
  ctx.save()
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = borderHex
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cardX + 12, tearY)
  ctx.lineTo(width / 2 - 10, tearY)
  ctx.moveTo(width / 2 + 10, tearY)
  ctx.lineTo(cardX + cardW - 12, tearY)
  ctx.stroke()
  ctx.restore()

  // Ticket side notches
  ctx.fillStyle = outerBg
  ctx.beginPath()
  ctx.arc(cardX, tearY, 8, -Math.PI / 2, Math.PI / 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cardX + cardW, tearY, 8, Math.PI / 2, -Math.PI / 2)
  ctx.fill()

  // Center diamond seal
  ctx.fillStyle = brandHex
  ctx.beginPath()
  ctx.moveTo(width / 2, tearY - 4.5)
  ctx.lineTo(width / 2 + 4.5, tearY)
  ctx.lineTo(width / 2, tearY + 4.5)
  ctx.lineTo(width / 2 - 4.5, tearY)
  ctx.closePath()
  ctx.fill()

  y += tearH

  // 5. Headline & Subheadline
  ctx.fillStyle = textDark
  ctx.font = '700 17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  for (const line of headlineLines) {
    ctx.fillText(line, innerX, y + 14)
    y += 22
  }
  if (subLines.length > 0) {
    ctx.fillStyle = textMuted
    ctx.font = '400 12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    for (const line of subLines) {
      ctx.fillText(line, innerX, y + 12)
      y += 17
    }
    y += 4
  }
  y += 14

  // 6. Summary Details Grid
  drawRoundedRectPath(ctx, innerX, y, innerW, summaryH, 10)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.strokeStyle = borderHex
  ctx.lineWidth = 1
  ctx.stroke()

  const sColW = innerW / 2
  ctx.strokeStyle = lineHex
  ctx.beginPath()
  ctx.moveTo(innerX + sColW, y + 10)
  ctx.lineTo(innerX + sColW, y + summaryH - 10)
  ctx.stroke()

  let sgy = y + 20
  for (let i = 0; i < data.summaryRows.length; i += 2) {
    const left = data.summaryRows[i]
    const right = data.summaryRows[i + 1]
    if (i > 0) {
      ctx.strokeStyle = '#F4F1F7'
      ctx.beginPath()
      ctx.moveTo(innerX + 10, sgy - 12)
      ctx.lineTo(innerX + innerW - 10, sgy - 12)
      ctx.stroke()
    }
    ctx.fillStyle = textMuted
    ctx.font = '700 8.5px system-ui, -apple-system, sans-serif'
    ctx.fillText(left.label.toUpperCase(), innerX + 12, sgy)
    if (right) {
      ctx.fillText(right.label.toUpperCase(), innerX + sColW + 12, sgy)
    }
    ctx.fillStyle = textDark
    ctx.font = '600 11.5px system-ui, -apple-system, sans-serif'
    ctx.fillText(left.value, innerX + 12, sgy + 15, sColW - 22)
    if (right) {
      ctx.fillText(right.value, innerX + sColW + 12, sgy + 15, sColW - 22)
    }
    sgy += 42
  }
  y += summaryH + 16

  // 7. Line Items Table
  if (data.lineItems && data.lineItems.length > 0) {
    drawRoundedRectPath(ctx, innerX, y, innerW, 26, 6)
    ctx.fillStyle = tintBg
    ctx.fill()
    ctx.strokeStyle = borderHex
    ctx.lineWidth = 0.8
    ctx.stroke()

    ctx.fillStyle = brandHex
    ctx.font = '700 9px system-ui, -apple-system, sans-serif'
    ctx.fillText('ITEM DESCRIPTION', innerX + 12, y + 16)
    ctx.textAlign = 'right'
    ctx.fillText('AMOUNT', innerX + innerW - 12, y + 16)
    ctx.textAlign = 'left'
    y += 30

    data.lineItems.forEach((item, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = '#FBF9FD'
        ctx.fillRect(innerX, y, innerW, 42)
      }
      ctx.fillStyle = textDark
      ctx.font = '600 12px system-ui, -apple-system, sans-serif'
      ctx.fillText(item.title, innerX + 12, y + 17, innerW * 0.66)
      if (item.amount) {
        ctx.textAlign = 'right'
        ctx.fillStyle = brandHex
        ctx.font = '700 12px system-ui, -apple-system, sans-serif'
        ctx.fillText(item.amount, innerX + innerW - 12, y + 17)
        ctx.textAlign = 'left'
      }
      if (item.subtitle) {
        ctx.fillStyle = textMuted
        ctx.font = '400 10.5px system-ui, -apple-system, sans-serif'
        ctx.fillText(item.subtitle, innerX + 12, y + 32, innerW * 0.84)
      }
      ctx.strokeStyle = lineHex
      ctx.beginPath()
      ctx.moveTo(innerX, y + 42)
      ctx.lineTo(innerX + innerW, y + 42)
      ctx.stroke()
      y += 44
    })
    y += 12
  }

  // 8. Subtotal & Discount
  if (data.subtotalFormatted && data.discountFormatted) {
    ctx.fillStyle = textMuted
    ctx.font = '400 11.5px system-ui, -apple-system, sans-serif'
    ctx.fillText('Subtotal', innerX + 8, y + 12)
    ctx.textAlign = 'right'
    ctx.fillStyle = textDark
    ctx.fillText(data.subtotalFormatted, innerX + innerW - 8, y + 12)
    ctx.textAlign = 'left'

    ctx.fillStyle = brandHex
    ctx.font = '600 11.5px system-ui, -apple-system, sans-serif'
    ctx.fillText(data.discountLabel || 'Voucher', innerX + 8, y + 30)
    ctx.textAlign = 'right'
    ctx.fillText(data.discountFormatted, innerX + innerW - 8, y + 30)
    ctx.textAlign = 'left'
    y += 44
  }

  // 9. Solid #7B2D8E Total Paid Banner
  drawRoundedRectPath(ctx, innerX, y, innerW, totalH, 10)
  ctx.fillStyle = brandHex
  ctx.fill()

  drawRoundedRectPath(ctx, innerX + 4, y + 4, innerW - 8, totalH - 8, 7)
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 0.9
  ctx.stroke()

  ctx.fillStyle = '#EFE3F5'
  ctx.font = '700 9px system-ui, -apple-system, sans-serif'
  ctx.fillText(data.amountLabel, innerX + 18, y + 24)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '700 24px system-ui, -apple-system, sans-serif'
  ctx.fillText(data.amountFormatted, innerX + 18, y + 53)

  ctx.textAlign = 'right'
  if (data.paymentMethodLabel) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '600 11px system-ui, -apple-system, sans-serif'
    ctx.fillText(data.paymentMethodLabel, innerX + innerW - 18, y + 30)
  }
  if (data.invoiceNumber) {
    ctx.fillStyle = '#EFE3F5'
    ctx.font = '400 10px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(data.invoiceNumber, innerX + innerW - 18, y + 48)
  }
  ctx.textAlign = 'left'
  y += totalH + 16

  // 10. Personal Note Box
  if (data.note) {
    const boxH = noteLines.length * 16 + 38
    drawRoundedRectPath(ctx, innerX, y, innerW, boxH, 8)
    ctx.fillStyle = tintBg
    ctx.fill()
    ctx.strokeStyle = borderHex
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = brandHex
    ctx.fillRect(innerX, y + 6, 4, boxH - 12)
    ctx.font = '700 8.5px system-ui, -apple-system, sans-serif'
    ctx.fillText(data.noteTitle || 'PERSONAL MESSAGE', innerX + 14, y + 20)

    ctx.fillStyle = '#3F3F46'
    ctx.font = 'italic 12px Georgia, serif'
    noteLines.forEach((line, idx) => {
      ctx.fillText(line, innerX + 14, y + 37 + idx * 16)
    })
    y += boxH + 14
  }

  // 11. Footer
  ctx.save()
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = borderHex
  ctx.beginPath()
  ctx.moveTo(innerX, y + 6)
  ctx.lineTo(innerX + innerW, y + 6)
  ctx.stroke()
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = brandHex
  ctx.font = '700 11px system-ui, -apple-system, sans-serif'
  ctx.fillText('Crafted with care at Dermaspace', width / 2, y + 28)
  ctx.fillStyle = textMuted
  ctx.font = '400 9.5px system-ui, -apple-system, sans-serif'
  ctx.fillText(
    data.footerNote ||
      '237B Muri Okunola St, Victoria Island  ·  9 Agbeke Rotinwa Cl, Ikoyi',
    width / 2,
    y + 44,
  )
  ctx.fillText(
    'dermaspaceng.com  ·  hello@dermaspaceng.com  ·  09013134945 / 09061836625',
    width / 2,
    y + 58,
  )
  ctx.textAlign = 'left'
  ctx.restore()

  const imageName =
    data.imageFilename || sanitizeReceiptImageFilename(data.reference)
  await triggerCanvasPngDownload(canvas, imageName)
  return imageName
}

export async function downloadTransactionReceiptPdf(
  tx: TransactionReceiptInput,
): Promise<string> {
  return downloadReceiptPdf(buildTransactionReceiptData(tx))
}

export async function downloadTransactionReceiptImage(
  tx: TransactionReceiptInput,
): Promise<string> {
  return downloadReceiptImage(buildTransactionReceiptData(tx))
}

export async function downloadGiftCardReceiptPdf(
  input: GiftCardReceiptInput,
): Promise<string> {
  return downloadReceiptPdf(buildGiftCardReceiptData(input))
}

export async function downloadGiftCardReceiptImage(
  input: GiftCardReceiptInput,
): Promise<string> {
  return downloadReceiptImage(buildGiftCardReceiptData(input))
}

export async function downloadBookingReceiptPdf(
  booking: BookingReceiptInput,
): Promise<string> {
  return downloadReceiptPdf(buildBookingReceiptData(booking))
}

export async function downloadBookingReceiptImage(
  booking: BookingReceiptInput,
): Promise<string> {
  return downloadReceiptImage(buildBookingReceiptData(booking))
}

export async function downloadMembershipReceiptPdf(
  input: MembershipReceiptInput,
): Promise<string> {
  return downloadReceiptPdf(buildMembershipReceiptData(input))
}

export async function downloadMembershipReceiptImage(
  input: MembershipReceiptInput,
): Promise<string> {
  return downloadReceiptImage(buildMembershipReceiptData(input))
}
