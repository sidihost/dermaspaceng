export type ReconcileDecision =
  | { action: 'credit' }
  | { action: 'fail'; reason: string }
  | { action: 'cancel'; reason: string }
  | { action: 'pending' }

const STALE_NON_TRANSFER_ONGOING_SECONDS = 120

/**
 * Determine the state transition for a pending Paystack transaction from the
 * verification status returned by Paystack's API.
 *
 * - `success` -> credit/finalize immediately.
 * - `failed` -> fail immediately with gateway reason.
 * - `abandoned` -> cancel immediately.
 * - `ongoing` / `pending` on `bank_transfer` -> keep pending until paid or expired.
 * - `ongoing` / `pending` on card/checkout -> cancel when returning via
 *   direct checkout callback/status page OR once stale (>= 2 minutes), so a
 *   cancelled checkout popup doesn't stay stuck pending for 24 hours.
 */
export function classifyPaystackStatusForReconcile(input: {
  paystackStatus?: string | null
  gatewayResponse?: string | null
  channel?: string | null
  ageSeconds?: number
  isDirectCallback?: boolean
}): ReconcileDecision {
  const status = String(input.paystackStatus || '')
    .trim()
    .toLowerCase()

  if (status === 'success') {
    return { action: 'credit' }
  }

  if (status === 'failed') {
    return {
      action: 'fail',
      reason: String(input.gatewayResponse || '').trim() || 'Payment failed',
    }
  }

  if (status === 'abandoned') {
    return {
      action: 'cancel',
      reason: 'Payment cancelled before completion',
    }
  }

  if (status === 'ongoing' || status === 'pending') {
    if (input.channel === 'bank_transfer') {
      return { action: 'pending' }
    }

    const ageSeconds =
      typeof input.ageSeconds === 'number' && Number.isFinite(input.ageSeconds)
        ? input.ageSeconds
        : 0

    if (input.isDirectCallback || ageSeconds >= STALE_NON_TRANSFER_ONGOING_SECONDS) {
      return {
        action: 'cancel',
        reason: 'Payment cancelled before completion',
      }
    }

    return { action: 'pending' }
  }

  return { action: 'pending' }
}
