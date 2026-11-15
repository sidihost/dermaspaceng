import {
  findGiftCardDesignById,
  getDesignMedallionHex,
  getGiftCardOccasionMeta,
} from './gift-card-templates'

const LOCAL_BRAND_LOGO = '/images/dermaspace-header-logo.png'
const REMOTE_BRAND_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

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
  amountFormatted: string
  amountLabel: string
  paymentMethodLabel?: string
  summaryRows: ReceiptDetailRow[]
  lineItems?: ReceiptLineItem[]
  giftCardVisual?: ReceiptGiftCardVisual | null
  note?: string | null
  filename: string
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

export function sanitizeReceiptFilename(rawRef?: string | null): string {
  const cleaned = (rawRef || 'Dermaspace')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return `Dermaspace-Receipt-${cleaned || 'Order'}.pdf`
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
    const metaDetails = (tx.metadata as { itemDetails?: Record<string, unknown> } | null)?.itemDetails
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
    filename: sanitizeReceiptFilename(ref),
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
    filename: sanitizeReceiptFilename(ref),
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

function pdfFontFamilyForGiftCard(fontName?: string | null): 'times' | 'helvetica' | 'courier' {
  const lower = (fontName || '').toLowerCase()
  if (lower.includes('modern') || lower.includes('sans')) return 'helvetica'
  if (lower.includes('playful') || lower.includes('mono')) return 'courier'
  return 'times'
}

export async function downloadReceiptPdf(
  data: ReceiptDocumentData,
): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentW = pageWidth - margin * 2

  const brandDeep: [number, number, number] = [74, 21, 88]
  const brandPurple: [number, number, number] = [123, 45, 142]
  const brandSoft: [number, number, number] = [249, 246, 251]
  const champagneGold: [number, number, number] = [212, 175, 106]
  const goldLight: [number, number, number] = [229, 200, 150]
  const textDark: [number, number, number] = [24, 24, 27]
  const textGray: [number, number, number] = [55, 65, 81]
  const mutedGray: [number, number, number] = [113, 113, 122]
  const lineGray: [number, number, number] = [228, 228, 231]
  const lavenderBorder: [number, number, number] = [234, 224, 240]

  const ensureSpace = (neededHeight: number, currentY: number): number => {
    if (currentY + neededHeight > pageHeight - 84) {
      doc.addPage()
      doc.setFillColor(...brandDeep)
      doc.rect(0, 0, pageWidth, 4, 'F')
      doc.setFillColor(...champagneGold)
      doc.rect(0, 4, pageWidth, 1.5, 'F')
      return 36
    }
    return currentY
  }

  const { dataUrl: logoDataUrl, aspect: logoAspect } = await loadLogoPngDataUrl()

  // Top luxury accent stripes (flat solid colors, zero gradients)
  doc.setFillColor(...brandDeep)
  doc.rect(0, 0, pageWidth, 5, 'F')
  doc.setFillColor(...champagneGold)
  doc.rect(0, 5, pageWidth, 1.5, 'F')

  // Editorial Masthead Band
  const heroTop = 6.5
  const heroH = 92
  doc.setFillColor(...brandSoft)
  doc.rect(0, heroTop, pageWidth, heroH, 'F')
  doc.setDrawColor(...lavenderBorder)
  doc.setLineWidth(0.75)
  doc.line(0, heroTop + heroH, pageWidth, heroTop + heroH)

  if (logoDataUrl) {
    const logoH = 38
    const logoW = Math.min(logoH * logoAspect, contentW * 0.46)
    doc.addImage(
      logoDataUrl,
      'PNG',
      margin,
      heroTop + 20,
      logoW,
      logoH,
      undefined,
      'FAST',
    )
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...mutedGray)
    doc.text('ESTHETIC & WELLNESS CENTRE  ·  LAGOS', margin, heroTop + 72)
  } else {
    doc.setFont('times', 'bold')
    doc.setFontSize(23)
    doc.setTextColor(...brandPurple)
    doc.text('Dermaspace', margin, heroTop + 46)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...mutedGray)
    doc.text('ESTHETIC & WELLNESS CENTRE  ·  LAGOS', margin, heroTop + 64)
  }

  // Right masthead block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...brandPurple)
  doc.text('OFFICIAL RECEIPT', pageWidth - margin, heroTop + 31, {
    align: 'right',
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...textDark)
  doc.text(data.documentTitle, pageWidth - margin, heroTop + 49, {
    align: 'right',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedGray)
  doc.text(`Issued ${data.issueDate}`, pageWidth - margin, heroTop + 66, {
    align: 'right',
  })

  let y = heroTop + heroH + 22

  // Reference / Invoice / Status Bar
  const metaBarH = 44
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...lineGray)
  doc.setLineWidth(0.75)
  doc.roundedRect(margin, y, contentW, metaBarH, 8, 8, 'FD')

  const col1X = margin + 14
  const col2X = margin + contentW * 0.44
  const col3X = pageWidth - margin - 14

  doc.setDrawColor(...lineGray)
  doc.line(col2X - 14, y + 9, col2X - 14, y + metaBarH - 9)
  doc.line(margin + contentW * 0.76, y + 9, margin + contentW * 0.76, y + metaBarH - 9)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...mutedGray)
  doc.text('REFERENCE', col1X, y + 15)
  doc.text(data.invoiceNumber ? 'INVOICE NO.' : 'PAYMENT METHOD', col2X, y + 15)
  doc.text('STATUS', col3X, y + 15, { align: 'right' })

  doc.setFont('courier', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...brandDeep)
  doc.text(data.reference, col1X, y + 31, { maxWidth: contentW * 0.38 })

  doc.setFont(data.invoiceNumber ? 'courier' : 'helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...textDark)
  doc.text(
    data.invoiceNumber || data.paymentMethodLabel || 'Online',
    col2X,
    y + 31,
    { maxWidth: contentW * 0.28 },
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...brandPurple)
  const statusTextW = doc.getTextWidth(data.statusLabel)
  doc.setFillColor(...brandPurple)
  doc.circle(col3X - statusTextW - 8, y + 27.5, 2.8, 'F')
  doc.text(data.statusLabel, col3X, y + 31, { align: 'right' })

  y += metaBarH + 18

  // Headline
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...textDark)
  const headlineLines = doc.splitTextToSize(data.headline, contentW)
  doc.text(headlineLines, margin, y)
  y += headlineLines.length * 18 + 10

  // Gift Card Specimen Visual + Style Spec Box (for Gift Card receipts)
  if (data.giftCardVisual) {
    const gc = data.giftCardVisual
    const visualH = 156
    y = ensureSpace(visualH + 22, y)

    const cardW = 266
    const cardH = visualH
    const specX = margin + cardW + 14
    const specW = contentW - cardW - 14

    const surfaceRgb = hexToRgb(gc.surfaceHex, brandPurple)
    const accentRgb = hexToRgb(gc.accentHex, brandPurple)
    const medallionRgb = hexToRgb(gc.medallionHex, brandDeep)
    const gcFont = pdfFontFamilyForGiftCard(gc.fontName)

    // Card surface
    doc.setFillColor(...surfaceRgb)
    doc.roundedRect(margin, y, cardW, cardH, 11, 11, 'F')

    // Subtle right accent panel inset
    doc.setFillColor(...accentRgb)
    doc.roundedRect(margin + cardW * 0.58, y + 10, cardW * 0.38, cardH - 20, 9, 9, 'F')

    // Inner double luxury border frame
    doc.setDrawColor(233, 213, 255)
    doc.setLineWidth(0.7)
    doc.roundedRect(margin + 6, y + 6, cardW - 12, cardH - 12, 8, 8, 'S')
    doc.setDrawColor(...goldLight)
    doc.setLineWidth(0.55)
    doc.roundedRect(margin + 9, y + 9, cardW - 18, cardH - 18, 6, 6, 'S')

    // Right-side bespoke medallion motif
    const medX = margin + cardW - 52
    const medY = y + cardH / 2 + 2
    doc.setFillColor(...medallionRgb)
    doc.setDrawColor(...goldLight)
    doc.setLineWidth(1)
    doc.circle(medX, medY, 27, 'FD')
    doc.setDrawColor(248, 240, 252)
    doc.setLineWidth(0.55)
    doc.circle(medX, medY, 20, 'S')

    // 4-point botanical star inside medallion
    doc.setFillColor(...goldLight)
    doc.triangle(medX, medY - 13, medX - 4, medY, medX + 4, medY, 'F')
    doc.triangle(medX, medY + 13, medX - 4, medY, medX + 4, medY, 'F')
    doc.setFillColor(248, 240, 252)
    doc.triangle(medX - 13, medY, medX, medY - 3.5, medX, medY + 3.5, 'F')
    doc.triangle(medX + 13, medY, medX, medY - 3.5, medX, medY + 3.5, 'F')
    doc.setFillColor(...goldLight)
    doc.circle(medX, medY, 2.3, 'F')

    // Card header text (zero badges)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(255, 255, 255)
    doc.text('DERMASPACE', margin + 18, y + 26)
    doc.setFontSize(6.8)
    doc.setTextColor(...goldLight)
    doc.text('GIFT CARD', margin + cardW - 18, y + 25, { align: 'right' })

    // Recipient
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(235, 228, 242)
    doc.text('FOR', margin + 18, y + 52)
    doc.setFont(gcFont, 'bold')
    doc.setFontSize(11.5)
    doc.setTextColor(255, 255, 255)
    doc.text(gc.recipientName, margin + 18, y + 66, { maxWidth: 146 })

    // Amount
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(...goldLight)
    doc.text('VALUE', margin + 18, y + 88)
    doc.setFont(gcFont, 'bold')
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text(gc.amountFormatted, margin + 18, y + 106, { maxWidth: 150 })

    // Card bottom row (plain text, zero badges)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(245, 238, 250)
    doc.text(gc.editionLabel, margin + 18, y + cardH - 18, { maxWidth: 120 })
    if (gc.senderName) {
      doc.setFontSize(7.5)
      doc.setTextColor(235, 228, 242)
      doc.text(`From: ${gc.senderName}`, margin + cardW - 18, y + cardH - 18, {
        align: 'right',
        maxWidth: 108,
      })
    }

    // Right-hand Card Customisation Spec Panel
    doc.setFillColor(...brandSoft)
    doc.setDrawColor(...lavenderBorder)
    doc.setLineWidth(0.75)
    doc.roundedRect(specX, y, specW, cardH, 10, 10, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...brandPurple)
    doc.text('CARD CUSTOMISATION', specX + 14, y + 20)
    doc.setDrawColor(...lavenderBorder)
    doc.line(specX + 14, y + 26, specX + specW - 14, y + 26)

    // Color swatch + design name
    doc.setFillColor(...surfaceRgb)
    doc.rect(specX + 14, y + 36, 12, 12, 'F')
    doc.setFillColor(...accentRgb)
    doc.rect(specX + 26, y + 36, 7, 12, 'F')
    doc.setDrawColor(200, 200, 210)
    doc.rect(specX + 14, y + 36, 19, 12, 'S')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...mutedGray)
    doc.text('COLOUR THEME', specX + 40, y + 41)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...textDark)
    doc.text(gc.designName, specX + 40, y + 51, { maxWidth: specW - 54 })

    const specItems: Array<[string, string]> = [
      ['OCCASION EDITION', gc.editionLabel],
      ['TYPOGRAPHY', `${gc.fontName || 'Elegant'} Font`],
      ['VALIDITY', 'VI & Ikoyi · Never Expires'],
    ]
    let sy = y + 73
    for (const [lbl, val] of specItems) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.8)
      doc.setTextColor(...mutedGray)
      doc.text(lbl, specX + 14, sy)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...textDark)
      doc.text(val, specX + 14, sy + 11, { maxWidth: specW - 28 })
      sy += 27
    }

    y += visualH + 18
  }

  // Two-column metadata summary grid
  const rowCount = Math.ceil(data.summaryRows.length / 2)
  const rowHeight = 36
  const gridH = rowCount * rowHeight + 14
  y = ensureSpace(gridH + 20, y)

  doc.setDrawColor(...lineGray)
  doc.setFillColor(255, 255, 255)
  doc.setLineWidth(0.75)
  doc.roundedRect(margin, y, contentW, gridH, 9, 9, 'FD')

  const colW = contentW / 2
  doc.setDrawColor(...lineGray)
  doc.line(margin + colW, y + 10, margin + colW, y + gridH - 10)

  let gy = y + 18
  for (let i = 0; i < data.summaryRows.length; i += 2) {
    const left = data.summaryRows[i]
    const right = data.summaryRows[i + 1]

    if (i > 0) {
      doc.setDrawColor(244, 244, 245)
      doc.line(margin + 12, gy - 11, pageWidth - margin - 12, gy - 11)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(...mutedGray)
    doc.text(left.label.toUpperCase(), margin + 14, gy)
    if (right) {
      doc.text(right.label.toUpperCase(), margin + colW + 14, gy)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...textDark)
    doc.text(left.value, margin + 14, gy + 13, { maxWidth: colW - 26 })
    if (right) {
      doc.text(right.value, margin + colW + 14, gy + 13, { maxWidth: colW - 26 })
    }
    gy += rowHeight
  }
  y += gridH + 18

  // Itemized Summary Table
  if (data.lineItems && data.lineItems.length > 0) {
    y = ensureSpace(68, y)

    doc.setFillColor(...brandSoft)
    doc.setDrawColor(...lavenderBorder)
    doc.setLineWidth(0.6)
    doc.roundedRect(margin, y, contentW, 22, 5, 5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...brandPurple)
    doc.text('ITEM DESCRIPTION', margin + 12, y + 14)
    doc.text('AMOUNT', pageWidth - margin - 12, y + 14, { align: 'right' })
    y += 26

    const rowH = 38
    data.lineItems.forEach((item) => {
      y = ensureSpace(rowH + 12, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...textDark)
      doc.text(item.title, margin + 12, y + 14, { maxWidth: contentW * 0.68 })
      if (item.amount) {
        doc.text(item.amount, pageWidth - margin - 12, y + 14, { align: 'right' })
      }
      if (item.subtitle) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...mutedGray)
        doc.text(item.subtitle, margin + 12, y + 27, { maxWidth: contentW * 0.84 })
      }
      doc.setDrawColor(...lineGray)
      doc.line(margin, y + rowH - 2, pageWidth - margin, y + rowH - 2)
      y += rowH
    })
    y += 12
  }

  // Executive Total Paid Banner
  const totalCardH = 62
  y = ensureSpace(totalCardH + 22, y)

  doc.setFillColor(...brandDeep)
  doc.roundedRect(margin, y, contentW, totalCardH, 10, 10, 'F')
  // Left champagne gold accent stripe
  doc.setFillColor(...champagneGold)
  doc.roundedRect(margin, y, 6, totalCardH, 3, 3, 'F')
  doc.rect(margin + 3, y, 3, totalCardH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...goldLight)
  doc.text(data.amountLabel, margin + 20, y + 21)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.setTextColor(255, 255, 255)
  doc.text(data.amountFormatted, margin + 20, y + 46)

  if (data.paymentMethodLabel) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(255, 255, 255)
    doc.text(data.paymentMethodLabel, pageWidth - margin - 18, y + 25, {
      align: 'right',
    })
  }
  if (data.invoiceNumber) {
    doc.setFont('courier', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...goldLight)
    doc.text(data.invoiceNumber, pageWidth - margin - 18, y + 43, {
      align: 'right',
    })
  }
  y += totalCardH + 18

  // Personal Message Quote Card
  if (data.note) {
    const noteLines = doc.splitTextToSize(`"${data.note}"`, contentW - 32)
    const noteBoxH = noteLines.length * 13 + 32
    y = ensureSpace(noteBoxH + 16, y)

    doc.setFillColor(...brandSoft)
    doc.setDrawColor(...lavenderBorder)
    doc.setLineWidth(0.75)
    doc.roundedRect(margin, y, contentW, noteBoxH, 8, 8, 'FD')
    doc.setFillColor(...brandPurple)
    doc.rect(margin, y + 6, 3.5, noteBoxH - 12, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(...brandPurple)
    doc.text('PERSONAL MESSAGE', margin + 14, y + 17)

    doc.setFont('times', 'italic')
    doc.setFontSize(10.5)
    doc.setTextColor(...textGray)
    doc.text(noteLines, margin + 14, y + 32)
    y += noteBoxH + 16
  }

  // Closing Stamp + Footer
  y = ensureSpace(68, y)
  const footerY = Math.max(y + 18, pageHeight - 74)
  doc.setDrawColor(...lineGray)
  doc.setLineDashPattern([3, 3], 0)
  doc.line(margin, footerY, pageWidth - margin, footerY)
  doc.setLineDashPattern([], 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...brandPurple)
  doc.text('Crafted with care at Dermaspace', pageWidth / 2, footerY + 18, {
    align: 'center',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...mutedGray)
  doc.text(
    '237B Muri Okunola St, Victoria Island  ·  9 Agbeke Rotinwa Cl, Ikoyi',
    pageWidth / 2,
    footerY + 32,
    { align: 'center' },
  )
  doc.text(
    'dermaspaceng.com  ·  hello@dermaspaceng.com  ·  09013134945 / 09061836625',
    pageWidth / 2,
    footerY + 44,
    { align: 'center' },
  )

  doc.save(data.filename)
  return data.filename
}

export async function downloadTransactionReceiptPdf(
  tx: TransactionReceiptInput,
): Promise<string> {
  return downloadReceiptPdf(buildTransactionReceiptData(tx))
}

export async function downloadGiftCardReceiptPdf(
  input: GiftCardReceiptInput,
): Promise<string> {
  return downloadReceiptPdf(buildGiftCardReceiptData(input))
}
