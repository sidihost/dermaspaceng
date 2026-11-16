import {
  findGiftCardDesignById,
  getDesignMedallionHex,
  getGiftCardOccasionMeta,
} from './gift-card-templates'
import {
  classifyStatusTone,
  measureLineItems,
  measureSummaryPairs,
  needsPageBreak,
  resolveLineItemColumnMode,
  wrapTextLines,
  type LineItemColumnMode,
  type ReceiptStatusTone,
} from './receipt-layout'

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
        subtitle: 'Scheduled spa treatment',
        amount: `${s.duration} min`,
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

async function loadLogoAssets(): Promise<{
  dataUrl: string | null
  bitmap: ImageBitmap | null
  aspect: number
}> {
  let logoDataUrl: string | null = null
  let bitmap: ImageBitmap | null = null
  let aspect = 1024 / 209
  try {
    const blob =
      (await fetchImageBlobWithTimeout(LOCAL_BRAND_LOGO, 1500)) ??
      (await fetchImageBlobWithTimeout(REMOTE_BRAND_LOGO, 1800))
    if (blob && typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(blob)
      aspect = bitmap.width / bitmap.height
      const canvas = document.createElement('canvas')
      const targetW = Math.min(bitmap.width, 900)
      const targetH = Math.round((bitmap.height / bitmap.width) * targetW)
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, targetW, targetH)
        logoDataUrl = canvas.toDataURL('image/png')
      }
    }
  } catch {
    // Graceful fallback to typeset wordmark
  }
  return { dataUrl: logoDataUrl, bitmap, aspect }
}

function pdfFontFamilyForGiftCard(
  fontName?: string | null,
): 'times' | 'helvetica' | 'courier' {
  const lower = (fontName || '').toLowerCase()
  if (lower.includes('modern') || lower.includes('sans')) return 'helvetica'
  if (lower.includes('playful') || lower.includes('mono')) return 'courier'
  return 'times'
}

function canvasFontFamilyForGiftCard(fontName?: string | null): string {
  const lower = (fontName || '').toLowerCase()
  if (lower.includes('modern') || lower.includes('sans')) {
    return "'Lexend Deca', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif"
  }
  if (lower.includes('playful') || lower.includes('mono')) {
    return "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
  }
  return "'Playfair Display', Georgia, serif"
}

function columnHeaderLabel(mode: LineItemColumnMode): string {
  if (mode === 'duration') return 'DURATION'
  if (mode === 'amount') return 'AMOUNT'
  return ''
}

function drawPdfTopAccentRule(
  doc: import('jspdf').jsPDF,
  pageWidth: number,
): void {
  doc.setFillColor(...RECEIPT_PALETTE.brandRgb)
  doc.rect(0, 0, pageWidth, 4.5, 'F')
}

function drawPdfStatusPill(
  doc: import('jspdf').jsPDF,
  label: string,
  tone: ReceiptStatusTone,
  rightX: number,
  topY: number,
): number {
  const {
    brandRgb,
    brandTintRgb,
    brandBorderRgb,
    textBodyRgb,
    mutedRgb,
    lineRgb,
    stripeRgb,
  } = RECEIPT_PALETTE

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  const textW = doc.getTextWidth(label.toUpperCase())
  const iconSpace = tone === 'muted' ? 0 : 11
  const pillW = textW + iconSpace + 16
  const pillH = 18
  const pillX = rightX - pillW

  if (tone === 'positive') {
    doc.setFillColor(...brandTintRgb)
    doc.setDrawColor(...brandBorderRgb)
  } else if (tone === 'pending') {
    doc.setFillColor(...stripeRgb)
    doc.setDrawColor(...lineRgb)
  } else {
    doc.setFillColor(244, 244, 245)
    doc.setDrawColor(...lineRgb)
  }
  doc.setLineWidth(0.75)
  doc.roundedRect(pillX, topY, pillW, pillH, 4, 4, 'FD')

  const textColor =
    tone === 'positive' ? brandRgb : tone === 'pending' ? textBodyRgb : mutedRgb

  if (tone === 'positive') {
    const cx = pillX + 10
    const cy = topY + pillH / 2 + 0.5
    doc.setDrawColor(...brandRgb)
    doc.setLineWidth(1.25)
    doc.line(cx - 2.6, cy, cx - 0.6, cy + 2.2)
    doc.line(cx - 0.6, cy + 2.2, cx + 3.1, cy - 2.3)
  } else if (tone === 'pending') {
    doc.setFillColor(...mutedRgb)
    doc.circle(pillX + 10, topY + pillH / 2, 2.2, 'F')
  }

  doc.setTextColor(...textColor)
  doc.text(label.toUpperCase(), rightX - 8, topY + 11.7, { align: 'right' })

  return pillH
}

function drawPdfFooterAllPages(
  doc: import('jspdf').jsPDF,
  footerNote?: string | null,
): void {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 44
  const { brandRgb, mutedRgb, lineRgb } = RECEIPT_PALETTE

  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p)
    const ruleY = pageHeight - 58

    doc.setDrawColor(...lineRgb)
    doc.setLineWidth(0.75)
    doc.line(margin, ruleY, pageWidth - margin, ruleY)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(...brandRgb)
    doc.text('Dermaspace Esthetic & Wellness Centre', margin, ruleY + 14)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.4)
    doc.setTextColor(...mutedRgb)
    doc.text(
      footerNote ||
        '237B Muri Okunola St, Victoria Island  ·  9 Agbeke Rotinwa Cl, Ikoyi',
      margin,
      ruleY + 25,
    )
    doc.text(
      'dermaspaceng.com  ·  hello@dermaspaceng.com  ·  09013134945 / 09061836625',
      margin,
      ruleY + 35,
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.4)
    doc.setTextColor(...mutedRgb)
    doc.text(
      `Verified Electronic Receipt  ·  Page ${p} of ${pageCount}`,
      pageWidth - margin,
      ruleY + 14,
      { align: 'right' },
    )
  }
}

/**
 * Renders and downloads an executive A4 vector PDF receipt anchored in the
 * Dermaspace palette (#7B2D8E + white/plum-gray neutrals). Zero shadows,
 * zero gradients, zero sparkle or zap symbols.
 */
export async function downloadReceiptPdf(
  data: ReceiptDocumentData,
): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 44
  const contentW = pageWidth - margin * 2
  const footerReserve = 70

  const {
    brandRgb: brandPurple,
    brandTintRgb: brandSoft,
    brandBorderRgb: lavenderBorder,
    textDarkRgb: textDark,
    textBodyRgb: textBody,
    mutedRgb: mutedGray,
    lineRgb: lineGray,
    stripeRgb,
  } = RECEIPT_PALETTE

  const ensureSpace = (neededHeight: number, currentY: number): number => {
    if (needsPageBreak(currentY, neededHeight, pageHeight, footerReserve)) {
      doc.addPage()
      drawPdfTopAccentRule(doc, pageWidth)
      return 30
    }
    return currentY
  }

  const { dataUrl: logoDataUrl, aspect: logoAspect } = await loadLogoAssets()

  drawPdfTopAccentRule(doc, pageWidth)

  // 1. Clean White Editorial Letterhead
  const headerTop = 24
  if (logoDataUrl) {
    const logoH = 28
    const logoW = Math.min(logoH * logoAspect, contentW * 0.44)
    doc.addImage(
      logoDataUrl,
      'PNG',
      margin,
      headerTop,
      logoW,
      logoH,
      undefined,
      'FAST',
    )
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(...mutedGray)
    doc.text(
      'Victoria Island & Ikoyi, Lagos  ·  dermaspaceng.com',
      margin,
      headerTop + 42,
    )
  } else {
    doc.setFont('times', 'bold')
    doc.setFontSize(21)
    doc.setTextColor(...brandPurple)
    doc.text('Dermaspace', margin, headerTop + 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(...mutedGray)
    doc.text(
      'Esthetic & Wellness Centre  ·  Victoria Island & Ikoyi, Lagos',
      margin,
      headerTop + 36,
    )
  }

  // Right Letterhead Metadata + Status Tag
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...brandPurple)
  doc.text('OFFICIAL RECEIPT', pageWidth - margin, headerTop + 6, {
    align: 'right',
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...textDark)
  doc.text(data.documentTitle, pageWidth - margin, headerTop + 21, {
    align: 'right',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...mutedGray)
  doc.text(`Issued ${data.issueDate}`, pageWidth - margin, headerTop + 33, {
    align: 'right',
  })

  const statusTone = classifyStatusTone(data.statusLabel)
  drawPdfStatusPill(
    doc,
    data.statusLabel,
    statusTone,
    pageWidth - margin,
    headerTop + 40,
  )

  const headerDividerY = headerTop + 66
  doc.setDrawColor(...lineGray)
  doc.setLineWidth(0.75)
  doc.line(margin, headerDividerY, pageWidth - margin, headerDividerY)

  let y = headerDividerY + 13

  // 2. Executive Summary Band (Amount Paid + Wrapped Reference / Invoice)
  const sumLeftW = contentW * 0.54
  const sumRightW = contentW * 0.46 - 24

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  const pdfMeasureBold95 = (t: string) => doc.getTextWidth(t)
  const refLines = wrapTextLines(data.reference, pdfMeasureBold95, sumRightW)
  const invoiceLines = data.invoiceNumber
    ? wrapTextLines(data.invoiceNumber, pdfMeasureBold95, sumRightW)
    : []

  const leftBlockH = 12 + 24 + (data.paymentMethodLabel ? 13 : 0) + 13
  const rightBlockH =
    12 +
    refLines.length * 11.5 +
    (invoiceLines.length > 0 ? 15 + invoiceLines.length * 11.5 : 0) +
    12
  const summaryBandH = Math.max(60, leftBlockH, rightBlockH)

  doc.setFillColor(...stripeRgb)
  doc.setDrawColor(...lavenderBorder)
  doc.setLineWidth(0.75)
  doc.roundedRect(margin, y, contentW, summaryBandH, 6, 6, 'FD')

  const dividerX = margin + sumLeftW
  doc.setDrawColor(...lineGray)
  doc.setLineWidth(0.6)
  doc.line(dividerX, y + 10, dividerX, y + summaryBandH - 10)

  // Left: Amount + Payment Method
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...mutedGray)
  doc.text(data.amountLabel, margin + 15, y + 17)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19.5)
  doc.setTextColor(...textDark)
  doc.text(data.amountFormatted, margin + 15, y + 38)

  if (data.paymentMethodLabel) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...textBody)
    const methodPrefix = statusTone === 'positive' ? 'Paid via' : 'Method:'
    doc.text(
      `${methodPrefix} ${data.paymentMethodLabel}`,
      margin + 15,
      y + 51,
    )
  }

  // Right: Reference + Invoice Number (never squished)
  let ry = y + 17
  const rx = dividerX + 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...mutedGray)
  doc.text('REFERENCE', rx, ry)
  ry += 11

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.2)
  doc.setTextColor(...brandPurple)
  for (const line of refLines) {
    doc.text(line, rx, ry)
    ry += 11.5
  }

  if (invoiceLines.length > 0) {
    ry += 3
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(...mutedGray)
    doc.text('INVOICE NUMBER', rx, ry)
    ry += 11
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.2)
    doc.setTextColor(...textDark)
    for (const line of invoiceLines) {
      doc.text(line, rx, ry)
      ry += 11.5
    }
  }

  y += summaryBandH + 15

  // 3. Editorial Headline & Subheadline
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...textDark)
  const headlineLines = wrapTextLines(
    data.headline,
    (t) => doc.getTextWidth(t),
    contentW,
  )
  y = ensureSpace(headlineLines.length * 16 + 22, y)
  doc.text(headlineLines, margin, y)
  y += headlineLines.length * 16

  if (data.subheadline) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...textBody)
    const subLines = wrapTextLines(
      data.subheadline,
      (t) => doc.getTextWidth(t),
      contentW,
    )
    doc.text(subLines, margin, y + 1)
    y += subLines.length * 12 + 2
  }
  y += 10

  // 4. Optional Gift Card Specimen & Card Specification
  if (data.giftCardVisual) {
    const gc = data.giftCardVisual
    const visualH = 132
    y = ensureSpace(visualH + 16, y)

    const cardW = 256
    const cardH = visualH
    const specX = margin + cardW + 14
    const specW = contentW - cardW - 14

    const surfaceRgb = hexToRgb(gc.surfaceHex, brandPurple)
    const accentRgb = hexToRgb(gc.accentHex, brandPurple)
    const medallionRgb = hexToRgb(gc.medallionHex, brandPurple)
    const gcFont = pdfFontFamilyForGiftCard(gc.fontName)

    doc.setFillColor(...surfaceRgb)
    doc.roundedRect(margin, y, cardW, cardH, 8, 8, 'F')

    doc.setFillColor(...accentRgb)
    doc.roundedRect(
      margin + cardW * 0.62,
      y + 9,
      cardW * 0.34,
      cardH - 18,
      6,
      6,
      'F',
    )

    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.55)
    doc.roundedRect(margin + 6.5, y + 6.5, cardW - 13, cardH - 13, 5, 5, 'S')

    // Clean Concentric Monogram Medallion ("DS", zero sparkles)
    const medX = margin + cardW - 44
    const medY = y + cardH / 2 + 2
    doc.setFillColor(...medallionRgb)
    doc.setDrawColor(245, 236, 248)
    doc.setLineWidth(0.85)
    doc.circle(medX, medY, 20, 'FD')
    doc.setLineWidth(0.45)
    doc.circle(medX, medY, 15, 'S')

    doc.setFont('times', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(255, 255, 255)
    doc.text('DS', medX, medY + 3.5, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(255, 255, 255)
    doc.text('DERMASPACE', margin + 15, y + 22)
    doc.setFontSize(6.2)
    doc.text('GIFT CARD', margin + cardW - 15, y + 22, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(235, 228, 242)
    doc.text('FOR', margin + 15, y + 43)

    doc.setFont(gcFont, 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    const recipientLines = wrapTextLines(
      gc.recipientName,
      (t) => doc.getTextWidth(t),
      132,
    ).slice(0, 2)
    doc.text(recipientLines, margin + 15, y + 55)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.2)
    doc.setTextColor(235, 228, 242)
    doc.text('VALUE', margin + 15, y + 79)
    doc.setFont(gcFont, 'bold')
    doc.setFontSize(15.5)
    doc.setTextColor(255, 255, 255)
    doc.text(gc.amountFormatted, margin + 15, y + 95)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(245, 238, 250)
    doc.text(gc.editionLabel, margin + 15, y + cardH - 14)
    if (gc.senderName) {
      const fromLines = wrapTextLines(
        `From: ${gc.senderName}`,
        (t) => doc.getTextWidth(t),
        92,
      )
      doc.text(fromLines[0] || '', margin + cardW - 15, y + cardH - 14, {
        align: 'right',
      })
    }

    // Specification Card
    doc.setFillColor(...stripeRgb)
    doc.setDrawColor(...lavenderBorder)
    doc.setLineWidth(0.75)
    doc.roundedRect(specX, y, specW, cardH, 6, 6, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(...brandPurple)
    doc.text('CARD SPECIFICATION', specX + 12, y + 17)
    doc.setDrawColor(...lineGray)
    doc.line(specX + 12, y + 22, specX + specW - 12, y + 22)

    doc.setFillColor(...surfaceRgb)
    doc.rect(specX + 12, y + 30, 11, 10, 'F')
    doc.setFillColor(...accentRgb)
    doc.rect(specX + 23, y + 30, 6, 10, 'F')
    doc.setDrawColor(...lavenderBorder)
    doc.rect(specX + 12, y + 30, 17, 10, 'S')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.2)
    doc.setTextColor(...mutedGray)
    doc.text('STYLE THEME', specX + 35, y + 35)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(...textDark)
    doc.text(gc.designName, specX + 35, y + 44)

    const specItems: Array<[string, string]> = [
      ['EDITION', gc.editionLabel],
      ['TYPOGRAPHY', `${gc.fontName || 'Elegant'} Font`],
      ['VALIDITY', 'VI & Ikoyi · Never Expires'],
    ]
    let sy = y + 63
    for (const [lbl, val] of specItems) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.2)
      doc.setTextColor(...mutedGray)
      doc.text(lbl, specX + 12, sy)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.2)
      doc.setTextColor(...textDark)
      const valLines = wrapTextLines(val, (t) => doc.getTextWidth(t), specW - 24)
      doc.text(valLines[0] || '', specX + 12, sy + 9.5)
      sy += 23
    }

    y += visualH + 14
  }

  // 5. Two-Column Details Ledger (Dynamic Row Heights)
  const colW = contentW / 2
  const cellMaxW = colW - 26
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.8)
  const measuredSummary = measureSummaryPairs(
    data.summaryRows,
    (t) => doc.getTextWidth(t),
    {
      colWidth: cellMaxW,
      labelOffset: 15,
      lineHeight: 11,
      bottomPadding: 6,
      minRowHeight: 30,
    },
  )

  if (measuredSummary.pairs.length > 0) {
    const gridH = measuredSummary.totalHeight + 6
    y = ensureSpace(gridH + 26, y)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(...brandPurple)
    doc.text('RECEIPT DETAILS', margin, y)
    y += 8

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...lineGray)
    doc.setLineWidth(0.75)
    doc.roundedRect(margin, y, contentW, gridH, 6, 6, 'FD')

    // Center vertical hairline
    doc.setDrawColor(...lineGray)
    doc.setLineWidth(0.5)
    doc.line(margin + colW, y + 6, margin + colW, y + gridH - 6)

    let rowY = y + 3
    measuredSummary.pairs.forEach((pair, idx) => {
      if (idx > 0) {
        doc.setDrawColor(242, 239, 246)
        doc.setLineWidth(0.5)
        doc.line(margin + 12, rowY, pageWidth - margin - 12, rowY)
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.3)
      doc.setTextColor(...mutedGray)
      doc.text(pair.left.label.toUpperCase(), margin + 12, rowY + 11)
      if (pair.right) {
        doc.text(pair.right.label.toUpperCase(), margin + colW + 12, rowY + 11)
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.8)
      doc.setTextColor(...textDark)
      pair.left.lines.forEach((line, lIdx) => {
        doc.text(line, margin + 12, rowY + 22 + lIdx * 11)
      })
      if (pair.right) {
        pair.right.lines.forEach((line, lIdx) => {
          doc.text(line, margin + colW + 12, rowY + 22 + lIdx * 11)
        })
      }

      rowY += pair.height
    })

    y += gridH + 13
  }

  // 6. Itemized Breakdown Table (Adaptive Right Column + Dynamic Row Heights)
  if (data.lineItems && data.lineItems.length > 0) {
    const colMode = resolveLineItemColumnMode(data.lineItems)
    const rightHeader = columnHeaderLabel(colMode)
    const rightColReserve = colMode === 'none' ? 20 : 124
    const titleMaxW = contentW - rightColReserve - 20
    const subMaxW = contentW - 36

    const { rows: measuredRows } = measureLineItems(
      data.lineItems,
      (t) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        return doc.getTextWidth(t)
      },
      (t) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        return doc.getTextWidth(t)
      },
      {
        titleMaxWidth: titleMaxW,
        subtitleMaxWidth: subMaxW,
        topPadding: 11,
        titleLineHeight: 13,
        subtitleGap: 3,
        subtitleLineHeight: 11,
        bottomPadding: 10,
        minRowHeight: 36,
      },
    )

    const drawTableHeader = (atY: number): number => {
      doc.setFillColor(...brandSoft)
      doc.setDrawColor(...lavenderBorder)
      doc.setLineWidth(0.6)
      doc.roundedRect(margin, atY, contentW, 22, 4, 4, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.2)
      doc.setTextColor(...brandPurple)
      doc.text('DESCRIPTION', margin + 12, atY + 14)
      if (rightHeader) {
        doc.text(rightHeader, pageWidth - margin - 12, atY + 14, {
          align: 'right',
        })
      }
      return atY + 24
    }

    y = ensureSpace(24 + (measuredRows[0]?.height ?? 36) + 12, y)
    y = drawTableHeader(y)

    measuredRows.forEach((row, idx) => {
      if (needsPageBreak(y, row.height + 10, pageHeight, footerReserve)) {
        doc.addPage()
        drawPdfTopAccentRule(doc, pageWidth)
        y = drawTableHeader(34)
      }

      if (idx % 2 === 1) {
        doc.setFillColor(...stripeRgb)
        doc.rect(margin, y, contentW, row.height, 'F')
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...textDark)
      row.titleLines.forEach((line, lIdx) => {
        doc.text(line, margin + 12, y + 15 + lIdx * 13)
      })

      if (row.amount) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(colMode === 'amount' ? brandPurple[0] : textBody[0], colMode === 'amount' ? brandPurple[1] : textBody[1], colMode === 'amount' ? brandPurple[2] : textBody[2])
        doc.text(row.amount, pageWidth - margin - 12, y + 15, {
          align: 'right',
        })
      }

      if (row.subtitleLines.length > 0) {
        const subStartY = y + 15 + row.titleLines.length * 13 + 1
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...mutedGray)
        row.subtitleLines.forEach((line, sIdx) => {
          doc.text(line, margin + 12, subStartY + sIdx * 11)
        })
      }

      doc.setDrawColor(...lineGray)
      doc.setLineWidth(0.5)
      doc.line(margin, y + row.height, pageWidth - margin, y + row.height)
      y += row.height
    })

    y += 10
  }

  // 7. Subtotal & Voucher Breakdown (Right-aligned accounting column)
  if (data.subtotalFormatted && data.discountFormatted) {
    y = ensureSpace(40, y)
    const labelColX = margin + contentW * 0.52
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.8)
    doc.setTextColor(...mutedGray)
    doc.text('Subtotal', labelColX, y + 10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textDark)
    doc.text(data.subtotalFormatted, pageWidth - margin - 12, y + 10, {
      align: 'right',
    })

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...brandPurple)
    doc.text(data.discountLabel || 'Voucher Discount', labelColX, y + 24)
    doc.setFont('helvetica', 'bold')
    doc.text(data.discountFormatted, pageWidth - margin - 12, y + 24, {
      align: 'right',
    })
    y += 34
  }

  // 8. Clean Solid #7B2D8E Total Summary Bar (No double inset border)
  const totalCardH = 48
  y = ensureSpace(totalCardH + 12, y)

  doc.setFillColor(...brandPurple)
  doc.roundedRect(margin, y, contentW, totalCardH, 6, 6, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.2)
  doc.setTextColor(238, 226, 245)
  doc.text(data.amountLabel, margin + 16, y + 19)

  const subMetaParts = [data.paymentMethodLabel, data.invoiceNumber].filter(Boolean)
  if (subMetaParts.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(245, 236, 250)
    doc.text(subMetaParts.join('  ·  '), margin + 16, y + 34)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17.5)
  doc.setTextColor(255, 255, 255)
  doc.text(data.amountFormatted, pageWidth - margin - 16, y + 30.5, {
    align: 'right',
  })

  y += totalCardH + 12

  // 9. Personal Message / Notes Quote Block
  if (data.note) {
    doc.setFont('times', 'italic')
    doc.setFontSize(9.5)
    const noteLines = wrapTextLines(
      `"${data.note}"`,
      (t) => doc.getTextWidth(t),
      contentW - 32,
    )
    const noteBoxH = noteLines.length * 12 + 24
    y = ensureSpace(noteBoxH + 10, y)

    doc.setFillColor(...stripeRgb)
    doc.setDrawColor(...lavenderBorder)
    doc.setLineWidth(0.75)
    doc.roundedRect(margin, y, contentW, noteBoxH, 6, 6, 'FD')

    doc.setFillColor(...brandPurple)
    doc.rect(margin, y + 5, 3, noteBoxH - 10, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(...brandPurple)
    doc.text(data.noteTitle || 'PERSONAL MESSAGE', margin + 14, y + 15)

    doc.setFont('times', 'italic')
    doc.setFontSize(9.5)
    doc.setTextColor(...textBody)
    noteLines.forEach((line, idx) => {
      doc.text(line, margin + 14, y + 28 + idx * 12)
    })
    y += noteBoxH + 10
  }

  // Stamp clean editorial footer on every page
  drawPdfFooterAllPages(doc, data.footerNote)

  doc.save(data.filename)
  return data.filename
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

function drawCanvasStatusBadge(
  ctx: CanvasRenderingContext2D,
  label: string,
  tone: ReceiptStatusTone,
  rightX: number,
  topY: number,
  sansFont: string,
): void {
  const display = label.toUpperCase()
  ctx.font = `700 9.5px ${sansFont}`
  const textW = ctx.measureText(display).width
  const iconSpace = tone === 'muted' ? 0 : 14
  const badgeW = textW + iconSpace + 20
  const badgeH = 24
  const badgeX = rightX - badgeW

  drawRoundedRectPath(ctx, badgeX, topY, badgeW, badgeH, 6)
  if (tone === 'positive') {
    ctx.fillStyle = '#F7F2FA'
    ctx.strokeStyle = '#DAC6E5'
  } else if (tone === 'pending') {
    ctx.fillStyle = '#FBF9FD'
    ctx.strokeStyle = '#E4E4E7'
  } else {
    ctx.fillStyle = '#F4F4F5'
    ctx.strokeStyle = '#E4E4E7'
  }
  ctx.lineWidth = 1
  ctx.fill()
  ctx.stroke()

  if (tone === 'positive') {
    const cx = badgeX + 13
    const cy = topY + badgeH / 2 + 0.5
    ctx.strokeStyle = '#7B2D8E'
    ctx.lineWidth = 1.6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 3.5, cy)
    ctx.lineTo(cx - 1, cy + 2.8)
    ctx.lineTo(cx + 4, cy - 3)
    ctx.stroke()
    ctx.lineCap = 'butt'
  } else if (tone === 'pending') {
    ctx.fillStyle = '#71717A'
    ctx.beginPath()
    ctx.arc(badgeX + 12, topY + badgeH / 2, 2.8, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle =
    tone === 'positive' ? '#7B2D8E' : tone === 'pending' ? '#3F3F46' : '#71717A'
  ctx.textAlign = 'right'
  ctx.fillText(display, rightX - 10, topY + 15.5)
  ctx.textAlign = 'left'
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
 * Generates and downloads a crisp 3x Hi-DPI PNG receipt image matching the
 * single-color (#7B2D8E + white/plum-gray) Dermaspace editorial receipt layout.
 * Zero shadows, zero gradients, zero sparkle or zap icons, zero text squishing.
 */
export async function downloadReceiptImage(
  data: ReceiptDocumentData,
): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      // Proceed cleanly with system fallback stack
    }
  }

  const scale = 3
  const width = 600
  const cardMargin = 20
  const cardX = cardMargin
  const cardW = width - cardMargin * 2
  const padX = 30
  const innerX = cardX + padX
  const innerW = cardW - padX * 2

  const brandHex = RECEIPT_PALETTE.brandHex
  const tintBg = '#F7F2FA'
  const stripeBg = '#FBF9FD'
  const outerBg = '#F7F5F9'
  const brandBorder = '#DAC6E5'
  const lineHex = '#E4E4E7'
  const rowDividerHex = '#F1EEF4'
  const textDark = '#18181B'
  const textBody = '#3F3F46'
  const textMuted = '#71717A'

  const sansFont =
    "'Lexend Deca', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  const serifFont = "'Playfair Display', Georgia, serif"

  const { bitmap: logoBitmap } = await loadLogoAssets()

  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')!
  const measureWithFont = (font: string) => (text: string) => {
    mctx.font = font
    return mctx.measureText(text).width
  }

  // Measure Executive Summary Band
  const sumLeftW = innerW * 0.54
  const sumRightW = innerW * 0.46 - 24
  const refFont = `700 12px ${sansFont}`
  const refLines = wrapTextLines(
    data.reference,
    measureWithFont(refFont),
    sumRightW,
  )
  const invoiceLines = data.invoiceNumber
    ? wrapTextLines(
        data.invoiceNumber,
        measureWithFont(refFont),
        sumRightW,
      )
    : []
  const sumLeftH = 18 + 32 + (data.paymentMethodLabel ? 18 : 0) + 18
  const sumRightH =
    18 +
    refLines.length * 16 +
    (invoiceLines.length > 0 ? 22 + invoiceLines.length * 16 : 0) +
    18
  const summaryBandH = Math.max(84, sumLeftH, sumRightH)

  // Measure Headline & Subheadline
  const headlineLines = wrapTextLines(
    data.headline,
    measureWithFont(`700 18px ${sansFont}`),
    innerW,
  )
  const subLines = data.subheadline
    ? wrapTextLines(
        data.subheadline,
        measureWithFont(`400 12.5px ${sansFont}`),
        innerW,
      )
    : []
  const headlineBlockH =
    headlineLines.length * 24 +
    (subLines.length > 0 ? 4 + subLines.length * 18 : 0)

  // Measure Optional Gift Card Specimen
  const giftVisualH = data.giftCardVisual ? 174 : 0

  // Measure Details Ledger
  const detailColW = innerW / 2
  const detailValueMaxW = detailColW - 28
  const measuredDetails = measureSummaryPairs(
    data.summaryRows,
    measureWithFont(`600 12px ${sansFont}`),
    {
      colWidth: detailValueMaxW,
      labelOffset: 22,
      lineHeight: 16,
      bottomPadding: 11,
      minRowHeight: 46,
    },
  )
  const detailsSectionH =
    measuredDetails.pairs.length > 0 ? 18 + measuredDetails.totalHeight + 8 : 0

  // Measure Line Items Table
  const lineItems = data.lineItems ?? []
  const colMode = resolveLineItemColumnMode(lineItems)
  const rightColReserve = colMode === 'none' ? 24 : 140
  const measuredItems =
    lineItems.length > 0
      ? measureLineItems(
          lineItems,
          measureWithFont(`600 12.5px ${sansFont}`),
          measureWithFont(`400 10.5px ${sansFont}`),
          {
            titleMaxWidth: innerW - rightColReserve - 24,
            subtitleMaxWidth: innerW - 36,
            topPadding: 13,
            titleLineHeight: 17,
            subtitleGap: 4,
            subtitleLineHeight: 14,
            bottomPadding: 12,
            minRowHeight: 46,
          },
        )
      : { rows: [], totalHeight: 0 }
  const itemsSectionH =
    measuredItems.rows.length > 0 ? 30 + measuredItems.totalHeight : 0

  // Measure Discount, Total Bar, Note & Footer
  const discountH = data.subtotalFormatted && data.discountFormatted ? 48 : 0
  const totalBarH = 68
  const noteLines = data.note
    ? wrapTextLines(
        `"${data.note}"`,
        measureWithFont(`italic 12.5px ${serifFont}`),
        innerW - 34,
      )
    : []
  const noteSectionH = data.note ? noteLines.length * 18 + 38 : 0

  const topAccentH = 5
  const letterheadH = 92
  const footerH = 74

  const cardH =
    topAccentH +
    22 +
    letterheadH +
    18 +
    summaryBandH +
    22 +
    headlineBlockH +
    (giftVisualH > 0 ? 18 + giftVisualH : 0) +
    (detailsSectionH > 0 ? 20 + detailsSectionH : 0) +
    (itemsSectionH > 0 ? 20 + itemsSectionH : 0) +
    (discountH > 0 ? 14 + discountH : 0) +
    16 +
    totalBarH +
    (noteSectionH > 0 ? 18 + noteSectionH : 0) +
    22 +
    footerH +
    22

  const totalHeight = cardMargin * 2 + cardH

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = totalHeight * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  // Outer neutral paper background
  ctx.fillStyle = outerBg
  ctx.fillRect(0, 0, width, totalHeight)

  // Crisp flat receipt sheet (zero shadow)
  drawRoundedRectPath(ctx, cardX, cardMargin, cardW, cardH, 12)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = brandBorder
  ctx.stroke()

  ctx.save()
  drawRoundedRectPath(ctx, cardX, cardMargin, cardW, cardH, 12)
  ctx.clip()

  let y = cardMargin

  // 1. Solid Top Brand Rule
  ctx.fillStyle = brandHex
  ctx.fillRect(cardX, y, cardW, topAccentH)
  y += topAccentH + 22

  // 2. White Editorial Letterhead
  if (logoBitmap) {
    const logoH = 36
    const logoW = Math.min(logoH * (logoBitmap.width / logoBitmap.height), innerW * 0.48)
    ctx.drawImage(logoBitmap, innerX, y + 4, logoW, logoH)
    ctx.fillStyle = textMuted
    ctx.font = `400 10px ${sansFont}`
    ctx.fillText(
      'Victoria Island & Ikoyi, Lagos  ·  dermaspaceng.com',
      innerX,
      y + 56,
    )
  } else {
    ctx.fillStyle = brandHex
    ctx.font = `700 24px ${serifFont}`
    ctx.fillText('Dermaspace', innerX, y + 26)
    ctx.fillStyle = textMuted
    ctx.font = `400 10px ${sansFont}`
    ctx.fillText(
      'Esthetic & Wellness Centre  ·  Lagos',
      innerX,
      y + 48,
    )
  }

  ctx.textAlign = 'right'
  ctx.fillStyle = brandHex
  ctx.font = `700 9.5px ${sansFont}`
  ctx.fillText('OFFICIAL RECEIPT', innerX + innerW, y + 10)
  ctx.fillStyle = textDark
  ctx.font = `700 15px ${sansFont}`
  ctx.fillText(data.documentTitle, innerX + innerW, y + 30)
  ctx.fillStyle = textMuted
  ctx.font = `400 10.5px ${sansFont}`
  ctx.fillText(`Issued ${data.issueDate}`, innerX + innerW, y + 47)
  ctx.textAlign = 'left'

  const statusTone = classifyStatusTone(data.statusLabel)
  drawCanvasStatusBadge(
    ctx,
    data.statusLabel,
    statusTone,
    innerX + innerW,
    y + 56,
    sansFont,
  )

  const headerRuleY = y + letterheadH
  ctx.strokeStyle = lineHex
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(innerX, headerRuleY)
  ctx.lineTo(innerX + innerW, headerRuleY)
  ctx.stroke()
  y = headerRuleY + 18

  // 3. Executive Summary Band
  drawRoundedRectPath(ctx, innerX, y, innerW, summaryBandH, 8)
  ctx.fillStyle = stripeBg
  ctx.fill()
  ctx.strokeStyle = brandBorder
  ctx.lineWidth = 1
  ctx.stroke()

  const dividerX = innerX + sumLeftW
  ctx.strokeStyle = lineHex
  ctx.beginPath()
  ctx.moveTo(dividerX, y + 14)
  ctx.lineTo(dividerX, y + summaryBandH - 14)
  ctx.stroke()

  ctx.fillStyle = textMuted
  ctx.font = `700 9px ${sansFont}`
  ctx.fillText(data.amountLabel, innerX + 18, y + 24)
  ctx.fillStyle = textDark
  ctx.font = `700 25px ${sansFont}`
  ctx.fillText(data.amountFormatted, innerX + 18, y + 54)
  if (data.paymentMethodLabel) {
    ctx.fillStyle = textBody
    ctx.font = `400 10.5px ${sansFont}`
    const methodPrefix = statusTone === 'positive' ? 'Paid via' : 'Method:'
    ctx.fillText(`${methodPrefix} ${data.paymentMethodLabel}`, innerX + 18, y + 72)
  }

  let ry = y + 24
  const rx = dividerX + 16
  ctx.fillStyle = textMuted
  ctx.font = `700 8.5px ${sansFont}`
  ctx.fillText('REFERENCE', rx, ry)
  ry += 16
  ctx.fillStyle = brandHex
  ctx.font = refFont
  for (const line of refLines) {
    ctx.fillText(line, rx, ry)
    ry += 16
  }
  if (invoiceLines.length > 0) {
    ry += 6
    ctx.fillStyle = textMuted
    ctx.font = `700 8.5px ${sansFont}`
    ctx.fillText('INVOICE NUMBER', rx, ry)
    ry += 16
    ctx.fillStyle = textDark
    ctx.font = refFont
    for (const line of invoiceLines) {
      ctx.fillText(line, rx, ry)
      ry += 16
    }
  }

  y += summaryBandH + 22

  // 4. Headline & Subheadline
  ctx.fillStyle = textDark
  ctx.font = `700 18px ${sansFont}`
  for (const line of headlineLines) {
    ctx.fillText(line, innerX, y + 16)
    y += 24
  }
  if (subLines.length > 0) {
    y += 4
    ctx.fillStyle = textBody
    ctx.font = `400 12.5px ${sansFont}`
    for (const line of subLines) {
      ctx.fillText(line, innerX, y + 13)
      y += 18
    }
  }

  // 5. Optional Gift Card Specimen & Specification
  if (data.giftCardVisual) {
    y += 18
    const gc = data.giftCardVisual
    const gcCardW = 290
    const gcCardH = giftVisualH
    const specX = innerX + gcCardW + 14
    const specW = innerW - gcCardW - 14
    const gcFont = canvasFontFamilyForGiftCard(gc.fontName)

    drawRoundedRectPath(ctx, innerX, y, gcCardW, gcCardH, 10)
    ctx.fillStyle = gc.surfaceHex || brandHex
    ctx.fill()

    drawRoundedRectPath(
      ctx,
      innerX + gcCardW * 0.62,
      y + 12,
      gcCardW * 0.33,
      gcCardH - 24,
      8,
    )
    ctx.fillStyle = gc.accentHex || brandHex
    ctx.fill()

    drawRoundedRectPath(ctx, innerX + 8, y + 8, gcCardW - 16, gcCardH - 16, 7)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Concentric Monogram Medallion ("DS", zero sparkles)
    const medX = innerX + gcCardW - 49
    const medY = y + gcCardH / 2 + 2
    ctx.beginPath()
    ctx.arc(medX, medY, 22, 0, Math.PI * 2)
    ctx.fillStyle = gc.medallionHex || brandHex
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 1.1
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(medX, medY, 16.5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 0.8
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 12.5px ${serifFont}`
    ctx.fillText('DS', medX, medY + 4.5)
    ctx.textAlign = 'left'

    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 10px ${sansFont}`
    ctx.fillText('DERMASPACE', innerX + 18, y + 29)
    ctx.textAlign = 'right'
    ctx.font = `700 8px ${sansFont}`
    ctx.fillText('GIFT CARD', innerX + gcCardW - 18, y + 29)
    ctx.textAlign = 'left'

    ctx.fillStyle = 'rgba(245,238,250,0.85)'
    ctx.font = `400 8.5px ${sansFont}`
    ctx.fillText('FOR', innerX + 18, y + 54)
    ctx.fillStyle = '#FFFFFF'
    const recLines = wrapTextLines(
      gc.recipientName,
      measureWithFont(`700 13.5px ${gcFont}`),
      142,
    ).slice(0, 2)
    ctx.font = `700 13.5px ${gcFont}`
    recLines.forEach((line, idx) => {
      ctx.fillText(line, innerX + 18, y + 71 + idx * 17)
    })

    ctx.fillStyle = 'rgba(245,238,250,0.85)'
    ctx.font = `700 8px ${sansFont}`
    ctx.fillText('VALUE', innerX + 18, y + 106)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 19px ${gcFont}`
    ctx.fillText(gc.amountFormatted, innerX + 18, y + 127)

    ctx.fillStyle = 'rgba(245,238,250,0.92)'
    ctx.font = `400 9.5px ${sansFont}`
    ctx.fillText(gc.editionLabel, innerX + 18, y + gcCardH - 18)
    if (gc.senderName) {
      const fromText = wrapTextLines(
        `From: ${gc.senderName}`,
        measureWithFont(`400 9px ${sansFont}`),
        112,
      )[0]
      ctx.textAlign = 'right'
      ctx.font = `400 9px ${sansFont}`
      ctx.fillText(fromText || '', innerX + gcCardW - 18, y + gcCardH - 18)
      ctx.textAlign = 'left'
    }

    // Card Specification Card
    drawRoundedRectPath(ctx, specX, y, specW, gcCardH, 8)
    ctx.fillStyle = stripeBg
    ctx.fill()
    ctx.strokeStyle = brandBorder
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = brandHex
    ctx.font = `700 8.5px ${sansFont}`
    ctx.fillText('CARD SPECIFICATION', specX + 14, y + 22)
    ctx.strokeStyle = lineHex
    ctx.beginPath()
    ctx.moveTo(specX + 14, y + 30)
    ctx.lineTo(specX + specW - 14, y + 30)
    ctx.stroke()

    ctx.fillStyle = gc.surfaceHex || brandHex
    ctx.fillRect(specX + 14, y + 41, 13, 13)
    ctx.fillStyle = gc.accentHex || brandHex
    ctx.fillRect(specX + 27, y + 41, 7, 13)
    ctx.strokeStyle = brandBorder
    ctx.strokeRect(specX + 14, y + 41, 20, 13)

    ctx.fillStyle = textMuted
    ctx.font = `600 8px ${sansFont}`
    ctx.fillText('STYLE THEME', specX + 42, y + 47)
    ctx.fillStyle = textDark
    ctx.font = `700 10.5px ${sansFont}`
    const styleLine = wrapTextLines(
      gc.designName,
      measureWithFont(`700 10.5px ${sansFont}`),
      specW - 54,
    )[0]
    ctx.fillText(styleLine || '', specX + 42, y + 59)

    const specItems: Array<[string, string]> = [
      ['EDITION', gc.editionLabel],
      ['TYPOGRAPHY', `${gc.fontName || 'Elegant'} Font`],
      ['VALIDITY', 'VI & Ikoyi · Never Expires'],
    ]
    let sy = y + 83
    for (const [lbl, val] of specItems) {
      ctx.fillStyle = textMuted
      ctx.font = `600 8px ${sansFont}`
      ctx.fillText(lbl, specX + 14, sy)
      ctx.fillStyle = textDark
      ctx.font = `700 10.5px ${sansFont}`
      const vLine = wrapTextLines(
        val,
        measureWithFont(`700 10.5px ${sansFont}`),
        specW - 28,
      )[0]
      ctx.fillText(vLine || '', specX + 14, sy + 13)
      sy += 31
    }

    y += gcCardH
  }

  // 6. Receipt Details Ledger
  if (measuredDetails.pairs.length > 0) {
    y += 20
    ctx.fillStyle = brandHex
    ctx.font = `700 9.5px ${sansFont}`
    ctx.fillText('RECEIPT DETAILS', innerX, y + 10)
    y += 18

    const gridH = measuredDetails.totalHeight + 8
    drawRoundedRectPath(ctx, innerX, y, innerW, gridH, 8)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.strokeStyle = lineHex
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.strokeStyle = lineHex
    ctx.beginPath()
    ctx.moveTo(innerX + detailColW, y + 8)
    ctx.lineTo(innerX + detailColW, y + gridH - 8)
    ctx.stroke()

    let rowY = y + 4
    measuredDetails.pairs.forEach((pair, idx) => {
      if (idx > 0) {
        ctx.strokeStyle = rowDividerHex
        ctx.beginPath()
        ctx.moveTo(innerX + 14, rowY)
        ctx.lineTo(innerX + innerW - 14, rowY)
        ctx.stroke()
      }

      ctx.fillStyle = textMuted
      ctx.font = `700 8.5px ${sansFont}`
      ctx.fillText(pair.left.label.toUpperCase(), innerX + 14, rowY + 16)
      if (pair.right) {
        ctx.fillText(
          pair.right.label.toUpperCase(),
          innerX + detailColW + 14,
          rowY + 16,
        )
      }

      ctx.fillStyle = textDark
      ctx.font = `600 12px ${sansFont}`
      pair.left.lines.forEach((line, lIdx) => {
        ctx.fillText(line, innerX + 14, rowY + 32 + lIdx * 16)
      })
      if (pair.right) {
        pair.right.lines.forEach((line, lIdx) => {
          ctx.fillText(line, innerX + detailColW + 14, rowY + 32 + lIdx * 16)
        })
      }

      rowY += pair.height
    })

    y += gridH
  }

  // 7. Itemized Breakdown Table
  if (measuredItems.rows.length > 0) {
    y += 20
    const rightHeader = columnHeaderLabel(colMode)
    drawRoundedRectPath(ctx, innerX, y, innerW, 28, 6)
    ctx.fillStyle = tintBg
    ctx.fill()
    ctx.strokeStyle = brandBorder
    ctx.lineWidth = 0.8
    ctx.stroke()

    ctx.fillStyle = brandHex
    ctx.font = `700 9px ${sansFont}`
    ctx.fillText('DESCRIPTION', innerX + 14, y + 17.5)
    if (rightHeader) {
      ctx.textAlign = 'right'
      ctx.fillText(rightHeader, innerX + innerW - 14, y + 17.5)
      ctx.textAlign = 'left'
    }
    y += 30

    measuredItems.rows.forEach((row, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = stripeBg
        ctx.fillRect(innerX, y, innerW, row.height)
      }

      ctx.fillStyle = textDark
      ctx.font = `600 12.5px ${sansFont}`
      row.titleLines.forEach((line, lIdx) => {
        ctx.fillText(line, innerX + 14, y + 19 + lIdx * 17)
      })

      if (row.amount) {
        ctx.textAlign = 'right'
        ctx.fillStyle = colMode === 'amount' ? brandHex : textBody
        ctx.font = `700 12.5px ${sansFont}`
        ctx.fillText(row.amount, innerX + innerW - 14, y + 19)
        ctx.textAlign = 'left'
      }

      if (row.subtitleLines.length > 0) {
        const subY = y + 19 + row.titleLines.length * 17 + 2
        ctx.fillStyle = textMuted
        ctx.font = `400 10.5px ${sansFont}`
        row.subtitleLines.forEach((line, sIdx) => {
          ctx.fillText(line, innerX + 14, subY + sIdx * 14)
        })
      }

      ctx.strokeStyle = lineHex
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(innerX, y + row.height)
      ctx.lineTo(innerX + innerW, y + row.height)
      ctx.stroke()

      y += row.height
    })
  }

  // 8. Subtotal & Voucher Discount
  if (data.subtotalFormatted && data.discountFormatted) {
    y += 14
    const labelColX = innerX + innerW * 0.48
    ctx.fillStyle = textMuted
    ctx.font = `400 11.5px ${sansFont}`
    ctx.fillText('Subtotal', labelColX, y + 13)
    ctx.textAlign = 'right'
    ctx.fillStyle = textDark
    ctx.font = `600 11.5px ${sansFont}`
    ctx.fillText(data.subtotalFormatted, innerX + innerW - 14, y + 13)
    ctx.textAlign = 'left'

    ctx.fillStyle = brandHex
    ctx.font = `400 11.5px ${sansFont}`
    ctx.fillText(data.discountLabel || 'Voucher Discount', labelColX, y + 33)
    ctx.textAlign = 'right'
    ctx.font = `700 11.5px ${sansFont}`
    ctx.fillText(data.discountFormatted, innerX + innerW - 14, y + 33)
    ctx.textAlign = 'left'

    y += 48
  }

  // 9. Clean Solid #7B2D8E Total Paid Bar
  y += 16
  drawRoundedRectPath(ctx, innerX, y, innerW, totalBarH, 8)
  ctx.fillStyle = brandHex
  ctx.fill()

  ctx.fillStyle = '#EFE3F5'
  ctx.font = `700 9.5px ${sansFont}`
  ctx.fillText(data.amountLabel, innerX + 18, y + 26)

  const subMetaParts = [data.paymentMethodLabel, data.invoiceNumber].filter(Boolean)
  if (subMetaParts.length > 0) {
    ctx.fillStyle = '#F7F2FA'
    ctx.font = `400 10.5px ${sansFont}`
    ctx.fillText(subMetaParts.join('  ·  '), innerX + 18, y + 46)
  }

  ctx.textAlign = 'right'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 22px ${sansFont}`
  ctx.fillText(data.amountFormatted, innerX + innerW - 18, y + 42)
  ctx.textAlign = 'left'
  y += totalBarH

  // 10. Personal Message / Notes Quote Box
  if (data.note) {
    y += 18
    drawRoundedRectPath(ctx, innerX, y, innerW, noteSectionH, 8)
    ctx.fillStyle = stripeBg
    ctx.fill()
    ctx.strokeStyle = brandBorder
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = brandHex
    ctx.fillRect(innerX, y + 7, 4, noteSectionH - 14)

    ctx.fillStyle = brandHex
    ctx.font = `700 9px ${sansFont}`
    ctx.fillText(data.noteTitle || 'PERSONAL MESSAGE', innerX + 16, y + 22)

    ctx.fillStyle = textBody
    ctx.font = `italic 12.5px ${serifFont}`
    noteLines.forEach((line, idx) => {
      ctx.fillText(line, innerX + 16, y + 41 + idx * 18)
    })

    y += noteSectionH
  }

  // 11. Editorial Footer
  y += 22
  ctx.strokeStyle = lineHex
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(innerX, y)
  ctx.lineTo(innerX + innerW, y)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = brandHex
  ctx.font = `700 11px ${sansFont}`
  ctx.fillText(
    'Dermaspace Esthetic & Wellness Centre',
    width / 2,
    y + 22,
  )
  ctx.fillStyle = textMuted
  ctx.font = `400 9.5px ${sansFont}`
  ctx.fillText(
    data.footerNote ||
      '237B Muri Okunola St, Victoria Island  ·  9 Agbeke Rotinwa Cl, Ikoyi',
    width / 2,
    y + 39,
  )
  ctx.fillText(
    'dermaspaceng.com  ·  hello@dermaspaceng.com  ·  09013134945 / 09061836625',
    width / 2,
    y + 54,
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
