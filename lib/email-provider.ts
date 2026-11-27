export type EmailProviderMode = 'zeptomail' | 'resend' | 'auto'

export const DEFAULT_EMAIL_PROVIDER: EmailProviderMode = 'zeptomail'

const VALID_PROVIDERS = new Set<EmailProviderMode>(['zeptomail', 'resend', 'auto'])

/**
 * Coerce any unknown value into a valid EmailProviderMode, defaulting safely
 * to `'zeptomail'` so existing Zepto Mail delivery is never disrupted.
 */
export function normalizeEmailProvider(value: unknown): EmailProviderMode {
  if (typeof value !== 'string') return DEFAULT_EMAIL_PROVIDER
  const trimmed = value.trim().toLowerCase() as EmailProviderMode
  return VALID_PROVIDERS.has(trimmed) ? trimmed : DEFAULT_EMAIL_PROVIDER
}

/**
 * Resolve the active email delivery provider purely from server environment
 * variables (`EMAIL_PROVIDER=zeptomail|resend|auto`).
 *
 * Defaults to `'zeptomail'` whenever unset or invalid so existing Zepto Mail
 * SMTP delivery is completely unaffected.
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
 * - `'zeptomail'` → tries Zepto Mail only (exact legacy behavior).
 * - `'resend'`    → tries Resend only.
 * - `'auto'`      → tries Zepto Mail first, then falls back to Resend if Zepto
 *                   Mail fails or is unconfigured.
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
  // 'auto': Zepto Mail primary, Resend backup
  const order: Array<'zeptomail' | 'resend'> = []
  if (availability.hasZepto) order.push('zeptomail')
  if (availability.hasResend) order.push('resend')
  return order
}
