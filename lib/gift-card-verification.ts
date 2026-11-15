import crypto from 'node:crypto'
import {
  buildGiftCardVerificationUrl,
  canRoleVerifyGiftCard,
  extractGiftCardCodeFromScan,
  formatGiftCardSerial,
} from './gift-card-code-helpers'

export {
  buildGiftCardVerificationUrl,
  canRoleVerifyGiftCard,
  extractGiftCardCodeFromScan,
  formatGiftCardSerial,
}

export interface ParsedGiftCardCode {
  id: number
  tag: string
  normalized: string
}

export interface GiftCardSignatureCheck {
  validSyntax: boolean
  validSignature: boolean
  id: number | null
  normalized: string
}

export type GiftCardValidationState =
  | 'valid'
  | 'pending_activation'
  | 'payment_required'
  | 'cancelled'
  | 'not_found'
  | 'invalid_code'

export interface GiftCardRedemptionEvaluation {
  state: GiftCardValidationState
  isValidForRedemption: boolean
  headline: string
  summary: string
}

export function getGiftCardSigningSecret(): string {
  return (
    process.env.GIFT_CARD_SIGNING_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.AUTH_PEPPER?.trim() ||
    'dermaspace-gift-card-verification-v1'
  )
}

export function computeGiftCardHmacTag(
  id: number,
  secret: string = getGiftCardSigningSecret(),
): string {
  const safeId = Math.max(1, Math.floor(Number(id) || 0))
  return crypto
    .createHmac('sha256', secret)
    .update(`dermaspace-gc-v1:${safeId}`)
    .digest('hex')
    .slice(0, 10)
    .toUpperCase()
}

export function buildGiftCardVerificationCode(
  id: number,
  secret: string = getGiftCardSigningSecret(),
): string {
  return `${formatGiftCardSerial(id)}-${computeGiftCardHmacTag(id, secret)}`
}

export function parseGiftCardVerificationCode(
  raw: string | null | undefined,
): ParsedGiftCardCode | null {
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '')
  const match = /^DSGC-(\d{1,10})-([0-9A-F]{10})$/.exec(cleaned)
  if (!match) return null

  const id = Number(match[1])
  if (!Number.isSafeInteger(id) || id <= 0) return null

  const tag = match[2]
  return {
    id,
    tag,
    normalized: `${formatGiftCardSerial(id)}-${tag}`,
  }
}

export function verifyGiftCardCodeSignature(
  raw: string | null | undefined,
  secret: string = getGiftCardSigningSecret(),
): GiftCardSignatureCheck {
  const parsed = parseGiftCardVerificationCode(raw)
  if (!parsed) {
    return {
      validSyntax: false,
      validSignature: false,
      id: null,
      normalized: typeof raw === 'string' ? raw.trim().toUpperCase() : '',
    }
  }

  const expectedTag = computeGiftCardHmacTag(parsed.id, secret)
  const expectedBuf = Buffer.from(expectedTag, 'utf8')
  const actualBuf = Buffer.from(parsed.tag, 'utf8')
  const validSignature =
    expectedBuf.length === actualBuf.length &&
    crypto.timingSafeEqual(expectedBuf, actualBuf)

  return {
    validSyntax: true,
    validSignature,
    id: parsed.id,
    normalized: parsed.normalized,
  }
}

export function evaluateGiftCardRedemptionState({
  status,
  paymentStatus,
}: {
  status?: string | null
  paymentStatus?: string | null
}): GiftCardRedemptionEvaluation {
  const normalizedStatus = (status || 'pending').trim().toLowerCase()
  const normalizedPayment = (paymentStatus || 'unpaid').trim().toLowerCase()

  if (normalizedStatus === 'rejected' || normalizedStatus === 'cancelled') {
    return {
      state: 'cancelled',
      isValidForRedemption: false,
      headline: 'Gift Card Voided',
      summary:
        'This gift card has been cancelled or rejected and cannot be redeemed.',
    }
  }

  if (normalizedStatus === 'approved' || normalizedStatus === 'completed') {
    if (normalizedPayment === 'paid') {
      return {
        state: 'valid',
        isValidForRedemption: true,
        headline: 'Verified & Valid for Redemption',
        summary:
          'Authentic Dermaspace gift card cleared for treatment redemption at Victoria Island or Ikoyi.',
      }
    }

    return {
      state: 'payment_required',
      isValidForRedemption: false,
      headline: 'Payment Confirmation Required',
      summary:
        'Card approval is recorded, but payment is not marked paid yet. Reception should confirm settlement before redeeming.',
    }
  }

  if (normalizedStatus === 'processing') {
    return {
      state: 'pending_activation',
      isValidForRedemption: false,
      headline:
        normalizedPayment === 'paid'
          ? 'Paid — Awaiting Activation'
          : 'Processing Gift Card',
      summary:
        normalizedPayment === 'paid'
          ? 'Payment has been received and the card is awaiting final activation from our concierge team.'
          : 'This gift card request is still being processed.',
    }
  }

  return {
    state: 'pending_activation',
    isValidForRedemption: false,
    headline: 'Pending Activation',
    summary:
      'This gift card has not been activated yet. Contact Dermaspace reception for assistance.',
  }
}

export function maskEmailForVerification(email?: string | null): string | null {
  if (!email || !email.includes('@')) return null
  const [local, domain] = email.split('@')
  if (!local || !domain) return null
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`
}
