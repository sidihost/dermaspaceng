export const DEFAULT_AUTO_SEND_COOLDOWN_MS = 120_000

export function getAutoSendStorageKey(email: string): string {
  return `dermaspace.verify_email.auto_sent.${email.trim().toLowerCase()}`
}

export function getResendCooldownStorageKey(email: string): string {
  return `dermaspace.verify_email.cooldown_until.${email.trim().toLowerCase()}`
}

/**
 * Strip the `send` query parameter while keeping `email`, `redirect`, and any
 * other params intact so refreshing `/verify-email` never re-triggers an
 * automatic OTP issue.
 */
export function stripVerifySendParam(pathname: string, search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (!params.has('send')) {
    return `${pathname}${search ? (search.startsWith('?') ? search : `?${search}`) : ''}`
  }
  params.delete('send')
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

/**
 * Guard automatic OTP dispatch when landing on `/verify-email?send=1`.
 * Ensures an email verification code is sent at most once per link arrival
 * (surviving React Strict Mode double-mounts and page refreshes within the
 * cooldown window).
 */
export function shouldAutoSendVerificationOtp(input: {
  shouldAutoSend: boolean
  emailConfirmed: boolean
  email: string
  alreadyTriggered: boolean
  lastAutoSentAtMs?: number | null
  nowMs?: number
  cooldownMs?: number
}): boolean {
  if (!input.shouldAutoSend) return false
  if (!input.emailConfirmed) return false
  if (!input.email.trim()) return false
  if (input.alreadyTriggered) return false

  const nowMs = input.nowMs ?? Date.now()
  const cooldownMs = input.cooldownMs ?? DEFAULT_AUTO_SEND_COOLDOWN_MS

  if (
    typeof input.lastAutoSentAtMs === 'number' &&
    Number.isFinite(input.lastAutoSentAtMs) &&
    nowMs - input.lastAutoSentAtMs < cooldownMs
  ) {
    return false
  }

  return true
}

export function getRemainingResendCooldownSeconds(
  cooldownUntilMs: number | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (typeof cooldownUntilMs !== 'number' || !Number.isFinite(cooldownUntilMs)) {
    return 0
  }
  const diffMs = cooldownUntilMs - nowMs
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / 1000)
}
