export type EmailProviderMode = 'auto' | 'zeptomail' | 'resend' | 'resend_first'

/**
 * Default mode when `EMAIL_PROVIDER` is not explicitly set:
 * - If only `ZEPTO_MAIL_PASSWORD` is set → Zepto Mail only (100% legacy behavior)
 * - If only `RESEND_API_KEY` is set → Resend automatically works out of the box
 * - If both are set → Zepto Mail primary (unaffected) with automatic Resend backup
 */
export const DEFAULT_EMAIL_PROVIDER: EmailProviderMode = 'auto'

const PROVIDER_ALIASES: Record<string, EmailProviderMode> = {
  auto: 'auto',
  both: 'auto',
  fallback: 'auto',
  zeptomail: 'zeptomail',
  zepto: 'zeptomail',
  zepto_mail: 'zeptomail',
  'zepto-mail': 'zeptomail',
  resend: 'resend',
  resend_first: 'resend_first',
  'resend-first': 'resend_first',
}

/**
 * Coerce any unknown value into a valid EmailProviderMode, defaulting safely
 * to `'auto'` so Zepto Mail stays primary while Resend works seamlessly when
 * configured.
 */
export function normalizeEmailProvider(value: unknown): EmailProviderMode {
  if (typeof value !== 'string') return DEFAULT_EMAIL_PROVIDER
  const trimmed = value.trim().replace(/^["']|["']$/g, '').toLowerCase()
  return PROVIDER_ALIASES[trimmed] ?? DEFAULT_EMAIL_PROVIDER
}

/**
 * Resolve the active email delivery provider purely from server environment
 * variables (`EMAIL_PROVIDER=auto|zeptomail|resend|resend_first`).
 */
export function getActiveEmailProvider(
  env: Record<string, string | undefined> = process.env,
): EmailProviderMode {
  return normalizeEmailProvider(env.EMAIL_PROVIDER)
}

/**
 * Determine the ordered list of concrete providers to attempt for a given mode
 * and credential availability.
 *
 * - `'zeptomail'`    → tries Zepto Mail only.
 * - `'resend'`       → tries Resend only.
 * - `'auto'`         → tries Zepto Mail first, then falls back to Resend if Zepto
 *                      Mail fails or is unconfigured.
 * - `'resend_first'` → tries Resend first, then falls back to Zepto Mail if Resend
 *                      fails or is unconfigured.
 */
export function resolveDeliveryOrder(
  mode: EmailProviderMode,
  availability: { hasZepto: boolean; hasResend: boolean },
): Array<'zeptomail' | 'resend'> {
  if (mode === 'zeptomail') {
    return availability.hasZepto ? ['zeptomail'] : []
  }
  if (mode === 'resend') {
    return availability.hasResend ? ['resend'] : []
  }
  if (mode === 'resend_first') {
    const order: Array<'zeptomail' | 'resend'> = []
    if (availability.hasResend) order.push('resend')
    if (availability.hasZepto) order.push('zeptomail')
    return order
  }
  // 'auto': Zepto Mail primary, Resend backup
  const order: Array<'zeptomail' | 'resend'> = []
  if (availability.hasZepto) order.push('zeptomail')
  if (availability.hasResend) order.push('resend')
  return order
}
