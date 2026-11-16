import {
  findGiftCardDesignById,
  getDesignMedallionHex,
  getGiftCardOccasionMeta,
} from './gift-card-templates'
import {
  classifyStatusTone,
  measureLedgerRows,
  measureLineItems,
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
  atelierBorderRgb: [234, 224, 242] as [number, number, number],
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
  headline?: string | null
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
  let headline: string | null = tx.giftCard ? null : title

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
        label: 'Occasion',
        value: tx.giftCard.occasion,
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
    headline = null
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
  }

  return {
    documentTitle: 'TRANSACTION RECEIPT',
    statusLabel: statusDisplay(tx.status),
    reference: ref,
    invoiceNumber: invoiceNo,
    issueDate: formatReceiptDate(tx.created_at),
    headline,
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
      label: 'Occasion',
      value: input.occasion,
    },
    ...(input.deliveryMethod
      ? [
          {
            label: 'Delivery',
            value: input.deliveryDate
              ? `${input.deliveryMethod} (${input.deliveryDate})`
              : input.deliveryMethod,
          },
        ]
      : []),
    ...(input.invoiceNumber
      ? [{ label: 'Invoice Number', value: input.invoiceNumber }]
      : []),
  ]

  return {
    documentTitle: 'GIFT CARD RECEIPT',
    statusLabel: 'Confirmed',
    reference: ref,
    invoiceNumber: input.invoiceNumber ?? null,
    issueDate: formatReceiptDate(input.issuedAt),
    headline: null,
    amountFormatted: amountText,
    amountLabel: 'TOTAL PAID',
    paymentMethodLabel: input.paymentMethod || undefined,
    summaryRows,
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
    { label: 'Client', value: booking.customer_name },
    { label: 'Date', value: dateLabel },
    { label: 'Time', value: booking.appointment_time },
    { label: 'Duration', value: `${booking.total_duration} minutes` },
    { label: 'Location', value: booking.location_name },
    ...(booking.location_address
      ? [{ label: 'Branch Address', value: booking.location_address }]
      : []),
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
    headline: null,
    subheadline: null,
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
      subtitle: 'Loyalty points credited to your account',
      amount: `+${pointsFormatted}`,
    },
  ]

  if (!input.siteWideOnly && input.walletCredit > 0) {
    lineItems.push({
      title: 'Credited to Wallet',
      subtitle: 'Available for spa bookings and treatments',
      amount: formatNairaPlain(input.walletCredit, 'NGN'),
    })
  }

  return {
    documentTitle: 'MEMBERSHIP RECEIPT',
    statusLabel: input.txStatus === 'completed' ? 'Paid' : input.txStatus,
    reference: input.reference,
    invoiceNumber: input.invoiceNumber,
    issueDate: formatReceiptDate(input.txCreatedAt),
    headline: `${input.planName} Membership`,
    subheadline: null,
    amountFormatted: planPriceFormatted,
    amountLabel: 'AMOUNT PAID',
    paymentMethodLabel: input.paymentMethod,
    summaryRows: [
      {
        label: 'Member',
        value: `${input.buyerFirstName} ${input.buyerLastName}`.trim(),
      },
      { label: 'Email', value: input.buyerEmail },
      {
        label: 'Starts',
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

function resolveSiteFonts(): { sansFont: string; serifFont: string } {
  const fallbackSans =
    "'Lexend Deca', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  const fallbackSerif = "'Playfair Display', Georgia, serif"
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { sansFont: fallbackSans, serifFont: fallbackSerif }
  }
  const rootStyle = getComputedStyle(document.documentElement)
  const bodyStyle = document.body ? getComputedStyle(document.body) : null
  const lexend = rootStyle.getPropertyValue('--font-lexend').trim()
  const poppins = rootStyle.getPropertyValue('--font-poppins').trim()
  const playfair = rootStyle.getPropertyValue('--font-playfair').trim()
  const bodyFamily = bodyStyle?.fontFamily?.trim()

  const sansParts = [lexend, poppins, bodyFamily, fallbackSans].filter(Boolean)
  const serifParts = [playfair, fallbackSerif].filter(Boolean)
  return {
    sansFont: sansParts.join(', '),
    serifFont: serifParts.join(', '),
  }
}

async function ensureSiteFontsLoaded(
  sansFont: string,
  serifFont: string,
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  try {
    await document.fonts.ready
    await Promise.allSettled([
      document.fonts.load(`400 12px ${sansFont}`),
      document.fonts.load(`600 12px ${sansFont}`),
      document.fonts.load(`700 14px ${sansFont}`),
      document.fonts.load(`700 32px ${serifFont}`),
      document.fonts.load(`italic 14px ${serifFont}`),
    ])
  } catch {
    // Graceful fallback if font loading fails
  }
}

function canvasFontFamilyForGiftCard(
  fontName: string | null | undefined,
  siteFonts: { sansFont: string; serifFont: string },
): string {
  const lower = (fontName || '').toLowerCase()
  if (lower.includes('modern') || lower.includes('sans')) {
    return siteFonts.sansFont
  }
  if (lower.includes('playful') || lower.includes('mono')) {
    return "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
  }
  return siteFonts.serifFont
}

function columnHeaderLabel(mode: LineItemColumnMode): string {
  if (mode === 'duration') return 'DURATION'
  if (mode === 'amount') return 'AMOUNT'
  return ''
}

function formatDocTitleDisplay(title: string): string {
  const cleaned = (title || 'Transaction Receipt').trim().toLowerCase()
  return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function formatCompactHeaderRef(
  ref: string,
  measureWidth: (text: string) => number,
  maxWidth: number,
): string {
  const prefix = `Ref: ${ref}`
  if (measureWidth(prefix) <= maxWidth) return prefix
  const wrapped = wrapTextLines(prefix, measureWidth, maxWidth)
  if (wrapped.length === 1) return wrapped[0]
  return `${wrapped[0].replace(/[.\s]+$/, '')}...`
}

function drawPdfPageBackdropAndWatermark(
  doc: import('jspdf').jsPDF,
  opts: {
    pageWidth: number
    pageHeight: number
    cardX: number
    cardY: number
    cardW: number
    cardH: number
    scallopTop: boolean
    scallopBottom: boolean
  },
): void {
  const { pageWidth, pageHeight, cardX, cardY, cardW, cardH } = opts
  // Serene spa mist page backdrop (#EEE8F4)
  doc.setFillColor(238, 232, 244)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Seamless pure white stationery slip
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(cardX, cardY, cardW, cardH, 10, 10, 'F')

  // Inner letterpress atelier hairline frame clear of scalloped perforations
  doc.setDrawColor(...RECEIPT_PALETTE.atelierBorderRgb)
  doc.setLineWidth(0.65)
  doc.roundedRect(cardX + 12, cardY + 13, cardW - 24, cardH - 26, 6, 6, 'S')

  // Subtle top brand accent hairline inside atelier frame
  doc.setFillColor(...RECEIPT_PALETTE.brandRgb)
  doc.rect(cardX + 26, cardY + 13, cardW - 52, 1.8, 'F')

  // Uniform boutique paper scallops along top and/or bottom flat edges
  const drawEdgeScallops = (edgeY: number) => {
    const inset = 22
    const span = cardW - inset * 2
    const step = 16
    const count = Math.floor(span / step)
    if (count <= 0) return
    const startX = cardX + (cardW - (count - 1) * step) / 2
    doc.setFillColor(238, 232, 244)
    for (let i = 0; i < count; i += 1) {
      doc.circle(startX + i * step, edgeY, 4.2, 'F')
    }
  }
  if (opts.scallopTop) drawEdgeScallops(cardY)
  if (opts.scallopBottom) drawEdgeScallops(cardY + cardH)

  // Whisper-subtle diagonal Dermaspace anti-tamper watermark behind content
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(14.5)
  doc.setTextColor(248, 244, 251)
  const cols = [cardX + 80, cardX + cardW * 0.5, cardX + cardW - 80]
  for (let rowIdx = 0; rowIdx < 6; rowIdx += 1) {
    const wy = cardY + 115 + rowIdx * 118
    if (wy > cardY + cardH - 80) break
    cols.forEach((wx, colIdx) => {
      if ((rowIdx + colIdx) % 2 === 0) {
        doc.text('Dermaspace', wx, wy, { align: 'center', angle: 20 })
      }
    })
  }
}

function drawPdfDashedRule(
  doc: import('jspdf').jsPDF,
  x1: number,
  y: number,
  x2: number,
): void {
  doc.setDrawColor(...RECEIPT_PALETTE.brandBorderRgb)
  doc.setLineWidth(0.75)
  const pdfWithDash = doc as import('jspdf').jsPDF & {
    setLineDashPattern?: (dashArray: number[], dashPhase: number) => void
  }
  if (typeof pdfWithDash.setLineDashPattern === 'function') {
    pdfWithDash.setLineDashPattern([4, 3], 0)
    doc.line(x1, y, x2, y)
    pdfWithDash.setLineDashPattern([], 0)
  } else {
    doc.line(x1, y, x2, y)
  }
}

/**
 * Draws a minimalist 3-petal spa botanical lotus blossom between horizontal
 * hairlines using pure organic Bezier curves (zero 4-point star/sparkle geometry).
 */
function drawPdfBotanicalDivider(
  doc: import('jspdf').jsPDF,
  x1: number,
  x2: number,
  cy: number,
): void {
  const cx = (x1 + x2) / 2
  const gapHalf = 16

  doc.setDrawColor(...RECEIPT_PALETTE.brandBorderRgb)
  doc.setLineWidth(0.6)
  doc.line(x1, cy, cx - gapHalf, cy)
  doc.line(cx + gapHalf, cy, x2, cy)

  doc.setDrawColor(...RECEIPT_PALETTE.brandRgb)
  doc.setLineWidth(0.85)
  // Center upright lotus petal
  doc.lines(
    [
      [-3.8, -3, -3.2, -8, 0, -11.5],
      [3.2, 3.5, 3.8, 8.5, 0, 11.5],
    ],
    cx,
    cy + 4.5,
    [1, 1],
    'S',
  )
  // Left cradling lotus petal
  doc.lines(
    [
      [-5.5, -0.5, -8.8, -4.2, -9.2, -8.5],
      [4.5, 0.5, 7.8, 3.8, 9.2, 8.5],
    ],
    cx,
    cy + 4.5,
    [1, 1],
    'S',
  )
  // Right cradling lotus petal
  doc.lines(
    [
      [5.5, -0.5, 8.8, -4.2, 9.2, -8.5],
      [-4.5, 0.5, -7.8, 3.8, -9.2, 8.5],
    ],
    cx,
    cy + 4.5,
    [1, 1],
    'S',
  )
  // Delicate curved stem/chalice base
  doc.setDrawColor(...RECEIPT_PALETTE.brandBorderRgb)
  doc.setLineWidth(0.75)
  doc.lines([[4.2, 2.2, 9.8, 2.2, 14, 0]], cx - 7, cy + 5.8, [1, 1], 'S')
}

function drawPdfHeroStatus(
  doc: import('jspdf').jsPDF,
  label: string,
  tone: ReceiptStatusTone,
  centerX: number,
  baselineY: number,
): void {
  const { brandRgb, textBodyRgb, mutedRgb } = RECEIPT_PALETTE
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  const textW = doc.getTextWidth(label)
  const iconSize = 11
  const gap = 5
  const totalW = iconSize + gap + textW
  const startX = centerX - totalW / 2
  const iconCx = startX + iconSize / 2
  const iconCy = baselineY - 3.3

  if (tone === 'positive') {
    doc.setFillColor(...brandRgb)
    doc.circle(iconCx, iconCy, 5.2, 'F')
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(1.2)
    doc.line(iconCx - 2.3, iconCy, iconCx - 0.5, iconCy + 2)
    doc.line(iconCx - 0.5, iconCy + 2, iconCx + 2.7, iconCy - 2)
    doc.setTextColor(...brandRgb)
  } else if (tone === 'pending') {
    doc.setDrawColor(...textBodyRgb)
    doc.setLineWidth(1)
    doc.circle(iconCx, iconCy, 4.8, 'S')
    doc.setFillColor(...textBodyRgb)
    doc.circle(iconCx, iconCy, 1.8, 'F')
    doc.setTextColor(...textBodyRgb)
  } else {
    doc.setDrawColor(...mutedRgb)
    doc.setLineWidth(1)
    doc.circle(iconCx, iconCy, 4.8, 'S')
    doc.line(iconCx - 2.2, iconCy, iconCx + 2.2, iconCy)
    doc.setTextColor(...mutedRgb)
  }

  doc.text(label, startX + iconSize + gap, baselineY)
}

function drawPdfFooterAllPages(
  doc: import('jspdf').jsPDF,
  footerNote: string | null | undefined,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  padX: number,
): void {
  const pageCount = doc.getNumberOfPages()
  const { brandRgb, mutedRgb, lineRgb } = RECEIPT_PALETTE
  const innerX = cardX + padX
  const innerW = cardW - padX * 2
  const centerX = cardX + cardW / 2

  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p)
    const ruleY = cardY + cardH - 68

    doc.setDrawColor(...lineRgb)
    doc.setLineWidth(0.6)
    doc.line(innerX, ruleY, innerX + innerW, ruleY)

    doc.setFont('times', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...brandRgb)
    doc.text('Dermaspace Esthetic & Wellness Centre', centerX, ruleY + 14, {
      align: 'center',
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(...mutedRgb)
    doc.text(
      footerNote ||
        '237B Muri Okunola St, Victoria Island  ·  9 Agbeke Rotinwa Cl, Ikoyi',
      centerX,
      ruleY + 25,
      { align: 'center' },
    )
    doc.text(
      `dermaspaceng.com  ·  hello@dermaspaceng.com  ·  09013134945 / 09061836625  ·  Page ${p} of ${pageCount}`,
      centerX,
      ruleY + 36,
      { align: 'center' },
    )
  }
}

/**
 * Renders and downloads an A4 vector PDF spa receipt combining crisp ledger
 * clarity with Dermaspace's light plum stationery aesthetic (#7B2D8E + white),
 * botanical lotus ornament, unboxed editorial totals and notes, zero shadows,
 * zero gradients, and zero sparkle/zap symbols.
 */
export async function downloadReceiptPdf(
  data: ReceiptDocumentData,
): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const cardX = 36
  const cardY = 24
  const cardW = pageWidth - cardX * 2
  const cardH = pageHeight - cardY * 2
  const padX = 36
  const innerX = cardX + padX
  const innerW = cardW - padX * 2
  const footerReserve = 78

  const {
    brandRgb: brandPurple,
    brandBorderRgb: lavenderBorder,
    atelierBorderRgb,
    textDarkRgb: textDark,
    textBodyRgb: textBody,
    mutedRgb: mutedGray,
    lineRgb: lineGray,
  } = RECEIPT_PALETTE

  const ensureSpace = (neededHeight: number, currentY: number): number => {
    if (needsPageBreak(currentY, neededHeight, pageHeight, footerReserve)) {
      doc.addPage()
      drawPdfPageBackdropAndWatermark(doc, {
        pageWidth,
        pageHeight,
        cardX,
        cardY,
        cardW,
        cardH,
        scallopTop: false,
        scallopBottom: true,
      })
      return cardY + 34
    }
    return currentY
  }

  const { dataUrl: logoDataUrl, aspect: logoAspect } = await loadLogoAssets()

  drawPdfPageBackdropAndWatermark(doc, {
    pageWidth,
    pageHeight,
    cardX,
    cardY,
    cardW,
    cardH,
    scallopTop: true,
    scallopBottom: true,
  })

  // 1. Asymmetric Top Header (Full Logo Left · Document Title + Factual Ref Right)
  let y = cardY + 28
  if (logoDataUrl) {
    const logoH = 26
    const logoW = Math.min(logoH * logoAspect, innerW * 0.44)
    doc.addImage(
      logoDataUrl,
      'PNG',
      innerX,
      y,
      logoW,
      logoH,
      undefined,
      'FAST',
    )
  } else {
    doc.setFont('times', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...brandPurple)
    doc.text('Dermaspace', innerX, y + 19)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...textDark)
  doc.text(formatDocTitleDisplay(data.documentTitle), innerX + innerW, y + 12, {
    align: 'right',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.4)
  doc.setTextColor(...brandPurple)
  const headerRefLabel = formatCompactHeaderRef(
    data.reference,
    (t) => doc.getTextWidth(t),
    innerW * 0.46,
  )
  doc.text(headerRefLabel, innerX + innerW, y + 23.5, {
    align: 'right',
  })

  y += 42

  // 2. Centered Editorial Hero Amount, Status & Timestamp
  const centerX = cardX + cardW / 2
  const statusTone = classifyStatusTone(data.statusLabel)

  doc.setFont('times', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...brandPurple)
  doc.text(data.amountFormatted, centerX, y + 17, { align: 'center' })

  drawPdfHeroStatus(doc, data.statusLabel, statusTone, centerX, y + 36)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.1)
  doc.setTextColor(...mutedGray)
  const heroMetaParts = [`Issued ${data.issueDate}`]
  if (data.paymentMethodLabel) {
    heroMetaParts.push(
      statusTone === 'positive'
        ? `Paid via ${data.paymentMethodLabel}`
        : data.paymentMethodLabel,
    )
  }
  doc.text(heroMetaParts.join('  ·  '), centerX, y + 51, { align: 'center' })

  // Spa botanical lotus ornament divider separating Hero from Receipt Details
  y += 68
  drawPdfBotanicalDivider(doc, innerX, innerX + innerW, y)
  y += 16

  // 3. Optional Calm Editorial Context Headline
  if (data.headline) {
    doc.setFont('times', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...textDark)
    const headlineLines = wrapTextLines(
      data.headline,
      (t) => doc.getTextWidth(t),
      innerW,
    )
    y = ensureSpace(headlineLines.length * 16 + 14, y)
    doc.text(headlineLines, centerX, y + 2, { align: 'center' })
    y += headlineLines.length * 16

    if (data.subheadline) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.2)
      doc.setTextColor(...mutedGray)
      const subLines = wrapTextLines(
        data.subheadline,
        (t) => doc.getTextWidth(t),
        innerW - 24,
      )
      doc.text(subLines, centerX, y + 1, { align: 'center' })
      y += subLines.length * 11
    }
    y += 10
  }

  // 4. Optional Gift Card Specimen Card (Unboxed metadata line underneath)
  if (data.giftCardVisual) {
    const gc = data.giftCardVisual
    const cardVisualH = 108
    const specLineH = 18
    y = ensureSpace(cardVisualH + specLineH + 8, y)

    const gcW = Math.min(266, innerW)
    const gcX = centerX - gcW / 2
    const surfaceRgb = hexToRgb(gc.surfaceHex, brandPurple)
    const accentRgb = hexToRgb(gc.accentHex, brandPurple)
    const medallionRgb = hexToRgb(gc.medallionHex, brandPurple)
    const gcFont = pdfFontFamilyForGiftCard(gc.fontName)

    doc.setFillColor(...surfaceRgb)
    doc.roundedRect(gcX, y, gcW, cardVisualH, 8, 8, 'F')

    doc.setFillColor(...accentRgb)
    doc.roundedRect(
      gcX + gcW * 0.62,
      y + 8,
      gcW * 0.34,
      cardVisualH - 16,
      6,
      6,
      'F',
    )

    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.55)
    doc.roundedRect(gcX + 6, y + 6, gcW - 12, cardVisualH - 12, 5, 5, 'S')

    // Concentric Monogram Medallion ("DS", zero sparkles)
    const medX = gcX + gcW - 42
    const medY = y + cardVisualH / 2 + 1
    doc.setFillColor(...medallionRgb)
    doc.setDrawColor(245, 236, 248)
    doc.setLineWidth(0.85)
    doc.circle(medX, medY, 17.5, 'FD')
    doc.setLineWidth(0.45)
    doc.circle(medX, medY, 13.5, 'S')

    doc.setFont('times', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(255, 255, 255)
    doc.text('DS', medX, medY + 3.2, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(255, 255, 255)
    doc.text('DERMASPACE', gcX + 14, y + 19)
    doc.setFontSize(6)
    doc.text('GIFT CARD', gcX + gcW - 14, y + 19, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(235, 228, 242)
    doc.text('FOR', gcX + 14, y + 36)

    doc.setFont(gcFont, 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(255, 255, 255)
    const recLines = wrapTextLines(
      gc.recipientName,
      (t) => doc.getTextWidth(t),
      140,
    ).slice(0, 2)
    doc.text(recLines, gcX + 14, y + 47)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.8)
    doc.setTextColor(235, 228, 242)
    doc.text('VALUE', gcX + 14, y + 67)
    doc.setFont(gcFont, 'bold')
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text(gc.amountFormatted, gcX + 14, y + 81)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(245, 238, 250)
    doc.text(gc.editionLabel, gcX + 14, y + cardVisualH - 12)
    if (gc.senderName) {
      const fromText = wrapTextLines(
        `From: ${gc.senderName}`,
        (t) => doc.getTextWidth(t),
        92,
      )[0]
      doc.text(fromText || '', gcX + gcW - 14, y + cardVisualH - 12, {
        align: 'right',
      })
    }

    y += cardVisualH + 13
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.4)
    doc.setTextColor(...mutedGray)
    doc.text(
      `Theme: ${gc.designName}  ·  Font: ${gc.fontName || 'Elegant'}  ·  Valid at VI & Ikoyi  ·  No Expiry`,
      centerX,
      y,
      { align: 'center' },
    )
    y += 10
  }

  // 5. Left-Label / Right-Value Clean Key-Value Ledger
  const compactLedger = Boolean(data.giftCardVisual)
  const measuredLedger = measureLedgerRows(
    data.summaryRows,
    (t) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.3)
      return doc.getTextWidth(t)
    },
    (t) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      return doc.getTextWidth(t)
    },
    {
      totalWidth: innerW,
      labelMaxWidthRatio: 0.4,
      minGap: 18,
      topPadding: compactLedger ? 3.5 : 4.5,
      lineHeight: 11,
      bottomPadding: compactLedger ? 3.5 : 4.5,
      minRowHeight: compactLedger ? 16.5 : 19,
    },
  )

  if (measuredLedger.rows.length > 0) {
    measuredLedger.rows.forEach((row, idx) => {
      y = ensureSpace(row.height + 4, y)
      const baselineY = y + (compactLedger ? 11 : 12)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.3)
      doc.setTextColor(...mutedGray)
      doc.text(row.label, innerX, baselineY)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...textDark)
      row.valueLines.forEach((line, lIdx) => {
        doc.text(line, innerX + innerW, baselineY + lIdx * 11, {
          align: 'right',
        })
      })

      if (idx < measuredLedger.rows.length - 1) {
        doc.setDrawColor(242, 238, 246)
        doc.setLineWidth(0.5)
        doc.line(innerX, y + row.height, innerX + innerW, y + row.height)
      }
      y += row.height
    })

    y += compactLedger ? 7 : 10
  }

  // 6. Dashed Editorial Divider + Itemized Spa Breakdown
  if (data.lineItems && data.lineItems.length > 0) {
    const colMode = resolveLineItemColumnMode(data.lineItems)
    const rightHeader = columnHeaderLabel(colMode)
    const rightColReserve = colMode === 'none' ? 16 : 112
    const titleMaxW = innerW - rightColReserve - 16
    const subMaxW = innerW - rightColReserve - 16

    const { rows: measuredRows } = measureLineItems(
      data.lineItems,
      (t) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        return doc.getTextWidth(t)
      },
      (t) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.8)
        return doc.getTextWidth(t)
      },
      {
        titleMaxWidth: titleMaxW,
        subtitleMaxWidth: subMaxW,
        topPadding: 7,
        titleLineHeight: 12,
        subtitleGap: 2.5,
        subtitleLineHeight: 10.5,
        bottomPadding: 7,
        minRowHeight: 28,
      },
    )

    const drawBreakdownHeader = (atY: number): number => {
      drawPdfDashedRule(doc, innerX, atY, innerX + innerW)
      const capY = atY + 15
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...brandPurple)
      doc.text('SERVICES & ITEMS', innerX, capY)
      if (rightHeader) {
        doc.text(rightHeader, innerX + innerW, capY, { align: 'right' })
      }
      return capY + 6
    }

    y = ensureSpace(28 + (measuredRows[0]?.height ?? 28), y)
    y = drawBreakdownHeader(y)

    measuredRows.forEach((row, idx) => {
      if (needsPageBreak(y, row.height + 10, pageHeight, footerReserve)) {
        doc.addPage()
        drawPdfPageBackdropAndWatermark(doc, {
          pageWidth,
          pageHeight,
          cardX,
          cardY,
          cardW,
          cardH,
          scallopTop: false,
          scallopBottom: true,
        })
        y = drawBreakdownHeader(cardY + 34)
      }

      const rowBaselineY = y + 13
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...textDark)
      row.titleLines.forEach((line, lIdx) => {
        doc.text(line, innerX, rowBaselineY + lIdx * 12)
      })

      if (row.amount) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(
          colMode === 'amount' ? brandPurple[0] : textBody[0],
          colMode === 'amount' ? brandPurple[1] : textBody[1],
          colMode === 'amount' ? brandPurple[2] : textBody[2],
        )
        doc.text(row.amount, innerX + innerW, rowBaselineY, { align: 'right' })
      }

      if (row.subtitleLines.length > 0) {
        const subStartY = rowBaselineY + row.titleLines.length * 12 + 0.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.8)
        doc.setTextColor(...mutedGray)
        row.subtitleLines.forEach((line, sIdx) => {
          doc.text(line, innerX, subStartY + sIdx * 10.5)
        })
      }

      if (idx < measuredRows.length - 1) {
        doc.setDrawColor(242, 238, 246)
        doc.setLineWidth(0.5)
        doc.line(innerX, y + row.height, innerX + innerW, y + row.height)
      }
      y += row.height
    })

    y += 6
  }

  // 7. Subtotal, Discount & Unboxed Couture Total Block
  if (data.subtotalFormatted && data.discountFormatted) {
    y = ensureSpace(38, y)
    doc.setDrawColor(...lineGray)
    doc.setLineWidth(0.5)
    doc.line(innerX, y, innerX + innerW, y)
    y += 13

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.4)
    doc.setTextColor(...mutedGray)
    doc.text('Subtotal', innerX, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textDark)
    doc.text(data.subtotalFormatted, innerX + innerW, y, { align: 'right' })

    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...brandPurple)
    doc.text(data.discountLabel || 'Voucher Discount', innerX, y)
    doc.setFont('helvetica', 'bold')
    doc.text(data.discountFormatted, innerX + innerW, y, { align: 'right' })
    y += 12
  }

  // Unboxed Total Paid Block (Signature plum rule + open editorial total + double hairline)
  const totalBlockH = 44
  y = ensureSpace(totalBlockH + 14, y)

  doc.setDrawColor(...brandPurple)
  doc.setLineWidth(1.4)
  doc.line(innerX, y, innerX + innerW, y)

  const totalMetaParts = [data.paymentMethodLabel, data.invoiceNumber].filter(
    Boolean,
  )
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.6)
  doc.setTextColor(...brandPurple)
  doc.text(data.amountLabel, innerX, y + (totalMetaParts.length > 0 ? 17 : 24))

  if (totalMetaParts.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(...textBody)
    doc.text(totalMetaParts.join('  ·  '), innerX, y + 30)
  }

  doc.setFont('times', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...brandPurple)
  doc.text(data.amountFormatted, innerX + innerW, y + 26.5, {
    align: 'right',
  })

  y += totalBlockH
  doc.setDrawColor(...lavenderBorder)
  doc.setLineWidth(0.7)
  doc.line(innerX, y, innerX + innerW, y)
  doc.setDrawColor(...atelierBorderRgb)
  doc.setLineWidth(0.45)
  doc.line(innerX, y + 3, innerX + innerW, y + 3)

  y += 18

  // 8. Unboxed Personal Message / Appointment Note (Directly on white stationery)
  if (data.note) {
    doc.setFont('times', 'italic')
    doc.setFontSize(9.8)
    const noteLines = wrapTextLines(
      `"${data.note}"`,
      (t) => doc.getTextWidth(t),
      innerW - 44,
    )
    const noteBlockH = 22 + noteLines.length * 13
    y = ensureSpace(noteBlockH + 10, y)

    const noteTitle = data.noteTitle || 'PERSONAL MESSAGE'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(...brandPurple)
    const titleW = doc.getTextWidth(noteTitle)
    const dashLen = 14
    const dashGap = 7
    doc.setDrawColor(...lavenderBorder)
    doc.setLineWidth(0.6)
    doc.line(
      centerX - titleW / 2 - dashGap - dashLen,
      y + 3.5,
      centerX - titleW / 2 - dashGap,
      y + 3.5,
    )
    doc.line(
      centerX + titleW / 2 + dashGap,
      y + 3.5,
      centerX + titleW / 2 + dashGap + dashLen,
      y + 3.5,
    )
    doc.text(noteTitle, centerX, y + 6, { align: 'center' })

    doc.setFont('times', 'italic')
    doc.setFontSize(9.8)
    doc.setTextColor(...textBody)
    noteLines.forEach((line, idx) => {
      doc.text(line, centerX, y + 22 + idx * 13, { align: 'center' })
    })
  }

  // Stamp footer cleanly on every page
  drawPdfFooterAllPages(
    doc,
    data.footerNote,
    cardX,
    cardY,
    cardW,
    cardH,
    padX,
  )

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

function drawCanvasHeroStatus(
  ctx: CanvasRenderingContext2D,
  label: string,
  tone: ReceiptStatusTone,
  centerX: number,
  baselineY: number,
  sansFont: string,
): void {
  ctx.font = `700 15px ${sansFont}`
  const textW = ctx.measureText(label).width
  const iconSize = 16
  const gap = 7
  const totalW = iconSize + gap + textW
  const startX = centerX - totalW / 2
  const iconCx = startX + iconSize / 2
  const iconCy = baselineY - 4.8

  if (tone === 'positive') {
    ctx.beginPath()
    ctx.arc(iconCx, iconCy, 7.5, 0, Math.PI * 2)
    ctx.fillStyle = RECEIPT_PALETTE.brandHex
    ctx.fill()

    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(iconCx - 3.3, iconCy)
    ctx.lineTo(iconCx - 0.8, iconCy + 2.8)
    ctx.lineTo(iconCx + 3.8, iconCy - 2.8)
    ctx.stroke()
    ctx.lineCap = 'butt'

    ctx.fillStyle = RECEIPT_PALETTE.brandHex
  } else if (tone === 'pending') {
    ctx.beginPath()
    ctx.arc(iconCx, iconCy, 7, 0, Math.PI * 2)
    ctx.strokeStyle = '#52525B'
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(iconCx, iconCy, 2.6, 0, Math.PI * 2)
    ctx.fillStyle = '#52525B'
    ctx.fill()
    ctx.fillStyle = '#3F3F46'
  } else {
    ctx.beginPath()
    ctx.arc(iconCx, iconCy, 7, 0, Math.PI * 2)
    ctx.strokeStyle = '#71717A'
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(iconCx - 3, iconCy)
    ctx.lineTo(iconCx + 3, iconCy)
    ctx.stroke()
    ctx.fillStyle = '#71717A'
  }

  ctx.textAlign = 'left'
  ctx.fillText(label, startX + iconSize + gap, baselineY)
}

function drawCanvasDashedRule(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
  color: string,
): void {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.1
  ctx.setLineDash([6, 5])
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x2, y)
  ctx.stroke()
  ctx.restore()
}

/**
 * Draws a symmetric minimalist 3-petal spa lotus blossom between horizontal
 * hairlines using pure Bezier curves (zero 4-point star/sparkle geometry).
 */
function drawCanvasBotanicalDivider(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  cy: number,
  brandHex: string,
  borderHex: string,
): void {
  const cx = (x1 + x2) / 2
  const gapHalf = 22

  ctx.save()
  ctx.strokeStyle = borderHex
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x1, cy)
  ctx.lineTo(cx - gapHalf, cy)
  ctx.moveTo(cx + gapHalf, cy)
  ctx.lineTo(x2, cy)
  ctx.stroke()

  ctx.strokeStyle = brandHex
  ctx.lineWidth = 1.35
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Center upright lotus petal
  ctx.beginPath()
  ctx.moveTo(cx, cy + 6)
  ctx.bezierCurveTo(cx - 5.2, cy + 2, cx - 4.4, cy - 5, cx, cy - 15)
  ctx.bezierCurveTo(cx + 4.4, cy - 5, cx + 5.2, cy + 2, cx, cy + 6)
  ctx.stroke()

  // Left cradling lotus petal
  ctx.beginPath()
  ctx.moveTo(cx, cy + 6)
  ctx.bezierCurveTo(cx - 7.5, cy + 5.3, cx - 12, cy + 0.2, cx - 12.6, cy - 6)
  ctx.bezierCurveTo(cx - 6.4, cy - 5.3, cx - 1.8, cy - 0.8, cx, cy + 6)
  ctx.stroke()

  // Right cradling lotus petal
  ctx.beginPath()
  ctx.moveTo(cx, cy + 6)
  ctx.bezierCurveTo(cx + 7.5, cy + 5.3, cx + 12, cy + 0.2, cx + 12.6, cy - 6)
  ctx.bezierCurveTo(cx + 6.4, cy - 5.3, cx + 1.8, cy - 0.8, cx, cy + 6)
  ctx.stroke()

  // Delicate curved chalice arc underneath petals
  ctx.strokeStyle = borderHex
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.moveTo(cx - 9.5, cy + 8.2)
  ctx.quadraticCurveTo(cx, cy + 11.2, cx + 9.5, cy + 8.2)
  ctx.stroke()
  ctx.restore()
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
 * Generates and downloads a crisp 3x Hi-DPI PNG spa receipt slip (#FFFFFF
 * stationery card on #EEE8F4 mist, #7B2D8E plum accents, botanical lotus
 * divider, unboxed couture total and notes, scalloped edges, zero dark
 * backgrounds, zero shadows, zero gradients, and zero sparkle/zap symbols).
 */
export async function downloadReceiptImage(
  data: ReceiptDocumentData,
): Promise<string> {
  const siteFonts = resolveSiteFonts()
  const { sansFont, serifFont } = siteFonts
  await ensureSiteFontsLoaded(sansFont, serifFont)

  const scale = 3
  const width = 620
  const cardMargin = 22
  const cardX = cardMargin
  const cardW = width - cardMargin * 2
  const padX = 34
  const innerX = cardX + padX
  const innerW = cardW - padX * 2
  const centerX = width / 2

  const brandHex = RECEIPT_PALETTE.brandHex
  const outerBg = '#EEE8F4'
  const brandBorder = '#DAC6E5'
  const atelierBorder = '#EAE0F2'
  const lineHex = '#EAE3F0'
  const rowDividerHex = '#F3EFF6'
  const textDark = '#18181B'
  const textBody = '#3F3F46'
  const textMuted = '#71717A'

  const { bitmap: logoBitmap } = await loadLogoAssets()

  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')!
  const measureWithFont = (font: string) => (text: string) => {
    mctx.font = font
    return mctx.measureText(text).width
  }

  // Measure Optional Headline & Subheadline
  const headlineLines = data.headline
    ? wrapTextLines(
        data.headline,
        measureWithFont(`700 17.5px ${serifFont}`),
        innerW,
      )
    : []
  const subLines =
    data.headline && data.subheadline
      ? wrapTextLines(
          data.subheadline,
          measureWithFont(`400 11.5px ${sansFont}`),
          innerW - 24,
        )
      : []
  const headlineBlockH =
    headlineLines.length > 0
      ? headlineLines.length * 23 +
        (subLines.length > 0 ? 5 + subLines.length * 16 : 0) +
        6
      : 0

  // Measure Gift Card Visual (if present — unboxed metadata line beneath)
  const giftVisualH = data.giftCardVisual ? 164 + 16 + 14 : 0

  // Measure Left-Label / Right-Value Ledger
  const measuredLedger = measureLedgerRows(
    data.summaryRows,
    measureWithFont(`400 12px ${sansFont}`),
    measureWithFont(`600 12px ${sansFont}`),
    {
      totalWidth: innerW,
      labelMaxWidthRatio: 0.4,
      minGap: 20,
      topPadding: 8,
      lineHeight: 16,
      bottomPadding: 8,
      minRowHeight: 30,
    },
  )

  // Measure Itemized Spa Breakdown
  const lineItems = data.lineItems ?? []
  const colMode = resolveLineItemColumnMode(lineItems)
  const rightColReserve = colMode === 'none' ? 16 : 132
  const measuredItems =
    lineItems.length > 0
      ? measureLineItems(
          lineItems,
          measureWithFont(`600 12.5px ${sansFont}`),
          measureWithFont(`400 10.5px ${sansFont}`),
          {
            titleMaxWidth: innerW - rightColReserve - 16,
            subtitleMaxWidth: innerW - rightColReserve - 16,
            topPadding: 10,
            titleLineHeight: 17,
            subtitleGap: 3,
            subtitleLineHeight: 14,
            bottomPadding: 10,
            minRowHeight: 40,
          },
        )
      : { rows: [], totalHeight: 0 }
  const itemsSectionH =
    measuredItems.rows.length > 0 ? 34 + measuredItems.totalHeight : 0

  // Measure Subtotal/Discount, Unboxed Couture Total Block, Unboxed Note & Footer
  const discountH = data.subtotalFormatted && data.discountFormatted ? 48 : 0
  const totalBlockH = 66
  const noteLines = data.note
    ? wrapTextLines(
        `"${data.note}"`,
        measureWithFont(`italic 13.5px ${serifFont}`),
        innerW - 48,
      )
    : []
  const noteSectionH = data.note ? 26 + noteLines.length * 19 : 0

  const headerH = 44
  const heroH = 98
  const footerH = 68

  const giftVisualGapH =
    giftVisualH > 0 ? (headlineLines.length > 0 ? 14 : 10) + giftVisualH : 0

  const cardH =
    36 +
    headerH +
    18 +
    heroH +
    18 +
    headlineBlockH +
    giftVisualGapH +
    (measuredLedger.rows.length > 0 ? 14 + measuredLedger.totalHeight : 0) +
    (itemsSectionH > 0 ? 18 + itemsSectionH : 0) +
    (discountH > 0 ? 10 + discountH : 0) +
    16 +
    totalBlockH +
    (noteSectionH > 0 ? 22 + noteSectionH : 0) +
    26 +
    footerH +
    26

  const totalHeight = cardMargin * 2 + cardH

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = totalHeight * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  // Serene soft-plum paper backdrop (#EEE8F4)
  ctx.fillStyle = outerBg
  ctx.fillRect(0, 0, width, totalHeight)

  // Seamless pure white stationery slip
  drawRoundedRectPath(ctx, cardX, cardMargin, cardW, cardH, 14)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()

  ctx.save()
  drawRoundedRectPath(ctx, cardX, cardMargin, cardW, cardH, 14)
  ctx.clip()

  // Whisper-subtle diagonal "Dermaspace" anti-tamper watermark tiled cleanly inside body
  ctx.save()
  ctx.fillStyle = 'rgba(123, 45, 142, 0.024)'
  ctx.font = `700 21px ${serifFont}`
  ctx.textAlign = 'center'
  const wmCols = [cardX + 104, width / 2, cardX + cardW - 104]
  for (let row = 0; ; row += 1) {
    const wy = cardMargin + 132 + row * 136
    if (wy > cardMargin + cardH - 110) break
    wmCols.forEach((wx, cIdx) => {
      if ((row + cIdx) % 2 === 0) {
        ctx.save()
        ctx.translate(wx, wy)
        ctx.rotate((-20 * Math.PI) / 180)
        ctx.fillText('Dermaspace', 0, 0)
        ctx.restore()
      }
    })
  }
  ctx.restore()

  // Inner letterpress atelier hairline frame (clear of top/bottom scallops)
  drawRoundedRectPath(
    ctx,
    cardX + 15,
    cardMargin + 17,
    cardW - 30,
    cardH - 34,
    8,
  )
  ctx.strokeStyle = atelierBorder
  ctx.lineWidth = 1
  ctx.stroke()

  // Top signature plum rule aligned cleanly along top of atelier frame
  ctx.fillStyle = brandHex
  ctx.fillRect(cardX + 34, cardMargin + 17, cardW - 68, 2.4)

  let y = cardMargin + 36

  // 1. Header Row (Logo Left · Receipt Title & Factual Ref Right)
  if (logoBitmap) {
    const logoH = 34
    const logoW = Math.min(
      logoH * (logoBitmap.width / logoBitmap.height),
      innerW * 0.45,
    )
    ctx.drawImage(logoBitmap, innerX, y + 4, logoW, logoH)
  } else {
    ctx.fillStyle = brandHex
    ctx.font = `700 24px ${serifFont}`
    ctx.fillText('Dermaspace', innerX, y + 28)
  }

  ctx.textAlign = 'right'
  ctx.fillStyle = textDark
  ctx.font = `700 14.5px ${sansFont}`
  ctx.fillText(formatDocTitleDisplay(data.documentTitle), innerX + innerW, y + 18)
  ctx.fillStyle = brandHex
  ctx.font = `500 10px ${sansFont}`
  const headerRefLabel = formatCompactHeaderRef(
    data.reference,
    measureWithFont(`500 10px ${sansFont}`),
    innerW * 0.46,
  )
  ctx.fillText(headerRefLabel, innerX + innerW, y + 34)
  ctx.textAlign = 'left'

  y += headerH + 18

  // 2. Centered Editorial Hero Amount, Status & Timestamp
  const statusTone = classifyStatusTone(data.statusLabel)

  ctx.textAlign = 'center'
  ctx.fillStyle = brandHex
  ctx.font = `700 34px ${serifFont}`
  ctx.fillText(data.amountFormatted, centerX, y + 28)
  ctx.textAlign = 'left'

  drawCanvasHeroStatus(ctx, data.statusLabel, statusTone, centerX, y + 57, sansFont)

  ctx.textAlign = 'center'
  ctx.fillStyle = textMuted
  ctx.font = `400 11px ${sansFont}`
  const heroMetaParts = [`Issued ${data.issueDate}`]
  if (data.paymentMethodLabel) {
    heroMetaParts.push(
      statusTone === 'positive'
        ? `Paid via ${data.paymentMethodLabel}`
        : data.paymentMethodLabel,
    )
  }
  ctx.fillText(heroMetaParts.join('  ·  '), centerX, y + 79)
  ctx.textAlign = 'left'

  // Botanical spa lotus ornament divider
  y += heroH
  drawCanvasBotanicalDivider(
    ctx,
    innerX,
    innerX + innerW,
    y,
    brandHex,
    brandBorder,
  )
  y += 18

  // 3. Optional Centered Editorial Context Headline
  if (headlineLines.length > 0) {
    ctx.textAlign = 'center'
    ctx.fillStyle = textDark
    ctx.font = `700 17.5px ${serifFont}`
    headlineLines.forEach((line, idx) => {
      ctx.fillText(line, centerX, y + 14 + idx * 23)
    })
    y += headlineLines.length * 23

    if (subLines.length > 0) {
      y += 5
      ctx.fillStyle = textMuted
      ctx.font = `400 11.5px ${sansFont}`
      subLines.forEach((line, idx) => {
        ctx.fillText(line, centerX, y + 12 + idx * 16)
      })
      y += subLines.length * 16
    }
    y += 6
    ctx.textAlign = 'left'
  }

  // 4. Optional Gift Card Specimen Card (Unboxed metadata line underneath)
  if (data.giftCardVisual) {
    y += headlineLines.length > 0 ? 14 : 10
    const gc = data.giftCardVisual
    const gcCardW = Math.min(340, innerW)
    const gcCardH = 164
    const gcX = centerX - gcCardW / 2
    const gcFont = canvasFontFamilyForGiftCard(gc.fontName, siteFonts)

    drawRoundedRectPath(ctx, gcX, y, gcCardW, gcCardH, 10)
    ctx.fillStyle = gc.surfaceHex || brandHex
    ctx.fill()

    drawRoundedRectPath(
      ctx,
      gcX + gcCardW * 0.62,
      y + 11,
      gcCardW * 0.33,
      gcCardH - 22,
      8,
    )
    ctx.fillStyle = gc.accentHex || brandHex
    ctx.fill()

    drawRoundedRectPath(ctx, gcX + 8, y + 8, gcCardW - 16, gcCardH - 16, 7)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1
    ctx.stroke()

    const medX = gcX + gcCardW - 55
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
    ctx.fillText('DERMASPACE', gcX + 18, y + 28)
    ctx.textAlign = 'right'
    ctx.font = `700 8px ${sansFont}`
    ctx.fillText('GIFT CARD', gcX + gcCardW - 18, y + 28)
    ctx.textAlign = 'left'

    ctx.fillStyle = 'rgba(245,238,250,0.85)'
    ctx.font = `400 8.5px ${sansFont}`
    ctx.fillText('FOR', gcX + 18, y + 52)
    ctx.fillStyle = '#FFFFFF'
    const recLines = wrapTextLines(
      gc.recipientName,
      measureWithFont(`700 14px ${gcFont}`),
      168,
    ).slice(0, 2)
    ctx.font = `700 14px ${gcFont}`
    recLines.forEach((line, idx) => {
      ctx.fillText(line, gcX + 18, y + 69 + idx * 17)
    })

    ctx.fillStyle = 'rgba(245,238,250,0.85)'
    ctx.font = `700 8px ${sansFont}`
    ctx.fillText('VALUE', gcX + 18, y + 102)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 19px ${gcFont}`
    ctx.fillText(gc.amountFormatted, gcX + 18, y + 123)

    ctx.fillStyle = 'rgba(245,238,250,0.92)'
    ctx.font = `400 9.5px ${sansFont}`
    ctx.fillText(gc.editionLabel, gcX + 18, y + gcCardH - 18)
    if (gc.senderName) {
      const fromText = wrapTextLines(
        `From: ${gc.senderName}`,
        measureWithFont(`400 9px ${sansFont}`),
        118,
      )[0]
      ctx.textAlign = 'right'
      ctx.font = `400 9px ${sansFont}`
      ctx.fillText(fromText || '', gcX + gcCardW - 18, y + gcCardH - 18)
      ctx.textAlign = 'left'
    }

    y += gcCardH + 16
    ctx.textAlign = 'center'
    ctx.fillStyle = textMuted
    ctx.font = `400 10px ${sansFont}`
    ctx.fillText(
      `Theme: ${gc.designName}  ·  Font: ${gc.fontName || 'Elegant'}  ·  Valid at VI & Ikoyi  ·  No Expiry`,
      centerX,
      y + 8,
    )
    ctx.textAlign = 'left'
    y += 14
  }

  // 5. Left-Label / Right-Value Clean Key-Value Ledger
  if (measuredLedger.rows.length > 0) {
    y += 14
    measuredLedger.rows.forEach((row, idx) => {
      const baselineY = y + 18
      ctx.fillStyle = textMuted
      ctx.font = `400 12px ${sansFont}`
      ctx.fillText(row.label, innerX, baselineY)

      ctx.textAlign = 'right'
      ctx.fillStyle = textDark
      ctx.font = `600 12px ${sansFont}`
      row.valueLines.forEach((line, lIdx) => {
        ctx.fillText(line, innerX + innerW, baselineY + lIdx * 16)
      })
      ctx.textAlign = 'left'

      if (idx < measuredLedger.rows.length - 1) {
        ctx.strokeStyle = rowDividerHex
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(innerX, y + row.height)
        ctx.lineTo(innerX + innerW, y + row.height)
        ctx.stroke()
      }
      y += row.height
    })
  }

  // 6. Dashed Editorial Divider + Itemized Spa Breakdown
  if (measuredItems.rows.length > 0) {
    y += 18
    drawCanvasDashedRule(ctx, innerX, y, innerX + innerW, brandBorder)
    y += 22

    const rightHeader = columnHeaderLabel(colMode)
    ctx.fillStyle = brandHex
    ctx.font = `700 9.5px ${sansFont}`
    ctx.fillText('SERVICES & ITEMS', innerX, y)
    if (rightHeader) {
      ctx.textAlign = 'right'
      ctx.fillText(rightHeader, innerX + innerW, y)
      ctx.textAlign = 'left'
    }
    y += 12

    measuredItems.rows.forEach((row, idx) => {
      const rowBaselineY = y + 18
      ctx.fillStyle = textDark
      ctx.font = `600 12.5px ${sansFont}`
      row.titleLines.forEach((line, lIdx) => {
        ctx.fillText(line, innerX, rowBaselineY + lIdx * 17)
      })

      if (row.amount) {
        ctx.textAlign = 'right'
        ctx.fillStyle = colMode === 'amount' ? brandHex : textBody
        ctx.font = `700 12.5px ${sansFont}`
        ctx.fillText(row.amount, innerX + innerW, rowBaselineY)
        ctx.textAlign = 'left'
      }

      if (row.subtitleLines.length > 0) {
        const subY = rowBaselineY + row.titleLines.length * 17 + 1
        ctx.fillStyle = textMuted
        ctx.font = `400 10.5px ${sansFont}`
        row.subtitleLines.forEach((line, sIdx) => {
          ctx.fillText(line, innerX, subY + sIdx * 14)
        })
      }

      if (idx < measuredItems.rows.length - 1) {
        ctx.strokeStyle = rowDividerHex
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(innerX, y + row.height)
        ctx.lineTo(innerX + innerW, y + row.height)
        ctx.stroke()
      }
      y += row.height
    })
  }

  // 7. Subtotal & Discount
  if (data.subtotalFormatted && data.discountFormatted) {
    y += 10
    ctx.strokeStyle = lineHex
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(innerX, y)
    ctx.lineTo(innerX + innerW, y)
    ctx.stroke()
    y += 18

    ctx.fillStyle = textMuted
    ctx.font = `400 11.5px ${sansFont}`
    ctx.fillText('Subtotal', innerX, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = textDark
    ctx.font = `600 11.5px ${sansFont}`
    ctx.fillText(data.subtotalFormatted, innerX + innerW, y)
    ctx.textAlign = 'left'

    y += 20
    ctx.fillStyle = brandHex
    ctx.font = `400 11.5px ${sansFont}`
    ctx.fillText(data.discountLabel || 'Voucher Discount', innerX, y)
    ctx.textAlign = 'right'
    ctx.font = `700 11.5px ${sansFont}`
    ctx.fillText(data.discountFormatted, innerX + innerW, y)
    ctx.textAlign = 'left'
    y += 10
  }

  // 8. Unboxed Couture Total Block (Signature plum rule + open editorial amount + double hairline)
  y += 16
  ctx.strokeStyle = brandHex
  ctx.lineWidth = 1.9
  ctx.beginPath()
  ctx.moveTo(innerX, y)
  ctx.lineTo(innerX + innerW, y)
  ctx.stroke()

  const totalMetaParts = [data.paymentMethodLabel, data.invoiceNumber].filter(
    Boolean,
  )
  ctx.fillStyle = brandHex
  ctx.font = `700 10px ${sansFont}`
  ctx.fillText(
    data.amountLabel,
    innerX,
    y + (totalMetaParts.length > 0 ? 25 : 35),
  )

  if (totalMetaParts.length > 0) {
    ctx.fillStyle = textBody
    ctx.font = `400 10.5px ${sansFont}`
    ctx.fillText(totalMetaParts.join('  ·  '), innerX, y + 44)
  }

  ctx.textAlign = 'right'
  ctx.fillStyle = brandHex
  ctx.font = `700 26px ${serifFont}`
  ctx.fillText(data.amountFormatted, innerX + innerW, y + 38)
  ctx.textAlign = 'left'

  y += totalBlockH - 4
  ctx.strokeStyle = brandBorder
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.moveTo(innerX, y)
  ctx.lineTo(innerX + innerW, y)
  ctx.stroke()

  ctx.strokeStyle = atelierBorder
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(innerX, y + 4)
  ctx.lineTo(innerX + innerW, y + 4)
  ctx.stroke()
  y += 4

  // 9. Unboxed Personal Message / Appointment Notes (Directly on clean white stationery)
  if (data.note) {
    y += 22
    const noteTitle = data.noteTitle || 'PERSONAL MESSAGE'
    ctx.font = `700 9px ${sansFont}`
    const titleW = ctx.measureText(noteTitle).width
    const dashLen = 18
    const dashGap = 9

    ctx.strokeStyle = brandBorder
    ctx.lineWidth = 0.85
    ctx.beginPath()
    ctx.moveTo(centerX - titleW / 2 - dashGap - dashLen, y + 4.5)
    ctx.lineTo(centerX - titleW / 2 - dashGap, y + 4.5)
    ctx.moveTo(centerX + titleW / 2 + dashGap, y + 4.5)
    ctx.lineTo(centerX + titleW / 2 + dashGap + dashLen, y + 4.5)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.fillStyle = brandHex
    ctx.fillText(noteTitle, centerX, y + 8)

    ctx.fillStyle = textBody
    ctx.font = `italic 13.5px ${serifFont}`
    noteLines.forEach((line, idx) => {
      ctx.fillText(line, centerX, y + 29 + idx * 19)
    })
    ctx.textAlign = 'left'
    y += noteSectionH
  }

  y += 26

  // 10. Authentic Sanctuary Footer
  ctx.strokeStyle = lineHex
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(innerX, y)
  ctx.lineTo(innerX + innerW, y)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = brandHex
  ctx.font = `700 11.5px ${serifFont}`
  ctx.fillText(
    'Dermaspace Esthetic & Wellness Centre',
    centerX,
    y + 22,
  )
  ctx.fillStyle = textMuted
  ctx.font = `400 9.5px ${sansFont}`
  ctx.fillText(
    data.footerNote ||
      '237B Muri Okunola St, Victoria Island  ·  9 Agbeke Rotinwa Cl, Ikoyi',
    centerX,
    y + 39,
  )
  ctx.fillText(
    'dermaspaceng.com  ·  hello@dermaspaceng.com  ·  09013134945 / 09061836625',
    centerX,
    y + 54,
  )
  ctx.textAlign = 'left'
  ctx.restore()

  // Uniform boutique paper scallops along top and bottom flat card edges
  const drawCanvasEdgeScallops = (edgeY: number) => {
    const inset = 26
    const span = cardW - inset * 2
    const step = 22
    const count = Math.floor(span / step)
    if (count <= 0) return
    const startX = cardX + (cardW - (count - 1) * step) / 2
    ctx.fillStyle = outerBg
    for (let i = 0; i < count; i += 1) {
      ctx.beginPath()
      ctx.arc(startX + i * step, edgeY, 5.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  drawCanvasEdgeScallops(cardMargin)
  drawCanvasEdgeScallops(cardMargin + cardH)

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
