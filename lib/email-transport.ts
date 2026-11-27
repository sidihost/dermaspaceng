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

function cleanEnvValue(value?: string | null): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^["']|["']$/g, '').trim()
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
 * Strip double quotes around RFC5322 display names because Resend's API
 * strictly validates `from` as `Name <email@domain.com>` or `email@domain.com`
 * and returns HTTP 422 on quoted display names like `"Dermaspace" <...>`.
 */
function stripQuotesFromSender(raw: string): string {
  const trimmed = cleanEnvValue(raw)
  const angleMatch = trimmed.match(/^\s*"?([^"<]+?)"?\s*<\s*([^>\s]+)\s*>\s*$/)
  if (angleMatch) {
    const name = angleMatch[1].replace(/["<>]/g, '').trim()
    const email = angleMatch[2].trim()
    return name ? `${name} <${email}>` : email
  }
  return trimmed
}

/**
 * Resolve the `from` header for Resend.
 *
 * - Always normalizes away double quotes around the display name so Resend
 *   does not reject `"Dermaspace" <noreply@dermaspaceng.com>` with HTTP 422.
 * - Uses `RESEND_FROM_EMAIL` (or `RESEND_FROM`) if configured in the server
 *   environment, preserving the sender display name when given a bare address.
 */
export function resolveResendFrom(
  defaultFrom: string,
  resendFromOverride?: string | null,
): string {
  const normalizedDefault = stripQuotesFromSender(defaultFrom)
  const override = cleanEnvValue(resendFromOverride)
  if (!override) return normalizedDefault

  if (override.includes('<') && override.includes('>')) {
    return stripQuotesFromSender(override)
  }

  const nameMatch = normalizedDefault.match(/^([^<]+?)\s*<[^>]+>$/)
  if (nameMatch && nameMatch[1]?.trim()) {
    return `${nameMatch[1].trim()} <${override}>`
  }
  return override
}

/**
 * Normalize one or more comma-separated email recipients into the string array
 * format expected by Resend's `to` field.
 */
export function normalizeResendRecipients(to: string): string[] {
  return String(to ?? '')
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean)
}

/**
 * Send a transactional email via the Resend HTTPS API with bounded timeout
 * and one automatic retry on transient 5xx / 429 / network failures.
 */
export async function sendViaResend(opts: ResendSendOptions): Promise<boolean> {
  const apiKey = cleanEnvValue(opts.apiKey)
  if (!apiKey) {
    console.error('[resend-transport] RESEND_API_KEY not configured')
    return false
  }

  const recipients = normalizeResendRecipients(opts.to)
  if (recipients.length === 0) {
    console.error('[resend-transport] No valid recipient provided')
    return false
  }

  const maxAttempts = Math.max(1, opts.maxAttempts ?? 2)
  const retryDelayMs = Math.max(0, opts.retryDelayMs ?? 250)
  const timeoutMs = Math.max(1_000, opts.timeoutMs ?? 12_000)
  const fetchFn = opts.fetchImpl ?? fetch
  const fromAddress = stripQuotesFromSender(opts.from)

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
          from: fromAddress,
          to: recipients,
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
        `[resend-transport] send failed (status ${res.status}, attempt ${attempt}/${maxAttempts}, from=${fromAddress}) for ${opts.subject}:`,
        errText.slice(0, 500),
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
 * - unset or `auto` (default): Zepto Mail primary (untouched when healthy),
 *   automatic Resend failover if Zepto Mail fails or is unconfigured
 * - `zeptomail`: Zepto Mail SMTP only
 * - `resend`: Resend HTTPS API using `RESEND_API_KEY` (and optional `RESEND_FROM_EMAIL`)
 * - `resend_first`: Resend primary with automatic Zepto Mail failover
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
      : process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM

  const order = resolveDeliveryOrder(mode, {
    hasZepto: Boolean(cleanEnvValue(zeptoPassword)),
    hasResend: Boolean(cleanEnvValue(resendApiKey)),
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
