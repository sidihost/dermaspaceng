import QRCode from 'qrcode'
import {
  findGiftCardDesignById,
  getDesignMedallionHex,
  getGiftCardOccasionMeta,
  resolveOccasionMotif,
  type GiftCardOccasionMotif,
} from './gift-card-templates'
import { buildGiftCardVerificationUrl } from './gift-card-code-helpers'

export const CR80_SPEC = {
  trimWidthMm: 85.6,
  trimHeightMm: 53.98,
  bleedMm: 3,
  safeInsetMm: 5,
  cornerRadiusMm: 3.18,
  get bleedWidthMm() {
    return Number((this.trimWidthMm + this.bleedMm * 2).toFixed(2))
  },
  get bleedHeightMm() {
    return Number((this.trimHeightMm + this.bleedMm * 2).toFixed(2))
  },
} as const

export interface Cr80BleedGeometry {
  pageWidthMm: number
  pageHeightMm: number
  bleedMm: number
  trimX: number
  trimY: number
  trimWidthMm: number
  trimHeightMm: number
  safeX: number
  safeY: number
  safeWidthMm: number
  safeHeightMm: number
}

export interface A4CutSheetGeometry {
  pageWidthMm: number
  pageHeightMm: number
  frontBleedX: number
  frontBleedY: number
  frontTrimX: number
  frontTrimY: number
  backBleedX: number
  backBleedY: number
  backTrimX: number
  backTrimY: number
  bleedWidthMm: number
  bleedHeightMm: number
  trimWidthMm: number
  trimHeightMm: number
}

export function computeCr80BleedGeometry(): Cr80BleedGeometry {
  const { trimWidthMm, trimHeightMm, bleedMm, safeInsetMm } = CR80_SPEC
  return {
    pageWidthMm: Number((trimWidthMm + bleedMm * 2).toFixed(2)),
    pageHeightMm: Number((trimHeightMm + bleedMm * 2).toFixed(2)),
    bleedMm,
    trimX: bleedMm,
    trimY: bleedMm,
    trimWidthMm,
    trimHeightMm,
    safeX: bleedMm + safeInsetMm,
    safeY: bleedMm + safeInsetMm,
    safeWidthMm: Number((trimWidthMm - safeInsetMm * 2).toFixed(2)),
    safeHeightMm: Number((trimHeightMm - safeInsetMm * 2).toFixed(2)),
  }
}

export function computeA4CutSheetGeometry(): A4CutSheetGeometry {
  const pageWidthMm = 210
  const pageHeightMm = 297
  const cr80 = computeCr80BleedGeometry()
  const centeredBleedX = Number(((pageWidthMm - cr80.pageWidthMm) / 2).toFixed(2))
  const frontBleedY = 66
  const backBleedY = 148

  return {
    pageWidthMm,
    pageHeightMm,
    frontBleedX: centeredBleedX,
    frontBleedY,
    frontTrimX: Number((centeredBleedX + cr80.bleedMm).toFixed(2)),
    frontTrimY: Number((frontBleedY + cr80.bleedMm).toFixed(2)),
    backBleedX: centeredBleedX,
    backBleedY,
    backTrimX: Number((centeredBleedX + cr80.bleedMm).toFixed(2)),
    backTrimY: Number((backBleedY + cr80.bleedMm).toFixed(2)),
    bleedWidthMm: cr80.pageWidthMm,
    bleedHeightMm: cr80.pageHeightMm,
    trimWidthMm: cr80.trimWidthMm,
    trimHeightMm: cr80.trimHeightMm,
  }
}

export function formatCardAmountForPdf(amount: number): string {
  const rounded = Math.max(0, Math.round(Number(amount) || 0))
  try {
    return `NGN ${new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rounded)}`
  } catch {
    return `NGN ${rounded}`
  }
}

export function sanitizeGiftCardPrintFilename(
  serialOrCode: string,
  format: 'press-cr80' | 'a4-sheet',
): string {
  const cleaned = (serialOrCode || 'Dermaspace')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  const suffix = format === 'press-cr80' ? 'Print-CR80-Bleed' : 'A4-Cut-Sheet'
  return `Dermaspace-GiftCard-${cleaned || 'Card'}-${suffix}.pdf`
}

export interface GiftCardPrintInput {
  id: number
  verificationCode: string
  verificationBaseUrl?: string
  amount: number
  designId?: string | null
  designName?: string | null
  occasion?: string | null
  fontId?: string | null
  fontName?: string | null
  recipientName: string
  senderName?: string | null
  personalMessage?: string | null
  issuedAt?: string | null
}

function hexToRgb(
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
  return fallback
}

function pdfFontForCard(fontIdOrName?: string | null): 'times' | 'helvetica' | 'courier' {
  const lower = (fontIdOrName || '').toLowerCase()
  if (lower.includes('modern') || lower.includes('sans')) return 'helvetica'
  if (lower.includes('playful') || lower.includes('mono')) return 'courier'
  return 'times'
}

async function loadBrandLogos(): Promise<{
  whiteLogo: string | null
  purpleLogo: string | null
  aspect: number
}> {
  let whiteLogo: string | null = null
  let purpleLogo: string | null = null
  let aspect = 130 / 32

  try {
    const res = await fetch('/images/dermaspace-header-logo.png', {
      mode: 'same-origin',
    })
    if (!res.ok) return { whiteLogo, purpleLogo, aspect }
    const blob = await res.blob()
    if (typeof createImageBitmap !== 'function') {
      return { whiteLogo, purpleLogo, aspect }
    }
    const bitmap = await createImageBitmap(blob)
    const targetW = Math.min(bitmap.width, 720)
    const targetH = Math.max(1, Math.round((bitmap.height / bitmap.width) * targetW))
    aspect = bitmap.width / bitmap.height

    const colorCanvas = document.createElement('canvas')
    colorCanvas.width = targetW
    colorCanvas.height = targetH
    const colorCtx = colorCanvas.getContext('2d')
    if (colorCtx) {
      colorCtx.drawImage(bitmap, 0, 0, targetW, targetH)
      purpleLogo = colorCanvas.toDataURL('image/png')
    }

    const whiteCanvas = document.createElement('canvas')
    whiteCanvas.width = targetW
    whiteCanvas.height = targetH
    const whiteCtx = whiteCanvas.getContext('2d')
    if (whiteCtx) {
      whiteCtx.drawImage(bitmap, 0, 0, targetW, targetH)
      whiteCtx.globalCompositeOperation = 'source-in'
      whiteCtx.fillStyle = '#FFFFFF'
      whiteCtx.fillRect(0, 0, targetW, targetH)
      whiteLogo = whiteCanvas.toDataURL('image/png')
    }
  } catch {
    // Graceful text fallback when image decode is unavailable
  }

  return { whiteLogo, purpleLogo, aspect }
}

type JsPdfInstance = InstanceType<(typeof import('jspdf'))['jsPDF']>

function drawCropMarks(
  doc: JsPdfInstance,
  trimX: number,
  trimY: number,
  trimW: number,
  trimH: number,
  bleedMm: number,
  color: [number, number, number] = [24, 24, 27],
) {
  const offset = 0.6
  const markLen = Math.max(1.8, bleedMm - offset)
  doc.setDrawColor(...color)
  doc.setLineWidth(0.18)

  // Top-left
  doc.line(trimX - bleedMm, trimY, trimX - offset, trimY)
  doc.line(trimX, trimY - bleedMm, trimX, trimY - offset)
  // Top-right
  doc.line(trimX + trimW + offset, trimY, trimX + trimW + bleedMm, trimY)
  doc.line(trimX + trimW, trimY - bleedMm, trimX + trimW, trimY - offset)
  // Bottom-left
  doc.line(trimX - bleedMm, trimY + trimH, trimX - offset, trimY + trimH)
  doc.line(trimX, trimY + trimH + offset, trimX, trimY + trimH + markLen + offset)
  // Bottom-right
  doc.line(
    trimX + trimW + offset,
    trimY + trimH,
    trimX + trimW + bleedMm,
    trimY + trimH,
  )
  doc.line(
    trimX + trimW,
    trimY + trimH + offset,
    trimX + trimW,
    trimY + trimH + markLen + offset,
  )
}

function drawFrontMotifVector(
  doc: JsPdfInstance,
  cx: number,
  cy: number,
  motif: GiftCardOccasionMotif,
  medallionRgb: [number, number, number],
  accentRgb: [number, number, number],
) {
  const gold: [number, number, number] = [229, 200, 150]
  const cream: [number, number, number] = [248, 240, 252]
  const blush: [number, number, number] = [249, 213, 229]
  const sage: [number, number, number] = [167, 215, 197]

  // Outer medallion halo
  doc.setFillColor(...medallionRgb)
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.38)
  doc.circle(cx, cy, 10.2, 'FD')

  doc.setDrawColor(...cream)
  doc.setLineWidth(0.18)
  doc.circle(cx, cy, 8.2, 'S')

  switch (motif) {
    case 'christmas': {
      // Crisp 6-branch snowflake star
      doc.setDrawColor(...cream)
      doc.setLineWidth(0.4)
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI) / 3
        const dx = Math.cos(angle) * 5.4
        const dy = Math.sin(angle) * 5.4
        doc.line(cx - dx, cy - dy, cx + dx, cy + dy)
      }
      doc.setFillColor(...gold)
      doc.circle(cx, cy, 1.3, 'F')
      break
    }
    case 'birthday': {
      // Tiered celebration silhouette + candle dots
      doc.setFillColor(...cream)
      doc.roundedRect(cx - 5, cy + 0.5, 10, 3.6, 0.7, 0.7, 'F')
      doc.setFillColor(...blush)
      doc.roundedRect(cx - 3.5, cy - 2.6, 7, 3.1, 0.6, 0.6, 'F')
      doc.setFillColor(...gold)
      doc.rect(cx - 5, cy + 4.3, 10, 0.8, 'F')
      for (const offset of [-2, 0, 2]) {
        doc.setFillColor(...cream)
        doc.rect(cx + offset - 0.3, cy - 4.7, 0.6, 2.1, 'F')
        doc.setFillColor(...gold)
        doc.circle(cx + offset, cy - 5.4, 0.6, 'F')
      }
      break
    }
    case 'anniversary':
    case 'wedding': {
      // Interlocking metallic rings + diamond crown
      doc.setDrawColor(...gold)
      doc.setLineWidth(0.65)
      doc.circle(cx - 2.1, cy + 0.4, 3.6, 'S')
      doc.setDrawColor(...cream)
      doc.setLineWidth(0.65)
      doc.circle(cx + 2.1, cy + 0.4, 3.6, 'S')
      doc.setFillColor(...cream)
      doc.triangle(cx, cy - 6.2, cx - 1.5, cy - 4.5, cx + 1.5, cy - 4.5, 'F')
      doc.triangle(cx, cy - 2.8, cx - 1.5, cy - 4.5, cx + 1.5, cy - 4.5, 'F')
      break
    }
    case 'valentines': {
      // Twin overlapping stylized hearts
      doc.setFillColor(212, 87, 122)
      doc.circle(cx - 2.0, cy - 1.2, 2.3, 'F')
      doc.circle(cx + 2.0, cy - 1.2, 2.3, 'F')
      doc.triangle(cx - 4.2, cy - 0.4, cx + 4.2, cy - 0.4, cx, cy + 4.8, 'F')
      doc.setFillColor(...gold)
      doc.circle(cx - 1.8, cy - 1.5, 0.6, 'F')
      break
    }
    case 'self-care': {
      // Serene lotus petals
      doc.setFillColor(...sage)
      doc.ellipse(cx - 2.8, cy + 1.2, 3.1, 1.4, 'F')
      doc.ellipse(cx + 2.8, cy + 1.2, 3.1, 1.4, 'F')
      doc.setFillColor(...cream)
      doc.ellipse(cx, cy - 1.0, 2.1, 4.3, 'F')
      doc.setFillColor(...gold)
      doc.circle(cx, cy - 1.0, 1.0, 'F')
      break
    }
    case 'thank-you':
    case 'mothers-day': {
      // Blooming botanical rosette
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        const px = cx + Math.cos(angle) * 3.1
        const py = cy + Math.sin(angle) * 3.1
        doc.setFillColor(...(i % 2 === 0 ? blush : cream))
        doc.circle(px, py, 1.85, 'F')
      }
      doc.setFillColor(...gold)
      doc.circle(cx, cy, 1.6, 'F')
      break
    }
    case 'just-because': {
      // Wrapped gift box with ribbon bow
      doc.setFillColor(...cream)
      doc.roundedRect(cx - 4.2, cy - 1.2, 8.4, 6, 0.8, 0.8, 'F')
      doc.setFillColor(...gold)
      doc.rect(cx - 0.7, cy - 2.3, 1.4, 7.1, 'F')
      doc.setFillColor(...accentRgb)
      doc.rect(cx - 4.2, cy + 1.4, 8.4, 1.1, 'F')
      doc.setFillColor(...gold)
      doc.circle(cx - 1.7, cy - 3.3, 1.2, 'F')
      doc.circle(cx + 1.7, cy - 3.3, 1.2, 'F')
      break
    }
    case 'classic':
    default: {
      // Luxury 4-point botanical star crest
      doc.setFillColor(...gold)
      doc.triangle(cx, cy - 5.8, cx - 1.5, cy, cx + 1.5, cy, 'F')
      doc.triangle(cx, cy + 5.8, cx - 1.5, cy, cx + 1.5, cy, 'F')
      doc.setFillColor(...cream)
      doc.triangle(cx - 5.8, cy, cx, cy - 1.5, cx, cy + 1.5, 'F')
      doc.triangle(cx + 5.8, cy, cx, cy - 1.5, cx, cy + 1.5, 'F')
      doc.setFillColor(...gold)
      doc.circle(cx, cy, 1.0, 'F')
      break
    }
  }
}

function renderCardFrontAt(
  doc: JsPdfInstance,
  bleedX: number,
  bleedY: number,
  trimX: number,
  trimY: number,
  input: GiftCardPrintInput,
  whiteLogo: string | null,
  logoAspect: number,
) {
  const { bleedWidthMm, bleedHeightMm, trimWidthMm, trimHeightMm } = CR80_SPEC
  const design = findGiftCardDesignById(input.designId || input.designName)
  const occasionMeta = getGiftCardOccasionMeta(input.occasion)
  const motif = resolveOccasionMotif(input.occasion, design.id)
  const surfaceRgb = hexToRgb(design.surfaceHex, [123, 45, 142])
  const accentRgb = hexToRgb(design.accentHex, [155, 77, 176])
  const medallionRgb = hexToRgb(getDesignMedallionHex(design), [74, 21, 88])
  const cardFont = pdfFontForCard(input.fontId || input.fontName)
  const goldRgb: [number, number, number] = [229, 200, 150]
  const lightLavender: [number, number, number] = [233, 213, 255]

  // 1. Full-bleed background fill
  doc.setFillColor(...surfaceRgb)
  doc.rect(bleedX, bleedY, bleedWidthMm, bleedHeightMm, 'F')

  // 2. Architectural right panel extending to top/right/bottom bleed
  const rightPanelX = trimX + trimWidthMm * 0.56
  doc.setFillColor(...accentRgb)
  doc.rect(
    rightPanelX,
    bleedY,
    bleedX + bleedWidthMm - rightPanelX,
    bleedHeightMm,
    'F',
  )

  // Subtle deeper inlay on far right
  const innerRightX = trimX + trimWidthMm * 0.65
  doc.setFillColor(...medallionRgb)
  doc.rect(
    innerRightX,
    bleedY,
    bleedX + bleedWidthMm - innerRightX,
    bleedHeightMm,
    'F',
  )

  // Vertical champagne accent line dividing content & emblem wing
  doc.setDrawColor(...goldRgb)
  doc.setLineWidth(0.22)
  doc.line(rightPanelX, trimY + 3.2, rightPanelX, trimY + trimHeightMm - 3.2)

  // 3. Double luxury metallic frame strictly inside trim bounds
  doc.setDrawColor(...lightLavender)
  doc.setLineWidth(0.24)
  doc.roundedRect(
    trimX + 2.2,
    trimY + 2.2,
    trimWidthMm - 4.4,
    trimHeightMm - 4.4,
    2.2,
    2.2,
    'S',
  )
  doc.setDrawColor(...goldRgb)
  doc.setLineWidth(0.18)
  doc.roundedRect(
    trimX + 3.1,
    trimY + 3.1,
    trimWidthMm - 6.2,
    trimHeightMm - 6.2,
    1.6,
    1.6,
    'S',
  )

  // 4. Right-wing bespoke occasion medallion
  drawFrontMotifVector(
    doc,
    trimX + trimWidthMm * 0.785,
    trimY + trimHeightMm * 0.52,
    motif,
    medallionRgb,
    accentRgb,
  )

  // 5. Left content zone (inside 5mm safe margin)
  const safeX = trimX + CR80_SPEC.safeInsetMm
  const safeY = trimY + CR80_SPEC.safeInsetMm
  const safeRight = trimX + trimWidthMm - CR80_SPEC.safeInsetMm
  const leftMaxW = rightPanelX - safeX - 3

  // Top brand bar
  if (whiteLogo) {
    const logoH = 5.4
    const logoW = Math.min(logoH * logoAspect, 27)
    doc.addImage(whiteLogo, 'PNG', safeX, safeY - 0.6, logoW, logoH, undefined, 'FAST')
  } else {
    doc.setFont('times', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(255, 255, 255)
    doc.text('DERMASPACE', safeX, safeY + 3.4)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(...goldRgb)
  doc.text('GIFT CARD', safeRight, safeY + 2.4, { align: 'right' })

  // Recipient block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.2)
  doc.setTextColor(...goldRgb)
  doc.text('PRESENTED TO', safeX, safeY + 13.5)

  doc.setFont(cardFont, 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(255, 255, 255)
  doc.text((input.recipientName || 'Recipient').trim(), safeX, safeY + 18.2, {
    maxWidth: leftMaxW,
  })

  // Value block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.2)
  doc.setTextColor(228, 220, 238)
  doc.text('CARD VALUE', safeX, safeY + 25.5)

  doc.setFont(cardFont, 'bold')
  doc.setFontSize(15.5)
  doc.setTextColor(255, 255, 255)
  doc.text(formatCardAmountForPdf(input.amount), safeX, safeY + 32.0, {
    maxWidth: leftMaxW,
  })

  // Bottom footer bar inside safe bounds
  const bottomRuleY = trimY + trimHeightMm - 9.2
  doc.setDrawColor(...goldRgb)
  doc.setLineWidth(0.16)
  doc.line(safeX, bottomRuleY, safeRight, bottomRuleY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.8)
  doc.setTextColor(248, 240, 252)
  doc.text(occasionMeta.editionLabel.toUpperCase(), safeX, bottomRuleY + 3.4, {
    maxWidth: leftMaxW,
  })

  if (input.senderName?.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.8)
    doc.setTextColor(...goldRgb)
    doc.text(`From: ${input.senderName.trim()}`, safeRight, bottomRuleY + 3.4, {
      align: 'right',
      maxWidth: 34,
    })
  }
}

function renderCardBackAt(
  doc: JsPdfInstance,
  bleedX: number,
  bleedY: number,
  trimX: number,
  trimY: number,
  input: GiftCardPrintInput,
  whiteLogo: string | null,
  logoAspect: number,
  qrDataUrl: string,
) {
  const { bleedWidthMm, bleedHeightMm, trimWidthMm, trimHeightMm, bleedMm } = CR80_SPEC
  const design = findGiftCardDesignById(input.designId || input.designName)
  const surfaceRgb = hexToRgb(design.surfaceHex, [123, 45, 142])
  const medallionRgb = hexToRgb(getDesignMedallionHex(design), [74, 21, 88])
  const cardFont = pdfFontForCard(input.fontId || input.fontName)
  const goldRgb: [number, number, number] = [212, 179, 119]
  const porcelainRgb: [number, number, number] = [252, 250, 253]
  const lavenderSurface: [number, number, number] = [247, 242, 250]
  const textDark: [number, number, number] = [26, 13, 31]
  const textMuted: [number, number, number] = [88, 76, 98]

  // 1. Full-bleed warm porcelain background
  doc.setFillColor(...porcelainRgb)
  doc.rect(bleedX, bleedY, bleedWidthMm, bleedHeightMm, 'F')

  // 2. Top plum/theme band extending smoothly into top/left/right bleed
  const headerBottomY = trimY + 11.4
  doc.setFillColor(...surfaceRgb)
  doc.rect(bleedX, bleedY, bleedWidthMm, headerBottomY - bleedY, 'F')

  // Metallic champagne accent rule under top band (full bleed width)
  doc.setFillColor(...goldRgb)
  doc.rect(bleedX, headerBottomY, bleedWidthMm, 0.85, 'F')

  // Subtle champagne inner frame inside card trim
  doc.setDrawColor(...goldRgb)
  doc.setLineWidth(0.22)
  doc.roundedRect(
    trimX + 2.5,
    headerBottomY + 2.6,
    trimWidthMm - 5,
    trimY + trimHeightMm - headerBottomY - 5.1,
    1.6,
    1.6,
    'S',
  )

  const safeX = trimX + CR80_SPEC.safeInsetMm
  const safeRight = trimX + trimWidthMm - CR80_SPEC.safeInsetMm

  // Header strip text & white logo
  if (whiteLogo) {
    const logoH = 4.6
    const logoW = Math.min(logoH * logoAspect, 23)
    doc.addImage(whiteLogo, 'PNG', safeX, trimY + 3.4, logoW, logoH, undefined, 'FAST')
  } else {
    doc.setFont('times', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(255, 255, 255)
    doc.text('DERMASPACE', safeX, trimY + 6.9)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.9)
  doc.setTextColor(229, 200, 150)
  doc.text('AUTHORIZED GIFT CARD', safeRight, trimY + 5.1, { align: 'right' })

  doc.setFont('courier', 'bold')
  doc.setFontSize(6.1)
  doc.setTextColor(255, 255, 255)
  doc.text(input.verificationCode, safeRight, trimY + 8.4, { align: 'right' })

  // 3. Body Grid: Left Message & Terms | Right QR Validation Box
  const bodyTopY = headerBottomY + 4.4
  const footerTopY = trimY + trimHeightMm - 8.4

  // Right QR Box
  const qrBoxW = 24.4
  const qrBoxH = footerTopY - bodyTopY - 1.5
  const qrBoxX = safeRight - qrBoxW

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...surfaceRgb)
  doc.setLineWidth(0.28)
  doc.roundedRect(qrBoxX, bodyTopY, qrBoxW, qrBoxH, 1.5, 1.5, 'FD')

  const qrSize = 18.8
  const qrImgX = qrBoxX + (qrBoxW - qrSize) / 2
  const qrImgY = bodyTopY + 1.8
  doc.addImage(qrDataUrl, 'PNG', qrImgX, qrImgY, qrSize, qrSize, undefined, 'FAST')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.7)
  doc.setTextColor(...surfaceRgb)
  doc.text('SCAN TO VERIFY', qrBoxX + qrBoxW / 2, qrImgY + qrSize + 2.6, {
    align: 'center',
  })

  doc.setFont('courier', 'bold')
  doc.setFontSize(4.4)
  doc.setTextColor(...textMuted)
  doc.text(input.verificationCode, qrBoxX + qrBoxW / 2, qrImgY + qrSize + 4.9, {
    align: 'center',
    maxWidth: qrBoxW - 2,
  })

  // Left Editorial Column
  const leftColW = qrBoxX - safeX - 3.6
  const msgBoxH = 13.8

  doc.setFillColor(...lavenderSurface)
  doc.setDrawColor(225, 212, 234)
  doc.setLineWidth(0.2)
  doc.roundedRect(safeX, bodyTopY, leftColW, msgBoxH, 1.4, 1.4, 'FD')

  doc.setFillColor(...surfaceRgb)
  doc.rect(safeX, bodyTopY + 1.6, 0.9, msgBoxH - 3.2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.6)
  doc.setTextColor(...surfaceRgb)
  doc.text(
    input.personalMessage?.trim() ? 'PERSONAL MESSAGE' : 'DERMASPACE SANCTUARY',
    safeX + 2.4,
    bodyTopY + 3.2,
  )

  const noteText =
    input.personalMessage?.trim() ||
    'An invitation to rest, restore, and glow at Dermaspace Esthetic & Wellness Centre.'
  doc.setFont(cardFont, 'italic')
  doc.setFontSize(6.0)
  doc.setTextColor(...textDark)
  const wrappedNote = doc.splitTextToSize(`"${noteText}"`, leftColW - 4.4).slice(0, 3)
  doc.text(wrappedNote, safeX + 2.4, bodyTopY + 6.1)

  if (input.senderName?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5)
    doc.setTextColor(...medallionRgb)
    doc.text(`— ${input.senderName.trim()}`, safeX + leftColW - 2, bodyTopY + msgBoxH - 1.6, {
      align: 'right',
      maxWidth: leftColW - 4,
    })
  }

  // Redemption terms below message box
  const termsY = bodyTopY + msgBoxH + 3.0
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.7)
  doc.setTextColor(...textDark)
  doc.text('HOW TO REDEEM', safeX, termsY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.6)
  doc.setTextColor(...textMuted)
  doc.text('• Present card at Victoria Island or Ikoyi reception.', safeX, termsY + 2.5, {
    maxWidth: leftColW,
  })
  doc.text('• Valid on all spa treatments & rituals · Never expires.', safeX, termsY + 4.9, {
    maxWidth: leftColW,
  })

  // 4. Bottom Branch Footer
  doc.setDrawColor(225, 212, 234)
  doc.setLineWidth(0.2)
  doc.line(safeX, footerTopY, safeRight, footerTopY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.8)
  doc.setTextColor(...textDark)
  doc.text(
    '237B Muri Okunola St, VI  ·  9 Agbeke Rotinwa Cl, Ikoyi',
    safeX,
    footerTopY + 3.1,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.8)
  doc.setTextColor(...surfaceRgb)
  doc.text('dermaspaceng.com', safeRight, footerTopY + 3.1, { align: 'right' })

  // Silence unused bleedMm lint note by checking consistency
  void bleedMm
}

async function createHighResQrPng(verificationUrl: string): Promise<string> {
  return QRCode.toDataURL(verificationUrl, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#1a0d1f',
      light: '#FFFFFF',
    },
  })
}

export async function generateGiftCardPrintShopPdfBlob(
  input: GiftCardPrintInput,
): Promise<{ blob: Blob; filename: string; verificationUrl: string }> {
  const { jsPDF } = await import('jspdf')
  const cr80 = computeCr80BleedGeometry()
  const baseUrl =
    input.verificationBaseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://dermaspaceng.com')
  const verificationUrl = buildGiftCardVerificationUrl(baseUrl, input.verificationCode)

  const [{ whiteLogo, aspect }, qrDataUrl] = await Promise.all([
    loadBrandLogos(),
    createHighResQrPng(verificationUrl),
  ])

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [cr80.pageWidthMm, cr80.pageHeightMm],
    compress: true,
  })

  // Page 1: Print-Ready Front (Full Bleed + Corner Trim Marks)
  renderCardFrontAt(
    doc,
    0,
    0,
    cr80.trimX,
    cr80.trimY,
    input,
    whiteLogo,
    aspect,
  )
  drawCropMarks(
    doc,
    cr80.trimX,
    cr80.trimY,
    cr80.trimWidthMm,
    cr80.trimHeightMm,
    cr80.bleedMm,
    [255, 255, 255],
  )

  // Page 2: Print-Ready Back with Scannable QR (Full Bleed + Corner Trim Marks)
  doc.addPage([cr80.pageWidthMm, cr80.pageHeightMm], 'landscape')
  renderCardBackAt(
    doc,
    0,
    0,
    cr80.trimX,
    cr80.trimY,
    input,
    whiteLogo,
    aspect,
    qrDataUrl,
  )
  drawCropMarks(
    doc,
    cr80.trimX,
    cr80.trimY,
    cr80.trimWidthMm,
    cr80.trimHeightMm,
    cr80.bleedMm,
    [24, 24, 27],
  )

  const filename = sanitizeGiftCardPrintFilename(input.verificationCode, 'press-cr80')
  return {
    blob: doc.output('blob'),
    filename,
    verificationUrl,
  }
}

export async function generateGiftCardA4CutSheetPdfBlob(
  input: GiftCardPrintInput,
): Promise<{ blob: Blob; filename: string; verificationUrl: string }> {
  const { jsPDF } = await import('jspdf')
  const sheet = computeA4CutSheetGeometry()
  const baseUrl =
    input.verificationBaseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://dermaspaceng.com')
  const verificationUrl = buildGiftCardVerificationUrl(baseUrl, input.verificationCode)

  const [{ whiteLogo, purpleLogo, aspect }, qrDataUrl] = await Promise.all([
    loadBrandLogos(),
    createHighResQrPng(verificationUrl),
  ])

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const marginX = 18
  const contentW = sheet.pageWidthMm - marginX * 2
  const brandDeep: [number, number, number] = [74, 21, 88]
  const brandPurple: [number, number, number] = [123, 45, 142]
  const gold: [number, number, number] = [212, 179, 119]
  const borderGray: [number, number, number] = [228, 228, 231]
  const softLavender: [number, number, number] = [250, 246, 251]
  const textDark: [number, number, number] = [26, 13, 31]
  const mutedGray: [number, number, number] = [107, 114, 128]

  // Top brand stripe
  doc.setFillColor(...brandDeep)
  doc.rect(0, 0, sheet.pageWidthMm, 2.5, 'F')
  doc.setFillColor(...gold)
  doc.rect(0, 2.5, sheet.pageWidthMm, 0.7, 'F')

  // Header masthead
  if (purpleLogo) {
    const logoH = 10
    const logoW = Math.min(logoH * aspect, 52)
    doc.addImage(purpleLogo, 'PNG', marginX, 12, logoW, logoH, undefined, 'FAST')
  } else {
    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...brandPurple)
    doc.text('Dermaspace', marginX, 20)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...brandPurple)
  doc.text('PRINT-READY GIFT CARD PRODUCTION SHEET', sheet.pageWidthMm - marginX, 15.5, {
    align: 'right',
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...mutedGray)
  doc.text(
    'Print at 100% / Actual Size · CR80 Standard (85.6 × 53.98 mm) · 3 mm Bleed',
    sheet.pageWidthMm - marginX,
    20.5,
    { align: 'right' },
  )

  // Production Spec Card
  doc.setFillColor(...softLavender)
  doc.setDrawColor(...borderGray)
  doc.setLineWidth(0.3)
  doc.roundedRect(marginX, 28, contentW, 24, 2.5, 2.5, 'FD')

  const design = findGiftCardDesignById(input.designId || input.designName)
  const specCols = [
    { label: 'SERIAL / VERIFY CODE', value: input.verificationCode, mono: true },
    { label: 'RECIPIENT', value: input.recipientName || 'Recipient', mono: false },
    { label: 'CARD VALUE', value: formatCardAmountForPdf(input.amount), mono: false },
    { label: 'THEME & STOCK', value: `${design.name} · 350–400gsm Silk`, mono: false },
  ]
  const colW = contentW / 4
  specCols.forEach((col, idx) => {
    const cx = marginX + idx * colW + 4
    if (idx > 0) {
      doc.setDrawColor(...borderGray)
      doc.line(marginX + idx * colW, 32, marginX + idx * colW, 48)
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.2)
    doc.setTextColor(...mutedGray)
    doc.text(col.label, cx, 36.5)

    doc.setFont(col.mono ? 'courier' : 'helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(...textDark)
    doc.text(col.value, cx, 43, { maxWidth: colW - 8 })
  })

  // Side 1 Label + Front Card (1:1 Physical Scale with Bleed & Crop Marks)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...brandDeep)
  doc.text('SIDE 1 — FRONT ARTWORK (1:1 ACTUAL PRINT SCALE)', sheet.pageWidthMm / 2, 61, {
    align: 'center',
  })

  renderCardFrontAt(
    doc,
    sheet.frontBleedX,
    sheet.frontBleedY,
    sheet.frontTrimX,
    sheet.frontTrimY,
    input,
    whiteLogo,
    aspect,
  )
  drawCropMarks(
    doc,
    sheet.frontTrimX,
    sheet.frontTrimY,
    sheet.trimWidthMm,
    sheet.trimHeightMm,
    CR80_SPEC.bleedMm,
    [24, 24, 27],
  )
  // Subtle dashed cut-line guide outside card for manual cutting
  doc.setDrawColor(160, 160, 170)
  doc.setLineDashPattern([1.2, 1.2], 0)
  doc.setLineWidth(0.18)
  doc.rect(
    sheet.frontTrimX,
    sheet.frontTrimY,
    sheet.trimWidthMm,
    sheet.trimHeightMm,
    'S',
  )
  doc.setLineDashPattern([], 0)

  // Side 2 Label + Back Card (1:1 Physical Scale with Bleed & Crop Marks)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...brandDeep)
  doc.text(
    'SIDE 2 — BACK ARTWORK & SCANNABLE QR VERIFICATION (1:1 ACTUAL PRINT SCALE)',
    sheet.pageWidthMm / 2,
    143,
    { align: 'center' },
  )

  renderCardBackAt(
    doc,
    sheet.backBleedX,
    sheet.backBleedY,
    sheet.backTrimX,
    sheet.backTrimY,
    input,
    whiteLogo,
    aspect,
    qrDataUrl,
  )
  drawCropMarks(
    doc,
    sheet.backTrimX,
    sheet.backTrimY,
    sheet.trimWidthMm,
    sheet.trimHeightMm,
    CR80_SPEC.bleedMm,
    [24, 24, 27],
  )
  doc.setDrawColor(160, 160, 170)
  doc.setLineDashPattern([1.2, 1.2], 0)
  doc.setLineWidth(0.18)
  doc.rect(
    sheet.backTrimX,
    sheet.backTrimY,
    sheet.trimWidthMm,
    sheet.trimHeightMm,
    'S',
  )
  doc.setLineDashPattern([], 0)

  // Print Shop Instructions & QR URL Box
  const footerBoxY = 224
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...borderGray)
  doc.setLineWidth(0.3)
  doc.roundedRect(marginX, footerBoxY, contentW, 48, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...brandPurple)
  doc.text('PRINT HOUSE SPECIFICATIONS & VERIFICATION AUDIT', marginX + 6, footerBoxY + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  doc.setTextColor(...textDark)
  const instructions = [
    '1. Trim Size: Standard CR80 (85.6 × 53.98 mm / 3.375" × 2.125") with 3.18 mm corner radius.',
    '2. Bleed & Safe Zone: 3.0 mm full-bleed background included; all critical text/QR inside 5.0 mm safe zone.',
    '3. Recommended Stock: 350–400 gsm Silk/Matte laminated cardstock (or 760µm PVC card) — print at 100% scale.',
    `4. Live QR Verification Target: ${verificationUrl}`,
  ]
  instructions.forEach((line, idx) => {
    doc.text(line, marginX + 6, footerBoxY + 16 + idx * 6.5, {
      maxWidth: contentW - 12,
    })
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...mutedGray)
  doc.text(
    'Dermaspace Esthetic & Wellness Centre · 237B Muri Okunola St, VI · 9 Agbeke Rotinwa Cl, Ikoyi · dermaspaceng.com',
    sheet.pageWidthMm / 2,
    284,
    { align: 'center' },
  )

  const filename = sanitizeGiftCardPrintFilename(input.verificationCode, 'a4-sheet')
  return {
    blob: doc.output('blob'),
    filename,
    verificationUrl,
  }
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
