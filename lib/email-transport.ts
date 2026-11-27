import { sendMailWithRetry } from './smtp-transport'
import {
  getActiveEmailProvider,
  resolveDeliveryOrder,
  type EmailProviderMode,
} from './email-provider'

const RESEND_API_URL = 'https://api.resend.com/emails'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface ResendSendOptions {
  apiKey?: string
  from: string
  to: string
  subject: string
  html: string
  maxAttempts?: number
  retryDelayMs?: number
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

/**
 * Resolve the `from` header for Resend. Uses `RESEND_FROM_EMAIL` if explicitly
 * configured in the server environment (preserving the display name if the
 * override is a bare email address), otherwise keeps the exact verified `from`
 * address already built for Dermaspace.
 */
export function resolveResendFrom(
  defaultFrom: string,
  resendFromOverride?: string | null,
): string {
  const override = resendFromOverride?.trim()
  if (!override) return defaultFrom
  if (override.includes('<') && override.includes('>')) {
    return override
  }
  const nameMatch = defaultFrom.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/)
  if (nameMatch && nameMatch[1]?.trim()) {
    return `${nameMatch[1].trim()} <${override}>`
  }
  return override
}

/**
 * Send a transactional email via the Resend HTTPS API with bounded timeout
 * and one automatic retry on transient 5xx / 429 / network failures.
 */
export async function sendViaResend(opts: ResendSendOptions): Promise<boolean> {
  const apiKey = opts.apiKey?.trim()
  if (!apiKey) {
    console.error('[resend-transport] RESEND_API_KEY not configured')
    return false
  }

  const maxAttempts = Math.max(1, opts.maxAttempts ?? 2)
  const retryDelayMs = Math.max(0, opts.retryDelayMs ?? 250)
  const timeoutMs = Math.max(1_000, opts.timeoutMs ?? 12_000)
  const fetchFn = opts.fetchImpl ?? fetch

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchFn(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: opts.from,
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
        }),
        signal: controller.signal,
      })

      if (res.ok) {
        return true
      }

      const retryable = res.status >= 500 || res.status === 429
      const errText = await res.text().catch(() => '')
      console.error(
        `[resend-transport] send failed (status ${res.status}, attempt ${attempt}/${maxAttempts}) for ${opts.subject}:`,
        errText.slice(0, 300),
      )

      if (!retryable) {
        return false
      }
    } catch (error) {
      console.error(
        `[resend-transport] network error (attempt ${attempt}/${maxAttempts}) for ${opts.subject}:`,
        error,
      )
    } finally {
      clearTimeout(timer)
    }

    if (attempt < maxAttempts && retryDelayMs > 0) {
      await sleep(retryDelayMs)
    }
  }

  return false
}

export interface TransactionalEmailRequest {
  from: string
  to: string
  subject: string
  html: string
  /** Optional explicit mode override (used by tests or callers). */
  providerMode?: EmailProviderMode
  /** Optional credential overrides (used by tests). */
  zeptoPassword?: string
  resendApiKey?: string
  resendFromOverride?: string
  /** Optional transport overrides (used by tests). */
  sendZepto?: (opts: {
    password?: string
    from: string
    to: string
    subject: string
    html: string
  }) => Promise<boolean>
  sendResend?: (opts: ResendSendOptions) => Promise<boolean>
}

/**
 * Unified outbound email dispatcher.
 *
 * Controlled exclusively via server environment variables (`EMAIL_PROVIDER`):
 * - unset or `zeptomail` (default): Zepto Mail SMTP only (untouched legacy behavior)
 * - `resend`: Resend HTTPS API using `RESEND_API_KEY` (and optional `RESEND_FROM_EMAIL`)
 * - `auto`: Zepto Mail first with automatic failover to Resend
 */
export async function sendTransactionalEmail(
  req: TransactionalEmailRequest,
): Promise<boolean> {
  const mode = req.providerMode ?? getActiveEmailProvider()
  const zeptoPassword =
    req.zeptoPassword !== undefined
      ? req.zeptoPassword
      : process.env.ZEPTO_MAIL_PASSWORD
  const resendApiKey =
    req.resendApiKey !== undefined
      ? req.resendApiKey
      : process.env.RESEND_API_KEY
  const resendFromOverride =
    req.resendFromOverride !== undefined
      ? req.resendFromOverride
      : process.env.RESEND_FROM_EMAIL

  const order = resolveDeliveryOrder(mode, {
    hasZepto: Boolean(zeptoPassword?.trim()),
    hasResend: Boolean(resendApiKey?.trim()),
  })

  if (order.length === 0) {
    console.error(
      `[email-transport] No credentials configured for provider mode "${mode}" (check ZEPTO_MAIL_PASSWORD / RESEND_API_KEY)`,
    )
    return false
  }

  const zeptoSender = req.sendZepto ?? sendMailWithRetry
  const resendSender = req.sendResend ?? sendViaResend

  for (const provider of order) {
    if (provider === 'zeptomail') {
      const ok = await zeptoSender({
        password: zeptoPassword,
        from: req.from,
        to: req.to,
        subject: req.subject,
        html: req.html,
      })
      if (ok) return true
    } else if (provider === 'resend') {
      const ok = await resendSender({
        apiKey: resendApiKey,
        from: resolveResendFrom(req.from, resendFromOverride),
        to: req.to,
        subject: req.subject,
        html: req.html,
      })
      if (ok) return true
    }
  }

  return false
}
