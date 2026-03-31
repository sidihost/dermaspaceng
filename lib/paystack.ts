// Paystack API Integration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    id: number
    domain: string
    status: 'success' | 'failed' | 'abandoned' | 'pending'
    reference: string
    amount: number
    message: string | null
    gateway_response: string
    paid_at: string | null
    created_at: string
    channel: string
    currency: string
    ip_address: string
    metadata: Record<string, unknown>
    fees: number
    customer: {
      id: number
      first_name: string | null
      last_name: string | null
      email: string
      phone: string | null
    }
    authorization: {
      authorization_code: string
      bin: string
      last4: string
      exp_month: string
      exp_year: string
      channel: string
      card_type: string
      bank: string
      country_code: string
      brand: string
      reusable: boolean
      signature: string
    }
  }
}

export interface PaystackTransferRecipientResponse {
  status: boolean
  message: string
  data: {
    active: boolean
    createdAt: string
    currency: string
    domain: string
    id: number
    integration: number
    name: string
    recipient_code: string
    type: string
    updatedAt: string
    is_deleted: boolean
    details: {
      authorization_code: string | null
      account_number: string
      account_name: string | null
      bank_code: string
      bank_name: string
    }
  }
}

// Initialize a transaction
export async function initializePayment({
  email,
  amount,
  reference,
  callbackUrl,
  metadata,
}: {
  email: string
  amount: number // in kobo (smallest currency unit)
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}): Promise<PaystackInitializeResponse | null> {
  if (!PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY not configured')
    return null
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        reference,
        callback_url: callbackUrl,
        metadata,
      }),
    })

    const data = await response.json()
    return data as PaystackInitializeResponse
  } catch (error) {
    console.error('Paystack initialize error:', error)
    return null
  }
}

// Verify a transaction
export async function verifyPayment(reference: string): Promise<PaystackVerifyResponse | null> {
  if (!PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY not configured')
    return null
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return data as PaystackVerifyResponse
  } catch (error) {
    console.error('Paystack verify error:', error)
    return null
  }
}

// Generate unique reference
export function generateReference(prefix: string = 'DS'): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${randomPart}`.toUpperCase()
}

// Get public key for frontend
export function getPublicKey(): string {
  return PAYSTACK_PUBLIC_KEY || ''
}

// Convert amount to kobo (smallest unit)
export function toKobo(amount: number): number {
  return Math.round(amount * 100)
}

// Convert kobo to naira
export function fromKobo(kobo: number): number {
  return kobo / 100
}

// Webhook signature verification
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!PAYSTACK_SECRET_KEY) return false
  
  const crypto = require('crypto')
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest('hex')
  
  return hash === signature
}
