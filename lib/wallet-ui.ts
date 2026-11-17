export interface WalletTransactionItem {
  id: number | string
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  payment_reference?: string | null
  reference?: string | null
  paystack_reference?: string | null
  error_message?: string | null
  description: string | null
  created_at: string
  formattedAmount?: string
  formattedDate?: string
}

export interface ParsedTransactionSummary {
  title: string
  detailNote: string | null
  referenceTag: string | null
}

export function formatWalletCurrency(
  value: number | null | undefined,
  currency: string = 'NGN',
): string {
  const safeValue =
    typeof value === 'number' && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeValue)
}

export function formatPaymentChannel(
  method: WalletTransactionItem['payment_method'] | string,
): string {
  switch (method) {
    case 'paystack':
      return 'Card / Paystack'
    case 'bank_transfer':
      return 'Bank Transfer'
    case 'wallet':
      return 'Wallet'
    case 'cash':
      return 'Cash'
    default:
      return String(method || 'Wallet').replace(/_/g, ' ')
  }
}

export function formatWalletTransactionDate(
  dateString: string,
  now: Date = new Date(),
): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-NG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  if (diffDays === 1) {
    return 'Yesterday'
  }
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString('en-NG', { weekday: 'short' })
  }
  return date.toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function parseTransactionSummary(
  description: string | null | undefined,
  type: WalletTransactionItem['type'],
  fallbackReference?: string | null,
): ParsedTransactionSummary {
  const defaultTitle =
    type === 'credit'
      ? 'Wallet funding'
      : type === 'refund'
        ? 'Refund'
        : 'Wallet payment'

  const raw = (description || '').trim()
  if (!raw) {
    return {
      title: defaultTitle,
      detailNote: null,
      referenceTag: fallbackReference?.trim() || null,
    }
  }

  // Extract parenthetical metadata such as "(fulfilled offline — ref WF_MWC6K1OB_MICXIJ)"
  const parenMatch = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (parenMatch) {
    const cleanTitle = parenMatch[1].trim() || defaultTitle
    const inner = parenMatch[2].trim()

    const refMatch = inner.match(/(?:^|[\s—–-]+)ref[:\s]+([A-Za-z0-9_-]+)/i)
    const referenceTag = refMatch
      ? refMatch[1]
      : fallbackReference?.trim() || null

    const noteWithoutRef = inner
      .replace(/(?:[\s—–-]+)?ref[:\s]+[A-Za-z0-9_-]+/i, '')
      .trim()
      .replace(/^[—–-]+|[—–-]+$/g, '')
      .trim()

    return {
      title: cleanTitle,
      detailNote: noteWithoutRef || null,
      referenceTag,
    }
  }

  return {
    title: raw,
    detailNote: null,
    referenceTag: fallbackReference?.trim() || null,
  }
}

export function computeWalletStats(transactions: WalletTransactionItem[]): {
  totalFunded: number
  totalSpent: number
  fundedCount: number
  spentCount: number
} {
  let totalFunded = 0
  let totalSpent = 0
  let fundedCount = 0
  let spentCount = 0

  for (const tx of transactions) {
    if (tx.status !== 'completed') continue
    const amount = Number(tx.amount) || 0
    if (tx.type === 'credit' || tx.type === 'refund') {
      totalFunded += amount
      fundedCount += 1
    } else if (tx.type === 'debit') {
      totalSpent += amount
      spentCount += 1
    }
  }

  return { totalFunded, totalSpent, fundedCount, spentCount }
}

export function formatWalletDisplayName(userName?: string | null): string {
  const trimmed = userName?.trim()
  return trimmed ? 'DermaspaceNG Wallet' : 'Your Wallet'
}

