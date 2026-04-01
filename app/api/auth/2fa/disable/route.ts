import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { disable2FA, verifyTOTPCode } from '@/lib/totp'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Code is required to disable 2FA' }, { status: 400 })
    }

    // Verify the code before disabling
    const isValid = await verifyTOTPCode(user.id, code)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    await disable2FA(user.id)
    
    return NextResponse.json({ success: true, message: '2FA disabled successfully' })
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
  }
}
