export function formatGiftCardSerial(id: number): string {
  const safeId = Math.max(1, Math.floor(Number(id) || 0))
  return `DSGC-${String(safeId).padStart(5, '0')}`
}

export function buildGiftCardVerificationUrl(
  baseUrl: string,
  code: string,
): string {
  const trimmedBase = (baseUrl || 'https://dermaspaceng.com').replace(/\/+$/, '')
  return `${trimmedBase}/gift-cards/verify?code=${encodeURIComponent(code)}`
}

export function extractGiftCardCodeFromScan(
  raw: string | null | undefined,
): string {
  if (!raw || typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  // Try parsing as a full or relative verification URL first
  try {
    const parsed = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : trimmed.startsWith('/') || trimmed.includes('code=')
        ? new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, 'https://dermaspaceng.com')
        : null
    const paramCode = parsed?.searchParams.get('code')
    if (paramCode && paramCode.trim()) {
      return paramCode.trim().toUpperCase().replace(/\s+/g, '')
    }
  } catch {
    // Fall through to pattern matching
  }

  // Match DSGC serial + HMAC tag anywhere in scanned text
  const signedMatch = /DSGC-\d{1,10}-[0-9A-F]{10}/i.exec(trimmed)
  if (signedMatch) {
    return signedMatch[0].toUpperCase()
  }

  return trimmed.toUpperCase().replace(/\s+/g, '')
}

export function canRoleVerifyGiftCard(
  role?: string | null,
  isActive?: boolean | null,
): boolean {
  if (isActive === false) return false
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : ''
  return normalized === 'admin' || normalized === 'staff'
}

