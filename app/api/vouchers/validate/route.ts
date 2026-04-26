import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { validateVoucher } from '@/lib/vouchers'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { rateLimit } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    if (!(await isFeatureEnabled('vouchers'))) {
      return NextResponse.json({ valid: false, reason: 'Vouchers are currently disabled' })
    }

    // Voucher codes are short and somewhat guessable — without a rate
    // limit an attacker can brute-force the namespace looking for
    // valid codes. Tight cap: 30 probes per IP in 10 minutes is
    // generous for a real shopper trying a typo, prohibitive for a
    // dictionary attack.
    const user = await getCurrentUser()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const id = user?.id ?? ip
    const limit = await rateLimit('voucher:probe', id, 30, 600)
    if (!limit.ok) {
      return NextResponse.json({
        valid: false,
        reason: 'Too many attempts. Please wait a few minutes and try again.',
      }, { status: 429 })
    }

    const { code, subtotal } = await request.json()
    const result = await validateVoucher({
      code: String(code || ''),
      subtotal: subtotal ? Number(subtotal) : 0,
      userId: user?.id ?? null,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[vouchers/validate]', err)
    return NextResponse.json({ valid: false, reason: 'Could not validate code' }, { status: 500 })
  }
}
