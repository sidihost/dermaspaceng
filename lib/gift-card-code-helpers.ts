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
