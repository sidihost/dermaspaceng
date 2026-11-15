import { getGiftCardOccasionMeta } from './gift-card-templates'

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
  invoice?: {
    invoice_number?: string | null
  } | null
  giftCard?: {
    recipient_name?: string | null
    recipient_email?: string | null
    occasion?: string | null
    design?: string | null
    design_name?: string | null
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

function formatNairaPlain(amount: number, currency = 'NGN'): string {
  try {
    const formatted = new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount || 0))
    return currency.toUpperCase() === 'NGN' ? `NGN ${formatted}` : `${currency.toUpperCase()} ${formatted}`
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

function paymentMethodDisplay(method: TransactionReceiptInput['payment_method']): string {
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
  let note: string | null = null

  if (tx.giftCard) {
    const occasionMeta = getGiftCardOccasionMeta(tx.giftCard.occasion)
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
    if (tx.giftCard.occasion) {
      summaryRows.push({
        label: 'Occasion & Theme',
        value: `${tx.giftCard.occasion} (${occasionMeta.editionLabel})`,
      })
    }
    if (tx.giftCard.design_name || tx.giftCard.font_name) {
      summaryRows.push({
        label: 'Card Style',
        value: [tx.giftCard.design_name, tx.giftCard.font_name ? `${tx.giftCard.font_name} font` : null]
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
        subtitle: `For ${tx.giftCard.recipient_name || 'Recipient'}${tx.giftCard.design_name ? ` · ${tx.giftCard.design_name}` : ''}`,
        amount: amountFormatted,
      },
    ]
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
    note,
    filename: sanitizeReceiptFilename(ref),
  }
}

export function buildGiftCardReceiptData(
  input: GiftCardReceiptInput,
): ReceiptDocumentData {
  const occasionMeta = getGiftCardOccasionMeta(input.occasion)
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
        input.designName,
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
        subtitle: `${input.designName}${input.fontName ? ` · ${input.fontName} font` : ''}`,
        amount: amountText,
      },
    ],
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

export async function downloadReceiptPdf(
  data: ReceiptDocumentData,
): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentW = pageWidth - margin * 2

  const brandPurple: [number, number, number] = [123, 45, 142]
  const brandPurpleSoft: [number, number, number] = [246, 241, 248]
  const textDark: [number, number, number] = [24, 24, 27]
  const textGray: [number, number, number] = [55, 65, 81]
  const mutedGray: [number, number, number] = [113, 113, 122]
  const lineGray: [number, number, number] = [228, 228, 231]
  const stripeGray: [number, number, number] = [251, 249, 252]

  const { dataUrl: logoDataUrl, aspect: logoAspect } = await loadLogoPngDataUrl()

  // Flat hero band (zero gradients)
  const heroH = 104
  doc.setFillColor(...brandPurpleSoft)
  doc.rect(0, 0, pageWidth, heroH, 'F')

  if (logoDataUrl) {
    const logoH = 42
    const logoW = Math.min(logoH * logoAspect, contentW * 0.52)
    doc.addImage(
      logoDataUrl,
      'PNG',
      margin,
      (heroH - logoH) / 2,
      logoW,
      logoH,
      undefined,
      'FAST',
    )
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...brandPurple)
    doc.text('Dermaspace', margin, 56)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...mutedGray)
    doc.text('Esthetic & Wellness Centre', margin, 72)
  }

  const pillW = 112
  const pillH = 24
  const pillX = pageWidth - margin - pillW
  const pillY = 34
  doc.setFillColor(...brandPurple)
  doc.roundedRect(pillX, pillY, pillW, pillH, 12, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)
  doc.text('OFFICIAL RECEIPT', pillX + pillW / 2, pillY + 15.5, {
    align: 'center',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedGray)
  doc.text(`Issued ${data.issueDate}`, pageWidth - margin, pillY + pillH + 14, {
    align: 'right',
  })

  let y = heroH + 26

  // Reference & status row
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...mutedGray)
  doc.text('REFERENCE', margin, y)
  doc.text('STATUS', pageWidth - margin, y, { align: 'right' })
  y += 14

  doc.setFont('courier', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...brandPurple)
  doc.text(data.reference, margin, y, { maxWidth: contentW * 0.65 })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  const statusW = doc.getTextWidth(data.statusLabel) + 18
  doc.setFillColor(...brandPurpleSoft)
  doc.roundedRect(pageWidth - margin - statusW, y - 11, statusW, 17, 8.5, 8.5, 'F')
  doc.setTextColor(...brandPurple)
  doc.text(data.statusLabel, pageWidth - margin - 9, y + 0.5, { align: 'right' })

  y += 20
  doc.setDrawColor(...lineGray)
  doc.line(margin, y, pageWidth - margin, y)
  y += 20

  // Headline
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...brandPurple)
  doc.text(data.documentTitle, margin, y)
  y += 16

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...textDark)
  const headlineLines = doc.splitTextToSize(data.headline, contentW)
  doc.text(headlineLines, margin, y)
  y += headlineLines.length * 18 + 10

  // 2-column summary grid
  const rowCount = Math.ceil(data.summaryRows.length / 2)
  const gridH = rowCount * 38 + 16
  doc.setDrawColor(...lineGray)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin, y, contentW, gridH, 10, 10, 'FD')

  const colW = contentW / 2
  let gy = y + 18
  for (let i = 0; i < data.summaryRows.length; i += 2) {
    const left = data.summaryRows[i]
    const right = data.summaryRows[i + 1]

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...mutedGray)
    doc.text(left.label.toUpperCase(), margin + 14, gy)
    if (right) {
      doc.text(right.label.toUpperCase(), margin + colW + 8, gy)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...textDark)
    doc.text(left.value, margin + 14, gy + 14, { maxWidth: colW - 24 })
    if (right) {
      doc.text(right.value, margin + colW + 8, gy + 14, { maxWidth: colW - 24 })
    }
    gy += 38
  }
  y += gridH + 20

  // Line items if present
  if (data.lineItems && data.lineItems.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...brandPurple)
    doc.text('SUMMARY', margin, y)
    y += 10
    doc.setDrawColor(...lineGray)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6

    const rowH = 36
    data.lineItems.forEach((item, idx) => {
      if (y > pageHeight - 170) {
        doc.addPage()
        y = margin
      }
      if (idx % 2 === 1) {
        doc.setFillColor(...stripeGray)
        doc.rect(margin, y, contentW, rowH, 'F')
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...textDark)
      doc.text(item.title, margin + 8, y + 15, { maxWidth: contentW * 0.68 })
      if (item.amount) {
        doc.text(item.amount, pageWidth - margin - 8, y + 15, { align: 'right' })
      }
      if (item.subtitle) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...mutedGray)
        doc.text(item.subtitle, margin + 8, y + 28, { maxWidth: contentW * 0.85 })
      }
      y += rowH
    })
    y += 14
  }

  // Total box (flat purple)
  const totalCardH = 62
  doc.setFillColor(...brandPurple)
  doc.roundedRect(margin, y, contentW, totalCardH, 12, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(data.amountLabel, margin + 18, y + 21)
  doc.setFontSize(21)
  doc.text(data.amountFormatted, margin + 18, y + 46)

  if (data.paymentMethodLabel) {
    doc.setFontSize(9)
    doc.text(data.paymentMethodLabel, pageWidth - margin - 18, y + 24, {
      align: 'right',
    })
  }
  if (data.invoiceNumber) {
    doc.setFont('courier', 'normal')
    doc.setFontSize(8.5)
    doc.text(data.invoiceNumber, pageWidth - margin - 18, y + 43, {
      align: 'right',
    })
  }
  y += totalCardH + 20

  // Personal message if present
  if (data.note) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...brandPurple)
    doc.text('PERSONAL MESSAGE', margin, y)
    y += 13
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...textGray)
    const noteLines = doc.splitTextToSize(`"${data.note}"`, contentW)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 13 + 16
  }

  // Clinic closing stamp
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...brandPurple)
  doc.text('Crafted with care at Dermaspace', pageWidth / 2, y + 10, {
    align: 'center',
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedGray)
  doc.text(
    '237B Muri Okunola St, Victoria Island  |  9 Agbeke Rotinwa Cl, Ikoyi',
    pageWidth / 2,
    y + 25,
    { align: 'center' },
  )

  const footerY = Math.max(y + 46, pageHeight - 56)
  doc.setDrawColor(...lineGray)
  doc.setLineDashPattern([3, 3], 0)
  doc.line(margin, footerY, pageWidth - margin, footerY)
  doc.setLineDashPattern([], 0)
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedGray)
  doc.text(
    'Dermaspace Esthetic & Wellness Centre  |  hello@dermaspaceng.com',
    pageWidth / 2,
    footerY + 18,
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
