/**
 * Vouchers / coupons
 *
 * Server helpers to validate a code and to atomically redeem it.
 * Validation never throws — it always returns a structured result the
 * client can render.
 */

import { sql } from './db'

export type Voucher = {
  id: string
  code: string
  label: string | null
  description: string | null
  type: 'percent' | 'fixed'
  value: number
  max_discount: number | null
  min_amount: number
  max_uses: number | null
  used_count: number
  per_user_limit: number | null
  applies_to: string
  starts_at: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export type ValidateResult =
  | {
      valid: true
      voucher: Voucher
      /** Discount amount in naira given the supplied subtotal. */
      discount: number
    }
  | { valid: false; reason: string }

export async function validateVoucher(opts: {
  code: string
  subtotal?: number
  userId?: string | null
}): Promise<ValidateResult> {
  const code = opts.code.trim()
  if (!code) return { valid: false, reason: 'Enter a voucher code' }

  const rows = (await sql`
    SELECT * FROM vouchers WHERE LOWER(code) = ${code.toLowerCase()} LIMIT 1
  `) as unknown as Voucher[]
  const v = rows[0]
  if (!v) return { valid: false, reason: 'Invalid voucher code' }
  if (!v.is_active) return { valid: false, reason: 'This voucher is disabled' }

  const now = Date.now()
  if (v.starts_at && new Date(v.starts_at).getTime() > now) {
    return { valid: false, reason: 'This voucher is not active yet' }
  }
  if (v.expires_at && new Date(v.expires_at).getTime() < now) {
    return { valid: false, reason: 'This voucher has expired' }
  }
  if (v.max_uses !== null && v.used_count >= v.max_uses) {
    return { valid: false, reason: 'This voucher has been fully redeemed' }
  }

  const subtotal = Number(opts.subtotal ?? 0)
  if (Number(v.min_amount) > 0 && subtotal > 0 && subtotal < Number(v.min_amount)) {
    return {
      valid: false,
      reason: `Minimum spend of ₦${Number(v.min_amount).toLocaleString()} required`,
    }
  }

  if (opts.userId && v.per_user_limit !== null) {
    const used = (await sql`
      SELECT COUNT(*)::int AS count
      FROM voucher_redemptions
      WHERE voucher_id = ${v.id} AND user_id = ${opts.userId}
    `) as unknown as { count: number }[]
    if ((used[0]?.count ?? 0) >= v.per_user_limit) {
      return { valid: false, reason: 'You have already used this voucher' }
    }
  }

  // Compute discount given the supplied subtotal (zero if not provided).
  let discount = 0
  if (subtotal > 0) {
    if (v.type === 'percent') {
      discount = (subtotal * Number(v.value)) / 100
      if (v.max_discount !== null) discount = Math.min(discount, Number(v.max_discount))
    } else {
      discount = Math.min(Number(v.value), subtotal)
    }
  }
  return { valid: true, voucher: v, discount: Math.max(0, Math.round(discount)) }
}

export async function redeemVoucher(opts: {
  voucherId: string
  userId?: string | null
  userEmail?: string | null
  amountBefore?: number
  amountDiscount?: number
  reference?: string | null
}): Promise<void> {
  await sql`
    INSERT INTO voucher_redemptions
      (voucher_id, user_id, user_email, amount_before, amount_discount, reference)
    VALUES (
      ${opts.voucherId}, ${opts.userId ?? null}, ${opts.userEmail ?? null},
      ${opts.amountBefore ?? null}, ${opts.amountDiscount ?? null}, ${opts.reference ?? null}
    )
  `
  await sql`UPDATE vouchers SET used_count = used_count + 1 WHERE id = ${opts.voucherId}`
}
