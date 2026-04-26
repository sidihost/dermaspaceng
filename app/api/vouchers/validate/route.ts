import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { validateVoucher } from '@/lib/vouchers'
import { isFeatureEnabled } from '@/lib/feature-flags'

export async function POST(request: NextRequest) {
  try {
    if (!(await isFeatureEnabled('vouchers'))) {
      return NextResponse.json({ valid: false, reason: 'Vouchers are currently disabled' })
    }
    const { code, subtotal } = await request.json()
    const user = await getCurrentUser()
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
