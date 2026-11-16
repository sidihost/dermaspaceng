export type TextWidthMeasurer = (text: string) => number

export type LineItemColumnMode = 'amount' | 'duration' | 'none'

export type ReceiptStatusTone = 'positive' | 'pending' | 'muted'

export interface LayoutDetailRow {
  label: string
  value: string
}

export interface MeasuredDetailCell {
  label: string
  lines: string[]
}

export interface MeasuredDetailPair {
  left: MeasuredDetailCell
  right: MeasuredDetailCell | null
  height: number
}

export interface LayoutLineItem {
  title: string
  subtitle?: string
  amount: string
}

export interface MeasuredLineItem {
  titleLines: string[]
  subtitleLines: string[]
  amount: string
  height: number
}

const DURATION_PATTERN = /^\d+\s*(?:min(?:s|utes?)?|hr(?:s|ours?)?)$/i

/**
 * Determines the right-hand column header/mode for itemized rows so empty
 * AMOUNT columns are never rendered on non-itemized transaction receipts.
 */
export function resolveLineItemColumnMode(
  items: ReadonlyArray<Pick<LayoutLineItem, 'amount'>>,
): LineItemColumnMode {
  const nonEmpty = items
    .map((item) => item.amount.trim())
    .filter((value) => value.length > 0)

  if (nonEmpty.length === 0) return 'none'
  if (nonEmpty.every((value) => DURATION_PATTERN.test(value))) return 'duration'
  return 'amount'
}

/**
 * Classifies a receipt status string into one of three strictly-monochrome/brand
 * visual tones (#7B2D8E + plum-gray neutrals).
 */
export function classifyStatusTone(statusLabel: string): ReceiptStatusTone {
  const normalized = statusLabel.trim().toLowerCase()
  if (
    normalized.includes('success') ||
    normalized.includes('confirm') ||
    normalized === 'paid' ||
    normalized.includes('complet') ||
    normalized.includes('active') ||
    normalized.includes('verif')
  ) {
    return 'positive'
  }
  if (
    normalized.includes('pend') ||
    normalized.includes('await') ||
    normalized.includes('reserv') ||
    normalized.includes('process')
  ) {
    return 'pending'
  }
  return 'muted'
}

/**
 * Splits a single unbroken token (long email, Paystack reference, etc.) so it
 * never overflows or requires horizontal scaling, preferring natural delimiters
 * (@, /, -, _, .) before falling back to character-level breaks.
 */
function breakLongToken(
  token: string,
  measureWidth: TextWidthMeasurer,
  maxWidth: number,
): string[] {
  if (!token || maxWidth <= 0 || measureWidth(token) <= maxWidth) {
    return [token]
  }
  const chunks: string[] = []
  let current = ''
  let lastDelimiterIdx = -1

  for (const ch of token) {
    const candidate = current + ch
    if (current && measureWidth(candidate) > maxWidth) {
      if (lastDelimiterIdx >= Math.floor(current.length * 0.35)) {
        chunks.push(current.slice(0, lastDelimiterIdx + 1))
        current = current.slice(lastDelimiterIdx + 1) + ch
      } else {
        chunks.push(current)
        current = ch
      }
      lastDelimiterIdx = -1
      for (let i = 0; i < current.length; i += 1) {
        if ('@/-_.'.includes(current[i])) lastDelimiterIdx = i
      }
    } else {
      current = candidate
      if ('@/-_.'.includes(ch)) {
        lastDelimiterIdx = current.length - 1
      }
    }
  }
  if (current) chunks.push(current)
  return chunks.length > 0 ? chunks : [token]
}

/**
 * Wraps plain text across explicit newlines and word boundaries using the
 * caller's exact font metric callback. Never squishes text horizontally.
 */
export function wrapTextLines(
  text: string,
  measureWidth: TextWidthMeasurer,
  maxWidth: number,
): string[] {
  const safeMaxWidth = Math.max(maxWidth, 24)
  const paragraphs = (text || '').split(/\r?\n/)
  const output: string[] = []

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      continue
    }
    let currentLine = ''
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word
      if (measureWidth(candidate) <= safeMaxWidth) {
        currentLine = candidate
        continue
      }
      if (currentLine) {
        output.push(currentLine)
        currentLine = ''
      }
      if (measureWidth(word) <= safeMaxWidth) {
        currentLine = word
      } else {
        const parts = breakLongToken(word, measureWidth, safeMaxWidth)
        output.push(...parts.slice(0, -1))
        currentLine = parts[parts.length - 1] || ''
      }
    }
    if (currentLine) {
      output.push(currentLine)
    }
  }

  return output.length > 0 ? output : ['']
}

export interface SummaryMeasureOptions {
  colWidth: number
  labelOffset: number
  lineHeight: number
  bottomPadding: number
  minRowHeight: number
}

/**
 * Measures every 2-column detail grid pair and calculates exact dynamic row
 * heights so long values wrap cleanly instead of overlapping or clipping.
 */
export function measureSummaryPairs(
  rows: ReadonlyArray<LayoutDetailRow>,
  measureValueWidth: TextWidthMeasurer,
  opts: SummaryMeasureOptions,
): { pairs: MeasuredDetailPair[]; totalHeight: number } {
  const pairs: MeasuredDetailPair[] = []
  let totalHeight = 0

  for (let i = 0; i < rows.length; i += 2) {
    const leftRow = rows[i]
    const rightRow = rows[i + 1] ?? null

    const leftLines = wrapTextLines(
      leftRow.value || '—',
      measureValueWidth,
      opts.colWidth,
    )
    const rightLines = rightRow
      ? wrapTextLines(rightRow.value || '—', measureValueWidth, opts.colWidth)
      : []

    const maxLines = Math.max(leftLines.length, rightLines.length, 1)
    const height = Math.max(
      opts.minRowHeight,
      opts.labelOffset + maxLines * opts.lineHeight + opts.bottomPadding,
    )

    pairs.push({
      left: { label: leftRow.label, lines: leftLines },
      right: rightRow ? { label: rightRow.label, lines: rightLines } : null,
      height,
    })
    totalHeight += height
  }

  return { pairs, totalHeight }
}

export interface LineItemsMeasureOptions {
  titleMaxWidth: number
  subtitleMaxWidth: number
  topPadding: number
  titleLineHeight: number
  subtitleGap: number
  subtitleLineHeight: number
  bottomPadding: number
  minRowHeight: number
}

/**
 * Measures itemized rows dynamically across title and subtitle lines.
 */
export function measureLineItems(
  items: ReadonlyArray<LayoutLineItem>,
  measureTitleWidth: TextWidthMeasurer,
  measureSubtitleWidth: TextWidthMeasurer,
  opts: LineItemsMeasureOptions,
): { rows: MeasuredLineItem[]; totalHeight: number } {
  const rows: MeasuredLineItem[] = []
  let totalHeight = 0

  for (const item of items) {
    const titleLines = wrapTextLines(
      item.title,
      measureTitleWidth,
      opts.titleMaxWidth,
    )
    const subtitleLines = item.subtitle
      ? wrapTextLines(
          item.subtitle,
          measureSubtitleWidth,
          opts.subtitleMaxWidth,
        )
      : []

    const subtitleBlockH =
      subtitleLines.length > 0
        ? opts.subtitleGap + subtitleLines.length * opts.subtitleLineHeight
        : 0

    const height = Math.max(
      opts.minRowHeight,
      opts.topPadding +
        titleLines.length * opts.titleLineHeight +
        subtitleBlockH +
        opts.bottomPadding,
    )

    rows.push({
      titleLines,
      subtitleLines,
      amount: item.amount,
      height,
    })
    totalHeight += height
  }

  return { rows, totalHeight }
}

/**
 * Returns true if placing a block of `blockHeight` at `currentY` would collide
 * with the reserved bottom footer area of a PDF page.
 */
export function needsPageBreak(
  currentY: number,
  blockHeight: number,
  pageHeight: number,
  footerReserve: number,
): boolean {
  return currentY + blockHeight > pageHeight - footerReserve
}

export interface MeasuredLedgerRow {
  label: string
  valueLines: string[]
  height: number
}

export interface LedgerMeasureOptions {
  totalWidth: number
  labelMaxWidthRatio?: number
  minGap?: number
  topPadding: number
  lineHeight: number
  bottomPadding: number
  minRowHeight: number
}

/**
 * Measures Left-Label / Right-Value ledger rows so multi-line right-aligned
 * values (e.g. long customer emails or processor references) never collide
 * with left-side field labels.
 */
export function measureLedgerRows(
  rows: ReadonlyArray<LayoutDetailRow>,
  measureLabelWidth: TextWidthMeasurer,
  measureValueWidth: TextWidthMeasurer,
  opts: LedgerMeasureOptions,
): { rows: MeasuredLedgerRow[]; totalHeight: number } {
  const minGap = opts.minGap ?? 18
  const maxLabelCap = opts.totalWidth * (opts.labelMaxWidthRatio ?? 0.42)
  const measured: MeasuredLedgerRow[] = []
  let totalHeight = 0

  for (const row of rows) {
    const labelText = row.label || ''
    const measuredLabelW = Math.min(measureLabelWidth(labelText), maxLabelCap)
    const availableValueW = Math.max(
      opts.totalWidth - measuredLabelW - minGap,
      opts.totalWidth * 0.46,
    )
    const valueLines = wrapTextLines(
      row.value || '—',
      measureValueWidth,
      availableValueW,
    )
    const height = Math.max(
      opts.minRowHeight,
      opts.topPadding + valueLines.length * opts.lineHeight + opts.bottomPadding,
    )
    measured.push({
      label: labelText,
      valueLines,
      height,
    })
    totalHeight += height
  }

  return { rows: measured, totalHeight }
}

