import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateTOTPSecret } from '@/lib/totp'

export async function POST() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await generateTOTPSecret(user.id, user.email)
    
    return NextResponse.json({
      secret: result.secret,
      qrCodeUrl: result.qrCodeUrl,
      otpauthUrl: result.otpauthUrl
    })
  } catch (error) {
    console.error('Error setting up 2FA:', error)
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 })
  }
}
