import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateTOTPSecret } from '@/lib/totp'

export async function POST() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      console.log('[v0] 2FA setup: No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[v0] 2FA setup: Generating TOTP for user', user.id)
    const result = await generateTOTPSecret(user.id, user.email)
    console.log('[v0] 2FA setup: Generated TOTP result', {
      hasSecret: !!result.secret,
      hasQrCodeUrl: !!result.qrCodeUrl,
      qrCodeUrlLength: result.qrCodeUrl?.length,
      secretLength: result.secret?.length
    })
    
    return NextResponse.json({
      secret: result.secret,
      qrCodeUrl: result.qrCodeUrl,
      otpauthUrl: result.otpauthUrl
    })
  } catch (error) {
    console.error('[v0] Error setting up 2FA:', error)
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 })
  }
}
